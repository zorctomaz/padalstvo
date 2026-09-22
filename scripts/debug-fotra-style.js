'use strict';

/**
 * Uporabnik želi, da nova podstran (preprosto.html) sledi vizualnemu
 * slogu matične strani fotra.net (padalstvo.fotra.net je njena
 * poddomena). Ta skript preišče fotra.net za barvno paleto, pisave,
 * strukturo glave/navigacije ipd., da lahko slog ponovim.
 *
 * Peskovnik agenta nima dostopa do fotra.net, zato to teče tu prek
 * GitHub Actions.
 */

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (padalstvo-vreme style probe)' },
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, text, finalUrl: res.url };
}

function extractAll(html, re) {
  const out = new Set();
  let m;
  while ((m = re.exec(html))) out.add(m[1] || m[0]);
  return [...out];
}

async function main() {
  const { ok, status, text, finalUrl } = await fetchText('https://fotra.net');
  console.log('status:', status, 'ok:', ok, 'finalUrl:', finalUrl, 'length:', text.length);
  if (!ok) return;

  console.log('\n=== <title> ===');
  console.log((text.match(/<title>([^<]*)<\/title>/) || [])[1]);

  console.log('\n=== meta theme-color ===');
  console.log((text.match(/theme-color["'][^>]*content=["']([^"']+)["']/) || [])[1]);

  console.log('\n=== linked stylesheets ===');
  const cssLinks = extractAll(text, /<link[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["']/gi);
  cssLinks.forEach((s) => console.log('  ' + s));

  console.log('\n=== inline <style> blocks (first 3000 chars each) ===');
  const styleBlocks = extractAll(text, /<style[^>]*>([\s\S]*?)<\/style>/gi);
  styleBlocks.forEach((s, i) => console.log(`--- inline style ${i} ---\n` + s.slice(0, 3000)));

  console.log('\n=== font-family references in HTML ===');
  extractAll(text, /font-family\s*:\s*([^;"'}]+)/gi).forEach((f) => console.log('  ' + f));

  console.log('\n=== Google Fonts / font links ===');
  extractAll(text, /<link[^>]*href=["']([^"']*fonts[^"']*)["']/gi).forEach((f) => console.log('  ' + f));

  console.log('\n=== logo / header snippet (first nav/header tag) ===');
  const headerMatch = text.match(/<header[\s\S]*?<\/header>/i) || text.match(/<nav[\s\S]*?<\/nav>/i);
  console.log(headerMatch ? headerMatch[0].slice(0, 2000) : '(ni najdeno)');

  console.log('\n=== body snippet (first 1500 chars) ===');
  const bodyMatch = text.match(/<body[^>]*>([\s\S]*)/i);
  console.log(bodyMatch ? bodyMatch[1].slice(0, 1500) : '(ni najdeno)');

  // Fetch the first external CSS file for actual color/font values
  if (cssLinks.length > 0) {
    let cssUrl = cssLinks[0];
    if (cssUrl.startsWith('//')) cssUrl = 'https:' + cssUrl;
    else if (cssUrl.startsWith('/')) cssUrl = new URL(cssUrl, finalUrl || 'https://fotra.net').toString();
    else if (!cssUrl.startsWith('http')) cssUrl = new URL(cssUrl, finalUrl || 'https://fotra.net').toString();
    console.log('\n=== fetching first CSS: ' + cssUrl + ' ===');
    try {
      const cssRes = await fetchText(cssUrl);
      console.log('status:', cssRes.status, 'length:', cssRes.text.length);
      const colors = extractAll(cssRes.text, /#[0-9a-fA-F]{3,8}\b/g);
      console.log('hex colors found (' + colors.length + '):');
      colors.slice(0, 60).forEach((c) => console.log('  ' + c));
      const fonts = extractAll(cssRes.text, /font-family\s*:\s*([^;}]+)/gi);
      console.log('font-family declarations:');
      fonts.slice(0, 20).forEach((f) => console.log('  ' + f));
    } catch (err) {
      console.log('napaka pri CSS fetchu:', err.message);
    }
  }
}

main().catch((err) => console.log('NAPAKA:', err.message));
