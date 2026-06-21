# FamilyHub – Dizájnirány (FamilyWall-stílus)

Cél: a jelenlegi hideg kék/slate felületet meleg, barátságos, „családi szervező" esztétikára cserélni — lekerekített kártyák, tagonkénti színkód, sok levegő. A funkcionalitás és a Bolt mód magas kontrasztja megmarad.

## Hangulat egy mondatban
> Meleg törtfehér háttér, teal brandszín, korall akcentus, puha lekerekített kártyák, minden családtagnak saját szín.

---

## Színpaletta

### Alap
| Szerep | Token | Hex |
|---|---|---|
| Brand / CTA / aktív tab | `primary` | `#14B8A6` |
| Szöveg primary-n | `primaryForeground` | `#FFFFFF` |
| Akcent (kiemelés, „ma", riasztás) | `accent` | `#FB7185` |
| Siker / kipipált | `success` | `#22C55E` |
| Figyelmeztetés (túlköltés, árváltozás) | `warning` | `#F59E0B` |
| Törlés | `destructive` | `#EF4444` |

### Felületek (light)
| Szerep | Token | Hex |
|---|---|---|
| Háttér | `background` | `#F8F7F4` |
| Kártya | `card` | `#FFFFFF` |
| Szöveg | `foreground` | `#1C2B2A` |
| Meta / placeholder | `muted` | `#8A8F8E` |
| Vonal / keret | `border` | `#E9E7E1` |

### Felületek (dark)
| Szerep | Hex |
|---|---|
| Háttér | `#13201F` |
| Kártya | `#1B2B29` |
| Keret | `#2A3B39` |
| Szöveg | `#F1F5F4` |

### Bolt mód (külön, theme-független)
| Szerep | Hex |
|---|---|
| Vászon | `#13201F` *(régen `#000000`)* |
| Sticky bar | `#0E1817` |
| Bar hairline | `#2A3B39` |

---

## Tagszínek
Minden családtag kap egy színt — megjelenik az avatar-gyűrűn, a naptáreseményein, a hozzá rendelt feladatokon. Ez a FamilyWall egyik aláírás-eleme.

`#14B8A6` teal · `#FB7185` korall · `#A78BFA` lila · `#F59E0B` sárga · `#38BDF8` kék · `#34D399` zöld

---

## Forma, tér, tipográfia
- **Kártya radius:** `20–24` (`rounded-2xl` / `rounded-3xl`)
- **Árnyék:** lágy (`shadow-sm` listákban, `shadow-md` kiemelt kártyán)
- **Padding:** bőséges (kártyán min. 16, szekciók közt 20–24)
- **Fejlécek:** nagyok, barátságosak; sok levegő
- **Ikonok:** `lucide-react-native`, stroke 1.75, primary vagy foreground színnel
- **Avatar:** kör, 2 pt színes gyűrűvel (tagszín)

---

## Komponens-jegyzetek
- **Kezdőlap kártyák:** fehér kártya, bal oldali színes ikon-chip (teal/korall háttér), cím + meta. Tap → adott tab.
- **„Ma" kártya:** korall akcentus a dátumon, alatta a mai események tagszínes pöttyökkel.
- **Kassza kártya:** nagy szám (hátralévő keret), alatta vékony progress sáv (elköltött/keret); túlköltés → `warning`.
- **Naptár:** hónap-grid, napokon tagszínes pöttyök; kiválasztott nap alatt agenda lista.
- **Étrend:** heti oszlopok (H–V), recept-kártyák húzhatók; alul „Bevásárlólista generálása" primary gomb.

---

## Mit NE
- Ne tiszta fekete háttér sehol (Bolt mód is `#13201F`).
- Ne hideg kék (`#2563EB`) — azt teljesen kivezetjük.
- Ne hardcode-olt hex a komponensekben — csak token osztály.
- Ne zsúfolt lista emoji-kategóriával a fő navigációban.

---

## Design research (ajánlott, mielőtt képernyőt kódolsz)
- [ ] Pinterest: `family organizer app UI` → 15+ referencia
- [ ] Dribbble: `family calendar app` / `budget app card` → 10+ referencia
- [ ] Mobbin: FamilyWall, Cozi, Maple valós flow-k
- [ ] 2–3 referencia kép csatolása minden képernyő-prompthoz
