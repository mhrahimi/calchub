import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  saveHistoryRecord,
  getHistoryRecords,
  renameHistoryRecord,
  deleteHistoryRecord,
  duplicateHistoryRecord,
  clearHistory,
} from './history'
import { setItem } from './storage'
import { DEFAULT_SETTINGS } from '@/calculators/types'

function mockLocalStorage() {
  const store = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    key: () => null,
    get length() {
      return store.size
    },
  })
}

beforeEach(async () => {
  mockLocalStorage()
  await clearHistory()
  setItem('settings', { ...DEFAULT_SETTINGS, historyEnabled: true })
})

describe('history persistence', () => {
  it('saves and lists records', async () => {
    await saveHistoryRecord({
      calculatorId: 'loan',
      inputs: { amount: 1000 },
      results: { payment: 50 },
      settingsVersion: 1,
    })
    const records = await getHistoryRecords()
    expect(records).toHaveLength(1)
    expect(records[0].calculatorId).toBe('loan')
  })

  it('renames a record', async () => {
    const saved = await saveHistoryRecord({
      calculatorId: 'loan',
      inputs: {},
      results: {},
      settingsVersion: 1,
    })
    expect(saved).toBeTruthy()
    const updated = await renameHistoryRecord(saved!.id, 'My loan')
    expect(updated?.label).toBe('My loan')
  })

  it('duplicates and deletes records', async () => {
    const saved = await saveHistoryRecord({
      calculatorId: 'loan',
      inputs: { x: 1 },
      results: { y: 2 },
      settingsVersion: 1,
    })
    const copy = await duplicateHistoryRecord(saved!.id)
    expect(copy?.id).not.toBe(saved!.id)
    expect(await getHistoryRecords()).toHaveLength(2)
    await deleteHistoryRecord(saved!.id)
    expect(await getHistoryRecords()).toHaveLength(1)
  })

  it('skips save when history disabled', async () => {
    setItem('settings', { ...DEFAULT_SETTINGS, historyEnabled: false })
    const result = await saveHistoryRecord({
      calculatorId: 'loan',
      inputs: {},
      results: {},
      settingsVersion: 1,
    })
    expect(result).toBeNull()
    expect(await getHistoryRecords()).toHaveLength(0)
  })
})
