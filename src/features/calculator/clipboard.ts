import type { AngleMode, CalculatorState } from './engine'
import { tryEvaluateExpression } from './engine'

/** Plain result text for Cmd/Ctrl+C (no thousand separators). */
export function getCopyText(state: CalculatorState): string | null {
  if (state.error) return null
  const value = state.entry.trim()
  if (!value || value === 'Error') return null
  return value
}

/**
 * Normalize clipboard text into a calculator-friendly number or expression.
 * Strips grouping commas/spaces and maps common operator glyphs.
 */
export function normalizePastedText(raw: string): string {
  let s = raw.trim()
  if (!s) return ''

  s = s
    .replace(/\u2212/g, '-') // −
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/\s+/g, '')

  // Drop thousand-grouping commas (calculator decimal is always `.`)
  s = s.replace(/,/g, '')

  return s
}

const NUMBER_RE = /^-?\d+(?:\.\d*)?(?:e[+-]?\d+)?$/i

export type PastePayload =
  | { kind: 'number'; value: string }
  | { kind: 'result'; value: string; expression: string }

/** Parse clipboard text into a loadable number or evaluated expression result. */
export function parsePastedText(
  raw: string,
  angleMode: AngleMode = 'deg',
): PastePayload | null {
  const normalized = normalizePastedText(raw)
  if (!normalized) return null

  if (NUMBER_RE.test(normalized)) {
    if (!Number.isFinite(Number(normalized))) return null
    return { kind: 'number', value: normalized }
  }

  const result = tryEvaluateExpression(normalized, angleMode)
  if (result == null) return null
  return { kind: 'result', value: result, expression: normalized }
}
