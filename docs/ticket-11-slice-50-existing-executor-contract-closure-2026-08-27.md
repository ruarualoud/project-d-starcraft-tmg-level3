# Ticket 11 Slice 50 — Existing Executor Contract Closure 1

Started: 2026-08-27

Frozen: 2026-08-28

## Outcome

Slice 50 backfills the first missing state contract over the already executable
RuleAtom set. It does not promote Charge or any other new rule. The frozen
catalogue, runtime, executor source, action schema, and 421-atom executable
denominator are byte-identical to Slice 49.

The corrected completion vocabulary is:

- `executable`: a RuleAtom has a frozen executor consumer and executable
  evidence;
- `strict_complete`: every current executable consumer of that atom also has
  an explicit state read/write/invalidation/Judge contract in the frozen Rule
  Relationship Graph;
- `partial`: at least one but not every consumer has that contract;
- `none`: no current consumer has that contract.

Therefore the earlier phrase “421 atoms completed” was too broad. Slice 49 had
421 executable atoms, but only 76 were strict-complete under the relationship
contract definition.

## Closed executor

`authority.phase-initiative-v1@1.0.0` is now the tenth declared state-contract
executor. Its frozen contract declares:

1. reads of round, phase, players, First Player Marker holder, and the existing
   round/phase choice map;
2. an exact two-choice denominator visible only to the Marker holder;
3. invalidation on round, phase, marker-holder, or recorded-choice drift;
4. writes to the phase-first-actor record, active seat, deterministic event,
   and expert-readable log;
5. a forbidden path preventing `activeSideKey` from becoming the authority for
   the choice and preventing the choice from moving the First Player Marker;
6. Judge paths for exact choice visibility, apply semantics, stale-choice
   rejection, relationship tamper, and signed replay.

The public seams are the frozen Rule Relationship Graph query/audit interface
and Authority `LegalSpace → Preview → Confirm → Apply → Replay`. No verifier
reaches into private executor helpers.

## Coverage change

The denominator remains fixed:

- executable RuleAtoms: `421`
- review-required actionable RuleAtoms: `491`
- display-only RuleAtoms: `114`
- executors: `42`

State-contract coverage changes only as follows:

- declared executors: `9 → 10`
- missing executor contracts: `33 → 32`
- strict-complete atoms: `76 → 79`
- partial atoms: `106 → 106`
- no-contract atoms: `239 → 236`

One executor closes three atoms because all of their current consumers are now
contracted. No atom identity, disposition, executor version, or runtime hash is
reassigned.

## Relationship and replay evidence

The graph appends Slice 50 nodes and edges to Slice 49 instead of rewriting the
old graph. Removing either the state invalidation provenance or Judge
provenance invalidates the declared scope. The Marker holder sees exactly both
seat choices even when `activeSideKey` points at the other seat; the non-holder
sees none. Apply chooses the other seat as active while preserving the Marker
holder.

The AcceptedReceipt uses the existing Ed25519 long-term signature and replays
after HMAC short-term seal rotation. Event tampering is rejected as
`SIGNATURE_INVALID`. Historical Slice 49 and `hybrid_legal_space_v17` remain
strictly frozen and displayable.

Frozen identities:

- slice: `3dd146a3d76b8c73a3c8807e709b1526a28bc74074a117dcc863f36442216bff`
- previous slice: `03daff75c35c1686074cec94a070554385d3f2a27ad55aa9c696305ad0179b45`
- catalogue: `cf0c60b4faa04674727273cadc8fa1fbca158cabce3d85825d0417928abb0d7e`
- runtime: `3a9684030e8020bffbcac80c6238804f673c98b695b49286481662fc5e01749a`
- relationship graph: `d16524a8971bcb2650e3a2d74be75fbf162496f8aacaac73de8541eeab0daa4b`
- graph size: `5,214` nodes / `20,445` edges

## Official-source and verification gates

The verifier reads the live official Firestore versions, Marine, Part 8, and
Part 12 documents and matches their canonical hashes. The accepted versions
remain units `71`, cards `69`, and rules `48`; repository fallback is forbidden
and unused.

Focused evidence:

- Slice 50 contract/Judge/Authority/live-source verifier: `9/9`
- cumulative runtime verifier: `10/10`
- Ticket 11 aggregate: `9/9`
- aggregate denominator: `112` base reports / `1,154` assertions; including
  aggregate, `113` reports / `1,163` assertions
- complete Ticket 11 foundations: pass with exit `0`
- product `verify:all`: pass with exit `0`
- network verifier syntax audit after buffered-body retry repair: `15/15`

## Remaining 32 executor contracts

The remaining work is scheduled by state-machine dependency first, then by
the number of currently non-strict atoms the executor can close. It is not the
old RuleAtom promotion forecast and does not imply one Slice per executor.

1. phase and activation: Activation Pass, Movement Hold, Assault Hold, Combat
   Pass (`4`);
2. round, scoring, and lifecycle: Mission Marker Control, VP Scoring, Hold
   Position end-game check, End-of-Round v2/v3/v4, Cleanup v2/v3/v4,
   Determine Initiative, Start of Round (`11`);
3. movement: Reserve Deploy, Standard Move, Disengage, Stimpack Move consumer
   (`4`);
4. abilities and reactions: Specialist Loadout, Marine Stimpack active,
   Medpack, Academy ability, Restoration reaction, Life Support reaction (`6`);
5. ranged combat consumers: Ranged Attack v6, Specialist batch, Sidearm/
   Pinpoint, Goliath/Scatter, Combat Tag/Shielded, Stimpack ranged, Optical
   Flare ranged (`7`).

The next target is `authority.activation-pass-v1`: it is upstream of movement
and assault alternation and can make ten existing atoms strict-complete without
adding an atom. A later graph impact query may reorder two executors inside the
same dependency group, but cannot jump to Charge or another new atom before
all 42 executors have declared contracts.

## Learning and production boundaries

This Slice generated or promoted no Skill, did not run DSH, and wrote no
memory, self-play, MuZero, or training candidate. `rulesEligible`,
`productionRoomEligible`, and `trainingTruth` remain false. DSH remains limited
to the later offline Skill-generation lane.
