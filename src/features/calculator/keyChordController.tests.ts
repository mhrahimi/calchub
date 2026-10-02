import { describe, expect, it } from 'vitest'
import { createKeyChordController } from './keyChordController'
import { DEFAULT_SHORTCUTS, type Shortcut, type ShortcutConfig } from './shortcuts'
import type { CalculatorAction } from './engine'

function config(shortcuts: Shortcut[]): ShortcutConfig {
  return { ...DEFAULT_SHORTCUTS, shortcuts }
}

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

  it('uses hold combos from config so bindings are easy to change', () => {
    const c = createKeyChordController(config([{ id: 'a', trigger: { kind: 'hold', hold: '0', key: '/' }, action: 'closeParen' }]))
    c.onKeyDown('0', 0)
    expect(actionsOf(c.onKeyDown('/', 10))).toEqual([{ type: 'paren', which: ')' }])
  })

  it('supports more than one hold key', () => {
    const c = createKeyChordController(config([
      ...DEFAULT_SHORTCUTS.shortcuts,
      { id: 'b', trigger: { kind: 'hold', hold: '.', key: 's' }, action: 'sqrt' },
    ]))
    c.onKeyDown('.', 0)
    expect(actionsOf(c.onKeyDown('s', 10))).toEqual([{ type: 'fn', name: 'sqrt' }])
    expect(actionsOf(c.onKeyUp('.', 20))).toEqual([])
    c.onKeyDown('.', 30)
    expect(actionsOf(c.onKeyUp('.', 40))).toEqual([{ type: 'decimal' }])
    c.onKeyDown('0', 50)
    expect(actionsOf(c.onKeyDown('/', 60))).toEqual([{ type: 'paren', which: '(' }])
  })

  it('maps press shortcuts and passes other letters through as text', () => {
    const c = createKeyChordController(config([{ id: 'c', trigger: { kind: 'press', key: 'r' }, action: 'sqrt' }]))
    expect(c.handles('r')).toBe(true)
    expect(actionsOf(c.onKeyDown('r', 0))).toEqual([{ type: 'fn', name: 'sqrt' }])
    expect(c.onKeyDown('s', 10)).toMatchObject({ actions: [], text: 's' })
    expect(c.onKeyDown('p', 20)).toMatchObject({ actions: [], text: 'p' })
  })

  it('uses the configured double-tap window', () => {
    const c = createKeyChordController({ ...DEFAULT_SHORTCUTS, doubleTapMs: 600 })
    c.onKeyDown('*', 0)
    expect(actionsOf(c.poll(400))).toEqual([])
    expect(actionsOf(c.onKeyDown('*', 500))).toEqual([{ type: 'operator', operator: '^' }])
  })

  it('types 0 immediately when hold-for-zeros is off and 0 has no chords', () => {
    const c = createKeyChordController({ ...DEFAULT_SHORTCUTS, holdDigitZeros: null, shortcuts: [] })
    expect(c.handles('0')).toBe(false)
    expect(actionsOf(c.onKeyDown('0', 0))).toEqual([{ type: 'digit', digit: '0' }])
    expect(actionsOf(c.onKeyDown('3', 10))).toEqual([{ type: 'digit', digit: '3' }])
  })

  it('flushes pending typing before focus moves', () => {
    const c = createKeyChordController()
    c.onKeyDown('0', 0)
    expect(c.flush().actions).toEqual([{ type: 'digit', digit: '0' }])
    expect(c.onKeyUp('0', 20).actions).toEqual([])
    c.onKeyDown('*', 30)
    expect(c.flush().actions).toEqual([{ type: 'operator', operator: '×' }])
    expect(c.poll(500).actions).toEqual([])
  })

  it('preserves zero before an unbound chord partner', () => {
    const c = createKeyChordController()
    c.onKeyDown('0', 0)
    expect(c.onKeyDown('+', 20).actions).toEqual([{ type: 'digit', digit: '0' }, { type: 'operator', operator: '+' }])
  })

  it('ignores key repeat while holding the chord partner', () => {
    const c = createKeyChordController()
    c.onKeyDown('0', 0)
    expect(actionsOf(c.onKeyDown('3', 10, { repeat: true }))).toEqual([])
    expect(actionsOf(c.onKeyDown('3', 20))).toHaveLength(3)
  })
})
