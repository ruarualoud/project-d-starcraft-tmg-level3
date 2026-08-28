# Ticket 11 Slice 61 — existing Start-of-Round contract closure

Date: 2026-08-28  
Status: accepted development subset; Rules/production/training gates remain closed

## Outcome

Slice 61 closes the current Start-of-Round executor contract over thirteen already-known
RuleAtoms. It does not add a RuleAtom and its ordinal is a repair-batch number, not an atom
index.

The executable round chain now reaches:

```text
Cleanup v5 -> Determine Initiative v2 -> Start of Round v2 -> Movement
                                                       -> PhaseFirstActorChoice pending
```

Current `authority.start-of-round-v2@2.0.0`:

- requires the latest official gameplay bundle, exact MatchBinding, Cleanup v5 history and
  the complete current Determine Initiative result;
- exposes one exact action to the First Player only;
- calculates finite Hold Position Supply in rounds 2–4 and unlimited Supply in round 5;
- records on-table, Reserve and Available Supply separately, with Reserve excluded from the
  battlefield cap;
- resolves mandatory effects First Player then opponent, grants Stationary to every live
  on-table or Reserve Unit, and begins supported cards Ready;
- enters Movement without silently choosing the phase's first actor;
- exact-matches Apply against a fresh server enumeration and retains the precise frozen-kernel
  rejection reason needed by Referee, Tutor and UI diagnostics.

The bounded current data subset remains Hold Position, Marine, Academy and Terran Armed
Forces. Unsupported effects, statuses, records or source drift fail closed.

## Strict version boundary

- Frozen v1 source SHA-256:
  `2d7542321dc8cdc7f1f283c5da4a03a8d30158007f6d5061890d9c47e15b01f6`
- Current v2 source SHA-256:
  `0dca5a1a8a10f292cf5b03de9139a9f4c2855915a698ea67df6b46d2cee05820`
- Current rooms use only v2. There is no implicit fall-through to v1.
- Frozen v1 catalogue, runtime evidence, replay evidence and rules display remain available.
- The v2 adapter is explicit, versioned and records `silentCompatibilityUsed=false`.

The public TDD regression proved that v1 accepts caller-forged initiative history while v2
rejects it. The delivered capability is the current executable Start-of-Round transition;
the regression is evidence for the version boundary, not a claim that old recorded results
were rewritten.

## Atom and executor movement

Before Slice 61:

- `421 = 173 strict + 78 partial + 170 none`
- `24/42` executor state contracts declared
- `248` atoms non-strict

After Slice 61:

- `421 = 186 strict + 78 partial + 157 none`
- `25/42` executor state contracts declared; `17` remain
- `235` atoms remain non-strict
- newly executable atoms: `0`
- version/evidence-rebound existing atoms: `13`
- changed non-target atoms: `0`

The thirteen atoms cover Available Supply, finite/final-round Supply, on-table cap, Reserve
exclusion, mission Supply escalation, Start-of-Round timing/effect ordering, Ready cards and
Stationary grants.

## Frozen release identities

- previous Slice: `54170af6469649848bbacc19743c4ba0952441d8fa510a1892100a58bfb55448`
- Slice 61: `3a81f7d6c7d5b61fd443d63521a05d20336950f59ae68f0e4839d2dcc89b012b`
- catalogue: `70f8a9b7e69c45f788aa3d967417a04898dfeff2855e64760bd5ae397a318529`
- runtime: `b4a63b98baebc6fc74f43356d94b4e61f1456c3c561ef9c771083644a29c1a99`
- relationship graph: `62e894083bdf2d4e52601f9bc3d17da857d7954b40033ac3d481498dfaa4ee5e`
- relationship graph size: `6,122` nodes / `22,043` edges
- Authority action schema: `hybrid_legal_space_v19`

The graph remains `derived_audit_evidence_only`; it cannot decide legality or become training
truth.

## Acceptance evidence

- current executor public contract: `4/4`
- public relationship graph contract: `6/6`
- source, Judge, Authority, opponent boundary, replay and historical isolation: `17/17`
- direct cumulative runtime: `10/10`
- uninterrupted historical-to-current `npm run verify:official-executable-rule-runtime`: passed
- foundation aggregate: `123` base reports / `1,285` base assertions
- aggregate including its own gate: `124` reports / `1,294` assertions, `9/9`
- `npm run verify:all`: passed
- live official Core and Firestore versions `71/69/48`: passed
- repository fallback: `false`
- Ed25519 accepted-receipt replay after HMAC rotation and tamper rejection: passed

Evidence report:

`build/ticket-11-rule-atoms-v1/official-existing-start-of-round-contract-closure-v1-report.json`

## Boundaries and next dependency

No Skill was generated or promoted, DSH was not run, no MuZero/self-play/memory/training
candidate was written, and `rulesEligible`, `productionRoomEligible` and `trainingTruth`
remain false.

The next dependency-ordered audit target is `authority.reserve-deploy-v1@1.0.0`, because it
is the first unresolved Movement executor consuming the newly established RoundSupplyState.
Its thirty existing consumed atoms are an audit denominator only; no projected strict movement
is counted until its state, geometry, Authority, graph, Judge and replay evidence pass.

Charge and new RuleAtoms remain frozen until all `42/42` executor contracts and all `421/421`
existing executable atoms are strict.
