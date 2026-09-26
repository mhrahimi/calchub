import { createElement, type ComponentType, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect, vi } from 'vitest'
import type { useCalculatorPage } from './useCalculatorPage'

vi.mock('@/app/providers', async () => {
  const { DEFAULT_SETTINGS } = await import('@/calculators/types')
  return {useApp:()=>({settings:DEFAULT_SETTINGS,favorites:[],toggleFavorite:()=>false})}
})
vi.mock('@/components/calculator/CalculatorLayout', () => ({
  CalculatorLayout: ({results}: {results:ReactNode}) => createElement('main',null,results),
}))
vi.mock('./useCalculatorPage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./useCalculatorPage')>()
  const { stringifyCalculationData, parseCalculationData } = await import('@/utils/calculationJson')
  return {
    ...actual,
    // The real hook invokes renderResults synchronously before returning form.
    // Exercising that contract catches callbacks which capture the uninitialized
    // return binding. Use a serialized snapshot too, as reopening does.
    useCalculatorPage: (options:Parameters<typeof useCalculatorPage>[0]) => {
      const input = options.externalForm ?? options.defaultInput
      const validation = options.validate(input)
      if (!validation.valid) throw new Error(`${options.calculatorId}: ${JSON.stringify(validation.errors)}`)
      const result = parseCalculationData(stringifyCalculationData(options.calculate(input)))
      const results = options.renderResults(result, input, actual.formatResultCurrency)
      options.buildCharts?.(result)
      options.buildTable?.(result)
      options.explain(input,result)
      return {form:input,set:()=>{},setForm:()=>{},errors:{},handleCalculate:()=>{},layoutProps:{results},applyRestore:()=>{}}
    },
  }
})

const pages = import.meta.glob<{default:ComponentType<{fixedMode?:'dcf'|'lbo'}>}>('./*Page.tsx')
describe('calculator result rendering', () => {
  it.each(Object.entries(pages))('renders a calculated default snapshot for %s', async (_name, load) => {
    const {default:Page} = await load()
    const html = renderToStaticMarkup(createElement(Page))
    expect(html).toContain('<main>')
    expect(html).not.toMatch(/NaN|undefined/)
  })
  it('renders the dedicated LBO mode', async () => {
    const {default:Page} = await import('./DcfLboPage')
    expect(renderToStaticMarkup(createElement(Page,{fixedMode:'lbo'}))).toContain('MOIC')
  })
  it('labels the salary result with its calculated frequency', async () => {
    const {default:Page} = await import('./SalaryPage')
    const html = renderToStaticMarkup(createElement(Page))
    expect(html).toContain('Equivalent (monthly)')
    expect(html).toContain('8,333.33')
  })
})
