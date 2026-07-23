---
name: build-discovery
description: Use when changing discovery, build, generated output, asset copying, or distribution validation in scripts/ and dist-related flows.
paths:
  - 'scripts/discover.js'
  - 'scripts/build/**'
  - 'scripts/validate-dist.js'
  - 'src/generated/**'
---

# Build And Discovery

## When to Use

Use this skill for changes in `scripts/discover.js`, `scripts/build/`, `src/generated/`, `dist/`, or build-related package scripts.

## Core Flow

1. Inspect the relevant build step or discovery phase with Read before editing.
2. Change the source inputs first, not generated output — `src/generated/` and `dist/` are write targets, never edit them directly.
3. Regenerate and validate the affected artifacts by running `node scripts/discover.js` / `npm run build` via Shell.
4. Keep build changes backward-compatible unless the task explicitly changes packaging behavior.
5. Update tests that cover discovery or distribution outputs, then run them (`node --test tests/discovery.test.js tests/discover-coverage.test.js`).

## What To Check

- `scripts/discover.js` for plugin and theme discovery logic.
- `scripts/build/` for pipeline steps and packaging rules.
- `scripts/validate-dist.js` for distribution checks.
- `src/generated/` for generated registries and maps.
- `tests/discover-coverage.test.js` and `tests/discovery.test.js` for discovery coverage.

## Guardrails

- Treat generated files as outputs, not sources.
- If a build step changes, confirm the whole pipeline still completes.
- If discovery rules change, verify plugins and themes are still included correctly.
