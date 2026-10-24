# Ticket 27 / Slice 272 — Kimi terminal truth and retained shard resume

Date: 2026-10-15. T27 5/6; T23 33/36; remaining main slices 272/248/249/250 (4); accepted full games 0/12. All four games remain stopped. This does not close Teach or promote candidate Plan20.

## Observed v227 outcome

The original three-batch independent review terminated, not stayed live:

| Batch | Result | Reported input/output tokens | Adapter latency |
|---|---|---|---|
| 1 | Completed; schema-valid public answer retained | 112637 / 25755 | 574732 ms |
| 2 | Completed; schema-valid public answer retained | 103283 / 4897 | 132238 ms |
| 3 | Kimi internal connection/timeout failure; no public answer | Unknown | Kimi turn 201027 ms |

Settled usage of the two completed batches totals 246572 tokens; subscription money is unreported. The failed batch recorded three `llm.request` events and two internal retries: APIConnectionError then APITimeoutError. These are recorded attempts, not a claim that every request reached billing. None is assumed free.

The session's `turn.ended` says `reason=failed`, `error.code=provider.connection_error`, `error.name=APITimeoutError`; `prompt.completed` also says failed. The ACP call nevertheless returned, and the adapter attempted to parse its empty public text, hiding the transport failure as `Unexpected end of JSON input`. This is neither a proved capacity rejection nor the host's 600-second deadline. The earlier ten-minute limit applies separately to each logical prompt, not the entire review; Kimi may have shorter internal request limits/retries.

## Source fix v228

`kimi-code-shadow-deliberation-v1.mjs` now projects a small, public protocol-only terminal record before parsing. It captures terminal reason, error code/name, retry counts, recorded request count, usage, context and public-output size. No thought/message bodies or arbitrary provider error strings are copied. A failed turn becomes `ROSTER_WORKSPACE_KIMI_TURN_FAILED`; empty otherwise-successful output gets a separate error. Failures emit a failed-round event, and cancellation's zero counters remain unknown rather than free. There is no host automatic retry or production-provider change.

Focused fixture reproduces the real ACP/internal-terminal mismatch through the actual adapter. One RED failed the required typed error; one GREEN passed terminal classification, three attempts/two retry events, unknown usage, preserved context, exactly one failed event/no completed event, and private-text exclusion. No model/Native/source-draft writes. Do not rerun this passed gate.

Evidence: `build/ticket-23-three-arm-performance-baseline-20261010-v1/common-v228-terminal-{red,green}.private.json`.

## Third-batch-only recovery v229

The existing v227 runner has an explicit `resume-v227` mode. It imports the actual completed public answers and their original receipts through the workspace's existing context-bound retained-reply mechanism. It does not regenerate or charge the first two batches. The only live request must deep-equal the saved third request and have roundIndex 3; any other request is rejected before model dispatch. Maximum one new logical call, no automatic retry; Kimi's internal attempt count remains observable.

The runner now persists a compact review checkpoint, including retained public answers and new dispatch records, instead of relying solely on an in-memory shadow draft. Source Plan19, army, arrival schedule, original ledger and live rooms remain unchanged. Previous unknown charges and the v224 candidate-generation cost stay separate.

**Terminal update:** v229 completed at 05:21:35.829Z. Workspace explicitly recorded replayed rounds [1,2]; only shard3 was newly sent, context `def720c74e0f93075beba1bf38f50cb13507208eca21c0a948dcc52b54e3f257`. It took 425606 ms, 102840 input +15666 output =118506 tokens, one recorded Kimi request. Original draft unchanged. All three review shards are now complete; do not restart runner58367 or replay their paid requests.

Completed review hash `7c488df14eebc5a0e747507ce060c7c337388c674a7a280e818c2b15927ce26f`. It retains unchanged prior findings plus the new batches: 7 High /81 Medium /77 historical Low. These counts are reviewer findings, not source-qualified acceptance. The seven new High allegations concern scoring-round delta scope, marker-priority uniqueness, Combat Shield activation, Concussive Shells wording, 30-mineral saving versus a 190-mineral body, small-composition Marauder upgrade costs, and duplicate Marauder capability. Source qualification is required; especially conditional wording must not be turned into a guaranteed-rule assertion.

Known K3 tokens in the temporary lane so far: tiny probe453 + candidate completion286825 + first two review batches246572 + third-batch recovery118506 =652356. Old incomplete requests remain additional unknown usage/fees; subscription money is not reported. This is not the overall DS ledger and does not reset it.

- Progress: `common-v229-B-kimi-review-progress.private.json`
- Checkpoint: `B/kimi-code-candidate-review-v229/workspace-review-checkpoint.private.json`
- Model profile: installed Kimi Code managed `kimi-code/k3`, tools[]/subagents[], original prompt.

## v230 qualification wiring and v231 original qualification started

The earlier historical-evidence change had a separate source bug in `reconcileReviewFindings`: it used unbound `plan` rather than `current.plan`. Fixed this one call site; the in-flight reviewer did not call it, so no reviewer restart was needed.

Validation history is intentionally explicit: the first fixture assumed a parent adjudication that was absent; the second actual old review had no High and skipped qualification; the third partial wrapper failed the stale-review precondition. None reproduced the intended runtime bug and none is counted as passing. Stop that fixture loop. After the explicit one-line source fix and the real full v229 result became available, use the standing allowance for one extra targeted validation: the original workspace with the actual complete review reaches the qualification request, includes the still-cited historical original, and leaves Plan/old draft unchanged. GREEN passed in ~17s,0Provider/Native. No constructed partial review is used for production. Do not rerun the green gate.

Evidence: `common-v230-qualification-plan-{red,red2,red3,green}.private.json`.

v231 uses the same runner in explicit `qualify-v229` mode, the original workspace qualification and its existing maximum3-call bounded correction. Runner69092 is confirmed live; session `session_c121b9f5-a527-4ab8-a7e2-8e2aa09a7210`, first context `85503bd591d820165e0014922589f7387acdfa2ff99b000680408151c92119ff`. No Native/game/production writes. Observe `common-v231-B-kimi-review-progress.private.json` and `B/kimi-code-candidate-review-v231/workspace-review-checkpoint.private.json`; do not duplicate a live request. Original source/fees and Plan19 remain authoritative.

Measured first qualification input918552 bytes (before schema wrapping): target claims86395, full claim catalogue205182, shared fact catalogue623625. The latter has3587 text leaves/576689bytes but only957 distinct text values; duplicate text itself accounts for31073bytes, so blindly deduplicating literal text alone will not eliminate most metadata/path cost. A compact reversible catalogue or source-bound retrieval could reduce input; neither is implemented or asserted strategy-equivalent here. Do not change the current request mid-flight.

## Remaining

1. Review is complete. Finish the in-flight source qualification; raw reviewer severity is not automatically a Rules verdict.
2. Repair any substantiated High through the existing bounded Plan-revision process; preserve valid strategy and mark Medium separately.
3. Complete A's original Omega Worm fact investigation; no new A call in this change.
4. Only accepted plans may enter the common game chain. No room reinitialization, data refresh or game startup here.

Input batching remains a separate optimization: current review still repeats roughly 100k input tokens per batch. This recovery proves completed-batch reuse, not smaller input or better strategy/latency. A future projection must preserve the full strategic frame and access to exact evidence, not silently truncate it.

Harness: harnessLoopUsed=true; game=StarCraft TMG; route=offline final_plan_review; tools=existing retained replay (no Native); UI trace=not applicable; trainingTruth=false; candidate not promoted. Skill guidance kept failure provenance and independent review separate from strategic truth.
