import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';

export const ARMY_BUILDER_RELEASE_SCHEMAS_V2 = Object.freeze({
  cards: 'starcraft_tmg_official_army_builder_cards_v2',
  units: 'starcraft_tmg_official_army_builder_units_v2',
  factions: 'starcraft_tmg_official_army_builder_factions_v2',
  budget: 'starcraft_tmg_official_army_builder_budget_v2',
  composition: 'starcraft_tmg_official_army_builder_composition_v2',
});

const indexes = {
  cards: ['cardProfiles', 'cardSourceIndex'],
  units: ['unitProfiles', 'unitSourceIndex'],
  factions: ['factionProfiles', 'armyCandidateProfiles', 'eligibilityMatrix', 'engagementScales'],
  budget: ['tacticalBudgetProfiles', 'unitCompositionBudgetProfiles', 'upgradeBudgetProfiles', 'engagementScales'],
  composition: ['unitCompositionProfiles', 'purchasableUpgradeProfiles'],
};
const indexHashNames = { cardProfiles: 'cardProfileIndexHash', unitProfiles: 'unitProfileIndexHash',
  factionProfiles: 'factionProfileIndexHash', armyCandidateProfiles: 'armyCandidateProfileIndexHash',
  eligibilityMatrix: 'eligibilityMatrixHash', engagementScales: 'engagementScaleIndexHash',
  unitCompositionProfiles: 'unitCompositionProfileIndexHash',
  purchasableUpgradeProfiles: 'purchasableUpgradeProfileIndexHash',
  tacticalBudgetProfiles: 'tacticalBudgetProfileIndexHash',
  unitCompositionBudgetProfiles: 'unitCompositionBudgetProfileIndexHash',
  upgradeBudgetProfiles: 'upgradeBudgetProfileIndexHash',
  cardSourceIndex: 'cardSourceIndexHash', unitSourceIndex: 'unitSourceIndexHash' };
const verified = new WeakSet();
const digest = /^[a-f0-9]{64}$/u;
const without = (value, key) => Object.fromEntries(Object.entries(value).filter(([name]) => name !== key));

function requireValue(condition, detail) {
  if (!condition) throw new Error(`ARMY_BUILDER_RELEASE_BUNDLE_INVALID:${detail}`);
}

export function freezeArmyBuilderReleaseValueV2(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freezeArmyBuilderReleaseValueV2(child);
    Object.freeze(value);
  }
  return value;
}

function checkProfileTree(value) {
  if (!value || typeof value !== 'object') return true;
  let immutable = Object.isFrozen(value);
  for (const key of ['profileHash', 'budgetProfileHash', 'rowHash']) {
    if (value[key]) requireValue(value[key] === hash(without(value, key)), key);
  }
  for (const child of Object.values(value)) immutable = checkProfileTree(child) && immutable;
  return immutable;
}

export function verifyOfficialArmyBuilderReleaseBundleV2(bundle, kind) {
  requireValue(bundle?.schema === ARMY_BUILDER_RELEASE_SCHEMAS_V2[kind], 'schema');
  if (verified.has(bundle)) return true;
  requireValue(bundle.usageScope === 'army_building' && bundle.trainingTruth === false
    && bundle.productionRoomEligible === false, 'scope');
  requireValue(typeof bundle.sourceBinding?.releaseId === 'string'
    && digest.test(bundle.sourceSnapshotHash) && digest.test(bundle.normalizedDatasetHash)
    && bundle.sourceBinding.sourceSnapshotHash === bundle.sourceSnapshotHash
    && bundle.sourceBinding.normalizedDatasetHash === bundle.normalizedDatasetHash, 'source_binding');
  requireValue(bundle.sourcePolicy?.repositoryFallbackAllowed === false
    && bundle.sourcePolicy?.refreshDuringDevelopment === false
    && bundle.sourcePolicy?.commandCenterRole === 'primary_army_building_facts', 'source_policy');
  requireValue(bundle.bundleHash === hash(without(bundle, 'bundleHash')), 'bundle_hash');
  const selection = bundle.catalogueSelection;
  if (selection !== undefined) {
    const selected = selection.selectedRecordKeys;
    const excluded = selection.excludedRecordKeys;
    requireValue(selection.scope === 'explicit_record_subset' && selection.fullReleaseAdmission === false
      && Array.isArray(selected) && selected.length > 0 && Array.isArray(excluded)
      && [...selected, ...excluded].every(key => typeof key === 'string')
      && new Set([...selected, ...excluded]).size === selection.sourceRecordCount
      && selected.length + excluded.length === selection.sourceRecordCount
      && selection.sourceRecordKeysHash === hash([...selected, ...excluded].sort()), 'catalogue_selection');
    const rows = kind === 'cards' ? bundle.cardProfiles : kind === 'units' ? bundle.unitProfiles : [];
    requireValue(rows.every(row => selected.includes(row.recordKey)), 'catalogue_selection_profiles');
  }
  requireValue(bundle.ruleClauseIndexHash === hash(bundle.ruleClauses), 'rule_clauses');
  for (const name of indexes[kind]) {
    const rows = bundle[name];
    requireValue(Array.isArray(rows) && rows.length > 0
      && bundle[indexHashNames[name]] === hash(rows), name);
    const ids = rows.map(row => row.purchasableUpgradeProfileId || row.compositionProfileId
      || row.budgetProfileId || row.scaleId || (row.factionRecordKey
        ? `${row.factionRecordKey}:${row.candidateRecordKey}` : row.recordKey));
    requireValue(ids.every(Boolean) && new Set(ids).size === ids.length, `${name}_identities`);
  }
  const children = { factions: [['cardDataBundle', 'cards'], ['unitDataBundle', 'units']],
    budget: [['factionArmyEligibilityDataBundle', 'factions']],
    composition: [['armyResourceBudgetDataBundle', 'budget']] };
  for (const [key, childKind] of children[kind] || []) {
    verifyOfficialArmyBuilderReleaseBundleV2(bundle[key], childKind);
    requireValue(hash(bundle[key].sourceBinding) === hash(bundle.sourceBinding), `${key}_binding`);
    requireValue(hash(bundle[key].catalogueSelection ?? null) === hash(selection ?? null), `${key}_selection`);
  }
  if (selection && kind === 'factions') {
    const compiledKeys = [...bundle.cardDataBundle.cardProfiles, ...bundle.unitDataBundle.unitProfiles]
      .map(row => row.recordKey).sort();
    requireValue(hash(compiledKeys) === hash([...selection.selectedRecordKeys].sort()), 'catalogue_selection_coverage');
  }
  if (kind === 'factions' && bundle.foreignArmyPolicy) {
    verifyOfficialStukovArmyPolicyV1(bundle.foreignArmyPolicy);
    requireValue(hash(bundle.foreignArmyPolicy.sourceBinding) === hash(bundle.sourceBinding), 'foreign_army_policy_binding');
  }
  if (kind === 'units') {
    for (const unit of bundle.unitProfiles) {
      requireValue(Array.isArray(unit.compositions) && unit.compositions.length > 0, 'unit_compositions');
      for (const row of unit.compositions) requireValue(Number.isInteger(row.startingModels)
        && row.startingModels > 0 && Number.isInteger(row.startingSupply) && row.startingSupply >= 0
        && Number.isInteger(row.pointsCost) && row.pointsCost >= 0, 'unit_values');
    }
  }
  if (kind === 'composition') {
    requireValue(bundle.exactSelectionPolicy?.purchaseCatalogueAuthority === 'official_army_builder'
      && bundle.exactSelectionPolicy?.clientSuppliedCountsSupplyCostsOrApplicationAccepted === false,
    'selection_policy');
    for (const unit of bundle.unitCompositionProfiles) {
      for (const option of unit.compositionOptions) requireValue(option.recordKey === unit.recordKey
        && option.occupiedArmySlots === option.startingSupply, 'composition_owner');
    }
    for (const upgrade of bundle.purchasableUpgradeProfiles) {
      requireValue(Object.values(upgrade.mineralCostByComposition).every(cost =>
        Number.isInteger(cost) && cost >= 0), 'upgrade_cost');
    }
  }
  if (checkProfileTree(bundle)) verified.add(bundle);
  return true;
}
import { verifyOfficialStukovArmyPolicyV1 } from './official-stukov-army-policy-v1.mjs';
