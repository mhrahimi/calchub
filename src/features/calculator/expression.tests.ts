import { describe, expect, it } from 'vitest'
import { evaluateExpression } from './expression'

describe('shared expression evaluation', () => {
  it.each([
    ['0.1+0.2', '0.3'], ['2+3*4', '14'], ['(2+3)*4', '20'], ['2^3^2', '512'],
    ['-2^2', '-4'], ['(-2)^2', '4'], ['2^-3', '0.125'], ['-(2+3)', '-5'], ['2--3', '5'],
    ['200+10%', '220'], ['200-10%', '180'], ['50*10%', '5'], ['200+10%+10%', '242'], ['10%', '0.1'],
    ['logx(2,8)', '3'], ['logₓ(2, 8)', '3'], ['log(100)', '2'], ['ln(e)', '1'], ['sqrt(81)', '9'], ['√(81)', '9'],
    ['cbrt(-8)', '-2'], ['abs(-5)', '5'], ['exp(0)', '1'], ['10^(3)', '1000'], ['tenexp(3)', '1000'],
    ['2(3+4)', '14'], ['(2)(3)', '6'], ['2sqrt(9)', '6'], ['5!', '120'], ['2^3!', '64'], ['3²', '9'],
    ['1e-7+2e-7', '0.0000003'], ['1E3/4', '250'], ['1,234.5 + 2,000', '3234.5'], ['12,345,678', '12345678'],
    ['2 × 3 ÷ 4 − 1', '0.5'], ['2+(-3)', '-1'], ['sin(30)', '0.5'], ['sinh(0)', '0'], ['cosh(0)', '1'], ['tanh(0)', '0'],
  ])('evaluates %s', (source, value) => expect(evaluateExpression(source)).toEqual({ status: 'complete', value }))

  it.each([['asin', 30], ['acos', 60], ['atan', 45]] as const)('uses the saved angle setting for %s', (name, degrees) => {
    const input = `${name}(${name === 'atan' ? 1 : 0.5})`
    expect(evaluateExpression(input, 'deg')).toEqual({ status: 'complete', value: String(degrees) })
    const rad = evaluateExpression(input, 'rad')
    expect(rad.status).toBe('complete')
    if (rad.status === 'complete') expect(Number(rad.value)).toBeCloseTo(degrees * Math.PI / 180, 10)
  })

  it('accepts pi and π and implicit multiplication with constants', () => {
    for (const source of ['sin(pi/6)', 'sin(π/6)', 'sin(PI/6)']) expect(evaluateExpression(source, 'rad')).toEqual({ status: 'complete', value: '0.5' })
    const result = evaluateExpression('2pi')
    expect(result).toEqual({ status: 'complete', value: '6.28318530718' })
  })

  it.each(['2+', '2+(', 's', 'sq', 'p', 'sqrt', 'sqrt(', '2+(3', '1e', '1e-', '.', 'logx(2,'])('treats %s as unfinished', (source) => {
    expect(evaluateExpression(source).status).toBe('incomplete')
  })

  it.each([
    ['2+3)', 'Unexpected closing'], ['sqrt()', 'needs a value'], ['sin(1,2)', 'one argument'], ['logx(2)', 'two arguments'],
    ['logx(2,8,4)', 'two arguments'], ['1.2.3', 'one decimal'], ['1/0', 'divide by zero'], ['sqrt(-1)', 'zero or greater'],
    ['asin(2)', 'between'], ['logx(1,8)', 'positive base'], ['tan(90)', 'undefined'], ['171!', '0 to 170'],
    ['hello', 'Unknown name'], ['(1,2)', 'closing parenthesis'], ['1,23', 'groups of three'], ['1 2', 'operator'],
    ['2**3', 'Expected a number'], ['1e999999', 'number range'], ['2^999999999', 'exponent is too large'],
  ])('reports a specific error for %s', (source, message) => {
    const result = evaluateExpression(source)
    expect(result.status).toBe('error')
    if (result.status === 'error') expect(result.message).toContain(message)
  })

  it('never removes argument separators, even when they resemble grouping commas', () => {
    const result = evaluateExpression('logx(2,800)')
    expect(result.status).toBe('complete')
    if (result.status === 'complete') expect(Number(result.value)).toBeCloseTo(Math.log2(800), 8)
    expect(evaluateExpression('sqrt(1,234)').status).toBe('error')
  })

  it('preserves original source positions through spaces and Unicode operators', () => {
    expect(evaluateExpression(' 2 × wat(3)')).toMatchObject({ status: 'error', start: 5, end: 8 })
  })

  it('preserves small nonzero scientific results and exact quadrantal zeros', () => {
    for (const expression of ['sqrt(1e-30)', 'exp(-50)', 'sin(1e-10)']) {
      const result = evaluateExpression(expression, 'rad')
      expect(result.status).toBe('complete')
      if (result.status === 'complete') expect(Number(result.value)).toBeGreaterThan(0)
    }
    expect(evaluateExpression('sin(180)')).toEqual({ status: 'complete', value: '0' })
    expect(evaluateExpression('cos(pi/2)', 'rad')).toEqual({ status: 'complete', value: '0' })
  })

  it('bounds expression length and nesting', () => {
    expect(evaluateExpression('1'.repeat(2001))).toMatchObject({ status: 'error', message: 'Keep the expression under 2,000 characters.' })
    expect(evaluateExpression('('.repeat(150) + '1' + ')'.repeat(150))).toMatchObject({ status: 'error', message: 'Use fewer nested operations.' })
  })
})
