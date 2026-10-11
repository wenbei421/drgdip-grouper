import { normalizeCode } from './normalize'
import type { RulePack } from './types'

export type CcHit = { code: string; name: string; kind: 'CC' | 'MCC' }

/**
 * Collect CC/MCC hits from secondary diagnoses.
 * A hit is suppressed when the principal diagnosis is in that entry's exclude set.
 */
export function collectCcHits(
  qtzd: string[],
  zyzd: string,
  pack: RulePack,
): CcHit[] {
  const principal = normalizeCode(zyzd)
  const hits: CcHit[] = []
  const seen = new Set<string>()

  for (const raw of qtzd) {
    const code = normalizeCode(raw)
    if (!code || seen.has(code)) continue
    seen.add(code)

    const entry = pack.ccByCode.get(code)
    if (!entry) continue

    const exclude = pack.excludeSets.get(entry.excludeSet)
    if (exclude?.has(principal)) continue

    hits.push({ code: entry.code, name: entry.name, kind: entry.kind })
  }

  return hits
}
