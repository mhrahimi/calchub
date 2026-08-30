import { getTaxConfig, TAX_CONFIG_VERSION } from '@/tax/registry'
import { computeCombinedTax } from '@/tax/engine/progressiveTax'
import { computePayroll } from '@/tax/engine/payroll'
import type { CalculationExplanation, ChartData, TableData } from '@/calculators/types'
import type { PayFrequency, SalaryInput, SalaryResult } from './types'

function periodsPerYear(freq: PayFrequency, hoursPerWeek = 40, weeksPerYear = 52): number {
  switch (freq) {
    case 'annual':
      return 1
    case 'monthly':
      return 12
    case 'semi-monthly':
      return 24
    case 'biweekly':
      return 26
    case 'weekly':
      return 52
    case 'daily':
      return weeksPerYear * 5
    case 'hourly':
      return hoursPerWeek * weeksPerYear
  }
}

function toAnnual(
  amount: number,
  freq: PayFrequency,
  hoursPerWeek = 40,
  weeksPerYear = 52,
): number {
  return amount * periodsPerYear(freq, hoursPerWeek, weeksPerYear)
}

function fromAnnual(
  annual: number,
  freq: PayFrequency,
  hoursPerWeek = 40,
  weeksPerYear = 52,
): number {
  return annual / periodsPerYear(freq, hoursPerWeek, weeksPerYear)
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

const FREQUENCIES: PayFrequency[] = [
  'annual',
  'monthly',
  'semi-monthly',
  'biweekly',
  'weekly',
  'daily',
  'hourly',
]

export function calculateSalary(input: SalaryInput): SalaryResult {
  const hours = input.hoursPerWeek ?? 40
  const weeks = input.weeksPerYear ?? 52
  const annualGross = round2(toAnnual(input.amount, input.fromFrequency, hours, weeks))
  const convertedAmount = round2(fromAnnual(annualGross, input.toFrequency, hours, weeks))

  const equivalents = Object.fromEntries(
    FREQUENCIES.map((f) => [f, round2(fromAnnual(annualGross, f, hours, weeks))]),
  ) as Record<PayFrequency, number>

  if (input.mode === 'conversion') {
    return {
      mode: 'conversion',
      annualGross,
      convertedAmount,
      equivalents,
    }
  }

  const country = input.country!
  const jurisdictionId = input.jurisdictionId!
  const filingStatus = input.filingStatus ?? 'single'
  const pretax = Math.max(0, input.pretaxDeductions ?? 0)
  const year = input.taxYear ?? 2026

  const { federal, regional } = getTaxConfig(country, jurisdictionId, year)
  const tax = computeCombinedTax({
    grossIncome: annualGross,
    pretaxDeductions: pretax,
    filingStatus,
    federal,
    regional,
    useStandardDeduction: country === 'US',
  })
  const payroll = computePayroll(country, annualGross - pretax, {
    filingStatus,
    jurisdictionId,
  })

  const estimatedNetAnnual = round2(annualGross - pretax - tax.totalTax - payroll.total)
  const waterfall = [
    { label: 'Gross', amount: annualGross },
    { label: 'Federal tax', amount: -tax.federalTax },
    { label: 'State / provincial tax', amount: -tax.regionalTax },
    { label: 'Payroll contributions', amount: -payroll.total },
    ...(pretax > 0 ? [{ label: 'Pretax deductions', amount: -pretax }] : []),
    { label: 'Estimated net', amount: estimatedNetAnnual },
  ]

  return {
    mode: 'take-home',
    annualGross,
    convertedAmount: round2(fromAnnual(estimatedNetAnnual, input.toFrequency, hours, weeks)),
    equivalents: Object.fromEntries(
      FREQUENCIES.map((f) => [f, round2(fromAnnual(estimatedNetAnnual, f, hours, weeks))]),
    ) as Record<PayFrequency, number>,
    estimatedNetAnnual,
    federalTax: tax.federalTax,
    regionalTax: tax.regionalTax,
    payrollTotal: payroll.total,
    payrollLabels: payroll.labels,
    pretaxDeductions: pretax,
    waterfall,
    taxConfigVersion: TAX_CONFIG_VERSION,
  }
}

export function explainSalary(input: SalaryInput, result: SalaryResult): CalculationExplanation {
  if (input.mode === 'conversion') {
    return {
      title: 'Salary conversion',
      steps: [
        {
          label: 'Annualize',
          expression: `Annual = amount × periods per year`,
          result: `$${result.annualGross.toFixed(2)}`,
        },
        {
          label: 'Convert',
          result: `$${result.convertedAmount.toFixed(2)} per ${input.toFrequency}`,
        },
      ],
    }
  }
  return {
    title: 'Estimated take-home pay',
    steps: [
      { label: 'Annual gross', result: `$${result.annualGross.toFixed(2)}` },
      { label: 'Federal tax', result: `$${(result.federalTax ?? 0).toFixed(2)}` },
      { label: 'Regional tax', result: `$${(result.regionalTax ?? 0).toFixed(2)}` },
      { label: 'Payroll', result: `$${(result.payrollTotal ?? 0).toFixed(2)}` },
      {
        label: 'Estimated net (annual)',
        result: `$${(result.estimatedNetAnnual ?? 0).toFixed(2)}`,
      },
    ],
    assumptions: [
      `Tax year ${input.taxYear ?? 2026}. This is an estimated take-home calculation, not a tax return.`,
      'Payroll withholding and annual tax liability can differ.',
      ...(input.country === 'CA' && input.jurisdictionId === 'quebec'
        ? ['Quebec uses QPP/QPIP instead of CPP/EI.']
        : []),
    ],
  }
}

export function buildSalaryCharts(result: SalaryResult): ChartData[] {
  if (!result.waterfall) return []
  const parts = result.waterfall.filter((w) => w.label !== 'Gross' && w.label !== 'Estimated net')
  const series = [
    ...parts.map((p, i) => ({
      name: p.label,
      data: [{ x: 'Annual', y: Math.abs(p.amount) }],
      color: ['#163B8C', '#4A7FD4', '#8A94A6', '#C07850'][i % 4],
    })),
    {
      name: 'Estimated net',
      data: [{ x: 'Annual', y: result.estimatedNetAnnual ?? 0 }],
      color: '#6B8F71',
    },
  ]
  return [
    {
      type: 'bar',
      title: 'Gross composition (annual)',
      stacked: true,
      valueFormat: 'currency',
      series,
    },
  ]
}

export function buildSalaryTable(result: SalaryResult): TableData {
  const rows = Object.entries(result.equivalents).map(([freq, amount]) => ({
    frequency: freq,
    amount,
  }))
  return {
    title: result.mode === 'take-home' ? 'Estimated net by pay frequency' : 'Gross by pay frequency',
    columns: [
      { key: 'frequency', label: 'Frequency', align: 'left' },
      { key: 'amount', label: 'Amount', align: 'right', format: 'currency' },
    ],
    rows,
  }
}
