import { describe, expect, it } from 'vitest'
import { loadChsDrgSlice } from './fixtures/load-slice'
import { groupCase } from './grouper'
import type { CaseInput } from './types'

const pack = loadChsDrgSlice()

function baseCase(overrides: Partial<CaseInput> = {}): CaseInput {
  return {
    ZYZD: '',
    QTZD: [],
    ZYSS: '',
    QTSS: [],
    sex: '1',
    age: 67,
    leaveType: '1',
    extras: {},
    ...overrides,
  }
}

describe('CHS-DRG 3.0 golden (official slice)', () => {
  it('stent case → FM39 (ZYZD I21.001, ZYSS 36.0601)', () => {
    const result = groupCase(
      baseCase({
        ZYZD: 'I21.001',
        ZYSS: '36.0601',
        QTZD: ['E11.101'],
      }),
      pack,
    )

    expect(result.ok).toBe(true)
    expect(result.mdc?.code).toBe('MDCF')
    expect(result.adrg?.code).toBe('FM3')
    expect(result.drg?.code).toBe('FM39')
    expect(result.ccHits.some((h) => h.code === 'E11.101' && h.kind === 'CC')).toBe(
      true,
    )
  })

  it('unknown codes → failStage is set', () => {
    const result = groupCase(
      baseCase({
        ZYZD: 'ZZZ.999',
        ZYSS: '',
        age: 40,
      }),
      pack,
    )

    expect(result.ok).toBe(false)
    expect(result.failStage).toBeTruthy()
    expect(['MDC', 'ADRG', 'DRG', 'INPUT']).toContain(result.failStage)
  })

  it('medical case without OR → FR19 under MDCF/FR1', () => {
    const result = groupCase(
      baseCase({
        ZYZD: 'I21.001',
        ZYSS: '',
        QTZD: [],
      }),
      pack,
    )

    expect(result.ok).toBe(true)
    expect(result.mdc?.code).toBe('MDCF')
    expect(result.adrg?.code).toBe('FR1')
    expect(result.drg?.code).toBe('FR19')
  })
})
