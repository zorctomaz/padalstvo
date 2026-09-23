'use strict';

/**
 * Frontend bere izključno statične JSON datoteke iz /data/ – tako deluje
 * enako na GitHub Pages (brez strežnika) kot pod lokalnim Express
 * strežnikom. Podatke v /data/ osveži `npm run build:data` (ročno ali
 * prek GitHub Action).
 */

/**
 * Prevod (SI/EN) - glej state.lang/setLang spodaj. `t(key, ...args)` za
 * besedila, ki jih generira ta datoteka; `translateRatingLabel` za
 * besedila ocen (veter/termika/XC/smer), ki so lahko vgrajena že v
 * podatkih iz /data/ (server-side src/paragliding.js) - ker teh ne
 * generiramo tu, jih prevedemo z iskanjem po točnem slovenskem besedilu
 * namesto s ključem. Prosto besedilo, ki ga uredniki ročno vpišejo v
 * src/sites.json (opombe vzletišč, opis žive postaje), NI prevedeno -
 * ostane v slovenščini v obeh jezikih (ni praktično mehansko prevedljivo).
 */
const LANG_STORAGE_KEY = 'padalstvo-vreme:lang';

function loadStoredLang() {
  try {
    const stored = localStorage.getItem(LANG_STORAGE_KEY);
    return stored === 'en' ? 'en' : 'sl';
  } catch (_) {
    return 'sl';
  }
}

const TRANSLATIONS = {
  sl: {
    locateBtn: '📍 Uporabi mojo lokacijo',
    mapPickerBtn: '🗺️ Izberi na zemljevidu',
    clickForDetailsChart: 'Klikni za podrobnosti in graf ↗',
    thermalTitle: '🌡️ Termika (uradna ARSO napoved)',
    clickForHourlyDetailsChart: 'Klikni za podrobnosti in graf po urah ↗',
    windAloftTitle: '🌬️ Veter po višini',
    nearbyStationsTitle: '📡 Postaje v bližini',
    forecastTitle: 'Večdnevna napoved',
    colDay: 'Dan',
    colTemp: 'Temp.',
    colWind: 'Veter',
    colThermal: 'Termika',
    colRain: 'Dež',
    linksTitle: 'Povezave',
    footerSources: 'Podatki: ARSO (vreme.arso.gov.si, meteo.si), opendata.si, SkyTech.si. Ni uradna letalska napoved.',
    stationDefaultTitle: 'Postaja',
    close: 'Zapri',
    langGroup: 'Jezik',
    mapModalTitle: 'Izberi lokacijo na zemljevidu',
    mapLegend: '🪂 vzletišče · 📡 postaja (bledo = brez meritve v zadnjih 24h) · klikni oznako ali poljubno točko',
    mapCoordsLabelDefault: 'Izbrana lokacija: —',
    mapConfirmBtn: 'Uporabi to lokacijo',

    errSitesLoad: 'Seznama vzletišč ni bilo mogoče naložiti.',
    loading: 'Nalagam…',
    windAloftSource: 'Vir: Open-Meteo (ne ARSO) · naslednja 2 dni, vsake 3 ure',
    windAloftLoadError: 'Podatkov trenutno ni bilo mogoče naložiti.',
    noChartData: 'Ni podatkov za graf.',
    labelWind: 'Veter',
    labelGust: 'Sunki',
    labelGustFull: 'Sunki vetra',
    labelDirection: 'Smer',
    labelDirectionEst: 'Smer (ocena)',
    labelTemp: 'Temperatura',
    labelPressure: 'Pritisk',
    pressureSteady: 'stabilen',
    pressureFalling: (delta, hours) => `pada (${delta} hPa / ${hours} h)`,
    pressureFallingFast: (delta, hours) => `hitro pada (${delta} hPa / ${hours} h) – mogoča bližajoča se fronta`,
    pressureRising: (delta, hours) => `narašča (+${delta} hPa / ${hours} h)`,
    pressureRisingFast: (delta, hours) => `hitro narašča (+${delta} hPa / ${hours} h) – krepitev visokega pritiska`,
    currentMeasurement: 'Trenutna meritev',
    agoLessMinute: 'pred manj kot minuto',
    agoMinutes: (min) => `pred ${min} min`,
    elevAbbrev: 'm n.v.',
    historyUnavailable: 'Zgodovina za to postajo ni na voljo.',
    historyUnavailableRecent: 'Zgodovina za to postajo (zadnjih nekaj ur) ni na voljo.',
    windChartTitle: (unitLabel) => `Veter (${unitLabel})`,
    windAloftWindHeader: (unitLabel) => `Veter (${unitLabel}) · ↑ = od kod piha`,
    arrowLegend: '↑ = smer, od koder piha veter (sever = puščica navzgor), po ena za vsako uro.',
    legendSpeed: 'hitrost',
    legendGust: 'sunki',
    tempChartTitle: 'Temperatura (°C)',
    lastMeasurements: (count, hours) => `Zadnjih ${count} meritev (~${hours} h, postaja poroča približno vsakih 10 min).`,
    loadingHistory: 'Nalagam zgodovino…',
    thermalWeak: 'šibka',
    thermalGood: 'dobra',
    thermalSharp: 'ostra',
    ourHourlyEstimate: (date) => `Naša ocena po urah — ${date} (ni uradni ARSO podatek)`,
    thermalModalTitle: (region) => `🌡️ Napoved termike — ${region}`,
    officialArsoForecast: 'Uradna ARSO napoved',
    issuedOn: (date) => `Izdano: ${date}`,
    viewOnArsoSite: 'Poglej na uradni ARSO strani ↗',
    mapLoadError: 'Zemljevida ni bilo mogoče naložiti (ni internetne povezave). Poskusi gumb "Moja lokacija" ali izberi vzletišče ročno.',
    myLocation: '📍 Tvoja lokacija',
    selectedLiveStation: (station, arsoName, km) => `izbrana živa postaja: ${station} · ARSO napoved: ${arsoName} (${km} km)`,
    nearestArsoSource: (name, km) => `najbližji vir ARSO napovedi: ${name} (${km} km)`,
    regionElevation: (region, elev) => `${region} · ${elev} m n.v.`,
    liveMeasurementSource: (station) => `živa meritev (${station})`,
    arsoForecastSource: 'ARSO napoved',
    sourceLabel: (source) => `Vir: ${source}`,
    regionMaxClimb: (region) => `Regija: ${region} · max. hitrost dviganj`,
    windForecastSource: (name) => `Vir: ARSO napoved za ${name}`,
    windUpTo: (wind, arrow) => `do ${wind}${arrow}`,
    linkArsoForecast: 'ARSO napoved (graf)',
    linkArsoAviation: 'ARSO letalsko vreme',
    linkArsoRadar: 'ARSO radar padavin',
    linkWindAloft: 'Veter na višini (Windy)',
    linkSkytech: 'SkyTech.si',
    loadingData: 'Nalagam podatke…',
    siteDataUnavailable: 'Podatki za to vzletišče še niso na voljo.',
    errLoadingData: (msg) => `Napaka pri nalaganju podatkov: ${msg}`,
    loadingWeatherData: 'Nalagam vremenske podatke…',
    dataUnavailable: 'Podatki še niso na voljo.',
    noNearbySite: 'Ni najdenega bližnjega vzletišča.',
    geoNotSupported: 'Brskalnik ne podpira GPS lokacije. Izberi vzletišče ročno.',
    searchingLocation: 'Iščem lokacijo…',
    geoDenied: 'Dostop do lokacije zavrnjen ali ni na voljo.',
    errLoadingGeneric: (msg) => `Napaka pri nalaganju: ${msg}`,
    selectedLocationNamed: (name, coords) => `Izbrana lokacija: ${name} (${coords})`,
    selectedLocationCoords: (coords) => `Izbrana lokacija: ${coords}`,
  },
  en: {
    locateBtn: '📍 Use my location',
    mapPickerBtn: '🗺️ Choose on map',
    clickForDetailsChart: 'Click for details and chart ↗',
    thermalTitle: '🌡️ Thermals (official ARSO forecast)',
    clickForHourlyDetailsChart: 'Click for hourly details and chart ↗',
    windAloftTitle: '🌬️ Wind aloft',
    nearbyStationsTitle: '📡 Nearby stations',
    forecastTitle: 'Multi-day forecast',
    colDay: 'Day',
    colTemp: 'Temp.',
    colWind: 'Wind',
    colThermal: 'Thermal',
    colRain: 'Rain',
    linksTitle: 'Links',
    footerSources: 'Data: ARSO (vreme.arso.gov.si, meteo.si), opendata.si, SkyTech.si. Not an official aviation forecast.',
    stationDefaultTitle: 'Station',
    close: 'Close',
    langGroup: 'Language',
    mapModalTitle: 'Choose location on map',
    mapLegend: '🪂 launch site · 📡 station (faded = no measurement in the last 24h) · tap a marker or any point',
    mapCoordsLabelDefault: 'Selected location: —',
    mapConfirmBtn: 'Use this location',

    errSitesLoad: 'Could not load the list of launch sites.',
    loading: 'Loading…',
    windAloftSource: 'Source: Open-Meteo (not ARSO) · next 2 days, every 3 hours',
    windAloftLoadError: 'Data could not be loaded right now.',
    noChartData: 'No data for the chart.',
    labelWind: 'Wind',
    labelGust: 'Gusts',
    labelGustFull: 'Wind gusts',
    labelDirection: 'Direction',
    labelDirectionEst: 'Direction (estimate)',
    labelTemp: 'Temperature',
    labelPressure: 'Pressure',
    pressureSteady: 'steady',
    pressureFalling: (delta, hours) => `falling (${delta} hPa / ${hours} h)`,
    pressureFallingFast: (delta, hours) => `falling fast (${delta} hPa / ${hours} h) – a front may be approaching`,
    pressureRising: (delta, hours) => `rising (+${delta} hPa / ${hours} h)`,
    pressureRisingFast: (delta, hours) => `rising fast (+${delta} hPa / ${hours} h) – high pressure building`,
    currentMeasurement: 'Current measurement',
    agoLessMinute: 'less than a minute ago',
    agoMinutes: (min) => `${min} min ago`,
    elevAbbrev: 'm a.s.l.',
    historyUnavailable: 'History for this station is not available.',
    historyUnavailableRecent: 'History for this station (the last few hours) is not available.',
    windChartTitle: (unitLabel) => `Wind (${unitLabel})`,
    windAloftWindHeader: (unitLabel) => `Wind (${unitLabel}) · ↑ = direction it's blowing from`,
    arrowLegend: '↑ = direction the wind is blowing FROM (north = arrow pointing up), one per hour.',
    legendSpeed: 'speed',
    legendGust: 'gusts',
    tempChartTitle: 'Temperature (°C)',
    lastMeasurements: (count, hours) => `Last ${count} measurements (~${hours} h, the station reports roughly every 10 min).`,
    loadingHistory: 'Loading history…',
    thermalWeak: 'weak',
    thermalGood: 'good',
    thermalSharp: 'sharp',
    ourHourlyEstimate: (date) => `Our hourly estimate — ${date} (not an official ARSO figure)`,
    thermalModalTitle: (region) => `🌡️ Thermal forecast — ${region}`,
    officialArsoForecast: 'Official ARSO forecast',
    issuedOn: (date) => `Issued: ${date}`,
    viewOnArsoSite: 'View on the official ARSO site ↗',
    mapLoadError: 'Could not load the map (no internet connection). Try the "My location" button or pick a launch site manually.',
    myLocation: '📍 Your location',
    selectedLiveStation: (station, arsoName, km) => `selected live station: ${station} · ARSO forecast: ${arsoName} (${km} km)`,
    nearestArsoSource: (name, km) => `nearest ARSO forecast source: ${name} (${km} km)`,
    regionElevation: (region, elev) => `${region} · ${elev} m a.s.l.`,
    liveMeasurementSource: (station) => `live measurement (${station})`,
    arsoForecastSource: 'ARSO forecast',
    sourceLabel: (source) => `Source: ${source}`,
    regionMaxClimb: (region) => `Region: ${region} · max. climb rate`,
    windForecastSource: (name) => `Source: ARSO forecast for ${name}`,
    windUpTo: (wind, arrow) => `up to ${wind}${arrow}`,
    linkArsoForecast: 'ARSO forecast (chart)',
    linkArsoAviation: 'ARSO aviation weather',
    linkArsoRadar: 'ARSO precipitation radar',
    linkWindAloft: 'Wind aloft (Windy)',
    linkSkytech: 'SkyTech.si',
    loadingData: 'Loading data…',
    siteDataUnavailable: 'Data for this launch site is not available yet.',
    errLoadingData: (msg) => `Error loading data: ${msg}`,
    loadingWeatherData: 'Loading weather data…',
    dataUnavailable: 'Data is not available yet.',
    noNearbySite: 'No nearby launch site found.',
    geoNotSupported: 'This browser does not support GPS location. Pick a launch site manually.',
    searchingLocation: 'Finding your location…',
    geoDenied: 'Location access denied or unavailable.',
    errLoadingGeneric: (msg) => `Error loading: ${msg}`,
    selectedLocationNamed: (name, coords) => `Selected location: ${name} (${coords})`,
    selectedLocationCoords: (coords) => `Selected location: ${coords}`,
  },
};

function t(key, ...args) {
  const entry = (TRANSLATIONS[state.lang] && TRANSLATIONS[state.lang][key]) ?? TRANSLATIONS.sl[key];
  if (entry === undefined) return key;
  return typeof entry === 'function' ? entry(...args) : entry;
}

/**
 * Besedila ocen (veter/termika/XC/primernost smeri) in nekaj drugih fiksnih
 * besedil (disclaimer), ki jih deloma generira TA datoteka
 * (rateWindClient/rateSkytechDirectionClient), a so ENAKA besedila lahko
 * vgrajena tudi v podatke, ki jih server-side vrne `src/paragliding.js`
 * (rateWind/estimateThermalIndex/rateLaunchAlignment/rateSkytechDirection/
 * disclaimer, zapisano v data/weather/<site>.json) - teh zato NE moremo
 * prevesti s ključem (podatki so že "končno" besedilo), ampak z iskanjem po
 * točnem slovenskem besedilu. Smerne kratice (npr. "NE") v parametriziranih
 * predlogah so že angleške (SkyTech in launchWindDirections uporabljata
 * N/NE/E/SE/S/SW/W/NW), zato jih pustimo nespremenjene.
 *
 * OPOMBA - obseg: prosto besedilo, ki ga uredniki ročno vpišejo v
 * src/sites.json (site.notes, liveStation.note - opombe posameznih
 * vzletišč), s tem mehanizmom NI zajeto in ostane v slovenščini tudi v EN
 * načinu - ni praktično mehansko prevedljivo (13 vzletišč × ročno pisano
 * besedilo).
 */
const RATING_LABEL_MAP_EN = {
  'Ocene termike, baze oblakov, XC okna in primernosti smeri/jakosti vetra so poenostavljene hevristike in informativne narave – niso nadomestilo za uradno letalsko napoved, GAFOR/SIGWX, briefing ali lastno presojo pilota. Primerne smeri vetra za vzlet so pri več vzletiščih neverificirane (glej opombo pri vzletišču); pred vsakim letom preverite uradne vire, lokalno društvo in dejanske razmere na vzletišču.':
    'Thermal, cloud-base, XC-window and wind direction/strength suitability estimates are simplified heuristics for general information only – they are not a substitute for the official aviation forecast, GAFOR/SIGWX, a briefing, or the pilot\'s own judgment. Suitable launch wind directions are unverified at several launch sites (see the note for that site); always check official sources, the local club, and actual conditions at the site before every flight.',
  'Ni podatka o vetru': 'No wind data',
  'Neprimerno za letenje (premočan veter)': 'Not suitable for flying (too strong wind)',
  'Močan/sunkovit veter – samo izkušeni piloti': 'Strong/gusty wind – experienced pilots only',
  'Ugodno za letenje': 'Favorable for flying',
  'Šibek/miren veter': 'Light/calm wind',
  'Ni podatka o smeri': 'No direction data',
  'Ni dovolj podatkov': 'Not enough data',
  'Šibka termika (pretežno oblačno)': 'Weak thermals (mostly cloudy)',
  'Lahko močna/ostra termika (previdno popoldan)': 'Possibly strong/sharp thermals (caution in the afternoon)',
  'Dobri pogoji za termiko': 'Good thermal conditions',
  'Šibka termika (nizka temperatura)': 'Weak thermals (low temperature)',
  'Padavine – slabi pogoji za XC': 'Precipitation – poor XC conditions',
  'Šibki pogoji za termiko/XC': 'Weak thermal/XC conditions',
  'Dobri pogoji za XC prelete': 'Good conditions for XC flights',
  'Zmerni pogoji, verjetno lokalni leti': 'Moderate conditions, likely local flights only',
  'Kratko/šibko termalno okno': 'Short/weak thermal window',
  'Primerna smer vetra za to vzletišče ni potrjena': 'Suitable wind direction for this launch site is not confirmed',
  'Ni podatka o smeri vetra': 'No wind direction data',
};

function translateRatingLabel(label) {
  if (state.lang !== 'en' || !label) return label;
  if (RATING_LABEL_MAP_EN[label]) return RATING_LABEL_MAP_EN[label];
  let m = label.match(/^Smer vetra \(([A-Z]+)\) ustreza vzletišču$/);
  if (m) return `Wind direction (${m[1]}) matches the launch site`;
  m = label.match(/^Smer \(([A-Z]+)\) ne ustreza vzletišču – primerne: (.+)$/);
  if (m) return `Direction (${m[1]}) doesn't match the launch site – suitable: ${m[2]}`;
  m = label.match(/^Smer \(([A-Z]+)\) ustreza postaji$/);
  if (m) return `Direction (${m[1]}) matches the station`;
  m = label.match(/^Smer \(([A-Z]+)\) mejna$/);
  if (m) return `Direction (${m[1]}) borderline`;
  m = label.match(/^Smer \(([A-Z]+)\) neprimerna$/);
  if (m) return `Direction (${m[1]}) unsuitable`;
  m = label.match(/^Smer \(([A-Z]+)\) ni razvrščena$/);
  if (m) return `Direction (${m[1]}) not classified`;
  return label;
}

function dateLocale() {
  return state.lang === 'en' ? 'en-US' : 'sl-SI';
}

/**
 * Osveži vsa besedila v HTML, ki so označena z data-i18n/data-i18n-aria
 * (statični napisi - gumbi, naslovi razdelkov, legenda ...), ob zagonu in
 * ob vsakem preklopu jezika.
 */
function applyStaticTranslations() {
  document.querySelectorAll('[data-i18n]').forEach((elNode) => {
    elNode.textContent = t(elNode.getAttribute('data-i18n'));
  });
  document.querySelectorAll('[data-i18n-aria]').forEach((elNode) => {
    elNode.setAttribute('aria-label', t(elNode.getAttribute('data-i18n-aria')));
  });
  document.documentElement.lang = state.lang;
}

/**
 * Enota za hitrost vetra - na voljo prek dveh gumbov (m/s, km/h). mph/kn
 * ostajata v podatkovni strukturi zaradi doslednosti/morebitne kasnejše
 * uporabe, a nista dosegljiva prek uporabniškega vmesnika.
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
  userCoords: null,
  allStations: null,
  thermalRegions: null,
  arsoLocations: null,
  arsoLocationForecastCache: new Map(),
  windAloftRequestToken: null,
  lastData: null,
  stationHistoryCache: new Map(),
  currentHistoryStationId: null,
  windUnit: loadStoredWindUnit(),
  lang: loadStoredLang(),
};

const el = {
  unitMsBtn: document.getElementById('unitMsBtn'),
  langSiBtn: document.getElementById('langSiBtn'),
  langEnBtn: document.getElementById('langEnBtn'),
  unitKmhBtn: document.getElementById('unitKmhBtn'),
  locateBtn: document.getElementById('locateBtn'),
  mapPickerBtn: document.getElementById('mapPickerBtn'),
  windAloftBlock: document.getElementById('windAloftBlock'),
  windAloftMeta: document.getElementById('windAloftMeta'),
  windAloftList: document.getElementById('windAloftList'),
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
  if (!res.ok) throw new Error(t('errSitesLoad'));
  state.sites = await res.json();
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
const NEARBY_MIN_COUNT = 3;
const NEARBY_MAX_AGE_MINUTES = 24 * 60;

/**
 * Za poljubno GPS točko ("Moja lokacija"/zemljevid) izloči pokvarjene
 * privzete koordinate (altitude 0) in zastarele meritve, glej
 * SKYTECH_API_ISSUES.md.
 */
function computeNearbyStationsForPoint(stations, lat, lon, excludeId) {
  if (!Array.isArray(stations)) return [];
  const candidates = stations
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
    // Starostni filter (varovalka pred pokvarjenimi postajami s privzeto
    // koordinato, glej summarizeNearbyStations v src/paragliding.js) ostane
    // vedno aktiven, tudi spodaj, ko popustimo razdaljno omejitev.
    .filter((s) => s.ageMinutes != null && s.ageMinutes <= NEARBY_MAX_AGE_MINUTES)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  const withinRange = candidates.filter((s) => s.distanceKm <= NEARBY_MAX_DISTANCE_KM).slice(0, NEARBY_MAX_COUNT);
  return withinRange.length >= NEARBY_MIN_COUNT ? withinRange : candidates.slice(0, NEARBY_MIN_COUNT);
}

/**
 * NE sme si izposoditi ARSO termalne regije
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
 * NE sme si izposoditi ARSO kraja, dodeljenega
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
  return d.toLocaleDateString(dateLocale(), { weekday: 'short', day: 'numeric', month: 'numeric' });
}

/** Vhod je vedno v km/h (tako jih vrača build-data.js) - pretvorimo v
 * trenutno izbrano enoto (glej WIND_UNITS/state.windUnit zgoraj). */
function formatWind(windSpeedKmh) {
  if (windSpeedKmh === null || windSpeedKmh === undefined) return '—';
  const unit = WIND_UNITS[state.windUnit] || WIND_UNITS.kmh;
  const value = Math.round(windSpeedKmh * unit.factor * 10) / 10;
  return `${value} ${unit.label}`;
}

function convertWindValue(windSpeedKmh) {
  if (windSpeedKmh === null || windSpeedKmh === undefined) return null;
  const unit = WIND_UNITS[state.windUnit] || WIND_UNITS.kmh;
  return Math.round(windSpeedKmh * unit.factor * 10) / 10;
}

function metricBox(label, value, pill) {
  return `
    <div class="big-stat">
      <div class="label">${label}</div>
      <div class="value">${value}</div>
      ${pill ? `<div class="${pillClass(pill.color)}">${translateRatingLabel(pill.label)}</div>` : ''}
    </div>
  `;
}

/**
 * ARSO napoved uporablja slovenske smerne okrajšave
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

/**
 * SkyTech (žive postaje) uporablja angleške smerne okrajšave
 * (N/NE/E/SE/S/SW/W/NW) - ločen slovar od zgornjega, ker se npr. "S"
 * tu pomeni JUG (south), v ARSO napovedi zgoraj pa SEVER (sever) - NE
 * smeta se zmešati. Ista konvencija ("od kod piha") in isti vzorec
 * zaokroževanja 16-smernih vrednosti na 8 puščic kot pri SI različici.
 */
const WIND_ARROW_BY_EN_DIRECTION = {
  N: '↑', NNE: '↑', NE: '↗', ENE: '↗', E: '→', ESE: '→', SE: '↘', SSE: '↘',
  S: '↓', SSW: '↓', SW: '↙', WSW: '↙', W: '←', WNW: '←', NW: '↖', NNW: '↖',
};

function windArrowSkytech(direction) {
  return direction ? (WIND_ARROW_BY_EN_DIRECTION[direction] || '') : '';
}

/**
 * Veter (in temperatura) po višini (tlačni nivoji)
 * iz Open-Meteo (brez API ključa, odprt CORS - preverjeno prek GitHub
 * Actions), ker ARSO tega ne objavlja strojno berljivo. Klic gre
 * neposredno iz brskalnika, brez strežniške predpriprave. Prikaz posnema
 * tabelo iz ARSO-jeve gorske vremenske aplikacije ("Vreme v gorah in
 * hribih") - nadmorska višina v vrsticah, čas v vodoravno drsnih stolpcih.
 * 6 "okroglih" tlačnih nivojev (950/900/850/800/700/600 hPa), katerih ISA
 * nadmorska višina najbližje ustreza 500/1000/1500/2000/3000/4200 m.
 */
const WIND_ALOFT_LEVELS = [
  { hpa: 950, altitudeM: 500 },
  { hpa: 900, altitudeM: 1000 },
  { hpa: 850, altitudeM: 1500 },
  { hpa: 800, altitudeM: 2000 },
  { hpa: 700, altitudeM: 3000 },
  { hpa: 600, altitudeM: 4200 },
];

/**
 * Vsak 3. urni vnos (00.00, 03.00, 06.00 ... lokalno) za naslednja dva
 * dneva.
 */
async function fetchWindAloft(lat, lon) {
  const params = WIND_ALOFT_LEVELS
    .flatMap((l) => [`temperature_${l.hpa}hPa`, `wind_speed_${l.hpa}hPa`, `wind_direction_${l.hpa}hPa`])
    .join(',');
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=${params}&timezone=auto&forecast_days=2`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const json = await res.json();
  const times = json.hourly.time;
  const idx = [];
  for (let i = 0; i < times.length; i += 3) idx.push(i);

  return {
    times: idx.map((i) => times[i]),
    levels: WIND_ALOFT_LEVELS.map((l) => ({
      hpa: l.hpa,
      altitudeM: l.altitudeM,
      temps: idx.map((i) => json.hourly[`temperature_${l.hpa}hPa`][i]),
      speeds: idx.map((i) => json.hourly[`wind_speed_${l.hpa}hPa`][i]),
      dirs: idx.map((i) => json.hourly[`wind_direction_${l.hpa}hPa`][i]),
    })),
  };
}

/** Ločena lestvica od rateWindClient (tista je
 * umerjena za prizemni polet 8-30 km/h, tu gre lahko za jetstream). */
function windAloftSpeedClass(kmh) {
  if (kmh === null || kmh === undefined) return '';
  if (kmh >= 50) return 'wa-red';
  if (kmh >= 30) return 'wa-orange';
  if (kmh >= 15) return 'wa-yellow';
  return 'wa-blue';
}

function formatWindAloftColHeader(timeStr) {
  const d = new Date(timeStr);
  let day = d.toLocaleDateString(dateLocale(), { weekday: 'short' }).replace(/\.$/, '');
  day = day.charAt(0).toUpperCase() + day.slice(1);
  const hour = String(d.getHours()).padStart(2, '0');
  return `<div class="wa-day">${day}</div><div class="wa-hour">${hour}</div>`;
}

function buildWindAloftTable(aloft, windSpeedFormatter, unitLabel) {
  const colCount = aloft.times.length;
  const headerRow = `<tr><th></th>${aloft.times.map((t) => `<th>${formatWindAloftColHeader(t)}</th>`).join('')}</tr>`;

  const tempRows = aloft.levels
    .map(
      (l) => `
        <tr>
          <th>~${l.altitudeM} m</th>
          ${l.temps.map((t) => `<td>${t !== null && t !== undefined ? Math.round(t) + '°' : '—'}</td>`).join('')}
        </tr>
      `
    )
    .join('');

  const windRows = aloft.levels
    .map((l) => {
      const cells = l.speeds
        .map((s, i) => {
          const deg = l.dirs[i];
          const cls = windAloftSpeedClass(s);
          const arrow = deg !== null && deg !== undefined
            ? `<span class="wa-arrow" style="transform:rotate(${deg}deg)">↑</span>`
            : '';
          const speedText = s !== null && s !== undefined ? windSpeedFormatter(s) : '—';
          return `<td class="${cls}">${arrow}<br>${speedText}</td>`;
        })
        .join('');
      return `<tr><th>~${l.altitudeM} m</th>${cells}</tr>`;
    })
    .join('');

  return `
    <div class="wind-aloft-table-wrap">
      <table class="wind-aloft-table">
        <thead>${headerRow}</thead>
        <tbody>
          <tr class="wa-section"><th colspan="${colCount + 1}">${t('tempChartTitle')}</th></tr>
          ${tempRows}
          <tr class="wa-section"><th colspan="${colCount + 1}">${t('windAloftWindHeader', unitLabel)}</th></tr>
          ${windRows}
        </tbody>
      </table>
    </div>
  `;
}

async function renderWindAloft(data) {
  if (!data.links || !data.links.windAloft) {
    el.windAloftBlock.hidden = true;
    return;
  }
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
  el.windAloftMeta.textContent = t('loading');
  el.windAloftList.innerHTML = '';
  try {
    const aloft = await fetchWindAloft(coords.lat, coords.lon);
    if (state.windAloftRequestToken !== requestToken) return;
    const unitLabel = (WIND_UNITS[state.windUnit] || WIND_UNITS.kmh).label;
    el.windAloftMeta.textContent = t('windAloftSource');
    el.windAloftList.innerHTML = buildWindAloftTable(aloft, (kmh) => Math.round(convertWindValue(kmh)), unitLabel);
  } catch (err) {
    if (state.windAloftRequestToken !== requestToken) return;
    el.windAloftMeta.textContent = t('windAloftLoadError');
    el.windAloftList.innerHTML = '';
  }
}

/**
 * Groba
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

/* ---------- Grafi (buildLineChartSvg + oznake vsake 3 ure) ---------- */

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
    return `<p class="meta small">${t('noChartData')}</p>`;
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

  const fmtTime = (tv) => (tv ? new Date(tv).toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' }) : '');
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
  const ageText = ageMinutes != null ? (ageMinutes <= 1 ? t('agoLessMinute') : t('agoMinutes', ageMinutes)) : '';
  const wind = rateWindClient(m.windSpeedKmh, m.windGustKmh);
  const dirRating = rateSkytechDirectionClient(station, m.windDirection);
  return `
    <p class="meta small">${t('currentMeasurement')}${ageText ? ' · ' + ageText : ''}${station.altitude ? ` · ${station.altitude} ${t('elevAbbrev')}` : ''}</p>
    <div class="big-row">
      ${metricBox(t('labelWind'), m.windSpeedKmh != null ? `${formatWind(m.windSpeedKmh)}${m.windDirection ? ' ' + windArrowSkytech(m.windDirection) : ''}` : '—', wind)}
      ${metricBox(t('labelGustFull'), formatWind(m.windGustKmh))}
      ${metricBox(t('labelDirectionEst'), windArrowSkytech(m.windDirection) || '—', dirRating)}
      ${metricBox(t('labelTemp'), m.temperatureC != null ? `${m.temperatureC}°C` : '—')}
    </div>
  `;
}

async function loadStationHistory(stationId) {
  if (state.stationHistoryCache.has(stationId)) {
    return state.stationHistoryCache.get(stationId);
  }
  const res = await fetch(`data/history/${stationId}.json`, { cache: 'no-store' });
  if (!res.ok) throw new Error(t('historyUnavailable'));
  const data = await res.json();
  state.stationHistoryCache.set(stationId, data);
  return data;
}

function renderHistoryCharts(history) {
  if (!history || !history.ok || !history.measurements || history.measurements.length === 0) {
    el.historyModalBody.innerHTML = `<p class="meta small">${t('historyUnavailableRecent')}</p>`;
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
      <h4>${t('windChartTitle', unitLabel)}</h4>
      ${buildLineChartSvg({ series: windSeries, series2: gustSeries, color: '#55ffff', color2: '#ffaa00' })}
      ${buildDirectionArrowsSvg(dirSeries)}
      <p class="meta small">${t('arrowLegend')}</p>
      <div class="chart-legend">
        <span><span class="swatch" style="background:#55ffff"></span>${t('legendSpeed')}</span>
        <span><span class="swatch" style="background:#ffaa00"></span>${t('legendGust')}</span>
      </div>
    </div>
    <div class="chart-block">
      <h4>${t('tempChartTitle')}</h4>
      ${buildLineChartSvg({ series: tempSeries, color: '#ff5555', unit: '°' })}
    </div>
    <p class="meta small">${t('lastMeasurements', m.length, hoursSpan)}</p>
  `;
}

function closeHistoryModal() {
  el.historyModalOverlay.hidden = true;
  state.currentHistoryStationId = null;
}

function openHistoryModal(stationId, stationName, station) {
  state.currentHistoryStationId = stationId;
  el.historyModalTitle.textContent = stationName || t('stationDefaultTitle');
  el.historyModalSnapshot.innerHTML = station ? renderStationSnapshot(station) : '';
  el.historyModalBody.innerHTML = `<p class="meta small">${t('loadingHistory')}</p>`;
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
  // s.id je iz JSON-a (številka), stationId pa iz DOM data-atributa (vedno
  // niz) - primerjava mora biti tolerantna na tip, sicer se snapshot v
  // oknu ne izriše, ker ujemanja ni (String(5) !== 5).
  const station = stations.find((s) => String(s.id) === String(stationId)) || null;
  openHistoryModal(stationId, stationName, station);
}

/**
 * Klik na vrstico "bližnje postaje" na osnovni strani (ne na zemljevidu)
 * mora poleg podrobnosti (openStationDetail, graf zgodovine) tudi takoj
 * posodobiti veter/temperaturo na glavni kartici "trenutno stanje" - da
 * uporabnik vidi podatek iz DEJANSKO kliknjene postaje, ne le tiste,
 * privzeto dodeljene vzletišču (ali splošne ARSO napovedi, če vzletišče
 * nima potrjene lastne postaje).
 */
async function selectStationAsCurrent(stationId) {
  if (!state.lastData) return;
  const stations = await loadAllStations();
  const station = stations.find((s) => String(s.id) === String(stationId));
  if (!station || !station.measurement) return;
  state.lastData.skytech = buildSyntheticSkytech(station);
  state.lastData.stationMode = true;
  renderCurrent(state.lastData);
}

/* ---------- Podrobnosti termike (klik na kartico termike) ---------- */

const THERMAL_LEVEL_RANK = { gray: 1, blue: 1, green: 2, orange: 3 };
const THERMAL_LEVEL_KEYS = { 1: 'thermalWeak', 2: 'thermalGood', 3: 'thermalSharp' };

function buildThermalLineSvg(entries) {
  const series = entries
    .filter((e) => e.time)
    .map((e) => ({ time: e.time, value: THERMAL_LEVEL_RANK[e.thermal && e.thermal.color] || null }));
  if (series.length === 0) return `<p class="meta small">${t('noChartData')}</p>`;
  return buildLineChartSvg({
    series,
    color: '#ffaa00',
    yLabelFormatter: (v) => t(THERMAL_LEVEL_KEYS[Math.min(3, Math.max(1, Math.round(v)))]) || '',
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
          <h4>${t('ourHourlyEstimate', formatDayLabel(day.date))}</h4>
          ${buildThermalLineSvg(entries)}
        </div>
      `;
    })
    .join('');
}

function openArsoThermalDetailModal() {
  const thermalData = state.lastData && state.lastData.thermalForecastArso;
  if (!thermalData || !thermalData.items || thermalData.items.length === 0) return;
  state.currentHistoryStationId = null;
  el.historyModalTitle.textContent = t('thermalModalTitle', thermalData.regionLabel);
  el.historyModalSnapshot.innerHTML = '';
  el.historyModalBody.innerHTML =
    `<h4>${t('officialArsoForecast')}</h4>` +
    thermalData.items
      .map(
        (item) => `
    <div class="big-stat" style="margin-bottom:10px;">
      <div class="label">${item.date}</div>
      <div class="value">${item.climbMs} m/s</div>
      <div class="thermal-swatch" style="background:${item.color}"></div>
      ${item.issued ? `<p class="meta small" style="margin-top:8px;">${t('issuedOn', item.issued)}</p>` : ''}
      ${item.link ? `<p><a href="${item.link}" target="_blank" rel="noopener">${t('viewOnArsoSite')}</a></p>` : ''}
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
        // Uradno vzletišče ima svojo stran (loadWeatherForSite) - klik
        // nanj naj takoj pokaže TO stran (z živo postajo, če jo ima,
        // enako kot privzeto izbrano vzletišče ob zagonu), ne pa splošni
        // "Moja lokacija" GPS-način (ki živih podatkov ne prikaže
        // prioritetno, glej useLive spodaj) - prej je bila edina pot do
        // izbire drugega vzletišča padajoči seznam, ki je bil odstranjen.
        closeMapPicker();
        loadWeatherForSite(site.id);
      });
  }
}

/**
 * Vse SkyTech postaje na zemljevidu (ne le tiste z meritvijo v zadnjih
 * 24h). Izloči samo znane pokvarjene privzete
 * koordinate (altitude 0). Postaje brez sveže meritve so vizualno ločene
 * (.map-pin-station-stale).
 */
async function addStationMarkersToMapPicker() {
  const stations = await loadAllStations();
  if (!mapPickerMap) return;
  const liveIcon = L.divIcon({
    html: '<div class="map-pin map-pin-station">📡</div>',
    className: 'map-pin-wrapper',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
  const staleIcon = L.divIcon({
    html: '<div class="map-pin map-pin-station map-pin-station-stale">📡</div>',
    className: 'map-pin-wrapper',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
  const now = Date.now();
  for (const s of stations) {
    if (typeof s.lat !== 'number' || typeof s.lon !== 'number') continue;
    if (s.altitude === 0) continue;
    const ageMinutes = s.measurement && s.measurement.time ? Math.round((now - new Date(s.measurement.time).getTime()) / 60000) : null;
    const isLive = ageMinutes != null && ageMinutes <= NEARBY_MAX_AGE_MINUTES;
    L.marker([s.lat, s.lon], { icon: isLive ? liveIcon : staleIcon, zIndexOffset: isLive ? 300 : 200 })
      .addTo(mapPickerMap)
      .on('click', () => {
        mapPickerSelectedStation = s;
        setMapPickerPoint(s.lat, s.lon, `📡 ${s.name}`);
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

function formatMapCoordsLabel(lat, lon, name) {
  const coords = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  return name ? t('selectedLocationNamed', name, coords) : t('selectedLocationCoords', coords);
}

function setMapPickerPoint(lat, lon, name) {
  mapPickerLatLng = { lat, lon };
  if (mapPickerMarker) {
    mapPickerMarker.setLatLng([lat, lon]);
  } else {
    mapPickerMarker = L.marker([lat, lon], { draggable: true }).addTo(mapPickerMap);
    mapPickerMarker.on('dragend', () => {
      const p = mapPickerMarker.getLatLng();
      mapPickerLatLng = { lat: p.lat, lon: p.lng };
      mapPickerSelectedStation = null;
      el.mapCoordsLabel.textContent = formatMapCoordsLabel(p.lat, p.lng, null);
    });
  }
  el.mapCoordsLabel.textContent = formatMapCoordsLabel(lat, lon, name);
  el.mapConfirmBtn.disabled = false;
}

function openMapPicker() {
  if (typeof L === 'undefined') {
    setStatus(t('mapLoadError'), 'error');
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

/**
 * Trend zračnega pritiska iz ARSO napovedi (data.forecast, polje
 * pressureHpa na vsakem 3h vnosu - že razčlenjeno v src/arso.js, doslej
 * pa nikjer prikazano). Primerja prvi razpoložljivi vnos s tistim ~24h
 * kasneje - padajoč pritisk je zgoden signal približevanja nizkega
 * pritiska/fronte, naraščajoč pa krepitve območja visokega pritiska.
 * Neodvisno od žive SkyTech postaje (ta pritiska ne meri) - vedno iz
 * ARSO napovedi, ne glede na useLive/stationMode.
 */
function computePressureTrend(days) {
  const entries = [];
  for (const day of days || []) {
    for (const e of day.timeline || []) {
      if (e.pressureHpa != null && e.time) entries.push({ ms: new Date(e.time).getTime(), hpa: e.pressureHpa });
    }
  }
  if (entries.length === 0) return null;
  entries.sort((a, b) => a.ms - b.ms);
  const start = entries[0];
  const targetMs = start.ms + 24 * 3600 * 1000;
  let end = entries[entries.length - 1];
  for (const e of entries) {
    if (e.ms >= targetMs) {
      end = e;
      break;
    }
  }
  const hours = Math.round((end.ms - start.ms) / 3600000);
  const deltaHpa = hours >= 3 ? Math.round((end.hpa - start.hpa) * 10) / 10 : 0;
  return { currentHpa: Math.round(start.hpa), deltaHpa, hours };
}

function renderPressureTrend(data) {
  const trend = computePressureTrend(data.forecast);
  if (!trend || trend.hours < 3) return '';
  const { currentHpa, deltaHpa, hours } = trend;
  let note;
  if (deltaHpa <= -6) note = t('pressureFallingFast', deltaHpa, hours);
  else if (deltaHpa <= -2) note = t('pressureFalling', deltaHpa, hours);
  else if (deltaHpa >= 6) note = t('pressureRisingFast', deltaHpa, hours);
  else if (deltaHpa >= 2) note = t('pressureRising', deltaHpa, hours);
  else note = t('pressureSteady');
  const arrow = deltaHpa <= -2 ? ' ↓' : deltaHpa >= 2 ? ' ↑' : '';
  return `<p class="meta">${t('labelPressure')}: ${currentHpa} hPa${arrow} · ${note}</p>`;
}

function renderCurrent(data) {
  el.siteName.textContent = data.myLocationMode ? t('myLocation') : data.site.name;
  const arsoSourceName = data.arsoLocationName || data.site.name;
  const arsoSourceKm = data.arsoLocationDistanceKm != null ? data.arsoLocationDistanceKm : data.distanceKm;
  const regionText = data.myLocationMode
    ? data.stationMode
      ? t('selectedLiveStation', data.skytech.stationName, arsoSourceName, arsoSourceKm)
      : t('nearestArsoSource', arsoSourceName, arsoSourceKm)
    : t('regionElevation', data.site.region, data.site.elevation);
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
  const source = useLive ? t('liveMeasurementSource', sk.stationName) : t('arsoForecastSource');

  // Smer je iz žive SkyTech postaje (useLive, angleške kratice) ali iz
  // ARSO napovedi (slovenske kratice) - izbira pravi slovar glede na vir.
  const dirArrow = useLive ? windArrowSkytech(windDir) : windArrow(windDir);

  el.currentStats.innerHTML = `
    <div class="big-stat"><div class="label">${t('labelWind')}</div><div class="value">${formatWind(windSpeed)}</div></div>
    <div class="big-stat"><div class="label">${t('labelGust')}</div><div class="value">${formatWind(windGust)}</div></div>
    <div class="big-stat"><div class="label">${t('labelDirection')}</div><div class="value">${dirArrow || '—'}</div></div>
    <div class="big-stat"><div class="label">${t('labelTemp')}</div><div class="value">${temp != null ? Math.round(temp) + '°C' : '—'}</div></div>
  `;

  const verdictParts = [];
  if (windRating) verdictParts.push(`<span class="${pillClass(windRating.color)}">${translateRatingLabel(windRating.label)}</span>`);
  if (dirRating && (data.stationMode || !data.myLocationMode)) verdictParts.push(`<span class="${pillClass(dirRating.color)}">${translateRatingLabel(dirRating.label)}</span>`);
  el.verdicts.innerHTML =
    verdictParts.join('') + renderPressureTrend(data) + `<p class="meta" style="margin-top:10px;">${t('sourceLabel', source)}</p>`;

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
  const thermalData = data.thermalForecastArso;
  if (!thermalData || !thermalData.ok || !thermalData.items || thermalData.items.length === 0) {
    el.thermalBlock.hidden = true;
    return;
  }
  el.thermalMeta.textContent = t('regionMaxClimb', thermalData.regionLabel);
  el.thermalStats.innerHTML = thermalData.items
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
      <span>${s.windSpeedKmh != null ? formatWind(s.windSpeedKmh) + ' ' + windArrowSkytech(s.windDirection) : '—'}</span>
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
  el.forecastMeta.textContent = arsoSourceName ? t('windForecastSource', arsoSourceName) : '';
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
        ? t('windUpTo', formatWind(windPeak.windSpeedKmh), windPeak.windDirection ? ' ' + windArrow(windPeak.windDirection) : '')
        : '—';
      return `
        <tr>
          <td>${formatDayLabel(day.date)}</td>
          <td>${tMin !== null ? tMin + '–' + tMax + '°C' : '—'}</td>
          <td>${windText}</td>
          <td>${xc ? `<span class="${pillClass(xc.color)}">${translateRatingLabel(xc.label)}</span>` : '—'}</td>
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
    { href: links.arsoForecastPage, label: t('linkArsoForecast') },
    { href: links.arsoAviation, label: t('linkArsoAviation') },
    { href: links.arsoRadar, label: t('linkArsoRadar') },
    { href: links.windAloft, label: t('linkWindAloft') },
    { href: links.skytech, label: t('linkSkytech') },
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
  setStatus(t('loadingData'));
  try {
    const res = await fetch(`data/weather/${siteId}.json`, { cache: 'no-store' });
    if (!res.ok) throw new Error(t('siteDataUnavailable'));
    const data = await res.json();
    renderAll(data);
    setStatus(null);
  } catch (err) {
    setStatus(t('errLoadingData', err.message), 'error');
  }
}

/**
 * Iz surove SkyTech postaje (z .measurement) sestavi isti "skytech" objekt,
 * kot bi ga vrnil strežniški build za vzletiščem dodeljeno postajo - da ga
 * lahko renderCurrent prikaže kot glavni podatek za poljubno izbrano
 * postajo (klik na zemljevidu, na vrstico bližnje postaje ipd.).
 */
function buildSyntheticSkytech(station) {
  const m = station.measurement;
  const ageMinutes = m.time ? Math.round((Date.now() - new Date(m.time).getTime()) / 60000) : null;
  return {
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
}

/**
 * Če je uporabnik na zemljevidu izbral konkretno živo postajo (station),
 * njeno meritev prikažemo kot glavni "trenutno" podatek namesto splošne
 * ARSO napovedi za najbližje vzletišče - podatek že imamo.
 */
async function showMyLocationWeather(nearest, station) {
  setStatus(t('loadingWeatherData'));
  try {
    const res = await fetch(`data/weather/${nearest.site.id}.json`, { cache: 'no-store' });
    if (!res.ok) throw new Error(t('dataUnavailable'));
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
      data.skytech = buildSyntheticSkytech(station);
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
    setStatus(t('errLoadingData', err.message), 'error');
  }
}

/**
 * Skupna pot za "uporabi to GPS točko" - iz pravega GPS-a (locateBtn)
 * ali z izbiro na zemljevidu (mapConfirmBtn).
 */
function useLocation(lat, lon, station) {
  state.userCoords = { lat, lon };
  const nearest = findNearestSite(lat, lon);
  if (nearest.site) {
    showMyLocationWeather(nearest, station);
  } else {
    setStatus(t('noNearbySite'), 'error');
  }
}

el.locateBtn.addEventListener('click', () => {
  if (!('geolocation' in navigator)) {
    setStatus(t('geoNotSupported'), 'error');
    return;
  }
  setStatus(t('searchingLocation'));
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      setStatus(null);
      useLocation(pos.coords.latitude, pos.coords.longitude);
    },
    () => setStatus(t('geoDenied'), 'error'),
    { enableHighAccuracy: true, timeout: 10000 }
  );
});

function updateUnitButtons() {
  el.unitMsBtn.setAttribute('aria-pressed', state.windUnit === 'ms' ? 'true' : 'false');
  el.unitKmhBtn.setAttribute('aria-pressed', state.windUnit === 'kmh' ? 'true' : 'false');
}

function setWindUnit(unit) {
  state.windUnit = unit;
  try {
    localStorage.setItem(WIND_UNIT_STORAGE_KEY, state.windUnit);
  } catch (_) {
    /* ni kritično, spregledamo */
  }
  updateUnitButtons();
  if (state.lastData) {
    renderCurrent(state.lastData);
    renderNearby(state.lastData);
    renderForecast(state.lastData);
  }
  if (state.currentHistoryStationId && state.stationHistoryCache.has(state.currentHistoryStationId)) {
    renderHistoryCharts(state.stationHistoryCache.get(state.currentHistoryStationId));
  }
}

el.unitMsBtn.addEventListener('click', () => setWindUnit('ms'));
el.unitKmhBtn.addEventListener('click', () => setWindUnit('kmh'));

function updateLangButtons() {
  el.langSiBtn.setAttribute('aria-pressed', state.lang === 'sl' ? 'true' : 'false');
  el.langEnBtn.setAttribute('aria-pressed', state.lang === 'en' ? 'true' : 'false');
}

function setLang(lang) {
  state.lang = lang;
  try {
    localStorage.setItem(LANG_STORAGE_KEY, state.lang);
  } catch (_) {
    /* ni kritično, spregledamo */
  }
  updateLangButtons();
  applyStaticTranslations();
  if (state.lastData) {
    renderAll(state.lastData);
  }
  if (state.currentHistoryStationId && state.stationHistoryCache.has(state.currentHistoryStationId)) {
    renderHistoryCharts(state.stationHistoryCache.get(state.currentHistoryStationId));
  }
}

el.langSiBtn.addEventListener('click', () => setLang('sl'));
el.langEnBtn.addEventListener('click', () => setLang('en'));

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
  selectStationAsCurrent(row.dataset.stationId);
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
    updateUnitButtons();
    updateLangButtons();
    applyStaticTranslations();
    await loadSites();
    if (state.sites.length > 0) {
      await loadWeatherForSite(state.sites[0].id);
    }
  } catch (err) {
    setStatus(t('errLoadingGeneric', err.message), 'error');
  }
})();
