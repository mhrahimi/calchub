import {
  DEFAULT_SETTINGS,
  type AppSettings,
  type HistoryRecord,
  type SavedCalculation,
} from '@/calculators/types'
import {
  loadHistory,
  saveHistory,
  type CalculatorHistoryEntry,
  MAX_HISTORY,
} from '@/features/calculator/historyStore'
import { getDB } from './db'
import { getFavorites, setFavorites } from './favorites'
import { MAX_RECENT, getRecentlyUsed, setRecentlyUsed } from './recentlyUsed'
import { getSettings } from './settings'
import { setItem } from './storage'
import { parseCalculationData, stringifyCalculationData } from '@/utils/calculationJson'

export const BACKUP_FORMAT = 'calchub-backup'
export const BACKUP_VERSION = 1

export class BackupError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BackupError'
  }
}

export interface CalcHubBackup {
  format: typeof BACKUP_FORMAT
  version: typeof BACKUP_VERSION
  exportedAt: string
  settings: AppSettings
  favorites: string[]
  recentlyUsed: string[]
  basicCalculatorHistory: CalculatorHistoryEntry[]
  history: HistoryRecord[]
  saved: SavedCalculation[]
}

export interface ParsedBackup {
  backup: CalcHubBackup
  skippedCount: number
}

const INVALID_BACKUP = 'This file is not a CalcHub backup.'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function stringList(value: unknown, limit?: number): string[] {
  if (!Array.isArray(value)) return []
  const ids = value.filter((item): item is string => typeof item === 'string' && item.length > 0)
  return limit === undefined ? ids : ids.slice(0, limit)
}

function sanitizeSettings(raw: unknown): AppSettings {
  const source = isRecord(raw) ? raw : {}
  const next: AppSettings = { ...DEFAULT_SETTINGS }
  if (source.country === 'US' || source.country === 'CA') next.country = source.country
  if (
    source.currency === 'USD' ||
    source.currency === 'CAD' ||
    source.currency === 'EUR' ||
    source.currency === 'GBP'
  ) {
    next.currency = source.currency
  }
  if (source.measurementSystem === 'metric' || source.measurementSystem === 'imperial') {
    next.measurementSystem = source.measurementSystem
  }
  if (source.numberFormat === 'en-US' || source.numberFormat === 'en-CA') {
    next.numberFormat = source.numberFormat
  }
  if (typeof source.defaultTaxJurisdiction === 'string' && source.defaultTaxJurisdiction) {
    next.defaultTaxJurisdiction = source.defaultTaxJurisdiction
  }
  if (typeof source.defaultTaxYear === 'number' && Number.isInteger(source.defaultTaxYear)) {
    next.defaultTaxYear = source.defaultTaxYear
  }
  if (typeof source.historyEnabled === 'boolean') next.historyEnabled = source.historyEnabled
  if (source.pdfTableMode === 'full' || source.pdfTableMode === 'summary') {
    next.pdfTableMode = source.pdfTableMode
  }
  if (typeof source.settingsVersion === 'number' && Number.isFinite(source.settingsVersion)) {
    next.settingsVersion = source.settingsVersion
  }
  return next
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function toHistoryRecord(value: unknown): HistoryRecord | null {
  if (!isRecord(value)) return null
  if (typeof value.id !== 'string' || !value.id) return null
  if (typeof value.calculatorId !== 'string' || !value.calculatorId) return null
  if (typeof value.createdAt !== 'string' || !value.createdAt) return null
  if (typeof value.updatedAt !== 'string' || !value.updatedAt) return null
  if (!('inputs' in value) || !('results' in value)) return null
  const record: HistoryRecord = {
    id: value.id,
    calculatorId: value.calculatorId,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    inputs: value.inputs,
    results: value.results,
    settingsVersion: typeof value.settingsVersion === 'number' ? value.settingsVersion : 1,
  }
  const label = optionalString(value.label)
  const mode = optionalString(value.mode)
  const units = optionalString(value.units)
  const taxConfigVersion = optionalString(value.taxConfigVersion)
  if (label !== undefined) record.label = label
  if (mode !== undefined) record.mode = mode
  if (units !== undefined) record.units = units
  if (taxConfigVersion !== undefined) record.taxConfigVersion = taxConfigVersion
  return record
}

function toSavedCalculation(value: unknown): SavedCalculation | null {
  const record = toHistoryRecord(value)
  if (!record || !isRecord(value) || typeof value.name !== 'string' || !value.name) return null
  const saved: SavedCalculation = { ...record, name: value.name }
  const notes = optionalString(value.notes)
  if (notes !== undefined) saved.notes = notes
  return saved
}

function tapeEntries(value: unknown): CalculatorHistoryEntry[] {
  if (!Array.isArray(value)) return []
  return value
    .filter(
      (item): item is CalculatorHistoryEntry =>
        isRecord(item) &&
        typeof item.id === 'string' &&
        typeof item.expression === 'string' &&
        typeof item.result === 'string',
    )
    .slice(0, MAX_HISTORY)
}

function collection(value: unknown): unknown[] {
  if (value === undefined) return []
  if (!Array.isArray(value)) throw new BackupError(INVALID_BACKUP)
  return value
}

export function parseBackup(raw: unknown): ParsedBackup {
  if (!isRecord(raw) || raw.format !== BACKUP_FORMAT || raw.version !== BACKUP_VERSION) {
    throw new BackupError(INVALID_BACKUP)
  }

  let skippedCount = 0
  const history: HistoryRecord[] = []
  for (const item of collection(raw.history)) {
    const record = toHistoryRecord(item)
    if (record) history.push(record)
    else skippedCount += 1
  }

  const saved: SavedCalculation[] = []
  for (const item of collection(raw.saved)) {
    const record = toSavedCalculation(item)
    if (record) saved.push(record)
    else skippedCount += 1
  }

  return {
    skippedCount,
    backup: {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : new Date().toISOString(),
      settings: sanitizeSettings(raw.settings),
      favorites: stringList(raw.favorites),
      recentlyUsed: stringList(raw.recentlyUsed, MAX_RECENT),
      basicCalculatorHistory: tapeEntries(raw.basicCalculatorHistory),
      history,
      saved,
    },
  }
}

export function parseBackupText(text: string): ParsedBackup {
  try {
    return parseBackup(parseCalculationData(text))
  } catch (error) {
    if (error instanceof BackupError) throw error
    throw new BackupError(INVALID_BACKUP)
  }
}

export function serializeBackup(backup: CalcHubBackup): string {
  return stringifyCalculationData(backup, 2)
}

export async function exportBackup(now = new Date()): Promise<CalcHubBackup> {
  const db = await getDB()
  const [history, saved] = await Promise.all([db.getAll('history'), db.getAll('saved')])
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    settings: getSettings(),
    favorites: stringList(getFavorites()),
    recentlyUsed: stringList(getRecentlyUsed(), MAX_RECENT),
    basicCalculatorHistory: loadHistory(),
    history,
    saved,
  }
}

export async function importBackup(backup: CalcHubBackup): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(['history', 'saved'], 'readwrite')
  const historyStore = tx.objectStore('history')
  const savedStore = tx.objectStore('saved')
  await historyStore.clear()
  await savedStore.clear()
  for (const record of backup.history) await historyStore.put(record)
  for (const record of backup.saved) await savedStore.put(record)
  await tx.done

  setItem('settings', backup.settings)
  setFavorites(backup.favorites)
  setRecentlyUsed(backup.recentlyUsed)
  saveHistory(backup.basicCalculatorHistory)
}
