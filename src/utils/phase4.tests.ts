import { describe, it, expect } from 'vitest'
import { Fraction } from './fractions'
import { convertBase, parseIntegerPart, encodeIntegerPart } from './baseConvert'
import { parseDataset, computeDescriptiveStats } from './statistics'
import { normalCDF, twoSidedPValue } from './distributions'
import { gcdBigInt, lcmBigInt, gcdMultiple } from './gcd'
import { generateRandomNumbers } from './random'
import { parseIsoDate, dateDifference, addToDate, isLeapYear } from './dates'
import { convertUnits } from '@/units/convert'

describe('fractions', () => {
  it('simplifies fractions', () => {
    expect(new Fraction(4n, 8n).toImproperString()).toBe('1/2')
  })
  it('handles negative fractions', () => {
    expect(new Fraction(-3n, 4n).toImproperString()).toBe('-3/4')
  })
  it('adds fractions', () => {
    expect(new Fraction(1n, 2n).add(new Fraction(1n, 3n)).toImproperString()).toBe('5/6')
  })
})

describe('baseConvert', () => {
  it('converts binary to decimal', () => {
    expect(parseIntegerPart('1010', 2)).toBe(10n)
    expect(encodeIntegerPart(255n, 16)).toBe('FF')
  })
  it('converts large integers', () => {
    const r = convertBase('FFFFFFFF', 16, 10)
    expect(r.integerPart).toBe('4294967295')
  })
})

describe('statistics', () => {
  it('computes population and sample SD', () => {
    const stats = computeDescriptiveStats(parseDataset('2,4,4,4,5,5,7,9'))
    expect(stats.populationSd).toBeCloseTo(2, 5)
    expect(stats.sampleSd).toBeCloseTo(2.138, 2)
  })
  it('rejects empty dataset', () => {
    expect(() => computeDescriptiveStats([])).toThrow()
  })
})

describe('distributions', () => {
  it('computes normal CDF reference', () => {
    expect(normalCDF(0)).toBeCloseTo(0.5, 5)
    expect(normalCDF(1.96)).toBeCloseTo(0.975, 2)
  })
  it('computes two-sided p-value', () => {
    const p = twoSidedPValue(normalCDF, 1.96)
    expect(p).toBeCloseTo(0.05, 2)
  })
})

describe('gcd', () => {
  it('follows conventions', () => {
    expect(gcdBigInt(0n, 12n)).toBe(12n)
    expect(lcmBigInt(0n, 12n)).toBe(0n)
    expect(gcdMultiple([48n, 18n, 30n])).toBe(6n)
  })
})

describe('random', () => {
  it('validates unique range', () => {
    expect(() =>
      generateRandomNumbers({ min: 1, max: 3, count: 5, integer: true, unique: true }),
    ).toThrow()
  })
})

describe('dates', () => {
  it('handles leap year', () => {
    expect(isLeapYear(2024)).toBe(true)
    expect(isLeapYear(2023)).toBe(false)
  })
  it('handles Feb 29', () => {
    expect(() => parseIsoDate('2023-02-29')).toThrow()
    expect(parseIsoDate('2024-02-29').day).toBe(29)
  })
  it('clamps Jan 31 + one month', () => {
    const result = addToDate(parseIsoDate('2024-01-31'), { months: 1 })
    expect(result).toEqual({ year: 2024, month: 2, day: 29 })
  })
  it('computes date difference', () => {
    const diff = dateDifference(parseIsoDate('2024-01-01'), parseIsoDate('2024-03-15'))
    expect(diff.totalDays).toBe(74)
  })
})

describe('units', () => {
  it('converts temperature', () => {
    expect(convertUnits(32, 'f', 'c')).toBeCloseTo(0, 5)
    expect(convertUnits(100, 'c', 'f')).toBeCloseTo(212, 5)
  })
  it('converts area', () => {
    expect(convertUnits(1, 'm2', 'ft2')).toBeCloseTo(10.7639, 3)
  })
  it('converts volume', () => {
    expect(convertUnits(1, 'm3', 'l')).toBeCloseTo(1000, 5)
  })
})
