'use strict';

/**
 * Kraji, ki jih ARSO-jev napovedni API dejansko podpira (potrjeno na
 * živem odgovoru prek GitHub Actions, 2026-09-22 - peskovnik agenta nima
 * omrežnega dostopa do ARSO domen, glej README "Preverjanje ARSO API
 * odgovora v živo"). Preizkušenih je bilo ~45 večjih slovenskih krajev;
 * spodnjih 36 je vrnilo veljavno napoved, ostali (npr. Ajdovščina,
 * Tolmin, Kranjska Gora, Šentrupert, Zagorje ob Savi, Slovenj Gradec,
 * Ribnica, Mozirje, Gornja Radgona, Ormož) so vrnili HTTP 404.
 *
 * Uporabljeno za "Moja lokacija"/izbiro na zemljevidu: uradna ARSO
 * napoved se za poljubno GPS točko prikaže za NAJBLIŽJI kraj s tega
 * seznama (glede na DEJANSKO točko uporabnika), ne za kraj, ki je
 * (iz drugih razlogov) dodeljen najbližjemu URADNEMU vzletišču v
 * src/sites.json (site.arsoLocation) - isti vzorec popravka kot prej pri
 * ARSO regiji termike (glej src/arso-thermal.js REGION_CENTERS).
 *
 * Koordinate so približne (center kraja), dovolj natančne za izbiro
 * najbližjega izmed ~36 krajev, razporejenih po vsej Sloveniji.
 */
const ARSO_LOCATIONS = [
  { name: 'Ljubljana', slug: 'ljubljana', lat: 46.0569, lon: 14.5058 },
  { name: 'Bovec', slug: 'bovec', lat: 46.338, lon: 13.5522 },
  { name: 'Škofja Loka', slug: 'skofja-loka', lat: 46.1653, lon: 14.3057 },
  { name: 'Postojna', slug: 'postojna', lat: 45.7756, lon: 14.2136 },
  { name: 'Bled', slug: 'bled', lat: 46.3683, lon: 14.1146 },
  { name: 'Kranj', slug: 'kranj', lat: 46.2437, lon: 14.3557 },
  { name: 'Nova Gorica', slug: 'nova-gorica', lat: 45.9558, lon: 13.6483 },
  { name: 'Celje', slug: 'celje', lat: 46.2311, lon: 15.2683 },
  { name: 'Maribor', slug: 'maribor', lat: 46.5547, lon: 15.6459 },
  { name: 'Novo mesto', slug: 'novo-mesto', lat: 45.8017, lon: 15.1689 },
  { name: 'Murska Sobota', slug: 'murska-sobota', lat: 46.6636, lon: 16.166 },
  { name: 'Koper', slug: 'koper', lat: 45.5481, lon: 13.7302 },
  { name: 'Kočevje', slug: 'kocevje', lat: 45.6392, lon: 14.8594 },
  { name: 'Črnomelj', slug: 'crnomelj', lat: 45.5717, lon: 15.19 },
  { name: 'Sežana', slug: 'sezana', lat: 45.7086, lon: 13.8714 },
  { name: 'Ilirska Bistrica', slug: 'ilirska-bistrica', lat: 45.5678, lon: 14.2408 },
  { name: 'Idrija', slug: 'idrija', lat: 46.0, lon: 14.0281 },
  { name: 'Cerknica', slug: 'cerknica', lat: 45.7969, lon: 14.3597 },
  { name: 'Litija', slug: 'litija', lat: 46.0578, lon: 14.8253 },
  { name: 'Trbovlje', slug: 'trbovlje', lat: 46.1547, lon: 15.0525 },
  { name: 'Velenje', slug: 'velenje', lat: 46.3592, lon: 15.1103 },
  { name: 'Ravne na Koroškem', slug: 'ravne-na-koroskem', lat: 46.5461, lon: 14.96 },
  { name: 'Ptuj', slug: 'ptuj', lat: 46.4198, lon: 15.87 },
  { name: 'Lendava', slug: 'lendava', lat: 46.5667, lon: 16.4522 },
  { name: 'Brežice', slug: 'brezice', lat: 45.9058, lon: 15.5942 },
  { name: 'Krško', slug: 'krsko', lat: 45.9597, lon: 15.4903 },
  { name: 'Kamnik', slug: 'kamnik', lat: 46.2258, lon: 14.6111 },
  { name: 'Domžale', slug: 'domzale', lat: 46.1394, lon: 14.5944 },
  { name: 'Grosuplje', slug: 'grosuplje', lat: 45.9569, lon: 14.6553 },
  { name: 'Jesenice', slug: 'jesenice', lat: 46.4297, lon: 14.0561 },
  { name: 'Radovljica', slug: 'radovljica', lat: 46.3436, lon: 14.1728 },
  { name: 'Trebnje', slug: 'trebnje', lat: 45.9075, lon: 15.0119 },
  { name: 'Metlika', slug: 'metlika', lat: 45.6461, lon: 15.3211 },
  { name: 'Sevnica', slug: 'sevnica', lat: 46.0086, lon: 15.3153 },
  { name: 'Vrhnika', slug: 'vrhnika', lat: 45.9633, lon: 14.2958 },
  { name: 'Logatec', slug: 'logatec', lat: 45.9169, lon: 14.2286 },
];

module.exports = { ARSO_LOCATIONS };
