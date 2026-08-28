# Ticket 11 Slice 40 — Marine Stimpack atomic composition

Date: 2026-08-26  
Status: frozen after live-source, focused, runtime, Authority/replay, historical, foundation and platform gates pass

## Outcome

Slice 40 promotes six reusable RuleAtoms and composes the current official Marine `STIMPACK` path through activation, typed status state, one ranged consumer, later standard damage and Cleanup. The rules engine remains incomplete: `420 / 912` actionable RuleAtoms are executable (`46.1%`), `492` remain review-required and `114` remain display-only.

The bounded executable path is:

- a current single-model Marine with the Stimpack upgrade may use the Active ability before or after its Movement Hold action;
- it pays exactly 1 CP from the current Terran Armed Forces card and may use the named ability only once per Unit per round;
- `NON-LETHAL DAMAGE (2)` adds two to the damage marker but never removes the model, even when the marker reaches the Marine's printed HP 2;
- a typed status plus board marker stores `BUFF Speed (3)` and grants `PRECISION (3)` to the C-14 Rifle and Close Combat Weapons until Cleanup;
- the current C-14 ranged consumer pauses after rolling to Hit and enumerates every distinct subset of failed Attack Dice of size zero through `min(3, failed dice)`;
- only the player's explicit Precision choice is converted to successful Hits, including for Surge; the Harness never auto-maximizes the optional choice;
- later positive standard damage combines with the existing non-lethal marker under normal damage resolution and may then remove the model;
- End of Round retains the effect until Cleanup; Cleanup removes the typed status and marker, refreshes the payment card and retains the damage marker.

Speed `3` is stored as authoritative typed state but is not yet consumed by Movement LegalSpace. Close Combat Precision is also not yet consumed. Unsupported terrain, loadouts, reactions, Academy payment composition, unknown status/marker material and stale actions fail closed rather than silently using a generic fallback.

## Exact atomic boundary

The six promoted RuleAtoms are:

1. `rule-atom:active-ability-default-end-round-expiry`
2. `rule-atom:singleton:core-11-buff-duration:48199913097a`
3. `rule-atom:singleton:core-11-non-lethal-damage-accumulation:70938eb8369b`
4. `rule-atom:singleton:core-11-non-lethal-no-casualty-removal:cb98ebd1c290`
5. `rule-atom:singleton:core-11-non-lethal-standard-damage-trigger:79458dcf31db`
6. `rule-atom:singleton:core-11-precision-failed-dice-conversion:b540b4f0a7c2`

`authority.marine-stimpack-kernel-v1@1.0.0` owns the typed status/marker, non-lethal accumulation, exact C-14 Precision grant, later standard-damage combination and Cleanup validation. `authority.attack-resolution-kernel-v6@6.0.0` extends the frozen v5 attack pipeline with a post-Hit Precision choice without modifying v1–v5.

`authority.marine-stimpack-active-v1@1.0.0` owns activation, payment, named-use history and status creation. `authority.stimpack-ranged-consumer-v1@1.0.0` owns both the current C-14 Precision path and the inverse ordinary-Marine attack that combines positive standard damage with the non-lethal marker. End-of-Round/Cleanup v4 compose the new status lifecycle while delegating non-Stimpack historical state to v3 behavior.

The generic Buff-value atom is not promoted because storing `Speed (3)` is not proof that every movement calculation consumes it. This separation is intentional: future official updates can revise an atomic value, timing or consumer independently and force only the affected contracts and replays through revalidation.

## Live official evidence

- Firestore remains `units=71 / cards=69 / rules=48`; versions hash `35b3c26bb9c82bce1efba3e48697b41e512b0be7d7e4bacb9452d224fd62c733`.
- Marine document: `32061705b67ab074c6aa755dc527f6d0db0e4fc2d7cb2fa95d7b288f35cf79f1`.
- Parts 8 / 10 / 11: `35df7670c92d7402ef22333184f267a66cf155808b3bcaa333340932b19bf55b` / `3c2ef4d29afbf6dc38b609388dcb663b40e91627eaa29cbe469e6db4cf8d86a1` / `35bf7492bae59a5f30b51dc94c23295b231b908b667a2a44e7c5e317ac2e045c`.
- Latest gameplay snapshot / normalized dataset / exact gameplay bundle: `2407d2536278776692c9116cb74c4147e15f2aa6ff9af9204141e5620220bd78` / `40ba72534a2165131288ec77ccf67984baf5f740e58c4f94283b46137a54757a` / `35cd2e1a7a7cb7575f0525dbf6ff08fa0a5285b5fcf89e6b901976f532f1463b`.
- Core Rules / Terran P2P: `27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54` / `afa3f229db61444d0673dea35e31772530a4c39dadaa0e281ba1bae0d271109c`.
- Repository fallback is forbidden and was not used.

The exact official Stimpack text binds non-lethal damage 2, Buff Speed 3 and Precision 3. The exact Precision definition makes the conversion optional (`up to X`) and occurs after the Hit roll, so the legal choice space contains the empty choice and every bounded failed-die subset.

## Authority and Harness contract

Only Slice 40 advances to `hybrid_legal_space_v10`. It retains activation values and the attack plan, status, marker and Precision-grant identities. After the signed Hit reveal it retains the pending, reveal and selected-subset hashes plus the exact converted failed-die indices and count. While that decision is pending, LegalSpace exposes only the owning player's exact Precision alternatives.

`LegalSpace -> Preview -> explicit Confirm -> Apply -> Replay` covers both player seats. The Ed25519 receipt chain survives HMAC seal rotation; stale choices and event tampering reject. Slice 39 remains exact on v9, and every earlier runtime, action schema and old-rules display remains frozen.

This proves a bounded Harness seam, not complete Harness delivery. Browser/App rendering, Kerrigan prompt/tool decisions, persistent scoped memory, evaluation, Skill generation/promotion through DSH, self-play/MuZero lineage and training admission/rollback remain separate tickets or later Ticket 11 composition gates.

## Frozen identities, counts and evidence

- Slice: `7ae981afe360688f6974a734a938d3bbecd8e68a83acebc394f4995851953322`.
- Catalogue: `f11ffcd0a8e07bb6fb9be6498fc69b31575ff3176ab7daa55c0ad92bf2f9d2d9`.
- Runtime: `d7ae88eb24d20313aebca63a2c43a6a2ae4c5f000ff92a896864f10710fe89fe`.
- Stimpack kernel: `f289b1dcc0fdf09099c5128f6e59d5c19e634752c475abdec27e6d99d8c2bf49`.
- Historical Slice 39 runtime: `4a7344b351459dabcd05649efdaf8d4f7a69abd76e2cca534c9568e315c09eb5`.
- Combat-effect denominator remains `2bffb9ec79f6439385b72ca1ccbc679e3ff5d843cf0d00fa15365df222b5188b`.
- RuleAtoms: `420 / 912` executable (`46.1%`), `492` review-required, `114` display-only.
- Frozen vertical slices: `40`; planning-only forecast: about `47` further slices.
- Slice verifier: `16 / 16`; generic runtime: `10 / 10`; historical Slice 39: `15 / 15`.
- Ticket 11 foundation: `102` base reports / `1,018` assertions; with aggregate, `103 / 1,026`; zero failures.
- Platform `verify:all`: green across Authority, room, HTTP, Kerrigan, Provider, worldbook, translation/localization and offline Skill safety arms.
- Project: `10 / 22` Tickets complete; Ticket 11 remains active.

## ctx2skill and Harness loop record

- `ctx2skillLoopUsed=true`
- `targetGames=[starcraft-tmg]`
- `roleRoutes=[rule_skill_builder, referee, opponent]`
- `skillsRead=[]`
- `skillsGenerated=[]`
- `judgeTestsRun=[stimpack_active_non_lethal_and_typed_status, precision_post_hit_complete_finite_choice_legal_space, precision_converted_hits_participate_in_surge, later_standard_damage_combines_non_lethal_marker, stimpack_eor_cleanup_and_damage_marker_retention, authority_both_seats_replay_and_tamper_reject]`
- `crossTimeReplayResult=slice39_life_support_and_slice40_stimpack_multistep_replays_passed`
- `promotions=[]`
- `blocks=[no-skill-generation-or-promotion-in-rule-executor-slice, speed-movement-consumer-remains-review-required, close-combat-precision-consumer-remains-review-required, remaining-492-actionable-rule-atoms-not-executable]`
- `remainingRuleGaps=492`
- `harnessLoopUsed=true`
- `promptPackRoutes=[referee_prompt, opponent_prompt]`
- `harnessToolsCalled=[list_legal_actions, preview_action, apply_action_after_user_confirmation, replay_room]`
- `uiTraceEvidence=[stimpack-shows-cp-non-lethal-marker-buff-and-precision-state, post-hit-precision-shows-every-distinct-failed-die-subset-up-to-three, cleanup-removes-effect-state-but-retains-damage-marker]`
- `agentDecisionEvidence=[rules-own-hit-reveal-and-agent-chooses-only-from-post-hit-precision-legal-space, harness-never-auto-maximizes-the-optional-precision-choice]`
- `memoryTraceEvidence=no-memory-write-or-promotion-attempted`
- `trainingTraceCandidates=[]`
- `rollbackOrDemotionRules=[official-marine-or-parts-8-10-11-drift-demotes-slice-40, precision-choice-completeness-lifecycle-authority-or-replay-failure-demotes-slice-40]`
- `userVisibleChecks=[stimpack-marine-survives-two-non-lethal-damage-at-two-hp, player-sees-zero-through-up-to-three-failed-die-conversion-choices, converted-hit-can-be-bypassed-by-surge-before-armour, later-positive-standard-damage-removes-the-stimpacked-marine, cleanup-removes-stimpack-and-refreshes-card-without-healing-damage]`

DSH was not run because it is authorized only for Skill generation. `rulesEligible=false`, `productionRoomEligible=false` and `trainingTruth=false` remain mandatory.
