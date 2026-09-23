import { useEffect, useReducer } from 'react'
import { cn } from '@/utils/cn'
import { isFormField } from '@/utils/keyboard'
import {
  actionFromKey,
  clearLabel,
  displayExpression,
  initialCalculatorState,
  reduceCalculator,
  type CalculatorAction,
} from './engine'

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

export default function BasicCalculatorPage() {
  const [state, dispatch] = useReducer(reduceCalculator, initialCalculatorState)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (isFormField(event.target)) return
      const action = actionFromKey(event.key)
      if (!action) return
      event.preventDefault()
      dispatch(action)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const expression = displayExpression(state)

  return (
    <div className="max-w-md mx-auto px-4 py-8 lg:py-12">
      <h1 className="text-2xl font-bold text-text-primary mb-6">Calculator</h1>
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
            const wide = key.kind === 'action' && key.action.type === 'digit' && key.action.digit === '0'

            return (
              <button
                key={key.kind === 'clear' ? 'clear' : name}
                type="button"
                aria-label={name}
                onClick={() => dispatch(action)}
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
    </div>
  )
}
