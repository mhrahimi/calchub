import { Activity, Sigma } from 'lucide-react'
import { CalculatorLayout } from '@/components/calculator/CalculatorLayout'
import { CalcSection, HeroResult, KeyMetrics, Note, Panel } from '@/components/calculator/sections'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { MetricRow } from '@/components/ui/ResultBlock'
import { useCalculatorPage } from './useCalculatorPage'
import {
  calculatePValue,
  explainPValue,
  buildPValueCharts,
  buildPValueTable,
} from '@/calculators/math/pValue/calculate'
import { validatePValue } from '@/calculators/math/pValue/validation'
import type { PValueInput } from '@/calculators/math/pValue/types'

function formatP(value: number) {
  if (!Number.isFinite(value)) return '—'
  if (value !== 0 && Math.abs(value) < 0.0001) return value.toExponential(4)
  return value.toFixed(6)
}

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
    live: true,
    csvFilename: 'p-value-results.csv',
    getShareText: (r) =>
      r.pValue !== undefined ? `p-value: ${r.pValue.toFixed(6)}` : `CI: [${r.ciLower!.toFixed(4)}, ${r.ciUpper!.toFixed(4)}]`,
    renderResults: (r) => (
      <div className="calc-results">
        {r.pValue !== undefined ? (
          <HeroResult eyebrow="P-VALUE" title="p-value" amount={formatP(r.pValue)} />
        ) : (
          <HeroResult
            eyebrow="CONFIDENCE INTERVAL"
            eyebrowRight={`${r.confidenceLevel}%`}
            title="Confidence interval"
            amount={`[${r.ciLower!.toFixed(4)}, ${r.ciUpper!.toFixed(4)}]`}
          />
        )}
        <KeyMetrics items={[
          ...(r.testStatistic !== undefined ? [{ icon: <Sigma aria-hidden="true" />, label: 'Test statistic', value: r.testStatistic.toFixed(4) }] : []),
          ...(r.standardError !== undefined ? [{ icon: <Activity aria-hidden="true" />, label: 'Standard error', value: r.standardError.toFixed(4) }] : []),
          ...(r.marginOfError !== undefined ? [{ label: 'Margin of error', value: r.marginOfError.toFixed(4) }] : []),
        ]} />
        <p className="calc-note">{r.caveat}</p>
        <Panel title="Test details">
          {r.testStatistic !== undefined && <MetricRow label="Test statistic" value={r.testStatistic.toFixed(4)} />}
          {r.standardError !== undefined && <MetricRow label="Standard error" value={r.standardError.toFixed(4)} />}
          {r.degreesOfFreedom !== undefined && <MetricRow label="df" value={String(r.degreesOfFreedom)} />}
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
          <CalcSection index={1} title="Test">
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
          </CalcSection>
          <CalcSection index={2} title="Sample">
            {(form.mode === 'zTest' || form.mode === 'tTest' || form.mode === 'meanCi') && (
              <>
                <Input label="Sample mean" type="number" value={form.sampleMean ?? ''} onChange={(e) => set('sampleMean', e.target.value === '' ? undefined : +e.target.value)} error={errors.sampleMean} />
                {form.mode !== 'meanCi' && (
                  <Input label="Hypothesized mean (μ₀)" type="number" value={form.hypothesizedMean ?? ''} onChange={(e) => set('hypothesizedMean', e.target.value === '' ? undefined : +e.target.value)} error={errors.hypothesizedMean} />
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
            <Note>Your estimate updates automatically as you edit.</Note>
          </CalcSection>
        </div>
      }
    />
  )
}
