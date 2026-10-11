import { defineStore, storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import { groupCase } from '@/lib/engine/grouper'
import { normalizeCode } from '@/lib/engine/normalize'
import type { CaseInput, GroupResult, RulePack } from '@/lib/engine/types'
import { useRulesStore } from '@/stores/rules'

const DEMO_ZYZD = 'I21.001'
const DEMO_ZYSS = '36.0601'
const DEMO_CC_PREFERRED = 'E11.900'

function emptyInput(): CaseInput {
  return {
    ZYZD: '',
    QTZD: [],
    ZYSS: '',
    QTSS: [],
    sex: '',
    age: null,
    leaveType: '1',
    extras: {},
  }
}

/** Resolve ICD display name from CC table or setNames. */
export function lookupCodeName(pack: RulePack | null, code: string): string {
  if (!pack || !code.trim()) return ''
  const norm = normalizeCode(code)

  for (const [c, entry] of pack.ccByCode) {
    if (normalizeCode(c) === norm || normalizeCode(entry.code) === norm) {
      return entry.name
    }
  }

  for (const nameMap of pack.setNames.values()) {
    for (const [c, name] of nameMap) {
      if (normalizeCode(c) === norm) return name
    }
  }

  return ''
}

function pickDemoCc(pack: RulePack | null): { code: string; name: string } {
  if (pack) {
    for (const [c, entry] of pack.ccByCode) {
      if (
        normalizeCode(c) === DEMO_CC_PREFERRED ||
        normalizeCode(entry.code) === DEMO_CC_PREFERRED
      ) {
        return { code: entry.code || c, name: entry.name }
      }
    }
    for (const entry of pack.ccByCode.values()) {
      if (entry.kind === 'CC') return { code: entry.code, name: entry.name }
    }
    const first = pack.ccByCode.values().next().value
    if (first) return { code: first.code, name: first.name }
  }
  return { code: DEMO_CC_PREFERRED, name: '' }
}

export const useCaseStore = defineStore('case', () => {
  const rulesStore = useRulesStore()
  const { pack, isReady } = storeToRefs(rulesStore)

  const input = ref<CaseInput>(emptyInput())
  const names = ref({
    ZYZD: '',
    ZYSS: '',
    QTZD: [] as string[],
    QTSS: [] as string[],
  })
  const result = ref<GroupResult | null>(null)

  const canGroup = computed(
    () => isReady.value && Boolean(input.value.ZYZD.trim()),
  )

  function setPrimaryDx(code: string, name?: string) {
    input.value.ZYZD = code
    names.value.ZYZD = name ?? lookupCodeName(pack.value, code)
  }

  function setPrimaryProc(code: string, name?: string) {
    input.value.ZYSS = code
    names.value.ZYSS = name ?? lookupCodeName(pack.value, code)
  }

  function setSecondaryDx(index: number, code: string, name?: string) {
    if (index < 0 || index >= input.value.QTZD.length) return
    input.value.QTZD[index] = code
    names.value.QTZD[index] = name ?? lookupCodeName(pack.value, code)
  }

  function addSecondaryDx(code = '', name = '') {
    input.value.QTZD.push(code)
    names.value.QTZD.push(name || lookupCodeName(pack.value, code))
  }

  function removeSecondaryDx(index: number) {
    if (index < 0 || index >= input.value.QTZD.length) return
    input.value.QTZD.splice(index, 1)
    names.value.QTZD.splice(index, 1)
  }

  function setSecondaryProc(index: number, code: string, name?: string) {
    if (index < 0 || index >= input.value.QTSS.length) return
    input.value.QTSS[index] = code
    names.value.QTSS[index] = name ?? lookupCodeName(pack.value, code)
  }

  function addSecondaryProc(code = '', name = '') {
    input.value.QTSS.push(code)
    names.value.QTSS.push(name || lookupCodeName(pack.value, code))
  }

  function removeSecondaryProc(index: number) {
    if (index < 0 || index >= input.value.QTSS.length) return
    input.value.QTSS.splice(index, 1)
    names.value.QTSS.splice(index, 1)
  }

  function loadDemo() {
    const cc = pickDemoCc(pack.value)
    input.value = {
      ZYZD: DEMO_ZYZD,
      QTZD: [cc.code],
      ZYSS: DEMO_ZYSS,
      QTSS: [],
      sex: '1',
      age: 67,
      leaveType: '1',
      extras: {},
    }
    names.value = {
      ZYZD: lookupCodeName(pack.value, DEMO_ZYZD) || '急性前壁心肌梗死',
      ZYSS: lookupCodeName(pack.value, DEMO_ZYSS) || '经皮冠状动脉支架植入',
      QTZD: [cc.name || lookupCodeName(pack.value, cc.code)],
      QTSS: [],
    }
    result.value = null
  }

  function group() {
    if (!canGroup.value || !pack.value) return
    result.value = groupCase(input.value, pack.value)
  }

  function clearResult() {
    result.value = null
  }

  return {
    input,
    names,
    result,
    canGroup,
    setPrimaryDx,
    setPrimaryProc,
    setSecondaryDx,
    addSecondaryDx,
    removeSecondaryDx,
    setSecondaryProc,
    addSecondaryProc,
    removeSecondaryProc,
    loadDemo,
    group,
    clearResult,
  }
})
