<script setup lang="ts">
import type { Component } from 'vue'
import {
  Database,
  Search,
} from '@lucide/vue'
import { getCurrentWindow } from '@tauri-apps/api/window'
import appIcon from '@/assets/app-icon.png'
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

/** 未实现功能（批量预演、版本对比）先不展示，路由保留以便后续启用 */
const navItems: NavItem[] = [
  { titleKey: 'nav.single', path: '/single', icon: Search },
  { titleKey: 'nav.rules', path: '/rules', icon: Database },
]

function isActive(path: string) {
  return route.path === path
}

async function onBrandDblClick() {
  try {
    await getCurrentWindow().toggleMaximize()
  } catch {
    // ignore in browser
  }
}
</script>

<template>
  <Sidebar collapsible="none" class="w-56! border-r border-zinc-200 bg-white">
    <SidebarHeader
      class="h-11 justify-center border-b border-zinc-200 px-4"
      data-tauri-drag-region
      @dblclick="onBrandDblClick"
    >
      <div class="flex items-center gap-2.5" data-tauri-drag-region>
        <img
          :src="appIcon"
          alt=""
          class="pointer-events-none size-6 shrink-0 rounded-md shadow-sm ring-1 ring-zinc-200/80"
          data-tauri-drag-region
        >
        <div class="leading-tight" data-tauri-drag-region>
          <div class="pointer-events-none text-[13px] font-semibold text-zinc-900">
            {{ t('brand.name') }}
          </div>
          <div class="pointer-events-none text-[10px] text-zinc-400">
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
