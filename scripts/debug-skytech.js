'use strict';
// Začasen razhroščevalni skript: preveri, ali je mogoče iz skytech.si
// programsko prebrati hitrost/smer vetra po postajah (ni javnega API-ja,
// zato preverimo surov HTML).

async function inspect(url) {
  console.log('\n===== ' + url + ' =====');
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; padalstvo-vreme-debug/1.0)',
        Accept: 'text/html',
      },
    });
    console.log('STATUS:', res.status, res.statusText);
    const text = await res.text();
    console.log('BODY LENGTH:', text.length);

    // Ali stran uporablja iframe/JS za prikaz podatkov (pogosto pri takih widgetih)?
    const iframeMatches = [...text.matchAll(/<iframe[^>]*src=["']([^"']+)["']/gi)].map((m) => m[1]);
    console.log('IFRAME SRC-ji:', iframeMatches.slice(0, 20));

    // Poišči morebitne AJAX/API klice v <script> vsebini
    const scriptUrls = [...text.matchAll(/(https?:\/\/[^\s"'<>]+\.(?:php|json|asp|aspx)[^\s"'<>]*)/gi)].map((m) => m[1]);
    console.log('MOŽNI API/PHP URL-ji v HTML:', [...new Set(scriptUrls)].slice(0, 20));

    // Poišči besede povezane z vetrom (za grobo oceno, ali so podatki v samem HTML)
    const windIdx = text.search(/veter|km\/h|m\/s|wind/i);
    console.log('Prvo pojavljanje "veter/wind/km/h" na indeksu:', windIdx);
    if (windIdx >= 0) {
      console.log('Izsek okoli tega mesta:');
      console.log(text.slice(Math.max(0, windIdx - 300), windIdx + 700));
    }

    // Izpiši splošno strukturo <body> (prvih 2000 znakov za orientacijo)
    const bodyMatch = text.match(/<body[^>]*>([\s\S]*)/i);
    if (bodyMatch) {
      console.log('ZAČETEK <body> (prvih 1500 znakov):');
      console.log(bodyMatch[1].slice(0, 1500));
    }
  } catch (err) {
    console.log('NAPAKA:', err.message);
  }
}

(async () => {
  await inspect('https://skytech.si/');
  await inspect('https://skytech.si/?p=1');
})();
