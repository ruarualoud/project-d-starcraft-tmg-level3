// Reproduce the PAID v90 reply: it replaced a filtered question with native {}.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createPregameSceneLaboratoryV1 } from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import { createOfficialArmyBuilderQueryPortV1 } from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import { runRosterTeachFrameworkSessionV1 } from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
const base = process.argv[2];
const draft = JSON.parse(await fs.readFile(base + '/query-contract-audit-v30/plan-production-v31/A/workspace/drafts/rws-1b0a31ec-fd74-433b-8531-4a2ce7019535.json', 'utf8'));
const captured = draft.teachFramework.state.investigation.operations.findLast(o => o.request.kind === 'spatial'
  && o.request.toolRequest.queryKind === 'mission_marker_control' && o.request.toolRequest.subjectUnitIds?.length);
const paid = draft.publicOutputs.findLast(o => o.roundKind === 'teach_framework_query_recovery').sanitizedOutput;
assert.equal(JSON.parse(paid.toolRequestJson).argumentsJson, '{}');
const source = JSON.parse(await fs.readFile(base + '/query-contract-audit-v30/native-movement-fixture.private.json', 'utf8')).state;
const freeze = v => { if (v && typeof v === 'object' && !Object.isFrozen(v)) {
  Object.values(v).forEach(freeze); Object.freeze(v); } return v; };
const lab = createPregameSceneLaboratoryV1({ sourceState: source,
  armyBuilderPort: createOfficialArmyBuilderQueryPortV1({ unitCompositionUpgradeDataBundle: freeze(source.officialUnitCompositionUpgradeDataBundle) }),
  rulesRuntime: { descriptor: { runtimeHash: 'a'.repeat(64) }, enumerate() { return { candidates: [], parameterDomains: [], searchSuggestions: [] }; },
    instantiate() { throw Error('No actions'); }, apply() { throw Error('No mutation'); } } });
let unfilteredExecuted = 0;
const boundaryLab = { ...lab, async querySpatial(q) {
  if (q.queryKind === 'mission_marker_control' && q.argumentsJson === '{}') unfilteredExecuted++;
  return lab.querySpatial(q);
} };
const inquiry = { framework: draft.teachFramework.state.framework,
  agenda: { coverage: [], questions: [{ questionId: 'scope-question', axisIds: ['post_loss_capability'],
    question: 'Named units at named markers after a declared loss.', evidenceRequest: captured.request }] },
  investigation: { version: 1, rounds: [], evidence: [], operations: [], completed: true } };
await runRosterTeachFrameworkSessionV1({ sessionId: 'paid-query-scope-replay', plan: {}, context: {},
  laboratory: boundaryLab, state: inquiry, onCheckpoint: async () => {}, deliberation: { async deliberate(r) {
    if (r.roundKind === 'teach_framework_query_recovery') return { output: structuredClone(paid) };
    assert.equal(r.roundKind, 'teach_framework_synthesis');
    return { output: { schemaVersion: 'starcraft_tmg_teach_framework_generation_v1', roundKind: r.roundKind,
      answers: [{ questionId: 'scope-question', disposition: 'unresolved', evidenceRefs: [],
        publicReason: 'The broad baseline did not answer the filtered question.', tradeoff: 'Still unresolved.',
        replanTrigger: 'Supply a relevant scene.', quantitativeEvidence: [] }],
      proposedPlanChanges: [], proposedRosterChanges: [], frameworkFeedback: [] } };
  } } });
assert.equal(unfilteredExecuted, 0, 'A repair must not execute a broader question as the requested correction');
const operation = inquiry.queryRecovery.operations[0];
assert.equal(operation.status, 'scope_changed_not_executed');
assert.equal(operation.result.status, 'unknown');
assert.equal(operation.result.unknownReasonCode, 'ROSTER_TEACH_RECOVERY_QUERY_SCOPE_CHANGED');
assert.deepEqual(operation.result.missingScopeValues.sort(), [...captured.request.toolRequest.subjectUnitIds,
  ...captured.request.toolRequest.targetIds].sort());
assert.deepEqual(operation.choice, Object.fromEntries(Object.entries(paid).filter(([k]) => !['schemaVersion', 'roundKind'].includes(k))));
assert.equal(inquiry.synthesis.answers[0].disposition, 'unresolved');
assert(lab.proveMutationZero().sourceStateHashUnchanged);
console.log(JSON.stringify({ status: 'PASS', capturedPaidReplyPreserved: true, droppedScopeNotExecuted: true,
  fullMissingSelectorList: true, sourceUnchanged: true, providerCalls: 0, roomActions: 0, strategyProven: false }));
