import { readAsStringAsync } from 'expo-file-system/legacy'
import { getSessionSafe } from '@/lib/supabase'
import type { OCRItem, OCRResponse } from '@/types'

const OCR_ENDPOINT = process.env.EXPO_PUBLIC_OCR_ENDPOINT ?? ''

const MOCK_RESPONSE: OCRResponse = {
  lines: [],
  items: [
    { name: 'Tej 2.8%', rawName: 'Tej 2.8%', qty: 2, unit: 'l', price: 449, conf: 0.95 },
    { name: 'Vaj', rawName: 'Vaj', qty: 1, unit: 'db', price: 699, conf: 0.91 },
    { name: 'Kenyér', rawName: 'Kenyér', qty: 1, unit: 'db', price: 389, conf: 0.62 },
    { name: 'Alma', rawName: 'Alma', qty: 1.5, unit: 'kg', price: 520, conf: 0.88 },
    { name: 'Csirkemell', rawName: 'Csirkemell', qty: 0.8, unit: 'kg', price: 1840, conf: 0.79 },
  ],
  total: 4346,
  store: 'Lidl',
  date: new Date().toISOString().split('T')[0] ?? null,
  conf: 0.83,
}

// Raw shape returned by the deployed ocr-receipt Edge Function
interface RawReceiptItem {
  name: string
  raw_name?: string | null
  quantity: number | null
  unit: string | null
  unit_price: number | null
  total_price: number | null
  category: string | null
  confidence?: number | null
}

interface RawReceiptResponse {
  items: RawReceiptItem[]
  total: number | null
  store: string | null
  date: string | null
}

function transformResponse(raw: RawReceiptResponse): OCRResponse {
  const items: OCRItem[] = raw.items.map((item) => ({
    name: item.name,
    // A blokkon látható eredeti szöveg a tanuló glosszárium kulcsa; ha hiányzik
    // (régi függvény-verzió), a tiszta névre esünk vissza.
    rawName: item.raw_name?.trim() || item.name,
    qty: item.quantity ?? 1,
    unit: item.unit,
    price: item.unit_price ?? item.total_price ?? 0,
    conf: clampConf(item.confidence),
  }))
  const conf =
    items.length > 0 ? items.reduce((sum, i) => sum + i.conf, 0) / items.length : 0.9
  return {
    lines: [],
    items,
    total: raw.total,
    store: raw.store,
    date: raw.date,
    conf,
  }
}

function clampConf(value: number | null | undefined): number {
  if (value == null || !Number.isFinite(value)) return 0.9
  return Math.min(1, Math.max(0, value))
}

export async function sendOCRRequest(imageUri: string): Promise<OCRResponse> {
  if (!OCR_ENDPOINT) {
    await new Promise((r) => setTimeout(r, 1800))
    return MOCK_RESPONSE
  }

  const base64 = await readAsStringAsync(imageUri, { encoding: 'base64' })

  const session = await getSessionSafe()
  if (!session) throw new Error('Jelentkezz be az OCR használatához.')

  const response = await fetch(OCR_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ imageBase64: base64 }),
  })

  if (!response.ok) {
    let message = `HTTP ${response.status}`
    try {
      const body = await response.json() as { error?: { message?: string } }
      if (body.error?.message) message = body.error.message
    } catch {
      // ignore parse error, use status code
    }
    throw new Error(message)
  }

  const raw = await response.json() as RawReceiptResponse
  return transformResponse(raw)
}
