<script setup lang="ts">
import { Upload } from '@lucide/vue'
import { open } from '@tauri-apps/plugin-dialog'
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { useRulesStore } from '@/stores/rules'

const { t } = useI18n()
const rulesStore = useRulesStore()
const { summary, loading, error, isReady } = storeToRefs(rulesStore)

const actionError = ref<string | null>(null)
const importing = ref(false)

const countRows = computed(() => {
  const c = summary.value?.counts
  if (!c) return []
  return [
    { key: 'mdc', label: t('pages.rules.counts.mdc'), value: c.mdc },
    { key: 'adrg', label: t('pages.rules.counts.adrg'), value: c.adrg },
    { key: 'drg', label: t('pages.rules.counts.drg'), value: c.drg },
    { key: 'codeSets', label: t('pages.rules.counts.codeSets'), value: c.codeSets },
    { key: 'cc', label: t('pages.rules.counts.cc'), value: c.cc },
    { key: 'excludeSets', label: t('pages.rules.counts.excludeSets'), value: c.excludeSets },
  ]
})

function formatImportedAt(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('zh-CN', { hour12: false })
}

function toErrorMessage(e: unknown): string {
  if (typeof e === 'string') return e
  if (e instanceof Error) return e.message
  return String(e)
}

async function onReimport() {
  actionError.value = null
  const selected = await open({
    multiple: false,
    filters: [{ name: 'Excel', extensions: ['xlsx'] }],
  })
  if (selected == null || Array.isArray(selected)) return

  importing.value = true
  try {
    await rulesStore.reimportFromPath(selected)
  } catch (e) {
    actionError.value = toErrorMessage(e)
  } finally {
    importing.value = false
  }
}

const busy = computed(() => loading.value || importing.value)
</script>

<template>
  <div class="flex-1 overflow-y-auto p-5">
    <div class="mx-auto max-w-2xl space-y-4">
      <div class="flex items-start justify-between gap-4">
        <div>
          <h2 class="text-[13px] font-semibold text-zinc-900">
            {{ t('pages.rules.title') }}
          </h2>
          <p class="mt-0.5 text-[11px] text-zinc-500">
            {{ t('pages.rules.subtitle') }}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          class="shrink-0 gap-1.5 bg-zinc-900 text-white hover:bg-zinc-800"
          :disabled="busy"
          @click="onReimport"
        >
          <Upload class="size-3.5" />
          {{ busy ? t('pages.rules.importing') : t('pages.rules.reimport') }}
        </Button>
      </div>

      <div
        v-if="actionError"
        class="rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5 text-[12px] text-rose-700"
      >
        {{ actionError }}
      </div>

      <div
        v-if="busy && !summary"
        class="rounded-lg border border-dashed border-zinc-200 bg-white px-4 py-10 text-center text-[13px] text-zinc-400"
      >
        {{ t('pages.rules.loading') }}
      </div>

      <div
        v-else-if="error && !summary"
        class="rounded-lg border border-rose-200 bg-rose-50 px-4 py-8 text-center"
      >
        <p class="text-[13px] font-medium text-rose-800">
          {{ t('pages.rules.loadFailed') }}
        </p>
        <p class="mt-1.5 text-[12px] text-rose-600">
          {{ error }}
        </p>
        <p class="mt-3 text-[12px] text-zinc-500">
          {{ t('pages.rules.emptyHint') }}
        </p>
      </div>

      <div
        v-else-if="!summary"
        class="rounded-lg border border-dashed border-zinc-300 bg-white px-4 py-10 text-center"
      >
        <p class="text-[13px] font-medium text-zinc-600">
          {{ t('pages.rules.empty') }}
        </p>
        <p class="mt-1.5 text-[12px] text-zinc-400">
          {{ t('pages.rules.emptyHint') }}
        </p>
      </div>

      <div
        v-else
        class="rounded-lg border-2 border-cyan-500 bg-white p-4 ring-2 ring-cyan-500/10"
      >
        <div class="mb-3 flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="text-[13px] font-semibold text-zinc-900">
              {{ summary.name }}
            </div>
            <dl class="mt-2 space-y-1 text-[11px]">
              <div class="flex gap-2">
                <dt class="shrink-0 text-zinc-400">{{ t('pages.rules.sourceFile') }}</dt>
                <dd class="truncate text-zinc-600" :title="summary.sourceFile">
                  {{ summary.sourceFile }}
                </dd>
              </div>
              <div class="flex gap-2">
                <dt class="shrink-0 text-zinc-400">{{ t('pages.rules.importedAt') }}</dt>
                <dd class="text-zinc-600">
                  {{ formatImportedAt(summary.importedAt) }}
                </dd>
              </div>
            </dl>
          </div>
          <span
            class="shrink-0 rounded px-2 py-0.5 text-[10px] font-medium"
            :class="
              isReady
                ? 'bg-cyan-100 text-cyan-700'
                : 'bg-amber-100 text-amber-700'
            "
          >
            {{ isReady ? t('pages.rules.statusReady') : t('pages.rules.statusNotReady') }}
          </span>
        </div>

        <div class="grid grid-cols-3 gap-2 text-[11px]">
          <div
            v-for="row in countRows"
            :key="row.key"
            class="rounded-md bg-zinc-50 px-2.5 py-2"
          >
            <div class="text-zinc-400">{{ row.label }}</div>
            <div class="mt-0.5 font-medium text-zinc-800 tabular-nums">
              {{ row.value.toLocaleString('zh-CN') }}
            </div>
          </div>
        </div>

        <div
          v-if="error"
          class="mt-3 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-[11px] text-amber-800"
        >
          {{ error }}
        </div>
        <div
          v-else-if="isReady"
          class="mt-3 flex items-center gap-2 text-[11px] text-emerald-600"
        >
          <span class="size-1.5 rounded-full bg-emerald-500" />
          {{ t('pages.rules.loadedOk') }}
        </div>
      </div>
    </div>
  </div>
</template>
