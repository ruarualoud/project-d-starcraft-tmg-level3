# T27 / S272 — Repair Teach query contracts and retain paid corrections

2026-10-14, Asia/Shanghai. T27 5/6; T23 33/36. Main remaining slices
248/272/249/250 = 4; accepted complete experiment games0/12. This is one
continuing Teach repair, not five new slices. Maps/games/roster acceptance are
not declared complete by these component fixes.

## Starting facts

After the reported network interruption, both old Teach invocations were
already terminal completed; their idle hosts7389/45988 were alive. There was
no in-flight paid call to restart. A had six unanswered questions and B three.
Original Plan9/Plan19, frozen sources and cumulative/unknown fees were retained.

The preceding goal turn made progress: B actually completed its formerly
oversized synthesis; this turn does not rerun that passed validation.

## Source defects repaired

1. **Host adapter failures were excluded from field-level correction.** The
   failed native-control follow-up already had an exact Host-generated error
   path, but the delta lane required a Native-specific wrapper. Whole-request
   rewrites repeatedly echoed the error or dropped the query. The lane now
   accepts a correctable adapter target only when it binds the exact request
   at that path. Native denials/stale targets still fail; the Host does not
   select coordinates or tactics. Explicit recovery permits one recorded
   additional choice for this demonstrated defect, without resetting history.
2. **The adapter removed `branchIdRef` before writing failureTargets.** B's
   full requestHash still matched, but the failed subrequest no longer did.
   New failures retain the complete original request. An old receipt can be
   used only when its full requestHash matches and the sole omission is that
   routing field. No old receipt, branch or semantic argument is rewritten.
3. **An exact failed-child replacement was rejected as outside the failure.**
   A's real paid patch replaced `/toolRequest/followUps/0`, not unrelated
   fields. Exact child replacement is now allowed; deleting the failed child
   or replacing the whole toolRequest is still outside this exception.
4. **Native tool name vs tool family was inconsistently decoded.** A emitted
   `kind:mission_marker_control` with its correct native `unitIds/markerIds`.
   A name in the shared native registry now binds that exact spatial query;
   its supplied arguments are preserved in the native container and the
   binding is recorded. Conflicting names/containers are not dispatched.
   This is transport normalization, not a change of query or tactical choice.
5. **A map inspection was executed as a route query.** The real request was
   `kind:map_route, queryKind:map.inspect`; the adapter ignored queryKind and
   returned `side_identity_required`. A named native query in a different
   family now returns a specific, correctable family mismatch before any
   query executes. Correcting the family preserves the native query/arguments.
   It uses the whole-envelope correction lane because `/kind` is outside the
   field-edit scope, not an impossible delta request.
6. **This turn initially introduced a predicate-check inconsistency.** The
   checker recognized native `kind` in the required predicate but only
   `queryKind` in the supplied query. Both actual A paid queries were falsely
   marked dropped. Required/supplied names now use the same registry lookup.
   Real query removal remains rejected. The evidence dispatch contract moves
   from1.0.8 to1.0.9 so its changed behavior can re-execute failed saved queries
   through the existing explicit recovery path, without another model choice.
   Saved-query execution also checks predicate preservation, not only unit IDs.

## Focused validation evidence

All artifacts below are in
`build/ticket-23-three-arm-performance-baseline-20261010-v1/`.
No previous passed suite/build was rerun. No test calls a paid Provider or
mutates a game/production draft. Fake query adapters prove routing, not Rules
results or live model skill.

| Concrete bug probe | Result |
| --- | --- |
| `common-v158-adapter-query-delta-{red,green}.private.json` | Actual A request enters field correction; named scope/predicate and unaffected scene preserved; Native denial/stale paths denied; real recovery loop issues one scripted correction and no repeat. |
| `common-v159-failure-request-provenance-{red,green}.private.json` | Actual B saved request binds safely despite the historical routing omission; real evidence adapter retains new original request; foreign branch rejected. |
| `common-v160-native-followup-binding-*.private.json` | Initial diagnostic fixture used an unregistered fake branch; fixed its read-only descriptor, then reproduced both actual defects. One GREEN proves paid failed-child patch and exact native dispatch; conflicting names not dispatched. Three command runs total. |
| `common-v161-query-family-*.private.json` | Initial fixture used `descriptor()` instead of `labDescriptor()`; corrected fixture then reproduced the actual wrong-tool execution. One GREEN proves zero route calls for map.inspect, specific feedback and correct spatial dispatch. Three runs total. |
| `common-v162-query-predicate-binding-{red,green}.private.json` | Both real paid native requests recognized; true removal still fails; existing saved-query recovery executes both once, with no new model choice or retry-budget reset. |

The two fixture errors above are test code errors, not evidence of product
failures. Original diagnostics remain available; they were not counted as
successful reproductions.

## Actual model results

### B — completed, two questions still unresolved

`common-v159-B-teach-query-recovery-progress.private.json`, updated08:17:10Z.
Observer94823 exited; host95069 retained idle. No game Room or Plan mutation.

- Two new paid calls: correction19238units/16.926s; synthesis521732units/51.955s.
- New total540970units; cumulative**217calls /25760849units**.
- The model now supplied explicit modelPositions instead of repeating the
  request. Native geometry rejected overlap with `banner-ne:profile-cell-7`
  and overlapping Goliath bases. This is a real illegal scenario, not a
  network failure. It did not produce accepted post-loss control evidence.
- Synthesis now has two unresolved answers: post-loss control and Raynor
  CP/phase enabling order. Opponent future choice is treated as a conditional
  scenario, not something that must be known as fact before play.
- Do not give another blind retry merely to replace the collision. Determine
  whether the pregame formation tool can supply model-chosen legal candidates
  and preserve the original casualty/control question.

### A — completed old attempt, then explicit saved-query continuation

v158 returned one paid patch50958units, then stopped on the exact-child
validation defect. v160 revalidated that saved output with **0 new calls**
(`resolved_by_current_validator`, `reusedPaidOutput:true`), then made one second
query correction56073units/56.563s and synthesis330422units/68.972s. That
synthesis still had six unanswered questions because of the predicate-check
defect described above. Do not call it accepted Teach.

Before the latest continuation: cumulative**131calls /21763900units**; this
turn's known A increment3calls/437453units. Plan9 unchanged. B Plan19 unchanged.
Provider units are the reported usage, not a new RMB estimate. Existing ledger
and unknown original fees were not reset.

The old A host4661 was verified terminal/idle, then replaced safely. Current:

- `common-v162-A-teach-query-recovery-progress.private.json`
- observer**17758**, host**17875**, both verified alive at08:34Z
- `status:running`, failure null, **0 new completed calls at that observation**
- three original queries selected: Q5/Q6 saved controls and Q2 map inspection
- source includes v158–v162; current network recovery policy preserved
- no Room initialization, new whole Teach agenda or automatic Plan application

An old nested `phase:completed` during workspace restoration is not a new
completion. Use the live handle plus current progress/draft, never restart due
to an observation timeout. The observer is already attached.

## Remaining concrete work

1. Observe A17758/17875 through its actual query receipts and synthesis. The
   local guard/routing tests are not proof the full queries succeeded.
2. Pregame geometry: B's named survivors still overlap. A Q4/Q7 also need
   usable formation/timing evidence; distinguish static layout solving from
   a current action domain. Do not hand-pick tactical coordinates for the model.
3. Source-owned native argument contract: B's failed follow-up still carries
   relationship-tool `subjectUnitIds/targetIds/intent` inside
   `mission_marker_control.argumentsJson`. The current native control handler
   reads `unitIds/markerIds` and does not reject other keys. Its current
   geometry failure prevents execution, but this could silently broaden scope
   after placement is fixed. Reproduce/fix the shared consumer, not only Teach.
4. Expose existing audited Builder candidate/upgrade comparison to Teach;
   `budget_fit` cannot replace actual selected-roster opportunity-cost data.
   `compareCandidatesSameState` exists in the lab but is not currently exposed
   by the Teach query schema/adapter. Do not fabricate upgrade prices.
5. Raynor CP payment/phase order: query frozen Native ability and action
   evidence; a Skill uncertainty does not override a Rules answer.
6. After genuine Teach closure and final Plans, audit the same tools through
   initial planning, live decisions, Plan revisions/memory and replay, plus
   relevant live performance. Only then launch four same-code games.

## Diff boundary and skill use

Three product files: `roster-teach-query-delta-v1.mjs`,
`roster-teach-query-recovery-v1.mjs`, `roster-teach-evidence-port-v1.mjs`.
One existing safe-resume launcher extended for explicit saved query IDs and
the exact retained failed patch. Five concrete-bug probes above. Task/memory/
current-work records updated. Historical unrelated changes preserved; no
commit/push, deletion, installation, source refresh or subagent.

Diagnose + Harness + offline Teach skills used: reproduce actual request,
repair its source contract, separate paid reply/tool result/strategic conclusion.
No hidden chain-of-thought collected; public reasons and tool receipts retained.
UI/Room actions0, new strategy promotion0, trainingTruth remains false. Roll
back any binding that changes tool meaning, drops named targets or claims
legal geometry merely because transport succeeds.
