import { seal, verifySeal, hash, fail } from '../skill-production/common.mjs';
import { factionConsumerContextV1 } from '../skill-evaluation/faction-roster-use-evaluation-v1.mjs';
import { validateFactionDraftV1 } from './faction-strategy-workflow-v1.mjs';
import { validateFactionDraftEnvelopeBindingV2 } from './faction-draft-envelope-v2.mjs';
import { FACTION_CONSUMER_GUIDED_REVISION_TEXT_V1 } from './faction-consumer-guided-revision-v1.mjs';

const DAMAGE_CASES = [0, 1, 3].map(value => 'faction-rule-application.non_lethal_then_standard.' + value);
const REACTION_CASE = 'faction-rule-application.reaction.inside_activation.0.1';
const ARMY_SECTION = 'faction.terran_armed_forces.army_resources.1';
const UNIT_SECTION = 'faction.terran_armed_forces.unit_roles.1';
const STANDARD_DAMAGE_SOURCE = 'core.iuUyObNTQ2M8xK4IUqzC.items.7.subItems.3';
const OLD_DAMAGE_TEXT = '若单位已累积伤害，仅累加至Damage Marker，不触发伤亡移除；后续任何标准伤害使合并Total Damage达到或超过模型HP时，才按正常规则移除模型';
const NEW_DAMAGE_TEXT = '若单位已累积伤害，NON-LETHAL DAMAGE只累加至Damage Marker，不触发伤亡移除；后续任何正数标准伤害到来时，将既有标记与新伤害合并并按正常规则移除模型。每移除一个模型便从Total Damage扣除其HP；若最后一个模型被移除，单位不再保留Damage Marker，状态输出的postDamageMarker记0，剩余溢出伤害弃置；若仍有模型且余量不足以移除下一模型，才把余量保留为Damage Marker。';
const OLD_REACTION_TEXT = FACTION_CONSUMER_GUIDED_REVISION_TEXT_V1.NEW_REACTION_TEXT;
const NEW_REACTION_TEXT = '确认Reaction次数限制时把两个计数分开：触发发生在某次Activation内，唯一封锁条件是本玩家在当前Activation已经结算过1个Reaction；REPEATABLE使同名能力在本轮其他Activation使用过仍不触发“每轮一次”封锁，usesForTrigger不在此分支重复计数。因此inside_activation且reactionsResolvedThisActivation=0时，本次次数检查通过（即使usesForTrigger=1）；计数为1时失败。触发完全发生在Activation外时才改为同一trigger最多一次，即usesForTrigger=0通过、1失败。此结论只处理次数上限，费用、触发和目标仍须另检。';

function body(value) { const { hash: ignored, ...rest } = value; return structuredClone(rest); }
function multiset(values) { return values.slice().sort(); }
function same(values, expected) { return hash(multiset(values)) === hash(multiset(expected)); }

function authenticate({ candidate, rosterEvaluation, ruleEvaluation, consumerEvidence,
  rosterDrills, applicationDrills }) {
  [rosterEvaluation, ruleEvaluation, consumerEvidence, rosterDrills.manifest,
    applicationDrills.manifest].forEach(verifySeal);
  if (consumerEvidence.version !== 'faction_consumer_actual_delivery_evidence_v2'
    || consumerEvidence.candidateHash !== candidate.hash
    || consumerEvidence.rosterEvaluationHash !== rosterEvaluation.hash
    || consumerEvidence.ruleApplicationEvaluationHash !== ruleEvaluation.hash
    || rosterEvaluation.candidateHash !== candidate.hash || ruleEvaluation.candidateHash !== candidate.hash
    || rosterEvaluation.drillManifestHash !== rosterDrills.manifest.hash
    || ruleEvaluation.drillManifestHash !== applicationDrills.manifest.hash
    || !consumerEvidence.completeConsumerRequestsReconstructed
    || !consumerEvidence.baselineAndNegativeScoresPreserved
    || consumerEvidence.newProviderCalls !== 0
    || !rosterEvaluation.boundedRosterChoicePassed || ruleEvaluation.boundedRuleApplicationPassed
    || rosterEvaluation.expectedAnswersExposed !== false || ruleEvaluation.expectedAnswersExposed !== false)
    fail('FACTION_CONSUMER_GUIDED_REVISION_V2_EVIDENCE_INVALID');
  const roster = rosterEvaluation.results.find(row => row.arm === 'overall_plus_faction');
  if (!roster || roster.correct !== roster.total || roster.scores.some(score => !score.passed))
    fail('FACTION_CONSUMER_GUIDED_REVISION_V2_ROSTER_REGRESSION');
  const augmented = ruleEvaluation.results.filter(row => row.arm === 'overall_plus_faction');
  if (augmented.length !== 3 || !same(augmented.map(row => row.repetition), [0, 1, 2]))
    fail('FACTION_CONSUMER_GUIDED_REVISION_V2_RULE_DENOMINATOR');
  const failures = augmented.flatMap(row => row.scores.filter(score => !score.passed));
  if (!same(failures.map(row => row.id), [...DAMAGE_CASES, ...DAMAGE_CASES, REACTION_CASE, REACTION_CASE, REACTION_CASE]))
    fail('FACTION_CONSUMER_GUIDED_REVISION_V2_RULE_SCOPE');
  for (const score of failures) {
    verifySeal(score);
    if (applicationDrills.verify(score.prediction).hash !== score.hash)
      fail('FACTION_CONSUMER_GUIDED_REVISION_V2_SCORE_DRIFT');
  }
  return failures;
}

function proofFor(applicationDrills, failure) {
  const proof = applicationDrills.proof().find(row => row.hash === failure.kernelProofHash);
  if (!proof || proof.caseHash !== failure.caseHash) fail('FACTION_CONSUMER_GUIDED_REVISION_V2_PROOF_MISSING');
  return verifySeal(proof);
}

function appendRevision(section, { spec, operationId, draft }) {
  verifySeal(section); const prior = verifySeal(section.rounds.at(-1));
  const operation = spec.operations.find(row => row.id === operationId);
  const edit = seal({ version: 'faction_consumer_guided_source_revision_v2', sectionId: section.section.id,
    revisionSpecHash: spec.hash, parentDraftHash: hash(section.draft), draftHash: hash(draft),
    changes: [{ operationId, path: operation.path, beforeHash: operation.beforeHash,
      afterHash: operation.afterHash, citationAdds: operation.citationAdds }],
    consumerFailureEvidenceHash: spec.consumerEvidenceHash,
    deterministicSourceAndKernelValidationPassed: true, modelReviewPerformed: false,
    oldSemanticAcceptanceInheritedForChangedFields: false,
    freshIndependentConsumerEvaluationRequired: true, runtimeAccepted: false, trainingTruth: false });
  const issues = seal({ version: 'faction_source_calibrated_revision_issues_v2', issues: [], openIssues: 0,
    sourceProofHash: operation.sourceProofHash, modelConsensusUsedAsRulesAuthority: false, trainingTruth: false });
  const round = seal({ sectionId: section.section.id, revision: prior.revision + 1,
    draftHash: hash(draft), reviewHashes: [], reviews: [], reviewPartition: [], coverageAssignmentPlan: null,
    issues, rawIssues: [], adjudication: seal({ version: 'faction_deterministic_source_adjudication_v2',
      accepted: true, revisionSpecHash: spec.hash, changedFieldCount: 1,
      sourceAndKernelCalibrated: true, modelReviewPerformed: false,
      fullStrategyEffectivenessProven: false, trainingTruth: false }),
    priorRoundHash: prior.hash, oldFailuresRetained: true,
    semanticReviewMode: 'prior_review_plus_exact_source_kernel_revision_v2',
    consumerGuidedRevisionSpecHash: spec.hash, trainingTruth: false });
  return seal({ ...body(section), draft, rounds: [...section.rounds, round], edits: [...section.edits, edit],
    semanticReviewPassed: true, semanticReviewBasis: 'prior_review_plus_exact_source_kernel_revision_v2',
    rulesApplicationPassed: false, strategyEffectivenessProven: false,
    runtimeAccepted: false, trainingTruth: false });
}

export function createFactionConsumerGuidedRevisionV2({ input, candidate, knownRulePolicy,
  rosterEvaluation, ruleEvaluation, consumerEvidence, rosterDrills, applicationDrills,
  draftEnvelopeBinding, parentProductionEvidence }) {
  [input, candidate, knownRulePolicy, parentProductionEvidence].forEach(verifySeal);
  validateFactionDraftEnvelopeBindingV2(draftEnvelopeBinding);
  if (candidate.factionRecordKey !== 'tactical_cards:terran_armed_forces'
    || candidate.draftEnvelopeBindingHash !== draftEnvelopeBinding.hash
    || parentProductionEvidence.version !== 'faction_consumer_guided_revision_evidence_v1'
    || parentProductionEvidence.candidateHash !== candidate.hash
    || parentProductionEvidence.inputHash !== input.hash
    || !parentProductionEvidence.deterministicSourceAndKernelRevisionVerified)
    fail('FACTION_CONSUMER_GUIDED_REVISION_V2_SCOPE');
  factionConsumerContextV1({ input, candidate, knownRulePolicy });
  const failures = authenticate({ candidate, rosterEvaluation, ruleEvaluation, consumerEvidence,
    rosterDrills, applicationDrills });
  const damageFailures = failures.filter(row => DAMAGE_CASES.includes(row.id));
  const reactionFailures = failures.filter(row => row.id === REACTION_CASE);
  const damageProofs = [...new Map(damageFailures.map(row => {
    const proof = proofFor(applicationDrills, row); return [proof.hash, proof];
  })).values()];
  const reactionProofs = [...new Map(reactionFailures.map(row => {
    const proof = proofFor(applicationDrills, row); return [proof.hash, proof];
  })).values()];
  if (damageProofs.length !== 3 || damageProofs.some(proof => !proof.oracleAgrees
    || proof.observed.answer.targetDestroyed !== true || proof.observed.answer.postDamageMarker !== 0
    || proof.observed.answer.casualtyCount !== 1)
    || reactionProofs.length !== 1 || reactionProofs[0].observed.answer.legalWithinNamedLimit !== true)
    fail('FACTION_CONSUMER_GUIDED_REVISION_V2_ORACLE_DRIFT');
  const standardSource = input.frozenSources.prompt.sources.find(row => row.ref === STANDARD_DAMAGE_SOURCE);
  const standardManifest = input.frozenSources.manifest.sourceHashes.find(row => row.ref === STANDARD_DAMAGE_SOURCE);
  if (!standardSource || !standardManifest || !standardSource.passages.some(passage =>
    passage.text.includes('If Total Damage remains but cannot Destroy the next Visible model, record it with a Damage Marker')))
    fail('FACTION_CONSUMER_GUIDED_REVISION_V2_STANDARD_DAMAGE_SOURCE_DRIFT');
  const sourceProof = seal({ version: 'faction_consumer_guided_revision_source_proof_v2', inputHash: input.hash,
    damageKernelProofHashes: damageProofs.map(row => row.hash), reactionKernelProofHash: reactionProofs[0].hash,
    standardDamageSourceRef: STANDARD_DAMAGE_SOURCE, standardDamageSourceHash: standardManifest.hash,
    standardDamageSourceArtifactHash: standardSource.hash,
    sourceAndKernelAgree: true, completeGameLegalityProven: false, trainingTruth: false });
  const armyIndex = candidate.sections.findIndex(row => row.section.id === ARMY_SECTION);
  const unitIndex = candidate.sections.findIndex(row => row.section.id === UNIT_SECTION);
  if (armyIndex < 0 || unitIndex < 0) fail('FACTION_CONSUMER_GUIDED_REVISION_V2_SECTION_MISSING');
  const army = verifySeal(candidate.sections[armyIndex]), unit = verifySeal(candidate.sections[unitIndex]);
  if (army.draft.recommendations[1]?.procedure[1] !== OLD_DAMAGE_TEXT
    || unit.draft.recommendations[5]?.procedure[0] !== OLD_REACTION_TEXT
    || army.draft.recommendations[1].sourceRefs.includes(STANDARD_DAMAGE_SOURCE)
    || !unit.draft.recommendations[5].sourceRefs.includes('faq-v1:59'))
    fail('FACTION_CONSUMER_GUIDED_REVISION_V2_PARENT_FIELD_DRIFT');
  const operations = [
    { id: 'terran_non_lethal_then_standard_marker_resolution', sectionId: ARMY_SECTION,
      path: 'draft.recommendations.1.procedure.1', beforeHash: hash(OLD_DAMAGE_TEXT), afterHash: hash(NEW_DAMAGE_TEXT),
      citationAdds: [STANDARD_DAMAGE_SOURCE], failedCaseIds: DAMAGE_CASES,
      sourceProofHash: sourceProof.hash },
    { id: 'terran_repeatable_reaction_counter_precedence', sectionId: UNIT_SECTION,
      path: 'draft.recommendations.5.procedure.0', beforeHash: hash(OLD_REACTION_TEXT), afterHash: hash(NEW_REACTION_TEXT),
      citationAdds: [], failedCaseIds: [REACTION_CASE], sourceProofHash: sourceProof.hash },
  ];
  const spec = seal({ version: 'faction_consumer_guided_revision_spec_v2', inputHash: input.hash,
    parentCandidateHash: candidate.hash, factionRecordKey: candidate.factionRecordKey,
    parentProductionEvidenceHash: parentProductionEvidence.hash,
    rosterEvaluationHash: rosterEvaluation.hash, ruleEvaluationHash: ruleEvaluation.hash,
    consumerEvidenceHash: consumerEvidence.hash, sourceProofHash: sourceProof.hash, operations,
    observedAugmentedFailureHashes: failures.map(row => row.hash), semanticFieldChanges: 2,
    citationArrayChanges: 1, unaffectedRecommendationFieldsMustRemainByteExact: true,
    groupedIndependentConsumerEvaluationRequired: true, sourceRefreshPerformed: false,
    providerCalls: 0, runtimeAccepted: false, trainingTruth: false });
  const sections = candidate.sections.slice();
  const armyDraft = structuredClone(army.draft);
  armyDraft.recommendations[1].procedure[1] = NEW_DAMAGE_TEXT;
  armyDraft.recommendations[1].sourceRefs.push(STANDARD_DAMAGE_SOURCE);
  validateFactionDraftV1(armyDraft, input, { draftEnvelopeBinding });
  sections[armyIndex] = appendRevision(army, { spec,
    operationId: 'terran_non_lethal_then_standard_marker_resolution', draft: armyDraft });
  const unitDraft = structuredClone(unit.draft);
  unitDraft.recommendations[5].procedure[0] = NEW_REACTION_TEXT;
  validateFactionDraftV1(unitDraft, input, { draftEnvelopeBinding });
  sections[unitIndex] = appendRevision(unit, { spec,
    operationId: 'terran_repeatable_reaction_counter_precedence', draft: unitDraft });
  const priorSpecs = candidate.consumerGuidedRevisionSpecHashes
    || (candidate.consumerGuidedRevisionSpecHash ? [candidate.consumerGuidedRevisionSpecHash] : []);
  const revised = seal({ ...body(candidate), sections, parentCandidateHash: candidate.hash,
    consumerGuidedRevisionSpecHash: spec.hash,
    consumerGuidedRevisionSpecHashes: [...priorSpecs, spec.hash], semanticReviewPassed: true,
    independentEvaluationPassed: false, actualRoomReplayPerformed: false,
    strategyEffectivenessProven: false, runtimeAccepted: false, humanReviewed: false,
    canAffectRules: false, trainingTruth: false });
  factionConsumerContextV1({ input, candidate: revised, knownRulePolicy });
  const revisionEvidence = seal({ version: 'faction_consumer_guided_revision_evidence_v2', inputHash: input.hash,
    candidateHash: revised.hash, parentCandidateHash: candidate.hash, revisionSpecHash: spec.hash,
    parentProductionEvidenceHash: parentProductionEvidence.hash,
    parentConsumerEvidenceHash: consumerEvidence.hash, sourceProofHash: sourceProof.hash,
    sourceReviewWorkflowRebuilt: true, deterministicSourceAndKernelRevisionVerified: true,
    semanticFieldChanges: 2, citationArrayChanges: 1,
    unaffectedRecommendationFieldsByteExact: true,
    groupedIndependentConsumerEvaluationPerformed: false, sourceRefreshPerformed: false,
    newProviderCalls: 0, runtimeAccepted: false, strategyEffectivenessProven: false, trainingTruth: false });
  return { candidate: revised, revisionSpec: spec, revisionEvidence, sourceProof };
}

export const FACTION_CONSUMER_GUIDED_REVISION_TEXT_V2 = Object.freeze({
  OLD_DAMAGE_TEXT, NEW_DAMAGE_TEXT, OLD_REACTION_TEXT, NEW_REACTION_TEXT,
});
