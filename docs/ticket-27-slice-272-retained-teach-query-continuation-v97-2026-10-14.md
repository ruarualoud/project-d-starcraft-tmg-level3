# T27 / S272 — retained-source Teach query continuation

T27 5/6, T23 33/36, main remaining 248/272/249/250 (4), full games 0/12.
Original Rooms A133/C156/B9/D9 remain untouched. This is an offline query
recovery entry, not strategy, map or full-game acceptance.

## Concrete defect and change

The saved investigations belong to A6 and B14, while their current Plans are
A8 and B17. The workspace rejected explicit recovery because it required the
Teach source to be the latest Plan. Restarting a complete Teach would discard
the intended continuation and buy a new agenda unnecessarily.

`roster-planning-workspace-service-v1.mjs` accepts an explicit
`sourceTeachPlanHash` together with current `expectedPlanHash` and selected
`recoverFailedQueryIds`. It resolves the exact retained Plan and verifies that
army, side, provenance, deployment schedule, setup and frozen fixture have not
changed. The old questions, source context, receipts and fee history remain.
The current Plan is never replaced by its older revision. Continuation records
both source and target Plan hashes and cannot automatically certify/apply the
results to the new Plan. A simultaneous fresh investigation supplement is not
accepted as retained recovery.

Both workspace early-return paths now use the same premature-close predicate
exported by `roster-teach-query-recovery-v1.mjs`: a correctable unknown may use
its remaining original attempts rather than being silently returned as done.
This is the v95 behavior factored into a shared helper, not a new attempt reset.
The HTTP route already forwards the request body to the product method.

## Focused verification — complete, do not repeat

`scripts/verify-slice272-retained-teach-entry-v97.mjs <baseline-root>` uses the
actual B17 draft and its Teach14 context in an in-memory product service.

1. RED: `ROSTER_WORKSPACE_TEACH_QUERY_RECOVERY_UNAVAILABLE` with
   `saved_queries_on_current_plan_required` at the original entry.
2. The first post-fix run exposed a test-fixture mistake: `projectSession`
   legitimately reads the Builder menu to render budget information, but the
   fixture prohibited that read along with mutation. No product change was
   made to accommodate it. The fixture now supplies an explicitly empty display
   menu; budget math is not asserted by this entry test.
3. Sole corrected GREEN, node91273, 10.770s: original Teach context/source kept,
   current Plan unchanged, changed-map context rejected before execution,
   premature completion does not hide remaining attempts, counters unchanged.
   0 Provider calls, 0 Room actions, 0 writes to original workspaces.

The test deliberately stops at the laboratory boundary. It does not prove
model correction, actual geometry, movement legality or strategy quality.
Earlier v95/v96 and other passed checks were not rerun.

## Actual execution and preserved boundary

- A8 generation/review finished at 21:37:54Z: 3 new calls / 173024 units.
  A cumulative ledger: 72 calls / 11437295 units. Its eight retained raw High
  have validated source qualifications; effective High0 and no reconciliation
  needed under the current implementation. Unresolved Teach scenarios remain.
- B17 remained idle/planned, final review and Teach completed. Initial v97
  launcher92097 stopped before host replacement or any paid request because
  it treated a historical Plan4 `sending` record (08:32:07Z) as current work.
  Actual current B17 GET returned200/planned with latest dispatch completed.
  The launcher now uses current lifecycle state; it does not erase the old
  unresolved dispatch or its possible cost.
- B runner92868/host92895 reloads the same workbench on v97 and submits four
  saved queries: opponent placement, 2/4 reach, post-loss formation, movement
  domain. It is not a new army, new agenda or new Room.
- A runner93293 reloads its same workbench after the completed A8 review and
  requests five retained queries for Omega/activation scenarios, two movement
  queries and the support scenario. Already successful control Q5 is not rerun.
- Matching `common-v97-{A,B}-retained-query-recovery-progress.private.json`
  plus live PIDs are authoritative for subsequent status. A timeout is not a
  failed dispatch and must not cause a duplicate request.

Next: inspect actual corrections and original-question relevance; apply only
qualified evidence through explicit Plan revision, then resume original Rooms
on common code. Full maps, stable 2000-point production, complete comparisons
and strategy replay remain open. No subagents, installs, deletions, source
refresh, commits or Room actions. Training truth remains false.
