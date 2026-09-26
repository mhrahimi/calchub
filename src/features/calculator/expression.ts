import Decimal from 'decimal.js'
import { applyFn, FN_DISPLAY, formatResult, type AngleMode, type FnName } from './engine'

export const MAX_EXPRESSION_LENGTH = 2000
export type ExpressionIssue = { message: string; start: number; end: number }
export type ExpressionResult =
  | { status: 'empty' }
  | { status: 'complete'; value: string }
  | ({ status: 'incomplete' | 'error' } & ExpressionIssue)

type Token = { kind: 'number' | 'name' | 'symbol' | 'end'; text: string; start: number; end: number }
type Value = { number: Decimal; percent?: boolean }
class ExpressionError extends Error {
  constructor(readonly issue: ExpressionIssue, readonly incomplete = false) {
    super(issue.message)
  }
}

const FUNCTIONS = new Set(Object.keys(FN_DISPLAY))
const PRECEDENCE: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2, '^': 3 }

/** Preserve source positions: diagnostics refer to exactly what the user entered. */
function tokenize(source: string): Token[] {
  const tokens: Token[] = []
  const functionGroups: boolean[] = []
  let at = 0
  const fail = (message: string, end = at + 1, incomplete = false): never => {
    throw new ExpressionError({ message, start: at, end }, incomplete)
  }
  while (at < source.length) {
    if (/\s/.test(source[at])) { at++; continue }
    const start = at
    const rest = source.slice(at)
    if (/[\d.]/.test(rest[0])) {
      // Commas inside functions always separate arguments. Outside functions,
      // accept only unambiguous, complete groups of three digits.
      const grouped = !functionGroups.includes(true)
        ? rest.match(/^\d{1,3}(?:,\d{3})+(?:\.\d*)?(?:e[+-]?\d+)?/i)?.[0]
        : undefined
      const text = grouped ?? rest.match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/i)?.[0]
      if (!text) fail('Add a digit after the decimal point.', at + 1, at + 1 === source.length)
      at += text!.length
      if (source[at] === '.') fail('A number can contain only one decimal point.')
      if (/[eE]/.test(source[at] ?? '') && /^[eE][+-]?\s*$/.test(source.slice(at))) {
        fail('Finish the exponent, for example 1e-3.', source.length, true)
      }
      tokens.push({ kind: 'number', text: text!.replace(/,/g, ''), start, end: at })
      continue
    }
    const name = rest.match(/^(?:logₓ|[a-z]+|π|√|∛)/i)?.[0]
    if (name) {
      at += name.length
      const aliases: Record<string, string> = { 'π': 'pi', '√': 'sqrt', '∛': 'cbrt', 'logₓ': 'logx' }
      tokens.push({ kind: 'name', text: aliases[name.toLowerCase()] ?? name.toLowerCase(), start, end: at })
      continue
    }
    const aliases: Record<string, string> = { '−': '-', '×': '*', '÷': '/' }
    const symbol = aliases[source[at]] ?? source[at]
    if (!'+-*/^()!,%²'.includes(symbol)) fail(`“${source[at]}” is not supported in an expression.`)
    if (symbol === '(') functionGroups.push(tokens.at(-1)?.kind === 'name' && FUNCTIONS.has(tokens.at(-1)!.text))
    if (symbol === ')') functionGroups.pop()
    tokens.push({ kind: 'symbol', text: symbol, start, end: ++at })
  }
  tokens.push({ kind: 'end', text: '', start: source.length, end: source.length })
  return tokens
}

/** Shared by live preview, Enter, keypad input, clipboard input, and history replay. */
export function evaluateExpression(source: string, angleMode: AngleMode = 'deg'): ExpressionResult {
  if (!source.trim()) return { status: 'empty' }
  if (source.length > MAX_EXPRESSION_LENGTH) return { status: 'error', message: 'Keep the expression under 2,000 characters.', start: 2000, end: source.length }
  try {
    const tokens = tokenize(source)
    let at = 0
    let depth = 0
    const peek = () => tokens[at]
    const take = () => tokens[at++]
    const fail = (message: string, token = peek(), incomplete = token.kind === 'end'): never => {
      throw new ExpressionError({ message, start: token.start, end: token.end }, incomplete)
    }
    const finite = (number: Decimal, token: Token): Decimal => {
      if (!number.isFinite() || Math.abs(number.e) > 308) fail('This result is outside the supported number range.', token, false)
      return number
    }
    const closeGroup = () => {
      if (peek().text !== ')') fail(peek().kind === 'end' ? 'Missing closing parenthesis.' : 'Expected a closing parenthesis.')
      take()
    }

    const primary = (): Value => {
      const token = take()
      if (token.kind === 'end') fail('Add a number or function to finish the expression.', token)
      if (token.text === '+' || token.text === '-') {
        const value = parse(3)
        return { ...value, number: token.text === '-' ? value.number.negated() : value.number }
      }
      if (token.kind === 'number') return { number: finite(new Decimal(token.text), token) }
      if (token.text === '(') {
        if (peek().text === ')') fail('Add a value inside the parentheses.')
        const value = parse(0)
        closeGroup()
        return value
      }
      if (token.kind === 'name') {
        if (token.text === 'pi' || token.text === 'e') return { number: new Decimal(token.text === 'pi' ? Math.PI : Math.E) }
        if (!FUNCTIONS.has(token.text)) {
          if (peek().kind === 'end' && [...FUNCTIONS, 'pi'].some((name) => name.startsWith(token.text))) fail('Finish the function or constant name.', token, true)
          fail(`Unknown name “${source.slice(token.start, token.end)}”. Try a function such as sqrt or sin.`, token, false)
        }
        if (peek().text !== '(') fail(`Add “(” after ${token.text}.`, peek())
        take()
        const count = token.text === 'logx' ? 2 : 1
        const args: Decimal[] = []
        if (peek().text === ')') fail(`${token.text} needs ${count === 2 ? 'a base and a value' : 'a value'}.`)
        args.push(parse(0).number)
        while (peek().text === ',') {
          take()
          if (peek().text === ')') fail('Add a value after the comma.')
          args.push(parse(0).number)
        }
        closeGroup()
        if (args.length !== count) fail(`${token.text} needs ${count === 2 ? 'two arguments: base, value' : 'one argument'}.`, token, false)
        if (token.text === 'tan') {
          const radians = angleMode === 'deg' ? args[0].toNumber() * Math.PI / 180 : args[0].toNumber()
          if (Math.abs(Math.cos(radians)) < 1e-14) fail('Tangent is undefined at this angle.', token, false)
        }
        const result = applyFn(token.text as FnName, args, angleMode)
        if (result === null) {
          const messages: Partial<Record<FnName, string>> = {
            sqrt: 'Square root needs a value of zero or greater.',
            ln: 'Natural log needs a positive value.', log: 'Log needs a positive value.',
            logx: 'Use a positive base other than 1 and a positive value.',
            asin: 'Inverse sine needs a value between −1 and 1.', acos: 'Inverse cosine needs a value between −1 and 1.',
          }
          fail(messages[token.text as FnName] ?? `${token.text} is outside the supported number range.`, token, false)
        }
        return { number: finite(result!, token) }
      }
      if (token.text === ')') fail('Unexpected closing parenthesis.', token, false)
      if (token.text === ',') fail('Commas separate function arguments; use a point for decimals.', token, false)
      return fail('Expected a number or function here.', token, false)
    }

    const parse = (minimum: number): Value => {
      if (++depth > 100) fail('Use fewer nested operations.', peek(), false)
      let left = primary()
      while (true) {
        const token = peek()
        if (token.text === '%' || token.text === '!' || token.text === '²') {
          take()
          if (token.text === '%') left = { number: left.number.div(100), percent: true }
          else if (token.text === '²') left = { number: finite(left.number.pow(2), token) }
          else {
            if (!left.number.isInteger() || left.number.isNegative() || left.number.gt(170)) fail('Factorial needs a whole number from 0 to 170.', token, false)
            let result = new Decimal(1)
            for (let n = 2; n <= left.number.toNumber(); n++) result = result.times(n)
            left = { number: result }
          }
          continue
        }
        const implicit = token.text === '(' || token.kind === 'name'
        const operator = implicit ? '*' : token.text
        const precedence = PRECEDENCE[operator]
        if (precedence === undefined || precedence < minimum) break
        if (!implicit) take()
        const right = parse(operator === '^' ? precedence : precedence + 1)
        const rhs = right.percent && (operator === '+' || operator === '-') ? left.number.times(right.number) : right.number
        let result: Decimal
        switch (operator) {
          case '+': result = left.number.plus(rhs); break
          case '-': result = left.number.minus(rhs); break
          case '*': result = left.number.times(rhs); break
          case '/':
            if (rhs.isZero()) fail('Cannot divide by zero.', token, false)
            result = left.number.div(rhs); break
          default:
            if (rhs.abs().gt(10000)) fail('This exponent is too large.', token, false)
            result = left.number.pow(rhs)
        }
        left = { number: finite(result, token) }
      }
      depth--
      return left
    }

    const value = parse(0)
    if (peek().kind !== 'end') {
      if (peek().text === ')') fail('Unexpected closing parenthesis.', peek(), false)
      if (peek().text === ',') fail('Use groups of three digits for thousands, or a point for decimals. Commas also separate function arguments.', peek(), false)
      fail('Add an operator between these values.', peek(), false)
    }
    return { status: 'complete', value: formatResult(value.number) }
  } catch (error) {
    if (error instanceof ExpressionError) return { status: error.incomplete ? 'incomplete' : 'error', ...error.issue }
    return { status: 'error', message: 'This expression has no supported real-number result.', start: 0, end: source.length }
  }
}
