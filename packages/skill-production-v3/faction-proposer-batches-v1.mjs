import { seal, verifySeal, hash, exact, text, fail } from '../skill-production/common.mjs';
import { createStarcraftTmgOutputContractV1, outputContractRefStarcraftTmgV1 } from '../structured-generation/output-contract-registry-v1.mjs';
import { validateFactionProposerAuxiliaryCapacityV1 } from './faction-proposer-auxiliary-capacity-v1.mjs';

// A Proposer writes a plan for the later Generator, not another full rulebook.
// Batch only its output obligations; keep the original source/answer/Judge
// workspace intact in every request. No truncated prefix enters assembly.
const str = maxLength => ({ type: 'string', minLength: 1, maxLength });
export const FACTION_PROPOSER_BATCH_CONTRACT_V1 = createStarcraftTmgOutputContractV1({
  id: 'starcraft-tmg.faction-proposer-plan-batch', version: '2026.09.08.1', schemaName: 'faction_proposer_plan_batch_v1',
  providerSchema: { type: 'object', additionalProperties: false, required: ['plans', 'uncertainties'], properties: {
    plans: { type: 'array', minItems: 1, maxItems: 2, items: { type: 'object', additionalProperties: false,
      required: ['index', 'text', 'sourceRefs'], properties: { index: { type: 'integer', minimum: 0, maximum: 127 },
        text: str(600), sourceRefs: { type: 'array', minItems: 1, maxItems: 8, uniqueItems: true, items: str(512) } } } },
    uncertainties: { type: 'array', minItems: 0, maxItems: 2, items: str(240) },
  } },
  modelOwnedFields: ['plans', 'uncertainties'], hostOwnedFields: ['targets', 'assembly', 'acceptance'],
  mapperRef: { id: 'faction.proposer.plans.identity', version: '1.0.0', hash: hash('preserve-all-planning-text-and-source-refs') },
  semanticValidatorRef: { id: 'faction.proposer.batch.targets', version: '1.0.0', hash: hash('exact-planning-targets-then-full-draft-source-review') },
  description: 'At most two source-bound writing plans, not final strategy content or semantic acceptance.' });

export const FACTION_PROPOSER_BATCH_BINDING_V1 = seal({ version: 'faction_proposer_batches_v1',
  contractRef: outputContractRefStarcraftTmgV1(FACTION_PROPOSER_BATCH_CONTRACT_V1), batchSize: 2,
  assignedSourceGroupSize: 4, planTextMaximum: 600, maxOutputUnits: 4096,
  targetScope: 'every_original_question_plus_assigned_sources_not_named_by_questions',
  fullOriginalWorkspaceInEveryBatch: true, preserveCorrectedAnswersAndFreshJudge: true,
  preserveNegativeJudgments: true, assembly: 'lossless_all_target_plans_before_outline',
  incompleteOutputAccepted: false, automaticWholeRoleRetries: 0,
  finalSkillTextLengthLimitedByThisPlan: false, canAffectRules: false, trainingTruth: false });

export function createFactionProposerBatchPlanV1({ input, request, binding = FACTION_PROPOSER_BATCH_BINDING_V1 }) {
  [input, request.packet, binding].forEach(verifySeal);
  if (binding.hash !== FACTION_PROPOSER_BATCH_BINDING_V1.hash || request.packet.inputHash !== input.hash
    || request.packet.id !== 'faction.' + input.factionRecordKey.split(':')[1]
    || hash(request.packet.sourceBinding) !== hash(input.sourceBinding)
    || request.roleId !== request.workspace.section.id + '.proposer') fail('FACTION_PROPOSER_BATCH_SCOPE_INVALID');
  const w = request.workspace, sources = new Set(input.frozenSources.prompt.sources.map(s => s.ref));
  const checkRefs = refs => {
    if (!Array.isArray(refs) || !refs.length || refs.length > 8 || new Set(refs).size !== refs.length
      || refs.some(ref => !sources.has(ref))) fail('FACTION_PROPOSER_BATCH_SOURCE_INVALID');
  };
  if (!Array.isArray(w.questions) || !w.questions.length || w.questions.length > 8
    || w.answers?.answers?.length !== w.questions.length || w.judge?.judgments?.length !== w.questions.length)
    fail('FACTION_PROPOSER_BATCH_INPUT_DENOMINATOR');
  const seen = new Set(), covered = new Set();
  const targets = w.questions.map((question, index) => {
    if (question.index !== index || seen.has(index)
      || w.answers.answers.filter(a => a.index === index).length !== 1
      || w.judge.judgments.filter(j => j.index === index).length !== 1) fail('FACTION_PROPOSER_BATCH_INPUT_DENOMINATOR');
    seen.add(index); checkRefs(question.sourceRefs); question.sourceRefs.forEach(r => covered.add(r));
    return { index, kind: 'question', questionIndex: index, question: question.question,
      requiredSourceRefs: question.sourceRefs };
  });
  if (!Array.isArray(w.section.requiredSourceRefs) || new Set(w.section.requiredSourceRefs).size !== w.section.requiredSourceRefs.length
    || w.section.requiredSourceRefs.some(ref => !sources.has(ref))) fail('FACTION_PROPOSER_BATCH_SOURCE_INVALID');
  const remaining = w.section.requiredSourceRefs.filter(ref => !covered.has(ref));
  for (let first = 0; first < remaining.length; first += binding.assignedSourceGroupSize) {
    targets.push({ index: targets.length, kind: 'assigned_source_coverage', questionIndex: null,
      question: '为这些本节指定来源规划有条件的决策用法与待验证事项，不复述完整规则书。',
      requiredSourceRefs: remaining.slice(first, first + binding.assignedSourceGroupSize) });
  }
  if (targets.length > 128) fail('FACTION_PROPOSER_BATCH_TARGET_CAPACITY');
  return seal({ version: 'faction_proposer_batch_plan_v1', bindingHash: binding.hash,
    inputHash: input.hash, sourceBinding: input.sourceBinding, packetHash: request.packet.hash,
    parentRoleId: request.roleId, sectionId: w.section.id, originalWorkspaceHash: hash(w),
    originalQuestionsHash: hash(w.questions), answersHash: hash(w.answers), judgeHash: hash(w.judge),
    targets, batches: Array.from({ length: Math.ceil(targets.length / binding.batchSize) }, (_, ordinal) =>
      targets.slice(ordinal * binding.batchSize, (ordinal + 1) * binding.batchSize).map(t => t.index)),
    fullContextPreserved: true, partialParentOutputUsed: false, semanticAcceptance: false, trainingTruth: false });
}

export function validateFactionProposerBatchOutputV1(output, { input, plan, indices, auxiliaryCapacityBinding = null }) {
  [input, plan].forEach(verifySeal);
  if (plan.bindingHash !== FACTION_PROPOSER_BATCH_BINDING_V1.hash || plan.inputHash !== input.hash
    || !plan.batches.some(batch => hash(batch) === hash(indices))) fail('FACTION_PROPOSER_BATCH_PLAN_DRIFT');
  exact(output, ['plans', 'uncertainties']);
  if (!Array.isArray(output.plans) || output.plans.length !== indices.length) fail('FACTION_PROPOSER_BATCH_OUTPUT_DENOMINATOR');
  const envelope = auxiliaryCapacityBinding ? validateFactionProposerAuxiliaryCapacityV1(auxiliaryCapacityBinding) : null;
  const maximumUncertainties = envelope?.maximumUncertainties ?? 2;
  if (!Array.isArray(output.uncertainties) || output.uncertainties.length > maximumUncertainties) fail('FACTION_PROPOSER_BATCH_UNCERTAINTIES_INVALID');
  output.uncertainties.forEach(value => text(value, 240));
  const sources = new Set(input.frozenSources.prompt.sources.map(s => s.ref)), pending = new Set(indices);
  for (const row of output.plans) {
    exact(row, ['index', 'text', 'sourceRefs']); text(row.text, envelope?.maximumPlanTextLength ?? 600);
    if (!pending.delete(row.index)) fail('FACTION_PROPOSER_BATCH_OUTPUT_TARGET_INVALID');
    if (!Array.isArray(row.sourceRefs) || !row.sourceRefs.length || row.sourceRefs.length > 8
      || new Set(row.sourceRefs).size !== row.sourceRefs.length || row.sourceRefs.some(ref => !sources.has(ref)))
      fail('FACTION_PROPOSER_BATCH_SOURCE_INVALID');
    if (plan.targets[row.index].requiredSourceRefs.some(ref => !row.sourceRefs.includes(ref)))
      fail('FACTION_PROPOSER_BATCH_REQUIRED_SOURCE_OMITTED');
  }
  return output;
}

export function assembleFactionProposerBatchesV1({ input, plan, batches, auxiliaryCapacityBinding = null }) {
  [input, plan].forEach(verifySeal);
  if (!Array.isArray(batches) || batches.length !== plan.batches.length) fail('FACTION_PROPOSER_ASSEMBLY_INCOMPLETE');
  const all = [], uncertainties = [], artifactHashes = [];
  for (const [ordinal, batch] of batches.entries()) {
    if (hash(batch.indices) !== hash(plan.batches[ordinal]) || !/^[a-f0-9]{64}$/.test(batch.artifactHash || ''))
      fail('FACTION_PROPOSER_ASSEMBLY_ORDER_INVALID');
    const output = validateFactionProposerBatchOutputV1(batch.output, { input, plan, indices: batch.indices, auxiliaryCapacityBinding });
    all.push(...output.plans); uncertainties.push(...output.uncertainties); artifactHashes.push(batch.artifactHash);
  }
  all.sort((a, b) => a.index - b.index);
  const output = { lesson: all.map(p => '[' + plan.targets[p.index].kind + ':' + p.index + '] ' + p.text
    + '\nsourceRefs: ' + p.sourceRefs.join(', ')), uncertainties: [...new Set(uncertainties)] };
  if (Buffer.byteLength(JSON.stringify(output)) > 65536) fail('FACTION_PROPOSER_ASSEMBLY_TOO_LARGE');
  return seal({ version: 'faction_proposer_batch_assembly_v1', planHash: plan.hash, inputHash: input.hash,
    originalWorkspaceHash: plan.originalWorkspaceHash, artifactHashes, targetCount: all.length, output,
    allPlanningTextPreserved: true, originalQuestionsOmitted: false, finalSkillGenerated: false,
    sourceReviewPassed: false, semanticAcceptance: false, runtimeAccepted: false, trainingTruth: false });
}

export function factionProposerBatchRequestV1({ input, request, plan, batchIndex, priorBatches, auxiliaryCapacityBinding = null }) {
  const expected = createFactionProposerBatchPlanV1({ input, request });
  if (expected.hash !== verifySeal(plan).hash || !Number.isSafeInteger(batchIndex)
    || !plan.batches[batchIndex] || priorBatches.length !== batchIndex)
    fail('FACTION_PROPOSER_BATCH_REQUEST_DRIFT');
  for (const [ordinal, batch] of priorBatches.entries()) {
    if (hash(batch.indices) !== hash(plan.batches[ordinal]) || !/^[a-f0-9]{64}$/.test(batch.artifactHash || ''))
      fail('FACTION_PROPOSER_BATCH_REQUEST_DRIFT');
    validateFactionProposerBatchOutputV1(batch.output, { input, plan, indices: batch.indices, auxiliaryCapacityBinding });
  }
  const indices = plan.batches[batchIndex];
  return { ...request, maxOutput: FACTION_PROPOSER_BATCH_BINDING_V1.maxOutputUnits,
    roleId: plan.sectionId + '.proposer-batch-v1.' + plan.hash.slice(0, 20) + '.batch.' + batchIndex,
    instruction: 'Proposer短计划：完整规则、全部问题、完整答案与最新Judge均保留。只给outputRequestAtEnd.targets指定的1至2条计划，每条text最多600字符；这是后续正文的写作计划，不是最终Skill字数限制。逐项保留条件、纠错、替代选择和未证实事项；只引用真实来源，负面Judge不得改成已通过。原问题属于全轴背景，若涉及别组卡牌，说明与本节指定来源的关系或边界，不把背景卡牌再次当作本节全部内容。assigned_source_coverage任务必须规划指定卡牌自身的有条件决策，不能只复制上一组卡牌。返回plans和uncertainties的原生JSON对象，不复述整份规则书。',
    workspace: { ...request.workspace, proposerBatch: { plan, batchIndex, originalInstruction: request.instruction,
      originalMaxOutput: request.maxOutput, priorBatches: structuredClone(priorBatches) },
      outputRequestAtEnd: { action: 'write_only_assigned_short_plans', indices,
        targets: indices.map(index => plan.targets[index]), sectionRequiredSourceRefs: request.workspace.section.requiredSourceRefs,
        expectedShape: { plans: indices.map(index => ({ index, text: '有条件决策结构、需要纠正的事实及未证实事项',
          sourceRefs: plan.targets[index].requiredSourceRefs })), uncertainties: [] } } } };
}

// Rebuild the exact child from its original workspace. A caller cannot use a
// valid plan hash while changing targets, dropping a negative or a prior part.
export function validateFactionProposerBatchRequestV1({ input, request, auxiliaryCapacityBinding = null }) {
  const w = request.workspace, batch = w.proposerBatch;
  if (!batch) fail('FACTION_PROPOSER_BATCH_REQUEST_DRIFT');
  const { proposerBatch, outputRequestAtEnd, ...originalWorkspace } = w;
  const parent = { ...request, roleId: batch.plan.parentRoleId,
    instruction: batch.originalInstruction, maxOutput: batch.originalMaxOutput, workspace: originalWorkspace };
  const expected = factionProposerBatchRequestV1({ input, request: parent, plan: batch.plan,
    batchIndex: batch.batchIndex, priorBatches: batch.priorBatches, auxiliaryCapacityBinding });
  if (hash(expected) !== hash(request)) fail('FACTION_PROPOSER_BATCH_REQUEST_DRIFT');
  return batch.plan;
}

export async function produceFactionProposerBatchesV1({ input, request, role, store, auxiliaryCapacityBinding = null,
  onArtifact = () => {}, onProgress = () => {} }) {
  if (auxiliaryCapacityBinding) validateFactionProposerAuxiliaryCapacityV1(auxiliaryCapacityBinding);
  const plan = createFactionProposerBatchPlanV1({ input, request }), batches = [];
  for (let batchIndex = 0; batchIndex < plan.batches.length; batchIndex++) {
    const child = factionProposerBatchRequestV1({ input, request, plan, batchIndex, priorBatches: batches, auxiliaryCapacityBinding });
    const artifact = verifySeal(await role(child));
    if (artifact.roleId !== request.packet.id + '.' + child.roleId) fail('FACTION_PROPOSER_BATCH_ARTIFACT_SCOPE');
    onArtifact({ id: child.roleId, hash: artifact.hash });
    validateFactionProposerBatchOutputV1(artifact.output, { input, plan, indices: plan.batches[batchIndex], auxiliaryCapacityBinding });
    batches.push({ indices: plan.batches[batchIndex], artifactHash: artifact.hash, output: artifact.output });
    onProgress({ section: plan.sectionId, stage: 'proposer_plan_batch_complete', completed: batches.length,
      total: plan.batches.length, finalSkillGenerated: false });
  }
  const assembly = assembleFactionProposerBatchesV1({ input, plan, batches, auxiliaryCapacityBinding });
  const lease = store.acquire(request.packet.id + '.' + request.roleId + '.assembly-v1.' + plan.hash.slice(0, 20),
    { assemblyHash: assembly.hash });
  const artifact = lease.cached ? verifySeal(lease.artifact) : store.finish(lease, assembly);
  if (artifact.hash !== assembly.hash) fail('FACTION_PROPOSER_ASSEMBLY_STORE_DRIFT');
  return { artifact, value: artifact.output, plan };
}
