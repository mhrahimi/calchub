import { CalculatorLayout } from '@/components/calculator/CalculatorLayout'
import { CalcSection, HeroResult, KeyMetrics, Note } from '@/components/calculator/sections'
import { Input } from '@/components/ui/Input'
import { useCalculatorPage } from './useCalculatorPage'
import { calculateNumberBase, explainNumberBase, buildNumberBaseTable } from '@/calculators/math/numberBase/calculate'
import { validateNumberBase } from '@/calculators/math/numberBase/validation'
import type { NumberBaseInput } from '@/calculators/math/numberBase/types'
import { Binary, Hash } from 'lucide-react'

const defaultInput: NumberBaseInput = { value: '255', fromBase: 10, toBase: 16, fractionalPrecision: 8 }

export default function NumberBasePage() {
  const { form, set, errors, handleCalculate, layoutProps } = useCalculatorPage({
    calculatorId: 'number-base',
    defaultInput,
    validate: validateNumberBase,
    calculate: calculateNumberBase,
    explain: explainNumberBase,
    buildTable: buildNumberBaseTable,
    live: true,
    autoCalculateDelay: 500,
    csvFilename: 'base-conversion.csv',
    getShareText: (r) => `${r.sourceValue} (base ${r.sourceBase}) = ${r.targetValue} (base ${r.targetBase})`,
    renderResults: (r) => (
      <div className="calc-results">
        <HeroResult
          eyebrow="CONVERTED VALUE"
          title={`Base ${r.sourceBase} → base ${r.targetBase}`}
          amount={r.targetValue}
        />
        <KeyMetrics items={[
          { icon: <Hash aria-hidden="true" />, label: 'Source', value: `${r.sourceValue} (base ${r.sourceBase})` },
          { icon: <Binary aria-hidden="true" />, label: 'Target base', value: String(r.targetBase) },
        ]} />
      </div>
    ),
  })

  return (
    <CalculatorLayout
      {...layoutProps}
      onCalculate={() => handleCalculate(form)}
      inputs={
        <div className="calc-form">
          <CalcSection index={1} title="Value and bases">
            <Input label="Value" value={form.value} onChange={(e) => set('value', e.target.value)} error={errors.value} />
            <Input label="From base" type="number" min={2} max={36} value={form.fromBase} onChange={(e) => set('fromBase', +e.target.value)} error={errors.fromBase} />
            <Input label="To base" type="number" min={2} max={36} value={form.toBase} onChange={(e) => set('toBase', +e.target.value)} error={errors.toBase} />
            <Input label="Fractional precision" type="number" min={0} max={32} value={form.fractionalPrecision} onChange={(e) => set('fractionalPrecision', +e.target.value)} error={errors.fractionalPrecision} />
            <Note>Your estimate updates automatically as you edit.</Note>
          </CalcSection>
        </div>
      }
    />
  )
}
