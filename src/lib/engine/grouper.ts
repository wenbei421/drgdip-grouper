import { collectCcHits } from './cc'
import { evaluateRule, type RuleContext } from './dsl'
import { normalizeCode } from './normalize'
import type {
  AdrgRule,
  CaseInput,
  DrgRule,
  GroupResult,
  MdcRule,
  RulePack,
} from './types'

function buildContext(input: CaseInput): RuleContext {
  const ctx: RuleContext = {
    ZYZD: input.ZYZD,
    QTZD: input.QTZD,
    ZYSS: input.ZYSS,
    QTSS: input.QTSS,
    sex: input.sex,
    age: input.age,
    leaveType: input.leaveType,
    ...input.extras,
  }

  // Official DSL uses NL / XB; keep age/sex aliases for UI/debug.
  if (input.age != null) {
    ctx.NL = input.age
  }
  if (input.sex === '1' || input.sex === '2') {
    ctx.XB = input.sex
  }

  return ctx
}

/** True if code appears in any named code set (MCC/CC virtual sets included). */
function codeInAnySet(code: string, pack: RulePack): boolean {
  const norm = normalizeCode(code)
  if (!norm) return false
  for (const set of pack.sets.values()) {
    if (set.has(norm)) return true
  }
  return false
}

function normalizeCase(input: CaseInput): CaseInput {
  return {
    ...input,
    ZYZD: normalizeCode(input.ZYZD),
    ZYSS: normalizeCode(input.ZYSS),
    QTZD: input.QTZD.map(normalizeCode).filter(Boolean),
    QTSS: input.QTSS.map(normalizeCode).filter(Boolean),
  }
}

function sortedMdcs(pack: RulePack): MdcRule[] {
  return [...pack.mdcs].sort((a, b) => a.sort - b.sort)
}

function adrgsUnder(pack: RulePack, mdcCode: string): AdrgRule[] {
  return pack.adrgs
    .filter((a) => a.mdcCode === mdcCode)
    .sort((a, b) => a.sort - b.sort)
}

function drgsUnder(pack: RulePack, adrgCode: string): DrgRule[] {
  return pack.drgs
    .filter((d) => d.adrgCode === adrgCode)
    .sort((a, b) => a.sort - b.sort)
}

function nameSuggestsMcc(name: string): boolean {
  return !/不伴/.test(name) && /MCC|严重/.test(name)
}

function nameSuggestsCc(name: string): boolean {
  return (
    !/不伴/.test(name) &&
    /伴并发症|伴合并症|CC/.test(name) &&
    !nameSuggestsMcc(name)
  )
}

function nameSuggestsNone(name: string, code: string): boolean {
  return /不伴/.test(name) || /9$/.test(code)
}

/**
 * Pick DRG under a locked ADRG using ruleExpr and CC/MCC stratification.
 */
function selectDrg(
  candidates: DrgRule[],
  ctx: RuleContext,
  pack: RulePack,
  ccHits: GroupResult['ccHits'],
  warnings: string[],
  trace: string[],
): DrgRule | null {
  if (candidates.length === 0) return null

  const hasMcc = ccHits.some((h) => h.kind === 'MCC')
  const hasCc = ccHits.some((h) => h.kind === 'CC')

  const emptyRules: DrgRule[] = []

  for (const drg of candidates) {
    const expr = drg.ruleExpr.trim()
    if (expr === '') {
      emptyRules.push(drg)
      continue
    }
    const r = evaluateRule(drg.ruleExpr, ctx, pack.sets)
    warnings.push(...r.warnings)
    if (r.value) {
      trace.push(`DRG ${drg.code}: ${drg.ruleExpr} → true`)
      return drg
    }
    trace.push(`DRG ${drg.code}: ${drg.ruleExpr} → false`)
  }

  if (emptyRules.length === 0) return null

  if (emptyRules.length === 1) {
    const only = emptyRules[0]!
    trace.push(`DRG ${only.code}: (empty rule) → true`)
    return only
  }

  let picked: DrgRule | undefined
  if (hasMcc) {
    picked = emptyRules.find((d) => nameSuggestsMcc(d.name))
  } else if (hasCc) {
    picked = emptyRules.find((d) => nameSuggestsCc(d.name))
  } else {
    picked = emptyRules.find((d) => nameSuggestsNone(d.name, d.code))
  }

  if (!picked) {
    picked = emptyRules[0]!
    warnings.push(
      `Ambiguous empty-rule DRGs under ADRG; using ${picked.code} (lowest sort)`,
    )
  }

  trace.push(`DRG ${picked.code}: (empty rule / CC-MCC stratify) → true`)
  return picked
}

/**
 * Group a single case: MDC → ADRG → DRG with CC/MCC.
 */
export function groupCase(input: CaseInput, pack: RulePack): GroupResult {
  const caseNorm = normalizeCase(input)
  const ctx = buildContext(caseNorm)
  const warnings: string[] = []
  const trace: string[] = []
  const ccHits = collectCcHits(caseNorm.QTZD, caseNorm.ZYZD, pack)

  const primaryMissing =
    (caseNorm.ZYZD !== '' && !codeInAnySet(caseNorm.ZYZD, pack)) ||
    (caseNorm.ZYSS !== '' && !codeInAnySet(caseNorm.ZYSS, pack))
  if (primaryMissing) {
    warnings.push('编码未出现在规则集合中')
  }

  let lockedMdc: MdcRule | null = null
  let lockedAdrg: AdrgRule | null = null

  for (const mdc of sortedMdcs(pack)) {
    const gateExpr = mdc.ruleExpr.trim()
    let gateOpen = false

    if (gateExpr === '') {
      gateOpen = true
      trace.push(`MDC ${mdc.code}: (empty gate) → enter`)
    } else {
      const r = evaluateRule(mdc.ruleExpr, ctx, pack.sets)
      warnings.push(...r.warnings)
      gateOpen = r.value
      trace.push(`MDC ${mdc.code}: ${mdc.ruleExpr} → ${gateOpen}`)
    }

    if (!gateOpen) continue

    for (const adrg of adrgsUnder(pack, mdc.code)) {
      const r = evaluateRule(adrg.ruleExpr, ctx, pack.sets)
      warnings.push(...r.warnings)
      const hit = r.value
      trace.push(`ADRG ${adrg.code}: ${adrg.ruleExpr || '(empty)'} → ${hit}`)
      if (hit) {
        lockedMdc = mdc
        lockedAdrg = adrg
        break
      }
    }

    if (lockedAdrg) break
  }

  if (!lockedMdc || !lockedAdrg) {
    return {
      ok: false,
      ccHits,
      trace,
      warnings,
      failStage: 'MDC',
      failReason: 'No MDC/ADRG matched',
    }
  }

  const drgCandidates = drgsUnder(pack, lockedAdrg.code)
  const drg = selectDrg(drgCandidates, ctx, pack, ccHits, warnings, trace)

  if (!drg) {
    return {
      ok: false,
      mdc: { code: lockedMdc.code, name: lockedMdc.name, rule: lockedMdc.ruleExpr },
      adrg: {
        code: lockedAdrg.code,
        name: lockedAdrg.name,
        rule: lockedAdrg.ruleExpr,
      },
      ccHits,
      trace,
      warnings,
      failStage: 'DRG',
      failReason: 'No DRG matched under locked ADRG',
    }
  }

  return {
    ok: true,
    mdc: { code: lockedMdc.code, name: lockedMdc.name, rule: lockedMdc.ruleExpr },
    adrg: {
      code: lockedAdrg.code,
      name: lockedAdrg.name,
      rule: lockedAdrg.ruleExpr,
    },
    drg: { code: drg.code, name: drg.name, rule: drg.ruleExpr },
    ccHits,
    trace,
    warnings,
  }
}
