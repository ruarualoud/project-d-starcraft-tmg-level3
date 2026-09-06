import { seal, verifySeal, hash, fail } from '../skill-production/common.mjs';

const ACTIVE = 'core.H3Fn8YSvEvpJZpT57qw1.items.2';
const CARDS = 'core.H3Fn8YSvEvpJZpT57qw1.items.5';
const STATES = CARDS + '.subItems.1';
const PASS = 'core.iuUyObNTQ2M8xK4IUqzC.items.2.subItems.0';
const NON_LETHAL = 'core.FuahgilWtc8nccVSp2Vv.items.0.subItems.47';
const FACTION = 'source:tactical_cards:terran_armed_forces';
const observations = [
  { id: 'tenacity-still-requires-active-unit', refs: [FACTION, ACTIVE, CARDS], texts: [
    "确认Terran Tenacity为阵营卡主动能力，文本为'Once per Game. Immediately claim the First Player Marker. No other player may claim the First Player Marker for the remainder of this Phase.'；来源未要求由当前被激活单位使用，也未说明消耗一次单位激活",
    "确认Terran Tenacity为阵营卡主动能力：文本为'Once per Game. Immediately claim the First Player Marker. No other player may claim the First Player Marker for the remainder of this Phase.'，来源未规定须由当前被激活单位使用或消耗一次单位激活",
  ], reason: '10.5明确阵营卡能力同样遵守10.1–10.4；10.2明确Active须由当前激活单位在行动前或完全结算后立即使用。Tenacity没有免除这个前提。不能因卡面没有重复通用规则就声称来源没有要求；须区分需要已有激活窗口与额外消耗一次激活。' },
  { id: 'tenacity-not-a-post-pass-active-exception', refs: [FACTION, ACTIVE, CARDS, STATES, PASS], texts: [
    '己方已Pass后：Pass后本阶段不能再激活单位，但来源未规定Tenacity须由激活单位使用或受Pass限制；若规则允许卡牌能力在Pass后使用，仍可考虑，需与对手确认',
    '若己方已Pass：Pass后本阶段不能再激活单位，但来源未规定Tenacity受Pass限制；此情形下能否使用需提交规则/裁判处理',
    '每局仅一次，若过早使用而对手后续回合更需先手（如关键Charge或标记争夺轮），可能浪费；来源未说明使用Tenacity是否消耗单位激活或受Pass限制，实际成本需按规则服务确认',
    "每局仅一次，若过早使用而对手后续回合更需先手（如关键Charge或标记争夺轮），可能浪费；来源未规定使用成本，但若需激活单位则有机会成本；'夺回'已Pass者标记及Pass后使用均属未验证情形，需规则/裁判裁决",
  ], reason: 'Passing替代激活且之后本阶段不能再激活；Tenacity仍需10.2的当前激活窗口，不能把己方Pass后是否能用列成来源未说明的自由裁决。卡牌自身使用会按10.5.2耗尽。对手已Pass与己方已Pass不同；本反例不替代先手标记其他交互的独立核对。' },
  { id: 'non-lethal-does-not-immediately-remove-casualties', refs: [NON_LETHAL], texts: [
    'Stimpack造成NON-LETHAL DAMAGE (2)，若单位已累积伤害可能使Total Damage达到模型HP触发伤亡移除；BUFF Speed为关键词不叠加，若已有其他BUFF Speed来源仅取最高值；消耗1 CP与Barracks卡，可能影响后续能力支付',
    'Stimpack造成NON-LETHAL DAMAGE (2)，若单位已累积伤害可能使Total Damage达到模型HP触发伤亡移除；消耗1 CP，可能影响后续能力支付；单位受非致命伤害后更易被后续攻击摧毁',
  ], reason: 'NON-LETHAL DAMAGE只累加Damage Marker，达到或超过HP也不立即移除模型；只有随后发生标准伤害才正常合并结算伤亡。应把风险写成提高后续普通伤害的致死风险，不能与同条procedure的不立即移除相冲突。BUFF数值关键词不叠加本身是正确通用规则，不应随此错误一起删除。' },
  { id: 'orders-cannot-target-the-goliath', refs: ['source:army_units:jim_raynor', 'source:army_units:goliath'],
    targetTitle: 'Tactical Retreat下Goliath的Disengage与Tactical Mass判定', texts: [
      'Jim Raynor在8英寸内且已激活时：可用Orders的1 CP选项（忽略Disengage惩罚）替代Tactical Retreat，保留阵营卡',
    ], reason: '这里的受益对象是Goliath；其标签为Armoured/Mechanical/Ground而非Biological。Orders只可选择另一友方Biological单位，不能作为给Goliath免除Disengage惩罚的替代方案。' },
  { id: 'stimpack-speed-ten-is-single-survivor-only', refs: ['source:army_units:marine', 'source:army_units:marauder',
    'core.u3zNStKpd5XegMjmJfMS.items.1', 'core.FuahgilWtc8nccVSp2Vv.items.0.subItems.6'], texts: [
    '执行标准Move：单次Move内Leading Model底座任何部分不能移动超过当前Speed值（Stimpack后为10英寸）；Go! Go! Go!为一次额外Move，其2英寸位移是否同样受Speed上限约束来源未明确，需按实际对局判定',
  ], reason: '该建议when包括满编/接近满编。4/7的第二个Speed值仅限始终单模型或只剩1模型；不能无条件写成Stimpack后10英寸。应区分多模型4+3=7与单模型7+3=10，并分别处理额外2英寸Move，不把单次Move上限当作所有独立移动的总和上限。' },
];

// Exact observed counterexamples, not a paraphrase classifier or proof that
// the remaining prose is correct. This audit adds no automatic reviewer waiver.
export function inspectFactionPhaseSourceDebtV1({ input, draft }) {
  verifySeal(input);
  const byRef = new Map(input.frozenSources.prompt.sources.map(source => [source.ref, source]));
  const source = ref => { const row = byRef.get(ref); if (!row) fail('FACTION_PHASE_SOURCE_MISSING'); return row; };
  const prose = ref => source(ref).passages.map(row => row.text).join('');
  const product = ref => JSON.parse(prose(ref));
  const faction = product(FACTION), raynor = product('source:army_units:jim_raynor'), goliath = product('source:army_units:goliath');
  if (!faction.isFactionCard || !faction.boosts.find(row => row.name === 'Terran Tenacity')?.description.includes('<Active> <Movement Phase>')
    || !prose(CARDS).includes('any Special Abilities that are resolved using the standard rules described in Parts 10.1 through 10.4.')
    || !prose(ACTIVE).includes('A Unit may only use an Active Ability when it is currently Activated.')
    || !prose(PASS).includes('may Pass instead of activating a Unit.')
    || !prose(PASS).includes('Once a player Passes, they cannot activate any further Units this Phase.')
    || !prose(STATES).includes('Every Tactical Card and Faction Card')
    || !prose(STATES).includes('the player Exhausts it to use a Active or Reaction Special Ability printed directly on the card')
    || !prose(NON_LETHAL).includes('Do not remove any models, even if Total Damage exceeds a model’s HP.')
    || !prose(NON_LETHAL).includes('If the Unit subsequently suffers standard Damage, the combined Total Damage triggers casualty removal normally.')
    || !raynor.upgrades.find(row => row.name === 'Orders')?.description.includes('Select another Friendly Biological Unit Within 8"')
    || goliath.tags !== 'Armoured, Mechanical, Ground'
    || product('source:army_units:marine').stats.speed !== '4/7' || product('source:army_units:marauder').stats.speed !== '4/7'
    || !prose('core.u3zNStKpd5XegMjmJfMS.items.1').includes('Use the second value only when the Unit is reduced to a single remaining model, or when the Unit started with a single model.')
    || !prose('core.FuahgilWtc8nccVSp2Vv.items.0.subItems.6').includes('Value characteristic (e.g. Speed, RoA): increase the value by X.'))
    fail('FACTION_PHASE_SOURCE_CALIBRATION_DRIFT');
  const findings = [];
  for (const [index, recommendation] of draft.recommendations.entries()) {
    for (const field of ['when', 'procedure', 'alternatives', 'risk', 'reviseIf', 'unproven']) {
      const values = Array.isArray(recommendation[field]) ? recommendation[field].map((text, n) => ({ text, path: field + '.' + n }))
        : [{ text: recommendation[field], path: field }];
      for (const { text, path } of values) for (const row of observations) {
        if (!row.texts.includes(text) || row.targetTitle && row.targetTitle !== recommendation.title) continue;
        findings.push({ id: row.id, index, path, title: recommendation.title, text, textHash: hash(text),
          recommendationHash: hash(recommendation), reason: row.reason, sourceRefs: row.refs, independentSourceCounterexample: true });
      }
    }
  }
  const refs = [...new Set(findings.flatMap(row => row.sourceRefs))];
  return seal({ version: 'faction_phase_source_debt_v1', inputHash: input.hash, draftHash: hash(draft), sourceBinding: input.sourceBinding,
    findings, sourceEvidence: refs.map(ref => ({ source: source(ref), sourceHash: hash(source(ref)) })),
    knownSemanticDebtBlocksIndependentQualification: findings.length > 0, exactKnownCounterexamplesOnly: true,
    absenceProvesGeneralCorrectness: false, modelReviewAcceptanceOverriddenByKnownDebt: findings.length > 0,
    automaticReviewerWaiver: false, newProviderCalls: 0, trainingTruth: false });
}

export function assertNoFactionPhaseSourceDebtV1({ input, candidate }) {
  for (const section of candidate.sections) {
    const audit = inspectFactionPhaseSourceDebtV1({ input, draft: section.draft });
    if (audit.knownSemanticDebtBlocksIndependentQualification) fail('FACTION_CANDIDATE_PHASE_SOURCE_DEBT', { auditHash: audit.hash });
  }
}
