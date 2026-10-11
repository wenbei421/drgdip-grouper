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
import {
  buildCaseSetMemberships,
  extractSetIdsFromRules,
} from '@/lib/engine/set-membership'
import { useCaseStore } from '@/stores/case'
import { useRulesStore } from '@/stores/rules'

const caseStore = useCaseStore()
const rulesStore = useRulesStore()
const { result, input, names } = storeToRefs(caseStore)
const { isReady, pack } = storeToRefs(rulesStore)

const traceOpen = ref(true)

const stageLabel: Record<string, string> = {
  MDC: '大类匹配',
  ADRG: '核心病组匹配',
  DRG: '细分组匹配',
  INPUT: '输入校验',
}

function traceTone(line: string): string {
  if (line.includes('→ 命中') || line.includes('→ 入组') || line.includes('→ 进入')) {
    return 'text-emerald-700'
  }
  if (line.includes('→ 未命中')) {
    return 'text-zinc-500'
  }
  return 'text-zinc-700'
}

const failLabel = computed(() => {
  const r = result.value
  if (!r || r.ok) return ''
  const stage = r.failStage ? stageLabel[r.failStage] ?? r.failStage : '未知阶段'
  return `${stage}：${r.failReason ?? '未入组'}`
})

/** 命中路径上用到的集合，用于高亮 */
const hitPathSets = computed(() => {
  const r = result.value
  if (!r) return new Set<string>()
  return extractSetIdsFromRules(r.mdc?.rule, r.adrg?.rule, r.drg?.rule)
})

const memberships = computed(() => {
  if (!pack.value || !result.value) return []
  return buildCaseSetMemberships(pack.value, input.value, names.value)
})

function setBadgeClass(setId: string): string {
  if (hitPathSets.value.has(setId.toUpperCase())) {
    return 'rounded border-0 bg-cyan-100 px-1.5 py-0.5 font-mono text-[10px] font-medium text-cyan-800'
  }
  return 'rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-mono text-[10px] text-zinc-600'
}
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
              <div class="mb-1 text-[10px] text-zinc-400">大类（MDC）</div>
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
              <div class="mb-1 text-[10px] text-zinc-400">核心病组（ADRG）</div>
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
                细分组（DRG）
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
          <span class="text-[12px] font-semibold text-zinc-900">并发症 / 严重并发症触发明细</span>
          <span class="text-[11px] text-zinc-400">
            {{ result.ccHits.length }} 条触发
          </span>
        </div>
        <div v-if="result.ccHits.length === 0" class="px-5 py-4 text-[12px] text-zinc-400">
          本次未触发一般并发症（CC）或严重并发症（MCC）
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
              严重并发症（MCC）
            </Badge>
            <Badge
              v-else
              class="rounded border-0 bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700"
            >
              一般并发症（CC）
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
            <span class="text-[12px] font-semibold text-zinc-900">入组过程说明</span>
            <ChevronDown
              class="size-4 text-zinc-400 transition-transform"
              :class="traceOpen ? 'rotate-180' : ''"
            />
          </CollapsibleTrigger>
          <CollapsibleContent class="border-t border-zinc-100 px-5 pt-3.5 pb-4">
            <p class="mb-3 text-[11px] leading-relaxed text-zinc-500">
              按官方规则从上到下尝试；「未命中」表示该组不符合，继续往下找，「命中 / 入组」为最终结果。
              青色标签为本次命中路径实际用到的集合。
            </p>

            <!-- 诊断 / 手术所属集合 -->
            <div
              v-if="memberships.length > 0"
              class="mb-4 rounded-lg border border-zinc-200 bg-zinc-50/80 px-3.5 py-3"
            >
              <div class="mb-2 text-[12px] font-semibold text-zinc-900">
                诊断与手术所属集合
              </div>
              <ul class="space-y-3">
                <li
                  v-for="row in memberships"
                  :key="`${row.role}-${row.code}`"
                  class="text-[12px]"
                >
                  <div class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span class="shrink-0 font-medium text-zinc-800">{{ row.role }}</span>
                    <span class="font-mono text-zinc-900">{{ row.code }}</span>
                    <span
                      v-if="row.name"
                      class="min-w-0 truncate text-[11px] text-zinc-500"
                    >
                      {{ row.name }}
                    </span>
                  </div>
                  <div
                    v-if="row.sets.length === 0"
                    class="mt-1 text-[11px] text-zinc-400"
                  >
                    未出现在任何规则集合中
                  </div>
                  <div v-else class="mt-1.5 flex flex-wrap gap-1">
                    <span
                      v-for="setId in row.sets"
                      :key="setId"
                      :class="setBadgeClass(setId)"
                      :title="hitPathSets.has(setId.toUpperCase()) ? '本次入组路径用到' : '所属集合'"
                    >
                      {{ setId }}
                    </span>
                  </div>
                </li>
              </ul>
            </div>

            <div class="mb-2 text-[12px] font-semibold text-zinc-900">
              匹配步骤
            </div>
            <div
              v-if="result.trace.length === 0"
              class="text-[12px] text-zinc-400"
            >
              无追溯记录
            </div>
            <ul v-else class="max-h-80 space-y-2 overflow-y-auto">
              <li
                v-for="(line, i) in result.trace"
                :key="i"
                class="text-[12px] leading-relaxed break-words"
                :class="traceTone(line)"
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
