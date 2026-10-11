import { describe, expect, it } from 'vitest'
import { miniRules } from './fixtures/mini-rules'
import {
  buildCaseSetMemberships,
  extractSetIdsFromRules,
  listSetsForCode,
} from './set-membership'

describe('listSetsForCode', () => {
  it('finds sets containing a procedure code', () => {
    const sets = listSetsForCode(miniRules, '36.0601')
    expect(sets).toContain('OP_FM3')
  })

  it('finds sets containing a diagnosis code', () => {
    const sets = listSetsForCode(miniRules, 'I21.001')
    expect(sets).toContain('DI_F00')
  })
})

describe('buildCaseSetMemberships', () => {
  it('lists primary dx/proc memberships', () => {
    const rows = buildCaseSetMemberships(
      miniRules,
      {
        ZYZD: 'I21.001',
        ZYSS: '36.0601',
        QTZD: ['E11.9'],
        QTSS: [],
      },
      {
        ZYZD: '急性前壁心肌梗死',
        ZYSS: '支架',
        QTZD: ['糖尿病'],
        QTSS: [],
      },
    )
    expect(rows[0]?.role).toBe('主诊断')
    expect(rows[0]?.sets).toContain('DI_F00')
    expect(rows[1]?.role).toBe('主手术')
    expect(rows[1]?.sets).toContain('OP_FM3')
  })
})

describe('extractSetIdsFromRules', () => {
  it('extracts set ids from official expressions', () => {
    const ids = extractSetIdsFromRules('ZYZD in DI_F00', 'ZYSS in OP_FM3')
    expect(ids.has('DI_F00')).toBe(true)
    expect(ids.has('OP_FM3')).toBe(true)
  })
})
