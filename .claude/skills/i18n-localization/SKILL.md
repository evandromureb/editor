---
name: i18n-localization
description: Use when adding or changing translation keys, locale files, or locale-aware UI strings in the editor, plugins, themes, or page UI.
paths:
  - "**/lang/*.json"
  - "src/core/lang/**"
  - "src/core/i18n/**"
---

# I18n Localization

## Use This Skill

Use this skill when changing `lang/*.json`, core locale files, or any locale-aware strings shown in the editor or page UI.

## Core Flow

1. Find the owning namespace for the string with Grep across every `lang/*.json` before editing one.
2. Update all required locales together in the same Edit pass — never leave one locale stale.
3. Keep keys stable unless there is a deliberate rename.
4. Preserve translation parity where the code expects it — `discover.js` validates key parity across a plugin's locales and throws on mismatch (see the `build-discovery` skill).
5. Verify the runtime label selection for the affected UI, then run the relevant test (`node --test tests/discover-coverage.test.js` or the owning UI test).

## What To Check

- `src/core/lang/*.json` for core UI strings.
- `plugins/<name>/lang/*.json` for plugin strings.
- `themes/*` when theme names or labels are translated.
- `page/app.js` when the playground has bilingual labels.

## Guardrails

- Do not change a key in one locale without checking the other locales used by that namespace.
- Keep labels concise and consistent with existing terminology.
- If a namespace is generated or validated by discovery, update the source files rather than editing generated output.
