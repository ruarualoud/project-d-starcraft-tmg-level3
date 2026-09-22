# Current work

This is the compact entry point for agents working in this repository. Historical
detail remains in the parent `TASKS.md` and `PROJECT_MEMORY.md`; load a specific
historical entry only when a linked task requires it.

## Active phase: product development resumed

### 2026-09-22 Ticket 24 / Slices 254-R3–R5 checkpoint

The old Slice 254-R2 branch rendered axis-aligned source footprints over the
map image. Lost Temple review proved those rectangles do not follow the visible
water, cliffs, high ground, ramps or foliage, so that branch is stopped and is
not integrated. K3 now owns an isolated semantic-map reset: a versioned art +
reviewed multipolygon/ring/line geometry pair, shared normalized/pixel/inch
transform, precise visible effect boundaries, and the Lost Temple exemplar.
The same slice also derives an official-guideline terrain-piece library,
deterministic seeded generation and a manual editor with live spacing,
complete-base transit, mission reachability and certification previews. K3
must self-verify every generated/editor state and deliver desktop plus 390px
screenshots for semantic overlay, boundary-off, random generation, manual edit,
invalid layout and restored valid layout. Runtime pixel inference and paid
Provider work are forbidden. Remaining maps may be marked pending authoring,
but no classic map may be promoted without its paired semantic geometry.

### 2026-09-22 Ticket 24 / Slice 254-R1 historical checkpoint

The historical 20-map topology/adapter work existed, but the Slice 254 compiler
discarded enabled source footprints and placed them into generic balance slots.
Compiler v1.3 now preserves map-specific Rules geometry, materializes passage
openings and high-ground access, compiles blocking features as impassable, and
records bounded balance translations. The formation prefilter now blocks only
explicit or impassable terrain. The 20-map focused gate and a real Lost Temple
Standard-2000 room certification passed; the latter contains nine certified
terrain pieces and two central-temple ramp access points. The old fixed
quadrant manoeuvre witness was found blocking the restored southwest geometry
and has been replaced by a deterministic free-space witness solver.

Its rectangle-based source footprints remain valid only for abstract Rules
harnesses and explicitly placed tabletop terrain. They are not sufficient for
classic-map art fidelity and are superseded by the semantic-map reset above.

### 2026-09-22 Ticket 23 / Slice 248 checkpoint

2026-09-23 recovery follow-up: branch `20260922133120597` has now applied and
Replay-verified r6 (18-model Raptor), using 2 new Action calls / 176,085 units.
Current conservative branch total is 7 calls / 884,206 units / ¥1.164198.
Browser closure exposed a second concrete recovery defect: the bot retained
old transport issues after successful Apply/Replay, and the runner swallowed
that semantic High finding as a transient manifest read and polled forever.
The bot now resolves the two transport codes on verified Apply and reconciles
a persisted successful boundary on reattach, matching the last attempted state,
receipt and Replay trace; an older success cannot clear a later failed attempt.
The runner retries only typed read-transport failures, not Rules, budget or High
findings. Existing durable-boundary diagnostic's `--transport-recovery-only`
mode reproduced both defects, then passed on its third/final run (one repair
needed to account for normal shutdown's `closed_by_host` status). No Provider
or Room mutation in that gate. Resume is for capturing the already-durable r6,
not re-applying it or making another paid decision.

The special-terrain LOS root is now repaired: setup-agreed nonstandable
impassable terrain does not need a fictional adjacent elevation pair. Actual
access connections and Size 0/1 still cannot be labelled impassable. The
existing formation diagnostic now has a read-only `--special-terrain-los-only`
mode over the persisted failing room, avoiding full runtime reconstruction.
The original r6 reproduced the exact derivation failure before the fix, then
passed once in 1,433ms after it (0 Provider calls/Room mutations). Both actual
Goliath→Hydralisk pairs are blocked by the central Size 3 temple; the closest
base gap of 21.075in is not proof of visibility. This corrects the earlier
implication that the deployment was necessarily exposed. The old observation
was still defective because it substituted failed LOS for a negative result;
the old branch stays non-training. Deliberately invalid context still reports
typed unknown, never zero threat. Report:
`docs/ticket-23-slice-248-special-terrain-los-repair-2026-09-22.md`.
The current r5 resume has a completed Raptor Planner and four cached formation
options outside the 24in stationary band; none has a LOS failure. Its completed
queries can be preserved and continuation starts at Action, not Planning.

The first post-spacing fork `20260922131200726` is Authority/Rules legal at
r6 but is non-training strategy evidence. Its Hydralisk formation sat 21.075in
from Goliath; Scatter Missiles has a 24in printed range, yet a failed special-
terrain LOS batch yielded zero visible pairs and the old calculator collapsed
that unknown into `no_current_position_stationary_attack_domain`. The tactical
graph now preserves unknown LOS pairs and in-range weapon identities, formation
options expose typed unknown stationary-fire profiles, the probability surface
returns `unknown_current_position_stationary_attack_domain`, and the Action
gate rejects prose that turns unknown LOS into safe/zero exposure. The existing
formation diagnosis was extended for this concrete defect; it uses 0 Provider
calls and 0 Room mutations. The failed branch cost 7 calls / 502,089 units /
¥0.649321 and must not continue or train. Next fork again from safe r5 under
the repaired observation contract.

The repaired follow-up branch `20260922133120597` remains at safe r5. Two
initial query rounds completed; a network interruption left the third Provider
attempt as `provider_worker_protocol_rejected`. Explicit resume initially
stopped before egress because that historical transport finding was not in the
precise pre-resume allowlist. After adding it, resume advanced one paid round
and then the still-unstable network produced a new `provider_transport_failed`.
No action was Previewed or Applied. The branch currently records 5 calls /
708,121 units / ¥0.934974 under conservative unknown-usage accounting. Both
typed transport failures are now allowed only when they predate an explicitly
authorized resume; a newly occurring failure still blocks immediately. Do not
retry again until transport is stable.

The fresh abstract-terrain Standard-2000 A-A run
`20260922115126519` is now at revision/action 6. The first Zerg deployment
compared four exact Host-solved formations and chose the 18-model Raptor
requested-left option: minimum visible-enemy base-edge distance 25.633in,
4.020in from marker 2, 16.813in from marker 3, and one bounded next-round
move-then-fire profile. DeepSeek's three Action corrections omitted eight
strategy explanation arrays even though the candidate, selection, public
summary and Rules evidence were complete. Action normalization v35 now fills
only those absent shapes from the same public benefit/risk, Planner
contingencies/reviseIf and selected Rules identity. The already-paid eighth
candidate then passed local revalidation, all 18 bases, Apply and Replay with
zero new Provider work. Current ledger: 20 calls / 1,326,840 units /
¥1.772189. Screenshot:
`build/ticket-23-slice-248-standard-2000-aa-live-v1/20260922115126519/screenshots/0044-r006-player2-deploy-complete-board-applied.png`.
This abstract map is deliberate Rules/strategy evidence only; it cannot claim
classic-map art/terrain alignment.

The live official Command Center record confirms that `Swarmling (Zergling)`
has one purchasable 18-model composition at Supply 1; its `large` product field
is unavailable. Ordinary `Zergling` is different: its 18-model large
composition is Supply 2. The r11 Room state was therefore correct, but the
Agent prose incorrectly promoted 18 models into a “large marker-contest Supply
pool”. Planning and Action validation now reject that causal inference against
the exact `currentSupply` observation, while allowing the correct distinction
between physical footprint/casualty buffer and marker-control Supply. The
existing Slice-248 focused gate reproduces the paid r11 sentence and passed
once after the repair with 0 Provider calls / ¥0. Revision 11 remains Authority
evidence but its contradicted strategy prose is non-training and continuation
must fork from r10.

The follow-up observation audit proved that r11 never exposed a composition
label to the Planner: it already carried `18 models / currentSupply 1`, so the
failure was a model-count-to-control-strength analogy rather than `small` versus
`large` field leakage. The Host now projects a Rules-derived `supplyControl`
summary per on-table and reserve Unit. It contains the exact current Supply,
every future casualty breakpoint, the next Supply reduction and the Supply-zero
threshold, while explicitly omitting army-composition labels. Swarmling at 18
models therefore reports 12 casualties required to reach 6 models / Supply 0;
ordinary 18-model Zergling reports 6 casualties to Supply 1 and 12 to Supply 0.
The compact Planner/Action observation preserves this summary. The same focused
gate passed once after the change with 0 Provider calls / ¥0.

The collaboration environment is complete. Product work resumes from the
ordered acceptance list below; Codex owns integration and Kimi receives only
explicit, isolated slice manifests.

| Slice | Deliverable | Status |
| --- | --- | --- |
| ENV-1 | Secret/large-file audit and recoverable historical integration baseline | Complete — `f67c23e`, pushed |
| ENV-2 | GitHub CLI, Kimi Code CLI, Keychain-backed K3 connection | Complete — Kimi `2.0.2`, gh `2.101.0`, `K3_READY` |
| ENV-3 | Pinned runtime, ignore policy and offline environment doctor | Complete — focused doctor 9 pass / 1 expected dirty-tree warning |
| ENV-4 | Compact navigation and verification routing | Complete — this file is the agent entry point; slice manifests own focused gates |
| ENV-5 | One-Issue/one-worktree Codex–Kimi collaboration module | Complete — five-command interface and two scoped Kimi agents |
| ENV-6 | Focused pre-commit and GitHub CI guardrails | Complete — Kimi implementation `6f17212`, integrated as `de66fb8`; focused gate 21/21 |
| ENV-7 | GitHub labels, issue/PR templates and remaining-slice publication | Complete — 15 labels, templates, 8-issue publication bundle; focused gate 33/33; remote issue apply waits for GitHub CLI authentication |

## Product order after environment repair

1. Ticket 23 / Slice 248: alternating activation, phase completion, Charge
   recovery, 18-model formation recovery and round-2 reserve entry are repaired.
   LegalSpace, Planner and Action now share the Rules-owned selected
   action/ability/effect/source and printed/reduced/effective resource-cost
   contracts across all paying action families. The exact r63/r64/r66 defect
   reproducers passed at 0 Provider calls / ¥0. Freeze revision 66 as the
   immutable low-strategy baseline; preserve its old prose as non-training
   evidence and never resume it. Optimized comparison waits for Slices 262–263.
2. Ticket 23 / Slice 248: complete player-seat companion permissions, layered
   memory/role runtime and real floating-Web acceptance. Kimi owns isolated
   presentation work; Codex retains permission, memory and room contracts.
3. Ticket 23 / Slice 248: attack probability, fire-zone exchange and the
   prediction → outcome calibration → replanning loop are implemented. The
   concrete r66 gate passed with 216 exact-mechanics samples, four comparison
   alternatives and one typed `hit` calibration; 0 Provider calls / ¥0.
   **Complete.**
4. Ticket 25 / Slices 262–263: close free-formation strategy and A-A/review
   evidence. K3 owns the isolated threat/predicted-interaction Web/App UI and
   self-verification. Codex owns Rules/projections, integration and natural-match
   acceptance. The optimized path now persists public plan, assessment, plan
   revision and compact intent/query references without hidden chain-of-thought.
   Terminal Replay parity now gates lossless NDJSON/MuZero/RLDS candidates and
   governance audit, plus a full-denominator Postgame Review V2 Episode with
   checkpoint/scenario/model/prompt/Skill bindings. A Room-backed experiment
   port now reconstructs exact signed checkpoints and protects the source Room;
   the live isolated branch executor and acceptance still remain. New-match
   evidence now separates available capability, natural Agent use, Rules
   Apply/Replay and observed impact for formations, attack probability,
   fire-zone exchange and prediction calibration. A same-cycle ordering defect
   that delayed new calibrations until the following activation is repaired;
   one affected syntax gate passed. Long-run checkpoints now expose the same
   strategy-evidence summary before terminal closure, allowing early diagnosis
   without restarting or waiting for the full match. The formal server also
   rejects a missing or source-stale current Expo Web export before any Room or
   Provider work, preventing paid evidence from silently using an old UI.
   Formal Workbench reads now resolve official pieces through the Room-frozen
   combat/V2 attack/action-route catalogues and filter by projected equipment;
   the Standard-2000 Marine gate passed 18/18 with four selected attack profiles
   and zero Provider calls.
   Slice 265 is complete: Teach-derived decision material, creation-round Omega
   suppression, last-valid-revision recovery, destination surface derivation,
   exact stationary-fire casualty/Supply states, bounded move-then-fire risk,
   reaction choices, Tactical Mass and exact loss lists passed the focused gate.
   The room fork/replay smoke covered four transitions with 0 Provider calls and
   ¥0; the historical failed suffix remains non-training evidence.
   Training and Skill promotion require independent approval.
5. Ticket 23 / Slice 249: evaluate WikiSkill/EvoTest against the existing
   replay-driven Skill evolution loop. The same scene-scoped evidence feeds a
   three-arm comparison: current SkillOpt, WikiSkill knowledge compilation and
   EvoTest isolated test-time evolution; Critical/High-only blocking, held-out,
   arena, versioned promotion and rollback remain mandatory.
6. Ticket 26 / Slices 264–266: the generic companion backend and its five
   capability bundles are integrated; Provider accounting now preserves
   `unknown` rather than reporting an invented zero. File-backed SQLite and
   production PostgreSQL adapters implement one encrypted persistence port;
   SQLite checkpoint/restore and restart passed the focused gate, and durable
   construction rejects missing or malformed managed keys instead of silently
   accepting an ephemeral key. K3 completed and self-verified the isolated
   six-companion Web/App roster (`18/18` browser checks) and delivered the
   merged Slice 266-C/266-D closure for stale Character package binding,
   Tavern-equivalent capability, floating product surface and committed
   SC1-style dynamic portrait binding. Integrating browser acceptance passed 28
   checks, then stopped at `NOTE_REQUESTS_NOT_CAPTURED` (`captured: 1`) on its
   third/final round. The implementation remains merged; K3 owns the isolated
   Author's Note capture repair and a fresh closure, while Ticket 23 continues
   independently. Slice 266-E now binds durable companion
   conversations to the authenticated Room seat/principal/MatchBinding, supports
   1–6 ordered companion replies and session-isolated checkpoint restore, and
   never grants Room mutation. The remaining companion product work stays
   isolated under K3; Codex returns to strategy decisions, formal match evidence
   and replay/Skill-evolution closure, and only reviews the final integration
   boundary. Final companion acceptance still requires
   Tavern-equivalent cards/world books, layered long-term memory and
   relationship state, resumable long-running roleplay, multiple companions in
   one conversation, and no exposure of opponent-private agent state.
   Slice 266e is now merged through `merge(ticket26): integrate companion final
   product closure`. K3's one final focused browser run passed `45/45` checks,
   `15` claims and `21` hashed artifacts: the Author's Note capture denominator
   remains 2/2, six-state portrait animation is bound to real session signals,
   and sealed package promotion persists/reloads with pin verification and
   tamper rejection. It used 0 real Provider calls and ¥0. Ticket 26 product
   closure has no open Critical/High finding; its explicitly documented
   marketplace/continuous-motion/data-content gaps are nonblocking.
7. Ticket 27 / Slices 267–272: build the independent Roster Strategist. The
   Rules-owned Army Builder remains the sole legality authority; the Agent uses
   General/faction/matchup Skills, scoring plans, spatial/probability/math tools
   and isolated scenario simulation to choose a legal roster and persist a
   public, versioned `RosterPlan`. Formal review compares the fixed preset
   roster (explicitly no pregame plan) against an Agent-built roster, and makes
   the structured planning/calibration trace available to WikiSkill/EvoTest
   without storing hidden chain-of-thought or auto-promoting a Skill.
8. Ticket 14 / Slice 143: run the deferred APK acceptance when a real Android
   device is available.

## Current formal match

- Ticket 23 / Slice 248 optimized Standard-2000 A-A run
  `20260921173620519` is checkpointed at revision/action 6. It has 2/2
  Agent-selected formations with public reasons and Apply/Replay parity, 20
  Provider calls, 967,898 reported units and ¥1.338574. Zerg's first Swarmling
  placement explicitly recognized both Goliath move-then-fire bands instead of
  treating current out-of-range as safety. Attack probability/fire-zone
  receipts and prediction calibration are not yet applicable/observed because
  the match has only just completed the first deployment on each side.
- The later revision-7 Creep Spread action is preserved as non-training defect
  evidence: its relationship graph showed two incoming Goliath move-then-fire
  profiles while its Lie in Wait comparison claimed zero. Planner comparisons
  and Action rejected alternatives now share a stationary-versus-move-then-fire
  semantic gate; the exact defect-shaped command failed before the change and
  passed once after it with 0 Provider calls / ¥0. The formal continuation must
  fork from revision 6 rather than resume revision 7. The whole preserved run,
  including the invalid suffix, accounts for 29 Provider calls, 1,346,794
  reported units and ¥1.852721.
- A fresh fork now exists at revision 6 in run `20260921182729904`. Its first
  resume exposed a pre-Provider recovery defect: continuity stored the forked
  Plan authority on the record while TurnPlan hydration read only the payload,
  then dereferenced a null `stateHash`. The exact zero-Provider reproducer
  failed before the change and passed once after hydration recovered the record
  authority and the observation boundary made older missing authority a safe
  reassessment. That branch then advanced legally through revision 7 with Creep
  Spread. Revision 8 legally applied Ventral Sacs, but its public strategy prose
  described a Creep Tumor/ON CREEP network. A Rules-owned effect contract now
  distinguishes all five coordinate battlefield-asset families and rejects
  name-correct/effect-wrong Planner or Action claims; the concrete gate passed
  at 0 Provider calls / ¥0. Preserve revision 8 as non-training defect evidence,
  fork through revision 7 and regenerate only that decision next; do not restart
  from revision 0. The first revision-7 fork exposed that accepted battlefield-
  asset actions omit the domain's presentation-only ability name while retaining
  definition/effect identity. Fork matching now uses exact core identity plus
  every historical Rules discriminator and requires one unique current domain.
  Zero-Provider preflight replayed all seven transitions into branch
  `20260921192605226`. That branch regenerated revision 8 correctly: Ventral
  Sacs placed a Faction Indicator and described the End-of-Round Ground Reserve
  deploy with Apply/Replay parity (4 calls, 181,580 units, ¥0.245971). Revision
  9 then selected legal Omega Network but falsely described the same indicator
  effect. All eleven executable selected-roster active effects now publish a
  mandatory adapter-owned semantic contract; Omega Network explicitly places
  an Omega Worm and exposes its later-round Entry Edge/Supply-2 behavior, not a
  reserve indicator. The first live retry exposed a second High transport bug:
  LegalSpace compiled the contract but the Spatial Action projection dropped it,
  so selected identity still contained `effectContract: null`. The same exact
  test now enters through the real projection; it failed before and passed once
  after the contract was carried into both Spatial Action Space and the compact
  Planning index, at 0 Provider calls / ¥0. Preserve both r9 attempts as
  non-training evidence and fork through corrected r8 once more. If the same
  semantic class fails again, stop under the three-round convergence rule.
  The third effect attempt then passed the full Omega semantic contract, but
  exposed a separate source-resource transport defect: the Agent was told the
  zero-resource card feature would not exhaust even though Apply exhausts it.
  Selected-roster domains and Spatial Action now preserve source kind/instance,
  with a legacy fallback from `constraints.sourceCardInstanceId`; the exact
  projected Omega false-no-exhaustion gate passed at 0 Provider calls / ¥0.
  Preserve that revision 9 as valid Authority/non-training prose and fork from
  corrected revision 8 for the resource-correct action. That fork
  (`20260921201508356`) safely stopped before Apply after three Planner
  corrections because the local effect classifier treated correct Source of
  Creep/Entry Edge prose—and even explicit “not a Creep token / not a Faction
  Indicator” wording—as foreign effects. The exact persisted wording failed
  the existing gate before repair and passed once afterward. Effect matching
  now uses high-confidence placed-asset claims plus negation awareness; positive
  Omega-as-indicator drift still fails. Continue again from revision 8; do not
  restart the match.
  The next fork legally applied the corrected Omega action at revision 9, but
  its public opponent model predicted another current-phase Goliath move after
  the Authority journal had already recorded that Unit's completed Movement
  activation at revision 5. Spatial observation already exposed
  `activatedPhases`; the missing link was Host validation. A typed lifecycle
  gate now rejects named own/allied actors, wrong-current-phase ordinary action
  classes and visible actors already activated in the predicted phase. The
  exact Goliath defect failed before repair and passed once afterward; an
  unactivated Marine reserve deploy remains valid. Preserve the r9 Authority
  action but not its strategy prose, and fork from revision 8 once more so plan
  memory starts with a lifecycle-valid counterplay hypothesis.
  That retry correctly denied another Goliath move, but then typed an off-table
  Marine as `move` while describing Deploy, and attached a side-level
  `phase_control` response to the Goliath Unit. The same lifecycle gate now
  unifies on-table/off-table actor location: Reserve actor requires Deploy,
  on-table actor cannot use Reserve Deploy, destroyed actor cannot act, and
  Pass/choose-first-actor/phase-control cannot name a Unit actor. The concrete
  shapes failed before the follow-up and passed once after it. The third and
  final live convergence branch `20260921211447031` replayed safely to r8, then
  stopped without Preview/Apply after three consecutive malformed
  `submit_decision` JSON argument payloads. This is a High structured-output
  transport blocker, not another lifecycle contradiction. Under the three-round
  rule there was no fourth paid retry in that cycle; r8 remains the current safe
  boundary. The independent follow-up repair now routes native tool arguments
  through the existing grammar-only normalizer and, when local recovery fails,
  forces a terminal-only format-repair round while preserving plan/query state.
  The exact tool-argument gate failed before and passed once after repair with
  0 Provider calls / ¥0. Post-repair branch `20260921214904680` has now
  advanced r8→r9 with a Rules-instantiated Omega Worm at `(14000,12000)`, source
  card exhaustion, Replay parity and a real Web screenshot. Its next
  relationship query exposed a separate strategy defect: the Worm is about
  `17.946"` base-edge from the Goliath and inside two stationary printed-range
  bands, contradicting the r9 “far” rationale. The r10 Planner repeated that
  false claim across three corrections and no r10 action was applied. Asset
  placement now returns a bounded strategic option set with per-option incoming
  fire and objective metrics, rejects false-safe selection reasons, and makes a
  sole fully-bound finish action deterministic at zero Provider cost. Fork from
  r8 and regenerate r9; never resume the low-strategy r9 branch. The first
  threat-aware retry `20260921224418000` chose a position-valid Worm at
  `(47250,1600)` with zero projected stationary and move-then-fire profiles,
  but its final opponent hypothesis incorrectly treated completed Movement
  activation as locking the Goliath out of later Assault and Combat actions.
  Predicted action aliases are now canonicalized, cross-phase lockout prose is
  rejected, and prompt v23 states that activation is phase-scoped. The concrete
  gate failed before repair and passed once afterward at 0 Provider calls.
  Preserve that r9 Authority state as position evidence only; fork r8 once more
  for a lifecycle-valid r9. That fork, `20260921231542474`, corrected the
  lifecycle hypothesis after one rejected Action attempt, then omitted the
  unchanged asset `selection` from both correction submissions. The Host
  mislabeled those partial corrections as `DECISION_PROPOSAL_ILLEGAL` and
  stopped after three semantic rounds without Apply. The first local recovery
  proved the missing selection, then exposed the complete schema-role drift:
  four top-level fields were nested under `intent` and unchanged intent arrays
  were omitted. Action normalization v28 now lifts those typed fields and merges
  the correction as a delta over the newest complete same-candidate submission;
  current values always win and the resulting selection still passes the
  current Rules receipt. Explicit resume may ignore only this exact pre-start
  finding until the retry ends; success marks history resolved, while any new
  High still blocks. The exact delta gate passed once at 0 Provider calls.
  The third local revalidation then applied r9 with 0 new Provider calls and
  Replay parity, but audit found inherited tradeoffs/risks/next focus still
  described the earlier `(16772,12852)` 2/3-exposure option while the actual
  selection was `(47250,1600)` at 0/0 exposure. That stale plan memory is High:
  the branch is Authority-valid but non-training and cannot continue. Per the
  three-round rule there is no fourth recovery. Normalization v29 now refuses
  to inherit selection-sensitive intent when selection identity changes; the
  concrete fail-closed gate passed once at 0 Provider calls. A future attempt
  must fork the safe r8 boundary and produce a fresh complete Action. See
  `docs/ticket-23-slice-248-terminal-tool-json-convergence-blocker-v1-2026-09-22.md`
  `docs/ticket-23-slice-248-terminal-tool-json-recovery-v1-2026-09-22.md` and
  `docs/ticket-23-slice-248-asset-placement-threat-strategy-repair-v1-2026-09-22.md`
  and
  `docs/ticket-23-slice-248-cross-phase-activation-prediction-repair-v1-2026-09-22.md`
  and
  `docs/ticket-23-slice-248-correction-selection-recovery-v1-2026-09-22.md`.
- This match uses the fixed Standard-2000 acceptance rosters and therefore has
  no Agent-authored pregame `RosterPlan`. After this fixed-roster control match,
  Ticket 27 must deliver the Rules-gated Roster Strategist and run a second
  2000-point experiment with a public victory route, scoring plan, component
  roles, matchup counters and query/simulation receipts.

Tickets 19–22 and Ticket 20 Slices 193–195 retain their focused closure; final
synthesis indexes later evidence without rerunning unrelated passed gates.

## Active invariants

- Official source data is not refreshed without an explicit user command.
- Rules/Authority own legality. UI, Providers, Skills and agents cannot override it.
- One changed area receives one relevant verification run; no automatic full-suite reruns.
- Only Critical/High review findings block integration. Stop a non-converging
  review or repair loop after three rounds and report the blocker.
- No paid Provider call is implicit. Record calls, reported tokens and cost when
  the provider exposes them.

## Navigation

- Domain vocabulary: `CONTEXT.md`
- Primary implementation plan: `docs/implementation-plan-2026-08-24.md`
- Remaining primary roadmap: `docs/remaining-tickets-14-22-development-roadmap-2026-09-03.md`
- Ticket 20 roadmap: `docs/ticket-20-slices-186-195-human-agent-spatial-memory-roadmap-2026-09-11.md`
- Ticket 19 roadmap: `docs/ticket-19-slices-196-201-muzero-player-view-trajectory-roadmap-2026-09-14.md`
- Ticket 21 roadmap: `docs/ticket-21-slices-202-209-production-operations-roadmap-2026-09-14.md`
- Ticket 22 roadmap: `docs/ticket-22-slices-210-214-final-synthesis-acceptance-roadmap-2026-09-14.md`
- Ticket 27 roadmap: `docs/ticket-27-slices-267-272-roster-strategist-roadmap-v1-2026-09-21.md`

## Current accounting

- DeepSeek baseline r66: 66 actions, 76 screenshots, 246 Provider calls,
  14,864,740 total units, ¥20.117467; focused repairs cost ¥0 and no ¥100
  threshold was crossed.
- Current recovered fixed-roster branch through defective revision 8: 10 calls,
  455,829 reported units and ¥0.627174. Revision 7 accounts for 7 calls,
  339,548 units and ¥0.459326; revision 8 adds 3 calls, 116,281 units and
  ¥0.167848 and remains non-training evidence.
- Corrected branch `20260921192605226` through defective revision 9: 9 calls,
  386,294 reported units and ¥0.521420. Correct revision 8 accounts for 4 calls,
  181,580 units and ¥0.245971; defective revision 9 adds 5 calls, 204,714 units
  and ¥0.275449 and remains non-training evidence.
- Adapter-contract branch `20260921194916820` through defective revision 9:
  5 calls, 221,094 reported units and ¥0.299055. Its contract was lost in
  projection, so the revision remains non-training evidence.
- Fully projected effect branch `20260921195834545` through resource-defective
  revision 9: 4 calls, 161,952 units and ¥0.221175. Effect semantics are correct;
  the false source-card non-exhaustion claim keeps its prose non-training.
- Resource-correct convergence branch `20260921201508356`: 5 calls, 242,980
  units and ¥0.344920. No action was applied; the local classifier rejected
  three semantically correct Omega plans because of broad/negation-blind phrase
  matching. The branch remains non-training failure evidence. Recent recovery
  work totals 33 calls, 1,468,149 units and ¥2.013744; together with the original
  invalid-suffix source this is 62 calls, 2,814,943 units and ¥3.866465. No ¥100
  threshold was crossed.
- Lifecycle-defective Omega branch `20260921204159763`: revision 9 applied and
  Replay matched, but the impossible repeated Goliath Movement prediction keeps
  its strategy prose non-training. Usage: 6 calls, 271,979 units, ¥0.378876.
- Actor/location-inconsistent Omega branch `20260921205840768`: revision 9
  Apply/Replay passed, but its off-table Marine `move` and Unit-bound
  `phase_control` keep the strategy prose non-training. Usage: 6 calls, 296,013
  units, ¥0.415465. Recent recovery work is now 45 calls, 2,036,141 units and
  ¥2.808085; including the original invalid-suffix source: 74 calls, 3,382,935
  units and ¥4.660806. No ¥100 threshold was crossed.
- Terminal-tool convergence branch `20260921211447031`: replayed to r8, then
  stopped before Apply after three malformed JSON `submit_decision` calls. Usage:
  8 calls, 409,930 units and ¥0.540267. Recent recovery work is now 53 calls,
  2,446,071 units and ¥3.348352; including the original invalid-suffix source:
  82 calls, 3,792,865 units and ¥5.201073. No ¥100 threshold was crossed.
- Accepted post-repair branch `20260921214904680`: r8→r9 used 6 calls, 305,276
  units and ¥0.417534. Recent recovery work is now 59 calls, 2,751,347 units and
  ¥3.765886; including the original invalid-suffix source: 88 calls, 4,098,141
  units and ¥5.618607. No ¥100 threshold was crossed.
- The same branch's blocked r10 Planner added 4 calls, 166,414 units and
  ¥0.250923 without Apply. Recent recovery work is now 63 calls, 2,917,761 units
  and ¥4.016809; including the original invalid-suffix source: 92 calls,
  4,264,555 units and ¥5.869530. No ¥100 threshold was crossed.
- Threat-aware branch `20260921224418000`: r8→r9 used 7 calls, 360,536 units
  and ¥0.502328. Its Omega position is valid but the cross-phase activation
  narrative is non-training evidence. Recent recovery work is now 70 calls,
  3,278,297 units and ¥4.519137; including the original invalid-suffix source:
  99 calls, 4,625,091 units and ¥6.371858. No ¥100 threshold was crossed.
- Correction-lane fork `20260921231542474`: 6 calls, 316,804 units and
  ¥0.448593. The third zero-call local replay applied r9 with Replay parity,
  but stale selection-specific plan memory keeps the branch non-training and
  non-continuable. Recent recovery work is now 76 calls,
  3,595,101 units and ¥4.967730; including the original invalid-suffix source:
  105 calls, 4,941,895 units and ¥6.820451. No ¥100 threshold was crossed.
- Kimi CLI exposes no token or currency telemetry, so no Kimi cost is inferred.
# 2026-09-22 — Ticket 23 / Slice 248 lifecycle-aware threat projection

- The r8 recovery branch `20260922003116755` stopped before Apply after `6`
  calls because the Host promoted Goliath's future `Speed + range` band to a
  current-round move-then-fire action even though its Movement activation was
  complete. The model's statement was correct; the projection was not.
- Relationship, formation and asset-placement projections now separate broad
  geometric/future bands from current-round threats using independent Move,
  Ranged Attack, melee Fight and typed damage-ability gates. Ranged Attack does
  not move. Delayed Token/end-of-round damage stays a separate typed channel.
- The directly affected existing gate ran once and passed. Provider/cost delta
  for the repair is `0/¥0`; the failed live reproducer cost was
  `6 / 277,302 / ¥0.394044`.
- Next: commit the repair, then fork the authoritative state only through r8
  and request one live action. Do not resume the rejected suffix.
- Ticket 26 / Slice 266e continues independently in the K3 worktree. Network
  recovery checkpoint `6fcab1d` preserves package-promotion work; K3 resumed
  to finish the final browser gate.
- First post-repair live run `20260922015024919` proved the current/next-round
  threat fields reached the Agent and produced the intended `(47250,1600)`
  choice, but no action applied: correction deltas could not inherit a paid
  selection that an earlier strict response nested below `intent`. Historical
  candidates now receive the same field lift before inheritance. The existing
  asset/correction gate passed once with `nestedHistoricalSelectionRecovered`.
  Run cost: `7 / 345,548 / ¥0.948894`; next remains a fresh r8 one-action fork.
- The first same-branch resume made no Provider call but skipped local replay
  because the normalizer change had not advanced its durable v29 marker. Action
  shape normalization is now v30. Existing paid v29 candidates are revalidated
  before the correction ceiling; the ceiling still forbids a fourth egress.
- The next explicit resume still stopped before Decision Port because its old
  finding had been refined to
  `LIVE_DECISION_SEMANTIC_CORRECTION_LIMIT_REACHED`, while the runner admitted
  only `LIVE_DECISION_ACTION_DID_NOT_CONVERGE`. Both typed convergence findings
  are now admitted only when they predate an explicit resume. Any new
  Critical/High finding still blocks, and successful Apply/Replay must resolve
  rather than delete the historical finding.
- The repaired explicit resume then completed r8→r9 through v30 local replay
  with Apply/Replay parity and resolved both historical High findings. It made
  `0` new Provider calls: the run remains `7 / 345,548 / ¥0.948894`. Audit found
  one new strategy defect in the recovered paid candidate: the named Goliath
  response used `horizon.kind=current_round` even though its own evidence and
  current relationship receipt said no current-round fire band and earliest
  pressure next round. The r9 Authority transition is retained, but its plan is
  non-training and must not continue.
- Opponent prediction validation now binds a named current-round ranged actor
  and target to their current relationship receipt. At least one current-round
  stationary or move-then-fire profile must exist; otherwise the prediction is
  rejected before Apply. Future horizons and missing relationship evidence are
  not guessed. The existing lifecycle/threat gate covered the captured failure
  and a legal positive case, ran once, and passed with `0` Provider calls.
- Fresh r8 fork `20260922024626512` stopped before Apply after `8` calls:
  the first prediction repeated an already-spent Move, then two corrections
  kept a named Goliath Ranged Attack at `current_round` despite explicitly
  citing zero current-round fire bands. The model therefore understood the
  evidence but the correction contract did not say how to repair the horizon.
- Prediction contradictions now return a typed repair hint: use a bounded
  future horizon or choose an actor/target that actually has the required
  current lifecycle/band. The ordinary prompt also defines a horizon as when
  the named action itself can legally occur and rejects basis/horizon
  contradictions. The captured failure assertions were added to the existing
  focused gate; it ran once and passed with `0` Provider calls and `¥0`.
- Failed-fork usage is `8 / 393,582 / ¥1.065288`. Recent recovery work is now
  `97 / 4,611,533 / ¥7.375956`; including the original invalid suffix it is
  `126 / 5,958,327 / ¥9.228677`. No ¥100 threshold was crossed.
- K3 Ticket 26 / Slice 266e is merged and accepted at 45/45 checks with no
  Critical/High findings. Ticket 27 / Slices 267–268 is delegated in an
  isolated worktree; the main process waits for its completion notification
  rather than polling it.
- Post-repair fork `20260922031327201` completed r8→r9 and stopped at the
  requested one-action checkpoint. Omega Network placed the Worm at
  `(47250,1600)`; the exact option reported zero current stationary and
  move-then-fire profiles at a 34-inch base-edge gap. Apply/Replay matched.
- Both public opponent hypotheses now use
  `bounded_public_transitions(count=2)`: Goliath movement/fire is explicitly
  next-round pressure, while the off-table Raynor response is a typed Deploy.
  No lifecycle/horizon contradiction or Critical/High finding remains.
- The accepted action used `6 / 325,357 / ¥0.914067`. Recent recovery work is
  now `103 / 4,936,890 / ¥8.290023`; including the original invalid suffix it
  is `132 / 6,283,684 / ¥10.142744`. No ¥100 threshold was crossed.
- Ticket 26 / Slice 266f is queued for K3 only after its current Ticket 27
  assignment reports completion: prove a real Chinese Provider conversation,
  audit formal versus fixture worldbook content, restore a wide desktop focus
  mode/mobile full-screen sheet, and replace the companion yellow/olive theme
  with StarCraft-style blue/cyan while retaining warning amber.
- Formal branch `20260922041417301` advanced r10→r11 with a Rules-legal
  nine-model Marine deployment and Apply/Replay parity. It used `8` calls,
  `530,197` reported units and `¥0.705834`; the Agent's own objective weights
  produced a position 25.153 inches from the Swarmling and 6.870 inches from
  the nearest marker, which remains review evidence for possible over-timidity
  rather than a Host/prompt policy target.
- The r11 production trace exposed a local formation-search delay of about
  451 seconds. Exact pair search is now cached; stationary-range proof skips
  irrelevant per-model LOS, complete-opponent gap proof can skip an impossible
  engagement graph, and complete untruncated relationship evidence avoids a
  duplicate incoming-fire enumeration. The unchanged r10 formation request
  passed its one focused post-change gate in `11.437s` with `3180` generated,
  `4` exact instantiations and `4` legal options, without lowering strategy
  objectives/budget or mutating Room/using Provider. See
  `docs/ticket-23-slice-248-formation-search-performance-repair-v1-2026-09-22.md`.
- K3 now has two isolated active assignments: Ticket 26 / Slice 266f must
  produce a real Chinese companion BYOK acceptance and visual/report evidence;
  Ticket 27 / Slices 269–270 must produce a real 2000-point model-generated
  RosterPlan, Rules legality receipt and immutable pregame laboratory report.
- Ticket 23 / Slice 248 formation-strategy finding: the current public flow is
  already Agent objectives -> bounded legal formation options -> Agent option
  selection/public reason -> Rules Preview/Apply/Replay. However, the r6
  18-model Raptor option came from a fixed hex lattice spaced at max base
  diameter + 20 milli-inches. Its 19-milli-inch minimum base gap is therefore
  solver bias, not a four-inch coherency requirement. Authority legality is
  retained, but r6 is strategy-provisional and non-training. Expand the
  candidate family at one legal anchor to variable-spacing compact, dispersed,
  screen, surround/max-engagement, threat-avoidance, marker/channel-preserving
  variants; expose formation footprint/gap/threat/mission/future-mobility
  metrics to the Agent; then fork the accepted run from r5 and recompute r6.
  Formation placement is a first-class strategy decision and later replay/
  Skill evolution may add or reweight candidate families for explicit scenes.
- The first formation-diversity repair is implemented. The captured r5 Raptor
  deploy fail-first proved the four exposed options had pairwise-clearance
  values `19/20/19/19` milli-inches. Solver policies now carry bounded
  tight/balanced/open spacing profiles and publish the preferred gap alongside
  exact actual spacing/envelope metrics. The same focused diagnosis passed
  after the change with `320/320/19/159`, four different legal option layouts,
  4 exact Rules instantiations, 5.227s, Provider 0 and Room mutations 0. The
  next live step is a fresh r5 fork and Agent re-selection of r6. Screen,
  surround/max-engagement, lane-preservation and future-mobility candidate
  families remain separate follow-up work rather than hidden Rules policy.
- K3 Ticket 27 / Slices 269–270 is now complete at commit `2c058ae`: live
  Foundation -> Proposals -> Comparison produced a Rules-legal Standard-2000
  roster and active RosterPlan, with an immutable no-pregame-plan preset
  comparison. Final passing round used 3 calls / 41,342 reported units / zero
  automatic retries. Important nonblocking evidence remains: the selected list
  spent only 940/2,000 minerals and its VP schedule stayed unknown, so match
  play/review must judge strategic quality rather than treating legality as
  quality.
