'use strict';

/**
 * Začasen preiskovalni skript: uporabnik je poslal posnetek zaslona strani
 * meteo.si/met/sl/aviation, ki prikazuje uradno ARSO "Napoved termike" -
 * zemljevid Slovenije po regijah (Gorenjska/Primorska/Osrednja/Dolenjska/
 * Štajerska/Prekmurska) + ALADIN meteogram (temperaturni gradient, baza
 * oblakov, termika po urah) za vsako regijo. Ta skript poišče točne URL-je
 * teh slik/strani, da jih lahko integriramo namesto/poleg sedanje lastne
 * hevristike (estimateThermalIndex/estimateThermalWindow).
 *
 * Peskovnik agenta nima dostopa do arso.gov.si, zato to poganjamo prek
 * GitHub Actions (glej začasen korak v update-data.yml).
 */

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (padalstvo-vreme debug script)' },
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, text };
}

function extractSrcs(html, pattern) {
  const out = new Set();
  const re = /(?:src|href)\s*=\s*["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html))) {
    if (!pattern || pattern.test(m[1])) out.add(m[1]);
  }
  return [...out];
}

async function main() {
  // Najdeno v prejšnjem teku: RSS viri "Napoved termike" po regiji.
  // LES=Gorenjska, NGO=Primorska, LJU=Osrednja, NMO=Dolenjska (predvidoma
  // CEL=Štajerska/Celje, MSO=Prekmurska/Murska Sobota - preverimo spodaj).
  const rssUrl = 'https://meteo.arso.gov.si/uploads/probase/www/aviation/RSS/termikaLES.xml';
  console.log('\n=== RSS: ' + rssUrl + ' ===');
  try {
    const { ok, status, text } = await fetchText(rssUrl);
    console.log('status:', status, 'ok:', ok, 'length:', text.length);
    console.log(text);
  } catch (err) {
    console.log('NAPAKA:', err.message);
  }

  const candidates = [
    'https://meteo.arso.gov.si/met/sl/aviation/',
  ];

  for (const url of candidates) {
    console.log('\n=== ' + url + ' ===');
    try {
      const { ok, status, text } = await fetchText(url);
      console.log('status:', status, 'ok:', ok, 'length:', text.length);
      if (!ok) continue;

      const imgs = extractSrcs(text, /\.(png|jpe?g|gif)(\?|$)/i);
      console.log('slike (img/href .png/.jpg/.gif), prvih 40:');
      imgs.slice(0, 40).forEach((s) => console.log('  ' + s));

      const termikaHits = extractSrcs(text, /termik/i);
      console.log('URL-ji, ki vsebujejo "termik":');
      termikaHits.forEach((s) => console.log('  ' + s));

      // Poišči tudi besedilne omembe "termik" v okoliškem HTML-ju (npr. <a> nazivi zavihkov)
      const lower = text.toLowerCase();
      let idx = lower.indexOf('termik');
      let count = 0;
      while (idx !== -1 && count < 10) {
        console.log('kontekst @' + idx + ': ' + JSON.stringify(text.slice(Math.max(0, idx - 80), idx + 80)));
        idx = lower.indexOf('termik', idx + 1);
        count++;
      }
    } catch (err) {
      console.log('NAPAKA:', err.message);
    }
  }
}

main();
