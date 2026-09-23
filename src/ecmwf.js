'use strict';

/**
 * ECMWF Open Charts - vnaprej izrisane javne karte (CC-BY-4.0) pritiska
 * na morski gladini + vetra na 850 hPa (glej
 * https://charts.ecmwf.int/products/medium-mslp-wind850). Produktna HTML
 * stran je za brskalnike zaščitena z anti-bot izzivom (Anubis), a JSON
 * API in same PNG slike nista (potrjeno prek GitHub Actions - status
 * 200/image/png tudi brez posebne User-Agent glave).
 *
 * Namesto ene same "trenutne" karte pridobimo ZAPOREDJE treh (zdaj/+24h/
 * +48h) iz ISTEGA modelskega teka (base_time), v projekciji
 * "opencharts_central_europe" (bolj primerna za Slovenijo kot privzeta
 * "Europe") - da lahko prikažemo, kako se pritisni sistemi (in posredno
 * fronte) premikajo čez naslednje dni, ne le trenutni posnetek. Karte
 * niso vezane na posamezno vzletišče - ena sama sekvenca velja za
 * celotno aplikacijo, deljena med vsemi vzletišči/lokacijami (glej
 * klicatelja v scripts/build-data.js).
 */

const { fetchJsonCached } = require('./fetchUtil');

const PRODUCT_URL = 'https://charts.ecmwf.int/opencharts-api/v1/products/medium-mslp-wind850/';
const STEP_HOURS = [0, 24, 48];

function isoHour(d) {
  return d.toISOString().slice(0, 19) + 'Z';
}

async function fetchChartFrame(baseTime, stepHours) {
  const validTime = new Date(baseTime.getTime() + stepHours * 3600 * 1000);
  const params = new URLSearchParams({
    projection: 'opencharts_central_europe',
    base_time: isoHour(baseTime),
    valid_time: isoHour(validTime),
  });
  const url = `${PRODUCT_URL}?${params.toString()}`;
  const result = await fetchJsonCached(url, { ttlMs: 60 * 60 * 1000, timeoutMs: 8000 });
  const body = result.data;
  const href = body && body.data && body.data.link && body.data.link.href;
  if (!href) throw new Error('Odgovor ne vsebuje povezave do slike.');
  return { stepHours, url: href, validTime: validTime.toISOString() };
}

async function fetchSynopticChartSequence() {
  const baseTime = new Date();
  baseTime.setUTCHours(0, 0, 0, 0);
  const frames = [];
  for (const stepHours of STEP_HOURS) {
    try {
      frames.push(await fetchChartFrame(baseTime, stepHours));
    } catch (_) {
      // En spodleteli korak ne sme podreti preostalih - preprosto ga izpustimo.
    }
  }
  return frames;
}

module.exports = { fetchSynopticChartSequence };
