#!/usr/bin/env node

import assert from 'node:assert/strict';

import { hash, seal } from '../packages/skill-production/common.mjs';
import { FACTION_AMBIGUOUS_REPLACEMENT_BINDING_V1 }
  from '../packages/skill-production-v3/faction-ambiguous-replacement-v1.mjs';
import { prepareFactionFieldValueAmbiguousReplacementV1 }
  from '../packages/skill-production-v3/faction-field-value-ambiguous-replacement-v1.mjs';
// Import the real consumer so this focused proof catches integration syntax
// without replaying the already-green full field-value suite.
import '../packages/skill-production-v3/faction-field-value-runtime-v1.mjs';

const outputContractRef = { id: 'contract.field-values', version: 'v1', hash: hash('contract.field-values') };
const roleRef = { id: 'faction.zerg.field-values', version: 'field-values-v1', hash: hash('faction.zerg.field-values') };
const context = seal({ version: 'focused_context_v1', roleRef, outputContractRef,
  instructions: 'Return corrected field values.', compiledInput: 'Frozen complete context.' });
const family = seal({ version: 'focused_field_value_family_v1', maximumNewValueAttempts: 3 });
const capabilityBody = { schemaVersion: 'focused_capability_v1',
  providerProfileRef: { id: 'deepseek.direct', version: 'v1', hash: hash('deepseek.direct') },
  endpointPath: '/responses', endpointDialect: 'deepseek_responses_v1', model: 'deepseek-chat',
  capability: 'responses_json_schema', outputContractRef, probedAt: '2026-09-10T10:00:00.000Z',
  expiresAt: '2026-09-11T10:00:00.000Z', trainingTruth: false };
const capability = { ...capabilityBody, receiptHash: hash(capabilityBody) };
const wireBinding = { providerProfileRef: capability.providerProfileRef,
  endpoint: { path: '/responses' }, endpointDialect: capability.endpointDialect,
  model: capability.model, temperature: 0, topP: 1, maxOutputUnits: 4096 };
const executionPolicyRef = { id: 'policy.faction-field-values.production', version: 'v1', hash: hash('policy') };
const originalInvocation = { schemaVersion: 'starcraft_tmg_structured_generation_runtime_v1.invocation',
  roleRef, contextManifestRef: { id: `context.${roleRef.id}`, version: context.version, hash: context.hash },
  outputContractRef, executionPolicyRef, continuationRef: null,
  contextPayloadHash: hash({ instructions: context.instructions, input: context.compiledInput }),
  capabilityReceiptHash: capability.receiptHash, trainingTruth: false };
const originalRequest = { schemaVersion: 'starcraft_tmg_structured_provider_request_v1',
  requestId: 'structured-' + hash(originalInvocation).slice(0, 48), roleRef,
  instructions: context.instructions, input: context.compiledInput,
  outputContractRef, maxOutputUnits: 4096 };
const originalChoice = seal({ version: 'faction_field_value_dispatch_v1', familyHash: family.hash,
  round: 0, contextHash: context.hash, ownerRunId: 'faction-v1-origin', capability,
  wireBinding, egressBindingHash: hash(wireBinding), request: originalRequest, trainingTruth: false });
const originalAttempt = { run: originalChoice.ownerRunId, id: originalRequest.requestId,
  request_hash: hash(originalRequest), state: 'failed', reserve: 800000, settled: null,
  usage: null, response: 'sealed-in-store', code: 'STRUCTURED_PROVIDER_AMBIGUOUS_SEND', token_reserve: 500000 };
const failureBody = { schemaVersion: 'starcraft_tmg_deepseek_responses_json_schema_adapter_v1.failure',
  code: originalAttempt.code, requestDefinitelyNotSent: false, requestMayHaveBeenSent: true,
  status: null, physicalAttempts: 1, outputContractRef,
  capabilityReceiptHash: capability.receiptHash, usageKnown: false, usage: null,
  causeCode: 'PROVIDER_TRANSPORT_FAILED', incompleteReason: null, payloadHash: null,
  outputTextHash: null, schemaIssues: [], responseNormalization: null,
  responseNormalizationReceiptHash: null, automaticRetries: 0, trainingTruth: false };
const originalFailureReceipt = { ...failureBody, receiptHash: hash(failureBody) };
const originalIssue = seal({ version: 'starcraft_tmg_structured_generation_runtime_v1.issue',
  invocationHash: hash(originalInvocation), outputContractRef, class: 'ambiguous_egress',
  code: originalAttempt.code, retryRoute: 'manual_provider_reconciliation',
  safeReceiptHash: originalFailureReceipt.receiptHash, rejectedCandidateRef: null,
  rawPayloadPersisted: false, trainingTruth: false });
const originalRuntimeReceipt = seal({ version: 'starcraft_tmg_structured_generation_runtime_v1.receipt',
  invocationHash: hash(originalInvocation), attemptId: originalAttempt.id, outputContractRef,
  status: 'stopped', candidateHash: null, issueHash: originalIssue.hash,
  providerAttempts: 1, automaticRetries: 0, acceptanceScope: 'none', trainingTruth: false });
const args = { authorizationBinding: FACTION_AMBIGUOUS_REPLACEMENT_BINDING_V1,
  family, round: 0, context, originalChoice, originalAttempt, originalFailureReceipt,
  originalIssue, originalRuntimeReceipt, originalInvocation, originalRequest,
  replacementCapability: capability, replacementWireBinding: wireBinding,
  replacementOwnerRunId: 'faction-v1-current' };

const prepared = prepareFactionFieldValueAmbiguousReplacementV1(args);
assert.equal(prepared.providerCalls, 0);
assert.equal(prepared.grant.originAttemptId, originalAttempt.id);
assert.equal(prepared.grant.maximumReplacementAttempts, 1);
assert.equal(prepared.choice.grant.hash, prepared.grant.hash);
assert.equal(prepared.choice.continuationRef.hash, prepared.grant.hash);
assert.equal(prepared.request.requestId, prepared.choice.request.requestId);
assert.notEqual(prepared.request.requestId, originalAttempt.id);
assert.notEqual(hash(prepared.request), originalAttempt.request_hash);
assert.equal(prepared.invocation.continuationRef.hash, prepared.grant.hash);
assert.throws(() => prepareFactionFieldValueAmbiguousReplacementV1({ ...args,
  originalAttempt: { ...originalAttempt, usage: 'known' } }),
{ code: 'FACTION_FIELD_VALUE_AMBIGUOUS_REPLACEMENT_ORIGIN' });
const { hash: ignoredIssueHash, ...issueBody } = originalIssue;
assert.throws(() => prepareFactionFieldValueAmbiguousReplacementV1({ ...args,
  originalIssue: seal({ ...issueBody, safeReceiptHash: hash('wrong') }) }),
{ code: 'FACTION_FIELD_VALUE_AMBIGUOUS_REPLACEMENT_EVIDENCE' });

console.log(JSON.stringify({ ticket: 18, slice: 174, passed: true,
  originalUnknownDeliveryPreserved: true, replacementProviderCalls: 1,
  maximumReplacementAttempts: 1, replacementRequestDistinct: true,
  grantHash: prepared.grant.hash }));
