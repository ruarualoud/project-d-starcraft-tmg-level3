import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { openFactionConsumerExecutionReplayV1 } from './faction-consumer-execution-v1.mjs';
import { evaluateFactionRosterUseV1 } from './faction-roster-use-evaluation-v1.mjs';
import { evaluateFactionRuleUseV1 } from './faction-rule-use-evaluation-v1.mjs';
import { seal, verifySeal, hash, sha256, fail } from '../skill-production/common.mjs';

// V2 authenticates the first consumer-guided revision run without changing
// the frozen V1 inspector used by earlier production recipes.
export async function inspectFactionConsumerReplayV2({ root, filename, runId, recipe, report, input, candidate,
  productionEvidence, knownRulePolicy, drills, applicationDrills, evaluation, applicationEvaluation,
  finalGeneral = null }) {
  [recipe, report, input, candidate, productionEvidence, knownRulePolicy,
    drills.manifest, applicationDrills.manifest, evaluation, applicationEvaluation].forEach(verifySeal);
  if (recipe.version !== 'faction_consumer_evaluation_run_v3'
    || runId !== 'faction-consumer-' + recipe.hash.slice(0, 20)
    || report.runId !== runId || report.recipeHash !== recipe.hash
    || recipe.inputHash !== input.hash || recipe.candidateHash !== candidate.hash
    || recipe.catalogueHash !== input.catalogueHash || recipe.contextHash !== input.frozenSources.hash
    || recipe.knownRulePolicyHash !== knownRulePolicy.hash
    || recipe.productionEvidenceHash !== productionEvidence.hash
    || report.productionEvidenceHash !== productionEvidence.hash
    || productionEvidence.version !== 'faction_consumer_guided_revision_evidence_v1'
    || productionEvidence.candidateHash !== candidate.hash || productionEvidence.inputHash !== input.hash
    || productionEvidence.parentCandidateHash !== recipe.parentCandidateHash
    || productionEvidence.parentProductionEvidenceHash !== recipe.parentProductionEvidenceHash
    || productionEvidence.revisionSpecHash !== recipe.revisionSpecHash
    || recipe.revisionEvidenceHash !== productionEvidence.hash
    || !productionEvidence.sourceReviewWorkflowRebuilt
    || !productionEvidence.deterministicSourceAndKernelRevisionVerified
    || productionEvidence.freshIndependentConsumerEvaluationPerformed !== false
    || recipe.drillManifestHash !== drills.manifest.hash
    || recipe.applicationDrillManifestHash !== applicationDrills.manifest.hash
    || recipe.applicationRepetitionsPerArm !== 3
    || recipe.fullSourcesExposedToConsumer !== false
    || recipe.productionDialogueExposedToConsumer !== false
    || recipe.expectedAnswersExposed !== false || recipe.sourceRefreshPerformed !== false
    || recipe.trainingTruth !== false || report.resultHash !== evaluation.hash
    || report.applicationResultHash !== applicationEvaluation.hash
    || report.failure?.code !== 'FACTION_RULE_CONSUMER_BOUNDED_EVALUATION_FAILED')
    fail('FACTION_CONSUMER_V2_EVIDENCE_BINDING_DRIFT');
  if ((recipe.finalGeneralDependencyHash || null) !== (finalGeneral?.hash || null))
    fail('FACTION_CONSUMER_V2_GENERAL_DRIFT');
  if (root) for (const row of recipe.codeHashes) {
    if (sha256(await readFile(path.join(root, row.file))) !== row.hash)
      fail('FACTION_CONSUMER_V2_CODE_DRIFT', { file: row.file });
  }
  const replay = openFactionConsumerExecutionReplayV1({ filename, runId, recipe });
  let roster, application, delivery;
  try {
    roster = await evaluateFactionRosterUseV1({ input, candidate, knownRulePolicy, drills, finalGeneral, ...replay });
    application = await evaluateFactionRuleUseV1({ input, candidate, knownRulePolicy,
      drills: applicationDrills, finalGeneral, ...replay });
    if (roster.hash !== evaluation.hash || application.hash !== applicationEvaluation.hash
      || roster.boundedRosterChoicePassed !== report.boundedRosterChoicePassed
      || application.boundedRuleApplicationPassed !== report.boundedRuleApplicationPassed
      || hash(application.summary) !== hash(report.ruleApplicationSummary)
      || hash(roster.results.map(row => ({ arm: row.arm, correct: row.correct, total: row.total }))) !== hash(report.results)
      || !roster.boundedRosterChoicePassed || application.boundedRuleApplicationPassed
      || report.actualRoomReplayPerformed !== false || report.formalSkillsAccepted !== 0
      || report.strategyStrengthProven !== false || report.trainingTruth !== false)
      fail('FACTION_CONSUMER_V2_EVIDENCE_SCORE_DRIFT');
    delivery = replay.evidence();
    if (delivery.matchedStepIds.length !== 8 || roster.results.length !== 2 || application.results.length !== 6)
      fail('FACTION_CONSUMER_V2_EVIDENCE_DENOMINATOR');
  } finally { replay.close(); }
  return seal({ version: 'faction_consumer_actual_delivery_evidence_v2', runId,
    recipeHash: recipe.hash, sourceRunId: recipe.sourceRunId,
    candidateHash: candidate.hash, productionEvidenceHash: productionEvidence.hash,
    rosterEvaluationHash: roster.hash, ruleApplicationEvaluationHash: application.hash,
    finalGeneralDependencyHash: finalGeneral?.hash || null, delivery,
    completeConsumerRequestsReconstructed: true,
    rawAnswersRescored: roster.results.reduce((n, row) => n + row.total, 0)
      + application.results.reduce((n, row) => n + row.total, 0),
    boundedRosterChoicePassed: true, boundedRuleApplicationPassed: false,
    baselineAndNegativeScoresPreserved: true, expectedAnswersExposed: false,
    actualRoomReplayPerformed: false, strategyStrengthProven: false,
    runtimeAccepted: false, newProviderCalls: 0, trainingTruth: false });
}
