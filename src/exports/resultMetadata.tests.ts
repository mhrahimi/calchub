import { describe, expect, it } from 'vitest'
import { resultMetadata } from './resultMetadata'

describe('corrected calculation versions', () => {
  it('preserves an older snapshot while requesting recalculation', () => {
    const metadata = { primaryResult: 'requiredBalance', modelVersion: 'retirement/2.0.0', status: 'success', warnings: [], assumptions: ['Original assumption'], sources: [] }
    const result = { requiredBalance: 121, metadata }
    const displayed = resultMetadata('retirement', result)
    expect(displayed).toMatchObject({ status: 'outdated', modelVersion: 'retirement/2.0.0', assumptions: ['Original assumption'] })
    expect(displayed.warnings).toHaveLength(1)
    expect(displayed.warnings[0]).toMatch(/Recalculate/)
    expect(result.requiredBalance).toBe(121)
    expect(result.metadata.status).toBe('success')
    expect(resultMetadata('retirement', { ...result, metadata: displayed }).warnings).toHaveLength(1)
  })

  it('marks current take-home estimates as approximate without flagging them as outdated', () => {
    const result = { mode: 'take-home', estimatedNetAnnual: 60800.24 }
    const metadata = resultMetadata('salary', result)
    expect(metadata).toMatchObject({ modelVersion: 'salary/2.2.0', status: 'approximate', primaryResult: 'estimatedNetAnnual' })
    expect(resultMetadata('salary', { ...result, metadata })).toEqual(metadata)
    expect(resultMetadata('salary', { mode: 'convert', convertedAmount: 100 })).toMatchObject({ status: 'success' })
  })
})
