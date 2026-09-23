'use strict';

/**
 * Prejšnji tek je razkril: www1.wetter3.de ne obstaja vec (DNS ENOTFOUND -
 * stran je bila prestrukturirana), a https://wetter3.de/ se preusmeri na
 * https://www.wetter3.de/ in vrne 200 - stran torej obstaja, le na novi
 * poddomeni. Ta skript prebere domacno stran www.wetter3.de in poisce
 * povezave/besedilo o Evropski karti pritiska/front.
 */

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
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
  const home = await fetchText('https://www.wetter3.de/');
  console.log('status:', home.status, 'ok:', home.ok, 'length:', home.text.length, 'finalUrl:', home.finalUrl);

  console.log('\n=== vse povezave (href) na domaci strani ===');
  const links = extractAll(home.text, /href=["']([^"']+)["']/gi).map((tag) => {
    const m = tag.match(/href=["']([^"']+)["']/);
    return m ? m[1] : null;
  }).filter(Boolean);
  [...new Set(links)].forEach((l) => console.log('  ' + l));

  console.log('\n=== iskanje besedila "Bodendruck"/"Analyse"/"Europa"/"Fronten" ===');
  const hits = [];
  for (const pat of ['Bodendruck', 'Analyse', 'Europa', 'Fronten', 'bodendruck', 'analyse']) {
    const re = new RegExp('.{60}' + pat + '.{60}', 'gi');
    let m;
    let count = 0;
    while ((m = re.exec(home.text)) && count < 5) {
      hits.push('[' + pat + '] ...' + m[0].replace(/\s+/g, ' ') + '...');
      count++;
    }
  }
  hits.forEach((h) => console.log('  ' + h));

  // Poskusimo tudi znano staro pot na novi domeni
  const candidatePaths = [
    'https://www.wetter3.de/Kartenwahl.html',
    'https://www.wetter3.de/analyse.html',
    'https://www.wetter3.de/Bodendruck.html',
  ];
  for (const url of candidatePaths) {
    const res = await fetchText(url);
    console.log(`\n${url} -> status: ${res.status} ok: ${res.ok} length: ${res.text.length}`);
    if (res.ok) console.log('  preview:', res.text.slice(0, 300).replace(/\s+/g, ' '));
  }
}

main().catch((err) => console.log('NAPAKA:', err.message));
