import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { hash, seal, verifySeal, sha256 } from '../packages/skill-production/common.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { withCheckpointContinuation } from '../packages/skill-production/continuation.mjs';
import { prepareDshLoop } from '../packages/skill-production/loops.mjs';
import { factionReviewDecompositionArgsV1, collectFactionReviewDecompositionStepsV1 } from '../packages/skill-production-v3/faction-review-decomposition-continuation-v1.mjs';
import { prepareFactionReviewDecompositionV1, createFactionReviewFragmentCapsuleV1,
  FACTION_REVIEW_DECOMPOSITION_BINDING_V1 as decompositionBinding } from '../packages/skill-production-v3/faction-review-decomposition-v1.mjs';
import { createFactionReviewDecompositionRuntimeV1, verifyFactionReviewDecompositionRuntimeV1 } from '../packages/skill-production-v3/faction-review-decomposition-runtime-v1.mjs';
import { FACTION_FRAGMENT_OPENING_FENCE_PROTOCOL_V1 } from '../packages/skill-production-v3/faction-fragment-opening-fence-v1.mjs';
import { loadFactionOpeningFenceEnvironmentV1 } from '../packages/skill-production-v3/faction-opening-fence-environment-v1.mjs';
import { inspectFactionWireKeyHelperV2, createFactionWireRecoveryEnvironmentV2 } from '../packages/skill-production-v3/faction-wire-recovery-environment-v2.mjs';
import { readFactionStructuredSuccessEvidenceV1 } from '../packages/skill-evaluation/faction-structured-success-evidence-v1.mjs';
import { createStarcraftTmgInMemoryStructuredFaultAdapterV1 } from '../packages/structured-generation/adapters/in-memory-fault-injection-v1.mjs';
import { createStarcraftTmgProviderProfileRegistryV2 } from '../packages/secure-provider-runtime/provider-profile-registry-v2.mjs';
import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V1 as profile } from '../content/skill-generation/offline-provider-profile-v1.mjs';
import { prepareFactionWireAddressRecoveryV1, loadFactionOpeningFenceRecipeEnvironmentV1 } from '../packages/skill-production-v3/faction-wire-address-recovery-v1.mjs';
import { createFactionStructuredReviewRuntimeV1 } from '../packages/skill-production-v3/faction-structured-review-runtime-v1.mjs';
import { verifyFactionStructuredRoleReplayV1 } from '../packages/skill-evaluation/faction-structured-replay-v1.mjs';
import { openFactionProductionReplayV1 } from '../packages/skill-evaluation/faction-production-replay-v1.mjs';

const base = 'build/ticket-18-faction-production-v1/', sourceDb = 'build/ticket-17-production-redesign-v1/production.sqlite';
const originRunId = 'faction-v1-6d345a142fa24636bab7';
const attemptId = 'structured-cf543e3f34ea6ee7e94966ddf63814727db2a0cfc46a77b0';
const json = async file => verifySeal(JSON.parse(await readFile(base + file, 'utf8')));
const source = new DatabaseSync(sourceDb, { readOnly: true });
const ledger = () => source.prepare('SELECT * FROM attempts ORDER BY run,id').all();
const beforeHash = hash(ledger());
assert.equal(source.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n, 0);
const diagnosis = await json('terran-wire-context-diagnosis-v2.json');
const input = await json(originRunId + '/terran_armed_forces-input.json');
const args = factionReviewDecompositionArgsV1({ filename: sourceDb, input, diagnosis });
const plan = prepareFactionReviewDecompositionV1(args);
const prepared = createFactionReviewFragmentCapsuleV1({ ...args, plan, jobId: 'target.0' });
const registry = createStarcraftTmgProviderProfileRegistryV2({ entries: [{ providerProfile: profile, responsePath: '/responses' }],
  allowedProviders: ['deepseek-openai-compatible-direct'] });
const egressBinding = registry.resolveEgressBinding({ profileRef: { id: profile.providerProfileId,
  version: profile.version, hash: profile.integrity.hash } }).egressBinding;
const helperRef = await inspectFactionWireKeyHelperV2();
const loadRecovery = () => loadFactionOpeningFenceEnvironmentV1({ filename: sourceDb, helperRef, egressBinding,
  origins: [{ runId: originRunId, attemptId, prepared, executionPolicy: decompositionBinding.executionPolicy }] });
const openingFenceRecovery = await loadRecovery();
const activeCapabilities = await json(originRunId + '/active-capabilities.json');
const capabilities = activeCapabilities.reviewFragments;
const originRecipe = await json(originRunId + '/recipe.json');
const actualDiagnosis = await json(originRunId + '/actual-resume-diagnosis-7fb9531534ff84cd30f0.json');
const recoveryPrepared = await prepareFactionWireAddressRecoveryV1({ filename: sourceDb,
  inputs: [input, await json(originRunId + '/zerg_swarm-input.json')], reviewDiagnosis: diagnosis, actualDiagnosis, egressBinding, helperRef });
const directory = await mkdtemp(base + 'fragment-fence-runtime-'), filename = directory + '/journal.sqlite';
const resealed = v => { const { hash: ignored, ...body } = v; return seal(body); };
const fixtureRecipe = parent => resealed({ ...parent, ...recoveryPrepared.recipeFields,
  wireAddressRecoveryReadinessHash: hash('explicit nonproduction fixture readiness'), fixtureDirectory: directory,
  continuation: seal({ parentRunId: 'faction-v1-' + parent.hash.slice(0, 20), parentRecipeHash: parent.hash }) });
const firstRecipe = fixtureRecipe(originRecipe);
const runId = 'faction-v1-' + firstRecipe.hash.slice(0, 20);
const options = { runId, recipeHash: firstRecipe.hash,
  maxCalls: 10, maxTokens: 3000000 };
let store = openProductionStore(filename, options), injectedSends = 0;
const outputs = plan.jobs.slice(1).map(job => {
  const p = createFactionReviewFragmentCapsuleV1({ ...args, plan, jobId: job.id });
  return job.kind === 'target' ? { focusPaths: [p.capsule.localIssue.fragmentTask.target.fields[0].path],
    verdict: 'uncertain', reason: 'Injected remaining-fragment negative judgment, not production acceptance.',
    sourceSlots: [diagnosis.capsule.localIssue.reviewTask.sourceCatalogue.find(s =>
      s.ref === p.capsule.localIssue.fragmentTask.target.recommendation.sourceRefs[0]).slot] }
    : { verdict: 'covered', reason: 'Injected remaining-fragment coverage, not actual production.',
      recommendationSlots: [args.mapping.draft.recommendations.findIndex(r => r.sourceRefs.includes(job.sourceRef))] };
});
const fault = createStarcraftTmgInMemoryStructuredFaultAdapterV1({ steps: outputs.map(output => ({ kind: 'success', output })) });
const makeWireRecovery = owner => createFactionWireRecoveryEnvironmentV2({ filename, runId: owner, helperRef,
  providers: [{ egressBinding, send: async request => {
    // Exact actual failed role must never be sent again.
    assert.notEqual(request.requestId, attemptId); injectedSends++;
    const result = await fault.send(request);
    const { receiptHash: ignored, ...old } = result.transportReceipt;
    const receipt = { ...old, startedAt: new Date().toISOString() };
    return { ...result, transportReceipt: { ...receipt, receiptHash: hash(receipt) } };
  } }] });
let wireRecovery = await makeWireRecovery(runId);
const nativeDsh = await prepareDshLoop(process.cwd()); let dshCalls = 0;
const dsh = { ...nativeDsh, run: q => { dshCalls++; return nativeDsh.run(q); } };
const readSuccessEvidence = q => readFactionStructuredSuccessEvidenceV1({ filename, ...q });
const factory = extra => createFactionReviewDecompositionRuntimeV1({ store, dsh, egressBinding, capabilities, wireRecovery,
  providerAdapter: wireRecovery.adapters.get(egressBinding.providerProfileRef.hash), priceUsage: u => u.totalUnits,
  readOrigin: () => factionReviewDecompositionArgsV1({ filename: sourceDb, input, diagnosis }).evidence,
  readSuccessEvidence, openingFenceRecovery, ...extra });
let roleInput;
const reviewer = () => createFactionStructuredReviewRuntimeV1({ input, dsh, store: {
  acquire(id, body) { roleInput = body; return store.acquire(id, body); },
  finish: (lease, result) => store.finish(lease, result), release: lease => store.release(lease),
  globalSummary: () => store.globalSummary() },
  runtime: { role: () => assert.fail('No original prompt retry') },
  providerAdapter: { complete: () => assert.fail('No original failed request resend') },
  outputContract: args.originalContract, capabilityReceipt: activeCapabilities.catalogueReview, egressBinding,
  executionPolicy: decompositionBinding.executionPolicy, priceUsage: () => assert.fail('No repricing original request'),
  includeSharedScenarioSources: true,
  reviewDecomposition: { binding: decompositionBinding, origins: [args.evidence], runtime: factory() } });
let checks = 0, value, partial, outerRole, outerProof, replayProof;
const eq = (a, b) => { assert.equal(a, b); checks++; };
const readRows = owner => { const db = new DatabaseSync(filename, { readOnly: true });
  try { return { rows: db.prepare("SELECT id,input_hash,artifact FROM steps WHERE run=? AND state='complete'").all(owner)
    .map(r => ({ id: r.id, inputHash: r.input_hash, artifact: verifySeal(JSON.parse(r.artifact)).value })),
  attempts: db.prepare('SELECT * FROM attempts WHERE run=?').all(owner) }; } finally { db.close(); } };
const collectArgs = { args, dshBindingHash: dsh.binding.hash, egressBinding, readSuccessEvidence,
  resolveCapability: h => Object.values(capabilities).find(c => c.receiptHash === h),
  fullRoleId: diagnosis.request.packet.id + '.' + diagnosis.request.roleId, packetHash: diagnosis.request.packet.hash,
  openingFenceRecovery };
const originIssueRow = source.prepare("SELECT id,input_hash,artifact FROM steps WHERE run=? AND id=?").get(originRunId, attemptId + '.wire-issue-v2');
const originRows = [{ id: originIssueRow.id, inputHash: originIssueRow.input_hash, artifact: verifySeal(JSON.parse(originIssueRow.artifact)).value }];
const originAttempts = [source.prepare('SELECT * FROM attempts WHERE run=? AND id=?').get(originRunId, attemptId)];
assert.throws(() => collectFactionReviewDecompositionStepsV1({ ...collectArgs, openingFenceRecovery: null,
  rows: originRows, attempts: originAttempts, allowedRunIds: [originRunId] }),
  { code: 'FACTION_REVIEW_FRAGMENT_UNMATERIALIZED_ATTEMPT_STOP' }); checks++;
const pending = collectFactionReviewDecompositionStepsV1({ ...collectArgs, rows: originRows, attempts: originAttempts, allowedRunIds: [originRunId] });
eq(pending.steps.length, 0); eq(pending.proof.pendingRecoveries.length, 1);
eq(pending.proof.pendingRecoveries[0].newProviderCallsPermitted, 0);
assert.throws(() => collectFactionReviewDecompositionStepsV1({ ...collectArgs, rows: originRows,
  attempts: [{ ...originAttempts[0], state: 'intent' }], allowedRunIds: [originRunId] }),
  { code: 'FACTION_REVIEW_FRAGMENT_UNMATERIALIZED_ATTEMPT_STOP' }); checks++;
try {
  await assert.rejects(factory({ onProgress: event => {
    if (event.completed === 1) throw Object.assign(new Error('Injected stop after recovered child'), { code: 'INJECTED_AFTER_RECOVERED_CHILD' });
  } }).run(args), { code: 'INJECTED_AFTER_RECOVERED_CHILD' }); checks++;
  eq(injectedSends, 0); eq(dshCalls, 1); eq(store.summary().calls, 0);
  const part = store.artifact('faction-review-decomposition.' + plan.hash + '.target.0');
  eq(part.protocol, FACTION_FRAGMENT_OPENING_FENCE_PROTOCOL_V1);
  eq(part.originRunId, originRunId); eq(part.attemptId, attemptId);
  eq(hash(part.value), hash(openingFenceRecovery.proofs[0].providerValue));
  partial = collectFactionReviewDecompositionStepsV1({ ...collectArgs, ...readRows(runId), allowedRunIds: [runId, originRunId] });
  eq(partial.steps.length, 1); eq(partial.proof.originalAttemptsCopied, 0);
  console.log(JSON.stringify({ stage: 'actual_failed_fragment_restored_without_provider', checks }));
} finally { store.close(); }
store = openProductionStore(filename, options);
try {
  await assert.rejects(factory({ openingFenceRecovery: null }).run(args), { code: 'STEP_INPUT_DRIFT' }); checks++;
  eq(injectedSends, 0);
} finally { store.close(); }
const childRecipe = fixtureRecipe(firstRecipe), childRunId = 'faction-v1-' + childRecipe.hash.slice(0, 20);
store = withCheckpointContinuation(openProductionStore(filename, { ...options, runId: childRunId, recipeHash: childRecipe.hash }), {
  manifest: seal({ parentRunId: runId, parentRecipeHash: options.recipeHash, reusable: partial.proof.reusable }), steps: partial.steps });
wireRecovery = await makeWireRecovery(childRunId);
let complete;
try {
  value = await factory().run(args);
  eq(injectedSends, 2); eq(dshCalls, 3); eq(store.summary().calls, 2);
  const independentlyAuthenticated = await loadFactionOpeningFenceRecipeEnvironmentV1({ root: process.cwd(), recipe: childRecipe, input });
  const consumerArgs = { ...args, value, egressBinding, capabilities, dshBindingHash: dsh.binding.hash,
    resolveFragment: id => store.artifact(id), readSuccessEvidence, openingFenceRecovery: independentlyAuthenticated };
  const proof = verifyFactionReviewDecompositionRuntimeV1(consumerArgs);
  eq(proof.providerReceiptHashes.length, 4);
  assert(proof.providerReceiptHashes.includes(openingFenceRecovery.proofs[0].originalProviderReceiptHash)); checks++;
  eq(value.output.verdicts[1].verdict, 'uncertain');
  assert.throws(() => verifyFactionReviewDecompositionRuntimeV1({ ...consumerArgs, openingFenceRecovery: null }),
    { code: 'FACTION_FRAGMENT_OPENING_FENCE_BINDING_DRIFT' }); checks++;
  eq((await factory().run(args)).hash, value.hash); eq(injectedSends, 2); eq(dshCalls, 3);
  const reseal = v => { const { hash: ignored, ...body } = v; return seal(body); };
  const firstRef = value.fragmentRefs[0], firstPart = store.artifact(firstRef.id);
  const changedPart = reseal({ ...firstPart, value: { ...firstPart.value, verdict: 'unsupported' } });
  const changed = reseal({ ...value, fragmentRefs: value.fragmentRefs.map((r, i) => i ? r : { ...r, hash: changedPart.hash }) });
  assert.throws(() => verifyFactionReviewDecompositionRuntimeV1({ ...consumerArgs, value: changed,
    resolveFragment: id => id === firstRef.id ? changedPart : store.artifact(id) }), { code: 'FACTION_FRAGMENT_OPENING_FENCE_BINDING_DRIFT' }); checks++;
  outerRole = await reviewer().role(diagnosis.request);
  eq(outerRole.decomposition.hash, value.hash); eq(dshCalls, 3); eq(injectedSends, 2);
  const outerArgs = { value: outerRole, roleInput, request: diagnosis.request, input, recipe: childRecipe,
    resolveArtifact: h => readRows(childRunId).rows.find(r => r.artifact?.hash === h)?.artifact,
    resolveCapabilityReceipt: h => Object.values(capabilities).find(c => c.receiptHash === h),
    resolveReviewWireEvidence: () => factionReviewDecompositionArgsV1({ filename: sourceDb, input, diagnosis }).evidence,
    resolveStructuredSuccessEvidence: readSuccessEvidence, openingFenceRecovery: independentlyAuthenticated };
  outerProof = verifyFactionStructuredRoleReplayV1(outerArgs);
  eq(hash(outerProof.providerReceiptHashes), hash(proof.providerReceiptHashes));
  assert.throws(() => verifyFactionStructuredRoleReplayV1({ ...outerArgs, openingFenceRecovery: null }),
    { code: 'FACTION_OPENING_FENCE_CONSUMER_BINDING_REQUIRED' }); checks++;
  const missingBinding = { ...childRecipe }; delete missingBinding.openingFenceRecoveryBinding;
  assert.throws(() => verifyFactionStructuredRoleReplayV1({ ...outerArgs, recipe: missingBinding }),
    { code: 'FACTION_WIRE_ADDRESS_RECIPE_SCOPE_INVALID' }); checks++;
  complete = collectFactionReviewDecompositionStepsV1({ ...collectArgs, ...readRows(childRunId),
    allowedRunIds: [childRunId, runId, originRunId] });
  eq(complete.steps.length, 5);
} finally { store.close(); }
// Read-only production replay against an explicitly isolated fixture journal.
// Source rows retain their exact original owner/receipt; no production row is
// copied into a new paid identity. Only the two remaining transports are injected.
const ancestors = [firstRecipe];
let parentId = originRunId;
const fixtureDb = new DatabaseSync(filename);
try {
  while (parentId) {
    const parent = await json(parentId + '/recipe.json'); ancestors.push(parent);
    const row = source.prepare('SELECT * FROM runs WHERE id=?').get(parentId);
    fixtureDb.prepare('INSERT INTO runs VALUES(?,?,?,?,?)').run(row.id, row.recipe, row.cap, row.calls, row.token_cap);
    parentId = parent.continuation?.parentRunId;
  }
  const attemptRows = source.prepare("SELECT * FROM attempts WHERE (run=? AND id=?) OR (run=? AND json_extract(response,'$.value.capabilityReceipt') IS NOT NULL)")
    .all(diagnosis.originRunId, diagnosis.originAttemptId, originRunId);
  for (const row of attemptRows) fixtureDb.prepare('INSERT INTO attempts VALUES(?,?,?,?,?,?,?,?,?,?)')
    .run(row.run, row.id, row.request_hash, row.state, row.reserve, row.settled, row.usage, row.response, row.code, row.token_reserve);
  for (const row of source.prepare('SELECT * FROM steps WHERE run=? AND id=?').all(diagnosis.originRunId, diagnosis.originAttemptId + '.issue'))
    fixtureDb.prepare('INSERT INTO steps VALUES(?,?,?,?,?,?,?,?)')
      .run(row.run, row.id, row.input_hash, row.generation, row.owner, row.expires, row.state, row.artifact);
} finally { fixtureDb.close(); }
const replayArgs = { filename, runId: childRunId, recipe: childRecipe, ancestors, input,
  openingFenceRecovery: await loadFactionOpeningFenceRecipeEnvironmentV1({ root: process.cwd(), recipe: childRecipe, input }) };
const replay = openFactionProductionReplayV1(replayArgs);
try {
  replay.bindRoleRequest(diagnosis.request);
  eq(replay.store.acquire(outerRole.roleId, roleInput).artifact.hash, outerRole.hash);
  replayProof = replay.evidence(); eq(replayProof.trainingTruth, false);
} finally { replay.close(); }
const withoutProof = openFactionProductionReplayV1({ ...replayArgs, openingFenceRecovery: null });
try {
  withoutProof.bindRoleRequest(diagnosis.request);
  assert.throws(() => withoutProof.store.acquire(outerRole.roleId, roleInput),
    { code: 'FACTION_OPENING_FENCE_CONSUMER_BINDING_REQUIRED' }); checks++;
} finally { withoutProof.close(); }
const grandchildRunId = 'faction-v1-' + hash(directory + '.grandchild').slice(0, 20);
store = withCheckpointContinuation(openProductionStore(filename, { ...options, runId: grandchildRunId }), {
  manifest: seal({ parentRunId: childRunId, parentRecipeHash: options.recipeHash, reusable: complete.proof.reusable }), steps: complete.steps });
wireRecovery = await makeWireRecovery(grandchildRunId);
try {
  eq((await factory().run(args)).hash, value.hash); eq(dshCalls, 3); eq(injectedSends, 2); eq(store.summary().calls, 0);
  eq((await reviewer().role(diagnosis.request)).hash, outerRole.hash); eq(dshCalls, 3); eq(injectedSends, 2);
} finally { store.close(); }
eq(hash(ledger()), beforeHash); source.close();
const files = ['packages/skill-production-v3/faction-fragment-opening-fence-v1.mjs',
  'packages/skill-production-v3/faction-opening-fence-environment-v1.mjs',
  'packages/skill-production-v3/faction-review-decomposition-runtime-v1.mjs',
  'packages/skill-production-v3/faction-review-decomposition-continuation-v1.mjs',
  'packages/structured-generation/authenticated-opening-fence-recovery-v1.mjs',
  'packages/skill-production-v3/faction-wire-address-recovery-v1.mjs',
  'packages/skill-production-v3/faction-structured-review-runtime-v1.mjs',
  'packages/skill-evaluation/faction-structured-replay-v1.mjs',
  'packages/skill-evaluation/faction-production-replay-v1.mjs',
  'packages/skill-evaluation/faction-candidate-evidence-v1.mjs',
  'scripts/verify-ticket-18-fragment-opening-fence-runtime-v1.mjs'];
const report = seal({ version: 'faction_fragment_opening_fence_runtime_component_v1', passed: true, checks,
  actualOriginRunId: originRunId, actualOriginAttemptId: attemptId, authenticatedProofHash: openingFenceRecovery.proofs[0].hash,
  planHash: plan.hash, assembledValueHash: value.hash, actualDshSessions: dshCalls,
  injectedRemainingFragmentTransports: injectedSends, providerCalls: 0, originalAttemptsUnchanged: true,
  actualFailedFragmentRestored: true, sqliteRestartPassed: true, independentConsumerPassed: true,
  negativeRemainingJudgmentPreserved: true, mainProductionWired: false, crossRunFragmentContinuationPassed: true,
  exactUnmaterializedFailureRequiresRecoveryProof: true, unknownAttemptCannotBecomeRecoveryPermit: true,
  actualOuterWrapperPassed: true, independentOuterConsumerPassed: true, productionReplayConsumerPassed: true,
  outerRoleHash: outerRole.hash, outerConsumerProof: outerProof, fixtureProductionReplayProof: replayProof,
  semanticAcceptance: false, runtimeAccepted: false, trainingTruth: false,
  codeHashes: await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) }))) });
await writeFile(base + 'fragment-opening-fence-runtime-component-v1.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks, actualDshSessions: dshCalls, injectedSends, providerCalls: 0, hash: report.hash }));
