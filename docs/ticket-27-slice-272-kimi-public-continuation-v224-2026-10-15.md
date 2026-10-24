# T27 / S272 — preserve interrupted public output and continue the missing batch

2026-10-15. T27 5/6; T23 33/36; remaining main slices272/248/249/250=4.
Accepted full games0/12. All games remain stopped. No production Provider change.

## Scope and diagnosis

The last user clarification correctly separates a **single model request's**
600000ms host deadline from the whole task. The temporary Kimi ACP Adapter uses
that deadline for each `session/prompt`; it is not a verified vendor limit and
incoming chunks do not reset it. v223 produced16/18 complete public edits before
cancellation, so neither provider silence nor an accepted full Plan describes it.

The actual Adapter also discarded public output on failure. A local fake ACP
process replays the actual85431-character public v223 prefix, then never answers
the prompt RPC. This uses the real Adapter deadline/failure path, not a mock of
the saving function. It does not invoke Kimi, any model, Native or live rooms.

## Changes

1. `kimi-code-shadow-deliberation-v1.mjs` now periodically saves public text,
   first/last activity and byte/character counts; on failure it saves an explicit
   interrupted checkpoint. It does not publish thought chunks or infer zero cost.
   Progress callbacks are serialized so caller report-file writes cannot race.
2. `roster-interrupted-revision-v1.mjs` provides an explicit offline continuation.
   It retains the whole original Plan/fact/Teach nodes and all complete candidate
   edits, asks for missing paths and optional coherent amendments, and merges the
   final result through the original schema. Exact unchanged original content is
   checked at preparation. Existing saved-evidence queries still use their original
   three-batch budget. The original generic pruning removes undeclared fields;
   there is no special case for `claimPath_note` and no invented missing text.
3. The shadow runner adds explicit v224 continuation. Physical request context
   and the original logical context are distinct. The final composition receipt
   includes the actual model receipt, retained-prefix provenance, new/amended
   paths and unknown old cost. It is NOT labelled a single model reply. Original
   workspace/draft/army/schedule/ledger remain read-only. Report saves serialize.

## Focused verification — complete, do not rerun

`node scripts/verify-slice272-kimi-public-checkpoint-v224.mjs <base> red|green`

- RED once: public checkpoint absent (`null` instead of the actual85431 chars).
- GREEN once: all85431 chars retained, original context, timestamps,
  `outcome=interrupted`, `accepted=false`, `chargeStatus=unknown`; private thought
  sentinel absent; progress observed.0model/Native/source writes.
- This proves interruption persistence, not strategic correctness of the edits.
- The continuation merge is being exercised through the actual workspace below,
  not a new unrelated test or repeat of v222's passed retrieval gate.

## Actual Kimi continuation — completed, candidate only

Runner11633 / ACP11728, session`session_c64909b6-4dc5-4346-b57d-ec5cd349a228`.
Prompt sent2026-10-15T04:24:59.275Z, original B Plan19:
`51aa309e1bd986be386a0e84589ea1c3efcdb7f03fd2ef4898c33e3e433a1863`.

Original logical context:
`822507bd08640fc123eb9bd5c83b0c7bf107a615bbca33d6539604c9a526400f`.
Physical continuation context:
`703c72c790886641b81381554c85e116983081357b7ae59faa1e0f8b0a9d05da`.

Pending paths: `componentPurposes.u-goliath-1`, `componentPurposes.u-marauder-1`.
All16 complete edits remain visible, and the model can amend any for coherence.
Input1029723bytes, ACP prompt1032067bytes. This trial reduces required output;
it does **not** claim smaller input (the retained edits add shared context).
Max4logical deliberations includes original read-only evidence requests, not
automatic retries. Each is bounded10min. No native tools/subagents in the profile.

Final evidence (terminal; do not restart):

- `<base>/common-v224-B-kimi-shadow-progress.private.json`
- `<base>/B/kimi-code-revision-shadow-v224/turn-01.public-progress.private.json`
- `<base>/B/kimi-code-revision-shadow-v224/turn-01.public.partial.private.txt`

Base is `build/ticket-23-three-arm-performance-baseline-20261010-v1`.
Old v221/v223 charges stay unknown. Kimi subscription usage is separately recorded;
neither old cancellation zeros nor missing amount are free.

Completed2026-10-15T04:31:56.135Z. Exactly one logical Kimi model request returned
both missing purposes,22373 public characters. No retained item was rewritten.
Original generic pruning removed the one undeclared `claimPath_note`; all declared
text values stayed unchanged. The composed18-path reply passed the original
workspace/runtime full contract and produced **candidate Plan20**:
`b36f3441fe13fc0e277c2c951dca0d62dbde5b465c975094841ad08d65732d47`.

- First public output04:29:18.880Z, approximately259.6s after prompt-sent.
- Adapter latency406376ms (~6m46s; includes final local observation/receipt work).
- Recorded usage273225input+13600output=286825tokens; subscription monetary amount
  not reported. Original interrupted v221/v223 charges remain unknown/separate.
- Original B draft, roster, opening schedule and old dispatch ledger unchanged.
- Exact coverage18requested/18replaced/0missing/0unchanged;0Native/0games.
- `candidate-plan.private.json`, `turn-01.assembled.private.json` and model receipt
  saved in the v224 directory. Source Plan19 remains authoritative.

This proves real Kimi continuation and complete candidate construction, not final
strategy acceptance or a successful complete Teach/game. Reducing output achieved
completion here, but ~260s to first public output shows that batching alone does
not establish acceptable latency. Input increased because all16candidate edits
remained available; this was not an input-capacity/speed equivalence benchmark.

## Next independent review — prepared without sending

`prepare-slice272-B-candidate-review-v225.mjs` invoked the original incremental
review's pre-dispatch preparation once, with originalPlan19+completed old review
and new candidatePlan20.0Provider/Native/source writes; no passed review rerun.
It returned `ROSTER_INCREMENTAL_REVIEW_DEPENDENCY_CHANGED:prior_facts_changed`
before producing a model request. Result:`common-v225-B-review-preparation.private.json`.
Full-review fallback was deliberately disabled for this read-only preparation.

At present this establishes a **fact-digest mismatch**, not which actual fields
changed and not that the new Plan is false. Next inspect original review evidence
against the current packet, distinguish substantive fact changes from projection
changes, and scope review to affected claims with evidence. Do not silently reuse
stale conclusions or repurchase a whole review merely because digests differ.
No independent semantic review was run in v225. A's native Omega evidence remains
unresolved; all four games remain stopped. The long goal and Slice remain active.

## Harness record

harnessLoopUsed:true; targetGames:[starcraft-tmg]; promptPackRoutes:offline roster
revision continuation; harnessToolsCalled:original revision/retained-evidence;
uiTraceEvidence:none; agentDecisionEvidence:preserved public candidate+pending
completion; memoryTraceEvidence:unchanged source Plan/archive; trainingTraceCandidates:
false; trainingTruth:false; rollbackOrDemotionRules:missing paths, source changes or
unreviewed merged strategy prevent promotion. User-visible check: interrupted work
survives, no full18-item restart. Skills influenced scoped reproduction, the
deliberation Adapter seam and separate offline acceptance. No install/delete/commit.
