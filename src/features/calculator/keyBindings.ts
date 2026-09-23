import type { CalculatorAction } from './engine'

export type HelpRow = { keys: string; meaning: string }

export type DoubleTapBinding = {
  withinMs: number
  single: CalculatorAction
  double: CalculatorAction
}

/**
 * Declarative calculator keyboard chords / shortcuts.
 * Edit this object to change hold-combos, double-taps, or the (i) help list.
 */
export const keyBindings = {
  /** Modifier held to trigger holdCombos / hold-digit zeros. */
  holdKey: '0',

  /** Hold holdKey + digit 1–9 → insert that many zeros. */
  holdDigitZeros: true as boolean,

  /** Hold holdKey + key → action (takes priority over normal / double-tap maps). */
  holdCombos: {
    '/': { type: 'paren', which: '(' },
    '*': { type: 'paren', which: ')' },
  } as Record<string, CalculatorAction>,

  /** Double-tap within `withinMs` → `double`; otherwise `single` after the window. */
  doubleTap: {
    '*': {
      withinMs: 350,
      single: { type: 'operator', operator: '×' },
      double: { type: 'operator', operator: '^' },
    },
  } as Record<string, DoubleTapBinding>,

  /** Shown in the (i) popover — keep aligned with the bindings above. */
  help: [
    { keys: 'Hold 0 + 1–9', meaning: 'Insert that many zeros' },
    { keys: 'Hold 0 + /', meaning: '(' },
    { keys: 'Hold 0 + *', meaning: ')' },
    { keys: '** (double *)', meaning: 'Power ^' },
    { keys: 'p', meaning: 'π' },
    { keys: '⌘/Ctrl+C', meaning: 'Copy result' },
    { keys: '⌘/Ctrl+V', meaning: 'Paste number or expression' },
    { keys: 'Delete', meaning: 'Clear entry / all clear' },
    { keys: 'Escape', meaning: 'All clear' },
    { keys: 'Backspace', meaning: 'Delete last digit' },
  ] as HelpRow[],
}

export type KeyBindingsConfig = typeof keyBindings
