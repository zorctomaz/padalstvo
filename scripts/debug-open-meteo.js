'use strict';
const https = require('https');

function fetchRaw(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'padalstvo-vreme/1.0 (+https://github.com/)' } }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    }).on('error', reject);
  });
}

async function main() {
  // Bled (46.3683, 14.1146) - preveri height-level (80/120/180m AGL) IN
  // pressure-level (hPa) veter, oboje po dokumentaciji open-meteo.com/en/docs
  // ne potrebuje API kljuca, CORS naj bi bil odprt (namenjen brskalniku).
  const params = [
    'wind_speed_10m', 'wind_direction_10m',
    'wind_speed_80m', 'wind_direction_80m',
    'wind_speed_120m', 'wind_direction_120m',
    'wind_speed_180m', 'wind_direction_180m',
  ].join(',');
  const url = `https://api.open-meteo.com/v1/forecast?latitude=46.3683&longitude=14.1146&hourly=${params}&timezone=auto&forecast_days=2`;
  const res = await fetchRaw(url);
  console.log('=== height-level status:', res.status);
  console.log('Access-Control-Allow-Origin:', res.headers['access-control-allow-origin']);
  console.log('content-type:', res.headers['content-type']);
  try {
    const data = JSON.parse(res.body);
    console.log('units:', JSON.stringify(data.hourly_units));
    console.log('prvih 5 urnih vrednosti:');
    for (let i = 0; i < 5; i++) {
      console.log(
        data.hourly.time[i],
        '10m:', data.hourly.wind_speed_10m[i], data.hourly.wind_direction_10m[i],
        '80m:', data.hourly.wind_speed_80m[i], data.hourly.wind_direction_80m[i],
        '120m:', data.hourly.wind_speed_120m[i], data.hourly.wind_direction_120m[i],
        '180m:', data.hourly.wind_speed_180m[i], data.hourly.wind_direction_180m[i]
      );
    }
  } catch (err) {
    console.log('napaka pri parsanju:', err.message, res.body.slice(0, 500));
  }

  // Pritisni nivoji (hPa) - za primerjavo, ali je smiselno namesto/poleg AGL
  const pressureLevels = [1000, 925, 850, 700, 600, 500];
  const pParams = pressureLevels.flatMap((p) => [`wind_speed_${p}hPa`, `wind_direction_${p}hPa`]).join(',');
  const url2 = `https://api.open-meteo.com/v1/forecast?latitude=46.3683&longitude=14.1146&hourly=${pParams}&timezone=auto&forecast_days=1`;
  const res2 = await fetchRaw(url2);
  console.log('\n=== pressure-level status:', res2.status);
  try {
    const data2 = JSON.parse(res2.body);
    console.log('units:', JSON.stringify(data2.hourly_units));
    console.log(data2.hourly.time[12], JSON.stringify(
      Object.fromEntries(pressureLevels.map((p) => [p, [data2.hourly['wind_speed_' + p + 'hPa'][12], data2.hourly['wind_direction_' + p + 'hPa'][12]]]))
    ));
  } catch (err) {
    console.log('napaka pri parsanju:', err.message, res2.body.slice(0, 500));
  }
}

main().catch((err) => {
  console.error('NAPAKA', err);
  process.exitCode = 1;
});
