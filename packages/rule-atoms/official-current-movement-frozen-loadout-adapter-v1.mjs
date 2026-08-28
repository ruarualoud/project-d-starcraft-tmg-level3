import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";

const HASH_PATTERN = /^[a-f0-9]{64}$/u;

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function clone(value) {
  return structuredClone(value);
}

function selectedUpgradeRows(state) {
  if (!Array.isArray(state?.pieces)) fail("CURRENT_MOVEMENT_LOADOUT_PIECES_INVALID");
  return state.pieces.map((piece) => {
    const pieceId = String(piece?.id || "").trim();
    const officialUnitRecordKey = String(piece?.officialUnitRecordKey || "").trim();
    if (!pieceId
      || !officialUnitRecordKey
      || !Array.isArray(piece?.selectedUpgradeNames)
      || piece.selectedUpgradeNames.some((name) => typeof name !== "string" || !name.trim())) {
      fail("CURRENT_MOVEMENT_LOADOUT_ROW_INVALID", pieceId);
    }
    return {
      pieceId,
      officialUnitRecordKey,
      selectedUpgradeNames: [...piece.selectedUpgradeNames].sort(),
    };
  }).sort((left, right) => left.pieceId.localeCompare(right.pieceId));
}

function loadoutHash(rows) {
  return hashStarcraftTmgContract({
    schema: "starcraft_tmg_selected_upgrade_loadout_binding_v1",
    rows,
  });
}

export function createOfficialFrozenNoUpgradeMovementViewV1(state, options = {}) {
  const expectedHash = String(options.selectedUpgradeLoadoutHash || "").trim();
  const rows = selectedUpgradeRows(state);
  const selectedUpgradeLoadoutHash = loadoutHash(rows);
  if (!HASH_PATTERN.test(expectedHash) || expectedHash !== selectedUpgradeLoadoutHash) {
    fail("CURRENT_MOVEMENT_LOADOUT_HASH_MISMATCH");
  }
  const frozenState = clone(state);
  for (const piece of frozenState.pieces) piece.selectedUpgradeNames = [];
  return { frozenState, rows, selectedUpgradeLoadoutHash };
}

export function restoreOfficialMovementLoadoutsV1(stateBefore, frozenStateAfter, options = {}) {
  const expectedHash = String(options.selectedUpgradeLoadoutHash || "").trim();
  const rows = selectedUpgradeRows(stateBefore);
  if (!HASH_PATTERN.test(expectedHash) || loadoutHash(rows) !== expectedHash) {
    fail("CURRENT_MOVEMENT_LOADOUT_HASH_MISMATCH");
  }
  if (!Array.isArray(frozenStateAfter?.pieces)
    || frozenStateAfter.pieces.length !== stateBefore.pieces.length) {
    fail("CURRENT_MOVEMENT_LOADOUT_PIECE_SET_CHANGED");
  }
  const beforeIds = stateBefore.pieces.map((piece) => String(piece.id)).sort();
  const afterIds = frozenStateAfter.pieces.map((piece) => String(piece.id)).sort();
  if (!isDeepStrictEqual(beforeIds, afterIds)) {
    fail("CURRENT_MOVEMENT_LOADOUT_PIECE_SET_CHANGED");
  }
  const restored = clone(frozenStateAfter);
  const byId = new Map(rows.map((row) => [row.pieceId, row.selectedUpgradeNames]));
  for (const piece of restored.pieces) {
    piece.selectedUpgradeNames = clone(byId.get(String(piece.id)) || []);
  }
  return restored;
}
