// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import InterestRatePage from './InterestRatePage'
import { DEFAULT_SETTINGS } from '@/calculators/types'

vi.mock('@/app/providers', () => ({ useApp: () => ({ settings: DEFAULT_SETTINGS, favorites: [], toggleFavorite: () => false }) }))
vi.mock('@/persistence/history', () => ({ saveHistoryRecord: vi.fn().mockResolvedValue(null) }))
vi.mock('@/persistence/saved', () => ({ saveCalculation: vi.fn().mockResolvedValue(null), getSavedCalculations: vi.fn().mockResolvedValue([]) }))
vi.mock('@/utils/csv', () => ({ downloadCsv: vi.fn() }))
vi.mock('@/exports/pdf', () => ({ downloadPdf: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/components/calculator/ChartPanel', () => ({ ChartPanel: () => <div /> }))

let root: Root
let container: HTMLDivElement
const input = (id: string) => container.querySelector<HTMLInputElement>(`#${id}`)!
const summary = () => container.querySelector('.result-summary')?.textContent ?? ''
async function type(id: string, value: string) {
  await act(async () => {
    const node = input(id)
    node.focus()
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(node, value)
    node.dispatchEvent(new Event('input', { bubbles: true }))
  })
}
async function settle(ms = 300) {
  await act(async () => { await vi.advanceTimersByTimeAsync(ms) })
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  localStorage.clear()
  sessionStorage.clear()
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
  vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => setTimeout(() => fn(0), 0))
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
})
afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('interest rate auto-calculate', () => {
  it('shows an estimate on load and updates without a Calculate button', async () => {
    await act(async () => { root.render(<InterestRatePage />) })
    await settle()
    expect(container.querySelector('.calculator-submit')).toBeNull()
    expect(container.textContent).not.toContain('Inputs changed')
    const initial = summary()
    expect(initial).toMatch(/\d+\.\d+%/)
    await type('payment', '1500')
    expect(container.textContent).not.toContain('Inputs changed')
    expect(document.activeElement).toBe(input('payment'))
    await settle()
    expect(summary()).toMatch(/\d+\.\d+%/)
    expect(summary()).not.toBe(initial)
  })
})
