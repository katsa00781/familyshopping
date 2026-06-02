import type { Product } from '@/types'

// Levenshtein távolság (OCR-elgépelés tűréshez)
function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i]![j] = dp[i - 1]![j - 1]!
      } else {
        dp[i]![j] = 1 + Math.min(dp[i - 1]![j]!, dp[i]![j - 1]!, dp[i - 1]![j - 1]!)
      }
    }
  }
  return dp[m]![n]!
}

// Erős normalizálás: ékezetek eltávolítása, tizedespont egységesítése,
// felesleges írásjelek törlése — az OCR sok variációt produkál ugyanarra a névre
function normalizeStrong(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // ékezetek (á→a, é→e, stb.)
    .replace(/[.,;:!?()%/*]/g, ' ') // írásjelek szóközzé
    .replace(/(\d),(\d)/g, '$1.$2') // "2,8" → "2.8"
    .replace(/\s+/g, ' ')
    .trim()
}

// Tokenizálás: legalább 2 karakteres szavak
function tokenize(s: string): string[] {
  return normalizeStrong(s)
    .split(' ')
    .filter((t) => t.length >= 2)
}

// Egy token "jelentős", ha legalább 3 betűt tartalmaz — így a méret-/mennyiségzaj
// ("330g", "20", "1l", "kg", "db") nem visz be hamis egyezést.
function letterCount(t: string): number {
  let c = 0
  for (const ch of t) {
    if (ch >= 'a' && ch <= 'z') c++
  }
  return c
}
function isSignificant(t: string): boolean {
  return letterCount(t) >= 3
}

// Két token egyezik-e — OCR-toleranciával:
// - pontos egyezés
// - hosszabb tokeneknél 1 karakter eltérés (elgépelés/rossz felismerés)
// - prefix egyezés (a katalógusnév rövidebb, az OCR ragozott/összevont alak)
function tokenEq(a: string, b: string): boolean {
  if (a === b) return true
  const minLen = Math.min(a.length, b.length)
  if (minLen < 5) return false
  if (Math.abs(a.length - b.length) <= 1 && levenshtein(a, b) <= 1) return true
  if (a.startsWith(b) || b.startsWith(a)) return true
  return false
}

// Pontszám 0..1: mennyire fedi a katalógusnév jelentős tokenjeit a blokk-szöveg.
// A blokk-név jellemzően a tiszta katalógusnév + méret/márka zaj, ezért a
// "containment" (a katalógusnév benne van-e a blokkban) jobb jelzés, mint a Jaccard.
function matchScore(query: string, product: Product): number {
  const qNorm = normalizeStrong(query)
  const pNorm = normalizeStrong(product.name)
  if (!qNorm || !pNorm) return 0
  if (qNorm === pNorm) return 1

  const qTokens = tokenize(query)
  const pTokens = tokenize(`${product.name} ${product.brand ?? ''}`)
  if (qTokens.length === 0 || pTokens.length === 0) return 0

  // Jelentős tokenekre szűkítünk; ha nincs ilyen, az összesre esünk vissza.
  const pSig = pTokens.filter(isSignificant)
  const base = pSig.length > 0 ? pSig : pTokens

  let shared = 0
  for (const pt of base) {
    if (qTokens.some((qt) => tokenEq(pt, qt))) shared++
  }
  if (shared === 0) return 0

  const coverage = shared / base.length
  // kis bónusz, ha a katalógusnév teljes substringként megjelenik (jobb rangsor)
  const bonus = qNorm.includes(pNorm) ? 0.1 : 0
  return Math.min(1, coverage + bonus)
}

// Auto-egyeztetéshez használt küszöb: a katalógusnév jelentős tokenjeinek
// legalább 60%-a megjelenik a blokk-szövegben.
const AUTO_MATCH_THRESHOLD = 0.6

export function findMatchingProduct(
  name: string,
  brand: string | null,
  products: Product[]
): Product | null {
  if (products.length === 0) return null

  const query = brand ? `${name} ${brand}` : name

  let best: Product | null = null
  let bestScore = 0
  for (const p of products) {
    const score = matchScore(query, p)
    if (score > bestScore) {
      bestScore = score
      best = p
    }
  }

  return bestScore >= AUTO_MATCH_THRESHOLD ? best : null
}

// A kézi kereső (ReviewItems ProductPicker) számára: ékezet-érzéketlen, rangsorolt
// találati lista. Üres lekérdezésre minden terméket ad. Beépíti a gyors gépelést
// (substring / prefix), és a fuzzy token-pontszámot is, hogy a blokkból kiolvasott
// nevet beírva azonnal a releváns katalógustermékek jelenjenek meg elöl.
export function searchProducts(query: string, products: Product[]): Product[] {
  const q = normalizeStrong(query)
  if (q.length === 0) return products

  const scored = products
    .map((p) => {
      const pNorm = normalizeStrong(p.name)
      const bNorm = normalizeStrong(p.brand ?? '')
      const startsWith = pNorm.startsWith(q) || bNorm.startsWith(q)
      const substring = pNorm.includes(q) || bNorm.includes(q)
      let rank = matchScore(query, p)
      if (substring) rank = Math.max(rank, 0.7)
      if (startsWith) rank = Math.max(rank, 0.95)
      return { product: p, rank }
    })
    .filter((x) => x.rank > 0)
    .sort((a, b) => b.rank - a.rank)

  return scored.map((x) => x.product)
}

export function deduplicateOCRItems(
  ocrNames: string[],
  products: Product[]
): { name: string; existingProduct: Product | null }[] {
  return ocrNames.map((name) => ({
    name,
    existingProduct: findMatchingProduct(name, null, products),
  }))
}
