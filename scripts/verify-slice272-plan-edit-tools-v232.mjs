// Reproduce the real workspace's text-only Plan revision interface, then check
// typed mutation, host-bound facts, partial staging and correction at that seam.
// Source draft is read-only; the only replacement is the model seam (no paid call).
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { createRosterPlanningWorkspaceServiceV1 } from '../packages/roster-planning-workspace/roster-planning-workspace-service-v1.mjs';
import { createRosterStrategistRuntimeV1 } from '../packages/roster-strategist/roster-strategist-runtime-v1.mjs';
import { createOfficialArmyBuilderQueryPortV1 } from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import { createPregameSceneLaboratoryV1 } from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
const [base, phase] = process.argv.slice(2);
assert.ok(base && ['red', 'green'].includes(phase));
const dest = base + '/common-v232-plan-edit-tools-' + phase + '.private.json';
await (await fs.open(dest, 'wx', 0o600)).close();
const report = { phase, ok: false, providerCalls: 0, nativeCalls: 0, originalWrites: 0 };
const cfg = JSON.parse(await fs.readFile(base + '/common-v79-plan-recovery-config.private.json', 'utf8'));
const row = cfg.rows.find(r => r.arm === 'B'), file = row.dataDirectory + '/drafts/' + row.sessionId + '.json';
const original = await fs.readFile(file, 'utf8'), source = JSON.parse(original);
const candidateText = await fs.readFile(base + '/B/kimi-code-revision-shadow-v224/candidate-plan.private.json', 'utf8');
const candidate = JSON.parse(candidateText);
source.planVersionHistory.push(source.planSerialized);
source.planSerialized = candidateText; source.status = 'planned'; source.failure = null;
const review = JSON.parse(await fs.readFile(base + '/B/kimi-code-candidate-review-v231/qualified-review.private.json', 'utf8'));
source.planReviewHistory.push(source.planReview);
source.planReview = { status: 'completed', planHash: candidate.planHash, review, failure: null };
const produced = JSON.parse(await fs.readFile(base + '/common-v224-B-kimi-shadow-progress.private.json', 'utf8'));
source.claimRepairHistory ||= [];
source.claimRepairHistory.push({ fromPlanHash: produced.sourcePlanHash, toPlanHash: candidate.planHash,
  coverage: produced.claimRepairCoverage });
const state = JSON.parse(await fs.readFile(base + '/query-contract-audit-v30/native-movement-fixture.private.json', 'utf8')).state;
const freeze = value => { if (value && typeof value === 'object' && !Object.isFrozen(value)) {
  Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
const builder = createOfficialArmyBuilderQueryPortV1({ unitCompositionUpgradeDataBundle: freeze(state.officialUnitCompositionUpgradeDataBundle) });
const noNative = () => { report.nativeCalls++; throw Error('NO_NATIVE_IN_PLAN_EDIT_GATE'); };
const laboratory = createPregameSceneLaboratoryV1({ sourceState: state, armyBuilderPort: builder,
  rulesRuntime: { descriptor: { runtimeHash: 'a'.repeat(64) }, enumerate: noNative, instantiate: noNative, apply: noNative } });
const strategyPack = { foundational: { entries: Array.from({ length: 5 }, () => ({})) }, receipt: { hash: 'b'.repeat(64) } };
const strategist = createRosterStrategistRuntimeV1({ armyBuilderPort: builder, laboratory, strategyPack,
  selectionUnitRules: source.teachFramework.context.sourceFacts.selectionUnitRules });
let saved = source, calls = 0, firstCommands, selectedFact, initialPaths;
const service = createRosterPlanningWorkspaceServiceV1({ armyBuilderPort: builder, laboratoryCore: laboratory,
  strategyPack, fixture: source.teachFramework.context.fixture,
  selectionUnitRules: source.teachFramework.context.sourceFacts.selectionUnitRules,
  draftStore: { loadAll: async () => ({ sessions: [source], quarantined: [] }), save: async value => { saved = value; } },
  createRunLaboratory: () => laboratory, createStrategist: () => strategist,
  deliberationFactory: { createForRun: async () => ({ descriptor: () => ({ kind: 'local_model_seam_only' }),
    deliberate: async request => {
      calls++;
      const port = request.promptNodes.find(n => n.nodeType === 'plan-edit-tools')?.content;
      assert.ok(port, 'ACTUAL_WORKSPACE_REVISION_HAS_NO_EXECUTABLE_STRUCTURED_PLAN_TOOL');
      assert.ok(port.tools.some(t => t.name === 'plan.fill_argument'));
      assert.ok(!request.responseFormat.schema.properties.repairs, 'no prose-replacement protocol on new tool request');
      if (calls === 1) {
        initialPaths = port.requestedClaimPaths;
        assert.deepEqual([...initialPaths].sort(), ['componentPurposes.u-marauder-1', 'publicSummaryText', 'scoreRoute.routeText']);
        selectedFact = port.facts.find(f => f.kind === 'number' && f.value === 20 && /costS/.test(f.sourcePath));
        assert.ok(selectedFact, 'existing Rules price must be bindable without model copying its value');
        firstCommands = initialPaths.map((claimPath, i) => ({ name: 'plan.fill_argument', arguments: {
          claimPath, intentText: '保留当前胜利目标', actionsText: '根据实际合法位置安排单位职责',
          reasonText: '选择依据引用的规则事实，不以当前军表已选定作为理由',
          alternativesText: '比较其它合法选项后按实际对手调整',
          conditionsText: '敌方部署或损失改变时重新评估；不宣称已经占点',
          factIds: [i === 0 ? 'unknown-model-invented-fact' : selectedFact.factId] } }));
        return { output: { schemaVersion: 'starcraft_tmg_roster_strategist_deliberation_v1',
          roundKind: 'revision', toolCalls: firstCommands, evidenceRequests: [] }, receipt: { paidProviderCall: false } };
      }
      assert.equal(calls, 2, 'one invalid binding should get one targeted correction');
      assert.equal(JSON.parse(saved.planSerialized).planHash, candidate.planHash, 'no partial Plan apply');
      const feedback = request.promptNodes.find(n => n.nodeType === 'plan-edit-tool-results')?.content;
      assert.ok(feedback?.results.some(r => r.isError && r.structuredContent.code === 'PLAN_EDIT_FACT_UNKNOWN'));
      assert.deepEqual(feedback.missingClaimPaths, [initialPaths[0]]);
      assert.equal(feedback.stagedClaimPaths.length, 2, 'valid staged calls retained, not regenerated');
      const corrected = structuredClone(firstCommands[0]); corrected.arguments.factIds = [selectedFact.factId];
      return { output: { schemaVersion: 'starcraft_tmg_roster_strategist_deliberation_v1',
        roundKind: 'revision', toolCalls: [corrected], evidenceRequests: [] }, receipt: { paidProviderCall: false } };
    } }) },
});
try {
  await service.loadPersisted();
  await service.revisePlan(source.sessionId, { reasonText: 'Test typed Plan edit tool against the actual text-only failure seam',
    sourceTeachPlanHash: source.teachFramework.planHash,
    revisedSectionKeys: ['scoreRoute', 'publicSummaryText', 'componentPurposes', 'deploymentConcept'],
    targetedClaimPaths: ['scoreRoute.routeText', 'publicSummaryText', 'componentPurposes.u-marauder-1'],
    planEditProtocol: 'structured_plan_tools_v1' });
  for (let i=0; i<600 && saved.status === 'running'; i++) await new Promise(r=>setTimeout(r,100));
  assert.equal(saved.status, 'planned', JSON.stringify(saved.failure));
  const result = JSON.parse(saved.planSerialized);
  assert.equal(calls, 2); assert.equal(result.planVersion, candidate.planVersion + 1);
  assert.deepEqual(result.rosterCandidate, candidate.rosterCandidate);
  assert.deepEqual(result.openingDeploymentSchedule, candidate.openingDeploymentSchedule);
  assert.deepEqual(result.scoreRoute.targetVpSchedule, candidate.scoreRoute.targetVpSchedule);
  const receipt = saved.planEditToolHistory.at(-1);
  assert.equal(receipt.fromPlanHash, candidate.planHash); assert.equal(receipt.toPlanHash, result.planHash);
  assert.equal(receipt.execution.applied, true); assert.equal(receipt.execution.semanticReviewStillRequired, true);
  assert.equal(receipt.execution.edits.length, 3);
  assert.ok(receipt.execution.edits.every(e => e.facts[0].value === selectedFact.value));
  assert.ok(result.publicSummaryText.includes('工具事实') && result.publicSummaryText.includes(selectedFact.sourcePath));
  const { createRosterPlanEditToolsV1 } = await import('../packages/roster-strategist/roster-plan-edit-tools-v1.mjs');
  const port = createRosterPlanEditToolsV1({ plan: candidate, paths: ['publicSummaryText'],
    factPacket: { premiseFacts: { numbers: [], texts: [] } } });
  const forged = port.callTool({ name: 'plan.fill_argument', arguments: {
    ...firstCommands[1].arguments, claimPath: 'publicSummaryText', factIds: [], receipt: { applied: true } } });
  assert.equal(forged.isError, true); assert.equal(port.snapshot().edits.length, 0);
  report.ok = true; report.localModelReplies = calls; report.editedPaths = initialPaths;
  report.hostBoundFact = selectedFact; report.atomicApply = true; report.invalidFactRecovered = true;
  report.forgedReceiptRejected = true;
} catch (error) { report.failure = String(error.message).slice(0,2000); process.exitCode = 1; }
report.originalDraftUnchanged = hash(await fs.readFile(file,'utf8')) === hash(original);
await fs.writeFile(dest,JSON.stringify(report,null,2),{mode:0o600});
console.log(JSON.stringify(report));
