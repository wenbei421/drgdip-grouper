import { normalizeCode } from './normalize'
import type { RulePack } from './types'

/** 返回包含该编码的全部集合编号（已排序）。 */
export function listSetsForCode(pack: RulePack, code: string): string[] {
  const norm = normalizeCode(code)
  if (!norm) return []

  const hits: string[] = []
  for (const [setId, members] of pack.sets) {
    if (members.has(norm)) hits.push(setId)
  }
  return hits.sort((a, b) => a.localeCompare(b))
}

export interface CodeSetMembership {
  role: string
  code: string
  name: string
  sets: string[]
}

/**
 * 汇总病例主诊/主术/其他诊/其他术所属集合，便于阅读入组过程。
 */
export function buildCaseSetMemberships(
  pack: RulePack,
  input: {
    ZYZD: string
    ZYSS: string
    QTZD: string[]
    QTSS: string[]
  },
  names: {
    ZYZD: string
    ZYSS: string
    QTZD: string[]
    QTSS: string[]
  },
): CodeSetMembership[] {
  const rows: CodeSetMembership[] = []

  if (input.ZYZD.trim()) {
    rows.push({
      role: '主诊断',
      code: input.ZYZD,
      name: names.ZYZD || '',
      sets: listSetsForCode(pack, input.ZYZD),
    })
  }

  if (input.ZYSS.trim()) {
    rows.push({
      role: '主手术',
      code: input.ZYSS,
      name: names.ZYSS || '',
      sets: listSetsForCode(pack, input.ZYSS),
    })
  }

  input.QTZD.forEach((code, i) => {
    if (!code.trim()) return
    rows.push({
      role: `其他诊断 ${i + 1}`,
      code,
      name: names.QTZD[i] || '',
      sets: listSetsForCode(pack, code),
    })
  })

  input.QTSS.forEach((code, i) => {
    if (!code.trim()) return
    rows.push({
      role: `其他手术 ${i + 1}`,
      code,
      name: names.QTSS[i] || '',
      sets: listSetsForCode(pack, code),
    })
  })

  return rows
}

/** 从已命中规则原文中提取集合编号，用于高亮。 */
export function extractSetIdsFromRules(...rules: Array<string | undefined>): Set<string> {
  const out = new Set<string>()
  const re = /\b((?:DI|OP|EX)[A-Z0-9_]*)\b/gi
  for (const rule of rules) {
    if (!rule) continue
    for (const m of rule.matchAll(re)) {
      const id = m[1]
      if (id) out.add(id.toUpperCase())
    }
  }
  // 虚拟集合
  if (rules.some((r) => r && /\bMCC\b/i.test(r))) out.add('MCC')
  if (rules.some((r) => r && /\bCC\b/i.test(r))) out.add('CC')
  return out
}
