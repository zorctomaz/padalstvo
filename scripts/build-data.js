'use strict';

/**
 * Zgradi statične JSON podatke za GitHub Pages (brez strežnika).
 * Za vsako vzletišče iz src/sites.json pridobi ARSO + opendata.si podatke
 * in jih zapiše v public/data/weather/<siteId>.json, tako da jih frontend
 * lahko naloži z navadnim fetch() na statičnem gostovanju.
 *
 * Poganja se ročno (`npm run build:data`) ali periodično prek
 * .github/workflows/update-data.yml (GitHub Actions).
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const sites = require('../src/sites.json');
const { fetchArsoForecast } = require('../src/arso');
const { fetchOpendataReport } = require('../src/opendata');
const { buildParaglidingSummary, buildGenericLocationForecast } = require('../src/paragliding');
const { fetchAllStations, fetchStationHistory } = require('../src/skytech');
const { fetchAllThermalRegions, REGION_CENTERS } = require('../src/arso-thermal');
const { ARSO_LOCATIONS } = require('../src/arso-locations');
const { fetchSynopticChartSequence } = require('../src/ecmwf');

const DATA_DIR = path.join(__dirname, '..', 'public', 'data');
const WEATHER_DIR = path.join(DATA_DIR, 'weather');
const HISTORY_DIR = path.join(DATA_DIR, 'history');
const ARSO_DIR = path.join(DATA_DIR, 'arso');
const HISTORY_LEN = 100; // API max (glej src/skytech.js) - ~16-17h pri poročanju vsakih ~10 min, ne polnih 24h

/**
 * Kratka identifikacija trenutno objavljenega koda (git commit), da
 * uporabnik na strani vidi, ali so njegove spremembe že deployane.
 * V GitHub Actions je GITHUB_SHA vedno na voljo; lokalno pade nazaj na
 * `git rev-parse`.
 */
function getVersion() {
  if (process.env.GITHUB_SHA) {
    return process.env.GITHUB_SHA.slice(0, 7);
  }
  try {
    return execSync('git rev-parse --short HEAD', { cwd: path.join(__dirname, '..') })
      .toString()
      .trim();
  } catch (_) {
    return null;
  }
}

/**
 * Doda/posodobi "cache-busting" poizvedbo (?v=<verzija>) na css/js
 * povezavah v index.html, da brskalniki in vmesni predpomnilniki
 * (GitHub Pages CDN) po vsakem deployu nujno naložijo sveže datoteke
 * namesto morebitne stare predpomnjene različice.
 */
function addCacheBusting(version, htmlPath) {
  const v = version || String(Date.now());
  let html = fs.readFileSync(htmlPath, 'utf8');
  html = html.replace(/(href="css\/[^"?]+\.css)(\?v=[^"]*)?(")/g, `$1?v=${v}$3`);
  html = html.replace(/(src="js\/[^"?]+\.js)(\?v=[^"]*)?(")/g, `$1?v=${v}$3`);
  fs.writeFileSync(htmlPath, html);
}

async function buildSite(site, stationById, allStations, thermalRegions) {
  const [arsoResult, opendataResult] = await Promise.allSettled([
    fetchArsoForecast(site.arsoLocation),
    fetchOpendataReport(site.lat, site.lon),
  ]);
  const skytechStation = site.skytechStationId != null ? stationById.get(site.skytechStationId) || null : null;
  const thermalForecastArso = site.aladinRegion ? thermalRegions[site.aladinRegion] || null : null;
  const summary = buildParaglidingSummary({
    site,
    distanceKm: null,
    arsoResult,
    opendataResult,
    skytechStation,
    allStations,
    thermalForecastArso,
  });
  return summary;
}

/**
 * Napoved za vsak ARSO-podprt kraj posebej (glej src/arso-locations.js),
 * NE za posamezno vzletišče - za "Moja lokacija"/izbiro na zemljevidu,
 * kjer mora biti uradna ARSO napoved prikazana za kraj, ki je najbližji
 * uporabnikovi DEJANSKI GPS točki, ne za kraj, ki je dodeljen najbližjemu
 * URADNEMU vzletišču (site.arsoLocation je izbran za to vzletišče, ni
 * nujno najbližji poljubni drugi točki v okolici).
 *
 * fetchArsoForecast() rezultate predpomni po URL-ju (glej src/fetchUtil.js,
 * TTL 10 min > trajanje celotne izgradnje) - klici za imena, ki jih
 * uporablja tudi kakšno vzletišče (npr. "Ljubljana"), zato ne podvojijo
 * omrežnega klica.
 */
async function buildArsoLocations() {
  fs.mkdirSync(ARSO_DIR, { recursive: true });
  const manifest = [];
  let ok = 0;
  for (const loc of ARSO_LOCATIONS) {
    const arsoResult = await fetchArsoForecast(loc.name);
    const forecast = buildGenericLocationForecast(arsoResult, loc);
    fs.writeFileSync(path.join(ARSO_DIR, `${loc.slug}.json`), JSON.stringify(forecast, null, 2));
    manifest.push({ name: loc.name, slug: loc.slug, lat: loc.lat, lon: loc.lon, ok: forecast.ok });
    if (forecast.ok) ok++;
  }
  fs.writeFileSync(
    path.join(DATA_DIR, 'arso-locations.json'),
    JSON.stringify({ generatedAt: new Date().toISOString(), locations: manifest }, null, 2)
  );
  return { ok, total: ARSO_LOCATIONS.length };
}

async function buildStationHistories(stationIds) {
  fs.mkdirSync(HISTORY_DIR, { recursive: true });
  let ok = 0;
  let failed = 0;
  for (const id of stationIds) {
    const result = await fetchStationHistory(id, HISTORY_LEN);
    fs.writeFileSync(
      path.join(HISTORY_DIR, `${id}.json`),
      JSON.stringify({ stationId: id, generatedAt: new Date().toISOString(), ...result }, null, 2)
    );
    if (result.ok) ok++;
    else failed++;
  }
  return { ok, failed };
}

async function main() {
  fs.mkdirSync(WEATHER_DIR, { recursive: true });

  const version = getVersion();
  const publicDir = path.join(__dirname, '..', 'public');
  addCacheBusting(version, path.join(publicDir, 'index.html'));

  fs.writeFileSync(path.join(DATA_DIR, 'sites.json'), JSON.stringify(sites, null, 2));

  // En sam klic za VSE SkyTech postaje (API to izrecno priporoča namesto
  // klica na postajo), nato jih po id-ju razdelimo dodeljenim vzletiščem.
  process.stdout.write('Pridobivam SkyTech postaje... ');
  const skytech = await fetchAllStations();
  console.log(
    skytech.ok
      ? `OK (${skytech.stations.length} postaj)`
      : `NAPAKA(${skytech.error})`
  );
  const stationById = new Map(skytech.stations.map((s) => [s.id, s]));

  // Javno objavimo tudi celoten seznam postaj (brez tokena - ta ostane
  // samo v okoljski spremenljivki/GitHub secret). To frontend-u omogoči,
  // da za poljubno GPS točko (npr. "Moja lokacija", ki ni uradno
  // vzletišče) v brskalniku sam izračuna bližnje žive postaje, namesto da
  // bi bil omejen na tiste, prevnaprej izračunane za 12 uradnih vzletišč.
  fs.writeFileSync(
    path.join(DATA_DIR, 'skytech-stations.json'),
    JSON.stringify({ generatedAt: skytech.generatedAt || null, stations: skytech.stations }, null, 2)
  );

  // En sam klic za vsako od 6 letalskih regij (glej src/arso-thermal.js),
  // nato jih po site.aladinRegion razdelimo vzletiščem - stran priporoča
  // ločene RSS vire po regiji, ne po posamezni točki.
  process.stdout.write('Pridobivam uradno ARSO napoved termike (6 regij)... ');
  const thermalRegions = await fetchAllThermalRegions();
  const thermalOk = Object.values(thermalRegions).filter((r) => r.ok).length;
  console.log(`OK(${thermalOk}/6)`);

  // Javno objavimo tudi vseh 6 regij + njihova središča (isti podatki kot
  // zgoraj, samo skupaj) - frontend jih uporabi za "Moja lokacija"/klik na
  // zemljevidu, kjer si NE sme izposoditi regije najbližjega URADNEGA
  // vzletišča (ta je lahko v drugi regiji kot uporabnikova dejanska
  // točka), ampak mora sam izračunati najbližjo regijo iz pravih koordinat.
  fs.writeFileSync(
    path.join(DATA_DIR, 'thermal-regions.json'),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        regions: Object.fromEntries(
          Object.entries(thermalRegions).map(([code, r]) => [code, { ...r, center: REGION_CENTERS[code] || null }])
        ),
      },
      null,
      2
    )
  );

  process.stdout.write(`Pridobivam ARSO napoved za ${ARSO_LOCATIONS.length} podprtih krajev (za "Moja lokacija")... `);
  const arsoLocationsResult = await buildArsoLocations();
  console.log(`OK(${arsoLocationsResult.ok}/${arsoLocationsResult.total})`);

  // Ena sama sekvenca (zdaj/+24h/+48h) za celotno aplikacijo (ni vezana na
  // posamezno vzletišče) - en klic, nato deljen med vsemi vzletišči spodaj
  // (glej src/ecmwf.js).
  process.stdout.write('Pridobivam ECMWF sinoptične karte (zdaj/+24h/+48h, MSLP + veter 850 hPa)... ');
  const synopticChartFrames = await fetchSynopticChartSequence();
  console.log(`OK(${synopticChartFrames.length}/3)`);

  const results = [];
  const relevantStationIds = new Set();
  for (const site of sites) {
    process.stdout.write(`Gradim podatke za ${site.name} (${site.id})... `);
    try {
      const summary = await buildSite(site, stationById, skytech.stations, thermalRegions);
      summary.synopticChartFrames = synopticChartFrames;
      fs.writeFileSync(
        path.join(WEATHER_DIR, `${site.id}.json`),
        JSON.stringify(summary, null, 2)
      );
      const ok = summary.sources.arso.ok || summary.sources.opendata.ok;
      const dayCount = summary.forecast.length;
      const firstEntry = summary.forecast[0] && summary.forecast[0].timeline[0];
      const sk = summary.skytech;
      console.log(
        `ARSO=${summary.sources.arso.ok ? 'OK' : 'NAPAKA(' + summary.sources.arso.error + ')'} ` +
        `opendata=${summary.sources.opendata.ok ? 'OK' : 'NAPAKA(' + summary.sources.opendata.error + ')'} ` +
        `skytech=${sk ? (sk.hasMeasurement ? `OK(${sk.windSpeedKmh}km/h ${sk.windDirection}, ${sk.ageMinutes}min)` : 'brez meritve') : '-'} ` +
        `bližnje_postaje=${summary.nearbyStations.length} ` +
        `dnevi=${dayCount} prvi=${firstEntry ? `${firstEntry.temperatureC}°C/${firstEntry.windSpeedKmh}km/h ${firstEntry.windDirection || ''}` : 'ni podatka'}`
      );
      results.push({ id: site.id, ok, dayCount });

      if (site.skytechStationId != null) relevantStationIds.add(site.skytechStationId);
      for (const s of summary.nearbyStations) relevantStationIds.add(s.stationId);
    } catch (err) {
      console.log('NAPAKA: ' + err.message);
      results.push({ id: site.id, ok: false, error: err.message });
    }
  }

  // Zgodovina (za graf vetra/temperature "zadnjih nekaj ur" ob kliku na
  // postajo) - samo za postaje, ki se dejansko kjerkoli prikažejo (glavne
  // dodeljene + vse "bližnje" pri katerem koli vzletišču), ne za vseh 62,
  // da ne obremenimo omejitve klicev API-ja po nepotrebnem.
  process.stdout.write(`Pridobivam zgodovino za ${relevantStationIds.size} postaj... `);
  const historyResult = await buildStationHistories(relevantStationIds);
  console.log(`OK(${historyResult.ok}) NAPAKA(${historyResult.failed})`);

  fs.writeFileSync(
    path.join(DATA_DIR, 'meta.json'),
    JSON.stringify({ generatedAt: new Date().toISOString(), version, results }, null, 2)
  );

  const failed = results.filter((r) => !r.ok);
  if (failed.length === results.length) {
    console.error('Vsi viri so spodleteli za vsa vzletišča – preveri omrežni dostop.');
    process.exitCode = 1;
  }
}

main();
