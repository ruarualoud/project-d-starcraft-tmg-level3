# T23 / S248 — fixed-snapshot casualty strategy reuse

Latest restore point and budget status are in
`ticket-23-three-arm-budget-and-status-2026-10-09.md`: B now4368/26588 on this
source, recorded116/Round2Assault; C remains83329/86307, recorded100/Round2Assault.
B's full sealed115 continuity is retained in the shared build. The following
first-live-result snapshot predates the B source load and remains historical
evidence, not the current B process or budget configuration.

## Actual source integration and first live result

C now runs this source in the ORIGINAL SQLite: Host83329 / ONE ordinary Web86307.
Its private entry is `C-casualty-strategy-source-entry.private.json` in the shared
three-arm build. Use these handles; the55588/59102 references below are historical.

The normal close was requested at91 at a completed/paused job and zero in-flight
Provider rows. The already-started lifecycle continuation drained to92. FULL sealed
initial/current envelopes and ALL73/134 paid rows match new ready92. No paid row was
added by that drain or source load. The outer aggregate differs only in the five
recovery/audit paths retained in `C-casualty-strategy-source-continuity.json`.
The original runtime8afbe8a5060b6ac3a1d017bff20366dfba14d0e9631e181e45894285ed856c6e
and original no-opening-Plan experiment remain unchanged.

The ordinary Web recovered actual92 finish activation (receipt712511ed…/Replaytrue,
image0590 inspected), then completed NEW-source actions:

- r93 Hydralisk Move, receipt
  `4ea8a74513d530b7e145642a49594e1948624f005cd110b134d46d09118095be`,
  Replaytrue, complete-board0596 visually inspected. The model queried relationships,
  chose one of four exact formation options and cited an incoming Scatter Missiles
  estimate (expected damage about1.00, one casualty0.93%).
- r94 Hydralisk finish activation, receipt
  `3064bd0182dac6d6fd1cde512b208909d29f6a7e08636bda62889c0e5622f473`,
  Replaytrue, image0602 retained. This is the existing single fully-bound Rules
  continuation, not another strategic Provider decision.

Actual choice92 timings: formation186612ms, Agent decision304460ms,
Preview11600ms, Apply19166ms, Replay48469ms. The first live result still FAILS
one-minute performance. Earlier choice87/90 were different cases and are NOT a
controlled before/after benchmark. No strategy improvement or token saving is
certified by these timings; unchanged source semantics have only the previous
focused gates plus these actual product outcomes.

Snapshot C94/Round2Movement, progress estimateCNY71.205457/211calls/57541836units.
This includes four ordinary calls after the207-call source-load baseline, not
source-load charges. B original74209/76940 is separately continuing and has NOT
loaded this source. Its last recorded113 estimate isCNY85.483695; authority114
was subsequently observed before its Web receipt was recorded. A new B safe-window
observer97573 waits only for completed/paused plus zero in-flight and may send a
normal close; no timeout warrants forced cancellation or a duplicate Host.

Review notes, not new gameplay instructions: B112 resolves a FAILED declared charge
(roll4/cap9000 versus Medic11015 gap); it is not successful melee contact. Its1–2
casualty prediction cites `attack_probability:not_yet_queried`, a Medium evidence
gap for final strategy review. C93's outside-fire-band wording and acknowledged
Scatter exposure should likewise be interpreted against its exact query facts,
not assumed to prove safety. Preserve the decisions for replay/Skill review.

Counts stay T23 33/36, T27 5/6; open248/249/250/272, complete games0/3, all18 deferred
classic maps remain in the FULL goal. A5 is still unadmitted; no extra real A review
was sent. This integration record ran no old gate, new gate, broad build, agent/K3,
install, deletion, source refresh or commit. Training promotion:none.

## Actual performance finding and scope

Original C Host55588 / ordinary Web59102 completed a NEW-source formation query
at revision87 in348806ms. The previous mission-marker LOS fix is actually loaded,
but this result does NOT pass one-minute full-action performance. Original B/C
rooms continue; no query was canceled or room reinitialized on observation timeouts.

The incoming stationary-fire path already owns an immutable probability batch.
Every attack estimate nevertheless independently called casualty strategy for its
loss examples. Every such strategy rebuilt the unchanged mission-control baseline,
target contribution context and pre-loss tactical-mass projection. Overlapping loss
choices across weapon/sample queries were recomputed too.

Two production files change:

- `packages/product-composition/official-selected-roster-ranged-action-runtime-v1.mjs`:
  a private, cloned/frozen snapshot owns a new casualty-strategy batch. Target
  contribution contexts and pre-loss tactical mass are lazy per target; unchanged
  mission control is lazy once per snapshot. Exact strategies are keyed by target
  and canonical casualty IDs. Each new casualty set still runs the original FULL
  post-loss calculations. The standalone interface stays cold and unchanged.
- `packages/online-agent-session/combat-estimation-runtime-v1.mjs`: the existing
  probability batch uses that owned casualty batch. Preview, stale-domain checks,
  EVERY dice sample, legal casualty sets, probabilities, loss examples and output
  hashes remain. No prompt, Skill, candidate ranking or tactical weights change.

There is no external prepared-context input, cross-Room/revision cache, mutable
state reference or reduced sample budget. The owning snapshot is copied and frozen;
the private results and contexts cannot follow later caller mutation.

## Concrete reproduction and bounded verification

New specific bug script:
`scripts/verify-ticket-23-slice-248-casualty-strategy-snapshot-reuse-v1.mjs`.
Input is the actual C82 capture, with a LOCAL two-unit subset retaining all1804
terrain rows. Three loss queries contain two distinct casualty sets and one repeat.
This is a narrow incoming-fire calculation fixture, NOT an official complete-room
or whole-game acceptance gate. It invokes no Provider and writes no original Room.

Red71787 exits1 with
`CASUALTY_STRATEGY_REPEATS_BASELINE_CONTROL_AND_IDENTICAL_LOSS`:6 full control
projections rather than one baseline plus two after-loss projections.

After the production change, the first segment of72641 passed:6->3 full controls,
ENTIRE original casualty strategy outputs equal, original1804 terrain and caller
input unchanged. Recorded local duration18078.8->13660.8ms is one pair under active
room load, not a statistical or whole-action speedup claim.

The ordinary probability segment initially failed because its LOCAL fixture changed
Movement to Assault without resolving the phase's First Actor choice. A diagnostic
confirmed `SELECTED_RANGED_PHASE_INITIATIVE_UNRESOLVED`; only that fixture was fixed.
The `probability_only` segment74334 then compared complete probability outputs
successfully but failed its non-vacuous control-count check: it had reduced Marine
to one model while leaving Supply2. A diagnostic confirmed
`MISSION_MARKER_SUPPLY_STATE_MISMATCH`; the fixture now reads the single-model tier
from the frozen official profile (Supply0), not a hardcoded correction.

Final probability-only invocation75735 exits0: complete cold/first/repeated
probability outputs equal; standalone2 control projections, first batch2, repeated
batch0. New snapshots remain independent, caller mutation is isolated and stale
domains reject. This is the third and last corresponding verification round.
The already-passed first segment was NOT rerun; the two passed segments together
cover the changed product and ordinary probability interfaces.
No old green, broad suite/build, subagent/K3, install, delete, refresh or commit ran.

At the source-gate snapshot below the production source was NOT loaded into
Host55588/74209. C integration and its next-action timings are now recorded above;
B's source integration remains pending. Keep this older source-only boundary as
history, not the current resume instruction.

## Actual original-room evidence

C completed NEW prior-source actions:

- r88 Vile Move, receipt
  `1fc7edfbb93283bf398d3f48ca8d717eda60549c0ea8a5dc5ed736e168a9a87d`,
  Replaytrue, screenshot0565 retained.
- r89 Vile finish activation, receipt
  `53ab9ddaba1f0d2e3b2ce650f71226bafcd0272e39e36eada0536aafcf8a5b7c`,
  Replaytrue, complete-board0571 visually inspected, no historical reconstruction.
- r90 player1 Pass, receipt
  `83a696b64a43f938973c5dbb50d1efe68a4f39566bf04f2da67ef8449bae51c9`,
  Replaytrue, screenshot0577 retained.

B r109 characteristic/status ability, receipt
`45725a0c44e81c8d6bfcc82560e31f069e355a522d244781017051a97e63343e`,
Replaytrue, complete-board0678 visually inspected; r110 finish activation,
receipt37cef4…/Replaytrue/image0684 retained. This proves continued product
execution, not high strategic quality or full map/plan admission.

Snapshot B110/Round2Assault/estimatedCNY83.082524;
C90/Round2Movement/estimatedCNY67.874279. Costs remain separate; local diagnosis
and gate Provider calls0, ordinary game calls remain billed. A v5 remains unadmitted
and no additional real A review has been sent.

T23 stays33/36, T27 stays5/6; open248/249/250/272, complete games0/3. The18 deferred
classic maps remain in the FULL goal. This source repair does not close a Slice.

Harness loop:true; routes:harness_optimizer_prompt / ordinary selfplay_agent_prompt.
Tools:actual formation/relationship queries, pure casualty/control projections,
Rules Preview/Apply/Replay and retained real UI screenshots. Memory/paid lineage
unchanged; no training promotion, trainingTruth:false. Demotion criterion:any whole
strategy/probability result difference, stale-domain bypass, caller-state mutation
or cross-snapshot reuse invalidates the optimization.
