import { readFile } from 'node:fs/promises';
import { createOfficialArmyResourceBudgetDataBundleV1 } from '../source-data/official-army-resource-budget-data-bundle-v1.mjs';
import { resolveOfficialArmyResourceBudgetV1 } from '../rule-atoms/official-army-resource-budget-rules-kernel-v1.mjs';
import { seal, verifySeal, hash, sha256, clone, exact, fail } from '../skill-production/common.mjs';

// Bounded decision exercises: choose the cheapest provided card package that
// passes faction/slot/Unique/resource checks. Ignore other card effects only
// because that objective is explicit, NOT because cheapest is strongest play.
export async function createFactionRosterChoiceDrillsV1({ catalogue, dataset }) {
  verifySeal(catalogue);
  const bundle = createOfficialArmyResourceBudgetDataBundleV1({ dataset });
  if (bundle.normalizedDatasetHash !== catalogue.sourceBinding.dataset || bundle.sourceLockHash !== catalogue.sourceBinding.core) fail('FACTION_CHOICE_SOURCE_DRIFT');
  const definitions = [
    ['terran_gap_one', 'terran_armed_forces', [['marauder', 'small'], ['goliath', 'small']], [[], ['armory'], ['factory'], ['barracks__tech_lab_']], [1, 2, 3], [1], 30, 'known_observed_draft_cost_error_control'],
    ['terran_gap_three', 'terran_armed_forces', [['goliath', 'small'], ['goliath', 'small']], [['armory'], ['factory'], ['factory', 'armory'], ['factory', 'factory']], [2, 3], [2], 65, 'independent_input'],
    ['terran_hero', 'terran_armed_forces', [['jim_raynor', 'small']], [['factory'], ['supply_depot'], ['armory'], ['supply_depot', 'factory']], [1, 3], [1], 40, 'independent_input'],
    ['terran_support', 'terran_armed_forces', [['medic', 'small'], ['medic', 'small']], [['armory'], ['academy'], ['dropship']], [1, 2], [1], 35, 'independent_input'],
    ['zerg_gap_one', 'zerg_swarm', [['hydralisk', 'small']], [['hatchery'], ['lair'], ['hydralisk_den'], ['overlord']], [1, 2, 3], [1, 2, 3], 35, 'independent_input'],
    ['zerg_gap_three', 'zerg_swarm', [['hydralisk', 'large'], ['raptor__zergling_', 'small']], [['hydralisk_den'], ['hydralisk_den', 'lair'], ['hydralisk_den', 'overlord'], ['hydralisk_den', 'hydralisk_den']], [1, 2, 3], [1, 2, 3], 70, 'independent_input'],
    ['zerg_support', 'zerg_swarm', [['queen', 'small'], ['queen', 'small']], [['hydralisk_den'], ['overseer'], ['hatchery']], [1, 2], [1], 25, 'independent_input'],
    ['zerg_hero', 'zerg_swarm', [['kerrigan', 'small']], [['lair'], ['overlord'], ['hydralisk_den'], ['overlord', 'hatchery']], [1, 3], [1], 35, 'independent_input'],
  ];
  const cases = [], receipts = [];
  const eligibility = bundle.factionArmyEligibilityDataBundle;
  const reference = (profile, extra) => ({ ...extra, recordKey: profile.recordKey, sourceRecordHash: profile.sourceRecordHash, payloadHash: profile.payloadHash });
  for (const [name, faction, units, options, legalIndices, bestIndices, minimumVespene, novelty] of definitions) {
    const factionKey = 'tactical_cards:' + faction;
    const factionProfile = eligibility.factionProfiles.find(p => p.recordKey === factionKey);
    if (!factionProfile) fail('FACTION_CHOICE_PROFILE_MISSING');
    const input = { factionRecordKey: factionKey, scaleId: 'Standard', mineralBudget: 2000,
      unitInstances: units.map(([id, compositionKind], n) => ({ unitInstanceId: 'unit-' + n, recordKey: 'army_units:' + id, compositionKind })),
      upgradeInstances: [], options: options.map((cards, n) => ({ id: 'option-' + n, tacticalCardKeys: cards.map(id => 'tactical_cards:' + id) })),
      objective: '仅比较给定备选：满足阵营标签、编军槽位、Unique与资源预算后，最小化所购战术卡瓦斯。暂不评价卡牌能力、任务得分、部署、升级或胜率；并列最省的备选都应保留。' };
    const sourceRefs = [...new Set(['source:' + factionKey, ...input.unitInstances.map(u => 'source:' + u.recordKey),
      ...input.options.flatMap(o => o.tacticalCardKeys.map(k => 'source:' + k))])];
    const sourceHashes = sourceRefs.map(ref => {
      const row = catalogue.rows.find(r => r.id === ref);
      if (!row || row.quarantined || row.currentRulesReceiptHash !== catalogue.sourceBinding.rules) fail('FACTION_CHOICE_SOURCE_UNAVAILABLE');
      return { ref, hash: row.hash };
    });
    const resolved = input.options.map(option => {
      const request = { procedureKind: 'army_resource_budget', sideKey: 'evaluation-player', armyResourceBudgetDataBundle: bundle,
        scaleId: input.scaleId, mineralBudget: input.mineralBudget,
        factionCard: reference(factionProfile, { cardInstanceId: 'faction-card', profileHash: factionProfile.profileHash }),
        tacticalCardInstances: option.tacticalCardKeys.map((key, n) => {
          const p = bundle.tacticalBudgetProfiles.find(p => p.recordKey === key);
          return reference(p, { cardInstanceId: 'card-' + n, budgetProfileHash: p.budgetProfileHash });
        }),
        unitInstances: input.unitInstances.map(u => {
          const p = bundle.unitCompositionBudgetProfiles.find(p => p.recordKey === u.recordKey && p.compositionKind === u.compositionKind);
          const candidate = eligibility.armyCandidateProfiles.find(p => p.recordKey === u.recordKey);
          return reference(p, { ...u, budgetProfileId: p.budgetProfileId, budgetProfileHash: p.budgetProfileHash, candidateProfileHash: candidate.profileHash });
        }), upgradeInstances: [], armyPurchaseSetComplete: true, rulesOwnedResourceArithmeticRequested: true,
        unspentResourceDisposition: 'lost', resourceConversionRequested: false };
      let outcome;
      try { outcome = { eligibleWithinDeclaredChecks: true, result: resolveOfficialArmyResourceBudgetV1(request) }; }
      catch (error) {
        if (!String(error.message).startsWith('ARMY_SLOT_CAPACITY_EXCEEDED:')) throw error;
        outcome = { eligibleWithinDeclaredChecks: false, rejectionCode: String(error.message).split(':')[0] };
      }
      return seal({ optionId: option.id, requestHash: hash(request), outcome, completeGameLegalityProven: false, trainingTruth: false });
    });
    const actualLegal = resolved.flatMap((r, n) => r.outcome.eligibleWithinDeclaredChecks ? [n] : []);
    const actualMinimum = Math.min(...resolved.filter(r => r.outcome.eligibleWithinDeclaredChecks).map(r => r.outcome.result.vespeneSpent));
    const actualBest = resolved.flatMap((r, n) => r.outcome.eligibleWithinDeclaredChecks && r.outcome.result.vespeneSpent === actualMinimum ? [n] : []);
    if (hash(actualLegal) !== hash(legalIndices) || hash(actualBest) !== hash(bestIndices) || actualMinimum !== minimumVespene) fail('FACTION_CHOICE_ORACLE_DISAGREES');
    const item = seal({ id: 'faction-roster-choice.' + name, factionRecordKey: factionKey, input, sourceHashes, novelty,
      expected: { eligibleOptionIds: legalIndices.map(n => 'option-' + n), minimumCostOptionIds: bestIndices.map(n => 'option-' + n), minimumVespene } });
    cases.push(item); receipts.push(seal({ caseHash: item.hash, resolved, sourceHashes, trainingTruth: false }));
  }
  const files = ['../rule-atoms/official-army-resource-budget-rules-kernel-v1.mjs', '../rule-atoms/official-faction-army-eligibility-rules-kernel-v1.mjs'];
  const kernelHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(new URL(file, import.meta.url))) })));
  return Object.freeze({
    manifest: seal({ version: 'faction_roster_choice_drills_v1', catalogueHash: catalogue.hash, sourceBinding: catalogue.sourceBinding,
      kernelHashes, caseHashes: cases.map(c => c.hash), cases: cases.length, options: receipts.reduce((n, r) => n + r.resolved.length, 0),
      diagnosticCases: 1, independentInputs: 7, suppliedToProduction: false,
      scope: 'declared_minimum_cost_decisions_among_given_choices_not_general_optimal_strategy_or_room_acceptance', trainingTruth: false }),
    list: factionKey => cases.filter(c => c.factionRecordKey === factionKey).map(({ id, input, novelty }) => ({ id, input: clone(input), novelty })),
    verify(prediction) {
      exact(prediction, ['id', 'eligibleOptionIds', 'minimumCostOptionIds', 'minimumVespene']);
      const c = cases.find(c => c.id === prediction.id); if (!c) fail('FACTION_CHOICE_CASE_UNKNOWN');
      for (const field of ['eligibleOptionIds', 'minimumCostOptionIds']) {
        if (!Array.isArray(prediction[field]) || new Set(prediction[field]).size !== prediction[field].length
          || prediction[field].some(id => !c.input.options.some(o => o.id === id))) fail('FACTION_CHOICE_ANSWER_INVALID');
      }
      if (!Number.isSafeInteger(prediction.minimumVespene) || prediction.minimumVespene < 0) fail('FACTION_CHOICE_ANSWER_INVALID');
      const passed = ['eligibleOptionIds', 'minimumCostOptionIds'].every(field => hash([...prediction[field]].sort()) === hash([...c.expected[field]].sort()))
        && prediction.minimumVespene === c.expected.minimumVespene;
      return seal({ id: c.id, caseHash: c.hash, prediction, passed, novelty: c.novelty, kernelProofHash: receipts[cases.indexOf(c)].hash,
        roomReplayPerformed: false, strategyStrengthProven: false, trainingTruth: false });
    }, proof: () => clone(receipts),
  });
}
