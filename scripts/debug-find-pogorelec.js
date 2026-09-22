'use strict';
const { fetchAllStations } = require('../src/skytech');

async function main() {
  const res = await fetchAllStations();
  console.log('ok:', res.ok, 'stevilo postaj:', res.stations.length);
  const matches = res.stations.filter((s) => /pogorelec|mirna|trebnje|mokronog|dolenj|sentrupert|šentrupert/i.test(s.name));
  console.log('Ujemanja (pogorelec/mirna/trebnje/mokronog/dolenj/sentrupert):');
  for (const s of matches) {
    console.log(JSON.stringify(s, null, 2));
  }
  if (matches.length === 0) {
    console.log('NI NAJDENO - izpisujem vsa imena postaj za rocni pregled:');
    for (const s of res.stations) {
      console.log(s.id, s.name, s.lat, s.lon, s.altitude);
    }
  }
}

main().catch((err) => {
  console.error('NAPAKA', err);
  process.exitCode = 1;
});
