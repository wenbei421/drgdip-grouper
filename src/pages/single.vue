<script setup lang="ts">
import CaseForm from '@/components/grouping/CaseForm.vue'
import GroupResultPanel from '@/components/grouping/GroupResultPanel.vue'
</script>

<template>
  <div class="grid min-h-0 flex-1 grid-cols-[minmax(380px,460px)_1fr]">
    <section class="overflow-y-auto border-r border-zinc-200 bg-white">
      <CaseForm />
    </section>

    <section class="min-w-0 overflow-y-auto bg-zinc-50">
      <GroupResultPanel />
    </section>
  </div>
</template>
