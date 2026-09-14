import { seal, verifySeal, hash, fail } from '../skill-production/common.mjs';
import { factionConsumerContextV1 } from '../skill-evaluation/faction-roster-use-evaluation-v1.mjs';
import { validateFactionDraftV1 } from './faction-strategy-workflow-v1.mjs';
import { validateFactionDraftEnvelopeBindingV2 } from './faction-draft-envelope-v2.mjs';

const ROSTER_CASE = 'faction-roster-choice.terran_gap_three';
const REACTION_CASE = 'faction-rule-application.reaction.inside_activation.0.1';
const ARMY_SECTION = 'faction.terran_armed_forces.army_resources.1';
const UNIT_SECTION = 'faction.terran_armed_forces.unit_roles.1';

const OLD_ROSTER_TEXT = '若军队不含Jim Raynor而仅需Goliath：跳过Supply Depot，直接购买Factory（35瓦斯，+2 Elite）即可满足Goliath的2 Elite需求，节省40瓦斯';
const NEW_ROSTER_TEXT = '若军队不含Jim Raynor且编入两台Goliath：两台各占2 Elite，合计需4 Elite；Terran起始仅1 Elite，尚缺3。单张Armory后共2、单张Factory后共3，均不足；Factory+Armory后共4且65瓦斯，是所列可行方案中最低成本；两张Factory后共5且70瓦斯，也可行。若仅编入一台Goliath，单张Factory（35瓦斯，+2 Elite）即可满足。';
const OLD_REACTION_TEXT = '确认反应能力限制：每次激活每位玩家仅能结算一个反应；每具名反应能力每轮每单位限一次（Life Support每轮仅一次）；若双方对同一触发都想反应，Active Player先结算';
const NEW_REACTION_TEXT = '确认Reaction限制：每次激活每位玩家最多结算一个Reaction。REPEATABLE Reaction的触发发生在某次激活内时，以本玩家在当前激活已经结算的Reaction总数为准；当前计数为0时，该能力在本轮其他激活或该持续触发的较早激活中已经使用，不会以具名每轮一次规则另行封锁，但同一激活绝不能结算第二次。触发完全发生在激活外时，同一触发最多使用一次。非REPEATABLE的Life Support仍受具名能力每轮每单位一次限制；若双方对同一触发都想反应，Active Player先结算。';

function body(value) {
  const { hash: ignored, ...rest } = value;
  return structuredClone(rest);
}

function exactIds(values, expected, code) {
  const actual = values.slice().sort();
  const wanted = expected.slice().sort();
  if (hash(actual) !== hash(wanted)) fail(code, { actual, expected: wanted });
}

function findCase(drills, factionRecordKey, caseId, score, code) {
  verifySeal(drills.manifest);
  const cases = drills.list(factionRecordKey), proofs = drills.proof();
  const index = cases.findIndex(row => row.id === caseId);
  const proof = proofs.find(row => row.hash === score.kernelProofHash);
  if (index < 0 || !proof || proof.caseHash !== score.caseHash) fail(code);
  verifySeal(proof);
  return { question: cases[index], proof };
}

function authenticateConsumerFailures({ candidate, rosterEvaluation, ruleEvaluation, consumerEvidence,
  rosterDrills, applicationDrills }) {
  [rosterEvaluation, ruleEvaluation, consumerEvidence].forEach(verifySeal);
  if (rosterEvaluation.candidateHash !== candidate.hash || ruleEvaluation.candidateHash !== candidate.hash
    || consumerEvidence.candidateHash !== candidate.hash
    || consumerEvidence.rosterEvaluationHash !== rosterEvaluation.hash
    || consumerEvidence.ruleApplicationEvaluationHash !== ruleEvaluation.hash
    || consumerEvidence.version !== 'faction_consumer_actual_delivery_evidence_v1'
    || !consumerEvidence.completeConsumerRequestsReconstructed
    || !consumerEvidence.baselineAndNegativeScoresPreserved
    || consumerEvidence.newProviderCalls !== 0
    || rosterEvaluation.boundedRosterChoicePassed || ruleEvaluation.boundedRuleApplicationPassed
    || rosterEvaluation.expectedAnswersExposed !== false || ruleEvaluation.expectedAnswersExposed !== false
    || rosterEvaluation.drillManifestHash !== rosterDrills.manifest.hash
    || ruleEvaluation.drillManifestHash !== applicationDrills.manifest.hash)
    fail('FACTION_CONSUMER_GUIDED_REVISION_EVIDENCE_INVALID');

  const rosterArms = rosterEvaluation.results.filter(row => row.arm === 'overall_plus_faction');
  if (rosterArms.length !== 1) fail('FACTION_CONSUMER_GUIDED_REVISION_ROSTER_DENOMINATOR');
  const rosterFailures = rosterArms[0].scores.filter(row => !row.passed);
  exactIds(rosterFailures.map(row => row.id), [ROSTER_CASE], 'FACTION_CONSUMER_GUIDED_REVISION_ROSTER_SCOPE');
  for (const score of rosterFailures) {
    verifySeal(score);
    if (rosterDrills.verify(score.prediction).hash !== score.hash)
      fail('FACTION_CONSUMER_GUIDED_REVISION_ROSTER_SCORE_DRIFT');
  }

  const ruleArms = ruleEvaluation.results.filter(row => row.arm === 'overall_plus_faction');
  if (ruleArms.length !== 3 || new Set(ruleArms.map(row => row.repetition)).size !== 3)
    fail('FACTION_CONSUMER_GUIDED_REVISION_RULE_DENOMINATOR');
  const ruleFailures = ruleArms.flatMap(row => row.scores.filter(score => !score.passed));
  exactIds(ruleFailures.map(row => row.id), Array(3).fill(REACTION_CASE),
    'FACTION_CONSUMER_GUIDED_REVISION_RULE_SCOPE');
  for (const score of ruleFailures) {
    verifySeal(score);
    if (applicationDrills.verify(score.prediction).hash !== score.hash)
      fail('FACTION_CONSUMER_GUIDED_REVISION_RULE_SCORE_DRIFT');
  }
  return { rosterFailures, ruleFailures };
}

function deriveRosterProof(drills, factionRecordKey, failure) {
  const { question, proof } = findCase(drills, factionRecordKey, ROSTER_CASE, failure,
    'FACTION_CONSUMER_GUIDED_REVISION_ROSTER_PROOF_MISSING');
  // The public question deliberately omits its answer. Derive the result from
  // the authenticated kernel outcomes instead of reconstructing the private
  // case body or copying an expected answer into the revision input.
  const legal = proof.resolved.filter(row => row.outcome.eligibleWithinDeclaredChecks);
  const minimum = Math.min(...legal.map(row => row.outcome.result.vespeneSpent));
  const derived = {
    eligibleOptionIds: legal.map(row => row.optionId),
    minimumCostOptionIds: legal.filter(row => row.outcome.result.vespeneSpent === minimum).map(row => row.optionId),
    minimumVespene: minimum,
  };
  if (hash(derived) !== hash({ eligibleOptionIds: ['option-2', 'option-3'],
    minimumCostOptionIds: ['option-2'], minimumVespene: 65 })
    || proof.resolved.filter(row => ['option-0', 'option-1'].includes(row.optionId))
      .some(row => row.outcome.rejectionCode !== 'ARMY_SLOT_CAPACITY_EXCEEDED')
    || !proof.sourceHashes.some(row => row.ref === 'source:tactical_cards:armory')
    || !proof.sourceHashes.some(row => row.ref === 'source:tactical_cards:factory')
    || !proof.sourceHashes.some(row => row.ref === 'source:army_units:goliath'))
    fail('FACTION_CONSUMER_GUIDED_REVISION_ROSTER_PROOF_DRIFT');
  return { question, proof, derived };
}

function deriveReactionProof(drills, factionRecordKey, failures) {
  if (new Set(failures.map(row => row.kernelProofHash)).size !== 1)
    fail('FACTION_CONSUMER_GUIDED_REVISION_REACTION_PROOF_DRIFT');
  const { question, proof } = findCase(drills, factionRecordKey, REACTION_CASE, failures[0],
    'FACTION_CONSUMER_GUIDED_REVISION_REACTION_PROOF_MISSING');
  if (hash(question.input) !== hash({ timing: 'inside_activation', repeatable: true,
    reactionsResolvedThisActivation: 0, usesForTrigger: 1 })
    || hash(proof.independentlySpecifiedExpectation) !== hash({ legalWithinNamedLimit: true })
    || hash(proof.observed.answer) !== hash({ legalWithinNamedLimit: true })
    || proof.observed.result.entryId !== 'faq-v1:59' || proof.observed.result.legal !== true
    || !proof.oracleAgrees || proof.sourceHashes.length !== 1 || proof.sourceHashes[0].ref !== 'faq-v1:59')
    fail('FACTION_CONSUMER_GUIDED_REVISION_REACTION_PROOF_DRIFT');
  return { question, proof, derived: proof.independentlySpecifiedExpectation };
}

function appendSourceCalibratedRevision(section, { spec, operationIds, nextDraft }) {
  verifySeal(section);
  const parentDraftHash = hash(section.draft), draftHash = hash(nextDraft), priorRound = verifySeal(section.rounds.at(-1));
  const changes = spec.operations.filter(row => operationIds.includes(row.id)).map(row => ({
    operationId: row.id, path: row.path, beforeHash: row.beforeHash, afterHash: row.afterHash,
    citationAdds: row.citationAdds,
  }));
  const edit = seal({ version: 'faction_consumer_guided_source_revision_v1', sectionId: section.section.id,
    revisionSpecHash: spec.hash, parentDraftHash, draftHash, changes,
    consumerFailureEvidenceHash: spec.consumerEvidenceHash,
    deterministicSourceAndKernelValidationPassed: true, modelReviewPerformed: false,
    oldSemanticAcceptanceInheritedForChangedFields: false,
    freshIndependentConsumerEvaluationRequired: true, runtimeAccepted: false, trainingTruth: false });
  const issues = seal({ version: 'faction_source_calibrated_revision_issues_v1', issues: [], openIssues: 0,
    sourceProofHashes: changes.map(change => spec.operations.find(row => row.id === change.operationId).sourceProofHash),
    modelConsensusUsedAsRulesAuthority: false, trainingTruth: false });
  const round = seal({ sectionId: section.section.id, revision: priorRound.revision + 1, draftHash,
    reviewHashes: [], reviews: [], reviewPartition: [], coverageAssignmentPlan: null, issues, rawIssues: [],
    adjudication: seal({ version: 'faction_deterministic_source_adjudication_v1', accepted: true,
      revisionSpecHash: spec.hash, changedFieldCount: changes.length, sourceAndKernelCalibrated: true,
      modelReviewPerformed: false, fullStrategyEffectivenessProven: false, trainingTruth: false }),
    priorRoundHash: priorRound.hash, oldFailuresRetained: true,
    semanticReviewMode: 'parent_model_review_plus_exact_source_kernel_revision',
    consumerGuidedRevisionSpecHash: spec.hash, trainingTruth: false });
  return seal({ ...body(section), draft: nextDraft, rounds: [...section.rounds, round],
    edits: [...section.edits, edit], semanticReviewPassed: true,
    semanticReviewBasis: 'parent_model_review_plus_exact_source_kernel_revision',
    rulesApplicationPassed: false, strategyEffectivenessProven: false, runtimeAccepted: false, trainingTruth: false });
}

// V1 intentionally covers only the two independently observed Terran gaps.
// It never asks a model to rewrite unaffected prose and cannot publish the
// result: the returned candidate must still pass a fresh isolated consumer run.
export function createFactionConsumerGuidedRevisionV1({ input, candidate, knownRulePolicy,
  rosterEvaluation, ruleEvaluation, consumerEvidence, rosterDrills, applicationDrills,
  draftEnvelopeBinding, parentProductionEvidence }) {
  [input, candidate, knownRulePolicy, parentProductionEvidence].forEach(verifySeal);
  validateFactionDraftEnvelopeBindingV2(draftEnvelopeBinding);
  if (candidate.factionRecordKey !== 'tactical_cards:terran_armed_forces'
    || candidate.draftEnvelopeBindingHash !== draftEnvelopeBinding.hash
    || parentProductionEvidence.candidateHash !== candidate.hash
    || parentProductionEvidence.inputHash !== input.hash
    || !parentProductionEvidence.sourceReviewWorkflowRebuilt)
    fail('FACTION_CONSUMER_GUIDED_REVISION_SCOPE');
  factionConsumerContextV1({ input, candidate, knownRulePolicy });
  const failures = authenticateConsumerFailures({ candidate, rosterEvaluation, ruleEvaluation,
    consumerEvidence, rosterDrills, applicationDrills });
  const roster = deriveRosterProof(rosterDrills, input.factionRecordKey, failures.rosterFailures[0]);
  const reaction = deriveReactionProof(applicationDrills, input.factionRecordKey, failures.ruleFailures);
  const armyIndex = candidate.sections.findIndex(row => row.section.id === ARMY_SECTION);
  const unitIndex = candidate.sections.findIndex(row => row.section.id === UNIT_SECTION);
  if (armyIndex < 0 || unitIndex < 0) fail('FACTION_CONSUMER_GUIDED_REVISION_SECTION_MISSING');
  const army = candidate.sections[armyIndex], unit = candidate.sections[unitIndex];
  [army, unit].forEach(verifySeal);
  if (army.draft.recommendations[0]?.alternatives[0] !== OLD_ROSTER_TEXT
    || unit.draft.recommendations[5]?.procedure[0] !== OLD_REACTION_TEXT
    || army.draft.recommendations[0].sourceRefs.includes('source:tactical_cards:armory')
    || unit.draft.recommendations[5].sourceRefs.includes('faq-v1:59'))
    fail('FACTION_CONSUMER_GUIDED_REVISION_PARENT_FIELD_DRIFT');

  const operations = [
    { id: 'terran_two_goliath_elite_arithmetic', sectionId: ARMY_SECTION,
      path: 'draft.recommendations.0.alternatives.0', beforeHash: hash(OLD_ROSTER_TEXT), afterHash: hash(NEW_ROSTER_TEXT),
      citationAdds: ['source:tactical_cards:armory'], caseId: ROSTER_CASE,
      caseHash: roster.proof.caseHash, sourceProofHash: roster.proof.hash, derivedAnswerHash: hash(roster.derived) },
    { id: 'terran_repeatable_reaction_activation_scope', sectionId: UNIT_SECTION,
      path: 'draft.recommendations.5.procedure.0', beforeHash: hash(OLD_REACTION_TEXT), afterHash: hash(NEW_REACTION_TEXT),
      citationAdds: ['faq-v1:59'], caseId: REACTION_CASE,
      caseHash: reaction.proof.caseHash, sourceProofHash: reaction.proof.hash, derivedAnswerHash: hash(reaction.derived) },
  ];
  const spec = seal({ version: 'faction_consumer_guided_revision_spec_v1', inputHash: input.hash,
    parentCandidateHash: candidate.hash, factionRecordKey: candidate.factionRecordKey,
    rosterEvaluationHash: rosterEvaluation.hash, ruleEvaluationHash: ruleEvaluation.hash,
    consumerEvidenceHash: consumerEvidence.hash, operations,
    observedAugmentedFailures: { roster: failures.rosterFailures.map(row => row.hash),
      rule: failures.ruleFailures.map(row => row.hash) },
    semanticFieldChanges: 2, citationArrayChanges: 2, unaffectedRecommendationFieldsMustRemainByteExact: true,
    sourceRefreshPerformed: false, providerCalls: 0, runtimeAccepted: false, trainingTruth: false });

  const sections = candidate.sections.slice();
  const armyDraft = structuredClone(army.draft);
  armyDraft.recommendations[0].alternatives[0] = NEW_ROSTER_TEXT;
  armyDraft.recommendations[0].sourceRefs.push('source:tactical_cards:armory');
  validateFactionDraftV1(armyDraft, input, { draftEnvelopeBinding });
  sections[armyIndex] = appendSourceCalibratedRevision(army, { spec,
    operationIds: ['terran_two_goliath_elite_arithmetic'], nextDraft: armyDraft });

  const unitDraft = structuredClone(unit.draft);
  unitDraft.recommendations[5].procedure[0] = NEW_REACTION_TEXT;
  unitDraft.recommendations[5].sourceRefs.push('faq-v1:59');
  validateFactionDraftV1(unitDraft, input, { draftEnvelopeBinding });
  sections[unitIndex] = appendSourceCalibratedRevision(unit, { spec,
    operationIds: ['terran_repeatable_reaction_activation_scope'], nextDraft: unitDraft });

  const revised = seal({ ...body(candidate), sections, parentCandidateHash: candidate.hash,
    consumerGuidedRevisionSpecHash: spec.hash,
    semanticReviewPassed: true, independentEvaluationPassed: false,
    actualRoomReplayPerformed: false, strategyEffectivenessProven: false,
    runtimeAccepted: false, humanReviewed: false, canAffectRules: false, trainingTruth: false });
  factionConsumerContextV1({ input, candidate: revised, knownRulePolicy });
  const revisionEvidence = seal({ version: 'faction_consumer_guided_revision_evidence_v1',
    inputHash: input.hash, candidateHash: revised.hash, parentCandidateHash: candidate.hash,
    revisionSpecHash: spec.hash, parentProductionEvidenceHash: parentProductionEvidence.hash,
    parentProductionRunId: parentProductionEvidence.runId,
    parentProductionCandidateSourceRequired: true,
    sourceReviewWorkflowRebuilt: true, parentSourceReviewPreserved: true,
    deterministicSourceAndKernelRevisionVerified: true,
    semanticFieldChanges: 2, citationArrayChanges: 2,
    unaffectedRecommendationFieldsByteExact: true, freshIndependentConsumerEvaluationPerformed: false,
    sourceRefreshPerformed: false, newProviderCalls: 0, runtimeAccepted: false,
    strategyEffectivenessProven: false, trainingTruth: false });
  return { candidate: revised, revisionSpec: spec, revisionEvidence };
}

export const FACTION_CONSUMER_GUIDED_REVISION_TEXT_V1 = Object.freeze({
  OLD_ROSTER_TEXT, NEW_ROSTER_TEXT, OLD_REACTION_TEXT, NEW_REACTION_TEXT,
});
