'use strict';

/**
 * Uporabnik želi videti, kako se bo sinoptična situacija (pritisk/fronte)
 * premikala čez čas - ne le en posnetek. ECMWF Open Charts API podpira
 * parametra valid_time/base_time (glej uradni primer
 * Download_medium_range_product_example.ipynb) in projection (npr.
 * opencharts_central_europe - bolj primerna za Slovenijo kot privzeta
 * "Europe"). Ta skript preveri, ali lahko za medium-mslp-wind850
 * dejansko pridobimo zaporedje slik za različne valid_time vrednosti, in
 * ali projection=opencharts_central_europe deluje.
 */

async function fetchProduct(label, params) {
  const qs = new URLSearchParams(params).toString();
  const url = `https://charts.ecmwf.int/opencharts-api/v1/products/medium-mslp-wind850/${qs ? '?' + qs : ''}`;
  console.log(`\n=== ${label} ===`);
  console.log('URL:', url);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (padalstvo-vreme timestep probe)' } });
    const text = await res.text();
    console.log('status:', res.status, 'ok:', res.ok);
    if (res.ok) {
      const data = JSON.parse(text);
      console.log('description:', data.data && data.data.attributes && data.data.attributes.description);
      console.log('png:', data.data && data.data.link && data.data.link.href);
    } else {
      console.log('body preview:', text.slice(0, 300));
    }
  } catch (err) {
    console.log('napaka:', err.message);
  }
}

function isoDate(d) {
  return d.toISOString().slice(0, 10) + 'T00:00:00Z';
}

async function main() {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const plus1 = new Date(today.getTime() + 24 * 3600 * 1000);
  const plus2 = new Date(today.getTime() + 48 * 3600 * 1000);
  const plus3 = new Date(today.getTime() + 72 * 3600 * 1000);

  await fetchProduct('brez parametrov (privzeto, ze potrjeno delujoce)', {});
  await fetchProduct('valid_time=jutri, base_time=danes', { valid_time: isoDate(plus1), base_time: isoDate(today) });
  await fetchProduct('valid_time=+48h, base_time=danes', { valid_time: isoDate(plus2), base_time: isoDate(today) });
  await fetchProduct('valid_time=+72h, base_time=danes', { valid_time: isoDate(plus3), base_time: isoDate(today) });
  await fetchProduct('projection=opencharts_central_europe', { projection: 'opencharts_central_europe' });
  await fetchProduct('projection=opencharts_central_europe + valid_time=+48h', {
    projection: 'opencharts_central_europe',
    valid_time: isoDate(plus2),
    base_time: isoDate(today),
  });
}

main().catch((err) => console.log('NAPAKA:', err.message));
