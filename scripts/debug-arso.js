'use strict';
// Začasen razhroščevalni skript: izpiše surov ARSO JSON odgovor za Ljubljano,
// da lahko preverimo pravo obliko sheme (glej README opombo o negotovosti).
const url = 'https://vreme.arso.gov.si/api/1.0/location/?location=' + encodeURIComponent('Ljubljana');

fetch(url, { headers: { Accept: 'application/json' } })
  .then(async (res) => {
    console.log('STATUS:', res.status, res.statusText);
    const text = await res.text();
    console.log('BODY LENGTH:', text.length);
    console.log('BODY (prvih 4000 znakov):');
    console.log(text.slice(0, 4000));
  })
  .catch((err) => console.error('FETCH ERROR:', err.message));
