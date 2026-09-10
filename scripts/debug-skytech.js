'use strict';
// Razhroščevanje 3. krog: uporabnik v pravem brskalniku na skytech.si vidi
// polno tabelo postaj po regijah (Štajerska, Notranjska, Gorenjska ...),
// jaz pa sem prej dobil osiromašeno stran brez podatkov. Sum: stran servira
// drugačno vsebino glede na User-Agent (prepozna bota) in/ali IP/geolokacijo.
// Preverimo z realističnim UA brskalnika.

async function inspect(label, headers) {
  console.log('\n===== ' + label + ' =====');
  try {
    const res = await fetch('https://skytech.si/', { headers });
    console.log('STATUS:', res.status, res.statusText);
    const text = await res.text();
    console.log('BODY LENGTH:', text.length);

    const hasTable = /<table/i.test(text);
    console.log('Vsebuje <table>?', hasTable);

    const hasStajerska = /Štajerska|Notranjska|Gorenjska/i.test(text);
    console.log('Vsebuje imena regij (Štajerska/Notranjska/Gorenjska)?', hasStajerska);

    // Poišči vzorce "Postaja ... Hitrost vetra ... m/s"
    const windRows = [...text.matchAll(/<tr[^>]*>[\s\S]{0,400}?m\/s[\s\S]{0,200}?<\/tr>/gi)];
    console.log('Število vrstic s "m/s" v <tr>:', windRows.length);
    if (windRows.length > 0) {
      console.log('Prva vrstica (surov HTML):');
      console.log(windRows[0][0].slice(0, 800));
    }

    if (hasTable && !windRows.length) {
      // morda je tabela tam, a regex ni ujel - izpiši okolico prve <table>
      const idx = text.search(/<table/i);
      console.log('Izsek okoli prve <table> (2000 znakov):');
      console.log(text.slice(idx, idx + 2000));
    }
  } catch (err) {
    console.log('NAPAKA:', err.message);
  }
}

(async () => {
  await inspect('Bot-like UA (prejšnji poskus)', {
    'User-Agent': 'Mozilla/5.0 (compatible; padalstvo-vreme-debug/1.0)',
  });

  await inspect('Realen Chrome UA', {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'sl-SI,sl;q=0.9,en;q=0.8',
  });

  await inspect('Brez User-Agent glave sploh', {});
})();
