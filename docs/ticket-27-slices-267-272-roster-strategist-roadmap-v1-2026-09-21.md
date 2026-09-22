# Ticket 27 / Slices 267–272 — Roster Strategist roadmap v1

Date: 2026-09-21. Status: planned, `0/6`.

## Product boundary

Army construction has two independent authorities:

1. the Rules-owned Army Builder validates faction, engagement scale, Minerals,
   Vespene, tactical-card limits, Unit composition, upgrades, Specialist
   assignment and every other list-legality constraint;
2. the Agent-owned Roster Strategist chooses a mission-conditioned winning
   route and proposes only Builder-legal rosters. It cannot waive, reinterpret
   or repair a Rules rejection.

The existing fixed Standard-2000 recipe remains an acceptance fixture. It has
no inferred pregame strategy plan. An Agent-built roster instead carries an
explicit versioned `RosterPlan` from construction through play and review.

## Required RosterPlan evidence

The durable record contains public decision evidence, never hidden
chain-of-thought:

- frozen mission, deployment, map topology, terrain modes, engagement scale,
  source/rules/Skill/model/prompt versions and opponent-information boundary;
- selected scoring/winning route, target VP schedule and loss/resource budget;
- intended role for every tactical card, Unit, composition and upgrade;
- deployment concept, activation order, reinforcement policy, threat trades,
  objective-control plan and fallback route;
- opponent archetypes, expected counters, own counter-responses, invalidation
  triggers and conditions that require revising the plan;
- every candidate roster comparison, Rules rejection, probability/spatial/math
  query receipt and isolated simulation receipt used by the decision;
- calibrated outcomes during the match and a postgame comparison between the
  original plan, revisions, achieved score route and actual losses.

These structured hypotheses, decisions, receipts, outcomes and corrections may
feed WikiSkill/EvoTest candidate compilation. Raw prompts, private model
reasoning and hidden chain-of-thought may not.

## Slices

| Slice | Concrete deliverable | Focused acceptance |
| --- | --- | --- |
| 267 | Versioned `RosterPlan`, candidate, comparison, simulation and provenance contracts; preset-roster `planStatus=no_pregame_plan` is explicit. | Contract round-trip and authority-boundary verifier. |
| 268 | Read-only Army Builder query port over the existing official composition/upgrade/budget rules, plus legal candidate enumeration and typed rejection receipts. | Exact parity with current fixed 2000-point audit and selected illegal counterexamples. |
| 269 | Multi-round Roster Strategist: General + faction + matchup Skills, score-route selection, information-needs loop, candidate generation, tool calls, comparison and final legal roster. | One deterministic mocked-provider planning trace; no paid call. |
| 270 | Isolated pregame scene laboratory: probability, geometry, threat exchange and bounded match-scenario branches; source Room and Builder state remain immutable. | Same-state A/B receipt, mutation-zero proof and unknown-not-zero checks. |
| 271 | Web/App roster-planning workspace with plan timeline, candidate diff, Rules errors, simulation evidence, manual override and resumable drafts. | Desktop/mobile browser journey with a screenshot for every visual claim. |
| 272 | Formal A/B: fixed preset roster without a fabricated plan versus Agent-built roster with `RosterPlan`, matched mission/map/opponent/model/Skills/budget and paired seat/seed controls. Export postgame review and WikiSkill/EvoTest candidates without automatic promotion. | Complete games, Replay parity, cost ledger, score-route/plan calibration, screenshots and PDF/JSON report. |

## Evaluation

The A/B report separates list quality from play quality. At minimum it reports:

- legality and build cost;
- projected versus realized VP by scoring window;
- deployment and reinforcement-plan adherence;
- Unit/upgrade utility, unused purchases and opportunity cost;
- predicted versus observed opponent responses;
- plan retain/revise/abandon events;
- casualties, Supply, objective control and firepower exchange;
- model calls, token/currency cost and latency;
- cross-seed and seat-swap robustness;
- WikiSkill/EvoTest candidate usefulness, source traceability and held-out
  result.

Only Critical/High findings block integration. No candidate becomes a promoted
Skill or training truth without the existing independent held-out, full-match,
human approval and rollback gates.
