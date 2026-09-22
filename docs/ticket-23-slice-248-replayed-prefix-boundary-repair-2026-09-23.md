# T23 / S248 — count replayed history separately from new Bot actions

## Reproduction and cause

During the r35 LOS-code reload, Room/public journal both showed revision 35;
the latest action was Apply/Replay verified, no Apply was pending and neither
Provider had an in-flight paid request. Yet the durable-boundary helper said
the state was still settling. It required new Bot action/replay counts to
equal the absolute Room revision. This branch was created by replaying seven
transitions before attaching the two Bot seats, so its 28 new actions plus
seven prefix transitions were a complete history, not seven lost actions.

Hypotheses: uncounted replay prefix, missing persisted Bot receipts, or a
still-pending Apply. The stored provenance/Room receipts and clear in-flight
state support the first. A new narrow mode in the existing boundary verifier
then captured read-only SQLite backups at r37: 30 new actions, 30 verified
replays and seven prefix transitions. It failed on the same false boundary.
This frozen fixture avoids a changing match altering the red/green denominator.

## Change

The helper optionally receives the explicit replay prefix. It checks that
the contiguous prefix revisions and existing journal/state identifiers match
this Room's accepted public transitions, then reports separate counts:

- new Bot action/replay counts (unchanged);
- replayed-prefix transition count;
- total accounted transitions and verified replay history.

The atomic-boundary comparison uses the accounted total. It never infers a
prefix from an unexplained difference, creates fake Bot actions, changes
Room state, forgives a missing receipt or authorizes another Provider call.
This consumes already-existing receipt identities; no new signing scheme or
paid-generation validation has been added. Ordinary non-fork runs retain a
zero prefix and the same required conditions.

The Web runner loads its immutable `fork-provenance.json` once per run rather
than reparsing it on every two-second poll, and passes it into the helper.
Current runner session 78441 is kept alive; the change loads on its next
ordinary restart, not by interrupting the current decision.

## One focused red → green

```sh
node scripts/verify-ticket-23-slice-248-durable-action-boundary-v1.mjs \
  --fork-prefix-accounting-only \
  --run-directory=build/ticket-23-slice-248-standard-2000-aa-live-v1/20260922172710914
```

After the real red result, the single post-change run passed in 0.83 s.
It accepts 7 + 30 = r37 and rejects missing provenance, wrong prefix count,
duplicate revision, wrong-room receipt and wrong state identifier. The
runner's concrete handoff is checked. Provider/Room mutation: 0/0, cost ¥0.
No old startup, timeout, LOS or whole-suite gate was repeated.

This is a read-only recovery-admission repair; it does not claim a live
network-failure restart has already been exercised with the new version.
Demote if any incomplete accepted/replayed history becomes restartable or
if a prefix is accepted without its matching Room journal entries.

## Match progression

Under the already-loaded diagonal LOS repair, the real r35 Planner queried
both directions. Goliath versus Hydralisk/Swarmling/Raptor now reports
2/18/18 blocked model pairs, zero unknown and no batch failure. Future
move-then-fire/path uncertainty remains distinct and is not promoted to
safety. The Agent selected Feral Rage for the Hydralisk; r36 applied that
ability and r37 finished its activation, both Replay-matching and captured.
This proves fact transport and execution, not optimal strategic use of the
upgrade. Preserve the original public rationale for S249.

At 19:48:08Z: 96 physical calls / 9,529,523 accounted units / estimated
¥12.802140, including the previously disclosed unknown-usage reservation.
Both seats remain Flash. T23 remains 33/36 (S248 match, S249 review, S250
synthesis). `harnessLoopUsed: true`; route `selfplay_agent_prompt`;
same-match memory retained; no Skill/Prompt changes; `trainingTruth: false`.
