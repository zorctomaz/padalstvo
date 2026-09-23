# Padalstvo Vreme

Spletna aplikacija (v celoti prilagojena mobilnim napravam, ena sama stran)
za vremensko napoved za **jadralno padalstvo** v Sloveniji. Gumb "📍 Uporabi
mojo lokacijo" pokaže napoved za TVOJO natančno GPS točko – ne glede na to,
ali je uradno vzletišče in ali je v bližini potrjena živa postaja (glej
razdelek "Moja lokacija" spodaj); gumb "🗺️ Izberi na zemljevidu" poleg
njega omogoči izbiro poljubne lokacije na interaktivnem zemljevidu (npr.
če GPS ni na voljo ali želiš preveriti napoved za drug kraj) - na istem
zemljevidu (🪂 oznake) izbereš tudi katero od znanih vzletišč, zato
ločenega padajočega seznama vzletišč ni.
Aplikacija prikaže vremenske podatke ter iz njih izpeljane ocene, pomembne
za pilote:

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
- **izbiro enote za prikaz hitrosti vetra** (km/h ali m/s) prek dveh
  gumbov v glavi strani, levo in desno od ikone padala – izbira se
  shrani v brskalniku (`localStorage`) in velja za vse prikaze
  hitrosti/sunkov vetra na strani (interno se vedno računa v km/h,
  pretvorba je le za prikaz; mph in vozli ostajata podprta v podatkovni
  strukturi za morebitno kasnejšo uporabo, a nista dosegljiva prek teh
  dveh gumbov),
- **preklop jezika (SI/EN)** prek dveh gumbov pod izbiro enote – glej
  razdelek "Jezik strani (SI/EN)" spodaj.

## Viri podatkov

| Vir | Kaj ponuja | Kako je uporabljen |
|---|---|---|
| **ARSO** – `vreme.arso.gov.si/api/1.0/location/` | Večdnevna napoved (temperatura, veter, oblačnost, padavine) po imenu kraja | Strežnik (`src/arso.js`) pridobi napoved za ARSO lokacijo, najbližjo izbranemu vzletišču |
| **opendata.si** – `opendata.si/vreme/report/` | ARSO radar padavin, ALADIN napoved oblačnosti/padavin, verjetnost toče – neposredno po GPS koordinati | Strežnik (`src/opendata.js`) pridobi podatke za koordinato vzletišča/uporabnika |
| **ARSO letalsko vreme** – `meteo.si/met/sl/aviation/` | GAFOR, SIGWX, karte vetra na višini | Aplikacija povezuje neposredno na uradno stran (grafični/besedilni produkti, primerni za odpiranje, ne za avtomatsko razčlenjevanje) |
| **SFFA telefonski odzivniki** | Žive vremenske postaje (veter v realnem času) na nekaterih vzletiščih | Za vzletišča s potrjeno postajo aplikacija prikaže telefonsko številko odzivnika (vir: SFFA – Zveza za prosto letenje) kot dodaten/varnostni vir |
| **KOK/SkyTech API** – `api.kok.si/aws_api_v2.php` | Uradne žive meritve (veter, sunki, smer, temperatura) za javne vremenske postaje po vsej Sloveniji, vključno z uradno oceno primerne smeri vetra po postaji (zelena/rumena/rdeča) | `src/skytech.js` (glej razdelek spodaj) – strežniški klic prek GitHub Actions, token v secrets |
| **Open-Meteo** – `api.open-meteo.com/v1/forecast` | Veter po tlačnih nivojih (1000/925/850/700/600 hPa), brez API ključa, odprt CORS | Klic NEPOSREDNO iz brskalnika (glej razdelek "Veter po višini" spodaj) – edini od preverjenih virov, ki dejansko strojno objavlja veter po višini |
| **Windy.com** | Veter na višini (izbira nivoja/hPa), globalni model, interaktiven profil/graf | Dopolnilna povezava "Podroben profil na Windy.com" pod tabelo vetra po višini – za več podrobnosti/nivojev, kot jih prikaže tabela |

### Ocene, specifične za jadralno padalstvo

| Ocena | Kako je izračunana | Zanesljivost |
|---|---|---|
| **Primernost smeri vetra za vzlet** (`rateLaunchAlignment`) | Napovedano smer vetra primerja s primernimi smermi vzleta – ročno potrjenimi (`launchWindDirections` v `src/sites.json`) **ali**, če teh ni, z uradno oceno "zelene" smeri iz KOK/SkyTech API-ja za povezano postajo | Ročno potrjeno (iz javno dostopnih opisov vzletišč) za Vogel, Kobalo, Lijak in Kovk. Za Krvavec, Golte, Blegoš in Poreznik se smer vzame samodejno iz SkyTech ocene postaje (`launchWindDirectionsSource: "skytech"`). Za preostala vzletišča (Kum, Rogla, Nanos, Grmada) polje ostaja `null` in aplikacija to jasno pove namesto ugibanja. **Pred letom vedno preveri z lokalnim društvom/šolo letenja.** |
| **Termalno okno in XC ocena** (`estimateThermalWindow`) | Iz dnevnega poteka temperature/oblačnosti/padavin/vetra oceni približne ure aktivne termike | Groba hevristika, ne meteorološki model. Ne upošteva orografije, senc, inverzij ipd. |
| **Baza oblakov** (`estimateCloudBaseM`) | Klasično pravilo: 125 m na °C razlike med temperaturo in rosiščem | Standarden približek, uporaben za grobo oceno, ne za natančno letalsko planiranje |
| **Uradna ARSO napoved termike** (`src/arso-thermal.js`) | Prebere uradni RSS vir `meteo.si/met/sl/aviation` (ALADIN model) - max. hitrost dviganj [m/s] + barvna stopnja, za danes in jutri, ločeno po 6 letalskih regijah (Gorenjska/Primorska/Osrednja/Dolenjska/Štajerska/Prekmurska) | Uradna, kvantitativna napoved (ni naša hevristika) - a pokrije le regijo, ne točnega vzletišča, in le 2 dneva. Vsakemu vzletišču je regija ročno dodeljena (`aladinRegion` v `src/sites.json`) po geografski bližini. Klik na kartico odpre podrobnosti (čas izdaje + povezava na uradno ARSO stran). Pri "Moja lokacija"/klik na zemljevidu se regija NE podeduje od najbližjega uradnega vzletišča (ta je lahko v drugi regiji - npr. Trebnje je najbliže Kumu, dodeljenemu Štajerski, a samo Trebnje je dejansko v Dolenjski), ampak jo frontend sam preračuna iz prave GPS točke (`data/thermal-regions.json`, glej `computeNearestThermalRegion`). Pod uradnimi podatki sta v istem oknu dva grafa "po urah" (danes + jutri, `buildThermalLineSvg`, v isti obliki kot obstoječi grafi vetra/temperature pri postajah - `buildLineChartSvg` z besedilno Y osjo namesto številčne) - a to NI uradni ARSO vir (ARSO urnih podatkov ne objavlja strojno berljivo, le kot interaktivno sliko na svoji strani), ampak naša `estimateThermalIndex` hevristika, jasno ločena in označena kot ocena. |

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

**Verzija in predpomnjenje brskalnika:** `scripts/build-data.js` v
`public/data/meta.json` zapiše tudi kratko git-sha kode, ki je bila
deployana (`version`, iz `GITHUB_SHA` v Actions oz. `git rev-parse
--short HEAD` lokalno). Frontend jo prikaže pod naslovom aplikacije
("Različica: …") – tako lahko primerjaš, ali se verzija na strani ujema
z zadnjim commit-om. `public/data/*.json` se nalagajo z `cache:
'no-store'`, zato so vedno sveži. `css/style.css` in `js/app.js` pa
sta statični datoteki brez tega mehanizma – zato `addCacheBusting()` v
`scripts/build-data.js` ob vsaki izgradnji v `index.html` samodejno
doda/posodobi `?v=<verzija>` na obeh povezavah, da brskalniki in GitHub
Pages CDN po vsakem deployu obvezno naložijo sveže datoteke namesto
morebitne stare predpomnjene različice (brez tega bi lahko uporabnik
po popravku še vedno videl staro obnašanje, dokler ročno ne izprazni
predpomnilnika).

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
src/arso-thermal.js                  Klient za uradno ARSO napoved termike (RSS po 6 letalskih regijah)
src/paragliding.js                   Izpeljane ocene: baza oblakov, ocena vetra, termika, povezave
public/                              Mobilno prilagojen frontend (vanilla HTML/CSS/JS, brez build koraka)
public/index.html                    Edina stran aplikacije
public/js/app.js                     Ves frontend JS (podatki, izris, zemljevid, i18n - glej spodaj)
public/css/style.css                 Retro DOS/CRT slog (glej spodaj)
public/data/                         Generirano z `npm run build:data` – NI v git repozitoriju (.gitignore)
public/data/skytech-stations.json    Javni seznam vseh SkyTech postaj (za "Moja lokacija" - glej razdelek spodaj)
public/data/thermal-regions.json     Vseh 6 ARSO regij termike + središča (za "Moja lokacija" - glej razdelek spodaj)
public/data/history/<id>.json        Zgodovina meritev postaje (za graf ob kliku - glej razdelek spodaj)
SKYTECH_API_ISSUES.md                Zbirni seznam napak v SkyTech API podatkih za poročanje SkyTech-u
```

## Ena stran (nekoč dva pogleda)

Aplikacija je imela do septembra 2026 dva ločena pogleda: "napredni"
(`index.html`/`app.js`, več kartic, spustni seznam vzletišč, izbira
med 4 enotami vetra) in "enostaven" (`preprosto.html`/`preprosto.js`,
en konsolidiran blok na vzletišče, retro DOS/CRT slog). Na uporabnikovo
željo je napredni pogled odstranjen, enostaven pogled pa je postal
**edina stran** aplikacije (`preprosto.html`/`preprosto.js`/
`preprosto.css` so preimenovani v `index.html`/`app.js`/`style.css`).
Nekaj funkcij naprednega pogleda (npr. nočna zatemnitev, predogled
žive postaje v pojavnem oknu ob kliku na vzletišče na zemljevidu) pri
tem ni bilo preneseno – če jih boš pogrešal/-a, jih je treba znova
dodati v to (zdaj edino) datoteko.

**Vizualni slog** sledi matični strani **fotra.net**
(padalstvo.fotra.net je njena poddomena) - retro DOS/CRT terminal
estetika: pisava **VT323** (Google Fonts, monospace), barvna paleta
"DOS modra" ozadje (`#0000AA`), cian obroba/poudarki (`#55FFFF`), rumen
naslov s sijajem (`#FFFF55`), dvojna cian obroba okoli osrednjega
"screen" vsebnika, rahlo CRT scanline prekritje. Barve/pisava so
prevzete neposredno iz fotra.net (preiskano prek začasnega GitHub
Actions debug skripta, glej git zgodovino - peskovnik agenta nima
neposrednega dostopa do fotra.net).

Stran ima **izbiro lokacije na zemljevidu** (🗺️, Leaflet + OpenStreetMap,
naloženo prek CDN) in **podrobnosti ob kliku**:
- klik na trenutno kartico (če prikazuje živo SkyTech meritev) ali na
  vrstico v seznamu bližnjih postaj odpre okno s trenutno meritvijo
  (veter/sunki/smer/temperatura + ocene) in grafom vetra/temperature
  zadnjih ur (`buildLineChartSvg`, oznake na osi vsake 3 ure, puščice
  smeri vetra po urah);
- klik na kartico termike odpre uradno ARSO napoved (danes/jutri) + naš
  graf "po urah" (glej razdelek "Uradna ARSO napoved termike" spodaj za
  razlago, zakaj to ni uradni podatek);
- klik na 📡 oznako postaje na zemljevidu odpre isto okno neposredno z
  zemljevida; klik na 🪂 oznako uradnega vzletišča takoj zapre zemljevid
  in naloži polno stran tega vzletišča (`loadWeatherForSite`) - živa
  postaja (če jo vzletišče ima) se tam prikaže prednostno pred ARSO
  napovedjo (glej `renderCurrent`/`useLive`).

## Jezik strani (SI/EN)

Dva gumba ("SI"/"EN") pod izbiro enote vetra preklopita jezik celotne
strani - izbira se shrani v `localStorage`
(`padalstvo-vreme:lang`) in velja do naslednje spremembe.

**Slog in obnašanje preklopnika je natančna kopija tistega na matični
strani fotra.net** (`.lang-toggle`/`.lang-btn`, preiskano prek začasnega
GitHub Actions debug skripta - glej git zgodovino, peskovnik agenta
nima neposrednega dostopa do fotra.net): oba gumba (`SI`/`EN`) sta ves
čas v DOM-u (zaradi klika/dostopnosti), a CSS pravilo
`.lang-btn[aria-pressed="true"] { display: none; }` skrije gumb za
TRENUTNO izbrani jezik - viden je torej vedno le gumb za jezik, V
KATEREGA lahko preklopiš (npr. v slovenskem načinu je viden le "EN").
To se razlikuje od izbire enote vetra tik zgoraj (`.unit-toggle-btn`),
kjer sta oba gumba vedno vidna in je le trenutno aktivni poudarjen.

- **Statična besedila** (gumbi, naslovi razdelkov, legenda zemljevida,
  noga strani ...) so v `index.html` označena z `data-i18n`/
  `data-i18n-aria` atributi; `applyStaticTranslations()` v `app.js` jih
  ob zagonu in ob vsakem preklopu jezika osveži iz slovarja
  `TRANSLATIONS` (`{ sl: {...}, en: {...} }`).
- **Dinamično besedilo**, ki ga generira `app.js` sam (sporočila o
  napakah/nalaganju, "Vir: ...", naslovi grafov ipd.), gre prek funkcije
  `t(key, ...args)` - parametrizirani vnosi v slovarju so funkcije
  (`(x) => \`...${x}...\``).
- **Besedila ocen** (veter/termika/XC/primernost smeri), ki jih delno
  vrača že strežniško zgrajen `data/weather/<site>.json`
  (`src/paragliding.js`: `rateWind`, `estimateThermalIndex`,
  `rateLaunchAlignment`, `rateSkytechDirection`) in delno isti klientski
  izračun (`rateWindClient`/`rateSkytechDirectionClient` v `app.js`), se
  NE dajo prevesti s ključem, ker so podatki že "končno" slovensko
  besedilo - `translateRatingLabel()` jih zato prevede z iskanjem po
  točnem slovenskem nizu (`RATING_LABEL_MAP_EN`), za parametrizirane
  predloge ("Smer (NE) ustreza postaji" ipd.) pa z regexom, ki ohrani
  smerno kratico nespremenjeno.
- **Smerne kratice**: ARSO napoved uporablja slovenske okrajšave
  (S/SV/V/JV/J/JZ/Z/SZ), SkyTech pa že angleške (N/NE/E/SE/S/SW/W/NW) -
  `translateCompassDirection()` v načinu EN prevede le slovenske
  kratice (SkyTech-ove angleške pusti nespremenjene, saj niso ključi te
  preslikave).
- **Izven obsega:** prosto besedilo, ki ga uredniki ročno vpišejo v
  `src/sites.json` (`notes`, `liveStation.note` - opombe posameznih
  vzletišč), s tem mehanizmom NI zajeto in ostane v slovenščini tudi v
  EN načinu - gre za 12 ročno pisanih besedil, ki jih ni bilo smiselno
  mehansko prevajati.

## Žive postaje vs. samo napoved

Nekatera vzletišča imajo **potrjeno živo vremensko postajo**, druga le
**izračunano napoved**. Stran to ne prikaže kot ločeno oznako v seznamu
(seznama/spustnega menija vzletišč ni več - izbira je prek zemljevida,
glej "Ena stran" zgoraj), ampak neposredno na kartici "trenutno stanje":
če ima vzletišče živo postajo s svežo meritvijo, kartica prikaže NJENE
podatke (`useLive` v `renderCurrent`) in postane klikljiva (odpre graf
zgodovine); sicer prikaže prvo uro ARSO napovedi in ni klikljiva.

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

**Zajamčen minimum 3 postaj** (dodano po poročilu uporabnika za
Pogorelec, ki v 25 km nima nobene): če je znotraj 25 km manj kot 3 živih
postaj, funkcija namesto praznega/pretankega seznama raje vrne 3
najbližje žive postaje ne glede na razdaljo. Starostni filter (varovalka
pred pokvarjenimi postajami, glej spodaj) pri tem NIKOLI ne popusti - v
skrajnem primeru (npr. res ni nobene žive postaje s svežo meritvijo v
celotnem naboru) je lahko vrnjenih tudi manj kot 3. Enaka logika (isti
`NEARBY_STATIONS_MIN_COUNT`/`NEARBY_MIN_COUNT` vzorec) velja tudi za
klientski `computeNearbyStationsForPoint` (razdelek "Moja lokacija"
spodaj).

**Znana napaka podatkov pri viru (popravljeno 2026-09-20):** več neaktivnih
SkyTech postaj vrača skupno privzeto/napačno koordinato (najpogosteje
`lat:46, lon:15`, ena varianta tudi `lat:46, lon:15.1` za "Kranjska gora",
druga `(0,0)` za "Izola-Zeleni kare") namesto prave lokacije ali manjkajoče
vrednosti – ta točka je po naključju blizu Šentrupertu (Dolenjska), zato so
se npr. "Letališče Ptuj" in "Žetale-Log" (v resnici v vzhodni Štajerski,
~70-80 km stran) uporabniku od tam prikazala kot navidezno ~14 km blizu.
`summarizeNearbyStations` (in klientski `computeNearbyStationsForPoint`)
zato izloči postaje z nadmorsko višino 0 m IN postaje s starostjo meritve
nad 24h – slednje je zanesljivejši splošen signal, saj imajo vse doslej
najdene pokvarjene/neaktivne postaje meritev staro od ~21h do skoraj 3 let
(nekatere imajo neničelno nadmorsko višino, zato jih prvi filter sam ne bi
ujel). Glej `SKYTECH_API_ISSUES.md` za polni zbirni seznam napak, ki jih
nameravamo poročati SkyTech-u/KOK-u.

### Moja lokacija (📍) – napoved za tvojo natančno GPS točko

Gumb "📍 Moja lokacija" NE prikaže samo podatkov najbližjega uradnega
vzletišča, kot da bi bil uporabnik tam – prikaže napoved za njegovo
DEJANSKO GPS točko, ne glede na to, ali gre za uradno vzletišče in ali
je v bližini potrjena živa postaja:

- **Večdnevna ARSO napoved** (temperatura/oblačnost/padavine/veter) se
  pridobi prek ARSO-podprtega mesta, ki je najbližje uporabnikovi
  DEJANSKI GPS točki (ARSO API podpira le imena krajev, ne poljubnih GPS
  koordinat – glej opombo o `arsoLocation` zgoraj) – NE prek mesta,
  dodeljenega najbližjemu URADNEMU vzletišču (`site.arsoLocation` je
  izbran za to vzletišče in ni nujno najbližji poljubni drugi točki v
  okolici – enak vzorec popravka kot pri ARSO regiji termike spodaj).
  Prikaz je jasno označen kot "regijski približek", z navedbo
  dejanskega vira in razdalje.
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

Enak vzorec za samo ARSO napoved: `src/arso-locations.js` (`ARSO_LOCATIONS`)
vsebuje 36 krajev, za katere je ARSO-jev napovedni API dejansko potrjeno
podprt (preizkušeno prek GitHub Actions – glej opombo v datoteki, katerih
~10 preizkušenih kandidatov je vrnilo HTTP 404), vsak s približnimi
koordinatami. `scripts/build-data.js` (`buildArsoLocations`) ob vsaki
izgradnji za VSAK od teh krajev pridobi napoved (`fetchArsoForecast` +
`buildGenericLocationForecast` iz `src/paragliding.js` – enak povzetek kot
za vzletišče, le brez podatkov, vezanih nanj) in jo zapiše v
`public/data/arso/<slug>.json`, ter majhen manifest (ime/slug/koordinate/
uspešnost) v `public/data/arso-locations.json`. `computeNearestArsoLocation`
v brskalniku iz tega manifesta izbere najbližji kraj DEJANSKI GPS točki,
`loadArsoLocationForecast` lenobno naloži njegovo napoved (predpomnjeno
po `slug`-u) in z njo prepiše `data.forecast` ter povezavo na ARSO-jev
graf napovedi.

Nad večdnevno napovedjo (`#forecastMeta`) je izpisan ARSO **kraj**, za
katerega napoved dejansko velja (`data.arsoLocationName` v načinu "Moja
lokacija", sicer `data.site.arsoLocation` – slednje mora izpostaviti tudi
`buildParaglidingSummary`, glej `src/paragliding.js`). Vsak dan v tabeli
(ob najmočnejšem vetru tistega dne) poleg besedilne smeri vetra prikaže
tudi **puščico** (`windArrow`/`WIND_ARROW_BY_SI_DIRECTION`) – puščica
kaže, OD KOD piha veter (npr. "S" → ↑, "od severa"; standardna kompasna
orientacija, sever gor).

### Veter po višini (🌬️)

Prominenten razdelek takoj pod izbiro vzletišča/lokacije (na obeh
straneh) prikaže dejanske podatke – ne le povezavo – za temperaturo in
veter na šestih tlačnih nivojih. ARSO tega ne objavlja strojno berljivo
(preverjeno prek GitHub Actions: napovedni API vrne le prizemne
vrednosti; letalska stran SIGWX/GAFOR ponuja le grafične/besedilne
produkte, brez JSON/XML/RSS vira) – zato podatke neposredno iz
brskalnika pridobimo od **Open-Meteo** (`api.open-meteo.com`, brez API
ključa, odprt CORS – `Access-Control-Allow-Origin: *`, potrjeno prek
GitHub Actions z eksplicitno `Origin` glavo v zahtevi; potrjeno tudi, da
poleg vetra vrne tudi temperaturo po nivojih, `temperature_XXXhPa`).

Prikaz (tabela: nadmorska višina v vrsticah, čas v vodoravno drsnih
stolpcih) posnema uporabnikov posnetek ARSO-jeve gorske vremenske
aplikacije ("Vreme v gorah in hribih"). `WIND_ALOFT_LEVELS` uporablja 6
"okroglih" tlačnih nivojev (950/900/850/800/700/600 hPa), katerih
nadmorska višina po standardni atmosferi (ISA) najbližje ustreza
500/1000/1500/2000/3000/4200 m – Open-Meteo ne podpira poljubnega hPa
koraka, le standardni nabor.

Ker je "Moja lokacija" poljubna GPS točka (ni je mogoče vnaprej zgraditi
za vsako možnost, za razliko od 36 ARSO krajev zgoraj), ni strežniške
predpriprave – `fetchWindAloft(lat, lon)` v `public/js/app.js` kliče
Open-Meteo neposredno za trenutno izbrano vzletišče ali uporabnikovo
dejansko točko (`data.myLocationMode` ? uporabnikove koordinate :
koordinate vzletišča), z `forecast_days=2`. Open-Meteo-jevo `hourly` polje
je zajamčeno pravo urno zaporedje od lokalne polnoči naprej, zato za
"vsake 3 ure" preprosto vzamemo vsak 3. indeks (00.00, 03.00, 06.00 ...) –
ni treba iskati najbližje točke kot pri neenakomerni SkyTech zgodovini.

`buildWindAloftTable` izriše eno tabelo z dvema razdelkoma (Temperatura,
Veter) – prvi stolpec (nadmorska višina) je `position: sticky`, da ostane
viden med vodoravnim drsenjem po 16 časovnih stolpcih (2 dni × 8 vsake 3
ure). Vsaka celica vetra prikaže puščico (`transform: rotate(<stopinja>deg)`
– gladko, brez zaokroževanja na 8 smeri, ker gre za surovo Open-Meteo
stopinjo) in hitrost, obarvano po štiristopenjski lestvici (`windAloftSpeedClass`
– modra/rumena/oranžna/rdeča, ločena od `rateWindClient`, ki je umerjena za
prizemni polet 8–30 km/h, ne za morebiten jetstream čez 100 km/h na višjih
nivojih). `state.windAloftRequestToken` prepreči, da bi počasnejši/starejši
klic (npr. po hitri menjavi vzletišča) prepisal novejši rezultat. Pod
tabelo ostane povezava na **Windy.com** za podroben interaktiven profil.

Gumb "🗺️" poleg "Moja lokacija" odpre modalno okno z interaktivnim
zemljevidom ([Leaflet](https://leafletjs.com/) + [OpenStreetMap](https://www.openstreetmap.org/)
ploščice, naloženi prek CDN – `unpkg.com/leaflet@1.9.4`). Tap/klik na
zemljevid postavi oznako (lahko jo povlečeš za natančnejšo izbiro),
gumb "Uporabi to lokacijo" nato zažene isto pot kot pravi GPS
(`useLocation(lat, lon)` – skupna funkcija za oba vira, glej
`public/js/app.js`), torej isti "Moja lokacija" način (glej zgoraj), le
z ročno izbranimi koordinatami namesto pravega GPS-a. Uporabno, kadar
GPS ni na voljo/natančen, ali če želiš preveriti napoved za povsem drug
kraj, ne kjer se trenutno nahajaš.

Ker gre za edino zunanjo knjižnico v projektu (za pravi interaktivni
zemljevid ni smiselno pisati lastne implementacije), je naložena
izključno prek `<script>`/`<link>` značk s SRI (`integrity`) preverjanjem
– brez build koraka, brez npm odvisnosti. Če CDN ni dosegljiv (offline,
firewall), gumb to jasno pove namesto da bi se aplikacija zrušila.

Zemljevid ob odprtju prikaže tudi oznake vseh **uradnih vzletišč** (🪂,
iz `data/sites.json`) in **VSEH SkyTech vremenskih postaj** (📡, iz
`data/skytech-stations.json` – vseh ~62, ne le tistih z meritvijo v
zadnjih 24h), da lahko uporabnik izbere natanko eno od njih namesto
slepega tapkanja po zemljevidu. Edino izločeno so postaje z znanimi
pokvarjenimi privzetimi koordinatami (`altitude === 0`, glej
SKYTECH_API_ISSUES.md) – te bi sicer prikazale postajo na povsem napačni
lokaciji. Postaje brez sveže meritve (>24h) so vizualno ločene (bledejši,
sivi pin – `.map-pin-station-stale`), da je jasno, da trenutno morda ne
poročajo, a jih uporabnik še vedno vidi in lahko klikne (npr. za zadnjo
znano meritev). Klik na oznako se obnaša različno glede na tip:
- 📡 postaja → izbirno (modro) oznako postavi na to točko (za morebitno
  potrditev "Uporabi to lokacijo", glej spodaj) IN nad zemljevidom odpre
  okno z grafom zgodovine te postaje (`openHistoryModal`, ista funkcija
  kot za klik na kartico "trenutno stanje" oz. vrstico v seznamu bližnjih
  postaj – glej razdelek "Graf zgodovine postaje" spodaj) – zgodovina je
  vnaprej zgrajena le za postaje, povezane z enim od 12 vzletišč, zato je
  za marsikatero od zdaj dodatno prikazanih (oddaljenih) postaj morda ni
  na voljo, čeprav je trenutna meritev vseeno prikazana.
- 🪂 vzletišče → zemljevid se takoj zapre in naloži se polna stran tega
  vzletišča (`loadWeatherForSite`) – enako, kot bi bilo vzletišče izbrano
  neposredno (glej razdelek "Ena stran" zgoraj); izbirna oznaka in okno
  z izbiro poljubne točke se za vzletišča torej ne uporabljata.

Če uporabnik izbere postajo (📡) na zemljevidu in nato potrdi "Uporabi to
lokacijo", se njena živa meritev prikaže kot glavni podatek – aplikacija
je NE zavrže v prid splošne ARSO napovedi za najbližje vzletišče, saj je
podatek že ima. Tehnično: klik na oznako postaje si zapomni izbrano
postajo (`mapPickerSelectedStation`, počiščeno ob kliku na vzletišče,
poljubno točko na zemljevidu ali premiku oznake), ki gre skupaj z
GPS koordinatami v `useLocation`/`showMyLocationWeather`. Ti iz izbrane
postaje sestavita sintetičen `skytech` objekt (isti `rateWindClient`/
`rateSkytechDirectionClient` kot za bližnje postaje) in nastavita
`stationMode`, kar `renderCurrent` prepozna kot izjemo od sicer
veljavnega pravila "v načinu Moja lokacija se žive postaje ne prikažejo
kot glavni podatek"
– izbrana postaja je namreč natančno to, po čemer je uporabnik segel, ne
približek. Izbrana postaja se posledično tudi izloči iz seznama "bližnjih
postaj" (da se ne podvaja).

### Graf zgodovine postaje (klik na 📡 postajo)

Klik na kartico "trenutno stanje" (`#currentBlock`, kadar prikazuje živo
SkyTech meritev - glej `useLive` v `renderCurrent` zgoraj), na katerokoli
vrstico v seznamu "bližnjih postaj" ali na 📡 oznako na zemljevidu odpre
modalno okno z grafom **vetra (hitrost + sunki) in temperature za zadnjih
nekaj ur** za tisto postajo.

- KOK/SkyTech API poleg `?latest=1` (trenutno stanje) ponuja tudi
  `?id=<postaja>&len=<n>` – zgodovino zadnjih meritev posamezne postaje
  (do 100, privzeto 20), potrjeno iz uradne dokumentacije. Postaje
  poročajo približno vsakih 10 minut.
- `src/skytech.js` (`fetchStationHistory`) ob vsaki izgradnji pridobi
  zadnjih 100 meritev (API maksimum, ~16-17 ur pri poročanju vsakih
  ~10 min - NE polnih 24h, ker API ne podpira straničenja za starejše
  podatke) za vsako postajo, ki se dejansko kjerkoli prikaže (glavna
  dodeljena + vse "bližnje" pri katerem koli od 12 vzletišč) – ne za
  vseh 62, da po nepotrebnem ne obremenimo omejitve klicev API-ja
  (60/min na token). `scripts/build-data.js` jih zapiše v
  `public/data/history/<stationId>.json`.
- Frontend (`public/js/app.js`) ob kliku na postajo lenobno (`fetch`,
  predpomnjeno v `state.stationHistoryCache`) naloži ustrezno datoteko in
  izriše graf kot **navaden inline SVG, brez zunanjih knjižnic**
  (`buildLineChartSvg`) – aplikacija nima build koraka, zato dodajanje
  npr. Chart.js ne bi bilo smiselno za en sam preprost graf. Hitrost
  vetra se prikaže v trenutno izbrani enoti (km/h/m/s/mph/vozli).
- Nad grafom vetra je vrstica **puščic smeri** (ena na uro, izbrana
  po `pickHourlyIndices` – prva meritev v vsaki novi lokalni uri, ne
  glede na to, da postaja ne poroča točno na okroglo minuto). Puščica
  kaže, **od kod piha veter** (npr. puščica navzgor = veter od severa) –
  enaka konvencija kot pri SkyTech oceni primerne smeri drugje v
  aplikaciji.
- **Omejitev:** ker se zgodovina pred-izračuna le za postaje, povezane z
  enim od 12 uradnih vzletišč, graf morda ni na voljo za postajo, ki se
  pojavi izključno v načinu "Moja lokacija" na GPS točki daleč od vseh
  uradnih vzletišč (modal v tem primeru to jasno pove, namesto da bi se
  zrušil).

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
