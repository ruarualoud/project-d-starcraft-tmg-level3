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

| Item | Evidence / scope | Acceptance |
| --- | --- | --- |
| Startup failure feedback | Fixed: idle workers hid a fatal error until the 10-minute timeout | Real fatal-handler probe exits promptly; no hidden restart/retry |
| Repeated model discovery | Fixed for durable resumes: formerly could change frozen selection | Accepted model retained; zero discovery calls on ordinary resume |
| Repeated local initialization | Several minutes before safe-prefix provenance; exact CPU contributors not yet separated | Measure catalogue construction, Rules setup and replay separately; cache only immutable/versioned results; identical legal domains and geometry |
| Service restart frequency | Frequent short batches repeat setup | Continue larger stable batches; preserve action screenshots, durable boundaries and exact replay |
| Planner/tool/Provider latency | Previously observed 120-second transport failures; now operational deadline is 300 seconds | Instrument stage latency/units before changing behavior; never remove strategic facts or search merely to meet a speed target |
| Query/cache efficiency | Evaluate after actual costly queries are identified | Same authoritative state and query inputs produce equivalent factual answers; no stale cross-revision answers |

### Observed after resume

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
