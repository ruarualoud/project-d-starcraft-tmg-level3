# Ticket 11B Slice 102 — Faction and army eligibility rules

Date: 2026-09-01
Rule vertical: 92/101
Route assignment: 24 exact atoms
Result: `793 executable / 119 review-required / 114 display-only`

## Scope closed

This slice promotes the exact route-v2 faction/race/sub-faction tag,
Faction-card schema, Army Slot, engagement-scale and army-building eligibility
group. It uses the unchanged fixed `71/69/48` development-tranche data and does
not refresh, merge, or fall back to another source.

The compiled denominator contains six current Faction Cards, 31 Tactical Cards,
26 Unit profiles, 22 fieldable Unit candidates and four non-army-building
`Other`/summoned Unit profiles. The 31 Tactical and 22 fieldable Unit records
form 53 army-building candidates and a complete `6 × 53 = 318` eligibility
matrix.

## Source-data correction

Slice 93 correctly froze the Unit-card `Faction` field as the Race tag. The
fixed current official Unit records store their additional Sub-Faction Tags in
`payload.keywords`, not in that `Faction` field. Slice 102 therefore adds a new
versioned projection that validates both source-record and payload hashes and
parses the exact current keyword carriers:

- Kerrigan Swarm Raptor → `Kerrigan's Swarm`
- Raynor's Raider → `Raynor's Raiders`
- Praetor Guard → `Khalai`

The same source interpretation is retained on the excluded Omega Worm, Point
Defense Drone and Pylon profiles. Slice 93 remains byte-frozen; no historical
Unit profile is silently rewritten. This prevents a Sub-Faction Unit from
being admitted to a Race-only Faction whose complete tag set does not contain
the Unit's additional tag.

## Executable behavior

- Engagement scale requires an exact, complete all-player agreement and derives
  the Rules-owned profile: Skirmish is at most 1,000 Minerals on `36×36`,
  Standard is at most 2,000 on `36×54`, and Grand Offensive starts at 2,001 on
  `36×72`; every profile carries the one-tenth Vespene ratio. Complete resource
  budget validation remains Slice 103.
- An Army selects exactly one current Faction Card. Its identity, Race and
  Sub-Faction Tags, five starting slot counts and Special Ability definition
  hash are source-bound; a client-supplied layout is rejected.
- Candidate eligibility is a strict subset test: every Faction Tag on a Unit or
  Tactical Card must occur on the chosen Faction Card. Fewer tags are legal;
  any missing tag is illegal. Race-only and Race-plus-Sub-Faction Factions stay
  distinct.
- Army Slots have exactly five types: Air, Core, Elite, Hero and Support. The
  available count is the Faction Card's starting slots plus exact Tactical Card
  additions. A Unit consumes its chosen starting composition's Supply count in
  the Unit's printed slot type.
- A complete Army Slot audit composes Slice 92's frozen Unique-card audit,
  rejects over-capacity, duplicate identities, non-fieldable summoned/`Other`
  Units and unproved profiles, and records every unused slot as lost. Unused
  slots cannot be retained, converted or exchanged.
- Full Mineral/Vespene purchase totals remain Slice 103. Complete Unit
  composition, model count, Upgrade and cost validation remain Slice 104.

## Runtime and relationship closure

`authority.faction-army-eligibility-rules-v1@1.0.0` is executor 71. It exposes
four explicit procedures—engagement-scale agreement, Faction-card selection,
tag eligibility and Army Slot audit—through Pending → LegalSpace → explicit
confirmation → Apply. The action schema advances from v39 to v40 only when the
executor is present.

Source/data identity, complete candidate sets, current Faction and candidate
profiles, scale agreement, eligibility rows, slot totals, result and action
lineage are content-hash bound. Authority replay remains Ed25519-verifiable
after HMAC seal rotation and rejects receipt or action tampering.

The relationship graph connects all 24 atoms to frozen Slice 92 card/Unique,
Slice 93 Unit/Supply and Slice 100 Summon boundaries. Every new slice is added
to the current graph while all historical graph/runtime identities remain
queryable. The current graph is valid at 11,291 nodes and 31,836 edges with
71/71 declared state contracts, zero missing contracts and zero blocking gaps.

## Historical gate boundary repair

The historical all-slice regression exposed two older closure verifiers that
hashed the mutable global runtime/Authority router as if those files belonged
to the frozen Academy/Medic v2 and Life Support v2 slices. Their own adapter,
executor, relationship, catalogue, runtime-descriptor, behavior and replay
checks were already independently frozen. The two gates now freeze only those
slice-owned bytes and continue exercising the current routers behaviorally.
Both repaired historical closures pass `9/9`; no old executor or rule behavior
was changed or made silently compatible.

## Frozen identities

- Slice: `2bd3c289c86f90e013a0ddf4713eb283e3322654a40f2fda6d6c72165be9ab60`
- Catalogue: `bd9757f3407cb97b93b7cd0f044bb2a4e11defd449ccb4f1062d647b3b968415`
- Runtime: `cdf4d39c1bc6eac0a2d1d5703ff856b059a172a834563656b1a4784d0547e97e`
- Relationship graph: `d7621dfdc7ca18fe492d2bb6525fcd5149c090cb0732ad82e4f294dde6e43083`
- Data bundle: `9c991989cae5cad718bb8c31dbea23ae0f9e5d44a4a6e765e008aaa9bfd89f8a`

## Gates

- Slice 102 focused verifier: `52/52`
- Slice 101 historical regression: `50/50`
- Academy/Medic v2 and Life Support v2 repaired closures: `9/9` each
- Current executable runtime: `10/10`
- Ticket 11 foundation aggregate: `10/10`
- Evidence denominator: 166 base reports / 2,377 assertions; 167 reports /
  2,387 assertions including the aggregate

No Skill was generated or promoted, DSH was not run, and no MuZero, self-play,
memory or training truth was produced.

## Next fixed slice

Slice 103 is the exact 11-atom army Mineral/Vespene budget, Tactical Card
purchase, no-conversion/unspent-resource loss, team budget and face-up/open
card-information group. Its target is
`804 executable / 108 review-required / 114 display-only`; eight slices remain
after it.
