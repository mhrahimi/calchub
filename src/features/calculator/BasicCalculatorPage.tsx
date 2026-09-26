import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { flushSync } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ChevronDown, ChevronLeft, ChevronUp, Copy, Pencil, Redo2, Undo2, X } from 'lucide-react'
import { cn } from '@/utils/cn'
import { isFormField } from '@/utils/keyboard'
import { getItem, setItem } from '@/persistence/storage'
import { type CalculatorAction } from './engine'
import { FxIcon } from './FxIcon'
import { initialSession, reduceSession, type SessionAction } from './session'
import { normalizePastedText } from './clipboard'
import { evaluateExpression, MAX_EXPRESSION_LENGTH } from './expression'
import { formatCalculatorDisplay } from './formatDisplay'
import { keyBindings } from './keyBindings'
import { createKeyChordController } from './keyChordController'
import { KeypadGrid, type KeypadCell } from './KeypadGrid'
import { clearHistoryStore, loadHistory, pushHistory, saveHistory, type CalculatorHistoryEntry } from './historyStore'

type Key =
  | { kind: 'action'; action: CalculatorAction; label: string; name: string; tone: 'fn' | 'op' | 'digit' }
  | { kind: 'clear'; tone: 'fn' }

const SCIENTIFIC_OPEN_KEY = 'basic-calculator-scientific-open'

const keys: Key[][] = [
  [
    { kind: 'clear', tone: 'fn' },
    { kind: 'action', action: { type: 'paren', which: '(' }, label: '(', name: 'Open parenthesis', tone: 'fn' },
    { kind: 'action', action: { type: 'paren', which: ')' }, label: ')', name: 'Close parenthesis', tone: 'fn' },
    { kind: 'action', action: { type: 'backspace' }, label: '⌫', name: 'Delete last character', tone: 'fn' },
  ],
  [
    { kind: 'action', action: { type: 'sign' }, label: '±', name: 'Change sign', tone: 'fn' },
    { kind: 'action', action: { type: 'percent' }, label: '%', name: 'Percent', tone: 'fn' },
    { kind: 'action', action: { type: 'operator', operator: '^' }, label: '^', name: 'Power', tone: 'op' },
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
    { kind: 'action', action: { type: 'digit', digit: '0' }, label: '0', name: '0', tone: 'digit' },
    { kind: 'action', action: { type: 'decimal' }, label: '.', name: 'Decimal point', tone: 'digit' },
    { kind: 'action', action: { type: 'equals' }, label: '=', name: 'Equals', tone: 'op' },
  ],
]

type SciKey = { kind: 'action'; action: CalculatorAction; label: string; name: string }
function scientificGroups(inverse: boolean): Array<{ title: string; keys: SciKey[] }> {
  return [
    { title: 'Trigonometry', keys: [
      { kind: 'action', action: { type: 'fn', name: inverse ? 'asin' : 'sin' }, label: inverse ? 'asin' : 'sin', name: inverse ? 'Inverse sine' : 'Sine' },
      { kind: 'action', action: { type: 'fn', name: inverse ? 'acos' : 'cos' }, label: inverse ? 'acos' : 'cos', name: inverse ? 'Inverse cosine' : 'Cosine' },
      { kind: 'action', action: { type: 'fn', name: inverse ? 'atan' : 'tan' }, label: inverse ? 'atan' : 'tan', name: inverse ? 'Inverse tangent' : 'Tangent' },
    ] },
    { title: 'Powers & roots', keys: [
      { kind: 'action', action: { type: 'postfix', name: '²' }, label: 'x²', name: 'Square' },
      { kind: 'action', action: { type: 'fn', name: 'sqrt' }, label: '√', name: 'Square root' },
      { kind: 'action', action: { type: 'postfix', name: 'reciprocal' }, label: '1/x', name: 'Reciprocal' },
      { kind: 'action', action: { type: 'fn', name: 'cbrt' }, label: '∛', name: 'Cube root' },
    ] },
    { title: 'Logarithms', keys: [
      { kind: 'action', action: { type: 'fn', name: 'ln' }, label: 'ln', name: 'Natural log' },
      { kind: 'action', action: { type: 'fn', name: 'exp' }, label: 'eˣ', name: 'e to the x' },
      { kind: 'action', action: { type: 'fn', name: 'log' }, label: 'log', name: 'Log base 10' },
      { kind: 'action', action: { type: 'fn', name: 'tenexp' }, label: '10ˣ', name: '10 to the x' },
      { kind: 'action', action: { type: 'fn', name: 'logx' }, label: 'logₓ', name: 'Log base x' },
      { kind: 'action', action: { type: 'comma' }, label: ',', name: 'Argument separator' },
    ] },
    { title: 'Constants & functions', keys: [
      { kind: 'action', action: { type: 'constant', name: 'π' }, label: 'π', name: 'Pi' },
      { kind: 'action', action: { type: 'constant', name: 'e' }, label: 'e', name: 'Euler number' },
      { kind: 'action', action: { type: 'postfix', name: '!' }, label: 'x!', name: 'Factorial' },
      { kind: 'action', action: { type: 'postfix', name: 'abs' }, label: '|x|', name: 'Absolute value' },
    ] },
  ]
}

const controlClass = 'inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs text-text-secondary hover:bg-surface-light disabled:opacity-35 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'

function KeyButton({ label, name, tone, onClick, className }: {
  label: string; name: string; tone: 'fn' | 'op' | 'digit'; onClick: () => void; className?: string
}) {
  return <button type="button" aria-label={name} onClick={onClick} onMouseDown={(event) => event.preventDefault()}
    className={cn('w-full h-12 lg:h-14 rounded-2xl text-sm lg:text-xl font-medium transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
      tone === 'op' && 'bg-primary text-white hover:bg-primary-dark',
      tone === 'fn' && 'bg-surface-light text-primary hover:bg-surface-lighter',
      tone === 'digit' && 'bg-background-secondary text-text-primary border border-border hover:border-primary', className)}>{label}</button>
}

export default function BasicCalculatorPage() {
  const [session, setSession] = useState(initialSession)
  const sessionRef = useRef(session)
  const editorRef = useRef<HTMLInputElement>(null)
  const [history, setHistory] = useState<CalculatorHistoryEntry[]>(loadHistory)
  const historyRef = useRef(history)
  historyRef.current = history
  const [scientificOpen, setScientificOpen] = useState(() => getItem<boolean>(SCIENTIFIC_OPEN_KEY, false))
  const [inverse, setInverse] = useState(false)
  const [hyperbolicOpen, setHyperbolicOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [copyMessage, setCopyMessage] = useState('')
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const helpRef = useRef<HTMLDivElement>(null)
  const helpButtonRef = useRef<HTMLButtonElement>(null)
  const reduceMotion = useReducedMotion()
  const chordRef = useRef(createKeyChordController())
  const preview = useMemo(() => evaluateExpression(session.source, session.angleMode), [session.source, session.angleMode])
  const invalid = !!session.inputError || preview.status === 'error' || (session.showErrors && preview.status === 'incomplete')
  const issue = session.inputError || ((preview.status === 'error' || preview.status === 'incomplete') ? preview.message : null)

  const dispatchSession = useCallback((action: SessionAction) => {
    const previous = sessionRef.current
    const next = reduceSession(previous, action)
    sessionRef.current = next
    setSession(next)
    if (action.type === 'key' && action.action.type === 'equals' && next.committed && !previous.committed && next.result !== null) {
      setHistory((current) => {
        const updated = pushHistory(current, { expression: next.source, result: next.result!, angleMode: next.angleMode })
        saveHistory(updated)
        return updated
      })
    }
  }, [])

  const applyActions = useCallback((actions: CalculatorAction[]) => {
    for (const action of actions) dispatchSession({ type: 'key', action })
  }, [dispatchSession])
  const flushPending = useCallback(() => applyActions(chordRef.current.flush().actions), [applyActions])
  const focusExpression = () => {
    editorRef.current?.focus({ preventScroll: true })
    editorRef.current?.setSelectionRange(sessionRef.current.start, sessionRef.current.end)
  }
  const onAction = (action: CalculatorAction) => {
    flushPending()
    dispatchSession({ type: 'key', action })
    // Pointer activation returns to typing; keyboard activation retains its focus.
    if (!(document.activeElement instanceof HTMLButtonElement)) focusExpression()
  }

  useEffect(() => {
    editorRef.current?.focus({ preventScroll: true })
    const timer = window.setInterval(() => applyActions(chordRef.current.poll(performance.now()).actions), 50)
    const onBlur = () => flushPending()
    window.addEventListener('blur', onBlur)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('blur', onBlur)
      chordRef.current.reset()
      if (copyTimer.current) clearTimeout(copyTimer.current)
    }
  }, [applyActions, flushPending])

  useLayoutEffect(() => {
    if (document.activeElement === editorRef.current) editorRef.current?.setSelectionRange(session.start, session.end)
  }, [session.source, session.start, session.end])

  useEffect(() => {
    if (!helpOpen) return
    const onPointer = (event: MouseEvent) => {
      if (helpRef.current && !helpRef.current.contains(event.target as Node)) setHelpOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    return () => document.removeEventListener('mousedown', onPointer)
  }, [helpOpen])

  const handleInputKey = (event: KeyboardEvent<HTMLElement>) => {
    if (event.nativeEvent.isComposing) return
    if (event.metaKey || event.ctrlKey || event.altKey) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'a') dispatchSession({ type: 'resume' })
      flushPending()
      return
    }
    if (event.key === 'Escape') { flushPending(); event.preventDefault(); return }
    if ((event.key === 'ArrowUp' || event.key === 'ArrowDown') && !event.shiftKey) {
      event.preventDefault()
      flushPending()
      dispatchSession({ type: 'recall', direction: event.key === 'ArrowUp' ? 'older' : 'newer', entries: historyRef.current })
      return
    }
    if (event.key === 'Enter' || event.key === '=') {
      event.preventDefault(); flushPending(); dispatchSession({ type: 'key', action: { type: 'equals' } }); return
    }
    if (['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Backspace', 'Delete'].includes(event.key)) {
      flushPending(); dispatchSession({ type: 'resume' }); return
    }
    if (event.key.length !== 1) { flushPending(); return }
    event.preventDefault()
    if (/^[0-9.+\-*/^(),%!]$/.test(event.key)) {
      applyActions(chordRef.current.onKeyDown(event.key, performance.now(), { repeat: event.repeat }).actions)
    } else {
      flushPending()
      dispatchSession({ type: 'insert', text: event.key })
    }
  }
  // Commit the new caret before the browser emits its selection event for this
  // key. Otherwise an old selection can overwrite the next insertion position.
  const inputKey = (event: KeyboardEvent<HTMLElement>) => flushSync(() => handleInputKey(event))

  const copyHistory = async (entry: CalculatorHistoryEntry) => {
    try {
      await navigator.clipboard.writeText(`${entry.expression} = ${entry.result}`)
      setCopyMessage('Calculation copied')
    } catch { setCopyMessage('Copy was blocked by the browser. Select the calculation text to copy it.') }
    if (copyTimer.current) clearTimeout(copyTimer.current)
    copyTimer.current = setTimeout(() => setCopyMessage(''), 4000)
  }

  const sciGroups = scientificGroups(inverse)
  const mainRows: KeypadCell[][] = keys.map((row) => row.map((key) => {
    const name = key.kind === 'clear' ? 'All clear' : key.name
    return { id: name, span: key.kind === 'action' && key.action.type === 'digit' && key.action.digit === '0' ? 2 : 1,
      content: <KeyButton label={key.kind === 'clear' ? 'AC' : key.label} name={name} tone={key.tone}
        onClick={() => onAction(key.kind === 'clear' ? { type: 'allClear' } : key.action)} /> }
  }))

  return (
    <div className={cn('mx-auto px-4 py-8 lg:py-12', scientificOpen ? 'max-w-5xl' : 'max-w-3xl')}
      onKeyDownCapture={(event) => {
        if (event.nativeEvent.isComposing) return
        if (helpOpen && event.key === 'Escape') {
          event.preventDefault(); event.stopPropagation(); setHelpOpen(false); helpButtonRef.current?.focus(); return
        }
        const field = isFormField(event.target) || (event.target instanceof HTMLElement && event.target.isContentEditable)
        if (field && event.target !== editorRef.current) return
        if ((event.metaKey || event.ctrlKey) && !event.altKey) {
          const key = event.key.toLowerCase()
          if (key === 'z' || (key === 'y' && event.ctrlKey && !event.shiftKey)) {
            event.preventDefault(); event.stopPropagation(); flushPending()
            flushSync(() => dispatchSession({ type: (key === 'y' || event.shiftKey) ? 'redo' : 'undo' }))
          }
          return
        }
        if (!helpOpen && event.target !== editorRef.current && !event.altKey && event.key.length === 1 && event.key !== ' ') {
          focusExpression(); inputKey(event)
        }
      }}
      onKeyUp={(event) => {
        if (!event.nativeEvent.isComposing && event.key === keyBindings.holdKey) {
          const result = chordRef.current.onKeyUp(event.key, performance.now())
          if (result.handled) { event.preventDefault(); flushSync(() => applyActions(result.actions)) }
        }
      }}
      onPaste={(event) => {
        if (isFormField(event.target) && event.target !== editorRef.current) return
        event.preventDefault(); flushPending()
        flushSync(() => dispatchSession({ type: 'insert', text: normalizePastedText(event.clipboardData.getData('text/plain')).replace(/[\r\n\t]/g, ' ') }))
        focusExpression()
      }}
      onCopy={(event) => {
        if (isFormField(event.target) || window.getSelection()?.toString()) return
        if (preview.status !== 'complete') return
        event.preventDefault(); event.clipboardData.setData('text/plain', preview.value)
      }}
    >
      <h1 className="text-2xl font-bold text-text-primary mb-6">Calculator</h1>
      <div className={cn('grid gap-4 items-start', scientificOpen ? 'lg:grid-cols-[minmax(0,1fr)_minmax(0,16rem)]' : 'lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]')}>
        <div className="rounded-2xl border border-border bg-white p-4 relative min-w-0">
          <div className="flex items-start justify-between gap-2 mb-3 flex-wrap">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setScientificOpen((open) => { setItem(SCIENTIFIC_OPEN_KEY, !open); return !open })}
                aria-expanded={scientificOpen} aria-controls="scientific-pad" aria-label={scientificOpen ? 'Hide scientific keypad' : 'Show scientific keypad'}
                className={cn('inline-flex items-center gap-1.5 h-11 px-3 rounded-xl text-white bg-primary hover:bg-primary-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2', scientificOpen && 'bg-primary-dark')}>
                <FxIcon className="w-9 h-6" />
                <ChevronUp className={cn('w-4 h-4 lg:hidden transition-transform', scientificOpen && 'rotate-180')} aria-hidden />
                <ChevronLeft className={cn('w-4 h-4 hidden lg:block transition-transform', scientificOpen && 'rotate-180')} aria-hidden />
              </button>
              <div className="relative" ref={helpRef}>
                <button ref={helpButtonRef} type="button" onClick={() => setHelpOpen((open) => !open)} aria-expanded={helpOpen} aria-controls="keyboard-shortcuts" aria-label="Keyboard shortcuts"
                  className={cn(controlClass, 'w-8 h-8 rounded-full border border-border font-serif italic')}>i</button>
                {helpOpen && <div id="keyboard-shortcuts" role="dialog" aria-label="Keyboard shortcuts" className="absolute left-0 top-full z-20 mt-2 w-64 rounded-xl border border-border bg-white p-3 shadow-soft">
                  <div className="flex items-center justify-between mb-2"><p className="text-xs font-semibold text-text-primary">Keyboard shortcuts</p>
                    <button type="button" autoFocus aria-label="Close keyboard shortcuts" className={controlClass} onClick={() => { setHelpOpen(false); helpButtonRef.current?.focus() }}><X className="w-3.5 h-3.5" aria-hidden /></button></div>
                  <ul className="space-y-1.5">{keyBindings.help.map((row) => <li key={row.keys} className="flex items-baseline justify-between gap-3 text-xs"><span className="font-medium text-text-secondary shrink-0">{row.keys}</span><span className="text-text-muted text-right">{row.meaning}</span></li>)}</ul>
                  <p className="text-xs text-text-muted mt-3">Use a decimal point. Commas separate function arguments, as in logx(2, 8). For percentages, 200 + 10% = 220.</p>
                </div>}
              </div>
            </div>
            {scientificOpen && <div role="group" aria-label="Angle unit" className="inline-flex rounded-xl bg-surface-light p-1">
              {(['deg', 'rad'] as const).map((mode) => <button type="button" key={mode} aria-label={mode === 'deg' ? 'Degrees' : 'Radians'} aria-pressed={session.angleMode === mode} onClick={() => onAction({ type: 'setAngle', mode })}
                className={cn(controlClass, 'h-9 px-3 font-semibold', session.angleMode === mode ? 'bg-primary text-white hover:bg-primary-dark' : 'text-primary')}>{mode.toUpperCase()}</button>)}
            </div>}
          </div>
          <div className="mb-4 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <label htmlFor="calculator-expression" className="text-xs font-medium text-text-secondary">Expression</label>
              <div className="flex items-center gap-1">
                <button type="button" disabled={!session.past.length} onMouseDown={(event) => event.preventDefault()} onClick={() => { flushPending(); dispatchSession({ type: 'undo' }) }} className={controlClass} title="Undo (⌘/Ctrl+Z)"><Undo2 className="h-3.5 w-3.5" aria-hidden />Undo</button>
                <button type="button" disabled={!session.future.length} onMouseDown={(event) => event.preventDefault()} onClick={() => { flushPending(); dispatchSession({ type: 'redo' }) }} className={controlClass} title="Redo (⌘/Ctrl+Shift+Z)"><Redo2 className="h-3.5 w-3.5" aria-hidden />Redo</button>
              </div>
            </div>
            <input ref={editorRef} id="calculator-expression" type="text" aria-label="Expression" aria-invalid={invalid} aria-describedby="expression-help" value={session.source}
              maxLength={MAX_EXPRESSION_LENGTH} autoComplete="off" autoCapitalize="off" spellCheck={false} placeholder="Type a calculation…"
              onChange={(event) => dispatchSession({ type: 'edit', source: event.target.value, start: event.target.selectionStart ?? 0, end: event.target.selectionEnd ?? 0 })}
              onSelect={(event) => {
                if (event.currentTarget.value === sessionRef.current.source) dispatchSession({ type: 'select', start: event.currentTarget.selectionStart ?? 0, end: event.currentTarget.selectionEnd ?? 0 })
              }}
              onPointerDown={() => { flushPending(); dispatchSession({ type: 'resume' }) }}
              onBlur={flushPending} onKeyDown={inputKey}
              className={cn('w-full min-w-0 h-12 rounded-lg border bg-background-secondary px-3 text-base tabular-nums text-text-primary outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1', invalid ? 'border-red-500' : 'border-border')}
            />
            <p id="expression-help" className={cn('text-xs mt-2 min-h-8 leading-relaxed', invalid ? 'text-red-700' : 'text-text-muted')}>
              {issue || (session.committed ? 'Saved. Type a number to start again, or an operator to continue.' : session.recall ? 'Recalled from history. ↓ returns toward your draft.' : 'Enter to save · ↑ ↓ to recall history')}
            </p>
            <div className="text-right mt-2"><span className="text-xs text-text-muted">{session.committed ? 'Result' : 'Preview'}</span>
              <output htmlFor="calculator-expression" aria-label={session.committed ? 'Result' : 'Preview'} aria-live="off" tabIndex={0}
                className="block text-4xl leading-tight font-medium tabular-nums overflow-x-auto whitespace-nowrap py-1 px-2 rounded-lg text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <span className="block w-max min-w-full">{preview.status === 'complete' ? formatCalculatorDisplay(preview.value) : preview.status === 'empty' ? '0' : '—'}</span>
              </output>
            </div>
            <p role="status" aria-live="polite" className="sr-only">{session.committed ? `Result ${session.result}. Saved to history.` : session.showErrors && issue ? issue : ''}</p>
          </div>
          <div className={cn('flex flex-col gap-3', scientificOpen && 'lg:flex-row lg:items-start')}>
            <AnimatePresence initial={false}>{scientificOpen && <motion.div id="scientific-pad" key="scientific-pad" role="group" aria-label="Scientific keypad"
              className="space-y-3 w-full lg:w-[17rem] lg:shrink-0 overflow-hidden"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0, y: -8 }} animate={reduceMotion ? { opacity: 1 } : { opacity: 1, height: 'auto', y: 0 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0, y: -8 }} transition={{ duration: 0.2, ease: 'easeOut' }}>
              {sciGroups.map((group) => {
                const cells: KeypadCell[] = group.keys.map((key, index) => ({ id: key.name, span: group.title === 'Logarithms' && index > 3 ? 2 : 1,
                  content: <KeyButton label={key.label} name={key.name} tone="fn" onClick={() => onAction(key.action)} className="text-xs lg:text-sm" /> }))
                if (group.title === 'Trigonometry') cells.push({ id: 'inverse', content: <button type="button" aria-label="Inverse trigonometric functions" aria-pressed={inverse} onClick={() => setInverse((active) => !active)} className={cn(controlClass, 'h-12 lg:h-14 rounded-2xl text-sm font-medium', inverse ? 'bg-primary text-white hover:bg-primary-dark' : 'bg-surface-light text-primary')}>Inv</button> })
                return <div key={group.title}>
                  <div className="flex items-center justify-between gap-2 mb-1.5 min-h-5"><span className="text-xs font-medium text-text-muted">{group.title}</span>
                    {group.title === 'Trigonometry' && <button type="button" aria-expanded={hyperbolicOpen} aria-controls="hyperbolic-functions" onClick={() => setHyperbolicOpen((open) => !open)} className={cn(controlClass, 'text-primary px-1 py-1')}>Hyperbolic<ChevronDown className={cn('w-3 h-3', hyperbolicOpen && 'rotate-180')} aria-hidden /></button>}
                  </div>
                  <KeypadGrid label={group.title} rows={cells.length > 4 ? [cells.slice(0, 4), cells.slice(4)] : [cells]} />
                  {group.title === 'Trigonometry' && hyperbolicOpen && <div id="hyperbolic-functions" className="mt-2"><KeypadGrid label="Hyperbolic functions" columns={3} rows={[
                    (['sinh', 'cosh', 'tanh'] as const).map((name) => ({ id: name, content: <KeyButton label={name} name={`Hyperbolic ${name === 'sinh' ? 'sine' : name === 'cosh' ? 'cosine' : 'tangent'}`} tone="fn" onClick={() => onAction({ type: 'fn', name })} className="text-xs lg:text-sm" /> }))
                  ]} /></div>}
                </div>
              })}
            </motion.div>}</AnimatePresence>
            <KeypadGrid rows={mainRows} label="Keypad" className="flex-1 min-w-0" />
          </div>
        </div>
        <section className="rounded-2xl border border-border bg-white p-4 flex flex-col min-h-[16rem] lg:min-h-[28rem] min-w-0" aria-label="Calculation history">
          <div className="flex items-center justify-between gap-3 mb-1"><h2 className="text-sm font-semibold text-text-primary">History</h2>
            {!!history.length && <button type="button" onClick={() => { clearHistoryStore(); setHistory([]); dispatchSession({ type: 'forgetHistory' }); focusExpression() }} className={controlClass}>Clear history</button>}
          </div>
          <p className="text-xs text-text-muted mb-3">Calculations are saved when you press Enter or =.</p>
          {!history.length ? <p className="text-sm text-text-muted py-8 text-center">No calculations yet</p>
            : <ul className="flex-1 overflow-y-auto max-h-[28rem] lg:max-h-[36rem] divide-y divide-border -mx-1">{history.map((item) => <li key={item.id} className="px-2 py-3">
              <p className="text-xs text-text-muted tabular-nums break-all leading-snug text-right">{item.expression}</p>
              <p className="text-base font-medium text-text-primary tabular-nums mt-1 text-right break-all">{formatCalculatorDisplay(item.result)}</p>
              <div className="flex justify-end gap-1 mt-2 flex-wrap">
                <button type="button" className={controlClass} aria-label={`Edit expression ${item.expression}`} onClick={() => { flushPending(); dispatchSession({ type: 'loadExpression', entry: item }); focusExpression() }}><Pencil className="w-3 h-3" aria-hidden />Edit</button>
                <button type="button" className={controlClass} aria-label={`Use result ${item.result} from ${item.expression}`} onClick={() => { flushPending(); dispatchSession({ type: 'insert', text: Number(item.result) < 0 ? `(${item.result})` : item.result }); focusExpression() }}>Use result</button>
                <button type="button" className={controlClass} aria-label={`Copy calculation ${item.expression}`} onClick={() => void copyHistory(item)}><Copy className="w-3 h-3" aria-hidden />Copy</button>
              </div>
            </li>)}</ul>}
          <p role="status" className="text-xs text-text-muted min-h-4 mt-2">{copyMessage}</p>
        </section>
      </div>
    </div>
  )
}
