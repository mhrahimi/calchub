import { useRef } from 'react'
import { Dices, Hash } from 'lucide-react'
import { CalculatorLayout } from '@/components/calculator/CalculatorLayout'
import { CalcSection, HeroResult, KeyMetrics, Note, Toggle } from '@/components/calculator/sections'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useCalculatorPage } from './useCalculatorPage'
import {
  calculateRandomNumber,
  explainRandomNumber,
  buildRandomNumberCharts,
  buildRandomNumberTable,
} from '@/calculators/math/randomNumber/calculate'
import { validateRandomNumber } from '@/calculators/math/randomNumber/validation'
import type { RandomNumberInput } from '@/calculators/math/randomNumber/types'

const defaultInput: RandomNumberInput = {
  min: 1,
  max: 100,
  count: 10,
  integer: true,
  unique: false,
  decimalPlaces: 4,
  sortResults: false,
}

export default function RandomNumberPage() {
  const sortExisting = useRef(false)
  const lastValues = useRef<number[] | null>(null)
  const { form, set, errors, handleCalculate, layoutProps } = useCalculatorPage({
    calculatorId: 'random-number',
    defaultInput,
    validate: validateRandomNumber,
    calculate: (input) => {
      if (sortExisting.current && lastValues.current) {
        sortExisting.current = false
        const values = [...lastValues.current].sort((a, b) => a - b)
        lastValues.current = values
        return { values, min: input.min, max: input.max, count: values.length, integer: input.integer, unique: input.unique }
      }
      sortExisting.current = false
      const result = calculateRandomNumber({ ...input, sortResults: false })
      lastValues.current = result.values
      return result
    },
    explain: explainRandomNumber,
    buildCharts: buildRandomNumberCharts,
    buildTable: buildRandomNumberTable,
    calculateOnLoad: true,
    csvFilename: 'random-numbers.csv',
    getShareText: (r) => `Random numbers: ${r.values.join(', ')}`,
    renderResults: (r, input) => (
      <div className="calc-results">
        <HeroResult eyebrow="GENERATED VALUES" title="Random numbers" amount={r.values.join(', ')} />
        <KeyMetrics items={[
          { icon: <Hash aria-hidden="true" />, label: 'Count', value: String(r.values.length) },
          { icon: <Dices aria-hidden="true" />, label: 'Range', value: `${input.min} – ${input.max}` },
        ]} />
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => { sortExisting.current = false; handleCalculate(form) }}>
            Regenerate
          </Button>
          <Button
            variant="secondary"
            onClick={() => navigator.clipboard.writeText(r.values.join(', '))}
          >
            Copy
          </Button>
          <Button
            variant="secondary"
            onClick={() => { sortExisting.current = true; handleCalculate(form) }}
          >
            Sort
          </Button>
        </div>
      </div>
    ),
  })

  return (
    <CalculatorLayout
      {...layoutProps}
      resultPresentation="inline"
      calculateLabel="Generate"
      onCalculate={() => { sortExisting.current = false; handleCalculate(form) }}
      inputs={
        <div className="calc-form">
          <CalcSection index={1} title="Range">
            <Input label="Minimum" type="number" value={form.min} onChange={(e) => set('min', +e.target.value)} error={errors.min} />
            <Input label="Maximum" type="number" value={form.max} onChange={(e) => set('max', +e.target.value)} error={errors.max} />
            <Input label="Count" type="number" min={1} value={form.count} onChange={(e) => set('count', +e.target.value)} error={errors.count} />
          </CalcSection>
          <CalcSection index={2} title="Options">
            <Toggle checked={form.integer} onChange={checked => set('integer', checked)} label="Integer values" />
            <Toggle checked={form.unique} onChange={checked => set('unique', checked)} label="Unique values" />
            {errors.unique && <p role="alert" className="text-sm text-red-700">{errors.unique}</p>}
            {!form.integer && (
              <Input label="Decimal places" type="number" min={0} max={10} value={form.decimalPlaces} onChange={(e) => set('decimalPlaces', +e.target.value)} error={errors.decimalPlaces} />
            )}
            <Note>Changing these settings does not reroll the numbers. Use Generate or Regenerate.</Note>
          </CalcSection>
        </div>
      }
    />
  )
}
