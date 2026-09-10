'use strict';

/**
 * Frontend bere izključno statične JSON datoteke iz /data/ – tako deluje
 * enako na GitHub Pages (brez strežnika) kot pod lokalnim Express strežnikom.
 * Podatke v /data/ osveži `npm run build:data` (ročno ali prek GitHub Action).
 */

const state = {
  sites: [],
  currentSiteId: null,
  userCoords: null,
  weather: null,
  activeDayIndex: 0,
};

const el = {
  siteSelect: document.getElementById('siteSelect'),
  distanceInfo: document.getElementById('distanceInfo'),
  locateBtn: document.getElementById('locateBtn'),
  statusBox: document.getElementById('statusBox'),
  currentCard: document.getElementById('currentCard'),
  currentSiteName: document.getElementById('currentSiteName'),
  currentSiteMeta: document.getElementById('currentSiteMeta'),
  currentGrid: document.getElementById('currentGrid'),
  nearbyCard: document.getElementById('nearbyCard'),
  nearbyContent: document.getElementById('nearbyContent'),
  forecastSection: document.getElementById('forecastSection'),
  dayTabs: document.getElementById('dayTabs'),
  xcSummary: document.getElementById('xcSummary'),
  timeline: document.getElementById('timeline'),
  linksCard: document.getElementById('linksCard'),
  linksList: document.getElementById('linksList'),
  disclaimerBox: document.getElementById('disclaimerBox'),
  updatedInfo: document.getElementById('updatedInfo'),
};

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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

async function loadSites() {
  const res = await fetch('data/sites.json', { cache: 'no-store' });
  if (!res.ok) throw new Error('Seznama vzletišč ni bilo mogoče naložiti.');
  state.sites = await res.json();
  el.siteSelect.innerHTML = state.sites
    .map((s) => {
      const badge = s.liveStation && s.liveStation.confirmed ? '📡' : '📊';
      return `<option value="${s.id}">${badge} ${s.name} — ${s.region}</option>`;
    })
    .join('');
}

async function loadMeta() {
  try {
    const res = await fetch('data/meta.json', { cache: 'no-store' });
    if (!res.ok) return;
    const meta = await res.json();
    if (meta.generatedAt && el.updatedInfo) {
      const d = new Date(meta.generatedAt);
      el.updatedInfo.textContent = 'Podatki osveženi: ' + d.toLocaleString('sl-SI');
    }
  } catch (_) {
    /* ni kritično, spregledamo */
  }
}

function requestGeolocation() {
  if (!('geolocation' in navigator)) {
    setStatus('Brskalnik ne podpira GPS lokacije. Izberite vzletišče ročno.', 'error');
    return;
  }
  setStatus('Iščem tvojo lokacijo…');
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      state.userCoords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
      setStatus(null);
      const nearest = findNearestSite(state.userCoords.lat, state.userCoords.lon);
      if (nearest.site) {
        el.siteSelect.value = nearest.site.id;
        loadWeatherForSite(nearest.site.id);
      }
    },
    (err) => {
      setStatus('Lokacije ni bilo mogoče pridobiti (' + err.message + '). Izberite vzletišče ročno.', 'error');
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 5 * 60 * 1000 }
  );
}

async function loadWeatherForSite(siteId) {
  setStatus('Nalagam vremenske podatke…');
  try {
    const res = await fetch(`data/weather/${siteId}.json`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Podatki za to vzletišče še niso na voljo.');
    const data = await res.json();

    if (state.userCoords) {
      data.distanceKm = Math.round(
        haversineKm(state.userCoords.lat, state.userCoords.lon, data.site.lat, data.site.lon) * 10
      ) / 10;
    }

    state.currentSiteId = siteId;
    renderWeather(data);
    setStatus(null);
  } catch (err) {
    setStatus('Napaka pri nalaganju podatkov: ' + err.message, 'error');
  }
}

function pillClass(color) {
  return `pill pill-${color || 'gray'}`;
}

function metricBox(label, value, pill) {
  return `
    <div class="metric">
      <div class="label">${label}</div>
      <div class="value">${value}</div>
      ${pill ? `<div class="${pillClass(pill.color)}">${pill.label}</div>` : ''}
    </div>
  `;
}

function renderCurrent(data) {
  const firstEntry = data.forecast[0] && data.forecast[0].timeline[0];
  el.currentSiteName.textContent = `${data.site.name} (${data.site.elevation} m)`;
  el.currentSiteMeta.textContent = data.distanceKm != null
    ? `${data.site.region} · ${data.distanceKm} km od tvoje lokacije`
    : data.site.region;

  if (!firstEntry) {
    el.currentGrid.innerHTML = `<p class="muted">Trenutno ni podatkov ARSO napovedi za to vzletišče.</p>`;
    el.currentCard.hidden = false;
    return;
  }

  const p = firstEntry.paragliding;
  el.currentGrid.innerHTML = [
    metricBox('Temperatura', firstEntry.temperatureC != null ? `${firstEntry.temperatureC}°C` : '—'),
    metricBox(
      'Veter',
      firstEntry.windSpeedKmh != null
        ? `${firstEntry.windSpeedKmh} km/h${firstEntry.windDirection ? ' ' + firstEntry.windDirection : ''}`
        : '—',
      p.wind
    ),
    metricBox('Smer vs. vzletišče', p.launchAlignment.octant || '—', p.launchAlignment),
    metricBox('Sunki vetra', firstEntry.windGustKmh != null ? `${firstEntry.windGustKmh} km/h` : '—'),
    metricBox('Baza oblakov', p.cloudBaseM != null ? `~${p.cloudBaseM} m n.m.` : '—'),
    metricBox('Termika', firstEntry.cloudCover || '—', p.thermal),
    metricBox('Padavine', firstEntry.precipitationMm != null ? `${firstEntry.precipitationMm} mm/3h` : '—'),
  ].join('');
  el.currentCard.hidden = false;

  if (data.site.launchWindDirections) {
    el.currentSiteMeta.textContent += ` · Primerna smer vzleta: ${data.site.launchWindDirections.join(', ')}`;
  }

  const ls = data.site.liveStation;
  if (ls && ls.confirmed) {
    el.currentSiteMeta.textContent += ` · 📡 Živa postaja: ${ls.phone}`;
  } else {
    el.currentSiteMeta.textContent += ' · 📊 Brez potrjene žive postaje (le napoved)';
  }
}

function renderNearby(data) {
  if (!data.nearby) {
    el.nearbyCard.hidden = true;
    return;
  }
  const { rain, hail } = data.nearby;
  const parts = [];
  if (rain) {
    parts.push(metricBox('Radar - padavine', rain.rain_mmph != null ? `${rain.rain_mmph} mm/h` : 'ni zaznanih'));
  }
  if (hail) {
    parts.push(metricBox('Verjetnost toče', hail.hail_level != null ? `${hail.hail_level}%` : '—'));
  }
  if (parts.length === 0) {
    el.nearbyCard.hidden = true;
    return;
  }
  el.nearbyContent.innerHTML = parts.join('');
  el.nearbyCard.hidden = false;
}

function renderForecast(data) {
  if (!data.forecast || data.forecast.length === 0) {
    el.forecastSection.hidden = true;
    return;
  }
  state.activeDayIndex = 0;
  el.dayTabs.innerHTML = data.forecast
    .map((day, i) => `<button class="day-tab${i === 0 ? ' active' : ''}" data-index="${i}">${formatDayLabel(day.date)}</button>`)
    .join('');
  renderTimeline(data.forecast[0]);
  el.forecastSection.hidden = false;

  el.dayTabs.querySelectorAll('.day-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.index, 10);
      state.activeDayIndex = idx;
      el.dayTabs.querySelectorAll('.day-tab').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      renderTimeline(data.forecast[idx]);
    });
  });
}

function formatDayLabel(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('sl-SI', { weekday: 'short', day: 'numeric', month: 'numeric' });
}

function formatTime(timeStr) {
  if (!timeStr) return '—';
  const d = new Date(timeStr);
  if (Number.isNaN(d.getTime())) return timeStr;
  return d.toLocaleTimeString('sl-SI', { hour: '2-digit', minute: '2-digit' });
}

function renderXcSummary(day) {
  const w = day.thermalWindow;
  if (!w) {
    el.xcSummary.textContent = 'Ni dovolj podatkov za oceno termalnega okna.';
    return;
  }
  const windowText = w.startHour != null
    ? `Okvirno termalno okno: ${String(w.startHour).padStart(2, '0')}:00–${String(w.endHour).padStart(2, '0')}:00 (~${w.durationHours} h).`
    : 'Termalno okno danes verjetno zelo kratko ali odsotno.';
  el.xcSummary.innerHTML = `${windowText} <span class="${pillClass(w.xc.color)}">${w.xc.label}</span>`;
}

function renderTimeline(day) {
  renderXcSummary(day);
  if (!day || !day.timeline || day.timeline.length === 0) {
    el.timeline.innerHTML = '<p class="muted">Ni podatkov za ta dan.</p>';
    return;
  }
  el.timeline.innerHTML = day.timeline
    .map((entry) => {
      const p = entry.paragliding;
      return `
        <div class="timeline-row">
          <div class="timeline-time">${formatTime(entry.time)}</div>
          <div class="timeline-detail">
            ${entry.temperatureC != null ? entry.temperatureC + '°C' : '—'} ·
            ${entry.windSpeedKmh != null ? entry.windSpeedKmh + ' km/h' : '—'}${entry.windDirection ? ' ' + entry.windDirection : ''}
            ${entry.windGustKmh != null ? ' (sunki ' + entry.windGustKmh + ')' : ''} ·
            ${entry.cloudCover || ''}
          </div>
          <div class="${pillClass(p.wind.color)}">${p.wind.label}</div>
          ${p.launchAlignment.known ? `<div class="${pillClass(p.launchAlignment.color)}">${p.launchAlignment.octant}</div>` : ''}
        </div>
      `;
    })
    .join('');
}

function renderLinks(data) {
  const links = data.links;
  const ls = data.site.liveStation;
  const items = [
    { href: links.arsoForecastPage, label: `ARSO – podrobna napoved (${data.site.name})` },
    { href: links.arsoAviation, label: 'ARSO – letalsko vreme (GAFOR, SIGWX)' },
    { href: links.arsoRadar, label: 'ARSO – radarska slika padavin' },
  ];
  if (ls && ls.confirmed && ls.phone) {
    items.push({
      href: `tel:${ls.phone.replace(/\s+/g, '')}`,
      label: `📡 Živa postaja – telefonski odzivnik (${ls.phone})`,
    });
  }
  items.push({
    href: links.skytech,
    label: 'SkyTech.si – domača stran (brez javnega seznama postaj; preverjeno 2026-09-10)',
  });
  items.push({ href: links.windAloft, label: 'Veter na višini (Windy.com, izberi nivo/hPa)' });

  el.linksList.innerHTML = items
    .map((i) => `<li><a href="${i.href}" target="_blank" rel="noopener">${i.label} ↗</a></li>`)
    .join('');

  if (ls && ls.note) {
    el.linksList.innerHTML += `<li class="muted small" style="padding:0 4px;">${ls.note}</li>`;
  }
  el.linksCard.hidden = false;
}

function renderSources(data) {
  const problems = [];
  if (!data.sources.arso.ok) problems.push('ARSO napoved ni bila na voljo ob zadnji osvežitvi.');
  if (!data.sources.opendata.ok) problems.push('opendata.si podatki niso bili na voljo ob zadnji osvežitvi.');
  if (problems.length > 0) {
    setStatus(problems.join(' '), 'error');
  }
}

function renderWeather(data) {
  state.weather = data;
  renderCurrent(data);
  renderNearby(data);
  renderForecast(data);
  renderLinks(data);
  el.disclaimerBox.textContent = data.disclaimer;
  el.disclaimerBox.hidden = false;
  renderSources(data);
}

el.locateBtn.addEventListener('click', requestGeolocation);
el.siteSelect.addEventListener('change', () => loadWeatherForSite(el.siteSelect.value));

(async function init() {
  try {
    await loadSites();
    loadMeta();
    if (state.sites.length > 0) {
      el.siteSelect.value = state.sites[0].id;
      await loadWeatherForSite(state.sites[0].id);
    }
    requestGeolocation();
  } catch (err) {
    setStatus('Napaka pri nalaganju aplikacije: ' + err.message, 'error');
  }
})();
