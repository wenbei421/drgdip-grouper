import { describe, expect, it } from 'vitest'
import { miniRules } from '@/lib/engine/fixtures/mini-rules'
import type { RulePack } from '@/lib/engine/types'
import { searchCodes } from './search'

/** Mini pack with setNames for search (engine fixture leaves setNames empty). */
const searchPack: RulePack = {
  ...miniRules,
  setNames: new Map([
    [
      'OP_FM3',
      new Map([
        ['36.0601', '经皮冠状动脉支架植入'],
        ['36.0700', '药物洗脱冠状动脉支架置入'],
      ]),
    ],
    [
      'DI_F00',
      new Map([
        ['I21.001', '急性前壁心肌梗死'],
        ['I21.002', '急性下壁心肌梗死'],
      ]),
    ],
  ]),
}

describe('searchCodes', () => {
  it('matches code prefix or name substring', () => {
    const hits = searchCodes(searchPack, '支架', 10)
    expect(hits.length).toBeGreaterThan(0)
    expect(hits[0]).toHaveProperty('code')
    expect(hits.every((h) => h.name.includes('支架'))).toBe(true)
  })

  it('matches ICD code prefix', () => {
    const hits = searchCodes(searchPack, 'I21', 10)
    expect(hits.map((h) => h.code).sort()).toEqual(['I21.001', 'I21.002'])
  })

  it('filters by DI / OP type', () => {
    const di = searchCodes(searchPack, 'I21', 10, 'DI')
    expect(di.every((h) => h.kind === 'DI')).toBe(true)

    const op = searchCodes(searchPack, '36', 10, 'OP')
    expect(op.every((h) => h.kind === 'OP')).toBe(true)
    expect(op.length).toBeGreaterThan(0)
  })

  it('respects limit and empty query', () => {
    expect(searchCodes(searchPack, '', 10)).toEqual([])
    expect(searchCodes(searchPack, '支架', 1)).toHaveLength(1)
  })
})
