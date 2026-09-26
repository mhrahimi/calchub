import {describe,it,expect} from 'vitest'
import { comparisonIssue, comparisonRows, withComparison } from './model'
import { buildLiveExportPayload } from '@/exports/buildPayload'
import { resultMetadata } from '@/exports/resultMetadata'
import { captureProvenance } from '@/exports/provenance'
import { DEFAULT_SETTINGS } from '@/calculators/types'
import { calculateInvestment, explainInvestment, buildInvestmentCharts, buildInvestmentTable } from '@/calculators/finance/investment/calculate'
import { mergeChartSeries, presentCharts, seriesColor, withBaseline } from '@/utils/chartPresentation'
import { displayNumber, displayMetric } from '@/utils/numberFormat'
import { makeField, inputFields } from '@/exports/reportFields'
const inputs={solveFor:'fv' as const,startingInvestment:10000,periodicContribution:500,contributionFrequency:'monthly',contributionTiming:'end' as const,returnRate:7,period:20,periodUnit:'years' as const}
function payload(rate:number) {
  const input={...inputs,returnRate:rate},raw=calculateInvestment(input),metadata=resultMetadata('investment',raw)
  metadata.provenance=captureProvenance('investment',input,metadata,DEFAULT_SETTINGS,raw,'2026-09-25T12:00:00Z')
  return buildLiveExportPayload({calculatorId:'investment',inputs:input,results:{...raw,metadata},explain:explainInvestment,buildCharts:buildInvestmentCharts,buildTable:buildInvestmentTable})
}
describe('Scenario comparison and chart presentation',()=>{
  it('compares independently calculated balances without mutating the baseline',()=>{
    const baseline=payload(7), current=payload(8), before=JSON.stringify(baseline)
    expect(comparisonIssue(current,baseline)).toBeNull()
    const row=comparisonRows(current,baseline).find(r=>r.primary)!
    expect(row.change).toBe('+USD 42,927.52')
    expect(JSON.stringify(baseline)).toBe(before)
    const report=withComparison(current,{name:'Seven percent',payload:baseline})
    expect(report.extraTables?.at(-2)?.rows[0].change).toBe('+USD 42,927.52')
    expect(report.extraTables?.at(-1)?.rows.some(row=>row.label==='Return rate'&&row.value==='7.00%')).toBe(true)
    const charts=withBaseline(current.charts!,baseline.charts!,'Seven percent')
    expect(charts[0].series[1].dashed).toBe(true)
    expect(charts[0].series[1].data.at(-1)?.y).toBe((baseline.rawResults as {endingBalance:number}).endingBalance)
    expect(charts[1].stacked).toBe(false)
    expect(charts[1].series[0].data.at(-1)?.y).toBeCloseTo((current.rawResults as {endingBalance:number}).endingBalance,2)
  })
  it('blocks comparison across currency, unit, version, and mode changes',()=>{
    const a=payload(7),b=payload(8)
    for(const mutate of [()=>b.provenance!.currency='EUR',()=>b.provenance!.units={periodUnit:'months'},()=>b.metadata!.modelVersion='investment/old',()=>b.inputs.solveFor='rate']) {
      const original=structuredClone(b);mutate();expect(comparisonIssue(a,b)).not.toBeNull();Object.assign(b,original)
    }
  })
  it('expresses rate changes as percentage points, including a zero baseline',()=>{
    const current=payload(7),baseline=payload(7)
    current.fields=[makeField(['rate','Rate','fraction'],.05,current.provenance!)]
    baseline.fields=[makeField(['rate','Rate','fraction'],0,baseline.provenance!)]
    expect(comparisonRows(current,baseline)[0].change).toBe('+5 percentage points')
  })
  it('preserves irregular numeric positions and does not invent zero values',()=>{
    const rows=mergeChartSeries({type:'line',xType:'number',series:[{name:'Interval',data:[{x:1,y:1},{x:10,y:1}]},{name:'Estimate',data:[{x:3,y:1}]}]})
    expect(rows.map(r=>r.x)).toEqual([1,3,10])
    expect(rows[1].Interval).toBeUndefined()
    const dated=mergeChartSeries({type:'line',xType:'time',series:[{name:'Balance',data:[{x:'2026-01-01',y:1},{x:'2026-03-01',y:2}]}]})
    expect(Number(dated[1].x)-Number(dated[0].x)).toBe(59*86400000)
  })
  it('uses stable semantic colors, explicit units, and truthful endpoint annotations',()=>{
    const result=payload(7)
    const charts=presentCharts('investment',inputs,result.rawResults,result.charts!,result.provenance)
    expect(charts[0].xLabel).toBe('Time (years)')
    expect(charts[0].yLabel).toContain('USD')
    expect(seriesColor('Interest')).toBe(seriesColor('Earnings'))
    expect(charts[0].annotations?.at(-1)?.label).toContain('USD 300,850.72')
  })
  it('localizes separators, preserves tiny probabilities, and makes negatives explicit',()=>{
    expect(displayNumber(-12345.678,'en-US',2)).toBe('−12,345.68')
    expect(displayNumber(12345.678,'de-DE',2)).toBe('12.345,68')
    expect(displayNumber(0.000000000123,'en-US',8)).toBe('1.23E-10')
    expect(displayNumber(-0,'en-US',2)).toBe('0')
    expect(inputFields({taxYear:2026},payload(7).provenance!)[0].display).toBe('2026')
    expect(displayMetric('9007199254740993','en-US')).toBe('9,007,199,254,740,993')
    expect(makeField(['integer','Integer','integer'],9007199254740993n,payload(7).provenance!).display).toBe('9,007,199,254,740,993')
  })
})
