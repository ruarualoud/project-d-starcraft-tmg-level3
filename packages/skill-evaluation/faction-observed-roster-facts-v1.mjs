import { seal, verifySeal, hash, fail } from '../skill-production/common.mjs';
import { createOfficialArmyResourceBudgetDataBundleV1 } from '../source-data/official-army-resource-budget-data-bundle-v1.mjs';
import { resolveOfficialArmyResourceBudgetV1 } from '../rule-atoms/official-army-resource-budget-rules-kernel-v1.mjs';
import { resolveOfficialArmySlotAuditV1 } from '../rule-atoms/official-faction-army-eligibility-rules-kernel-v1.mjs';

// Development counterexamples extracted from actual production mistakes.
// These are not hidden evaluation cases and never prove tactical superiority.
export function createFactionObservedRosterFactsV1({ input, dataset }) {
  verifySeal(input);
  const bundle = createOfficialArmyResourceBudgetDataBundleV1({ dataset });
  if (bundle.normalizedDatasetHash !== input.sourceBinding.dataset || bundle.sourceLockHash !== input.sourceBinding.core)
    fail('FACTION_OBSERVED_ROSTER_SOURCE_DRIFT');
  const factionKey = input.factionRecordKey, zerg = factionKey === 'tactical_cards:zerg_swarm';
  if (!zerg && factionKey !== 'tactical_cards:terran_armed_forces') fail('FACTION_OBSERVED_ROSTER_SCOPE');
  const definitions = zerg ? [
    ['hydra_lair', ['hydralisk'], ['lair']],
    ['hydra_overlord', ['hydralisk'], ['overlord']],
    ['hydra_den', ['hydralisk'], ['hydralisk_den']],
    ['hero_hydra_overlord', ['kerrigan', 'hydralisk'], ['overlord']],
    ['hero_hydra_lair', ['kerrigan', 'hydralisk'], ['lair']],
    ['hero_hydra_both', ['kerrigan', 'hydralisk'], ['overlord', 'lair']],
    ['duplicate_overlord', ['hydralisk'], ['overlord', 'overlord']],
  ] : [
    ['different_unique_cards', ['marine'], ['barracks__proxy_', 'barracks__tech_lab_']],
    ['duplicate_proxy', ['marine'], ['barracks__proxy_', 'barracks__proxy_']],
  ];
  const eligibility = bundle.factionArmyEligibilityDataBundle;
  const faction = eligibility.factionProfiles.find(p => p.recordKey === factionKey);
  const reference = (profile, extra) => {
    if (!profile) fail('FACTION_OBSERVED_ROSTER_PROFILE_MISSING');
    return { ...extra, recordKey: profile.recordKey, sourceRecordHash: profile.sourceRecordHash, payloadHash: profile.payloadHash };
  };
  const sourceRefs = new Set(['source:' + factionKey]);
  const cases = definitions.map(([id, units, cards]) => {
    const factionCard = reference(faction, { cardInstanceId: 'faction', profileHash: faction.profileHash });
    const unitInstances = units.map((id, index) => {
      const key = 'army_units:' + id; sourceRefs.add('source:' + key);
      const profile = bundle.unitCompositionBudgetProfiles.find(p => p.recordKey === key && p.compositionKind === 'small');
      const candidate = eligibility.armyCandidateProfiles.find(p => p.recordKey === key);
      return reference(profile, { unitInstanceId: 'unit-' + index, compositionKind: 'small',
        budgetProfileId: profile.budgetProfileId, budgetProfileHash: profile.budgetProfileHash, candidateProfileHash: candidate.profileHash });
    });
    const tacticalCardInstances = cards.map((id, index) => {
      const key = 'tactical_cards:' + id; sourceRefs.add('source:' + key);
      const profile = bundle.tacticalBudgetProfiles.find(p => p.recordKey === key);
      return reference(profile, { cardInstanceId: 'card-' + index, budgetProfileHash: profile.budgetProfileHash });
    });
    const request = { procedureKind: 'army_resource_budget', sideKey: 'observed-source-calibration',
      armyResourceBudgetDataBundle: bundle, factionCard, scaleId: 'Standard', mineralBudget: 2000,
      unitInstances, tacticalCardInstances, upgradeInstances: [], armyPurchaseSetComplete: true,
      rulesOwnedResourceArithmeticRequested: true, unspentResourceDisposition: 'lost', resourceConversionRequested: false };
    let outcome;
    try {
      const budget = resolveOfficialArmyResourceBudgetV1(request);
      const slots = resolveOfficialArmySlotAuditV1({ procedureKind: 'army_slot_audit',
        factionArmyEligibilityDataBundle: eligibility, factionCard, unitInstances,
        tacticalCardInstances: tacticalCardInstances.map(card => ({ ...card,
          candidateProfileHash: eligibility.armyCandidateProfiles.find(p => p.recordKey === card.recordKey).profileHash })),
        armyInstanceSetComplete: true, unusedSlotDisposition: 'lost', rulesOwnedSlotTotalsRequested: true });
      if (slots.resultHash !== budget.armySlotAuditResultHash) fail('FACTION_OBSERVED_ROSTER_KERNEL_DISAGREEMENT');
      outcome = { eligibleWithinDeclaredChecks: true, budget, slots };
    } catch (error) {
      const rejectionCode = String(error.message).split(':')[0];
      if (!['ARMY_SLOT_CAPACITY_EXCEEDED', 'UNIQUE_CARD_SINGLE_COPY_LIMIT'].includes(rejectionCode)) throw error;
      outcome = { eligibleWithinDeclaredChecks: false, rejectionCode };
    }
    return seal({ id, unitKeys: units.map(id => 'army_units:' + id), cardKeys: cards.map(id => 'tactical_cards:' + id),
      requestHash: hash(request), outcome, completeGameLegalityProven: false, trainingTruth: false });
  });
  const sources = [...sourceRefs].map(ref => {
    const source = input.frozenSources.prompt.sources.find(s => s.ref === ref);
    const manifest = input.frozenSources.manifest.sourceHashes.find(s => s.ref === ref);
    if (!source || !manifest) fail('FACTION_OBSERVED_ROSTER_SOURCE_MISSING');
    return { ref, sourceHash: manifest.hash, source };
  });
  const cardFacts = input.factionEvidence.armyPool.filter(r => sourceRefs.has(r.source.ref) && r.profile.candidateKind === 'tactical')
    .map(r => ({ ref: r.source.ref, cost: r.source.content.cost, unique: r.source.content.isUnique,
      slots: r.profile.tacticalArmySlots, sourceHash: r.source.hash }));
  return seal({ version: 'faction_observed_roster_facts_v1', inputHash: input.hash, sourceBinding: input.sourceBinding,
    bundleHash: bundle.bundleHash, cases, sources, cardFacts, initialSlots: input.factionEvidence.initialSlots,
    purpose: 'independent_rules_calibration_of_observed_production_errors', developmentOnly: true,
    heldoutEvidence: false, strategiesRanked: false, sourceRefreshPerformed: false, trainingTruth: false });
}
