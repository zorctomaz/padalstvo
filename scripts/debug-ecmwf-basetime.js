'use strict';
const { fetchJsonCached } = require('../src/fetchUtil');

const PRODUCT_URL = 'https://charts.ecmwf.int/opencharts-api/v1/products/medium-mslp-wind850/';

function isoHour(d) {
  return d.toISOString().slice(0, 19) + 'Z';
}

async function tryFetch(label, params) {
  const url = params ? `${PRODUCT_URL}?${new URLSearchParams(params).toString()}` : PRODUCT_URL;
  try {
    const result = await fetchJsonCached(url, { ttlMs: 0, timeoutMs: 8000 });
    const body = result.data;
    const href = body && body.data && body.data.link && body.data.link.href;
    const keys = body && body.data ? Object.keys(body.data) : [];
    console.log(`${label}: OK href=${href ? 'yes' : 'NO'} data-keys=${JSON.stringify(keys)}`);
    if (body && body.data) {
      const { link, ...rest } = body.data;
      console.log(`  ${label} rest=${JSON.stringify(rest).slice(0, 500)}`);
    }
  } catch (err) {
    console.log(`${label}: FAIL ${String((err && err.message) || err)}`);
  }
}

async function main() {
  const now = new Date();
  console.log('now=', now.toISOString());

  // 1. No params at all - what does "default/latest" give us?
  await tryFetch('no-params', null);

  // 2. Today 00Z base_time, step 0 (what build-data.js currently does - suspected too fresh)
  const today00 = new Date(now);
  today00.setUTCHours(0, 0, 0, 0);
  await tryFetch('today-00Z-step0', {
    projection: 'opencharts_central_europe',
    base_time: isoHour(today00),
    valid_time: isoHour(today00),
  });

  // 3. Yesterday 12Z base_time, step 0 (should definitely be published)
  const yesterday12 = new Date(today00.getTime() - 12 * 3600 * 1000);
  await tryFetch('yesterday-12Z-step0', {
    projection: 'opencharts_central_europe',
    base_time: isoHour(yesterday12),
    valid_time: isoHour(yesterday12),
  });

  // 4. Yesterday 12Z base_time, various steps out to 10 days to see max range
  for (const stepHours of [24, 48, 72, 96, 120, 144, 168, 192, 216, 240, 264]) {
    const validTime = new Date(yesterday12.getTime() + stepHours * 3600 * 1000);
    await tryFetch(`yesterday-12Z-step${stepHours}`, {
      projection: 'opencharts_central_europe',
      base_time: isoHour(yesterday12),
      valid_time: isoHour(validTime),
    });
  }
}

main().catch((err) => {
  console.error('FATAL', err);
  process.exit(1);
});
