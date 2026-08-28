# Ticket 11 Slice 65 — Current Movement v4 and Stimpack Move v2 Contract Closure

Started: 2026-08-28

Frozen: 2026-08-28

## Outcome

Slice 65 closes the existing Stimpack Move consumer contract and coordinates the current Movement authority with an official selected-upgrade loadout binding. It adds no RuleAtom, does not promote Charge and keeps the executable denominator at `421`.

The slice migrates `64` disjoint existing atoms: Start of Round (`13`), Reserve Deploy (`30`), Standard Move (`10`), Disengage (`10`) and Stimpack Move (`1`). Only the Stimpack Move atom gains strict coverage; the other `63` atoms are current-version compatibility migrations and are not counted as newly completed rules.

## Current authority lineage

`authority.start-of-round-v4@4.0.0` validates the exact latest official selected-upgrade rows for the bounded Unit set. It accepts only no selected upgrade or exact Marine `Stimpack`, binds the ordered loadout rows and hash into the action, resolution, event, history and state, and delegates the frozen v3 round/supply semantics through a validated adapter.

The current Movement lineage v2 requires:

1. exact Start v4 action/resolution/event/history and current selected-loadout hash;
2. exact Movement Phase Initiative action/event/provenance;
3. a hash-contiguous `RoundSupplyState` and `SupplyLossLedger` chain;
4. only current `reserve-deploy-v4` and `disengage-v4` Supply mutation identities;
5. every Supply-loss event to bind its exact action and causal event prefix;
6. fresh-domain exact matching before every Apply.

`authority.reserve-deploy-v4@4.0.0`, `authority.standard-move-v4@4.0.0` and `authority.disengage-v4@4.0.0` verify that lineage, present an explicit no-upgrade state view to their byte-frozen semantic kernels, and restore the exact hash-bound loadout afterward. This adapter does not silently accept a historical runtime identity.

`authority.stimpack-move-consumer-v2@2.0.0` is a native current executor. Its exact supported state contains two single-model Marines, one acting model with selected Stimpack, a ready Terran Armed Forces card with at least one Command Point, no terrain and no prior Stimpack use. It derives the ten-inch path from official Speed `7` plus Stimpack `3`, then atomically spends one Command Point, exhausts the card, assigns two non-lethal Damage Markers, writes the ability/status markers, moves and activates the Unit. Supply and the Supply-loss ledger are protected writes and remain unchanged.

## Strict history policy

The replaced identities remain historical only:

- `authority.start-of-round-v3@3.0.0`
- `authority.reserve-deploy-v3@3.0.0`
- `authority.standard-move-v3@3.0.0`
- `authority.disengage-v3@3.0.0`
- `authority.stimpack-move-consumer-v1@1.0.0`

Their source hashes, catalogue/runtime lineage, replay and old-rules display remain frozen and queryable. Current catalogues expose only the v4 Movement identities and Stimpack Move v2. Mixed historical/current lineage, missing selected-loadout projection or forged payment fails closed; `silentCompatibilityAllowed=false`.

## Coverage movement

Fixed denominators:

- executable RuleAtoms: `421`
- review-required actionable RuleAtoms: `491`
- display-only RuleAtoms: `114`
- executors: `42`

Coverage movement:

- declared executor contracts: `28 → 29`
- missing executor contracts: `14 → 13`
- strict-complete atoms: `235 → 236`
- partial atoms: `58 → 57`
- no-contract atoms: `128 → 128`
- existing non-strict atoms: `186 → 185`

## Frozen identities

- slice: `4f92a8afde13bf27cbe8a32c3df1cfd1c02d4b1ca1894969a55eb7722c360b35`
- previous slice: `78b19c6ef0e4565eda951d3a7e955834748a1cdb1b886d8fd4041e75a7ce47f3`
- catalogue: `d378ecc5f91753d80251dbf37ecdee1c17cdf3a36c001f9855cbb896d588faa9`
- runtime: `51f3d865c2dde8735a8b6f58248d91207d03370b9ac0f0f04a8786c5e7c31241`
- relationship graph: `1fbbe7c6f361ed9dceefe5d3d59cba25617f17c399e00a671ccb98018c8dbb7a`
- graph size: `7,242` nodes / `23,949` edges
- coverage scopes: `28`
- action schema: `hybrid_legal_space_v23`

## Official data and verification

- live official source snapshot: `c737db613fbba1c917348c98f00e1cb856650ae9bbbaec1093145fe0fae62a61`
- official gameplay dataset: `38f89f3a383555627d131dc11fbba53f5b6918b604d25eaa87198df00a1a8e63`
- official gameplay bundle field: `1e620d2e44804653b2c5d37025c71c17f2daf670f4e76daefa196dc609430ca7`
- Firestore versions: `71/69/48`
- repository fallback: `false`
- live official-source verification: `10/10`
- Stimpack Move public/Authority/replay contract: `10/10`
- relationship graph and missing-edge negative gates: `6/6`
- Slice source/current/history/official-data closure: `6/6`
- cumulative current runtime: `10/10`
- Ticket 11 cumulative ledger: `9/9`
- evidence denominator: `127` base reports / `1,322` base assertions; including aggregate, `128` reports / `1,331` assertions

The Authority proof covers Preview → Confirm → Apply → Replay, content hashes, Ed25519 long-term signatures and replay after HMAC short-term seal rotation. Tampered actions/events/signatures reject before state mutation.

Primary report:

`build/ticket-11-rule-atoms-v1/official-existing-stimpack-move-v2-contract-closure-v1-report.json`

## Boundaries and next dependency

No Skill was generated or promoted, DSH was not run, and no MuZero, self-play, memory or training candidate was written. `rulesEligible`, `productionRoomEligible` and `trainingTruth` remain false.

Thirteen executor contracts and `185` existing non-strict atoms remain. Slice 66 must be selected from the current relationship graph by dependency and impact; no future Slice count is frozen by this document.

Charge and new RuleAtoms remain frozen until all `42/42` executor contracts and all `421/421` existing executable atoms are strict.
