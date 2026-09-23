'use strict';

/**
 * ECMWF Open Charts - vnaprej izrisana javna karta (CC-BY-4.0) pritiska
 * na morski gladini + vetra na 850 hPa za Evropo, iz vsakega teka
 * ECMWF-jevega modela (glej https://charts.ecmwf.int/products/medium-mslp-wind850).
 * Produktna HTML stran je za brskalnike zaščitena z anti-bot izzivom
 * (Anubis), a JSON API in sama PNG slika nista (potrjeno prek GitHub
 * Actions - status 200/image/png tudi brez posebne User-Agent glave).
 * Karta ni vezana na posamezno vzletišče - ena sama URL velja za celotno
 * aplikacijo, zato jo build-data.js pridobi enkrat in deli med vsemi
 * vzletišči/lokacijami (glej klicatelja).
 */

const { fetchJsonCached } = require('./fetchUtil');

const PRODUCT_URL = 'https://charts.ecmwf.int/opencharts-api/v1/products/medium-mslp-wind850/';

async function fetchSynopticChartUrl() {
  try {
    const result = await fetchJsonCached(PRODUCT_URL, { ttlMs: 60 * 60 * 1000, timeoutMs: 8000 });
    const body = result.data;
    const href = body && body.data && body.data.link && body.data.link.href;
    if (!href) throw new Error('Odgovor ne vsebuje povezave do slike.');
    return { ok: true, url: href };
  } catch (err) {
    return { ok: false, url: null, error: String((err && err.message) || err) };
  }
}

module.exports = { fetchSynopticChartUrl };
