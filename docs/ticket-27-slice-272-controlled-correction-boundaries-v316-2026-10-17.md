# T27 / S272 — controlled correction boundaries v316

This is an intermediate debugging record, NOT the final workflow diagram,
strategy-improvement claim, or six-arm acceptance report. Production A–F remain
paused. No new Provider call, Native action, room, source refresh or game occurred.

## Outcome

Four production defects were reproduced and repaired in this round:

1. A typed Plan reply mixing reads and edits terminated the entire operation.
   Now only reads execute; an explicit `PLAN_EDIT_READ_WRITE_MIXED` receipt says
   writes were not staged. The next reply resubmits desired edits after reading
   evidence. Previously staged valid fields survive. No strategic choice is imposed.
2. The saved-evidence adapter discarded source-owned `queryRepair` navigation.
   It now forwards that exact diagnostic, retaining `unknown` and
   `originalQueryNotAnswered`. It never substitutes another receipt/value.
3. `sealNode` recursively froze aliases into the live evidence collection.
   The second read could not append its corrected result. Prompt sealing now
   copies values before freezing them. Content hashes and delivered read-only
   values remain unchanged; the running state keeps its own mutable ownership.
4. The Teach evidence projector replaced `coverage[]` inside the public reply
   being corrected with an archive reference. The agenda role cannot read that
   reference. Current correction bodies now retain their exact shape and values;
   ordinary historical evidence still uses its existing projection.

The earlier v315 fix is separate: publish a formal Plan revision only after its
atomic save succeeds, with one same-data transient I/O retry and no new model
answer. Its three existing passed tests were NOT repeated.

## Single-step evidence

All paths below are relative to
`build/ticket-23-three-arm-performance-baseline-20261010-v1/`.

| Boundary/scenario | Failure evidence | Passing evidence |
| --- | --- | --- |
| Mixed read/write | `revision-boundary-v316-D0baKg/report.json` | `revision-boundary-v316-n9j9hZ/report.json` |
| Missing exact-path navigation | `revision-boundary-v316-qvKyLW/report.json` | `revision-boundary-v316-J3npZN/report.json` |
| Second read frozen by prompt alias | `revision-boundary-v316-WReb2V/report.json` | Same `J3npZN`: wrong path → navigation → correct read → typed edit |
| Mixed reply after one valid field staged | New fault scenario, not a repeated old gate | `revision-boundary-v316-7ReoYC/report.json` |
| Committed Plan actually consumed by reviewer | New next-consumer boundary | `revision-boundary-v316-wMXgKW/report.json` |
| Corrected agenda after checkpoint/restart | `teach-checkpoint-v316-jKWhWZ/report.json`, only the correction case failed | `teach-checkpoint-v316-y4HFtf/report.json` |
| Reply saved before Teach checkpoint fails | No production defect observed | `teach-checkpoint-v316-jKWhWZ/report.json`, saved-reply case |
| Transport timeout stays out of format repair | No production defect observed | Same `jKWhWZ`, transport case |

Seven distinct new scenarios passed, bringing the scoped v314–v316 count to
**34** (24 + 3 + 4 + 3). This number is not a completion percentage.
Each report contains input/output boundaries and the specific assertions.
The reviewer test stops at actual model input: it does not claim a completed
semantic review. Scripted replies test delivery, not model intelligence.

Fixture mistakes are retained, not counted as product defects or passes:

- Initial revision fixtures passed the mission envelope instead of its profile,
  then omitted the deliberation descriptor. Corrected before the actual red cases.
- Initial Teach fixture tried to enumerate Native domains before the checkpoint.
  The corrected test replays the actually saved query context, verifying its exact
  frozen source-state hash. It makes no claim about freshly executing those domains.
- Once two Teach cases passed, only the remaining correction/restart case was rerun.
- The additional green run after the concrete frozen-array/source-projection fix
  follows the user's standing authorization for a pinpoint rerun after a real fix.

## Actual strategy-change trace — B

Source: the current, unchanged production iterative session
`B/fresh-generation-v264/workspace/iterative-draft/sessions/`.
Comparison uses each stored Plan/candidate against the preceding stored iteration,
not the model's claim that it improved the strategy.

| Revision | Actual change | What it does NOT prove |
| --- | --- | --- |
| r2 | Initial 920-point army and draft Plan | Final legality/budget or complete strategy |
| r3 | Army becomes 2000; victory/score/roster/map/opening/opponent fields change | Better win rate |
| r4 | Only `strategy.revisionReason` | No changed playable route/action/counter demonstrated |
| r5 | Opponent hypotheses and counterplans | Correct or superior counterplay |
| r11, r13, r15, r16 | Opponent hypotheses | Their assumptions are true or used in battle |
| r24 | Only `mapEvidenceHash` relative to r23 | No changed battlefield decision demonstrated |

Current explanation text can describe improvements without changing the fields
that carry the playable plan. Do not classify explanation/version/receipt changes
as strategic improvement. This observation does not authorize forcing different
tactics or deleting a justified preference. The final comparison must inspect
actual decisions, their conditional evidence and downstream use.

## Remaining controlled-debug work before production

1. Check the remaining final-publication paths (initial generation and final
   review) under save failure; v315 proves only formal Plan revision publication.
   Inspection found swallowed final-save errors elsewhere, but those paths have
   not yet been fault-injected or claimed repaired.
2. Complete investigation → evidence → synthesis → substantive Plan revision
   state/consumer checks. Existing agenda/revision checks do not cover all stages.
3. Compare actual roster/strategy changes and unchanged alternatives under matching
   sources; then obtain fresh automatic legal-2000/Plan/Teach outcomes.
4. Only after functional/exception acceptance, generate the final visual report
   from the final implementation and real trace. Do not promote the old draft graph.

No full objective closure: T27 5/6; T23 33/36; remaining main slices
S272/S248/S249/S250 = 4; final Plans 0/6; complete experiments 0/12.
Map acceptance, planned/unplanned complete games and strategy review remain in scope.

## Harness record

- `harnessLoopUsed`: true; `targetGames`: StarCraft TMG.
- Routes: formal Plan revision, independent final-review input, Teach agenda/correction.
- Tools: real typed `plan.fill_argument`, exact saved-evidence read, retained-reply adapter,
  actual atomic draft store. Native query-context metadata was replayed where stated.
- User-visible checks: no partial Plan publish; missing fields alone corrected;
  new Plan reaches reviewer; corrected agenda retains questions, alternatives,
  scenario assumptions and falsification criteria.
- UI trace: none in this scoped controller test; no browser acceptance claimed.
- Memory trace: public outputs/checkpoints retained; production history unchanged.
- Training candidates: none; all debug results are `trainingTruth: false`.
- Demotion rule: any frozen-source drift, unauthorized mutation, lost public field,
  missing stored reply or incorrect next consumer invalidates this scoped result.
- Cost: zero new real Provider calls; all original costs/unknown charges preserved.
- No commit/push, dependency install, source update or passed-gate rerun.
