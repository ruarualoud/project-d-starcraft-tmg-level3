# Ticket 17 Slice 165 — Teach/Ctx2Skill role graph and candidate boundary

Status: complete. Ticket 17 is 3/9; Slices 166–171 remain. Overall project
status remains 15/22 because Ticket 17 is not closed. Ticket 14 physical-device
acceptance remains 15/16 and is not waived.

## Delivered

Slice 165 turns one Slice 164 task-materialized current-official input into an
executable, hash-sealed nine-node role graph:

```text
Planner -> Tutor -> Student
  -> Challenger -> Reasoner -> Fact Judge
  -> Proposer -> Generator -> Cross-Time Gate
  -> emit_candidate_skill (exactly once)
```

Planner, Tutor, Student, Challenger, Reasoner, Proposer and Generator use one
bounded role-executor port. Fact Judge and Cross-Time are separate deterministic
ports, so a generation model cannot judge its own claims. Every request binds
the task, staged-input, current source/Rules identity, graph, direct parent and
allowed context receipts. The executor can read only staged evidence and return
one typed role output; it cannot emit a candidate, reach the network or room,
mutate Rules, write Memory, publish a Skill or write training state.

Role outputs are size-bounded and exact-key validated. Raw prompt/response,
hidden reasoning, tool-call fields, candidate-emission attempts and
credential-like material fail closed. Claims are normalized by the trusted
runtime into content-hash, locator-hash and—when legality is claimed—current
Rules-receipt references. An unstaged evidence ID or a legality claim backed
only by a product record is rejected.

## Correction and candidate lineage

The verifier exercises a real correction path inside the contract:

1. Tutor emits a source-bound boundary claim.
2. Challenger targets it with an illegal-boundary probe.
3. Reasoner concedes that the wording is too broad.
4. The independent Fact Judge records `MISSING_NEGATIVE_BOUNDARY`.
5. Proposer binds the failed claim hash, Judge receipt and failure code into one
   revision target.
6. Generator creates a new claim with explicit `supersedesClaimId` and
   `correctionTargetId`; the failed claim is not silently edited or included in
   the candidate.
7. Cross-Time re-judges every selected candidate claim, replays the complete
   positive/negative Judge-test set and requires the exact current source and
   Rules bindings.

Every failed claim must have exactly one disposition: one corrected claim that
is actually included in the candidate, or one explicit unresolved record. The
consumer-side verifier reconstructs all nine requests and outputs from the
receipt chain, reconstructs the candidate hash, and checks its evidence and
authority independently.

The model-facing Generator only returns a candidate draft. After Cross-Time
passes, a trusted cardinality controller invokes the typed
`emit_candidate_skill` port once. Zero calls, a second call, a mismatched
acknowledgement, stale Cross-Time binding or a failed candidate claim rejects
the run. The emitted artifact remains `candidate_unreviewed` with all of
`humanReviewed`, `canAffectStrategy`, `canAffectRules`, `promotionEligible`,
`mayPublishSkill`, `memoryWrite` and `trainingTruth` false. Ticket 18 retains
durable evaluation, promotion and rollback authority.

## Verification

- Slice 165 focused role-graph checks: 20/20;
- Slice 164 current-official evidence regression: 15/15;
- complete Ticket 15 -> Ticket 16 -> Slice 163 -> Slice 164 -> Slice 165
  aggregate: exit code 0;
- hostile cases cover hidden reasoning, self-emission, credentials, unstaged
  evidence, missing Rules receipt, incomplete Teach answers, unknown probe
  targets, forged revision lineage, Generator plan drift, Cross-Time Rules
  drift, failed re-judgement, zero/multiple emission and forged emission ack;
- no external Provider request was sent by this Slice or its aggregate.

Artifact identities:

- role graph:
  `20246d7c90478a4150951a0e9e752cbc94685bd59e91993196dae2859abda639`;
- representative staged input:
  `cf0cc9ec917c3130993f997e5d965356d7e99ba6745d8f884f8616d8de3e9570`;
- deterministic test run:
  `063d7767059b5e4e22c001f8c360f952a3560c2a1ae49474ca3c71bd8ee7c21c`;
- deterministic unreviewed test candidate:
  `7129c81f6bba2552d2893f4ecc6136f40cececf9599e6cd604adad07f90fc6cd`;
- focused report:
  `b8fef305491c5aae45acf5010ea598d43ae6ae6bf83b6ad38d48e9d18b5f00ad`.

The candidate above was produced by a deterministic verifier executor and
accepted only by an in-memory test port. It is not a DSH/model result and was
not written to a production Skill registry.

No source refresh, DSH install/run, real model call, persisted Skill candidate,
promotion, Memory write, self-play, MuZero export or training-truth mutation
occurred. Provider usage for Slice 165 is exactly zero input/output/cache/total
tokens and zero estimated cost. Slice 166 is next: prove disposable OS
isolation and the capability firewall before DSH is installed.
