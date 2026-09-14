import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { openFactionConsumerExecutionReplayV1 } from './faction-consumer-execution-v1.mjs';
import { evaluateFactionRosterUseV1 } from './faction-roster-use-evaluation-v1.mjs';
import { evaluateFactionRuleUseGroupedV2 } from './faction-rule-use-evaluation-v2.mjs';
import { seal, verifySeal, hash, sha256, fail } from '../skill-production/common.mjs';

export async function inspectFactionGroupedConsumerReplayV1({ root, filename, runId, recipe, report,
  input, candidate, productionEvidence, knownRulePolicy, drills, applicationDrills,
  evaluation, applicationEvaluation, finalGeneral }) {
  [recipe, report, input, candidate, productionEvidence, knownRulePolicy, drills.manifest,
    applicationDrills.manifest, evaluation, applicationEvaluation, finalGeneral].forEach(verifySeal);
  if (recipe.version !== 'faction_consumer_grouped_revision_run_v1'
    || runId !== 'faction-consumer-v2-' + recipe.hash.slice(0, 20)
    || report.runId !== runId || report.recipeHash !== recipe.hash
    || recipe.inputHash !== input.hash || recipe.candidateHash !== candidate.hash
    || report.candidateHash !== candidate.hash || recipe.productionEvidenceHash !== productionEvidence.hash
    || report.productionEvidenceHash !== productionEvidence.hash
    || productionEvidence.version !== 'faction_consumer_guided_revision_evidence_v2'
    || productionEvidence.candidateHash !== candidate.hash
    || productionEvidence.parentCandidateHash !== recipe.parentCandidateHash
    || productionEvidence.parentProductionEvidenceHash !== recipe.parentProductionEvidenceHash
    || productionEvidence.parentConsumerEvidenceHash !== recipe.parentConsumerEvidenceHash
    || productionEvidence.revisionSpecHash !== recipe.revisionSpecHash
    || recipe.knownRulePolicyHash !== knownRulePolicy.hash
    || recipe.catalogueHash !== input.catalogueHash
    || recipe.finalGeneralDependencyHash !== finalGeneral.hash
    || recipe.drillManifestHash !== drills.manifest.hash
    || recipe.applicationDrillManifestHash !== applicationDrills.manifest.hash
    || recipe.applicationRepetitionsPerArm !== 3
    || recipe.applicationGrouping !== 'one_rule_family_per_request'
    || recipe.plannedCalls !== 20 || recipe.expectedAnswersExposed !== false
    || recipe.priorAnswersExposedToConsumer !== false
    || recipe.productionDialogueExposedToConsumer !== false
    || recipe.fullSourcesExposedToConsumer !== false || recipe.sourceRefreshPerformed !== false
    || report.resultHash !== evaluation.hash || report.applicationResultHash !== applicationEvaluation.hash
    || report.failure !== null || !report.boundedRosterChoicePassed
    || !report.boundedRuleApplicationPassed || report.groupedRuleCalls !== 18
    || report.actualRoomReplayPerformed !== false || report.formalSkillsAccepted !== 0
    || report.strategyStrengthProven !== false || report.runtimeAccepted !== false
    || report.trainingTruth !== false)
    fail('FACTION_GROUPED_CONSUMER_EVIDENCE_BINDING_DRIFT');
  for (const row of recipe.codeHashes) if (sha256(await readFile(path.join(root, row.file))) !== row.hash)
    fail('FACTION_GROUPED_CONSUMER_EVIDENCE_CODE_DRIFT', { file: row.file });
  const replay = openFactionConsumerExecutionReplayV1({ filename, runId, recipe });
  let roster, rules, delivery;
  try {
    roster = await evaluateFactionRosterUseV1({ input, candidate, knownRulePolicy, drills, finalGeneral, ...replay });
    rules = await evaluateFactionRuleUseGroupedV2({ input, candidate, knownRulePolicy,
      drills: applicationDrills, finalGeneral, ...replay });
    if (roster.hash !== evaluation.hash || rules.hash !== applicationEvaluation.hash
      || !roster.boundedRosterChoicePassed || !rules.boundedRuleApplicationPassed
      || hash(roster.results.map(row => ({ arm: row.arm, correct: row.correct, total: row.total }))) !== hash(report.rosterResults)
      || hash(rules.summary) !== hash(report.ruleApplicationSummary)
      || rules.calls !== 18)
      fail('FACTION_GROUPED_CONSUMER_EVIDENCE_SCORE_DRIFT');
    delivery = replay.evidence();
    if (delivery.matchedStepIds.length !== 20 || delivery.receiptHashes.length < 20
      || delivery.receiptHashes.length > 40 || roster.results.length !== 2 || rules.results.length !== 18)
      fail('FACTION_GROUPED_CONSUMER_EVIDENCE_DENOMINATOR');
  } finally { replay.close(); }
  return seal({ version: 'faction_grouped_consumer_actual_delivery_evidence_v1', runId,
    recipeHash: recipe.hash, parentConsumerRunId: recipe.parentConsumerRunId,
    candidateHash: candidate.hash, productionEvidenceHash: productionEvidence.hash,
    rosterEvaluationHash: roster.hash, ruleApplicationEvaluationHash: rules.hash,
    finalGeneralDependencyHash: finalGeneral.hash, delivery,
    completeConsumerRequestsReconstructed: true,
    rawAnswersRescored: roster.results.reduce((n, row) => n + row.total, 0)
      + rules.results.reduce((n, row) => n + row.total, 0),
    groupedRuleCalls: 18, boundedRosterChoicePassed: true,
    boundedRuleApplicationPassed: true, baselineAndNegativeScoresPreserved: true,
    expectedAnswersExposed: false, actualRoomReplayPerformed: false,
    strategyStrengthProven: false, runtimeAccepted: false,
    newProviderCalls: 0, trainingTruth: false });
}
