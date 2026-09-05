# Remaining StarCraft TMG Level-3 development tickets

Execution amendment, 2026-09-05: follow the
[Skill production / play / evolution redesign](skill-production-play-evolution-redesign-2026-09-05.md).
The seven remaining Tickets are 14, 17, 18, 19, 20, 21 and 22.
Slice170 now has real evidence verification, durable partial results,
bounded correction and a functional DSH tool loop; its bounded pilot is complete.
Ticket18 extends that foundation and delivers the first five usable Skills;
its minimal isolated arena precedes full Ticket20 orchestration to avoid a
promotion/self-play dependency cycle. Ticket20 explicitly owns five-stage
postgame analysis, counterfactual branches and SkillOpt candidate production,
which feed Ticket18 evaluation/promotion. User authorization for later Skill
production stands; readiness and budget/notification gates still apply.
Historical status below is not a claim that model quality has been verified.

Implementation closure: Slice170 B/C/D/E and the 20/20 chapter pilot are complete.
Both candidates remain quarantined: clarified mechanics35/36 each, plus a
confirmed direct-arm numeric-boundary reviewer miss. The legacy paired/canary
runners stay held; formal publication remains0/5 pending coverage, repair and
Ticket18 evaluation. See the Slice170 production results and four-step record.

Status after Ticket 17 Slice 170: 15/22 Tickets complete; Ticket 17 is 8/9,
Ticket 16 is 10/10 and Ticket 14 is 15/16.
All planned Web/backend/client development and Ticket 15 online role-Agent work
are complete, while the explicitly deferred physical-device acceptance remains
open. Ticket17 is active; standing authorization for later Skill production
is retained, with readiness, first-five priority and cost gates still enforced.

| Ticket | Purpose | Completion evidence |
| --- | --- | --- |
| 14 | Shared Web/App client: restore the Expo product, implement one Client Domain Module, mount authoritative rooms/board/source/character flows, migrate Battle Lab, add the complete battle workbench, and prove browser plus real-device behavior. | 16 slices (128–143), Web/App/Battle Lab parity, unit/scenario/deploy/score inspection, multi-mode threat, rules-bound probability, complete Token/Marker action surface, score forecast/rules quick view, no second state authority, pinned builds and browser/native traces. |
| 15 | **Complete.** Online role-Agent sessions: Tutor, Opponent, Commentator and Companion are real room-connected product modes with isolated tools, visibility, prompts and memory. | Nine slices (144–152); authenticated HTTP; real Chromium four-mode/failure/cancel/reconnect/budget evidence; legal Opponent Preview and human-confirmed Apply/Receipt/Replay; 192 fixed assertions including closure. |
| 16 | **Complete, 10/10.** Direct Provider and secure BYOK: move the current injected Adapter into isolated, budgeted, recoverable production execution. | Slices 153–162 complete; isolated credential/egress child, SQLite/PostgreSQL store contract, durable Gateway, Web flow and redaction/browser aggregate; one authorized DeepSeek HTTP 200 attempt with zero retry; 20/20 preflight, 16/16 live closure and 531 cumulative fixed assertions. |
| 17 | **In progress, 8/9.** DSH offline candidate generation with direct control. | Slices163–170 complete, including source-spans, durable repair/accounting, actual DSH tool loop, 20/20 candidate chapters and independent mechanics evaluation. Candidates remain quarantined; Slice171 owns operational/performance/predecessor aggregate closure. |
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
aggregate, Ticket 15 and Ticket 16 are complete. Ticket 17 Slices 163–169
freeze the denominator/current evidence, implement the role graph and prove the
disposable M1 firewall, pinned DSH lifecycle, common broker/control arm and the
real redacted DSH executor; continue with the bounded Slice 170 pair only after
its paid-run preflight and user-visible cost forecast, without waiting for the
user-deferred physical-device batch. Ticket 14 remains formally
open until device evidence is later collected.
Development does not pull source updates again unless explicitly commanded.
Later Skill generation retains the user's standing authorization; it cannot
bypass readiness, first-five priority, cost notification or promotion gates.
