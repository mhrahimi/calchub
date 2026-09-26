import { describe, expect, it } from 'vitest'
import { formatExpressionInput, moveInputCaret, readExpressionInput, stripInputGrouping } from './inputFormatting'
import { evaluateExpression } from './expression'
import { normalizePastedText, parsePastedText } from './clipboard'
import { initialSession, reduceSession } from './session'

describe('expression input grouping', () => {
  it.each([
    ['', ''], ['123', '123'], ['1234', '1٬234'], ['123456', '123٬456'], ['1234567', '1٬234٬567'],
    ['-1234567.123456', '-1٬234٬567.123456'], ['1234.', '1٬234.'], ['.1234567', '.1234567'],
    ['123456e-123456', '123٬456e-123456'], ['123456e-', '123٬456e-'], ['1.234567e+12', '1.234567e+12'],
    ['logx(123456,8)', 'logx(123٬456,8)'], ['logx(2,1234567)', 'logx(2,1٬234٬567)'],
    ['logx(123,456)', 'logx(123,456)'], ['sqrt(123456)+789012', 'sqrt(123٬456)+789٬012'],
    ['function123456(10000)', 'function123456(10٬000)'], ['1234pi', '1٬234pi'],
  ])('formats %s without changing its meaning', (source, display) => {
    const formatted = formatExpressionInput(source)
    expect(formatted.text).toBe(display)
    expect(stripInputGrouping(display)).toBe(source)
    expect(evaluateExpression(stripInputGrouping(display))).toEqual(evaluateExpression(source))
  })

  it('maps every raw caret position through grouping and back', () => {
    for (const source of ['', '1234567', '-1234567.89', 'logx(123456,8)', '123456+sqrt(123456789)']) {
      const { text, toDisplay, toSource } = formatExpressionInput(source)
      expect(toDisplay).toHaveLength(source.length + 1)
      expect(toSource).toHaveLength(text.length + 1)
      for (let position = 0; position <= source.length; position++) {
        expect(toSource[toDisplay[position]]).toBe(position)
      }
    }
  })

  it('maps both sides of a grouping mark to the same expression boundary', () => {
    const { toSource, toDisplay } = formatExpressionInput('1234')
    expect(toSource).toEqual([0, 1, 1, 2, 3, 4])
    expect(toDisplay).toEqual([0, 2, 3, 4, 5])
  })

  it('skips decorative grouping marks when moving the caret', () => {
    expect(moveInputCaret('1٬234', 0, 1)).toBe(2)
    expect(moveInputCaret('1٬234', 2, -1)).toBe(0)
    expect(moveInputCaret('1٬234', 3, -1)).toBe(2)
    expect(moveInputCaret('1٬234', 0, -1)).toBe(0)
    expect(moveInputCaret('1٬234', 5, 1)).toBe(5)
  })

  it('decodes native edits and selection offsets without removing argument commas', () => {
    expect(readExpressionInput('logx(123٬456,8)', 8, 11)).toEqual({ source: 'logx(123456,8)', start: 8, end: 10 })
    expect(readExpressionInput('12٬345.67', 9, 9)).toEqual({ source: '12345.67', start: 8, end: 8 })
  })

  it('round-trips pasted grouped expressions, including function arguments', () => {
    expect(normalizePastedText('logx(2,65٬536)')).toBe('logx(2,65536)')
    expect(parsePastedText('logx(2,65٬536)')).toEqual({ kind: 'result', value: '16', expression: 'logx(2,65536)' })
    expect(parsePastedText('1٬234٬567.89')).toEqual({ kind: 'number', value: '1234567.89' })
  })

  it('keeps grouping out of session state and undo snapshots', () => {
    const inserted = reduceSession(initialSession, { type: 'insert', text: 'logx(2,65٬536)' })
    expect(inserted.source).toBe('logx(2,65536)')
    const edited = reduceSession(inserted, { type: 'edit', source: '12٬345', start: 6, end: 6 })
    expect(edited.source).toBe('12345')
    expect(edited.start).toBe(5)
    expect(reduceSession(edited, { type: 'undo' }).source).toBe(inserted.source)
  })

  it('deletes digits rather than grouping marks and preserves redo', () => {
    let state = reduceSession(initialSession, { type: 'edit', source: '1٬234', start: 2, end: 2 })
    expect(state.start).toBe(1)
    const backwards = reduceSession(state, { type: 'key', action: { type: 'backspace' } })
    expect(backwards.source).toBe('234')
    const forwards = reduceSession(state, { type: 'deleteForward' })
    expect(forwards.source).toBe('134')
    state = reduceSession(forwards, { type: 'undo' })
    expect(formatExpressionInput(state.source).text).toBe('1٬234')
    expect(reduceSession(state, { type: 'redo' }).source).toBe('134')
  })

  it('counts only actual expression characters toward the length limit', () => {
    const source = '1'.repeat(2000)
    const display = formatExpressionInput(source).text
    expect(display.length).toBeGreaterThan(2000)
    const state = reduceSession(initialSession, { type: 'edit', source: display, start: display.length, end: display.length })
    expect(state.source).toBe(source)
    expect(state.inputError).toBeNull()
  })
})
