# S272 retrospective: throughput, recovery and convergence

2026-10-16, Asia/Shanghai. Scope: current conversation and fresh-v264 A/B under
`build/ticket-23-three-arm-performance-baseline-20261010-v1/` in this worktree.
This is diagnosis, not implementation or complete product acceptance.

## Outcome

- A stopped at 15:12:05: Plan6 source review accepted after qualification; Teach has
  five unresolved questions. Query-delta preparation crashes before asking the model.
- B stopped at 15:54:36: revision4, legal2000, same army as revision3. New Teach
  crashes while preparing recovery of an ambiguous query. This is not a network error.
- A's source review converges. B's army budget converges, but its current Plan/Teach
  does not demonstrate convergence. Neither may enter a new game yet.
- Counts unchanged: T27 5/6, T23 33/36, main remaining S272/S248/S249/S250, full0/12.

## Findings, ordered by severity

### High: recovery assumes the request is already well formed

A actual saved request is a scenario. Its unused root `argumentsJson` is the empty
string required by the broad wire shape; the real failing child is
`/toolRequest/followUps/0` (`SCENE_QUERY_OUTER_ARGUMENTS_UNBOUND`).
`roster-teach-query-delta-v1.mjs:rosterTeachQueryDeltaBaseV1` recursively parses every
`argumentsJson`, including the unrelated empty root. It throws
`ROSTER_TEACH_QUERY_DELTA_ARGUMENT_JSON` before a model correction is requested.
Saved operation has zero choices. A's following-query JSON is itself valid.

B actual agenda has `kind=probability`, `queryKind=attack_probability`, with
attacker/target fields outside the nested arguments. Another query mixes
`kind=map_route` with `queryKind=map.route_access` and outer route selectors.
The original evidence adapter correctly records these as unknown. However,
`roster-teach-query-recovery-v1.mjs:426` normalizes the same failed request again,
outside a local error boundary, throwing `ROSTER_TEACH_QUERY_DISPATCH_AMBIGUOUS`.
The original error becomes an unrecoverable error in its own recovery path.

Both defects were reproduced once from actual saved records with direct Node module
invocations and assertions: A `rosterTeachQueryDeltaBaseV1` throws at delta line58;
B `recoverRosterTeachQueriesV1` rejects at recovery line426 before the mock correction
port can defer. No Provider, Native execution, state-file edits or old green reruns.

Required fix: one request preparation/result boundary for initial queries, repair
preparation, replay and execution. Decode only the selected tool's active argument
locations; preserve unrelated successful siblings. Invalid/ambiguous model input
returns typed correction feedback, with raw input and failed path retained, rather
than escaping the workflow. Genuine authority/storage failures remain hard failures.
Do not invent missing strategic values or silently choose a different tool/target.

### High: evidence text survives a Plan revision, executable scene dependencies do not

B r3→r4 keeps the same candidate hash and frozen context. r4 references three branches
that actually exist as advisory scenario receipts in r3:

- `q-opponent-branch-current-source-player2-movement`
- `q-capability-demand-current-source-assault-scene-wide`
- `q-post-loss-current-source-two-unit-branch`

The new snapshot copies the framework and only initial agenda question evidence
(`iterative-roster-draft-teach-v1.mjs:46–51`). Its evidence port registers scenarios
only from the new snapshot's agenda/investigation/recovery
(`roster-teach-framework-v1.mjs:1144–1152`). Old investigation scene recipes are absent.
Four r4 agenda questions and all five subsequent investigation operations report
unknown branch references. Two batches produce zero distinct new results.

Required fix: preserve a separate source-bound scenario/receipt registry across
Plan-only changes. Restore needed ancestors lazily from saved recipes/positions;
retain original receipt scope. Changing army, frozen map or rules invalidates the
affected dependency, not every unrelated fact. A receipt being readable is distinct
from its branch being executable/queryable. Do not rerun all old queries or accept
historical receipts under a different army.

### High: cosmetic Plan revision can reopen the full Teach without addressing feedback

B r3 and r4 have identical army hash. Exact comparison of six strategy fields gives
no change: scoreRoute, rosterRationale, mapRationale, openingSequence,
opponentHypotheses, counterPlans. Only revisionReason changes. The model's own reason
says it retained these fields and recorded the Teach findings in the explanation.

r2 Teach:9questions,9revise;9investigation batches/46queries/29distinct results.
r3 Teach:9questions,8revise+1unresolved;10batches/64queries/22distinct results.
r4 Teach:2batches/5queries/0distinct results before recovery failure; no synthesis.
These are differently worded questions and different army revisions, so raw question
counts are not a strict cross-version quality score. Nevertheless, no accepted
dispositions plus unchanged strategy fields do not support a claim of convergence.

Required fix: stable issue IDs tied to the actual claim/dependency, and an explicit
per-issue disposition: applied to a named Plan/roster field; retained with evidence;
or unresolved due to a named capability gap. An unchanged claim cannot be marked
repaired just because revisionReason changed. Teach may retain a defensible strategy;
it must not require cosmetic change or weaken a valid choice. Re-evaluate only changed
claims and their dependent evidence, retaining still-valid closed issues.

### High throughput: large payloads and serial repeated work

Completed-call observations from fresh-v264 only:

| Metric | A | B |
|---|---:|---:|
| Completed calls |83|55|
| Reported total units |7,402,148|14,359,513|
| Sum of recorded model latency |38.1min|55.8min|
| Model latency p50 / p95 |22.5s /54.5s|30.8s /153.9s|
| Encoded input characters p50 / max |173,690 /1,494,050|634,407 /2,662,947|

These are not end-to-end durations: they exclude local tools, human/network pauses,
unmeasured failed requests and restart gaps. Older ledgers and unknown fees are not reset.

A has53 source-review calls +11 qualification calls. This is not53 repetitions of one
review: Plans3,4,5,6 each have104claims/13shards; there are repeated full scans across
versions plus format recovery. Shards are serial in `roster-final-plan-review-v1.mjs`.
Incremental review code already exists; inspect why changed dependencies select full
review and bind reuse to actual claim dependencies before adding another cache.

B has21 investigation calls (33.4min) and24 query repair calls (8.0min). Its four
roster/Plan decisions account for4.3min. Most model latency is investigation/repair,
not choosing the final roster. Parallelism alone will not repair this loop.

A request84 prompt-node sizes before transport encoding: question/evidence
reconciliation1,042,523chars; current Plan/context379,244; historical investigation
claims32,409. Thus deleting history alone will not remove the main payload.
Use a stable compact current-state/issue view plus addressable evidence retrieval;
keep raw evidence outside the always-sent prompt. No arbitrary truncation or strategy
quota reduction. Bound independent shard concurrency only after their durable dispatch
and checkpoint handling supports it; do not parallelize dependent Plan mutations.

### Medium: navigation history overwhelms the current-state entry

Measured: CURRENT_WORK.md666,559bytes/8,445lines/272H2sections;
root PROJECT_MEMORY.md4,062,172bytes; root TASKS.md6,058,045bytes.
The latter two mix multiple games. Reading whole files exposes irrelevant and obsolete
instructions. Global Codex session files were not inspected (outside workspace scope),
and no measured percentage is attributed to the chat UI's internal context handling.

The existing environment verifier already caps CURRENT_WORK at120lines/16,384bytes.
Current size violates that existing contract by40.7x bytes; no new rule is needed.
The only checked workflow runs the environment verifier, on PRs and one named push
branch; no local .husky hook or lint/typecheck/test umbrella was found in this worktree.
The current bug scripts are not registered in package scripts or that CI workflow.
This is a wiring/enforcement gap, not a claim that the repo has no tests or no CI.

Recommended environment change: keep one short current-state pointer, archive history
without deleting evidence; a read-only status projection reports real PID, generation,
stage, semantic delta, unresolved issues and last failure. Use the existing compact
navigation check on entry-document changes and a targeted recovery-contract check for
changed recovery modules. Do not run all historical gates for each edit.

My own inspection also expanded nested receipts and all package scripts unnecessarily,
creating truncated outputs. Status tooling must whitelist scalar summaries; inspect
one identified receipt only when diagnosing it. This is agent tool-economy debt, not a
reason to ask the user to repeat their requirements.

## Convergence verdict

A source-review issue entries deduplicated by claimPath/code:12→4→2; current qualified
effective High=0. Raw advisory findings still contain High values, but their saved
source-bound adjudication reduces those to Medium. This is real local convergence,
not global Teach acceptance. Current Teach:1retain,2revise,5unresolved of8questions.

B budget:920→2000→2000; real progress. Plan/Teach: no demonstrated convergence after
the2000-point revision. Same strategy, missing retained branch context and repeated
failed tool preparation are now the binding issues. No evidence establishes that a
model downgrade/upgrade or a new chat alone would solve them.

## Unified implementation batch proposed

1. Shared tolerant query preparation, typed per-tool feedback and scoped delta view.
   Deliverable: actual A/B failures both reach model correction without wrong-query execution.
2. Cross-revision scene/receipt dependency transfer for unchanged army/source.
   Deliverable: r4's three real prior branches queryable without new scene construction;
   changed-army/source cases remain explicitly invalidated.
3. Issue-level Plan change/disposition contract and incremental Teach.
   Deliverable: unchanged six-field Plan cannot masquerade as repaired; valid retained
   choices accepted with evidence, resolved issues stay closed until dependencies change.
4. Same product Run, no hand-edited strategy/army: observe A/B through final source/Teach
   admission. Record newly closed issues, justified reopenings, query reuse, latency and
   units. Local regression success alone is not completion. If progress stalls, return
   a concrete capability/error diagnosis rather than reset counters and start over.

Navigation cleanup and compact status should accompany this batch. Larger concurrency
and prompt-projection optimizations follow correctness, measured with unchanged cases.
This report does not change runtime code, models, prompts, room state, rules or fees.

## Primary records

- A: `A/fresh-generation-v264/progress.private.json` and
  `workspace/drafts/rws-5c8ed89c-06a0-4c29-910d-f33d17421516.json`.
- B: `B/fresh-generation-v264/progress.private.json` and
  `workspace/iterative-draft/sessions/872007cad4ca7e2bd785f7d8936cc2264d6eb800d55f7f610c0bf8f6a44c7025.json`.
- `request-084.private.json.gz` A prompt structure; public output/dispatch/event
  metadata only, no credential or private model reasoning export.
- Related source paths are named above; previous local green checks were not repeated.

Harness loop: roster Teach/fact-probe/source-review routes; readonly tool recovery;
real retained Provider/tool traces, no browser/UI acceptance this round; no training
promotion. Demotion rule: wrong scope, changed source or unresolved authoritative
claim keeps admission closed, while malformed model arguments must remain recoverable.
