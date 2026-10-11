import type { CcEntry, RulePack } from '../types'
import sliceJson from './chs-drg-3.0-slice.json'

interface SliceMember {
  icdCode: string
  icdName: string
  type?: string
}

interface SliceFile {
  versionId: string
  name: string
  mdcs: RulePack['mdcs']
  adrgs: RulePack['adrgs']
  drgs: RulePack['drgs']
  sets: Record<string, SliceMember[]>
  cc: CcEntry[]
  excludeSets: Record<string, Array<{ icdCode: string; icdName: string }>>
}

/**
 * Load the committed CHS-DRG 3.0 golden slice into a RulePack.
 * Regenerated via `scripts/export-rule-slice.py`.
 */
export function loadChsDrgSlice(): RulePack {
  const data = sliceJson as SliceFile

  const sets = new Map<string, Set<string>>()
  const setNames = new Map<string, Map<string, string>>()
  for (const [setId, members] of Object.entries(data.sets)) {
    sets.set(setId, new Set(members.map((m) => m.icdCode)))
    setNames.set(
      setId,
      new Map(members.map((m) => [m.icdCode, m.icdName])),
    )
  }

  const ccByCode = new Map<string, CcEntry>()
  for (const entry of data.cc) {
    ccByCode.set(entry.code, entry)
  }

  const excludeSets = new Map<string, Set<string>>()
  for (const [setId, members] of Object.entries(data.excludeSets)) {
    excludeSets.set(setId, new Set(members.map((m) => m.icdCode)))
  }

  return {
    versionId: data.versionId,
    name: data.name,
    mdcs: data.mdcs,
    adrgs: data.adrgs,
    drgs: data.drgs,
    sets,
    setNames,
    ccByCode,
    excludeSets,
  }
}
