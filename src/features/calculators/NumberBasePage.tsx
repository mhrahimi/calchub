import { CalculatorLayout } from '@/components/calculator/CalculatorLayout'
import { Input } from '@/components/ui/Input'
import { ResultBlock } from '@/components/ui/ResultBlock'
import { useCalculatorPage } from './useCalculatorPage'
import { calculateNumberBase, explainNumberBase, buildNumberBaseTable } from '@/calculators/math/numberBase/calculate'
import { validateNumberBase } from '@/calculators/math/numberBase/validation'
import type { NumberBaseInput } from '@/calculators/math/numberBase/types'

const defaultInput: NumberBaseInput = { value: '255', fromBase: 10, toBase: 16, fractionalPrecision: 8 }

export default function NumberBasePage() {
  const { form, set, errors, handleCalculate, layoutProps } = useCalculatorPage({
    calculatorId: 'number-base',
    defaultInput,
    validate: validateNumberBase,
    calculate: calculateNumberBase,
    explain: explainNumberBase,
    buildTable: buildNumberBaseTable,
    csvFilename: 'base-conversion.csv',
    getShareText: (r) => `${r.sourceValue} (base ${r.sourceBase}) = ${r.targetValue} (base ${r.targetBase})`,
    renderResults: (r) => (
      <ResultBlock label="Converted value" value={r.targetValue} sublabel={`Base ${r.sourceBase} → base ${r.targetBase}`} primary />
    ),
  })

  return (
    <CalculatorLayout
      {...layoutProps}
      onCalculate={() => handleCalculate(form)}
      inputs={
        <>
          <Input label="Value" value={form.value} onChange={(e) => set('value', e.target.value)} error={errors.value} />
          <Input label="From base" type="number" min={2} max={36} value={form.fromBase} onChange={(e) => set('fromBase', +e.target.value)} error={errors.fromBase} />
          <Input label="To base" type="number" min={2} max={36} value={form.toBase} onChange={(e) => set('toBase', +e.target.value)} error={errors.toBase} />
          <Input label="Fractional precision" type="number" min={0} max={32} value={form.fractionalPrecision} onChange={(e) => set('fractionalPrecision', +e.target.value)} />
        </>
      }
    />
  )
}
