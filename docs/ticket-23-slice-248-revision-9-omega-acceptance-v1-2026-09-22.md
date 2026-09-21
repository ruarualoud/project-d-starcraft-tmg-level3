# Ticket 23 / Slice 248 — revision 9 Omega acceptance

## Result

The post-repair fixed-roster Standard-2000 A-A branch
`20260921214904680` advanced from revision 8 to revision 9. The accepted action
is a Rules-instantiated `Omega Network` use by `player2-swarmling`, not a Creep
Tumor or Reserve Indicator substitution.

- selected coordinate: `(14000,12000)` milli-inches;
- Host placement receipt: 6 current-Rules-valid options, followed by exact
  parameter instantiation;
- accepted event: `omega_worm_set_on_battlefield`;
- source card: `faction:player2`, exhausted on commit;
- ongoing meaning: non-contesting Structure and Source of Creep; from a later
  round its base is an Entry Edge for Ground reserves with combined Supply at
  most 2 per round;
- Replay equals the current Room state at revision 9;
- screenshot: `screenshots/0002-r009-player2-use_active_ability-applied.png`.

The public opponent model now respects the visible lifecycle. It does not claim
that the already-activated Goliath can move again in the current Movement phase.
Its Goliath move is explicitly later-phase/round and its off-table Marine
hypothesis is typed as `deploy`. One selection-threat contradiction was caught
and corrected before submission.

## Structured-output evidence

All six Provider calls returned parseable native tool arguments. The accepted
trace records:

- `toolArgumentGrammarRecoveryCount=0`;
- `terminalFormatRepairRoundCount=0`;
- `semanticCorrectionRoundCount=1`;
- `queryRoundCount=4`;
- `queryReceiptCount=7`.

This natural acceptance did not need the newly added grammar recovery, while
the focused verifier separately proves the malformed inch-quote recovery path.
No hidden chain of thought is retained; only public summaries, typed plans,
query receipts, predictions and calibration-ready evidence are persisted.

## Scope and accounting

This is still the fixed preset-roster control. It has no Agent-authored pregame
`RosterPlan` and must not be represented as the Ticket 27 planned-roster arm.
This one-action branch used 6 calls, 305,276 reported units and an estimated
`¥0.417534`. Recent recovery work totals 59 calls, 2,751,347 units and
`¥3.765886`; including the original invalid-suffix source, 88 calls, 4,098,141
units and `¥5.618607`. No `¥100` notification boundary was crossed.

The checkpoint is not training truth and is not automatically promoted. The
next operation resumes this exact branch for one additional action so strategy
quality can be inspected before further continuation.
