# Ticket 18 / Slice 180 — full-match acceptance audit

Date: 2026-09-11
Status: complete
Ticket progress after audit: `9/11`; final progress after Slice 182: `11/11`;
project progress: `17/22`

## Scope correction

The later faction experiment contains two independent Faction Skills, not one
Terran/Zerg combined Skill:

- Protoss `Daelaam`;
- the second Zerg Faction `Kerrigan's Swarm`, beside `Zerg Swarm`.

`Terran Armed Forces` and `Zerg Swarm` each represent only one current official
Faction card. The selected same-Race comparison will add `Kerrigan's Swarm`;
`Raynor's Raiders` is not selected. The existing Terran→Zerg and Zerg→Terran
artifacts are directed matchup Skills, not Faction Skills. No extra-faction
production starts before the foundational five complete their real-match
acceptance.

## Why the prior `8/8` closure is superseded

Slices 172–179 completed the production, bounded evaluation, online registry,
one-turn room wiring, local SkillOpt and durable release-store engineering
milestones. They did not satisfy the active goal's real battle-effectiveness
acceptance.

The decisive evidence is implementation-level rather than interpretive:

- `scripts/run-ticket-18-online-strategy-arena-v1.mjs` constructs
  `createStarcraftTmgAuthoritativeEngine` without passing `rulesRuntime`.
- `packages/authoritative-engine/transition-v1.mjs` therefore selects
  `starcraft_tmg_legacy_compatibility_rule_runtime_v1`, whose descriptor says
  `legacyCompatibilityUsed=true`, `legalSpaceComplete=false` and
  `rulesTruth=legacy_compatibility_fixture_only`.
- every Slice 176 route applies exactly one transition through an injected
  deterministic Provider. Its own report says full-game effectiveness is not
  proven.
- Slice 177 compiles four completed synthetic Rules transitions, explicitly not
  complete matches.
- Slice 178 evaluates a bounded first-actor drill. Its two Medium findings
  explicitly retain the missing full-game evidence.
- Slice 179 proves artifact portability and Store recovery, not game play.

The old `8/8` statement is retained as a historical engineering checkpoint but
is no longer the Ticket completion claim.

## Requirement/evidence matrix

| Goal requirement | Existing evidence | Audit result |
| --- | --- | --- |
| complete frozen source context and local evidence repair | Slices 172–175 | passed |
| five exact formal Skills | General, Terran Armed Forces, Zerg Swarm, T→Z and Z→T portable objects | passed |
| independent source/rules/usability evaluation | source-field audits and bounded Rules cases | passed for bounded scope |
| actual Harness loads five Skills and executes legal actions | Slice 176 one-turn legacy-compatibility rooms | **High gap**: current official runtime and complete match not proven |
| postgame replay→reflection→local SkillOpt→regression→rollback | Slices 177–178 synthetic one-transition Episodes | **High gap**: no completed real-match input |
| unsupported changes remain quarantined | registry and SkillOpt release evidence | passed |
| complete-game strategy effectiveness | none; all reports disclaim it | **High gap** |

Only the three High gaps block Ticket integration. The missing real PostgreSQL
server remains a Medium/Ticket 21 production concern and does not block this
Ticket 18 gameplay acceptance.

## Frozen remaining plan

### Slice 181 — current-Rules complete-match Harness

Deliver two completed room traces, one for each direction. Every room must use
the current 912/912 executable official Rules runtime rather than legacy
compatibility, load the exact four-item seat route from the five-Skill pack,
derive each action from the current player-view observation and LegalSpace,
execute Preview→configured confirmation→Apply→Replay, and reach an
Authority-declared terminal state. Record every decision and alternative,
Chance lineage, terminal receipt and user-visible board projection. Deterministic
policy may be used to prove the Harness before spending on a model, but it may
not be called model-strength evidence.

Completion update: Slice 181 passed on 2026-09-11. Both directions reached a
Round 5 terminal Draw under the current 912/912 catalogue, with 81 accepted
actions apiece, exact four-Skill seat routes, FAQ 10/16 audits and matching final
Replay/current-state hashes. See the
[Slice 181 report](ticket-18-slice-181-current-rules-complete-match-2026-09-11.md).

### Slice 182 — real-match evolution and final acceptance

Compile the Slice 181 matches into hindsight-safe Episodes; aggregate the two
directions; produce versioned local SkillOpt candidates; evaluate against the
frozen predecessor failures, independent held-out position/counterfactual cases
and complete-match replay; reject a known-bad control; exercise explicit
acceptance and rollback without silently publishing the new candidates. The
final report must separately grade rules correctness, runtime usability,
strategy quality and full-game evidence, and must retain any unproved change as
quarantined.

Completion update: Slice 182 passed on 2026-09-11. Two complete-match Episodes
produced two `skillopt.fullmatch.1` local versions; predecessor cases, real-match
position decisions, independent counterfactuals and negative controls
discriminated correctly. Isolated acceptance was explicitly rolled back to the
five parents. See the
[Slice 182 report](ticket-18-slice-182-real-match-skill-evolution-2026-09-11.md).

Ticket 18 is closed at `11/11`; project progress is `17/22`.

## Harness report contract for Slices 181–182

Both reports must include:

```text
harnessLoopUsed
targetGames
promptPackRoutes
harnessToolsCalled
uiTraceEvidence
agentDecisionEvidence
memoryTraceEvidence
trainingTraceCandidates
rollbackOrDemotionRules
userVisibleChecks
```

Rules remain external authority; Skills and memory stay advisory; no trace is
training truth. No official source refresh or paid Provider call occurred in
this audit. Cost/token totals remain unchanged.
