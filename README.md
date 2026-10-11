# DRG/DIP 3.0 分组预演工具

桌面端 MVP：基于 Tauri v2 + Vue 3 + TypeScript，用于 DRG/DIP 3.0 分组预演。

## 开发

```bash
pnpm install
pnpm tauri dev
```

## 脚本

| 命令 | 说明 |
| --- | --- |
| `pnpm dev` | 仅启动前端 Vite |
| `pnpm tauri dev` | 启动 Tauri 桌面应用 |
| `pnpm typecheck` | `vue-tsc --noEmit` |
| `pnpm test` | Vitest |
| `pnpm build` | 类型检查并构建前端 |

## 推荐 IDE

VS Code + Vue - Official + Tauri + rust-analyzer
