# T27 / S272 — Native evidence at repair/review and explicit same-room Plan revision

T27 5/6; T23 33/36; main remaining slices 248/272/249/250 = 4; complete matches 0/12. No Room has consumed A9/B18. The full map, 2000-point builder, original-room comparison and replay objective remains open.

## Actual model results, not acceptance

- B v106 completed at 2026-10-13T22:58:49.637Z: Plan18 `15606ccc279303cc91c81e39e62ba6ee3f89f73d192ea01090717ad03194a87e`; 3 new calls / 531779 units; cumulative 194 / 21337373. The all-unchanged revision now received semantic feedback and changed 14 fields. Army and arrival schedule unchanged. Despite zero raw High, four current claims copied the Teach coordinate/reach mistake. Do not admit this Plan on the review count alone.
- A v108 completed at 23:11:17.329Z: Plan9 `a7cb5ba1f2ec6c2d17a682acfe5e1ad2e58e23f3018a7c12350fc3b78b37aa1d`; 2 new calls / 561288 units; cumulative 89 / 14233545. It consumes the recovered conditional marker control instead of declaring all evidence an empty board. Actual effective findings are zero High; the eight raw High are inherited with source-qualified decisions, and `needsRosterFinalPlanReconciliationV1` is false. Do not purchase the same qualification again.
- A4→A9 and B12→B18 retain each arm's army and schedule. Both corrected the assumed 1/3/5 versus 2/4 scoring split from a losing line to conditional 3 versus 2 VP per scoring round. Contest/kill choices become conditional, not mandatory because of false arithmetic. No complete game proves better strategy.
- A Teach has Q2/Q3/Q6 unresolved; B has opponent branch, post-loss, exact route and robustness unresolved. Conditional measurements do not prove placement, arrival, attack, control in a future state, or all-layout impossibility.

## Concrete source changes and gates

### v106 — unchanged paid revision recovery

`roster-strategist-runtime-v1.mjs`: return specific completed-reply feedback when all requested replacements equal current text; preserve original context/reply, remaining bound and usage. Gate `verify-slice272-revision-noop-recovery-v106.mjs`: captured 16-field RED then sole GREEN, 2 scripted replies on corrected branch, maximum3 on unchanged branch, 0 Provider/Room/draft writes. Real B18 demonstrates structural recovery, not semantic correctness.

### v107 — same-room Plan consumer

`roster-plan-turn-plan-bridge-v1.mjs`, `turn-plan-runtime-v1.mjs`, `hosted-bot-seat-runtime-v1.mjs`: explicit `adopt_roster_plan_revision`, expected predecessor and original/current Plan identity; retain Room/seat, army/schedule/provenance, in-match intent/outcome/calibration history, parent version; invalidate stale search and require reflection. No silent replacement through `open_roster_plan`.

Gate `verify-slice272-same-room-plan-revision-v107.mjs`: actual A readonly 421-record journal, A4→A8, RED unsupported command → sole GREEN8.8s. Preserved57 intents/57 outcomes/66 prediction calibrations; duplicate/restart and wrong-binding checks; 0 Provider/Room/production journal writes. This is not live-server admission or disk-failure atomicity proof. Explicit server/loader admission is still to be completed; never edit the private Plan hash to pretend adoption occurred.

### v109 — wrapper citation to retained Native evidence

`roster-final-plan-review-v1.mjs` and workspace review caller: resolve an actually cited Teach evidence wrapper to its unchanged retained Native placement and follow-up receipts. Keep wrapper metadata separate from its original seal. Incremental review allows only the new derived evidence field, preserving unrelated paid reviews.

Actual B wrapper `37240b195db67681df81519506e4c0b9dc2b688556ff09a98b501166ed19ed92` is not itself a Native ledger row. Previously the reviewer filtered only Native hashes and never received the cited original. Its placement has Goliath(27,18), Marauder anchor(27,22), not both(27,18). Four model-to-marker distances are13.95/8.612/16.413/11.839 inches; Marauder is out of coherency, placementLegalityProven=false. These are not enemy-target attack or LOS results.

Gate `verify-slice272-teach-review-receipts-v109.mjs`: RED missing citation → sole GREEN2.0s; actual incremental reviewer boundary receives unchanged placement +4 follow-ups; tampered wrapper excluded; 0 Provider/Room/draft writes. No claim of successful model correction.

### v110 — same evidence at revision and qualification

`roster-strategist-runtime-v1.mjs` passes retained Teach into the shared verified fact packet; workspace passes it into source reconciliation and new Teach fact packets. Actual revision previously had it only in a separate advisory projection, not the shared facts.

Gate `verify-slice272-repair-fact-receipts-v110.mjs`: actual B18 consumer RED66309 missing Native-backed wrapper; sole GREEN66470, unchanged original placement/follow-ups and false legality boundary, 0 Provider/Room/draft writes. This directly verifies the revision boundary; source reconciliation uses the same fact builder but has not yet been separately exercised by a real paid call with these receipts.

### v111 — automatic correction keeps original Teach identity

`reviewed-plan-auto-repair-v1.mjs`: completed older Teach's exact source hash is sent to `revisePlan`, whose existing frozen-dependency check decides whether it remains usable. No relabelling or dependency bypass. Previously automatic repair omitted this field, dropping Teach after Plan revision.

Gate `verify-slice272-auto-repair-teach-source-v111.mjs`: actual B18/Teach14 identities with a fixture representing the known wrong-coordinate finding; RED missing source hash → sole GREEN, 0 Provider/Room/draft writes. The fixture is not a model review.

No passed gate or unrelated/full suite was rerun. No subagents, install, deletion, data refresh or commit.

## Current real recovery

Runner67812: `common-v111-B-native-evidence-repair.private.mjs`, progress file with the same prefix. It verified B18 planned/current review completed/latest Provider completed and the exact idle offline host47205 command before replacing that host. It loads v109–111, runs one changed-claim evidence refresh against B17, and if High is returned invokes the existing product `repair-reviewed` route for at most one additional cycle under standing concrete-fix authorization. Original histories/counters/fees remain. No new Teach, queries, Room or auto-launch.

Watch the actual runner/host and draft state. Observation expiry is not a failed request or permission to resend. Zero High still requires inspection of the known coordinate/measurement error, not automatic certification. Costs here are token counts; prior estimates/unknown charges remain and no new current price is claimed.

## Remaining deliverables

1. Inspect the real evidence-aware B review/automatic correction; keep genuine unresolved geometry explicit.
2. Connect the verified same-room revision consumer to explicit pregame resume admission, preserving current Room state and memory. No silent historical Plan substitution.
3. Resume A/B/C/D only on the same corrected code and accepted applicable plans; original checkpoints A133/C156/B9/D9 remain. C Web155 lag must not replay156.
4. Complete original comparisons and full replay/Skill evolution gates; 20-map scope and deferred18 remain, no narrow gate substitutes for them.

harnessLoopUsed=true; ctx2skillLoopUsed=true; targetGames=starcraft-tmg; promptPackRoutes=fact_probe/harness_optimizer/rule_skill_builder. Evidence: public model reasons, exact Native receipts, bounded correction and journal retention. trainingTruth=false; canAffectRules=false; no Skill promotion or hidden chain-of-thought capture.
