import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { verifyOfficialSupplyPoolDataBundleV1 } from
  "../source-data/official-supply-pool-data-bundle-v1.mjs";
import { verifyOfficialUnitCardSupplyDataBundleV1 } from
  "../source-data/official-unit-card-supply-data-bundle-v1.mjs";
import { resolveOfficialCurrentSupplyValueV1 } from
  "./official-unit-card-supply-rules-kernel-v1.mjs";

const PROCEDURE_KINDS = new Set([
  "available_supply_verification",
  "casualty_supply_release",
  "deployment_card_reference",
  "round_one_supply_pool",
]);

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}
function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}
function nonEmpty(value, code) {
  const result = String(value || "").trim();
  if (!result) fail(code);
  return result;
}
function result(body) {
  return freezeDeep({ ...body, resultHash: hashStarcraftTmgContract(body) });
}
function bundlesFor(input) {
  const supplyPoolDataBundle = input.supplyPoolDataBundle;
  const unitCardSupplyDataBundle = input.unitCardSupplyDataBundle;
  verifyOfficialSupplyPoolDataBundleV1(supplyPoolDataBundle);
  verifyOfficialUnitCardSupplyDataBundleV1(unitCardSupplyDataBundle);
  return { supplyPoolDataBundle, unitCardSupplyDataBundle };
}
function exactTwoSides(value) {
  if (!Array.isArray(value) || value.length !== 2) {
    fail("SUPPLY_POOL_TWO_PLAYERS_REQUIRED");
  }
  const sides = value.map((entry) => nonEmpty(entry,
    "SUPPLY_POOL_TWO_PLAYERS_REQUIRED"));
  if (new Set(sides).size !== 2) fail("SUPPLY_POOL_TWO_PLAYERS_REQUIRED");
  return sides.sort();
}

export function resolveOfficialRoundOneSupplyPoolV1(input = {}) {
  const { supplyPoolDataBundle } = bundlesFor(input);
  const sides = exactTwoSides(input.playerSideKeys);
  if (Number(input.round) !== 1
    || input.rulesOwnedSupplyPoolRequested !== true
    || input.clientSuppliedSupplyPool !== undefined) {
    fail("ROUND_ONE_SUPPLY_POOL_REQUEST_INVALID");
  }
  const startingSupply = supplyPoolDataBundle.mission.startingSupply;
  return result({
    schema: "starcraft_tmg_official_round_one_supply_pool_resolution_v1",
    round: 1,
    playerSideKeys: sides,
    missionRecordKey: supplyPoolDataBundle.missionRecord.recordKey,
    missionRecordHash: supplyPoolDataBundle.missionRecord.sourceRecordHash,
    missionScoringProfileHash:
      supplyPoolDataBundle.mission.missionScoringProfileHash,
    supplyPoolBySide: Object.fromEntries(sides.map((sideKey) => (
      [sideKey, startingSupply]
    ))),
    supplyPoolIsTotalInstantaneousBattlefieldCapacity: true,
    reserveSupplyConsumesPool: false,
    laterRoundEscalationReusesExistingExecutableAtom: true,
    finalRoundUnlimitedReusesExistingExecutableAtom: true,
    clientSuppliedSupplyPoolAccepted: false,
    trainingTruth: false,
  });
}

function normalizeUnitRows(input, sides) {
  const bundle = input.unitCardSupplyDataBundle;
  verifyOfficialUnitCardSupplyDataBundleV1(bundle);
  if (input.unitRowsComplete !== true || !Array.isArray(input.unitRows)
    || input.clientSuppliedCurrentSupplyValues !== undefined) {
    fail("SUPPLY_POOL_UNIT_DENOMINATOR_INCOMPLETE");
  }
  const seen = new Set();
  const rows = input.unitRows.map((raw) => {
    if (!object(raw)) fail("SUPPLY_POOL_UNIT_ROW_INVALID");
    const pieceId = nonEmpty(raw.pieceId, "SUPPLY_POOL_UNIT_ROW_INVALID");
    const sideKey = nonEmpty(raw.sideKey, "SUPPLY_POOL_UNIT_ROW_INVALID");
    const recordKey = nonEmpty(raw.recordKey, "SUPPLY_POOL_UNIT_ROW_INVALID");
    const currentModels = Number(raw.currentModels);
    if (seen.has(pieceId) || !sides.includes(sideKey)
      || !Number.isSafeInteger(currentModels) || currentModels < 0
      || typeof raw.isDestroyed !== "boolean"
      || typeof raw.isOnBattlefield !== "boolean"
      || (raw.isDestroyed && raw.isOnBattlefield)
      || (raw.isDestroyed && currentModels !== 0)
      || (!raw.isDestroyed && currentModels === 0)) {
      fail("SUPPLY_POOL_UNIT_ROW_INVALID", pieceId);
    }
    seen.add(pieceId);
    const supply = resolveOfficialCurrentSupplyValueV1({
      unitCardSupplyDataBundle: bundle,
      recordKey,
      currentModels,
      isDestroyed: raw.isDestroyed,
      rulesOwnedCurrentModelCountRequested: true,
    });
    return {
      pieceId,
      sideKey,
      recordKey,
      currentModels,
      isDestroyed: raw.isDestroyed,
      isOnBattlefield: raw.isOnBattlefield,
      currentSupplyValue: supply.currentSupplyValue,
      currentSupplyResolutionHash: supply.resultHash,
    };
  }).sort((left, right) => left.pieceId.localeCompare(right.pieceId));
  return rows;
}

export function resolveOfficialAvailableSupplyVerificationV1(input = {}) {
  const { supplyPoolDataBundle, unitCardSupplyDataBundle } = bundlesFor(input);
  const sides = exactTwoSides(input.playerSideKeys);
  const movementStart = input.movementStartVerificationRequested === true;
  const casualtyRecalculation = input.casualtyRecalculationRequested === true;
  if (input.rulesOwnedAvailableSupplyRequested !== true
    || input.clientSuppliedAvailableSupply !== undefined
    || movementStart === casualtyRecalculation) {
    fail("AVAILABLE_SUPPLY_VERIFICATION_REQUEST_INVALID");
  }
  const capacity = resolveOfficialRoundOneSupplyPoolV1({
    supplyPoolDataBundle,
    unitCardSupplyDataBundle,
    round: input.round,
    playerSideKeys: sides,
    rulesOwnedSupplyPoolRequested: true,
  });
  const rows = normalizeUnitRows({
    unitCardSupplyDataBundle,
    unitRows: input.unitRows,
    unitRowsComplete: input.unitRowsComplete,
    clientSuppliedCurrentSupplyValues: input.clientSuppliedCurrentSupplyValues,
  }, sides);
  const onTableSupplyBySide = Object.fromEntries(sides.map((sideKey) => [
    sideKey,
    rows.filter((row) => row.sideKey === sideKey && row.isOnBattlefield
      && !row.isDestroyed).reduce((sum, row) => sum + row.currentSupplyValue, 0),
  ]));
  const reserveSupplyBySide = Object.fromEntries(sides.map((sideKey) => [
    sideKey,
    rows.filter((row) => row.sideKey === sideKey && !row.isOnBattlefield
      && !row.isDestroyed).reduce((sum, row) => sum + row.currentSupplyValue, 0),
  ]));
  const availableSupplyBySide = Object.fromEntries(sides.map((sideKey) => [
    sideKey,
    capacity.supplyPoolBySide[sideKey] - onTableSupplyBySide[sideKey],
  ]));
  if (sides.some((sideKey) => availableSupplyBySide[sideKey] < 0)) {
    fail("SUPPLY_POOL_CAP_EXCEEDED");
  }
  const reserveFieldingEligibility = rows.filter((row) => (
    !row.isOnBattlefield && !row.isDestroyed
  )).map((row) => ({
    pieceId: row.pieceId,
    sideKey: row.sideKey,
    currentSupplyValue: row.currentSupplyValue,
    availableSupply: availableSupplyBySide[row.sideKey],
    supplyEligibleToField:
      row.currentSupplyValue <= availableSupplyBySide[row.sideKey],
  }));
  return result({
    schema: "starcraft_tmg_official_available_supply_verification_v1",
    round: 1,
    playerSideKeys: sides,
    supplyPoolBySide: capacity.supplyPoolBySide,
    onTableSupplyBySide,
    reserveSupplyBySide,
    availableSupplyBySide,
    unitSupplyRows: rows,
    unitSupplyRowsHash: hashStarcraftTmgContract(rows),
    reserveFieldingEligibility,
    verificationContext: movementStart
      ? "movement_start" : "casualty_recalculation",
    everyPlayerVerifiedAtMovementStart: movementStart,
    casualtySupplyRecalculatedImmediately: casualtyRecalculation,
    formula: "supply_pool_minus_friendly_on_table_current_supply",
    reserveExcludedFromOnTableSupply: true,
    unitCardSupplyDataBundleHash: unitCardSupplyDataBundle.bundleHash,
    supplyPoolDataBundleHash: supplyPoolDataBundle.bundleHash,
    clientSuppliedSupplyValuesAccepted: false,
    completeLaterRoundSupplyLifecycleClaimed: false,
    trainingTruth: false,
  });
}

export function resolveOfficialCasualtySupplyReleaseV1(input = {}) {
  const { supplyPoolDataBundle, unitCardSupplyDataBundle } = bundlesFor(input);
  const sides = exactTwoSides(input.playerSideKeys);
  const casualtyPieceId = nonEmpty(input.casualtyPieceId,
    "CASUALTY_SUPPLY_PIECE_REQUIRED");
  if (input.rulesOwnedCasualtySupplyRequested !== true
    || input.clientSuppliedFreedSupply !== undefined) {
    fail("CASUALTY_SUPPLY_RELEASE_REQUEST_INVALID");
  }
  const shared = {
    supplyPoolDataBundle,
    unitCardSupplyDataBundle,
    round: input.round,
    playerSideKeys: sides,
    rulesOwnedAvailableSupplyRequested: true,
    casualtyRecalculationRequested: true,
  };
  const before = resolveOfficialAvailableSupplyVerificationV1({
    ...shared,
    unitRows: input.beforeUnitRows,
    unitRowsComplete: input.beforeUnitRowsComplete,
  });
  const after = resolveOfficialAvailableSupplyVerificationV1({
    ...shared,
    unitRows: input.afterUnitRows,
    unitRowsComplete: input.afterUnitRowsComplete,
  });
  const beforeById = new Map(before.unitSupplyRows.map((row) => [row.pieceId, row]));
  const afterById = new Map(after.unitSupplyRows.map((row) => [row.pieceId, row]));
  if (beforeById.size !== afterById.size
    || !beforeById.has(casualtyPieceId) || !afterById.has(casualtyPieceId)) {
    fail("CASUALTY_SUPPLY_UNIT_DENOMINATOR_DRIFT");
  }
  for (const [pieceId, row] of beforeById) {
    if (pieceId !== casualtyPieceId && !isDeepStrictEqual(row, afterById.get(pieceId))) {
      fail("CASUALTY_SUPPLY_UNRELATED_UNIT_DRIFT", pieceId);
    }
  }
  const beforeRow = beforeById.get(casualtyPieceId);
  const afterRow = afterById.get(casualtyPieceId);
  if (beforeRow.sideKey !== afterRow.sideKey
    || beforeRow.recordKey !== afterRow.recordKey
    || beforeRow.isDestroyed || !beforeRow.isOnBattlefield
    || afterRow.currentModels >= beforeRow.currentModels
    || (afterRow.isDestroyed
      ? (afterRow.currentModels !== 0 || afterRow.isOnBattlefield)
      : (!afterRow.isOnBattlefield || afterRow.currentModels <= 0))
    || afterRow.currentSupplyValue > beforeRow.currentSupplyValue) {
    fail("CASUALTY_SUPPLY_TRANSITION_INVALID", casualtyPieceId);
  }
  const sideKey = beforeRow.sideKey;
  const supplyFreed = beforeRow.currentSupplyValue - afterRow.currentSupplyValue;
  const availableSupplyIncrease = after.availableSupplyBySide[sideKey]
    - before.availableSupplyBySide[sideKey];
  if (supplyFreed !== availableSupplyIncrease) {
    fail("CASUALTY_SUPPLY_RELEASE_MISMATCH", casualtyPieceId);
  }
  return result({
    schema: "starcraft_tmg_official_casualty_supply_release_resolution_v1",
    round: 1,
    casualtyPieceId,
    sideKey,
    currentModelsBefore: beforeRow.currentModels,
    currentModelsAfter: afterRow.currentModels,
    currentSupplyBefore: beforeRow.currentSupplyValue,
    currentSupplyAfter: afterRow.currentSupplyValue,
    supplyFreed,
    availableSupplyBefore: before.availableSupplyBySide[sideKey],
    availableSupplyAfter: after.availableSupplyBySide[sideKey],
    availableSupplyIncrease,
    verificationContext: "casualty_recalculation",
    beforeVerificationHash: before.resultHash,
    afterVerificationHash: after.resultHash,
    casualtyImmediatelyRecomputesCurrentAndAvailableSupply: true,
    zeroTierChangeMayFreeZeroSupply: true,
    clientSuppliedFreedSupplyAccepted: false,
    trainingTruth: false,
  });
}

export function resolveOfficialDeploymentCardSupplyReferenceV1(input = {}) {
  const { supplyPoolDataBundle } = bundlesFor(input);
  if (input.rulesOwnedDeploymentReferenceRequested !== true
    || input.clientSuppliedInfluenceZone !== undefined) {
    fail("DEPLOYMENT_CARD_REFERENCE_REQUEST_INVALID");
  }
  return result({
    schema: "starcraft_tmg_official_deployment_card_supply_reference_v1",
    deploymentRecordKey: supplyPoolDataBundle.deploymentRecord.recordKey,
    deploymentRecordHash: supplyPoolDataBundle.deploymentRecord.sourceRecordHash,
    deploymentName: supplyPoolDataBundle.deployment.name,
    engagementScale: supplyPoolDataBundle.deployment.engagementScale,
    zoneOfInfluenceDepthInches:
      supplyPoolDataBundle.deployment.zoneOfInfluenceDepthInches,
    entryEdgesByColor: structuredClone(
      supplyPoolDataBundle.deployment.entryEdgesByColor,
    ),
    deploymentGeometryHash: supplyPoolDataBundle.deployment.geometryHash,
    reserveDeployDataBundleHash:
      supplyPoolDataBundle.deployment.reserveDeployDataBundleHash,
    deploymentInfluenceZoneComesFromDeploymentCard: true,
    concreteArrivalLegalityRemainsReserveDeployExecutorOwned: true,
    clientSuppliedInfluenceZoneAccepted: false,
    trainingTruth: false,
  });
}

export function certifyOfficialSupplyPoolPlanV1(input = {}) {
  const plan = input.plan;
  const procedureKind = String(input.procedureKind || "");
  const { supplyPoolDataBundle, unitCardSupplyDataBundle } = bundlesFor(input);
  if (!object(plan) || !PROCEDURE_KINDS.has(procedureKind)
    || plan.procedureKind !== procedureKind
    || plan.rulesOwnedInputsComplete !== true
    || plan.clientSuppliedResult === true) {
    fail("SUPPLY_POOL_PLAN_INVALID");
  }
  const planId = nonEmpty(plan.planId, "SUPPLY_POOL_PLAN_INVALID");
  const shared = {
    ...plan.input,
    supplyPoolDataBundle,
    unitCardSupplyDataBundle,
  };
  let resolution;
  if (procedureKind === "round_one_supply_pool") {
    resolution = resolveOfficialRoundOneSupplyPoolV1(shared);
  } else if (procedureKind === "available_supply_verification") {
    resolution = resolveOfficialAvailableSupplyVerificationV1(shared);
  } else if (procedureKind === "casualty_supply_release") {
    resolution = resolveOfficialCasualtySupplyReleaseV1(shared);
  } else {
    resolution = resolveOfficialDeploymentCardSupplyReferenceV1(shared);
  }
  const body = {
    schema: "starcraft_tmg_official_supply_pool_plan_certificate_v1",
    planId,
    procedureKind,
    sideKey: String(plan.sideKey || ""),
    supplyPoolDataBundleHash: supplyPoolDataBundle.bundleHash,
    unitCardSupplyDataBundleHash: unitCardSupplyDataBundle.bundleHash,
    result: resolution,
    rulesOwnedInputsComplete: true,
    clientSuppliedResultAccepted: false,
    trainingTruth: false,
  };
  return freezeDeep({ ...body, planHash: hashStarcraftTmgContract(body) });
}

export function verifyOfficialSupplyPoolPlanCertificateV1(input = {}) {
  const rebuilt = certifyOfficialSupplyPoolPlanV1(input);
  if (!isDeepStrictEqual(rebuilt, input.certificate)) {
    fail("SUPPLY_POOL_PLAN_CERTIFICATE_DRIFT");
  }
  return true;
}

export function officialSupplyPoolProcedureKindsV1() {
  return [...PROCEDURE_KINDS].sort();
}
