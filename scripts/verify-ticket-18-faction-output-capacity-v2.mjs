import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hash, seal, verifySeal, sha256 } from '../packages/skill-production/common.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { prepareDshLoop } from '../packages/skill-production/loops.mjs';
import { factionRoleWorkspaceV1 } from '../packages/skill-production-v3/faction-strategy-workflow-v1.mjs';
import { createFactionStructuredTeachRuntimeV1 } from '../packages/skill-production-v3/faction-structured-teach-runtime-v1.mjs';
import { FACTION_OUTPUT_CAPACITY_POLICY_V2, factionRoleOutputCapacityV2 } from '../packages/skill-production-v3/faction-output-capacity-policy-v2.mjs';
import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V1 as oldProfile } from '../content/skill-generation/offline-provider-profile-v1.mjs';
import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V2 as profile } from '../content/skill-generation/offline-provider-profile-v2.mjs';
import { FACTION_TEACH_OUTPUT_CONTRACT_REF_V1 as ref } from '../content/skill-generation/ticket-18-faction-teach-output-contract-v1.mjs';
import { createStarcraftTmgProviderProfileRegistryV2 } from '../packages/secure-provider-runtime/provider-profile-registry-v2.mjs';
import { createStarcraftTmgProviderCapabilityReceiptV1 } from '../packages/structured-generation/provider-capability-receipt-v1.mjs';
import { STARCRAFT_TMG_JSON_SCHEMA_SUBSET_VERSION } from '../packages/structured-generation/output-contract-registry-v1.mjs';
import { createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1 } from '../packages/structured-generation/adapters/deepseek-responses-json-schema-v1.mjs';
import { createStarcraftTmgInMemoryStructuredFaultAdapterV1 } from '../packages/structured-generation/adapters/in-memory-fault-injection-v1.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = path.join(root, 'build/ticket-18-faction-production-v1');
const input = verifySeal(JSON.parse(await readFile(path.join(base, 'zerg_swarm-input.json'), 'utf8')));
assert.equal(oldProfile.outputBudget, 4096);
assert.equal(profile.outputBudget, 8192);
assert.notEqual(profile.integrity.hash, oldProfile.integrity.hash);
let checks = 3;
for (const field of ['provider', 'baseUrl', 'model', 'thinkingMode', 'reasoningEffort', 'temperature', 'topP',
  'contextBudget', 'toolSupport', 'timeoutMs', 'retryPolicy', 'fallbackPolicy']) {
  assert.deepEqual(profile[field], oldProfile[field]); checks++;
}
for (const [kind, maximum] of [['teach', 8192], ['narrative', 8192], ['review', 4096]]) {
  assert.equal(factionRoleOutputCapacityV2({ kind }).maxOutputUnits, maximum); checks++;
}
assert.throws(() => factionRoleOutputCapacityV2({ kind: 'unknown' }), { code: 'FACTION_ROLE_CAPACITY_POLICY_INVALID' }); checks++;
const binding = createStarcraftTmgProviderProfileRegistryV2({ entries: [{ providerProfile: profile, responsePath: '/responses' }] })
  .resolveEgressBinding({ profileRef: { id: profile.providerProfileId, version: profile.version, hash: profile.integrity.hash } }).egressBinding;
assert.equal(binding.maxOutputUnits, 8192); checks++;
const now = Date.now();
const capabilityReceipt = createStarcraftTmgProviderCapabilityReceiptV1({ providerProfileRef: binding.providerProfileRef,
  endpointPath: binding.endpoint.path, endpointDialect: binding.endpointDialect, model: binding.model,
  capability: 'responses_json_schema', schemaSubsetVersion: STARCRAFT_TMG_JSON_SCHEMA_SUBSET_VERSION,
  outputContractRef: ref, probeInputHash: hash('explicit-injected-capability'), probeOutputHash: hash('explicit-injected-output'),
  probeResult: 'accepted_schema_valid', usage: { inputUnits: 10, outputUnits: 10, totalUnits: 20 },
  usageKnown: true, physicalAttempts: 1, probedAt: new Date(now).toISOString(), expiresAt: new Date(now + 3600000).toISOString() });
const request = { packet: seal({ id: 'faction.zerg_swarm', inputHash: input.hash, sourceBinding: input.sourceBinding }),
  roleId: 'tutor.capacity-part-v1.army_resources', maxOutput: 8192,
  instruction: 'Fixture only: bounded conditional Teach notes, full source context preserved.',
  workspace: { ...factionRoleWorkspaceV1(input), teachCapacityRecovery: { axis: 'army_resources', completedParts: [] } } };
const output = { lesson: ['Injected boundary only, not a game Skill.'], uncertainties: ['No real-model test yet.'] };
const fault = createStarcraftTmgInMemoryStructuredFaultAdapterV1({ steps: [{ kind: 'success', output }] });
let wire;
const adapter = createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1({ send: value => { wire = value; return fault.send(value); } });
const store = openProductionStore(':memory:', { runId: 'capacity-v2-injected', recipeHash: hash('capacity-v2-injected'),
  maxCalls: 1, maxTokens: 1000000, maxCostMicros: 2000000 });
try {
  const dsh = await prepareDshLoop(root);
  const runtime = createFactionStructuredTeachRuntimeV1({ input, runtime: { role: () => assert.fail('No fallback') }, store, dsh,
    providerAdapter: adapter, egressBinding: binding, capabilityReceipt,
    executionPolicy: { maxOutputUnits: 8192, attemptEstimateMicros: 1000000, attemptTokenReserve: 500000,
      allowDefinitelyNotSentRetry: false, allowOneCapacityRetry: false, idempotentRetrySupported: false,
      encryptedRawQuarantineAvailable: false }, priceUsage: usage => usage.totalUnits });
  const result = await runtime.role(request);
  assert.equal(wire.body.max_output_tokens, 8192); checks++;
  assert.equal(wire.body.reasoning.effort, 'none'); checks++;
  assert.deepEqual(JSON.parse(wire.body.input).fullFrozenSources, input.frozenSources.prompt); checks++;
  assert.deepEqual(result.output, output); checks++;
  assert.equal(result.loop.calls, 1); checks++;
  assert.equal((await runtime.role(request)).hash, result.hash); checks++;
  assert.equal(fault.inspect().calls.length, 1); checks++;
} finally { store.close(); }
const files = ['content/skill-generation/offline-provider-profile-v2.mjs', 'packages/skill-production-v3/faction-output-capacity-policy-v2.mjs',
  'scripts/verify-ticket-18-faction-output-capacity-v2.mjs'];
const report = seal({ passed: true, checks, policy: FACTION_OUTPUT_CAPACITY_POLICY_V2,
  actualDshSessions: 1, providerCalls: 0, providerBoundaryInjected: true, live8192CapabilityVerified: false,
  productionWiringChanged: false, v1ProfileUnchanged: true, sourceRefreshPerformed: false, trainingTruth: false,
  codeHashes: await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(root, file))) }))) });
await writeFile(path.join(base, 'output-capacity-v2-readiness.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks, actualDshSessions: 1, providerCalls: 0, hash: report.hash }));
