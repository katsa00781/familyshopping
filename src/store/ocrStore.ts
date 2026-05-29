import { create } from 'zustand'
import type { OCRResponse, ReviewItem } from '@/types'

interface OCRState {
  capturedImageUri: string | null
  ocrResponse: OCRResponse | null
  reviewItems: ReviewItem[]
  boundListId: string | null

  setCapturedImage: (uri: string) => void
  setOcrResponse: (
    response: OCRResponse,
    existingProductIds: Record<string, string | null>,
    matchedProductNames: Record<string, string | null>
  ) => void
  updateReviewItem: (id: string, patch: Partial<ReviewItem>) => void
  toggleSkip: (id: string) => void
  reset: () => void
  setBoundList: (listId: string | null) => void
}

function generateId(): string {
  return Math.random().toString(36).slice(2)
}

export const useOcrStore = create<OCRState>((set, get) => ({
  capturedImageUri: null,
  ocrResponse: null,
  reviewItems: [],
  boundListId: null,

  setCapturedImage: (uri) => set({ capturedImageUri: uri }),

  setOcrResponse: (response, existingProductIds, matchedProductNames) => {
    const reviewItems: ReviewItem[] = response.items.map((item) => ({
      ...item,
      id: generateId(),
      isDuplicate: existingProductIds[item.name] !== undefined,
      existingProductId: existingProductIds[item.name] ?? null,
      matchedProductName: matchedProductNames[item.name] ?? null,
      skip: false,
    }))
    set({ ocrResponse: response, reviewItems })
  },

  updateReviewItem: (id, patch) => {
    set({
      reviewItems: get().reviewItems.map((item) =>
        item.id === id ? { ...item, ...patch } : item
      ),
    })
  },

  toggleSkip: (id) => {
    set({
      reviewItems: get().reviewItems.map((item) =>
        item.id === id ? { ...item, skip: !item.skip } : item
      ),
    })
  },

  reset: () =>
    set({ capturedImageUri: null, ocrResponse: null, reviewItems: [], boundListId: null }),

  setBoundList: (listId) => set({ boundListId: listId }),
}))
