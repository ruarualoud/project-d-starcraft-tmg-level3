import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";
import { verifyOfficialGameplayDataBundleV1 } from "../source-data/official-gameplay-data-bundle-v1.mjs";

export const OFFICIAL_ROUND_SUPPLY_STATE_SCHEMA =
  "starcraft_tmg_official_round_supply_state_v1";

const SIDE_KEYS = Object.freeze(["player1", "player2"]);
const HASH_PATTERN = /^[a-f0-9]{64}$/u;

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}

function live(piece) {
  return piece?.isDestroyed !== true && Number(piece?.currentModels || 0) > 0;
}

function exactSupply(piece) {
  const value = Number(piece?.currentSupply);
  if (!Number.isSafeInteger(value) || value < 0) {
    fail("ROUND_SUPPLY_CURRENT_SUPPLY_INVALID", String(piece?.id || ""));
  }
  return value;
}

function runtimeHash(value) {
  const hash = String(value || "").trim();
  if (!HASH_PATTERN.test(hash)) fail("ROUND_SUPPLY_RUNTIME_HASH_REQUIRED");
  return hash;
}

export function createOfficialRoundSupplyStateV1(input = {}) {
  const state = input.state;
  const gameplayDataBundle = input.gameplayDataBundle;
  verifyOfficialGameplayDataBundleV1(gameplayDataBundle);
  if (!object(state) || !Array.isArray(state.pieces)) fail("ROUND_SUPPLY_STATE_INVALID");
  const round = Number(state.round);
  const mission = gameplayDataBundle.missionScoringProfile;
  if (!Number.isSafeInteger(round) || round < 2 || round > mission.gameLengthRounds) {
    fail("ROUND_SUPPLY_ROUND_UNSUPPORTED", String(round));
  }
  const finalRound = round === mission.gameLengthRounds;
  const finitePool = finalRound
    ? null
    : mission.startingSupply + mission.extraSupplyPerRound * (round - 1);
  const onTableSupplyBySide = Object.fromEntries(SIDE_KEYS.map((sideKey) => [
    sideKey,
    state.pieces.filter((piece) => (
      piece?.sideKey === sideKey && piece?.isOnField === true && live(piece)
    )).reduce((sum, piece) => sum + exactSupply(piece), 0),
  ]));
  const reserveSupplyBySide = Object.fromEntries(SIDE_KEYS.map((sideKey) => [
    sideKey,
    state.pieces.filter((piece) => (
      piece?.sideKey === sideKey && piece?.isOnField !== true && live(piece)
    )).reduce((sum, piece) => sum + exactSupply(piece), 0),
  ]));
  if (!finalRound && SIDE_KEYS.some((sideKey) => onTableSupplyBySide[sideKey] > finitePool)) {
    fail("ROUND_SUPPLY_CAP_EXCEEDED");
  }
  const body = {
    schema: OFFICIAL_ROUND_SUPPLY_STATE_SCHEMA,
    round,
    mode: finalRound ? "unlimited" : "finite",
    supplyPoolBySide: finalRound
      ? { player1: null, player2: null }
      : { player1: finitePool, player2: finitePool },
    onTableSupplyBySide,
    reserveSupplyBySide,
    availableSupplyBySide: finalRound
      ? { player1: null, player2: null }
      : Object.fromEntries(SIDE_KEYS.map((sideKey) => [
          sideKey,
          finitePool - onTableSupplyBySide[sideKey],
        ])),
    reserveExcludedFromOnTableSupply: true,
    supplyCapVerified: true,
    gameplayDataBundleHash: gameplayDataBundle.gameplayDataBundleHash,
    missionScoringProfileHash: mission.missionScoringProfileHash,
    rulesRuntimeHash: runtimeHash(input.rulesRuntimeHash),
    rulesTruth: finalRound
      ? "official_final_round_unlimited_supply"
      : "official_mission_supply_escalation_and_available_supply",
    trainingTruth: false,
  };
  return {
    ...body,
    roundSupplyStateHash: hashStarcraftTmgContract(body),
  };
}

export function verifyOfficialRoundSupplyStateV1(input = {}) {
  const observed = input.roundSupplyState;
  if (!object(observed)
    || observed.schema !== OFFICIAL_ROUND_SUPPLY_STATE_SCHEMA
    || hashStarcraftTmgContract(without(observed, ["roundSupplyStateHash"]))
      !== observed.roundSupplyStateHash) {
    fail("ROUND_SUPPLY_STATE_HASH_INVALID");
  }
  const expected = createOfficialRoundSupplyStateV1(input);
  if (!isDeepStrictEqual(observed, expected)) fail("ROUND_SUPPLY_STATE_STALE");
  return true;
}
