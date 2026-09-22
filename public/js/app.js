'use strict';

/**
 * Frontend bere izključno statične JSON datoteke iz /data/ – tako deluje
 * enako na GitHub Pages (brez strežnika) kot pod lokalnim Express strežnikom.
 * Podatke v /data/ osveži `npm run build:data` (ročno ali prek GitHub Action).
 */

const WIND_UNITS = {
  kmh: { label: 'km/h', factor: 1 },
  ms: { label: 'm/s', factor: 1 / 3.6 },
  mph: { label: 'mph', factor: 1 / 1.60934 },
  kn: { label: 'kn', factor: 1 / 1.852 },
};
const WIND_UNIT_STORAGE_KEY = 'padalstvo-vreme:windUnit';

function loadStoredWindUnit() {
  try {
    const stored = localStorage.getItem(WIND_UNIT_STORAGE_KEY);
    return stored && WIND_UNITS[stored] ? stored : 'kmh';
  } catch (_) {
    return 'kmh';
  }
}

const state = {
  sites: [],
  currentSiteId: null,
  userCoords: null,
  weather: null,
  activeDayIndex: 0,
  windUnit: loadStoredWindUnit(),
  myLocationMode: false,
  allStations: null,
  thermalRegions: null,
  arsoLocations: null,
  arsoLocationForecastCache: new Map(),
  nightOverride: false,
  stationHistoryCache: new Map(),
  currentHistoryStationId: null,
};

const el = {
  siteSelect: document.getElementById('siteSelect'),
  distanceInfo: document.getElementById('distanceInfo'),
  locateBtn: document.getElementById('locateBtn'),
  nightOverrideBtn: document.getElementById('nightOverrideBtn'),
  nightBanner: document.getElementById('nightBanner'),
  unitSelect: document.getElementById('unitSelect'),
  statusBox: document.getElementById('statusBox'),
  skytechCard: document.getElementById('skytechCard'),
  skytechMeta: document.getElementById('skytechMeta'),
  skytechGrid: document.getElementById('skytechGrid'),
  nearbyStationsCard: document.getElementById('nearbyStationsCard'),
  nearbyStationsTitle: document.getElementById('nearbyStationsTitle'),
  nearbyStationsIntro: document.getElementById('nearbyStationsIntro'),
  nearbyStationsList: document.getElementById('nearbyStationsList'),
  currentCard: document.getElementById('currentCard'),
  currentSiteName: document.getElementById('currentSiteName'),
  currentSiteMeta: document.getElementById('currentSiteMeta'),
  currentGrid: document.getElementById('currentGrid'),
  arsoThermalCard: document.getElementById('arsoThermalCard'),
  arsoThermalMeta: document.getElementById('arsoThermalMeta'),
  arsoThermalList: document.getElementById('arsoThermalList'),
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
  versionInfo: document.getElementById('versionInfo'),
  historyModalOverlay: document.getElementById('historyModalOverlay'),
  historyModalTitle: document.getElementById('historyModalTitle'),
  historyModalSnapshot: document.getElementById('historyModalSnapshot'),
  historyModalBody: document.getElementById('historyModalBody'),
  historyModalClose: document.getElementById('historyModalClose'),
  mapPickerBtn: document.getElementById('mapPickerBtn'),
  mapModalOverlay: document.getElementById('mapModalOverlay'),
  mapModalClose: document.getElementById('mapModalClose'),
  mapContainer: document.getElementById('mapContainer'),
  mapCoordsLabel: document.getElementById('mapCoordsLabel'),
  mapConfirmBtn: document.getElementById('mapConfirmBtn'),
};

/**
 * Približen izračun sončnega vzhoda/zahoda (NOAA poenostavljena formula,
 * natančnost ~1-2 min) za dano koordinato in datum. Uporabljeno za nočno
 * zatemnitev strani - jadralno padalstvo (VFR, dnevno letenje) se sme
 * uradno izvajati le med sončnim vzhodom in zahodom, zato je uporaba
 * fiksnih ur (npr. "6:00-21:00") skozi leto preveč netočna.
 * Vrne { sunrise, sunset } kot Date objekta (UTC, zato primerljiva z
 * `new Date()` ne glede na časovni pas brskalnika), ali { alwaysDay:
 * true } / { alwaysNight: true } za polarni dan/noč (ne velja za
 * Slovenijo, a formula naj bo splošno pravilna).
 */
function getSunTimes(date, lat, lon) {
  const rad = Math.PI / 180;
  const deg = 180 / Math.PI;

  const dayStartUTC = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const yearStartUTC = Date.UTC(date.getUTCFullYear(), 0, 1);
  const dayOfYear = Math.floor((dayStartUTC - yearStartUTC) / 86400000) + 1;

  const b = rad * (360 / 365) * (dayOfYear - 81);
  const decl = 23.44 * rad * Math.sin(b);
  const eqTimeMin = 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);

  const latRad = lat * rad;
  const cosHourAngle =
    (Math.sin(-0.83 * rad) - Math.sin(latRad) * Math.sin(decl)) /
    (Math.cos(latRad) * Math.cos(decl));

  if (cosHourAngle > 1) return { sunrise: null, sunset: null, alwaysNight: true };
  if (cosHourAngle < -1) return { sunrise: null, sunset: null, alwaysDay: true };

  const hourAngleDeg = Math.acos(cosHourAngle) * deg;
  const solarNoonUTCMin = 720 - 4 * lon - eqTimeMin;
  const sunriseUTCMin = solarNoonUTCMin - 4 * hourAngleDeg;
  const sunsetUTCMin = solarNoonUTCMin + 4 * hourAngleDeg;

  return {
    sunrise: new Date(dayStartUTC + sunriseUTCMin * 60000),
    sunset: new Date(dayStartUTC + sunsetUTCMin * 60000),
  };
}

function currentCoordsForSun() {
  if (state.userCoords) return state.userCoords;
  if (state.weather && state.weather.site) return state.weather.site;
  return null;
}

/**
 * Preveri, ali je trenutno (glede na sistemsko uro brskalnika) noč na
 * relevantni lokaciji, in ustrezno zatemni #app. Uporabnik lahko
 * zatemnitev začasno izklopi z gumbom "svetilka" (state.nightOverride) -
 * to se ne shranjuje med obiski, saj gre za varnostni opomnik, ne
 * nastavitev.
 */
function updateNightMode() {
  const coords = currentCoordsForSun();
  if (!coords || coords.lat == null || coords.lon == null) {
    document.body.classList.remove('is-night');
    el.nightBanner.hidden = true;
    el.nightOverrideBtn.hidden = true;
    return;
  }

  const now = new Date();
  const sun = getSunTimes(now, coords.lat, coords.lon);
  const isNight = sun.alwaysNight || (!sun.alwaysDay && (now < sun.sunrise || now > sun.sunset));

  el.nightOverrideBtn.hidden = !isNight;
  if (!isNight) state.nightOverride = false;

  document.body.classList.toggle('is-night', isNight && !state.nightOverride);
  el.nightOverrideBtn.classList.toggle('active', isNight && state.nightOverride);

  if (!isNight) {
    el.nightBanner.hidden = true;
    return;
  }
  el.nightBanner.hidden = false;
  el.nightBanner.textContent = state.nightOverride
    ? '🔦 Zatemnitev začasno izklopljena – ponoči se uradno (VFR, dnevno letenje) še vedno ne sme leteti.'
    : '🌙 Trenutno je noč – uradno (VFR, dnevno letenje) se ne sme leteti, zato so podatki spodaj zatemnjeni. Klikni 🔦 zgoraj, če jih vseeno želiš prebrati.';
}

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

/**
 * Zrcali oceno vetra/smeri iz src/paragliding.js (rateWind,
 * rateSkytechDirection), da lahko za poljubno GPS točko (ne le za 12
 * uradnih vzletišč) v brskalniku izračunamo bližnje žive postaje brez
 * dodatnega strežniškega klica - podatki o vseh postajah so že javno
 * objavljeni v data/skytech-stations.json (brez API tokena).
 */
function rateWindClient(windSpeedKmh, windGustKmh) {
  if (windSpeedKmh === null || windSpeedKmh === undefined) {
    return { level: 'unknown', label: 'Ni podatka o vetru', color: 'gray' };
  }
  const gustSpread = windGustKmh != null ? windGustKmh - windSpeedKmh : 0;
  if (windSpeedKmh > 30) return { level: 'unfly', label: 'Neprimerno za letenje (premočan veter)', color: 'red' };
  if (windSpeedKmh > 20 || gustSpread > 15) return { level: 'caution', label: 'Močan/sunkovit veter – samo izkušeni piloti', color: 'orange' };
  if (windSpeedKmh >= 8) return { level: 'good', label: 'Ugodno za letenje', color: 'green' };
  return { level: 'light', label: 'Šibek/miren veter', color: 'blue' };
}

function rateSkytechDirectionClient(station, compassDirection) {
  if (!station || !compassDirection) return { known: false, label: 'Ni podatka o smeri', color: 'gray' };
  if (station.directionsGreen && station.directionsGreen.includes(compassDirection)) {
    return { known: true, label: `Smer (${compassDirection}) ustreza postaji`, color: 'green' };
  }
  if (station.directionsYellow && station.directionsYellow.includes(compassDirection)) {
    return { known: true, label: `Smer (${compassDirection}) mejna`, color: 'orange' };
  }
  if (station.directionsRed && station.directionsRed.includes(compassDirection)) {
    return { known: true, label: `Smer (${compassDirection}) neprimerna`, color: 'red' };
  }
  return { known: false, label: `Smer (${compassDirection}) ni razvrščena`, color: 'gray' };
}

const NEARBY_MAX_DISTANCE_KM = 25;
const NEARBY_MAX_COUNT = 6;
const NEARBY_MAX_AGE_MINUTES = 24 * 60;

/**
 * Enako kot summarizeNearbyStations v src/paragliding.js, a za poljubno
 * (lat, lon) - uporabljeno za "Moja lokacija", kjer uporabnik ni nujno
 * na uradnem vzletišču. Izloči postaje z altitude 0 IN postaje s
 * starostjo meritve nad 24h (glej SKYTECH_API_ISSUES.md) - precej
 * neaktivnih SkyTech postaj namesto manjkajočih koordinat vrača skupno
 * privzeto točko (npr. lat:46, lon:15 - "Letališče Ptuj", "Žetale-Log"
 * in druge, v resnici stotine km stran), ki je pri nas po naključju
 * blizu Šentrupertu; starost meritve je zanesljivejši splošen signal
 * od same nadmorske višine.
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
        altitude: s.altitude ?? null,
        stationId: s.id,
        stationName: s.name,
        hasMeasurement: true,
        time: m.time,
        ageMinutes,
        windSpeedKmh: m.windSpeedKmh,
        windGustKmh: m.windGustKmh,
        windDirection: m.windDirection,
        temperatureC: m.temperatureC,
        wind: rateWindClient(m.windSpeedKmh, m.windGustKmh),
        directionRating: rateSkytechDirectionClient(s, m.windDirection),
      };
    })
    .filter((s) =>
      s.distanceKm <= NEARBY_MAX_DISTANCE_KM &&
      s.ageMinutes != null &&
      s.ageMinutes <= NEARBY_MAX_AGE_MINUTES
    )
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, NEARBY_MAX_COUNT);
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

/**
 * Najbližja od 6 ARSO letalskih regij za poljubno GPS točko - NE sme si
 * izposoditi regije najbližjega URADNEGA vzletišča (glej opombo v
 * src/arso-thermal.js), ker je lahko v drugi regiji kot uporabnikova
 * dejanska točka (npr. Trebnje je najbliže Kumu, a Kum je dodeljen
 * Štajerski, medtem ko je Trebnje dejansko v Dolenjski).
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
 * Najbližji ARSO-podprt kraj (glej src/arso-locations.js) za poljubno GPS
 * točko - NE sme si izposoditi kraja, dodeljenega najbližjemu URADNEMU
 * vzletišču (site.arsoLocation je izbran za to vzletišče, ni nujno
 * najbližji poljubni drugi točki v okolici - isti vzorec popravka kot pri
 * computeNearestThermalRegion zgoraj).
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
    if (el.versionInfo) {
      el.versionInfo.textContent = meta.version ? `Različica: ${meta.version}` : '';
    }
  } catch (_) {
    /* ni kritično, spregledamo */
  }
}

/**
 * Skupna pot za "uporabi to GPS točko kot mojo lokacijo" - uporabljena
 * tako pri pravem GPS-u (requestGeolocation) kot pri ročni izbiri na
 * zemljevidu (openMapPicker/potrditev).
 */
function useLocation(lat, lon, altitude, station) {
  state.userCoords = { lat, lon, altitude: altitude ?? null };
  setStatus(null);
  const nearest = findNearestSite(lat, lon);
  if (nearest.site) {
    el.siteSelect.value = nearest.site.id;
    // Končno besedilo (z natančnim virom ARSO napovedi) se izpiše šele v
    // showMyLocationWeather, ko je znan najbližji ARSO-podprt kraj - do
    // takrat prikažemo le koordinate.
    el.distanceInfo.textContent = `📍 Tvoja lokacija: ${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    showMyLocationWeather(nearest, station);
  } else {
    el.distanceInfo.textContent =
      `📍 Tvoja lokacija: ${lat.toFixed(4)}, ${lon.toFixed(4)} ` +
      `– ni znanih vzletišč v bližini.`;
  }
}

function requestGeolocation() {
  if (!('geolocation' in navigator)) {
    setStatus('Brskalnik ne podpira GPS lokacije. Izberite vzletišče ročno ali na zemljevidu.', 'error');
    return;
  }
  setStatus('Iščem tvojo lokacijo…');
  navigator.geolocation.getCurrentPosition(
    (pos) => useLocation(pos.coords.latitude, pos.coords.longitude, pos.coords.altitude),
    (err) => {
      setStatus('Lokacije ni bilo mogoče pridobiti (' + err.message + '). Izberite vzletišče ročno ali na zemljevidu.', 'error');
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 5 * 60 * 1000 }
  );
}

/**
 * Prikaže napoved za TOČNO GPS lokacijo uporabnika, ne za "vzletišče
 * nearest.site" kot tako - vzletiščna ARSO/opendata.si napoved (mesto
 * je edini vir, ki ga ARSO podpira) je zgolj regijski približek, žive
 * postaje v bližini pa se preračunajo neposredno iz uporabnikovih
 * koordinat, ne iz koordinat najbližjega vzletišča. Prikaz zato ne
 * predpostavlja, da je uporabnik na uradnem vzletišču, in ne prikazuje
 * njegove telefonske odzivniške številke/primerne smeri vzleta, ki
 * veljata samo za to vzletišče.
 *
 * Če je uporabnik na zemljevidu izbral konkretno živo postajo (station),
 * njeno meritev prikažemo kot glavni "trenutno" podatek namesto splošne
 * ARSO napovedi za najbližje vzletišče - podatek že imamo, zakaj bi
 * uporabniku namesto tega prikazali manj natančen regijski približek.
 */
async function showMyLocationWeather(nearest, station) {
  setStatus('Nalagam vremenske podatke…');
  try {
    const res = await fetch(`data/weather/${nearest.site.id}.json`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Podatki še niso na voljo.');
    const data = await res.json();

    data.distanceKm = nearest.distanceKm;
    data.myLocationMode = true;
    data.userCoords = { ...state.userCoords };

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

    // Napoved termike mora ustrezati uporabnikovi DEJANSKI točki, ne
    // regiji, dodeljeni najbližjemu uradnemu vzletišču (glej opombo pri
    // computeNearestThermalRegion) - zato jo tu preračunamo/prepišemo.
    const thermalRegions = await loadThermalRegions();
    const nearestThermalRegion = computeNearestThermalRegion(
      thermalRegions,
      state.userCoords.lat,
      state.userCoords.lon
    );
    if (nearestThermalRegion) data.thermalForecastArso = nearestThermalRegion;

    // Uradna ARSO napoved (temperatura/veter/padavine/večdnevna tabela)
    // mora ustrezati uporabnikovi DEJANSKI točki, ne najbližjemu URADNEMU
    // vzletišču - zato jo tu prepišemo z napovedjo za najbližji ARSO-podprt
    // kraj (glej computeNearestArsoLocation zgoraj in src/arso-locations.js).
    const arsoLocations = await loadArsoLocations();
    const nearestArso = computeNearestArsoLocation(arsoLocations, state.userCoords.lat, state.userCoords.lon);
    let arsoSourceLabel = `${nearest.site.name} (${nearest.distanceKm} km)`;
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
        arsoSourceLabel = `${nearestArso.location.name} (${nearestArso.distanceKm} km)`;
      }
    }
    el.distanceInfo.textContent = station
      ? `📍 Tvoja lokacija: ${state.userCoords.lat.toFixed(4)}, ${state.userCoords.lon.toFixed(4)} ` +
        `· izbrana živa postaja: ${station.name} · ARSO napoved: ${arsoSourceLabel}`
      : `📍 Tvoja lokacija: ${state.userCoords.lat.toFixed(4)}, ${state.userCoords.lon.toFixed(4)} ` +
        `· najbližji vir ARSO napovedi: ${arsoSourceLabel}`;

    state.myLocationMode = true;
    state.currentSiteId = nearest.site.id;
    renderWeather(data);
    setStatus(null);
  } catch (err) {
    setStatus('Napaka pri nalaganju podatkov: ' + err.message, 'error');
  }
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

    state.myLocationMode = false;
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

function formatWind(windSpeedKmh) {
  if (windSpeedKmh === null || windSpeedKmh === undefined) return '—';
  const unit = WIND_UNITS[state.windUnit] || WIND_UNITS.kmh;
  const value = Math.round(windSpeedKmh * unit.factor * 10) / 10;
  return `${value} ${unit.label}`;
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

  if (data.myLocationMode) {
    const coords = data.userCoords;
    el.currentSiteName.textContent = '📍 Tvoja lokacija';
    el.currentSiteMeta.textContent = coords
      ? `${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)}` +
        (coords.altitude != null ? ` · ${Math.round(coords.altitude)} m n.m. (GPS)` : '')
      : '';
    const arsoSourceName = data.arsoLocationName || data.site.name;
    const arsoSourceKm = data.arsoLocationDistanceKm != null ? data.arsoLocationDistanceKm : data.distanceKm;
    el.currentSiteMeta.textContent +=
      ` · napoved je regijski približek (vir: ${arsoSourceName}, ${arsoSourceKm} km stran) – ` +
      'ni nujno uradno vzletišče niti ni v bližini potrjena žive postaje.';
  } else {
    el.currentSiteName.textContent = `${data.site.name} (${data.site.elevation} m)`;
    el.currentSiteMeta.textContent = data.distanceKm != null
      ? `${data.site.region} · ${data.distanceKm} km od tvoje lokacije`
      : data.site.region;
  }

  if (!firstEntry) {
    el.currentGrid.innerHTML = `<p class="muted">Trenutno ni podatkov ARSO napovedi za to lokacijo.</p>`;
    el.currentCard.hidden = false;
    return;
  }

  const p = firstEntry.paragliding;
  const boxes = [
    metricBox('Temperatura', firstEntry.temperatureC != null ? `${firstEntry.temperatureC}°C` : '—'),
    metricBox(
      'Veter',
      firstEntry.windSpeedKmh != null
        ? `${formatWind(firstEntry.windSpeedKmh)}${firstEntry.windDirection ? ' ' + firstEntry.windDirection : ''}`
        : '—',
      p.wind
    ),
  ];
  if (!data.myLocationMode) {
    boxes.push(metricBox('Smer vs. vzletišče', p.launchAlignment.octant || '—', p.launchAlignment));
  }
  boxes.push(
    metricBox('Sunki vetra', formatWind(firstEntry.windGustKmh)),
    metricBox('Baza oblakov', p.cloudBaseM != null ? `~${p.cloudBaseM} m n.m.` : '—'),
    metricBox('Termika', firstEntry.cloudCover || '—', p.thermal),
    metricBox('Padavine', firstEntry.precipitationMm != null ? `${firstEntry.precipitationMm} mm/3h` : '—')
  );
  el.currentGrid.innerHTML = boxes.join('');
  el.currentCard.hidden = false;

  if (data.myLocationMode) return;

  if (data.site.launchWindDirections) {
    const srcLabel = data.site.launchWindDirectionsSource === 'skytech' ? ' (SkyTech)' : '';
    el.currentSiteMeta.textContent += ` · Primerna smer vzleta${srcLabel}: ${data.site.launchWindDirections.join(', ')}`;
  }

  const ls = data.site.liveStation;
  if (ls && ls.confirmed) {
    el.currentSiteMeta.textContent += ` · 📡 Živa postaja: ${ls.phone}`;
  } else {
    el.currentSiteMeta.textContent += ' · 📊 Brez potrjene žive postaje (le napoved)';
  }
}

function renderSkytech(data) {
  if (data.myLocationMode && !data.stationMode) {
    // Dodeljena "glavna" postaja pripada uradnemu vzletišču, ne nujno
    // uporabnikovi natančni točki - v tem načinu je edini relevanten
    // prikaz spodnji seznam "žive postaje v bližini tvoje lokacije",
    // izračunan iz pravih GPS koordinat uporabnika. Izjema: če je
    // uporabnik na zemljevidu izrecno izbral konkretno postajo
    // (data.stationMode), njeno meritev prikažemo tu kot glavni podatek.
    el.skytechCard.hidden = true;
    return;
  }
  const sk = data.skytech;
  if (!sk || !sk.hasMeasurement) {
    el.skytechCard.hidden = true;
    return;
  }
  el.skytechCard.dataset.stationId = sk.stationId;
  el.skytechCard.dataset.stationName = sk.stationName;
  const ageText = sk.ageMinutes != null
    ? (sk.ageMinutes <= 1 ? 'pred manj kot minuto' : `pred ${sk.ageMinutes} min`)
    : '';
  el.skytechMeta.textContent = `Postaja: ${sk.stationName} · Meritev ${ageText}`;
  el.skytechGrid.innerHTML = [
    metricBox(
      'Veter',
      sk.windSpeedKmh != null ? `${formatWind(sk.windSpeedKmh)}${sk.windDirection ? ' ' + sk.windDirection : ''}` : '—',
      sk.wind
    ),
    metricBox('Sunki vetra', formatWind(sk.windGustKmh)),
    metricBox('Smer (SkyTech ocena)', sk.windDirection || '—', sk.directionRating),
    metricBox('Temperatura', sk.temperatureC != null ? `${sk.temperatureC}°C` : '—'),
  ].join('');
  el.skytechCard.hidden = false;

  if (sk.ageMinutes != null && sk.ageMinutes > 30) {
    el.skytechMeta.textContent += ' ⚠️ podatek je star, postaja morda ne poroča';
  }
}

function renderNearbyStations(data) {
  const stations = data.nearbyStations;

  if (data.myLocationMode) {
    el.nearbyStationsTitle.textContent = '📡 Žive vremenske postaje v bližini tvoje lokacije';
    el.nearbyStationsIntro.textContent =
      'Izračunano neposredno iz tvojih GPS koordinat (do 25 km) - ne glede na to, ali je tu uradno vzletišče.';
  } else {
    el.nearbyStationsTitle.textContent = '📡 Druga merilna mesta v bližini';
    el.nearbyStationsIntro.textContent =
      'Niso uradna vzletišča – dodaten vpogled v veter v okolici, kjer nameravaš leteti.';
  }

  if (!stations || stations.length === 0) {
    if (data.myLocationMode) {
      el.nearbyStationsList.innerHTML = '<p class="muted">V bližini (do 25 km) trenutno ni žive SkyTech postaje z meritvijo.</p>';
      el.nearbyStationsCard.hidden = false;
    } else {
      el.nearbyStationsCard.hidden = true;
    }
    return;
  }
  el.nearbyStationsList.innerHTML = stations
    .map((s) => {
      const ageText = s.ageMinutes != null
        ? (s.ageMinutes <= 1 ? 'pred <1 min' : `pred ${s.ageMinutes} min`)
        : '';
      return `
        <div class="timeline-row station-row-clickable" data-station-id="${s.stationId}" data-station-name="${s.stationName}">
          <div class="timeline-time">${s.distanceKm} km</div>
          <div class="timeline-detail">
            ${s.stationName}${s.altitude != null ? ' (' + s.altitude + ' m)' : ''} ·
            ${s.windSpeedKmh != null ? formatWind(s.windSpeedKmh) : '—'}${s.windDirection ? ' ' + s.windDirection : ''}
            ${s.windGustKmh != null ? ' (sunki ' + formatWind(s.windGustKmh) + ')' : ''} · ${ageText}
          </div>
          <div class="${pillClass(s.wind.color)}">${s.wind.label}</div>
        </div>
      `;
    })
    .join('');
  el.nearbyStationsCard.hidden = false;
}

/**
 * Za vsako 3-urno mejo (00:00, 03:00, 06:00 ...) znotraj časovnega
 * razpona `series` poišče indeks NAJBLIŽJE dejanske točke (podatki niso
 * nujno poravnani natanko na mejo). Uporabljeno za oznake na časovni osi
 * grafov (buildLineChartSvg) - deluje enako dobro za ARSO podatke,
 * poravnane natanko na 3h, kot za SkyTech ~10-minutne meritve.
 */
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

/**
 * Preprost SVG graf ene ali dveh časovnih vrst, brez zunanjih knjižnic
 * (aplikacija nima build koraka). `series`/`series2` sta seznama
 * {time, value} v kronološkem vrstnem redu; vrzeli (value === null)
 * prekinejo črto namesto lažnega interpoliranja.
 */
function buildLineChartSvg({
  series,
  series2,
  width = 320,
  height = 130,
  color = '#4f8cff',
  color2 = '#f5a524',
  unit = '',
  yLabelFormatter,
}) {
  const formatY = yLabelFormatter || ((v) => `${Math.round(v * 10) / 10}${unit}`);
  const padding = { top: 14, right: 8, bottom: 20, left: 4 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const allValues = series
    .concat(series2 || [])
    .map((p) => p.value)
    .filter((v) => v !== null && v !== undefined);
  if (allValues.length === 0) {
    return '<p class="muted small">Ni podatkov za graf.</p>';
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
    let needMove = true; // true na začetku in takoj po vrzeli (null vrednost)
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

  // Oznake na časovni osi vsake 3 ure (3.00, 6.00, 9.00 ...), ne le prva/
  // zadnja točka - tako je os berljiva ne glede na razpon grafa (uro
  // gradiva podatkov o postajah, dan ARSO napovedi ipd.). Podatki niso
  // nujno poravnani natanko na 3-urno mejo (npr. SkyTech poroča ~vsakih
  // 10 min) - zato za vsako 3-urno mejo znotraj razpona poiščemo NAJBLIŽJO
  // dejansko točko, namesto da bi filtrirali po `getHours() % 3 === 0`
  // (kar bi pri ~10-minutnih podatkih napačno ujelo VSE točke znotraj cele
  // ure, deljive s 3, ne le eno na mejo).
  const baselineY = height - padding.bottom;
  const tickIdx = pickThreeHourTicks(series);
  const ticks = tickIdx
    .map(({ i, time }) => {
      const x = xAt(i);
      const anchor = x < padding.left + 15 ? 'start' : x > width - padding.right - 15 ? 'end' : 'middle';
      return `
        <line x1="${x.toFixed(1)}" y1="${baselineY.toFixed(1)}" x2="${x.toFixed(1)}" y2="${(baselineY - 4).toFixed(1)}" stroke="#22304a" stroke-width="1" />
        <text x="${x.toFixed(1)}" y="${height - 4}" font-size="9" fill="#9db0cc" text-anchor="${anchor}">${fmtTime(time)}</text>
      `;
    })
    .join('');

  return `
    <svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" preserveAspectRatio="none" class="history-chart">
      <line x1="${padding.left}" y1="${baselineY}" x2="${width - padding.right}" y2="${baselineY}" stroke="#22304a" stroke-width="1" />
      <text x="${padding.left}" y="${padding.top - 4}" font-size="10" fill="#9db0cc">${formatY(max)}</text>
      <text x="${padding.left}" y="${height - padding.bottom - 2}" font-size="10" fill="#9db0cc">${formatY(min)}</text>
      ${series2 ? `<path d="${pathFor(series2)}" fill="none" stroke="${color2}" stroke-width="1.5" stroke-dasharray="3,3" />` : ''}
      <path d="${pathFor(series)}" fill="none" stroke="${color}" stroke-width="2" />
      ${ticks}
    </svg>
  `;
}

function convertWindValue(windSpeedKmh) {
  if (windSpeedKmh === null || windSpeedKmh === undefined) return null;
  const unit = WIND_UNITS[state.windUnit] || WIND_UNITS.kmh;
  return Math.round(windSpeedKmh * unit.factor * 10) / 10;
}

const COMPASS_TO_DEG = { N: 0, NE: 45, E: 90, SE: 135, S: 180, SW: 225, W: 270, NW: 315 };

/**
 * Izbere po en indeks za vsako novo (lokalno) uro v seriji - "ena
 * puščica na uro", ne glede na dejanski interval poročanja postaje
 * (~10 min, ni nujno točno na okroglo minuto).
 */
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

/**
 * Vrstica puščic smeri vetra nad grafom hitrosti - vsaka puščica kaže,
 * OD KOD piha veter (npr. puščica navzgor = veter piha od severa),
 * poravnana z isto časovno osjo kot graf zgoraj.
 */
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
      return `<text x="${cx}" y="${cy}" font-size="13" fill="#9db0cc" text-anchor="middle" transform="rotate(${deg} ${cx} ${cy - 4})">↑</text>`;
    })
    .join('');

  if (!glyphs) return '';
  return `<svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" class="history-chart-arrows">${glyphs}</svg>`;
}

function renderHistoryCharts(history) {
  if (!history || !history.ok || !history.measurements || history.measurements.length === 0) {
    el.historyModalBody.innerHTML = '<p class="muted">Zgodovina za to postajo (zadnjih nekaj ur) ni na voljo.</p>';
    return;
  }
  const m = history.measurements;
  const unitLabel = (WIND_UNITS[state.windUnit] || WIND_UNITS.kmh).label;
  const windSeries = m.map((e) => ({ time: e.time, value: convertWindValue(e.windSpeedKmh) }));
  const gustSeries = m.map((e) => ({ time: e.time, value: convertWindValue(e.windGustKmh) }));
  const dirSeries = m.map((e) => ({ time: e.time, direction: e.windDirection }));
  const tempSeries = m.map((e) => ({ time: e.time, value: e.temperatureC }));
  const hoursSpan = Math.round((m.length * 10) / 6) / 10;

  el.historyModalBody.innerHTML = `
    <div class="chart-block">
      <h4>Veter (${unitLabel})</h4>
      ${buildLineChartSvg({ series: windSeries, series2: gustSeries, color: '#4f8cff', color2: '#f5a524', unit: '' })}
      ${buildDirectionArrowsSvg(dirSeries)}
      <p class="muted small">↑ = smer, od koder piha veter (sever = puščica navzgor), po ena za vsako uro.</p>
      <div class="chart-legend">
        <span><span class="swatch" style="background:#4f8cff"></span>hitrost</span>
        <span><span class="swatch" style="background:#f5a524"></span>sunki</span>
      </div>
    </div>
    <div class="chart-block">
      <h4>Temperatura (°C)</h4>
      ${buildLineChartSvg({ series: tempSeries, color: '#f5544f', unit: '°' })}
    </div>
    <p class="muted small">Zadnjih ${m.length} meritev (~${hoursSpan} h, postaja poroča približno vsakih 10 min).</p>
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

function closeHistoryModal() {
  el.historyModalOverlay.hidden = true;
  state.currentHistoryStationId = null;
}

/**
 * Prikaz trenutne meritve postaje (isti prikaz kot glavna "📡 Živa
 * postaja" kartica na prvi strani - veter/sunki/smer/temperatura), a
 * neposredno iz že naloženega seznama vseh postaj (data/skytech-stations.json)
 * - uporabljeno za oznake postaj na zemljevidu, ki lahko pripadajo
 * kateri koli od ~100 postaj, ne le tistim, dodeljenim uradnemu
 * vzletišču.
 */
function renderStationSnapshot(station) {
  const m = station.measurement;
  if (!m) return '';
  const ageMinutes = m.time ? Math.round((Date.now() - new Date(m.time).getTime()) / 60000) : null;
  const ageText = ageMinutes != null
    ? (ageMinutes <= 1 ? 'pred manj kot minuto' : `pred ${ageMinutes} min`)
    : '';
  const wind = rateWindClient(m.windSpeedKmh, m.windGustKmh);
  const dirRating = rateSkytechDirectionClient(station, m.windDirection);
  return `
    <p class="muted small">Trenutna meritev${ageText ? ' · ' + ageText : ''}${station.altitude ? ` · ${station.altitude} m n.v.` : ''}</p>
    <div class="current-grid">
      ${metricBox('Veter', m.windSpeedKmh != null ? `${formatWind(m.windSpeedKmh)}${m.windDirection ? ' ' + m.windDirection : ''}` : '—', wind)}
      ${metricBox('Sunki vetra', formatWind(m.windGustKmh))}
      ${metricBox('Smer (ocena)', m.windDirection || '—', dirRating)}
      ${metricBox('Temperatura', m.temperatureC != null ? `${m.temperatureC}°C` : '—')}
    </div>
  `;
}

function openHistoryModal(stationId, stationName, station) {
  state.currentHistoryStationId = stationId;
  el.historyModalTitle.textContent = stationName || 'Postaja';
  el.historyModalSnapshot.innerHTML = station ? renderStationSnapshot(station) : '';
  el.historyModalBody.innerHTML = '<p class="muted">Nalagam zgodovino…</p>';
  el.historyModalOverlay.hidden = false;
  loadStationHistory(stationId)
    .then((history) => {
      if (state.currentHistoryStationId === stationId) renderHistoryCharts(history);
    })
    .catch((err) => {
      if (state.currentHistoryStationId === stationId) {
        el.historyModalBody.innerHTML = `<p class="muted">${err.message}</p>`;
      }
    });
}

/**
 * Prikaz podatkov o uradnem vzletišču (isto kot na prvi strani ob
 * izbiri vzletišča - nadmorska višina, primerna smer vzleta, stanje
 * žive postaje, opombe) - uporabljeno za oznake vzletišč na
 * zemljevidu, v istem modalnem oknu kot postaje.
 */
function openSiteInfoModal(site) {
  state.currentHistoryStationId = null;
  el.historyModalTitle.textContent = `🪂 ${site.name}`;
  el.historyModalSnapshot.innerHTML = '';
  const ls = site.liveStation;
  const liveText = ls && ls.confirmed
    ? `📡 Živa postaja: ${ls.phone}${ls.note ? ` — ${ls.note}` : ''}`
    : '📊 Brez potrjene žive postaje na vzletišču (le ARSO napoved).';
  el.historyModalBody.innerHTML = `
    <p class="muted">${site.region} · nadmorska višina vzletišča: ${site.elevation != null ? site.elevation + ' m' : '—'}</p>
    ${site.launchWindDirections ? `<p>Primerna smer vzleta: <strong>${site.launchWindDirections.join(', ')}</strong></p>` : ''}
    <p>${liveText}</p>
    ${site.notes ? `<p class="muted small">${site.notes}</p>` : ''}
    <button id="siteInfoWeatherBtn" class="btn btn-primary map-confirm-btn" type="button">Pokaži napoved za to vzletišče →</button>
  `;
  el.historyModalOverlay.hidden = false;
  document.getElementById('siteInfoWeatherBtn').addEventListener('click', () => {
    closeHistoryModal();
    closeMapPicker();
    el.siteSelect.value = site.id;
    loadWeatherForSite(site.id);
  });
}

/**
 * Izbira lokacije na interaktivnem zemljevidu (Leaflet + OpenStreetMap
 * ploščice prek CDN) kot alternativa/dopolnilo GPS gumbu "Moja
 * lokacija" - uporabno npr. če GPS ni na voljo/natančen, ali če
 * uporabnik želi preveriti napoved za drugo mesto, ne kjer trenutno je.
 */
let mapPickerMap = null;
let mapPickerMarker = null;
let mapPickerLatLng = null;
// Postaja, izbrana s klikom na njeno 📡 oznako na zemljevidu (ne z
// generičnim klikom po zemljevidu) - ob potrditvi lokacije njeno živo
// meritev prikažemo namesto splošne ARSO napovedi za najbližje vzletišče.
let mapPickerSelectedStation = null;

/**
 * Oznake uradnih vzletišč (iz state.sites, znane vnaprej) - narisane
 * takoj ob inicializaciji zemljevida. Klik nanje izbere to lokacijo IN
 * odpre okno s podatki o vzletišču (openSiteInfoModal).
 */
function addSiteMarkersToMapPicker() {
  const icon = L.divIcon({
    html: '<div class="map-pin map-pin-site">🪂</div>',
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
        openSiteInfoModal(site);
      });
  }
}

/**
 * Oznake vseh SkyTech vremenskih postaj (ne le uradnih vzletišč) -
 * naložene asinhrono (ista datoteka kot za "Moja lokacija" bližnje
 * postaje). Izloči znane pokvarjene privzete koordinate (altitude 0)
 * in zastarele meritve (>24h) - glej SKYTECH_API_ISSUES.md in
 * computeNearbyStationsForPoint zgoraj.
 */
async function addStationMarkersToMapPicker() {
  const stations = await loadAllStations();
  if (!mapPickerMap) return; // uporabnik je medtem zaprl modal
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
    const ageMinutes = s.measurement && s.measurement.time
      ? Math.round((now - new Date(s.measurement.time).getTime()) / 60000)
      : null;
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
  const center = state.userCoords
    ? [state.userCoords.lat, state.userCoords.lon]
    : [46.05, 14.9]; // približno središče Slovenije
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
    setStatus('Zemljevida ni bilo mogoče naložiti (ni internetne povezave do OpenStreetMap). Poskusi gumb "Moja lokacija" ali izberi vzletišče ročno.', 'error');
    return;
  }
  el.mapModalOverlay.hidden = false;
  // Leaflet potrebuje viden (ne hidden/display:none) vsebnik za pravilno
  // izmero velikosti - zato inicializacija/invalidateSize šele po prikazu.
  requestAnimationFrame(() => {
    initMapPicker();
    mapPickerMap.invalidateSize();
  });
}

function closeMapPicker() {
  el.mapModalOverlay.hidden = true;
}

/**
 * Uradna ARSO napoved termike (meteo.si/met/sl/aviation) - ločena od
 * naše lastne hevristike (estimateThermalIndex/estimateThermalWindow),
 * ki jo dopolnjuje: ARSO pokrije le danes/jutri, a z dejansko
 * kvantitativno oceno (max. hitrost dviganj v m/s + uradna barvna
 * stopnja), namesto našega grobega ugibanja iz temperature/oblačnosti.
 */
function renderArsoThermal(data) {
  const t = data.thermalForecastArso;
  if (!t || !t.ok || !t.items || t.items.length === 0) {
    el.arsoThermalCard.hidden = true;
    return;
  }
  el.arsoThermalMeta.textContent = `Regija: ${t.regionLabel}`;
  el.arsoThermalList.innerHTML = t.items
    .map(
      (item) => `
    <div class="metric">
      <div class="label">${item.date}</div>
      <div class="value">${item.climbMs} m/s</div>
      <div class="thermal-swatch" style="background:${item.color}"></div>
    </div>
  `
    )
    .join('');
  el.arsoThermalCard.hidden = false;
}

/**
 * Podrobnosti uradne ARSO napovedi termike (klik na kartico) - isto
 * modalno okno kot za postaje/vzletišča (historyModalOverlay): za vsak
 * dan datum izdaje, m/s in barvna stopnja ter povezava na uradno ARSO
 * stran za to regijo/dan, pod tem pa graf "po urah" (naša ocena, glej
 * renderThermalHourlyEstimate spodaj).
 */
const THERMAL_LEVEL_RANK = { gray: 1, blue: 1, green: 2, orange: 3 };
const THERMAL_LEVEL_LABELS = { 1: 'šibka', 2: 'dobra', 3: 'ostra' };

/**
 * Graf "moč termike po urah" - NI uradni ARSO podatek (tega ARSO ne
 * objavlja strojno berljivo, glej raziskavo v git zgodovini), ampak naša
 * lastna hevristika (estimateThermalIndex v src/paragliding.js), izrisana
 * v ISTI obliki kot obstoječi grafi vetra/temperature pri postajah
 * (buildLineChartSvg) - zvezna črta namesto stolpcev, z besedilnimi
 * oznakami na Y osi (šibka/dobra/ostra) namesto številk, saj gre za 3
 * kvalitativne stopnje, ne za merjeno fizikalno količino.
 */
function buildThermalLineSvg(entries) {
  const series = entries
    .filter((e) => e.time)
    .map((e) => ({ time: e.time, value: THERMAL_LEVEL_RANK[e.thermal && e.thermal.color] || null }));
  if (series.length === 0) return '<p class="muted small">Ni podatkov za graf.</p>';
  return buildLineChartSvg({
    series,
    color: '#f5a524',
    yLabelFormatter: (v) => THERMAL_LEVEL_LABELS[Math.min(3, Math.max(1, Math.round(v)))] || '',
  });
}

/**
 * Cel dan (vse ure, ne le okrog trenutno izbranega dneva v spodnjih
 * zavihkih) za DANES IN JUTRI - isti obseg kot uradna ARSO napoved
 * zgoraj (forecast[0]/[1]), ne glede na to, kateri dan je uporabnik
 * nazadnje izbral v večdnevni napovedi na glavni strani.
 */
function renderThermalHourlyEstimate() {
  const forecast = state.weather && state.weather.forecast;
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

function openArsoThermalDetailModal(t) {
  if (!t || !t.items || t.items.length === 0) return;
  state.currentHistoryStationId = null;
  el.historyModalTitle.textContent = `🌡️ Napoved termike — ${t.regionLabel}`;
  el.historyModalSnapshot.innerHTML = '';
  el.historyModalBody.innerHTML =
    '<h4 class="muted small" style="margin:0 0 6px;">Uradna ARSO napoved</h4>' +
    t.items
      .map(
        (item) => `
    <div class="metric" style="margin-bottom:10px;">
      <div class="label">${item.date}</div>
      <div class="value">${item.climbMs} m/s</div>
      <div class="thermal-swatch" style="background:${item.color}"></div>
      ${item.issued ? `<p class="muted small" style="margin-top:8px;">Izdano: ${item.issued}</p>` : ''}
      ${item.link ? `<a href="${item.link}" target="_blank" rel="noopener">Poglej na uradni ARSO strani ↗</a>` : ''}
    </div>
  `
      )
      .join('') +
    renderThermalHourlyEstimate();
  el.historyModalOverlay.hidden = false;
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
            ${entry.windSpeedKmh != null ? formatWind(entry.windSpeedKmh) : '—'}${entry.windDirection ? ' ' + entry.windDirection : ''}
            ${entry.windGustKmh != null ? ' (sunki ' + formatWind(entry.windGustKmh) + ')' : ''} ·
            ${entry.cloudCover || ''}
          </div>
          <div class="${pillClass(p.wind.color)}">${p.wind.label}</div>
          ${(!state.myLocationMode && p.launchAlignment.known) ? `<div class="${pillClass(p.launchAlignment.color)}">${p.launchAlignment.octant}</div>` : ''}
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
  if (!data.myLocationMode && ls && ls.confirmed && ls.phone) {
    items.push({
      href: `tel:${ls.phone.replace(/\s+/g, '')}`,
      label: `📡 Živa postaja – telefonski odzivnik (${ls.phone})`,
    });
  }
  items.push({
    href: links.skytech,
    label: data.myLocationMode
      ? 'SkyTech.si – domača stran (žive postaje v bližini glej zgoraj)'
      : (data.skytech
        ? 'SkyTech.si – domača stran (podatki zgoraj prek uradnega API-ja)'
        : 'SkyTech.si – domača stran (za to vzletišče ni dodeljene postaje)'),
  });
  items.push({ href: links.windAloft, label: 'Veter na višini (Windy.com, izberi nivo/hPa)' });

  el.linksList.innerHTML = items
    .map((i) => `<li><a href="${i.href}" target="_blank" rel="noopener">${i.label} ↗</a></li>`)
    .join('');

  if (!data.myLocationMode && ls && ls.note) {
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
  renderSkytech(data);
  renderCurrent(data);
  renderNearbyStations(data);
  renderArsoThermal(data);
  renderNearby(data);
  renderForecast(data);
  renderLinks(data);
  el.disclaimerBox.textContent = data.disclaimer;
  el.disclaimerBox.hidden = false;
  renderSources(data);
  updateNightMode();
}

el.locateBtn.addEventListener('click', requestGeolocation);
el.siteSelect.addEventListener('change', () => {
  el.distanceInfo.textContent = '';
  loadWeatherForSite(el.siteSelect.value);
});
el.nightOverrideBtn.addEventListener('click', () => {
  state.nightOverride = !state.nightOverride;
  updateNightMode();
});
el.unitSelect.addEventListener('change', () => {
  state.windUnit = el.unitSelect.value;
  try {
    localStorage.setItem(WIND_UNIT_STORAGE_KEY, state.windUnit);
  } catch (_) {
    /* ni kritično, spregledamo */
  }
  if (state.weather) {
    renderSkytech(state.weather);
    renderCurrent(state.weather);
    renderNearbyStations(state.weather);
    renderTimeline(state.weather.forecast[state.activeDayIndex]);
  }
  if (state.currentHistoryStationId && state.stationHistoryCache.has(state.currentHistoryStationId)) {
    renderHistoryCharts(state.stationHistoryCache.get(state.currentHistoryStationId));
  }
});

el.skytechCard.addEventListener('click', () => {
  const id = el.skytechCard.dataset.stationId;
  if (id) openHistoryModal(id, el.skytechCard.dataset.stationName);
});
el.skytechCard.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    el.skytechCard.click();
  }
});
el.arsoThermalCard.addEventListener('click', () => {
  if (state.weather && state.weather.thermalForecastArso) {
    openArsoThermalDetailModal(state.weather.thermalForecastArso);
  }
});
el.arsoThermalCard.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    el.arsoThermalCard.click();
  }
});
el.nearbyStationsList.addEventListener('click', (e) => {
  const row = e.target.closest('.station-row-clickable');
  if (!row) return;
  openHistoryModal(row.dataset.stationId, row.dataset.stationName);
});
el.historyModalClose.addEventListener('click', closeHistoryModal);
el.historyModalOverlay.addEventListener('click', (e) => {
  if (e.target === el.historyModalOverlay) closeHistoryModal();
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
  useLocation(lat, lon, null, station);
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
    el.unitSelect.value = state.windUnit;
    await loadSites();
    loadMeta();
    if (state.sites.length > 0) {
      el.siteSelect.value = state.sites[0].id;
      await loadWeatherForSite(state.sites[0].id);
    }
    requestGeolocation();
    updateNightMode();
    setInterval(updateNightMode, 60000);
  } catch (err) {
    setStatus('Napaka pri nalaganju aplikacije: ' + err.message, 'error');
  }
})();
