import { afterEach, describe, expect, it, vi } from 'vitest'
import { calculatePValue } from '@/calculators/math/pValue/calculate'
import { validatePValue } from '@/calculators/math/pValue/validation'
import { calculateGcfLcm } from '@/calculators/math/gcfLcm/calculate'
import { generateRandomNumbers, randomInt } from './random'

afterEach(() => vi.unstubAllGlobals())
const inference = {mode:'tTest' as const,sampleMean:5,hypothesizedMean:0,sampleSd:1,sampleSize:30}
const random = {min:0,max:100,count:10,integer:true,unique:false}

describe('bounded statistical calculations', () => {
  it.each([0, -1, NaN, Infinity, undefined])('rejects a t-test SD of %s before calculating', (sampleSd) => {
    const input = {...inference,sampleSd}
    expect(validatePValue(input).valid).toBe(false)
    expect(() => calculatePValue(input)).toThrow(/SD/)
  })
  it('bounds chart size even for enormous finite statistics', () => {
    const r = calculatePValue({...inference,sampleMean:1e100})
    expect(r.distributionPoints).toHaveLength(241)
    expect(r.distributionPoints.every(p => Number.isFinite(p.x) && Number.isFinite(p.y))).toBe(true)
    expect(r.warnings?.join(' ')).toContain('outside')
    expect(r.pValue).toBe(0)
    expect(r.shadedRegion).toHaveLength(0)
  })
  it('rejects missing values, fractional counts and arithmetic overflow', () => {
    expect(validatePValue({...inference,sampleMean:undefined}).valid).toBe(false)
    expect(validatePValue({...inference,sampleSize:1.5}).valid).toBe(false)
    expect(() => calculatePValue({...inference,sampleMean:1e308,hypothesizedMean:-1e308})).toThrow(/numerical range/)
  })
})

describe('bounded random generation', () => {
  it('rejects oversized integer ranges immediately', () => {
    expect(() => randomInt(0, 2 ** 32)).toThrow(/range/)
    expect(() => generateRandomNumbers({...random,max:2 ** 32})).toThrow(/range/)
  })
  it('samples a small unique set from the full 32-bit range without allocating the range', () => {
    const values = generateRandomNumbers({...random,max:2 ** 32 - 1,count:1000,unique:true})
    expect(values).toHaveLength(1000)
    expect(new Set(values).size).toBe(1000)
    expect(values.every(value => value >= 0 && value < 2 ** 32 && Number.isInteger(value))).toBe(true)
  })
  it('samples a complete small range without duplicates, including both endpoints', () => {
    const values = generateRandomNumbers({...random,min:-5,max:5,count:11,unique:true})
    expect(values.sort((a,b) => a-b)).toEqual([-5,-4,-3,-2,-1,0,1,2,3,4,5])
  })
  it.each([NaN, Infinity, 0, 1.5, 10001])('rejects count %s', (count) => {
    expect(() => generateRandomNumbers({...random,count})).toThrow(/count/)
  })
  it('stops if the random source repeatedly fails rejection sampling', () => {
    vi.stubGlobal('crypto',{getRandomValues:(buf:Uint32Array) => {buf[0]=0xffffffff; return buf}})
    expect(() => randomInt(0, 2 ** 31)).toThrow(/random source/)
  })
})

describe('bounded integer factorization', () => {
  it('keeps GCF and LCM exact when optional prime factorization exceeds its budget', () => {
    const n = 1000000007n * 1000000009n
    const result = calculateGcfLcm({values:`${n},${n * 2n}`})
    expect(result.gcf).toBe(n)
    expect(result.lcm).toBe(n * 2n)
    expect(result.warnings?.[0]).toContain('remain exact')
    expect(result.primeFactors[0].factors).toContain('limit')
  })
  it('rejects excessive input sizes before parsing large integers', () => {
    expect(() => calculateGcfLcm({values:`${'9'.repeat(101)},2`})).toThrow(/100 digits/)
    expect(() => calculateGcfLcm({values:Array(21).fill('2').join(',')})).toThrow(/20 integers/)
  })
})
