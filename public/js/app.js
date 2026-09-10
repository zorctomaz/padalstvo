'use strict';

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
  timeline: document.getElementById('timeline'),
  linksCard: document.getElementById('linksCard'),
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

async function loadSites() {
  const res = await fetch('/api/sites');
  const data = await res.json();
  state.sites = data.sites;
  el.siteSelect.innerHTML = state.sites
    .map((s) => `<option value="${s.id}">${s.name} — ${s.region}</option>`)
    .join('');
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
      loadWeatherByCoords(state.userCoords);
    },
    (err) => {
      setStatus('Lokacije ni bilo mogoče pridobiti (' + err.message + '). Izberite vzletišče ročno.', 'error');
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 5 * 60 * 1000 }
  );
}

async function loadWeatherByCoords(coords) {
  setStatus('Nalagam vremenske podatke…');
  try {
    const res = await fetch(`/api/weather?lat=${coords.lat}&lon=${coords.lon}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Napaka strežnika');
    state.currentSiteId = data.site.id;
    el.siteSelect.value = data.site.id;
    renderWeather(data);
    setStatus(null);
  } catch (err) {
    setStatus('Napaka pri nalaganju podatkov: ' + err.message, 'error');
  }
}

async function loadWeatherBySite(siteId) {
  setStatus('Nalagam vremenske podatke…');
  try {
    const coordsQuery = state.userCoords
      ? `&lat=${state.userCoords.lat}&lon=${state.userCoords.lon}`
      : '';
    const res = await fetch(`/api/weather?siteId=${siteId}${coordsQuery}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Napaka strežnika');
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
    metricBox('Sunki vetra', firstEntry.windGustKmh != null ? `${firstEntry.windGustKmh} km/h` : '—'),
    metricBox('Baza oblakov', p.cloudBaseM != null ? `~${p.cloudBaseM} m n.m.` : '—'),
    metricBox('Termika', firstEntry.cloudCover || '—', p.thermal),
    metricBox('Padavine', firstEntry.precipitationMm != null ? `${firstEntry.precipitationMm} mm/3h` : '—'),
  ].join('');
  el.currentCard.hidden = false;
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

function renderTimeline(day) {
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
        </div>
      `;
    })
    .join('');
}

function renderLinks(data) {
  const links = data.links;
  const items = [
    { href: links.arsoForecastPage, label: `ARSO – podrobna napoved (${data.site.name})` },
    { href: links.arsoAviation, label: 'ARSO – letalsko vreme (GAFOR, SIGWX)' },
    { href: links.arsoRadar, label: 'ARSO – radarska slika padavin' },
    { href: links.skytech, label: 'SkyTech.si – žive vremenske postaje' },
  ];
  el.linksList.innerHTML = items
    .map((i) => `<li><a href="${i.href}" target="_blank" rel="noopener">${i.label} ↗</a></li>`)
    .join('');
  el.linksCard.hidden = false;
}

function renderSources(data) {
  const problems = [];
  if (!data.sources.arso.ok) problems.push('ARSO napoved trenutno ni na voljo.');
  if (!data.sources.opendata.ok) problems.push('opendata.si podatki trenutno niso na voljo.');
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
el.siteSelect.addEventListener('change', () => loadWeatherBySite(el.siteSelect.value));

(async function init() {
  await loadSites();
  if (state.sites.length > 0) {
    el.siteSelect.value = state.sites[0].id;
    await loadWeatherBySite(state.sites[0].id);
  }
  requestGeolocation();
})();
