import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  getOfficialDeploymentDraftProfileV1,
  getOfficialMissionDraftProfileV1,
  verifyOfficialMissionDeploymentDraftDataBundleV1,
} from "../source-data/official-mission-deployment-draft-data-bundle-v1.mjs";

export const OFFICIAL_MISSION_DEPLOYMENT_DRAFT_STATE_SCHEMA =
  "starcraft_tmg_official_mission_deployment_draft_state_v1";
export const OFFICIAL_MISSION_DEPLOYMENT_DRAFT_CHOICE_SCHEMA =
  "starcraft_tmg_official_mission_deployment_draft_choice_v1";
export const OFFICIAL_MISSION_DEPLOYMENT_DRAFT_BINDING_SCHEMA =
  "starcraft_tmg_official_mission_deployment_draft_binding_v1";

const STAGES = new Set(["submit_draft_sets", "opening_roll_off", "choose_colour",
  "choose_draft_control", "mission_elimination", "mission_selection",
  "deployment_elimination", "deployment_selection", "complete"]);

function fail(code, detail = "") { throw new Error(detail ? `${code}:${detail}` : code); }
function object(value) { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function clone(value) { return structuredClone(value); }
function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}
function stateHash(value) { return hashStarcraftTmgContract(without(value, ["stateHash"])); }
function choiceHash(value) {
  return hashStarcraftTmgContract(without(value, ["choiceHash", "choiceId"]));
}
function distinctStrings(values, code, count = null) {
  if (!Array.isArray(values) || (count !== null && values.length !== count)) fail(code);
  const normalized = values.map((value) => String(value || "").trim());
  if (normalized.some((value) => !value) || new Set(normalized).size !== normalized.length) {
    fail(code);
  }
  return normalized;
}
function combinations(values, count) {
  if (count === 0) return [[]];
  const output = [];
  for (let index = 0; index <= values.length - count; index += 1) {
    for (const tail of combinations(values.slice(index + 1), count - 1)) {
      output.push([values[index], ...tail]);
    }
  }
  return output;
}
function otherParticipant(state, playerId) {
  const other = state.participantIds.find((entry) => entry !== playerId);
  if (!other) fail("MISSION_DEPLOYMENT_DRAFT_OPPONENT_INVALID");
  return other;
}
function occurrence(playerId, cardKind, ordinal, recordKey) {
  const body = { occurrenceId: `${playerId}:${cardKind}:${ordinal}:${recordKey}`,
    playerId, cardKind, ordinal, recordKey };
  return { ...body, occurrenceHash: hashStarcraftTmgContract(body) };
}
function faceUpRows(submissionsByPlayer, participantIds) {
  return {
    mission: participantIds.flatMap((playerId) => submissionsByPlayer[playerId]
      .missionRecordKeys.map((recordKey, index) => (
        occurrence(playerId, "mission", index + 1, recordKey)))),
    deployment: participantIds.flatMap((playerId) => submissionsByPlayer[playerId]
      .deploymentRecordKeys.map((recordKey, index) => (
        occurrence(playerId, "deployment", index + 1, recordKey)))),
  };
}
function draftTrack(occurrences) {
  return { allOccurrenceIds: occurrences.map((entry) => entry.occurrenceId),
    eliminatedOccurrenceIds: [], remainingOccurrenceIds:
      occurrences.map((entry) => entry.occurrenceId),
    selectedOccurrenceId: null, discardedOccurrenceIds: [] };
}
function seal(state) { return { ...state, stateHash: stateHash(state) }; }

export function createOfficialMissionDeploymentDraftStateV1(input = {}) {
  const bundle = input.missionDeploymentDraftDataBundle;
  verifyOfficialMissionDeploymentDraftDataBundleV1(bundle);
  const participantIds = distinctStrings(input.participantIds,
    "MISSION_DEPLOYMENT_DRAFT_PARTICIPANTS_INVALID", 2).sort();
  const engagementScale = String(input.engagementScale || "").trim();
  if (!bundle.supportedDraftEngagementScales.includes(engagementScale)) {
    fail("MISSION_DEPLOYMENT_DRAFT_SCALE_UNSUPPORTED", engagementScale);
  }
  return seal({ schema: OFFICIAL_MISSION_DEPLOYMENT_DRAFT_STATE_SCHEMA,
    participantIds, engagementScale, stage: "submit_draft_sets",
    submissionsByPlayer: {}, faceUpRows: { mission: [], deployment: [] },
    rollOffAttempt: 0, rollOffHistory: [], rollOffWinnerPlayerId: null,
    colourByPlayer: {}, controllerByDraft: {},
    missionDraft: null, deploymentDraft: null,
    selectedMission: null, selectedDeployment: null, draftBinding: null,
    ruleAtomDenominatorComplete: true,
    dataBundleHash: bundle.bundleHash,
    sourceRefreshPerformed: false, repositoryFallbackUsed: false,
    rulesTruth: "official_mission_deployment_draft_in_progress",
    trainingTruth: false });
}

export function verifyOfficialMissionDeploymentDraftStateV1(state, bundle) {
  verifyOfficialMissionDeploymentDraftDataBundleV1(bundle);
  if (!object(state) || state.schema !== OFFICIAL_MISSION_DEPLOYMENT_DRAFT_STATE_SCHEMA
    || state.stateHash !== stateHash(state) || state.dataBundleHash !== bundle.bundleHash
    || !STAGES.has(state.stage) || !Array.isArray(state.participantIds)
    || state.participantIds.length !== 2
    || new Set(state.participantIds).size !== 2
    || !bundle.supportedDraftEngagementScales.includes(state.engagementScale)
    || !object(state.submissionsByPlayer) || !object(state.faceUpRows)
    || !Array.isArray(state.faceUpRows.mission)
    || !Array.isArray(state.faceUpRows.deployment)
    || !Array.isArray(state.rollOffHistory)
    || !Number.isSafeInteger(state.rollOffAttempt) || state.rollOffAttempt < 0
    || state.sourceRefreshPerformed !== false || state.repositoryFallbackUsed !== false
    || state.trainingTruth !== false) {
    fail("MISSION_DEPLOYMENT_DRAFT_STATE_INVALID");
  }
  const submittedIds = Object.keys(state.submissionsByPlayer).sort();
  if (submittedIds.some((playerId) => !state.participantIds.includes(playerId))) {
    fail("MISSION_DEPLOYMENT_DRAFT_SUBMISSION_PLAYER_INVALID");
  }
  for (const playerId of submittedIds) {
    const submission = state.submissionsByPlayer[playerId];
    const missions = distinctStrings(submission?.missionRecordKeys,
      "MISSION_DRAFT_INPUT_SET_INVALID", 2);
    const deployments = distinctStrings(submission?.deploymentRecordKeys,
      "DEPLOYMENT_DRAFT_INPUT_SET_INVALID", 2);
    for (const recordKey of missions) {
      if (getOfficialMissionDraftProfileV1(bundle, recordKey).engagementScale
        !== state.engagementScale) fail("MISSION_DRAFT_SCALE_MISMATCH", recordKey);
    }
    for (const recordKey of deployments) {
      if (getOfficialDeploymentDraftProfileV1(bundle, recordKey).engagementScale
        !== state.engagementScale) fail("DEPLOYMENT_DRAFT_SCALE_MISMATCH", recordKey);
    }
  }
  if (state.stage !== "submit_draft_sets") {
    if (submittedIds.length !== 2 || state.faceUpRows.mission.length !== 4
      || state.faceUpRows.deployment.length !== 4
      || !object(state.missionDraft) || !object(state.deploymentDraft)) {
      fail("MISSION_DEPLOYMENT_DRAFT_FACE_UP_ROWS_INVALID");
    }
    const expectedRows = faceUpRows(state.submissionsByPlayer, state.participantIds);
    if (!isDeepStrictEqual(state.faceUpRows, expectedRows)) {
      fail("MISSION_DEPLOYMENT_DRAFT_FACE_UP_ROWS_INVALID");
    }
  }
  if (state.stage === "complete") {
    if (!object(state.selectedMission) || !object(state.selectedDeployment)
      || !object(state.draftBinding)
      || state.draftBinding.schema !== OFFICIAL_MISSION_DEPLOYMENT_DRAFT_BINDING_SCHEMA
      || state.draftBinding.bindingHash
        !== hashStarcraftTmgContract(without(state.draftBinding, ["bindingHash"]))
      || state.draftBinding.geometryExecutionReady !== false
      || state.draftBinding.trainingTruth !== false) {
      fail("MISSION_DEPLOYMENT_DRAFT_BINDING_INVALID");
    }
  }
  return true;
}

function makeChoice(state, playerId, choiceKind, value) {
  const body = { schema: OFFICIAL_MISSION_DEPLOYMENT_DRAFT_CHOICE_SCHEMA,
    stage: state.stage, playerId, choiceKind, value: clone(value),
    preStateHash: state.stateHash, dataBundleHash: state.dataBundleHash,
    trainingTruth: false };
  const choice = { ...body, choiceHash: hashStarcraftTmgContract(body) };
  return { ...choice, choiceId: `mission-deployment-draft-${choice.choiceHash}` };
}

function profilesForScale(bundle, kind, scale) {
  const profiles = kind === "mission" ? bundle.missionProfiles : bundle.deploymentProfiles;
  return profiles.filter((entry) => entry.engagementScale === scale)
    .sort((left, right) => left.recordKey.localeCompare(right.recordKey));
}

export function officialMissionDeploymentDraftActorV1(state, requestedPlayerId = "") {
  const requested = String(requestedPlayerId || "").trim();
  if (state.stage === "submit_draft_sets") {
    return state.participantIds.includes(requested)
      && !object(state.submissionsByPlayer[requested]) ? requested : null;
  }
  let required = null;
  if (state.stage === "opening_roll_off") required = state.participantIds[0];
  if (["choose_colour", "choose_draft_control"].includes(state.stage)) {
    required = state.rollOffWinnerPlayerId;
  }
  if (state.stage === "mission_elimination") {
    required = otherParticipant(state, state.controllerByDraft.mission);
  }
  if (state.stage === "mission_selection") required = state.controllerByDraft.mission;
  if (state.stage === "deployment_elimination") {
    required = otherParticipant(state, state.controllerByDraft.deployment);
  }
  if (state.stage === "deployment_selection") required = state.controllerByDraft.deployment;
  return requested && requested === required ? required : null;
}

export function enumerateOfficialMissionDeploymentDraftChoicesV1(input = {}) {
  const bundle = input.missionDeploymentDraftDataBundle;
  const state = input.draftState;
  verifyOfficialMissionDeploymentDraftStateV1(state, bundle);
  const playerId = officialMissionDeploymentDraftActorV1(state, input.playerId);
  if (!playerId) return [];
  if (state.stage === "submit_draft_sets") {
    const missions = profilesForScale(bundle, "mission", state.engagementScale)
      .map((entry) => entry.recordKey);
    const deployments = profilesForScale(bundle, "deployment", state.engagementScale)
      .map((entry) => entry.recordKey);
    return combinations(missions, 2).flatMap((missionRecordKeys) => (
      combinations(deployments, 2).map((deploymentRecordKeys) => makeChoice(state,
        playerId, "submit_draft_set", { missionRecordKeys, deploymentRecordKeys }))));
  }
  if (state.stage === "opening_roll_off") {
    return [makeChoice(state, playerId, "resolve_opening_roll_off", {
      attempt: state.rollOffAttempt + 1, faces: 6, dicePerPlayer: 2,
      tiePolicy: "repeat_new_roll_off_attempt_until_winner" })];
  }
  if (state.stage === "choose_colour") {
    return ["red", "blue"].map((colour) => makeChoice(state, playerId,
      "choose_player_colour", { colour }));
  }
  if (state.stage === "choose_draft_control") {
    return ["mission", "deployment"].map((controlledDraft) => makeChoice(state,
      playerId, "choose_draft_control", { controlledDraft }));
  }
  if (state.stage.endsWith("_elimination")) {
    const kind = state.stage.startsWith("mission") ? "mission" : "deployment";
    return combinations(state[`${kind}Draft`].remainingOccurrenceIds, 2)
      .map((occurrenceIds) => makeChoice(state, playerId,
        `eliminate_${kind}_cards`, { occurrenceIds }));
  }
  if (state.stage.endsWith("_selection")) {
    const kind = state.stage.startsWith("mission") ? "mission" : "deployment";
    return state[`${kind}Draft`].remainingOccurrenceIds.map((occurrenceId) => (
      makeChoice(state, playerId, `select_${kind}_card`, { occurrenceId })));
  }
  return [];
}

function validateChanceReveals(chanceReveals) {
  if (!Array.isArray(chanceReveals) || chanceReveals.length !== 4) {
    fail("MISSION_DEPLOYMENT_DRAFT_ROLL_OFF_REVEALS_REQUIRED");
  }
  return chanceReveals.map((reveal, counter) => {
    const outcome = Number(reveal?.outcome);
    if (reveal?.counter !== counter || reveal?.faces !== 6
      || !Number.isSafeInteger(outcome) || outcome < 1 || outcome > 6) {
      fail("MISSION_DEPLOYMENT_DRAFT_ROLL_OFF_REVEAL_INVALID", String(counter));
    }
    return outcome;
  });
}

function selectedOccurrence(state, kind, occurrenceId) {
  const found = state.faceUpRows[kind].find((entry) => entry.occurrenceId === occurrenceId);
  if (!found) fail("MISSION_DEPLOYMENT_DRAFT_OCCURRENCE_UNKNOWN", occurrenceId);
  return found;
}

function finalizeDraft(state, bundle) {
  const missionOccurrence = selectedOccurrence(state, "mission",
    state.missionDraft.selectedOccurrenceId);
  const deploymentOccurrence = selectedOccurrence(state, "deployment",
    state.deploymentDraft.selectedOccurrenceId);
  const mission = clone(getOfficialMissionDraftProfileV1(bundle,
    missionOccurrence.recordKey));
  const deployment = clone(getOfficialDeploymentDraftProfileV1(bundle,
    deploymentOccurrence.recordKey));
  if (mission.engagementScale !== state.engagementScale
    || deployment.engagementScale !== state.engagementScale) {
    fail("MISSION_DEPLOYMENT_DRAFT_SELECTED_SCALE_MISMATCH");
  }
  state.selectedMission = { occurrence: clone(missionOccurrence), profile: mission };
  state.selectedDeployment = { occurrence: clone(deploymentOccurrence),
    profile: deployment };
  const redPlayerId = state.participantIds.find((playerId) => (
    state.colourByPlayer[playerId] === "red"));
  const bluePlayerId = state.participantIds.find((playerId) => (
    state.colourByPlayer[playerId] === "blue"));
  const missionDraftReceiptHash = hashStarcraftTmgContract({
    controllerPlayerId: state.controllerByDraft.mission,
    eliminatedOccurrenceIds: state.missionDraft.eliminatedOccurrenceIds,
    selectedOccurrenceId: state.missionDraft.selectedOccurrenceId,
    discardedOccurrenceIds: state.missionDraft.discardedOccurrenceIds });
  const deploymentDraftReceiptHash = hashStarcraftTmgContract({
    controllerPlayerId: state.controllerByDraft.deployment,
    eliminatedOccurrenceIds: state.deploymentDraft.eliminatedOccurrenceIds,
    selectedOccurrenceId: state.deploymentDraft.selectedOccurrenceId,
    discardedOccurrenceIds: state.deploymentDraft.discardedOccurrenceIds });
  const body = { schema: OFFICIAL_MISSION_DEPLOYMENT_DRAFT_BINDING_SCHEMA,
    engagementScale: state.engagementScale, participantIds: clone(state.participantIds),
    rollOffWinnerPlayerId: state.rollOffWinnerPlayerId,
    colourByPlayer: clone(state.colourByPlayer),
    controllerByDraft: clone(state.controllerByDraft),
    missionRecordKey: mission.recordKey, missionProfileHash: mission.profileHash,
    deploymentRecordKey: deployment.recordKey,
    deploymentProfileHash: deployment.profileHash,
    missionDraftReceiptHash, deploymentDraftReceiptHash,
    markerAffinityByNumber: { 1: redPlayerId, 2: bluePlayerId,
      3: redPlayerId, 4: bluePlayerId, 5: null },
    affinityAssignedAfterBothDrafts: true, affinityGrantsControl: false,
    faceUpDraftLayoutComplete: true, opposingDuplicateCardsAllowed: true,
    ownSetDuplicatesAllowed: false,
    selectedMissionFieldContractBound: true,
    selectedDeploymentFieldContractBound: true,
    geometryExecutionReady: false,
    geometryExecutionOwner: "ticket_11_slice_107",
    arbitraryMissionEffectExecutionClaimed: false,
    dataBundleHash: bundle.bundleHash, sourceRefreshPerformed: false,
    repositoryFallbackUsed: false, productionRoomBindingEligible: false,
    rulesTruth: "official_mission_and_deployment_draft_complete",
    trainingTruth: false };
  state.draftBinding = { ...body, bindingHash: hashStarcraftTmgContract(body) };
  state.stage = "complete";
  state.rulesTruth = "official_mission_and_deployment_draft_complete";
}

export function applyOfficialMissionDeploymentDraftChoiceV1(input = {}) {
  const bundle = input.missionDeploymentDraftDataBundle;
  const current = input.draftState;
  verifyOfficialMissionDeploymentDraftStateV1(current, bundle);
  const choices = enumerateOfficialMissionDeploymentDraftChoicesV1({
    missionDeploymentDraftDataBundle: bundle, draftState: current,
    playerId: input.playerId });
  const selected = choices.find((entry) => entry.choiceId === input.choiceId);
  if (!selected || selected.choiceHash !== choiceHash(selected)) {
    fail("MISSION_DEPLOYMENT_DRAFT_CHOICE_INVALID");
  }
  const state = clone(current); const playerId = selected.playerId;
  if (selected.choiceKind === "submit_draft_set") {
    state.submissionsByPlayer[playerId] = clone(selected.value);
    if (Object.keys(state.submissionsByPlayer).length === 2) {
      state.faceUpRows = faceUpRows(state.submissionsByPlayer, state.participantIds);
      state.missionDraft = draftTrack(state.faceUpRows.mission);
      state.deploymentDraft = draftTrack(state.faceUpRows.deployment);
      state.stage = "opening_roll_off";
    }
  } else if (selected.choiceKind === "resolve_opening_roll_off") {
    const rolls = validateChanceReveals(input.chanceReveals);
    const totals = { [state.participantIds[0]]: rolls[0] + rolls[1],
      [state.participantIds[1]]: rolls[2] + rolls[3] };
    const tied = totals[state.participantIds[0]] === totals[state.participantIds[1]];
    state.rollOffAttempt += 1;
    state.rollOffHistory.push({ attempt: state.rollOffAttempt,
      rollsByPlayer: { [state.participantIds[0]]: rolls.slice(0, 2),
        [state.participantIds[1]]: rolls.slice(2, 4) }, totals,
      result: tied ? "tie" : "winner",
      winnerPlayerId: tied ? null : totals[state.participantIds[0]]
        > totals[state.participantIds[1]] ? state.participantIds[0]
          : state.participantIds[1], trainingTruth: false });
    if (!tied) {
      state.rollOffWinnerPlayerId = state.rollOffHistory.at(-1).winnerPlayerId;
      state.stage = "choose_colour";
    }
  } else if (selected.choiceKind === "choose_player_colour") {
    state.colourByPlayer[playerId] = selected.value.colour;
    state.colourByPlayer[otherParticipant(state, playerId)] =
      selected.value.colour === "red" ? "blue" : "red";
    state.stage = "choose_draft_control";
  } else if (selected.choiceKind === "choose_draft_control") {
    const own = selected.value.controlledDraft;
    const other = own === "mission" ? "deployment" : "mission";
    state.controllerByDraft[own] = playerId;
    state.controllerByDraft[other] = otherParticipant(state, playerId);
    state.stage = "mission_elimination";
  } else if (selected.choiceKind === "eliminate_mission_cards") {
    state.missionDraft.eliminatedOccurrenceIds = clone(selected.value.occurrenceIds);
    state.missionDraft.remainingOccurrenceIds = state.missionDraft.allOccurrenceIds
      .filter((id) => !selected.value.occurrenceIds.includes(id));
    state.stage = "mission_selection";
  } else if (selected.choiceKind === "select_mission_card") {
    state.missionDraft.selectedOccurrenceId = selected.value.occurrenceId;
    state.missionDraft.discardedOccurrenceIds = state.missionDraft.remainingOccurrenceIds
      .filter((id) => id !== selected.value.occurrenceId);
    state.stage = "deployment_elimination";
  } else if (selected.choiceKind === "eliminate_deployment_cards") {
    state.deploymentDraft.eliminatedOccurrenceIds = clone(selected.value.occurrenceIds);
    state.deploymentDraft.remainingOccurrenceIds = state.deploymentDraft.allOccurrenceIds
      .filter((id) => !selected.value.occurrenceIds.includes(id));
    state.stage = "deployment_selection";
  } else if (selected.choiceKind === "select_deployment_card") {
    state.deploymentDraft.selectedOccurrenceId = selected.value.occurrenceId;
    state.deploymentDraft.discardedOccurrenceIds =
      state.deploymentDraft.remainingOccurrenceIds
        .filter((id) => id !== selected.value.occurrenceId);
    finalizeDraft(state, bundle);
  } else {
    fail("MISSION_DEPLOYMENT_DRAFT_CHOICE_KIND_INVALID");
  }
  const sealed = seal(state);
  verifyOfficialMissionDeploymentDraftStateV1(sealed, bundle);
  return { draftState: sealed, choice: clone(selected),
    stageBefore: current.stage, stageAfter: sealed.stage,
    completed: sealed.stage === "complete", trainingTruth: false,
    resultHash: hashStarcraftTmgContract({ choiceHash: selected.choiceHash,
      preStateHash: current.stateHash, postStateHash: sealed.stateHash }) };
}
