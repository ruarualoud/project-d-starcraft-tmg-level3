import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
} from "../source-data/official-development-tranche-source-lock-v1.mjs";
import { verifyOfficialBalancedTerrainRulesDataBundleV1 } from
  "../source-data/official-balanced-terrain-rules-data-bundle-v1.mjs";
import { verifyOfficialDeploymentGeometryDataBundleV1 } from
  "../source-data/official-deployment-geometry-data-bundle-v1.mjs";
import {
  certifyOfficialBalancedTerrainSetupV1,
  OFFICIAL_BALANCED_TERRAIN_SETUP_PLAN_SCHEMA,
  verifyOfficialBalancedTerrainArtifactsV1,
} from "./official-balanced-terrain-rules-kernel-v1.mjs";
import { verifyOfficialDeploymentGeometryBindingV1 } from
  "./official-deployment-geometry-rules-kernel-v1.mjs";

export const OFFICIAL_BALANCED_TERRAIN_RULES_EXECUTOR_ID =
  "authority.balanced-terrain-rules-v1";
export const OFFICIAL_BALANCED_TERRAIN_RULES_EXECUTOR_VERSION = "1.0.0";
export const OFFICIAL_BALANCED_TERRAIN_RULES_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_BALANCED_TERRAIN_RULES_ACTION_TYPE =
  "materialize_balanced_terrain_setup";
export const OFFICIAL_BALANCED_TERRAIN_RULES_PARAMETER_KIND =
  "official_balanced_terrain_setup_plan_v1";

export const OFFICIAL_BALANCED_TERRAIN_RULES_NEW_ATOM_IDS = Object.freeze([
  "rule-atom:singleton:core-12-1-set-balanced-terrain:00bb00c10ff7",
  "rule-atom:singleton:core-9-3-centre-significant-terrain:066aeb9df796",
  "rule-atom:singleton:core-9-3-fire-lane-requirement:0e26a394f7e6",
  "rule-atom:singleton:core-9-3-grass-terrain-count:47f3dec12027",
  "rule-atom:singleton:core-9-3-grass-terrain-effects:432dd26ff77f",
  "rule-atom:singleton:core-9-3-impassable-terrain-relocation:29b2089ecf0c",
  "rule-atom:singleton:core-9-3-large-terrain-access-point:cdc152e8b025",
  "rule-atom:singleton:core-9-3-size-one-terrain-count:82f6d0b9b519",
  "rule-atom:singleton:core-9-3-size-one-terrain-effects:801815c33830",
  "rule-atom:singleton:core-9-3-size-three-terrain-count:26e30b15f8e1",
  "rule-atom:singleton:core-9-3-size-three-terrain-effects:14b5a1ba4a6f",
  "rule-atom:singleton:core-9-3-size-two-terrain-count:d375e7bbff60",
  "rule-atom:singleton:core-9-3-size-two-terrain-effects:b5a5dc0038ef",
  "rule-atom:singleton:core-9-3-terrain-guideline-scaling:4f33fb35708c",
  "rule-atom:singleton:core-9-3-terrain-quadrant-distribution:225ecb5c33c8",
  "rule-atom:singleton:core-9-3-terrain-selection-or-alternating-placement:e7941b183c8a",
  "rule-atom:singleton:core-9-3-total-and-size-zero-terrain-count:a27d7a8ab649",
].sort());
export const OFFICIAL_BALANCED_TERRAIN_RULES_ACTION_ATOM_IDS =
  OFFICIAL_BALANCED_TERRAIN_RULES_NEW_ATOM_IDS;
export const OFFICIAL_BALANCED_TERRAIN_RULES_EXECUTOR_ATOM_IDS =
  OFFICIAL_BALANCED_TERRAIN_RULES_NEW_ATOM_IDS;

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}
function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function clone(value) { return structuredClone(value); }
function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}
function contractAction(value) {
  return without(value, ["isEnabled", "disabledReason", "score", "details"]);
}

function sourceAndBundles(state, matchBinding = null) {
  const audit = state?.officialDevelopmentTrancheSourceLockAudit;
  const gameplay = state?.officialGameplayDataBundle;
  const geometryData = state?.officialDeploymentGeometryDataBundle;
  const terrainData = state?.officialBalancedTerrainRulesDataBundle;
  const geometryBinding = state?.officialDeploymentGeometryBinding;
  if (!object(audit) || audit.lockHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH
    || audit.snapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || audit.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || audit.repositoryFallbackAllowed !== false || audit.trainingTruth !== false
    || gameplay?.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || gameplay?.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || gameplay?.repositoryFallbackAllowed !== false || gameplay?.trainingTruth !== false) {
    fail("BALANCED_TERRAIN_SOURCE_LOCK_BINDING_INVALID");
  }
  verifyOfficialDeploymentGeometryDataBundleV1(geometryData);
  verifyOfficialBalancedTerrainRulesDataBundleV1(terrainData);
  verifyOfficialDeploymentGeometryBindingV1(geometryBinding, geometryData);
  if (terrainData.deploymentGeometryDataBundleHash !== geometryData.bundleHash) {
    fail("BALANCED_TERRAIN_DATA_BUNDLE_LINEAGE_INVALID");
  }
  if (matchBinding) {
    const dataHash = hashStarcraftTmgContract(gameplay);
    if (matchBinding.dataSnapshotHash !== dataHash
      || matchBinding.dependencies?.dataSnapshot?.contentHash !== dataHash) {
      fail("BALANCED_TERRAIN_DATA_ARTIFACT_BINDING_INVALID");
    }
  }
  return { gameplay, geometryData, terrainData, geometryBinding };
}

function domainFor(state, options = {}) {
  const bundles = sourceAndBundles(state, options.matchBinding);
  const sideKey = String(options.sideKey || state?.activeSideKey || "").trim();
  if (!object(state) || state.rulesProcedureMode !== true || state.pendingAction
    || state.phase !== "pre_game"
    || state.officialBattlefieldSetup?.stage !== "terrain_pending_ticket_11_slice_108"
    || object(state.officialBalancedTerrainSetupCertificate)
    || !bundles.geometryBinding.participantIds.includes(sideKey)) {
    fail("BALANCED_TERRAIN_PROCEDURE_WINDOW_INVALID");
  }
  const body = { schemaVersion: "starcraft_tmg_official_parameter_domain_v1",
    parameterKind: OFFICIAL_BALANCED_TERRAIN_RULES_PARAMETER_KIND,
    matchBindingHash: String(options.matchBinding?.bindingHash || ""),
    round: Number(state.round), phase: state.phase, sideKey,
    actionType: OFFICIAL_BALANCED_TERRAIN_RULES_ACTION_TYPE, pieceId: "",
    executorId: OFFICIAL_BALANCED_TERRAIN_RULES_EXECUTOR_ID,
    executorVersion: OFFICIAL_BALANCED_TERRAIN_RULES_EXECUTOR_VERSION,
    ruleAtomIds: [...OFFICIAL_BALANCED_TERRAIN_RULES_ACTION_ATOM_IDS],
    parameterSchema: { type: "object", required: ["setupPlan"],
      setupPlan: { schema: OFFICIAL_BALANCED_TERRAIN_SETUP_PLAN_SCHEMA,
        placementMethods: ["official_premade", "alternating"],
        completeTerrainDenominatorRequired: true,
        allPlayerPhysicalLayoutConfirmationRequired: true },
      selectionOwner: "pregame_participant_with_all_player_confirmation" },
    constraints: { deploymentGeometryBindingHash: bundles.geometryBinding.bindingHash,
      balancedTerrainRulesDataBundleHash: bundles.terrainData.bundleHash,
      battlefield: clone(bundles.geometryBinding.battlefield),
      participantIds: clone(bundles.geometryBinding.participantIds),
      markerTargetCount: bundles.geometryBinding.markerTargets.length,
      rulesOwnBalanceVerdict: true, clientSuppliedBalanceVerdictAccepted: false },
    confirmationClass: "explicit_human",
    rulesTruth: "official_balanced_terrain_setup_parameter_domain",
    trainingTruth: false };
  return { domain: { ...body, domainId: `sc-domain-${hashStarcraftTmgContract(body)}` },
    bundles };
}

export function enumerateOfficialBalancedTerrainRulesV1(state, options = {}) {
  const candidates = []; const parameterDomains = [];
  try {
    const { domain } = domainFor(state, options);
    parameterDomains.push(domain);
    candidates.push({ actionType: OFFICIAL_BALANCED_TERRAIN_RULES_ACTION_TYPE,
      sideKey: domain.sideKey, phase: domain.phase, pieceId: "",
      ruleAtomIds: [...OFFICIAL_BALANCED_TERRAIN_RULES_ACTION_ATOM_IDS],
      executorId: OFFICIAL_BALANCED_TERRAIN_RULES_EXECUTOR_ID,
      executorVersion: OFFICIAL_BALANCED_TERRAIN_RULES_EXECUTOR_VERSION,
      isEnabled: true, disabledReason: "", score: 1,
      details: { parameterized: true, parameterKind: domain.parameterKind,
        battlefield: clone(domain.constraints.battlefield),
        terrainSetupMethods: ["official_premade", "alternating"],
        trainingTruth: false } });
  } catch (error) {
    if (!options.includeDisabled) return { candidates, parameterDomains };
    candidates.push({ actionType: OFFICIAL_BALANCED_TERRAIN_RULES_ACTION_TYPE,
      sideKey: String(options.sideKey || state?.activeSideKey || ""),
      phase: String(state?.phase || ""), pieceId: "",
      ruleAtomIds: [...OFFICIAL_BALANCED_TERRAIN_RULES_ACTION_ATOM_IDS],
      executorId: OFFICIAL_BALANCED_TERRAIN_RULES_EXECUTOR_ID,
      executorVersion: OFFICIAL_BALANCED_TERRAIN_RULES_EXECUTOR_VERSION,
      isEnabled: false,
      disabledReason: String(error?.message || error).split(":")[0],
      score: 0, details: { trainingTruth: false } });
  }
  return { candidates, parameterDomains };
}

function certify(state, setupPlan, bundles) {
  return certifyOfficialBalancedTerrainSetupV1({
    deploymentGeometryBinding: bundles.geometryBinding,
    deploymentGeometryDataBundle: bundles.geometryData,
    balancedTerrainRulesDataBundle: bundles.terrainData,
    setupPlan,
  });
}

export function instantiateOfficialBalancedTerrainRulesV1(state, domain,
  parameters, options = {}) {
  const expected = domainFor(state, options);
  if (!isDeepStrictEqual(domain, expected.domain)) {
    fail("BALANCED_TERRAIN_PARAMETER_DOMAIN_STALE");
  }
  if (!object(parameters) || Object.keys(parameters).length !== 1
    || !object(parameters.setupPlan)) {
    fail("BALANCED_TERRAIN_PARAMETERS_INVALID");
  }
  const artifacts = certify(state, parameters.setupPlan, expected.bundles);
  verifyOfficialBalancedTerrainArtifactsV1({ ...artifacts,
    deploymentGeometryBinding: expected.bundles.geometryBinding,
    balancedTerrainRulesDataBundle: expected.bundles.terrainData });
  const canonicalPlan = clone(parameters.setupPlan);
  const planHash = hashStarcraftTmgContract(canonicalPlan);
  return { action: {
    actionType: OFFICIAL_BALANCED_TERRAIN_RULES_ACTION_TYPE,
    sideKey: expected.domain.sideKey, phase: expected.domain.phase, pieceId: "",
    balancedTerrainPlan: { schema:
      "starcraft_tmg_official_balanced_terrain_action_plan_v1",
    setupPlan: canonicalPlan, setupPlanHash: planHash,
    expectedCertificateHash: artifacts.certificate.certificateHash,
    expectedTerrainHeightTierLedgerHash: artifacts.terrainHeightTierLedger.ledgerHash,
    expectedMissionMarkerPlacementHash: artifacts.missionMarkerPlacement.placementHash,
    expectedSpecialTerrainAgreementHash: artifacts.specialTerrainAgreement.agreementHash,
    deploymentGeometryBindingHash: expected.bundles.geometryBinding.bindingHash,
    balancedTerrainRulesDataBundleHash: expected.bundles.terrainData.bundleHash,
    sourceRefreshPerformed: false, trainingTruth: false },
    domainId: domain.domainId,
    ruleAtomIds: [...OFFICIAL_BALANCED_TERRAIN_RULES_ACTION_ATOM_IDS],
    executorId: OFFICIAL_BALANCED_TERRAIN_RULES_EXECUTOR_ID,
    executorVersion: OFFICIAL_BALANCED_TERRAIN_RULES_EXECUTOR_VERSION,
    isEnabled: true, disabledReason: "", score: 1,
    details: { placementMethod: artifacts.certificate.placementMethod.placementMethod,
      terrainPieceCount: artifacts.certificate.terrainPieces.length,
      fireLaneCount: artifacts.certificate.fireLanes.clearOpposingEntryLaneCount,
      certificateHash: artifacts.certificate.certificateHash,
      rulesOwnedBalanceVerdict: true, trainingTruth: false } },
  canonicalParameters: { setupPlan: canonicalPlan } };
}

export function applyOfficialBalancedTerrainRulesV1(stateInput, actionInput,
  options = {}) {
  if (!object(actionInput)
    || actionInput.actionType !== OFFICIAL_BALANCED_TERRAIN_RULES_ACTION_TYPE
    || actionInput.executorId !== OFFICIAL_BALANCED_TERRAIN_RULES_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_BALANCED_TERRAIN_RULES_EXECUTOR_VERSION
    || !isDeepStrictEqual([...(actionInput.ruleAtomIds || [])].sort(),
      [...OFFICIAL_BALANCED_TERRAIN_RULES_ACTION_ATOM_IDS])) {
    fail("BALANCED_TERRAIN_ACTION_INVALID");
  }
  const expectedDomain = domainFor(stateInput, options);
  const setupPlan = actionInput.balancedTerrainPlan?.setupPlan;
  if (!object(setupPlan)
    || actionInput.balancedTerrainPlan.setupPlanHash
      !== hashStarcraftTmgContract(setupPlan)) {
    fail("BALANCED_TERRAIN_ACTION_PLAN_INVALID");
  }
  const expected = instantiateOfficialBalancedTerrainRulesV1(stateInput,
    expectedDomain.domain, { setupPlan }, options);
  if (!isDeepStrictEqual(contractAction(actionInput), contractAction(expected.action))) {
    fail("BALANCED_TERRAIN_ACTION_STALE");
  }
  const artifacts = certify(stateInput, setupPlan, expectedDomain.bundles);
  verifyOfficialBalancedTerrainArtifactsV1({ ...artifacts,
    deploymentGeometryBinding: expectedDomain.bundles.geometryBinding,
    balancedTerrainRulesDataBundle: expectedDomain.bundles.terrainData });
  const state = clone(stateInput);
  state.board = object(state.board) ? state.board : {};
  state.board.terrain = clone(artifacts.terrainPieces);
  state.board.specialTerrainAgreement = clone(artifacts.specialTerrainAgreement);
  state.officialTerrainHeightTierLedger = clone(artifacts.terrainHeightTierLedger);
  state.officialMissionMarkerPlacement = clone(artifacts.missionMarkerPlacement);
  state.officialBalancedTerrainSetupCertificate = clone(artifacts.certificate);
  state.officialBattlefieldSetup = { ...clone(state.officialBattlefieldSetup),
    terrainPieceIds: artifacts.terrainPieces.map((entry) => entry.id).sort(),
    terrainHeightTierLedgerHash: artifacts.terrainHeightTierLedger.ledgerHash,
    missionMarkers: clone(artifacts.missionMarkerPlacement.missionMarkers),
    setupSequence: state.officialBattlefieldSetup.setupSequence.map((entry) => ({
      ...entry, status: "complete" })),
    stage: "terrain_and_mission_markers_complete_ticket_11_slice_109_pending",
    balancedTerrainCertificateHash: artifacts.certificate.certificateHash,
    rulesTruth: "official_balanced_terrain_and_marker_setup_complete",
    trainingTruth: false };
  const resolution = { schema:
      "starcraft_tmg_official_balanced_terrain_rules_resolution_v1",
    sideKey: actionInput.sideKey,
    placementMethod: artifacts.certificate.placementMethod.placementMethod,
    terrainPieceCount: artifacts.terrainPieces.length,
    certificateHash: artifacts.certificate.certificateHash,
    terrainHeightTierLedgerHash: artifacts.terrainHeightTierLedger.ledgerHash,
    missionMarkerPlacementHash: artifacts.missionMarkerPlacement.placementHash,
    setupStageAfter: state.officialBattlefieldSetup.stage,
    rulesOwnedBalanceVerdict: true,
    clientSuppliedBalanceVerdictAccepted: false,
    sourceRefreshPerformed: false, repositoryFallbackUsed: false,
    trainingTruth: false };
  resolution.resolutionHash = hashStarcraftTmgContract(resolution);
  state.lastBalancedTerrainRulesResolution = resolution;
  state.balancedTerrainRulesHistory = Array.isArray(state.balancedTerrainRulesHistory)
    ? state.balancedTerrainRulesHistory : [];
  state.balancedTerrainRulesHistory.push(clone(resolution));
  const event = { type: "balanced_terrain_setup_materialized",
    sideKey: actionInput.sideKey, certificateHash: resolution.certificateHash,
    terrainPieceCount: resolution.terrainPieceCount,
    setupStageAfter: resolution.setupStageAfter, trainingTruth: false };
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({ type: "balanced_terrain_rules_resolution",
    round: Number(state.round), phase: state.phase, sideKey: actionInput.sideKey,
    action: clone(actionInput), events: [clone(event)], trainingTruth: false });
  return { ok: true,
    schemaVersion: "starcraft_tmg_official_balanced_terrain_rules_transition_v1",
    executorId: OFFICIAL_BALANCED_TERRAIN_RULES_EXECUTOR_ID,
    executorVersion: OFFICIAL_BALANCED_TERRAIN_RULES_EXECUTOR_VERSION,
    state, events: [event], action: clone(actionInput), settlementRequired: false,
    rulesTruth: "official_balanced_terrain_setup_materialized",
    trainingTruth: false };
}
