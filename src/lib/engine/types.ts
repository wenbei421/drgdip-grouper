export interface CaseInput {
  ZYZD: string
  QTZD: string[]
  ZYSS: string
  QTSS: string[]
  sex: '1' | '2' | ''
  age: number | null
  leaveType: string
  extras: Record<string, string | number | boolean | null>
}

export interface MdcRule {
  code: string
  name: string
  ruleExpr: string
  sort: number
}

export interface AdrgRule {
  code: string
  name: string
  ruleExpr: string
  mdcCode: string
  sort: number
}

export interface DrgRule {
  code: string
  name: string
  ruleExpr: string
  adrgCode: string
  mdcCode: string
  sort: number
}

export interface CcEntry {
  code: string
  name: string
  kind: 'CC' | 'MCC'
  excludeSet: string
}

export interface RulePack {
  versionId: string
  name: string
  mdcs: MdcRule[]
  adrgs: AdrgRule[]
  drgs: DrgRule[]
  sets: Map<string, Set<string>>
  setNames: Map<string, Map<string, string>>
  ccByCode: Map<string, CcEntry>
  excludeSets: Map<string, Set<string>>
}

export interface GroupResult {
  ok: boolean
  mdc?: { code: string; name: string; rule: string }
  adrg?: { code: string; name: string; rule: string }
  drg?: { code: string; name: string; rule: string }
  ccHits: Array<{ code: string; name: string; kind: 'CC' | 'MCC' }>
  trace: string[]
  warnings: string[]
  failStage?: 'MDC' | 'ADRG' | 'DRG' | 'INPUT'
  failReason?: string
}
