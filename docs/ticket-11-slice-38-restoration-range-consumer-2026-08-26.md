# Ticket 11 Slice 38 — Restoration reaction and ranged status consumption

Date: 2026-08-26  
Status: frozen after live-source, focused, runtime, Authority/replay and historical gates pass; full foundation/platform gates are recorded below

## Outcome

Slice 38 promotes four reusable reaction RuleAtoms and closes two previously disconnected paths: Medic `RESTORATION` can react to the exact Optical Flare Debuff, and the surviving Optical Flare status now changes the Marine C-14 ranged LegalSpace and attack resolution. The rules engine remains incomplete: `407 / 912` actionable RuleAtoms are executable (`44.6%`), `505` remain review-required and `114` remain display-only.

The bounded current-official path is:

- resolving Optical Flare on a target opens a separate Restoration Use/Pass decision for an eligible friendly Medic within 4 inches;
- Use pays exactly 1 Command Point, exhausts the selected payment card and immediately removes every exact known Debuff and its marker from the target;
- Pass preserves Optical Flare for its existing Cleanup-owned lifecycle;
- a named reaction may be used only once per source Unit per round, and a reserve Medic cannot react;
- when Optical Flare remains on a Marine, its current C-14 profile changes from Range 12 to effective maximum Range 8 and cannot use Long Range;
- the debuffed C-14 attack is enumerated and executable at 8 inches, but no attack beyond 8 inches enters LegalSpace;
- the ranged consumer delegates hit/damage resolution to the existing official attack kernel instead of creating a second combat authority.

Stale pending hashes, missing payment, reserve or already-used Medics, unknown Debuffs, source drift, action tampering, nested Academy payment and unresolved simultaneous Restoration priority all fail closed.

## Why atoms alone do not complete the rules engine

The `912` denominator measures actionable atomic rule semantics. Reaching `912 / 912` is necessary, but Ticket 11 still requires four separate closure gates:

1. every relevant combination of atoms must have an owned executor path and deterministic timing/priority;
2. LegalSpace must enumerate every supported choice and exclude illegal or unresolved choices without silently guessing;
3. Preview, Apply, Journal and Replay must reproduce the same state transition under frozen data/rules versions;
4. cross-rule interactions, historical versions and unsupported dependencies must pass or fail closed.

Harness delivery is also not a wiring-only task. It must prove seat-scoped observations, explicit confirmation, tool/action lineage, UI-visible receipts, prompt and memory isolation, training-truth admission, and rollback/demotion behavior. Slice 38 validates those contracts for this bounded path; it does not claim the browser/App, Agent, Skill, self-play or MuZero Harness is complete.

## Exact atomic boundary

The four promoted RuleAtoms are:

1. `rule-atom:named-reaction-frequency-per-unit-round`
2. `rule-atom:reaction-ability-use-limits-composite`
3. `rule-atom:reaction-reserve-prohibition`
4. `rule-atom:singleton:core-2-7-3-same-name-reaction-limit:7f4ba1e6653f`

`authority.medic-restoration-reaction-v1@1.0.0` owns trigger binding, 4-inch base-gap measurement, Use/Pass, exact CP payment, per-source/per-round usage, reserve prohibition and immediate removal of known exact Debuffs. The source contract hash is `9fda579bab07ae7527b457391763752046d516cb8f248e93b23d72c2cf4c9d0d`.

`authority.optical-flare-ranged-consumer-v1@1.0.0` owns the typed status-to-ranged-LegalSpace boundary. It binds the current official Marine C-14 profile (`profileHash=a58fc5f16efc1096b4db052ad6fe92206a251e8d38c1bff3a4b02cd37fd802ba`, `sourceHash=2c71545987dc26fcdc1ecdcc7665f2d8255d211b28f98d15914215c66b2c9d33`) and calls the existing attack-resolution kernel for state mutation.

No extra atom is promoted merely because the ranged consumer was connected. Simultaneous Restoration-source priority and Academy-on-Restoration nesting remain review-required rather than being inferred from this example.

## Live official evidence

- Firestore remains `units=71 / cards=69 / rules=48`; versions hash `35b3c26bb9c82bce1efba3e48697b41e512b0be7d7e4bacb9452d224fd62c733`.
- Medic / Marine documents: `35e272e5aa48b372d982991fe6f182a355d9caa90cc3f4630b34320429465e35` / `32061705b67ab074c6aa755dc527f6d0db0e4fc2d7cb2fa95d7b288f35cf79f1`.
- Parts 2 / 10 / 11: `32f1ff544aa558c5b72f242d7c05df659694570f4f8794f6637de2b3181df929` / `3c2ef4d29afbf6dc38b609388dcb663b40e91627eaa29cbe469e6db4cf8d86a1` / `35bf7492bae59a5f30b51dc94c23295b231b908b667a2a44e7c5e317ac2e045c`.
- Latest gameplay snapshot / normalized dataset / exact gameplay bundle: `2407d2536278776692c9116cb74c4147e15f2aa6ff9af9204141e5620220bd78` / `40ba72534a2165131288ec77ccf67984baf5f740e58c4f94283b46137a54757a` / `35cd2e1a7a7cb7575f0525dbf6ff08fa0a5285b5fcf89e6b901976f532f1463b`.
- Core Rules / Terran P2P: `27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54` / `afa3f229db61444d0673dea35e31772530a4c39dadaa0e281ba1bae0d271109c`.
- Repository fallback is forbidden and was not used.

## Authority and Harness contract

Only Slice 38 advances to `hybrid_legal_space_v8`. Action identity retains the Restoration source/target, pending reaction and triggering ability/status hashes, payment cards, printed/effective range and Long Range eligibility. `LegalSpace -> Preview -> explicit Confirm -> Apply -> Replay` covers both reaction branches and the ranged consumer for both player seats. The Ed25519 receipt chain survives HMAC seal rotation; stale action, source/status mutation and receipt tampering reject.

Slice 37 remains byte-identical on `hybrid_legal_space_v7`, and every older schema/runtime and old-rule display remains frozen. The Authority action-field allowlist was extended because otherwise Preview reconstructed a stale Restoration/range action after LegalSpace; the new verifier makes this boundary regression-failing.

Browser/App device rendering, live Kerrigan decisions, prompt/tool evaluation, persistent scoped memory, Skill generation with DSH, self-play and MuZero lineage remain separate Harness work. No current trace is promoted to memory or training truth.

## Frozen identities, counts and evidence

- Slice: `a7857e66c575afe7943202e862f0555054f2cdcb02bddd4a864746ea0e153384`.
- Catalogue: `9f7169d25eface1913c8cfbe6fca8d1557c8e20efe2ae213442e9905348c864a`.
- Runtime: `4260abf38957d9bbcb307171a346d35408778c446905306eefc8404de76edda4`.
- Historical Slice 37 runtime: `27437fb6976ce3d4ead8b2257123f3d61d320e6a52c87bcb165b17add1238673`.
- Combat-effect denominator remains `2bffb9ec79f6439385b72ca1ccbc679e3ff5d843cf0d00fa15365df222b5188b`.
- RuleAtoms: `407 / 912` executable (`44.6%`), `505` review-required, `114` display-only.
- Frozen vertical slices: `38`; planning-only forecast: about `47` further slices.
- Slice verifier: `14 / 14`; generic runtime: `10 / 10`; historical Slice 37: `13 / 13`.
- Ticket 11 foundation: `100` base reports / `987` assertions; with aggregate, `101 / 995`; zero failures.
- Platform `verify:all`: green across Authority, room, HTTP, Kerrigan, Provider, worldbook, translation/localization and offline Skill safety arms.
- Project: `10 / 22` Tickets complete; Ticket 11 remains active.

## ctx2skill and Harness loop record

- `ctx2skillLoopUsed=true`
- `targetGames=[starcraft-tmg]`
- `roleRoutes=[rule_skill_builder, referee, opponent]`
- `skillsRead=[]`
- `skillsGenerated=[]`
- `judgeTestsRun=[restoration_use_and_pass_trigger_window, restoration_exact_cp_payment_and_all_known_debuff_removal, same_name_per_unit_round_ledger_and_reserve_prohibition, marine_c14_optical_flare_range_eight_boundary, unknown_debuff_nested_and_simultaneous_reactions_fail_closed, authority_multistep_replay_and_tamper_reject]`
- `crossTimeReplayResult=slice37_academy_optical_flare_and_slice38_restoration_range_replays_passed`
- `promotions=[]`
- `blocks=[no-skill-generation-or-promotion-in-rule-executor-slice, simultaneous-reaction-priority-remains-review-required, nested-academy-on-restoration-remains-fail-closed, remaining-505-actionable-rule-atoms-not-executable]`
- `remainingRuleGaps=505`
- `harnessLoopUsed=true`
- `promptPackRoutes=[referee_prompt, opponent_prompt]`
- `harnessToolsCalled=[list_legal_actions, preview_action, apply_action_after_user_confirmation, replay_room]`
- `uiTraceEvidence=[separate-restoration-use-or-pass-confirmation, visible-payment-and-status-marker-removal, visible-eight-inch-ranged-boundary]`
- `agentDecisionEvidence=[rules-own-trigger-range-payment-reserve-and-ledger, agent-cannot-invent-long-range-or-beyond-eight-inch-attack]`
- `memoryTraceEvidence=no-memory-write-or-promotion-attempted`
- `trainingTraceCandidates=[]`
- `rollbackOrDemotionRules=[official-source-drift-demotes-slice-38, reaction-range-authority-or-replay-failure-demotes-slice-38]`
- `userVisibleChecks=[use-pays-and-removes-status, pass-preserves-status, C-14-legal-at-eight-and-illegal-beyond-eight, reserve-or-used-Medic-not-offered]`

DSH was not run because it is authorized only for Skill generation. `rulesEligible=false`, `productionRoomEligible=false` and `trainingTruth=false` remain mandatory.
