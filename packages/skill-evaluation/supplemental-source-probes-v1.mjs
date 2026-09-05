import { seal, verifySeal, hash, fail } from '../skill-production/common.mjs';
import { resolveSpan } from '../skill-production/spans.mjs';

// Added after reviewing early packets: development/known-risk controls, NOT
// newly unseen held-out tests. Each oracle is bound to a complete source span.
const movement = 'core.iuUyObNTQ2M8xK4IUqzC.items.5.subItems.2';
const reserves = 'core.iuUyObNTQ2M8xK4IUqzC.items.5.subItems.4';
const cases = [
  { id: 'boundary.flying.endpoint', group: 'comprehension', expected: false,
    question: '飞行单位路径曾经过距敌方飞行模型底座0.5英寸的位置，但终点距全部敌方飞行单位至少1英寸，终点摆放另已确认合法。只检查敌方飞行单位的1英寸限制，必须拒绝这条路径吗？不要把这一项判断扩展为全动作合法性。',
    ref: movement, spanId: 'p4', anchor: 'must end its movement at least 1' },
  { id: 'boundary.movement.ground-through-flying', group: 'comprehension', expected: true,
    question: '地面领队模型执行标准移动，途中穿过一个飞行模型的底座但不在那里结束，其他条件另已检查。仅因途经飞行模型底座，规则是否允许穿过？只回答这个穿越许可，不判定整个行动。',
    ref: movement, spanId: 'p1', anchor: 'Ground models may pass through a Flying model’s base as if it were not there' },
  { id: 'boundary.movement.base-point', group: 'literal', expected: true,
    question: '完整Skill是否明确说明：领队底座的任何部分移动都不能超过单位Speed，而不只是核对底座中心的移动距离？只检查实际文字，不能用游戏常识替它补齐。',
    ref: movement, spanId: 'p2', anchor: 'No part of a base of the Leading Model can move more than its unit Speed value' },
  { id: 'boundary.reserves.effect-clock', group: 'literal', expected: true,
    question: '完整Skill是否明确说明：返回预备队的单位保留仍有效的限时增益/减益或任务效果，但效果的计时不暂停，原本在Cleanup到期的仍在那里到期？只检查实际文字，不替遗漏补写。',
    ref: reserves, spanId: 'p2', anchor: 'the clock does not pause just because the Unit has left' },
  { id: 'boundary.reserves.no-second-activation', group: 'comprehension', expected: false,
    question: '某单位已在当前阶段激活，随后被送回预备队；没有额外能力许可。仅凭返回预备队，能否在同一阶段再次激活它？',
    ref: reserves, spanId: 'p3', anchor: 'it will remain Activated and will not be able to take further action within the current Phase' },
  { id: 'boundary.scoring.sticky-tie', group: 'comprehension', expected: true,
    question: 'A已控制任务标记。本次控制核对双方合格争夺单位的Supply总值相等且均大于0，没有任务卡特别覆盖。A是否继续控制该标记，而非因平局自动失去控制？',
    ref: 'core.FuahgilWtc8nccVSp2Vv.items.0.subItems.44', spanId: 'p1', anchor: 'A tied result never transfers control' },
  { id: 'boundary.indirect.hidden-casualty', group: 'comprehension', expected: true,
    question: '间接火力攻击的目标单位有至少一个模型可见、另有模型不可见。在伤害和其他伤亡条件满足时，是否允许移除不可见模型作为伤亡？只检查可见性这一限制。',
    ref: 'faq-v1:56', spanId: 'p1', anchor: 'non-visiblemodelscan still be removed as casualties' },
  { id: 'boundary.indirect.partial-visible-evade', group: 'comprehension', expected: false,
    question: '同样的间接火力攻击中，目标单位至少一个模型可见。它是否仅因其他模型不可见，就获得专门授予视线外目标的Evade掷骰？不讨论其他独立能力授予的Evade。',
    ref: 'faq-v1:56', spanId: 'p1', anchor: 'does not qualify for the Evade roll granted to out-of-sight targets' },
];

export function createSupplementalSourceProbesV1({ catalogue, reader }) {
  verifySeal(catalogue);
  if (reader.catalogueHash !== catalogue.hash) fail('SUPPLEMENTAL_SOURCE_READER_DRIFT');
  const evidence = cases.map(c => {
    const source = resolveSpan(reader, { ref: c.ref, spanId: c.spanId });
    if (!source.quote.includes(c.anchor)) fail('SUPPLEMENTAL_SOURCE_ANCHOR_DRIFT');
    return { caseId: c.id, anchor: c.anchor, source };
  });
  return seal({ schema: 'starcraft_supplemental_source_probes_v1', catalogueHash: catalogue.hash,
    sourceBinding: catalogue.sourceBinding,
    cases: cases.map(({ id, group, question, expected }) => ({ id, group, question, expected, type: 'boolean' })),
    evidence, authoring: 'source_bound_known_risk_controls_after_early_packet_inspection',
    knownErrorRegressionNotFreshHeldout: true, replacesExistingFourteenOr105CaseExam: false,
    scope: 'literal_completeness_and_bounded_comprehension_not_whole_action_or_strategy_proof',
    expectedAnswersMustNotReachModel: true, trainingTruth: false });
}

export function verifySupplementalSourceProbesV1(probes, dependencies) {
  verifySeal(probes);
  if (hash(probes) !== hash(createSupplementalSourceProbesV1(dependencies))) fail('SUPPLEMENTAL_SOURCE_PROBES_DRIFT');
  return probes;
}
