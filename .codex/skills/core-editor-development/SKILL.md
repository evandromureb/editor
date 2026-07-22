---
name: core-editor-development
description: Use when changing the editor core, SDK, embed layer, cursor, document model, schema, sanitizer, serializer, or shared UI primitives under src/.
---

# Core Editor Development

## Use This Skill

Use this skill for changes in `src/core/`, `src/embed/`, `src/sdk/`, `src/ui/`, `src/editor.js`, or `src/index.js`.

## Core Flow

1. Identify the owning layer before editing.
2. Preserve document, selection, and plugin contracts.
3. Update shared types, exports, and tests together when behavior crosses module boundaries.
4. Prefer narrow fixes over refactoring unrelated layers.
5. Verify edge cases around selection, parsing, serialization, and runtime integration.

## What To Check

- `src/core/` for document, cursor, operations, pipeline, sanitize, and plugin runtime behavior.
- `src/sdk/` for plugin-facing APIs.
- `src/embed/` for public editor entry points and custom elements.
- `src/ui/` for shared UI primitives and themes.
- `tests/*.test.js` for behavior coverage.

## Guardrails

- Do not change the public API surface without updating exports and tests.
- If a fix touches selection or document transforms, inspect adjacent operations for symmetry.
- If a change affects plugin contracts, cross-check `plugins/` and discovery output.

