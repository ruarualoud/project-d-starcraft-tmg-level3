import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { hash, seal, verifySeal, sha256 } from '../packages/skill-production/common.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { prepareDshLoop, runDirectLoop } from '../packages/skill-production/loops.mjs';
import { createFactionWritingPlanV1, createFactionReviewBatchPlanV1,
  validateFactionProductionTargetReviewV1 } from '../packages/skill-production-v3/faction-strategy-workflow-v1.mjs';
import { createFactionReviewTargetsV1 } from '../packages/skill-production-v3/faction-review-targets-v1.mjs';
import { prepareFactionSlotReviewRoleV1 } from '../packages/skill-production-v3/faction-slot-review-runtime-v1.mjs';
import { createFactionStructuredReviewRuntimeV1 } from '../packages/skill-production-v3/faction-structured-review-runtime-v1.mjs';
import { createFactionReviewSourceExpansionV1, FACTION_REVIEW_SOURCE_EXPANSION_BINDING_V1 as expansionBinding }
  from '../packages/skill-production-v3/faction-review-source-expansion-v1.mjs';
import { verifyFactionNativeSlotSchemaFailureV1, materializeFactionSlotReviewV1 }
  from '../packages/skill-production-v3/faction-review-slot-namespace-v1.mjs';
import { readFactionTeachFailureEvidenceV1 } from '../packages/skill-evaluation/faction-teach-failure-evidence-v1.mjs';
import { readFactionStructuredSuccessEvidenceV1 } from '../packages/skill-evaluation/faction-structured-success-evidence-v1.mjs';
import { verifyFactionStructuredRoleReplayV1 } from '../packages/skill-evaluation/faction-structured-replay-v1.mjs';
import { openFactionProductionReplayV1 } from '../packages/skill-evaluation/faction-production-replay-v1.mjs';
import { createStarcraftTmgProviderCapabilityReceiptV1 } from '../packages/structured-generation/provider-capability-receipt-v1.mjs';
import { createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1 } from '../packages/structured-generation/adapters/deepseek-responses-json-schema-v1.mjs';
import { createStarcraftTmgInMemoryStructuredFaultAdapterV1 } from '../packages/structured-generation/adapters/in-memory-fault-injection-v1.mjs';
import { factionExecutionProfileV1, factionExecutionEgressV1, factionProfileRefV1 } from '../packages/skill-production-v3/faction-execution-model-v1.mjs';
import { STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V6 as contract,
  STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_REF_V6 as contractRef,
  FACTION_REVIEW_SLOT_NAMESPACE_BINDING_V1 as slotBinding } from '../content/skill-generation/ticket-18-faction-review-output-contract-v6.mjs';

const realDsh = process.argv[2] === '--dsh';
assert.equal(process.argv.length, realDsh ? 3 : 2);
const files = ['packages/skill-production-v3/faction-review-source-expansion-v1.mjs',
  'packages/skill-production-v3/faction-review-slot-namespace-v1.mjs',
  'packages/skill-production-v3/faction-structured-review-runtime-v1.mjs',
  'packages/skill-evaluation/faction-structured-replay-v1.mjs',
  'packages/skill-evaluation/faction-production-replay-v1.mjs',
  'scripts/verify-ticket-18-source-expansion-runtime-v1.mjs'];
const codeBefore = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) })));
const base = 'build/ticket-18-faction-production-v1/', originRunId = 'faction-v1-e35baf291d46af687809';
const filename = 'build/ticket-17-production-redesign-v1/production.sqlite';
const json = async name => verifySeal(JSON.parse(await readFile(base + originRunId + '/' + name + '.json', 'utf8')));
const input = await json('zerg_swarm-input'), ownerRecipe = await json('recipe'), capabilities = await json('active-capabilities');
const actual = new DatabaseSync(filename, { readOnly: true });
const originalLedgerHash = () => hash(actual.prepare('SELECT * FROM attempts ORDER BY run,id').all());
const ledgerBefore = originalLedgerHash();
assert.equal(actual.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n, 0);
const artifact = id => verifySeal(JSON.parse(actual.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'")
  .get(originRunId, id).artifact)).value;
const rejected = artifact('structured-67644acbf8b1391d43179cf89cae2bd7a23ee30ee2248748.rejected-candidate');
const candidate = artifact('structured-6b514c78ccc815d4224adb4add808188556301ad932efdcc.candidate');
const draft = artifact('faction.zerg_swarm.unit_roles.2.known-rule-correction').draft;
const section = createFactionWritingPlanV1(input).sections.find(s => s.id === 'faction.zerg_swarm.unit_roles.2');
const batch = createFactionReviewBatchPlanV1({ section, draft }).batches.find(b => b.first === 4);
const targets = createFactionReviewTargetsV1({ input, section, draft, indices: batch.reviewIndices });
const packet = seal({ id: 'faction.zerg_swarm', inputHash: input.hash, sourceBinding: input.sourceBinding });
const request = { packet, roleId: rejected.roleRef.id, workspace: { inputHash: input.hash, section, draft,
  reviewIndices: batch.reviewIndices, coverageRequiredSourceRefs: batch.requiredSourceRefs,
  outputRequestAtEnd: { targetContract: targets } } };
const policy = { maxOutputUnits: 4096, attemptEstimateMicros: 800000, attemptTokenReserve: 500000,
  allowDefinitelyNotSentRetry: false, allowOneCapacityRetry: false,
  idempotentRetrySupported: false, encryptedRawQuarantineAvailable: false };
const prepared = prepareFactionSlotReviewRoleV1({ input, request, executionPolicy: policy });
assert.equal(prepared.capsule.hash, rejected.contextManifestRef.hash);
const reseal = (v, patch = {}) => { const { hash: ignored, ...body } = v; return seal({ ...body, ...patch }); };
let checks = 0, dshCalls = 0, injectedCalls = 0;
const eq = (a, b) => { assert.deepEqual(a, b); checks++; };
const rejects = (fn, code) => { assert.throws(fn, code ? { code } : undefined); checks++; };
const originFailure = { ...readFactionTeachFailureEvidenceV1({ filename, runId: originRunId,
  attemptId: 'structured-67644acbf8b1391d43179cf89cae2bd7a23ee30ee2248748' }),
  ownerRecipe, capability: capabilities.slotReview };
eq(verifyFactionNativeSlotSchemaFailureV1({ ...prepared.mapping, capsule: prepared.capsule,
  evidence: originFailure }).providerReceiptHash, rejected.safeReceiptHash);
const expanded = createFactionReviewSourceExpansionV1({ input, baseCapsule: prepared.capsule, triggerOutput: candidate.providerValue });
const mappingProof = { baseCapsule: prepared.capsule, triggerOutput: candidate.providerValue, preparationHash: expanded.hash };
rejects(() => materializeFactionSlotReviewV1({ ...prepared.mapping, capsule: prepared.capsule,
  providerOutput: candidate.providerValue, reviewReasonMaximum: 16384 }), 'FACTION_STRUCTURED_REVIEW_SOURCE_SLOT_INVALID');
rejects(() => materializeFactionSlotReviewV1({ ...prepared.mapping, capsule: expanded.context,
  providerOutput: candidate.providerValue, reviewReasonMaximum: 16384 }), 'FACTION_REVIEW_SOURCE_EXPANSION_CONTEXT_PROOF_REQUIRED');
// This is a Host-component probe only. The original paid output is NOT
// reclassified as if it had read the expanded body.
const host = materializeFactionSlotReviewV1({ ...prepared.mapping, capsule: expanded.context,
  sourceContextExpansion: mappingProof, providerOutput: candidate.providerValue, reviewReasonMaximum: 16384 });
eq(host.output.verdicts[0].verdict, 'unsupported');
eq(host.receipt.judgmentsChanged, false);

const fakeBinding = seal({ testOnly: true, kind: 'explicit_injected_dsh' });
const implementation = realDsh ? await prepareDshLoop(process.cwd(), { sessionPolicy: 'phased-v1' }) : {
  binding: fakeBinding, async run(args) {
    const commands = [];
    const { hash: ignored, ...loop } = await runDirectLoop({ ...args, callModel: async q => {
      const result = await args.callModel(q); commands.push(result.command); return result;
    } });
    loop.transcript = loop.transcript.map((row, i) => ({ ...row, commandHash: sha256(JSON.stringify(commands[i])) }));
    return seal({ ...loop, runtimeBinding: fakeBinding, sandboxReceipt: { testOnly: true }, directNetworkUsed: false });
  } };
const directory = await mkdtemp(base + 'source-expansion-runtime-');
const results = [];
for (const mode of ['fresh_review', 'schema_both_phases_restart', 'prior_e35', 'unknown_slot', 'second_gap', 'disabled']) {
  const hasSchema = mode === 'schema_both_phases_restart';
  const priorMode = mode === 'prior_e35';
  const recipe = reseal(ownerRecipe, { reviewSourceExpansionBinding: mode === 'disabled' ? null : expansionBinding,
    continuation: null, executionPolicyBinding: null,
    dshBindingHash: implementation.binding.hash, injectionTest: { directory, mode, realDsh } });
  const runId = 'faction-v1-' + recipe.hash.slice(0, 20), testDb = directory + '/' + mode + '.sqlite';
  const storeOptions = { runId, recipeHash: recipe.hash };
  let store = openProductionStore(testDb, storeOptions);
  const startedAt = new Date().toISOString(), profile = factionExecutionProfileV1({ binding: recipe.executionModelBinding });
  const capability = priorMode ? capabilities.slotReview : createStarcraftTmgProviderCapabilityReceiptV1({ providerProfileRef: factionProfileRefV1(profile),
    endpointPath: '/responses', endpointDialect: 'deepseek_responses_v1', model: profile.model,
    capability: 'responses_json_schema', schemaSubsetVersion: contract.schemaSubsetVersion, outputContractRef: contractRef,
    probeInputHash: hash('INJECTED PROBE'), probeOutputHash: hash('INJECTED RESULT'), probeResult: 'accepted_schema_valid',
    usage: { inputUnits: 10, outputUnits: 10, totalUnits: 20 }, usageKnown: true, physicalAttempts: 1,
    probedAt: startedAt, expiresAt: new Date(Date.parse(startedAt) + 3600000).toISOString() });
  const probeLease = store.reserve('injected.capability.probe', { testOnly: true, hash: capability.receiptHash }, 1, 20);
  assert.equal(probeLease.cached, false);
  store.settle('injected.capability.probe', { usage: { inputUnits: 10, outputUnits: 10, totalUnits: 20 },
    costMicros: 0, response: { ok: true, capabilityReceipt: capability, injectionTestOnly: true } });
  const trigger = structuredClone(candidate.providerValue), fresh = structuredClone(candidate.providerValue);
  // Injected review retains the source objection. This is NOT a model result.
  fresh.verdicts[0].reason += ' [Injected review fixture, not production strategy acceptance.]';
  if (mode === 'unknown_slot') trigger.verdicts[0].sourceSlots.push(511);
  if (mode === 'second_gap') fresh.verdicts[0].sourceSlots.push(prepared.capsule.localIssue.reviewTask.sourceCatalogue
    .find(s => s.slot !== 365 && s.includedAs === 'not_in_current_faction_scope').slot);
  const invalidFresh = structuredClone(fresh); delete invalidFresh.verdicts[0].sourceSlots;
  const steps = [...(priorMode ? [] : [...(hasSchema ? [{ kind: 'invalid_schema', output: rejected.providerValue }] : []),
    { kind: 'success', output: trigger },
    ...(hasSchema ? [{ kind: 'invalid_schema', output: invalidFresh }] : [])]), { kind: 'success', output: fresh }];
  const fault = createStarcraftTmgInMemoryStructuredFaultAdapterV1({ steps }), sent = [];
  const adapter = createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1({ async send(args) {
    injectedCalls++; sent.push(args);
    const result = structuredClone(await fault.send(args));
    const { receiptHash: ignored, ...body } = result.transportReceipt;
    result.transportReceipt = { ...body, startedAt, receiptHash: hash({ ...body, startedAt }) };
    return result;
  } });
  let interruptOnce = hasSchema;
  const dsh = { ...implementation, async run(args) {
    dshCalls++;
    const result = await implementation.run(args);
    if (interruptOnce && args.task.includes('.source-context-expansion.1.schema') === false
      && args.task.includes('Repair only') && args.task.includes('.source-context-expansion.1')) {
      interruptOnce = false;
      throw Object.assign(new Error('INJECTED_AFTER_PAID_RESPONSE_INTERRUPTION'), { code: 'INJECTED_AFTER_PAID_RESPONSE_INTERRUPTION' });
    }
    return result;
  } };
  const runtime = () => createFactionStructuredReviewRuntimeV1({ input, runtime: { role() { assert.fail('fallback'); } },
    store, dsh, providerAdapter: adapter, egressBinding: factionExecutionEgressV1(profile),
    capabilityReceipt: capability, outputContract: contract, executionPolicy: policy,
    priceUsage: u => u.totalUnits, reviewSlotNamespaceBinding: slotBinding,
    reviewSourceExpansionBinding: recipe.reviewSourceExpansionBinding, includeSharedScenarioSources: true,
    readPriorReviewAttempt: priorMode ? identity => {
      const row = actual.prepare('SELECT * FROM attempts WHERE run=? AND id=?').get(originRunId, identity.attemptId);
      if (!row) return null;
      if (row.state === 'failed') return { ...originFailure, runtimeReceipt: artifact(identity.attemptId + '.runtime-receipt') };
      return { ...readFactionStructuredSuccessEvidenceV1({ filename, runId: originRunId, attemptId: identity.attemptId }),
        ownerRecipe, capability: capabilities.slotReview };
    } : null });
  let value;
  try {
    if (['unknown_slot', 'second_gap', 'disabled'].includes(mode)) {
      await assert.rejects(() => runtime().role(request), { code: mode === 'unknown_slot'
        ? 'FACTION_REVIEW_SOURCE_EXPANSION_UNKNOWN_SLOT' : 'FACTION_STRUCTURED_REVIEW_SOURCE_SLOT_INVALID' }); checks++;
      eq(sent.length, mode === 'second_gap' ? 2 : 1);
      results.push({ mode, rejected: true, injectedResponses: sent.length });
      continue;
    }
    if (hasSchema) {
      await assert.rejects(() => runtime().role(request), { code: 'INJECTED_AFTER_PAID_RESPONSE_INTERRUPTION' }); checks++;
      eq(sent.length, 4);
      store.close(); store = openProductionStore(testDb, storeOptions);
    }
    value = await runtime().role(request);
    eq(sent.length, priorMode ? 1 : hasSchema ? 4 : 2);
    eq(value.sourceContextExpansion.originalReviewAccepted, false);
    eq(value.sourceContextExpansion.preparationHash, expanded.hash);
    eq(Boolean(value.sourceContextExpansion.trigger.schemaRepairScope), hasSchema || priorMode);
    eq(Boolean(value.schemaRepairScope), hasSchema);
    eq(value.output.verdicts[0].verdict, 'unsupported');
    eq(value.hostMaterializationReceipt.judgmentsChanged, false);
    const freshRequest = sent.find(s => s.body.instructions.includes('fresh source review'));
    assert(freshRequest); checks++;
    const blocks = JSON.parse(freshRequest.body.input).orderedBlocks;
    eq(blocks.find(b => b.kind === 'immutable_policy_and_base').value, prepared.capsule.immutableBase);
    eq(blocks.find(b => b.kind === 'dependency_closure').value.nodes.find(n => n.ref === 'source:tactical_cards:supply_depot').hash,
      expanded.expandedSources[0].sourceHash);
    const full = validateFactionProductionTargetReviewV1(value.output, { ...prepared.mapping, artifact: value,
      reviewSlotNamespaceBinding: slotBinding });
    eq(full.review.verdicts[0].verdict, 'unsupported');
    const callsBefore = dshCalls;
    store.close(); store = openProductionStore(testDb, storeOptions);
    eq((await runtime().role(request)).hash, value.hash); eq(dshCalls, callsBefore);
  } finally { store.close(); }
  if (!value) continue;
  const db = new DatabaseSync(testDb, { readOnly: true });
  try {
    const artifacts = db.prepare("SELECT artifact FROM steps WHERE run=? AND state='complete'").all(runId)
      .map(r => verifySeal(JSON.parse(r.artifact)).value);
    const attempts = db.prepare('SELECT * FROM attempts WHERE run=?').all(runId);
    const args = { value, roleInput: prepared.roleInput, request, input, recipe,
      resolveArtifact: h => artifacts.find(a => a.hash === h),
      resolveCapabilityReceipt: h => [capability, capabilities.slotReview].find(c => c.receiptHash === h),
      resolveResponse: h => {
        const row = attempts.find(a => a.state === 'received' && verifySeal(JSON.parse(a.response)).value.usageReceipt?.receiptHash === h);
        if (!row && priorMode && h === candidate.providerReceiptHash) {
          const response = verifySeal(JSON.parse(actual.prepare('SELECT response FROM attempts WHERE run=? AND id=?')
            .get(originRunId, 'structured-6b514c78ccc815d4224adb4add808188556301ad932efdcc').response)).value;
          return { response, originRunId, originRecipe: ownerRecipe };
        }
        return row ? { response: verifySeal(JSON.parse(row.response)).value, originRunId: runId, originRecipe: recipe } : null;
      },
      resolveStructuredSuccessEvidence: q => readFactionStructuredSuccessEvidenceV1({ filename: q.runId === originRunId ? filename : testDb, ...q }),
      resolveStructuredSchemaFailureEvidence: h => {
        if (priorMode && h === rejected.hash) return originFailure;
        const savedRejected = artifacts.find(a => a.hash === h);
        return { ...readFactionTeachFailureEvidenceV1({ filename: testDb, runId,
          attemptId: 'structured-' + savedRejected.invocationHash.slice(0, 48) }), ownerRecipe: recipe };
      } };
    eq(verifyFactionStructuredRoleReplayV1(args).providerReceiptHashes.length, priorMode ? 3 : hasSchema ? 4 : 2);
    rejects(() => verifyFactionStructuredRoleReplayV1({ ...args,
      recipe: reseal(recipe, { reviewSourceExpansionBinding: null }) }), 'FACTION_REVIEW_SOURCE_EXPANSION_CONSUMER_BINDING_REQUIRED');
    for (const change of [e => { e.preparationHash = hash('wrong'); }, e => { e.originalReviewAccepted = true; },
      e => { e.trigger.contextCapsuleHash = hash('wrong'); },
      e => { e.trigger.structuredCandidateRef = value.structuredCandidateRef; }]) {
      const e = structuredClone(value.sourceContextExpansion); change(e);
      rejects(() => verifyFactionStructuredRoleReplayV1({ ...args,
        value: reseal(value, { sourceContextExpansion: reseal(e) }) }));
    }
    if (hasSchema || priorMode) rejects(() => verifyFactionStructuredRoleReplayV1({ ...args, resolveStructuredSchemaFailureEvidence: null }));
    if (!priorMode) {
      const replay = openFactionProductionReplayV1({ filename: testDb, runId, recipe, input });
      try {
        replay.bindRoleRequest(request);
        eq(replay.store.acquire(prepared.fullRoleId, prepared.roleInput).artifact.hash, value.hash);
        eq(replay.evidence().actualProviderReceiptHashes.length, hasSchema ? 4 : 2);
      } finally { replay.close(); }
    }
    results.push({ mode, roleHash: value.hash, independentReplayPassed: true, sqliteRestartPassed: true,
      injectedResponses: sent.length, noRepeatSendAfterInterruptedSchemaRepair: hasSchema,
      originalPaidResponsesReused: priorMode ? 2 : 0, coldConsumerPassed: !priorMode });
  } finally { db.close(); }
  console.log(JSON.stringify({ stage: 'source_expansion_runtime_lane_verified', mode, checks, dshCalls, providerCalls: 0 }));
}
eq(originalLedgerHash(), ledgerBefore); actual.close();
const codeAfter = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) })));
eq(codeAfter, codeBefore);
const report = seal({ version: 'faction_review_source_expansion_runtime_proof_v1', passed: true, checks,
  bindingHash: expansionBinding.hash, results, directory, originRunId, originalLedgerHash: ledgerBefore,
  providerCalls: 0, injectedProviderResponses: injectedCalls, actualDshSessions: realDsh ? dshCalls : 0,
  dshInjectionUsed: !realDsh, independentReplayPassed: true, sqliteRestartPassed: true,
  productionEntryWired: false, freshProductionReviewPerformed: false,
  originalReviewAccepted: false, semanticAcceptance: false, runtimeAccepted: false, trainingTruth: false,
  codeHashes: codeAfter });
await writeFile(base + (realDsh ? 'source-expansion-dsh-runtime-v1.json' : 'source-expansion-runtime-v1.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks, injectedCalls, providerCalls: 0, actualDshSessions: report.actualDshSessions, hash: report.hash }));
