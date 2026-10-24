# Ticket 23 / Slice 248 — live timing report repair

## Current delivery

The original A/B/C rooms continue under the same v29 production bytes. This
delivery repairs reporting only; it neither restarts a Host nor changes a
Provider request, Rules action, Skill, Plan, dice result or room record.

Use `scripts/collect-ticket-23-live-round-timing-v2.mjs` for recorded action
timing. Current reports are under
`build/ticket-23-three-arm-performance-baseline-20261010-v1/`:

- `common-v29r2-round-timing-{A,B,C}.private.json`
- `common-v29r2-round-timing-reporter-owner.private.json`

The read-only reporter PID3263, born Oct12 16:33:39 local, follows monitor37070.
It publishes when accepted action files change and exits when that exact
monitor process disappears. Its initial stdout and stderr are retained beside
the owner file. It issues zero Provider calls, room writes or Rules Apply.

## Concrete bug and one red/green validation

`B/round-timing.private.json` was an Oct10 one-time report, still at revision1
and round1 while original B had accepted revision161 and entered round4.
The resumed driver and monitor had no round-timing publisher. New outcome stage
events existed: missing execution data was not the cause. Preserve the old
snapshot as history; use an explicit epoch report rather than overwrite it.

Actual reproduction PID89673 exited1 with
`ROUND_TIMING_REPORT_STALE_BEHIND_ACCEPTED_ROOM`: reported1 versus accepted161.
After the reporting fix, PID999 ran the collector once and exited0. One
corresponding assertion passed: B cutoff162, round4, round3 next-round observed,
correct original room identity, zero original writes/calls/Apply, and explicit
uncertified full-round timing. All three reports had complete chains for every
measured epoch action. No already-passed performance or production gate ran.
Starting the publisher is normal background operation, not another test run.

## Timing contract

The epoch begins at the existing monitor launch `2026-10-12T07:28:03.943Z`.
Accepted revisions must be greater than that arm's initial revision and match
stage events by seat plus pre-action revision. The interval runs from recorded
agent-decision start to post-Apply/Replay outcome end. Nested reads inside
record_outcome are not added again. An incomplete final NDJSON append is left
untouched until complete; an incomplete timing chain remains explicitly unknown.

Reports include recorded operations, receipts and original screenshot paths.
UI capture, between-action time and cold recovery setup are outside the action
interval. Round-closing actions belong to the previous accepted round. A later
round proves that boundary was crossed, not that the match ended.

`fullRoundComparableWallMs=null`: prior versions, pauses and recovery make these
epoch fragments unsuitable for an all-round speedup or SLA certification.
Reports remain `trainingTruth=false`. Do not use the old Oct10 snapshot or these
fragments to claim an entire round was measured under one version.

## Actual original-room continuation

At08:33:49Z the monitor reported A155/B162/C161, all round4 movement. Original
action frames have Replay=true and matching screenshot revisions:

| Arm | Revision / action | Receipt prefix | Original screenshot |
| --- | --- | --- | --- |
| A | 155 / resolve_battlefield_asset_ability | e2a6dfa9 | 0998-r155-player2-resolve_battlefield_asset_ability-complete-board-applied.png |
| B | 162 / move | 2f4c9f46 | 1050-r162-player1-move-complete-board-applied.png |
| C | 161 / resolve_mission_start_of_round | 1643bf29 | 1058-r161-player1-resolve_mission_start_of_round-complete-board-applied.png |

Separate cumulative estimates A217.477257/B276.452832/C234.541915; next notice
300 each, no cost cap. Counts remain T23 33/36, T27 5/6, open main slices
248/272/249/250, complete matches0/12. Continue the original cohort; any actual
High stop must seal all arms before a production change. No unrelated tests,
subagents/K3, source-data refresh, cleanup or commit.

Harness route=harness_optimizer; target=starcraft-tmg; evidence=original accepted
action frames and recorded stage chains. This is an observability repair, not
strategy or performance promotion. Preserve original reports and paid records.
