# Ticket 11 Slice 47 — Marine multi-model casualty resolution

Date: 2026-08-26  
Status: frozen exact subset; Ticket 11 remains open

## Outcome

Slice 47 removes Slice 46's one-model-defender boundary for the exact current-official Marine-versus-Marine Close Combat subset. It adds a pure casualty-resolution kernel and promotes the composition executor:

- `official-multi-model-casualty-resolution-kernel-v1@1.0.0`
- `authority.marine-multi-model-casualty-close-combat-v3@3.0.0`

No RuleAtom disposition changes in this slice. The existing 421 executable atoms are composed through a new Rules-owned casualty domain, Authority action sequence, state writeback and relationship contract. This is not a claim that the complete rules engine, all units or all casualty interactions are finished.

## Official rule composition

The source-bound kernel implements the current official Parts 8 and 12 casualty sequence for the supported subset:

1. add the new Damage Pool to any prior damage marker;
2. when the target is unengaged, casualty candidates are limited to visible models;
3. when the target is engaged, visibility is ignored and candidates are ordered by official priority: not in an enemy Engagement, engaged but not in base contact, then in base contact;
4. a model cannot be removed when that would break a specific enemy Unit engagement while another valid casualty exists;
5. while total damage is at least HP, the defending controller selects and removes one valid model;
6. update the live/destroyed ledger and Supply, discard the Unit if every model is destroyed, or retain the residual damage marker;
7. rederive the post-combat Engagement Graph from surviving models.

The casualty domain binds the complete current model ledger, visibility set, Engagement Graph, HP, prior damage, Damage Pool and every legal selection. Domain, selection or state drift rejects the action rather than silently recomputing under a different version.

Ordinary Strike/Bayonet now follows `Fight -> defender casualty choice`. Stimpack Strike/Bayonet follows `Fight -> attacker Precision choice -> defender casualty choice`. Each choice is exposed only after the preceding Chance result has been committed. The actor seat changes with the decision owner; no model-facing agent can confirm or apply either choice.

The prior Precision v2 contract remains frozen. Precision v3 validates the expanded multi-model denominator and projects only its shared, frozen dice mathematics through v2, preserving historical replay without accepting a v2 plan as a v3 plan.

## Relationship graph and future slices

The relationship graph is derived audit evidence, not a second Rules authority. Slice 47 appends source, rule, domain, executor, state read/write, derivation/invalidation, Judge-test and release-ancestry relationships for:

`Parts 8/12 -> damage/visibility/priority/engagement preservation -> casualty domain/selection -> ledger/Supply/damage writeback -> post-combat engagement -> Judge/replay evidence`.

Every new rules Slice must enter the graph before it can freeze. A new Slice creates a new content hash and graph version; it may add nodes and edges or declare an explicit historical relationship, but it may not mutate the frozen Slice 46 graph or any earlier rules display. Missing dependencies are quarantined rather than silently emulated.

Current graph:

- nodes: 5,157
- edges: 20,090
- executors: 40
- executors with declared unified state contracts: 7
- remaining state-contract debt: 33
- blocking relationship gaps: 0

## Authority, integrity and replay

Only Slice 47 uses `hybrid_legal_space_v15`. Both seats pass through server-owned List Legal Actions, Preview, explicit human Confirmation, Apply and Replay. Content identities are SHA-256 bound; accepted receipts use Ed25519 for long-term verification and HMAC-SHA-256 only for short-term seals. Replay remains valid after HMAC rotation, and event tampering fails Ed25519 verification.

Slice 46 and all earlier catalogue, runtime, graph and old-rules-display identities remain strict dependencies. No compatibility fallback is used.

## Frozen identities

- Slice: `a52b9b24bcdc8d2626949b2927238bf4ee9f3b9cff9a8d55494d1b6390012778`
- Catalogue: `cebc6dfffb91c73557ae23c33eea3d0bf54a79017d583a2d98348c99e95b2fac`
- Runtime: `e115118c04d60794ccc0372972e98b7c6c4e1fe0d9012676c0a1408ae2e02cb7`
- Relationship graph: `761ce316ce328224aa21d3f4f3d49eceb2a30b595a75409d97f50a6934c321e0`
- Casualty kernel: `35e839791309c84bcc23073aa933be1660d1dea62d65ac7aaba0d1a645d07643`
- Multi-model denominator: `0194a56fdc6ebc5bfe6b01ce968fb4e669d187ca073a7b07d342f22ad7366fc3`
- Precision kernel v3: `bf6dfa4ffada5a31337a22d1953a2019381cef700d4f0986d0774a57e0117609`

The live official binding was revalidated as `units 71 / cards 69 / rules 48`, including Marine and Rules Parts 8, 9 and 12. Repository fallback is false.

## Verification and remaining work

- focused Slice 47 acceptance: 12/12
- current runtime: 10/10
- foundation base evidence: 109 reports / 1,119 assertions
- aggregate evidence: 110 reports / 1,128 assertions
- application-level `verify:all`: pass

RuleAtom disposition remains 421/912 actionable executable (46.2%), 491 actionable atoms remaining, plus 114 display-only atoms. Slice 47 is the forty-seventh frozen slice; the rolling atom-throughput forecast is about 55 additional planning slices.

Thirty-three executors still lack a unified state contract. Complete cross-unit casualties, simultaneous effects, other unit profiles, broader terrain/elevation/Flying and full interaction/LegalSpace closure remain outside this exact subset. `rulesEligible=false`, `productionRoomEligible=false`, and `trainingTruth=false` remain mandatory.

No Skill was generated or promoted, DSH was not run, and no memory, MuZero, self-play or training candidate was written.
