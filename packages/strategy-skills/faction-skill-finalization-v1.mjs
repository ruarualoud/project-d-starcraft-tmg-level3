import { fail, hash, seal, verifySeal } from '../skill-production/common.mjs';
import { createFactionWritingPlanV1, validateFactionDraftV1 } from '../skill-production-v3/faction-strategy-workflow-v1.mjs';
import { bindFactionGeneralDependencyV1 } from './faction-general-dependency-v1.mjs';
import { validateFactionDraftEnvelopeBindingV2 } from '../skill-production-v3/faction-draft-envelope-v2.mjs';

// The caller authenticates the actual production and consumer journals.
// This projection retains every recommendation; it does not manufacture a
// new policy, collapse source chapters or turn bounded drills into win rates.
export function finalizeFactionSkillV1({ input, candidate, productionEvidence,
  rosterEvaluation, ruleEvaluation, consumerEvidence, generalSkill, generalLayer, draftEnvelopeBinding = null }) {
  [input, candidate, productionEvidence, rosterEvaluation, ruleEvaluation,
    consumerEvidence, generalSkill, generalLayer].forEach(verifySeal);
  const general = bindFactionGeneralDependencyV1({ input, generalSkill, generalLayer });
  const plan = createFactionWritingPlanV1(input);
  if (candidate.schema !== 'starcraft_faction_strategy_candidate_v1'
    || candidate.inputHash !== input.hash || candidate.planHash !== plan.hash
    || candidate.factionRecordKey !== input.factionRecordKey
    || hash(candidate.sourceBinding) !== hash(input.sourceBinding)
    || candidate.runtimeAccepted !== false || candidate.trainingTruth !== false
    || candidate.sections.length !== plan.sections.length || !candidate.semanticReviewPassed
    || candidate.sections.some((row, i) => !row.semanticReviewPassed
      || hash(row.section) !== hash(plan.sections[i])
      || row.rounds.at(-1)?.issues.openIssues !== 0)) fail('FACTION_FINAL_CHAPTERS_INCOMPLETE');
  // The caller supplies the authenticated producing recipe's binding. Never
  // silently widen an old candidate or infer a policy from its prose alone.
  if (draftEnvelopeBinding) validateFactionDraftEnvelopeBindingV2(draftEnvelopeBinding);
  if ((candidate.draftEnvelopeBindingHash || null) !== (draftEnvelopeBinding?.hash || null))
    fail('FACTION_FINAL_DRAFT_ENVELOPE_BINDING_DRIFT');
  candidate.sections.forEach(row => validateFactionDraftV1(row.draft, input, { draftEnvelopeBinding }));
  if (productionEvidence.candidateHash !== candidate.hash
    || productionEvidence.inputHash !== input.hash
    || !(productionEvidence.sourceReviewWorkflowRebuilt
      || productionEvidence.semanticProductionReleaseVerified
      || productionEvidence.deterministicSourceAndKernelRevisionVerified)
    || productionEvidence.newProviderCalls !== 0) fail('FACTION_FINAL_PRODUCTION_EVIDENCE_REQUIRED');
  if (rosterEvaluation.candidateHash !== candidate.hash
    || ruleEvaluation.candidateHash !== candidate.hash
    || !rosterEvaluation.boundedRosterChoicePassed
    || !ruleEvaluation.boundedRuleApplicationPassed
    || rosterEvaluation.expectedAnswersExposed !== false
    || ruleEvaluation.expectedAnswersExposed !== false
    || rosterEvaluation.finalGeneralDependencyHash !== general.hash
    || ruleEvaluation.finalGeneralDependencyHash !== general.hash
    || ruleEvaluation.repetitions !== 3) fail('FACTION_FINAL_CONSUMER_EVIDENCE_REQUIRED');
  if (consumerEvidence.candidateHash !== candidate.hash
    || consumerEvidence.productionEvidenceHash !== productionEvidence.hash
    || consumerEvidence.rosterEvaluationHash !== rosterEvaluation.hash
    || consumerEvidence.ruleApplicationEvaluationHash !== ruleEvaluation.hash
    || consumerEvidence.finalGeneralDependencyHash !== general.hash
    || !consumerEvidence.completeConsumerRequestsReconstructed
    || !consumerEvidence.baselineAndNegativeScoresPreserved
    || consumerEvidence.newProviderCalls !== 0) fail('FACTION_FINAL_CONSUMER_REPLAY_REQUIRED');
  if (generalSkill.skillId !== 'starcraft-tmg.general-rules-and-strategy'
    || generalSkill.strategyLayerHash !== generalLayer.hash
    || generalLayer.contract.referenceHash !== input.overallDependencyHash
    || hash(generalSkill.sourceBinding) !== hash(input.sourceBinding)
    || !generalLayer.assessment.sourceReviewPassed
    || !generalLayer.assessment.decisionCasesPassed) fail('FACTION_FINAL_GENERAL_DEPENDENCY_REQUIRED');
  const knowledge = candidate.sections.map(row => ({ section: row.section, draft: row.draft }));
  return seal({ schema: 'project_d_game_skill_v1', gameId: 'starcraft-tmg',
    rulesVersion: input.sourceBinding.rules, sourceBinding: input.sourceBinding,
    skillId: 'starcraft-tmg.faction.' + input.factionRecordKey.split(':')[1],
    ...(draftEnvelopeBinding ? { draftEnvelopeBinding } : {}),
    factionRecordKey: input.factionRecordKey, version: '1.0.0-offline-bounded-evaluation',
    skillType: 'strategy', dependencies: { generalSkillHash: generalSkill.hash,
      generalLayerHash: generalLayer.hash, rulesReferenceHash: input.overallDependencyHash },
    knowledge, sourceRefs: [...new Set(knowledge.flatMap(row => row.draft.recommendations.flatMap(r => r.sourceRefs)))],
    preconditions: ['Load the exact general Skill dependency and current player-visible board.',
      'Check roster eligibility, selected upgrades, current phase and available resources.'],
    procedure: ['Read the complete relevant conditional recommendations in knowledge.',
      'Compare enabled LegalSpace candidates using the general Skill and faction alternatives.',
      'Use Preview, the room confirmation policy, Apply and Replay; reconsider when reviseIf holds.'],
    judgeTests: { productionEvidenceHash: productionEvidence.hash,
      consumerEvidenceHash: consumerEvidence.hash, finalGeneralDependencyHash: general.hash,
      rosterEvaluationHash: rosterEvaluation.hash, ruleEvaluationHash: ruleEvaluation.hash,
      rosterScores: rosterEvaluation.results.map(r => ({ arm: r.arm, correct: r.correct, total: r.total })),
      ruleScores: ruleEvaluation.summary, independentlyHeldOutRuleCases: ruleEvaluation.independentlyHeldOutCases },
    confidence: 'source_review_and_bounded_roster_rule_application_only',
    trustTier: 'offline_evaluated_advisory', status: 'offline_candidate',
    humanReviewed: false, canAffectRules: false, canAffectStrategy: true,
    fullGameStrategyEffectivenessProven: false, runtimeAccepted: false,
    published: false, trainingTruth: false });
}

export function renderFinalFactionSkillV1(skill) {
  verifySeal(skill);
  return ['# ' + skill.factionRecordKey + ' — 种族策略 Skill', '',
    '离线来源审查与有限编军／规则使用测试通过；整局对战效果尚未证明。', '',
    '总规则依赖：' + skill.dependencies.generalSkillHash, '',
    ...skill.knowledge.flatMap(row => ['## ' + row.section.axis, '',
      ...row.draft.recommendations.flatMap(r => ['### ' + r.title, '',
        '适用：' + r.when.join('；'), '',
        ...r.procedure.map((step, i) => `${i + 1}. ${step}`), '',
        '替代：' + r.alternatives.join('；'), '', '风险：' + r.risk, '',
        '改计划：' + r.reviseIf.join('；'), '', '来源：' + r.sourceRefs.join('；'), '',
        '待验证：' + r.unproven.join('；'), ''])])].join('\n');
}
