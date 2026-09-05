import { readFile } from 'node:fs/promises';
import { evaluateOfficialFaqF3RuleV1 as f3 } from '../rule-atoms/official-faq-f3-movement-battlefield-deployment-kernel-v1.mjs';
import { evaluateOfficialFaqF4RuleV1 as f4 } from '../rule-atoms/official-faq-f4-ability-tactical-keyword-kernel-v1.mjs';
import { evaluateOfficialFaqF5RuleV1 as f5 } from '../rule-atoms/official-faq-f5-attack-scoring-template-kernel-v1.mjs';
import { seal, verifySeal, hash, sha256, clone, exact, fail } from '../skill-production/common.mjs';

// Never supplied to the old-case feedback/teaching/guide-generation stage.
// New numeric/card combinations, plus explicit labelled identity metamorphic
// controls. The binary enemy-link space was already exhausted by the old16
// cases, so relabelling those16 cannot honestly create new held-out cases.
export async function createIndependentConditionDrillsV1({ catalogue, originalDrills, legacyDrills }) {
  verifySeal(catalogue); const cases = [];
  function add(group, entryId, input, question, field, expected, novelty = 'new_numeric_or_resource_input') {
    cases.push(seal({ id: 'independent-condition.' + group + '.' + (cases.filter(c => c.group === group).length + 1),
      group, entryId, input, question, field, expected, novelty }));
  }
  for (const modelSize of [2, 4]) for (const gapWidth of [0.75, 1.25, 3.25]) add('clearance', 'faq-v1:06',
    { modelSize, gapWidth, gapBoundaryKinds: ['terrain', 'model'] },
    'Size是规则等级，gapWidth为英寸；仅判断Gap Clearance，不推断落点容纳或完整路径。是否满足净空？',
    'legal', gapWidth >= (modelSize <= 2 ? 1 : 3));
  for (const direction of ['towards', 'away']) for (const attemptedDistance of [0, 2, 4, 6]) add('direct_move', 'faq-v1:11',
    { direction, attemptedDistance, maxLegalDistance: 4 },
    '本次移动要求directly towards/away，最大合法距离已经完整确定。尝试距离是否满足这项强制距离要求？',
    'legal', attemptedDistance === 4);
  for (const baseTargetNumber of [3, 5]) for (const modifier of [-4, -1, 1, 4]) add('target_number', 'faq-v1:29',
    { baseTargetNumber, modifier }, '给定目标数加上修正并应用上下限，最终目标数是多少？不把目标数当成自动成功。',
    'values.targetNumber', Math.max(2, Math.min(6, baseTargetNumber + modifier)));
  for (const variant of ['enough', 'insufficient', 'unready', 'wrong_resource']) {
    const secondValue = variant === 'insufficient' ? 1 : 2;
    add('payment', 'faq-v1:34', { requiredResourceType: 'cp', requiredAmount: 3,
      cards: [{ cardId: 'fresh-a', resourceType: 'cp', value: 1, ready: true },
        { cardId: 'fresh-b', resourceType: variant === 'wrong_resource' ? 'bm' : 'cp', value: secondValue, ready: variant !== 'unready' }],
      selectedCardIds: ['fresh-a', 'fresh-b'] },
    '只判断所选卡的资源类型、Ready状态及合计支付数量，是否能支付给定费用？', 'legal', variant === 'enough');
  }
  for (const same of [true, false]) for (const explicitSelfExclusion of [true, false]) add('self_range', 'faq-v1:35',
    { sourceUnitId: 'independent-source', subjectUnitId: same ? 'independent-source' : 'independent-other', explicitSelfExclusion },
    '仅判断自身默认纳入范围这条规则是否使subject属于source的范围；没有给出其他单位实际距离，不推断整项能力合法性。',
    'values.withinRange', same && !explicitSelfExclusion, 'identity_metamorphic_control_not_new_rule_family');
  const oldCases = [...originalDrills.groups().flatMap(g => originalDrills.list(g)),
    ...legacyDrills.manifest.chapters.flatMap(g => legacyDrills.list(g))];
  const oldInputs = new Set(oldCases.map(c => hash({ entryId: c.entryId, input: c.input })));
  if (cases.some(c => oldInputs.has(hash({ entryId: c.entryId, input: c.input }))) || new Set(cases.map(c => hash({ entryId: c.entryId, input: c.input }))).size !== cases.length) fail('INDEPENDENT_CONDITION_INPUT_REUSED');
  const names = ['official-faq-f3-movement-battlefield-deployment-kernel-v1.mjs',
    'official-faq-f4-ability-tactical-keyword-kernel-v1.mjs', 'official-faq-f5-attack-scoring-template-kernel-v1.mjs'];
  const kernelHashes = await Promise.all(names.map(async name => ({ name, hash: sha256(await readFile(new URL('../rule-atoms/' + name, import.meta.url))) })));
  function execute(c) {
    const source = catalogue.rows.find(r => r.id === c.entryId);
    if (!source?.executable || source.currentRulesReceiptHash !== catalogue.sourceBinding.rules) fail('INDEPENDENT_CONDITION_SOURCE_UNAVAILABLE');
    const kernel = ['faq-v1:34', 'faq-v1:35'].includes(c.entryId) ? f4 : c.entryId === 'faq-v1:29' ? f5 : f3;
    const observed = kernel(c.entryId, clone(c.input)), repeated = kernel(c.entryId, clone(c.input));
    const actual = c.field.split('.').reduce((v, k) => v?.[k], observed);
    if (actual !== c.expected || hash(observed) !== hash(repeated)) fail('INDEPENDENT_CONDITION_ORACLE_DISAGREES');
    return seal({ caseHash: c.hash, sourceHash: source.hash, inputHash: hash(c.input), kernelHashes, observed,
      expected: c.expected, actual, passed: true, roomReplayPerformed: false, trainingTruth: false });
  }
  const receipts = cases.map(execute);
  return Object.freeze({ manifest: seal({ version: 'independent-condition-drills-v1', catalogueHash: catalogue.hash,
    sourceBinding: catalogue.sourceBinding, kernelHashes, cases: cases.length, caseHashes: cases.map(c => c.hash),
    groups: [...new Set(cases.map(c => c.group))], numericResourceCases: 26, identityMetamorphicCases: 4,
    originalDrillsHash: originalDrills.manifest.hash, legacyDrillsHash: legacyDrills.manifest.hash,
    excludedFromOldCaseFeedbackAndGuideGeneration: true, exhaustedEnemyLinkBinarySpaceNotRelabelled: true,
    scope: 'independent_inputs_within_known_families_not_whole_game_or_strategy_proof', trainingTruth: false }),
  groups: () => [...new Set(cases.map(c => c.group))],
  list: group => cases.filter(c => c.group === group).map(({ id, entryId, input, question }) => ({ id, entryId, input: clone(input), question })),
  verify(prediction) {
    exact(prediction, ['id', 'answer']); const c = cases.find(c => c.id === prediction.id);
    if (!c || typeof prediction.answer !== typeof c.expected) fail('INDEPENDENT_CONDITION_PREDICTION_INVALID');
    return seal({ id: c.id, prediction, kernelReceipt: execute(c), passed: prediction.answer === c.expected, trainingTruth: false });
  }, proof: () => receipts });
}
