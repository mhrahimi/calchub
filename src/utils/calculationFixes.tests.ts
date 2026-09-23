import { describe, it, expect } from 'vitest'
import { buildAmortizationSchedule } from './amortization'
import { calendarDate, eventDate, dateText } from './cashFlowDates'
import { solveRoot, findRateResult, solveLoanRateResult } from './rootSolve'
import { convertBase } from './baseConvert'
import { solveYtm } from './bonds'
import { calculateCapTable } from '@/calculators/finance/capTable/calculate'
import { calculateCompoundInterest } from '@/calculators/finance/compoundInterest/calculate'
import { calculateDcf } from '@/calculators/finance/dcf/calculate'
import { calculateLbo } from '@/calculators/finance/lbo/calculate'
import { calculateIncomeTax } from '@/calculators/tax/incomeTax/calculate'
import { calculateSavingsGoal } from '@/calculators/finance/savingsGoal/calculate'
import { calculateCreWaterfall } from '@/calculators/finance/creWaterfall/calculate'
import { buildLiveExportPayload, buildExportPayloadFromRecord } from '@/exports/buildPayload'
import { payloadToCsv } from '@/exports/recordCsv'

describe('calculation integrity regressions',()=>{
  it('caps final extras and reconciles every cash event',()=>{
    const r=buildAmortizationSchedule({principal:1000,ratePerPeriod:0.01,periods:12,extraPayment:400})
    let previous=1000
    for(const row of r.schedule){
      expect(row.payment).toBeCloseTo(row.principal+row.extraPrincipal+row.interest,2)
      expect(previous-row.balance).toBeCloseTo(row.principal+row.extraPrincipal,2)
      previous=row.balance
    }
    expect(r.remainingBalance).toBe(0)
    expect(r.totalPayments).toBeCloseTo(1000+r.totalInterest,2)
    expect(r.schedule.length).toBeLessThan(12)
  })
  it('pays a separate balloon at maturity and stops',()=>{
    const r=buildAmortizationSchedule({principal:1200,ratePerPeriod:0,periods:12,balloon:600})
    expect(r.payment).toBe(50); expect(r.balloonPaid).toBe(600)
    expect(r.schedule.at(-1)?.event).toBe('balloon')
    expect(r.payoffPeriod).toBe(12); expect(r.totalPayments).toBe(1200)
  })
  it('stops under-amortizing payments at the requested term',()=>{
    const r=buildAmortizationSchedule({principal:1000,ratePerPeriod:0.1,periods:2,payment:50})
    expect(r.status).toBe('negative_amortization');expect(r.remainingBalance).toBe(1105)
    expect(r.schedule.length).toBe(2)
  })
  it('uses weekly and biweekly dates, not months',()=>{
    for(const [frequency,days] of [['weekly',7],['bi-weekly',14]] as const){
      const r=buildAmortizationSchedule({principal:1000,ratePerPeriod:0,periods:3,paymentFrequency:frequency,startDate:calendarDate('2026-01-01')})
      expect(r.schedule[1].date).toBe(`2026-01-${String(1+days).padStart(2,'0')}`)
    }
  })
  it('keeps month-end anniversaries through leap February',()=>{
    const a=calendarDate('2024-01-31')
    expect(dateText(eventDate(a,1))).toBe('2024-02-29')
    expect(dateText(eventDate(a,2))).toBe('2024-03-31')
  })
  it('posts annual extras on calendar anniversaries for weekly loans',()=>{
    const r=buildAmortizationSchedule({principal:100000,ratePerPeriod:0,periods:104,paymentFrequency:'weekly',startDate:calendarDate('2026-01-08'),extraPayment:100,extraFrequency:'yearly'})
    expect(r.schedule.filter(x=>x.event==='extra').map(x=>x.date)).toEqual(['2027-01-01'])
  })
  it('supports separately dated extras and rate changes',()=>{
    const r=buildAmortizationSchedule({principal:1000,ratePerPeriod:0,periods:3,startDate:calendarDate('2026-02-01'),extraPayments:[{date:'2026-01-15',amount:100}],rateChanges:[{date:'2026-02-15',ratePerPeriod:0.01}]})
    expect(r.schedule.some(x=>x.date==='2026-01-15'&&x.event==='extra')).toBe(true)
    expect(r.schedule.some(x=>x.event==='rate_change')).toBe(true)
    expect(r.totalInterest).toBeGreaterThan(0)
  })
  it('distinguishes invalid, unbracketed and unconverged roots',()=>{
    expect(solveRoot(x=>x*x+1,-1,1).status).toBe('no_solution')
    expect(solveRoot(()=>NaN,0,1).status).toBe('invalid_domain')
    expect(solveRoot(x=>x*x-2,0,2,1e-20,1).status).toBe('max_iterations')
  })
  it('solves endpoint, zero and negative rates',()=>{
    expect(solveRoot(x=>x,0,1).value).toBe(0)
    expect(solveLoanRateResult(1200,100,12).value).toBe(0)
    expect(findRateResult(x=>x+0.05).value).toBeCloseTo(-0.05,8)
    expect(solveYtm(1000,0,1,1100,1)).toBeCloseTo(-1/11,8)
  })
  it('converts fractional digits using exact place values and marks repeats',()=>{
    expect(convertBase('0.12',10,10).targetValue).toBe('0.12')
    expect(convertBase('0.01',2,10).targetValue).toBe('0.25')
    expect(convertBase('0.1',3,10).repeating).toBe(true)
    expect(convertBase('0.1',3,10).truncated).toBe(true)
    const binary=convertBase('-12.375',10,2).targetValue
    expect(convertBase(binary,2,10).targetValue).toBe('-12.375')
  })
  it('solves financing dilution with an existing available pool',()=>{
    const r=calculateCapTable({holders:[{id:'f',name:'Founder',type:'common',shares:800},{id:'g',name:'Granted',type:'options',shares:100},{id:'u',name:'Available',type:'unallocated',shares:100}],preMoneyValuation:8000,investmentAmount:2000,optionPoolTopUpPercent:15})
    expect(r.availablePoolPercent).toBeCloseTo(15,10)
    expect(r.holders.find(x=>x.id==='__investor__')?.postOwnership).toBeCloseTo(20,10)
    expect(r.ownershipTotal).toBeCloseTo(100,10)
    expect(r.holders.reduce((s,h)=>s+h.preOwnership,0)).toBeCloseTo(100,10)
  })
  it('rejects infeasible pool targets',()=>{
    expect(()=>calculateCapTable({holders:[{id:'f',name:'Founder',type:'common',shares:100}],preMoneyValuation:100,investmentAmount:100,optionPoolTopUpPercent:60})).toThrow(/infeasible/)
  })
  const compound={principal:0,interestRate:12,duration:1,durationUnit:'years' as const,compoundingFrequency:'annual',contribution:100,contributionFrequency:'monthly',contributionTiming:'end' as const,continuous:false,adjustForInflation:false,inflationRate:0}
  it('posts monthly contributions individually under annual compounding',()=>{
    const r=calculateCompoundInterest(compound)
    const start=calendarDate('2026-01-01').getTime(),end=calendarDate('2027-01-01').getTime()
    const expected=Array.from({length:12},(_,i)=>100*1.12**((end-eventDate(calendarDate('2026-01-01'),i+1).getTime())/(end-start))).reduce((a,b)=>a+b,0)
    expect(r.finalBalance).toBeCloseTo(expected,2);expect(r.totalContributions).toBe(1200)
    expect(r.schedule[0].date).toBe('2026-02-01')
    expect(calculateCompoundInterest({...compound,contributionTiming:'begin'}).finalBalance).toBeGreaterThan(r.finalBalance)
  })
  it('does not prorate a partial contribution interval',()=>{
    const r=calculateCompoundInterest({...compound,interestRate:0,duration:1.5,durationUnit:'months'})
    expect(r.totalContributions).toBe(100)
  })
  const dcf={forecast:[{revenue:100,ebitdaMargin:30,depreciation:10,taxRate:25,capexPercent:5,nwcPercent:10},{revenue:110,ebitdaMargin:30,depreciation:10,taxRate:25,capexPercent:5,nwcPercent:20}],baseNwc:9,wacc:10,terminalGrowth:2,terminalMethod:'gordon' as const,exitMultiple:8,netDebt:50,cash:10}
  it('uses EBIT taxes, opening NWC and net debt exactly once',()=>{
    const r=calculateDcf(dcf)
    expect(r.fcfByYear[0].fcf).toBe(19)
    expect(r.fcfByYear[1].nwcChange).toBe(12)
    expect(r.equityValue).toBe(r.enterpriseValue-50)
    expect(calculateDcf({...dcf,grossDebt:60}).equityValue).toBe(r.equityValue)
  })
  it('uses exit-multiple sensitivity for exit-multiple valuation',()=>{
    const r=calculateDcf({...dcf,terminalMethod:'exitMultiple'})
    expect(r.sensitivity.find(x=>x.wacc===10&&x.growth===8)?.ev).toBe(r.enterpriseValue)
  })
  const lbo={purchaseEv:100,sponsorEquity:50,initialDebt:50,interestRate:0,forecast:[{ebitda:100,capex:0,nwcChange:0}],exitMultiple:1,exitYear:1}
  it('retains surplus cash and caps debt paydown',()=>{
    const r=calculateLbo(lbo)
    expect(r.debtSchedule[0].paydown).toBe(50);expect(r.exitCash).toBe(50);expect(r.exitEquity).toBe(150)
  })
  it('requires balanced sources and uses',()=>{expect(()=>calculateLbo({...lbo,transactionFees:1})).toThrow(/balance/)})
  it('flags deficits rather than silently borrowing',()=>{
    const r=calculateLbo({...lbo,forecast:[{ebitda:0,capex:10,nwcChange:0}]})
    expect(r.status).toBe('funding_shortfall');expect(r.debtSchedule[0].endingDebt).toBe(50);expect(r.irr).toBeNull()
  })
  it('pays tranches in priority order and includes cash taxes',()=>{
    const r=calculateLbo({...lbo,debtTranches:[{name:'Senior',amount:20,interestRate:10,mandatoryAmortizationPercent:10},{name:'Junior',amount:30,interestRate:10,mandatoryAmortizationPercent:0}],forecast:[{ebitda:40,taxRate:20,depreciation:5,capex:0,nwcChange:0}]})
    expect(r.debtSchedule[0].cashTaxes).toBe(6)
    expect(r.debtSchedule[0].trancheBalances).toEqual([0,21])
  })
  it('clearly scopes tax results and keeps state and federal bases separate',()=>{
    const r=calculateIncomeTax({country:'US',taxYear:2026,jurisdictionId:'california',filingStatus:'single',grossIncome:100000,pretaxDeductions:0,useStandardDeduction:true})
    expect(r.regionalTaxableIncome).toBeGreaterThan(r.taxableIncome)
    expect(r.coverage.status).toBe('approximate');expect(r.coverage.sourceDate).toBeNull()
  })
  it('does not return zero time for an unreachable goal',()=>{
    expect(()=>calculateSavingsGoal({solveFor:'time',goalAmount:100,currentSavings:0,returnRate:0,period:1,periodUnit:'years',contributionFrequency:'monthly',periodicContribution:0})).toThrow(/cannot be reached/)
  })
  it('excludes returned GP capital from profit catch-up',()=>{
    const r=calculateCreWaterfall({lpContribution:80,gpContribution:20,totalDistribution:120,preferredReturnPercent:10,catchUpPercent:20,lpPromotePercent:80})
    expect(r.tiers.find(x=>x.tier==='GP catch-up')?.gpAmount).toBe(2)
    expect(r.lpTotal+r.gpTotal).toBe(120)
  })
  it('selects explicit primary metrics and exports complete inputs and metadata',async()=>{
    const payload=buildLiveExportPayload({calculatorId:'dcf',inputs:dcf,results:calculateDcf(dcf),explain:()=>({title:'DCF',steps:[],assumptions:['Test convention']})})
    expect(payload.resultsSummary.find(x=>x.primary)?.label).toBe('Enterprise value')
    expect(payloadToCsv(payload)).toContain('modelVersion')
    expect(payload.inputs.forecast).toContain('depreciation')
    const legacy=await buildExportPayloadFromRecord({calculatorId:'dcf',inputs:dcf,results:calculateDcf(dcf),createdAt:'2026-01-01'})
    expect(legacy.metadata?.status).toBe('legacy')
  })
})
