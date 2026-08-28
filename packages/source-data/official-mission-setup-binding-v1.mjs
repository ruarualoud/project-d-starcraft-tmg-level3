import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";
import { verifyOfficialGameplayDataBundleV1 } from "./official-gameplay-data-bundle-v1.mjs";

export const OFFICIAL_MISSION_SETUP_BINDING_SCHEMA =
  "starcraft_tmg_official_mission_setup_binding_v1";

const HASH_PATTERN = /^[a-f0-9]{64}$/u;

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

function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}

function exactHash(value, code) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!HASH_PATTERN.test(normalized)) fail(code);
  return normalized;
}

function body(binding) {
  return without(binding, ["missionSetupBindingHash"]);
}

function markerAffinityByNumber(seatColorAssignment) {
  const redSideKey = Object.entries(seatColorAssignment)
    .find(([, color]) => color === "red")?.[0];
  const blueSideKey = Object.entries(seatColorAssignment)
    .find(([, color]) => color === "blue")?.[0];
  if (!redSideKey || !blueSideKey || redSideKey === blueSideKey) {
    fail("official_mission_setup_color_assignment_invalid");
  }
  return {
    1: redSideKey,
    2: blueSideKey,
    3: redSideKey,
    4: blueSideKey,
    5: null,
  };
}

export function createOfficialMissionSetupBindingV1(input = {}) {
  const gameplayDataBundle = input.gameplayDataBundle;
  verifyOfficialGameplayDataBundleV1(gameplayDataBundle);
  const seatColorAssignment = {
    player1: String(input.seatColorAssignment?.player1 || "").trim().toLowerCase(),
    player2: String(input.seatColorAssignment?.player2 || "").trim().toLowerCase(),
  };
  if (new Set(Object.values(seatColorAssignment)).size !== 2
    || !Object.values(seatColorAssignment).every((color) => ["red", "blue"].includes(color))) {
    fail("official_mission_setup_color_assignment_invalid");
  }
  const affinity = markerAffinityByNumber(seatColorAssignment);
  const bindingBody = {
    schema: OFFICIAL_MISSION_SETUP_BINDING_SCHEMA,
    sourceSnapshotHash: gameplayDataBundle.sourceSnapshotHash,
    normalizedDatasetHash: gameplayDataBundle.normalizedDatasetHash,
    gameplayDataBundleHash: gameplayDataBundle.gameplayDataBundleHash,
    missionRecordKey: gameplayDataBundle.missionScoringProfile.recordKey,
    missionScoringProfileHash:
      gameplayDataBundle.missionScoringProfile.missionScoringProfileHash,
    missionDraftReceiptHash: exactHash(
      input.missionDraftReceiptHash,
      "official_mission_draft_receipt_hash_required",
    ),
    deploymentDraftReceiptHash: exactHash(
      input.deploymentDraftReceiptHash,
      "official_deployment_draft_receipt_hash_required",
    ),
    seatColorAssignment,
    markerAffinityByNumber: affinity,
    affinityAssignedAfterBothDrafts: true,
    affinityGrantsControl: false,
    repositoryFallbackAllowed: false,
    rulesTruth: "official_draft_bound_marker_affinity",
    trainingTruth: false,
  };
  return deepFreeze({
    ...bindingBody,
    missionSetupBindingHash: hashStarcraftTmgContract(bindingBody),
  });
}

export function verifyOfficialMissionSetupBindingV1(binding, gameplayDataBundle) {
  verifyOfficialGameplayDataBundleV1(gameplayDataBundle);
  if (!object(binding)
    || binding.schema !== OFFICIAL_MISSION_SETUP_BINDING_SCHEMA
    || hashStarcraftTmgContract(body(binding)) !== binding.missionSetupBindingHash
    || binding.sourceSnapshotHash !== gameplayDataBundle.sourceSnapshotHash
    || binding.normalizedDatasetHash !== gameplayDataBundle.normalizedDatasetHash
    || binding.gameplayDataBundleHash !== gameplayDataBundle.gameplayDataBundleHash
    || binding.missionRecordKey !== gameplayDataBundle.missionScoringProfile.recordKey
    || binding.missionScoringProfileHash
      !== gameplayDataBundle.missionScoringProfile.missionScoringProfileHash
    || !HASH_PATTERN.test(String(binding.missionDraftReceiptHash || ""))
    || !HASH_PATTERN.test(String(binding.deploymentDraftReceiptHash || ""))
    || binding.affinityAssignedAfterBothDrafts !== true
    || binding.affinityGrantsControl !== false
    || binding.repositoryFallbackAllowed !== false
    || binding.trainingTruth !== false) {
    fail("official_mission_setup_binding_invalid");
  }
  const expectedAffinity = markerAffinityByNumber(binding.seatColorAssignment);
  if (hashStarcraftTmgContract(expectedAffinity)
      !== hashStarcraftTmgContract(binding.markerAffinityByNumber)) {
    fail("official_mission_setup_affinity_map_invalid");
  }
  return true;
}

export function officialMarkerAffinitySideKeyV1(binding, markerNumber) {
  const number = Number(markerNumber);
  if (!Number.isInteger(number) || number < 1 || number > 5) {
    fail("official_mission_marker_number_invalid", String(markerNumber));
  }
  return binding.markerAffinityByNumber[number];
}
