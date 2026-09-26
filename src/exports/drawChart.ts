import { seriesColor as semanticColor } from '@/utils/chartPresentation'
import type { CalculationProvenance } from './provenance'
import type { jsPDF } from 'jspdf'
import type { ChartData, ChartSeries } from '@/calculators/types'
import { downsamplePoints } from '@/utils/chartSample'

const COLORS = ['#163B8C', '#4A7FD4', '#8A94A6', '#102A66', '#6B8F71', '#C07850', '#7A6B9A', '#3D6B8A']
const PLOT_HEIGHT = 150
const TITLE_H = 16
const LEGEND_H = 82
const AXIS_LEFT = 58
const AXIS_BOTTOM = 32

export const PDF_CHART_BLOCK_HEIGHT = TITLE_H + PLOT_HEIGHT + AXIS_BOTTOM + LEGEND_H + 12

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

function seriesColor(series: ChartSeries, index: number): string {
  return series.color ?? COLORS[index % COLORS.length]
}

function formatTick(value: number, format?: ChartData['valueFormat'],locale='en-US'): string {
  return new Intl.NumberFormat(locale,{notation:'compact',maximumFractionDigits:1}).format(value).replace(/^-/, '−')+(format==='percent'?'%':'')
}

function uniqueXs(series: ChartSeries[]): Array<string | number> {
  const seen = new Set<string>()
  const out: Array<string | number> = []
  for (const s of series) {
    for (const p of s.data) {
      const key = String(p.x)
      if (seen.has(key)) continue
      seen.add(key)
      out.push(p.x)
    }
  }
  const numeric = out.every((x) => typeof x === 'number')
  if (numeric) out.sort((a, b) => (a as number) - (b as number))
  return out
}

function yLookup(series: ChartSeries): Map<string, number> {
  const map = new Map<string, number>()
  for (const p of series.data) map.set(String(p.x), p.y)
  return map
}

/** Draws a chart with jsPDF primitives. Returns the vertical space consumed. */
export function drawChart(doc: jsPDF, chart: ChartData, x: number, y: number, width: number, provenance?: CalculationProvenance): number {
  if(chart.xType==='time')chart={...chart,series:chart.series.map(s=>({...s,data:s.data.map(p=>({...p,x:Date.parse(String(p.x))}))}))}
  const title = chart.title ?? 'Chart'
  doc.setFont('Report', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(17, 24, 39)
  doc.text(title, x, y + 11)
  if(chart.yLabel){doc.setFont('Report','normal');doc.setFontSize(7);doc.text(chart.yLabel,x+width,y+11,{align:'right'})}

  const plotX = x + AXIS_LEFT
  const plotY = y + TITLE_H + 6
  const plotW = width - AXIS_LEFT - 8
  const plotH = PLOT_HEIGHT

  if (chart.type === 'pie') {
    drawPie(doc, chart, plotX, plotY, plotW, plotH)
    drawLegend(doc, chart, x, plotY + plotH + 10, width, true)
    return PDF_CHART_BLOCK_HEIGHT
  }

  const sampled: ChartSeries[] = chart.series.map((s) => ({
    ...s,
    data: downsamplePoints(s.data, 40),
  }))
  const xs = uniqueXs(sampled)
  if (xs.length === 0) {
    doc.setFont('Report', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(91, 100, 117)
    doc.text('No chart data', plotX, plotY + plotH / 2)
    return PDF_CHART_BLOCK_HEIGHT
  }

  const lookups = sampled.map(yLookup)
  let yMin = 0
  let yMax = 0
  if (chart.stacked) {
    for (const xv of xs) {
      let positive=0, negative=0
      for (const lookup of lookups) { const v=lookup.get(String(xv))??0; if(v>=0)positive+=v;else negative+=v }
      yMax=Math.max(yMax,positive);yMin=Math.min(yMin,negative)
    }
  } else {
    for (const lookup of lookups) {
      for (const v of lookup.values()) {
        yMax = Math.max(yMax, v)
        yMin = Math.min(yMin, v)
      }
    }
  }
  if (yMin > 0) yMin = 0
  if (yMax === yMin) yMax = yMin + 1
  if(chart.hideValueAxis){yMin=0.5;yMax=1.5}
  const ySpan = yMax - yMin

  const numericX=xs.every(v=>typeof v==='number')
  const firstX=Number(xs[0]),lastX=Number(xs.at(-1))
  const minGap=numericX&&xs.length>1?Math.min(...xs.slice(1).map((v,i)=>Number(v)-Number(xs[i]))):1
  const padding=chart.type==='bar'&&numericX?minGap/2:0
  const xAt = (i: number) => plotX + (xs.length===1 ? plotW/2 : numericX && lastX>firstX ? (Number(xs[i])-firstX+padding)/(lastX-firstX+2*padding)*plotW : chart.type==='bar'?(i+0.5)*plotW/xs.length:i/(xs.length-1)*plotW)
  const barGroupWidth=numericX&&xs.length>1?minGap/(lastX-firstX+2*padding)*plotW:plotW/xs.length
  const yAt = (v: number) => plotY + plotH - ((v - yMin) / ySpan) * plotH

  doc.setDrawColor(227, 232, 240)
  doc.setLineWidth(0.4)
  for (let i = 0; i <= 4; i++) {
    const gy = plotY + (i / 4) * plotH
    if(!chart.hideValueAxis)doc.line(plotX, gy, plotX + plotW, gy)
    const tick = yMax - (i / 4) * ySpan
    doc.setFont('Report', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(91, 100, 117)
    if(!chart.hideValueAxis&&(chart.yLabel!=='Count'||Number.isInteger(tick))) doc.text(formatTick(tick, chart.valueFormat, provenance?.locale??'en-US'), plotX - 4, gy + 2, { align: 'right' })
  }
  doc.setDrawColor(227, 232, 240)
  doc.rect(plotX, plotY, plotW, plotH)

  if (chart.type === 'bar') {
    const current=sampled.filter(s=>!s.baseline), baseline=sampled.filter(s=>s.baseline)
    drawBars(doc, current, current.map(yLookup), xs, xAt, yAt, barGroupWidth, chart.stacked)
    if(baseline.length)drawLinesOrArea(doc,baseline,baseline.map(yLookup),xs,xAt,yAt,false,false)
  } else {
    drawLinesOrArea(doc, sampled, lookups, xs, xAt, yAt, chart.type === 'area', Boolean(chart.stacked))
  }

  const xLabelCount = Math.min(xs.length, 8)
  for (let i = 0; i < xLabelCount; i++) {
    const idx = xLabelCount === 1 ? 0 : Math.round((i * (xs.length - 1)) / (xLabelCount - 1))
    doc.setFontSize(7)
    doc.setTextColor(91, 100, 117)
    doc.text(chart.xType==='time'?new Date(Number(xs[idx])).toISOString().slice(0,10):typeof xs[idx]==='number'?Number((xs[idx] as number).toFixed(3)).toString():String(xs[idx]).slice(0,18), xAt(idx), plotY + plotH + 12, { align: 'center' })
  }

  doc.setFontSize(7)
  if(chart.xLabel)doc.text(chart.xLabel,plotX+plotW/2,plotY+plotH+25,{align:'center'})
  drawLegend(doc, { ...chart, series: sampled }, x, plotY + plotH + AXIS_BOTTOM, width, false)
  doc.setFontSize(7)
  if(chart.annotations?.length){
    const notes=doc.splitTextToSize(chart.annotations.map(a=>a.label).join(' · '),width) as string[]
    notes.slice(0,3).forEach((line,index)=>doc.text(line,x,plotY+plotH+AXIS_BOTTOM+45+index*10))
  }
  return PDF_CHART_BLOCK_HEIGHT
}

function drawLinesOrArea(
  doc: jsPDF,
  series: ChartSeries[],
  lookups: Map<string, number>[],
  xs: Array<string | number>,
  xAt: (i: number) => number,
  yAt: (v: number) => number,
  area: boolean,
  stacked: boolean,
) {
  const positive = xs.map(() => 0), negative = xs.map(() => 0)
  series.forEach((s, si) => {
    const rgb = hexToRgb(seriesColor(s, si))
    const tops: Array<{ x: number; y: number }> = []
    const bottoms: Array<{ x: number; y: number }> = []
    xs.forEach((xv, i) => {
      if(!lookups[si].has(String(xv)))return
      const raw = lookups[si].get(String(xv))!
      const stacks = raw >= 0 ? positive : negative
      const base = stacked ? stacks[i] : 0
      const top = base + raw
      if (stacked) stacks[i] = top
      tops.push({ x: xAt(i), y: yAt(top) })
      bottoms.push({ x: xAt(i), y: yAt(base) })
    })
    if (area && tops.length > 1) {
      const path: Array<[number, number]> = []
      for (let i = 1; i < tops.length; i++) {
        path.push([tops[i].x - tops[i - 1].x, tops[i].y - tops[i - 1].y])
      }
      const lastTop = tops[tops.length - 1]
      const lastBot = bottoms[bottoms.length - 1]
      path.push([lastBot.x - lastTop.x, lastBot.y - lastTop.y])
      for (let i = bottoms.length - 2; i >= 0; i--) {
        path.push([bottoms[i].x - bottoms[i + 1].x, bottoms[i].y - bottoms[i + 1].y])
      }
      const mix = stacked ? 0.45 : 0.28
      doc.setFillColor(
        Math.round(rgb[0] * mix + 255 * (1 - mix)),
        Math.round(rgb[1] * mix + 255 * (1 - mix)),
        Math.round(rgb[2] * mix + 255 * (1 - mix)),
      )
      doc.lines(path, tops[0].x, tops[0].y, [1, 1], 'F', true)
    }
    doc.setDrawColor(...rgb)
    doc.setLineWidth(1.4)
    doc.setLineDashPattern(s.dashed?[5,3]:[],0)
    if(tops.length===1){doc.setFillColor(...rgb);doc.circle(tops[0].x,tops[0].y,2,'F')}
    for (let i = 1; i < tops.length; i++) {
      doc.line(tops[i - 1].x, tops[i - 1].y, tops[i].x, tops[i].y)
    }
    doc.setLineDashPattern([],0)
  })
}

function drawBars(
  doc: jsPDF,
  series: ChartSeries[],
  lookups: Map<string, number>[],
  xs: Array<string | number>,
  xAt: (i: number) => number,
  yAt: (v: number) => number,
  groupW: number,
  stacked?: boolean,
) {
  const inner = groupW * 0.72
  series.forEach((s, si) => {
    const rgb = hexToRgb(seriesColor(s, si))
    doc.setFillColor(...rgb)
    xs.forEach((xv, i) => {
      if(!lookups[si].has(String(xv)))return
      const raw = lookups[si].get(String(xv))!
      const cx = xs.length === 1 ? xAt(0) : xAt(i)
      if (stacked) {
        let base = 0
        for (let k = 0; k < si; k++) { const v=lookups[k].get(String(xv))??0; if((v>=0)===(raw>=0))base+=v }
        const top = yAt(base + raw)
        const bot = yAt(base)
        const h = Math.abs(bot - top)
        if(h>0) doc.rect(cx - inner / 2, Math.min(top,bot), inner, h, 'F')
      } else {
        const barW = inner / Math.max(series.length, 1)
        const left = cx - inner / 2 + si * barW
        const top = yAt(raw)
        const zero=yAt(0), h=Math.abs(zero-top)
        if(h>0) doc.rect(left, Math.min(top,zero), Math.max(barW - 1, 0.1), h, 'F')
      }
    })
  })
}

function drawPie(doc: jsPDF, chart: ChartData, plotX: number, plotY: number, plotW: number, plotH: number) {
  const slices = chart.series[0]?.data.filter((d) => d.y > 0) ?? []
  const total = slices.reduce((s, d) => s + d.y, 0)
  const cx = plotX + plotW / 2
  const cy = plotY + plotH / 2
  const r = Math.min(plotW, plotH) / 2 - 6
  if (total <= 0 || slices.length === 0) {
    doc.setFontSize(9)
    doc.setTextColor(91, 100, 117)
    doc.text('No chart data', cx, cy, { align: 'center' })
    return
  }
  let angle = -Math.PI / 2
  slices.forEach((slice) => {
    const sweep = (slice.y / total) * Math.PI * 2
    const rgb = hexToRgb(semanticColor(String(slice.x)))
    doc.setFillColor(...rgb)
    const steps = Math.max(6, Math.ceil((Math.abs(sweep) / Math.PI) * 24))
    const points: Array<[number,number]> = [[r*Math.cos(angle),r*Math.sin(angle)]]
    for (let step=1;step<=steps;step++) {
      const previous=angle+(step-1)/steps*sweep, next=angle+step/steps*sweep
      points.push([r*(Math.cos(next)-Math.cos(previous)),r*(Math.sin(next)-Math.sin(previous))])
    }
    points.push([-r*Math.cos(angle+sweep),-r*Math.sin(angle+sweep)])
    doc.lines(points,cx,cy,[1,1],'F',true)
    angle += sweep
  })
}

function drawLegend(
  doc: jsPDF,
  chart: ChartData,
  x: number,
  y: number,
  width: number,
  pie: boolean,
) {
  const items = pie
    ? (chart.series[0]?.data ?? []).map((d) => ({ name: String(d.x), color: semanticColor(String(d.x)),dashed:false }))
    : chart.series.map((s, i) => ({ name: s.name, color: seriesColor(s, i),dashed:s.dashed??false }))
  doc.setFont('Report', 'normal')
  doc.setFontSize(8)
  let lx = x
  let ly = y + 6
  for (const item of items) {
    const tw = doc.getTextWidth(item.name)
    if(lx+tw+22>x+width){lx=x;ly+=14}
    const rgb = hexToRgb(item.color)
    doc.setFillColor(...rgb)
    if(item.dashed){doc.setDrawColor(...rgb);doc.setLineDashPattern([2,2],0);doc.line(lx,ly-2,lx+8,ly-2);doc.setLineDashPattern([],0)}else doc.rect(lx, ly - 6, 8, 8, 'F')
    doc.setTextColor(17, 24, 39)
    doc.text(item.name, lx + 11, ly)
    lx += 22 + tw
  }
}
