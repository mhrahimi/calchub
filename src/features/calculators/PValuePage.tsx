import { CalculatorLayout } from '@/components/calculator/CalculatorLayout'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { ResultBlock, MetricRow } from '@/components/ui/ResultBlock'
import { useCalculatorPage } from './useCalculatorPage'
import {
  calculatePValue,
  explainPValue,
  buildPValueCharts,
  buildPValueTable,
} from '@/calculators/math/pValue/calculate'
import { validatePValue } from '@/calculators/math/pValue/validation'
import type { PValueInput } from '@/calculators/math/pValue/types'

const defaultInput: PValueInput = {
  mode: 'zTest',
  tail: 'two',
  sampleMean: 105,
  hypothesizedMean: 100,
  populationSd: 15,
  sampleSize: 30,
  confidenceLevel: 95,
}

export default function PValuePage() {
  const { form, set, errors, handleCalculate, layoutProps } = useCalculatorPage({
    calculatorId: 'p-value',
    defaultInput,
    validate: validatePValue,
    calculate: calculatePValue,
    explain: explainPValue,
    buildCharts: buildPValueCharts,
    buildTable: buildPValueTable,
    csvFilename: 'p-value-results.csv',
    getShareText: (r) =>
      r.pValue !== undefined ? `p-value: ${r.pValue.toFixed(6)}` : `CI: [${r.ciLower!.toFixed(4)}, ${r.ciUpper!.toFixed(4)}]`,
    renderResults: (r) => (
      <div className="space-y-4">
        {r.pValue !== undefined ? (
          <ResultBlock label="p-value" value={r.pValue.toFixed(6)} primary />
        ) : (
          <ResultBlock
            label="Confidence interval"
            value={`[${r.ciLower!.toFixed(4)}, ${r.ciUpper!.toFixed(4)}]`}
            sublabel={`${r.confidenceLevel}% level`}
            primary
          />
        )}
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">{r.caveat}</p>
        <div className="rounded-2xl border border-border bg-white p-4">
          {r.testStatistic !== undefined && <MetricRow label="Test statistic" value={r.testStatistic.toFixed(4)} />}
          {r.standardError !== undefined && <MetricRow label="Standard error" value={r.standardError.toFixed(6)} />}
          {r.degreesOfFreedom !== undefined && <MetricRow label="df" value={String(r.degreesOfFreedom)} />}
        </div>
      </div>
    ),
  })

  return (
    <CalculatorLayout
      {...layoutProps}
      onCalculate={() => handleCalculate(form)}
      inputs={
        <>
          <Select
            label="Mode"
            value={form.mode}
            onChange={(v) => set('mode', v as PValueInput['mode'])}
            options={[
              { value: 'zTest', label: 'Z-test (known σ)' },
              { value: 'tTest', label: 'T-test (unknown σ)' },
              { value: 'meanCi', label: 'Mean confidence interval' },
              { value: 'proportionCi', label: 'Proportion CI (Wilson)' },
            ]}
          />
          {(form.mode === 'zTest' || form.mode === 'tTest') && (
            <Select
              label="Tail"
              value={form.tail ?? 'two'}
              onChange={(v) => set('tail', v as PValueInput['tail'])}
              options={[
                { value: 'two', label: 'Two-tailed' },
                { value: 'oneLower', label: 'One-tailed (lower)' },
                { value: 'oneUpper', label: 'One-tailed (upper)' },
              ]}
            />
          )}
          {(form.mode === 'zTest' || form.mode === 'tTest' || form.mode === 'meanCi') && (
            <>
              <Input label="Sample mean" type="number" value={form.sampleMean ?? ''} onChange={(e) => set('sampleMean', +e.target.value)} />
              {form.mode !== 'meanCi' && (
                <Input label="Hypothesized mean (μ₀)" type="number" value={form.hypothesizedMean ?? ''} onChange={(e) => set('hypothesizedMean', +e.target.value)} />
              )}
              {form.mode === 'zTest' ? (
                <Input label="Population SD (σ)" type="number" value={form.populationSd ?? ''} onChange={(e) => set('populationSd', +e.target.value)} error={errors.populationSd} />
              ) : (
                <Input label="Sample SD (s)" type="number" value={form.sampleSd ?? ''} onChange={(e) => set('sampleSd', +e.target.value)} error={errors.sampleSd} />
              )}
            </>
          )}
          {form.mode === 'proportionCi' && (
            <Input label="Sample proportion" type="number" min={0} max={1} step={0.01} value={form.proportion ?? ''} onChange={(e) => set('proportion', +e.target.value)} error={errors.proportion} />
          )}
          <Input label="Sample size (n)" type="number" min={1} value={form.sampleSize ?? ''} onChange={(e) => set('sampleSize', +e.target.value)} error={errors.sampleSize} />
          {(form.mode === 'meanCi' || form.mode === 'proportionCi') && (
            <Input label="Confidence level" suffix="%" type="number" value={form.confidenceLevel ?? 95} onChange={(e) => set('confidenceLevel', +e.target.value)} error={errors.confidenceLevel} />
          )}
        </>
      }
    />
  )
}
