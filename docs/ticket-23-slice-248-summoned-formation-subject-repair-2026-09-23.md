# T23 / S248 — summoned formation subject repair

## Result and deployment status

The formation relationship consumer now evaluates a newly summoned Unit, not
the caster. The focused real-scene gate passed. The running match process
72606 predates this change; do not claim a new live decision used it until a
safe reload and corresponding query receipt exist. No historical choice is
rerolled and no previous accepted action is removed.

## Observed failure

Run `20260922172710914`, decision at r49, exposed four Rules-valid Roachling
Infestation formations. Every option had correct `createdPieceId`
`summoned:2:roachling:1` and three newly created model IDs, but
`relationshipComparison` returned:

```text
unknown / placement_slots_do_not_belong_to_current_actor
```

The comparison only found `source.pieceId` (Corpser) and rejected the new
model IDs as foreign. This was a missing hypothetical-subject projection,
not an illegal summon or an incorrect physical Apply. r50 actually created
three Roachlings with Supply 0 and Movement already activated; Corpser stayed
in place. Screenshot:
`build/ticket-23-slice-248-standard-2000-aa-live-v1/20260922172710914/screenshots/0383-r050-player2-resolve_unit_lifecycle_ability-complete-board-applied.png`.

The Agent used other Corpser/current-board threat evidence when discussing
the new footprint. That is not a substitute for the summoned Unit's own
post-placement relationships. Its `marker-contesting body` wording must be
reviewed against actual Supply 0 and indirect screening utility in S249;
do not label a legal choice optimal merely because it executed.

## Diagnosis and minimal repair

Three hypotheses were considered: caster-bound comparison, missing created
Unit data, or lost canonical creation parameters. Persisted receipts retain
the parameters and frozen data has the Roachling profile. The first
hypothesis is reproduced by the real solver and Rules preview using the
immutable r48 pre-summon checkpoint (a consumer fixture, not a reconstruction
of every r49 state field).

`legal-formation-search-v1.mjs` now passes the actual instantiated action to
the relationship projection. For a summon it unwraps the product action and
uses the existing pure Unit Lifecycle adapter transition on a cloned state.
This reuses Rules-owned geometry, model IDs, Supply, loadout and summon
activation timing instead of inventing a second Unit constructor. The new
subject ID and source actor ID are explicit. The caster is not moved. There
is no parent-to-summon distance delta: a new subject has no prior baseline.
Absent/invalid canonical creation evidence stays unknown. Ordinary existing
Unit placement follows its previous path; no source data, rule semantics,
Prompt, Skill or strategy weight changed. No Room mutation API is invoked.

## Focused verification and convergence

Command, only for this concrete bug:

```sh
node scripts/verify-ticket-23-slice-248-summoned-formation-subject-v1.mjs --run-directory=build/ticket-23-slice-248-standard-2000-aa-live-v1/20260922172710914
```

1. Red: a real Rules-valid option returned the exact observed ownership error.
2. First repair: projection became available; a newly written test assertion
   then read the wrong graph distance property. This was a test mistake,
   not a new model/Rules fault.
3. Corrected the test to the actual `nearestPhysicalEdges` contract. One
   green run, 26.719 seconds: four corresponding edges, exact distances,
   created subject identity, Supply 0, three models, consumed Movement,
   unchanged caster, unchanged source state.

No passed command is repeated. No old geometry/formation suite or Web build.
Provider calls / Room mutations / cost for this verification: **0 / 0 / ¥0**.
This is not full-match acceptance or proof of strategy improvement. The
26.719-second focused fixture includes the real solver, Rules, graph and
reference transition while the live game/K3 run concurrently; it is not a
controlled benchmark or attribution of latency to the added projection.

## Harness evidence boundary

- `harnessLoopUsed`: true; game: StarCraft TMG; route: `selfplay_agent_prompt`.
- Tools evidenced: relationships, formation solver, parameter instantiation,
  Rules Preview/Apply/Replay; real UI r50 before/after capture.
- Decision evidence: saved public reasons/plan and exact query receipts;
  hidden chain-of-thought is not stored.
- Memory evidence: the real r49 plan assessment revises the prior deploy
  goal to Roachling Infestation; the memory store is unchanged by this fix.
- Training candidates remain `trainingTruth: false`; the missing-subject
  historical receipt is a repair/review example, not promoted strategy truth.
- Demotion: wrong subject IDs, mutated parent/input, invented Supply or
  restored Movement eligibility invalidate the hypothetical projection.
