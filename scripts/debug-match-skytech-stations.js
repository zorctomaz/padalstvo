'use strict';
// Začasno: pridobi VSE SkyTech postaje in za vsako najino vzletišče predlaga
// najbližje kandidate (po razdalji), da lahko ročno potrdim skytechStationId
// v src/sites.json. Ne piše ničesar - samo izpiše predloge v dnevnik.

const sites = require('../src/sites.json');
const { fetchAllStations } = require('../src/skytech');
const { haversineKm } = require('../src/geo');

async function main() {
  const result = await fetchAllStations();
  if (!result.ok) {
    console.log('NAPAKA pri pridobivanju postaj:', result.error);
    process.exitCode = 1;
    return;
  }
  console.log(`Skupno postaj: ${result.stations.length}\n`);

  for (const site of sites) {
    const withDist = result.stations
      .filter((s) => s.lat != null && s.lon != null)
      .map((s) => ({ s, d: haversineKm(site.lat, site.lon, s.lat, s.lon) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 3);

    console.log(`--- ${site.name} (${site.id}) @ ${site.lat},${site.lon} ---`);
    for (const { s, d } of withDist) {
      const m = s.measurement;
      console.log(
        `  id=${s.id} "${s.name}" (${d.toFixed(1)} km, ${s.altitude}m) ` +
        `green=[${s.directionsGreen.join(',')}] ` +
        (m ? `zadnja meritev: ${m.windSpeedKmh ?? '?'}km/h ${m.windDirection ?? '?'} @ ${m.time}` : 'brez meritve')
      );
    }
    console.log();
  }
}

main();
