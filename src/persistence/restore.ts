import type { HistoryRecord, SavedCalculation } from '@/calculators/types'
import { parseCalculationData, stringifyCalculationData } from '@/utils/calculationJson'

const RESTORE_KEY = 'calchub:pending-restore'

export type RestoreMode = 'reopen' | 'recalculate' | 'edit'

export interface PendingRestore {
  mode: RestoreMode
  record: HistoryRecord | SavedCalculation
}

export function setPendingRestore(restore: PendingRestore): void {
  sessionStorage.setItem(RESTORE_KEY, stringifyCalculationData(restore))
}

export function consumePendingRestore(calculatorId: string): PendingRestore | null {
  try {
    const raw = sessionStorage.getItem(RESTORE_KEY)
    if (!raw) return null
    const parsed = parseCalculationData<PendingRestore>(raw)
    if (parsed.record.calculatorId !== calculatorId) return null
    sessionStorage.removeItem(RESTORE_KEY)
    return parsed
  } catch {
    sessionStorage.removeItem(RESTORE_KEY)
    return null
  }
}

export function clearPendingRestore(): void {
  sessionStorage.removeItem(RESTORE_KEY)
}
