import { Activity, TrendingUp } from 'lucide-react'
import { CalculatorLayout } from '@/components/calculator/CalculatorLayout'
import { CalcSection, HeroResult, KeyMetrics, Note, Panel, Toggle } from '@/components/calculator/sections'
import { Input } from '@/components/ui/Input'
import { MetricRow } from '@/components/ui/ResultBlock'
import { useCalculatorPage } from './useCalculatorPage'
import {
  calculateBlackScholes,
  explainBlackScholes,
  buildBlackScholesCharts,
  buildBlackScholesTable,
} from '@/calculators/finance/blackScholes/calculate'
import { validateBlackScholes } from '@/calculators/finance/blackScholes/validation'
import type { BlackScholesInput } from '@/calculators/finance/blackScholes/types'

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
    live: true,
    csvFilename: 'black-scholes.csv',
    getShareText: (r, _input, formatResultCurrency) => `Call: ${formatResultCurrency(r.callPrice)}, Put: ${formatResultCurrency(r.putPrice)}`,
    renderResults: (r, _input, formatResultCurrency) => (
      <div className="calc-results">
        <HeroResult eyebrow="CALL PRICE" title="Call price" amount={formatResultCurrency(r.callPrice)} caption={<p className="calc-hero-caption">Put price {formatResultCurrency(r.putPrice)}.</p>} />
        <KeyMetrics items={[
          { icon: <TrendingUp aria-hidden="true" />, label: 'Put price', value: formatResultCurrency(r.putPrice) },
          { icon: <Activity aria-hidden="true" />, label: 'Delta (call)', value: r.greeks ? String(r.greeks.deltaCall) : '—' },
        ]} />
        {r.greeks && (
          <Panel title="Greeks">
            <MetricRow label="Delta (call)" value={r.greeks.deltaCall} />
            <MetricRow label="Gamma" value={r.greeks.gamma} />
            <MetricRow label="Vega" value={r.greeks.vega} />
            <MetricRow label="Theta (call)" value={r.greeks.thetaCall} />
          </Panel>
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
          <CalcSection index={1} title="Contract">
            <Input label="Stock price" prefix="$" grouped value={form.spot} onValueChange={(n) => set('spot', n)} error={errors.spot} />
            <Input label="Strike price" prefix="$" grouped value={form.strike} onValueChange={(n) => set('strike', n)} error={errors.strike} />
            <Input label="Time to expiration" suffix="years" type="number" value={form.timeYears} onChange={(e) => set('timeYears', +e.target.value)} error={errors.timeYears} />
          </CalcSection>
          <CalcSection index={2} title="Market assumptions">
            <Input label="Risk-free rate" suffix="%" type="number" value={form.riskFreeRate} onChange={(e) => set('riskFreeRate', +e.target.value)} />
            <Input label="Volatility" suffix="%" type="number" value={form.volatility} onChange={(e) => set('volatility', +e.target.value)} error={errors.volatility} />
            <Input label="Dividend yield" suffix="%" type="number" value={form.dividendYield} onChange={(e) => set('dividendYield', +e.target.value)} />
            <Toggle checked={form.showGreeks} onChange={checked => set('showGreeks', checked)} label="Show Greeks" />
            <Note>Your estimate updates automatically as you edit.</Note>
          </CalcSection>
        </div>
      }
    />
  )
}
