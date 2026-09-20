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

<!-- Nov najdeni problem: dodaj novo oštevilčeno sekcijo po enakem vzorcu
     (Datum odkritja / Opis / Vpliv / Dokazi / Predlog / Naša začasna
     zaščita), da ostane seznam pripravljen za pošiljanje SkyTech-u. -->
