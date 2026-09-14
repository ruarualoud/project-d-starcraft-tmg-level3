import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { fail, hash, seal } from '../packages/skill-production/common.mjs';
import { inspectGeneralFinalizationContinuationV1,
  withGeneralFinalizationContinuationV1 } from '../packages/strategy-skills/general-finalization-continuation-v1.mjs';

const temp = await mkdtemp(path.join(tmpdir(), 'general-final-continuation-'));
const filename = path.join(temp, 'production.sqlite');
const parentRecipe = seal({ schema: 'ticket18_general_strategy_finalization_recipe_v1', fixture: true });
const parentRunId = 'general-final-' + parentRecipe.hash.slice(0, 20);
const parent = openProductionStore(filename, { runId: parentRunId, recipeHash: parentRecipe.hash,
  maxCalls: 45, maxTokens: 18_000_000, maxCostMicros: 12_000_000 });
for (let index = 0; index < 12; index++) {
  const preparedHash = hash({ index });
  const body = { preparedHash, payloadHash: hash(['payload', index]), contractHash: hash('contract'),
    executionPolicyHash: hash('execution'), capabilityReceiptHash: hash('capability') };
  const id = 'evidence-review.' + preparedHash.slice(0, 48);
  const lease = parent.acquire(id, body);
  parent.finish(lease, seal({ schema: 'strategy_evidence_review_artifact_v1', ...body,
    evidence: seal({ schema: 'fixture_evidence_v1', index }), runtimeAccepted: false, trainingTruth: false }));
}
const failedPreparedHash = hash('failed-prepared');
const failedBody = { preparedHash: failedPreparedHash, payloadHash: hash('failed-payload'),
  contractHash: hash('contract'), executionPolicyHash: hash('execution'), capabilityReceiptHash: hash('capability') };
const failedReviewId = 'evidence-review.' + failedPreparedHash.slice(0, 48);
parent.finish(parent.acquire(failedReviewId, failedBody), seal({ schema: 'strategy_evidence_review_quarantine_v1',
  ...failedBody, status: 'quarantined', code: 'STRUCTURED_PROVIDER_AMBIGUOUS_SEND', trainingTruth: false }));
const failedAttemptId = 'structured-' + hash('failed-attempt').slice(0, 48);
parent.reserve(failedAttemptId, { request: true }, 1_500_000, 500_000);
parent.settle(failedAttemptId, { code: 'STRUCTURED_PROVIDER_AMBIGUOUS_SEND', failureReceipt: seal({
  schemaVersion: 'starcraft_tmg_deepseek_responses_json_schema_adapter_v1.failure',
  code: 'STRUCTURED_PROVIDER_AMBIGUOUS_SEND', requestDefinitelyNotSent: false,
  requestMayHaveBeenSent: true, physicalAttempts: 1, automaticRetries: 0, usageKnown: false,
  rawPayloadPersisted: false, trainingTruth: false }) });
const parentSummary = parent.summary(); parent.close();
const parentReport = seal({ schema: 'ticket18_general_strategy_finalization_report_v1', runId: parentRunId,
  recipeHash: parentRecipe.hash, failure: { code: 'STRUCTURED_PROVIDER_AMBIGUOUS_SEND' },
  sourceAxesAccepted: ['objective_plan', 'activation_tempo', 'movement_position', 'threat_trade'],
  sourceFieldsAccepted: 44, formalGeneralSkillCompleted: false, ledger: parentSummary,
  runtimeAccepted: false, trainingTruth: false });

const continuation = inspectGeneralFinalizationContinuationV1({ filename, parentRunId,
  parentRecipe, parentReport, expectedInheritedReviews: 12 });
assert.equal(continuation.manifest.inheritedReviews, 12);
assert.equal(continuation.manifest.ambiguousAttemptId, failedAttemptId);
assert.equal(continuation.manifest.ambiguousAttemptChargedAtFullReservation, true);
assert.equal(continuation.inheritedSteps.has(failedReviewId), false);

const childRecipe = seal({ schema: 'fixture_child_recipe_v1', parentHash: parentRecipe.hash });
const child = openProductionStore(filename, { runId: 'general-final-resume-' + childRecipe.hash.slice(0, 20),
  recipeHash: childRecipe.hash, maxCalls: 32, maxTokens: 12_000_000, maxCostMicros: 8_000_000 });
const wrapped = withGeneralFinalizationContinuationV1(child, continuation);
const inherited = continuation.manifest.steps[0];
const cached = wrapped.acquire(inherited.id, continuation.inheritedSteps.get(inherited.id).input);
assert.equal(cached.cached, true);
assert.equal(cached.artifact.hash, inherited.artifactHash);
assert.equal(child.summary().calls, 0);
assert.equal(wrapped.evidence().usedInheritedReviews, 1);
const fresh = wrapped.acquire(failedReviewId, failedBody);
assert.equal(fresh.cached, false);
child.release(fresh);
assert.throws(() => wrapped.acquire(inherited.id, { drift: true }), error => error.code === 'GENERAL_FINALIZATION_INHERITED_INPUT_DRIFT');
child.close();

assert.throws(() => inspectGeneralFinalizationContinuationV1({ filename, parentRunId,
  parentRecipe, parentReport: seal({ ...Object.fromEntries(Object.entries(parentReport).filter(([key]) => key !== 'hash')),
    failure: null }), expectedInheritedReviews: 12 }), error => error.code === 'GENERAL_FINALIZATION_CONTINUATION_PARENT_INVALID');

await rm(temp, { recursive: true, force: true });
console.log(JSON.stringify({ passed: true, inheritedReviews: 12, ambiguousRetries: 0,
  quarantinedReviewsInherited: 0, providerCalls: 0 }));
