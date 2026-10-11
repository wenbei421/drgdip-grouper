<script setup lang="ts">
import { getCurrentWindow } from '@tauri-apps/api/window'
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import WindowControls from '@/components/WindowControls.vue'
import { Separator } from '@/components/ui/separator'
import { useRulesStore } from '@/stores/rules'

const { t } = useI18n()
const route = useRoute()
const { summary, error, isReady } = storeToRefs(useRulesStore())

const titleKeyMap: Record<string, string> = {
  single: 'nav.single',
  batch: 'nav.batch',
  compare: 'nav.compare',
  rules: 'nav.rules',
}

const pageTitle = computed(() => {
  const name = typeof route.name === 'string' ? route.name : 'single'
  return t(titleKeyMap[name] ?? 'nav.single')
})

const versionLabel = computed(() => {
  if (error.value) return t('topbar.ruleLoadFailed')
  if (isReady.value && summary.value) return summary.value.name
  return t('topbar.ruleVersionPlaceholder')
})

async function onDragDblClick() {
  try {
    await getCurrentWindow().toggleMaximize()
  } catch {
    // ignore in browser
  }
}
</script>

<template>
  <header
    class="flex h-11 shrink-0 items-stretch border-b border-zinc-200 bg-white"
    data-tauri-drag-region
    @dblclick="onDragDblClick"
  >
    <div
      class="flex min-w-0 flex-1 items-center justify-between px-5"
      data-tauri-drag-region
    >
      <h1 class="pointer-events-none text-[15px] font-semibold text-zinc-900">
        {{ pageTitle }}
      </h1>

      <div class="no-drag flex items-center gap-3">
        <div class="flex items-center gap-2">
          <span class="text-[11px] text-zinc-500">{{ t('topbar.ruleVersion') }}</span>
          <span
            class="rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-[12px] text-zinc-600"
            :class="error ? 'border-red-200 text-red-600' : undefined"
          >
            {{ versionLabel }}
          </span>
        </div>
        <Separator orientation="vertical" class="h-5!" />
        <span class="text-[12px] text-zinc-500">{{ t('topbar.locale') }}</span>
      </div>
    </div>

    <WindowControls class="h-11" />
  </header>
</template>
