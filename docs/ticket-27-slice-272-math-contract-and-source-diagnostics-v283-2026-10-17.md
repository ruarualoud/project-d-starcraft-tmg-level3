# T27 / S272 — v283/v284 shared input repair and recovery diagnostics

Status: implementation and its focused math gate passed; six-group final acceptance remains **0/6**. No games started. T27 5/6; T23 33/36; remaining main slices S272/S248/S249/S250.

## Delivered

- `pregame-scene-laboratory-v1.mjs`: one discoverable contract for the five existing calculators. Missing/unknown `mathKind` and malformed scalar inputs now carry source-owned, field-addressed repair instructions. The existing Teach evidence port already transports these instructions into its recovery lane. No selector, quantities, purchases or strategic conclusions are supplied by the Host.
- The calculator implementations and existing limits are unchanged. `integer_sum` is arithmetic over declared assumptions, not proof of casualty scoring. `mission_marker_schedule` still computes marker VP only; its description explicitly says that supplied kill quantities are not included. Combining hypothetical scores needs explicit assumptions and the appropriate arithmetic, not silent scoring inference.
- `roster-teach-evidence-port-v1.mjs`: retained-branch rejection now records exactly which source/runtime/builder/spec/kind/lifecycle binding differs and the affected reference. The checks themselves are unchanged.
- `iterative-roster-draft-teach-v1.mjs`: preserves those bounded mismatch details in the failure checkpoint instead of discarding them to a generic code.

## Evidence and verification limits

The actual B query `q-victory-route-kill-vp-supply-added` supplied a schedule but omitted `mathKind`. Its saved error was `PREGAME_LAB_MATH_KIND_REQUIRED`, with no repair packet. The focused gate failed on that absent packet, then passed once after the source-contract change. It also verifies discovery and error use the same contract, a declared integer sum stays correct, the source stays unchanged, and no Native action/Provider call occurs.

Command (passed; do not rerun without a new directly related bug):

`node scripts/verify-slice272-retained-source-v283.mjs <base> math_contract`

The first fixture invocation failed before this assertion because it unnecessarily required F to remain failed while F was running. That fixture condition was scoped to its own mode; the next invocation produced the actual RED, followed by one GREEN. No full suite or unrelated passed gate was rerun.

F's earlier read-only `retained_source` probe reached the next model boundary without reproducing its recorded source error. It is **not** proof that the original failure is fixed. Current-army saved branch bindings match the constructed lab; different-army snapshots exist but are excluded by the normal dependency filter. After adding diagnostics, the ordinary original F product session advanced from request56 through request59 without the old error. This is observed continuation, not an identified root-cause fix. Keep the diagnostic if it recurs and require full Teach/source admission before acceptance.

## E remains stopped, not accepted

E request102 used contract15 and the repeated-query warning, yet returned the same queries. Its one corrected-contract extra attempt is already consumed. Do not restart it or refill that allowance merely because another calculator changed.

Read-only checks of the actual request found:

- Approximately 1,227,572 serialized prompt-node bytes; decisionState725,837, missionEvidence459,725, draftTeachFeedback511,785 within decisionState.
- 113 same-prompt references, zero missing targets or reference-to-reference targets. The capability guide resolves to all eight available query kinds. Thus no demonstrated broken reference or missing capability list explains this repeat.
- Size may increase difficulty, but causality is unproven. Repeated map/source-control reads do not settle conditional arrival, reaction or casualty questions. The next repair must target the actual progression problem, not fabricate a clean Plan or remove unresolved claims.

## Same-session deployment

Original paths and session IDs remain in CURRENT_WORK.md. Maintenance `pause-requested` files ask A/B/C/D/F to save in-flight results and stop before a new send; this is not a user pause. Resume those original sessions with v283 after they are actually idle. E stays stopped. Do not reset expenses, replay games, regenerate source data, or copy an accepted plan between arms.

### v284: exact retained-evidence path navigation

B repeatedly requested `parameterDomains` from an exact saved receipt where that root field does not exist. Related calls guessed longer `sourceReceipt.queryReceipt.result.*` paths. The reader previously gave only `ROSTER_TEACH_EVIDENCE_PATH_UNKNOWN`, despite already possessing the schema needed for navigation.

The shared reader now returns a typed failure containing the nearest existing ancestor and its actual child paths, for raw and displayed views of the **same** receipt. Investigation and recovery both preserve this packet. The model chooses a new path; the Host does not fuzzy-match fields, select another receipt, treat missing data as zero or mark the failed query answered.

`node scripts/verify-slice272-evidence-path-repair-v284.mjs <base>` reproduced the actual B miss (RED), then passed once after the repair. All34 supplied child paths were readable through the same normal reader, the archive remained unchanged, and Provider/Native executions were0. Do not rerun this passed gate. This is field-navigation validation, not proof that the model will choose the right strategic evidence next.

Final shared load is **v284**, which includes v283. B88798/C88800/F88802 have resumed the same sessions via `resume-input-contract-v284-20261017.log`. A85898/D85897 had loaded v283 before the second concrete repair was completed and are draining another maintenance boundary; switch them once to v284 before claiming common-code continuation. This extra initialization was avoidable coordination cost, not experimental progress. Pending flags must not be left silently as a user pause.

Final consumer check found the Teach capability-guide projection exposed Builder but omitted the new general math catalog. A pure projection RED showed `toolSurfaceCatalog.math` absent; one-line wiring then passed one GREEN with the same source contract. Source-error repair already carried its contract, but proactive discovery needed this connection too. No calculator/previous green was rerun. Final log suffix is `resume-input-contract-v284-final-20261017.log`; D93870 has loaded that code. A/B/C/F have maintenance flags to load this final consumer wiring after their current results are saved. Do not claim five-arm common-code operation until their final logs/PIDs exist.

E's current Teach feedback is bound to its current2000 candidate, and `planAlignment` is null. Thus no demonstrated stale-candidate binding explains its loop either. Some prose still discusses the older partial purchase scenario; conditional/historical evidence is not itself proof of current strategy. Future hidden-opponent uncertainty must be separated from engineering-query failures, without falsely resolving either.

## Next deliverables

Latest switch point: A97288/C94929/D93870/F97290 have final v284 processes; B88798 is still draining its maintenance flag. Check current PID/status before restarting B; use final log suffix once per group. Original experiment identity, accumulated fees and failed evidence remain unchanged.

1. Finish the boundary-safe shared-code continuation; retain all existing replies/accounting.
2. Identify E's selecting-step nonconvergence and any recurring F binding mismatch from exact evidence. Proven engineering fixes precede another authorized retry.
3. Complete each group's legal2000 roster, meaningful Plan/Teach/source admission and human-readable roster/Plan comparison. D1150 is provisional, not complete.
4. Only then accept the six-arm matrix; route assumptions in E must remain aligned with the map query and executable geometry.

## Harness record

Boundary: pregame read-only mathematical tool discovery/rejection and retained-scene restoration. Provider/Rules writes in gate:0/0. Strategy ownership:model; no injected unit ranking. Training truth:false. Unknown failures remain failures; source diagnostics do not approve mismatched evidence. F continuation is not a strategy-quality verdict. No commit/push, source refresh or deletion.
