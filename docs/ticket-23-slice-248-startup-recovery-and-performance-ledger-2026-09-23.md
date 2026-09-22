# Ticket 23 / Slice 248 — startup recovery and performance ledger

## Scope and policy

Only broken engineering paths are repaired during this match: wrong or lost
data, calculation failures, illegal execution and unusable recovery. Legal
strategy choices made with correct evidence remain in the match for Slice 249
review; they are not rerolled to obtain a preferred move. Strategy quality takes
priority over speed. Significant performance findings are recorded below, not
silently addressed by removing query, planning or search capabilities.

The user requires **Flash on both seats**. The formal live server now passes
only the existing `deepseek-flash` profile, with no Pro fallback. No Prompt,
Skill, Rules, frozen source dataset or generation output budget changed.

## Observed startup failure

Run `20260922172710914` successfully replayed the safe prefix through r7 and
persisted its room and fork provenance. Its two independently initialized
Provider records selected `deepseek-v4-pro` and `deepseek-flash`. Both records
had **zero physical generation attempts**, zero usage and no decisions.

The server then threw `SLICE248_PROVIDER_MODEL_PARITY_FAILED`. Its catch only
set `process.exitCode`; the live IPC workers kept it alive. The outer runner
reported a generic start timeout at 600 seconds instead of promptly returning
the original failure. A one-second sample showed the main thread idle in
`kevent`, not expensive Rules/formation work; there were no open TCP sockets.
The persisted artifacts localize several minutes to initialization and the
rest to this idle error path. The original model-list response was not retained,
so the precise reason for the first seat selecting fallback is unproven.

## Repair

- Resume preflight reads the accepted model from its existing decision record;
  it does not perform model rediscovery and drift into another profile.
- Both live seats are explicitly configured for Flash. An explicit server-owned
  option permits correcting an initialization-only record **only before any
  Provider call or decision**. The previous/new models are kept in an audit
  issue. Existing paid/ambiguous work cannot be relabelled or erased.
- Redundant model-equality startup/runner blockers are removed. Actual per-seat
  model snapshots remain in evidence. Flash selection is enforced at the real
  provider configuration, not by a later metadata comparison.
- Fatal startup flushes its error and exits nonzero immediately; the worker's
  existing IPC-disconnect handler exits as well. Normal durable resume and
  authenticated shutdown behavior are unchanged.

## Focused verification

Existing `verify-ticket-23-slice-248-durable-action-boundary-v1.mjs` gained
`--startup-model-recovery-only` for this concrete failure. The first run was
red: frozen-profile reselection, unnecessary discovery, parity blocker and an
erroring process kept alive. The single post-change run passed in 0.66 seconds.
It uses the actual failed records read-only, exercises real preflight/openMatch
with in-memory commits, rejects relabelling a used profile, verifies both Flash
configurations and executes the real fatal handler with an active event handle.
Provider calls / Room mutations / paid units / cost: **0 / 0 / 0 / ¥0**.
No previously passed verifier or whole-suite command was repeated.

The same r7 branch is resumed with eight additional actions per checkpoint,
retaining per-action screenshots and Rules/Replay checks. This is still Slice
248 in progress, not a completed match or new training approval.

## Performance optimization queue — preserve strategy quality

### r51 — second polling lane reproduced and repaired

The old runner72606 is confirmed terminal, not merely slow: it exited after
the refresh UI timed out. r51 is accepted/replayed and neither seat has a
pending Apply or unfinished Provider decision. Preserved failure evidence
shows63Hosted Opponent GETs every1.5s with72.981–394.101s latency. This is a
different endpoint/component from the fixed A-A2.5s status poll. Its actual
callback red3→one green1 now coalesces pending reads, retains all projection
fields, cancels room changes and ignores obsolete responses. One directly
affected Web export passed198.016s; same-r51 resume51562 is running, still
awaiting new live capture/latency evidence. No strategy reduction.
Details: `ticket-23-slice-248-hosted-observer-poll-repair-2026-09-23.md`.
Both Flash; boundary111calls/11,487,277accounted units/estimated¥15.447569.

### r49 — real reserve deployment; remaining observation overhead

The existing runner 72606 continued without restart to Round 2 Movement.
r48 selects player2 as the first actor; r49 deploys the six-model Kerrigan
Swarm Raptor. Both Apply/Replay receipts and before/after Web screenshots
exist. Inspected board evidence:
`build/ticket-23-slice-248-standard-2000-aa-live-v1/20260922172710914/screenshots/0377-r049-player2-deploy-complete-board-applied.png`.

The r49 Planner received 8 Supply capacity, 6 committed and 2 available, planned a
1 Supply reserve deployment, and requested a complete formation with weighted
objectives. Its one missing-formation-intent response was corrected through
the existing semantic correction path; no operator patch or manual reroll.
The selected exact option had 9.795 in minimum distance to marker 4, 0.908 in
boundary clearance and 3.802 in terrain clearance. The Action retained five
possible current-round move-then-fire weapon profiles from Goliath/Marine2,
explicitly stating future legal path and LOS unresolved, rather than safe.
This proves transport, reserve opportunity recognition and formation execution;
it does not prove the best formation, immediate objective control or an
optimal risk/reward trade. r48's stale "still-uncommitted Terran first wave"
description and r49's future-control value belong to S249 outcome review.
Do not reroll these legal choices or add strategy weights to the Prompt.

At 20:38:44.909Z, this accepted-action checkpoint reports 104 physical calls /
10,546,323 accounted units / estimated ¥14.181586. Both persisted seat profiles
are `deepseek-flash`, no Pro fallback. Historical unknown-usage reservation is
retained; this is not an exact invoice. Later in-flight calls are not included
in this fixed checkpoint.

| Accepted revision | Manifest | Projection refresh | Applied-action captures | Subtotal |
| --- | ---: | ---: | ---: | ---: |
| r48 |19.437s|10.092s|14.253s|43.782s|
| r49 |17.995s|9.696s|26.653s|54.344s|

The single-flight fix therefore does not establish acceptable whole-path
latency. Read-only source inspection narrows future profiling: Decision Port
`loadRecord` and Bot `read` both use process-local record caches, and Provider
`publicProjection` emits a compact summary rather than the full decisions.
The 6.7/7.8 MB persisted Provider rows alone do **not** prove repeated SQLite
parse cost in live polling. `buildManifest` separately builds both Bot
projections and calls orchestrator `publicResult`, which builds both again
through `seatSummaries` and clones trajectory data that the manifest omits.
That is a redundant construction candidate, not yet measured as the dominant
cost. Profile construction/serialization/render/capture separately before
choosing a repair. Preserve revision freshness, complete public facts and
screenshots; do not trim Skill context, planning, tools or model output.

This checkpoint changes documentation only: no new tests/builds/probes,
no old passed gate rerun and no match restart. Native K3 S271 is actively
implementing its isolated workspace; no acceptance result is implied.

### r46 — overlapping status reads repaired

The Web control's 2.5-second interval sent additional full status requests even
while its prior request remained pending for 10–35 seconds. Actual callback
reproduction: three simultaneous reads; after a pending-read ref: one. One
focused red→green and one directly affected Web export passed. No decision
material or model capacity changed. Read-only live manifest/portrait probes
timed out at20s/30s before the repair; no post-repair speedup claimed yet.
Runner72606 resumes r46 after all Apply/Provider work settled. Full report:
`ticket-23-slice-248-status-poll-single-flight-repair-2026-09-23.md`.


### r39 — repeated non-progress engineering failure, repaired

From 19:53Z Cleanup repeatedly rejected a valid impassable terrain kind in the
marker-control LOS adapter. External resume reset the orchestrator's local
retry count, producing at least 24 tracked findings and extra screenshots by
20:00Z. This is not model slowness: no additional physical calls or token cost.
The consumer is repaired; the runner now stops after three completed jobs with
no revision/action advance across those resumes. See the Cleanup repair report.
No planning/search limits or strategic-material reductions accompany this fix.
Separately r39 observation took manifest29.566s + refresh35.587s + capture24.476s
=89.629s; endpoint/serialization attribution remains a later optimization.


### r29 checkpoint — Flash reconfirmed; observation overhead measured

r35 reload follow-up: recovery retained 93 calls / ¥12.335719, with no paid
regeneration. Manifest 4.864 s, refresh 8.486 s and the three applied-action
captures together 30.835 s. A one-second OS sample of the new service at
19:41:02Z shows active HTTP callback processing and JSON serialization, not
only an idle startup wait. JavaScript callers are not symbolized, so this
does not identify the responsible endpoint/function or prove it accounts for
the full delay. Retain the sample at
`build/ticket-23-slice-248-standard-2000-aa-live-v1/20260922172710914/resume-after-los-cpu-sample.txt`;
next performance attribution should separate projection construction,
serialization, UI render/settling and each capture without reducing evidence.

At 2026-09-22T19:24:16.579Z the same branch has reached r29, Round 1
Assault: r27 Marine 2 Run, r28 deterministic finish-activation and r29 Zerg
Pass all have accepted Apply/Replay records and paired Web screenshots.
Both persisted seat profiles are `deepseek-flash`; the live server supplies
only `STARCRAFT_TMG_TICKET_23_LIVE_FLASH_PROVIDER_PROFILE_V1`. No Pro fallback
or model change is introduced. The frozen profile's historical 8192 field is
not the operational request limit: current attempt records separately show
the existing 32768 live-output policy. Do not conflate those two fields or
rewrite paid history to make their metadata match.

The branch ledger at that boundary is **78 physical calls / 7,591,424
accounted units / estimated ¥10.281190**, including the previously documented
unknown-usage reservation. This is not an exact Provider invoice or a claim
that the entire match is finished. The next normal Terran decision started;
the running process is not interrupted for a metadata-only update.

Additional measured end-to-end observation costs:

| Accepted revision | Manifest | Projection refresh | Applied-action capture | Subtotal |
| --- | ---: | ---: | ---: | ---: |
| r27 | 7.123 s | 39.055 s | 10.541 s | 56.719 s |
| r28 | 11.642 s | 8.437 s | 5.764 s | 25.843 s |
| r29 | 5.896 s | 9.273 s | 4.916 s | 20.085 s |

Source: this run's `progress.json.observationTimings`, independently of
Provider generation durations. `refreshObservedRoom` includes tab navigation,
refresh-button interaction, waiting for the connected state and returning to
the battlefield; its duration does not isolate HTTP, rendering or Rules CPU.
Optimization work should first attribute those stages and then reuse a
verified, revision-current projection where possible. Acceptance must retain
the real Web action trigger, current complete-base geometry, terrain state,
public decision evidence and both screenshots. Do not skip evidence or reduce
planning, Skill context, query freedom or output capacity just to lower time.

r29's legal Pass remains part of the strategic review, not a reroll target.
Its value and the public claim that Run offers no realized benefit require
evaluation against later outcomes. The named-target claim repair already on
disk is not yet loaded by this long-running server; remaining old-checker
corrections are retained in evidence rather than forcing a mid-call restart.
This update is documentation only: no tests, build, new paid call or Room
mutation was initiated for the update itself.

### r14 observation interruption (not a model decision failure)

Both seats remain `deepseek-flash`. The authority and bot journals confirm
Swarmling deployment at r14, with 18 models / Supply 1 and Replay matching.
The Web runner stopped waiting for its connected label during projection
refresh; it had recorded only through r13. This must resume from the accepted
r14, not regenerate or reroll the paid decision. The branch ledger is
30 calls / 2,396,915 reported units / approximately ¥3.152656.

A read-only probe of this exact r14 measured `readRoom` at 440 ms and
`readBattleWorkbench` at 620 ms. A fresh real browser connected normally;
its Room and character reads took 514 ms and 206 ms. These observations rule
out a consistently slow r14 workbench but do not explain the original
intermittent refresh timeout. The earlier process sample showed JSON parsing
in an HTTP handler, not enough evidence to identify its caller or total cost.

The runner now records bounded same-origin request paths, status/timing and
pending requests (no query strings, headers, credentials or payloads), plus
manifest, refresh and screenshot durations. Failure capture reads the actual
visible page rather than waiting again for the healthy battlefield that may
not be mounted. No prompt, Skill, model budget, Rules calculation, strategy
choice or timeout policy changes. This is instrumentation and resumability
work, **not a claim that the intermittent refresh defect is fixed**.

The next production resume recovered r14 through the real Web at
2026-09-22T18:26:04Z with no additional Provider call: manifest 1,368 ms,
projection refresh 5,174 ms, applied-action screenshots 924 ms. Screenshot
`0054-r014-player2-deploy-complete-board-applied.png` shows the accepted
Swarmling formation on the abstract Rules board. Ledger remains 30 calls /
2,396,915 units / ¥3.152656; the next normal decision then started. The only
code validation was one syntax check of the changed runner. No passed
scenario gate, other slice, Rules suite or frontend build was rerun.

| Item | Evidence / scope | Acceptance |
| --- | --- | --- |
| Startup failure feedback | Fixed: idle workers hid a fatal error until the 10-minute timeout | Real fatal-handler probe exits promptly; no hidden restart/retry |
| Repeated model discovery | Fixed for durable resumes: formerly could change frozen selection | Accepted model retained; zero discovery calls on ordinary resume |
| Repeated local initialization | Several minutes before safe-prefix provenance; exact CPU contributors not yet separated | Measure catalogue construction, Rules setup and replay separately; cache only immutable/versioned results; identical legal domains and geometry |
| Service restart frequency | Frequent short batches repeat setup | Continue larger stable batches; preserve action screenshots, durable boundaries and exact replay |
| Planner/tool/Provider latency | Previously observed 120-second transport failures; now operational deadline is 300 seconds | Instrument stage latency/units before changing behavior; never remove strategic facts or search merely to meet a speed target |
| Query/cache efficiency | Evaluate after actual costly queries are identified | Same authoritative state and query inputs produce equivalent factual answers; no stale cross-revision answers |

### Observed after resume

2026-09-23 capacity follow-up: two native tool responses each hit the old
8192 output maximum, consuming 238,169 total units and about 67 seconds.
Truncation metadata had been discarded, causing same-cap semantic retries.
The 32768 request policy and typed stop are described in
`ticket-23-slice-248-native-tool-output-capacity-repair-2026-09-23.md`.
Completed production Planner outputs then reached 8905/8811 tokens and
flowed through the repaired Worker boundary; r24/r25 applied. This supports
more output headroom, not a smaller strategic contract. The initially
introduced Worker receipt mismatch/lost response remains explicitly costed
as unknown usage with a conservative reservation.

Also queue measured Web observation overhead: r15 manifest 21.467 s and
refresh 13.168 s; r23 manifest 14.034 s, refresh 16.703 s and capture 10.221 s.
These are end-to-end operation timings, not a proven Rules CPU attribution.
Keep exact revision/geometry and screenshots when optimizing. Named-target
claim scope was separately repaired without Prompt or Skill strategy changes;
its narrow gate and evidence are in the named-target repair report.

Both persisted seats now identify `deepseek-flash`. r8 Ventral Sacs, r9 Creep
Spread and r10 finish-activation were applied and Replay-verified with paired
Web screenshots. Through that boundary the new branch accounts for 8 physical
calls / 602,672 reported units / ¥0.810928; old-branch usage is not erased.
r9 needed one built-in selected-effect narrative correction, then completed;
no operator code patch or strategy reroll was required.

r8 demonstrates the geometry repair in actual model use: the selected indicator
at (17.121, 11.121) inches is 1.243 inches from marker 4's centre. The public
reason uses its own marker/enemy distances and explicitly calls future
move-then-fire/path/LOS uncertain rather than safe. This is a working evidence
transport path, not proof of optimal strategy.

At r10, Terran's seven Planning calls include **four identical relationship
queries** q4–q7, differing only in request ID. They ask about the still-reserve
Marine's deployment anchor without supplying a hypothetical formation. The
last three repeated calls consume 259,752 input + 441 output units and about
10.853 seconds of Provider time, before downstream query/serialization cost.
Their repeated prompt payload grows by 14,053 bytes per round. This is a
concrete optimization item: disclose/reuse unchanged query results and make
the missing hypothetical-position prerequisite explicit in the tool result;
do not remove strategically distinct follow-up queries or force a preferred
plan. The first pass only records this finding and allows the valid decision
to continue. Compare strategy outcomes before promoting any later optimization.

The deterministic r10 continuation uses no model call, yet completion-to-next-
progress timestamps span about 64 seconds. This is an end-to-end observation,
not attribution to the Rules kernel: it includes driver polling, Room/Replay,
projection refresh and screenshot capture. A later one-second OS sample hit
an idle wait and does not prove a CPU hot spot. Add stage timings at the next
performance slice before selecting a cache/batching change.

No evidence here establishes a new strategy quality regression or a need to
reduce model reasoning/query freedom. No new paid generation occurred in the
failed initialization; previous branch accounting is preserved separately.

## Harness trace

- `harnessLoopUsed`: true; game `starcraft-tmg`.
- Route: `selfplay_agent_prompt` for both isolated seats.
- Failure occurred before a new UI decision trigger or Provider generation.
- Existing safe r7 Room/plan/continuity data is retained; no memory promotion.
- This diagnostic is engineering evidence, not a training trajectory.
- Rollback/demotion: stop on real credential, unresolved paid attempt, Rules,
  geometry or Replay failure; legal weaker strategy remains review evidence.
