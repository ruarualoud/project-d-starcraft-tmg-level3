import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { verifyOfficialStatusStayInPlayDataBundleV1 } from
  "../source-data/official-status-stay-in-play-data-bundle-v1.mjs";
import { evaluateOfficialWithinWhollyWithinV1 } from
  "./official-model-base-geometry-rules-kernel-v1.mjs";

const PROCEDURE_KINDS = Object.freeze([
  "derive_on_creep_state",
  "evaluate_siege_mode_rules",
  "reconcile_status_cleanup",
  "remove_siege_mode_on_reserve",
  "resolve_shielded_dependencies",
]);
const EFFECT_FIELDS = Object.freeze([
  "abilityEffects", "assaultEffects", "combatEffects", "timedEffects",
]);
const SIEGE_FORBIDDEN_ACTIONS = Object.freeze([
  "charge", "close_ranks", "disengage", "move", "run",
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
function result(body) {
  return freezeDeep({ ...body, resultHash: hashStarcraftTmgContract(body) });
}
function nonEmpty(value, code) {
  const text = String(value || "").trim();
  if (!text) fail(code);
  return text;
}
function normalized(value) {
  return String(value || "").trim().toLowerCase().replace(/[\s-]+/gu, "_");
}
function statusName(value) {
  return normalized(object(value)
    ? value.statusName || value.name || value.keyword || value.status
    : value);
}
function hasStatus(piece, name) {
  return Array.isArray(piece?.statuses)
    && piece.statuses.some((entry) => statusName(entry) === name);
}
function validate(input) {
  verifyOfficialStatusStayInPlayDataBundleV1(input.statusStayInPlayDataBundle);
  const state = input.state;
  if (!object(state) || !Array.isArray(state.pieces) || !object(state.players)
    || !object(state.board) || !Array.isArray(state.board.tokens)
    || !Array.isArray(state.board.effectMarkers)
    || input.rulesOwnedStateRequested !== true
    || input.clientSuppliedMutation !== undefined) {
    fail("STATUS_STAY_IN_PLAY_STATE_INVALID");
  }
  const ids = state.pieces.map((piece) => nonEmpty(piece?.id,
    "STATUS_STAY_IN_PLAY_PIECE_INVALID"));
  if (new Set(ids).size !== ids.length) fail("STATUS_STAY_IN_PLAY_PIECE_DUPLICATE");
  return { state, bundle: input.statusStayInPlayDataBundle };
}
function pieceFor(state, pieceId) {
  const id = nonEmpty(pieceId, "STATUS_STAY_IN_PLAY_PIECE_REQUIRED");
  const piece = state.pieces.find((entry) => entry?.id === id);
  if (!piece) fail("STATUS_STAY_IN_PLAY_PIECE_NOT_FOUND", id);
  return piece;
}
function patch(piece, set, deleteFields = []) {
  return { pieceId: piece.id,
    expectedBeforePieceHash: hashStarcraftTmgContract(piece), set, deleteFields };
}
function activePiece(piece) {
  return object(piece) && piece.isOnField === true && piece.isDestroyed !== true
    && Number.isSafeInteger(Number(piece.currentModels)) && Number(piece.currentModels) > 0;
}
function exactProfile(piece, profiles, code) {
  const profile = profiles.find((entry) => (
    entry.recordKey === piece.officialUnitRecordKey
  ));
  if (!profile || piece.sourceRecordHash !== profile.sourceRecordHash
    || piece.officialPayloadHash !== profile.payloadHash) fail(code, piece.id);
  return profile;
}
function explicitlyExpiresAtCleanup(entry) {
  return object(entry) && [entry.expiresAt, entry.removalStep, entry.removeAt]
    .some((value) => normalized(value) === "cleanup_and_refresh");
}
function entryId(entry, prefix, index) {
  return String(object(entry)
    ? entry.id || entry.effectId || entry.statusEffectHash || entry.markerHash
    : `${prefix}:${index}:${String(entry)}`);
}
function isStatusMarker(marker) {
  return marker?.statusMarker === true
    || ["buff", "debuff", "mode", "status"].includes(normalized(marker?.markerType));
}
function isStayInPlay(entry, statusMarker = false) {
  return entry?.stayInPlay === true || statusMarker;
}

export function resolveOfficialStatusCleanupReconciliationV1(input = {}) {
  const { state, bundle } = validate(input);
  if (input.procedureKind !== "reconcile_status_cleanup"
    || state.phase !== "cleanup" || input.cleanupAndRefreshWindow !== true) {
    fail("STATUS_CLEANUP_WINDOW_INVALID");
  }
  const piecePatches = [];
  const statusRows = [];
  const abilityEffectRows = [];
  for (const piece of state.pieces) {
    const set = {};
    const statuses = Array.isArray(piece.statuses) ? piece.statuses : [];
    const retainedStatuses = statuses.filter((entry, index) => {
      const removed = explicitlyExpiresAtCleanup(entry);
      statusRows.push({ pieceId: piece.id, field: "statuses",
        entryId: entryId(entry, "status", index), statusName: statusName(entry),
        stayInPlayByStatusMarkerRule: true,
        explicitCleanupRemovalConditionSatisfied: removed,
        outcome: removed ? "removed" : "preserved" });
      return !removed;
    });
    if (retainedStatuses.length !== statuses.length) set.statuses = retainedStatuses;
    for (const field of ["abilityEffects"]) {
      const entries = Array.isArray(piece[field]) ? piece[field] : [];
      const retained = entries.filter((entry, index) => {
        const removed = explicitlyExpiresAtCleanup(entry);
        abilityEffectRows.push({ pieceId: piece.id, field,
          entryId: entryId(entry, field, index), stayInPlay: isStayInPlay(entry),
          explicitCleanupRemovalConditionSatisfied: removed,
          outcome: removed ? "removed" : "preserved" });
        return !removed;
      });
      if (retained.length !== entries.length) set[field] = retained;
    }
    if (Object.keys(set).length > 0) piecePatches.push(patch(piece, set));
  }
  const markerRows = state.board.effectMarkers.map((entry, index) => {
    const statusMarker = isStatusMarker(entry);
    const removed = explicitlyExpiresAtCleanup(entry);
    return { id: nonEmpty(entry?.id, "STATUS_MARKER_ID_REQUIRED"),
      entryId: entryId(entry, "effectMarker", index), statusMarker,
      stayInPlay: isStayInPlay(entry, statusMarker),
      explicitCleanupRemovalConditionSatisfied: removed,
      outcome: removed ? "removed" : "preserved" };
  });
  const tokenRows = state.board.tokens.map((entry, index) => {
    const removed = explicitlyExpiresAtCleanup(entry);
    return { id: nonEmpty(entry?.id, "STAY_IN_PLAY_TOKEN_ID_REQUIRED"),
      entryId: entryId(entry, "token", index), stayInPlay: isStayInPlay(entry),
      explicitCleanupRemovalConditionSatisfied: removed,
      outcome: removed ? "removed" : "preserved" };
  });
  const removeEffectMarkerIds = markerRows.filter((entry) => entry.outcome === "removed")
    .map((entry) => entry.id).sort();
  const removeBoardTokenIds = tokenRows.filter((entry) => entry.outcome === "removed")
    .map((entry) => entry.id).sort();
  return result({
    schema: "starcraft_tmg_official_status_cleanup_reconciliation_v1",
    procedureKind: "reconcile_status_cleanup", round: Number(state.round),
    statusRows, abilityEffectRows, markerRows, tokenRows,
    statusesPersistByDefault: true,
    statusModeAndEffectMarkersHaveStayInPlay: true,
    stayInPlayOverridesGeneralCleanupRemoval: true,
    specificRemovalConditionsStillApply: true,
    mutation: { piecePatches, removeBoardTokenIds, removeEffectMarkerIds },
    statusStayInPlayDataBundleHash: bundle.bundleHash,
    clientSuppliedMutationAccepted: false, trainingTruth: false,
  });
}

export function resolveOfficialOnCreepStateV1(input = {}) {
  const { state, bundle } = validate(input);
  const piece = pieceFor(state, input.pieceId);
  if (input.procedureKind !== "derive_on_creep_state" || !activePiece(piece)) {
    fail("ON_CREEP_QUERY_INVALID", piece.id);
  }
  const profile = exactProfile(piece, bundle.zergGroundUnitProfiles,
    "ON_CREEP_GROUND_ZERG_UNIT_REQUIRED");
  const omegaSources = state.pieces.filter((entry) => (
    activePiece(entry)
      && entry.officialUnitRecordKey === bundle.omegaWormSourceOfCreep.recordKey
      && entry.sourceRecordHash === bundle.omegaWormSourceOfCreep.sourceRecordHash
      && entry.officialPayloadHash === bundle.omegaWormSourceOfCreep.payloadHash
  ));
  const assessments = [];
  for (const source of omegaSources) {
    for (const model of source.models || []) {
      if (model?.isDestroyed === true || model?.isOnField === false) continue;
      const measurement = evaluateOfficialWithinWhollyWithinV1({
        state, dataBundle: bundle.modelBaseGeometryDataBundle,
        source: { kind: "model", unitId: source.id, modelId: model.id },
        targetUnitId: piece.id,
        rangeMilliInches: bundle.omegaWormSourceOfCreep.rangeMilliInches,
      });
      assessments.push({ sourceKind: "source_of_creep_model",
        sourcePieceId: source.id, sourceModelId: model.id,
        measurementHash: measurement.resultHash, unitWithin: measurement.unitWithin,
        assessments: measurement.assessments });
    }
  }
  const withinOmegaSource = assessments.some((entry) => entry.unitWithin);
  const activeCreepTumors = state.board.tokens.filter((entry) => (
    entry?.isRemoved !== true && entry?.isDestroyed !== true
      && ["creep_tumor", "creep_tumor_token"].includes(normalized(
        entry?.tokenType || entry?.name,
      ))
  ));
  if (!withinOmegaSource && activeCreepTumors.length > 0
    && bundle.creepTumorGeometryRegistry.entries.length === 0) {
    fail("ON_CREEP_TUMOR_GEOMETRY_UNAVAILABLE");
  }
  const onCreep = withinOmegaSource;
  const before = [...new Set((piece.derivedKeywords || []).map(normalized).filter(Boolean))]
    .sort();
  const after = [...new Set(onCreep
    ? [...before, "on_creep"] : before.filter((entry) => entry !== "on_creep"))].sort();
  return result({
    schema: "starcraft_tmg_official_on_creep_state_resolution_v1",
    procedureKind: "derive_on_creep_state", pieceId: piece.id,
    sideKey: piece.sideKey, officialUnitRecordKey: profile.recordKey,
    friendlyOrEnemyAllowed: true, groundZergUnitRequired: true,
    rangeMilliInches: bundle.omegaWormSourceOfCreep.rangeMilliInches,
    sourceAssessments: assessments, activeCreepTumorCount: activeCreepTumors.length,
    creepTumorGeometrySupported: false, onCreep,
    derivedKeyword: onCreep ? "on_creep" : null,
    dependentRuleDefinitions: bundle.onCreepDependencyIndex,
    dependentRulesEnabledByKeywordOnly: onCreep,
    mutation: { piecePatches: [patch(piece, { derivedKeywords: after })],
      removeBoardTokenIds: [], removeEffectMarkerIds: [] },
    statusStayInPlayDataBundleHash: bundle.bundleHash,
    clientSuppliedConditionAccepted: false, trainingTruth: false,
  });
}

function siegeProfiles(piece) {
  const profiles = piece.siegeModeProfileSet;
  if (!Array.isArray(profiles) || profiles.length < 1
    || piece.siegeModeProfileSetHash !== hashStarcraftTmgContract(profiles)) {
    fail("SIEGE_MODE_PROFILE_SET_INVALID", piece.id);
  }
  const ids = profiles.map((entry) => nonEmpty(entry?.profileId,
    "SIEGE_MODE_PROFILE_INVALID"));
  if (new Set(ids).size !== ids.length
    || profiles.some((entry) => typeof entry.requiresSiegeMode !== "boolean")) {
    fail("SIEGE_MODE_PROFILE_SET_INVALID", piece.id);
  }
  return profiles;
}

export function resolveOfficialSiegeModeRulesV1(input = {}) {
  const { state, bundle } = validate(input);
  const piece = pieceFor(state, input.pieceId);
  if (input.procedureKind !== "evaluate_siege_mode_rules" || !activePiece(piece)) {
    fail("SIEGE_MODE_QUERY_INVALID", piece.id);
  }
  const active = hasStatus(piece, "siege_mode");
  const profiles = siegeProfiles(piece);
  const profileEligibility = profiles.map((entry) => ({
    profileId: entry.profileId, profileName: String(entry.profileName || entry.profileId),
    requiresSiegeMode: entry.requiresSiegeMode,
    eligible: active ? entry.requiresSiegeMode : !entry.requiresSiegeMode,
    reason: active
      ? entry.requiresSiegeMode ? "siege_profile_while_siege_mode"
        : "other_weapon_disabled_while_siege_mode"
      : entry.requiresSiegeMode ? "siege_profile_requires_siege_mode"
        : "ordinary_profile_outside_siege_mode",
  }));
  return result({
    schema: "starcraft_tmg_official_siege_mode_rules_resolution_v1",
    procedureKind: "evaluate_siege_mode_rules", pieceId: piece.id,
    siegeModeActive: active,
    forbiddenActionTypes: active ? [...SIEGE_FORBIDDEN_ACTIONS] : [],
    profileEligibility,
    siegeProfilesRequireSiegeMode: true,
    nonSiegeProfilesDisabledWhileSiegeMode: true,
    currentOfficialCarrierAvailable: bundle.siegeModeCarrierRegistry.entries.length > 0,
    productionCarrierQuarantined: bundle.siegeModeCarrierRegistry.entries.length === 0,
    mutation: { piecePatches: [], removeBoardTokenIds: [], removeEffectMarkerIds: [] },
    statusStayInPlayDataBundleHash: bundle.bundleHash,
    clientSuppliedPermissionAccepted: false, trainingTruth: false,
  });
}

export function resolveOfficialSiegeModeReserveRemovalV1(input = {}) {
  const { state, bundle } = validate(input);
  const piece = pieceFor(state, input.pieceId);
  if (input.procedureKind !== "remove_siege_mode_on_reserve"
    || piece.isInReserves !== true || piece.isOnField === true
    || piece.isDestroyed === true || !hasStatus(piece, "siege_mode")) {
    fail("SIEGE_MODE_RESERVE_REMOVAL_INVALID", piece.id);
  }
  const statuses = piece.statuses.filter((entry) => statusName(entry) !== "siege_mode");
  const removeEffectMarkerIds = state.board.effectMarkers.filter((marker) => (
    (marker?.targetPieceId === piece.id || marker?.affectedPieceId === piece.id)
      && statusName(marker) === "siege_mode"
  )).map((marker) => nonEmpty(marker.id, "SIEGE_MODE_MARKER_ID_REQUIRED")).sort();
  return result({
    schema: "starcraft_tmg_official_siege_mode_reserve_removal_v1",
    procedureKind: "remove_siege_mode_on_reserve", pieceId: piece.id,
    siegeModeRemoved: true, returnToReservesRemovesStatus: true,
    mutation: { piecePatches: [patch(piece, { statuses })],
      removeBoardTokenIds: [], removeEffectMarkerIds },
    statusStayInPlayDataBundleHash: bundle.bundleHash,
    clientSuppliedMutationAccepted: false, trainingTruth: false,
  });
}

function latestShieldLossEvent(state, pieceId) {
  const events = (state.log || []).flatMap((entry) => entry?.events || []);
  return [...events].reverse().find((event) => (
    (event?.targetPieceId === pieceId || event?.pieceId === pieceId)
      && event?.shieldedLifecycle?.shieldedLost === true
      && event?.shieldedLifecycle?.shieldedAfter === false
  ));
}
function requiresShielded(entry) {
  return object(entry)
    && normalized(entry.requiresStatus || entry.requiredStatus) === "shielded";
}

export function resolveOfficialShieldedDependenciesV1(input = {}) {
  const { state, bundle } = validate(input);
  const piece = pieceFor(state, input.pieceId);
  const event = latestShieldLossEvent(state, piece.id);
  if (input.procedureKind !== "resolve_shielded_dependencies" || !event
    || hasStatus(piece, "shielded")
    || input.triggerEventHash !== hashStarcraftTmgContract(event)) {
    fail("SHIELDED_DEPENDENCY_TRIGGER_INVALID", piece.id);
  }
  const set = {};
  const endedEffects = [];
  for (const field of EFFECT_FIELDS) {
    const entries = Array.isArray(piece[field]) ? piece[field] : [];
    const kept = [];
    entries.forEach((entry, index) => {
      if (requiresShielded(entry)) {
        endedEffects.push({ field, effectId: entryId(entry, field, index),
          effectHash: hashStarcraftTmgContract(entry) });
      } else kept.push(entry);
    });
    if (kept.length !== entries.length) set[field] = kept;
  }
  const removeEffectMarkerIds = state.board.effectMarkers.filter((marker) => (
    (marker?.targetPieceId === piece.id || marker?.affectedPieceId === piece.id)
      && requiresShielded(marker)
  )).map((marker) => nonEmpty(marker.id,
    "SHIELDED_DEPENDENCY_MARKER_ID_REQUIRED")).sort();
  return result({
    schema: "starcraft_tmg_official_shielded_dependency_resolution_v1",
    procedureKind: "resolve_shielded_dependencies", pieceId: piece.id,
    triggerEventHash: input.triggerEventHash,
    shieldLossReason: event.shieldedLifecycle.shieldLossReason,
    endedEffects: endedEffects.sort((left, right) => left.effectId.localeCompare(right.effectId)),
    removeEffectMarkerIds,
    losingShieldedEndsOnlyDependentEffects: true,
    losingShieldedRemovesRemainingHitPoints: false,
    currentNamedDependentAbilityCarrierAvailable:
      bundle.shieldedDependentAbilityRegistry.entries.length > 0,
    mutation: { piecePatches: Object.keys(set).length > 0 ? [patch(piece, set)] : [],
      removeBoardTokenIds: [], removeEffectMarkerIds },
    statusStayInPlayDataBundleHash: bundle.bundleHash,
    clientSuppliedDependencyResultAccepted: false, trainingTruth: false,
  });
}

export function resolveOfficialStatusStayInPlayProcedureV1(input = {}) {
  switch (input.procedureKind) {
    case "reconcile_status_cleanup":
      return resolveOfficialStatusCleanupReconciliationV1(input);
    case "derive_on_creep_state": return resolveOfficialOnCreepStateV1(input);
    case "evaluate_siege_mode_rules": return resolveOfficialSiegeModeRulesV1(input);
    case "remove_siege_mode_on_reserve":
      return resolveOfficialSiegeModeReserveRemovalV1(input);
    case "resolve_shielded_dependencies":
      return resolveOfficialShieldedDependenciesV1(input);
    default: fail("STATUS_STAY_IN_PLAY_PROCEDURE_KIND_INVALID");
  }
}

export function officialStatusStayInPlayProcedureKindsV1() {
  return [...PROCEDURE_KINDS];
}

export function officialSiegeModeForbiddenActionTypesV1() {
  return [...SIEGE_FORBIDDEN_ACTIONS];
}
