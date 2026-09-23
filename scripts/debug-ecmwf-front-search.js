'use strict';

/**
 * Uporabnik sprašuje, ali ECMWF Open Charts ponuja produkt, ki dejansko
 * prikazuje FRONTE (hladne/tople), ne le surova polja (MSLP, veter,
 * temperatura). Ta skript prebere celoten katalog produktov
 * (opencharts-api/v1/products/) in poišče karkoli z "front" v imenu,
 * naslovu ali opisu.
 */

async function main() {
  const listRes = await fetch('https://charts.ecmwf.int/opencharts-api/v1/products/', {
    headers: { 'User-Agent': 'Mozilla/5.0 (padalstvo-vreme front search)' },
  });
  console.log('status:', listRes.status, 'ok:', listRes.ok);
  const list = await listRes.json();
  console.log('total products:', Array.isArray(list) ? list.length : 'ni seznam - ' + JSON.stringify(list).slice(0, 300));

  if (!Array.isArray(list)) return;

  const names = list.map((p) => p.name || p.id || JSON.stringify(p));
  console.log('\n=== vsa imena produktov, ki vsebujejo "front" ===');
  const frontNames = names.filter((n) => /front/i.test(n));
  console.log(frontNames.length ? frontNames : '(nobenega)');

  console.log('\n=== prvih 30 imen produktov (za splosen pregled kataloga) ===');
  console.log(names.slice(0, 30));

  console.log('\n=== skupno stevilo produktov ===');
  console.log(names.length);

  // Za nekaj obetavnih kandidatov (MSLP-vezani produkti) preverimo tudi
  // naslov/opis, ce morda tam omenjajo fronte, čeprav ime ne vsebuje "front".
  console.log('\n=== naslovi/opisi produktov, ki v imenu vsebujejo "mslp" ali "synop" ===');
  const mslpNames = names.filter((n) => /mslp|synop|analysis/i.test(n));
  for (const name of mslpNames.slice(0, 15)) {
    try {
      const res = await fetch(`https://charts.ecmwf.int/opencharts-api/v1/products/${name}/`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (padalstvo-vreme front search)' },
      });
      const data = await res.json();
      const title = data.data && data.data.attributes && data.data.attributes.title;
      const desc = data.data && data.data.attributes && data.data.attributes.description;
      console.log(`  ${name}: title="${title}"`);
    } catch (err) {
      console.log(`  ${name}: napaka - ${err.message}`);
    }
  }
}

main().catch((err) => console.log('NAPAKA:', err.message));
