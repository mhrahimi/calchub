function erf(x: number): number {
  const sign = x < 0 ? -1 : 1
  const ax = Math.abs(x)
  const a1 = 0.254829592
  const a2 = -0.284496736
  const a3 = 1.421413741
  const a4 = -1.453152027
  const a5 = 1.061405429
  const p = 0.3275911
  const t = 1 / (1 + p * ax)
  const y =
    1 -
    (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax))
  return sign * y
}

export function normalCDF(z: number): number {
  return 0.5 * (1 + erf(z / Math.SQRT2))
}

export function normalQuantile(p: number): number {
  if (p <= 0 || p >= 1) throw new Error('Probability must be between 0 and 1')
  const a = [
    -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
    1.383577518672690e2, -3.066479806614716e1, 2.506628277459239e0,
  ]
  const b = [
    -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
    6.680131188771972e1, -1.328068155288572e1,
  ]
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838e0,
    -2.549732539343734e0, 4.374664141464968e0, 2.938163982698783e0,
  ]
  const d = [
    7.784695709041462e-3, 3.224671290700397e-1, 2.445134137142996e0,
    3.754408661907416e0,
  ]
  const pLow = 0.02425
  const pHigh = 1 - pLow
  let q: number
  let r: number
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p))
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
  }
  if (p <= pHigh) {
    q = p - 0.5
    r = q * q
    return (
      ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
    )
  }
  q = Math.sqrt(-2 * Math.log(1 - p))
  return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
    ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
}

function logGamma(z: number): number {
  const g = 7
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ]
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z)
  z -= 1
  let x = c[0]
  for (let i = 1; i < g + 2; i++) x += c[i] / (z + i)
  const t = z + g + 0.5
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x)
}

function betacf(a: number, b: number, x: number): number {
  const maxIter = 200
  const eps = 3e-7
  let am = 1
  let bm = 1
  let az = 1
  let qab = a + b
  let qap = a + 1
  let qam = a - 1
  let bz = 1 - (qab * x) / qap
  for (let m = 1; m <= maxIter; m++) {
    const em = m
    let tem = em + em
    let d = (em * (b - em) * x) / ((qam + tem) * (a + tem))
    am = 1 + d * am
    bm = 1 + d * bm
    d = (-(a + em) * (qab + em) * x) / ((a + tem) * (qap + tem))
    az = 1 + d * az
    bz = 1 + d * bz
    if (am !== 0) {
      const aRatio = az / am
      const bRatio = bz / bm
      if (Math.abs(aRatio - bRatio) < eps * Math.abs(aRatio)) return aRatio
      am = 1 / am
      bm = 1 / bm
      az = aRatio
      bz = bRatio
    }
  }
  return az
}

function betainc(a: number, b: number, x: number): number {
  if (x <= 0) return 0
  if (x >= 1) return 1
  const lnBeta = logGamma(a) + logGamma(b) - logGamma(a + b)
  const front = Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lnBeta) / a
  if (x < (a + 1) / (a + b + 2)) return front * betacf(a, b, x)
  return 1 - (Math.exp(Math.log(1 - x) * b + Math.log(x) * a - lnBeta) / b) * betacf(b, a, 1 - x)
}

export function studentTPdf(t: number, df: number): number {
  const logC = logGamma((df + 1) / 2) - logGamma(df / 2) - 0.5 * Math.log(df * Math.PI)
  return Math.exp(logC - ((df + 1) / 2) * Math.log(1 + (t * t) / df))
}

export function studentTCDF(t: number, df: number): number {
  const x = df / (df + t * t)
  const a = df / 2
  const b = 0.5
  const ib = betainc(a, b, x)
  return t >= 0 ? 1 - 0.5 * ib : 0.5 * ib
}

export function studentTQuantile(p: number, df: number): number {
  let lo = -100
  let hi = 100
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2
    if (studentTCDF(mid, df) < p) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

export function twoSidedPValue(cdf: (stat: number) => number, stat: number): number {
  return 2 * (1 - cdf(Math.abs(stat)))
}

export function oneSidedPValue(cdf: (stat: number) => number, stat: number, tail: 'lower' | 'upper'): number {
  return tail === 'lower' ? cdf(stat) : 1 - cdf(stat)
}
