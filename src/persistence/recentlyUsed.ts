import { getItem, setItem } from './storage'

const RECENT_KEY = 'recently-used'
export const MAX_RECENT = 6

export function getRecentlyUsed(): string[] {
  return getItem<string[]>(RECENT_KEY, [])
}

export function setRecentlyUsed(ids: string[]): void {
  setItem(RECENT_KEY, ids.slice(0, MAX_RECENT))
}

export function addRecentlyUsed(calculatorId: string): void {
  const recent = getRecentlyUsed().filter((id) => id !== calculatorId)
  recent.unshift(calculatorId)
  setRecentlyUsed(recent)
}
