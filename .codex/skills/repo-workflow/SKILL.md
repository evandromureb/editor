---
name: repo-workflow
description: "Use when working anywhere in this repository and you need the safe default workflow: inspect the codebase, find the right files, keep edits narrow, and respect existing conventions."
---

# Repo Workflow

## Use This Skill

Use this skill for general repository work before editing code, reviewing changes, or deciding where a change belongs.

## Workflow

1. Inspect the relevant files first.
2. Prefer `rg` and `rg --files` for discovery.
3. Keep changes scoped to the user request.
4. Do not touch generated output unless the task explicitly requires it.
5. Preserve unrelated user changes.

## Repository Rules

- Main source lives in `src/`, `plugins/`, `themes/`, `page/`, `scripts/`, and `tests/`.
- Build artifacts live in `dist/` and `.build/`; treat them as generated.
- Discovery output is generated into `src/generated/`.
- Prefer small, targeted edits over broad rewrites.

## When In Doubt

- Read the nearest source file that owns the behavior.
- If a change spans editor behavior, plugin behavior, and validation, split the work into separate steps.
- Verify before claiming completion.

