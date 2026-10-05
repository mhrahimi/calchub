// @vitest-environment jsdom
import { act, type ComponentType } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS } from '@/calculators/types'
import LoanPage from './LoanPage'
import CompoundInterestPage from './CompoundInterestPage'
import IncomeTaxPage from './IncomeTaxPage'
import TrianglePage from './TrianglePage'

vi.mock('@/app/providers', () => ({ useApp: () => ({ settings: DEFAULT_SETTINGS, favorites: [], toggleFavorite: () => false }) }))
vi.mock('@/persistence/history', () => ({ saveHistoryRecord: vi.fn().mockResolvedValue(null) }))
vi.mock('@/persistence/saved', () => ({ saveCalculation: vi.fn().mockResolvedValue(null), getSavedCalculations: vi.fn().mockResolvedValue([]) }))
vi.mock('@/utils/csv', () => ({ downloadCsv: vi.fn() }))
vi.mock('@/exports/pdf', () => ({ downloadPdf: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/components/calculator/ChartPanel', () => ({ ChartPanel: () => <div /> }))

let root: Root
let container: HTMLDivElement
const input = (id: string) => container.querySelector<HTMLInputElement>(`#${id}`)!
const hero = () => container.querySelector('.calc-hero-amount')?.textContent ?? ''
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

const pages: { name: string; Page: ComponentType; field: string; next: string; delay?: number }[] = [
  { name: 'loan', Page: LoanPage, field: 'loan-amount', next: '30000' },
  { name: 'compound interest', Page: CompoundInterestPage, field: 'principal', next: '15000', delay: 500 },
  { name: 'income tax', Page: IncomeTaxPage, field: 'gross-income', next: '120000' },
  { name: 'triangle', Page: TrianglePage, field: 'side-a', next: '6' },
]

describe('live calculator pages', () => {
  it.each(pages)('shows an estimate on load and updates $name without a Calculate button', async ({ Page, field, next, delay }) => {
    await act(async () => { root.render(<Page />) })
    await settle(delay ?? 300)
    expect(container.querySelector('.calculator-submit')).toBeNull()
    expect(container.textContent).not.toContain('Inputs changed')
    const initial = hero()
    expect(initial.length).toBeGreaterThan(0)
    await type(field, next)
    expect(container.textContent).not.toContain('Inputs changed')
    expect(document.activeElement).toBe(input(field))
    await settle(delay ?? 300)
    expect(hero()).not.toBe(initial)
    expect(hero().length).toBeGreaterThan(0)
  })
})
