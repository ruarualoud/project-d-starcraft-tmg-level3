# Ticket 11 Slice 32 — Specialist Ranged Attack Batches

Date: 2026-08-26  
Status: frozen after live-source, focused, runtime, Authority/replay, foundation and platform gates pass

## Outcome

Slice 32 closes the exact attack-lifecycle subset that Slice 31 deliberately left open. A current official six-model Marine unit with one model carrying `AGG-12` and five models carrying `C-14 rifle` now attacks through two Rules-owned batches. The player may declare either profile first and may choose the same or a different live target for the second batch.

This is an executable state machine, not a UI-only grouping:

- the first declaration creates a hash-bound pending ranged-attack sequence;
- the active side is retained and the Unit is not yet marked as having completed its Assault activation;
- only the remaining profile batch and live legal targets remain in LegalSpace;
- Hold, pass and unrelated actions are rejected while the sequence is pending;
- the second declaration must present the exact pending sequence hash, completes the activation and returns to ordinary phase settlement;
- damage to an already wounded one-model target is capped at its visible remaining HP and excess damage is recorded as discarded overflow.

The exact proof target is two current official one-model Goliaths, each with HP 10 and Armour 4+, on an empty ground-level battlefield with complete engagement geometry, normal range, no terrain, shield, Evade or other attack effects. Rocket Launcher, Sidearm, Indirect Fire, Locked In and Pinpoint are outside this slice.

## Live official evidence

- [Firestore versions](https://firestore.googleapis.com/v1/projects/starcrafttmgbeta/databases/starcrafttmgbeta/documents/system_metadata/versions): `units=71 / cards=69 / rules=48`, `updateTime=2026-05-26T13:23:51.064119Z`, canonical capture SHA-256 `35b3c26bb9c82bce1efba3e48697b41e512b0be7d7e4bacb9452d224fd62c733`.
- [Live Marine document](https://firestore.googleapis.com/v1/projects/starcrafttmgbeta/databases/starcrafttmgbeta/documents/army_units/marine): `updateTime=2026-05-15T14:00:22.456608Z`, canonical capture SHA-256 `32061705b67ab074c6aa755dc527f6d0db0e4fc2d7cb2fa95d7b288f35cf79f1`.
- [Live Goliath document](https://firestore.googleapis.com/v1/projects/starcrafttmgbeta/databases/starcrafttmgbeta/documents/army_units/goliath): `updateTime=2026-03-16T21:23:54.477693Z`, canonical capture SHA-256 `d11236a23f30fe101958d6af919d34f57796dff51409247006d7639bf2b7a8cc`.
- Live Part 8 / Part 9 rule documents: `35df7670c92d7402ef22333184f267a66cf155808b3bcaa333340932b19bf55b` / `0b7f93150a5c915fb1fe52f2b2a276e5eee2f77fa251b3be583de71837bfd2cb`.
- Latest gameplay snapshot: `2407d2536278776692c9116cb74c4147e15f2aa6ff9af9204141e5620220bd78`.
- Latest normalized dataset: `40ba72534a2165131288ec77ccf67984baf5f740e58c4f94283b46137a54757a`.
- Marine source record / payload: `682a2ea237c32dc25cc7c389c3b949705326bba6c416085c39dda2388dd3f215` / `33cbc0b9e9e17ca95f1cd639f78d81e8ec7606f035642e32fdf7064bcc49d1e6`.
- Goliath source record / payload: `e36b38cc46ff9a2fecce9f1fa7bc087923fca2fc29fad2d9f0eead479a68ab16` / `168f9cdc1199f698cc74fe882e98b8d17106a14c7c12acc903be19a3b1bf946d`.
- C-14 v1/v2 profile hashes: `a58fc5f16efc1096b4db052ad6fe92206a251e8d38c1bff3a4b02cd37fd802ba` / `a20160b32f9965e1b23c17b6d0fdbd3995796dedad0277a52fd15bf194cb7229`.
- AGG-12 v1/v2 profile hashes: `408ec53bd4914dab92dc7816e0f21109187e871fec61229f6251745db74db5be` / `ab0ac32f359ecccf3ae1110c663f475bcff182564d9c138f7c23863bab8ad282`.
- [Core Rules PDF](https://starcraft-tmg.com/files/downloads/StarCraft-TMG_EN.pdf): `27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54`.
- [Terran P2P PDF](https://starcraft-tmg.com/files/downloads/StarCraft-Terran-P2P-Card-Sheets-A4_EN.pdf): `afa3f229db61444d0673dea35e31772530a4c39dadaa0e281ba1bae0d271109c`.
- Repository fallback is forbidden.

## Atomic contracts

Promoted RuleAtoms:

- `rule-atom:singleton:core-8-7-3-multiple-profile-batches:fdea86c20962`
- `rule-atom:singleton:core-8-7-3-profile-target-splitting:9e95cfd9a838`
- `rule-atom:singleton:core-8-7-3-sequential-batch-declaration:48523e04ae11`
- `rule-atom:singleton:core-8-7-4-casualty-visible-cap:d235242004ed`
- `rule-atom:singleton:core-8-7-4-discard-nonvisible-overflow:7066cac1175c`
- `rule-atom:singleton:core-9-1-7-specialist-separate-attack-batch:85e56fc370d2`

`authority.specialist-batch-effect-kernel-v1@1.0.0` compiles only the sealed AGG-12 carrier/loadout subset. `authority.specialist-ranged-batch-v1@1.0.0` owns the two-batch declaration, Chance, damage and continuation lifecycle. Profile data cannot invent the Specialist handler, add an unsupported profile or grant Sidearm/Indirect Fire authority.

The combat-effect denominator advances from `14 / 9 / 5` to `14 registered / 10 executable / 4 known-unimplemented`. The remaining effect atoms are Indirect Fire, Locked In, Pinpoint and Sidearm.

## Authority and Harness contract

The first direct Authority integration exposed a real contract gap: the historical action projection retained generic ranged fields but dropped `attackProfileKey`, profile hashes, contributing model IDs and batch-sequence fields. Slice 32 therefore introduces a versioned action projection rather than silently broadening every historical runtime:

- runtimes containing `authority.specialist-ranged-batch-v1` use `hybrid_legal_space_v2`;
- Slice 31 and earlier runtimes remain on the frozen `hybrid_legal_space_v1` contract;
- v2 preserves profile identity, contributors, sequence hash, ordinal, final-batch flag and batch-plan hash through Preview/Confirm/Apply;
- any non-null pending sequence fails closed unless the action is its exact legal continuation.

The Harness can now observe the pending sequence hash, actor Unit and remaining profile keys, but this does not complete the full Harness. Player-view redaction, UI affordances, behavior evaluation, memory policy, Skill promotion, MuZero lineage and device evidence remain separate work.

Accepted receipts use Ed25519 for long-lived verification. Replay succeeds after HMAC secret rotation; altered batch or event data is rejected. Slice 31 runtime and old rules display remain immutable, with no silent compatibility.

## Frozen identities and counts

- Slice: `20b4f2b66597a347e6b7213d8c4fc1c6a3ad59ad136b3c36713925e79ceb4121`.
- Catalogue: `1889bb7d9f2c5f0b7013a056db8fc50f9ef4c2150a4df5204e3b38e54a1c182c`.
- Runtime: `888b4340397e9b504444b0d8094c75b13bb04f50f3766ce325911a5bd893735d`.
- Combat-effect denominator: `931c1cbcd31d0a1cb5d332b4d20113153ff36f215cec8d3ce82a1bf961374b3c`.
- RuleAtoms: `337 / 912` executable (`36.9%`), `575` review-required, `114` display-only.
- Frozen vertical slices: `32`.
- Planning-only forecast: about `55` further slices; the authoritative remaining denominator is `575` atoms.
- Ticket progress: Ticket 11 remains active; the project remains `10 / 22` tickets complete.

## Evidence gates

- Slice 32 live-source, split/same-target, pending-action, Authority and replay verifier: `11 / 11`.
- Generic executable runtime: `10 / 10`.
- Ticket 11 foundation gate: `94` base reports / `910` base assertions; with aggregate `95 / 918`.
- Platform `verify:all`: green across Authority, room, HTTP, Kerrigan, Provider, worldbook, translation/localization and offline Skill safety arms.
- `rulesEligible=false`, `productionRoomEligible=false` and `trainingTruth=false` remain mandatory while `575` actionable RuleAtoms are open.

The ctx2skill and Harness loops observed the rule-skill-builder/referee/opponent LegalSpace, two-step Preview/confirmed Apply and Replay paths. This slice generated and promoted no Skill, did not run DSH, and wrote no MuZero, memory or training candidate.
