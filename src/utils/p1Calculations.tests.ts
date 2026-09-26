import { describe, it, expect } from 'vitest'
import { calculateMortgage, buildMortgageTable } from '@/calculators/finance/mortgage/calculate'
import { buildAmortizationSchedule } from './amortization'
import { calculateBonds,buildBondsCharts } from '@/calculators/finance/bonds/calculate'
import { calculateSavingsGoal,buildSavingsGoalTable } from '@/calculators/finance/savingsGoal/calculate'
import { calculateInvestment,buildInvestmentTable,buildInvestmentCharts } from '@/calculators/finance/investment/calculate'
import { calculateTrigonometry } from '@/calculators/math/trigonometry/calculate'
import { calculateInflation } from '@/calculators/finance/inflation/calculate'
import { calculateStandardDeviation,explainStandardDeviation } from '@/calculators/math/standardDeviation/calculate'
import { summarizeSchedule } from '@/exports/summarizeSchedule'

export const mortgageFixture = { country:'US' as const,homePrice:500000,downPayment:20,downPaymentIsPercent:true,interestRate:6.5,termYears:30,termMonths:0,includeTaxesAndCosts:false,propertyTax:0,propertyTaxPeriod:'annual' as const,homeInsurance:0,hoa:0,pmi:0,otherCosts:0,includeExtraPayments:false,startYear:2026,startMonth:9 }
describe('P1 calculation and schedule regressions',()=>{
  it('settles the mortgage final payment and conserves principal',()=>{
    const r=calculateMortgage(mortgageFixture)
    expect(r.principalAndInterest).toBe(2528.27)
    expect(r.finalPayment).toBe(2530.88)
    expect(r.remainingBalance).toBe(0)
    expect(r.status).toBe('success')
    expect(r.payoffDate).toBe('2056-08-01')
    expect(r.totalPrincipalPaid+r.remainingBalance).toBeCloseTo(400000,2)
    expect(r.schedule.reduce((sum,row)=>sum+row.payment,0)).toBeCloseTo(r.totalPayments,2)
    const annual=summarizeSchedule(buildMortgageTable(r),'mortgage',mortgageFixture)
    expect(annual.rows).toHaveLength(30)
    expect(annual.rows.at(-1)?.balance).toBe(0)
    expect(annual.rows.reduce((sum,row)=>sum+Number(row.principal)+Number(row.extraPrincipal),0)).toBeCloseTo(400000,2)
  })
  it('retains a genuine residual on an explicitly insufficient payment',()=>{
    const r=buildAmortizationSchedule({principal:1000,ratePerPeriod:0,periods:10,payment:50})
    expect(r.remainingBalance).toBe(500)
    expect(r.status).toBe('balance_due')
    expect(r.schedule.at(-1)?.payment).toBe(50)
  })
  it('rejects fractional coupon periods and reconciles valid discounted cash flows',()=>{
    const base={faceValue:1000,bondPrice:950,couponRate:5,couponFrequency:2 as const,periodsToMaturity:2.5}
    expect(()=>calculateBonds(base)).toThrow(/whole/)
    const r=calculateBonds({...base,periodsToMaturity:3})
    expect(r.cashFlows.at(-1)?.principal).toBe(1000)
    expect(r.cashFlows.reduce((sum,row)=>sum+row.pv,0)).toBeCloseTo(950,5)
    const negative=calculateBonds({...base,bondPrice:1100,couponRate:0,periodsToMaturity:4})
    expect(negative.ytm).toBeLessThan(0)
    expect(buildBondsCharts(negative)[0].series[0].data.some(p=>Number(p.x)<0)).toBe(true)
  })
  it('reaches the savings target at the second actual contribution',()=>{
    const r=calculateSavingsGoal({solveFor:'time',currentSavings:0,goalAmount:150,periodicContribution:100,returnRate:0,period:10,periodUnit:'years',contributionFrequency:'monthly'})
    expect(r.periodsToGoal).toBe(2)
    expect(r.timeToGoal).toBe(2/12)
    expect(r.projectedBalance).toBe(200)
    expect(r.schedule.map(row=>row.balance)).toEqual([0,100,200])
  })
  it('preserves every contribution row while limiting only chart points',()=>{
    const input={solveFor:'fv' as const,startingInvestment:0,periodicContribution:100,contributionFrequency:'monthly',contributionTiming:'end' as const,returnRate:0,period:30,periodUnit:'years' as const}
    const r=calculateInvestment(input)
    expect(buildInvestmentTable(r).rows).toHaveLength(360)
    expect(new Set(r.schedule.map(row=>row.period)).size).toBe(360)
    expect(r.schedule.at(-1)?.balance).toBe(36000)
    expect(buildInvestmentCharts(r)[0].series[0].data.length).toBeLessThanOrEqual(241)
    const savings=calculateSavingsGoal({solveFor:'balance',currentSavings:0,goalAmount:36000,periodicContribution:100,returnRate:0,period:30,periodUnit:'years',contributionFrequency:'monthly'})
    expect(buildSavingsGoalTable(savings).rows).toHaveLength(361)
  })
  it.each([{opposite:5,hypotenuse:3},{angle:90,opposite:3},{opposite:3,adjacent:4,hypotenuse:6},{opposite:3,adjacent:4,angle:60},{opposite:NaN,adjacent:4}])('rejects inconsistent right triangles %j',patch=>{
    expect(()=>calculateTrigonometry({angleUnit:'degrees',...patch})).toThrow()
  })
  it('distinguishes undefined sample metrics from valid population zero',()=>{
    const r=calculateStandardDeviation({dataset:'7'})
    expect(r.populationSd).toBe(0)
    expect(r.sampleSd).toBeNull()
    expect(r.sampleVariance).toBeNull()
    expect(explainStandardDeviation({dataset:'7'},r).steps[1].result).toBe('Not defined for one observation')
  })
  it('defines price-index inflation independently of a zero monetary amount',()=>{
    const r=calculateInflation({mode:'projection',amount:0,inflationRate:10,durationYears:1})
    expect(r.futurePrice).toBe(0)
    expect(r.realValue).toBe(0)
    expect(r.percentChange).toBe(10)
    expect(r.purchasingPowerReduction).toBe(9.09)
    expect(()=>calculateInflation({mode:'projection',amount:0,inflationRate:-100,durationYears:1})).toThrow()
  })
})
