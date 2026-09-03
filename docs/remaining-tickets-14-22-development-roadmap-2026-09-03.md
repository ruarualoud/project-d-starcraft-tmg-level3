# Remaining StarCraft TMG Level-3 development tickets

Status after Ticket 16 Slice 157: 14/22 Tickets complete; Ticket 16 is 5/10 and
Ticket 14 is 15/16.
All planned Web/backend/client development and Ticket 15 online role-Agent work
are complete, while the explicitly deferred physical-device acceptance remains
open. Ticket 16 is the active development target with a fixed 10-Slice
denominator, Slices 153–162.

| Ticket | Purpose | Completion evidence |
| --- | --- | --- |
| 14 | Shared Web/App client: restore the Expo product, implement one Client Domain Module, mount authoritative rooms/board/source/character flows, migrate Battle Lab, add the complete battle workbench, and prove browser plus real-device behavior. | 16 slices (128–143), Web/App/Battle Lab parity, unit/scenario/deploy/score inspection, multi-mode threat, rules-bound probability, complete Token/Marker action surface, score forecast/rules quick view, no second state authority, pinned builds and browser/native traces. |
| 15 | **Complete.** Online role-Agent sessions: Tutor, Opponent, Commentator and Companion are real room-connected product modes with isolated tools, visibility, prompts and memory. | Nine slices (144–152); authenticated HTTP; real Chromium four-mode/failure/cancel/reconnect/budget evidence; legal Opponent Preview and human-confirmed Apply/Receipt/Replay; 192 fixed assertions including closure. |
| 16 | **Active, 5/10.** Direct Provider and secure BYOK: move the current injected Adapter into isolated, budgeted, recoverable production execution. | Slices 153–157 complete: frozen boundary, explicit consent/ingress, isolated credential Worker, exact allowlisted HTTPS transport and common SQLite WAL attempt/budget store. Slices 158–162 retain PostgreSQL parity/recovery, Gateway/Web integration, redaction fuzzing and user-authorized live model/version receipt. |
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

The FAQ F1–F5 review lane, Slice 142 build record, Slice 143 Web/security
aggregate and Ticket 15 are complete. Continue Ticket 16 without waiting for
the user-deferred physical-device batch; Slice 162's single live Provider call
still needs a separately configured local BYOK secret. Ticket 14 remains
formally open until device evidence is later collected.
Development does not pull source updates again unless explicitly commanded.
Large-scale Skill generation remains behind a separate user confirmation.
