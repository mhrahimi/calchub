import { DEFAULT_SETTINGS, type AppSettings } from '@/calculators/types'
import { getItem, setItem } from './storage'

const SETTINGS_KEY = 'settings'

export function getSettings(): AppSettings {
  const stored = getItem<Partial<AppSettings>>(SETTINGS_KEY, {})
  return { ...DEFAULT_SETTINGS, ...stored }
}

export function saveSettings(settings: Partial<AppSettings>): AppSettings {
  const current = getSettings()
  const updated = { ...current, ...settings, settingsVersion: current.settingsVersion }
  setItem(SETTINGS_KEY, updated)
  return updated
}

export function resetSettings(): AppSettings {
  setItem(SETTINGS_KEY, DEFAULT_SETTINGS)
  return DEFAULT_SETTINGS
}
