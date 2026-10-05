import { CalendarDays, Clock } from 'lucide-react'
import { CalculatorLayout } from '@/components/calculator/CalculatorLayout'
import { CalcSection, HeroResult, KeyMetrics, Note, Panel } from '@/components/calculator/sections'
import { Input } from '@/components/ui/Input'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { MetricRow } from '@/components/ui/ResultBlock'
import { useCalculatorPage } from './useCalculatorPage'
import { calculateDate, explainDate, buildDateTable } from '@/calculators/general/date/calculate'
import { validateDate } from '@/calculators/general/date/validation'
import type { DateInput } from '@/calculators/general/date/types'

const defaultInput: DateInput = {
  mode: 'difference',
  startDate: '2024-01-01',
  endDate: '2024-12-31',
}

export default function DatePage() {
  const { form, set, errors, handleCalculate, layoutProps } = useCalculatorPage({
    calculatorId: 'date',
    defaultInput,
    validate: validateDate,
    calculate: calculateDate,
    explain: explainDate,
    buildTable: buildDateTable,
    live: true,
    getShareText: (r) =>
      r.mode === 'difference'
        ? `${r.years}y ${r.months}m ${r.days}d (${r.totalDays} days)`
        : `Result: ${r.resultDate}`,
    renderResults: (r) =>
      r.mode === 'difference' ? (
        <div className="calc-results">
          <HeroResult eyebrow="DIFFERENCE" title="Difference" amount={`${r.years}y ${r.months}m ${r.days}d`} />
          <KeyMetrics items={[
            { icon: <CalendarDays aria-hidden="true" />, label: 'Total days', value: String(r.totalDays) },
            { icon: <Clock aria-hidden="true" />, label: 'Total weeks', value: String(r.totalWeeks) },
          ]} />
          <Panel title="Breakdown">
            <MetricRow label="Total days" value={String(r.totalDays)} />
            <MetricRow label="Total weeks" value={String(r.totalWeeks)} />
          </Panel>
        </div>
      ) : (
        <div className="calc-results">
          <HeroResult eyebrow="RESULT DATE" title="Result date" amount={r.resultDate!} />
        </div>
      ),
  })

  return (
    <CalculatorLayout
      {...layoutProps}
      onCalculate={() => handleCalculate(form)}
      inputs={
        <div className="calc-form">
          <CalcSection index={1} title="Dates">
            <SegmentedControl
              value={form.mode}
              onChange={(v) => set('mode', v as DateInput['mode'])}
              options={[
                { value: 'difference', label: 'Date difference' },
                { value: 'addSubtract', label: 'Add / subtract' },
              ]}
            />
            <Input label="Start date" type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} error={errors.startDate} />
            {form.mode === 'difference' ? (
              <Input label="End date" type="date" value={form.endDate ?? ''} onChange={(e) => set('endDate', e.target.value)} error={errors.endDate} />
            ) : (
              <>
                <Input label="Years" type="number" signed value={form.years ?? 0} onChange={(e) => set('years', +e.target.value)} error={errors.years} />
                <Input label="Months" type="number" signed value={form.months ?? 0} onChange={(e) => set('months', +e.target.value)} error={errors.months} />
                <Input label="Weeks" type="number" signed value={form.weeks ?? 0} onChange={(e) => set('weeks', +e.target.value)} error={errors.weeks} />
                <Input label="Days" type="number" signed value={form.days ?? 0} onChange={(e) => set('days', +e.target.value)} error={errors.days} />
              </>
            )}
            <Note>Your estimate updates automatically as you edit.</Note>
          </CalcSection>
        </div>
      }
    />
  )
}
