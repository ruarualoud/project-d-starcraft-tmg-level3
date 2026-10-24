# T27 / S272 — causal geometry feedback and bounded continuation

T27 5/6, T23 33/36; remaining main slices 248/272/249/250 = 4; complete games 0/12. No new Room, applied Plan, map certification or strategy promotion.

## Actual evidence changing the next action

The v100 B opponent scenario now produced an actual native marker-control receipt: marker 2 player2 Supply 3; marker 4 player2 Supply 2; both sole-contestant control under unchanged hypothetical positions/status/Supply. Receipt `b043f3b4db0752d469d0b3e57a60eca2dc163a529fb6b404067a57dcdc9c32f1`. This is not legal arrival, future opponent behaviour, actual score, or a proven strategy.

Two subsequent B requests exposed a causal-feedback error. The scenario constructor returned a branch with `resultStatus: ok`, but its `hypotheticalPlacementAssessment` reported overlapping Goliath/Marauder bases, and another scene reported Marine/wall and other overlaps. Native follow-ups correctly propagated those geometry failures. The evidence port incorrectly told the model these were errors in the follow-ups, **not** `toolRequest.spec`, and to retain the scenario. The model claimed to shift the pieces but returned unchanged coordinates. Recovery then closed before using its remaining bound, without explicit unchanged-request feedback.

A separately omitted named opponent pieces in a correction; that is real scope loss, not a valid narrow answer. It remains unresolved and is not waived by the geometry fix.

## Product changes

1. `roster-teach-evidence-port-v1.mjs` descriptor 1.0.7: use the native placement assessments to identify exact `spec.placements` pointers and causal failures. Distinguish dependent child errors from independent bad child arguments. An invalid constructed branch requires a rebuilt hypothetical scene, not just a query-argument rewrite. Do not change coordinates, terrain, Rules or strategic preferences on the model's behalf.
2. `roster-teach-query-recovery-v1.mjs`: an unchanged structured request is not executed. Retain the paid choice, explicit no-change feedback and original native failure, and use remaining attempts rather than closing early. After an explicit saved-request refresh proves the old Host feedback wrongly protected failing geometry, the standing operator policy grants at most one additional attempt if the previous bound was exhausted. Record the original bound/history and the concrete fix; later resumes cannot grant it again.

## Focused verification only

- `verify-slice272-causal-geometry-recovery-v101.mjs`: actual B failure and minimized two-piece native overlap. RED14864/11.534s exposed missing result after premature close; changed its assertion to report missing result safely. Sole GREEN15520/17.089s proves placement error attribution, no execution of unchanged request, explicit feedback, retained bound, real corrected native control query and no source mutation. No Provider or Room calls. This does not prove full B geometry/model repair.
- `verify-slice272-causal-feedback-resume-v102.mjs`: actual exhausted B post-loss operation. RED0-vs-1 calls; sole GREEN1.490s proves one extra correction after that concrete feedback fix, unchanged historical choices, and no second grant/re-execution on re-entry. Scripted model choice defers, so not real Provider/geometry success.
- Previous passed gates and full suites were not rerun. No new tests unrelated to the observed failures.

## Safe handoff and costs

One cancellation request per v100 job timed out as an observation; neither was resent or killed while paid work was active. Subsequent actual terminal records: B `ROSTER_WORKSPACE_CANCELLED` at 22:14:50Z, A at 22:15:24Z; latest Provider dispatches completed. Original Rooms A133/C156/B9/D9 unchanged.

Actual v100 increment:

| Arm | Calls | Units | Cache hit / miss / output | Frozen historical USD estimate |
|---|---:|---:|---|---:|
| A | 4 | 480466 | 469376 / 8454 / 2636 | 0.004257828 |
| B | 8 | 1552916 | 1452288 / 93003 / 7625 | 0.022882314 |

Not current pricing or an invoice. Old/unknown fees remain. v102 new calls are additional, not included above.

The v102 runner validates exact terminal workspace/host identities before replacing idle hosts, then resumes only the saved selection on the same workspace. Initial launch A18761/host18823, B18762/host18788. Read `common-v102-*-causal-query-recovery-progress.private.json` plus actual PIDs, not stale running labels; do not blindly launch the script twice. A baseline77calls/12036996units, B186/19289692. Plans remain A8/B17, not applied.

An observation REPL exceeded its heap while parsing accumulated large drafts; it was replaced by isolated, bounded-output reads. Product checkpoint serialization/hash/clone overhead is a separate observed performance concern (A draft about 228MB, B about 99MB), not yet benchmarked or fixed. Do not claim the short CPU sample establishes a whole-stage timing split.

## Remaining work

Observe actual repaired queries and model decisions; address genuine prerequisites without treating hypothetical unknown as zero/impossibility. Apply evidence-aware Plan revisions explicitly, then resume original four Rooms on one code version. Full 2000-point builder/map/game comparisons and strategy replay remain required.

harnessLoopUsed=true; targetGames=starcraft-tmg; routes=fact_probe/harness_optimizer; tools=native hypothetical geometry and marker control; no UI action or new screenshot; public model reasons/tool results only; trainingTruth=false; canAffectRules=false. Demote any query whose exact scope/geometry is unproven; no Skill promotion from these transport tests. No subagent, install, deletion, official data refresh or commit.
