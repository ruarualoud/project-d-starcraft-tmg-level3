import { openFactionConsumerExecutionReplayV1 } from './faction-consumer-execution-v1.mjs';
import { evaluateFactionRosterUseV1 } from './faction-roster-use-evaluation-v1.mjs';
import { evaluateFactionRuleUseV1 } from './faction-rule-use-evaluation-v1.mjs';
import { evaluateFactionRuleUseGroupedV2 } from './faction-rule-use-evaluation-v2.mjs';
import { seal, verifySeal, hash, fail } from '../skill-production/common.mjs';

// Rebuild the real direct-consumer requests and re-score retained answers.
// Positive, negative and baseline results all have to reproduce exactly.
// The caller separately reconstructs the candidate's production evidence.
export async function inspectFactionConsumerReplayV1({ filename, runId, recipe, report, input, candidate,
  productionEvidence, knownRulePolicy, drills, applicationDrills, evaluation, applicationEvaluation, finalGeneral = null }) {
  [recipe, report, input, candidate, productionEvidence, knownRulePolicy,
    drills.manifest, applicationDrills.manifest, evaluation, applicationEvaluation].forEach(verifySeal);
  const grouped = ['faction_consumer_evaluation_run_v4', 'faction_consumer_evaluation_run_v5'].includes(recipe.version);
  const sourceEvidence = productionEvidence.sourceReviewWorkflowRebuilt
    || productionEvidence.semanticProductionReleaseVerified;
  const guidedRevisionEvidence = productionEvidence.deterministicSourceAndKernelRevisionVerified
    && productionEvidence.parentProductionEvidenceHash
    && productionEvidence.parentConsumerEvidenceHash;
  if (!['faction_consumer_evaluation_run_v2', 'faction_consumer_evaluation_run_v4',
    'faction_consumer_evaluation_run_v5'].includes(recipe.version)
    || runId !== 'faction-consumer-' + recipe.hash.slice(0, 20) || report.runId !== runId || report.recipeHash !== recipe.hash
    || recipe.inputHash !== input.hash || recipe.candidateHash !== candidate.hash
    || recipe.catalogueHash !== input.catalogueHash || recipe.contextHash !== input.frozenSources.hash
    || recipe.knownRulePolicyHash !== knownRulePolicy.hash
    || recipe.productionEvidenceHash !== productionEvidence.hash || report.productionEvidenceHash !== productionEvidence.hash
    || productionEvidence.runId !== recipe.sourceRunId || productionEvidence.candidateHash !== candidate.hash
    || productionEvidence.inputHash !== input.hash
    || !(sourceEvidence || guidedRevisionEvidence)
    || recipe.drillManifestHash !== drills.manifest.hash || recipe.applicationDrillManifestHash !== applicationDrills.manifest.hash
    || recipe.applicationRepetitionsPerArm !== 3 || recipe.fullSourcesExposedToConsumer !== false
    || grouped && (recipe.applicationGrouping !== 'one_rule_family_per_request' || recipe.plannedCalls !== 20)
    || recipe.version === 'faction_consumer_evaluation_run_v5'
      && (recipe.parentCandidateHash !== productionEvidence.parentCandidateHash
        || recipe.parentProductionEvidenceHash !== productionEvidence.parentProductionEvidenceHash
        || recipe.parentConsumerEvidenceHash !== productionEvidence.parentConsumerEvidenceHash
        || recipe.revisionSpecHash !== productionEvidence.revisionSpecHash)
    || recipe.productionDialogueExposedToConsumer !== false || recipe.expectedAnswersExposed !== false
    || recipe.sourceRefreshPerformed !== false || recipe.trainingTruth !== false
    || report.resultHash !== evaluation.hash || report.applicationResultHash !== applicationEvaluation.hash
    || report.failure && !['FACTION_CONSUMER_BOUNDED_EVALUATION_FAILED', 'FACTION_RULE_CONSUMER_BOUNDED_EVALUATION_FAILED'].includes(report.failure.code))
    fail('FACTION_CONSUMER_EVIDENCE_BINDING_DRIFT');
  if ((recipe.finalGeneralDependencyHash || null) !== (finalGeneral?.hash || null))
    fail('FACTION_CONSUMER_EVIDENCE_GENERAL_DRIFT');
  const replay = openFactionConsumerExecutionReplayV1({ filename, runId, recipe });
  let roster, application, delivery;
  try {
    roster = await evaluateFactionRosterUseV1({ input, candidate, knownRulePolicy, drills, finalGeneral, ...replay });
    application = await (grouped ? evaluateFactionRuleUseGroupedV2 : evaluateFactionRuleUseV1)({
      input, candidate, knownRulePolicy, drills: applicationDrills, finalGeneral, ...replay });
    if (roster.hash !== evaluation.hash || application.hash !== applicationEvaluation.hash
      || roster.boundedRosterChoicePassed !== report.boundedRosterChoicePassed
      || application.boundedRuleApplicationPassed !== report.boundedRuleApplicationPassed
      || hash(application.summary) !== hash(report.ruleApplicationSummary)
      || hash(roster.results.map(r => ({ arm: r.arm, correct: r.correct, total: r.total }))) !== hash(report.results)
      || (report.independentlyHeldOutApplicationCases ?? 0) !== 0 || report.actualRoomReplayPerformed !== false
      || report.formalSkillsAccepted !== 0 || report.strategyStrengthProven !== false || report.trainingTruth !== false)
      fail('FACTION_CONSUMER_EVIDENCE_SCORE_DRIFT');
    const expectedFailure = !roster.boundedRosterChoicePassed ? 'FACTION_CONSUMER_BOUNDED_EVALUATION_FAILED'
      : !application.boundedRuleApplicationPassed ? 'FACTION_RULE_CONSUMER_BOUNDED_EVALUATION_FAILED' : null;
    if ((report.failure?.code || null) !== expectedFailure) fail('FACTION_CONSUMER_EVIDENCE_FAILURE_DRIFT');
    delivery = replay.evidence();
    const expectedSteps = grouped ? 20 : 8;
    if (delivery.matchedStepIds.length !== expectedSteps || delivery.receiptHashes.length < expectedSteps
      || delivery.receiptHashes.length > expectedSteps * 2
      || roster.results.length !== 2 || application.results.length !== (grouped ? 18 : 6))
      fail('FACTION_CONSUMER_EVIDENCE_DENOMINATOR');
  } finally { replay.close(); }
  return seal({ version: 'faction_consumer_actual_delivery_evidence_v1', runId, recipeHash: recipe.hash,
    ...(finalGeneral ? { finalGeneralDependencyHash: finalGeneral.hash } : {}),
    sourceRunId: recipe.sourceRunId, candidateHash: candidate.hash, productionEvidenceHash: productionEvidence.hash,
    rosterEvaluationHash: roster.hash, ruleApplicationEvaluationHash: application.hash, delivery,
    completeConsumerRequestsReconstructed: true, rawAnswersRescored: roster.results.reduce((n, r) => n + r.total, 0)
      + application.results.reduce((n, r) => n + r.total, 0),
    rosterResults: report.results, ruleApplicationSummary: application.summary,
    boundedRosterChoicePassed: roster.boundedRosterChoicePassed, boundedRuleApplicationPassed: application.boundedRuleApplicationPassed,
    baselineAndNegativeScoresPreserved: true, expectedAnswersExposed: false,
    independentlyHeldOutApplicationCases: 0,
    ...(grouped ? { applicationGrouping: recipe.applicationGrouping,
      groupedRuleCalls: application.calls } : {}),
    actualRoomReplayPerformed: false,
    strategyStrengthProven: false, runtimeAccepted: false, newProviderCalls: 0, trainingTruth: false });
}
