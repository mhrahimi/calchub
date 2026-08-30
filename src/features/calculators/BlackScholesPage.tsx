import { CalculatorLayout } from '@/components/calculator/CalculatorLayout'
import { Input } from '@/components/ui/Input'
import { ResultBlock, MetricRow } from '@/components/ui/ResultBlock'
import { useCalculatorPage } from './useCalculatorPage'
import {
  calculateBlackScholes,
  explainBlackScholes,
  buildBlackScholesCharts,
  buildBlackScholesTable,
} from '@/calculators/finance/blackScholes/calculate'
import { validateBlackScholes } from '@/calculators/finance/blackScholes/validation'
import type { BlackScholesInput } from '@/calculators/finance/blackScholes/types'
import { formatResultCurrency } from './useCalculatorPage'

const defaultInput: BlackScholesInput = {
  spot: 100,
  strike: 100,
  timeYears: 1,
  riskFreeRate: 5,
  volatility: 20,
  dividendYield: 0,
  showGreeks: true,
}

export default function BlackScholesPage() {
  const { form, set, errors, handleCalculate, layoutProps } = useCalculatorPage({
    calculatorId: 'black-scholes',
    defaultInput,
    validate: validateBlackScholes,
    calculate: calculateBlackScholes,
    explain: explainBlackScholes,
    buildCharts: buildBlackScholesCharts,
    buildTable: buildBlackScholesTable,
    csvFilename: 'black-scholes.csv',
    getShareText: (r) => `Call: ${formatResultCurrency(r.callPrice)}, Put: ${formatResultCurrency(r.putPrice)}`,
    renderResults: (r) => (
      <div className="space-y-4">
        <ResultBlock label="Call price" value={formatResultCurrency(r.callPrice)} primary />
        <ResultBlock label="Put price" value={formatResultCurrency(r.putPrice)} />
        {r.greeks && (
          <div className="rounded-2xl border border-border bg-white p-4">
            <MetricRow label="Delta (call)" value={r.greeks.deltaCall.toFixed(4)} />
            <MetricRow label="Gamma" value={r.greeks.gamma.toFixed(6)} />
            <MetricRow label="Vega" value={r.greeks.vega.toFixed(4)} />
            <MetricRow label="Theta (call)" value={r.greeks.thetaCall.toFixed(4)} />
          </div>
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
          <Input label="Stock price" prefix="$" type="number" value={form.spot} onChange={(e) => set('spot', +e.target.value)} error={errors.spot} />
          <Input label="Strike price" prefix="$" type="number" value={form.strike} onChange={(e) => set('strike', +e.target.value)} error={errors.strike} />
          <Input label="Time to expiration" suffix="years" type="number" value={form.timeYears} onChange={(e) => set('timeYears', +e.target.value)} error={errors.timeYears} />
          <Input label="Risk-free rate" suffix="%" type="number" value={form.riskFreeRate} onChange={(e) => set('riskFreeRate', +e.target.value)} />
          <Input label="Volatility" suffix="%" type="number" value={form.volatility} onChange={(e) => set('volatility', +e.target.value)} error={errors.volatility} />
          <Input label="Dividend yield" suffix="%" type="number" value={form.dividendYield} onChange={(e) => set('dividendYield', +e.target.value)} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.showGreeks} onChange={(e) => set('showGreeks', e.target.checked)} />
            Show Greeks
          </label>
        </>
      }
    />
  )
}
