import { describe, expect, it } from 'vitest'
import { miniRules } from './fixtures/mini-rules'
import { groupCase } from './grouper'

describe('groupCase', () => {
  it('groups stent case into FM3/FM39 via empty MDCA gate', () => {
    const result = groupCase(
      {
        ZYZD: 'I21.001',
        QTZD: ['E11.9'],
        ZYSS: '36.0601',
        QTSS: [],
        sex: '1',
        age: 67,
        leaveType: '1',
        extras: {},
      },
      miniRules,
    )
    expect(result.ok).toBe(true)
    expect(result.adrg?.code).toBe('FM3')
    expect(result.drg?.code).toBe('FM39')
    expect(result.ccHits.some((h) => h.kind === 'CC')).toBe(true)
  })

  it('fails clearly when no MDC/ADRG matches', () => {
    const result = groupCase(
      {
        ZYZD: 'ZZZ.999',
        QTZD: [],
        ZYSS: '',
        QTSS: [],
        sex: '1',
        age: 40,
        leaveType: '1',
        extras: {},
      },
      miniRules,
    )
    expect(result.ok).toBe(false)
    expect(result.failStage).toBe('MDC')
  })
})
