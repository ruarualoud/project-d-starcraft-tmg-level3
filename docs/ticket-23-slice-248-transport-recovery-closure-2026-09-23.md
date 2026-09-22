# Ticket 23 / Slice 248 — successful retry must finish closure

## Actual result before the repair

Branch `20260922133120597` resumed its saved Planner at Action, made two new
calls (84,693 + 91,392 = 176,085 tokens), and applied the 18-model Raptor
deployment to r6. Replay matched. Total conservative branch accounting:
7 calls / 884,206 units / ¥1.164198 (includes earlier usage-unknown attempts).

The async drive job completed at `2026-09-22T15:58:21.347Z`. A read-only live
manifest returned HTTP 200, r6, successful Replay, and the old unresolved
`provider_worker_protocol_rejected` / `provider_transport_failed` issues.
The runner threw `SLICE248_CRITICAL_OR_HIGH_FINDING`, caught it as though it
were a transport failure, and repeatedly fetched the manifest. No further
model call or action was in flight. This was not slow model reasoning.

## Changes

- Hosted bot: both transport codes join the existing resolved-decision issue
  family at successful Apply/Replay. On reattach, reconcile an already-durable
  success only when the last attempted state matches the accepted trace,
  last revision/receipt match, Replay succeeded, no Apply is in flight and
  the last status represents success or normal host shutdown. History is
  annotated, not deleted. An old success never clears a later failed attempt;
  unrelated authentication/security/Rules issues remain blocking.
- Runner: only typed network/timeout/read-service failures are retried after
  a durable advance. Semantic High, budget and invalid-response errors stop
  with their actual cause instead of being swallowed until the match timeout.
- Existing durable-boundary diagnostic gains a narrow mode reading the actual
  r6 bot record without changing it; no new test file or full suite.

## Verification

```sh
node scripts/verify-ticket-23-slice-248-durable-action-boundary-v1.mjs \
  --run-directory=build/ticket-23-slice-248-standard-2000-aa-live-v1/20260922133120597 \
  --transport-recovery-only
```

Three runs total: first reproduced both defects; second exposed normal
shutdown's `closed_by_host` status; third passed after supporting that status
with the last-attempt/accepted-trace guard. Checks cover historical issue
resolution, preserved history, newer failure and unverified Replay rejection,
unrelated security issue preservation, timeout/reset/503 retry and 403/High/
budget fail-fast. Provider calls 0; Room mutations 0. Do not rerun passed gates.

The stalled process was stopped only after confirming the durable r6 boundary
and completed async job. The resumed runner is to record the missing r6 UI
evidence/checkpoint, not to repeat the action or paid decision.

## Strategy observation, not a Prompt patch

The Action correctly separates the 25.588in current base-edge gap from the
24in stationary band and a possible next-round move-then-fire threat; path and
future LOS remain explicitly unknown. It chooses the compact western formation
5.893in from marker 4 rather than claiming immediate scoring.

However, its explanation calls Raptor (18 models / Supply 2) the best
models-per-Supply option while also listing Swarmling (18 / Supply 1).
That comparison is internally inconsistent. Its separate Speed/terrain reason
may still support choosing Raptor. Preserve both statements as Medium strategy
review evidence; do not manufacture a corrected model explanation or inject
a preferred tactic. This is not proof of a fully high-quality strategy.

Training truth remains false. Ticket 23 remains 33/36; S248–250 stay open.
