'use strict';
const https = require('https');

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'padalstvo-vreme/1.0 (+https://github.com/)' } }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', reject);
  });
}

async function main() {
  // 1) Raw ARSO forecast3h JSON - preveri VSA polja v enem timeline vnosu,
  // ne le tista, ki jih src/arso.js trenutno pozna - morda obstajajo
  // skrita polja za veter na višini/tlačnih nivojih.
  const res1 = await fetchText('https://vreme.arso.gov.si/api/1.0/location/?location=Ljubljana');
  console.log('=== forecast3h status:', res1.status, 'dolzina:', res1.body.length);
  try {
    const data = JSON.parse(res1.body);
    const feature = data.forecast3h.features[0];
    const day = feature.properties.days[0];
    const entry = day.timeline[0];
    console.log('VSA POLJA V ENEM TIMELINE VNOSU:');
    console.log(JSON.stringify(entry, null, 2));
  } catch (err) {
    console.log('napaka pri parsanju:', err.message);
  }

  // 2) ARSO letalska stran - morda vsebuje povezavo/vir za veter na
  // višini (SIGWX/wind chart), podobno kot termika RSS.
  const res2 = await fetchText('https://www.meteo.si/met/sl/aviation/');
  console.log('\n=== aviation stran status:', res2.status, 'dolzina:', res2.body.length);
  const links = [...res2.body.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
  const relevant = links.filter((l) => /wind|veter|sigwx|gafor|temsi|upper|visin/i.test(l));
  console.log('Relevantne povezave (veter/sigwx/gafor/temsi/višina):');
  console.log(relevant.join('\n'));

  // 3) Windy API ali podobno - samo preverimo, ali aplikacija ze linka na Windy (obstojece)
  console.log('\n=== Iscemo ARSO "veter na visini" html vsebino ===');
  const windMatches = res2.body.match(/[^<>]{0,80}(veter na višini|veter na visini|wind aloft)[^<>]{0,80}/gi);
  console.log(windMatches ? windMatches.join('\n---\n') : 'ni najdeno v HTML besedilu');
}

main().catch((err) => {
  console.error('NAPAKA', err);
  process.exitCode = 1;
});
