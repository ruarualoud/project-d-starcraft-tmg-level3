# S248 historical performance admission — v27

## Requested outcome

The user's 2026-10-12 instruction is to measure the previously selected performance
case set with the new code, then load effective improvements. A 40% tail reduction
has value; waiting for another complete round or demanding a 40% reduction in every
type's median is not a prerequisite to this requested historical-case measurement.
Complete output parity remains required. Report genuine regressions, separately
from changed CPU contention and subsecond noise. Query timings are not whole Web
action timings and do not include a new model call.

## Measured snapshot

- Current correctness code: `s248-v24-B133-multi-cut-proof-v43-20261012`.
- Isolated candidate: the clean v24 Charge-local target/blocker preparation plus
  v26 native elevation canonical-field layout. Exactly two production files differ;
  the multi-cut correctness repair remains present.
- Historical set: 23 unchanged requests, selected by the original four-plan matrix.
  Seven query types retain their original fast/median/extreme labels and states.
  A label does not imply that its new measured time is still fastest or slowest.
- Saved corrected complete fire-exchange responses are used as references; old
  incomplete fire results are not treated as truth.
- No Provider calls, Rules Apply, original database writes or sampling reductions.
- Each query is measured once with the candidate. Fixture failures before query
  execution are retained separately and are not successful measurements.

The machine-readable batch lives at:

`build/ticket-23-three-arm-performance-baseline-20261010-v1/historical-23-cases-combined-v27-20261012-v1/`

Read `batch-progress-r3.private.json` for actual completion. The first two entry
attempts failed before any query: an omitted outer legacy-script path, then the
fixture resolver's frozen-data fallback. The source view now supplies the outer
script mapping and invokes the unchanged replay tool with the original worktree
as its data root. Node's preserve-symlink flags keep imports inside the candidate
view. Artifact `runtimeSourceHashes` describes the original data-root source;
admission must additionally record the actual two candidate file hashes, rather
than mislabel those metadata hashes as candidate hashes.

## Prior evidence (not rerun)

- C111 Charge full query: 608.623 → 204.204 seconds, 66.45% reduction;
  all 19 instantiations and four complete options equal, full hash `f16366fe…`.
- C111 v26: 204.204 → 100.630 seconds, complete output still equal. CPU
  179.893 → 167.494 seconds; original rooms stopped between observations,
  so the entire wall reduction cannot be attributed to v26.
- Passed generator/layout gates are retained; they are not repeated here.

## Original rooms and loading boundary

Original recovery r1 stopped on C's DNS failures. Recovery r2 became ready at
03:03:28Z but again stopped on `provider_transport_failed` from C at 03:08:31Z;
all-stop closed at 03:09:55Z. Preserve both records and all paid results. The
performance candidate has not been loaded. Do not describe the original cohort
as running from an old monitor snapshot.

After measurement, load admitted production files for all three arms at a sealed
action boundary, keeping original rooms, armies, Plans, dice, accepted receipts and
cost ledgers. Record candidate hashes in a new common source manifest. Reconcile
any accepted-ahead UI receipts without applying them again. Network recovery is
separate from algorithm admission; an unknown paid request must not be resent.

Counts unchanged: Ticket 23 33/36; Ticket 27 5/6; four mainline slices remain
(248, 272, 249, 250); complete experiments 0/12.

## Completed measurement and selective loading

All 23 original requests finished. Twenty complete JSON responses are exactly equal
to their original or previously corrected references. The other three are the
formation cases C65/C127/C71: only the pre-existing result schema v2→v4 and its
derived query seal differ. Updating that declared version and independently
recomputing the seal yields the entire new canonical JSON; no field is discarded.
Original artifacts remain unchanged.

Three B fire cases hit another obsolete benchmark assumption: the checker demanded
six native attack jobs for every reference. Saved full responses are exactly equal,
and the actual scopes are 0, 0, 5 (C114 alone has 6). The existing replay script now
derives scope from the saved complete estimates plus failures. Concrete RED was
the original real-query failure; unique native82754 GREEN checked only the four
saved diagnostics with the exact patched block. No query or passed content gate
was repeated. Raw replay statuses remain preserved: 17 originally complete, three
version differences and three statistics-only false positives; adjudicated complete
content is 23/23.

Only the clean v24 Charge-local preparation is admitted and copied into production.
Its earlier same-batch full query improved wall66.45% and CPU46.34%, preserving
all19 instantiations/four complete options. Other query branches are unchanged by
that five-line product patch. Loaded bytes were checked once against the measured
clean candidate SHA928a796b…; the B133 correctness repair remains present.
The v26 GLOBAL canonical-field change is NOT loaded: several old timings appear
slower and the measurements have differing resource contention. The isolated view
also needed physical worker import closure because workers clear execArgv; early
case coverage must not be sold as a uniform global-worker performance gate.

| Arm / case | Prior measured query (s) | New query (s) | Complete content |
| --- | ---: | ---: | --- |
| A / legal_asset_placement_options-short-6 | 33.682 | 12.095 | exact |
| A / legal_asset_placement_options-median-7 | 3.059 | 2.167 | exact |
| A / legal_asset_placement_options-extreme-8 | 3.175 | 1.525 | exact |
| B / fire_zone_exchange-short-118 | 4.437 | 4.200 | exact |
| B / fire_zone_exchange-median-104 | 3.555 | 2.928 | exact |
| B / fire_zone_exchange-extreme-113 | 69.162 | 29.007 | exact |
| C / instantiate_parameterized_action-short-64 | 0.008 | 0.009 | exact |
| C / space-inspect_relationships-short-97 | 1.024 | 1.076 | exact |
| C / space-inspect_relationships-median-106 | 2.934 | 5.013 | exact |
| C / instantiate_parameterized_action-median-98 | 0.934 | 1.922 | exact |
| C / action_specific_threat-short-103 | 1.397 | 3.360 | exact |
| C / space-solve_formation-short-65 | 7.467 | 9.848 | v2→v4 only; seal independently verified |
| C / attack_probability-short-103 | 28.146 | 6.083 | exact |
| C / action_specific_threat-median-114 | 5.662 | 1.048 | exact |
| C / attack_probability-median-108 | 7.242 | 8.662 | exact |
| C / attack_probability-extreme-108 | 6.984 | 10.006 | exact |
| C / action_specific_threat-extreme-114 | 6.608 | 5.622 | exact |
| C / instantiate_parameterized_action-extreme-114 | 1.228 | 1.411 | exact |
| C / legal_asset_placement_options-short-69 | 6.481 | 6.283 | exact |
| C / space-solve_formation-median-127 | 49.164 | 53.332 | v2→v4 only; seal independently verified |
| C / space-inspect_relationships-extreme-96 | 14.045 | 16.334 | exact |
| C / space-solve_formation-extreme-71 | 39.724 | 45.144 | v2→v4 only; seal independently verified |
| C / fire_zone_exchange-short-114 | 48.131 | 30.024 | exact |

These historical wall comparisons are not controlled same-load causal estimates.
For the apparent A6 short-asset regression, a single current-common comparator
measured22.736s versus candidate12.095s with the same complete response. No claim
is made that every query, model decision or whole Web action now meets60s.

Operational load source: `s248-v25-charge-local-prep-v43-20261012`. Original
room boundaries were read natively A145/R4Movement, B146/R3Combat, C141/R3Assault.
All prior seven owned processes are gone and six Provider ledgers have no reserved,
dispatched or ambiguous attempt. B146 may be accepted ahead of its Web evidence;
reconcile that receipt without Apply. Same armies/Plans/Skills/map/dice/costs, no
new Room or epoch. Launcher85192 started same-room Hosts; readiness and fresh
online action are not claimed from launch alone. Follow common-v25r1 startup and
monitor files. Costs remain unlimited and separately accumulated.

Changed tracked delivery: legal-formation-search-v1.mjs (query-local reuse only),
replay-ticket-23-real-performance-cases-v1.mjs (specific saved-case statistics bug),
this report, CURRENT_WORK.md and parent TASKS.md/PROJECT_MEMORY.md. No new test
file, model call, source-data refresh, subagent, cleanup or commit. Counts unchanged.

## Actual original-room readiness

04:47:40Z: all three original entries ready; startup-complete04:47:41Z,
Hosts85195/85196/85197, Web drivers89737/89738/89739, independent monitor89740.
All entries retain original room IDs/data directories and share the loaded v25
source.04:49:40Z independent monitor says all owned processes live, A145/R4Move,
B146/R3Combat, C141/R3Assault, all running/no all-stop. New model work has begun;
no newly accepted action or fresh Charge timing is claimed from that observation.
Benchmark itself made zero model calls; resumed games continue normal billing.
Booked cumulative costs A197.871793/B266.310802/C227.525874, unchanged separate
accounting/no cap, next notices200/300/300. Only the admitted Charge patch is loaded.

## Latest loaded version

The admitted Charge bytes928a796b… remain loaded in common
`s248-v28-melee-defender-casualty-v46-20261012`; all global performance candidates
remain isolated. Subsequent v26/v27/v28 changes fix the concrete melee submission
and post-roll defender selection contracts, not a new performance admission.
No historical query or passed gate was repeated. Latest original boundaries are
A147/R4Movement,B146/C144 R3Combat. Launcher68984 exit0 at06:17:53Z started all
three same-room Hosts; actual entry readiness and online action are still separate
observations. See the B146 recovery document for the new stop and isolated proof.

v28 actually became ready06:23:24Z; original B147 fight accepted/Replay=true,
C145 advanced.06:29:19Z A147 semantic-output convergence High requested a new
all-stop; the admitted optimization is still loaded. This corrects the temporary
startup-only status above without claiming the three games are currently running
or that full action timing/defender settlement is complete.
