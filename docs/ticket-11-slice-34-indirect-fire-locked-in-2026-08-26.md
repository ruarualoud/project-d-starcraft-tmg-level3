# Ticket 11 Slice 34 — Indirect Fire, Locked In and bounded full-cover LoS

Date: 2026-08-26  
Status: frozen after live-source, focused, runtime, Authority/replay, foundation and platform gates pass

## Outcome

Slice 34 closes the bounded combat-effect registry by promoting `INDIRECT FIRE` and `LOCKED IN (6)` as independent EffectAtom handlers, then composing them with the current official Goliath `Scatter Missiles` loadout. This is not a claim that the complete rules engine is finished: the combat-effect registry is `14 / 14` only inside explicitly proved subsets, while the global actionable RuleAtom denominator is `355 / 912`.

The selected official replacement produces this exact Assault loadout:

- `Autocannon`: ordinary weapon;
- `Underbelly Machine Gun`: `SIDEARM, PINPOINT`;
- `Scatter Missiles`: `SIDEARM, INDIRECT FIRE, LOCKED IN (6), LONG RANGE (24\"), SURGE Light (D3)`, Range 18, RoA 6, Hit 5+, Damage 1.

The existing Sidearm authority continues to expose all seven non-empty profile subsets and permits at most one ordinary weapon. Every profile remains an independently targeted batch. `Scatter Missiles` may ignore one positively proved full-cover LoS barrier while remaining range-bound. If it attacks through that barrier, the target may Evade after Armour and before Damage. A target with `Stationary` adds six effective RoA without mutating the printed RoA: the bounded proof therefore uses effective RoA 12 against the stationary Marine and RoA 6 against the moved Marine.

## Live official evidence

- Firestore versions remain `units=71 / cards=69 / rules=48`; canonical versions SHA-256 `35b3c26bb9c82bce1efba3e48697b41e512b0be7d7e4bacb9452d224fd62c733`.
- Goliath document SHA-256: `d11236a23f30fe101958d6af919d34f57796dff51409247006d7639bf2b7a8cc`.
- Marine document SHA-256: `32061705b67ab074c6aa755dc527f6d0db0e4fc2d7cb2fa95d7b288f35cf79f1`.
- Part 8 / Part 11 document hashes: `35df7670c92d7402ef22333184f267a66cf155808b3bcaa333340932b19bf55b` / `35bf7492bae59a5f30b51dc94c23295b231b908b667a2a44e7c5e317ac2e045c`.
- Latest gameplay snapshot / normalized dataset: `2407d2536278776692c9116cb74c4147e15f2aa6ff9af9204141e5620220bd78` / `40ba72534a2165131288ec77ccf67984baf5f740e58c4f94283b46137a54757a`.
- Scatter v1/v2 profile hashes: `af871c574958994688cc7e7751ac0fce2d0a09123944f06480511dea0d24f544` / `4ce889bb487e7c2d56c2bdeb379f4842382c06e22478795e4764254063690859`.
- Scatter source-text hash: `72a2365b85e45f500d03ba34d58800b9f01bbbff1b242f1e96b4f973d95b1bf8`.
- Exact selected Scatter loadout hash: `676e790bcda71a07bbc345e0636360554a46afd15931e0e167d94992538ebe48`.
- Core Rules / Terran P2P PDF hashes: `27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54` / `afa3f229db61444d0673dea35e31772530a4c39dadaa0e281ba1bae0d271109c`.
- Repository fallback is forbidden.

## Atomic contracts

Promoted RuleAtoms:

- `rule-atom:blocking-terrain-effective-size-definition`
- `rule-atom:ground-level-effective-size`
- `rule-atom:line-of-sight-terrain-footprint`
- `rule-atom:singleton:core-11-blocking-terrain-los:3ef61a869b06`
- `rule-atom:singleton:core-11-effective-size-cover-use:948da3cf0267`
- `rule-atom:singleton:core-11-indirect-fire-los-ignore:06c39713e53e`
- `rule-atom:singleton:core-11-indirect-fire-off-los-evade:8de63a970f7f`
- `rule-atom:singleton:core-11-indirect-fire-range:5f12a92319c7`
- `rule-atom:singleton:core-11-line-of-sight-blocking-terrain-assessment:b463c5133c26`
- `rule-atom:singleton:core-11-line-of-sight-full-cover:d5f5cc2c3ae1`
- `rule-atom:singleton:core-11-locked-in-stationary-roa:615deb544566`
- `rule-atom:singleton:core-5-1-size:181a08680a53`

The already executable `stationary-start-round-grant` and `core-11-stationary-movement-loss` atoms are explicit lifecycle dependencies rather than silently duplicated logic.

`authority.bounded-full-cover-los-kernel-v1@1.0.0` owns one deliberately narrow geometry family: ground-level round bases and exactly one axis-aligned, rectangular full-cover terrain footprint. A clear centre trace proves visibility. Blocked LoS requires a complete base-to-base barrier plus sufficient effective size; partial, ambiguous, multi-terrain and unsupported geometry fail closed.

`authority.indirect-fire-locked-in-effect-kernel-v1@1.0.0` owns profile/loadout selection and effect parameters. `authority.indirect-fire-locked-in-attack-kernel-v1@1.0.0` composes LoS, range band, Stationary, Armour, off-LoS Evade and damage. `authority.goliath-scatter-ranged-batch-v1@1.0.0` owns the finite declaration/target domain and one/two/three-batch pending sequence.

The combat-effect denominator advances from `14 / 12 / 2` to `14 registered / 14 executable bounded subsets / 0 known-unimplemented`. Data still cannot grant execution authority, and unknown or broader interactions remain quarantined and fail closed.

## Authority and Harness contract

Only the Slice 34 runtime advances to `hybrid_legal_space_v4`. It preserves these rule-owned fields in action identity: `lineOfSightStatus`, `indirectFireUsed`, `lockedInAdditionalRateOfAttack`, `effectiveRateOfAttack`, `rangeBand`, `evadeEligibilityReason` and `blockingTerrainId`. Slice 33 stays frozen on v3, Slice 32 on v2 and earlier slices on v1.

The verifier exercises true `LegalSpace -> Preview -> explicit Confirm -> Apply -> Replay` through the Authority boundary. Three accepted receipts retain Ed25519 long-lived verification after HMAC rotation, while action, Chance, LoS and pending-sequence tampering reject. A pending multi-profile attack exposes only the declared unresolved profiles, retains the active seat, and prevents Hold/pass/unrelated actions until settlement.

This proves one Harness behavior path, not full Harness completion. Browser/app device evidence, player-view redaction, production adapters, agent-quality evaluation, memory policy, self-play and MuZero lineage remain separate gates.

## Frozen identities and counts

- Slice: `c3e818e93def152d406a6a5171bb5d588029009e46372a78e925030974522767`.
- Catalogue: `4f97e3b354cdf0a47f9b72083379fa2111a19193900eec401358ef3b801aab7f`.
- Runtime: `a6f1264ecee7adb0ce99d2ff8357d137bc44c14031c2663ed6e1609d31037258`.
- Combat-effect denominator: `2bffb9ec79f6439385b72ca1ccbc679e3ff5d843cf0d00fa15365df222b5188b`.
- RuleAtoms: `355 / 912` executable (`38.9%`), `557` review-required and `114` display-only.
- Frozen vertical slices: `34`.
- Planning-only forecast: about `54` further slices; the authoritative remaining denominator is `557` atoms.
- Ticket progress: Ticket 11 remains active; the project remains `10 / 22` tickets complete.

## Evidence gates

- Slice 34 live source, bounded LoS, effect composition, seven-subset LegalSpace, batch lifecycle, Authority and replay verifier: `13 / 13`.
- Generic executable runtime: `10 / 10`.
- Ticket 11 foundation gate: `96` base reports / `935` base assertions; with aggregate `97 / 943`.
- Platform `verify:all`: green across Authority, room, HTTP, Kerrigan, Provider, worldbook, translation/localization and offline Skill safety arms.
- `rulesEligible=false`, `productionRoomEligible=false` and `trainingTruth=false` remain mandatory while `557` actionable RuleAtoms are open.

The ctx2skill and Harness loops observed the `rule_skill_builder`, `referee` and `opponent` routes and their LegalSpace/Preview/confirmed Apply/Replay evidence. This slice generated and promoted no Skill, did not run DSH, and wrote no MuZero, memory or training candidate.
