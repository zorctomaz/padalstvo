'use strict';
const { fetchArsoForecast } = require('../src/arso');

async function main() {
  const res = await fetchArsoForecast('Trebnje');
  console.log('ok:', res.ok, 'days:', res.days.length);
  for (const day of res.days) {
    const temps = day.timeline.map((e) => e.temperatureC).filter((t) => t !== null);
    const winds = day.timeline.map((e) => e.windSpeedKmh).filter((w) => w !== null);
    const rain = day.timeline.reduce((sum, e) => sum + (e.precipitationMm || 0), 0);
    const clouds = day.timeline.map((e) => e.cloudCover).filter(Boolean);
    console.log(
      day.date,
      'temp=' + Math.min(...temps) + '..' + Math.max(...temps) + '°C',
      'veter_max=' + Math.max(...winds) + 'km/h',
      'padavine_skupaj=' + rain.toFixed(1) + 'mm',
      'oblacnost=' + [...new Set(clouds)].join('/')
    );
    for (const e of day.timeline) {
      console.log(
        '  ',
        e.time,
        e.temperatureC + '°C',
        e.windSpeedKmh + 'km/h(' + e.windDirection + ')',
        e.precipitationMm + 'mm',
        e.cloudCover
      );
    }
  }
}

main().catch((err) => {
  console.error('NAPAKA', err);
  process.exitCode = 1;
});
