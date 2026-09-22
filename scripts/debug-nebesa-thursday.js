'use strict';
const { fetchArsoForecast } = require('../src/arso');

async function main() {
  const res = await fetchArsoForecast('Ljubljana');
  console.log('ok:', res.ok, 'days:', res.days.length);
  for (const day of res.days) {
    console.log('=== DAN:', day.date, '===');
    for (const e of day.timeline) {
      console.log(
        e.time,
        'temp=' + e.temperatureC,
        'veter=' + e.windSpeedKmh + 'km/h(' + e.windDirection + ')',
        'sunki=' + e.windGustKmh,
        'padavine=' + e.precipitationMm + 'mm',
        'oblacnost=' + e.cloudCover
      );
    }
  }
}

main().catch((err) => {
  console.error('NAPAKA', err);
  process.exitCode = 1;
});
