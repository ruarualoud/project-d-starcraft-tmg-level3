import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { resolveOfficialEngagementScaleAgreementV1 } from
  "../rule-atoms/official-faction-army-eligibility-rules-kernel-v1.mjs";
import {
  createOfficialDeploymentGeometryBindingV1,
  createOfficialTerrainHeightTierLedgerV1,
  finalizeOfficialMissionMarkerPlacementV1,
} from "../rule-atoms/official-deployment-geometry-rules-kernel-v1.mjs";
import {
  applyOfficialMissionDeploymentDraftChoiceV1,
  createOfficialMissionDeploymentDraftStateV1,
  enumerateOfficialMissionDeploymentDraftChoicesV1,
} from "../rule-atoms/official-mission-deployment-draft-rules-kernel-v1.mjs";
import { createOfficialMissionRuntimeV2 } from
  "../rule-atoms/official-mission-runtime-v2.mjs";
import { resolveOfficialArmyInitialReservesV1 } from
  "../rule-atoms/official-reserve-lifecycle-rules-kernel-v1.mjs";
import {
  deriveOfficialUnitExpectedEquipmentV1,
  resolveOfficialClosedListAgreementSubmissionV1,
  resolveOfficialRosterRegistryAuditV1,
  resolveOfficialRosterVisibilityV1,
} from "../rule-atoms/official-roster-disclosure-rules-kernel-v1.mjs";
import { resolveOfficialCompleteArmyCompositionUpgradeAuditV1 } from
  "../rule-atoms/official-unit-composition-upgrade-rules-kernel-v1.mjs";
import { getOfficialCurrentProductRecord } from
  "../source-data/official-command-center-adapter-v1.mjs";
import { createOfficialDeploymentGeometryDataBundleV1 } from
  "../source-data/official-deployment-geometry-data-bundle-v1.mjs";
import { createOfficialGameplayDataBundleV1 } from
  "../source-data/official-gameplay-data-bundle-v1.mjs";
import { createOfficialMissionDeploymentDraftDataBundleV1 } from
  "../source-data/official-mission-deployment-draft-data-bundle-v1.mjs";
import { createOfficialMissionEffectCatalogueV1 } from
  "../source-data/official-mission-effect-ir-v1.mjs";
import { createOfficialMissionSetupBindingV1 } from
  "../source-data/official-mission-setup-binding-v1.mjs";
import { createOfficialModelBaseGeometryDataBundleV1,
  getOfficialModelBaseGeometryProfileV1 } from
  "../source-data/official-model-base-geometry-data-bundle-v1.mjs";
import { createOfficialReserveLifecycleDataBundleV1 } from
  "../source-data/official-reserve-lifecycle-data-bundle-v1.mjs";
import { createOfficialRosterDisclosureDataBundleV1 } from
  "../source-data/official-roster-disclosure-data-bundle-v1.mjs";
import { createOfficialUnitCardSupplyDataBundleV1 } from
  "../source-data/official-unit-card-supply-data-bundle-v1.mjs";
import { createOfficialStandardActionRouteCatalogueV1 } from
  "./official-standard-action-route-catalogue-v1.mjs";

export const OFFICIAL_STANDARD_ROOM_FACTORY_SCHEMA =
  "starcraft_tmg_official_standard_room_initial_state_authority_v1";
export const OFFICIAL_STANDARD_ROOM_FACTORY_VERSION = "1.1.0";

const HOLD_POSITION = "faction_cards:mission_hold_position";
const GAUNTLET = "faction_cards:2NdngLtIeZAprsWr25hM";
const SIDE_KEYS = Object.freeze(["player1", "player2"]);
const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const TERRAN_UPGRADES = Object.freeze([
  "AGG-12", "Bayonet", "Combat Shield", "Grenades - Frag",
  "Rocket Launcher", "Slugthrower",
]);

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}
function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}
function clone(value) { return structuredClone(value); }
function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}

export const OFFICIAL_STANDARD_2000_ROOM_RECIPES_V1 = deepFreeze({
  player1: {
    factionRecordKey: "tactical_cards:terran_armed_forces",
    tacticalCardRecordKeys: [
      "tactical_cards:barracks__proxy_", "tactical_cards:factory",
      "tactical_cards:supply_depot",
    ],
    units: [
      ...[1, 2, 3].map((ordinal) => ({
        unitInstanceId: `player1-marine-${ordinal}`,
        recordKey: "army_units:marine", compositionKind: "large",
        upgradeNames: [...TERRAN_UPGRADES],
      })),
      ...[1, 2].map((ordinal) => ({
        unitInstanceId: `player1-goliath-${ordinal}`,
        recordKey: "army_units:goliath", compositionKind: "small",
        upgradeNames: [
          "Ares-Class Targeting System", "Haywire Missiles", "Scatter Missiles",
        ],
      })),
      { unitInstanceId: "player1-jim-raynor", recordKey: "army_units:jim_raynor",
        compositionKind: "small", upgradeNames: [] },
      { unitInstanceId: "player1-medic", recordKey: "army_units:medic",
        compositionKind: "small", upgradeNames: ["Stabilizer Medpacks"] },
    ],
  },
  player2: {
    factionRecordKey: "tactical_cards:kerrigan_s_swarm",
    tacticalCardRecordKeys: [
      "tactical_cards:accelerating_creep", "tactical_cards:hatchery",
      "tactical_cards:hydralisk_den", "tactical_cards:overlord",
      "tactical_cards:spawning_pool__six_pool_",
    ],
    units: [
      { unitInstanceId: "player2-kerrigan", recordKey: "army_units:kerrigan",
        compositionKind: "small", upgradeNames: [] },
      { unitInstanceId: "player2-kerrigan-raptor",
        recordKey: "army_units:kerrigan_swarm_raptor__zergling_",
        compositionKind: "small", upgradeNames: [] },
      { unitInstanceId: "player2-corpser", recordKey: "army_units:corpser__roach_",
        compositionKind: "small", upgradeNames: [
          "Burrow Ambush", "Glial Reconstitution", "Hydriodic Bile", "Tunneling Claws",
        ] },
      { unitInstanceId: "player2-vile", recordKey: "army_units:vile__roach_",
        compositionKind: "small", upgradeNames: [
          "Burrow Ambush", "Glial Reconstitution", "Hydriodic Bile", "Tunneling Claws",
        ] },
      { unitInstanceId: "player2-swarmling",
        recordKey: "army_units:swarmling__zergling_", compositionKind: "small",
        upgradeNames: ["Burrow Ambush"] },
      { unitInstanceId: "player2-queen", recordKey: "army_units:queen",
        compositionKind: "small", upgradeNames: ["Creep Speed", "Domineering Presence"] },
      { unitInstanceId: "player2-hydralisk", recordKey: "army_units:hydralisk",
        compositionKind: "small",
        upgradeNames: ["Ancillary Carapace", "Grooved Spines", "Lurking"] },
      { unitInstanceId: "player2-raptor", recordKey: "army_units:raptor__zergling_",
        compositionKind: "large", upgradeNames: [] },
    ],
  },
});

function exactChoice(bundle, state, playerId, kind, predicate = () => true,
  chanceReveals) {
  const choices = enumerateOfficialMissionDeploymentDraftChoicesV1({
    missionDeploymentDraftDataBundle: bundle, draftState: state, playerId,
  });
  const selected = choices.find((entry) => entry.choiceKind === kind && predicate(entry));
  if (!selected) fail("STANDARD_ROOM_DRAFT_CHOICE_UNAVAILABLE", `${playerId}:${kind}`);
  return applyOfficialMissionDeploymentDraftChoiceV1({
    missionDeploymentDraftDataBundle: bundle, draftState: state, playerId,
    choiceId: selected.choiceId, chanceReveals,
  }).draftState;
}

function pairIncluding(rows, targetRecordKey) {
  const target = rows.find((entry) => entry.recordKey === targetRecordKey);
  const alternate = rows.find((entry) => entry.recordKey !== targetRecordKey);
  if (!target || !alternate) fail("STANDARD_ROOM_DRAFT_TARGET_INVALID", targetRecordKey);
  return [target.recordKey, alternate.recordKey].sort();
}

function sameStringSet(left, right) {
  return Array.isArray(left) && Array.isArray(right)
    && isDeepStrictEqual([...left].sort(), [...right].sort());
}

export function completeOfficialRoomDraftV1(bundle, missionRecordKey,
  deploymentRecordKey, engagementScale = "Standard") {
  const missionKeys = pairIncluding(bundle.missionProfiles.filter((entry) => (
    entry.engagementScale === engagementScale)), missionRecordKey);
  const deploymentKeys = pairIncluding(bundle.deploymentProfiles.filter((entry) => (
    entry.engagementScale === engagementScale)), deploymentRecordKey);
  let state = createOfficialMissionDeploymentDraftStateV1({
    missionDeploymentDraftDataBundle: bundle,
    participantIds: SIDE_KEYS, engagementScale,
  });
  const submittedPair = (entry) => (
    sameStringSet(entry.value.missionRecordKeys, missionKeys)
      && sameStringSet(entry.value.deploymentRecordKeys, deploymentKeys)
  );
  state = exactChoice(bundle, state, "player1", "submit_draft_set", submittedPair);
  state = exactChoice(bundle, state, "player2", "submit_draft_set", submittedPair);
  state = exactChoice(bundle, state, "player1", "resolve_opening_roll_off", () => true,
    [6, 5, 1, 1].map((outcome, counter) => ({ counter, faces: 6, outcome })));
  state = exactChoice(bundle, state, "player1", "choose_player_colour",
    (entry) => entry.value.colour === "red");
  state = exactChoice(bundle, state, "player1", "choose_draft_control",
    (entry) => entry.value.controlledDraft === "deployment");
  state = exactChoice(bundle, state, "player1", "eliminate_mission_cards",
    (entry) => state.missionDraft.remainingOccurrenceIds
      .filter((id) => !entry.value.occurrenceIds.includes(id))
      .some((id) => state.faceUpRows.mission.find((row) => (
        row.occurrenceId === id))?.recordKey === missionRecordKey));
  state = exactChoice(bundle, state, "player2", "select_mission_card",
    (entry) => state.faceUpRows.mission.find((row) => (
      row.occurrenceId === entry.value.occurrenceId))?.recordKey === missionRecordKey);
  state = exactChoice(bundle, state, "player2", "eliminate_deployment_cards",
    (entry) => state.deploymentDraft.remainingOccurrenceIds
      .filter((id) => !entry.value.occurrenceIds.includes(id))
      .some((id) => state.faceUpRows.deployment.find((row) => (
        row.occurrenceId === id))?.recordKey === deploymentRecordKey));
  state = exactChoice(bundle, state, "player1", "select_deployment_card",
    (entry) => state.faceUpRows.deployment.find((row) => (
      row.occurrenceId === entry.value.occurrenceId))?.recordKey === deploymentRecordKey);
  return state;
}

function factionReference(profile, sideKey) {
  return { cardInstanceId: `${sideKey}-faction`, recordKey: profile.recordKey,
    sourceRecordHash: profile.sourceRecordHash, payloadHash: profile.payloadHash,
    profileHash: profile.profileHash };
}
function tacticalReference(profile, sideKey, ordinal) {
  return { cardInstanceId: `${sideKey}-tactical-${ordinal}`,
    recordKey: profile.recordKey, sourceRecordHash: profile.sourceRecordHash,
    payloadHash: profile.payloadHash, budgetProfileHash: profile.budgetProfileHash };
}

export function buildOfficialRoomArmyAuditV1(bundle, sideKey, recipe,
  configuration = {}) {
  const scaleId = String(configuration.scaleId || "Standard");
  const mineralBudget = Number(configuration.mineralBudget ?? 2000);
  const armyBundle = bundle.armyResourceBudgetDataBundle;
  const factionBundle = armyBundle.factionArmyEligibilityDataBundle;
  const faction = factionBundle.factionProfiles.find((entry) => (
    entry.recordKey === recipe.factionRecordKey));
  if (!faction) fail("STANDARD_ROOM_FACTION_UNKNOWN", recipe.factionRecordKey);
  const tacticalCardInstances = recipe.tacticalCardRecordKeys.map((recordKey, index) => {
    const profile = armyBundle.tacticalBudgetProfiles.find((entry) => (
      entry.recordKey === recordKey));
    if (!profile) fail("STANDARD_ROOM_TACTICAL_CARD_UNKNOWN", recordKey);
    return tacticalReference(profile, sideKey, index + 1);
  });
  if (recipe.factionRecordKey === "tactical_cards:kerrigan_s_swarm") {
    const creepCards = recipe.tacticalCardRecordKeys.filter((recordKey) => (
      ["tactical_cards:accelerating_creep", "tactical_cards:malignant_creep"]
        .includes(recordKey)));
    if (creepCards.length !== 1) fail("STANDARD_ROOM_KERRIGAN_CREEP_CARD_REQUIRED");
  }
  const unitSelections = recipe.units.map((unitRecipe) => {
    const unit = bundle.unitCompositionProfiles.find((entry) => (
      entry.recordKey === unitRecipe.recordKey));
    const composition = unit?.compositionOptions.find((entry) => (
      entry.compositionKind === unitRecipe.compositionKind));
    if (!unit || !composition) {
      fail("STANDARD_ROOM_UNIT_COMPOSITION_UNKNOWN", unitRecipe.unitInstanceId);
    }
    const startingModelIds = Array.from({ length: composition.startingModels },
      (_unused, index) => `${unitRecipe.unitInstanceId}-model-${index + 1}`);
    const specialistIds = [...startingModelIds];
    const selectedUpgrades = unitRecipe.upgradeNames.map((upgradeName, index) => {
      const profile = bundle.purchasableUpgradeProfiles.find((entry) => (
        entry.recordKey === unitRecipe.recordKey && entry.upgradeName === upgradeName));
      if (!profile) fail("STANDARD_ROOM_UPGRADE_UNKNOWN",
        `${unitRecipe.unitInstanceId}:${upgradeName}`);
      const nominatedModelId = profile.specialistAssignmentRequired
        ? specialistIds.shift() : null;
      if (profile.specialistAssignmentRequired && !nominatedModelId) {
        fail("STANDARD_ROOM_SPECIALIST_MODEL_UNAVAILABLE", unitRecipe.unitInstanceId);
      }
      return { upgradeInstanceId: `${unitRecipe.unitInstanceId}-upgrade-${index + 1}`,
        purchasableUpgradeProfileId: profile.purchasableUpgradeProfileId,
        profileHash: profile.profileHash,
        sourceDefinitionHash: profile.sourceDefinitionHash,
        sourceBudgetProfileHash: profile.sourceBudgetProfileHash,
        ...(nominatedModelId ? { nominatedModelId } : {}) };
    });
    return { unitCompositionInput: {
      unitInstanceId: unitRecipe.unitInstanceId, recordKey: unitRecipe.recordKey,
      compositionProfileId: composition.compositionProfileId, startingModelIds,
      sourceRecordHash: unit.sourceRecordHash, payloadHash: unit.payloadHash,
      sourceUnitProfileHash: unit.sourceUnitProfileHash,
      unitCompositionReferenceProfileHash: unit.profileHash,
      compositionProfileHash: composition.profileHash,
      rulesOwnedCompositionRequested: true, exactlyOneCompositionSelected: true,
    }, selectedUpgrades, upgradeSelectionSetComplete: true };
  });
  const audit = resolveOfficialCompleteArmyCompositionUpgradeAuditV1({
    procedureKind: "complete_army_composition_upgrade_audit",
    unitCompositionUpgradeDataBundle: bundle,
    compositionUpgradeUnitSetComplete: true,
    rulesOwnedCompleteArmyAuditRequested: true, unitSelections,
    armyResourceBudgetInput: {
      sideKey, scaleId, mineralBudget,
      factionCard: factionReference(faction, sideKey), tacticalCardInstances,
      armyPurchaseSetComplete: true, rulesOwnedResourceArithmeticRequested: true,
      unspentResourceDisposition: "lost", resourceConversionRequested: false,
    },
  });
  if (audit.armyResourceBudgetResult.mineralSpent !== mineralBudget) {
    fail("STANDARD_ROOM_EXACT_MINERAL_SPEND_REQUIRED",
      `${sideKey}:${audit.armyResourceBudgetResult.mineralSpent}`);
  }
  return audit;
}

export function createOfficialRoomCardResourcesV1(dataset, registry, sideKey) {
  const roster = registry.rostersByPlayer[sideKey];
  const raceTag = roster.factionCard.raceTag;
  const resourceType = raceTag === "Zerg" ? "Biomass"
    : raceTag === "Protoss" ? "Energy" : "CP";
  return roster.publicCards.map((card) => {
    const record = getOfficialCurrentProductRecord(dataset, card.recordKey);
    return { id: card.cardInstanceId, cardInstanceId: card.cardInstanceId,
      sideKey, officialCardRecordKey: card.recordKey,
      sourceRecordHash: record.sourceRecordHash, officialPayloadHash: record.payloadHash,
      cardKind: card.cardKind, cardName: card.cardName,
      resource: Number(record.payload.resource || 0), resourceType,
      readiness: "ready", face: "up", activeEffects: [], trainingTruth: false };
  });
}

export function createOfficialRoomPieceFromRosterUnitV1(dataset,
  modelGeometryBundle, registryContext,
  sideKey, unit) {
  const composition = unit.unitCompositionResult;
  const record = getOfficialCurrentProductRecord(dataset, unit.recordKey);
  const geometry = getOfficialModelBaseGeometryProfileV1(
    modelGeometryBundle, unit.recordKey);
  const isStructure = (record.payload.upgrades || []).some((entry) => (
    String(entry.name || "").normalize("NFC").trim().toLowerCase() === "structure"));
  const printedSize = Number(record.payload.stats?.size);
  const sizeCharacteristic = Number.isFinite(printedSize) ? printedSize : 0;
  const expectedEquipment = deriveOfficialUnitExpectedEquipmentV1({
    rosterDisclosureDataBundle: registryContext.bundle,
    rosterRegistryResult: registryContext.result,
    playerId: sideKey, unitInstanceId: unit.unitInstanceId,
  });
  const equipmentByModel = new Map();
  for (const entry of expectedEquipment.equipmentRows) {
    const rows = equipmentByModel.get(entry.modelId) || [];
    rows.push(entry);
    equipmentByModel.set(entry.modelId, rows);
  }
  return {
    id: unit.unitInstanceId, unitInstanceId: unit.unitInstanceId,
    name: unit.unitName, unitName: unit.unitName, unitId: unit.unitId,
    sideKey, officialUnitRecordKey: unit.recordKey,
    sourceRecordHash: composition.sourceRecordHash,
    officialPayloadHash: composition.payloadHash,
    formationSize: composition.compositionKind,
    compositionKind: composition.compositionKind,
    armySlotType: composition.armySlotType,
    currentModels: composition.startingModelCount,
    maxModels: composition.startingModelCount,
    currentSupply: composition.startingSupply,
    sizeCharacteristic,
    destroyedModelIds: [], isOnField: false, isInReserves: true,
    isDestroyed: false, isStructure,
    combatTag: String(record.payload.tags || "").toLowerCase().includes("flying")
      ? "flying" : "ground",
    combatTags: String(record.payload.tags || "").split(",")
      .map((entry) => entry.trim().toLowerCase()).filter(Boolean).sort(),
    coherencyStatus: { schemaVersion: "starcraft_tmg_unit_coherency_status_v1",
      status: "reserve", isOutOfCoherency: false },
    statuses: Number(record.payload.stats?.shield || 0) > 0 ? ["Shielded"] : [],
    firstModelShieldCapacityApplied: Number(record.payload.stats?.shield || 0) > 0,
    selectedUpgradeNames: unit.selectedUpgrades.map((entry) => entry.upgradeName).sort(),
    selectedUpgrades: clone(unit.selectedUpgrades),
    equipment: clone(expectedEquipment.equipmentRows), weaponChoices: [],
    assignedUpgradeByModelId: Object.fromEntries(composition.startingModelIds.map(
      (modelId) => [modelId, (equipmentByModel.get(modelId) || [])
        .filter((entry) => entry.equipmentSourceKind === "selected_upgrade_or_weapon_swap")
        .map((entry) => entry.equipmentName).sort()])),
    combatEffects: [], assaultEffects: [], damageMarker: 0,
    activatedPhases: { movement: false, assault: false, combat: false },
    officialRosterUnitResultHash: unit.resultHash,
    expectedEquipmentResultHash: expectedEquipment.resultHash,
    deploymentStatus: "in_reserves_awaiting_legal_deploy",
    models: composition.startingModelIds.map((modelId) => ({
      id: modelId, baseShape: geometry.baseShape,
      baseWidthInches: geometry.baseWidthMilliInches / 1000,
      baseDepthInches: geometry.baseDepthMilliInches / 1000,
      baseRotationDegrees: 0, elevation: "ground_level",
      supportTerrainIds: [], adjacentAccessPointIds: [],
      damage: 0, remainingWounds: Number(record.payload.stats?.hp || 0),
      isOnField: false, isDestroyed: false,
    })),
    trainingTruth: false,
  };
}

function applyReserveMutation(state, resolution) {
  for (const patch of resolution.mutation.piecePatches) {
    const piece = state.pieces.find((entry) => entry.id === patch.pieceId);
    if (!piece || hashStarcraftTmgContract(piece) !== patch.expectedBeforePieceHash) {
      fail("STANDARD_ROOM_RESERVE_MUTATION_PRECONDITION_FAILED", patch.pieceId);
    }
    Object.assign(piece, clone(patch.set));
    for (const field of patch.deleteFields) delete piece[field];
    for (const modelPatch of patch.modelPatches) {
      const model = piece.models.find((entry) => entry.id === modelPatch.modelId);
      if (!model) fail("STANDARD_ROOM_RESERVE_MODEL_UNKNOWN", modelPatch.modelId);
      Object.assign(model, clone(modelPatch.set));
      for (const field of modelPatch.deleteFields) delete model[field];
    }
  }
}

function versionFor(dataset) {
  const versions = dataset.dataVersions || {};
  return [versions.unitsVersion, versions.cardsVersion, versions.rulesVersion]
    .map((entry) => String(entry || "unbound")).join("/");
}

export function createOfficialStandardRoomInitialStateAuthorityV1(input = {}) {
  const dataset = input.dataset;
  const snapshot = input.snapshot;
  if (!object(dataset) || !object(snapshot)) fail("STANDARD_ROOM_SOURCE_INPUT_REQUIRED");
  const recipes = clone(input.recipes || OFFICIAL_STANDARD_2000_ROOM_RECIPES_V1);
  if (!isDeepStrictEqual(Object.keys(recipes).sort(), [...SIDE_KEYS])) {
    fail("STANDARD_ROOM_TWO_SIDE_RECIPES_REQUIRED");
  }
  const missionRecordKey = String(input.missionRecordKey || HOLD_POSITION);
  const deploymentRecordKey = String(input.deploymentRecordKey || GAUNTLET);
  if (missionRecordKey !== HOLD_POSITION) {
    fail("STANDARD_ROOM_GAMEPLAY_BUNDLE_MISSION_UNSUPPORTED", missionRecordKey);
  }
  const rosterBundle = createOfficialRosterDisclosureDataBundleV1({ dataset });
  const compositionBundle = rosterBundle.unitCompositionUpgradeDataBundle;
  const audits = Object.fromEntries(SIDE_KEYS.map((sideKey) => [
    sideKey, buildOfficialRoomArmyAuditV1(compositionBundle, sideKey, recipes[sideKey]),
  ]));
  const players = Object.fromEntries(SIDE_KEYS.map((sideKey) => [sideKey, {
    sideKey, playerId: sideKey,
    label: sideKey === "player1" ? "Terran Commander" : "Kerrigan's Swarm Commander",
    faction: audits[sideKey].armyResourceBudgetResult.factionCard.raceTag,
    factionName: audits[sideKey].armyResourceBudgetResult.factionCard.factionName,
    factionTags: clone(audits[sideKey].armyResourceBudgetResult.factionCard.factionTags),
    passedPhases: {}, trainingTruth: false,
  }]));
  const scaleAgreement = resolveOfficialEngagementScaleAgreementV1({
    procedureKind: "engagement_scale_agreement",
    factionArmyEligibilityDataBundle:
      compositionBundle.armyResourceBudgetDataBundle.factionArmyEligibilityDataBundle,
    state: { players }, rulesOwnedPlayerDenominatorRequested: true,
    playerAgreementSetComplete: true,
    playerAgreements: SIDE_KEYS.map((playerId) => ({
      playerId, scaleId: "Standard", agreed: true,
    })),
  });
  const registry = resolveOfficialRosterRegistryAuditV1({
    procedureKind: "roster_registry_audit", rosterDisclosureDataBundle: rosterBundle,
    state: { players }, teamGame: false,
    armyCompositionUpgradeAuditsBySide: audits,
    rosterSetComplete: true, rulesOwnedRosterProjectionRequested: true,
  });
  const closedLists = input.rosterVisibility === "closed";
  const agreements = SIDE_KEYS.map((playerId) => (
    resolveOfficialClosedListAgreementSubmissionV1({
      procedureKind: "closed_list_agreement_submission",
      rosterDisclosureDataBundle: rosterBundle, rosterRegistryResult: registry,
      playerId, closedListsAgreed: closedLists, personalDecisionConfirmed: true,
      rulesOwnedAgreementIdentityRequested: true,
    })
  ));
  const visibility = resolveOfficialRosterVisibilityV1({
    procedureKind: "roster_visibility_resolution",
    rosterDisclosureDataBundle: rosterBundle, rosterRegistryResult: registry,
    rulesOwnedVisibilityRequested: true, playerAgreementSetComplete: true,
    playerClosedListAgreements: agreements.map((entry) => ({
      playerId: entry.playerId, closedListsAgreed: entry.closedListsAgreed,
    })),
  });
  const draftBundle = createOfficialMissionDeploymentDraftDataBundleV1({ dataset });
  const draft = completeOfficialRoomDraftV1(
    draftBundle, missionRecordKey, deploymentRecordKey);
  const geometryBundle = createOfficialDeploymentGeometryDataBundleV1({
    dataset, missionDeploymentDraftDataBundle: draftBundle,
  });
  const geometryBinding = createOfficialDeploymentGeometryBindingV1({
    deploymentGeometryDataBundle: geometryBundle,
    missionDeploymentDraftDataBundle: draftBundle,
    missionDeploymentDraftState: draft,
  });
  const terrainLedger = createOfficialTerrainHeightTierLedgerV1({
    deploymentGeometryBinding: geometryBinding,
    terrainPieces: clone(input.terrainPieces || []),
  });
  const markerPlacement = finalizeOfficialMissionMarkerPlacementV1({
    deploymentGeometryBinding: geometryBinding,
    terrainHeightTierLedger: terrainLedger,
  });
  const gameplayBundle = createOfficialGameplayDataBundleV1({
    snapshot, dataset,
    unitRecordKeys: [...new Set(SIDE_KEYS.flatMap((sideKey) => (
      recipes[sideKey].units.map((entry) => entry.recordKey))))],
    missionRecordKey,
    reserveDeployData: true,
  });
  const legacyMissionBinding = createOfficialMissionSetupBindingV1({
    gameplayDataBundle: gameplayBundle,
    missionDraftReceiptHash: draft.draftBinding.missionDraftReceiptHash,
    deploymentDraftReceiptHash: draft.draftBinding.deploymentDraftReceiptHash,
    seatColorAssignment: draft.colourByPlayer,
  });
  const modelGeometryBundle = createOfficialModelBaseGeometryDataBundleV1({ dataset });
  const unitSupplyBundle = createOfficialUnitCardSupplyDataBundleV1({ dataset });
  const reserveLifecycleBundle = createOfficialReserveLifecycleDataBundleV1({
    dataset, gameplayDataBundle: gameplayBundle,
  });
  const registryContext = { bundle: rosterBundle, result: registry };
  let state = {
    schemaVersion: "starcraft_tmg_state_v0", gameId: "starcraft-tmg",
    dataVersion: versionFor(dataset), dataBundleHash: gameplayBundle.gameplayDataBundleHash,
    sourceRefreshPerformed: false, repositoryFallbackUsed: false,
    rulesTruth: "official_standard_2000_room_server_composition",
    round: 1, phase: "setup", stage: "army_in_reserves",
    activeSideKey: "player1", firstPlayerSideKey: "player1",
    firstPassSideByPhase: {}, phaseFirstActorByRound: {},
    players, participantIds: [...SIDE_KEYS], teamGame: false,
    colourByPlayer: clone(draft.colourByPlayer),
    controllerByDraft: clone(draft.controllerByDraft),
    scores: { player1: 0, player2: 0 },
    selectedMission: clone(draft.selectedMission),
    selectedDeployment: clone(draft.selectedDeployment),
    mission: { id: draft.selectedMission.profile.missionId,
      name: draft.selectedMission.profile.name,
      recordKey: draft.selectedMission.profile.recordKey },
    officialMissionDeploymentDraft: clone(draft),
    officialMissionDeploymentDraftBinding: clone(draft.draftBinding),
    officialMissionDeploymentDraftDataBundle: draftBundle,
    officialDeploymentGeometryDataBundle: geometryBundle,
    officialDeploymentGeometryBinding: geometryBinding,
    officialTerrainHeightTierLedger: terrainLedger,
    officialMissionMarkerPlacement: markerPlacement,
    officialMissionSetupBinding: legacyMissionBinding,
    officialGameplayDataBundle: gameplayBundle,
    officialCombatProfileBundle: gameplayBundle.combatProfileBundle,
    officialModelBaseGeometryDataBundle: modelGeometryBundle,
    officialRosterDisclosureDataBundle: rosterBundle,
    officialUnitCompositionUpgradeDataBundle: compositionBundle,
    officialArmyResourceBudgetDataBundle: compositionBundle.armyResourceBudgetDataBundle,
    officialFactionArmyEligibilityDataBundle:
      compositionBundle.armyResourceBudgetDataBundle.factionArmyEligibilityDataBundle,
    officialUnitCardSupplyDataBundle: unitSupplyBundle,
    officialReserveLifecycleDataBundle: reserveLifecycleBundle,
    armyBuildingEngagementScale: scaleAgreement, engagementScale: "Standard",
    armyBuildingConfigurationBySide: recipes,
    armyResourceBudgetsBySide: Object.fromEntries(SIDE_KEYS.map((sideKey) => [
      sideKey, audits[sideKey].armyResourceBudgetResult,
    ])),
    unitCompositionSelectionsBySide: Object.fromEntries(SIDE_KEYS.map((sideKey) => [
      sideKey, audits[sideKey].units.map((entry) => entry.unitCompositionResult),
    ])),
    unitUpgradeSelectionsBySide: Object.fromEntries(SIDE_KEYS.map((sideKey) => [
      sideKey, audits[sideKey].units.map((entry) => entry),
    ])),
    armyCompositionUpgradeAuditsBySide: audits,
    authoritativeRosterRegistry: registry,
    authoritativeArmyRostersBySide: registry.rostersByPlayer,
    rosterRegistryResolution: registry,
    rosterVisibilityAgreementsByPlayer: Object.fromEntries(
      agreements.map((entry) => [entry.playerId, entry])),
    rosterVisibilityResolution: visibility,
    publicRosterDisclosureBySide: visibility.publicDisclosureBySide,
    equipmentDisclosureByUnit: {}, equipmentReminderPermitsByActionHash: {},
    privateRosterDisclosureConductIncidents: [], onTableUnitInspectionsBySide: {},
    board: {
      widthInches: geometryBinding.battlefield.widthInches,
      heightInches: geometryBinding.battlefield.heightInches,
      scenarioMapId: geometryBinding.deploymentRecordKey,
      scenarioMapName: draft.selectedDeployment.profile.name,
      deploymentId: geometryBinding.deploymentRecordKey,
      deploymentName: draft.selectedDeployment.profile.name,
      deploymentImageUrl: draft.selectedDeployment.profile.frontUrl,
      mapSourceType: "official_current_deployment_card",
      terrain: terrainLedger.terrainPieces.map((entry) => ({
        id: entry.terrainPieceId, terrainId: entry.terrainPieceId,
        elevation: entry.heightTier, footprint: clone(entry.footprint),
        impassable: entry.impassable, isRemoved: false, trainingTruth: false,
      })),
      accessPoints: [], tokens: [], markers: [], effectMarkers: [],
      missionMarkers: markerPlacement.missionMarkers.map((entry) => ({
        id: `mission-marker-${entry.number}`, number: entry.number,
        xInches: entry.coordinate.x, yInches: entry.coordinate.y,
        diameterMillimeters: entry.diameterMm, diameterInches: entry.diameterInches,
        elevation: entry.elevation, supportTerrainPieceId: entry.supportTerrainPieceId,
        physicalPresence: false, blocksLineOfSight: false, blocksMovement: false,
        isActivated: true, isRemoved: false, activationRound: 0,
        controlSideKey: null, factionIndicatorSideKey: null,
        affinityColour: entry.affinityColour, trainingTruth: false,
      })),
      missionMarkerControlGeometry: {
        schemaVersion: "starcraft_tmg_mission_marker_control_geometry_v1",
        markerCoordinatesComplete: true, markerFootprintsComplete: true,
        markerElevationsComplete: true, lineOfSightTerrainComplete: true,
      },
      engagementGeometry: {
        schemaVersion: "starcraft_tmg_engagement_geometry_input_v2",
        modelCoordinatesComplete: true, baseFootprintsComplete: true,
        terrainFootprintsComplete: true, elevationSupportsComplete: true,
        accessPointAdjacencyComplete: true,
      }, trainingTruth: false,
    },
    cardResources: Object.fromEntries(SIDE_KEYS.map((sideKey) => [
      sideKey, createOfficialRoomCardResourcesV1(dataset, registry, sideKey),
    ])),
    pieces: SIDE_KEYS.flatMap((sideKey) => registry.rostersByPlayer[sideKey].units
      .map((unit) => createOfficialRoomPieceFromRosterUnitV1(dataset, modelGeometryBundle,
        registryContext, sideKey, unit))),
    activeAbilityUseHistory: [], reserveLifecycleHistory: [],
    rosterDisclosureRulesHistory: [], missionDeploymentDraftHistory: [],
    deploymentGeometryHistory: [], unitCompositionUpgradeRulesHistory: [],
    armyResourceBudgetRulesHistory: [], factionArmyEligibilityRulesHistory: [],
    gameOver: false, terminal: false, winner: "", terminalReason: "", log: [],
    eligibleForTraining: false, trainingTruth: false,
  };
  const missionCatalogue = createOfficialMissionEffectCatalogueV1({
    missionDeploymentDraftDataBundle: draftBundle,
  });
  const missionRuntime = createOfficialMissionRuntimeV2({
    missionEffectCatalogue: missionCatalogue,
  });
  state = clone(missionRuntime.initialize({
    state, missionRecordKey,
    markerAffinityByNumber: draft.draftBinding.markerAffinityByNumber,
  }).state);
  const reserveResolution = resolveOfficialArmyInitialReservesV1({
    procedureKind: "army_initial_reserves", state,
    reserveLifecycleDataBundle: reserveLifecycleBundle,
    unitCardSupplyDataBundle: unitSupplyBundle,
    rulesOwnedStateRequested: true, armyListUnitDenominatorComplete: true,
  });
  applyReserveMutation(state, reserveResolution);
  state.reserveLifecycleHistory = [clone(reserveResolution)];
  state.lastReserveLifecycleResolution = clone(reserveResolution);
  state.reserveManifestBySide = Object.fromEntries(SIDE_KEYS.map((sideKey) => [
    sideKey, state.pieces.filter((piece) => piece.sideKey === sideKey)
      .map((piece) => ({ pieceId: piece.id, currentSupply: piece.currentSupply,
        deploymentStatus: piece.deploymentStatus,
        selectedUpgradeNames: [...piece.selectedUpgradeNames] })),
  ]));
  state.officialActionRouteCatalogue = createOfficialStandardActionRouteCatalogueV1({
    dataset, state,
  });
  state.officialMissionEffectCatalogue = missionCatalogue;
  state.officialMissionRuntimeDescriptor = missionRuntime.descriptor;
  const dependencies = {
    sourceSnapshot: { artifactId: "official-development-tranche-command-center-snapshot",
      content: snapshot },
    dataSnapshot: { artifactId: "official-standard-2000-gameplay-data-v1",
      content: gameplayBundle },
    geometryArtifact: { artifactId: "official-standard-selected-deployment-geometry-v1",
      content: { geometryBinding, terrainLedger, markerPlacement,
        missionRuntimeDescriptor: missionRuntime.descriptor } },
  };
  const authorityBody = {
    schema: OFFICIAL_STANDARD_ROOM_FACTORY_SCHEMA,
    version: OFFICIAL_STANDARD_ROOM_FACTORY_VERSION, source: "server_factory",
    setupId: String(input.setupId || "official-standard-2000-hold-gauntlet-v1"),
    state, dataVersion: versionFor(dataset), dependencies,
    serverSeatPlan: clone(input.serverSeatPlan || [
      { label: "host", seatKey: "player1", roleMode: "supervisor",
        principalType: "human" },
      { label: "guest", seatKey: "player2", roleMode: "supervisor",
        principalType: "human" },
    ]),
    compositionEvidence: {
      scale: "Standard", mineralBudgetBySide: { player1: 2000, player2: 2000 },
      mineralSpentBySide: Object.fromEntries(SIDE_KEYS.map((sideKey) => [
        sideKey, audits[sideKey].armyResourceBudgetResult.mineralSpent,
      ])),
      rosterHashBySide: Object.fromEntries(SIDE_KEYS.map((sideKey) => [
        sideKey, registry.rostersByPlayer[sideKey].rosterHash,
      ])),
      allArmyListUnitsBeginInReserves: true,
      missionRuntimeHash: missionRuntime.descriptor.runtimeHash,
      missionEffectCatalogueHash: missionCatalogue.catalogueHash,
      rosterVisibility: visibility.rosterVisibility,
      selectedMissionRecordKey: missionRecordKey,
      selectedDeploymentRecordKey: deploymentRecordKey,
      sourceSnapshotHash: dataset.sourceSnapshotHash,
      normalizedDatasetHash: dataset.datasetHash,
      rulesOwnedTotalsAndProjection: true,
      clientSuppliedCostsTotalsOrProjectionAccepted: false,
      actionRouteCatalogueHash: state.officialActionRouteCatalogue.catalogueHash,
      fieldedActionRouteDenominatorComplete: true,
      genericDeploymentExecutorReady: true,
      genericDeploymentExecutorOwner: "official-standard-reserve-deploy-adapter-v1",
      genericDeploymentExecutorProductionReady: false,
      trainingTruth: false,
    }, trainingTruth: false,
  };
  const authority = deepFreeze({ ...authorityBody,
    receiptHash: hashStarcraftTmgContract(authorityBody) });
  verifyOfficialStandardRoomInitialStateAuthorityV1(authority);
  return authority;
}

export function verifyOfficialStandardRoomInitialStateAuthorityV1(authority) {
  if (!object(authority)
    || authority.schema !== OFFICIAL_STANDARD_ROOM_FACTORY_SCHEMA
    || authority.version !== OFFICIAL_STANDARD_ROOM_FACTORY_VERSION
    || authority.source !== "server_factory"
    || authority.receiptHash !== hashStarcraftTmgContract(
      without(authority, ["receiptHash"]))
    || authority.state?.engagementScale !== "Standard"
    || authority.state?.pieces?.length < 2
    || authority.state.pieces.some((piece) => (
      piece.isOnField !== false || piece.isInReserves !== true))
    || authority.compositionEvidence?.mineralSpentBySide?.player1 !== 2000
    || authority.compositionEvidence?.mineralSpentBySide?.player2 !== 2000
    || authority.compositionEvidence?.allArmyListUnitsBeginInReserves !== true
    || authority.compositionEvidence?.genericDeploymentExecutorReady !== true
    || authority.compositionEvidence?.genericDeploymentExecutorProductionReady !== false
    || authority.compositionEvidence?.actionRouteCatalogueHash
      !== authority.state?.officialActionRouteCatalogue?.catalogueHash
    || !HASH_PATTERN.test(String(authority.compositionEvidence?.missionRuntimeHash || ""))
    || authority.trainingTruth !== false) {
    fail("STANDARD_ROOM_INITIAL_STATE_AUTHORITY_INVALID");
  }
  return true;
}
