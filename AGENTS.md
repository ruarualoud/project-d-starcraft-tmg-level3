# StarCraft TMG Level-3 workspace

## Scope

- Put all new StarCraft TMG Level-3 product code, contracts, docs, scripts, and evidence under this directory.
- Treat the repository-root StarCraft scripts, `starcraft-tmg-local`, imported Expo artifacts, and external repositories as read-only adapter inputs until an explicit integration task authorizes edits.
- Do not make another runtime implementation authoritative. The only mutation sequence is `createEnvelope -> legalSpace -> preview -> apply -> replay`.

## Before editing

- Read the repository-root `PROJECT_MEMORY.md` and `TASKS.md`.
- Read `docs/implementation-plan-2026-08-24.md` and the relevant local package contract.
- Preserve unrelated dirty-worktree changes.

## Product invariants

- Rules and Referee results fail closed. Character/worldbook text, translations, memories, Providers, and Skills never override rule truth.
- Tutor, Commentator, and Companion are read-only. Opponent may submit only an enabled LegalSpace candidate and still requires the configured confirmation policy.
- New traces and exports remain `trainingTruth: false` until player-view, leakage, lineage, replay, and promotion gates pass independently.
- DSH is an offline Skill-generation Adapter only. It is never an online game or character runtime.

## Verification and bookkeeping

- Do not run tests, lint, typecheck, installs, migrations, or network commands without the approval required by the repository-root instructions.
- Write generated evidence below this directory.
- After code changes, update the repository-root `TASKS.md`; update `PROJECT_MEMORY.md` only for durable knowledge. Do not commit unless asked.
