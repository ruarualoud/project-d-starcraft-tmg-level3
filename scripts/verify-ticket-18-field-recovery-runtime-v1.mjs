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
import { materializeFactionFieldRecoveryV1, createFactionFieldRecoveryRuntimeV1,
  verifyFactionFieldRecoveredRoleV1, FACTION_FIELD_RECOVERY_BINDING_V3 as binding } from '../packages/skill-production-v3/faction-field-recovery-v1.mjs';
import { FACTION_REVIEW_SLOT_NAMESPACE_BINDING_V1 as slotBinding } from '../content/skill-generation/ticket-18-faction-review-output-contract-v6.mjs';
import { STARCRAFT_TMG_FACTION_REVIEW_CATALOGUE_BINDING_V1 as catalogueReviewBinding } from '../content/skill-generation/ticket-18-faction-review-output-contract-v1.mjs';

const args = process.argv.slice(2);
assert(args.length === 0 || args.length === 1 && args[0] === '--dsh');
const runId = 'faction-v1-5fdab77171f213a6e7c9', base = 'build/ticket-18-faction-production-v1/';
const filename = 'build/ticket-17-production-redesign-v1/production.sqlite';
const decode = raw => verifySeal(JSON.parse(raw)).value;
const json = async suffix => verifySeal(JSON.parse(await readFile(base + runId + '/' + suffix + '.json', 'utf8')));
const input = await json('zerg_swarm-input'), ownerRecipe = await json('recipe'), caps = await json('active-capabilities');
let checks = 0;
const eq = (a, b) => { assert.deepEqual(a, b); checks++; };
const rejects = (fn, code) => { assert.throws(fn, code ? { code } : undefined); checks++; };
const reseal = (v, patch) => { const { hash: ignored, ...body } = v; return seal({ ...body, ...patch }); };
function readActual() {
  const db = new DatabaseSync(filename, { readOnly: true });
  try {
    if (db.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n)
      throw Object.assign(new Error('payment stop'), { code: 'API_BALANCE_EXHAUSTED_STOP_ALL_WORK' });
    eq(db.prepare('SELECT recipe FROM runs WHERE id=?').get(runId).recipe, ownerRecipe.hash);
    const artifact = id => verifySeal(decode(db.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'").get(runId, id).artifact));
    const evidence = id => ({ attempt: db.prepare('SELECT * FROM attempts WHERE run=? AND id=?').get(runId, id),
      issue: artifact(id + '.issue'), rejected: artifact(id + '.rejected-candidate'),
      ownerRecipe, capability: caps.slotReview });
    return { originalEvidence: evidence('structured-2a9e1746184bbd7392e41f800c4325cd595a4cb79299809a'),
      repairEvidence: evidence('structured-20d631c3ce82ca5ef16385820507886c67d85d446ab8c9c1'),
      draft: artifact('faction.zerg_swarm.unit_roles.2.known-rule-correction').draft,
      ledgerHash: hash(db.prepare('SELECT * FROM attempts ORDER BY run,id').all()) };
  } finally { db.close(); }
}
const actual = readActual(), draft = actual.draft;
const section = createFactionWritingPlanV1(input).sections.find(row => row.id === 'faction.zerg_swarm.unit_roles.2');
const batch = createFactionReviewBatchPlanV1({ section, draft }).batches.find(row => row.first === 0);
const targets = createFactionReviewTargetsV1({ input, section, draft, indices: batch.reviewIndices });
const request = { packet: seal({ id: 'faction.zerg_swarm', inputHash: input.hash, sourceBinding: input.sourceBinding }),
  roleId: actual.originalEvidence.rejected.roleRef.id + '.source-evidence-v1.3cd990702ff2ba8b4acc',
  workspace: { inputHash: input.hash, section, draft, reviewIndices: batch.reviewIndices,
    coverageRequiredSourceRefs: batch.requiredSourceRefs, outputRequestAtEnd: { targetContract: targets } } };
const executionPolicy = { maxOutputUnits: 4096, attemptEstimateMicros: 800000, attemptTokenReserve: 500000,
  allowDefinitelyNotSentRetry: false, allowOneCapacityRetry: false,
  idempotentRetrySupported: false, encryptedRawQuarantineAvailable: false };
const prepared = prepareFactionSlotReviewRoleV1({ input, request, executionPolicy });
const materialized = materializeFactionFieldRecoveryV1({ input, prepared, ...actual });
eq(materialized.initialContextHash, '32f623d0d1006c1d432bce6e80a6bf67437cca79093e6a390e6649df7c73fdc5');
eq(materialized.repairContextHash, 'ca610388517c9b83ee59693dfa43708283414b2df06c7b6794e5221cd2187664');
eq(materialized.completion.sidecar.length, 1);
eq(materialized.originalRepairScope.allowedChangedPaths, ['$.coverage']);
eq(materialized.originalUsage.reduce((n, row) => n + row.usage.totalUnits, 0), 270688);
eq(materialized.newProviderCalls, 0);
eq(materialized.originalProof.reportedModelVerified, false);
eq(materialized.repairProof.reportedModelVerified, false);
rejects(() => materializeFactionFieldRecoveryV1({ input, prepared, originalEvidence: actual.originalEvidence }),
  'FACTION_FIELD_RECOVERY_SOURCE_COMPLETION_REQUIRED');
for (const change of [
  e => { e.repairEvidence.attempt.request_hash = hash('wrong'); },
  e => { e.originalEvidence.attempt.run = 'faction-v1-' + '0'.repeat(20); },
  e => { e.repairEvidence.rejected = reseal(e.repairEvidence.rejected, { contextManifestRef: { ...e.repairEvidence.rejected.contextManifestRef, hash: hash('wrong') } }); },
  e => { e.repairEvidence.capability = { ...e.repairEvidence.capability, model: 'wrong' }; },
  e => { e.originalEvidence.attempt.settled = null; },
]) { const changed = structuredClone(actual); change(changed); rejects(() => materializeFactionFieldRecoveryV1({ input, prepared, ...changed })); }
const outer = { ...prepared.mapping, artifact: seal({ outputContractRef: prepared.roleInput.outputContractRef,
  structuredDecodePassed: true, reviewSlotNamespaceBindingHash: slotBinding.hash }), catalogueReviewBinding,
  reviewSlotNamespaceBinding: slotBinding, structuredReviewValidationBinding: seal({
    version: 'faction_review_validation_binding_v1', outputContractRef: ownerRecipe.structuredReviewBinding.outputContractRef,
    reviewReasonMaximum: 16384, legacyReasonMaximum: 1200, trainingTruth: false }) };
validateFactionProductionTargetReviewV1(materialized.output, outer); checks++;
console.log(JSON.stringify({ stage: 'actual_paid_context_and_outer_workflow_passed', checks,
  materializationHash: materialized.hash, providerCalls: 0 }));

const directory = await mkdtemp(base + 'field-recovery-runtime-'), fixtureFile = directory + '/journal.sqlite';
const fixtureOptions = { runId: 'field-recovery-' + hash(directory).slice(0, 16), recipeHash: hash({ binding, directory }) };
const mockBinding = seal({ version: 'injected_dsh_binding' });
const native = args.includes('--dsh') ? await prepareDshLoop(process.cwd(), { sessionPolicy: 'phased-v1' }) : {
  binding: mockBinding, async run(q) {
    const result = await q.callModel();
    return seal({ calls: 1, final: result.command.content, directNetworkUsed: false, trainingTruth: false,
      runtimeBinding: mockBinding, sandboxReceipt: { injected: true }, toolTrace: [],
      transcript: [{ commandHash: sha256(JSON.stringify(result.command)), receiptHash: result.receiptHash }] });
  } };
let dshCalls = 0, reads = 0, stopped = false;
const dsh = { ...native, run: q => { dshCalls++; return native.run(q); } };
const readEvidence = () => {
  reads++;
  if (stopped) throw Object.assign(new Error('paid evidence unavailable'), { code: 'INJECTED_PAID_OWNER_UNAVAILABLE' });
  return readActual();
};
let store = openProductionStore(fixtureFile, fixtureOptions), value;
try {
  const runtime = createFactionFieldRecoveryRuntimeV1({ input, store, dsh, readEvidence });
  value = verifySeal(await runtime.run(prepared));
  validateFactionProductionTargetReviewV1(value.output, { ...outer, artifact: value }); checks++;
  eq(dshCalls, 1); eq(reads, 2); eq(store.summary().calls, 0);
  eq((await runtime.run(prepared)).hash, value.hash); eq(dshCalls, 1); eq(reads, 3);
  eq(verifyFactionFieldRecoveredRoleV1({ value, input, prepared, ...readActual(), dshBindingHash: dsh.binding.hash })
    .providerReceiptHashes.length, 2);
  for (const mutate of [
    v => { v.materialization.completion.sidecar = []; },
    v => { v.materialization.completion.value.coverage[0].reason = 'wrong'; },
    v => { v.output.verdicts[0].verdict = 'unsupported'; },
    v => { v.semanticAcceptance = true; },
    v => { v.originalProviderSchemaPassed = true; },
    v => { v.providerCalls = 1; },
    v => { v.sourceDelivery = 'uncited_summary'; },
    v => { v.sharedScenarioSourcesIncluded = false; },
    v => { v.reviewSlotNamespaceBindingHash = hash('wrong'); },
    v => { v.loop = reseal(v.loop, { final: {} }); },
  ]) { const changed = structuredClone(value); mutate(changed);
    rejects(() => verifyFactionFieldRecoveredRoleV1({ value: reseal(changed, {}), input, prepared,
      ...readActual(), dshBindingHash: dsh.binding.hash })); }
} finally { store.close(); }
store = openProductionStore(fixtureFile, fixtureOptions);
try {
  const runtime = createFactionFieldRecoveryRuntimeV1({ input, store, dsh, readEvidence });
  eq((await runtime.run(prepared)).hash, value.hash); eq(dshCalls, 1);
  stopped = true;
  await assert.rejects(runtime.run(prepared), { code: 'INJECTED_PAID_OWNER_UNAVAILABLE' }); checks++;
  stopped = false;
  const paymentStore = { ...store, globalSummary: () => ({ attempts: [{ code: 'PROVIDER_PAYMENT_REQUIRED' }] }) };
  const beforeReads = reads;
  await assert.rejects(createFactionFieldRecoveryRuntimeV1({ input, store: paymentStore, dsh, readEvidence }).run(prepared),
    { code: 'API_BALANCE_EXHAUSTED_STOP_ALL_WORK' }); checks++;
  eq(reads, beforeReads); eq(dshCalls, 1); eq(store.summary().calls, 0);
} finally { store.close(); }
eq(readActual().ledgerHash, actual.ledgerHash);
const files = ['packages/structured-generation/field-codec-v1.mjs',
  'packages/skill-production-v3/faction-field-recovery-v1.mjs', 'scripts/verify-ticket-18-field-recovery-runtime-v1.mjs'];
const report = seal({ version: 'faction_field_recovery_runtime_proof_v1', passed: true, checks,
  bindingHash: binding.hash, actualDshSessions: args.includes('--dsh') ? dshCalls : 0,
  dshInjectionUsed: !args.includes('--dsh'), providerCalls: 0, originalLedgerUnchanged: true,
  outerWorkflowCallbackPassed: true, actualRoleArtifactWorkflowCallbackPassed: true,
  independentConsumerPassed: true, sqliteRestartPassed: true,
  contextHashes: [materialized.initialContextHash, materialized.repairContextHash],
  originalPaidEvidenceRefs: [materialized.originalEvidenceRef, materialized.repairEvidenceRef],
  prepared, value, directory, productionMainWired: false,
  semanticAcceptance: false, runtimeAccepted: false, trainingTruth: false,
  codeHashes: await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) }))) });
await writeFile(base + 'field-recovery-runtime-v1.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks, hash: report.hash,
  actualDshSessions: report.actualDshSessions, dshInjectionUsed: report.dshInjectionUsed,
  providerCalls: 0, originalLedgerUnchanged: true, productionMainWired: false, directory }));
