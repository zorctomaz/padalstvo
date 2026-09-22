'use strict';
const { fetchArsoForecast } = require('../src/arso');

const CANDIDATES = [
  'Ljubljana', 'Bovec', 'Škofja Loka', 'Postojna', 'Bled', 'Kranj', 'Nova Gorica', 'Celje', 'Maribor',
  'Novo mesto', 'Murska Sobota', 'Koper', 'Kočevje', 'Črnomelj', 'Sežana', 'Ilirska Bistrica',
  'Ajdovščina', 'Idrija', 'Cerknica', 'Litija', 'Trbovlje', 'Velenje', 'Slovenj Gradec',
  'Ravne na Koroškem', 'Ptuj', 'Lendava', 'Brežice', 'Krško', 'Zagorje ob Savi', 'Kamnik',
  'Domžale', 'Grosuplje', 'Ribnica', 'Tolmin', 'Jesenice', 'Radovljica', 'Trebnje', 'Šentrupert',
  'Kranjska Gora', 'Metlika', 'Mozirje', 'Gornja Radgona', 'Ormož', 'Sevnica', 'Vrhnika', 'Logatec',
];

async function main() {
  for (const name of CANDIDATES) {
    try {
      const res = await fetchArsoForecast(name);
      const first = res.days[0] && res.days[0].timeline[0];
      console.log(
        `${res.ok ? 'OK  ' : 'FAIL'} ${name.padEnd(20)} dnevi=${res.days.length} prvi=${first ? first.temperatureC + '°C' : '-'}`
      );
    } catch (err) {
      console.log(`ERR  ${name.padEnd(20)} ${err.message}`);
    }
  }
}

main();
