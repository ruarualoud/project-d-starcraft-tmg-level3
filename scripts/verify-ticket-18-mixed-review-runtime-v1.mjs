import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { seal, verifySeal, hash, sha256 } from '../packages/skill-production/common.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { prepareDshLoop } from '../packages/skill-production/loops.mjs';
import { withProductionExecutionPolicyV1 } from '../packages/skill-production/execution-policy-v1.mjs';
import { factionReviewDecompositionArgsV1 } from '../packages/skill-production-v3/faction-review-decomposition-continuation-v1.mjs';
import { prepareFactionReviewDecompositionV1, createFactionReviewFragmentCapsuleV1 } from '../packages/skill-production-v3/faction-review-decomposition-v1.mjs';
import { loadFactionOpeningFenceRecipeEnvironmentV1 } from '../packages/skill-production-v3/faction-wire-address-recovery-v1.mjs';
import { authenticateFactionAmbiguousFragmentV1, prepareFactionAmbiguousReplacementV1 } from '../packages/skill-production-v3/faction-ambiguous-replacement-v1.mjs';
import { FACTION_MODEL_LIFECYCLE_BINDING_V1, selectFactionExecutionModelV1 } from '../packages/skill-production-v3/faction-model-lifecycle-v1.mjs';
import { factionProfileRefV1, factionExecutionEgressV1 } from '../packages/skill-production-v3/faction-execution-model-v1.mjs';
import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V1 as legacy } from '../content/skill-generation/offline-provider-profile-v1.mjs';
import { readFactionReplacementDispatchChoiceV1 } from '../packages/skill-production-v3/faction-ambiguous-replacement-runtime-v1.mjs';
import { readFactionStructuredSuccessEvidenceV1 } from '../packages/skill-evaluation/faction-structured-success-evidence-v1.mjs';
import { createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1 } from '../packages/structured-generation/adapters/deepseek-responses-json-schema-v1.mjs';
import { createStarcraftTmgInMemoryStructuredFaultAdapterV1 } from '../packages/structured-generation/adapters/in-memory-fault-injection-v1.mjs';
import { verifyFactionMixedReviewAssemblyV1 } from '../packages/skill-production-v3/faction-mixed-review-assembly-v1.mjs';
import { createFactionMixedReviewRuntimeV1, runFactionFreshReviewFragmentV1 } from '../packages/skill-production-v3/faction-mixed-review-runtime-v1.mjs';
import { FACTION_MIXED_REVIEW_ASSEMBLY_BINDING_V1 } from '../packages/skill-production-v3/faction-mixed-review-assembly-v1.mjs';
import { FACTION_AMBIGUOUS_REPLACEMENT_BINDING_V1 } from '../packages/skill-production-v3/faction-ambiguous-replacement-v1.mjs';
import { FACTION_REVIEW_DECOMPOSITION_BINDING_V1 } from '../packages/skill-production-v3/faction-review-decomposition-v1.mjs';
import { createFactionStructuredReviewRuntimeV1 } from '../packages/skill-production-v3/faction-structured-review-runtime-v1.mjs';
import { verifyFactionMixedReviewRoleV1, collectFactionMixedReviewStepsV1 } from '../packages/skill-production-v3/faction-mixed-review-role-v1.mjs';

const cli = process.argv.slice(2);
assert(cli.length === 0 || cli.length === 1 && cli[0] === '--dsh');
const base = 'build/ticket-18-faction-production-v1/', filename = 'build/ticket-17-production-redesign-v1/production.sqlite';
const json = async name => verifySeal(JSON.parse(await readFile(base + name + '.json', 'utf8')));
const parentRunId = 'faction-v1-5fdab77171f213a6e7c9', recipe = await json(parentRunId + '/recipe');
const diagnosis = await json('terran-wire-context-diagnosis-v2');
const input = await json(diagnosis.originRunId + '/terran_armed_forces-input');
const args = factionReviewDecompositionArgsV1({ filename, input, diagnosis }), plan = prepareFactionReviewDecompositionV1(args);
const source = new DatabaseSync(filename, { readOnly: true });
const oldId = 'faction-review-decomposition.' + plan.hash + '.target.0';
const originalPartRow = source.prepare("SELECT * FROM steps WHERE run=? AND id=? AND state='complete'")
  .get('faction-v1-27ef94cd6f32462ec36a', oldId);
assert(originalPartRow);
const originalPart = verifySeal(JSON.parse(originalPartRow.artifact)).value;
const beforeOriginal = hash(originalPartRow);
const readCapabilityReceipt = id => {
  const rows = source.prepare("SELECT response FROM attempts WHERE state='received' AND json_extract(response,'$.value.capabilityReceipt.receiptHash')=?").all(id);
  assert.equal(rows.length, 1); return verifySeal(JSON.parse(rows[0].response)).value.capabilityReceipt;
};
const openingFenceRecovery = await loadFactionOpeningFenceRecipeEnvironmentV1({ root: process.cwd(), recipe, input });
const replacementReport = await json('replacement-runtime-dsh-v1');
const replacementPart = replacementReport.part;
const quarantine = recipe.continuation.reviewDecompositionMigration.childContinuation.quarantinedTasks[0];
const authArgs = { filename, parentRunId, parentRecipe: recipe, args, quarantine };
const authenticated = authenticateFactionAmbiguousFragmentV1(authArgs), now = new Date().toISOString();
const { decision: selection, profile } = selectFactionExecutionModelV1({ selectedBinding: FACTION_MODEL_LIFECYCLE_BINDING_V1,
  legacyProfileRef: factionProfileRefV1(legacy), now });
assert.equal(selection.selection, 'beta');
const activeCapabilities = await json(parentRunId + '/active-capabilities'), capabilities = activeCapabilities.reviewFragments;
const authenticateReplacement = () => prepareFactionAmbiguousReplacementV1({ authenticated,
  authenticateOrigin: () => authenticateFactionAmbiguousFragmentV1(authArgs), selection,
  legacyProfileRef: factionProfileRefV1(legacy), capability: capabilities.target, now });
const replacement = authenticateReplacement();
const replacementProof = { replacement, authenticateReplacement, readCapabilityReceipt,
  readSuccessEvidence: q => readFactionStructuredSuccessEvidenceV1({ filename: replacementReport.directory + '/journal.sqlite', ...q }),
  readDispatchChoice: grant => readFactionReplacementDispatchChoiceV1({ filename: replacementReport.directory + '/journal.sqlite', grant }) };
const directory = await mkdtemp(base + 'mixed-review-runtime-'), testFile = directory + '/journal.sqlite';
const runId = 'faction-v1-' + hash(directory).slice(0, 20);
const options = { runId, recipeHash: hash(directory), maxCalls: 3, maxTokens: 1000000, maxCostMicros: 4000000 };
let journal = openProductionStore(testFile, options), store = withProductionExecutionPolicyV1(journal, recipe.executionPolicyBinding);
let calls = 0, dshCalls = 0, checks = 0;
const eq = (a, b) => { assert.deepEqual(a, b); checks++; };
const reseal = (v, patch) => { const { hash: ignored, ...body } = v; return seal({ ...body, ...patch }); };
const coverageJob = plan.jobs.find(j => j.kind === 'coverage');
const fault = createStarcraftTmgInMemoryStructuredFaultAdapterV1({ steps: [{ kind: 'success', output: {
  verdict: 'covered', reason: 'Explicitly injected mixed-model mechanism test, not strategy truth.',
  recommendationSlots: [args.mapping.draft.recommendations.findIndex(r => r.sourceRefs.includes(coverageJob.sourceRef))] } }] });
const providerAdapter = createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1({ send: async q => {
  calls++; const result = await fault.send(q), { receiptHash: ignored, ...body } = result.transportReceipt;
  const timed = { ...body, startedAt: now }; return { ...result, transportReceipt: { ...timed, receiptHash: hash(timed) } };
} });
const native = cli.includes('--dsh') ? await prepareDshLoop(process.cwd(), { sessionPolicy: 'phased-v1' }) : {
  binding: replacementPart.loop.runtimeBinding, async run(q) {
    const r = await q.callModel();
    return seal({ runtimeBinding: this.binding, sandboxReceipt: { injected: true }, lifecycle: replacementPart.loop.lifecycle,
      deadline: replacementPart.loop.deadline, lifecycleFixtureCopied: true, calls: 1, directNetworkUsed: false, trainingTruth: false,
      final: r.command.content, toolTrace: [], transcript: [{ call: 1, receiptHash: r.receiptHash,
        commandHash: sha256(JSON.stringify(r.command)) }] });
  } };
const dsh = { ...native, async run(q) { dshCalls++; return native.run(q); } };
const freshExecution = { egressBinding: factionExecutionEgressV1(profile), capability: capabilities.coverage,
  readSuccessEvidence: q => readFactionStructuredSuccessEvidenceV1({ filename: testFile, ...q }) };
const oldExecution = { egressBinding: factionExecutionEgressV1(legacy),
  capability: Object.values(openingFenceRecovery.capabilities)[0], openingFenceRecovery,
  readSuccessEvidence: () => assert.fail('Opening-fence result is not a paid successful attempt') };
const ref = part => ({ jobId: part.jobId, hash: part.hash, runId: part.runId, attemptId: part.attemptId });
const readFragment = r => {
  if (r.hash === originalPart.hash) return verifySeal(JSON.parse(source.prepare('SELECT artifact FROM steps WHERE run=? AND id=?')
    .get(originalPartRow.run, oldId).artifact)).value;
  if (r.hash === replacementPart.hash) return replacementPart;
  return store.artifact('faction-review-decomposition.' + plan.hash + '.' + r.jobId);
};
const resolveExecution = ({ part }) => part.jobId === 'target.0' ? oldExecution : freshExecution;
const resolveReplacement = () => replacementProof;
const resolveJobs = () => [ { jobId: 'target.0', kind: 'inherited', ref: ref(originalPart) },
  { jobId: 'target.1', kind: 'inherited', ref: ref(replacementPart) }, { jobId: coverageJob.id, kind: 'fresh' } ];
const factory = extra => createFactionMixedReviewRuntimeV1({ store, dsh,
  authenticatePlan: () => prepareFactionReviewDecompositionV1(factionReviewDecompositionArgsV1({ filename, input, diagnosis })),
  resolveJobs, resolveExecution, resolveReplacement, readFragment,
  executeFresh: ({ route }) => runFactionFreshReviewFragmentV1({ args, jobId: route.jobId, store, dsh,
    execution: freshExecution, providerAdapter, priceUsage: u => u.totalUnits }),
  executeReplacement: () => assert.fail('Existing replacement must not be resent'), ...extra });
let value, outerRole, outerRoleInput, continuationProof;
try {
  await assert.rejects(factory({ resolveExecution: () => freshExecution }).run(args)); checks++;
  eq(calls, 0);
  await assert.rejects(factory({ resolveJobs: () => resolveJobs().slice(1) }).run(args), { code: 'FACTION_MIXED_REVIEW_JOBS_INVALID' }); checks++;
  eq(calls, 0);
  value = await factory().run(args);
  eq(calls, 1); eq(value.fragmentRefs.length, 3); eq(value.output.verdicts[1].verdict, 'uncertain');
  eq(value.originalUnknownSendReconciled, false);
  eq((await factory().run(args)).hash, value.hash); eq(calls, 1);
} finally { journal.close(); }
journal = openProductionStore(testFile, options); store = withProductionExecutionPolicyV1(journal, recipe.executionPolicyBinding);
try {
  eq((await factory().run(args)).hash, value.hash); eq(calls, 1); eq(dshCalls, 1);
  const verifyArgs = { args, value, readFragment, resolveExecution, resolveReplacement, dshBindingHash: dsh.binding.hash };
  eq(verifyFactionMixedReviewAssemblyV1(verifyArgs).providerReceiptHashes.length, 4);
  for (const patch of [{ semanticAcceptance: true }, { originalUnknownSendReconciled: true }, { output: { verdicts: [] } },
    { fragmentRefs: value.fragmentRefs.slice(1) }, { fragmentRefs: value.fragmentRefs.map((r, i) => i ? r : { ...r, runId }) }]) {
    assert.throws(() => verifyFactionMixedReviewAssemblyV1({ ...verifyArgs, value: reseal(value, patch) })); checks++;
  }
  assert.throws(() => verifyFactionMixedReviewAssemblyV1({ ...verifyArgs, resolveExecution: () => freshExecution })); checks++;
  const boundRecipe = reseal(recipe, { mixedReviewBinding: FACTION_MIXED_REVIEW_ASSEMBLY_BINDING_V1,
    ambiguousReplacementBinding: FACTION_AMBIGUOUS_REPLACEMENT_BINDING_V1,
    mixedReviewLegacyRoleIds: [quarantine.fullRoleId],
    mixedReviewReadinessHash: hash('explicit component fixture, not production readiness') });
  const reviewer = createFactionStructuredReviewRuntimeV1({ input, dsh,
    store: { ...store, acquire(id, body, ...rest) {
      if (id === diagnosis.request.packet.id + '.' + diagnosis.request.roleId) outerRoleInput = body;
      return store.acquire(id, body, ...rest);
    } }, runtime: { role: () => assert.fail('No original full-request resend') },
    providerAdapter: { complete: () => assert.fail('No paid wrapper request') },
    egressBinding: freshExecution.egressBinding, capabilityReceipt: activeCapabilities.catalogueReview,
    outputContract: args.originalContract, executionPolicy: FACTION_REVIEW_DECOMPOSITION_BINDING_V1.executionPolicy,
    priceUsage: () => assert.fail('No rebilling inherited role'), includeSharedScenarioSources: true,
    reviewDecomposition: { binding: FACTION_REVIEW_DECOMPOSITION_BINDING_V1, origins: [args.evidence], runtime: factory() } });
  outerRole = await reviewer.role(diagnosis.request);
  eq(outerRole.decomposition.hash, value.hash); eq(calls, 1); eq(dshCalls, 1);
  const environment = { plan, verifyAssembly: v => verifyFactionMixedReviewAssemblyV1({ ...verifyArgs, value: v }),
    verifyPart: part => { assert.equal(part.jobId, 'coverage.0'); return freshExecution.readSuccessEvidence({ runId: part.runId, attemptId: part.attemptId }); } };
  const roleArgs = { args, value: outerRole, roleInput: outerRoleInput, packetHash: diagnosis.request.packet.hash,
    recipe: boundRecipe, environment };
  eq(verifyFactionMixedReviewRoleV1(roleArgs).providerReceiptHashes.length, 4);
  assert.throws(() => verifyFactionMixedReviewRoleV1({ ...roleArgs, value: reseal(outerRole, { sourceDelivery: 'unproved' }) })); checks++;
  const owned = new DatabaseSync(testFile, { readOnly: true });
  try {
    const rows = owned.prepare("SELECT id,input_hash,artifact FROM steps WHERE run=? AND state='complete'").all(runId)
      .map(r => ({ id: r.id, inputHash: r.input_hash, artifact: verifySeal(JSON.parse(r.artifact)).value }));
    const collected = collectFactionMixedReviewStepsV1({ args, rows,
      attempts: owned.prepare('SELECT * FROM attempts WHERE run=?').all(runId), packetHash: diagnosis.request.packet.hash,
      recipe: boundRecipe, environment });
    eq(collected.steps.length, 2); eq(collected.consumedAttemptIds.length, 1); continuationProof = collected.proof;
  } finally { owned.close(); }
  eq(hash(source.prepare('SELECT * FROM steps WHERE run=? AND id=?').get(originalPartRow.run, oldId)), beforeOriginal);
} finally { journal.close(); source.close(); }
const files = ['packages/skill-production-v3/faction-mixed-review-runtime-v1.mjs',
  'packages/skill-production-v3/faction-mixed-review-assembly-v1.mjs',
  'packages/skill-production-v3/faction-mixed-review-role-v1.mjs', 'scripts/verify-ticket-18-mixed-review-runtime-v1.mjs'];
const report = seal({ version: 'faction_mixed_review_runtime_component_v1', passed: true, checks, directory,
  originalActualPartHash: originalPart.hash, injectedReplacementProofHash: replacementReport.hash, value, outerRole,
  outerRoleInput, continuationProof, actualUnchangedReviewWrapperPassed: true, independentMixedRoleConsumerPassed: true,
  providerCalls: 0, injectedProviderCalls: calls, actualDshSessions: cli.includes('--dsh') ? dshCalls : 0,
  dshInjectionUsed: !cli.includes('--dsh'), originalModelRetained: true, fullSourceContextPreserved: true,
  productionMainWired: false, semanticAcceptance: false, runtimeAccepted: false, trainingTruth: false,
  codeHashes: await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) }))) });
await writeFile(base + (cli.includes('--dsh') ? 'mixed-review-runtime-dsh-v1' : 'mixed-review-runtime-fixture-v1') + '.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks, hash: report.hash, providerCalls: 0, injectedProviderCalls: calls,
  actualDshSessions: report.actualDshSessions, productionMainWired: false }));
