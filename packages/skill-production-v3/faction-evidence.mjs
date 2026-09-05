import { createOfficialFactionArmyEligibilityDataBundleV1 } from '../source-data/official-faction-army-eligibility-data-bundle-v1.mjs';
import { getOfficialCurrentProductRecord } from '../source-data/official-command-center-adapter-v1.mjs';
import { resolveOfficialFactionCardSelectionV1, resolveOfficialFactionTagEligibilityV1 } from '../rule-atoms/official-faction-army-eligibility-rules-kernel-v1.mjs';
import { createGlobalProductionContext } from './context.mjs';
import { seal, verifySeal, hash, fail, clone, safe } from '../skill-production/common.mjs';

// Source preparation only. This cannot authorize paid generation, invent a
// roster, or accept an overall Skill dependency. Those are separate gates.
export function createFactionEvidenceCompilerV1({ catalogue, dataset }) {
  verifySeal(catalogue);
  const bundle = createOfficialFactionArmyEligibilityDataBundleV1({ dataset });
  if (catalogue.sourceBinding.core !== bundle.sourceLockHash
    || catalogue.sourceBinding.dataset !== bundle.normalizedDatasetHash) fail('FACTION_EVIDENCE_SOURCE_DRIFT');
  const context = createGlobalProductionContext(catalogue);
  const products = new Map();
  for (const row of catalogue.rows.filter(r => r.id.startsWith('source:'))) {
    verifySeal(row);
    const recordKey = row.id.slice(7), record = getOfficialCurrentProductRecord(dataset, recordKey);
    if (products.has(recordKey) || row.quarantined || row.sourceClass !== 'official_product_current'
      || row.sourceLockHash !== bundle.sourceLockHash || row.sourceRecordHash !== record.payloadHash
      || row.currentRulesReceiptHash !== catalogue.sourceBinding.rules
      || hash(JSON.parse(row.text)) !== record.payloadHash) fail('FACTION_EVIDENCE_PRODUCT_DRIFT');
    products.set(recordKey, seal({ ref: row.id, sourceRowHash: row.hash, recordKey,
      recordType: record.recordType, payloadHash: record.payloadHash, sourceRecordHash: record.sourceRecordHash,
      content: safe(JSON.parse(row.text)), sourceEvidenceOnly: true, trainingTruth: false }));
  }
  const expectedProducts = dataset.recordIndex.filter(r => r.authorityDisposition === 'official_current_product_candidate');
  if (expectedProducts.length !== products.size || expectedProducts.some(r => !products.has(r.recordKey))) fail('FACTION_EVIDENCE_PRODUCT_DENOMINATOR');
  const product = profile => {
    const row = products.get(profile.recordKey);
    if (!row || row.payloadHash !== profile.payloadHash || row.sourceRecordHash !== profile.sourceRecordHash) fail('FACTION_EVIDENCE_PROFILE_DRIFT');
    return row;
  };
  [...bundle.factionProfiles, ...bundle.armyCandidateProfiles, ...bundle.nonArmyBuildingUnitProfiles].forEach(product);
  // Snapshots are host-owned immutable clones; callers cannot change a later
  // compilation by mutating a previously supplied object.
  const binding = clone(catalogue.sourceBinding), catalogueHash = catalogue.hash;
  return Object.freeze({ compile(factionRecordKey) {
    const faction = bundle.factionProfiles.find(f => f.recordKey === factionRecordKey);
    if (!faction) fail('FACTION_EVIDENCE_FACTION_REQUIRED');
    const sourceCard = bundle.cardDataBundle.cardProfiles.find(c => c.recordKey === factionRecordKey);
    const factionCard = { recordKey: factionRecordKey, sourceRecordHash: faction.sourceRecordHash,
      payloadHash: faction.payloadHash, profileHash: faction.profileHash };
    const selection = resolveOfficialFactionCardSelectionV1({ factionArmyEligibilityDataBundle: bundle,
      procedureKind: 'faction_card_selection', armyCardInstanceSetComplete: true, rulesOwnedFactionCardSelectionRequested: true,
      selectedFactionCard: factionCard, cardInstances: [{ cardInstanceId: 'selected-faction', recordKey: factionRecordKey,
        sourceRecordHash: sourceCard.sourceRecordHash, payloadHash: sourceCard.payloadHash, sourceCardProfileHash: sourceCard.profileHash }] });
    const eligibilityRows = bundle.eligibilityMatrix.filter(r => r.factionRecordKey === factionRecordKey);
    const eligible = bundle.armyCandidateProfiles.filter(p => eligibilityRows.find(r => r.candidateRecordKey === p.recordKey)?.eligible);
    const eligibility = resolveOfficialFactionTagEligibilityV1({ factionArmyEligibilityDataBundle: bundle,
      procedureKind: 'faction_tag_eligibility', factionCard, candidateInstanceSetComplete: true,
      rulesOwnedTagComparisonRequested: true, candidateInstances: eligible.map(p => ({
        candidateInstanceId: 'eligible:' + p.recordKey, recordKey: p.recordKey, sourceRecordHash: p.sourceRecordHash,
        payloadHash: p.payloadHash, candidateProfileHash: p.profileHash })) });
    const rejected = eligibilityRows.filter(r => !r.eligible);
    if (eligibilityRows.length !== bundle.armyCandidateProfiles.length
      || eligible.length + rejected.length !== eligibilityRows.length) fail('FACTION_EVIDENCE_ELIGIBILITY_DENOMINATOR');
    const nonArmy = bundle.nonArmyBuildingUnitProfiles.map(p => ({ profile: p, source: product(p),
      disposition: 'not_purchasable_in_army_building_requires_own_rule_to_enter_play' }));
    const consumed = new Set([...bundle.factionProfiles, ...bundle.armyCandidateProfiles,
      ...bundle.nonArmyBuildingUnitProfiles].map(p => p.recordKey));
    const scenarioSources = [...products.values()].filter(p => !consumed.has(p.recordKey));
    return seal({ schema: 'starcraft_faction_production_evidence_v1', gameId: 'starcraft-tmg',
      catalogueHash, sourceBinding: binding, globalContextHash: context.hash, sourceRefreshPerformed: false,
      factionRecordKey, factionName: faction.factionName, factionTags: faction.factionTags,
      primarySource: product(faction), initialSlots: faction.startingArmySlots,
      sourceBundleHash: bundle.bundleHash, factionSelectionReceipt: selection, eligibilityReceipt: eligibility,
      armyPool: eligible.map(p => ({ profile: p, source: product(p) })),
      excludedArmyCandidates: rejected.map(r => ({ ...r, ref: 'source:' + r.candidateRecordKey,
        sourceRowHash: products.get(r.candidateRecordKey).sourceRowHash, reason: 'candidate_tags_not_subset_of_selected_faction_card' })),
      nonArmyBuildingUnits: nonArmy,
      otherFactionCards: bundle.factionProfiles.filter(p => p.recordKey !== factionRecordKey).map(p => ({
        source: product(p), disposition: 'alternative_faction_not_an_additional_card_for_this_army' })),
      scenarioSources,
      productManifest: [...products.values()].map(p => ({ ref: p.ref, sourceRowHash: p.sourceRowHash, payloadHash: p.payloadHash })),
      scope: { completeGlobalSourcesRequiredAtGeneration: true, selectedFactionNotWholeRace: true,
        eligibilityOnlyNotCompleteRosterLegality: true, slotCostUpgradeUniqueAndScenarioChecksStillRequired: true,
        nonArmyUnitEntryRequiresExplicitRule: true, rawFactsNotStrategicRecommendations: true },
      generationRequiresAcceptedOverallDependency: true, skillsGenerated: 0, candidateOnly: true,
      runtimeAccepted: false, humanReviewed: false, canAffectRules: false, trainingTruth: false });
  } });
}
