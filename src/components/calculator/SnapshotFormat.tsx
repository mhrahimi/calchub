import { createContext, useContext } from 'react'
import type { CalculationProvenance } from '@/exports/provenance'
import { snapshotCurrency } from '@/exports/provenance'
export const SnapshotFormatContext = createContext<CalculationProvenance | undefined>(undefined)
export function useSnapshotCurrency() {
  const provenance = useContext(SnapshotFormatContext)
  return (value:number) => snapshotCurrency(value, provenance)
}
