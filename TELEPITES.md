# Telepítés & frissítés (TestFlight + EAS Update)

**Alapelv:** a natív app **TestFlight**-on keresztül megy fel a telefonokra, a JS/TS
változások pedig **OTA frissítésként** (EAS Update) érkeznek — új telepítés nélkül.

- EAS projekt: `@katsa00781/familyshopping` (`a6a04c18-286a-424a-8e32-c52b23a2f117`)
- Megjelenő név (kezdőképernyő): **FamilyHub** — a `slug` és a `scheme` marad `familyshopping`
- Bundle ID: `com.kacsorzsolt.familyshopping`
- Update URL: `https://u.expo.dev/a6a04c18-286a-424a-8e32-c52b23a2f117`
- Runtime version policy: **fingerprint** (a natív kód ujjlenyomata)
- Csatornák: `production` (TestFlight), `preview` (ad-hoc teszt), `development` (dev client)

---

## 1. Új build + TestFlight feltöltés

```bash
npx eas-cli@latest build --platform ios --profile production --auto-submit
```

Első futáskor bekéri az Apple ID-t (2FA) és létrehozza a tanúsítványokat +
az App Store Connect app-rekordot. A build ~15–25 perc, utána automatikusan
felmegy a TestFlightra.

A build number-t az EAS kezeli távolról (`appVersionSource: remote`,
`autoIncrement: true`) — nem kell kézzel emelni.

**Mikor kell új build?** Bármilyen natív változásnál: új natív csomag,
`app.json` engedély/ikon/név módosítás, Expo SDK emelés. Ilyenkor a fingerprint
megváltozik, és a régi buildek nem kapják meg az OTA-t.

## 2. OTA frissítés kiadása (a napi munkafolyamat)

Csak JS/TS/asset változás esetén — másodpercek alatt kimegy:

```bash
npx eas-cli@latest update --channel production --message "mit változtattam"
```

A telefonon az app **induláskor** letölti a frissítést a háttérben, és a
**következő indításnál** aktiválódik (`checkAutomatically: ON_LOAD`).
Tehát: bezárás → újranyitás, és már az új verzió fut.

Ellenőrzés:
```bash
npx eas-cli@latest update:list --branch production
npx eas-cli@latest channel:view production
```

Visszavonás (rollback egy korábbi update-re):
```bash
npx eas-cli@latest update:roll-back-to-embedded --channel production
```

## 3. Környezeti változók

A `.env` gitignore-olt, ezért a felhős build az EAS-ben tárolt változókat
használja (mindhárom environmentben fent vannak, `plaintext`):
`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_OCR_ENDPOINT`.

```bash
npx eas-cli@latest env:list production
npx eas-cli@latest env:set --environment production --environment preview --environment development \
  --name EXPO_PUBLIC_VALAMI --value "érték" --type string --visibility plaintext
```

⚠️ `.env` módosítás után az EAS-ben is frissíteni kell, különben a build a régi értékkel megy ki.

## Hibaelhárítás

### „Install dependencies" fázis elhasal (`npm ci` EUSAGE, „Missing: X from lock file")

Az EAS builder más npm-verziót futtathat, mint a géped, és a `package-lock.json`-t
az egyik verzió úgy írja meg, hogy a másik elutasítja (tipikusan opcionális,
platformfüggő wasm-fallback csomagoknál, pl. `@emnapi/*`).

A lock jelenleg npm 10-zel és 11-gyel is érvényes. Ha `npm install` után újra
eltérés lép fel, a javítás:

```bash
npx npm@10 install --package-lock-only   # kiegészíti a hiányzó bejegyzéseket
npx npm@10 ci --dry-run && npm ci --dry-run   # mindkét npm elfogadja?
```

### Build log letöltése CLI-ből

A log brotli-tömörített, ezért nem elég a `curl`:

```bash
URL=$(npx eas-cli@latest build:list --platform ios --limit 1 --json --non-interactive \
  | python3 -c "import sys,json;print(json.load(sys.stdin)[0]['logFiles'][0])")
curl -sL "$URL" -o /tmp/easlog.br
node -e "console.log(require('zlib').brotliDecompressSync(require('fs').readFileSync('/tmp/easlog.br')).toString())"
```

---

## 4. Tesztelők hozzáadása (TestFlight)

- **Internal (ajánlott, azonnali):** App Store Connect → *Users and Access* → tag hozzáadása
  Apple ID e-maillel → TestFlight → Internal Testing csoport. Nincs Apple review.
- **External:** TestFlight → External csoport → e-mail meghívó. Az **első** buildhez
  Apple Beta App Review kell (kb. 1 nap), utána a további buildek azonnal mennek.

Minden tesztelőnek a **TestFlight** app kell az iPhone-jára.

---

## Helyi fejlesztés (Metróval, kábelen)

```bash
npx expo start                       # Metro
npx expo run:ios --device 00008030-000A2D610132802E
```

Eszköz UDID: `00008030-000A2D610132802E` (Zsolt iPhone-ja)

- Pod / natív csomag változás után MINDIG teljes `run:ios` build (ne inkrementális Xcode build).
- Egyszerre csak egy Metro fusson (az ugkettlebellmobile projekt is indít egyet → leállítani).
- `expo-calendar` induláskor a Reminders engedélyt is ellenőrzi → kellenek az
  `NSRemindersUsageDescription` + `NSRemindersFullAccessUsageDescription` kulcsok (benne vannak az app.json-ban).
