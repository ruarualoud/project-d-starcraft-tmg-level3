# T23 / S248 — continuous diagonal rectangular-terrain LOS

## Observed failure and cause

The continuing Flash match reached r30 (Goliath Run), r31 (finish), then the
Combat phase. Public plans repeatedly cite
`TERRAIN_LOS_UNSUPPORTED_RECTANGULAR_TRACE` for actual opposing model pairs.
This is an engineering limitation, not missing map data or proof of safety.
The old Slice-84 code proves a complete barrier only when a rectangle spans
both bases' entire X or Y bounds; otherwise it tries a few physical-base
points. A diagonal complete blocker can satisfy neither branch. One such
error also aborts the batch, after which the graph performs slower per-pair
fallbacks and honestly reports unresolved geometry.

Ranked hypotheses were the axis-only proof, incorrect physical-base input,
then a missed special-terrain adapter. A read-only snapshot of real authority
r33 reproduced the exact central-temple exception through the actual special
terrain batch. Data/terrain verification passed before reaching that branch,
localizing this defect to the first hypothesis.

## Repair

Add a pure analytic convex-base/rectangle resolver. A line segment joining
some point on each base avoids a closed convex rectangle exactly when both
base support functions exceed the rectangle support on the same side of a
separating line. Partition the continuous normal-angle domain at rectangle
quadrants and all analytic circle/vertex-to-corner tangent roots. Sign cannot
change inside an interval, so this is not a fixed ray sample or an approximate
grid. It handles round and rotated rectangular physical bases. A clear result
includes both actual base points and its separating normal/positive clearance;
absence of a feasible interval proves complete blockage. Numerical ambiguity
remains unknown, never a guessed clear/blocked result.

The existing kernel uses this only where its former proofs and witnesses
failed, for terrain without a sight-open aperture. Previously certified
results and their hashes remain unchanged. Cover Sizes, Direct Cover, Close
Quarters, elevation, independent terrain assessment, source rules and physical
distance calculations are unchanged. Movement-only openings are not sight
openings. General diagonal paths through agreed sight apertures remain outside
this resolver and retain the prior unknown result when no opening proof exists.
This is not classic-map semantic-geometry certification or a rulebook update.

## Focused evidence

```sh
node scripts/verify-ticket-23-slice-248-diagonal-los-repair-v1.mjs \
  --run-directory=build/ticket-23-slice-248-standard-2000-aa-live-v1/20260922172710914
```

The first run failed on the real central-temple exception. The first code
repair passed the real batch and Agent graph, then exposed an incorrectly
positioned synthetic “clear” fixture: that rectangle actually crossed the
diagonal. Correcting that fixture was followed by one green run (2,816 ms).
No previously passed command was repeated afterward.

- Actual saved r33: 76 forward/reverse model-pair queries, all blocked and
  **zero unknown**; the Agent relationship graph has no batch failure or
  unknown model pairs for these subjects/targets.
- Round and rotated-rectangle diagonal blockage, visible partial obstacle,
  narrow clear/closed gap, reciprocity and independently checked separating
  witnesses are covered.
- The legacy Slice-84 verifier's explicit expectation that this diagonal
  example must throw is updated to its blocked result. Its unrelated whole
  suite was not run; the new focused gate covers this changed behavior.
- 0 Provider calls, 0 paid units, ¥0 and 0 Room mutations for the repair gate.

Snapshot and receipt are beside the original run as
`diagonal-los-regression-snapshot.json` (private local geometry snapshot) and
`diagonal-los-regression-report.json`. The snapshot is taken once so a moving
match cannot change the red/green denominator. It contains no runner secrets.

## Live handoff and limitations

The active runner was suspended before another UI trigger. Both Provider
stores had no in-flight paid attempt; r35 was already applied and replayed,
with no pending Apply. The service then shut down cleanly for reload. r35 was
not yet written to the screenshot action log (last r34); ordinary durable
resume must capture it before continuing, not regenerate its decision.
At this boundary: 93 calls / 9,188,732 accounted units / estimated ¥12.335719,
including the previously disclosed unknown-usage reservation.

The boundary helper also revealed a separate accounting limitation: it expects
Bot action counts to equal absolute Room revision, while this branch has a
seven-transition replayed prefix and 28 new Bot actions (7 + 28 = r35). Actual
Room/journal agreement, completed Provider state, no pending Apply and the
r35 Replay receipt were inspected directly. Track prefix-aware recovery
accounting separately; do not erase history or fabricate seven Bot actions.

Keep legal past decisions and their original unknown evidence for S249.
Do not reroll r29 Pass, r30 Run or any other accepted move. New decisions after
reload use the repaired geometry; this also loads the already-passed named-
target claim repair. No Prompt strategy instruction, Skill or model changes.

Live recovery completed at 2026-09-22T19:41:48Z. New runner session `78441`
reopened the same Room and saved
`screenshots/0218-r035-player2-choose_first_actor-complete-board-applied.png`;
r35 is Replay-matching in `actions.ndjson`. Calls/units/cost remain exactly
93 / 9,188,732 / ¥12.335719: no new generation for this recovery. The old
runner's final screenshot wait error was caused by this controlled service
shutdown, not a new Provider or Rules failure. The next normal Web-triggered
decision proceeds under the newly loaded geometry.

For a concrete geometric explanation, Goliath model 1 to Swarmling model 1
in the fixed r33 scene has a 19.922-inch base-edge gap, but Size-3 central
temple produces `convex_rectangle_separates_complete_physical_base_footprints`
and Full Cover. Being within printed range does not make that model visible.
This observation does not certify future positions or imply an optimal plan.

`harnessLoopUsed: true`; route `selfplay_agent_prompt`; tools
`space.inspect_relationships` and exact special-terrain LOS; public decision
and same-match memory preserved; `trainingTruth: false`. Demote the repair on
a false clear witness, asymmetric LOS or loss of unknown numerical handling.
T23 remains 33/36: S248 match, S249 review, S250 synthesis are open.
