'use strict';

const { fetchJsonCached } = require('./fetchUtil');

const OPENDATA_BASE = 'https://opendata.si/vreme/report/';

/**
 * GPS izhodišče poroča neposredno za koordinato (radar padavin, ALADIN
 * napoved oblačnosti/padavin po urah, verjetnost toče) – uporabno kot
 * dopolnilo k ARSO napovedi po imenu kraja, ker ni odvisno od ujemanja
 * imen lokacij.
 */
async function fetchOpendataReport(lat, lon) {
  const roundedLat = Math.round(lat * 100) / 100;
  const roundedLon = Math.round(lon * 100) / 100;
  const url = `${OPENDATA_BASE}?lat=${roundedLat}&lon=${roundedLon}`;
  const result = await fetchJsonCached(url, { ttlMs: 10 * 60 * 1000, timeoutMs: 8000 });
  const data = result.data || {};

  return {
    ok: true,
    source: 'opendata.si (ARSO radar/ALADIN)',
    sourceUrl: url,
    rain: data.radar || data.rain || null,
    forecast: data.forecast || data.aladin || null,
    hail: data.hail || null,
    raw: data,
    fromCache: result.fromCache,
  };
}

module.exports = { fetchOpendataReport };
