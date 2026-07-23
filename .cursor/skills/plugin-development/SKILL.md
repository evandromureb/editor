---
name: plugin-development
description: Use when creating, updating, or debugging editor plugins under plugins/, or when a task touches plugin discovery, commands, toolbar items, translations, or plugin-specific styles and assets.
paths:
  - 'plugins/**'
  - 'src/generated/plugins*'
  - 'src/core/plugins/**'
---

# Plugin Development

## When to Use

Use this skill for any change inside `plugins/`, or when a task affects plugin discovery, plugin commands, toolbar items, translations, or plugin-specific styles and assets.

## Core Flow

1. Use Glob (`plugins/*/`) and Grep to find the existing plugin with the same feature shape before writing anything new.
2. Match the current plugin SDK patterns used in the repository — read a sibling plugin's `index.js` end to end first.
3. Update JS, types, styles, and locale files together with StrReplace/Write when needed; don't leave one file behind.
4. Keep plugin behavior consistent with the editor's document model (`src/core/document`, `src/core/schema`).
5. Add or update tests for the user-facing behavior, then run them with Shell (`npm test -- <pattern>` or `node --test tests/<file>.test.js`).

## What To Check

- `plugins/<name>/index.js` for plugin wiring.
- `plugins/<name>/index.d.ts` for public types when applicable.
- `plugins/<name>/styles.css` for plugin-specific presentation.
- `plugins/<name>/lang/*.json` for UI strings (all locales, not just one).
- Related tests in `tests/*.test.js`.

## Guardrails

- Do not introduce a new plugin shape if an existing one already matches — grep for a comparable plugin first.
- Keep toolbar labels, commands, and localization keys aligned across every `lang/*.json` file.
- If the plugin affects parsing or serialization, verify round-trip behavior with a test.
- If the plugin adds assets, confirm `scripts/discover.js` and the build pipeline still include them (see the `build-discovery` skill).
- After changes, run the validation order from the `verify-changes` skill before reporting done.
