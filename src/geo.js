'use strict';

/**
 * Razdalja med dvema GPS točkama (Haversine formula), v kilometrih.
 */
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // polmer Zemlje v km
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function findNearestSite(sites, lat, lon) {
  let best = null;
  let bestDist = Infinity;
  for (const site of sites) {
    const d = haversineKm(lat, lon, site.lat, site.lon);
    if (d < bestDist) {
      bestDist = d;
      best = site;
    }
  }
  return { site: best, distanceKm: Math.round(bestDist * 10) / 10 };
}

module.exports = { haversineKm, findNearestSite };
