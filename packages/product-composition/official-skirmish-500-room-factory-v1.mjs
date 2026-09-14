import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { projectStarcraftTmgStateForViewerV3 } from
  "../room-runtime/in-memory-room-v1.mjs";
import {
  certifyOfficialBalancedTerrainSetupV1,
  OFFICIAL_BALANCED_TERRAIN_SETUP_PLAN_SCHEMA,
  verifyOfficialBalancedTerrainArtifactsV1,
} from "../rule-atoms/official-balanced-terrain-rules-kernel-v1.mjs";
import { resolveOfficialEngagementScaleAgreementV1 } from
  "../rule-atoms/official-faction-army-eligibility-rules-kernel-v1.mjs";
import { createOfficialDeploymentGeometryBindingV1 } from
  "../rule-atoms/official-deployment-geometry-rules-kernel-v1.mjs";
import { createOfficialTerrainElevationAgreementV1 } from
  "../rule-atoms/official-elevation-effective-size-rules-kernel-v1.mjs";
import { createOfficialMissionRuntimeV2 } from
  "../rule-atoms/official-mission-runtime-v2.mjs";
import {
  resolveOfficialClosedListAgreementSubmissionV1,
  resolveOfficialRosterRegistryAuditV1,
  resolveOfficialRosterVisibilityV1,
} from "../rule-atoms/official-roster-disclosure-rules-kernel-v1.mjs";
import { createOfficialSupplyLossLedgerV1 } from
  "../rule-atoms/official-supply-loss-ledger-v1.mjs";
import { createOfficialAttackProfileCatalogueV1 } from
  "../source-data/official-attack-profile-catalogue-v1.mjs";
import { createOfficialAttackProfileCatalogueV2 } from
  "../source-data/official-attack-profile-catalogue-v2.mjs";
import { createOfficialAbilityEffectIrCatalogueV1 } from
  "../source-data/official-ability-effect-ir-v1.mjs";
import { createOfficialBalancedTerrainRulesDataBundleV1 } from
  "../source-data/official-balanced-terrain-rules-data-bundle-v1.mjs";
import { createOfficialCardBuildPaymentDataBundleV1 } from
  "../source-data/official-card-build-payment-data-bundle-v1.mjs";
import { createOfficialDeploymentGeometryDataBundleV1 } from
  "../source-data/official-deployment-geometry-data-bundle-v1.mjs";
import { createOfficialMatchGameplayDataBundleV2 } from
  "../source-data/official-match-gameplay-data-bundle-v2.mjs";
import { createOfficialMissionDeploymentDraftDataBundleV1 } from
  "../source-data/official-mission-deployment-draft-data-bundle-v1.mjs";
import { createOfficialModelBaseGeometryDataBundleV1 } from
  "../source-data/official-model-base-geometry-data-bundle-v1.mjs";
import { createOfficialRosterDisclosureDataBundleV1 } from
  "../source-data/official-roster-disclosure-data-bundle-v1.mjs";
import { createOfficialTerrainLosDataBundleV1 } from
  "../source-data/official-terrain-los-data-bundle-v1.mjs";
import { createOfficialUnitCardSupplyDataBundleV1 } from
  "../source-data/official-unit-card-supply-data-bundle-v1.mjs";
import { STARCRAFT_TMG_FORMAL_500_ROSTER_RECIPES_V1 } from
  "./formal-experiment-run-manifest-v1.mjs";
import {
  createOfficialSelectedRosterAbilityRuntimeV1,
  createOfficialSelectedRosterAbilitySourceBundleV1,
  verifyOfficialSelectedRosterAbilityRuntimeDescriptorV1,
} from "./official-selected-roster-ability-runtime-v1.mjs";
import {
  createOfficialAbilityEffectRuntimeV1,
  createOfficialSelectedRosterAbilityAdapterV1,
  createOfficialSelectedRosterAbilityDefinitionBindingsV1,
  verifyOfficialAbilityEffectRuntimeDescriptorV1,
} from "./official-ability-effect-runtime-v1.mjs";
import {
  createOfficialCurrentProductAbilityDenominatorV1,
  verifyOfficialCurrentProductAbilityDenominatorV1,
} from "./official-current-product-ability-denominator-v1.mjs";
import {
  createOfficialRelocationFamilyAdapterV1,
  createOfficialRelocationFamilyDefinitionBindingsV1,
  createOfficialRelocationFamilySourceBundleV1,
  verifyOfficialRelocationFamilySourceBundleV1,
} from "./official-relocation-family-adapter-v1.mjs";
import {
  createOfficialCharacteristicStatusFamilyAdapterV1,
  createOfficialCharacteristicStatusFamilyDefinitionBindingsV1,
  createOfficialCharacteristicStatusFamilySourceBundleV1,
  verifyOfficialCharacteristicStatusFamilySourceBundleV1,
} from "./official-characteristic-status-family-adapter-v1.mjs";
import {
  createOfficialRangedFamilyAdapterV1,
  createOfficialRangedFamilyDefinitionBindingsV1,
  createOfficialRangedFamilySourceBundleV1,
  verifyOfficialRangedFamilySourceBundleV1,
} from "./official-ranged-family-adapter-v1.mjs";
import {
  createOfficialSelectedRosterMeleeActionRuntimeV1,
  verifyOfficialSelectedRosterMeleeRuntimeDescriptorV1,
} from "./official-selected-roster-melee-action-runtime-v1.mjs";
import {
  createOfficialSelectedRosterRangedActionRuntimeV1,
  verifyOfficialSelectedRosterRangedRuntimeDescriptorV1,
} from "./official-selected-roster-ranged-action-runtime-v1.mjs";
import {
  createOfficialSelectedRosterSpatialActionRuntimeV1,
  verifyOfficialSelectedRosterSpatialRuntimeDescriptorV1,
} from "./official-selected-roster-spatial-action-runtime-v1.mjs";
import { createOfficialStandardActionRouteCatalogueV1 } from
  "./official-standard-action-route-catalogue-v1.mjs";
import {
  buildOfficialRoomArmyAuditV1,
  completeOfficialRoomDraftV1,
  createOfficialRoomCardResourcesV1,
  createOfficialRoomPieceFromRosterUnitV1,
} from "./official-standard-room-factory-v1.mjs";

export const OFFICIAL_SKIRMISH_500_ROOM_FACTORY_SCHEMA =
  "starcraft_tmg_official_skirmish_500_room_initial_state_authority_v1";
export const OFFICIAL_SKIRMISH_500_ROOM_FACTORY_VERSION = "1.9.0";

const SIDE_KEYS = Object.freeze(["player1", "player2"]);
const MISSION_RECORD_KEY = "faction_cards:mission_hold_position__skirmish_";
const DEPLOYMENT_RECORD_KEY = "faction_cards:a7Ax3InF4uueg3gZ308P";
const HASH = /^[a-f0-9]{64}$/u;

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}
function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function clone(value) { return structuredClone(value); }
function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}
function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}
function seal(body, field) {
  return freezeDeep({ ...body, [field]: hashStarcraftTmgContract(body) });
}
function versionFor(dataset) {
  const versions = dataset.dataVersions || {};
  return [versions.unitsVersion, versions.cardsVersion, versions.rulesVersion]
    .map((entry) => String(entry || "unbound")).join("/");
}
function terrain(terrainPieceId, size, terrainKind, xMin, xMax, yMin, yMax,
  options = {}) {
  const footprint = { xMin, xMax, yMin, yMax };
  return { terrainPieceId, size, terrainKind,
    originalFootprint: clone(options.originalFootprint || footprint),
    footprint, heightTier: options.heightTier || "ground_level",
    standableHorizontalSurface: options.standableHorizontalSurface === true,
    openings: clone(options.openings || []),
    adjacentElevationPairs: clone(options.adjacentElevationPairs || []),
    accessPoints: clone(options.accessPoints || []) };
}
function access(accessPointId, xMin, xMax, yMin, yMax, groundApproachPath) {
  return { accessPointId, role: "ladder", footprint: { xMin, xMax, yMin, yMax },
    connects: ["ground", "high"], groundApproachPath };
}
function placementHistory(pieces) {
  return pieces.map((entry, index) => ({ ordinal: index + 1,
    terrainPieceId: entry.terrainPieceId,
    placedByPlayerId: index % 2 === 0 ? "player1" : "player2" }));
}

export function createOfficialSkirmish500BalancedTerrainPlanV1() {
  const pieces = [
    terrain("sk-grass-sw", 2, "grass", 3, 5, 3, 5),
    terrain("sk-grass-se", 2, "grass", 31, 33, 3, 5),
    terrain("sk-grass-nw", 2, "grass", 3, 5, 31, 33),
    terrain("sk-ordinary-ne", 2, "ordinary", 31, 33, 31, 33),
    terrain("sk-centre-large", 3, "ordinary", 17, 19, 17, 19, {
      heightTier: "high_ground", standableHorizontalSurface: true,
      adjacentElevationPairs: [["ground", "high"]],
      accessPoints: [access("access-sk-centre", 17, 17.5, 17, 17.5,
        [{ x: 14, y: 18 }, { x: 17.25, y: 17.25 }])],
    }),
    terrain("sk-size-one-south", 1, "ordinary", 16, 17, 3, 4),
    terrain("sk-size-one-north", 1, "ordinary", 19, 20, 32, 33),
  ];
  return {
    schema: OFFICIAL_BALANCED_TERRAIN_SETUP_PLAN_SCHEMA,
    planId: "ticket23-skirmish-500-balanced-terrain-v1",
    placementMethod: "alternating", premadeMapId: null,
    physicalLayoutConfirmedByPlayerIds: [...SIDE_KEYS],
    placementHistory: placementHistory(pieces), terrainPieces: pieces,
    size3PlusAvailable: true,
    quadrantManoeuvreLanes: [
      { quadrant: "south_west", laneId: "sk-manoeuvre-sw",
        start: { x: 8, y: 10 }, end: { x: 14, y: 10 }, widthInches: 100 / 25.4 },
      { quadrant: "south_east", laneId: "sk-manoeuvre-se",
        start: { x: 22, y: 10 }, end: { x: 28, y: 10 }, widthInches: 100 / 25.4 },
      { quadrant: "north_west", laneId: "sk-manoeuvre-nw",
        start: { x: 8, y: 26 }, end: { x: 14, y: 26 }, widthInches: 100 / 25.4 },
      { quadrant: "north_east", laneId: "sk-manoeuvre-ne",
        start: { x: 22, y: 26 }, end: { x: 28, y: 26 }, widthInches: 100 / 25.4 },
    ],
    fireLanes: [
      { laneId: "sk-fire-west", start: { x: 22, y: 0 }, end: { x: 22, y: 36 },
        widthInches: 6 },
      { laneId: "sk-fire-east", start: { x: 28, y: 0 }, end: { x: 28, y: 36 },
        widthInches: 6 },
    ],
    rulesTruth: "official_balanced_terrain_setup_plan",
    trainingTruth: false,
  };
}

function createMissionSetupBinding(gameplay, draft) {
  return seal({
    schema: "starcraft_tmg_official_mission_setup_binding_v2",
    semanticVersion: "2.0.0",
    sourceSnapshotHash: gameplay.sourceSnapshotHash,
    normalizedDatasetHash: gameplay.normalizedDatasetHash,
    gameplayDataBundleHash: gameplay.gameplayDataBundleHash,
    missionRecordKey: gameplay.missionScoringProfile.recordKey,
    missionScoringProfileHash:
      gameplay.missionScoringProfile.missionScoringProfileHash,
    missionEffectIrHash: gameplay.selectedMissionEffect.missionEffectIrHash,
    missionDraftReceiptHash: draft.draftBinding.missionDraftReceiptHash,
    deploymentDraftReceiptHash: draft.draftBinding.deploymentDraftReceiptHash,
    seatColorAssignment: clone(draft.colourByPlayer),
    markerAffinityByNumber: clone(draft.draftBinding.markerAffinityByNumber),
    affinityAssignedAfterBothDrafts: true,
    affinityGrantsControl: false,
    repositoryFallbackAllowed: false,
    rulesTruth: "official_draft_bound_marker_affinity_v2",
    trainingTruth: false,
  }, "missionSetupBindingHash");
}

function createInitialReserveReceipt(pieces, unitSupplyBundle) {
  return seal({
    schema: "starcraft_tmg_official_initial_reserve_receipt_v2",
    semanticVersion: "2.0.0",
    round: 1, phase: "setup",
    units: pieces.map((piece) => ({ pieceId: piece.id, sideKey: piece.sideKey,
      currentSupply: piece.currentSupply, currentModels: piece.currentModels,
      selectedUpgradeNames: [...piece.selectedUpgradeNames] }))
      .sort((left, right) => left.pieceId.localeCompare(right.pieceId)),
    allArmyListUnitsBeginOffBattlefieldInReserves: true,
    reserveIsOffBattlefieldHoldingAreaUntilDeployment: true,
    unitCardSupplyDataBundleHash: unitSupplyBundle.bundleHash,
    clientSuppliedMutationAccepted: false,
    rulesTruth: "official_initial_reserve_state_v2",
    trainingTruth: false,
  }, "resultHash");
}

function terrainBoardRows(artifacts, plan) {
  const planById = new Map(plan.terrainPieces.map((entry) => (
    [entry.terrainPieceId, entry])));
  return artifacts.certificate.terrainPieces.map((entry) => {
    const source = planById.get(entry.terrainPieceId);
    const runtime = artifacts.terrainPieces.find((value) => value.id === entry.terrainPieceId);
    return {
      ...clone(runtime),
      id: entry.terrainPieceId, terrainId: entry.terrainPieceId,
      terrainKind: entry.terrainKind, size: entry.size,
      footprint: clone(entry.footprint), originalFootprint: clone(entry.originalFootprint),
      elevation: entry.heightTier, heightTier: entry.heightTier,
      standableHorizontalSurface: entry.standableHorizontalSurface,
      elevationSurface: entry.standableHorizontalSurface,
      impassable: entry.terrainKind === "impassable",
      openings: clone(source?.openings || []),
      accessPoints: clone(source?.accessPoints || []),
      terrainHash: runtime?.terrainHash, isRemoved: false,
      rulesTruth: runtime?.rulesTruth,
      trainingTruth: false,
    };
  });
}

function missionMarkerRows(artifacts) {
  return artifacts.missionMarkerPlacement.missionMarkers.map((entry) => ({
    id: `mission-marker-${entry.number}`, number: entry.number,
    xInches: entry.coordinate.x, yInches: entry.coordinate.y,
    diameterMillimeters: entry.diameterMm, diameterInches: entry.diameterInches,
    elevation: entry.elevation, supportTerrainPieceId: entry.supportTerrainPieceId,
    physicalPresence: false, blocksLineOfSight: false, blocksMovement: false,
    isActivated: true, isRemoved: false, activationRound: 0,
    controlSideKey: null, factionIndicatorSideKey: null,
    affinityColour: entry.affinityColour,
    rulesTruth: "official_mission_marker_geometry",
    trainingTruth: false,
  }));
}

function projectionEvidence(state) {
  const publicProjection = projectStarcraftTmgStateForViewerV3(state, null);
  const player1Projection = projectStarcraftTmgStateForViewerV3(state, "player1");
  const player2Projection = projectStarcraftTmgStateForViewerV3(state, "player2");
  return {
    publicProjectionHash: hashStarcraftTmgContract(publicProjection),
    player1ProjectionHash: hashStarcraftTmgContract(player1Projection),
    player2ProjectionHash: hashStarcraftTmgContract(player2Projection),
    publicCardResourceSideCount: Object.keys(publicProjection.cardResources || {}).length,
    player1PrivateCardResourceSideKeys:
      Object.keys(player1Projection.cardResources || {}).sort(),
    player2PrivateCardResourceSideKeys:
      Object.keys(player2Projection.cardResources || {}).sort(),
    authorityRosterRegistryAbsentFromAllViewerProjections:
      [publicProjection, player1Projection, player2Projection].every((entry) => (
        entry.authoritativeRosterRegistry === undefined
          && entry.authoritativeArmyRostersBySide === undefined)),
  };
}

export function createOfficialSkirmish500RoomInitialStateAuthorityV1(input = {}) {
  const { dataset, snapshot } = input;
  if (!object(dataset) || !object(snapshot)) {
    fail("SKIRMISH_500_ROOM_SOURCE_INPUT_REQUIRED");
  }
  const recipes = clone(input.recipes || STARCRAFT_TMG_FORMAL_500_ROSTER_RECIPES_V1);
  if (!isDeepStrictEqual(Object.keys(recipes).sort(), [...SIDE_KEYS])) {
    fail("SKIRMISH_500_ROOM_TWO_SIDE_RECIPES_REQUIRED");
  }
  const rosterBundle = createOfficialRosterDisclosureDataBundleV1({ dataset });
  const compositionBundle = rosterBundle.unitCompositionUpgradeDataBundle;
  const audits = Object.fromEntries(SIDE_KEYS.map((sideKey) => [sideKey,
    buildOfficialRoomArmyAuditV1(compositionBundle, sideKey, recipes[sideKey], {
      scaleId: "Skirmish", mineralBudget: 500,
    })]));
  const players = Object.fromEntries(SIDE_KEYS.map((sideKey) => [sideKey, {
    sideKey, playerId: sideKey,
    label: sideKey === "player1" ? "Terran Commander" : "Kerrigan's Swarm Commander",
    faction: audits[sideKey].armyResourceBudgetResult.factionCard.raceTag,
    factionName: audits[sideKey].armyResourceBudgetResult.factionCard.factionName,
    factionTags: clone(audits[sideKey].armyResourceBudgetResult.factionCard.factionTags),
    supply: 3, commandPoints: 0, passedPhases: {}, trainingTruth: false,
  }]));
  const scaleAgreement = resolveOfficialEngagementScaleAgreementV1({
    procedureKind: "engagement_scale_agreement",
    factionArmyEligibilityDataBundle:
      compositionBundle.armyResourceBudgetDataBundle.factionArmyEligibilityDataBundle,
    state: { players }, rulesOwnedPlayerDenominatorRequested: true,
    playerAgreementSetComplete: true,
    playerAgreements: SIDE_KEYS.map((playerId) => ({
      playerId, scaleId: "Skirmish", agreed: true,
    })),
  });
  const registry = resolveOfficialRosterRegistryAuditV1({
    procedureKind: "roster_registry_audit", rosterDisclosureDataBundle: rosterBundle,
    state: { players }, teamGame: false, armyCompositionUpgradeAuditsBySide: audits,
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
    draftBundle, MISSION_RECORD_KEY, DEPLOYMENT_RECORD_KEY, "Skirmish");
  const geometryBundle = createOfficialDeploymentGeometryDataBundleV1({
    dataset, missionDeploymentDraftDataBundle: draftBundle,
  });
  const geometryBinding = createOfficialDeploymentGeometryBindingV1({
    deploymentGeometryDataBundle: geometryBundle,
    missionDeploymentDraftDataBundle: draftBundle,
    missionDeploymentDraftState: draft,
  });
  const terrainBundle = createOfficialBalancedTerrainRulesDataBundleV1({
    dataset, deploymentGeometryDataBundle: geometryBundle,
  });
  const terrainPlan = clone(input.terrainPlan
    || createOfficialSkirmish500BalancedTerrainPlanV1());
  const terrainArtifacts = certifyOfficialBalancedTerrainSetupV1({
    deploymentGeometryBinding: geometryBinding,
    deploymentGeometryDataBundle: geometryBundle,
    balancedTerrainRulesDataBundle: terrainBundle,
    setupPlan: terrainPlan,
  });
  verifyOfficialBalancedTerrainArtifactsV1({ ...terrainArtifacts,
    deploymentGeometryBinding: geometryBinding,
    balancedTerrainRulesDataBundle: terrainBundle,
  });
  const unitRecordKeys = dataset.recordIndex.filter((entry) => (
    entry.recordType === "unit"
      && entry.authorityDisposition === "official_current_product_candidate"
  )).map((entry) => entry.recordKey).sort((left, right) => left.localeCompare(right));
  const gameplayBundle = createOfficialMatchGameplayDataBundleV2({
    snapshot, dataset, missionDeploymentDraftDataBundle: draftBundle,
    missionRecordKey: MISSION_RECORD_KEY, unitRecordKeys,
  });
  const missionSetupBinding = createMissionSetupBinding(gameplayBundle, draft);
  const attackProfileCatalogue = createOfficialAttackProfileCatalogueV1({
    snapshot, dataset, recordKeys: unitRecordKeys,
  });
  const attackProfileCatalogueV2 = createOfficialAttackProfileCatalogueV2({
    previousCatalogue: attackProfileCatalogue,
  });
  const modelGeometryBundle = createOfficialModelBaseGeometryDataBundleV1({ dataset });
  const terrainLosDataBundle = createOfficialTerrainLosDataBundleV1({ dataset });
  const terrainElevationAgreement = createOfficialTerrainElevationAgreementV1({
    supportRelations: [],
  });
  const unitSupplyBundle = createOfficialUnitCardSupplyDataBundleV1({ dataset });
  const cardBuildPaymentDataBundle = createOfficialCardBuildPaymentDataBundleV1({ dataset });
  const registryContext = { bundle: rosterBundle, result: registry };
  const pieces = SIDE_KEYS.flatMap((sideKey) => registry.rostersByPlayer[sideKey].units
    .map((unit) => createOfficialRoomPieceFromRosterUnitV1(dataset,
      modelGeometryBundle, registryContext, sideKey, unit)));
  for (const piece of pieces) {
    for (const model of piece.models) model.elevation = "ground";
  }
  const reserveReceipt = createInitialReserveReceipt(pieces, unitSupplyBundle);
  let state = {
    schemaVersion: "starcraft_tmg_state_v0", gameId: "starcraft-tmg",
    dataVersion: versionFor(dataset), dataBundleHash: gameplayBundle.gameplayDataBundleHash,
    sourceRefreshPerformed: false, repositoryFallbackUsed: false,
    rulesTruth: "official_skirmish_500_room_server_composition_v1",
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
    officialBalancedTerrainRulesDataBundle: terrainBundle,
    officialBalancedTerrainSetupCertificate: terrainArtifacts.certificate,
    officialTerrainHeightTierLedger: terrainArtifacts.terrainHeightTierLedger,
    officialMissionMarkerPlacement: terrainArtifacts.missionMarkerPlacement,
    officialMissionSetupBinding: missionSetupBinding,
    officialGameplayDataBundle: gameplayBundle,
    officialCombatProfileBundle: gameplayBundle.combatProfileBundle,
    officialAttackProfileCatalogue: attackProfileCatalogue,
    officialAttackProfileCatalogueV2: attackProfileCatalogueV2,
    officialModelBaseGeometryDataBundle: modelGeometryBundle,
    officialTerrainLosDataBundle: terrainLosDataBundle,
    officialRosterDisclosureDataBundle: rosterBundle,
    officialUnitCompositionUpgradeDataBundle: compositionBundle,
    officialArmyResourceBudgetDataBundle: compositionBundle.armyResourceBudgetDataBundle,
    officialFactionArmyEligibilityDataBundle:
      compositionBundle.armyResourceBudgetDataBundle.factionArmyEligibilityDataBundle,
    officialUnitCardSupplyDataBundle: unitSupplyBundle,
    officialCardBuildPaymentDataBundle: cardBuildPaymentDataBundle,
    armyBuildingEngagementScale: scaleAgreement, engagementScale: "Skirmish",
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
      terrain: terrainBoardRows(terrainArtifacts, terrainPlan),
      specialTerrainAgreement: terrainArtifacts.specialTerrainAgreement,
      terrainElevationAgreement,
      accessPoints: terrainArtifacts.specialTerrainAgreement.terrainEntries
        .flatMap((terrainEntry) => terrainEntry.accessPoints.map((entry) => ({
          id: entry.accessPointId, accessPointId: entry.accessPointId,
          role: entry.role, footprint: clone(entry.footprint),
          connects: clone(entry.connects),
          connectsElevations: clone(entry.connects),
          terrainId: terrainEntry.terrainId, trainingTruth: false,
        }))),
      tokens: [], markers: [], effectMarkers: [],
      missionMarkers: missionMarkerRows(terrainArtifacts),
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
      },
      trainingTruth: false,
    },
    cardResources: Object.fromEntries(SIDE_KEYS.map((sideKey) => [
      sideKey, createOfficialRoomCardResourcesV1(dataset, registry, sideKey),
    ])),
    pieces,
    activeAbilityUseHistory: [],
    reserveLifecycleHistory: [reserveReceipt],
    lastReserveLifecycleResolution: reserveReceipt,
    reserveManifestBySide: Object.fromEntries(SIDE_KEYS.map((sideKey) => [
      sideKey, pieces.filter((piece) => piece.sideKey === sideKey)
        .map((piece) => ({ pieceId: piece.id, currentSupply: piece.currentSupply,
          deploymentStatus: piece.deploymentStatus,
          selectedUpgradeNames: [...piece.selectedUpgradeNames] })),
    ])),
    rosterDisclosureRulesHistory: [], missionDeploymentDraftHistory: [],
    deploymentGeometryHistory: [], balancedTerrainRulesHistory: [],
    unitCompositionUpgradeRulesHistory: [], armyResourceBudgetRulesHistory: [],
    factionArmyEligibilityRulesHistory: [],
    gameOver: false, terminal: false, winner: "", terminalReason: "", log: [],
    eligibleForTraining: false, trainingTruth: false,
  };
  const missionRuntime = createOfficialMissionRuntimeV2({
    missionEffectCatalogue: gameplayBundle.missionEffectCatalogue,
  });
  state.officialMissionRuntimeDescriptor = missionRuntime.descriptor;
  state.supplyLossLedger = createOfficialSupplyLossLedgerV1({
    round: 1, rulesRuntimeHash: missionRuntime.descriptor.runtimeHash,
  });
  state = clone(missionRuntime.initialize({
    state, missionRecordKey: MISSION_RECORD_KEY,
    markerAffinityByNumber: draft.draftBinding.markerAffinityByNumber,
  }).state);
  state.officialActionRouteCatalogue = createOfficialStandardActionRouteCatalogueV1({
    dataset, state,
  });
  const selectedRosterSpatialRuntime =
    createOfficialSelectedRosterSpatialActionRuntimeV1(state);
  state.officialSelectedRosterSpatialRuntimeDescriptor =
    selectedRosterSpatialRuntime.descriptor;
  const selectedRosterRangedRuntime =
    createOfficialSelectedRosterRangedActionRuntimeV1(state);
  state.officialSelectedRosterRangedRuntimeDescriptor =
    selectedRosterRangedRuntime.descriptor;
  const selectedRosterMeleeRuntime =
    createOfficialSelectedRosterMeleeActionRuntimeV1(state);
  verifyOfficialSelectedRosterMeleeRuntimeDescriptorV1(
    selectedRosterMeleeRuntime.descriptor,
  );
  state.officialSelectedRosterMeleeRuntimeDescriptor =
    selectedRosterMeleeRuntime.descriptor;
  state.officialSelectedRosterAbilitySourceBundle =
    createOfficialSelectedRosterAbilitySourceBundleV1({ dataset, state });
  const selectedRosterAbilityRuntime =
    createOfficialSelectedRosterAbilityRuntimeV1(state);
  verifyOfficialSelectedRosterAbilityRuntimeDescriptorV1(
    selectedRosterAbilityRuntime.descriptor,
  );
  state.officialSelectedRosterAbilityRuntimeDescriptor =
    selectedRosterAbilityRuntime.descriptor;
  const selectedAbilityBindings =
    createOfficialSelectedRosterAbilityDefinitionBindingsV1(
      state.officialSelectedRosterAbilitySourceBundle);
  const relocationBaselineCatalogue = createOfficialAbilityEffectIrCatalogueV1({
    dataset,
    executionBindings: selectedAbilityBindings,
  });
  const relocationBaselineDenominator =
    createOfficialCurrentProductAbilityDenominatorV1({
      catalogue: relocationBaselineCatalogue,
    });
  state.officialRelocationFamilySourceBundle =
    createOfficialRelocationFamilySourceBundleV1({
      catalogue: relocationBaselineCatalogue,
      denominator: relocationBaselineDenominator,
    });
  const relocationBindings = createOfficialRelocationFamilyDefinitionBindingsV1(
    state.officialRelocationFamilySourceBundle);
  const characteristicStatusBaselineCatalogue = createOfficialAbilityEffectIrCatalogueV1({
    dataset,
    executionBindings: [...selectedAbilityBindings, ...relocationBindings],
  });
  const characteristicStatusBaselineDenominator =
    createOfficialCurrentProductAbilityDenominatorV1({
      catalogue: characteristicStatusBaselineCatalogue,
    });
  state.officialCharacteristicStatusFamilySourceBundle =
    createOfficialCharacteristicStatusFamilySourceBundleV1({
      catalogue: characteristicStatusBaselineCatalogue,
      denominator: characteristicStatusBaselineDenominator,
    });
  const characteristicStatusBindings =
    createOfficialCharacteristicStatusFamilyDefinitionBindingsV1(
      state.officialCharacteristicStatusFamilySourceBundle);
  const rangedBaselineCatalogue = createOfficialAbilityEffectIrCatalogueV1({
    dataset,
    executionBindings: [...selectedAbilityBindings, ...relocationBindings,
      ...characteristicStatusBindings],
  });
  const rangedBaselineDenominator = createOfficialCurrentProductAbilityDenominatorV1({
    catalogue: rangedBaselineCatalogue,
  });
  state.officialRangedFamilySourceBundle = createOfficialRangedFamilySourceBundleV1({
    catalogue: rangedBaselineCatalogue,
    denominator: rangedBaselineDenominator,
    attackProfileCatalogue,
  });
  const rangedBindings = createOfficialRangedFamilyDefinitionBindingsV1(
    state.officialRangedFamilySourceBundle);
  state.officialAbilityEffectIrCatalogue = createOfficialAbilityEffectIrCatalogueV1({
    dataset,
    executionBindings: [...selectedAbilityBindings, ...relocationBindings,
      ...characteristicStatusBindings, ...rangedBindings],
  });
  const abilityEffectRuntime = createOfficialAbilityEffectRuntimeV1({
    catalogue: state.officialAbilityEffectIrCatalogue,
    adapters: [createOfficialSelectedRosterAbilityAdapterV1(
      state.officialSelectedRosterAbilitySourceBundle),
    createOfficialRelocationFamilyAdapterV1(
      state.officialRelocationFamilySourceBundle),
    createOfficialCharacteristicStatusFamilyAdapterV1(
      state.officialCharacteristicStatusFamilySourceBundle),
    createOfficialRangedFamilyAdapterV1(
      state.officialRangedFamilySourceBundle)],
  });
  verifyOfficialAbilityEffectRuntimeDescriptorV1(abilityEffectRuntime.descriptor);
  state.officialAbilityEffectRuntimeDescriptor = abilityEffectRuntime.descriptor;
  state.officialCurrentProductAbilityDenominator =
    createOfficialCurrentProductAbilityDenominatorV1({
      catalogue: state.officialAbilityEffectIrCatalogue,
    });
  state.officialMissionEffectCatalogue = gameplayBundle.missionEffectCatalogue;
  state.officialMissionRuntimeDescriptor = missionRuntime.descriptor;
  const viewerProjectionEvidence = projectionEvidence(state);
  const dependencies = {
    sourceSnapshot: { artifactId: "official-development-tranche-command-center-snapshot",
      content: snapshot },
    dataSnapshot: { artifactId: "official-skirmish-500-gameplay-data-v2",
      content: gameplayBundle },
    geometryArtifact: { artifactId: "official-skirmish-500-balanced-geometry-v1",
      content: { geometryBinding, terrainCertificate: terrainArtifacts.certificate,
        terrainHeightTierLedger: terrainArtifacts.terrainHeightTierLedger,
        missionMarkerPlacement: terrainArtifacts.missionMarkerPlacement } },
  };
  const body = {
    schema: OFFICIAL_SKIRMISH_500_ROOM_FACTORY_SCHEMA,
    version: OFFICIAL_SKIRMISH_500_ROOM_FACTORY_VERSION,
    source: "server_factory",
    setupId: String(input.setupId || "official-skirmish-500-hold-char-plains-v1"),
    state, dataVersion: versionFor(dataset), dependencies,
    serverSeatPlan: clone(input.serverSeatPlan || [
      { label: "host", seatKey: "player1", roleMode: "supervisor",
        principalType: "human" },
      { label: "guest", seatKey: "player2", roleMode: "supervisor",
        principalType: "human_or_agent" },
    ]),
    compositionEvidence: {
      scale: "Skirmish", mineralBudgetBySide: { player1: 500, player2: 500 },
      mineralSpentBySide: Object.fromEntries(SIDE_KEYS.map((sideKey) => [
        sideKey, audits[sideKey].armyResourceBudgetResult.mineralSpent,
      ])),
      vespeneSpentBySide: Object.fromEntries(SIDE_KEYS.map((sideKey) => [
        sideKey, audits[sideKey].armyResourceBudgetResult.vespeneSpent,
      ])),
      rosterHashBySide: Object.fromEntries(SIDE_KEYS.map((sideKey) => [
        sideKey, registry.rostersByPlayer[sideKey].rosterHash,
      ])),
      selectedMissionRecordKey: MISSION_RECORD_KEY,
      selectedDeploymentRecordKey: DEPLOYMENT_RECORD_KEY,
      battlefield: clone(geometryBinding.battlefield),
      balancedTerrainCertificateHash: terrainArtifacts.certificate.certificateHash,
      balancedTerrainPieceCount: terrainArtifacts.terrainPieces.length,
      allArmyListUnitsBeginInReserves: true,
      initialReserveReceiptHash: reserveReceipt.resultHash,
      missionRuntimeHash: missionRuntime.descriptor.runtimeHash,
      missionEffectCatalogueHash: gameplayBundle.missionEffectCatalogue.catalogueHash,
      actionRouteCatalogueHash: state.officialActionRouteCatalogue.catalogueHash,
      selectedRosterSpatialRuntimeHash:
        state.officialSelectedRosterSpatialRuntimeDescriptor.runtimeHash,
      selectedRosterRangedRuntimeHash:
        state.officialSelectedRosterRangedRuntimeDescriptor.runtimeHash,
      selectedRosterMeleeRuntimeHash:
        state.officialSelectedRosterMeleeRuntimeDescriptor.runtimeHash,
      selectedRosterAbilityRuntimeHash:
        state.officialSelectedRosterAbilityRuntimeDescriptor.runtimeHash,
      abilityEffectIrCatalogueHash:
        state.officialAbilityEffectIrCatalogue.catalogueHash,
      abilityEffectRuntimeHash:
        state.officialAbilityEffectRuntimeDescriptor.runtimeHash,
      currentProductAbilityDenominatorHash:
        state.officialCurrentProductAbilityDenominator.denominatorHash,
      relocationFamilySourceBundleHash:
        state.officialRelocationFamilySourceBundle.bundleHash,
      characteristicStatusFamilySourceBundleHash:
        state.officialCharacteristicStatusFamilySourceBundle.bundleHash,
      rangedFamilySourceBundleHash:
        state.officialRangedFamilySourceBundle.bundleHash,
      currentProductUnitRecordCount: unitRecordKeys.length,
      currentProductAttackProfileCount: attackProfileCatalogue.profiles.length,
      currentProductAbilityExactCount:
        state.officialCurrentProductAbilityDenominator.summary.executableExact,
      currentProductAbilityPendingCount:
        state.officialCurrentProductAbilityDenominator.summary.pendingFamilyAdapter,
      rosterVisibility: visibility.rosterVisibility,
      viewerProjectionEvidence,
      sourceSnapshotHash: dataset.sourceSnapshotHash,
      normalizedDatasetHash: dataset.datasetHash,
      sourceRefreshPerformed: false,
      repositoryFallbackUsed: false,
      completeActionRuntimeDeferredToSlices: [235, 236, 237,
        238, 239, 240, 241, 242, 243],
      trainingTruth: false,
    },
    trainingTruth: false,
  };
  const authority = seal(body, "receiptHash");
  verifyOfficialSkirmish500RoomInitialStateAuthorityV1(authority);
  return authority;
}

export function createOfficialSkirmish500RoomViewerProjectionsV1(authority) {
  verifyOfficialSkirmish500RoomInitialStateAuthorityV1(authority);
  return freezeDeep({
    public: projectStarcraftTmgStateForViewerV3(authority.state, null),
    player1: projectStarcraftTmgStateForViewerV3(authority.state, "player1"),
    player2: projectStarcraftTmgStateForViewerV3(authority.state, "player2"),
  });
}

export function verifyOfficialSkirmish500RoomInitialStateAuthorityV1(authority) {
  const state = authority?.state;
  const evidence = authority?.compositionEvidence;
  if (!object(authority)
    || authority.schema !== OFFICIAL_SKIRMISH_500_ROOM_FACTORY_SCHEMA
    || authority.version !== OFFICIAL_SKIRMISH_500_ROOM_FACTORY_VERSION
    || authority.source !== "server_factory"
    || authority.receiptHash !== hashStarcraftTmgContract(
      without(authority, ["receiptHash"]))
    || state?.engagementScale !== "Skirmish"
    || state?.mission?.recordKey !== MISSION_RECORD_KEY
    || state?.selectedDeployment?.profile?.recordKey !== DEPLOYMENT_RECORD_KEY
    || state?.board?.widthInches !== 36 || state?.board?.heightInches !== 36
    || state?.board?.terrain?.length !== 7
    || state?.officialBalancedTerrainSetupCertificate?.balancedTerrainCertified !== true
    || state?.pieces?.length !== 5
    || state.pieces.some((piece) => piece.isOnField !== false
      || piece.isInReserves !== true)
    || evidence?.mineralSpentBySide?.player1 !== 500
    || evidence?.mineralSpentBySide?.player2 !== 500
    || evidence?.vespeneSpentBySide?.player1 !== 0
    || evidence?.vespeneSpentBySide?.player2 !== 0
    || evidence?.allArmyListUnitsBeginInReserves !== true
    || evidence?.balancedTerrainPieceCount !== 7
    || evidence?.viewerProjectionEvidence?.publicCardResourceSideCount !== 0
    || !isDeepStrictEqual(
      evidence?.viewerProjectionEvidence?.player1PrivateCardResourceSideKeys,
      ["player1"])
    || !isDeepStrictEqual(
      evidence?.viewerProjectionEvidence?.player2PrivateCardResourceSideKeys,
      ["player2"])
    || evidence?.viewerProjectionEvidence
      ?.authorityRosterRegistryAbsentFromAllViewerProjections !== true
    || evidence?.sourceRefreshPerformed !== false
    || evidence?.repositoryFallbackUsed !== false
    || !HASH.test(String(evidence?.balancedTerrainCertificateHash || ""))
    || !HASH.test(String(evidence?.initialReserveReceiptHash || ""))
    || evidence?.selectedRosterSpatialRuntimeHash
      !== state?.officialSelectedRosterSpatialRuntimeDescriptor?.runtimeHash
    || evidence?.selectedRosterRangedRuntimeHash
      !== state?.officialSelectedRosterRangedRuntimeDescriptor?.runtimeHash
    || evidence?.selectedRosterMeleeRuntimeHash
      !== state?.officialSelectedRosterMeleeRuntimeDescriptor?.runtimeHash
    || evidence?.selectedRosterAbilityRuntimeHash
      !== state?.officialSelectedRosterAbilityRuntimeDescriptor?.runtimeHash
    || evidence?.abilityEffectIrCatalogueHash
      !== state?.officialAbilityEffectIrCatalogue?.catalogueHash
    || evidence?.abilityEffectRuntimeHash
      !== state?.officialAbilityEffectRuntimeDescriptor?.runtimeHash
    || evidence?.currentProductAbilityDenominatorHash
      !== state?.officialCurrentProductAbilityDenominator?.denominatorHash
    || evidence?.relocationFamilySourceBundleHash
      !== state?.officialRelocationFamilySourceBundle?.bundleHash
    || evidence?.characteristicStatusFamilySourceBundleHash
      !== state?.officialCharacteristicStatusFamilySourceBundle?.bundleHash
    || evidence?.rangedFamilySourceBundleHash
      !== state?.officialRangedFamilySourceBundle?.bundleHash
    || evidence?.currentProductUnitRecordCount !== 26
    || evidence?.currentProductAttackProfileCount !== 51
    || evidence?.currentProductAbilityExactCount !== 135
    || evidence?.currentProductAbilityPendingCount !== 117
    || authority.trainingTruth !== false) {
    fail("SKIRMISH_500_ROOM_INITIAL_STATE_AUTHORITY_INVALID");
  }
  verifyOfficialSelectedRosterSpatialRuntimeDescriptorV1(
    state.officialSelectedRosterSpatialRuntimeDescriptor,
  );
  verifyOfficialSelectedRosterRangedRuntimeDescriptorV1(
    state.officialSelectedRosterRangedRuntimeDescriptor,
  );
  verifyOfficialSelectedRosterMeleeRuntimeDescriptorV1(
    state.officialSelectedRosterMeleeRuntimeDescriptor,
  );
  verifyOfficialSelectedRosterAbilityRuntimeDescriptorV1(
    state.officialSelectedRosterAbilityRuntimeDescriptor,
  );
  verifyOfficialAbilityEffectRuntimeDescriptorV1(
    state.officialAbilityEffectRuntimeDescriptor,
  );
  verifyOfficialCurrentProductAbilityDenominatorV1(
    state.officialCurrentProductAbilityDenominator,
  );
  verifyOfficialRelocationFamilySourceBundleV1(
    state.officialRelocationFamilySourceBundle,
  );
  verifyOfficialCharacteristicStatusFamilySourceBundleV1(
    state.officialCharacteristicStatusFamilySourceBundle,
  );
  verifyOfficialRangedFamilySourceBundleV1(
    state.officialRangedFamilySourceBundle,
  );
  return true;
}
