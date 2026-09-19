import type { ItemCategory } from '@/types'

// A kanonikus 9 kategória — egyetlen forrás a chipekhez, szűréshez és az
// infláció-bontáshoz.
export const ALL_CATEGORIES: ItemCategory[] = [
  'Zöldség', 'Gyümölcs', 'Tejtermék', 'Hús', 'Pékáru', 'Vegán', 'Ital', 'Édesség', 'Egyéb',
]

const VALID_CATEGORIES = new Set<ItemCategory>(ALL_CATEGORIES)

// A tárolt category gyakran nem a kanonikus 9 egyike: a régi `import` adat, néhány
// lista/kézi tétel és az OCR saját szabad szöveget használ (pl. "Tejtermékek",
// "Húsáruk", "Italok", "Édességek"). Ezeket a közeli variánsokat a 9 kategóriába
// normalizáljuk, különben a kategória-szűrő és a személyes infláció torz lenne. Ami
// taxonómiailag nem fér bele (Élelmiszer, Snack, Háztartás, Gyógyszer…) az
// szándékosan marad "Egyéb".
const CATEGORY_ALIASES: Record<string, ItemCategory> = {
  'zöldség': 'Zöldség',
  'zöldség-gyümölcs': 'Zöldség',
  'zöldség és gyümölcs': 'Zöldség',
  'zöldség/gyümölcs': 'Zöldség',
  'gyümölcs': 'Gyümölcs',
  'gyümölcsök': 'Gyümölcs',
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
  'vegán': 'Vegán',
  'vegan': 'Vegán',
  'ital': 'Ital',
  'italok': 'Ital',
  'üdítő': 'Ital',
  'üdítők': 'Ital',
  'ásványvíz': 'Ital',
  'édesség': 'Édesség',
  'édességek': 'Édesség',
  'desszert': 'Édesség',
  'keksz': 'Édesség',
}

// Bármilyen tárolt kategória-szöveget a kanonikus 9 kategória egyikére képez le.
export function toCategory(raw: string | null | undefined): ItemCategory {
  if (!raw) return 'Egyéb'
  const trimmed = raw.trim()
  if (VALID_CATEGORIES.has(trimmed as ItemCategory)) return trimmed as ItemCategory
  return CATEGORY_ALIASES[trimmed.toLowerCase()] ?? 'Egyéb'
}

// Kulcsszó-alapú besorolás terméknévből, ha nincs jobb forrás (pl. OCR-ből jött új
// termék, amihez nem találtunk katalógus-párt). Konzervatív: bizonytalan esetben
// inkább "Egyéb"-be esik, mintsem hibásan soroljon. A sorrend számít:
// - "Vegán" elöl van, hogy a "Vegán sajt"/"Vegán mascarpone" ne a Tejtermék
//   kulcsszavakon akadjon fenn; az összetett pékáruk (sajtos pogácsa, túrós táska)
//   a Pékáru-nál akadnak fenn, nem a tej/hús-nál.
// - "Édesség" megelőzi az "Ital"-t, mert a "kola" (Ital) részstring a "csokoládé"
//   szóban is benne van — a "csoki"/"csokolade" így előbb talál.
// - "Ital" megelőzi a "Gyümölcs"-öt, mert a "gyümölcs" (Gyümölcs) részstring a
//   "gyümölcsital" szóban is benne van — a gyümölcslé/-ital így Italként, nem
//   Gyümölcsként azonosítódik.
const CATEGORY_KEYWORDS: [ItemCategory, string[]][] = [
  [
    'Vegán',
    ['vegan', 'tofu', 'szeitan', 'novenyi ital', 'novenyi tej'],
  ],
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
      'salata', 'gomba', 'cukkini', 'brokkoli', 'kaposzta', 'spenot', 'zoldseg', 'fokhagyma',
      'padlizsan', 'avokado', 'cekla', 'retek', 'karfiol'],
  ],
  [
    'Édesség',
    ['csokolade', 'csoki', 'bonbon', 'cukorka', 'nyaloka', 'szaloncukor', 'torta',
      'fagylalt', 'jegkrem', 'nugat', 'marcipan'],
  ],
  [
    'Ital',
    ['asvanyviz', 'viz', 'udito', 'kave', 'tea', 'kola', 'dzsusz', 'juice', 'szorp',
      'energiaital', 'pezsgo', 'limonade', 'ital'],
  ],
  [
    'Gyümölcs',
    ['alma', 'banan', 'korte', 'szolo', 'citrom', 'citromle', 'narancs', 'eper', 'malna',
      'gyumolcs', 'barack', 'szilva', 'mandarin', 'dinnye', 'kiwi', 'ananasz', 'mango',
      'afonya', 'cseresznye', 'meggy'],
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
