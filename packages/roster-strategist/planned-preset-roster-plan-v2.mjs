import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  ROSTER_PLAN_SCHEMA,
  createRosterPlanV1,
  verifyRosterPlanV1,
} from "./roster-plan-contracts-v1.mjs";

export const PLANNED_PRESET_ROSTER_PLAN_MODULE =
  "packages/roster-strategist/planned-preset-roster-plan-v2.mjs";
export const PLANNED_PRESET_ROSTER_PLAN_SCHEMA =
  "starcraft_tmg_roster_plan_v2";
export const PLANNED_PRESET_ROUND_SUPPLY_SCHEDULE_SCHEMA =
  "starcraft_tmg_planned_preset_round_supply_schedule_v1";

const HASH = /^[a-f0-9]{64}$/u;
const PLANNED_STATUSES = new Set(["active", "revised", "completed"]);
const BINDING_KEYS = [
  "baselinePlanHash", "baselinePlanId", "baselinePlanVersion",
  "rosterHash", "armyAuditResultHash", "presetSource", "candidateHash",
].sort();

function reject(code) { throw new Error(code); }
function object(value) {
  return value !== null && typeof value === "object"
    && !Array.isArray(value);
}
function frozen(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value)) frozen(child);
  return Object.freeze(value);
}
function bodyWithoutHash(plan) {
  const { planHash, ...body } = plan;
  return body;
}
function exactKeys(value, keys) {
  return object(value)
    && isDeepStrictEqual(Object.keys(value).sort(), keys);
}

function scheduleBodyWithoutHash(schedule) {
  const { scheduleHash, ...body } = schedule;
  return body;
}

// This is a pregame Supply feasibility check, not a placement/path verdict.
// The model chooses the round and gives a public reason for each Unit; the
// Rules audit and frozen mission profile supply every numeric value.
export function createPlannedPresetRoundSupplyScheduleV1(input = {}) {
  const { proposedEntries, rosterCandidate, armyAudit, missionProfile } = input;
  if (!Array.isArray(proposedEntries)
    || !Array.isArray(rosterCandidate?.units)
    || !Array.isArray(armyAudit?.units)
    || armyAudit.resultHash
      !== rosterCandidate.legalityReceipt?.auditResultHash
    || !HASH.test(String(missionProfile?.missionScoringProfileHash || ""))
    || !Number.isSafeInteger(missionProfile.gameLengthRounds)
    || missionProfile.gameLengthRounds < 2
    || !Number.isSafeInteger(missionProfile.startingSupply)
    || missionProfile.startingSupply < 0
    || !Number.isSafeInteger(missionProfile.extraSupplyPerRound)
    || missionProfile.extraSupplyPerRound < 0) {
    reject("PLANNED_PRESET_ROUND_SUPPLY_SOURCE_INVALID");
  }
  const supplyByUnit = new Map(armyAudit.units.map((unit) => [
    unit.unitInstanceId,
    Number(unit.unitCompositionResult?.startingSupply),
  ]));
  const rosterIds = rosterCandidate.units.map((unit) => unit.unitInstanceId);
  if (new Set(rosterIds).size !== rosterIds.length
    || armyAudit.units.length !== rosterIds.length
    || new Set(supplyByUnit.keys()).size !== rosterIds.length
    || rosterIds.some((id) => !Number.isSafeInteger(supplyByUnit.get(id))
      || supplyByUnit.get(id) < 0)) {
    reject("PLANNED_PRESET_ROUND_SUPPLY_UNIT_SET_INVALID");
  }
  const entries = proposedEntries.map((entry, index) => {
    const round = Number(entry?.round);
    const unitInstanceId = String(entry?.unitInstanceId || "").trim();
    const publicReasonText = String(entry?.publicReasonText || "").trim();
    if (!Number.isSafeInteger(round) || round < 1
      || round > missionProfile.gameLengthRounds
      || !supplyByUnit.has(unitInstanceId) || !publicReasonText) {
      reject("PLANNED_PRESET_ROUND_SUPPLY_ENTRY_INVALID");
    }
    return { ordinal: index + 1, round, unitInstanceId,
      startingSupply: supplyByUnit.get(unitInstanceId), publicReasonText };
  });
  if (entries.length !== rosterIds.length
    || new Set(entries.map((entry) => entry.unitInstanceId)).size
      !== rosterIds.length) {
    reject("PLANNED_PRESET_ROUND_SUPPLY_COVERAGE_INVALID");
  }
  const rounds = Array.from({ length: missionProfile.gameLengthRounds },
    (_, index) => {
      const round = index + 1;
      const capacity = round === missionProfile.gameLengthRounds
        ? null : missionProfile.startingSupply
          + missionProfile.extraSupplyPerRound * index;
      const committedSupply = entries.filter((entry) => entry.round <= round)
        .reduce((sum, entry) => sum + entry.startingSupply, 0);
      if (capacity !== null && committedSupply > capacity) {
        reject("PLANNED_PRESET_ROUND_SUPPLY_EXCEEDED");
      }
      return { round, capacity, committedSupply };
    });
  const body = {
    schema: PLANNED_PRESET_ROUND_SUPPLY_SCHEDULE_SCHEMA,
    candidateHash: rosterCandidate.candidateHash,
    armyAuditResultHash: armyAudit.resultHash,
    missionScoringProfileHash: missionProfile.missionScoringProfileHash,
    gameLengthRounds: missionProfile.gameLengthRounds,
    startingSupply: missionProfile.startingSupply,
    extraSupplyPerRound: missionProfile.extraSupplyPerRound,
    entries, rounds, placementAndPathVerified: false,
    trainingTruth: false,
  };
  return frozen({ ...body, scheduleHash: hashStarcraftTmgContract(body) });
}

export function verifyPlannedPresetRoundSupplyScheduleV1(schedule,
  rosterCandidate, armyAudit = null, missionProfile = null) {
  if (!object(schedule)
    || schedule.schema !== PLANNED_PRESET_ROUND_SUPPLY_SCHEDULE_SCHEMA
    || hashStarcraftTmgContract(scheduleBodyWithoutHash(schedule))
      !== schedule.scheduleHash
    || schedule.candidateHash !== rosterCandidate?.candidateHash
    || schedule.armyAuditResultHash
      !== rosterCandidate?.legalityReceipt?.auditResultHash
    || schedule.trainingTruth !== false
    || schedule.placementAndPathVerified !== false
    || !Array.isArray(schedule.entries)
    || schedule.entries.some((entry, index) =>
      entry.ordinal !== index + 1
      || !Number.isSafeInteger(entry.startingSupply)
      || entry.startingSupply < 0)
    || (armyAudit && (armyAudit.resultHash
      !== schedule.armyAuditResultHash
      || schedule.entries.some((entry) =>
        Number(armyAudit.units.find((unit) =>
          unit.unitInstanceId === entry.unitInstanceId)
          ?.unitCompositionResult?.startingSupply) !== entry.startingSupply)))
    || (missionProfile && missionProfile.missionScoringProfileHash
      !== schedule.missionScoringProfileHash)) {
    reject("PLANNED_PRESET_ROUND_SUPPLY_SCHEDULE_INVALID");
  }
  const replayed = createPlannedPresetRoundSupplyScheduleV1({
    proposedEntries: schedule.entries.map((entry) => ({
      round: entry.round, unitInstanceId: entry.unitInstanceId,
      publicReasonText: entry.publicReasonText })),
    rosterCandidate,
    armyAudit: armyAudit || { resultHash: schedule.armyAuditResultHash,
      units: schedule.entries.map((entry) => ({
        unitInstanceId: entry.unitInstanceId,
        unitCompositionResult: { startingSupply: entry.startingSupply } })) },
    missionProfile: missionProfile || {
      missionScoringProfileHash: schedule.missionScoringProfileHash,
      gameLengthRounds: schedule.gameLengthRounds,
      startingSupply: schedule.startingSupply,
      extraSupplyPerRound: schedule.extraSupplyPerRound,
    },
  });
  if (!isDeepStrictEqual(replayed, schedule)) {
    reject("PLANNED_PRESET_ROUND_SUPPLY_SCHEDULE_DRIFT");
  }
  return true;
}

// The v1 no-plan artifact is immutable. This module adds a new planned-preset
// variant; it does not weaken v1's prohibition on fabricated preset intent.
export function createPlannedPresetRosterPlanV2(input = {}) {
  const baseline = input.baselinePlan;
  verifyRosterPlanV1(baseline);
  if (baseline.planStatus !== "no_pregame_plan"
    || baseline.presetRoster !== true
    || !HASH.test(String(baseline.presetBinding?.armyAuditResultHash || ""))
    || input.planId !== baseline.planId
    || input.sideKey !== baseline.sideKey
    || !Number.isSafeInteger(input.planVersion)
    || input.planVersion <= baseline.planVersion
    || !PLANNED_STATUSES.has(input.planStatus)) {
    reject("PLANNED_PRESET_BASELINE_INVALID");
  }
  const candidate = input.rosterCandidate;
  if (candidate?.legalityStatus !== "legal"
    || candidate.sideKey !== baseline.sideKey
    || candidate.legalityReceipt?.auditResultHash
      !== baseline.presetBinding.armyAuditResultHash) {
    reject("PLANNED_PRESET_CANDIDATE_BINDING_INVALID");
  }
  const { openingDeploymentSchedule, baselinePlan, ...semanticInput } = input;
  if (openingDeploymentSchedule) {
    verifyPlannedPresetRoundSupplyScheduleV1(openingDeploymentSchedule,
      candidate);
  }
  const v1SemanticPlan = createRosterPlanV1({
    ...semanticInput,
    presetRoster: false,
    presetBinding: null,
  });
  const presetBinding = {
    baselinePlanHash: baseline.planHash,
    baselinePlanId: baseline.planId,
    baselinePlanVersion: baseline.planVersion,
    rosterHash: baseline.presetBinding.rosterHash,
    armyAuditResultHash: baseline.presetBinding.armyAuditResultHash,
    presetSource: baseline.presetBinding.presetSource,
    candidateHash: v1SemanticPlan.rosterCandidate.candidateHash,
  };
  const body = {
    ...bodyWithoutHash(v1SemanticPlan),
    schema: PLANNED_PRESET_ROSTER_PLAN_SCHEMA,
    presetRoster: true,
    presetBinding,
    ...(openingDeploymentSchedule ? { openingDeploymentSchedule } : {}),
  };
  const plan = { ...body, planHash: hashStarcraftTmgContract(body) };
  verifyPlannedPresetRosterPlanV2(plan);
  return frozen(plan);
}

export function verifyPlannedPresetRosterPlanV2(plan) {
  if (!object(plan)
    || plan.schema !== PLANNED_PRESET_ROSTER_PLAN_SCHEMA
    || !HASH.test(String(plan.planHash || ""))
    || hashStarcraftTmgContract(bodyWithoutHash(plan)) !== plan.planHash
    || plan.presetRoster !== true
    || !PLANNED_STATUSES.has(plan.planStatus)
    || !exactKeys(plan.presetBinding, BINDING_KEYS)) {
    reject("PLANNED_PRESET_PLAN_INVALID");
  }
  const binding = plan.presetBinding;
  if (![binding.baselinePlanHash, binding.rosterHash,
    binding.armyAuditResultHash, binding.candidateHash]
    .every((value) => HASH.test(String(value || "")))
    || binding.baselinePlanId !== plan.planId
    || !Number.isSafeInteger(binding.baselinePlanVersion)
    || binding.baselinePlanVersion < 1
    || plan.planVersion <= binding.baselinePlanVersion
    || !String(binding.presetSource || "").trim()
    || plan.rosterCandidate?.legalityStatus !== "legal"
    || plan.rosterCandidate.sideKey !== plan.sideKey
    || plan.rosterCandidate.candidateHash !== binding.candidateHash
    || plan.rosterCandidate.legalityReceipt?.auditResultHash
      !== binding.armyAuditResultHash) {
    reject("PLANNED_PRESET_BINDING_INVALID");
  }
  if (plan.openingDeploymentSchedule) {
    verifyPlannedPresetRoundSupplyScheduleV1(
      plan.openingDeploymentSchedule, plan.rosterCandidate);
  }
  // Reuse the frozen v1 semantic verifier without making this final artifact
  // claim to be an Agent-built list. Only the v2 preset identity differs.
  const { openingDeploymentSchedule, ...bodyWithoutSchedule } =
    bodyWithoutHash(plan);
  const semanticBody = {
    ...bodyWithoutSchedule,
    schema: ROSTER_PLAN_SCHEMA,
    presetRoster: false,
    presetBinding: null,
  };
  const semanticPlan = {
    ...semanticBody,
    planHash: hashStarcraftTmgContract(semanticBody),
  };
  verifyRosterPlanV1(semanticPlan);
  return true;
}

export function serializePlannedPresetRosterPlanV2(plan) {
  verifyPlannedPresetRosterPlanV2(plan);
  return JSON.stringify(plan);
}

export function parsePlannedPresetRosterPlanV2(serialized) {
  let plan;
  try { plan = JSON.parse(String(serialized)); }
  catch { reject("PLANNED_PRESET_SERIALIZATION_INVALID"); }
  verifyPlannedPresetRosterPlanV2(plan);
  return frozen(plan);
}

export function verifyPlannedPresetRosterPlanRoundTripV2(plan) {
  const restored = parsePlannedPresetRosterPlanV2(
    serializePlannedPresetRosterPlanV2(plan));
  if (!isDeepStrictEqual(restored, plan)) {
    reject("PLANNED_PRESET_ROUND_TRIP_DRIFT");
  }
  return true;
}
