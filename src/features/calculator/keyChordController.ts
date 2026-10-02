import type { CalculatorAction } from './engine'
import { DEFAULT_SHORTCUTS, shortcutAction, typedKeyAction, type ShortcutConfig } from './shortcuts'

export type ChordResult = {
  actions: CalculatorAction[]
  /** When true, the page should preventDefault / stopPropagation. */
  handled: boolean
  /** Unbound key to insert as plain text after `actions`. */
  text?: string
}

type PendingDouble = {
  key: string
  at: number
  double: CalculatorAction
}

export type KeyChordController = {
  onKeyDown: (key: string, now: number, options?: { repeat?: boolean }) => ChordResult
  onKeyUp: (key: string, now: number) => ChordResult
  /** Flush expired double-tap singles. Call on an interval or before handling new input. */
  poll: (now: number) => ChordResult
  reset: () => void
  flush: () => ChordResult
  /** True when `key` is part of a user shortcut. */
  handles: (key: string) => boolean
}

function zeros(count: number): CalculatorAction[] {
  const n = Math.max(0, Math.min(9, Math.floor(count)))
  return Array.from({ length: n }, () => ({ type: 'digit' as const, digit: '0' }))
}

function empty(): ChordResult {
  return { actions: [], handled: false }
}

function emit(actions: CalculatorAction[]): ChordResult {
  return { actions, handled: true }
}

const comboKey = (hold: string, key: string) => `${hold}\u0000${key}`

export function createKeyChordController(
  config: ShortcutConfig = DEFAULT_SHORTCUTS,
): KeyChordController {
  const pressMap = new Map<string, CalculatorAction>()
  const doubleMap = new Map<string, CalculatorAction>()
  const comboMap = new Map<string, CalculatorAction>()
  const holdKeys = new Set<string>()
  const comboPartners = new Set<string>()
  if (config.holdDigitZeros !== null) holdKeys.add(config.holdDigitZeros)
  for (const { trigger, action } of config.shortcuts) {
    if (trigger.kind === 'press') pressMap.set(trigger.key, shortcutAction(action))
    else if (trigger.kind === 'double') doubleMap.set(trigger.key, shortcutAction(action))
    else {
      holdKeys.add(trigger.hold)
      comboPartners.add(trigger.key)
      comboMap.set(comboKey(trigger.hold, trigger.key), shortcutAction(action))
    }
  }

  let activeHold: string | null = null
  let holdChordUsed = false
  let pendingDouble: PendingDouble | null = null

  const normalAction = (key: string): CalculatorAction[] => {
    const action = typedKeyAction(key)
    return action ? [action] : []
  }

  const flushPending = (now: number, force = false): CalculatorAction[] => {
    if (!pendingDouble) return []
    if (!force && now - pendingDouble.at < config.doubleTapMs) return []
    const key = pendingDouble.key
    pendingDouble = null
    return normalAction(key)
  }

  const releaseHold = (): CalculatorAction[] => {
    const released = activeHold !== null && !holdChordUsed ? normalAction(activeHold) : []
    activeHold = null
    holdChordUsed = false
    return released
  }

  const onKeyDown = (
    key: string,
    now: number,
    options?: { repeat?: boolean },
  ): ChordResult => {
    const repeat = options?.repeat ?? false
    let prefix: CalculatorAction[] = flushPending(now, false)
    // If still pending and this isn't the double-tap key, force-flush before continuing
    if (pendingDouble && key !== pendingDouble.key) {
      prefix = [...prefix, ...flushPending(now, true)]
    }

    // While a hold key is down, apply its chords
    if (activeHold !== null) {
      if (repeat) return emit(prefix)
      if (activeHold === config.holdDigitZeros && /^[1-9]$/.test(key)) {
        holdChordUsed = true
        return emit([...prefix, ...zeros(Number(key))])
      }
      const combo = comboMap.get(comboKey(activeHold, key))
      if (combo) {
        holdChordUsed = true
        return emit([...prefix, combo])
      }
      prefix.push(...releaseHold())
    }

    // Hold key keydown: defer its own action until keyup / chord
    if (holdKeys.has(key)) {
      if (repeat) return emit(prefix)
      activeHold = key
      holdChordUsed = false
      return emit(prefix)
    }

    const double = doubleMap.get(key)
    if (double) {
      if (repeat) return emit(prefix)
      if (pendingDouble && pendingDouble.key === key) {
        pendingDouble = null
        return emit([...prefix, double])
      }
      pendingDouble = { key, at: now, double }
      return emit(prefix) // wait for second tap or timeout
    }

    const action = pressMap.get(key) ?? typedKeyAction(key)
    if (action) return emit([...prefix, action])
    return { actions: prefix, handled: prefix.length > 0, text: key }
  }

  const onKeyUp = (key: string, now: number): ChordResult => {
    const prefix = flushPending(now, false)
    if (key === activeHold) {
      const released = releaseHold()
      return emit([...prefix, ...released])
    }
    return prefix.length ? emit(prefix) : empty()
  }

  const poll = (now: number): ChordResult => {
    const actions = flushPending(now, false)
    return actions.length ? emit(actions) : empty()
  }

  const reset = () => {
    activeHold = null
    holdChordUsed = false
    pendingDouble = null
  }

  const flush = (): ChordResult => {
    const actions = [...flushPending(0, true), ...releaseHold()]
    reset()
    return actions.length ? emit(actions) : empty()
  }

  const handles = (key: string) =>
    pressMap.has(key) || doubleMap.has(key) || holdKeys.has(key) || comboPartners.has(key)

  return { onKeyDown, onKeyUp, poll, reset, flush, handles }
}
