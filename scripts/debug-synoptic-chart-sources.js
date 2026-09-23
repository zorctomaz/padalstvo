'use strict';

/**
 * Uporabnik sprašuje, ali obstajajo dejanske sinoptične karte (slike s
 * pritiskom/frontami za Evropo), na katere bi lahko povezali aplikacijo -
 * enako, kot že povezuje na GAFOR/SIGWX/ARSO radar (grafični produkti,
 * ne strojno berljivi podatki). Ta skript preveri dosegljivost nekaj
 * znanih kandidatov (DWD, Met Office, wetter3.de) in ali dejansko
 * vsebujejo sinoptično karto/fronte za Evropo, ne le splošno stran.
 *
 * Peskovnik agenta nima omrežnega dostopa, zato to teče tu prek GitHub
 * Actions.
 */

async function fetchInfo(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (padalstvo-vreme synoptic chart probe)' },
    });
    const contentType = res.headers.get('content-type') || '';
    let bodyPreview = '';
    let length = 0;
    if (contentType.includes('text') || contentType.includes('html') || contentType.includes('json')) {
      const text = await res.text();
      length = text.length;
      bodyPreview = text.slice(0, 500);
    } else {
      const buf = await res.arrayBuffer();
      length = buf.byteLength;
      bodyPreview = '(binarna vsebina, ' + contentType + ')';
    }
    return { ok: res.ok, status: res.status, contentType, length, bodyPreview, finalUrl: res.url };
  } catch (err) {
    return { ok: false, status: 0, error: err.message };
  }
}

const candidates = [
  // DWD - javna stran z analizo/napovedjo (besedilo + slike)
  ['DWD frontenanalyse stran', 'https://www.dwd.de/DE/wetter/wetterundklima_vorort/deutschland/genesestruktur.html'],
  ['DWD Bodendruckkarte Europa (slika, opendata)', 'https://opendata.dwd.de/weather/maps/bodendruck_europa/'],
  ['DWD opendata root', 'https://opendata.dwd.de/weather/'],
  // Met Office UK - javna stran s tlačno karto (vkljucno s frontami)
  ['Met Office surface pressure chart', 'https://www.metoffice.gov.uk/weather/maps-and-charts/surface-pressure'],
  // wetter3.de - znan amaterski meteo agregator (GFS/ECMWF karte s frontami za Evropo)
  ['wetter3.de glavna stran', 'https://www1.wetter3.de/'],
  ['wetter3.de Bodendruck Europa (slika)', 'https://www1.wetter3.de/Karten/Analysen/bodendruck_analyse.html'],
  // NOAA WPC - severnoatlantska analiza (delno pokriva zahodno Evropo)
  ['NOAA WPC North Atlantic surface analysis', 'https://ocean.weather.gov/A_sfc_full_ocean_color.png'],
];

async function main() {
  for (const [label, url] of candidates) {
    const info = await fetchInfo(url);
    console.log(`\n=== ${label} (${url}) ===`);
    console.log('status:', info.status, 'ok:', info.ok, 'content-type:', info.contentType, 'length:', info.length);
    if (info.error) console.log('napaka:', info.error);
    if (info.bodyPreview) console.log('preview:', info.bodyPreview.replace(/\s+/g, ' '));
  }
}

main().catch((err) => console.log('NAPAKA:', err.message));
