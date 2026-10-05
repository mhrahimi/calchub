import { Home, Percent } from 'lucide-react'
import { CalculatorLayout } from '@/components/calculator/CalculatorLayout'
import { CalcSection, HeroResult, KeyMetrics, Note, Panel } from '@/components/calculator/sections'
import { Input } from '@/components/ui/Input'
import { MetricRow } from '@/components/ui/ResultBlock'
import { useCalculatorPage } from './useCalculatorPage'
import { calculateDti, explainDti, buildDtiCharts, buildDtiTable } from '@/calculators/finance/dti/calculate'
import { validateDti } from '@/calculators/finance/dti/validation'
import type { DtiInput } from '@/calculators/finance/dti/types'

const defaultInput: DtiInput = {
  grossMonthlyIncome: 8000,
  housingCost: 2000,
  debtPayments: 500,
  guideline: 43,
}

export default function DtiPage() {
  const { form, set, errors, handleCalculate, layoutProps } = useCalculatorPage({
    calculatorId: 'dti',
    defaultInput,
    validate: validateDti,
    calculate: calculateDti,
    explain: explainDti,
    buildCharts: buildDtiCharts,
    buildTable: buildDtiTable,
    live: true,
    csvFilename: 'dti-summary.csv',
    getShareText: (r, _input, _formatResultCurrency) => `DTI: Front-end ${r.frontEndDti}%, Back-end ${r.backEndDti}%`,
    renderResults: (r, _input, formatResultCurrency) => (
      <div className="calc-results">
        <HeroResult
          eyebrow="BACK-END DTI"
          title="Total debt-to-income"
          amount={`${r.backEndDti}%`}
          caption={<p className="calc-hero-caption">{r.withinGuideline ? 'Within the guideline you entered.' : 'Above the guideline you entered.'}</p>}
        />
        <KeyMetrics items={[
          { icon: <Home aria-hidden="true" />, label: 'Front-end DTI', value: `${r.frontEndDti}%` },
          { icon: <Percent aria-hidden="true" />, label: 'Housing cost', value: formatResultCurrency(r.housingCost) },
        ]} />
        <Panel title="Monthly picture">
          <MetricRow label="Front-end DTI" value={`${r.frontEndDti}%`} />
          <MetricRow label="Housing cost" value={formatResultCurrency(r.housingCost)} />
          <MetricRow label="Total debt payments" value={formatResultCurrency(r.totalDebt)} />
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
          <CalcSection index={1} title="Income and debts">
            <Input label="Gross monthly income" prefix="$" grouped value={form.grossMonthlyIncome} onValueChange={(n) => set('grossMonthlyIncome', n)} error={errors.grossMonthlyIncome} />
            <Input label="Housing cost" prefix="$" grouped value={form.housingCost} onValueChange={(n) => set('housingCost', n)} error={errors.housingCost} />
            <Input label="Other monthly debt payments" prefix="$" grouped value={form.debtPayments} onValueChange={(n) => set('debtPayments', n)} />
            <Input label="Lender guideline (back-end)" suffix="%" type="number" value={form.guideline} onChange={(e) => set('guideline', +e.target.value)} />
            <Note>Your estimate updates automatically as you edit.</Note>
          </CalcSection>
        </div>
      }
    />
  )
}
