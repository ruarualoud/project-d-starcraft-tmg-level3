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
  const v1SemanticPlan = createRosterPlanV1({
    ...input,
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
  // Reuse the frozen v1 semantic verifier without making this final artifact
  // claim to be an Agent-built list. Only the v2 preset identity differs.
  const semanticBody = {
    ...bodyWithoutHash(plan),
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
