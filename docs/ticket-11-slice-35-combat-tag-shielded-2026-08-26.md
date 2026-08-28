# Ticket 11 Slice 35 — Combat Tags and Shielded lifecycle

Date: 2026-08-26  
Status: frozen after live-source, focused, runtime, Authority/replay, foundation and platform gates pass

## Outcome

Slice 35 promotes Combat Tags and the bounded `SHIELDED X` damage lifecycle as reusable rule authorities. It proves that attack target restrictions, tag-conditional bonuses and Shielded state transitions are rules-owned atomic contracts rather than unit-specific branches. It does not complete the rules engine: `365 / 912` actionable RuleAtoms are executable and `547` remain review-required.

The exact current-official subset contains these attackers and targets:

- Goliath `Autocannon` targets `GROUND`, so it may target Adept and Stalker but not the Flying Point Defense Drone.
- Marine `C-14 rifle` targets `ALL`, so it may target Adept, Stalker or Point Defense Drone.
- Marine Surge `Light (D3)` matches the Light Adept only; it does not match the Armoured Stalker or Point Defense Drone.
- Adept has printed HP 3 plus Shield 2, producing effective first-model HP 5.
- Stalker has printed HP 6 plus Shield 3, producing effective first-model HP 9.
- Damage equal to the Shield value retains Shielded. Total damage strictly exceeding the Shield value loses Shielded but preserves all remaining HP. Removing the first model also ends Shielded and discards only bounded overflow damage.

The wider Heal-restoration rule and execution of abilities that depend on Shielded remain explicitly non-executable because this slice does not yet have a complete current carrier/lifecycle executor for them.

## Live official evidence

- Firestore versions remain `units=71 / cards=69 / rules=48`; canonical versions SHA-256 `35b3c26bb9c82bce1efba3e48697b41e512b0be7d7e4bacb9452d224fd62c733`.
- Goliath / Marine document hashes: `d11236a23f30fe101958d6af919d34f57796dff51409247006d7639bf2b7a8cc` / `32061705b67ab074c6aa755dc527f6d0db0e4fc2d7cb2fa95d7b288f35cf79f1`.
- Adept / Stalker / Point Defense Drone document hashes: `adbd3e08cf9d7c0141cc24d4651c81da8f813dafd087f96a63f9d7df2a0cb7b6` / `1f5ebec5ba1b6d429ef0cb9135daa39afed4b60275051ea7959b923a676603bf` / `db9d0face167edade6f313a1c642a9ea0787fd5100ff557648c9a71274dbcaa4`.
- Part 2 / Part 5 / Part 11 document hashes: `32f1ff544aa558c5b72f242d7c05df659694570f4f8794f6637de2b3181df929` / `cf666f0fb4dba745486c795a16344468683de2ef7a1cfcce9fef37af823db864` / `35bf7492bae59a5f30b51dc94c23295b231b908b667a2a44e7c5e317ac2e045c`.
- Latest gameplay snapshot / normalized dataset / exact gameplay bundle: `2407d2536278776692c9116cb74c4147e15f2aa6ff9af9204141e5620220bd78` / `40ba72534a2165131288ec77ccf67984baf5f740e58c4f94283b46137a54757a` / `14935d15740b639e52d790b83311cf9e8fae0cde1898db6b5a9a0b3e81921bf0`.
- Core Rules / Terran P2P / Protoss P2P PDF hashes: `27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54` / `afa3f229db61444d0673dea35e31772530a4c39dadaa0e281ba1bae0d271109c` / `4e8547b2df8d545df3d0ebb7d7821521a888dc0437d6f4dde21d82145337a212`.
- Repository fallback is forbidden.

## Atomic contracts

Promoted RuleAtoms:

- `rule-atom:combat-tag-definition`
- `rule-atom:combat-tag-targeting-restriction`
- `rule-atom:combat-tag-type-set`
- `rule-atom:singleton:core-11-combat-tag-bonus-eligibility:6866f0c19b55`
- `rule-atom:singleton:core-2-4-2-tag-conditional-bonuses:40ccb120a286`
- `rule-atom:singleton:core-2-4-tag-definition:88f1bcce328a`
- `rule-atom:shield-value-initial-hit-points-and-status`
- `rule-atom:shielded-lifecycle-and-effects`
- `rule-atom:shielded-loss-conditions`
- `rule-atom:singleton:core-11-shielded-loss-preserves-hit-points:03c53e7b4d2e`

Explicitly deferred RuleAtoms:

- `rule-atom:shielded-status-heal-restoration-forbidden`
- `rule-atom:singleton:core-11-shielded-dependent-abilities:03c5e18dd1a9`

`authority.combat-tag-shielded-defense-kernel-v1@1.0.0` owns the seven exact Combat Tags `Armoured / Biological / Light / Mechanical / Psionic / Flying / Ground`, keeps Ground tag distinct from ground-level elevation, authorizes `ALL` or at least one exact tag match, and owns Shielded state validation and damage transitions.

`authority.combat-tag-shielded-ranged-v1@1.0.0` owns the five-action bounded LegalSpace and composes current profile targeting, Surge eligibility, Armour, Shielded effective HP and damage. Profile data cannot invent tags, target authorization or Shielded execution authority. Source, payload, geometry, upgrade, status, action and state-hash drift fail closed.

The combat-effect denominator remains `14 registered / 14 executable bounded subsets / 0 known-unimplemented`. Combat Tags and Shielded are broader RuleAtom/state authorities, not additional attack-profile EffectAtom kinds.

## Authority and Harness contract

Only the Slice 35 runtime advances to `hybrid_legal_space_v5`. It preserves these rule-owned fields in action identity: `targetCombatTags`, `profileTargetTags`, `surgeTagMatched`, `printedHitPoints`, `shieldValue`, `effectiveFirstModelHitPoints`, `shieldedBefore`, `targetAuthorizationHash` and `shieldStateHash`. Slice 34 remains frozen on v4, Slice 33 on v3, Slice 32 on v2 and earlier slices on v1; historical rules display remains available and missing dependencies quarantine rather than silently substitute current logic.

The verifier exercises `LegalSpace -> Preview -> explicit Confirm -> Apply -> Replay` through the Authority boundary. Three accepted receipts replay after HMAC rotation under their long-lived Ed25519 verification. Action, official payload, target-authorization and Shield state tampering fail closed.

This is Harness contract and receipt evidence, not browser/App device completion. Web/App visual traces, player-view redaction, live Agent decisions, memory policy, production adapters, self-play and MuZero lineage remain separate gates.

## Frozen identities and counts

- Slice: `7264c7cf282dfd74416662f9735ba552559a8e4ef503e428f66f6f442fc4cc4c`.
- Catalogue: `43f0064e299b6b03fc99111cfe4dc2ec132cc52ee06bc09f7b9b1dff86ad4b4b`.
- Runtime: `4c72c2953a71db039e0391c2643a2228ba36cfd727cf1b105b6ffacdae20ca93`.
- Combat-effect denominator: `2bffb9ec79f6439385b72ca1ccbc679e3ff5d843cf0d00fa15365df222b5188b`.
- RuleAtoms: `365 / 912` executable (`40.0%`), `547` review-required and `114` display-only.
- Frozen vertical slices: `35`.
- Planning-only forecast: about `53` further slices; the authoritative remaining denominator is `547` atoms.
- Ticket progress: Ticket 11 remains active; the project remains `10 / 22` tickets complete.

## Evidence gates

- Slice 35 current data, tag targeting, Surge, Shielded lifecycle, Authority and replay verifier: `13 / 13`.
- Generic executable runtime: `10 / 10`.
- Ticket 11 foundation gate: `97` base reports / `948` base assertions; with aggregate `98 / 956`.
- Platform `verify:all`: green across Authority, room, HTTP, Kerrigan, Provider, worldbook, translation/localization and offline Skill safety arms.
- `rulesEligible=false`, `productionRoomEligible=false` and `trainingTruth=false` remain mandatory while `547` actionable RuleAtoms are open.

ctx2skill used the `rule_skill_builder`, `referee` and `opponent` routes, ran five named Judge groups and replayed Slice 34 plus Slice 35. It read, generated and promoted no Skill; DSH was not run. Harness used the referee/opponent routes and observed the five legal actions, tag/Surge decisions, Shielded transitions and three-receipt replay, but wrote no memory, MuZero or training candidate.
