'use strict';

/**
 * ECMWF Open Charts - vnaprej izrisane javne karte (CC-BY-4.0) pritiska
 * na morski gladini + vetra na 850 hPa (glej
 * https://charts.ecmwf.int/products/medium-mslp-wind850). Produktna HTML
 * stran je za brskalnike zaščitena z anti-bot izzivom (Anubis), a JSON
 * API in same PNG slike nista (potrjeno prek GitHub Actions - status
 * 200/image/png tudi brez posebne User-Agent glave).
 *
 * Namesto ene same "trenutne" karte pridobimo ZAPOREDJE 41 sličic (zdaj,
 * nato vsakih 6h do +240h/10 dni) iz ISTEGA modelskega teka (base_time),
 * v projekciji "opencharts_europe" (širši zemljevid - cela Evropa in rob
 * severnega Atlantika/severne Afrike/zahodne Azije, ne le "Central
 * Europe" - uporabnik je želel videti tudi sisteme, ki šele prihajajo
 * izven Evrope) - da lahko prikažemo, kako se pritisni sistemi (in
 * posredno fronte) premikajo čez naslednje dni, ne le trenutni posnetek.
 * Karte niso vezane na posamezno vzletišče - ena sama sekvenca velja za
 * celotno aplikacijo, deljena med vsemi vzletišči/lokacijami (glej
 * klicatelja v scripts/build-data.js). V uporabniškem vmesniku je
 * zaporedje prikazano kot interaktiven drsnik/animacija (glej
 * renderSynopticChart/showSynopticFrame v public/js/app.js), ne kot
 * vrstica klikljivih sličic - z desetinami korakov bi ta postala
 * popolnoma nepregledna.
 *
 * Razpoložljive projekcije so bile pridobljene prek GitHub Actions z
 * namerno neveljavno vrednostjo "projection" - API v napaki (404) navede
 * poln seznam veljavnih vrednosti, npr. 'opencharts_europe',
 * 'opencharts_global', 'opencharts_central_europe',
 * 'opencharts_north_west_europe', 'opencharts_north_atlantic', ...
 * "opencharts_europe" je bila tudi privzeta vrednost, ko API ni dobil
 * nobenega parametra "projection".
 *
 * Produkt dejansko sega do +240h (10 dni) - potrjeno prek GitHub Actions
 * (koraki do vključno +240h vrnejo veljavno sliko, +264h vrne 404), in
 * podpira tudi korake, ki niso večkratniki 24h (npr. +3h, +6h - prav
 * tako potrjeno prek GitHub Actions).
 *
 * base_time NI "trenutni tek" (npr. danes 00Z takoj po polnoči), temveč
 * zadnji 00Z/12Z tek, ki je star vsaj 12 ur - build teče vsako uro in
 * ECMWF karte objavi šele nekaj ur po teku modela (t.i. "dissemination
 * lag"). Potrjeno prek GitHub Actions: tek ob 04:31 UTC (baseTime =
 * "danes 00Z", star komaj ~4.5h) je vrnil PRAZNO zaporedje (vsi 3 poskusi
 * spodleteli), tek ob 06:32 UTC (isti "danes 00Z", zdaj star ~6.5h) pa je
 * dobil le delno zaporedje (OK(2/3)) - očitno se poznejši časovni koraki
 * istega teka objavijo pozneje kot korak +0h. "Včeraj 12Z" (ali "danes
 * 00Z" po 12h) je v testih vedno zanesljivo objavljen za cel razpon do
 * +240h.
 *
 * API ima OBČUTLJIVO omejitev hitrosti klicev - potrjeno prek GitHub
 * Actions: v istem teku je prava izgradnja opravila 11 zaporednih
 * klicev (takrat še 24h koraki), takoj zatem pa je dodaten diagnostični
 * skript v ISTI minuti dosegel 429 (Too Many Requests) že pri 14.
 * kumulativnem klicu. Zato med posameznimi klici NAMENOMA počakamo
 * (REQUEST_SPACING_MS) in ob 429 enkrat počakamo dlje ter ponovimo
 * (RETRY_DELAY_MS) - brez tega bi bila večina od 41 sličic izpuščena.
 *
 * `pickBaseTime` je izvožena samostojno, ker `scripts/build-data.js`
 * PREDPOMNI zaporedje na disk (`data-cache/ecmwf-frames.json`, commitano
 * nazaj v repo) in ta modul kliče (41 zaporednih klicev, ~4 minute) LE
 * kadar se `base_time` dejansko spremeni - to je le dvakrat na dan
 * (base_time je konstanten znotraj vsakega 12h okna, glej `pickBaseTime`
 * spodaj), build pa teče vsako uro. Brez predpomnjenja bi se isto
 * zaporedje po nepotrebnem znova pridobivalo 24-krat na dan namesto 2x.
 */

const { fetchJsonCached } = require('./fetchUtil');

const PRODUCT_URL = 'https://charts.ecmwf.int/opencharts-api/v1/products/medium-mslp-wind850/';
const PROJECTION = 'opencharts_europe';
const STEP_HOURS = Array.from({ length: 41 }, (_, i) => i * 6); // 0, 6, 12, ..., 240
const MIN_BASE_TIME_AGE_HOURS = 12;
const REQUEST_SPACING_MS = 5000;
const RETRY_DELAY_MS = 15000;

function isoHour(d) {
  return d.toISOString().slice(0, 19) + 'Z';
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pickBaseTime(now) {
  const baseTime = new Date(now);
  baseTime.setUTCMinutes(0, 0, 0);
  baseTime.setUTCHours(baseTime.getUTCHours() < 12 ? 0 : 12, 0, 0, 0);
  while (now.getTime() - baseTime.getTime() < MIN_BASE_TIME_AGE_HOURS * 3600 * 1000) {
    baseTime.setTime(baseTime.getTime() - 12 * 3600 * 1000);
  }
  return baseTime;
}

async function fetchChartFrameOnce(baseTime, stepHours) {
  const validTime = new Date(baseTime.getTime() + stepHours * 3600 * 1000);
  const params = new URLSearchParams({
    projection: PROJECTION,
    base_time: isoHour(baseTime),
    valid_time: isoHour(validTime),
  });
  const url = `${PRODUCT_URL}?${params.toString()}`;
  const result = await fetchJsonCached(url, { ttlMs: 60 * 60 * 1000, timeoutMs: 12000 });
  const body = result.data;
  const href = body && body.data && body.data.link && body.data.link.href;
  if (!href) throw new Error('Odgovor ne vsebuje povezave do slike.');
  return { stepHours, url: href, validTime: validTime.toISOString() };
}

async function fetchChartFrame(baseTime, stepHours) {
  try {
    return await fetchChartFrameOnce(baseTime, stepHours);
  } catch (err) {
    const isRateLimited = /HTTP 429/.test(String((err && err.message) || err));
    if (!isRateLimited) throw err;
    // En sam ponovni poskus po daljšem premoru - API se navadno hitro odpre nazaj.
    await sleep(RETRY_DELAY_MS);
    return fetchChartFrameOnce(baseTime, stepHours);
  }
}

async function fetchSynopticChartSequence() {
  const baseTime = pickBaseTime(new Date());
  const frames = [];
  for (let i = 0; i < STEP_HOURS.length; i++) {
    if (i > 0) await sleep(REQUEST_SPACING_MS);
    try {
      frames.push(await fetchChartFrame(baseTime, STEP_HOURS[i]));
    } catch (_) {
      // En spodleteli korak ne sme podreti preostalih - preprosto ga izpustimo.
    }
  }
  return frames;
}

module.exports = { fetchSynopticChartSequence, STEP_HOURS, pickBaseTime };
