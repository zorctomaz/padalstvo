# Burja ⛵️

Mobilna aplikacija za jadralce (React Native + Expo), ki na enem mestu združuje:

- **Vreme** — lokalna vremenska in pomorska napoved (veter, sunki, valovi, tlak, vidljivost) za trenutno lokacijo, urna in 7-dnevna napoved. Podatki prihajajo v živo iz brezplačnega [Open-Meteo](https://open-meteo.com) API-ja (vreme + pomorski podatki o valovih), brez potrebe po API ključu.
- **Sosednje ladje (AIS)** — zemljevid in seznam ladij v bližini (razdalja, hitrost, smer, tip plovila), s podrobnostmi ob dotiku.
- **Sporočila** — neposredno klepetanje z ladjami, ki so se prijavile za prejemanje sporočil.
- **Moja ladja** — profil lastnega plovila (ime, MMSI, klicni znak, tip) in nastavitve vidnosti na AIS zemljevidu ter dosegljivosti za sporočila.

## Stanje projekta

To je prva (MVP) različica:

- **Vreme** je povezano na pravi, brezplačni javni API (Open-Meteo) — deluje takoj, brez konfiguracije.
- **AIS podatki o sosednjih ladjah** so trenutno simulirani (`src/services/aisService.ts`) prek vmesnika `AisProvider`, ki generira realistične, premikajoče se ladje okoli uporabnikove lokacije. Ko bo na voljo pravi AIS vir (npr. [AISstream.io](https://aisstream.io), lokalni NMEA/AIS sprejemnik ali komercialni ponudnik pomorskih podatkov), se doda nov razred, ki implementira isti `AisProvider` vmesnik — zaslonski del (map/seznam) se ne spreminja.
- **Sporočila** se trenutno shranjujejo lokalno na napravi (`AsyncStorage`, `src/services/messagingService.ts`) in simulirajo dostavo/odgovore. Za resnično sporočanje med ladjami je predviden backend (npr. Firebase Firestore) z enakim vmesnikom funkcij (`getMessages`, `sendMessage`, `onMessagesChanged`).

## Zagon

```bash
npm install
npm run start      # Expo dev server — odpri v Expo Go na telefonu
npm run android     # Android emulator/naprava
npm run ios         # iOS simulator (samo macOS)
npm run web         # spletni predogled (potrebuje dodatne pakete, glej spodaj)
```

Aplikacija ob zagonu vpraša za dovoljenje za lokacijo (uporablja se za vreme in za središče AIS zemljevida). Če dovoljenje ni podeljeno, se uporabi privzeta lokacija (Marina Koper).

### Zemljevid (react-native-maps)

Na Androidu `react-native-maps` privzeto uporablja Google Maps. Za produkcijsko (ne-Expo-Go) gradnjo je treba v `app.json` dodati Google Maps API ključ (`android.config.googleMaps.apiKey`). V Expo Go in na iOS (Apple Maps) deluje brez dodatne konfiguracije.

## Struktura kode

```
src/
  screens/       zasloni (Vreme, AIS zemljevid, Sporočila, Klepet, Moja ladja)
  services/      poslovna logika: weatherService (Open-Meteo), aisService (mock AIS, zamenljiv vmesnik),
                 messagingService (lokalno shranjena sporočila), ownBoatStore (profil lastne ladje)
  navigation/    React Navigation (bottom tabs + stack za klepet)
  components/    skupne UI komponente (kartice, glava zaslona, kompas puščica)
  hooks/         useSailorLocation (GPS lokacija s privzeto rezervno vrednostjo)
  types/         skupni TypeScript tipi (Boat, ChatMessage, MarineWeather, ...)
```

## Naslednji koraki

- Priklopiti pravi AIS vir namesto simuliranih ladij.
- Dodati backend (npr. Firebase) za resnično sporočanje med registriranimi ladjami in prijavo/avtentikacijo uporabnikov.
- Vremenska opozorila (nevihte, močan veter) kot potisna obvestila.
- Sledenje lastni poti (track) in beleženje potovanja.
