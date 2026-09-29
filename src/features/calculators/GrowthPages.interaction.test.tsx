// @vitest-environment jsdom
import { act, type ComponentType } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import InvestmentPage from './InvestmentPage'
import CompoundInterestPage from './CompoundInterestPage'
import { DEFAULT_SETTINGS } from '@/calculators/types'

vi.mock('@/app/providers', () => ({ useApp: () => ({ settings: DEFAULT_SETTINGS, favorites: [], toggleFavorite: () => false }) }))
vi.mock('@/persistence/history', () => ({ saveHistoryRecord: vi.fn().mockResolvedValue(null) }))
vi.mock('@/persistence/saved', () => ({ saveCalculation: vi.fn().mockResolvedValue(null), getSavedCalculations: vi.fn().mockResolvedValue([]) }))
vi.mock('@/utils/csv', () => ({ downloadCsv: vi.fn() }))
vi.mock('@/exports/pdf', () => ({ downloadPdf: vi.fn().mockResolvedValue(undefined) }))
// Exercise real forms, hook, validation, engine and reports. SVG geometry needs a browser.
vi.mock('@/components/calculator/ChartPanel', () => ({ ChartPanel: () => <div /> }))

let root: Root
let container: HTMLDivElement
const input = (id: string) => container.querySelector<HTMLInputElement>(`#${id}`)!
const summary = () => container.querySelector('.result-summary')?.textContent ?? ''
function button(text: string) {
  const node = [...container.querySelectorAll('button')].find(node => node.textContent?.trim() === text)
  if (!node) throw new Error(`Button not found: ${text}`)
  return node
}
async function click(node: HTMLElement) { await act(async () => { node.click() }) }
async function calculate() { await click(button('Calculate')); await act(async () => { await vi.advanceTimersByTimeAsync(20) }) }
async function type(id: string, value: string) {
  await act(async () => {
    const node = input(id)
    node.focus()
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(node, value)
    node.dispatchEvent(new Event('input', { bubbles: true }))
  })
}
async function choose(id: string, value: string) {
  await act(async () => {
    const node = container.querySelector<HTMLSelectElement>(`#${id}`)!
    node.value = value
    node.dispatchEvent(new Event('change', { bubbles: true }))
  })
}
async function mount(Page: ComponentType) { await act(async () => { root.render(<Page />) }) }

beforeEach(() => {
  vi.useFakeTimers(); vi.clearAllMocks()
  localStorage.clear(); sessionStorage.clear()
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
  vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => setTimeout(() => fn(0), 0))
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
  container = document.createElement('div'); document.body.append(container); root = createRoot(container)
})
afterEach(async () => {
  await act(async () => root.unmount())
  container.remove(); vi.useRealTimers(); vi.unstubAllGlobals()
})

describe('P1 growth calculator form contracts', () => {
  it.each([{ Page: InvestmentPage, id: 'return-rate' }, { Page: CompoundInterestPage, id: 'interest-rate' }])('preserves negative rates for $id and calculates a loss', async ({ Page, id }) => {
    const { saveHistoryRecord } = await import('@/persistence/history')
    await mount(Page)
    await type(id, '−5')
    expect(input(id).value).toBe('-5')
    await calculate()
    const record = vi.mocked(saveHistoryRecord).mock.calls.at(-1)![0]
    expect(record.inputs).toMatchObject({ [id === 'return-rate' ? 'returnRate' : 'interestRate']: -5 })
    const result = record.results as Record<string, number>
    expect(result.investmentEarnings ?? result.interestEarned).toBeLessThan(0)
  })
  it('preserves typed/pasted withdrawals and the optional sign toggle', async () => {
    const { saveHistoryRecord } = await import('@/persistence/history')
    await mount(InvestmentPage); await type('periodic-contribution', '-200'); await calculate()
    expect(input('periodic-contribution').value).toBe('-200')
    expect(vi.mocked(saveHistoryRecord).mock.calls.at(-1)![0].inputs).toMatchObject({ periodicContribution: -200 })
    const group = input('periodic-contribution').closest('.space-y-1\\.5')!
    await click(group.querySelector('button')!)
    expect(input('periodic-contribution').value).toBe('200')
  })
  it('requires an explicit target, keeps it empty, and focuses its error', async () => {
    const { saveHistoryRecord } = await import('@/persistence/history')
    await mount(InvestmentPage); await choose('solve-for', 'pmt')
    expect(input('periodic-contribution')).toBeNull()
    expect(input('target-value').value).toBe('')
    await calculate()
    expect(input('target-value').getAttribute('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(input('target-value'))
    expect(container.textContent).toContain('highlighted field')
    expect(saveHistoryRecord).not.toHaveBeenCalled()
    await type('target-value', '300850.72'); await calculate()
    expect(summary()).toContain('Required contribution per month')
    expect(summary()).toContain('500.00')
    await type('target-value', ''); await calculate()
    expect(saveHistoryRecord).toHaveBeenCalledTimes(1)
    expect(input('target-value').getAttribute('aria-invalid')).toBe('true')
  })
  it('hides each unknown and ignores the inactive duration when solving time', async () => {
    await mount(InvestmentPage); await type('period', '0'); await choose('solve-for', 'periods')
    expect(input('period')).toBeNull()
    await type('target-value', '20000'); await calculate()
    expect(summary()).toContain('Time to target')
    await choose('solve-for', 'rate')
    expect(input('return-rate')).toBeNull()
    expect(input('period')).not.toBeNull()
  })
  it('exposes frequency, applies it, and saves the convention with the snapshot', async () => {
    const { saveHistoryRecord } = await import('@/persistence/history')
    await mount(InvestmentPage); await choose('contribution-frequency', 'weekly')
    expect(container.querySelector('label[for="periodic-contribution"]')?.textContent).toBe('Contribution per week')
    await type('return-rate', '0'); await type('period', '1'); await calculate()
    expect(summary()).toContain('36,000.00')
    const record = vi.mocked(saveHistoryRecord).mock.calls.at(-1)![0]
    expect(record.inputs).toMatchObject({ contributionFrequency: 'weekly', rateConvention: 'nominal-annual' })
  })
  it('shows compound duration errors and recovers without an unexplained empty result', async () => {
    await mount(CompoundInterestPage); await type('duration', '-1'); await calculate()
    expect(input('duration').value).toBe('-1')
    expect(input('duration').getAttribute('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(input('duration'))
    expect(container.textContent).toContain('duration greater than zero')
    await type('duration', '10'); await calculate()
    expect(summary()).toContain('54,713.58')
  })
  it('rejects a blank required rate instead of treating it as zero', async () => {
    await mount(InvestmentPage); await type('return-rate', ''); await calculate()
    expect(input('return-rate').value).toBe('')
    expect(input('return-rate').getAttribute('aria-invalid')).toBe('true')
    expect(summary()).toBe('')
  })
  it('uses deposit/withdrawal mode instead of a signed contribution field', async () => {
    const { saveHistoryRecord } = await import('@/persistence/history')
    await mount(CompoundInterestPage)
    expect(input('contribution').value).toBe('200')
    expect(container.querySelector('button[aria-label="Negative value"]')).toBeNull()
    await click(button('Withdrawal'))
    expect(input('contribution').value).toBe('200')
    await type('contribution', '150')
    await calculate()
    expect(vi.mocked(saveHistoryRecord).mock.calls.at(-1)![0].inputs).toMatchObject({ contribution: -150 })
    expect(container.textContent).toContain('Net capital')
    await click(button('Deposit'))
    expect(input('contribution').value).toBe('150')
  })
  it('reports depletion and exports the unmet withdrawals', async () => {
    const { downloadCsv } = await import('@/utils/csv')
    await mount(CompoundInterestPage)
    await type('principal', '100')
    await click(button('Withdrawal'))
    await type('contribution', '200')
    await type('interest-rate', '0')
    await type('duration', '1')
    await calculate()
    expect(container.textContent).toContain('Funds are depleted on 2026-02-01')
    expect(container.textContent).toContain('Net capital')
    expect(container.textContent).toContain('Unmet withdrawals')
    await click(button('CSV data'))
    const csv = vi.mocked(downloadCsv).mock.calls.at(-1)![1]
    expect(csv).toContain('Unmet withdrawals')
    expect(csv).toContain('2300')
    expect(csv).toContain('nominal-annual')
    expect(csv).toContain('nominal annual with monthly compounding')
  })
})
