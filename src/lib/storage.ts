import AsyncStorage from '@react-native-async-storage/async-storage'

export const StorageKeys = {
  appearance: 'appearance',
  productViewMode: 'product.viewMode',
  pricePeriod: 'price.period',
  listLastActive: 'list.lastActive',
  authToken: 'auth.token',
  notificationPrefs: 'notification.prefs',
} as const

export type StorageKey = (typeof StorageKeys)[keyof typeof StorageKeys]

export async function getStorageItem<T>(key: StorageKey): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key)
    if (raw === null) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export async function setStorageItem<T>(key: StorageKey, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value))
  } catch {
    // storage errors are non-fatal
  }
}

export async function removeStorageItem(key: StorageKey): Promise<void> {
  try {
    await AsyncStorage.removeItem(key)
  } catch {
    // storage errors are non-fatal
  }
}
