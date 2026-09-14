#!/usr/bin/env node

import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V1 as profile }
  from '../content/skill-generation/offline-provider-profile-v1.mjs';
import { STARCRAFT_TMG_FACTION_ADVICE_EDITOR_OUTPUT_CONTRACT_V1 as contract,
  STARCRAFT_TMG_FACTION_ADVICE_EDITOR_OUTPUT_CONTRACT_REF_V1 as contractRef }
  from '../content/skill-generation/ticket-18-faction-advice-editor-output-contract-v1.mjs';
import { hash } from '../packages/skill-production/common.mjs';
import { createProductionFailureRouterV1 }
  from '../packages/skill-production/production-failure-routing-v1.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { createStarcraftTmgProviderProfileRegistryV2 }
  from '../packages/secure-provider-runtime/provider-profile-registry-v2.mjs';
import { createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1 }
  from '../packages/structured-generation/adapters/deepseek-responses-json-schema-v1.mjs';
import { createStarcraftTmgInMemoryStructuredFaultAdapterV1 }
  from '../packages/structured-generation/adapters/in-memory-fault-injection-v1.mjs';
import { createStarcraftTmgOutputContractRegistryV1 }
  from '../packages/structured-generation/output-contract-registry-v1.mjs';
import { createStarcraftTmgProviderCapabilityReceiptV1 }
  from '../packages/structured-generation/provider-capability-receipt-v1.mjs';
import { createStarcraftTmgStructuredGenerationRuntimeV1 }
  from '../packages/structured-generation/structured-generation-runtime-v1.mjs';

const directory = await mkdtemp(path.join(os.tmpdir(), 'starcraft-failure-ref-'));
const filename = path.join(directory, 'production.sqlite');
const runId = 'structured-failure-reference-resume';
const recipeHash = hash(runId);
const now = '2026-09-10T10:00:00.000Z';
const registry = createStarcraftTmgProviderProfileRegistryV2({ entries: [{ providerProfile: profile,
  responsePath: '/responses' }], allowedProviders: ['deepseek-openai-compatible-direct'] });
const egressBinding = registry.resolveEgressBinding({ profileRef: { id: profile.providerProfileId,
  version: profile.version, hash: profile.integrity.hash } }).egressBinding;
const roleRef = { id: 'failure-reference.role', version: 'v1', hash: hash('failure-reference.role') };
const contextManifestRef = { id: 'context.failure-reference.role', version: 'v1', hash: hash('failure-reference.context') };
const executionPolicyRef = { id: 'policy.failure-reference', version: 'v1', hash: hash('failure-reference.policy') };
const capabilityReceipt = createStarcraftTmgProviderCapabilityReceiptV1({
  providerProfileRef: egressBinding.providerProfileRef, endpointPath: egressBinding.endpoint.path,
  endpointDialect: egressBinding.endpointDialect, model: egressBinding.model,
  capability: 'responses_json_schema', schemaSubsetVersion: contract.schemaSubsetVersion,
  outputContractRef: contractRef, probeInputHash: hash('probe-in'), probeOutputHash: hash('probe-out'),
  probeResult: 'accepted_schema_valid', usage: { inputUnits: 1, outputUnits: 1, totalUnits: 2 },
  usageKnown: true, physicalAttempts: 1, probedAt: now, expiresAt: '2026-09-11T10:00:00.000Z',
});
const invocation = { roleRef, contextManifestRef, outputContractRef: contractRef,
  executionPolicyRef, continuationRef: null };
const dependencies = {
  outputContractRegistry: createStarcraftTmgOutputContractRegistryV1({ entries: [contract] }),
  contextManifestRegistry: { resolve: query => query.contextManifestRef.hash === contextManifestRef.hash
    ? { ok: true, instructions: 'Return one object.', input: 'Frozen context.' } : { ok: false } },
  executionPolicyRegistry: { resolve: query => query.executionPolicyRef.hash === executionPolicyRef.hash
    ? { ok: true, executionPolicy: { maxOutputUnits: 256, attemptEstimateMicros: 1000,
      attemptTokenReserve: 4096 } } : { ok: false } },
  capabilityReceiptRegistry: { resolve: query => query.outputContractRef.hash === contractRef.hash
    ? { ok: true, capabilityReceipt } : { ok: false } },
  egressBinding, priceUsage: usage => usage.totalUnits,
  classifyFailure: ({ error }) => error.code === 'STRUCTURED_PROVIDER_AMBIGUOUS_SEND'
    ? { status: 'stopped', class: 'ambiguous_egress', retryRoute: 'manual_provider_reconciliation' }
    : { status: 'quarantined', class: 'other', retryRoute: null },
};
const open = step => {
  const fault = createStarcraftTmgInMemoryStructuredFaultAdapterV1({ steps: [step] });
  const store = openProductionStore(filename, { runId, recipeHash, maxCalls: 4,
    maxCostMicros: 100_000, maxTokens: 100_000 });
  const runtime = createStarcraftTmgStructuredGenerationRuntimeV1({ ...dependencies, store,
    providerAdapter: createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1({ send: fault.send, now: () => now }),
    readCandidate: () => null });
  return { fault, store, runtime };
};

try {
  const first = open({ kind: 'ambiguous_send' });
  const stopped = await first.runtime.generateStructured(invocation);
  assert.equal(stopped.status, 'stopped');
  assert.match(stopped.issueRef.id, /\.issue$/u);
  first.store.close();

  const resumed = open({ kind: 'success', output: {} });
  let caught;
  try { await resumed.runtime.generateStructured(invocation); }
  catch (error) { caught = error; }
  assert.equal(caught?.code, 'STRUCTURED_PROVIDER_AMBIGUOUS_SEND');
  assert.equal(caught?.outcome?.issueRef?.id, stopped.issueRef.id);
  assert.equal(resumed.fault.inspect().calls.length, 0);
  const db = new DatabaseSync(filename, { readOnly: true });
  const router = createProductionFailureRouterV1({
    readArtifact: id => resumed.store.artifact(id),
    readAttempt: id => db.prepare('SELECT * FROM attempts WHERE run=? AND id=?').get(runId, id),
  });
  const route = router.route(caught);
  assert.equal(route.class, 'ambiguous_egress');
  assert.equal(route.originalAttemptId, stopped.issueRef.id.replace(/\.issue$/u, ''));
  db.close(); resumed.store.close();
  console.log(JSON.stringify({ ticket: 18, slice: 174, passed: true,
    firstIssueReferenceComplete: true, restartEvidenceRehydrated: true,
    providerCallsAfterRestart: 0, route: route.class }));
} finally { await rm(directory, { recursive: true, force: true }); }
