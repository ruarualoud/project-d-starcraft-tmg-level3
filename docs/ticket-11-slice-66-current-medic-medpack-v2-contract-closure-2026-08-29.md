# Ticket 11 Slice 66 — Current Medic Medpack v2 Contract Closure

Started: 2026-08-28

Frozen: 2026-08-29

## Outcome

Slice 66 closes the existing Medic Medpack executor contract against the latest official data. It adds no RuleAtom, does not promote Charge and keeps the executable denominator at `421`.

The current room could not reach Medpack by registering one isolated executor: Start v4 rejected Medic loadouts and the current Movement chain only understood the Marine-only projection. The slice therefore migrates `93` existing atoms as one exact dependency closure: Start of Round (`13`), Reserve Deploy (`30`), Standard Move (`10`), Disengage (`10`), Stimpack Move (`1`) and Medpack (`29`). The first `64` are compatibility-only current-version migrations; exactly the `29` Medpack atoms gain strict coverage.

## TDD defects closed

The RED evidence found five concrete gaps:

1. Start v4 rejected the latest official Medic/Medpack loadout.
2. The frozen Movement kernels could not consume the new two-profile state without an explicit adapter.
3. An early adapter changed Medic Supply and made the global `RoundSupplyState` stale.
4. Runtime mutual-exclusion logic hid current Medpack merely because the historical Academy aggregate executor was enabled.
5. Authority canonicalization omitted `authorityLineageHash`, so a freshly enumerated Medpack action failed exact Apply matching.

The GREEN implementation introduces Start v5, Movement lineage/adapter v3/v2, Reserve/Standard/Disengage v5, Stimpack Move v3 and native Medpack v2. The adapter now preserves all current Supply values and restores exact Marine/Medic identities, hashes and loadouts. Authority action schema v24 carries the lineage hash as canonical action material.

## Medpack exact subset

`authority.medic-medpack-active-v2@2.0.0` exposes only the two official Movement windows immediately before or after the acting Medic's Hold action. It requires:

- a live current Medic with exact selected `Medpack` and no prior use this round;
- another friendly live Biological Unit within four inches and direct line of sight;
- one available Command Point on ready Terran Armed Forces;
- exact Start v5, Movement, MatchBinding, source/data and actor/target lineage;
- a fresh server-enumerated action including `authorityLineageHash`.

Apply atomically spends one Command Point, exhausts Terran Armed Forces, heals the exact permitted amount, activates the Medic through Hold and records ability/history evidence. It cannot return destroyed models, restore lost Shielded status, mutate Supply or mutate the Supply-loss ledger. Academy reduction remains a separate open reaction contract and is not inferred by compatibility code.

## Strict history policy

The replaced current identities are retained as historical dependencies:

- `authority.start-of-round-v4@4.0.0`
- `authority.reserve-deploy-v4@4.0.0`
- `authority.standard-move-v4@4.0.0`
- `authority.disengage-v4@4.0.0`
- `authority.stimpack-move-consumer-v2@2.0.0`
- `authority.medic-medpack-active-v1@1.0.0`

Their source, catalogue/runtime lineage, replay and old-rules display remain frozen and queryable. Current catalogues expose only the v5/v3/v2 replacements. Mixed identities, missing exact dependencies or source drift fail closed; `silentCompatibilityAllowed=false`.

## Coverage movement

Fixed denominators:

- executable RuleAtoms: `421`
- review-required actionable RuleAtoms: `491`
- display-only RuleAtoms: `114`
- executors: `42`

Coverage movement:

- declared executor contracts: `29 → 30`
- missing executor contracts: `13 → 12`
- strict-complete atoms: `236 → 265`
- partial atoms: `57 → 40`
- no-contract atoms: `128 → 116`
- existing non-strict atoms: `185 → 156`

## Frozen identities

- slice: `7d0fcef7965258264378de98b0bb1820be94638700b55975fa69ed8a440e210b`
- previous slice: `4f92a8afde13bf27cbe8a32c3df1cfd1c02d4b1ca1894969a55eb7722c360b35`
- catalogue: `43b6f2f3ff71598e0c797e0e51157ec01cb5b110dbc340f417c1c805b747679b`
- runtime: `dfd340291dc958a0c9600fbe20c6a70a3e0cd21d2a4902f29197c92848280d41`
- relationship graph: `488194f777c1b6c00b601b02d07a7aa28c11537bd4535266e465ee687562d23f`
- graph size: `7,847` nodes / `24,939` edges
- coverage scopes: `29`
- action schema: `hybrid_legal_space_v24`

## Official data and verification

- live official source snapshot: `c737db613fbba1c917348c98f00e1cb856650ae9bbbaec1093145fe0fae62a61`
- official gameplay dataset: `38f89f3a383555627d131dc11fbba53f5b6918b604d25eaa87198df00a1a8e63`
- current Medic/Marine gameplay bundle: `f530568fbb6118bc2921fe13d807dbe8bb095e42efb5faf33d8f3d9806177459`
- Medic source/payload: `1a673c3081628d422bf7d38ad3db7c92a7e43f0e305e1f8eb610ec9c748dc203` / `5ef39b4365da4f36cb5b939aea1290f645f368f730a149693ad3afa4e4b678ba`
- Marine source/payload: `682a2ea237c32dc25cc7c389c3b949705326bba6c416085c39dda2388dd3f215` / `33cbc0b9e9e17ca95f1cd639f78d81e8ec7606f035642e32fdf7064bcc49d1e6`
- Terran Armed Forces source: `44aa8b4d52a065dbbc5e93a9bfc203957647393efe4c123e1a0b2b909dbf63c5`
- Firestore versions: `71/69/48`
- repository fallback: `false`
- Medpack public runtime/Authority/replay contract: passed
- Slice source/current/history/official-data closure: `6/6`
- cumulative current runtime: `10/10`
- Ticket 11 cumulative ledger: `9/9`
- evidence denominator: `128` base reports / `1,328` base assertions; including aggregate, `129` reports / `1,337` assertions

The Authority proof covers direct LegalSpace/Apply and Preview → Confirm → Apply → Replay, content hashes, Ed25519 long-term signatures, replay after HMAC short-term seal rotation and tamper rejection.

Primary report:

`build/ticket-11-rule-atoms-v1/official-existing-medic-medpack-v2-contract-closure-v1-report.json`

## Boundaries and next dependency

No Skill was generated or promoted, DSH was not run, and no MuZero, self-play, memory or training candidate was written. `rulesEligible`, `productionRoomEligible` and `trainingTruth` remain false.

Twelve executor contracts and `156` existing non-strict atoms remain. Slice 67 will be selected from the current graph by dependency and impact; this document does not predeclare which contract moves or count it complete.

Charge and new RuleAtoms remain frozen until all `42/42` executor contracts and all `421/421` existing executable atoms are strict.
