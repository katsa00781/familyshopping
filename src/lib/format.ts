const huFormatter = new Intl.NumberFormat('hu-HU')

export function formatHuf(amount: number): string {
  return huFormatter.format(Math.round(amount)) + ' Ft'
}

export function formatHuNumber(amount: number): string {
  return huFormatter.format(Math.round(amount))
}

// Bolt-név márka szintre: az OCR cégnevet ad ("ALDI MAGYARORSZÁG ÉLELMISZER Bt.",
// "Lidl Paks"), a katalógusban viszont egy boltból egy név kell. Az ismeretlen
// boltokat csak megvágjuk. Tükrözi a 2026-10-14-i adattisztító migráció szabályait.
const STORE_BRANDS: readonly (readonly [string, string])[] = [
  ['aldi', 'Aldi'],
  ['lidl', 'Lidl'],
  ['tesco', 'Tesco'],
  ['ecofamily', 'EcoFamily'],
  ['italház', 'Hansa Italház'],
  ['italhaz', 'Hansa Italház'],
  ['müller', 'Müller Drogéria'],
  ['muller', 'Müller Drogéria'],
]

export function normalizeStoreName(name: string | null | undefined): string | null {
  const trimmed = name?.trim()
  if (!trimmed) return null
  const lower = trimmed.toLowerCase()
  const brand = STORE_BRANDS.find(([needle]) => lower.includes(needle))
  return brand ? brand[1] : trimmed
}

export function formatHuDate(dateStr: string): string {
  const base = dateStr.split('T')[0] ?? dateStr
  const [yyyy, mm, dd] = base.split('-')
  return `${yyyy}.${mm}.${dd}.`
}
