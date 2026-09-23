import { describe, expect, it } from 'vitest'
import {
  actionFromKey,
  clearLabel,
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
const eq: CalculatorAction = { type: 'equals' }
const dec: CalculatorAction = { type: 'decimal' }
const percent: CalculatorAction = { type: 'percent' }
const sign: CalculatorAction = { type: 'sign' }
const backspace: CalculatorAction = { type: 'backspace' }
const clear: CalculatorAction = { type: 'clear' }

function keys(value: string): CalculatorAction[] {
  return value.split('').map((key) => {
    const action = actionFromKey(key)
    if (!action) throw new Error(`unmapped key ${key}`)
    return action
  })
}

describe('calculator engine', () => {
  it('applies the previous operator immediately', () => {
    expect(run(keys('2+3*4=')).display).toBe('20')
  })

  it('keeps decimal sums exact', () => {
    expect(run([...keys('0'), dec, digit('1'), op('+'), digit('0'), dec, digit('2'), eq]).display).toBe(
      '0.3',
    )
  })

  it('treats percent as a portion of the left operand for addition', () => {
    expect(run([...keys('200+10'), percent, eq]).display).toBe('220')
  })

  it('treats percent as a fraction for multiplication', () => {
    expect(run([...keys('50*10'), percent, eq]).display).toBe('5')
  })

  it('toggles the sign of the current entry', () => {
    const negative = run([...keys('5'), sign])
    expect(negative.display).toBe('-5')
    expect(run([...keys('5'), sign, sign]).display).toBe('5')
  })

  it('lets a signed zero accept further digits', () => {
    expect(run([sign, digit('5'), dec, digit('2')]).display).toBe('-5.2')
  })

  it('clears the current entry and then the whole calculation', () => {
    const entering = run(keys('12+3'))
    expect(clearLabel(entering)).toBe('C')
    const cleared = reduceCalculator(entering, clear)
    expect(cleared.display).toBe('0')
    expect(cleared.operator).toBe('+')
    expect(clearLabel(cleared)).toBe('AC')
    expect(reduceCalculator(cleared, { type: 'allClear' })).toEqual(initialCalculatorState)
    expect(run([...keys('12+3'), clear, digit('4'), eq]).display).toBe('16')
  })

  it('deletes the last digit', () => {
    expect(run([...keys('123'), backspace]).display).toBe('12')
  })

  it('repeats the last operation on extra equals presses', () => {
    expect(run(keys('2+3==')).display).toBe('8')
  })

  it('uses the same number when equals follows an operator', () => {
    expect(run(keys('5+=')).display).toBe('10')
  })

  it('replaces an operator that has no new operand yet', () => {
    expect(run(keys('8+*2=')).display).toBe('16')
  })

  it('shows an error for divide by zero and starts over on the next digit', () => {
    const failed = run(keys('5/0='))
    expect(failed.display).toBe('Error')
    expect(failed.error).toBe(true)
    expect(reduceCalculator(failed, digit('7')).display).toBe('7')
  })

  it('errors when a chained operator divides by zero', () => {
    expect(run(keys('5/0*')).display).toBe('Error')
  })

  it('ignores a second decimal point and extra digits past the limit', () => {
    expect(run([digit('1'), dec, digit('2'), dec, digit('3')]).display).toBe('1.23')
    const long = run(Array.from({ length: 14 }, () => digit('9')))
    expect(long.display).toBe('999999999999')
  })

  it('maps keyboard keys onto calculator actions', () => {
    expect(actionFromKey('7')).toEqual({ type: 'digit', digit: '7' })
    expect(actionFromKey('*')).toEqual({ type: 'operator', operator: '×' })
    expect(actionFromKey('/')).toEqual({ type: 'operator', operator: '÷' })
    expect(actionFromKey('Enter')).toEqual({ type: 'equals' })
    expect(actionFromKey('=')).toEqual({ type: 'equals' })
    expect(actionFromKey('Backspace')).toEqual({ type: 'backspace' })
    expect(actionFromKey('Escape')).toEqual({ type: 'allClear' })
    expect(actionFromKey('%')).toEqual({ type: 'percent' })
    expect(actionFromKey('a')).toBeNull()
  })
})
