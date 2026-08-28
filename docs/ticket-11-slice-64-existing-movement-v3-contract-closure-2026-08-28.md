# Ticket 11 Slice 64 — Current Movement v3 Contract Closure

Started: 2026-08-28

Frozen: 2026-08-28

## Outcome

Slice 64 closes the existing Disengage state contract and coordinates the current Movement authority versions. It adds no RuleAtom and does not promote Charge. The executable denominator remains `421`.

The dependency graph exposed a real cross-executor defect: frozen Start-of-Round v2 did not create `SupplyLossLedger`, while Reserve Deploy v2 and Standard Move v2 accepted only v2 Supply mutation identities. Replacing Disengage alone with v3 would therefore create a mixed-version lineage that later moves could not safely consume. Slice 64 migrates the 63 disjoint atoms owned by Start (`13`), Reserve Deploy (`30`), Standard Move (`10`) and Disengage (`10`) to coordinated v3 identities. Only the ten Disengage atoms gain new strict coverage; the other 53 are compatibility migrations and are not counted as newly completed rules.

## Current authority lineage

`authority.start-of-round-v3@3.0.0` delegates frozen Start v2 semantics, creates an empty runtime-bound `SupplyLossLedger`, and binds it into the exact action, resolution, event, history and state.

The shared current lineage verifier then requires:

1. exact Start v3 action/resolution/event/history and empty ledger baseline;
2. exact Movement Phase Initiative v1 action/event/provenance;
3. a hash-contiguous `RoundSupplyState` chain from Start;
4. only `reserve-deploy-v3` and `disengage-v3` mutation identities;
5. every `supply_loss_recorded` event to bind its v3 action and the causal events preceding ledger insertion;
6. ordered ledger entry hashes to equal the exact current state ledger.

`authority.reserve-deploy-v3@3.0.0` and `authority.standard-move-v3@3.0.0` validate that shared lineage, exact-match fresh v3 domains/actions, then call their byte-frozen v1 geometry/transition semantic kernels through explicit adapters. `authority.disengage-v3@3.0.0` validates the same lineage, delegates frozen v2 casualty feasibility, rebuilds the Supply-loss receipt against the exact v3 action, and exposes placed, ordinary-casualty and leading-failure branches without silent compatibility.

Authority settlement events occur after Supply-loss insertion. The ledger therefore binds the causal event prefix before the first `supply_loss_recorded` event; later phase/activation settlement remains signed in the complete receipt without retroactively changing the casualty cause.

## Strict history policy

The four old current identities remain historical only:

- `authority.start-of-round-v2@2.0.0`
- `authority.reserve-deploy-v2@2.0.0`
- `authority.standard-move-v2@2.0.0`
- `authority.disengage-v2@2.0.0`

Their source hashes are frozen and verified. Historical catalogue/runtime/replay and rules display remain available under exact dependencies. Current catalogues contain only the four v3 replacements; mixed v2/v3 lineages fail closed, and `silentCompatibilityAllowed=false`.

## Coverage movement

Fixed denominators:

- executable RuleAtoms: `421`
- review-required actionable RuleAtoms: `491`
- display-only RuleAtoms: `114`
- executors: `42`

Coverage movement:

- declared executor contracts: `27 → 28`
- missing executor contracts: `15 → 14`
- strict-complete atoms: `226 → 235`
- partial atoms: `57 → 58`
- no-contract atoms: `138 → 128`
- existing non-strict atoms: `195 → 186`

The partial count rises by one because the shared post-Disengage Assault restriction atom is also consumed by the still-open Optical Flare ranged executor. This is the correct multi-consumer graph result, not a regression or denominator drift.

## Frozen identities

- slice: `78b19c6ef0e4565eda951d3a7e955834748a1cdb1b886d8fd4041e75a7ce47f3`
- previous slice: `0ec04b98321c58eaac23bca4b2383090d666e450876cc4e8b2d9cd61408bddea`
- catalogue: `f19484a581bf48ad3aa574aea7ae17f636d37af9a8eecbce6d2485d7bbb62d25`
- runtime: `b08c2b39dddf12f849ceb731107ed785cde813224dd539053317bccb869a3043`
- relationship graph: `37055400db59c426f8bd5fb20fc23a8e416b9ed7804255c3bf1bc7b6e77d731a`
- graph size: `6,820` nodes / `23,101` edges
- coverage scopes: `27`
- action schema: `hybrid_legal_space_v22`

## Verification

- Disengage public contract and frozen-v2 negative evidence: `4/4`
- Supply lineage, downstream consumption, tamper rejection and real Authority replay: `5/5`
- relationship graph and missing-edge negative gate: `5/5`
- Slice source/current/history/official-live-data closure: `5/5`
- cumulative runtime: `10/10`
- Ticket 11 aggregate: `9/9`
- evidence denominator: `126` base reports / `1,316` base assertions; including aggregate, `127` reports / `1,325` assertions
- live official Core, Terran P2P, Marine, GAUNTLET image/record and Firestore versions `71/69/48`: passed
- repository fallback: `false`
- v3 Start→Phase→Disengage receipts use Ed25519; replay succeeds after HMAC seal rotation, and event tampering rejects as `SIGNATURE_INVALID`

Primary report:

`build/ticket-11-rule-atoms-v1/official-existing-movement-v3-contract-closure-v1-report.json`

## Boundaries and next dependency

No Skill was generated or promoted, DSH was not run, and no MuZero, self-play, memory or training candidate was written. `rulesEligible`, `productionRoomEligible` and `trainingTruth` remain false.

Fourteen executor contracts and 186 existing non-strict atoms remain. Slice 65 must be selected from the current relationship graph after the full Slice 64 gate; no future Slice count is frozen by this document.

Charge and new RuleAtoms remain frozen until all `42/42` executor contracts and all `421/421` existing executable atoms are strict.
