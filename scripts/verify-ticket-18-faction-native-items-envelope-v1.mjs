import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFile, writeFile } from 'node:fs/promises';
import { hash, seal, verifySeal, sha256, fail } from
  '../packages/skill-production/common.mjs';
import { prepareDshLoop } from '../packages/skill-production/loops.mjs';
import { createFactionWritingPlanV1, factionRoleWorkspaceV1,
  normalizeFactionBatchEnvelopeV1, validateFactionDraftBatchV1 } from
  '../packages/skill-production-v3/faction-strategy-workflow-v1.mjs';
import { createFactionProposerBatchPlanV1 } from
  '../packages/skill-production-v3/faction-proposer-batches-v1.mjs';
import { readFactionTeachFailureEvidenceV1 } from
  '../packages/skill-evaluation/faction-teach-failure-evidence-v1.mjs';
import { prepareFactionNativeProductionRoleV1 } from
  '../packages/skill-production-v3/faction-native-production-runtime-v1.mjs';
import { applyFactionNativeOutputCapacityV2 } from
  '../packages/skill-production-v3/faction-native-output-capacity-v2.mjs';
import { FACTION_NATIVE_ITEMS_ENVELOPE_BINDING_V1 as binding,
  inspectFactionNativeItemsEnvelopeEvidenceV1,
  materializeFactionNativeItemsEnvelopeV1,
  normalizeFactionNativeItemsEnvelopeV1 } from
  '../packages/skill-production-v3/faction-native-items-envelope-recovery-v1.mjs';
import { withFactionNativeItemsEnvelopeRecoveryV1,
  usesFactionNativeProductionInputV3 } from
  '../packages/skill-production-v3/faction-native-items-envelope-runtime-v1.mjs';
import { planFactionVolatileStructuralReissueV1,
  withFactionVolatileStructuralStoreV1 } from
  '../packages/skill-production-v3/faction-volatile-structural-reissue-v1.mjs';
import { resolveFactionPromptLineageV1 } from
  '../packages/skill-production-v3/faction-prompt-lineage-v1.mjs';

const root = process.cwd();
const base = 'build/ticket-18-faction-production-v1/';
const filename = 'build/ticket-17-production-redesign-v1/production.sqlite';
const runId = 'faction-v1-d952274d1b531c2e1794';
const attemptId =
  'structured-58f3e1f5ebdf0115922097f50348b058c8ed454dfce19d94';
const read = async file => verifySeal(JSON.parse(await readFile(file, 'utf8')));
const recipe = await read(base + runId + '/recipe.json');
const input = await read(base + 'zerg_swarm-input.json');
const evidence = readFactionTeachFailureEvidenceV1({ filename, runId,
  attemptId });
const inspected = inspectFactionNativeItemsEnvelopeEvidenceV1({ input,
  evidence, binding });
let checks = 0;
assert.equal(inspected.normalized.movedItems, 2); checks++;
assert.equal(inspected.normalized.fieldValuesChanged, false); checks++;
assert.equal(inspected.normalized.originalProviderSchemaPassed, false); checks++;
assert.equal(inspected.normalized.normalizedProviderSchemaPassed, true); checks++;
const reverse = { items: inspected.normalized.output.items.map(
  ({ index, value }) => ({ index, ...value })) };
assert.equal(hash(reverse), hash(evidence.rejected.providerValue)); checks++;
const unknown = structuredClone(evidence.rejected.providerValue);
unknown.items[0].sourceRefs[0] = 'source:invented';
assert.throws(() => normalizeFactionNativeItemsEnvelopeV1({ input,
  value: unknown, binding }),
{ code: 'FACTION_NATIVE_ITEMS_ENVELOPE_UNKNOWN_SOURCE' }); checks++;
const nested = inspected.normalized.output;
assert.throws(() => normalizeFactionNativeItemsEnvelopeV1({ input,
  value: nested, binding }),
{ code: 'FACTION_NATIVE_ITEMS_ENVELOPE_NOT_APPLICABLE' }); checks++;
const incomplete = structuredClone(evidence.rejected.providerValue);
delete incomplete.items[0].risk;
assert.throws(() => normalizeFactionNativeItemsEnvelopeV1({ input,
  value: incomplete, binding })); checks++;

// Rebuild the exact paid request from authenticated parent checkpoints.
const db = new DatabaseSync(filename, { readOnly: true });
const role = id => {
  const row = db.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'")
    .get(runId, id);
  if (!row) fail('ITEMS_ENVELOPE_ROLE_EVIDENCE_MISSING');
  return verifySeal(JSON.parse(row.artifact)).value;
};
let request, continuationSteps;
try {
  const plan = createFactionWritingPlanV1(input);
  const section = plan.sections.find(row =>
    row.id === 'faction.zerg_swarm.objectives.1');
  const tutor = role('faction.zerg_swarm.tutor.capacity-assembly.v1');
  const tree = role('faction.zerg_swarm.question-tree');
  const challenger = role('faction.zerg_swarm.challenger');
  const answers = role('faction.zerg_swarm.' + section.id + '.reasoner');
  const judge = role('faction.zerg_swarm.' + section.id + '.judge');
  const questions = [
    ...tree.output.branches.find(row => row.axis === section.axis).questions,
    ...challenger.output.branches.find(row => row.axis === section.axis).probes,
  ].map((question, index) => ({ index, ...question }));
  const packet = seal({ id: 'faction.zerg_swarm', inputHash: input.hash,
    sourceBinding: input.sourceBinding });
  const scope = { section, questionTree: tree.output, questions,
    unverifiedTutor: tutor.output };
  const proposerRequest = { packet, roleId: section.id + '.proposer',
    instruction: 'Proposer',
    workspace: { ...factionRoleWorkspaceV1(input), ...scope,
      answers: answers.output, judge: judge.output }, maxOutput: 4096 };
  const proposerPlan = createFactionProposerBatchPlanV1({ input,
    request: proposerRequest, binding: recipe.proposerBatchBinding });
  const assembly = role('faction.zerg_swarm.' + section.id
    + '.proposer.assembly-v1.' + proposerPlan.hash.slice(0, 20));
  assert.equal(assembly.planHash, proposerPlan.hash); checks++;
  assert.equal(assembly.hash.slice(0, 20), '02f439f8a2730391026a'); checks++;
  const outline = role('faction.zerg_swarm.' + section.id
    + '.generator-outline.planning-v1.' + assembly.hash.slice(0, 20));
  const first = role('faction.zerg_swarm.' + section.id
    + '.generator-items.0.planning-v1.' + assembly.hash.slice(0, 20));
  const completedRecommendations = normalizeFactionBatchEnvelopeV1(
    first.output).output.items.map(row => row.value);
  const writingScope = { ...scope, answers: answers.output,
    proposerPlan, proposerAssemblyHash: assembly.hash };
  const instruction = 'Generator：仅为indices指定的1至2项提纲写完整中文策略建议。全部官方来源、总规则、整节提纲和已完成建议均在输入中；分批只限制输出，不限制阅读。逐项保留适用条件、支付/时机/例外、步骤、替代、风险、reviseIf和未证明效果。对于单位考虑装备/规模/任务条件；卡牌保留次数限制和资源替代用途。不保证胜利，不复制题号。返回'
    + JSON.stringify({ items: [{ index: 0, value: {
      title: '标题', when: ['适用的可观察条件'], procedure: ['步骤'],
      alternatives: ['不同条件下的替代行动及取舍'], risk: '代价/失败风险',
      reviseIf: ['何时改变计划'], sourceRefs: ['完整官方来源ID'],
      unproven: ['尚需实际局面/对战检验的效果'],
    } }] })
    + '，index必须是从indices复制的JSON整数，每个index一次。每项文本不超过1600字符，sourceRefs保留提纲所引来源，可补真实来源至最多8个。不要输出其他index、整份Skill或提纲。';
  request = { packet,
    roleId: section.id + '.generator-items.2.planning-v1.'
      + assembly.hash.slice(0, 20),
    instruction,
    workspace: { ...factionRoleWorkspaceV1(input), ...writingScope,
      proposals: assembly.output, judge: judge.output,
      outline: outline.output.outline, indices: [2, 3],
      completedRecommendations },
    maxOutput: 4096 };
  continuationSteps = db.prepare("SELECT id,input_hash,artifact FROM steps WHERE run=? AND state='complete'")
    .all(runId).map(row => ({ id: row.id, inputHash: row.input_hash,
      artifact: verifySeal(JSON.parse(row.artifact)).value }));
} finally { db.close(); }
assert.equal(request.packet.id + '.' + request.roleId,
  evidence.rejected.roleRef.id); checks++;
const effectiveRequest = applyFactionNativeOutputCapacityV2(request,
  recipe.nativeOutputCapacityBinding);
const prepared = prepareFactionNativeProductionRoleV1({
  input,
  request: effectiveRequest,
  executionPolicy: recipe.nativeOutputCapacityBinding.executionPolicy,
  outputCapacityBinding: recipe.nativeOutputCapacityBinding,
  proposerBatchBinding: recipe.proposerBatchBinding,
  proposerAuxiliaryCapacityBinding: recipe.proposerAuxiliaryCapacityBinding,
  targetReconstructionBinding: recipe.nativeTargetReconstructionBinding,
});
assert.equal(prepared.contextManifestRef.hash,
  evidence.rejected.contextManifestRef.hash); checks++;
assert.equal(prepared.roleRef.hash, evidence.rejected.roleRef.hash); checks++;
const materialization = materializeFactionNativeItemsEnvelopeV1({ input,
  request: effectiveRequest, prepared, evidence, binding,
  draftEnvelopeBinding: recipe.draftEnvelopeBinding });
assert.equal(hash(materialization.output),
  hash(inspected.normalized.output)); checks++;
assert.equal(materialization.providerCalls, 0); checks++;
assert.equal(materialization.downstreamFailureCode,
  'FACTION_BATCH_DUPLICATE_RECOMMENDATION'); checks++;
assert.throws(() => materializeFactionNativeItemsEnvelopeV1({ input,
  request: effectiveRequest, prepared: { ...prepared,
    payload: prepared.payload + ' ' }, evidence, binding,
  draftEnvelopeBinding: recipe.draftEnvelopeBinding }),
{ code: 'FACTION_NATIVE_ITEMS_ENVELOPE_EVIDENCE_INVALID' }); checks++;

const volatilePlan = await planFactionVolatileStructuralReissueV1({
  root, filename, recipe, continuation: { steps: continuationSteps }, input,
  enabled: true });
assert.equal(volatilePlan.origins.length, 3); checks++;
assert.equal(volatilePlan.archivedOrigins.length, 1); checks++;
assert.equal(volatilePlan.quarantineRoleIds.length, 3); checks++;
assert.match(volatilePlan.quarantineRoleIds.find(id =>
  id.includes('supportive.0.2')),
  /unit_roles\.2\.review-target-batch-v1\.supportive\.0\.2\.source-evidence-v1/u); checks++;
let directAcquires = 0, inheritedAcquires = 0;
const inheritedStore = { acquire() { inheritedAcquires++; return 'old'; } };
const volatileStore = withFactionVolatileStructuralStoreV1({
  directStore: { acquire() { directAcquires++; return 'fresh'; } },
  inheritedStore, plan: volatilePlan });
assert.equal(volatileStore.acquire(volatilePlan.quarantineRoleIds[0], {}),
  'fresh'); checks++;
assert.equal(volatileStore.acquire('unrelated', {}), 'old'); checks++;
assert.deepEqual([directAcquires, inheritedAcquires], [1, 1]); checks++;

// A quarantined exact-input role is allowed to replace its inherited artifact,
// but only when the checkpoint inventory authenticates the materializing run.
const lineageId = 'faction.zerg_swarm.lineage-fixture';
const lineageInputHash = hash('lineage exact input');
const inheritedLineageArtifact = seal({ roleId: lineageId,
  loop: { transcript: [{ observedHash: hash('old') }] } });
const materializedLineageArtifact = seal({ roleId: lineageId,
  structuredDecodePassed: true,
  loop: { transcript: [{ observedHash: hash('fresh') }] } });
const lineageAncestorId = 'faction-v1-' + hash('lineage ancestor').slice(0, 20);
const lineageOwnerId = 'faction-v1-' + hash('lineage owner').slice(0, 20);
const lineageAncestorRecipe = seal({ marker: 'lineage ancestor' });
const lineageOwnerRecipe = seal({ structuredGenerationBinding: seal({ marker: 'structured' }),
  continuation: seal({ parentRunId: lineageAncestorId,
    parentRecipeHash: lineageAncestorRecipe.hash,
    reusable: [{ id: lineageId, inputHash: lineageInputHash,
      artifactHash: hash(inheritedLineageArtifact) }] }) });
const lineageInventory = seal({
  ancestors: [{ runId: lineageOwnerId,
    recipeHash: lineageOwnerRecipe.hash }],
  reusable: [{ id: lineageId, inputHash: lineageInputHash,
    artifactHash: hash(materializedLineageArtifact),
    checkpointOwnerRunId: lineageOwnerId,
    checkpointOwnerRecipeHash: lineageOwnerRecipe.hash }],
});
const lineageSteps = [{ id: lineageId, inputHash: lineageInputHash,
  artifact: materializedLineageArtifact }];
const lineage = await resolveFactionPromptLineageV1({ steps: lineageSteps,
  parentRunId: lineageOwnerId, checkpointInventory: lineageInventory,
  readRecipe: async id => id === lineageOwnerId ? lineageOwnerRecipe
    : lineageAncestorRecipe });
assert.equal(lineage.rows[0].originRunId, lineageOwnerId); checks++;
assert.equal(lineage.rows[0].promptProtocol, 'structured'); checks++;
await assert.rejects(() => resolveFactionPromptLineageV1({
  steps: lineageSteps, parentRunId: lineageOwnerId,
  readRecipe: async id => id === lineageOwnerId ? lineageOwnerRecipe
    : lineageAncestorRecipe }),
{ code: 'FACTION_PROMPT_LINEAGE_STEP_DRIFT' }); checks++;

const dsh = await prepareDshLoop(root);
let stored = null;
const store = {
  acquire(id, roleInput) {
    assert.equal(id, prepared.fullRoleId);
    assert.deepEqual(roleInput, prepared.roleInput);
    return stored ? { cached: true, artifact: stored } : { cached: false };
  },
  finish(_lease, value) { stored = value; return value; },
  release() {},
};
let fallbacks = 0;
const runtime = withFactionNativeItemsEnvelopeRecoveryV1({
  input,
  runtime: { role() {
    fallbacks++;
    fail('ITEMS_ENVELOPE_PROVIDER_FORBIDDEN');
  } },
  store,
  dsh,
  binding,
  imports: [evidence],
  outputCapacityBinding: recipe.nativeOutputCapacityBinding,
  frozenRoleIds: recipe.nativeOutputCapacityFrozenRoleIds,
  proposerBatchBinding: recipe.proposerBatchBinding,
  proposerAuxiliaryCapacityBinding: recipe.proposerAuxiliaryCapacityBinding,
  targetReconstructionBinding: recipe.nativeTargetReconstructionBinding,
  draftEnvelopeBinding: recipe.draftEnvelopeBinding,
});
const imported = await runtime.role(request);
assert.equal(hash(imported.output), hash(materialization.output)); checks++;
assert.throws(() => validateFactionDraftBatchV1(imported.output, {
  input, outline: effectiveRequest.workspace.outline,
  indices: effectiveRequest.workspace.indices,
  completedRecommendations: effectiveRequest.workspace.completedRecommendations,
  draftEnvelopeBinding: recipe.draftEnvelopeBinding,
}),
{ code: 'FACTION_BATCH_DUPLICATE_RECOMMENDATION' }); checks++;
assert.equal(usesFactionNativeProductionInputV3(imported), true); checks++;
assert.equal(imported.hostMaterialization.normalized.fieldValuesChanged,
  false); checks++;
assert.equal((await runtime.role(request)).hash, imported.hash); checks++;
assert.equal(fallbacks, 0); checks++;

const files = [
  'packages/skill-production-v3/faction-native-items-envelope-recovery-v1.mjs',
  'packages/skill-production-v3/faction-native-items-envelope-runtime-v1.mjs',
  'packages/skill-production-v3/faction-volatile-structural-reissue-v1.mjs',
  'packages/skill-production-v3/faction-prompt-lineage-v1.mjs',
  'packages/skill-production-v3/faction-continuation-v2.mjs',
  'scripts/run-ticket-18-faction-strategy-production-v2.mjs',
  'scripts/verify-ticket-18-faction-native-items-envelope-v1.mjs',
];
const report = seal({
  passed: true,
  checks,
  binding,
  bindingHash: binding.hash,
  originRunId: runId,
  originAttemptId: attemptId,
  inputHash: input.hash,
  evidenceHash: inspected.hash,
  originalFailureReceiptHash: inspected.originalFailureReceiptHash,
  rejectedCandidateHash: inspected.rejectedCandidateHash,
  originalOutputHash: inspected.normalized.originalOutputHash,
  normalizedOutputHash: inspected.normalized.outputHash,
  recoveredArtifactHash: imported.hash,
  movedItems: inspected.normalized.movedItems,
  actualRequestContextRebuilt: true,
  actualDshSessions: 1,
  providerCalls: 0,
  oldProviderSchemaRejects: true,
  normalizedProviderSchemaAccepts: true,
  originalCandidateBytesPreserved: true,
  fieldValuesChanged: false,
  onlyEnvelopeShapeIssuesAccepted: true,
  unknownSourcesRejected: true,
  nonEnvelopeIssuesRejected: true,
  productionWrapperTested: true,
  cachedRestartReplayPassed: true,
  freshWholeSectionReviewRequired: true,
  semanticAcceptanceInherited: false,
  sourceRefreshPerformed: false,
  trainingTruth: false,
  codeHashes: await Promise.all(files.map(async file => ({ file,
    hash: sha256(await readFile(file)) }))),
});
await writeFile(base + 'native-items-envelope-readiness-v1.json',
  JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks,
  originRunId: runId, originAttemptId: attemptId,
  movedItems: report.movedItems, actualDshSessions: 1,
  providerCalls: 0, hash: report.hash }));
