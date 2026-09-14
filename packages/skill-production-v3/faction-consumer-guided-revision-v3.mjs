import { seal, verifySeal, hash, fail } from '../skill-production/common.mjs';
import { factionConsumerContextV1 } from '../skill-evaluation/faction-roster-use-evaluation-v1.mjs';
import { validateFactionDraftV1 } from './faction-strategy-workflow-v1.mjs';
import { validateFactionDraftEnvelopeBindingV2 } from './faction-draft-envelope-v2.mjs';

const FACTION = 'tactical_cards:zerg_swarm';
const ARMY_SECTION = 'faction.zerg_swarm.army_resources.1';
const THREAT_SECTION = 'faction.zerg_swarm.threat_tradeoffs.1';
const GAP_CASE = 'faction-roster-choice.zerg_gap_three';
const SUPPORT_CASE = 'faction-roster-choice.zerg_support';
const REACTION_CASE = 'faction-rule-application.reaction.inside_activation.0.1';
const NON_LETHAL = 'core.FuahgilWtc8nccVSp2Vv.items.0.subItems.47';
const STANDARD_DAMAGE = 'core.iuUyObNTQ2M8xK4IUqzC.items.7.subItems.3';
const OLD_REACTION_TEXT = '2. 确认本激活唯一 Reaction 名额：每玩家每次激活只能结算一个 Reaction，且每个具名 Reaction 每轮每单位一次；Brood Instinct 与 Transfusion 竞争同一名额。';
const NEW_REACTION_TEXT = '2. 分开判断 Reaction 次数：触发位于某次 Activation 内时，每玩家本次 Activation 最多结算一个 Reaction；REPEATABLE Reaction 只看本次 Activation 已结算总数，0 次则通过次数检查、1 次则失败，不再套用同名能力每轮一次，也不读取只属于激活外触发的 usesForTrigger。触发完全位于 Activation 外时，才按同一 trigger 最多一次判断。Brood Instinct 与 Transfusion 在同一次 Activation 内仍竞争同一个 Reaction 名额。';

const ROSTER_RECOMMENDATION = Object.freeze({
  title: '给定编军备选的机械核算：槽位、Unique 与瓦斯并列最小值',
  when: [
    '已选择 Zerg Swarm，并需要在若干给定战术卡组合中判断哪些能容纳完整单位名单。',
    '目标是先通过阵营、槽位、Unique 与资源检查，再在全部合法组合中找最低瓦斯；此处不比较卡牌能力或胜率。',
  ],
  procedure: [
    '逐类合计单位起始 Supply；每个单位占用其类型等于起始 Supply 的 Army Slots，再加总阵营卡与每张所购战术卡提供的槽位。每个备选必须独立从零计算。',
    '只对明确带 Unique 标记的卡限制一份；Hydralisk Den 不带 Unique，可购买两份并把两张的 +2 Elite 分别计入。Overlord 与 Lair 带 Unique 时才各自限一份，不能把该限制扩展给其他卡。',
    '先列出所有槽位与 Unique 检查通过的备选，再分别相加卡面瓦斯。Hydralisk Den、Lair、Overlord 各为 35；Overseer 为 25；Hatchery 为 30。',
    '最低成本集合只保留瓦斯总和等于最小值的合法备选；若多个合法备选同价则全部保留。minimumVespene 必须与所列最低成本备选的真实总和一致，不能把 30 瓦斯的 Hatchery 与 25 瓦斯的 Overseer并列成最低。',
  ],
  alternatives: [
    '若目标改为比较能力价值、任务适配或对局胜率，完成上述合法性与成本核算后另开策略比较，不能用主观强度改变最低成本答案。',
    '若卡面或官方规则版本改变槽位、费用或 Unique 标记，以新版本来源重新核算，不沿用旧结论。',
  ],
  risk: '把“仅 Unique 卡限一份”误读成“所有战术卡限一份”，会错误排除重复非 Unique 卡；先报最低瓦斯再核对对应备选，也会产生集合与数值互相矛盾的结果。',
  reviseIf: [
    '完整单位名单、编制大小或任一备选卡组合改变时，从单位槽位总需求开始重算。',
    '目标不再是给定选项中的最低瓦斯，而是完整军表强度或任务适配时，切换到对应策略流程。',
  ],
  sourceRefs: [
    'source:tactical_cards:zerg_swarm',
    'source:tactical_cards:hydralisk_den',
    'source:tactical_cards:lair',
    'source:tactical_cards:overlord',
    'source:tactical_cards:overseer',
    'source:tactical_cards:hatchery',
    'source:army_units:hydralisk',
    'source:army_units:raptor__zergling_',
    'source:army_units:queen',
    'core.FuahgilWtc8nccVSp2Vv.items.0.subItems.3',
    'core.Rj6sMyNODPQ8OHUc9Clp.items.1.subItems.4',
  ],
  unproven: [
    '最低瓦斯只证明给定组合的机械成本，不证明该组合在完整对局中更强。',
  ],
});

const NON_LETHAL_RECOMMENDATION = Object.freeze({
  title: '利用对手 NON-LETHAL DAMAGE 标记选择集火时机',
  when: [
    '对手单位因 Stimpack 或其他来源承受 NON-LETHAL DAMAGE，且需要判断它是否已经被移除、是否值得追加普通伤害。',
    '当前只分析伤害子过程；攻击完整合法性、命中与防御仍由规则器另行确认。',
  ],
  procedure: [
    'NON-LETHAL DAMAGE 只把数值加到 Unit 的 Damage Marker；即使总标记达到或超过模型 HP，也不在这个步骤移除任何模型。没有后续普通伤害事件时，targetDestroyed 为 false、casualtyCount 为 0，标记保留为先前值加本次非致命伤害。',
    '该单位后来承受正数标准 Damage 时，才把已有 Damage Marker 与新伤害合并并正常移除伤亡；每移除一个模型扣除其 HP。最后一个模型被移除后，postDamageMarker 记 0，溢出伤害不保留。',
    '制定 Zerg 集火计划时，把高 NON-LETHAL 标记的敌方单位视为“仍在场但下一次普通伤害可能触发伤亡”，优先比较追加一次可靠普通伤害与攻击其他目标的收益。',
  ],
  alternatives: [
    '若本轮无法合法造成普通伤害，不把高 NON-LETHAL 标记误记为已消灭；继续按其在场位置、威胁范围与任务控制计算。',
    '若目标还有多个模型，按每个模型 HP 逐个扣除并保留不足以下一次移除的余量，不能套用最后一个模型归零的快捷结论。',
  ],
  risk: '提前移除仅承受非致命伤害的模型会错误改变位置、控制、威胁与激活；反过来忽略已有标记，会低估一次后续普通伤害的击杀价值。',
  reviseIf: [
    '目标模型数、HP、已有 Damage Marker、非致命伤害量或后续普通伤害量变化时重新计算。',
    '存在减伤、伤害转移、特殊伤亡顺序或其他效果时，交由相应规则器按实际事件顺序重算。',
  ],
  sourceRefs: [NON_LETHAL, STANDARD_DAMAGE, 'source:army_units:marine'],
  unproven: [
    '把火力转向带高非致命标记的目标是否优于当前其他目标，仍需结合位置、任务得分与命中概率评估。',
  ],
});

function body(value) {
  const { hash: ignored, ...rest } = value;
  return structuredClone(rest);
}

function multiset(values) { return values.slice().sort(); }
function same(values, expected) { return hash(multiset(values)) === hash(multiset(expected)); }

function proofFor(drills, failure) {
  const proof = drills.proof().find(row => row.hash === failure.kernelProofHash);
  if (!proof || proof.caseHash !== failure.caseHash) fail('FACTION_ZERG_GUIDED_REVISION_PROOF_MISSING');
  return verifySeal(proof);
}

function derivedRoster(proof) {
  const legal = proof.resolved.filter(row => row.outcome.eligibleWithinDeclaredChecks);
  const minimum = Math.min(...legal.map(row => row.outcome.result.vespeneSpent));
  return {
    eligibleOptionIds: legal.map(row => row.optionId),
    minimumCostOptionIds: legal.filter(row => row.outcome.result.vespeneSpent === minimum).map(row => row.optionId),
    minimumVespene: minimum,
  };
}

function authenticateFailures({ candidate, rosterEvaluation, ruleEvaluation, consumerEvidence,
  rosterDrills, applicationDrills }) {
  [candidate, rosterEvaluation, ruleEvaluation, consumerEvidence, rosterDrills.manifest,
    applicationDrills.manifest].forEach(verifySeal);
  if (consumerEvidence.version !== 'faction_consumer_actual_delivery_evidence_v1'
    || consumerEvidence.candidateHash !== candidate.hash
    || consumerEvidence.rosterEvaluationHash !== rosterEvaluation.hash
    || consumerEvidence.ruleApplicationEvaluationHash !== ruleEvaluation.hash
    || consumerEvidence.applicationGrouping !== 'one_rule_family_per_request'
    || consumerEvidence.groupedRuleCalls !== 18 || consumerEvidence.newProviderCalls !== 0
    || rosterEvaluation.candidateHash !== candidate.hash || ruleEvaluation.candidateHash !== candidate.hash
    || rosterEvaluation.drillManifestHash !== rosterDrills.manifest.hash
    || ruleEvaluation.drillManifestHash !== applicationDrills.manifest.hash
    || rosterEvaluation.boundedRosterChoicePassed || ruleEvaluation.boundedRuleApplicationPassed
    || rosterEvaluation.expectedAnswersExposed !== false || ruleEvaluation.expectedAnswersExposed !== false)
    fail('FACTION_ZERG_GUIDED_REVISION_EVIDENCE_INVALID');

  const rosterArm = rosterEvaluation.results.find(row => row.arm === 'overall_plus_faction');
  const rosterFailures = rosterArm?.scores.filter(row => !row.passed) || [];
  if (!same(rosterFailures.map(row => row.id), [GAP_CASE, SUPPORT_CASE]))
    fail('FACTION_ZERG_GUIDED_REVISION_ROSTER_SCOPE');
  rosterFailures.forEach(score => {
    if (rosterDrills.verify(score.prediction).hash !== score.hash)
      fail('FACTION_ZERG_GUIDED_REVISION_ROSTER_SCORE_DRIFT');
  });

  const ruleArms = ruleEvaluation.results.filter(row => row.arm === 'overall_plus_faction');
  if (ruleArms.length !== 9 || !same(ruleArms.map(row => row.group), [
    'damage_timing', 'damage_timing', 'damage_timing',
    'reaction_cap', 'reaction_cap', 'reaction_cap',
    'active_named_limit', 'active_named_limit', 'active_named_limit',
  ])) fail('FACTION_ZERG_GUIDED_REVISION_RULE_DENOMINATOR');
  const ruleFailures = ruleArms.flatMap(row => row.scores.filter(score => !score.passed));
  const expectedRuleFailures = [
    'faction-rule-application.non_lethal_only.0',
    'faction-rule-application.non_lethal_only.1',
    'faction-rule-application.non_lethal_only.3',
    'faction-rule-application.non_lethal_only.3',
    'faction-rule-application.non_lethal_only.3',
    REACTION_CASE, REACTION_CASE, REACTION_CASE,
  ];
  if (!same(ruleFailures.map(row => row.id), expectedRuleFailures))
    fail('FACTION_ZERG_GUIDED_REVISION_RULE_SCOPE');
  ruleFailures.forEach(score => {
    if (applicationDrills.verify(score.prediction).hash !== score.hash)
      fail('FACTION_ZERG_GUIDED_REVISION_RULE_SCORE_DRIFT');
  });
  return { rosterFailures, ruleFailures };
}

function appendRevision(section, { spec, operationIds, draft }) {
  const prior = verifySeal(section.rounds.at(-1));
  const operations = spec.operations.filter(row => operationIds.includes(row.id));
  const edit = seal({ version: 'faction_consumer_guided_source_revision_v3', sectionId: section.section.id,
    revisionSpecHash: spec.hash, parentDraftHash: hash(section.draft), draftHash: hash(draft),
    changes: operations.map(row => ({ operationId: row.id, path: row.path,
      beforeHash: row.beforeHash, afterHash: row.afterHash, citationAdds: row.citationAdds })),
    deterministicSourceAndKernelValidationPassed: true, modelReviewPerformed: false,
    freshIndependentConsumerEvaluationRequired: true, runtimeAccepted: false, trainingTruth: false });
  const issues = seal({ version: 'faction_source_calibrated_revision_issues_v3', issues: [], openIssues: 0,
    sourceProofHashes: [...new Set(operations.map(row => row.sourceProofHash))],
    modelConsensusUsedAsRulesAuthority: false, trainingTruth: false });
  const round = seal({ sectionId: section.section.id, revision: prior.revision + 1,
    draftHash: hash(draft), reviewHashes: [], reviews: [], reviewPartition: [], coverageAssignmentPlan: null,
    issues, rawIssues: [], adjudication: seal({ version: 'faction_deterministic_source_adjudication_v3',
      accepted: true, revisionSpecHash: spec.hash, changedFieldCount: operations.length,
      sourceAndKernelCalibrated: true, modelReviewPerformed: false,
      fullStrategyEffectivenessProven: false, trainingTruth: false }),
    priorRoundHash: prior.hash, oldFailuresRetained: true,
    semanticReviewMode: 'prior_review_plus_exact_source_kernel_revision_v3',
    consumerGuidedRevisionSpecHash: spec.hash, trainingTruth: false });
  return seal({ ...body(section), draft, rounds: [...section.rounds, round],
    edits: [...section.edits, edit], semanticReviewPassed: true,
    semanticReviewBasis: 'prior_review_plus_exact_source_kernel_revision_v3',
    rulesApplicationPassed: false, strategyEffectivenessProven: false,
    runtimeAccepted: false, trainingTruth: false });
}

export function createFactionConsumerGuidedRevisionV3({ input, candidate, knownRulePolicy,
  rosterEvaluation, ruleEvaluation, consumerEvidence, rosterDrills, applicationDrills,
  draftEnvelopeBinding, parentProductionEvidence }) {
  [input, candidate, knownRulePolicy, parentProductionEvidence].forEach(verifySeal);
  validateFactionDraftEnvelopeBindingV2(draftEnvelopeBinding);
  if (candidate.factionRecordKey !== FACTION
    || candidate.draftEnvelopeBindingHash !== draftEnvelopeBinding.hash
    || parentProductionEvidence.candidateHash !== candidate.hash
    || parentProductionEvidence.inputHash !== input.hash
    || !parentProductionEvidence.semanticProductionReleaseVerified)
    fail('FACTION_ZERG_GUIDED_REVISION_SCOPE');
  factionConsumerContextV1({ input, candidate, knownRulePolicy });
  const failures = authenticateFailures({ candidate, rosterEvaluation, ruleEvaluation,
    consumerEvidence, rosterDrills, applicationDrills });

  const rosterProofs = Object.fromEntries(failures.rosterFailures.map(failure => [failure.id,
    proofFor(rosterDrills, failure)]));
  if (hash(derivedRoster(rosterProofs[GAP_CASE])) !== hash({ eligibleOptionIds: ['option-1', 'option-2', 'option-3'],
    minimumCostOptionIds: ['option-1', 'option-2', 'option-3'], minimumVespene: 70 })
    || hash(derivedRoster(rosterProofs[SUPPORT_CASE])) !== hash({ eligibleOptionIds: ['option-1', 'option-2'],
      minimumCostOptionIds: ['option-1'], minimumVespene: 25 }))
    fail('FACTION_ZERG_GUIDED_REVISION_ROSTER_PROOF_DRIFT');

  const damageProofs = [...new Map(failures.ruleFailures.filter(row => row.id.includes('.non_lethal_only.'))
    .map(row => { const proof = proofFor(applicationDrills, row); return [proof.hash, proof]; }))].map(([, value]) => value);
  const reactionProofs = [...new Map(failures.ruleFailures.filter(row => row.id === REACTION_CASE)
    .map(row => { const proof = proofFor(applicationDrills, row); return [proof.hash, proof]; }))].map(([, value]) => value);
  if (damageProofs.length !== 3 || damageProofs.some(proof => !proof.oracleAgrees
    || proof.observed.answer.targetDestroyed !== false || proof.observed.answer.casualtyCount !== 0)
    || !same(damageProofs.map(proof => proof.observed.answer.postDamageMarker), [2, 3, 5])
    || reactionProofs.length !== 1 || reactionProofs[0].observed.answer.legalWithinNamedLimit !== true)
    fail('FACTION_ZERG_GUIDED_REVISION_RULE_PROOF_DRIFT');

  const sourceProof = seal({ version: 'faction_consumer_guided_revision_source_proof_v3',
    inputHash: input.hash, rosterKernelProofHashes: Object.values(rosterProofs).map(row => row.hash),
    damageKernelProofHashes: damageProofs.map(row => row.hash), reactionKernelProofHash: reactionProofs[0].hash,
    sourceAndKernelAgree: true, completeGameLegalityProven: false, trainingTruth: false });

  const armyIndex = candidate.sections.findIndex(row => row.section.id === ARMY_SECTION);
  const threatIndex = candidate.sections.findIndex(row => row.section.id === THREAT_SECTION);
  if (armyIndex < 0 || threatIndex < 0) fail('FACTION_ZERG_GUIDED_REVISION_SECTION_MISSING');
  const army = verifySeal(candidate.sections[armyIndex]), threat = verifySeal(candidate.sections[threatIndex]);
  if (army.draft.recommendations.length !== 6 || threat.draft.recommendations.length !== 6
    || threat.draft.recommendations[0]?.procedure[1] !== OLD_REACTION_TEXT)
    fail('FACTION_ZERG_GUIDED_REVISION_PARENT_FIELD_DRIFT');

  const operations = [
    { id: 'zerg_roster_arithmetic_and_nonunique_copies', sectionId: ARMY_SECTION,
      path: 'draft.recommendations.6', beforeHash: null, afterHash: hash(ROSTER_RECOMMENDATION),
      citationAdds: ROSTER_RECOMMENDATION.sourceRefs, sourceProofHash: sourceProof.hash },
    { id: 'zerg_non_lethal_target_timing', sectionId: THREAT_SECTION,
      path: 'draft.recommendations.6', beforeHash: null, afterHash: hash(NON_LETHAL_RECOMMENDATION),
      citationAdds: NON_LETHAL_RECOMMENDATION.sourceRefs, sourceProofHash: sourceProof.hash },
    { id: 'zerg_repeatable_reaction_counter_scope', sectionId: THREAT_SECTION,
      path: 'draft.recommendations.0.procedure.1', beforeHash: hash(OLD_REACTION_TEXT),
      afterHash: hash(NEW_REACTION_TEXT), citationAdds: ['faq-v1:59'], sourceProofHash: sourceProof.hash },
  ];
  const spec = seal({ version: 'faction_consumer_guided_revision_spec_v3', inputHash: input.hash,
    parentCandidateHash: candidate.hash, factionRecordKey: candidate.factionRecordKey,
    parentProductionEvidenceHash: parentProductionEvidence.hash,
    rosterEvaluationHash: rosterEvaluation.hash, ruleEvaluationHash: ruleEvaluation.hash,
    parentConsumerEvidenceHash: consumerEvidence.hash, sourceProofHash: sourceProof.hash,
    operations, observedAugmentedFailureHashes: [...failures.rosterFailures, ...failures.ruleFailures].map(row => row.hash),
    changedExistingFields: 1, appendedRecommendations: 2,
    unaffectedRecommendationFieldsMustRemainByteExact: true,
    groupedIndependentConsumerEvaluationRequired: true, sourceRefreshPerformed: false,
    providerCalls: 0, runtimeAccepted: false, trainingTruth: false });

  const sections = candidate.sections.slice();
  const armyDraft = structuredClone(army.draft);
  armyDraft.recommendations.push(structuredClone(ROSTER_RECOMMENDATION));
  validateFactionDraftV1(armyDraft, input, { draftEnvelopeBinding });
  sections[armyIndex] = appendRevision(army, { spec,
    operationIds: ['zerg_roster_arithmetic_and_nonunique_copies'], draft: armyDraft });

  const threatDraft = structuredClone(threat.draft);
  threatDraft.recommendations[0].procedure[1] = NEW_REACTION_TEXT;
  threatDraft.recommendations[0].sourceRefs.push('faq-v1:59');
  threatDraft.recommendations.push(structuredClone(NON_LETHAL_RECOMMENDATION));
  validateFactionDraftV1(threatDraft, input, { draftEnvelopeBinding });
  sections[threatIndex] = appendRevision(threat, { spec,
    operationIds: ['zerg_non_lethal_target_timing', 'zerg_repeatable_reaction_counter_scope'], draft: threatDraft });

  const revised = seal({ ...body(candidate), sections, parentCandidateHash: candidate.hash,
    consumerGuidedRevisionSpecHash: spec.hash, semanticReviewPassed: true,
    independentEvaluationPassed: false, actualRoomReplayPerformed: false,
    strategyEffectivenessProven: false, runtimeAccepted: false, humanReviewed: false,
    canAffectRules: false, trainingTruth: false });
  factionConsumerContextV1({ input, candidate: revised, knownRulePolicy });
  const revisionEvidence = seal({ version: 'faction_consumer_guided_revision_evidence_v3',
    runId: parentProductionEvidence.runId, inputHash: input.hash, candidateHash: revised.hash,
    parentCandidateHash: candidate.hash, revisionSpecHash: spec.hash,
    parentProductionEvidenceHash: parentProductionEvidence.hash,
    parentConsumerEvidenceHash: consumerEvidence.hash, sourceProofHash: sourceProof.hash,
    deterministicSourceAndKernelRevisionVerified: true, parentSourceReviewPreserved: true,
    changedExistingFields: 1, appendedRecommendations: 2,
    unaffectedRecommendationFieldsByteExact: true,
    groupedIndependentConsumerEvaluationPerformed: false, sourceRefreshPerformed: false,
    newProviderCalls: 0, runtimeAccepted: false, strategyEffectivenessProven: false,
    trainingTruth: false });
  return { candidate: revised, revisionSpec: spec, revisionEvidence, sourceProof };
}

export const FACTION_CONSUMER_GUIDED_REVISION_TEXT_V3 = Object.freeze({
  OLD_REACTION_TEXT, NEW_REACTION_TEXT, ROSTER_RECOMMENDATION, NON_LETHAL_RECOMMENDATION,
});
