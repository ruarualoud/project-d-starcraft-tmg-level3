import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  ARMY_BUILDER_ROSTER_VERDICT_SCHEMA,
  verifyArmyBuilderRosterVerdictV1,
} from "./army-builder-query-port-v1.mjs";
import {
  createRosterCandidateV1,
  verifyRosterPlanV1,
} from "./roster-plan-contracts-v1.mjs";

export const VERIFIED_PRESET_ROSTER_LOCK_SCHEMA =
  "starcraft_tmg_verified_preset_roster_lock_v1";

const HASH = /^[a-f0-9]{64}$/u;

function fail(code) { throw new Error(code); }
function object(value) {
  return value !== null && typeof value === "object"
    && !Array.isArray(value);
}
function exactKeys(value, names) {
  return object(value) && isDeepStrictEqual(
    Object.keys(value).sort(), [...names].sort());
}
function name(value) {
  return typeof value === "string" && value.trim() === value
    && value.length > 0;
}
function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}
function withoutHash(value) {
  const { lockHash, ...body } = value;
  return body;
}

function candidateInputFromRecipe(baselinePlan, recipe, scaleId,
  mineralBudget) {
  if (!exactKeys(recipe,
    ["factionRecordKey", "tacticalCardRecordKeys", "units"])
    || !name(recipe.factionRecordKey)
    || !Array.isArray(recipe.tacticalCardRecordKeys)
    || !recipe.tacticalCardRecordKeys.every(name)
    || new Set(recipe.tacticalCardRecordKeys).size
      !== recipe.tacticalCardRecordKeys.length
    || !Array.isArray(recipe.units) || recipe.units.length === 0) {
    fail("PRESET_ROSTER_RECIPE_INVALID");
  }
  const unitIds = new Set();
  const units = recipe.units.map((unit) => {
    if (!exactKeys(unit, ["unitInstanceId", "recordKey",
      "compositionKind", "upgradeNames"])
      || !name(unit.unitInstanceId) || !name(unit.recordKey)
      || !name(unit.compositionKind) || !Array.isArray(unit.upgradeNames)
      || !unit.upgradeNames.every(name)
      || unitIds.has(unit.unitInstanceId)) {
      fail("PRESET_ROSTER_RECIPE_INVALID");
    }
    unitIds.add(unit.unitInstanceId);
    return {
      unitInstanceId: unit.unitInstanceId,
      recordKey: unit.recordKey,
      compositionKind: unit.compositionKind,
      upgrades: unit.upgradeNames.map((upgradeName) => ({ upgradeName })),
    };
  });
  return {
    sideKey: baselinePlan.sideKey,
    scaleId,
    mineralBudget,
    factionRecordKey: recipe.factionRecordKey,
    tacticalCardRecordKeys: [...recipe.tacticalCardRecordKeys],
    units,
  };
}

function validateBaseline(baselinePlan, recipe) {
  verifyRosterPlanV1(baselinePlan);
  if (baselinePlan.planStatus !== "no_pregame_plan"
    || baselinePlan.presetRoster !== true
    || !HASH.test(String(baselinePlan.presetBinding?.armyAuditResultHash || ""))
    || hashStarcraftTmgContract({
      sideKey: baselinePlan.sideKey, recipe,
    }) !== baselinePlan.presetBinding.rosterHash) {
    fail("PRESET_ROSTER_SOURCE_BINDING_INVALID");
  }
}

function candidateFromVerdict(input, verdict, baselinePlan) {
  return createRosterCandidateV1({
    candidateId: `locked-preset-${baselinePlan.planHash.slice(0, 16)}`,
    sideKey: input.sideKey,
    factionRecordKey: input.factionRecordKey,
    scaleId: input.scaleId,
    mineralBudget: input.mineralBudget,
    tacticalCardRecordKeys: input.tacticalCardRecordKeys,
    units: input.units.map((unit) => ({
      unitInstanceId: unit.unitInstanceId,
      recordKey: unit.recordKey,
      compositionKind: unit.compositionKind,
      upgradeSelections: unit.upgrades.map(({ upgradeName }) => ({
        upgradeName,
      })),
    })),
    legalityStatus: "legal",
    legalityReceipt: { auditResultHash: verdict.auditResultHash },
  });
}

// This is a read-only bridge from an already fixed Room recipe to the exact
// Rules-owned Builder verdict. It does not choose or repair any models.
export function createVerifiedPresetRosterLockV1(input = {}) {
  const { baselinePlan, recipe, armyBuilderPort } = input;
  if (typeof armyBuilderPort?.evaluateRosterCandidate !== "function") {
    fail("PRESET_ROSTER_BUILDER_PORT_REQUIRED");
  }
  validateBaseline(baselinePlan, recipe);
  const scaleId = input.scaleId;
  const mineralBudget = input.mineralBudget;
  if (!name(scaleId) || !Number.isSafeInteger(mineralBudget)
    || mineralBudget < 1) {
    fail("PRESET_ROSTER_BUILD_CONTEXT_INVALID");
  }
  const candidateInput = candidateInputFromRecipe(baselinePlan, recipe,
    scaleId, mineralBudget);
  const verdict = armyBuilderPort.evaluateRosterCandidate(candidateInput);
  if (verdict.schema !== ARMY_BUILDER_ROSTER_VERDICT_SCHEMA
    || verdict.auditResultHash
      !== baselinePlan.presetBinding.armyAuditResultHash) {
    fail("PRESET_ROSTER_RULES_AUDIT_DRIFT");
  }
  verifyArmyBuilderRosterVerdictV1(verdict);
  const candidate = candidateFromVerdict(candidateInput, verdict, baselinePlan);
  const body = {
    schema: VERIFIED_PRESET_ROSTER_LOCK_SCHEMA,
    baselinePlan,
    recipe: structuredClone(recipe),
    candidateInput,
    candidate,
    verdict,
    modelSelectionLocked: true,
    selectedByAgent: false,
    trainingTruth: false,
  };
  return freezeDeep({ ...body, lockHash: hashStarcraftTmgContract(body) });
}

export function verifyVerifiedPresetRosterLockV1(lock, armyBuilderPort) {
  if (!object(lock) || lock.schema !== VERIFIED_PRESET_ROSTER_LOCK_SCHEMA
    || !HASH.test(String(lock.lockHash || ""))
    || hashStarcraftTmgContract(withoutHash(lock)) !== lock.lockHash
    || lock.modelSelectionLocked !== true
    || lock.selectedByAgent !== false || lock.trainingTruth !== false) {
    fail("PRESET_ROSTER_LOCK_INVALID");
  }
  const rebuilt = createVerifiedPresetRosterLockV1({
    baselinePlan: lock.baselinePlan,
    recipe: lock.recipe,
    scaleId: lock.candidateInput?.scaleId,
    mineralBudget: lock.candidateInput?.mineralBudget,
    armyBuilderPort,
  });
  if (rebuilt.lockHash !== lock.lockHash
    || !isDeepStrictEqual(rebuilt, lock)) {
    fail("PRESET_ROSTER_LOCK_RULES_DRIFT");
  }
  return true;
}
