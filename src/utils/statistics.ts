export function parseDataset(input: string): number[] {
  const values: number[] = []
  const lines = input.split(/[\n,;]+/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const n = Number(trimmed)
    if (!Number.isFinite(n)) throw new Error(`Invalid number: "${trimmed}"`)
    values.push(n)
  }
  return values
}

export interface DescriptiveStats {
  count: number
  sum: number
  mean: number
  min: number
  max: number
  range: number
  populationVariance: number
  sampleVariance: number
  populationSd: number
  sampleSd: number
}

export function computeDescriptiveStats(values: number[]): DescriptiveStats {
  if (values.length === 0) throw new Error('Dataset cannot be empty')

  let count = 0
  let mean = 0
  let m2 = 0
  let sum = 0
  let min = Infinity
  let max = -Infinity

  for (const x of values) {
    count++
    sum += x
    if (x < min) min = x
    if (x > max) max = x
    const delta = x - mean
    mean += delta / count
    const delta2 = x - mean
    m2 += delta * delta2
  }

  const populationVariance = m2 / count
  const sampleVariance = count >= 2 ? m2 / (count - 1) : NaN

  return {
    count,
    sum,
    mean,
    min,
    max,
    range: max - min,
    populationVariance,
    sampleVariance,
    populationSd: Math.sqrt(populationVariance),
    sampleSd: count >= 2 ? Math.sqrt(sampleVariance) : NaN,
  }
}

export function buildHistogramBins(values: number[], binCount = 8): Array<{ bin: string; count: number }> {
  if (values.length === 0) return []
  const min = Math.min(...values)
  const max = Math.max(...values)
  if (min === max) return [{ bin: String(min), count: values.length }]
  const width = (max - min) / binCount
  const bins = Array.from({ length: binCount }, () => 0)
  for (const v of values) {
    let idx = Math.floor((v - min) / width)
    if (idx >= binCount) idx = binCount - 1
    bins[idx]++
  }
  return bins.map((count, i) => {
    const lo = min + i * width
    const hi = lo + width
    return { bin: `${lo.toFixed(2)}–${hi.toFixed(2)}`, count }
  })
}
