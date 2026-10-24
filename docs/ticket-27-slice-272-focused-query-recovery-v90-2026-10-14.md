# T27 / S272 — focused query recovery and feedback delivery

T27 5/6; T23 33/36; remaining main slices 248/272/249/250 = 4; complete games 0/12. Original Rooms stay A133/C156/B9/D9. No new Plan applied, no Room reinitialization.

## Observed cause, not another strategic prompt preference

A6's actual `query-r4-92a3b4c5d6e7f8091a2b3c4d` asks about named survivors and markers with native arguments in the wrong container. v89 correctly reports an unbound query. However the Teach orchestration did not invoke its focused query-repair mechanism: it merely carried failures to another large investigation batch or to synthesis. More directly, `projectRosterTeachPromptEvidenceV1` discarded the entire `queryRepair` field when projecting an unknown receipt. Port-side feedback existed but never reached the model through that path.

## Product changes

- `roster-teach-framework-v1.mjs`: preserve actionable query-repair context in unknown-receipt projection; add a strict focused recovery output contract and connect recovery before synthesis. No change to Rules, scoring preferences or army composition.
- `roster-teach-query-recovery-v1.mjs`: one model-owned correction per selected failed query, persisting the paid choice before read-only execution. Preserve original request/result, exact question, complete Plan/Skills context and current tool contract. No automatic selector/position/weapon guessing. Unchanged requests are not re-executed; a model can defer with a reason. Repaired query execution is not strategic acceptance.
- `roster-planning-workspace-service-v1.mjs`: current-Plan-bound selection of saved query IDs for focused recovery, without resetting investigation rounds or replaying the completed whole Teach cycle. Historical costs and original rooms remain unchanged.

## Focused evidence

`scripts/verify-slice272-focused-query-recovery-v90.mjs <base>`:

1. RED30113: captured failure reaches synthesis with zero correction calls (expected one).
2. After connecting recovery,31184 exposed the real prompt projection defect: `queryRepair` absent from model input.
3. After that concrete fix, sole GREEN31751: real Teach orchestrator/native port, exact marker/unit filters preserved, original failure retained, completed correction and synthesis not regenerated on normal resume, source unchanged. Scripted model; zero Provider calls/Room actions. Native action enumeration is stubbed. This does not prove live model compliance, exact movement, post-loss strategy, or recovery across every possible crash window.

Do not rerun this passed command or the previous v85-v89 gates.

## Live continuation

Runner32841 / host32879 loads current source against A's same offline workspace. It selects only the captured Q5 query after the concrete fix; one correction attempt, then synthesis if a new receipt exists. It does not restart the completed four investigation rounds. The idle8216 host was replaced only after terminal Teach and completed dispatch were verified.

Progress: `build/ticket-23-three-arm-performance-baseline-20261010-v1/common-v90-A-focused-query-recovery-progress.private.json`. Inspect this plus actual PID, never restart after observation timeout. Baseline A59calls/8834350units; all new calls add to A. B16 review is terminal (3 rawHigh), still pending factual qualification; an Armory capacity allegation appears logically unsupported and must not cause facts to be rewritten merely to satisfy a reviewer.

Still required: actual model query correction and valid scenario evidence; remove overclaimed B fallback, qualify known material findings, explicit new Plan application, all four same-code original-Room resumes and full games. Future opponent choices may remain conditional; malformed requests are not strategic uncertainty. No source refresh, new agents, install, deletion or commit.

Harness: routes `teach_framework_query_recovery` then synthesis; tool is read-only pregame laboratory/native query. Public decisions/receipts persist in Teach memory, `trainingTruth:false`. No UI/action mutation. Demotion: if the correction drops filters, changes the scenario silently, or calls empty-source output post-loss proof, it is not accepted as answering the original question.
