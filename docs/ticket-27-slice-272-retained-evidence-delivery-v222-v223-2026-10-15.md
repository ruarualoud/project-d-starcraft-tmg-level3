# T27 / S272 — readable retained evidence and smaller revision input

2026-10-15. T27 5/6; T23 33/36; main slices272/248/249/250 remain4;
accepted full games0/12. All four games remain stopped. A Plan9/B Plan19 are
unchanged. This is an engineering repair and isolated model trial, not Teach
acceptance, strategy promotion, game acceptance or a closed Slice.

## Concrete defect

The saved B synthesis has15 bound numeric/qualitative citations. Two attack
probability citations use the exact delivered projection path
`computedOutcomes.0.outcomes.probabilityAnyCasualty` on receipts
`1fdcc89c…ec875d` and `0dd5c0e6…7f402`.

The citation binder accepted these paths and preserved their probability object
(35/36 and33/36 respectively, with uncertainty), but the retained-evidence reader
only traversed raw receipt structure. Reading the displayed citation returned
`ROSTER_TEACH_EVIDENCE_PATH_UNKNOWN`. This is an actual producer/consumer mismatch,
not model hallucination. It would also undermine an otherwise correct paged
input: a reference is not useful unless the model can read it.

## Implemented changes

1. `roster-teach-framework-v1.mjs`: the shared retained reader still prefers the
   original exact path. If missing, it accepts that path only in the deterministic
   displayed projection of the SAME receipt and labels
   `bindingView=delivered_receipt_projection`. No fuzzy field/receipt matching,
   new simulation or inferred number. Raw-path result shape stays unchanged.
2. `roster-revision-teach-evidence-v1.mjs`: revision deliveryv3 keeps the full
   current framework, agenda, synthesis, typed bindings, coverage, conditions,
   question history and source binding. All52 raw receipt bodies are indexed,
   not filtered by success or agreement with the strategy. Indexes expose source
   identity, fields, status/failure information and exact retained read requests.
   Full originals remain in the same archive. This uses revision's EXISTING
   read dialogue; one-shot synthesis is not changed into an inaccessible index.
3. The explicit temporary Kimi runner accepts a v223 trial using the new delivery.
   It checks the original output contract and all non-Teach nodes remain equal,
   keeps the prior unknown-fee trial and original B source read-only, and exports
   only a new candidate. Historical last repair entries are no longer mislabeled
   as this trial's repair when no new Plan exists. No production model switch.

## Exact scoped verification

Command, once RED and once GREEN:

```text
node scripts/verify-slice272-revision-retained-delivery-v222.mjs <base> red|green
```

Base is `build/ticket-23-three-arm-performance-baseline-20261010-v1`.

- RED: actual B saved state, both probability paths unknown,2≠0,5343ms.
  The observation REPL timed out, but the original process completed and its
  report was read; the command was NOT restarted.
- GREEN:12724ms, all15 bound values read exactly; all52 original receipt indexes,
  statuses/questions and899 original small fields match; all current Teach
  framework/agenda/synthesis/coverage/authority/source-binding text unchanged.
- The REAL workspace→revision→read dialogue requests BOTH displayed probability
  paths and delivers their full original probability objects to the next round.
  Model replies are test doubles at the original deliberation seam;0Provider,
  0Native,0original writes. Not proof of real model strategy quality.
- Every non-Teach node equals the saved actual B request, including full Plan,
  current claims, mission, schedule, verified facts and challenges.
- Actual input1545364→945554bytes: **−38.8135%**. Bytes are not tokens. Old draft
  and original Rules scene are unchanged. The focused gate is passed; do not
  rerun it or the old v211/v207 gates.

Files: `common-v222-revision-retained-{red,green}.private.json`.

A separate read-only check exercised only the newly archived LONG fields, not
the passed gate again:53 top-level fields above32768 characters,4933 recursive
retained reads, complete values equal originals,0errors/Provider/Native/writes.
Result:`common-v222-large-field-readback.private.json`. Thus the archive bodies,
not just their small metadata, are readable. This does not claim that a model
will choose to read every field or that its three read batches are unlimited.

## Live Kimi Code trial v223 — cancelled with a recoverable public prefix

The user authorized temporary K3 Code Plan validation. This is a changed-input
trial after a concrete source repair, not an identical blind retry of v221.

- Started03:59:28.260Z, runner87314, ACP87384.
- Session`session_58968917-9aa7-44be-8d87-2e45f3a335af`.
- Progress`common-v223-B-kimi-shadow-progress.private.json`.
- Isolated directory`B/kimi-code-revision-shadow-v223`.
- Full new input945554bytes; wrapped ACP prompt947898bytes.
- Context`822507bd08640fc123eb9bd5c83b0c7bf107a615bbca33d6539604c9a526400f`.
- Correct custom system/tools[]/subagents[] observed before send. At most4 logical
  deliberations through existing read-only evidence interface; each bounded10min.
  No Native, new fact investigation, roster changes or game startup.
- Prior v221r3 fee remains unknown. New subscription usage is a separate lane;
  a missing or cancellation-zero usage receipt is not proof of zero charge.

The host600s deadline expired and cancelled generation; finished04:09:47.768Z.
Runner87314/ACP87384 are confirmed exited. No new Plan, Native action or game.
Original B draft unchanged, historical repair/delivery entries correctly remain
null for this unsuccessful trial. One logical llm.request; cancellation usage
zeros are not a provider charge receipt. Client count258522 is not billed usage.

Important diagnosis correction: Kimi was NOT silent. Its saved assistant message
contains85431 characters of public JSON; existing JSON normalization confirms an
unfinished string, not a harmless missing fence. Sixteen of18 repair objects are
syntactically complete. Remaining paths are`componentPurposes.u-goliath-1` and
`componentPurposes.u-marauder-1`. One completed item has an additional
`claimPath_note` field; use existing schema-pruning later, not a new special case.
All are still unaccepted candidates, not independent strategic verification.

The prior v221r3 likewise saved22285 public characters and4complete items before
cancellation. Therefore its missing final result must not be described as total
provider silence. The ACP adapter counted text only in memory and did not publish
stream progress or save it on timeout; the CLI wire retained the recoverable text.
Both used K3's default high thinking, unlike the non-thinking DeepSeek profile;
they are not model-speed equivalence benchmarks. The larger v223 public prefix
is useful evidence, not proof of strategy quality or a controlled speed ratio.

One zero-model capture script,`capture-slice272-kimi-public-interruption-v223.mjs`,
copies ONLY public text (not think blocks) and complete parsed objects from both
terminal sessions. Files under each trial:
`turn-01.public-interrupted.private.txt` and `turn-01.complete-prefix.private.json`.
Summary:`common-v223-kimi-public-interruption-capture.private.json`.
Original context/Plan hashes and unknown charges remain separate; no prefix was
applied to production. Do not rerun either trial or the exclusive capture script.

## Remaining input volume, observed without rerunning a gate

The actual sent v223 request still has323371bytes of evidence indexes. Three
copies of the Goliath/Raptor scene each contain the same61531-byte nested status
index,328entries, because the original history repeats the scene. Those entries
were kept rather than guessing which failures mattered. Full current Plan is
188955bytes, current claims88143 and alignment46454. Exact duplicate interning
can be considered separately after this trial; do not silently drop strategy or
change a running request. This is a measured optimisation opportunity, not proof
of the cause of either model timeout.

## Remaining acceptance

1. Fix public stream progress/checkpoint observation at the temporary Kimi seam.
   Resume the two missing items with the complete shared original Plan plus the
  16 retained candidate edits visible. Allow coherent corrections to retained
   edits if needed; don't invent missing JSON text, throw away the prefix or
   restart an18-item rewrite. Merge/normalize through the original full contract
   and runtime, preserving unknown accounting. This recovery is NOT implemented
   or called in v223, and the current partial candidate is NOT accepted.
2. Verify the five existing B corrections against preserved evidence, without
   inventing a previously controlled marker in the null→null post-loss scene.
3. Complete A's native Omega fact investigation and review; then apply accepted
   plans through the product interface before same-code games. None is done here.

## Harness record / rollback

- harnessLoopUsed:true; targetGames:[starcraft-tmg].
- promptPackRoutes: existing roster revision / retained-evidence read; no live
  opponent/character prompt mutation.
- harnessToolsCalled: actual B workspace revision and retained-evidence interface.
- uiTraceEvidence:none (offline); agentDecisionEvidence:v223 pending; current
  strategy is unchanged source material, not a new model decision.
- memoryTraceEvidence: original archive and source Plan/fees preserved.
- trainingTraceCandidates:false; canAffectRules:false; trainingTruth:false.
- rollbackOrDemotionRules: unreadable references, altered original values,
  missing counterevidence or unreviewed model output cannot promote a Plan.
- userVisibleChecks: exact retrieval and reduced real input proved offline;
  full model generation/Teach acceptance remain distinct unfinished checks.

No subagents, installs, deletions, full builds, passed-gate reruns or commits.
Skill influence: diagnosis isolated an actual path mismatch; harness evidence
required a real consumer roundtrip; offline Teach rules keep trials out of games.
