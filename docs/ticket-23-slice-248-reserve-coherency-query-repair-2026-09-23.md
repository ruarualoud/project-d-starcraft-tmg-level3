# T23 / S248 — reserve coherency must not query an unpositioned aura target

## Captured engineering failure

At r57, Flash's original Planner selected **deploy Goliath 2**. The mandatory
Host `space.solve_formation` receipt returned `unknown`, reason
`MODEL_BASE_GEOMETRY_VALUE_INVALID`, classified `implementation_error`.
The recovery lane removed that candidate and the model instead chose Goliath 1
movement, subsequently accepted at r58. This is engineering-influenced choice
evidence, not proof that the Skill preferred moving over reinforcing.

Decision: `choice-d0b6ce980908fc6c3b7d6ba4c86f880400b355f980477df61ccb3ca6965ea82b`.
Run: `build/ticket-23-slice-248-standard-2000-aa-live-v1/20260922172710914`.

The minimal replay used immutable checkpoint r56 (identical relevant reserve /
Queen geometry) and the recorded r57 domain and formation intent. It failed
before reaching the Rules instantiation callback. The stack runs from
`horizontalCoherencyRange` through the full characteristic projection's
**detection aura**, into a reserve model's absent coordinates. No guessed
coordinate, terrain footprint or millimetre conversion caused this error.

The helper had cloned the state and marked the reserve Unit/models on-field
without positions merely to obtain their post-entry coherency rule. This only
surfaced once an opposing fielded Queen supplied a detection aura.

## Small shared repair

`projectOfficialHorizontalCoherencyV1` projects only the intrinsic coherency
routes, with explicit hypothetical deployment for reserves. It reuses the same
passive eligibility and numeric rule as the full characteristic projection;
the common aggregation is not duplicated. It never evaluates aura geometry,
invents positions, edits model flags or changes the source state.

All formation solver coherency consumers use this narrow read, including
standard deployment, reserve-anchor consumers and Phase Prism placement.
Actual complete-formation legality, base containment, terrain, detection and
combat still use the existing Rules paths. A malformed on-field Unit still
fails the full detection projection. No Prompt, Skill, source snapshot,
model, query allowance or strategy objective changed.

## One focused red → green

`node scripts/verify-ticket-23-slice-248-reserve-coherency-query-v1.mjs --run-directory=build/ticket-23-slice-248-standard-2000-aa-live-v1/20260922172710914`

The real consumer fixture first reproduced the exact exception. One run after
the code change passed in **0.593s**: the original formation intent reaches
the instantiation boundary; 12 fielded Units agree with the full projection,
including the 4-inch exceptions; malformed full geometry is still rejected;
the input is unchanged. **0 Provider calls / 0 Room mutations / ¥0**.

The test deliberately stops at the Rules callback; it certifies neither a
Goliath deployment nor a full authority replay at r57. No old gate or Web build
was repeated. Actual subsequent deployment remains live acceptance work.

## Durable continuation and strategy evidence

58038 was stopped at a safe boundary: both Providers had no unfinished
decisions, r61 was applied/replayed and neither Bot had a pending Apply.
The server closed normally; the runner then exited 1 on the expected room-UI
wait after shutdown. This is a controlled reload, not a new gameplay failure.
r60 has an inspected Web screenshot; r61 still needs capture on resume.
145 calls / 15,689,641 accounted units / estimated **¥21.051052**, both Flash.
No accepted action or paid output is erased or regenerated.

Commit **78d2fd8** is loaded by new resume **76101** (runner31120/server31154),
currently restoring the same room. At elapsed1m15s the server remained
CPU-active; do not mistake the old failed progress timestamp for a new failure.
No live repaired deployment acceptance is claimed yet.

The r57→r58 choice diversion must remain
marked engineering-influenced in S249; do not silently score it as a pure
strategy failure or claim an uncontaminated high-strategy comparison.

Separately, r55–56 placed Queen tumors at the same point. The next input's
current goal already says Spawn Creep Tumor; the model's stale claim that it
was still pursuing Queen entry is not evidence of missing plan transmission.
Tokens also remain in the spatial projection. Duplicate investment and
incorrect best-option comparisons belong to strategy/rationale review unless
an actual missing fact or Rules defect is separately demonstrated.

`harnessLoopUsed:true`; route `selfplay_agent_prompt`; tools formation search,
Rules preview/apply/replay and public action/plan records; no hidden reasoning
requested or stored; all evidence remains `trainingTruth:false`.
