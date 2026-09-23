import type { CalculationExplanation } from '@/calculators/types'
export interface ResultMetadata {
  primaryResult: string | null
  modelVersion: string
  status: string
  warnings: string[]
  assumptions: string[]
  sources: string[]
}
const primary: Record<string,string> = {
  amortization:'payment', mortgage:'principalAndInterest',loan:'payment',investment:'solvedValue',
  'compound-interest':'finalBalance',retirement:'projectedBalance','interest-rate':'annualRate',
  inflation:'primaryAmount','savings-goal':'projectedBalance',dti:'backEndDti',salary:'convertedAmount',
  'income-tax':'totalTax','black-scholes':'callPrice',bonds:'ytmPercent','cap-table':'pricePerShare',
  'cre-waterfall':'lpTotal',dcf:'enterpriseValue',lbo:'moic','number-base':'targetValue',
  'fractions-percentage':'primary','standard-deviation':'sampleSd','random-number':'values',
  triangle:'area',trigonometry:'angleA','p-value':'pValue','gcf-lcm':'gcf',date:'totalDays',conversion:'outputValue',
}
export function resultMetadata(id:string,result:unknown,explanation?:CalculationExplanation,legacy=false):ResultMetadata {
  const r=(result??{}) as Record<string,unknown>
  if(r.metadata) return r.metadata as ResultMetadata
  const model=id==='dcf-lbo'?('moic' in r?'lbo':'dcf'):id
  const key=model==='date'&&r.mode==='addSubtract'?'resultDate':model==='salary'&&r.mode==='take-home'?'estimatedNetAnnual':model==='savings-goal'&&r.timeToGoal!==undefined?'projectedBalance':primary[model]
  const approximate=['income-tax','cre-waterfall','lbo'].includes(model)
  return {
    primaryResult:key && key in r ? key : null,
    modelVersion:legacy?'legacy-unversioned':`${model}/2.0.0`,
    status:legacy?'legacy':typeof r.status==='string'?r.status:approximate?'approximate':'success',
    warnings:[...(Array.isArray(r.warnings)?r.warnings as string[]:[]),...(legacy?['Saved result predates versioned models; recalculate to apply current fixes.']:[]),...(approximate?['Scoped illustrative estimate; review the assumptions and exclusions.']:[])],
    assumptions:explanation?.assumptions??[],
    sources:(r.coverage as {sources?:string[]}|undefined)?.sources??[],
  }
}
