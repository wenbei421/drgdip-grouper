import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { RulePack } from '@/lib/engine/types'
import {
  fetchRulePack,
  importRulesFromPath,
  seedBundledRulesIfEmpty,
  toRulePack,
  type RuleVersionSummary,
} from '@/lib/rules/api'

function toErrorMessage(e: unknown): string {
  if (typeof e === 'string') return e
  if (e instanceof Error) return e.message
  return String(e)
}

export const useRulesStore = defineStore('rules', () => {
  const summary = ref<RuleVersionSummary | null>(null)
  const pack = ref<RulePack | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isReady = computed(() => pack.value != null && !error.value)

  async function bootstrap() {
    loading.value = true
    error.value = null
    try {
      summary.value = await seedBundledRulesIfEmpty()
      const dto = await fetchRulePack()
      pack.value = toRulePack(dto)
    } catch (e) {
      error.value = toErrorMessage(e)
      pack.value = null
    } finally {
      loading.value = false
    }
  }

  /** Re-import official xlsx; refreshes summary + pack on success. */
  async function reimportFromPath(path: string) {
    loading.value = true
    try {
      const nextSummary = await importRulesFromPath(path)
      const dto = await fetchRulePack()
      summary.value = nextSummary
      pack.value = toRulePack(dto)
      error.value = null
    } catch (e) {
      if (!pack.value) {
        error.value = toErrorMessage(e)
      }
      throw e instanceof Error ? e : new Error(toErrorMessage(e))
    } finally {
      loading.value = false
    }
  }

  return {
    summary,
    pack,
    loading,
    error,
    isReady,
    bootstrap,
    reimportFromPath,
  }
})
