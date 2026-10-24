# T23 / S248 — A/B/C budget authorization and actual status

The budget authorization below remains current. The live status table is a
historical snapshot: A is now v6 reviewed with0Critical/High and formally exported;
B/C have stopped at119/100. Read
`ticket-27-slice-272-A-live-review-repair-and-BC-status-2026-10-09.md` for the current
restore points, separate cost estimates and next recovery steps.

## Budget decision

The user confirmed **CNY200 for each of A/B/C, independently accumulated**.
Existing charges and unknown-charge records are retained; no baseline is reset.
This is a financial limit, not the army's 2000-mineral limit.

The ordinary host and Web driver now accept `--per-room-budget-cny=200`.
The driver also accepts `--cost-notice-step-cny=200`. Historical defaults remain
CNY160 per room and CNY100 per notification step for other experiments. Existing
independent seat allocation remains half the room limit: CNY100 per seat when the
room limit is CNY200. Do not describe this as a shared, freely pooled seat budget.

**Running B/C have not yet loaded these new arguments.** They still have the old
CNY160 room limit/CNY80 seat limit and CNY100 notification point. Apply the flags
at the next natural sealed, zero-in-flight source-load window, preserving the
same SQLite, all paid rows, initial/current envelopes and existing cost baseline.
Do not close a running decision just to change the limit, recreate a room, or
silently replace its stored limits. A's planning/review cost remains its own
stream; raising the budget does not waive the three-review-round convergence rule.

The only new verification was one syntax check for each of the two changed
operational scripts; both exited0. No new test, passed-gate rerun or paid A review.

## Actual snapshot

Snapshot timestamps: B2026-10-09T01:38:25.325Z; C2026-10-09T01:35:22.171Z.
Costs are local usage-based estimates, not reconciled provider invoices.

| Arm | Experiment | Actual state | Recorded estimated CNY |
| --- | --- | --- | ---: |
| A | Fixed2000 roster plus generated opening Plan | Planv5 unadmitted after incomplete capacity-limited review; match not started | 1.996806 planning/review |
| B | From-scratch selected2000 roster plus generated opening Plan | Round2 Assault,116 recorded actions,258 provider calls,69937955 units | 88.409109 |
| C | Same fixed2000 roster as A, without a pregame opening Plan | Round2 Assault,100 recorded actions,223 provider calls,60469702 units | 76.165668 |

B/C use the real paid Flash Planner/query/Action/Rules/Preview/Apply/Replay route
shared with the machine seat of human-machine play. C still has online planning
and in-match memory: it is not an agent with planning disabled. The same frozen
Zerg roster and opening Plan are used as opponent configuration. Opponent actions
are not forced identical after states diverge. A/C isolate the opening-Plan
variable; B also changes the army, so B/C is not a pure Plan-only comparison.

Complete matches remain **0/3**. These are real live experiments, not a completed
strategic comparison. A admission, full-game results, repeated builder stability
and one-minute action performance remain unproven. A recent C formation query
took186612ms and its overall decision304460ms; different cases do not constitute
a controlled performance A/B.

## Map and army scale recheck

Read actual B/C room state and existing certificates; did not rerun passed gates.

- Both use official selected Standard1 electronic preset,54x36in, Hold Position
  Standard and Gauntlet Standard deployment. Initial Supply6,+2 each round,5rounds.
- B Terran:9units,2000minerals,0unspent,195vespene. C fixed Terran:7units,
  2000minerals,0unspent,115vespene. Both opposing Kerrigan's Swarm armies:
  8units,2000minerals,0unspent,140vespene. Vespene limit200. Resource arithmetic
  and faction-slot legality certificates are true. Army size is not current
  on-table Supply; reserves arrive through the ordinary lifecycle.
- Shared map seed `standard-d6-1`; compilation
  `22f5fe3cb7ab053a106f3353bd7b7a8304f3d20e16cc89415568819baa019937`;
  rule geometry `c04ff2205a890ef6c897ad57449f95499c4a899547950a1aa45be33bea84f3f6`.
  The1804terrain entries are compiled cells, not1804 physical scenery pieces.
  Entry segments are usable and mission markers/quarters have certified
  reachability. Compiled terrain, not background pixels, is Rules authority.
- A is configured for the same map and scale, but has no started live match.
- Map coverage is9selected official recipes plus2priority classics. It is not
  all20classics/allmissions. The other18classic maps remain deferred work.
  User-approved editable electronic terrain conventions remain explicitly
  non-official per-piece numerical attributes.

## Continuation and remaining deliverables

B now runs latest casualty-strategy/LOS source in the original SQLite:
Host4368 / ONE Web26588; private source entry
`B-casualty-strategy-source-entry.private.json`. Old74209/76940 are closed.
The completed/paused, zero-in-flight close at114 drained the already-started
continuation to115. Two ordinary player1 calls are retained; all previous114/132
paid rows are unchanged. Sealed115 initial/current envelopes and all116/132 rows
match new ready115. Full outer recovery/audit differences are explicitly retained
in `B-casualty-strategy-source-continuity.json`. New ordinary Web action116 has
been recorded; its detailed strategy/latency inspection is pending.

C remains Host83329 / ONE Web86307 in its original SQLite; source entry
`C-casualty-strategy-source-entry.private.json`. One HTTP observation timed out;
that is not evidence of a stopped game and does not authorize restart or retry.

T23 remains33/36, T27 remains5/6. Four numbered mainline slices remain:

- S248: stable same-route actions, latency/source integration and engineering fixes.
- S249: complete the three comparable live matches.
- S250: screenshot/action/cost reports and strategic comparison/review evidence.
- S272: stable exact2000 roster plus map-aware Plan admission for both creation paths.

T24's deferred18classic maps and wider product scope are not included in this
four-slice count. No slice or active goal is closed by this snapshot.
