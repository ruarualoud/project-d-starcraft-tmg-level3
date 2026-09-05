import { seal, verifySeal, hash, fail } from '../skill-production/common.mjs';
import { createGlobalProductionContext } from './context.mjs';

// The host must re-run the overall dependency's actual evidence qualifier
// before scheduling paid work. This compiler cannot authenticate a registry or
// promote Skills: it binds and preserves the complete offline input contract.
export function compileFactionProductionInputV1({ catalogue, factionEvidence, overallDependency, qualificationReceipt }) {
  [catalogue, factionEvidence, overallDependency, qualificationReceipt].forEach(verifySeal);
  const context = createGlobalProductionContext(catalogue);
  if (overallDependency.schema !== 'starcraft_overall_rules_production_dependency_v1'
    || qualificationReceipt.schema !== 'starcraft_overall_dependency_qualification_receipt_v1'
    || qualificationReceipt.dependencyHash !== overallDependency.hash
    || qualificationReceipt.guideEvidenceHash !== overallDependency.actualEvidenceHash
    || qualificationReceipt.runId !== overallDependency.actualEvidenceRunId
    || !qualificationReceipt.offlineGenerationQualified || !overallDependency.qualifiedForDependentGeneration
    || overallDependency.status !== 'qualified_for_offline_dependent_generation') fail('FACTION_INPUT_OVERALL_NOT_QUALIFIED');
  if (factionEvidence.schema !== 'starcraft_faction_production_evidence_v1'
    || factionEvidence.catalogueHash !== catalogue.hash || overallDependency.catalogueHash !== catalogue.hash
    || factionEvidence.globalContextHash !== context.hash
    || hash(factionEvidence.sourceBinding) !== hash(catalogue.sourceBinding)
    || hash(overallDependency.sourceBinding) !== hash(catalogue.sourceBinding)) fail('FACTION_INPUT_FROZEN_SOURCE_DRIFT');
  if (overallDependency.runtimeAccepted || overallDependency.published || overallDependency.trainingTruth
    || factionEvidence.runtimeAccepted || factionEvidence.trainingTruth || qualificationReceipt.runtimeAccepted
    || qualificationReceipt.trainingTruth) fail('FACTION_INPUT_AUTHORITY_INVALID');
  const selected = ['tactical_cards:terran_armed_forces', 'tactical_cards:zerg_swarm'];
  if (!selected.includes(factionEvidence.factionRecordKey)) fail('FACTION_INPUT_NOT_FIRST_FIVE');
  const result = seal({ schema: 'starcraft_faction_production_input_v1', gameId: 'starcraft-tmg',
    factionRecordKey: factionEvidence.factionRecordKey, catalogueHash: catalogue.hash, sourceBinding: catalogue.sourceBinding,
    qualificationReceiptHash: qualificationReceipt.hash, overallDependencyHash: overallDependency.hash,
    frozenSources: context, overallSkill: overallDependency.completeSkill, operationalGuide: overallDependency.operationalGuide,
    factionEvidence, taskBoundary: {
      writeScope: 'one_conditional_faction_strategy_skill_not_one_skill_per_card_or_rule_atom',
      fullSourcesAndOverallSkillRetained: true, factionEvidenceIsNotRosterLegality: true,
      everyRecommendationNeedsSourceConditionsAlternativesRiskAndReviseIf: true,
      unsupportedClaimDisposition: 'probe_needed_or_quarantine_never_invented_rule',
      independentEvaluationInputsIncluded: false, independentEvaluationAnswersIncluded: false,
      plannedRoles: ['teach', 'ctx2skill_question_tree', 'challenger', 'reasoner', 'judge', 'proposer', 'generator'],
      actualSourceReviewAndRuleScenarioEvaluationRequired: true,
    }, paidWorkAuthorizedByThisArtifact: false, skillsGenerated: 0, runtimeAccepted: false, trainingTruth: false });
  if (Buffer.byteLength(JSON.stringify(result)) > 1_000_000) fail('FACTION_INPUT_COMPLETE_CONTEXT_TOO_LARGE');
  return result;
}
