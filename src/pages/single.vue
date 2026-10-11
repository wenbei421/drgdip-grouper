<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <div class="grid min-h-0 flex-1 grid-cols-[minmax(380px,460px)_1fr]">
    <section class="overflow-y-auto border-r border-zinc-200 bg-white">
      <div class="space-y-4 p-5">
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-medium tracking-wider text-zinc-400 uppercase">
            {{ t('pages.single.inputTitle') }}
          </span>
          <button
            type="button"
            class="text-[11px] font-medium text-cyan-600 hover:text-cyan-700"
            disabled
          >
            载入示例
          </button>
        </div>
        <p class="rounded-md border border-dashed border-zinc-200 bg-zinc-50 px-3 py-8 text-center text-[13px] text-zinc-400">
          {{ t('pages.single.inputPlaceholder') }}
        </p>
      </div>
    </section>

    <section class="min-w-0 overflow-y-auto">
      <div class="space-y-4 p-5">
        <span class="text-[11px] font-medium tracking-wider text-zinc-400 uppercase">
          {{ t('pages.single.resultTitle') }}
        </span>
        <p class="rounded-md border border-dashed border-zinc-200 bg-white px-3 py-8 text-center text-[13px] text-zinc-400">
          {{ t('pages.single.resultPlaceholder') }}
        </p>
      </div>
    </section>
  </div>
</template>
