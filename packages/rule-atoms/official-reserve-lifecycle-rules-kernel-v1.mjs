import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { verifyOfficialReserveLifecycleDataBundleV1 } from
  "../source-data/official-reserve-lifecycle-data-bundle-v1.mjs";
import { verifyOfficialUnitCardSupplyDataBundleV1 } from
  "../source-data/official-unit-card-supply-data-bundle-v1.mjs";
import { resolveOfficialCurrentSupplyValueV1 } from
  "./official-unit-card-supply-rules-kernel-v1.mjs";

const PROCEDURE_KINDS = Object.freeze([
  "army_initial_reserves",
  "final_scoring_reserve_destruction",
  "post_arrival_state",
  "reserve_targeting_restriction",
  "return_to_reserves",
]);
const HASH = /^[a-f0-9]{64}$/u;

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
function result(body) {
  return freezeDeep({ ...body, resultHash: hashStarcraftTmgContract(body) });
}
function nonEmpty(value, code) {
  const text = String(value || "").trim();
  if (!text) fail(code);
  return text;
}
function bundles(input) {
  verifyOfficialReserveLifecycleDataBundleV1(input.reserveLifecycleDataBundle);
  verifyOfficialUnitCardSupplyDataBundleV1(input.unitCardSupplyDataBundle);
  return {
    reserve: input.reserveLifecycleDataBundle,
    unitSupply: input.unitCardSupplyDataBundle,
  };
}
function validateState(input) {
  const state = input.state;
  if (!object(state) || !Array.isArray(state.pieces) || !object(state.players)
    || !object(state.board) || !Array.isArray(state.board.tokens)
    || !Array.isArray(state.board.effectMarkers)
    || input.rulesOwnedStateRequested !== true
    || input.clientSuppliedMutation !== undefined) {
    fail("RESERVE_LIFECYCLE_STATE_INVALID");
  }
  const ids = state.pieces.map((piece) => nonEmpty(piece?.id,
    "RESERVE_LIFECYCLE_PIECE_INVALID"));
  if (new Set(ids).size !== ids.length) fail("RESERVE_LIFECYCLE_PIECE_DUPLICATE");
  return state;
}
function live(piece) {
  return object(piece) && piece.isDestroyed !== true
    && Number.isSafeInteger(Number(piece.currentModels))
    && Number(piece.currentModels) > 0;
}
function exactCurrentSupply(piece, unitSupply) {
  const resolved = resolveOfficialCurrentSupplyValueV1({
    unitCardSupplyDataBundle: unitSupply,
    recordKey: nonEmpty(piece.officialUnitRecordKey,
      "RESERVE_LIFECYCLE_UNIT_RECORD_REQUIRED"),
    currentModels: Number(piece.currentModels),
    isDestroyed: piece.isDestroyed === true,
    rulesOwnedCurrentModelCountRequested: true,
  });
  if (Number(piece.currentSupply) !== resolved.currentSupplyValue) {
    fail("RESERVE_LIFECYCLE_CURRENT_SUPPLY_STALE", piece.id);
  }
  return resolved;
}
function models(piece) {
  if (!Array.isArray(piece.models) || piece.models.length < Number(piece.currentModels)) {
    fail("RESERVE_LIFECYCLE_MODEL_DENOMINATOR_INVALID", piece.id);
  }
  return piece.models;
}
function retainedState(piece, state) {
  const affectedMarkers = state.board.effectMarkers.filter((entry) => (
    entry?.affectedPieceId === piece.id || entry?.targetPieceId === piece.id
  ));
  return {
    loadout: {
      officialUnitRecordKey: piece.officialUnitRecordKey,
      selectedUpgradeNames: structuredClone(piece.selectedUpgradeNames || []),
      equipment: structuredClone(piece.equipment || []),
      weaponChoices: structuredClone(piece.weaponChoices || []),
      assignedUpgradeByModelId: structuredClone(piece.assignedUpgradeByModelId || {}),
    },
    damage: {
      currentModels: Number(piece.currentModels),
      damageMarker: Number(piece.damageMarker || 0),
      destroyedModelIds: structuredClone(piece.destroyedModelIds || []),
      modelDamage: models(piece).map((model) => ({
        modelId: model.id,
        damage: Number(model.damage || 0),
        remainingWounds: model.remainingWounds ?? null,
        isDestroyed: model.isDestroyed === true,
      })),
    },
    timedEffects: {
      statuses: structuredClone(piece.statuses || []),
      combatEffects: structuredClone(piece.combatEffects || []),
      assaultEffects: structuredClone(piece.assaultEffects || []),
      affectedMarkers: structuredClone(affectedMarkers),
    },
    activatedPhases: structuredClone(piece.activatedPhases || {}),
  };
}
function offBattlefieldPatch(piece, patch = {}) {
  return {
    pieceId: piece.id,
    expectedBeforePieceHash: hashStarcraftTmgContract(piece),
    set: { isOnField: false, isInReserves: true, ...patch },
    deleteFields: ["xInches", "yInches"],
    modelPatches: models(piece).filter((model) => model.isDestroyed !== true).map((model) => ({
      modelId: model.id,
      set: { isOnField: false },
      deleteFields: ["xInches", "yInches"],
    })),
  };
}
function leftArtifactIds(entries, pieceId) {
  return entries.filter((entry) => (
    entry?.leftOnBattlefieldByPieceId === pieceId && entry?.stayInPlay !== true
  )).map((entry) => nonEmpty(entry.id,
    "RESERVE_LIFECYCLE_LEFT_ARTIFACT_ID_REQUIRED")).sort();
}
function pieceFor(state, pieceId) {
  const id = nonEmpty(pieceId, "RESERVE_LIFECYCLE_PIECE_REQUIRED");
  const piece = state.pieces.find((entry) => entry?.id === id);
  if (!piece) fail("RESERVE_LIFECYCLE_PIECE_NOT_FOUND", id);
  return piece;
}
function common(input, procedureKind) {
  if (!PROCEDURE_KINDS.includes(procedureKind)) {
    fail("RESERVE_LIFECYCLE_PROCEDURE_KIND_INVALID");
  }
  const { reserve, unitSupply } = bundles(input);
  const state = validateState(input);
  return { reserve, unitSupply, state };
}

export function resolveOfficialArmyInitialReservesV1(input = {}) {
  const { reserve, unitSupply, state } = common(input, "army_initial_reserves");
  if (Number(state.round) !== 1 || state.phase !== "setup"
    || input.armyListUnitDenominatorComplete !== true
    || state.pieces.length === 0 || state.pieces.some((piece) => !live(piece))
    || (state.reserveLifecycleHistory || []).some((entry) => (
      entry?.procedureKind === "army_initial_reserves"
    ))) {
    fail("INITIAL_RESERVES_WINDOW_INVALID");
  }
  const units = state.pieces.map((piece) => {
    const supply = exactCurrentSupply(piece, unitSupply);
    return { pieceId: piece.id, sideKey: piece.sideKey,
      currentSupply: supply.currentSupplyValue,
      retainedStateHash: hashStarcraftTmgContract(retainedState(piece, state)) };
  }).sort((left, right) => left.pieceId.localeCompare(right.pieceId));
  return result({
    schema: "starcraft_tmg_official_army_initial_reserves_resolution_v1",
    procedureKind: "army_initial_reserves", round: 1, phase: "setup",
    units, allArmyListUnitsBeginOffBattlefieldInReserves: true,
    reserveIsOffBattlefieldHoldingAreaUntilDeployment: true,
    mutation: {
      piecePatches: state.pieces.map((piece) => offBattlefieldPatch(piece)),
      removeBoardTokenIds: [], removeEffectMarkerIds: [],
    },
    reserveLifecycleDataBundleHash: reserve.bundleHash,
    clientSuppliedMutationAccepted: false, trainingTruth: false,
  });
}

export function resolveOfficialReturnToReservesV1(input = {}) {
  const { reserve, unitSupply, state } = common(input, "return_to_reserves");
  const piece = pieceFor(state, input.pieceId);
  if (!live(piece) || piece.isOnField !== true || piece.isInReserves === true
    || !HASH.test(String(input.triggerReceiptHash || ""))
    || input.triggerAuthority !== "rule_effect_resolution") {
    fail("RETURN_TO_RESERVES_TRIGGER_INVALID", piece.id);
  }
  const supply = exactCurrentSupply(piece, unitSupply);
  const retained = retainedState(piece, state);
  const removeBoardTokenIds = leftArtifactIds(state.board.tokens, piece.id);
  const removeEffectMarkerIds = leftArtifactIds(state.board.effectMarkers, piece.id);
  const stayInPlayArtifactIds = [...state.board.tokens, ...state.board.effectMarkers]
    .filter((entry) => entry?.leftOnBattlefieldByPieceId === piece.id
      && entry?.stayInPlay === true)
    .map((entry) => entry.id).sort();
  return result({
    schema: "starcraft_tmg_official_return_to_reserves_resolution_v1",
    procedureKind: "return_to_reserves", pieceId: piece.id,
    sideKey: piece.sideKey, triggerReceiptHash: input.triggerReceiptHash,
    returnedUnitIsNotDestroyed: true,
    currentSupplyReleasedImmediately: supply.currentSupplyValue,
    retainedState: retained,
    retainedStateHash: hashStarcraftTmgContract(retained),
    equipmentAndArmyBuildingSelectionsRetained: true,
    currentDamageRetained: true,
    timedEffectsContinueAndExpireNormally: true,
    activationStateRetainedForCurrentPhase: true,
    reserveAbilityState: {
      active: "inactive", passive: "inactive", reaction: "inactive",
      mayTrigger: false, mayAffect: false, mayPayCosts: false, mayRespond: false,
    },
    removeBoardTokenIds, removeEffectMarkerIds, stayInPlayArtifactIds,
    mutation: {
      piecePatches: [offBattlefieldPatch(piece)],
      removeBoardTokenIds, removeEffectMarkerIds,
    },
    reserveLifecycleDataBundleHash: reserve.bundleHash,
    clientSuppliedMutationAccepted: false, trainingTruth: false,
  });
}

export function resolveOfficialReserveTargetingRestrictionV1(input = {}) {
  const { reserve, state } = common(input, "reserve_targeting_restriction");
  const piece = pieceFor(state, input.pieceId);
  if (!live(piece) || piece.isOnField === true || piece.isInReserves !== true
    || input.explicitReserveAffectingException !== false
    || input.exceptionAtomId !== undefined) {
    fail("RESERVE_TARGETING_QUERY_INVALID", piece.id);
  }
  return result({
    schema: "starcraft_tmg_official_reserve_targeting_restriction_resolution_v1",
    procedureKind: "reserve_targeting_restriction", pieceId: piece.id,
    canBeTargetedByAttackOrAbility: false,
    reason: "unit_in_reserves_without_explicit_reserve_affecting_exception",
    explicitExceptionRequired: true, explicitExceptionApplied: false,
    mutation: { piecePatches: [], removeBoardTokenIds: [], removeEffectMarkerIds: [] },
    reserveLifecycleDataBundleHash: reserve.bundleHash,
    trainingTruth: false,
  });
}

function reserveDeployWitness(state, pieceId) {
  const events = (state.log || []).flatMap((entry) => entry?.events || []);
  const witness = [...events].reverse().find((event) => (
    event?.type === "reserve_deployed" && event?.pieceId === pieceId
  ));
  if (!witness || !HASH.test(String(witness.deployPlanHash || ""))) {
    fail("POST_ARRIVAL_RESERVE_DEPLOY_WITNESS_REQUIRED", pieceId);
  }
  return witness;
}

export function resolveOfficialPostArrivalReserveStateV1(input = {}) {
  const { reserve, state } = common(input, "post_arrival_state");
  const piece = pieceFor(state, input.pieceId);
  if (!live(piece) || piece.isOnField !== true || piece.isInReserves !== true) {
    fail("POST_ARRIVAL_UNIT_STATE_INVALID", piece.id);
  }
  const witness = reserveDeployWitness(state, piece.id);
  return result({
    schema: "starcraft_tmg_official_post_arrival_reserve_state_resolution_v1",
    procedureKind: "post_arrival_state", pieceId: piece.id,
    deployPlanHash: witness.deployPlanHash,
    abilitiesResumeImmediately: true,
    zoneOfInfluenceAffectsAlreadyArrivedUnit: false,
    zoneOfInfluenceRestrictsPostArrivalMovementLineOfSightOrRules: false,
    arrivalGeometryOwnedByFrozenReserveDeployV5: true,
    mutation: { piecePatches: [{ pieceId: piece.id,
      expectedBeforePieceHash: hashStarcraftTmgContract(piece),
      set: { isInReserves: false }, deleteFields: [], modelPatches: [] }],
      removeBoardTokenIds: [], removeEffectMarkerIds: [] },
    reserveLifecycleDataBundleHash: reserve.bundleHash,
    trainingTruth: false,
  });
}

export function resolveOfficialFinalReserveDestructionV1(input = {}) {
  const { reserve, unitSupply, state } = common(input,
    "final_scoring_reserve_destruction");
  if (Number(state.round) !== reserve.mission.gameLengthRounds
    || state.phase !== "cleanup" || input.finalScoringPhaseStart !== true
    || input.gameEndingByRoundLimit !== true
    || input.specialVictoryAlreadyEnded !== false
    || state.gameOver === true || state.terminal === true
    || object(state.finalReserveDestructionLedger)
    || Object.keys(state.players).length !== 2) {
    fail("FINAL_RESERVE_DESTRUCTION_WINDOW_INVALID");
  }
  const reserveUnits = state.pieces.filter((piece) => (
    live(piece) && piece.isOnField !== true && piece.isInReserves === true
  ));
  const entries = reserveUnits.map((piece) => {
    const supply = exactCurrentSupply(piece, unitSupply);
    const enemySideKey = Object.keys(state.players).find((sideKey) => (
      sideKey !== piece.sideKey
    ));
    if (!enemySideKey) fail("FINAL_RESERVE_ENEMY_SIDE_UNRESOLVED", piece.id);
    return {
      pieceId: piece.id, destroyedSideKey: piece.sideKey,
      creditedEnemySideKey: enemySideKey,
      currentSupplyBeforeDestruction: supply.currentSupplyValue,
      destroyedEnemySupplyVp:
        supply.currentSupplyValue * reserve.mission.destroyedEnemySupplyVpPerSupply,
      currentModelIds: models(piece).filter((model) => model.isDestroyed !== true)
        .map((model) => model.id).sort(),
    };
  }).sort((left, right) => left.pieceId.localeCompare(right.pieceId));
  const piecePatches = entries.map((entry) => {
    const piece = pieceFor(state, entry.pieceId);
    return {
      pieceId: piece.id,
      expectedBeforePieceHash: hashStarcraftTmgContract(piece),
      set: {
        isOnField: false, isInReserves: false, isDestroyed: true,
        wasInReservesAtFinalScoring: true,
        currentModels: 0, currentSupply: 0,
        destroyedModelIds: [...new Set([
          ...(piece.destroyedModelIds || []), ...entry.currentModelIds,
        ])].sort(),
      },
      deleteFields: ["xInches", "yInches"],
      modelPatches: entry.currentModelIds.map((modelId) => ({
        modelId, set: { isOnField: false, isDestroyed: true },
        deleteFields: ["xInches", "yInches"],
      })),
    };
  });
  const vpBySide = Object.fromEntries(Object.keys(state.players).sort().map((sideKey) => [
    sideKey,
    entries.filter((entry) => entry.creditedEnemySideKey === sideKey)
      .reduce((sum, entry) => sum + entry.destroyedEnemySupplyVp, 0),
  ]));
  return result({
    schema: "starcraft_tmg_official_final_reserve_destruction_resolution_v1",
    procedureKind: "final_scoring_reserve_destruction",
    round: Number(state.round), phase: state.phase,
    entries, entryDenominatorComplete: true, destroyedEnemySupplyVpBySide: vpBySide,
    reserveUnitsConsideredDestroyedAtFinalScoringStart: true,
    missionScoringProfileHash: reserve.mission.missionScoringProfileHash,
    scoringCommitDeferredToSlice110: true,
    mutation: { piecePatches, removeBoardTokenIds: [], removeEffectMarkerIds: [],
      finalReserveDestructionLedgerEntries: entries },
    reserveLifecycleDataBundleHash: reserve.bundleHash,
    clientSuppliedMutationAccepted: false, trainingTruth: false,
  });
}

export function resolveOfficialReserveLifecycleProcedureV1(input = {}) {
  switch (input.procedureKind) {
    case "army_initial_reserves": return resolveOfficialArmyInitialReservesV1(input);
    case "return_to_reserves": return resolveOfficialReturnToReservesV1(input);
    case "reserve_targeting_restriction":
      return resolveOfficialReserveTargetingRestrictionV1(input);
    case "post_arrival_state": return resolveOfficialPostArrivalReserveStateV1(input);
    case "final_scoring_reserve_destruction":
      return resolveOfficialFinalReserveDestructionV1(input);
    default: fail("RESERVE_LIFECYCLE_PROCEDURE_KIND_INVALID");
  }
}

export function officialReserveLifecycleProcedureKindsV1() {
  return [...PROCEDURE_KINDS];
}
