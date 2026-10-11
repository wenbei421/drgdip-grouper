import { collectCcHits } from './cc'
import { evaluateRule, type RuleContext } from './dsl'
import { formatBoolZh, formatRuleZh } from './format-rule'
import { normalizeCode } from './normalize'
import type {
  AdrgRule,
  CaseInput,
  DrgRule,
  GroupResult,
  MdcRule,
  RulePack,
} from './types'

function labelWithName(code: string, name: string): string {
  const n = name.trim()
  return n ? `${code}（${n}）` : code
}

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
    const label = labelWithName(drg.code, drg.name)
    if (r.value) {
      trace.push(`细分组 ${label}：${formatRuleZh(drg.ruleExpr)} → ${formatBoolZh(true)}`)
      return drg
    }
    trace.push(`细分组 ${label}：${formatRuleZh(drg.ruleExpr)} → ${formatBoolZh(false)}`)
  }

  if (emptyRules.length === 0) return null

  if (emptyRules.length === 1) {
    const only = emptyRules[0]!
    trace.push(
      `细分组 ${labelWithName(only.code, only.name)}：无额外条件 → 入组`,
    )
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
      `同一病组下存在多条无条件细分组，已按排序选用 ${picked.code}`,
    )
  }

  const tier = hasMcc ? '按 MCC 分层' : hasCc ? '按 CC 分层' : '按无并发症分层'
  trace.push(
    `细分组 ${labelWithName(picked.code, picked.name)}：无额外条件（${tier}） → 入组`,
  )
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

    const mdcLabel = labelWithName(mdc.code, mdc.name)
    if (gateExpr === '') {
      gateOpen = true
      trace.push(`大类 ${mdcLabel}：无条件闸门 → 进入尝试下属病组`)
    } else {
      const r = evaluateRule(mdc.ruleExpr, ctx, pack.sets)
      warnings.push(...r.warnings)
      gateOpen = r.value
      trace.push(
        `大类 ${mdcLabel}：${formatRuleZh(mdc.ruleExpr)} → ${formatBoolZh(gateOpen)}`,
      )
    }

    if (!gateOpen) continue

    for (const adrg of adrgsUnder(pack, mdc.code)) {
      const r = evaluateRule(adrg.ruleExpr, ctx, pack.sets)
      warnings.push(...r.warnings)
      const hit = r.value
      const adrgLabel = labelWithName(adrg.code, adrg.name)
      const ruleText = adrg.ruleExpr.trim()
        ? formatRuleZh(adrg.ruleExpr)
        : '无额外条件'
      trace.push(`病组 ${adrgLabel}：${ruleText} → ${formatBoolZh(hit)}`)
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
      failReason: '未匹配到任何大类或核心病组，请检查主诊断与主手术编码',
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
      failReason: '已锁定核心病组，但未能确定细分组',
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
