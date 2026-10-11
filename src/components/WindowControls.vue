<script setup lang="ts">
import { getCurrentWindow } from '@tauri-apps/api/window'
import { Minus, Square, X } from '@lucide/vue'
import { onMounted, onUnmounted, ref } from 'vue'

const maximized = ref(false)
let unlistenResize: (() => void) | undefined

async function refreshMaximized() {
  try {
    maximized.value = await getCurrentWindow().isMaximized()
  } catch {
    maximized.value = false
  }
}

async function minimize() {
  await getCurrentWindow().minimize()
}

async function toggleMaximize() {
  await getCurrentWindow().toggleMaximize()
  await refreshMaximized()
}

async function close() {
  await getCurrentWindow().close()
}

onMounted(async () => {
  await refreshMaximized()
  try {
    unlistenResize = await getCurrentWindow().onResized(() => {
      void refreshMaximized()
    })
  } catch {
    // browser / non-tauri
  }
})

onUnmounted(() => {
  unlistenResize?.()
})
</script>

<template>
  <div class="no-drag flex h-full shrink-0 items-stretch self-stretch">
    <button
      type="button"
      class="flex h-full w-11 items-center justify-center text-zinc-600 transition-colors hover:bg-zinc-100"
      title="最小化"
      aria-label="最小化"
      @click="minimize"
    >
      <Minus class="size-3.5" :stroke-width="2" />
    </button>
    <button
      type="button"
      class="flex h-full w-11 items-center justify-center text-zinc-600 transition-colors hover:bg-zinc-100"
      :title="maximized ? '向下还原' : '最大化'"
      :aria-label="maximized ? '向下还原' : '最大化'"
      @click="toggleMaximize"
    >
      <svg
        v-if="maximized"
        class="size-3.5"
        viewBox="0 0 12 12"
        aria-hidden="true"
      >
        <rect
          x="3.25"
          y="3.25"
          width="6.5"
          height="6.5"
          fill="none"
          stroke="currentColor"
          stroke-width="1.25"
        />
        <path
          d="M4.5 3.25V2.5h5.25v5.25H9"
          fill="none"
          stroke="currentColor"
          stroke-width="1.25"
        />
      </svg>
      <Square
        v-else
        class="size-3"
        :stroke-width="2"
      />
    </button>
    <button
      type="button"
      class="flex h-full w-11 items-center justify-center text-zinc-600 transition-colors hover:bg-red-500 hover:text-white"
      title="关闭"
      aria-label="关闭"
      @click="close"
    >
      <X class="size-3.5" :stroke-width="2" />
    </button>
  </div>
</template>
