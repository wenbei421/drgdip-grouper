# DRG/DIP 3.0 分组预演工具 MVP 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 交付可运行的离线 Tauri 桌面应用：导入官方 CHS-DRG 3.0 Excel 至 SQLite，单病例完成 MDC→ADRG→DRG 预演并展示 CC/MCC 与规则追溯。

**架构：** 参照拾序新建干净工程（不拷贝业务）。Rust/sqlx 负责 Excel 导入与 SQLite；前端将活动规则版本加载为内存索引；纯 TypeScript 表达式引擎按官方 DSL 求值。UI 按需求原型：侧栏四页 + 单病例左右分栏。

**技术栈：** Tauri v2、Vue 3、TypeScript、Vite、pnpm、shadcn-vue、Tailwind CSS v4、Pinia、Vue Router、Vue I18n、sqlx (SQLite)、calamine、Vitest

**规格：** `docs/superpowers/specs/2026-10-11-drgdip-mvp-design.md`

---

## 文件结构（将创建）

```
package.json
pnpm-lock.yaml
vite.config.ts
vitest.config.ts
tsconfig.json
tsconfig.app.json
tsconfig.node.json
components.json
index.html
.gitignore
README.md
src/
  main.ts
  App.vue
  env.d.ts
  assets/css/tailwind.css
  router/index.ts
  i18n/index.ts
  i18n/locales/zh-CN.ts
  components/AppSidebar.vue
  components/AppTopbar.vue
  components/ui/...          # shadcn-vue：button, badge, card, input, select, collapsible, command, sidebar 等
  components/grouping/
    CodeCombobox.vue
    CaseForm.vue
    GroupResultPanel.vue
  pages/
    single.vue
    batch.vue
    compare.vue
    rules.vue
  stores/
    rules.ts
    case.ts
  lib/utils.ts
  lib/engine/
    types.ts
    normalize.ts
    dsl.ts
    cc.ts
    grouper.ts
    fixtures/mini-rules.ts
  lib/engine/*.test.ts
  lib/rules/
    api.ts
    search.ts
src-tauri/
  Cargo.toml
  tauri.conf.json
  capabilities/default.json
  migrations/001_init.sql
  resources/rules/
    chs-drg-3.0.xlsx          # 自 Downloads 复制
    dip-3.0.xlsx              # 仅归档
  src/
    lib.rs
    main.rs
    db.rs
    import_drg.rs
    commands.rs
    error.rs
docs/                          # 已存在
```

---

### 任务 1：初始化 Git 与前端/Tauri 脚手架

**文件：**
- 创建：上表根配置与 `src-tauri` 骨架
- 参考：`D:\Study\拾序\shixu` 的 `package.json`、`vite.config.ts`、`components.json`、`src-tauri/Cargo.toml`（只对齐工具链，不复制业务）

- [ ] **步骤 1：初始化仓库与忽略规则**

```bash
cd "D:/Study/DRGDIP3.0分组预演工具"
git init
```

`.gitignore` 至少包含：

```
node_modules/
dist/
src-tauri/target/
.superpowers/
*.local
.DS_Store
```

- [ ] **步骤 2：用官方脚手架生成 Vue+TS Tauri 工程到临时目录后合并进本仓根**

```bash
pnpm create tauri-app@latest _scaffold -- --template vue-ts --manager pnpm --yes
```

将 `_scaffold` 内文件移到仓库根（保留已有 `docs/`），删除 `_scaffold`。应用名：`drgdip-grouper`；窗口标题：`DRG/DIP 3.0 分组预演工具`。

- [ ] **步骤 3：对齐拾序关键依赖版本族**

在 `package.json` 确保存在（版本可取拾序当前附近）：

- `vue`, `vue-router`, `pinia`, `vue-i18n`
- `tailwindcss`, `@tailwindcss/vite`, `reka-ui`, `class-variance-authority`, `clsx`, `tailwind-merge`, `@lucide/vue`
- `@tauri-apps/api`, `@tauri-apps/cli`, `@tauri-apps/plugin-dialog`, `@tauri-apps/plugin-fs`
- `vitest`, `happy-dom`, `@vue/test-utils`

```bash
pnpm install
```

- [ ] **步骤 4：配置 Tailwind v4 + 路径别名 `@`**

`vite.config.ts` 使用 `@tailwindcss/vite`，`resolve.alias['@'] = fileURLToPath(new URL('./src', import.meta.url))`。

`vitest.config.ts` 环境 `happy-dom`，同样配置 `@` 别名。

- [ ] **步骤 5：验证前端与类型检查可跑**

```bash
pnpm exec vue-tsc --noEmit
pnpm test --run
```

预期：类型通过；测试套件可为空通过或暂无测试文件时 vitest 退出 0/提示 no tests（随后任务会加测试）。

- [ ] **步骤 6：Commit**

```bash
git add -A
git commit -m "chore: scaffold Tauri v2 + Vue 3 project"
```

---

### 任务 2：应用壳与四页路由（原型布局）

**文件：**
- 创建：`src/App.vue`, `src/main.ts`, `src/router/index.ts`, `src/components/AppSidebar.vue`, `src/components/AppTopbar.vue`, `src/pages/{single,batch,compare,rules}.vue`, `src/i18n/**`, `src/assets/css/tailwind.css`
- 创建：必要 shadcn-vue 组件（`pnpm dlx shadcn-vue@latest add button badge card input select separator collapsible sidebar`）

- [ ] **步骤 1：配置 `components.json`（new-york / neutral）并添加基础 UI 组件**

与拾序一致：`style: new-york`，`baseColor: neutral`，`css: src/assets/css/tailwind.css`。

- [ ] **步骤 2：实现路由（memory history，桌面应用）**

`src/router/index.ts`：

```ts
import { createMemoryHistory, createRouter } from 'vue-router'

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', redirect: '/single' },
    { path: '/single', name: 'single', component: () => import('@/pages/single.vue') },
    { path: '/batch', name: 'batch', component: () => import('@/pages/batch.vue') },
    { path: '/compare', name: 'compare', component: () => import('@/pages/compare.vue') },
    { path: '/rules', name: 'rules', component: () => import('@/pages/rules.vue') },
  ],
})
export default router
```

- [ ] **步骤 3：侧栏 + 顶栏按需求原型**

- 侧栏宽约 `w-56`，品牌「分组预演工具 / DRG · DIP 3.0」，四导航项，底部「离线模式 · 数据不出本机」
- 顶栏：当前页标题 + 规则版本占位文案
- 主色强调使用 cyan（如 `text-cyan-600`、`focus:border-cyan-500`），背景 `zinc-50` / 白卡片

- [ ] **步骤 4：四页最小内容**

- `single.vue`：左右分栏骨架（左「病例输入」右「分组结果」占位）
- `batch.vue` / `compare.vue`：空状态说明「后续版本提供」
- `rules.vue`：占位「尚未导入规则」

- [ ] **步骤 5：手动启动确认壳可运行**

```bash
pnpm tauri dev
```

预期：窗口打开，侧栏可切换四页。

- [ ] **步骤 6：Commit**

```bash
git add src components.json
git commit -m "feat: add app shell with four prototype pages"
```

---

### 任务 3：引擎类型与编码规范化（TDD）

**文件：**
- 创建：`src/lib/engine/types.ts`, `src/lib/engine/normalize.ts`, `src/lib/engine/normalize.test.ts`

- [ ] **步骤 1：编写失败测试**

```ts
// src/lib/engine/normalize.test.ts
import { describe, expect, it } from 'vitest'
import { normalizeCode } from './normalize'

describe('normalizeCode', () => {
  it('trims and uppercases', () => {
    expect(normalizeCode(' i21.0 ')).toBe('I21.0')
  })
  it('keeps extension segment', () => {
    expect(normalizeCode('36.0700x004')).toBe('36.0700X004')
  })
})
```

- [ ] **步骤 2：运行确认失败**

```bash
pnpm exec vitest run src/lib/engine/normalize.test.ts
```

预期：FAIL（模块不存在）

- [ ] **步骤 3：实现类型与 normalize**

```ts
// types.ts（节选）
export interface CaseInput {
  ZYZD: string
  QTZD: string[]
  ZYSS: string
  QTSS: string[]
  sex: '1' | '2' | ''  // 1男 2女，按官方变量后续映射
  age: number | null
  leaveType: string
  extras: Record<string, string | number | boolean | null>
}

export interface RulePack {
  versionId: string
  name: string
  mdcs: MdcRule[]
  adrgs: AdrgRule[]
  drgs: DrgRule[]
  sets: Map<string, Set<string>>      // set_id -> codes
  setNames: Map<string, Map<string, string>> // set_id -> code -> name
  ccByCode: Map<string, CcEntry>
  excludeSets: Map<string, Set<string>>
}

export interface GroupResult {
  ok: boolean
  mdc?: { code: string; name: string; rule: string }
  adrg?: { code: string; name: string; rule: string }
  drg?: { code: string; name: string; rule: string }
  ccHits: Array<{ code: string; name: string; kind: 'CC' | 'MCC' }>
  trace: string[]
  warnings: string[]
  failStage?: 'MDC' | 'ADRG' | 'DRG' | 'INPUT'
  failReason?: string
}
```

`normalizeCode`：trim、uppercase。

- [ ] **步骤 4：运行确认通过**

```bash
pnpm exec vitest run src/lib/engine/normalize.test.ts
```

预期：PASS

- [ ] **步骤 5：Commit**

```bash
git add src/lib/engine
git commit -m "feat(engine): add types and code normalization"
```

---

### 任务 4：DSL 解析与求值（TDD）

**文件：**
- 创建：`src/lib/engine/dsl.ts`, `src/lib/engine/dsl.test.ts`

官方表达式示例：`ZYSS in OP_FM3`、`ZYZD in DI_F00`、`((NL=0) and (XSRTL>=29) ...)`。

- [ ] **步骤 1：编写失败测试（核心语义）**

```ts
import { describe, expect, it } from 'vitest'
import { evaluateRule } from './dsl'

const sets = new Map<string, Set<string>>([
  ['OP_FM3', new Set(['36.0601', '36.0700'])],
  ['DI_F00', new Set(['I21.001', 'I21.002'])],
])

describe('evaluateRule', () => {
  it('evaluates membership', () => {
    const r = evaluateRule('ZYSS in OP_FM3', { ZYSS: '36.0601', ZYZD: '', QTZD: [], QTSS: [] }, sets)
    expect(r.value).toBe(true)
    expect(r.warnings).toEqual([])
  })

  it('evaluates and/or/not with parens', () => {
    const r = evaluateRule(
      '(ZYSS in OP_FM3) and (ZYZD in DI_F00)',
      { ZYSS: '36.0601', ZYZD: 'I21.001', QTZD: [], QTSS: [] },
      sets,
    )
    expect(r.value).toBe(true)
  })

  it('supports not in and set literals', () => {
    const r = evaluateRule(
      'ZYZD not in {Z99.9, Z00.0}',
      { ZYSS: '', ZYZD: 'I21.001', QTZD: [], QTSS: [] },
      sets,
    )
    expect(r.value).toBe(true)
  })

  it('unknown identifier yields false + warning', () => {
    const r = evaluateRule('FOO in OP_FM3', { ZYSS: '36.0601', ZYZD: '', QTZD: [], QTSS: [] }, sets)
    expect(r.value).toBe(false)
    expect(r.warnings.length).toBeGreaterThan(0)
  })

  it('empty rule is true', () => {
    const r = evaluateRule('', { ZYSS: '', ZYZD: '', QTZD: [], QTSS: [] }, sets)
    expect(r.value).toBe(true)
  })
})
```

- [ ] **步骤 2：运行确认失败**

```bash
pnpm exec vitest run src/lib/engine/dsl.test.ts
```

预期：FAIL

- [ ] **步骤 3：实现 `evaluateRule`**

实现要点：

- 词法：标识符、数字、`{...}` 字面集合、运算符 `and or not in >= <= > < =`、括号
- 上下文字段：`ZYZD`/`ZYSS` 为字符串；`QTZD`/`QTSS` 为列表——若表达式写 `QTZD in DI_x`，语义为「列表与集合有交集」
- 列表字段与 `in`：任一元素落在集合则为真
- 缺失集合 → 空集；未知变量 → warning + false
- 导出：`evaluateRule(expr, ctx, sets) => { value: boolean; warnings: string[] }`

- [ ] **步骤 4：运行确认通过**

```bash
pnpm exec vitest run src/lib/engine/dsl.test.ts
```

预期：PASS

- [ ] **步骤 5：Commit**

```bash
git add src/lib/engine/dsl.ts src/lib/engine/dsl.test.ts
git commit -m "feat(engine): add official rule DSL evaluator"
```

---

### 任务 5：CC/MCC 与分组器（TDD）

**文件：**
- 创建：`src/lib/engine/cc.ts`, `src/lib/engine/cc.test.ts`, `src/lib/engine/grouper.ts`, `src/lib/engine/grouper.test.ts`, `src/lib/engine/fixtures/mini-rules.ts`

- [ ] **步骤 1：编写 CC 失败测试**

```ts
import { describe, expect, it } from 'vitest'
import { collectCcHits } from './cc'
import type { RulePack } from './types'

function pack(): RulePack {
  return {
    versionId: 't',
    name: 't',
    mdcs: [],
    adrgs: [],
    drgs: [],
    sets: new Map(),
    setNames: new Map(),
    ccByCode: new Map([
      ['E11.9', { code: 'E11.9', name: '2型糖尿病', kind: 'CC', excludeSet: 'EX_1' }],
      ['N18.3', { code: 'N18.3', name: 'CKD3', kind: 'MCC', excludeSet: 'EX_2' }],
    ]),
    excludeSets: new Map([
      ['EX_1', new Set(['E11.9'])],
      ['EX_2', new Set(['N18.3'])],
    ]),
  }
}

describe('collectCcHits', () => {
  it('flags CC/MCC on secondary diagnoses', () => {
    const hits = collectCcHits(['E11.9', 'I10'], 'I21.001', pack())
    expect(hits.map(h => h.kind)).toEqual(['CC'])
  })

  it('excludes when principal diagnosis in exclude set', () => {
    const hits = collectCcHits(['N18.3'], 'N18.3', pack())
    expect(hits).toEqual([])
  })
})
```

- [ ] **步骤 2：实现 `collectCcHits` 并让测试通过**

- [ ] **步骤 3：编写 grouper 失败测试（迷你规则包）**

`fixtures/mini-rules.ts`：一个 MDCA（空规则）+ ADRG `FM3`（`ZYSS in OP_FM3`）+ DRG `FM39`（空规则）；一个 MDCF（`ZYZD in DI_F00`）+ 内科 ADRG；集合含 `OP_FM3`/`DI_F00`。

```ts
it('groups stent case into FM3/FM39 via empty MDCA gate', () => {
  const result = groupCase({
    ZYZD: 'I21.001',
    QTZD: ['E11.9'],
    ZYSS: '36.0601',
    QTSS: [],
    sex: '1',
    age: 67,
    leaveType: '1',
    extras: {},
  }, miniRules)
  expect(result.ok).toBe(true)
  expect(result.adrg?.code).toBe('FM3')
  expect(result.drg?.code).toBe('FM39')
  expect(result.ccHits.some(h => h.kind === 'CC')).toBe(true)
})

it('fails clearly when no MDC/ADRG matches', () => {
  const result = groupCase({
    ZYZD: 'ZZZ.999', QTZD: [], ZYSS: '', QTSS: [], sex: '1', age: 40, leaveType: '1', extras: {},
  }, miniRules)
  expect(result.ok).toBe(false)
  expect(result.failStage).toBe('MDC')
})
```

求值顺序严格按规格 §6.2。

- [ ] **步骤 4：实现 `groupCase` 并让测试通过**

```bash
pnpm exec vitest run src/lib/engine
```

预期：全部 PASS

- [ ] **步骤 5：Commit**

```bash
git add src/lib/engine
git commit -m "feat(engine): add CC/MCC and DRG grouper"
```

---

### 任务 6：SQLite schema 与 Rust 数据库层

**文件：**
- 创建：`src-tauri/migrations/001_init.sql`, `src-tauri/src/db.rs`, `src-tauri/src/error.rs`
- 修改：`src-tauri/Cargo.toml`, `src-tauri/src/lib.rs`

- [ ] **步骤 1：添加依赖**

`Cargo.toml`：

```toml
sqlx = { version = "0.8", features = ["runtime-tokio-rustls", "sqlite", "migrate"] }
calamine = "0.26"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
thiserror = "2"
chrono = { version = "0.4", features = ["serde"] }
uuid = { version = "1", features = ["v4"] }
```

- [ ] **步骤 2：编写 migration**

`001_init.sql` 按规格创建 `rule_versions`, `mdc`, `adrg`, `drg`, `code_sets`, `cc`, `exclude_sets` 及索引。

- [ ] **步骤 3：实现 `db::init_pool`**

- DB 路径：应用数据目录下 `rules.db`（`app_handle.path().app_data_dir()`）
- 启动时 `sqlx::migrate!` 运行 migrations
- 导出 `AppState { pool: Pool<Sqlite> }`

- [ ] **步骤 4：在 `lib.rs` setup 中初始化 pool**

- [ ] **步骤 5：Commit**

```bash
git add src-tauri
git commit -m "feat(db): add SQLite schema and pool init"
```

---

### 任务 7：官方 Excel 导入器（Rust + 抽样校验）

**文件：**
- 创建：`src-tauri/src/import_drg.rs`, `src-tauri/src/commands.rs`
- 创建资源：复制 Excel 到 `src-tauri/resources/rules/`
- 修改：`tauri.conf.json` bundle resources

- [ ] **步骤 1：复制官方文件**

```bash
mkdir -p src-tauri/resources/rules
cp "/c/Users/wenbe/Downloads/e8b3d9e98f0a43b0823fe5d31758c891.xlsx" src-tauri/resources/rules/chs-drg-3.0.xlsx
cp "/c/Users/wenbe/Downloads/304d49bda67940e89dd9e401b01ae672.xlsx" src-tauri/resources/rules/dip-3.0.xlsx
```

`tauri.conf.json` 的 `bundle.resources` 包含 `resources/rules/**`。

- [ ] **步骤 2：实现 `import_drg_xlsx(path, pool) -> RuleVersionSummary`**

用 calamine 读 sheet：

| Sheet | 表 |
|---|---|
| MDC | 定位表头行（含「MDC编码」），再读数据 |
| ADRG / DRG / 集合 / CC / 排除表 | 同行头策略 |

事务内：插入 `rule_versions`，写入各表；将其它版本 `is_active=0`，新版本 `is_active=1`。跳过编码为 `000`/`0000` 的占位行。

返回 JSON：

```rust
struct RuleVersionSummary {
  id: String,
  name: String,
  source_file: String,
  imported_at: String,
  counts: Counts, // mdc, adrg, drg, code_sets, cc, exclude_sets
}
```

数量级期望（允许小幅偏差）：ADRG ≈ 530+，DRG ≈ 860+，code_sets ≈ 100000+，cc ≈ 7000+。

- [ ] **步骤 3：Tauri commands**

```rust
#[tauri::command]
async fn get_active_rule_summary(state: State<'_, AppState>) -> Result<Option<RuleVersionSummary>, AppError>;

#[tauri::command]
async fn seed_bundled_rules_if_empty(app: AppHandle, state: State<'_, AppState>) -> Result<RuleVersionSummary, AppError>;

#[tauri::command]
async fn import_rules_from_path(path: String, state: State<'_, AppState>) -> Result<RuleVersionSummary, AppError>;

#[tauri::command]
async fn fetch_rule_pack(state: State<'_, AppState>) -> Result<RulePackDto, AppError>;
```

`RulePackDto` 为可 JSON 序列化结构（集合用 `HashMap<String, Vec<String>>`），供前端转 `Map`。

`seed_bundled_rules_if_empty`：若无 active 版本，从 `app.path().resource_dir()/resources/rules/chs-drg-3.0.xlsx` 导入。

- [ ] **步骤 4：编写 Rust 集成测试或 `#[cfg(test)]` 抽样**

在 `import_drg.rs`：

```rust
#[tokio::test]
async fn imports_official_fixture_counts() {
  // 使用 CARGO_MANIFEST_DIR/resources/rules/chs-drg-3.0.xlsx
  // 内存/临时 sqlite
  // assert!(summary.counts.adrg > 500);
  // assert!(summary.counts.code_sets > 50_000);
}
```

```bash
cd src-tauri && cargo test imports_official_fixture_counts -- --nocapture
```

预期：PASS（首次可能较慢）

- [ ] **步骤 5：Commit**

```bash
git add src-tauri
git commit -m "feat(rules): import official DRG 3.0 xlsx into SQLite"
```

---

### 任务 8：前端规则加载与 Pinia

**文件：**
- 创建：`src/lib/rules/api.ts`, `src/lib/rules/search.ts`, `src/lib/rules/search.test.ts`, `src/stores/rules.ts`
- 修改：`src/main.ts`（启动时 seed + load）

- [ ] **步骤 1：封装 invoke API**

```ts
// api.ts
import { invoke } from '@tauri-apps/api/core'
import type { RulePack } from '@/lib/engine/types'

export function seedBundledRulesIfEmpty() {
  return invoke('seed_bundled_rules_if_empty')
}
export function fetchRulePack() {
  return invoke<SerializablePack>('fetch_rule_pack')
}
export function toRulePack(dto: SerializablePack): RulePack { /* Map 转换 */ }
```

- [ ] **步骤 2：`useRulesStore`**

状态：`summary`, `pack`, `loading`, `error`  
动作：`bootstrap()` = seed → fetch → `toRulePack`  
getter：`isReady`

- [ ] **步骤 3：编码搜索 TDD**

```ts
it('matches code prefix or name substring', () => {
  const hits = searchCodes(pack, '支架', 10)
  expect(hits.length).toBeGreaterThan(0)
  expect(hits[0]).toHaveProperty('code')
})
```

从 `setNames` 扁平化为诊断/手术词表（按 `type` DI/OP 过滤可选）。

- [ ] **步骤 4：应用启动调用 `bootstrap`**

在 `App.vue` `onMounted` 或 `main.ts` 中执行；失败时顶栏/规则页显示错误。

- [ ] **步骤 5：Commit**

```bash
git add src/lib/rules src/stores/rules.ts src/App.vue src/main.ts
git commit -m "feat(rules): load active rule pack into pinia"
```

---

### 任务 9：单病例页面完整交互

**文件：**
- 创建：`src/components/grouping/CodeCombobox.vue`, `CaseForm.vue`, `GroupResultPanel.vue`
- 创建：`src/stores/case.ts`
- 修改：`src/pages/single.vue`

- [ ] **步骤 1：`useCaseStore`**

字段对齐 `CaseInput` + 展示用名称；动作：`loadDemo()`, `group()`, `addSecondaryDx()`, `removeSecondaryDx()`。

演示病例（金标，需在官方包中可入组）：

```ts
{
  ZYZD: 'I21.001', // 急性前壁心肌梗死
  QTZD: ['E11.900'], // 若该码在 CC 表中；实现时用导入后真实存在的 CC 编码替换
  ZYSS: '36.0601',
  QTSS: [],
  sex: '1',
  age: 67,
  leaveType: '1',
  extras: {},
}
```

预期路径：先期 MDCA 下命中 `FM3` → `FM39`（以引擎+官方数据实测为准；若实测落入其它外科组，更新演示断言与 UI 文案，不得伪造）。

- [ ] **步骤 2：实现 CodeCombobox**

输入时调用 `searchCodes`；选中回填 code+name；键盘上下/回车。

- [ ] **步骤 3：CaseForm + GroupResultPanel**

- 左：主诊/主术/其他诊断/患者信息/载入示例/执行按钮（无 ZYZD 禁用）
- 右：三级路径 Card、CC/MCC Badge、Collapsible 追溯、warnings、失败原因

- [ ] **步骤 4：组装 `single.vue` 左右分栏**

- [ ] **步骤 5：手动冒烟**

```bash
pnpm tauri dev
```

操作：载入示例 → 执行分组 → 见 MDC/ADRG/DRG。  
若规则未 seed，先到规则管理确认导入成功。

- [ ] **步骤 6：Commit**

```bash
git add src/components/grouping src/stores/case.ts src/pages/single.vue
git commit -m "feat(ui): single-case grouping rehearsal page"
```

---

### 任务 10：规则管理页与重新导入

**文件：**
- 修改：`src/pages/rules.vue`, `src/lib/rules/api.ts`, `src/stores/rules.ts`

- [ ] **步骤 1：展示 summary 与 counts**

表格/描述列表显示版本名、来源、时间、各表行数。

- [ ] **步骤 2：重新导入**

使用 `@tauri-apps/plugin-dialog` `open({ filters: [{ name: 'Excel', extensions: ['xlsx'] }] })`，调用 `import_rules_from_path`，成功后 `fetchRulePack` 刷新 store。

- [ ] **步骤 3：空库错误态**

若 `!isReady`，单病例页显示引导：「请先在规则管理导入或等待内置规则初始化」。

- [ ] **步骤 4：Commit**

```bash
git add src/pages/rules.vue src/lib/rules src/stores/rules.ts
git commit -m "feat(ui): rules management import and status"
```

---

### 任务 11：官方数据金标测试与收尾

**文件：**
- 创建：`src/lib/engine/golden.test.ts`（或 `scripts/export-mini-pack` + 夹具）
- 修改：`README.md`

- [ ] **步骤 1：导出测试夹具（避免 vitest 依赖 Tauri）**

添加 Tauri command 或一次性脚本：从已导入 DB / 直接读 xlsx，导出仅含 MDCA/MDCF、FM*、相关集合与少量 CC 的 JSON 至 `src/lib/engine/fixtures/chs-drg-3.0-slice.json`。

夹具必须包含：`OP_FM3`、`DI_F00`、ADRG `FM3`、DRG `FM39`、至少 1 条真实 CC。

- [ ] **步骤 2：金标测试 ≥ 3**

```ts
it('stent case → FM39', ...)
it('medical case without OR → non-surgical ADRG under MDCF', ...) // 选一条官方 DI 规则可稳定命中的
it('unknown codes → failStage set', ...)
```

```bash
pnpm exec vitest run src/lib/engine
```

预期：PASS

- [ ] **步骤 3：README**

写明：环境前提、`pnpm install`、`pnpm tauri dev`、规则文件位置、离线说明。

- [ ] **步骤 4：最终手动验收清单**

- [ ] `pnpm tauri dev` 启动 ≤ 约 2s 量级可接受  
- [ ] 自动 seed 后规则管理有计数  
- [ ] 单病例载入示例可出组  
- [ ] 批量/对比为空状态  
- [ ] `pnpm exec vitest run` 全绿  

- [ ] **步骤 5：Commit**

```bash
git add src/lib/engine/fixtures src/lib/engine/golden.test.ts README.md
git commit -m "test: add golden cases and document MVP usage"
```

---

## 规格覆盖自检

| 规格章节 | 对应任务 |
|---|---|
| §2 决策 / 参照拾序新建 | 任务 1–2 |
| §3 架构 SQLite + JS 引擎 | 任务 4–8 |
| §4 单病例 / 占位页 / 规则管理 | 任务 2、9、10 |
| §5 数据模型与 Excel 映射 | 任务 6–7 |
| §6 引擎顺序与 DSL | 任务 4–5 |
| §7 错误处理 | 任务 5、8–10 |
| §8 测试 | 任务 3–5、7、11 |
| §10 成功标准 | 任务 11 验收 |

非目标（批量/对比/DIP/PDF/API）仅占位，无实现任务。

## 类型/命名一致性

- 前端引擎：`RulePack` / `CaseInput` / `GroupResult` / `groupCase` / `evaluateRule` / `collectCcHits`
- Tauri：`fetch_rule_pack` → DTO → `toRulePack`
- 病例字段官方名：`ZYZD` `QTZD` `ZYSS` `QTSS` 贯穿 store 与引擎

---

## 执行交接

计划已保存到 `docs/superpowers/plans/2026-10-11-drgdip-mvp.md`。两种执行方式：

1. **子代理驱动（推荐）** — 每个任务调度一个新子代理，任务间审查，快速迭代  
2. **内联执行** — 在当前会话用 executing-plans 批量执行并设检查点  

选哪种方式？
