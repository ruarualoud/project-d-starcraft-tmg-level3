import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { hash, seal, verifySeal, sha256 } from '../packages/skill-production/common.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { prepareDshLoop } from '../packages/skill-production/loops.mjs';
import { createFactionWritingPlanV1, createFactionReviewBatchPlanV1,
  validateFactionProductionTargetReviewV1 } from '../packages/skill-production-v3/faction-strategy-workflow-v1.mjs';
import { createFactionReviewTargetsV1 } from '../packages/skill-production-v3/faction-review-targets-v1.mjs';
import { prepareFactionSlotReviewRoleV1 } from '../packages/skill-production-v3/faction-slot-review-runtime-v1.mjs';
import { materializeFactionSlotReviewV1 } from '../packages/skill-production-v3/faction-review-slot-namespace-v1.mjs';
import { authenticateFactionStructuralReviewV1, readFactionStructuralReviewOriginV1 } from '../packages/skill-production-v3/faction-structural-json-environment-v1.mjs';
import { createFactionStructuralReviewRuntimeV1, verifyFactionStructuralReviewRoleV1,
  FACTION_STRUCTURAL_JSON_REVIEW_BINDING_V1 as roleBinding } from '../packages/skill-production-v3/faction-structural-json-runtime-v1.mjs';
import { inspectFactionWireKeyHelperV2 } from '../packages/skill-production-v3/faction-wire-recovery-environment-v2.mjs';
import { materializeStructuralJsonRecoveryV1, verifyStructuralJsonRecoveryRecordV1,
  AUTHENTICATED_STRUCTURAL_JSON_RECOVERY_BINDING_V1 as binding } from '../packages/structured-generation/authenticated-structural-json-recovery-v1.mjs';
import { STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V6 as contract,
  FACTION_REVIEW_SLOT_NAMESPACE_BINDING_V1 as slotBinding } from '../content/skill-generation/ticket-18-faction-review-output-contract-v6.mjs';
import { STARCRAFT_TMG_FACTION_REVIEW_CATALOGUE_BINDING_V1 as catalogueReviewBinding } from '../content/skill-generation/ticket-18-faction-review-output-contract-v1.mjs';

const base = 'build/ticket-18-faction-production-v1/', filename = 'build/ticket-17-production-redesign-v1/production.sqlite';
const runId = 'faction-v1-0a2eb5fe91b8ae51677a', attemptId = 'structured-46a45df4d1115da71ccf8b23c5a3cb26727a227d32acef25';
const json = async file => verifySeal(JSON.parse(await readFile(base + file + '.json', 'utf8')));
const ownerRecipe = await json(runId + '/recipe'), input = await json(runId + '/zerg_swarm-input');
const source = new DatabaseSync(filename, { readOnly: true });
const ledgerHash = () => hash(source.prepare('SELECT * FROM attempts ORDER BY run,id').all());
const before = ledgerHash();
assert.equal(source.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n, 0);
const artifact = id => verifySeal(JSON.parse(source.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'").get(runId, id).artifact)).value;
const issue = artifact(attemptId + '.wire-issue-v2');
const origin = { runId, attemptId, issueHash: issue.hash };
const correction = artifact('faction.zerg_swarm.unit_roles.2.known-rule-correction');
const draft = correction.draft;
const section = createFactionWritingPlanV1(input).sections.find(s => s.id === 'faction.zerg_swarm.unit_roles.2');
const batch = createFactionReviewBatchPlanV1({ section, draft }).batches.find(b => b.first === 2);
const targets = createFactionReviewTargetsV1({ input, section, draft, indices: batch.reviewIndices });
const packet = seal({ id: 'faction.zerg_swarm', inputHash: input.hash, sourceBinding: input.sourceBinding });
const request = { packet, roleId: issue.invocation.roleRef.id + '.source-evidence-v1.3cd990702ff2ba8b4acc',
  task: 'Original complete structured review; task prose does not form the structured prompt.',
  workspace: { inputHash: input.hash, section, draft, reviewIndices: batch.reviewIndices,
    coverageRequiredSourceRefs: batch.requiredSourceRefs, outputRequestAtEnd: { targetContract: targets } } };
const executionPolicy = { maxOutputUnits: 4096, attemptEstimateMicros: 800000, attemptTokenReserve: 500000,
  allowDefinitelyNotSentRetry: false, allowOneCapacityRetry: false,
  idempotentRetrySupported: false, encryptedRawQuarantineAvailable: false };
const prepared = prepareFactionSlotReviewRoleV1({ input, request, executionPolicy });
assert.equal(prepared.capsule.hash, issue.invocation.contextManifestRef.hash);
const helperRef = await inspectFactionWireKeyHelperV2();
const args = { filename, origin, ownerRecipe, prepared, executionPolicy, helperRef };
const authenticate = () => authenticateFactionStructuralReviewV1(args);
let checks = 0;
const eq = (a, b) => { assert.deepEqual(a, b); checks++; };
eq(readFactionStructuralReviewOriginV1({ filename, currentRunId: runId, prepared }), origin);
eq(readFactionStructuralReviewOriginV1({ filename, origins: [origin], prepared }), origin);
eq(readFactionStructuralReviewOriginV1({ filename, origins: [origin], currentRunId: runId, prepared }), origin);
eq(readFactionStructuralReviewOriginV1({ filename, prepared }), null);
assert.throws(() => readFactionStructuralReviewOriginV1({ filename, origins: [{ ...origin, issueHash: hash('wrong-issue') }], prepared }),
  { code: 'FACTION_STRUCTURAL_JSON_SELECTED_ORIGIN_DRIFT' }); checks++;
assert.throws(() => readFactionStructuralReviewOriginV1({ filename, origins: [origin],
  prepared: { ...prepared, capsule: { ...prepared.capsule, hash: hash('wrong-context') } } }),
  { code: 'FACTION_STRUCTURAL_JSON_SELECTED_CONTEXT_DRIFT' }); checks++;
const one = await authenticate(), two = await authenticate();
eq(one.proof.hash, two.proof.hash); assert.notEqual(one.accessReceiptHash, two.accessReceiptHash); checks++;
eq(hash(one.proof.providerValue), '297967af986ddc06829cc8dea7f320a1afaa4efeff44b913f80dc02185cb1f73');
eq(one.proof.normalization.edits.map(e => e.offsetUtf16), [1159, 2492]);
eq(one.proof.originalRequestHash, issue.providerRequestHash);
const mapping = { ...prepared.mapping, capsule: prepared.capsule, reviewReasonMaximum: 16384, reviewSourceMaximum: 128 };
const materialized = materializeFactionSlotReviewV1({ ...mapping, providerOutput: one.proof.providerValue });
const outerArgs = { ...prepared.mapping, artifact: seal({ outputContractRef: prepared.roleInput.outputContractRef,
  structuredDecodePassed: true, reviewSlotNamespaceBindingHash: slotBinding.hash }), catalogueReviewBinding,
  reviewSlotNamespaceBinding: slotBinding, structuredReviewValidationBinding: seal({
    version: 'faction_review_validation_binding_v1', outputContractRef: ownerRecipe.structuredReviewBinding.outputContractRef,
    reviewReasonMaximum: 16384, legacyReasonMaximum: 1200, trainingTruth: false }) };
validateFactionProductionTargetReviewV1(materialized.output, outerArgs); checks++;
console.log(JSON.stringify({ stage: 'actual_full_context_paid_owner_and_host_mapping_passed', checks,
  contextHash: prepared.capsule.hash, proofHash: one.proof.hash, hostHash: materialized.receipt.hash, providerCalls: 0 }));
const reseal = (v, patch) => { const { hash: ignored, ...body } = v; return seal({ ...body, ...patch }); };
for (const changed of [
  { origin: { ...origin, issueHash: hash('foreign-issue') } },
  { origin: { ...origin, runId: 'faction-v1-8262a9a7181f3ec25c06' } },
  { executionPolicy: { ...executionPolicy, maxOutputUnits: 4097 } },
  { prepared: { ...prepared, roleInput: { ...prepared.roleInput, roleRef: { ...prepared.roleInput.roleRef, hash: hash('wrong-role') } } } },
  { prepared: { ...prepared, capsule: reseal(prepared.capsule, { instructions: 'shortened context' }) } },
]) { await assert.rejects(authenticateFactionStructuralReviewV1({ ...args, ...changed })); checks++; }
const directory = await mkdtemp(base + 'authenticated-structural-json-'), testFile = directory + '/journal.sqlite';
const options = { runId: 'structural-json-fixture-' + hash(directory).slice(0, 16), recipeHash: hash({ binding, proofHash: one.proof.hash }) };
let store = openProductionStore(testFile, options);
const native = await prepareDshLoop(process.cwd(), { sessionPolicy: 'phased-v1' });
let dshCalls = 0;
const dsh = { ...native, run: q => { dshCalls++; return native.run(q); } };
let saved;
let roleValue, delegatedCalls = 0, newlyObserved = false, stopAuthentication = false;
const runtime = () => createFactionStructuralReviewRuntimeV1({
  runtime: { role: async () => { delegatedCalls++; newlyObserved = true; throw Object.assign(new Error('injected delegated failure'), { code: 'INJECTED_WIRE_STOP' }); } },
  input, store, dsh, executionPolicy, selectedBinding: roleBinding,
  readOrigin: async () => newlyObserved ? origin : null,
  authenticateOrigin: async () => {
    if (stopAuthentication) throw Object.assign(new Error('injected expired raw'), { code: 'RAW_QUARANTINE_EXPIRED' });
    return authenticate();
  } });
try {
  saved = await materializeStructuralJsonRecoveryV1({ authenticate, store, dsh });
  eq(saved.fromCache, false); eq(dshCalls, 1); eq(store.summary().calls, 0);
  const independentlyAuthenticated = (await authenticate()).proof;
  verifyStructuralJsonRecoveryRecordV1({ record: saved.record, authenticated: independentlyAuthenticated, dshBindingHash: dsh.binding.hash }); checks++;
  for (const mutate of [v => { v.proof = reseal(v.proof, { providerValue: {} }); },
    v => { v.additionalProviderAttempts = 1; }, v => { v.semanticAcceptanceInherited = true; },
    v => { v.loop = reseal(v.loop, { final: {} }); }, v => { v.loop = reseal(v.loop, { directNetworkUsed: true }); }]) {
    const changed = structuredClone(saved.record); mutate(changed);
    assert.throws(() => verifyStructuralJsonRecoveryRecordV1({ record: reseal(changed, {}), authenticated: independentlyAuthenticated,
      dshBindingHash: dsh.binding.hash })); checks++;
  }
  roleValue = await runtime().role(request);
  eq(delegatedCalls, 1); eq(dshCalls, 1); eq(roleValue.structuredCandidateRef, null);
  eq(roleValue.structuralJsonRecoveryRecord.hash, saved.record.hash);
  eq(hash(roleValue.output), hash(materialized.output));
  eq(roleValue.output.coverage, []);
  validateFactionProductionTargetReviewV1(roleValue.output, { ...outerArgs, artifact: roleValue }); checks++;
  const consumerArgs = { value: roleValue, prepared, authenticated: (await authenticate()).proof,
    dshBindingHash: dsh.binding.hash, selectedBinding: roleBinding };
  eq(verifyFactionStructuralReviewRoleV1(consumerArgs).providerReceiptHashes, [issue.originalProviderReceiptHash]);
  for (const mutate of [v => { v.output.verdicts[0].reason += ' altered'; },
    v => { v.output.verdicts[0].targetId = v.output.verdicts[1].targetId; },
    v => { v.structuralJsonRecoveryOrigin.issueHash = hash('wrong-origin'); },
    v => { v.hostMaterializationReceipt = reseal(v.hostMaterializationReceipt, { reasonsChanged: true }); },
    v => { v.roleInputHash = hash('shortened-context'); }, v => { v.structuredCandidateRef = { hash: hash('fake-success') }; }]) {
    const changed = structuredClone(roleValue); mutate(changed);
    assert.throws(() => verifyFactionStructuralReviewRoleV1({ ...consumerArgs, value: reseal(changed, {}) })); checks++;
  }
} finally { store.close(); }
store = openProductionStore(testFile, options);
try {
  eq((await materializeStructuralJsonRecoveryV1({ authenticate, store, dsh })).record.hash, saved.record.hash);
  eq(dshCalls, 1); eq(store.summary().calls, 0);
  eq((await runtime().role(request)).hash, roleValue.hash); eq(delegatedCalls, 1); eq(dshCalls, 1);
  stopAuthentication = true;
  try { await assert.rejects(runtime().role(request), { code: 'RAW_QUARANTINE_EXPIRED' }); checks++; }
  finally { stopAuthentication = false; }
  await assert.rejects(materializeStructuralJsonRecoveryV1({ store, dsh, authenticate: async () => {
    throw Object.assign(new Error('expired'), { code: 'RAW_QUARANTINE_EXPIRED' });
  } }), { code: 'RAW_QUARANTINE_EXPIRED' }); checks++;
  await assert.rejects(materializeStructuralJsonRecoveryV1({ store: { ...store, globalSummary: () => ({ attempts: [{ code: 'PROVIDER_PAYMENT_REQUIRED' }] }) },
    dsh, authenticate }), { code: 'API_BALANCE_EXHAUSTED_STOP_ALL_WORK' }); checks++;
  eq(dshCalls, 1);
} finally { store.close(); }
const innerOwned = seal({ output: materialized.output, roleId: prepared.fullRoleId,
  sourceDelivery: 'proof_carrying_whole_section_review_capsule',
  contextCapsuleHash: prepared.capsule.hash, initialContextCapsuleHash: prepared.capsule.hash,
  sharedScenarioSourcesIncluded: true, outputContractRef: prepared.roleInput.outputContractRef,
  parsedReviewValueRef: { hash: hash('inner-parsed-review-record') }, parsedReviewValues: [seal({
    version: 'faction_parsed_review_value_v1', fixtureOnly: true, trainingTruth: false })],
  hostMaterializationReceipt: materialized.receipt, reviewSlotNamespaceBindingHash: slotBinding.hash,
  toolReadRefs: [], toolTrace: [], structuredDecodePassed: true,
  semanticAcceptance: false, trainingTruth: false });
let routeStore = openProductionStore(testFile, { ...options,
  runId: 'structural-route-' + hash({ directory, route: 'inner' }).slice(0, 16) });
try {
  const seeded = routeStore.acquire(prepared.fullRoleId, prepared.roleInput);
  routeStore.finish(seeded, innerOwned);
  let innerCalls = 0;
  const innerRuntime = { role: async actualRequest => {
    innerCalls++;
    assert.equal(actualRequest.roleId, request.roleId);
    const innerLease = routeStore.acquire(prepared.fullRoleId, prepared.roleInput);
    assert.equal(innerLease.cached, true);
    const value = verifySeal(innerLease.artifact);
    assert.equal(value.parsedReviewValues[0].version, 'faction_parsed_review_value_v1');
    return value;
  } };
  const routed = createFactionStructuralReviewRuntimeV1({ runtime: innerRuntime, input,
    store: routeStore, dsh, executionPolicy, selectedBinding: roleBinding,
    readOrigin: async () => origin, authenticateOrigin: async () => authenticate() });
  eq((await routed.role(request)).hash, innerOwned.hash);
  eq(innerCalls, 1);
  eq(routeStore.summary().calls, 0);
} finally { routeStore.close(); }

routeStore = openProductionStore(testFile, { ...options,
  runId: 'structural-route-' + hash({ directory, route: 'unknown' }).slice(0, 16) });
try {
  const unknown = seal({ roleId: prepared.fullRoleId,
    initialContextCapsuleHash: prepared.capsule.hash,
    reviewSlotNamespaceBindingHash: slotBinding.hash,
    output: materialized.output, trainingTruth: false });
  routeStore.finish(routeStore.acquire(prepared.fullRoleId, prepared.roleInput), unknown);
  let innerCalls = 0;
  const routed = createFactionStructuralReviewRuntimeV1({ runtime: { role: async () => {
    innerCalls++; return unknown;
  } }, input, store: routeStore, dsh, executionPolicy, selectedBinding: roleBinding,
  readOrigin: async () => origin, authenticateOrigin: async () => authenticate() });
  await assert.rejects(routed.role(request), { code: 'FACTION_STRUCTURAL_JSON_REVIEW_CACHED_PROTOCOL_UNCLAIMED' }); checks++;
  eq(innerCalls, 0);
  eq(routeStore.summary().calls, 0);
} finally { routeStore.close(); }
eq(ledgerHash(), before); source.close();
const files = ['packages/structured-generation/adapters/structural-json-recovery-v1.mjs',
  'packages/structured-generation/authenticated-structural-json-recovery-v1.mjs',
  'packages/skill-production-v3/faction-structural-json-environment-v1.mjs',
  'packages/skill-production-v3/faction-structural-json-runtime-v1.mjs',
  'scripts/verify-ticket-18-authenticated-structural-json-v1.mjs'];
const report = seal({ version: 'faction_authenticated_structural_json_proof_v1', passed: true, checks, bindingHash: binding.hash,
  origin, ownerRecipeHash: ownerRecipe.hash, contextHash: prepared.capsule.hash, sourceDraftCorrectionHash: correction.hash,
  authenticatedProof: one.proof, hostMaterialization: materialized.receipt, recoveredRecord: saved.record, roleValue,
  request, roleInput: prepared.roleInput, directory, actualDshSessions: dshCalls, providerCalls: 0,
  fullOriginalRequestReconstructed: true, originalLedgerUnchanged: true, independentAuthenticationPassed: true,
  sqliteRestartPassed: true, outerWorkflowCallbackPassed: true, roleRuntimePassed: true,
  independentRoleConsumerPassed: true, injectedDelegatedFailureRoutePassed: true, mainProductionWired: false,
  semanticAcceptance: false, runtimeAccepted: false, trainingTruth: false,
  codeHashes: await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) }))) });
await writeFile(base + 'authenticated-structural-json-v1.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks, actualDshSessions: dshCalls, providerCalls: 0, hash: report.hash }));
