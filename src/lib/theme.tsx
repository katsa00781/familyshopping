import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useColorScheme } from 'nativewind'

import { getStorageItem, setStorageItem, StorageKeys } from '@/lib/storage'

export type AppearanceMode = 'light' | 'dark' | 'system'

interface ThemeContextValue {
  appearance: AppearanceMode
  setAppearance: (mode: AppearanceMode) => Promise<void>
}

const ThemeContext = createContext<ThemeContextValue>({
  appearance: 'system',
  setAppearance: async () => {},
})

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const { setColorScheme } = useColorScheme()
  const [appearance, setAppearanceState] = useState<AppearanceMode>('system')

  useEffect(() => {
    void getStorageItem<AppearanceMode>(StorageKeys.appearance).then((saved) => {
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        setAppearanceState(saved)
        setColorScheme(saved)
      }
    })
  }, [setColorScheme])

  async function setAppearance(mode: AppearanceMode): Promise<void> {
    setAppearanceState(mode)
    setColorScheme(mode)
    await setStorageItem(StorageKeys.appearance, mode)
  }

  return (
    <ThemeContext.Provider value={{ appearance, setAppearance }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useAppearance(): ThemeContextValue {
  return useContext(ThemeContext)
}
