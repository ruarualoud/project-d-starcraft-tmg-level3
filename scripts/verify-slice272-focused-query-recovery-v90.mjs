// Reproduce A's captured wrong native argument envelope at the real Teach
// orchestration seam. Scripted model is not evidence of live model quality.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createPregameSceneLaboratoryV1 } from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import { createOfficialArmyBuilderQueryPortV1 } from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import { runRosterTeachFrameworkSessionV1 } from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
const base = process.argv[2];
const draft = JSON.parse(await fs.readFile(base + '/query-contract-audit-v30/plan-production-v31/A/workspace/drafts/rws-1b0a31ec-fd74-433b-8531-4a2ce7019535.json', 'utf8'));
const captured = draft.teachFramework.state.investigation.operations.findLast(o =>
  o.request.kind === 'spatial' && o.request.toolRequest.queryKind === 'mission_marker_control'
  && o.request.toolRequest.subjectUnitIds?.length && !o.request.toolRequest.argumentsJson);
assert(captured);
const source = JSON.parse(await fs.readFile(base + '/query-contract-audit-v30/native-movement-fixture.private.json', 'utf8')).state;
const sourceHash = hash(source);
const freeze = v => { if (v && typeof v === 'object' && !Object.isFrozen(v)) {
  Object.values(v).forEach(freeze); Object.freeze(v); } return v; };
const lab = createPregameSceneLaboratoryV1({ sourceState: source,
  armyBuilderPort: createOfficialArmyBuilderQueryPortV1({ unitCompositionUpgradeDataBundle: freeze(source.officialUnitCompositionUpgradeDataBundle) }),
  rulesRuntime: { descriptor: { runtimeHash: 'a'.repeat(64) },
    enumerate() { return { candidates: [], parameterDomains: [], searchSuggestions: [] }; },
    instantiate() { throw Error('No execution'); }, apply() { throw Error('No mutation'); } } });
const beforeRequest = JSON.stringify(captured.request);
const nativeArgs = { unitIds: captured.request.toolRequest.subjectUnitIds,
  markerIds: captured.request.toolRequest.targetIds };
const correctedRequest = { kind: 'spatial', toolRequest: { queryKind: 'mission_marker_control',
  seatKey: 'player1', argumentsJson: JSON.stringify(nativeArgs) } };
let repairs = 0, syntheses = 0;
const state = { framework: draft.teachFramework.state.framework,
  agenda: { coverage: [], questions: [{ questionId: 'captured-question', axisIds: ['post_loss_capability'],
    question: 'Query the named survivors and markers; preserve the original filters.',
    evidenceRequest: captured.request }] },
  investigation: { version: 1, rounds: [], operations: [], evidence: [], completed: true } };
const run = () => runRosterTeachFrameworkSessionV1({ sessionId: 'captured-native-query-recovery',
  plan: {}, context: {}, laboratory: lab, state, onCheckpoint: async () => {},
  deliberation: { async deliberate(request) {
    if (request.roundKind === 'teach_framework_query_recovery') {
      repairs++;
      const failed = request.promptNodes.find(n => n.kind === 'failed_query_to_correct');
      assert.equal(failed.result.unknownReasonCode, 'SCENE_QUERY_OUTER_ARGUMENTS_UNBOUND');
      assert.deepEqual(failed.request, captured.request);
      assert.equal(failed.result.queryRepair.correctable, true);
      return { output: { schemaVersion: 'starcraft_tmg_teach_framework_generation_v1',
        roundKind: request.roundKind, disposition: 'retry', kind: correctedRequest.kind,
        toolRequestJson: JSON.stringify(correctedRequest.toolRequest),
        publicReason: 'Bind the same named units and markers in the native argument container; this does not prove a hypothetical loss occurred.' } };
    }
    assert.equal(request.roundKind, 'teach_framework_synthesis'); syntheses++;
    const receipts = request.promptNodes.find(n => n.kind === 'actual_tool_results').evidence;
    const recovered = receipts.find(e => e.queryRecoveryOf === 'captured-question');
    return { output: { schemaVersion: 'starcraft_tmg_teach_framework_generation_v1', roundKind: request.roundKind,
      answers: [{ questionId: 'captured-question', disposition: 'unresolved',
        evidenceRefs: recovered ? [recovered.receiptHash] : [], publicReason: 'Filtered result is not proof of post-loss history.',
        tradeoff: 'Preserve context.', replanTrigger: 'Construct a legal hypothetical loss scene.', quantitativeEvidence: [] }],
      proposedPlanChanges: [], proposedRosterChanges: [], frameworkFeedback: [] } };
  } } });
await run();
assert.equal(repairs, 1, 'A correctable failure must invoke focused model repair before synthesis');
const recovered = state.queryRecovery.operations[0].result;
assert.equal(recovered.unknownReasonCode, null);
assert.equal(recovered.status, 'advisory');
assert.deepEqual(state.queryRecovery.operations[0].request, correctedRequest);
assert.equal(state.evidence[0].unknownReasonCode, 'SCENE_QUERY_OUTER_ARGUMENTS_UNBOUND');
assert.equal(state.synthesis.answers[0].disposition, 'unresolved', 'Query execution is not strategy proof');
await run();
assert.equal(repairs, 1, 'Completed paid correction must not repeat after resume');
assert.equal(syntheses, 1, 'Completed synthesis must not repeat');
assert.equal(JSON.stringify(captured.request), beforeRequest);
assert.equal(hash(source), sourceHash);
console.log(JSON.stringify({ status: 'PASS', realTeachAndNativePort: true,
  originalFailurePreserved: true, exactFiltersPreserved: true, resumeUsesSavedCorrection: true,
  providerCalls: 0, roomActions: 0, modelCorrectionProven: false, postLossStrategyProven: false }));
