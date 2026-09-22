# T23 / S248 — Cleanup terrain consumer and no-progress recovery

## Actual failure and impact

Run `20260922172710914` reached r39 / Round 1 Cleanup, after both legal
Combat Pass actions. `MISSION_MARKER_TERRAIN_KIND_UNSUPPORTED` identifies
`sc1_lost_temple_v1:neutral-size2-1`: a valid Size 2 impassable piece.
The current-product runtime calls the terrain-aware V2 marker-control kernel,
whose LOS projection accepted only ordinary/grass terrain. This is a consumer
gap, not an invalid placement, missing model reasoning or failed API request.

The failure was tagged Medium. The orchestrator paused, but each external Web
drive resumed it and reset the local no-progress counter. At least 24 tracked
findings had accumulated by 20:00Z without advancing r39. No Provider calls
were added: 96 calls / 9,529,523 accounted units / estimated ¥12.802140,
including the previously disclosed unknown-response reservation. Both seats
remain `deepseek-flash`.

## Repair

- Marker LOS accepts the existing standard grass/impassable/ramp kinds. It
  preserves Size, footprint, agreed sight openings, elevation/support and
  access metadata in its private ordinary-LOS projection. Only grass IDs are
  labelled grass. The source board and movement impassability remain unchanged.
- A completed-drive progress tracker lives outside the runner's per-job loop.
  Three completed jobs with no Room/action advance stop with an explicit
  non-retryable error. Long-running model or tool calls are not counted, and
  genuine progress resets the counter. This is operational convergence, not a
  strategy, context, search or generation-token limit.
- No frozen data, Skill, Prompt, model or accepted earlier action was changed.

## Directly affected verification only

`node scripts/verify-ticket-23-slice-248-cleanup-terrain-repair-v1.mjs --run-directory=build/ticket-23-slice-248-standard-2000-aa-live-v1/20260922172710914`

1. Frozen read-only r39 state reproduced the exact unsupported-terrain error.
2. Kernel repair passed the actual geometry checks, but the first verifier
   mistakenly tested historical V3 executor bindings, not this Room's current
   product runtime. Its `SUPPLY_LOSS_LEDGER_RUNTIME_MISMATCH` was a test-seam
   error; the historical executor was not changed to accommodate it.
3. Corrected narrow verifier passed once in 3.514 s: all 9 terrain pieces,
   five marker results equal the same-Size/footprint ordinary-LOS reference,
   Size 1 ramp parity, unknown-kind rejection, input immutability and the
   completed-job convergence boundary. No earlier passed command was rerun.

Provider calls / real Room mutations / cost: **0 / 0 / ¥0**. This offline test
certifies the current kernel and runner guard, not live Apply/Replay; the next
real Web action supplies that evidence. All five markers currently have no
contestant and retain neutral control; that strategic outcome is preserved.

## Resume and boundaries

The automatic runner was suspended before further triggers. Read-only stores
prove r39 = 7 replayed-prefix + 32 new applied/replayed Bot actions, no pending
Apply, both Providers idle. The corrected durable helper returns
`atomicBoundarySatisfied: true`. Old runner 78441 and its server exited after
a controlled shutdown; runner 5379 resumes the same branch with repaired code.
No duplicate action, reroll or new room is authorized by the recovery itself.

T23 remains 33/36: S248 full match, S249 review and S250 synthesis are open.
This abstract map is not evidence for classic-art semantic geometry. Traces
remain `trainingTruth: false`.

## Live continuation observed

At 20:12:18Z the ordinary product Web path had accepted r40
`determine_current_product_mission_marker_control` and r41 `score_mission`,
both with matching Replay and screenshots. Usage remains 96 calls /
9,529,523 accounted units / estimated ¥12.802140: no paid regeneration.
The old failure has therefore cleared in the real consumer, not only offline.
The match remains running; Round 2 initialization is not claimed yet.

The inspected board capture is
`../build/ticket-23-slice-248-standard-2000-aa-live-v1/20260922172710914/screenshots/0322-r040-player2-determine_current_product_mission_marker_control-complete-board-applied.png`.
It preserves unit/base geometry and abstract terrain; portraits are blank in
this capture (previous r35 captures loaded them). Image readiness/performance
remains a separate UI/evidence issue, not a Rules or strategy failure.
