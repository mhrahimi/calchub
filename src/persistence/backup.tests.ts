import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS, type HistoryRecord, type SavedCalculation } from '@/calculators/types'
import { loadHistory, saveHistory } from '@/features/calculator/historyStore'
import { BackupError, exportBackup, importBackup, parseBackup, parseBackupText } from './backup'
import { getDB } from './db'
import { getFavorites, setFavorites } from './favorites'
import { clearHistory, getHistoryRecords, saveHistoryRecord } from './history'
import { getRecentlyUsed, setRecentlyUsed } from './recentlyUsed'
import { clearSaved, getSavedCalculations } from './saved'
import { getSettings } from './settings'
import { setItem } from './storage'

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

function historyRecord(id: string, createdAt: string): HistoryRecord {
  return {
    id,
    calculatorId: 'loan',
    createdAt,
    updatedAt: createdAt,
    inputs: { amount: id },
    results: { payment: 1 },
    settingsVersion: 1,
  }
}

function savedRecord(id: string, name: string): SavedCalculation {
  return { ...historyRecord(id, '2026-01-01T00:00:00.000Z'), name }
}

async function seedHistory(count: number) {
  const db = await getDB()
  const tx = db.transaction('history', 'readwrite')
  for (let i = 0; i < count; i++) {
    const createdAt = new Date(Date.UTC(2026, 0, 1, 0, 0, i)).toISOString()
    await tx.store.put(historyRecord(`history-${i}`, createdAt))
  }
  await tx.done
}

async function seedSaved(count: number) {
  const db = await getDB()
  const tx = db.transaction('saved', 'readwrite')
  for (let i = 0; i < count; i++) {
    await tx.store.put(savedRecord(`saved-${i}`, `Saved ${i}`))
  }
  await tx.done
}

beforeEach(async () => {
  mockLocalStorage()
  setItem('settings', { ...DEFAULT_SETTINGS, currency: 'CAD', historyEnabled: true })
  await clearHistory()
  await clearSaved()
})

describe('backup', () => {
  it('exports the full stores and import replaces the current session', async () => {
    setFavorites(['loan', 'mortgage'])
    setRecentlyUsed(['retirement', 'loan'])
    saveHistory([{ id: 'tape-1', expression: '1+1', result: '2' }])
    await seedHistory(101)
    await seedSaved(201)

    const exported = await exportBackup(new Date('2026-09-25T12:00:00.000Z'))
    expect(exported.history).toHaveLength(101)
    expect(exported.saved).toHaveLength(201)
    expect(await getHistoryRecords()).toHaveLength(100)
    expect(await getSavedCalculations()).toHaveLength(200)

    setItem('settings', { ...DEFAULT_SETTINGS, currency: 'EUR' })
    setFavorites(['inflation'])
    setRecentlyUsed(['dcf'])
    saveHistory([{ id: 'other', expression: '2+2', result: '4' }])
    await saveHistoryRecord({
      calculatorId: 'inflation',
      inputs: {},
      results: {},
      settingsVersion: 1,
    })

    const parsed = parseBackup(JSON.parse(JSON.stringify(exported)))
    expect(parsed.skippedCount).toBe(0)
    await importBackup(parsed.backup)

    const restored = await exportBackup()
    expect(restored.history.map((record) => record.id).sort()).toEqual(
      exported.history.map((record) => record.id).sort(),
    )
    expect(restored.saved).toHaveLength(201)
    expect(getSettings().currency).toBe('CAD')
    expect(getFavorites()).toEqual(['loan', 'mortgage'])
    expect(getRecentlyUsed()).toEqual(['retirement', 'loan'])
    expect(loadHistory()).toEqual([{ id: 'tape-1', expression: '1+1', result: '2' }])
  })

  it('rejects a non-backup file without clearing stored data', async () => {
    await saveHistoryRecord({
      calculatorId: 'loan',
      inputs: { amount: 5 },
      results: { payment: 1 },
      settingsVersion: 1,
    })

    expect(() => parseBackup({ hello: 'world' })).toThrow(BackupError)
    expect(() => parseBackupText('not json')).toThrow(BackupError)
    expect(() =>
      parseBackup({
        format: 'calchub-backup',
        version: 1,
        history: 'nope',
        saved: [],
      }),
    ).toThrow(BackupError)

    expect(await getHistoryRecords()).toHaveLength(1)
    expect(getSettings().currency).toBe('CAD')
  })

  it('drops malformed records and keeps valid ones', async () => {
    await seedHistory(1)

    const parsed = parseBackup({
      format: 'calchub-backup',
      version: 1,
      settings: { currency: 'GBP', country: 'not-a-country' },
      favorites: ['loan', 3],
      recentlyUsed: ['mortgage', 'loan', 'retirement', 'dcf', 'bonds', 'salary', 'inflation'],
      basicCalculatorHistory: [
        { id: 'tape-1', expression: '1+1', result: '2' },
        { id: 'bad' },
      ],
      history: [
        historyRecord('keep-history', '2026-02-01T00:00:00.000Z'),
        { id: 'missing-fields' },
      ],
      saved: [
        savedRecord('keep-saved', 'Home'),
        { ...historyRecord('no-name', '2026-02-01T00:00:00.000Z') },
      ],
    })

    expect(parsed.skippedCount).toBe(2)
    expect(parsed.backup.settings.currency).toBe('GBP')
    expect(parsed.backup.settings.country).toBe(DEFAULT_SETTINGS.country)
    expect(parsed.backup.favorites).toEqual(['loan'])
    expect(parsed.backup.recentlyUsed).toHaveLength(6)
    expect(parsed.backup.basicCalculatorHistory).toHaveLength(1)

    await importBackup(parsed.backup)

    expect(await getHistoryRecords()).toHaveLength(1)
    expect((await getHistoryRecords())[0].id).toBe('keep-history')
    expect(await getSavedCalculations()).toHaveLength(1)
    expect((await getSavedCalculations())[0].name).toBe('Home')
  })
})
