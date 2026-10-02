export type HelpRow = { keys: string; meaning: string }

/**
 * Fixed rows of the (i) keyboard shortcuts popover. User-editable chords and
 * double-taps live in `shortcuts.ts` and are listed after these.
 */
export const staticHelpRows: HelpRow[] = [
  { keys: 'Enter / =', meaning: 'Calculate and save' },
  { keys: '↑ / ↓', meaning: 'Recall history / restore draft' },
  { keys: '⌘/Ctrl+Z', meaning: 'Undo' },
  { keys: '⌘/Ctrl+Shift+Z', meaning: 'Redo (also Ctrl+Y)' },
  { keys: 'Backspace / Delete', meaning: 'Delete before / after cursor' },
  { keys: 'Escape', meaning: 'Clear calculation / close help' },
  { keys: 'Tab, then arrows', meaning: 'Navigate keypad' },
  { keys: '⌘/Ctrl+C', meaning: 'Copy selection or focused result' },
  { keys: '⌘/Ctrl+V', meaning: 'Paste editable expression' },
  { keys: 'pi, sqrt, sin…', meaning: 'Type constants and functions' },
]
