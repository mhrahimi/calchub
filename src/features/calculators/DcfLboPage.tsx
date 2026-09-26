import { useState, useEffect } from 'react'
import { CalculatorLayout } from '@/components/calculator/CalculatorLayout'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { ResultBlock, MetricRow } from '@/components/ui/ResultBlock'
import { DataTable } from '@/components/calculator/DataTable'
import { useCalculatorPage } from './useCalculatorPage'
import {
  calculateDcf,
  explainDcf,
  buildDcfCharts,
  buildDcfTable,
  buildDcfSensitivityTable,
} from '@/calculators/finance/dcf/calculate'
import { validateDcf } from '@/calculators/finance/dcf/validation'
import type { DcfInput } from '@/calculators/finance/dcf/types'
import {
  calculateLbo,
  explainLbo,
  buildLboCharts,
  buildLboTable,
} from '@/calculators/finance/lbo/calculate'
import { validateLbo } from '@/calculators/finance/lbo/validation'
import { consumePendingRestore } from '@/persistence/restore'
import type { LboInput } from '@/calculators/finance/lbo/types'

function isLboInput(inputs: unknown): inputs is LboInput {
  return typeof inputs === 'object' && inputs !== null && 'purchaseEv' in inputs
}

const defaultDcf: DcfInput = {
  forecast: [
    { revenue: 100_000_000, ebitdaMargin: 20, taxRate: 25, capexPercent: 5, nwcPercent: 10 },
    { revenue: 110_000_000, ebitdaMargin: 20, taxRate: 25, capexPercent: 5, nwcPercent: 10 },
    { revenue: 121_000_000, ebitdaMargin: 20, taxRate: 25, capexPercent: 5, nwcPercent: 10 },
    { revenue: 133_100_000, ebitdaMargin: 20, taxRate: 25, capexPercent: 5, nwcPercent: 10 },
    { revenue: 146_410_000, ebitdaMargin: 20, taxRate: 25, capexPercent: 5, nwcPercent: 10 },
  ],
  wacc: 10,
  terminalGrowth: 2,
  terminalMethod: 'gordon',
  exitMultiple: 8,
  netDebt: 200_000_000,
  cash: 50_000_000,
}

const defaultLbo: LboInput = {
  purchaseEv: 1_000_000_000,
  sponsorEquity: 300_000_000,
  initialDebt: 700_000_000,
  interestRate: 8,
  forecast: [
    { ebitda: 100_000_000, capex: 10_000_000, nwcChange: 5_000_000 },
    { ebitda: 110_000_000, capex: 11_000_000, nwcChange: 5_000_000 },
    { ebitda: 120_000_000, capex: 12_000_000, nwcChange: 5_000_000 },
    { ebitda: 130_000_000, capex: 13_000_000, nwcChange: 5_000_000 },
    { ebitda: 140_000_000, capex: 14_000_000, nwcChange: 5_000_000 },
  ],
  exitMultiple: 8,
  exitYear: 5,
}

export default function DcfLboPage({ fixedMode }: { fixedMode?: 'dcf' | 'lbo' }) {
  const [mode, setMode] = useState<'dcf' | 'lbo'>(fixedMode ?? 'dcf')
  const [dcfForm, setDcfForm] = useState(defaultDcf)
  const [lboForm, setLboForm] = useState(defaultLbo)

  const dcfPage = useCalculatorPage({
    calculatorId: 'dcf',
    defaultInput: defaultDcf,
    skipRestore: true,
    externalForm: dcfForm,
    externalSetForm: setDcfForm,
    validate: validateDcf,
    calculate: calculateDcf,
    explain: explainDcf,
    buildCharts: buildDcfCharts,
    buildTable: buildDcfTable,
    csvFilename: 'dcf-forecast.csv',
    getShareText: (r, _input, formatResultCurrency) => `EV: ${formatResultCurrency(r.enterpriseValue)}, Equity: ${formatResultCurrency(r.equityValue)}`,
    renderResults: (r, _input, formatResultCurrency) => (
      <div className="space-y-4">
        <ResultBlock label="Enterprise value" value={formatResultCurrency(r.enterpriseValue)} primary />
        <ResultBlock label="Equity value" value={formatResultCurrency(r.equityValue)} />
        <div className="rounded-2xl border border-border bg-white p-4">
          <MetricRow label="PV of FCF" value={formatResultCurrency(r.pvFcf)} />
          <MetricRow label="Terminal value" value={formatResultCurrency(r.terminalValue)} />
        </div>
        {r.sensitivity.length > 0 && <DataTable table={buildDcfSensitivityTable(r)} />}
      </div>
    ),
  })

  const lboPage = useCalculatorPage({
    calculatorId: 'lbo',
    defaultInput: defaultLbo,
    skipRestore: true,
    externalForm: lboForm,
    externalSetForm: setLboForm,
    validate: validateLbo,
    calculate: calculateLbo,
    explain: explainLbo,
    buildCharts: buildLboCharts,
    buildTable: buildLboTable,
    csvFilename: 'lbo-schedule.csv',
    getShareText: (r, _input, _formatResultCurrency) => `MOIC: ${r.moic.toFixed(2)}x, IRR: ${r.irr !== null ? (r.irr * 100).toFixed(1) : 'N/A'}%`,
    renderResults: (r, _input, formatResultCurrency) => (
      <div className="space-y-4">
        <ResultBlock label="MOIC" value={`${r.moic.toFixed(2)}x`} primary />
        <ResultBlock label="IRR" value={r.irr !== null ? `${(r.irr * 100).toFixed(2)}%` : 'N/A'} />
        <div className="rounded-2xl border border-border bg-white p-4">
          <MetricRow label="Exit EV" value={formatResultCurrency(r.exitEv)} />
          <MetricRow label="Exit equity" value={formatResultCurrency(r.exitEquity)} />
          <MetricRow label="Retained cash" value={formatResultCurrency(r.exitCash ?? 0)} />
          <MetricRow label="Total sources" value={formatResultCurrency(r.sourcesTotal ?? 0)} />
          <MetricRow label="Total uses" value={formatResultCurrency(r.usesTotal ?? 0)} />
        </div>
      </div>
    ),
  })

  const active = mode === 'dcf' ? dcfPage : lboPage
  const layoutProps = active.layoutProps

  useEffect(() => {
    // One-time consume on mount; DcfLboPage owns dual-form routing for restore.
    const pending = consumePendingRestore(fixedMode ?? 'dcf-lbo')
    if (!pending) return
    const lbo = isLboInput(pending.record.inputs)
    setMode(lbo ? 'lbo' : 'dcf')
    if (lbo) {
      setLboForm(pending.record.inputs as LboInput)
      lboPage.applyRestore(pending.record, pending.mode)
    } else {
      setDcfForm(pending.record.inputs as DcfInput)
      dcfPage.applyRestore(pending.record, pending.mode)
    }
  }, [])

  return (
    <CalculatorLayout
      {...layoutProps}
      onCalculate={() => (mode === 'dcf' ? dcfPage.handleCalculate(dcfForm) : lboPage.handleCalculate(lboForm))}
      inputs={
        <>
          {!fixedMode && <SegmentedControl
            value={mode}
            onChange={setMode}
            options={[
              { value: 'dcf', label: 'DCF' },
              { value: 'lbo', label: 'LBO' },
            ]}
          />}
          {mode === 'dcf' ? (
            <>
              <Input label="WACC" suffix="%" type="number" value={dcfForm.wacc} onChange={(e) => setDcfForm((f) => ({ ...f, wacc: +e.target.value }))} error={dcfPage.errors.wacc} />
              <Input label="Terminal growth" suffix="%" type="number" signed value={dcfForm.terminalGrowth} onChange={(e) => setDcfForm((f) => ({ ...f, terminalGrowth: +e.target.value }))} error={dcfPage.errors.terminalGrowth} />
              <Select
                label="Terminal method"
                value={dcfForm.terminalMethod}
                onChange={(v) => setDcfForm((f) => ({ ...f, terminalMethod: v as DcfInput['terminalMethod'] }))}
                options={[
                  { value: 'gordon', label: 'Gordon growth' },
                  { value: 'exitMultiple', label: 'Exit multiple' },
                ]}
              />
              {dcfForm.terminalMethod === 'exitMultiple' && (
                <Input label="Exit multiple" suffix="x" type="number" value={dcfForm.exitMultiple} onChange={(e) => setDcfForm((f) => ({ ...f, exitMultiple: +e.target.value }))} error={dcfPage.errors.exitMultiple} />
              )}
              <Input label="Net debt" prefix="$" grouped signed value={dcfForm.netDebt} onValueChange={(n) => setDcfForm((f) => ({ ...f, netDebt: n }))} />
              <p className="text-xs">Net debt includes cash. Do not subtract cash again.</p>
              <Input label="Opening working capital" prefix="$" type="number" value={dcfForm.baseNwc ?? 0} onChange={(e)=>setDcfForm(f=>({...f,baseNwc:+e.target.value}))} />
              {dcfForm.forecast.map((year,i)=><fieldset key={i} className="space-y-2"><legend>Year {i+1}</legend>{(['revenue','ebitdaMargin','depreciation','taxRate','capexPercent','nwcPercent'] as const).map(key=><Input key={key} id={`dcf-${i}-${key}`} label={{revenue:'Revenue',ebitdaMargin:'EBITDA margin (%)',depreciation:'D&A',taxRate:'Cash tax rate (%)',capexPercent:'Capex / revenue (%)',nwcPercent:'Working capital / revenue (%)'}[key]} type="number" value={year[key]??0} onChange={e=>setDcfForm(f=>({...f,forecast:f.forecast.map((y,j)=>j===i?{...y,[key]:+e.target.value}:y)}))} />)}</fieldset>)}
              <button type="button" onClick={()=>setDcfForm(f=>({...f,forecast:[...f.forecast,{...f.forecast[f.forecast.length-1]}]}))}>Add forecast year</button>
              <button type="button" disabled={dcfForm.forecast.length<=1} onClick={()=>setDcfForm(f=>({...f,forecast:f.forecast.slice(0,-1)}))}>Remove final year</button>
            </>
          ) : (
            <>
              <Input label="Purchase EV" prefix="$" grouped value={lboForm.purchaseEv} onValueChange={(n) => setLboForm((f) => ({ ...f, purchaseEv: n }))} error={lboPage.errors.purchaseEv} />
              <Input label="Sponsor equity" prefix="$" grouped value={lboForm.sponsorEquity} onValueChange={(n) => setLboForm((f) => ({ ...f, sponsorEquity: n }))} error={lboPage.errors.sponsorEquity} />
              <Input label="Initial debt" prefix="$" grouped value={lboForm.initialDebt} onValueChange={(n) => setLboForm((f) => ({ ...f, initialDebt: n }))} />
              <Input label="Interest rate" suffix="%" type="number" value={lboForm.interestRate} onChange={(e) => setLboForm((f) => ({ ...f, interestRate: +e.target.value }))} />
              <Input label="Exit multiple" suffix="x" type="number" value={lboForm.exitMultiple} onChange={(e) => setLboForm((f) => ({ ...f, exitMultiple: +e.target.value }))} error={lboPage.errors.exitMultiple} />
              <Input label="Transaction fees" type="number" value={lboForm.transactionFees??0} onChange={e=>setLboForm(f=>({...f,transactionFees:+e.target.value}))} />
              <Input label="Minimum cash" type="number" value={lboForm.minimumCash??0} onChange={e=>setLboForm(f=>({...f,minimumCash:+e.target.value}))} />
              <Input label="Cash sweep (%)" type="number" value={lboForm.cashSweepPercent??100} onChange={e=>setLboForm(f=>({...f,cashSweepPercent:+e.target.value}))} />
              {lboForm.forecast.map((year,i)=><fieldset key={i} className="space-y-2"><legend>Year {i+1}</legend>{(['ebitda','depreciation','taxRate','capex','nwcChange'] as const).map(key=><Input key={key} id={`lbo-${i}-${key}`} label={{ebitda:'EBITDA',depreciation:'D&A',taxRate:'Cash tax rate (%)',capex:'Capex',nwcChange:'Change in working capital'}[key]} type="number" signed value={year[key]??0} onChange={e=>setLboForm(f=>({...f,forecast:f.forecast.map((y,j)=>j===i?{...y,[key]:+e.target.value}:y)}))} />)}</fieldset>)}
              <Input label="Exit year" type="number" min={1} max={lboForm.forecast.length} value={lboForm.exitYear} onChange={(e) => setLboForm((f) => ({ ...f, exitYear: +e.target.value }))} error={lboPage.errors.exitYear} />
            </>
          )}
        </>
      }
    />
  )
}
