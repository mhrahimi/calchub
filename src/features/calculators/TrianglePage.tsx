import { Ruler, Triangle as TriangleIcon } from 'lucide-react'
import { CalculatorLayout } from '@/components/calculator/CalculatorLayout'
import { CalcSection, HeroResult, KeyMetrics, Note, Panel } from '@/components/calculator/sections'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { MetricRow } from '@/components/ui/ResultBlock'
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
    live: true,
    getShareText: (r) =>
      r.solutions.length
        ? `Triangle: sides ${r.solutions[0].sideA.toFixed(2)}, ${r.solutions[0].sideB.toFixed(2)}, ${r.solutions[0].sideC.toFixed(2)}`
        : 'No valid triangle',
    renderResults: (r) => (
      <div className="calc-results">
        {r.solutions.length === 0 ? (
          <HeroResult eyebrow="NO SOLUTION" title="Invalid triangle" amount="—" caption={<p className="calc-hero-caption">These sides and angles do not form a triangle.</p>} />
        ) : (
          r.solutions.map((s, i) => (
            <div key={i}>
              {r.ambiguous && <p className="calc-note" style={{ marginBottom: '1rem' }}>Solution {i + 1}</p>}
              <HeroResult
                eyebrow={r.solutions.length > 1 ? `SOLUTION ${i + 1}` : 'YOUR TRIANGLE'}
                title="Area"
                amount={s.area.toFixed(4)}
              />
              <KeyMetrics items={[
                { icon: <Ruler aria-hidden="true" />, label: 'Perimeter', value: s.perimeter.toFixed(4) },
                { icon: <TriangleIcon aria-hidden="true" />, label: 'Angles A / B / C', value: `${s.angleA.toFixed(1)}° / ${s.angleB.toFixed(1)}° / ${s.angleC.toFixed(1)}°` },
              ]} />
              <Panel title="Shape">
                <TriangleDiagram
                  vertices={s.vertices}
                  labels={{ a: `a=${s.sideA.toFixed(2)}`, b: `b=${s.sideB.toFixed(2)}`, c: `c=${s.sideC.toFixed(2)}` }}
                />
                <MetricRow label="Sides a / b / c" value={`${s.sideA.toFixed(4)} / ${s.sideB.toFixed(4)} / ${s.sideC.toFixed(4)}`} />
                <MetricRow label="Angles (A/B/C)" value={`${s.angleA.toFixed(1)}° / ${s.angleB.toFixed(1)}° / ${s.angleC.toFixed(1)}°`} />
                <MetricRow label="Perimeter" value={s.perimeter.toFixed(4)} />
              </Panel>
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
        <div className="calc-form">
          <CalcSection index={1} title="What you know">
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
            <Note>Your estimate updates automatically as you edit.</Note>
          </CalcSection>
        </div>
      }
    />
  )
}
