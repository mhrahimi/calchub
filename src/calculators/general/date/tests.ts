import { describe, it, expect } from 'vitest'
import { calculateDate } from './calculate'
import { addToDate, parseIsoDate, toIsoDate, dateDifference } from '@/utils/dates'
import { validateDate } from './validation'

describe('date', () => {
  it('computes date difference', () => {
    const r = calculateDate({ mode: 'difference', startDate: '2024-01-01', endDate: '2024-03-15' })
    expect(r.totalDays).toBe(74)
  })
  it('adds one month from Jan 31', () => {
    const r = calculateDate({ mode: 'addSubtract', startDate: '2024-01-31', months: 1 })
    expect(r.resultDate).toBe('2024-02-29')
  })
  it.each([
    ['2026-09-25', 1, '2026-09-26'],
    ['2026-01-01', -1, '2025-12-31'],
    ['2024-02-28', 1, '2024-02-29'],
    ['1900-02-28', 1, '1900-03-01'],
    ['2000-02-28', 2, '2000-03-01'],
    ['0000-01-01', 1, '0000-01-02'],
  ])('adds calendar days: %s + %s', (startDate, days, expected) => {
    expect(calculateDate({ mode: 'addSubtract', startDate, days }).resultDate).toBe(expected)
    expect(calculateDate({ mode: 'addSubtract', startDate: expected, days: -days }).resultDate).toBe(startDate)
  })
  it('supports mixed offsets and year boundaries', () => {
    expect(calculateDate({mode:'addSubtract',startDate:'2024-01-31',months:1,weeks:1,days:-1}).resultDate).toBe('2024-03-06')
    expect(() => addToDate(parseIsoDate('9999-12-31'), { days: 1 })).toThrow(/0000 and 9999/)
    expect(() => addToDate(parseIsoDate('0000-01-01'), { days: -1 })).toThrow(/0000 and 9999/)
    expect(validateDate({mode:'addSubtract',startDate:'2026-09-25',days:0.5}).valid).toBe(false)
  })
  it('uses clamped whole months and a nonnegative remainder', () => {
    const a = parseIsoDate('2026-01-31')
    const b = parseIsoDate('2026-03-01')
    expect(dateDifference(a, b)).toMatchObject({years:0,months:1,days:1,totalDays:29})
    expect(dateDifference(b, a)).toMatchObject({years:0,months:-1,days:-1,totalDays:-29})
    for (const start of ['1900-02-28','2000-02-29','2026-01-31','2026-12-31']) {
      const date = parseIsoDate(start)
      for (const days of [1, 28, 31, 365, 731]) {
        const end = addToDate(date, { days })
        const diff = dateDifference(date, end)
        expect(diff.days).toBeGreaterThanOrEqual(0)
        expect(diff.totalDays).toBe(days)
        expect(toIsoDate(addToDate(date, diff))).toBe(toIsoDate(end))
      }
    }
  })
})
