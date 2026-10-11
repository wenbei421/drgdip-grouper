import type { RulePack } from '@/lib/engine/types'

export type CodeKind = 'DI' | 'OP' | 'OTHER'

export interface CodeHit {
  code: string
  name: string
  kind: CodeKind
  setId: string
}

export type CodeTypeFilter = 'DI' | 'OP'

function inferKind(setId: string): CodeKind {
  const upper = setId.toUpperCase()
  if (upper.startsWith('DI')) return 'DI'
  if (upper.startsWith('OP')) return 'OP'
  return 'OTHER'
}

/**
 * Search ICD codes by code prefix or name substring.
 * Flattens `pack.setNames` (set_id → code → name); optional DI/OP filter.
 */
export function searchCodes(
  pack: RulePack,
  query: string,
  limit: number,
  type?: CodeTypeFilter,
): CodeHit[] {
  const q = query.trim()
  if (!q || limit <= 0) return []

  const qUpper = q.toUpperCase()
  const hits: CodeHit[] = []
  const seen = new Set<string>()

  for (const [setId, nameMap] of pack.setNames) {
    const kind = inferKind(setId)
    if (type && kind !== type) continue

    for (const [code, name] of nameMap) {
      if (seen.has(code)) continue

      const codeMatch = code.toUpperCase().startsWith(qUpper)
      const nameMatch = name.includes(q)
      if (!codeMatch && !nameMatch) continue

      seen.add(code)
      hits.push({ code, name, kind, setId })
      if (hits.length >= limit) return hits
    }
  }

  return hits
}
