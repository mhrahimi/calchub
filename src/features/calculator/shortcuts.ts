import { getItem, setItem } from '@/persistence/storage'
import { actionFromKey, type CalculatorAction } from './engine'

export type ShortcutTrigger =
  | { kind: 'press'; key: string }
  | { kind: 'double'; key: string }
  | { kind: 'hold'; hold: string; key: string }

export type ShortcutTriggerKind = ShortcutTrigger['kind']

type ActionDef = { label: string; action: CalculatorAction }

export const SHORTCUT_ACTIONS = {
  add: { label: 'Add +', action: { type: 'operator', operator: '+' } },
  subtract: { label: 'Subtract −', action: { type: 'operator', operator: '-' } },
  multiply: { label: 'Multiply ×', action: { type: 'operator', operator: '×' } },
  divide: { label: 'Divide ÷', action: { type: 'operator', operator: '÷' } },
  power: { label: 'Power ^', action: { type: 'operator', operator: '^' } },
  openParen: { label: 'Open parenthesis (', action: { type: 'paren', which: '(' } },
  closeParen: { label: 'Close parenthesis )', action: { type: 'paren', which: ')' } },
  decimal: { label: 'Decimal point .', action: { type: 'decimal' } },
  comma: { label: 'Argument separator ,', action: { type: 'comma' } },
  percent: { label: 'Percent %', action: { type: 'percent' } },
  sign: { label: 'Change sign ±', action: { type: 'sign' } },
  equals: { label: 'Equals =', action: { type: 'equals' } },
  backspace: { label: 'Delete last character', action: { type: 'backspace' } },
  allClear: { label: 'All clear', action: { type: 'allClear' } },
  pi: { label: 'Pi π', action: { type: 'constant', name: 'π' } },
  euler: { label: 'Euler number e', action: { type: 'constant', name: 'e' } },
  square: { label: 'Square x²', action: { type: 'postfix', name: '²' } },
  reciprocal: { label: 'Reciprocal 1/x', action: { type: 'postfix', name: 'reciprocal' } },
  factorial: { label: 'Factorial x!', action: { type: 'postfix', name: '!' } },
  abs: { label: 'Absolute value |x|', action: { type: 'postfix', name: 'abs' } },
  sqrt: { label: 'Square root √', action: { type: 'fn', name: 'sqrt' } },
  cbrt: { label: 'Cube root ∛', action: { type: 'fn', name: 'cbrt' } },
  ln: { label: 'Natural log ln', action: { type: 'fn', name: 'ln' } },
  log: { label: 'Log base 10', action: { type: 'fn', name: 'log' } },
  logx: { label: 'Log base x', action: { type: 'fn', name: 'logx' } },
  exp: { label: 'e to the x', action: { type: 'fn', name: 'exp' } },
  tenexp: { label: '10 to the x', action: { type: 'fn', name: 'tenexp' } },
  sin: { label: 'Sine', action: { type: 'fn', name: 'sin' } },
  cos: { label: 'Cosine', action: { type: 'fn', name: 'cos' } },
  tan: { label: 'Tangent', action: { type: 'fn', name: 'tan' } },
  asin: { label: 'Inverse sine', action: { type: 'fn', name: 'asin' } },
  acos: { label: 'Inverse cosine', action: { type: 'fn', name: 'acos' } },
  atan: { label: 'Inverse tangent', action: { type: 'fn', name: 'atan' } },
  sinh: { label: 'Hyperbolic sine', action: { type: 'fn', name: 'sinh' } },
  cosh: { label: 'Hyperbolic cosine', action: { type: 'fn', name: 'cosh' } },
  tanh: { label: 'Hyperbolic tangent', action: { type: 'fn', name: 'tanh' } },
} satisfies Record<string, ActionDef>

export type ShortcutActionId = keyof typeof SHORTCUT_ACTIONS

export const SHORTCUT_ACTION_IDS = Object.keys(SHORTCUT_ACTIONS) as ShortcutActionId[]

export type Shortcut = { id: string; trigger: ShortcutTrigger; action: ShortcutActionId }

export type ShortcutConfig = {
  version: 1
  doubleTapMs: number
  /** Holding this key and pressing 1–9 inserts that many zeros; null turns it off. */
  holdDigitZeros: string | null
  shortcuts: Shortcut[]
}

export const MIN_DOUBLE_TAP_MS = 150
export const MAX_DOUBLE_TAP_MS = 1000

export const DEFAULT_SHORTCUTS: ShortcutConfig = {
  version: 1,
  doubleTapMs: 350,
  holdDigitZeros: '0',
  shortcuts: [
    { id: 'default-open-paren', trigger: { kind: 'hold', hold: '0', key: '/' }, action: 'openParen' },
    { id: 'default-close-paren', trigger: { kind: 'hold', hold: '0', key: '*' }, action: 'closeParen' },
    { id: 'default-power', trigger: { kind: 'double', key: '*' }, action: 'power' },
  ],
}

const STORAGE_KEY = 'calculator-shortcuts'
const CHANGE_EVENT = 'calchub:shortcuts-changed'
const FILE_KIND = 'calchub-calculator-shortcuts'

let idCounter = 0
export function newShortcutId(): string {
  idCounter += 1
  return `s-${Date.now().toString(36)}-${idCounter}`
}

export function shortcutAction(id: ShortcutActionId): CalculatorAction {
  return SHORTCUT_ACTIONS[id].action
}

/** Single keys typed as calculator actions; anything else is inserted as text. */
export const TYPED_KEY = /^[0-9.+\-*/^(),%!]$/

export function typedKeyAction(key: string): CalculatorAction | null {
  return TYPED_KEY.test(key) ? actionFromKey(key) : null
}

/** Keys whose normal behavior the controller can reproduce after a hold or double-tap is abandoned. */
export function isCalculatorKey(key: string): boolean {
  return typedKeyAction(key) !== null
}

function isTriggerKey(key: unknown): key is string {
  return typeof key === 'string' && [...key].length === 1 && key !== ' ' && key !== '='
}

function isActionId(value: unknown): value is ShortcutActionId {
  return typeof value === 'string' && Object.hasOwn(SHORTCUT_ACTIONS, value)
}

export function clampDoubleTap(ms: unknown): number {
  if (typeof ms !== 'number' || !Number.isFinite(ms) || ms === 0) return DEFAULT_SHORTCUTS.doubleTapMs
  return Math.round(Math.min(MAX_DOUBLE_TAP_MS, Math.max(MIN_DOUBLE_TAP_MS, ms)))
}

function sanitizeTrigger(raw: unknown): ShortcutTrigger | null {
  if (!raw || typeof raw !== 'object') return null
  const value = raw as Record<string, unknown>
  if ((value.kind === 'press' || value.kind === 'double') && isTriggerKey(value.key)) return { kind: value.kind, key: value.key }
  if (value.kind === 'hold' && isTriggerKey(value.hold) && isTriggerKey(value.key)) return { kind: 'hold', hold: value.hold, key: value.key }
  return null
}

function sanitizeConfig(raw: unknown): { config: ShortcutConfig; skippedCount: number } {
  if (!raw || typeof raw !== 'object' || !Array.isArray((raw as { shortcuts?: unknown }).shortcuts)) {
    throw new Error('Not a shortcuts file')
  }
  const value = raw as Record<string, unknown>
  const rows = value.shortcuts as unknown[]
  const shortcuts: Shortcut[] = []
  for (const row of rows) {
    const item = row && typeof row === 'object' ? (row as Record<string, unknown>) : {}
    const trigger = sanitizeTrigger(item.trigger)
    if (!trigger || !isActionId(item.action)) continue
    shortcuts.push({ id: typeof item.id === 'string' && item.id ? item.id : newShortcutId(), trigger, action: item.action })
  }
  const zeros = value.holdDigitZeros === null ? null
    : isTriggerKey(value.holdDigitZeros) ? value.holdDigitZeros : DEFAULT_SHORTCUTS.holdDigitZeros
  return {
    config: { version: 1, doubleTapMs: clampDoubleTap(value.doubleTapMs), holdDigitZeros: zeros, shortcuts },
    skippedCount: rows.length - shortcuts.length,
  }
}

export function loadShortcuts(): ShortcutConfig {
  const stored = getItem<unknown>(STORAGE_KEY, null)
  if (stored === null) return DEFAULT_SHORTCUTS
  try {
    const { config } = sanitizeConfig(stored)
    return validateShortcuts(config).some((issue) => issue.severity === 'error') ? DEFAULT_SHORTCUTS : config
  } catch {
    return DEFAULT_SHORTCUTS
  }
}

export function saveShortcuts(config: ShortcutConfig): void {
  setItem(STORAGE_KEY, config)
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(CHANGE_EVENT))
}

/** Calls `listener` when shortcuts change in this tab or another one. */
export function subscribeShortcuts(listener: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key.endsWith(STORAGE_KEY)) listener()
  }
  window.addEventListener(CHANGE_EVENT, listener)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener)
    window.removeEventListener('storage', onStorage)
  }
}

export function serializeShortcuts(config: ShortcutConfig): string {
  return JSON.stringify({ kind: FILE_KIND, ...config }, null, 2)
}

export function parseShortcutsJson(text: string): { config: ShortcutConfig; skippedCount: number } {
  const raw: unknown = JSON.parse(text)
  if (raw && typeof raw === 'object' && 'kind' in raw && (raw as { kind: unknown }).kind !== FILE_KIND) {
    throw new Error('Not a shortcuts file')
  }
  return sanitizeConfig(raw)
}

export type ShortcutIssue = {
  /** Row index in `shortcuts`, or null for config-wide settings. */
  index: number | null
  severity: 'error' | 'warning'
  message: string
}

function triggerSignature(trigger: ShortcutTrigger): string {
  return trigger.kind === 'hold' ? `hold:${trigger.hold}:${trigger.key}` : `${trigger.kind}:${trigger.key}`
}

export function validateShortcuts(config: ShortcutConfig): ShortcutIssue[] {
  const issues: ShortcutIssue[] = []
  const error = (index: number | null, message: string) => issues.push({ index, severity: 'error', message })
  const holdKeys = new Set(config.shortcuts.flatMap((s) => (s.trigger.kind === 'hold' ? [s.trigger.hold] : [])))
  if (config.holdDigitZeros !== null) {
    if (!isCalculatorKey(config.holdDigitZeros)) error(null, `“${config.holdDigitZeros}” can’t be held for zeros. Use a number or a symbol the calculator uses.`)
    holdKeys.add(config.holdDigitZeros)
  }
  const pressKeys = new Set(config.shortcuts.flatMap((s) => (s.trigger.kind === 'press' ? [s.trigger.key] : [])))
  const doubleKeys = new Set(config.shortcuts.flatMap((s) => (s.trigger.kind === 'double' ? [s.trigger.key] : [])))
  const seen = new Map<string, number>()

  config.shortcuts.forEach((shortcut, index) => {
    const { trigger } = shortcut
    const keys = trigger.kind === 'hold' ? [trigger.hold, trigger.key] : [trigger.key]
    if (keys.some((key) => !isTriggerKey(key))) { error(index, 'Choose a key.'); return }

    const signature = triggerSignature(trigger)
    const first = seen.get(signature)
    if (first !== undefined) error(index, `Same keys as shortcut ${first + 1}.`)
    else seen.set(signature, index)

    if (trigger.kind === 'hold') {
      if (trigger.hold === trigger.key) error(index, 'Use two different keys.')
      else if (!isCalculatorKey(trigger.hold)) error(index, `“${trigger.hold}” can’t be held. Use a number or a symbol the calculator uses.`)
      else if (pressKeys.has(trigger.hold) || doubleKeys.has(trigger.hold)) error(index, `“${trigger.hold}” is also used by a press or double-tap shortcut.`)
      if (trigger.hold === config.holdDigitZeros && /^[1-9]$/.test(trigger.key)) error(index, `Hold ${trigger.hold} + 1–9 already inserts zeros.`)
    } else if (trigger.kind === 'double') {
      if (!isCalculatorKey(trigger.key)) error(index, `“${trigger.key}” can’t be double-tapped. Use a number or a symbol the calculator uses.`)
      else if (pressKeys.has(trigger.key)) error(index, `“${trigger.key}” also has a press shortcut.`)
      else if (holdKeys.has(trigger.key)) error(index, `“${trigger.key}” is also used as a hold key.`)
    } else if (holdKeys.has(trigger.key)) {
      error(index, `“${trigger.key}” is also used as a hold key.`)
    }

    if (trigger.kind !== 'hold' && /^[a-z]$/i.test(trigger.key)) {
      issues.push({ index, severity: 'warning', message: `Typing names like sqrt or sin will no longer insert “${trigger.key}”.` })
    }
    if (trigger.kind === 'double' && /^[0-9]$/.test(trigger.key)) {
      issues.push({ index, severity: 'warning', message: `Typing ${trigger.key}${trigger.key} quickly will trigger this instead of two digits.` })
    }
  })
  return issues
}

export function describeTrigger(trigger: ShortcutTrigger): string {
  if (trigger.kind === 'hold') return `Hold ${trigger.hold} + ${trigger.key}`
  if (trigger.kind === 'double') return `${trigger.key}${trigger.key} (double ${trigger.key})`
  return trigger.key
}

export function shortcutHelpRows(config: ShortcutConfig): Array<{ keys: string; meaning: string }> {
  const rows = config.holdDigitZeros === null ? [] : [{ keys: `Hold ${config.holdDigitZeros} + 1–9`, meaning: 'Insert that many zeros' }]
  return [...rows, ...config.shortcuts.map((s) => ({ keys: describeTrigger(s.trigger), meaning: SHORTCUT_ACTIONS[s.action].label }))]
}
