<script setup lang="ts">
import { onMounted } from 'vue'
import AppSidebar from '@/components/AppSidebar.vue'
import AppTopbar from '@/components/AppTopbar.vue'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { useRulesStore } from '@/stores/rules'

const rulesStore = useRulesStore()

onMounted(() => {
  void rulesStore.bootstrap()
})
</script>

<template>
  <SidebarProvider class="flex h-dvh! min-h-0! overflow-hidden bg-zinc-50">
    <AppSidebar />
    <SidebarInset class="min-h-0 min-w-0 overflow-hidden bg-zinc-50">
      <AppTopbar />
      <div
        v-if="rulesStore.error"
        class="shrink-0 border-b border-red-200 bg-red-50 px-5 py-2 text-[12px] text-red-700"
        role="alert"
      >
        规则加载失败：{{ rulesStore.error }}
      </div>
      <div
        v-else-if="rulesStore.loading"
        class="shrink-0 border-b border-zinc-200 bg-zinc-100/80 px-5 py-2 text-[12px] text-zinc-500"
      >
        正在加载规则…
      </div>
      <div class="flex min-h-0 flex-1 flex-col overflow-hidden">
        <router-view />
      </div>
    </SidebarInset>
  </SidebarProvider>
</template>
