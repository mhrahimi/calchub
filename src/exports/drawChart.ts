import type { jsPDF } from 'jspdf'
import type { ChartData, ChartSeries } from '@/calculators/types'
import { downsamplePoints } from '@/utils/chartSample'

const COLORS = ['#163B8C', '#4A7FD4', '#8A94A6', '#102A66', '#6B8F71', '#C07850', '#7A6B9A', '#3D6B8A']
const PLOT_HEIGHT = 150
const TITLE_H = 16
const LEGEND_H = 22
const AXIS_LEFT = 44
const AXIS_BOTTOM = 18

export const PDF_CHART_BLOCK_HEIGHT = TITLE_H + PLOT_HEIGHT + AXIS_BOTTOM + LEGEND_H + 12

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

function seriesColor(series: ChartSeries, index: number): string {
  return series.color ?? COLORS[index % COLORS.length]
}

function formatTick(value: number, format?: ChartData['valueFormat']): string {
  if (format === 'currency') {
    const abs = Math.abs(value)
    if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
    if (abs >= 10_000) return `$${(value / 1000).toFixed(0)}k`
    return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
  }
  if (format === 'percent') return `${value.toFixed(1)}%`
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 })
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
export function drawChart(doc: jsPDF, chart: ChartData, x: number, y: number, width: number): number {
  const title = chart.title ?? 'Chart'
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(17, 24, 39)
  doc.text(title, x, y + 11)

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
    doc.setFont('helvetica', 'normal')
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
      let sum = 0
      for (const lookup of lookups) sum += lookup.get(String(xv)) ?? 0
      yMax = Math.max(yMax, sum)
      yMin = Math.min(yMin, sum)
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
  const ySpan = yMax - yMin

  const xAt = (i: number) => plotX + (xs.length === 1 ? plotW / 2 : (i / (xs.length - 1)) * plotW)
  const yAt = (v: number) => plotY + plotH - ((v - yMin) / ySpan) * plotH

  doc.setDrawColor(227, 232, 240)
  doc.setLineWidth(0.4)
  for (let i = 0; i <= 4; i++) {
    const gy = plotY + (i / 4) * plotH
    doc.line(plotX, gy, plotX + plotW, gy)
    const tick = yMax - (i / 4) * ySpan
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(91, 100, 117)
    doc.text(formatTick(tick, chart.valueFormat), plotX - 4, gy + 2, { align: 'right' })
  }
  doc.setDrawColor(227, 232, 240)
  doc.rect(plotX, plotY, plotW, plotH)

  if (chart.type === 'bar') {
    drawBars(doc, sampled, lookups, xs, xAt, yAt, plotY, plotH, plotW, chart.stacked)
  } else {
    drawLinesOrArea(doc, sampled, lookups, xs, xAt, yAt, chart.type === 'area', Boolean(chart.stacked))
  }

  const xLabelCount = Math.min(xs.length, 8)
  for (let i = 0; i < xLabelCount; i++) {
    const idx = xLabelCount === 1 ? 0 : Math.round((i * (xs.length - 1)) / (xLabelCount - 1))
    doc.setFontSize(7)
    doc.setTextColor(91, 100, 117)
    doc.text(String(xs[idx]), xAt(idx), plotY + plotH + 12, { align: 'center' })
  }

  drawLegend(doc, { ...chart, series: sampled }, x, plotY + plotH + AXIS_BOTTOM, width, false)
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
  const stacks = xs.map(() => 0)
  series.forEach((s, si) => {
    const rgb = hexToRgb(seriesColor(s, si))
    const tops: Array<{ x: number; y: number }> = []
    const bottoms: Array<{ x: number; y: number }> = []
    xs.forEach((xv, i) => {
      const raw = lookups[si].get(String(xv)) ?? 0
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
    for (let i = 1; i < tops.length; i++) {
      doc.line(tops[i - 1].x, tops[i - 1].y, tops[i].x, tops[i].y)
    }
  })
}

function drawBars(
  doc: jsPDF,
  series: ChartSeries[],
  lookups: Map<string, number>[],
  xs: Array<string | number>,
  xAt: (i: number) => number,
  yAt: (v: number) => number,
  plotY: number,
  plotH: number,
  plotW: number,
  stacked?: boolean,
) {
  const groupW = plotW / xs.length
  const inner = groupW * 0.72
  series.forEach((s, si) => {
    const rgb = hexToRgb(seriesColor(s, si))
    doc.setFillColor(...rgb)
    xs.forEach((xv, i) => {
      const raw = lookups[si].get(String(xv)) ?? 0
      const cx = xs.length === 1 ? xAt(0) : xAt(i)
      if (stacked) {
        let base = 0
        for (let k = 0; k < si; k++) base += lookups[k].get(String(xv)) ?? 0
        const top = yAt(base + raw)
        const bot = yAt(base)
        const h = Math.max(0.6, bot - top)
        doc.rect(cx - inner / 2, top, inner, h, 'F')
      } else {
        const barW = inner / Math.max(series.length, 1)
        const left = cx - inner / 2 + si * barW
        const top = yAt(raw)
        const h = Math.max(0.6, plotY + plotH - top)
        doc.rect(left, top, Math.max(barW - 1, 1), h, 'F')
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
  slices.forEach((slice, i) => {
    const sweep = (slice.y / total) * Math.PI * 2
    const rgb = hexToRgb(COLORS[i % COLORS.length])
    doc.setFillColor(...rgb)
    const steps = Math.max(6, Math.ceil((Math.abs(sweep) / Math.PI) * 24))
    for (let s = 0; s < steps; s++) {
      const a0 = angle + (s / steps) * sweep
      const a1 = angle + ((s + 1) / steps) * sweep
      doc.triangle(
        cx,
        cy,
        cx + r * Math.cos(a0),
        cy + r * Math.sin(a0),
        cx + r * Math.cos(a1),
        cy + r * Math.sin(a1),
        'F',
      )
    }
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
    ? (chart.series[0]?.data ?? []).map((d, i) => ({ name: String(d.x), color: COLORS[i % COLORS.length] }))
    : chart.series.map((s, i) => ({ name: s.name, color: seriesColor(s, i) }))
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  let lx = x
  const ly = y + 6
  for (const item of items) {
    const rgb = hexToRgb(item.color)
    doc.setFillColor(...rgb)
    doc.rect(lx, ly - 6, 8, 8, 'F')
    doc.setTextColor(17, 24, 39)
    doc.text(item.name, lx + 11, ly)
    const tw = doc.getTextWidth(item.name)
    lx += 22 + tw
    if (lx > x + width - 40) break
  }
}
