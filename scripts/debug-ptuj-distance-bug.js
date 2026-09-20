'use strict';

/**
 * ZAČASNO: uporabnik (fizično v Šmarju/Šentrupertu na Dolenjskem) je na
 * telefonu videl "Letališče Ptuj" in "Žetale-Log" v seznamu "bližnjih"
 * postaj na 14 km - v resnici sta obe v vzhodni Štajerski, ~80-100 km
 * stran. Obe imata tudi absurdno stare meritve (pred ~7 mesecev / ~2.2
 * leti). Izpiše surove koordinate/starost teh dveh + splošen pregled,
 * koliko postaj ima zelo staro meritev (kandidati za enak vzorec kot
 * "Kranjska gora", id 46).
 */

const { fetchAllStations } = require('../src/skytech');
const { haversineKm } = require('../src/geo');

// Znane realne (Wikipedia/OSM) koordinate za primerjavo.
const REAL = {
  ptuj: { lat: 46.4189, lon: 15.8697 },
  zetale: { lat: 46.3103, lon: 15.8206 },
  sentrupert: { lat: 45.9983, lon: 15.0392 }, // občina Šentrupert (Dolenjska)
};

async function main() {
  const result = await fetchAllStations();
  if (!result.ok) {
    console.log('NAPAKA pri pridobivanju postaj:', result.error);
    return;
  }
  console.log(`Skupaj postaj: ${result.stations.length}`);

  const matches = result.stations.filter((s) => /ptuj|žetale|zetale/i.test(s.name));
  console.log('\nUjemajoče postaje (surovi podatki):');
  for (const s of matches) {
    const ageMin = s.measurement && s.measurement.time
      ? Math.round((Date.now() - new Date(s.measurement.time).getTime()) / 60000)
      : null;
    console.log(JSON.stringify({
      id: s.id, name: s.name, lat: s.lat, lon: s.lon, altitude: s.altitude,
      measurementTime: s.measurement && s.measurement.time, ageMin,
    }));
  }

  console.log('\nRazdalja od znanih realnih točk do teh postaj (glede na PRIJAVLJENE koordinate v API-ju):');
  for (const s of matches) {
    if (typeof s.lat !== 'number' || typeof s.lon !== 'number') continue;
    for (const [label, coord] of Object.entries(REAL)) {
      const d = haversineKm(coord.lat, coord.lon, s.lat, s.lon);
      console.log(`${label} -> ${s.name} (prijavljene koordinate): ${d.toFixed(1)} km`);
    }
  }

  console.log('\nRazdalja med REALNIM Ptujem/Žetalami in REALNIM Šentrupertom (za referenco, kolikšna bi morala biti):');
  console.log('Šentrupert -> realni Ptuj:', haversineKm(REAL.sentrupert.lat, REAL.sentrupert.lon, REAL.ptuj.lat, REAL.ptuj.lon).toFixed(1), 'km');
  console.log('Šentrupert -> realne Žetale:', haversineKm(REAL.sentrupert.lat, REAL.sentrupert.lon, REAL.zetale.lat, REAL.zetale.lon).toFixed(1), 'km');

  console.log('\nVse postaje s starostjo meritve > 24h (kandidati za "zombi" postaje):');
  const now = Date.now();
  let staleCount = 0;
  for (const s of result.stations) {
    if (!s.measurement || !s.measurement.time) continue;
    const ageMin = Math.round((now - new Date(s.measurement.time).getTime()) / 60000);
    if (ageMin > 24 * 60) {
      staleCount++;
      console.log(JSON.stringify({ id: s.id, name: s.name, lat: s.lat, lon: s.lon, altitude: s.altitude, ageMin }));
    }
  }
  console.log(`Skupaj zastarelih (>24h) postaj: ${staleCount} od ${result.stations.length}`);
}

main();
