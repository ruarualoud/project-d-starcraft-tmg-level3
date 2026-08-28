# Ticket 11 Slice 41 — Stimpack Buff-value and Move consumer

Date: 2026-08-26  
Status: frozen after live-source, focused, runtime, Authority/replay, historical, foundation and platform gates pass

## Outcome

Slice 41 promotes the reusable Part 11 Buff-value RuleAtom and consumes Marine `STIMPACK` Speed `3` in a real Movement LegalSpace. The exact bounded transition is now executable: a current unmodified one-model Marine elects to use Stimpack immediately before Move, pays 1 CP, receives Non-Lethal Damage 2 and the typed status, then moves at printed one-model Speed 7 plus Buff 3 for an exact maximum of 10 inches.

The rules engine remains incomplete. `421 / 912` actionable RuleAtoms are executable (`46.2%`), `491` remain review-required and `114` remain display-only. Forty-one vertical slices are frozen; the rolling forecast is about 48 further slices and is planning information, not an acceptance denominator.

This slice deliberately does not claim:

- an ordinary base Move for a Stimpack-equipped Marine that declines to use the ability;
- Stimpack after Move, because an Active ability is used immediately before declaring an action or after that action fully resolves, never during it;
- Run, Charge, Deploy, Close Ranks or other Speed consumers;
- multi-model movement, terrain, access, elevation or Flying geometry;
- Close Combat Precision.

Those paths continue to fail closed or remain review-required. In particular, the existing Standard Move v1 excludes selected upgrades, so “decline Stimpack and move 7 inches” is an explicit composition gap rather than a silently inherited fallback.

## Exact atomic and module boundary

The one newly executable atom is:

`rule-atom:singleton:core-11-buff-value:260df1f72f16`

`authority.characteristic-status-kernel-v2@2.0.0` freezes v1 as its historical base and adds only source-bound numeric Buff resolution. For this slice it proves `Speed 7 + 3 = effective Speed 10`; unsupported characteristics, status forms or source drift reject.

`authority.stimpack-move-consumer-v1@1.0.0` owns the exact one-model path parameter domain. It composes the already-frozen Stimpack Active/payment/non-lethal/status contract with the Standard Move path, battlefield, base collision and enemy-engagement endpoint rules in one Authority transition. The client supplies only a path instantiated by the rules-owned domain; it cannot supply the modifier or insert the ability midway through movement.

The generic executable runtime registers the new executor only for the Slice 41 catalogue. Slice 40 and every earlier descriptor therefore retain their exact executor manifests and hashes.

## Live official evidence

- Firestore remains `units=71 / cards=69 / rules=48`; versions canonical hash `35b3c26bb9c82bce1efba3e48697b41e512b0be7d7e4bacb9452d224fd62c733`.
- Marine document canonical hash: `32061705b67ab074c6aa755dc527f6d0db0e4fc2d7cb2fa95d7b288f35cf79f1`; its current one-model printed Speed is `7` and Stimpack grants Speed `3`.
- Parts 8 / 10 / 11 canonical hashes: `35df7670c92d7402ef22333184f267a66cf155808b3bcaa333340932b19bf55b` / `3c2ef4d29afbf6dc38b609388dcb663b40e91627eaa29cbe469e6db4cf8d86a1` / `35bf7492bae59a5f30b51dc94c23295b231b908b667a2a44e7c5e317ac2e045c`.
- Latest gameplay snapshot / normalized dataset / exact gameplay bundle: `2407d2536278776692c9116cb74c4147e15f2aa6ff9af9204141e5620220bd78` / `40ba72534a2165131288ec77ccf67984baf5f740e58c4f94283b46137a54757a` / `35cd2e1a7a7cb7575f0525dbf6ff08fa0a5285b5fcf89e6b901976f532f1463b`.
- Core Rules / Terran P2P content hashes: `27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54` / `afa3f229db61444d0673dea35e31772530a4c39dadaa0e281ba1bae0d271109c`.
- The promoted source clause is `core:11:buff-value`, official primary page 84, semantic text hash `db8d29e80ddd5ca39724540241d70ae03c24ff966041caacaf6a51a11d76817d`.
- Repository fallback is forbidden and was not used.

## Authority, replay and Harness boundary

Only Slice 41 advances to `hybrid_legal_space_v11`. The action retains ability, payment, status and path-domain identities, so a resource-spending Move requires explicit human confirmation rather than direct-gesture treatment. Apply resolves payment, non-lethal damage, status creation and movement in source order, then settles alternation.

Both seats pass `LegalSpace -> Preview -> explicit Confirm -> Apply -> Replay`. The Ed25519 receipt chain survives HMAC seal rotation; stale domains, paths beyond 10 inches, collisions, illegal enemy engagement endpoints and receipt tampering reject. The resulting typed status remains compatible with Slice 40's later C-14 Precision consumer and Cleanup lifecycle. Slice 40 stays exact on Authority v10 and old-rules display is retained.

This is bounded Harness evidence, not complete Harness delivery. It verifies tool contracts and agent choice containment, while browser/App traces, complete prompt/agent evaluation, persistent scoped memory, Skill generation/promotion, self-play/MuZero and production training admission remain open.

## Frozen identities and verification

- Slice: `e02af2917e9100144242c26d5410251742d84d508b01d639401cbc720c2ab5e7`.
- Catalogue: `d3edd16def3f9ba7a5035800ff1285233cece3144c047ff74ad3e79f56f96712`.
- Runtime: `6206a3058aec4ec9750a27465b5c203049b50a9cb7bafb7763be39810a3ece86`.
- Characteristic-status kernel v2: `113a7e607d93161ccf30c663a4de6e6d5b4bdb3d922c01c55e82010aa152fd5d`.
- Historical Slice 40 / catalogue / runtime: `7ae981afe360688f6974a734a938d3bbecd8e68a83acebc394f4995851953322` / `f11ffcd0a8e07bb6fb9be6498fc69b31575ff3176ab7daa55c0ad92bf2f9d2d9` / `d7ae88eb24d20313aebca63a2c43a6a2ae4c5f000ff92a896864f10710fe89fe`.
- Combat-effect denominator remains `2bffb9ec79f6439385b72ca1ccbc679e3ff5d843cf0d00fa15365df222b5188b`.
- Focused Slice 41: `16 / 16`; generic runtime: `10 / 10`; historical Slice 40: `16 / 16`.
- Ticket 11 foundation: `103` base reports / `1,034` assertions; with aggregate, `104 / 1,042`; zero failures.
- Platform `verify:all`: green across Authority, room, HTTP, Kerrigan roles, direct Provider, worldbook, translation/localization and offline Skill safety arms.
- Project: `10 / 22` Tickets complete; Ticket 11 remains active.

## ctx2skill and Harness loop record

- `ctx2skillLoopUsed=true`
- `targetGames=[starcraft-tmg]`
- `roleRoutes=[rule_skill_builder, referee, opponent]`
- `skillsRead=[]`
- `skillsGenerated=[]`
- `judgeTestsRun=[buff_value_characteristic_addition, stimpack_before_move_ten_inch_parameter_domain, over_ten_collision_engagement_and_stale_domain_reject, post_move_ranged_precision_and_cleanup_compatibility, both_seats_authority_replay_and_tamper_reject, slice40_cross_time_replay]`
- `crossTimeReplayResult=slice40_stimpack_hold_and_slice41_stimpack_move_replays_passed`
- `promotions=[]`
- `blocks=[no-skill-generation-or-promotion-in-rule-executor-slice, close-combat-precision-consumer-remains-review-required, stimpack-eligible-base-move-without-using-the-ability-remains-review-required, remaining-speed-consumers-remain-review-required, remaining-491-actionable-rule-atoms-not-executable]`
- `remainingRuleGaps=491`
- `harnessLoopUsed=true`
- `promptPackRoutes=[referee_prompt, opponent_prompt]`
- `harnessToolsCalled=[list_legal_actions, preview_action, apply_action_after_user_confirmation, replay_room]`
- `uiTraceEvidence=[stimpack-move-domain-shows-printed-seven-buff-three-effective-ten, ability-payment-non-lethal-status-and-move-resolve-in-source-order]`
- `agentDecisionEvidence=[agent-can-only-select-a-path-instantiated-by-the-rules-owned-domain, harness-cannot-add-a-speed-modifier-or-insert-an-active-mid-move]`
- `memoryTraceEvidence=no-memory-write-or-promotion-attempted`
- `trainingTraceCandidates=[]`
- `rollbackOrDemotionRules=[official-marine-or-parts-8-10-11-drift-demotes-slice-41, path-domain-source-order-compatibility-authority-or-replay-failure-demotes-slice-41]`
- `userVisibleChecks=[player-sees-a-ten-inch-domain-after-electing-to-use-stimpack-before-move, player-sees-one-cp-payment-and-two-non-lethal-damage-before-movement, paths-beyond-ten-inches-or-through-an-enemy-are-rejected]`

DSH was not run because this is a rule-executor slice and DSH is authorized only for offline Skill generation. No Skill, MuZero, memory or training candidate was generated or promoted. `rulesEligible=false`, `productionRoomEligible=false` and `trainingTruth=false` remain mandatory.
