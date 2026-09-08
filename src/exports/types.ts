import type { CalculationExplanation, ChartData, HistoryRecord, TableData } from '@/calculators/types'

export interface ResultSummaryItem {
  label: string
  value: string
  primary?: boolean
}

export interface ExportPayload {
  title: string
  calculatorId: string
  date: string
  label?: string
  inputs: Record<string, unknown>
  resultsSummary: ResultSummaryItem[]
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
