import type { HistoryRecord } from '@/calculators/types'
import { getSettings } from '@/persistence/settings'
import { getDB } from './db'

export async function saveHistoryRecord(
  record: Omit<HistoryRecord, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<HistoryRecord | null> {
  if (!getSettings().historyEnabled) return null
  const db = await getDB()
  const now = new Date().toISOString()
  const full: HistoryRecord = {
    ...record,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  }
  await db.put('history', full)
  return full
}

export async function getHistoryRecords(limit = 100): Promise<HistoryRecord[]> {
  const db = await getDB()
  const all = await db.getAllFromIndex('history', 'by-date')
  return all.reverse().slice(0, limit)
}

export async function getHistoryRecord(id: string): Promise<HistoryRecord | undefined> {
  const db = await getDB()
  return db.get('history', id)
}

export async function updateHistoryRecord(
  id: string,
  patch: Partial<Pick<HistoryRecord, 'inputs' | 'results' | 'label' | 'mode' | 'units'>>,
): Promise<HistoryRecord | undefined> {
  const db = await getDB()
  const existing = await db.get('history', id)
  if (!existing) return undefined
  const updated: HistoryRecord = {
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
  }
  await db.put('history', updated)
  return updated
}

export async function renameHistoryRecord(id: string, label: string): Promise<HistoryRecord | undefined> {
  return updateHistoryRecord(id, { label })
}

export async function deleteHistoryRecord(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('history', id)
}

export async function duplicateHistoryRecord(id: string): Promise<HistoryRecord | undefined> {
  const db = await getDB()
  const existing = await db.get('history', id)
  if (!existing) return undefined
  const now = new Date().toISOString()
  const copy: HistoryRecord = {
    ...existing,
    id: crypto.randomUUID(),
    label: existing.label ? `${existing.label} (copy)` : undefined,
    createdAt: now,
    updatedAt: now,
  }
  await db.put('history', copy)
  return copy
}

export async function clearHistory(): Promise<void> {
  const db = await getDB()
  await db.clear('history')
}
