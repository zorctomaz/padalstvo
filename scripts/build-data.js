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
const { buildParaglidingSummary } = require('../src/paragliding');
const { fetchAllStations } = require('../src/skytech');

const DATA_DIR = path.join(__dirname, '..', 'public', 'data');
const WEATHER_DIR = path.join(DATA_DIR, 'weather');

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

async function buildSite(site, stationById, allStations) {
  const [arsoResult, opendataResult] = await Promise.allSettled([
    fetchArsoForecast(site.arsoLocation),
    fetchOpendataReport(site.lat, site.lon),
  ]);
  const skytechStation = site.skytechStationId != null ? stationById.get(site.skytechStationId) || null : null;
  const summary = buildParaglidingSummary({ site, distanceKm: null, arsoResult, opendataResult, skytechStation, allStations });
  return summary;
}

async function main() {
  fs.mkdirSync(WEATHER_DIR, { recursive: true });

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

  const results = [];
  for (const site of sites) {
    process.stdout.write(`Gradim podatke za ${site.name} (${site.id})... `);
    try {
      const summary = await buildSite(site, stationById, skytech.stations);
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
    } catch (err) {
      console.log('NAPAKA: ' + err.message);
      results.push({ id: site.id, ok: false, error: err.message });
    }
  }

  fs.writeFileSync(
    path.join(DATA_DIR, 'meta.json'),
    JSON.stringify({ generatedAt: new Date().toISOString(), version: getVersion(), results }, null, 2)
  );

  const failed = results.filter((r) => !r.ok);
  if (failed.length === results.length) {
    console.error('Vsi viri so spodleteli za vsa vzletišča – preveri omrežni dostop.');
    process.exitCode = 1;
  }
}

main();
