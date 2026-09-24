'use strict';

const PRODUCT_URL = 'https://charts.ecmwf.int/opencharts-api/v1/products/medium-mslp-wind850/';

async function rawFetch(label, params) {
  const url = params ? `${PRODUCT_URL}?${new URLSearchParams(params).toString()}` : PRODUCT_URL;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json', 'User-Agent': 'padalstvo-vreme/1.0 (+https://github.com/)' },
    });
    const text = await res.text();
    console.log(`${label}: status=${res.status} body=${text.slice(0, 1000)}`);
  } catch (err) {
    console.log(`${label}: FETCH-FAIL ${String((err && err.message) || err)}`);
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  // 1. Invalid projection - many REST APIs echo valid enum values in the 4xx body.
  await rawFetch('invalid-projection', { projection: 'this_is_not_a_real_projection' });

  // 2. Candidate wider projections.
  for (const proj of [
    'opencharts_europe',
    'opencharts_north_atlantic_europe',
    'opencharts_north_west_europe',
    'opencharts_north_africa_middle_east',
    'opencharts_global',
    'opencharts_south_east_europe',
  ]) {
    await rawFetch(`proj-${proj}`, { projection: proj });
  }

  // 3. Product metadata itself (no query params) - may list "available_projections" or similar.
  await rawFetch('product-metadata', null);
}

main().catch((err) => {
  console.error('FATAL', err);
  process.exit(1);
});
