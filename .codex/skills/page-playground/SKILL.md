---
name: page-playground
description: Use when changing the configuration playground and demo pages under pages/ or demo/ that assemble plugins, themes, toolbars, or presets.
paths:
  - "pages/**"
  - "demo/**"
---

# Page Playground

## When to Use

Use this skill for changes in `pages/`, `demo/`, or playground-style UI that assembles editor configuration.

## Core Flow

1. Keep the UI aligned with the real editor behavior — the page consumes the built `EditorBundle` global (see `scripts/build/config.js`), not a mocked API.
2. Update data flow, labels, and preview state together with StrReplace/Write.
3. Preserve drag/drop and config-building interactions.
4. Keep bilingual (en/pt) labels in sync with locale behavior.
5. Validate the page against the editor bundle it embeds — run `npm run build` before testing page behavior manually.

## What To Check

- `pages/app.js` for config builder logic and preview wiring.
- `pages/index.html` for static structure and copy.
- `pages/style.css` for the playground presentation.
- `demo/` when the example app needs to reflect the same behavior.
- `tests/embed-integration.test.js` and related UI tests for integration coverage.

## Guardrails

- Do not let the playground diverge from the editor's actual plugin names or locale behavior.
- Keep the page build-friendly and avoid introducing separate configuration rules unless necessary.
- If the page mirrors core editor data, update the source of truth first.
- `pages/**/*.js` runs against the `EditorBundle` global injected via `<script>`; it's declared in `eslint.config.js` under `files: ['pages/**/*.js']` — don't reintroduce a `no-undef` error by using a new global without adding it there.
