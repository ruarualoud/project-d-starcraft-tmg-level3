// Real independent review of the completed Kimi candidate through the original
// workspace interface. Source draft/fees/Plan remain immutable; no room startup.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { gunzipSync } from 'node:zlib';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { createRosterPlanningWorkspaceServiceV1 } from '../packages/roster-planning-workspace/roster-planning-workspace-service-v1.mjs';
import { createKimiCodeShadowDeliberationV1 } from '../packages/roster-planning-workspace/kimi-code-shadow-deliberation-v1.mjs';
import { createRosterStrategistRuntimeV1 } from '../packages/roster-strategist/roster-strategist-runtime-v1.mjs';
import { createOfficialArmyBuilderQueryPortV1 } from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import { createPregameSceneLaboratoryV1 } from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import { normalizeProviderJsonDocumentV1 } from '../packages/secure-provider-runtime/provider-response-outcome-v1.mjs';
const [base, mode = 'initial'] = process.argv.slice(2);
if (!base) throw Error('EXPLICIT_BASE_REQUIRED');
assert.ok(['initial', 'resume-v227', 'qualify-v229'].includes(mode));
const resume = mode === 'resume-v227', qualification = mode === 'qualify-v229';
const version = qualification ? 'v231' : resume ? 'v229' : 'v227';
const dest = base + '/common-' + version + '-B-kimi-review-progress.private.json';
const directory = base + '/B/kimi-code-candidate-review-' + version;
await (await fs.open(dest, 'wx', 0o600)).close();
const report = { startedAt: new Date().toISOString(), pid: process.pid, status: 'preparing',
  originalWrites: 0, nativeCalls: 0, noGames: true, mode,
  expectedRootShards: qualification ? null : 3, maxCalls: resume ? 1 : 3,
  accountingLane: 'K3_temporary_shadow_review_separate_from_B', events: [] };
let queue = Promise.resolve();
const save = () => { report.updatedAt = new Date().toISOString(); const value = JSON.stringify(report, null, 2);
  const next = queue.then(async () => { await fs.writeFile(dest + '.tmp', value, { mode: 0o600 }); await fs.rename(dest + '.tmp', dest); });
  queue = next.catch(() => {}); return next; };
let adapter, filename, originalHash, saved, failedRequest;
try {
  const gate = JSON.parse(await fs.readFile(base + '/common-v226-historical-facts-green2.private.json', 'utf8'));
  assert.ok(gate.ok); assert.equal(gate.reviewRootShards, 3);
  const cfg = JSON.parse(await fs.readFile(base + '/common-v79-plan-recovery-config.private.json', 'utf8'));
  const row = cfg.rows.find(r => r.arm === 'B'); filename = row.dataDirectory + '/drafts/' + row.sessionId + '.json';
  const original = await fs.readFile(filename, 'utf8'); originalHash = hash(original);
  const source = JSON.parse(original), oldPlan = JSON.parse(source.planSerialized);
  const produced = JSON.parse(await fs.readFile(base + '/common-v224-B-kimi-shadow-progress.private.json', 'utf8'));
  const candidateText = await fs.readFile(base + '/B/kimi-code-revision-shadow-v224/candidate-plan.private.json', 'utf8');
  const candidate = JSON.parse(candidateText);
  assert.equal(oldPlan.planHash, produced.sourcePlanHash);
  assert.equal(candidate.planHash, produced.candidatePlanHash);
  assert.ok(produced.candidateSaved && produced.originalDraftUnchanged);
  const baselineUsage = structuredClone(source.usage), baselineDispatchHash = hash(source.providerDispatches);
  const baselineDispatchCount = source.providerDispatches.length;
  source.planVersionHistory.push(source.planSerialized);
  source.planSerialized = candidateText; source.status = 'planned'; source.failure = null;
  if (qualification) {
    const gate230 = JSON.parse(await fs.readFile(base + '/common-v230-qualification-plan-green.private.json', 'utf8'));
    assert.ok(gate230.ok && gate230.originalDraftUnchanged);
    const completed = JSON.parse(await fs.readFile(base + '/common-v229-B-kimi-review-progress.private.json', 'utf8'));
    assert.equal(completed.status, 'completed');
    const review = JSON.parse(await fs.readFile(base + '/B/kimi-code-candidate-review-v229/candidate-review.private.json', 'utf8'));
    assert.equal(review.planHash, candidate.planHash); assert.equal(review.reviewHash, gate230.parentReviewHash);
    source.planReviewHistory ||= []; source.planReviewHistory.push(structuredClone(source.planReview));
    source.planReview = { status: 'completed', planHash: candidate.planHash, review,
      reviewContextVersion: review.reviewContextVersion, failure: null };
    report.sourceReviewHash = review.reviewHash;
    report.sourceHighCount = review.findings.filter(f => f.severity === 'high').length;
    report.priorReviewUsage = { completedThirdBatch: completed.newUsage,
      firstTwoBatches: completed.recovery.oldSettledUsage, thirdBatchOldUnknownAttempts: 3 };
  }
  if (resume) {
    const priorDirectory = base + '/B/kimi-code-candidate-review-v227';
    const prior = JSON.parse(await fs.readFile(base + '/common-v227-B-kimi-review-progress.private.json', 'utf8'));
    assert.equal(prior.status, 'failed'); assert.ok(prior.finishedAt && prior.originalDraftUnchanged);
    assert.equal(prior.candidatePlanHash, candidate.planHash);
    assert.equal(prior.originalDraftHash, originalHash, 'resume must use unchanged original source');
    source.planReviewHistory ||= [];
    source.planReviewHistory.push(structuredClone(source.planReview));
    source.planReview = { status: 'failed', planHash: candidate.planHash, review: null,
      reviewContextVersion: source.planReview.review.reviewContextVersion,
      failure: { code: 'ROSTER_WORKSPACE_KIMI_TURN_FAILED', automaticRetry: false,
        detail: 'v227 third shard: saved provider.connection_error/APITimeoutError; first two retained' } };
    report.retainedReviewReceipts = [];
    for (const number of [1, 2]) {
      const prefix = priorDirectory + '/turn-0' + number;
      const request = JSON.parse(await fs.readFile(prefix + '.request.private.json', 'utf8'));
      const { receipt, validation } = JSON.parse(await fs.readFile(prefix + '.receipt.private.json', 'utf8'));
      const raw = await fs.readFile(prefix + '.response.private.txt', 'utf8');
      const output = JSON.parse(normalizeProviderJsonDocumentV1(raw).text);
      assert.ok(validation.ok); assert.equal(hash(output), receipt.outputHash);
      assert.equal(request.contextHash, receipt.contextHash);
      assert.equal(request.roundIndex, number);
      source.publicOutputs.push({ roundKind: request.roundKind, roundIndex: number,
        contextHash: request.contextHash, outputHash: receipt.outputHash,
        outputContractRef: receipt.outputContractRef, sanitizedOutput: output,
        retainedProviderReceipt: receipt, recoveredFrom: prefix });
      report.retainedReviewReceipts.push(receipt);
    }
    failedRequest = JSON.parse(await fs.readFile(priorDirectory + '/turn-03.request.private.json', 'utf8'));
    report.recovery = { priorVersion: 'v227', completedShardsRetained: [1, 2], newShardOnly: 3,
      oldSettledUsage: prior.newUsage, oldUnknownFeeAttempts: 3,
      explicitOfflineRecovery: true, hostAutomaticRetry: false, modelAndPromptUnchanged: true };
  }
  saved = source;
  Object.assign(report, { originalDraftHash: originalHash, sourcePlanHash: oldPlan.planHash,
    candidatePlanHash: candidate.planHash, candidatePlanVersion: candidate.planVersion,
    baselineUsage: { calls: baselineUsage.calls, totalUnits: baselineUsage.totalUnits },
    priorKimiCompletionTokens: produced.newUsage.units, priorInterruptedCharges: 'unknown_retained' });
  await save();
  const state = JSON.parse(await fs.readFile(base + '/query-contract-audit-v30/native-movement-fixture.private.json', 'utf8')).state;
  const freeze = value => { if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
  const builder = createOfficialArmyBuilderQueryPortV1({ unitCompositionUpgradeDataBundle: freeze(state.officialUnitCompositionUpgradeDataBundle) });
  const noNative = () => { report.nativeCalls++; throw Error('SHADOW_REVIEW_MUST_NOT_EXECUTE_NATIVE'); };
  const laboratory = createPregameSceneLaboratoryV1({ sourceState: state, armyBuilderPort: builder,
    rulesRuntime: { descriptor: { runtimeHash: 'a'.repeat(64) }, enumerate: noNative, instantiate: noNative, apply: noNative } });
  const strategyPack = { foundational: { entries: Array.from({ length: 5 }, () => ({})) }, receipt: { hash: 'b'.repeat(64) } };
  const strategist = createRosterStrategistRuntimeV1({ armyBuilderPort: builder, laboratory, strategyPack,
    selectionUnitRules: source.teachFramework.context.sourceFacts.selectionUnitRules });
  const body = JSON.parse(gunzipSync(await fs.readFile(base + '/common-v218-B-captured-request.private.json.gz')));
  adapter = await createKimiCodeShadowDeliberationV1({ directory, instructions: body.instructions, maxCalls: report.maxCalls,
    onProgress: async event => { report.status = event.type; report.events.push(event); await save(); } });
  const service = createRosterPlanningWorkspaceServiceV1({ armyBuilderPort: builder, laboratoryCore: laboratory,
    strategyPack, fixture: source.teachFramework.context.fixture,
    selectionUnitRules: source.teachFramework.context.sourceFacts.selectionUnitRules,
    draftStore: { loadAll: async () => ({ sessions: [source], quarantined: [] }), save: async value => {
      saved = value;
      // Small, durable continuation payload, not another 70-MB source clone.
      await fs.writeFile(directory + '/workspace-review-checkpoint.private.json', JSON.stringify({
        originalDraftHash: originalHash, candidatePlanHash: candidate.planHash,
        planReview: value.planReview,
        reviewReconciliation: value.reviewReconciliation,
        publicOutputs: value.publicOutputs.filter(o =>
          (qualification ? ['final_review_reconciliation', 'final_review_reconciliation_consistency'].includes(o.roundKind)
            : o.roundKind === 'final_plan_review')
          && (o.contextHash === failedRequest?.contextHash || report.retainedReviewReceipts?.some(r => r.contextHash === o.contextHash)
            || !resume && report.events.some(e => e.contextHash === o.contextHash))),
        newProviderDispatches: value.providerDispatches.slice(baselineDispatchCount),
        usage: value.usage, originalSourceReadOnly: true, trainingTruth: false,
      }), { mode: 0o600 });
    } },
    createRunLaboratory: () => laboratory, createStrategist: () => strategist,
    deliberationFactory: { availability: adapter.factory.availability, createForRun: async config => {
      const port = await adapter.factory.createForRun(config);
      return { descriptor: port.descriptor, deliberate: async request => {
        if (qualification) {
          assert.ok(['final_review_reconciliation', 'final_review_reconciliation_consistency'].includes(request.roundKind));
          report.activeQualification = { roundIndex: request.roundIndex, contextHash: request.contextHash,
            targets: request.promptNodes.find(n => n.kind === 'literal-claims-to-qualify')?.targets.map(t => t.findingIndex),
            inputNodeBytes: request.promptNodes.map(n => ({ kind: n.kind, bytes: Buffer.byteLength(JSON.stringify(n)) })) };
          await save(); return port.deliberate(request);
        }
        assert.equal(request.roundKind, 'final_plan_review');
        if (resume) {
          // Existing workspace replay MUST handle shards1/2 without this port.
          assert.equal(request.roundIndex, 3, 'never resend a completed shard');
          assert.deepEqual(request, failedRequest, 'exact failed request only, no hidden prompt change');
        }
        const boundary = request.promptNodes.find(n => n.kind === 'review-boundary');
        assert.equal(boundary.shardCount, 3, 'no automatic expansion to unrelated review');
        report.activeShard = { index: boundary.shardIndex, count: boundary.shardCount,
          paths: boundary.targetClaimPaths, contextHash: request.contextHash };
        await save(); return port.deliberate(request);
      } };
    } },
  });
  await service.loadPersisted();
  if (qualification) await service.reconcileReviewFindings(source.sessionId);
  else {
    await service.reviewFinalPlan(source.sessionId, { scope: 'changed_claims', baselinePlanHash: oldPlan.planHash });
    while (saved.planReview.status === 'running') await new Promise(r => setTimeout(r, 1000));
  }
  const review = saved.planReview.review;
  Object.assign(report, { status: qualification ? saved.reviewReconciliation.status : saved.planReview.status,
    failure: qualification ? saved.reviewReconciliation.failure : saved.planReview.failure,
    newUsage: { calls: saved.usage.calls - baselineUsage.calls, units: saved.usage.totalUnits - baselineUsage.totalUnits,
      scope: 'settled_only_missing_usage_is_not_free' },
    originalPlanStillCandidate: true, candidateUnchanged: saved.planSerialized === candidateText,
    oldDispatchesUnchangedInShadow: hash(saved.providerDispatches.slice(0, baselineDispatchCount)) === baselineDispatchHash });
  if (resume) report.retainedRoundsReplayed = saved.progress.rounds.filter(r =>
    r.roundKind === 'final_plan_review' && r.status === 'replayed').map(r => r.roundIndex);
  if (review) {
    await fs.writeFile(directory + (qualification ? '/qualified-review.private.json' : '/candidate-review.private.json'),
      JSON.stringify(review), { flag: 'wx', mode: 0o600 });
    report.reviewHash = review.reviewHash; report.incrementalReview = review.incrementalReview;
    report.findings = review.findings.reduce((counts, f) => { counts[f.severity] = (counts[f.severity] || 0) + 1; return counts; }, {});
    report.reviewIsAdvisoryNotAutomaticPromotion = true;
    if (qualification) report.qualification = { status: saved.reviewReconciliation.status,
      freshCallsUsed: saved.reviewReconciliation.freshCallsUsed,
      unresolved: review.reviewAdjudication?.reconciliation?.unresolvedJudgments?.length ?? null,
      judgments: review.reviewAdjudication?.reconciliation?.judgments?.map(j => ({
        findingIndex: j.findingIndex, claimAssessment: j.claimAssessment })) || [] };
  }
} catch (error) { report.status = 'stopped'; report.failure = String(error.stack || error.message).slice(0, 1800); process.exitCode = 1; }
finally {
  if (adapter) { report.adapter = adapter.metadata(); await adapter.close(); }
  if (saved?.usage && report.baselineUsage) report.newUsage = {
    calls: saved.usage.calls - report.baselineUsage.calls,
    units: saved.usage.totalUnits - report.baselineUsage.totalUnits,
    scope: 'settled_only_missing_usage_is_not_free' };
  if (qualification && saved?.reviewReconciliation) report.reconciliationStatus = saved.reviewReconciliation.status;
  if (filename && originalHash) report.originalDraftUnchanged = hash(await fs.readFile(filename, 'utf8')) === originalHash;
  report.finishedAt = new Date().toISOString(); await save();
}
console.log(JSON.stringify({ status: report.status, failure: report.failure, findings: report.findings, usage: report.newUsage }));
