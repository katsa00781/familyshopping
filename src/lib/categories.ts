import type { ItemCategory } from '@/types'

// A kanonikus 5 kategória — egyetlen forrás a chipekhez, szűréshez és az
// infláció-bontáshoz.
export const ALL_CATEGORIES: ItemCategory[] = ['Zöldség', 'Tejtermék', 'Hús', 'Pékáru', 'Egyéb']

const VALID_CATEGORIES = new Set<ItemCategory>(ALL_CATEGORIES)

// A tárolt category gyakran nem a kanonikus 5 egyike: a régi `import` adat, néhány
// lista/kézi tétel és az OCR saját szabad szöveget használ (pl. "Tejtermékek",
// "Húsáruk", "Zöldség és gyümölcs"). Ezeket a közeli variánsokat az 5 kategóriába
// normalizáljuk, különben a kategória-szűrő és a személyes infláció torz lenne. Ami
// taxonómiailag nem fér bele (Édesség, Élelmiszer, Ital, Snack, Háztartás, Gyógyszer…)
// az szándékosan marad "Egyéb".
const CATEGORY_ALIASES: Record<string, ItemCategory> = {
  'zöldség': 'Zöldség',
  'zöldség-gyümölcs': 'Zöldség',
  'zöldség és gyümölcs': 'Zöldség',
  'zöldség/gyümölcs': 'Zöldség',
  'gyümölcs': 'Zöldség',
  'tejtermék': 'Tejtermék',
  'tejtermékek': 'Tejtermék',
  'tej': 'Tejtermék',
  'hús': 'Hús',
  'húsáru': 'Hús',
  'húsáruk': 'Hús',
  'húsok': 'Hús',
  'hús és hal': 'Hús',
  'húskészítmény': 'Hús',
  'felvágott': 'Hús',
  'pékáru': 'Pékáru',
  'pékárú': 'Pékáru',
  'pékáruk': 'Pékáru',
  'péksütemény': 'Pékáru',
  'kenyér': 'Pékáru',
}

// Bármilyen tárolt kategória-szöveget a kanonikus 5 kategória egyikére képez le.
export function toCategory(raw: string | null | undefined): ItemCategory {
  if (!raw) return 'Egyéb'
  const trimmed = raw.trim()
  if (VALID_CATEGORIES.has(trimmed as ItemCategory)) return trimmed as ItemCategory
  return CATEGORY_ALIASES[trimmed.toLowerCase()] ?? 'Egyéb'
}

// Kulcsszó-alapú besorolás terméknévből, ha nincs jobb forrás (pl. OCR-ből jött új
// termék, amihez nem találtunk katalógus-párt). Konzervatív: bizonytalan esetben
// inkább "Egyéb"-be esik, mintsem hibásan soroljon. A sorrend számít — az összetett
// pékáruk (sajtos pogácsa, túrós táska) a Pékáru-nál akadnak fenn, nem a tej/hús-nál.
const CATEGORY_KEYWORDS: [ItemCategory, string[]][] = [
  [
    'Pékáru',
    ['kenyer', 'kifli', 'zsemle', 'pekaru', 'bagett', 'peksut', 'croissant', 'pogacsa',
      'kalacs', 'brios', 'vekni', 'sutemeny', 'fank', 'perec', 'langos', 'toast', 'buci',
      'batyu', 'taska', 'retes', 'piskota', 'ostya', 'keksz'],
  ],
  [
    'Hús',
    ['csirke', 'sertes', 'marha', 'pulyka', 'hus', 'sonka', 'kolbasz', 'szalami', 'virsli',
      'bacon', 'comb', 'mell', 'karaj', 'tarja', 'daralt', 'felvagott', 'parizsi',
      'hal', 'lazac', 'halrud', 'sertesborda', 'borda', 'kacsa', 'pastetom'],
  ],
  [
    'Tejtermék',
    ['tej', 'sajt', 'turo', 'joghurt', 'tejfol', 'vaj', 'kefir', 'tejszin', 'margarin',
      'trappista', 'mozzarella', 'feta', 'parmezan', 'gomolya', 'mascarpone', 'kremsajt'],
  ],
  [
    'Zöldség',
    ['paradicsom', 'paprika', 'hagyma', 'burgonya', 'krumpli', 'sargarepa', 'repa', 'uborka',
      'salata', 'alma', 'banan', 'korte', 'szolo', 'citrom', 'narancs', 'gomba', 'cukkini',
      'brokkoli', 'kaposzta', 'spenot', 'eper', 'malna', 'gyumolcs', 'zoldseg', 'fokhagyma',
      'padlizsan', 'avokado', 'cekla', 'retek', 'karfiol', 'citromle'],
  ],
]

// Erős normalizálás (ékezetek le), hogy a kulcsszavak ékezet-érzéketlenül illeszkedjenek.
function stripAccents(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

export function inferCategory(name: string): ItemCategory {
  const n = stripAccents(name)
  if (!n.trim()) return 'Egyéb'
  for (const [category, keywords] of CATEGORY_KEYWORDS) {
    if (keywords.some((kw) => n.includes(kw))) return category
  }
  return 'Egyéb'
}
