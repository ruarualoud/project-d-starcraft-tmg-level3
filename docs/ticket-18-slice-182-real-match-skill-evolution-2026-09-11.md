# Ticket 18 / Slice 182 — real-match Skill evolution and final acceptance

Date: 2026-09-11
Status: complete
Ticket progress: `11/11`; project progress: `17/22`

## Outcome

The two current-Rules complete matches from Slice 181 now drive the real
postgame chain:

`complete match -> hindsight-safe Episode -> aggregate reflection -> local versioned SkillOpt -> predecessor regression -> independent position counterfactuals -> isolated acceptance -> explicit rollback`.

This closes Ticket 18's active five-Skill and stable-evolution scope. It does
not publish either candidate, turn replay into training truth or claim measured
win-rate improvement.

## Real-match reflection and local versions

Two sealed Episodes preserve every designated-Agent decision-time input while
placing Apply receipts, post-state hashes and terminal results in a separate
outcome object. Both prove reachability from match start and final replay/current
state equality; neither exposes the final Draw to the original decisions.

The aggregate reflection found the same bounded lesson in both directions:
repeated Hold preserved an occupied mission marker but ended `4-4`; this supports
Hold as a local preservation action, not an always-Hold strategy. Threat coverage
was unknown and the fixture intentionally omitted broader movement/attack
families, so it cannot establish that contesting or fire-lane alternatives were
worse.

The resulting local versions are:

- `starcraft-tmg.matchup.terran_armed_forces-to-zerg_swarm@1.0.0-offline-bounded-evaluation+skillopt.fullmatch.1`, hash `41d024e6...6dc2`;
- `starcraft-tmg.matchup.zerg_swarm-to-terran_armed_forces@1.0.0-offline-bounded-evaluation+skillopt.fullmatch.1`, hash `ce0969b8...ada1`.

Both expose a structured `position_aware_hold_v1` protocol to the runtime prompt
route. It requires this order: marker control/base-edge distance, current and
projected score, movement/attack/counterplay LegalSpace, threat coverage/fire
lanes, then preservation-versus-scoring comparison. Missing spatial evidence
requires a query and a bounded claim; it never authorizes an invented move or
Rules override.

## Evaluation

Each candidate passed:

- predecessor Rules-executed regression `4/4`;
- five position decisions from its real complete match `5/5`;
- three independent position counterfactuals `3/3`.

The always-Hold negative control failed both decisive counterfactuals per
direction: opponent-controlled/reachable marker and behind-on-score with a legal
attack. A secure owned marker while ahead remains a valid Hold, so the evaluator
does not merely reject every Hold.

Only Critical/High findings block. The candidates have zero. Two Medium findings
remain tracked: the match is a Marine/Zergling Hold/Pass subset, and broader-army
spatial/combat strength belongs to Ticket 20. These do not stop integration but
prevent a strength or win-rate claim.

Final grades:

- Rules correctness: passed for the current bounded fixture;
- runtime usability: passed two current-Rules terminal matches;
- strategy quality: usable position-aware advisory with bounded claims;
- complete-game evidence: wiring and evolution passed, win-rate strength not
  proven.

## Acceptance, rollback and portability

Both candidates were exact-hash routed and accepted only in isolated registry
revision 2. Revision 3 explicitly rolled back to the exact five foundational
parent hashes. Automatic promotion is false; the candidates are manual-
promotable and currently not live.

The strictly frozen V2 portable manifest remains hash
`47ed51cb...bc8`. V3 manifest `1c5a7cec...0d3a` adds exact tracked references
for the two Episodes, reflection, position evaluation, candidates, promotion
records and final evidence. The V3 loader passed once with zero `build/`
dependencies and no highest-version selection.

## Harness report contract

- `harnessLoopUsed`: true
- `targetGames`: `starcraft-tmg`
- `promptPackRoutes`: reflection, SkillOpt, candidate and accepted-parent routes
- `harnessToolsCalled`: trace read, Episode compilation, reflection, candidate
  write, LegalSpace evidence read, position counterfactual, exact candidate route,
  isolated acceptance and rollback
- `uiTraceEvidence`: both Slice 181 Workbench snapshot lineages
- `agentDecisionEvidence`: both direction-specific position evaluation hashes
- `memoryTraceEvidence`: no reflection promoted; candidates remain manual and
  parents restored
- `trainingTraceCandidates`: empty
- `rollbackOrDemotionRules`: Critical/High or independent-case failure
  quarantines; negative control rejection and explicit revisioned rollback are
  mandatory
- `userVisibleChecks`: separate pre-action/outcome Episode views, structured
  position protocol, discriminating counterfactuals and exact parent restoration

## Focused verification and cost

After its implementation change, only
`node scripts/run-ticket-18-real-match-skill-evolution-v1.mjs` ran and passed
once. After the independent V3 files were added, only
`node scripts/verify-ticket-18-portable-strategy-pack-v3.mjs` ran and passed
once. No prior green command was repeated.

Final report hash is `6e42d315...6b60`; V3 manifest hash is
`1c5a7cec...0d3a`. There was no source refresh, Provider/model call or
incremental cost. The retained matchup epoch is `34,120,976` tokens / estimated
CNY `15.721921`; cumulative remains `260,204,060` / estimated CNY `312.143927`.

## Next explicitly corrected faction experiment

No Terran/Zerg combined Faction Skill will be produced. The next two independent
Faction artifacts are Protoss `Daelaam` and Zerg `Kerrigan's Swarm`; the latter
is compared with the existing `Zerg Swarm` as two Factions under one Race.
`Terran Armed Forces` remains the sole Terran Faction in this experiment, and
`Raynor's Raiders` is not selected.
