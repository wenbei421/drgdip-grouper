# DRG/DIP 3.0 分组预演工具

离线桌面 MVP：基于 **Tauri v2 + Vue 3 + TypeScript**，用官方 CHS-DRG 3.0 规则对单病例完成 MDC → ADRG → DRG 预演，并展示 CC/MCC 与规则追溯。

## 环境前提

- Node.js 24+（见 `.nvmrc`）、[pnpm](https://pnpm.io/) 11+
- Rust 稳定版（[rustup](https://rustup.rs/)）及 Tauri Windows 依赖（MSVC Build Tools、WebView2）
- 可选：[just](https://github.com/casey/just) 任务运行器
- 本机可离线运行：规则内嵌于应用资源，分组在本地完成

## 快速开始

```bash
pnpm install
pnpm tauri:dev
# 或
just dev
```

首次启动若库中无活动规则版本，会自动从内嵌官方 DRG xlsx seed。

## 本地构建 / 打包

```bash
# 生产构建（Windows 默认打 NSIS，见 src-tauri/tauri.windows.conf.json）
pnpm tauri:build
# 或
just release

# 仅 NSIS 安装包
pnpm tauri:build:nsis
# 或
just release-nsis
```

产物位置：

| 类型 | 路径 |
| --- | --- |
| 可执行文件 | `src-tauri/target/release/drgdip-grouper.exe` |
| NSIS 安装包 | `src-tauri/target/release/bundle/nsis/*.exe` |

> 说明：Windows 侧默认不再打 MSI（WiX `light.exe` 在部分环境易失败），优先 NSIS。

## CI / 发布工作流（对齐拾序）

| 工作流 | 触发 | 作用 |
| --- | --- | --- |
| `.github/workflows/pull-request-validation.yml` | PR / push 到 `main`·`master` | 前端 typecheck + 单测；多平台 Tauri 构建校验 |
| `.github/workflows/release.yml` | push 到 `release` 分支，或手动 `workflow_dispatch` | 多平台打包并创建 GitHub Release Draft |

发布步骤建议：

1. 合并到主分支并通过 PR Validation  
2. 推送 / 合并到 `release` 分支，或 Actions 里手动跑 **Release**  
3. 在 GitHub Releases 草稿中检查各平台产物后发布  

## 规则文件位置

| 文件 | 路径 | 说明 |
| --- | --- | --- |
| CHS-DRG 3.0 | `src-tauri/resources/rules/chs-drg-3.0.xlsx` | 分组用；启动 seed / 规则管理「重新导入」 |
| DIP 3.0 | `src-tauri/resources/rules/dip-3.0.xlsx` | 仅归档，本期不入库、不分组 |

金标单测切片：`src/lib/engine/fixtures/chs-drg-3.0-slice.json`  
可用 `scripts/export-rule-slice.py` 从官方 xlsx 重导（需 `openpyxl`）。

## 离线说明

- 规则解析进 SQLite，前端内存索引后求值；无需登录或云端服务  
- DIP、批量预演、版本对比等在后续迭代（菜单已隐藏）

## 常用脚本

| 命令 | 说明 |
| --- | --- |
| `pnpm tauri:dev` / `just dev` | 启动桌面应用 |
| `pnpm tauri:build` / `just release` | 生产打包 |
| `pnpm typecheck` / `just typecheck` | 类型检查 |
| `pnpm test` / `just test` | Vitest |
| `pnpm vite:build` | 仅构建前端（Tauri `beforeBuildCommand` 使用） |
| `just --list` | 查看全部 just 任务 |

## 推荐 IDE

VS Code / Cursor + Vue - Official + Tauri + rust-analyzer
