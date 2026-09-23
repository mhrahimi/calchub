import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setItem } from '@/persistence/storage'
import {
  clearHistoryStore,
  loadHistory,
  MAX_HISTORY,
  pushHistory,
  saveHistory,
  type CalculatorHistoryEntry,
} from './historyStore'

const store = new Map<string, string>()

beforeEach(() => {
  store.clear()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    key: () => null,
    length: 0,
  })
})

describe('pushHistory', () => {
  it('prepends newest entries and caps the list', () => {
    const first = pushHistory([], { id: '1', expression: '1 + 1', result: '2' })
    const second = pushHistory(first, { id: '2', expression: '2 + 2', result: '4' })
    expect(second.map((e) => e.id)).toEqual(['2', '1'])

    const many: CalculatorHistoryEntry[] = Array.from({ length: MAX_HISTORY }, (_, i) => ({
      id: String(i),
      expression: `${i}`,
      result: `${i}`,
    }))
    const capped = pushHistory(many, { id: 'new', expression: '9 + 9', result: '18' })
    expect(capped).toHaveLength(MAX_HISTORY)
    expect(capped[0].id).toBe('new')
    expect(capped.at(-1)?.id).toBe(String(MAX_HISTORY - 2))
  })
})

describe('historyStore persistence', () => {
  it('round-trips through localStorage', () => {
    const entries = pushHistory([], { expression: '2 + 3 × 4', result: '14' })
    saveHistory(entries)
    expect(loadHistory()).toEqual(entries)
  })

  it('clears stored history', () => {
    saveHistory([{ id: '1', expression: '1', result: '1' }])
    clearHistoryStore()
    expect(loadHistory()).toEqual([])
  })

  it('ignores corrupt stored data', () => {
    setItem('basic-calculator-history', { bad: true } as never)
    expect(loadHistory()).toEqual([])
  })
})
