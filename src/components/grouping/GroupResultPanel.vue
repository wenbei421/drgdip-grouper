<script setup lang="ts">
import { Check, ChevronDown } from '@lucide/vue'
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { useCaseStore } from '@/stores/case'
import { useRulesStore } from '@/stores/rules'

const caseStore = useCaseStore()
const rulesStore = useRulesStore()
const { result } = storeToRefs(caseStore)
const { isReady } = storeToRefs(rulesStore)

const traceOpen = ref(true)

const stageLabel: Record<string, string> = {
  MDC: 'MDC 阶段',
  ADRG: 'ADRG 阶段',
  DRG: 'DRG 阶段',
  INPUT: '输入校验',
}

const failLabel = computed(() => {
  const r = result.value
  if (!r || r.ok) return ''
  const stage = r.failStage ? stageLabel[r.failStage] ?? r.failStage : '未知阶段'
  return `${stage}：${r.failReason ?? '未入组'}`
})
</script>

<template>
  <div class="space-y-4 p-5">
    <span class="text-[11px] font-medium tracking-wider text-zinc-400 uppercase">
      分组结果
    </span>

    <div
      v-if="!isReady"
      class="rounded-md border border-dashed border-zinc-200 bg-white px-3 py-8 text-center text-[13px] text-zinc-400"
    >
      规则未就绪，暂无法分组
    </div>

    <div
      v-else-if="!result"
      class="rounded-md border border-dashed border-zinc-200 bg-white px-3 py-8 text-center text-[13px] text-zinc-400"
    >
      填写病例并执行分组预演后，结果将显示在此
    </div>

    <template v-else>
      <!-- 三级路径 -->
      <Card class="gap-0 rounded-lg border-zinc-200 py-0 shadow-none">
        <CardHeader class="flex flex-row items-center justify-between px-5 py-4">
          <span class="text-[11px] font-medium tracking-wider text-zinc-400 uppercase">
            分组路径
          </span>
          <Badge
            v-if="result.ok"
            class="rounded border-0 bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700"
          >
            <Check class="size-3" />
            已入组
          </Badge>
          <Badge
            v-else
            class="rounded border-0 bg-rose-100 px-2 py-0.5 text-[10px] font-medium text-rose-700"
          >
            未入组
          </Badge>
        </CardHeader>
        <CardContent class="px-5 pb-5">
          <div class="flex items-stretch gap-2">
            <div class="flex-1 rounded-lg border border-zinc-200 bg-zinc-50 p-3.5">
              <div class="mb-1 text-[10px] text-zinc-400">MDC</div>
              <div class="font-mono text-[15px] font-semibold text-zinc-900">
                {{ result.mdc?.code ?? '—' }}
              </div>
              <div class="mt-0.5 text-[11px] leading-snug text-zinc-500">
                {{ result.mdc?.name ?? '未锁定' }}
              </div>
            </div>
            <div class="flex items-center text-zinc-300">
              <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="m9 6 6 6-6 6" /></svg>
            </div>
            <div class="flex-1 rounded-lg border border-zinc-200 bg-zinc-50 p-3.5">
              <div class="mb-1 text-[10px] text-zinc-400">ADRG</div>
              <div class="font-mono text-[15px] font-semibold text-zinc-900">
                {{ result.adrg?.code ?? '—' }}
              </div>
              <div class="mt-0.5 text-[11px] leading-snug text-zinc-500">
                {{ result.adrg?.name ?? '未锁定' }}
              </div>
            </div>
            <div class="flex items-center text-zinc-300">
              <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="m9 6 6 6-6 6" /></svg>
            </div>
            <div
              class="flex-1 rounded-lg border p-3.5"
              :class="
                result.ok
                  ? 'border-cyan-200 bg-cyan-50 ring-1 ring-cyan-500/10'
                  : 'border-zinc-200 bg-zinc-50'
              "
            >
              <div
                class="mb-1 text-[10px]"
                :class="result.ok ? 'text-cyan-600' : 'text-zinc-400'"
              >
                DRG
              </div>
              <div
                class="font-mono text-[15px] font-semibold"
                :class="result.ok ? 'text-cyan-800' : 'text-zinc-900'"
              >
                {{ result.drg?.code ?? '—' }}
              </div>
              <div
                class="mt-0.5 text-[11px] leading-snug"
                :class="result.ok ? 'text-cyan-700' : 'text-zinc-500'"
              >
                {{ result.drg?.name ?? '未锁定' }}
              </div>
            </div>
          </div>

          <div
            v-if="!result.ok && failLabel"
            class="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700"
          >
            {{ failLabel }}
          </div>
        </CardContent>
      </Card>

      <!-- CC / MCC -->
      <Card class="gap-0 overflow-hidden rounded-lg border-zinc-200 py-0 shadow-none">
        <div class="flex items-center justify-between border-b border-zinc-100 px-5 py-3.5">
          <span class="text-[12px] font-semibold text-zinc-900">CC / MCC 触发明细</span>
          <span class="text-[11px] text-zinc-400">
            {{ result.ccHits.length }} 条触发
          </span>
        </div>
        <div v-if="result.ccHits.length === 0" class="px-5 py-4 text-[12px] text-zinc-400">
          本次未触发 CC / MCC
        </div>
        <div v-else class="divide-y divide-zinc-100">
          <div
            v-for="hit in result.ccHits"
            :key="hit.code"
            class="flex items-center gap-3 px-5 py-3"
          >
            <span class="w-20 shrink-0 font-mono text-[12px] text-zinc-900">
              {{ hit.code }}
            </span>
            <span class="min-w-0 flex-1 truncate text-[12px] text-zinc-600">
              {{ hit.name }}
            </span>
            <Badge
              v-if="hit.kind === 'MCC'"
              class="rounded border-0 bg-rose-100 px-2 py-0.5 text-[10px] font-medium text-rose-700"
            >
              MCC 触发
            </Badge>
            <Badge
              v-else
              class="rounded border-0 bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700"
            >
              CC 触发
            </Badge>
          </div>
        </div>
      </Card>

      <!-- 规则追溯 -->
      <Card class="gap-0 overflow-hidden rounded-lg border-zinc-200 py-0 shadow-none">
        <Collapsible v-model:open="traceOpen">
          <CollapsibleTrigger
            class="flex w-full items-center justify-between px-5 py-3.5 transition hover:bg-zinc-50"
          >
            <span class="text-[12px] font-semibold text-zinc-900">规则追溯</span>
            <ChevronDown
              class="size-4 text-zinc-400 transition-transform"
              :class="traceOpen ? 'rotate-180' : ''"
            />
          </CollapsibleTrigger>
          <CollapsibleContent class="border-t border-zinc-100 px-5 pt-3.5 pb-4">
            <div
              v-if="result.trace.length === 0"
              class="text-[12px] text-zinc-400"
            >
              无追溯记录
            </div>
            <ul v-else class="space-y-2">
              <li
                v-for="(line, i) in result.trace"
                :key="i"
                class="font-mono text-[11px] leading-relaxed break-all text-zinc-700"
              >
                {{ line }}
              </li>
            </ul>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      <!-- warnings -->
      <div
        v-if="result.warnings.length > 0"
        class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3"
      >
        <div class="mb-1.5 text-[12px] font-semibold text-amber-900">警告</div>
        <ul class="list-inside list-disc space-y-1 text-[11px] text-amber-800">
          <li v-for="(w, i) in result.warnings" :key="i">{{ w }}</li>
        </ul>
      </div>
    </template>
  </div>
</template>
