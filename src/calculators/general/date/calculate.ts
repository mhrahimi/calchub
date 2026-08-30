import { parseIsoDate, dateDifference, addToDate, toIsoDate } from '@/utils/dates'
import type { DateInput, DateResult } from './types'
import type { CalculationExplanation, TableData } from '@/calculators/types'

export function calculateDate(input: DateInput): DateResult {
  const start = parseIsoDate(input.startDate)
  if (input.mode === 'difference') {
    const end = parseIsoDate(input.endDate!)
    const diff = dateDifference(start, end)
    return {
      mode: 'difference',
      startDate: input.startDate,
      endDate: input.endDate,
      years: diff.years,
      months: diff.months,
      days: diff.days,
      totalDays: diff.totalDays,
      totalWeeks: Math.round(diff.totalWeeks * 100) / 100,
    }
  }
  const result = addToDate(start, {
    years: input.years ?? 0,
    months: input.months ?? 0,
    weeks: input.weeks ?? 0,
    days: input.days ?? 0,
  })
  return {
    mode: 'addSubtract',
    startDate: input.startDate,
    resultDate: toIsoDate(result),
  }
}

export function explainDate(_input: DateInput, _result: DateResult): CalculationExplanation {
  return {
    title: 'Date arithmetic',
    steps: [
      { label: 'Calendar', result: 'Gregorian' },
      { label: 'Month-end policy', result: 'Clamp to last day of month (e.g. Jan 31 + 1 month → Feb 28/29)' },
    ],
    assumptions: ['Pure calendar dates; no timezone offset applied.'],
  }
}

export function buildDateTable(result: DateResult): TableData {
  if (result.mode === 'difference') {
    return {
      title: 'Date difference',
      columns: [
        { key: 'component', label: 'Component', align: 'left' },
        { key: 'value', label: 'Value', align: 'right' },
      ],
      rows: [
        { component: 'Years', value: result.years! },
        { component: 'Months', value: result.months! },
        { component: 'Days', value: result.days! },
        { component: 'Total days', value: result.totalDays! },
        { component: 'Total weeks', value: result.totalWeeks! },
      ],
    }
  }
  return {
    title: 'Result date',
    columns: [
      { key: 'label', label: 'Label', align: 'left' },
      { key: 'value', label: 'Value', align: 'left' },
    ],
    rows: [
      { label: 'Start', value: result.startDate },
      { label: 'Result', value: result.resultDate! },
    ],
  }
}
