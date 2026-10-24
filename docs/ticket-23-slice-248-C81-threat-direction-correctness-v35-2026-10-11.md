# Slice 248: original C81 threat-direction correction

Ticket 23 remains 33/36; Ticket 27 remains 5/6. Main remaining slices are
248 / 272 / 249 / 250. Completed whole matches remain 0/12.

## Actual failure and preserved recovery

Original common-v17r2 C stopped with `LIVE_DECISION_PLANNER_DID_NOT_CONVERGE`
at 2026-10-11T09:48:46Z. The owned monitor requested a common stop at09:48:56Z
and closed all three at09:49:00Z. This preceded the isolated LOS experiment;
none of the v18/v19 performance candidates had been loaded.

Read-only SQLite heads after the stop are A77 / B83 / C81, all round3 Movement;
cumulative accepted actions are137 /161 /172. Web indices76 /82 /81 lag two
already-accepted actions; preserve those actions and capture recovery views,
not replay them to produce images. Opening Plan hashes A badb2eb6… / B ba8a49a5…
and C's absent opening Plan remain unchanged.

The six latest seat choices were inspected without Provider calls. A/B paid
outputs were complete; C had one query return and two complete identical
Planner returns. No unknown interrupted paid call was found at these heads.
Original stores, dice, accepted receipts and cumulative fee ancestry remain.
Stopped estimated cumulative costs: A¥169.793361 / B¥228.822115 / C¥196.911379.
These are estimates, not Provider invoices; fees remain uncapped and separate.

## Root cause and narrow repair

The rejected text was `Queen ... has no current threat profiles`, and the
same phrasing for Hydralisk, in alternative comparisons. Saved relationships
show their outgoing `fromTo` stationary profiles empty but incoming `toFrom`
profiles present. The inspector treated possession of no profiles as an
incoming safety assertion. Graph directions were already correct; the
natural-language contradiction predicate conflated them.

One production file changed: `live-flash-decision-port-v1.mjs`.

- Direction-unspecified possessive profile statements become Medium advisory
  findings. They certify neither outgoing coverage nor safety.
- Explicit incoming denials, outside-enemy-band statements and independent
  false safety claims remain checked and blocking.
- Planner local replay normalization v34→v35 admits revalidation of the original
  paid output under the repaired inspector; no paid text or strategy is rewritten.
- Rules/Skills/prompts/models/formation/search/dice remain unchanged.

Concrete regression script: `verify-ticket-23-actual-C81-threat-direction-v1.mjs`.
One RED29654/exit1 reproduced the actual predicate failure. One GREEN30049/exit0
allowed both original outputs with two direction warnings each and still rejected
explicit incoming/independent safety assertions. Original capture unchanged;
zero Provider calls and Room writes. No older passed gates were repeated.

Evidence below `build/ticket-23-three-arm-performance-baseline-20261010-v1/C/`:
`actual-C81-direction-claim.private.json`,
`actual-C81-threat-direction-v1-red/`, and `...-green/`.

## Continuation and performance admission

Common correctness version is `s248-v17-correctness-threat-direction-v35-20261011`.
It uses the original same-room stores and proven v17 performance implementation.
The old manifest retained pre-promotion hashes for several v17 files: do not
mistake that metadata discrepancy for a new live change. Actual promoted/static,
capacity and candidate seams match the proven v17 source snapshot; new isolated
envelope, formation and LOS performance changes remain unloaded.

New hosts31885 /31886 /31887 became ready on the original room identities and
directories. All three original-store Web drivers35574 /35575 /35576 started
together10:15:23Z, with owned birth-bound monitor35995. New handles and monitor
files use `common-v17c1`; never reuse the old closed stop file. At10:16Z the
new monitor was live, no new all-stop, but Web progress still contained the old
failure cutoffs while attachment initialized. Live original-output reuse and
first new accepted gameplay remain pending at this cutoff. Launch/old progress
alone are not resumed-gameplay proof.

Actual10:18Z continuation: all three Web progress records are running at
A77/B83/C81, images476/509/506, Provider calls191/169/131. C drive is running
without a failure. Read-only original C decision store advanced384→387:
original r81 choice now has plannerResult and stage=action, the same three
attempts, original output hash6d5178ca… unchanged, and localPlannerSemanticReplay
v35 on the last original paid attempt. This proves live original Planner reuse
with zero additional Planner call, not merely a field-presence unit gate.
First new accepted action after this restart is not yet certified at this cutoff.
Receipt: `common-v17c1-original-paid-reuse-observation-20261011.private.json`.

Actual10:25Z first resumed actions are fully closed across all three originals:

| Arm | Branch revision / cumulative accepted | Action | Native receipt / Replay / both actual images |
| --- | --- | --- | --- |
| A | 78 / 138 | player1 Goliath-1 Move | all matched/present |
| B | 84 / 162 | player1 exact-repair-2 finish_activation | all matched/present |
| C | 82 / 173 | player2 Vile Move | all matched/present |

Read-only native journal lookup confirmed each original journalHash/postStateHash
matches its actual UI action row. Original board/control files exist; no action
was rerun for these checks. C's preserved Planner now led to a real accepted
movement. All remain R3Movement, no newall-stop. Current global settled estimated
costs A¥170.788753 / B¥229.837230 / C¥197.384424; do not attribute concurrent
counter increments to a host-only lifecycle action. Receipt:
`common-v17c1-first-original-sealed-actions-20261011.private.json`.
This closes the correctness-only continuation evidence, not Slice248, a whole
match, a complete same-version round, strategy quality or performance admission.

Future PERFORMANCE rollout still needs one full same-version round per A/B/C,
matched per-type median and extreme cases each ≥40% faster, no measured case
slower, and complete output parity, followed by common sealed-action/image
boundaries. Current R3 remainder, reduced preparation counts and local GREEN
are not that gate. Genuine High correctness repair stays separate.

### Version-pinned read-only round observation

The offline collector now accepts explicit manifest/handle filenames as its
third/fourth arguments. Old defaults and old outputs remain; it never silently
relables an earlier version's partial round. No running Host imports this script.
For this correctness version, use these exact inputs after new round data:

```text
node scripts/collect-ticket-23-complete-round-performance-cohort-v1.mjs
  build/ticket-23-three-arm-performance-baseline-20261010-v1
  <new-private-observation-output>
  common-v17c1-source-manifest.private.json
  common-v17c1-live-process-handles.private.json
```

These are one command's arguments, not four separate commands. First current
version observation41190/exit0,10:21:55Z: captured native heads77/83/82, all three
suffixes continuous, complete rounds0/0/0, partialR3 excluded, promotionfalse.
Zero Rules executions/Provider calls/Room writes, no performance case or old
passed test rerun. This observes production data and verifies the changed version
binding only; completed-round branch and matched performance cohort still pending.
Output `complete-round-baseline-observation-v17c1-2026-10-11T102155512Z.private.json`.
C82's new accepted transition was ahead of the current Web81 screenshot cutoff.
Do not reexecute it to generate images. If a match ends before a complete round
under this version, its partial data does not waive performance promotion.

Harness loop used: true; route selfplay_agent_prompt; original viewer-scoped
relationship query evidence and public Planner comparisons; no new training
candidate or Skill promotion; all evidence remains trainingTruth=false.
