'use strict';

/**
 * Poenostavljena podstran - iste podatke kot glavna stran (app.js), a
 * manj razporejeno: en konsolidiran blok na vzletišče, večje pisave,
 * brez izbire enote vetra (vedno km/h). Bere ISTE JSON datoteke iz
 * /data/, ki jih zgradi scripts/build-data.js - brez dodatnega
 * strežniškega klica ali podvajanja podatkovnega cevovoda.
 *
 * Izbira lokacije na zemljevidu in podrobnosti ob kliku na postajo/
 * termiko so namenoma ločena implementacija od app.js (ista logika,
 * kopirana in prilagojena - glej opombo pri computeNearbyStationsForPoint
 * zgoraj v README.md zakaj datoteki nista deljeni).
 */

const state = {
  sites: [],
  userCoords: null,
  allStations: null,
  thermalRegions: null,
  arsoLocations: null,
  arsoLocationForecastCache: new Map(),
  windAloftRequestToken: null,
  lastData: null,
  stationHistoryCache: new Map(),
  currentHistoryStationId: null,
};

const el = {
  siteSelect: document.getElementById('siteSelect'),
  locateBtn: document.getElementById('locateBtn'),
  mapPickerBtn: document.getElementById('mapPickerBtn'),
  windAloftBlock: document.getElementById('windAloftBlock'),
  windAloftMeta: document.getElementById('windAloftMeta'),
  windAloftList: document.getElementById('windAloftList'),
  windAloftLink: document.getElementById('windAloftLink'),
  statusBox: document.getElementById('statusBox'),
  currentBlock: document.getElementById('currentBlock'),
  siteName: document.getElementById('siteName'),
  siteMeta: document.getElementById('siteMeta'),
  currentStats: document.getElementById('currentStats'),
  verdicts: document.getElementById('verdicts'),
  currentHint: document.getElementById('currentHint'),
  thermalBlock: document.getElementById('thermalBlock'),
  thermalMeta: document.getElementById('thermalMeta'),
  thermalStats: document.getElementById('thermalStats'),
  nearbyBlock: document.getElementById('nearbyBlock'),
  nearbyList: document.getElementById('nearbyList'),
  forecastBlock: document.getElementById('forecastBlock'),
  forecastMeta: document.getElementById('forecastMeta'),
  forecastBody: document.getElementById('forecastBody'),
  linksBlock: document.getElementById('linksBlock'),
  linksList: document.getElementById('linksList'),
  disclaimerBox: document.getElementById('disclaimerBox'),
  historyModalOverlay: document.getElementById('historyModalOverlay'),
  historyModalTitle: document.getElementById('historyModalTitle'),
  historyModalSnapshot: document.getElementById('historyModalSnapshot'),
  historyModalBody: document.getElementById('historyModalBody'),
  historyModalClose: document.getElementById('historyModalClose'),
  mapModalOverlay: document.getElementById('mapModalOverlay'),
  mapModalClose: document.getElementById('mapModalClose'),
  mapContainer: document.getElementById('mapContainer'),
  mapCoordsLabel: document.getElementById('mapCoordsLabel'),
  mapConfirmBtn: document.getElementById('mapConfirmBtn'),
};

function setStatus(message, type) {
  if (!message) {
    el.statusBox.hidden = true;
    el.statusBox.textContent = '';
    el.statusBox.className = 'status-box';
    return;
  }
  el.statusBox.hidden = false;
  el.statusBox.textContent = message;
  el.statusBox.className = 'status-box' + (type ? ` ${type}` : '');
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function findNearestSite(lat, lon) {
  let best = null;
  let bestDist = Infinity;
  for (const site of state.sites) {
    const d = haversineKm(lat, lon, site.lat, site.lon);
    if (d < bestDist) {
      bestDist = d;
      best = site;
    }
  }
  return { site: best, distanceKm: Math.round(bestDist * 10) / 10 };
}

async function loadSites() {
  const res = await fetch('data/sites.json', { cache: 'no-store' });
  if (!res.ok) throw new Error('Seznama vzletišč ni bilo mogoče naložiti.');
  state.sites = await res.json();
  el.siteSelect.innerHTML = state.sites.map((s) => `<option value="${s.id}">${s.name} — ${s.region}</option>`).join('');
}

async function loadAllStations() {
  if (state.allStations) return state.allStations;
  try {
    const res = await fetch('data/skytech-stations.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    state.allStations = data.stations || [];
  } catch (_) {
    state.allStations = [];
  }
  return state.allStations;
}

async function loadThermalRegions() {
  if (state.thermalRegions) return state.thermalRegions;
  try {
    const res = await fetch('data/thermal-regions.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    state.thermalRegions = data.regions || {};
  } catch (_) {
    state.thermalRegions = {};
  }
  return state.thermalRegions;
}

const NEARBY_MAX_DISTANCE_KM = 25;
const NEARBY_MAX_COUNT = 6;
const NEARBY_MAX_AGE_MINUTES = 24 * 60;

/**
 * Enako kot v app.js (glavna stran) - za poljubno GPS točko ("Moja
 * lokacija"/zemljevid) izloči pokvarjene privzete koordinate (altitude 0)
 * in zastarele meritve, glej SKYTECH_API_ISSUES.md.
 */
function computeNearbyStationsForPoint(stations, lat, lon, excludeId) {
  if (!Array.isArray(stations)) return [];
  return stations
    .filter((s) =>
      s.id !== excludeId &&
      typeof s.lat === 'number' &&
      typeof s.lon === 'number' &&
      s.altitude !== 0 &&
      s.measurement
    )
    .map((s) => {
      const m = s.measurement;
      const ageMinutes = m.time ? Math.round((Date.now() - new Date(m.time).getTime()) / 60000) : null;
      return {
        distanceKm: Math.round(haversineKm(lat, lon, s.lat, s.lon) * 10) / 10,
        stationId: s.id,
        stationName: s.name,
        time: m.time,
        ageMinutes,
        windSpeedKmh: m.windSpeedKmh,
        windGustKmh: m.windGustKmh,
        windDirection: m.windDirection,
        temperatureC: m.temperatureC,
      };
    })
    .filter((s) => s.distanceKm <= NEARBY_MAX_DISTANCE_KM && s.ageMinutes != null && s.ageMinutes <= NEARBY_MAX_AGE_MINUTES)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, NEARBY_MAX_COUNT);
}

/**
 * Enako kot v app.js - NE sme si izposoditi ARSO termalne regije
 * najbližjega URADNEGA vzletišča (ta je lahko v drugi regiji kot
 * uporabnikova dejanska točka), ampak jo izračuna iz prave GPS točke.
 */
function computeNearestThermalRegion(regions, lat, lon) {
  let best = null;
  let bestDist = Infinity;
  for (const code of Object.keys(regions)) {
    const r = regions[code];
    if (!r.center) continue;
    const d = haversineKm(lat, lon, r.center.lat, r.center.lon);
    if (d < bestDist) {
      bestDist = d;
      best = r;
    }
  }
  return best;
}

async function loadArsoLocations() {
  if (state.arsoLocations) return state.arsoLocations;
  try {
    const res = await fetch('data/arso-locations.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    state.arsoLocations = data.locations || [];
  } catch (_) {
    state.arsoLocations = [];
  }
  return state.arsoLocations;
}

/**
 * Enako kot v app.js - NE sme si izposoditi ARSO kraja, dodeljenega
 * najbližjemu URADNEMU vzletišču (site.arsoLocation je izbran za to
 * vzletišče, ni nujno najbližji poljubni drugi točki v okolici), ampak
 * najde najbližji ARSO-podprt kraj (glej src/arso-locations.js) iz prave
 * GPS točke.
 */
function computeNearestArsoLocation(locations, lat, lon) {
  let best = null;
  let bestDist = Infinity;
  for (const loc of locations) {
    if (loc.ok === false) continue;
    const d = haversineKm(lat, lon, loc.lat, loc.lon);
    if (d < bestDist) {
      bestDist = d;
      best = loc;
    }
  }
  return best ? { location: best, distanceKm: Math.round(bestDist * 10) / 10 } : null;
}

async function loadArsoLocationForecast(slug) {
  if (state.arsoLocationForecastCache.has(slug)) {
    return state.arsoLocationForecastCache.get(slug);
  }
  try {
    const res = await fetch(`data/arso/${slug}.json`, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    state.arsoLocationForecastCache.set(slug, data);
    return data;
  } catch (_) {
    return null;
  }
}

function pillClass(color) {
  return `verdict verdict-${color || 'gray'}`;
}

function formatDayLabel(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('sl-SI', { weekday: 'short', day: 'numeric', month: 'numeric' });
}

function formatWind(v) {
  return v !== null && v !== undefined ? Math.round(v) + ' km/h' : '—';
}

function metricBox(label, value, pill) {
  return `
    <div class="big-stat">
      <div class="label">${label}</div>
      <div class="value">${value}</div>
      ${pill ? `<div class="${pillClass(pill.color)}">${pill.label}</div>` : ''}
    </div>
  `;
}

/**
 * Enako kot v app.js - ARSO napoved uporablja slovenske smerne okrajšave
 * (S=sever/0°, V=vzhod/90°, J=jug/180°, Z=zahod/270°, standardna kompasna
 * orientacija). Puščica kaže, OD KOD piha veter (npr. S → ↑, "od severa").
 */
const WIND_ARROW_BY_SI_DIRECTION = {
  S: '↑', SSV: '↑', SV: '↗', VSV: '↗', V: '→', VJV: '→', JV: '↘', JJV: '↘',
  J: '↓', JJZ: '↓', JZ: '↙', ZJZ: '↙', Z: '←', ZSZ: '←', SZ: '↖', SSZ: '↖',
};

function windArrow(direction) {
  return direction ? (WIND_ARROW_BY_SI_DIRECTION[direction] || '') : '';
}

function formatTime(timeStr) {
  if (!timeStr) return '—';
  const d = new Date(timeStr);
  if (Number.isNaN(d.getTime())) return timeStr;
  return d.toLocaleTimeString('sl-SI', { hour: '2-digit', minute: '2-digit' });
}

const SI_OCTANTS_BY_DEG = ['S', 'SV', 'V', 'JV', 'J', 'JZ', 'Z', 'SZ'];

function degToSiOctant(deg) {
  if (deg === null || deg === undefined || Number.isNaN(deg)) return null;
  const idx = Math.round(((deg % 360) + 360) % 360 / 45) % 8;
  return SI_OCTANTS_BY_DEG[idx];
}

/**
 * Enako kot v app.js - veter po višini (tlačni nivoji) iz Open-Meteo
 * (brez API ključa, odprt CORS - preverjeno prek GitHub Actions), ker
 * ARSO tega ne objavlja strojno berljivo. Klic gre neposredno iz
 * brskalnika, brez strežniške predpriprave.
 */
const WIND_ALOFT_LEVELS = [
  { hpa: 1000, altitudeM: 110 },
  { hpa: 925, altitudeM: 760 },
  { hpa: 850, altitudeM: 1460 },
  { hpa: 700, altitudeM: 3010 },
  { hpa: 600, altitudeM: 4210 },
];

async function fetchWindAloft(lat, lon) {
  const params = WIND_ALOFT_LEVELS.flatMap((l) => [`wind_speed_${l.hpa}hPa`, `wind_direction_${l.hpa}hPa`]).join(',');
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=${params}&timezone=auto&forecast_days=1`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const json = await res.json();
  const times = json.hourly.time;
  const now = Date.now();
  let bestIdx = 0;
  let bestDiff = Infinity;
  for (let i = 0; i < times.length; i++) {
    const diff = Math.abs(new Date(times[i]).getTime() - now);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIdx = i;
    }
  }
  return {
    time: times[bestIdx],
    levels: WIND_ALOFT_LEVELS.map((l) => ({
      hpa: l.hpa,
      altitudeM: l.altitudeM,
      windSpeedKmh: json.hourly[`wind_speed_${l.hpa}hPa`][bestIdx],
      windDirectionDeg: json.hourly[`wind_direction_${l.hpa}hPa`][bestIdx],
    })),
  };
}

async function renderWindAloft(data) {
  if (!data.links || !data.links.windAloft) {
    el.windAloftBlock.hidden = true;
    return;
  }
  el.windAloftLink.href = data.links.windAloft;
  el.windAloftBlock.hidden = false;

  const coords = data.myLocationMode && state.userCoords
    ? state.userCoords
    : (data.site ? { lat: data.site.lat, lon: data.site.lon } : null);
  if (!coords) {
    el.windAloftMeta.textContent = '';
    el.windAloftList.innerHTML = '';
    return;
  }

  const requestToken = Symbol('windAloft');
  state.windAloftRequestToken = requestToken;
  el.windAloftMeta.textContent = 'Nalagam…';
  el.windAloftList.innerHTML = '';
  try {
    const aloft = await fetchWindAloft(coords.lat, coords.lon);
    if (state.windAloftRequestToken !== requestToken) return;
    el.windAloftMeta.textContent = `Vir: Open-Meteo (ne ARSO) · trenutno (${formatTime(aloft.time)})`;
    el.windAloftList.innerHTML = aloft.levels
      .map((l) => {
        const octant = degToSiOctant(l.windDirectionDeg);
        return `
          <li>
            <span>~${l.altitudeM} m (${l.hpa} hPa)</span>
            <span>${formatWind(l.windSpeedKmh)}${octant ? ' ' + octant + ' ' + windArrow(octant) : ''}</span>
          </li>
        `;
      })
      .join('');
  } catch (err) {
    if (state.windAloftRequestToken !== requestToken) return;
    el.windAloftMeta.textContent = 'Podatkov trenutno ni bilo mogoče naložiti.';
    el.windAloftList.innerHTML = '';
  }
}

/**
 * Enako kot rateWindClient/rateSkytechDirectionClient v app.js - groba
 * ocena vetra/smeri, izračunana v brskalniku iz že javno objavljenih
 * podatkov (data/skytech-stations.json), brez dodatnega API klica.
 */
function rateWindClient(windSpeedKmh, windGustKmh) {
  if (windSpeedKmh === null || windSpeedKmh === undefined) {
    return { label: 'Ni podatka o vetru', color: 'gray' };
  }
  const gustSpread = windGustKmh != null ? windGustKmh - windSpeedKmh : 0;
  if (windSpeedKmh > 30) return { label: 'Neprimerno za letenje (premočan veter)', color: 'red' };
  if (windSpeedKmh > 20 || gustSpread > 15) return { label: 'Močan/sunkovit veter – samo izkušeni piloti', color: 'orange' };
  if (windSpeedKmh >= 8) return { label: 'Ugodno za letenje', color: 'green' };
  return { label: 'Šibek/miren veter', color: 'blue' };
}

function rateSkytechDirectionClient(station, compassDirection) {
  if (!station || !compassDirection) return { label: 'Ni podatka o smeri', color: 'gray' };
  if (station.directionsGreen && station.directionsGreen.includes(compassDirection)) {
    return { label: `Smer (${compassDirection}) ustreza postaji`, color: 'green' };
  }
  if (station.directionsYellow && station.directionsYellow.includes(compassDirection)) {
    return { label: `Smer (${compassDirection}) mejna`, color: 'orange' };
  }
  if (station.directionsRed && station.directionsRed.includes(compassDirection)) {
    return { label: `Smer (${compassDirection}) neprimerna`, color: 'red' };
  }
  return { label: `Smer (${compassDirection}) ni razvrščena`, color: 'gray' };
}

/* ---------- Grafi (isti gradniki kot app.js: buildLineChartSvg + oznake vsake 3 ure) ---------- */

function pickThreeHourTicks(series) {
  const withTime = series
    .map((p, i) => ({ i, t: p.time ? new Date(p.time).getTime() : null }))
    .filter((p) => p.t !== null);
  if (withTime.length === 0) return [];

  const start = withTime[0].t;
  const end = withTime[withTime.length - 1].t;
  const boundary = new Date(start);
  boundary.setMinutes(0, 0, 0);
  boundary.setHours(Math.floor(boundary.getHours() / 3) * 3);

  const picked = [];
  const usedIdx = new Set();
  while (boundary.getTime() <= end) {
    const target = boundary.getTime();
    let best = withTime[0];
    let bestDiff = Math.abs(best.t - target);
    for (const p of withTime) {
      const diff = Math.abs(p.t - target);
      if (diff < bestDiff) {
        best = p;
        bestDiff = diff;
      }
    }
    if (!usedIdx.has(best.i)) {
      usedIdx.add(best.i);
      picked.push({ i: best.i, time: series[best.i].time });
    }
    boundary.setHours(boundary.getHours() + 3);
  }
  return picked;
}

function buildLineChartSvg({ series, series2, width = 320, height = 130, color = '#55ffff', color2 = '#ffaa00', unit = '', yLabelFormatter }) {
  const formatY = yLabelFormatter || ((v) => `${Math.round(v * 10) / 10}${unit}`);
  const padding = { top: 14, right: 8, bottom: 20, left: 4 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const allValues = series
    .concat(series2 || [])
    .map((p) => p.value)
    .filter((v) => v !== null && v !== undefined);
  if (allValues.length === 0) {
    return '<p class="meta small">Ni podatkov za graf.</p>';
  }
  let min = Math.min(...allValues);
  let max = Math.max(...allValues);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const pad = (max - min) * 0.12;
  const scaleMin = min - pad;
  const scaleMax = max + pad;

  const n = series.length;
  const xAt = (i) => padding.left + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const yAt = (v) => padding.top + innerH - ((v - scaleMin) / (scaleMax - scaleMin)) * innerH;

  function pathFor(pts) {
    let d = '';
    let needMove = true;
    pts.forEach((p, i) => {
      if (p.value === null || p.value === undefined) {
        needMove = true;
        return;
      }
      const cmd = needMove ? 'M' : 'L';
      d += `${cmd}${xAt(i).toFixed(1)},${yAt(p.value).toFixed(1)} `;
      needMove = false;
    });
    return d.trim();
  }

  const fmtTime = (t) => (t ? new Date(t).toLocaleTimeString('sl-SI', { hour: '2-digit', minute: '2-digit' }) : '');
  const baselineY = height - padding.bottom;
  const tickIdx = pickThreeHourTicks(series);
  const ticks = tickIdx
    .map(({ i, time }) => {
      const x = xAt(i);
      const anchor = x < padding.left + 15 ? 'start' : x > width - padding.right - 15 ? 'end' : 'middle';
      return `
        <line x1="${x.toFixed(1)}" y1="${baselineY.toFixed(1)}" x2="${x.toFixed(1)}" y2="${(baselineY - 4).toFixed(1)}" stroke="#00aaaa" stroke-width="1" />
        <text x="${x.toFixed(1)}" y="${height - 4}" font-size="11" fill="#55ffff" text-anchor="${anchor}">${fmtTime(time)}</text>
      `;
    })
    .join('');

  return `
    <svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" preserveAspectRatio="none" class="history-chart">
      <line x1="${padding.left}" y1="${baselineY}" x2="${width - padding.right}" y2="${baselineY}" stroke="#00aaaa" stroke-width="1" />
      <text x="${padding.left}" y="${padding.top - 4}" font-size="12" fill="#55ffff">${formatY(max)}</text>
      <text x="${padding.left}" y="${height - padding.bottom - 2}" font-size="12" fill="#55ffff">${formatY(min)}</text>
      ${series2 ? `<path d="${pathFor(series2)}" fill="none" stroke="${color2}" stroke-width="1.5" stroke-dasharray="3,3" />` : ''}
      <path d="${pathFor(series)}" fill="none" stroke="${color}" stroke-width="2" />
      ${ticks}
    </svg>
  `;
}

const COMPASS_TO_DEG = { N: 0, NE: 45, E: 90, SE: 135, S: 180, SW: 225, W: 270, NW: 315 };

function pickHourlyIndices(series) {
  const indices = [];
  let lastHourKey = null;
  series.forEach((p, i) => {
    if (!p.time) return;
    const d = new Date(p.time);
    const hourKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`;
    if (hourKey !== lastHourKey) {
      indices.push(i);
      lastHourKey = hourKey;
    }
  });
  return indices;
}

function buildDirectionArrowsSvg(series, width = 320, height = 28) {
  const padding = { left: 4, right: 8 };
  const innerW = width - padding.left - padding.right;
  const n = series.length;
  if (n === 0) return '';
  const xAt = (i) => padding.left + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const cy = height / 2 + 4;

  const glyphs = pickHourlyIndices(series)
    .map((i) => {
      const deg = COMPASS_TO_DEG[series[i].direction];
      if (deg === undefined) return '';
      const cx = xAt(i).toFixed(1);
      return `<text x="${cx}" y="${cy}" font-size="14" fill="#55ffff" text-anchor="middle" transform="rotate(${deg} ${cx} ${cy - 4})">↑</text>`;
    })
    .join('');

  if (!glyphs) return '';
  return `<svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" class="history-chart-arrows">${glyphs}</svg>`;
}

/* ---------- Podrobnosti postaje (klik na trenutno postajo ali vrstico v bližini) ---------- */

function renderStationSnapshot(station) {
  const m = station.measurement;
  if (!m) return '';
  const ageMinutes = m.time ? Math.round((Date.now() - new Date(m.time).getTime()) / 60000) : null;
  const ageText = ageMinutes != null ? (ageMinutes <= 1 ? 'pred manj kot minuto' : `pred ${ageMinutes} min`) : '';
  const wind = rateWindClient(m.windSpeedKmh, m.windGustKmh);
  const dirRating = rateSkytechDirectionClient(station, m.windDirection);
  return `
    <p class="meta small">Trenutna meritev${ageText ? ' · ' + ageText : ''}${station.altitude ? ` · ${station.altitude} m n.v.` : ''}</p>
    <div class="big-row">
      ${metricBox('Veter', m.windSpeedKmh != null ? `${formatWind(m.windSpeedKmh)}${m.windDirection ? ' ' + m.windDirection : ''}` : '—', wind)}
      ${metricBox('Sunki vetra', formatWind(m.windGustKmh))}
      ${metricBox('Smer (ocena)', m.windDirection || '—', dirRating)}
      ${metricBox('Temperatura', m.temperatureC != null ? `${m.temperatureC}°C` : '—')}
    </div>
  `;
}

async function loadStationHistory(stationId) {
  if (state.stationHistoryCache.has(stationId)) {
    return state.stationHistoryCache.get(stationId);
  }
  const res = await fetch(`data/history/${stationId}.json`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Zgodovina za to postajo ni na voljo.');
  const data = await res.json();
  state.stationHistoryCache.set(stationId, data);
  return data;
}

function renderHistoryCharts(history) {
  if (!history || !history.ok || !history.measurements || history.measurements.length === 0) {
    el.historyModalBody.innerHTML = '<p class="meta small">Zgodovina za to postajo (zadnjih nekaj ur) ni na voljo.</p>';
    return;
  }
  const m = history.measurements;
  const windSeries = m.map((e) => ({ time: e.time, value: e.windSpeedKmh }));
  const gustSeries = m.map((e) => ({ time: e.time, value: e.windGustKmh }));
  const dirSeries = m.map((e) => ({ time: e.time, direction: e.windDirection }));
  const tempSeries = m.map((e) => ({ time: e.time, value: e.temperatureC }));
  const hoursSpan = Math.round((m.length * 10) / 6) / 10;

  el.historyModalBody.innerHTML = `
    <div class="chart-block">
      <h4>Veter (km/h)</h4>
      ${buildLineChartSvg({ series: windSeries, series2: gustSeries, color: '#55ffff', color2: '#ffaa00' })}
      ${buildDirectionArrowsSvg(dirSeries)}
      <p class="meta small">↑ = smer, od koder piha veter (sever = puščica navzgor), po ena za vsako uro.</p>
      <div class="chart-legend">
        <span><span class="swatch" style="background:#55ffff"></span>hitrost</span>
        <span><span class="swatch" style="background:#ffaa00"></span>sunki</span>
      </div>
    </div>
    <div class="chart-block">
      <h4>Temperatura (°C)</h4>
      ${buildLineChartSvg({ series: tempSeries, color: '#ff5555', unit: '°' })}
    </div>
    <p class="meta small">Zadnjih ${m.length} meritev (~${hoursSpan} h, postaja poroča približno vsakih 10 min).</p>
  `;
}

function closeHistoryModal() {
  el.historyModalOverlay.hidden = true;
  state.currentHistoryStationId = null;
}

function openHistoryModal(stationId, stationName, station) {
  state.currentHistoryStationId = stationId;
  el.historyModalTitle.textContent = stationName || 'Postaja';
  el.historyModalSnapshot.innerHTML = station ? renderStationSnapshot(station) : '';
  el.historyModalBody.innerHTML = '<p class="meta small">Nalagam zgodovino…</p>';
  el.historyModalOverlay.hidden = false;
  loadStationHistory(stationId)
    .then((history) => {
      if (state.currentHistoryStationId === stationId) renderHistoryCharts(history);
    })
    .catch((err) => {
      if (state.currentHistoryStationId === stationId) {
        el.historyModalBody.innerHTML = `<p class="meta small">${err.message}</p>`;
      }
    });
}

/**
 * Odpre podrobnosti postaje po ID-ju - poišče postajo v že naloženem
 * seznamu vseh postaj (za trenutno meritev/oceno vetra/smeri), nato
 * naloži zgodovino za graf. Uporabljeno tako za "trenutno" postajo kot
 * za vrstice v seznamu bližnjih postaj in oznake na zemljevidu.
 */
async function openStationDetail(stationId, stationName) {
  const stations = await loadAllStations();
  const station = stations.find((s) => s.id === stationId) || null;
  openHistoryModal(stationId, stationName, station);
}

/* ---------- Podrobnosti termike (klik na kartico termike) ---------- */

const THERMAL_LEVEL_RANK = { gray: 1, blue: 1, green: 2, orange: 3 };
const THERMAL_LEVEL_LABELS = { 1: 'šibka', 2: 'dobra', 3: 'ostra' };

function buildThermalLineSvg(entries) {
  const series = entries
    .filter((e) => e.time)
    .map((e) => ({ time: e.time, value: THERMAL_LEVEL_RANK[e.thermal && e.thermal.color] || null }));
  if (series.length === 0) return '<p class="meta small">Ni podatkov za graf.</p>';
  return buildLineChartSvg({
    series,
    color: '#ffaa00',
    yLabelFormatter: (v) => THERMAL_LEVEL_LABELS[Math.min(3, Math.max(1, Math.round(v)))] || '',
  });
}

function renderThermalHourlyEstimate() {
  const forecast = state.lastData && state.lastData.forecast;
  if (!forecast || forecast.length === 0) return '';
  const days = forecast.slice(0, 2).filter((d) => d && d.timeline && d.timeline.length > 0);
  if (days.length === 0) return '';
  return days
    .map((day) => {
      const entries = day.timeline.map((e) => ({ time: e.time, thermal: e.paragliding && e.paragliding.thermal }));
      return `
        <div class="chart-block">
          <h4>Naša ocena po urah — ${formatDayLabel(day.date)} (ni uradni ARSO podatek)</h4>
          ${buildThermalLineSvg(entries)}
        </div>
      `;
    })
    .join('');
}

function openArsoThermalDetailModal() {
  const t = state.lastData && state.lastData.thermalForecastArso;
  if (!t || !t.items || t.items.length === 0) return;
  state.currentHistoryStationId = null;
  el.historyModalTitle.textContent = `🌡️ Napoved termike — ${t.regionLabel}`;
  el.historyModalSnapshot.innerHTML = '';
  el.historyModalBody.innerHTML =
    '<h4>Uradna ARSO napoved</h4>' +
    t.items
      .map(
        (item) => `
    <div class="big-stat" style="margin-bottom:10px;">
      <div class="label">${item.date}</div>
      <div class="value">${item.climbMs} m/s</div>
      <div class="thermal-swatch" style="background:${item.color}"></div>
      ${item.issued ? `<p class="meta small" style="margin-top:8px;">Izdano: ${item.issued}</p>` : ''}
      ${item.link ? `<p><a href="${item.link}" target="_blank" rel="noopener">Poglej na uradni ARSO strani ↗</a></p>` : ''}
    </div>
  `
      )
      .join('') +
    renderThermalHourlyEstimate();
  el.historyModalOverlay.hidden = false;
}

/* ---------- Izbira lokacije na zemljevidu (Leaflet + OpenStreetMap) ---------- */

let mapPickerMap = null;
let mapPickerMarker = null;
let mapPickerLatLng = null;
// Postaja, izbrana s klikom na njeno 📡 oznako (ne generični klik po
// zemljevidu) - ob potrditvi lokacije njeno živo meritev prikažemo namesto
// splošne ARSO napovedi za najbližje vzletišče.
let mapPickerSelectedStation = null;

function addSiteMarkersToMapPicker() {
  const icon = L.divIcon({
    html: '<div class="map-pin">🪂</div>',
    className: 'map-pin-wrapper',
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
  for (const site of state.sites) {
    if (typeof site.lat !== 'number' || typeof site.lon !== 'number') continue;
    L.marker([site.lat, site.lon], { icon, zIndexOffset: 400 })
      .addTo(mapPickerMap)
      .on('click', () => {
        mapPickerSelectedStation = null;
        setMapPickerPoint(site.lat, site.lon);
      });
  }
}

async function addStationMarkersToMapPicker() {
  const stations = await loadAllStations();
  if (!mapPickerMap) return;
  const icon = L.divIcon({
    html: '<div class="map-pin map-pin-station">📡</div>',
    className: 'map-pin-wrapper',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
  const now = Date.now();
  for (const s of stations) {
    if (typeof s.lat !== 'number' || typeof s.lon !== 'number') continue;
    if (s.altitude === 0) continue;
    const ageMinutes = s.measurement && s.measurement.time ? Math.round((now - new Date(s.measurement.time).getTime()) / 60000) : null;
    if (ageMinutes == null || ageMinutes > NEARBY_MAX_AGE_MINUTES) continue;
    L.marker([s.lat, s.lon], { icon, zIndexOffset: 300 })
      .addTo(mapPickerMap)
      .on('click', () => {
        mapPickerSelectedStation = s;
        setMapPickerPoint(s.lat, s.lon);
        openHistoryModal(s.id, s.name, s);
      });
  }
}

function initMapPicker() {
  if (mapPickerMap || typeof L === 'undefined') return;
  const center = state.userCoords ? [state.userCoords.lat, state.userCoords.lon] : [46.05, 14.9];
  mapPickerMap = L.map(el.mapContainer).setView(center, state.userCoords ? 11 : 8);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
    maxZoom: 18,
  }).addTo(mapPickerMap);
  mapPickerMap.on('click', (e) => {
    mapPickerSelectedStation = null;
    setMapPickerPoint(e.latlng.lat, e.latlng.lng);
  });

  addSiteMarkersToMapPicker();
  addStationMarkersToMapPicker();

  if (state.userCoords) {
    setMapPickerPoint(state.userCoords.lat, state.userCoords.lon);
  }
}

function setMapPickerPoint(lat, lon) {
  mapPickerLatLng = { lat, lon };
  if (mapPickerMarker) {
    mapPickerMarker.setLatLng([lat, lon]);
  } else {
    mapPickerMarker = L.marker([lat, lon], { draggable: true }).addTo(mapPickerMap);
    mapPickerMarker.on('dragend', () => {
      const p = mapPickerMarker.getLatLng();
      mapPickerLatLng = { lat: p.lat, lon: p.lng };
      mapPickerSelectedStation = null;
      el.mapCoordsLabel.textContent = `Izbrana lokacija: ${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}`;
    });
  }
  el.mapCoordsLabel.textContent = `Izbrana lokacija: ${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  el.mapConfirmBtn.disabled = false;
}

function openMapPicker() {
  if (typeof L === 'undefined') {
    setStatus('Zemljevida ni bilo mogoče naložiti (ni internetne povezave). Poskusi gumb "Moja lokacija" ali izberi vzletišče ročno.', 'error');
    return;
  }
  el.mapModalOverlay.hidden = false;
  requestAnimationFrame(() => {
    initMapPicker();
    mapPickerMap.invalidateSize();
  });
}

function closeMapPicker() {
  el.mapModalOverlay.hidden = true;
}

/* ---------- Prikaz podatkov ---------- */

function renderCurrent(data) {
  el.siteName.textContent = data.myLocationMode ? '📍 Tvoja lokacija' : data.site.name;
  const arsoSourceName = data.arsoLocationName || data.site.name;
  const arsoSourceKm = data.arsoLocationDistanceKm != null ? data.arsoLocationDistanceKm : data.distanceKm;
  const regionText = data.myLocationMode
    ? data.stationMode
      ? `izbrana živa postaja: ${data.skytech.stationName} · ARSO napoved: ${arsoSourceName} (${arsoSourceKm} km)`
      : `najbližji vir ARSO napovedi: ${arsoSourceName} (${arsoSourceKm} km)`
    : `${data.site.region} · ${data.site.elevation} m n.v.`;
  el.siteMeta.textContent = regionText;

  const sk = data.skytech;
  const firstEntry = data.forecast[0] && data.forecast[0].timeline[0];
  const useLive = sk && sk.hasMeasurement && (data.stationMode || !data.myLocationMode);
  const windSpeed = useLive ? sk.windSpeedKmh : firstEntry ? firstEntry.windSpeedKmh : null;
  const windGust = useLive ? sk.windGustKmh : firstEntry ? firstEntry.windGustKmh : null;
  const windDir = useLive ? sk.windDirection : firstEntry ? firstEntry.windDirection : null;
  const temp = useLive ? sk.temperatureC : firstEntry ? firstEntry.temperatureC : null;
  const windRating = useLive ? sk.wind : firstEntry ? firstEntry.paragliding.wind : null;
  const dirRating = useLive ? sk.directionRating : firstEntry ? firstEntry.paragliding.launchAlignment : null;
  const source = useLive ? `živa meritev (${sk.stationName})` : 'ARSO napoved';

  el.currentStats.innerHTML = `
    <div class="big-stat"><div class="label">Veter</div><div class="value">${windSpeed != null ? Math.round(windSpeed) + ' km/h' : '—'}</div></div>
    <div class="big-stat"><div class="label">Sunki</div><div class="value">${windGust != null ? Math.round(windGust) + ' km/h' : '—'}</div></div>
    <div class="big-stat"><div class="label">Smer</div><div class="value">${windDir || '—'}</div></div>
    <div class="big-stat"><div class="label">Temperatura</div><div class="value">${temp != null ? Math.round(temp) + '°C' : '—'}</div></div>
  `;

  const verdictParts = [];
  if (windRating) verdictParts.push(`<span class="${pillClass(windRating.color)}">${windRating.label}</span>`);
  if (dirRating && (data.stationMode || !data.myLocationMode)) verdictParts.push(`<span class="${pillClass(dirRating.color)}">${dirRating.label}</span>`);
  el.verdicts.innerHTML = verdictParts.join('') + `<p class="meta" style="margin-top:10px;">Vir: ${source}</p>`;

  if (useLive) {
    el.currentBlock.dataset.stationId = sk.stationId;
    el.currentBlock.dataset.stationName = sk.stationName;
    el.currentHint.hidden = false;
    el.currentBlock.tabIndex = 0;
    el.currentBlock.style.cursor = 'pointer';
  } else {
    delete el.currentBlock.dataset.stationId;
    delete el.currentBlock.dataset.stationName;
    el.currentHint.hidden = true;
    el.currentBlock.tabIndex = -1;
    el.currentBlock.style.cursor = 'default';
  }

  el.currentBlock.hidden = false;
}

function renderThermal(data) {
  const t = data.thermalForecastArso;
  if (!t || !t.ok || !t.items || t.items.length === 0) {
    el.thermalBlock.hidden = true;
    return;
  }
  el.thermalMeta.textContent = `Regija: ${t.regionLabel} · max. hitrost dviganj`;
  el.thermalStats.innerHTML = t.items
    .map((item) => `<div class="big-stat"><div class="label">${item.date}</div><div class="value">${item.climbMs} m/s</div></div>`)
    .join('');
  el.thermalBlock.hidden = false;
}

function renderNearby(data) {
  const stations = data.nearbyStations;
  if (!stations || stations.length === 0) {
    el.nearbyBlock.hidden = true;
    return;
  }
  el.nearbyList.innerHTML = stations
    .map(
      (s) => `
    <li data-station-id="${s.stationId}" data-station-name="${s.stationName}">
      <span>${s.stationName} (${s.distanceKm} km)</span>
      <span>${s.windSpeedKmh != null ? Math.round(s.windSpeedKmh) + ' km/h ' + (s.windDirection || '') : '—'}</span>
    </li>
  `
    )
    .join('');
  el.nearbyBlock.hidden = false;
}

function renderForecast(data) {
  if (!data.forecast || data.forecast.length === 0) {
    el.forecastBlock.hidden = true;
    return;
  }
  const arsoSourceName = data.myLocationMode ? data.arsoLocationName : (data.site && data.site.arsoLocation);
  el.forecastMeta.textContent = arsoSourceName ? `Vir: ARSO napoved za ${arsoSourceName}` : '';
  el.forecastBody.innerHTML = data.forecast
    .map((day) => {
      const temps = day.timeline.map((e) => e.temperatureC).filter((t) => t !== null && t !== undefined);
      const rain = day.timeline.some((e) => e.precipitationMm !== null && e.precipitationMm !== undefined && e.precipitationMm > 1);
      const xc = day.thermalWindow && day.thermalWindow.xc;
      // Smer vetra ob najmočnejšem vetru čez dan - reprezentativna smer,
      // saj se čez dan lahko spreminja (glej WIND_ARROW_BY_SI_DIRECTION).
      let windPeak = null;
      for (const e of day.timeline) {
        if (e.windSpeedKmh == null) continue;
        if (!windPeak || e.windSpeedKmh > windPeak.windSpeedKmh) windPeak = e;
      }
      const tMin = temps.length ? Math.round(Math.min(...temps)) : null;
      const tMax = temps.length ? Math.round(Math.max(...temps)) : null;
      const windText = windPeak
        ? `do ${Math.round(windPeak.windSpeedKmh)} km/h${windPeak.windDirection ? ' ' + windArrow(windPeak.windDirection) : ''}`
        : '—';
      return `
        <tr>
          <td>${formatDayLabel(day.date)}</td>
          <td>${tMin !== null ? tMin + '–' + tMax + '°C' : '—'}</td>
          <td>${windText}</td>
          <td>${xc ? `<span class="${pillClass(xc.color)}">${xc.label}</span>` : '—'}</td>
          <td>${rain ? '🌧️' : '—'}</td>
        </tr>
      `;
    })
    .join('');
  el.forecastBlock.hidden = false;
}

function renderLinks(data) {
  const links = data.links || {};
  const items = [
    { href: links.arsoForecastPage, label: 'ARSO napoved (graf)' },
    { href: links.arsoAviation, label: 'ARSO letalsko vreme' },
    { href: links.arsoRadar, label: 'ARSO radar padavin' },
    { href: links.windAloft, label: 'Veter na višini (Windy)' },
    { href: links.skytech, label: 'SkyTech.si' },
  ].filter((i) => i.href);
  if (items.length === 0) {
    el.linksBlock.hidden = true;
    return;
  }
  el.linksList.innerHTML = items.map((i) => `<li><a href="${i.href}" target="_blank" rel="noopener">${i.label} ↗</a></li>`).join('');
  el.linksBlock.hidden = false;
}

function renderAll(data) {
  state.lastData = data;
  renderWindAloft(data);
  renderCurrent(data);
  renderThermal(data);
  renderNearby(data);
  renderForecast(data);
  renderLinks(data);
  el.disclaimerBox.textContent = data.disclaimer;
  el.disclaimerBox.hidden = false;
}

async function loadWeatherForSite(siteId) {
  setStatus('Nalagam podatke…');
  try {
    const res = await fetch(`data/weather/${siteId}.json`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Podatki za to vzletišče še niso na voljo.');
    const data = await res.json();
    renderAll(data);
    setStatus(null);
  } catch (err) {
    setStatus('Napaka pri nalaganju podatkov: ' + err.message, 'error');
  }
}

/**
 * Če je uporabnik na zemljevidu izbral konkretno živo postajo (station),
 * njeno meritev prikažemo kot glavni "trenutno" podatek namesto splošne
 * ARSO napovedi za najbližje vzletišče - podatek že imamo.
 */
async function showMyLocationWeather(nearest, station) {
  setStatus('Nalagam vremenske podatke…');
  try {
    const res = await fetch(`data/weather/${nearest.site.id}.json`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Podatki še niso na voljo.');
    const data = await res.json();

    data.distanceKm = nearest.distanceKm;
    data.myLocationMode = true;

    const allStations = await loadAllStations();
    data.nearbyStations = computeNearbyStationsForPoint(
      allStations,
      state.userCoords.lat,
      state.userCoords.lon,
      station ? station.id : null
    );

    if (station && station.measurement) {
      const m = station.measurement;
      const ageMinutes = m.time ? Math.round((Date.now() - new Date(m.time).getTime()) / 60000) : null;
      data.skytech = {
        hasMeasurement: true,
        stationId: station.id,
        stationName: station.name,
        ageMinutes,
        windSpeedKmh: m.windSpeedKmh,
        windGustKmh: m.windGustKmh,
        windDirection: m.windDirection,
        temperatureC: m.temperatureC,
        wind: rateWindClient(m.windSpeedKmh, m.windGustKmh),
        directionRating: rateSkytechDirectionClient(station, m.windDirection),
      };
      data.stationMode = true;
    }

    const thermalRegions = await loadThermalRegions();
    const nearestThermalRegion = computeNearestThermalRegion(thermalRegions, state.userCoords.lat, state.userCoords.lon);
    if (nearestThermalRegion) data.thermalForecastArso = nearestThermalRegion;

    // Uradna ARSO napoved (temperatura/veter/padavine/večdnevna tabela)
    // mora ustrezati uporabnikovi DEJANSKI točki, ne najbližjemu URADNEMU
    // vzletišču - zato jo tu prepišemo z napovedjo za najbližji ARSO-podprt
    // kraj (glej computeNearestArsoLocation zgoraj in src/arso-locations.js).
    const arsoLocations = await loadArsoLocations();
    const nearestArso = computeNearestArsoLocation(arsoLocations, state.userCoords.lat, state.userCoords.lon);
    if (nearestArso) {
      const forecast = await loadArsoLocationForecast(nearestArso.location.slug);
      if (forecast && forecast.ok) {
        data.forecast = forecast.days;
        data.arsoLocationName = nearestArso.location.name;
        data.arsoLocationDistanceKm = nearestArso.distanceKm;
        data.links = {
          ...data.links,
          arsoForecastPage: `https://vreme.arso.gov.si/napoved/${encodeURIComponent(nearestArso.location.name)}/graf`,
        };
      }
    }
    // Windy potrebuje natančne koordinate - v načinu "Moja lokacija" naj
    // kaže veter na višini za uporabnikovo dejansko točko, ne za
    // najbližje uradno vzletišče.
    data.links = {
      ...data.links,
      windAloft: `https://www.windy.com/${state.userCoords.lat}/${state.userCoords.lon}?wind,${state.userCoords.lat},${state.userCoords.lon},10`,
    };

    renderAll(data);
    setStatus(null);
  } catch (err) {
    setStatus('Napaka pri nalaganju podatkov: ' + err.message, 'error');
  }
}

/**
 * Skupna pot za "uporabi to GPS točko" - iz pravega GPS-a (locateBtn)
 * ali z izbiro na zemljevidu (mapConfirmBtn), isti vzorec kot useLocation
 * v app.js.
 */
function useLocation(lat, lon, station) {
  state.userCoords = { lat, lon };
  const nearest = findNearestSite(lat, lon);
  if (nearest.site) {
    el.siteSelect.value = nearest.site.id;
    showMyLocationWeather(nearest, station);
  } else {
    setStatus('Ni najdenega bližnjega vzletišča.', 'error');
  }
}

el.siteSelect.addEventListener('change', () => {
  loadWeatherForSite(el.siteSelect.value);
});

el.locateBtn.addEventListener('click', () => {
  if (!('geolocation' in navigator)) {
    setStatus('Brskalnik ne podpira GPS lokacije. Izberi vzletišče ročno.', 'error');
    return;
  }
  setStatus('Iščem lokacijo…');
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      setStatus(null);
      useLocation(pos.coords.latitude, pos.coords.longitude);
    },
    () => setStatus('Dostop do lokacije zavrnjen ali ni na voljo.', 'error'),
    { enableHighAccuracy: true, timeout: 10000 }
  );
});

el.mapPickerBtn.addEventListener('click', openMapPicker);
el.mapModalClose.addEventListener('click', closeMapPicker);
el.mapModalOverlay.addEventListener('click', (e) => {
  if (e.target === el.mapModalOverlay) closeMapPicker();
});
el.mapConfirmBtn.addEventListener('click', () => {
  if (!mapPickerLatLng) return;
  const { lat, lon } = mapPickerLatLng;
  const station = mapPickerSelectedStation;
  closeMapPicker();
  useLocation(lat, lon, station);
});

el.currentBlock.addEventListener('click', () => {
  const id = el.currentBlock.dataset.stationId;
  if (id) openStationDetail(id, el.currentBlock.dataset.stationName);
});
el.currentBlock.addEventListener('keydown', (e) => {
  if ((e.key === 'Enter' || e.key === ' ') && el.currentBlock.dataset.stationId) {
    e.preventDefault();
    el.currentBlock.click();
  }
});

el.nearbyList.addEventListener('click', (e) => {
  const row = e.target.closest('li');
  if (!row || !row.dataset.stationId) return;
  openStationDetail(row.dataset.stationId, row.dataset.stationName);
});

el.thermalBlock.addEventListener('click', openArsoThermalDetailModal);
el.thermalBlock.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    openArsoThermalDetailModal();
  }
});

el.historyModalClose.addEventListener('click', closeHistoryModal);
el.historyModalOverlay.addEventListener('click', (e) => {
  if (e.target === el.historyModalOverlay) closeHistoryModal();
});

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (!el.historyModalOverlay.hidden) {
    closeHistoryModal();
  } else if (!el.mapModalOverlay.hidden) {
    closeMapPicker();
  }
});

(async function init() {
  try {
    await loadSites();
    if (state.sites.length > 0) {
      el.siteSelect.value = state.sites[0].id;
      await loadWeatherForSite(state.sites[0].id);
    }
  } catch (err) {
    setStatus('Napaka pri nalaganju: ' + err.message, 'error');
  }
})();
