# T27 / S272 — current-Plan Teach and performance observation v149

## Outcome

Teach was invoked on the actual current Plans: A9 and B19, in the same offline
workspaces. The prior learned framework, older Teach records, rosters and paid
history were retained. Neither Plan was applied to a Room; no match was started.
This is **not Teach completion** or full-chain/performance acceptance.

Both runs ended with `ROSTER_WORKSPACE_AMBIGUOUS_DISPATCH_STOP` after an incomplete
Provider transport response. A had three completed calls; B had no completed new
call. Each has one additional possibly-paid request with unknown outcome/fee.
The observers exited; hosts 4762 (A) and 8084 (B) were alive and idle at inspection.
Do not report these as running model requests or blindly repeat the v149 launcher.

T27 remains 5/6, T23 33/36, main remaining slices 248/272/249/250 = 4;
accepted complete games remain 0/12. All four games remain stopped.

## Delivered this round

- `scripts/run-slice272-current-plan-teach-v149.mjs`: starts the existing Teach
  service for a current Plan while retaining the learned framework and history;
  checks unresolved dispatches, verifies an idle prior owner before retiring it,
  starts without live-Room launch, observes the same request rather than resending
  after an HTTP observation timeout, and writes bounded progress metadata.
- Retired the confirmed idle duplicate B host 8699; the older A/B owners were also
  retired before their replacements started. Exact data-directory and idle status
  checks were retained. No data deletion or Room mutation.
- Observed real current-Plan Teach consumption. A corrected both marker-schedule
  query shapes, but scenario/map query errors remain; no final synthesis exists.
- Added the owner's performance requirement to the execution handoff with actual
  timing/units, not another benchmark run. No new test command or previously
  passed verification was run for this observation.

## Actual performance and usage

Times below are from retained runner/round timestamps and Provider receipts, not
estimates. They describe **offline Teach**, not a live game action benchmark.

| A stage | Provider latency | Total units | Result |
| --- | ---: | ---: | --- |
| Current-Plan question agenda | 55.526 s | 244,706 | Returned |
| Investigation 1 | 50.322 s | 270,624 | Returned |
| Investigation 2 | 49.142 s | 354,614 | Returned, identical output to investigation 1 |
| Investigation 3 | Unknown | Unknown | Transport failed; possibly paid |

A launch-to-failure window: 632.060 s. Launch/context preparation before the
first round: 132.557 s. Three successful Provider latencies total 154.990 s.
Between-round gaps: 98.145 / 85.713 / 72.786 s. These gaps include tool execution,
context construction and persistence; existing records do **not** isolate their
individual shares. Do not label the whole gap CPU calculation or disk I/O.

B launch-to-failure window: 222.709 s; pre-round initialization/context:
96.226 s; failed agenda round wall time: 124.164 s, without reliable Provider
latency or usage. This is not evidence that B costs zero.

Known new usage: A 3 calls / 869,944 units; B 0 completed calls / 0 known units.
Cumulative known usage: A 107 / 20,113,596; B 199 / 22,275,676. Two uncertain
attempts remain separate and are not erased from the ledger. No monetary amount
is invented without the applicable retained billing basis.

### Confirmed overhead vs unproved regression

1. The two investigation outputs have the same full output hash, while dispatch
   IDs, context hashes, request-body hashes and Provider receipt hashes differ.
   Thus a second paid dispatch returned no new content: 354,614 units / 49.142 s.
   This alone does **not** prove a local cache bug or a specific Provider cause.
   Existing duplicate-query handling kept repeated failed tool requests marked
   unresolved; it did not prevent the repeated paid model answer.
2. Investigation input increased from 265,281 to 349,271 units. Necessary newly
   visible evidence must not be removed merely to reduce the number. Inspect
   duplicate context and the freshness of model-visible feedback first.
3. Current persisted drafts are A 146,402,275 bytes and B 54,190,059 bytes. Large
   snapshots plus the round gaps warrant persistence profiling; their size alone
   does not establish I/O as the cause.
4. The three successful calls are about 49–56 s. They are different requests,
   not a controlled old/new case comparison; no median/tail improvement or
   no-regression claim is justified yet.

## Current blockers and next deliveries

1. **Teach network recovery integration:** the shared dispatch reconciler and
   final-review lane already support a bounded exact-request recovery with the
   owner's standing network-resume consent and preserved unknown fees. Teach's
   entrance currently rejects ambiguous requests without that integration and
   does not pass a retry dispatch to its live port. Reuse the shared mechanism;
   do not clear counters/statuses or create another independent resend policy.
   Delivery: exact original request resumed once or durably reconciled, prior
   known outputs reused, no duplicate live owner or silent fee loss.
2. **Actual Teach query closure:** A's current map inspection lacks the route
   adapter's required identity; scenario follow-ups use unsupported kinds, and
   some formation hypotheses fail. Initial canonical spatial requests also carry
   nonempty legacy outer selectors. Diagnose the shared request contract and
   current feedback visibility, not one-off renamed fields or manual strategic
   answers. Delivery: model consumes correct tool evidence and genuinely answers
   the original A3/B4 topics plus the current agenda; success elsewhere must not
   erase unresolved topics.
3. **Final Plan acceptance:** apply the accepted Teach results through the real
   Plan workflow and verify the resulting A/B Plans. Current A9/B19 are unchanged.
4. **Unified consumers + performance, AFTER Teach closes and BEFORE new games:**
   audit roster/initial Plan, live Planner, Action/Native, Plan revision/memory and
   replay/skill-evolution readers. For directly affected representative cases,
   compare model/tool/retry/total time, units/cost, median/tail and parallel
   contention. Keep cold/restore overhead separate from hot action. Preserve
   baselines and all strategic information; no unrelated or already-passed gate
   reruns. Record necessary added work separately from avoidable duplication.

## Evidence

All paths below are under
`build/ticket-23-three-arm-performance-baseline-20261010-v1/`:

- `common-v149-A-current-plan-teach-progress.private.json`
- `common-v149-B-current-plan-teach-progress.private.json`
- `common-v149-teach-performance-observation.private.json`
- `common-v149-B-retired-duplicate-host.private.json`
- A/B workspace drafts selected by `common-v79-plan-recovery-config.private.json`
  retain original public outputs, dispatches and Teach state.

No private credentials are included in this report. No source refresh, installs,
subagents, commits, broad verification or cleanup occurred. The observation
artifact stores compact references/metadata, not another copy of either draft.

Harness boundary: `harnessLoopUsed=true`, target `starcraft-tmg`, Teach evidence
routes only; no new UI acceptance, no Skill promotion, `trainingTruth=false`.
Any incomplete, contradictory or transport-ambiguous evidence stays unaccepted.
