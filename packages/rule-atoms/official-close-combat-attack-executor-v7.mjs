import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  createOfficialAttackProfileCatalogueV2,
  getOfficialAttackProfileV2,
} from "../source-data/official-attack-profile-catalogue-v2.mjs";
import { getOfficialCombatProfileV1 } from
  "../source-data/official-combat-profile-bundle-v1.mjs";
import { verifyOfficialGameplayDataBundleV1 } from
  "../source-data/official-gameplay-data-bundle-v1.mjs";
import { createOfficialCriticalHitResolutionKernelV2 } from
  "./official-critical-hit-resolution-kernel-v2.mjs";
import {
  applyOfficialCloseCombatAttackV6,
  enumerateOfficialCloseCombatAttackV6,
  instantiateOfficialCloseCombatAttackV6,
  OFFICIAL_CLOSE_COMBAT_ATTACK_V6_DECLINE_ACTION_ATOM_IDS,
  OFFICIAL_CLOSE_COMBAT_ATTACK_V6_EXECUTOR_ATOM_IDS,
  OFFICIAL_CLOSE_COMBAT_ATTACK_V6_EXECUTOR_ID,
  OFFICIAL_CLOSE_COMBAT_ATTACK_V6_EXECUTOR_VERSION,
  OFFICIAL_CLOSE_COMBAT_ATTACK_V6_LEGACY_MULTI_MOVE_ACTION_ATOM_IDS,
  OFFICIAL_CLOSE_COMBAT_ATTACK_V6_MOVE_ACTION_ATOM_IDS,
  OFFICIAL_CLOSE_COMBAT_ATTACK_V6_PARAMETER_KIND,
  OFFICIAL_CLOSE_COMBAT_ATTACK_V6_SINGLE_MOVE_ACTION_ATOM_IDS,
} from "./official-close-combat-attack-executor-v6.mjs";
import { deriveOfficialEngagementGraphV2 } from
  "./official-engagement-graph-v2.mjs";
import {
  OFFICIAL_GUARDIAN_SHELL_DODGE_SOURCE,
  OFFICIAL_POWER_FIELD_SOURCE_RECORD_HASH,
} from "./official-dodge-resolution-kernel-v1.mjs";
import {
  recordOfficialSupplyLossesV1,
  verifyOfficialSupplyLossLedgerV1,
} from "./official-supply-loss-ledger-v1.mjs";

export const OFFICIAL_CLOSE_COMBAT_ATTACK_V7_EXECUTOR_ID =
  "authority.close-combat-attack-v7";
export const OFFICIAL_CLOSE_COMBAT_ATTACK_V7_EXECUTOR_VERSION = "7.0.0";
export const OFFICIAL_CLOSE_COMBAT_ATTACK_V7_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_CLOSE_COMBAT_ATTACK_V7_PARAMETER_KIND =
  OFFICIAL_CLOSE_COMBAT_ATTACK_V6_PARAMETER_KIND;
export const OFFICIAL_DECLARE_FIGHT_ACTION_TYPE = "declare_fight";
export const OFFICIAL_USE_REACTION_ACTION_TYPE = "use_reaction";
export const OFFICIAL_PASS_REACTION_ACTION_TYPE = "pass_reaction";
export const OFFICIAL_RESOLVE_FIGHT_ACTION_TYPE = "resolve_fight";

export const OFFICIAL_CLOSE_COMBAT_ATTACK_V7_NEW_ATOM_IDS = Object.freeze([
  "rule-atom:exhausted-card-lockout-until-refresh",
  "rule-atom:per-activation-reaction-limit",
  "rule-atom:reaction-ability-definition",
  "rule-atom:reaction-exact-trigger-declaration-window",
  "rule-atom:singleton:core-10-1-ability-name-field:c02fa0381298",
  "rule-atom:singleton:core-10-1-ability-type-field:37976209d287",
  "rule-atom:singleton:core-10-1-all-requirements-must-be-met:792ea9ae989a",
  "rule-atom:singleton:core-10-1-phase-limitation-field:ef171a00c957",
  "rule-atom:singleton:core-10-1-timing-and-phase-requirements:a052e695b8c0",
  "rule-atom:singleton:core-10-4-defined-trigger-response:b8da549a490a",
  "rule-atom:singleton:core-10-4-missed-window-no-retroactive-use:c1b00cada910",
  "rule-atom:singleton:core-10-5-1-exhausted-card-state:9dbfd7af218d",
  "rule-atom:singleton:core-10-5-2-card-exhaustion-uses:9155ae47ce05",
  "rule-atom:singleton:core-10-5-2-ready-and-exhausted-states:40daf5aeba3d",
  "rule-atom:singleton:core-10-5-card-type-resource-and-ability-fields:919da998bc2a",
  "rule-atom:singleton:core-11-dodge-surge-reduction:4e101fc93566",
  "rule-atom:singleton:core-11-reaction-ability-trigger:cb3b01166414",
  "rule-atom:singleton:core-11-ready-card-capabilities:ddb3761699e5",
  "rule-atom:singleton:core-11-ready-card-definition:6fb6b2aa1ca8",
  "rule-atom:tactical-card-special-ability-field",
].sort((left, right) => left.localeCompare(right)));
export const OFFICIAL_CLOSE_COMBAT_ATTACK_V7_EXECUTOR_ATOM_IDS = Object.freeze([
  ...new Set([
    ...OFFICIAL_CLOSE_COMBAT_ATTACK_V6_EXECUTOR_ATOM_IDS,
    ...OFFICIAL_CLOSE_COMBAT_ATTACK_V7_NEW_ATOM_IDS,
  ]),
].sort((left, right) => left.localeCompare(right)));
export const OFFICIAL_CLOSE_COMBAT_ATTACK_V7_REACTION_ACTION_ATOM_IDS =
  OFFICIAL_CLOSE_COMBAT_ATTACK_V7_EXECUTOR_ATOM_IDS;
export const OFFICIAL_CLOSE_COMBAT_ATTACK_V7_DECLINE_ACTION_ATOM_IDS =
  OFFICIAL_CLOSE_COMBAT_ATTACK_V6_DECLINE_ACTION_ATOM_IDS;
export const OFFICIAL_CLOSE_COMBAT_ATTACK_V7_SINGLE_MOVE_ACTION_ATOM_IDS =
  OFFICIAL_CLOSE_COMBAT_ATTACK_V6_SINGLE_MOVE_ACTION_ATOM_IDS;
export const OFFICIAL_CLOSE_COMBAT_ATTACK_V7_LEGACY_MULTI_MOVE_ACTION_ATOM_IDS =
  OFFICIAL_CLOSE_COMBAT_ATTACK_V6_LEGACY_MULTI_MOVE_ACTION_ATOM_IDS;
export const OFFICIAL_CLOSE_COMBAT_ATTACK_V7_MOVE_ACTION_ATOM_IDS =
  OFFICIAL_CLOSE_COMBAT_ATTACK_V6_MOVE_ACTION_ATOM_IDS;

const SIDE_KEYS = Object.freeze(["player1", "player2"]);
const KERRIGAN_RECORD_KEY = "army_units:kerrigan";
const MARINE_RECORD_KEY = "army_units:marine";
const POWER_FIELD_RECORD_KEY = "tactical_cards:power_field";
const CURRENT_SOURCE_SNAPSHOT_HASH =
  "2407d2536278776692c9116cb74c4147e15f2aa6ff9af9204141e5620220bd78";
const CURRENT_DATASET_HASH =
  "40ba72534a2165131288ec77ccf67984baf5f740e58c4f94283b46137a54757a";
const PENDING_SCHEMA = "starcraft_tmg_guardian_shell_attack_window_v1";
const REACTION_LEDGER_SCHEMA = "starcraft_tmg_reaction_usage_ledger_v1";
const KERNEL = createOfficialCriticalHitResolutionKernelV2();
const HASH_PATTERN = /^[a-f0-9]{64}$/u;

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  return structuredClone(value);
}

function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}

function otherSide(sideKey) {
  if (sideKey === "player1") return "player2";
  if (sideKey === "player2") return "player1";
  fail("CLOSE_COMBAT_ATTACK_V7_SIDE_REQUIRED");
}

function actionFromCandidate(candidate) {
  return without(candidate, ["isEnabled", "disabledReason", "score", "details"]);
}

function historicalLineage(action) {
  if (action.closeRanksMode !== "move") {
    return OFFICIAL_CLOSE_COMBAT_ATTACK_V7_DECLINE_ACTION_ATOM_IDS;
  }
  if (action.closeRanksPlan?.schemaVersion
    === "starcraft_tmg_out_of_coherency_close_ranks_plan_v1") {
    return OFFICIAL_CLOSE_COMBAT_ATTACK_V7_MOVE_ACTION_ATOM_IDS;
  }
  if (Array.isArray(action.closeRanksPlan?.placementSequence)) {
    return OFFICIAL_CLOSE_COMBAT_ATTACK_V7_LEGACY_MULTI_MOVE_ACTION_ATOM_IDS;
  }
  return OFFICIAL_CLOSE_COMBAT_ATTACK_V7_SINGLE_MOVE_ACTION_ATOM_IDS;
}

function toV7HistoricalAction(candidate) {
  return {
    ...clone(candidate),
    ruleAtomIds: [...historicalLineage(candidate)],
    executorId: OFFICIAL_CLOSE_COMBAT_ATTACK_V7_EXECUTOR_ID,
    executorVersion: OFFICIAL_CLOSE_COMBAT_ATTACK_V7_EXECUTOR_VERSION,
    details: {
      ...(candidate.details || {}),
      executorPath: "historical_v6_delegate",
      delegatedExecutorId: OFFICIAL_CLOSE_COMBAT_ATTACK_V6_EXECUTOR_ID,
      delegatedExecutorVersion: OFFICIAL_CLOSE_COMBAT_ATTACK_V6_EXECUTOR_VERSION,
      trainingTruth: false,
    },
  };
}

function toV6Action(action) {
  return {
    ...clone(action),
    ruleAtomIds: [...historicalLineage(action)],
    executorId: OFFICIAL_CLOSE_COMBAT_ATTACK_V6_EXECUTOR_ID,
    executorVersion: OFFICIAL_CLOSE_COMBAT_ATTACK_V6_EXECUTOR_VERSION,
  };
}

function toV7Domain(domain) {
  const body = {
    ...without(clone(domain), ["domainId"]),
    executorId: OFFICIAL_CLOSE_COMBAT_ATTACK_V7_EXECUTOR_ID,
    executorVersion: OFFICIAL_CLOSE_COMBAT_ATTACK_V7_EXECUTOR_VERSION,
  };
  return { ...body, domainId: `sc-domain-${hashStarcraftTmgContract(body)}` };
}

function toV6Domain(domain) {
  const body = {
    ...without(clone(domain), ["domainId"]),
    executorId: OFFICIAL_CLOSE_COMBAT_ATTACK_V6_EXECUTOR_ID,
    executorVersion: OFFICIAL_CLOSE_COMBAT_ATTACK_V6_EXECUTOR_VERSION,
  };
  return { ...body, domainId: `sc-domain-${hashStarcraftTmgContract(body)}` };
}

function runtimeHash(matchBinding) {
  const value = String(matchBinding?.rulesRuntimeBinding?.runtimeHash || "").trim();
  if (!HASH_PATTERN.test(value)) fail("CLOSE_COMBAT_ATTACK_V7_RUNTIME_BINDING_REQUIRED");
  return value;
}

function latestBindings(state, matchBinding) {
  const gameplayDataBundle = state?.officialGameplayDataBundle;
  verifyOfficialGameplayDataBundleV1(gameplayDataBundle);
  if (gameplayDataBundle.sourceSnapshotHash !== CURRENT_SOURCE_SNAPSHOT_HASH
    || gameplayDataBundle.normalizedDatasetHash !== CURRENT_DATASET_HASH) {
    fail("CLOSE_COMBAT_ATTACK_V7_LATEST_DATA_REQUIRED");
  }
  if (!object(matchBinding)
    || hashStarcraftTmgContract(gameplayDataBundle) !== matchBinding.dataSnapshotHash) {
    fail("CLOSE_COMBAT_ATTACK_V7_DATA_SNAPSHOT_MISMATCH");
  }
  const boundRuntimeHash = runtimeHash(matchBinding);
  verifyOfficialSupplyLossLedgerV1(state.supplyLossLedger, {
    round: Number(state.round || 1),
    rulesRuntimeHash: boundRuntimeHash,
  });
  const attackProfileCatalogue = createOfficialAttackProfileCatalogueV2({
    previousCatalogue: gameplayDataBundle.attackProfileCatalogue,
  });
  return { gameplayDataBundle, attackProfileCatalogue, boundRuntimeHash };
}

function activationKey(state, attackerId) {
  return `${Number(state.round || 1)}:${state.phase}:${attackerId}`;
}

function verifyReactionLedger(value, round) {
  if (value === undefined) return { entries: [] };
  if (!object(value)
    || value.schema !== REACTION_LEDGER_SCHEMA
    || value.round !== round
    || !Array.isArray(value.entries)
    || value.ledgerHash !== hashStarcraftTmgContract(without(value, ["ledgerHash"]))) {
    fail("REACTION_USAGE_LEDGER_INVALID");
  }
  const keys = new Set();
  for (const entry of value.entries) {
    const key = `${entry?.activationKey}:${entry?.sideKey}`;
    if (!String(entry?.activationKey || "")
      || !SIDE_KEYS.includes(entry?.sideKey)
      || entry.abilityName !== "Guardian Shell"
      || !String(entry.cardId || "")
      || !String(entry.targetId || "")
      || !HASH_PATTERN.test(String(entry.pendingAttackHash || ""))
      || keys.has(key)) {
      fail("REACTION_USAGE_LEDGER_INVALID");
    }
    keys.add(key);
  }
  return value;
}

function reactionAlreadyUsed(state, key, sideKey) {
  return verifyReactionLedger(state.reactionUsage, Number(state.round || 1)).entries
    .some((entry) => entry.activationKey === key && entry.sideKey === sideKey);
}

function recordReaction(state, input) {
  const existing = verifyReactionLedger(
    state.reactionUsage,
    Number(state.round || 1),
  );
  if (existing.entries.some((entry) => (
    entry.activationKey === input.activationKey && entry.sideKey === input.sideKey
  ))) {
    fail("REACTION_PER_ACTIVATION_LIMIT_REACHED");
  }
  const body = {
    schema: REACTION_LEDGER_SCHEMA,
    round: Number(state.round || 1),
    entries: [...clone(existing.entries), {
      activationKey: input.activationKey,
      sideKey: input.sideKey,
      abilityName: "Guardian Shell",
      cardId: input.cardId,
      targetId: input.targetId,
      pendingAttackHash: input.pendingAttackHash,
    }],
    trainingTruth: false,
  };
  state.reactionUsage = { ...body, ledgerHash: hashStarcraftTmgContract(body) };
}

function guardianCardStatus(state, sideKey) {
  if (!object(state.cardResources)
    || !SIDE_KEYS.every((key) => Array.isArray(state.cardResources[key]))) {
    return { status: "absent", card: null };
  }
  const cards = state.cardResources[sideKey].filter((card) => (
    card?.officialCardRecordKey === POWER_FIELD_RECORD_KEY
  ));
  if (cards.length === 0) return { status: "absent", card: null };
  if (cards.length !== 1) fail("GUARDIAN_SHELL_CARD_SCOPE_INVALID");
  const card = cards[0];
  const expectedFace = card.readiness === "ready" ? "up"
    : card.readiness === "exhausted" ? "down" : "";
  if (!String(card.id || "")
    || card.sideKey !== sideKey
    || card.cardKind !== "tactical"
    || card.sourceRecordHash !== OFFICIAL_POWER_FIELD_SOURCE_RECORD_HASH
    || card.face !== expectedFace
    || !Array.isArray(card.activeEffects)
    || card.activeEffects.length !== 0) {
    fail("GUARDIAN_SHELL_CARD_STATE_INVALID");
  }
  return { status: card.readiness, card };
}

function exactCriticalCandidate(state, sideKey, matchBinding) {
  const candidates = enumerateOfficialCloseCombatAttackV6(state, {
    sideKey,
    matchBinding,
  }).candidates;
  return candidates.find((candidate) => {
    const piece = state.pieces.find((row) => row.id === candidate.pieceId);
    const target = state.pieces.find((row) => row.id === candidate.targetId);
    return piece?.officialUnitRecordKey === KERRIGAN_RECORD_KEY
      && target?.officialUnitRecordKey === MARINE_RECORD_KEY
      && candidate.weaponName === "Blades"
      && candidate.closeRanksMode === "decline";
  }) || null;
}

function reactionEligible(state, candidate) {
  const target = state.pieces.find((piece) => piece.id === candidate.targetId);
  if (target?.sideKey !== otherSide(candidate.sideKey)
    || target.combatTag !== "ground"
    || target.isOnField !== true
    || target.isDestroyed === true) {
    fail("GUARDIAN_SHELL_TARGET_INVALID");
  }
  const status = guardianCardStatus(state, target.sideKey);
  if (status.status !== "ready") return null;
  const key = activationKey(state, candidate.pieceId);
  if (reactionAlreadyUsed(state, key, target.sideKey)) return null;
  return { card: status.card, target, activationKey: key };
}

function declareAction(candidate) {
  return {
    actionType: OFFICIAL_DECLARE_FIGHT_ACTION_TYPE,
    sideKey: candidate.sideKey,
    phase: "combat",
    pieceId: candidate.pieceId,
    targetId: candidate.targetId,
    weaponName: candidate.weaponName,
    closeRanksMode: "decline",
    chance: {
      kind: "fixed_roll_sequence",
      faces: 6,
      count: 6,
      layout: { hit: 6, armour: 0, evade: 0, surge: 0 },
      revealOrder: ["hit"],
    },
    ruleAtomIds: [...OFFICIAL_CLOSE_COMBAT_ATTACK_V7_REACTION_ACTION_ATOM_IDS],
    executorId: OFFICIAL_CLOSE_COMBAT_ATTACK_V7_EXECUTOR_ID,
    executorVersion: OFFICIAL_CLOSE_COMBAT_ATTACK_V7_EXECUTOR_VERSION,
  };
}

function pendingBody(input) {
  return {
    schema: PENDING_SCHEMA,
    stage: input.stage,
    round: input.round,
    phase: "combat",
    activationKey: input.activationKey,
    attackerSideKey: input.attackerSideKey,
    responderSideKey: input.responderSideKey,
    pieceId: input.pieceId,
    targetId: input.targetId,
    weaponName: "Blades",
    cardId: input.cardId,
    cardRecordKey: POWER_FIELD_RECORD_KEY,
    cardSourceRecordHash: OFFICIAL_POWER_FIELD_SOURCE_RECORD_HASH,
    baseV6Action: clone(input.baseV6Action),
    hitRolls: [...input.hitRolls],
    hits: input.hits,
    declarationActionHash: input.declarationActionHash,
    previousPendingAttackHash: input.previousPendingAttackHash || null,
    decision: input.decision || null,
    targetDodge: input.targetDodge ? clone(input.targetDodge) : null,
    timing: "after_hit_before_resolve_surge_and_armour_roll",
    trainingTruth: false,
  };
}

function createPending(input) {
  const body = pendingBody(input);
  return { ...body, pendingAttackHash: hashStarcraftTmgContract(body) };
}

function verifyPending(state) {
  const pending = state?.pendingAttack;
  if (!object(pending)
    || pending.schema !== PENDING_SCHEMA
    || pending.round !== Number(state.round || 1)
    || pending.phase !== "combat"
    || pending.weaponName !== "Blades"
    || pending.timing !== "after_hit_before_resolve_surge_and_armour_roll"
    || pending.trainingTruth !== false
    || !["reaction_open", "reaction_decided"].includes(pending.stage)
    || !SIDE_KEYS.includes(pending.attackerSideKey)
    || pending.responderSideKey !== otherSide(pending.attackerSideKey)
    || !Array.isArray(pending.hitRolls)
    || pending.hitRolls.length !== 6
    || !Number.isSafeInteger(pending.hits)
    || pending.hits <= 0
    || pending.pendingAttackHash
      !== hashStarcraftTmgContract(without(pending, ["pendingAttackHash"]))) {
    fail("GUARDIAN_SHELL_PENDING_ATTACK_INVALID");
  }
  if (pending.stage === "reaction_open"
    && (pending.decision !== null || pending.targetDodge !== null)) {
    fail("GUARDIAN_SHELL_PENDING_ATTACK_INVALID");
  }
  if (pending.stage === "reaction_decided"
    && !["guardian_shell", "pass"].includes(pending.decision)) {
    fail("GUARDIAN_SHELL_PENDING_ATTACK_INVALID");
  }
  return pending;
}

function reactionActions(state, options) {
  const pending = verifyPending(state);
  const sideKey = String(options.sideKey || "");
  if (pending.stage === "reaction_open") {
    if (sideKey !== pending.responderSideKey) return [];
    const rows = [];
    let useDisabledReason = "";
    try {
      const card = guardianCardStatus(state, sideKey).card;
      if (!card || card.id !== pending.cardId || card.readiness !== "ready") {
        fail("GUARDIAN_SHELL_CARD_NOT_READY");
      }
      if (reactionAlreadyUsed(state, pending.activationKey, sideKey)) {
        fail("REACTION_PER_ACTIVATION_LIMIT_REACHED");
      }
    } catch (error) {
      useDisabledReason = String(error?.message || error).split(":")[0];
    }
    if (!useDisabledReason || options.includeDisabled === true) {
      rows.push({
        actionType: OFFICIAL_USE_REACTION_ACTION_TYPE,
        sideKey,
        phase: "combat",
        pendingAttackHash: pending.pendingAttackHash,
        abilityName: "Guardian Shell",
        cardId: pending.cardId,
        targetId: pending.targetId,
        chance: null,
        ruleAtomIds: [...OFFICIAL_CLOSE_COMBAT_ATTACK_V7_REACTION_ACTION_ATOM_IDS],
        executorId: OFFICIAL_CLOSE_COMBAT_ATTACK_V7_EXECUTOR_ID,
        executorVersion: OFFICIAL_CLOSE_COMBAT_ATTACK_V7_EXECUTOR_VERSION,
        isEnabled: !useDisabledReason,
        disabledReason: useDisabledReason,
        score: useDisabledReason ? 0 : 240,
        details: {
          trigger: "before_friendly_ground_unit_armour_roll",
          dodgeReduction: 2,
          cardWillExhaust: true,
          trainingTruth: false,
        },
      });
    }
    rows.push({
      actionType: OFFICIAL_PASS_REACTION_ACTION_TYPE,
      sideKey,
      phase: "combat",
      pendingAttackHash: pending.pendingAttackHash,
      targetId: pending.targetId,
      chance: null,
      ruleAtomIds: [...OFFICIAL_CLOSE_COMBAT_ATTACK_V7_REACTION_ACTION_ATOM_IDS],
      executorId: OFFICIAL_CLOSE_COMBAT_ATTACK_V7_EXECUTOR_ID,
      executorVersion: OFFICIAL_CLOSE_COMBAT_ATTACK_V7_EXECUTOR_VERSION,
      isEnabled: true,
      disabledReason: "",
      score: 1,
      details: { triggerDeclined: true, trainingTruth: false },
    });
    return rows;
  }
  if (sideKey !== pending.attackerSideKey) return [];
  return [{
    actionType: OFFICIAL_RESOLVE_FIGHT_ACTION_TYPE,
    sideKey,
    phase: "combat",
    pendingAttackHash: pending.pendingAttackHash,
    pieceId: pending.pieceId,
    targetId: pending.targetId,
    weaponName: pending.weaponName,
    chance: {
      kind: "fixed_roll_sequence",
      faces: 6,
      count: 6,
      layout: { hit: 0, armour: 6, evade: 0, surge: 0 },
      revealOrder: ["armour"],
    },
    ruleAtomIds: [...OFFICIAL_CLOSE_COMBAT_ATTACK_V7_REACTION_ACTION_ATOM_IDS],
    executorId: OFFICIAL_CLOSE_COMBAT_ATTACK_V7_EXECUTOR_ID,
    executorVersion: OFFICIAL_CLOSE_COMBAT_ATTACK_V7_EXECUTOR_VERSION,
    isEnabled: true,
    disabledReason: "",
    score: 230,
    details: {
      reactionDecision: pending.decision,
      dodgeReduction: pending.targetDodge?.reduction || 0,
      trainingTruth: false,
    },
  }];
}

export function isOfficialGuardianShellAttackPendingV1(state) {
  return object(state?.pendingAttack) && state.pendingAttack.schema === PENDING_SCHEMA;
}

export function enumerateOfficialCloseCombatAttackV7(state, options = {}) {
  if (!object(state) || !Array.isArray(state.pieces) || !object(state.players)) {
    fail("CLOSE_COMBAT_ATTACK_V7_STATE_INVALID");
  }
  if (isOfficialGuardianShellAttackPendingV1(state)) {
    return { candidates: reactionActions(state, options), parameterDomains: [] };
  }
  const sideKey = String(options.sideKey || state.activeSideKey || "").trim();
  if (!SIDE_KEYS.includes(sideKey)) fail("CLOSE_COMBAT_ATTACK_V7_SIDE_REQUIRED");
  const historical = enumerateOfficialCloseCombatAttackV6(state, options);
  let critical;
  try {
    latestBindings(state, options.matchBinding);
    critical = exactCriticalCandidate(state, sideKey, options.matchBinding);
  } catch (error) {
    if (options.includeDisabled !== true) {
      return { candidates: [], parameterDomains: [] };
    }
    const disabledReason = String(error?.message || error).split(":")[0];
    return {
      candidates: historical.candidates.map((candidate) => ({
        ...toV7HistoricalAction(candidate),
        chance: null,
        isEnabled: false,
        disabledReason,
        score: 0,
        details: {
          rulesTruth: "official_close_combat_v7_latest_data_fail_closed",
          trainingTruth: false,
        },
      })),
      parameterDomains: [],
    };
  }
  const candidates = [];
  for (const candidate of historical.candidates) {
    if (!critical
      || candidate.pieceId !== critical.pieceId
      || candidate.targetId !== critical.targetId
      || candidate.weaponName !== critical.weaponName) {
      candidates.push(toV7HistoricalAction(candidate));
      continue;
    }
    let eligible = null;
    let disabledReason = "";
    try {
      eligible = reactionEligible(state, candidate);
    } catch (error) {
      disabledReason = String(error?.message || error).split(":")[0];
    }
    if (disabledReason && options.includeDisabled !== true) continue;
    if (!eligible && !disabledReason) {
      candidates.push(toV7HistoricalAction(candidate));
      continue;
    }
    const declared = declareAction(candidate);
    candidates.push({
      ...declared,
      ...(disabledReason ? { chance: null } : {}),
      isEnabled: !disabledReason,
      disabledReason,
      score: disabledReason ? 0 : 225,
      details: {
        sourceRule:
          "official_power_field_guardian_shell_before_armour_roll_and_dodge_2",
        triggerWindow: "after_hit_before_resolve_surge_and_armour_roll",
        responderSideKey: candidate.targetId
          ? state.pieces.find((piece) => piece.id === candidate.targetId)?.sideKey
          : "",
        powerFieldSourceRecordHash: OFFICIAL_POWER_FIELD_SOURCE_RECORD_HASH,
        dodgeKernelHash: KERNEL.descriptor.dodgeKernelHash,
        criticalHitKernelHash: KERNEL.descriptor.kernelHash,
        rulesTruth: "official_guardian_shell_reaction_window_subset",
        trainingTruth: false,
      },
    });
  }
  return {
    candidates: candidates.sort((left, right) => (
      `${left.actionType}:${left.pieceId || ""}:${left.targetId || ""}`.localeCompare(
        `${right.actionType}:${right.pieceId || ""}:${right.targetId || ""}`,
      )
    )),
    parameterDomains: historical.parameterDomains.map(toV7Domain),
  };
}

export function instantiateOfficialCloseCombatAttackV7(
  state,
  domain,
  parameters,
  options = {},
) {
  if (!object(domain)
    || domain.executorId !== OFFICIAL_CLOSE_COMBAT_ATTACK_V7_EXECUTOR_ID
    || domain.executorVersion !== OFFICIAL_CLOSE_COMBAT_ATTACK_V7_EXECUTOR_VERSION
    || isOfficialGuardianShellAttackPendingV1(state)) {
    fail("CLOSE_COMBAT_ATTACK_V7_PARAMETER_DOMAIN_INVALID");
  }
  const previous = instantiateOfficialCloseCombatAttackV6(
    state,
    toV6Domain(domain),
    parameters,
    options,
  );
  const result = clone(previous);
  result.action = actionFromCandidate(toV7HistoricalAction(previous.action));
  result.rulesTruth = "official_close_combat_v6_delegated_by_v7";
  result.trainingTruth = false;
  return result;
}

function validateReveals(reveals, expectedCount) {
  if (!Array.isArray(reveals) || reveals.length !== expectedCount) {
    fail("CLOSE_COMBAT_ATTACK_V7_CHANCE_REVEALS_REQUIRED");
  }
  return reveals.map((reveal) => {
    const faces = object(reveal) ? Number(reveal.faces) : 6;
    const outcome = object(reveal) ? Number(reveal.outcome) : Number(reveal);
    if (faces !== 6 || !Number.isSafeInteger(outcome) || outcome < 1 || outcome > 6) {
      fail("CLOSE_COMBAT_ATTACK_V7_CHANCE_REVEAL_INVALID");
    }
    return outcome;
  });
}

function rollSucceeds(roll, threshold) {
  if (roll === 1) return false;
  if (roll === 6) return true;
  return roll >= threshold;
}

function expectedAction(state, input, matchBinding) {
  const rows = enumerateOfficialCloseCombatAttackV7(state, {
    sideKey: input.sideKey,
    matchBinding,
  }).candidates;
  const candidate = rows.find((row) => (
    row.actionType === input.actionType
      && (input.pieceId === undefined || row.pieceId === input.pieceId)
      && (input.targetId === undefined || row.targetId === input.targetId)
      && (input.cardId === undefined || row.cardId === input.cardId)
  ));
  if (!candidate) fail("CLOSE_COMBAT_ATTACK_V7_ACTION_STALE");
  const action = actionFromCandidate(candidate);
  if (!isDeepStrictEqual(input, action)) fail("CLOSE_COMBAT_ATTACK_V7_ACTION_MISMATCH");
  return action;
}

function attackMaterial(state, matchBinding, baseV6Action) {
  const bindings = latestBindings(state, matchBinding);
  const currentCandidate = exactCriticalCandidate(
    state,
    baseV6Action.sideKey,
    matchBinding,
  );
  if (!currentCandidate
    || !isDeepStrictEqual(actionFromCandidate(currentCandidate), baseV6Action)) {
    fail("CLOSE_COMBAT_ATTACK_V7_BASE_ACTION_STALE");
  }
  const profile = getOfficialAttackProfileV2(bindings.attackProfileCatalogue, {
    recordKey: KERRIGAN_RECORD_KEY,
    phase: "combat",
    weaponName: "Blades",
  });
  const attackerProfile = getOfficialCombatProfileV1(
    bindings.gameplayDataBundle.combatProfileBundle,
    KERRIGAN_RECORD_KEY,
  );
  const targetProfile = getOfficialCombatProfileV1(
    bindings.gameplayDataBundle.combatProfileBundle,
    MARINE_RECORD_KEY,
  );
  return {
    ...bindings,
    profile,
    attackerProfile,
    targetProfile,
    graph: deriveOfficialEngagementGraphV2(state),
  };
}

function appendLog(state, action, events) {
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({
    id: `log-${state.log.length + 1}`,
    round: Number(state.round || 1),
    phase: "combat",
    action: clone(action),
    events: clone(events),
  });
}

function declarationTransition(stateInput, action, options) {
  const baseV6Action = actionFromCandidate(exactCriticalCandidate(
    stateInput,
    action.sideKey,
    options.matchBinding,
  ));
  const material = attackMaterial(stateInput, options.matchBinding, baseV6Action);
  const hitRolls = validateReveals(options.chanceReveals, 6);
  const hits = hitRolls.filter((roll) => rollSucceeds(
    roll,
    material.profile.hitThreshold,
  )).length;
  const state = clone(stateInput);
  const target = state.pieces.find((piece) => piece.id === action.targetId);
  const eligible = reactionEligible(state, baseV6Action);
  if (!eligible) fail("GUARDIAN_SHELL_REACTION_NO_LONGER_ELIGIBLE");
  const event = {
    type: "close_combat_attack_hit_stage",
    sideKey: action.sideKey,
    pieceId: action.pieceId,
    targetId: action.targetId,
    weaponName: "Blades",
    attackProfileHash: material.profile.profileHash,
    attackPool: {
      dice: 6,
      rolls: hitRolls,
      hitThreshold: material.profile.hitThreshold,
      naturalOneAlwaysFails: true,
      naturalSixAlwaysSucceeds: true,
      hits,
    },
    nextWindow: hits > 0
      ? "guardian_shell_before_resolve_surge_and_armour_roll"
      : "none_no_armour_roll",
    trainingTruth: false,
  };
  if (hits === 0) {
    const piece = state.pieces.find((row) => row.id === action.pieceId);
    piece.activatedPhases = { ...(piece.activatedPhases || {}), combat: true };
    state.activeSideKey = otherSide(action.sideKey);
    const complete = {
      type: "close_combat_attack",
      sideKey: action.sideKey,
      pieceId: action.pieceId,
      targetId: action.targetId,
      weaponName: "Blades",
      attackPool: clone(event.attackPool),
      reaction: { offered: false, reason: "no_armour_roll" },
      criticalHit: {
        maximumBypassArmourDice: 2,
        transferDiceBeforeDodge: 0,
        dodgeReductionApplied: 0,
        bypassedArmourDice: 0,
        generatedAdditionalHits: 0,
      },
      armourPool: { dice: 0, rolls: [], unusedPreallocatedRolls: [] },
      damagePool: { dice: 0, bypassDice: 0, failedArmourDice: 0, totalDamage: 0 },
      casualtyModelIds: [],
      targetDestroyed: false,
      stageOrder: ["declaration", "hit", "no_armour_roll", "complete"],
      trainingTruth: false,
    };
    appendLog(state, action, [event, complete]);
    return {
      ok: true,
      schemaVersion: "starcraft_tmg_official_close_combat_attack_transition_v7",
      executorId: OFFICIAL_CLOSE_COMBAT_ATTACK_V7_EXECUTOR_ID,
      executorVersion: OFFICIAL_CLOSE_COMBAT_ATTACK_V7_EXECUTOR_VERSION,
      postRevision: Number(options.postRevision || 0),
      state,
      events: [event, complete],
      action,
      rulesTruth: "official_guardian_shell_window_not_opened_without_armour_roll",
      trainingTruth: false,
    };
  }
  const declarationActionHash = hashStarcraftTmgContract(action);
  state.pendingAttack = createPending({
    stage: "reaction_open",
    round: Number(state.round || 1),
    activationKey: eligible.activationKey,
    attackerSideKey: action.sideKey,
    responderSideKey: target.sideKey,
    pieceId: action.pieceId,
    targetId: action.targetId,
    cardId: eligible.card.id,
    baseV6Action,
    hitRolls,
    hits,
    declarationActionHash,
  });
  event.pendingAttackHash = state.pendingAttack.pendingAttackHash;
  appendLog(state, action, [event]);
  return {
    ok: true,
    schemaVersion: "starcraft_tmg_official_close_combat_attack_transition_v7",
    executorId: OFFICIAL_CLOSE_COMBAT_ATTACK_V7_EXECUTOR_ID,
    executorVersion: OFFICIAL_CLOSE_COMBAT_ATTACK_V7_EXECUTOR_VERSION,
    postRevision: Number(options.postRevision || 0),
    state,
    events: [event],
    action,
    pendingAttack: clone(state.pendingAttack),
    rulesTruth: "official_guardian_shell_reaction_window_open",
    trainingTruth: false,
  };
}

function reactionTransition(stateInput, action, options) {
  latestBindings(stateInput, options.matchBinding);
  const pending = verifyPending(stateInput);
  if (pending.stage !== "reaction_open"
    || action.pendingAttackHash !== pending.pendingAttackHash
    || action.sideKey !== pending.responderSideKey) {
    fail("GUARDIAN_SHELL_REACTION_WINDOW_STALE");
  }
  const state = clone(stateInput);
  const use = action.actionType === OFFICIAL_USE_REACTION_ACTION_TYPE;
  if (use) {
    const status = guardianCardStatus(state, action.sideKey);
    if (status.status !== "ready" || status.card.id !== action.cardId) {
      fail("GUARDIAN_SHELL_CARD_NOT_READY");
    }
    recordReaction(state, {
      activationKey: pending.activationKey,
      sideKey: action.sideKey,
      cardId: action.cardId,
      targetId: pending.targetId,
      pendingAttackHash: pending.pendingAttackHash,
    });
    status.card.readiness = "exhausted";
    status.card.face = "down";
  }
  const targetDodge = use ? {
    present: true,
    reduction: 2,
    source: OFFICIAL_GUARDIAN_SHELL_DODGE_SOURCE,
    sourceRecordHash: OFFICIAL_POWER_FIELD_SOURCE_RECORD_HASH,
    abilityName: "Guardian Shell",
    duration: "this_armour_roll",
  } : {
    present: false,
    reduction: 0,
    source: "target_official_profile_and_effect_state",
  };
  state.pendingAttack = createPending({
    ...pending,
    stage: "reaction_decided",
    previousPendingAttackHash: pending.pendingAttackHash,
    decision: use ? "guardian_shell" : "pass",
    targetDodge,
  });
  const event = {
    type: use ? "reaction_resolved" : "reaction_passed",
    abilityName: use ? "Guardian Shell" : null,
    sideKey: action.sideKey,
    cardId: use ? action.cardId : null,
    targetId: pending.targetId,
    trigger: "before_friendly_ground_unit_armour_roll",
    priorPendingAttackHash: pending.pendingAttackHash,
    pendingAttackHash: state.pendingAttack.pendingAttackHash,
    cardReadinessAfter: use ? "exhausted" : "unchanged",
    dodgeReduction: use ? 2 : 0,
    trainingTruth: false,
  };
  appendLog(state, action, [event]);
  return {
    ok: true,
    schemaVersion: "starcraft_tmg_official_close_combat_attack_transition_v7",
    executorId: OFFICIAL_CLOSE_COMBAT_ATTACK_V7_EXECUTOR_ID,
    executorVersion: OFFICIAL_CLOSE_COMBAT_ATTACK_V7_EXECUTOR_VERSION,
    postRevision: Number(options.postRevision || 0),
    state,
    events: [event],
    action,
    pendingAttack: clone(state.pendingAttack),
    rulesTruth: use
      ? "official_guardian_shell_reaction_exhausted_card_and_granted_dodge_2"
      : "official_guardian_shell_reaction_window_declined",
    trainingTruth: false,
  };
}

function resolutionTransition(stateInput, action, options) {
  const pending = verifyPending(stateInput);
  if (pending.stage !== "reaction_decided"
    || action.pendingAttackHash !== pending.pendingAttackHash
    || action.sideKey !== pending.attackerSideKey) {
    fail("GUARDIAN_SHELL_RESOLUTION_WINDOW_STALE");
  }
  const material = attackMaterial(
    stateInput,
    options.matchBinding,
    pending.baseV6Action,
  );
  const armourRolls = validateReveals(options.chanceReveals, 6);
  const criticalPlan = KERNEL.plan({
    profile: material.profile,
    attackPoolDice: 6,
    targetDodge: pending.targetDodge,
  });
  const criticalResolution = KERNEL.resolve(criticalPlan, {
    attackPoolHits: pending.hits,
  });
  const resolvedArmourRolls = armourRolls.slice(0, criticalResolution.armourPoolDice);
  const armourSaves = resolvedArmourRolls.filter((roll) => rollSucceeds(
    roll,
    material.targetProfile.armourThreshold,
  )).length;
  const failedArmourDice = criticalResolution.armourPoolDice - armourSaves;
  const damagePoolDice = criticalResolution.damagePoolBypassDice + failedArmourDice;
  const state = clone(stateInput);
  const piece = state.pieces.find((row) => row.id === pending.pieceId);
  const target = state.pieces.find((row) => row.id === pending.targetId);
  const targetModel = (target.models || []).find((model) => (
    model.isDestroyed !== true && model.isOnField !== false
  ));
  const priorDamageMarker = Number(target.damageMarker || 0);
  const totalDamage = priorDamageMarker + (damagePoolDice * material.profile.damage);
  const casualty = totalDamage >= material.targetProfile.hitPoints;
  if (casualty) {
    targetModel.isDestroyed = true;
    targetModel.isOnField = false;
    target.currentModels = 0;
    target.currentSupply = 0;
    target.damageMarker = 0;
    target.isDestroyed = true;
    target.isOnField = false;
  } else {
    target.damageMarker = totalDamage;
  }
  piece.activatedPhases = { ...(piece.activatedPhases || {}), combat: true };
  state.activeSideKey = otherSide(action.sideKey);
  delete state.pendingAttack;
  const postGraph = deriveOfficialEngagementGraphV2(state);
  const closeCombatEvent = {
    type: "close_combat_attack",
    sideKey: action.sideKey,
    pieceId: piece.id,
    targetId: target.id,
    weaponName: material.profile.weaponName,
    declarationActionHash: pending.declarationActionHash,
    priorPendingAttackHash: pending.pendingAttackHash,
    attackProfileKey: material.profile.profileKey,
    attackProfileHash: material.profile.profileHash,
    officialAttackProfileCatalogueV2Hash: material.attackProfileCatalogue.catalogueHash,
    criticalHitKernelHash: KERNEL.descriptor.kernelHash,
    criticalHitPlanHash: criticalPlan.planHash,
    criticalHitResolutionHash: criticalResolution.resolutionHash,
    preEngagementGraphHash: material.graph.graphHash,
    postEngagementGraphHash: postGraph.graphHash,
    attackPool: {
      dice: 6,
      rolls: [...pending.hitRolls],
      hitThreshold: material.profile.hitThreshold,
      naturalOneAlwaysFails: true,
      naturalSixAlwaysSucceeds: true,
      hits: pending.hits,
    },
    reaction: {
      offered: true,
      responderSideKey: pending.responderSideKey,
      decision: pending.decision,
      abilityName: pending.decision === "guardian_shell" ? "Guardian Shell" : null,
      cardId: pending.decision === "guardian_shell" ? pending.cardId : null,
      sourceRecordHash: pending.cardSourceRecordHash,
      timing: pending.timing,
    },
    criticalHit: {
      effectAtomId: "attack-effect:critical-hit-v1",
      timing: "resolve_surge",
      maximumBypassArmourDice: criticalResolution.maximumBypassArmourDice,
      transferDiceBeforeDodge: criticalResolution.transferDiceBeforeDodge,
      dodgeReductionRequested: criticalResolution.dodgeReductionRequested,
      dodgeReductionApplied: criticalResolution.dodgeReductionApplied,
      bypassedArmourDice: criticalResolution.bypassedArmourDice,
      generatedAdditionalHits: 0,
    },
    dodge: {
      effectAtomId: "attack-effect:dodge-v1",
      source: pending.targetDodge.source,
      sourceRecordHash: pending.targetDodge.sourceRecordHash || null,
      requestedReduction: pending.targetDodge.reduction,
      appliedReduction: criticalResolution.dodgeReductionApplied,
      duration: pending.targetDodge.duration || null,
      expiredAfterThisArmourRoll: pending.targetDodge.present === true,
    },
    surgePool: { dice: 0, rolls: [], matches: 0 },
    armourPool: {
      dice: criticalResolution.armourPoolDice,
      rolls: resolvedArmourRolls,
      unusedPreallocatedRolls: armourRolls.slice(criticalResolution.armourPoolDice),
      armourThreshold: material.targetProfile.armourThreshold,
      saves: armourSaves,
    },
    evadePool: { dice: 0, rolls: [], reason: "no_explicit_close_combat_evade_grant" },
    damagePool: {
      dice: damagePoolDice,
      bypassDice: criticalResolution.damagePoolBypassDice,
      failedArmourDice,
      damagePerDie: material.profile.damage,
      priorDamageMarker,
      totalDamage,
    },
    casualtyModelIds: casualty ? [targetModel.id] : [],
    postDamageMarker: Number(target.damageMarker || 0),
    targetDestroyed: casualty,
    stageOrder: [
      "declaration",
      "hit",
      "reaction_window",
      "resolve_surge_critical_hit_and_dodge",
      "armour",
      "evade",
      "damage",
    ],
    trainingTruth: false,
  };
  const recorded = recordOfficialSupplyLossesV1({
    stateBefore: stateInput,
    stateAfter: state,
    action,
    events: [closeCombatEvent],
    rulesRuntimeHash: material.boundRuntimeHash,
  });
  state.supplyLossLedger = clone(recorded.ledger);
  const events = [closeCombatEvent, ...clone(recorded.supplyLossEvents)];
  appendLog(state, action, events);
  return {
    ok: true,
    schemaVersion: "starcraft_tmg_official_close_combat_attack_transition_v7",
    executorId: OFFICIAL_CLOSE_COMBAT_ATTACK_V7_EXECUTOR_ID,
    executorVersion: OFFICIAL_CLOSE_COMBAT_ATTACK_V7_EXECUTOR_VERSION,
    postRevision: Number(options.postRevision || 0),
    state,
    events,
    action,
    engagementGraph: postGraph,
    rulesTruth: "official_guardian_shell_dodge_critical_hit_close_combat_subset",
    trainingTruth: false,
  };
}

function delegateHistoricalV6(state, action, options) {
  const applied = applyOfficialCloseCombatAttackV6(state, toV6Action(action), options);
  const result = clone(applied);
  result.action = clone(action);
  result.executorId = OFFICIAL_CLOSE_COMBAT_ATTACK_V7_EXECUTOR_ID;
  result.executorVersion = OFFICIAL_CLOSE_COMBAT_ATTACK_V7_EXECUTOR_VERSION;
  result.schemaVersion = "starcraft_tmg_official_close_combat_attack_transition_v7";
  result.delegatedExecutor = {
    executorId: OFFICIAL_CLOSE_COMBAT_ATTACK_V6_EXECUTOR_ID,
    executorVersion: OFFICIAL_CLOSE_COMBAT_ATTACK_V6_EXECUTOR_VERSION,
  };
  const lastLog = result.state.log?.at(-1);
  if (lastLog) lastLog.action = clone(action);
  result.rulesTruth = "official_close_combat_v6_delegated_by_v7";
  result.trainingTruth = false;
  return result;
}

export function applyOfficialCloseCombatAttackV7(stateInput, actionInput, options = {}) {
  if (!object(actionInput)
    || actionInput.executorId !== OFFICIAL_CLOSE_COMBAT_ATTACK_V7_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_CLOSE_COMBAT_ATTACK_V7_EXECUTOR_VERSION) {
    fail("CLOSE_COMBAT_ATTACK_V7_ACTION_INVALID");
  }
  const action = expectedAction(stateInput, actionInput, options.matchBinding);
  if (action.actionType === "fight") {
    return delegateHistoricalV6(stateInput, action, options);
  }
  if (action.actionType === OFFICIAL_DECLARE_FIGHT_ACTION_TYPE) {
    return declarationTransition(stateInput, action, options);
  }
  if ([OFFICIAL_USE_REACTION_ACTION_TYPE, OFFICIAL_PASS_REACTION_ACTION_TYPE]
    .includes(action.actionType)) {
    return reactionTransition(stateInput, action, options);
  }
  if (action.actionType === OFFICIAL_RESOLVE_FIGHT_ACTION_TYPE) {
    return resolutionTransition(stateInput, action, options);
  }
  fail("CLOSE_COMBAT_ATTACK_V7_ACTION_INVALID");
}
