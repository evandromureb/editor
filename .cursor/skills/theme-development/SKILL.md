---
name: theme-development
description: Use when creating, updating, or debugging themes in themes/, src/ui/themes/, or appearance-related styles and theme loading code.
paths:
  - "themes/**"
  - "src/ui/themes/**"
  - "styles/appearance.css"
---

# Theme Development

## When to Use

Use this skill for changes under `themes/`, `src/ui/themes/`, or `styles/appearance.css` when the task affects theme selection, palette, or appearance variables.

## Core Flow

1. Read an existing theme folder (e.g. `themes/padrao/` or `themes/escuro/`) end to end to match the existing structure before adding a new one.
2. Keep theme CSS scoped to the theme selector and appearance mode — don't leak selectors into global scope.
3. Update theme metadata (`index.js`) and CSS/type exports together with StrReplace/Write.
4. Verify the theme works in both light and dark appearance when relevant — check `ui/themes/ThemeManager` and `ui/themes/ThemeSelect` behavior.
5. Add or update theme tests when behavior changes, then run them with Shell (`node --test tests/themes.test.js`).

## What To Check

- `themes/<id>/index.js` for theme registration.
- `themes/<id>/theme.css` for color tokens and scoped overrides.
- `themes/<id>/index.d.ts` when type output exists.
- `src/ui/themes/` for loading and selection behavior.
- `tests/themes.test.js` for registry and UI expectations.

## Guardrails

- Do not modify base appearance tokens unless the change is meant to affect all themes.
- Keep the default theme lightweight; put custom palettes in dedicated themes.
- Avoid hard-coding colors outside the theme scope.
- If a new theme is added, confirm `scripts/discover.js` picks it up (see the `build-discovery` skill) and it appears via `npm run build`.
