import { Triangle as TriangleIcon, Ruler } from 'lucide-react'
import { CalculatorLayout } from '@/components/calculator/CalculatorLayout'
import { CalcSection, HeroResult, KeyMetrics, Note, Panel } from '@/components/calculator/sections'
import { Input } from '@/components/ui/Input'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { MetricRow } from '@/components/ui/ResultBlock'
import { RightTriangleDiagram } from '@/components/geometry/TriangleDiagram'
import { useCalculatorPage } from './useCalculatorPage'
import {
  calculateTrigonometry,
  explainTrigonometry,
  buildTrigonometryTable,
} from '@/calculators/math/trigonometry/calculate'
import { validateTrigonometry } from '@/calculators/math/trigonometry/validation'
import type { TrigonometryInput } from '@/calculators/math/trigonometry/types'

const defaultInput: TrigonometryInput = { angleUnit: 'degrees', opposite: 3, adjacent: 4 }

export default function TrigonometryPage() {
  const { form, set, errors, handleCalculate, layoutProps } = useCalculatorPage({
    calculatorId: 'trigonometry',
    defaultInput,
    validate: validateTrigonometry,
    calculate: calculateTrigonometry,
    explain: explainTrigonometry,
    buildTable: buildTrigonometryTable,
    live: true,
    getShareText: (r) => `Hypotenuse: ${r.hypotenuse.toFixed(4)}, angle A: ${r.angleA.toFixed(2)}`,
    renderResults: (r) => (
      <div className="calc-results">
        <HeroResult eyebrow="HYPOTENUSE" title="Hypotenuse" amount={r.hypotenuse.toFixed(4)} />
        <KeyMetrics items={[
          { icon: <TriangleIcon aria-hidden="true" />, label: 'Angle A', value: `${r.angleA.toFixed(2)} ${r.angleUnit}` },
          { icon: <Ruler aria-hidden="true" />, label: 'Angle B', value: `${r.angleB.toFixed(2)} ${r.angleUnit}` },
        ]} />
        <Panel title="Right triangle">
          <RightTriangleDiagram opposite={r.opposite} adjacent={r.adjacent} />
          <MetricRow label="Angle A" value={`${r.angleA.toFixed(2)} ${r.angleUnit}`} />
          <MetricRow label="Angle B" value={`${r.angleB.toFixed(2)} ${r.angleUnit}`} />
          <MetricRow label="sin(A)" value={r.sinA.toFixed(6)} />
          <MetricRow label="cos(A)" value={r.cosA.toFixed(6)} />
          <MetricRow label="tan(A)" value={r.tanA.toFixed(6)} />
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
          <CalcSection index={1} title="Known values">
            <SegmentedControl
              value={form.angleUnit}
              onChange={(v) => set('angleUnit', v as TrigonometryInput['angleUnit'])}
              options={[
                { value: 'degrees', label: 'Degrees' },
                { value: 'radians', label: 'Radians' },
              ]}
            />
            <Input label="Opposite" type="number" value={form.opposite ?? ''} onChange={(e) => set('opposite', e.target.value ? +e.target.value : undefined)} error={errors.opposite} />
            <Input label="Adjacent" type="number" value={form.adjacent ?? ''} onChange={(e) => set('adjacent', e.target.value ? +e.target.value : undefined)} error={errors.adjacent} />
            <Input label="Hypotenuse" type="number" value={form.hypotenuse ?? ''} onChange={(e) => set('hypotenuse', e.target.value ? +e.target.value : undefined)} error={errors.hypotenuse} />
            <Input label="Angle" type="number" value={form.angle ?? ''} onChange={(e) => set('angle', e.target.value ? +e.target.value : undefined)} error={errors.angle} />
            <Note>Provide any two values. The estimate updates automatically as you edit.</Note>
          </CalcSection>
        </div>
      }
    />
  )
}
