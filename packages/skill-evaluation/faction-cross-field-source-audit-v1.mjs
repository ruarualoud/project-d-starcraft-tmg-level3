import { seal, verifySeal, hash, fail } from '../skill-production/common.mjs';

// A source-bound regression catalogue for independently inspected prose.
// This does not infer semantics from keywords or claim that absent exact text
// proves correctness. Keep duplicate occurrences as separate repair targets.
const OBSERVED = [
  { id: 'rocket-launcher-has-no-armoured-surge',
    text: '若敌方以Armoured为主，为Marine购买AGG-12（替换C-14，SPECIALIST限1模型）或Rocket Launcher（SIDEARM+SPECIALIST）以补充Armoured Surge，但会减少Light Surge输出',
    reason: 'AGG-12有Armoured Surge并替换C-14；Rocket Launcher无Surge且为新增SIDEARM，不可将两者都描述为增加Armoured Surge、减少C-14输出。区分各自收益和代价。',
    sourceRefs: ['source:army_units:marine', 'core.FuahgilWtc8nccVSp2Vv.items.0.subItems.58'] },
  { id: 'additional-sidearm-does-not-remove-c14',
    text: '若敌方以Armoured为主且Marine单位规模大（9模型），可购买Rocket Launcher（40矿物，SPECIALIST）让1模型保留C-14并额外获得RoA 4的INDIRECT FIRE输出，牺牲少量Light Surge换取对Armoured的稳定伤害',
    reason: '这项Rocket Launcher升级linkedTo为-且具SIDEARM，保留C-14并可额外射击；不能声称购买它本身牺牲Light Surge。矿物支出与其他编军机会成本可明确为策略权衡，不能虚构武器损失。',
    sourceRefs: ['source:army_units:marine', 'core.FuahgilWtc8nccVSp2Vv.items.0.subItems.58'] },
  { id: 'instant-prohibits-infantry-armor-reaction',
    text: '若敌方攻击带INSTANT或高伤害，考虑用Engineering Bay的Infantry Armor（反应）替代Life Support，但两者不能在同一敌方激活中同时使用',
    reason: 'INSTANT禁止敌方为该武器攻击声明或结算Reaction，Infantry Armor也是Reaction而非豁免；应区分普通高伤害攻击与INSTANT，不能以另一个Reaction规避INSTANT。',
    sourceRefs: ['core.FuahgilWtc8nccVSp2Vv.items.0.subItems.38', 'source:tactical_cards:engineering_bay'] },
];

export function inspectFactionCrossFieldSourceAuditV1({ input, draft }) {
  verifySeal(input);
  const byRef = new Map(input.frozenSources.prompt.sources.map(s => [s.ref, s]));
  const source = ref => { const s = byRef.get(ref); if (!s) fail('FACTION_CROSS_FIELD_SOURCE_MISSING'); return s; };
  const prose = ref => source(ref).passages.map(p => p.text).join('');
  const marine = JSON.parse(prose('source:army_units:marine'));
  const rocket = marine.upgrades.find(u => u.name === 'Rocket Launcher'), agg = marine.upgrades.find(u => u.name === 'AGG-12');
  const bay = JSON.parse(prose('source:tactical_cards:engineering_bay'));
  if (rocket?.linkedTo !== '-' || !rocket.description.includes('SURGE: -') || !rocket.description.includes('SIDEARM')
    || agg?.linkedTo !== 'C-14 Rifle' || !agg.description.includes('SURGE: Armoured (D3)')
    || !prose('core.FuahgilWtc8nccVSp2Vv.items.0.subItems.58').includes('ignoring the normal restriction of one weapon per model')
    || !prose('core.FuahgilWtc8nccVSp2Vv.items.0.subItems.38').includes('Enemy Units cannot declare or resolve Reaction abilities in response to attacks made with this weapon.')
    || !bay.boosts.find(b => b.name === 'Infantry Armor')?.description.includes('<Reaction>')) fail('FACTION_CROSS_FIELD_SOURCE_DRIFT');
  const findings = draft.recommendations.flatMap((r, index) => r.alternatives.flatMap((text, n) => OBSERVED
    .filter(o => text === o.text).map(o => ({ id: o.id, index, path: 'alternatives.' + n,
      title: r.title, recommendationHash: hash(r), text, textHash: hash(text), reason: o.reason,
      sourceRefs: o.sourceRefs, independentSourceCounterexample: true }))));
  const refs = [...new Set(findings.flatMap(f => f.sourceRefs))];
  return seal({ version: 'faction_cross_field_source_audit_v1', inputHash: input.hash, draftHash: hash(draft),
    sourceBinding: input.sourceBinding, findings, sourceEvidence: refs.map(ref => ({ source: source(ref), sourceHash: hash(source(ref)) })),
    knownSemanticDebtBlocksIndependentQualification: findings.length > 0,
    exactKnownCounterexamplesOnly: true, absenceProvesGeneralCorrectness: false,
    newProviderCalls: 0, trainingTruth: false });
}

export function assertNoFactionCrossFieldSourceDebtV1({ input, candidate }) {
  for (const section of candidate.sections) {
    const audit = inspectFactionCrossFieldSourceAuditV1({ input, draft: section.draft });
    if (audit.knownSemanticDebtBlocksIndependentQualification)
      fail('FACTION_CANDIDATE_CROSS_FIELD_SOURCE_DEBT', { auditHash: audit.hash });
  }
}
