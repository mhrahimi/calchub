import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { getFavorites, toggleFavorite as toggleFav } from '@/persistence/favorites'
import { getSettings, saveSettings } from '@/persistence/settings'
import type { AppSettings } from '@/calculators/types'

interface AppContextValue {
  favorites: string[]
  refreshFavorites: () => void
  toggleFavorite: (id: string) => boolean
  settings: AppSettings
  updateSettings: (partial: Partial<AppSettings>) => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState(getFavorites)
  const [settings, setSettings] = useState(getSettings)

  const refreshFavorites = useCallback(() => setFavorites(getFavorites()), [])

  const toggleFavorite = useCallback((id: string) => {
    const result = toggleFav(id)
    setFavorites(getFavorites())
    return result
  }, [])

  const updateSettings = useCallback((partial: Partial<AppSettings>) => {
    const updated = saveSettings(partial)
    setSettings(updated)
  }, [])

  return (
    <AppContext.Provider
      value={{ favorites, refreshFavorites, toggleFavorite, settings, updateSettings }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
