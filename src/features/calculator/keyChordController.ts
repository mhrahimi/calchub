import { actionFromKey, type CalculatorAction } from './engine'
import { keyBindings, type KeyBindingsConfig } from './keyBindings'

export type ChordResult = {
  actions: CalculatorAction[]
  /** When true, the page should preventDefault / stopPropagation. */
  handled: boolean
}

type PendingDouble = {
  key: string
  at: number
  binding: KeyBindingsConfig['doubleTap'][string]
}

export type KeyChordController = {
  onKeyDown: (key: string, now: number, options?: { repeat?: boolean }) => ChordResult
  onKeyUp: (key: string, now: number) => ChordResult
  /** Flush expired double-tap singles. Call on an interval or before handling new input. */
  poll: (now: number) => ChordResult
  reset: () => void
  flush: () => ChordResult
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

export function createKeyChordController(
  config: KeyBindingsConfig = keyBindings,
): KeyChordController {
  let holdActive = false
  let holdChordUsed = false
  let pendingDouble: PendingDouble | null = null

  const flushPending = (now: number, force = false): CalculatorAction[] => {
    if (!pendingDouble) return []
    if (!force && now - pendingDouble.at < pendingDouble.binding.withinMs) return []
    const action = pendingDouble.binding.single
    pendingDouble = null
    return [action]
  }

  const onKeyDown = (
    key: string,
    now: number,
    options?: { repeat?: boolean },
  ): ChordResult => {
    const repeat = options?.repeat ?? false
    const flushed = flushPending(now, false)
    // If still pending and this isn't the double-tap key, force-flush before continuing
    let prefix: CalculatorAction[] = flushed
    if (pendingDouble && key !== pendingDouble.key) {
      prefix = flushPending(now, true)
    }

    // Hold modifier keydown: defer digit until keyup / chord
    if (key === config.holdKey) {
      if (repeat) return emit(prefix)
      holdActive = true
      holdChordUsed = false
      return emit(prefix)
    }

    // While hold key is down, apply chords
    if (holdActive) {
      if (repeat) return emit(prefix)

      if (config.holdDigitZeros && /^[1-9]$/.test(key)) {
        holdChordUsed = true
        return emit([...prefix, ...zeros(Number(key))])
      }

      const combo = config.holdCombos[key]
      if (combo) {
        holdChordUsed = true
        return emit([...prefix, combo])
      }
      if (!holdChordUsed) prefix.push({ type: 'digit', digit: '0' })
      holdActive = false
    }

    // Double-tap candidates
    const doubleBinding = config.doubleTap[key]
    if (doubleBinding) {
      if (repeat) return emit(prefix)
      if (pendingDouble && pendingDouble.key === key) {
        pendingDouble = null
        return emit([...prefix, doubleBinding.double])
      }
      pendingDouble = { key, at: now, binding: doubleBinding }
      return emit(prefix) // wait for second tap or timeout
    }

    const action = actionFromKey(key)
    if (!action) {
      if (prefix.length) return emit(prefix)
      return empty()
    }
    return emit([...prefix, action])
  }

  const onKeyUp = (key: string, now: number): ChordResult => {
    const prefix = flushPending(now, false)

    if (key === config.holdKey) {
      const wasActive = holdActive
      const used = holdChordUsed
      holdActive = false
      holdChordUsed = false
      if (wasActive && !used) {
        return emit([...prefix, { type: 'digit', digit: '0' }])
      }
      return prefix.length ? emit(prefix) : empty()
    }

    return prefix.length ? emit(prefix) : empty()
  }

  const poll = (now: number): ChordResult => {
    const actions = flushPending(now, false)
    return actions.length ? emit(actions) : empty()
  }

  const reset = () => {
    holdActive = false
    holdChordUsed = false
    pendingDouble = null
  }

  const flush = (): ChordResult => {
    const actions = flushPending(0, true)
    if (holdActive && !holdChordUsed) actions.push({ type: 'digit', digit: '0' })
    reset()
    return actions.length ? emit(actions) : empty()
  }

  return { onKeyDown, onKeyUp, poll, reset, flush }
}
