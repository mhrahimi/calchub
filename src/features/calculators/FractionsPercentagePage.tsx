import { CalculatorLayout } from '@/components/calculator/CalculatorLayout'
import { Input } from '@/components/ui/Input'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Select } from '@/components/ui/Select'
import { ResultBlock, MetricRow } from '@/components/ui/ResultBlock'
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
    getShareText: (r) => `Result: ${r.primary}`,
    renderResults: (r) => (
      <div className="space-y-4">
        <ResultBlock label="Result" value={r.primary} primary />
        <div className="rounded-2xl border border-border bg-white p-4">
          <MetricRow label="Mixed form" value={r.mixed} />
          <MetricRow label="Decimal" value={r.decimal.toFixed(6)} />
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
                  <Input label="Old value" type="number" value={form.oldValue ?? 0} onChange={(e) => set('oldValue', +e.target.value)} error={errors.oldValue} />
                  <Input label="New value" type="number" value={form.newValue ?? 0} onChange={(e) => set('newValue', +e.target.value)} error={errors.newValue} />
                </>
              ) : form.percentageMode === 'whatPercent' ? (
                <>
                  <Input label="Part (X)" type="number" value={form.percentValue ?? 0} onChange={(e) => set('percentValue', +e.target.value)} />
                  <Input label="Whole (Y)" type="number" value={form.baseValue ?? 0} onChange={(e) => set('baseValue', +e.target.value)} error={errors.baseValue} />
                </>
              ) : (
                <>
                  <Input label="Percent (X)" suffix="%" type="number" value={form.percentValue ?? 0} onChange={(e) => set('percentValue', +e.target.value)} error={errors.percentValue} />
                  <Input label="Base (Y)" type="number" value={form.baseValue ?? 0} onChange={(e) => set('baseValue', +e.target.value)} error={errors.baseValue} />
                </>
              )}
            </>
          )}
        </>
      }
    />
  )
}
