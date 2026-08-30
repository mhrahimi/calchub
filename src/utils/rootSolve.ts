/** Brent's method for root finding on f(x)=0 in [a,b] */
export function brentSolve(
  f: (x: number) => number,
  a: number,
  b: number,
  tolerance = 1e-10,
  maxIter = 100,
): number | null {
  let fa = f(a)
  let fb = f(b)
  if (fa * fb > 0) return null

  if (Math.abs(fa) < Math.abs(fb)) {
    ;[a, b] = [b, a]
    ;[fa, fb] = [fb, fa]
  }

  let c = a
  let fc = fa
  let d = a
  let mFlag = true

  for (let iter = 0; iter < maxIter; iter++) {
    if (Math.abs(fb) < tolerance || Math.abs(b - a) < tolerance) return b

    let s: number
    if (fa !== fc && fb !== fc) {
      s =
        (a * fb * fc) / ((fa - fb) * (fa - fc)) +
        (b * fa * fc) / ((fb - fa) * (fb - fc)) +
        (c * fa * fb) / ((fc - fa) * (fc - fb))
    } else {
      s = b - (fb * (b - a)) / (fb - fa)
    }

    const cond1 = s <= (3 * a + b) / 4 || s >= b
    const cond2 = mFlag && Math.abs(s - b) >= Math.abs(b - c) / 2
    const cond3 = !mFlag && Math.abs(s - b) >= Math.abs(c - d) / 2
    const cond4 = mFlag && Math.abs(b - c) < tolerance
    const cond5 = !mFlag && Math.abs(c - d) < tolerance

    if (cond1 || cond2 || cond3 || cond4 || cond5) {
      s = (a + b) / 2
      mFlag = true
    } else {
      mFlag = false
    }

    const fs = f(s)
    d = c
    c = b
    fc = fb

    if (fa * fs < 0) {
      b = s
      fb = fs
    } else {
      a = s
      fa = fs
    }

    if (Math.abs(fa) < Math.abs(fb)) {
      ;[a, b] = [b, a]
      ;[fa, fb] = [fb, fa]
    }
  }

  return b
}

/** Find bracket [lo, hi] where f changes sign, then solve */
export function findRate(
  objective: (rate: number) => number,
  initialGuess = 0.05,
): number | null {
  let lo = 0.0001
  let hi = initialGuess

  let fLo = objective(lo)
  let fHi = objective(hi)

  if (fLo * fHi > 0) {
    hi = 0.5
    fHi = objective(hi)
    if (fLo * fHi > 0) {
      hi = 2
      fHi = objective(hi)
      if (fLo * fHi > 0) return null
    }
  }

  return brentSolve(objective, lo, hi)
}

/** Solve loan rate: PV = PMT * (1-(1+r)^(-n))/r + FV/(1+r)^n */
export function solveLoanRate(
  principal: number,
  payment: number,
  periods: number,
  balloon = 0,
): number | null {
  const objective = (r: number) => {
    if (r === 0) return principal - payment * periods - balloon
    const factor = Math.pow(1 + r, periods)
    const pvPmt = (payment * (factor - 1)) / (r * factor)
    const pvBalloon = balloon / factor
    return principal - pvPmt - pvBalloon
  }
  return findRate(objective)
}
