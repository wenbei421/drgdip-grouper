import { describe, expect, it } from 'vitest'
import { formatBoolZh, formatRuleZh } from './format-rule'

describe('formatRuleZh', () => {
  it('translates membership and fields', () => {
    expect(formatRuleZh('ZYSS in OP_FM3')).toBe('主手术 属于 OP_FM3')
    expect(formatRuleZh('ZYZD in DI_F00')).toBe('主诊断 属于 DI_F00')
  })

  it('translates empty to 无额外条件', () => {
    expect(formatRuleZh('')).toBe('无额外条件')
  })

  it('handles not in / and / or', () => {
    expect(formatRuleZh('ZYSS not in OP_ALL')).toBe('主手术 不属于 OP_ALL')
    expect(formatRuleZh('(ZYSS in OP_FM3) and (ZYZD in DI_F00)')).toBe(
      '(主手术 属于 OP_FM3) 且 (主诊断 属于 DI_F00)',
    )
  })
})

describe('formatBoolZh', () => {
  it('maps booleans', () => {
    expect(formatBoolZh(true)).toBe('命中')
    expect(formatBoolZh(false)).toBe('未命中')
  })
})
