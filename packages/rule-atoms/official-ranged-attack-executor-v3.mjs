import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { getOfficialAttackProfileV1, verifyOfficialAttackProfileCatalogueV1 } from
  "../source-data/official-attack-profile-catalogue-v1.mjs";
import { getOfficialCombatProfileV1 } from
  "../source-data/official-combat-profile-bundle-v1.mjs";
import { verifyOfficialGameplayDataBundleV1 } from
  "../source-data/official-gameplay-data-bundle-v1.mjs";
import { createOfficialAttackResolutionKernelV2 } from
  "./official-attack-resolution-kernel-v2.mjs";
import { deriveOfficialEngagementGraphV2 } from "./official-engagement-graph-v2.mjs";
import {
  applyOfficialRangedAttackV2,
  enumerateOfficialRangedAttackActionsV2,
  OFFICIAL_RANGED_ATTACK_V2_ACTION_ATOM_IDS,
  OFFICIAL_RANGED_ATTACK_V2_ACTION_TYPE,
  OFFICIAL_RANGED_ATTACK_V2_DEPENDENCY_ATOM_IDS,
  OFFICIAL_RANGED_ATTACK_V2_EXECUTOR_ATOM_IDS,
  OFFICIAL_RANGED_ATTACK_V2_EXECUTOR_ID,
  OFFICIAL_RANGED_ATTACK_V2_EXECUTOR_VERSION,
} from "./official-ranged-attack-executor-v2.mjs";

export const OFFICIAL_RANGED_ATTACK_V3_EXECUTOR_ID = "authority.ranged-attack-v3";
export const OFFICIAL_RANGED_ATTACK_V3_EXECUTOR_VERSION = "3.0.0";
export const OFFICIAL_RANGED_ATTACK_V3_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_RANGED_ATTACK_V3_ACTION_TYPE = OFFICIAL_RANGED_ATTACK_V2_ACTION_TYPE;

export const OFFICIAL_RANGED_ATTACK_V3_NEW_ATOM_IDS = Object.freeze([
  "rule-atom:pierce-tag-damage",
]);

export const OFFICIAL_RANGED_ATTACK_V3_DEPENDENCY_ATOM_IDS = Object.freeze([
  ...OFFICIAL_RANGED_ATTACK_V2_DEPENDENCY_ATOM_IDS,
]);

export const OFFICIAL_RANGED_ATTACK_V3_EXECUTOR_ATOM_IDS = Object.freeze([
  ...new Set([
    ...OFFICIAL_RANGED_ATTACK_V2_EXECUTOR_ATOM_IDS,
    ...OFFICIAL_RANGED_ATTACK_V3_NEW_ATOM_IDS,
  ]),
].sort((left, right) => left.localeCompare(right)));

export const OFFICIAL_RANGED_ATTACK_V3_ACTION_ATOM_IDS = Object.freeze([
  ...new Set([
    ...OFFICIAL_RANGED_ATTACK_V3_DEPENDENCY_ATOM_IDS,
    ...OFFICIAL_RANGED_ATTACK_V3_EXECUTOR_ATOM_IDS,
  ]),
].sort((left, right) => left.localeCompare(right)));

const SIDE_KEYS = Object.freeze(["player1", "player2"]);
const KERNEL = createOfficialAttackResolutionKernelV2();
const MARAUDER_RECORD_KEY = "army_units:marauder";
const ROACH_RECORD_KEY = "army_units:roach";
const PIERCE_ATTACKER = Object.freeze({
  recordKey: MARAUDER_RECORD_KEY,
  weaponName: "Quad K12",
  profileKey: "army_units:marauder::assault::Quad K12",
  currentModels: 1,
  currentSupply: 0,
  baseDiameterMilliInches: 1970,
  printedBaseDiameter: "Ø 50MM",
  sourceLocator:
    "official-p2p/StarCraft-Terran-P2P-Card-Sheets-A4_EN.txt#Marauder:Ø50MM",
});
const PIERCE_TARGET = Object.freeze({
  recordKey: ROACH_RECORD_KEY,
  currentModels: 1,
  currentSupply: 0,
  baseDiameterMilliInches: 1970,
  printedBaseDiameter: "Ø 50MM",
  sourceLocator:
    "official-p2p/StarCraft-Zerg-P2P-Card-Sheets-A4_EN.txt#Roach:Ø50MM",
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
  fail("RANGED_ATTACK_V3_SIDE_REQUIRED");
}

function milli(value, code) {
  const result = Math.round(Number(value) * 1000);
  if (!Number.isSafeInteger(result)) fail(code);
  return result;
}

function validateState(state) {
  if (!object(state) || !object(state.players) || !object(state.board)
    || !Array.isArray(state.pieces)) {
    fail("RANGED_ATTACK_V3_STATE_INVALID");
  }
}

function verifyProfileBinding(state, matchBinding) {
  const gameplayBundle = state.officialGameplayDataBundle;
  verifyOfficialGameplayDataBundleV1(gameplayBundle);
  const catalogue = gameplayBundle.attackProfileCatalogue;
  verifyOfficialAttackProfileCatalogueV1(catalogue);
  if (!object(matchBinding)
    || hashStarcraftTmgContract(gameplayBundle) !== matchBinding.dataSnapshotHash
    || catalogue.sourceSnapshotHash !== gameplayBundle.sourceSnapshotHash
    || catalogue.normalizedDatasetHash !== gameplayBundle.normalizedDatasetHash) {
    fail("RANGED_ATTACK_V3_DATA_SNAPSHOT_MISMATCH");
  }
  return {
    catalogue,
    combatBundle: gameplayBundle.combatProfileBundle,
  };
}

function exactScopedModel(piece, combatProfile, scope, role) {
  const models = activeModels(piece);
  if (piece.sourceRecordHash !== combatProfile.sourceRecordHash
    || Number(piece.currentModels) !== scope.currentModels
    || Number(piece.currentSupply) !== scope.currentSupply
    || models.length !== 1
    || piece.combatTag !== "ground"
    || !combatProfile.combatTags.includes("ground")
    || (piece.statuses || []).length !== 0
    || (piece.selectedUpgradeNames || []).length !== 0
    || (piece.combatEffects || []).length !== 0
    || (piece.assaultEffects || []).length !== 0
    || models[0].baseShape !== "round"
    || milli(models[0].baseWidthInches, "RANGED_ATTACK_V3_BASE_SCOPE_UNSUPPORTED")
      !== scope.baseDiameterMilliInches
    || milli(models[0].baseDepthInches, "RANGED_ATTACK_V3_BASE_SCOPE_UNSUPPORTED")
      !== scope.baseDiameterMilliInches
    || models[0].elevation !== "ground"
    || !isDeepStrictEqual(models[0].supportTerrainIds, [])
    || !isDeepStrictEqual(models[0].adjacentAccessPointIds, [])) {
    fail("RANGED_ATTACK_V3_UNIT_SCOPE_UNSUPPORTED", role);
  }
  return models[0];
}

function baseGapMilliInches(left, leftScope, right, rightScope) {
  return Math.max(0, Math.round(Math.hypot(
    milli(right.xInches, "RANGED_ATTACK_V3_MODEL_GEOMETRY_INVALID")
      - milli(left.xInches, "RANGED_ATTACK_V3_MODEL_GEOMETRY_INVALID"),
    milli(right.yInches, "RANGED_ATTACK_V3_MODEL_GEOMETRY_INVALID")
      - milli(left.yInches, "RANGED_ATTACK_V3_MODEL_GEOMETRY_INVALID"),
  ) - (leftScope.baseDiameterMilliInches / 2) - (rightScope.baseDiameterMilliInches / 2)));
}

function pierceContext(state, sideKey, piece, target, bindings, graph) {
  if (state.phase !== "assault") fail("RANGED_ATTACK_V3_WRONG_PHASE");
  if (state.activeSideKey !== sideKey) fail("RANGED_ATTACK_V3_NOT_ACTIVE_SIDE");
  if (state.players?.[sideKey]?.passedPhases?.assault === true) {
    fail("RANGED_ATTACK_V3_SIDE_PASSED");
  }
  if (!activePiece(piece) || piece.sideKey !== sideKey) {
    fail("RANGED_ATTACK_V3_UNIT_UNAVAILABLE");
  }
  if (!activePiece(target) || target.sideKey !== otherSide(sideKey)) {
    fail("RANGED_ATTACK_V3_TARGET_UNAVAILABLE");
  }
  if (piece.activatedPhases?.assault === true) fail("RANGED_ATTACK_V3_ALREADY_ACTIVATED");
  if ((state.board.terrain || []).length !== 0 || (state.board.accessPoints || []).length !== 0) {
    fail("RANGED_ATTACK_V3_TERRAIN_SCOPE_UNSUPPORTED");
  }
  if (piece.disengageAssaultRestriction !== undefined
    && piece.disengageAssaultRestriction !== null) {
    fail("RANGED_ATTACK_V3_POST_DISENGAGE_SCOPE_UNSUPPORTED");
  }
  if (graph.engagedUnitIds.includes(piece.id) || graph.engagedUnitIds.includes(target.id)) {
    fail("RANGED_ATTACK_V3_ENGAGEMENT_SCOPE_UNSUPPORTED");
  }
  if (piece.officialUnitRecordKey !== MARAUDER_RECORD_KEY
    || target.officialUnitRecordKey !== ROACH_RECORD_KEY) {
    fail("RANGED_ATTACK_V3_UNIT_SCOPE_UNSUPPORTED");
  }
  const attackerCombatProfile = getOfficialCombatProfileV1(
    bindings.combatBundle,
    piece.officialUnitRecordKey,
  );
  const targetCombatProfile = getOfficialCombatProfileV1(
    bindings.combatBundle,
    target.officialUnitRecordKey,
  );
  const attackerModel = exactScopedModel(
    piece,
    attackerCombatProfile,
    PIERCE_ATTACKER,
    "attacker",
  );
  const targetModel = exactScopedModel(
    target,
    targetCombatProfile,
    PIERCE_TARGET,
    "target",
  );
  const damageMarker = Number(target.damageMarker || 0);
  if (targetCombatProfile.shield !== 0
    || !Number.isSafeInteger(damageMarker)
    || damageMarker < 0
    || damageMarker >= targetCombatProfile.hitPoints) {
    fail("RANGED_ATTACK_V3_TARGET_DAMAGE_SCOPE_UNSUPPORTED");
  }
  const attackProfile = getOfficialAttackProfileV1(bindings.catalogue, {
    recordKey: MARAUDER_RECORD_KEY,
    phase: "assault",
    weaponName: PIERCE_ATTACKER.weaponName,
  });
  if (attackProfile.profileKey !== PIERCE_ATTACKER.profileKey
    || attackProfile.sourceRecordHash !== attackerCombatProfile.sourceRecordHash) {
    fail("RANGED_ATTACK_V3_PROFILE_SOURCE_MISMATCH");
  }
  const baseGap = baseGapMilliInches(
    attackerModel,
    PIERCE_ATTACKER,
    targetModel,
    PIERCE_TARGET,
  );
  const plan = KERNEL.plan({
    profile: attackProfile,
    target: {
      armourThreshold: targetCombatProfile.armourThreshold,
      combatTags: targetCombatProfile.combatTags,
    },
    distanceInches: Number((baseGap / 1000).toFixed(3)),
    evadeEligible: false,
  });
  const lineOfSightBody = {
    schema: "starcraft_tmg_official_unobstructed_line_of_sight_receipt_v1",
    attackerModelId: attackerModel.id,
    targetModelId: targetModel.id,
    projection: "top_down",
    trace: "base_to_base",
    terrainCount: 0,
    mutual: true,
    visible: true,
    trainingTruth: false,
  };
  return {
    attackerCombatProfile,
    targetCombatProfile,
    attackerModel,
    targetModel,
    attackProfile,
    plan,
    baseGapMilliInches: baseGap,
    lineOfSightReceipt: {
      ...lineOfSightBody,
      receiptHash: hashStarcraftTmgContract(lineOfSightBody),
    },
  };
}

function actionFromCandidate(candidate) {
  const {
    isEnabled: _isEnabled,
    disabledReason: _disabledReason,
    score: _score,
    details: _details,
    ...action
  } = candidate;
  return action;
}

function v3Action(candidate) {
  return {
    ...candidate,
    ruleAtomIds: [...OFFICIAL_RANGED_ATTACK_V3_ACTION_ATOM_IDS],
    executorId: OFFICIAL_RANGED_ATTACK_V3_EXECUTOR_ID,
    executorVersion: OFFICIAL_RANGED_ATTACK_V3_EXECUTOR_VERSION,
    details: {
      ...candidate.details,
      executorPath: "historical_v2_delegate",
      delegatedExecutorId: OFFICIAL_RANGED_ATTACK_V2_EXECUTOR_ID,
      delegatedExecutorVersion: OFFICIAL_RANGED_ATTACK_V2_EXECUTOR_VERSION,
      trainingTruth: false,
    },
  };
}

function canonicalPierceAction(sideKey, piece, target, context) {
  return {
    actionType: OFFICIAL_RANGED_ATTACK_V3_ACTION_TYPE,
    sideKey,
    phase: "assault",
    pieceId: piece.id,
    targetId: target.id,
    weaponName: context.attackProfile.weaponName,
    chance: clone(context.plan.chance),
    ruleAtomIds: [...OFFICIAL_RANGED_ATTACK_V3_ACTION_ATOM_IDS],
    executorId: OFFICIAL_RANGED_ATTACK_V3_EXECUTOR_ID,
    executorVersion: OFFICIAL_RANGED_ATTACK_V3_EXECUTOR_VERSION,
  };
}

function disabledPierceContext(bindings) {
  const attackProfile = getOfficialAttackProfileV1(bindings.catalogue, {
    recordKey: MARAUDER_RECORD_KEY,
    phase: "assault",
    weaponName: PIERCE_ATTACKER.weaponName,
  });
  const targetProfile = getOfficialCombatProfileV1(bindings.combatBundle, ROACH_RECORD_KEY);
  return {
    attackProfile,
    plan: KERNEL.plan({
      profile: attackProfile,
      target: {
        armourThreshold: targetProfile.armourThreshold,
        combatTags: targetProfile.combatTags,
      },
      distanceInches: 0,
      evadeEligible: false,
    }),
  };
}

function enumeratePierce(state, options = {}) {
  const sideKey = String(options.sideKey || state.activeSideKey || "").trim();
  let bindings;
  let graph;
  try {
    bindings = verifyProfileBinding(state, options.matchBinding);
    graph = deriveOfficialEngagementGraphV2(state);
  } catch {
    return [];
  }
  const rows = [];
  for (const piece of state.pieces.filter((entry) => (
    entry.sideKey === sideKey
      && activePiece(entry)
      && entry.officialUnitRecordKey === MARAUDER_RECORD_KEY
  ))) {
    for (const target of state.pieces.filter((entry) => (
      entry.sideKey === otherSide(sideKey)
        && activePiece(entry)
        && entry.officialUnitRecordKey === ROACH_RECORD_KEY
    ))) {
      let context;
      let disabledReason = "";
      try {
        context = pierceContext(state, sideKey, piece, target, bindings, graph);
      } catch (error) {
        disabledReason = String(error?.message || error).split(":")[0];
      }
      if (!context) {
        if (options.includeDisabled !== true) continue;
        try {
          context = disabledPierceContext(bindings);
        } catch {
          continue;
        }
      }
      const pierce = context.attackProfile.effects.find((effect) => (
        effect.effectAtomId === "attack-effect:pierce-v1"
      ));
      rows.push({
        ...canonicalPierceAction(sideKey, piece, target, context),
        isEnabled: !disabledReason,
        disabledReason,
        score: disabledReason ? 0 : 195,
        details: {
          sourceRule:
            "official_core_8_7_4_11_pierce_and_official_marauder_example",
          officialAttackProfileCatalogueHash: bindings.catalogue.catalogueHash,
          attackResolutionKernelHash: KERNEL.descriptor.kernelHash,
          attackPlanHash: context.plan.planHash,
          effectAtomIds: [...context.plan.effectAtomIds],
          engagementGraphHash: graph.graphHash,
          lineOfSightReceiptHash: context.lineOfSightReceipt?.receiptHash || "",
          normalRangeInches: context.plan.normalRangeInches,
          maximumRangeInches: context.plan.maximumRangeInches,
          rangeBand: context.plan.rangeBand,
          distanceInches: context.plan.distanceInches,
          effectiveHitThreshold: context.plan.effectiveHitThreshold,
          pierceTargetTag: pierce.parameters.targetTag,
          pierceDamage: pierce.parameters.damage,
          visible: Boolean(context.lineOfSightReceipt?.visible),
          engaged: graph.engagedUnitIds.includes(piece.id),
          executorPath: "pierce_v3",
          supportedScope:
            "single_model_unmodified_marauder_quad_k12_vs_single_model_unmodified_roach_no_terrain_no_shield_no_evade",
          rulesTruth: "official_current_profile_bound_atomic_pierce_ranged_attack_subset",
          trainingTruth: false,
        },
      });
    }
  }
  return rows;
}

export function enumerateOfficialRangedAttackActionsV3(state, options = {}) {
  validateState(state);
  const sideKey = String(options.sideKey || state.activeSideKey || "").trim();
  if (!SIDE_KEYS.includes(sideKey)) fail("RANGED_ATTACK_V3_SIDE_REQUIRED");
  const historical = enumerateOfficialRangedAttackActionsV2(state, options).map(v3Action);
  return [...historical, ...enumeratePierce(state, options)].sort((left, right) => (
    `${left.pieceId}:${left.targetId}:${left.weaponName}`.localeCompare(
      `${right.pieceId}:${right.targetId}:${right.weaponName}`,
    )
  ));
}

function sideHasAvailableAssaultActivation(state, sideKey) {
  if (state.players?.[sideKey]?.passedPhases?.assault === true) return false;
  return state.pieces.some((piece) => (
    piece.sideKey === sideKey
      && activePiece(piece)
      && piece.activatedPhases?.assault !== true
  ));
}

function delegateHistoricalV2(stateInput, expectedAction, options) {
  const legacyCandidate = enumerateOfficialRangedAttackActionsV2(stateInput, {
    sideKey: expectedAction.sideKey,
    matchBinding: options.matchBinding,
  }).find((candidate) => (
    candidate.pieceId === expectedAction.pieceId
      && candidate.targetId === expectedAction.targetId
      && candidate.weaponName === expectedAction.weaponName
  ));
  if (!legacyCandidate) fail("RANGED_ATTACK_V3_ACTION_STALE");
  const applied = applyOfficialRangedAttackV2(
    stateInput,
    actionFromCandidate(legacyCandidate),
    options,
  );
  const state = applied.state;
  const lastLog = state.log?.at(-1);
  if (lastLog) lastLog.action = clone(expectedAction);
  return {
    ...applied,
    schemaVersion: "starcraft_tmg_official_ranged_attack_transition_v3",
    executorId: OFFICIAL_RANGED_ATTACK_V3_EXECUTOR_ID,
    executorVersion: OFFICIAL_RANGED_ATTACK_V3_EXECUTOR_VERSION,
    state,
    action: expectedAction,
    delegatedExecutor: {
      executorId: OFFICIAL_RANGED_ATTACK_V2_EXECUTOR_ID,
      executorVersion: OFFICIAL_RANGED_ATTACK_V2_EXECUTOR_VERSION,
    },
    rulesTruth: "official_current_profile_bound_atomic_ranged_attack_subset_v3",
    trainingTruth: false,
  };
}

export function applyOfficialRangedAttackV3(stateInput, actionInput, options = {}) {
  validateState(stateInput);
  if (!object(actionInput)
    || actionInput.actionType !== OFFICIAL_RANGED_ATTACK_V3_ACTION_TYPE
    || actionInput.executorId !== OFFICIAL_RANGED_ATTACK_V3_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_RANGED_ATTACK_V3_EXECUTOR_VERSION) {
    fail("RANGED_ATTACK_V3_ACTION_INVALID");
  }
  const candidates = enumerateOfficialRangedAttackActionsV3(stateInput, {
    sideKey: actionInput.sideKey,
    matchBinding: options.matchBinding,
  });
  const expectedCandidate = candidates.find((candidate) => (
    candidate.pieceId === actionInput.pieceId
      && candidate.targetId === actionInput.targetId
      && candidate.weaponName === actionInput.weaponName
  ));
  if (!expectedCandidate) fail("RANGED_ATTACK_V3_ACTION_STALE");
  const expectedAction = actionFromCandidate(expectedCandidate);
  if (!isDeepStrictEqual(actionInput, expectedAction)) fail("RANGED_ATTACK_V3_ACTION_MISMATCH");
  const pieceBefore = stateInput.pieces.find((piece) => piece.id === actionInput.pieceId);
  if (pieceBefore?.officialUnitRecordKey !== MARAUDER_RECORD_KEY) {
    return delegateHistoricalV2(stateInput, expectedAction, options);
  }

  const bindings = verifyProfileBinding(stateInput, options.matchBinding);
  const graph = deriveOfficialEngagementGraphV2(stateInput);
  const targetBefore = stateInput.pieces.find((piece) => piece.id === actionInput.targetId);
  const context = pierceContext(
    stateInput,
    actionInput.sideKey,
    pieceBefore,
    targetBefore,
    bindings,
    graph,
  );
  const resolution = KERNEL.resolve(context.plan, options.chanceReveals);
  const state = clone(stateInput);
  const piece = state.pieces.find((entry) => entry.id === actionInput.pieceId);
  const target = state.pieces.find((entry) => entry.id === actionInput.targetId);
  const targetModel = activeModels(target)[0];
  const priorDamageMarker = Number(target.damageMarker || 0);
  const totalDamage = priorDamageMarker + resolution.stages.damage.totalDamage;
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
    movement: false,
    assault: false,
    combat: false,
    ...(piece.activatedPhases || {}),
    assault: true,
  };
  const opponentSideKey = otherSide(actionInput.sideKey);
  if (sideHasAvailableAssaultActivation(state, opponentSideKey)) {
    state.activeSideKey = opponentSideKey;
  } else if (sideHasAvailableAssaultActivation(state, actionInput.sideKey)) {
    state.activeSideKey = actionInput.sideKey;
  }
  const stages = resolution.stages;
  const rangedEvent = {
    type: OFFICIAL_RANGED_ATTACK_V3_ACTION_TYPE,
    sideKey: actionInput.sideKey,
    pieceId: piece.id,
    targetId: target.id,
    attackerModelId: context.attackerModel.id,
    targetModelId: context.targetModel.id,
    weaponName: context.attackProfile.weaponName,
    attackProfileKey: context.attackProfile.profileKey,
    attackProfileHash: context.attackProfile.profileHash,
    officialAttackProfileCatalogueHash: bindings.catalogue.catalogueHash,
    attackResolutionKernelHash: KERNEL.descriptor.kernelHash,
    attackPlanHash: context.plan.planHash,
    attackResolutionHash: resolution.resolutionHash,
    effectAtomIds: [...context.plan.effectAtomIds],
    baseSourceBindings: {
      attacker: {
        printedBaseDiameter: PIERCE_ATTACKER.printedBaseDiameter,
        sourceLocator: PIERCE_ATTACKER.sourceLocator,
      },
      target: {
        printedBaseDiameter: PIERCE_TARGET.printedBaseDiameter,
        sourceLocator: PIERCE_TARGET.sourceLocator,
      },
    },
    engagementGraphHash: graph.graphHash,
    lineOfSightReceiptHash: context.lineOfSightReceipt.receiptHash,
    distanceInches: context.plan.distanceInches,
    rangeBand: context.plan.rangeBand,
    attackPool: clone(stages.hit),
    surgePool: {
      dice: context.plan.chance.layout.surge,
      rolls: [...stages.effects.surgeRolls],
      results: [...stages.effects.surgeResults],
      matched: stages.effects.surgeMatched,
      bypassedArmourHits: stages.effects.bypassedArmourHits,
    },
    armourPool: clone(stages.armour),
    evadePool: clone(stages.evade),
    pierce: {
      effectAtomId: "attack-effect:pierce-v1",
      matched: stages.effects.pierceMatched,
      targetTag: stages.effects.pierceTargetTag,
      baseDamagePerDie: stages.damage.baseDamagePerDie,
      effectiveDamagePerDie: stages.damage.damagePerDie,
    },
    damagePool: {
      dice: stages.damage.damagePoolDice,
      damagePerDie: stages.damage.damagePerDie,
      priorDamageMarker,
      totalDamage,
    },
    casualtyModelIds: casualty ? [targetModel.id] : [],
    postDamageMarker: Number(target.damageMarker || 0),
    targetDestroyed: casualty,
    trainingTruth: false,
  };
  const events = [rangedEvent];
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({
    id: `log-${state.log.length + 1}`,
    round: Number(state.round || 1),
    phase: "assault",
    action: clone(expectedAction),
    events: clone(events),
  });
  return {
    ok: true,
    schemaVersion: "starcraft_tmg_official_ranged_attack_transition_v3",
    executorId: OFFICIAL_RANGED_ATTACK_V3_EXECUTOR_ID,
    executorVersion: OFFICIAL_RANGED_ATTACK_V3_EXECUTOR_VERSION,
    postRevision: Number(options.postRevision || 0),
    state,
    events,
    action: expectedAction,
    rulesTruth: "official_current_profile_bound_atomic_pierce_ranged_attack_subset",
    trainingTruth: false,
  };
}

export const OFFICIAL_RANGED_ATTACK_V3_HISTORICAL_ACTION_ATOM_IDS =
  OFFICIAL_RANGED_ATTACK_V2_ACTION_ATOM_IDS;
