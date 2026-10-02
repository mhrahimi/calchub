import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SHORTCUTS,
  parseShortcutsJson,
  serializeShortcuts,
  shortcutHelpRows,
  validateShortcuts,
  type Shortcut,
  type ShortcutConfig,
} from './shortcuts'

function config(shortcuts: Shortcut[], extra: Partial<ShortcutConfig> = {}): ShortcutConfig {
  return { ...DEFAULT_SHORTCUTS, ...extra, shortcuts }
}

const errors = (value: ShortcutConfig) => validateShortcuts(value).filter((issue) => issue.severity === 'error')

describe('validateShortcuts', () => {
  it('accepts the defaults', () => {
    expect(validateShortcuts(DEFAULT_SHORTCUTS)).toEqual([])
  })

  it('flags duplicate triggers on the later row', () => {
    const issues = errors(config([
      { id: 'a', trigger: { kind: 'double', key: '+' }, action: 'power' },
      { id: 'b', trigger: { kind: 'double', key: '+' }, action: 'sqrt' },
    ]))
    expect(issues).toEqual([expect.objectContaining({ index: 1, message: 'Same keys as shortcut 1.' })])
  })

  it('rejects conflicting uses of the same key', () => {
    expect(errors(config([{ id: 'a', trigger: { kind: 'hold', hold: '/', key: '/' }, action: 'sqrt' }]))).toHaveLength(1)
    expect(errors(config([{ id: 'a', trigger: { kind: 'press', key: '0' }, action: 'sqrt' }]))[0].message).toMatch(/hold key/)
    expect(errors(config([
      { id: 'a', trigger: { kind: 'press', key: '+' }, action: 'sqrt' },
      { id: 'b', trigger: { kind: 'double', key: '+' }, action: 'power' },
    ]))).toHaveLength(1)
    expect(errors(config([{ id: 'a', trigger: { kind: 'hold', hold: '0', key: '5' }, action: 'sqrt' }]))[0].message).toMatch(/zeros/)
  })

  it('only allows calculator keys to be held or double-tapped', () => {
    expect(errors(config([{ id: 'a', trigger: { kind: 'hold', hold: 'q', key: '1' }, action: 'sqrt' }]))).toHaveLength(1)
    expect(errors(config([{ id: 'a', trigger: { kind: 'double', key: 'q' }, action: 'sqrt' }]))).toHaveLength(1)
    expect(errors(config([], { holdDigitZeros: 'q' }))).toHaveLength(1)
  })

  it('warns when a letter shortcut will interfere with typing words', () => {
    const issues = validateShortcuts(config([{ id: 'a', trigger: { kind: 'press', key: 's' }, action: 'sqrt' }]))
    expect(issues).toEqual([expect.objectContaining({ index: 0, severity: 'warning' })])
  })
})

describe('shortcut files', () => {
  it('round-trips through export and import', () => {
    const custom = config([
      ...DEFAULT_SHORTCUTS.shortcuts,
      { id: 'x', trigger: { kind: 'press', key: 'r' }, action: 'sqrt' },
    ], { doubleTapMs: 500, holdDigitZeros: null })
    expect(parseShortcutsJson(serializeShortcuts(custom))).toEqual({ config: custom, skippedCount: 0 })
  })

  it('drops malformed rows, clamps timing, and counts what was skipped', () => {
    const { config: parsed, skippedCount } = parseShortcutsJson(JSON.stringify({
      doubleTapMs: 5,
      shortcuts: [
        { trigger: { kind: 'double', key: '+' }, action: 'power' },
        { trigger: { kind: 'double', key: '+' }, action: 'launchRockets' },
        { trigger: { kind: 'hold', hold: '0' }, action: 'sqrt' },
        'nope',
      ],
    }))
    expect(skippedCount).toBe(3)
    expect(parsed.doubleTapMs).toBe(150)
    expect(parsed.holdDigitZeros).toBe('0')
    expect(parsed.shortcuts).toEqual([expect.objectContaining({ trigger: { kind: 'double', key: '+' }, action: 'power' })])
  })

  it('rejects files that are not shortcut files', () => {
    expect(() => parseShortcutsJson('not json')).toThrow()
    expect(() => parseShortcutsJson(JSON.stringify({ kind: 'calchub-backup', shortcuts: [] }))).toThrow()
    expect(() => parseShortcutsJson(JSON.stringify({ history: [] }))).toThrow()
  })
})

describe('shortcutHelpRows', () => {
  it('describes the defaults the way the help popover always has', () => {
    expect(shortcutHelpRows(DEFAULT_SHORTCUTS)).toEqual([
      { keys: 'Hold 0 + 1–9', meaning: 'Insert that many zeros' },
      { keys: 'Hold 0 + /', meaning: 'Open parenthesis (' },
      { keys: 'Hold 0 + *', meaning: 'Close parenthesis )' },
      { keys: '** (double *)', meaning: 'Power ^' },
    ])
  })
})
