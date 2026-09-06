import { seal, verifySeal, hash, fail } from '../skill-production/common.mjs';

// Independently observed counterexamples, not a general natural-language
// correctness detector. Keep the exact bad fields and original source facts;
// paraphrase absence or model consensus cannot prove whole-Skill quality.
const OBSERVED = [
  { id: 'haywire_is_ground_not_flying', field: 'alternatives', text: '若敌方以Flying为主，优先Hellfire Missiles并考虑Haywire Missiles（PIERCE Armoured 3）替换',
    sourceRefs: ['source:army_units:goliath'], reason: 'Haywire Missiles替换Hellfire后TARGET为Ground，不能作为对Flying目标的替换建议。' },
  { id: 'orders_cannot_target_mechanical_goliath', field: 'procedure', text: '1 CP选项——忽略Disengage惩罚：使该单位本回合忽略Disengage惩罚，下一Assault Phase可正常Ranged Attack或Charge；适用于需脱离Engagement的高价值单位（如Goliath）',
    sourceRefs: ['source:army_units:jim_raynor', 'source:army_units:goliath'], reason: 'Orders要求另一友方Biological单位；Goliath标签为Armoured、Mechanical、Ground，不满足Biological。' },
  { id: 'medic_named_reactions_not_shared_round_limit', field: 'procedure', text: '若友方单位被施加DEBUFF，可用Restoration（反应，1 CP）移除4英寸内友方单位的全部DEBUFF，但注意与Life Support共享每轮一次反应限制',
    sourceRefs: ['source:army_units:medic', 'core.H3Fn8YSvEvpJZpT57qw1.items.4'], reason: '每轮一次限制针对每单位每个具名Reaction，Restoration与Life Support不同名；共享的是每玩家每次激活仅一个Reaction。' },
];
export function inspectFactionUnitRoleDebtV1({ input, draft }) {
  verifySeal(input);
  const byRef = new Map(input.frozenSources.prompt.sources.map(s => [s.ref, s]));
  const source = ref => { const s = byRef.get(ref); if (!s) fail('FACTION_UNIT_DEBT_SOURCE_MISSING'); return s; };
  const product = ref => JSON.parse(source(ref).passages.map(p => p.text).join(''));
  const goliath = product('source:army_units:goliath'), raynor = product('source:army_units:jim_raynor'), medic = product('source:army_units:medic');
  const haywire = goliath.upgrades.find(u => u.name === 'Haywire Missiles'), orders = raynor.upgrades.find(u => u.name === 'Orders');
  const reactions = source('core.H3Fn8YSvEvpJZpT57qw1.items.4').passages.map(p => p.text).join('\n');
  if (haywire?.linkedTo !== 'Hellfire Missiles' || !haywire.description.includes('TARGET: Ground')
    || goliath.tags !== 'Armoured, Mechanical, Ground' || !orders?.description.includes('Select another Friendly Biological Unit Within 8"')
    || !['Restoration', 'Life Support'].every(name => medic.upgrades.find(u => u.name === name)?.activation.includes('<Reaction>'))
    || !reactions.includes('A specific Unit may use a named Reaction Ability only once per Game Round.')
    || !reactions.includes('Each player may resolve only one Reaction per each Activation.')) fail('FACTION_UNIT_DEBT_SOURCE_DRIFT');
  const findings = draft.recommendations.flatMap((r, index) => OBSERVED.flatMap(observation =>
    r[observation.field].flatMap((text, n) => text === observation.text ? [{ id: observation.id, index,
      path: observation.field + '.' + n, title: r.title, recommendationHash: hash(r), text, textHash: hash(text),
      reason: observation.reason, sourceRefs: observation.sourceRefs, independentSourceCounterexample: true }] : [])));
  const refs = [...new Set(findings.flatMap(f => f.sourceRefs))];
  return seal({ version: 'faction_unit_role_semantic_debt_v1', inputHash: input.hash, draftHash: hash(draft),
    sourceBinding: input.sourceBinding, findings, sourceEvidence: refs.map(ref => ({ source: source(ref), sourceHash: hash(source(ref)) })),
    knownSemanticDebtBlocksIndependentQualification: findings.length > 0,
    exactKnownCounterexamplesOnly: true, absenceProvesGeneralCorrectness: false,
    newProviderCalls: 0, trainingTruth: false });
}
