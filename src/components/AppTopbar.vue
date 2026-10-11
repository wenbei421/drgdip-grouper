<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { Separator } from '@/components/ui/separator'

const { t } = useI18n()
const route = useRoute()

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
</script>

<template>
  <header
    class="flex h-14 shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-5"
  >
    <h1 class="text-[15px] font-semibold text-zinc-900">
      {{ pageTitle }}
    </h1>

    <div class="flex items-center gap-3">
      <div class="flex items-center gap-2">
        <span class="text-[11px] text-zinc-500">{{ t('topbar.ruleVersion') }}</span>
        <span
          class="rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-[12px] text-zinc-600"
        >
          {{ t('topbar.ruleVersionPlaceholder') }}
        </span>
      </div>
      <Separator orientation="vertical" class="h-5!" />
      <span class="text-[12px] text-zinc-500">{{ t('topbar.locale') }}</span>
    </div>
  </header>
</template>
