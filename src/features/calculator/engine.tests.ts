import { describe, expect, it } from 'vitest'
import {
  actionFromKey,
  clearLabel,
  displayExpression,
  initialCalculatorState,
  reduceCalculator,
  type CalculatorAction,
  type FnName,
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
    expect(actionFromKey(',')).toEqual({ type: 'comma' })
    expect(actionFromKey('!')).toEqual({ type: 'postfix', name: '!' })
    expect(actionFromKey('Enter')).toEqual({ type: 'equals' })
    expect(actionFromKey('=')).toEqual({ type: 'equals' })
    expect(actionFromKey('Backspace')).toEqual({ type: 'backspace' })
    expect(actionFromKey('Escape')).toEqual({ type: 'allClear' })
    expect(actionFromKey('%')).toEqual({ type: 'percent' })
    expect(actionFromKey('a')).toBeNull()
  })
})

describe('scientific functions', () => {
  const fn = (name: FnName): CalculatorAction => ({ type: 'fn', name })
  const constant = (name: 'π' | 'e'): CalculatorAction => ({ type: 'constant', name })
  const postfix = (name: '!' | '²' | 'reciprocal' | 'abs'): CalculatorAction => ({
    type: 'postfix',
    name,
  })
  const comma: CalculatorAction = { type: 'comma' }
  const toggleAngle: CalculatorAction = { type: 'toggleAngle' }

  it('computes trig in degrees by default', () => {
    expect(run([fn('sin'), ...keys('30=')]).entry).toBe('0.5')
    expect(Number(run([fn('cos'), ...keys('60=')]).entry)).toBeCloseTo(0.5, 8)
    expect(Number(run([fn('tan'), ...keys('45=')]).entry)).toBeCloseTo(1, 8)
  })

  it('computes trig in radians when toggled', () => {
    const r2 = run([toggleAngle, fn('sin'), constant('π'), op('÷'), digit('6'), eq])
    expect(r2.angleMode).toBe('rad')
    expect(Number(r2.entry)).toBeCloseTo(0.5, 6)
  })

  it('computes hyperbolic smoke values', () => {
    expect(Number(run([fn('sinh'), digit('0'), eq]).entry)).toBeCloseTo(0, 10)
    expect(Number(run([fn('cosh'), digit('0'), eq]).entry)).toBeCloseTo(1, 10)
    expect(Number(run([fn('tanh'), digit('0'), eq]).entry)).toBeCloseTo(0, 10)
  })

  it('computes logs, roots, factorial, and constants', () => {
    expect(run([fn('ln'), constant('e'), eq]).entry).toBe('1')
    expect(run([fn('log'), ...keys('100=')]).entry).toBe('2')
    expect(run([fn('logx'), digit('2'), comma, digit('8'), eq]).entry).toBe('3')
    expect(run([fn('sqrt'), digit('9'), eq]).entry).toBe('3')
    expect(run([...keys('5'), postfix('!'), eq]).entry).toBe('120')
    expect(Number(run([constant('π')]).entry)).toBeCloseTo(Math.PI, 8)
    expect(Number(run([constant('e')]).entry)).toBeCloseTo(Math.E, 8)
  })

  it('applies immediate postfix helpers', () => {
    expect(run([...keys('5'), postfix('²')]).entry).toBe('25')
    expect(run([...keys('4'), postfix('reciprocal')]).entry).toBe('0.25')
    expect(run([sign, digit('3'), postfix('abs')]).entry).toBe('3')
  })

  it('respects function precedence with multiplication and addition', () => {
    expect(run([...keys('2+3*'), fn('sin'), digit('0'), eq]).entry).toBe('2')
    expect(run([fn('sqrt'), ...keys('16'), paren(')'), op('+'), ...keys('2^3=')]).entry).toBe('12')
  })

  it('applies factorial before power when written as 2^3!', () => {
    expect(run([...keys('2^3'), postfix('!'), eq]).entry).toBe('64')
  })

  it('errors on invalid domains', () => {
    expect(run([fn('ln'), ...keys('0=')]).error).toBe(true)
    expect(run([fn('sqrt'), sign, digit('1'), eq]).error).toBe(true)
    expect(run([sign, digit('3'), postfix('!'), eq]).error).toBe(true)
  })
})
