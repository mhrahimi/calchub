import { TrendingUp, Users } from 'lucide-react'
import { CalculatorLayout } from '@/components/calculator/CalculatorLayout'
import { CalcSection, HeroResult, KeyMetrics, Note, Panel } from '@/components/calculator/sections'
import { Input } from '@/components/ui/Input'
import { MetricRow } from '@/components/ui/ResultBlock'
import { useCalculatorPage } from './useCalculatorPage'
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
    live: true,
    csvFilename: 'cre-waterfall.csv',
    getShareText: (r, _input, _formatResultCurrency) => `LP MOIC: ${r.lpMoic.toFixed(2)}x, GP MOIC: ${r.gpMoic.toFixed(2)}x`,
    renderResults: (r, _input, formatResultCurrency) => (
      <div className="calc-results">
        <HeroResult eyebrow="LP DISTRIBUTIONS" title="LP distributions" amount={formatResultCurrency(r.lpTotal)} caption={<p className="calc-hero-caption">GP distributions {formatResultCurrency(r.gpTotal)}.</p>} />
        <KeyMetrics items={[
          { icon: <Users aria-hidden="true" />, label: 'LP MOIC', value: `${r.lpMoic.toFixed(2)}x` },
          { icon: <TrendingUp aria-hidden="true" />, label: 'GP MOIC', value: `${r.gpMoic.toFixed(2)}x` },
        ]} />
        <Panel title="Returns">
          <MetricRow label="LP MOIC" value={`${r.lpMoic.toFixed(2)}x`} />
          <MetricRow label="GP MOIC" value={`${r.gpMoic.toFixed(2)}x`} />
          <MetricRow label="LP one-year return" value={r.lpIrr !== null ? `${(r.lpIrr * 100).toFixed(2)}%` : 'N/A'} />
          <MetricRow label="GP one-year return" value={r.gpIrr !== null ? `${(r.gpIrr * 100).toFixed(2)}%` : 'N/A'} />
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
          <CalcSection index={1} title="Capital">
            <Input label="LP contribution" prefix="$" grouped value={form.lpContribution} onValueChange={(n) => set('lpContribution', n)} error={errors.lpContribution} />
            <Input label="GP contribution" prefix="$" grouped value={form.gpContribution} onValueChange={(n) => set('gpContribution', n)} error={errors.gpContribution} />
            <Input label="Total distribution" prefix="$" grouped value={form.totalDistribution} onValueChange={(n) => set('totalDistribution', n)} error={errors.totalDistribution} />
          </CalcSection>
          <CalcSection index={2} title="Waterfall terms">
            <Input label="Preferred return (LP)" suffix="%" type="number" value={form.preferredReturnPercent} onChange={(e) => set('preferredReturnPercent', +e.target.value)} error={errors.preferredReturnPercent} />
            <Input label="GP catch-up" suffix="%" type="number" value={form.catchUpPercent} onChange={(e) => set('catchUpPercent', +e.target.value)} error={errors.catchUpPercent} />
            <Input label="LP promote share" suffix="%" type="number" value={form.lpPromotePercent} onChange={(e) => set('lpPromotePercent', +e.target.value)} error={errors.lpPromotePercent} />
            <Note>Your estimate updates automatically as you edit.</Note>
          </CalcSection>
        </div>
      }
    />
  )
}
