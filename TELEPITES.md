# Telepítés a telefonra (7 napos aláírás)

A 7 napos ingyenes aláírás miatt az app ~7 naponta lejár → újra kell telepíteni.

## Release build (Metro nélkül fut)

```
npx expo run:ios --device 00008030-000A2D610132802E --configuration Release
```

A JS bundle beágyazódik → a telepítés után **gép és Metro nélkül, magától elindul**.

## Debug build (fejlesztéshez – Metro kell hozzá)

```
npx expo run:ios --device 00008030-000A2D610132802E
```

Gyors visszajelzés fejlesztés közben, de **csak futó Metróval** indul.

---

## Ha gond van

- **Pod / natív csomag változás után** MINDIG ezekkel buildelj (ne inkrementális Xcode build).
- Egyszerre **csak egy Metro** fusson (az ugkettlebellmobile projekt is indít egyet → leállítani).
- `expo-calendar` induláskor a Reminders engedélyt is ellenőrzi → kellenek az `NSRemindersUsageDescription` + `NSRemindersFullAccessUsageDescription` kulcsok is (most már benne vannak az Info.plist-ben + app.json-ban).
- Eszköz UDID: `00008030-000A2D610132802E` (Zsolt iPhone-ja)
- Bundle ID: `com.kacsorzsolt.familyshopping`
