# Agent guidance — BaseLab Editor

Canonical skills live in `.cursor/skills/`. Copies for Claude Code and Codex are kept in sync via `make sync-skills` (do not edit `.claude/skills/*/SKILL.md` or `.codex/skills/*/SKILL.md` as sources of truth).

## Repository map

| Area | Role |
|------|------|
| `src/` | Editor core, embed, SDK, shared UI |
| `plugins/` | Feature plugins |
| `themes/` | Theme packages |
| `page/`, `demo/` | Config playground and demo |
| `scripts/` | Discovery, build, dist validation |
| `tests/` | Test suite |
| `dist/`, `.build/`, `src/generated/` | Generated — treat as outputs |

## Skills

Prefer the matching domain skill before editing. Fall back to `repo-workflow` when the task spans areas or has no clear owner. Validate with `verify-changes` before claiming done.

| Skill | When |
|-------|------|
| `/repo-workflow` | Default workflow; narrow edits; respect conventions |
| `/plugin-development` | `plugins/`, plugin discovery, commands, toolbar, assets |
| `/theme-development` | `themes/`, appearance, theme loading |
| `/core-editor-development` | `src/core`, embed, SDK, document model, UI primitives |
| `/page-playground` | `page/`, `demo/` config UI |
| `/i18n-localization` | Locale files and UI strings |
| `/build-discovery` | Discovery, build pipeline, generated output, dist |
| `/verify-changes` | Tests, lint, typecheck, build, `validate:dist` |
