import { readFile } from 'node:fs/promises';
import { evaluateOfficialFaqF3RuleV1 as f3 } from '../rule-atoms/official-faq-f3-movement-battlefield-deployment-kernel-v1.mjs';
import { evaluateOfficialFaqF4RuleV1 as f4 } from '../rule-atoms/official-faq-f4-ability-tactical-keyword-kernel-v1.mjs';
import { evaluateOfficialFaqF5RuleV1 as f5 } from '../rule-atoms/official-faq-f5-attack-scoring-template-kernel-v1.mjs';
import { seal, verifySeal, hash, sha256, clone, exact, fail } from '../skill-production/common.mjs';

export async function createProductionDrills(catalogue) {
  verifySeal(catalogue);
  const cases = [];
  function add(group, entryId, input, question, field, expected) {
    cases.push(seal({ id: 'production-heldout.' + group + '.' + (cases.filter(c => c.group === group).length + 1),
      group, entryId, input, question, field, expected }));
  }
  // Source-reviewed independent test expectations, not values obtained from
  // the kernel under test. Far enough from float EPSILON to test game rules.
  for (const modelSize of [1, 2, 3, 4, 5]) for (const gapWidth of [0.875, 1, 1.125, 2.875, 3, 3.125]) {
    add('clearance', 'faq-v1:06', { modelSize, gapWidth, gapBoundaryKinds: ['terrain', 'model'] },
      'modelSize 是规则中的 Size 等级，不是底座直径；gapWidth 单位为英寸。是否满足 Gap Clearance 这一项？不判断落点底座容纳、碰撞或整条路径是否合法。',
      'legal', gapWidth >= (modelSize <= 2 ? 1 : 3));
  }
  for (const linkCrossesEnemy of [false, true]) for (const enemyCurrentlyEngaged of [false, true])
    for (const landingOpen of [false, true]) for (const landingCoherent of [false, true]) {
      add('enemy_link', 'faq-v1:07', { linkCrossesEnemy, enemyCurrentlyEngaged, landingOpen, landingCoherent },
        '仅考虑敌方连线穿越、当前接战及落点开放/连贯条件，这次穿越和放置是否满足要求？', 'legal',
        (!linkCrossesEnemy || enemyCurrentlyEngaged) && landingOpen && landingCoherent);
    }
  for (const direction of ['towards', 'away']) for (const attemptedDistance of [1.5, 2.5, 3.5]) {
    add('direct_move', 'faq-v1:11', { direction, attemptedDistance, maxLegalDistance: 2.5 },
      '限定为必须 directly towards/away 的移动；主机已完整确定最大合法距离。给定尝试距离是否满足这个移动距离要求？',
      'legal', attemptedDistance === 2.5);
  }
  for (const baseTargetNumber of [2, 4, 6]) for (const modifier of [-3, 0, 3]) {
    add('target_number', 'faq-v1:29', { baseTargetNumber, modifier },
      '加上给定修正并应用目标数上下限后，检定目标数是多少？这不意味着自动成功。',
      'values.targetNumber', Math.max(2, Math.min(6, baseTargetNumber + modifier)));
  }
  for (const ready of [false, true]) for (const resourceType of ['cp', 'bm']) for (const value of [1, 3]) {
    add('payment', 'faq-v1:34', { requiredResourceType: 'cp', requiredAmount: 2,
      cards: [{ cardId: 'alpha-pay', resourceType, value, ready }], selectedCardIds: ['alpha-pay'] },
      '只考虑资源类型、数量和卡牌 Ready 状态，本次所选支付能否完成费用？',
      'legal', ready && resourceType === 'cp' && value >= 2);
  }
  const kernelNames = ['official-faq-f3-movement-battlefield-deployment-kernel-v1.mjs',
    'official-faq-f4-ability-tactical-keyword-kernel-v1.mjs', 'official-faq-f5-attack-scoring-template-kernel-v1.mjs'];
  const kernelHashes = await Promise.all(kernelNames.map(async name => ({ name,
    hash: sha256(await readFile(new URL('../rule-atoms/' + name, import.meta.url))) })));
  function execute(test) {
    const source = catalogue.rows.find(r => r.id === test.entryId);
    if (!source?.executable || source.currentRulesReceiptHash !== catalogue.sourceBinding.rules) fail('PRODUCTION_DRILL_SOURCE_UNAVAILABLE');
    const n = Number(test.entryId.split(':')[1]), kernel = n >= 5 && n <= 27 ? f3 : n >= 34 && n <= 59 ? f4 : f5;
    const observed = kernel(test.entryId, clone(test.input)), repeated = kernel(test.entryId, clone(test.input));
    const actual = test.field.split('.').reduce((v, k) => v?.[k], observed);
    if (actual !== test.expected || hash(observed) !== hash(repeated)) fail('PRODUCTION_DRILL_ORACLE_DISAGREES');
    return seal({ id: test.id, caseHash: test.hash, sourceHash: source.hash, kernelHashes, inputHash: hash(test.input),
      observed, expected: test.expected, actual, passed: true, roomReplayPerformed: false, trainingTruth: false });
  }
  const receipts = cases.map(execute);
  if (new Set(cases.map(c => hash({ entryId: c.entryId, input: c.input }))).size !== cases.length) fail('PRODUCTION_DRILL_DUPLICATE');
  return Object.freeze({
    manifest: seal({ version: 'production-drills-v1', catalogueHash: catalogue.hash, sourceBinding: catalogue.sourceBinding,
      kernelHashes, caseHashes: cases.map(c => c.hash), cases: cases.length,
      groups: [...new Set(cases.map(c => c.group))], fixedBeforeNewGeneration: true,
      scope: 'five_mechanism_families_not_full_game_or_strategy_effectiveness', trainingTruth: false }),
    groups: () => [...new Set(cases.map(c => c.group))],
    list: group => cases.filter(c => c.group === group).map(({ id, entryId, input, question }) => ({ id, entryId, input: clone(input), question })),
    verify(prediction) {
      exact(prediction, ['id', 'answer']);
      const test = cases.find(c => c.id === prediction.id);
      if (!test || typeof prediction.answer !== typeof test.expected) fail('PRODUCTION_DRILL_PREDICTION_INVALID');
      const receipt = execute(test);
      return seal({ id: test.id, prediction, kernelReceipt: receipt, passed: prediction.answer === test.expected,
        trainingTruth: false });
    },
    proof: () => receipts,
  });
}
