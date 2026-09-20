'use strict';

/**
 * ZAČASNO: razišče prijavljeno napako - dve zelo oddaljeni SkyTech postaji
 * (Kranjska Gora, Nebesa nad Šentrupertom) naj bi bili od istega vzletišča
 * prikazani na skoraj enaki razdalji (~10 km), kar geografsko ni mogoče.
 * Izpiše surove lat/lon obeh postaj in izračunane razdalje do vseh vzletišč.
 */

const sites = require('../src/sites.json');
const { fetchAllStations } = require('../src/skytech');
const { haversineKm } = require('../src/geo');

async function main() {
  const result = await fetchAllStations();
  if (!result.ok) {
    console.log('NAPAKA pri pridobivanju postaj:', result.error);
    return;
  }
  console.log(`Skupaj postaj: ${result.stations.length}`);

  const matches = result.stations.filter((s) => /kranjska|nebesa/i.test(s.name));
  console.log('Ujemajoče postaje:');
  for (const s of matches) {
    console.log(JSON.stringify({ id: s.id, name: s.name, lat: s.lat, lon: s.lon, altitude: s.altitude, hasMeasurement: !!s.measurement }));
  }

  console.log('\nRazdalje od vsakega vzletišča do teh postaj:');
  for (const site of sites) {
    for (const s of matches) {
      if (typeof s.lat !== 'number' || typeof s.lon !== 'number') {
        console.log(`${site.id} -> ${s.name}: NI VELJAVNIH KOORDINAT (lat=${s.lat}, lon=${s.lon})`);
        continue;
      }
      const d = haversineKm(site.lat, site.lon, s.lat, s.lon);
      console.log(`${site.id} (${site.lat},${site.lon}) -> ${s.name} (${s.lat},${s.lon}): ${d.toFixed(1)} km`);
    }
  }

  // Za primerjavo: vseh nekaj postaj z njihovimi koordinatami, da preverimo splošno veljavnost lat/lon
  console.log('\nVzorec prvih 8 postaj (surove koordinate):');
  for (const s of result.stations.slice(0, 8)) {
    console.log(JSON.stringify({ id: s.id, name: s.name, lat: s.lat, lon: s.lon }));
  }
}

main();
