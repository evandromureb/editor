---
name: verify-changes
description: Use when validating code changes in this repository, especially by running targeted tests, type checks, linting, builds, and dist validation.
---

# Verify Changes

## Use This Skill

Use this skill when you need to confirm a change is correct, reproduce a bug, or choose the right validation command for the scope of a change.

## Validation Order

1. Run the smallest relevant test first.
2. Expand to the affected test group if needed.
3. Run lint or typecheck when the change spans multiple files or shared code.
4. Run `npm run build` when the change affects generated output or packaging.
5. Run `npm run validate:dist` when dist artifacts matter.

## Useful Commands

- `npm test` for the full test suite.
- `npm run lint` for style and static checks.
- `npm run typecheck` for TypeScript declaration validation.
- `npm run build` for bundles and generated outputs.
- `npm run validate:dist` for distribution checks.

## Guardrails

- Prefer targeted commands over full-suite runs unless the change is broad.
- Do not claim success without running at least one relevant verification step via Bash.
- If a validation command fails because of the environment (permissions, missing binaries) rather than the code, diagnose the environment issue first — don't work around it by skipping the check or adding `--no-verify`.
- `node_modules/.bin/*` and native binaries (e.g. `@esbuild/linux-x64/bin/esbuild`) have occasionally lost their executable bit or symlink in this environment, breaking `npm run lint`/`build`/`test` with `EACCES` or "command not found". If that happens, check permissions before assuming the code is broken.
