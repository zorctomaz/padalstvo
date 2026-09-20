# Padalstvo Vreme

Spletna aplikacija (v celoti prilagojena mobilnim napravam) za vremensko napoved
za **jadralno padalstvo** v Sloveniji. Gumb "📍 Moja lokacija" pokaže napoved
za TVOJO natančno GPS točko – ne glede na to, ali je uradno vzletišče in ali
je v bližini potrjena živa postaja (glej razdelek "Moja lokacija" spodaj); v
padajočem seznamu pa lahko izbereš tudi katero od znanih vzletišč. Aplikacija
prikaže vremenske podatke ter iz njih izpeljane ocene, pomembne za pilote:

- veter (hitrost/smer/sunki) z oceno primernosti za let,
- **primerjava smeri vetra z znano primerno smerjo vzleta** (kjer je ta
  potrjena – glej opombo spodaj),
- grobo oceno baze oblakov,
- grobo oceno termike in **okvirno "termalno okno"** (v katerih urah je
  termika verjetno aktivna) z oceno primernosti za XC prelete,
- padavine/točo v bližini,
- **druga SkyTech merilna mesta v bližini izbrane lokacije** (do 25 km,
  niso uradna vzletišča, a dajo dodaten vpogled v veter na sosednjih
  vrhovih/dolinah, kjer nameravaš leteti),
- povezavo na veter na višini (za oceno strižnega vetra pri XC preletih),
- **izbiro enote za prikaz hitrosti vetra** (km/h, m/s, mph, vozli) v
  izbirnem meniju na vrhu strani – izbira se shrani v brskalniku
  (`localStorage`) in velja za vse prikaze hitrosti/sunkov vetra na
  strani (interno se vedno računa v km/h, pretvorba je le za prikaz),
  - **nočno zatemnitev** – ponoči (med sončnim zahodom in vzhodom na
    relevantni lokaciji – glej razdelek spodaj) je stran namenoma zelo
    slabo vidna, saj se takrat jadralno padalstvo uradno (VFR, dnevno
    letenje) ne sme izvajati; gumb 🔦 na vrhu (viden le ponoči) to
    začasno izklopi za branje.

## Viri podatkov

| Vir | Kaj ponuja | Kako je uporabljen |
|---|---|---|
| **ARSO** – `vreme.arso.gov.si/api/1.0/location/` | Večdnevna napoved (temperatura, veter, oblačnost, padavine) po imenu kraja | Strežnik (`src/arso.js`) pridobi napoved za ARSO lokacijo, najbližjo izbranemu vzletišču |
| **opendata.si** – `opendata.si/vreme/report/` | ARSO radar padavin, ALADIN napoved oblačnosti/padavin, verjetnost toče – neposredno po GPS koordinati | Strežnik (`src/opendata.js`) pridobi podatke za koordinato vzletišča/uporabnika |
| **ARSO letalsko vreme** – `meteo.si/met/sl/aviation/` | GAFOR, SIGWX, karte vetra na višini | Aplikacija povezuje neposredno na uradno stran (grafični/besedilni produkti, primerni za odpiranje, ne za avtomatsko razčlenjevanje) |
| **SFFA telefonski odzivniki** | Žive vremenske postaje (veter v realnem času) na nekaterih vzletiščih | Za vzletišča s potrjeno postajo aplikacija prikaže telefonsko številko odzivnika (vir: SFFA – Zveza za prosto letenje) kot dodaten/varnostni vir |
| **KOK/SkyTech API** – `api.kok.si/aws_api_v2.php` | Uradne žive meritve (veter, sunki, smer, temperatura) za javne vremenske postaje po vsej Sloveniji, vključno z uradno oceno primerne smeri vetra po postaji (zelena/rumena/rdeča) | `src/skytech.js` (glej razdelek spodaj) – strežniški klic prek GitHub Actions, token v secrets |
| **Windy.com** | Veter na višini (izbira nivoja/hPa), globalni model | Dodatna povezava na koordinato vzletišča – ARSO/meteo.si javno ne objavlja strojno berljivih kart vetra na višini, zato je Windy pragmatična dopolnitev |

### Ocene, specifične za jadralno padalstvo

| Ocena | Kako je izračunana | Zanesljivost |
|---|---|---|
| **Primernost smeri vetra za vzlet** (`rateLaunchAlignment`) | Napovedano smer vetra primerja s primernimi smermi vzleta – ročno potrjenimi (`launchWindDirections` v `src/sites.json`) **ali**, če teh ni, z uradno oceno "zelene" smeri iz KOK/SkyTech API-ja za povezano postajo | Ročno potrjeno (iz javno dostopnih opisov vzletišč) za Vogel, Kobalo, Lijak in Kovk. Za Krvavec, Golte, Blegoš in Poreznik se smer vzame samodejno iz SkyTech ocene postaje (`launchWindDirectionsSource: "skytech"`). Za preostala vzletišča (Kum, Rogla, Nanos, Grmada) polje ostaja `null` in aplikacija to jasno pove namesto ugibanja. **Pred letom vedno preveri z lokalnim društvom/šolo letenja.** |
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

Aplikacija posluša na `http://localhost:3000` (ali `$PORT`). `npm start` ob
zagonu v terminal izpiše tudi QR kodo za naslov v lokalnem omrežju (npr.
`http://192.168.x.x:3000`) – poskeniraj jo s telefonom (ista WiFi kot
računalnik), da odpreš aplikacijo neposredno na mobilni napravi. Sicer jo
odpri v mobilnem brskalniku ročno (ali z DevTools mobilnim pogledom) – vmesnik je zasnovan
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

**Verzija:** `scripts/build-data.js` v `public/data/meta.json` zapiše tudi
kratko git-sha kode, ki je bila deployana (`version`, iz `GITHUB_SHA` v
Actions oz. `git rev-parse --short HEAD` lokalno). Frontend jo prikaže
pod naslovom aplikacije ("Različica: …") – tako lahko primerjaš, ali se
verzija na strani ujema z zadnjim commit-om in ali so tvoje spremembe že
objavljene (`public/data/*.json` se nalagajo z `cache: 'no-store'`, zato
ni potrebno ročno brisanje predpomnilnika brskalnika).

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
src/skytech.js                       Klient za uradni KOK/SkyTech API (žive meritve vetra po postajah)
src/paragliding.js                   Izpeljane ocene: baza oblakov, ocena vetra, termika, povezave
public/                              Mobilno prilagojen frontend (vanilla HTML/CSS/JS, brez build koraka)
public/data/                         Generirano z `npm run build:data` – NI v git repozitoriju (.gitignore)
public/data/skytech-stations.json    Javni seznam vseh SkyTech postaj (za "Moja lokacija" - glej razdelek spodaj)
SKYTECH_API_ISSUES.md                Zbirni seznam napak v SkyTech API podatkih za poročanje SkyTech-u
```

## Žive postaje vs. samo napoved (📡 / 📊)

Izbirni seznam vzletišč loči tista s **potrjeno živo vremensko postajo**
(📡) od tistih, kjer je na voljo **le izračunana napoved** (📊).

Od septembra 2026 aplikacija bere žive meritve prek **uradnega KOK/SkyTech
API-ja** (`api.kok.si/aws_api_v2.php`) – dostop nam je na podlagi
formalne prošnje odobril lastnik SkyTech, s pravim API tokenom (shranjen
kot GitHub Actions secret `SKYTECH_API_TOKEN`, nikoli v izvorni kodi).
Prej smo poskušali javno domačo stran skytech.si brati programsko, a je
ta zaščitena s protibotnim požarnim zidom (`BitNinja-WafPro`), ki
avtomatiziran/datacenter promet prepozna po IP-ju/omrežnem ugledu –
namesto poskusa obida te zaščite smo lastnika prosili za dovoljenje in
dobili uraden dostop; ta način branja (scraping domače strani) se v kodi
ne uporablja več.

`src/skytech.js` ob vsaki izgradnji podatkov (`scripts/build-data.js`,
prek urnega GitHub Action) z enim klicem (`?latest=1`) pridobi najnovejšo
meritev za vse javne postaje, `src/sites.json` pa vsako vzletišče poveže
s pripadajočo postajo prek polja `skytechStationId` (glej spodaj). Za
tako povezana vzletišča aplikacija prikaže poseben "📡 Živa postaja"
razdelek z aktualno hitrostjo/sunki/smerjo vetra, temperaturo, starostjo
meritve in – kjer SkyTech to ponuja – uradno oceno primerne smeri vetra
(zelena/rumena/rdeča), ki jo aplikacija uporabi tudi za oceno primernosti
vzleta, če ročna ocena (`launchWindDirections`) ni na voljo.

Trenutno povezano s SkyTech postajo: **Vogel, Krvavec, Kobala, Lijak,
Kovk, Golte, Blegoš, Poreznik**. Za Kum, Roglo, Nanos in Grmado (Ljubljana)
med 62 javnimi postajami ni bilo dovolj zanesljivega ujemanja po imenu/
razdalji, zato `skytechStationId` ostaja `null` in `liveStation.confirmed`
`false` – če veš za pravo postajo za katero od njih, dodaj ujemanje (glej
spodaj). Poleg tega nekatera vzletišča (npr. Vogel) ohranjajo tudi
potrjeno telefonsko številko SFFA odzivnika kot dodaten/varnostni vir.

### Druga merilna mesta v bližini (niso uradna vzletišča)

Poleg uradno pripisane postaje aplikacija za vsako vzletišče prikaže tudi
seznam **vseh SkyTech postaj v bližini** (do 25 km zračne razdalje, največ
6, razvrščene po oddaljenosti; izloči se postaja, ki je že prikazana
zgoraj kot glavna). Namen: piloti pogosto letijo tudi izven uradnega
seznama vzletišč, zato je koristno videti veter na sosednjih vrhovih,
grebenih ali v dolinah, kamor bi lahko letel/-a, čeprav to niso uradna
vzletišča z lastnim vnosom v `src/sites.json`. Izračuna jo
`summarizeNearbyStations` v `src/paragliding.js` (Haversine razdalja od
GPS koordinate vzletišča do vseh 62 postaj), prikazana je v kartici
"📡 Druga merilna mesta v bližini" na strani.

**Znana napaka podatkov pri viru (popravljeno 2026-09-20):** SkyTech API
vsebuje podvojen vnos "Kranjska gora" (id 46) s pokvarjenimi/privzetimi
koordinatami (`lat:46, lon:15.1, altitude:0`), ki so po naključju skoraj
enake resnični lokaciji postaje "Nebesa nad Šentrupertom" – zato se je
napačno prikazoval kot zelo blizu vzletišču Kum, čeprav je prava Kranjska
Gora (druga, veljavna postaja "Kranjska Gora landing", id 15) v resnici
~109 km stran. `summarizeNearbyStations` zato izloči vse postaje z
nadmorsko višino 0 m – noben resničen slovenski padalski vrh ni na nivoju
morja, zato je ta filter varen pred podobnimi pokvarjenimi vnosi v
prihodnje. Glej `SKYTECH_API_ISSUES.md` za zbirni seznam napak, ki jih
nameravamo poročati SkyTech-u/KOK-u.

### Moja lokacija (📍) – napoved za tvojo natančno GPS točko

Gumb "📍 Moja lokacija" NE prikaže samo podatkov najbližjega uradnega
vzletišča, kot da bi bil uporabnik tam – prikaže napoved za njegovo
DEJANSKO GPS točko, ne glede na to, ali gre za uradno vzletišče in ali
je v bližini potrjena živa postaja:

- **Večdnevna ARSO napoved** (temperatura/oblačnost/padavine/veter) se
  še vedno pridobi prek najbližjega ARSO-podprtega mesta (ARSO API
  podpira le imena krajev, ne poljubnih GPS koordinat – glej opombo o
  `arsoLocation` zgoraj), a je jasno označena kot "regijski približek",
  z navedbo vira in razdalje, namesto da bi se pretvarjala, da je
  uporabnik na tistem vzletišču.
- **Žive SkyTech postaje v bližini** se preračunajo neposredno iz
  uporabnikovih GPS koordinat (do 25 km, enak filter/logika kot zgoraj,
  vključno z zaščito pred pokvarjenimi vnosi), ne iz koordinat
  najbližjega vzletišča – tudi če v bližini ni nobene žive postaje, se
  to jasno pove namesto tihega izpusta razdelka.
- Podatki, ki so specifični za URADNO vzletišče (potrjena primerna smer
  vzleta, telefonska številka odzivnika, "glavna" dodeljena SkyTech
  postaja), se v tem načinu NE prikažejo – veljajo namreč za konkretno
  vzletišče, ne za poljubno točko v njegovi bližini, zato bi bil njihov
  prikaz zavajajoč.

Tehnično: `scripts/build-data.js` ob vsaki izgradnji zapiše tudi javni
`public/data/skytech-stations.json` (celoten seznam vseh SkyTech postaj
z zadnjo meritvijo, brez API tokena – gre za iste javne podatke, ki so
sicer prikazani po posameznih vzletiščih). `public/js/app.js` ta seznam
naloži v brskalniku in zanj zrcali `haversineKm`, `rateWind` in
`rateSkytechDirection` iz `src/paragliding.js` (`computeNearbyStationsForPoint`,
`rateWindClient`, `rateSkytechDirectionClient`), da lahko izračuna
bližnje postaje za POLJUBNO GPS točko brez dodatnega strežniškega
klica – to je edini način, ki deluje tudi na povsem statičnem GitHub
Pages gostovanju brez žive backend poti.

### Nočna zatemnitev (🌙 / 🔦)

Jadralno padalstvo se v Sloveniji (kot VFR/dnevno letenje) uradno sme
izvajati le podnevi – med sončnim vzhodom in zahodom. Da to aplikacija
vizualno poudari, ponoči (glede na sistemsko uro naprave uporabnika)
zelo zatemni celotno vsebino strani (`body.is-night #app` v
`css/style.css` – nizka prosojnost + sivinski filter) in prikaže
opozorilni pas na vrhu.

- `getSunTimes(date, lat, lon)` v `public/js/app.js` izračuna sončni
  vzhod/zahod po poenostavljeni NOAA formuli (natančnost ~1-2 min) za
  relevantno lokacijo – **ne** fiksne ure, saj se sončni vzhod/zahod v
  Sloveniji skozi leto razlikuje tudi za več kot 5 ur. Lokacija je
  uporabnikova prava GPS pozicija, če je na voljo (`state.userCoords`,
  npr. po kliku "Moja lokacija"), sicer lokacija trenutno izbranega
  vzletišča.
- Preverjanje se ponovi vsako minuto (`setInterval`), da se zatemnitev
  samodejno vklopi/izklopi tudi, če uporabnik pusti stran odprto čez
  sončni vzhod/zahod.
- Gumb "🔦" na vrhu je viden le, kadar je trenutno noč, in omogoča
  **začasen** preklop nazaj na berljiv prikaz (npr. za pregled napovedi
  za naslednje jutro) – ta izbira se namenoma NE shranjuje med obiski
  (ni v `localStorage`), saj gre za varnostni opomnik, ne uporabniško
  nastavitev, ki naj privzeto ne ostane trajno izklopljena.

## Dodajanje vzletišč

Uredi `src/sites.json` – vsak vnos potrebuje `id`, `name`, `region`, `lat`,
`lon`, `elevation` (m), `arsoLocation` (ime kraja iz ARSO-jevega podprtega
seznama – glej opombo zgoraj), `launchWindDirections` (seznam primernih
smeri vetra ali `null`, če ni ročno potrjeno – če je `null`, aplikacija
ob obstoječi SkyTech povezavi samodejno uporabi oceno postaje),
`skytechStationId` (številska ID postaje iz KOK/SkyTech API-ja, `null`
če ni znanega ujemanja – seznam vseh postaj dobiš s klicem
`?latest=1` na `api.kok.si/aws_api_v2.php` s tokenom v glavi `X-Api-Key`),
`liveStation` (`{ confirmed, phone, note }` ali `{ confirmed: false,
phone: null, note: "..." }`) in po želji `skytechUrl` ter `notes`.
Koordinate in imena za obstoječi seznam so bila zbrana iz javno dostopnih
virov (turistične strani, Paragliding Geopedia, SFFA) in jih pred resno
uporabo priporočamo preveriti/dopolniti s podatki lokalnih klubov.

## Varnost in odgovornost

Aplikacija je informativno orodje. Ocene vetra, termike in baze oblakov so
poenostavljene in ne nadomeščajo uradnega vremenskega briefinga, GAFOR/SIGWX
produktov ali lastne presoje pilota pred letom.
