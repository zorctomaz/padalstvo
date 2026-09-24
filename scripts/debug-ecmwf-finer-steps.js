'use strict';
const { fetchJsonCached } = require('../src/fetchUtil');

const PRODUCT_URL = 'https://charts.ecmwf.int/opencharts-api/v1/products/medium-mslp-wind850/';
const PROJECTION = 'opencharts_europe';

function isoHour(d) {
  return d.toISOString().slice(0, 19) + 'Z';
}

function pickBaseTime(now) {
  const baseTime = new Date(now);
  baseTime.setUTCMinutes(0, 0, 0);
  baseTime.setUTCHours(baseTime.getUTCHours() < 12 ? 0 : 12, 0, 0, 0);
  while (now.getTime() - baseTime.getTime() < 12 * 3600 * 1000) {
    baseTime.setTime(baseTime.getTime() - 12 * 3600 * 1000);
  }
  return baseTime;
}

async function tryStep(baseTime, stepHours) {
  const validTime = new Date(baseTime.getTime() + stepHours * 3600 * 1000);
  const params = new URLSearchParams({
    projection: PROJECTION,
    base_time: isoHour(baseTime),
    valid_time: isoHour(validTime),
  });
  const url = `${PRODUCT_URL}?${params.toString()}`;
  try {
    const result = await fetchJsonCached(url, { ttlMs: 0, timeoutMs: 12000 });
    const href = result.data && result.data.data && result.data.data.link && result.data.data.link.href;
    console.log(`step+${stepHours}h: ${href ? 'OK' : 'NO-LINK'}`);
  } catch (err) {
    console.log(`step+${stepHours}h: FAIL ${String((err && err.message) || err)}`);
  }
}

async function main() {
  const baseTime = pickBaseTime(new Date());
  console.log('baseTime=', baseTime.toISOString());
  // Near-term fine resolution candidates (does the product support non-24h-aligned steps?)
  for (const stepHours of [3, 6, 9, 12, 18, 30, 36, 42, 54, 66, 78, 90, 102]) {
    await tryStep(baseTime, stepHours);
  }
  // Far-term: does 6h resolution still work near the end of the range (~240h)?
  for (const stepHours of [222, 228, 234]) {
    await tryStep(baseTime, stepHours);
  }
}

main().catch((err) => {
  console.error('FATAL', err);
  process.exit(1);
});
