import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";

export const OFFICIAL_SUPPLY_LOSS_LEDGER_SCHEMA =
  "starcraft_tmg_official_supply_loss_ledger_v1";

const SIDE_KEYS = Object.freeze(["player1", "player2"]);
const ZERO_HASH = "0".repeat(64);
const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const MAX_ENTRIES_PER_ROUND = 4096;

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  return structuredClone(value);
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}

function positiveRound(value) {
  const round = Number(value);
  if (!Number.isSafeInteger(round) || round < 1) fail("SUPPLY_LOSS_LEDGER_ROUND_INVALID");
  return round;
}

function supply(value, code) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) fail(code, String(value));
  return parsed;
}

function side(value, code) {
  const normalized = String(value || "").trim();
  if (!SIDE_KEYS.includes(normalized)) fail(code, normalized);
  return normalized;
}

function otherSide(sideKey) {
  return sideKey === "player1" ? "player2" : "player1";
}

function entryBody(entry) {
  return without(entry, ["entryHash"]);
}

function ledgerBody(ledger) {
  return without(ledger, ["ledgerHash"]);
}

function classifyCause(events, pieceId, ownerSideKey) {
  const disengage = events.find((event) => (
    event?.type === "disengage_casualty"
      && event.pieceId === pieceId
      && Array.isArray(event.casualtyModelIds)
      && event.casualtyModelIds.length > 0
  ));
  if (disengage) {
    return {
      causeKind: "disengage_removal",
      causalSideKey: ownerSideKey,
      attributionStatus: "unresolved_official_source",
      scoreable: false,
    };
  }
  const coherency = events.find((event) => (
    event?.type === "coherency_casualty"
      && event.pieceId === pieceId
  ));
  if (coherency) {
    return {
      causeKind: "out_of_coherency_removal",
      causalSideKey: ownerSideKey,
      attributionStatus: "unresolved_official_source",
      scoreable: false,
    };
  }
  const attack = events.find((event) => (
    event?.type === "close_combat_attack"
      && event.targetId === pieceId
      && Array.isArray(event.casualtyModelIds)
      && event.casualtyModelIds.length > 0
  ));
  if (attack) {
    const causalSideKey = side(attack.sideKey, "SUPPLY_LOSS_CAUSAL_SIDE_INVALID");
    return {
      causeKind: "opponent_attack_damage",
      causalSideKey,
      attributionStatus: causalSideKey === ownerSideKey
        ? "unresolved_official_source"
        : "exact_opponent_attack_witness",
      scoreable: causalSideKey !== ownerSideKey,
    };
  }
  return {
    causeKind: "unknown_supply_reduction",
    causalSideKey: null,
    attributionStatus: "unresolved_official_source",
    scoreable: false,
  };
}

export function createOfficialSupplyLossLedgerV1(input = {}) {
  const rulesRuntimeHash = String(input.rulesRuntimeHash || "").trim().toLowerCase();
  if (!HASH_PATTERN.test(rulesRuntimeHash)) fail("SUPPLY_LOSS_LEDGER_RUNTIME_HASH_INVALID");
  const body = {
    schema: OFFICIAL_SUPPLY_LOSS_LEDGER_SCHEMA,
    round: positiveRound(input.round),
    rulesRuntimeHash,
    entries: [],
    lossBySide: { player1: 0, player2: 0 },
    scoreableLossCreditedToSide: { player1: 0, player2: 0 },
    headEntryHash: ZERO_HASH,
    witnessStatus: "complete_for_current_executable_supply_mutations",
    attributionPolicy:
      "opponent_attack_exact_only_out_of_coherency_self_friendly_environment_unknown_fail_closed",
    rulesTruth: "rules_owned_round_scoped_supply_delta_ledger",
    trainingTruth: false,
  };
  return deepFreeze({ ...body, ledgerHash: hashStarcraftTmgContract(body) });
}

export function verifyOfficialSupplyLossLedgerV1(ledger, options = {}) {
  if (!object(ledger)
    || ledger.schema !== OFFICIAL_SUPPLY_LOSS_LEDGER_SCHEMA
    || hashStarcraftTmgContract(ledgerBody(ledger)) !== ledger.ledgerHash
    || !Array.isArray(ledger.entries)
    || ledger.entries.length > MAX_ENTRIES_PER_ROUND
    || ledger.trainingTruth !== false) {
    fail("SUPPLY_LOSS_LEDGER_HASH_MISMATCH");
  }
  const round = positiveRound(ledger.round);
  if (options.round !== undefined && round !== positiveRound(options.round)) {
    fail("SUPPLY_LOSS_LEDGER_ROUND_MISMATCH");
  }
  if (options.rulesRuntimeHash !== undefined
    && ledger.rulesRuntimeHash !== String(options.rulesRuntimeHash || "").trim().toLowerCase()) {
    fail("SUPPLY_LOSS_LEDGER_RUNTIME_MISMATCH");
  }
  const lossBySide = { player1: 0, player2: 0 };
  const scoreableLossCreditedToSide = { player1: 0, player2: 0 };
  let previousEntryHash = ZERO_HASH;
  for (let index = 0; index < ledger.entries.length; index += 1) {
    const entry = ledger.entries[index];
    const ownerSideKey = side(entry?.ownerSideKey, "SUPPLY_LOSS_OWNER_SIDE_INVALID");
    const preCurrentSupply = supply(
      entry?.currentSupplyBefore,
      "SUPPLY_LOSS_PRE_SUPPLY_INVALID",
    );
    const postCurrentSupply = supply(
      entry?.currentSupplyAfter,
      "SUPPLY_LOSS_POST_SUPPLY_INVALID",
    );
    const supplyDelta = supply(entry?.supplyDelta, "SUPPLY_LOSS_DELTA_INVALID");
    if (entry.sequence !== index + 1
      || entry.round !== round
      || !String(entry.unitId || "").trim()
      || !String(entry.causalActionHash || "").match(HASH_PATTERN)
      || !String(entry.causalEventsHash || "").match(HASH_PATTERN)
      || entry.previousEntryHash !== previousEntryHash
      || preCurrentSupply <= postCurrentSupply
      || supplyDelta !== preCurrentSupply - postCurrentSupply
      || ![
        "opponent_attack_damage",
        "out_of_coherency_removal",
        "disengage_removal",
        "unknown_supply_reduction",
      ]
        .includes(entry.causeKind)
      || !["exact_opponent_attack_witness", "unresolved_official_source"]
        .includes(entry.attributionStatus)
      || typeof entry.scoreable !== "boolean"
      || hashStarcraftTmgContract(entryBody(entry)) !== entry.entryHash) {
      fail("SUPPLY_LOSS_LEDGER_ENTRY_INVALID", String(index + 1));
    }
    if (entry.causalSideKey !== null) {
      side(entry.causalSideKey, "SUPPLY_LOSS_CAUSAL_SIDE_INVALID");
    }
    if (entry.scoreable === true
      && (entry.attributionStatus !== "exact_opponent_attack_witness"
        || entry.causalSideKey !== otherSide(ownerSideKey))) {
      fail("SUPPLY_LOSS_LEDGER_ATTRIBUTION_INVALID", String(index + 1));
    }
    lossBySide[ownerSideKey] += supplyDelta;
    if (entry.scoreable) scoreableLossCreditedToSide[entry.causalSideKey] += supplyDelta;
    previousEntryHash = entry.entryHash;
  }
  if (hashStarcraftTmgContract(lossBySide) !== hashStarcraftTmgContract(ledger.lossBySide)
    || hashStarcraftTmgContract(scoreableLossCreditedToSide)
      !== hashStarcraftTmgContract(ledger.scoreableLossCreditedToSide)
    || ledger.headEntryHash !== previousEntryHash
    || ledger.witnessStatus !== "complete_for_current_executable_supply_mutations") {
    fail("SUPPLY_LOSS_LEDGER_AGGREGATE_MISMATCH");
  }
  return true;
}

export function recordOfficialSupplyLossesV1(input = {}) {
  const stateBefore = input.stateBefore;
  const stateAfter = input.stateAfter;
  const action = input.action;
  const events = Array.isArray(input.events) ? input.events : [];
  if (!object(stateBefore)
    || !object(stateAfter)
    || !object(action)
    || !Array.isArray(stateBefore.pieces)
    || !Array.isArray(stateAfter.pieces)) {
    fail("SUPPLY_LOSS_TRANSITION_INVALID");
  }
  const round = positiveRound(stateBefore.round);
  if (positiveRound(stateAfter.round) !== round) fail("SUPPLY_LOSS_ROUND_TRANSITION_UNSUPPORTED");
  verifyOfficialSupplyLossLedgerV1(stateBefore.supplyLossLedger, {
    round,
    rulesRuntimeHash: input.rulesRuntimeHash,
  });
  const afterById = new Map(stateAfter.pieces.map((piece) => [piece.id, piece]));
  if (afterById.size !== stateAfter.pieces.length
    || stateAfter.pieces.length !== stateBefore.pieces.length) {
    fail("SUPPLY_LOSS_POST_PIECE_DENOMINATOR_MISMATCH");
  }
  const entries = clone(stateBefore.supplyLossLedger.entries);
  const supplyLossEvents = [];
  let previousEntryHash = stateBefore.supplyLossLedger.headEntryHash;
  for (const beforePiece of stateBefore.pieces) {
    const afterPiece = afterById.get(beforePiece.id);
    if (!afterPiece || afterPiece.sideKey !== beforePiece.sideKey) {
      fail("SUPPLY_LOSS_PIECE_IDENTITY_DRIFT", String(beforePiece.id || ""));
    }
    const currentSupplyBefore = supply(
      beforePiece.currentSupply,
      "SUPPLY_LOSS_PRE_SUPPLY_INVALID",
    );
    const currentSupplyAfter = supply(
      afterPiece.currentSupply,
      "SUPPLY_LOSS_POST_SUPPLY_INVALID",
    );
    if (currentSupplyAfter > currentSupplyBefore) {
      fail("SUPPLY_LOSS_COMBAT_SUPPLY_INCREASE_UNSUPPORTED", beforePiece.id);
    }
    if (currentSupplyAfter === currentSupplyBefore) continue;
    const ownerSideKey = side(beforePiece.sideKey, "SUPPLY_LOSS_OWNER_SIDE_INVALID");
    const cause = classifyCause(events, beforePiece.id, ownerSideKey);
    const entry = {
      schema: "starcraft_tmg_official_supply_loss_entry_v1",
      sequence: entries.length + 1,
      round,
      phase: String(stateBefore.phase || ""),
      unitId: String(beforePiece.id || ""),
      ownerSideKey,
      causalActionHash: hashStarcraftTmgContract(action),
      causalEventsHash: hashStarcraftTmgContract(events),
      causeKind: cause.causeKind,
      causalSideKey: cause.causalSideKey,
      attributionStatus: cause.attributionStatus,
      scoreable: cause.scoreable,
      modelCountBefore: supply(
        beforePiece.currentModels,
        "SUPPLY_LOSS_PRE_MODEL_COUNT_INVALID",
      ),
      modelCountAfter: supply(
        afterPiece.currentModels,
        "SUPPLY_LOSS_POST_MODEL_COUNT_INVALID",
      ),
      currentSupplyBefore,
      currentSupplyAfter,
      supplyDelta: currentSupplyBefore - currentSupplyAfter,
      ruleAtomIds: [...new Set((action.ruleAtomIds || []).map(String))]
        .sort((left, right) => left.localeCompare(right)),
      previousEntryHash,
      trainingTruth: false,
    };
    const resolvedEntry = {
      ...entry,
      entryHash: hashStarcraftTmgContract(entry),
    };
    entries.push(resolvedEntry);
    previousEntryHash = resolvedEntry.entryHash;
    supplyLossEvents.push({
      type: "supply_loss_recorded",
      round,
      unitId: resolvedEntry.unitId,
      ownerSideKey,
      supplyDelta: resolvedEntry.supplyDelta,
      causeKind: resolvedEntry.causeKind,
      attributionStatus: resolvedEntry.attributionStatus,
      scoreable: resolvedEntry.scoreable,
      entryHash: resolvedEntry.entryHash,
      trainingTruth: false,
    });
  }
  const lossBySide = { player1: 0, player2: 0 };
  const scoreableLossCreditedToSide = { player1: 0, player2: 0 };
  for (const entry of entries) {
    lossBySide[entry.ownerSideKey] += entry.supplyDelta;
    if (entry.scoreable) scoreableLossCreditedToSide[entry.causalSideKey] += entry.supplyDelta;
  }
  const body = {
    ...without(stateBefore.supplyLossLedger, [
      "entries",
      "lossBySide",
      "scoreableLossCreditedToSide",
      "headEntryHash",
      "ledgerHash",
    ]),
    entries,
    lossBySide,
    scoreableLossCreditedToSide,
    headEntryHash: previousEntryHash,
  };
  const ledger = deepFreeze({ ...body, ledgerHash: hashStarcraftTmgContract(body) });
  verifyOfficialSupplyLossLedgerV1(ledger, {
    round,
    rulesRuntimeHash: input.rulesRuntimeHash,
  });
  return deepFreeze({ ledger, supplyLossEvents });
}
