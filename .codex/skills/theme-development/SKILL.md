---
name: theme-development
description: Use when creating, updating, or debugging themes in themes/ or appearance-related styles and theme loading code.
---

# Theme Development

## Use This Skill

Use this skill for changes under `themes/`, `src/ui/themes/`, or `styles/appearance.css` when the task affects theme selection, palette, or appearance variables.

## Core Flow

1. Match the existing theme structure.
2. Keep theme CSS scoped to the theme selector and appearance mode.
3. Update theme metadata and exports together.
4. Verify the theme works in both light and dark appearance when relevant.
5. Add or update theme tests when behavior changes.

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

