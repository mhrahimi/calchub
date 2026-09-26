import { useContext, useSyncExternalStore } from 'react'
import { ComposedChart, Line, Area, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceDot } from 'recharts'
import type { ChartData } from '@/calculators/types'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { SnapshotFormatContext } from './SnapshotFormat'
import { chartValue, mergeChartSeries, seriesColor } from '@/utils/chartPresentation'
import { displayNumber } from '@/utils/numberFormat'

const SM_QUERY='(min-width: 640px)'
function subscribeSm(onChange:()=>void) { const mq=window.matchMedia(SM_QUERY);mq.addEventListener('change',onChange);return()=>mq.removeEventListener('change',onChange) }
interface ChartPanelProps { data:ChartData }

function ChartPanelInner({data}:ChartPanelProps) {
  const p=useContext(SnapshotFormatContext)
  const locale=p?.locale??'en-US'
  const desktop=useSyncExternalStore(subscribeSm,()=>window.matchMedia(SM_QUERY).matches,()=>false)
  const rows=mergeChartSeries(data)
  const numericX=data.xType!=='category'&&rows.every(row=>typeof row.x==='number')
  const value=(v:number)=>chartValue(v,data,p)
  const tick=(v:number)=>new Intl.NumberFormat(locale,{notation:'compact',maximumFractionDigits:1}).format(v).replace(/^-/, '−')+(data.valueFormat==='percent'?'%':'')
  const xTick=(v:number|string)=>data.xType==='time'?new Intl.DateTimeFormat(locale,{month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(Number(v))):typeof v==='number'?displayNumber(v,locale,2):String(v)
  const currentSeries=data.series.filter(s=>!s.baseline)
  const currentTotal=(x:string|number)=>currentSeries.reduce((total,s)=>total+(s.data.find(d=>d.x===x)?.y??0),0)
  const numericValues=data.stacked?rows.map(row=>currentTotal(row.x as string|number)):data.series.flatMap(s=>s.data.map(d=>d.y))
  const hasNegative=numericValues.some(n=>n<0)
  const height=desktop?272:232
  const pieItems=data.series[0]?.data??[]
  return <figure className="min-w-0 py-5 border-b border-border/70">
    <figcaption className="flex flex-wrap justify-between gap-2 mb-3"><h3 className="font-semibold text-sm">{data.title}</h3>{data.yLabel&&<span className="text-xs text-text-secondary">{data.yLabel}</span>}</figcaption>
    <div className="min-w-0 w-full" style={{height}} aria-hidden="true">
      <ResponsiveContainer width="100%" height={height}>
        {data.type==='pie'?<PieChart><Pie data={pieItems.map(d=>({name:String(d.x),value:d.y}))} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={desktop?55:42} outerRadius={desktop?94:77} paddingAngle={1} isAnimationActive={false}>{pieItems.map(d=><Cell key={String(d.x)} fill={seriesColor(String(d.x))}/>)}</Pie><Tooltip formatter={(v:number)=>value(v)} /></PieChart>:
          <ComposedChart data={rows} stackOffset="sign" margin={{top:12,right:20,bottom:20,left:4}}>
            <CartesianGrid horizontal={!data.hideValueAxis} vertical={false} stroke="#E3E8F0" />
            <XAxis dataKey="x" type={numericX?'number':'category'} domain={numericX?['dataMin','dataMax']:undefined} scale={data.xType==='time'?'time':'auto'} tickFormatter={xTick} tick={{fontSize:11,fill:'#5B6475'}} tickLine={false} axisLine={false} minTickGap={30} tickCount={desktop?6:4} allowDecimals={true} />
            <YAxis hide={data.hideValueAxis} allowDecimals={data.yLabel!=='Count'} width={desktop?64:48} tickFormatter={tick} tick={{fontSize:11,fill:'#5B6475'}} tickLine={false} axisLine={false} domain={data.hideValueAxis?[0.5,1.5]:hasNegative?['auto','auto']:[0,'auto']} />
            <Tooltip labelFormatter={v=>`${data.xLabel??'Value'}: ${xTick(v)}`} formatter={(v:number)=>data.hideValueAxis?'':value(v)} contentStyle={{border:'1px solid #E3E8F0',borderRadius:8,fontSize:12}} />
            {hasNegative&&<ReferenceLine y={0} stroke="#758299" strokeWidth={1.25}/>}
            {data.annotations?.filter(a=>a.x!==undefined&&a.y===undefined).map((a,index)=><ReferenceLine key={`x-${index}`} x={data.xType==='time'?Date.parse(String(a.x)):a.x} stroke="#9B6C32" strokeDasharray="3 4"/>)}
            {data.annotations?.filter(a=>a.y!==undefined&&a.x===undefined).map((a,index)=><ReferenceLine key={`y-${index}`} y={a.y} stroke="#9B6C32" strokeDasharray="3 4"/>)}
            {data.series.map(s=>data.type==='bar'&&!s.baseline?<Bar key={s.name} dataKey={s.name} fill={s.color??seriesColor(s.name)} stackId={data.stacked?'current':undefined} maxBarSize={72} isAnimationActive={false}/>:data.type==='area'&&!s.baseline?<Area key={s.name} type="linear" dataKey={s.name} stackId={data.stacked?'current':undefined} stroke={s.color??seriesColor(s.name)} fill={s.color??seriesColor(s.name)} fillOpacity={0.2} strokeWidth={1.5} connectNulls={false} isAnimationActive={false}/>:<Line key={s.name} type="linear" dataKey={s.name} stroke={s.color??seriesColor(s.name)} strokeWidth={s.baseline?1.7:2.2} strokeDasharray={s.dashed?'6 4':undefined} dot={s.data.length<=8?{r:3}:false} connectNulls={true} isAnimationActive={false}/>)}
            {data.annotations?.filter(a=>a.x!==undefined&&a.y!==undefined).map((a,index)=><ReferenceDot key={index} x={a.x} y={a.y} r={3} fill="#163B8C" stroke="white"/>)}
          </ComposedChart>}
      </ResponsiveContainer>
    </div>
    {data.xLabel&&<p className="text-xs text-text-secondary text-center -mt-2 mb-3">{data.xLabel}</p>}
    <ul aria-label="Chart legend" className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-text-secondary mt-1">
      {(data.type==='pie'?pieItems.map(d=>({name:String(d.x),color:seriesColor(String(d.x)),dashed:false})):data.series).map(s=><li key={s.name} className="flex gap-2 items-center"><span className="inline-block w-5 border-t-2" style={{borderColor:s.color??seriesColor(s.name),borderTopStyle:s.dashed?'dashed':'solid'}}/>{s.name}</li>)}
    </ul>
    {!!data.annotations?.length&&<ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-text-secondary" aria-label="Chart annotations">{data.annotations.map((a,index)=><li key={index}>{a.label}</li>)}</ul>}
    <details className="mt-3 text-xs"><summary className="cursor-pointer text-primary py-2">View chart data</summary><div className="overflow-auto max-h-64"><table className="w-full tabular-nums"><caption className="sr-only">{data.title}</caption><thead><tr><th className="text-left p-2">{data.xLabel??'Category'}</th>{data.series.map(s=><th key={s.name} className="text-right p-2">{s.name}{data.yLabel?` (${data.yLabel})`:''}</th>)}</tr></thead><tbody>{rows.map((row,index)=><tr key={index} className="border-t border-border/60"><th scope="row" className="text-left p-2 font-normal">{xTick(row.x as string|number)}</th>{data.series.map(s=><td key={s.name} className="text-right p-2 whitespace-nowrap">{typeof row[s.name]==='number'?(data.hideValueAxis?'●':value(row[s.name] as number)):'—'}</td>)}</tr>)}</tbody></table></div></details>
  </figure>
}
export function ChartPanel({data}:ChartPanelProps) {return <ErrorBoundary fallback={<p role="status" className="text-sm text-text-secondary">Chart unavailable. Use the result table below.</p>}><ChartPanelInner data={data}/></ErrorBoundary>}
