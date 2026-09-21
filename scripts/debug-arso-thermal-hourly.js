'use strict';

/**
 * Uporabnik želi termiko po urah (graf), kot je bilo vidno na njegovem
 * posnetku zaslona (ALADIN meteogram: termika/temperaturni gradient/baza
 * oblakov po urah, na regijo). Naš RSS vir (termika<REGIJA>.xml) ima le
 * EN podatek na dan (max. hitrost dviganj), brez urne ločljivosti.
 *
 * Ta skript preišče stran meteo.si/met/sl/aviation za morebiten URL vzorec
 * take urne slike/podatkov (ime datoteke z "aladin"/"termik"/regijo/datumom).
 */

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (padalstvo-vreme debug script)' },
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, text };
}

async function main() {
  const url = 'https://meteo.arso.gov.si/met/sl/aviation/';
  console.log('=== ' + url + ' ===');
  const { ok, status, text } = await fetchText(url);
  console.log('status:', status, 'ok:', ok, 'length:', text.length);
  if (!ok) return;

  // Poišči VSE reference na "aladin" (meteogram najverjetneje tako poimenovan)
  const aladinHits = new Set();
  const aladinRe = /[^"'\s]*aladin[^"'\s]*/gi;
  let m;
  while ((m = aladinRe.exec(text))) aladinHits.add(m[0]);
  console.log('\nURL-ji/nizi z "aladin":');
  [...aladinHits].forEach((s) => console.log('  ' + s));

  // Poišči skripte, ki morda dinamično nalagajo grafiko (JS datoteke z "aviation"/"termik"/"meteogram")
  const scriptRe = /<script[^>]*src=["']([^"']+)["']/gi;
  const scripts = [];
  while ((m = scriptRe.exec(text))) scripts.push(m[1]);
  console.log('\nVsi <script src>:');
  scripts.forEach((s) => console.log('  ' + s));

  // Kontekst okrog besede "meteogram" ali "graf" blizu termike
  const lower = text.toLowerCase();
  for (const needle of ['meteogram', 'thermal', 'dviganj']) {
    let idx = lower.indexOf(needle);
    let count = 0;
    while (idx !== -1 && count < 5) {
      console.log(`\nkontekst "${needle}" @${idx}:`, JSON.stringify(text.slice(Math.max(0, idx - 150), idx + 150)));
      idx = lower.indexOf(needle, idx + 1);
      count++;
    }
  }
}

main().catch((err) => console.log('NAPAKA:', err.message));
