import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { verifyOfficialAbilityEffectIrCatalogueV1 } from '../source-data/official-ability-effect-ir-v1.mjs';
import { deriveOfficialUnitExpectedEquipmentV1 } from '../rule-atoms/official-roster-disclosure-rules-kernel-v1.mjs';
import { getOfficialUnitCardInspectionProfileV1 } from '../source-data/official-roster-disclosure-data-bundle-v1.mjs';

const sides = ['player1', 'player2'];

export function createOfficialSelectedRosterAbilityCoverageV2({
  context, catalogue, state, rosterRegistry = state?.officialRosterRegistryResult, componentOwners = [],
  useEquippedWeapons = false,
}) {
  verifyOfficialAbilityEffectIrCatalogueV1(catalogue);
  const registry = rosterRegistry;
  const { resultHash: rosterRegistryHash, ...registryBody } = registry || {};
  const sourceDatasetHash = context.manifest.source.datasetHash;
  const armyBuilder = context.resources.armyBuilder;
  if (!rosterRegistryHash || hash(registryBody) !== rosterRegistryHash
    || registry.everyPlayerRosterSourceBoundAndFieldingLegal !== true
    || catalogue.normalizedDatasetHash !== sourceDatasetHash
    || armyBuilder?.normalizedDatasetHash !== sourceDatasetHash
    || !Array.isArray(armyBuilder.purchasableUpgradeProfiles)) {
    throw Error('SELECTED_ROSTER_ABILITY_COVERAGE_SOURCE_INVALID');
  }

  const equipmentBundle = state?.officialRosterDisclosureDataBundle;
  if (useEquippedWeapons && equipmentBundle?.normalizedDatasetHash !== sourceDatasetHash) {
    throw Error('SELECTED_ROSTER_ABILITY_COVERAGE_EQUIPMENT_SOURCE_INVALID');
  }
  const definitionsByRecord = Map.groupBy(catalogue.definitions, row => row.recordKey);
  const purchasesByRecord = Map.groupBy(armyBuilder.purchasableUpgradeProfiles, row => row.recordKey);
  const componentByDefinition = new Map();
  for (const owner of componentOwners) {
    const definition = catalogue.definitions.find(row => row.definitionId === owner.definitionId);
    if (!definition || definition.sourceFeatureHash !== owner.sourceFeatureHash
      || !Array.isArray(owner.actionTypes) || !owner.actionTypes.length) {
      throw Error('SELECTED_ROSTER_ABILITY_COVERAGE_COMPONENT_OWNER_INVALID');
    }
    const actions = componentByDefinition.get(owner.definitionId) || [];
    actions.push(...owner.actionTypes);
    componentByDefinition.set(owner.definitionId, actions);
  }
  const obligations = new Map();
  function add(definition, owner) {
    const owners = obligations.get(definition.definitionId) || [];
    owners.push(owner);
    obligations.set(definition.definitionId, owners);
  }
  for (const sideKey of sides) {
    const roster = registry.rostersByPlayer[sideKey];
    for (const unit of roster.units) {
      const profiles = purchasesByRecord.get(unit.recordKey) || [];
      const purchasedByIndex = new Map(profiles.map(row => [row.upgradeIndex, row]));
      const selectedProfileIds = new Set(unit.selectedUpgrades.map(selected => selected.purchasableUpgradeProfileId));
      if ([...selectedProfileIds].some(id => !profiles.some(profile => profile.purchasableUpgradeProfileId === id))) {
        throw Error('SELECTED_ROSTER_ABILITY_COVERAGE_UPGRADE_SOURCE_INVALID');
      }
      const unitDefinitions = definitionsByRecord.get(unit.recordKey) || [];
      let equippedProfileIds;
      let defaultWeaponsByIndex;
      if (useEquippedWeapons && unitDefinitions.some(row => row.activationKind === 'weapon')) {
        const inspection = getOfficialUnitCardInspectionProfileV1(equipmentBundle, unit.recordKey);
        defaultWeaponsByIndex = new Map(inspection.defaultEquipment
          .filter(row => row.equipmentSourceKind === 'default_unit_card_weapon')
          .map(row => [row.upgradeIndex, row.equipmentProfileId]));
        const equipment = deriveOfficialUnitExpectedEquipmentV1({
          rosterDisclosureDataBundle: equipmentBundle, rosterRegistryResult: registry, playerId: sideKey,
          unitInstanceId: unit.unitInstanceId,
        });
        equippedProfileIds = new Set(equipment.equipmentRows.map(row => row.equipmentProfileId));
      }
      for (const definition of unitDefinitions) {
        const purchasable = purchasedByIndex.get(definition.sourceIndex);
        if (purchasable && !selectedProfileIds.has(purchasable.purchasableUpgradeProfileId)) continue;
        if (equippedProfileIds && definition.activationKind === 'weapon') {
          // Use exact roster equipment identities. Effects without a physical
          // equipment entry remain obligations of their original source.
          const profileId = purchasable?.purchasableUpgradeProfileId ?? defaultWeaponsByIndex.get(definition.sourceIndex);
          if (profileId && !equippedProfileIds.has(profileId)) continue;
        }
        add(definition, { sideKey, unitInstanceId: unit.unitInstanceId,
          scope: purchasable ? 'purchased_upgrade' : 'unit_card_base' });
      }
    }
    for (const card of [roster.factionCard, ...roster.tacticalCards]) {
      for (const definition of definitionsByRecord.get(card.recordKey) || []) {
        add(definition, { sideKey, cardInstanceId: card.cardInstanceId ?? null,
          scope: card === roster.factionCard ? 'faction_card' : 'tactical_card' });
      }
    }
  }
  const definitions = catalogue.definitions.filter(row => obligations.has(row.definitionId)).map(row => ({
    definitionId: row.definitionId, recordKey: row.recordKey, sourceFeatureHash: row.sourceFeatureHash,
    owners: obligations.get(row.definitionId), registrationStatus: row.execution.status,
    componentActionTypes: [...new Set(componentByDefinition.get(row.definitionId) || [])].sort(),
  }));
  const body = { schema: 'starcraft_tmg_selected_roster_ability_coverage_v2', sourceDatasetHash,
    sourceCatalogueHash: catalogue.catalogueHash, sourceDefinitionCount: catalogue.definitions.length,
    rosterRegistryHash, definitions,
    pendingDefinitionCount: definitions.filter(row => row.registrationStatus !== 'executable_exact').length,
    scope: useEquippedWeapons ? 'starting_roster_with_effective_model_weapons' : 'starting_roster_base_and_selected_upgrade_definitions',
    provesFullMatchAdmission: false, trainingTruth: false };
  return { ...body, coverageHash: hash(body) };
}
