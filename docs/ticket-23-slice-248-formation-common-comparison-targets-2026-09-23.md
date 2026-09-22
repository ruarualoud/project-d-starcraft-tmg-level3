# T23 / S248 — comparable formation facts, not shared strategy weights

## Observed r76 and exact missing-data pattern

The r75 Zerg Planner requested Raptor advance/control toward marker5, compact
spacing, a Hydralisk screen and enemy-threat avoidance. The Host exposed four
Rules-valid options: three isolated avoidance layouts and one combined-intent
layout. Only the latter included marker5 and Hydralisk relationship measurements.
The alternative search policy had incorrectly become the measurement scope;
the model therefore could not compare all options against the same goals.

Ranked hypotheses after the saved case was reproduced:

1. Per-option isolated objectives omit the original Planner targets when building
   comparison facts. Passing the original target set should restore the missing
   relationships without changing placements, objective weights or Rules.
2. Viewer filtering hides those targets. Contradicted by the same targets being
   present in the current relationship receipt and the combined-intent option.
3. Target identifiers are inconsistent. The selected option resolves these exact
   IDs correctly; no data-source or ID rewrite is needed.

This is a non-blocking comparison-data defect, not an illegal executed move.
The accepted r76 remains in history, labelled with this limitation; no reroll.

## Narrow repair and one focused verification

The actual comparison projector is now an exported, read-only boundary invoked
by the existing search. Every option receives the normalized original Planner
objectives as comparison targets, unioned with its own targets and visible
enemies. Candidate generation, per-option objective weights, scores, positions,
exact Rules instantiation, permissions and model prompts are unchanged. This
adds measurements; it does not rank the options or inject a strategic policy.

`scripts/verify-ticket-23-slice-248-formation-common-targets-v1.mjs` reuses the
three real captured avoidance layouts and original c75 Planner request against
the immutable r72 geometry fixture. The actor/marker positions are applicable
to this focused case, but r72 predates Marine3 deployment: **this is not a full
r75 reconstruction or action reacceptance**. Private decode material remains
in memory and is never printed.

The first run reproduced the missing marker relationship. The single post-fix
run passed in7.264s: all three options now have marker5 and friendly Hydralisk
measurements, the three existing enemy relationships remain deeply equal, and
the new friendly comparison does not acquire enemy fire. Room input, saved
layouts, scores and weights remain unchanged.0Provider/0Room mutation/¥0;
no search regeneration, old gate, Web build or full suite repeated.

The new measurements for the three alternatives are15.246,15.863,16.711in to
marker5. The historical selected option reports14.306in, compared with16.150in
before movement. Thus its limited1.844in improvement is real; this does not
prove global optimality or prove the model compared the formerly missing facts.

## Actual decision / memory evidence

r76 moved18-model Raptor, Applied/Replayed and was captured; screenshot inspected.
The public Planner revises its prior Corpser goal because that action is no
longer available, notices Marine3 deployment and uses recorded miss/partial
prediction calibrations. The Action stage requests another relationship query,
then chooses `requested-left`, the one combined-intent option. No hidden
reasoning is required or retained to observe this sequence.

The model explicitly accepts7future-round movement/fire threats and reports
0current-round ones from the option. It chooses positional value rather than
the pure-avoidance variants. Its description still carries stale references
to an uncommitted Terran wave and overstates the alternative layouts as all
pulling south/west; preserve these public-reason limitations for S249.
The northmost footprint extends6.256→7.267in, not a complete6in northward
advance and not objective control. All facts remain `trainingTruth:false`.

![Raptor after r76](../build/ticket-23-slice-248-standard-2000-aa-live-v1/20260922172710914/screenshots/0575-r076-player2-move-complete-board-applied.png)

r77finish, r78Terran Pass and r79Zerg Pass then reached Round2Assault with
Apply/Replay/screenshots. The r79 checkpoint has196calls/21,840,566accounted
units/estimated¥29.128094, bothFlash. The r76 decision added4calls/445,885units/
estimated¥0.588405. No model or budget reduction.

## Performance finding — measured Host work

The final Planner returned23:24:15.044Z; first Action dispatch23:31:02.571Z:
**407.527s**. Receipt:1056generated,728examined,200exact instantiations,
176placement-overlap+20path-collision failures,0prefilter rejects,4options.
These totals include preparation, placement and comparison, not a proof that
all408seconds were collision tests.

At23:30:12Z the server was CPU-active (~91%), with both Planning attempts
completed and no Action request yet; the Bot had not applied this action.
A one-second OS sample captured active V8 work including serialization, sorting
and hashing. JS frames are not symbolized, so it does not identify a specific
JS hot function or justify deleting integrity checks. The sample is retained in
`build/ticket-23-slice-248-standard-2000-aa-live-v1/20260922172710914/r75-formation-cpu-sample.txt`.

Optimization candidates: per-stage timing, request-scoped immutable geometry
reuse and sound broad-phase rejection before full Rules work. Require parity
of legal candidates and comparison facts plus strategy-quality observation;
keep the original objective scope and search capacity. No performance change
was silently bundled with this comparison repair.

## Loading boundary

The focused gate proves the repaired comparison consumer.52348 initially
predated the change. At23:42:43Z a safe-stop check detected an in-flight request
and did nothing. Its outer runner was subsequently paused, allowing the existing
server request/action to drain without another trigger. At23:45:18Z both latest
decisions were completed, no pendingApply, r81/79 Replaytrue: server stopped,
driver resumed to exit.52348 confirmed exit1 on the now-unavailable room refresh.
That observed timeout is the controlled reload, not a new transport-root-cause
claim. No paid request was interrupted.

Repair8dbf728 is committed; new resume76208 restores the same directory and
must supplement r81's screenshot, not regenerate it. Stopped usage is203calls/
22,675,017accounted units/estimated¥30.239410, retained. Startup itself and a
later new formation comparison still need actual observations. Do not treat
the old stored r76 receipt as newly repaired or repeat the passed consumer gate.

`harnessLoopUsed:true`; route `selfplay_agent_prompt`; tools relationship,
formation, instantiation and Rules Apply/Replay; room plan and prediction
calibration evidence retained. T23 stays33/36: S248 full match, S249 review,
S250 synthesis remain open.
