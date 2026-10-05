import { Hash, Sigma } from 'lucide-react'
import { CalculatorLayout } from '@/components/calculator/CalculatorLayout'
import { CalcSection, HeroResult, KeyMetrics, Note, Panel } from '@/components/calculator/sections'
import { MetricRow } from '@/components/ui/ResultBlock'
import { useCalculatorPage } from './useCalculatorPage'
import {
  calculateStandardDeviation,
  explainStandardDeviation,
  buildStandardDeviationCharts,
  buildStandardDeviationTable,
} from '@/calculators/math/standardDeviation/calculate'
import { validateStandardDeviation } from '@/calculators/math/standardDeviation/validation'
import type { StandardDeviationInput } from '@/calculators/math/standardDeviation/types'

const defaultInput: StandardDeviationInput = { dataset: '2, 4, 4, 4, 5, 5, 7, 9' }

export default function StandardDeviationPage() {
  const { form, setForm, errors, handleCalculate, layoutProps } = useCalculatorPage({
    calculatorId: 'standard-deviation',
    defaultInput,
    validate: validateStandardDeviation,
    calculate: calculateStandardDeviation,
    explain: explainStandardDeviation,
    buildCharts: buildStandardDeviationCharts,
    buildTable: buildStandardDeviationTable,
    live: true,
    autoCalculateDelay: 500,
    csvFilename: 'standard-deviation.csv',
    getShareText: (r) => `Population SD: ${r.populationSd.toFixed(4)}, Sample SD: ${(r.sampleSd == null || !Number.isFinite(r.sampleSd) ? "Not defined for one observation" : r.sampleSd.toFixed(4))}`,
    renderResults: (r) => (
      <div className="calc-results">
        <HeroResult eyebrow="POPULATION SD" title="Population SD (σ)" amount={String(r.populationSd)} />
        <KeyMetrics items={[
          { icon: <Sigma aria-hidden="true" />, label: 'Sample SD (s)', value: (r.sampleSd == null || !Number.isFinite(r.sampleSd) ? 'Not defined for one observation' : r.sampleSd.toFixed(4)) },
          { icon: <Hash aria-hidden="true" />, label: 'Mean', value: String(r.mean) },
        ]} />
        <Panel title="Dataset summary">
          <MetricRow label="Mean" value={r.mean} />
          <MetricRow label="Count" value={String(r.count)} />
          <MetricRow label="Min / Max" value={`${r.min} / ${r.max}`} />
        </Panel>
      </div>
    ),
  })

  return (
    <CalculatorLayout
      {...layoutProps}
      onCalculate={() => handleCalculate(form)}
      inputs={
        <div className="calc-form">
          <CalcSection index={1} title="Dataset">
            <div className="space-y-1.5">
              <label htmlFor="dataset" className="block text-sm font-medium text-text-primary">
                Dataset (comma or line separated)
              </label>
              <textarea
                id="dataset"
                aria-invalid={!!errors.dataset}
                aria-describedby={errors.dataset ? "dataset-error" : undefined}
                className="w-full min-h-24 rounded-xl border border-border bg-white px-3 py-2 text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                value={form.dataset}
                onChange={(e) => setForm({ dataset: e.target.value })}
                rows={4}
              />
              {errors.dataset && <p id="dataset-error" className="text-sm text-red-600">{errors.dataset}</p>}
            </div>
            <Note>Your estimate updates automatically as you edit.</Note>
          </CalcSection>
        </div>
      }
    />
  )
}
