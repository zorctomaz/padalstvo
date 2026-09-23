'use strict';

/**
 * Prejšnji tek je za wetter3.de (znan amaterski meteo agregator, karte s
 * frontami za celotno Evropo/Balkan) vrnil "fetch failed" - lahko gre za
 * začasno napako, blokado po User-Agentu/IP-ju podatkovnega centra, ali
 * TLS/DNS težavo. Ta skript poskusi večkrat, z različnimi variantami
 * URL-ja in glavami, ter izpiše natančen vzrok napake.
 */

async function tryFetch(label, url, opts = {}) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      redirect: 'follow',
      ...opts,
    });
    const contentType = res.headers.get('content-type') || '';
    let length = 0;
    let preview = '';
    if (contentType.includes('text') || contentType.includes('html')) {
      const text = await res.text();
      length = text.length;
      preview = text.slice(0, 300).replace(/\s+/g, ' ');
    } else {
      const buf = await res.arrayBuffer();
      length = buf.byteLength;
      preview = '(binarna vsebina, ' + contentType + ')';
    }
    console.log(`${label}: OK status=${res.status} content-type=${contentType} length=${length} finalUrl=${res.url}`);
    console.log('  preview:', preview);
  } catch (err) {
    console.log(`${label}: NAPAKA - ${err.name}: ${err.message}`);
    if (err.cause) console.log('  cause:', err.cause);
  }
}

async function main() {
  await tryFetch('https://www1.wetter3.de/', 'https://www1.wetter3.de/');
  await tryFetch('https://wetter3.de/ (brez www1)', 'https://wetter3.de/');
  await tryFetch('http://www1.wetter3.de/ (http, ne https)', 'http://www1.wetter3.de/');
  await tryFetch('https://www1.wetter3.de/Kartenwahl.html', 'https://www1.wetter3.de/Kartenwahl.html');
  // DNS-only preverjanje - ali se ime sploh razresi
  try {
    const dns = require('dns').promises;
    const addrs = await dns.lookup('www1.wetter3.de', { all: true });
    console.log('DNS lookup www1.wetter3.de:', JSON.stringify(addrs));
  } catch (err) {
    console.log('DNS lookup napaka:', err.message);
  }
}

main().catch((err) => console.log('NAPAKA v main:', err.message));
