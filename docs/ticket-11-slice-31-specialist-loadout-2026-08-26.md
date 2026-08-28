# Ticket 11 Slice 31 — Marine Specialist Loadout

Date: 2026-08-26  
Status: frozen after live-source, focused, runtime, Authority/replay, foundation and platform gates pass

## Outcome

Slice 31 adds the model-level army-building authority that every later Specialist attack depends on. It promotes exactly four assignment RuleAtoms and deliberately leaves the separate Specialist attack-batch atom unimplemented.

For one current official six- or nine-model Marine unit, the Rules runtime now exposes a finite parameter domain containing the exact selected Specialist weapon profiles and current roster model IDs. The player must nominate one distinct carrier for every selected Specialist upgrade. A successful Preview and explicit human confirmation seal the resulting per-model loadout once.

The bounded examples are:

- `AGG-12` is linked to `C-14 Rifle`, so only its nominated carrier replaces the default `C-14 rifle` with `AGG-12`.
- `Rocket Launcher` is not a replacement, so its nominated carrier retains `C-14 rifle` and adds `Rocket Launcher`.
- all non-carriers retain `C-14 rifle`.
- the same Specialist upgrade cannot be purchased twice, two upgrades cannot share one carrier, and every selected Specialist upgrade must have exactly one known carrier.

## Live official evidence

- [Firestore versions](https://firestore.googleapis.com/v1/projects/starcrafttmgbeta/databases/starcrafttmgbeta/documents/system_metadata/versions): `units=71 / cards=69 / rules=48`, `updateTime=2026-05-26T13:23:51.064119Z`, documented `jq -S -c` capture SHA-256 `35b3c26bb9c82bce1efba3e48697b41e512b0be7d7e4bacb9452d224fd62c733`.
- [Live Marine document](https://firestore.googleapis.com/v1/projects/starcrafttmgbeta/databases/starcrafttmgbeta/documents/army_units/marine): `updateTime=2026-05-15T14:00:22.456608Z`, capture SHA-256 `32061705b67ab074c6aa755dc527f6d0db0e4fc2d7cb2fa95d7b288f35cf79f1`.
- Latest gameplay snapshot: `2407d2536278776692c9116cb74c4147e15f2aa6ff9af9204141e5620220bd78`.
- Latest normalized dataset: `40ba72534a2165131288ec77ccf67984baf5f740e58c4f94283b46137a54757a`.
- Marine source record: `682a2ea237c32dc25cc7c389c3b949705326bba6c416085c39dda2388dd3f215`; payload `33cbc0b9e9e17ca95f1cd639f78d81e8ec7606f035642e32fdf7064bcc49d1e6`.
- [Core Rules PDF](https://starcraft-tmg.com/files/downloads/StarCraft-TMG_EN.pdf): `27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54`.
- [Terran P2P PDF](https://starcraft-tmg.com/files/downloads/StarCraft-Terran-P2P-Card-Sheets-A4_EN.pdf): `afa3f229db61444d0673dea35e31772530a4c39dadaa0e281ba1bae0d271109c`.
- Profile hashes: C-14 `a20160b32f9965e1b23c17b6d0fdbd3995796dedad0277a52fd15bf194cb7229`; AGG-12 `ab0ac32f359ecccf3ae1110c663f475bcff182564d9c138f7c23863bab8ad282`; Rocket Launcher `bf67c07fba458f4cca9487d63befe57dd8b905d97d01f53dcb24f661a49ceef0`.
- Repository fallback is forbidden.

## Atomic contracts

Promoted RuleAtoms:

- `rule-atom:singleton:core-11-specialist-single-weapon-limit:6559885dfc6a`
- `rule-atom:singleton:core-9-1-7-specialist-distinct-assignment:b7eea08d049e`
- `rule-atom:singleton:core-9-1-7-specialist-nomination:2fd9d6fc1e8c`
- `rule-atom:singleton:core-9-1-7-specialist-single-carrier:81a9cd2746ac`

The action also depends on the previously executable Core replacement, upgrade and replacement-effect atoms. Executor `authority.specialist-loadout-v1@1.0.0` owns `configure_specialist_loadout`; parameter kind is `official_specialist_loadout_assignment_v1`.

The following atom remains review-required:

- `rule-atom:singleton:core-9-1-7-specialist-separate-attack-batch:85e56fc370d2`

Consequently `attack-effect:specialist-v1`, Sidearm and Indirect Fire remain closed. This slice grants model ownership and loadout composition only; it does not authorize an attack batch or infer an effect from profile data.

## Authority and replay boundary

- LegalSpace enumerates only current selected Specialist profiles and current model IDs during `army_building`.
- Preview derives the complete model-local loadout and binds it to the official data bundle, attack-profile catalogue and runtime hash.
- Apply verifies the plan again, seals the roster loadout once and appends an authority event.
- duplicate purchases, shared carriers, missing/unknown models, incomplete assignment sets, wrong phases, stale domains, altered actions and official-profile tampering fail closed.
- six- and nine-model Marine squad profiles are both covered.
- accepted receipts use Ed25519 for long-lived verification; replay succeeds after HMAC secret rotation and rejects event tampering.
- Slice 30 runtime and historical rules display remain exact; no silent compatibility path is introduced.

## Frozen identities and counts

- Slice: `08b75feed79463b757da0e6641ac2e44d120746147b0273eef73cd903732c639`.
- Catalogue: `88c0a7ed430cb703b49e2c993b13e13b8f1769a070f5420b1db08269472b7366`.
- Runtime: `fdba261a92b50f35d37b15c727141ff615833dfff0a559993ea1db85f85ee54a`.
- RuleAtoms: `331 / 912` executable (`36.3%`), `581` review-required, `114` display-only.
- Attack effects: `14` registered, `9` executable, `5` known-unimplemented.
- Frozen vertical slices: `31`.
- Planning-only forecast: `55` further slices at the current rolling average; the authoritative remaining denominator is `581` atoms, not the forecast.
- Ticket progress: Ticket 11 remains active; project remains `10 / 22` tickets complete.

## Evidence gates

- Slice 31 live-source / assignment / negative / Authority / replay verifier: `13 / 13`.
- Generic executable runtime: `10 / 10`.
- Ticket 11 foundation gate: `93` base reports / `899` base assertions; with aggregate `94 / 907`.
- Platform `verify:all`: green across Authority, room, HTTP, Kerrigan, Provider, worldbook, translation/localization and offline Skill safety arms.
- No production room eligibility is claimed while `581` actionable RuleAtoms remain.

The ctx2skill loop was used for `starcraft-tmg` rule-skill-builder/referee/opponent boundary checks, and the harness loop observed LegalSpace, Preview, confirmed Apply and Replay. No Skill was generated or promoted, DSH was not run, and no MuZero, memory or training candidate was written. `rulesEligible=false` and `trainingTruth=false` remain mandatory.

## What this means for Harness

This slice completes one real Harness input seam, not the whole Harness. Builder/UI/agent consumers can now use a stable, model-level Specialist assignment domain and replayable result. They still need player-view observation redaction, actual Specialist attack-batch tools, remaining effect handlers, Kerrigan behavior evaluation, memory policy, DSH-only offline Skill gates, MuZero lineage and Web/App device evidence.
