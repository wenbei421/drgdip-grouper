<script setup lang="ts">
import { ref } from 'vue'
import { invoke } from '@tauri-apps/api/core'

const greetMsg = ref('')
const name = ref('')

async function greet() {
  greetMsg.value = await invoke('greet', { name: name.value })
}
</script>

<template>
  <main class="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-4 px-6 text-center">
    <h1 class="text-2xl font-semibold tracking-tight">
      DRG/DIP 3.0 分组预演工具
    </h1>
    <p class="text-sm text-neutral-600">
      Tauri + Vue 脚手架已就绪
    </p>
    <form class="flex gap-2" @submit.prevent="greet">
      <input
        id="greet-input"
        v-model="name"
        class="rounded border border-neutral-300 px-3 py-2 text-sm"
        placeholder="输入名称..."
      >
      <button
        type="submit"
        class="rounded bg-neutral-900 px-3 py-2 text-sm text-white"
      >
        Greet
      </button>
    </form>
    <p class="text-sm">{{ greetMsg }}</p>
  </main>
</template>
