# Ticket 11 Slice 49 — Marine Multi-Enemy Stimpack Precision and Casualty

Date: 2026-08-26

## Outcome

Slice 49 closes one composition gap found by the frozen Rule Relationship Graph. The prior catalogue already contained executable atoms for Marine Stimpack, Hit, Precision, multi-model casualty priority, and specific enemy-Unit engagement preservation, but Authority could not compose them for an exact three-Unit state where a Stimpacked Marine and a clean allied Marine both engage the same target.

This is deliberately a zero-atom composition Slice. It adds one executor and one declared state contract while leaving the frozen RuleAtom denominator unchanged at `421/912` actionable atoms executable, `491` remaining, and `114` display-only.

## Executable seam

The new Rules-owned transition is:

1. the selected Stimpacked Marine declares `Fight`;
2. Chance is committed and the attacking player chooses the empty set or any failed-Hit-die subset up to Precision 3;
3. the resulting Damage Pool opens a defender-owned casualty choice when more than one legal ordered selection exists;
4. settlement updates the target model ledger, destroyed ledger, Supply, residual damage, and current Engagement Graph;
5. only the selected attacker receives Combat activation; the co-engager remains unactivated.

The denominator binds exactly three current Marine Units. The selected-attacker pair carries the real Stimpack status, effect marker, and ability-use history. The co-engager pair is an independently projected clean state and cannot inherit the selected Unit's Stimpack material or contribute dice to its attack pool. Strike plus Stimpack and Bayonet plus Stimpack are both executable; more than two enemy Units and non-Marine profiles remain fail-closed.

## Relationship graph gate

Every Slice 49 source, domain, state, executor, test, and release identity was appended to the prior frozen graph. The new scope includes required paths for:

- official Stimpack Precision source to the three-stage Judge test;
- co-engager ledger to the clean-pair isolation test;
- attacking Precision selection to defender casualty pending state;
- model geometry to stale-domain rejection;
- casualty resolution to Authority v17 signed replay.

Deleting the Precision-resolution-to-casualty-domain edge and the three-stage Judge edge makes the graph invalid with both required-edge and required-path gaps. The graph is derived audit evidence, not a second Rules authority.

Frozen graph identity:

- graph hash: `23168b8a038438cf68c34d0510c950e86519473049fe58ad18ddb245de06953d`
- nodes: `5,195`
- edges: `20,413`
- executors: `42`
- declared state-contract executors: `9`
- state-contract debt: `33`
- blocking gaps: `0`

## Authority and replay

Only Slice 49 uses `hybrid_legal_space_v17`. Both attacker-seat orientations pass `LegalSpace → Preview → Confirm → Apply` across three receipts: Fight, attacking Precision, and defending casualty. Ed25519 signatures replay after HMAC seal rotation; journal tampering is rejected. Historical Slice 48 remains frozen under v16, and old rules display is retained.

## Official data and evidence

Live Command Center documents were revalidated as units `71`, cards `69`, and rules `48`; repository fallback was forbidden and unused.

Frozen identities:

- slice: `03daff75c35c1686074cec94a070554385d3f2a27ad55aa9c696305ad0179b45`
- catalogue: `cf0c60b4faa04674727273cadc8fa1fbca158cabce3d85825d0417928abb0d7e`
- runtime: `3a9684030e8020bffbcac80c6238804f673c98b695b49286481662fc5e01749a`
- denominator: `dc797199d65fecb7be68f85ce3ce249aa11415fadcb60f6ccdf3fdd8444a5f26`

Verification:

- focused Slice 49: `13/13`
- cumulative runtime gate: `10/10`
- complete historical runtime chain: pass
- Ticket 11 foundations: `111` base reports / `1,145` assertions; aggregate `112` / `1,154`
- `verify:all`: pass
- `git diff --check`: required before handoff

## Boundaries and next work

This Slice generated or promoted no Skill, did not run DSH, and wrote no memory, self-play, MuZero, or training candidate. `rulesEligible`, `productionRoomEligible`, and `trainingTruth` remain false.

Because this composition Slice changed no atom disposition, the rolling arithmetic forecast becomes about `58` further planning Slices. Slice 50 must return to a non-zero RuleAtom promotion cluster selected from the `491` remaining actionable atoms; another zero-atom composition Slice requires a newly demonstrated blocking interaction, not convenience.

Update 2026-08-28: the final sentence above records the plan at Slice 49 freeze
time and is superseded by the user's stricter completion definition. Slice 50
therefore starts the explicit state-contract/Judge/replay closure of the existing
421 executable atoms before any new RuleAtom promotion.
