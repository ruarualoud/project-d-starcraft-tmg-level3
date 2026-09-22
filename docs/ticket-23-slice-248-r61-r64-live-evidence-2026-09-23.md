# T23 / S248 — same-room recovery, Marine abilities and Swarmling response

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

### r65–68 continuation — live evidence, not a strategic-success claim

| Revision | Actor / actual action | Evidence |
| --- | --- | --- |
| 65 | Marine 2 activates Combat Shield | 1 CP; Apply/Replay and screenshot recorded |
| 66 | Marine 2 finishes activation | Sole Rules continuation, zero model calls; board inspected |
| 67 | Swarmling moves all 18 models | Four exact Host options; selected formation applied/replayed; board inspected |
| 68 | Swarmling finishes activation | Sole Rules continuation, zero model calls; screenshot recorded |

At **2026-09-22 22:39:32.740 UTC**: Round2 Movement,
**61 new +7 prefix =r68**,168 physical calls,18,430,674 accounted units,
estimated **¥24.645064**, both Flash. Process76101 continues the original room.
No new main-code change, passed-gate rerun, source refresh or strategy reroll.

![Terran activation finished at r66](../build/ticket-23-slice-248-standard-2000-aa-live-v1/20260922172710914/screenshots/0495-r066-player1-finish_activation-complete-board-applied.png)

![Swarmling formation after r67](../build/ticket-23-slice-248-standard-2000-aa-live-v1/20260922172710914/screenshots/0504-r067-player2-move-complete-board-applied.png)

The c66 Zerg Planner corrects parts of its inherited plan using fresh receipts:
Marine2 cannot move again this round; Hydralisk is under Marine2's stationary
AGG-12/Rocket Launcher bands; blocked Hydralisk-to-Goliath LOS does not become
a current stationary shot. It chooses the Swarmling move instead of Pass,
requesting advance4/control3/compact3/preserve-lane2/avoid-threat2 objectives.
The Action stage makes another relationship query before selecting a formation.
Thus query→plan revision→formation search→Action is observed, not a one-call
decision. It does not establish that the resulting strategy is good.

The four exposed exact options are two isolated avoidance and two isolated
compact layouts. The model selects `isolate-avoid_threat` at(21,4)in. The
footprint's maximum Y changes6.525→6.976in, mostly a local rearrangement;
do not report the plan's intended central advance as an accomplished advance
or objective capture. The selected minimum enemy gap is14.838in, whereas
another avoidance option has14.910in. The public claim of the largest gap is
incorrect despite correct option values. It also compares raw solver scores
across differing objective contracts; the receipt's Pareto grouping explicitly
compares only identical objective contracts.

Preserve both findings for S249: plan/action alignment and correct metric
comparison. Do not manufacture a stronger explanation or reroll an accepted
legal action. Also retain bounded-search coverage: no combined-intent/advance
option was exposed. That alone does not prove a feasible advancing layout was
discarded; candidate-generation/selection coverage needs a separate experiment
before attributing the whole conservative result to the Skill or to the solver.

### Additional performance evidence

For c66, the final Planner returned at22:31:47.494Z; the first Action request
started22:36:13.601Z, an intervening **266.107s** Host-stage interval. The saved
formation receipt reports672 generated candidates,393 examined,139 exact
instantiations,135 overlap rejections,0 prefilter rejections and4 options.
This interval includes formation preparation/comparison/persistence, not a
profile proving all266s are collisions. Record staged timing, geometry-cache
reuse and sound collision broad-phase filtering as optimization candidates.
Preserve full-base/path legality, requested objectives and candidate diversity;
do not shorten search or remove facts merely to improve latency.

| Revision | Manifest | Refresh | Capture | Observed subtotal |
| --- | ---: | ---: | ---: | ---: |
| r65 |11.302s|8.052s|32.113s|51.467s|
| r66 |16.649s|8.986s|36.504s|62.139s|
| r67 |4.663s|7.316s|30.709s|42.688s|
| r68 |18.539s|5.697s|2.214s|26.450s|

A single faster screenshot batch at r68 is not a demonstrated performance fix.
K3 native59421 remains live, correcting S271's verifier assumptions and session
identity handling. Its real Flash/browser acceptance has not completed.

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
