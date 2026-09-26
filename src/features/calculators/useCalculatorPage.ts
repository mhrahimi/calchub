import { comparisonIssue, withComparison, type ComparisonSnapshot } from '@/features/comparison/model'
import { presentCharts, withBaseline } from '@/utils/chartPresentation'
import { resultFields } from '@/exports/reportFields'
import { captureProvenance, legacyProvenance, snapshotCurrency, snapshotExplanation, inputsDiffer } from '@/exports/provenance'
import type { ResultMetadata } from '@/exports/resultMetadata'
import { resultMetadata } from '@/exports/resultMetadata'
import { payloadToCsv } from '@/exports/recordCsv'
import { createElement, useState, useCallback, useEffect, useRef, useMemo, type Dispatch, type SetStateAction } from 'react'
import { getCalculatorById } from '@/calculators/registry'
import { useApp } from '@/app/providers'
import { addRecentlyUsed } from '@/persistence/recentlyUsed'
import { saveHistoryRecord } from '@/persistence/history'
import { saveCalculation } from '@/persistence/saved'
import { consumePendingRestore } from '@/persistence/restore'
import { downloadCsv } from '@/utils/csv'
import { formatCurrency } from '@/utils/currency'
import { buildLiveExportPayload } from '@/exports/buildPayload'
import { downloadPdf } from '@/exports/pdf'
import type { CalculationExplanation, ChartData, TableData } from '@/calculators/types'

interface UseCalculatorPageOptions<TInput extends object, TResult> {
  calculatorId: string
  defaultInput: TInput
  validate: (input: TInput) => { valid: true; data: unknown } | { valid: false; errors: Record<string, string> }
  calculate: (input: TInput) => TResult
  explain: (input: TInput, result: TResult) => CalculationExplanation
  buildCharts?: (result: TResult) => ChartData[]
  buildTable?: (result: TResult) => TableData
  renderResults: (result: TResult, input: TInput, formatResultCurrency: (value:number)=>string) => React.ReactNode
  getShareText?: (result: TResult, input: TInput, formatResultCurrency: (value:number)=>string) => string
  csvFilename?: string
  /** Skip auto-restore (e.g. DcfLboPage handles restore manually) */
  skipRestore?: boolean
  /** External form state when page manages multiple forms */
  externalForm?: TInput
  externalSetForm?: Dispatch<SetStateAction<TInput>>
}

export function useCalculatorPage<TInput extends object, TResult>({
  calculatorId,
  defaultInput,
  validate,
  calculate,
  explain,
  buildCharts,
  buildTable,
  renderResults,
  getShareText,
  csvFilename,
  skipRestore = false,
  externalForm,
  externalSetForm,
}: UseCalculatorPageOptions<TInput, TResult>) {
  const calc = getCalculatorById(calculatorId)!
  const { favorites, toggleFavorite, settings } = useApp()
  const [internalForm, internalSetForm] = useState(defaultInput)
  const form = externalForm ?? internalForm
  const setForm = externalSetForm ?? internalSetForm
  const [result, setResult] = useState<TResult | null>(null)
  const [input, setInput] = useState<TInput | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [pdfLoading, setPdfLoading] = useState(false)
  const [copyNotice, setCopyNotice] = useState(false)
  const [savedNotice, setSavedNotice] = useState('')
  const [comparisonOpen,setComparisonOpen] = useState(false)
  const [baseline,setBaseline] = useState<ComparisonSnapshot|null>(null)
  const restoredRef = useRef(false)

  const isFavorite = favorites.includes(calculatorId)

  const handleCalculate = useCallback(
    (formInput: TInput, options?: { skipHistory?: boolean }) => {
      setSavedNotice('')
      setCopyNotice(false)
      const validation = validate(formInput)
      if (!validation.valid) {
        setResult(null)
        setInput(null)
        setErrors(validation.errors)
        requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
        return
      }
      setErrors({})
      const normalized = structuredClone(validation.data) as TInput
      let computed: TResult
      try {
        const raw = calculate(normalized)
        const metadata = resultMetadata(calculatorId, raw, explain(normalized, raw))
        metadata.provenance = captureProvenance(calculatorId, normalized, metadata, settings, raw)
        metadata.explanation = snapshotExplanation(explain(normalized,raw),metadata.provenance)
        computed = { ...raw, metadata }
      } catch (error) {
        setResult(null)
        setInput(null)
        setErrors({calculation: error instanceof Error ? error.message : 'Calculation failed'})
        return
      }
      setResult(computed)
      setForm(structuredClone(normalized))
      setInput(normalized)
      addRecentlyUsed(calculatorId)
      if (!options?.skipHistory) {
        saveHistoryRecord({
          calculatorId,
          inputs: normalized,
          results: computed,
          settingsVersion: settings.settingsVersion,
          taxConfigVersion:
            computed &&
            typeof computed === 'object' &&
            'taxConfigVersion' in computed
              ? String((computed as { taxConfigVersion?: string }).taxConfigVersion)
              : undefined,
        }).catch(() => {})
      }
    },
    [validate, calculate, calculatorId, settings],
  )

  const applyRestore = useCallback(
    (record: { inputs: unknown; results: unknown }, mode: 'reopen' | 'recalculate' | 'edit') => {
      const restoredInputs = record.inputs as TInput
      setForm(structuredClone(restoredInputs))
      if (mode === 'reopen') {
        setInput(structuredClone(restoredInputs))
        const restored = structuredClone(record.results) as TResult & {metadata?:ResultMetadata}
        const metadata = resultMetadata(calculatorId,restored,undefined,!restored.metadata)
        metadata.provenance ??= legacyProvenance(metadata.modelVersion, (record as {createdAt?:string}).createdAt)
        if (!metadata.provenance.currency) metadata.warnings = [...new Set([...metadata.warnings, 'Currency and display settings were not recorded. Recalculate with explicit settings to create a new snapshot.'])]
        setResult({...restored, metadata})
      } else {
        handleCalculate(restoredInputs, { skipHistory: true })
      }
    },
    [setForm, handleCalculate],
  )

  useEffect(() => {
    if (skipRestore || restoredRef.current) return
    const pending = consumePendingRestore(calculatorId)
    if (!pending) return
    restoredRef.current = true
    applyRestore(pending.record, pending.mode)
  }, [calculatorId, skipRestore, applyRestore])

  const savedMetadata = result && (result as {metadata?:ResultMetadata}).metadata
  const provenance = savedMetadata?.provenance
  const money = (value:number) => snapshotCurrency(value,provenance)
  const explanation = result && input ? savedMetadata?.explanation ?? snapshotExplanation(explain(input,result),provenance ?? legacyProvenance('legacy')) : null
  const dirty = !!input && inputsDiffer(form,input)
  const fields = result && input ? resultFields(calculatorId,input,result,provenance ?? legacyProvenance('legacy'),savedMetadata?.primaryResult??null) : []
  const summaryText = `${calc.title}
${fields.filter(f=>f.primary).map(f=>`${f.label}: ${f.display}`).join('\n')}
${provenance?.calculatedAt ? `Calculated ${provenance.calculatedAt}` : ''}`

  const handleFavoriteToggle = () => toggleFavorite(calculatorId)

  const getExportPayload = useCallback(() => {
    if (!result || !input) return null
    const payload = buildLiveExportPayload({
      calculatorId,
      inputs: input,
      results: result,
      shareText: getShareText?.(result, input, money),
      explain: () => explanation!,
      buildTable,
      buildCharts,
    })
    return withComparison(payload,baseline)
  }, [result, input, calculatorId, getShareText, explain, buildTable, buildCharts, baseline])

  const currentPayload=useMemo(()=>result&&input?buildLiveExportPayload({calculatorId,inputs:input,results:result,explain,buildTable,buildCharts}):null,[result,input,calculatorId,explain,buildTable,buildCharts])
  const charts=useMemo(()=>result&&input&&buildCharts?presentCharts(calculatorId,input,result,buildCharts(result),provenance):undefined,[result,input,calculatorId,buildCharts,provenance])
  const comparedCharts=baseline&&currentPayload&&!comparisonIssue(currentPayload,baseline.payload)?withBaseline(charts??[],baseline.payload.charts??[],baseline.name):charts


  const handleExportCsv = useCallback(() => {
    if (!result || !buildTable) return
    const payload = getExportPayload()
    if (payload) downloadCsv(csvFilename ?? `${calculatorId}.csv`, payloadToCsv(payload))
  }, [result, buildTable, csvFilename, calculatorId, getExportPayload])

  const handleExportPdf = useCallback(async () => {
    const payload = getExportPayload()
    if (!payload) return
    setPdfLoading(true)
    try {
      await downloadPdf(
        payload,
        `${calculatorId}-report.pdf`,
        { tableMode: settings.pdfTableMode },
      )
    } finally {
      setPdfLoading(false)
    }
  }, [getExportPayload, calculatorId, settings.pdfTableMode])

  const handleCopySummary = useCallback(async () => {
    if (!result) return
    const text = summaryText
    await navigator.clipboard.writeText(text)
    setCopyNotice(true)
    window.setTimeout(() => setCopyNotice(false), 2000)
  }, [result, summaryText, calc.title])

  const handleNativeShare = useCallback(async () => {
    if (!result) return
    const text = summaryText
    await navigator.share({ title: calc.title, text })
  }, [result, summaryText, calc.title])

  const [saveOpen, setSaveOpen] = useState(false)
  const handleSave = useCallback(async (name: string) => {
    if (!result || !input || !name.trim()) return
    await saveCalculation(
      {
        calculatorId,
        inputs: input,
        results: result,
        settingsVersion: settings.settingsVersion,
        taxConfigVersion:
          result &&
          typeof result === 'object' &&
          'taxConfigVersion' in result
            ? String((result as { taxConfigVersion?: string }).taxConfigVersion)
            : undefined,
      },
      name.trim(),
    )
    setSaveOpen(false)
    setSavedNotice(`Saved as ${name.trim()}`)
  }, [result, input, calculatorId, settings.settingsVersion])

  const set = <K extends keyof TInput>(key: K, value: TInput[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
  }

  const layoutProps = {
    resultFields: fields,
    currentPayload,
    baseline,
    onBaseline: setBaseline,
    comparisonOpen,
    onCompare: () => setComparisonOpen(open=>!open),
    resultWarnings: savedMetadata?.warnings??[],
    title: calc.title,
    description: calc.description,
    isFavorite,
    onFavoriteToggle: handleFavoriteToggle,
    calculationError: errors.calculation,
    inputsChanged: dirty,
    provenance,
    saveOpen,
    savedNotice,
    onSaveCancel: () => setSaveOpen(false),
    onSaveConfirm: handleSave,
    resultAnnouncement: result ? `${summaryText}${dirty ? '. Inputs changed; recalculate.' : ''}` : '',
    results: result && input ? createElement('div', {},
      ...(['income-tax','salary','retirement','cre-waterfall','lbo'].includes(calculatorId) ? (explanation?.assumptions??[]).map((w,i)=>createElement('p',{key:`assumption-${i}`,className:'text-sm'},w)) : []),
      renderResults(result,input,money)) : null,
    explanation,
    charts: comparedCharts,
    table: result && buildTable ? buildTable(result) : null,
    onExportCsv: buildTable ? handleExportCsv : undefined,
    onExportPdf: handleExportPdf,
    onSave: () => setSaveOpen(true),
    pdfLoading,
    copyNotice,
    shareActions: {
      onNativeShare: handleNativeShare,
      onCopySummary: handleCopySummary,
      canShareNative: typeof navigator !== 'undefined' && !!navigator.share,
      canPdf: false,
      canCsv: false,
    },
  }

  return {
    calc,
    form,
    setForm,
    set,
    result,
    input,
    errors,
    setErrors,
    pdfLoading,
    handleCalculate,
    handleExportCsv,
    handleExportPdf,
    handleSave,
    applyRestore,
    layoutProps,
  }
}

export function formatResultCurrency(value: number): string {
  return formatCurrency(value)
}
