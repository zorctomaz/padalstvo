'use strict';
const https = require('https');

function fetchRaw(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'padalstvo-vreme/1.0' } }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', reject);
  });
}

async function main() {
  const levels = [950, 900, 850, 800, 700, 600];
  const params = levels.flatMap((p) => [`temperature_${p}hPa`, `wind_speed_${p}hPa`, `wind_direction_${p}hPa`]).join(',');
  const url = `https://api.open-meteo.com/v1/forecast?latitude=46.3683&longitude=14.1146&hourly=${params}&timezone=auto&forecast_days=2`;
  const res = await fetchRaw(url);
  console.log('status:', res.status);
  try {
    const data = JSON.parse(res.body);
    console.log('units:', JSON.stringify(data.hourly_units));
    console.log('stevilo urnih tock:', data.hourly.time.length);
    console.log('vzorec (idx 12):', data.hourly.time[12]);
    for (const p of levels) {
      console.log(
        p, 'hPa:',
        'temp=' + data.hourly[`temperature_${p}hPa`][12],
        'veter=' + data.hourly[`wind_speed_${p}hPa`][12],
        'smer=' + data.hourly[`wind_direction_${p}hPa`][12]
      );
    }
  } catch (err) {
    console.log('napaka:', err.message, res.body.slice(0, 800));
  }
}

main().catch((err) => {
  console.error('NAPAKA', err);
  process.exitCode = 1;
});
