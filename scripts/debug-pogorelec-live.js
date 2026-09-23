'use strict';
const { fetchAllStations, fetchStationHistory } = require('../src/skytech');

async function main() {
  const res = await fetchAllStations();
  console.log('fetchAllStations ok:', res.ok, 'stevilo:', res.stations.length);
  const station = res.stations.find((s) => s.id === 70);
  console.log('Postaja 70 (Pogorelec):', JSON.stringify(station, null, 2));

  const hist = await fetchStationHistory(70, 20);
  console.log('Zgodovina postaje 70 ok:', hist.ok, 'stevilo meritev:', hist.measurements ? hist.measurements.length : null);
  if (hist.measurements) {
    console.log('Zadnjih 5 meritev:', JSON.stringify(hist.measurements.slice(-5), null, 2));
  }
  if (!hist.ok) {
    console.log('Napaka zgodovine:', hist.error);
  }
}

main().catch((err) => {
  console.error('NAPAKA', err);
  process.exitCode = 1;
});
