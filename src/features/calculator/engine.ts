import Decimal from 'decimal.js'

export type Operator = '+' | '-' | '×' | '÷'

export type CalculatorState = {
  display: string
  accumulator: string | null
  operator: Operator | null
  /** Next digit replaces the display instead of appending. */
  overwrite: boolean
  error: boolean
  repeatOperand: string | null
  repeatOperator: Operator | null
}

export type CalculatorAction =
  | { type: 'digit'; digit: string }
  | { type: 'decimal' }
  | { type: 'operator'; operator: Operator }
  | { type: 'equals' }
  | { type: 'percent' }
  | { type: 'sign' }
  | { type: 'backspace' }
  | { type: 'clear' }
  | { type: 'allClear' }

const MAX_DIGITS = 12

export const initialCalculatorState: CalculatorState = {
  display: '0',
  accumulator: null,
  operator: null,
  overwrite: true,
  error: false,
  repeatOperand: null,
  repeatOperator: null,
}

const errorState: CalculatorState = {
  ...initialCalculatorState,
  display: 'Error',
  error: true,
}

export function clearLabel(state: CalculatorState): 'C' | 'AC' {
  return !state.error && !state.overwrite ? 'C' : 'AC'
}

export function actionFromKey(key: string): CalculatorAction | null {
  if (/^[0-9]$/.test(key)) return { type: 'digit', digit: key }
  if (key === '.') return { type: 'decimal' }
  if (key === '+') return { type: 'operator', operator: '+' }
  if (key === '-') return { type: 'operator', operator: '-' }
  if (key === '*') return { type: 'operator', operator: '×' }
  if (key === '/') return { type: 'operator', operator: '÷' }
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

function compute(left: string, operator: Operator, right: string): string {
  try {
    const a = new Decimal(left)
    const b = new Decimal(right)
    let result: Decimal
    switch (operator) {
      case '+':
        result = a.plus(b)
        break
      case '-':
        result = a.minus(b)
        break
      case '×':
        result = a.times(b)
        break
      case '÷':
        if (b.isZero()) return 'Error'
        result = a.div(b)
        break
    }
    return formatResult(result)
  } catch {
    return 'Error'
  }
}

function finish(result: string, repeatOperand: string, repeatOperator: Operator): CalculatorState {
  if (result === 'Error') return errorState
  return {
    display: result,
    accumulator: null,
    operator: null,
    overwrite: true,
    error: false,
    repeatOperand,
    repeatOperator,
  }
}

/** Drop a finished result so the next entry is a new calculation. */
function freshEntry(state: CalculatorState): CalculatorState {
  if (state.operator) return { ...state, error: false }
  return {
    ...state,
    error: false,
    accumulator: null,
    repeatOperand: null,
    repeatOperator: null,
  }
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

export function reduceCalculator(state: CalculatorState, action: CalculatorAction): CalculatorState {
  switch (action.type) {
    case 'allClear':
      return initialCalculatorState

    case 'clear':
      if (state.error || state.overwrite) return initialCalculatorState
      return { ...state, display: '0', overwrite: true }

    case 'digit': {
      if (!/^[0-9]$/.test(action.digit)) return state
      if (state.error) return reduceCalculator(initialCalculatorState, action)
      if (state.overwrite) {
        return {
          ...freshEntry(state),
          display: action.digit,
          overwrite: false,
        }
      }
      const next = appendDigit(state.display, action.digit)
      if (next == null) return state
      return { ...state, display: next }
    }

    case 'decimal': {
      if (state.error) return reduceCalculator(initialCalculatorState, action)
      if (state.overwrite) {
        return { ...freshEntry(state), display: '0.', overwrite: false }
      }
      if (state.display.includes('.')) return state
      return { ...state, display: `${state.display}.` }
    }

    case 'operator': {
      if (state.error) return state
      if (state.operator && state.overwrite) {
        return {
          ...state,
          operator: action.operator,
          repeatOperand: null,
          repeatOperator: null,
        }
      }
      if (state.operator && state.accumulator != null) {
        const result = compute(state.accumulator, state.operator, state.display)
        if (result === 'Error') return errorState
        return {
          display: result,
          accumulator: result,
          operator: action.operator,
          overwrite: true,
          error: false,
          repeatOperand: null,
          repeatOperator: null,
        }
      }
      return {
        ...state,
        accumulator: state.display,
        operator: action.operator,
        overwrite: true,
        repeatOperand: null,
        repeatOperator: null,
      }
    }

    case 'equals': {
      if (state.error) return state
      if (state.operator && state.accumulator != null) {
        return finish(
          compute(state.accumulator, state.operator, state.display),
          state.display,
          state.operator,
        )
      }
      if (state.repeatOperator && state.repeatOperand != null) {
        return finish(
          compute(state.display, state.repeatOperator, state.repeatOperand),
          state.repeatOperand,
          state.repeatOperator,
        )
      }
      return state
    }

    case 'percent': {
      if (state.error) return state
      try {
        const current = new Decimal(state.display)
        const value =
          (state.operator === '+' || state.operator === '-') && state.accumulator != null
            ? new Decimal(state.accumulator).times(current).div(100)
            : current.div(100)
        const display = formatResult(value)
        if (display === 'Error') return errorState
        return { ...state, display, overwrite: true }
      } catch {
        return errorState
      }
    }

    case 'sign': {
      if (state.error) return state
      const enteringNegativeZero =
        state.overwrite && (state.display === '0' || state.display === '-0')
      return {
        ...state,
        display: toggleSign(state.display),
        overwrite: enteringNegativeZero ? false : state.overwrite,
      }
    }

    case 'backspace': {
      if (state.error) return initialCalculatorState
      const display = deleteDigit(state.display)
      if (!state.operator) {
        return {
          ...initialCalculatorState,
          display,
          overwrite: false,
        }
      }
      return { ...state, display, overwrite: false }
    }

    default:
      return state
  }
}
