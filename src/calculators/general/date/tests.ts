import { describe, it, expect } from 'vitest'
import { calculateDate } from './calculate'

describe('date', () => {
  it('computes date difference', () => {
    const r = calculateDate({ mode: 'difference', startDate: '2024-01-01', endDate: '2024-03-15' })
    expect(r.totalDays).toBe(74)
  })
  it('adds one month from Jan 31', () => {
    const r = calculateDate({ mode: 'addSubtract', startDate: '2024-01-31', months: 1 })
    expect(r.resultDate).toBe('2024-02-29')
  })
})
