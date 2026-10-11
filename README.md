# DRG/DIP 3.0 分组预演工具

离线桌面 MVP：基于 **Tauri v2 + Vue 3 + TypeScript**，用官方 CHS-DRG 3.0 规则对单病例完成 MDC → ADRG → DRG 预演，并展示 CC/MCC 与规则追溯。

## 环境前提

- Node.js 20+、[pnpm](https://pnpm.io/) 11+
- Rust 稳定版（[rustup](https://rustup.rs/)）及 Tauri 在 Windows 上的依赖（MSVC Build Tools、WebView2）
- 本机可离线运行：规则内嵌于应用资源，分组在本地完成，不依赖外网 API

## 快速开始

```bash
pnpm install
pnpm tauri dev
```

首次启动若库中无活动规则版本，会自动从内嵌官方 DRG xlsx seed。

## 规则文件位置

| 文件 | 路径 | 说明 |
| --- | --- | --- |
| CHS-DRG 3.0 | `src-tauri/resources/rules/chs-drg-3.0.xlsx` | 分组用；启动 seed / 规则管理「重新导入」 |
| DIP 3.0 | `src-tauri/resources/rules/dip-3.0.xlsx` | 仅归档，本期不入库、不分组 |

金标单测使用官方切片 JSON（勿塞入全量集合）：

`src/lib/engine/fixtures/chs-drg-3.0-slice.json`

可用 `scripts/export-rule-slice.py` 从上述 xlsx 重新导出该切片（需本机 `openpyxl`）。

## 离线说明

- 应用为本地桌面程序：规则解析进 SQLite，前端内存索引后求值
- 开发与演示无需登录或云端服务；有网时仅用于安装依赖 / 拉包
- DIP 与批量预演、版本对比等能力在后续迭代，当前对应页面为空状态

## 脚本

| 命令 | 说明 |
| --- | --- |
| `pnpm dev` | 仅启动前端 Vite |
| `pnpm tauri dev` | 启动 Tauri 桌面应用 |
| `pnpm typecheck` | `vue-tsc --noEmit` |
| `pnpm test` | Vitest |
| `pnpm build` | 类型检查并构建前端 |

## 推荐 IDE

VS Code / Cursor + Vue - Official + Tauri + rust-analyzer
