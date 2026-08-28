# Ticket 11 Slice 33 — Sidearm and Pinpoint

Date: 2026-08-26  
Status: frozen after live-source, focused, runtime, Authority/replay, foundation and platform gates pass

## Outcome

Slice 33 promotes the current official Goliath's `SIDEARM` and `PINPOINT` rules as composable authorities rather than unit-specific conditionals. A Goliath with `Haywire Missiles` selected has this exact Assault loadout:

- `Autocannon`: ordinary weapon, Range 12, RoA 9, Hit 4+, Damage 1;
- `Underbelly Machine Gun`: `SIDEARM, PINPOINT`, Range 8, RoA 6, Hit 3+, Damage 1;
- `Haywire Missiles`: `SIDEARM`, Range 12, RoA 3, Hit 3+, Damage 1, replacing Hellfire Missiles.

LegalSpace exposes every non-empty subset of those three profiles: one selected weapon, either two-profile Sidearm combination, or all three profiles. This gives seven declaration subsets. At most one ordinary weapon may be selected, while any equipped Sidearms may be added. Every selected profile resolves as its own batch and chooses its own legal target. A single-profile declaration completes immediately; a multi-profile declaration creates a hash-bound pending sequence, retains the active side, and exposes only its exact remaining profiles until the final batch settles the Assault activation.

`PINPOINT` is separately authorized only for the Underbelly Machine Gun. The bounded fixture proves an unengaged Goliath can target an enemy Marine that is engaged with an allied Marine. Autocannon and Haywire cannot claim that exception and instead target the two unengaged enemy Goliaths in ordinary range. This separates the target exception from Sidearm's weapon-count and batch rules.

## Live official evidence

- Firestore versions remain `units=71 / cards=69 / rules=48`; canonical document SHA-256 `35b3c26bb9c82bce1efba3e48697b41e512b0be7d7e4bacb9452d224fd62c733`.
- Goliath document SHA-256: `d11236a23f30fe101958d6af919d34f57796dff51409247006d7639bf2b7a8cc`.
- Marine document SHA-256: `32061705b67ab074c6aa755dc527f6d0db0e4fc2d7cb2fa95d7b288f35cf79f1`.
- Part 8 / Part 11 document hashes: `35df7670c92d7402ef22333184f267a66cf155808b3bcaa333340932b19bf55b` / `35bf7492bae59a5f30c51dc94c23295b231b908b667a2a44e7c5e317ac2e045c`.
- Latest gameplay snapshot / normalized dataset: `2407d2536278776692c9116cb74c4147e15f2aa6ff9af9204141e5620220bd78` / `40ba72534a2165131288ec77ccf67984baf5f740e58c4f94283b46137a54757a`.
- Exact Goliath+Marine gameplay bundle: `31369902352d6459c723e880a50e4b5a23eed695a6feef38406e11141263cb21`.
- Autocannon v1/v2 profile hashes: `3be2ef5234bccb909d9119fc83130718770de31a5f7cf0348e9a573512ea8ce3` / `67012ccc1b3896877521a87d8533435c698fd448e0b0c6685d26fca63e65634e`.
- Underbelly v1/v2 profile hashes: `c7574f07ba693d5c032d05f4cebd67cd665c62f390ce8557582bada9690b745e` / `ff152c91ff0190c047072d14888fc912fc057071ac4a4d0d38c710c390cfc3f9`.
- Haywire v1/v2 profile hashes: `af5701e1dfac62a58972ede948f7ac9bd7001214ba4ad1caf5a69b4b9b1a94e4` / `88fd9cec9593fdad96f676eb400305e4f6e28434368dcc7a9ccca588ded877b2`.
- Core Rules / Terran P2P PDF hashes: `27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54` / `afa3f229db61444d0673dea35e31772530a4c39dadaa0e281ba1bae0d271109c`.
- Repository fallback is forbidden.

## Atomic contracts

Promoted RuleAtoms:

- `rule-atom:singleton:core-11-multiple-sidearm-use:0670eabc2b38`
- `rule-atom:singleton:core-11-pinpoint-engaged-ranged-targeting:593cfa7216ad`
- `rule-atom:singleton:core-11-sidearm-independent-target:957dee96b667`
- `rule-atom:singleton:core-11-sidearm-separate-batches:124944751bb7`
- `rule-atom:singleton:core-11-sidearm-weapon-limit-override:318ae45fc7f8`
- `rule-atom:singleton:core-8-7-3-sidearm-batch:0a1cbea3fa89`

`authority.sidearm-pinpoint-effect-kernel-v1@1.0.0` owns profile selection and the Pinpoint target exception. `authority.sidearm-pinpoint-ranged-batch-v1@1.0.0` owns the finite seven-subset declaration space, Chance allocation, target-specific resolution and one/two/three-batch state machine. Profile data cannot create either handler, exceed the one ordinary weapon limit, or attach Pinpoint to another weapon.

The combat-effect denominator advances from `14 / 10 / 4` to `14 registered / 12 executable / 2 known-unimplemented`. The remaining effect atoms are `Indirect Fire` and `Locked In`.

## Authority and Harness contract

The action projection advances only for runtimes containing the new executor:

- Slice 33 uses `hybrid_legal_space_v3`, adding `selectedBatchProfileKeys` and `sidearmUseMode` to the frozen action identity;
- Slice 32 remains on `hybrid_legal_space_v2` and Slice 31 or earlier remain on v1;
- a pending Sidearm sequence excludes Hold, pass, unrelated actions and any undeclared profile;
- Preview, explicit Confirm, Apply and Replay preserve the exact declared subset and batch order;
- accepted receipts use Ed25519 for long-lived verification, remain replayable after HMAC secret rotation, and reject event or pending-sequence tampering;
- historical rules display remains content-hash frozen and missing content is quarantined instead of silently reconstructed.

This is real Harness tool-contract evidence, not full Harness completion. It proves model-visible finite LegalSpace, Preview/Confirm/Apply and Replay for this rules family. UI behavior, player-view redaction, agent quality evaluation, memory promotion, self-play and MuZero lineage remain separate gates.

## Frozen identities and counts

- Slice: `6bdaab04298bd7d3345ccc35161f1d2230c778a08ce91fa789d77281813a89dc`.
- Catalogue: `95b9bb51ca3dc18c03367ff789976fa64f8453be9cfe4db0cfa652876582d023`.
- Runtime: `ad6ede455d3da1ad0532361d96810325934025ab3ba2ee31f77f7438dc5bc794`.
- Combat-effect denominator: `080df4f5f8d065a5be79a21901003c65424d990bd9508a230c39317c2b402307`.
- RuleAtoms: `343 / 912` executable (`37.6%`), `569` review-required and `114` display-only.
- Frozen vertical slices: `33`.
- Planning-only forecast: about `55` further slices; the authoritative remaining denominator is `569` atoms.
- Ticket progress: Ticket 11 remains active; the project remains `10 / 22` tickets complete.

## Evidence gates

- Slice 33 live-source, effect, seven-subset LegalSpace, batch lifecycle, Authority and replay verifier: `12 / 12`.
- Generic executable runtime: `10 / 10`.
- Ticket 11 foundation gate: `95` base reports / `922` base assertions; with aggregate `96 / 930`.
- Platform `verify:all`: green across Authority, room, HTTP, Kerrigan, Provider, worldbook, translation/localization and offline Skill safety arms.
- `rulesEligible=false`, `productionRoomEligible=false` and `trainingTruth=false` remain mandatory while `569` actionable RuleAtoms are open.

The ctx2skill and Harness loops observed the `rule_skill_builder`, `referee` and `opponent` routes and their LegalSpace/Preview/confirmed Apply/Replay evidence. This slice generated and promoted no Skill, did not run DSH, and wrote no MuZero, memory or training candidate.
