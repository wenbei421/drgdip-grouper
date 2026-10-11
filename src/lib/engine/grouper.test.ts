import { describe, expect, it } from 'vitest'
import { miniRules } from './fixtures/mini-rules'
import { groupCase } from './grouper'
import type { RulePack } from './types'

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

  it('with CC and no MCC picks 伴并发症 not 不伴 among empty-rule DRGs', () => {
    const pack: RulePack = {
      versionId: 'tier',
      name: 'tier-cc',
      mdcs: [{ code: 'MDCF', name: '循环系统疾病', ruleExpr: '', sort: 1 }],
      adrgs: [
        {
          code: 'FR1',
          name: '急性心肌梗死',
          ruleExpr: 'ZYZD in DI_F00',
          mdcCode: 'MDCF',
          sort: 1,
        },
      ],
      drgs: [
        {
          code: 'FR11',
          name: '急性心肌梗死，伴严重并发症或合并症',
          ruleExpr: '',
          adrgCode: 'FR1',
          mdcCode: 'MDCF',
          sort: 1,
        },
        {
          code: 'FR15',
          name: '急性心肌梗死，不伴并发症或合并症',
          ruleExpr: '',
          adrgCode: 'FR1',
          mdcCode: 'MDCF',
          sort: 2,
        },
        {
          code: 'FR13',
          name: '急性心肌梗死，伴并发症或合并症',
          ruleExpr: '',
          adrgCode: 'FR1',
          mdcCode: 'MDCF',
          sort: 3,
        },
      ],
      sets: new Map([['DI_F00', new Set(['I21.001'])]]),
      setNames: new Map(),
      ccByCode: new Map([
        [
          'E11.9',
          {
            code: 'E11.9',
            name: '2型糖尿病',
            kind: 'CC',
            excludeSet: 'EX_E11',
          },
        ],
      ]),
      excludeSets: new Map([['EX_E11', new Set(['E11.9'])]]),
    }

    const result = groupCase(
      {
        ZYZD: 'I21.001',
        QTZD: ['E11.9'],
        ZYSS: '',
        QTSS: [],
        sex: '1',
        age: 67,
        leaveType: '1',
        extras: {},
      },
      pack,
    )

    expect(result.ok).toBe(true)
    expect(result.ccHits.some((h) => h.kind === 'CC')).toBe(true)
    expect(result.ccHits.some((h) => h.kind === 'MCC')).toBe(false)
    expect(result.drg?.code).toBe('FR13')
    expect(result.drg?.name).toMatch(/伴并发症/)
    expect(result.drg?.name).not.toMatch(/不伴/)
  })

  it('maps age/sex to NL/XB and passes neonatal extras + QTSS', () => {
    const pack: RulePack = {
      versionId: 'ctx',
      name: 'ctx',
      mdcs: [{ code: 'MDCA', name: '先期', ruleExpr: '', sort: 1 }],
      adrgs: [
        {
          code: 'XX1',
          name: '新生儿门控',
          ruleExpr: '(NL=0) and (XB=1) and (XSRTL>=29) and (QTSS in OP_FM3)',
          mdcCode: 'MDCA',
          sort: 1,
        },
      ],
      drgs: [
        {
          code: 'XX19',
          name: '命中',
          ruleExpr: '',
          adrgCode: 'XX1',
          mdcCode: 'MDCA',
          sort: 1,
        },
      ],
      sets: new Map([
        ['OP_FM3', new Set(['36.0601'])],
        ['DI_F00', new Set(['I21.001'])],
      ]),
      setNames: new Map(),
      ccByCode: new Map(),
      excludeSets: new Map(),
    }

    const result = groupCase(
      {
        ZYZD: 'I21.001',
        QTZD: [],
        ZYSS: '',
        QTSS: ['36.0601'],
        sex: '1',
        age: 0,
        leaveType: '1',
        extras: { XSRTL: 30, XSRTZ: 2500 },
      },
      pack,
    )

    expect(result.ok).toBe(true)
    expect(result.adrg?.code).toBe('XX1')
  })

  it('warns when primary codes are absent from all code sets', () => {
    const result = groupCase(
      {
        ZYZD: 'ZZZ.999',
        QTZD: [],
        ZYSS: '99.9999',
        QTSS: [],
        sex: '1',
        age: 40,
        leaveType: '1',
        extras: {},
      },
      miniRules,
    )
    expect(result.warnings).toContain('编码未出现在规则集合中')
  })
})
