import { CalculatorLayout } from '@/components/calculator/CalculatorLayout'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { ResultBlock, MetricRow } from '@/components/ui/ResultBlock'
import { TriangleDiagram } from '@/components/geometry/TriangleDiagram'
import { useCalculatorPage } from './useCalculatorPage'
import { calculateTriangle, explainTriangle, buildTriangleTable } from '@/calculators/math/triangle/calculate'
import { validateTriangle } from '@/calculators/math/triangle/validation'
import type { TriangleInput } from '@/calculators/math/triangle/types'

const defaultInput: TriangleInput = { case: 'SSS', sideA: 3, sideB: 4, sideC: 5 }

export default function TrianglePage() {
  const { form, set, errors, handleCalculate, layoutProps } = useCalculatorPage({
    calculatorId: 'triangle',
    defaultInput,
    validate: validateTriangle,
    calculate: calculateTriangle,
    explain: explainTriangle,
    buildTable: buildTriangleTable,
    getShareText: (r) =>
      r.solutions.length
        ? `Triangle: sides ${r.solutions[0].sideA.toFixed(2)}, ${r.solutions[0].sideB.toFixed(2)}, ${r.solutions[0].sideC.toFixed(2)}`
        : 'No valid triangle',
    renderResults: (r) => (
      <div className="space-y-4">
        {r.solutions.length === 0 ? (
          <ResultBlock label="No solution" value="Invalid triangle" primary />
        ) : (
          r.solutions.map((s, i) => (
            <div key={i} className="space-y-4">
              {r.ambiguous && <p className="text-sm text-text-secondary">Solution {i + 1}</p>}
              <ResultBlock label="Area" value={s.area.toFixed(4)} primary />
              <TriangleDiagram
                vertices={s.vertices}
                labels={{ a: `a=${s.sideA.toFixed(2)}`, b: `b=${s.sideB.toFixed(2)}`, c: `c=${s.sideC.toFixed(2)}` }}
              />
              <div className="rounded-2xl border border-border bg-white p-4">
                <MetricRow label="Angles (A/B/C)" value={`${s.angleA.toFixed(1)}° / ${s.angleB.toFixed(1)}° / ${s.angleC.toFixed(1)}°`} />
                <MetricRow label="Perimeter" value={s.perimeter.toFixed(4)} />
              </div>
            </div>
          ))
        )}
      </div>
    ),
  })

  return (
    <CalculatorLayout
      {...layoutProps}
      onCalculate={() => handleCalculate(form)}
      inputs={
        <>
          <Select
            label="Case"
            value={form.case}
            onChange={(v) => set('case', v as TriangleInput['case'])}
            options={[
              { value: 'SSS', label: 'SSS (three sides)' },
              { value: 'SAS', label: 'SAS (two sides + included angle)' },
              { value: 'ASA', label: 'ASA (two angles + included side)' },
              { value: 'AAS', label: 'AAS (two angles + non-included side)' },
              { value: 'SSA', label: 'SSA (two sides + non-included angle)' },
            ]}
          />
          {(form.case === 'SSS' || form.case === 'AAS' || form.case === 'SSA') && (
            <Input label="Side a" type="number" value={form.sideA ?? ''} onChange={(e) => set('sideA', +e.target.value)} error={errors.sideA} />
          )}
          {(form.case === 'SSS' || form.case === 'SAS' || form.case === 'SSA') && (
            <Input label="Side b" type="number" value={form.sideB ?? ''} onChange={(e) => set('sideB', +e.target.value)} error={errors.sideB} />
          )}
          {(form.case === 'SSS' || form.case === 'SAS' || form.case === 'ASA') && (
            <Input label="Side c" type="number" value={form.sideC ?? ''} onChange={(e) => set('sideC', +e.target.value)} error={errors.sideC} />
          )}
          {(form.case === 'SAS' || form.case === 'ASA' || form.case === 'AAS' || form.case === 'SSA') && (
            <Input label="Angle A (°)" type="number" value={form.angleA ?? ''} onChange={(e) => set('angleA', +e.target.value)} error={errors.angleA} />
          )}
          {(form.case === 'ASA' || form.case === 'AAS') && (
            <Input label="Angle B (°)" type="number" value={form.angleB ?? ''} onChange={(e) => set('angleB', +e.target.value)} error={errors.angleB} />
          )}
        </>
      }
    />
  )
}
