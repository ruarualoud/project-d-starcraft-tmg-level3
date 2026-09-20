# ENV-6 focused guardrails closure v1

## Scope

Retro-driven follow-up to ENV-3/ENV-4/ENV-5: give the repository a focused,
deterministic safety net at both the local commit boundary and the GitHub
boundary without ever invoking the product-wide `verify:all` chain. No product
behavior changed; no production code, source data, Provider, or Expo path was
touched.

## Deliverables

| Path | Role |
| --- | --- |
| `scripts/verify-development-environment-v1.mjs` | Offline verifier: pinned Node/npm contract, compact `CURRENT_WORK.md`/`AGENTS.md` navigation, ignored runtime/generated paths, both scoped Kimi agent profiles, collaboration manifest shape |
| `scripts/install-project-hooks-v1.mjs` | Sets `core.hooksPath=.githooks` and confirms the value reads back |
| `.githooks/pre-commit` | Runs `git diff --cached --check` plus `node --check` on staged `.js`/`.mjs` files only |
| `.github/workflows/development-environment-guardrail.yml` | Node 24 (`node-version-file: .node-version`) job that runs only the environment verifier |
| `package.json` | `hooks:install` and `verify:development-environment` scripts |

## Guardrail properties

- Deterministic and offline. The verifier reads tracked repository text files
  and the local `git check-ignore` index only. It reads no credential, opens no
  network connection, and calls no Provider.
- Focused. The pre-commit hook and the GitHub workflow run only the checks
  above. They never run `verify:all`, historical product gates, official-source
  refreshes, paid Provider calls, or Expo/Web builds.
- Shape-checked collaboration seam. Every `coordination/slices/*.slice.json`
  must declare version 1, a scoped Kimi agent profile, a `project-d-*` model
  alias, `agent/kimi/<id>` branch, `.worktrees/<id>` worktree, non-empty
  allowed paths, named verification commands, and no secret-shaped keys.

## Verification

Per the slice protocol, the integrating Codex runs the focused gate exactly
once; it was not run from the implementation worktree:

```text
node scripts/verify-development-environment-v1.mjs
```

Local hook activation (one-time per clone/worktree):

```text
npm run hooks:install
```

## Bookkeeping notes

- `CURRENT_WORK.md` row ENV-6 remains `Pending` in this worktree because the
  file is outside this slice's allowed paths; the integrating Codex flips it to
  complete after the gate passes.
- No paid Provider call occurred during this slice; the Kimi environment ledger
  is unchanged.
- Unresolved Critical/High concerns: none.
