import { absBigInt, gcdBigInt } from './gcd'

export class Fraction {
  readonly num: bigint
  readonly den: bigint

  constructor(num: bigint, den: bigint) {
    if (den === 0n) throw new Error('Denominator cannot be zero')
    const g = gcdBigInt(num, den)
    const sign = den < 0n ? -1n : 1n
    this.num = (num / g) * sign
    this.den = absBigInt(den / g)
  }

  static zero(): Fraction {
    return new Fraction(0n, 1n)
  }

  static fromDecimal(value: number, maxDen = 1_000_000n): Fraction {
    if (!Number.isFinite(value)) throw new Error('Invalid decimal')
    const sign = value < 0 ? -1n : 1n
    const abs = Math.abs(value)
    let bestNum = 0n
    let bestDen = 1n
    let bestErr = Infinity
    for (let den = 1n; den <= maxDen; den *= 10n) {
      const num = BigInt(Math.round(abs * Number(den)))
      const err = Math.abs(abs - Number(num) / Number(den))
      if (err < bestErr) {
        bestErr = err
        bestNum = num
        bestDen = den
      }
    }
    return new Fraction(sign * bestNum, bestDen)
  }

  static parse(input: string): Fraction {
    const s = input.trim().replace(/\s+/g, ' ')
    if (!s) throw new Error('Empty fraction')

    const mixed = s.match(/^(-?\d+)\s+(\d+)\/(\d+)$/)
    if (mixed) {
      const whole = BigInt(mixed[1])
      const num = BigInt(mixed[2])
      const den = BigInt(mixed[3])
      const sign = whole < 0n ? -1n : 1n
      const absWhole = absBigInt(whole)
      return new Fraction(sign * (absWhole * den + num), den)
    }

    const improper = s.match(/^(-?\d+)\/(\d+)$/)
    if (improper) {
      return new Fraction(BigInt(improper[1]), BigInt(improper[2]))
    }

    if (/^-?\d+$/.test(s)) {
      return new Fraction(BigInt(s), 1n)
    }

    const decimal = Number(s)
    if (Number.isFinite(decimal)) return Fraction.fromDecimal(decimal)

    throw new Error('Invalid fraction format')
  }

  add(other: Fraction): Fraction {
    return new Fraction(this.num * other.den + other.num * this.den, this.den * other.den)
  }

  sub(other: Fraction): Fraction {
    return new Fraction(this.num * other.den - other.num * this.den, this.den * other.den)
  }

  mul(other: Fraction): Fraction {
    return new Fraction(this.num * other.num, this.den * other.den)
  }

  div(other: Fraction): Fraction {
    if (other.num === 0n) throw new Error('Division by zero')
    return new Fraction(this.num * other.den, this.den * other.num)
  }

  toImproperString(): string {
    if (this.den === 1n) return this.num.toString()
    return `${this.num}/${this.den}`
  }

  toMixedString(): string {
    const sign = this.num < 0n ? '-' : ''
    const absNum = absBigInt(this.num)
    const whole = absNum / this.den
    const rem = absNum % this.den
    if (rem === 0n) return `${sign}${whole}`
    if (whole === 0n) return this.toImproperString()
    return `${sign}${whole} ${rem}/${this.den}`
  }

  toDecimal(): number {
    return Number(this.num) / Number(this.den)
  }
}
