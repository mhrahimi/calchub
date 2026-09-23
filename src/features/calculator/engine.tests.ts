import { describe, expect, it } from 'vitest'
import {
  actionFromKey,
  clearLabel,
  displayExpression,
  initialCalculatorState,
  reduceCalculator,
  type CalculatorAction,
  type Operator,
} from './engine'

function run(actions: CalculatorAction[]) {
  return actions.reduce(reduceCalculator, initialCalculatorState)
}

const digit = (digit: string): CalculatorAction => ({ type: 'digit', digit })
const op = (operator: Operator): CalculatorAction => ({ type: 'operator', operator })
const paren = (which: '(' | ')'): CalculatorAction => ({ type: 'paren', which })
const eq: CalculatorAction = { type: 'equals' }
const dec: CalculatorAction = { type: 'decimal' }
const percent: CalculatorAction = { type: 'percent' }
const sign: CalculatorAction = { type: 'sign' }
const backspace: CalculatorAction = { type: 'backspace' }
const clear: CalculatorAction = { type: 'clear' }

function keys(value: string): CalculatorAction[] {
  return value.split('').map((key) => {
    const mapped = key === '×' ? '*' : key === '÷' ? '/' : key === '−' ? '-' : key
    const action = actionFromKey(mapped)
    if (!action) throw new Error(`unmapped key ${key}`)
    return action
  })
}

describe('calculator engine', () => {
  it('shows the full expression while chaining and uses precedence', () => {
    const mid = run(keys('2+3*4'))
    expect(displayExpression(mid)).toBe('2 + 3 × 4')
    expect(run(keys('2+3*4=')).entry).toBe('14')
  })

  it('keeps decimal sums exact', () => {
    expect(
      run([...keys('0'), dec, digit('1'), op('+'), digit('0'), dec, digit('2'), eq]).entry,
    ).toBe('0.3')
  })

  it('evaluates parentheses before other operators', () => {
    expect(
      run([paren('('), ...keys('2+3'), paren(')'), op('×'), digit('4'), eq]).entry,
    ).toBe('20')
  })

  it('supports power and right-associativity', () => {
    expect(run(keys('2^3=')).entry).toBe('8')
    expect(run(keys('2^3^2=')).entry).toBe('512')
  })

  it('supports power with nested parentheses', () => {
    expect(run([...keys('2^'), paren('('), ...keys('1+2'), paren(')'), eq]).entry).toBe('8')
  })

  it('treats percent as a portion of the left operand for addition', () => {
    expect(run([...keys('200+10'), percent, eq]).entry).toBe('220')
  })

  it('treats percent as a fraction for multiplication', () => {
    expect(run([...keys('50*10'), percent, eq]).entry).toBe('5')
  })

  it('toggles the sign of the current entry', () => {
    expect(run([...keys('5'), sign]).entry).toBe('-5')
    expect(run([...keys('5'), sign, sign]).entry).toBe('5')
  })

  it('lets a signed zero accept further digits', () => {
    expect(run([sign, digit('5'), dec, digit('2')]).entry).toBe('-5.2')
  })

  it('clears the current entry and then the whole calculation', () => {
    const entering = run(keys('12+3'))
    expect(clearLabel(entering)).toBe('C')
    const cleared = reduceCalculator(entering, clear)
    expect(cleared.entry).toBe('0')
    expect(clearLabel(cleared)).toBe('AC')
    expect(reduceCalculator(cleared, { type: 'allClear' })).toEqual(initialCalculatorState)
    expect(run([...keys('12+3'), clear, digit('4'), eq]).entry).toBe('16')
  })

  it('deletes the last digit', () => {
    expect(run([...keys('123'), backspace]).entry).toBe('12')
  })

  it('repeats the last operation on extra equals presses', () => {
    expect(run(keys('2+3==')).entry).toBe('8')
  })

  it('uses the same number when equals follows an operator', () => {
    expect(run(keys('5+=')).entry).toBe('10')
  })

  it('replaces an operator that has no new operand yet', () => {
    expect(run(keys('8+*2=')).entry).toBe('16')
  })

  it('shows an error for divide by zero and starts over on the next digit', () => {
    const failed = run(keys('5/0='))
    expect(failed.entry).toBe('Error')
    expect(failed.error).toBe(true)
    expect(reduceCalculator(failed, digit('7')).entry).toBe('7')
  })

  it('keeps the finished formula on the top line after equals', () => {
    const done = run(keys('2+3*4='))
    expect(done.entry).toBe('14')
    expect(displayExpression(done)).toContain('2')
    expect(displayExpression(done)).toContain('3')
    expect(displayExpression(done)).toContain('4')
  })

  it('auto-closes unmatched parentheses on equals', () => {
    expect(run([paren('('), ...keys('2+3=')]).entry).toBe('5')
  })

  it('maps keyboard keys onto calculator actions', () => {
    expect(actionFromKey('7')).toEqual({ type: 'digit', digit: '7' })
    expect(actionFromKey('*')).toEqual({ type: 'operator', operator: '×' })
    expect(actionFromKey('/')).toEqual({ type: 'operator', operator: '÷' })
    expect(actionFromKey('^')).toEqual({ type: 'operator', operator: '^' })
    expect(actionFromKey('(')).toEqual({ type: 'paren', which: '(' })
    expect(actionFromKey(')')).toEqual({ type: 'paren', which: ')' })
    expect(actionFromKey('Enter')).toEqual({ type: 'equals' })
    expect(actionFromKey('=')).toEqual({ type: 'equals' })
    expect(actionFromKey('Backspace')).toEqual({ type: 'backspace' })
    expect(actionFromKey('Escape')).toEqual({ type: 'allClear' })
    expect(actionFromKey('%')).toEqual({ type: 'percent' })
    expect(actionFromKey('a')).toBeNull()
  })
})
