# Ticket 11B / Slice 96 — Reserve Lifecycle Rules

Date: 2026-09-01

## Outcome

Slice 96 promotes the exact 17-atom route-v2 assignment for Reserve lifecycle,
retained state, targeting, post-arrival state, and final-round Reserve
destruction. The catalogue moves from `695/217/114` to `712/200/114` and the
runtime moves from 64 to 65 executors under action schema
`hybrid_legal_space_v34`.

This Slice executes state transitions. It is not a display-only summary:

- all Army List Units can be placed off the Battlefield in Reserves at setup;
- a rule-effect-triggered Unit can Return to Reserves without becoming
  Destroyed;
- Return immediately removes its current Supply from on-table use and
  recalculates the Round Supply State;
- equipment, Army Building choices, current Damage, timed effects, and current
  Phase activation state are retained;
- Active, Passive, and Reaction abilities are inactive while the Unit is in
  Reserves;
- non-`STAY IN PLAY` tokens or markers explicitly left on the Battlefield by
  that Unit are removed, while Unit-affected timed markers remain;
- a Reserve Unit cannot be targeted without an explicit Reserve-affecting
  exception; unregistered exceptions fail closed;
- after a frozen Reserve Deploy v5 receipt, abilities resume and Zone of
  Influence no longer affects the arrived Unit;
- at final Scoring Phase start for a Round-Limit ending, every live Reserve
  Unit is marked Destroyed and its pre-destruction current Supply is preserved
  in a content-hashed final destruction ledger.

## Authority and data boundary

`official-reserve-lifecycle-data-bundle-v1` binds the unchanged development
source lock to exact Part 8 and Part 11 records, 17 reviewed clause boundaries,
their source-text hashes and candidate-sequence hashes, plus the current Hold
Position five-round / one-VP-per-destroyed-Supply mission identity.

The source lock was not refreshed:

- source lock: `1adbdb652fafc09d01887981a3ae86f69e65e1f1480d804156a8da1d4d1757a1`
- source snapshot: `8828471846f5befa2e7eb464d64dfebf834e7aba5c1908381a44b29f5529e105`
- normalized dataset: `b2579b83bb9a77b6119730009725a34d4e828d92d302248243bab33863551067`
- data bundle: `09566d74e35c4793f5133c372bec2accb8f52cf49d96018774fc32e813161f11`

Repository fallback remains forbidden and `trainingTruth` remains false.

## Frozen boundaries

Slice 96 does not rewrite existing consumers:

- Reserve Deploy v5 still owns entry-edge, path, placement, Zone-of-Influence
  arrival legality, and the concrete `reserve_deployed` receipt.
- Start of Round v5 still owns later-round Supply escalation.
- existing Medic active/passive/reaction executors remain frozen consumers of
  Reserve ability state.
- existing scoring and end-game executors are not silently changed.

The new final Reserve destruction ledger computes exact Hold Position VP
candidates, but the atomic score commit, Round-Limit terminal result, and tie
handling remain assigned to Slice 110. This versioned seam prevents Slice 96
from silently replacing frozen historical scoring behavior.

## State and replay contract

`authority.reserve-lifecycle-rules-v1@1.0.0` derives every mutation from the
hash-bound pre-state. The caller cannot submit a piece patch, Supply value, or
final destruction result. Any drift to pieces, Damage, loadout, effects,
activation, board artifacts, source lock, data binding, history, or event log
invalidates the pending domain.

Authority evidence uses long-lived Ed25519 receipt signatures and a short-lived
HMAC seal. Replay succeeds after HMAC rotation and rejects a modified event.
Historical rules display and Slice 95 identities remain frozen.

## Relationship graph

Every new atom enters graph
`54c3e37f72cdd34be994e3362dc2e881962753adefb5070016068f58e4d437fa`.
The graph has 10,635 nodes, 30,528 edges, 65 declared state-contract
executors, zero missing state contracts, and zero blocking gaps. It connects:

- Army and Unit state to initial/returned Reserve membership;
- loadout, Damage, timed effects, and activation to the retained-state receipt;
- current Supply to immediate Round Supply recalculation;
- left tokens/markers to exact removal writes;
- frozen Reserve Deploy v5 to post-arrival state and ability consumers;
- final live Reserve membership and current Supply to the final destruction
  ledger and future Slice 110 scoring/end-game consumers.

Removing the final-destruction-to-ledger write makes the graph audit fail.

## Gates

- Slice 96 focused Judge: `50/50`
- Slice 95 frozen regression: `42/42`
- current executable runtime: `10/10`
- aggregate historical/runtime/graph gate: `10/10`
- evidence denominator before aggregate: 160 reports / 2,086 assertions
- evidence denominator including aggregate: 161 reports / 2,096 assertions

Frozen identities:

- slice: `155a5869a0530d033d4ec8f769eb162062d7c78ba84663c101aa77e70bbd1f39`
- catalogue: `1e9e3c7ba1cdf12927057718dcd490c8ed12305fd04dea46f7c3a8aefef1db5a`
- runtime: `5a03d752b61b436357bedb198de1455bb32cce1d11f6dc0563f2c37a4057d035`
- graph: `54c3e37f72cdd34be994e3362dc2e881962753adefb5070016068f58e4d437fa`

No Skill, DSH, memory, self-play, MuZero, or training promotion is opened by
this rules Slice. Fifteen planned rule slices and 200 actionable atoms remain.
Slice 97 is the exact five-atom Unit destruction lifecycle, cleanup, outward
effects, and return assignment.
