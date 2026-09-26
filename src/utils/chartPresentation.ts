import type { ChartData, ChartSeries } from '@/calculators/types'
import type { CalculationProvenance } from '@/exports/provenance'
import { snapshotCurrency } from '@/exports/provenance'
import { displayNumber } from './numberFormat'

const palette = ['#163B8C','#187766','#B45E2B','#7553A6','#55738D','#9E456B','#60752D','#406E96']
const semantic: Record<string,string> = {
  Balance:palette[0], Principal:palette[0], Contributions:palette[0], 'Ending debt':palette[0],
  Interest:palette[1], Earnings:palette[1], 'Estimated net':palette[1], 'Purchasing power':palette[1],
  Goal:palette[2], Estimate:palette[2], 'Future price':palette[0], Tax:palette[2],
  Density:'#8996A8', 'Lower tail':palette[0], 'Upper tail':palette[0], LP:palette[0], GP:palette[1],
}
/** A name keeps its color across chart order, pie slices, and reports. */
export function seriesColor(name: string): string {
  if (semantic[name]) return semantic[name]
  let hash=0
  for (const character of name) hash=(hash*31+character.charCodeAt(0))>>>0
  return palette[hash % palette.length]
}
export function chartValue(value:number, chart:ChartData, provenance?:CalculationProvenance):string {
  if (chart.valueFormat === 'currency') return snapshotCurrency(value,provenance)
  return displayNumber(value,provenance?.locale??'en-US',chart.precision??(chart.valueFormat==='percent'?2:4))+(chart.valueFormat==='percent'?'%':'')
}

export function presentCharts(id:string, input:unknown, result:unknown, charts:ChartData[], p?:CalculationProvenance):ChartData[] {
  const i=input as Record<string,unknown>, r=result as Record<string,unknown>
  return charts.map(chart => {
    let xLabel=chart.xLabel
    if (['investment','compound-interest','savings-goal'].includes(id)) xLabel='Time (years)'
    if (['amortization','loan','interest-rate'].includes(id)) xLabel=`Payment period (${String(i.paymentFrequency??'monthly')})`
    if (id==='mortgage') xLabel=chart.title?.includes('by year')?'Loan year':'Payment month'
    if (id==='retirement') xLabel='Age (years)'
    if (id==='inflation') xLabel=i.mode==='historical'?'Calendar year':'Time (years)'
    if (id==='dcf'||id==='lbo') xLabel='Forecast year'
    if (id==='standard-deviation'||id==='random-number') xLabel='Value / interval'
    if (id==='cap-table') xLabel='Funding round'
    if (id==='cre-waterfall') xLabel='Distribution tier'
    if (id==='dti') xLabel='Monthly expense'
    if (id==='income-tax'||id==='salary') xLabel='Income component'
    if (id==='black-scholes'&&xLabel==='Stock price') xLabel=`Stock price (${p?.currency??'currency not recorded'})`
    const interval=id==='p-value'&&chart.title==='Confidence interval'
    const yLabel=interval?undefined:chart.valueFormat==='currency'?`${chart.yLabel??'Amount'} (${p?.currency??'currency not recorded'})`:chart.valueFormat==='percent'?`${chart.yLabel??'Share'} (%)`:chart.yLabel??'Count'
    const annotations:NonNullable<ChartData['annotations']>=[...(chart.annotations??[])]
    if (chart.type!=='pie') {
      const final=chart.series[0]?.data.at(-1)
      if (final && ['investment','compound-interest','savings-goal','mortgage','amortization','loan','interest-rate','retirement','lbo'].includes(id)) {
        annotations.push({x:final.x,y:final.y,label:`Final ${chart.series[0].name.toLowerCase()}: ${chartValue(final.y,chart,p)}`})
      }
      if (id==='savings-goal' && typeof r.goalAmount==='number') annotations.push({y:r.goalAmount,label:`Goal: ${snapshotCurrency(r.goalAmount,p)}`})
      if (id==='retirement' && chart.title==='Retirement drawdown' && typeof r.depletionAge==='number') annotations.push({x:r.depletionAge,label:`Funds depleted at age ${r.depletionAge}`})
      if (id==='bonds' && typeof r.ytmPercent==='number') annotations.push({x:r.ytmPercent,y:Number(i.bondPrice),label:`Yield to maturity: ${displayNumber(r.ytmPercent,p?.locale??'en-US',4)}%`})
      if (interval && typeof r.ciLower==='number' && typeof r.ciUpper==='number') annotations.push({label:`${r.confidenceLevel}% confidence interval: ${displayNumber(r.ciLower,p?.locale??'en-US',6)} to ${displayNumber(r.ciUpper,p?.locale??'en-US',6)}`})
      if (id==='p-value' && typeof r.testStatistic==='number') annotations.push({x:r.testStatistic,label:`Observed statistic: ${displayNumber(r.testStatistic,p?.locale??'en-US',4)}`})
    }
    return {...chart,hideValueAxis:interval,xLabel:chart.type==='pie'?undefined:xLabel,yLabel:chart.type==='pie'?undefined:yLabel,
      xType:chart.xType??(chart.series.every(s=>s.data.every(d=>typeof d.x==='number'))?'number':'category'),
      series:chart.series.map(s=>({...s,color:seriesColor(s.name)})),annotations}
  })
}

/** Keep each series' actual coordinates. Missing values never become invented zeroes. */
export function mergeChartSeries(chart:ChartData):Record<string,unknown>[] {
  const points=new Map<string|number,Record<string,unknown>>()
  for (const series of chart.series) for (const point of series.data) {
    const x=chart.xType==='time'?Date.parse(String(point.x)):point.x
    if (typeof x==='number'&&!Number.isFinite(x)) continue
    if (!points.has(x))points.set(x,{x})
    points.get(x)![series.name]=Number.isFinite(point.y)?point.y:null
  }
  const rows=[...points.values()]
  if (rows.every(row=>typeof row.x==='number'))rows.sort((a,b)=>Number(a.x)-Number(b.x))
  return rows
}

export function withBaseline(charts:ChartData[], baseline:ChartData[], name:string):ChartData[] {
  return charts.map(chart=>{
    const before=baseline.find(c=>c.title===chart.title&&c.type===chart.type)
    if (!before || chart.type==='pie') return chart
    if (chart.title==='Histogram' && JSON.stringify(mergeChartSeries(chart).map(row=>row.x))!==JSON.stringify(mergeChartSeries(before).map(row=>row.x))) return {...chart,annotations:[...(chart.annotations??[]),{label:'Histogram intervals differ from the baseline. Compare the summary metrics; this chart shows the current data.'}]}
    if (chart.stacked) {
      const totals=(c:ChartData)=>mergeChartSeries(c).map(row=>({x:row.x as string|number,y:c.series.reduce((sum,s)=>sum+(typeof row[s.name]==='number'?Number(row[s.name]):0),0)}))
      return {...chart,title:`${chart.title} — total comparison`,type:'line',stacked:false,series:[{name:'Current total',color:palette[0],data:totals(chart)},{name:`Total · ${name}`,color:palette[0],data:totals(before),dashed:true,baseline:true}],annotations:[{label:'Comparing total values. Clear the baseline to inspect the composition.'}]}
    }
    const previous:ChartSeries[]=before.series.map(s=>({...s,name:`${s.name} · ${name}`,dashed:true,baseline:true}))
    return {...chart,series:[...chart.series,...previous]}
  })
}
