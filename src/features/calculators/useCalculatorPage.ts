import { useState, useCallback, useEffect, useRef, type Dispatch, type SetStateAction } from 'react'
import { getCalculatorById } from '@/calculators/registry'
import { useApp } from '@/app/providers'
import { addRecentlyUsed } from '@/persistence/recentlyUsed'
import { saveHistoryRecord } from '@/persistence/history'
import { saveCalculation } from '@/persistence/saved'
import { consumePendingRestore } from '@/persistence/restore'
import { downloadCsv, tableToCsv } from '@/utils/csv'
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
  renderResults: (result: TResult, input: TInput) => React.ReactNode
  getShareText?: (result: TResult, input: TInput) => string
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
  const restoredRef = useRef(false)

  const isFavorite = favorites.includes(calculatorId)

  const handleCalculate = useCallback(
    (formInput: TInput, options?: { skipHistory?: boolean }) => {
      const validation = validate(formInput)
      if (!validation.valid) {
        setErrors(validation.errors)
        return
      }
      setErrors({})
      const computed = calculate(formInput)
      setResult(computed)
      setInput(formInput)
      addRecentlyUsed(calculatorId)
      if (!options?.skipHistory) {
        saveHistoryRecord({
          calculatorId,
          inputs: formInput,
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
    [validate, calculate, calculatorId, settings.settingsVersion],
  )

  const applyRestore = useCallback(
    (record: { inputs: unknown; results: unknown }, mode: 'reopen' | 'recalculate' | 'edit') => {
      const restoredInputs = record.inputs as TInput
      setForm(restoredInputs)
      if (mode === 'reopen') {
        setInput(restoredInputs)
        setResult(record.results as TResult)
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

  const handleFavoriteToggle = () => toggleFavorite(calculatorId)

  const getExportPayload = useCallback(() => {
    if (!result || !input) return null
    return buildLiveExportPayload({
      calculatorId,
      inputs: input,
      results: result,
      shareText: getShareText?.(result, input),
      explain,
      buildTable,
      buildCharts,
    })
  }, [result, input, calculatorId, getShareText, explain, buildTable, buildCharts])

  const handleExportCsv = useCallback(() => {
    if (!result || !buildTable) return
    const table = buildTable(result)
    downloadCsv(csvFilename ?? `${calculatorId}.csv`, tableToCsv(table))
  }, [result, buildTable, csvFilename, calculatorId])

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
    const text = getShareText?.(result, input!) ?? `${calc.title} result from CalcHub`
    await navigator.clipboard.writeText(text)
    setCopyNotice(true)
    window.setTimeout(() => setCopyNotice(false), 2000)
  }, [result, input, getShareText, calc.title])

  const handleNativeShare = useCallback(async () => {
    if (!result) return
    const text = getShareText?.(result, input!) ?? `${calc.title} result from CalcHub`
    await navigator.share({ title: calc.title, text })
  }, [result, input, getShareText, calc.title])

  const handleSave = useCallback(async () => {
    if (!result || !input) return
    const defaultName = calc.title
    const name = window.prompt('Name this calculation', defaultName)?.trim()
    if (!name) return
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
      name,
    )
  }, [result, input, calc.title, calculatorId, settings.settingsVersion])

  const set = <K extends keyof TInput>(key: K, value: TInput[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
  }

  const layoutProps = {
    title: calc.title,
    description: calc.description,
    isFavorite,
    onFavoriteToggle: handleFavoriteToggle,
    results: result && input ? renderResults(result, input) : null,
    explanation: result && input ? explain(input, result) : null,
    charts: result && buildCharts ? buildCharts(result) : undefined,
    table: result && buildTable ? buildTable(result) : null,
    onExportCsv: buildTable ? handleExportCsv : undefined,
    onExportPdf: handleExportPdf,
    onSave: handleSave,
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
