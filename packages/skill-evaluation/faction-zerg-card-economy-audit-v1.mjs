import { seal, verifySeal, hash, fail } from '../skill-production/common.mjs';

const PURCHASE = 'core.u3zNStKpd5XegMjmJfMS.items.3';
const RESOURCES = 'core.H3Fn8YSvEvpJZpT57qw1.items.5.subItems.0';
const STATES = 'core.H3Fn8YSvEvpJZpT57qw1.items.5.subItems.1';
const FACTION = 'source:tactical_cards:zerg_swarm';
const purchaseAfter = '战前写军表时，若任务起始补给较低，应重新比较Hydralisk与低Supply单位的开局部署顺序，并在Army Building完成所选战术卡的购买。进入对局后军表已定；若当前可用补给不足2，可先部署已编入军表的Supply 1单位，延后已编入军表的Hydralisk部署，不能等补给增长再购买Hydralisk Den。';
const printedChoice = 'Rapid Burrowing与Brood Instinct是Zerg Swarm阵营卡自身的能力，使用其中一项需要耗尽这张Ready阵营卡；两者并非各有可由任意卡支付的1 BM费用。若预计稍后需要Brood Instinct，须权衡现在使用Rapid Burrowing的收益与保留该阵营卡Ready的价值；耗尽其他卡产生BM不能代替已耗尽阵营卡使用自身能力。';
const broodReady = '若预计对手将攻击需要闪避保护的高价值单位，考虑保留Zerg Swarm阵营卡本身Ready以使用Brood Instinct；若该卡已耗尽，其他Ready卡产生的BM不能使Brood Instinct重新可用，须等待适用的Refresh。';

// These are independently adjudicated, actual observed assertions. They are
// not a keyword classifier, a model's self-reported waiver or a general proof.
// Complete field matching also preserves quoted/negated counterexamples.
const rows = [
  ['pregame-purchase-not-round-supply-action', [PURCHASE],
    '若任务卡起始补给较低（如Skirmish的3-4），Hydralisk（Supply 2）可能无法在第1回合部署，考虑先部署Supply 1单位并推迟Hydralisk Den购买', purchaseAfter],
  ['pregame-purchase-not-round-supply-action', [PURCHASE],
    '若第1回合补给池较低（如Skirmish的3-4），Hydralisk（Supply 2）可能挤占其他部署，考虑先部署Supply 1单位并推迟Hydralisk Den购买。', purchaseAfter],
  ['pregame-purchase-not-round-supply-action', [PURCHASE],
    '若任务卡起始补给较低（如Skirmish的3-4），Hydralisk可能无法在第1回合部署，考虑先部署Supply 1单位并推迟Hydralisk Den购买', purchaseAfter],
  ['printed-card-ability-not-portable-bm-cost', [FACTION, STATES, RESOURCES],
    'Zerg Swarm军队需支付单位能力费用（如Rapid Burrowing 1 BM、Brood Instinct 1 BM）',
    'Zerg Swarm军队需支付单位卡上实际列明的BM费用，或需在使用阵营卡自身能力与耗尽它支付别处能力之间取舍；Rapid Burrowing与Brood Instinct没有可由任意卡代付的1 BM费用。'],
  ['printed-card-ability-not-portable-bm-cost', [FACTION, STATES, RESOURCES],
    '评估当前战局：若单位能力（如Rapid Burrowing使关键单位获得Burrowed保护）对当回合至关重要，优先确保有足够Ready卡可耗尽产生BM。',
    '评估当前战局并先区分使用方式：支付单位卡实际列明的BM费用，需要保留足够的合格Ready资源卡；使用Rapid Burrowing则需要Zerg Swarm阵营卡本身Ready，并满足其Movement Phase及目标条件，不能耗尽另一张卡代替。'],
  ['no-biomass-prestock-across-abilities', [RESOURCES, STATES],
    '若当回合无需使用任何战术卡能力，可耗尽多张卡产生BM，为多次单位能力支付做准备；但注意每张卡仅产生1 BM（Spawning Pool (Six Pool)产生2 BM），耗尽后本回合不可用。',
    '若当回合无需使用某些卡牌的自身能力，可把这些卡保留为Ready，计划在各次能力实际支付时分别耗尽，并按卡面资源值匹配当前这一次费用；不要提前耗尽来储存BM。超过本次费用的资源立即丢失，不能保留或转用于另一次能力。'],
  ['printed-card-ability-not-portable-bm-cost', [FACTION, STATES, RESOURCES],
    '若BM需求超过可用Ready卡数量，优先支付对当回合影响最大的能力（如保护高价值单位的Rapid Burrowing），放弃次要能力（如Brood Instinct的+1闪避修正）。', printedChoice],
  ['printed-card-ability-not-portable-bm-cost', [FACTION, STATES, RESOURCES],
    '若对手在突击阶段集中火力攻击高价值单位，需保留Brood Instinct（+1闪避修正）的支付能力，避免耗尽所有Ready卡', broodReady],
  ['printed-card-ability-not-portable-bm-cost', [FACTION, STATES, RESOURCES],
    '已选择 Zerg Swarm 阵营卡，且该卡在当回合被耗尽以支付能力费用（如 Rapid Burrowing 的 1 BM）',
    '已选择Zerg Swarm阵营卡，且该卡已为自身能力或为别处实际列明的BM费用而耗尽；例如使用Rapid Burrowing耗尽的是这张卡本身，不是支付卡面另列的1 BM费用。'],
  ['printed-card-ability-not-portable-bm-cost', [FACTION, STATES, RESOURCES],
    '计划在同一回合内再次支付需要 BM 的能力（如 Brood Instinct 的 1 BM）',
    '计划在同一回合内支付另一项实际列明BM费用的能力，或需要判断Brood Instinct是否仍可用；必须分别检查资源卡与Zerg Swarm阵营卡本身的Ready状态。'],
  ['printed-card-ability-not-portable-bm-cost', [FACTION, STATES, RESOURCES],
    '若回合内 BM 需求超过可用 Ready 卡数量，优先支付对当回合影响最大的能力（如保护高价值单位的 Rapid Burrowing），放弃次要能力（如 Brood Instinct 的 +1 闪避修正）。', printedChoice],
  ['printed-card-ability-not-portable-bm-cost', [FACTION, STATES, RESOURCES],
    '若未预留足够的 Ready 战术卡，后续 BM 能力（如 Brood Instinct）可能因无法支付费用而无法使用，导致关键防御或输出机会丧失；耗尽过多卡牌也可能使重要战术卡能力在当回合不可用。',
    '未预留足够合格Ready资源卡，会使后续实际列明BM费用的能力无法支付；另一个独立风险是Zerg Swarm阵营卡已耗尽后，Brood Instinct无法使用，即使还有其他Ready卡也不能代付恢复。耗尽卡牌前应分别比较这两种机会成本。'],
  ['printed-card-ability-not-portable-bm-cost', [FACTION, STATES, RESOURCES],
    '若对手在突击阶段集中火力攻击高价值单位，需保留 Brood Instinct（+1 闪避修正）的支付能力，避免耗尽所有 Ready 卡', broodReady],
].map(([id, refs, before, after], ordinal) => Object.freeze({ ordinal, id, refs, before, after }));

export const FACTION_ZERG_CARD_ECONOMY_BINDING_V1 = seal({ version: 'faction_zerg_card_economy_v1',
  observations: rows.map(r => ({ id: r.id, ordinal: r.ordinal, refs: r.refs, beforeHash: hash(r.before), afterHash: hash(r.after) })),
  scope: 'exact_observed_assertions_across_all_advice_fields',
  originalPaidArtifactsPreserved: true, freshWholeSectionReviewRequired: true,
  semanticAcceptanceInherited: false, absenceProvesGeneralCorrectness: false, canAffectRules: false, trainingTruth: false });

function calibrate(input) {
  const byRef = new Map(input.frozenSources.prompt.sources.map(s => [s.ref, s]));
  const source = ref => { const row = byRef.get(ref); if (!row) fail('FACTION_ZERG_CARD_SOURCE_MISSING'); return row; };
  const prose = ref => source(ref).passages.map(p => p.text).join('');
  const quoteChecks = [
    [PURCHASE, 'Tactical Cards are purchased with Vespene Gas during Army Building (Part 9.1.4).'],
    [RESOURCES, 'If a card generates more resources than are needed to pay for a cost, any excess resources are lost.'],
    [RESOURCES, 'Resources generated to activate one ability can not be saved or spent on another ability.'],
    [STATES, 'the player Exhausts it to use a Active or Reaction Special Ability printed directly on the card'],
    [STATES, 'the player Exhausts it to generate its Resource in order to pay for an ability located elsewhere'],
    [STATES, 'its abilities cannot be used until it is Refreshed'],
  ];
  if (quoteChecks.some(([ref, quote]) => !prose(ref).includes(quote))) fail('FACTION_ZERG_CARD_SOURCE_DRIFT');
  const card = JSON.parse(prose(FACTION));
  if (card.isFactionCard !== true || card.resource !== 1
    || card.boosts.find(b => b.name === 'Rapid Burrowing')?.description !== 'Rapid Burrowing <Active> <Movement Phase>: Select one Friendly, Unengaged Ground Zerg Unit on the battlefield. That Unit gains the Burrowed Status, even if it has already been Activated this Round.'
    || card.boosts.find(b => b.name === 'Brood Instinct')?.description !== 'Brood Instinct <Reaction> <Any Phase>: Use before a Friendly Unit makes an Evade Roll. Apply a +1 Modifier to that roll.')
    fail('FACTION_ZERG_CARD_SOURCE_DRIFT');
  return [PURCHASE, RESOURCES, STATES, FACTION].map(ref => ({ source: source(ref), sourceHash: hash(source(ref)),
    quotes: quoteChecks.filter(([r]) => r === ref).map(([, quote]) => ({ quote, quoteHash: hash(quote) })) }));
}

export function inspectFactionZergCardEconomyDebtV1({ input, draft }) {
  verifySeal(input);
  const scoped = input.factionRecordKey === 'tactical_cards:zerg_swarm';
  const sourceEvidence = scoped ? calibrate(input) : [], findings = [];
  if (scoped) for (const [index, advice] of draft.recommendations.entries()) {
    for (const key of ['title', 'when', 'procedure', 'alternatives', 'risk', 'reviseIf', 'unproven']) {
      const fields = Array.isArray(advice[key]) ? advice[key].map((text, n) => ({ text, path: key + '.' + n }))
        : [{ text: advice[key], path: key }];
      for (const field of fields) for (const row of rows) if (field.text === row.before) {
        findings.push({ id: row.id, observationOrdinal: row.ordinal, index, path: field.path, text: field.text,
          textHash: hash(field.text), recommendationHash: hash(advice), sourceRefs: row.refs,
          independentSourceCounterexample: true });
      }
    }
  }
  return seal({ version: 'faction_zerg_card_economy_audit_v1', inputHash: input.hash, draftHash: hash(draft),
    bindingHash: FACTION_ZERG_CARD_ECONOMY_BINDING_V1.hash, sourceBinding: input.sourceBinding, sourceEvidence, findings,
    knownSemanticDebtBlocksIndependentQualification: findings.length > 0, absenceProvesGeneralCorrectness: false,
    newProviderCalls: 0, sourceRefreshPerformed: false, trainingTruth: false });
}

export function assertNoFactionZergCardEconomyDebtV1({ input, candidate }) {
  for (const section of candidate.sections) {
    const audit = inspectFactionZergCardEconomyDebtV1({ input, draft: section.draft });
    if (audit.findings.length) fail('FACTION_CANDIDATE_ZERG_CARD_ECONOMY_DEBT', { auditHash: audit.hash });
  }
}

export function proposeFactionZergCardEconomyCorrectionV1({ input, draft }) {
  const audit = inspectFactionZergCardEconomyDebtV1({ input, draft });
  if (!audit.findings.length) fail('FACTION_ZERG_CARD_CORRECTION_NO_TARGET');
  const proposedDraft = structuredClone(draft), changes = [];
  for (const finding of audit.findings) {
    const row = rows[finding.observationOrdinal], [key, n] = finding.path.split('.');
    if (n === undefined) proposedDraft.recommendations[finding.index][key] = row.after;
    else proposedDraft.recommendations[finding.index][key][Number(n)] = row.after;
    changes.push({ index: finding.index, path: finding.path, beforeHash: finding.textHash,
      afterHash: hash(row.after), observationOrdinal: row.ordinal, sourceRefs: row.refs });
  }
  return seal({ version: 'faction_zerg_card_economy_correction_proposal_v1', bindingHash: FACTION_ZERG_CARD_ECONOMY_BINDING_V1.hash,
    inputHash: input.hash, audit, parentDraftHash: hash(draft), proposedDraftHash: hash(proposedDraft), proposedDraft, changes,
    allUnflaggedFieldsPreserved: true, originalProviderOutputOverwritten: false,
    productionApplied: false, freshWholeSectionReviewRequired: true, semanticAcceptanceInherited: false,
    independentEvaluationPassed: false, runtimeAccepted: false, canAffectRules: false, trainingTruth: false });
}
