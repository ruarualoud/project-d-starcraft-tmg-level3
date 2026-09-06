import { seal, verifySeal, hash, clone, fail } from '../skill-production/common.mjs';

// Exact persisted Provider claim. Never use a broad natural-language regex to
// guess whether arbitrary strategy prose is true or false.
const BAD_MINIMUM = '若仅编入小编制Marauder（1 Core）与Goliath（2 Elite）：起始3 Core已满足Marauder，但Elite缺口1，购买Factory（35瓦斯，+2 Elite）直接满足并留余量，成本最低';
const TEXT_FIELDS = ['title', 'when', 'procedure', 'alternatives', 'risk', 'reviseIf', 'unproven'];
export function createFactionKnownRulePolicyV1({ input, drills }) {
  verifySeal(input); verifySeal(drills.manifest);
  if (input.catalogueHash !== drills.manifest.catalogueHash || hash(input.sourceBinding) !== hash(drills.manifest.sourceBinding)) fail('FACTION_KNOWN_RULE_SOURCE_DRIFT');
  const findings = [], sourceFindings = [];
  if (input.factionRecordKey === 'tactical_cards:terran_armed_forces') {
    const card = name => input.factionEvidence.armyPool.find(p => p.source.recordKey === 'tactical_cards:' + name)?.source;
    const armory = card('armory'), factory = card('factory');
    if (!armory || !factory || armory.content.slots.Elite !== 1 || factory.content.slots.Elite !== 2
      || armory.content.cost >= factory.content.cost) fail('FACTION_KNOWN_RULE_FACT_DRIFT');
    const calibration = drills.verify({ id: 'faction-roster-choice.terran_gap_one', eligibleOptionIds: ['option-1', 'option-2', 'option-3'],
      minimumCostOptionIds: ['option-1'], minimumVespene: armory.content.cost });
    const proof = drills.proof().find(p => p.hash === calibration.kernelProofHash);
    if (!calibration.passed || !proof || proof.resolved.find(p => p.optionId === 'option-2')?.outcome.result?.vespeneSpent !== factory.content.cost) fail('FACTION_KNOWN_RULE_ORACLE_DISAGREES');
    for (const row of proof.sourceHashes) if (!input.frozenSources.manifest.sourceHashes.some(s => s.ref === row.ref && s.hash === row.hash)) fail('FACTION_KNOWN_RULE_PROOF_SOURCE_DRIFT');
    findings.push({ id: 'factory-is-not-minimum-for-one-elite-gap', badText: BAD_MINIMUM, badTextHash: hash(BAD_MINIMUM),
      calibration, proof, requiredSourceRefs: [armory.ref, factory.ref],
      replacement: '仅编入小编制Marauder（1 Core）与Goliath（2 Elite），且不另计其他单位/卡牌时，起始3 Core已满足Core需求，Elite仅缺1。'
        + '如果目标仅为满足槽位并最小化所列备选的瓦斯支出，Armory（' + armory.content.cost + '瓦斯，+1 Elite）比Factory（'
        + factory.content.cost + '瓦斯，+2 Elite）少花' + (factory.content.cost - armory.content.cost)
        + '瓦斯；Factory多提供一个剩余Elite槽位。此计算不评价两张卡的特殊能力，也不证明更便宜的选择实战更强。',
      correctionKind: 'deterministic_rendering_of_kernel_calibrated_fact_not_generated_strategy', trainingTruth: false });
    const observed = [
      ['marauder-core-gap-arithmetic', '若编入大编制Marauder（2 Core）或第二队Marauder：Core缺口1',
        '起始3 Core；仅一队大编制消耗2 Core、两队小编制合计2 Core，均不缺Core。必须按完整明确名单求和，不能凭“大编制/第二队”宣称缺1；修正本条依赖该前提的购买与改编建议。',
        ['source:tactical_cards:terran_armed_forces', 'source:army_units:marauder']],
      ['academy-second-reaction', '在Medic使用Life Support（1 CP）响应友方生物单位受伤害时声明Advanced Training，使费用降为0',
        'Life Support与Advanced Training本身都是Reaction；同一激活每玩家最多一个Reaction，不能在无明确例外时嵌套两次反应。保留Academy配合主动Medpack的合法情形，不把折扣条件推广到双反应链。',
        ['source:tactical_cards:academy', 'source:army_units:medic', 'core.H3Fn8YSvEvpJZpT57qw1.items.4']],
      ['orders-repeatable-active', 'Orders的REPEATABLE仅豁免每轮一次限制而非每激活一次',
        'Orders是Active而非Reaction。REPEATABLE允许同轮且同次激活多次使用，逐次满足费用/触发；FAQ59保留的是Reaction总数限制，不能误套到Orders。检查整条步骤、风险与reviseIf的一致性。',
        ['source:army_units:jim_raynor', 'core.FuahgilWtc8nccVSp2Vv.items.0.subItems.54', 'faq-v1:59']],
      ['orders-repeatable-revise-condition', 'Tactical Retreat或Orders已在本回合使用（每轮每单位一次限制）时，无法再次使用',
        '不能把一次/轮限制不加区分地套到REPEATABLE的主动Orders；逐个区分主动单位、支付、触发与卡牌状态。',
        ['source:army_units:jim_raynor', 'core.FuahgilWtc8nccVSp2Vv.items.0.subItems.54']],
      ['goliath-friendly-target', '若Goliath Engaged且目标为Engaged己方单位：Indomitable允许攻击',
        'Indomitable明确是Unengaged Enemy Units，不授权攻击Friendly Unit，也不是泛化的向任何已接战目标开火权限。不能以“可能误伤”补造规则。',
        ['source:army_units:goliath', 'core.iuUyObNTQ2M8xK4IUqzC.items.7.subItems.2']],
      ['goliath-target-lock-timing-range', '若目标在12-18英寸且需高命中：考虑先移动缩短距离或用Target Lock',
        'Target Lock是Movement Phase主动能力，选择12英寸内Enemy；不能把当下12–18英寸目标直接当成合法Target Lock目标。区分先前移动阶段已锁定、后来距离变化及当前尚未锁定，收益仍须评估。',
        ['source:army_units:goliath']],
    ];
    for (const [id, badText, reason, refs] of observed) {
      const sourceEvidence = refs.map(ref => {
        const source = input.frozenSources.prompt.sources.find(s => s.ref === ref);
        const binding = input.frozenSources.manifest.sourceHashes.find(s => s.ref === ref);
        if (!source || !binding) fail('FACTION_KNOWN_SOURCE_EVIDENCE_MISSING');
        return { sourceHash: binding.hash, source };
      });
      sourceFindings.push({ id, badText, badTextHash: hash(badText), reason, sourceRefs: refs, sourceEvidence,
        kind: 'independent_source_counterexample_requires_model_local_repair', trainingTruth: false });
    }
  }
  return seal({ version: 'faction_known_rule_policy_v1', inputHash: input.hash, sourceBinding: input.sourceBinding,
    drillManifestHash: drills.manifest.hash, findings, sourceFindings, canAffectRules: false, trainingTruth: false });
}
function inspect(input, policy, draft, findings = [...policy.findings, ...(policy.sourceFindings || [])]) {
  verifySeal(input); verifySeal(policy);
  if (policy.inputHash !== input.hash || hash(policy.sourceBinding) !== hash(input.sourceBinding)) fail('FACTION_KNOWN_RULE_POLICY_DRIFT');
  const hits = [];
  for (const [index, r] of draft.recommendations.entries()) for (const field of TEXT_FIELDS) {
    const values = Array.isArray(r[field]) ? r[field].map((value, n) => ({ path: field + '.' + n, value })) : [{ path: field, value: r[field] }];
    for (const { path, value } of values) for (const finding of findings) if (typeof value === 'string' && value.includes(finding.badText)) {
      hits.push({ index, path, value, finding });
    }
  }
  return hits;
}
export function assertNoKnownFactionRuleFailureV1({ input, policy, draft }) {
  const hits = inspect(input, policy, draft);
  if (hits.length) fail('FACTION_KNOWN_RULE_FAILURE', { findingIds: hits.map(h => h.finding.id) });
  return true;
}
export function correctKnownFactionRuleFailuresV1({ input, policy, draft }) {
  const hits = inspect(input, policy, draft, policy.findings), next = clone(draft), patches = [];
  for (const hit of hits) {
    const r = next.recommendations[hit.index], keys = hit.path.split('.');
    const value = hit.value.split(hit.finding.badText).join(hit.finding.replacement);
    if (keys.length === 2) r[keys[0]][Number(keys[1])] = value; else r[keys[0]] = value;
    const addedSourceRefs = hit.finding.requiredSourceRefs.filter(ref => !r.sourceRefs.includes(ref));
    if (r.sourceRefs.length + addedSourceRefs.length > 8) fail('FACTION_KNOWN_RULE_CITATION_CAPACITY');
    r.sourceRefs.push(...addedSourceRefs);
    patches.push({ index: hit.index, path: hit.path, oldText: hit.value, newText: value,
      findingId: hit.finding.id, kernelProofHash: hit.finding.proof.hash, addedSourceRefs });
  }
  if (inspect(input, policy, next, policy.findings).length) fail('FACTION_KNOWN_RULE_FAILURE');
  return seal({ policyHash: policy.hash, parentHash: hash(draft), resultHash: hash(next), draft: next, patches,
    allUnflaggedTextPreserved: true, rawProviderOutputModified: false,
    freshSourceReviewRequired: true, completeSemanticCorrectnessProven: false, trainingTruth: false });
}

export function mergeFactionKnownSourceIssuesV1({ input, policy, draft, issues }) {
  verifySeal(issues);
  if (issues.parentHash !== hash(draft)) fail('FACTION_KNOWN_SOURCE_ISSUE_PARENT_DRIFT');
  const { hash: ignored, ...body } = issues, next = clone(body), hits = inspect(input, policy, draft, policy.sourceFindings || []);
  for (const hit of hits) {
    let issue = next.issues.find(i => i.kind === 'recommendation_source_or_condition' && i.index === hit.index);
    if (!issue) { issue = { kind: 'recommendation_source_or_condition', index: hit.index, oldHash: hash(draft.recommendations[hit.index]), findings: [] }; next.issues.push(issue); }
    issue.findings.push({ kind: 'independent_source_counterexample', findingId: hit.finding.id, verdict: 'unsupported',
      path: hit.path, flaggedText: hit.value, flaggedTextHash: hash(hit.value), reason: hit.finding.reason,
      sourceRefs: hit.finding.sourceRefs, sourceEvidence: hit.finding.sourceEvidence });
  }
  next.openIssues = next.issues.length;
  return seal({ ...next, knownSourcePolicyHash: policy.hash, knownSourceFindings: hits.length, trainingTruth: false });
}
