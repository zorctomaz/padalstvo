'use strict';

/**
 * Poenostavljene, splošno uporabljane ocene za jadralne padalce.
 * To NISO uradni letalski podatki, ampak groba orientacija na podlagi
 * temperature, vlage, oblačnosti in vetra. Vedno je treba preveriti
 * uradne vire (GAFOR, SIGWX, lokalno društvo) pred letom.
 */

function estimateDewPointC(tempC, rh) {
  if (tempC === null || rh === null) return null;
  // Poenostavljena aproksimacija (natančnejša je Magnusova formula,
  // a za grobo oceno baze oblakov zadostuje linearna približna).
  return tempC - (100 - rh) / 5;
}

function estimateCloudBaseM(tempC, rh, elevationM) {
  const dew = estimateDewPointC(tempC, rh);
  if (dew === null) return null;
  const spread = tempC - dew;
  if (spread < 0) return elevationM; // nasičen zrak / megla
  const baseAboveGroundApprox = spread * 125; // m, klasično pravilo (125 m / °C razlike)
  return Math.round((elevationM || 0) + baseAboveGroundApprox);
}

function rateWind(windSpeedKmh, windGustKmh) {
  if (windSpeedKmh === null) {
    return { level: 'unknown', label: 'Ni podatka o vetru', color: 'gray' };
  }
  const gustSpread = windGustKmh !== null ? windGustKmh - windSpeedKmh : 0;
  if (windSpeedKmh > 30) {
    return { level: 'unfly', label: 'Neprimerno za letenje (premočan veter)', color: 'red' };
  }
  if (windSpeedKmh > 20 || gustSpread > 15) {
    return { level: 'caution', label: 'Močan/sunkovit veter – samo izkušeni piloti', color: 'orange' };
  }
  if (windSpeedKmh >= 8) {
    return { level: 'good', label: 'Ugodno za letenje', color: 'green' };
  }
  return { level: 'light', label: 'Šibek/miren veter', color: 'blue' };
}

/**
 * Ali besedilo oblačnosti pomeni pretežno/popolnoma oblačno nebo.
 * Pozor: "delno oblačno" (partly cloudy) VSEBUJE besedo "oblačno" kot
 * podniz, zato je ne smemo prepoznati z golim .test(/oblačno/) – to bi
 * napačno označilo delno oblačno vreme kot pretežno oblačno.
 */
function isOvercast(cloudCoverText) {
  const clouds = (cloudCoverText || '').toLowerCase();
  if (/overcast|pretežno oblačno|popolnoma oblačno/.test(clouds)) return true;
  if (/delno|delna|spremenljivo/.test(clouds)) return false;
  return /\boblačno\b/.test(clouds);
}

function estimateThermalIndex(tempC, cloudCoverText) {
  if (tempC === null) return { label: 'Ni dovolj podatkov', color: 'gray' };
  const clouds = (cloudCoverText || '').toLowerCase();
  const overcast = isOvercast(cloudCoverText);
  const clear = /clear|jasno|sončno/.test(clouds);

  if (overcast) {
    return { label: 'Šibka termika (pretežno oblačno)', color: 'gray' };
  }
  if (tempC >= 22 && clear) {
    return { label: 'Lahko močna/ostra termika (previdno popoldan)', color: 'orange' };
  }
  if (tempC >= 15) {
    return { label: 'Dobri pogoji za termiko', color: 'green' };
  }
  return { label: 'Šibka termika (nizka temperatura)', color: 'blue' };
}

/**
 * Smeri neba v stopinjah. ARSO (slovenska agencija) v besedilnih poljih
 * uporablja slovenske okrajšave (S = sever/0°, J = jug/180°, V = vzhod/90°,
 * Z = zahod/270°), NE angleške – zato tu namenoma ne podpiramo angleških
 * kratic hkrati (npr. "S" bi bilo dvoumno: sever v slovenščini, jug v
 * angleščini). Če je na voljo številska stopinja (dd_deg ipd.), jo
 * uporabimo prednostno in besedilo sploh ne pride v poštev.
 */
const SI_DIRECTION_TO_DEG = {
  S: 0, SSV: 22.5, SV: 45, VSV: 67.5, V: 90, VJV: 112.5, JV: 135, JJV: 157.5,
  J: 180, JJZ: 202.5, JZ: 225, ZJZ: 247.5, Z: 270, ZSZ: 292.5, SZ: 315, SSZ: 337.5,
};

const OCTANTS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

function textDirectionToDeg(text) {
  if (!text) return null;
  const key = String(text).trim().toUpperCase();
  return SI_DIRECTION_TO_DEG[key] !== undefined ? SI_DIRECTION_TO_DEG[key] : null;
}

function degToOctant(deg) {
  const normalized = ((deg % 360) + 360) % 360;
  const idx = Math.round(normalized / 45) % 8;
  return OCTANTS[idx];
}

/**
 * Primerja napovedano smer vetra s smermi, ki so znane kot primerne za
 * vzlet na danem vzletišču (site.launchWindDirections). Če za vzletišče
 * primerna smer ni potrjena (null), to jasno javimo namesto ugibanja.
 */
function rateLaunchAlignment(site, windDirection, windDirectionDeg) {
  if (!site.launchWindDirections || site.launchWindDirections.length === 0) {
    return { known: false, label: 'Primerna smer vetra za to vzletišče ni potrjena', color: 'gray' };
  }
  const deg = windDirectionDeg !== null && windDirectionDeg !== undefined
    ? windDirectionDeg
    : textDirectionToDeg(windDirection);
  if (deg === null) {
    return { known: false, label: 'Ni podatka o smeri vetra', color: 'gray' };
  }
  const octant = degToOctant(deg);
  const isGood = site.launchWindDirections.includes(octant);
  return isGood
    ? { known: true, octant, label: `Smer vetra (${octant}) ustreza vzletišču`, color: 'green' }
    : {
        known: true,
        octant,
        label: `Smer (${octant}) ne ustreza vzletišču – primerne: ${site.launchWindDirections.join(', ')}`,
        color: 'red',
      };
}

/**
 * Groba ocena "termalnega okna" za en dan: v katerih urah je glede na
 * temperaturo/oblačnost verjetno aktivna termika, in kvalitativna ocena
 * primernosti za XC prelete. Heuristika, ne uradna napoved.
 */
function estimateThermalWindow(day) {
  const daytime = (day.timeline || []).filter((e) => {
    if (!e.time) return false;
    const h = new Date(e.time).getHours();
    return Number.isFinite(h) && h >= 6 && h <= 20;
  });
  if (daytime.length === 0) return null;

  const temps = daytime.map((e) => e.temperatureC).filter((t) => t !== null);
  if (temps.length === 0) return null;
  const maxTemp = Math.max(...temps);
  const threshold = maxTemp - 6; // znotraj 6°C od dnevnega maksimuma velja za "aktivno"

  const active = daytime.filter((e) => {
    if (e.temperatureC === null) return false;
    return e.temperatureC >= threshold && !isOvercast(e.cloudCover);
  });

  const anyRain = daytime.some((e) => e.precipitationMm !== null && e.precipitationMm > 1);

  if (active.length === 0) {
    return {
      startHour: null,
      endHour: null,
      durationHours: 0,
      xc: anyRain
        ? { label: 'Padavine – slabi pogoji za XC', color: 'red' }
        : { label: 'Šibki pogoji za termiko/XC', color: 'gray' },
    };
  }

  const hours = active.map((e) => new Date(e.time).getHours());
  const startHour = Math.min(...hours);
  const endHour = Math.min(24, Math.max(...hours) + 3); // vsak vnos predstavlja ~3-urni blok

  const middayWindy = daytime.some((e) => {
    const h = new Date(e.time).getHours();
    return h >= 11 && h <= 16 && e.windSpeedKmh !== null && e.windSpeedKmh > 25;
  });

  const durationHours = endHour - startHour;
  let xc;
  if (anyRain) {
    xc = { label: 'Padavine – slabi pogoji za XC', color: 'red' };
  } else if (durationHours >= 6 && !middayWindy) {
    xc = { label: 'Dobri pogoji za XC prelete', color: 'green' };
  } else if (durationHours >= 3) {
    xc = { label: 'Zmerni pogoji, verjetno lokalni leti', color: 'blue' };
  } else {
    xc = { label: 'Kratko/šibko termalno okno', color: 'orange' };
  }

  return { startHour, endHour, durationHours, xc };
}

function buildLinks(site) {
  const arsoNameEncoded = encodeURIComponent(site.arsoLocation);
  const lat = site.lat.toFixed(3);
  const lon = site.lon.toFixed(3);
  return {
    arsoForecastPage: `https://vreme.arso.gov.si/napoved/${arsoNameEncoded}/graf`,
    arsoAviation: 'https://www.meteo.si/met/sl/aviation/',
    arsoAviationGafor: 'https://www.meteo.si/met/sl/aviation/',
    arsoRadar: 'https://meteo.arso.gov.si/met/sl/weather/observ/radar/',
    skytech: site.skytechUrl || 'https://skytech.si/',
    windAloft: `https://www.windy.com/${lat}/${lon}?wind,${lat},${lon},10`,
  };
}

function summarizeTimelineEntry(entry, site) {
  const wind = rateWind(entry.windSpeedKmh, entry.windGustKmh);
  const thermal = estimateThermalIndex(entry.temperatureC, entry.cloudCover);
  const cloudBaseM = estimateCloudBaseM(entry.temperatureC, entry.relativeHumidity, site.elevation);
  const launchAlignment = rateLaunchAlignment(site, entry.windDirection, entry.windDirectionDeg);

  return {
    ...entry,
    paragliding: {
      wind,
      thermal,
      launchAlignment,
      cloudBaseM,
      cloudBaseAboveLaunchM:
        cloudBaseM !== null ? Math.max(0, cloudBaseM - site.elevation) : null,
    },
  };
}

function buildParaglidingSummary({ site, distanceKm, arsoResult, opendataResult }) {
  const arso =
    arsoResult.status === 'fulfilled'
      ? arsoResult.value
      : { ok: false, error: arsoResult.reason ? String(arsoResult.reason.message || arsoResult.reason) : 'napaka' };

  const opendata =
    opendataResult.status === 'fulfilled'
      ? opendataResult.value
      : { ok: false, error: opendataResult.reason ? String(opendataResult.reason.message || opendataResult.reason) : 'napaka' };

  const days = (arso.days || []).map((day) => {
    const timeline = day.timeline.map((entry) => summarizeTimelineEntry(entry, site));
    return {
      date: day.date,
      timeline,
      thermalWindow: estimateThermalWindow({ timeline }),
    };
  });

  return {
    site: {
      id: site.id,
      name: site.name,
      region: site.region,
      lat: site.lat,
      lon: site.lon,
      elevation: site.elevation,
      launchWindDirections: site.launchWindDirections || null,
      liveStation: site.liveStation || { confirmed: false, phone: null, note: null },
      notes: site.notes,
    },
    distanceKm: distanceKm ?? null,
    generatedAt: new Date().toISOString(),
    sources: {
      arso: { ok: arso.ok, sourceUrl: arso.sourceUrl, error: arso.ok ? null : arso.error || 'Ni podatkov iz ARSO napovedi.' },
      opendata: { ok: opendata.ok, sourceUrl: opendata.sourceUrl, error: opendata.ok ? null : opendata.error || 'Ni podatkov iz opendata.si.' },
    },
    nearby: opendata.ok
      ? { rain: opendata.rain, forecast: opendata.forecast, hail: opendata.hail }
      : null,
    forecast: days,
    links: buildLinks(site),
    disclaimer:
      'Ocene termike, baze oblakov, XC okna in primernosti smeri/jakosti vetra so poenostavljene ' +
      'hevristike in informativne narave – niso nadomestilo za uradno letalsko napoved, GAFOR/SIGWX, ' +
      'briefing ali lastno presojo pilota. Primerne smeri vetra za vzlet so pri več vzletiščih ' +
      'neverificirane (glej opombo pri vzletišču); pred vsakim letom preverite uradne vire, ' +
      'lokalno društvo in dejanske razmere na vzletišču.',
  };
}

module.exports = {
  buildParaglidingSummary,
  estimateCloudBaseM,
  rateWind,
  estimateThermalIndex,
  rateLaunchAlignment,
  estimateThermalWindow,
  textDirectionToDeg,
  degToOctant,
};
