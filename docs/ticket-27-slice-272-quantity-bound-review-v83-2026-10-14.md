# T27 / S272 — quantity-bound review and arrival-fact recovery v83

Status: T27 5/6, T23 33/36; main remaining248/272/249/250=4; complete games0/12.
The full map/2000-point roster/same-room comparison objective is NOT complete.

## Concrete defects and product changes

- B13's saved reviewer compared a three-marker3VP total with each2VP/1VP subtotal and labelled it contradicted. Scalar equality alone does not bind a proposition.
- A6's three-operand difference could not express `(own group + neutral) - opposing group` unambiguously. Per-marker amounts and group totals were also confused.
- A6 Raynor/Medic arrival facts already existed in the verified source packet but were omitted from the numeric catalogue. This was delivery, not missing Rules or a new predicted arrival.

`roster-review-premises-v1.mjs` now resolves a typed marker quantity from the same Rules projection: actor, controlled set, per-marker/total/margin/transfer swing. No model-supplied arithmetic operand becomes Rules truth. Unknown actors, duplicate/conflicting control sets and heterogeneous per-marker values remain unknown. The host evaluates arithmetic; the model still interprets natural-language quantity/actor references, so this is not a claim of infallible prose understanding. These conditional values never certify actual control, legal arrival, damage or a winner.

The source packet's schedule-derived `rosterUnits.firstArrivalRound` numbers now reach the numeric catalogue. They are planned schedule facts, not actual on-table positions.

`roster-final-plan-review-v1.mjs` uses policy12/output contract4. Fresh responses must include typed quantities; historical replies are read through a host-only `retained_scalar` adapter, excluded from the fresh model schema. Old paid outputs may be rechecked only when every old fact/scope remains identical; additive projections do not invalidate otherwise reusable evidence. Old unqualified scalar scoring contradictions require quantity clarification rather than automatic Plan edits. Original paid replies/fees are unchanged.

`roster-teach-framework-v1.mjs` removes the stale instruction that default formations always extend in a fixed right/up grid. It describes the actual v80 shared terrain-aware fixed-anchor solver, preferred spacing and preserved explicit positions. This is tool-mechanics alignment, not a tactical preference or proof of strategy improvement.

## Focused evidence

`scripts/verify-slice272-quantity-binding-v83.mjs <base>` uses actual A6/B13 saved workspaces. Initial reproduction exposed a test read-adapter omission (wire evidence IDs must first resolve); corrected reproduction showed five genuine missing/bad bindings. Sole post-product GREEN passed nine checks: arrival delivery, typed margin/per-marker/total, heterogeneous value rejection, saved false contradiction rejection, incorrect control-set/total rejection, unknown actor rejection.0Provider/0Room; draft bytes unchanged. No v80/v81/v82 gates repeated.

The real service then stopped BEFORE any Provider call because the strict schema registry forbids optional properties. A zero-Provider boundary replay exposed that exact failure, then the registry's required integer maximum. The read adapter and source-derived marker-number maximum corrected both; final boundary replay reaches the Provider boundary with ONLY findings68/71. Arrival finding88 reuses the paid evidence, as do the five previously resolved findings. This boundary check is not a live model pass. No numerical gate was repeated.

## Recovery and boundaries

Original rooms remain A133/C156/B9/D9; C Web155 requires observation backfill only, never replay156. No Plan applied, no room initialization or live action.

v83 runner61188 is terminal; idle hosts61210/61217 were exited after confirming no in-flight request. `common-v83r1-quantity-recovery.private.mjs` resumes the SAME A/B workspace data/map, with no Room launcher. Runner65153, A65173/B65184 were confirmed live while initializing. B14's completed review is kept idle without another call. A6 runs the existing bounded repair entry after the concrete contract fixes. Read `common-v83r1-quantity-recovery-progress.private.json` and actual handles before any retry. An observation timeout is not failure.

Next deliverables: actual A remaining-claim qualification; valid terrain-preserving Teach scene/domain/alternative-budget evidence; apply accepted Plan versions explicitly; resume all four original rooms on one code version. Neither review closure nor clearer prose proves strategic success.

harnessLoopUsed=true; ctx2skillLoopUsed=true; targetGames=[starcraft-tmg]; roles=fact_probe/harness_optimizer. No Skill promotion, subagent/K3, installation, deletion, official-data refresh or commit. trainingTruth=false. Local checks cost0; live incremental usage must be recorded from actual dispatches, preserving old costs.

## v83 real outcome / v84 exact-reference bridge

The real v83r1 call did NOT take the same short path as the diagnostic boundary: an empty checkpoint from the pre-dispatch schema failure made `resumeCurrent` skip importing older paid proofs. It therefore unnecessarily asked all eight claims again. Three paid calls247687units resolved the scoring claims but stopped at88/90. This is an engineering regression, not evidence of poor strategy. v84 excludes empty zero-attempt checkpoints from that resume shortcut.

The two remaining failures are captured precisely: the model used delivered `fact:<id>` text-evidence handles in numeric `factId`, and attached an arrival-number check to the nonnumeric phrase about using Raynor Orders. v84 maps ONLY exact same-catalogue numeric evidence handles to their existing fact paths, and omits nonnumeric extra checks from the numeric proof. Saved replies stay unchanged; invented IDs still fail. Policy13/contract4.1 preserves earlier completed proofs and old costs.

`verify-slice272-review-reference-bridge-v84.mjs` actual saved-response RED -> soleGREEN: both claims recovered; full current review reconciles with0new calls and0effectiveHigh; invented-ID rejection and original draft immutability pass. This is read-only until actual service recovery below. No prior quantity or v80/v81/v82 gate repeated. Local receipts are saved in `common-v83-v84-local-evidence.json`.

Actual v84 recovery uses ONLY A's idle host replacement, runner71631/host71638 at53352. Original A6 identity remains. B65184/53196 continues its already-running Teach investigation; it was not killed during a paid job. B uses the same v83 scene/Teach implementation; v84 changes review reference handling only, and B must load it after the current Teach completes before any later review/room launch.

Current-plan Teach is separate from source review: B14's eight-question investigation runs in `common-v83-current-plan-teach-progress.private.json` (runner67194). It already has successful hypothetical scene/spatial and actor-specific scoring replies; initial three query-prerequisite errors are being handled by the investigation, not passed as strategic evidence. A has a new guarded continuation in `common-v84-A-current-plan-teach-progress.private.json` (runner72158), waiting for actual A source qualification completion; old runner67194's A row is terminal and must not be restarted.

As of19:10:10Z completed dispatches this continuation: A3calls247687units, B2calls389458units. Frozen Sep14 off-peak cache-aware estimate A USD0.040301838/B USD0.064308408, totalUSD0.104610246, not an invoice; ongoing requests are excluded, all previous/unknown costs retained. No new¥100 threshold crossed.

### Actual recovery completed / next evidence gaps

19:11:41Z actual A6 repair completed with0additional calls/units and0Plan-edit cycles; policy13 unresolved0, review569644f2622b84b477b9b6e7336ca886d97677de61f7bc0d46537c933f29cae3. Plan c6802fa... unchanged. Runner71631 is finished; A71638 now runs current-plan Teach through runner72158. B65184/runner67194 continues independently on the identical scene/Teach code. Both host handles were confirmed live; no original Room/Plan application.

B's first investigation batch7operations is NOT a pass: one named Kerrigan/two-Raptor terrain-preserving hypothetical branch has all3unit assessments ok and an advisory spatial follow-up. Two math requests return PREGAME_LAB_MATH_INPUTS_INVALID; three other scenarios return PREGAME_LAB_HYPOTHETICAL_FORMATION_NOT_FOUND; one query still lacks CURRENT_ACTION_QUERY_DOMAIN_REFERENCE. Inspect the actual next investigation reply before intervening or restarting. Bounded formation miss is not proof of geometric impossibility. The newly introduced formation-miss code is not yet listed in the evidence port's queryRepair selector; inspect whether repair context is adequate. This is next engineering work, not a strategic verdict and not justification to clear terrain.
