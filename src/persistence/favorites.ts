import { getItem, setItem } from './storage'

const FAVORITES_KEY = 'favorites'

export function getFavorites(): string[] {
  return getItem<string[]>(FAVORITES_KEY, [])
}

export function isFavorite(calculatorId: string): boolean {
  return getFavorites().includes(calculatorId)
}

export function toggleFavorite(calculatorId: string): boolean {
  const favorites = getFavorites()
  const index = favorites.indexOf(calculatorId)
  if (index >= 0) {
    favorites.splice(index, 1)
    setItem(FAVORITES_KEY, favorites)
    return false
  }
  favorites.push(calculatorId)
  setItem(FAVORITES_KEY, favorites)
  return true
}

export function getFavoriteCalculators(): string[] {
  return getFavorites()
}
