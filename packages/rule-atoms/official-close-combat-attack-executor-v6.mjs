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
import { createOfficialCriticalHitResolutionKernelV1 } from
  "./official-critical-hit-resolution-kernel-v1.mjs";
import { deriveOfficialEngagementGraphV2 } from
  "./official-engagement-graph-v2.mjs";
import {
  applyOfficialSupplyLossCombatV1,
  enumerateOfficialSupplyLossCombatV1,
  instantiateOfficialSupplyLossCombatV1,
  OFFICIAL_SUPPLY_LOSS_COMBAT_DECLINE_ACTION_ATOM_IDS,
  OFFICIAL_SUPPLY_LOSS_COMBAT_EXECUTOR_ATOM_IDS,
  OFFICIAL_SUPPLY_LOSS_COMBAT_EXECUTOR_ID,
  OFFICIAL_SUPPLY_LOSS_COMBAT_EXECUTOR_VERSION,
  OFFICIAL_SUPPLY_LOSS_COMBAT_LEGACY_MULTI_MOVE_ACTION_ATOM_IDS,
  OFFICIAL_SUPPLY_LOSS_COMBAT_MOVE_ACTION_ATOM_IDS,
  OFFICIAL_SUPPLY_LOSS_COMBAT_PARAMETER_KIND,
  OFFICIAL_SUPPLY_LOSS_COMBAT_SINGLE_MOVE_ACTION_ATOM_IDS,
} from "./official-supply-loss-combat-executor-v1.mjs";
import {
  recordOfficialSupplyLossesV1,
  verifyOfficialSupplyLossLedgerV1,
} from "./official-supply-loss-ledger-v1.mjs";

export const OFFICIAL_CLOSE_COMBAT_ATTACK_V6_EXECUTOR_ID =
  "authority.close-combat-attack-v6";
export const OFFICIAL_CLOSE_COMBAT_ATTACK_V6_EXECUTOR_VERSION = "6.0.0";
export const OFFICIAL_CLOSE_COMBAT_ATTACK_V6_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_CLOSE_COMBAT_ATTACK_V6_PARAMETER_KIND =
  OFFICIAL_SUPPLY_LOSS_COMBAT_PARAMETER_KIND;

export const OFFICIAL_CLOSE_COMBAT_ATTACK_V6_NEW_ATOM_IDS = Object.freeze([
  "rule-atom:singleton:core-11-critical-hit-resolution:7501d86a7392",
]);
export const OFFICIAL_CLOSE_COMBAT_ATTACK_V6_EXECUTOR_ATOM_IDS = Object.freeze([
  ...new Set([
    ...OFFICIAL_SUPPLY_LOSS_COMBAT_EXECUTOR_ATOM_IDS,
    ...OFFICIAL_CLOSE_COMBAT_ATTACK_V6_NEW_ATOM_IDS,
  ]),
].sort((left, right) => left.localeCompare(right)));
export const OFFICIAL_CLOSE_COMBAT_ATTACK_V6_DECLINE_ACTION_ATOM_IDS = Object.freeze([
  ...new Set([
    ...OFFICIAL_SUPPLY_LOSS_COMBAT_DECLINE_ACTION_ATOM_IDS,
    ...OFFICIAL_CLOSE_COMBAT_ATTACK_V6_NEW_ATOM_IDS,
  ]),
].sort((left, right) => left.localeCompare(right)));
export const OFFICIAL_CLOSE_COMBAT_ATTACK_V6_SINGLE_MOVE_ACTION_ATOM_IDS = Object.freeze([
  ...new Set([
    ...OFFICIAL_SUPPLY_LOSS_COMBAT_SINGLE_MOVE_ACTION_ATOM_IDS,
    ...OFFICIAL_CLOSE_COMBAT_ATTACK_V6_NEW_ATOM_IDS,
  ]),
].sort((left, right) => left.localeCompare(right)));
export const OFFICIAL_CLOSE_COMBAT_ATTACK_V6_LEGACY_MULTI_MOVE_ACTION_ATOM_IDS = Object.freeze([
  ...new Set([
    ...OFFICIAL_SUPPLY_LOSS_COMBAT_LEGACY_MULTI_MOVE_ACTION_ATOM_IDS,
    ...OFFICIAL_CLOSE_COMBAT_ATTACK_V6_NEW_ATOM_IDS,
  ]),
].sort((left, right) => left.localeCompare(right)));
export const OFFICIAL_CLOSE_COMBAT_ATTACK_V6_MOVE_ACTION_ATOM_IDS = Object.freeze([
  ...new Set([
    ...OFFICIAL_SUPPLY_LOSS_COMBAT_MOVE_ACTION_ATOM_IDS,
    ...OFFICIAL_CLOSE_COMBAT_ATTACK_V6_NEW_ATOM_IDS,
  ]),
].sort((left, right) => left.localeCompare(right)));

const SIDE_KEYS = Object.freeze(["player1", "player2"]);
const KERNEL = createOfficialCriticalHitResolutionKernelV1();
const KERRIGAN_RECORD_KEY = "army_units:kerrigan";
const MARINE_RECORD_KEY = "army_units:marine";
const BLADES_WEAPON_NAME = "Blades";
const KERRIGAN_PROFILE_SCOPE = Object.freeze({
  profileKey: "army_units:kerrigan::combat::Blades",
  historicalProfileHash:
    "8f718bc26b4a42fdc369c0d8f1c7f145f4080cd8b137dc316986a2f9be316c97",
  profileHash:
    "99cf103a9d14617e693678b4c155b3833fe95b78cf08ff73c6423b2dffdf2b64",
  sourceRecordHash:
    "9555e809c6f8f6a764a6469ba8911fa76224f4fc4147e637a9146f8f9de7c7b0",
  currentModels: 1,
  currentSupply: 1,
  baseDiameterMilliInches: 1575,
  printedBaseDiameter: "Ø 40MM",
  sourceLocator:
    "official-p2p/StarCraft-Zerg-P2P-Card-Sheets-A4_EN.txt#Kerrigan:Ø40MM:Blades",
});
const MARINE_PROFILE_SCOPE = Object.freeze({
  sourceRecordHash:
    "682a2ea237c32dc25cc7c389c3b949705326bba6c416085c39dda2388dd3f215",
  currentModels: 1,
  currentSupply: 0,
  baseDiameterMilliInches: 1260,
  printedBaseDiameter: "Ø 32MM",
  sourceLocator:
    "official-p2p/StarCraft-Terran-P2P-Card-Sheets-A4_EN.txt#Marine:Ø32MM",
});

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
  fail("CLOSE_COMBAT_ATTACK_V6_SIDE_REQUIRED");
}

function milli(value, code) {
  const result = Math.round(Number(value) * 1000);
  if (!Number.isSafeInteger(result)) fail(code);
  return result;
}

function runtimeHash(matchBinding) {
  const value = String(matchBinding?.rulesRuntimeBinding?.runtimeHash || "").trim();
  if (!/^[a-f0-9]{64}$/u.test(value)) {
    fail("CLOSE_COMBAT_ATTACK_V6_RUNTIME_BINDING_REQUIRED");
  }
  return value;
}

function validateState(state) {
  if (!object(state)
    || !object(state.players)
    || !object(state.board)
    || !Array.isArray(state.pieces)) {
    fail("CLOSE_COMBAT_ATTACK_V6_STATE_INVALID");
  }
}

function validateCurrentBinding(state, matchBinding) {
  const gameplayDataBundle = state.officialGameplayDataBundle;
  verifyOfficialGameplayDataBundleV1(gameplayDataBundle);
  if (!object(gameplayDataBundle.attackProfileCatalogue)
    || !object(matchBinding)
    || hashStarcraftTmgContract(gameplayDataBundle) !== matchBinding.dataSnapshotHash) {
    fail("CLOSE_COMBAT_ATTACK_V6_DATA_SNAPSHOT_MISMATCH");
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
    combatProfileBundle: gameplayDataBundle.combatProfileBundle,
    boundRuntimeHash,
  };
}

function exactModel(piece, profile, scope, role) {
  const models = activeModels(piece);
  if (piece.sourceRecordHash !== profile.sourceRecordHash
    || profile.sourceRecordHash !== scope.sourceRecordHash
    || Number(piece.currentModels) !== scope.currentModels
    || Number(piece.currentSupply) !== scope.currentSupply
    || models.length !== 1
    || piece.combatTag !== "ground"
    || !profile.combatTags.includes("ground")
    || !Array.isArray(piece.statuses)
    || !Array.isArray(piece.combatEffects)
    || !Array.isArray(piece.assaultEffects)
    || (piece.selectedUpgradeNames || []).length !== 0
    || piece.statuses.length !== 0
    || piece.assaultEffects.length !== 0
    || models[0].baseShape !== "round"
    || milli(models[0].baseWidthInches, "CLOSE_COMBAT_ATTACK_V6_BASE_SCOPE_UNSUPPORTED")
      !== scope.baseDiameterMilliInches
    || milli(models[0].baseDepthInches, "CLOSE_COMBAT_ATTACK_V6_BASE_SCOPE_UNSUPPORTED")
      !== scope.baseDiameterMilliInches
    || models[0].elevation !== "ground"
    || !isDeepStrictEqual(models[0].supportTerrainIds, [])
    || !isDeepStrictEqual(models[0].adjacentAccessPointIds, [])) {
    fail("CLOSE_COMBAT_ATTACK_V6_UNIT_SCOPE_UNSUPPORTED", role);
  }
  return models[0];
}

function hasDodgeEffect(piece) {
  return (piece.combatEffects || []).some((effect) => (
    /dodge/iu.test(String(
      effect?.effectAtomId
        || effect?.keywordKind
        || effect?.name
        || "",
    ))
  ));
}

function requireExactPair(state, piece, target) {
  const active = state.pieces.filter(activePiece);
  if (active.length !== 2 || !active.includes(piece) || !active.includes(target)) {
    fail("CLOSE_COMBAT_ATTACK_V6_EXACT_PAIR_REQUIRED");
  }
}

function criticalContext(state, sideKey, piece, target, bindings, graph) {
  if (state.phase !== "combat") fail("CLOSE_COMBAT_ATTACK_V6_WRONG_PHASE");
  if (state.activeSideKey !== sideKey) fail("CLOSE_COMBAT_ATTACK_V6_NOT_ACTIVE_SIDE");
  if (state.players?.[sideKey]?.passedPhases?.combat === true) {
    fail("CLOSE_COMBAT_ATTACK_V6_SIDE_PASSED");
  }
  if (!activePiece(piece)
    || piece.sideKey !== sideKey
    || piece.officialUnitRecordKey !== KERRIGAN_RECORD_KEY) {
    fail("CLOSE_COMBAT_ATTACK_V6_UNIT_UNAVAILABLE");
  }
  if (!activePiece(target)
    || target.sideKey !== otherSide(sideKey)
    || target.officialUnitRecordKey !== MARINE_RECORD_KEY) {
    fail("CLOSE_COMBAT_ATTACK_V6_TARGET_UNAVAILABLE");
  }
  if (piece.activatedPhases?.combat === true) {
    fail("CLOSE_COMBAT_ATTACK_V6_ALREADY_ACTIVATED");
  }
  requireExactPair(state, piece, target);
  const attackerCombatProfile = getOfficialCombatProfileV1(
    bindings.combatProfileBundle,
    KERRIGAN_RECORD_KEY,
  );
  const targetCombatProfile = getOfficialCombatProfileV1(
    bindings.combatProfileBundle,
    MARINE_RECORD_KEY,
  );
  const attackerModel = exactModel(
    piece,
    attackerCombatProfile,
    KERRIGAN_PROFILE_SCOPE,
    "attacker",
  );
  const targetModel = exactModel(
    target,
    targetCombatProfile,
    MARINE_PROFILE_SCOPE,
    "target",
  );
  if (piece.combatEffects.length !== 0) {
    fail("CLOSE_COMBAT_ATTACK_V6_ATTACKER_EFFECTS_UNSUPPORTED");
  }
  if (hasDodgeEffect(target)) fail("CRITICAL_HIT_DODGE_INTERACTION_UNSUPPORTED");
  if (target.combatEffects.length !== 0
    || targetCombatProfile.shield !== 0
    || Number(target.damageMarker || 0) < 0
    || Number(target.damageMarker || 0) >= targetCombatProfile.hitPoints) {
    fail("CLOSE_COMBAT_ATTACK_V6_TARGET_EFFECTS_UNSUPPORTED");
  }
  const relevantEdges = graph.modelEdges.filter((edge) => (
    [edge.leftUnitId, edge.rightUnitId].includes(piece.id)
      && [edge.leftUnitId, edge.rightUnitId].includes(target.id)
  ));
  if (graph.modelEdges.length !== 1
    || relevantEdges.length !== 1
    || !graph.engagedUnitIds.includes(piece.id)
    || !graph.engagedUnitIds.includes(target.id)) {
    fail("CLOSE_COMBAT_ATTACK_V6_EXACT_ENGAGEMENT_REQUIRED");
  }
  const profile = getOfficialAttackProfileV2(bindings.attackProfileCatalogue, {
    recordKey: KERRIGAN_RECORD_KEY,
    phase: "combat",
    weaponName: BLADES_WEAPON_NAME,
  });
  if (profile.profileKey !== KERRIGAN_PROFILE_SCOPE.profileKey
    || profile.previousProfileHash !== KERRIGAN_PROFILE_SCOPE.historicalProfileHash
    || profile.profileHash !== KERRIGAN_PROFILE_SCOPE.profileHash
    || profile.sourceRecordHash !== attackerCombatProfile.sourceRecordHash
    || profile.rateOfAttack !== 6
    || profile.hitThreshold !== 4
    || profile.damage !== 2
    || profile.range?.kind !== "engagement"
    || !isDeepStrictEqual(profile.targetTags, ["ground"])
    || !isDeepStrictEqual(profile.effects, [{
      effectAtomId: "attack-effect:critical-hit-v1",
      parameters: { bypassArmourDice: 2 },
      sourceKind: "weapon_keyword",
    }])) {
    fail("CLOSE_COMBAT_ATTACK_V6_PROFILE_SOURCE_MISMATCH");
  }
  const criticalPlan = KERNEL.plan({
    profile,
    attackPoolDice: 6,
    targetDodge: {
      present: false,
      reduction: 0,
      source: "target_official_profile_and_effect_state",
    },
  });
  return {
    attackerCombatProfile,
    targetCombatProfile,
    attackerModel,
    targetModel,
    profile,
    criticalPlan,
  };
}

function criticalAction(sideKey, piece, target) {
  return {
    actionType: "fight",
    sideKey,
    phase: "combat",
    pieceId: piece.id,
    targetId: target.id,
    weaponName: BLADES_WEAPON_NAME,
    closeRanksMode: "decline",
    chance: {
      kind: "fixed_roll_sequence",
      faces: 6,
      count: 12,
      layout: { hit: 6, armour: 6, evade: 0, surge: 0 },
      revealOrder: ["hit", "armour"],
    },
    ruleAtomIds: [...OFFICIAL_CLOSE_COMBAT_ATTACK_V6_DECLINE_ACTION_ATOM_IDS],
    executorId: OFFICIAL_CLOSE_COMBAT_ATTACK_V6_EXECUTOR_ID,
    executorVersion: OFFICIAL_CLOSE_COMBAT_ATTACK_V6_EXECUTOR_VERSION,
  };
}

function disabledCriticalAction(sideKey, piece, target) {
  return {
    ...criticalAction(sideKey, piece, target),
    chance: null,
  };
}

function historicalLineage(action) {
  if (action.closeRanksMode !== "move") {
    return OFFICIAL_CLOSE_COMBAT_ATTACK_V6_DECLINE_ACTION_ATOM_IDS;
  }
  if (action.closeRanksPlan?.schemaVersion
    === "starcraft_tmg_out_of_coherency_close_ranks_plan_v1") {
    return OFFICIAL_CLOSE_COMBAT_ATTACK_V6_MOVE_ACTION_ATOM_IDS;
  }
  if (Array.isArray(action.closeRanksPlan?.placementSequence)) {
    return OFFICIAL_CLOSE_COMBAT_ATTACK_V6_LEGACY_MULTI_MOVE_ACTION_ATOM_IDS;
  }
  return OFFICIAL_CLOSE_COMBAT_ATTACK_V6_SINGLE_MOVE_ACTION_ATOM_IDS;
}

function v6HistoricalAction(candidate) {
  return {
    ...clone(candidate),
    ruleAtomIds: [...historicalLineage(candidate)],
    executorId: OFFICIAL_CLOSE_COMBAT_ATTACK_V6_EXECUTOR_ID,
    executorVersion: OFFICIAL_CLOSE_COMBAT_ATTACK_V6_EXECUTOR_VERSION,
    details: {
      ...(candidate.details || {}),
      executorPath: "historical_v5_delegate",
      delegatedExecutorId: OFFICIAL_SUPPLY_LOSS_COMBAT_EXECUTOR_ID,
      delegatedExecutorVersion: OFFICIAL_SUPPLY_LOSS_COMBAT_EXECUTOR_VERSION,
      trainingTruth: false,
    },
  };
}

function v5Action(action) {
  const result = clone(action);
  result.executorId = OFFICIAL_SUPPLY_LOSS_COMBAT_EXECUTOR_ID;
  result.executorVersion = OFFICIAL_SUPPLY_LOSS_COMBAT_EXECUTOR_VERSION;
  if (result.closeRanksMode !== "move") {
    result.ruleAtomIds = [...OFFICIAL_SUPPLY_LOSS_COMBAT_DECLINE_ACTION_ATOM_IDS];
  } else if (result.closeRanksPlan?.schemaVersion
    === "starcraft_tmg_out_of_coherency_close_ranks_plan_v1") {
    result.ruleAtomIds = [...OFFICIAL_SUPPLY_LOSS_COMBAT_MOVE_ACTION_ATOM_IDS];
  } else if (Array.isArray(result.closeRanksPlan?.placementSequence)) {
    result.ruleAtomIds = [...OFFICIAL_SUPPLY_LOSS_COMBAT_LEGACY_MULTI_MOVE_ACTION_ATOM_IDS];
  } else {
    result.ruleAtomIds = [...OFFICIAL_SUPPLY_LOSS_COMBAT_SINGLE_MOVE_ACTION_ATOM_IDS];
  }
  return result;
}

function v6Domain(domain) {
  const body = {
    ...without(clone(domain), ["domainId"]),
    executorId: OFFICIAL_CLOSE_COMBAT_ATTACK_V6_EXECUTOR_ID,
    executorVersion: OFFICIAL_CLOSE_COMBAT_ATTACK_V6_EXECUTOR_VERSION,
  };
  return { ...body, domainId: `sc-domain-${hashStarcraftTmgContract(body)}` };
}

function v5Domain(domain) {
  const body = {
    ...without(clone(domain), ["domainId"]),
    executorId: OFFICIAL_SUPPLY_LOSS_COMBAT_EXECUTOR_ID,
    executorVersion: OFFICIAL_SUPPLY_LOSS_COMBAT_EXECUTOR_VERSION,
  };
  return { ...body, domainId: `sc-domain-${hashStarcraftTmgContract(body)}` };
}

function enumerateCritical(state, options) {
  const sideKey = String(options.sideKey || state.activeSideKey || "").trim();
  let bindings;
  let graph;
  try {
    bindings = validateCurrentBinding(state, options.matchBinding);
    graph = deriveOfficialEngagementGraphV2(state);
  } catch {
    return [];
  }
  const rows = [];
  for (const piece of state.pieces.filter((entry) => (
    entry.sideKey === sideKey
      && activePiece(entry)
      && entry.officialUnitRecordKey === KERRIGAN_RECORD_KEY
  ))) {
    for (const target of state.pieces.filter((entry) => (
      entry.sideKey === otherSide(sideKey)
        && activePiece(entry)
        && entry.officialUnitRecordKey === MARINE_RECORD_KEY
    ))) {
      let context;
      let disabledReason = "";
      try {
        context = criticalContext(state, sideKey, piece, target, bindings, graph);
      } catch (error) {
        disabledReason = String(error?.message || error).split(":")[0];
      }
      if (!context && options.includeDisabled !== true) continue;
      rows.push({
        ...(context
          ? criticalAction(sideKey, piece, target)
          : disabledCriticalAction(sideKey, piece, target)),
        isEnabled: !disabledReason,
        disabledReason,
        score: disabledReason ? 0 : 215,
        details: {
          sourceRule:
            "official_core_8_7_4_11_critical_hit_and_current_kerrigan_blades",
          officialAttackProfileCatalogueV2Hash:
            bindings.attackProfileCatalogue.catalogueHash,
          historicalAttackProfileCatalogueHash:
            bindings.attackProfileCatalogue.previousCatalogueHash,
          criticalHitKernelHash: KERNEL.descriptor.kernelHash,
          criticalHitPlanHash: context?.criticalPlan.planHash || "",
          maximumBypassArmourDice:
            context?.criticalPlan.maximumBypassArmourDice ?? 2,
          generatedAdditionalHits: 0,
          engagementGraphHash: graph.graphHash,
          executorPath: "kerrigan_blades_critical_hit_v6",
          supportedScope:
            "single_model_kerrigan_blades_vs_single_model_unmodified_marine_no_dodge_no_terrain_no_shield",
          rulesTruth:
            "official_current_profile_bound_critical_hit_armour_bypass_subset",
          trainingTruth: false,
        },
      });
    }
  }
  return rows;
}

export function enumerateOfficialCloseCombatAttackV6(state, options = {}) {
  validateState(state);
  const sideKey = String(options.sideKey || state.activeSideKey || "").trim();
  if (!SIDE_KEYS.includes(sideKey)) fail("CLOSE_COMBAT_ATTACK_V6_SIDE_REQUIRED");
  const historical = enumerateOfficialSupplyLossCombatV1(state, options);
  const candidates = [
    ...historical.candidates.map(v6HistoricalAction),
    ...enumerateCritical(state, { ...options, sideKey }),
  ].sort((left, right) => (
    `${left.pieceId}:${left.targetId}:${left.weaponName}:${left.closeRanksMode}`.localeCompare(
      `${right.pieceId}:${right.targetId}:${right.weaponName}:${right.closeRanksMode}`,
    )
  ));
  return {
    candidates,
    parameterDomains: historical.parameterDomains.map(v6Domain),
  };
}

export function instantiateOfficialCloseCombatAttackV6(
  state,
  domain,
  parameters,
  options = {},
) {
  if (!object(domain)
    || domain.executorId !== OFFICIAL_CLOSE_COMBAT_ATTACK_V6_EXECUTOR_ID
    || domain.executorVersion !== OFFICIAL_CLOSE_COMBAT_ATTACK_V6_EXECUTOR_VERSION) {
    fail("CLOSE_COMBAT_ATTACK_V6_PARAMETER_DOMAIN_INVALID");
  }
  const previous = instantiateOfficialSupplyLossCombatV1(
    state,
    v5Domain(domain),
    parameters,
    options,
  );
  const result = clone(previous);
  result.action = v6HistoricalAction(previous.action);
  delete result.action.isEnabled;
  delete result.action.disabledReason;
  delete result.action.score;
  delete result.action.details;
  result.rulesTruth = "official_close_combat_v5_plus_critical_hit_v6";
  result.trainingTruth = false;
  return result;
}

function validateReveals(reveals, expectedCount) {
  if (!Array.isArray(reveals) || reveals.length !== expectedCount) {
    fail("CLOSE_COMBAT_ATTACK_V6_CHANCE_REVEALS_REQUIRED");
  }
  return reveals.map((reveal) => {
    const faces = object(reveal) ? Number(reveal.faces) : 6;
    const outcome = object(reveal) ? Number(reveal.outcome) : Number(reveal);
    if (faces !== 6 || !Number.isSafeInteger(outcome) || outcome < 1 || outcome > 6) {
      fail("CLOSE_COMBAT_ATTACK_V6_CHANCE_REVEAL_INVALID");
    }
    return outcome;
  });
}

function rollSucceeds(roll, threshold) {
  if (roll === 1) return false;
  if (roll === 6) return true;
  return roll >= threshold;
}

function actionFromCandidate(candidate) {
  return without(candidate, ["isEnabled", "disabledReason", "score", "details"]);
}

function delegateHistoricalV5(state, action, options) {
  const applied = applyOfficialSupplyLossCombatV1(
    state,
    v5Action(action),
    options,
  );
  const result = clone(applied);
  result.action = clone(action);
  result.executorId = OFFICIAL_CLOSE_COMBAT_ATTACK_V6_EXECUTOR_ID;
  result.executorVersion = OFFICIAL_CLOSE_COMBAT_ATTACK_V6_EXECUTOR_VERSION;
  result.schemaVersion = "starcraft_tmg_official_close_combat_attack_transition_v6";
  result.delegatedExecutor = {
    executorId: OFFICIAL_SUPPLY_LOSS_COMBAT_EXECUTOR_ID,
    executorVersion: OFFICIAL_SUPPLY_LOSS_COMBAT_EXECUTOR_VERSION,
  };
  const lastLog = result.state.log?.at(-1);
  if (lastLog) lastLog.action = clone(action);
  result.rulesTruth = "official_close_combat_v5_delegated_by_v6";
  result.trainingTruth = false;
  return result;
}

export function applyOfficialCloseCombatAttackV6(stateInput, actionInput, options = {}) {
  validateState(stateInput);
  if (!object(actionInput)
    || actionInput.actionType !== "fight"
    || actionInput.executorId !== OFFICIAL_CLOSE_COMBAT_ATTACK_V6_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_CLOSE_COMBAT_ATTACK_V6_EXECUTOR_VERSION) {
    fail("CLOSE_COMBAT_ATTACK_V6_ACTION_INVALID");
  }
  const pieceBefore = stateInput.pieces.find((piece) => piece.id === actionInput.pieceId);
  if (pieceBefore?.officialUnitRecordKey !== KERRIGAN_RECORD_KEY
    || actionInput.weaponName !== BLADES_WEAPON_NAME) {
    return delegateHistoricalV5(stateInput, actionInput, options);
  }
  const candidates = enumerateOfficialCloseCombatAttackV6(stateInput, {
    sideKey: actionInput.sideKey,
    matchBinding: options.matchBinding,
  }).candidates;
  const expectedCandidate = candidates.find((candidate) => (
    candidate.pieceId === actionInput.pieceId
      && candidate.targetId === actionInput.targetId
      && candidate.weaponName === actionInput.weaponName
      && candidate.closeRanksMode === actionInput.closeRanksMode
  ));
  if (!expectedCandidate) fail("CLOSE_COMBAT_ATTACK_V6_ACTION_STALE");
  const expectedAction = actionFromCandidate(expectedCandidate);
  if (!isDeepStrictEqual(actionInput, expectedAction)) {
    fail("CLOSE_COMBAT_ATTACK_V6_ACTION_MISMATCH");
  }
  const bindings = validateCurrentBinding(stateInput, options.matchBinding);
  const graph = deriveOfficialEngagementGraphV2(stateInput);
  const targetBefore = stateInput.pieces.find((piece) => piece.id === actionInput.targetId);
  const context = criticalContext(
    stateInput,
    actionInput.sideKey,
    pieceBefore,
    targetBefore,
    bindings,
    graph,
  );
  const rolls = validateReveals(options.chanceReveals, 12);
  const hitRolls = rolls.slice(0, 6);
  const armourRolls = rolls.slice(6, 12);
  const hits = hitRolls.filter((roll) => rollSucceeds(
    roll,
    context.profile.hitThreshold,
  )).length;
  const criticalResolution = KERNEL.resolve(context.criticalPlan, {
    attackPoolHits: hits,
  });
  const resolvedArmourRolls = armourRolls.slice(0, criticalResolution.armourPoolDice);
  const armourSaves = resolvedArmourRolls.filter((roll) => rollSucceeds(
    roll,
    context.targetCombatProfile.armourThreshold,
  )).length;
  const failedArmourDice = criticalResolution.armourPoolDice - armourSaves;
  const damagePoolDice = criticalResolution.damagePoolBypassDice + failedArmourDice;
  const state = clone(stateInput);
  const piece = state.pieces.find((entry) => entry.id === actionInput.pieceId);
  const target = state.pieces.find((entry) => entry.id === actionInput.targetId);
  const targetModel = activeModels(target)[0];
  const priorDamageMarker = Number(target.damageMarker || 0);
  const totalDamage = priorDamageMarker + (damagePoolDice * context.profile.damage);
  const casualty = totalDamage >= context.targetCombatProfile.hitPoints;
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
  state.activeSideKey = otherSide(actionInput.sideKey);
  const postGraph = deriveOfficialEngagementGraphV2(state);
  const closeCombatEvent = {
    type: "close_combat_attack",
    sideKey: actionInput.sideKey,
    pieceId: piece.id,
    targetId: target.id,
    attackerModelId: context.attackerModel.id,
    targetModelId: context.targetModel.id,
    weaponName: context.profile.weaponName,
    closeRanksMode: "decline",
    attackProfileKey: context.profile.profileKey,
    attackProfileHash: context.profile.profileHash,
    historicalAttackProfileHash: context.profile.previousProfileHash,
    officialAttackProfileCatalogueV2Hash:
      bindings.attackProfileCatalogue.catalogueHash,
    historicalAttackProfileCatalogueHash:
      bindings.attackProfileCatalogue.previousCatalogueHash,
    criticalHitKernelHash: KERNEL.descriptor.kernelHash,
    criticalHitPlanHash: context.criticalPlan.planHash,
    criticalHitResolutionHash: criticalResolution.resolutionHash,
    preEngagementGraphHash: graph.graphHash,
    postEngagementGraphHash: postGraph.graphHash,
    baseSourceBindings: {
      attacker: {
        printedBaseDiameter: KERRIGAN_PROFILE_SCOPE.printedBaseDiameter,
        sourceLocator: KERRIGAN_PROFILE_SCOPE.sourceLocator,
      },
      target: {
        printedBaseDiameter: MARINE_PROFILE_SCOPE.printedBaseDiameter,
        sourceLocator: MARINE_PROFILE_SCOPE.sourceLocator,
      },
    },
    attackPool: {
      dice: 6,
      rolls: hitRolls,
      hitThreshold: context.profile.hitThreshold,
      naturalOneAlwaysFails: true,
      naturalSixAlwaysSucceeds: true,
      hits,
    },
    criticalHit: {
      effectAtomId: "attack-effect:critical-hit-v1",
      timing: "resolve_surge",
      maximumBypassArmourDice: criticalResolution.maximumBypassArmourDice,
      dodgeReduction: 0,
      bypassedArmourDice: criticalResolution.bypassedArmourDice,
      generatedAdditionalHits: 0,
    },
    surgePool: { dice: 0, rolls: [], matches: 0 },
    armourPool: {
      dice: criticalResolution.armourPoolDice,
      rolls: resolvedArmourRolls,
      unusedPreallocatedRolls: armourRolls.slice(criticalResolution.armourPoolDice),
      armourThreshold: context.targetCombatProfile.armourThreshold,
      saves: armourSaves,
    },
    evadePool: {
      dice: 0,
      rolls: [],
      reason: "no_explicit_close_combat_evade_grant",
    },
    damagePool: {
      dice: damagePoolDice,
      bypassDice: criticalResolution.damagePoolBypassDice,
      failedArmourDice,
      damagePerDie: context.profile.damage,
      priorDamageMarker,
      totalDamage,
    },
    casualtyModelIds: casualty ? [targetModel.id] : [],
    postDamageMarker: Number(target.damageMarker || 0),
    targetDestroyed: casualty,
    stageOrder: [
      "declaration",
      "hit",
      "resolve_surge_and_critical_hit",
      "armour",
      "evade",
      "damage",
    ],
    trainingTruth: false,
  };
  const recorded = recordOfficialSupplyLossesV1({
    stateBefore: stateInput,
    stateAfter: state,
    action: expectedAction,
    events: [closeCombatEvent],
    rulesRuntimeHash: bindings.boundRuntimeHash,
  });
  state.supplyLossLedger = clone(recorded.ledger);
  const events = [closeCombatEvent, ...clone(recorded.supplyLossEvents)];
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({
    id: `log-${state.log.length + 1}`,
    round: Number(state.round || 1),
    phase: "combat",
    action: clone(expectedAction),
    events: clone(events),
  });
  return {
    ok: true,
    schemaVersion: "starcraft_tmg_official_close_combat_attack_transition_v6",
    executorId: OFFICIAL_CLOSE_COMBAT_ATTACK_V6_EXECUTOR_ID,
    executorVersion: OFFICIAL_CLOSE_COMBAT_ATTACK_V6_EXECUTOR_VERSION,
    postRevision: Number(options.postRevision || 0),
    state,
    events,
    action: expectedAction,
    engagementGraph: postGraph,
    rulesTruth: "official_current_kerrigan_blades_critical_hit_armour_bypass_subset",
    trainingTruth: false,
  };
}
