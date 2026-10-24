# Ticket 23 / Slice 248 — same-state relationship query performance

Status: focused local repair and same-room r116→r117 continuation passed;
complete-match and strategy-equivalence acceptance are pending.

## Reproduction

The unchanged 2000-point no-plan room `20260926182512804` reached state
revision 116, round 3 Movement. Its last completed player-2 Provider request
settled; no Provider attempt in either seat was in-flight. A single read-only
load of the authoritative 11 MB room aggregate took about 2 seconds. The
unscoped tactical relationship graph still ran for more than 2 minutes and
was stopped without Room mutation. A scoped 1-model/2-model graph took 1.4
seconds. The real player-1 Action query record for revision 113 contained
four overlapping `space.inspect_relationships` calls, including a 9-model
Marine against 18-model units. Its paid calls settled in seconds to tens of
seconds, while local relationship work dominated the long gaps between calls.

This is not grounds to reduce the model's tactical evidence or to silently
omit model pairs. The baseline room remains a no-plan comparison cell.

## Change

- The room-backed adapter now owns a state-hash-scoped cache for exact
  model-pair line-of-sight rows, special-terrain results and the engagement
  graph. On a new authoritative `stateHash`, all three are cleared. The cache
  does not authorize an action and cannot outlive a state revision.
- The special-terrain batch still validates the current context and assembles
  every requested query into the same receipt, including its batch hash.
  Cached physical-pair results are reused only when all actor/model/target IDs
  match. This preserves the Rules result and graph hash for differently
  scoped follow-up questions in the same state.
- The experiment manifest now reads a compact orchestrator status rather than
  copying the full trajectory per poll, and records per-stage observation
  timing. Room/seat/provider reads and strategy inputs are unchanged.

## Focused evidence

On a frozen snapshot of revision 116, the 9-model Marine versus 18-model
Swarmling query returned the identical `relationshipGraphHash` with and
without the cache; a repeat returned the same hash. In one focused run the
uncached, first cached, and repeated cached calls took 8,084 ms, 4,278 ms and
2,011 ms. A prior focused 1-v-2 run also showed a matching graph hash. These
are local-query timings, not an end-to-end turn-speed claim.

Both changed orchestrator/server files passed `node --check`. The existing
Ticket-20 offline complete-match command did not enter its assertions: this
worktree lacks its generated Ticket-18 Skill artifact. It was not rerun or
counted as a pass. The authoritative room continuation is the next focused
integration observation. The stopped old service had no unsettled paid
attempt; resume uses the same persisted room/revision, not a fresh match.

The resumed service loaded the original Room at revision 116 and the runner
accepted revision 117 with Rules apply/replay; it did not initialize a new
match. The new manifest returned HTTP 200, `orchestrator.status=running`,
and `observationPhaseTimings`. At r117 its internal phases summed to about
4.5 seconds (room read 2.4 s; both seats 1.8 s; provider projections 2 ms;
public journal 0.3 s; compact orchestrator status below 1 ms). The external
HTTP elapsed time was 48 seconds because the event loop was also driving
the next action. This proves the new observation path is wired, not that all
action latency is solved.

No source refresh, paid call for the local cache test, Skill promotion, or
rule change was performed. The resumed room did incur its normal live
Provider calls. Only Critical/High findings block integration; strategy
quality observations remain for the paired replay/Skill review.

## Second focused performance repair

Revision 119→120 took about 19 minutes despite the first LOS cache. The
player-2 trace contains 19 `space.inspect_relationships` query receipts and
six paid Provider calls; all those Provider attempts settled, so the remaining
latency cannot be attributed solely to model network time. The exact scopes
and per-query durations were not retained in that trace, so the 19 receipts
do not by themselves prove which query consumed the most time.

The same state can also reuse exact model base rows, unit-pair relation
searches, objective relations, unit nodes and unit clearances. These caches
are cleared with the LOS cache on each authoritative state-hash change. For
uncached clearance, an axis-aligned bounding-box gap is only a lower bound:
the exact Rules footprint kernel still evaluates every candidate capable of
beating the current minimum. No threat band, model pair or output field was
deliberately dropped. On a read-only revision-120 snapshot, a 9-model Marine
versus 18-model Swarmling query returned the same graph hash uncached, first
cached and repeated; timings were 9,299 / 3,535 / 797 ms. Each of the nine
reported nearest-other-model clearances matched an independent full exact
Rules-kernel scan. This is a scoped calculation check, not a full-match speed
or strategy-equivalence claim.

The old service was stopped after both seats had no open Provider attempt.
The first same-room resume command used the worktree as its generated-Skill
fixture root and exited before opening the Room because the frozen Ticket-18
Skill artifact is in the original project root. A corrected resume command
uses that original root; the persisted Room remains the same revision 120.
The new service has not yet produced an end-to-end latency result. The
interrupted in-memory action may be recomputed; no reset or fresh match was
performed.

## Disk-full failure and durable-store correction

The no-plan Room reached r128, then `LIVE_DECISION_STORE_WRITE_FAILED` was
correctly recorded as High. The simultaneous agent-selected planned Room
also exited with `ENOSPC` while writing its failure report. Neither Room was
recreated: their persisted authoritative revisions remained r128 and r59.

The machine had about 275 MB free. The player-2 live-decision row was about
59 MB at revision 957; the old store rewrote this entire JSON row on every
decision revision. A separate, obsolete read-only diagnostic `sqlite3`
process had held a WAL reader for almost ten hours, preventing checkpoint
recycling; the WAL reached about 14 GB. That exact stale read-only process was
terminated, then SQLite's `wal_checkpoint(TRUNCATE)` returned `0|0|0`.
`quick_check=ok`; free space rose above 15 GB without deleting a Room,
receipt, screenshot or paid model return.

The live-decision SQLite store now selects only the revision during CAS and
writes large records as a versioned gzip-base64 envelope in the existing TEXT
column. It reads both original JSON and new envelopes; each load returns a
fresh object without a second full JSON clone. One focused legacy→compressed
roundtrip passed. The actual persisted row moved from about 59 MB plain JSON
to about 11.4 MB compressed at revision 967; the new WAL was about 11 MB,
not 14 GB. This is lossless storage repair, not a model prompt or Rules change.
The RoomStore journal-existence query was also narrowed so it no longer
materializes the 11 MB encrypted aggregate and 8 MB initial envelope merely
to check room existence. A 40-read scoped gate over an 8 MB aggregate took
27 ms; full replay still loaded both large fields correctly. A live five-
second CPU sample also showed aggregate decode, full-object clone and SQLite
reads as prominent hotspots; these fixes do not prove all turn latency is
solved.

An old `LIVE_DECISION_STORE_WRITE_FAILED` remains High for the failed run.
The typed recovery policy permits only an **explicit later run** to retry a
historical instance after storage repair; a fresh failure still blocks, and
only a later verified Apply can mark the historical issue resolved. The two
original Rooms were explicitly resumed after the checkpoint and code change.

The recovered no-plan Room then accepted r129, while the planned Room
reached Round 1 cleanup. On the accumulated real decision object, a read-only
benchmark measured 6,951 ms for JSON stringify/parse clone versus 4,084 ms
for `structuredClone`. The live-decision commit copy was changed to the latter
and passed syntax validation. Running services loaded before that edit, so a
future safe resume is needed before claiming live latency improvement from
this final copy change. Archived decisions remain intact.

## Round-2 contextual Supply and compressed-record resume

The Agent-selected planned Room reached revision 68 and Round 2 start, then
three completed drive jobs made no progress. The player-1 durable seat record
retained an un-applied `resolve_mission_start_of_round` decision whose Preview
reported `ROUND_SUPPLY_CAP_EXCEEDED`; no new Provider call was required for
that decision. This was **not** an illegal Round-1 deployment. Its three
Medic units each have printed/current Supply 1, but their purchased Advanced
Medic Facilities source text says their Supply Value counts as 0 for the
Supply Pool. The selected-roster deployment path used that contextual
projection: the Round-1 on-table pool contribution was 6/6. The shared
`createOfficialRoundSupplyStateV1` instead summed the three printed values,
obtained 9 and blocked the Round-2 cap of 8. It now uses the same
source-backed `supply_pool_calculation` projection for on-table and reserve
pool contributions. A focused read-only calculation on the original r68
authority state returned pool 8/8, on-table 6/6 and available 2/2. The old
room and its historical replies remain intact; current action Apply/Replay
is still required before closing this High blocker.

The first explicit r68 resume then stopped before opening a Room:
`SLICE248_RESUME_INTERACTION_MODE_INVALID`. The earlier gzip envelope changed
the SQLite column's top-level JSON, while the resume-mode reader still used
`json_extract` as if it contained the legacy record directly. The reader now
calls the decision store's single exported decoder, checks row/payload
revision and reads the mode for both old JSON and compressed envelopes. The
one focused gate on the two existing seats of **both** original rooms returned
`COMPRESSED_RESUME_MODE_OK` (`json_channels_v1` on each). A new same-room r68
resume is in progress; no fresh match was initialized.

The explicit same-room continuation then applied and replay-verified the
pending start-of-round transition at revision 69. The Room entered Round 2
Movement with no new Provider calls for that deterministic action. The
original no-plan Room remains independently running in Round 3; neither Room
was restarted or treated as a valid same-roster strategy A/B comparison.

## Revision 146 Planner correction and same-room revision 147

The original no-plan Room stopped before Apply at r146 with
`LIVE_DECISION_PLANNER_DID_NOT_CONVERGE`. The durable player-1 decision had
three paid semantic corrections. Its final raw Planning return selected the
parameterized `run` domain for `player1-marine-2`, but set
`formationSearchRequested=false`, left the purpose/objectives empty, and
described an unavailable `choose_first_actor` action. This was a real model
contract violation, not a dropped field: the saved paid return itself contains
the empty values. The old typed error said only
`tacticalPurpose,formationObjectives`, without identifying the chosen Run.

The correction now identifies the exact selected candidate, action type and
Unit, names the JSON fields required to retain a formation action, and
permits a different **current** candidate if that better matches the plan.
It never fabricates a formation or forces Run over Pass. Both prompt-policy
versions advanced; the existing explicit prompt-repair lane kept all six
historical paid attempts and opened one new bounded correction epoch. A
focused regression for this exact candidate failed before the fix and passed
afterward (`7` assertions, `0` Provider calls, `0` Room mutations); unrelated
gates were not rerun.

The same Room then completed its decision and applied r147 `player1 pass` in
Round 3 Assault. Rules Apply and Replay agree; receipt
`7d1e1b5d…bf8f8bc30`, pre-action screenshot
`screenshots/0846-r146-room-next-agent-decision-before.png`, applied screenshot
`screenshots/0849-r147-player1-pass-applied.png`. The new decision used
`8` Provider calls in total, including its preserved earlier attempts; the
Room ledger moved from `419` to `421` Provider calls and estimated cost from
`¥66.606634` to `¥67.264441`. The live runner is continuing in the same
Room; the match is not complete.

Legality is **not** strategy quality. The r147 Planner compared eleven
current candidates, explicitly judged Pass “not preferred,” yet selected
Pass while its plan/assessment still said to choose the first actor. The
Action explanation then falsely claimed the current LegalSpace contained
only Pass, although the authoritative Planning index included Run and Charge
domains. The selected Pass is Rules-legal, so this remains a visible
no-pregame-plan baseline outcome, not a Rules replay failure. Its strategy
claim is marked for Medium review and must not be promoted as training truth
or evidence that Pass was optimal. A later plan-only A/B comparison must
hold the same roster, map, rules, model and randomness fixed; the existing
Agent-selected planned Room differs in roster and cannot be used as that
comparison.

## Revision 148 post-roll Charge blocker (still open)

The same no-plan Room reached r148 after a Rules-accepted Zerg Hydralisk
Charge declaration. The roll gives its leading model an 11-inch movement
allowance against `player1-marine-1-model-1`. This is a **two-model**
Hydralisk Unit, not an 18-model formation; the older diagnostic report's
`modelCount:18` is a fallback display value because this domain does not carry
`constraints.modelProfiles`. The authoritative Room state has the leading
Hydralisk at `(24,9)` and target Marine at `(25,21)` inches.

The concrete frozen-scene, read-only formation search produced `0` options
from 228 unique leading-anchor seeds. Of these, 135 were beyond the rolled
move; all 651 solver attempts for the remaining anchors rejected the **leading
model's surface placement**, before trying its second model. The nearby
standable `central_temple` rectangle is `x=22.140–31.860`,
`y=15.840–20.160` inches. The target Marine is on ground beyond its north
edge, while three other Marines occupy the temple near `(23.58,18.54)`,
`(25,18.54)`, and `(26.42,18.54)`. The read-only diagnostic added reason
counters but did not mutate the Room or call the Provider.

This **does not** prove that no continuous legal Charge endpoint exists:
the solver sampled finite anchors, and the current `searchCoverage` field
`betterOptionMayExist:false` only describes exhausting those generated
anchors. The Rules-owned failed-Charge certificates currently cover only
distance shortfall and incompatible declared-target spread; neither proves
this terrain/occupancy case. Therefore r148 remains High/fail-closed rather
than inventing a legal failure action. Next repair must establish a
conservative continuous-geometry impossibility certificate accepted by the
Rules kernel, or find and instantiate an actual legal success position,
then resume this same Room. Do not present the two different-roster rooms as
a plan-only A/B experiment.

The separate prospective cost windows for the two rooms are frozen in
`ticket-23-slice-248-per-room-cost-window-v1-2026-09-28.json`; historical
Provider charges and durable usage are unchanged.

### Continuous-geometry finding and version boundary

The authoritative leading Hydralisk base is **rectangular 1.575 × 3.937
inches**, not round. A new read-only probe therefore checked positions and
all 0–180° orientations: its 25-milli-inch / 2° sample considered 3,044,160
poses, found 140,818 that reached the target after surface checks, and none
free of other model bases. Sampling alone remains non-authoritative.

A separate conservative branch-and-bound cover now checks the entire
continuous center/rotation superset using distance lower bounds, rotation
Lipschitz bounds, guaranteed **actual** standable-surface overlap via the
rectangle's orientation-invariant inscribed disc, and guaranteed
rectangle/circle overlaps. The first probe incorrectly equated bounding-box
intersection to actual terrain overlap; after correcting it to match the
authoritative polygon check, the cover still excluded every pose in **1,721**
cells: 51 by rolled move, 164 by target engagement, 408 by occupied round
bases and 238 by partial standable surface (the rest are split cells). Its
pure Rules-candidate module returned `allPosesExcluded=true` on the frozen
r148 state; an in-memory counterexample removing the three blocking Marines
returned `false`. It intentionally ignores path, other terrain and
remaining-model constraints, so those omissions **enlarge** the search
domain. The focused zero-Provider/zero-Room diagnostic passed after the
terrain-overlap correction; dense sampling was also updated to use a full
separating-axis rectangle intersection and still found no free placement.

This is **not yet** an accepted `resolve_charge` failure proof. The original
Room binds match runtime 1.0.1 and an immutable executor artifact; the
current Charge domain accepts only `distance_shortfall` and
`declared_target_spread`. Adding a third outcome to that frozen version would
silently change historical Rules. Next work is a new versioned Rules binding
and focused Apply/Replay acceptance for the conservative certificate, plus
an explicit compatible migration decision or a fresh fixed-roster paired
experiment. The r148 Room remains unchanged and blocked; the independently
running planned Room must not be restarted or silently upgraded.
