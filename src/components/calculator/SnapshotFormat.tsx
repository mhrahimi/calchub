import { createContext, useContext } from 'react'
import type { CalculationProvenance, CurrencyDisplay } from '@/exports/provenance'
import { snapshotCurrency } from '@/exports/provenance'
export const SnapshotFormatContext = createContext<CalculationProvenance | undefined>(undefined)
export const CurrencyDisplayContext = createContext<CurrencyDisplay>('code')
export function useSnapshotCurrency() {
  const provenance = useContext(SnapshotFormatContext)
  const display = useContext(CurrencyDisplayContext)
  return (value:number) => snapshotCurrency(value, provenance, display)
}
