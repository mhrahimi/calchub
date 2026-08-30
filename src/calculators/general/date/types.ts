export type DateMode = 'difference' | 'addSubtract'

export interface DateInput {
  mode: DateMode
  startDate: string
  endDate?: string
  years?: number
  months?: number
  weeks?: number
  days?: number
}

export interface DateResult {
  mode: DateMode
  startDate: string
  endDate?: string
  resultDate?: string
  years?: number
  months?: number
  days?: number
  totalDays?: number
  totalWeeks?: number
}
