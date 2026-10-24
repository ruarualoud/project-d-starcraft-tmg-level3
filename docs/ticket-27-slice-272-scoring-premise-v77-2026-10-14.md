# T27 / S272 v77 — prevent calculator assumptions becoming Rules facts

T27 remains 5/6, T23 remains 33/36; main remaining slices 248/272/249/250.
No complete strategy comparison or Skill promotion is claimed.

## Actual defect and impact

A accepted Plan v4, c5eead06...4d2975, infers a losing marker-only route from
player2 holding its own markers 2/4 for 4 VP per scoring round. The retained
mission authority 113b79c...b8490e says own-affinity markers award 1 VP each:
under precisely that hypothetical split, player1 on 1/3/5 earns 3 and player2
on 2/4 earns 2, before kills/control changes. A's mandatory kill-race rationale
is therefore affected. B v12 lists correct actor-specific values, but its
4/8/12/16 opposing forecast is not bound to a concrete control/kill scenario;
it cannot alone prove that baseline holding loses. Neither finding dictates
that the agent must choose a defensive or aggressive strategy.

Concrete source defect: rosterReviewPremiseFactsV1 recursively promoted every
numeric field of cited readonly query evidence, including the old math receipt
over caller-supplied scores, to the rule-number catalogue. This contradicted
the textual warning that calculator inputs are not Rules facts. The actual A
context exposed 14 such numbers in the RED. This is an available false-proof
path, not proof that every historical reviewer selected that exact fact ID.

## Changes and focused proof

Seven product files changed:

- roster-review-premises-v1: all math receipts, including old/nested receipts,
  remain readable as text but cannot supply printed-rule numeric premises.
- mission-marker-scoring-arithmetic-v1: shared hypothetical control schedule
  projection uses the frozen actor-relative Rules values, not model VP inputs.
  Missing rounds remain unknown; duplicate/conflicting or absent marker IDs
  return typed unknown. Kills, feasible placement and early termination are
  explicitly not proved.
- pregame-scene-laboratory-v1: new math mission_marker_schedule uses that
  projection. Old vp_schedule_delta arithmetic is retained and labelled as
  caller-input arithmetic, not a proof of the assumptions.
- roster-strategist-output-schemas-v1 / roster-strategist-runtime-v1: expose
  the same query in the existing argumentsJson field; no compulsory new field
  added to saved model replies. Contract set 1.5.4, lab 1.3.3.
- roster-teach-evidence-port-v1: preserve the calculation policy and return
  repair context for malformed control schedules.
- roster-final-plan-review-v1: qualification policy 10 invalidates obsolete
  qualification reuse; historical responses are not rewritten or deleted.

Only new test is the actual captured regression:
`node scripts/verify-slice272-scoring-premise-v77.mjs <baseline-directory>`.
RED PID92243 failed with 14 promoted A numbers. Sole GREEN PID93793 exited0:
captured A/B mathematical facts excluded, authoritative group values retained,
actor/control schedule and side swap correct, missing round not zero, duplicate
and unknown marker rejected, direct lab and Teach agree, old arithmetic preserved,
source state unchanged. No Provider calls or Room mutations in this gate.
No passed check or unrelated suite was rerun. This gate does not certify model
strategy, all formations, current-plan application or complete matches.

## Four original rooms deliberately stopped

Owned v76 hosts and drivers were live by actual ps inspection. A scoring-plan
High was recorded in common-v77-scoring-premise-high.private.json; SIGTERM was
sent only to the four identified hosts. Their close handler drains the current
action. Existing monitor completed its all-stop at 2026-10-13T17:24:59.762Z;
all eight owned host/driver processes were confirmed absent.

Authoritative SQLite stop revisions: A133 / C156 / B9 / D9. A/C are round3
Movement; B/D round1 Movement at the last projection. C's Web observation is
one revision behind (155) and recorded browser closure during shutdown, while
the saved transition reaches156. On resume backfill observation from156;
NEVER replay that already-applied action. Other running status strings are
last file snapshots, not live processes. No original rooms/reset/history/fees
were cleared. This pause of experiments is not a user-requested goal pause.

Room-segment estimated fees at stop (not including historical offsets or
offline roster work): A117.000841, C120.751118, B2.648324, D3.696954 CNY.

## Bounded real plan revision initiated, not yet admitted

common-v77-plan-repair.private.mjs PID97379 starts the two original offline
workspaces with the identical saved standard-d6-1 map and current code;
A host97416 / B host97423. No Room-launch capability is attached. It submits
at most one product /revise request per arm and persists actual status/cost.
The model receives the corrected conditional arithmetic and the full facts;
it must reconsider affected route/hypothesis/fallback claims, not obey an
injected tactic. A originalv4 and B originalv12 remain in history and the
stopped rooms retain their original bindings. A new workspace Plan is NOT
permission to silently substitute its identity in an existing match.

Read common-v77-plan-repair-progress.private.json and actual host PIDs before
resuming. An observation timeout is not a dead process or permission to resend.
Initial request failed before dispatch because the operator reason included the
full computed rows (3047 characters), exceeding the existing short reason field.
Both saved failures were exactly ROSTER_STRATEGIST_REVISION_INVALID:text_too_long,
with original Plan hashes and paid call counts unchanged. This was not a model
failure. The complete request remains retained.

common-v77r1-plan-repair.private.mjs PID765 reuses hosts97416/97423, verifies that
exact pre-dispatch failure and unchanged usage, and submits one corrected437-char
reason per arm. The full Rules fact packet is still supplied by product code.
Read common-v77r1-plan-repair-progress.private.json FIRST. Its HTTP observation
timeout does not trigger resend: it follows the same draft/job. At17:39:48Z both
Hosts and the continuation were confirmed live, A/B waiting in the same jobs,
with no newly completed Provider calls yet. No full review/battle resume occurs
automatically. This additional request is an explicit parameter correction after
confirmed zero dispatch, not an unbounded retry or paid-history reset.

## Remaining deliverables

1. Inspect real A/B revisions, their unchanged army/schedule and changed public
   strategy; review affected claims under new authority scope, with bounded
   product correction if needed. Do not call completed revision acceptance.
2. Resolve terrain-preserving hypothetical formations, action-domain/tool
   prerequisites and selected-roster alternative audit. These remain open.
3. Apply accepted Teach to explicitly versioned plans with traceable lineage;
   choose/document original-room plan application boundary, never silently
   label old runs as new Teach efficacy. Same-code four-arm recovery follows
   only after the High is actually resolved; retain C156 and old costs.
4. Complete original comparisons and later review/evolution gates; maps and
   deferred18 retain their original scope. No extra Slice marked complete.

harnessLoopUsed=true; ctx2skillLoopUsed=true; roleRoutes=fact_probe /
harness_optimizer / rule_skill_builder; trainingTruth=false, canAffectRules=false.
No subagents, installs, deletes, source refresh, commits or new online tactics.
