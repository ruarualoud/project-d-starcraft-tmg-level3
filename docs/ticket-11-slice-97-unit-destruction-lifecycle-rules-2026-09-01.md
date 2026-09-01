# Ticket 11B / Slice 97 — Unit Destruction Lifecycle Rules

Date: 2026-09-01

## Outcome

Slice 97 promotes the exact five-atom route-v2 assignment from Core 7.4. The
catalogue moves from `712/200/114` to `717/195/114`, and the runtime moves from
65 to 66 executors under action schema `hybrid_legal_space_v35`.

`authority.unit-destruction-lifecycle-rules-v1@1.0.0` executes two procedures:

- settle a Unit after its last model has fallen;
- evaluate whether an already Destroyed Unit may return to play.

The settlement is a real state transition, not a display certificate. It:

- requires zero current models, zero current Supply, and a complete destroyed
  model ledger;
- marks the Unit Destroyed/off-Battlefield and disables its abilities;
- immediately clears every represented local status, condition, and temporary
  effect collection on the Destroyed Unit;
- removes Tokens created by that Unit unless they are `STAY IN PLAY`;
- removes local effect markers;
- preserves effects and effect markers applied to other Units by default;
- removes an outward effect only when that effect explicitly declares
  `endsWhenSourceDestroyed=true`;
- records the exact preserved/removed denominator in a hash-bound resolution,
  event, and lifecycle history.

## Return-to-play boundary

Core 7.4 forbids a Destroyed Unit from returning unless a specific rule says
otherwise. Slice 97 therefore implements a fail-closed registry boundary:

- no specific return RuleAtom means `canReturnToPlay=false`;
- a caller cannot name an arbitrary exception;
- the current registered exception list is deliberately empty;
- Slice 101 must register Respawn/Morph carriers with explicit RuleAtom and
  effect-receipt authority before a positive return transition can exist.

This closes the Core restriction without prematurely implementing Slice 101's
separate Respawn/Morph atoms.

## Authority and data boundary

`official-unit-destruction-lifecycle-data-bundle-v1` binds the unchanged
development source lock to the current official `PART 7: THE BATTLEFIELD`
record and the five reviewed Core 7.4 clause boundaries. Every clause stores
its source-text and candidate-sequence hashes.

The source lock was not refreshed:

- source lock: `1adbdb652fafc09d01887981a3ae86f69e65e1f1480d804156a8da1d4d1757a1`
- source snapshot: `8828471846f5befa2e7eb464d64dfebf834e7aba5c1908381a44b29f5529e105`
- normalized dataset: `b2579b83bb9a77b6119730009725a34d4e828d92d302248243bab33863551067`
- data bundle: `1b06d907fc9a565db524befce8248c7343886d88186fcba864cc50c34cd0d4f9`

Repository fallback remains forbidden and `trainingTruth` remains false.

## Frozen-consumer boundary

Existing Marine casualty, Disengage casualty, and Reserve lifecycle executors
remain byte-frozen. They are graph-linked producers of a destroyed state, but
Slice 97 does not silently change their public action/receipt contracts. A
current caller must invoke the explicit destruction-lifecycle follow-up after
one of those frozen transitions destroys the final model.

Automatic composition into future attack/resolution versions remains a
versioned integration task; the five atomic Core 7.4 rules and their standalone
transition are complete in this Slice.

## State and replay contract

The pending domain hashes the complete piece, model, board Token/marker,
outward-effect, source, history, and log projection. The caller cannot submit a
cleanup patch. Any local or outward effect drift, source drift, board artifact
drift, or lifecycle-history drift invalidates the pending action.

Authority evidence uses a long-lived Ed25519 receipt signature and short-lived
HMAC seal. Replay succeeds after HMAC rotation and rejects a modified event.
Historical Slice 96 rules display and all prior identities remain frozen.

## Relationship graph

Every new atom enters graph
`5068f1bdd4baaeef787ffbb46629686b901707917568136ae26f58f56d63f86c`.
The graph has 10,690 nodes, 30,676 edges, 66 declared state-contract
executors, zero missing state contracts, and zero blocking gaps. It connects:

- frozen casualty/Reserve producers to the last-model-fallen condition;
- model/current-model/current-Supply fields to Unit destruction;
- local statuses, conditions, effects, and ability activity to immediate
  cleanup writes;
- created Tokens to non-`STAY IN PLAY` removal;
- outward effects to default retention and their explicit end exception;
- Destroyed state to the default return prohibition and the future Slice 101
  versioned exception registry.

The graph forbids a direct default-preserved-outward-effect write path back to
the target effect collection.

## Gates

- Slice 97 focused Judge: `40/40`
- Slice 96 frozen regression: `50/50`
- current executable runtime: `10/10`
- aggregate historical/runtime/graph gate: `10/10`
- evidence denominator before aggregate: 161 reports / 2,126 assertions
- evidence denominator including aggregate: 162 reports / 2,136 assertions

Frozen identities:

- slice: `59b1b89770e787417731e8afe083b3b431256300e8bb468806ee824f9abae670`
- catalogue: `38742bb9d0d96c9a60cb54f1d2a8886ba167fddab8e2f9a77a4fd81a8f95caf0`
- runtime: `925574975598e5be4a1e089f5728ea07a5cb827b4892e7de7b40858689357420`
- graph: `5068f1bdd4baaeef787ffbb46629686b901707917568136ae26f58f56d63f86c`

No Skill, DSH, memory, self-play, MuZero, or training promotion is opened by
this rules Slice. Fourteen planned rule slices and 195 actionable atoms remain.
Slice 98 is the exact 12-atom status/`STAY IN PLAY`/Shielded/Siege Mode/On Creep
assignment and targets `729/183/114`.
