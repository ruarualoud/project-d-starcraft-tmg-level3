# Current work

This is the compact entry point for agents working in this repository. Historical
detail remains in the parent `TASKS.md` and `PROJECT_MEMORY.md`; load a specific
historical entry only when a linked task requires it.

## Active phase: product development resumed

The collaboration environment is complete. Product work resumes from the
ordered acceptance list below; Codex owns integration and Kimi receives only
explicit, isolated slice manifests.

| Slice | Deliverable | Status |
| --- | --- | --- |
| ENV-1 | Secret/large-file audit and recoverable historical integration baseline | Complete — `f67c23e`, pushed |
| ENV-2 | GitHub CLI, Kimi Code CLI, Keychain-backed K3 connection | Complete — Kimi `2.0.2`, gh `2.101.0`, `K3_READY` |
| ENV-3 | Pinned runtime, ignore policy and offline environment doctor | Complete — focused doctor 9 pass / 1 expected dirty-tree warning |
| ENV-4 | Compact navigation and verification routing | Complete — this file is the agent entry point; slice manifests own focused gates |
| ENV-5 | One-Issue/one-worktree Codex–Kimi collaboration module | Complete — five-command interface and two scoped Kimi agents |
| ENV-6 | Focused pre-commit and GitHub CI guardrails | Complete — Kimi implementation `6f17212`, integrated as `de66fb8`; focused gate 21/21 |
| ENV-7 | GitHub labels, issue/PR templates and remaining-slice publication | Complete — 15 labels, templates, 8-issue publication bundle; focused gate 33/33; remote issue apply waits for GitHub CLI authentication |

## Product order after environment repair

1. Ticket 20 Slices 193–195: complete browser product journey. **Active next.**
2. Ticket 14: device/APK acceptance when an Android target is available; Web and
   service work may proceed before the device gate.
3. Ticket 19: MuZero player-view training trajectories.
4. Ticket 21: production operations.
5. Ticket 22: final synthesis and acceptance.

Later Ticket 23–25 work already present on this branch remains preserved as
historical integration evidence. It does not redefine the ordered completion
target above.

## Active invariants

- Official source data is not refreshed without an explicit user command.
- Rules/Authority own legality. UI, Providers, Skills and agents cannot override it.
- One changed area receives one relevant verification run; no automatic full-suite reruns.
- Only Critical/High review findings block integration. Stop a non-converging
  review or repair loop after three rounds and report the blocker.
- No paid Provider call is implicit. Record calls, reported tokens and cost when
  the provider exposes them.

## Navigation

- Domain vocabulary: `CONTEXT.md`
- Primary implementation plan: `docs/implementation-plan-2026-08-24.md`
- Remaining primary roadmap: `docs/remaining-tickets-14-22-development-roadmap-2026-09-03.md`
- Ticket 20 roadmap: `docs/ticket-20-slices-186-195-human-agent-spatial-memory-roadmap-2026-09-11.md`
- Ticket 19 roadmap: `docs/ticket-19-slices-196-201-muzero-player-view-trajectory-roadmap-2026-09-14.md`
- Ticket 21 roadmap: `docs/ticket-21-slices-202-209-production-operations-roadmap-2026-09-14.md`
- Ticket 22 roadmap: `docs/ticket-22-slices-210-214-final-synthesis-acceptance-roadmap-2026-09-14.md`

## Current accounting

- DeepSeek product ledger: preserve the latest authoritative Ticket record; no
  new DeepSeek call occurred during environment repair.
- Kimi environment ledger: 2 CLI runs (1 connectivity probe, 1 ENV-6
  implementation session); token and currency fields were not reported by Kimi
  Code CLI.
