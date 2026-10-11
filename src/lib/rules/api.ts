import { invoke } from '@tauri-apps/api/core'
import { normalizeCode } from '@/lib/engine/normalize'
import type { CcEntry, RulePack } from '@/lib/engine/types'

export interface CountsDto {
  mdc: number
  adrg: number
  drg: number
  codeSets: number
  cc: number
  excludeSets: number
}

/** Aligns with Rust `RuleVersionSummary` (camelCase). */
export interface RuleVersionSummary {
  id: string
  name: string
  sourceFile: string
  importedAt: string
  counts: CountsDto
}

export interface MdcDto {
  code: string
  name: string
  ruleExpr: string
  sort: number
}

export interface AdrgDto {
  code: string
  name: string
  ruleExpr: string
  mdcCode: string
  sort: number
}

export interface DrgDto {
  code: string
  name: string
  ruleExpr: string
  adrgCode: string
  mdcCode: string
  sort: number
}

export interface CcDto {
  code: string
  name: string
  kind: string
  excludeSet: string
}

/** Aligns with Rust `RulePackDto` from `fetch_rule_pack`. */
export interface RulePackDto {
  versionId: string
  name: string
  mdcs: MdcDto[]
  adrgs: AdrgDto[]
  drgs: DrgDto[]
  sets: Record<string, string[]>
  setNames: Record<string, Record<string, string>>
  ccByCode: Record<string, CcDto>
  excludeSets: Record<string, string[]>
}

export function seedBundledRulesIfEmpty() {
  return invoke<RuleVersionSummary>('seed_bundled_rules_if_empty')
}

export function fetchRulePack() {
  return invoke<RulePackDto>('fetch_rule_pack')
}

export function getActiveRuleSummary() {
  return invoke<RuleVersionSummary | null>('get_active_rule_summary')
}

export function importRulesFromPath(path: string) {
  return invoke<RuleVersionSummary>('import_rules_from_path', { path })
}

function toCcKind(kind: string): CcEntry['kind'] {
  return kind === 'MCC' ? 'MCC' : 'CC'
}

/**
 * Synthesize virtual sets `MCC` / `CC` from the CC table (sheet has no such set ids).
 */
export function synthesizeMccCcSets(
  sets: Map<string, Set<string>>,
  ccByCode: Map<string, CcEntry>,
): void {
  const mcc = new Set<string>()
  const cc = new Set<string>()
  for (const entry of ccByCode.values()) {
    const code = normalizeCode(entry.code)
    if (!code) continue
    if (entry.kind === 'MCC') mcc.add(code)
    else cc.add(code)
  }
  sets.set('MCC', mcc)
  sets.set('CC', cc)
}

/** Convert JSON-serializable DTO into engine `RulePack` (Maps / Sets). */
export function toRulePack(dto: RulePackDto): RulePack {
  const sets = new Map<string, Set<string>>()
  for (const setId in dto.sets) {
    const codes = dto.sets[setId]
    sets.set(setId, new Set(codes.map(normalizeCode)))
  }

  const setNames = new Map<string, Map<string, string>>()
  for (const setId in dto.setNames) {
    const inner = dto.setNames[setId]
    const nameMap = new Map<string, string>()
    for (const code in inner) {
      nameMap.set(normalizeCode(code), inner[code])
    }
    setNames.set(setId, nameMap)
  }

  const ccByCode = new Map<string, CcEntry>()
  for (const code in dto.ccByCode) {
    const cc = dto.ccByCode[code]
    const norm = normalizeCode(cc.code || code)
    ccByCode.set(norm, {
      code: norm,
      name: cc.name,
      kind: toCcKind(cc.kind),
      excludeSet: cc.excludeSet,
    })
  }

  synthesizeMccCcSets(sets, ccByCode)

  const excludeSets = new Map<string, Set<string>>()
  for (const setId in dto.excludeSets) {
    const codes = dto.excludeSets[setId]
    excludeSets.set(setId, new Set(codes.map(normalizeCode)))
  }

  return {
    versionId: dto.versionId,
    name: dto.name,
    mdcs: dto.mdcs,
    adrgs: dto.adrgs,
    drgs: dto.drgs,
    sets,
    setNames,
    ccByCode,
    excludeSets,
  }
}
