import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { verifyOfficialUnitDestructionLifecycleDataBundleV1 } from
  "../source-data/official-unit-destruction-lifecycle-data-bundle-v1.mjs";

const PROCEDURE_KINDS = Object.freeze([
  "evaluate_destroyed_unit_return",
  "settle_unit_destruction",
]);
const LOCAL_EFFECT_FIELDS = Object.freeze([
  "abilityEffects", "assaultEffects", "combatEffects", "conditions", "statuses",
  "timedEffects",
]);
const OUTWARD_EFFECT_FIELDS = LOCAL_EFFECT_FIELDS;
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
function validate(input) {
  verifyOfficialUnitDestructionLifecycleDataBundleV1(
    input.unitDestructionLifecycleDataBundle,
  );
  const state = input.state;
  if (!object(state) || !Array.isArray(state.pieces) || !object(state.board)
    || !Array.isArray(state.board.tokens) || !Array.isArray(state.board.effectMarkers)
    || input.rulesOwnedStateRequested !== true
    || input.clientSuppliedMutation !== undefined) {
    fail("UNIT_DESTRUCTION_LIFECYCLE_STATE_INVALID");
  }
  const ids = state.pieces.map((piece) => nonEmpty(piece?.id,
    "UNIT_DESTRUCTION_LIFECYCLE_PIECE_INVALID"));
  if (new Set(ids).size !== ids.length) {
    fail("UNIT_DESTRUCTION_LIFECYCLE_PIECE_DUPLICATE");
  }
  return { state, bundle: input.unitDestructionLifecycleDataBundle };
}
function pieceFor(state, pieceId) {
  const id = nonEmpty(pieceId, "UNIT_DESTRUCTION_LIFECYCLE_PIECE_REQUIRED");
  const piece = state.pieces.find((entry) => entry?.id === id);
  if (!piece) fail("UNIT_DESTRUCTION_LIFECYCLE_PIECE_NOT_FOUND", id);
  return piece;
}
function effectId(value, field, index) {
  if (object(value)) {
    return String(value.id || value.statusEffectHash || value.effectHash
      || `${field}:${index}`);
  }
  return `${field}:${index}:${String(value)}`;
}
function sourcePieceId(value) {
  return object(value)
    ? String(value.sourcePieceId || value.appliedByPieceId || "")
    : "";
}
function localEffectSnapshot(piece) {
  return LOCAL_EFFECT_FIELDS.flatMap((field) => (
    Array.isArray(piece[field])
      ? piece[field].map((entry, index) => ({ field,
        effectId: effectId(entry, field, index),
        effectHash: hashStarcraftTmgContract(entry) }))
      : []
  ));
}
function outwardEffects(state, sourceId) {
  const preserved = [];
  const explicitlyEnding = [];
  const targetPatches = [];
  for (const target of state.pieces) {
    if (target.id === sourceId) continue;
    const set = {};
    for (const field of OUTWARD_EFFECT_FIELDS) {
      if (!Array.isArray(target[field])) continue;
      const kept = [];
      let changed = false;
      target[field].forEach((entry, index) => {
        if (sourcePieceId(entry) !== sourceId) {
          kept.push(entry);
          return;
        }
        const row = { targetPieceId: target.id, field,
          effectId: effectId(entry, field, index),
          effectHash: hashStarcraftTmgContract(entry) };
        if (object(entry) && entry.endsWhenSourceDestroyed === true) {
          explicitlyEnding.push(row);
          changed = true;
        } else {
          preserved.push(row);
          kept.push(entry);
        }
      });
      if (changed) set[field] = kept;
    }
    if (Object.keys(set).length > 0) {
      targetPatches.push({ pieceId: target.id,
        expectedBeforePieceHash: hashStarcraftTmgContract(target), set,
        deleteFields: [] });
    }
  }
  return { preserved: preserved.sort((a, b) => (
    `${a.targetPieceId}:${a.field}:${a.effectId}`
      .localeCompare(`${b.targetPieceId}:${b.field}:${b.effectId}`)
  )), explicitlyEnding: explicitlyEnding.sort((a, b) => (
    `${a.targetPieceId}:${a.field}:${a.effectId}`
      .localeCompare(`${b.targetPieceId}:${b.field}:${b.effectId}`)
  )), targetPatches };
}
function destructionSettled(state, pieceId) {
  return (state.unitDestructionLifecycleHistory || []).some((entry) => (
    entry?.procedureKind === "settle_unit_destruction"
      && entry?.pieceId === pieceId
  ));
}

export function resolveOfficialUnitDestructionSettlementV1(input = {}) {
  const { state, bundle } = validate(input);
  const piece = pieceFor(state, input.pieceId);
  const models = piece.models;
  if (input.procedureKind !== "settle_unit_destruction"
    || !HASH.test(String(input.triggerReceiptHash || ""))
    || !["casualty_resolution", "final_reserve_destruction",
      "rule_effect_resolution"].includes(input.triggerAuthority)
    || !Array.isArray(models) || models.length < 1
    || Number(piece.currentModels) !== 0 || Number(piece.currentSupply) !== 0
    || models.some((model) => model?.isDestroyed !== true
      || model?.isOnField !== false)
    || !Array.isArray(piece.destroyedModelIds)
    || new Set(piece.destroyedModelIds).size !== models.length
    || models.some((model) => !piece.destroyedModelIds.includes(model.id))
    || destructionSettled(state, piece.id)) {
    fail("UNIT_DESTRUCTION_SETTLEMENT_INVALID", piece.id);
  }
  const localEffectsEnded = localEffectSnapshot(piece);
  const removeBoardTokenIds = state.board.tokens.filter((token) => (
    token?.createdByPieceId === piece.id && token?.stayInPlay !== true
  )).map((token) => nonEmpty(token.id,
    "UNIT_DESTRUCTION_TOKEN_ID_REQUIRED")).sort();
  const stayInPlayTokenIds = state.board.tokens.filter((token) => (
    token?.createdByPieceId === piece.id && token?.stayInPlay === true
  )).map((token) => nonEmpty(token.id,
    "UNIT_DESTRUCTION_TOKEN_ID_REQUIRED")).sort();
  const outward = outwardEffects(state, piece.id);
  const localMarkerIds = state.board.effectMarkers.filter((marker) => (
    marker?.affectedPieceId === piece.id || marker?.targetPieceId === piece.id
  )).map((marker) => nonEmpty(marker.id,
    "UNIT_DESTRUCTION_MARKER_ID_REQUIRED"));
  const explicitOutwardMarkerIds = state.board.effectMarkers.filter((marker) => (
    (marker?.sourcePieceId === piece.id || marker?.appliedByPieceId === piece.id)
      && marker?.affectedPieceId !== piece.id && marker?.targetPieceId !== piece.id
      && marker?.endsWhenSourceDestroyed === true
  )).map((marker) => nonEmpty(marker.id,
    "UNIT_DESTRUCTION_MARKER_ID_REQUIRED"));
  const preservedOutwardMarkerIds = state.board.effectMarkers.filter((marker) => (
    (marker?.sourcePieceId === piece.id || marker?.appliedByPieceId === piece.id)
      && marker?.affectedPieceId !== piece.id && marker?.targetPieceId !== piece.id
      && marker?.endsWhenSourceDestroyed !== true
  )).map((marker) => nonEmpty(marker.id,
    "UNIT_DESTRUCTION_MARKER_ID_REQUIRED")).sort();
  const removeEffectMarkerIds = [...new Set([
    ...localMarkerIds, ...explicitOutwardMarkerIds,
  ])].sort();
  const localSet = {
    isDestroyed: true, isOnField: false, isInReserves: false,
    abilitiesActive: false, destructionLifecycleSettled: true,
    ...Object.fromEntries(LOCAL_EFFECT_FIELDS.filter((field) => (
      Array.isArray(piece[field])
    )).map((field) => [field, []])),
  };
  return result({
    schema: "starcraft_tmg_official_unit_destruction_settlement_v1",
    procedureKind: "settle_unit_destruction", pieceId: piece.id,
    sideKey: piece.sideKey, triggerReceiptHash: input.triggerReceiptHash,
    triggerAuthority: input.triggerAuthority,
    lastModelFallen: true, unitDestroyed: true,
    localEffectsEnded, localEffectsEndedImmediately: true,
    removeBoardTokenIds, stayInPlayTokenIds,
    nonStayInPlayCreatedTokensRemoved: true,
    outwardEffectsPreserved: outward.preserved,
    explicitOutwardEffectsEnded: outward.explicitlyEnding,
    outwardEffectsRemainUnlessExplicitlyStatedOtherwise: true,
    removeEffectMarkerIds, preservedOutwardMarkerIds,
    mutation: {
      piecePatches: [{ pieceId: piece.id,
        expectedBeforePieceHash: hashStarcraftTmgContract(piece),
        set: localSet, deleteFields: ["xInches", "yInches"] }],
      outwardPiecePatches: outward.targetPatches,
      removeBoardTokenIds, removeEffectMarkerIds,
    },
    unitDestructionLifecycleDataBundleHash: bundle.bundleHash,
    clientSuppliedMutationAccepted: false, trainingTruth: false,
  });
}

export function resolveOfficialDestroyedUnitReturnRestrictionV1(input = {}) {
  const { state, bundle } = validate(input);
  const piece = pieceFor(state, input.pieceId);
  if (input.procedureKind !== "evaluate_destroyed_unit_return"
    || piece.isDestroyed !== true || Number(piece.currentModels) !== 0
    || !destructionSettled(state, piece.id)) {
    fail("DESTROYED_UNIT_RETURN_QUERY_INVALID", piece.id);
  }
  const atomId = input.specificReturnRuleAtomId;
  if (atomId !== null && atomId !== undefined) {
    if (!bundle.returnRuleRegistry.registeredAtomIds.includes(atomId)) {
      fail("DESTROYED_UNIT_RETURN_RULE_UNREGISTERED", String(atomId));
    }
    fail("DESTROYED_UNIT_RETURN_RULE_EXECUTOR_UNAVAILABLE", String(atomId));
  }
  return result({
    schema: "starcraft_tmg_official_destroyed_unit_return_restriction_v1",
    procedureKind: "evaluate_destroyed_unit_return", pieceId: piece.id,
    canReturnToPlay: false,
    reason: "destroyed_unit_without_registered_specific_return_rule",
    specificRuleRequired: true, specificRuleApplied: false,
    returnRuleRegistryEmptyUntilSlice101: true,
    mutation: { piecePatches: [], outwardPiecePatches: [],
      removeBoardTokenIds: [], removeEffectMarkerIds: [] },
    unitDestructionLifecycleDataBundleHash: bundle.bundleHash,
    trainingTruth: false,
  });
}

export function resolveOfficialUnitDestructionLifecycleProcedureV1(input = {}) {
  switch (input.procedureKind) {
    case "settle_unit_destruction":
      return resolveOfficialUnitDestructionSettlementV1(input);
    case "evaluate_destroyed_unit_return":
      return resolveOfficialDestroyedUnitReturnRestrictionV1(input);
    default: fail("UNIT_DESTRUCTION_LIFECYCLE_PROCEDURE_KIND_INVALID");
  }
}

export function officialUnitDestructionLifecycleProcedureKindsV1() {
  return [...PROCEDURE_KINDS];
}
