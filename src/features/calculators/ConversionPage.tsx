import { ArrowLeftRight } from 'lucide-react'
import { CalculatorLayout } from '@/components/calculator/CalculatorLayout'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { ResultBlock } from '@/components/ui/ResultBlock'
import { useCalculatorPage } from './useCalculatorPage'
import { calculateConversion, explainConversion, buildConversionTable } from '@/calculators/general/conversion/calculate'
import { validateConversion } from '@/calculators/general/conversion/validation'
import type { ConversionInput } from '@/calculators/general/conversion/types'
import { UNIT_CATEGORIES, getUnitsByDimension, type UnitDimension } from '@/units/registry'

const defaultCategory: UnitDimension = 'length'

const defaultInput: ConversionInput = {
  value: 1,
  fromUnitId: 'm',
  toUnitId: 'ft',
  category: defaultCategory,
}

export default function ConversionPage() {
  const { form, setForm, set, errors, handleCalculate, layoutProps } = useCalculatorPage({
    calculatorId: 'conversion',
    defaultInput,
    validate: validateConversion,
    calculate: calculateConversion,
    explain: explainConversion,
    buildTable: buildConversionTable,
    getShareText: (r) => `${r.inputValue} ${r.fromSymbol} = ${r.outputValue} ${r.toSymbol}`,
    renderResults: (r) => (
      <ResultBlock
        label="Converted value"
        value={`${r.outputValue.toFixed(6)} ${r.toSymbol}`}
        sublabel={`${r.inputValue} ${r.fromSymbol}`}
        primary
      />
    ),
  })

  const categoryUnits = getUnitsByDimension(form.category)

  const handleCategoryChange = (category: UnitDimension) => {
    const nextUnits = getUnitsByDimension(category)
    setForm((f) => ({
      ...f,
      category,
      fromUnitId: nextUnits[0]?.id ?? f.fromUnitId,
      toUnitId: nextUnits[1]?.id ?? nextUnits[0]?.id ?? f.toUnitId,
    }))
  }

  const swapUnits = () => {
    setForm((f) => ({ ...f, fromUnitId: f.toUnitId, toUnitId: f.fromUnitId }))
  }

  const unitOptions = categoryUnits.map((u) => ({ value: u.id, label: `${u.label} (${u.symbol})` }))

  return (
    <CalculatorLayout
      {...layoutProps}
      onCalculate={() => handleCalculate(form)}
      inputs={
        <>
          <Select
            label="Category"
            value={form.category}
            onChange={(v) => handleCategoryChange(v as UnitDimension)}
            options={UNIT_CATEGORIES.map((c) => ({ value: c.dimension, label: c.label }))}
          />
          <Input label="Value" type="number" value={form.value} onChange={(e) => set('value', +e.target.value)} error={errors.value} />
          <Select label="From unit" value={form.fromUnitId} onChange={(v) => set('fromUnitId', v)} options={unitOptions} error={errors.fromUnitId} />
          <div className="flex justify-center">
            <button
              type="button"
              onClick={swapUnits}
              className="p-2 rounded-full border border-border hover:bg-surface-lighter"
              aria-label="Swap units"
            >
              <ArrowLeftRight className="w-5 h-5 text-text-secondary" />
            </button>
          </div>
          <Select label="To unit" value={form.toUnitId} onChange={(v) => set('toUnitId', v)} options={unitOptions} error={errors.toUnitId} />
        </>
      }
    />
  )
}
