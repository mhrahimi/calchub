export type ValidationResult =
  | { valid: true; data: unknown }
  | { valid: false; errors: Record<string, string> }

export interface CalculationStep {
  label: string
  expression?: string
  result?: string
}

export interface CalculationExplanation {
  title: string
  steps: CalculationStep[]
  assumptions?: string[]
}

export interface ChartSeries {
  name: string
  data: Array<{ x: number | string; y: number }>
  color?: string
}

export interface ChartData {
  type: 'line' | 'area' | 'bar' | 'pie'
  title?: string
  series: ChartSeries[]
  xLabel?: string
  yLabel?: string
  stacked?: boolean
  valueFormat?: 'currency' | 'percent' | 'number'
}

export interface TableColumn {
  key: string
  label: string
  align?: 'left' | 'right'
  format?: 'currency' | 'percent' | 'number' | 'date' | 'text'
}

export interface TableData {
  title?: string
  columns: TableColumn[]
  rows: Record<string, string | number>[]
}

export type LucideIconName =
  | 'Table'
  | 'Home'
  | 'TrendingUp'
  | 'Percent'
  | 'Landmark'
  | 'PiggyBank'
  | 'Target'
  | 'Gauge'
  | 'Calculator'
  | 'Wallet'
  | 'Receipt'
  | 'LineChart'
  | 'Building2'
  | 'Layers'
  | 'Binary'
  | 'Divide'
  | 'BarChart3'
  | 'Shuffle'
  | 'Triangle'
  | 'Compass'
  | 'FlaskConical'
  | 'Hash'
  | 'Calendar'
  | 'ArrowLeftRight'

export interface CalculatorMeta {
  id: string
  title: string
  description: string
  categories: string[]
  categorySlug: string
  keywords: string[]
  icon: LucideIconName
  implemented: boolean
  route: string
  popular?: boolean
}

export interface CategoryMeta {
  slug: string
  title: string
  description: string
}

export interface HistoryRecord {
  id: string
  calculatorId: string
  createdAt: string
  updatedAt: string
  inputs: unknown
  results: unknown
  label?: string
  mode?: string
  units?: string
  settingsVersion: number
  taxConfigVersion?: string
}

export interface SavedCalculation extends HistoryRecord {
  name: string
  notes?: string
}

export interface AppSettings {
  country: 'US' | 'CA'
  currency: 'USD' | 'CAD' | 'EUR' | 'GBP'
  measurementSystem: 'metric' | 'imperial'
  numberFormat: 'en-US' | 'en-CA'
  defaultTaxJurisdiction: string
  defaultTaxYear: number
  settingsVersion: number
  historyEnabled: boolean
  pdfTableMode: 'full' | 'summary'
}

export const DEFAULT_SETTINGS: AppSettings = {
  country: 'US',
  currency: 'USD',
  measurementSystem: 'imperial',
  numberFormat: 'en-US',
  defaultTaxJurisdiction: 'us-federal',
  defaultTaxYear: 2026,
  settingsVersion: 1,
  historyEnabled: true,
  pdfTableMode: 'summary',
}
