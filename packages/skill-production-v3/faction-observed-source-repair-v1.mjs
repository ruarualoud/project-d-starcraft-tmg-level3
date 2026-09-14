import { seal, verifySeal, hash, fail } from '../skill-production/common.mjs';

export const FACTION_OBSERVED_SOURCE_REPAIR_BINDING_V1 = seal({ version: 'faction_observed_source_repair_v1',
  originalAnswersHash: '9d2ddf4ed9918f97d80725045abbc7d0dac80880393e58ce1c3909a82455ede7',
  originalQuestionsHash: 'b4d2351db7ad86edb513e9d3306c3bfbd473d6805299575cc0403e3164fae96c',
  originalJudgeHash: '45584af9fe07057fc72b811d36d2eca6c50adf6f7df8a08d4efb7811df7eabe5',
  scope: 'exact_observed_source_fact_clauses_not_arbitrary_strategy_rewriting',
  changedAnswerIndices: [0, 2, 5], freshWholeAnswerJudgeRequired: true,
  uniqueCardCorrection: 'exact_observed_clause_then_fresh_whole_section_review',
  originalPaidArtifactsPreserved: true, fullSourcesPreserved: true,
  semanticAcceptanceInherited: false, canAffectRules: false, trainingTruth: false });

const edits = [
  [0, '要部署Hydralisk，必须购买Hydralisk Den（35瓦斯，+2 Elite）或Lair（35瓦斯，+1 Elite/+1 Core）。',
    '仅比较起始Elite缺口1时，Hydralisk Den（35瓦斯，+2 Elite）、Lair（35瓦斯，+1 Elite/+1 Core）或Overlord（35瓦斯，+1 Elite/+1 Core/+1 Hero）均能补足所述槽位；不能将所列任一张推荐成必选。'],
  [2, '若仅需Elite槽，Lair更便宜且不占Unique名额。',
    '若仅比较补充1 Elite，Lair与Overlord均花35瓦斯，并非Lair更便宜。两者均为Unique，每一种卡各限一份，不存在由此推出的跨卡共享Unique名额；卡牌能力仍须另作条件策略比较。'],
  [5, '仅购买Overlord（35瓦斯，+1 Hero/+1 Elite/+1 Core）不够，因为',
    '仅购买Overlord（35瓦斯，+1 Hero/+1 Elite/+1 Core）在所述槽位上已足够：'],
  [5, '因此需同时购买Overlord和Lair（共70瓦斯）才能同时部署Kerrigan和Hydralisk并保留1 Elite余量。',
    '若额外要求保留1 Elite余量，所述Overlord加Lair组合共70瓦斯可提供该余量；原题仅要求容纳Kerrigan与小编制Hydralisk，不要求备用Elite，不能据此将Lair变成必选。'],
  [5, '若放弃Kerrigan，仅购买Lair（35瓦斯）即可部署Hydralisk并保留1 Elite余量，更节省瓦斯。',
    '若放弃Kerrigan，仅比较小编制Hydralisk的槽位，Lair或Overlord均花35瓦斯、剩余0 Elite；两者相对70瓦斯组合均少花35，不能称Lair比Overlord更便宜。'],
];
const uniqueRefs = ['core.Rj6sMyNODPQ8OHUc9Clp.items.1.subItems.4', 'core.u3zNStKpd5XegMjmJfMS.items.3'];

export function correctObservedFactionReasonerSourceFactsV1({ input, section, questions, answers, judge, facts, binding }) {
  [input, facts, binding].forEach(verifySeal);
  if (binding.hash !== FACTION_OBSERVED_SOURCE_REPAIR_BINDING_V1.hash || facts.inputHash !== input.hash
    || hash(facts.sourceBinding) !== hash(input.sourceBinding) || facts.developmentOnly !== true || facts.heldoutEvidence !== false)
    fail('FACTION_OBSERVED_SOURCE_REPAIR_BINDING_INVALID');
  if (input.factionRecordKey !== 'tactical_cards:zerg_swarm' || section.axis !== 'army_resources') return null;
  const found = edits.filter(([index, before]) => answers.answers.find(a => a.index === index)?.answer.includes(before));
  if (!found.length) return null;
  if (hash(answers) !== binding.originalAnswersHash || hash(questions) !== binding.originalQuestionsHash
    || hash(judge) !== binding.originalJudgeHash || found.length !== edits.length)
    fail('FACTION_OBSERVED_SOURCE_REPAIR_NEEDS_NEW_ADJUDICATION');
  const fact = id => facts.cases.find(c => c.id === id)?.outcome;
  for (const [id, gas, elite] of [['hydra_lair', 35, 0], ['hydra_overlord', 35, 0], ['hydra_den', 35, 1],
    ['hero_hydra_overlord', 35, 0], ['hero_hydra_both', 70, 1]]) {
    const row = fact(id);
    if (!row?.eligibleWithinDeclaredChecks || row.budget.vespeneSpent !== gas || row.slots.unusedArmySlots.Elite !== elite
      || row.budget.armySlotAuditResultHash !== row.slots.resultHash) fail('FACTION_OBSERVED_SOURCE_REPAIR_FACT_DRIFT');
  }
  if (fact('hero_hydra_lair')?.rejectionCode !== 'ARMY_SLOT_CAPACITY_EXCEEDED'
    || fact('duplicate_overlord')?.rejectionCode !== 'UNIQUE_CARD_SINGLE_COPY_LIMIT')
    fail('FACTION_OBSERVED_SOURCE_REPAIR_FACT_DRIFT');
  for (const id of ['lair', 'overlord']) {
    const source = input.factionEvidence.armyPool.find(p => p.source.recordKey === 'tactical_cards:' + id)?.source;
    if (source?.content.cost !== 35 || source.content.isUnique !== true || source.content.slots.Elite !== 1)
      fail('FACTION_OBSERVED_SOURCE_REPAIR_FACT_DRIFT');
  }
  const uniqueSource = input.frozenSources.prompt.sources.find(s => s.ref === uniqueRefs[1]);
  const quote = 'Unique Marking: If present, only one copy of this card may be included in an army.';
  if (!uniqueSource?.passages.some(p => p.text.includes(quote))) fail('FACTION_OBSERVED_SOURCE_REPAIR_UNIQUE_SOURCE_DRIFT');
  const corrected = structuredClone(answers), changes = [];
  for (const [index, before, after] of edits) {
    const answer = corrected.answers.find(a => a.index === index);
    if (answer.answer.split(before).length !== 2) fail('FACTION_OBSERVED_SOURCE_REPAIR_TARGET_NOT_UNIQUE');
    answer.answer = answer.answer.replace(before, after);
    changes.push({ index, field: 'answer', before, after, beforeHash: hash(before), afterHash: hash(after) });
  }
  for (const [index, ref] of [[0, 'source:tactical_cards:overlord'], [5, 'source:tactical_cards:zerg_swarm']]) {
    const answer = corrected.answers.find(a => a.index === index);
    if (!input.frozenSources.prompt.sources.some(s => s.ref === ref)) fail('FACTION_OBSERVED_SOURCE_REPAIR_SOURCE_MISSING');
    if (!answer.sourceRefs.includes(ref)) {
      if (answer.sourceRefs.length === 8) fail('FACTION_OBSERVED_SOURCE_REPAIR_CITATION_CAPACITY');
      answer.sourceRefs.push(ref); changes.push({ index, field: 'sourceRefs', added: ref });
    }
  }
  if (corrected.answers.some(a => a.answer.length > 1600)) fail('FACTION_OBSERVED_SOURCE_REPAIR_OUTPUT_TOO_LONG');
  const verifiedFacts = facts.cases.map(c => ({ id: c.id, unitKeys: c.unitKeys, cardKeys: c.cardKeys, proofHash: c.hash,
    eligibleWithinDeclaredChecks: c.outcome.eligibleWithinDeclaredChecks,
    ...(c.outcome.eligibleWithinDeclaredChecks ? { gas: c.outcome.budget.vespeneSpent,
      availableSlots: c.outcome.slots.availableArmySlots, usedSlots: c.outcome.slots.usedArmySlots,
      unusedSlots: c.outcome.slots.unusedArmySlots } : { rejectionCode: c.outcome.rejectionCode }) }));
  return seal({ version: 'faction_observed_source_fact_correction_v1', bindingHash: binding.hash, inputHash: input.hash,
    sectionId: section.id, originalQuestionsHash: hash(questions), originalAnswersHash: hash(answers),
    originalJudgeHash: hash(judge), factsProofHash: facts.hash, correctedAnswers: corrected, changes, verifiedFacts,
    uniqueSource: { ref: uniqueRefs[1], quote, sourceHash: hash(uniqueSource) },
    allUnflaggedTextPreserved: true, originalPaidArtifactsOverwritten: false,
    freshWholeAnswerJudgeRequired: true, completeSemanticCorrectnessProven: false,
    strategyEffectivenessProven: false, trainingTruth: false });
}
