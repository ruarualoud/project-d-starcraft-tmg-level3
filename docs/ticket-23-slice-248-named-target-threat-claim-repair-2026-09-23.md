# T23 / S248 — bind a threat claim to its named target

Run `20260922172710914`, authority r23, saved Planner attempt round 7:

> No current-round enemy fire band reaches the Corpser, but the western lane is not proven safe

The rest of this real public risk statement explicitly identifies the
Swarmling/Goliath Scatter Missiles range-qualified, LOS-unknown relationship.
The Corpser is instead 29.821 inches from the Goliath; Swarmling is 23.021.
The existing checker attached every current incoming-threat fact to every
no-threat sentence, so the correct Corpser statement was rejected using the
separate Swarmling fact. This is a target-binding defect, not a reason to
force more conservative strategy or erase the actual Swarmling uncertainty.

## Change

Current-relationship claim inspection splits contrasting clauses, then scopes
evidence to named own/allied units using authoritative IDs and displayed unit
names (including the name without a parenthesized subtype). A shared name
retains all matching instances. Explicit whole-side or unnamed claims remain
whole-side; no arbitrary target is selected. Stationary, unknown-LOS and
move-then-fire facts share this target binding. Formation-option inspection,
Rules, costs, distances, threat calculations, model, Prompt and Skills stay
unchanged. This bounded text matcher is not a general semantic truth oracle.

## Concrete verification

`node scripts/verify-ticket-23-slice-248-formation-threat-claim-scope-v1.mjs --named-threat-target-only --run-directory=build/ticket-23-slice-248-standard-2000-aa-live-v1/20260922172710914`

Real saved risk + its saved relationship receipts: red reproduced false
cross-unit rejection, then one green after the repair (0.75 s). It accepts
the Corpser-specific statement and still rejects a false Swarmling-specific,
mixed-target or unnamed western-lane safety claim. Uses only saved public
data and read-only SQLite; 0 Provider / 0 Room mutation / no old gates.

The **whole round-7 plan is not declared correct**: another strategicApproach
sentence still wrongly generalizes no current fire across the western lane,
and there is stale reserve prose. The later r24 `finish_activation` is already
legal and replay-verified; it is not rolled back to try the earlier proposed
Glial Reconstitution. Preserve both explanations for S249. The engine ran
through this during the live process; the patch loads at the next natural
service checkpoint, with no forced restart or normalization-version bump.

## Strategy/performance evidence

After capacity repair, completed Planner outputs were 8,905 and 8,811 tokens,
both above the former 8,192 ceiling; the Action output was 4,434. r24 and r25
then applied/replayed with paired screenshots; r25 opened Round 1 Assault.
At 19:13:37Z: 66 calls / 6,249,505 accounted units / ¥8.442024 conservative
estimate, including the prior unknown-usage Worker reservation. Do not call
this an exact invoice or proven optimal strategy. Ordinary legal strategy
weaknesses stay in the review lane, rather than triggering operator rerolls.

`harnessLoopUsed: true`; route `selfplay_agent_prompt`; scoped checker consumes
`space.inspect_relationships`; public decision/memory history retained;
`trainingTruth: false`; rollback if named-target filtering hides a threat to
that target. T23 remains 33/36, S248 active.
