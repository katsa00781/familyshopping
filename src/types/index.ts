// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface Profile {
  id: string
  email: string | null
  full_name: string | null
  display_name: string | null
  avatar_url: string | null
  family_id: string | null
  created_at: string
  updated_at: string
}

// ─── Bevásárlólista ───────────────────────────────────────────────────────────
export type ItemCategory = 'Zöldség' | 'Tejtermék' | 'Hús' | 'Pékáru' | 'Egyéb'

export interface ShoppingItem {
  id: string
  name: string
  quantity: number
  unit: string
  category: ItemCategory
  checked: boolean
  price: number | null
  product_id: string | null
}

export interface ShoppingList {
  id: string
  user_id: string
  name: string
  date: string
  items: ShoppingItem[]
  total_amount: number
  completed: boolean
  store_name: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

// ─── Termékek ─────────────────────────────────────────────────────────────────
export interface PriceHistoryEntry {
  price: number
  store_name: string | null
  date: string
  source: 'manual' | 'list' | 'ocr' | 'import'
}

export interface Product {
  id: string
  user_id: string
  name: string
  brand: string | null
  category: string
  store_name: string | null
  price: number | null
  unit: string
  barcode: string | null
  last_price: number | null
  price_history: PriceHistoryEntry[]
  available: boolean
  created_at: string
  updated_at: string
}

// ─── Árváltozások ─────────────────────────────────────────────────────────────
export interface ProductPriceHistory {
  id: string
  user_id: string
  product_id: string | null
  product_name: string
  product_category: string | null
  store_name: string | null
  unit: string
  unit_price: number
  quantity: number
  total_price: number
  price_date: string
  source: 'manual' | 'list' | 'ocr' | 'import'
  created_at: string
}

// ─── Statisztikák ─────────────────────────────────────────────────────────────
export interface ShoppingStatistic {
  id: string
  user_id: string
  shopping_list_id: string | null
  product_name: string
  product_category: string | null
  store_name: string | null
  unit: string
  unit_price: number
  quantity: number
  total_price: number
  shopping_date: string
  source: 'manual' | 'list' | 'ocr' | 'import'
  created_at: string
}

// ─── OCR ─────────────────────────────────────────────────────────────────────
export interface OCRItem {
  name: string
  qty: number
  unit: string | null
  price: number
  conf: number
}

export interface OCRResponse {
  lines: string[]
  items: OCRItem[]
  total: number | null
  store: string | null
  date: string | null
  conf: number
}

export interface ReviewItem extends OCRItem {
  id: string
  isDuplicate: boolean
  existingProductId: string | null
  matchedProductName: string | null
  skip: boolean
}

// ─── Család ───────────────────────────────────────────────────────────────────
export type FamilyRole = 'admin' | 'member' | 'viewer'

export interface FamilyMember {
  id: string
  name: string
  email: string
  role: FamilyRole
  joinedAt: string
}

export interface Family {
  id: string
  name: string
  inviteLink: string
  inviteExpiresAt: string
  members: FamilyMember[]
}

// ─── UI helper típusok ────────────────────────────────────────────────────────
export interface PriceChange {
  product_id: string | null
  product_name: string
  product_category: string | null
  store_name: string | null
  old_price: number
  new_price: number
  change_pct: number
  change_ft: number
  date: string
}

export interface InflationByCategory {
  category: ItemCategory
  change_pct: number
  share: number
}
