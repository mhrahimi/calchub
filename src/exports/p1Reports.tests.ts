import 'fake-indexeddb/auto'
import {describe,it,expect,vi,afterEach} from 'vitest'
import { DEFAULT_SETTINGS } from '@/calculators/types'
import { captureProvenance, snapshotCurrency, inputsDiffer } from './provenance'
import { resultMetadata } from './resultMetadata'
import { resultFields } from './reportFields'
import { buildLiveExportPayload,buildExportPayloadFromRecord } from './buildPayload'
import { payloadToCsv } from './recordCsv'
import { drawChart } from './drawChart'
import { calculateIncomeTax,explainIncomeTax,buildIncomeTaxTable } from '@/calculators/tax/incomeTax/calculate'
import { saveCalculation,getSavedCalculation } from '@/persistence/saved'
import { serializeBackup,parseBackupText,exportBackup } from '@/persistence/backup'
import type { jsPDF } from 'jspdf'
const inputs={country:'US' as const,jurisdictionId:'texas',taxYear:2026,filingStatus:'single' as const,grossIncome:100000,pretaxDeductions:0,useStandardDeduction:true}
afterEach(()=>vi.unstubAllGlobals())
describe('P1 reports and provenance',()=>{
  it('preserves original currency, timestamp, assumptions and revision through save and backup',async()=>{
    const data=new Map<string,string>();vi.stubGlobal('localStorage',{getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>data.set(k,v),removeItem:(k:string)=>data.delete(k)})
    const raw=calculateIncomeTax(inputs),explanation=explainIncomeTax(inputs,raw)
    const metadata=resultMetadata('income-tax',raw,explanation)
    metadata.provenance=captureProvenance('income-tax',inputs,metadata,DEFAULT_SETTINGS,raw,'2026-09-25T12:00:00Z')
    metadata.explanation=explanation
    const results={...raw,metadata}
    const saved=await saveCalculation({calculatorId:'income-tax',inputs,results,settingsVersion:1},'USD estimate')
    data.set('calchub:settings',JSON.stringify({...DEFAULT_SETTINGS,currency:'EUR'}))
    expect(snapshotCurrency(1234,metadata.provenance)).toBe('USD 1,234.00')
    const payload=await buildExportPayloadFromRecord((await getSavedCalculation(saved.id))!)
    expect(payload.date).toBe('2026-09-25T12:00:00Z')
    expect(payload.provenance?.currency).toBe('USD')
    expect(payload.provenance?.taxConfigVersion).toBe(raw.taxConfigVersion)
    expect(payload.explanation?.assumptions).toEqual(explanation.assumptions)
    const recovered=parseBackupText(serializeBackup(await exportBackup())).backup.saved.find(r=>r.id===saved.id)!
    expect((recovered.results as typeof results).metadata.provenance).toEqual(metadata.provenance)
  })
  it('formats rates and emits one rectangular CSV with the full schedule',()=>{
    const raw=calculateIncomeTax(inputs),metadata=resultMetadata('income-tax',raw)
    metadata.provenance=captureProvenance('income-tax',inputs,metadata,DEFAULT_SETTINGS,raw)
    const payload=buildLiveExportPayload({calculatorId:'income-tax',inputs,results:{...raw,metadata},explain:explainIncomeTax,buildTable:buildIncomeTaxTable})
    const rate=payload.fields!.find(f=>f.key==='effectiveRate')!
    expect(rate.display).toBe(`${(raw.effectiveRate*100).toFixed(2)}%`)
    expect(payload.resultsSummary.some(f=>f.label==='Tax config version')).toBe(false)
    const csv=payloadToCsv(payload)
    expect(csv).toContain('"Effective income-tax rate"')
    expect(csv).not.toContain('Full result (JSON)')
    // All quoted cells, including multiline assumptions, obey the same seven-column schema.
    const records=csv.replace(/"(?:[^"]|"")*"/g,'cell').split('\r\n')
    for(const record of records) expect(record.split(',')).toHaveLength(7)
  })
  it('exposes nested Greeks, alternate triangles and mode-specific units',()=>{
    const p=captureProvenance('investment',{},resultMetadata('investment',{}),DEFAULT_SETTINGS,{})
    expect(resultFields('investment',{solveFor:'rate'},{solvedValue:7,solvedLabel:'Required return'},p,'solvedValue')[0].display).toBe('7.00%')
    expect(resultFields('black-scholes',{}, {callPrice:10,greeks:{vega:0.2}},p,'callPrice').find(f=>f.key==='greeks.vega')?.unit).toContain('percentage-point')
    const fields=resultFields('triangle',{}, {ambiguous:true,solutions:[{sideA:3,area:6},{sideA:4,area:8}]},p,null)
    expect(fields.some(f=>f.label==='Solution 2: Area'&&f.raw===8)).toBe(true)
  })
  it('distinguishes undefined sample statistics and unfunded outcomes from zero',()=>{
    const p=captureProvenance('standard-deviation',{},resultMetadata('standard-deviation',{}),DEFAULT_SETTINGS,{})
    const stats={populationSd:0,sampleSd:null,count:1,sampleVariance:null}
    const fields=resultFields('standard-deviation',{},stats,p,resultMetadata('standard-deviation',stats).primaryResult)
    expect(fields.find(f=>f.primary)?.key).toBe('populationSd')
    expect(fields.find(f=>f.key==='sampleSd')?.display).toBe('Not defined for one observation')
    expect(resultFields('retirement',{}, {depletionAge:null},p,null)[0].display).toBe('Not depleted within projection')
  })
  it('compares nested normalized input snapshots without key-order noise',()=>{
    expect(inputsDiffer({a:1,b:{v:2}},{b:{v:2},a:1})).toBe(false)
    expect(inputsDiffer({a:1,b:{v:2}},{b:{v:3},a:1})).toBe(true)
  })
  it.each([false,true])('keeps positive and negative bars inside the plot, stacked=%s',stacked=>{
    const rectangles:number[][]=[]
    const fake=new Proxy({rect:(...args:unknown[])=>rectangles.push(args.slice(0,4) as number[]),getTextWidth:(s:string)=>s.length*4},{get:(target,key)=>key in target?target[key as keyof typeof target]:()=>{}}) as unknown as jsPDF
    drawChart(fake,{type:'bar',stacked,series:[{name:'A',data:[{x:'First',y:-50},{x:'Last',y:100}]},{name:'B',data:[{x:'First',y:75},{x:'Last',y:-25}]}]},44,60,524)
    const plot=rectangles[0]
    const bars=rectangles.slice(1,5)
    for(const [x,y,w,h] of bars){expect(x).toBeGreaterThanOrEqual(plot[0]);expect(x+w).toBeLessThanOrEqual(plot[0]+plot[2]+1e-8);expect(y).toBeGreaterThanOrEqual(plot[1]);expect(y+h).toBeLessThanOrEqual(plot[1]+plot[3]+1e-8)}
  })
  it('spaces report bars by their numeric coordinates and draws the baseline as a dashed line',()=>{
    const rectangles:number[][]=[],dashes:number[][]=[]
    const fake=new Proxy({rect:(...args:unknown[])=>rectangles.push(args.slice(0,4) as number[]),setLineDashPattern:(pattern:number[])=>dashes.push(pattern),getTextWidth:(s:string)=>s.length*4},{get:(target,key)=>key in target?target[key as keyof typeof target]:()=>{}}) as unknown as jsPDF
    drawChart(fake,{type:'bar',xType:'number',series:[{name:'Current',data:[{x:1,y:1},{x:2,y:2},{x:10,y:3}]},{name:'Baseline',baseline:true,dashed:true,data:[{x:1,y:2},{x:10,y:2}]}]},44,60,524)
    const bars=rectangles.slice(1,4),centers=bars.map(([x,,width])=>x+width/2)
    expect((centers[2]-centers[1])/(centers[1]-centers[0])).toBeCloseTo(8,8)
    expect(dashes).toContainEqual([5,3])
  })

})
