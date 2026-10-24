# T23 / S248 — Plan production through unified scene queries

## Latest user decision / actual status

Update2026-10-12T15:41:17Z: A passed the corrected Teach seam and produced Plan
`818b3375d7e13089932a7555b734638ea54c42599fa13143b2551de61b575539`.
Its review completed with10High/58Medium/4Low, not acceptance. Six High repeat
one actual arithmetic misuse: the tool shows12-9=3; the model says10-point lead.
The remaining High concern unsupported guarantees. The initial auto-repair
made0correction calls because it incorrectly required an existing arrival
schedule for the first fixed-roster plan; the actual revisePlan contract permits
that initial state and derives/audits a schedule during revision.
`reviewed-plan-auto-repair-v1.mjs` now admits only this legitimate first-preset
case; AI-selected and later preset plans still require their existing schedule.
Captured production RED96320, one GREEN97031,3/3,0Provider/Room writes; the
historical auto-repair gate was not repeated. No strategy payload is patched.
Actual normal-product repair now runs in the same A session, owned99618,
`A-v32-auto-repair-owned-handle.private.json`/`A-v32-auto-repair-live.log`, with
the remaining bounded review cycles. No formal ABC match runs through these High.
A13paid/2,782,306units/estimate¥3.581980 before this new correction job.
Fresh B19paid/3,212,046units:9selection calls plus10Plan/review calls. Plan/review
estimate¥1.089429; selection cost is pending the existing pricing calculation,
not zero. Ledger retains old B smoke separately and cumulative offsets.

Update2026-10-12T15:29:53Z: fresh formal B completed the actual empty-roster
product journey to a Rules-valid exact2000 army, arrival schedule, Teach Plan and
source review. `B-fresh/teach-projection.private.json` is authoritative:
session `rws-5f935d5d-f07a-4871-82c4-a763d030e7b5`, Plan
`a6204f7c277f1d78ac4b9868839d7fa08482cb9427355cbda3330635be7bfa42`,
High0/Medium41/Low6. The owned job72193 safely closed at a paid boundary;
read its persisted status, not old handles. No formal match has started.
Medium concerns include conditional map/formation assumptions and component
purpose bindings; High0 is not proof of strategy effectiveness or exact positions.

The actual old B selection has six observations: candidate_menu, map_summary,
candidate_menu, exact_budget_repairs, map_route, final_review. Fresh B has seven,
adding another map_summary. Fresh Teach additionally used native
mission_marker_control and fire_zone_exchange through the common scene service.
These latter receipts are pregame reference queries with unproved placements,
not observed live control or a proven future outcome. They occurred after roster
selection; their availability does not demonstrate use during initial selection.
Changed tools can change both an unlocked army and its Plan. With a locked army,
later tools change only the Plan unless the product explicitly reopens selection.
Do not attribute all new/old army differences solely to the tool fix or treat the
old B retained-army smoke as the formal fresh-B experiment.

A's captured false positive was reproduced and repaired at the target-binding
source: H1 explicitly listed R1 among `ownCounterResponseIds`; the student revised
R1 while retaining H1. The revised contract records the unchanged declared H1 and
the actual changed R1 (`explicit_hypothesis_counter_bundle_v2`) instead of forcing
a cosmetic hypothesis edit. Only existing, unique, explicitly linked responses
count; unrelated changes still exhaust the three-response bound. No paid strategy
text is rewritten. The new focused RED then GREEN passed3/3 once at0Provider/
Room writes; previous green gates were not repeated. Receipts:
`A-linked-target-red.log` and `A-linked-target-green.private.json`.
A now resumes the same session with this verified interpretation, owned88068,
`A-v32-owned-handle.private.json`/`A-v32-live-product.log`, starting15:29:53Z.
Read actual status before recovery; retained paid replies replay locally, only
the remaining production/review rounds may incur new usage. No new A Plan is
accepted yet. The earlier bounded-stop account below is historical, not a claim
that transmission dropped correction data.

The user explicitly required formal B to start from an empty roster and run the
whole AI roster/Plan/match workflow. The retained-list B job below is now only
a tool-regression smoke, **not formal B**. New B uses the normal product-facing
`iterativeJourney.create/run/read`, the Web AI-builder backend entry, with no old
roster/Plan/iterative memory imported. Actual new session:
`iterative-web-57f638cc-7d2f-4b09-9315-f1ab7c0a9958`, owned PID72193 launched
2026-10-12T15:14:06Z. Read `B-fresh/status.private.json` and the owned handle
before recovery. Actual candidate-menu/map-summary/exact-budget-repair queries
already exist; this does not prove every newly advertised scene query was used.
Old B selection already used these legacy tools; changed scene tools may change
both a newly selected army and its resulting Plan. Never assume list invariance.

A resume replayed its three old replies without new cost, then made two correction
calls. Both still declared revise(H1) while leaving H1 unchanged. The three-student
response bound stopped correctly. Do not blindly retry or clear the cycle count.
A5calls/2,608,135units/current conservative pricing estimate¥3.276045. Original
paid outputs and distinct request contexts remain; correction has not converged.
Retained-list B completed four paid rounds then stopped at an actual duplicate
component-purpose ID, not a map-binding issue. B-smoke4calls/706,710units/estimate
¥0.950163; its output is not a formal B Plan. Separate cumulative accounting
retains these real costs even though the smoke is no longer a formal comparison.

Next: investigate A's actual target mismatch without another blind cycle; let new
B finish and inspect native tool use/selected list/arrival/Plan/source review.
All formal match drivers remain paused. Current receipt: `production-usage-ledger.private.json`.

## Arms and room boundary

A=fixed2000+Plan, B=fresh Agent-selected2000+TeachPlan, C=the exact A roster
without an opening Plan. Same opponent model/Skills/harness/memory capability,
no separately generated opponent opening Plan. No subagent/K3/source refresh.
Preserved clean rooms are paused at native A4/B5/C5, Round1 Movement. Do not
silently insert refreshed opening Plans into old experiments halfway through,
delete these rooms, or follow their old handles as active processes.

Shared scene wiring/physical checks are in the v31 unified-scene-query document.
Old A19/B21 receipts remain immutable; advertised tools are not actual use proof.

## Actual production failure and repair

A product session `rws-1b0a31ec-fd74-433b-8531-4a2ce7019535` completed three
Flash calls/1,153,221 units, then hit `ROSTER_TEACH_TARGET_NOT_REVISED`: C2 claimed
to revise H1 but modified R1 while H1 remained unchanged. This is not transport
failure. Paid Foundation/challenge/student replies are retained.

The existing Teach cycle now delivers specific target/disposition issues and
the complete previous public answer to the student for bounded model-owned
correction (three student responses including the original). The role port
binds repair data to request context and includes it in the actual prompt.
The Host never rewrites strategy text, invents evidence or waives the validator.
Cycle history retains original/replacement hashes and role receipts. Exhausted
correction still stops; strategic truth remains subject to source/final review.

Captured-A focused gate: four checks passed (target correction, bound, immutable
source, actual role-port prompt), 0Provider/live Room writes. The actual paid
failure was RED; no unrelated test or prior green was repeated.

B real source admission passed with original candidate
`990bf3f96697bbc2d88fbec4e80081c528ee2d633cea0b7dd2b9b75ae4f098c6` and genuine
Agent-selection handoff/schedule. Its current lab freeze equals the original:
suspected cross-room witness drift did not reproduce here, so no product
compatibility patch was added. First verifier lacked durable failure capture;
the replacement showed a wrong fixture assumption (expected unequal freezes).
Only that fixture was corrected. Final admission, physical equality, altered
freeze/task rejection and original-source preservation passed at 0Provider/
live Room cost. Errors are recorded, not labelled successful first-pass runs.

## Background production and recovery

Runtime root:
`build/ticket-23-three-arm-performance-baseline-20261010-v1/query-contract-audit-v30/plan-production-v31`

- A-config/A-workspace: resume the same fresh session; replay its paid responses
  locally, then request the new correction/remaining rounds, not the Foundation again.
- B-config/B-workspace: new existing product Teach from the original actual AI
  list/schedule, followed by the Agent-selected promotion bridge and review.
- `paid-production-owned-handles.private.json`: owned detached A/B launched
  together2026-10-12T15:06:19Z. Read current status/logs before any recovery.
- `production-driver-source.private.json`: restoreable orchestration of normal
  product APIs, no alternate Rules/Plan calculator or credential.
- `A-teach-target-captured.private.json`, `A-teach-target-gate.private.json`:
  actual paid failure and focused passing regression.
- `B-map-admission-final/verified.private.json`: actual product admission proof.

Separate cumulative A/B/C ledgers/no hard cap remain. Count paid calls once;
local replay is not new usage. Read current persisted usage, not stale callbacks.

## Next / completion

1. Finish A/B product cycles, audit actual canonical receipts and Plan claims.
2. Admit one common source version for formal ABC; C needs no Plan job but uses
   the same live queries. No refreshed Plan is accepted or formal v31 match launched yet.
3. Complete ABC then race/map/start-position swaps with screenshots/costs.
4. Consolidated strategy/Skill review and evidence report.

T23 33/36,T27 5/6; remaining S248/S272/S249/S250 (four main slices).
Valid complete matches0/12. Full20-map goal not closed; deferred classic expansion
remains last. No passed gate rerun, unrelated test, live Room write or commit.
