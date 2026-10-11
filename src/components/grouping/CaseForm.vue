<script setup lang="ts">
import { ArrowRight, Plus, X } from '@lucide/vue'
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import CodeCombobox from '@/components/grouping/CodeCombobox.vue'
import { normalizeCode } from '@/lib/engine/normalize'
import { useCaseStore } from '@/stores/case'
import { useRulesStore } from '@/stores/rules'

const router = useRouter()
const caseStore = useCaseStore()
const rulesStore = useRulesStore()
const { input, names, canGroup } = storeToRefs(caseStore)
const { pack, isReady, loading } = storeToRefs(rulesStore)

const forceNeonatal = ref(false)

const leaveOptions = [
  { value: '1', label: '医嘱离院' },
  { value: '2', label: '医嘱转院' },
  { value: '3', label: '死亡' },
  { value: '4', label: '其他' },
]

function ccKindFor(code: string): 'CC' | 'MCC' | null {
  if (!pack.value || !code.trim()) return null
  const norm = normalizeCode(code)
  for (const [c, entry] of pack.value.ccByCode) {
    if (normalizeCode(c) === norm || normalizeCode(entry.code) === norm) {
      return entry.kind
    }
  }
  return null
}

const ageModel = computed({
  get: () => (input.value.age == null ? '' : String(input.value.age)),
  set: (v: string) => {
    const n = Number(v)
    input.value.age = v.trim() === '' || Number.isNaN(n) ? null : n
  },
})

const showNeonatal = computed(
  () => forceNeonatal.value || (input.value.age != null && input.value.age < 1),
)

function extraNum(key: string): string {
  const v = input.value.extras[key]
  if (v == null || v === '') return ''
  return String(v)
}

function setExtraNum(key: string, raw: string) {
  const t = raw.trim()
  if (t === '') {
    delete input.value.extras[key]
    return
  }
  const n = Number(t)
  input.value.extras[key] = Number.isNaN(n) ? t : n
}

function onPrimaryDx(code: string, name: string) {
  caseStore.setPrimaryDx(code, name)
}

function onPrimaryProc(code: string, name: string) {
  caseStore.setPrimaryProc(code, name)
}

function onSecondary(index: number, code: string, name: string) {
  caseStore.setSecondaryDx(index, code, name)
}

function onSecondaryProc(index: number, code: string, name: string) {
  caseStore.setSecondaryProc(index, code, name)
}

function goRules() {
  void router.push('/rules')
}
</script>

<template>
  <div class="space-y-4 p-5">
    <div class="flex items-center justify-between">
      <span class="text-[11px] font-medium tracking-wider text-zinc-400 uppercase">
        病例输入
      </span>
      <button
        type="button"
        class="text-[11px] font-medium text-cyan-600 hover:text-cyan-700 disabled:opacity-40"
        :disabled="!isReady"
        @click="caseStore.loadDemo()"
      >
        载入示例
      </button>
    </div>

    <div
      v-if="!isReady"
      class="rounded-md border border-amber-200 bg-amber-50 px-3 py-3 text-[12px] text-amber-800"
    >
      <p v-if="loading">正在加载规则，请稍候…</p>
      <template v-else>
        <p>请先在规则管理导入或等待内置规则初始化。</p>
        <button
          type="button"
          class="mt-2 text-[12px] font-medium text-cyan-700 hover:text-cyan-800"
          @click="goRules"
        >
          前往规则管理 →
        </button>
      </template>
    </div>

    <fieldset :disabled="!isReady" class="space-y-4 disabled:opacity-60">
      <!-- 主要诊断 -->
      <div class="space-y-1.5">
        <label class="flex items-center gap-1 text-[12px] font-medium text-zinc-700">
          主要诊断 <span class="text-rose-500">*</span>
        </label>
        <CodeCombobox
          :model-value="input.ZYZD"
          :name="names.ZYZD"
          type="DI"
          @update:model-value="onPrimaryDx($event, '')"
          @update:name="names.ZYZD = $event"
          @select="onPrimaryDx($event.code, $event.name)"
        />
        <div v-if="names.ZYZD" class="pl-1 text-[11px] text-zinc-500">
          {{ names.ZYZD }}
        </div>
      </div>

      <!-- 主要手术 -->
      <div class="space-y-1.5">
        <label class="text-[12px] font-medium text-zinc-700">
          主要手术操作
        </label>
        <CodeCombobox
          :model-value="input.ZYSS"
          :name="names.ZYSS"
          type="OP"
          @update:model-value="onPrimaryProc($event, '')"
          @update:name="names.ZYSS = $event"
          @select="onPrimaryProc($event.code, $event.name)"
        />
        <div v-if="names.ZYSS" class="pl-1 text-[11px] text-zinc-500">
          {{ names.ZYSS }}
        </div>
      </div>

      <!-- 其他诊断 -->
      <div class="space-y-1.5">
        <label class="text-[12px] font-medium text-zinc-700">其他诊断</label>
        <div class="space-y-1.5">
          <div
            v-for="(code, index) in input.QTZD"
            :key="index"
            class="group space-y-1"
          >
            <div class="flex items-start gap-2">
              <div class="min-w-0 flex-1">
                <CodeCombobox
                  :model-value="code"
                  :name="names.QTZD[index] ?? ''"
                  type="DI"
                  @update:model-value="onSecondary(index, $event, '')"
                  @update:name="names.QTZD[index] = $event"
                  @select="onSecondary(index, $event.code, $event.name)"
                />
              </div>
              <span
                v-if="ccKindFor(code) === 'MCC'"
                class="mt-1.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium bg-rose-100 text-rose-700"
              >MCC</span>
              <span
                v-else-if="ccKindFor(code) === 'CC'"
                class="mt-1.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700"
              >CC</span>
              <button
                type="button"
                class="mt-1.5 text-zinc-300 transition hover:text-rose-500"
                aria-label="移除诊断"
                @click="caseStore.removeSecondaryDx(index)"
              >
                <X class="size-3.5" />
              </button>
            </div>
            <div
              v-if="names.QTZD[index]"
              class="pl-1 text-[11px] text-zinc-500"
            >
              {{ names.QTZD[index] }}
            </div>
          </div>

          <button
            type="button"
            class="flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-zinc-300 py-1.5 text-[12px] text-zinc-500 transition hover:border-cyan-500 hover:text-cyan-600"
            @click="caseStore.addSecondaryDx()"
          >
            <Plus class="size-3.5" />
            添加诊断
          </button>
        </div>
      </div>

      <!-- 其他手术 -->
      <div class="space-y-1.5">
        <label class="text-[12px] font-medium text-zinc-700">其他手术操作</label>
        <div class="space-y-1.5">
          <div
            v-for="(code, index) in input.QTSS"
            :key="index"
            class="group space-y-1"
          >
            <div class="flex items-start gap-2">
              <div class="min-w-0 flex-1">
                <CodeCombobox
                  :model-value="code"
                  :name="names.QTSS[index] ?? ''"
                  type="OP"
                  @update:model-value="onSecondaryProc(index, $event, '')"
                  @update:name="names.QTSS[index] = $event"
                  @select="onSecondaryProc(index, $event.code, $event.name)"
                />
              </div>
              <button
                type="button"
                class="mt-1.5 text-zinc-300 transition hover:text-rose-500"
                aria-label="移除手术"
                @click="caseStore.removeSecondaryProc(index)"
              >
                <X class="size-3.5" />
              </button>
            </div>
            <div
              v-if="names.QTSS[index]"
              class="pl-1 text-[11px] text-zinc-500"
            >
              {{ names.QTSS[index] }}
            </div>
          </div>

          <button
            type="button"
            class="flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-zinc-300 py-1.5 text-[12px] text-zinc-500 transition hover:border-cyan-500 hover:text-cyan-600"
            @click="caseStore.addSecondaryProc()"
          >
            <Plus class="size-3.5" />
            添加手术
          </button>
        </div>
      </div>

      <!-- 患者信息 -->
      <div class="space-y-1.5">
        <label class="text-[12px] font-medium text-zinc-700">患者信息</label>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <div class="mb-1 text-[10px] text-zinc-400">性别</div>
            <select
              v-model="input.sex"
              class="w-full rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-[12px] outline-none focus:border-cyan-500"
            >
              <option value="">未填写</option>
              <option value="1">男</option>
              <option value="2">女</option>
            </select>
          </div>
          <div>
            <div class="mb-1 flex items-center justify-between text-[10px] text-zinc-400">
              <span>年龄</span>
              <label class="flex items-center gap-1 text-zinc-500">
                <input
                  v-model="forceNeonatal"
                  type="checkbox"
                  class="size-3 rounded border-zinc-300"
                >
                新生儿
              </label>
            </div>
            <input
              v-model="ageModel"
              type="number"
              min="0"
              max="150"
              class="w-full rounded-md border border-zinc-200 px-2.5 py-1.5 text-[12px] outline-none focus:border-cyan-500"
            >
          </div>
          <template v-if="showNeonatal">
            <div>
              <div class="mb-1 text-[10px] text-zinc-400">新生儿体重 (XSRTZ)</div>
              <input
                type="number"
                min="0"
                :value="extraNum('XSRTZ')"
                class="w-full rounded-md border border-zinc-200 px-2.5 py-1.5 text-[12px] outline-none focus:border-cyan-500"
                @input="setExtraNum('XSRTZ', ($event.target as HTMLInputElement).value)"
              >
            </div>
            <div>
              <div class="mb-1 text-[10px] text-zinc-400">新生儿日龄 (XSRTL)</div>
              <input
                type="number"
                min="0"
                :value="extraNum('XSRTL')"
                class="w-full rounded-md border border-zinc-200 px-2.5 py-1.5 text-[12px] outline-none focus:border-cyan-500"
                @input="setExtraNum('XSRTL', ($event.target as HTMLInputElement).value)"
              >
            </div>
          </template>
          <div class="col-span-2">
            <div class="mb-1 text-[10px] text-zinc-400">离院方式</div>
            <select
              v-model="input.leaveType"
              class="w-full rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-[12px] outline-none focus:border-cyan-500"
            >
              <option
                v-for="opt in leaveOptions"
                :key="opt.value"
                :value="opt.value"
              >
                {{ opt.label }}
              </option>
            </select>
          </div>
        </div>
      </div>

      <button
        type="button"
        class="flex w-full items-center justify-center gap-2 rounded-md bg-zinc-900 py-2.5 text-[13px] font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
        :disabled="!canGroup"
        @click="caseStore.group()"
      >
        <ArrowRight class="size-4" />
        执行分组预演
      </button>
    </fieldset>
  </div>
</template>
