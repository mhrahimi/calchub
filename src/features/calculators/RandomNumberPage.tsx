import { CalculatorLayout } from '@/components/calculator/CalculatorLayout'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { ResultBlock } from '@/components/ui/ResultBlock'
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
  const { form, set, errors, handleCalculate, layoutProps } = useCalculatorPage({
    calculatorId: 'random-number',
    defaultInput,
    validate: validateRandomNumber,
    calculate: calculateRandomNumber,
    explain: explainRandomNumber,
    buildCharts: buildRandomNumberCharts,
    buildTable: buildRandomNumberTable,
    csvFilename: 'random-numbers.csv',
    getShareText: (r) => `Random numbers: ${r.values.join(', ')}`,
    renderResults: (r) => (
      <div className="space-y-4">
        <ResultBlock label="Generated values" value={r.values.join(', ')} primary />
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => handleCalculate(form)}>
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
            onClick={() => handleCalculate({ ...form, sortResults: true })}
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
      onCalculate={() => handleCalculate(form)}
      inputs={
        <>
          <Input label="Minimum" type="number" value={form.min} onChange={(e) => set('min', +e.target.value)} />
          <Input label="Maximum" type="number" value={form.max} onChange={(e) => set('max', +e.target.value)} error={errors.max} />
          <Input label="Count" type="number" min={1} value={form.count} onChange={(e) => set('count', +e.target.value)} error={errors.count} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.integer} onChange={(e) => set('integer', e.target.checked)} />
            Integer values
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.unique} onChange={(e) => set('unique', e.target.checked)} />
            Unique values
          </label>
          {!form.integer && (
            <Input label="Decimal places" type="number" min={0} max={10} value={form.decimalPlaces} onChange={(e) => set('decimalPlaces', +e.target.value)} />
          )}
        </>
      }
    />
  )
}
