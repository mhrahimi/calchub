import { getItem, setItem } from './storage'

const RECENT_KEY = 'recently-used'
const MAX_RECENT = 6

export function getRecentlyUsed(): string[] {
  return getItem<string[]>(RECENT_KEY, [])
}

export function addRecentlyUsed(calculatorId: string): void {
  const recent = getRecentlyUsed().filter((id) => id !== calculatorId)
  recent.unshift(calculatorId)
  setItem(RECENT_KEY, recent.slice(0, MAX_RECENT))
}
