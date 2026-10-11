<script setup lang="ts">
import { Search } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { searchCodes, type CodeHit, type CodeTypeFilter } from '@/lib/rules/search'
import { useRulesStore } from '@/stores/rules'

const props = withDefaults(
  defineProps<{
    modelValue?: string
    name?: string
    type?: CodeTypeFilter
    placeholder?: string
    disabled?: boolean
  }>(),
  {
    modelValue: '',
    name: '',
    placeholder: '输入编码或名称...',
    disabled: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'update:name': [value: string]
  select: [hit: CodeHit]
}>()

const rulesStore = useRulesStore()
const open = ref(false)
const activeIndex = ref(0)
const query = ref(props.modelValue)

watch(
  () => props.modelValue,
  (v) => {
    if (v !== query.value) query.value = v
  },
)

const hits = computed(() => {
  const pack = rulesStore.pack
  if (!pack || !query.value.trim()) return [] as CodeHit[]
  return searchCodes(pack, query.value, 12, props.type)
})

function onInput(e: Event) {
  const v = (e.target as HTMLInputElement).value
  query.value = v
  emit('update:modelValue', v)
  emit('update:name', '')
  open.value = true
  activeIndex.value = 0
}

function pick(hit: CodeHit) {
  query.value = hit.code
  emit('update:modelValue', hit.code)
  emit('update:name', hit.name)
  emit('select', hit)
  open.value = false
}

function onKeydown(e: KeyboardEvent) {
  if (!open.value && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
    open.value = true
    return
  }
  if (!open.value || hits.value.length === 0) {
    if (e.key === 'Escape') open.value = false
    return
  }

  if (e.key === 'ArrowDown') {
    e.preventDefault()
    activeIndex.value = (activeIndex.value + 1) % hits.value.length
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    activeIndex.value =
      (activeIndex.value - 1 + hits.value.length) % hits.value.length
  } else if (e.key === 'Enter') {
    e.preventDefault()
    const hit = hits.value[activeIndex.value]
    if (hit) pick(hit)
  } else if (e.key === 'Escape') {
    open.value = false
  }
}

function onFocus() {
  if (query.value.trim()) open.value = true
}

function onBlur() {
  // Delay so mousedown on option can fire first
  window.setTimeout(() => {
    open.value = false
  }, 120)
}
</script>

<template>
  <div class="relative">
    <Search
      class="pointer-events-none absolute top-2.5 left-2.5 size-3.5 text-zinc-400"
    />
    <input
      :value="query"
      type="text"
      autocomplete="off"
      :disabled="disabled"
      :placeholder="placeholder"
      class="w-full rounded-md border border-zinc-200 py-2 pr-3 pl-8 font-mono text-[13px] text-zinc-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:opacity-60"
      @input="onInput"
      @keydown="onKeydown"
      @focus="onFocus"
      @blur="onBlur"
    >
    <div
      v-if="open && hits.length > 0"
      class="absolute right-0 left-0 z-20 mt-1 max-h-56 overflow-y-auto rounded-md border border-zinc-200 bg-white shadow-lg"
      role="listbox"
    >
      <button
        v-for="(hit, i) in hits"
        :key="`${hit.setId}:${hit.code}`"
        type="button"
        role="option"
        :aria-selected="i === activeIndex"
        class="w-full border-b border-zinc-100 px-3 py-2 text-left text-[12px] last:border-b-0"
        :class="i === activeIndex ? 'bg-cyan-50' : 'hover:bg-zinc-50'"
        @mousedown.prevent="pick(hit)"
      >
        <div class="font-mono text-cyan-700">{{ hit.code }}</div>
        <div class="truncate text-zinc-600">{{ hit.name }}</div>
      </button>
    </div>
  </div>
</template>
