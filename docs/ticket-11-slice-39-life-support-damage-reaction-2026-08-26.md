# Ticket 11 Slice 39 — Life Support damage reaction and Passive carrier

Date: 2026-08-26  
Status: frozen after live-source, focused, runtime, Authority/replay, historical, foundation and platform gates pass

## Outcome

Slice 39 promotes seven reusable RuleAtoms and closes the first exact attack-to-damage Reaction chain. A current official Marine C-14 attack now pauses after Total Damage is known but before casualty allocation, projects the decision to the defender, offers every exact eligible Medic `LIFE SUPPORT` source plus Pass, applies any reduction and then resumes the original attacker's Assault settlement. The rules engine remains incomplete: `414 / 912` actionable RuleAtoms are executable (`45.4%`), `498` remain review-required and `114` remain display-only.

The bounded current-official path is:

- Optical Flare may survive the existing Restoration window and modify the attacking Marine's ranged profile;
- the ranged consumer resolves its exact attack pools but defers casualty allocation when Total Damage is positive;
- the defender receives one seat-scoped Life Support window containing every currently eligible on-field Medic and one Pass action;
- Life Support costs exactly 1 Command Point, targets another friendly Biological Unit Within 4 inches and reduces Total Damage by the number of models in the selected Medic Unit Within 4 inches;
- `STABILIZER MEDPACKS` is an exact Passive carrier: while its Medic is on the battlefield it counts one additional model for Life Support; it is inactive in Reserve;
- reduction is applied after Total Damage and before casualty allocation, with a floor of zero; the target damage marker, casualty and discarded overflow are then derived from the reduced total;
- exactly one Reaction is resolved for that activation, the selected source's same-named per-round ledger is updated, and control returns to the original attacker for Assault settlement.

The focused fixture composes Slice 37 Optical Flare, Slice 38 Restoration Pass and Slice 39 Life Support. An already-damaged Marine receives two incoming damage. A two-model Medic with Stabilizer reduces Total Damage by three and the Marine survives; a one-model Medic reduces it by one and the Marine is destroyed; Pass applies the unreduced damage and also destroys it. Reserve, out-of-range and already-used Medics are not offered.

Stale pending or plan hashes, premature casualty allocation, wrong-seat or unrelated actions during the Reaction, missing payment, source/target/range/bundle drift and tampered receipts fail closed. A mixed friendly roster exposed and fixed one scanner defect: a Medic loadout that does not declare Life Support is now skipped, while malformed loadouts that claim Life Support still fail closed.

## Why atoms alone do not complete the rules engine

The `912` denominator measures actionable atomic rule semantics. Reaching `912 / 912` is necessary, but Ticket 11 still requires separate closure over:

1. composition and timing of every relevant atom combination, including nested and competing windows;
2. complete LegalSpace enumeration and illegal-choice exclusion for every supported state;
3. deterministic Preview, Apply, Journal and Replay under frozen data and rules versions;
4. cross-rule interactions, historical-version replay and explicit fail-closed boundaries.

Harness delivery is not wiring-only. Rules wiring makes legal observations and actions callable, but the complete Harness must also prove Web/App seat projections and confirmations, Agent tool and prompt contracts, scoped memory, evaluation and failure attribution, Skill generation/promotion with DSH, self-play/MuZero lineage, and training admission/rollback. Slice 39 validates the bounded rules/Authority/Harness seam only.

## Exact atomic boundary

The seven promoted RuleAtoms are:

1. `rule-atom:all-ability-types-reserve-inactivity`
2. `rule-atom:passive-ability-behavior-and-battlefield-condition`
3. `rule-atom:passive-ability-reserve-inactivity`
4. `rule-atom:passive-ability-trait-definition`
5. `rule-atom:singleton:core-10-3-passive-battlefield-activity:198602368c7a`
6. `rule-atom:singleton:core-11-passive-ability-battlefield-duration:1ea9b8807aa0`
7. `rule-atom:singleton:core-8-7-4-total-damage-reduction:f463f134d482`

`authority.total-damage-reaction-kernel-v1@1.0.0` owns the exact one-visible-model plan and resolution: existing damage marker plus incoming damage forms Total Damage; an optional reduction is applied with a floor of zero before casualty allocation; the remaining marker, casualty and non-visible overflow are derived afterwards. Its kernel hash is `5bfafd4764b0aed0cf9dfb11ea8f2513a4990938d39a4d3fab891093017ab2ad`.

`authority.optical-flare-ranged-consumer-v1@1.0.0` gains an explicit deferred-damage path while preserving its Slice 38 default behavior. `authority.medic-life-support-reaction-v1@1.0.0` owns the trigger, arbitrary finite source alternatives, Within-4 measurement, Passive contribution, Use/Pass, exact CP payment, per-source/per-round named ledger and per-player/per-activation one-Reaction ledger.

Nested ready-Academy payment, Queen Transfusion/non-CP Life Support carriers, other targets and attacks, multi-model casualty ordering and general competing Reaction priority remain review-required instead of being inferred from this fixture.

## Live official evidence

- Firestore remains `units=71 / cards=69 / rules=48`; versions hash `35b3c26bb9c82bce1efba3e48697b41e512b0be7d7e4bacb9452d224fd62c733`.
- Medic / Marine documents: `35e272e5aa48b372d982991fe6f182a355d9caa90cc3f4630b34320429465e35` / `32061705b67ab074c6aa755dc527f6d0db0e4fc2d7cb2fa95d7b288f35cf79f1`.
- Parts 2 / 8 / 10 / 11: `32f1ff544aa558c5b72f242d7c05df659694570f4f8794f6637de2b3181df929` / `35df7670c92d7402ef22333184f267a66cf155808b3bcaa333340932b19bf55b` / `3c2ef4d29afbf6dc38b609388dcb663b40e91627eaa29cbe469e6db4cf8d86a1` / `35bf7492bae59a5f30b51dc94c23295b231b908b667a2a44e7c5e317ac2e045c`.
- Latest gameplay snapshot / normalized dataset / exact gameplay bundle: `2407d2536278776692c9116cb74c4147e15f2aa6ff9af9204141e5620220bd78` / `40ba72534a2165131288ec77ccf67984baf5f740e58c4f94283b46137a54757a` / `35cd2e1a7a7cb7575f0525dbf6ff08fa0a5285b5fcf89e6b901976f532f1463b`.
- Core Rules / Terran P2P: `27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54` / `afa3f229db61444d0673dea35e31772530a4c39dadaa0e281ba1bae0d271109c`.
- Repository fallback is forbidden and was not used.

The full foundation command encountered one transient official-source timeout at Slice 31. Retrying the unchanged failed tail succeeded through Slice 39, runtime, data adapters and aggregate; no rules assertion failed and no repository fallback was enabled.

## Authority and Harness contract

Only Slice 39 advances to `hybrid_legal_space_v9`. Action identity retains the trigger attack and Total Damage plan hashes, target marker and incoming damage, range receipt, reduction source, base/passive/total reduction and payment identity. While Life Support is pending, LegalSpace projects only defender Use/Pass choices; Hold, attack and unrelated actions cannot skip the window. Applying a choice completes damage/casualty resolution and settles the original attacker's Assault activation.

`LegalSpace -> Preview -> explicit Confirm -> Apply -> Replay` covers both player seats and multiple Medic alternatives. The Ed25519 receipt chain survives HMAC seal rotation; stale actions and receipt tampering reject. Slice 38 remains exact on `hybrid_legal_space_v8`, and every older runtime, action schema and old-rules display remains frozen.

Browser/App rendering, live Kerrigan decisions, prompt/tool evaluation, persistent scoped memory, Skill generation with DSH, self-play and MuZero lineage remain separate Harness work. No current trace is promoted to memory or training truth.

## Frozen identities, counts and evidence

- Slice: `f54e29d1156331539b8cbb3cbda9517d9b56785acbbe598ef48428bd01154aed`.
- Catalogue: `bccab94b7e9d1979581125acedefa3d28e8707756ac4c5a5a09198c3df5abe0e`.
- Runtime: `4a7344b351459dabcd05649efdaf8d4f7a69abd76e2cca534c9568e315c09eb5`.
- Historical Slice 38 runtime: `4260abf38957d9bbcb307171a346d35408778c446905306eefc8404de76edda4`.
- Combat-effect denominator remains `2bffb9ec79f6439385b72ca1ccbc679e3ff5d843cf0d00fa15365df222b5188b`.
- RuleAtoms: `414 / 912` executable (`45.4%`), `498` review-required, `114` display-only.
- Frozen vertical slices: `39`; planning-only forecast: about `47` further slices.
- Slice verifier: `15 / 15`; generic runtime: `10 / 10`; historical Slice 38: `14 / 14`.
- Ticket 11 foundation: `101` base reports / `1,002` assertions; with aggregate, `102 / 1,010`; zero failures.
- Platform `verify:all`: green across Authority, room, HTTP, Kerrigan, Provider, worldbook, translation/localization and offline Skill safety arms.
- Project: `10 / 22` Tickets complete; Ticket 11 remains active.

## ctx2skill and Harness loop record

- `ctx2skillLoopUsed=true`
- `targetGames=[starcraft-tmg]`
- `roleRoutes=[rule_skill_builder, referee, opponent]`
- `skillsRead=[]`
- `skillsGenerated=[]`
- `judgeTestsRun=[total_damage_deferred_before_casualty_allocation, life_support_use_pass_and_exact_cp_payment, arbitrary_finite_medic_source_choice_and_single_reaction_limit, stabilizer_passive_battlefield_and_reserve_lifecycle, damage_reduction_then_original_assault_settlement, authority_cross_seat_replay_and_tamper_reject]`
- `crossTimeReplayResult=slice38_restoration_range_and_slice39_life_support_damage_replays_passed`
- `promotions=[]`
- `blocks=[no-skill-generation-or-promotion-in-rule-executor-slice, nested-academy-on-life-support-remains-fail-closed, queen-transfusion-and-non-cp-resource-carriers-remain-review-required, remaining-498-actionable-rule-atoms-not-executable]`
- `remainingRuleGaps=498`
- `harnessLoopUsed=true`
- `promptPackRoutes=[referee_prompt, opponent_prompt]`
- `harnessToolsCalled=[list_legal_actions, preview_action, apply_action_after_user_confirmation, replay_room]`
- `uiTraceEvidence=[attack-damage-pauses-and-seat-switches-to-life-support-use-or-pass, multiple-medic-source-and-payment-alternatives-are-visible, passive-bonus-reduction-and-post-reaction-damage-result-are-visible]`
- `agentDecisionEvidence=[rules-own-total-damage-window-source-range-payment-and-reaction-limit, agent-cannot-allocate-casualties-before-the-reaction-decision]`
- `memoryTraceEvidence=no-memory-write-or-promotion-attempted`
- `trainingTraceCandidates=[]`
- `rollbackOrDemotionRules=[official-medic-marine-or-parts-2-8-10-11-drift-demotes-slice-39, damage-window-seat-projection-authority-or-replay-failure-demotes-slice-39]`
- `userVisibleChecks=[attack-pauses-before-casualty-and-defender-sees-life-support-use-pass, stabilized-medic-reduces-total-damage-by-one-more, pass-resolves-unreduced-damage-and-can-destroy-target, reserve-out-of-range-or-used-medic-is-not-offered]`

DSH was not run because it is authorized only for Skill generation. `rulesEligible=false`, `productionRoomEligible=false` and `trainingTruth=false` remain mandatory.
