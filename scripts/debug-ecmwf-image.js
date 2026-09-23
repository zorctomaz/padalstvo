'use strict';

/**
 * Prejšnji tek je potrdil: ECMWF opencharts-api (JSON) deluje brez
 * bot-zaščite in vrne "Area: Europe" + neposreden PNG URL. Sama HTML
 * stran (charts.ecmwf.int/products/...) pa je za brskalnike zaščitena z
 * Anubis anti-bot izzivom. Ta skript preveri, ali je sam PNG (ne HTML
 * stran) neposredno dosegljiv - ključno za to, ali ga lahko varno
 * uporabimo kot <a href> ali celo <img src> v aplikaciji.
 */

async function fetchInfo(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (padalstvo-vreme ECMWF image probe)' },
    });
    const contentType = res.headers.get('content-type') || '';
    const buf = await res.arrayBuffer();
    return { ok: res.ok, status: res.status, contentType, length: buf.byteLength, finalUrl: res.url };
  } catch (err) {
    return { ok: false, status: 0, error: err.message };
  }
}

async function main() {
  console.log('=== 1. ponoven klic API-ja za svez PNG URL ===');
  const apiRes = await fetch('https://charts.ecmwf.int/opencharts-api/v1/products/medium-mslp-wind850/', {
    headers: { 'User-Agent': 'Mozilla/5.0 (padalstvo-vreme ECMWF image probe)' },
  });
  const apiJson = await apiRes.json();
  const pngUrl = apiJson && apiJson.data && apiJson.data.link && apiJson.data.link.href;
  console.log('pngUrl:', pngUrl);
  console.log('description:', apiJson.data.attributes.description);

  console.log('\n=== 2. neposreden GET na PNG URL ===');
  if (pngUrl) {
    const imgInfo = await fetchInfo(pngUrl);
    console.log('status:', imgInfo.status, 'ok:', imgInfo.ok, 'content-type:', imgInfo.contentType, 'length:', imgInfo.length, 'finalUrl:', imgInfo.finalUrl);
    if (imgInfo.error) console.log('napaka:', imgInfo.error);
  }

  console.log('\n=== 3. za primerjavo - brez User-Agent glave (kot bi ga naložil <img> tag v brskalniku) ===');
  try {
    const res2 = await fetch(pngUrl);
    const ct2 = res2.headers.get('content-type') || '';
    const buf2 = await res2.arrayBuffer();
    console.log('status:', res2.status, 'ok:', res2.ok, 'content-type:', ct2, 'length:', buf2.byteLength);
  } catch (err) {
    console.log('napaka:', err.message);
  }
}

main().catch((err) => console.log('NAPAKA:', err.message));
