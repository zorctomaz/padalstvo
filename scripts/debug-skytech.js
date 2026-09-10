'use strict';
// Razhroščevanje 4. krog: preveri odzivne glave (CORS, cache, vary) - da
// ugotovimo, ali bi lahko klient (brskalnik obiskovalca, ki ima
// slovenski/EU IP) sam prebral skytech.si prek fetch() iz naše strani.

async function inspect() {
  const res = await fetch('https://skytech.si/', {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    },
  });
  console.log('STATUS:', res.status);
  console.log('VSE ODZIVNE GLAVE:');
  for (const [key, value] of res.headers.entries()) {
    console.log(`  ${key}: ${value}`);
  }
}

inspect().catch((err) => console.log('NAPAKA:', err.message));
