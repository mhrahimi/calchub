import { type AngleMode, type CalculatorAction } from './engine'
import { evaluateExpression, MAX_EXPRESSION_LENGTH } from './expression'
import type { CalculatorHistoryEntry } from './historyStore'
import { readExpressionInput, stripInputGrouping } from './inputFormatting'

export type Snapshot = {
  source: string
  start: number
  end: number
  angleMode: AngleMode
  committed: boolean
  result: string | null
  showErrors: boolean
  inputError: string | null
}
export type CalculatorSession = Snapshot & {
  past: Snapshot[]
  future: Snapshot[]
  recall: { index: number; draft: Snapshot } | null
}
export type SessionAction =
  | { type: 'key'; action: CalculatorAction }
  | { type: 'insert'; text: string }
  | { type: 'edit'; source: string; start: number; end: number }
  | { type: 'select'; start: number; end: number }
  | { type: 'resume' }
  | { type: 'deleteForward' }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'forgetHistory' }
  | { type: 'loadExpression'; entry: CalculatorHistoryEntry }
  | { type: 'recall'; direction: 'older' | 'newer'; entries: CalculatorHistoryEntry[] }

export const initialSession: CalculatorSession = {
  source: '', start: 0, end: 0, angleMode: 'deg', committed: false,
  result: null, showErrors: false, inputError: null,
  past: [], future: [], recall: null,
}

function snapshot(state: CalculatorSession): Snapshot {
  const { source, start, end, angleMode, committed, result, showErrors, inputError } = state
  return { source, start, end, angleMode, committed, result, showErrors, inputError }
}

function remember(state: CalculatorSession, next: Snapshot): CalculatorSession {
  if (JSON.stringify(next) === JSON.stringify(snapshot(state))) return state
  return { ...next, past: [...state.past.slice(-199), snapshot(state)], future: [], recall: null }
}

function replace(state: CalculatorSession, text: string, start = state.start, end = state.end): CalculatorSession {
  const source = state.source.slice(0, start) + text + state.source.slice(end)
  if (source.length > MAX_EXPRESSION_LENGTH) return { ...state, inputError: 'Keep the expression under 2,000 characters.' }
  return remember(state, { ...snapshot(state), source, start: start + text.length, end: start + text.length, committed: false, showErrors: false, inputError: null })
}

function insert(state: CalculatorSession, text: string): CalculatorSession {
  text = stripInputGrouping(text)
  if (!state.committed && text === ')' && state.start === state.end && state.source[state.start] === ')') {
    return { ...state, start: state.start + 1, end: state.end + 1 }
  }
  if (state.committed) {
    const continuing = /^[+\-−*×/÷^%!²]/.test(text)
    const base = continuing ? state.result ?? '' : ''
    const source = base + text
    if (source.length > MAX_EXPRESSION_LENGTH) return { ...state, inputError: 'Keep the expression under 2,000 characters.' }
    return remember(state, { ...snapshot(state), source, start: source.length, end: source.length, committed: false, showErrors: false, inputError: null })
  }
  return replace(state, text)
}

/** Operand immediately before the caret, including its function or parentheses. */
function operandRange(state: CalculatorSession): { start: number; end: number } {
  let { start, end } = state
  if (start !== end) return { start, end }
  const left = state.source.slice(0, start).trimEnd()
  end = left.length
  const atom = left.match(/(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?[%!²]*$|(?:pi|π|e)[%!²]*$/i)
  if (atom) start = end - atom[0].length
  else if (/[)%!²]$/.test(left)) {
    let i = end - 1
    while (/[%!²]/.test(left[i] ?? '') && i >= 0) i--
    let depth = 0
    for (; i >= 0; i--) {
      if (left[i] === ')') depth++
      if (left[i] === '(') depth--
      if (depth === 0) {
        start = i
        const fn = left.slice(0, i).match(/(?:[a-z]+|logₓ|√|∛)$/i)
        if (fn) start -= fn[0].length
        break
      }
    }
  }
  return { start, end }
}

function fromHistory(state: CalculatorSession, entry: CalculatorHistoryEntry): Snapshot {
  const source = stripInputGrouping(entry.expression)
  return { ...snapshot(state), source, start: source.length, end: source.length,
    angleMode: entry.angleMode ?? state.angleMode, committed: false, showErrors: false, inputError: null }
}

export function reduceSession(state: CalculatorSession, action: SessionAction): CalculatorSession {
  if (action.type === 'undo') {
    const previous = state.past.at(-1)
    return previous ? { ...previous, past: state.past.slice(0, -1), future: [snapshot(state), ...state.future].slice(0, 200), recall: null } : state
  }
  if (action.type === 'redo') {
    const next = state.future[0]
    return next ? { ...next, past: [...state.past, snapshot(state)].slice(-200), future: state.future.slice(1), recall: null } : state
  }
  if (action.type === 'resume') return { ...state, committed: false }
  if (action.type === 'deleteForward') return replace(state, '', state.start, state.start === state.end ? Math.min(state.source.length, state.end + 1) : state.end)
  if (action.type === 'forgetHistory') return state.recall ? { ...state, ...state.recall.draft, recall: null } : state
  if (action.type === 'select') return { ...state, start: action.start, end: action.end }
  if (action.type === 'insert') return insert(state, action.text)
  if (action.type === 'edit') {
    const edit = readExpressionInput(action.source, action.start, action.end)
    if (edit.source.length > MAX_EXPRESSION_LENGTH) return { ...state, inputError: 'Keep the expression under 2,000 characters.' }
    return remember(state, { ...snapshot(state), ...edit, committed: false, showErrors: false, inputError: null })
  }
  if (action.type === 'loadExpression') return remember(state, fromHistory(state, action.entry))
  if (action.type === 'recall') {
    if (!action.entries.length) return state
    const current = state.recall?.index ?? -1
    const index = action.direction === 'older' ? Math.min(current + 1, action.entries.length - 1) : Math.max(current - 1, -1)
    if (index === current) return state
    const draft = state.recall?.draft ?? snapshot(state)
    if (index === -1) return { ...state, ...draft, recall: null }
    return { ...state, ...fromHistory(state, action.entries[index]), recall: { index, draft } }
  }
  const key = action.action
  if (key.type === 'equals') {
    if (state.committed) return state
    const preview = evaluateExpression(state.source, state.angleMode)
    if (preview.status === 'empty') return state
    if (preview.status !== 'complete') return { ...state, showErrors: true, start: preview.start, end: preview.end }
    return remember(state, { ...snapshot(state), committed: true, result: preview.value, start: 0, end: state.source.length, showErrors: false, inputError: null })
  }
  if (key.type === 'clear' || key.type === 'allClear') {
    return remember(state, { ...snapshot(initialSession), angleMode: state.angleMode })
  }
  if (key.type === 'setAngle' || key.type === 'toggleAngle') {
    const angleMode = key.type === 'setAngle' ? key.mode : state.angleMode === 'deg' ? 'rad' : 'deg'
    if (angleMode === state.angleMode) return state
    return remember(state, { ...snapshot(state), angleMode, committed: false, showErrors: false })
  }
  if (key.type === 'loadResult') return insert(state, key.value)
  if (key.type === 'digit') return insert(state, key.digit)
  if (key.type === 'decimal') return insert(state, '.')
  if (key.type === 'operator') return insert(state, key.operator === '×' ? '*' : key.operator === '÷' ? '/' : key.operator)
  if (key.type === 'paren') return insert(state, key.which)
  if (key.type === 'comma') return insert(state, ',')
  if (key.type === 'constant') return insert(state, key.name === 'π' ? 'pi' : 'e')
  if (key.type === 'backspace') return replace(state, '', state.start === state.end ? Math.max(0, state.start - 1) : state.start)
  if (key.type === 'fn') {
    if (state.committed) {
      const source = `${key.name}(${state.result})`
      return remember(state, { ...snapshot(state), source, start: source.length, end: source.length, committed: false, showErrors: false })
    }
    const selected = state.source.slice(state.start, state.end)
    if (selected) return replace(state, `${key.name}(${selected})`)
    const next = replace(state, `${key.name}()`)
    return next === state ? next : { ...next, start: next.start - 1, end: next.end - 1 }
  }
  if (key.type === 'percent') {
    if (state.start !== state.end && !state.committed) return replace(state, `(${state.source.slice(state.start, state.end)})%`)
    return insert(state, '%')
  }
  if (key.type === 'postfix' || key.type === 'sign') {
    const working = state.committed ? { ...state, source: state.result ?? '', start: (state.result ?? '').length, end: (state.result ?? '').length, committed: false } : state
    const { start, end } = operandRange(working)
    const operand = working.source.slice(start, end)
    if (!operand) return key.type === 'sign' ? insert(state, '-') : state
    const replacement = key.type === 'sign' ? `-(${operand})`
      : key.name === '²' ? `(${operand})^2`
      : key.name === 'reciprocal' ? `(1/(${operand}))`
      : key.name === 'abs' ? `abs(${operand})` : `(${operand})!`
    const source = working.source.slice(0, start) + replacement + working.source.slice(end)
    return remember(state, { ...snapshot(state), source, start: start + replacement.length, end: start + replacement.length, committed: false, showErrors: false, inputError: null })
  }
  return state
}
