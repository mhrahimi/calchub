import { irr, moic } from '@/utils/irr'
import type { LboInput, LboResult, LboDebtRow } from './types'
import type { CalculationExplanation, ChartData, TableData } from '@/calculators/types'

export function calculateLbo(input: LboInput): LboResult {
  if (Object.values(input).some(v => typeof v === 'number' && !Number.isFinite(v)) || input.forecast.some(y => Object.values(y).some(v => !Number.isFinite(v)))) throw new Error('Model inputs must be finite')
  if (input.forecast.some(y => (y.taxRate ?? 0) < 0 || (y.taxRate ?? 0) > 100 || (y.depreciation ?? 0) < 0)) throw new Error('Invalid cash tax rate or depreciation')
  const fees = input.transactionFees ?? 0, minimumCash = input.minimumCash ?? 0
  const tranches = input.debtTranches ?? [{ name: 'Debt', amount: input.initialDebt, interestRate: input.interestRate, mandatoryAmortizationPercent: 0 }]
  const sourcesTotal = input.sponsorEquity + tranches.reduce((s,t) => s+t.amount,0)
  const usesTotal = input.purchaseEv + fees + minimumCash
  if (Math.abs(sourcesTotal - usesTotal) > 0.01) throw new Error('Sources and uses must balance: equity plus debt must equal purchase EV, fees and minimum cash.')
  if (input.sponsorEquity <= 0 || fees < 0 || minimumCash < 0 || !Number.isInteger(input.exitYear) || input.exitYear < 1 || input.exitYear > input.forecast.length || tranches.some(t => t.amount < 0 || t.interestRate < 0 || t.mandatoryAmortizationPercent < 0 || t.mandatoryAmortizationPercent > 100)) throw new Error('Invalid LBO financing inputs')
  const sweep = (input.cashSweepPercent ?? 100) / 100
  if (sweep < 0 || sweep > 1) throw new Error('Cash sweep must be between 0 and 100%')
  const balances = tranches.map(t => t.amount)
  let cash = minimumCash
  const schedule: LboDebtRow[] = []
  const warnings: string[] = []
  for (let i = 0; i < input.exitYear; i++) {
    const y = input.forecast[i]
    const interest = balances.reduce((s,b,j) => s+b*tranches[j].interestRate/100,0)
    const cashTaxes = Math.max(0, y.ebitda - (y.depreciation ?? 0) - interest) * (y.taxRate ?? 0) / 100
    const fcf = y.ebitda - cashTaxes - y.capex - y.nwcChange
    cash += fcf - interest
    let fundingShortfall = Math.max(0, minimumCash - cash)
    let paydown = 0
    for (let j=0;j<balances.length;j++) {
      const mandatory = Math.min(balances[j], tranches[j].amount * tranches[j].mandatoryAmortizationPercent / 100)
      const paid = Math.min(mandatory, Math.max(0,cash-minimumCash))
      balances[j] -= paid; cash -= paid; paydown += paid
      fundingShortfall += mandatory-paid
    }
    let sweepCash = Math.max(0,cash-minimumCash)*sweep
    for (let j=0;j<balances.length;j++) {
      const paid = Math.min(balances[j],sweepCash)
      balances[j]-=paid; cash-=paid; paydown+=paid; sweepCash-=paid
    }
    if(fundingShortfall>0) warnings.push(`Year ${i+1}: funding shortfall ${fundingShortfall.toFixed(2)}; no automatic debt draw assumed.`)
    schedule.push({year:i+1,ebitda:y.ebitda,fcf,interest,paydown,endingDebt:balances.reduce((s,b)=>s+b,0),endingCash:cash,cashTaxes,fundingShortfall,trancheBalances:[...balances]})
  }

  const exitIdx = input.exitYear - 1
  const exitEbitda = input.forecast[exitIdx].ebitda
  const exitEv = exitEbitda * input.exitMultiple
  const exitDebt = schedule[exitIdx].endingDebt
  const exitCash = schedule[exitIdx].endingCash
  const exitEquity = exitEv - exitDebt + exitCash
  const moicVal = moic(exitEquity, input.sponsorEquity)
  const flows = [-input.sponsorEquity]
  for (let i = 0; i < input.exitYear - 1; i++) flows.push(0)
  flows.push(exitEquity)
  const irrVal = irr(flows)

  const sourcesUses = [
    { item: 'Sponsor equity', amount: input.sponsorEquity },
    ...tranches.map(t => ({ item: t.name, amount: t.amount })),
    { item: 'Purchase EV', amount: input.purchaseEv },
    { item: 'Transaction fees', amount: fees },
    { item: 'Minimum cash', amount: minimumCash },
  ]

  return {
    status: warnings.length ? 'funding_shortfall' : 'success',
    warnings, exitCash, sourcesTotal, usesTotal,
    debtSchedule: schedule,
    exitEv,
    exitEquity,
    moic: moicVal,
    irr: warnings.length ? null : irrVal,
    sourcesUses,
  }
}

export function explainLbo(_input: LboInput, _result: LboResult): CalculationExplanation {
  return {
    title: 'LBO returns',
    steps: [
      {
        label: 'Cash sweep',
        expression: 'Cash pays interest, cash taxes, mandatory amortization, then optional sweep in tranche order',
      },
      {
        label: 'Exit',
        expression: 'Exit EV = exit EBITDA × exit multiple;  exit equity = exit EV − remaining debt + retained cash',
      },
      {
        label: 'MOIC',
        expression: 'MOIC = exit equity / sponsor equity',
      },
      {
        label: 'IRR',
        expression: 'IRR solves NPV(−equity, …, exit equity) = 0 over the hold period',
      },
    ],
    assumptions: [
      'Cash sweep applies excess FCF to debt paydown after interest',
      'Tranches repay in input order; interest uses opening balances. No automatic refinancing or revolver.',
      'Taxes and D&A default to zero if omitted. No loss carryforwards or interest deduction limits.',
      ..._result.warnings,
    ],
  }
}

export function buildLboCharts(result: LboResult): ChartData[] {
  return [{
    type: 'line',
    title: 'Debt paydown',
    valueFormat: 'currency',
    series: [{ name: 'Ending debt', data: result.debtSchedule.map((r) => ({ x: r.year, y: r.endingDebt })), color: '#163B8C' }],
    xLabel: 'Year',
    yLabel: 'Debt',
  }]
}

export function buildLboTable(result: LboResult): TableData {
  return {
    title: 'Debt schedule',
    columns: [
      { key: 'year', label: 'Year', align: 'right' },
      { key: 'ebitda', label: 'EBITDA', align: 'right', format: 'currency' },
      { key: 'fcf', label: 'FCF', align: 'right', format: 'currency' },
      { key: 'interest', label: 'Interest', align: 'right', format: 'currency' },
      { key: 'paydown', label: 'Paydown', align: 'right', format: 'currency' },
      ...['cashTaxes','endingCash','fundingShortfall'].map(key=>({key,label:({depreciation:'D&A',ebit:'EBIT',cashTaxes:'Cash taxes',capex:'Capex',nwcChange:'Change in NWC',endingCash:'Retained cash',fundingShortfall:'Funding shortfall'} as Record<string,string>)[key],align:'right' as const,format:'currency' as const})),
      { key: 'endingDebt', label: 'Ending debt', align: 'right', format: 'currency' },
    ],
    rows: result.debtSchedule.map((r) => ({
      year: r.year,
      ebitda: Math.round(r.ebitda),
      fcf: Math.round(r.fcf),
      interest: Math.round(r.interest),
      paydown: Math.round(r.paydown),
      cashTaxes:r.cashTaxes??0, endingCash:r.endingCash??0, fundingShortfall:r.fundingShortfall??0,
      endingDebt: Math.round(r.endingDebt),
    })),
  }
}
