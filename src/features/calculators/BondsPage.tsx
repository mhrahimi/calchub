import { CalculatorLayout } from '@/components/calculator/CalculatorLayout'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { ResultBlock, MetricRow } from '@/components/ui/ResultBlock'
import { useCalculatorPage, formatResultCurrency } from './useCalculatorPage'
import {
  calculateBonds,
  explainBonds,
  buildBondsCharts,
  buildBondsTable,
} from '@/calculators/finance/bonds/calculate'
import { validateBonds } from '@/calculators/finance/bonds/validation'
import type { BondsInput } from '@/calculators/finance/bonds/types'

const defaultInput: BondsInput = {
  faceValue: 1000,
  bondPrice: 950,
  couponRate: 5,
  couponFrequency: 2,
  periodsToMaturity: 20,
}

export default function BondsPage() {
  const { form, set, errors, handleCalculate, layoutProps } = useCalculatorPage({
    calculatorId: 'bonds',
    defaultInput,
    validate: validateBonds,
    calculate: calculateBonds,
    explain: explainBonds,
    buildCharts: buildBondsCharts,
    buildTable: buildBondsTable,
    csvFilename: 'bond-cashflows.csv',
    getShareText: (r) => `YTM: ${r.ytmPercent.toFixed(2)}%, Duration: ${r.macaulayDuration.toFixed(2)}`,
    renderResults: (r) => (
      <div className="space-y-4">
        <ResultBlock label="Yield to maturity" value={`${r.ytmPercent.toFixed(4)}%`} primary />
        <div className="rounded-2xl border border-border bg-white p-4">
          <MetricRow label="Coupon payment" value={formatResultCurrency(r.couponPayment)} />
          <MetricRow label="Current yield" value={`${r.currentYield.toFixed(2)}%`} />
          <MetricRow label="Macaulay duration" value={r.macaulayDuration.toFixed(4)} />
          <MetricRow label="Modified duration" value={r.modifiedDuration.toFixed(4)} />
          <MetricRow label="Convexity" value={r.convexity.toFixed(4)} />
        </div>
      </div>
    ),
  })

  return (
    <CalculatorLayout
      {...layoutProps}
      onCalculate={() => handleCalculate(form)}
      inputs={
        <>
          <Input label="Face value" prefix="$" type="number" value={form.faceValue} onChange={(e) => set('faceValue', +e.target.value)} error={errors.faceValue} />
          <Input label="Bond price" prefix="$" type="number" value={form.bondPrice} onChange={(e) => set('bondPrice', +e.target.value)} error={errors.bondPrice} />
          <Input label="Coupon rate" suffix="%" type="number" value={form.couponRate} onChange={(e) => set('couponRate', +e.target.value)} />
          <Select
            label="Coupon frequency"
            value={String(form.couponFrequency)}
            onChange={(v) => set('couponFrequency', +v as BondsInput['couponFrequency'])}
            options={[
              { value: '1', label: 'Annual' },
              { value: '2', label: 'Semi-annual' },
              { value: '4', label: 'Quarterly' },
              { value: '12', label: 'Monthly' },
            ]}
          />
          <Input label="Periods to maturity" type="number" value={form.periodsToMaturity} onChange={(e) => set('periodsToMaturity', +e.target.value)} error={errors.periodsToMaturity} />
        </>
      }
    />
  )
}
