# S272 v302 — Owned reads and encoded checkpoint snapshots

## Evidence and scope

Previous turn was progress: v301 fixed saved-ledger handoff; C and E left
readonly synthesis through actual model finish operations. This turn confirmed
F also reached iterative selection and A reached query recovery. No final
planning admission or battle is claimed.

At 11m13s live process age, each process had accumulated roughly 8m28s–10m50s
CPU time. Persisted session files were A117MB/B100MB/C77MB/D47MB/E45MB/F58MB
(decimal). A one-second native sample of B PID66811 captured its main thread
inside `structuredClone` deserialization. This identifies a local cost; it does
not establish that every slow period has the same cause.

Ranked hypotheses: redundant clone after file decode; whole-session clone
before each checkpoint encode; repeated evidence projections. The first two
were confirmed in the file-backed product path. Projection work is not changed
or claimed solved here.

## Change

- The file store explicitly guarantees that load returns an independently
  owned JSON graph. The session service avoids copying that graph again.
- The file store offers `prepareSave`: synchronously capture immutable encoded
  bytes before the asynchronous write queue, then atomically commit those
  bytes. The session service avoids cloning the entire graph before encoding.
- A later pause intent still wins. Only that uncommon race decodes the captured
  bytes to set the pause flag. It cannot change captured evidence or accounting.
- Stores without either optional capability keep the old defensive behavior.
- No prompt, strategy, query result, saved receipt, source hash policy, roster
  or fee counter changed. Existing JSON schema stays readable. This optimizes
  the iterative B–F path; A's separate store is not claimed accelerated.

## Focused verification

Actual read-only B reproduction:

`node scripts/verify-slice272-owned-checkpoints-v302.mjs <B generation>`

RED: one redundant whole-session clone,6088.74ms for the product read.
After the production change: zero such clones,3298.86ms. The real checkpoint
path also reached zero whole-session clones. This single observation is about
46% lower for that read, **not** a repeatable full-call speedup claim; concurrent
load and session contents may vary.

The first post-change gate then exposed a test-only path mistake:
`journeyCheckpoint.current` should be `journeyCheckpoint.workflow.current`.
That fixture assertion was corrected. Only the remaining checks resumed using
the already-saved isolated fixture; passed read/timing/copy checks were NOT
rerun. Remaining checks passed: snapshot-before-yield, immutable captured
evidence/accounting, later pause precedence, independent loaded objects and
legacy store isolation. Zero Provider/Native calls; no writes to real sessions
from verification. Fixture is under build/s272-owned-checkpoint-v302-RUfQSh.

## Runtime handoff

Safe drain requested for all six v301 sessions before a common v302 resume.
Do not restart on observation timeout. Preserve all paid replies and original
draft identities. New code is not yet claimed active until actual PIDs resume.

## Strategy follow-up

C revised its Plan at r9 and opened another Teach; this is substantive flow
progress, not acceptance. Its public rationale contains a visible inconsistency:
it gives an opponent route of14in versus its own13.75in, then calls the opponent
route shorter. Keep this as a final semantic-review check; do not hand-edit the
model's Plan or silently treat receipt binding as a verified interpretation.

T27 5/6; T23 33/36; six-arm final admission0/6; remaining main slices4.

## Harness record

- harnessLoopUsed: true; targetGames: StarCraft TMG.
- promptPackRoutes: unchanged; planning and Teach retain their original routes.
- harnessToolsCalled: original product read/checkpoint boundaries; no Rules calls.
- uiTraceEvidence: none; no UI change.
- agentDecisionEvidence: C r9 Plan revision; A query recovery; E/F selection.
- memoryTraceEvidence: all saved evidence and accounting retained; no pruning.
- trainingTraceCandidates: no provisional answer admitted as training truth.
- rollbackOrDemotionRules: aliasing, late snapshot mutation or lost pause intent
  blocks deployment; benchmark does not replace semantic admission.
- userVisibleChecks: product continuity and real material-gap resolution pending.
