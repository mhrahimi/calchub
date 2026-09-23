import Decimal from 'decimal.js'

export type Operator = '+' | '-' | '×' | '÷' | '^'

export type CalculatorState = {
  /** Completed prefix of the formula (committed numbers, operators, parens). */
  expression: string
  /** Current number being typed, or the finished result after equals. */
  entry: string
  /** Next digit replaces the entry instead of appending. */
  overwrite: boolean
  error: boolean
  openParens: number
  /** True after equals so the top line can keep the finished formula. */
  justEvaluated: boolean
  repeatOperand: string | null
  repeatOperator: Operator | null
}

export type CalculatorAction =
  | { type: 'digit'; digit: string }
  | { type: 'decimal' }
  | { type: 'operator'; operator: Operator }
  | { type: 'paren'; which: '(' | ')' }
  | { type: 'equals' }
  | { type: 'percent' }
  | { type: 'sign' }
  | { type: 'backspace' }
  | { type: 'clear' }
  | { type: 'allClear' }

type Token =
  | { kind: 'number'; value: string }
  | { kind: 'op'; value: Operator }
  | { kind: 'paren'; value: '(' | ')' }

const MAX_DIGITS = 12

const PRECEDENCE: Record<Operator, number> = {
  '+': 1,
  '-': 1,
  '×': 2,
  '÷': 2,
  '^': 3,
}

export const initialCalculatorState: CalculatorState = {
  expression: '',
  entry: '0',
  overwrite: true,
  error: false,
  openParens: 0,
  justEvaluated: false,
  repeatOperand: null,
  repeatOperator: null,
}

const errorState: CalculatorState = {
  ...initialCalculatorState,
  entry: 'Error',
  error: true,
  overwrite: true,
}

export function clearLabel(state: CalculatorState): 'C' | 'AC' {
  return !state.error && !state.overwrite && !state.justEvaluated ? 'C' : 'AC'
}

/** Combined top-line formula including the live entry when typing. */
export function displayExpression(state: CalculatorState): string {
  if (state.error) return ''
  if (state.justEvaluated) return state.expression
  if (!state.expression) return state.overwrite ? '' : state.entry
  if (state.overwrite) return state.expression.trimEnd()
  return `${state.expression}${state.entry}`
}

export function actionFromKey(key: string): CalculatorAction | null {
  if (/^[0-9]$/.test(key)) return { type: 'digit', digit: key }
  if (key === '.') return { type: 'decimal' }
  if (key === '+') return { type: 'operator', operator: '+' }
  if (key === '-') return { type: 'operator', operator: '-' }
  if (key === '*') return { type: 'operator', operator: '×' }
  if (key === '/') return { type: 'operator', operator: '÷' }
  if (key === '^') return { type: 'operator', operator: '^' }
  if (key === '(' || key === ')') return { type: 'paren', which: key }
  if (key === 'Enter' || key === '=') return { type: 'equals' }
  if (key === 'Backspace') return { type: 'backspace' }
  if (key === 'Escape') return { type: 'allClear' }
  if (key === '%') return { type: 'percent' }
  return null
}

function digitCount(display: string): number {
  return display.replace(/[^0-9]/g, '').length
}

function formatResult(value: Decimal): string {
  if (!value.isFinite()) return 'Error'
  const rounded = value.toSignificantDigits(MAX_DIGITS)
  const plain = rounded.toFixed()
  if (digitCount(plain) > MAX_DIGITS + 2) {
    return rounded.toExponential(6).replace(/\.?0+e/, 'e').replace(/\.e/, 'e')
  }
  return plain
}

function formatOp(op: Operator): string {
  return op === '-' ? '−' : op
}

function appendOp(expression: string, op: Operator): string {
  const base = expression.trimEnd()
  return `${base} ${formatOp(op)} `
}

function trimTrailingOp(expression: string): string {
  return expression.replace(/\s*[+\-−×÷^]\s*$/u, '')
}

function endsWithOperator(expression: string): boolean {
  return /[+\-−×÷^]\s*$/u.test(expression)
}

function endsWithOpenParen(expression: string): boolean {
  return /\(\s*$/.test(expression)
}

function endsWithCloseParen(expression: string): boolean {
  return /\)\s*$/.test(expression)
}

function lastBinaryOperator(expression: string): Operator | null {
  const match = expression.match(/([+\-−×÷^])\s*$/u)
  if (!match) return null
  return match[1] === '−' ? '-' : (match[1] as Operator)
}

function tokenize(source: string): Token[] | null {
  const tokens: Token[] = []
  let i = 0
  const s = source.replace(/−/g, '-').replace(/\s+/g, '')

  while (i < s.length) {
    const ch = s[i]
    if (ch === '(' || ch === ')') {
      tokens.push({ kind: 'paren', value: ch })
      i += 1
      continue
    }

    if (ch === '+' || ch === '-' || ch === '×' || ch === '÷' || ch === '^' || ch === '*') {
      const op: Operator = ch === '*' ? '×' : ch === '-' ? '-' : (ch as Operator)
      const prev = tokens[tokens.length - 1]
      const unary =
        op === '-' &&
        (tokens.length === 0 ||
          prev?.kind === 'op' ||
          (prev?.kind === 'paren' && prev.value === '('))

      if (unary) {
        let j = i + 1
        if (j >= s.length || !/[0-9.]/.test(s[j])) return null
        let num = '-'
        while (j < s.length && /[0-9.]/.test(s[j])) {
          num += s[j]
          j += 1
        }
        if (num === '-' || num === '-.' || !Number.isFinite(Number(num))) return null
        tokens.push({ kind: 'number', value: num })
        i = j
        continue
      }

      tokens.push({ kind: 'op', value: op })
      i += 1
      continue
    }

    if (/[0-9.]/.test(ch)) {
      let num = ''
      while (i < s.length && /[0-9.]/.test(s[i])) {
        num += s[i]
        i += 1
      }
      if (num === '.' || !Number.isFinite(Number(num))) return null
      tokens.push({ kind: 'number', value: num })
      continue
    }

    return null
  }

  return tokens
}

function applyOp(left: Decimal, op: Operator, right: Decimal): Decimal | null {
  switch (op) {
    case '+':
      return left.plus(right)
    case '-':
      return left.minus(right)
    case '×':
      return left.times(right)
    case '÷':
      if (right.isZero()) return null
      return left.div(right)
    case '^':
      try {
        const result = left.pow(right)
        return result.isFinite() ? result : null
      } catch {
        return null
      }
  }
}

function evaluateTokens(tokens: Token[]): string | null {
  const output: Token[] = []
  const ops: Array<Operator | '('> = []

  for (const token of tokens) {
    if (token.kind === 'number') {
      output.push(token)
      continue
    }
    if (token.kind === 'op') {
      while (ops.length > 0) {
        const top = ops[ops.length - 1]
        if (top === '(') break
        const topOp = top as Operator
        const shouldPop =
          PRECEDENCE[topOp] > PRECEDENCE[token.value] ||
          (PRECEDENCE[topOp] === PRECEDENCE[token.value] && token.value !== '^')
        if (!shouldPop) break
        ops.pop()
        output.push({ kind: 'op', value: topOp })
      }
      ops.push(token.value)
      continue
    }
    if (token.value === '(') {
      ops.push('(')
      continue
    }
    while (ops.length > 0 && ops[ops.length - 1] !== '(') {
      output.push({ kind: 'op', value: ops.pop() as Operator })
    }
    if (ops.length === 0 || ops[ops.length - 1] !== '(') return null
    ops.pop()
  }

  while (ops.length > 0) {
    const top = ops.pop()!
    if (top === '(') return null
    output.push({ kind: 'op', value: top })
  }

  const stack: Decimal[] = []
  for (const token of output) {
    if (token.kind === 'number') {
      stack.push(new Decimal(token.value))
      continue
    }
    if (token.kind !== 'op' || stack.length < 2) return null
    const right = stack.pop()!
    const left = stack.pop()!
    const result = applyOp(left, token.value, right)
    if (result == null) return null
    stack.push(result)
  }

  if (stack.length !== 1) return null
  return formatResult(stack[0])
}

/** Assemble the formula string for evaluation. */
function formulaSource(state: CalculatorState, autoClose = false): string {
  let source: string
  if (!state.expression) {
    source = state.entry
  } else if (!state.overwrite) {
    source = `${state.expression}${state.entry}`
  } else if (endsWithOperator(state.expression) || endsWithOpenParen(state.expression)) {
    // Operator / open paren ready for operand — include entry (e.g. 5+= → 5+5)
    source = `${state.expression}${state.entry}`
  } else {
    source = state.expression.trimEnd()
  }

  if (autoClose) {
    let open = state.openParens
    // Recount from source if entry closed nothing
    const opens = (source.match(/\(/g) ?? []).length
    const closes = (source.match(/\)/g) ?? []).length
    open = Math.max(open, opens - closes)
    while (open > 0) {
      source += ')'
      open -= 1
    }
  }
  return source
}

function evaluateState(state: CalculatorState): { result: string; formula: string } | null {
  const formula = formulaSource(state, true)
  const tokens = tokenize(formula)
  if (!tokens || tokens.length === 0) return null
  const result = evaluateTokens(tokens)
  if (result == null || result === 'Error') return null
  return { result, formula }
}

function appendDigit(display: string, digit: string): string | null {
  if (digitCount(display) >= MAX_DIGITS) return null
  if (display === '0') return digit
  if (display === '-0') return `-${digit}`
  return display + digit
}

function toggleSign(display: string): string {
  if (display === '0') return '-0'
  if (display === '-0') return '0'
  if (display.startsWith('-')) return display.slice(1)
  return `-${display}`
}

function deleteDigit(display: string): string {
  if (display.length <= 1 || (display.startsWith('-') && display.length <= 2)) return '0'
  const next = display.slice(0, -1)
  if (next === '-' || next === '') return '0'
  return next
}

function commitEntryIntoExpression(state: CalculatorState): string {
  if (!state.overwrite) return `${state.expression}${state.entry} `
  if (endsWithOperator(state.expression) || endsWithOpenParen(state.expression)) {
    return `${state.expression}${state.entry} `
  }
  if (!state.expression) return `${state.entry} `
  return state.expression.endsWith(' ') ? state.expression : `${state.expression.trimEnd()} `
}

export function reduceCalculator(state: CalculatorState, action: CalculatorAction): CalculatorState {
  switch (action.type) {
    case 'allClear':
      return initialCalculatorState

    case 'clear':
      if (state.error || state.overwrite || state.justEvaluated) return initialCalculatorState
      return { ...state, entry: '0', overwrite: true }

    case 'digit': {
      if (!/^[0-9]$/.test(action.digit)) return state
      if (state.error) return reduceCalculator(initialCalculatorState, action)
      if (state.justEvaluated) {
        return { ...initialCalculatorState, entry: action.digit, overwrite: false }
      }
      if (state.overwrite && endsWithCloseParen(state.expression)) {
        return {
          ...state,
          expression: appendOp(state.expression, '×'),
          entry: action.digit,
          overwrite: false,
          repeatOperand: null,
          repeatOperator: null,
        }
      }
      if (state.overwrite) {
        return {
          ...state,
          entry: action.digit,
          overwrite: false,
          repeatOperand: null,
          repeatOperator: null,
        }
      }
      const next = appendDigit(state.entry, action.digit)
      if (next == null) return state
      return { ...state, entry: next }
    }

    case 'decimal': {
      if (state.error) return reduceCalculator(initialCalculatorState, action)
      if (state.justEvaluated) {
        return { ...initialCalculatorState, entry: '0.', overwrite: false }
      }
      if (state.overwrite && endsWithCloseParen(state.expression)) {
        return {
          ...state,
          expression: appendOp(state.expression, '×'),
          entry: '0.',
          overwrite: false,
          repeatOperand: null,
          repeatOperator: null,
        }
      }
      if (state.overwrite) {
        return {
          ...state,
          entry: '0.',
          overwrite: false,
          repeatOperand: null,
          repeatOperator: null,
        }
      }
      if (state.entry.includes('.')) return state
      return { ...state, entry: `${state.entry}.` }
    }

    case 'operator': {
      if (state.error) return state
      if (state.justEvaluated) {
        return {
          ...initialCalculatorState,
          expression: appendOp(`${state.entry} `, action.operator),
          entry: state.entry,
          overwrite: true,
        }
      }
      if (state.overwrite && endsWithOperator(state.expression) && !endsWithOpenParen(state.expression)) {
        return {
          ...state,
          expression: appendOp(trimTrailingOp(state.expression), action.operator),
          repeatOperand: null,
          repeatOperator: null,
        }
      }
      const expression = appendOp(commitEntryIntoExpression(state), action.operator)
      return {
        ...state,
        expression,
        overwrite: true,
        justEvaluated: false,
        repeatOperand: null,
        repeatOperator: null,
      }
    }

    case 'paren': {
      if (state.error) return state

      if (action.which === '(') {
        if (state.justEvaluated) {
          return {
            ...initialCalculatorState,
            expression: '(',
            entry: '0',
            overwrite: true,
            openParens: 1,
          }
        }

        let expression = state.expression
        const needsImplicitMultiply =
          !state.overwrite ||
          endsWithCloseParen(expression) ||
          (state.overwrite && /\d\s*$/.test(expression.trimEnd()))

        if (needsImplicitMultiply && (expression || !state.overwrite)) {
          expression = appendOp(commitEntryIntoExpression(state), '×')
        }

        return {
          ...state,
          expression: `${expression}(`,
          entry: '0',
          overwrite: true,
          openParens: state.openParens + 1,
          justEvaluated: false,
          repeatOperand: null,
          repeatOperator: null,
        }
      }

      if (state.openParens <= 0) return state
      const expression = `${commitEntryIntoExpression(state).trimEnd()}) `
      return {
        ...state,
        expression,
        overwrite: true,
        openParens: state.openParens - 1,
        justEvaluated: false,
        repeatOperand: null,
        repeatOperator: null,
      }
    }

    case 'equals': {
      if (state.error) return state

      if (state.justEvaluated && state.repeatOperator && state.repeatOperand != null) {
        const formula = `${state.entry} ${formatOp(state.repeatOperator)} ${state.repeatOperand}`
        const tokens = tokenize(formula)
        const result = tokens ? evaluateTokens(tokens) : null
        if (result == null || result === 'Error') return errorState
        return {
          expression: formula,
          entry: result,
          overwrite: true,
          error: false,
          openParens: 0,
          justEvaluated: true,
          repeatOperand: state.repeatOperand,
          repeatOperator: state.repeatOperator,
        }
      }

      const evaluated = evaluateState(state)
      if (!evaluated) return errorState

      const trailingOp = lastBinaryOperator(state.expression)
      const repeatOperator = trailingOp
      const repeatOperand =
        trailingOp && state.openParens === 0
          ? !state.overwrite || endsWithOperator(state.expression) || endsWithOpenParen(state.expression)
            ? state.entry
            : state.entry
          : null

      return {
        expression: evaluated.formula,
        entry: evaluated.result,
        overwrite: true,
        error: false,
        openParens: 0,
        justEvaluated: true,
        repeatOperand,
        repeatOperator: repeatOperand ? repeatOperator : null,
      }
    }

    case 'percent': {
      if (state.error) return state
      try {
        const current = new Decimal(state.entry)
        const pendingOp = lastBinaryOperator(state.expression)
        let base: Decimal | null = null
        if (pendingOp === '+' || pendingOp === '-') {
          const leftSource = trimTrailingOp(state.expression).trimEnd()
          const match = leftSource.match(/(-?\d+(?:\.\d+)?)\s*$/)
          if (match) base = new Decimal(match[1])
          else if (leftSource) {
            const tokens = tokenize(leftSource)
            const val = tokens ? evaluateTokens(tokens) : null
            if (val && val !== 'Error') base = new Decimal(val)
          }
        }
        const value =
          base != null ? base.times(current).div(100) : current.div(100)
        const entry = formatResult(value)
        if (entry === 'Error') return errorState
        return { ...state, entry, overwrite: true, justEvaluated: false }
      } catch {
        return errorState
      }
    }

    case 'sign': {
      if (state.error) return state
      if (state.justEvaluated) {
        return {
          ...initialCalculatorState,
          entry: toggleSign(state.entry),
          overwrite: false,
        }
      }
      const enteringNegativeZero =
        state.overwrite && (state.entry === '0' || state.entry === '-0')
      return {
        ...state,
        entry: toggleSign(state.entry),
        overwrite: enteringNegativeZero ? false : state.overwrite,
      }
    }

    case 'backspace': {
      if (state.error || state.justEvaluated) return initialCalculatorState
      if (!state.overwrite) {
        return { ...state, entry: deleteDigit(state.entry) }
      }
      if (endsWithOperator(state.expression)) {
        const trimmed = trimTrailingOp(state.expression)
        const match = trimmed.match(/(-?\d+(?:\.\d+)?)\s*$/)
        if (match) {
          return {
            ...state,
            expression: trimmed.slice(0, match.index),
            entry: match[1],
            overwrite: false,
          }
        }
        return { ...state, expression: trimmed }
      }
      return state
    }

    default:
      return state
  }
}
