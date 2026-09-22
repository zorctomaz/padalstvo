'use strict';
const https = require('https');

function fetchRaw(url, origin) {
  return new Promise((resolve, reject) => {
    const headers = { 'User-Agent': 'padalstvo-vreme/1.0' };
    if (origin) headers.Origin = origin;
    https.get(url, { headers }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers }));
    }).on('error', reject);
  });
}

async function main() {
  const url = 'https://api.open-meteo.com/v1/forecast?latitude=46.3683&longitude=14.1146&hourly=wind_speed_80m&forecast_days=1';
  const res = await fetchRaw(url, 'https://padalstvo.fotra.net');
  console.log('status:', res.status);
  console.log('access-control-allow-origin:', res.headers['access-control-allow-origin']);
  console.log('vary:', res.headers['vary']);
  console.log('vse glave:', JSON.stringify(res.headers, null, 2));
}

main().catch((err) => {
  console.error('NAPAKA', err);
  process.exitCode = 1;
});
