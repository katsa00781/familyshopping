# Screens — index

12 képernyő + 1 modális flow (OCR · 5 lépés). Minden fájl tartalmaz: zónaspec, interakciók, edge case-ek, navigációs leírás, screenshot.

| # | Képernyő | Tab / Hely | Spec |
|---|---|---|---|
| 01 | **Login** | Auth | [01-Login.md](./01-Login.md) |
| 02 | **ListOverview** | Tab 1 · Lista | [02-ListOverview.md](./02-ListOverview.md) |
| 03 | **ListDetail** | Tab 1 · Lista | [03-ListDetail.md](./03-ListDetail.md) |
| 04 | **ItemAddModal** | (bottom sheet) | [04-ItemAddModal.md](./04-ItemAddModal.md) |
| 05 | **ShopMode (Bolt mód) ★** | Tab 4 · Bolt | [05-ShopMode.md](./05-ShopMode.md) |
| 06 | **ProductList** | Tab 2 · Termékek | [06-ProductList.md](./06-ProductList.md) |
| 07 | **ProductDetail** | Tab 2 · Termékek | [07-ProductDetail.md](./07-ProductDetail.md) |
| 08 | **ProductAdd** | Tab 2 · Termékek | [08-ProductAdd.md](./08-ProductAdd.md) |
| 09 | **PriceOverview** | Tab 3 · Árak | [09-PriceOverview.md](./09-PriceOverview.md) |
| 10 | **OCRFlow** (5 lépés) | Root modal | [10-OCRFlow.md](./10-OCRFlow.md) |
| 11 | **Profile** | Tab 5 · Profil | [11-Profile.md](./11-Profile.md) |
| 12 | **FamilySettings** | Tab 5 · Profil | [12-FamilySettings.md](./12-FamilySettings.md) |

## Lefedettség

| Terület | Lefedettség |
|---|---|
| Auth flow | Login (Register out of scope v0.1) |
| Bevásárlási flow | ListOverview → ListDetail → ItemAddModal → ShopMode → SaveConfirm |
| Termék-kezelés | ProductList → ProductDetail / ProductAdd |
| Árfigyelés | PriceOverview → PriceHistoryDetail (= ProductDetail chart fullscreen) |
| OCR | 5-lépéses globális modál |
| Profil | Profile → FamilySettings + 4 sub-screen (NotificationSettings, EditProfile, ChangePassword, PickerScreen — generic) |

## Ki nem fedve (v0.1-en kívül)

- **Register / Forgot password screens** — Login spec hivatkozik rájuk, de spec nincs
- **NotificationSettings / EditProfile / ChangePassword** — egyszerű form-screen, ne specelj most külön
- **PickerScreen** — generic full-screen picker, search-vel. Reusable Profil minden picker-igényéhez (valuta, bolt, kategória).
- **PriceHistoryDetail** — `ProductDetail` chart kártyájának fullscreen verziója; ugyanaz a komponens, csak nagyobb viewport-on
