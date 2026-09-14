#!/usr/bin/env node

import assert from 'node:assert/strict';
import { hash, seal } from '../packages/skill-production/common.mjs';
import { FACTION_AMBIGUOUS_REPLACEMENT_BINDING_V1 as authorizationBinding }
  from '../packages/skill-production-v3/faction-ambiguous-replacement-v1.mjs';
import { createFactionNativeReviewInvocationIdentityV1,
  prepareFactionNativeReviewAmbiguousReplacementV1,
  verifyFactionNativeReviewAmbiguousReplacementV1 }
  from '../packages/skill-production-v3/faction-native-review-ambiguous-replacement-v1.mjs';

await Promise.all([
  import('../packages/skill-production-v3/faction-structured-review-runtime-v1.mjs'),
  import('../packages/skill-production-v3/faction-review-source-expansion-scope-v1.mjs'),
  import('../packages/skill-production-v3/faction-review-slot-namespace-v1.mjs'),
  import('../packages/skill-evaluation/faction-structured-replay-v1.mjs'),
  import('../packages/skill-evaluation/faction-production-replay-v1.mjs'),
]);

const roleRef = { id: 'faction.zerg_swarm.card_packages.1.review-target-batch-v1.adversarial.0.2.source-evidence-v1.fixture',
  version: 'structured-review-v1', hash: hash('fixture-role') };
const outputContractRef = { id: 'starcraft-tmg.faction-target-review', version: '2026.09.09.6', hash: hash('contract') };
const capsule = seal({ version: 'starcraft_tmg_context_capsule_v1', roleRef,
  outputContractRef, instructions: 'complete frozen review context',
  compiledInput: '{"complete":true}', trainingTruth: false });
const executionPolicyRef = { id: 'policy.faction-target-review.production',
  version: '2026.09.06.1', hash: hash({ maxOutputUnits: 4096 }) };
const originalCapability = { receiptHash: hash('original-capability'),
  outputContractRef, capability: 'responses_json_schema' };
const replacementCapability = { receiptHash: hash('replacement-capability'),
  outputContractRef, capability: 'responses_json_schema' };
const original = createFactionNativeReviewInvocationIdentityV1({ capsule,
  roleRef, outputContractRef, executionPolicyRef,
  capabilityReceiptHash: originalCapability.receiptHash,
  maxOutputUnits: 4096 });
const ownerRecipe = seal({ version: 'faction_strategy_production_v1', inputHashes: [hash('input')] });
const receiptBody = { schemaVersion: 'starcraft_tmg_deepseek_responses_json_schema_adapter_v1.failure',
  code: 'STRUCTURED_PROVIDER_AMBIGUOUS_SEND', requestDefinitelyNotSent: false,
  requestMayHaveBeenSent: true, status: null, physicalAttempts: 1,
  outputContractRef, capabilityReceiptHash: originalCapability.receiptHash,
  usageKnown: false, usage: null, automaticRetries: 0 };
const failureReceipt = { ...receiptBody, receiptHash: hash(receiptBody) };
const issue = seal({ version: 'starcraft_tmg_structured_generation_runtime_v1.issue',
  invocationHash: original.invocationHash, outputContractRef,
  class: 'ambiguous_egress', code: receiptBody.code,
  safeReceiptHash: failureReceipt.receiptHash, rejectedCandidateRef: null,
  trainingTruth: false });
const attempt = { run: `faction-v1-${ownerRecipe.hash.slice(0, 20)}`,
  id: original.attemptId, request_hash: original.requestHash, state: 'failed',
  code: receiptBody.code, response: JSON.stringify({ value: failureReceipt }),
  usage: null, reserve: 800000, settled: null, token_reserve: 500000 };
const runtimeReceipt = seal({ version: 'starcraft_tmg_structured_generation_runtime_v1.receipt',
  invocationHash: original.invocationHash, attemptId: attempt.id,
  outputContractRef, status: 'stopped', candidateHash: null,
  issueHash: issue.hash, providerAttempts: 1, automaticRetries: 0,
  trainingTruth: false });
const originalEvidence = { attempt, failureReceipt, issue, runtimeReceipt,
  ownerRecipe, capability: originalCapability };
const args = { authorizationBinding, capsule, roleRef, outputContractRef,
  executionPolicyRef, maxOutputUnits: 4096, originalEvidence,
  replacementCapability };
const record = prepareFactionNativeReviewAmbiguousReplacementV1(args);
assert.notEqual(record.replacementAttemptId, attempt.id);
assert.notEqual(record.replacementRequestHash, attempt.request_hash);
assert.equal(record.replacementCallsPermitted, 1);
assert.equal(record.grant.originalReserveMicros, 800000);
assert.equal(verifyFactionNativeReviewAmbiguousReplacementV1({ ...args, record }).hash,
  record.hash);
assert.throws(() => prepareFactionNativeReviewAmbiguousReplacementV1({ ...args,
  originalEvidence: { ...originalEvidence, attempt: { ...attempt, state: 'received' } } }));

console.log(JSON.stringify({ ticket: 18, slice: 174, passed: true,
  distinctContinuationRequest: true, originalUnknownReserveRetained: true,
  maximumReplacementAttempts: 1, providerCalls: 0 }));
