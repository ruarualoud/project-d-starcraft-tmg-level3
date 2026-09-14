# Remaining StarCraft TMG Level-3 development tickets

Completion-audit amendment, 2026-09-14: Tickets 17, 18, 19, 20, 21 and 22 are complete;
Ticket 18 closed at `11/11`, Ticket 19 at `6/6`, Ticket 20 at `10/10`;
Ticket 21 closed at `8/8`, Ticket 22 at `5/5`, and project progress is `21/22`.
The only remaining item is Ticket 14's deferred physical-device acceptance.
The prior Ticket18
`8/8` closure is retained only as the Slices 172–179 engineering checkpoint.
Slice 180 proved that the online Arena used one legacy-compatibility transition
per route and that its evolution Episodes were synthetic transitions, so the
active goal's complete-match and real-match evolution gates were closed by
Slices 181–182. See the
[full-match audit](ticket-18-slice-180-full-match-acceptance-audit-2026-09-11.md)
and the extended
[Ticket18 plan](ticket-18-slices-172-179-first-five-and-evolution-2026-09-05.md).

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
| 17 | **Complete, 9/9.** DSH offline candidate generation with direct control. | Slices163–171 complete, including source-spans, durable repair/accounting, actual DSH tool loop, bounded candidate production, independent mechanics evaluation and operational aggregate closure. |
| 18 | **Complete, 11/11.** Five foundational Skills plus stable production/evolution and truthful complete-match acceptance. | Exact portable five-Skill pack, current-Rules terminal matches, real-match reflection/local upgrade/regression/rollback and final independent strategy grading. |
| 19 | **Complete, 6/6.** MuZero player-view trajectory contract and export: define observation/action/reward/discount/chance/recurrent-state lineage from the authoritative journal. | An actual 80-step terminal A-A trajectory passed viewer leakage, terminal/version/recurrent binding and lossless NDJSON/MuZero/RLDS round trips; eligibility remains separately gated and no learner was trained. |
| 20 | **Complete, 10/10.** Human-agent and agent-agent self-play orchestration: bind seats, Providers, Skills, Rules/data, maps, rosters, RNG, budgets and experiment cells. | Complete product H-A journey plus bounded `1/1` A-A five-round terminal cell; pause/resume/recovery, directional Skill pool, failure accounting, viewer-safe trajectories and no automatic promotion. |
| 21 | **Complete, 8/8.** Production operations, security and observability: distinguish local demo, controlled experiment, production room and training-eligible run. | Environment/RBAC/key/CAS/queue/release/privacy/telemetry/incident contracts and focused evidence; local/controlled ready while external production/device/training approval gates remain explicit. |
| 22 | **Complete, 5/5.** Final implementation-ready synthesis and acceptance: consolidate ADRs, contracts, milestones, dependencies, risks, verification matrix and handoff. | Requirement-by-requirement trace, architecture/contract index, evidence/risk matrix, handoff runbook and one machine aggregate preserve every bounded claim, blocker and production gate. |

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
