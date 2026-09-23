# Ticket 27 — Teach-grounded roster planning and planned preset lists

Status: the planned-preset v2 contract and an opt-in Teach contract/runtime seam are implemented and locally checked. Production Challenger/Student Provider adapters, the real preset-list plan-only entry, match-open continuity and product acceptance remain open. No new Provider call is claimed. This supplements S269–270 without overwriting K3's in-flight S272 worktree.

## Current evidence and missing seam

`roster-strategist-runtime-v1.mjs` currently runs `strategy_foundation` → typed information-needs queries → `candidate_proposals` (two to four lists) → `comparison_selection`. It reads accepted General, faction and directional-matchup Skills. Thus a public small score-route plan already precedes unit selection, and the final round deepens it into component purposes, deployment, tradeoffs and a RosterPlan. It is **not** a Teach cycle: no separate challenger asks falsifiable questions and no student explicitly retains/revises the small plan against the query results before unit selection.

`roster-plan-contracts-v1.mjs` couples `presetRoster=true` exclusively to `planStatus=no_pregame_plan` and forbids all strategy content for that case. This is correct for the existing no-plan control but cannot represent a fixed list that was subsequently planned. Do not silently loosen the frozen v1 contract; introduce a new versioned planned-preset contract and keep the old no-plan artifact readable.

## Required causal sequence

1. Freeze official source/rules snapshot, mission/deployment/map, current opponent-information boundary, accepted Skill hashes and the Builder menu or fixed-list audit.
2. Student proposes a *small* public victory-route hypothesis: scoring windows, likely opposition, resource/loss assumptions, falsification conditions and questions. It selects no units yet.
3. Independent Challenger reads that hypothesis and the same authoritative/advisory boundaries, names concrete counterexamples or missing evidence, and requests bounded probability, spatial, scoring or scenario queries. A challenge is not Rules truth by itself.
4. Student answers every challenge with `retain`, `revise` or `unresolved`, cites the actual query/Skill/source receipt, and publishes a revised small plan. Unresolved claims remain unknown; contradicted claims cannot silently survive. Only this reviewed hypothesis becomes the unit-selection premise.
5. For an Agent-built list, propose model, composition, upgrade and tactical-card combinations; Builder returns exact legal/illegal verdicts. For a preset list, lock the existing roster/audit identity and skip this selection step—never mutate it under the guise of planning.
6. For each legal candidate (or the locked preset), deepen the plan: per-component role, deployment, activation/reinforcement route, objective and attrition schedule, opponent response/counter-response, risk and loss budget, invalidation triggers, and bounded scene-lab evidence. Compare candidate lists only where multiple lists exist.
7. Publish final legal roster plus RosterPlan, or planned-preset RosterPlan bound to the *same* frozen roster and audit. At match open seed the durable TurnPlan from it; actual outcomes and opponent actions produce explicit retain/revise/abandon events. The two layers remain separately versioned.

The Teach dialogue and public evidence are not hidden chain-of-thought. No Teach output can override Builder, Room or Rules. This is a pregame/offline planning procedure; it does not mutate accepted Skills. WikiSkill/EvoTest or SkillOpt updates still require later held-out and complete-game review.

## Concrete next deliverables

| Deliverable | Required proof |
| --- | --- |
| Versioned challenge/answer receipts with teacher/student roles and source hashes | Every challenge has a target claim, falsification test and evidence status; every answer cites it and records retain/revise/unresolved. |
| Runtime Teach seam between Foundation and Proposals | Trace proves no unit choice before challenge resolution; a contradicted score-route claim cannot silently reach proposals. |
| Planned-preset RosterPlan v2 and plan-only entry | Preset roster hash and exact Army audit remain unchanged; no-plan v1 still round-trips; planned preset has non-fabricated public plan and legal candidate binding. |
| Match-open RosterPlan→TurnPlan bridge | Both seats can query plan origin and cross-round revisions; fixed no-plan control is not retroactively assigned intent. |
| Real Flash and paired evaluation | First use local scripted fault replay, then one fresh paid pregame trace; compare list/plan quality separately from play, keep all raw traces non-training. |

Only Critical/High findings block integration. The final evaluation must examine strategy quality—including budget utilization, score-route plausibility, responses to opponent changes, and eventual match outcomes—not merely JSON validity or list legality.

## First implemented deliverable: planned-preset contract v2

`packages/roster-strategist/planned-preset-roster-plan-v2.mjs` leaves the frozen v1 module untouched. Its small interface creates, verifies, serializes and parses a planned preset. Creation requires an existing verified v1 `no_pregame_plan` baseline, the same plan/side identity, a later plan version and an exactly Rules-legal candidate whose audit hash matches the baseline. The v2 binding records the baseline plan hash/version, locked roster hash, Rules audit hash, preset source and candidate hash. The strategy fields are checked with the existing v1 semantic verifier under a temporary non-preset validation view; the published v2 object remains explicitly `presetRoster=true` and can never be mistaken for an Agent-built list. Changed binding, hash, candidate or audit fails verification. The v1 baseline remains separately readable.

One local direct contract check used the retained real Agent-produced RosterPlan as strategy content and constructed an isolated no-plan baseline from that candidate's audit. It passed v1 baseline verification, v2 round trip and candidate-hash conservation, and rejected changed roster hash and mismatched Rules audit. Calls/room mutation/cost: `0/0/¥0`. This is **not** a real fixed-preset plan-only generation test: the baseline was a contract fixture and no model planned over the official fixed recipe. That is the next delivery alongside Teach.

## Opt-in Teach seam (not yet a production Provider path)

`roster-teach-cycle-v1.mjs` implements a public Challenger→read-only evidence query→Student cycle with source refs, one answer per challenge, `retain/revise/unresolved`, target-change checks for revisions, and typed unknown that cannot support a confident answer. Its ports are separate from the existing K3 deliberation port. The roster strategist calls it after the first Foundation and its information needs, before any candidate proposal, only when `teachPorts` are explicitly supplied. It revalidates the revised Foundation against mission-scoring authority, runs only newly identified information needs, rejects reuse of an existing need ID for a changed request, and binds the cycle hash in the session receipt. With no `teachPorts`, the existing K3 three-round path remains unchanged.

One direct in-memory check passed challenge→query→revision ordering, a changed score-route target, cycle verification, and an unknown-evidence rejection. Runtime import/syntax was checked in the same invocation, but an end-to-end roster session with real Teach ports has **not** yet been demonstrated. The concrete next step is a production Challenger/Student adapter with bounded structured outputs and actual read-only scene-lab receipts, followed by one real plan-first session and a locked-preset plan-only session. No roster strategy improvement is inferred from the local contract check.
