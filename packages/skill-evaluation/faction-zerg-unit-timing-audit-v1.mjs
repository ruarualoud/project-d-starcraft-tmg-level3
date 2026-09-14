import { seal, verifySeal, hash, fail } from '../skill-production/common.mjs';

const RAPTOR = 'source:army_units:raptor__zergling_';
const CORPSER = 'source:army_units:corpser__roach_';
const CONTROL = 'core.iuUyObNTQ2M8xK4IUqzC.items.9.subItems.0';
const observations = [
  ['supply-threshold-inclusive', [RAPTOR],
    '若对手依赖远程火力清除标记驻守单位：Hydralisk 的 2 模型易被消灭，Raptor 的 12 模型可承受更多伤亡并维持 Supply 1 更久，但需注意模型数降至 6 以下时 Supply 降为 0。',
    '模型数降至 6 以下时 Supply 降为 0', '模型数降至 6 或以下时 Supply 降为 0（1–6 模型为 Supply 0，7–12 模型为 Supply 1）'],
  ['zero-supply-not-ineligibility', [CONTROL],
    'Hydralisk 仅 2 模型，若被敌方远程火力（如 Roach 的 Acid Saliva）消灭，会损失 Supply 2 的标记控制力并释放补给。Raptor 虽模型多但 HP 1、Armour 6+，面对模板武器或范围伤害时可能快速减员，Supply 降至 0 后失去争夺资格。购买 Hydralisk Den 或 Lair 消耗 35 瓦斯，可能挤占其他战术卡预算。',
    'Supply 降至 0 后失去争夺资格', 'Supply 降至 0 后对争夺总和的贡献为 0，但不能仅据此判定失去争夺资格；满足标记争夺条件且没有敌方单位争夺时，Supply 0 单位仍可控制标记'],
  ['equal-total-not-control-transfer', [CONTROL],
    '若对手以高 Supply 单位（如 Supply 2 的 Hydralisk）驻守关键标记：Raptor 的 Supply 1 无法在单点胜出，应优先部署 Hydralisk 或联合多个低 Supply 单位（如两个 Supply 1 单位）以总和压制。',
    '应优先部署 Hydralisk 或联合多个低 Supply 单位（如两个 Supply 1 单位）以总和压制',
    '可比较已编入军表单位的部署与集结方案，但双方合格争夺单位须按当前 Supply 求和；若敌方总和为 2，我方两个 Supply 1 单位合计也是 2，只会形成平局，控制权不变，不能据此夺走敌方已控制的标记；转移控制权须在适用计分时机使我方总和严格高于敌方'],
  ['regeneration-assault-phase-premise', [CORPSER],
    '已确认 Corpser 的 Burrow（主动，2 BM，若未接战则获得/失去 Burrowed 状态）与 Regeneration（被动，激活时若 Burrowed 则 HEAL 2）能力。',
    'Regeneration（被动，激活时若 Burrowed 则 HEAL 2）',
    'Regeneration（被动，Assault Phase 中该单位变为 Activated 时，若已有 Burrowed 状态则 HEAL 2）'],
  ['regeneration-not-movement-burrow-heal', [CORPSER],
    '3. 若 Corpser 面临远程火力威胁，在移动阶段激活 Burrow（主动，2 BM）获得 Burrowed 状态（Size 视为 0、可对每次攻击闪避），并在激活时触发 Regeneration（HEAL 2）；注意 Burrowed 单位不能争夺标记。',
    '在移动阶段激活 Burrow（主动，2 BM）获得 Burrowed 状态（Size 视为 0、可对每次攻击闪避），并在激活时触发 Regeneration（HEAL 2）',
    '在移动阶段、该单位未接战且满足主动能力使用条件时，可支付 2 BM 使用 Burrow 获得 Burrowed 状态（Size 视为 0、可对每次攻击闪避）；这不在移动阶段立即触发 Regeneration。Regeneration 是 Assault Phase 的被动能力，仅当该阶段该单位变为 Activated 时已具有 Burrowed 状态，才结算 HEAL 2'],
].map(([id, refs, before, from, to], ordinal) => {
  if (before.split(from).length !== 2) fail('FACTION_ZERG_UNIT_OBSERVATION_INVALID');
  return Object.freeze({ ordinal, id, refs, before, after: before.replace(from, to) });
});

export const FACTION_ZERG_UNIT_TIMING_BINDING_V1 = seal({ version: 'faction_zerg_unit_timing_v1',
  observations: observations.map(r => ({ ordinal: r.ordinal, id: r.id, refs: r.refs,
    beforeHash: hash(r.before), afterHash: hash(r.after) })),
  scope: 'exact_observed_fields_not_universal_semantic_classifier',
  hostAuthoredFactCorrection: true, fullDraftRetained: true,
  applyBeforeReview: true, consumesRevision: true, oldPaidArtifactsPreserved: true,
  freshWholeSectionReviewRequired: true, semanticAcceptanceInherited: false,
  absenceProvesGeneralCorrectness: false, runtimeAccepted: false, canAffectRules: false, trainingTruth: false });

function calibrate(input) {
  const sources = new Map(input.frozenSources.prompt.sources.map(s => [s.ref, s]));
  const source = ref => { const s = sources.get(ref); if (!s) fail('FACTION_ZERG_UNIT_SOURCE_MISSING'); return s; };
  const prose = ref => source(ref).passages.map(p => p.text).join('');
  const quotes = [
    'Each player sums the Current Supply Value of all their contesting Units.',
    'The player with the higher total Controls the Marker.',
    'A tie means the Marker is Contested - control does not change.',
    'A Unit at Supply 0 may still Control a Marker if no Enemy Units contest it.',
  ];
  if (quotes.some(q => !prose(CONTROL).includes(q))) fail('FACTION_ZERG_UNIT_SOURCE_DRIFT');
  const raptor = JSON.parse(prose(RAPTOR)), corpser = JSON.parse(prose(CORPSER));
  if (hash(raptor.squadProfile) !== hash([
    { modelCount: '1 - 6', supply: 0, tier: 1 }, { modelCount: '7 - 12', supply: 1, tier: 2 },
    { modelCount: '13 - 18', supply: 2, tier: 3 }])) fail('FACTION_ZERG_UNIT_SOURCE_DRIFT');
  const regen = corpser.upgrades.find(u => u.name === 'Regeneration');
  const burrow = corpser.upgrades.find(u => u.name === 'Burrow');
  if (regen?.activation !== '<Passive>' || regen.phase !== 'Assault Phase'
    || regen.description !== 'When this Unit becomes Activated, if it has the Burrowed Status, resolve the HEAL (2) effect.'
    || burrow?.activation !== '<Active>\n(2 Biomass)'
    || burrow.description !== 'If this Unit is Unengaged, it gains or loses the Burrowed Status.')
    fail('FACTION_ZERG_UNIT_SOURCE_DRIFT');
  return [RAPTOR, CORPSER, CONTROL].map(ref => ({ source: source(ref), sourceHash: hash(source(ref)),
    quotes: ref === CONTROL ? quotes : [] }));
}

export function inspectFactionZergUnitTimingDebtV1({ input, draft }) {
  verifySeal(input);
  const scoped = input.factionRecordKey === 'tactical_cards:zerg_swarm';
  const sourceEvidence = scoped ? calibrate(input) : [], findings = [];
  if (scoped) for (const [index, advice] of draft.recommendations.entries()) {
    for (const key of ['title', 'when', 'procedure', 'alternatives', 'risk', 'reviseIf', 'unproven']) {
      const fields = Array.isArray(advice[key]) ? advice[key].map((text, n) => ({ text, path: key + '.' + n }))
        : [{ text: advice[key], path: key }];
      for (const field of fields) for (const row of observations) if (field.text === row.before)
        findings.push({ id: row.id, observationOrdinal: row.ordinal, index, path: field.path, text: field.text,
          textHash: hash(field.text), recommendationHash: hash(advice), sourceRefs: row.refs,
          independentSourceCounterexample: true });
    }
  }
  return seal({ version: 'faction_zerg_unit_timing_audit_v1', bindingHash: FACTION_ZERG_UNIT_TIMING_BINDING_V1.hash,
    inputHash: input.hash, draftHash: hash(draft), sourceBinding: input.sourceBinding, sourceEvidence, findings,
    knownSemanticDebtBlocksIndependentQualification: findings.length > 0,
    absenceProvesGeneralCorrectness: false, sourceRefreshPerformed: false, trainingTruth: false });
}

export function proposeFactionZergUnitTimingCorrectionV1({ input, draft, binding }) {
  if (verifySeal(binding).hash !== FACTION_ZERG_UNIT_TIMING_BINDING_V1.hash) fail('FACTION_ZERG_UNIT_BINDING_INVALID');
  const audit = inspectFactionZergUnitTimingDebtV1({ input, draft });
  if (!audit.findings.length) return null;
  const proposedDraft = structuredClone(draft), changes = [];
  for (const f of audit.findings) {
    const row = observations[f.observationOrdinal], [key, n] = f.path.split('.');
    if (n === undefined) proposedDraft.recommendations[f.index][key] = row.after;
    else proposedDraft.recommendations[f.index][key][Number(n)] = row.after;
    changes.push({ index: f.index, path: f.path, beforeHash: f.textHash, afterHash: hash(row.after), sourceRefs: row.refs });
  }
  return seal({ version: 'faction_zerg_unit_timing_correction_v1', bindingHash: binding.hash,
    inputHash: input.hash, parentDraftHash: hash(draft), proposedDraftHash: hash(proposedDraft), proposedDraft,
    audit, changes, hostAuthoredFactCorrection: true, allUnflaggedFieldsPreserved: true,
    originalProviderOutputOverwritten: false, productionApplied: false,
    freshWholeSectionReviewRequired: true, semanticAcceptanceInherited: false,
    independentEvaluationPassed: false, runtimeAccepted: false, canAffectRules: false, trainingTruth: false });
}

export function assertNoFactionZergUnitTimingDebtV1({ input, candidate }) {
  for (const s of candidate.sections) if (inspectFactionZergUnitTimingDebtV1({ input, draft: s.draft }).findings.length)
    fail('FACTION_CANDIDATE_ZERG_UNIT_TIMING_DEBT');
}
