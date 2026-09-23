import { describe, expect, it } from 'vitest'
import { createKeyChordController } from './keyChordController'
import { keyBindings } from './keyBindings'
import type { CalculatorAction } from './engine'

function actionsOf(
  result: { actions: CalculatorAction[] },
): CalculatorAction[] {
  return result.actions
}

describe('keyChordController', () => {
  it('emits a single zero when 0 is pressed and released alone', () => {
    const c = createKeyChordController()
    expect(actionsOf(c.onKeyDown('0', 0))).toEqual([])
    expect(actionsOf(c.onKeyUp('0', 100))).toEqual([{ type: 'digit', digit: '0' }])
  })

  it('hold 0 + 3 inserts three zeros with no leading lone zero', () => {
    const c = createKeyChordController()
    c.onKeyDown('0', 0)
    expect(actionsOf(c.onKeyDown('3', 50))).toEqual([
      { type: 'digit', digit: '0' },
      { type: 'digit', digit: '0' },
      { type: 'digit', digit: '0' },
    ])
    expect(actionsOf(c.onKeyUp('0', 80))).toEqual([])
  })

  it('hold 0 + / opens paren and hold 0 + * closes paren', () => {
    const c = createKeyChordController()
    c.onKeyDown('0', 0)
    expect(actionsOf(c.onKeyDown('/', 10))).toEqual([{ type: 'paren', which: '(' }])
    c.onKeyUp('0', 20)

    c.onKeyDown('0', 30)
    expect(actionsOf(c.onKeyDown('*', 40))).toEqual([{ type: 'paren', which: ')' }])
  })

  it('double * within the window emits power', () => {
    const c = createKeyChordController()
    expect(actionsOf(c.onKeyDown('*', 0))).toEqual([])
    expect(actionsOf(c.onKeyDown('*', 100))).toEqual([
      { type: 'operator', operator: '^' },
    ])
  })

  it('single * emits multiply after the double-tap window', () => {
    const c = createKeyChordController()
    expect(actionsOf(c.onKeyDown('*', 0))).toEqual([])
    expect(actionsOf(c.poll(400))).toEqual([{ type: 'operator', operator: '×' }])
  })

  it('flushes pending * as multiply before another key', () => {
    const c = createKeyChordController()
    c.onKeyDown('*', 0)
    expect(actionsOf(c.onKeyDown('5', 50))).toEqual([
      { type: 'operator', operator: '×' },
      { type: 'digit', digit: '5' },
    ])
  })

  it('uses holdCombos from config so bindings are easy to change', () => {
    const custom = {
      ...keyBindings,
      holdCombos: {
        '/': { type: 'paren' as const, which: ')' as const },
      },
    }
    const c = createKeyChordController(custom)
    c.onKeyDown('0', 0)
    expect(actionsOf(c.onKeyDown('/', 10))).toEqual([{ type: 'paren', which: ')' }])
  })

  it('ignores key repeat while holding the chord partner', () => {
    const c = createKeyChordController()
    c.onKeyDown('0', 0)
    expect(actionsOf(c.onKeyDown('3', 10, { repeat: true }))).toEqual([])
    expect(actionsOf(c.onKeyDown('3', 20))).toHaveLength(3)
  })
})
