import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";

const WORM_RECORD_KEY = "army_units:omega_worm";
export const OFFICIAL_SINGLETON_SUMMON_IDENTITY_POLICY_V1 =
  "official_singleton_summon_nonreused_identity_v1";
const active = piece => piece?.isOnField === true && piece?.isDestroyed !== true
  && Number(piece?.currentModels || 0) > 0;
const corpse = piece => piece?.isOnField === false && piece?.isDestroyed === true
  && Number(piece?.currentModels) === 0
  && (piece.models || []).every(model => model.isOnField === false
    && model.isDestroyed === true);

export function allocateOfficialSingletonSummonPieceIdV1(state, baseId) {
  const occupied = new Set([
    ...(state.pieces || []), ...(state.officialRetiredSingletonPieces || []),
  ].map(piece => piece.id));
  if (!occupied.has(baseId)) return baseId;
  let ordinal = 1;
  while (occupied.has(`${baseId}:summon:${Number(state.round)}:${ordinal}`)) ordinal += 1;
  return `${baseId}:summon:${Number(state.round)}:${ordinal}`;
}

// A legacy summon reused its singleton ID after destruction. Physical state
// has one live incarnation, but Array.find sees the preceding corpse. Archive
// only this proven nonphysical collision, never an ambiguous pair of live units.
// Enumeration/Preview use a private projection; the next accepted transition
// persists the archive and an explicit repair event. Original receipts remain
// byte-for-byte intact, including the erroneous producer's historical state.
export function projectOfficialSingletonSummonRegistryV1(state) {
  const groups = new Map();
  for (const piece of state.pieces || []) {
    const group = groups.get(piece.id) || [];
    group.push(piece);
    groups.set(piece.id, group);
  }
  const retired = new Set();
  const repairs = [];
  for (const [pieceId, group] of groups) {
    if (group.length < 2) continue;
    const live = group.filter(active);
    const dead = group.filter(corpse);
    const actor = live[0];
    const valid = live.length === 1 && dead.length === group.length - 1
      && actor.officialUnitRecordKey === WORM_RECORD_KEY
      && group.every(piece => piece.officialUnitRecordKey === WORM_RECORD_KEY
        && piece.sideKey === actor.sideKey
        && piece.sourceRecordHash === actor.sourceRecordHash
        && piece.officialPayloadHash === actor.officialPayloadHash);
    if (!valid) throw Object.assign(new Error(
      `CURRENT_PRODUCT_PIECE_ID_COLLISION_UNRESOLVED:${pieceId}`),
    { code: "CURRENT_PRODUCT_PIECE_ID_COLLISION_UNRESOLVED", severity: "High" });
    dead.forEach(piece => retired.add(piece));
    repairs.push({
      type: "inactive_singleton_summon_identity_archived",
      pieceId, officialUnitRecordKey: WORM_RECORD_KEY,
      livePieceHash: hashStarcraftTmgContract(actor),
      retiredPieceHashes: dead.map(piece => hashStarcraftTmgContract(piece)),
      physicalBoardUnchanged: true,
      originalAcceptedHistoryPreserved: true,
      trainingTruth: false,
    });
  }
  if (!repairs.length) return { state, repairs };
  return { state: {
    ...state,
    pieces: state.pieces.filter(piece => !retired.has(piece)),
    officialRetiredSingletonPieces: [
      ...(state.officialRetiredSingletonPieces || []), ...retired,
    ],
    officialSingletonSummonIdentityRepairs: [
      ...(state.officialSingletonSummonIdentityRepairs || []), ...repairs,
    ],
  }, repairs };
}
