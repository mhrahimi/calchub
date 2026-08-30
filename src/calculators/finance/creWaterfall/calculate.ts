import { irr, moic } from '@/utils/irr'
import type { CreWaterfallInput, CreWaterfallResult, CreWaterfallTier } from './types'
import type { CalculationExplanation, ChartData, TableData } from '@/calculators/types'

export function calculateCreWaterfall(input: CreWaterfallInput): CreWaterfallResult {
  let remaining = input.totalDistribution
  const tiers: CreWaterfallTier[] = []
  const totalCapital = input.lpContribution + input.gpContribution
  const lpShare = input.lpContribution / totalCapital
  const gpShare = input.gpContribution / totalCapital

  const rocLp = Math.min(remaining * lpShare, input.lpContribution)
  const rocGp = Math.min(remaining * gpShare, input.gpContribution)
  const rocTotal = Math.min(remaining, totalCapital)
  if (rocTotal > 0) {
    tiers.push({ tier: 'Return of capital', lpAmount: rocLp, gpAmount: rocGp, total: rocTotal })
    remaining -= rocTotal
  }

  const prefTarget = input.lpContribution * (input.preferredReturnPercent / 100)
  const prefLp = Math.min(remaining, prefTarget)
  const prefGp = 0
  if (prefLp > 0) {
    tiers.push({ tier: 'Preferred return (LP)', lpAmount: prefLp, gpAmount: prefGp, total: prefLp })
    remaining -= prefLp
  }

  if (remaining > 0 && input.catchUpPercent > 0) {
    const catchUpTarget = (prefLp + rocGp) * (input.catchUpPercent / 100) / (1 - input.catchUpPercent / 100)
    const catchUpGp = Math.min(remaining, catchUpTarget)
    if (catchUpGp > 0) {
      tiers.push({ tier: 'GP catch-up', lpAmount: 0, gpAmount: catchUpGp, total: catchUpGp })
      remaining -= catchUpGp
    }
  }

  if (remaining > 0) {
    const lpPct = input.lpPromotePercent / 100
    const lpAmt = remaining * lpPct
    const gpAmt = remaining - lpAmt
    tiers.push({ tier: 'Promote / residual', lpAmount: lpAmt, gpAmount: gpAmt, total: remaining })
    remaining = 0
  }

  const lpTotal = tiers.reduce((s, t) => s + t.lpAmount, 0)
  const gpTotal = tiers.reduce((s, t) => s + t.gpAmount, 0)

  const lpFlows = [-input.lpContribution, lpTotal]
  const gpFlows = [-input.gpContribution, gpTotal]
  const lpIrrVal = irr(lpFlows)
  const gpIrrVal = irr(gpFlows)

  return {
    tiers,
    lpTotal,
    gpTotal,
    lpIrr: lpIrrVal,
    gpIrr: gpIrrVal,
    lpMoic: moic(lpTotal, input.lpContribution),
    gpMoic: moic(gpTotal, input.gpContribution),
  }
}

export function explainCreWaterfall(_input: CreWaterfallInput, _result: CreWaterfallResult): CalculationExplanation {
  return {
    title: 'CRE waterfall',
    steps: [
      { label: 'Tier order', result: 'ROC → Pref → Catch-up → Promote' },
    ],
    assumptions: [
      'Waterfall structures vary by agreement; this is a simplified illustrative model',
      'Preferred return is simple (non-compounding) on LP capital',
      'Catch-up allocates to GP until target promote split is reached',
    ],
  }
}

export function buildCreWaterfallCharts(result: CreWaterfallResult): ChartData[] {
  return [{
    type: 'bar',
    title: 'Distribution by tier',
    valueFormat: 'currency',
    series: [
      { name: 'LP', data: result.tiers.map((t) => ({ x: t.tier, y: t.lpAmount })), color: '#163B8C' },
      { name: 'GP', data: result.tiers.map((t) => ({ x: t.tier, y: t.gpAmount })), color: '#64748B' },
    ],
  }]
}

export function buildCreWaterfallTable(result: CreWaterfallResult): TableData {
  return {
    title: 'Waterfall tiers',
    columns: [
      { key: 'tier', label: 'Tier', align: 'left' },
      { key: 'lpAmount', label: 'LP', align: 'right', format: 'currency' },
      { key: 'gpAmount', label: 'GP', align: 'right', format: 'currency' },
      { key: 'total', label: 'Total', align: 'right', format: 'currency' },
    ],
    rows: result.tiers.map((t) => ({
      tier: t.tier,
      lpAmount: Math.round(t.lpAmount * 100) / 100,
      gpAmount: Math.round(t.gpAmount * 100) / 100,
      total: Math.round(t.total * 100) / 100,
    })),
  }
}
