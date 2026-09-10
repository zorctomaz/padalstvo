'use strict';
// Začasen razhroščevalni skript, 2. krog: poišči meni/povezave do postaj
// in preveri lasten skript ogl.js (morda vsebuje AJAX endpoint).

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; padalstvo-vreme-debug/1.0)' },
  });
  const text = await res.text();
  return { status: res.status, text };
}

(async () => {
  const { status, text } = await fetchText('https://skytech.si/');
  console.log('HOMEPAGE STATUS:', status, 'LENGTH:', text.length);

  // Vse povezave v meniju/strani (href + besedilo), da najdemo "Postaje"/"Vreme" ipd.
  const links = [...text.matchAll(/<a[^>]*href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi)]
    .map((m) => ({ href: m[1], text: m[2].trim() }))
    .filter((l) => l.text || l.href.includes('skytech'));
  console.log('VSE POVEZAVE (' + links.length + '):');
  console.log(JSON.stringify(links, null, 2));

  // Poišči vse številke + enote (km/h, m/s, °C) v celotnem HTML - morda so postaje
  // naštete kot statične vrednosti na strani (redko, a preverimo).
  const dataPoints = [...text.matchAll(/([\wčšž .-]{2,30})\s*[:\-]?\s*(\d{1,3}(?:[.,]\d)?)\s*(km\/h|m\/s|°C)/gi)];
  console.log('MOREBITNI PODATKOVNI VZORCI:', dataPoints.slice(0, 30).map((m) => m[0]));

  // Preveri ogl.js
  try {
    const oglRes = await fetchText('https://skytech.si/skytechsys/ogl.js?v=2.3');
    console.log('\nogl.js STATUS:', oglRes.status, 'LENGTH:', oglRes.text.length);
    console.log('ogl.js VSEBINA (prvih 3000 znakov):');
    console.log(oglRes.text.slice(0, 3000));
  } catch (err) {
    console.log('ogl.js NAPAKA:', err.message);
  }
})();
