# Padalstvo Vreme

Spletna aplikacija (v celoti prilagojena mobilnim napravam) za vremensko napoved
za **jadralno padalstvo** v Sloveniji. Na podlagi GPS lokacije uporabnika najde
najbližje znano vzletišče in prikaže vremenske podatke ter iz njih izpeljane
ocene, pomembne za pilote:

- veter (hitrost/smer/sunki) z oceno primernosti za let,
- **primerjava smeri vetra z znano primerno smerjo vzleta** (kjer je ta
  potrjena – glej opombo spodaj),
- grobo oceno baze oblakov,
- grobo oceno termike in **okvirno "termalno okno"** (v katerih urah je
  termika verjetno aktivna) z oceno primernosti za XC prelete,
- padavine/točo v bližini,
- povezavo na veter na višini (za oceno strižnega vetra pri XC preletih).

## Viri podatkov

| Vir | Kaj ponuja | Kako je uporabljen |
|---|---|---|
| **ARSO** – `vreme.arso.gov.si/api/1.0/location/` | Večdnevna napoved (temperatura, veter, oblačnost, padavine) po imenu kraja | Strežnik (`src/arso.js`) pridobi napoved za ARSO lokacijo, najbližjo izbranemu vzletišču |
| **opendata.si** – `opendata.si/vreme/report/` | ARSO radar padavin, ALADIN napoved oblačnosti/padavin, verjetnost toče – neposredno po GPS koordinati | Strežnik (`src/opendata.js`) pridobi podatke za koordinato vzletišča/uporabnika |
| **ARSO letalsko vreme** – `meteo.si/met/sl/aviation/` | GAFOR, SIGWX, karte vetra na višini | Aplikacija povezuje neposredno na uradno stran (grafični/besedilni produkti, primerni za odpiranje, ne za avtomatsko razčlenjevanje) |
| **SFFA telefonski odzivniki** | Žive vremenske postaje (veter v realnem času) na nekaterih vzletiščih | Za vzletišča s potrjeno postajo (`liveStation.confirmed`) aplikacija prikaže telefonsko številko odzivnika (vir: SFFA – Zveza za prosto letenje) |
| **SkyTech.si** | Proizvajalec vremenskih postaj; po njihovih trditvah izbrane postaje pošiljajo podatke nanje vsakih ~10 min | Le splošna povezava na domačo stran – **potrjeno (2026-09-10, glej spodaj), da javno ne obstaja seznam/API postaj**, zato programsko branje ni mogoče |
| **Windy.com** | Veter na višini (izbira nivoja/hPa), globalni model | Dodatna povezava na koordinato vzletišča – ARSO/meteo.si javno ne objavlja strojno berljivih kart vetra na višini, zato je Windy pragmatična dopolnitev |

### Ocene, specifične za jadralno padalstvo

| Ocena | Kako je izračunana | Zanesljivost |
|---|---|---|
| **Primernost smeri vetra za vzlet** (`rateLaunchAlignment`) | Napovedano smer vetra primerja s seznamom `launchWindDirections` pri vzletišču (`src/sites.json`) | Potrjeno (iz javno dostopnih opisov vzletišč) le za Vogel, Kobalo, Lijak in Kovk. Pri ostalih vzletiščih je polje `null` in aplikacija to jasno pove namesto ugibanja. **Pred letom vedno preveri z lokalnim društvom/šolo letenja.** |
| **Termalno okno in XC ocena** (`estimateThermalWindow`) | Iz dnevnega poteka temperature/oblačnosti/padavin/vetra oceni približne ure aktivne termike | Groba hevristika, ne meteorološki model. Ne upošteva orografije, senc, inverzij ipd. |
| **Baza oblakov** (`estimateCloudBaseM`) | Klasično pravilo: 125 m na °C razlike med temperaturo in rosiščem | Standarden približek, uporaben za grobo oceno, ne za natančno letalsko planiranje |

Pomembna tehnična opomba o smeri vetra: ARSO besedilna polja (npr. `dd_shortText`)
so predvidoma v slovenskih okrajšavah (S = sever, J = jug, V = vzhod, Z = zahod),
zato razčlenjevalnik namenoma NE podpira hkrati angleških okrajšav (bi bilo
dvoumno – npr. "S" bi lahko pomenilo sever ali "South"). Če je v odgovoru na
voljo številska stopinja smeri, jo aplikacija uporabi prednostno.

### Pomembna opomba o zanesljivosti

- **ARSO shema je bila potrjena na živem odgovoru** (2026-09-10, prek GitHub
  Actions – to razvojno okolje samo nima omrežnega dostopa do ARSO domen).
  Dejanska oblika je `{ forecast3h: { features: [ { properties: { days: [...] } } ] } }`;
  `src/arso.js` (`extractDays`) to pravilno razčleni. Polja znotraj
  `timeline[]` (`t`, `rh`, `dd_shortText`, `ff_val`, `ffmax_val`, `clouds_shortText`,
  `tp_acc`, `msl`, `valid`, `cloudBase_shortText`) so prav tako potrjena.
  Razčlenjevalnik kljub temu polja bere obrambno (poskusi več znanih imen),
  za primer, da ARSO shemo v prihodnje spremeni.
- **Imena lokacij (`arsoLocation`) niso poljubna** – ARSO API podpira le
  omejen seznam krajev (predvidoma večja mesta/regionalni centri), ne vseh
  slovenskih krajevnih imen. Potrjeno delujoča imena: `Ljubljana`, `Bovec`,
  `Škofja Loka`, `Postojna`, `Bled`, `Kranj`, `Nova Gorica`, `Celje`, `Maribor`.
  Za vzletišča, ki niso v bližini takega mesta, `arsoLocation` kaže na
  najbližje potrjeno veljavno mesto (glej opombo `notes` pri posameznem
  vzletišču v `src/sites.json`) – napoved je zato regijska približna, ne
  za točno GPS lokacijo vzletišča.
- Ocene termike, baze oblakov in "primernosti vetra" so poenostavljene
  hevristike (glejte `src/paragliding.js`), **niso uradna letalska napoved**.
  V aplikaciji je zato viden opozorilni napis (disclaimer).

### Preverjanje ARSO API odgovora v živo

```bash
curl "https://vreme.arso.gov.si/api/1.0/location/?location=Bovec"
```

Če je odgovor prazen ali 404, ime kraja verjetno ni v ARSO-jevem podprtem
seznamu lokacij – poišči najbližje veljavno večje mesto (glej seznam zgoraj).

## Zagon (lokalno)

```bash
npm install
npm run build:data   # zgradi public/data/*.json (potrebno, da frontend sploh prikaže podatke)
npm start
```

Aplikacija posluša na `http://localhost:3000` (ali `$PORT`). Odpri jo v
mobilnem brskalniku (ali z DevTools mobilnim pogledom) – vmesnik je zasnovan
mobile-first, deluje pa tudi na namizju.

Za razvoj z avtomatskim ponovnim zagonom ob spremembah strežnika:

```bash
npm run dev
```

Frontend bere podatke iz `public/data/` (glej razdelek *Namestitev* spodaj),
zato po vsaki spremembi `src/sites.json` ali če želiš sveže podatke, znova
poženi `npm run build:data`.

## Namestitev (deploy)

Frontend (`public/`) bere podatke izključno iz statičnih JSON datotek v
`public/data/` (glej spodaj) – zato ga je mogoče gostiti **popolnoma
statično**, brez strežnika. `server.js` (Express) je na voljo kot dodatna,
neobvezna možnost za lokalni razvoj ali za gostovanje s samodejno svežimi
podatki ob vsakem zagonu; za GitHub Pages ga ne potrebuješ.

### Možnost A: GitHub Pages + lastna domena (priporočeno za ta primer)

Ker je frontend statičen, celotna stran lahko "živi" na GitHub Pages,
podatki (ARSO/opendata.si) pa se osvežujejo prek priloženega GitHub Action
(`.github/workflows/update-data.yml`), ki:

1. vsako uro (in ob vsakem `push`-u ter ročno prek zavihka *Actions* →
   *Run workflow*) požene `node scripts/build-data.js`,
2. ta zgradi sveže JSON datoteke v `public/data/`,
3. celotna mapa `public/` se objavi na GitHub Pages prek uradnih
   `actions/upload-pages-artifact` + `actions/deploy-pages`.

**Pomembno:** podatki se ne osvežijo ob vsakem obisku strani, ampak samo ob
vsakem teku te Action (privzeto vsako uro) – obiskovalci med dvema tekoma
vidijo isti posnetek. Čas zadnje osvežitve je viden na vrhu strani
("Podatki osveženi: …").

Koraki za omogočanje:

1. V nastavitvah repozitorija pojdi na **Settings → Pages** in pod *Build
   and deployment → Source* izberi **GitHub Actions** (ne "Deploy from a
   branch").
2. Če to vejo (`claude/weather-forecast-mobile-app-cjwy4o`) združiš v svojo
   glavno vejo (npr. `main`), v `update-data.yml` pod `on.push.branches`
   dodaj/zamenjaj ime te veje, da se stran gradi tudi ob vsakem push-u.
3. Prvi tek sproži ročno: **Actions → "Osveži vremenske podatke in objavi
   na GitHub Pages" → Run workflow**. Po par minutah bo stran dosegljiva na
   `https://<uporabnik>.github.io/<repo>/`.
4. **Lastna domena:** v **Settings → Pages → Custom domain** vpiši svojo
   domeno (npr. `vreme.tvojadomena.si`) in shrani – GitHub bo sam ustvaril
   `CNAME` datoteko v izhodnem artefaktu. Pri registratorju domene nastavi:
   - za poddomeno (npr. `vreme.tvojadomena.si`): `CNAME` zapis na
     `<uporabnik>.github.io`;
   - za apex/golo domeno (`tvojadomena.si`): `A` zapisi na GitHub Pages IP-je
     `185.199.108.153`, `185.199.109.153`, `185.199.110.153`,
     `185.199.111.153` (po želji tudi ustrezni `AAAA` za IPv6).
   - Po propagaciji DNS (lahko traja do nekaj ur) v **Settings → Pages**
     obkljukaj **Enforce HTTPS**.

### Možnost B: Node/Express strežnik (Render, Railway, Fly.io, VPS + PM2, Docker …)

```bash
npm install
npm run build:data   # enkratna izgradnja public/data/ (ali pusti prazno – API poti spodaj delujejo tudi brez tega)
npm start
```

Strežnik posluša na `$PORT` (privzeto 3000) in poleg statičnih datotek
ponuja tudi `/api/sites`, `/api/nearest` in `/api/weather` – uporabno, če
želiš vedno sveže podatke ob vsaki zahtevi namesto urne osvežitve.
Ni potrebnih API ključev.

## Struktura projekta

```
.github/workflows/update-data.yml   Urna osvežitev podatkov + objava na GitHub Pages
scripts/build-data.js                Zgradi public/data/*.json iz ARSO/opendata.si
server.js                            (Neobvezno) Express strežnik za lokalni razvoj / žive API poti
src/sites.json                       Seznam znanih slovenskih vzletišč (uredi/dodaj po potrebi)
src/geo.js                           Haversine razdalja, iskanje najbližjega vzletišča
src/fetchUtil.js                     fetch s časovno omejitvijo in predpomnilnikom (10 min TTL)
src/arso.js                          Klient za ARSO napoved po imenu kraja
src/opendata.js                      Klient za opendata.si GPS poročilo (radar/ALADIN/toča)
src/paragliding.js                   Izpeljane ocene: baza oblakov, ocena vetra, termika, povezave
public/                              Mobilno prilagojen frontend (vanilla HTML/CSS/JS, brez build koraka)
public/data/                         Generirano z `npm run build:data` – NI v git repozitoriju (.gitignore)
```

## Žive postaje vs. samo napoved (📡 / 📊)

Izbirni seznam vzletišč loči tista s **potrjeno živo vremensko postajo**
(📡) od tistih, kjer je na voljo **le izračunana napoved** (📊). "Živa
postaja" tu pomeni potrjen avtomatski telefonski odzivnik (prek SFFA –
Zveze za prosto letenje Slovenije), ki v realnem času javi veter na
vzletišču; nekateri od njih naj bi podatke pošiljali tudi na skytech.si.
**Preverjeno (2026-09-10, prek GitHub Actions – glej Git zgodovino za
podrobnosti):** skytech.si nima javnega API-ja, seznama postaj ali
menija, ki bi vodil do posameznih postaj – domača stran ima le 5
splošnih povezav, njihov skript `ogl.js` je zgolj rotator reklamnih
pasic, `/?p=1` (prej uporabljen kot generična povezava) pa je navaden
WordPress zapis. Žive podatke po vsem sodeč ponujajo le prek lastne
Android aplikacije ali neposrednih URL-jev, ki jih pozna le posamezen
klub – zato aplikacija namesto ugibane/nekoristne povezave raje pokaže
telefonsko številko odzivnika (preverjen vir) in samo splošno povezavo
na skytech.si domov stran.

Trenutno potrjeno: **Vogel, Krvavec (Ambrož pod Krvavcem), Kobala, Kovk**.
Za ostala vzletišča `liveStation.confirmed` ostaja `false` – če veš za
resnično postajo/povezavo, dodaj podatke v `src/sites.json` (glej spodaj).

## Dodajanje vzletišč

Uredi `src/sites.json` – vsak vnos potrebuje `id`, `name`, `region`, `lat`,
`lon`, `elevation` (m), `arsoLocation` (ime kraja iz ARSO-jevega podprtega
seznama – glej opombo zgoraj), `launchWindDirections` (seznam primernih
smeri vetra ali `null`, če ni potrjeno), `liveStation` (`{ confirmed,
phone, note }` ali `{ confirmed: false, phone: null, note: "..." }`) in po
želji `skytechUrl` ter `notes`. Koordinate in imena za obstoječi seznam so
bila zbrana iz javno dostopnih virov (turistične strani, Paragliding
Geopedia, SFFA) in jih pred resno uporabo priporočamo preveriti/dopolniti
s podatki lokalnih klubov.

## Varnost in odgovornost

Aplikacija je informativno orodje. Ocene vetra, termike in baze oblakov so
poenostavljene in ne nadomeščajo uradnega vremenskega briefinga, GAFOR/SIGWX
produktov ali lastne presoje pilota pred letom.
