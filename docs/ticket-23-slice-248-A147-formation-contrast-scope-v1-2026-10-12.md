# Ticket 23 / Slice 248 — A147 contrasted threat claims

Latest original-room continuation: A155/B162/C161, all R4 movement at08:33:49Z.
For current timing publication, read
`ticket-23-slice-248-live-round-timing-report-v2-2026-10-12.md`.
The old Oct10 timing snapshot is historical, not current performance evidence.
No production version changed; same v29r2 cohort continues.

## Latest: v29r2 same-code network recovery

v29r1 became ready06:53:58.977Z. A148 actually accepted the saved formation
option c0583af9… under v57, receipt0249080a…/Replay=true, screenshot
`screenshots/0952-r148-player2-move-complete-board-applied.png` observed148.
This is online acceptance, not another run of the already-passed regression.
B148 defender settlement and C146 defender settlement now have Web evidence:
`screenshots/0955-r148-player1-fight-complete-board-applied.png` and
`screenshots/0957-r146-player1-fight-complete-board-applied.png`; both Replay=true.
B149/C147 then accepted finish_activation and transferred the turn to player1.

Both active player1 seats subsequently recorded consecutive
`provider_dns_resolution_failed` issues. Three completed drives without an
accepted action triggered the existing runner stop, not a new malformed output
or Rules failure. Six Provider ledgers contain only completed/failed attempts;
no pending paid request exists. The shared all-stop began07:03:13.551Z.
All Hosts exited and all six bot seats closed. Only the owned A Web driver
98193 remained after SIGTERM; with its birth and all Hosts gone confirmed,
it was stopped with SIGKILL. No child tree remained and no file/room was deleted.
The existing monitor recorded fully closed07:16:11.114Z.

A accepted one final use_active_ability while sealing: native149/Replay=true,
but Web evidence still148. Recover that receipt/screenshot without a second Apply.
Resume native boundaries A149/R4 movement, B149/C147/R3 combat. Original armies,
Plans, dice, map, Skills, rooms/epochs and cumulative costs remain intact.

No production code or performance candidate changed for this network recovery.
Operational files use prefix `common-v29r2`, same sourceVersion
`s248-v29-formation-contrast-scope-v46-20261012` and existing source manifest.
Launcher29466 exited0 at07:18:50.991Z; Hosts29473/4/5 born15:18:50 local,
startup observer29477. Follow existing r2 startup/monitor; no duplicate launch.
All three entries actually became ready07:28:03.481Z; startup completed
07:28:04.037Z. Existing Web drivers37067/8/9 and monitor37070 are running.
By07:30:15 all three progress records are running, with no new failureCode.
A149 accepted-ahead reconciliation is complete, receipt5d31c65b…/Replay=true,
`screenshots/0962-r149-player2-use_active_ability-complete-board-applied.png`
observed149. This captured the previous sealed action, not a second Apply.
B149/C147 retain prior accepted evidence; a new post-resume action is not yet
observed. Control-plane read TimeoutError is an observation warning, not proof
of a stopped job or permission to restart. Continue existing handles/monitor.
Latest separately cumulative costs A204.681321/B270.261215/C229.145909 yuan;
next notices300 each. Recovery initialization took about9m13s; keep it outside
live-action timings and track separately, without claiming an action SLA.
No test/build/performance gate was rerun, no new test was written.

T23 remains33/36,T27 remains5/6; main remaining248/272/249/250, complete0/12.
The historical23 performance set remains closed: only the admitted Charge-local
preparation optimization is loaded (wall-tail66.45%,CPU46.34% improvement).
Global field candidate stays isolated. A/B/C separate cumulative notices next300
each; no hard cost cap. No source-data update, subagent/K3, cleanup or commit.

## Current recovery

### Real v29r2 follow-through, 07:37:40Z

Latest 2026-10-12T08:03:21.688Z: A152/R4 movement, B156/R3 cleanup,
C152/R3 combat. Actual newly retained accepted boundaries: A152
finish_activation5a1da83e…/Replay=true/0980 observed152; B156
check_mission_end_gameb1b6d5a…/Replay=true/1014 observed156; C152
finish_activationfa2d1baa…/Replay=true/1004 observed152. Check-mission-end-game
is an accepted lifecycle check, not a terminal outcome. Seven owned births
still live, no all-stop/terminal report. Separate cumulative costs A212.095659/B271.759169/C234.541915,next300 each.
Compact CURRENT_WORK now holds one latest r2 entry; detailed history remains
here and original NDJSON/bot/room stores. No production file/test changed.

Latest07:52:02Z: A150/R4 movement remains live; B153/R3 cleanup and C150/R3
combat have accepted further actions. B152 pass2112b474…/Replay=true/0990
observed152, B153 passa080c4ef…/Replay=true/0996 observed153; the latter's
pre-action phase was combat and its accepted post-state is cleanup. C149
fight5c08886c…/Replay=true/0986 observed149, C150 finish_activationcc801fa4…/
Replay=true/0992 observed150. All captures are in the original screenshot
directories. Seven original process births re-observed; no all-stop. C drive
0004 is running from07:49:59.572Z; observation timeouts for A/B are not terminal.
Costs A207.594897/B271.759169/C232.156440 yuan,next300 each,no hard cap.

Existing downstream scope confirmed from the original experiment documents,
without regenerating or auditing passed items: four conditions (baseline,
race/opponent exchange, alternate map, alternate starting positions), each
with A fixed2000+applicable Plan/B fresh2000+applicable Plan/C same A roster
without opening Plan. Opponent capability/flow is common, not a required
identical concrete opening Plan. First ABC still must finish before claiming
their controlled comparison or launching the next condition. Performance over
60s was explicitly removed as an independent startup blocker on2026-10-10;
retain lossless optimization and separately reported actual timing, rather than
reopening passed gates or blocking a legal action for that superseded threshold.

Latest07:40:17Z: seven owned process births still live, all three running, no
all-stop. A150/R4 movement finish_activation accepted, db0194e6…/Replay=true,
`screenshots/0968-r150-player2-finish_activation-complete-board-applied.png`
observed150. B151/R3 combat finish_activation accepted,4b5cad5b…/Replay=true,
`screenshots/0984-r151-player1-finish_activation-complete-board-applied.png`
observed151. C148 remains the accepted fight below. Separate cumulative costs
A207.594897/B271.759169/C231.551999 yuan,next300 each,no hard cap.
This follow-through completes neither a match nor Slice248; complete0/12.

Original owned Hosts29473/4/5 and Web drivers37067/8/9/monitor37070 are live,
with their recorded births re-observed. B/C have actually advanced after resume:

| Arm | Revision / action | Receipt / Replay | Web board evidence |
| --- | --- | --- | --- |
| B | 150 / player1 Medic fight | 78382ce2… / true | screenshots/0978-r150-player1-fight-complete-board-applied.png; observed150 |
| C | 148 / player1 Marine fight | aa18eb60… / true | screenshots/0980-r148-player1-fight-complete-board-applied.png; observed148 |

A149/R4 movement is still querying/deciding; B150/C148 remain R3 combat.
No all-stop file exists at this observation. Read timeouts do not overturn the
actual new accepted receipts, nor authorize restarting the running cohort.
Latest cumulative costs A204.681321/B271.759169/C231.551999 yuan; next300 each.
No product/strategy change, new test, old gate rerun or new room occurred.

Deferred S249 observation, not an integration block: B150's public summary
correctly lists one Medic model/Supply0, but its plan/purpose also repeats the
earlier casualty-selection narrative and preserving Supply1. C148's purpose
also describes a pending casualty decision while its plan describes a new
attack. Preserve the original public summaries and native action/receipt for
the requested end-of-game review; source/root cause is not yet established.
Do not invent a prompt strategy, alter native legality, or stop these accepted
actions solely for this Medium narrative inconsistency. No hidden chain of
thought is collected; current public rationale and cited tool receipts persist.

harnessLoopUsed=true; targetGames=starcraft-tmg; route=selfplay_agent_prompt.
Existing tools: observe/LegalSpace/query/instantiate/Preview/Confirm/Apply/Replay.
UI evidence is the receipt-bound original board capture; decision and memory
evidence remains in the original bot traces/plans. These versioned experiment
traces retain trainingTruth=false and do not certify production training data.
Demotion/rollback requires a new concrete legality/output failure, not a status
timeout or a broad repeated audit. Counts33/36,5/6,remaining248/272/249/250,
complete0/12 and final18-classic expansion scope are unchanged.

Common `s248-v29-formation-contrast-scope-v46-20261012` changes only
`packages/online-agent-session/live-flash-decision-port-v1.mjs`: formation
claim text now uses the existing Planner comma-contrast boundary; action local
revalidation marker v56→v57 allows inspecting the same paid output under fixed
code. No new strategy prompt, Skill, weights, geometry policy or sampling change.
Admitted Charge-local performance bytes928a796b… remain loaded. Global candidate
remains isolated; passed performance and unrelated correctness gates were not rerun.

Original v28 stop fully closed06:32:49.828Z. All seven old PIDs are gone and all
six Provider ledgers contain only completed/failed attempts. Launcher92886 exit0
at06:47:26.296Z started original Hosts92893/4/5 born14:47:26,observer92898.
Follow `common-v29r1-startup-observation.private.json`, then its completion and
monitor files; do not launch a duplicate. Launch does not prove readiness/Apply.

Original boundaries:

| Arm | Revision | Round / phase | State hash |
| --- | ---: | --- | --- |
| A | 147 | 4 / movement | 4e861577300b6234c3aacbe9b2f0d5eaefac3a0e1ddc536475a1f9545cd0c6bf |
| B | 148 | 3 / combat | 5357e29ab5719db4126e788f041d8708d963f3d21001a61733e47f6878156743 |
| C | 146 | 3 / combat | 4793b11f47fe884a731ed2aa107ba39e53d283b83674bb0cfa13f83c66b589ed |

All activeSideKey=player2, no pending stage. Same rooms/epochs, armies, Plans,
Skills, accepted actions, original dice and separate fees. B148/C146 are ahead
of Web evidence and must be reconciled, never applied a second time.
Counts remain T23 33/36,T27 5/6; main slices248/272/249/250 remain open,
complete matches0/12. Accepted map scope9 selected official+2 priority classic;
the18 classic expansion is deferred to the end, not silently complete.

## Root cause and exact gate

The real A147 return says it is outside **Marine** stationary bands while
accepting **Goliath** stationary bands. Original option relationships agree:
Marine1/2/3 current-round stationary keys empty; Goliath2 has Autocannon+Scatter
Missiles at13448, Goliath1 has Scatter Missiles at21011 milli-inches. Saved
identity nodes have correct enemy side, exact unitId and names. No grouping/name
guess, missing identity or Rules disagreement was found.

The formation option's reason and speech were split only at sentence punctuation,
unlike the Planner's existing comma-contrast splitting. The accepted Goliath
clause widened the preceding Marine denial's named-enemy set. The validator then
misreported Goliath rows as contradictions and triggered correction/nonconvergence.

Concrete gate `scripts/verify-ticket-23-A147-formation-contrast-scope-v1.mjs` reads
only the original compressed choice's last independent member and saved receipts.
88076 RED reproduces both original reason/speech false positives.89512 unique
GREEN keeps the entire original returned document unchanged and reports zero
contradictions; explicit false Goliath and universal-enemy denials still reject.
Formation optionc0583af9… and receiptf2ecb1dd… remain identical. Zero Provider,
Room writes, Rules Apply or geometry query. No old gate was repeated.

Reports live under the common performance build:
`A/A147-formation-contrast-scope-{red,green}.private.json`.
This specific punctuation/contrast repair is not certification of arbitrary
natural-language meanings or all safety claims. Source hashac4c6e9b…→40657800…;
the new common manifest records the only changed production file and actual gate.
Rollback/demotion: preserve the original artifact and stop the common cohort if
a new unambiguous unsafe denial is wrongly admitted; never waive actual Rules.

## B148 post-roll follow-through

While v28 sealed, the defender completed `resolve_melee_casualties` at original
B148. Its stored bot trace reports receipt
`5b8a867ef64fc26ebdfa0645ee1d87e8825977ac2a742e28a197953e172a3bcf`,Replay=true.
Native state log has defender-owned selection, close_combat_attack and
supply_loss_recorded; no pending remains. Six original hit rolls1/3/1/4/5/6,
four hits, Surge roll1 and total damage4 are retained. Defender removes Medic
models2/3, retains leading model1; Supply1→0. The public reason explicitly knows
this is removal, not a new attack or defender activation. Final Web evidence
will be recovered from the accepted transition without new Apply.

Medium performance follow-up: these two legal selections differ only in order of
the same removed models; the agent explained that fact. No order-equivalence
proof, deterministic replacement, option pruning or extra test was introduced.
Keep original legal choices for now and evaluate exact no-choice handling later.

## Deliverables and scope

Changed production: one Flash-port file. Added: one concrete bug gate and this
record; updated current-work/TASKS/durable memory. Operational source manifest,
config and reused launch/startup/monitor artifacts are independent of production.
No commit, cleanup, install, subagent/K3, source-data refresh or broad verification.

Harness loop used=true; target=starcraft-tmg; routes=selfplay_agent_prompt and
harness_optimizer; evidence=original paid return/current saved formation/identity
receipts and original B148 bot/native trace. No new Skill or memory promotion,
no training-truth claim. Online A acceptance and B148 screenshots remain separate
completion criteria; source/gate green alone does not close Slice248.
