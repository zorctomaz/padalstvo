'use strict';

/**
 * Klient za uradni KOK/SkyTech API (žive vremenske postaje), pridobljen na
 * prošnjo (glej README – "Žive postaje"). Dokumentacija:
 * https://api.kok.si/doc_aws_api_v2.html
 *
 * Avtentikacija: header X-Api-Key. Token BEREMO IZ OKOLJSKE SPREMENLJIVKE
 * SKYTECH_API_TOKEN (GitHub Actions secret) – nikoli ne sme biti zapisan v
 * izvorni kodi ali poslan iz brskalnika (to izrecno svetuje tudi uradna
 * dokumentacija API-ja), zato ta modul teče izključno na strežniški strani
 * (scripts/build-data.js prek GitHub Actions).
 */

const { fetchJsonCached } = require('./fetchUtil');

const SKYTECH_API_BASE = 'https://api.kok.si/aws_api_v2.php';

// Indeks smeri vetra (0–7), kot ga vrača API, preslikan na kompas.
// Potrjeno iz uradne dokumentacije (tabela Value/Direction).
const DIRECTION_BY_INDEX = ['NW', 'W', 'SW', 'S', 'SE', 'E', 'NE', 'N'];

function directionIndexToCompass(idx) {
  if (idx === null || idx === undefined) return null;
  return DIRECTION_BY_INDEX[idx] ?? null;
}

function msToKmh(ms) {
  if (ms === null || ms === undefined) return null;
  return Math.round(ms * 3.6 * 10) / 10;
}

function parseDirections(text) {
  if (!text) return [];
  return text
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function normalizeStation(raw) {
  const m = raw.meritev || null;
  return {
    id: raw.id,
    name: raw.name,
    altitude: raw.altitude,
    lat: raw.latitude,
    lon: raw.longitude,
    directionsGreen: parseDirections(raw.direction_green),
    directionsYellow: parseDirections(raw.direction_yellow),
    directionsRed: parseDirections(raw.direction_red),
    measurement: m
      ? {
          time: m.timestamp_utc || m.timestamp || null,
          windSpeedKmh: msToKmh(m.wind_speed),
          windGustKmh: msToKmh(m.wind_gusts),
          windDirection: directionIndexToCompass(m.wind_direction),
          temperatureC: m.temperature ?? null,
          pressureHpa: m.pressure ?? null,
          humidity: m.humidity ?? null,
        }
      : null,
  };
}

/**
 * Pridobi VSE javne postaje z njihovo zadnjo meritvijo (en sam klic,
 * ?latest=1 – tako svetuje tudi dokumentacija namesto klica na postajo).
 * Rezultat se v procesu predpomni (fetchJsonCached), zato ga je varno
 * klicati enkrat na zagon build-data.js in deliti med vsemi vzletišči.
 */
async function fetchAllStations() {
  const token = process.env.SKYTECH_API_TOKEN;
  if (!token) {
    return {
      ok: false,
      error: 'SKYTECH_API_TOKEN ni nastavljen (manjka GitHub Actions secret).',
      stations: [],
    };
  }

  try {
    const result = await fetchJsonCached(SKYTECH_API_BASE + '?latest=1', {
      ttlMs: 10 * 60 * 1000,
      timeoutMs: 8000,
      headers: { 'X-Api-Key': token },
    });

    const rawStations = (result.data && result.data.postaje) || [];
    return {
      ok: true,
      generatedAt: result.data.generated_at || null,
      stations: rawStations.map(normalizeStation),
    };
  } catch (err) {
    return { ok: false, error: err.message, stations: [] };
  }
}

/**
 * Zgodovina meritev ene postaje (primer uporabe 2 v dokumentaciji:
 * `?id=<postaja>&len=<n>`), za prikaz grafa vetra/temperature zadnjih
 * nekaj ur. API dokumentacija navaja `len` največ 100 - to NI dovolj za
 * polnih 24h (postaje poročajo ~vsakih 10 min, torej 100 meritev pokrije
 * približno 16-17h, ne celega dneva; API ne ponuja straničenja za starejše
 * podatke, zato več kot ene same zahteve ne pomaga). Uporabljamo torej
 * maksimalno dovoljeno vrednost. API vrne najnovejšo meritev prvo – tu
 * jih obrnemo v kronološki vrstni red (najstarejša prva), primeren za graf.
 */
async function fetchStationHistory(stationId, len = 100) {
  const token = process.env.SKYTECH_API_TOKEN;
  if (!token) {
    return {
      ok: false,
      error: 'SKYTECH_API_TOKEN ni nastavljen (manjka GitHub Actions secret).',
      measurements: [],
    };
  }

  try {
    const url = `${SKYTECH_API_BASE}?id=${encodeURIComponent(stationId)}&len=${encodeURIComponent(len)}`;
    const result = await fetchJsonCached(url, {
      ttlMs: 10 * 60 * 1000,
      timeoutMs: 8000,
      headers: { 'X-Api-Key': token },
    });

    const raw = (result.data && result.data.postaja && result.data.postaja.podatki) || [];
    const measurements = raw
      .slice()
      .reverse()
      .map((m) => ({
        time: m.timestamp_utc || null,
        windSpeedKmh: msToKmh(m.wind_speed),
        windGustKmh: msToKmh(m.wind_gusts),
        windDirection: directionIndexToCompass(m.wind_direction),
        temperatureC: m.temperature ?? null,
      }));

    return { ok: true, measurements };
  } catch (err) {
    return { ok: false, error: err.message, measurements: [] };
  }
}

module.exports = {
  fetchAllStations,
  fetchStationHistory,
  directionIndexToCompass,
  msToKmh,
  DIRECTION_BY_INDEX,
};
