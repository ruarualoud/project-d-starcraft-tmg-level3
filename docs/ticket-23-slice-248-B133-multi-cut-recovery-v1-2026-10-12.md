# Ticket 23 / Slice 248 — B133 multi-cut recovery

## Current recovery entry

Online B133 is now closed: the original roll was settled at B134 with
`charge_failed`, no position changes, Replay=true and screenshot revision134;
B135 finished that activation. Receipt and pre-declaration evidence are below.
The startup-only statements in this section describe the earlier launch boundary.

Common correctness version:
`s248-v24-B133-multi-cut-proof-v43-20261012`.
Read `build/ticket-23-three-arm-performance-baseline-20261010-v1/common-v24r1-startup-observation.private.json`
and, once ready, `common-v24r1-independent-monitor-progress.private.json`.
The owned launcher 38391 has been started. Startup/online Apply/Replay/screenshots
are not yet claimed. Do not start a second cohort.

Original native boundaries are A132 / B133 / C135, Round 3 Assault. UI/action
records were A131 / B133 / C134. Reconcile A/C accepted-ahead records without
another Apply. Reuse original rooms, army lists, opening Plans, dice, stores,
verified Web export and unlimited separately booked fees. A = fixed army+Plan;
B = fresh army+TeachPlan; C = the same A army without opening Plan.

This is a correctness rollout, not isolated performance-v24/v26 promotion.
Performance candidates remain unloaded. No changed Skills, strategy prompt,
weights, official-data refresh, new room, epoch, reroll or historical rewrite.

## Root cause and convergence

B133 is Marine `player1-exact-repair-3`, six models, original roll 6,
10000 milli-inch cap, target Unit `player2-kerrigan-raptor`.
Original state hash:
`eb5ef568ca7087b5ef25e4e25e494ef362f6ccc6fc88412c54bec0af0bc134c5`.

Actual RED 97762: 96 complete formations, all rejected by the full executor as
`SELECTED_SPATIAL_TERRAIN_PATH_BLOCKED`; whole gate 165.849 s. This is neither
Provider transport failure nor a dice/actor mismatch. A finite search failure
must remain unknown, not become a Rules impossibility verdict.

Two attempted candidate repairs did not close it:

- 4634: actual-cell boundary waypoints, same 96 terrain rejections, 96.726 s.
- 27183: truncate a detour by the original rolled budget, still no accepted continuation.

After three failed gates the chain stopped. Those ineffective candidate changes
were withdrawn; legal-formation-search and model-obstacle-route-planner match
their original common-v23 source hashes. Their reports remain for audit.
No unchanged gate or already-passed B111/C120 gate was rerun.

The actual geometric issue is that combined terrain/model detours exceed the
rolled budget, while existing single-cut/occupied-endpoint proofs cannot certify
the whole target Unit. Read-only calculations established a viable multi-cut
lower bound before implementing the new Rules proof. Per standing user approval,
one additional focused gate was then run on the implemented fix.

## Conservative complete multi-cut proof

The old sufficient certificates are retained unchanged. Only an unresolved
target in the flat, no-port composite proof reaches the new helper.

For model blockers retain shrunken forbidden disks. For each exact authoritative
terrain rectangle use inscribed center/corner disks, never its logical region's
bounding envelope. Select parallel oblique cuts before the ENTIRE enlarged
target engagement disk. Every continuous legal route must cross each selected
line through its allowed complement. Sampling selects constraints, not paths.

Joining ordered crossings cannot lengthen a real path. In this relaxed line-only
problem, a free bend straightens; required bends lie at interval endpoints.
The complete visibility DAG therefore finds its shortest center route. Appending
from an engaged endpoint to target center crosses no selected cut and costs at
most the enlarged engagement radius. Subtract that radius and safety margin to
obtain a lower bound on every actual engaging route. Graph overflow/nonfinite
result returns unknown. No finite route exhaustion is converted to failure.

## Unique authorized additional GREEN

35987 / exit0, `B/B133-original-charge-multi-cut-extra-green.report.private.json`:

| Target model | Sufficient proof | Lower bound |
| --- | --- | ---: |
| 1 | direct distance | 11.630 in |
| 2 | direct distance | 10.383 in |
| 3 | direct distance | 11.580 in |
| 4 | 36 complete oblique cuts / 314 vertices | 11.668 in |
| 5 | 36 complete oblique cuts / 252 vertices | 11.909 in |
| 6 | direct distance | 10.490 in |

All six exceed original 10 in. Frozen full V1-to-V6 runtime enumerates one typed
failure continuation; normal instantiate/apply recomputes the proof and clears
the mandatory pending stage. Model positions remain unchanged. Removing barriers
in the concrete helper control returns unknown, not a false failure.
Whole gate 14.465 s; query 2.681 s. These are correctness-case timings, not
40% performance admission or online SLA. 0 Provider calls / original-room writes.
Original runtime hash `6846515239b62d6914a2c6f5d7314aa8624d9d6c61acc2a4966ce1db91afb819` retained.

## Sealed original cohort and fees

Previous monitor stop00:32:55Z, closed00:45:53.155Z. All seven original handles
were absent before new launch, all six ledgers without open egress. Passive C
observer required exact birth-bound termination after Hosts exited; it performed
no new Rules/Provider work. Shutdown observer latency remains an optimization
item; no untested monitor-policy change is included here.

Last separately booked totals: A ¥193.445909 / B ¥259.276260 / C ¥218.217190.
Next notifications A200/B300/C300. No fee reset; all failed/unused paid returns
remain retained. This fix and its gates added no model cost.

## Diff and next deliverable

- New `official-charge-multi-cut-distance-proof-v1.mjs`: conservative continuous lower bound.
- `official-charge-composite-cross-section-proof-v1.mjs`: fallback only for unresolved targets.
- Concrete B133 gate plus read-only owned diagnostic and retained reports.
- New common43-source manifest and same-original-room operational launch records.
- TASKS / PROJECT_MEMORY / CURRENT_WORK recovery pointers updated.
- Legal formation and model route experimental edits fully withdrawn.

Next: continue the same common-v24 cohort and original activations. The B133
online recovery deliverable is complete; full matches/performance admission remain open.
Counts remain Ticket23 33/36, Ticket27 5/6, remaining S248/272/249/250,
complete games 0/12. No subagent/K3, installation, cleanup or commit.

## Online closure and pre-declaration query/execution identity

Startup was ready02:07:09Z; Hosts38392/38393/38394 and drivers43232/43233/43234,
monitor43236 were birth-bound live. No second cohort was started.

Original B134 accepted receipt:
`9a5db23762dca0a111ddcb65869e3987fe80bf48bc58a88d2cec852a648d521e`.
The public journal133->134 reports roll6, `charge_failed`,
`modelPositionsChanged:false`, Rules-recomputed certificate
`d2180d251b9ff152cec2df1d57887c3f18f145a4ddfacd879ca6c4ce2ffa45bb`.
Original actions.ndjson has Replay=true, observed screenshot134:
`screenshots/0847-r134-player1-resolve_charge-complete-board-applied.png`.
The image was viewed. B135 finish_activation also has Replay/screenshot parity.
Both continuations used0Provider calls; original declaration/roll/paid output retained.

The existing pre-declaration function is
`inspectOfficialSelectedRosterChargePathEvidenceV1` in
`packages/product-composition/official-selected-roster-melee-action-runtime-v1.mjs`.
It creates the maximum-roll bound and calls the SAME supplemental Rules proof as
post-roll resolution. The room-backed instantiate query already returns this
evidence; the existing live decision review returns a newly discovered certain
failure to Planner without replacing the action or excluding other leaders.
No new wiring, independent algorithm, strategy prompt or Skill was needed here.

A first read-only probe removed the pending action and last charge log but
omitted the engine clock reversal; its pre-state hash did not match. Its only
valid scope was saved B133 geometry. The exact recovery additionally restores
gameClock.transition133->132 and deletes pendingAction. It then matches original
B132's COMPLETE pre-state hash:
`a4229f58faff1c661e29c2ed413c769fcbc4820d042a8850410e647f686af778`.
The current production pre-declaration function on this exact original state and
original leader1/target4 returns `certain_failure`, `everyDiceResultFails:true`,
maximum10000, conservative whole-Unit lower bound10383, `successCertified:false`.
Its certificate is exactly the B134 executed certificate above. This is a NEW
focused read-only check of the changed proof's declaration seam, not a rerun of
the already-passed C107 gate or a new Provider decision/Apply.

Evidence: `B/B132-pre-declaration-same-proof-readonly-v1.report.private.json`.
It proves this original state/leader/declaration and the shared Rules function;
it is not a fresh end-to-end model-selection experiment or proof for other leaders.
The earlier statement that the declaration wiring was still missing is superseded.
Before this patch the shared proof could not certify the detour, so path was
unknown; the paid model reason treated a9126 straight-line lower bound as useful
reachability. Unknown is neither a successful path nor an illegal declaration.
Declaration legality, successful movement and unresolved geometry remain distinct.

Monitor02:24:50Z: A139/R3Cleanup, B139/R3Assault, C138/R3Assault, all running,
no all-stop. Booked totals A194.054591/B262.538337/C223.282846; next200/300/300.
Performance v24/v26 remain isolated and unloaded; no all-type/full-round admission.
