'use strict';

/**
 * Uporabnik sprašuje po podatkih o prihajajočih ciklonih/anticiklonih in
 * hladnih/toplih frontah. Doslej smo preverili le ARSO-jev lokacijski
 * napovedni API (nima takih polj). Ta skript preveri še nekaj drugih
 * možnih virov:
 * 1. ARSO-jeva splošna/besedilna napoved za Slovenijo (morda omenja
 *    sinoptično situacijo v prozi - drug endpoint kot lokacijski API).
 * 2. ARSO letalska stran (aviation) - morda vsebuje besedilni SIGWX/GAFOR
 *    povzetek poleg že znanih grafičnih produktov.
 * 3. DWD (nemški vremenski zavod) opendata strežnik - preveri, ali
 *    objavlja evropsko frontno analizo kot besedilo/strukturiran podatek
 *    (ne le kot sliko).
 * 4. Open-Meteo - preveri celoten seznam podprtih "hourly"/"daily"
 *    parametrov za karkoli sinoptičnega (weathercode, pressure ipd.).
 *
 * Peskovnik agenta nima omrežnega dostopa, zato to teče tu prek GitHub
 * Actions.
 */

async function fetchText(url, opts = {}) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (padalstvo-vreme front/cyclone source probe)' },
      ...opts,
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, text, finalUrl: res.url };
  } catch (err) {
    return { ok: false, status: 0, text: '', error: err.message };
  }
}

function grep(text, patterns, contextChars = 100) {
  const out = [];
  for (const pat of patterns) {
    const re = new RegExp(pat, 'gi');
    let m;
    let count = 0;
    while ((m = re.exec(text)) && count < 5) {
      const start = Math.max(0, m.index - contextChars);
      const end = Math.min(text.length, m.index + contextChars);
      out.push(`[${pat}] ...${text.slice(start, end).replace(/\s+/g, ' ')}...`);
      count++;
    }
  }
  return out;
}

async function main() {
  console.log('=== 1. ARSO splosna/besedilna napoved (vreme.arso.gov.si) ===');
  const arsoHome = await fetchText('https://vreme.arso.gov.si/napoved');
  console.log('status:', arsoHome.status, 'ok:', arsoHome.ok, 'length:', arsoHome.text.length);
  if (arsoHome.ok) {
    const hits = grep(arsoHome.text, ['fronta', 'ciklon', 'anticiklon', 'nizk\\w* pritisk', 'visok\\w* pritisk', 'sinoptič']);
    console.log('ujemanja (' + hits.length + '):');
    hits.forEach((h) => console.log('  ' + h));
    const linkMatches = [...arsoHome.text.matchAll(/href=["']([^"']*(?:napoved|forecast|sinop|text)[^"']*)["']/gi)].map((m) => m[1]);
    console.log('sorodne povezave na strani:', [...new Set(linkMatches)].slice(0, 20));
  }

  console.log('\n=== 1b. ARSO meteo.si nacionalna napoved (besedilo) ===');
  const meteoSi = await fetchText('https://meteo.arso.gov.si/met/sl/weather/forecast/');
  console.log('status:', meteoSi.status, 'ok:', meteoSi.ok, 'length:', meteoSi.text.length);
  if (meteoSi.ok) {
    const hits = grep(meteoSi.text, ['fronta', 'ciklon', 'anticiklon', 'nizk\\w* pritisk', 'visok\\w* pritisk']);
    console.log('ujemanja (' + hits.length + '):');
    hits.forEach((h) => console.log('  ' + h));
  }

  console.log('\n=== 2. ARSO aviation stran (obstojeci znan vir, ce ima se besedilo) ===');
  const aviation = await fetchText('https://meteo.arso.gov.si/met/sl/aviation/');
  console.log('status:', aviation.status, 'ok:', aviation.ok, 'length:', aviation.text.length);
  if (aviation.ok) {
    const hits = grep(aviation.text, ['fronta', 'ciklon', 'anticiklon', 'SIGWX', 'GAFOR']);
    console.log('ujemanja (' + hits.length + '):');
    hits.forEach((h) => console.log('  ' + h));
  }

  console.log('\n=== 3. DWD opendata - iskanje evropske frontne analize ===');
  const dwdDirs = [
    'https://opendata.dwd.de/weather/maps/',
    'https://opendata.dwd.de/weather/maps/fronten/',
    'https://opendata.dwd.de/weather/text_forecasts/',
  ];
  for (const url of dwdDirs) {
    const res = await fetchText(url);
    console.log(url, '-> status:', res.status, 'ok:', res.ok, 'length:', res.text.length);
    if (res.ok && res.text.length < 20000) {
      const fileLinks = [...res.text.matchAll(/href=["']([^"']+\.(?:png|pdf|txt|json|geojson|shp))["']/gi)].map((m) => m[1]);
      console.log('  datoteke (' + fileLinks.length + '):', [...new Set(fileLinks)].slice(0, 15));
    }
  }

  console.log('\n=== 4. Open-Meteo - iskanje sinoptičnih parametrov v dokumentaciji ===');
  const omDocs = await fetchText('https://api.open-meteo.com/v1/forecast?latitude=46&longitude=14&hourly=weathercode,pressure_msl,surface_pressure&forecast_days=1');
  console.log('status:', omDocs.status, 'ok:', omDocs.ok);
  console.log(omDocs.text.slice(0, 800));
}

main().catch((err) => console.log('NAPAKA:', err.message));
