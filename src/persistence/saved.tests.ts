import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  saveCalculation,
  getSavedCalculations,
  searchSaved,
  renameSaved,
  deleteSaved,
  clearSaved,
} from './saved'

beforeEach(async () => {
  await clearSaved()
})

describe('saved persistence', () => {
  it('saves and retrieves calculations', async () => {
    await saveCalculation(
      {
        calculatorId: 'mortgage',
        inputs: { principal: 300000 },
        results: { payment: 1800 },
        settingsVersion: 1,
      },
      'Home Mortgage',
    )
    const all = await getSavedCalculations()
    expect(all).toHaveLength(1)
    expect(all[0].name).toBe('Home Mortgage')
  })

  it('searches by name', async () => {
    await saveCalculation(
      { calculatorId: 'loan', inputs: {}, results: {}, settingsVersion: 1 },
      'Auto Loan',
    )
    await saveCalculation(
      { calculatorId: 'retirement', inputs: {}, results: {}, settingsVersion: 1 },
      'Retirement at 60',
    )
    const matches = await searchSaved('retirement')
    expect(matches).toHaveLength(1)
    expect(matches[0].name).toBe('Retirement at 60')
  })

  it('renames and deletes', async () => {
    const saved = await saveCalculation(
      { calculatorId: 'loan', inputs: {}, results: {}, settingsVersion: 1 },
      'Old name',
    )
    await renameSaved(saved.id, 'New name')
    const all = await getSavedCalculations()
    expect(all[0].name).toBe('New name')
    await deleteSaved(saved.id)
    expect(await getSavedCalculations()).toHaveLength(0)
  })
})
