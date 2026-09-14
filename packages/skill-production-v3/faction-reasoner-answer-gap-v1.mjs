import { seal, verifySeal, hash, fail } from '../skill-production/common.mjs';
import { FACTION_NATIVE_PRODUCTION_CONTRACTS_V1 as contracts } from '../../content/skill-generation/ticket-18-faction-native-production-contracts-v1.mjs';
import { validateStarcraftTmgProviderJsonSchemaValueV1 as validate } from '../structured-generation/output-contract-registry-v1.mjs';

// A semantic completion plan, NOT a lossless rename/normalization. A question
// copied from the input is still unanswered, even if renamed to "answer".
export function planFactionReasonerAnswerGapsV1({ input, questions, rejectedOutput }) {
  verifySeal(input);
  const byIndex = new Map(questions.map(q => [q.index, q]));
  if (byIndex.size !== questions.length || questions.some(q => !Number.isSafeInteger(q.index) || q.index < 0)
    || !Array.isArray(rejectedOutput.answers) || rejectedOutput.answers.length !== questions.length
    || Object.keys(rejectedOutput).some(k => !['answers', 'uncertainties'].includes(k)))
    fail('FACTION_ANSWER_GAP_SCOPE_INVALID');
  const seen = new Set(), retained = [], missing = [], known = new Set(input.frozenSources.prompt.sources.map(s => s.ref));
  for (const row of rejectedOutput.answers) {
    if (!byIndex.has(row.index) || seen.has(row.index)) fail('FACTION_ANSWER_GAP_SCOPE_INVALID');
    seen.add(row.index);
    if (Object.hasOwn(row, 'answer')) {
      if (!validate(contracts.reasoner.providerSchema, { answers: [row], uncertainties: rejectedOutput.uncertainties }).ok
        || row.answer === byIndex.get(row.index).question) fail('FACTION_ANSWER_GAP_RETAINED_INVALID');
      retained.push(structuredClone(row));
    } else {
      if (Object.keys(row).length !== 3 || !Object.hasOwn(row, 'question')
        || row.question !== byIndex.get(row.index).question
        || hash(row.sourceRefs) !== hash(byIndex.get(row.index).sourceRefs))
        fail('FACTION_ANSWER_GAP_NOT_EXACT_QUESTION_COPY');
      missing.push(row.index);
    }
    if (!Array.isArray(row.sourceRefs) || !row.sourceRefs.length || row.sourceRefs.some(ref => !known.has(ref)))
      fail('FACTION_ANSWER_GAP_SOURCE_UNKNOWN');
  }
  if (!missing.length || !retained.length) fail('FACTION_ANSWER_GAP_NOT_APPLICABLE');
  return seal({ version: 'faction_reasoner_answer_gap_plan_v1', inputHash: input.hash,
    originalOutputHash: hash(rejectedOutput), originalQuestionsHash: hash(questions),
    retainedAnswers: retained, retainedUncertainties: structuredClone(rejectedOutput.uncertainties),
    unansweredIndices: missing, batches: missing.flatMap((_, n) => n % 2 ? [] : [missing.slice(n, n + 2)]),
    fullOriginalSourcesAndWorkspaceRequired: true, allPriorAnswersRequired: true,
    questionsMustNotBeRelabelledAsAnswers: true, freshCombinedJudgeRequired: true,
    retainedAnswersSemanticallyAccepted: false, productionApplied: false, providerCalls: 0, trainingTruth: false });
}
