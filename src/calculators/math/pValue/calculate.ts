import {
  normalCDF,
  studentTCDF,
  studentTPdf,
  normalQuantile,
  studentTQuantile,
  oneSidedPValue,
  twoSidedPValue,
} from '@/utils/distributions'
import type { PValueInput, PValueResult, TailType } from './types'
import type { CalculationExplanation, ChartData, ChartSeries, TableData } from '@/calculators/types'

const CAVEAT = 'A p-value is not the probability that the null hypothesis is true.'

function normalPdf(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI)
}

function sampleCurve(
  pdf: (x: number) => number,
  lo: number,
  hi: number,
  step = 0.1,
): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = []
  for (let x = lo; x <= hi + 1e-9; x += step) {
    points.push({ x: Math.round(x * 10) / 10, y: pdf(x) })
  }
  return points
}

function buildReferenceCurve(
  pdf: (x: number) => number,
  stat: number,
  tail: TailType,
): {
  points: Array<{ x: number; y: number }>
  shaded: Array<{ x: number; y: number }>
  shadedLower: Array<{ x: number; y: number }>
} {
  const bound = Math.max(4, Math.abs(stat) + 1)
  const points = sampleCurve(pdf, -bound, bound)
  let shaded: Array<{ x: number; y: number }> = []
  let shadedLower: Array<{ x: number; y: number }> = []
  if (tail === 'two') {
    const crit = Math.abs(stat)
    shadedLower = sampleCurve(pdf, -bound, -crit)
    shaded = sampleCurve(pdf, crit, bound)
  } else if (tail === 'oneLower') {
    shadedLower = sampleCurve(pdf, -bound, stat)
  } else {
    shaded = sampleCurve(pdf, stat, bound)
  }
  return { points, shaded, shadedLower }
}

function wilsonInterval(phat: number, n: number, z: number) {
  const denom = 1 + (z * z) / n
  const center = phat + (z * z) / (2 * n)
  const margin = z * Math.sqrt((phat * (1 - phat)) / n + (z * z) / (4 * n * n))
  return {
    lower: (center - margin) / denom,
    upper: (center + margin) / denom,
  }
}

export function calculatePValue(input: PValueInput): PValueResult {
  const n = input.sampleSize!
  const tail = input.tail ?? 'two'

  if (input.mode === 'zTest') {
    const se = input.populationSd! / Math.sqrt(n)
    const z = (input.sampleMean! - input.hypothesizedMean!) / se
    const p =
      tail === 'two'
        ? twoSidedPValue(normalCDF, z)
        : oneSidedPValue(normalCDF, z, tail === 'oneLower' ? 'lower' : 'upper')
    const curve = buildReferenceCurve(normalPdf, z, tail)
    return {
      mode: input.mode,
      pValue: p,
      testStatistic: z,
      standardError: se,
      tail,
      distributionPoints: curve.points,
      shadedRegion: curve.shaded,
      shadedRegionLower: curve.shadedLower,
      caveat: CAVEAT,
    }
  }

  if (input.mode === 'tTest') {
    const se = input.sampleSd! / Math.sqrt(n)
    const t = (input.sampleMean! - input.hypothesizedMean!) / se
    const df = n - 1
    const cdf = (stat: number) => studentTCDF(stat, df)
    const p =
      tail === 'two'
        ? twoSidedPValue(cdf, t)
        : oneSidedPValue(cdf, t, tail === 'oneLower' ? 'lower' : 'upper')
    const curve = buildReferenceCurve((x) => studentTPdf(x, df), t, tail)
    return {
      mode: input.mode,
      pValue: p,
      testStatistic: t,
      standardError: se,
      degreesOfFreedom: df,
      tail,
      distributionPoints: curve.points,
      shadedRegion: curve.shaded,
      shadedRegionLower: curve.shadedLower,
      caveat: CAVEAT,
    }
  }

  if (input.mode === 'meanCi') {
    const level = (input.confidenceLevel ?? 95) / 100
    const alpha = 1 - level
    const df = n - 1
    const se = input.sampleSd! / Math.sqrt(n)
    const critical = studentTQuantile(1 - alpha / 2, df)
    const margin = critical * se
    const estimate = input.sampleMean!
    return {
      mode: input.mode,
      ciLower: estimate - margin,
      ciUpper: estimate + margin,
      marginOfError: margin,
      standardError: se,
      degreesOfFreedom: df,
      confidenceLevel: input.confidenceLevel ?? 95,
      estimate,
      distributionPoints: [],
      shadedRegion: [],
      caveat: CAVEAT,
    }
  }

  const level = (input.confidenceLevel ?? 95) / 100
  const z = normalQuantile(1 - (1 - level) / 2)
  const { lower, upper } = wilsonInterval(input.proportion!, n, z)
  return {
    mode: input.mode,
    ciLower: lower,
    ciUpper: upper,
    marginOfError: (upper - lower) / 2,
    confidenceLevel: input.confidenceLevel ?? 95,
    estimate: input.proportion,
    distributionPoints: [],
    shadedRegion: [],
    caveat: CAVEAT,
  }
}

export function explainPValue(input: PValueInput, result: PValueResult): CalculationExplanation {
  const assumptions = [result.caveat]
  if (input.mode === 'proportionCi') assumptions.push('Wilson score interval used for proportions.')
  if (input.mode === 'tTest' || input.mode === 'meanCi') assumptions.push('Student-t reference distribution.')
  return {
    title: 'Statistical inference',
    steps: [
      result.pValue !== undefined
        ? { label: 'p-value', result: result.pValue.toFixed(6) }
        : { label: 'Confidence interval', result: `[${result.ciLower!.toFixed(4)}, ${result.ciUpper!.toFixed(4)}]` },
      result.testStatistic !== undefined
        ? { label: 'Test statistic', result: result.testStatistic.toFixed(4) }
        : { label: 'Margin of error', result: result.marginOfError!.toFixed(4) },
    ],
    assumptions,
  }
}

export function buildPValueCharts(result: PValueResult): ChartData[] {
  if (result.ciLower !== undefined && result.ciUpper !== undefined) {
    const estimate = result.estimate ?? (result.ciLower + result.ciUpper) / 2
    return [{
      type: 'line',
      title: 'Confidence interval',
      series: [
        { name: 'Interval', data: [{ x: result.ciLower, y: 1 }, { x: result.ciUpper, y: 1 }], color: '#163B8C' },
        { name: 'Estimate', data: [{ x: estimate, y: 1 }], color: '#C07850' },
      ],
      xLabel: 'Estimate',
    }]
  }

  const series: ChartSeries[] = [
    { name: 'Density', data: result.distributionPoints.map((p) => ({ x: p.x, y: p.y })), color: '#94A3B8' },
  ]
  if (result.shadedRegionLower?.length) {
    series.push({
      name: 'Lower tail',
      data: result.shadedRegionLower.map((p) => ({ x: p.x, y: p.y })),
      color: '#163B8C',
    })
  }
  if (result.shadedRegion.length) {
    series.push({
      name: 'Upper tail',
      data: result.shadedRegion.map((p) => ({ x: p.x, y: p.y })),
      color: '#163B8C',
    })
  }
  return [{
    type: 'area',
    title: 'Reference distribution',
    series,
    xLabel: 'Statistic',
    yLabel: 'Density',
  }]
}

export function buildPValueTable(result: PValueResult): TableData {
  const rows: Record<string, string | number>[] = []
  if (result.pValue !== undefined) rows.push({ metric: 'p-value', value: result.pValue.toFixed(6) })
  if (result.testStatistic !== undefined) rows.push({ metric: 'Test statistic', value: result.testStatistic.toFixed(4) })
  if (result.standardError !== undefined) rows.push({ metric: 'Standard error', value: result.standardError.toFixed(6) })
  if (result.degreesOfFreedom !== undefined) rows.push({ metric: 'Degrees of freedom', value: result.degreesOfFreedom })
  if (result.ciLower !== undefined) rows.push({ metric: 'CI lower', value: result.ciLower.toFixed(4) })
  if (result.ciUpper !== undefined) rows.push({ metric: 'CI upper', value: result.ciUpper.toFixed(4) })
  if (result.confidenceLevel !== undefined) rows.push({ metric: 'Confidence level', value: `${result.confidenceLevel}%` })
  rows.push({ metric: 'Note', value: result.caveat })
  return {
    title: 'Results',
    columns: [
      { key: 'metric', label: 'Metric', align: 'left' },
      { key: 'value', label: 'Value', align: 'left' },
    ],
    rows,
  }
}
