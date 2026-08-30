import { CalculatorLayout } from '@/components/calculator/CalculatorLayout'
import { Input } from '@/components/ui/Input'
import { ResultBlock, MetricRow } from '@/components/ui/ResultBlock'
import { useCalculatorPage, formatResultCurrency } from './useCalculatorPage'
import {
  calculateCreWaterfall,
  explainCreWaterfall,
  buildCreWaterfallCharts,
  buildCreWaterfallTable,
} from '@/calculators/finance/creWaterfall/calculate'
import { validateCreWaterfall } from '@/calculators/finance/creWaterfall/validation'
import type { CreWaterfallInput } from '@/calculators/finance/creWaterfall/types'

const defaultInput: CreWaterfallInput = {
  lpContribution: 9_000_000,
  gpContribution: 1_000_000,
  totalDistribution: 15_000_000,
  preferredReturnPercent: 8,
  catchUpPercent: 20,
  lpPromotePercent: 80,
}

export default function CreWaterfallPage() {
  const { form, set, errors, handleCalculate, layoutProps } = useCalculatorPage({
    calculatorId: 'cre-waterfall',
    defaultInput,
    validate: validateCreWaterfall,
    calculate: calculateCreWaterfall,
    explain: explainCreWaterfall,
    buildCharts: buildCreWaterfallCharts,
    buildTable: buildCreWaterfallTable,
    csvFilename: 'cre-waterfall.csv',
    getShareText: (r) => `LP MOIC: ${r.lpMoic.toFixed(2)}x, GP MOIC: ${r.gpMoic.toFixed(2)}x`,
    renderResults: (r) => (
      <div className="space-y-4">
        <ResultBlock label="LP distributions" value={formatResultCurrency(r.lpTotal)} primary />
        <ResultBlock label="GP distributions" value={formatResultCurrency(r.gpTotal)} />
        <div className="rounded-2xl border border-border bg-white p-4">
          <MetricRow label="LP MOIC" value={`${r.lpMoic.toFixed(2)}x`} />
          <MetricRow label="GP MOIC" value={`${r.gpMoic.toFixed(2)}x`} />
          <MetricRow label="LP IRR" value={r.lpIrr !== null ? `${(r.lpIrr * 100).toFixed(2)}%` : 'N/A'} />
          <MetricRow label="GP IRR" value={r.gpIrr !== null ? `${(r.gpIrr * 100).toFixed(2)}%` : 'N/A'} />
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
          <Input label="LP contribution" prefix="$" type="number" value={form.lpContribution} onChange={(e) => set('lpContribution', +e.target.value)} error={errors.lpContribution} />
          <Input label="GP contribution" prefix="$" type="number" value={form.gpContribution} onChange={(e) => set('gpContribution', +e.target.value)} error={errors.gpContribution} />
          <Input label="Total distribution" prefix="$" type="number" value={form.totalDistribution} onChange={(e) => set('totalDistribution', +e.target.value)} error={errors.totalDistribution} />
          <Input label="Preferred return (LP)" suffix="%" type="number" value={form.preferredReturnPercent} onChange={(e) => set('preferredReturnPercent', +e.target.value)} />
          <Input label="GP catch-up" suffix="%" type="number" value={form.catchUpPercent} onChange={(e) => set('catchUpPercent', +e.target.value)} />
          <Input label="LP promote share" suffix="%" type="number" value={form.lpPromotePercent} onChange={(e) => set('lpPromotePercent', +e.target.value)} error={errors.lpPromotePercent} />
        </>
      }
    />
  )
}
