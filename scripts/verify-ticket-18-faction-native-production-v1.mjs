import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hash, seal, verifySeal, sha256 } from '../packages/skill-production/common.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { prepareDshLoop, runDirectLoop } from '../packages/skill-production/loops.mjs';
import { factionRoleWorkspaceV1, createFactionWritingPlanV1 } from '../packages/skill-production-v3/faction-strategy-workflow-v1.mjs';
import { createFactionNativeProductionRuntimeV1, prepareFactionNativeProductionRoleV1 } from '../packages/skill-production-v3/faction-native-production-runtime-v1.mjs';
import { FACTION_NATIVE_PRODUCTION_BINDING_V1 as binding, FACTION_NATIVE_PRODUCTION_PROBE_SAMPLES_V1 as samples } from '../content/skill-generation/ticket-18-faction-native-production-contracts-v1.mjs';
import { verifyFactionStructuredRoleReplayV1 } from '../packages/skill-evaluation/faction-structured-replay-v1.mjs';
import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V1 as profile } from '../content/skill-generation/offline-provider-profile-v1.mjs';
import { createStarcraftTmgProviderProfileRegistryV2 } from '../packages/secure-provider-runtime/provider-profile-registry-v2.mjs';
import { createStarcraftTmgProviderCapabilityReceiptV1 } from '../packages/structured-generation/provider-capability-receipt-v1.mjs';
import { STARCRAFT_TMG_JSON_SCHEMA_SUBSET_VERSION } from '../packages/structured-generation/output-contract-registry-v1.mjs';
import { createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1 } from '../packages/structured-generation/adapters/deepseek-responses-json-schema-v1.mjs';
import { createStarcraftTmgInMemoryStructuredFaultAdapterV1 } from '../packages/structured-generation/adapters/in-memory-fault-injection-v1.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), base = path.join(root, 'build/ticket-18-faction-production-v1');
const input = verifySeal(JSON.parse(await readFile(path.join(base, 'terran_armed_forces-input.json'), 'utf8')));
const originRunId = 'faction-v1-96a0ecb6908bf4fe4d6c';
const originAttemptId = 'faction.terran_armed_forces.faction.terran_armed_forces.card_packages.1.reasoner.call-1.format-0';
const db = new DatabaseSync(path.join(root, 'build/ticket-17-production-redesign-v1/production.sqlite'), { readOnly: true });
let original;
try { original = verifySeal(JSON.parse(db.prepare('SELECT response FROM attempts WHERE run=? AND id=? AND state=?')
  .get(originRunId, originAttemptId, 'failed').response)).value; } finally { db.close(); }
assert.equal(original.code, 'PROVIDER_RESPONSE_JSON_INVALID'); assert.equal(original.responseOutcome.finishReason, 'stop');
assert.equal(original.responseOutcome.syntaxIssue, 'separator'); assert.equal(original.responseOutcome.usage.outputUnits, 2180);
const section = createFactionWritingPlanV1(input).sections.find(s => s.axis === 'card_packages');
const requestFor = kind => ({ packet: seal({ id: 'faction.terran_armed_forces', inputHash: input.hash, sourceBinding: input.sourceBinding }),
  roleId: kind === 'questions' ? 'question-tree' : kind === 'challenges' ? 'challenger'
    : section.id + '.' + ({ notes: 'proposer', outline: 'generator-outline', items: 'generator-items.0' }[kind] || kind),
  maxOutput: 4096, instruction: 'Injected engineering task; no accepted game facts.',
  workspace: { ...factionRoleWorkspaceV1(input), section, fullPriorNotes: ['KEEP_THIS_COMPLETE_PRIOR_HISTORY'] } });
const executionPolicy = { maxOutputUnits: 4096, attemptEstimateMicros: 800000, attemptTokenReserve: 500000,
  allowDefinitelyNotSentRetry: false, allowOneCapacityRetry: false, idempotentRetrySupported: false, encryptedRawQuarantineAvailable: false };
const egressBinding = createStarcraftTmgProviderProfileRegistryV2({ entries: [{ providerProfile: profile, responsePath: '/responses' }],
  allowedProviders: ['deepseek-openai-compatible-direct'] }).resolveEgressBinding({
    profileRef: { id: profile.providerProfileId, version: profile.version, hash: profile.integrity.hash } }).egressBinding;
const now = Date.now(), capabilities = Object.fromEntries(Object.entries(binding.contracts).map(([kind, outputContractRef]) => [kind,
  createStarcraftTmgProviderCapabilityReceiptV1({ providerProfileRef: egressBinding.providerProfileRef,
    endpointPath: egressBinding.endpoint.path, endpointDialect: egressBinding.endpointDialect, model: egressBinding.model,
    capability: 'responses_json_schema', schemaSubsetVersion: STARCRAFT_TMG_JSON_SCHEMA_SUBSET_VERSION,
    outputContractRef, probeInputHash: hash('INJECTED-' + kind), probeOutputHash: hash('INJECTED-OUTPUT-' + kind),
    probeResult: 'accepted_schema_valid', usage: { inputUnits: 10, outputUnits: 10, totalUnits: 20 },
    usageKnown: true, physicalAttempts: 1, probedAt: new Date(now).toISOString(), expiresAt: new Date(now + 3600000).toISOString() })]));
const dsh = await prepareDshLoop(root); let checks = 4, actualDshSessions = 0;
for (const [kind, mode] of [...Object.keys(samples).map(k => [k, 'success']), ['reasoner', 'actual_dsh'],
  ['reasoner', 'invalid_json'], ['reasoner', 'invalid_schema'], ['reasoner', 'incomplete'], ['reasoner', 'payment_required']]) {
  const store = openProductionStore(':memory:', { runId: kind + '-' + mode, recipeHash: hash(kind + mode),
    maxCalls: 2, maxCostMicros: 2000000, maxTokens: 1000000 });
  const artifacts = new Map(), responses = new Map();
  const journal = { ...store, finish(lease, value) { const saved = store.finish(lease, value); artifacts.set(saved.hash, saved); return saved; },
    settle(id, result) { const saved = store.settle(id, result); if (result.response?.usageReceipt)
      responses.set(result.response.usageReceipt.receiptHash, { response: result.response }); return saved; } };
  const output = samples[kind], step = ['success', 'actual_dsh'].includes(mode) ? { kind: 'success', output }
    : mode === 'invalid_schema' ? { kind: mode, output: { ...output, acceptance: true } }
      : mode === 'payment_required' ? { kind: 'failed', status: 402 } : { kind: mode };
  const fault = createStarcraftTmgInMemoryStructuredFaultAdapterV1({ steps: [step] });
  const adapter = createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1({ send: args => fault.send(args) });
  const request = requestFor(kind), prepared = prepareFactionNativeProductionRoleV1({ input, request, executionPolicy });
  assert.deepEqual(JSON.parse(prepared.payload).workspace, request.workspace);
  assert.deepEqual(JSON.parse(prepared.payload).fullFrozenSources, input.frozenSources.prompt);
  const args = { input, runtime: { role: () => assert.fail('No raw JSON fallback') }, store: journal,
    dsh: mode === 'actual_dsh' ? dsh : { run: runDirectLoop }, providerAdapter: adapter,
    egressBinding, capabilities, executionPolicy, priceUsage: usage => usage.totalUnits };
  try {
    const runtime = createFactionNativeProductionRuntimeV1(args);
    if (['success', 'actual_dsh'].includes(mode)) {
      const value = await runtime.role(request);
      assert.deepEqual(value.output, output); assert.equal(value.semanticAcceptance, false);
      assert.equal((await runtime.role(request)).hash, value.hash); assert.equal(fault.inspect().calls.length, 1);
      assert.equal((await createFactionNativeProductionRuntimeV1({ ...args, dry: true }).role(request)).hash, value.hash);
      if (mode === 'actual_dsh') {
        const proof = verifyFactionStructuredRoleReplayV1({ input, request, roleInput: prepared.roleInput, value,
          recipe: { nativeProductionBinding: binding, dshBindingHash: dsh.binding.hash },
          resolveArtifact: h => artifacts.get(h), resolveResponse: h => responses.get(h) });
        assert.equal(proof.providerReceiptHashes.length, 1); actualDshSessions++;
      }
    } else {
      await assert.rejects(() => runtime.role(request), mode === 'payment_required' ? { code: 'PROVIDER_PAYMENT_REQUIRED' } : undefined);
      await assert.rejects(() => runtime.role(request)); assert.equal(fault.inspect().calls.length, 1);
    }
    checks += 3;
  } finally { store.close(); }
}
const request = requestFor('reasoner'); let preserved;
await createFactionNativeProductionRuntimeV1({ input, legacyRoleIds: [request.packet.id + '.' + request.roleId],
  runtime: { role: r => { preserved = r; } } }).role(request);
assert.equal(preserved, request); checks++;
for (const [change, code] of [[r => r.workspace.inputHash = hash('wrong'), 'FACTION_NATIVE_ROLE_CONTEXT_DRIFT'],
  [r => r.workspace.section = {}, 'FACTION_NATIVE_ROLE_SECTION_DRIFT'],
  [r => r.packet = seal({ id: 'faction.zerg_swarm', inputHash: r.packet.inputHash, sourceBinding: r.packet.sourceBinding }), 'FACTION_NATIVE_ROLE_SCOPE_INVALID']]) {
  const changed = structuredClone(request); change(changed);
  assert.throws(() => prepareFactionNativeProductionRoleV1({ input, request: changed, executionPolicy }), { code }); checks++;
}
const files = ['content/skill-generation/ticket-18-faction-native-production-contracts-v1.mjs',
  'packages/skill-production-v3/faction-native-production-runtime-v1.mjs', 'scripts/verify-ticket-18-faction-native-production-v1.mjs',
  'packages/skill-evaluation/faction-structured-replay-v1.mjs', 'packages/skill-evaluation/faction-replay-runtime-stack-v1.mjs'];
const report = seal({ passed: true, checks, binding, originRunId, originAttemptId, inputHash: input.hash,
  actualFailureReceiptHash: original.receiptHash, actualDshSessions, actualStructuredConsumerReplayPassed: true,
  kindsTested: Object.keys(samples), completeSourcesAndPriorWorkspacePreserved: true,
  historicalCompletedRolesDelegatedUnchanged: true, providerCalls: 0, simulatedProviderOnly: true,
  actualNewFactionSkillsAccepted: 0, sourceRefreshPerformed: false, trainingTruth: false,
  codeHashes: await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(root, file))) }))) });
await writeFile(path.join(base, 'native-production-readiness.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks, actualDshSessions, kindsTested: report.kindsTested, providerCalls: 0, hash: report.hash }));
