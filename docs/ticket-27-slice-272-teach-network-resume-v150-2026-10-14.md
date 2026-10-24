# T27 / S272 — Teach network recovery v150

## Scope and actual progress

The preceding v149 observation was progress: it established terminal transport
failures, distinct paid duplicate outputs and a missing Teach recovery integration.
This round fixes that integration; it does not certify Teach strategy, tools,
final Plans, complete games or end-to-end performance.

No new Room, army-list generation, Plan apply, Skill promotion, source refresh,
subagent, dependency install, cleanup or commit. T27 5/6, T23 33/36,
remaining main slices 248/272/249/250 = 4, accepted full games 0/12.

## Root cause and implementation

`teachPlanFramework` rejected every unresolved ambiguous dispatch before it
could use the existing shared recovery policy. Final Plan review already had
that recovery mechanism. The Teach live-port factory also received no
`retryDispatch`, so mere entrance relaxation would not be a sufficient repair.

- Extracted review's existing exact-request authorization/ledger preparation
  into `prepareInterruptedDispatchRetry`, now shared by review and Teach.
- Teach reconciles the failed current-Plan request through the existing Provider
  recovery policy and passes the resulting bounded authorization to the existing
  secure port. The original ambiguous attempt and unknown cost stay recorded.
- Existing `recordRoundEvent` consumes authorization at the durable reserved
  barrier before a physical send; the secure port checks unchanged Plan,
  context, request body and output contract. No new parallel resend policy.
- The existing observer/launcher now has explicit `--resume-network` mode. It
  requires one failed current Teach request with no prior retry, confirms the
  prior host is idle, starts without Room launch, submits once and watches the
  same handle. Observation timeout never causes a second POST.

## Focused concrete-bug verification

New script: `scripts/verify-slice272-teach-network-resume-v150.mjs`.
Uses the actual v149 B Plan/roster/failed request in an in-memory service, stops
at the live-port factory and never calls Provider/Native/Room or writes the
original workspace.

1. RED 32181: reproduced `ROSTER_WORKSPACE_AMBIGUOUS_DISPATCH_STOP` despite the
   owner's exact-request network-resume consent.
2. First post-fix attempt 33811 reached beyond that entrance but the test omitted
   frozen `selectionUnitRules`; it failed with `ROSTER_SELECTION_RULE_FACTS_MISSING`.
   Fixed only the fixture by supplying the original retained rule facts. Did not
   weaken product rule validation.
3. GREEN 35159, 1653.894 ms measured test body: exact retry reaches the shared
   port; known usage/Plan/Teach state and unknown original fee are unchanged;
   absent consent, foreign request and consumed consent cannot dispatch;
   proven-not-sent uses the shared no-egress path. No passed test rerun.

Artifacts: `common-v150-teach-network-resume-{red,green,green2}.private.json` under
`build/ticket-23-three-arm-performance-baseline-20261010-v1/`.
This gate proves service admission/authorization wiring, not a real successful
Provider response, restored geometry, or Teach closure.

## Actual A/B recovery

Started the two original offline workspaces on the same product code:

- A observer 36716 / host 36888 / origin `http://127.0.0.1:56495`.
  Baseline 107 completed calls / 20,113,596 units. Original Plan9; two completed
  investigation rounds retained. Failed request ends `36bfe7bf-0f78-4233-8c24-dedca35eb407`.
- B observer 36717 / host 36823 / origin `http://127.0.0.1:56486`.
  Baseline 199 completed calls / 22,275,676 units. Original Plan19; resume the
  agenda that never returned. Failed request ends `9ec38969-8670-4638-9ecc-71db9422ee29`.

At 05:50Z both observer and host handles were verified live. B's actual new
dispatch was `sending` with `contextUnchanged:true` and `requestBodyUnchanged:true`;
this proves it crossed the secure exact-request send gate. It is **not yet a
returned response**. A was still rebuilding the offline context/branch registry,
not repeating a completed paid investigation. Do not infer current activity from
this historical paragraph: read both v150 progress files and actual PIDs.

Actual 05:52Z update: B's exact-request retry returned successfully, 301,710 units,
53.288 s Provider latency, cumulative 200 completed calls / 22,577,386 units.
Its current agenda was accepted; three initial arithmetic requests returned
advisory evidence, four spatial/scenario requests reported outer arguments
unbound, and one exchange request had no attack estimates in the selected scene.
The automatic investigation was running. No final Teach synthesis or Plan
acceptance is implied by these intermediate tool statuses.
A's retry also crossed the secure send gate with unchanged context/body; at
this observation its return was still pending. Both original unknown fees remain.

Actual 05:56Z update: A retry RETURNED 366,107 units / 46.864 s Provider latency,
cumulative 108 completed calls / 20,479,703 units. The saved first two paid
investigations were not resent. However, the third investigation returned the
same full output hash as both preceding investigations. No local cross-context
replay was observed: its dispatch, request/context and Provider receipt were
distinct, and the retained-replay port requires a matching context. This still
does not isolate a Provider effect from prompt anchoring or other input issues.
Current query errors remain; automatic targeted query recovery had a reserved
dispatch. B's first investigation was sending; observers/hosts still live.
`common-v150-A-return-observation.private.json` retains the compact timing/hash
evidence. Do not reinterpret this transport recovery as successful query repair.

## Changed-file summary

- Product: `packages/roster-planning-workspace/roster-planning-workspace-service-v1.mjs`
  — share dispatch authorization and wire Teach recovery into its secure port.
- Concrete-bug verifier: `scripts/verify-slice272-teach-network-resume-v150.mjs`.
- Existing launcher: `scripts/run-slice272-current-plan-teach-v149.mjs`
  — explicit bounded network-resume mode and stronger idle-owner check.
- This report, `CURRENT_WORK.md`, root `TASKS.md` and `PROJECT_MEMORY.md` record
  actual evidence and unfinished work. Unrelated dirty changes are untouched.

Progress paths:

- `common-v150-A-teach-network-resume-progress.private.json`
- `common-v150-B-teach-network-resume-progress.private.json`

Original v149 evidence is unchanged. Unknown original fees remain separate even
if a retry later returns. No bound, cost or counter is cleared.

## Remaining work and performance

Observe the same two handles to terminal. If a response fails again, distinguish
transport uncertainty from changed request context; do not reset the state or
silently grant an unbounded series of retries. A/B query/Teach strategy issues
remain unclosed, including original A3/B4 topics.

Then repair actual query/feedback mismatches, complete final Plan acceptance,
audit all affected consumers (roster/initial Plan, live decisions, Plan revision,
memory/replay) and compare relevant same-case performance before new games.
Track cold restore/branch reconstruction separately from hot model/tool latency.
The v150 service test duration cannot be compared with a real model action or
used to claim a speedup. Preserve v149's duplicate-output and between-round-gap
findings; no strategy material is removed for performance.

Harness: `harnessLoopUsed=true`, StarCraft TMG offline Teach/review recovery only;
no UI evidence, no new training candidates, `trainingTruth=false`.
