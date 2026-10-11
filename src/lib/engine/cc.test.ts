import { describe, expect, it } from 'vitest'
import { collectCcHits } from './cc'
import type { RulePack } from './types'

function pack(): RulePack {
  return {
    versionId: 't',
    name: 't',
    mdcs: [],
    adrgs: [],
    drgs: [],
    sets: new Map(),
    setNames: new Map(),
    ccByCode: new Map([
      ['E11.9', { code: 'E11.9', name: '2型糖尿病', kind: 'CC', excludeSet: 'EX_1' }],
      ['N18.3', { code: 'N18.3', name: 'CKD3', kind: 'MCC', excludeSet: 'EX_2' }],
    ]),
    excludeSets: new Map([
      ['EX_1', new Set(['E11.9'])],
      ['EX_2', new Set(['N18.3'])],
    ]),
  }
}

describe('collectCcHits', () => {
  it('flags CC/MCC on secondary diagnoses', () => {
    const hits = collectCcHits(['E11.9', 'I10'], 'I21.001', pack())
    expect(hits.map((h) => h.kind)).toEqual(['CC'])
  })

  it('excludes when principal diagnosis in exclude set', () => {
    const hits = collectCcHits(['N18.3'], 'N18.3', pack())
    expect(hits).toEqual([])
  })
})
