import { assertOfficialReleaseSourceV2 } from '../source-data/official-release-context-v2.mjs';
import { requireOfficialReleaseRoomAbilityRuntimeV2 } from './official-release-room-ability-admission-v2.mjs';
import { inspectOfficialReleaseRoomRosterCoverageV2, prepareOfficialReleaseRoomNativeActionsV2,
  officialReleaseRosterIncrementOptionsV2 } from './official-release-room-native-actions-v2.mjs';
import { isDeepStrictEqual } from "node:util";
import { projectCompetitiveMapRoomFreezeSummaryV1 } from
  "../client-domain/competitive-map-admission-contract-v1.mjs";

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
import {
  createOfficialBattlefieldTokenMarkerRegistryV1,
  verifyOfficialBattlefieldTokenMarkerRegistryV1,
} from "../rule-atoms/official-battlefield-token-marker-rules-kernel-v1.mjs";
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
import { createOfficialAttackProfileCatalogueV1, createOfficialAttackProfileCatalogueV3 } from
  "../source-data/official-attack-profile-catalogue-v1.mjs";
import { createOfficialAttackProfileCatalogueV2 } from
  "../source-data/official-attack-profile-catalogue-v2.mjs";
import { createOfficialAbilityEffectIrCatalogueV1 } from
  "../source-data/official-ability-effect-ir-v1.mjs";
import { createOfficialBalancedTerrainRulesDataBundleV1 } from
  "../source-data/official-balanced-terrain-rules-data-bundle-v1.mjs";
import {
  createOfficialBattlefieldAssetComponentProfileV1,
  verifyOfficialBattlefieldAssetComponentProfileV1,
} from "../source-data/official-battlefield-asset-component-profile-v1.mjs";
import { createOfficialBattlefieldTokenMarkerRulesDataBundleV1 } from
  "../source-data/official-battlefield-token-marker-rules-data-bundle-v1.mjs";
import { createOfficialCardBuildPaymentDataBundleV1 } from
  "../source-data/official-card-build-payment-data-bundle-v1.mjs";
import { createOfficialDeploymentGeometryDataBundleV1 } from
  "../source-data/official-deployment-geometry-data-bundle-v1.mjs";
import { prepareOfficialCurrentProductFirstRoundV1 } from "./official-first-round-setup-v1.mjs";
import { OFFICIAL_WAVE3_GATHER_SKIRMISH_KEY, OFFICIAL_WAVE3_FIRE_SKIRMISH_KEY, OFFICIAL_WAVE3_ARTEFACT_SKIRMISH_KEY,
  bindOfficialWave3GatherDraftProfileV1, bindOfficialWave3FireDraftProfilesV1, bindOfficialWave3ArtefactDraftProfilesV1 }
  from "../source-data/official-wave3-mission-source-v1.mjs";
import { selectOfficialWave3RoomMissionSourceContextV1, verifyOfficialWave3RoomMissionBindingV1 }
  from "./official-wave3-room-mission-binding-v1.mjs";
import { createOfficialMatchGameplayDataBundleV2 } from
  "../source-data/official-match-gameplay-data-bundle-v2.mjs";
import { createOfficialMissionDeploymentDraftDataBundleV1 } from
  "../source-data/official-mission-deployment-draft-data-bundle-v1.mjs";
import { createOfficialModelBaseGeometryDataBundleV1, getOfficialReleaseModelBaseGeometryBundleV2 } from
  "../source-data/official-model-base-geometry-data-bundle-v1.mjs";
import { createOfficialRoomRosterDisclosureDataBundleV1 } from
  "../source-data/official-roster-disclosure-data-bundle-v1.mjs";
import { createOfficialRespawnMorphDataBundleV1,
  verifyOfficialRespawnMorphDataBundleV1 } from
  "../source-data/official-respawn-morph-data-bundle-v1.mjs";
import { createOfficialSummonDataBundleV1, verifyOfficialSummonDataBundleV1 } from
  "../source-data/official-summon-data-bundle-v1.mjs";
import { createOfficialTerrainLosDataBundleV1, createOfficialTerrainLosDataBundleV2 } from
  "../source-data/official-terrain-los-data-bundle-v1.mjs";
import { createOfficialUnitCardSupplyDataBundleV1, getOfficialReleaseUnitCardSupplyDataBundleV2 } from
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
  createOfficialCurrentProductAbilityCoverageReleaseV1,
  verifyOfficialCurrentProductAbilityCoverageReleaseV1,
} from "./official-current-product-ability-coverage-release-v1.mjs";
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
  createOfficialMeleeFamilyAdapterV1,
  createOfficialMeleeFamilyDefinitionBindingsV1,
  createOfficialMeleeFamilySourceBundleV1,
  verifyOfficialMeleeFamilySourceBundleV1,
} from "./official-melee-family-adapter-v1.mjs";
import {
  createOfficialReactionFamilyAdapterV1,
  createOfficialReactionFamilyDefinitionBindingsV1,
  createOfficialReactionFamilySourceBundleV1,
  verifyOfficialReactionFamilySourceBundleV1,
} from "./official-reaction-family-adapter-v1.mjs";
import {
  createOfficialBattlefieldAssetFamilyAdapterV1,
  createOfficialBattlefieldAssetFamilyDefinitionBindingsV1,
  createOfficialBattlefieldAssetFamilySourceBundleV1,
  verifyOfficialBattlefieldAssetFamilySourceBundleV1,
} from "./official-battlefield-asset-family-adapter-v1.mjs";
import {
  createOfficialUnitLifecycleFamilyAdapterV1,
  createOfficialUnitLifecycleFamilyDefinitionBindingsV1,
  createOfficialUnitLifecycleFamilySourceBundleV1,
  verifyOfficialUnitLifecycleFamilySourceBundleV1,
} from "./official-unit-lifecycle-family-adapter-v1.mjs";
import {
  createOfficialMatchLifecycleFamilyAdapterV1,
  createOfficialMatchLifecycleFamilyDefinitionBindingsV1,
  createOfficialMatchLifecycleFamilySourceBundleV1,
  verifyOfficialMatchLifecycleFamilySourceBundleV1,
} from "./official-match-lifecycle-family-adapter-v1.mjs";
import {
  createOfficialTerranUniqueFamilyAdapterV1,
  createOfficialTerranUniqueFamilyDefinitionBindingsV1,
  createOfficialTerranUniqueFamilySourceBundleV1,
  verifyOfficialTerranUniqueFamilySourceBundleV1,
} from "./official-terran-unique-family-adapter-v1.mjs";
import {
  createOfficialZergUniqueFamilyAdapterV1,
  createOfficialZergUniqueFamilyDefinitionBindingsV1,
  createOfficialZergUniqueFamilySourceBundleV1,
  verifyOfficialZergUniqueFamilySourceBundleV1,
} from "./official-zerg-unique-family-adapter-v1.mjs";
import {
  createOfficialProtossUniqueFamilyAdapterV1,
  createOfficialProtossUniqueFamilyDefinitionBindingsV1,
  createOfficialProtossUniqueFamilySourceBundleV1,
  verifyOfficialProtossUniqueFamilySourceBundleV1,
} from "./official-protoss-unique-family-adapter-v1.mjs";
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
import { createOfficialBattlefieldMapManifestV1,
  verifyOfficialBattlefieldMapManifestV1 } from
  "./official-battlefield-map-manifest-v1.mjs";
import { resolveOfficialBroodWarMapGalleryArtAssetV1 } from
  "./official-brood-war-map-gallery-v1.mjs";
import { compileOfficialCompetitiveMapTwoLayerV1 } from
  "./official-competitive-map-two-layer-compiler-v1.mjs";
import {
  certifyAndFreezeOfficialCompetitiveMapSemanticRoomV1,
  OFFICIAL_COMPETITIVE_MAP_SEMANTIC_ROOM_FREEZE_V1_SCHEMA,
  verifyOfficialCompetitiveMapSemanticRoomFreezeV1,
} from "./official-competitive-map-semantic-room-freeze-v1.mjs";
import { createOfficialCompetitiveMapTabletopAdapterCatalogueV1 } from
  "./official-competitive-map-tabletop-adapter-v1.mjs";
import { createOfficialCompetitiveMapSeedCatalogueV1 } from
  "./official-competitive-map-seed-catalogue-v1.mjs";
import { compileOfficialPremadeMapRoomSourceV1, getOfficialPremadeMapRoomSeedV1 } from
  "./official-premade-map-room-source-v1.mjs";
import { createOfficialPremadeMapConfiguratorV1 } from
  "./official-premade-map-configurator-v1.mjs";
import { resolveOfficialStarcraft2MapGalleryArtAssetV1 } from
  "./official-starcraft-2-map-gallery-v1.mjs";

export const OFFICIAL_SKIRMISH_500_ROOM_FACTORY_SCHEMA =
  "starcraft_tmg_official_skirmish_500_room_initial_state_authority_v1";
export const OFFICIAL_SKIRMISH_500_ROOM_FACTORY_VERSION = "2.9.0";

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
      blocksPlacement: runtime?.blocksPlacement ?? source?.blocksPlacement
        ?? entry.terrainKind === "impassable",
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
  return buildOfficialSkirmish500Room(input);
}

export function prepareOfficialSkirmish500ReleaseOpeningV2(input = {}) {
  if (!input.releaseContext) fail('SKIRMISH_500_RELEASE_OPENING_SOURCE_REQUIRED');
  return buildOfficialSkirmish500Room(input, opening => prepareOfficialReleaseRoomNativeActionsV2({
    ...opening, ...officialReleaseRosterIncrementOptionsV2(input.releaseMatchVersion),
  }));
}

export function inspectOfficialSkirmish500ReleaseOpeningCoverageV2(input = {}) {
  if (!input.releaseContext) fail("SKIRMISH_500_RELEASE_OPENING_SOURCE_REQUIRED");
  return buildOfficialSkirmish500Room(input, opening => inspectOfficialReleaseRoomRosterCoverageV2({
    ...opening, releaseMatchVersion: input.releaseMatchVersion,
  }));
}

function buildOfficialSkirmish500Room(input, prepareReleaseOpening) {
  if (input.prepareFirstRound !== undefined && typeof input.prepareFirstRound !== "boolean") {
    fail("SKIRMISH_FIRST_ROUND_PREPARATION_INVALID");
  }
  if (input.currentProductGameplayBinding !== undefined
    && typeof input.currentProductGameplayBinding !== 'boolean') {
    fail('SKIRMISH_CURRENT_PRODUCT_GAMEPLAY_BINDING_REQUIRED');
  }
  const { dataset, snapshot } = input;
  const releaseManifest = input.releaseContext
    ? assertOfficialReleaseSourceV2(input.releaseContext, { dataset, snapshot }) : null;
  if (!object(dataset) || !object(snapshot)) {
    fail("SKIRMISH_500_ROOM_SOURCE_INPUT_REQUIRED");
  }
  const recipes = clone(input.recipes || STARCRAFT_TMG_FORMAL_500_ROSTER_RECIPES_V1);
  if (!isDeepStrictEqual(Object.keys(recipes).sort(), [...SIDE_KEYS])) {
    fail("SKIRMISH_500_ROOM_TWO_SIDE_RECIPES_REQUIRED");
  }
  const rosterBundle = createOfficialRoomRosterDisclosureDataBundleV1({
    dataset, snapshot, releaseContext: input.releaseContext,
  });
  const compositionBundle = rosterBundle.unitCompositionUpgradeDataBundle;
  const audits = Object.fromEntries(SIDE_KEYS.map((sideKey) => [sideKey,
    buildOfficialRoomArmyAuditV1(compositionBundle, sideKey, recipes[sideKey], {
      scaleId: "Skirmish", mineralBudget: 500, dataset,
      ...(rosterBundle.sourceBinding ? { releaseContext: input.releaseContext } : {}),
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
  const missionRecordKey = String(input.missionRecordKey || MISSION_RECORD_KEY);
  const fireInTheSky = missionRecordKey === OFFICIAL_WAVE3_FIRE_SKIRMISH_KEY;
  const artefactHunt = missionRecordKey === OFFICIAL_WAVE3_ARTEFACT_SKIRMISH_KEY;
  const wave3MissionSourceContext = selectOfficialWave3RoomMissionSourceContextV1(input,
    fireInTheSky || artefactHunt || missionRecordKey === OFFICIAL_WAVE3_GATHER_SKIRMISH_KEY);
  if (wave3MissionSourceContext
    ? !fireInTheSky && !artefactHunt && missionRecordKey !== OFFICIAL_WAVE3_GATHER_SKIRMISH_KEY
    : missionRecordKey !== MISSION_RECORD_KEY) {
    fail("SKIRMISH_500_ROOM_GAMEPLAY_BUNDLE_MISSION_UNSUPPORTED", missionRecordKey);
  }
  const baseDraftBundle = createOfficialMissionDeploymentDraftDataBundleV1({
    dataset, snapshot, releaseContext: input.releaseContext,
  });
  const bindWave3Draft = artefactHunt ? bindOfficialWave3ArtefactDraftProfilesV1
    : fireInTheSky ? bindOfficialWave3FireDraftProfilesV1 : bindOfficialWave3GatherDraftProfileV1;
  const draftBundle = wave3MissionSourceContext
    ? bindWave3Draft(baseDraftBundle, wave3MissionSourceContext) : baseDraftBundle;
  // An explicit frozen Skirmish deployment must survive the product route;
  // omitted input keeps the historical CHAR PLAINS state byte-identical.
  const deploymentRecordKey = String(input.deploymentRecordKey || DEPLOYMENT_RECORD_KEY);
  const draft = completeOfficialRoomDraftV1(
    draftBundle, missionRecordKey, deploymentRecordKey, "Skirmish");
  const geometryBundle = createOfficialDeploymentGeometryDataBundleV1({
    dataset, snapshot, releaseContext: input.releaseContext, missionDeploymentDraftDataBundle: draftBundle,
  });
  const geometryBinding = createOfficialDeploymentGeometryBindingV1({
    deploymentGeometryDataBundle: geometryBundle,
    missionDeploymentDraftDataBundle: draftBundle,
    missionDeploymentDraftState: draft,
  });
  const terrainBundle = createOfficialBalancedTerrainRulesDataBundleV1({
    dataset, snapshot, releaseContext: input.releaseContext, deploymentGeometryDataBundle: geometryBundle,
    unitRecordKeys: SIDE_KEYS.flatMap(sideKey => recipes[sideKey].units.map(unit => unit.recordKey)),
  });
  // Ticket 24 / Slice 254-R8-12: opt-in semantic-map terrain route, mirroring
  // the R8-11 Standard factory wiring. When the caller pins a registered
  // semantic binding, the room freeze certifies the same-version semantic map
  // terrain (authored art-true geometry) instead of the generic premade
  // balanced-terrain layout. `mapConfiguration` without `semanticTerrain`
  // fails closed: the two-layer rectangular-layout invariants are
  // category-specific to generic premade arrangements and no such route is
  // introduced for Skirmish. With no `mapConfiguration` the default path
  // below is byte-identical.
  const modelGeometryBundle = rosterBundle.sourceBinding
    ? getOfficialReleaseModelBaseGeometryBundleV2(input.releaseContext)
    : createOfficialModelBaseGeometryDataBundleV1({ dataset });
  const terrainLosDataBundle = rosterBundle.sourceBinding
    ? createOfficialTerrainLosDataBundleV2({ context: input.releaseContext })
    : createOfficialTerrainLosDataBundleV1({ dataset });
  const requestedMapConfiguration = object(input.mapConfiguration)
    ? clone(input.mapConfiguration) : null;
  const mapConfiguration = requestedMapConfiguration
    && getOfficialPremadeMapRoomSeedV1(requestedMapConfiguration.seedId)
    && !object(requestedMapConfiguration.semanticTerrain)
    ? createOfficialPremadeMapConfiguratorV1().prepareRoomConfiguration(
      requestedMapConfiguration, { roomId: input.roomId })
    : requestedMapConfiguration;
  let competitiveMapCompilation = null;
  let competitiveMapRoomFreeze = null;
  let competitiveMapMetadata = null;
  let semanticRoomFreezeResult = null;
  if (mapConfiguration) {
    const roomId = String(input.roomId || "").trim();
    if (!roomId) fail("SKIRMISH_500_ROOM_COMPETITIVE_MAP_ROOM_ID_REQUIRED");
    const semanticTerrain = object(mapConfiguration.semanticTerrain)
      ? mapConfiguration.semanticTerrain : null;
    if (!semanticTerrain) {
      fail("SKIRMISH_500_ROOM_MAP_CONFIGURATION_REQUIRES_SEMANTIC_TERRAIN",
        String(mapConfiguration.seedId || ""));
    }
    let adapterCatalogue;
    if (getOfficialPremadeMapRoomSeedV1(mapConfiguration.seedId)) {
      const source = compileOfficialPremadeMapRoomSourceV1({
        seedId: mapConfiguration.seedId, semanticTerrain,
      });
      adapterCatalogue = source.adapterCatalogue;
      competitiveMapCompilation = source.compilation;
      competitiveMapMetadata = source.metadata;
    } else {
      adapterCatalogue = createOfficialCompetitiveMapTabletopAdapterCatalogueV1();
      competitiveMapCompilation = compileOfficialCompetitiveMapTwoLayerV1({
        adapterCatalogue,
        seedId: mapConfiguration.seedId,
        elementSelections: mapConfiguration.elementSelections || [],
        passageSelections: mapConfiguration.passageSelections || [],
      });
      const seedEntry = createOfficialCompetitiveMapSeedCatalogueV1().seeds
        .find((entry) => entry.seedId === competitiveMapCompilation.seedId);
      if (!seedEntry) {
        fail("SKIRMISH_500_ROOM_COMPETITIVE_MAP_GALLERY_ENTRY_MISSING",
          competitiveMapCompilation.seedId);
      }
      const classicRestrictedVariant = competitiveMapCompilation.artLayer
        .routeTreatments.some((entry) => (
          entry.restrictionDisclosureRequired === true));
      const artAsset = seedEntry.gameEra === "brood_war"
        ? resolveOfficialBroodWarMapGalleryArtAssetV1(seedEntry.seedId, {
          classicRestrictedVariant,
        })
        : resolveOfficialStarcraft2MapGalleryArtAssetV1(seedEntry.seedId);
      competitiveMapMetadata = {
        displayName: seedEntry.displayName,
        gameEra: seedEntry.gameEra,
        artAssetPath: artAsset.path,
      };
    }
    if (competitiveMapCompilation.engagementScale !== "Skirmish") {
      fail("SKIRMISH_500_ROOM_COMPETITIVE_MAP_SCALE_MISMATCH",
        competitiveMapCompilation.seedId);
    }
    semanticRoomFreezeResult =
      certifyAndFreezeOfficialCompetitiveMapSemanticRoomV1({
        adapterCatalogue,
        compilation: competitiveMapCompilation,
        roomId,
        semanticTerrain,
        dataset, modelGeometryBundle, terrainLosDataBundle,
        participantIds: [...SIDE_KEYS],
        deploymentGeometryBinding: geometryBinding,
        deploymentGeometryDataBundle: geometryBundle,
        quarterProbeSnapLimitInches:
          semanticTerrain.quarterProbeSnapLimitInches,
        supersededTwoLayerFreezeCode: mapConfiguration
          .supersededTwoLayerFreezeCode,
      });
    competitiveMapRoomFreeze = semanticRoomFreezeResult.freeze;
    // Keep the visible board on the art revision certified with the terrain.
    competitiveMapMetadata.artAssetPath = semanticTerrain.binding.art.assetPath;
  }
  const terrainPlan = clone(competitiveMapRoomFreeze?.setupPlan
    || input.terrainPlan
    || createOfficialSkirmish500BalancedTerrainPlanV1());
  const terrainArtifacts = semanticRoomFreezeResult?.terrainArtifacts
    || certifyOfficialBalancedTerrainSetupV1({
      deploymentGeometryBinding: geometryBinding,
      deploymentGeometryDataBundle: geometryBundle,
      balancedTerrainRulesDataBundle: terrainBundle,
      setupPlan: terrainPlan,
    });
  if (semanticRoomFreezeResult) {
    verifyOfficialCompetitiveMapSemanticRoomFreezeV1(
      semanticRoomFreezeResult.freeze, {
        deploymentGeometryBinding: geometryBinding,
        deploymentGeometryDataBundle: geometryBundle,
      });
  } else {
    verifyOfficialBalancedTerrainArtifactsV1({ ...terrainArtifacts,
      deploymentGeometryBinding: geometryBinding,
      balancedTerrainRulesDataBundle: terrainBundle,
    });
  }
  const battlefieldMapManifest = mapConfiguration
    ? createOfficialBattlefieldMapManifestV1({
      mapSeedId: competitiveMapCompilation?.seedId,
      mapDisplayName: competitiveMapMetadata?.displayName,
      mapGameEra: competitiveMapMetadata?.gameEra,
      mapSourceFamily: competitiveMapMetadata?.mapSourceFamily,
      mapArtAssetPath: competitiveMapMetadata?.artAssetPath,
      mapArtOverlays: mapConfiguration.semanticTerrain?.binding?.art?.overlays,
      engagementScale: competitiveMapCompilation?.engagementScale,
      visualPresetId: competitiveMapCompilation?.artLayer.visualPresetId
        || input.visualPresetId,
      terrainPresetId: input.terrainPresetId,
      terrainSeed: input.terrainSeed,
      terrainGenerationMode: input.terrainGenerationMode,
      terrainPlan,
      mapCompilationHash: competitiveMapCompilation?.compilationHash,
      mapRoomFreezeHash: competitiveMapRoomFreeze?.roomFreezeHash,
      missionSpatialReachabilityAuditHash:
        competitiveMapRoomFreeze?.missionSpatialReachabilityAuditHash,
      elementSelectionCount:
        competitiveMapCompilation?.selectionReceipt.length,
      passageSelectionCount:
        competitiveMapCompilation?.passageSelectionReceipt.length,
      formalTaskRoomEligible:
        competitiveMapCompilation?.roomCertificationEligible,
    })
    : null;
  if (battlefieldMapManifest) {
    verifyOfficialBattlefieldMapManifestV1(battlefieldMapManifest, terrainPlan);
  }
  const unitRecordKeys = dataset.recordIndex.filter((entry) => (
    entry.recordType === "unit"
      && entry.authorityDisposition === "official_current_product_candidate"
  )).map((entry) => entry.recordKey).sort((left, right) => left.localeCompare(right));
  const gameplayBundle = createOfficialMatchGameplayDataBundleV2({
    snapshot, dataset, missionDeploymentDraftDataBundle: draftBundle,
    missionRecordKey, unitRecordKeys, wave3MissionSourceContext,
    includeWave3FireInSky: fireInTheSky, includeWave3ArtefactHunt: artefactHunt,
  });
  const missionSetupBinding = createMissionSetupBinding(gameplayBundle, draft);
  const attackProfileCatalogue = rosterBundle.sourceBinding
    ? createOfficialAttackProfileCatalogueV3({ context: input.releaseContext, recordKeys: unitRecordKeys })
    : createOfficialAttackProfileCatalogueV1({ snapshot, dataset, recordKeys: unitRecordKeys });
  const attackProfileCatalogueV2 = createOfficialAttackProfileCatalogueV2({
    previousCatalogue: attackProfileCatalogue,
  });
  const terrainElevationAgreement = createOfficialTerrainElevationAgreementV1({
    supportRelations: [],
  });
  const unitSupplyBundle = rosterBundle.sourceBinding
    ? getOfficialReleaseUnitCardSupplyDataBundleV2(input.releaseContext)
    : createOfficialUnitCardSupplyDataBundleV1({ dataset });
  const cardBuildPaymentDataBundle = rosterBundle.sourceBinding
    ? compositionBundle.armyResourceBudgetDataBundle.factionArmyEligibilityDataBundle.cardDataBundle
    : createOfficialCardBuildPaymentDataBundleV1({ dataset });
  const summonDataBundle = createOfficialSummonDataBundleV1({ dataset, snapshot, releaseContext: input.releaseContext });
  const respawnMorphDataBundle = createOfficialRespawnMorphDataBundleV1({ dataset, snapshot, releaseContext: input.releaseContext });
  const battlefieldTokenMarkerRulesDataBundle =
    createOfficialBattlefieldTokenMarkerRulesDataBundleV1({
      dataset, snapshot, releaseContext: input.releaseContext, deploymentGeometryDataBundle: geometryBundle,
    });
  const battlefieldTokenMarkerRegistry = createOfficialBattlefieldTokenMarkerRegistryV1({
    battlefieldTokenMarkerRulesDataBundle,
    deploymentGeometryBinding: geometryBinding,
  });
  const battlefieldAssetComponentProfile =
    createOfficialBattlefieldAssetComponentProfileV1();
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
    ...(mapConfiguration ? {
      officialCompetitiveMapRoomFreeze: competitiveMapRoomFreeze,
    } : {}),
    officialTerrainHeightTierLedger: terrainArtifacts.terrainHeightTierLedger,
    officialMissionMarkerPlacement: terrainArtifacts.missionMarkerPlacement,
    officialMissionSetupBinding: missionSetupBinding,
    officialGameplayDataBundle: gameplayBundle,
    ...(input.currentProductGameplayBinding === true
      ? { officialCurrentProductGameplayDataBundle: gameplayBundle } : {}),
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
    officialSummonDataBundle: summonDataBundle,
    officialRespawnMorphDataBundle: respawnMorphDataBundle,
    officialBattlefieldTokenMarkerRulesDataBundle:
      battlefieldTokenMarkerRulesDataBundle,
    officialBattlefieldTokenMarkerRegistry: battlefieldTokenMarkerRegistry,
    officialBattlefieldAssetComponentProfile: battlefieldAssetComponentProfile,
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
      ...(battlefieldMapManifest ? {
        battlefieldMapManifest,
        competitiveMapRoomFreezeSummary:
          projectCompetitiveMapRoomFreezeSummaryV1(competitiveMapRoomFreeze),
      } : {}),
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
    missionEffectCatalogue: gameplayBundle.missionEffectCatalogue, wave3MissionSourceContext,
    artefactHuntMissionRecordKey: artefactHunt ? missionRecordKey : null,
  });
  state.officialMissionRuntimeDescriptor = missionRuntime.descriptor;
  state.supplyLossLedger = createOfficialSupplyLossLedgerV1({
    round: 1, rulesRuntimeHash: missionRuntime.descriptor.runtimeHash,
  });
  state = clone(missionRuntime.initialize({
    state, missionRecordKey,
    markerAffinityByNumber: draft.draftBinding.markerAffinityByNumber,
  }).state);
  state.officialActionRouteCatalogue = createOfficialStandardActionRouteCatalogueV1({
    dataset, state,
  });
  if (rosterBundle.sourceBinding) {
    if (prepareReleaseOpening) {
      return prepareReleaseOpening({ context: input.releaseContext,
        state: { ...state, officialMissionEffectCatalogue: gameplayBundle.missionEffectCatalogue } });
    }
    requireOfficialReleaseRoomAbilityRuntimeV2({ context: input.releaseContext, state });
  }
  if (prepareReleaseOpening) fail('SKIRMISH_500_RELEASE_OPENING_SOURCE_REQUIRED');
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
  const meleeBaselineCatalogue = createOfficialAbilityEffectIrCatalogueV1({
    dataset,
    executionBindings: [...selectedAbilityBindings, ...relocationBindings,
      ...characteristicStatusBindings, ...rangedBindings],
  });
  const meleeBaselineDenominator = createOfficialCurrentProductAbilityDenominatorV1({
    catalogue: meleeBaselineCatalogue,
  });
  state.officialMeleeFamilySourceBundle = createOfficialMeleeFamilySourceBundleV1({
    catalogue: meleeBaselineCatalogue,
    denominator: meleeBaselineDenominator,
    attackProfileCatalogueV2,
  });
  const meleeBindings = createOfficialMeleeFamilyDefinitionBindingsV1(
    state.officialMeleeFamilySourceBundle);
  const reactionBaselineCatalogue = createOfficialAbilityEffectIrCatalogueV1({
    dataset,
    executionBindings: [...selectedAbilityBindings, ...relocationBindings,
      ...characteristicStatusBindings, ...rangedBindings, ...meleeBindings],
  });
  const reactionBaselineDenominator = createOfficialCurrentProductAbilityDenominatorV1({
    catalogue: reactionBaselineCatalogue,
  });
  state.officialReactionFamilySourceBundle = createOfficialReactionFamilySourceBundleV1({
    catalogue: reactionBaselineCatalogue,
    denominator: reactionBaselineDenominator,
  });
  const reactionBindings = createOfficialReactionFamilyDefinitionBindingsV1(
    state.officialReactionFamilySourceBundle);
  const battlefieldAssetBaselineCatalogue = createOfficialAbilityEffectIrCatalogueV1({
    dataset,
    executionBindings: [...selectedAbilityBindings, ...relocationBindings,
      ...characteristicStatusBindings, ...rangedBindings, ...meleeBindings,
      ...reactionBindings],
  });
  const battlefieldAssetBaselineDenominator =
    createOfficialCurrentProductAbilityDenominatorV1({
      catalogue: battlefieldAssetBaselineCatalogue,
    });
  state.officialBattlefieldAssetFamilySourceBundle =
    createOfficialBattlefieldAssetFamilySourceBundleV1({
      catalogue: battlefieldAssetBaselineCatalogue,
      denominator: battlefieldAssetBaselineDenominator,
    });
  const battlefieldAssetBindings =
    createOfficialBattlefieldAssetFamilyDefinitionBindingsV1(
      state.officialBattlefieldAssetFamilySourceBundle);
  const unitLifecycleBaselineCatalogue = createOfficialAbilityEffectIrCatalogueV1({
    dataset,
    executionBindings: [...selectedAbilityBindings, ...relocationBindings,
      ...characteristicStatusBindings, ...rangedBindings, ...meleeBindings,
      ...reactionBindings, ...battlefieldAssetBindings],
  });
  const unitLifecycleBaselineDenominator =
    createOfficialCurrentProductAbilityDenominatorV1({
      catalogue: unitLifecycleBaselineCatalogue,
    });
  state.officialUnitLifecycleFamilySourceBundle =
    createOfficialUnitLifecycleFamilySourceBundleV1({
      catalogue: unitLifecycleBaselineCatalogue,
      denominator: unitLifecycleBaselineDenominator,
      summonDataBundle,
      respawnMorphDataBundle,
    });
  const unitLifecycleBindings =
    createOfficialUnitLifecycleFamilyDefinitionBindingsV1(
      state.officialUnitLifecycleFamilySourceBundle);
  const matchLifecycleBaselineCatalogue = createOfficialAbilityEffectIrCatalogueV1({
    dataset,
    executionBindings: [...selectedAbilityBindings, ...relocationBindings,
      ...characteristicStatusBindings, ...rangedBindings, ...meleeBindings,
      ...reactionBindings, ...battlefieldAssetBindings, ...unitLifecycleBindings],
  });
  const matchLifecycleBaselineDenominator =
    createOfficialCurrentProductAbilityDenominatorV1({
      catalogue: matchLifecycleBaselineCatalogue,
    });
  state.officialMatchLifecycleFamilySourceBundle =
    createOfficialMatchLifecycleFamilySourceBundleV1({
      catalogue: matchLifecycleBaselineCatalogue,
      denominator: matchLifecycleBaselineDenominator,
    });
  const matchLifecycleBindings =
    createOfficialMatchLifecycleFamilyDefinitionBindingsV1(
      state.officialMatchLifecycleFamilySourceBundle);
  const terranUniqueBaselineCatalogue = createOfficialAbilityEffectIrCatalogueV1({
    dataset,
    executionBindings: [...selectedAbilityBindings, ...relocationBindings,
      ...characteristicStatusBindings, ...rangedBindings, ...meleeBindings,
      ...reactionBindings, ...battlefieldAssetBindings, ...unitLifecycleBindings,
      ...matchLifecycleBindings],
  });
  const terranUniqueBaselineDenominator =
    createOfficialCurrentProductAbilityDenominatorV1({
      catalogue: terranUniqueBaselineCatalogue,
    });
  state.officialTerranUniqueFamilySourceBundle =
    createOfficialTerranUniqueFamilySourceBundleV1({
      catalogue: terranUniqueBaselineCatalogue,
      denominator: terranUniqueBaselineDenominator,
    });
  state.officialContextualSupplyModifierRoutes =
    state.officialTerranUniqueFamilySourceBundle.routes;
  const terranUniqueBindings =
    createOfficialTerranUniqueFamilyDefinitionBindingsV1(
      state.officialTerranUniqueFamilySourceBundle);
  const zergUniqueBaselineCatalogue = createOfficialAbilityEffectIrCatalogueV1({
    dataset,
    executionBindings: [...selectedAbilityBindings, ...relocationBindings,
      ...characteristicStatusBindings, ...rangedBindings, ...meleeBindings,
      ...reactionBindings, ...battlefieldAssetBindings, ...unitLifecycleBindings,
      ...matchLifecycleBindings, ...terranUniqueBindings],
  });
  const zergUniqueBaselineDenominator = createOfficialCurrentProductAbilityDenominatorV1({
    catalogue: zergUniqueBaselineCatalogue,
  });
  state.officialZergUniqueFamilySourceBundle =
    createOfficialZergUniqueFamilySourceBundleV1({
      catalogue: zergUniqueBaselineCatalogue,
      denominator: zergUniqueBaselineDenominator,
    });
  const zergUniqueBindings = createOfficialZergUniqueFamilyDefinitionBindingsV1(
    state.officialZergUniqueFamilySourceBundle);
  const protossUniqueBaselineCatalogue = createOfficialAbilityEffectIrCatalogueV1({
    dataset,
    executionBindings: [...selectedAbilityBindings, ...relocationBindings,
      ...characteristicStatusBindings, ...rangedBindings, ...meleeBindings,
      ...reactionBindings, ...battlefieldAssetBindings, ...unitLifecycleBindings,
      ...matchLifecycleBindings, ...terranUniqueBindings, ...zergUniqueBindings],
  });
  const protossUniqueBaselineDenominator =
    createOfficialCurrentProductAbilityDenominatorV1({
      catalogue: protossUniqueBaselineCatalogue,
    });
  state.officialProtossUniqueFamilySourceBundle =
    createOfficialProtossUniqueFamilySourceBundleV1({
      catalogue: protossUniqueBaselineCatalogue,
      denominator: protossUniqueBaselineDenominator,
    });
  state.officialContextualSupplyModifierRoutes = [
    ...state.officialTerranUniqueFamilySourceBundle.routes,
    ...state.officialProtossUniqueFamilySourceBundle.routes.filter((route) => (
      route.effectKind === "commander_supply_bonus")),
  ];
  const protossUniqueBindings = createOfficialProtossUniqueFamilyDefinitionBindingsV1(
    state.officialProtossUniqueFamilySourceBundle);
  state.officialAbilityEffectIrCatalogue = createOfficialAbilityEffectIrCatalogueV1({
    dataset,
    executionBindings: [...selectedAbilityBindings, ...relocationBindings,
      ...characteristicStatusBindings, ...rangedBindings, ...meleeBindings,
      ...reactionBindings, ...battlefieldAssetBindings, ...unitLifecycleBindings,
      ...matchLifecycleBindings, ...terranUniqueBindings, ...zergUniqueBindings,
      ...protossUniqueBindings],
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
      state.officialRangedFamilySourceBundle),
    createOfficialMeleeFamilyAdapterV1(
      state.officialMeleeFamilySourceBundle),
    createOfficialReactionFamilyAdapterV1(
      state.officialReactionFamilySourceBundle),
    createOfficialBattlefieldAssetFamilyAdapterV1(
      state.officialBattlefieldAssetFamilySourceBundle),
    createOfficialUnitLifecycleFamilyAdapterV1(
      state.officialUnitLifecycleFamilySourceBundle),
    createOfficialMatchLifecycleFamilyAdapterV1(
      state.officialMatchLifecycleFamilySourceBundle),
    createOfficialTerranUniqueFamilyAdapterV1(
      state.officialTerranUniqueFamilySourceBundle),
    createOfficialZergUniqueFamilyAdapterV1(
      state.officialZergUniqueFamilySourceBundle),
    createOfficialProtossUniqueFamilyAdapterV1(
      state.officialProtossUniqueFamilySourceBundle)],
  });
  verifyOfficialAbilityEffectRuntimeDescriptorV1(abilityEffectRuntime.descriptor);
  state.officialAbilityEffectRuntimeDescriptor = abilityEffectRuntime.descriptor;
  state.officialCurrentProductAbilityDenominator =
    createOfficialCurrentProductAbilityDenominatorV1({
      catalogue: state.officialAbilityEffectIrCatalogue,
    });
  state.officialCurrentProductAbilityCoverageRelease =
    createOfficialCurrentProductAbilityCoverageReleaseV1({
      catalogue: state.officialAbilityEffectIrCatalogue,
      denominator: state.officialCurrentProductAbilityDenominator,
      runtimeDescriptor: state.officialAbilityEffectRuntimeDescriptor,
    });
  state.officialMissionEffectCatalogue = gameplayBundle.missionEffectCatalogue;
  state.officialMissionRuntimeDescriptor = missionRuntime.descriptor;
  if (input.prepareFirstRound === true) state = prepareOfficialCurrentProductFirstRoundV1(state);
  const viewerProjectionEvidence = projectionEvidence(state);
  const dependencies = {
    sourceSnapshot: { artifactId: "official-development-tranche-command-center-snapshot",
      content: snapshot },
    dataSnapshot: { artifactId: "official-skirmish-500-gameplay-data-v2",
      content: gameplayBundle },
    geometryArtifact: { artifactId: "official-skirmish-500-balanced-geometry-v1",
      content: { geometryBinding, terrainCertificate: terrainArtifacts.certificate,
        terrainHeightTierLedger: terrainArtifacts.terrainHeightTierLedger,
        missionMarkerPlacement: terrainArtifacts.missionMarkerPlacement,
        ...(mapConfiguration ? {
          battlefieldMapManifest,
          competitiveMapRoomFreeze,
        } : {}) } },
  };
  const missionSetupSlug = artefactHunt ? "artefact-hunt"
    : fireInTheSky ? "fire-in-the-sky" : draftBundle.wave3Gather ? "gather" : "hold";
  const body = {
    schema: OFFICIAL_SKIRMISH_500_ROOM_FACTORY_SCHEMA,
    version: OFFICIAL_SKIRMISH_500_ROOM_FACTORY_VERSION,
    ...(releaseManifest ? { releaseId: releaseManifest.releaseId, releaseManifestHash: releaseManifest.manifestHash } : {}),
    source: "server_factory",
    setupId: String(input.setupId || (deploymentRecordKey === DEPLOYMENT_RECORD_KEY
      ? `official-skirmish-500-${missionSetupSlug}-char-plains-v1`
      : `official-skirmish-500-${missionSetupSlug}-${draft.selectedDeployment.profile.name
        .toLowerCase().replace(/[^a-z0-9]+/gu, "-")}-v1`)),
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
      selectedMissionRecordKey: missionRecordKey,
      ...(draftBundle.wave3Gather ? { wave3Gather: draftBundle.wave3Gather } : {}),
      ...(draftBundle.wave3FireInSky ? { wave3FireInSky: draftBundle.wave3FireInSky } : {}),
      ...(draftBundle.wave3ArtefactHunt ? { wave3ArtefactHunt: draftBundle.wave3ArtefactHunt } : {}),
      selectedDeploymentRecordKey: deploymentRecordKey,
      battlefield: clone(geometryBinding.battlefield),
      balancedTerrainCertificateHash: terrainArtifacts.certificate.certificateHash,
      balancedTerrainPieceCount: terrainArtifacts.terrainPieces.length,
      ...(mapConfiguration ? {
        battlefieldMapManifestHash: battlefieldMapManifest.manifestHash,
        competitiveMapSeedId: competitiveMapCompilation?.seedId || null,
        competitiveMapCompilationHash:
          competitiveMapCompilation?.compilationHash || null,
        competitiveMapRoomFreezeHash:
          competitiveMapRoomFreeze?.roomFreezeHash || null,
      } : {}),
      allArmyListUnitsBeginInReserves: true,
      ...(input.prepareFirstRound === true ? { firstRoundPrepared: true } : {}),
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
      currentProductAbilityCoverageReleaseHash:
        state.officialCurrentProductAbilityCoverageRelease.releaseHash,
      relocationFamilySourceBundleHash:
        state.officialRelocationFamilySourceBundle.bundleHash,
      characteristicStatusFamilySourceBundleHash:
        state.officialCharacteristicStatusFamilySourceBundle.bundleHash,
      rangedFamilySourceBundleHash:
        state.officialRangedFamilySourceBundle.bundleHash,
      meleeFamilySourceBundleHash:
        state.officialMeleeFamilySourceBundle.bundleHash,
      reactionFamilySourceBundleHash:
        state.officialReactionFamilySourceBundle.bundleHash,
      battlefieldAssetFamilySourceBundleHash:
        state.officialBattlefieldAssetFamilySourceBundle.bundleHash,
      unitLifecycleFamilySourceBundleHash:
        state.officialUnitLifecycleFamilySourceBundle.bundleHash,
      matchLifecycleFamilySourceBundleHash:
        state.officialMatchLifecycleFamilySourceBundle.bundleHash,
      terranUniqueFamilySourceBundleHash:
        state.officialTerranUniqueFamilySourceBundle.bundleHash,
      zergUniqueFamilySourceBundleHash:
        state.officialZergUniqueFamilySourceBundle.bundleHash,
      protossUniqueFamilySourceBundleHash:
        state.officialProtossUniqueFamilySourceBundle.bundleHash,
      summonDataBundleHash: state.officialSummonDataBundle.bundleHash,
      respawnMorphDataBundleHash: state.officialRespawnMorphDataBundle.bundleHash,
      battlefieldAssetComponentProfileHash:
        state.officialBattlefieldAssetComponentProfile.profileHash,
      battlefieldAssetKnownOfficialFootprintCount:
        state.officialBattlefieldAssetComponentProfile.knownOfficialFootprintCount,
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
      officialComponentEvidenceRefreshPerformed: true,
      repositoryFallbackUsed: false,
      completeActionRuntimeDeferredToSlices: [],
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
  // Ticket 24 / Slice 254-R8-12: semantic-map rooms carry authored map
  // terrain (hundreds of cells) instead of the generic seven-piece balanced
  // layout; the fixed seven-piece expectations apply only to the default
  // route. The branch is keyed on the freeze schema; the default route is
  // byte-identical.
  const semanticRoomFreeze = state?.officialCompetitiveMapRoomFreeze?.schema
    === OFFICIAL_COMPETITIVE_MAP_SEMANTIC_ROOM_FREEZE_V1_SCHEMA;
  const expectedTerrainPieceCount = semanticRoomFreeze
    ? state?.board?.terrain?.length : 7;
  const terrainCertificateOk = semanticRoomFreeze
    ? state?.officialBalancedTerrainSetupCertificate?.semanticTerrainCertified
      === true
    : state?.officialBalancedTerrainSetupCertificate?.balancedTerrainCertified
      === true;
  const expectedMissionRecordKey = evidence?.wave3ArtefactHunt ? OFFICIAL_WAVE3_ARTEFACT_SKIRMISH_KEY
    : evidence?.wave3FireInSky ? OFFICIAL_WAVE3_FIRE_SKIRMISH_KEY
    : evidence?.wave3Gather ? OFFICIAL_WAVE3_GATHER_SKIRMISH_KEY : MISSION_RECORD_KEY;
  if (!object(authority)
    || authority.schema !== OFFICIAL_SKIRMISH_500_ROOM_FACTORY_SCHEMA
    || authority.version !== OFFICIAL_SKIRMISH_500_ROOM_FACTORY_VERSION
    || authority.source !== "server_factory"
    || authority.receiptHash !== hashStarcraftTmgContract(
      without(authority, ["receiptHash"]))
    || state?.engagementScale !== "Skirmish"
    || state?.mission?.recordKey !== expectedMissionRecordKey
    || state?.selectedDeployment?.profile?.engagementScale !== "Skirmish"
    || state?.selectedDeployment?.profile?.recordKey
      !== state?.officialDeploymentGeometryBinding?.deploymentRecordKey
    || evidence?.selectedDeploymentRecordKey
      !== state?.selectedDeployment?.profile?.recordKey
    || state?.board?.widthInches !== 36 || state?.board?.heightInches !== 36
    || state?.board?.terrain?.length !== expectedTerrainPieceCount
    || !terrainCertificateOk
    || state?.pieces?.length !== 5
    || state.pieces.some((piece) => piece.isOnField !== false
      || piece.isInReserves !== true)
    || evidence?.mineralSpentBySide?.player1 !== 500
    || evidence?.mineralSpentBySide?.player2 !== 500
    || evidence?.vespeneSpentBySide?.player1 !== 0
    || evidence?.vespeneSpentBySide?.player2 !== 0
    || evidence?.allArmyListUnitsBeginInReserves !== true
    || evidence?.balancedTerrainPieceCount !== expectedTerrainPieceCount
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
    || evidence?.officialComponentEvidenceRefreshPerformed !== true
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
    || evidence?.currentProductAbilityCoverageReleaseHash
      !== state?.officialCurrentProductAbilityCoverageRelease?.releaseHash
    || evidence?.relocationFamilySourceBundleHash
      !== state?.officialRelocationFamilySourceBundle?.bundleHash
    || evidence?.characteristicStatusFamilySourceBundleHash
      !== state?.officialCharacteristicStatusFamilySourceBundle?.bundleHash
    || evidence?.rangedFamilySourceBundleHash
      !== state?.officialRangedFamilySourceBundle?.bundleHash
    || evidence?.meleeFamilySourceBundleHash
      !== state?.officialMeleeFamilySourceBundle?.bundleHash
    || evidence?.reactionFamilySourceBundleHash
      !== state?.officialReactionFamilySourceBundle?.bundleHash
    || evidence?.battlefieldAssetFamilySourceBundleHash
      !== state?.officialBattlefieldAssetFamilySourceBundle?.bundleHash
    || evidence?.battlefieldAssetComponentProfileHash
      !== state?.officialBattlefieldAssetComponentProfile?.profileHash
    || evidence?.battlefieldAssetKnownOfficialFootprintCount !== 3
    || evidence?.currentProductUnitRecordCount !== 26
    || evidence?.currentProductAttackProfileCount !== 51
    || evidence?.unitLifecycleFamilySourceBundleHash
      !== state?.officialUnitLifecycleFamilySourceBundle?.bundleHash
    || evidence?.matchLifecycleFamilySourceBundleHash
      !== state?.officialMatchLifecycleFamilySourceBundle?.bundleHash
    || evidence?.terranUniqueFamilySourceBundleHash
      !== state?.officialTerranUniqueFamilySourceBundle?.bundleHash
    || evidence?.zergUniqueFamilySourceBundleHash
      !== state?.officialZergUniqueFamilySourceBundle?.bundleHash
    || evidence?.protossUniqueFamilySourceBundleHash
      !== state?.officialProtossUniqueFamilySourceBundle?.bundleHash
    || evidence?.summonDataBundleHash !== state?.officialSummonDataBundle?.bundleHash
    || evidence?.respawnMorphDataBundleHash
      !== state?.officialRespawnMorphDataBundle?.bundleHash
    || evidence?.currentProductAbilityExactCount !== 252
    || evidence?.currentProductAbilityPendingCount !== 0
    || authority.trainingTruth !== false) {
    fail("SKIRMISH_500_ROOM_INITIAL_STATE_AUTHORITY_INVALID");
  }
  if (evidence.firstRoundPrepared === true && (state.phase !== "start_of_round"
    || state.stage !== "mission_start_of_round" || state.round !== 1
    || state.activeSideKey !== state.firstPlayerSideKey)) {
    fail("SKIRMISH_500_ROOM_FIRST_ROUND_BINDING_INVALID");
  }
  if (evidence.wave3Gather || evidence.wave3FireInSky || evidence.wave3ArtefactHunt) {
    verifyOfficialWave3RoomMissionBindingV1(state, evidence, expectedMissionRecordKey);
  }
  if (evidence.competitiveMapSeedId) {
    if (state.officialCompetitiveMapRoomFreeze?.seedId
        !== evidence.competitiveMapSeedId
      || state.officialCompetitiveMapRoomFreeze?.compilationHash
        !== evidence.competitiveMapCompilationHash
      || state.officialCompetitiveMapRoomFreeze?.roomFreezeHash
        !== evidence.competitiveMapRoomFreezeHash
      || state.board.competitiveMapRoomFreezeSummary?.roomFreezeHash
        !== evidence.competitiveMapRoomFreezeHash) {
      fail("SKIRMISH_500_ROOM_COMPETITIVE_MAP_BINDING_INVALID");
    }
    verifyOfficialBattlefieldMapManifestV1(
      state.board.battlefieldMapManifest,
      state.officialCompetitiveMapRoomFreeze.setupPlan,
    );
    verifyOfficialCompetitiveMapSemanticRoomFreezeV1(
      state.officialCompetitiveMapRoomFreeze,
      { deploymentGeometryBinding: state.officialDeploymentGeometryBinding,
        deploymentGeometryDataBundle:
          state.officialDeploymentGeometryDataBundle },
    );
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
  verifyOfficialCurrentProductAbilityCoverageReleaseV1(
    state.officialCurrentProductAbilityCoverageRelease,
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
  verifyOfficialMeleeFamilySourceBundleV1(
    state.officialMeleeFamilySourceBundle,
  );
  verifyOfficialReactionFamilySourceBundleV1(
    state.officialReactionFamilySourceBundle,
  );
  verifyOfficialBattlefieldAssetFamilySourceBundleV1(
    state.officialBattlefieldAssetFamilySourceBundle,
  );
  verifyOfficialUnitLifecycleFamilySourceBundleV1(
    state.officialUnitLifecycleFamilySourceBundle,
  );
  verifyOfficialMatchLifecycleFamilySourceBundleV1(
    state.officialMatchLifecycleFamilySourceBundle,
  );
  verifyOfficialTerranUniqueFamilySourceBundleV1(
    state.officialTerranUniqueFamilySourceBundle,
  );
  verifyOfficialZergUniqueFamilySourceBundleV1(
    state.officialZergUniqueFamilySourceBundle,
  );
  verifyOfficialProtossUniqueFamilySourceBundleV1(
    state.officialProtossUniqueFamilySourceBundle,
  );
  verifyOfficialSummonDataBundleV1(state.officialSummonDataBundle);
  verifyOfficialRespawnMorphDataBundleV1(state.officialRespawnMorphDataBundle);
  verifyOfficialBattlefieldAssetComponentProfileV1(
    state.officialBattlefieldAssetComponentProfile,
  );
  verifyOfficialBattlefieldTokenMarkerRegistryV1(
    state.officialBattlefieldTokenMarkerRegistry,
    state.officialBattlefieldTokenMarkerRulesDataBundle,
    state.officialDeploymentGeometryBinding,
  );
  return true;
}
