# DRG/DIP 分组预演工具 — task runner
# Usage: just <recipe>  |  just --list

set dotenv-load := false

rust_dir := "src-tauri"

default:
    @just --list

# Install all dependencies exactly as locked
install: install-vue install-rust

install-vue:
    pnpm install --frozen-lockfile

install-rust:
    cd {{rust_dir}} && cargo fetch

# Start Tauri dev server with hot reload
dev:
    pnpm tauri dev

# Debug build
build:
    pnpm tauri build --debug

# Production build (Windows uses NSIS via tauri.windows.conf.json)
release:
    pnpm tauri build

# Windows NSIS installer only
release-nsis:
    pnpm tauri build --bundles nsis

# Remove build artifacts
clean:
    pnpm run clean

# Run Vue/TS tests
test:
    pnpm test

# TypeScript type checking
typecheck:
    pnpm typecheck

# Frontend verify gate
verify:
    pnpm typecheck
    pnpm test
