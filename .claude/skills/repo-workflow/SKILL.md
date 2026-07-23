---
name: repo-workflow
description: 'Use when working anywhere in this repository and you need the safe default workflow: inspect the codebase, find the right files, keep edits narrow, and respect existing conventions.'
---

# Repo Workflow

## When to Use

Use this skill for general repository work before editing code, reviewing changes, or deciding where a change belongs. More specific skills (`plugin-development`, `theme-development`, `core-editor-development`, `page-playground`, `i18n-localization`, `build-discovery`, `verify-changes`) take priority when the task falls squarely in their area — use this one as the default when it doesn't, or when the task spans several of them.

## Workflow

1. Inspect the relevant files first with Read before editing.
2. Prefer the Glob and Grep tools for discovery over shelling out; fall back to `rg`/`rg --files` via Shell only for cases those tools don't cover.
3. Keep changes scoped to the user request.
4. Do not touch generated output (`dist/`, `.build/`, `src/generated/`) unless the task explicitly requires it.
5. Preserve unrelated user changes — check `git status`/`git diff` before broad edits.

## Repository Rules

- Main source lives in `src/`, `plugins/`, `themes/`, `pages/`, `scripts/`, and `tests/`.
- Build artifacts live in `dist/` and `.build/`; treat them as generated.
- Discovery output is generated into `src/generated/`.
- Prefer small, targeted edits over broad rewrites.

## When In Doubt

- Read the nearest source file that owns the behavior.
- If a change spans editor behavior, plugin behavior, and validation, split the work into separate steps.
- Verify before claiming completion.
