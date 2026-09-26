import { describe, it, expect } from 'vitest'
import { usFederal2026 } from './federal'
import { applyProgressiveBrackets } from '../../engine/progressiveTax'
import type { FilingStatus } from '../../types'

// Independently published cumulative tax amounts: IRS Rev. Proc. 2025-32,
// section 4.01, Tables 1–4: https://www.irs.gov/pub/irs-drop/rp-25-32.pdf
const fixtures: Array<[FilingStatus, number[], number[]]> = [
  ['single', [12400,50400,105700,201775,256225,640600], [1240,5800,17966,41024,58448,192979.25]],
  ['married_joint', [24800,100800,211400,403550,512450,768700], [2480,11600,35932,82048,116896,206583.5]],
  ['qualifying_surviving_spouse', [24800,100800,211400,403550,512450,768700], [2480,11600,35932,82048,116896,206583.5]],
  ['married_separate', [12400,50400,105700,201775,256225,384350], [1240,5800,17966,41024,58448,103291.75]],
  ['head_of_household', [17700,67450,105700,201750,256200,640600], [1770,7740,16155,39207,56631,191171]],
]
describe('published 2026 federal tables', () => {
  it.each(fixtures)('matches every %s boundary and its adjacent rates', (status, boundaries, cumulative) => {
    const brackets = usFederal2026.bracketsByStatus![status]!
    expect(brackets.map(b => b.upper)).toEqual([...boundaries, Infinity])
    boundaries.forEach((income, index) => {
      expect(applyProgressiveBrackets(income, brackets).tax).toBe(cumulative[index])
      expect(applyProgressiveBrackets(income - 1, brackets).marginalRate).toBe(brackets[index].rate)
      expect(applyProgressiveBrackets(income + 1, brackets).marginalRate).toBe(brackets[index + 1].rate)
    })
  })
  it('corrects the audited MFS and HOH examples', () => {
    expect(applyProgressiveBrackets(500000, usFederal2026.bracketsByStatus!.married_separate!).tax).toBe(146082.25)
    expect(applyProgressiveBrackets(300000, usFederal2026.bracketsByStatus!.head_of_household!).tax).toBe(71961)
  })
})
