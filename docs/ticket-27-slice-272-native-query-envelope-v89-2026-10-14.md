# T27 / S272 — do not silently discard native query arguments

T27 5/6; T23 33/36; remaining main slices 248/272/249/250 = 4; complete games 0/12. All original Rooms remain held at A133/C156/B9/D9; C Web155 is observation lag, never replay156.

## Actual product bug and focused verification

A6's real additional investigation still sent outer `subjectUnitIds`, `targetIds` and `intent` together with native `queryKind`. `queryScene` read only `arguments` or `argumentsJson`, silently treated that as an empty request, and an unfiltered marker-control query could return advisory success. A descriptor-only fix did not make the model use the schema correctly. This is a transport-meaning defect, distinct from correct rejection of overlapping pieces or an unresolved opponent choice.

Two product files changed:

- `pregame-scene-laboratory-v1.mjs` v1.4.3 detects nonempty unbound outer arguments before querying. It returns `SCENE_QUERY_OUTER_ARGUMENTS_UNBOUND`, lists the ignored field names and explicitly marks the original question unanswered. No guessed selector mapping, weapon, path or action is chosen.
- `roster-teach-evidence-port-v1.mjs` exposes that error as correctable with the required native argument container and the current shared descriptor. A genuinely explicit native `{}` keeps its documented all-visible scope. This is not a new game-rule prohibition and does not stop the whole Teach pipeline.

Concrete regression: `verify-slice272-native-query-envelope-v89.mjs <base>` used the actual captured A6 request. RED18136 saw null error/advisory; sole GREEN18918 proves the outer-filter omission is rejected with correction context, input is unchanged, conflicting outer filters are not ignored, and an explicit native empty query retains its scope. No Provider/Room writes; action enumeration is stubbed, so this does not prove an exact path or corrected model behavior. Receipt `common-v89-local-evidence.json`. No old green gate rerun.

## Actual B15 and independent findings

B14→B15 was produced by one real revision, 265476 units, preserving the same army and arrival schedule. It now makes the 2/4 contest conditional rather than mandatory and incorporates a hypothetical Quad K12/Hydralisk comparison. However it copied errors from Teach and retained contradictory older prose.

Independent material findings (do not promote B15 merely because a review omits or downgrades them):

1. **Arithmetic:** 3:2 baseline has per-round differential +1; 5:1 after the declared marker-2 transfer has differential +4. Improvement is +3, not the repeated approximately +2. Source: actual conditional mission-marker schedules and the frozen per-actor table. No claim that the control assumptions will occur.
2. **Geometry:** entry-edge route length does not establish the base-edge distance from a central firing position. The categorical claim that neither the16-inch nor24-inch weapon reaches from the centre is unsupported by that evidence. Range, LOS, legal movement and control are separate predicates.
3. **Cross-plan consistency:** `componentPurposes.player1-tactical-3` still justified the purchase by a mandatory2/4 track, conflicting with the newly conditional route.
4. **Evidence and timing:** the Goliath flank sentence mangled a receipt identifier, and the Crushing Grip fallback calls an unproved remaining-unit hold verified. Correct the factual assertions, not the strategy by fiat.

The B15 review completed with5 rawHigh. One is demonstrably a reviewer error: it says the quoted table player1=2/player2=1 on2/4, player1=1/player2=2 on1/3 is inverted, then cites exactly the same table as the authority. Preserve the correct table and the original review; do not change facts to satisfy this allegation. Medium strategic concerns remain recorded, not automatic blockers.

B15 generation plus review:13 completed calls /1209026 reported units; frozen Sep14 off-peak cache-aware estimate USD0.217822524, not an invoice. Prior/unknown costs are retained. B ledger at that boundary:171calls/16892919units. No new CNY100 notification boundary crossed.

## Current continuation

Actual20:11Z B16 generated with1call121768units. Direct reading confirms the model now states `4 minus 1, i.e. +3 per round, not about +2`, and the contest response explicitly says entry-edge route length is not centre-to-target range and does not assert either weapon can/cannot reach from that audit. A naive search for `about +2` matches the correction's negation, not a remaining error. The changed-claim review is now running under the same20600/99278 handles. These two corrections are observed; source-review closure, scenario validity and Room application remain unproven.

Actual update20:10Z: A supplement is terminal completed at20:09:45Z,2calls/845884units (frozen off-peak USD0.115200168 estimate, not invoice),64operations and the same4unresolved questions. Its host8216 is live/idle; runner8162 has exited. This is negative evidence for descriptor-only model correction, not a new geometric success. A ledger59calls/8834350units. Do not replay this completed supplement. A next requires focused query recovery using the new v89 boundary; no arbitrary additional whole-Teach cycle is authorized by a timeout. B runner20600/host99278 remains live with revision16 sending and0new completed calls so far; keep the in-flight call and inspect its eventual result.

- `common-v89-B-factual-plan-revision.private.mjs`, runner20600, reuses idle B host99278. It makes one model-owned correction request for the observed arithmetic/geometry and inherited contradictory prose, preserves the correct actor table and the army/schedule, then reviews changed claims only. Progress: `common-v89-B-factual-plan-revision-progress.private.json`. No automatic Room launch.
- A runner8162/host8216 still completes its v88 paid supplement. Latest known state at20:07Z:64operations, synthesis running,1newcall393856units. Its returned queries continued to omit native containers/domain IDs despite receiving the full descriptor. Do NOT claim v88 model compliance. Let the paid work finish; load v89 only at a safe boundary before further query recovery.
- B host's active revision/review does not execute spatial queries; both hosts must nevertheless load the same latest code before future live Room actions. New v89 source code is not yet proof of a successfully corrected paid query.

The original four Rooms are still stopped, and no new Plan has been applied. Remaining work is valid scenario evidence and correction of known Plan errors, not another broad review of unchanged code. Maintain full map/2000-point/list-plan/complete-comparison scope. No subagents/K3, dependency install, deletion, official-data refresh or commit.
