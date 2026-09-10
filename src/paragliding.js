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

function estimateThermalIndex(tempC, cloudCoverText) {
  if (tempC === null) return { label: 'Ni dovolj podatkov', color: 'gray' };
  const clouds = (cloudCoverText || '').toLowerCase();
  const overcast = /overcast|oblačno|pretežno oblačno/.test(clouds);
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

function buildLinks(site) {
  const arsoNameEncoded = encodeURIComponent(site.arsoLocation);
  return {
    arsoForecastPage: `https://vreme.arso.gov.si/napoved/${arsoNameEncoded}/graf`,
    arsoAviation: 'https://www.meteo.si/met/sl/aviation/',
    arsoAviationGafor: 'https://www.meteo.si/met/sl/aviation/',
    arsoRadar: 'https://meteo.arso.gov.si/met/sl/weather/observ/radar/',
    skytech: site.skytechUrl || 'https://skytech.si/',
  };
}

function summarizeTimelineEntry(entry, site) {
  const wind = rateWind(entry.windSpeedKmh, entry.windGustKmh);
  const thermal = estimateThermalIndex(entry.temperatureC, entry.cloudCover);
  const cloudBaseM = estimateCloudBaseM(entry.temperatureC, entry.relativeHumidity, site.elevation);

  return {
    ...entry,
    paragliding: {
      wind,
      thermal,
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

  const days = (arso.days || []).map((day) => ({
    date: day.date,
    timeline: day.timeline.map((entry) => summarizeTimelineEntry(entry, site)),
  }));

  return {
    site: {
      id: site.id,
      name: site.name,
      region: site.region,
      lat: site.lat,
      lon: site.lon,
      elevation: site.elevation,
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
      'Ocene termike, baze oblakov in primernosti vetra so poenostavljene in informativne narave. ' +
      'Niso nadomestilo za uradno letalsko napoved, GAFOR/SIGWX, briefing ali lastno presojo pilota. ' +
      'Pred vsakim letom preverite uradne vire in lokalne razmere na vzletišču.',
  };
}

module.exports = {
  buildParaglidingSummary,
  estimateCloudBaseM,
  rateWind,
  estimateThermalIndex,
};
