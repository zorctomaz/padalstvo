'use strict';

/**
 * Uradna ARSO napoved termike (meteo.si/met/sl/aviation) - ločen RSS vir
 * za vsako od 6 letalskih regij Slovenije, z dejansko kvantitativno
 * napovedjo (max. hitrost dviganj v m/s + barvna stopnja) za danes in
 * jutri. Precej zanesljivejši vir od naše lastne hevristike v
 * paragliding.js (estimateThermalIndex/estimateThermalWindow), zato ga
 * prikazujemo poleg nje, ne namesto nje (ARSO pokriva le 2 dneva, naša
 * hevristika pa vseh 7 iz splošne napovedi).
 */

const REGION_LABELS = {
  LES: 'Gorenjska',
  NGO: 'Primorska',
  LJU: 'Osrednja Slovenija',
  NMO: 'Dolenjska',
  CEL: 'Štajerska',
  MSO: 'Prekmurska',
};

const RSS_BASE = 'https://meteo.arso.gov.si/uploads/probase/www/aviation/RSS/termika';

/**
 * Približne koordinate središč 6 letalskih regij (uporabljene tudi za
 * ročno dodelitev `aladinRegion` vzletiščem v src/sites.json). Objavljene
 * tudi javno (glej thermal-regions.json v build-data.js), da lahko
 * frontend za poljubno GPS točko ("Moja lokacija", zemljevid) sam
 * izračuna najbližjo regijo - ne sme si izposoditi regije najbližjega
 * URADNEGA vzletišča, ker je lahko v drugi regiji kot uporabnikova
 * dejanska točka (npr. Trebnje je v Dolenjski, a najbližje vzletišče
 * Kum je dodeljeno Štajerski).
 */
const REGION_CENTERS = {
  LES: { lat: 46.36, lon: 14.173 },
  NGO: { lat: 45.956, lon: 13.646 },
  LJU: { lat: 46.056, lon: 14.505 },
  NMO: { lat: 45.803, lon: 15.17 },
  CEL: { lat: 46.23, lon: 15.267 },
  MSO: { lat: 46.663, lon: 16.166 },
};

async function fetchText(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'padalstvo-vreme/1.0 (+https://github.com/)' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Razčleni RSS z regexom namesto s polnim XML razčlenjevalnikom - format
 * je en sam, stabilen, znan vzorec (ena vrstica na regijo na <item>), zato
 * ne potrebujemo dodatne npm odvisnosti samo za to.
 */
function parseThermalRss(xml) {
  const items = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = itemRe.exec(xml))) {
    const block = m[1];
    const titleMatch = /<title>([^<]*)<\/title>/.exec(block);
    const dateMatch = titleMatch && /za (\d{2}\.\d{2}\.\d{4})/.exec(titleMatch[1]);
    const rowMatch = /<tr><td>[^<]*<\/td><td>([\d.,]+)<\/td><td[^>]*bgcolor=(#[0-9A-Fa-f]{6})/i.exec(block);
    if (!dateMatch || !rowMatch) continue;
    const linkMatch = /<link>([^<]*)<\/link>/.exec(block);
    const issuedMatch = /Izdano: ([^<]*)/.exec(block);
    items.push({
      date: dateMatch[1],
      climbMs: parseFloat(rowMatch[1].replace(',', '.')),
      color: rowMatch[2].toUpperCase(),
      link: linkMatch ? linkMatch[1] : null,
      issued: issuedMatch ? issuedMatch[1].trim() : null,
    });
  }
  return items;
}

async function fetchThermalRegion(code) {
  const url = `${RSS_BASE}${code}.xml`;
  try {
    const xml = await fetchText(url);
    const items = parseThermalRss(xml);
    return { ok: items.length > 0, region: code, regionLabel: REGION_LABELS[code] || code, items, sourceUrl: url };
  } catch (err) {
    return {
      ok: false,
      region: code,
      regionLabel: REGION_LABELS[code] || code,
      items: [],
      sourceUrl: url,
      error: String((err && err.message) || err),
    };
  }
}

/**
 * Pridobi napoved termike za vseh 6 regij naenkrat (en klic na regijo,
 * ne po vzletišču) - vrne { LES: {...}, NGO: {...}, ... }.
 */
async function fetchAllThermalRegions() {
  const codes = Object.keys(REGION_LABELS);
  const results = await Promise.all(codes.map(fetchThermalRegion));
  const byCode = {};
  for (const r of results) byCode[r.region] = r;
  return byCode;
}

module.exports = { fetchAllThermalRegions, REGION_LABELS, REGION_CENTERS };
