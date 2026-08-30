import { convertPurchasingPower, getAvailableYears, getCpi } from '@/data/cpi/us-cpi-u'
import type { CalculationExplanation, ChartData, TableData } from '@/calculators/types'
import type { InflationInput, InflationResult } from './types'

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function calculateInflation(input: InflationInput): InflationResult {
  if (input.mode === 'historical') {
    const baseYear = input.baseYear!
    const targetYear = input.targetYear!
    const { equivalent, baseCpi, targetCpi, percentChange } = convertPurchasingPower(
      input.amount,
      baseYear,
      targetYear,
    )
    const years = getAvailableYears().filter((y) => y >= Math.min(baseYear, targetYear) && y <= Math.max(baseYear, targetYear))
    const schedule = years.map((year) => {
      const cpi = getCpi(year)!
      return {
        year,
        value: round2((input.amount * cpi) / baseCpi),
        label: 'Equivalent',
      }
    })
    return {
      mode: 'historical',
      primaryAmount: equivalent,
      percentChange,
      purchasingPowerReduction: round2(100 - (baseCpi / targetCpi) * 100),
      baseCpi,
      targetCpi,
      schedule,
    }
  }

  const rate = (input.inflationRate ?? 0) / 100
  const years = input.durationYears!
  const futurePrice = round2(input.amount * Math.pow(1 + rate, years))
  const realValue = round2(input.amount / Math.pow(1 + rate, years))
  const percentChange = round2(((futurePrice - input.amount) / input.amount) * 100)
  const schedule: InflationResult['schedule'] = []
  for (let t = 0; t <= years; t++) {
    schedule.push({
      year: t,
      value: round2(input.amount * Math.pow(1 + rate, t)),
      realValue: round2(input.amount / Math.pow(1 + rate, t)),
      label: 'Future price',
    })
  }
  return {
    mode: 'projection',
    primaryAmount: futurePrice,
    percentChange,
    futurePrice,
    realValue,
    purchasingPowerReduction: round2(100 - (realValue / input.amount) * 100),
    schedule,
  }
}

export function explainInflation(input: InflationInput, result: InflationResult): CalculationExplanation {
  if (input.mode === 'historical') {
    return {
      title: 'Historical purchasing power',
      steps: [
        {
          label: 'Index ratio',
          expression: 'Equivalent = Amount × CPI_target / CPI_base',
          result: `$${result.primaryAmount.toFixed(2)}`,
        },
        {
          label: 'CPI values',
          result: `Base ${result.baseCpi}, Target ${result.targetCpi}`,
        },
        {
          label: 'Percent change',
          result: `${result.percentChange.toFixed(2)}%`,
        },
      ],
      assumptions: [
        'US CPI-U annual averages (BLS series CUUR0000SA0), embedded locally. Geography: United States.',
        'Historical years run through the latest published BLS annual average. Incomplete calendar years are not treated as annual averages.',
      ],
    }
  }
  return {
    title: 'Future inflation projection',
    steps: [
      {
        label: 'Future price',
        expression: 'FuturePrice = Amount × (1 + π)^t',
        result: `$${result.futurePrice!.toFixed(2)}`,
      },
      {
        label: 'Purchasing power',
        expression: 'RealValue = Amount / (1 + π)^t',
        result: `$${result.realValue!.toFixed(2)}`,
      },
    ],
    assumptions: [
      'Future inflation is an assumption, not a forecast.',
      `Assumed annual inflation rate: ${input.inflationRate}%`,
    ],
  }
}

export function buildInflationCharts(result: InflationResult): ChartData[] {
  if (result.mode === 'projection') {
    return [
      {
        type: 'line',
        title: 'Projected price level and purchasing power',
        valueFormat: 'currency',
        series: [
          {
            name: 'Future price',
            data: result.schedule.map((s) => ({ x: s.year, y: s.value })),
            color: '#163B8C',
          },
          {
            name: 'Purchasing power',
            data: result.schedule.map((s) => ({ x: s.year, y: s.realValue ?? 0 })),
            color: '#4A7FD4',
          },
        ],
      },
    ]
  }
  return [
    {
      type: 'line',
      title: 'Purchasing power over time',
      valueFormat: 'currency',
      series: [
        {
          name: 'Equivalent value',
          data: result.schedule.map((s) => ({ x: s.year, y: s.value })),
          color: '#163B8C',
        },
      ],
    },
  ]
}

export function buildInflationTable(result: InflationResult): TableData {
  return {
    title: 'Year-by-year',
    columns: [
      { key: 'year', label: result.mode === 'historical' ? 'Year' : 'Year offset', align: 'right' },
      { key: 'value', label: 'Value', align: 'right', format: 'currency' },
    ],
    rows: result.schedule.map((s) => ({ year: s.year, value: s.value })),
  }
}
