'use strict';

/**
 * Nadaljevanje prejšnjega teka: HTML je razkril natančno strukturo
 * jezikovnega preklopnika na fotra.net (.titlebar-controls > .lang-toggle
 * > .lang-btn[.active]). Ta tek poišče še pripadajoča CSS pravila (barve,
 * velikost, razmiki, pozicioniranje), da jih lahko natančno ponovimo.
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

function extractRuleBlocks(css, selectorSubstrings) {
  const out = [];
  // Najdi vsak selector-blok "... { ... }" in preveri, ali kateri od
  // selektorjev v vejici ločenem seznamu vsebuje iskani niz.
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
  const { ok, text, finalUrl } = await fetchText('https://fotra.net');
  if (!ok) return;

  console.log('=== inline <style> blocks ===');
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
    else if (!cssUrl.startsWith('http')) cssUrl = new URL(cssUrl, finalUrl || 'https://fotra.net').toString();
    try {
      const cssRes = await fetchText(cssUrl);
      console.log('fetched', cssUrl, 'status', cssRes.status, 'length', cssRes.text.length);
      externalCss += cssRes.text + '\n';
    } catch (err) {
      console.log('napaka pri CSS fetchu ' + cssUrl + ':', err.message);
    }
  }

  const allCss = allInlineCss + externalCss;
  const targets = ['.lang-toggle', '.lang-btn', '.titlebar-controls', '.titlebar', '.sprite-wrap', '.menu', '.item', '.key', '.sep', '.ascii-title', '.sub'];
  console.log('\n=== relevant CSS rules ===');
  const rules = extractRuleBlocks(allCss, targets);
  rules.forEach((r) => console.log(r));

  console.log('\n=== raw @media blocks mentioning lang-toggle/lang-btn (may differ on mobile) ===');
  const mediaRe = /@media[^{]*\{/g;
  let mm;
  while ((mm = mediaRe.exec(allCss))) {
    const start = mm.index;
    // najdi ujemajoč zaklepaj za ta @media blok (poenostavljeno štetje)
    let depth = 0, end = start;
    for (let i = mm.index; i < allCss.length; i++) {
      if (allCss[i] === '{') depth++;
      if (allCss[i] === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
    }
    const block = allCss.slice(start, end);
    if (block.includes('lang-toggle') || block.includes('lang-btn') || block.includes('titlebar')) {
      console.log(block.slice(0, 1500));
    }
  }
}

main().catch((err) => console.log('NAPAKA:', err.message));
