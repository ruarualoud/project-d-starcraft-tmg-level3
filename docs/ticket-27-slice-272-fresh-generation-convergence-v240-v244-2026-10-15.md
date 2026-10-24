# Fresh A/B production and convergence diagnosis — v240–v244

Date: 2026-10-15. T27/S272 5/6; T23 33/36. Remaining main slices: 272,248,249,250 (4). Accepted complete experiments: 0/12. No games launched.

## Latest user direction and actual state

User explicitly chose A fixed army unchanged with fresh Plan+Teach, alongside fresh B army+Plan. Old A Plan9/B Plan19 and old B v237 candidate21 were not overwritten or promoted. v239 old-candidate adoption was abandoned when the user chose fresh generation: its operation omitted sourceTeachPlanHash, so retained context binding rejected before any original write or Provider call. Do not retry v239.

Latest direction: diagnose B convergence before adding more attempts. No new B paid request after this direction; no increase of the three-round gate has been made.

Both new processes are now TERMINAL:

| Arm | Session | Actual outcome |
|---|---|---|
| A | rws-7757b021-ecd7-4612-98cb-7311fc344e5c | Fresh fixed-army Plan v3 generated; source review stopped by task-wide call cap, not approved |
| B | iterative-web-d9b3d71f-3134-4403-91e5-ba8828da4432 | Revision29, legal intermediate 1020-point army, no final 2000-point army/Teach/Plan; requires_reconciliation |

A PID90537 finished07:36:17Z; B PID1995 finished07:37:24Z. Earlier B PID90544 was deliberately SIGTERM-stopped after confirmed no-progress repetition. Its pending r26 response was already durably retained and recovered with zero new Provider calls; no response was fabricated or replayed over the network. Do not restart any of these PIDs/scripts blindly.

Evidence root (relative to this worktree):
`build/ticket-23-three-arm-performance-baseline-20261010-v1/{A,B}/fresh-generation-v240/`.
Each contains progress, actual compressed requests, workspace records and paid outputs. B experience-v243 preserves its final stopped state; earlier generations and unknown fees remain.

## B: why it has not converged

### Actual transition history

| Revisions | Result |
|---|---|
| 1 | Menu/map read |
| 2–3 | Two rejected proposals: Core slot use6, capacity5 |
| 4–7 | Same menu/map repeatedly read; no new evidence |
| 8 | Confirmed HTTP400 context overflow, preserved unknown fee |
| 9 | After source fixes, legal changed roster costing1020 |
| 10–26 | **17 consecutive unchanged menu/map query decisions**, same candidate, no new evidence, no roster change |
| 27 | Same query again; unused required candidateHash placeholder missing on first query, generic output-invalid result |
| 28–29 | Same query again; new unchanged-query detector returns typed repair feedback |

The final three-failure counter mixes one schema failure with two no-progress failures. Increasing a global counter does not address the preceding17 empty iterations. Nor should three failures of different kinds be described as three unsuccessful repairs of one cause.

### Confirmed tool-contract gap

`roster-exact-budget-repair-search-v1.mjs` keeps every existing selected unit/card/upgrade. It enumerates added cards (up to3), added unit packages (default up to6), bounded menu nodes/Builder evaluations, and excludes specialist-assignment upgrades from package choices. It does NOT search removal/replacement of existing cards, composition changes of existing units, or changes to their upgrades.

The actual receipt has `matches:[]`, `menuPathsVisited:20655`, `builderEvaluations:0`, `searchTruncated:false`, `exactBudgetImpossibilityClaimed:false`. Thus zero complete candidates were even sent to the Builder in this restricted add-only search. `searchTruncated:false` means that restricted enumeration finished; it is NOT exhaustive full-army feasibility.

The model-facing adapter preserves no-impossibility but omits these detailed search-space restrictions. The model repeatedly says the exact repair search found no matches and asks for the whole menu/map again. It may still propose a fully different army; host code did not lock B's current army. The missing scope is a real contract defect, not proof that the model cannot build2000.

### Confirmed context/control issues; causality still to be tested

- The initial shared Provider instructions discuss freezing a review/Teach snapshot even for `iterative_roster_step`; selection-phase request text allows redesign. These are different phases and should not share ambiguous mutation instructions. We have not proved this caused the model's repetition.
- `lastRejectedProposal` remains the historical Core-overflow candidate after the current candidate becomes legal. It is labelled historical, but foregrounding it without an active/resolved distinction may distract. Do not claim it is the current army's defect.
- Full map geometry appears in mission context and the retained map query result. Interning repeated observations removes most duplication but the latest request is still~1.5MB; many repeated public decisions remain in the hot prompt. Full history should be retained and queryable, not endlessly copied as current instructions.
- A correct stop detector is not a recovery planner. v243 detects identical results and requests a different query or changed proposal, but has no tool-owned completion/replacement route or explicit diagnostic escalation state.
- r27's format problem concerned an unused empty field, not a new strategic attempt. Its specific schema path was collapsed into OUTPUT_INVALID and then counted together with repetition.

### Recommended dynamic convergence (not implemented in this diagnostic turn)

1. Separate selection, feasibility investigation, Teach and review phases. Selection may edit army+Plan; fixed A may edit Plan and compare alternatives hypothetically; review cannot mutate the reviewed snapshot.
2. Return explicit search scope and exclusions, exact versus bounded status and next supported operations. Add a tool-owned constrained completion/replacement search over model-selected constraints; complete candidates still require the same authoritative Builder. The tool does not rank tactics or choose the final army.
3. Track meaningful progress per unresolved issue: new distinct evidence, new evaluated candidate, a tested strategic alternative, resolved protocol error or an explicitly revised hypothesis. Budget shortfall alone is not a monotonic score: temporarily freeing slots/spending less can be useful progress.
4. Continue while evidence/alternatives progress. Same request+same state+same result uses retained evidence rather than another paid loop. A plateau triggers a different supported operation/state, not repeated generic prose. Do not remove unresolved issues or manufacture success.
5. Separate same-error correction, independent evidence investigation, distinct review shards, network uncertainty and overall work accounting. Use per-issue convergence/no-progress handling; total distinct work is not a universal three-call budget. Any remaining nonconvergence is reported with its concrete unresolved question.
6. Keep complete immutable history/costs for replay; send a compact active working state and exact evidence references with retrieval. Validate losslessness and real output quality before claiming strategy preservation.

Next deliverables: source-scoped search/phase contracts, dynamic progress supervisor, same-session actual B completion trial, then full Plan/Teach acceptance. First implement the agreed convergence design; do not simply extend r29 or re-run the full generation.

## Changes already made before the latest diagnosis request

### v241

- Teach evidence verifier now permits distinct wrappers/challenges to cite the same identical source, preserving all challenge bindings and unknown statuses. Conflicting content under one source identity still fails.
- Versioned iterative prompt projection interns identical complete receipts; every ordered query/request/result remains. Actual request reduction:3644582→1276454bytes (65.0%). Old paid v7/v9 contexts are unchanged; migrations occur only between settled decisions.
- Reconnected existing menu-derived slot/resource feedback to current selection context: Core6 versus5 is now explicit; no tactical choice made by host.
- Confirmed context-length HTTP400 may settle as a typed rejected-request receipt with unknown fee preserved. Timeouts/unknown dispatches do not use this path.

### v242

Actual A corrections supplied required union-schema placeholders: sampleBudget0, all-zero/empty inputs and blank spec. Native query guard treated them as real unbound arguments. Query dispatch now omits only those known neutral wire placeholders for registered native spatial queries, records the normalization, and preserves native argumentsJson/branch/real values/unknown fields. The Native guard is unchanged.

A's v241 process had already loaded its modules and has NOT re-executed those queries with v242. Their two unknowns remain unknown in retained evidence. Do not claim A Teach passed or discard them.

### v243

- Version10 adds explicit unchanged-query evidence feedback and detects repeating the same queries/results on an unchanged candidate. It does not choose army/strategy.
- Real B still repeated; stopped at r29 under the existing convergence rule. This proves safe stopping, NOT successful recovery or completed production.
- Operational runner now supports a `pause-requested` control file for B so future observation can request its ordinary pause at a safe boundary.

### v244

A source review stopped before its next paid request with `ROSTER_WORKSPACE_RUN_CALL_CAP_REACHED`. Several distinct shards and schema corrections consumed the old12-call total. Changed total task count to one observable warning; per-error correction, authentication, ambiguous network dispatch and operator pause remain unchanged. Focused local13-distinct-shard reproduction passes. **A review has not been resumed with this change yet.** Resume only missing same-context shards via existing review retained replay; do not regenerate Plan3 or repeat completed shard calls.

## Verification performed — do not rerun passed checks

Every command below had one RED and one GREEN after its source fix, with zero Provider calls. No full suite/build run.

- `node scripts/verify-slice272-fresh-evidence-v241.mjs <base>`: actual A10wrappers/6sources; conflict rejection; B12observations/4unique bodies losslessly restored; old paid context identical; rejected slot feedback present.
- `node scripts/verify-slice272-context-rejection-v241.mjs <base>`: actual B HTTP400 settled without resend; unknown fee retained; unconfirmed/mismatched dispatch rejected.
- `node scripts/verify-slice272-teach-placeholders-v242.mjs <base>`: two actual corrected requests, arguments/branch unchanged, real values not discarded. This is dispatch-boundary validation, not proof their downstream scenarios succeed.
- `node scripts/verify-slice272-query-loop-v243.mjs <base>`: actual repeated model output produces corrective feedback, army unchanged. Live v243 nonconvergence is separately recorded above.
- `node scripts/verify-slice272-review-call-warning-v244.mjs`:13distinct local fake-Worker requests, one warning, pause still prevents request14;0real Provider.

## Usage, scope and handoff

Fresh B durable replies report28calls/12999339tokens; frozen peak pricing estimateUSD3.899064408, excluding the unknown HTTP400 fee. Fresh A observer reports20calls/2852481tokens; exact billing remains Provider authoritative. These do not include older A/B/v237 production, and nothing was reset. B's17empty iterations are wasted work and must not be presented as strategic progress.

No rules/army legality changes, no new Skill production, no source-data refresh, no game actions, no old draft writes, no subagents, no deletion, no commit/push. No complete UI acceptance claimed: the operations use the shared product HTTP adapter/service, not a browser screenshot flow.

Harness loop: used; game StarCraft-TMG. Routes: iterative roster, fixed preset Foundation/Teach, source review. Tools: Builder/menu/map/retained evidence. Public decisions and full paid output/correction histories preserved, no private thoughts recorded. TrainingTruth remains false; no skill promotion. Rollback/demotion: any lossy projection, evidence conflict accepted as truth, source/phase mismatch or unresolved High prevents promotion/games.

Diff scope: four strategist production files plus secure deliberation factory; fresh/resume operational runner; five concrete-bug verification scripts; this report and CURRENT_WORK/TASKS/MEMORY entries. Earlier dirty changes in these files predate this turn and must not be staged wholesale as a new isolated slice.
