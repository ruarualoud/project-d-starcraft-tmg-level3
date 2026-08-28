# Ticket 11 Slice 46 — Marine multi-model Stimpack Close Combat

Date: 2026-08-26  
Status: frozen exact subset; Ticket 11 remains open

## Outcome

Slice 46 promotes two composition executors without changing the frozen RuleAtom catalogue dispositions:

- `authority.marine-multi-model-stimpack-active-v3@3.0.0`
- `authority.marine-multi-model-stimpack-close-combat-v2@2.0.0`

The supported attacker is a current official Marine Unit with an initial six- or nine-model roster and any valid remaining live count. The bounded defender is a current official Marine Unit with exactly one remaining model. Terrain, Access Points, elevation, Flying, multiple enemy Units and broader defender casualty selection remain fail-closed.

## Exact rules composition

The runtime now binds these distinct values instead of collapsing them into one Unit size:

1. initial roster: six or nine models;
2. current live model count: `1..maxModels`;
3. current Supply: models 1–3 = 0, 4–6 = 1, 7–9 = 2;
4. complete roster/live/destroyed model ledger;
5. current Engagement Graph;
6. Fighting Rank and Supporting Rank model IDs;
7. Unit-wide Strike or Bayonet loadout;
8. attack pool: `(Fighting + Supporting) × weapon RoA`;
9. Stimpack status, marker and ability-history chain;
10. committed Hit/Armour dice and the complete Precision choice domain.

Bayonet is not a Specialist. Under current Rules Part 9 it replaces Strike for every model in the Unit. Per-model mixed Strike/Bayonet carrier assignments are rejected.

Ordinary Strike/Bayonet resolves without Precision. A valid Stimpack chain grants Precision 3 to the selected Unit-wide Close Combat weapon. Chance is committed before the controller sees every legal subset of failed Hit dice up to three, including the empty choice.

## Relationship graph gate

The graph is derived audit evidence, never a second Rules authority. Slice 46 adds source, executor lineage, state read/write, derivation, invalidation, Judge-test and release-ancestry edges for:

`Part 8 / Part 9 / Stimpack source → model ledger and Unit-wide loadout → Fighting/Supporting ranks → attack pool → Precision choice domain → resolution → casualty/Supply writeback`.

The gate blocks freeze when a declared source, consumer, state contract, required/forbidden path, test edge or version edge is missing. A negative fixture removes the Part 9 replacement edge and proves the audit becomes invalid. Casualty invalidates the model ledger and old action; geometry invalidates the engagement/rank graph and an already-open pending choice.

Current graph:

- nodes: 5,138
- edges: 19,927
- executors: 39
- executors with declared unified state contracts: 5
- remaining state-contract debt: 34
- blocking relationship gaps: 0

## Authority and replay

Only Slice 46 uses `hybrid_legal_space_v14`. Both the initial Fight and the post-Hit Precision selection go through server-owned LegalSpace, Preview, explicit human confirmation and Apply. Accepted receipts use Ed25519 for long-term identity; rotating the short-term HMAC seal does not break replay. Tampered receipt events fail signature verification. Slice 45 and every earlier runtime/rules display remain exact historical dependencies; missing historical display material is quarantined rather than silently emulated.

## Frozen identities

- Slice: `2d6214ab7962db7d89a96af8ef3fba8484cafa2956e3430b81c0a1a5539b2454`
- Catalogue: `89f9cd56e8eaaa416557cd993f467daf332533d7582c66f5452078899dcc7e6b`
- Runtime: `5f0aac1f49280b9c263c8744d74427b967aa81283a5d17b5357320266930b441`
- Relationship graph: `2af2fd17b7e444ff49f789897177fb104c62f19a9f2a6c427316f2c81837b4c5`

The latest live official binding was revalidated as `units 71 / cards 69 / rules 48`, including Marine and Rules Parts 8, 9 and 12. Repository fallback is false.

## Verification and remaining work

- focused Slice 46 acceptance: 13/13
- current runtime: 10/10
- foundation base evidence: 108 reports / 1,107 assertions
- aggregate: 109 reports / 1,116 assertions

RuleAtom disposition remains 421/912 actionable executable (46.2%), 491 actionable atoms remaining, plus 114 display-only atoms. This is a composition-only slice; the rolling planning forecast is about 54 further slices after 46 frozen slices.

No Skill was generated or promoted, DSH was not run, and no memory, MuZero or training candidate was written. `rulesEligible=false`, `productionRoomEligible=false`, and `trainingTruth=false` remain mandatory.
