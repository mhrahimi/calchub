import { Hash, Layers } from 'lucide-react'
import { CalculatorLayout } from '@/components/calculator/CalculatorLayout'
import { CalcSection, HeroResult, KeyMetrics, Note, Panel } from '@/components/calculator/sections'
import { Input } from '@/components/ui/Input'
import { MetricRow } from '@/components/ui/ResultBlock'
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
    live: true,
    autoCalculateDelay: 500,
    getShareText: (r) => `GCF: ${r.gcf}, LCM: ${r.lcm}`,
    renderResults: (r) => (
      <div className="calc-results">
        <HeroResult eyebrow="GREATEST COMMON FACTOR" title="Greatest common factor" amount={r.gcf.toString()} />
        <KeyMetrics items={[
          { icon: <Layers aria-hidden="true" />, label: 'Least common multiple', value: r.lcm.toString() },
          { icon: <Hash aria-hidden="true" />, label: 'Numbers', value: String(r.primeFactors.length) },
        ]} />
        <Panel title="Prime factors">
          {r.primeFactors.map((pf) => (
            <MetricRow key={pf.value} label={`Factors of ${pf.value}`} value={pf.factors} />
          ))}
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
          <CalcSection index={1} title="Numbers">
            <Input
              label="Integers (comma separated)"
              value={form.values}
              onChange={(e) => setForm({ values: e.target.value })}
              error={errors.values}
            />
            <Note>Your estimate updates automatically as you edit.</Note>
          </CalcSection>
        </div>
      }
    />
  )
}
