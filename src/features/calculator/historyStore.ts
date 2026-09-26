import { getItem, setItem } from '@/persistence/storage'
import type { AngleMode } from './engine'

export type CalculatorHistoryEntry = {
  id: string
  expression: string
  result: string
  angleMode?: AngleMode
}

const HISTORY_KEY = 'basic-calculator-history'
export const MAX_HISTORY = 50

export function loadHistory(): CalculatorHistoryEntry[] {
  const raw = getItem<CalculatorHistoryEntry[]>(HISTORY_KEY, [])
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (item) =>
      item &&
      typeof item.id === 'string' &&
      typeof item.expression === 'string' &&
      typeof item.result === 'string' &&
      item.expression.length <= 2000 &&
      item.result.length <= 2000 &&
      (item.angleMode === undefined || item.angleMode === 'deg' || item.angleMode === 'rad'),
  ).slice(0, MAX_HISTORY)
}

export function saveHistory(entries: CalculatorHistoryEntry[]): void {
  setItem(HISTORY_KEY, entries.slice(0, MAX_HISTORY))
}

/** Prepend a new entry and cap the list. Pure — does not touch storage. */
export function pushHistory(
  entries: CalculatorHistoryEntry[],
  item: Omit<CalculatorHistoryEntry, 'id'> & { id?: string },
  max = MAX_HISTORY,
): CalculatorHistoryEntry[] {
  const entry: CalculatorHistoryEntry = {
    id: item.id ?? crypto.randomUUID(),
    expression: item.expression,
    result: item.result,
    ...(item.angleMode ? { angleMode: item.angleMode } : {}),
  }
  return [entry, ...entries].slice(0, max)
}

export function clearHistoryStore(): void {
  setItem(HISTORY_KEY, [])
}
