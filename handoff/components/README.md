# Components — index

Mind a 9 alapprimitív specifikációja. Minden fájl tartalmaz: prop API, vizuális spec, példa, szabályok.

| Komponens | Spec | Honnan / Hova |
|---|---|---|
| Button       | [Button.md](./Button.md)       | CTA, ghost link, FAB |
| Input        | [Input.md](./Input.md)         | Login, ItemAddModal, ProductAdd, OCR ReviewItems |
| Card         | [Card.md](./Card.md)           | ListOverview kártyák, ProductDetail blokkok |
| Badge        | [Badge.md](./Badge.md)         | Kategória színkód, árváltozás, source / role |
| Checkbox     | [Checkbox.md](./Checkbox.md)   | ListDetail (24 pt), **Bolt mód (56 pt)** |
| BottomSheet  | [BottomSheet.md](./BottomSheet.md) | ItemAdd, ItemEdit, ProductEdit |
| EmptyState   | [EmptyState.md](./EmptyState.md) | Üres listák, üres szűrő, hibás OCR fallback |
| Skeleton     | [Skeleton.md](./Skeleton.md)   | Minden adatfüggő képernyő töltés alatt |
| Toast        | [Toast.md](./Toast.md)         | Success / error / info / warning |

## Composition rules

### Do

- Egy `primary` Button per képernyő — ez a "lighthouse"
- Skeleton közben → Toast utána (success / error)
- Kategória Badge legyen az egyetlen szín a monokróm listákban
- 44 pt min. tap target, akkor is ha a vizuális kisebb (Checkbox `list` variant)
- Bolt-mode Checkbox **mindig** `impactMedium` haptikkal — kivétel nincs

### Don't

- Toastok stackelése — új toast keresztsöt át a régit
- `ghost` + `secondary` ugyanabban a sorban — válassz egyet
- `destructive` variant "Cancel"-re — csak delete/remove
- Floating label az inputban — Hungarian compoundok hosszúak
- Skeleton < 200 ms — villogni fog
