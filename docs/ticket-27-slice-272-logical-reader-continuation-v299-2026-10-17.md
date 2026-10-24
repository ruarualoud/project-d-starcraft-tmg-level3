# S272 v299 — preserve the logical Teach across delivery refresh

## Progress / scope

Ticket27 5/6; Ticket23 33/36; remaining S272/S248/S249/S250 = 4.
Six planning groups finally admitted0/6; full battles0/12. No map/data/Skill
refresh, new room, manual roster/Plan correction or promoted training truth.

This follows v298 transparent reads. Both defects concern the same product
Teach path, not a separate experimental implementation.

## Production finding

The v298 observation caught an additional real defect rather than assuming
the local gate proved all resume behavior:

- C110→111: same eight questions and document byte counts, archive changed,
  completedSteps26→0.
- F111→112: same eight questions and document byte counts, archive changed,
  completedSteps25→0. The settled old reader actually contains26 paid steps.
- D118→119 and E158→159 retained their archives and progressed32→33/44→45.
- Original C/F readers remain in their existing `synthesisReaderHistory`.

The concrete destructive assumption is in the common resume path: any archive
hash change unconditionally replaces the reader with an empty one, even inside
the same frozen-source readonly Teach with every query already completed.
The exact lower-level contributor to those two rebuilt delivery hashes is not
isolated; equal byte counts alone do not prove byte-equivalent source nodes.
It must not be reported as a rule/source mutation or as a proven particular
serialization bug. No authoritative source checks are disabled by this fix.

## Repair and boundaries

- The shared framework delegates reader reconciliation to one function.
- The caller still validates frozen context+Plan, completed investigation and
  recovery operations, and absence of an explicit new synthesis review.
- Only that ordinary readonly continuation may recover its latest abandoned
  reading state with compatible question IDs. Its old answers remain drafts;
  current originals/citations are rebound before the next model step.
- Preserve every old/new paid step, manifest, pending read and saved answer.
  A new answer for a question wins over its older draft. Explicit new proposal
  lists stay model-owned. No-progress counts use the maximum, not zero.
- Recovery is idempotent and records the old/new archive identities and step
  counts. Original history objects and paid request records are not rewritten.
- A new/non-readonly inquiry records a history boundary and does not import
  old answers. Different question sets/version also do not cross the boundary.
- No source, runtime, receipt, room, Provider or billing identity is rebuilt or
  silently accepted as equivalent. Restored answers do not imply admission.

## Focused actual-record verification

`node scripts/verify-slice272-logical-reader-continuation-v299.mjs <F-dir>`

RED: actual current reader had2 steps instead of the recoverable28.
One GREEN after repair:26 old paid steps recovered plus2 new preserved;
answer precedence correct; history immutable; no-progress counter not reset;
repeated reconciliation idempotent; a subsequent delivery refresh retains the
same work; non-readonly changed source does not inherit answers.

Provider calls0, Native calls0. No v286/v288/v297/v298 passed gate rerun.
The real F history is the fixture; this is not a fresh room or invented Plan.

## Same-session live continuation

All v298 processes drained, settled and exited. A221 was only prepared, not
dispatched. Pauses were maintenance operations, not model/network failures.

v299 PIDs: A48366/B48368/C48370/D48372/E48374/F48376.
Per-generation log: `resume-logical-reader-v299-20261017.log`.
Normal resume flags/identities from CURRENT_WORK remain unchanged.

Current-generation totals at the switch:829 calls,114,198,568 input units,
2,741,858 output units. Since v298 boundary:+9 calls,+168,529 input,+39,336 output.
Previous generations and unknown fees remain; this is not an invoice or a
claim that all new steps have produced valid strategies.

## Material unknowns remain separate

Latest E snapshot still had four unresolved answers:

1. Opponent branch question asks for observable conditional triggers, while
   its answer demands already-revealed future live information. Possible
   question/answer scope mismatch; not evidence that future actions are known.
2. Terrain question asks route-profile witnesses and unchanged-position
   control. Its answer instead demands future exact arrival. Known route and
   baseline facts must be separated from unproved exact movement/control.
3. Ability/card exhaustion sequence still needs an appropriate Native sequence
   or a correct explanation of the supported evidence; inspection alone does
   not prove the sequence.
4. Post-loss Marine successor was not proved by the cited failed action. Do not
   replace missing casualty execution with a fabricated outcome.

These are diagnosis candidates from actual question/answer text, not host-written
strategic resolutions. Observe v299 originals and model-owned correction first;
then repair remaining source/tool capabilities or investigation handoff where
evidence shows a real gap. Zero citation-format errors is not zero material
unknowns, and a conditional strategy need not pretend to know future enemy moves.

## Harness record

harnessLoopUsed:true; targetGames:starcraft_tmg;
promptPackRoutes:teach_framework_synthesis_step;
harnessToolsCalled:readonly reader reconciliation/read/answer/finish;
uiTraceEvidence:none claimed for this backend recovery;
agentDecisionEvidence:actual C/F requests and F reader history;
memoryTraceEvidence:paid partial answers/read records preserved;
trainingTraceCandidates:none promoted;
rollbackOrDemotionRules:source checks weakened, old draft auto-admitted,
counter reset, paid step lost/duplicated or new inquiry inherits old answers;
userVisibleChecks:actual-record continuity gate, six ordinary Run observations
still required before full acceptance.
