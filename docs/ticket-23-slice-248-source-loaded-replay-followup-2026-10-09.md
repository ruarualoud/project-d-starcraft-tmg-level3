# T23 / S248 — same-room source load and Replay follow-up

## Recovery: inspect these original handles first

This supersedes older “range/mission source not loaded” notes. It does not close
S248 or certify whole-action one-minute performance. No room was reinitialized.

| Arm | Host / ordinary Web recorder | Inspected actual action | Cost snapshot |
| --- | --- | --- | --- |
| B | 9463 / 13791 | r78, Marine 2 relocation ability, R2 Movement | CNY55.908045; 161 calls; 44,534,683 reported units |
| C | 8183 / 14185 | r80, Marine 2 Move, R2 Movement | CNY55.331115; 168 calls; 44,695,745 reported units |

Each action has an accepted receipt, `replayMatchesCurrent=true`, a matching
observed screenshot revision and `historicalUiReconstructionRequired=false`.
Both whole-board screenshots were actually viewed. The four owned PIDs were
confirmed live by native scoped process inspection. Later HTTP timeouts are
observation failures, not evidence of service termination; poll the SAME handles.

Private entry files, all below
`build/ticket-23-three-arm-official-standard1-20261008-v1/`:

- B: `B-r74-range-and-mission-size-source-entry.private.json`.
- C: `C-r76-range-and-mission-size-source-entry.private.json`.

Never print entry URLs, seat tokens, runner tokens or referee material.
Restore `STARCRAFT_TMG_PRODUCT_WEB_ROOT` to this build's `web-export` on any
future owned-host load. Keep `--provider-interaction-mode=json_channels_v1`.
Use `--observe-bot-stages` for new stage timing evidence; the latest wrappers did
not enable this observer, so old timing rows are not measurements of new actions.
Do not launch another host/recorder merely because a read timed out.

## What actually loaded, and what did not

The range, physical-pair reuse, casualty and mission-size source changes were
loaded at sealed, zero-unsettled boundaries on the SAME SQLite rooms. New-source
actions B75 and C77, then B78/C80, prove actual Apply/Replay continuation.
B74 and C76 finished on the older source during draining, not on the new source.

Continuity evidence:

- B r74: complete current and initial envelopes equal; all 72/68 completed
  provider-attempt rows equal; no unsettled calls. Runtime remains
  `0e7f68f29f2a73b176d3e164d0528052aaf6cb0e02ae72614b44c32dca751e44`.
- C r76: complete current and initial envelopes equal; all 52/103 completed
  provider-attempt rows equal; no unsettled calls. Runtime remains
  `8afbe8a5060b6ac3a1d017bff20366dfba14d0e9631e181e45894285ed856c6e`.
- C's decoded decision history is unchanged except expected revision, session
  binding, budget epoch, updated time and the Medium session-rebind issue.
  The opaque serialized rows are NOT byte-identical; both facts are retained.
- B's exhaustive decision-content comparison did not finish: the local observer
  timed out/reset. Its complete envelopes and complete attempt rows were checked.
  Do not promote the unfinished read into a proof or replay old paid requests.

Operational failures retained, not relabeled game/model failures: C startup6683
omitted the original Web root and exited on stale bundle; corrected host8183 uses
the existing export, with no rebuild/checker bypass. The old disconnected C
reader939 ignored SIGTERM and was specifically terminated after its host closed;
all room files remain. The B historical-read observer reset did not stop the hosts.

**The NEW checkpoint-restoration repair below is source-only.** Hosts8183/9463
loaded before it. Do not claim they run this latest change until the next natural
no-in-flight same-room source load and actual action proof.

## Completed frozen formation diagnostic

Owned diagnostic47774 ended naturally and is authoritatively missing. Its complete
result is `C-r71-new-source-full-formation-result-v2.private.json` (1,960,397 bytes).
Four of four comparisons are available, each retaining all six formation models;
query time5,753,191ms, setup33,405ms. Comparison times were24.7/25.4/29.0/16.4min.

This used earlier loaded source and one sequential diagnostic CPU lane. It was
not compared with the original live query and is NOT current production latency,
strategy quality or one-minute proof. Do not rerun it or launch a duplicate.

## Actual new-source hotspot and specific repair

`C-r78-new-loaded-source-actual-host.cpuprofile` sampled the actual C host for3.5s:
1,485 samples, 931 inclusive in `replayRoom`, 421 in garbage collection. This
captures one Replay window, not the distribution of every action. Existing Replay
already has exact-prefix memoization and eight-action checkpoints; it is incorrect
to conclude that every action reexecutes the entire match.

The narrow source defect: `replay` verified AND restored the checkpoint before
selecting an exact already-verified prefix. The restored full-state envelope was
then discarded on a hit. Restoration now occurs only on a miss. Initial-envelope,
frozen-dependency and checkpoint verification remain; memo eligibility and FULL
receipt fingerprints remain; new suffix receipts retain all Rules/signature/event
checks. API/results, checkpoint policy, Prompt/Skill and source authority do not
change.

One production file: `packages/authoritative-engine/transition-v1.mjs`.
One concrete bug script:
`scripts/verify-ticket-23-slice-248-replay-checkpoint-restoration-v1.mjs`.

The test is an Authority compatibility fixture, NOT an official tabletop-rule
verification. It isolates the exact checkpoint/memo branch with normal JSON input.
First two fixture failures are retained: wrong worktree-parent data path31067 and
wrong structuredClone counter31530 (the actual normalizer clones with JSON).
Actual red32423 proves two checkpoint-state copies; unique green33305 proves one.
The ENTIRE Replay result equals the cold control; checkpoint/receipt tampering
still rejects, empty journal and no-checkpoint branches remain, caller input is
unchanged and returned graphs remain independent. No old green was rerun.

Timing90.0→91.6ms in this small fixture is NOT a speed improvement. Only duplicate
work elimination is established. Next actual-load/action measurements must precede
any end-to-end performance claim.

Profiler setup initially met an occupied9229 port. After the old owned diagnostic
ended, the same C handle was sampled. The REPL lacks a WebSocket global; an owned
native Node child performed the sampling instead. Cleanup used only
`Profiler.disable` and socket close: zero `Runtime.evaluate` calls, no dynamic
evaluation in the game host. Never use the prior VM dynamic-import cleanup.

## Strategy evidence: Vile selected, Hydralisk described

B r74's persisted, model-facing action index binds selected domain479adfb4… to
`player2-vile` and `activeUnitId.const=player2-vile`. The alternative domain97dd746c…
binds `player2-hydralisk`. Planner selected the Vile domain; r75 actually deployed
Vile with complete exact placement and Replay. The executor did not replace the
selected unit. Model comparison, tactical purpose and Action public reason call
it Hydralisk/Needle Spines instead.

Track this as a Medium public-strategy/candidate-identity inconsistency, not a
Rules execution failure. Preserve the original narrative; do not silently replace
unit names or claim it proves a good deployment strategy. It is a review/learning
case. Whether input reduction caused it is unproven; field-equivalence proof is
not a model strategy A/B. The first identity probe mistakenly queried candidateId
rather than the index's standard id; the corrected original menu is retained in
`B-r75-supplied-candidate-identity-field-corrected.stdout.log`.

## Next deliverables and limits

1. S248: observe same original B/C jobs; at a natural sealed boundary load the
   checkpoint repair with the original Web root and timing observer, preserving
   FULL envelopes and paid history. Measure actual action/query/Replay intervals.
2. S272: complete A's focused remaining review after resolving the outstanding
   controlled paid-completion choice; retain completed shards. A v5 is unadmitted.
   B's exact2000 roster and admitted Plan remain valid, not regenerated.
3. S249: complete all three original experimental arms with common opponent
   workflow and separate memory/cost, recording engineering and strategy findings.
4. S250: screenshot/receipt/cost evidence and strategy-review report. Do not label
   raw game experience training truth or hidden chain of thought.

T23 remains33/36; T27 remains5/6; four open slices248/249/250/272, complete games0/3.
Eighteen deferred classic maps remain in the FULL goal, outside these four slice
counts. Do not drop them or infer all-map acceptance from Standard1 screenshots.

Generated delivery:
`loaded-source-and-replay-restoration-followup-20261009.json` under the shared build.
Repair Provider calls/original-room test writes0; no passed-gate/build reruns,
subagents/K3, installs, deletions, official-data refreshes or commits. B/C ordinary
game calls continued with separate cumulative estimates, both below CNY100.
