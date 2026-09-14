import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { hash, seal, verifySeal, sha256 } from '../packages/skill-production/common.mjs';
import { loadFactionSlotReviewEnvironmentV1, assertFactionSlotReviewRecipeV1 } from '../packages/skill-production-v3/faction-slot-review-environment-v1.mjs';
import { validateFactionSlotReviewMigrationV1 } from '../packages/skill-production-v3/faction-slot-review-migration-v1.mjs';
import { prepareFactionSlotReviewRoleV1, createFactionSlotReviewRuntimeV1 } from '../packages/skill-production-v3/faction-slot-review-runtime-v1.mjs';
import { recoverFactionExplicitSlotReviewV1 } from '../packages/skill-production-v3/faction-review-slot-namespace-v1.mjs';
import { createFactionWritingPlanV1, createFactionReviewBatchPlanV1 } from '../packages/skill-production-v3/faction-strategy-workflow-v1.mjs';
import { createFactionReviewTargetsV1 } from '../packages/skill-production-v3/faction-review-targets-v1.mjs';
import { createFactionReplayRuntimeStackV1, loadFactionStructuredReplayDependenciesV1 } from '../packages/skill-evaluation/faction-replay-runtime-stack-v1.mjs';

const base = 'build/ticket-18-faction-production-v1/';
const filename = 'build/ticket-17-production-redesign-v1/production.sqlite';
const parentRunId = 'faction-v1-8262a9a7181f3ec25c06';
const json = async name => verifySeal(JSON.parse(await readFile(base + name + '.json', 'utf8')));
const proof = await json('slot-review-dsh-runtime-v1');
assert.equal(proof.outerWorkflowReviewCallbackPassed, true);
const workflowBoundary = await json('slot-review-workflow-boundary-v1');
assert.equal(workflowBoundary.passed, true);
assert.equal(workflowBoundary.dshProofHash, proof.hash);
assert.equal(workflowBoundary.productionCallbackTested, true);
for (const row of workflowBoundary.codeHashes) assert.equal(sha256(await readFile(row.file)), row.hash);
for (const row of proof.codeHashes) assert.equal(sha256(await readFile(row.file)), row.hash);
const parent = await json(parentRunId + '/recipe');
const environment = await loadFactionSlotReviewEnvironmentV1({ root: process.cwd(), filename, parentRunId, readiness: proof });
const fields = environment.recipeFields, origin = fields.slotReviewRecoveryOrigins[0];
const evidence = environment.readRecoveryEvidence(origin);
const input = await json(parentRunId + '/zerg_swarm-input');
let checks = 0;
const eq = (a, b) => { assert.deepEqual(a, b); checks++; };
const rejects = (operation, code) => { assert.throws(operation, code ? { code } : undefined); checks++; };
const reseal = (value, patch) => { const { hash: ignored, ...body } = value; return seal({ ...body, ...patch }); };
eq(environment.lineage.recipes.length, 54);
eq(fields.slotReviewLegacyRoleIds.length, 200);
eq(evidence.candidate.hash, proof.roles[0].value.structuredCandidateRef.hash);
eq(evidence.ownerRecipe.hash, parent.hash);
eq(evidence.capability.receiptHash, verifySeal(JSON.parse(evidence.attempt.response)).value.usageReceipt.capabilityReceiptHash);
rejects(() => environment.readRecoveryEvidence({ ...origin, ownerRunId: 'faction-v1-' + 'a'.repeat(20) }), 'FACTION_SLOT_REVIEW_FOREIGN_ORIGIN');
rejects(() => assertFactionSlotReviewRecipeV1({ ...fields, slotReviewLegacyRoleIds: [...fields.slotReviewLegacyRoleIds, fields.slotReviewLegacyRoleIds[0]] }),
  'FACTION_SLOT_REVIEW_RECIPE_INVALID');
const source = new DatabaseSync(filename, { readOnly: true });
const before = hash(source.prepare('SELECT * FROM attempts ORDER BY run,id').all());
const correction = verifySeal(JSON.parse(source.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'")
  .get(parentRunId, 'faction.zerg_swarm.unit_roles.1.zerg-unit-timing-correction-v1.0').artifact)).value;
const draft = correction.correction.proposedDraft;
const section = createFactionWritingPlanV1(input).sections.find(s => s.id === 'faction.zerg_swarm.unit_roles.1');
const batch = createFactionReviewBatchPlanV1({ section, draft }).batches.find(b => b.first === 2);
const targets = createFactionReviewTargetsV1({ input, section, draft, indices: batch.reviewIndices });
const request = { packet: seal({ id: 'faction.zerg_swarm', inputHash: input.hash, sourceBinding: input.sourceBinding }),
  roleId: evidence.candidate.roleRef.id + '.source-evidence-v1.3cd990702ff2ba8b4acc',
  workspace: { inputHash: input.hash, section, draft, reviewIndices: batch.reviewIndices,
    coverageRequiredSourceRefs: batch.requiredSourceRefs, outputRequestAtEnd: { targetContract: targets } } };
const executionPolicy = { maxOutputUnits: 4096, attemptEstimateMicros: 800000, attemptTokenReserve: 500000,
  allowDefinitelyNotSentRetry: false, allowOneCapacityRetry: false,
  idempotentRetrySupported: false, encryptedRawQuarantineAvailable: false };
const prepared = prepareFactionSlotReviewRoleV1({ input, request, executionPolicy, legacy: true });
const recovered = recoverFactionExplicitSlotReviewV1({ ...prepared.mapping, capsule: prepared.capsule,
  evidence, providerOutput: evidence.candidate.providerValue, reviewReasonMaximum: 16384 });
eq(recovered.receipt.hash, proof.roles[0].value.hostMaterializationReceipt.hash);
const forbidden = () => assert.fail('No Provider, DSH or side effects in routing proof');
let fallback = 0, releases = 0, observed;
const store = { acquire(id, body) { observed = { id, body }; return { id, cached: false }; },
  release() { releases++; }, finish: forbidden };
const dry = createFactionSlotReviewRuntimeV1({ input, legacyRuntime: { role: async () => { fallback++; return 'legacy'; } },
  store, executionPolicy, legacyRoleIds: fields.slotReviewLegacyRoleIds, recoveryOrigins: [origin],
  readRecoveryEvidence: environment.readRecoveryEvidence, reviewSlotNamespaceBinding: fields.reviewSlotNamespaceBinding });
await assert.rejects(dry.role(request), { code: 'FACTION_PREFLIGHT_SLOT_REVIEW_RECOVERY_REQUIRED' }); checks++;
eq(observed.body.contextManifestRef.hash, origin.contextHash); eq(releases, 1); eq(fallback, 0);
const newRequest = { ...request, roleId: request.roleId.replace('.adversarial.1.2.', '.adversarial.1.999.') };
await assert.rejects(dry.role(newRequest), { code: 'FACTION_PREFLIGHT_FIRST_SLOT_REVIEW_UNCACHED_ROLE' }); checks++;
eq(observed.body.outputContractRef.hash, fields.reviewSlotNamespaceBinding.current.hash);
const preservedRoleId = fields.slotReviewLegacyRoleIds.find(id => id.startsWith('faction.zerg_swarm.')
  && id !== request.packet.id + '.' + evidence.candidate.roleRef.id);
eq(await dry.role({ ...request, roleId: preservedRoleId.slice(request.packet.id.length + 1) }), 'legacy');
eq(fallback, 1);
const dependencies = await loadFactionStructuredReplayDependenciesV1({ root: process.cwd(), recipe: parent });
for (const row of proof.roles) {
  const recipe = reseal(parent, fields);
  let bound = null, read = 0;
  const replay = { readRoleSteps: () => [], bindRoleRequest: value => { bound = value; },
    store: { acquire(id, roleInput) {
      eq(bound, request); eq(id, row.value.roleId); eq(roleInput, row.roleInput); read++;
      return { cached: true, artifact: row.value };
    }, finish: forbidden, release: forbidden } };
  // The native proof uses the same review ID only to test the replacement
  // contract. In a real recipe an old paid review cannot be relabelled native.
  const scoped = row.mode === 'legacy_recovery' ? recipe : reseal(recipe, {
    slotReviewRecoveryOrigins: [origin],
    slotReviewLegacyRoleIds: fields.slotReviewLegacyRoleIds.filter(id => id !== row.value.roleId.replace(/\.source-evidence-v1\.[a-f0-9]{20}$/u, '')) });
  const activeRequest = row.mode === 'legacy_recovery' ? request : { ...request,
    roleId: request.roleId.replace('.adversarial.1.2.', '.adversarial.1.998.') };
  // Native cold routing is checked separately with its actual proof role input
  // and no legacy-origin interception; this preserves production routing rules.
  if (row.mode !== 'legacy_recovery') {
    const wrapper = createFactionSlotReviewRuntimeV1({ input, legacyRuntime: { role: forbidden },
      store: { acquire(id, value) { eq(value, row.roleInput); return { cached: true, artifact: row.value }; }, release: forbidden },
      executionPolicy, legacyRoleIds: [], recoveryOrigins: [], reviewSlotNamespaceBinding: fields.reviewSlotNamespaceBinding });
    eq((await wrapper.role(request)).hash, row.value.hash);
  } else {
    const stack = await createFactionReplayRuntimeStackV1({ root: process.cwd(), runId: parentRunId,
      recipe: scoped, input, replay, runtime: { role: forbidden }, dependencies });
    eq((await stack.runtime.role(activeRequest)).hash, row.value.hash); eq(read, 1);
  }
}
const mainFile = 'scripts/run-ticket-18-faction-strategy-production-v1.mjs';
const main = await readFile(mainFile, 'utf8');
for (const fragment of ['contract: slotReviewContract, prior: inheritedCapabilities?.slotReview || activeCatalogueCapability',
  'slotReview: activeSlotReviewCapability', 'capabilityReceipt: activeSlotReviewCapability, outputContract: slotReviewContract',
  'reviewSlotNamespaceBinding: recipe.reviewSlotNamespaceBinding', 'nativeRuntime: nativeSlotRuntime',
  'runId, input, runtime: slotRuntime, store, dsh, executionPolicy: structuredReviewPolicy, completeFieldValues',
  'input, runtime: contractProjectionRuntime, store, dsh, wireRecovery', 'runtime: drySlotRuntime',
  'catalogueReviewBinding, reviewSlotNamespaceBinding: recipe.reviewSlotNamespaceBinding',
  'readRecoveryEvidence: slotReviewEnvironment.readRecoveryEvidence',
  'slotReview: { readiness: slotReviewReadiness, environment: slotReviewEnvironment }',
  "'FACTION_PREFLIGHT_SLOT_REVIEW_RECOVERY_REQUIRED'"])
  { assert.ok(main.includes(fragment), fragment); checks++; }
const candidateCode = await readFile('packages/skill-evaluation/faction-candidate-evidence-v1.mjs', 'utf8');
assert.ok(candidateCode.includes('reviewSlotNamespaceBinding: recipe.reviewSlotNamespaceBinding || null')); checks++;
const files = [...new Set([...proof.codeHashes.map(row => row.file), mainFile,
  'packages/skill-production-v3/faction-slot-review-environment-v1.mjs',
  'packages/skill-production-v3/faction-slot-review-migration-v1.mjs',
  'packages/skill-production-v3/faction-continuation-v1.mjs',
  'packages/skill-evaluation/faction-replay-runtime-stack-v1.mjs',
  'packages/skill-evaluation/faction-candidate-evidence-v1.mjs',
  'scripts/verify-ticket-18-faction-five-chapter-replay-v1.mjs',
  'scripts/verify-ticket-18-faction-partial-consumer-replay-v1.mjs',
  'scripts/verify-ticket-18-slot-review-workflow-boundary-v1.mjs',
  'scripts/verify-ticket-18-slot-review-wiring-v1.mjs'])];
const body = { version: 'faction_slot_review_wiring_readiness_v1', passed: true,
  originRunId: parentRunId, runtimeProofHash: proof.hash, workflowBoundaryHash: workflowBoundary.hash, recipeFields: fields,
  actualPaidOwnerReread: true, ancestorContractRoutingPassed: true, dryRuntimeRoutingPassed: true,
  sqliteAndIndependentDshProofPassed: true, mainParametersBound: true, coldReplayParametersBound: true,
  mainProductionPreflightPassed: false, terranAncestorArtifactsHydrated: false,
  providerCalls: 0, semanticAcceptance: false, runtimeAccepted: false, trainingTruth: false,
  codeHashes: await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) }))) };
const provisional = seal(body);
const next = reseal(parent, { ...fields, slotReviewReadinessHash: provisional.hash,
  codeHashes: [...parent.codeHashes.filter(row => !files.includes(row.file)), ...body.codeHashes] });
const args = { parentRunId, parent, next, readiness: provisional, environment };
eq(validateFactionSlotReviewMigrationV1(args).originalAttemptsCopied, 0);
for (const patch of [{ limits: { ...next.limits, maxTokens: 1 } }, { inputHashes: [] },
  { slotReviewLegacyRoleIds: [] }, { slotReviewRecoveryOrigins: [] }, { slotReviewReadinessHash: hash('wrong') }])
  rejects(() => validateFactionSlotReviewMigrationV1({ ...args, next: reseal(next, patch) }));
eq(before, hash(source.prepare('SELECT * FROM attempts ORDER BY run,id').all())); source.close();
const report = seal({ ...body, checks });
await writeFile(base + 'slot-review-readiness-v1.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks, historicalReviewRoles: fields.slotReviewLegacyRoleIds.length,
  ancestorRecipes: environment.lineage.recipes.length, providerCalls: 0, mainProductionPreflightPassed: false, hash: report.hash }));
