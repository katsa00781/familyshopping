import type { Product } from '@/types'

// Levenshtein távolság
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

// Alap normalizálás: kisbetű + szóközök
function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ')
}

// Erős normalizálás: ékezetek eltávolítása, tizedespont egységesítése,
// felesleges írásjelek törlése — az OCR sok variációt produkál ugyanarra a névre
function normalizeStrong(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')     // ékezetek (á→a, é→e, stb.)
    .replace(/[.,;:!?()%]/g, ' ')        // írásjelek szóközzé
    .replace(/(\d),(\d)/g, '$1.$2')      // "2,8" → "2.8"
    .replace(/\s+/g, ' ')
    .trim()
}

// Tokenizálás: legalább 2 karakteres szavak halmaza
function tokenSet(s: string): Set<string> {
  return new Set(normalizeStrong(s).split(' ').filter((t) => t.length >= 2))
}

// Token-hasonlóság: a közös tokenek aránya a nagyobb halmazhoz képest (Jaccard)
function tokenSimilarity(a: string, b: string): number {
  const ta = tokenSet(a)
  const tb = tokenSet(b)
  if (ta.size === 0 || tb.size === 0) return 0
  let common = 0
  for (const t of ta) {
    if (tb.has(t)) common++
  }
  return common / Math.max(ta.size, tb.size)
}

// Dinamikus Levenshtein-küszöb: rövidebb nevekre szigorúbb, hosszabbakra lazább
function levThreshold(name: string): number {
  const len = name.length
  if (len <= 5) return 1
  if (len <= 10) return 2
  return 3
}

export function findMatchingProduct(
  name: string,
  brand: string | null,
  products: Product[]
): Product | null {
  if (products.length === 0) return null

  const normName = normalize(name)
  const normKey = `${normName}|${normalize(brand ?? '')}`

  // 1. Pontos egyezés (name + brand)
  const exact = products.find((p) => {
    const key = `${normalize(p.name)}|${normalize(p.brand ?? '')}`
    return key === normKey
  })
  if (exact) return exact

  // 2. Erősen normalizált pontos egyezés (vesszők, írásjelek, ékezetek)
  const normStrong = normalizeStrong(name)
  const strongExact = products.find((p) => normalizeStrong(p.name) === normStrong)
  if (strongExact) return strongExact

  // 3. Tokenalapú egyezés: legalább 70%-os Jaccard-hasonlóság
  let bestTokenScore = 0
  let bestTokenMatch: Product | null = null
  for (const p of products) {
    const score = tokenSimilarity(name, p.name)
    if (score > bestTokenScore) {
      bestTokenScore = score
      bestTokenMatch = p
    }
  }
  if (bestTokenScore >= 0.7) return bestTokenMatch

  // 4. Levenshtein az erősen normalizált neveken (dinamikus küszöb)
  const threshold = levThreshold(normStrong)
  for (const p of products) {
    if (levenshtein(normalizeStrong(p.name), normStrong) <= threshold) return p
  }

  return null
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
