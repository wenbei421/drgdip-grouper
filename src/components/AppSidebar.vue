<script setup lang="ts">
import type { Component } from 'vue'
import {
  Activity,
  ArrowLeftRight,
  Database,
  Download,
  Search,
} from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

interface NavItem {
  titleKey: string
  path: string
  icon: Component
}

const navItems: NavItem[] = [
  { titleKey: 'nav.single', path: '/single', icon: Search },
  { titleKey: 'nav.batch', path: '/batch', icon: Download },
  { titleKey: 'nav.compare', path: '/compare', icon: ArrowLeftRight },
  { titleKey: 'nav.rules', path: '/rules', icon: Database },
]

function isActive(path: string) {
  return route.path === path
}
</script>

<template>
  <Sidebar collapsible="none" class="w-56! border-r border-zinc-200 bg-white">
    <SidebarHeader class="h-14 justify-center border-b border-zinc-200 px-4">
      <div class="flex items-center gap-2.5">
        <div class="flex size-7 items-center justify-center rounded-md bg-gradient-to-br from-cyan-500 to-blue-600">
          <Activity class="size-4 text-white" :stroke-width="2.5" />
        </div>
        <div class="leading-tight">
          <div class="text-[13px] font-semibold text-zinc-900">
            {{ t('brand.name') }}
          </div>
          <div class="text-[10px] text-zinc-400">
            {{ t('brand.subtitle') }}
          </div>
        </div>
      </div>
    </SidebarHeader>

    <SidebarContent>
      <SidebarGroup class="p-2">
        <SidebarGroupContent>
          <SidebarMenu class="gap-0.5">
            <SidebarMenuItem v-for="item in navItems" :key="item.path">
              <SidebarMenuButton
                :is-active="isActive(item.path)"
                class="h-auto rounded-md px-3 py-2 text-[13px] font-medium text-zinc-700 hover:bg-zinc-100 data-[active=true]:bg-zinc-100 data-[active=true]:font-semibold data-[active=true]:text-zinc-900"
                @click="router.push(item.path)"
              >
                <component :is="item.icon" class="size-4" />
                <span>{{ t(item.titleKey) }}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>

    <SidebarFooter class="border-t border-zinc-200 p-3">
      <div class="flex items-center gap-2 text-[11px] text-zinc-500">
        <span class="size-1.5 rounded-full bg-emerald-500" />
        {{ t('sidebar.offline') }}
      </div>
    </SidebarFooter>
  </Sidebar>
</template>
