# Ticket 23 / Slice 248 — B92 Worker deadline classification

## Authoritative stop

Original common-v17c1 monitor requested a common stop at 11:18:38Z after B's
`provider_worker_protocol_rejected` High. The originals closed at 11:44:15Z.
The last A observation driver did not exit on SIGTERM; after its host exited,
its birth identity, native A89 and completed seat requests were checked before
terminating that driver. No Room, accepted action or stored response was deleted.

Native signed accepted boundaries are A89/B92/C94, cumulative149/170/185,
all R3 Movement. C94 is ahead of its last complete Web action row C93:
capture/reconcile the already accepted result, never execute it again.
Six latest seat choices contain no unfinished dispatched request. B92 retains
one completed paid query return and one failed possible-egress request with
unknown usage; the failed request has no complete output to reuse. Its internal
1,091,529-unit full reservation is not a measured Provider invoice.

## Proven defect and uncertainty

The actual production stack uses Worker Port V1. Its parent result deadline
called the same kill path as an invalid IPC message, unconditionally returning
`PROVIDER_WORKER_PROTOCOL_REJECTED`. The recorded failed attempt settled about
305 seconds after dispatch, consistent with its 300-second binding plus
5-second grace. No original IPC/deadline diagnostic was retained, so the exact
historical trigger remains unknown; do not rewrite the old record as a proved
network timeout or model hallucination.

The fix distinguishes the parent's missing-result deadline as
`PROVIDER_WORKER_RESULT_TIMEOUT`. It does not claim the remote transport timed
out, preserve a nonexistent output, relax wire validation, retry automatically,
change fees, or change any game strategy/Rules/prompt/Skill.

## One scoped red/green verification

`scripts/verify-ticket-23-slice-248-worker-result-timeout-v1.mjs` uses the actual
V1 parent port and the existing independent local IPC fixture. Its new
`no_result` mode reproduces the concrete deadline; the other branch confirms
that an unrecognized message is still a protocol rejection.

- Red PID24042/exit1: expected result timeout, observed protocol rejection.
- Green PID24303/exit0 after the minimal parent-code change: both distinct,
  possible-egress/one physical attempt retained, automatic retries0.
- Provider calls0, Room mutations0. No old passed gate or unrelated build rerun.
- An initial REPL wrapper lacked a `process` global; no verifier process started
  in that wrapper. It is not counted as a bug reproduction or additional test.

Evidence: `build/ticket-23-three-arm-performance-baseline-20261010-v1/`
`common-v17c1-B92-worker-stop-evidence-20261011.private.json`.

## Continuation and future performance gate

Resume only the original three stores under a common correctness-only source
manifest, preserving Plans, roster, accepted dice/actions, complete paid returns
and the failed unknown-usage entry. The owner's standing recovery authorization
permits an explicit B92 recovery cycle; do not give A/C a new retry permission.
A new failure still stops the whole batch. This is not proof that network
reliability has been fixed.

### Actual original continuation, 11:55–12:01Z

All original entries passed exact roomId/dataDirectory matching. Common
correctness-only source `s248-v17-correctness-worker-deadline-v36-20261011`
retained the already promoted v17 performance seams; 34 tracked runtime source
files still matched the manifest when Web drivers launched. Hosts28625/26/27,
Web34172/73/74 and birth-bound monitor34176 are live. No new Room/epoch, Plan,
roster, Rules/data or performance candidate was introduced.

Web recovered the already accepted C94 movement: original receipt919bd37a…6659,
state99862b52…5b77, Replaytrue and board/control images0587/0588. It was captured,
not reexecuted. The later new C95 finish_activation also has Replaytrue and
new screenshots; do not confuse the latest row C95 with the original C94
reconciliation evidence. A/B first new sealed actions remain pending here.

B's same92 choice kept its original first paid output byte-identical and the
failed unknown-usage attempt intact. Explicit retryCycle1 produced a completed
new response (360,653 input/12,384 output units), followed by a pending request
which was not redispatched. Observation TimeoutErrors are not restart authority.
These are continuation facts, not full-match/strategy/performance acceptance.
Evidence: `common-v17c2-original-continuation-observation-20261011.private.json`
in the same three-arm evidence root; monitor/handles/manifest use common-v17c2.

At12:06Z all three originals have new sealed actions. Latest captured rows are
A91 movement, B93 finish_activation, C95 finish_activation, cumulative151/171/186,
allR3Movement. All have Replaytrue and existing board/control images. The
`common-v17c2-first-original-sealed-actions-20261011.private.json` artifact is
the first all-arm resumed-closure observation, not each arm's exact first new
action (A90 preceded A91). This supersedes the earlier pending A/B snapshot.
No new common stop was present at the last monitor observation. Full rounds
and matches remain incomplete; no performance promotion follows from this.

No v18/v19 performance candidate is loaded. Future optimization admission still
requires one FULL common-version round for EACH A/B/C arm, matched per-type
median and extreme cases both at least40% faster, zero measured regressions and
identical complete results. Partial R3 does not qualify. Rebind any isolated
candidate to the new common baseline before comparing; the prepared v19 view
still names the old v35 baseline and is not an admission artifact.

T23 33/36, T27 5/6; remaining S248/S272/S249/S250. Full matches0/12.

`harnessLoopUsed=true`; `targetGames=[starcraft-tmg]`;
`promptPackRoutes=[selfplay_agent_prompt/json_channels_v1]`;
`harnessToolsCalled=[readonly original SQLite receipts/choices, local IPC repro]`;
`uiTraceEvidence=original C94 capture/Replay/board+control images and new C95`;
`agentDecisionEvidence=original first paid return retained, no new strategy claim`;
`memoryTraceEvidence=original Plans and stores preserved`;
`trainingTraceCandidates=[]`; `trainingTruth=false`;
`rollbackOrDemotionRules=new runtime High stops all, performance gate independent`;
`userVisibleChecks=distinct scoped failure classification, original three services
and Web resumed, C94 preserved, B paid prefix retained; full acceptance pending`.
