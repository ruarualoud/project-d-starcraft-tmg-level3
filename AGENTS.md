# StarCraft TMG Level-3 workspace

## Scope

- Put all new StarCraft TMG Level-3 product code, contracts, docs, scripts, and evidence under this directory.
- Treat the repository-root StarCraft scripts, `starcraft-tmg-local`, imported Expo artifacts, and external repositories as read-only adapter inputs until an explicit integration task authorizes edits.
- Do not make another runtime implementation authoritative. The only mutation sequence is `createEnvelope -> legalSpace -> preview -> apply -> replay`.

## Before editing

- Read `CURRENT_WORK.md`; follow its active phase and linked roadmap.
- Run `npm run doctor` once per fresh worktree. Resolve failed checks before editing.
- Read the relevant local package contract. Read the historical parent
  `PROJECT_MEMORY.md` or `TASKS.md` only when `CURRENT_WORK.md` points to a
  specific entry that the task needs.
- Preserve unrelated dirty-worktree changes.

## Work isolation

- One GitHub Issue owns one branch, one worktree, one agent and one focused
  verification command. The slice manifest records all four.
- Codex owns integration. Kimi Code works only in its assigned worktree and
  returns a commit plus verification receipt; it never edits the integration
  worktree directly.

## Product invariants

- Rules and Referee results fail closed. Character/worldbook text, translations, memories, Providers, and Skills never override rule truth.
- Tutor, Commentator, and Companion are read-only. Opponent may submit only an enabled LegalSpace candidate and still requires the configured confirmation policy.
- New traces and exports remain `trainingTruth: false` until player-view, leakage, lineage, replay, and promotion gates pass independently.
- DSH is an offline Skill-generation Adapter only. It is never an online game or character runtime.

## Verification and bookkeeping

- Do not run tests, lint, typecheck, installs, migrations, or network commands without the approval required by the repository-root instructions.
- Run only the focused verification named by the active slice. A passed command
  is not repeated without a relevant code change.
- Write generated evidence below this directory.
- After code changes, update the repository-root `TASKS.md`; update `PROJECT_MEMORY.md` only for durable knowledge. Do not commit unless asked.
- The project owner authorized slice-level local Git management on 2026-09-14. After a Slice's scoped gate and closure bookkeeping finish, commit that Slice immediately; stage only files attributable to that Slice and preserve unrelated worktree changes.
- If older mixed work prevents truthful Slice attribution, use an explicitly labelled historical integration commit instead of pretending it is an atomic Slice commit.
- Local Slice commits do not authorize pushing, opening a PR, rewriting history, or modifying remote state.
