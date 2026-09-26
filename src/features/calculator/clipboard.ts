import type { AngleMode, CalculatorState } from './engine'
import { evaluateExpression } from './expression'

export function getCopyText(state: CalculatorState): string | null {
  return state.error || state.entry === 'Error' ? null : state.entry.trim() || null
}

/** Preserve the formula and its argument separators. The expression parser handles
 * operator glyphs and unambiguous thousands grouping for every input method. */
export function normalizePastedText(raw: string): string {
  return raw.trim()
}

export type PastePayload =
  | { kind: 'number'; value: string }
  | { kind: 'result'; value: string; expression: string }

/** Used when a caller needs a value; the expression field itself pastes editable text. */
export function parsePastedText(raw: string, angleMode: AngleMode = 'deg'): PastePayload | null {
  const expression = normalizePastedText(raw)
  const result = evaluateExpression(expression, angleMode)
  if (result.status !== 'complete') return null
  if (/^-?(?:\d[\d,]*(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(expression)) {
    return { kind: 'number', value: expression.replace(/,/g, '') }
  }
  return { kind: 'result', value: result.value, expression }
}
