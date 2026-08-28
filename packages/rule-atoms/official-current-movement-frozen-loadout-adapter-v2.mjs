import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { getOfficialCombatProfileV1 } from
  "../source-data/official-combat-profile-bundle-v1.mjs";
import { OFFICIAL_SELECTED_UPGRADE_LOADOUT_BINDING_V2_SCHEMA } from
  "./official-start-of-round-executor-v5.mjs";

const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const MARINE_RECORD_KEY = "army_units:marine";
const MEDIC_RECORD_KEY = "army_units:medic";

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function clone(value) {
  return structuredClone(value);
}

function rows(state) {
  if (!Array.isArray(state?.pieces)) fail("CURRENT_MOVEMENT_V2_LOADOUT_PIECES_INVALID");
  return state.pieces.map((piece) => {
    const pieceId = String(piece?.id || "").trim();
    const officialUnitRecordKey = String(piece?.officialUnitRecordKey || "").trim();
    if (!pieceId
      || ![MARINE_RECORD_KEY, MEDIC_RECORD_KEY].includes(officialUnitRecordKey)
      || !Array.isArray(piece?.selectedUpgradeNames)
      || piece.selectedUpgradeNames.some((name) => typeof name !== "string" || !name.trim())) {
      fail("CURRENT_MOVEMENT_V2_LOADOUT_ROW_INVALID", pieceId);
    }
    return {
      pieceId,
      officialUnitRecordKey,
      selectedUpgradeNames: [...piece.selectedUpgradeNames].sort(),
      sourceRecordHash: piece.sourceRecordHash,
      officialPayloadHash: piece.officialPayloadHash,
      name: piece.name,
      currentSupply: Number(piece.currentSupply),
    };
  }).sort((left, right) => left.pieceId.localeCompare(right.pieceId));
}

function publicRows(value) {
  return value.map((row) => ({
    pieceId: row.pieceId,
    officialUnitRecordKey: row.officialUnitRecordKey,
    selectedUpgradeNames: [...row.selectedUpgradeNames],
  }));
}

function loadoutHash(value) {
  return hashStarcraftTmgContract({
    schema: OFFICIAL_SELECTED_UPGRADE_LOADOUT_BINDING_V2_SCHEMA,
    rows: publicRows(value),
  });
}

export function createOfficialFrozenMarineMovementViewV2(state, options = {}) {
  const expectedHash = String(options.selectedUpgradeLoadoutHash || "").trim();
  const loadoutRows = rows(state);
  const selectedUpgradeLoadoutHash = loadoutHash(loadoutRows);
  if (!HASH_PATTERN.test(expectedHash) || expectedHash !== selectedUpgradeLoadoutHash) {
    fail("CURRENT_MOVEMENT_V2_LOADOUT_HASH_MISMATCH");
  }
  const marineProfile = getOfficialCombatProfileV1(
    state.officialGameplayDataBundle.combatProfileBundle,
    MARINE_RECORD_KEY,
  );
  const frozenState = clone(state);
  for (const piece of frozenState.pieces) {
    piece.selectedUpgradeNames = [];
    if (piece.officialUnitRecordKey !== MEDIC_RECORD_KEY) continue;
    piece.name = marineProfile.unitName;
    piece.officialUnitRecordKey = MARINE_RECORD_KEY;
    piece.sourceRecordHash = marineProfile.sourceRecordHash;
    piece.officialPayloadHash = marineProfile.payloadHash;
  }
  return { frozenState, rows: loadoutRows, selectedUpgradeLoadoutHash };
}

export function restoreOfficialMovementPiecesV2(stateBefore, frozenStateAfter, options = {}) {
  const expectedHash = String(options.selectedUpgradeLoadoutHash || "").trim();
  const loadoutRows = rows(stateBefore);
  if (!HASH_PATTERN.test(expectedHash) || loadoutHash(loadoutRows) !== expectedHash) {
    fail("CURRENT_MOVEMENT_V2_LOADOUT_HASH_MISMATCH");
  }
  if (!Array.isArray(frozenStateAfter?.pieces)
    || frozenStateAfter.pieces.length !== stateBefore.pieces.length) {
    fail("CURRENT_MOVEMENT_V2_PIECE_SET_CHANGED");
  }
  const beforeIds = stateBefore.pieces.map((piece) => String(piece.id)).sort();
  const afterIds = frozenStateAfter.pieces.map((piece) => String(piece.id)).sort();
  if (!isDeepStrictEqual(beforeIds, afterIds)) {
    fail("CURRENT_MOVEMENT_V2_PIECE_SET_CHANGED");
  }
  const restored = clone(frozenStateAfter);
  const byId = new Map(loadoutRows.map((row) => [row.pieceId, row]));
  for (const piece of restored.pieces) {
    const row = byId.get(String(piece.id));
    if (!row) fail("CURRENT_MOVEMENT_V2_PIECE_SET_CHANGED", piece.id);
    piece.selectedUpgradeNames = clone(row.selectedUpgradeNames);
    if (row.officialUnitRecordKey !== MEDIC_RECORD_KEY) continue;
    piece.name = row.name;
    piece.officialUnitRecordKey = row.officialUnitRecordKey;
    piece.sourceRecordHash = row.sourceRecordHash;
    piece.officialPayloadHash = row.officialPayloadHash;
    piece.currentSupply = row.currentSupply;
  }
  return restored;
}
