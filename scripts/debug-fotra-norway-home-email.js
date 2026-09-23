'use strict';

/**
 * Uporabnik želi, da padalstvo.fotra.net dobi gumb "domov" (nazaj na
 * fotra.net) in email povezavo, enako kot ju ima norway.fotra.net (ena
 * od poddomen v mreži fotra.net). Ta skript preišče norway.fotra.net za
 * te elemente (HTML + CSS), da jih lahko natančno ponovimo.
 *
 * Peskovnik agenta nima dostopa do fotra.net/norway.fotra.net, zato to
 * teče tu prek GitHub Actions.
 */

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (padalstvo-vreme home/email probe)' },
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

function extractRuleBlocks(css, selectorSubstrings) {
  const out = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(css))) {
    const selector = m[1].trim();
    if (selectorSubstrings.some((s) => selector.includes(s))) {
      out.push(selector + ' { ' + m[2].trim() + ' }');
    }
  }
  return out;
}

async function main() {
  const { ok, status, text, finalUrl } = await fetchText('https://norway.fotra.net');
  console.log('status:', status, 'ok:', ok, 'finalUrl:', finalUrl, 'length:', text.length);
  if (!ok) return;

  console.log('\n=== mailto links ===');
  extractAll(text, /<a[^>]*href=["']mailto:[^"']*["'][^>]*>[\s\S]*?<\/a>/gi).forEach((s) => console.log('  ' + s));

  console.log('\n=== elements/classes mentioning home/domov ===');
  extractAll(text, /<[^>]*(?:class|id)=["'][^"']*(?:home|domov)[^"']*["'][^>]*>/gi).forEach((s) => console.log('  ' + s));

  console.log('\n=== links to fotra.net (root / home) ===');
  extractAll(text, /<a[^>]*href=["'][^"']*fotra\.net\/?["'][^>]*>[\s\S]{0,200}?<\/a>/gi).forEach((s) => console.log('  ' + s));

  console.log('\n=== titlebar / header snippet ===');
  const headerMatch = text.match(/<div class="titlebar"[\s\S]*?<\/div>\s*<\/div>/i) || text.match(/<header[\s\S]*?<\/header>/i);
  console.log(headerMatch ? headerMatch[0].slice(0, 3000) : '(ni najdeno)');

  console.log('\n=== footer snippet ===');
  const footerMatch = text.match(/<footer[\s\S]*?<\/footer>/i);
  console.log(footerMatch ? footerMatch[0].slice(0, 2000) : '(ni footer taga)');

  console.log('\n=== full body first 5000 chars ===');
  const bodyMatch = text.match(/<body[^>]*>([\s\S]*)/i);
  console.log(bodyMatch ? bodyMatch[1].slice(0, 5000) : '(ni najdeno)');

  console.log('\n=== inline <style> blocks ===');
  const styleBlocks = extractAll(text, /<style[^>]*>([\s\S]*?)<\/style>/gi);
  let allInlineCss = '';
  styleBlocks.forEach((block, i) => {
    const cssOnly = block.replace(/^<style[^>]*>/i, '').replace(/<\/style>$/i, '');
    allInlineCss += cssOnly + '\n';
    console.log(`--- inline style block ${i}, length ${cssOnly.length} ---`);
  });

  console.log('\n=== linked stylesheets ===');
  const cssLinks = extractAll(text, /<link[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["']/gi).map((tag) => {
    const m = tag.match(/href=["']([^"']+)["']/);
    return m ? m[1] : null;
  }).filter(Boolean);
  console.log(cssLinks);

  let externalCss = '';
  for (let cssUrl of cssLinks) {
    if (cssUrl.startsWith('//')) cssUrl = 'https:' + cssUrl;
    else if (!cssUrl.startsWith('http')) cssUrl = new URL(cssUrl, finalUrl || 'https://norway.fotra.net').toString();
    try {
      const cssRes = await fetchText(cssUrl);
      console.log('fetched', cssUrl, 'status', cssRes.status, 'length', cssRes.text.length);
      externalCss += cssRes.text + '\n';
    } catch (err) {
      console.log('napaka pri CSS fetchu ' + cssUrl + ':', err.message);
    }
  }

  const allCss = allInlineCss + externalCss;
  const targets = ['.home', '.foot-email', 'foot-email', '.footer', 'footer', '.back', '.titlebar-controls', '.home-btn', '.email'];
  console.log('\n=== relevant CSS rules ===');
  const rules = extractRuleBlocks(allCss, targets);
  rules.forEach((r) => console.log(r));
}

main().catch((err) => console.log('NAPAKA:', err.message));
