# S272 throughput and recovery implementation — v271–v273

2026-10-16, Asia/Shanghai. Continues fresh-v264 A/B; no new rooms or hand-edited
model armies, Plans, receipts, budgets or usage. See the adjacent retrospective
for the measured before-state. T27 5/6, T23 33/36, main remaining4, complete0/12.

## Delivered

1. Archived the large current-work history, retaining every historical entry.
   New CURRENT_WORK is a short authoritative pointer. A bounded read-only status
   CLI prints stage/request/usage without nested prompts or receipts. Initial
   compact-entry check: 2,761 bytes/53 lines, within existing16KiB/120line contract.
2. Preset product Run now selects the existing changed-claims review using the
   latest completed prior review. Exact interrupted reviews retain their route;
   the review service still validates dependencies and owns fallback to full review.
3. Identical army/strategy with unchanged map/Skills/evidence reuses prior draft
   Teach feedback instead of buying another inquiry merely for revisionReason.
   Original sourcePlanHash and unresolved questions remain unchanged. The model
   receives an explicit reuse disposition; final admission is NOT granted.
4. Delta preparation decodes only the failed subrequest. Inactive empty fields
   and successful siblings remain untouched. Malformed active arguments stay raw
   with typed paths for model correction; the Host supplies no strategic value.
5. Ambiguous query dispatch is represented at preparation boundaries instead of
   crashing before correction. Initial batches isolate it per query; a paid bad
   correction remains a counted local unknown with feedback. Execution still uses
   the strict dispatcher. No competing attacker/target is chosen by the Host.
6. Plan-only draft revisions import scenario handles from compatible completed
   snapshots. Recipes/receipts stay in their original records, restored lazily
   through existing Native source/runtime/spec/parent/state validation. Paid
   context is unchanged and old evidence is not relabelled as new Plan acceptance.
7. First full Run revealed one more registry omission: a scenario executed at
   recovery start lives in currentFailure before the first correction, not in
   op.result. The shared collector now includes exact request-hash-bound recovery
   receipts and their original aliases. No geometry/query re-execution is needed.
8. Real B follow-up exposed a scope false positive: canonical attack_probability
   uses domainId to bind its attacker. The scope checker demanded a redundant
   attackerUnitId which that canonical tool does not require. It now resolves the
   selected domain's pieceId from Native's current branch actionSpace, for registered
   domain-required queries only. Different actors still fail. A previously blocked,
   unexecuted paid query gets its first actual execution, not another model generation.
9. A combined candidate selection had an idempotent non-geometry subpatch plus a
   genuine new placement. The subpatch incorrectly threw NO_CHANGE before applying
   geometry. Subpatches now compose before whole-request progress is judged. An
   entirely unchanged request still receives local unchanged-request feedback.

## Focused verification

Only concrete regressions, all through `scripts/verify-slice272-retro-v271.mjs`:

| Case | Observed RED | GREEN |
|---|---|---|
| incremental_review | Product sent no incremental scope | Existing changed-claims contract selected |
| unchanged_teach | Unnecessary scene constructor called | Zero scene/model calls; original unresolved feedback retained |
| A_delta_preparation | Empty inactive root JSON threw before correction | Only failed follow-up decoded; original request/siblings unchanged |
| B_dispatch_recovery | Ambiguous saved query threw before ask | Correction reached; explicit defer retains unknown, executes no wrong query |
| B_retained_scenarios | Three actual r3 handles absent in r4 | All three inherited; paid context/Plan unchanged |
| A_recovery_scene | Recovery-created handle absent after restart | Exact saved request and branch hash restored to registry |
| B_domain_scope | Canonical Goliath domain falsely lacked attacker | Native-bound same actor accepted, different actor rejected; paid request executes once without model call |
| B_combined_candidate | No-op subpatch aborted whole combined edit | Model-selected placement changes; other placements/follow-ups unchanged |

A/B original failure REDs came from actual saved data before implementation.
The B defer fixture initially asserted `result` although no query had executed;
corrected it to the actual `currentFailure` slot and ran that failed gate once.
Other passed gates were not repeated. These are local transport/registry gates,
not proof that Native strategy queries or final product admission all succeed.

## Actual product continuation

- v271 A/B started through ordinary product Run, same generation264 and same sessions.
- A stopped before a new Provider call on the recovery-created scene omission;
  that specific defect was reproduced/fixed, then A resumed with v272.
- B progressed request56→61, then paused at a safe boundary to load v272.
  Its observer labelled this `stopped/arrival_schedule_required`, while the durable
  session correctly recorded paused/no blockingFinding. This is a Medium observer
  status-reporting defect, not a failed arrival calculation. No paid call was killed.
- v272 A PID11389/B PID25585 at launch. PIDs are historical hints, not live authority.
  Read `progress.private.json` and process existence before any restart.
- At18:32, A had completed its old Teach: 5unresolved→0unresolved,
  3retain/5revise. It automatically revised Plan6→7→8 and was reviewing Plan8.
  Plan7 used incremental review: 8top-level shards instead of the former13;
  adaptive child shards and qualification calls still add work. This is not a
  measured end-to-end speedup percentage or final strategy acceptance.
- B remained in the same legal2000/r4 inquiry; final synthesis not yet observed.
  New requests alone are NOT evidence of convergence.
- Actual B repair produced advisory results for prior missing-branch opponent and
  post-loss queries, and the ambiguous route query. Thus inherited handles were
  exercised in product tools, not only present in a field-level test.
- B then stopped on the combined-edit NO_CHANGE defect above (request66), while
  A reached a safe pause. Both v273 resumed: A PID66673/B PID66675, same saved
  generation264. Logs `resume-v273-20261016.log`. Eight concrete regressions now
  pass; no old passed gate was repeated for these two additional scoped fixes.
- Plan7 incremental review reused54 of104claims and reviewed50 new claims;
  8top-level shards vs13 previously. This is real review-work reduction, not a
  claimed wall-clock reduction for the whole planning/Teach task.

## Still required

- Observe full A/B Run through final Plan/Teach/source acceptance, no fabricated
  field fixes. Confirm actual field-level issue dispositions, not revisionReason.
- Continue checking new tool receipts for authority/scope failures; successful
  inherited-branch queries do not prove all future scene types are covered.
- Quantify new call counts/latency/units after a comparable completed phase.
  Large always-sent evidence and serial shard latency are still optimization items;
  no token cap, truncation, tactical prompt bias or model change was introduced.
- Address the observer's paused-versus-stopped display without confusing it with
  production errors. Do not restart either active process just to fix reporting.

## Diff scope and recovery

Seven runtime files: preset-roster-journey; iterative-roster-draft-teach;
iterative-roster-flash-model-port; roster-teach-query-delta;
roster-teach-query-dispatch; roster-teach-query-recovery; roster-teach-framework.
Also compact navigation/history, bounded status script, concrete regression script,
this report and root tracking entries. Existing unrelated dirty work preserved;
no commit/push, data refresh, new game or old green-suite rerun.

Status: `node scripts/inspect-roster-generation-status.mjs <base> 264`.
Resume only after confirming stopped:
`node scripts/run-slice272-fresh-generation-v240.mjs <base> A|B --resume-product --generation=264`.
Base: `build/ticket-23-three-arm-performance-baseline-20261010-v1`.
Logs: each arm's `fresh-generation-v264/resume-v273-20261016.log`.

Harness loop used: roster planning/Teach/query correction/source review; unchanged
Rules authority and source scope; retained public decision/tool/usage traces;
no browser acceptance and no training promotion. Wrong source or unresolved
authoritative claims keep admission closed; ordinary bad model arguments get
bounded local feedback rather than whole-workflow failure.
