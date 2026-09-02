# Remaining StarCraft TMG Level-3 development tickets

Status after Ticket 14 Slice 134: 13/22 Tickets complete; Ticket 14 is 7/11 and
Tickets 14–22 remain.

| Ticket | Purpose | Completion evidence |
| --- | --- | --- |
| 14 | Shared Web/App client: restore the Expo product, implement one Client Domain Module, mount authoritative rooms/board/source/character flows, migrate Battle Lab, and prove browser plus real-device behavior. | 11 slices (128–138), Web/App/Battle Lab parity, no second state authority, pinned builds, browser/native traces. |
| 15 | Online role-Agent sessions: make Tutor, Opponent, Commentator and Companion real room-connected product modes with isolated tools, visibility, prompts and memory. | Real UI/Harness traces, reconnect/budget behavior, read-only proofs, legal Opponent preview and human-confirmed apply. |
| 16 | Direct Provider and secure BYOK: move the current injected Adapter into isolated, budgeted, recoverable production execution. | Explicit consent/detach, isolated credential Worker, egress allowlist, WAL/attempt/budget recovery, redaction fuzzing and user-authorized live model/version receipt. |
| 17 | DSH Skill-generation Adapter: install and run the pinned DSH execution arm only for offline Skill candidates, alongside the DSH-off control. | Disposable isolation, real DSH session log, exact config/plugin/model/tool/cost receipt and proof that it cannot publish or reach online/Rules paths. |
| 18 | Skill scheduler, evaluation and promotion: turn candidate generation into durable DAG jobs with leases/fencing/WAL, Judge/Cross-Time/held-out/A-B gates and administrator promotion/rollback. | SQLite/PostgreSQL scheduler parity, crash recovery, fixed evaluation denominators, quarantined candidates, approved versioned Skill snapshot. |
| 19 | MuZero player-view trajectory contract and export: define observation/action/reward/discount/chance/recurrent-state lineage from the authoritative journal. | Viewer-leakage tests, terminal/version binding, NDJSON/MuZero/RLDS round trips; eligibility remains separately gated and no learner is trained. |
| 20 | Human-agent and agent-agent self-play orchestration: bind seats, Providers, Skills, Rules/data, maps, rosters, RNG, budgets and experiment cells. | Finite H-A/A-A denominator, pause/resume/recovery, opponent pools, failure accounting, viewer-safe trajectories and no automatic promotion. |
| 21 | Production operations, security and observability: distinguish local demo, controlled experiment, production room and training-eligible run. | Identity/RBAC, KMS, multi-instance CAS, persistent queues, immutable releases, privacy retention, telemetry/cost controls, incident rollback and distribution gates. |
| 22 | Final implementation-ready synthesis and acceptance: consolidate ADRs, contracts, milestones, dependencies, risks, verification matrix and handoff. | Requirement-by-requirement audit proving the full Web/App/Rules/Agent/Skill/source/self-play/MuZero outcome, with every remaining blocker and production gate explicit. |

The order is dependency-driven rather than fully serial. Ticket 19 can progress
once its authoritative journal inputs are stable, and Ticket 17 can advance in
parallel with client work, but large-scale Skill generation remains behind the
user's explicit confirmation gate. Tickets 20–22 depend on the earlier Agent,
Skill, trajectory and production contracts and cannot be truthfully closed by
scaffolds alone.
