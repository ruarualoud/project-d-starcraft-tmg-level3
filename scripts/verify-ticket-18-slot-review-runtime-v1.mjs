import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { hash, seal, verifySeal, sha256 } from '../packages/skill-production/common.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { prepareDshLoop, runDirectLoop } from '../packages/skill-production/loops.mjs';
import { createFactionWritingPlanV1, createFactionReviewBatchPlanV1,
  validateFactionProductionTargetReviewV1 } from '../packages/skill-production-v3/faction-strategy-workflow-v1.mjs';
import { STARCRAFT_TMG_FACTION_REVIEW_CATALOGUE_BINDING_V1 as catalogueReviewBinding } from '../content/skill-generation/ticket-18-faction-review-output-contract-v1.mjs';
import { createFactionReviewTargetsV1 } from '../packages/skill-production-v3/faction-review-targets-v1.mjs';
import { createFactionSlotReviewRuntimeV1, prepareFactionSlotReviewRoleV1 } from '../packages/skill-production-v3/faction-slot-review-runtime-v1.mjs';
import { createFactionStructuredReviewRuntimeV1 } from '../packages/skill-production-v3/faction-structured-review-runtime-v1.mjs';
import { readFactionStructuredSuccessEvidenceV1 } from '../packages/skill-evaluation/faction-structured-success-evidence-v1.mjs';
import { verifyFactionStructuredRoleReplayV1 } from '../packages/skill-evaluation/faction-structured-replay-v1.mjs';
import { createStarcraftTmgProviderCapabilityReceiptV1 } from '../packages/structured-generation/provider-capability-receipt-v1.mjs';
import { createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1 } from '../packages/structured-generation/adapters/deepseek-responses-json-schema-v1.mjs';
import { createStarcraftTmgInMemoryStructuredFaultAdapterV1 } from '../packages/structured-generation/adapters/in-memory-fault-injection-v1.mjs';
import { factionExecutionProfileV1, factionExecutionEgressV1, factionProfileRefV1 } from '../packages/skill-production-v3/faction-execution-model-v1.mjs';
import { STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V6 as contract,
  STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_REF_V6 as contractRef,
  FACTION_REVIEW_SLOT_NAMESPACE_BINDING_V1 as binding } from '../content/skill-generation/ticket-18-faction-review-output-contract-v6.mjs';

const realDsh = process.argv[2] === '--dsh';
if (process.argv.length !== (realDsh ? 3 : 2)) throw new Error('ARGUMENTS_INVALID');
const base = 'build/ticket-18-faction-production-v1/';
const filename = 'build/ticket-17-production-redesign-v1/production.sqlite';
const originRunId = 'faction-v1-8262a9a7181f3ec25c06';
const attemptId = 'structured-76698661eced0d83008fc72ceecbeceb256367eb15b6105f';
const json = async file => verifySeal(JSON.parse(await readFile(base + file + '.json', 'utf8')));
const ownerRecipe = await json(originRunId + '/recipe');
const input = await json(originRunId + '/zerg_swarm-input');
const originalCapabilities = await json(originRunId + '/active-capabilities');
const source = new DatabaseSync(filename, { readOnly: true });
const ledgerHash = () => hash(source.prepare('SELECT * FROM attempts ORDER BY run,id').all());
const beforeHash = ledgerHash();
assert.equal(source.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n, 0);
const readActual = () => {
  assert.equal(source.prepare('SELECT recipe FROM runs WHERE id=?').get(originRunId).recipe, ownerRecipe.hash);
  return { ...readFactionStructuredSuccessEvidenceV1({ filename, runId: originRunId, attemptId }),
    ownerRecipe, capability: originalCapabilities.catalogueReview };
};
const original = readActual();
const correction = verifySeal(JSON.parse(source.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'")
  .get(originRunId, 'faction.zerg_swarm.unit_roles.1.zerg-unit-timing-correction-v1.0').artifact)).value;
const draft = correction.correction.proposedDraft;
const section = createFactionWritingPlanV1(input).sections.find(s => s.id === 'faction.zerg_swarm.unit_roles.1');
const batch = createFactionReviewBatchPlanV1({ section, draft }).batches.find(b => b.first === 2);
const targets = createFactionReviewTargetsV1({ input, section, draft, indices: batch.reviewIndices });
const packet = seal({ id: 'faction.zerg_swarm', inputHash: input.hash, sourceBinding: input.sourceBinding });
const request = { packet, roleId: original.candidate.roleRef.id + '.source-evidence-v1.3cd990702ff2ba8b4acc',
  task: 'Original complete source review; task prose is not used as the structured prompt.',
  workspace: { inputHash: input.hash, section, draft, reviewIndices: batch.reviewIndices,
    coverageRequiredSourceRefs: batch.requiredSourceRefs, outputRequestAtEnd: { targetContract: targets } } };
const policy = { maxOutputUnits: 4096, attemptEstimateMicros: 800000, attemptTokenReserve: 500000,
  allowDefinitelyNotSentRetry: false, allowOneCapacityRetry: false,
  idempotentRetrySupported: false, encryptedRawQuarantineAvailable: false };
const origin = { ownerRunId: originRunId, attemptId, roleRefHash: original.candidate.roleRef.hash,
  contextHash: original.candidate.contextManifestRef.hash };
const legacyPrepared = prepareFactionSlotReviewRoleV1({ input, request, executionPolicy: policy, legacy: true });
assert.equal(legacyPrepared.capsule.hash, origin.contextHash);
const startedAt = new Date().toISOString();
const fakeBinding = seal({ testOnly: true, kind: 'explicit_injected_dsh' });
const implementation = realDsh ? await prepareDshLoop(process.cwd(), { sessionPolicy: 'phased-v1' }) : {
  binding: fakeBinding, async run(args) {
    const commands = [];
    const { hash: ignored, ...loop } = await runDirectLoop({ ...args, callModel: async q => {
      const result = await args.callModel(q); commands.push(result.command); return result;
    } });
    // The pinned DSH records wire JSON, whereas runDirectLoop uses canonical
    // hashing. The explicitly injected transcript must emulate the real port.
    loop.transcript = loop.transcript.map((row, i) => ({ ...row, commandHash: sha256(JSON.stringify(commands[i])) }));
    return seal({ ...loop, runtimeBinding: fakeBinding, sandboxReceipt: { testOnly: true }, directNetworkUsed: false });
  } };
let dshCalls = 0, injectedCalls = 0, checks = 0;
const dsh = { ...implementation, async run(args) { dshCalls++; return implementation.run(args); } };
const directory = await mkdtemp(base + 'slot-review-runtime-');
const reseal = (v, patch = {}) => { const { hash: ignored, ...body } = v; return seal({ ...body, ...patch }); };
const eq = (actual, expected) => { assert.deepEqual(actual, expected); checks++; };
const forbidden = () => assert.fail('Unexpected Provider/fallback use');
const roles = [];
for (const mode of ['legacy_recovery', 'native', 'native_schema_repair']) {
  const isRecovery = mode === 'legacy_recovery';
  const recipe = reseal(ownerRecipe, { reviewSlotNamespaceBinding: binding,
    slotReviewRecoveryOrigins: [origin], dshBindingHash: dsh.binding.hash,
    // The owner recipe remains attached to the historical paid receipt below.
    // A new injected request must exercise the current fallback profile after
    // the beta binding's local stop, never pretend the retired beta is live.
    executionModelBinding: null,
    injectionTest: { mode, directory, realDsh, providerInjected: !isRecovery } });
  const runId = 'faction-v1-' + recipe.hash.slice(0, 20), testDb = directory + '/' + mode + '.sqlite';
  const storeOptions = { runId, recipeHash: recipe.hash };
  let journal = openProductionStore(testDb, storeOptions), roleInput;
  const store = { ...journal,
    acquire(id, value) {
      if (id === request.packet.id + '.' + request.roleId) roleInput = value;
      return journal.acquire(id, value);
    }, finish: (lease, value) => journal.finish(lease, value), release: lease => journal.release(lease),
    globalSummary: () => journal.globalSummary(), artifact: id => journal.artifact(id),
    reserve: (...args) => journal.reserve(...args), settle: (...args) => journal.settle(...args) };
  const profile = factionExecutionProfileV1({ binding: recipe.executionModelBinding });
  const egressBinding = factionExecutionEgressV1(profile);
  const capability = createStarcraftTmgProviderCapabilityReceiptV1({ providerProfileRef: factionProfileRefV1(profile),
    endpointPath: '/responses', endpointDialect: 'deepseek_responses_v1', model: profile.model,
    capability: 'responses_json_schema', schemaSubsetVersion: contract.schemaSubsetVersion, outputContractRef: contractRef,
    probeInputHash: hash('INJECTED V6 PROBE'), probeOutputHash: hash('INJECTED V6 PROBE RESULT'),
    probeResult: 'accepted_schema_valid', usage: { inputUnits: 10, outputUnits: 10, totalUnits: 20 }, usageKnown: true,
    physicalAttempts: 1, probedAt: startedAt, expiresAt: new Date(Date.parse(startedAt) + 3600000).toISOString() });
  const nativeOutput = { verdicts: structuredClone(original.candidate.providerValue.verdicts),
    coverage: original.candidate.providerValue.coverage.map(({ recommendationIndices, ...row }) => ({ ...row, recommendationSlots: [0] })) };
  const invalidOutput = structuredClone(nativeOutput); invalidOutput.verdicts[0].extraTestField = 'remove only this schema-invalid field';
  const fault = createStarcraftTmgInMemoryStructuredFaultAdapterV1({ steps: isRecovery ? [] :
    [...(mode === 'native_schema_repair' ? [{ kind: 'invalid_schema', output: invalidOutput }] : []),
      { kind: 'success', output: nativeOutput }] });
  const sent = [];
  const adapter = createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1({ async send(args) {
    injectedCalls++; sent.push(args);
    const result = structuredClone(await fault.send(args));
    const { receiptHash: ignored, ...body } = result.transportReceipt;
    result.transportReceipt = { ...body, startedAt, receiptHash: hash({ ...body, startedAt }) };
    return result;
  } });
  const nativeOptions = { input, runtime: { role: forbidden }, store, dsh, outputContract: contract,
    capabilityReceipt: capability, providerAdapter: adapter, egressBinding, executionPolicy: policy,
    priceUsage: usage => usage.totalUnits, includeSharedScenarioSources: true, reviewSlotNamespaceBinding: binding };
  if (!isRecovery) {
    assert.throws(() => createFactionStructuredReviewRuntimeV1({ ...nativeOptions, reviewSlotNamespaceBinding: null }),
      { code: 'FACTION_REVIEW_SLOT_NAMESPACE_RUNTIME_BINDING_REQUIRED' }); checks++;
    assert.throws(() => createFactionStructuredReviewRuntimeV1({ ...nativeOptions, allowBoundedOutputCapRecovery: true }),
      { code: 'FACTION_REVIEW_SLOT_NAMESPACE_LEGACY_RECOVERY_UNSCOPED' }); checks++;
  }
  const runtime = () => createFactionSlotReviewRuntimeV1({ input, legacyRuntime: { role: forbidden },
    nativeRuntime: isRecovery ? null : createFactionStructuredReviewRuntimeV1(nativeOptions),
    legacyRoleIds: [], recoveryOrigins: isRecovery ? [origin] : [], readRecoveryEvidence: readActual,
    store, dsh, executionPolicy: policy, reviewSlotNamespaceBinding: binding });
  let value;
  try {
    value = await runtime().role(request);
    eq(value.output.coverage.map(row => row.recommendationIndices), [[2]]);
    eq(value.output.coverage[0].reason, original.candidate.providerValue.coverage[0].reason);
    eq(value.reviewSlotNamespaceBindingHash, binding.hash);
    const outer = validateFactionProductionTargetReviewV1(value.output, { artifact: value,
      targets, input, section, draft, reviewIndices: batch.reviewIndices, requiredSourceRefs: batch.requiredSourceRefs,
      catalogueReviewBinding, reviewSlotNamespaceBinding: binding,
      structuredReviewValidationBinding: seal({ version: 'faction_review_validation_binding_v1',
        outputContractRef: ownerRecipe.structuredReviewBinding.outputContractRef,
        reviewReasonMaximum: 16384, legacyReasonMaximum: 1200, trainingTruth: false }) });
    eq(outer.review.verdicts[0].sourceRefs.length, 11);
    eq(journal.summary().calls, isRecovery ? 0 : mode === 'native_schema_repair' ? 2 : 1);
    if (!isRecovery) {
      eq(sent[0].body.model, profile.model);
      eq(sent[0].body.text.format.schema.properties.coverage.items.required.includes('recommendationSlots'), true);
      eq(sent[0].body.text.format.schema.properties.coverage.items.required.includes('recommendationIndices'), false);
      eq(hash(JSON.parse(sent[0].body.input).orderedBlocks.find(b => b.kind === 'immutable_policy_and_base').value),
        hash(legacyPrepared.capsule.immutableBase));
      eq(Boolean(value.schemaRepairScope), mode === 'native_schema_repair');
    }
  } finally { journal.close(); }
  const callsBeforeRestart = dshCalls;
  journal = openProductionStore(testDb, storeOptions);
  try { eq((await runtime().role(request)).hash, value.hash); eq(dshCalls, callsBeforeRestart); }
  finally { journal.close(); }
  const db = new DatabaseSync(testDb, { readOnly: true });
  const artifacts = db.prepare("SELECT artifact FROM steps WHERE run=? AND state='complete'").all(runId)
    .map(row => verifySeal(JSON.parse(row.artifact)).value);
  const accepted = isRecovery ? original : readFactionStructuredSuccessEvidenceV1({ filename: testDb, runId,
    attemptId: artifacts.find(row => row.hash === value.structuredRuntimeReceiptRef.hash).attemptId });
  const args = { value, roleInput, request, input, recipe,
    resolveArtifact: h => [...artifacts, original.candidate, original.runtimeReceipt].find(row => row.hash === h),
    resolveResponse: h => h === accepted.candidate.providerReceiptHash ? {
      response: verifySeal(JSON.parse(accepted.attempt.response)).value,
      originRunId: isRecovery ? originRunId : runId, originRecipe: isRecovery ? ownerRecipe : recipe } : null,
    resolveCapabilityReceipt: h => [originalCapabilities.catalogueReview, capability].find(row => row.receiptHash === h),
    resolveCompleteReviewImportEvidence: readActual,
    resolveStructuredSuccessEvidence: q => readFactionStructuredSuccessEvidenceV1({ filename: testDb, ...q }) };
  try {
    eq(verifyFactionStructuredRoleReplayV1(args).providerReceiptHashes, [accepted.candidate.providerReceiptHash]);
    for (const mutate of [v => { v.output.coverage[0].recommendationIndices = [3]; },
      v => { v.output.coverage[0].reason += ' altered'; },
      v => { v.hostMaterializationReceipt = reseal(v.hostMaterializationReceipt, { reasonsChanged: true }); }]) {
      const changed = structuredClone(value); mutate(changed);
      assert.throws(() => verifyFactionStructuredRoleReplayV1({ ...args, value: reseal(changed) })); checks++;
    }
    assert.throws(() => verifyFactionStructuredRoleReplayV1({ ...args,
      recipe: reseal(recipe, { reviewSlotNamespaceBinding: null }) }), { code: 'FACTION_REVIEW_SLOT_NAMESPACE_CONSUMER_BINDING_REQUIRED' }); checks++;
    if (isRecovery) {
      assert.throws(() => verifyFactionStructuredRoleReplayV1({ ...args, recipe: reseal(recipe, { slotReviewRecoveryOrigins: [] }) }),
        { code: 'FACTION_REVIEW_SLOT_NAMESPACE_CONSUMER_ORIGIN_REQUIRED' }); checks++;
      assert.throws(() => verifyFactionStructuredRoleReplayV1({ ...args, resolveCompleteReviewImportEvidence: () => ({
        ...readActual(), attempt: { ...original.attempt, request_hash: hash('wrong-request') } }) })); checks++;
    } else {
      assert.throws(() => verifyFactionStructuredRoleReplayV1({ ...args, resolveStructuredSuccessEvidence: null }),
        { code: 'FACTION_REVIEW_SLOT_NAMESPACE_CONSUMER_PAID_READER_REQUIRED' }); checks++;
    }
  } finally { db.close(); }
  roles.push({ mode, value, roleInput, recipeHash: recipe.hash, testDb });
  console.log(JSON.stringify({ stage: 'slot_review_runtime_lane_verified', mode, dshCalls, providerCalls: 0, checks }));
}
eq(ledgerHash(), beforeHash); source.close();
eq(dshCalls, 4); eq(injectedCalls, 3);
const files = ['content/skill-generation/ticket-18-faction-review-output-contract-v6.mjs',
  'packages/skill-production-v3/faction-review-slot-namespace-v1.mjs',
  'packages/skill-production-v3/faction-slot-review-runtime-v1.mjs',
  'packages/skill-production-v3/faction-structured-review-runtime-v1.mjs',
  'packages/skill-production-v3/faction-strategy-workflow-v1.mjs',
  'packages/skill-evaluation/faction-structured-replay-v1.mjs',
  'scripts/verify-ticket-18-slot-review-runtime-v1.mjs'];
const report = seal({ version: 'faction_slot_review_runtime_proof_v1', passed: true, checks, bindingHash: binding.hash,
  directory, originRunId, attemptId, roles, providerCalls: 0, injectedProviderResponses: injectedCalls,
  actualDshSessions: realDsh ? dshCalls : 0, dshInjectionUsed: !realDsh,
  originalAttemptsUnchanged: true, sqliteRestartPassed: true, independentReplayPassed: true,
  nativeSchemaRepairPreservesContext: true, mainProductionWired: false,
  outerWorkflowReviewCallbackPassed: true,
  semanticAcceptance: false, runtimeAccepted: false, trainingTruth: false,
  codeHashes: await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) }))) });
await writeFile(base + (realDsh ? 'slot-review-dsh-runtime-v1.json' : 'slot-review-runtime-v1.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks, providerCalls: 0, actualDshSessions: report.actualDshSessions, hash: report.hash }));
