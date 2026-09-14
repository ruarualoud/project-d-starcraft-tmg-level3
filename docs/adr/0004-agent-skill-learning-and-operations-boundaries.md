# ADR 0004: Agent, Skill, learning and operations boundaries

Date: 2026-09-14  
Status: accepted

## Context

The product supports a conversational Adjutant, an opponent Agent, offline DSH
Skill generation, counterfactual reflection, self-play and MuZero-compatible
exports. Without explicit boundaries, a persuasive model response, a good
single game or an operational health signal could accidentally be treated as
Rules truth, accepted Skill quality or training eligibility.

## Decision

Online decision flow is:

```text
viewer-scoped observation + LegalSpace + retrieved accepted Skills
  -> read-only tactical/spatial tools
  -> continuity memory + TurnPlan + counterfactual candidates
  -> typed ActionIntent referencing one LegalSpace candidate
  -> authoritative Preview
  -> required human/host confirmation
  -> fenced Apply + Receipt + Replay
```

Tutor, Commentator and Companion are read-only. Opponent and hosted bot seats
may submit a typed candidate but receive no direct state-write capability. Each
seat has isolated observation, memory, Provider and Skill context.

Memory is layered: a compact current plan and intent is injected normally;
older events and evidence remain queryable by scoped tools. Every applied action
records purpose, expected opponent response, contingency, spatial evidence and
result so later activations can continue or revise the plan without receiving
the full private journal.

Counterfactual search is asynchronous and advisory. It may branch from a frozen
state, perform rules-owned calculations and propose a plan revision, but it may
not delay the critical room path indefinitely or mutate the original room.

Offline Skill generation uses Teach/Ctx2Skill plus typed correction and bounded
review. DSH is an optional isolated generation arm, not the online runtime.
Accepted Skills are immutable release artifacts; new reflections become
quarantined candidates. Facts can block promotion, while merely weak strategy is
tracked and compared experimentally. Source/rules changes traverse exact reverse
dependencies and mark only affected Skills stale.

Postgame evidence compilation, private review, challenger/tool grounding,
counterfactual analysis and Memento/SkillOpt production are separate stages.
No stage edits the historical room. Promotion requires held-out/regression
evidence and independent authority.

Training export consumes viewer-safe authoritative journals. Export success does
not grant `trainingTruth`; an independent reviewer approves an exact dataset or
trajectory version. Unknown policy probabilities are never invented.

Operations may schedule, meter, quarantine and roll back exact releases. It may
not reinterpret Rules or auto-promote a Skill. A fresh operator-requested run
resets its max-call safety window but preserves cumulative usage/cost accounting.

## Consequences

- Kerrigan can explain the current room and inferred intent, but inference is
  visibly distinct from public authoritative facts.
- Human–human games require zero model calls.
- A model timeout or malformed structured response cannot corrupt room state.
- Self-play is attributable to exact seat/provider/Skill/Rules/data/Harness
  versions and remains training-ineligible by default.
- Production adapters and independent approvals remain explicit gates rather
  than conditions inferred from a successful local run.

## Rejected alternatives

- Give the model a general room-mutation tool: bypasses LegalSpace and referee
  authority.
- Persist the full prompt and BYOK credential for convenience: violates privacy
  and secret boundaries.
- Automatically publish postgame improvements: allows hallucinated or
  over-fitted advice to replace an accepted Skill.
- Put synchronous deep search on every action's critical path: makes the room
  hostage to an optional planning enhancement.
