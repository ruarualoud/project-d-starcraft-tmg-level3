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
import {
  applyOfficialCloseCombatAttackV7,
  enumerateOfficialCloseCombatAttackV7,
  instantiateOfficialCloseCombatAttackV7,
  isOfficialGuardianShellAttackPendingV1,
  OFFICIAL_CLOSE_COMBAT_ATTACK_V7_DECLINE_ACTION_ATOM_IDS,
  OFFICIAL_CLOSE_COMBAT_ATTACK_V7_EXECUTOR_ATOM_IDS,
  OFFICIAL_CLOSE_COMBAT_ATTACK_V7_EXECUTOR_ID,
  OFFICIAL_CLOSE_COMBAT_ATTACK_V7_EXECUTOR_VERSION,
  OFFICIAL_CLOSE_COMBAT_ATTACK_V7_LEGACY_MULTI_MOVE_ACTION_ATOM_IDS,
  OFFICIAL_CLOSE_COMBAT_ATTACK_V7_MOVE_ACTION_ATOM_IDS,
  OFFICIAL_CLOSE_COMBAT_ATTACK_V7_PARAMETER_KIND,
  OFFICIAL_CLOSE_COMBAT_ATTACK_V7_SINGLE_MOVE_ACTION_ATOM_IDS,
} from "./official-close-combat-attack-executor-v7.mjs";
import { deriveOfficialEngagementGraphV2 } from
  "./official-engagement-graph-v2.mjs";
import {
  createOfficialInstantAttackEffectKernelV1,
  OFFICIAL_INSTANT_ATTACK_EFFECT_ATOM_ID,
} from "./official-instant-attack-effect-kernel-v1.mjs";
import {
  recordOfficialSupplyLossesV1,
  verifyOfficialSupplyLossLedgerV1,
} from "./official-supply-loss-ledger-v1.mjs";

export const OFFICIAL_CLOSE_COMBAT_ATTACK_V8_EXECUTOR_ID =
  "authority.close-combat-attack-v8";
export const OFFICIAL_CLOSE_COMBAT_ATTACK_V8_EXECUTOR_VERSION = "8.0.0";
export const OFFICIAL_CLOSE_COMBAT_ATTACK_V8_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_CLOSE_COMBAT_ATTACK_V8_PARAMETER_KIND =
  OFFICIAL_CLOSE_COMBAT_ATTACK_V7_PARAMETER_KIND;
export const OFFICIAL_CLOSE_COMBAT_ATTACK_V8_NEW_ATOM_IDS = Object.freeze([
  "rule-atom:singleton:core-11-instant-reaction-prohibition:d7dd0a746300",
]);
export const OFFICIAL_CLOSE_COMBAT_ATTACK_V8_EXECUTOR_ATOM_IDS = Object.freeze([
  ...new Set([
    ...OFFICIAL_CLOSE_COMBAT_ATTACK_V7_EXECUTOR_ATOM_IDS,
    ...OFFICIAL_CLOSE_COMBAT_ATTACK_V8_NEW_ATOM_IDS,
  ]),
].sort((left, right) => left.localeCompare(right)));
export const OFFICIAL_CLOSE_COMBAT_ATTACK_V8_DECLINE_ACTION_ATOM_IDS = Object.freeze([
  ...new Set([
    ...OFFICIAL_CLOSE_COMBAT_ATTACK_V7_DECLINE_ACTION_ATOM_IDS,
    ...OFFICIAL_CLOSE_COMBAT_ATTACK_V8_NEW_ATOM_IDS,
  ]),
].sort((left, right) => left.localeCompare(right)));
export const OFFICIAL_CLOSE_COMBAT_ATTACK_V8_SINGLE_MOVE_ACTION_ATOM_IDS =
  OFFICIAL_CLOSE_COMBAT_ATTACK_V7_SINGLE_MOVE_ACTION_ATOM_IDS;
export const OFFICIAL_CLOSE_COMBAT_ATTACK_V8_LEGACY_MULTI_MOVE_ACTION_ATOM_IDS =
  OFFICIAL_CLOSE_COMBAT_ATTACK_V7_LEGACY_MULTI_MOVE_ACTION_ATOM_IDS;
export const OFFICIAL_CLOSE_COMBAT_ATTACK_V8_MOVE_ACTION_ATOM_IDS =
  OFFICIAL_CLOSE_COMBAT_ATTACK_V7_MOVE_ACTION_ATOM_IDS;

const SIDE_KEYS = Object.freeze(["player1", "player2"]);
const RAPTOR_RECORD_KEY = "army_units:kerrigan_swarm_raptor__zergling_";
const MARINE_RECORD_KEY = "army_units:marine";
const CURRENT_SOURCE_SNAPSHOT_HASH =
  "2407d2536278776692c9116cb74c4147e15f2aa6ff9af9204141e5620220bd78";
const CURRENT_DATASET_HASH =
  "40ba72534a2165131288ec77ccf67984baf5f740e58c4f94283b46137a54757a";
const RAPTOR_SCOPE = Object.freeze({
  sourceRecordHash:
    "d224df3320b658d3561dfb7c8c155dad267865eeabf18d657d7c41f14f597b5e",
  payloadHash:
    "92a658a9e569ed15fcd82a70a94cdcaa3b3563bcc6eabf3c495fbc9e62dabaaa",
  profileHash:
    "bde03b02cbf30fbda84d03e406f9937060a1d97f8c24992f77e6b9e351efc21f",
  previousProfileHash:
    "87c4a830761e9016e29347a735fe85bb04cd2d9da7090cbe7340699e5675e149",
  currentModels: 1,
  maxModels: 6,
  currentSupply: 0,
  baseDiameterMilliInches: 1260,
  printedBaseDiameter: "Ø 32MM",
  sourceLocator:
    "official-p2p/StarCraft-Zerg-P2P-Card-Sheets-A4_EN.txt#Kerrigan-Swarm-Raptor:Ø32MM:Claws",
});
const MARINE_SCOPE = Object.freeze({
  sourceRecordHash:
    "682a2ea237c32dc25cc7c389c3b949705326bba6c416085c39dda2388dd3f215",
  currentModels: 1,
  maxModels: 1,
  currentSupply: 0,
  baseDiameterMilliInches: 1260,
  printedBaseDiameter: "Ø 32MM",
  sourceLocator:
    "official-p2p/StarCraft-Terran-P2P-Card-Sheets-A4_EN.txt#Marine:Ø32MM",
});
const INSTANT_KERNEL = createOfficialInstantAttackEffectKernelV1();
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

function actionFromCandidate(candidate) {
  return without(candidate, ["isEnabled", "disabledReason", "score", "details"]);
}

function activePiece(piece) {
  return piece?.isOnField === true
    && piece?.isDestroyed !== true
    && Number(piece?.currentModels || 0) > 0;
}

function activeModels(piece) {
  return (piece?.models || []).filter((model) => (
    model?.isDestroyed !== true && model?.isOnField !== false
  ));
}

function otherSide(sideKey) {
  if (sideKey === "player1") return "player2";
  if (sideKey === "player2") return "player1";
  fail("CLOSE_COMBAT_ATTACK_V8_SIDE_REQUIRED");
}

function milli(value, code) {
  const result = Math.round(Number(value) * 1000);
  if (!Number.isSafeInteger(result)) fail(code);
  return result;
}

function runtimeHash(matchBinding) {
  const value = String(matchBinding?.rulesRuntimeBinding?.runtimeHash || "").trim();
  if (!HASH_PATTERN.test(value)) fail("CLOSE_COMBAT_ATTACK_V8_RUNTIME_BINDING_REQUIRED");
  return value;
}

function validateState(state) {
  if (!object(state)
    || !object(state.players)
    || !object(state.board)
    || !Array.isArray(state.pieces)) {
    fail("CLOSE_COMBAT_ATTACK_V8_STATE_INVALID");
  }
}

function latestBindings(state, matchBinding) {
  const gameplayDataBundle = state.officialGameplayDataBundle;
  verifyOfficialGameplayDataBundleV1(gameplayDataBundle);
  if (gameplayDataBundle.sourceSnapshotHash !== CURRENT_SOURCE_SNAPSHOT_HASH
    || gameplayDataBundle.normalizedDatasetHash !== CURRENT_DATASET_HASH) {
    fail("CLOSE_COMBAT_ATTACK_V8_LATEST_DATA_REQUIRED");
  }
  if (!object(matchBinding)
    || hashStarcraftTmgContract(gameplayDataBundle) !== matchBinding.dataSnapshotHash) {
    fail("CLOSE_COMBAT_ATTACK_V8_DATA_SNAPSHOT_MISMATCH");
  }
  const boundRuntimeHash = runtimeHash(matchBinding);
  verifyOfficialSupplyLossLedgerV1(state.supplyLossLedger, {
    round: Number(state.round || 1),
    rulesRuntimeHash: boundRuntimeHash,
  });
  const attackProfileCatalogue = createOfficialAttackProfileCatalogueV2({
    previousCatalogue: gameplayDataBundle.attackProfileCatalogue,
  });
  return {
    gameplayDataBundle,
    attackProfileCatalogue,
    boundRuntimeHash,
  };
}

function exactModel(piece, profile, scope, role) {
  const models = activeModels(piece);
  if (piece.sourceRecordHash !== profile.sourceRecordHash
    || profile.sourceRecordHash !== scope.sourceRecordHash
    || Number(piece.currentModels) !== scope.currentModels
    || Number(piece.maxModels) !== scope.maxModels
    || Number(piece.currentSupply) !== scope.currentSupply
    || models.length !== 1
    || piece.combatTag !== "ground"
    || !profile.combatTags.includes("ground")
    || !Array.isArray(piece.statuses)
    || !Array.isArray(piece.combatEffects)
    || !Array.isArray(piece.assaultEffects)
    || (piece.selectedUpgradeNames || []).length !== 0
    || piece.statuses.length !== 0
    || piece.combatEffects.length !== 0
    || piece.assaultEffects.length !== 0
    || models[0].baseShape !== "round"
    || milli(models[0].baseWidthInches, "CLOSE_COMBAT_ATTACK_V8_BASE_SCOPE_UNSUPPORTED")
      !== scope.baseDiameterMilliInches
    || milli(models[0].baseDepthInches, "CLOSE_COMBAT_ATTACK_V8_BASE_SCOPE_UNSUPPORTED")
      !== scope.baseDiameterMilliInches
    || models[0].elevation !== "ground"
    || !isDeepStrictEqual(models[0].supportTerrainIds, [])
    || !isDeepStrictEqual(models[0].adjacentAccessPointIds, [])) {
    fail("CLOSE_COMBAT_ATTACK_V8_UNIT_SCOPE_UNSUPPORTED", role);
  }
  return models[0];
}

function exactRaptorContext(state, sideKey, piece, target, bindings, graph) {
  if (state.phase !== "combat") fail("CLOSE_COMBAT_ATTACK_V8_WRONG_PHASE");
  if (state.activeSideKey !== sideKey) fail("CLOSE_COMBAT_ATTACK_V8_NOT_ACTIVE_SIDE");
  if (state.players?.[sideKey]?.passedPhases?.combat === true) {
    fail("CLOSE_COMBAT_ATTACK_V8_SIDE_PASSED");
  }
  if (!activePiece(piece)
    || piece.sideKey !== sideKey
    || piece.officialUnitRecordKey !== RAPTOR_RECORD_KEY) {
    fail("CLOSE_COMBAT_ATTACK_V8_UNIT_UNAVAILABLE");
  }
  if (!activePiece(target)
    || target.sideKey !== otherSide(sideKey)
    || target.officialUnitRecordKey !== MARINE_RECORD_KEY) {
    fail("CLOSE_COMBAT_ATTACK_V8_TARGET_UNAVAILABLE");
  }
  if (piece.activatedPhases?.combat === true) {
    fail("CLOSE_COMBAT_ATTACK_V8_ALREADY_ACTIVATED");
  }
  const active = state.pieces.filter(activePiece);
  if (active.length !== 2 || !active.includes(piece) || !active.includes(target)) {
    fail("CLOSE_COMBAT_ATTACK_V8_EXACT_PAIR_REQUIRED");
  }
  const attackerProfile = getOfficialCombatProfileV1(
    bindings.gameplayDataBundle.combatProfileBundle,
    RAPTOR_RECORD_KEY,
  );
  const targetProfile = getOfficialCombatProfileV1(
    bindings.gameplayDataBundle.combatProfileBundle,
    MARINE_RECORD_KEY,
  );
  const attackerModel = exactModel(piece, attackerProfile, RAPTOR_SCOPE, "attacker");
  const targetModel = exactModel(target, targetProfile, MARINE_SCOPE, "target");
  if (attackerProfile.shield !== 0
    || targetProfile.shield !== 0
    || Number(target.damageMarker || 0) < 0
    || Number(target.damageMarker || 0) >= targetProfile.hitPoints) {
    fail("CLOSE_COMBAT_ATTACK_V8_TARGET_EFFECTS_UNSUPPORTED");
  }
  const relevantEdges = graph.modelEdges.filter((edge) => (
    [edge.leftUnitId, edge.rightUnitId].includes(piece.id)
      && [edge.leftUnitId, edge.rightUnitId].includes(target.id)
  ));
  if (graph.modelEdges.length !== 1
    || relevantEdges.length !== 1
    || !graph.engagedUnitIds.includes(piece.id)
    || !graph.engagedUnitIds.includes(target.id)) {
    fail("CLOSE_COMBAT_ATTACK_V8_EXACT_ENGAGEMENT_REQUIRED");
  }
  const profile = getOfficialAttackProfileV2(bindings.attackProfileCatalogue, {
    recordKey: RAPTOR_RECORD_KEY,
    phase: "combat",
    weaponName: "Claws",
  });
  if (profile.profileHash !== RAPTOR_SCOPE.profileHash
    || profile.previousProfileHash !== RAPTOR_SCOPE.previousProfileHash
    || profile.sourceRecordHash !== RAPTOR_SCOPE.sourceRecordHash
    || profile.payloadHash !== RAPTOR_SCOPE.payloadHash
    || profile.rateOfAttack !== 2
    || profile.hitThreshold !== 3
    || profile.damage !== 1
    || profile.range?.kind !== "engagement"
    || !isDeepStrictEqual(profile.targetTags, ["ground"])
    || !isDeepStrictEqual(profile.effects, [
      {
        effectAtomId: "attack-effect:surge-armour-bypass-v1",
        parameters: {
          targetTags: ["armoured", "light"],
          diceExpression: "D6",
        },
        sourceKind: "surge",
      },
      {
        effectAtomId: OFFICIAL_INSTANT_ATTACK_EFFECT_ATOM_ID,
        parameters: {},
        sourceKind: "weapon_keyword",
      },
    ])) {
    fail("CLOSE_COMBAT_ATTACK_V8_PROFILE_SOURCE_MISMATCH");
  }
  const instantPlan = INSTANT_KERNEL.plan({ profile });
  return {
    attackerProfile,
    targetProfile,
    attackerModel,
    targetModel,
    profile,
    instantPlan,
  };
}

function instantCandidate(sideKey, piece, target, context, bindings, graph) {
  return {
    actionType: "fight",
    sideKey,
    phase: "combat",
    pieceId: piece.id,
    targetId: target.id,
    weaponName: "Claws",
    closeRanksMode: "decline",
    chance: {
      kind: "fixed_roll_sequence",
      faces: 6,
      count: 5,
      layout: { hit: 2, surge: 1, armour: 2, evade: 0 },
      revealOrder: ["hit", "surge", "armour"],
    },
    ruleAtomIds: [...OFFICIAL_CLOSE_COMBAT_ATTACK_V8_DECLINE_ACTION_ATOM_IDS],
    executorId: OFFICIAL_CLOSE_COMBAT_ATTACK_V8_EXECUTOR_ID,
    executorVersion: OFFICIAL_CLOSE_COMBAT_ATTACK_V8_EXECUTOR_VERSION,
    isEnabled: true,
    disabledReason: "",
    score: 235,
    details: {
      sourceRule: "official_core_instant_plus_current_raptor_claws",
      officialAttackProfileCatalogueV2Hash: bindings.attackProfileCatalogue.catalogueHash,
      instantKernelHash: INSTANT_KERNEL.descriptor.kernelHash,
      instantPlanHash: context.instantPlan.planHash,
      engagementGraphHash: graph.graphHash,
      enemyReactionDeclarationAllowed: false,
      enemyReactionResolutionAllowed: false,
      supportedScope:
        "one_remaining_unmodified_raptor_claws_vs_one_unmodified_marine_no_terrain_no_shield",
      rulesTruth: "official_instant_raptor_claws_close_combat_subset",
      trainingTruth: false,
    },
  };
}

function toV8Candidate(candidate) {
  return {
    ...clone(candidate),
    executorId: OFFICIAL_CLOSE_COMBAT_ATTACK_V8_EXECUTOR_ID,
    executorVersion: OFFICIAL_CLOSE_COMBAT_ATTACK_V8_EXECUTOR_VERSION,
    details: {
      ...(candidate.details || {}),
      executorPath: "historical_v7_delegate",
      delegatedExecutorId: OFFICIAL_CLOSE_COMBAT_ATTACK_V7_EXECUTOR_ID,
      delegatedExecutorVersion: OFFICIAL_CLOSE_COMBAT_ATTACK_V7_EXECUTOR_VERSION,
      trainingTruth: false,
    },
  };
}

function toV7Action(action) {
  return {
    ...clone(action),
    executorId: OFFICIAL_CLOSE_COMBAT_ATTACK_V7_EXECUTOR_ID,
    executorVersion: OFFICIAL_CLOSE_COMBAT_ATTACK_V7_EXECUTOR_VERSION,
  };
}

function toV8Domain(domain) {
  const body = {
    ...without(clone(domain), ["domainId"]),
    executorId: OFFICIAL_CLOSE_COMBAT_ATTACK_V8_EXECUTOR_ID,
    executorVersion: OFFICIAL_CLOSE_COMBAT_ATTACK_V8_EXECUTOR_VERSION,
  };
  return { ...body, domainId: `sc-domain-${hashStarcraftTmgContract(body)}` };
}

function toV7Domain(domain) {
  const body = {
    ...without(clone(domain), ["domainId"]),
    executorId: OFFICIAL_CLOSE_COMBAT_ATTACK_V7_EXECUTOR_ID,
    executorVersion: OFFICIAL_CLOSE_COMBAT_ATTACK_V7_EXECUTOR_VERSION,
  };
  return { ...body, domainId: `sc-domain-${hashStarcraftTmgContract(body)}` };
}

export function enumerateOfficialCloseCombatAttackV8(state, options = {}) {
  validateState(state);
  const historical = enumerateOfficialCloseCombatAttackV7(state, options);
  if (isOfficialGuardianShellAttackPendingV1(state)) {
    return {
      candidates: historical.candidates.map(toV8Candidate),
      parameterDomains: [],
    };
  }
  const sideKey = String(options.sideKey || state.activeSideKey || "").trim();
  if (!SIDE_KEYS.includes(sideKey)) fail("CLOSE_COMBAT_ATTACK_V8_SIDE_REQUIRED");
  const candidates = historical.candidates.map(toV8Candidate);
  let bindings;
  let graph;
  try {
    bindings = latestBindings(state, options.matchBinding);
    graph = deriveOfficialEngagementGraphV2(state);
    for (const piece of state.pieces.filter((entry) => (
      entry.sideKey === sideKey
        && activePiece(entry)
        && entry.officialUnitRecordKey === RAPTOR_RECORD_KEY
    ))) {
      for (const target of state.pieces.filter((entry) => (
        entry.sideKey === otherSide(sideKey)
          && activePiece(entry)
          && entry.officialUnitRecordKey === MARINE_RECORD_KEY
      ))) {
        const context = exactRaptorContext(
          state,
          sideKey,
          piece,
          target,
          bindings,
          graph,
        );
        candidates.push(instantCandidate(sideKey, piece, target, context, bindings, graph));
      }
    }
  } catch (error) {
    const raptor = state.pieces.find((entry) => (
      entry.sideKey === sideKey && entry.officialUnitRecordKey === RAPTOR_RECORD_KEY
    ));
    const target = state.pieces.find((entry) => (
      entry.sideKey === otherSide(sideKey) && entry.officialUnitRecordKey === MARINE_RECORD_KEY
    ));
    if (raptor && target && options.includeDisabled === true) {
      candidates.push({
        ...instantCandidate(sideKey, raptor, target, {
          instantPlan: { planHash: "" },
        }, {
          attackProfileCatalogue: { catalogueHash: "" },
        }, { graphHash: "" }),
        chance: null,
        isEnabled: false,
        disabledReason: String(error?.message || error).split(":")[0],
        score: 0,
        details: {
          rulesTruth: "official_close_combat_v8_latest_data_fail_closed",
          trainingTruth: false,
        },
      });
    }
  }
  return {
    candidates: candidates.sort((left, right) => (
      `${left.actionType}:${left.pieceId || ""}:${left.targetId || ""}:${left.weaponName || ""}`
        .localeCompare(
          `${right.actionType}:${right.pieceId || ""}:${right.targetId || ""}:${right.weaponName || ""}`,
        )
    )),
    parameterDomains: historical.parameterDomains.map(toV8Domain),
  };
}

export function instantiateOfficialCloseCombatAttackV8(
  state,
  domain,
  parameters,
  options = {},
) {
  if (!object(domain)
    || domain.executorId !== OFFICIAL_CLOSE_COMBAT_ATTACK_V8_EXECUTOR_ID
    || domain.executorVersion !== OFFICIAL_CLOSE_COMBAT_ATTACK_V8_EXECUTOR_VERSION
    || isOfficialGuardianShellAttackPendingV1(state)) {
    fail("CLOSE_COMBAT_ATTACK_V8_PARAMETER_DOMAIN_INVALID");
  }
  const previous = instantiateOfficialCloseCombatAttackV7(
    state,
    toV7Domain(domain),
    parameters,
    options,
  );
  const result = clone(previous);
  result.action = actionFromCandidate(toV8Candidate(previous.action));
  result.rulesTruth = "official_close_combat_v7_delegated_by_v8";
  result.trainingTruth = false;
  return result;
}

function revealOutcomes(reveals, count) {
  if (!Array.isArray(reveals) || reveals.length !== count) {
    fail("CLOSE_COMBAT_ATTACK_V8_CHANCE_REVEALS_REQUIRED");
  }
  return reveals.map((reveal) => {
    const faces = object(reveal) ? Number(reveal.faces) : 6;
    const outcome = object(reveal) ? Number(reveal.outcome) : Number(reveal);
    if (faces !== 6 || !Number.isSafeInteger(outcome) || outcome < 1 || outcome > 6) {
      fail("CLOSE_COMBAT_ATTACK_V8_CHANCE_REVEAL_INVALID");
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
  const candidate = enumerateOfficialCloseCombatAttackV8(state, {
    sideKey: input.sideKey,
    matchBinding,
  }).candidates.find((row) => (
    row.actionType === input.actionType
      && row.pieceId === input.pieceId
      && row.targetId === input.targetId
      && row.weaponName === input.weaponName
      && row.pendingAttackHash === input.pendingAttackHash
      && row.cardId === input.cardId
  ));
  if (!candidate) fail("CLOSE_COMBAT_ATTACK_V8_ACTION_STALE");
  const expected = actionFromCandidate(candidate);
  if (!isDeepStrictEqual(input, expected)) fail("CLOSE_COMBAT_ATTACK_V8_ACTION_MISMATCH");
  return expected;
}

function applyInstantAttack(stateInput, action, options) {
  const bindings = latestBindings(stateInput, options.matchBinding);
  const graph = deriveOfficialEngagementGraphV2(stateInput);
  const pieceBefore = stateInput.pieces.find((piece) => piece.id === action.pieceId);
  const targetBefore = stateInput.pieces.find((piece) => piece.id === action.targetId);
  const context = exactRaptorContext(
    stateInput,
    action.sideKey,
    pieceBefore,
    targetBefore,
    bindings,
    graph,
  );
  const rolls = revealOutcomes(options.chanceReveals, 5);
  const hitRolls = rolls.slice(0, 2);
  const surgeRolls = rolls.slice(2, 3);
  const armourRolls = rolls.slice(3, 5);
  const hits = hitRolls.filter((roll) => rollSucceeds(
    roll,
    context.profile.hitThreshold,
  )).length;
  const surgeMatched = context.profile.surge.targetTags.some((tag) => (
    context.targetProfile.combatTags.includes(tag)
  ));
  const bypassedArmourHits = surgeMatched ? Math.min(hits, surgeRolls[0]) : 0;
  const armourDice = hits - bypassedArmourHits;
  const resolvedArmourRolls = armourRolls.slice(0, armourDice);
  const armourSaves = resolvedArmourRolls.filter((roll) => rollSucceeds(
    roll,
    context.targetProfile.armourThreshold,
  )).length;
  const damagePoolDice = bypassedArmourHits + armourDice - armourSaves;
  const state = clone(stateInput);
  const piece = state.pieces.find((entry) => entry.id === action.pieceId);
  const target = state.pieces.find((entry) => entry.id === action.targetId);
  const targetModel = activeModels(target)[0];
  const priorDamageMarker = Number(target.damageMarker || 0);
  const totalDamage = priorDamageMarker + (damagePoolDice * context.profile.damage);
  const casualty = totalDamage >= context.targetProfile.hitPoints;
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
  piece.activatedPhases = {
    movement: true,
    assault: true,
    combat: false,
    ...(piece.activatedPhases || {}),
    combat: true,
  };
  state.activeSideKey = otherSide(action.sideKey);
  const postGraph = deriveOfficialEngagementGraphV2(state);
  const event = {
    type: "close_combat_attack",
    sideKey: action.sideKey,
    pieceId: piece.id,
    targetId: target.id,
    attackerModelId: context.attackerModel.id,
    targetModelId: context.targetModel.id,
    weaponName: context.profile.weaponName,
    closeRanksMode: "decline",
    attackProfileKey: context.profile.profileKey,
    attackProfileHash: context.profile.profileHash,
    historicalAttackProfileHash: context.profile.previousProfileHash,
    officialAttackProfileCatalogueV2Hash: bindings.attackProfileCatalogue.catalogueHash,
    instantKernelHash: INSTANT_KERNEL.descriptor.kernelHash,
    instantPlanHash: context.instantPlan.planHash,
    preEngagementGraphHash: graph.graphHash,
    postEngagementGraphHash: postGraph.graphHash,
    baseSourceBindings: {
      attacker: {
        printedBaseDiameter: RAPTOR_SCOPE.printedBaseDiameter,
        sourceLocator: RAPTOR_SCOPE.sourceLocator,
      },
      target: {
        printedBaseDiameter: MARINE_SCOPE.printedBaseDiameter,
        sourceLocator: MARINE_SCOPE.sourceLocator,
      },
    },
    attackPool: {
      dice: 2,
      rolls: hitRolls,
      hitThreshold: context.profile.hitThreshold,
      naturalOneAlwaysFails: true,
      naturalSixAlwaysSucceeds: true,
      hits,
    },
    reaction: {
      offered: false,
      reason: "instant_enemy_reactions_prohibited",
      enemyDeclarationAllowed: false,
      enemyResolutionAllowed: false,
    },
    instant: {
      effectAtomId: OFFICIAL_INSTANT_ATTACK_EFFECT_ATOM_ID,
      timing: context.instantPlan.timing,
      planHash: context.instantPlan.planHash,
    },
    surgePool: {
      dice: 1,
      rolls: surgeRolls,
      diceExpression: "D6",
      targetTags: [...context.profile.surge.targetTags],
      matched: surgeMatched,
      bypassedArmourHits,
    },
    armourPool: {
      dice: armourDice,
      rolls: resolvedArmourRolls,
      unusedPreallocatedRolls: armourRolls.slice(armourDice),
      armourThreshold: context.targetProfile.armourThreshold,
      saves: armourSaves,
    },
    evadePool: { dice: 0, rolls: [], reason: "no_close_combat_evade_grant" },
    damagePool: {
      dice: damagePoolDice,
      bypassDice: bypassedArmourHits,
      failedArmourDice: armourDice - armourSaves,
      damagePerDie: context.profile.damage,
      priorDamageMarker,
      totalDamage,
    },
    casualtyModelIds: casualty ? [targetModel.id] : [],
    postDamageMarker: Number(target.damageMarker || 0),
    targetDestroyed: casualty,
    stageOrder: [
      "declaration",
      "instant_reaction_prohibition",
      "hit",
      "resolve_surge",
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
    events: [event],
    rulesRuntimeHash: bindings.boundRuntimeHash,
  });
  state.supplyLossLedger = clone(recorded.ledger);
  const events = [event, ...clone(recorded.supplyLossEvents)];
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({
    id: `log-${state.log.length + 1}`,
    round: Number(state.round || 1),
    phase: "combat",
    action: clone(action),
    events: clone(events),
  });
  return {
    ok: true,
    schemaVersion: "starcraft_tmg_official_close_combat_attack_transition_v8",
    executorId: OFFICIAL_CLOSE_COMBAT_ATTACK_V8_EXECUTOR_ID,
    executorVersion: OFFICIAL_CLOSE_COMBAT_ATTACK_V8_EXECUTOR_VERSION,
    postRevision: Number(options.postRevision || 0),
    state,
    events,
    action,
    engagementGraph: postGraph,
    rulesTruth: "official_instant_raptor_claws_close_combat_subset",
    trainingTruth: false,
  };
}

function delegateHistoricalV7(state, action, options) {
  const applied = applyOfficialCloseCombatAttackV7(state, toV7Action(action), options);
  const result = clone(applied);
  result.action = clone(action);
  result.executorId = OFFICIAL_CLOSE_COMBAT_ATTACK_V8_EXECUTOR_ID;
  result.executorVersion = OFFICIAL_CLOSE_COMBAT_ATTACK_V8_EXECUTOR_VERSION;
  result.schemaVersion = "starcraft_tmg_official_close_combat_attack_transition_v8";
  result.delegatedExecutor = {
    executorId: OFFICIAL_CLOSE_COMBAT_ATTACK_V7_EXECUTOR_ID,
    executorVersion: OFFICIAL_CLOSE_COMBAT_ATTACK_V7_EXECUTOR_VERSION,
  };
  const lastLog = result.state.log?.at(-1);
  if (lastLog) lastLog.action = clone(action);
  result.rulesTruth = "official_close_combat_v7_delegated_by_v8";
  result.trainingTruth = false;
  return result;
}

export function applyOfficialCloseCombatAttackV8(stateInput, actionInput, options = {}) {
  validateState(stateInput);
  if (!object(actionInput)
    || actionInput.executorId !== OFFICIAL_CLOSE_COMBAT_ATTACK_V8_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_CLOSE_COMBAT_ATTACK_V8_EXECUTOR_VERSION) {
    fail("CLOSE_COMBAT_ATTACK_V8_ACTION_INVALID");
  }
  const action = expectedAction(stateInput, actionInput, options.matchBinding);
  const piece = stateInput.pieces.find((entry) => entry.id === action.pieceId);
  if (action.actionType === "fight"
    && piece?.officialUnitRecordKey === RAPTOR_RECORD_KEY
    && action.weaponName === "Claws") {
    return applyInstantAttack(stateInput, action, options);
  }
  return delegateHistoricalV7(stateInput, action, options);
}

export function officialCloseCombatAttackV8AtomIdsForAction(action) {
  if (action?.actionType === "fight" && action?.weaponName === "Claws") {
    return OFFICIAL_CLOSE_COMBAT_ATTACK_V8_DECLINE_ACTION_ATOM_IDS;
  }
  if (action?.closeRanksMode !== "move") {
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
