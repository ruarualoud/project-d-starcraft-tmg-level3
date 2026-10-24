# S272 v298 — transport references are not evidence

## Scope and current status

T27 5/6; T23 33/36; remaining S272/S248/S249/S250 = 4.
Six-group final admission remains **0/6**, full battle experiments **0/12**.
No rules/data/Skill refresh, roster edit, manual Plan answer, new room or battle.

The previous turn was concrete progress: v297 fixed cross-Teach original
availability and the Plan handoff. Actual v297 processes were rechecked alive;
observation waits were not treated as production failures.

## Actual symptom

Saved F108 input, question3, returned `originalQuestion` as:

```text
evidenceObjectHash: 21bf150e…d7b9
sameContentAsEarlierObject: true
retrieval: retained_evidence
```

The exact original is present in F snapshots2/3 as
`q3-budget-completion-alternative`. In the actual answer the model cited the
transport hash and `/sameContentAsEarlierObject` as evidence. Similar wrappers
appeared in questions2/8. This is a real delivery defect, not proof that the
underlying Rules query never ran or that the model cannot reason about it.

Ranked diagnosis: (1) reader exposes transport stubs, (2) original missing,
(3) model misreads an already-delivered original. The saved question and actual
reader reproduction confirm (1); (2) is false for this exact object. The model
still remains responsible for its interpretation of the original.

## Repair

Only `roster-teach-synthesis-reader-v1.mjs` product behavior changes:

- Exact same-prompt pointers and retained handles resolve automatically during
  reads and path traversal. Models see original questions/results rather than
  compression flags. No fuzzy field matching or fabricated receipt is added.
- Expansion remains bounded by the existing read window. Oversized originals
  expose child paths/pages; every original stays queryable. Missing originals
  are explicit `reference_error`, not a fact-like stub.
- Source/archive hashes, saved answers, counters and original paid pages remain
  unchanged. Presentation of old pages is refreshed readonly; if expansion fills
  the current delivery window, the exact address remains available for a
  separate read. This is not a new Native query or a new investigation.
- Question navigation no longer displays a compressed transport object as the
  question. Model-authored hypotheses remain hypotheses, not observed facts.
- Runtime requests identify this presentation as `transparent_originals_v2`.

## Focused verification

Command: `node scripts/verify-slice272-transparent-reads-v298.mjs <F-dir>`.

- RED on actual F108: reader delivered a transport stub instead of its existing
  original question. The assertion's full expected-object diff was clipped by
  diagnostic output capacity; assertions were changed to compare hashes, not
  to change the expected semantics.
- One GREEN after repair: actual original recovered, both compression forms
  transparent, deep path lookup works, expanded pages stay bounded, missing
  originals remain explicit, source/archive/reader unchanged.
- Provider calls0; Native calls0. No already-passed gate rerun or full suite.

## Before loading

Last observed v297 reader states: A219 errors0/unresolved2;
B124 errors0/unresolved1; C110 errors11/unresolved5;
D118 errors2/unresolved3; E158 errors6/unresolved4;
F111 errors6/unresolved3. These are reference/coverage counts, not an evaluation
of final strategy quality. D is still a 1150-point provisional roster; the
other fresh groups have 2000-point candidates, not final admission.

Normal pause markers request a safe common-code switch after each current
dispatch settles. Existing bills/unknown fees and sessions are preserved.

All six v297 processes settled and exited before the switch. A220 was prepared
but never dispatched; it is not an extra paid reply. Same-session v298 processes:
A38537/B38539/C38541/D38543/E38545/F38547. Each generation directory contains
`resume-transparent-reads-v298-20261017.log`; released markers are retained.
No recover-unstarted flag, counter refill or experiment recreation.

Settled current-generation usage: **820 calls, 114,030,039 input units,
2,702,522 output units**. Since the preceding recorded boundary: +30 calls,
+753,705 input, +140,848 output. Old generations and unknown fees remain separate;
these token/unit counters are not an independently verified provider invoice.

## Harness record

- harnessLoopUsed: true; targetGames: starcraft_tmg.
- promptPackRoutes: teach_framework_synthesis_step; no strategy-weight injection.
- harnessToolsCalled: readonly synthesis read/answer/finish; no Rules execution
  in the regression.
- uiTraceEvidence: none claimed for this backend protocol correction.
- agentDecisionEvidence: saved F108 question pages and citation feedback.
- memoryTraceEvidence: same archive and paid reader ledger retained.
- trainingTraceCandidates: none promoted; trainingTruth remains false.
- rollbackOrDemotionRules: reject if an original is changed, a transport handle
  becomes Rules proof, a read becomes unbounded, or saved reading progress resets.
- userVisibleChecks: corrected original question content is read through the
  same product Teach interface; six actual continuations still need observation.

Next: observe real request delivery and subsequent model-owned corrections;
finish material unknowns and Plan reasoning before final admission. Do not
substitute zero reference errors for complete strategic coverage.
