# Ticket 24 / Slice 258 live-Agent scheduler stability checkpoint

Date: 2026-09-16

Status: Slice 258 remains open. The same Standard-2000 human-versus-Agent match
is safely paused after authoritative action 57, in round two assault. The
runner's `failed` status is the retained result of an intentional Ctrl-C; the
authoritative room, replay and decision records remain resumable.

## Change

- DeepSeek Chat uses the official beta strict-function endpoint. Every exposed
  function is strict and every turn must call a declared tool.
- Planner and Action terminate through typed `submit_planning` and
  `submit_decision` tools. The Host reconstructs and revalidates canonical
  finite or parameterized proposals.
- Formation, battlefield-asset placement and final instantiation are no longer
  broad Planner queries. Planner chooses a candidate and requests a Host search;
  the Host searches that selected candidate once before Action.
- Historical formation/asset tool results remain in the durable record, but the
  Planner continuation replaces their coordinate enumeration with a receipt
  summary. This removes repeated context without deleting audit evidence.
- Query protection is separated from correction protection. Planner has an
  eight-round safety ceiling, Action has six, while malformed/semantic repair
  remains three rounds. The ceilings are anti-loop safeguards, not target call
  counts. A ceiling-forced terminal answer must retain uncertainty and is
  recorded as a strategy-review signal.
- Every completed decision records a prompt-policy observation against up to
  five earlier paid decisions: plan continuity, candidate and Pass comparison,
  Skill grounding, opponent counterplan, placement reasons, exact evidence,
  calls, tokens and corrections. Medium observations do not block Apply.
- The browser runner now restores the controlled page to the foreground before
  every human turn and captures visibility, focus, online state and URL before
  dispatch. It distinguishes a request proven not dispatched from a response
  timeout: only the former may retry once, while a possibly-sent Preview or
  Apply is never blindly replayed.
- Exact formation search now prefilters only candidates whose model bases have
  overlapping interiors with current model or blocking-terrain footprints
  under the same official physical-footprint relation used by Rules. Contact
  remains legal, candidate order and failure accounting are preserved, and
  every survivor still passes full Rules instantiation before exposure.
- Formation choice is now an explicit spatial tool contract named
  `space.solve_formation`. The Planner supplies weighted tactical objectives
  such as advance, dispersion, compactness, engagement, surrounding, threat
  avoidance, objective control, screening and lane preservation. The Host
  solves complete per-model layouts, exposes several physically legal options
  with tactical metrics, and the Agent selects one option with a public reason.
  Internal spatial sampling is an implementation detail, not a fixed formation
  template, and the Agent need not hand-author every coordinate.

## Focused verification

One syntax/diff check of the three directly changed modules passed. No Rules,
map, UI, historical Slice or whole-repository gate was rerun.

The existing match resumed from:

`build/ticket-24-slice-258-standard-2000-ha-map-v1/20260916085936321`

The already-paid fourth Planner query was processed without replay. The next
decision selected and legally instantiated a two-model Hydralisk deployment,
advanced the recorded action count from 17 to 18, and captured the Apply/UI
evidence before the runner was intentionally stopped.

The same room subsequently resumed through action 37. Human Web actions,
round-one phase completion, round-two start, deployment and replay all passed.
The foreground repair is visible at action 22
(`screenshots/0033-r022-player1-pass-applied.png`). Action 37 applied an exact
18-model Swarmling movement formation and captured
`screenshots/0048-r037-player2-sc-domain-90202c48574325048507854a118a49cddc2e6e609dda1d36c2918e111a525350-applied.png`.

The focused performance verifier reconstructed authoritative revision 36 from
the revision-32 checkpoint and receipts 33--36, re-enumerated the full current
Rules domain, and repeated the exact action-37 formation search without a
Provider call. It preserved all six recorded option IDs in order. Of 273
candidates, 267 exact overlaps were prefiltered and only six survivors entered
full instantiation. The measured search segment completed in 15,597 ms under a
60-second gate; the previous live path spent about four to five minutes fully
instantiating the same 273 candidates.

The next resume exposed a separate revision-37 active-ability defect before any
new action applied. The Planner had selected `Omega Network`; repeated Action
outputs placed the 80mm Omega Worm at the Swarmling formation anchor. Two
independent problems were present:

- the selected-ability runtime's legacy distance helper assumed every blocking
  model had a round base, so the official 40x100mm Hydralisk raised the false
  `SELECTED_ABILITY_ROUND_BASE_REQUIRED` result;
- a Rules-rejected parameterized output was not marked as reviewed under the
  current Action normalization version, so resume repeatedly reconsidered the
  same failed output instead of converging.

The distance helper now uses the shared official round/rectangle footprint
relation and therefore measures nearest physical edges. Rules correctly reject
the model-authored point as `SELECTED_ABILITY_OMEGA_BASE_OVERLAP`. Omega Network
is now classified as a physical asset-placement domain: the Host searches exact
locations, the Agent chooses one placement option ID, and the Host binds and
reinstantiates the canonical parameters. The focused revision-37 regression
found four legal options after 45 candidates; 19 were rejected for own-base
overlap and 22 for insufficient enemy distance. It used zero Provider calls.
Rules-rejected attempts now persist their local semantic replay version and a
proposal/reason signature; the same invalid proposal stops after two identical
failures rather than surviving explicit-retry cycles indefinitely.

The room then advanced through two further authoritative actions: action 38
placed the Omega Worm through the Host asset-placement search and action 39
resolved the Ventral Sacs lifecycle indicator. The next Planner choice is the
18-model Raptor Squadron entering through that Worm. Its formation search
exposed a state-time mismatch: the off-field reserve representation hid the
official `Squadron` four-inch horizontal coherency modifier, so the solver used
the generic three-inch default although Rules correctly evaluated the placed
unit at four inches. Formation evaluation now projects a reserve unit into its
post-placement on-field state before reading static characteristic modifiers,
matching the authoritative placement runtime.

The existing revision-39 bug reproducer was run through three permitted repair
cycles. The first two cycles returned zero options and directly isolated the
coherency projection defect. After that code change, the third and final cycle
passed: six of six generated options survived full Rules instantiation, all
reported `space.solve_formation`, all carried tactical metrics and intent-solver
evidence, and no Provider call occurred. This is a generic reserve-placement
correction used by Omega/Pylon/transport/summon-style entries; it is not a
Raptor-name special case.

The live continuation then consumed that result. Action 40 placed all 18 Raptor
models through the Omega Worm; actions 45, 47, 49 and 52 applied ordinary Move
formations, each followed by normal activation continuation. No exposed layout
was rejected for a board edge, collision, base size or coherency error.

The first current-product Charge declaration exposed two independent legacy
contract defects. The selected-roster charge emitted the chance layout key
`chargeDistance`, while Authority consistently accepts the cross-runtime key
`charge`; after correcting that key, Rules Apply revealed that a parameter-domain
lookup treated absent pending hashes as equal and selected the first unrelated
unit domain. The lookup now considers a pending hash only when the action
actually carries one. A zero-Provider reconstruction of revision 56 with the
same paid Raptor proposal then produced a valid chance spec and the exact
`resolve_charge_after_roll` pending state. The third live convergence round
reused the paid decision, added zero Provider calls and applied action 57
`charge` with its authoritative die result.

The post-roll resolution then exposed the next spatial coverage gap. Its only
domain is `resolve_charge`, but the current Planner classifies only
Deploy/Move/Run/Disengage as formation-bearing. Consequently
`formationSearchRequest` stayed null, `requiredEvidence` requested only generic
instantiation, and the model spent 21 calls attempting to author a full charge
path and 18-model placement. Receipts alternated between invalid charge
parameters and incomplete placement denominators before ending in
`LIVE_DECISION_PARAMETERIZED_PROPOSAL_DID_NOT_CONVERGE`. This is the accepted
Ticket 25 Slice 260 blocker: connect Charge resolution to
`space.solve_formation`; it is not a prompt retry problem.

## Stability and strategy observation

- New-policy calls in this decision: 4.
- New-policy semantic/format corrections: 0.
- Query safety ceiling reached: no.
- Strategy result: `no_observed_negative_strategy_effect`.
- Preserved evidence: plan continuity, selected/Pass comparisons, three Skill
  references, two opponent-response/counter-response branches, two model
  placement reasons and five exact query references.
- Review item: the Agent knew the deployed Hydralisk remained about 16 inches
  from marker 5 and framed the move as next-round staging. This is coherent but
  not yet proof that it dominates the faster Raptor alternative. Track it in
  match/replay evaluation; it is not evidence of truncation by the new scheduler.
- Action 37 revised the prior resource-conservation plan for round-two scoring
  pressure, compared Pass and deployment alternatives, chose the 18-model
  Swarmling move toward marker 5, cited three strategy Skills and two opponent
  counterplans, and supplied a public purpose for all 18 placements. It used
  seven Provider calls and 403,632 reported units, with zero semantic repair,
  no forced terminal submission and
  `no_observed_negative_strategy_effect`. This is auditable plan/evidence
  rationale, not hidden chain-of-thought.

## Performance and cost

- Before canary: 79 calls, 3,531,319 units, CNY 9.642108.
- After applied action 18: 83 calls, 3,759,533 units, CNY 9.952359.
- The decision-wide trace includes four legacy calls and totals 412,408 units,
  versus a five-decision baseline average of 617,978 (about 33% lower).
- The four new-policy calls total 228,214 units (about 63% lower than that
  baseline). The first new Planner prompt fell from the legacy continuation's
  202,548 bytes to 135,432 bytes after coordinate-enumeration compaction.
- Action prompts remain about 205–209 KB because an exact complete formation and
  every model assignment must be visible. That cost is intentional positioning
  evidence, not repeated broad candidate search.
- At action 37 the complete run reported CNY 12.042980. The faulty action-38
  recovery loop made 27 additional recorded calls without advancing the room,
  raising the durable decision ledger to 139 calls, 7,073,496 units and CNY
  14.546626 before it was stopped. This remains below the next CNY 100
  notification threshold. No tighter Provider budget was applied; the repair
  removes repeated invalid calls by replacing coordinate guessing with exact
  Host placement options.
- At authoritative action 39 the durable decision ledger is 151 calls,
  7,681,546 reported units and CNY 15.361386. The focused formation proof added
  no model calls and no cost. Its current local solve takes roughly 2.5 minutes,
  which is recorded as Medium performance debt rather than a correctness block;
  bounded lazy candidates, spatial caching and asynchronous pre-execution
  belong to the dedicated spatial-solver follow-up.
- At action 57 the durable ledger is 250 Provider calls, 12,240,201 input plus
  585,209 output units (12,825,410 total), and CNY 22.205301. The Charge
  declaration repair reused its paid decision with zero new calls; the 21-call
  post-roll non-convergence is retained as Medium efficiency/coverage evidence.
  No CNY 100 notification threshold was crossed.

No source refresh occurred and no decision was promoted to training truth.

## Remaining Slice 258 work

1. In a fresh convergence cycle, extend `space.solve_formation` to the current
   `resolve_charge` post-roll domain so it solves the Leading Model path and all
   remaining model placements against declared-target engagement constraints.
2. Resume the same authoritative room from action 57 without replaying the
   completed Charge declaration, then complete the Standard-2000 match.
3. Review prompt-policy observations after subsequent decision types, especially
   movement, ranged attack, melee/charge, Pass and phase transitions.
4. Produce terminal JSON/NDJSON, screenshots, cost ledger and PDF evidence.
5. Run the planned Agent-versus-Agent, replay/counterfactual/SkillOpt/MuZero
   evidence only after the human-versus-Agent terminal package is sound.
