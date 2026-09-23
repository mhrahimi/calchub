import Decimal from 'decimal.js'

export type Operator = '+' | '-' | '×' | '÷' | '^'
export type AngleMode = 'deg' | 'rad'

export type FnName =
  | 'sin'
  | 'cos'
  | 'tan'
  | 'sinh'
  | 'cosh'
  | 'tanh'
  | 'ln'
  | 'log'
  | 'logx'
  | 'sqrt'
  | 'cbrt'
  | 'abs'
  | 'exp'
  | 'tenexp'

export type PostfixName = '!' | '²' | 'reciprocal' | 'abs'

export type CalculatorState = {
  expression: string
  entry: string
  overwrite: boolean
  error: boolean
  openParens: number
  justEvaluated: boolean
  repeatOperand: string | null
  repeatOperator: Operator | null
  angleMode: AngleMode
}

export type CalculatorAction =
  | { type: 'digit'; digit: string }
  | { type: 'decimal' }
  | { type: 'operator'; operator: Operator }
  | { type: 'paren'; which: '(' | ')' }
  | { type: 'comma' }
  | { type: 'equals' }
  | { type: 'percent' }
  | { type: 'sign' }
  | { type: 'backspace' }
  | { type: 'clear' }
  | { type: 'allClear' }
  | { type: 'loadResult'; value: string }
  | { type: 'fn'; name: FnName }
  | { type: 'constant'; name: 'π' | 'e' }
  | { type: 'postfix'; name: PostfixName }
  | { type: 'toggleAngle' }

type Token =
  | { kind: 'number'; value: string }
  | { kind: 'op'; value: Operator }
  | { kind: 'paren'; value: '(' | ')' }
  | { kind: 'fn'; value: FnName }
  | { kind: 'postfix'; value: '!' }
  | { kind: 'comma' }

type RpnToken = Token & { arity?: number }
type StackOp = Operator | '(' | FnName

const MAX_DIGITS = 12
const MAX_FACTORIAL = 170

const PRECEDENCE: Record<Operator, number> = {
  '+': 1,
  '-': 1,
  '×': 2,
  '÷': 2,
  '^': 3,
}

export const FN_DISPLAY: Record<FnName, string> = {
  sin: 'sin',
  cos: 'cos',
  tan: 'tan',
  sinh: 'sinh',
  cosh: 'cosh',
  tanh: 'tanh',
  ln: 'ln',
  log: 'log',
  logx: 'logₓ',
  sqrt: '√',
  cbrt: '∛',
  abs: 'abs',
  exp: 'exp',
  tenexp: '10^',
}

const FN_NAMES = (Object.keys(FN_DISPLAY) as FnName[]).sort((a, b) => b.length - a.length)

export const initialCalculatorState: CalculatorState = {
  expression: '',
  entry: '0',
  overwrite: true,
  error: false,
  openParens: 0,
  justEvaluated: false,
  repeatOperand: null,
  repeatOperator: null,
  angleMode: 'deg',
}

function errorState(angleMode: AngleMode): CalculatorState {
  return {
    ...initialCalculatorState,
    entry: 'Error',
    error: true,
    overwrite: true,
    angleMode,
  }
}

export function clearLabel(state: CalculatorState): 'C' | 'AC' {
  return !state.error && !state.overwrite && !state.justEvaluated ? 'C' : 'AC'
}

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
  if (key === ',') return { type: 'comma' }
  if (key === '!') return { type: 'postfix', name: '!' }
  if (key === 'Enter' || key === '=') return { type: 'equals' }
  if (key === 'Backspace') return { type: 'backspace' }
  if (key === 'Escape') return { type: 'allClear' }
  if (key === 'Delete') return { type: 'clear' }
  if (key === '%') return { type: 'percent' }
  if (key === 'p' || key === 'P') return { type: 'constant', name: 'π' }
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

function endsWithFnOpen(expression: string): boolean {
  return /(?:sin|cos|tan|sinh|cosh|tanh|ln|logₓ|log|√|∛|abs|exp|10\^)\(\s*$/u.test(expression)
}

function lastBinaryOperator(expression: string): Operator | null {
  const match = expression.match(/([+\-−×÷^])\s*$/u)
  if (!match) return null
  return match[1] === '−' ? '-' : (match[1] as Operator)
}

function toRadians(value: number, mode: AngleMode): number {
  return mode === 'deg' ? (value * Math.PI) / 180 : value
}

function factorial(n: Decimal): Decimal | null {
  if (!n.isInteger() || n.isNegative()) return null
  if (n.greaterThan(MAX_FACTORIAL)) return null
  let result = new Decimal(1)
  const limit = n.toNumber()
  for (let i = 2; i <= limit; i += 1) result = result.times(i)
  return result
}

function applyFn(name: FnName, args: Decimal[], angleMode: AngleMode): Decimal | null {
  try {
    if (name === 'logx') {
      if (args.length !== 2) return null
      const [base, value] = args
      if (base.lte(0) || base.eq(1) || value.lte(0)) return null
      const result = new Decimal(Math.log(value.toNumber()) / Math.log(base.toNumber()))
      return result.isFinite() ? result : null
    }
    if (args.length !== 1) return null
    const x = args[0]
    const n = x.toNumber()
    if (!Number.isFinite(n)) return null

    let result: number
    switch (name) {
      case 'sin':
        result = Math.sin(toRadians(n, angleMode))
        break
      case 'cos':
        result = Math.cos(toRadians(n, angleMode))
        break
      case 'tan':
        result = Math.tan(toRadians(n, angleMode))
        break
      case 'sinh':
        result = Math.sinh(n)
        break
      case 'cosh':
        result = Math.cosh(n)
        break
      case 'tanh':
        result = Math.tanh(n)
        break
      case 'ln':
        if (n <= 0) return null
        result = Math.log(n)
        break
      case 'log':
        if (n <= 0) return null
        result = Math.log10(n)
        break
      case 'sqrt':
        if (n < 0) return null
        result = Math.sqrt(n)
        break
      case 'cbrt':
        result = Math.cbrt(n)
        break
      case 'abs':
        return x.abs()
      case 'exp':
        result = Math.exp(n)
        break
      case 'tenexp':
        result = 10 ** n
        break
      default:
        return null
    }
    // Clean near-zeros from trig
    if (Math.abs(result) < 1e-12) result = 0
    return Number.isFinite(result) ? new Decimal(result) : null
  } catch {
    return null
  }
}

function tokenize(source: string): Token[] | null {
  const tokens: Token[] = []
  let i = 0
  let s = source.replace(/−/g, '-').replace(/\s+/g, '')
  s = s
    .replace(/logₓ/g, 'logx')
    .replace(/√/g, 'sqrt')
    .replace(/∛/g, 'cbrt')
    .replace(/10\^/g, 'tenexp')
    .replace(/π/g, `(${Math.PI})`)
  // standalone e constant (not part of scientific notation or function names)
  s = s.replace(/(?<![a-zA-Z0-9.])e(?![a-zA-Z0-9.(])/g, `(${Math.E})`)

  while (i < s.length) {
    const ch = s[i]

    if (ch === ',') {
      tokens.push({ kind: 'comma' })
      i += 1
      continue
    }
    if (ch === '!') {
      tokens.push({ kind: 'postfix', value: '!' })
      i += 1
      continue
    }
    if (ch === '(' || ch === ')') {
      tokens.push({ kind: 'paren', value: ch })
      i += 1
      continue
    }

    let matchedFn: FnName | null = null
    for (const name of FN_NAMES) {
      if (s.startsWith(name, i) && s[i + name.length] === '(') {
        matchedFn = name
        break
      }
    }
    if (matchedFn) {
      tokens.push({ kind: 'fn', value: matchedFn })
      i += matchedFn.length
      continue
    }

    if (ch === '+' || ch === '-' || ch === '×' || ch === '÷' || ch === '^' || ch === '*') {
      const op: Operator = ch === '*' ? '×' : ch === '-' ? '-' : (ch as Operator)
      const prev = tokens[tokens.length - 1]
      const unary =
        op === '-' &&
        (tokens.length === 0 ||
          prev?.kind === 'op' ||
          prev?.kind === 'comma' ||
          (prev?.kind === 'paren' && prev.value === '(') ||
          prev?.kind === 'fn')

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
      // scientific notation leftover like e+10 from Math.PI string? handled via parens
      if (num === '.' || !Number.isFinite(Number(num))) return null
      tokens.push({ kind: 'number', value: num })
      continue
    }

    return null
  }

  const withImplicit: Token[] = []
  for (const cur of tokens) {
    const prev = withImplicit[withImplicit.length - 1]
    if (prev) {
      const leftOk =
        prev.kind === 'number' ||
        prev.kind === 'postfix' ||
        (prev.kind === 'paren' && prev.value === ')')
      const rightOk =
        cur.kind === 'number' ||
        cur.kind === 'fn' ||
        (cur.kind === 'paren' && cur.value === '(')
      if (leftOk && rightOk) withImplicit.push({ kind: 'op', value: '×' })
    }
    withImplicit.push(cur)
  }
  return withImplicit
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

function isOperator(op: StackOp): op is Operator {
  return op === '+' || op === '-' || op === '×' || op === '÷' || op === '^'
}

function isFnName(op: StackOp): op is FnName {
  return op !== '(' && !isOperator(op)
}

function toRpn(tokens: Token[]): RpnToken[] {
  const output: RpnToken[] = []
  const ops: StackOp[] = []
  const arityStack: number[] = []

  for (const token of tokens) {
    if (token.kind === 'number' || token.kind === 'postfix') {
      output.push(token)
      continue
    }
    if (token.kind === 'fn') {
      ops.push(token.value)
      continue
    }
    if (token.kind === 'op') {
      while (ops.length > 0) {
        const top = ops[ops.length - 1]
        if (!isOperator(top)) break
        const shouldPop =
          PRECEDENCE[top] > PRECEDENCE[token.value] ||
          (PRECEDENCE[top] === PRECEDENCE[token.value] && token.value !== '^')
        if (!shouldPop) break
        output.push({ kind: 'op', value: ops.pop() as Operator })
      }
      ops.push(token.value)
      continue
    }
    if (token.kind === 'comma') {
      while (ops.length > 0 && ops[ops.length - 1] !== '(') {
        const top = ops.pop()!
        if (isOperator(top)) output.push({ kind: 'op', value: top })
        else if (isFnName(top)) output.push({ kind: 'fn', value: top, arity: 1 })
      }
      if (arityStack.length > 0) arityStack[arityStack.length - 1] += 1
      continue
    }
    if (token.value === '(') {
      ops.push('(')
      arityStack.push(1)
      continue
    }
    while (ops.length > 0 && ops[ops.length - 1] !== '(') {
      const top = ops.pop()!
      if (isOperator(top)) output.push({ kind: 'op', value: top })
      else if (isFnName(top)) output.push({ kind: 'fn', value: top, arity: 1 })
    }
    ops.pop()
    const arity = arityStack.pop() ?? 1
    if (ops.length > 0) {
      const top = ops[ops.length - 1]
      if (isFnName(top)) {
        ops.pop()
        output.push({ kind: 'fn', value: top, arity })
      }
    }
  }

  while (ops.length > 0) {
    const top = ops.pop()!
    if (top === '(') continue
    if (isOperator(top)) output.push({ kind: 'op', value: top })
    else if (isFnName(top)) output.push({ kind: 'fn', value: top, arity: 1 })
  }
  return output
}

function evaluateRpn(rpn: RpnToken[], angleMode: AngleMode): string | null {
  const stack: Decimal[] = []
  for (const token of rpn) {
    if (token.kind === 'number') {
      stack.push(new Decimal(token.value))
      continue
    }
    if (token.kind === 'postfix') {
      if (stack.length < 1) return null
      const result = factorial(stack.pop()!)
      if (result == null) return null
      stack.push(result)
      continue
    }
    if (token.kind === 'op') {
      if (stack.length < 2) return null
      const right = stack.pop()!
      const left = stack.pop()!
      const result = applyOp(left, token.value, right)
      if (result == null) return null
      stack.push(result)
      continue
    }
    if (token.kind === 'fn') {
      const arity = token.arity ?? (token.value === 'logx' ? 2 : 1)
      if (stack.length < arity) return null
      const args: Decimal[] = []
      for (let i = 0; i < arity; i += 1) args.unshift(stack.pop()!)
      const result = applyFn(token.value, args, angleMode)
      if (result == null) return null
      stack.push(result)
    }
  }
  if (stack.length !== 1) return null
  return formatResult(stack[0])
}

function evaluateTokens(tokens: Token[], angleMode: AngleMode): string | null {
  return evaluateRpn(toRpn(tokens), angleMode)
}

function formulaSource(state: CalculatorState, autoClose = false): string {
  let source: string
  if (!state.expression) {
    source = state.entry
  } else if (!state.overwrite) {
    source = `${state.expression}${state.entry}`
  } else if (
    endsWithOperator(state.expression) ||
    endsWithOpenParen(state.expression) ||
    endsWithFnOpen(state.expression)
  ) {
    source = `${state.expression}${state.entry}`
  } else {
    source = state.expression.trimEnd()
  }

  if (autoClose) {
    const opens = (source.match(/\(/g) ?? []).length
    const closes = (source.match(/\)/g) ?? []).length
    let open = Math.max(state.openParens, opens - closes)
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
  const result = evaluateTokens(tokens, state.angleMode)
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
  if (
    endsWithOperator(state.expression) ||
    endsWithOpenParen(state.expression) ||
    endsWithFnOpen(state.expression)
  ) {
    return `${state.expression}${state.entry} `
  }
  if (!state.expression) return `${state.entry} `
  return state.expression.endsWith(' ') ? state.expression : `${state.expression.trimEnd()} `
}

function needsImplicitMultiplyBeforeValue(state: CalculatorState): boolean {
  if (!state.overwrite) return true
  const expr = state.expression.trimEnd()
  return endsWithCloseParen(expr) || /\d(?:!)?\s*$/.test(expr)
}

function insertPrefixFn(state: CalculatorState, name: FnName): CalculatorState {
  const label = FN_DISPLAY[name]
  let expression = state.expression
  if (state.justEvaluated) {
    return {
      ...initialCalculatorState,
      angleMode: state.angleMode,
      expression: `${label}(`,
      entry: '0',
      overwrite: true,
      openParens: 1,
    }
  }
  if (needsImplicitMultiplyBeforeValue(state) && (expression || !state.overwrite)) {
    expression = appendOp(commitEntryIntoExpression(state), '×')
  }
  return {
    ...state,
    expression: `${expression}${label}(`,
    entry: '0',
    overwrite: true,
    openParens: state.openParens + 1,
    justEvaluated: false,
    repeatOperand: null,
    repeatOperator: null,
  }
}

function applyImmediate(
  state: CalculatorState,
  compute: (value: Decimal) => Decimal | null,
): CalculatorState {
  try {
    const result = compute(new Decimal(state.entry))
    if (result == null) return errorState(state.angleMode)
    const entry = formatResult(result)
    if (entry === 'Error') return errorState(state.angleMode)
    return {
      ...state,
      entry,
      overwrite: true,
      justEvaluated: false,
      expression: state.justEvaluated ? '' : state.expression,
    }
  } catch {
    return errorState(state.angleMode)
  }
}

export function reduceCalculator(state: CalculatorState, action: CalculatorAction): CalculatorState {
  switch (action.type) {
    case 'allClear':
      return { ...initialCalculatorState, angleMode: state.angleMode }

    case 'toggleAngle':
      return { ...state, angleMode: state.angleMode === 'deg' ? 'rad' : 'deg' }

    case 'loadResult': {
      const value = action.value.trim()
      if (!value || value === 'Error' || !Number.isFinite(Number(value))) return state
      return {
        ...initialCalculatorState,
        angleMode: state.angleMode,
        entry: value,
        overwrite: true,
        justEvaluated: true,
      }
    }

    case 'clear':
      if (state.error || state.overwrite || state.justEvaluated) {
        return { ...initialCalculatorState, angleMode: state.angleMode }
      }
      return { ...state, entry: '0', overwrite: true }

    case 'fn':
      if (state.error) return state
      return insertPrefixFn(state, action.name)

    case 'constant': {
      if (state.error) {
        return reduceCalculator({ ...initialCalculatorState, angleMode: state.angleMode }, action)
      }
      const raw = action.name === 'π' ? Math.PI : Math.E
      const value = formatResult(new Decimal(raw))
      if (state.justEvaluated) {
        return {
          ...initialCalculatorState,
          angleMode: state.angleMode,
          entry: value,
          overwrite: true,
          justEvaluated: false,
        }
      }
      if (state.overwrite && endsWithCloseParen(state.expression)) {
        return {
          ...state,
          expression: appendOp(state.expression, '×'),
          entry: value,
          overwrite: true,
          justEvaluated: false,
        }
      }
      if (!state.overwrite) {
        return {
          ...state,
          expression: appendOp(`${state.expression}${state.entry} `, '×'),
          entry: value,
          overwrite: true,
          justEvaluated: false,
        }
      }
      return {
        ...state,
        entry: value,
        overwrite: true,
        justEvaluated: false,
        repeatOperand: null,
        repeatOperator: null,
      }
    }

    case 'postfix': {
      if (state.error) return state
      if (action.name === 'reciprocal') {
        return applyImmediate(state, (v) => (v.isZero() ? null : new Decimal(1).div(v)))
      }
      if (action.name === 'abs') {
        return applyImmediate(state, (v) => v.abs())
      }
      if (action.name === '²') {
        return applyImmediate(state, (v) => v.times(v))
      }
      if (state.justEvaluated) {
        const formula = `${state.entry}!`
        const tokens = tokenize(formula)
        const result = tokens ? evaluateTokens(tokens, state.angleMode) : null
        if (result == null) return errorState(state.angleMode)
        return {
          ...initialCalculatorState,
          angleMode: state.angleMode,
          expression: formula,
          entry: result,
          overwrite: true,
          justEvaluated: true,
        }
      }
      const expression = `${commitEntryIntoExpression(state).trimEnd()}! `
      return {
        ...state,
        expression,
        entry: state.entry,
        overwrite: true,
        justEvaluated: false,
        repeatOperand: null,
        repeatOperator: null,
      }
    }

    case 'comma': {
      if (state.error || state.openParens <= 0) return state
      const expression = `${commitEntryIntoExpression(state).trimEnd()}, `
      return {
        ...state,
        expression,
        entry: '0',
        overwrite: true,
        justEvaluated: false,
      }
    }

    case 'digit': {
      if (!/^[0-9]$/.test(action.digit)) return state
      if (state.error) {
        return reduceCalculator({ ...initialCalculatorState, angleMode: state.angleMode }, action)
      }
      if (state.justEvaluated) {
        return {
          ...initialCalculatorState,
          angleMode: state.angleMode,
          entry: action.digit,
          overwrite: false,
        }
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
      if (state.error) {
        return reduceCalculator({ ...initialCalculatorState, angleMode: state.angleMode }, action)
      }
      if (state.justEvaluated) {
        return {
          ...initialCalculatorState,
          angleMode: state.angleMode,
          entry: '0.',
          overwrite: false,
        }
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
          angleMode: state.angleMode,
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
      return {
        ...state,
        expression: appendOp(commitEntryIntoExpression(state), action.operator),
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
            angleMode: state.angleMode,
            expression: '(',
            entry: '0',
            overwrite: true,
            openParens: 1,
          }
        }
        let expression = state.expression
        const needsImplicit =
          !state.overwrite ||
          endsWithCloseParen(expression) ||
          (state.overwrite && /\d\s*$/.test(expression.trimEnd()))
        if (needsImplicit && (expression || !state.overwrite)) {
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
      return {
        ...state,
        expression: `${commitEntryIntoExpression(state).trimEnd()}) `,
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
        const result = tokens ? evaluateTokens(tokens, state.angleMode) : null
        if (result == null || result === 'Error') return errorState(state.angleMode)
        return {
          expression: formula,
          entry: result,
          overwrite: true,
          error: false,
          openParens: 0,
          justEvaluated: true,
          repeatOperand: state.repeatOperand,
          repeatOperator: state.repeatOperator,
          angleMode: state.angleMode,
        }
      }
      const evaluated = evaluateState(state)
      if (!evaluated) return errorState(state.angleMode)
      const trailingOp = lastBinaryOperator(state.expression)
      const repeatOperand = trailingOp && state.openParens === 0 ? state.entry : null
      return {
        expression: evaluated.formula,
        entry: evaluated.result,
        overwrite: true,
        error: false,
        openParens: 0,
        justEvaluated: true,
        repeatOperand,
        repeatOperator: repeatOperand ? trailingOp : null,
        angleMode: state.angleMode,
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
            const val = tokens ? evaluateTokens(tokens, state.angleMode) : null
            if (val && val !== 'Error') base = new Decimal(val)
          }
        }
        const value = base != null ? base.times(current).div(100) : current.div(100)
        const entry = formatResult(value)
        if (entry === 'Error') return errorState(state.angleMode)
        return { ...state, entry, overwrite: true, justEvaluated: false }
      } catch {
        return errorState(state.angleMode)
      }
    }

    case 'sign': {
      if (state.error) return state
      if (state.justEvaluated) {
        return {
          ...initialCalculatorState,
          angleMode: state.angleMode,
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
      if (state.error || state.justEvaluated) {
        return { ...initialCalculatorState, angleMode: state.angleMode }
      }
      if (!state.overwrite) return { ...state, entry: deleteDigit(state.entry) }
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
