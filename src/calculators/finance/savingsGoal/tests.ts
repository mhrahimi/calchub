import { describe, it, expect } from 'vitest'
import { calculateSavingsGoal } from './calculate'
import { validateSavingsGoal } from './validation'

describe('savings goal', () => {
  it('calculates required contribution to hit the goal', () => {
    const r = calculateSavingsGoal({
      solveFor: 'contribution',
      currentSavings: 5000,
      goalAmount: 50000,
      returnRate: 6,
      period: 10,
      periodUnit: 'years',
      contributionFrequency: 'monthly',
    })
    expect(r.requiredContribution).toBeGreaterThan(0)
    expect(r.projectedBalance).toBeCloseTo(50000, -2)
    expect(r.schedule.at(-1)!.balance).toBeCloseTo(r.projectedBalance, -1)
  })

  it('solves time from a given contribution', () => {
    const r = calculateSavingsGoal({
      solveFor: 'time',
      currentSavings: 5000,
      goalAmount: 50000,
      returnRate: 6,
      period: 10,
      periodUnit: 'years',
      contributionFrequency: 'monthly',
      periodicContribution: 300,
    })
    expect(r.timeToGoal).toBeGreaterThan(0)
    expect(r.timeToGoal).toBeLessThan(30)
    expect(r.projectedBalance).toBeGreaterThanOrEqual(50000 - 50)
  })

  it('projects balance from a given contribution and horizon', () => {
    const r = calculateSavingsGoal({
      solveFor: 'balance',
      currentSavings: 5000,
      goalAmount: 50000,
      returnRate: 6,
      period: 10,
      periodUnit: 'years',
      contributionFrequency: 'monthly',
      periodicContribution: 200,
    })
    expect(r.projectedBalance).not.toBeCloseTo(50000, -2)
    expect(r.projectedBalance).toBeGreaterThan(5000)
  })

  it('accepts a negative contribution as a withdrawal', () => {
    const v = validateSavingsGoal({
      solveFor: 'balance',
      currentSavings: 50000,
      goalAmount: 10000,
      returnRate: 4,
      period: 5,
      periodUnit: 'years',
      contributionFrequency: 'monthly',
      periodicContribution: -200,
    })
    expect(v.valid).toBe(true)

    const r = calculateSavingsGoal({
      solveFor: 'balance',
      currentSavings: 50000,
      goalAmount: 10000,
      returnRate: 4,
      period: 5,
      periodUnit: 'years',
      contributionFrequency: 'monthly',
      periodicContribution: -200,
    })
    expect(r.requiredContribution).toBe(-200)
    expect(r.projectedBalance).toBeLessThan(50000)
  })

  it('solves for a negative contribution when current savings exceed the goal', () => {
    const r = calculateSavingsGoal({
      solveFor: 'contribution',
      currentSavings: 100000,
      goalAmount: 50000,
      returnRate: 4,
      period: 10,
      periodUnit: 'years',
      contributionFrequency: 'monthly',
    })
    expect(r.requiredContribution).toBeLessThan(0)
    expect(r.projectedBalance).toBeCloseTo(50000, -2)
  })
})
