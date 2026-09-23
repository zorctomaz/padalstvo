'use strict';

/**
 * Uporabnik želi, da SI/EN preklop na padalstvo.fotra.net izgleda enako
 * kot na matični strani fotra.net. Ta skript preišče fotra.net za
 * jezikovni preklopnik (hreflang povezave, elemente z besedilom
 * SI/EN/SLO/ENG, zastavice, značilne razrede).
 *
 * Peskovnik agenta nima dostopa do fotra.net, zato to teče tu prek
 * GitHub Actions.
 */

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (padalstvo-vreme lang-switch probe)' },
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, text, finalUrl: res.url };
}

function extractAll(html, re) {
  const out = new Set();
  let m;
  while ((m = re.exec(html))) out.add(m[0]);
  return [...out];
}

async function main() {
  const { ok, status, text, finalUrl } = await fetchText('https://fotra.net');
  console.log('status:', status, 'ok:', ok, 'finalUrl:', finalUrl, 'length:', text.length);
  if (!ok) return;

  console.log('\n=== hreflang links ===');
  extractAll(text, /<link[^>]*hreflang[^>]*>/gi).forEach((s) => console.log('  ' + s));

  console.log('\n=== elements mentioning SI/EN/SLO/ENG/English/Slovenščina (with context) ===');
  const re = /.{80}(?:\bSI\b|\bEN\b|\bSLO\b|\bENG\b|English|Slovenš|Sloven[cč]ina|slovenian|english).{80}/gi;
  let m;
  let count = 0;
  while ((m = re.exec(text)) && count < 40) {
    console.log('  ...' + m[0].replace(/\s+/g, ' ') + '...');
    count++;
  }

  console.log('\n=== flag emoji / flag image refs ===');
  extractAll(text, /(🇸🇮|🇬🇧|🇺🇸|flag-[a-z]{2}|flag_[a-z]{2}|\/flags\/[^"'\s]+|si\.(png|svg|gif)|gb\.(png|svg|gif)|en\.(png|svg|gif))/gi).forEach((s) =>
    console.log('  ' + s)
  );

  console.log('\n=== class names containing "lang" ===');
  extractAll(text, /class=["'][^"']*lang[^"']*["']/gi).forEach((s) => console.log('  ' + s));

  console.log('\n=== links to /en or ?lang= or similar ===');
  extractAll(text, /href=["'][^"']*(?:\/en\/?|lang=en|\/en$)[^"']*["']/gi).forEach((s) => console.log('  ' + s));

  console.log('\n=== header/nav snippet ===');
  const headerMatch = text.match(/<header[\s\S]*?<\/header>/i) || text.match(/<nav[\s\S]*?<\/nav>/i);
  console.log(headerMatch ? headerMatch[0].slice(0, 3000) : '(ni najdeno)');

  console.log('\n=== full body first 4000 chars (za primer, ce lang switch ni v header/nav) ===');
  const bodyMatch = text.match(/<body[^>]*>([\s\S]*)/i);
  console.log(bodyMatch ? bodyMatch[1].slice(0, 4000) : '(ni najdeno)');
}

main().catch((err) => console.log('NAPAKA:', err.message));
