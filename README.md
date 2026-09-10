# Padalstvo Vreme

Spletna aplikacija (v celoti prilagojena mobilnim napravam) za vremensko napoved
za **jadralno padalstvo** v Sloveniji. Na podlagi GPS lokacije uporabnika najde
najbližje znano vzletišče in prikaže vremenske podatke ter iz njih izpeljane
ocene, pomembne za pilote: veter (hitrost/smer/sunki), oceno baze oblakov,
grobo oceno termike in padavine/točo v bližini.

## Viri podatkov

| Vir | Kaj ponuja | Kako je uporabljen |
|---|---|---|
| **ARSO** – `vreme.arso.gov.si/api/1.0/location/` | Večdnevna napoved (temperatura, veter, oblačnost, padavine) po imenu kraja | Strežnik (`src/arso.js`) pridobi napoved za ARSO lokacijo, najbližjo izbranemu vzletišču |
| **opendata.si** – `opendata.si/vreme/report/` | ARSO radar padavin, ALADIN napoved oblačnosti/padavin, verjetnost toče – neposredno po GPS koordinati | Strežnik (`src/opendata.js`) pridobi podatke za koordinato vzletišča/uporabnika |
| **ARSO letalsko vreme** – `meteo.si/met/sl/aviation/` | GAFOR, SIGWX, karte vetra na višini | Aplikacija povezuje neposredno na uradno stran (grafični/besedilni produkti, primerni za odpiranje, ne za avtomatsko razčlenjevanje) |
| **SkyTech.si** | Žive vremenske postaje (veter v realnem času) na več slovenskih lokacijah | Aplikacija povezuje na SkyTech, ker ne objavljajo uradnega javnega API-ja |

### Pomembna opomba o zanesljivosti

- ARSO ne objavlja uradne, formalne specifikacije za `vreme.arso.gov.si/api/1.0/`,
  zato razčlenjevalnik (`src/arso.js`) polja bere obrambno (poskusi več znanih
  imen polj) in se ob spremembah ne sesuje, ampak jasno javi, da podatek
  manjka.
- Okolje, v katerem je bila aplikacija razvita, nima omrežnega dostopa do
  domen ARSO/opendata.si/SkyTech (blokirano s strani varnostne politike
  organizacije), zato integracije **ni bilo mogoče v živo preizkusiti** med
  razvojem. Strežniška koda je bila preverjena na dejanski (čeprav
  blokirani) URL shemi in se ob napaki (403, časovna omejitev, sprememba
  oblike odgovora) elegantno degradira – uporabniku prikaže jasno sporočilo
  namesto da bi se aplikacija sesula. **Pred uporabo v produkciji priporočamo
  hiter preizkus z dejanskim omrežnim dostopom** (glejte spodaj) in po potrebi
  prilagoditev imen polj v `src/arso.js`.
- Ocene termike, baze oblakov in "primernosti vetra" so poenostavljene
  hevristike (glejte `src/paragliding.js`), **niso uradna letalska napoved**.
  V aplikaciji je zato viden opozorilni napis (disclaimer).

### Preverjanje ARSO API odgovora v živo

```bash
curl "https://vreme.arso.gov.si/api/1.0/location/?location=Bovec"
```

Če se struktura razlikuje od pričakovane (`features[].properties.days[].timeline[]`
s polji `t`, `rh`, `dd`, `ff_val`, `ffmax_val`, `clouds_shortText`, `tp_acc`),
prilagodite `pick(...)` klice v `src/arso.js`.

## Zagon

```bash
npm install
npm start
```

Aplikacija posluša na `http://localhost:3000` (ali `$PORT`). Odpri jo v
mobilnem brskalniku (ali z DevTools mobilnim pogledom) – vmesnik je zasnovan
mobile-first, deluje pa tudi na namizju.

Za razvoj z avtomatskim ponovnim zagonom ob spremembah:

```bash
npm run dev
```

## Namestitev (deploy)

Aplikacija je navaden Node/Express strežnik brez podatkovne baze – primerna je
za katerokoli gostovanje, ki poganja Node.js 18+ (Render, Railway, Fly.io,
VPS + PM2, Docker …). Ni potrebnih API ključev.

## Struktura projekta

```
server.js              Express strežnik in API poti (/api/sites, /api/nearest, /api/weather)
src/sites.json          Seznam znanih slovenskih vzletišč (uredi/dodaj po potrebi)
src/geo.js              Haversine razdalja, iskanje najbližjega vzletišča
src/fetchUtil.js         fetch s časovno omejitvijo in predpomnilnikom (10 min TTL)
src/arso.js              Klient za ARSO napoved po imenu kraja
src/opendata.js          Klient za opendata.si GPS poročilo (radar/ALADIN/toča)
src/paragliding.js       Izpeljane ocene: baza oblakov, ocena vetra, termika, povezave
public/                  Mobilno prilagojen frontend (vanilla HTML/CSS/JS, brez build koraka)
```

## Dodajanje vzletišč

Uredi `src/sites.json` – vsak vnos potrebuje `id`, `name`, `region`, `lat`,
`lon`, `elevation` (m), `arsoLocation` (ime kraja, kot ga pozna ARSO napoved)
in po želji `skytechUrl` ter `notes`. Koordinate in ARSO imena krajev za
obstoječi seznam so bila zbrana iz javno dostopnih virov (turistične strani,
Paragliding Geopedia) in jih pred resno uporabo priporočamo preveriti/dopolniti
s podatki lokalnih klubov.

## Varnost in odgovornost

Aplikacija je informativno orodje. Ocene vetra, termike in baze oblakov so
poenostavljene in ne nadomeščajo uradnega vremenskega briefinga, GAFOR/SIGWX
produktov ali lastne presoje pilota pred letom.
