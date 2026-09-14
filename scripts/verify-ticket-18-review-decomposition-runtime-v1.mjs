import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { hash, seal, verifySeal, sha256 } from '../packages/skill-production/common.mjs';
import { prepareDshLoop } from '../packages/skill-production/loops.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { withCheckpointContinuation } from '../packages/skill-production/continuation.mjs';
import { collectFactionReviewDecompositionStepsV1 } from '../packages/skill-production-v3/faction-review-decomposition-continuation-v1.mjs';
import { readFactionWireReviewFailureV1, prepareFactionReviewDecompositionV1,
  createFactionReviewFragmentCapsuleV1, FACTION_REVIEW_DECOMPOSITION_BINDING_V1 as binding } from '../packages/skill-production-v3/faction-review-decomposition-v1.mjs';
import { createFactionReviewDecompositionRuntimeV1, verifyFactionReviewDecompositionRuntimeV1 } from '../packages/skill-production-v3/faction-review-decomposition-runtime-v1.mjs';
import { readFactionStructuredSuccessEvidenceV1 } from '../packages/skill-evaluation/faction-structured-success-evidence-v1.mjs';
import { STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V5 as originalContract } from '../content/skill-generation/ticket-18-faction-review-output-contract-v1.mjs';
import { FACTION_REVIEW_FRAGMENT_CONTRACTS_V1 as contracts } from '../content/skill-generation/ticket-18-faction-review-fragment-contracts-v1.mjs';
import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V1 as profile } from '../content/skill-generation/offline-provider-profile-v1.mjs';
import { createStarcraftTmgProviderProfileRegistryV2 } from '../packages/secure-provider-runtime/provider-profile-registry-v2.mjs';
import { createStarcraftTmgProviderCapabilityReceiptV1 } from '../packages/structured-generation/provider-capability-receipt-v1.mjs';
import { createStarcraftTmgInMemoryStructuredFaultAdapterV1 } from '../packages/structured-generation/adapters/in-memory-fault-injection-v1.mjs';
import { createFactionWireRecoveryEnvironmentV2, inspectFactionWireKeyHelperV2 } from '../packages/skill-production-v3/faction-wire-recovery-environment-v2.mjs';
import { createFactionStructuredReviewRuntimeV1 } from '../packages/skill-production-v3/faction-structured-review-runtime-v1.mjs';
import { verifyFactionStructuredRoleReplayV1 } from '../packages/skill-evaluation/faction-structured-replay-v1.mjs';
import { contextManifestRefStarcraftTmgV1 } from '../packages/structured-generation/context-capsule-v1.mjs';

const base = 'build/ticket-18-faction-production-v1/';
const read = async name => verifySeal(JSON.parse(await readFile(base + name, 'utf8')));
const diagnosis = await read('terran-wire-context-diagnosis-v2.json');
const input = await read(diagnosis.originRunId + '/terran_armed_forces-input.json');
const originalCapabilities = await read(diagnosis.originRunId + '/active-capabilities.json');
const evidenceArgs = { filename: 'build/ticket-17-production-redesign-v1/production.sqlite',
  runId: diagnosis.originRunId, attemptId: diagnosis.originAttemptId, capsule: diagnosis.capsule,
  invocation: diagnosis.invocation, providerRequest: diagnosis.providerRequest };
const evidence = readFactionWireReviewFailureV1(evidenceArgs);
const w = diagnosis.request.workspace;
const args = { input, evidence, capsule: diagnosis.capsule, originalContract,
  mapping: { section: w.section, draft: w.draft, targets: w.outputRequestAtEnd.targetContract,
    reviewIndices: w.reviewIndices, requiredSourceRefs: w.coverageRequiredSourceRefs } };
const plan = prepareFactionReviewDecompositionV1(args);
const directory = await mkdtemp(base + 'fragment-runtime-'), filename = directory + '/journal.sqlite';
const runId = 'faction-v1-' + hash(directory).slice(0, 20);
const storeOptions = { runId, recipeHash: hash({ binding, test: true }), maxCalls: 12, maxTokens: 6e6, maxCny: 10 };
let store = openProductionStore(filename, storeOptions);
const registry = createStarcraftTmgProviderProfileRegistryV2({ entries: [{ providerProfile: profile, responsePath: '/responses' }],
  allowedProviders: ['deepseek-openai-compatible-direct'] });
const egressBinding = registry.resolveEgressBinding({ profileRef: { id: profile.providerProfileId,
  version: profile.version, hash: profile.integrity.hash } }).egressBinding;
const now = new Date().toISOString(), expiresAt = new Date(Date.now() + 86400000).toISOString();
const capabilities = Object.fromEntries(Object.entries(contracts).map(([kind, c]) => [kind,
  createStarcraftTmgProviderCapabilityReceiptV1({ providerProfileRef: egressBinding.providerProfileRef,
    endpointPath: egressBinding.endpoint.path, endpointDialect: egressBinding.endpointDialect, model: egressBinding.model,
    capability: 'responses_json_schema', outputContractRef: { id: c.id, version: c.version, hash: c.contractHash },
    schemaSubsetVersion: c.schemaSubsetVersion, probeInputHash: hash('injected-' + kind), probeOutputHash: hash('injected-output-' + kind),
    probeResult: 'accepted_schema_valid', usage: { inputUnits: 80, outputUnits: 24, totalUnits: 104 }, usageKnown: true,
    physicalAttempts: 1, probedAt: now, expiresAt })]));
const outputs = plan.jobs.map(job => {
  const p = createFactionReviewFragmentCapsuleV1({ ...args, plan, jobId: job.id });
  return job.kind === 'target' ? { focusPaths: [p.capsule.localIssue.fragmentTask.target.fields[0].path],
    verdict: job.slot ? 'uncertain' : 'unsupported', reason: 'Injected negative judgment; never a real faction qualification.',
    sourceSlots: [diagnosis.capsule.localIssue.reviewTask.sourceCatalogue.find(s =>
      s.ref === p.capsule.localIssue.fragmentTask.target.recommendation.sourceRefs[0]).slot] }
    : { verdict: 'covered', reason: 'Injected coverage fixture, not semantic evidence.',
      recommendationSlots: [w.draft.recommendations.findIndex(r => r.sourceRefs.includes(job.sourceRef))] };
});
const fault = createStarcraftTmgInMemoryStructuredFaultAdapterV1({ steps: outputs.map(output => ({ kind: 'success', output })) });
let sends = 0;
const helperRef = await inspectFactionWireKeyHelperV2();
const makeEnvironment = owner => createFactionWireRecoveryEnvironmentV2({ filename, runId: owner, helperRef,
  providers: [{ egressBinding, send: async q => {
    sends++;
    const response = await fault.send(q);
    const { receiptHash: ignored, ...body } = response.transportReceipt;
    const receipt = { ...body, startedAt: new Date().toISOString() };
    return { ...response, transportReceipt: { ...receipt, receiptHash: hash(receipt) } };
  } }] });
let environment = await makeEnvironment(runId);
const dsh = await prepareDshLoop(process.cwd());
const readSuccessEvidence = q => readFactionStructuredSuccessEvidenceV1({ filename, ...q });
let checks = 0, completionEvents = [];
const eq = (a, b) => { assert.equal(a, b); checks++; };
const ok = value => { assert(value); checks++; };
const factory = extra => createFactionReviewDecompositionRuntimeV1({ store, dsh, egressBinding, capabilities,
  wireRecovery: environment, providerAdapter: environment.adapters.get(egressBinding.providerProfileRef.hash),
  priceUsage: u => u.totalUnits, readOrigin: () => readFactionWireReviewFailureV1(evidenceArgs),
  readSuccessEvidence, onProgress: e => { completionEvents.push(e); console.log(JSON.stringify({ stage: e.stage, job: e.job, fromCache: e.fromCache })); }, ...extra });
const reviewer = (extra = {}, overrides = {}) => createFactionStructuredReviewRuntimeV1({ input, store, dsh,
  runtime: { role: () => assert.fail('No old prompt path') },
  providerAdapter: { complete: () => assert.fail('The original failed request must not be reissued') },
  capabilityReceipt: originalCapabilities.catalogueReview, outputContract: originalContract, egressBinding,
  executionPolicy: binding.executionPolicy, priceUsage: () => assert.fail('No original request repricing'), includeSharedScenarioSources: true,
  reviewDecomposition: { binding, origins: [evidence], runtime: factory(extra), ...overrides } });
const readRows = owner => {
  const db = new DatabaseSync(filename, { readOnly: true });
  try { return { rows: db.prepare("SELECT id,input_hash,artifact FROM steps WHERE run=? AND state='complete'").all(owner)
    .map(r => ({ id: r.id, inputHash: r.input_hash, artifact: verifySeal(JSON.parse(r.artifact)).value })),
    attempts: db.prepare('SELECT * FROM attempts WHERE run=?').all(owner) }; } finally { db.close(); }
};
const collect = (owner, allowedRunIds) => collectFactionReviewDecompositionStepsV1({ args, ...readRows(owner),
  dshBindingHash: dsh.binding.hash, egressBinding, allowedRunIds,
  fullRoleId: diagnosis.request.packet.id + '.' + diagnosis.request.roleId, packetHash: diagnosis.request.packet.hash,
  resolveCapability: h => Object.values(capabilities).find(c => c.receiptHash === h), readSuccessEvidence });
let value, proof, partial, complete;
try {
  await assert.rejects(reviewer({}, { dry: true }).role(diagnosis.request), { code: 'FACTION_PREFLIGHT_REVIEW_DECOMPOSITION_REQUIRED' }); checks++;
  eq(sends, 0);
  await assert.rejects(factory({ capabilities: { target: capabilities.target } }).run(args), { code: 'FACTION_REVIEW_FRAGMENT_CAPABILITY_REQUIRED' }); checks++;
  eq(sends, 0);
  await assert.rejects(reviewer({ onProgress: e => {
    completionEvents.push(e); if (e.completed === 1) throw Object.assign(new Error('Injected interruption after durable child'), { code: 'INJECTED_AFTER_CHILD' });
  } }).role(diagnosis.request), { code: 'INJECTED_AFTER_CHILD' }); checks++;
  eq(sends, 1);
  eq(store.summary().calls, 1);
  partial = collect(runId, [runId]);
  eq(partial.steps.length, 1);
  eq(partial.proof.originalAttemptsCopied, 0);
  assert.throws(() => collect(runId, []), { code: 'FACTION_REVIEW_FRAGMENT_FOREIGN_ANCESTOR' }); checks++;
  console.log(JSON.stringify({ stage: 'restart_after_first_durable_fragment', sends }));
} finally { store.close(); }
// Same-run disk reopening is checked before the actual next-run continuation.
store = openProductionStore(filename, storeOptions);
eq(store.artifact(partial.steps[0].id).hash, partial.steps[0].artifact.hash);
store.close();
const childRunId = 'faction-v1-' + hash(directory + '.child').slice(0, 20);
store = withCheckpointContinuation(openProductionStore(filename, { ...storeOptions, runId: childRunId,
  maxCalls: storeOptions.maxCalls - 1, maxTokens: storeOptions.maxTokens - 160 }), {
  manifest: seal({ parentRunId: runId, parentRecipeHash: storeOptions.recipeHash, reusable: partial.proof.reusable }), steps: partial.steps });
environment = await makeEnvironment(childRunId);
try {
  const role = await reviewer().role(diagnosis.request);
  value = role.decomposition;
  eq(sends, 3);
  eq(store.summary().calls, 2);
  eq(store.summary().knownTokens, 320);
  eq(store.globalSummary().calls, 3);
  eq(value.output.verdicts[0].verdict, 'unsupported');
  eq(value.output.verdicts[1].verdict, 'uncertain');
  ok(completionEvents.some(e => e.job === 'target.0' && e.fromCache));
  const consumerArgs = { ...args, value, egressBinding, capabilities, dshBindingHash: dsh.binding.hash,
    resolveFragment: id => store.artifact(id), readSuccessEvidence };
  proof = verifyFactionReviewDecompositionRuntimeV1(consumerArgs);
  const roleInput = { version: 'starcraft_tmg_faction_structured_review_runtime_v1', packetHash: diagnosis.request.packet.hash,
    roleRef: diagnosis.capsule.roleRef, contextManifestRef: contextManifestRefStarcraftTmgV1(diagnosis.capsule),
    outputContractRef: diagnosis.capsule.outputContractRef, executionPolicyRef: diagnosis.invocation.executionPolicyRef,
    semanticAcceptanceInherited: false };
  const roleProofArgs = { value: role, roleInput, request: diagnosis.request, input,
    recipe: { reviewDecompositionBinding: binding, dshBindingHash: dsh.binding.hash },
    resolveArtifact: identity => {
      const db = new DatabaseSync(filename, { readOnly: true });
      try { const row = db.prepare("SELECT artifact FROM steps WHERE run=? AND state='complete' AND json_extract(artifact,'$.value.hash')=?").get(store.summary().runId, identity);
        return verifySeal(JSON.parse(row.artifact)).value; } finally { db.close(); }
    },
    resolveCapabilityReceipt: identity => Object.values(capabilities).find(c => c.receiptHash === identity),
    resolveReviewWireEvidence: () => readFactionWireReviewFailureV1(evidenceArgs),
    resolveStructuredSuccessEvidence: readSuccessEvidence };
  const roleProof = verifyFactionStructuredRoleReplayV1(roleProofArgs);
  eq(hash(roleProof.providerReceiptHashes), hash(proof.providerReceiptHashes));
  assert.throws(() => verifyFactionStructuredRoleReplayV1({ ...roleProofArgs,
    recipe: { dshBindingHash: dsh.binding.hash } }), { code: 'FACTION_REVIEW_DECOMPOSITION_CONSUMER_BINDING_REQUIRED' }); checks++;
  eq(proof.providerReceiptHashes.length, 4);
  eq(proof.exactNewRequestsRebuilt, true);
  eq(proof.actualStrategyEffectivenessProven, false);
  eq((await factory().run(args)).hash, value.hash);
  eq((await reviewer().role(diagnosis.request)).hash, role.hash);
  eq(sends, 3);
  const reseal = (v, patch) => { const { hash: ignored, ...body } = v; return seal({ ...body, ...patch }); };
  assert.throws(() => verifyFactionReviewDecompositionRuntimeV1({ ...consumerArgs,
    readSuccessEvidence: q => { const r = readSuccessEvidence(q); return { ...r, attempt: { ...r.attempt, request_hash: hash('drift') } }; } }),
  { code: 'FACTION_REVIEW_FRAGMENT_CONSUMER_PROVENANCE_DRIFT' }); checks++;
  assert.throws(() => verifyFactionReviewDecompositionRuntimeV1({ ...consumerArgs,
    value: reseal(value, { output: { ...value.output, verdicts: value.output.verdicts.map(v => ({ ...v, verdict: 'supported' })) } }) }),
  { code: 'FACTION_REVIEW_DECOMPOSITION_CONSUMER_ASSEMBLY_DRIFT' }); checks++;
  const first = store.artifact(value.fragmentRefs[0].id);
  const modified = reseal(first, { loop: reseal(first.loop, { final: { ...first.value, verdict: 'supported' } }) });
  const modifiedRefs = value.fragmentRefs.map((r, i) => i ? r : { ...r, hash: modified.hash });
  assert.throws(() => verifyFactionReviewDecompositionRuntimeV1({ ...consumerArgs,
    value: reseal(value, { fragmentRefs: modifiedRefs }), resolveFragment: id => id === value.fragmentRefs[0].id ? modified : store.artifact(id) }),
  { code: 'FACTION_REVIEW_FRAGMENT_CONSUMER_DSH_DRIFT' }); checks++;
  complete = collect(childRunId, [runId, childRunId]);
  eq(complete.steps.length, 5);
  const unmaterialized = readRows(childRunId);
  assert.throws(() => collectFactionReviewDecompositionStepsV1({ args,
    rows: unmaterialized.rows.filter(r => r.artifact?.jobId !== 'target.1'), attempts: unmaterialized.attempts,
    dshBindingHash: dsh.binding.hash, egressBinding, allowedRunIds: [runId, childRunId],
    fullRoleId: role.roleId, packetHash: diagnosis.request.packet.hash,
    resolveCapability: h => Object.values(capabilities).find(c => c.receiptHash === h), readSuccessEvidence }),
  { code: 'FACTION_REVIEW_FRAGMENT_UNMATERIALIZED_ATTEMPT_STOP' }); checks++;
  store.close();
  const grandchildRunId = 'faction-v1-' + hash(directory + '.grandchild').slice(0, 20);
  store = withCheckpointContinuation(openProductionStore(filename, { ...storeOptions, runId: grandchildRunId,
    maxCalls: storeOptions.maxCalls - 3, maxTokens: storeOptions.maxTokens - 480 }), {
    manifest: seal({ parentRunId: childRunId, parentRecipeHash: storeOptions.recipeHash, reusable: complete.proof.reusable }), steps: complete.steps });
  environment = await makeEnvironment(grandchildRunId);
  eq((await factory().run(args)).hash, value.hash);
  eq((await reviewer().role(diagnosis.request)).hash, role.hash);
  eq(store.summary().calls, 0);
  eq(sends, 3);
  const stopId = 'injected-fragment-payment-stop';
  store.reserve(stopId, { test: 'stop' }, 1, 1);
  store.settle(stopId, { failureReceipt: { code: 'PROVIDER_PAYMENT_REQUIRED' }, code: 'PROVIDER_PAYMENT_REQUIRED' });
  await assert.rejects(factory().run(args), { code: 'API_BALANCE_EXHAUSTED_STOP_ALL_WORK' }); checks++;
  await assert.rejects(reviewer().role(diagnosis.request), { code: 'API_BALANCE_EXHAUSTED_STOP_ALL_WORK' }); checks++;
  eq(sends, 3);
} finally { store.close(); }
const production = new DatabaseSync(evidenceArgs.filename, { readOnly: true });
try { eq(production.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n, 0); }
finally { production.close(); }
eq(readFactionWireReviewFailureV1(evidenceArgs).hash, evidence.hash);
const files = ['scripts/verify-ticket-18-review-decomposition-runtime-v1.mjs',
  'packages/skill-production-v3/faction-review-decomposition-runtime-v1.mjs',
  'packages/skill-production-v3/faction-review-decomposition-v1.mjs',
  'packages/skill-production-v3/faction-review-decomposition-continuation-v1.mjs',
  'packages/skill-production-v3/faction-structured-review-runtime-v1.mjs',
  'packages/skill-evaluation/faction-structured-replay-v1.mjs',
  'packages/skill-evaluation/faction-production-replay-v1.mjs',
  'content/skill-generation/ticket-18-faction-review-fragment-contracts-v1.mjs'];
const report = seal({ version: 'faction_review_decomposition_runtime_component_v1', passed: true, checks, binding,
  directory, planHash: plan.hash, resultHash: value.hash, consumerProof: proof, originalFailureUnchanged: true,
  actualOriginalRequestUsed: true, fullContextPreserved: true, actualSqliteRestartPassed: true,
  actualDshSessions: 3, allNewProviderOutputsInjected: true, allNewCapabilitiesInjected: true,
  providerCalls: 0, injectedTransportCalls: sends, actualOsKeychainUsed: true,
  globalPaymentStopPassed: true, actualReviewWrapperPassed: true, structuredRoleConsumerPassed: true,
  dryNoProviderPassed: true, productionMainWired: false, actualProductionResumed: false,
  crossRunContinuationPassed: true, partialFragmentContinuationPassed: true,
  partialContinuationProof: partial.proof, completeContinuationProof: complete.proof,
  semanticAcceptanceInherited: false, trainingTruth: false,
  codeHashes: await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) }))) });
await writeFile(base + 'review-decomposition-runtime-component-v1.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks, actualDshSessions: 3, providerCalls: 0, injectedTransportCalls: sends,
  actualSqliteRestartPassed: true, productionMainWired: false, hash: report.hash }));
