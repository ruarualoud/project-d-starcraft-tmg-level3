# Ticket 11 Slice 62 — existing Reserve Deploy contract closure

Date: 2026-08-28
Status: accepted development subset; Rules/production/training gates remain closed

## Outcome

Slice 62 closes the current Reserve Deploy executor contract over thirty already-known
RuleAtoms. It adds no RuleAtom; `62` is the repair-batch ordinal, not an atom index.

The current round-to-Movement chain is now:

```text
Cleanup v5 -> Determine Initiative v2 -> Start of Round v2
                                              |
                                              v
                                 PhaseFirstActorChoice v1
                                              |
                                              v
                                      Reserve Deploy v2
```

`authority.reserve-deploy-v2@2.0.0` requires:

- the exact current Start-of-Round v2 history, resolution and event-log handoff;
- the exact Movement `PhaseFirstActorChoice` and its marker-holder provenance;
- a hash-contiguous `RoundSupplyState` lineage from Start of Round through every supported
  current Reserve Deploy or Disengage Supply mutation;
- the current official GAUNTLET Standard deployment, Marine profile and P2P 32mm base
  material, exact MatchBinding and the frozen v1 geometry/transition semantic kernel;
- a freshly re-enumerated v2 parameter domain and an exact server-instantiated action.

Multiple deployments in one Movement phase remain valid: the second deployment consumes the
Supply hash written by the first rather than resetting to the Start-of-Round value. A missing,
forged or out-of-order intermediate Supply witness fails closed.

## Public RED defects and current boundary

The public test first proved two defects in frozen v1:

1. v1 accepted any 64-character `roundSupplyStateHash` in the current-round Start history,
   without binding it to the real Start-of-Round v2 resolution and log;
2. v1 accepted a forged phase marker holder because it checked the choice shape but not the
   current initiative action/event provenance.

Frozen v1 is not modified. Current rooms use v2, which rejects those cases with
`RESERVE_DEPLOY_V2_START_OF_ROUND_HANDOFF_INVALID` and
`RESERVE_DEPLOY_V2_PHASE_HANDOFF_INVALID`. Caller-authored RuleAtom lineage, extra fields,
stale domains and forged Supply ancestry also reject before transition.

Strict version identities:

- frozen v1 source SHA-256:
  `4b401c7f66dcb034df65ae23b3fe434d3a9c77e2e18bcbd6bcd2e5b78163b012`
- current v2 source SHA-256:
  `8a449b51528dbdf855db2406b2be8377b63cbf9c7d236d6ff8dd80ce73292c09`
- the v2-to-v1 semantic adapter is explicit and records `silentCompatibilityUsed=false`;
- frozen v1 catalogue/runtime/replay and old-rules display remain available only under their
  exact historical dependencies.

## Atom and executor movement

Before Slice 62:

- `421 = 186 strict + 78 partial + 157 none`
- `25/42` executor state contracts declared
- `235` atoms non-strict

After Slice 62:

- `421 = 216 strict + 67 partial + 138 none`
- `26/42` executor state contracts declared; `16` remain
- `205` atoms remain non-strict
- newly executable atoms: `0`
- version/evidence-rebound existing atoms: `30`
- changed non-target atoms: `0`

The thirty consumed atoms include deployment timing, Reserve eligibility, Entry Edge and
Speed, full-model placement, battlefield containment, collision, Engagement/Zone of
Influence, coherency, Supply, activation and Stationary removal. Eleven were partial and
nineteen had no complete consumer contract; all thirty are now strict for the declared
current subset.

## Frozen release identities

- previous Slice: `3a81f7d6c7d5b61fd443d63521a05d20336950f59ae68f0e4839d2dcc89b012b`
- Slice 62: `95d7d170e04ea331949f75dc50709c3e7e4da42a166f71a6096794299967f378`
- catalogue: `702434b35a0f0af64acd03b706993f02153e1c6c1e4533fa6b65be6f3da7d4e1`
- runtime: `f8cae053d340153b166c12c69e25f719e2b79b6abce78ba05a59f978248bb27c`
- relationship graph: `afd540544a397b5c1a55c305477d57a2c2bf713fcadb8fd6834e5e1358e9a2f8`
- relationship graph size: `6,328` nodes / `22,319` edges
- Authority action schema: `hybrid_legal_space_v20`

The graph includes source, Start/Phase handoffs, Supply lineage, geometry/data material,
domain/action, Judge/replay and version-ancestry edges. New slices must extend a new immutable
graph identity. The graph remains derived audit evidence and cannot decide legality or become
training truth.

## Acceptance evidence

- current v2 public executor contract: `4/4`
- public relationship graph contract: `6/6`
- source, two-seat Authority, Supply lineage, protected writes, replay, signing, tamper and
  historical-isolation verification: `13/13`
- direct cumulative runtime: `10/10`
- uninterrupted historical-to-current `npm run verify:official-executable-rule-runtime`: passed
- foundation aggregate: `124` base reports / `1,298` base assertions
- aggregate including its own gate: `125` reports / `1,307` assertions, `9/9`
- complete `npm run verify:ticket-11-rule-atom-foundations`: passed
- `npm run verify:all`: passed
- live official Core, Terran P2P and Firestore versions `71/69/48`: passed
- repository fallback: `false`
- four Ed25519 accepted receipts replay after HMAC rotation; tampering rejects

Primary evidence report:

`build/ticket-11-rule-atoms-v1/official-existing-reserve-deploy-contract-closure-v1-report.json`

## Boundaries and next dependency

No Skill was generated or promoted, DSH was not run, and no MuZero, self-play, memory or
training candidate was written. `rulesEligible`, `productionRoomEligible` and
`trainingTruth` remain false.

Slice 63 must be selected from the sixteen remaining executor-contract debts by graph/dependency
impact, then pass its own public RED, current contract, relationship, Judge, Authority, replay,
official-source and historical-isolation gates. No future strict movement is counted before
those gates pass.

Charge and new RuleAtoms remain frozen until all `42/42` executor contracts and all `421/421`
existing executable atoms are strict.
