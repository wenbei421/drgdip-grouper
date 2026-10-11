<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <div class="flex flex-1 items-center justify-center p-8">
    <p class="text-[13px] text-zinc-500">
      {{ t('pages.compare.empty') }}
    </p>
  </div>
</template>
