import { CalendarDays, Percent } from 'lucide-react'
import { CalculatorLayout } from '@/components/calculator/CalculatorLayout'
import { CalcSection, HeroResult, KeyMetrics, Note, Panel } from '@/components/calculator/sections'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { MetricRow } from '@/components/ui/ResultBlock'
import { useCalculatorPage } from './useCalculatorPage'
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
    live: true,
    csvFilename: 'bond-cashflows.csv',
    getShareText: (r, _input, _formatResultCurrency) => `YTM: ${r.ytmPercent.toFixed(2)}%, Duration: ${r.macaulayDuration.toFixed(2)}`,
    renderResults: (r, _input, formatResultCurrency) => (
      <div className="calc-results">
        <HeroResult eyebrow="YIELD TO MATURITY" title="Yield to maturity" amount={`${r.ytmPercent.toFixed(4)}%`} />
        <KeyMetrics items={[
          { icon: <Percent aria-hidden="true" />, label: 'Current yield', value: `${r.currentYield.toFixed(2)}%` },
          { icon: <CalendarDays aria-hidden="true" />, label: 'Macaulay duration', value: `${r.macaulayDuration.toFixed(2)} years` },
        ]} />
        <Panel title="Cash flow and risk">
          <MetricRow label="Coupon payment" value={formatResultCurrency(r.couponPayment)} />
          <MetricRow label="Current yield" value={`${r.currentYield.toFixed(2)}%`} />
          <MetricRow label="Macaulay duration" value={`${r.macaulayDuration.toFixed(4)} years`} />
          <MetricRow label="Modified duration" value={`${r.modifiedDuration.toFixed(4)} years`} />
          <MetricRow label="Convexity" value={`${r.convexity.toFixed(4)} years²`} />
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
          <CalcSection index={1} title="Bond terms">
            <Input label="Face value" prefix="$" grouped value={form.faceValue} onValueChange={(n) => set('faceValue', n)} error={errors.faceValue} />
            <Input label="Bond price" prefix="$" grouped value={form.bondPrice} onValueChange={(n) => set('bondPrice', n)} error={errors.bondPrice} />
            <Input label="Coupon rate" suffix="%" type="number" value={form.couponRate} onChange={(e) => set('couponRate', +e.target.value)} error={errors.couponRate} />
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
            <Input label="Regular coupon periods to maturity" type="number" value={form.periodsToMaturity} onChange={(e) => set('periodsToMaturity', +e.target.value)} error={errors.periodsToMaturity} />
            <Note>Your estimate updates automatically as you edit.</Note>
          </CalcSection>
        </div>
      }
    />
  )
}
