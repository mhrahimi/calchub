import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { HistoryRecord, SavedCalculation } from '@/calculators/types'

export interface CalcHubDB extends DBSchema {
  history: {
    key: string
    value: HistoryRecord
    indexes: { 'by-calculator': string; 'by-date': string }
  }
  saved: {
    key: string
    value: SavedCalculation
    indexes: { 'by-calculator': string; 'by-date': string; 'by-name': string }
  }
}

let dbPromise: Promise<IDBPDatabase<CalcHubDB>> | null = null

export function getDB(): Promise<IDBPDatabase<CalcHubDB>> {
  if (!dbPromise) {
    dbPromise = openDB<CalcHubDB>('calchub', 2, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const history = db.createObjectStore('history', { keyPath: 'id' })
          history.createIndex('by-calculator', 'calculatorId')
          history.createIndex('by-date', 'createdAt')
        }
        if (oldVersion < 2) {
          if (!db.objectStoreNames.contains('history')) {
            const history = db.createObjectStore('history', { keyPath: 'id' })
            history.createIndex('by-calculator', 'calculatorId')
            history.createIndex('by-date', 'createdAt')
          }
          const saved = db.createObjectStore('saved', { keyPath: 'id' })
          saved.createIndex('by-calculator', 'calculatorId')
          saved.createIndex('by-date', 'createdAt')
          saved.createIndex('by-name', 'name')
        }
      },
    })
  }
  return dbPromise
}
