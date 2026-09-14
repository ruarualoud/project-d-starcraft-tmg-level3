import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hash, seal, verifySeal, sha256 } from '../packages/skill-production/common.mjs';
import { factionRoleWorkspaceV1 } from '../packages/skill-production-v3/faction-strategy-workflow-v1.mjs';
import { prepareFactionStructuredTeachV1, createFactionStructuredTeachRuntimeV1,
  FACTION_STRUCTURED_TEACH_BINDING_V1 } from '../packages/skill-production-v3/faction-structured-teach-runtime-v1.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { prepareDshLoop } from '../packages/skill-production/loops.mjs';
import { verifyFactionStructuredRoleReplayV1 } from '../packages/skill-evaluation/faction-structured-replay-v1.mjs';
import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V1 as profile } from '../content/skill-generation/offline-provider-profile-v1.mjs';
import { createStarcraftTmgProviderProfileRegistryV2 } from '../packages/secure-provider-runtime/provider-profile-registry-v2.mjs';
import { createStarcraftTmgProviderCapabilityReceiptV1 } from '../packages/structured-generation/provider-capability-receipt-v1.mjs';
import { STARCRAFT_TMG_JSON_SCHEMA_SUBSET_VERSION } from '../packages/structured-generation/output-contract-registry-v1.mjs';
import { FACTION_TEACH_OUTPUT_CONTRACT_REF_V1 as ref } from '../content/skill-generation/ticket-18-faction-teach-output-contract-v1.mjs';
import { createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1 } from '../packages/structured-generation/adapters/deepseek-responses-json-schema-v1.mjs';
import { createStarcraftTmgInMemoryStructuredFaultAdapterV1 } from '../packages/structured-generation/adapters/in-memory-fault-injection-v1.mjs';
import { FACTION_TEACH_OUTPUT_BUDGET_BINDING_V1 as binding, applyFactionTeachOutputBudgetV1,
  withFactionTeachOutputBudgetV1, verifyFactionNativeTeachCapacityFailureV1 } from '../packages/skill-production-v3/faction-teach-output-budget-v1.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = path.join(root, 'build/ticket-18-faction-production-v1');
const input = verifySeal(JSON.parse(await readFile(path.join(base, 'zerg_swarm-input.json'), 'utf8')));
const db = new DatabaseSync(path.join(root, 'build/ticket-17-production-redesign-v1/production.sqlite'), { readOnly: true });
let attempt, issue;
try {
  attempt = db.prepare('SELECT * FROM attempts WHERE run=? AND id=?').get('faction-v1-96a0ecb6908bf4fe4d6c', 'structured-e6813386c9c9447699dadc1363c209206859571b18424ebd');
  issue = verifySeal(JSON.parse(db.prepare('SELECT artifact FROM steps WHERE run=? AND id=?')
    .get(attempt.run, attempt.id + '.issue').artifact)).value;
} finally { db.close(); }
const failure = verifyFactionNativeTeachCapacityFailureV1({ attempt, issue, inputHash: input.hash });
const policy = { maxOutputUnits: 4096, attemptEstimateMicros: 800000, attemptTokenReserve: 500000,
  allowDefinitelyNotSentRetry: false, allowOneCapacityRetry: false, idempotentRetrySupported: false, encryptedRawQuarantineAvailable: false };
let checks = 1;
for (const axis of ['army_resources', 'unit_roles', 'phase_tempo', 'objectives', 'threat_tradeoffs', 'card_packages']) {
  const request = { packet: seal({ id: 'faction.zerg_swarm', inputHash: input.hash, sourceBinding: input.sourceBinding }),
    roleId: 'tutor.capacity-part-v1.' + axis, maxOutput: 4096, instruction: 'Complete original instruction preserved.',
    workspace: { ...factionRoleWorkspaceV1(input), teachCapacityRecovery: { axis, completedParts: [{ marker: 'complete prior notes' }] } } };
  const before = prepareFactionStructuredTeachV1({ input, request, executionPolicy: policy });
  const changed = applyFactionTeachOutputBudgetV1(request, binding);
  const after = prepareFactionStructuredTeachV1({ input, request: changed, executionPolicy: policy });
  const body = JSON.parse(after.payload);
  assert.deepEqual(body.fullFrozenSources, input.frozenSources.prompt);
  assert.deepEqual(body.workspace.teachCapacityRecovery, request.workspace.teachCapacityRecovery);
  assert(body.taskAtEnd.instruction.startsWith(request.instruction));
  assert.notEqual(before.contextManifestRef.hash, after.contextManifestRef.hash);
  assert.equal(before.outputContractRef.hash, after.outputContractRef.hash);
  assert.equal(before.executionPolicyRef.hash, after.executionPolicyRef.hash);
  assert(after.fullContextBytes < 1000000);
  let seen;
  await withFactionTeachOutputBudgetV1({ role: r => { seen = r; } }, binding).role(request);
  assert.deepEqual(seen, changed); checks += 8;
}
const other = { roleId: 'generator' };
assert.equal(applyFactionTeachOutputBudgetV1(other, binding), other); checks++;
assert.throws(() => verifyFactionNativeTeachCapacityFailureV1({ attempt: { ...attempt, state: 'intent' }, issue, inputHash: input.hash })); checks++;
const dsh = await prepareDshLoop(root);
const egressBinding = createStarcraftTmgProviderProfileRegistryV2({ entries: [{ providerProfile: profile, responsePath: '/responses' }],
  allowedProviders: ['deepseek-openai-compatible-direct'] }).resolveEgressBinding({
    profileRef: { id: profile.providerProfileId, version: profile.version, hash: profile.integrity.hash } }).egressBinding;
const now = Date.now();
const capabilityReceipt = createStarcraftTmgProviderCapabilityReceiptV1({ providerProfileRef: egressBinding.providerProfileRef,
  endpointPath: egressBinding.endpoint.path, endpointDialect: egressBinding.endpointDialect, model: egressBinding.model,
  capability: 'responses_json_schema', schemaSubsetVersion: STARCRAFT_TMG_JSON_SCHEMA_SUBSET_VERSION,
  outputContractRef: ref, probeInputHash: hash('INJECTED-PROBE'), probeOutputHash: hash('INJECTED-PROBE-OUTPUT'),
  probeResult: 'accepted_schema_valid', usage: { inputUnits: 10, outputUnits: 10, totalUnits: 20 },
  usageKnown: true, physicalAttempts: 1, probedAt: new Date(now).toISOString(), expiresAt: new Date(now + 3600000).toISOString() });
const output = { lesson: ['Injected engineering output; not a production game fact.'], uncertainties: ['Game strategy unproven.'] };
const fault = createStarcraftTmgInMemoryStructuredFaultAdapterV1({ steps: [{ kind: 'success', output }] });
const adapter = createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1({ send: args => fault.send(args) });
const store = openProductionStore(':memory:', { runId: 'native-teach-budget-proof', recipeHash: hash('injected-recipe'),
  maxCalls: 2, maxCostMicros: 2000000, maxTokens: 1000000 });
const artifacts = new Map(), responses = new Map();
const journal = { ...store, finish(lease, value) { const saved = store.finish(lease, value); artifacts.set(saved.hash, saved); return saved; },
  settle(id, outcome) { const saved = store.settle(id, outcome); if (outcome.response?.usageReceipt)
    responses.set(outcome.response.usageReceipt.receiptHash, { response: outcome.response }); return saved; } };
try {
  const request = { packet: seal({ id: 'faction.zerg_swarm', inputHash: input.hash, sourceBinding: input.sourceBinding }),
    roleId: 'tutor.capacity-part-v1.army_resources', maxOutput: 4096, instruction: 'Injected full-context Teach proof.',
    workspace: { ...factionRoleWorkspaceV1(input), teachCapacityRecovery: { axis: 'army_resources', completedParts: [] } } };
  const native = createFactionStructuredTeachRuntimeV1({ input, runtime: { role: () => assert.fail('legacy forbidden') },
    store: journal, dsh, providerAdapter: adapter, egressBinding, capabilityReceipt,
    executionPolicy: policy, priceUsage: usage => usage.totalUnits });
  const runtime = withFactionTeachOutputBudgetV1(native, binding);
  const value = await runtime.role(request);
  assert.deepEqual(value.output, output); assert.equal(value.loop.calls, 1);
  const changed = applyFactionTeachOutputBudgetV1(request, binding);
  const prepared = prepareFactionStructuredTeachV1({ input, request: changed, executionPolicy: policy });
  const proof = verifyFactionStructuredRoleReplayV1({ input, request, roleInput: prepared.roleInput, value,
    recipe: { structuredTeachBinding: FACTION_STRUCTURED_TEACH_BINDING_V1,
      teachOutputBudgetBinding: binding, dshBindingHash: dsh.binding.hash },
    resolveArtifact: h => artifacts.get(h), resolveResponse: h => responses.get(h) });
  assert.equal(proof.providerReceiptHashes.length, 1);
  assert.equal((await runtime.role(request)).hash, value.hash); assert.equal(fault.inspect().calls.length, 1);
  checks += 5;
} finally { store.close(); }
const files = ['packages/skill-production-v3/faction-teach-output-budget-v1.mjs', 'scripts/verify-ticket-18-faction-teach-output-budget-v1.mjs'];
const report = seal({ passed: true, checks, binding, failure, providerCalls: 0,
  actualDshSessions: 1, actualStructuredConsumerReplayPassed: true, simulatedProviderOnly: true,
  fullSourceAndPriorPartsPreserved: true, finalSkillTruncated: false, sameNativeOutputContract: true,
  actualNewTeachOutputProduced: false, sourceRefreshPerformed: false, trainingTruth: false,
  codeHashes: await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(root, file))) }))) });
await writeFile(path.join(base, 'teach-output-budget-readiness.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks, providerCalls: 0, failure, hash: report.hash }));
