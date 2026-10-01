---
name: Package installs in the monorepo
description: Installing dependencies in nested Replit artifact packages inside a pnpm workspace.
---

When `installLanguagePackages` runs in this monorepo, it invokes `pnpm add` from the workspace root and can fail with `ERR_PNPM_ADDING_TO_ROOT` instead of targeting an artifact package.

**Why:** Dependencies belong to the individual `@workspace/<artifact>` package; adding them to the workspace root would be the wrong dependency boundary.

**How to apply:** Try the package callback first. If it fails with the root-workspace guard, use `pnpm --filter @workspace/<artifact> add <packages>` so both the artifact manifest and workspace lockfile are updated together.