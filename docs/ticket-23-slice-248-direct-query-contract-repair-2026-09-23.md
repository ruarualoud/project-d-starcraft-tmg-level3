# T23 / S248 — direct spatial query argument contract

## Concrete failure and diagnosis

Saved c81 calls `base_edge_distance` with relationship-style
`subjectUnitIds`/`targetIds` and an intent. The primitive needs one physical
`source` and `target`, each identifying a model or physical marker/token.
The exported native tool previously named query kinds but described their
arguments only as a JSON string. Runtime forwarded undefined references into
the geometry kernel, then returned an unhelpful raw TypeError as `unknown`.

Ranked hypotheses, shown before repair:

1. Missing query-specific argument documentation and boundary validation;
   a repairable contract should replace the raw TypeError for the captured call.
2. Missing physical geometry; canonical references would also fail.
3. Viewer/identity unavailability; valid visible references and unavailable
   references should remain distinct, without bypassing the player view.

The new focused verifier first reproduced exactly
`Cannot read properties of undefined (reading 'unitId')`. This is not a network,
model-selection or collision-kernel failure. Relationship queries already
provided usable distances in the live game, so this remains a Medium defect,
not a reason to replay accepted choices.

## Repair

The direct-query runtime now owns both argument contracts and the native tool
descriptor consumed by the Decision Port. `argumentsJson` explains physical
references and points unit matrices to `space.inspect_relationships`. No new
distance implementation, first-model shortcut or automatic tool substitution.

Malformed input returns `DIRECT_SPATIAL_QUERY_ARGUMENTS_INVALID`, missing-field
paths, the expected schema and, for an unambiguous unit matrix, an **unexecuted**
relationship-query suggestion preserving its unit IDs, target IDs and intent.
The result stays unknown/null, with no movement/selection/apply authority.
Correct requests still call the unchanged official nearest-base kernel.
Unavailable physical references remain unknown rather than fabricated zero.
The range primitive shares the same reference validation; numeric-string
compatibility remains, while missing/null/empty ranges cannot become range0.

Only tool-use documentation changes in the model input; strategy instructions,
Skill contents, objectives, weights, output capacity and query-round budgets
are unchanged. Prompt policy v24 identifies this descriptor change; paid
historical outputs keep their original version and no local replay version
was bumped. New evidence must observe that planning remains intact after load.

## One relevant verification

`verify-ticket-23-slice-248-direct-query-contract-v1.mjs` reads saved c81 input
and immutable r80 geometry. Its fixture binding is explicitly local: **not a
reacceptance of the c81 game action**. First run red on the exact TypeError;
one post-fix run passed in1.527s. It proves:

- Original malformed request returns the actionable contract and exact batch
  query suggestion; no delegated query is silently executed.
- Canonical Raptor-model1 to Goliath-model1 distance is19.516in and deeply
  equals the kernel result. This is that model pair, not a unit minimum.
- Within/wholly-within equals the unchanged kernel; five malformed inputs
  cannot produce a numeric result; unavailable IDs remain unknown.
- The native descriptor carries both direct contracts and the matrix route;
  Room fixture and captured arguments remain unchanged.

0Provider/Room mutations/paid units/¥0. No old verifier, full suite or Web build
repeated. The live76208 server predates this edit; safe reload and new-call
observation are separate pending steps, not claimed from this unit gate.

## Live progress while repairing

r85 Swarmling Run→r86finish→r87 Kerrigan Swarm Raptor Run allApplied/Replayed/
captured. At00:23:02.970Z:80new+7prefix=r87,222calls/25,723,363accounted units/
estimated¥34.165061, bothFlash. r85 screenshot inspected.

The r85 public explanation calls12.317in the smallest marker5 distance even
though its same comparison lists11.838/11.558/11.284. Selected delta+0.115in
is farther, while alternatives approach by0.364/0.644/0.918in. Facts were
delivered; preserve this clear comparison error forS249 without rerolling.
The declared18-model Swarmling/Supply1 agrees with the frozen/current Room
data and the earlier source audit recorded in rootTASKS (2026-09-22); do not
confuse it with ordinary18-model Zergling/Supply2 or refresh sources mid-run.

r87 selected6-model Kerrigan Raptor instead moves marker gap12.407→6.275in
(another exposed option6.041). Minimum-unit-edge change may exceed the leader's
5in allowance because the remaining models use legal placement; it is not
itself a path violation. No claim that this is a globally optimal formation.
The r85 Host interval306.449s/129exact attempts contrasts with r87's20.153s/
4exact attempts; retained as profiling evidence, not a permission to shrink
search diversity or strategy information.

## Harness handoff

harnessLoopUsed:true; targetGames:StarCraft TMG; route:selfplay_agent_prompt.
Tools:direct measurement, relationship query, formation, Rules Apply/Replay.
UI evidence:r85–87 actual board screenshots; public reasons and current plan
are retained. No hidden chain of thought, Room memory rewrite or training
promotion. trainingTruth:false. Demote if canonical kernel parity, view
isolation or unknown semantics regress. T23 stays33/36:248full match,
249review,250synthesis open; K3S271 remains stopped after its separate3cycles.
