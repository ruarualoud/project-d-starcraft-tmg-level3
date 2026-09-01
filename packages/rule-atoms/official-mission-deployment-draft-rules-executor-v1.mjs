import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
} from "../source-data/official-development-tranche-source-lock-v1.mjs";
import { verifyOfficialMissionDeploymentDraftDataBundleV1 } from
  "../source-data/official-mission-deployment-draft-data-bundle-v1.mjs";
import {
  applyOfficialMissionDeploymentDraftChoiceV1,
  createOfficialMissionDeploymentDraftStateV1,
  enumerateOfficialMissionDeploymentDraftChoicesV1,
  verifyOfficialMissionDeploymentDraftStateV1,
} from "./official-mission-deployment-draft-rules-kernel-v1.mjs";

export const OFFICIAL_MISSION_DEPLOYMENT_DRAFT_RULES_EXECUTOR_ID =
  "authority.mission-deployment-draft-rules-v1";
export const OFFICIAL_MISSION_DEPLOYMENT_DRAFT_RULES_EXECUTOR_VERSION = "1.0.0";
export const OFFICIAL_MISSION_DEPLOYMENT_DRAFT_RULES_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_MISSION_DEPLOYMENT_DRAFT_RULES_ACTION_TYPE =
  "resolve_mission_deployment_draft_step";
export const OFFICIAL_MISSION_DEPLOYMENT_DRAFT_RULES_PARAMETER_KIND =
  "official_mission_deployment_draft_choice_v1";

export const OFFICIAL_MISSION_DEPLOYMENT_DRAFT_RULES_NEW_ATOM_IDS = Object.freeze([
  "rule-atom:deployment-card-draft-selection",
  "rule-atom:deployment-engagement-scale-field",
  "rule-atom:mission-card-draft-selection",
  "rule-atom:mission-engagement-scale-field",
  "rule-atom:singleton:core-12-1-select-mission-and-deployment:87c1d9684864",
  "rule-atom:singleton:core-5-5-mission-additional-conditions:b0a86be3a9e6",
  "rule-atom:singleton:core-5-5-mission-game-length:f8141abaf3a2",
  "rule-atom:singleton:core-5-5-mission-parameters:2ee5963aac7b",
  "rule-atom:singleton:core-5-6-marker-setup:1d4dc3ae0932",
  "rule-atom:singleton:core-9-2-1-deployment-card-contract:2e68c702a777",
  "rule-atom:singleton:core-9-2-deployment-draft-elimination:5d5a6d1703fb",
  "rule-atom:singleton:core-9-2-deployment-process-and-tip:1e4c0a7b4d03",
  "rule-atom:singleton:core-9-2-deployment-selection:ecdfd764f005",
  "rule-atom:singleton:core-9-2-draft-card-inputs:34f252fb2453",
  "rule-atom:singleton:core-9-2-draft-colour-choice:e5e559c3dd94",
  "rule-atom:singleton:core-9-2-draft-control-choice:63d9cfd0fc9b",
  "rule-atom:singleton:core-9-2-draft-layout-and-rolloff:82e66908090b",
  "rule-atom:singleton:core-9-2-mission-draft-elimination:488eeaa7dabc",
  "rule-atom:singleton:core-9-2-mission-selection:b8a446b42652",
  "rule-atom:singleton:core-9-2-own-set-duplicate-prohibition:f31da045b2a4",
  "rule-atom:singleton:core-9-2-pregame-draft-purpose:bce4c3922d51",
].sort());
export const OFFICIAL_MISSION_DEPLOYMENT_DRAFT_RULES_ACTION_ATOM_IDS =
  OFFICIAL_MISSION_DEPLOYMENT_DRAFT_RULES_NEW_ATOM_IDS;
export const OFFICIAL_MISSION_DEPLOYMENT_DRAFT_RULES_EXECUTOR_ATOM_IDS =
  OFFICIAL_MISSION_DEPLOYMENT_DRAFT_RULES_NEW_ATOM_IDS;

function fail(code, detail = "") { throw new Error(detail ? `${code}:${detail}` : code); }
function object(value) { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function clone(value) { return structuredClone(value); }
function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}
function contractAction(value) {
  return without(value, ["isEnabled", "disabledReason", "score", "details"]);
}

function verifySourceAndData(state, matchBinding = null) {
  const audit = state?.officialDevelopmentTrancheSourceLockAudit;
  const gameplay = state?.officialGameplayDataBundle;
  const bundle = state?.officialMissionDeploymentDraftDataBundle;
  if (!object(audit) || audit.lockHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH
    || audit.snapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || audit.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || audit.repositoryFallbackAllowed !== false || audit.trainingTruth !== false
    || gameplay?.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || gameplay?.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || gameplay?.repositoryFallbackAllowed !== false || gameplay?.trainingTruth !== false) {
    fail("MISSION_DEPLOYMENT_DRAFT_SOURCE_LOCK_BINDING_INVALID");
  }
  verifyOfficialMissionDeploymentDraftDataBundleV1(bundle);
  if (matchBinding) {
    const dataHash = hashStarcraftTmgContract(gameplay);
    if (matchBinding.dataSnapshotHash !== dataHash
      || matchBinding.dependencies?.dataSnapshot?.contentHash !== dataHash) {
      fail("MISSION_DEPLOYMENT_DRAFT_DATA_ARTIFACT_BINDING_INVALID");
    }
  }
  return bundle;
}

function participantIds(state) {
  const explicit = state?.missionDeploymentDraftParticipantIds;
  const ids = Array.isArray(explicit) ? explicit.map(String)
    : Object.keys(state?.players || {});
  const normalized = ids.map((value) => value.trim()).sort();
  if (normalized.length !== 2 || new Set(normalized).size !== 2
    || normalized.some((id) => !object(state?.players?.[id]))) {
    fail("MISSION_DEPLOYMENT_DRAFT_PARTICIPANTS_INVALID");
  }
  return normalized;
}

function currentDraftState(state, bundle) {
  if (object(state.officialMissionDeploymentDraft)) {
    verifyOfficialMissionDeploymentDraftStateV1(
      state.officialMissionDeploymentDraft, bundle);
    return state.officialMissionDeploymentDraft;
  }
  const engagementScale = String(state?.armyBuildingEngagementScale?.scaleId || "");
  return createOfficialMissionDeploymentDraftStateV1({
    missionDeploymentDraftDataBundle: bundle,
    participantIds: participantIds(state), engagementScale,
  });
}

function stateProjection(state, draftState) {
  return hashStarcraftTmgContract({ round: Number(state.round), phase: state.phase,
    activeSideKey: state.activeSideKey, players: state.players,
    rulesProcedureMode: state.rulesProcedureMode === true,
    missionDeploymentDraftParticipantIds:
      state.missionDeploymentDraftParticipantIds || null,
    armyBuildingEngagementScale: state.armyBuildingEngagementScale || null,
    officialMissionDeploymentDraft: draftState,
    officialMissionDeploymentDraftBinding:
      state.officialMissionDeploymentDraftBinding || null,
    missionDeploymentDraftHistory: state.missionDeploymentDraftHistory || [],
    lastMissionDeploymentDraftResolution:
      state.lastMissionDeploymentDraftResolution || null,
    officialMissionDeploymentDraftDataBundle:
      state.officialMissionDeploymentDraftDataBundle,
    trainingTruth: false });
}

function domainFor(state, options = {}) {
  if (!object(state) || state.rulesProcedureMode !== true || state.pendingAction
    || !["army_building", "pre_game"].includes(String(state.phase || ""))) {
    fail("MISSION_DEPLOYMENT_DRAFT_PROCEDURE_WINDOW_INVALID");
  }
  const bundle = verifySourceAndData(state, options.matchBinding);
  const draftState = currentDraftState(state, bundle);
  if (draftState.stage === "complete") fail("MISSION_DEPLOYMENT_DRAFT_ALREADY_COMPLETE");
  const sideKey = String(options.sideKey || state.activeSideKey || "").trim();
  const choices = enumerateOfficialMissionDeploymentDraftChoicesV1({
    missionDeploymentDraftDataBundle: bundle, draftState, playerId: sideKey });
  if (choices.length === 0) fail("MISSION_DEPLOYMENT_DRAFT_ACTOR_INVALID", sideKey);
  const body = { parameterKind: OFFICIAL_MISSION_DEPLOYMENT_DRAFT_RULES_PARAMETER_KIND,
    actionType: OFFICIAL_MISSION_DEPLOYMENT_DRAFT_RULES_ACTION_TYPE,
    executorId: OFFICIAL_MISSION_DEPLOYMENT_DRAFT_RULES_EXECUTOR_ID,
    executorVersion: OFFICIAL_MISSION_DEPLOYMENT_DRAFT_RULES_EXECUTOR_VERSION,
    sideKey, phase: state.phase, stage: draftState.stage,
    preDraftStateHash: draftState.stateHash,
    stateProjectionHash: stateProjection(state, draftState),
    dataBundleHash: bundle.bundleHash,
    constraints: { choiceCount: choices.length,
      choices: choices.map((choice) => clone(choice)),
      rulesOwnedCompleteChoiceDomain: true,
      ownSetDuplicatesForbiddenOpposingOverlapAllowed: true,
      openingRollOffChanceOwnedByAuthority: true,
      selectedMissionAndDeploymentScaleMustMatch: true,
      deploymentGeometryExecutionDeferredToSlice107: true,
      arbitraryMissionEffectExecutionClaimed: false,
      clientSuppliedRuleResultAccepted: false },
    ruleAtomIds: [...OFFICIAL_MISSION_DEPLOYMENT_DRAFT_RULES_ACTION_ATOM_IDS],
    trainingTruth: false };
  return { ...body, domainId: `sc-domain-${hashStarcraftTmgContract(body)}` };
}

function disabledAction(state, sideKey, error) {
  return { actionType: OFFICIAL_MISSION_DEPLOYMENT_DRAFT_RULES_ACTION_TYPE,
    sideKey: sideKey || String(state?.activeSideKey || ""),
    phase: String(state?.phase || ""), pieceId: "",
    ruleAtomIds: [...OFFICIAL_MISSION_DEPLOYMENT_DRAFT_RULES_ACTION_ATOM_IDS],
    executorId: OFFICIAL_MISSION_DEPLOYMENT_DRAFT_RULES_EXECUTOR_ID,
    executorVersion: OFFICIAL_MISSION_DEPLOYMENT_DRAFT_RULES_EXECUTOR_VERSION,
    isEnabled: false, disabledReason: String(error?.message || error).split(":")[0],
    score: 0, details: { rulesTruth: "official_mission_deployment_draft_fail_closed",
      trainingTruth: false } };
}

export function enumerateOfficialMissionDeploymentDraftRulesV1(state,
  options = {}) {
  const candidates = []; const parameterDomains = [];
  try {
    const domain = domainFor(state, options);
    parameterDomains.push(domain);
    candidates.push({ actionType: OFFICIAL_MISSION_DEPLOYMENT_DRAFT_RULES_ACTION_TYPE,
      sideKey: domain.sideKey, phase: domain.phase, pieceId: "",
      ruleAtomIds: [...OFFICIAL_MISSION_DEPLOYMENT_DRAFT_RULES_ACTION_ATOM_IDS],
      executorId: OFFICIAL_MISSION_DEPLOYMENT_DRAFT_RULES_EXECUTOR_ID,
      executorVersion: OFFICIAL_MISSION_DEPLOYMENT_DRAFT_RULES_EXECUTOR_VERSION,
      isEnabled: true, disabledReason: "", score: 1,
      details: { parameterized: true, parameterKind: domain.parameterKind,
        stage: domain.stage, choiceCount: domain.constraints.choiceCount,
        trainingTruth: false } });
  } catch (error) {
    if (options.includeDisabled === true) {
      candidates.push(disabledAction(state, String(options.sideKey || ""), error));
    }
  }
  return { candidates, parameterDomains };
}

export function instantiateOfficialMissionDeploymentDraftRulesV1(state, domain,
  parameters, options = {}) {
  const expected = domainFor(state, { ...options, sideKey: domain?.sideKey });
  if (!isDeepStrictEqual(domain, expected)) {
    fail("MISSION_DEPLOYMENT_DRAFT_PARAMETER_DOMAIN_STALE");
  }
  if (!object(parameters) || Object.keys(parameters).length !== 1
    || typeof parameters.choiceId !== "string") {
    fail("MISSION_DEPLOYMENT_DRAFT_PARAMETERS_INVALID");
  }
  const choice = expected.constraints.choices.find((entry) => (
    entry.choiceId === parameters.choiceId));
  if (!choice) fail("MISSION_DEPLOYMENT_DRAFT_CHOICE_INVALID");
  const rollOff = choice.choiceKind === "resolve_opening_roll_off";
  const draftParticipantIds = rollOff
    ? currentDraftState(state, verifySourceAndData(state, options.matchBinding))
      .participantIds
    : [];
  return { action: {
    actionType: OFFICIAL_MISSION_DEPLOYMENT_DRAFT_RULES_ACTION_TYPE,
    sideKey: expected.sideKey, phase: expected.phase, pieceId: "",
    missionDeploymentDraftPlan: { schema:
        "starcraft_tmg_official_mission_deployment_draft_plan_v1",
      choiceId: choice.choiceId, choiceHash: choice.choiceHash,
      stage: expected.stage, preDraftStateHash: expected.preDraftStateHash },
    domainId: expected.domainId,
    ruleAtomIds: [...OFFICIAL_MISSION_DEPLOYMENT_DRAFT_RULES_ACTION_ATOM_IDS],
    executorId: OFFICIAL_MISSION_DEPLOYMENT_DRAFT_RULES_EXECUTOR_ID,
    executorVersion: OFFICIAL_MISSION_DEPLOYMENT_DRAFT_RULES_EXECUTOR_VERSION,
    ...(rollOff ? { chance: { kind: "fixed_roll_sequence", faces: 6, count: 4,
      layout: { initiativePlayer1: 2, initiativePlayer2: 2 },
      diceByPlayer: Object.fromEntries(draftParticipantIds.map((playerId) => (
        [playerId, 2]))),
      participantByLayoutSlot: { initiativePlayer1: draftParticipantIds[0],
        initiativePlayer2: draftParticipantIds[1] },
      revealOrder: draftParticipantIds.flatMap((playerId) => (
        [`${playerId}:die:1`, `${playerId}:die:2`])),
      tiePolicy: "repeat_new_roll_off_attempt_until_winner" } } : {}),
    isEnabled: true, disabledReason: "", score: 1,
    details: { stage: expected.stage, choiceKind: choice.choiceKind,
      rulesTruth: "official_mission_deployment_draft_choice",
      trainingTruth: false } },
  canonicalParameters: { choiceId: choice.choiceId } };
}

export function applyOfficialMissionDeploymentDraftRulesV1(stateInput,
  actionInput, options = {}) {
  if (!object(actionInput)
    || actionInput.actionType !== OFFICIAL_MISSION_DEPLOYMENT_DRAFT_RULES_ACTION_TYPE
    || actionInput.executorId !== OFFICIAL_MISSION_DEPLOYMENT_DRAFT_RULES_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_MISSION_DEPLOYMENT_DRAFT_RULES_EXECUTOR_VERSION
    || !isDeepStrictEqual([...(actionInput.ruleAtomIds || [])].sort(),
      [...OFFICIAL_MISSION_DEPLOYMENT_DRAFT_RULES_ACTION_ATOM_IDS])) {
    fail("MISSION_DEPLOYMENT_DRAFT_ACTION_INVALID");
  }
  const domain = domainFor(stateInput, { ...options, sideKey: actionInput.sideKey });
  const choiceId = actionInput.missionDeploymentDraftPlan?.choiceId;
  const expected = instantiateOfficialMissionDeploymentDraftRulesV1(stateInput,
    domain, { choiceId }, { ...options, sideKey: actionInput.sideKey });
  if (!isDeepStrictEqual(contractAction(actionInput), contractAction(expected.action))) {
    fail("MISSION_DEPLOYMENT_DRAFT_ACTION_STALE");
  }
  const bundle = verifySourceAndData(stateInput, options.matchBinding);
  const draftState = currentDraftState(stateInput, bundle);
  const applied = applyOfficialMissionDeploymentDraftChoiceV1({
    missionDeploymentDraftDataBundle: bundle, draftState,
    playerId: actionInput.sideKey, choiceId,
    chanceReveals: options.chanceReveals,
  });
  const state = clone(stateInput);
  state.officialMissionDeploymentDraft = clone(applied.draftState);
  if (applied.completed) {
    state.officialMissionDeploymentDraftBinding =
      clone(applied.draftState.draftBinding);
  }
  const resolution = { schema:
      "starcraft_tmg_official_mission_deployment_draft_resolution_v1",
    sideKey: actionInput.sideKey, stageBefore: applied.stageBefore,
    stageAfter: applied.stageAfter, choiceId: applied.choice.choiceId,
    choiceHash: applied.choice.choiceHash, choiceKind: applied.choice.choiceKind,
    resultHash: applied.resultHash,
    postDraftStateHash: applied.draftState.stateHash,
    completed: applied.completed,
    selectedMissionRecordKey: applied.draftState.selectedMission?.profile?.recordKey || null,
    selectedDeploymentRecordKey:
      applied.draftState.selectedDeployment?.profile?.recordKey || null,
    bindingHash: applied.draftState.draftBinding?.bindingHash || null,
    clientSuppliedRollsOrRuleResultAccepted: false,
    sourceRefreshPerformed: false, repositoryFallbackUsed: false,
    trainingTruth: false };
  state.lastMissionDeploymentDraftResolution = resolution;
  state.missionDeploymentDraftHistory =
    Array.isArray(state.missionDeploymentDraftHistory)
      ? state.missionDeploymentDraftHistory : [];
  state.missionDeploymentDraftHistory.push(clone(resolution));
  const event = { type: "mission_deployment_draft_step_resolved",
    sideKey: actionInput.sideKey, stageBefore: applied.stageBefore,
    stageAfter: applied.stageAfter, choiceKind: applied.choice.choiceKind,
    completed: applied.completed, bindingHash: resolution.bindingHash,
    trainingTruth: false };
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({ type: "mission_deployment_draft_resolution",
    round: Number(state.round), phase: state.phase, sideKey: actionInput.sideKey,
    action: clone(actionInput), events: [clone(event)], trainingTruth: false });
  return { ok: true,
    schemaVersion: "starcraft_tmg_official_mission_deployment_draft_transition_v1",
    executorId: OFFICIAL_MISSION_DEPLOYMENT_DRAFT_RULES_EXECUTOR_ID,
    executorVersion: OFFICIAL_MISSION_DEPLOYMENT_DRAFT_RULES_EXECUTOR_VERSION,
    state, events: [event], action: clone(actionInput), settlementRequired: false,
    rulesTruth: applied.completed
      ? "official_mission_and_deployment_draft_complete"
      : "official_mission_deployment_draft_step_resolved",
    trainingTruth: false };
}
