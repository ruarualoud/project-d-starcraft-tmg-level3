import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
} from "../source-data/official-development-tranche-source-lock-v1.mjs";
import { verifyOfficialDeploymentGeometryDataBundleV1 } from
  "../source-data/official-deployment-geometry-data-bundle-v1.mjs";
import { verifyOfficialMissionDeploymentDraftDataBundleV1 } from
  "../source-data/official-mission-deployment-draft-data-bundle-v1.mjs";
import {
  createOfficialDeploymentGeometryBindingV1,
  verifyOfficialDeploymentGeometryBindingV1,
} from "./official-deployment-geometry-rules-kernel-v1.mjs";
import { verifyOfficialMissionDeploymentDraftStateV1 } from
  "./official-mission-deployment-draft-rules-kernel-v1.mjs";

export const OFFICIAL_DEPLOYMENT_GEOMETRY_RULES_EXECUTOR_ID =
  "authority.deployment-geometry-rules-v1";
export const OFFICIAL_DEPLOYMENT_GEOMETRY_RULES_EXECUTOR_VERSION = "1.0.0";
export const OFFICIAL_DEPLOYMENT_GEOMETRY_RULES_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_DEPLOYMENT_GEOMETRY_RULES_ACTION_TYPE =
  "materialize_deployment_geometry";

export const OFFICIAL_DEPLOYMENT_GEOMETRY_RULES_NEW_ATOM_IDS = Object.freeze([
  "rule-atom:mission-marker-full-specification",
  "rule-atom:singleton:core-11-mission-marker-setup:13c7450b893e",
  "rule-atom:singleton:core-12-1-set-mission-markers:1a3973119a39",
  "rule-atom:singleton:core-9-3-battlefield-setup-order:708f23b58fba",
  "rule-atom:singleton:core-9-3-deployment-entry-edges:f208ddd78c25",
  "rule-atom:singleton:core-9-3-deployment-table-dimensions:9ec80305904c",
  "rule-atom:singleton:core-9-3-mission-marker-coordinates:4c82510823eb",
  "rule-atom:singleton:core-9-3-mission-marker-elevation:d629af1e14c1",
  "rule-atom:singleton:core-9-3-mission-marker-impassable-prohibition:336f72310fdc",
  "rule-atom:singleton:core-9-3-zone-of-influence-corner-markers:f32222510e15",
  "rule-atom:singleton:faq-9-43-skirmish-battlefield-dimensions:f2e95675daaa",
  "rule-atom:singleton:faq-9-46-terrain-height-tier-game-start:adda69721608",
].sort());
export const OFFICIAL_DEPLOYMENT_GEOMETRY_RULES_ACTION_ATOM_IDS =
  OFFICIAL_DEPLOYMENT_GEOMETRY_RULES_NEW_ATOM_IDS;
export const OFFICIAL_DEPLOYMENT_GEOMETRY_RULES_EXECUTOR_ATOM_IDS =
  OFFICIAL_DEPLOYMENT_GEOMETRY_RULES_NEW_ATOM_IDS;

function fail(code, detail = "") { throw new Error(detail ? `${code}:${detail}` : code); }
function object(value) { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function clone(value) { return structuredClone(value); }
function contractAction(value) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => (
    !["isEnabled", "disabledReason", "score", "details"].includes(key))));
}

function bundles(state, matchBinding = null) {
  const audit = state?.officialDevelopmentTrancheSourceLockAudit;
  const gameplay = state?.officialGameplayDataBundle;
  const geometry = state?.officialDeploymentGeometryDataBundle;
  const draft = state?.officialMissionDeploymentDraftDataBundle;
  if (!object(audit) || audit.lockHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH
    || audit.snapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || audit.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || audit.repositoryFallbackAllowed !== false || audit.trainingTruth !== false
    || gameplay?.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || gameplay?.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || gameplay?.repositoryFallbackAllowed !== false || gameplay?.trainingTruth !== false) {
    fail("DEPLOYMENT_GEOMETRY_SOURCE_LOCK_BINDING_INVALID");
  }
  verifyOfficialDeploymentGeometryDataBundleV1(geometry);
  verifyOfficialMissionDeploymentDraftDataBundleV1(draft);
  if (geometry.missionDeploymentDraftDataBundleHash !== draft.bundleHash) {
    fail("DEPLOYMENT_GEOMETRY_DRAFT_DATA_MISMATCH");
  }
  if (matchBinding) {
    const dataHash = hashStarcraftTmgContract(gameplay);
    if (matchBinding.dataSnapshotHash !== dataHash
      || matchBinding.dependencies?.dataSnapshot?.contentHash !== dataHash) {
      fail("DEPLOYMENT_GEOMETRY_DATA_ARTIFACT_BINDING_INVALID");
    }
  }
  return { geometry, draft };
}

function domainFor(state, options = {}) {
  if (!object(state) || state.rulesProcedureMode !== true || state.pendingAction
    || state.phase !== "pre_game" || object(state.officialDeploymentGeometryBinding)) {
    fail("DEPLOYMENT_GEOMETRY_PROCEDURE_WINDOW_INVALID");
  }
  const { geometry, draft } = bundles(state, options.matchBinding);
  const draftState = state.officialMissionDeploymentDraft;
  verifyOfficialMissionDeploymentDraftStateV1(draftState, draft);
  if (draftState.stage !== "complete"
    || state.officialMissionDeploymentDraftBinding?.bindingHash
      !== draftState.draftBinding?.bindingHash) {
    fail("DEPLOYMENT_GEOMETRY_DRAFT_BINDING_INVALID");
  }
  const binding = createOfficialDeploymentGeometryBindingV1({
    deploymentGeometryDataBundle: geometry,
    missionDeploymentDraftDataBundle: draft,
    missionDeploymentDraftState: draftState,
  });
  const sideKey = String(options.sideKey || state.activeSideKey || "").trim();
  if (!draftState.participantIds.includes(sideKey)) {
    fail("DEPLOYMENT_GEOMETRY_ACTOR_INVALID", sideKey);
  }
  const plan = { schema: "starcraft_tmg_official_deployment_geometry_plan_v1",
    draftBindingHash: draftState.draftBinding.bindingHash,
    deploymentRecordKey: binding.deploymentRecordKey,
    deploymentGeometryProfileHash: binding.deploymentGeometryProfileHash,
    expectedBindingHash: binding.bindingHash,
    deploymentGeometryDataBundleHash: geometry.bundleHash,
    sourceRefreshPerformed: false, trainingTruth: false };
  const action = { actionType: OFFICIAL_DEPLOYMENT_GEOMETRY_RULES_ACTION_TYPE,
    sideKey, phase: state.phase, pieceId: "", deploymentGeometryPlan: plan,
    ruleAtomIds: [...OFFICIAL_DEPLOYMENT_GEOMETRY_RULES_ACTION_ATOM_IDS],
    executorId: OFFICIAL_DEPLOYMENT_GEOMETRY_RULES_EXECUTOR_ID,
    executorVersion: OFFICIAL_DEPLOYMENT_GEOMETRY_RULES_EXECUTOR_VERSION,
    isEnabled: true, disabledReason: "", score: 1,
    details: { deploymentName: draftState.selectedDeployment.profile.name,
      engagementScale: binding.engagementScale,
      battlefield: clone(binding.battlefield),
      markerTargetCount: binding.markerTargets.length,
      setupStageAfter: "terrain_pending_ticket_11_slice_108",
      rulesTruth: "official_selected_deployment_geometry_materialization",
      trainingTruth: false } };
  return { action, binding };
}

function disabledAction(state, sideKey, error) {
  return { actionType: OFFICIAL_DEPLOYMENT_GEOMETRY_RULES_ACTION_TYPE,
    sideKey: sideKey || String(state?.activeSideKey || ""),
    phase: String(state?.phase || ""), pieceId: "",
    ruleAtomIds: [...OFFICIAL_DEPLOYMENT_GEOMETRY_RULES_ACTION_ATOM_IDS],
    executorId: OFFICIAL_DEPLOYMENT_GEOMETRY_RULES_EXECUTOR_ID,
    executorVersion: OFFICIAL_DEPLOYMENT_GEOMETRY_RULES_EXECUTOR_VERSION,
    isEnabled: false, disabledReason: String(error?.message || error).split(":")[0],
    score: 0, details: { rulesTruth: "official_deployment_geometry_fail_closed",
      trainingTruth: false } };
}

export function enumerateOfficialDeploymentGeometryRulesV1(state, options = {}) {
  try {
    return [domainFor(state, options).action];
  } catch (error) {
    return options.includeDisabled === true
      ? [disabledAction(state, String(options.sideKey || ""), error)] : [];
  }
}

export function applyOfficialDeploymentGeometryRulesV1(stateInput, actionInput,
  options = {}) {
  if (!object(actionInput)
    || actionInput.actionType !== OFFICIAL_DEPLOYMENT_GEOMETRY_RULES_ACTION_TYPE
    || actionInput.executorId !== OFFICIAL_DEPLOYMENT_GEOMETRY_RULES_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_DEPLOYMENT_GEOMETRY_RULES_EXECUTOR_VERSION
    || !isDeepStrictEqual([...(actionInput.ruleAtomIds || [])].sort(),
      [...OFFICIAL_DEPLOYMENT_GEOMETRY_RULES_ACTION_ATOM_IDS])) {
    fail("DEPLOYMENT_GEOMETRY_ACTION_INVALID");
  }
  const expected = domainFor(stateInput, { ...options, sideKey: actionInput.sideKey });
  if (!isDeepStrictEqual(contractAction(actionInput), contractAction(expected.action))) {
    fail("DEPLOYMENT_GEOMETRY_ACTION_STALE");
  }
  verifyOfficialDeploymentGeometryBindingV1(expected.binding,
    stateInput.officialDeploymentGeometryDataBundle);
  const state = clone(stateInput);
  state.officialDeploymentGeometryBinding = clone(expected.binding);
  state.officialBattlefieldSetup = { schema:
      "starcraft_tmg_official_battlefield_setup_v1",
    deploymentGeometryBindingHash: expected.binding.bindingHash,
    battlefield: clone(expected.binding.battlefield),
    coordinateSystem: clone(expected.binding.coordinateSystem),
    entryEdgesByPlayer: clone(expected.binding.entryEdgesByPlayer),
    markerTargets: clone(expected.binding.markerTargets),
    setupSequence: clone(expected.binding.setupSequence),
    stage: "terrain_pending_ticket_11_slice_108",
    rulesTruth: "official_deployment_geometry_before_terrain", trainingTruth: false };
  const resolution = { schema:
      "starcraft_tmg_official_deployment_geometry_resolution_v1",
    sideKey: actionInput.sideKey, deploymentRecordKey: expected.binding.deploymentRecordKey,
    deploymentGeometryProfileHash: expected.binding.deploymentGeometryProfileHash,
    bindingHash: expected.binding.bindingHash,
    battlefield: clone(expected.binding.battlefield),
    entryEdgePlayerCount: Object.keys(expected.binding.entryEdgesByPlayer).length,
    markerTargetCount: expected.binding.markerTargets.length,
    setupStageAfter: "terrain_pending_ticket_11_slice_108",
    clientSuppliedGeometryAccepted: false,
    sourceRefreshPerformed: false, repositoryFallbackUsed: false,
    trainingTruth: false };
  resolution.resolutionHash = hashStarcraftTmgContract(resolution);
  state.lastDeploymentGeometryResolution = resolution;
  state.deploymentGeometryHistory = Array.isArray(state.deploymentGeometryHistory)
    ? state.deploymentGeometryHistory : [];
  state.deploymentGeometryHistory.push(clone(resolution));
  const event = { type: "deployment_geometry_materialized",
    sideKey: actionInput.sideKey, bindingHash: expected.binding.bindingHash,
    deploymentRecordKey: expected.binding.deploymentRecordKey,
    setupStageAfter: resolution.setupStageAfter, trainingTruth: false };
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({ type: "deployment_geometry_resolution", round: Number(state.round),
    phase: state.phase, sideKey: actionInput.sideKey, action: clone(actionInput),
    events: [clone(event)], trainingTruth: false });
  return { ok: true,
    schemaVersion: "starcraft_tmg_official_deployment_geometry_transition_v1",
    executorId: OFFICIAL_DEPLOYMENT_GEOMETRY_RULES_EXECUTOR_ID,
    executorVersion: OFFICIAL_DEPLOYMENT_GEOMETRY_RULES_EXECUTOR_VERSION,
    state, events: [event], action: clone(actionInput), settlementRequired: false,
    rulesTruth: "official_selected_deployment_geometry_materialized",
    trainingTruth: false };
}
