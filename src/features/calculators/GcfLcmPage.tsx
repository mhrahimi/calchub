import { CalculatorLayout } from '@/components/calculator/CalculatorLayout'
import { Input } from '@/components/ui/Input'
import { ResultBlock, MetricRow } from '@/components/ui/ResultBlock'
import { useCalculatorPage } from './useCalculatorPage'
import { calculateGcfLcm, explainGcfLcm, buildGcfLcmTable } from '@/calculators/math/gcfLcm/calculate'
import { validateGcfLcm } from '@/calculators/math/gcfLcm/validation'
import type { GcfLcmInput } from '@/calculators/math/gcfLcm/types'

const defaultInput: GcfLcmInput = { values: '48, 18, 30' }

export default function GcfLcmPage() {
  const { form, setForm, errors, handleCalculate, layoutProps } = useCalculatorPage({
    calculatorId: 'gcf-lcm',
    defaultInput,
    validate: validateGcfLcm,
    calculate: calculateGcfLcm,
    explain: explainGcfLcm,
    buildTable: buildGcfLcmTable,
    getShareText: (r) => `GCF: ${r.gcf}, LCM: ${r.lcm}`,
    renderResults: (r) => (
      <div className="space-y-4">
        <ResultBlock label="Greatest common factor" value={r.gcf.toString()} primary />
        <ResultBlock label="Least common multiple" value={r.lcm.toString()} />
        <div className="rounded-2xl border border-border bg-white p-4">
          {r.primeFactors.map((pf) => (
            <MetricRow key={pf.value} label={`Factors of ${pf.value}`} value={pf.factors} />
          ))}
        </div>
      </div>
    ),
  })

  return (
    <CalculatorLayout
      {...layoutProps}
      onCalculate={() => handleCalculate(form)}
      inputs={
        <Input
          label="Integers (comma separated)"
          value={form.values}
          onChange={(e) => setForm({ values: e.target.value })}
          error={errors.values}
        />
      }
    />
  )
}
