import { CalculatorLayout } from '@/components/calculator/CalculatorLayout'
import { Input } from '@/components/ui/Input'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { ResultBlock, MetricRow } from '@/components/ui/ResultBlock'
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
    getShareText: (r) =>
      r.mode === 'difference'
        ? `${r.years}y ${r.months}m ${r.days}d (${r.totalDays} days)`
        : `Result: ${r.resultDate}`,
    renderResults: (r) =>
      r.mode === 'difference' ? (
        <div className="space-y-4">
          <ResultBlock label="Difference" value={`${r.years}y ${r.months}m ${r.days}d`} primary />
          <div className="rounded-2xl border border-border bg-white p-4">
            <MetricRow label="Total days" value={String(r.totalDays)} />
            <MetricRow label="Total weeks" value={String(r.totalWeeks)} />
          </div>
        </div>
      ) : (
        <ResultBlock label="Result date" value={r.resultDate!} primary />
      ),
  })

  return (
    <CalculatorLayout
      {...layoutProps}
      onCalculate={() => handleCalculate(form)}
      inputs={
        <>
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
              <Input label="Years" type="number" value={form.years ?? 0} onChange={(e) => set('years', +e.target.value)} />
              <Input label="Months" type="number" value={form.months ?? 0} onChange={(e) => set('months', +e.target.value)} />
              <Input label="Weeks" type="number" value={form.weeks ?? 0} onChange={(e) => set('weeks', +e.target.value)} />
              <Input label="Days" type="number" value={form.days ?? 0} onChange={(e) => set('days', +e.target.value)} />
            </>
          )}
        </>
      }
    />
  )
}
