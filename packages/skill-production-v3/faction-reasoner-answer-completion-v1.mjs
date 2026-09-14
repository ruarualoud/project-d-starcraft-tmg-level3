import { seal, verifySeal, hash, fail } from '../skill-production/common.mjs';
import { FACTION_NATIVE_PRODUCTION_CONTRACTS_V1 as contracts } from '../../content/skill-generation/ticket-18-faction-native-production-contracts-v1.mjs';
import { validateStarcraftTmgProviderJsonSchemaValueV1 as validate } from '../structured-generation/output-contract-registry-v1.mjs';
import { planFactionReasonerAnswerGapsV1 } from './faction-reasoner-answer-gap-v1.mjs';

export const FACTION_REASONER_ANSWER_COMPLETION_BINDING_V1 = seal({
  version: 'faction_reasoner_answer_completion_v1', batchSize: 2,
  scope: 'complete_paid_reasoner_output_with_exact_unanswered_input_question_copies',
  preservedOriginalAnswersAreUnreviewed: true, fullSourceWorkspaceAndPriorAnswersRequired: true,
  aggregateRequiresFreshJudge: true, originalFailureUnchanged: true, trainingTruth: false });

export function prepareFactionReasonerAnswerCompletionV1({ input, request, prepared, evidence }) {
  const { attempt, issue, rejected } = evidence;
  [input, issue, rejected].forEach(verifySeal);
  const receipt = verifySeal(JSON.parse(attempt.response)).value, usage = verifySeal(JSON.parse(attempt.usage)).value;
  const { receiptHash, ...body } = receipt;
  const checked = validate(contracts.reasoner.providerSchema, rejected.providerValue);
  if (prepared.kind !== 'reasoner' || !request.roleId.endsWith('.reasoner')
    || attempt.state !== 'failed' || attempt.code !== 'STRUCTURED_PROVIDER_SCHEMA_INVALID'
    || !Number.isSafeInteger(attempt.settled) || hash(body) !== receiptHash
    || receipt.status !== 200 || receipt.incompleteReason !== null || !receipt.usageKnown
    || receipt.physicalAttempts !== 1 || receipt.automaticRetries !== 0 || hash(receipt.usage) !== hash(usage)
    || hash(receipt.schemaIssues) !== hash(checked.issues) || hash(rejected.validation) !== hash(checked)
    || issue.safeReceiptHash !== receiptHash || rejected.safeReceiptHash !== receiptHash
    || issue.rejectedCandidateRef?.hash !== rejected.hash || issue.invocationHash !== rejected.invocationHash
    || attempt.id !== 'structured-' + rejected.invocationHash.slice(0, 48)
    || hash(receipt.outputContractRef) !== hash(prepared.outputContractRef)
    || hash(rejected.outputContractRef) !== hash(prepared.outputContractRef)
    || hash(rejected.roleRef) !== hash(prepared.roleRef)
    || hash(rejected.contextManifestRef) !== hash(prepared.contextManifestRef)) fail('FACTION_ANSWER_COMPLETION_EVIDENCE_INVALID');
  const plan = planFactionReasonerAnswerGapsV1({ input, questions: request.workspace.questions, rejectedOutput: rejected.providerValue });
  return seal({ version: 'faction_reasoner_answer_completion_materialization_v1',
    bindingHash: FACTION_REASONER_ANSWER_COMPLETION_BINDING_V1.hash, inputHash: input.hash,
    fullRoleId: prepared.fullRoleId, roleInputHash: hash(prepared.roleInput), requestHash: hash(request),
    originRunId: attempt.run, originAttemptId: attempt.id, originalFailureReceiptHash: receiptHash,
    originalRejectedCandidateHash: rejected.hash, originalUsage: usage, originalSettledMicros: attempt.settled,
    plan, originalIncompleteOutput: rejected.providerValue, semanticAcceptanceInherited: false, trainingTruth: false });
}

export function factionReasonerCompletionRequestV1({ request, materialization, batchIndex, priorParts }) {
  verifySeal(materialization);
  if (materialization.requestHash !== hash(request) || !Number.isInteger(batchIndex) || batchIndex < 0
    || priorParts.length !== batchIndex || !materialization.plan.batches[batchIndex]) fail('FACTION_ANSWER_COMPLETION_BATCH_SCOPE');
  const indices = materialization.plan.batches[batchIndex];
  return { ...request,
    roleId: request.roleId + '.answer-completion-v1.' + materialization.hash.slice(0, 20) + '.batch.' + batchIndex,
    instruction: 'Reasoner缺答补全：只回答answerTargetsAtEnd的两个（或最后一个）问题，输出实际推理answer，不能复述question。'
      + '完整官方来源、原问题、原未完成输出、已有回答均在上下文；原答案和原问题中的规则前提不保证正确，须按来源核验。'
      + '保留条件、费用、时机、替代选择和未证明事项，不声称胜率或完整行动合法。'
      + '返回' + JSON.stringify({ answers: [{ index: indices[0], answer: '实际回答与有条件取舍', sourceRefs: ['官方来源ID'] }], uncertainties: ['待验证事项'] })
      + '。每个目标index恰好一次；只输出这些索引，不补写或修改其他答案。',
    workspace: { ...request.workspace, answerCompletion: materialization,
      priorAnswerBatches: priorParts.map(p => p.output),
      answerTargetsAtEnd: request.workspace.questions.filter(q => indices.includes(q.index)) } };
}

export function validateFactionReasonerCompletionPartV1({ input, materialization, batchIndex, output }) {
  const expected = materialization.plan.batches[batchIndex];
  const known = new Set(input.frozenSources.prompt.sources.map(s => s.ref));
  if (!expected || !validate(contracts.reasoner.providerSchema, output).ok
    || output.answers.length !== expected.length || new Set(output.answers.map(a => a.index)).size !== expected.length
    || output.answers.some(a => !expected.includes(a.index) || a.sourceRefs.some(ref => !known.has(ref))
      || a.answer === materialization.originalIncompleteOutput.answers.find(r => r.index === a.index)?.question))
    fail('FACTION_ANSWER_COMPLETION_PART_INVALID');
  return output;
}

export function assembleFactionReasonerAnswerCompletionV1({ input, request, prepared, materialization, parts }) {
  verifySeal(materialization);
  if (parts.length !== materialization.plan.batches.length || materialization.requestHash !== hash(request)
    || materialization.roleInputHash !== hash(prepared.roleInput)) fail('FACTION_ANSWER_COMPLETION_ASSEMBLY_SCOPE');
  const answers = [...materialization.plan.retainedAnswers], uncertainties = [...materialization.plan.retainedUncertainties];
  parts.forEach((part, batchIndex) => {
    verifySeal(part);
    const child = factionReasonerCompletionRequestV1({ request, materialization, batchIndex, priorParts: parts.slice(0, batchIndex) });
    if (part.roleId !== child.packet.id + '.' + child.roleId || part.structuredDecodePassed !== true
      || part.semanticAcceptance !== false || part.trainingTruth !== false) fail('FACTION_ANSWER_COMPLETION_PART_SCOPE');
    validateFactionReasonerCompletionPartV1({ input, materialization, batchIndex, output: part.output });
    answers.push(...part.output.answers); uncertainties.push(...part.output.uncertainties);
  });
  const byIndex = new Map(answers.map(a => [a.index, a]));
  const output = { answers: request.workspace.questions.map(q => byIndex.get(q.index)), uncertainties };
  if (byIndex.size !== request.workspace.questions.length || !validate(contracts.reasoner.providerSchema, output).ok)
    fail('FACTION_ANSWER_COMPLETION_AGGREGATE_INVALID');
  return seal({ roleId: prepared.fullRoleId, protocol: FACTION_REASONER_ANSWER_COMPLETION_BINDING_V1.version,
    nativeKind: 'reasoner', output, outputContractRef: prepared.outputContractRef,
    contextManifestRef: prepared.contextManifestRef, sourceContextHash: input.frozenSources.hash,
    sourceDelivery: 'complete_frozen_sources_and_faction_workspace', hostMaterialization: materialization,
    completionPartRefs: parts.map(p => ({ id: p.roleId, hash: p.hash })),
    originalProviderSchemaPassed: false, structuredDecodePassed: true,
    originalAnswersChanged: false, questionAliasesAcceptedAsAnswers: false, freshCombinedJudgeRequired: true,
    semanticAcceptance: false, runtimeAccepted: false, toolTrace: [], toolReadRefs: [], trainingTruth: false });
}

export async function completeFactionReasonerAnswersV1({ input, request, prepared, evidence, role, onProgress = () => {} }) {
  const materialization = prepareFactionReasonerAnswerCompletionV1({ input, request, prepared, evidence }), parts = [];
  for (let batchIndex = 0; batchIndex < materialization.plan.batches.length; batchIndex++) {
    const child = factionReasonerCompletionRequestV1({ request, materialization, batchIndex, priorParts: parts });
    const part = await role(child);
    validateFactionReasonerCompletionPartV1({ input, materialization, batchIndex, output: part.output });
    parts.push(part);
    onProgress({ stage: 'reasoner_missing_answers_completed', batch: batchIndex + 1,
      batches: materialization.plan.batches.length, completedIndices: materialization.plan.batches[batchIndex] });
  }
  return assembleFactionReasonerAnswerCompletionV1({ input, request, prepared, materialization, parts });
}
