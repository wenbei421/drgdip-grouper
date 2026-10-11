# DRG/DIP 3.0 分组预演工具 · MVP 设计规格

**日期**：2026-10-11  
**状态**：待用户审查  
**范围**：第一期 MVP（单病例 CHS-DRG 3.0 可跑通）

## 1. 背景与目标

面向医院医保办 / 病案室的**离线桌面应用**。第一期目标：在本地用官方 CHS-DRG 3.0 配置信息，对单病例完成 MDC→ADRG→DRG 预演，并展示 CC/MCC 与规则追溯。

需求全文见 `docs/需求文档.md`。工程形态与插件组合**参照** `D:\Study\拾序\shixu`（Tauri v2 + Vue 3 + shadcn-vue + Pinia + Vue I18n + sqlx），但**新建干净仓库**，不复制拾序业务代码。

## 2. 已确认决策

| 项 | 选择 |
|---|---|
| 第一期范围 | 单病例 DRG MVP（非完整 P0） |
| 工程落地 | 参照拾序结构新建，不整仓拷贝 |
| 规则来源 | 官方 DRG 3.0 Excel（用户提供） |
| DRG 源文件 | `e8b3d9e98f0a43b0823fe5d31758c891.xlsx`（MDC/ADRG/DRG/集合/CC/排除表） |
| DIP 源文件 | `304d49bda67940e89dd9e401b01ae672.xlsx`（本期仅归档，不入库不分组） |
| 规则存储 | SQLite（sqlx）+ 前端内存索引 |
| 分组求值 | 纯 TypeScript 表达式引擎（主线程单病例；Worker 预留） |
| UI | 需求文档 HTML 原型风格（侧栏四页、单病例左右分栏、青色强调） |

## 3. 架构

```
官方 DRG xlsx
    │ 首次启动 seed / 规则管理「重新导入」
    ▼
SQLite（sqlx，Tauri 侧）
    │ 启动时拉取
    ▼
前端内存 Map（集合、MDC/ADRG/DRG 规则、CC、排除表）
    │
    ▼
JS 表达式引擎 ──▶ MDC → ADRG → DRG + CC/MCC 明细 + 规则追溯
```

### 3.1 分层职责

| 层 | 技术 | 职责 |
|---|---|---|
| 壳 | Tauri v2 | 窗口、资源、SQLite、文件对话框、日志；插件组合对齐拾序（store/log/dialog/fs/sqlx 等，按需裁剪） |
| UI | Vue 3 + shadcn-vue + Tailwind v4 | 原型信息架构；组件来自 shadcn-vue |
| 状态 | Pinia | 当前规则版本、病例输入、最近分组结果 |
| 规则存储 | SQLite | 官方解析结果与版本元数据 |
| 引擎 | TypeScript | 官方规则 DSL 求值；与 UI 解耦，可单测 |

### 3.2 非目标（本期不做）

- 批量 Excel 导入预演（页面仅空状态）
- 跨版本 1.1/2.0/3.0 对比（页面仅空状态）
- DIP 分组引擎
- 结果导出 PDF / 本地 HTTP API / CLI
- 地方规则覆盖、多版本并排切换（库表预留 `rule_versions`，UI 只管理当前活动版本）

## 4. 模块与页面

### 4.1 导航结构

侧栏四个入口（与需求原型一致）：

1. **单病例查询** — 完整实现  
2. **批量预演** — 空状态（说明后续提供）  
3. **版本对比** — 空状态  
4. **规则管理** — 展示当前导入版本元数据 + 重新导入官方 xlsx  

顶栏：当前规则版本名称；离线提示。

### 4.2 单病例页

**左栏输入**

- 主要诊断（必填）、主要手术操作（有手术时填写）
- 其他诊断列表（可增删）
- 性别、年龄、离院方式；新生儿相关字段条件显示
- Command/Combobox：按 ICD 编码或中文名模糊搜索（数据来自 `code_sets`）
- 「载入示例」「执行分组预演」

**右栏结果**

- Card：MDC → ADRG → DRG 三级路径
- Badge：触发的 CC / MCC
- Collapsible：命中的规则表达式原文与求值说明
- 未入组时标明失败阶段与原因

### 4.3 规则管理页（精简）

- 显示：版本名、来源文件名、导入时间、各表行数统计
- 操作：选择官方 xlsx 重新导入（覆盖当前活动版本或新建版本并切换为活动）

## 5. 数据模型

### 5.1 SQLite 表

**rule_versions**

- `id` TEXT PK  
- `name` TEXT（如 `CHS-DRG 3.0（国家版）`）  
- `kind` TEXT（`drg` / 预留 `dip`）  
- `source_file` TEXT  
- `imported_at` TEXT  
- `is_active` INTEGER  

**mdc** — `version_id`, `code`, `name`, `rule_expr`, `sort`  

**adrg** — `version_id`, `code`, `name`, `rule_expr`, `mdc_code`, `sort`  

**drg** — `version_id`, `code`, `name`, `rule_expr`, `adrg_code`, `mdc_code`, `sort`  

**code_sets** — `version_id`, `set_id`, `icd_code`, `icd_name`, `type`（如 `OP` / `DI`）  

**cc** — `version_id`, `icd_code`, `icd_name`, `exclude_set`, `kind`（`CC` / `MCC`）  

**exclude_sets** — `version_id`, `set_id`, `icd_code`, `icd_name`  

索引：`(version_id, set_id)` on code_sets / exclude_sets；`(version_id, icd_code)` on cc；`(version_id, mdc_code)` on adrg。

### 5.2 官方 Excel 映射（DRG）

| Sheet | 目标表 |
|---|---|
| MDC | mdc（跳过标题行，识别列：MDC编码/名称/规则/排序） |
| ADRG | adrg |
| DRG | drg |
| 集合 | code_sets |
| CC | cc（类型列区分 CC/MCC） |
| 排除表 | exclude_sets |

空编码占位行（如 `000` / `0000`）导入时可跳过或保留但不参与匹配。

### 5.3 资源放置

- 将用户提供的 DRG xlsx 复制为项目内  
  `src-tauri/resources/rules/chs-drg-3.0.xlsx`  
- DIP xlsx 复制为  
  `src-tauri/resources/rules/dip-3.0.xlsx`（仅归档）  
- 首次启动：若无活动 `rule_versions`，自动从内嵌 DRG 资源 seed

## 6. 分组引擎

### 6.1 病例上下文

引擎输入至少包含：

- `ZYZD`：主要诊断编码  
- `QTZD`：其他诊断编码列表  
- `ZYSS`：主要手术操作编码  
- `QTSS`：其他手术操作编码列表  
- 性别、年龄、离院方式  
- 新生儿及相关字段：导入规则时扫描全部 `rule_expr` 中的标识符，生成变量清单；UI 与上下文只暴露清单内且能映射到病案字段的变量（无法映射的保留为可选高级字段或忽略并警告）

编码规范化：去空格、统一大小写；扩展码保留官方形式（含 `x` 段）。

### 6.2 求值顺序

1. 按 `mdc.sort` 依次处理每个 MDC：  
   - `rule_expr` **为空**：闸门视为可进入，立即在其下按 `adrg.sort` 尝试 ADRG；若命中某个 ADRG，则锁定该 MDC/ADRG；若其下全部不命中，则继续下一个 MDC。  
   - `rule_expr` **非空**：仅当表达式为真时，才在其下尝试 ADRG；命中则锁定，否则继续下一个 MDC。  
2. 锁定 ADRG 后，按该组下 `drg.sort` 与 `rule_expr`（可为空）结合 CC/MCC 分层，得到最终 DRG。  
3. CC/MCC：遍历其他诊断，查 `cc`；若**主要诊断**落在该条 CC/MCC 对应的 `exclude_set` 中，则不触发。  
4. 输出：路径、每步命中规则原文、CC/MCC 列表、警告（未知算子等）。

「术式优先」不另造规则，依赖官方 ADRG 表达式与排序（如 `ZYSS in OP_*`）。

### 6.3 表达式 DSL

支持官方语法子集：

- 逻辑：`and` / `or` / `not` / 括号  
- 成员：`in` / `not in`；右侧为集合 ID 或集合字面量 `{A, B}`  
- 比较：数值字段与字面量（`>=` `<=` `>` `<` `=`）  
- 变量：病例上下文字段名  

行为约定：

- 未知操作符 / 未知变量 → 该规则视为不匹配，并写入结果警告（不崩溃、不静默入组）  
- 集合缺失 → 视为空集  

### 6.4 性能

- 单病例目标 ≤ 20ms（内存索引）  
- 启动：SQLite → 内存索引；目标整体启动 ≤ 2s（Windows）  
- 批量 Worker 接口预留，本期不接 UI

## 7. 错误处理

| 场景 | 行为 |
|---|---|
| 规则库空或导入失败 | 禁止分组；提示前往规则管理；展示 sheet/行级错误 |
| 必填缺失 | 禁用执行按钮并标红 |
| 编码不在任何集合 | 允许继续分组；结果提示「未出现在规则集合」 |
| 未入组 | 标明失败阶段（MDC/ADRG/DRG）与简要原因 |
| 单条表达式异常 | 跳过该规则并记警告 |

## 8. 测试计划（MVP）

1. **DSL 单元测试**：`in` 集合、复合 `and/or`、排除表不触发 CC  
2. **导入器抽样**：官方 xlsx 导入后 ADRG/DRG/CC/`code_sets` 行数在合理数量级且关键列非空  
3. **金标病例 ≥ 3**：含 CC、MCC、未入组；断言路径码  
4. **冒烟**：载入示例 → 执行分组 → 右侧出现三级路径  

## 9. 工程结构（目标）

参照拾序，建议目录：

```
src/
  pages/          # single, batch, compare, rules
  components/ui/  # shadcn-vue
  components/grouping/
  stores/
  lib/engine/     # dsl, grouper, types
  lib/rules/      # load from tauri invoke
  i18n/
  router/
src-tauri/
  resources/rules/
  src/            # db, import, commands
docs/
  需求文档.md
  superpowers/specs/
```

包管理：pnpm（与拾序一致）。

## 10. 成功标准

- 干净项目可 `pnpm tauri dev` 启动  
- 官方 DRG 规则自动或手动导入成功  
- 单病例页可搜索编码、载入示例、输出 MDC/ADRG/DRG 与 CC/MCC  
- 核心引擎与导入有自动化测试覆盖上述 MVP 用例  

## 11. 后续迭代（仅记录，不在本期实现）

- 批量 Excel 四步向导与 Web Worker  
- DIP 3.0 引擎（已有官方 xlsx）  
- 跨版本对比、导出、API/CLI  
- 地方规则覆盖与多版本切换 UI  
