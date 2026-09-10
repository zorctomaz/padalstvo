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

const sites = require('../src/sites.json');
const { fetchArsoForecast } = require('../src/arso');
const { fetchOpendataReport } = require('../src/opendata');
const { buildParaglidingSummary } = require('../src/paragliding');

const DATA_DIR = path.join(__dirname, '..', 'public', 'data');
const WEATHER_DIR = path.join(DATA_DIR, 'weather');

async function buildSite(site) {
  const [arsoResult, opendataResult] = await Promise.allSettled([
    fetchArsoForecast(site.arsoLocation),
    fetchOpendataReport(site.lat, site.lon),
  ]);
  const summary = buildParaglidingSummary({ site, distanceKm: null, arsoResult, opendataResult });
  return summary;
}

async function main() {
  fs.mkdirSync(WEATHER_DIR, { recursive: true });

  fs.writeFileSync(path.join(DATA_DIR, 'sites.json'), JSON.stringify(sites, null, 2));

  const results = [];
  for (const site of sites) {
    process.stdout.write(`Gradim podatke za ${site.name} (${site.id})... `);
    try {
      const summary = await buildSite(site);
      fs.writeFileSync(
        path.join(WEATHER_DIR, `${site.id}.json`),
        JSON.stringify(summary, null, 2)
      );
      const ok = summary.sources.arso.ok || summary.sources.opendata.ok;
      console.log(ok ? 'OK' : 'OPOZORILO: oba vira sta spodletela');
      results.push({ id: site.id, ok });
    } catch (err) {
      console.log('NAPAKA: ' + err.message);
      results.push({ id: site.id, ok: false, error: err.message });
    }
  }

  fs.writeFileSync(
    path.join(DATA_DIR, 'meta.json'),
    JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2)
  );

  const failed = results.filter((r) => !r.ok);
  if (failed.length === results.length) {
    console.error('Vsi viri so spodleteli za vsa vzletišča – preveri omrežni dostop.');
    process.exitCode = 1;
  }
}

main();
