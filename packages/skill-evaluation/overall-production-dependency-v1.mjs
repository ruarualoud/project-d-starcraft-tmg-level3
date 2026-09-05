import { seal, verifySeal, hash, fail } from '../skill-production/common.mjs';
import { readCompleteOverallRulesContextV3 } from './overall-rules-package-v3.mjs';

// Qualification for further OFFLINE generation is not runtime acceptance.
// The host must obtain deliveryEvidence by actual read-only request replay,
// never from a model-authored or user-uploaded "passed" field.
export function qualifyOverallProductionDependencyV1({ candidate, evaluation, deliveryEvidence }) {
  [candidate, evaluation, deliveryEvidence].forEach(verifySeal);
  const skill = readCompleteOverallRulesContextV3(candidate);
  if (evaluation.schema !== 'starcraft_guided_rules_evaluation_v1'
    || deliveryEvidence.schema !== 'starcraft_guide_local_repair_actual_evidence_v1'
    || evaluation.candidateHash !== candidate.hash || evaluation.guide.baseCandidateHash !== candidate.hash
    || deliveryEvidence.candidateHash !== candidate.hash || deliveryEvidence.evaluationHash !== evaluation.hash
    || deliveryEvidence.repairedTeacherHash !== evaluation.teacherArtifactHash) fail('OVERALL_DEPENDENCY_EVIDENCE_DRIFT');
  if (!deliveryEvidence.exactActualRequestsReconstructed || !deliveryEvidence.rawAnswerScoresRecomputed
    || deliveryEvidence.newProviderCalls !== 0 || !deliveryEvidence.qualityPassed || !evaluation.passed
    || evaluation.sourceControl.total !== 22 || evaluation.sourceControl.correct !== 22
    || evaluation.sourceReviewHashes.length !== 2) fail('OVERALL_DEPENDENCY_QUALITY_NOT_PASSED');
  const expected = [['development_fresh_original', 69], ['development_legacy', 36], ['independent_inputs', 30]];
  if (evaluation.summary.length !== expected.length || hash(deliveryEvidence.summary) !== hash(evaluation.summary)
    || expected.some(([kind, total]) => {
      const row = evaluation.summary.find(r => r.kind === kind);
      const scores = evaluation.results.filter(r => r.kind === kind).flatMap(r => r.predictions);
      return row?.total !== total || row.correct !== total || scores.length !== total || scores.some(p => !p.passed);
    }) || !evaluation.baseSkillAndAllClaimsUnchanged || evaluation.expectedAnswersExposedInThisEvaluation
    || !evaluation.oldDevelopmentScoreNotUnseenHeldout) fail('OVERALL_DEPENDENCY_DENOMINATOR_INVALID');
  if (candidate.runtimeAccepted || evaluation.runtimeAccepted || deliveryEvidence.runtimeAccepted
    || candidate.trainingTruth || evaluation.trainingTruth || deliveryEvidence.trainingTruth) fail('OVERALL_DEPENDENCY_AUTHORITY_INVALID');
  return seal({ schema: 'starcraft_overall_rules_production_dependency_v1', gameId: 'starcraft-tmg',
    skillId: candidate.skillId, sourceBinding: candidate.sourceBinding, catalogueHash: candidate.catalogueHash,
    baseCandidateHash: candidate.hash, guideHash: evaluation.guide.hash, evaluationHash: evaluation.hash,
    actualEvidenceHash: deliveryEvidence.hash, actualEvidenceRunId: deliveryEvidence.runId,
    completeSkill: skill, operationalGuide: evaluation.guide,
    status: 'qualified_for_offline_dependent_generation', sourceControls: { correct: 22, total: 22 },
    measuredRuleApplication: evaluation.summary, independentSuiteRepeated: true,
    scope: 'representative_source_and_rules_application_not_complete_game_or_strategy_proof',
    usage: 'Full source-bound overall Skill plus operational guide for faction/matchup production. Rules remain authoritative. Do not treat this offline dependency as a runtime-published Skill.',
    requiredNextGates: ['faction_and_directed_matchup_quality', 'actual_room_loading_and_legal_action_replay',
      'strategy_evaluation', 'reflection_versioned_regression_and_rollback', 'authenticated_registry_publication'],
    qualifiedForDependentGeneration: true, formalAcceptance: false, runtimeAccepted: false, published: false,
    humanReviewed: false, canAffectRules: false, canAffectStrategy: false, trainingTruth: false });
}
