<script setup lang="ts">
import AppSidebar from '@/components/AppSidebar.vue'
import AppTopbar from '@/components/AppTopbar.vue'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
</script>

<template>
  <SidebarProvider class="flex h-dvh! min-h-0! overflow-hidden bg-zinc-50">
    <AppSidebar />
    <SidebarInset class="min-h-0 min-w-0 overflow-hidden bg-zinc-50">
      <AppTopbar />
      <div class="flex min-h-0 flex-1 flex-col overflow-hidden">
        <router-view />
      </div>
    </SidebarInset>
  </SidebarProvider>
</template>
