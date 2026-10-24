# T27 / S272 — ordinary evidence-reader continuation v288

## Delivered

Ordinary saved-reader continuation now bypasses already-completed Native scene
preparation. It requires completed investigation operations, no unfinished query
recovery and an existing reading/completed reader at the synthesis boundary.
Frozen source validation, original evidence index, archive identity and saved
answer/read ledger remain intact. This is not a new review allowance.

## Actual failure and focused verification

- Actual A ordinary resume, not an explicit review fixture, first failed on
  `UNNEEDED_NATIVE_REHYDRATION:labDescriptor`.
- First optimization attempt changed the archive identity. The fixture also used
  an older capability catalog; it was corrected to the actually delivered A185
  catalog while preserving raw frozen geometry. Identity still differed.
- Source inspection found the new fast path had also skipped original-evidence
  indexing. Projected context still refers to those originals. Restoring that
  existing index, while bypassing only Native preparation, fixed the mismatch.
- After the three-attempt stop, used the standing authorization for one focused
  verification after a concrete fix. `verify-slice272-normal-reader-resume-v288.mjs`
  passed: actual 3 saved steps, identical archive/answers/read manifest/history,
  zero Native preparation, zero Provider/Rules calls. Script elapsed 91.441s
  under the six-actor workload; this is NOT a production latency comparison.
- A separate read-only in-process diagnostic exceeded60s and reset only its
  inspection REPL. All six detached product processes remained alive. Do not
  repeat full-history projections in the inspection REPL.

## Live observation and next dependency

A real v287 reader had20 saved pages and8 model-authored answers. The answers
used document IDs such as `context:/mission` and `plan:/scoreRoute` as receipt
references; the existing qualifier does not accept those IDs. Presence of eight
answers is therefore not acceptance. v289 must provide source-owned citation
repair feedback inside the same reader, without regenerating evidence or
automatically replacing the model's argument.

The v288 code was not hot-loaded. Six maintenance pause markers request safe
drain of paid requests before the common v288/v289 continuation. A/B retain their
v264 sessions; C–F retain v274. No rooms, roster hand-edits, bill resets, source
refreshes, commits, or subagents. Final acceptance0/6; T27 5/6, T23 33/36; remaining
main slices272/248/249/250=4.

## Harness evidence

- harnessLoopUsed: true
- targetGames: StarCraft TMG
- promptPackRoutes: Teach synthesis reader / iterative roster planning
- harnessToolsCalled: saved-evidence reads and local continuation verifier
- uiTraceEvidence: none; no UI change or UI acceptance in this check
- agentDecisionEvidence: A saved eight answers, not yet valid final conclusions
- memoryTraceEvidence: original same-game evidence/ledger retained
- trainingTraceCandidates: none promoted; trainingTruth=false
- rollbackOrDemotionRules: archive/ledger drift or repeated Native preparation
- userVisibleChecks: resume preserves original arguments; invalid citations stay unaccepted
