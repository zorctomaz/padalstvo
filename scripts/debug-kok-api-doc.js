'use strict';
// Začasno: prebere dokumentacijo novo pridobljenega API-ja (KOK/SkyTech),
// da lahko napišemo pravo integracijo. NE uporablja tokena (samo dokumentacija).

async function main() {
  const res = await fetch('https://api.kok.si/doc_aws_api_v2.html', {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; padalstvo-vreme/1.0)' },
  });
  console.log('STATUS:', res.status, res.statusText);
  const text = await res.text();
  console.log('LENGTH:', text.length);
  console.log('----- CELOTNA VSEBINA -----');
  console.log(text);
}

main().catch((err) => console.log('NAPAKA:', err.message));
