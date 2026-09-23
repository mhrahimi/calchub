import { useCallback, useEffect, useReducer, useState } from 'react'
import { cn } from '@/utils/cn'
import { isFormField } from '@/utils/keyboard'
import {
  actionFromKey,
  clearLabel,
  displayExpression,
  initialCalculatorState,
  reduceCalculator,
  type CalculatorAction,
  type CalculatorState,
} from './engine'
import {
  clearHistoryStore,
  loadHistory,
  pushHistory,
  saveHistory,
  type CalculatorHistoryEntry,
} from './historyStore'

type Key =
  | { kind: 'action'; action: CalculatorAction; label: string; name: string; tone: 'fn' | 'op' | 'digit' }
  | { kind: 'clear'; tone: 'fn' }

const keys: Key[][] = [
  [
    { kind: 'clear', tone: 'fn' },
    { kind: 'action', action: { type: 'paren', which: '(' }, label: '(', name: 'Open parenthesis', tone: 'fn' },
    { kind: 'action', action: { type: 'paren', which: ')' }, label: ')', name: 'Close parenthesis', tone: 'fn' },
    { kind: 'action', action: { type: 'operator', operator: '÷' }, label: '÷', name: 'Divide', tone: 'op' },
  ],
  [
    { kind: 'action', action: { type: 'digit', digit: '7' }, label: '7', name: '7', tone: 'digit' },
    { kind: 'action', action: { type: 'digit', digit: '8' }, label: '8', name: '8', tone: 'digit' },
    { kind: 'action', action: { type: 'digit', digit: '9' }, label: '9', name: '9', tone: 'digit' },
    { kind: 'action', action: { type: 'operator', operator: '×' }, label: '×', name: 'Multiply', tone: 'op' },
  ],
  [
    { kind: 'action', action: { type: 'digit', digit: '4' }, label: '4', name: '4', tone: 'digit' },
    { kind: 'action', action: { type: 'digit', digit: '5' }, label: '5', name: '5', tone: 'digit' },
    { kind: 'action', action: { type: 'digit', digit: '6' }, label: '6', name: '6', tone: 'digit' },
    { kind: 'action', action: { type: 'operator', operator: '-' }, label: '−', name: 'Subtract', tone: 'op' },
  ],
  [
    { kind: 'action', action: { type: 'digit', digit: '1' }, label: '1', name: '1', tone: 'digit' },
    { kind: 'action', action: { type: 'digit', digit: '2' }, label: '2', name: '2', tone: 'digit' },
    { kind: 'action', action: { type: 'digit', digit: '3' }, label: '3', name: '3', tone: 'digit' },
    { kind: 'action', action: { type: 'operator', operator: '+' }, label: '+', name: 'Add', tone: 'op' },
  ],
  [
    { kind: 'action', action: { type: 'sign' }, label: '±', name: 'Change sign', tone: 'fn' },
    { kind: 'action', action: { type: 'percent' }, label: '%', name: 'Percent', tone: 'fn' },
    { kind: 'action', action: { type: 'operator', operator: '^' }, label: '^', name: 'Power', tone: 'op' },
    { kind: 'action', action: { type: 'equals' }, label: '=', name: 'Equals', tone: 'op' },
  ],
  [
    { kind: 'action', action: { type: 'digit', digit: '0' }, label: '0', name: '0', tone: 'digit' },
    { kind: 'action', action: { type: 'decimal' }, label: '.', name: 'Decimal point', tone: 'digit' },
  ],
]

function recordEquals(
  prev: CalculatorState,
  next: CalculatorState,
  history: CalculatorHistoryEntry[],
): CalculatorHistoryEntry[] | null {
  if (!next.justEvaluated || next.error) return null
  if (
    prev.justEvaluated &&
    prev.entry === next.entry &&
    prev.expression === next.expression
  ) {
    return null
  }
  const expression = next.expression.trim()
  if (!expression) return null
  return pushHistory(history, { expression, result: next.entry })
}

export default function BasicCalculatorPage() {
  const [state, dispatchRaw] = useReducer(reduceCalculator, initialCalculatorState)
  const [history, setHistory] = useState<CalculatorHistoryEntry[]>(loadHistory)

  const onAction = useCallback(
    (action: CalculatorAction) => {
      if (action.type === 'equals') {
        const next = reduceCalculator(state, action)
        setHistory((current) => {
          const updated = recordEquals(state, next, current)
          if (!updated) return current
          saveHistory(updated)
          return updated
        })
      }
      dispatchRaw(action)
    },
    [state],
  )

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (isFormField(event.target)) return
      const action = actionFromKey(event.key)
      if (!action) return
      event.preventDefault()
      onAction(action)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onAction])

  const clearHistory = () => {
    clearHistoryStore()
    setHistory([])
  }

  const reuseResult = (entry: CalculatorHistoryEntry) => {
    onAction({ type: 'loadResult', value: entry.result })
  }

  const expression = displayExpression(state)

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 lg:py-12">
      <h1 className="text-2xl font-bold text-text-primary mb-6">Calculator</h1>
      <div className="grid lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] gap-4 items-start">
        <div className="rounded-2xl border border-border bg-white p-4">
          <div className="min-h-20 mb-4 px-2 text-right">
            <p
              className="min-h-10 text-sm text-text-muted tabular-nums break-all leading-snug"
              aria-hidden={expression === ''}
              aria-label={expression ? 'Expression' : undefined}
            >
              {expression || '\u00a0'}
            </p>
            <p
              className={cn(
                'text-4xl leading-tight font-medium tabular-nums truncate',
                state.error ? 'text-text-secondary' : 'text-text-primary',
              )}
              role="status"
              aria-live="polite"
              aria-atomic="true"
              aria-label="Result"
            >
              {state.entry}
            </p>
          </div>

          <div className="grid grid-cols-4 gap-2" role="group" aria-label="Keypad">
            {keys.flat().map((key) => {
              const action: CalculatorAction =
                key.kind === 'clear' ? { type: 'clear' } : key.action
              const label = key.kind === 'clear' ? clearLabel(state) : key.label
              const name =
                key.kind === 'clear' ? (label === 'C' ? 'Clear entry' : 'All clear') : key.name
              const wide =
                key.kind === 'action' && key.action.type === 'digit' && key.action.digit === '0'

              return (
                <button
                  key={key.kind === 'clear' ? 'clear' : name}
                  type="button"
                  aria-label={name}
                  onClick={() => onAction(action)}
                  className={cn(
                    'h-14 rounded-2xl text-xl font-medium transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                    wide && 'col-span-2',
                    key.tone === 'op' && 'bg-primary text-white hover:bg-primary-dark',
                    key.tone === 'fn' && 'bg-surface-light text-primary hover:bg-surface-lighter',
                    key.tone === 'digit' &&
                      'bg-background-secondary text-text-primary border border-border hover:border-primary',
                  )}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        <section
          className="rounded-2xl border border-border bg-white p-4 flex flex-col min-h-[16rem] lg:min-h-[28rem]"
          aria-label="Calculation history"
        >
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="text-sm font-semibold text-text-primary">History</h2>
            {history.length > 0 && (
              <button
                type="button"
                onClick={clearHistory}
                className="text-xs font-medium text-text-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-md px-1.5 py-1"
              >
                Clear history
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <p className="text-sm text-text-muted py-8 text-center">No calculations yet</p>
          ) : (
            <ul className="flex-1 overflow-y-auto max-h-[20rem] lg:max-h-[32rem] divide-y divide-border -mx-1">
              {history.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => reuseResult(item)}
                    className="w-full text-right px-2 py-3 rounded-lg hover:bg-surface-lighter transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
                    aria-label={`Reuse result ${item.result} from ${item.expression}`}
                  >
                    <span className="block text-xs text-text-muted tabular-nums break-all leading-snug">
                      {item.expression}
                    </span>
                    <span className="block text-base font-medium text-text-primary tabular-nums mt-0.5">
                      {item.result}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
