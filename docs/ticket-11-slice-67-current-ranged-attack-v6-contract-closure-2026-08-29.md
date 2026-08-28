# Ticket 11 Slice 67 — Current Ranged Attack v6 Contract Closure

Started and frozen: 2026-08-29

## Outcome

Slice 67 closes the existing `authority.ranged-attack-v6@6.0.0` state contract. It adds no RuleAtom, changes no RuleAtom disposition or version, changes no executor source, and keeps the Slice 66 catalogue and runtime byte-identical.

The closure covers the executor's complete delegated surface rather than only its native Commando Rifle branch:

- native empty-upgrade Jim Raynor Commando Rifle against Marine;
- selected C-14 replacement and Burst Fire through frozen v5;
- every proven v1-v4 ranged subset recursively delegated by v5;
- exact current action identity even when execution uses a frozen semantic delegate.

## Declared atomic state boundary

LegalSpace reads the current round, Assault phase and active seat; pass and phase-first-actor state; official gameplay/profile/loadout data; piece/model presence, bases, positions, status, effects, damage, Supply and activation; board line-of-sight and engagement material; and current history/log context. Every relevant read invalidates an old exact action.

Apply may write only:

- target Damage Marker, model/Unit casualty and the resulting current model/Supply fields;
- acting Unit Assault activation;
- active-side handoff;
- the atomic ranged event and log.

Scores, mission markers, tokens, generic markers, official source/data bindings, RoundSupplyState, SupplyLossLedger, round lifecycle history and terminal fields are forbidden writes. Removing one required event-to-write edge makes the relationship audit fail.

## Latest official data and public seams

The official endpoint was refreshed during closure and remained:

- Firestore versions: `71/69/48`
- source snapshot: `c737db613fbba1c917348c98f00e1cb856650ae9bbbaec1093145fe0fae62a61`
- dataset: `38f89f3a383555627d131dc11fbba53f5b6918b604d25eaa87198df00a1a8e63`
- Raynor/Marine gameplay bundle: `d149c151be6d8680a6f4d07ae8c8b7b6f191f27d19c2d9ddf27beaf5e53024c3`
- repository fallback: `false`

Current latest-data tests cover direct enumeration/Apply, stale-action rejection, the native Commando path, selected C-14 delegation, unified Runtime LegalSpace/Apply, Authority Preview → Confirm → Apply, content hashes, Ed25519 long-term signatures, replay after HMAC short-seal rotation and signature rejection after event tampering.

Historical-rules display is an exact replay dependency. A deliberately incomplete display was quarantined with `HISTORICAL_RULES_DISPLAY_MISSING`; the test was fixed by supplying the exact frozen artifact, not by enabling compatibility.

## Coverage movement

Fixed denominators:

- executable RuleAtoms: `421`
- review-required actionable RuleAtoms: `491`
- display-only RuleAtoms: `114`
- executors: `42`

Coverage movement:

- declared executor contracts: `30 → 31`
- missing executor contracts: `12 → 11`
- strict-complete atoms: `265 → 288`
- partial atoms: `40 → 79`
- no-contract atoms: `116 → 54`
- existing non-strict atoms: `156 → 133`

The increase in partial atoms is expected: many ranged atoms are shared with still-open ranged/ability consumers. Closing v6 removes all 62 of its previously uncovered atom consumptions, but an atom becomes strict only when every current consumer has a declared contract.

## Frozen identities and evidence

- slice: `17733ad254b5c934673c137966a24e18ddaf7ac679a4754bffb8fb25a2c42c07`
- previous slice: `7d0fcef7965258264378de98b0bb1820be94638700b55975fa69ed8a440e210b`
- catalogue: `43b6f2f3ff71598e0c797e0e51157ec01cb5b110dbc340f417c1c805b747679b`
- runtime: `dfd340291dc958a0c9600fbe20c6a70a3e0cd21d2a4902f29197c92848280d41`
- relationship graph: `306ec6a496ff0201f13a155e02872c0305b726853e59e92c7364421b30f7f363`
- graph: `7,866` nodes / `25,020` edges / `30` scopes
- action schema: `hybrid_legal_space_v24`
- official online source: `10/10`
- focused closure: `6/6`
- current Runtime/manifest: `10/10`
- cumulative ledger: `9/9`
- evidence denominator: `129` base reports / `1,334` assertions; with aggregate `130 / 1,343`

Primary report:

`build/ticket-11-rule-atoms-v1/official-existing-ranged-attack-v6-contract-closure-v1-report.json`

## Boundaries and remaining work

No Skill was generated or promoted, DSH was not run, and no MuZero, self-play, memory or training candidate was written. `rulesEligible`, `productionRoomEligible` and `trainingTruth` remain false.

Eleven executor contracts and `133` existing non-strict atoms remain. The open contracts are Academy Medic, Shielded ranged, Goliath Scatter, Marine Stimpack Active, Medic Life Support, Medic Restoration, Optical Flare, Sidearm/Pinpoint, Specialist Loadout, Specialist ranged and Stimpack ranged.

Charge and new RuleAtoms remain frozen until all `42/42` executor contracts and all `421/421` existing executable atoms are strict.
