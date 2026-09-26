/** Versioned JSON transport for calculation values; ordinary old JSON remains readable. */
const FORMAT = 'calchub-calculation-json'
const VERSION = 1
type Node = string | number | boolean | null | [string, unknown?]

function encode(value: unknown, depth = 0): Node {
  if (depth > 100) throw new Error('Calculation data is nested too deeply')
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value
  if (typeof value === 'bigint') return ['bigint', value.toString()]
  if (value === undefined) return ['undefined']
  if (typeof value === 'number') {
    return Number.isFinite(value) && !Object.is(value, -0) ? value : ['number', Object.is(value, -0) ? '-0' : String(value)]
  }
  if (Array.isArray(value)) return ['array', value.map((item) => encode(item, depth + 1))]
  if (typeof value === 'object' && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)) {
    return ['object', Object.entries(value).map(([key, item]) => [key, encode(item, depth + 1)])]
  }
  throw new Error('Unsupported calculation data type')
}

function decode(node: unknown, depth = 0): unknown {
  if (depth > 100) throw new Error('Calculation data is nested too deeply')
  if (node === null || typeof node === 'string' || typeof node === 'boolean' || typeof node === 'number') return node
  if (!Array.isArray(node) || node.length < 1 || node.length > 2) throw new Error('Invalid calculation data')
  const [type, value] = node
  if (type === 'undefined' && node.length === 1) return undefined
  if (type === 'bigint' && typeof value === 'string' && /^-?\d+$/.test(value)) return BigInt(value)
  if (type === 'number' && typeof value === 'string' && ['Infinity', '-Infinity', 'NaN', '-0'].includes(value)) return Number(value)
  if (type === 'array' && Array.isArray(value)) return value.map((item) => decode(item, depth + 1))
  if (type === 'object' && Array.isArray(value)) {
    return Object.fromEntries(value.map((entry) => {
      if (!Array.isArray(entry) || entry.length !== 2 || typeof entry[0] !== 'string') throw new Error('Invalid calculation object')
      return [entry[0], decode(entry[1], depth + 1)]
    }))
  }
  throw new Error('Invalid calculation data')
}

export function stringifyCalculationData(value: unknown, space?: number): string {
  return JSON.stringify({ format: FORMAT, version: VERSION, value: encode(value) }, null, space)
}

export function parseCalculationData<T = unknown>(text: string): T {
  const raw: unknown = JSON.parse(text)
  if (raw && typeof raw === 'object' && 'format' in raw && raw.format === FORMAT) {
    if (!('version' in raw) || raw.version !== VERSION || !('value' in raw)) throw new Error('Unsupported calculation data version')
    return decode(raw.value) as T
  }
  return raw as T
}
