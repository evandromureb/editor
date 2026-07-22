---
name: plugin-development
description: Use when creating, updating, or debugging editor plugins under plugins/ or the generated plugin discovery and SDK surfaces.
---

# Plugin Development

## Use This Skill

Use this skill for any change inside `plugins/`, or when a task affects plugin discovery, plugin commands, toolbar items, translations, or plugin-specific styles and assets.

## Core Flow

1. Inspect the existing plugin with the same feature shape.
2. Match the current plugin SDK patterns used in the repository.
3. Update JS, types, styles, and locale files together when needed.
4. Keep plugin behavior consistent with the editor's document model.
5. Add or update tests for the user-facing behavior.

## What To Check

- `plugins/<name>/index.js` for plugin wiring.
- `plugins/<name>/index.d.ts` for public types when applicable.
- `plugins/<name>/styles.css` for plugin-specific presentation.
- `plugins/<name>/lang/*.json` for UI strings.
- Related tests in `tests/*.test.js`.

## Guardrails

- Do not introduce a new plugin shape if an existing one already matches.
- Keep toolbar labels, commands, and localization keys aligned.
- If the plugin affects parsing or serialization, verify round-trip behavior.
- If the plugin adds assets, confirm the discovery and build pipeline still include them.

