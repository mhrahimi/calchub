/** U+066C is a thousands separator, distinct from the argument comma U+002C. */
export const INPUT_GROUP_SEPARATOR = '\u066c'

export function stripInputGrouping(text: string): string {
  return text.replaceAll(INPUT_GROUP_SEPARATOR, '')
}

export type FormattedExpression = {
  text: string
  /** Boundary offsets in the raw expression mapped to the displayed field. */
  toDisplay: number[]
  /** Displayed boundary offsets mapped back to the raw expression. */
  toSource: number[]
}

/** Format only integer digits in numeric literals. Fraction and exponent digits,
 * identifiers, argument commas, and all other expression text stay untouched. */
export function formatExpressionInput(source: string): FormattedExpression {
  const separators = new Set<number>()
  // Match identifiers first so digits in an unknown name aren't formatted as a
  // separate numeric literal. Include incomplete exponents while the user types.
  const tokens = /[a-z][a-z0-9]*|(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d*)?/gi
  for (const match of source.matchAll(tokens)) {
    if (!/^\d/.test(match[0])) continue
    const integer = match[0].match(/^\d+/)![0]
    for (let offset = integer.length - 3; offset > 0; offset -= 3) separators.add(match.index + offset)
  }

  let text = ''
  const toDisplay: number[] = []
  const toSource = [0]
  for (let offset = 0; offset <= source.length; offset++) {
    if (separators.has(offset)) {
      text += INPUT_GROUP_SEPARATOR
      toSource.push(offset)
    }
    toDisplay.push(text.length)
    if (offset < source.length) {
      text += source[offset]
      toSource.push(offset + 1)
    }
  }
  return { text, toDisplay, toSource }
}

/** Decode native input edits (including cut, word deletion, and composition). */
export function readExpressionInput(text: string, start: number, end: number) {
  return {
    source: stripInputGrouping(text),
    start: stripInputGrouping(text.slice(0, start)).length,
    end: stripInputGrouping(text.slice(0, end)).length,
  }
}

/** Arrow movement treats inserted grouping marks as decoration, not extra stops. */
export function moveInputCaret(text: string, offset: number, direction: -1 | 1): number {
  let next = Math.max(0, Math.min(text.length, offset + direction))
  if (text[next] === INPUT_GROUP_SEPARATOR) next += direction
  return Math.max(0, Math.min(text.length, next))
}
