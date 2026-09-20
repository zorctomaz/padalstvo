'use strict';

/**
 * ZAČASNO: preveri, ali KOK/SkyTech API (aws_api_v2.php) ponuja
 * ZGODOVINO meritev po postaji (za graf vetra/temperature zadnjih ur),
 * ali samo trenutno stanje (?latest=1, ki ga že uporabljamo). Izpiše
 * celotno dokumentacijsko stran (poenostavljeno, brez HTML značk) in
 * poskusi nekaj verjetnih parametrov za zgodovinsko poizvedbo na eni
 * znani postaji (id 10, Vogel).
 */

const token = process.env.SKYTECH_API_TOKEN;

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .join('\n');
}

async function fetchText(url, headers) {
  const res = await fetch(url, { headers });
  const text = await res.text();
  return { status: res.status, text };
}

async function main() {
  console.log('=== Dokumentacija (doc_aws_api_v2.html), poenostavljeno besedilo ===');
  const doc = await fetchText('https://api.kok.si/doc_aws_api_v2.html', {
    Accept: 'text/html',
    'User-Agent': 'padalstvo-vreme/1.0',
  });
  console.log('HTTP status:', doc.status);
  console.log(stripHtml(doc.text));

  console.log('\n=== Poskus zgodovinske poizvedbe za postajo id=10 (Vogel) ===');
  const attempts = [
    'https://api.kok.si/aws_api_v2.php?postaja=10',
    'https://api.kok.si/aws_api_v2.php?id=10',
    'https://api.kok.si/aws_api_v2.php?postaja_id=10&zgodovina=1',
    'https://api.kok.si/aws_api_v2.php?postaja=10&od=' + encodeURIComponent(new Date(Date.now() - 6 * 3600000).toISOString()) + '&do=' + encodeURIComponent(new Date().toISOString()),
    'https://api.kok.si/aws_api_v2.php?history=1&postaja=10',
  ];
  for (const url of attempts) {
    try {
      const r = await fetchText(url, { Accept: 'application/json', 'X-Api-Key': token, 'User-Agent': 'padalstvo-vreme/1.0' });
      console.log(`\n-- ${url}\nHTTP ${r.status}\n${r.text.slice(0, 800)}`);
    } catch (err) {
      console.log(`\n-- ${url}\nNAPAKA: ${err.message}`);
    }
  }
}

main();
