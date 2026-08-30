import type { CalculationExplanation, ChartData, HistoryRecord, TableData } from '@/calculators/types'

export interface ExportPayload {
  title: string
  calculatorId: string
  date: string
  label?: string
  inputs: Record<string, unknown>
  resultsSummary: Array<{ label: string; value: string }>
  explanation?: CalculationExplanation
  table?: TableData
  charts?: ChartData[]
  shareText?: string
  disclaimer: string
}

export interface PdfExportOptions {
  tableMode: 'full' | 'summary'
  summaryRowLimit?: number
}

export type ExportRecord = Pick<
  HistoryRecord,
  'calculatorId' | 'inputs' | 'results' | 'createdAt' | 'label' | 'mode'
>
