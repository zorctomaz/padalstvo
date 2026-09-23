'use strict';

/**
 * Uporabnik je opozoril na ECMWF-jev "Open Charts" produkt
 * (medium-mslp-wind850) - ECMWF javno gosti vnaprej izrisane karte
 * srednjeročne napovedi (pritisk na morski gladini + veter na 850 hPa),
 * CC-BY-4.0 licenca, globalno pokritje (torej vključno s Slovenijo).
 * Ta skript preveri dejansko dosegljivost strani/API-ja produkta in
 * ali ima kakšno "area"/regijsko možnost za Evropo/Slovenijo.
 *
 * Peskovnik agenta nima omrežnega dostopa, zato to teče tu prek GitHub
 * Actions.
 */

async function fetchInfo(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (padalstvo-vreme ECMWF opencharts probe)' },
    });
    const contentType = res.headers.get('content-type') || '';
    let length = 0;
    let preview = '';
    if (contentType.includes('text') || contentType.includes('html') || contentType.includes('json')) {
      const text = await res.text();
      length = text.length;
      preview = text.slice(0, 1500);
    } else {
      const buf = await res.arrayBuffer();
      length = buf.byteLength;
      preview = '(binarna vsebina, ' + contentType + ')';
    }
    return { ok: res.ok, status: res.status, contentType, length, preview, finalUrl: res.url };
  } catch (err) {
    return { ok: false, status: 0, error: err.message };
  }
}

async function main() {
  console.log('=== 1. charts.ecmwf.int produkt stran ===');
  const page = await fetchInfo('https://charts.ecmwf.int/products/medium-mslp-wind850');
  console.log('status:', page.status, 'ok:', page.ok, 'content-type:', page.contentType, 'length:', page.length);
  if (page.error) console.log('napaka:', page.error);
  if (page.preview) console.log('preview:', page.preview.replace(/\s+/g, ' '));

  console.log('\n=== 2. iskanje API/JSON endpoint znotraj strani (regije/area) ===');
  if (page.preview) {
    const apiMatches = [...(page.preview + '').matchAll(/["'](\/opencharts-api[^"']*)["']/g)].map((m) => m[1]);
    console.log('opencharts-api reference v HTML:', apiMatches);
  }

  console.log('\n=== 3. znan opencharts REST API (product detail + slika) ===');
  const apiInfo = await fetchInfo('https://charts.ecmwf.int/opencharts-api/v1/products/medium-mslp-wind850/');
  console.log('status:', apiInfo.status, 'ok:', apiInfo.ok, 'content-type:', apiInfo.contentType, 'length:', apiInfo.length);
  if (apiInfo.error) console.log('napaka:', apiInfo.error);
  if (apiInfo.preview) console.log('preview:', apiInfo.preview.replace(/\s+/g, ' ').slice(0, 1500));
}

main().catch((err) => console.log('NAPAKA:', err.message));
