'use strict';

const { fetchJsonCached } = require('./fetchUtil');

const ARSO_BASE = 'https://vreme.arso.gov.si/api/1.0/location/';

/**
 * Poišče prvo obstoječo vrednost med več možnimi ključi.
 * ARSO javno ne objavlja formalne sheme JSON odgovora, zato ob spremembah
 * imen polj raje poskusimo več znanih variant, kot da bi podatki tiho izginili.
 */
function pick(obj, keys) {
  if (!obj) return undefined;
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') {
      return obj[key];
    }
  }
  return undefined;
}

function toNumber(v) {
  if (v === undefined || v === null) return null;
  const n = typeof v === 'string' ? parseFloat(v.replace(',', '.')) : v;
  return Number.isFinite(n) ? n : null;
}

/**
 * Poišče v odgovoru seznam dnevnih napovedi ne glede na natančno obliko
 * ovojnice (GeoJSON FeatureCollection z eno lokacijo ali navaden objekt).
 */
function extractDays(data) {
  if (!data) return [];
  const feature =
    (Array.isArray(data.features) && data.features[0]) ||
    (Array.isArray(data) && data[0]) ||
    data;
  const props = feature.properties || feature;
  const days = props.days || props.forecast3h || props.forecast1h || [];
  return Array.isArray(days) ? days : [];
}

function normalizeTimelineEntry(entry) {
  const t = toNumber(pick(entry, ['t', 'T', 'temp', 'temperature']));
  const rh = toNumber(pick(entry, ['rh', 'RH', 'humidity']));
  const windDir = pick(entry, ['dd_shortText', 'dd_decodeText', 'dd', 'wind_dir', 'windDirection']);
  const windSpeed = toNumber(pick(entry, ['ff_val', 'ff', 'wind_speed', 'windSpeed']));
  const windGust = toNumber(pick(entry, ['ffmax_val', 'ffmax', 'gust', 'wind_gust', 'windGust']));
  const clouds = pick(entry, ['clouds_shortText', 'clouds_decodeText', 'cloudsIcon', 'clouds']);
  const precip = toNumber(pick(entry, ['tp_acc', 'tp', 'precip', 'precipitation']));
  const pressure = toNumber(pick(entry, ['msl', 'pressure']));
  const validTime = pick(entry, ['valid', 'validDate', 'dateISO', 'date']);

  return {
    time: validTime || null,
    temperatureC: t,
    relativeHumidity: rh,
    windDirection: windDir || null,
    windSpeedKmh: windSpeed,
    windGustKmh: windGust,
    cloudCover: clouds || null,
    precipitationMm: precip,
    pressureHpa: pressure,
  };
}

/**
 * Pridobi napoved za poimenovano ARSO lokacijo (npr. "Bovec", "Ajdovščina").
 * Imena krajev v URL-ju kodiramo, presledki postanejo "+".
 */
async function fetchArsoForecast(locationName) {
  const url = `${ARSO_BASE}?location=${encodeURIComponent(locationName)}`;
  const result = await fetchJsonCached(url, { ttlMs: 10 * 60 * 1000, timeoutMs: 8000 });

  const rawDays = extractDays(result.data);
  const days = rawDays
    .map((day) => {
      const timeline = Array.isArray(day.timeline)
        ? day.timeline
        : Array.isArray(day.entries)
        ? day.entries
        : [];
      return {
        date: day.date || day.day || null,
        timeline: timeline.map(normalizeTimelineEntry),
      };
    })
    .filter((d) => d.timeline.length > 0);

  return {
    ok: days.length > 0,
    source: 'ARSO (vreme.arso.gov.si)',
    sourceUrl: url,
    locationName,
    days,
    fromCache: result.fromCache,
  };
}

module.exports = { fetchArsoForecast };
