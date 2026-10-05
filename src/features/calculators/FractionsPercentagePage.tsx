import { Hash, Percent } from 'lucide-react'
import { CalculatorLayout } from '@/components/calculator/CalculatorLayout'
import { CalcSection, HeroResult, KeyMetrics, Note, Panel } from '@/components/calculator/sections'
import { Input } from '@/components/ui/Input'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Select } from '@/components/ui/Select'
import { MetricRow } from '@/components/ui/ResultBlock'
import { useCalculatorPage } from './useCalculatorPage'
import {
  calculateFractionsPercentage,
  explainFractionsPercentage,
  buildFractionsPercentageTable,
} from '@/calculators/math/fractionsPercentage/calculate'
import { validateFractionsPercentage } from '@/calculators/math/fractionsPercentage/validation'
import type { FractionsPercentageInput } from '@/calculators/math/fractionsPercentage/types'

const defaultInput: FractionsPercentageInput = {
  mode: 'fraction',
  fractionOperation: 'add',
  fractionA: '1/2',
  fractionB: '1/3',
  percentageMode: 'percentOf',
  percentValue: 20,
  baseValue: 150,
}

export default function FractionsPercentagePage() {
  const { form, set, errors, handleCalculate, layoutProps } = useCalculatorPage({
    calculatorId: 'fractions-percentage',
    defaultInput,
    validate: validateFractionsPercentage,
    calculate: calculateFractionsPercentage,
    explain: explainFractionsPercentage,
    buildTable: buildFractionsPercentageTable,
    live: true,
    autoCalculateDelay: 500,
    getShareText: (r) => `Result: ${r.primary}`,
    renderResults: (r) => (
      <div className="calc-results">
        <HeroResult eyebrow="RESULT" title="Result" amount={r.primary} />
        <KeyMetrics items={[
          { icon: <Hash aria-hidden="true" />, label: 'Mixed form', value: r.mixed },
          { icon: <Percent aria-hidden="true" />, label: 'Decimal', value: r.decimal.toFixed(6) },
        ]} />
        <Panel title="Other forms">
          <MetricRow label="Mixed form" value={r.mixed} />
          <MetricRow label="Decimal" value={r.decimal.toFixed(6)} />
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
          <CalcSection index={1} title="Calculation">
            <SegmentedControl
              value={form.mode}
              onChange={(v) => set('mode', v as 'fraction' | 'percentage')}
              options={[
                { value: 'fraction', label: 'Fraction' },
                { value: 'percentage', label: 'Percentage' },
              ]}
            />
            {form.mode === 'fraction' ? (
              <>
                <Select
                  label="Operation"
                  value={form.fractionOperation ?? 'add'}
                  onChange={(v) => set('fractionOperation', v as FractionsPercentageInput['fractionOperation'])}
                  options={[
                    { value: 'add', label: 'Add' },
                    { value: 'subtract', label: 'Subtract' },
                    { value: 'multiply', label: 'Multiply' },
                    { value: 'divide', label: 'Divide' },
                  ]}
                />
                <Input label="First fraction" value={form.fractionA ?? ''} onChange={(e) => set('fractionA', e.target.value)} error={errors.fractionA} />
                <Input label="Second fraction" value={form.fractionB ?? ''} onChange={(e) => set('fractionB', e.target.value)} error={errors.fractionB} />
              </>
            ) : (
              <>
                <Select
                  label="Calculation"
                  value={form.percentageMode ?? 'percentOf'}
                  onChange={(v) => set('percentageMode', v as FractionsPercentageInput['percentageMode'])}
                  options={[
                    { value: 'percentOf', label: 'X% of Y' },
                    { value: 'whatPercent', label: 'X is what % of Y' },
                    { value: 'percentChange', label: 'Percent change' },
                  ]}
                />
                {form.percentageMode === 'percentChange' ? (
                  <>
                    <Input label="Old value" type="number" emptyAsNaN value={form.oldValue ?? ''} onChange={(e) => set('oldValue', e.target.value === '' ? undefined : +e.target.value)} error={errors.oldValue} />
                    <Input label="New value" type="number" emptyAsNaN value={form.newValue ?? ''} onChange={(e) => set('newValue', e.target.value === '' ? undefined : +e.target.value)} error={errors.newValue} />
                  </>
                ) : form.percentageMode === 'whatPercent' ? (
                  <>
                    <Input label="Part (X)" type="number" emptyAsNaN value={form.percentValue ?? ''} onChange={(e) => set('percentValue', e.target.value === '' ? undefined : +e.target.value)} error={errors.percentValue} />
                    <Input label="Whole (Y)" type="number" emptyAsNaN value={form.baseValue ?? ''} onChange={(e) => set('baseValue', e.target.value === '' ? undefined : +e.target.value)} error={errors.baseValue} />
                  </>
                ) : (
                  <>
                    <Input label="Percent (X)" suffix="%" type="number" value={form.percentValue ?? 0} onChange={(e) => set('percentValue', +e.target.value)} error={errors.percentValue} />
                    <Input label="Base (Y)" type="number" value={form.baseValue ?? 0} onChange={(e) => set('baseValue', +e.target.value)} error={errors.baseValue} />
                  </>
                )}
              </>
            )}
            <Note>Your estimate updates automatically as you edit.</Note>
          </CalcSection>
        </div>
      }
    />
  )
}
