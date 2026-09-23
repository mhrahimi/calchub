import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ChevronLeft, ChevronUp } from 'lucide-react'
import { cn } from '@/utils/cn'
import { isFormField } from '@/utils/keyboard'
import { getItem, setItem } from '@/persistence/storage'
import {
  clearLabel,
  displayExpression,
  initialCalculatorState,
  reduceCalculator,
  type CalculatorAction,
  type CalculatorState,
} from './engine'
import { FxIcon } from './FxIcon'
import { formatCalculatorDisplay } from './formatDisplay'
import { keyBindings } from './keyBindings'
import { createKeyChordController } from './keyChordController'
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

const SCIENTIFIC_OPEN_KEY = 'basic-calculator-scientific-open'

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

type SciKey = { kind: 'action'; action: CalculatorAction; label: string; name: string }
function scientificKeys(angleMode: 'deg' | 'rad'): SciKey[] {
  return [
    { kind: 'action', action: { type: 'fn', name: 'sin' }, label: 'sin', name: 'Sine' },
    { kind: 'action', action: { type: 'fn', name: 'cos' }, label: 'cos', name: 'Cosine' },
    { kind: 'action', action: { type: 'fn', name: 'tan' }, label: 'tan', name: 'Tangent' },
    {
      kind: 'action',
      action: { type: 'toggleAngle' },
      label: angleMode.toUpperCase(),
      name: `Switch to ${angleMode === 'deg' ? 'radians' : 'degrees'}`,
    },
    { kind: 'action', action: { type: 'fn', name: 'sinh' }, label: 'sinh', name: 'Hyperbolic sine' },
    { kind: 'action', action: { type: 'fn', name: 'cosh' }, label: 'cosh', name: 'Hyperbolic cosine' },
    { kind: 'action', action: { type: 'fn', name: 'tanh' }, label: 'tanh', name: 'Hyperbolic tangent' },
    { kind: 'action', action: { type: 'constant', name: 'π' }, label: 'π', name: 'Pi' },
    { kind: 'action', action: { type: 'fn', name: 'ln' }, label: 'ln', name: 'Natural log' },
    { kind: 'action', action: { type: 'fn', name: 'log' }, label: 'log', name: 'Log base 10' },
    { kind: 'action', action: { type: 'fn', name: 'logx' }, label: 'logₓ', name: 'Log base x' },
    { kind: 'action', action: { type: 'constant', name: 'e' }, label: 'e', name: 'Euler number' },
    { kind: 'action', action: { type: 'fn', name: 'sqrt' }, label: '√', name: 'Square root' },
    { kind: 'action', action: { type: 'postfix', name: '!' }, label: 'x!', name: 'Factorial' },
    { kind: 'action', action: { type: 'postfix', name: '²' }, label: 'x²', name: 'Square' },
    { kind: 'action', action: { type: 'postfix', name: 'reciprocal' }, label: '1/x', name: 'Reciprocal' },
    { kind: 'action', action: { type: 'postfix', name: 'abs' }, label: '|x|', name: 'Absolute value' },
    { kind: 'action', action: { type: 'fn', name: 'exp' }, label: 'eˣ', name: 'e to the x' },
    { kind: 'action', action: { type: 'fn', name: 'tenexp' }, label: '10ˣ', name: '10 to the x' },
    { kind: 'action', action: { type: 'fn', name: 'cbrt' }, label: '∛', name: 'Cube root' },
    { kind: 'action', action: { type: 'comma' }, label: ',', name: 'Argument separator' },
  ]
}

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

function KeyButton({
  label,
  name,
  tone,
  wide,
  onClick,
  className,
}: {
  label: string
  name: string
  tone: 'fn' | 'op' | 'digit'
  wide?: boolean
  onClick: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      aria-label={name}
      onClick={onClick}
      className={cn(
        'h-12 lg:h-14 rounded-2xl text-sm lg:text-xl font-medium transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        wide && 'col-span-2',
        tone === 'op' && 'bg-primary text-white hover:bg-primary-dark',
        tone === 'fn' && 'bg-surface-light text-primary hover:bg-surface-lighter',
        tone === 'digit' &&
          'bg-background-secondary text-text-primary border border-border hover:border-primary',
        className,
      )}
    >
      {label}
    </button>
  )
}

export default function BasicCalculatorPage() {
  const [state, dispatchRaw] = useReducer(reduceCalculator, initialCalculatorState)
  const [history, setHistory] = useState<CalculatorHistoryEntry[]>(loadHistory)
  const [scientificOpen, setScientificOpen] = useState(() =>
    getItem<boolean>(SCIENTIFIC_OPEN_KEY, false),
  )
  const [helpOpen, setHelpOpen] = useState(false)
  const reduceMotion = useReducedMotion()
  const chordRef = useRef(createKeyChordController())
  const onActionRef = useRef<(action: CalculatorAction) => void>(() => {})
  const helpRef = useRef<HTMLDivElement>(null)

  const toggleScientific = () => {
    setScientificOpen((open) => {
      const next = !open
      setItem(SCIENTIFIC_OPEN_KEY, next)
      return next
    })
  }

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
  onActionRef.current = onAction

  useEffect(() => {
    const chord = chordRef.current

    const apply = (actions: CalculatorAction[]) => {
      for (const action of actions) onActionRef.current(action)
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (isFormField(event.target)) return

      if (helpOpen && event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        setHelpOpen(false)
        return
      }

      const result = chord.onKeyDown(event.key, performance.now(), {
        repeat: event.repeat,
      })
      if (!result.handled) return
      event.preventDefault()
      event.stopPropagation()
      apply(result.actions)
    }

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (isFormField(event.target)) return
      const result = chord.onKeyUp(event.key, performance.now())
      if (!result.handled) return
      event.preventDefault()
      event.stopPropagation()
      apply(result.actions)
    }

    const pollId = window.setInterval(() => {
      const result = chord.poll(performance.now())
      if (result.handled) apply(result.actions)
    }, 50)

    window.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('keyup', onKeyUp, true)
    return () => {
      window.clearInterval(pollId)
      window.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('keyup', onKeyUp, true)
    }
  }, [helpOpen])

  useEffect(() => {
    if (!helpOpen) return
    const onPointer = (event: MouseEvent) => {
      if (helpRef.current && !helpRef.current.contains(event.target as Node)) {
        setHelpOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointer)
    return () => document.removeEventListener('mousedown', onPointer)
  }, [helpOpen])

  const clearHistory = () => {
    clearHistoryStore()
    setHistory([])
  }

  const reuseResult = (entry: CalculatorHistoryEntry) => {
    onAction({ type: 'loadResult', value: entry.result })
  }

  const expression = formatCalculatorDisplay(displayExpression(state))
  const entryDisplay = formatCalculatorDisplay(state.entry)
  const sciKeys = scientificKeys(state.angleMode)

  return (
    <div
      className={cn(
        'mx-auto px-4 py-8 lg:py-12',
        scientificOpen ? 'max-w-5xl' : 'max-w-3xl',
      )}
    >
      <h1 className="text-2xl font-bold text-text-primary mb-6">Calculator</h1>
      <div
        className={cn(
          'grid gap-4 items-start',
          scientificOpen
            ? 'lg:grid-cols-[minmax(0,1fr)_minmax(0,16rem)]'
            : 'lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]',
        )}
      >
        <div className="rounded-2xl border border-border bg-white p-4 relative">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleScientific}
                aria-expanded={scientificOpen}
                aria-controls="scientific-pad"
                className={cn(
                  'inline-flex items-center gap-1.5 h-11 px-3 rounded-xl text-white bg-primary hover:bg-primary-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                  scientificOpen && 'bg-primary-dark',
                )}
                aria-label={
                  scientificOpen ? 'Hide scientific keypad' : 'Show scientific keypad'
                }
              >
                <FxIcon className="w-9 h-6" />
                <ChevronUp
                  className={cn(
                    'w-4 h-4 lg:hidden transition-transform',
                    scientificOpen && 'rotate-180',
                  )}
                  aria-hidden
                />
                <ChevronLeft
                  className={cn(
                    'w-4 h-4 hidden lg:block transition-transform',
                    scientificOpen && 'rotate-180',
                  )}
                  aria-hidden
                />
              </button>

              <div className="relative" ref={helpRef}>
                <button
                  type="button"
                  onClick={() => setHelpOpen((open) => !open)}
                  aria-expanded={helpOpen}
                  aria-controls="keyboard-shortcuts"
                  aria-label="Keyboard shortcuts"
                  className={cn(
                    'inline-flex items-center justify-center w-8 h-8 rounded-full border text-sm font-serif italic transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                    helpOpen
                      ? 'border-primary bg-surface-light text-primary'
                      : 'border-border text-text-muted hover:text-primary hover:border-primary',
                  )}
                >
                  i
                </button>
                {helpOpen && (
                  <div
                    id="keyboard-shortcuts"
                    role="dialog"
                    aria-label="Keyboard shortcuts"
                    className="absolute left-0 top-full z-20 mt-2 w-64 rounded-xl border border-border bg-white p-3 shadow-soft"
                  >
                    <p className="text-xs font-semibold text-text-primary mb-2">
                      Keyboard shortcuts
                    </p>
                    <ul className="space-y-1.5">
                      {keyBindings.help.map((row) => (
                        <li
                          key={row.keys}
                          className="flex items-baseline justify-between gap-3 text-xs"
                        >
                          <span className="font-medium text-text-secondary tabular-nums shrink-0">
                            {row.keys}
                          </span>
                          <span className="text-text-muted text-right">{row.meaning}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
            <span className="text-xs font-medium text-text-muted tabular-nums pt-3">
              {state.angleMode.toUpperCase()}
            </span>
          </div>

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
              {entryDisplay}
            </p>
          </div>

          <div
            className={cn(
              'flex flex-col gap-3',
              scientificOpen && 'lg:flex-row-reverse lg:items-start',
            )}
          >
            <div className="grid grid-cols-4 gap-2 flex-1" role="group" aria-label="Keypad">
              {keys.flat().map((key) => {
                const action: CalculatorAction =
                  key.kind === 'clear' ? { type: 'clear' } : key.action
                const label = key.kind === 'clear' ? clearLabel(state) : key.label
                const name =
                  key.kind === 'clear'
                    ? label === 'C'
                      ? 'Clear entry'
                      : 'All clear'
                    : key.name
                const wide =
                  key.kind === 'action' &&
                  key.action.type === 'digit' &&
                  key.action.digit === '0'

                return (
                  <KeyButton
                    key={key.kind === 'clear' ? 'clear' : name}
                    label={label}
                    name={name}
                    tone={key.tone}
                    wide={wide}
                    onClick={() => onAction(action)}
                  />
                )
              })}
            </div>

            <AnimatePresence initial={false}>
              {scientificOpen && (
                <motion.div
                  id="scientific-pad"
                  key="scientific-pad"
                  role="group"
                  aria-label="Scientific keypad"
                  className="grid grid-cols-4 gap-2 w-full lg:w-[17rem] lg:shrink-0 order-first lg:order-none overflow-hidden"
                  initial={
                    reduceMotion
                      ? { opacity: 0 }
                      : { opacity: 0, height: 0, y: -8 }
                  }
                  animate={
                    reduceMotion
                      ? { opacity: 1 }
                      : { opacity: 1, height: 'auto', y: 0 }
                  }
                  exit={
                    reduceMotion
                      ? { opacity: 0 }
                      : { opacity: 0, height: 0, y: -8 }
                  }
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                >
                  {sciKeys.map((key) => (
                    <KeyButton
                      key={key.name}
                      label={key.label}
                      name={key.name}
                      tone={key.action.type === 'toggleAngle' ? 'op' : 'fn'}
                      onClick={() => onAction(key.action)}
                      className="text-xs lg:text-sm"
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
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
                      {formatCalculatorDisplay(item.expression)}
                    </span>
                    <span className="block text-base font-medium text-text-primary tabular-nums mt-0.5">
                      {formatCalculatorDisplay(item.result)}
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
