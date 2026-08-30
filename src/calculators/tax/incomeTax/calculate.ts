import { getTaxConfig, TAX_CONFIG_VERSION } from '@/tax/registry'
import { computeCombinedTax } from '@/tax/engine/progressiveTax'
import type { CalculationExplanation, ChartData, TableData } from '@/calculators/types'
import type { IncomeTaxInput, IncomeTaxResult } from './types'

export function calculateIncomeTax(input: IncomeTaxInput): IncomeTaxResult {
  const { federal, regional } = getTaxConfig(
    input.country,
    input.jurisdictionId,
    input.taxYear,
  )
  const result = computeCombinedTax({
    grossIncome: input.grossIncome,
    pretaxDeductions: input.pretaxDeductions,
    useStandardDeduction: input.country === 'US' ? input.useStandardDeduction : false,
    filingStatus: input.filingStatus,
    federal,
    regional,
  })

  const notes: string[] = [
    `Tax year ${input.taxYear}. Estimated liability, not a filed return.`,
  ]
  if (federal.metadata?.notes) notes.push(...federal.metadata.notes)
  if (regional.metadata?.notes) notes.push(...regional.metadata.notes)

  return {
    ...result,
    taxConfigVersion: TAX_CONFIG_VERSION,
    notes,
  }
}

export function explainIncomeTax(input: IncomeTaxInput, result: IncomeTaxResult): CalculationExplanation {
  return {
    title: 'Income tax calculation',
    steps: [
      {
        label: 'Taxable income',
        expression:
          input.country === 'US'
            ? 'Taxable = max(0, Gross − pretax − standard deduction)'
            : 'Taxable = max(0, Gross − pretax deductions)',
        result: `$${result.taxableIncome.toFixed(2)}`,
      },
      {
        label: 'Federal tax (marginal brackets)',
        result: `$${result.federalTax.toFixed(2)}`,
      },
      {
        label: 'Regional tax',
        result: `$${result.regionalTax.toFixed(2)}`,
      },
      {
        label: 'Effective / marginal rates',
        result: `${(result.effectiveRate * 100).toFixed(2)}% effective, ${(result.marginalRate * 100).toFixed(2)}% marginal`,
      },
    ],
    assumptions: result.notes,
  }
}

export function buildIncomeTaxCharts(result: IncomeTaxResult): ChartData[] {
  return [
    {
      type: 'bar',
      title: 'Federal vs regional tax',
      valueFormat: 'currency',
      series: [
        {
          name: 'Tax',
          data: [
            { x: 'Federal', y: result.federalTax },
            { x: 'Regional', y: result.regionalTax },
          ],
          color: '#163B8C',
        },
      ],
    },
    {
      type: 'bar',
      title: 'Tax vs after-tax income',
      valueFormat: 'currency',
      series: [
        {
          name: 'Amount',
          data: [
            { x: 'Total tax', y: result.totalTax },
            { x: 'After-tax', y: result.afterTaxIncome },
          ],
          color: '#4A7FD4',
        },
      ],
    },
  ]
}

export function buildIncomeTaxTable(result: IncomeTaxResult): TableData {
  const rows = result.federalBreakdown.map((b) => ({
    layer: 'Federal',
    lower: b.lower,
    upper: b.upper === Infinity ? '∞' : b.upper,
    rate: b.rate,
    taxable: b.taxableInBracket,
    tax: b.taxInBracket,
  }))
  for (const b of result.regionalBreakdown) {
    rows.push({
      layer: 'Regional',
      lower: b.lower,
      upper: b.upper === Infinity ? '∞' : b.upper,
      rate: b.rate,
      taxable: b.taxableInBracket,
      tax: b.taxInBracket,
    })
  }
  return {
    title: 'Marginal bracket table',
    columns: [
      { key: 'layer', label: 'Layer', align: 'left' },
      { key: 'lower', label: 'Lower', align: 'right', format: 'currency' },
      { key: 'upper', label: 'Upper', align: 'right' },
      { key: 'rate', label: 'Rate', align: 'right', format: 'percent' },
      { key: 'taxable', label: 'Taxed in bracket', align: 'right', format: 'currency' },
      { key: 'tax', label: 'Tax', align: 'right', format: 'currency' },
    ],
    rows,
  }
}
