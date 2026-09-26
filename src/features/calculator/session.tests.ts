import { describe, expect, it } from 'vitest'
import { actionFromKey, type CalculatorAction } from './engine'
import { evaluateExpression } from './expression'
import { initialSession, reduceSession, type CalculatorSession } from './session'
import type { CalculatorHistoryEntry } from './historyStore'

const edit = (source: string, state = initialSession) => reduceSession(state, { type: 'edit', source, start: source.length, end: source.length })
const key = (state: CalculatorSession, action: CalculatorAction) => reduceSession(state, { type: 'key', action })
const commit = (state: CalculatorSession) => key(state, { type: 'equals' })
const value = (state: CalculatorSession) => evaluateExpression(state.source, state.angleMode)
const insert = (state: CalculatorSession, text: string) => reduceSession(state, { type: 'insert', text })

describe('always-editable calculator session', () => {
  it('previews without committing and commits only on equals', () => {
    const draft = edit('12+3')
    expect(value(draft)).toEqual({ status: 'complete', value: '15' })
    expect(draft.committed).toBe(false)
    expect(draft.result).toBeNull()
    const result = commit(draft)
    expect(result.source).toBe('12+3')
    expect(result.result).toBe('15')
    expect(result.committed).toBe(true)
    expect(commit(result)).toBe(result)
  })

  it('starts fresh on a digit, continues on an operator, or resumes editing', () => {
    const completed = commit(edit('12+3'))
    expect(insert(completed, '4').source).toBe('4')
    expect(insert(completed, '*').source).toBe('15*')
    let editing = reduceSession(completed, { type: 'resume' })
    editing = reduceSession(editing, { type: 'select', start: 0, end: 2 })
    expect(commit(insert(editing, '20')).result).toBe('23')
  })

  it('does not erase invalid or unfinished expressions on evaluation', () => {
    const invalid = commit(edit('2+(3', commit(edit('4+5'))))
    expect(invalid.source).toBe('2+(3')
    expect(invalid.result).toBe('9')
    expect(invalid.committed).toBe(false)
    expect(invalid.showErrors).toBe(true)
    expect(commit(insert(invalid, ')')).result).toBe('5')
  })

  it('selects the error location on failed evaluation', () => {
    const invalid = commit(edit('12 + wat(3)'))
    expect(invalid.source.slice(invalid.start, invalid.end)).toBe('wat')
    expect(value(invalid)).toMatchObject({ status: 'error', start: 5, end: 8 })
  })

  it('undoes and redoes edits, calculation, and accidental clear', () => {
    const completed = commit(edit('12+3'))
    const cleared = key(completed, { type: 'allClear' })
    expect(cleared.source).toBe('')
    const restored = reduceSession(cleared, { type: 'undo' })
    expect(restored.source).toBe('12+3')
    expect(restored.committed).toBe(true)
    expect(reduceSession(restored, { type: 'redo' }).source).toBe('')
    const uncommitted = reduceSession(restored, { type: 'undo' })
    expect(uncommitted.committed).toBe(false)
    expect(uncommitted.source).toBe('12+3')
    expect(insert(uncommitted, '0').future).toEqual([])
  })

  it('restores selections and angle mode with undo', () => {
    const selected = reduceSession(edit('12+30'), { type: 'select', start: 2, end: 3 })
    const multiplied = key(selected, { type: 'operator', operator: '×' })
    expect(multiplied.source).toBe('12*30')
    const undone = reduceSession(multiplied, { type: 'undo' })
    expect([undone.start, undone.end]).toEqual([2, 3])
    const radians = key(undone, { type: 'setAngle', mode: 'rad' })
    expect(reduceSession(radians, { type: 'undo' }).angleMode).toBe('deg')
  })

  it('bounds undo history and rejects overlong insertions without truncating', () => {
    let state = initialSession
    for (let i = 0; i < 250; i++) state = insert(state, '1')
    expect(state.past).toHaveLength(200)
    const rejected = insert(state, '2'.repeat(2000))
    expect(rejected.source).toBe(state.source)
    expect(rejected.inputError).toMatch(/2,000/)
  })

  it('inserts functions around a selection or leaves the caret inside parentheses', () => {
    const selected = reduceSession(edit('3+4'), { type: 'select', start: 2, end: 3 })
    expect(commit(key(selected, { type: 'fn', name: 'sqrt' })).result).toBe('5')
    const emptyFn = key(initialSession, { type: 'fn', name: 'sqrt' })
    expect(emptyFn.source).toBe('sqrt()')
    expect(emptyFn.start).toBe(5)
    expect(commit(insert(emptyFn, '81')).result).toBe('9')
  })

  it('steps over an existing closing parenthesis after a keypad function', () => {
    const fn = key(initialSession, { type: 'fn', name: 'sqrt' })
    const entered = insert(insert(fn, '81'), ')')
    expect(entered.source).toBe('sqrt(81)')
    expect(entered.start).toBe(entered.source.length)
    expect(commit(entered).result).toBe('9')
  })

  it('preserves reciprocal precedence in an exponent', () => {
    const transformed = key(edit('8^3'), { type: 'postfix', name: 'reciprocal' })
    expect(commit(transformed).result).toBe('2')
  })

  it('applies scientific helpers to the operand before the caret', () => {
    expect(commit(key(edit('2+3'), { type: 'postfix', name: '²' })).result).toBe('11')
    expect(commit(key(edit('2+sqrt(9)'), { type: 'postfix', name: 'reciprocal' })).result).toBe('2.33333333333')
    expect(commit(key(edit('2+3'), { type: 'sign' })).result).toBe('-1')
    const completed = commit(edit('3+6'))
    const rooted = key(completed, { type: 'fn', name: 'sqrt' })
    expect(commit(rooted).result).toBe('3')
    expect(reduceSession(rooted, { type: 'undo' }).source).toBe('3+6')
  })

  it('evaluates keypad, typed, and pasted-style expressions with the same rules', () => {
    let keypad = initialSession
    for (const character of '200+10%') keypad = key(keypad, actionFromKey(character)!)
    expect(commit(keypad).result).toBe('220')
    expect(commit(edit('200+10%')).result).toBe('220')
    expect(commit(insert(initialSession, '200 + 10%')).result).toBe('220')
    expect(commit(key(edit('200'), { type: 'percent' })).result).toBe('2')
  })
})

const entries: CalculatorHistoryEntry[] = [
  { id: 'radians', expression: 'sin(pi/6)', result: '0.5', angleMode: 'rad' },
  { id: 'degrees', expression: 'sin(30)', result: '0.5', angleMode: 'deg' },
]
const recall = (state: CalculatorSession, direction: 'older' | 'newer') => reduceSession(state, { type: 'recall', direction, entries })

describe('history recall and reuse', () => {
  it('restores the exact unfinished draft, caret, and angle mode after browsing', () => {
    const draft = reduceSession(edit('125+'), { type: 'select', start: 1, end: 3 })
    const newest = recall(draft, 'older')
    expect(newest.source).toBe('sin(pi/6)')
    expect(newest.angleMode).toBe('rad')
    const oldest = recall(newest, 'older')
    expect(oldest.source).toBe('sin(30)')
    expect(recall(oldest, 'older')).toBe(oldest)
    const restored = recall(recall(oldest, 'newer'), 'newer')
    expect(restored.source).toBe(draft.source)
    expect([restored.start, restored.end, restored.angleMode]).toEqual([1, 3, 'deg'])
    expect(recall(restored, 'newer')).toBe(restored)
  })

  it('recalls a full editable expression with its saved angle mode', () => {
    const loaded = reduceSession(initialSession, { type: 'loadExpression', entry: entries[0] })
    expect(value(loaded)).toEqual({ status: 'complete', value: '0.5' })
    expect(loaded.committed).toBe(false)
    expect(loaded.angleMode).toBe('rad')
  })

  it('leaves the current angle mode intact for legacy history without metadata', () => {
    const radians = key(initialSession, { type: 'setAngle', mode: 'rad' })
    expect(reduceSession(radians, { type: 'loadExpression', entry: { id: 'old', expression: '2+3', result: '5' } }).angleMode).toBe('rad')
  })

  it('restores the draft if history is cleared while browsing', () => {
    const recalled = recall(edit('99+'), 'older')
    const cleared = reduceSession(recalled, { type: 'forgetHistory' })
    expect(cleared.source).toBe('99+')
    expect(cleared.recall).toBeNull()
  })

  it('inserts a reused result at the caret instead of losing the draft', () => {
    const state = reduceSession(edit('2+'), { type: 'key', action: { type: 'loadResult', value: '0.5' } })
    expect(state.source).toBe('2+0.5')
    expect(commit(state).result).toBe('2.5')
  })
})
