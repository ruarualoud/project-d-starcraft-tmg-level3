import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hash, seal, verifySeal, sha256 } from '../packages/skill-production/common.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { runDirectLoop, prepareDshLoop } from '../packages/skill-production/loops.mjs';
import { factionRoleWorkspaceV1 } from '../packages/skill-production-v3/faction-strategy-workflow-v1.mjs';
import { prepareFactionStructuredTeachV1, createFactionStructuredTeachRuntimeV1, FACTION_STRUCTURED_TEACH_BINDING_V1 as bindingProof } from '../packages/skill-production-v3/faction-structured-teach-runtime-v1.mjs';
import { FACTION_TEACH_OUTPUT_CONTRACT_REF_V1 as ref } from '../content/skill-generation/ticket-18-faction-teach-output-contract-v1.mjs';
import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V1 as profile } from '../content/skill-generation/offline-provider-profile-v1.mjs';
import { createStarcraftTmgProviderProfileRegistryV2 } from '../packages/secure-provider-runtime/provider-profile-registry-v2.mjs';
import { createStarcraftTmgProviderCapabilityReceiptV1 } from '../packages/structured-generation/provider-capability-receipt-v1.mjs';
import { STARCRAFT_TMG_JSON_SCHEMA_SUBSET_VERSION } from '../packages/structured-generation/output-contract-registry-v1.mjs';
import { createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1 } from '../packages/structured-generation/adapters/deepseek-responses-json-schema-v1.mjs';
import { createStarcraftTmgInMemoryStructuredFaultAdapterV1 } from '../packages/structured-generation/adapters/in-memory-fault-injection-v1.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = path.join(root, 'build/ticket-18-faction-production-v1');
const input = verifySeal(JSON.parse(await readFile(path.join(base, 'zerg_swarm-input.json'), 'utf8')));
const db = new DatabaseSync(path.join(root, 'build/ticket-17-production-redesign-v1/production.sqlite'), { readOnly: true });
let original;
try { original = verifySeal(JSON.parse(db.prepare('SELECT response FROM attempts WHERE run=? AND id=? AND state=?').get(
  'faction-v1-d637b50c71522a56cea4', 'faction.zerg_swarm.tutor.capacity-part-v1.army_resources.call-1.format-0', 'failed').response)).value; }
finally { db.close(); }
assert.equal(original.code, 'PROVIDER_RESPONSE_JSON_INVALID');
assert.equal(original.responseOutcome.finishReason, 'stop');
assert.equal(original.responseOutcome.syntaxIssue, 'separator');
assert.equal(original.responseOutcome.usage.outputUnits, 1825);
const executionPolicy = { maxOutputUnits: 4096, attemptEstimateMicros: 800000,
  attemptTokenReserve: 500000, allowDefinitelyNotSentRetry: false, allowOneCapacityRetry: false,
  idempotentRetrySupported: false, encryptedRawQuarantineAvailable: false };
const request = { packet: seal({ id: 'faction.zerg_swarm', inputHash: input.hash, sourceBinding: input.sourceBinding }),
  roleId: 'tutor.capacity-part-v1.army_resources', maxOutput: 4096,
  instruction: 'Injected test: teach this axis only, preserve all conditions.', workspace: {
    ...factionRoleWorkspaceV1(input), teachCapacityRecovery: { axis: 'army_resources',
      completedParts: [{ axis: 'injected-previous-part', notes: { lesson: ['MUST_PRESERVE_FULL_PRIOR_NOTE'], uncertainties: [] } }] } } };
const prepared = prepareFactionStructuredTeachV1({ input, request, executionPolicy });
const body = JSON.parse(prepared.payload);
assert.deepEqual(body.fullFrozenSources, input.frozenSources.prompt);
assert.deepEqual(body.workspace, request.workspace);
assert(prepared.payload.includes('MUST_PRESERVE_FULL_PRIOR_NOTE'));
assert(prepared.fullContextBytes < 1000000);
const binding = createStarcraftTmgProviderProfileRegistryV2({ entries: [{ providerProfile: profile, responsePath: '/responses' }],
  allowedProviders: ['deepseek-openai-compatible-direct'] }).resolveEgressBinding({
  profileRef: { id: profile.providerProfileId, version: profile.version, hash: profile.integrity.hash } }).egressBinding;
const now = Date.now();
const capabilityReceipt = createStarcraftTmgProviderCapabilityReceiptV1({ providerProfileRef: binding.providerProfileRef,
  endpointPath: binding.endpoint.path, endpointDialect: binding.endpointDialect, model: binding.model,
  capability: 'responses_json_schema', schemaSubsetVersion: STARCRAFT_TMG_JSON_SCHEMA_SUBSET_VERSION,
  outputContractRef: ref, probeInputHash: hash('synthetic-capability-input'), probeOutputHash: hash('synthetic-capability-output'),
  probeResult: 'accepted_schema_valid', usage: { inputUnits: 10, outputUnits: 10, totalUnits: 20 },
  usageKnown: true, physicalAttempts: 1, probedAt: new Date(now).toISOString(), expiresAt: new Date(now + 3600000).toISOString() });
const output = { lesson: ['Injected conditional note, not an accepted game fact.'], uncertainties: ['All strategy strength unproven.'] };
let checks = 4, sandboxSessions = 0;
const actualDsh = await prepareDshLoop(root);
for (const mode of ['success', 'actual_dsh', 'invalid_json', 'invalid_schema', 'incomplete', 'payment_required']) {
  const store = openProductionStore(':memory:', { runId: mode, recipeHash: hash(mode), maxCalls: 2,
    maxCostMicros: 2000000, maxTokens: 1000000 });
  const step = ['success', 'actual_dsh'].includes(mode) ? { kind: 'success', output }
    : mode === 'invalid_schema' ? { kind: mode, output: { ...output, acceptance: true } }
      : mode === 'payment_required' ? { kind: 'failed', status: 402 } : { kind: mode };
  const fault = createStarcraftTmgInMemoryStructuredFaultAdapterV1({ steps: [step] });
  let sentPayload;
  const adapter = createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1({ send: args => {
    sentPayload = args.body.input; return fault.send(args);
  } });
  const args = { input, runtime: { role: async () => assert.fail('legacy fallback forbidden') }, store,
    dsh: mode === 'actual_dsh' ? actualDsh : { run: runDirectLoop }, providerAdapter: adapter,
    egressBinding: binding, capabilityReceipt, executionPolicy, priceUsage: usage => usage.totalUnits };
  try {
    const runtime = createFactionStructuredTeachRuntimeV1(args);
    if (['success', 'actual_dsh'].includes(mode)) {
      const result = await runtime.role(request);
      assert.deepEqual(result.output, output); assert.equal(result.loop.calls, 1);
      assert.equal(result.semanticAcceptance, false);
      const cached = await runtime.role(request); assert.equal(cached.hash, result.hash);
      assert.equal(fault.inspect().calls.length, 1);
      const dry = createFactionStructuredTeachRuntimeV1({ input, runtime: args.runtime, store, executionPolicy, dry: true });
      assert.equal((await dry.role(request)).hash, result.hash);
      if (mode === 'actual_dsh') sandboxSessions++;
    } else {
      await assert.rejects(() => runtime.role(request), mode === 'payment_required' ? { code: 'PROVIDER_PAYMENT_REQUIRED' } : undefined);
      assert.equal(fault.inspect().calls.length, 1, 'No retry/fallback for the same failed native request');
      assert.equal(store.summary().calls, 1);
      await assert.rejects(() => runtime.role(request));
      assert.equal(fault.inspect().calls.length, 1);
    }
    assert(sentPayload);
    checks++;
  } finally { store.close(); }
}
for (const change of [r => r.workspace.inputHash = hash('foreign'),
  r => r.workspace.teachCapacityRecovery.axis = 'unit_roles', r => r.workspace.overallSkill = { truncated: true }]) {
  const changed = structuredClone(request); change(changed);
  assert.throws(() => prepareFactionStructuredTeachV1({ input, request: changed, executionPolicy })); checks++;
}
const files = ['content/skill-generation/ticket-18-faction-teach-output-contract-v1.mjs',
  'packages/skill-production-v3/faction-structured-teach-runtime-v1.mjs', 'scripts/verify-ticket-18-faction-structured-teach-v1.mjs'];
const report = seal({ passed: true, checks, actualDshSessions: sandboxSessions, providerCalls: 0,
  binding: bindingProof, originRunId: 'faction-v1-d637b50c71522a56cea4',
  originAttemptId: 'faction.zerg_swarm.tutor.capacity-part-v1.army_resources.call-1.format-0', inputHash: input.hash,
  actualFailureReceiptHash: original.receiptHash, nativeContractRef: ref, fullContextBytes: prepared.fullContextBytes,
  fullSourceAndPriorPartsPreserved: true, originalFailureReplayed: false, automaticRetries: 0,
  sourceRefreshPerformed: false, semanticAcceptanceInherited: false, trainingTruth: false,
  codeHashes: await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(root, file))) }))) });
await writeFile(path.join(base, 'structured-teach-readiness.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks, actualDshSessions: sandboxSessions, fullContextBytes: prepared.fullContextBytes, providerCalls: 0, hash: report.hash }));
