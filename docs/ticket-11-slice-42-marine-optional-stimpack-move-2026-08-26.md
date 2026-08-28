# Ticket 11 Slice 42 — Marine scale-aware optional Stimpack Move

Date: 2026-08-26  
Status: frozen after live-source, focused, runtime, Authority/replay, historical, foundation and platform gates pass

## Outcome

Slice 42 closes the composition gap between an ordinary Marine Move and electing to use Stimpack immediately before that Move. It also makes the official split Speed depend on the Unit's current remaining model count instead of assuming a one-model Unit.

The exact rules-owned domains are:

| Current Marine models | Decline Stimpack | Use Stimpack |
| --- | ---: | ---: |
| 2–9 | 4 inches | 7 inches |
| 1, including a Unit reduced to one model | 7 inches | 10 inches |

Marine prints Speed `4/7`; Stimpack applies Buff Speed `3`. A casualty that changes `currentModels` invalidates the old parameter domain and requires fresh enumeration. An unavailable or exhausted payment card removes only the Stimpack domain; the zero-cost base Move remains visible.

This is a composition-only slice. It promotes, changes and version-reassigns zero RuleAtoms. The current denominator therefore remains `421 / 912` executable actionable RuleAtoms (`46.2%`), `491` review-required and `114` display-only. Forty-two vertical slices are frozen; the rolling planning forecast is about 49 further slices and is not an authority denominator.

## What “scale” means

Three independent concepts must not be conflated:

- `currentModels` selects the first or second split-Speed value. A Unit that started with one model, or has been reduced to one remaining model, uses the second value.
- Marine's `32mm` base size controls whole-base battlefield containment, swept collision, final overlap, enemy engagement and coherency geometry. It does not add movement distance.
- the printed `Size` characteristic describes model height/visibility semantics. It does not select the Marine `4/7` Speed tier.

This distinction is enforced by stale-domain rejection: casualty changes must rederive Speed, while base-size changes would invalidate geometry evidence rather than mutate Speed.

## Exact module boundary

`authority.marine-optional-stimpack-move-v2@2.0.0` exposes one Move action family with two rules-owned modes:

- `moveMode=base`, `abilityChoice=decline`: no ability identity, payment, damage, Buff, marker or ability-history mutation; the existing card, damage and status state is preserved.
- `moveMode=stimpack`, `abilityChoice=use`: exact 1-CP payment, Non-Lethal Damage 2 and typed Stimpack status/marker resolve before movement.

`authority.marine-move-geometry-kernel-v2@2.0.0` hides exact milli-inch path canonicalization and multi-model geometry behind the Move parameter-domain interface. It checks actual polyline length, whole-base board containment, passage through the same Unit's starting bases, swept collision against other Units, final overlap, enemy 1-inch endpoint exclusion, ordered placement of remaining models, wholly-within-3 placement and link coherency.

The implementation accepts exactly the current official two-Marine fixture with one to nine current/max models, ground round bases and empty supported terrain geometry. Unsupported state fails closed.

## Live official evidence

- Firestore remains `units=71 / cards=69 / rules=48`; versions canonical hash `35b3c26bb9c82bce1efba3e48697b41e512b0be7d7e4bacb9452d224fd62c733`.
- Marine canonical hash: `32061705b67ab074c6aa755dc527f6d0db0e4fc2d7cb2fa95d7b288f35cf79f1`; its current split Speed is `4/7` and Stimpack grants Buff Speed `3`.
- Parts 5 / 8 / 10 / 11 canonical hashes: `cf666f0fb4dba745486c795a16344468683de2ef7a1cfcce9fef37af823db864` / `35df7670c92d7402ef22333184f267a66cf155808b3bcaa333340932b19bf55b` / `3c2ef4d29afbf6dc38b609388dcb663b40e91627eaa29cbe469e6db4cf8d86a1` / `35bf7492bae59a5f30b51dc94c23295b231b908b667a2a44e7c5e317ac2e045c`.
- Latest gameplay snapshot / normalized dataset / comprehensive gameplay bundle: `2407d2536278776692c9116cb74c4147e15f2aa6ff9af9204141e5620220bd78` / `40ba72534a2165131288ec77ccf67984baf5f740e58c4f94283b46137a54757a` / `0bfdd8678995b4aaa439fba2fbb75d96f26e067af2cdf86ca96eecc25ef93098`.
- Core Rules / Terran P2P content hashes: `27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54` / `afa3f229db61444d0673dea35e31772530a4c39dadaa0e281ba1bae0d271109c`.
- Repository fallback is forbidden and was not used.

## Authority, replay and Harness boundary

Only Slice 42 uses `hybrid_legal_space_v12`. A base Move is a direct gesture and does not require explicit confirmation. A Stimpack Move spends a resource and changes damage/status state, so it requires explicit human confirmation. Both branches retain exact mode, ability choice, underlying action and path-domain identity.

Both seats pass `LegalSpace -> Preview -> Apply -> Replay`; the Stimpack branch additionally passes explicit confirmation. Ed25519 receipts replay across HMAC seal rotation. Stale casualty domains, over-speed paths, placement-denominator drift, collision, overlap, broken coherency, illegal engagement endpoints and journal tampering fail closed. Slice 41 v11 and every earlier runtime and old-rules display remain exact.

This proves a bounded rule/Harness seam only. Terrain, Access Points, elevation, Flying, other Unit types, post-Move Active use, Run/Charge/Deploy/Close Ranks and other Speed consumers, Close Combat Precision, browser/App traces, persistent memory, Skill promotion, self-play/MuZero and production admission remain open.

## Frozen identities and verification

- Slice: `b9e6fc60ba92f75dc1b0467e9599c2b392dfb28da1b07f23a4ece794f4fa3434`.
- Catalogue: `7a20c8408082facb6d3c4255d6930fac946477c8ae78cd1d33b507e6577b9ede`.
- Runtime: `6f025a2f0b60c8f36a20f1131eb6401ab7a9ae40ad5db6049bab187b9638bc4c`.
- Marine Move geometry kernel v2: `8ff1b1f1382fe7d2c1615801c0788dfa32fe1bfb15dddb0087f122322c3f5b60`.
- Historical Slice 41 / catalogue / runtime: `e02af2917e9100144242c26d5410251742d84d508b01d639401cbc720c2ab5e7` / `d3edd16def3f9ba7a5035800ff1285233cece3144c047ff74ad3e79f56f96712` / `6206a3058aec4ec9750a27465b5c203049b50a9cb7bafb7763be39810a3ece86`.
- Combat-effect denominator remains `2bffb9ec79f6439385b72ca1ccbc679e3ff5d843cf0d00fa15365df222b5188b`.
- Focused Slice 42: `17 / 17`; generic runtime: `10 / 10`; historical Slice 41: `16 / 16`.
- Ticket 11 foundation: `104` base reports / `1,051` assertions; with aggregate, `105 / 1,059`; zero failures.
- Platform `verify:all`: green across Authority, room, HTTP, Kerrigan roles, direct Provider, worldbook, translation/localization and offline Skill safety arms.
- Project: `10 / 22` Tickets complete; Ticket 11 remains active.

## Rule-relationship follow-up

Slice 43 is reserved for a cross-layer Rule Relationship Graph and omission linter. It will derive a hash-bound graph from source clauses, RuleAtoms, state reads/writes, executor manifests, parameter domains, tests and version ancestry. Its first mandatory regression chain is:

`casualty -> currentModels write -> split-Speed rederive -> old Move domain invalidated -> four-grid tests`

The deep module will expose only frozen graph construction, impact query and coverage audit. It must report missing source, executor, test, consumer, invalidation or version edges without becoming a second rules authority. This planning slice will not increase the executable-atom count.

## ctx2skill and Harness loop record

- `ctx2skillLoopUsed=true`
- `targetGames=[starcraft-tmg]`
- `roleRoutes=[rule_skill_builder, referee, opponent]`
- `skillsRead=[]`
- `skillsGenerated=[]`
- `judgeTestsRun=[multi_model_base_four_and_stimpack_seven_domains, single_model_base_seven_and_stimpack_ten_domains, reduced_to_single_model_rederives_second_speed_value, payment_unavailable_removes_only_stimpack_domain, base_branch_preserves_card_damage_status_marker_and_ability_history, multi_model_path_placement_overlap_engagement_coherency_and_stale_reject, both_seats_authority_replay_hmac_rotation_and_tamper_reject, slice41_cross_time_replay]`
- `crossTimeReplayResult=slice41_single_model_v1_and_slice42_optional_scale_v2_replays_passed`
- `promotions=[]`
- `blocks=[no-skill-generation-or-promotion-in-rule-executor-slice, close-combat-precision-consumer-remains-review-required, remaining-speed-consumers-remain-review-required, remaining-491-actionable-rule-atoms-not-executable]`
- `remainingRuleGaps=491`
- `harnessLoopUsed=true`
- `promptPackRoutes=[referee_prompt, opponent_prompt]`
- `harnessToolsCalled=[list_legal_actions, preview_action, apply_action_after_user_confirmation, replay_room]`
- `uiTraceEvidence=[same-state-shows-base-and-stimpack-move-domains-with-distinct-costs, multi-model-shows-four-or-seven-and-single-model-shows-seven-or-ten]`
- `agentDecisionEvidence=[opponent-can-compare-but-not-invent-base-versus-stimpack-domain, resource-unavailable-state-keeps-legal-base-move-visible]`
- `memoryTraceEvidence=no-memory-write-or-promotion-attempted`
- `trainingTraceCandidates=[]`
- `rollbackOrDemotionRules=[official-marine-speed-stimpack-core-or-p2p-drift-demotes-slice-42, scale-choice-geometry-authority-or-replay-failure-demotes-slice-42]`
- `userVisibleChecks=[multi-model-player-sees-four-inch-base-and-seven-inch-stimpack-options, single-model-player-sees-seven-inch-base-and-ten-inch-stimpack-options, exhausted-payment-card-removes-only-the-stimpack-option]`

DSH was not run because this is a rule-executor slice and DSH is authorized only for offline Skill generation. No Skill, MuZero, memory or training candidate was generated or promoted. `rulesEligible=false`, `productionRoomEligible=false` and `trainingTruth=false` remain mandatory.
