'use strict';

/**
 * Poenostavljena podstran - iste podatke kot glavna stran (app.js), a
 * manj razporejeno: manj ločenih kartic/interakcij (brez zemljevida,
 * brez modalov z grafi zgodovine, brez izbire enote), večje pisave, en
 * konsolidiran blok na vzletišče. Bere ISTE JSON datoteke iz /data/,
 * ki jih zgradi scripts/build-data.js - brez dodatnega strežniškega
 * klica ali podvajanja podatkovnega cevovoda.
 */

const state = {
  sites: [],
  userCoords: null,
  allStations: null,
  thermalRegions: null,
};

const el = {
  siteSelect: document.getElementById('siteSelect'),
  locateBtn: document.getElementById('locateBtn'),
  statusBox: document.getElementById('statusBox'),
  currentBlock: document.getElementById('currentBlock'),
  siteName: document.getElementById('siteName'),
  siteMeta: document.getElementById('siteMeta'),
  currentStats: document.getElementById('currentStats'),
  verdicts: document.getElementById('verdicts'),
  thermalBlock: document.getElementById('thermalBlock'),
  thermalMeta: document.getElementById('thermalMeta'),
  thermalStats: document.getElementById('thermalStats'),
  nearbyBlock: document.getElementById('nearbyBlock'),
  nearbyList: document.getElementById('nearbyList'),
  forecastBlock: document.getElementById('forecastBlock'),
  forecastBody: document.getElementById('forecastBody'),
  linksBlock: document.getElementById('linksBlock'),
  linksList: document.getElementById('linksList'),
  disclaimerBox: document.getElementById('disclaimerBox'),
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
 * lokacija") izloči pokvarjene privzete koordinate (altitude 0) in
 * zastarele meritve, glej SKYTECH_API_ISSUES.md.
 */
function computeNearbyStationsForPoint(stations, lat, lon) {
  if (!Array.isArray(stations)) return [];
  return stations
    .filter((s) => typeof s.lat === 'number' && typeof s.lon === 'number' && s.altitude !== 0 && s.measurement)
    .map((s) => {
      const m = s.measurement;
      const ageMinutes = m.time ? Math.round((Date.now() - new Date(m.time).getTime()) / 60000) : null;
      return {
        distanceKm: Math.round(haversineKm(lat, lon, s.lat, s.lon) * 10) / 10,
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

function pillClass(color) {
  return `verdict verdict-${color || 'gray'}`;
}

function formatDayLabel(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('sl-SI', { weekday: 'short', day: 'numeric', month: 'numeric' });
}

function renderCurrent(data) {
  el.siteName.textContent = data.myLocationMode ? '📍 Tvoja lokacija' : data.site.name;
  const regionText = data.myLocationMode
    ? `najbližji vir ARSO napovedi: ${data.site.name} (${data.distanceKm} km)`
    : `${data.site.region} · ${data.site.elevation} m n.v.`;
  el.siteMeta.textContent = regionText;

  const sk = data.skytech;
  const firstEntry = data.forecast[0] && data.forecast[0].timeline[0];
  const useLive = sk && !data.myLocationMode && sk.hasMeasurement;
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
  if (dirRating && !data.myLocationMode) verdictParts.push(`<span class="${pillClass(dirRating.color)}">${dirRating.label}</span>`);
  el.verdicts.innerHTML = verdictParts.join('') + `<p class="meta" style="margin-top:10px;">Vir: ${source}</p>`;

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
    <li>
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
  el.forecastBody.innerHTML = data.forecast
    .map((day) => {
      const temps = day.timeline.map((e) => e.temperatureC).filter((t) => t !== null && t !== undefined);
      const winds = day.timeline.map((e) => e.windSpeedKmh).filter((w) => w !== null && w !== undefined);
      const tMin = temps.length ? Math.round(Math.min(...temps)) : null;
      const tMax = temps.length ? Math.round(Math.max(...temps)) : null;
      const wMax = winds.length ? Math.round(Math.max(...winds)) : null;
      const rain = day.timeline.some((e) => e.precipitationMm !== null && e.precipitationMm !== undefined && e.precipitationMm > 1);
      const xc = day.thermalWindow && day.thermalWindow.xc;
      return `
        <tr>
          <td>${formatDayLabel(day.date)}</td>
          <td>${tMin !== null ? tMin + '–' + tMax + '°C' : '—'}</td>
          <td>${wMax !== null ? 'do ' + wMax + ' km/h' : '—'}</td>
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

async function showMyLocationWeather(nearest) {
  setStatus('Nalagam vremenske podatke…');
  try {
    const res = await fetch(`data/weather/${nearest.site.id}.json`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Podatki še niso na voljo.');
    const data = await res.json();

    data.distanceKm = nearest.distanceKm;
    data.myLocationMode = true;

    const allStations = await loadAllStations();
    data.nearbyStations = computeNearbyStationsForPoint(allStations, state.userCoords.lat, state.userCoords.lon);

    const thermalRegions = await loadThermalRegions();
    const nearestThermalRegion = computeNearestThermalRegion(thermalRegions, state.userCoords.lat, state.userCoords.lon);
    if (nearestThermalRegion) data.thermalForecastArso = nearestThermalRegion;

    renderAll(data);
    setStatus(null);
  } catch (err) {
    setStatus('Napaka pri nalaganju podatkov: ' + err.message, 'error');
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
      state.userCoords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
      const nearest = findNearestSite(state.userCoords.lat, state.userCoords.lon);
      if (nearest.site) {
        el.siteSelect.value = nearest.site.id;
        showMyLocationWeather(nearest);
      } else {
        setStatus('Ni najdenega bližnjega vzletišča.', 'error');
      }
    },
    () => setStatus('Dostop do lokacije zavrnjen ali ni na voljo.', 'error'),
    { enableHighAccuracy: true, timeout: 10000 }
  );
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
