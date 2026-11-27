import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { assertOfficialReleaseSourceV2 } from './official-release-context-v2.mjs';
import { getOfficialCurrentProductRecord } from './official-command-center-adapter-v1.mjs';
import { compileOfficialCardBuildPaymentProfilesV2, verifyOfficialCardBuildPaymentDataBundleV1 } from './official-card-build-payment-data-bundle-v1.mjs';
import { parseOfficialUnitSupplyProfileV1, compileOfficialUnitCompositionV1 } from './official-unit-card-supply-data-bundle-v1.mjs';
import { compileOfficialFactionArmyProfilesV2 } from './official-faction-army-eligibility-data-bundle-v1.mjs';
import { compileOfficialArmyBudgetProfilesV2 } from './official-army-resource-budget-data-bundle-v1.mjs';
import { verifyOfficialUnitCompositionUpgradeDataBundleV1 } from './official-unit-composition-upgrade-data-bundle-v1.mjs';
import { ARMY_BUILDER_RELEASE_SCHEMAS_V2, freezeArmyBuilderReleaseValueV2 as freeze,
  verifyOfficialArmyBuilderReleaseBundleV2 } from './official-army-builder-release-bundle-v2.mjs';

const slotTypes = ['Air', 'Core', 'Elite', 'Hero', 'Support'];
const races = new Set(['Protoss', 'Terran', 'Zerg']);
const profile = body => ({ ...body, profileHash: hash(body) });
const indexed = rows => [...rows].sort((a, b) => a.recordKey.localeCompare(b.recordKey));
const sourceIndex = rows => rows.map(({ recordKey, sourceRecordHash, payloadHash }) =>
  ({ recordKey, sourceRecordHash, payloadHash }));

function requireValue(condition, detail) {
  if (!condition) throw new Error(`ARMY_BUILDER_CATALOGUE_SOURCE_INVALID:${detail}`);
}

function compileUnits(dataset) {
  return indexed(dataset.recordIndex.filter(row => row.recordType === 'unit'
    && row.authorityDisposition === 'official_current_product_candidate').map(row => {
    const record = getOfficialCurrentProductRecord(dataset, row.recordKey);
    const unit = record.payload;
    requireValue(races.has(unit.faction) && [...slotTypes, 'Other'].includes(unit.unitType), row.recordKey);
    const supplyProfile = parseOfficialUnitSupplyProfileV1(unit.squadProfile, row.recordKey, { requiredTierCount: null });
    const compositions = ['small', 'large'].map(kind =>
      compileOfficialUnitCompositionV1(unit[kind], kind, supplyProfile, row.recordKey)).filter(Boolean);
    requireValue(compositions.length > 0 && Array.isArray(unit.upgrades), row.recordKey);
    return profile({ schema: 'starcraft_tmg_official_army_building_unit_profile_v2',
      recordKey: record.recordKey, sourceRecordHash: record.sourceRecordHash,
      payloadHash: record.payloadHash, unitId: unit.id, unitName: unit.name,
      factionTag: unit.faction, armySlotType: slotTypes.includes(unit.unitType) ? unit.unitType : null,
      sourceUnitType: unit.unitType, fieldableDuringArmyBuilding: slotTypes.includes(unit.unitType),
      isUnique: unit.tags.split(',').some(tag => tag.trim().toLowerCase() === 'unique'),
      supplyProfile, compositions, upgradeSide: { present: true,
        definitionCount: unit.upgrades.length, definitionsHash: hash(unit.upgrades) },
      usageScope: 'army_building', trainingTruth: false });
  }));
}

// These are finite source-backed purchase constraints. They do not rank a roster.
function compileConstraints(dataset, units, cards) {
  const constraints = [];
  const seen = new Set();
  for (const record of Object.values(dataset.recordsByKey)) {
    if (!['unit', 'tactical_card'].includes(record.recordType)) continue;
    for (const feature of record.payload.upgrades || record.payload.boosts || []) {
      const text = feature.description || '';
      const exclusive = text.match(/^During Army Building, your army cannot include both the (.+) Unit and the (.+) Unit\.$/u);
      if (exclusive) {
        const recordKeys = exclusive.slice(1).map(name => {
          const matches = units.filter(unit => unit.unitName === name);
          requireValue(matches.length === 1, `exclusive_unit:${name}`);
          return matches[0].recordKey;
        }).sort();
        const key = recordKeys.join('|');
        if (!seen.has(key)) constraints.push({ kind: 'mutually_exclusive_units', recordKeys,
          sourceRecordKey: record.recordKey, sourceDefinitionHash: hash(feature) });
        seen.add(key);
      } else if (text.includes('During Army Building, select exactly one Creep Card')) {
        const recordKeys = cards.filter(card => !card.isFactionCard && / Creep$/u.test(card.cardName))
          .map(card => card.recordKey).sort();
        requireValue(recordKeys.length > 0, 'creep_cards');
        constraints.push({ kind: 'exactly_one_tactical_group', factionRecordKey: record.recordKey,
          recordKeys, sourceRecordKey: record.recordKey, sourceDefinitionHash: hash(feature) });
      } else {
        requireValue(!/During Army Building/iu.test(text), `uncompiled_purchase_rule:${record.recordKey}:${feature.name}`);
      }
    }
  }
  return constraints;
}

function compileCompositions(dataset, budget, legacy) {
  const units = budget.factionArmyEligibilityDataBundle.unitDataBundle.unitProfiles
    .filter(unit => unit.fieldableDuringArmyBuilding);
  const purchasableUpgradeProfiles = [];
  const referenceDiscrepancies = [];
  const unitCompositionProfiles = units.map(unit => {
    const oldUnit = legacy.unitCompositionProfiles.find(row => row.recordKey === unit.recordKey);
    const compositionOptions = unit.compositions.map(composition => {
      const cost = budget.unitCompositionBudgetProfiles.find(row => row.recordKey === unit.recordKey
        && row.compositionKind === composition.kind);
      const oldOption = oldUnit?.compositionOptions.find(row => row.compositionKind === composition.kind);
      const printed = oldOption?.armyReferenceMineralCost ?? null;
      if (printed !== null && printed !== cost.mineralCost) referenceDiscrepancies.push({
        recordKey: unit.recordKey, field: `${composition.kind}.cost`,
        officialBuilderValue: cost.mineralCost, part12ReferenceValue: printed });
      return profile({ schema: 'starcraft_tmg_official_unit_composition_option_profile_v1',
        compositionProfileId: cost.budgetProfileId, recordKey: unit.recordKey,
        unitId: unit.unitId, unitName: unit.unitName, compositionKind: composition.kind,
        startingModels: composition.startingModels, startingSupply: composition.startingSupply,
        occupiedArmySlots: composition.startingSupply, mineralCost: cost.mineralCost,
        armyReferenceMineralCost: printed,
        mineralCostReconciliation: printed === null ? 'official_builder_no_part12_entry'
          : printed === cost.mineralCost ? 'official_builder_and_part12_agree' : 'official_builder_wins_reference_retained',
        sourceRecordHash: unit.sourceRecordHash, payloadHash: unit.payloadHash,
        sourceUnitProfileHash: unit.profileHash, sourceBudgetProfileHash: cost.budgetProfileHash,
        modelCountAuthority: 'official_army_builder', startingSupplyAuthority: 'official_army_builder',
        mineralCostAuthority: 'official_army_builder', trainingTruth: false });
    });
    const record = getOfficialCurrentProductRecord(dataset, unit.recordKey);
    const upgrades = record.payload.upgrades.flatMap((definition, upgradeIndex) => {
      const old = legacy.purchasableUpgradeProfiles.find(row => row.recordKey === unit.recordKey
        && row.upgradeName.toLowerCase() === definition.name.toLowerCase() && row.phase === definition.phase);
      // The official UI shows positive-cost entries as purchases. A printed
      // zero-cost replacement is retained with its existing normative source.
      const positive = compositionOptions.some(option =>
        (option.compositionKind === 'small' ? definition.costS : definition.costL) > 0);
      const linkedTo = definition.linkedTo?.trim();
      const replacementTargetName = linkedTo && linkedTo !== '-' ? linkedTo : null;
      if (!positive && !(old && replacementTargetName)) return [];
      const cost = budget.upgradeBudgetProfiles.find(row => row.recordKey === unit.recordKey
        && row.upgradeIndex === upgradeIndex);
      const specialist = /\bSPECIALIST\b/u.test(definition.description);
      return [profile({ schema: 'starcraft_tmg_official_purchasable_upgrade_profile_v1',
        purchasableUpgradeProfileId: old?.purchasableUpgradeProfileId
          || `${unit.recordKey}:purchasable:${upgradeIndex}:${hash({ name: definition.name, phase: definition.phase }).slice(0, 12)}`,
        recordKey: unit.recordKey, unitId: unit.unitId, unitName: unit.unitName,
        upgradeIndex, upgradeName: definition.name, phase: definition.phase,
        activation: definition.activation, description: definition.description,
        applicationKind: specialist ? 'specialist_one_model' : 'unit_wide',
        specialistAssignmentRequired: specialist, sameEntryPurchaseLimit: 1,
        differentEntriesMayBeCombined: true, replacementTargetName,
        mineralCostByComposition: Object.fromEntries(compositionOptions.map(option =>
          [option.compositionKind, cost.mineralCostByComposition[option.compositionKind]])),
        sourceRecordHash: unit.sourceRecordHash, payloadHash: unit.payloadHash,
        sourceUnitProfileHash: unit.profileHash, sourceDefinitionHash: hash(definition),
        sourceBudgetProfileId: cost.budgetProfileId, sourceBudgetProfileHash: cost.budgetProfileHash,
        purchaseAuthority: positive ? 'official_army_builder_positive_cost_entry' : 'part12_zero_cost_replacement',
        ...(positive ? {} : { armyReferenceEntryHash: old.armyReferenceEntryHash }),
        trainingTruth: false })];
    });
    purchasableUpgradeProfiles.push(...upgrades);
    return profile({ schema: 'starcraft_tmg_official_unit_composition_reference_profile_v1',
      recordKey: unit.recordKey, unitId: unit.unitId, unitName: unit.unitName,
      factionTag: unit.factionTag, sourceRecordHash: unit.sourceRecordHash,
      payloadHash: unit.payloadHash, sourceUnitProfileHash: unit.profileHash,
      armySlotType: unit.armySlotType, compositionOptions,
      compositionOptionCount: compositionOptions.length,
      purchasableUpgradeProfileIds: upgrades.map(row => row.purchasableUpgradeProfileId),
      purchasableUpgradeCount: upgrades.length, exactlyOneCompositionRequired: true,
      unlistedModelCountForbidden: true, startingSupplyEqualsOccupiedArmySlots: true,
      trainingTruth: false });
  });
  return { unitCompositionProfiles: indexed(unitCompositionProfiles),
    purchasableUpgradeProfiles: purchasableUpgradeProfiles.sort((a, b) =>
      a.purchasableUpgradeProfileId.localeCompare(b.purchasableUpgradeProfileId)), referenceDiscrepancies };
}

function bindReleaseBundle({ dataset, releaseContext, kind, template, fields }) {
  const sourceBinding = { releaseId: releaseContext.manifest.releaseId,
    sourceSnapshotHash: dataset.sourceSnapshotHash, normalizedDatasetHash: dataset.datasetHash };
  const ruleSectionRecords = template.ruleSectionRecords.map(old => {
    const current = dataset.recordsByKey[old.recordKey];
    requireValue(current?.payloadHash === old.payloadHash, `normative_rule_changed:${old.recordKey}`);
    return { ...old, sourceRecordHash: current.sourceRecordHash, sourceVersion: dataset.dataVersions.rulesVersion };
  });
  const body = { schema: ARMY_BUILDER_RELEASE_SCHEMAS_V2[kind], sourceBinding,
    sourceSnapshotHash: dataset.sourceSnapshotHash, normalizedDatasetHash: dataset.datasetHash,
    sourceLockHash: null, coreRulebookHash: template.coreRulebookHash,
    officialRulesVersion: dataset.dataVersions.rulesVersion,
    officialUnitsVersion: dataset.dataVersions.unitsVersion, officialCardsVersion: dataset.dataVersions.cardsVersion,
    ruleSectionRecords, ruleClauses: template.ruleClauses, ruleClauseIndexHash: template.ruleClauseIndexHash,
    usageScope: 'army_building', productionRoomEligible: false, trainingTruth: false,
    sourcePolicy: { commandCenterRole: 'primary_army_building_facts', pdfRole: 'reference_and_explicit_zero_cost_replacement',
      repositoryFallbackAllowed: false, refreshDuringDevelopment: false }, ...fields };
  return freeze({ ...body, bundleHash: hash(body) });
}

// Card payment/reaction components do not require unrelated unit-purchase rules
// to compile. The complete army builder below consumes the same bundle binder.
export function createOfficialReleaseCardCatalogueV2({ context, legacyCardDataBundle }) {
  assertOfficialReleaseSourceV2(context, context);
  verifyOfficialCardBuildPaymentDataBundleV1(legacyCardDataBundle);
  const compiled = compileOfficialCardBuildPaymentProfilesV2(context.dataset, null);
  const result = bindReleaseBundle({ dataset: context.dataset, releaseContext: context,
    kind: 'cards', template: legacyCardDataBundle, fields: {
      cardProfiles: compiled.profiles, cardProfileIndexHash: hash(compiled.profiles),
      cardSourceIndex: compiled.sourceIndex, cardSourceIndexHash: hash(compiled.sourceIndex) } });
  verifyOfficialCardBuildPaymentDataBundleV1(result);
  return result;
}

export function createOfficialArmyBuilderCatalogueV2({ dataset, snapshot, releaseContext, legacyPolicyBundle }) {
  assertOfficialReleaseSourceV2(releaseContext, { dataset, snapshot });
  verifyOfficialUnitCompositionUpgradeDataBundleV1(legacyPolicyBundle);
  const legacyBudget = legacyPolicyBundle.armyResourceBudgetDataBundle;
  const legacyFactions = legacyBudget.factionArmyEligibilityDataBundle;
  const bundle = (kind, template, fields) => bindReleaseBundle({ dataset, releaseContext, kind, template, fields });
  const cards = compileOfficialCardBuildPaymentProfilesV2(dataset, null);
  const cardDataBundle = bundle('cards', legacyFactions.cardDataBundle, {
    cardProfiles: cards.profiles, cardProfileIndexHash: hash(cards.profiles),
    cardSourceIndex: cards.sourceIndex, cardSourceIndexHash: hash(cards.sourceIndex) });
  const units = compileUnits(dataset);
  const unitDataBundle = bundle('units', legacyFactions.unitDataBundle, {
    unitProfiles: units, unitProfileIndexHash: hash(units),
    unitSourceIndex: sourceIndex(units), unitSourceIndexHash: hash(sourceIndex(units)) });
  const factionRows = compileOfficialFactionArmyProfilesV2(dataset, cardDataBundle, unitDataBundle, null);
  const armyBuildingConstraints = compileConstraints(dataset, units, cards.profiles);
  const factionArmyEligibilityDataBundle = bundle('factions', legacyFactions, {
    raceTags: legacyFactions.raceTags, armySlotTypes: slotTypes,
    subFactionTags: factionRows.subFactionTags, engagementScales: legacyFactions.engagementScales,
    engagementScaleIndexHash: legacyFactions.engagementScaleIndexHash,
    factionProfiles: factionRows.factionProfiles, factionProfileIndexHash: hash(factionRows.factionProfiles),
    armyCandidateProfiles: factionRows.armyCandidateProfiles,
    armyCandidateProfileIndexHash: hash(factionRows.armyCandidateProfiles),
    nonArmyBuildingUnitProfiles: factionRows.nonArmyBuildingUnitProfiles,
    eligibilityMatrix: factionRows.eligibilityMatrix, eligibilityMatrixHash: hash(factionRows.eligibilityMatrix),
    armyBuildingConstraints, cardDataBundle, unitDataBundle,
    audit: { factionCardCount: factionRows.factionProfiles.length,
      fieldableUnitCount: units.filter(unit => unit.fieldableDuringArmyBuilding).length } });
  const budgets = compileOfficialArmyBudgetProfilesV2(dataset, factionArmyEligibilityDataBundle);
  const armyResourceBudgetDataBundle = bundle('budget', legacyBudget, {
    ...budgets, tacticalBudgetProfileIndexHash: hash(budgets.tacticalBudgetProfiles),
    unitCompositionBudgetProfileIndexHash: hash(budgets.unitCompositionBudgetProfiles),
    upgradeBudgetProfileIndexHash: hash(budgets.upgradeBudgetProfiles),
    engagementScales: legacyFactions.engagementScales,
    engagementScaleIndexHash: legacyFactions.engagementScaleIndexHash,
    factionArmyEligibilityDataBundle, exactBudgetPolicy: legacyBudget.exactBudgetPolicy });
  const compositions = compileCompositions(dataset, armyResourceBudgetDataBundle, legacyPolicyBundle);
  const result = bundle('composition', legacyPolicyBundle, {
    ...compositions, unitCompositionProfileIndexHash: hash(compositions.unitCompositionProfiles),
    purchasableUpgradeProfileIndexHash: hash(compositions.purchasableUpgradeProfiles),
    armyResourceBudgetDataBundle,
    exactSelectionPolicy: { ...legacyPolicyBundle.exactSelectionPolicy,
      purchaseOnlyPart12ListedUpgrades: false, purchaseCatalogueAuthority: 'official_army_builder' },
    sourceReconciliation: { allCurrentUpgradeDefinitionsArePurchasable: false,
      legacyPolicyBundleHash: legacyPolicyBundle.bundleHash },
    audit: { unitReferenceCount: compositions.unitCompositionProfiles.length,
      compositionOptionCount: compositions.unitCompositionProfiles.reduce((sum, unit) => sum + unit.compositionOptions.length, 0),
      purchasableUpgradeCount: compositions.purchasableUpgradeProfiles.length,
      sourceUnitCount: units.length, cardCount: cards.profiles.length,
      factionCount: factionRows.factionProfiles.length } });
  verifyOfficialArmyBuilderReleaseBundleV2(result, 'composition');
  return result;
}
