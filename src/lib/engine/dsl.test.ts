import { describe, expect, it } from 'vitest'
import { evaluateRule } from './dsl'

const sets = new Map<string, Set<string>>([
  ['OP_FM3', new Set(['36.0601', '36.0700'])],
  ['DI_F00', new Set(['I21.001', 'I21.002'])],
  ['MCC', new Set(['N18.3', 'J96.001'])],
  ['CC', new Set(['E11.9', 'I10.X02'])],
])

const base = { ZYSS: '36.0601', ZYZD: 'I21.001', QTZD: [] as string[], QTSS: [] as string[] }

describe('evaluateRule', () => {
  it('evaluates membership', () => {
    const r = evaluateRule('ZYSS in OP_FM3', { ...base, ZYZD: '' }, sets)
    expect(r.value).toBe(true)
    expect(r.warnings).toEqual([])
  })

  it('evaluates and/or/not with parens', () => {
    const r = evaluateRule('(ZYSS in OP_FM3) and (ZYZD in DI_F00)', base, sets)
    expect(r.value).toBe(true)
  })

  it('supports not in and set literals', () => {
    const r = evaluateRule('ZYZD not in {Z99.9, Z00.0}', { ...base, ZYSS: '' }, sets)
    expect(r.value).toBe(true)
  })

  it('unknown identifier yields false + warning', () => {
    const r = evaluateRule('FOO in OP_FM3', { ...base, ZYZD: '' }, sets)
    expect(r.value).toBe(false)
    expect(r.warnings.length).toBeGreaterThan(0)
  })

  it('empty rule is true', () => {
    const r = evaluateRule('', { ZYSS: '', ZYZD: '', QTZD: [], QTSS: [] }, sets)
    expect(r.value).toBe(true)
  })

  it('QTZD in set means any intersection', () => {
    const r = evaluateRule('QTZD in DI_F00', {
      ZYSS: '', ZYZD: '', QTZD: ['I21.001'], QTSS: [],
    }, sets)
    expect(r.value).toBe(true)
  })

  it('numeric comparison', () => {
    const r = evaluateRule('NL>=29', {
      ZYSS: '', ZYZD: '', QTZD: [], QTSS: [],
      NL: 30,
    } as any, sets)
    expect(r.value).toBe(true)
  })

  it('QTZD in MCC is true when a secondary diagnosis is MCC', () => {
    const r = evaluateRule('QTZD in MCC', {
      ZYSS: '',
      ZYZD: 'I21.001',
      QTZD: ['N18.3'],
      QTSS: [],
    }, sets)
    expect(r.value).toBe(true)
  })

  it('QTZD in {MCC, CC} unions virtual sets', () => {
    const mccHit = evaluateRule('QTZD in {MCC, CC}', {
      ZYSS: '',
      ZYZD: 'I21.001',
      QTZD: ['N18.3'],
      QTSS: [],
    }, sets)
    expect(mccHit.value).toBe(true)

    const ccHit = evaluateRule('QTZD in {MCC, CC}', {
      ZYSS: '',
      ZYZD: 'I21.001',
      QTZD: ['E11.9'],
      QTSS: [],
    }, sets)
    expect(ccHit.value).toBe(true)

    const miss = evaluateRule('QTZD in {MCC, CC}', {
      ZYSS: '',
      ZYZD: 'I21.001',
      QTZD: ['Z99.9'],
      QTSS: [],
    }, sets)
    expect(miss.value).toBe(false)
  })

  it('{ZYZD, QTZD} in DI_F00 uses field values', () => {
    const viaPrimary = evaluateRule('{ZYZD, QTZD} in DI_F00', {
      ZYSS: '',
      ZYZD: 'I21.001',
      QTZD: ['Z99.9'],
      QTSS: [],
    }, sets)
    expect(viaPrimary.value).toBe(true)

    const viaSecondary = evaluateRule('{ZYZD, QTZD} in DI_F00', {
      ZYSS: '',
      ZYZD: 'Z99.9',
      QTZD: ['I21.002'],
      QTSS: [],
    }, sets)
    expect(viaSecondary.value).toBe(true)

    const miss = evaluateRule('{ZYZD, QTZD} in DI_F00', {
      ZYSS: '',
      ZYZD: 'Z99.9',
      QTZD: ['E11.9'],
      QTSS: [],
    }, sets)
    expect(miss.value).toBe(false)
  })
})
