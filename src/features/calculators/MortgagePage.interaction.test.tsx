// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import MortgagePage from './MortgagePage'
import { DEFAULT_SETTINGS, type AppSettings } from '@/calculators/types'
import { calculateMortgage, explainMortgage } from '@/calculators/finance/mortgage/calculate'
import { resultMetadata } from '@/exports/resultMetadata'
import { captureProvenance } from '@/exports/provenance'
import { setPendingRestore } from '@/persistence/restore'
import type { MortgageInput } from '@/calculators/finance/mortgage/types'

let settings: AppSettings = { ...DEFAULT_SETTINGS }
vi.mock('@/app/providers', () => ({ useApp: () => ({ settings, favorites: [], toggleFavorite: () => false }) }))
vi.mock('@/persistence/history', () => ({ saveHistoryRecord: vi.fn().mockResolvedValue(null) }))
vi.mock('@/persistence/saved', () => ({ saveCalculation: vi.fn().mockResolvedValue(null), getSavedCalculations: vi.fn().mockResolvedValue([]) }))
vi.mock('@/utils/csv', () => ({ downloadCsv: vi.fn() }))
vi.mock('@/exports/pdf', () => ({ downloadPdf: vi.fn().mockResolvedValue(undefined) }))
// Real input, hook, layout, data table and result components run together. SVG layout is browser-only.
vi.mock('@/components/calculator/ChartPanel', () => ({ ChartPanel: ({ data }: { data: { title: string; series: { data: unknown[] }[] } }) => <div data-chart={data.title} data-points={data.series[0].data.length} /> }))

let root: Root
let container: HTMLDivElement
const inputById = (id: string) => container.querySelector<HTMLInputElement>(`#${id}`)!
const amount = () => container.querySelector('.mortgage-hero-amount')?.textContent
function button(text: string) {
  const found = [...container.querySelectorAll('button')].find(node => node.textContent?.trim() === text)
  if (!found) throw new Error(`Button not found: ${text}`)
  return found
}
async function click(element: HTMLElement) { await act(async () => { element.click() }) }
async function type(id: string, value: string) {
  await act(async () => {
    const input = inputById(id)
    input.focus()
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}
async function settle(ms = 300) { await act(async () => { await vi.advanceTimersByTimeAsync(ms) }) }
async function mount() { await act(async () => { root.render(<MortgagePage />) }) }

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  settings = { ...DEFAULT_SETTINGS }
  localStorage.clear(); sessionStorage.clear()
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }))
  HTMLElement.prototype.scrollIntoView = vi.fn()
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
  container = document.createElement('div'); document.body.append(container); root = createRoot(container)
})
afterEach(async () => {
  await act(async () => root.unmount())
  container.remove(); vi.useRealTimers(); vi.unstubAllGlobals()
})

describe('mortgage interactions', () => {
  it('updates after typing without a stale-results warning, calculate button, or focus jump', async () => {
    await mount()
    expect(amount()).toContain('$2,528.27')
    await type('interest-rate', '5')
    expect(container.textContent).not.toContain('Inputs changed')
    expect(container.textContent).not.toContain('Update estimate')
    expect(container.querySelector('.calculator-submit')).toBeNull()
    await settle()
    expect(amount()).toContain('$2,147.29')
    expect(document.activeElement).toBe(inputById('interest-rate'))
    expect(button('Save').disabled).toBe(false)
    expect(container.querySelector('[aria-label="Calculation results"]')?.getAttribute('aria-busy')).toBe('false')
  })

  it('cancels older edits and never exports a stale estimate', async () => {
    const { downloadCsv } = await import('@/utils/csv')
    await mount()
    await type('interest-rate', '4'); await settle(100)
    await type('interest-rate', '5'); await settle(100)
    await type('interest-rate', '7')
    expect(button('CSV data').disabled).toBe(true)
    await settle()
    expect(amount()).toContain('$2,661.21')
    await click(button('CSV data'))
    expect(downloadCsv).toHaveBeenCalledOnce()
    expect(vi.mocked(downloadCsv).mock.calls[0][1]).toContain('2661.21')
  })

  it('shows inline invalid-input feedback and recovers without taking focus', async () => {
    await mount(); await type('home-price', '0'); await settle()
    expect(inputById('home-price').getAttribute('aria-invalid')).toBe('true')
    expect(amount()).toBeUndefined()
    expect(document.activeElement).toBe(inputById('home-price'))
    await type('home-price', '650000'); await settle()
    expect(inputById('home-price').getAttribute('aria-invalid')).toBe('false')
    expect(amount()).toContain('$3,286.75')
  })

  it('uses app currency and country defaults, with no repeated codes in the results', async () => {
    settings = { ...DEFAULT_SETTINGS, country: 'CA', currency: 'CAD', numberFormat: 'en-CA' }
    await mount()
    expect(button('Canada').getAttribute('aria-pressed')).toBe('true')
    expect(container.querySelector('.mortgage-results')?.textContent).not.toMatch(/CAD|USD/)
    expect(container.querySelector('.mortgage-form')?.textContent).not.toMatch(/CAD|USD/)
    await click(button('United States')); await settle()
    expect(amount()).toContain('$2,528.27')
    settings = { ...settings, currency: 'EUR' }
    await type('interest-rate', '5'); await settle()
    expect(amount()).toContain('€2,147.29')
  })

  it('preserves the amount when switching down-payment units', async () => {
    await mount()
    const units = container.querySelector('[aria-label="Down payment units"]')!
    await click(units.querySelectorAll('button')[1]); await settle()
    expect(inputById('mortgage-down-payment').value).toBe('100,000')
    expect(amount()).toContain('$2,528.27')
    await click(units.querySelectorAll('button')[0]); await settle()
    expect(inputById('mortgage-down-payment').value).toBe('20')
    expect(amount()).toContain('$2,528.27')
  })

  it('renders every payment in a fixed-height, keyboard-scrollable schedule', async () => {
    await mount()
    expect(container.querySelector('[data-chart="Remaining balance"]')?.getAttribute('data-points')).toBe('361')
    await click(button('Schedule')); await click(button('By month'))
    const region = container.querySelector('[role="region"][aria-label="Monthly repayment schedule"]')!
    expect(region.classList.contains('h-96')).toBe(true)
    expect(region.classList.contains('overflow-y-auto')).toBe(true)
    expect(region.getAttribute('tabindex')).toBe('0')
    expect(region.querySelectorAll('tbody tr')).toHaveLength(360)
    expect(region.querySelector('thead th')?.classList.contains('top-0')).toBe(true)
    expect(region.querySelector('tbody tr:last-child')?.textContent).toContain('$0.00')
    expect(region.textContent).not.toMatch(/CAD|USD/)
    expect(container.textContent).not.toMatch(/Next rows|Previous rows|Next page/)
    await click(button('By loan year'))
    expect(container.querySelectorAll('.mortgage-schedule tbody tr')).toHaveLength(30)
  })

  it('applies payoff targets, updates extras and keeps navigation on the selected view', async () => {
    await mount(); await click(button('Pay off sooner'))
    await click(container.querySelector<HTMLButtonElement>('[aria-label="Apply 15 year payoff plan"]')!)
    expect(inputById('monthly-extra-payment').value).not.toBe('0')
    expect(container.textContent).toContain('Your extra payments make a difference')
    expect(button('Pay off sooner').getAttribute('aria-pressed')).toBe('true')
    await click(button('Schedule')); await click(button('By month'))
    expect(container.querySelectorAll('.mortgage-schedule tbody tr').length).toBeLessThanOrEqual(180)
  })

  it('validates dated extras and toggles costs without including disabled amounts', async () => {
    await mount()
    const checkboxes = container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')
    await click(checkboxes[0]); await settle()
    expect(amount()).toContain('$3,178.27')
    await act(async () => {
      const frequency = container.querySelector<HTMLSelectElement>('#tax-frequency')!
      frequency.value = 'monthly'; frequency.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await settle()
    expect(inputById('property-tax').value).toBe('500')
    expect(amount()).toContain('$3,178.27')
    await click(checkboxes[0]); await settle()
    expect(amount()).toContain('$2,528.27')
    await click(checkboxes[1]); await click(button('+ Add one-time payment'))
    await type('extra-payment-1', '1000')
    await act(async () => {
      const month = container.querySelector<HTMLSelectElement>('#extra-month-0')!
      const year = container.querySelector<HTMLSelectElement>('#extra-year-0')!
      month.value = '1'; month.dispatchEvent(new Event('change', { bubbles: true }))
      year.value = String(new Date().getFullYear() - 1); year.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await settle()
    expect(container.querySelector('#extra-month-0')?.getAttribute('aria-invalid')).toBe('true')
    await click(button('Remove payment')); await settle()
    expect(amount()).toContain('$2,528.27')
  })

  it('saves the current automatic result without filling history on every edit', async () => {
    const { saveCalculation } = await import('@/persistence/saved')
    const { saveHistoryRecord } = await import('@/persistence/history')
    await mount(); await type('interest-rate', '5'); await settle()
    expect(saveHistoryRecord).not.toHaveBeenCalled()
    await settle(1200)
    expect(saveHistoryRecord).toHaveBeenCalledOnce()
    await click(button('Save'))
    await act(async () => { container.querySelector('dialog form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })) })
    expect(saveCalculation).toHaveBeenCalledOnce()
    expect(vi.mocked(saveCalculation).mock.calls[0][0].inputs).toMatchObject({ interestRate: 5 })
    expect(vi.mocked(saveCalculation).mock.calls[0][0].results).toMatchObject({ principalAndInterest: 2147.29 })
  })

  it('compares current automatic estimates with a pinned baseline using compact amounts', async () => {
    await mount(); await click(button('Compare'))
    await click(button('Use current result'))
    await type('interest-rate', '5'); await settle()
    const comparison = container.querySelector('[aria-label="Scenario comparison"]')!
    expect(comparison.textContent).toContain('$2,528.27')
    expect(comparison.textContent).toContain('$2,147.29')
    expect(comparison.textContent).not.toMatch(/CAD|USD|then calculate again/)
  })

  it('keeps reopened snapshots intact and explains a currency mismatch only once', async () => {
    const input: MortgageInput = { country: 'CA', homePrice: 500000, downPayment: 20, downPaymentIsPercent: true, interestRate: 5, termYears: 30, termMonths: 0, includeTaxesAndCosts: false, propertyTax: 0, propertyTaxPeriod: 'annual', homeInsurance: 0, hoa: 0, pmi: 0, otherCosts: 0, includeExtraPayments: false }
    const raw = calculateMortgage(input)
    const metadata = resultMetadata('mortgage', raw, explainMortgage(input, raw))
    metadata.provenance = captureProvenance('mortgage', input, metadata, { ...settings, currency: 'CAD' }, raw)
    setPendingRestore({ mode: 'reopen', record: { id: 'saved-test', name: 'Saved mortgage', calculatorId: 'mortgage', inputs: input, results: { ...raw, metadata }, settingsVersion: 1, createdAt: '2026-01-01', updatedAt: '2026-01-01' } })
    await mount(); await settle(1000)
    expect(inputById('interest-rate').value).toBe('5')
    expect(container.querySelector('.mortgage-form')?.textContent).toContain('This saved estimate is in CAD; your app is set to USD.')
    expect(container.querySelector('.mortgage-results')?.textContent).not.toMatch(/CAD|USD/)
  })
})
