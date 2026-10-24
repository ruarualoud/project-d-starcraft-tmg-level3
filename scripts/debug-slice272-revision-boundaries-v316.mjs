// Controlled single-step product consumers, not a live generation or game.
// Frozen A source, real strategist/tools/store; only Provider answers scripted.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { gunzipSync } from 'node:zlib';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { createRosterStrategistRuntimeV1 } from '../packages/roster-strategist/roster-strategist-runtime-v1.mjs';
import { createOfficialArmyBuilderQueryPortV1 } from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import { createPregameSceneLaboratoryV1 } from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import { createRosterPlanningWorkspaceServiceV1 } from '../packages/roster-planning-workspace/roster-planning-workspace-service-v1.mjs';
import { createRosterPlanningDraftStoreV1 } from '../packages/roster-planning-workspace/roster-planning-draft-store-v1.mjs';

const [baseArg, mode] = process.argv.slice(2);
assert(['mixed_read_write', 'mixed_after_staging', 'evidence_navigation', 'review_consumer'].includes(mode));
const base = path.resolve(baseArg);
const output = await fs.mkdtemp(path.join(base, 'revision-boundary-v316-'));
const sessionId = 'rws-5c8ed89c-06a0-4c29-910d-f33d17421516';
const sourceFile = path.join(base, `A/fresh-generation-v264/workspace/drafts/${sessionId}.json`);
const before = await fs.stat(sourceFile);
const source = JSON.parse(await fs.readFile(sourceFile, 'utf8'));
const plan = JSON.parse(source.planSerialized);
const fixture = source.teachFramework.context.fixture;
let state;
for (const name of await fs.readdir(path.join(base, 'A/fresh-generation-v264/workspace/laboratory-sources'))) {
  const record = JSON.parse(gunzipSync(await fs.readFile(path.join(base, 'A/fresh-generation-v264/workspace/laboratory-sources', name))));
  if (hash(record.authority.state) === fixture.laboratorySourceStateHash) state = record.authority.state;
}
assert(state, 'Actual frozen map/source required');
const freeze = value => { if (value && typeof value === 'object' && !Object.isFrozen(value)) {
  Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
const builder = createOfficialArmyBuilderQueryPortV1({
  unitCompositionUpgradeDataBundle: freeze(state.officialUnitCompositionUpgradeDataBundle) });
const calls = { modelSeam: 0, native: 0 };
const denyNative = () => { calls.native++; throw Error('NO_NATIVE_EXECUTION_IN_BOUNDARY_DEBUG'); };
const laboratory = createPregameSceneLaboratoryV1({ sourceState: state, armyBuilderPort: builder,
  rulesRuntime: { descriptor: { runtimeHash: hash('controlled-no-native') },
    enumerate: denyNative, instantiate: denyNative, apply: denyNative } });
const selectionUnitRules = source.teachFramework.context.sourceFacts.selectionUnitRules;
const pack = { foundational: { entries: Array.from({ length: 5 }, () => ({})) }, receipt: { hash: hash('no-skill-generation') } };
const strategist = createRosterStrategistRuntimeV1({ armyBuilderPort: builder, laboratory,
  strategyPack: pack, selectionUnitRules });
const boundaries = [];
const paths = ['publicSummaryText', 'scoreRoute.routeText'];
const commands = () => paths.map((claimPath, index) => ({ name: 'plan.fill_argument', arguments: {
  claimPath, intentText: `DEBUG objective ${index}: reassess a contested marker.`,
  actionsText: 'Compare current legal control and engagement options with the unchanged roster.',
  reasonText: 'This controlled content checks delivery and mutation isolation, not strategy superiority.',
  alternativesText: 'Compare contesting the marker with engaging the opposing unit in the same scene.',
  conditionsText: 'Re-query Rules when current Supply, arrival or route changes.', factIds: [] } }));
const report = { mode, pass: false, output, providerCalls: 0, roomWrites: 0,
  strategyImprovementProved: false, finalAdmission: false, harnessLoopUsed: true,
  targetGames: ['starcraft_tmg'], trainingTraceCandidates: [], uiTraceEvidence: null };
try {
  if (mode === 'review_consumer') {
    // Consume the already-passed v315 saved result. Do NOT rerun its edit test.
    const saved = JSON.parse(await fs.readFile(path.join(base,
      `formal-plan-debug-v315-aVajaQ/drafts/${sessionId}.json`), 'utf8'));
    const next = JSON.parse(saved.planSerialized);
    assert.equal(next.planVersion, plan.planVersion + 1);
    const store = createRosterPlanningDraftStoreV1({ directory: output });
    await store.save(saved, { compact: true, includeRecordHash: false });
    const service = createRosterPlanningWorkspaceServiceV1({
      armyBuilderPort: builder, laboratoryCore: laboratory, strategyPack: pack, fixture, selectionUnitRules,
      draftStore: store, createRunLaboratory: () => laboratory, createStrategist: () => strategist,
      deliberationFactory: { async createForRun(input) {
        assert.equal(input.runKind, 'final-plan-review');
        assert.equal(input.planHash, next.planHash);
        boundaries.push({ at: 'review-factory-input', planHash: input.planHash });
        return { descriptor: () => ({ kind: 'controlled_model_seam', modelVersion: 'debug-v316' }), async deliberate(request) {
          calls.modelSeam++;
          assert.equal(request.roundKind, 'final_plan_review');
          const claims = request.promptNodes.filter(n => n.kind === 'frozen-plan-claims'
            || n.kind === 'frozen-plan-cross-claim-index').flatMap(n => n.sources);
          const summary = claims.find(c => c.path === 'publicSummaryText');
          assert(summary && Object.values(summary).includes(next.publicSummaryText),
            'Reviewer must actually receive the newly committed public strategy');
          assert(!Object.values(summary).includes(plan.publicSummaryText), 'Old public strategy must not replace new one');
          boundaries.push({ at: 'reviewer-model-input', planHash: next.planHash,
            summary, changedPublicStrategyReceived: true });
          throw Object.assign(Error('CONTROLLED_STOP_AFTER_REVIEW_INPUT'), { code: 'CONTROLLED_STOP_AFTER_REVIEW_INPUT' });
        } };
      } } });
    await service.loadPersisted(); await service.reviewFinalPlan(sessionId);
    for (let count = 0; count < 2000 && service.readSession(sessionId).planReview.status === 'running'; count++) {
      await new Promise(resolve => setTimeout(resolve, 5));
    }
    assert.equal(service.readSession(sessionId).planReview.failure.code, 'CONTROLLED_STOP_AFTER_REVIEW_INPUT');
    assert.equal(calls.modelSeam, 1);
    const disk = await store.load(sessionId);
    assert.equal(JSON.parse(disk.planSerialized).planHash, next.planHash);
    assert.equal(disk.planReview.planHash, next.planHash);
    report.reviewAcceptanceClaimed = false;
  } else {
    // Retain actual fields and one original receipt for this precise read-path
    // fixture. This is NOT a production Teach migration or completeness claim.
    const originalTeach = source.teachFramework.state;
    const evidence = originalTeach.evidence.find(row => row.sourceReceipt);
    assert(evidence);
    const teach = Object.fromEntries(['sourceHash', 'framework', 'agenda', 'synthesis', 'coverage',
      'evidenceBindingVersion', 'phase', 'authority', 'applicationStatus']
      .filter(key => Object.hasOwn(originalTeach, key)).map(key => [key, structuredClone(originalTeach[key])]));
    teach.evidence = [structuredClone(evidence)];
    const read = { receiptHash: evidence.receiptHash, path: 'sourceReceipt.resultStatus' };
    const invalidRead = { ...read, path: 'sourceReceipt.nonexistentField' };
    const originalHash = hash(plan);
    const result = await strategist.reviseRosterPlan({
      plan, baselinePlan: source.lockedRoster.baselinePlan,
      armyAudit: source.lockedRoster.lock.verdict.audit,
      missionProfile: laboratory.missionScoringAuthority().missionScoringProfile, toolReceipts: source.toolReceipts,
      reasonText: 'Controlled read/write boundary test; retain current strategy and immutable army.',
      revisionPurpose: 'user_requested_claim_revision_v1', revisedSectionKeys: ['publicSummaryText', 'scoreRoute'],
      targetedClaimPaths: paths, planEditProtocol: 'structured_plan_tools_v2',
      teachFrameworkExperience: teach,
    }, { deliberation: { descriptor: () => ({ kind: 'controlled_model_seam', modelVersion: 'debug-v316' }), async deliberate(input) {
      calls.modelSeam++;
      assert.equal(input.roundKind, 'revision');
      assert.equal(hash(plan), originalHash, 'No partially applied Plan while reading or correcting');
      for (const node of input.promptNodes) {
        assert.equal(node.nodeHash, hash({ nodeType: node.nodeType, authority: node.authority, content: node.content }),
          'Snapshot isolation must not change prompt contents or their content identity');
        assert(Object.isFrozen(node.content), 'Delivered prompt values remain read-only');
      }
      const node = type => input.promptNodes.find(n => n.nodeType === type)?.content;
      const staged = node('plan-edit-tool-results');
      const reads = node('revision-retained-evidence');
      const feedback = node('revision-completed-reply-feedback');
      boundaries.push({ at: 'model-input', turn: calls.modelSeam, staged, reads, feedback });
      let toolCalls = [], evidenceRequests = [];
      if (mode === 'evidence_navigation') {
        if (calls.modelSeam === 1) evidenceRequests = [invalidRead];
        else if (calls.modelSeam === 2) {
          const failed = reads.results.find(r => r.request.path === invalidRead.path);
          assert.equal(failed.status, 'unknown'); assert.equal(failed.originalQueryNotAnswered, true);
          assert(failed.queryRepair?.correctable, 'Source-owned field/path repair must reach the next model input');
          assert(failed.queryRepair.navigation.some(n => n.childPaths.includes(read.path)),
            'Exact available sibling paths must survive the delivery adapter');
          evidenceRequests = [read];
        } else { assert.equal(calls.modelSeam, 3); toolCalls = commands(); }
      } else if (mode === 'mixed_after_staging' && calls.modelSeam === 1) {
        toolCalls = commands(); toolCalls[1].arguments.factIds = ['invented-fact'];
      } else {
        const mixedTurn = mode === 'mixed_after_staging' ? 2 : 1;
        if (calls.modelSeam === mixedTurn) {
          if (staged) assert.deepEqual(staged.stagedClaimPaths, [paths[0]]);
          evidenceRequests = [read]; toolCalls = [commands()[mode === 'mixed_after_staging' ? 1 : 0]];
        } else {
          assert.equal(calls.modelSeam, mixedTurn + 1);
          assert.equal(feedback?.code, 'PLAN_EDIT_READ_WRITE_MIXED');
          assert.equal(feedback.applied, false);
          assert.equal(feedback.deferredToolCalls.length, 1);
          if (mode === 'mixed_after_staging') {
            assert.deepEqual(staged.stagedClaimPaths, [paths[0]]);
            assert.deepEqual(staged.missingClaimPaths, [paths[1]]);
            toolCalls = [commands()[1]];
          } else { assert(!staged?.stagedClaimPaths.length); toolCalls = commands(); }
        }
      }
      if (toolCalls.length && !evidenceRequests.length && calls.modelSeam > 1) {
        const resolved = reads.results.find(r => r.request.path === read.path);
        assert.equal(resolved.status, 'read');
        assert.equal(resolved.result.value, evidence.sourceReceipt.resultStatus);
      }
      const answer = { schemaVersion: 'starcraft_tmg_roster_strategist_deliberation_v1',
        roundKind: 'revision', evidenceRequests, toolCalls };
      boundaries.push({ at: 'scripted-provider-output', turn: calls.modelSeam, output: answer });
      return { output: answer, receipt: { paidProviderCall: false } };
    } } });
    assert.equal(result.plan.planVersion, plan.planVersion + 1);
    assert.deepEqual(result.plan.rosterCandidate, plan.rosterCandidate);
    assert.deepEqual(result.plan.openingDeploymentSchedule, plan.openingDeploymentSchedule);
    assert(result.plan.publicSummaryText.includes(commands()[0].arguments.actionsText));
    assert(result.plan.scoreRoute.routeText.includes(commands()[1].arguments.conditionsText));
    assert.equal(hash(plan), originalHash);
    assert.equal(result.claimRepairCoverage.semanticReviewStillRequired, true);
    boundaries.push({ at: 'builder-result', planHash: result.plan.planHash,
      typedEditExecution: result.planEditToolExecution,
      readResults: result.teachEvidenceDelivery.lookupResults,
      semanticReviewStillRequired: true });
  }
  assert.equal(calls.native, 0);
  report.pass = true;
} catch (error) { report.error = error.message; report.code = error.code || null; }
assert.equal((await fs.stat(sourceFile)).mtimeMs, before.mtimeMs, 'Production session remains untouched');
report.calls = calls; report.boundaries = boundaries;
await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ...report, boundaries: report.boundaries.map(b => ({ at: b.at, turn: b.turn })) }));
process.exitCode = report.pass ? 0 : 1;
