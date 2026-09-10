'use strict';

/**
 * fetch() z omejenim časom čakanja in preprostim predpomnilnikom v pomnilniku.
 * Zunanji viri (ARSO, opendata.si) nimajo uradnega SLA, zato vsak klic
 * zaščitimo pred obešanjem in po nepotrebnem ne obremenjujemo njihovih
 * strežnikov z več enakimi zahtevami znotraj TTL okna.
 */

const cache = new Map(); // key -> { expires, value }

async function fetchJsonCached(url, { ttlMs = 10 * 60 * 1000, timeoutMs = 8000, headers = {} } = {}) {
  const cached = cache.get(url);
  if (cached && cached.expires > Date.now()) {
    return { ...cached.value, fromCache: true };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'padalstvo-vreme/1.0 (+https://github.com/)',
        ...headers,
      },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText} za ${url}`);
    }
    const data = await res.json();
    const value = { ok: true, data, url };
    cache.set(url, { expires: Date.now() + ttlMs, value });
    return { ...value, fromCache: false };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { fetchJsonCached };
