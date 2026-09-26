import { describe, it, expect } from 'vitest'
import { parseCalculationData, stringifyCalculationData } from './calculationJson'

describe('calculation JSON transport', () => {
  it('preserves exact integers, exceptional numbers, undefined and marker-like user data', () => {
    const value = {exact:900719925474099312345n,bounds:[Infinity,-Infinity,NaN,-0],optional:undefined,
      label:['bigint','42'],object:{format:'calchub-calculation-json',version:1,value:'user content'}}
    expect(parseCalculationData(stringifyCalculationData(value))).toEqual(value)
  })
  it('reads ordinary legacy JSON and rejects unsupported transport versions', () => {
    expect(parseCalculationData('{"value":42}')).toEqual({value:42})
    expect(() => parseCalculationData('{"format":"calchub-calculation-json","version":999,"value":42}')).toThrow(/version/)
  })
  it('rejects malformed tagged values without interpreting strings as executable data', () => {
    const raw = JSON.parse(stringifyCalculationData(1n))
    raw.value = ['bigint', 'not an integer']
    expect(() => parseCalculationData(JSON.stringify(raw))).toThrow(/Invalid/)
  })
})
