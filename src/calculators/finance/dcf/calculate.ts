import { presentValue } from '@/utils/npv'
import type { DcfInput, DcfResult } from './types'
import type { CalculationExplanation, ChartData, TableData } from '@/calculators/types'

function computeDcf(input: DcfInput): Omit<DcfResult, 'sensitivity'> {
  const wacc = input.wacc / 100
  const g = input.terminalGrowth / 100
  const fcfByYear = input.forecast.map((y, i) => {
    const ebitda = y.revenue * (y.ebitdaMargin / 100)
    const taxes = ebitda * (y.taxRate / 100)
    const nopat = ebitda - taxes
    const capex = y.revenue * (y.capexPercent / 100)
    const nwcChange = i === 0 ? y.revenue * (y.nwcPercent / 100) : (y.revenue - input.forecast[i - 1].revenue) * (y.nwcPercent / 100)
    const fcf = nopat - capex - nwcChange
    const pv = presentValue(fcf, wacc, i + 1)
    return { year: i + 1, revenue: y.revenue, ebitda, fcf, pv }
  })
  const pvFcf = fcfByYear.reduce((s, r) => s + r.pv, 0)
  const last = fcfByYear[fcfByYear.length - 1]
  const terminalValue =
    input.terminalMethod === 'gordon'
      ? (last.fcf * (1 + g)) / (wacc - g)
      : last.ebitda * input.exitMultiple
  const pvTerminalValue = presentValue(terminalValue, wacc, input.forecast.length)
  const enterpriseValue = pvFcf + pvTerminalValue
  const equityValue = enterpriseValue - input.netDebt + input.cash
  return { enterpriseValue, equityValue, terminalValue, pvTerminalValue, pvFcf, fcfByYear }
}

export function calculateDcf(input: DcfInput): DcfResult {
  const base = computeDcf(input)
  const sensitivity: Array<{ wacc: number; growth: number; ev: number }> = []
  for (let wi = -2; wi <= 2; wi++) {
    for (let gi = -1; gi <= 1; gi++) {
      const wacc = input.wacc + wi
      const growth = input.terminalGrowth + gi
      if (wacc <= growth) continue
      const r = computeDcf({ ...input, wacc, terminalGrowth: growth, terminalMethod: 'gordon' })
      sensitivity.push({ wacc, growth, ev: r.enterpriseValue })
    }
  }
  return { ...base, sensitivity }
}

export function explainDcf(input: DcfInput, _result: DcfResult): CalculationExplanation {
  return {
    title: 'DCF valuation',
    steps: [
      {
        label: 'Unlevered FCF',
        expression: 'UFCF = EBITDA − tax − capex − ΔNWC',
      },
      {
        label: 'Discounting',
        expression: 'PV_t = FCF_t / (1 + WACC)^t',
      },
      {
        label: 'Terminal value',
        expression:
          input.terminalMethod === 'gordon'
            ? `TV = FCF_n (1 + g) / (WACC − g)  with g = ${input.terminalGrowth}%`
            : `TV = EBITDA_n × ${input.exitMultiple}`,
      },
      {
        label: 'Equity value',
        expression: 'Equity = EV − net debt + cash,  EV = Σ PV(FCF) + PV(TV)',
      },
    ],
    assumptions: [
      'UFCF uses the forecast tax rate on EBITDA (no D&A / interest tax shield).',
    ],
  }
}

export function buildDcfCharts(result: DcfResult): ChartData[] {
  return [{
    type: 'bar',
    title: 'Unlevered free cash flow',
    valueFormat: 'currency',
    series: [{ name: 'FCF', data: result.fcfByYear.map((r) => ({ x: `Y${r.year}`, y: r.fcf })), color: '#163B8C' }],
  }]
}

export function buildDcfTable(result: DcfResult): TableData {
  return {
    title: 'DCF forecast',
    columns: [
      { key: 'year', label: 'Year', align: 'right' },
      { key: 'revenue', label: 'Revenue', align: 'right', format: 'currency' },
      { key: 'ebitda', label: 'EBITDA', align: 'right', format: 'currency' },
      { key: 'fcf', label: 'FCF', align: 'right', format: 'currency' },
      { key: 'pv', label: 'PV', align: 'right', format: 'currency' },
    ],
    rows: result.fcfByYear.map((r) => ({
      year: r.year,
      revenue: Math.round(r.revenue),
      ebitda: Math.round(r.ebitda),
      fcf: Math.round(r.fcf),
      pv: Math.round(r.pv),
    })),
  }
}

export function buildDcfSensitivityTable(result: DcfResult): TableData {
  return {
    title: 'WACC × terminal growth sensitivity (EV)',
    columns: [
      { key: 'wacc', label: 'WACC (%)', align: 'right' },
      { key: 'growth', label: 'Growth (%)', align: 'right' },
      { key: 'ev', label: 'EV', align: 'right', format: 'currency' },
    ],
    rows: result.sensitivity.map((s) => ({
      wacc: s.wacc,
      growth: s.growth,
      ev: Math.round(s.ev),
    })),
  }
}
