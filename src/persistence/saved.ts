import type { HistoryRecord, SavedCalculation } from '@/calculators/types'
import { getDB } from './db'

export async function saveCalculation(
  record: Omit<HistoryRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
  name: string,
  notes?: string,
): Promise<SavedCalculation> {
  const db = await getDB()
  const now = new Date().toISOString()
  const full: SavedCalculation = {
    ...record,
    id: record.id ?? crypto.randomUUID(),
    name,
    notes,
    createdAt: now,
    updatedAt: now,
  }
  await db.put('saved', full)
  return full
}

export async function getSavedCalculations(limit = 200): Promise<SavedCalculation[]> {
  const db = await getDB()
  const all = await db.getAllFromIndex('saved', 'by-date')
  return all.reverse().slice(0, limit)
}

export async function getSavedCalculation(id: string): Promise<SavedCalculation | undefined> {
  const db = await getDB()
  return db.get('saved', id)
}

export async function searchSaved(query: string): Promise<SavedCalculation[]> {
  const all = await getSavedCalculations(500)
  const q = query.trim().toLowerCase()
  if (!q) return all
  return all.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      s.calculatorId.toLowerCase().includes(q) ||
      (s.notes?.toLowerCase().includes(q) ?? false) ||
      (s.label?.toLowerCase().includes(q) ?? false),
  )
}

export async function renameSaved(id: string, name: string): Promise<SavedCalculation | undefined> {
  const db = await getDB()
  const existing = await db.get('saved', id)
  if (!existing) return undefined
  const updated: SavedCalculation = {
    ...existing,
    name,
    updatedAt: new Date().toISOString(),
  }
  await db.put('saved', updated)
  return updated
}

export async function updateSaved(
  id: string,
  patch: Partial<Pick<SavedCalculation, 'inputs' | 'results' | 'name' | 'notes' | 'label'>>,
): Promise<SavedCalculation | undefined> {
  const db = await getDB()
  const existing = await db.get('saved', id)
  if (!existing) return undefined
  const updated: SavedCalculation = {
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
  }
  await db.put('saved', updated)
  return updated
}

export async function deleteSaved(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('saved', id)
}

export async function duplicateSaved(id: string): Promise<SavedCalculation | undefined> {
  const db = await getDB()
  const existing = await db.get('saved', id)
  if (!existing) return undefined
  const now = new Date().toISOString()
  const copy: SavedCalculation = {
    ...existing,
    id: crypto.randomUUID(),
    name: `${existing.name} (copy)`,
    createdAt: now,
    updatedAt: now,
  }
  await db.put('saved', copy)
  return copy
}

export async function clearSaved(): Promise<void> {
  const db = await getDB()
  await db.clear('saved')
}
