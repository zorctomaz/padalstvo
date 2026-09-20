# Napake v podatkih KOK/SkyTech API-ja

Seznam napak/nedoslednosti, ki smo jih odkrili pri uporabi uradnega API-ja
(`https://api.kok.si/aws_api_v2.php`) za aplikacijo Padalstvo Vreme. Namen
tega dokumenta je zbirati dokaze, preden jih pošljemo nazaj SkyTech-u/KOK-u.

Vsak vnos: kaj je narobe, dokazi (surovi podatki iz API-ja), kakšen vpliv
ima na uporabnike, in kako smo se na naši strani (začasno) zaščitili.

---

## 1. Podvojen vnos "Kranjska gora" (id 46) s pokvarjenimi/privzetimi koordinatami

**Datum odkritja:** 2026-09-20

**Opis:** API vrača DVE postaji z (skoraj) enakim imenom "Kranjska Gora":

| id | name | lat | lon | altitude |
|---|---|---|---|---|
| 15 | `Kranjska Gora landing` | 46.504398 | 13.7954 | 1545 m | ✅ pravilna, realna lokacija |
| 46 | `Kranjska gora` | **46** | **15.1** | **0 m** | ❌ pokvarjena/privzeta |

Postaja id 46 ima sumljivo okrogle koordinate (`lat` točno `46`, `lon`
točno `15.1`) in nadmorsko višino `0` – noben padalski vrh/postaja v
Sloveniji ni na nivoju morja, kar kaže na privzeto/placeholder vrednost,
ne na resnično GPS lokacijo.

**Vpliv:** Koordinati postaje id 46 (46, 15.1) sta po naključju skoraj
identični resnični lokaciji povsem druge, veljavne postaje **"Nebesa nad
Šentrupertom"** (id 27, lat 45.998299, lon 15.0925, altitude 585 m). Za
aplikacije, ki računajo razdaljo/bližino po GPS koordinatah, se zato
pokvarjen vnos "Kranjska gora" (id 46) napačno prikaže kot ležeč tik ob
Šentrupertu (~10 km), namesto realno ~100+ km stran v Julijskih Alpah.

Konkretno pri nas: za vzletišče Kum (46.0889, 15.0825) se je postaja
"Kranjska gora" (id 46) pomotoma pojavila v seznamu "bližnjih postaj" na
razdalji 10.0 km, medtem ko je prava Kranjska Gora (id 15) v resnici
109.1 km stran (in bi se torej sploh ne smela pojaviti kot bližnja).

**Dokazi (surov izpis iz API-ja, `?latest=1`):**
```json
{"id":15,"name":"Kranjska Gora landing","lat":46.504398,"lon":13.7954,"altitude":1545,"hasMeasurement":true}
{"id":46,"name":"Kranjska gora","lat":46,"lon":15.1,"altitude":0,"hasMeasurement":true}
{"id":27,"name":"Nebesa nad Šentrupertom","lat":45.998299,"lon":15.0925,"altitude":585,"hasMeasurement":true}
```

**Predlog za SkyTech/KOK:** Postajo id 46 "Kranjska gora" bodisi
- popraviti na resnične GPS koordinate (verjetno gre za isto fizično
  postajo kot id 15, torej odvečen/podvojen vnos, ki bi ga bilo treba
  izbrisati/združiti), ali
- če gre za povsem drugo, resnično postajo z drugim imenom, ji nastaviti
  pravilne koordinate in nadmorsko višino.

**Naša začasna zaščita:** V `src/paragliding.js`
(`summarizeNearbyStations`) izločimo vse postaje z `altitude === 0`, saj
noben pravi slovenski padalski vrh ni na nivoju morja. To prestreže ta
konkreten primer in podobne v prihodnje, a je le obliž na naši strani –
pravi popravek mora priti iz izvornih podatkov API-ja.

---

## 2. Neaktivne postaje si delijo eno skupno privzeto koordinato (lat:46, lon:15)

**Datum odkritja:** 2026-09-20 (prijavil uporabnik – na telefonu, fizično v
bližini Šentrupertu na Dolenjskem, je v seznamu "bližnjih živih postaj"
videl "Letališče Ptuj" in "Žetale-Log" na 14 km, čeprav sta v resnici v
vzhodni Štajerski, ~70-100 km stran)

**Opis:** Vsaj 5 medsebojno nepovezanih, dolgo neaktivnih postaj v API-ju
vrača IDENTIČNO koordinato `lat: 46, lon: 15` (ali zelo blizu, npr. "Kranjska
gora" iz napake #1 ima `lat:46, lon:15.1`), namesto svoje prave lokacije ali
manjkajoče vrednosti (`null`):

| id | name | lat | lon | altitude | starost meritve |
|---|---|---|---|---|---|
| 26 | `Šentvid pri Stični` | 46 | 15 | 0 m | ~180 dni |
| 38 | `Letališče Ptuj` | 46 | 15 | 214 m | ~219 dni |
| 40 | `Žetale-Log` | 46 | 15 | 580 m | ~791 dni (2.2 leti) |
| 69 | `Balj` | 46 | 15 | 0 m | ~900 dni |
| 76 | `Jaano` | 46 | 15 | 0 m | ~1179 dni |
| 81 | `Gerovo - Sveta Gora` | 46 | 15 | 0 m | ~198 dni |
| 82 | `Izola-Zeleni kare` | **0** | **0** | 0 m | ~214 dni (druga varianta – "null island") |

Točka (46°N, 15°E) leži naključno ~3 km od resnične vasi Šentrupert
(Dolenjska) – zato so se te povsem nepovezane, dolgo neaktivne postaje
(nekatere iz krajev v tujini, npr. "Jaano" – estonsko ime) uporabniku, ki
je bil fizično blizu Šentrupertu, prikazale kot navidezno zelo blizu.

**Vpliv:** Enak vzorec kot pri napaki #1, a širši – ne gre za en osamljen
podvojen vnos, ampak za sistemsko privzeto/placeholder vrednost pri več
postajah hkrati. Katerakoli GPS točka blizu (46°N, 15°E) – ali (0°N, 0°E)
za "null island" varianto – bo dobila enak napačen rezultat. Ker imajo
nekatere od teh postaj (Letališče Ptuj, Žetale-Log) neničelno nadmorsko
višino, jih izključno preverjanje `altitude === 0` (iz napake #1) NE ujame.

**Dokazi (surov izpis iz API-ja, `?latest=1`, 2026-09-20):**
```json
{"id":38,"name":"Letališče Ptuj","lat":46,"lon":15,"altitude":214,"measurementTime":"2026-02-13T17:48:14Z"}
{"id":40,"name":"Žetale-Log","lat":46,"lon":15,"altitude":580,"measurementTime":"2024-07-21T13:18:08Z"}
```
Za primerjavo, razdalja med resničnim Šentrupertom in resničnimi lokacijami
Ptuja/Žetal (po imenu postaje, ne po njihovih prijavljenih koordinatah):
Šentrupert → Ptuj ≈ 79 km, Šentrupert → Žetale ≈ 70 km – ne 14 km.

**Predlog za SkyTech/KOK:** Za vse neaktivne/ukinjene postaje shraniti
`lat`/`lon` kot `null` (manjkajoča vrednost), namesto skupne privzete
koordinate (46, 15) ali (0, 0) – to velja tudi za morebitne druge take
"skupne" privzete točke, ki jih še nismo odkrili. Splošneje: `?latest=1`
bi lahko za povsem neaktivne postaje (brez meritve več mesecev/let) sploh
izpustil polje `meritev` ali dodal jasen `active: false` atribut.

**Naša začasna zaščita:** V `src/paragliding.js` (`summarizeNearbyStations`)
in `public/js/app.js` (`computeNearbyStationsForPoint`) smo dodali filter
za starost meritve – postaje s starostjo nad 24h se izločijo iz seznama
"bližnjih živih postaj". To je zanesljivejši splošen signal od same
koordinate/nadmorske višine, saj vseh doslej najdenih 13 pokvarjenih/
neaktivnih postaj (glej debug izpis v Git zgodovini, commit z uvedbo tega
filtra) ni poročalo že vsaj 21 ur, večina pa mesece ali leta. Ohranili smo
tudi filter `altitude !== 0` iz napake #1 kot dodatno zaščito.

---

<!-- Nov najdeni problem: dodaj novo oštevilčeno sekcijo po enakem vzorcu
     (Datum odkritja / Opis / Vpliv / Dokazi / Predlog / Naša začasna
     zaščita), da ostane seznam pripravljen za pošiljanje SkyTech-u. -->
