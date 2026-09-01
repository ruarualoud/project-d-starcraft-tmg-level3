import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
} from "../source-data/official-development-tranche-source-lock-v1.mjs";
import { verifyOfficialBattlefieldTokenMarkerRulesDataBundleV1 } from
  "../source-data/official-battlefield-token-marker-rules-data-bundle-v1.mjs";
import { verifyOfficialBalancedTerrainRulesDataBundleV1 } from
  "../source-data/official-balanced-terrain-rules-data-bundle-v1.mjs";
import { verifyOfficialDeploymentGeometryDataBundleV1 } from
  "../source-data/official-deployment-geometry-data-bundle-v1.mjs";
import {
  createOfficialBattlefieldTokenMarkerRegistryV1,
  deriveOfficialBattlefieldMarkerViewsV1,
  resolveOfficialTokenMarkerCleanupV1,
  verifyOfficialBattlefieldTokenMarkerRegistryV1,
} from "./official-battlefield-token-marker-rules-kernel-v1.mjs";
import { verifyOfficialBalancedTerrainArtifactsV1 } from
  "./official-balanced-terrain-rules-kernel-v1.mjs";
import { verifyOfficialDeploymentGeometryBindingV1 } from
  "./official-deployment-geometry-rules-kernel-v1.mjs";

export const OFFICIAL_BATTLEFIELD_TOKEN_MARKER_RULES_EXECUTOR_ID =
  "authority.battlefield-token-marker-rules-v1";
export const OFFICIAL_BATTLEFIELD_TOKEN_MARKER_RULES_EXECUTOR_VERSION = "1.0.0";
export const OFFICIAL_BATTLEFIELD_TOKEN_MARKER_RULES_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_BATTLEFIELD_TOKEN_MARKER_RULES_ACTION_TYPE =
  "materialize_battlefield_token_marker_registry";
export const OFFICIAL_BATTLEFIELD_TOKEN_MARKER_CLEANUP_ACTION_TYPE =
  "cleanup_battlefield_tokens_and_markers";

export const OFFICIAL_BATTLEFIELD_TOKEN_MARKER_RULES_NEW_ATOM_IDS = Object.freeze([
  "rule-atom:singleton:core-7-3-1-token-definition:1456727a0b83",
  "rule-atom:singleton:core-7-3-1-token-expiry:117b6225ca86",
  "rule-atom:singleton:core-7-3-1-token-measurement:b1abcaaa4633",
  "rule-atom:singleton:core-7-3-1-token-movement:5b38e27ce902",
  "rule-atom:singleton:core-7-3-1-token-terrain:5db1de38e4d0",
  "rule-atom:singleton:core-7-3-2-activation-marker:14e409a3c6d6",
  "rule-atom:singleton:core-7-3-2-faction-indicator:3eee0e84fd82",
  "rule-atom:singleton:core-7-3-2-first-player-marker:90c272a2b6e6",
  "rule-atom:singleton:core-7-3-2-marker-definition:cdaab88547f1",
  "rule-atom:singleton:core-7-3-2-mode-marker:1c2b26c90c15",
  "rule-atom:singleton:core-7-3-2-zone-of-influence-marker:cc2772b16127",
].sort());
export const OFFICIAL_BATTLEFIELD_TOKEN_MARKER_RULES_ACTION_ATOM_IDS =
  OFFICIAL_BATTLEFIELD_TOKEN_MARKER_RULES_NEW_ATOM_IDS;
export const OFFICIAL_BATTLEFIELD_TOKEN_MARKER_RULES_EXECUTOR_ATOM_IDS =
  OFFICIAL_BATTLEFIELD_TOKEN_MARKER_RULES_NEW_ATOM_IDS;

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}
function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function clone(value) { return structuredClone(value); }
function executableAction(value) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => (
    !["isEnabled", "disabledReason", "score", "details"].includes(key))));
}

function baseContext(state, options = {}) {
  const audit = state?.officialDevelopmentTrancheSourceLockAudit;
  const gameplay = state?.officialGameplayDataBundle;
  const geometryData = state?.officialDeploymentGeometryDataBundle;
  const geometry = state?.officialDeploymentGeometryBinding;
  const terrainData = state?.officialBalancedTerrainRulesDataBundle;
  const dataBundle = state?.officialBattlefieldTokenMarkerRulesDataBundle;
  if (!object(audit) || audit.lockHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH
    || audit.snapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || audit.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || audit.repositoryFallbackAllowed !== false || audit.trainingTruth !== false
    || gameplay?.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || gameplay?.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || gameplay?.repositoryFallbackAllowed !== false || gameplay?.trainingTruth !== false) {
    fail("BATTLEFIELD_TOKEN_MARKER_SOURCE_LOCK_BINDING_INVALID");
  }
  verifyOfficialDeploymentGeometryBindingV1(geometry);
  verifyOfficialDeploymentGeometryDataBundleV1(geometryData);
  verifyOfficialBalancedTerrainRulesDataBundleV1(terrainData);
  verifyOfficialBattlefieldTokenMarkerRulesDataBundleV1(dataBundle);
  if (dataBundle.deploymentGeometryDataBundleHash !== geometryData.bundleHash
    || terrainData.deploymentGeometryDataBundleHash !== geometryData.bundleHash
    || geometry.deploymentGeometryDataBundleHash !== geometryData.bundleHash) {
    fail("BATTLEFIELD_TOKEN_MARKER_DATA_LINEAGE_INVALID");
  }
  const dataHash = hashStarcraftTmgContract(gameplay);
  if (options.matchBinding && (options.matchBinding.dataSnapshotHash !== dataHash
    || options.matchBinding.dependencies?.dataSnapshot?.contentHash !== dataHash)) {
    fail("BATTLEFIELD_TOKEN_MARKER_DATA_ARTIFACT_BINDING_INVALID");
  }
  const sideKey = String(options.sideKey || state?.activeSideKey
    || state?.firstPlayerSideKey || "").trim();
  if (!object(state) || !geometry.participantIds.includes(sideKey)
    || !geometry.participantIds.includes(state.firstPlayerSideKey)) {
    fail("BATTLEFIELD_TOKEN_MARKER_STATE_INVALID");
  }
  verifyOfficialBalancedTerrainArtifactsV1({
    deploymentGeometryBinding: geometry,
    balancedTerrainRulesDataBundle: terrainData,
    terrainPieces: state.board?.terrain,
    specialTerrainAgreement: state.board?.specialTerrainAgreement,
    terrainHeightTierLedger: state.officialTerrainHeightTierLedger,
    missionMarkerPlacement: state.officialMissionMarkerPlacement,
    certificate: state.officialBalancedTerrainSetupCertificate,
  });
  return { state, sideKey, dataBundle, geometry };
}

function setupContextFor(state, options = {}) {
  const base = baseContext(state, options);
  const { sideKey, dataBundle, geometry } = base;
  if (!object(state) || state.rulesProcedureMode !== true || state.pendingAction
    || state.phase !== "pre_game"
    || state.officialBattlefieldSetup?.stage
      !== "terrain_and_mission_markers_complete_ticket_11_slice_109_pending"
    || !object(state.officialBalancedTerrainSetupCertificate)
    || !object(state.officialMissionMarkerPlacement)
    || object(state.officialBattlefieldTokenMarkerRegistry)) {
    fail("BATTLEFIELD_TOKEN_MARKER_PROCEDURE_WINDOW_INVALID");
  }
  const registry = createOfficialBattlefieldTokenMarkerRegistryV1({
    battlefieldTokenMarkerRulesDataBundle: dataBundle,
    deploymentGeometryBinding: geometry,
  });
  const views = deriveOfficialBattlefieldMarkerViewsV1({ registry,
    pieces: state.pieces, missionMarkers: state.officialMissionMarkerPlacement.missionMarkers,
    firstPlayerSideKey: state.firstPlayerSideKey });
  return { sideKey, dataBundle, geometry, registry, views };
}

function setupAction(context) {
  return { actionType: OFFICIAL_BATTLEFIELD_TOKEN_MARKER_RULES_ACTION_TYPE,
    sideKey: context.sideKey, phase: "pre_game", pieceId: "",
    expectedRegistryHash: context.registry.registryHash,
    expectedMarkerViewHash: context.views.viewHash,
    ruleAtomIds: [...OFFICIAL_BATTLEFIELD_TOKEN_MARKER_RULES_ACTION_ATOM_IDS],
    executorId: OFFICIAL_BATTLEFIELD_TOKEN_MARKER_RULES_EXECUTOR_ID,
    executorVersion: OFFICIAL_BATTLEFIELD_TOKEN_MARKER_RULES_EXECUTOR_VERSION };
}

function cleanupContextFor(state, options = {}) {
  const base = baseContext(state, options);
  const registry = state.officialBattlefieldTokenMarkerRegistry;
  verifyOfficialBattlefieldTokenMarkerRegistryV1(registry,
    base.dataBundle, base.geometry);
  if (state.phase !== "cleanup" || state.pendingAction
    || base.sideKey !== state.firstPlayerSideKey
    || !Array.isArray(state.officialBattlefieldTokens)
    || !Array.isArray(state.officialBattlefieldMarkers)
    || Number(state.lastBattlefieldTokenMarkerCleanupRound) === Number(state.round)) {
    fail("BATTLEFIELD_TOKEN_MARKER_CLEANUP_WINDOW_INVALID");
  }
  const cleanup = resolveOfficialTokenMarkerCleanupV1({ registry,
    tokens: state.officialBattlefieldTokens,
    markers: state.officialBattlefieldMarkers });
  return { ...base, registry, cleanup };
}

function cleanupAction(context) {
  return { actionType: OFFICIAL_BATTLEFIELD_TOKEN_MARKER_CLEANUP_ACTION_TYPE,
    sideKey: context.sideKey, phase: "cleanup", pieceId: "",
    expectedRegistryHash: context.registry.registryHash,
    expectedTokenMarkerCleanupHash: context.cleanup.cleanupHash,
    ruleAtomIds: [...OFFICIAL_BATTLEFIELD_TOKEN_MARKER_RULES_ACTION_ATOM_IDS],
    executorId: OFFICIAL_BATTLEFIELD_TOKEN_MARKER_RULES_EXECUTOR_ID,
    executorVersion: OFFICIAL_BATTLEFIELD_TOKEN_MARKER_RULES_EXECUTOR_VERSION };
}

export function enumerateOfficialBattlefieldTokenMarkerRulesV1(state, options = {}) {
  const cleanupWindow = state?.phase === "cleanup"
    && object(state?.officialBattlefieldTokenMarkerRegistry);
  try {
    if (cleanupWindow) {
      const context = cleanupContextFor(state, options);
      return [{ ...cleanupAction(context), isEnabled: true, disabledReason: "", score: 1,
        details: { deterministicCleanup: true,
          tokenCountBefore: state.officialBattlefieldTokens.length,
          markerCountBefore: state.officialBattlefieldMarkers.length,
          removedTokenCount: context.cleanup.removedTokenIds.length,
          removedMarkerCount: context.cleanup.removedMarkerIds.length,
          retainedTokenCount: context.cleanup.retainedTokenIds.length,
          retainedMarkerCount: context.cleanup.retainedMarkerIds.length,
          rulesTruth: "official_token_marker_cleanup_before_cleanup_refresh",
          trainingTruth: false } }];
    }
    const context = setupContextFor(state, options);
    return [{ ...setupAction(context), isEnabled: true, disabledReason: "", score: 1,
      details: { deterministicRegistry: true,
        zoneOfInfluenceMarkerCount: context.registry.partialEntryEdgeMarkerCount,
        tokenBaseAuthority: "official_mm_divided_by_25_4",
        markerRulesDiameterInches: 0,
        visualScalingAffectsRulesGeometry: false,
        rulesTruth: "official_token_marker_registry_materialization",
        trainingTruth: false } }];
  } catch (error) {
    if (options.includeDisabled !== true) return [];
    return [{ actionType: cleanupWindow
        ? OFFICIAL_BATTLEFIELD_TOKEN_MARKER_CLEANUP_ACTION_TYPE
        : OFFICIAL_BATTLEFIELD_TOKEN_MARKER_RULES_ACTION_TYPE,
      sideKey: String(options.sideKey || state?.activeSideKey || ""),
      phase: String(state?.phase || ""), pieceId: "",
      expectedRegistryHash: null, expectedMarkerViewHash: null,
      expectedTokenMarkerCleanupHash: null,
      ruleAtomIds: [...OFFICIAL_BATTLEFIELD_TOKEN_MARKER_RULES_ACTION_ATOM_IDS],
      executorId: OFFICIAL_BATTLEFIELD_TOKEN_MARKER_RULES_EXECUTOR_ID,
      executorVersion: OFFICIAL_BATTLEFIELD_TOKEN_MARKER_RULES_EXECUTOR_VERSION,
      isEnabled: false,
      disabledReason: String(error?.message || error).split(":")[0], score: 0,
      details: { trainingTruth: false } }];
  }
}

export function applyOfficialBattlefieldTokenMarkerRulesV1(stateInput,
  actionInput, options = {}) {
  if (!object(actionInput)
    || ![OFFICIAL_BATTLEFIELD_TOKEN_MARKER_RULES_ACTION_TYPE,
      OFFICIAL_BATTLEFIELD_TOKEN_MARKER_CLEANUP_ACTION_TYPE]
      .includes(actionInput.actionType)
    || actionInput.executorId !== OFFICIAL_BATTLEFIELD_TOKEN_MARKER_RULES_EXECUTOR_ID
    || actionInput.executorVersion
      !== OFFICIAL_BATTLEFIELD_TOKEN_MARKER_RULES_EXECUTOR_VERSION
    || !isDeepStrictEqual([...(actionInput.ruleAtomIds || [])].sort(),
      [...OFFICIAL_BATTLEFIELD_TOKEN_MARKER_RULES_ACTION_ATOM_IDS])) {
    fail("BATTLEFIELD_TOKEN_MARKER_ACTION_INVALID");
  }
  if (actionInput.actionType === OFFICIAL_BATTLEFIELD_TOKEN_MARKER_CLEANUP_ACTION_TYPE) {
    const context = cleanupContextFor(stateInput,
      { ...options, sideKey: actionInput.sideKey });
    const expected = cleanupAction(context);
    if (!isDeepStrictEqual(actionInput, expected)) {
      fail("BATTLEFIELD_TOKEN_MARKER_CLEANUP_ACTION_STALE");
    }
    const state = clone(stateInput);
    state.officialBattlefieldTokens = clone(context.cleanup.tokens);
    state.officialBattlefieldMarkers = clone(context.cleanup.markers);
    state.lastBattlefieldTokenMarkerCleanupRound = Number(state.round);
    const resolution = { ...clone(context.cleanup), sideKey: actionInput.sideKey,
      round: Number(state.round), cleanupStepAfter: "cleanup_refresh",
      rulesTruth: "official_token_marker_cleanup_before_cleanup_refresh",
      trainingTruth: false };
    state.lastBattlefieldTokenMarkerCleanupResolution = resolution;
    state.battlefieldTokenMarkerCleanupHistory =
      Array.isArray(state.battlefieldTokenMarkerCleanupHistory)
        ? state.battlefieldTokenMarkerCleanupHistory : [];
    state.battlefieldTokenMarkerCleanupHistory.push(clone(resolution));
    const event = { type: "battlefield_tokens_and_markers_cleaned",
      sideKey: actionInput.sideKey, round: Number(state.round),
      cleanupHash: context.cleanup.cleanupHash,
      removedTokenIds: clone(context.cleanup.removedTokenIds),
      removedMarkerIds: clone(context.cleanup.removedMarkerIds),
      trainingTruth: false };
    state.log = Array.isArray(state.log) ? state.log : [];
    state.log.push({ type: "battlefield_token_marker_cleanup_resolution",
      round: Number(state.round), phase: state.phase, sideKey: actionInput.sideKey,
      action: clone(actionInput), events: [clone(event)], trainingTruth: false });
    return { ok: true,
      schemaVersion: "starcraft_tmg_official_battlefield_token_marker_cleanup_transition_v1",
      executorId: OFFICIAL_BATTLEFIELD_TOKEN_MARKER_RULES_EXECUTOR_ID,
      executorVersion: OFFICIAL_BATTLEFIELD_TOKEN_MARKER_RULES_EXECUTOR_VERSION,
      state, events: [event], action: clone(actionInput), settlementRequired: false,
      rulesTruth: "official_token_marker_cleanup_before_cleanup_refresh",
      trainingTruth: false };
  }
  const context = setupContextFor(stateInput, { ...options, sideKey: actionInput.sideKey });
  const expected = setupAction(context);
  if (!isDeepStrictEqual(actionInput, expected)) {
    fail("BATTLEFIELD_TOKEN_MARKER_ACTION_STALE");
  }
  verifyOfficialBattlefieldTokenMarkerRegistryV1(context.registry,
    context.dataBundle, context.geometry);
  const state = clone(stateInput);
  state.officialBattlefieldTokenMarkerRegistry = clone(context.registry);
  state.officialBattlefieldMarkerViewsAtSetup = clone(context.views);
  state.officialBattlefieldTokens = [];
  state.officialBattlefieldMarkers = [];
  state.officialBattlefieldSetup = { ...clone(state.officialBattlefieldSetup),
    stage: "battlefield_token_marker_registry_complete_ticket_11_slice_110_pending",
    battlefieldTokenMarkerRegistryHash: context.registry.registryHash,
    zoneOfInfluenceMarkerCount: context.registry.partialEntryEdgeMarkerCount,
    tokenMarkerRulesTruth: "official_token_marker_primitives_materialized",
    trainingTruth: false };
  const resolutionBody = { schema:
      "starcraft_tmg_official_battlefield_token_marker_rules_resolution_v1",
    sideKey: actionInput.sideKey,
    registryHash: context.registry.registryHash,
    markerViewHash: context.views.viewHash,
    zoneOfInfluenceMarkerCount: context.registry.partialEntryEdgeMarkerCount,
    tokenTerrainSize: 0, markerRulesDiameterInches: 0,
    setupStageAfter: state.officialBattlefieldSetup.stage,
    sourceRefreshPerformed: false, repositoryFallbackUsed: false,
    rulesTruth: "official_token_marker_primitives_materialized",
    trainingTruth: false };
  const resolution = { ...resolutionBody,
    resolutionHash: hashStarcraftTmgContract(resolutionBody) };
  state.lastBattlefieldTokenMarkerRulesResolution = resolution;
  state.battlefieldTokenMarkerRulesHistory =
    Array.isArray(state.battlefieldTokenMarkerRulesHistory)
      ? state.battlefieldTokenMarkerRulesHistory : [];
  state.battlefieldTokenMarkerRulesHistory.push(clone(resolution));
  const event = { type: "battlefield_token_marker_registry_materialized",
    sideKey: actionInput.sideKey, registryHash: context.registry.registryHash,
    zoneOfInfluenceMarkerCount: context.registry.partialEntryEdgeMarkerCount,
    setupStageAfter: resolution.setupStageAfter, trainingTruth: false };
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({ type: "battlefield_token_marker_rules_resolution",
    round: Number(state.round), phase: state.phase, sideKey: actionInput.sideKey,
    action: clone(actionInput), events: [clone(event)], trainingTruth: false });
  return { ok: true,
    schemaVersion: "starcraft_tmg_official_battlefield_token_marker_rules_transition_v1",
    executorId: OFFICIAL_BATTLEFIELD_TOKEN_MARKER_RULES_EXECUTOR_ID,
    executorVersion: OFFICIAL_BATTLEFIELD_TOKEN_MARKER_RULES_EXECUTOR_VERSION,
    state, events: [event], action: clone(actionInput), settlementRequired: false,
    rulesTruth: "official_token_marker_primitives_materialized",
    trainingTruth: false };
}
