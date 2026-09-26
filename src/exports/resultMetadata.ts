import type { CalculationProvenance } from './provenance'
import type { CalculationExplanation } from '@/calculators/types'
export interface ResultMetadata {
  primaryResult: string | null
  modelVersion: string
  status: string
  warnings: string[]
  assumptions: string[]
  sources: string[]
  provenance?: CalculationProvenance
  explanation?: CalculationExplanation
}
const primary: Record<string,string> = {
  amortization:'payment', mortgage:'principalAndInterest',loan:'payment',investment:'solvedValue',
  'compound-interest':'finalBalance',retirement:'projectedBalance','interest-rate':'annualRate',
  inflation:'primaryAmount','savings-goal':'projectedBalance',dti:'backEndDti',salary:'convertedAmount',
  'income-tax':'totalTax','black-scholes':'callPrice',bonds:'ytmPercent','cap-table':'pricePerShare',
  'cre-waterfall':'lpTotal',dcf:'enterpriseValue',lbo:'moic','number-base':'targetValue',
  'fractions-percentage':'primary','standard-deviation':'populationSd','random-number':'values',
  triangle:'area',trigonometry:'angleA','p-value':'pValue','gcf-lcm':'gcf',date:'totalDays',conversion:'outputValue',
}
const correctedModels = new Set(['date', 'salary', 'income-tax', 'retirement', 'p-value', 'random-number', 'gcf-lcm', 'mortgage', 'amortization', 'loan', 'bonds', 'savings-goal', 'investment', 'trigonometry', 'inflation', 'standard-deviation'])
export function resultMetadata(id:string,result:unknown,explanation?:CalculationExplanation,legacy=false):ResultMetadata {
  const r=(result??{}) as Record<string,unknown>
  const model=id==='dcf-lbo'?('moic' in r?'lbo':'dcf'):id
  const version = `${model}/${model === 'mortgage' ? '2.3.0' : correctedModels.has(model) ? '2.2.0' : '2.0.0'}`
  if (r.metadata) {
    const saved = r.metadata as ResultMetadata
    if (correctedModels.has(model) && saved.modelVersion !== version) {
      return { ...saved, status: 'outdated', warnings: [...new Set([...saved.warnings, 'This saved result uses an earlier calculation model. Recalculate to apply the correctness fixes.'])] }
    }
    return saved
  }
  const key=model==='date'&&r.mode==='addSubtract'?'resultDate':model==='salary'&&r.mode==='take-home'?'estimatedNetAnnual':model==='savings-goal'&&r.timeToGoal!==undefined?'projectedBalance':primary[model]
  const approximate=['income-tax','cre-waterfall','lbo'].includes(model) || (model === 'salary' && r.mode === 'take-home')
  return {
    primaryResult:key && key in r ? key : null,
    modelVersion:legacy?'legacy-unversioned':version,
    status:legacy?'legacy':typeof r.status==='string'?r.status:approximate?'approximate':'success',
    warnings:[...(Array.isArray(r.warnings)?r.warnings as string[]:[]),...(legacy?['Saved result predates versioned models; recalculate to apply current fixes.']:[]),...(approximate?['Scoped illustrative estimate; review the assumptions and exclusions.']:[])],
    assumptions:explanation?.assumptions??[],
    sources:(r.coverage as {sources?:string[]}|undefined)?.sources??[],
  }
}
