import type { CapTableInput, CapTableResult } from './types'
import type { CalculationExplanation, ChartData, TableData } from '@/calculators/types'

export function calculateCapTable(input: CapTableInput): CapTableResult {
  const preMoneyFds = input.holders.reduce((sum, h) => sum + h.shares, 0)
  const postMoney = input.preMoneyValuation + input.investmentAmount
  const poolPct = input.optionPoolTopUpPercent / 100

  const existingPool = input.holders.filter(h => h.type === 'unallocated').reduce((s,h) => s+h.shares,0)
  const financingFactor = 1 + input.investmentAmount / input.preMoneyValuation
  if (!Number.isFinite(financingFactor) || input.preMoneyValuation <= 0 || input.investmentAmount < 0 || preMoneyFds <= 0 || !Number.isFinite(poolPct) || poolPct < 0 || poolPct * financingFactor >= 1 || input.holders.some(h => !Number.isFinite(h.shares) || h.shares < 0)) throw new Error('Invalid or infeasible post-money option pool target')
  const optionPoolShares = Math.max(0, (poolPct * financingFactor * preMoneyFds - existingPool) / (1 - poolPct * financingFactor))
  const preMoneyWithPool = preMoneyFds + optionPoolShares
  const pricePerShare = input.preMoneyValuation / preMoneyWithPool
  const newInvestorShares = input.investmentAmount / pricePerShare
  const postMoneyFds = preMoneyWithPool + newInvestorShares

  const allHolders = [
    ...input.holders,
    ...(optionPoolShares > 0
      ? [{ id: '__pool__', name: 'Option pool (new)', type: 'unallocated' as const, shares: optionPoolShares }]
      : []),
    { id: '__investor__', name: 'New investor', type: 'common' as const, shares: newInvestorShares },
  ]

  const holders = allHolders.map((h) => {
    const preOwnership = !['__pool__', '__investor__'].includes(h.id) && preMoneyFds > 0 ? (h.shares / preMoneyFds) * 100 : 0
    const postOwnership = (h.shares / postMoneyFds) * 100
    return {
      id: h.id,
      name: h.name,
      type: h.type,
      shares: h.shares,
      preOwnership: preOwnership,
      postOwnership: postOwnership,
      dilution: preOwnership - postOwnership,
    }
  })

  return {
    holders,
    ownershipTotal: holders.reduce((s,h) => s+h.postOwnership,0),
    availablePoolPercent: (existingPool + optionPoolShares) / postMoneyFds * 100,
    preMoneyFds,
    postMoneyFds,
    pricePerShare,
    newInvestorShares,
    optionPoolShares,
    postMoneyValuation: postMoney,
  }
}

export function explainCapTable(input: CapTableInput, _result: CapTableResult): CalculationExplanation {
  return {
    title: 'Cap table round',
    steps: [
      {
        label: 'Option pool',
        expression: `Pool top-up is added pre-money so the post-round pool is about ${input.optionPoolTopUpPercent}%`,
      },
      {
        label: 'Price per share',
        expression: 'PPS = pre-money / (fully diluted shares + pool top-up)',
      },
      {
        label: 'New shares',
        expression: 'New investor shares = investment / PPS',
      },
      {
        label: 'Post-money',
        expression: 'Post-money = pre-money + investment',
      },
    ],
    assumptions: [
      'Granted options count as issued; only unallocated shares count toward the available pool target.',
      'Fractional shares are retained to reconcile ownership; an existing pool above target is not reduced.',
      'Legacy options holders are treated as granted options; mark available pools as unallocated.',
      'Instrument-specific SAFE/convertible rules vary and are not modeled here',
    ],
  }
}

export function buildCapTableCharts(result: CapTableResult): ChartData[] {
  const colors = ['#163B8C', '#4A7FD4', '#8A94A6', '#102A66', '#6B8F71', '#C07850', '#7A6B9A']
  return [{
    type: 'bar',
    title: 'Ownership before and after the round',
    stacked: true,
    valueFormat: 'percent',
    series: result.holders.map((h, i) => ({
      name: h.name,
      color: colors[i % colors.length],
      data: [
        { x: 'Pre-round', y: h.id === '__investor__' ? 0 : h.preOwnership },
        { x: 'Post-round', y: h.postOwnership },
      ],
    })),
  }]
}

export function buildCapTableTable(result: CapTableResult): TableData {
  return {
    title: 'Cap table',
    columns: [
      { key: 'name', label: 'Holder', align: 'left' },
      { key: 'shares', label: 'Shares', align: 'right' },
      { key: 'preOwnership', label: 'Pre (%)', align: 'right' },
      { key: 'postOwnership', label: 'Post (%)', align: 'right' },
      { key: 'dilution', label: 'Dilution (pp)', align: 'right' },
    ],
    rows: result.holders.map((h) => ({
      name: h.name,
      shares: h.shares,
      preOwnership: h.preOwnership,
      postOwnership: h.postOwnership,
      dilution: h.dilution,
    })),
  }
}
