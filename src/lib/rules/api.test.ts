import { describe, expect, it } from 'vitest'
import { synthesizeMccCcSets, toRulePack, type RulePackDto } from './api'

describe('toRulePack / synthesizeMccCcSets', () => {
  it('synthesizes MCC and CC sets from ccByCode', () => {
    const dto: RulePackDto = {
      versionId: 'v1',
      name: 'test',
      mdcs: [],
      adrgs: [],
      drgs: [],
      sets: { DI_F00: ['I21.001'] },
      setNames: {},
      ccByCode: {
        'N18.3': {
          code: 'N18.3',
          name: 'CKD',
          kind: 'MCC',
          excludeSet: 'EX_1',
        },
        'E11.9': {
          code: 'E11.9',
          name: 'DM',
          kind: 'CC',
          excludeSet: 'EX_2',
        },
      },
      excludeSets: {},
    }

    const pack = toRulePack(dto)
    expect(pack.sets.get('MCC')?.has('N18.3')).toBe(true)
    expect(pack.sets.get('CC')?.has('E11.9')).toBe(true)
    expect(pack.sets.get('MCC')?.has('E11.9')).toBe(false)
  })

  it('synthesizeMccCcSets overwrites virtual set ids', () => {
    const sets = new Map<string, Set<string>>([['MCC', new Set(['OLD'])]])
    const ccByCode = new Map([
      [
        'J96.001',
        {
          code: 'J96.001',
          name: '呼衰',
          kind: 'MCC' as const,
          excludeSet: '',
        },
      ],
    ])
    synthesizeMccCcSets(sets, ccByCode)
    expect(sets.get('MCC')?.has('J96.001')).toBe(true)
    expect(sets.get('MCC')?.has('OLD')).toBe(false)
  })
})
