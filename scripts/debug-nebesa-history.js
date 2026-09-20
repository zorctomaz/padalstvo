'use strict';

/**
 * ZAČASNO: uporabnik javi, da na naši strani pri postaji "Nebesa nad
 * Šentrupertom" (id 27) ne vidi podatkov (graf zgodovine prazen), čeprav
 * skytech.si za to postajo podatke prikazuje. Preveri surov API odgovor
 * za to postajo (?id=27) in primerja z rezultatom naše
 * fetchStationHistory().
 */

const { fetchStationHistory } = require('../src/skytech');

async function main() {
  const token = process.env.SKYTECH_API_TOKEN;
  console.log('=== Surov API klic ?id=27&len=48 ===');
  const res = await fetch('https://api.kok.si/aws_api_v2.php?id=27&len=48', {
    headers: { 'X-Api-Key': token, Accept: 'application/json' },
  });
  console.log('HTTP status:', res.status);
  const text = await res.text();
  console.log(text.slice(0, 3000));

  console.log('\n=== Naša fetchStationHistory(27, 48) ===');
  const history = await fetchStationHistory(27, 48);
  console.log('ok:', history.ok, 'error:', history.error);
  console.log('meritev:', history.measurements.length);
  console.log(JSON.stringify(history.measurements.slice(0, 5), null, 2));
  console.log('...');
  console.log(JSON.stringify(history.measurements.slice(-5), null, 2));
}

main();
