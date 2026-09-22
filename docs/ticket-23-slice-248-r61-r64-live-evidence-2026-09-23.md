# T23 / S248 — same-room recovery and Marine ability sequence

## Actual progress

Live process **76101** restored r61 and captured the missing Hydralisk
finish-activation screenshot without another paid decision. The reserve
coherency repair `78d2fd8` is loaded. Subsequent current-model calls are Flash;
no Pro fallback, accepted-action reroll, source refresh or strategy Prompt edit.

| Revision | Actor / actual action | Evidence |
| --- | --- | --- |
| 61 | Hydralisk finishes activation; only one legal continuation | Recovered Apply/Replay and Web image; no paid regeneration |
| 62 | Marine 2 moves using a Host-solved complete formation | Four exact options; accepted, replayed and pictured |
| 63 | Marine 2 uses Go! Go! Go! for an extra move | Four exact options; Barracks card feature, accepted and replayed |
| 64 | Marine 2 uses Stimpack | 1 CP, 2 non-lethal damage; accepted, replayed and pictured |

At **2026-09-22 22:25:02.637 UTC**: Round2 Movement, **57 new +7 prefix =r64**,
160 physical calls,17,508,025 accounted units, estimated **¥23.428180**.
Historical uncertain-usage reservation remains in the ledger. This is not a
finished game or evidence that every ability, attack or reserve branch passed.
In particular, a new Goliath2 deployment after the coherency repair has not yet
been selected; the local boundary test is not substituted for live acceptance.

Inspected Web evidence in the same run directory:

- `screenshots/0465-r061-player2-finish_activation-complete-board-applied.png`
- `screenshots/0477-r063-player1-resolve_relocation_ability-complete-board-applied.png`
- `screenshots/0483-r064-player1-use_active_ability-complete-board-applied.png`

![Marine 2 after extra move](../build/ticket-23-slice-248-standard-2000-aa-live-v1/20260922172710914/screenshots/0477-r063-player1-resolve_relocation_ability-complete-board-applied.png)

![Marine 2 after Stimpack](../build/ticket-23-slice-248-standard-2000-aa-live-v1/20260922172710914/screenshots/0483-r064-player1-use_active_ability-complete-board-applied.png)

## S249 evidence: facts supplied, public explanation misuses them

The r63 decision's saved `space.inspect_relationships` receipt explicitly has:

- Marine2 `activatedPhases.movement=true` and
  `movementCurrentRoundAvailable=false`; stationary Assault remains available.
- Against Hydralisk, AGG-12 and Rocket Launcher stationary profiles are eligible;
  C-14 is not. Its base-edge distance is15,692 milli-inches and C-14 range12,000.
- The selected Stimpack effect contract explicitly limits Precision3 to C-14
  and close-combat weapons; its Speed3 does not reopen a used normal movement.

Nevertheless the public plan/Action description claims an unspent Movement
activation and treats the live AGG-12/Rocket Launcher bands as the buff's payoff.
The facts exist in the saved tool result: this particular finding is not a
missing-data inference. Future opponent movement into C-14 range could still
give the buff value; the present evidence does not prove the action always bad.
The cited immediate rationale is contradicted, however, and must be examined
when S249 compares plan, predicted payoff and realized result.

Keep the legal action and original explanation. Do not invent a better reason,
reroll it, train on the false claims or add strategic Prompt instructions. The
existing CP checker corrected a separate0→1 CP claim automatically; that does
not certify the remainder of the explanation. This is a useful Skill-review
case alongside the earlier duplicate Queen-token investment.

## Medium tool-contract item — no new blocker

The same decision sent relationship-style `subjectUnitIds`/`targetIds` arguments
to primitive `base_edge_distance`, which needs physical source/target references.
It returned typed `unknown` but exposed the unhelpful reason
`Cannot read properties of undefined (reading 'unitId')`. The relationship query
provided the requested objective distances afterward; no zero-distance or
safe-placement value was fabricated, and the decision completed.

Track clearer per-query argument contracts and repairable validation errors for
the tool layer. Preserve batched unit/objective intent through an explicit
adapter if supported; do not silently reinterpret ambiguous arguments. This is
Medium, not grounds to halt the match or add another unrelated gate now.

## Performance and parallel work

Observed manifest/refresh/capture totals: r62 **104.966s**, r63 **70.124s**,
r64 **48.317s**. Manifest intervals include overlapping execution; they do not
prove all time is serialization. Facts, Skills, search, output capacity and
per-action screenshots remain intact. Record optimization separately.

Native K3's S271 reduced transport probe exited0: create201, restart/replay202,
read200; retained replies reached `planned`,0Provider calls. The prior complete
rehearsal's ECONNRESET root cause is still unproven. Probe initialization and
requests took about119.083s while the three requests totaled243ms; this is an
initialization profiling candidate, not a measured component attribution.

After reporting/stopping the repeated old rehearsal, native continuation
**59421**, pid41406, received
`docs/development/ticket-27-slice-271-k3-recovery-brief-v2.md`: preserve partial
work, remove historical-sample assertions, attribute exact transport failures,
one scoped real Flash acceptance or precise blocker. It may not repeat the old
rehearsal/passed probes. No completed S271 acceptance or integration is claimed.

Harness: `selfplay_agent_prompt`; formation/relationship/instantiation queries,
Rules Apply/Replay, public plans/reasons and Web screenshots. Hidden reasoning
not stored. `trainingTruth:false`; incorrect claims are review material, not
promoted strategy. T23 remains33/36; S248 full match, S249 review and S250
synthesis remain open.
