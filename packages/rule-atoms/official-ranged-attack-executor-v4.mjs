import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  getOfficialAttackProfileV1,
  verifyOfficialAttackProfileCatalogueV1,
} from "../source-data/official-attack-profile-catalogue-v1.mjs";
import { getOfficialCombatProfileV1 } from
  "../source-data/official-combat-profile-bundle-v1.mjs";
import { verifyOfficialGameplayDataBundleV1 } from
  "../source-data/official-gameplay-data-bundle-v1.mjs";
import { createOfficialAttackResolutionKernelV3 } from
  "./official-attack-resolution-kernel-v3.mjs";
import { deriveOfficialEngagementGraphV2 } from
  "./official-engagement-graph-v2.mjs";
import {
  applyOfficialRangedAttackV3,
  enumerateOfficialRangedAttackActionsV3,
  OFFICIAL_RANGED_ATTACK_V3_ACTION_ATOM_IDS,
  OFFICIAL_RANGED_ATTACK_V3_ACTION_TYPE,
  OFFICIAL_RANGED_ATTACK_V3_DEPENDENCY_ATOM_IDS,
  OFFICIAL_RANGED_ATTACK_V3_EXECUTOR_ATOM_IDS,
  OFFICIAL_RANGED_ATTACK_V3_EXECUTOR_ID,
  OFFICIAL_RANGED_ATTACK_V3_EXECUTOR_VERSION,
} from "./official-ranged-attack-executor-v3.mjs";

export const OFFICIAL_RANGED_ATTACK_V4_EXECUTOR_ID = "authority.ranged-attack-v4";
export const OFFICIAL_RANGED_ATTACK_V4_EXECUTOR_VERSION = "4.0.0";
export const OFFICIAL_RANGED_ATTACK_V4_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_RANGED_ATTACK_V4_ACTION_TYPE = OFFICIAL_RANGED_ATTACK_V3_ACTION_TYPE;

export const OFFICIAL_RANGED_ATTACK_V4_NEW_ATOM_IDS = Object.freeze([
  "rule-atom:modified-target-number-bounds",
  "rule-atom:negative-modifier-direction",
  "rule-atom:singleton:core-11-anti-evade-modifier:030a03ac0c7a",
  "rule-atom:singleton:core-11-engaged-ranged-restrictions:5b63825758c0",
  "rule-atom:singleton:core-11-modifier-target-not-result:ba0342baab13",
  "rule-atom:singleton:core-11-modifier-target-number-timing:f9150dba9358",
  "rule-atom:singleton:core-11-natural-roll-modifier-priority:d1b9fa6ee229",
  "rule-atom:singleton:core-12-4-ranged-evade-step:de35dcec4ab2",
  "rule-atom:singleton:core-3-4-modifier-target-and-timing:3ef35dff8a07",
  "rule-atom:singleton:core-3-6-natural-roll-boundaries:3fcbc5078b1b",
  "rule-atom:singleton:core-5-1-evade-null-value:18d8c800e5a6",
  "rule-atom:singleton:core-5-1-evade:037c6ad13443",
  "rule-atom:singleton:core-8-7-3-engaged-targeting:9025d57d1dfd",
  "rule-atom:singleton:core-8-7-4-evade-before-damage:91d84abadc6a",
  "rule-atom:singleton:core-8-7-4-evade-eligibility:22a3e7f37955",
  "rule-atom:singleton:core-8-7-4-evade-result:491da6621715",
].sort((left, right) => left.localeCompare(right)));

export const OFFICIAL_RANGED_ATTACK_V4_DEPENDENCY_ATOM_IDS = Object.freeze([
  ...OFFICIAL_RANGED_ATTACK_V3_DEPENDENCY_ATOM_IDS,
]);

export const OFFICIAL_RANGED_ATTACK_V4_EXECUTOR_ATOM_IDS = Object.freeze([
  ...new Set([
    ...OFFICIAL_RANGED_ATTACK_V3_EXECUTOR_ATOM_IDS,
    ...OFFICIAL_RANGED_ATTACK_V4_NEW_ATOM_IDS,
  ]),
].sort((left, right) => left.localeCompare(right)));

export const OFFICIAL_RANGED_ATTACK_V4_ACTION_ATOM_IDS = Object.freeze([
  ...new Set([
    ...OFFICIAL_RANGED_ATTACK_V4_DEPENDENCY_ATOM_IDS,
    ...OFFICIAL_RANGED_ATTACK_V4_EXECUTOR_ATOM_IDS,
  ]),
].sort((left, right) => left.localeCompare(right)));

const SIDE_KEYS = Object.freeze(["player1", "player2"]);
const KERNEL = createOfficialAttackResolutionKernelV3();
const ADEPT_RECORD_KEY = "army_units:adept";
const MARINE_RECORD_KEY = "army_units:marine";
const ATTACKER_SCOPE = Object.freeze({
  recordKey: ADEPT_RECORD_KEY,
  weaponName: "Glaive Cannon",
  profileKey: "army_units:adept::assault::Glaive Cannon",
  currentModels: 1,
  currentSupply: 0,
  baseDiameterMilliInches: 1575,
  printedBaseDiameter: "Ø 40MM",
  sourceLocator:
    "official-p2p/StarCraft-Protoss-P2P-Card-Sheets-A4_EN.txt#Adept:Ø40MM",
});
const TARGET_SCOPE = Object.freeze({
  recordKey: MARINE_RECORD_KEY,
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
  fail("RANGED_ATTACK_V4_SIDE_REQUIRED");
}

function milli(value, code) {
  const result = Math.round(Number(value) * 1000);
  if (!Number.isSafeInteger(result)) fail(code);
  return result;
}

function validateState(state) {
  if (!object(state) || !object(state.players) || !object(state.board)
    || !Array.isArray(state.pieces)) {
    fail("RANGED_ATTACK_V4_STATE_INVALID");
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
    fail("RANGED_ATTACK_V4_DATA_SNAPSHOT_MISMATCH");
  }
  return { catalogue, combatBundle: gameplayBundle.combatProfileBundle };
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
    || milli(models[0].baseWidthInches, "RANGED_ATTACK_V4_BASE_SCOPE_UNSUPPORTED")
      !== scope.baseDiameterMilliInches
    || milli(models[0].baseDepthInches, "RANGED_ATTACK_V4_BASE_SCOPE_UNSUPPORTED")
      !== scope.baseDiameterMilliInches
    || models[0].elevation !== "ground"
    || !isDeepStrictEqual(models[0].supportTerrainIds, [])
    || !isDeepStrictEqual(models[0].adjacentAccessPointIds, [])) {
    fail("RANGED_ATTACK_V4_UNIT_SCOPE_UNSUPPORTED", role);
  }
  return models[0];
}

function baseGapMilliInches(left, leftScope, right, rightScope) {
  return Math.max(0, Math.round(Math.hypot(
    milli(right.xInches, "RANGED_ATTACK_V4_MODEL_GEOMETRY_INVALID")
      - milli(left.xInches, "RANGED_ATTACK_V4_MODEL_GEOMETRY_INVALID"),
    milli(right.yInches, "RANGED_ATTACK_V4_MODEL_GEOMETRY_INVALID")
      - milli(left.yInches, "RANGED_ATTACK_V4_MODEL_GEOMETRY_INVALID"),
  ) - (leftScope.baseDiameterMilliInches / 2) - (rightScope.baseDiameterMilliInches / 2)));
}

function exactEngagementEdge(state, graph, piece, target) {
  const active = state.pieces.filter(activePiece);
  const edges = graph.modelEdges.filter((edge) => (
    new Set([edge.leftUnitId, edge.rightUnitId]).has(piece.id)
      && new Set([edge.leftUnitId, edge.rightUnitId]).has(target.id)
  ));
  if (active.length !== 2
    || graph.modelEdges.length !== 1
    || edges.length !== 1
    || !graph.engagedUnitIds.includes(piece.id)
    || !graph.engagedUnitIds.includes(target.id)) {
    fail("RANGED_ATTACK_V4_ENGAGED_TARGET_REQUIRED");
  }
  return edges[0];
}

function antiEvadeContext(state, sideKey, piece, target, bindings, graph) {
  if (state.phase !== "assault") fail("RANGED_ATTACK_V4_WRONG_PHASE");
  if (state.activeSideKey !== sideKey) fail("RANGED_ATTACK_V4_NOT_ACTIVE_SIDE");
  if (state.players?.[sideKey]?.passedPhases?.assault === true) {
    fail("RANGED_ATTACK_V4_SIDE_PASSED");
  }
  if (!activePiece(piece) || piece.sideKey !== sideKey) {
    fail("RANGED_ATTACK_V4_UNIT_UNAVAILABLE");
  }
  if (!activePiece(target) || target.sideKey !== otherSide(sideKey)) {
    fail("RANGED_ATTACK_V4_TARGET_UNAVAILABLE");
  }
  if (piece.activatedPhases?.assault === true) fail("RANGED_ATTACK_V4_ALREADY_ACTIVATED");
  if ((state.board.terrain || []).length !== 0 || (state.board.accessPoints || []).length !== 0) {
    fail("RANGED_ATTACK_V4_TERRAIN_SCOPE_UNSUPPORTED");
  }
  if (piece.disengageAssaultRestriction !== undefined
    && piece.disengageAssaultRestriction !== null) {
    fail("RANGED_ATTACK_V4_POST_DISENGAGE_SCOPE_UNSUPPORTED");
  }
  if (piece.officialUnitRecordKey !== ADEPT_RECORD_KEY
    || target.officialUnitRecordKey !== MARINE_RECORD_KEY) {
    fail("RANGED_ATTACK_V4_UNIT_SCOPE_UNSUPPORTED");
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
    ATTACKER_SCOPE,
    "attacker",
  );
  const targetModel = exactScopedModel(
    target,
    targetCombatProfile,
    TARGET_SCOPE,
    "target",
  );
  const engagementEdge = exactEngagementEdge(state, graph, piece, target);
  const damageMarker = Number(target.damageMarker || 0);
  if (targetCombatProfile.shield !== 0
    || targetCombatProfile.evadeThreshold === null
    || !Number.isSafeInteger(damageMarker)
    || damageMarker < 0
    || damageMarker >= targetCombatProfile.hitPoints) {
    fail("RANGED_ATTACK_V4_TARGET_DAMAGE_SCOPE_UNSUPPORTED");
  }
  const attackProfile = getOfficialAttackProfileV1(bindings.catalogue, {
    recordKey: ADEPT_RECORD_KEY,
    phase: "assault",
    weaponName: ATTACKER_SCOPE.weaponName,
  });
  if (attackProfile.profileKey !== ATTACKER_SCOPE.profileKey
    || attackProfile.sourceRecordHash !== attackerCombatProfile.sourceRecordHash) {
    fail("RANGED_ATTACK_V4_PROFILE_SOURCE_MISMATCH");
  }
  const antiEvade = attackProfile.effects.find((effect) => (
    effect.effectAtomId === "attack-effect:anti-evade-v1"
  ));
  if (!antiEvade || antiEvade.parameters?.evadeThresholdModifier !== -1) {
    fail("RANGED_ATTACK_V4_ANTI_EVADE_PROFILE_MISMATCH");
  }
  const baseGap = baseGapMilliInches(
    attackerModel,
    ATTACKER_SCOPE,
    targetModel,
    TARGET_SCOPE,
  );
  const plan = KERNEL.plan({
    profile: attackProfile,
    target: {
      armourThreshold: targetCombatProfile.armourThreshold,
      evadeThreshold: targetCombatProfile.evadeThreshold,
      combatTags: targetCombatProfile.combatTags,
    },
    distanceInches: Number((baseGap / 1000).toFixed(3)),
    evadeEligibility: {
      eligible: true,
      reason: "target_engaged_and_suffering_ranged_damage",
    },
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
    antiEvade,
    plan,
    engagementEdge,
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

function v4Action(candidate) {
  return {
    ...candidate,
    ruleAtomIds: [...OFFICIAL_RANGED_ATTACK_V4_ACTION_ATOM_IDS],
    executorId: OFFICIAL_RANGED_ATTACK_V4_EXECUTOR_ID,
    executorVersion: OFFICIAL_RANGED_ATTACK_V4_EXECUTOR_VERSION,
    details: {
      ...candidate.details,
      executorPath: "historical_v3_delegate",
      delegatedExecutorId: OFFICIAL_RANGED_ATTACK_V3_EXECUTOR_ID,
      delegatedExecutorVersion: OFFICIAL_RANGED_ATTACK_V3_EXECUTOR_VERSION,
      trainingTruth: false,
    },
  };
}

function canonicalAntiEvadeAction(sideKey, piece, target, context) {
  return {
    actionType: OFFICIAL_RANGED_ATTACK_V4_ACTION_TYPE,
    sideKey,
    phase: "assault",
    pieceId: piece.id,
    targetId: target.id,
    weaponName: context.attackProfile.weaponName,
    chance: clone(context.plan.chance),
    ruleAtomIds: [...OFFICIAL_RANGED_ATTACK_V4_ACTION_ATOM_IDS],
    executorId: OFFICIAL_RANGED_ATTACK_V4_EXECUTOR_ID,
    executorVersion: OFFICIAL_RANGED_ATTACK_V4_EXECUTOR_VERSION,
  };
}

function disabledContext(bindings) {
  const attackProfile = getOfficialAttackProfileV1(bindings.catalogue, {
    recordKey: ADEPT_RECORD_KEY,
    phase: "assault",
    weaponName: ATTACKER_SCOPE.weaponName,
  });
  const targetProfile = getOfficialCombatProfileV1(bindings.combatBundle, MARINE_RECORD_KEY);
  return {
    attackProfile,
    plan: KERNEL.plan({
      profile: attackProfile,
      target: {
        armourThreshold: targetProfile.armourThreshold,
        evadeThreshold: targetProfile.evadeThreshold,
        combatTags: targetProfile.combatTags,
      },
      distanceInches: 0,
      evadeEligibility: {
        eligible: true,
        reason: "target_engaged_and_suffering_ranged_damage",
      },
    }),
  };
}

function enumerateAntiEvade(state, options = {}) {
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
      && entry.officialUnitRecordKey === ADEPT_RECORD_KEY
  ))) {
    for (const target of state.pieces.filter((entry) => (
      entry.sideKey === otherSide(sideKey)
        && activePiece(entry)
        && entry.officialUnitRecordKey === MARINE_RECORD_KEY
    ))) {
      let context;
      let disabledReason = "";
      try {
        context = antiEvadeContext(state, sideKey, piece, target, bindings, graph);
      } catch (error) {
        disabledReason = String(error?.message || error).split(":")[0];
      }
      if (!context) {
        if (options.includeDisabled !== true) continue;
        try {
          context = disabledContext(bindings);
        } catch {
          continue;
        }
      }
      rows.push({
        ...canonicalAntiEvadeAction(sideKey, piece, target, context),
        isEnabled: !disabledReason,
        disabledReason,
        score: disabledReason ? 0 : 200,
        details: {
          sourceRule:
            "official_core_3_4_3_6_5_1_8_7_3_8_7_4_11_anti_evade_modifier_and_quick_reference_12_4",
          officialAttackProfileCatalogueHash: bindings.catalogue.catalogueHash,
          attackResolutionKernelHash: KERNEL.descriptor.kernelHash,
          attackPlanHash: context.plan.planHash,
          effectAtomIds: [...context.plan.effectAtomIds],
          engagementGraphHash: graph.graphHash,
          engagementEdgeHash: context.engagementEdge
            ? hashStarcraftTmgContract(context.engagementEdge)
            : "",
          lineOfSightReceiptHash: context.lineOfSightReceipt?.receiptHash || "",
          distanceInches: context.plan.distanceInches,
          rangeBand: context.plan.rangeBand,
          effectiveHitThreshold: context.plan.effectiveHitThreshold,
          engagedTarget: Boolean(context.engagementEdge),
          evadeEligibilityReason: context.plan.evade.eligibilityReason,
          baseEvadeThreshold: context.plan.evade.baseThreshold,
          antiEvadeModifier: context.plan.evade.modifier,
          effectiveEvadeThreshold: context.plan.evade.effectiveThreshold,
          modifierAppliedBeforeRoll: true,
          modifiesDieResult: false,
          executorPath: "anti_evade_v4",
          supportedScope:
            "single_model_unmodified_adept_glaive_cannon_vs_exactly_engaged_single_model_unmodified_marine_no_terrain_no_shield",
          rulesTruth:
            "official_current_profile_bound_atomic_anti_evade_and_engaged_ranged_evade_subset",
          trainingTruth: false,
        },
      });
    }
  }
  return rows;
}

export function enumerateOfficialRangedAttackActionsV4(state, options = {}) {
  validateState(state);
  const sideKey = String(options.sideKey || state.activeSideKey || "").trim();
  if (!SIDE_KEYS.includes(sideKey)) fail("RANGED_ATTACK_V4_SIDE_REQUIRED");
  const historical = enumerateOfficialRangedAttackActionsV3(state, options).map(v4Action);
  return [...historical, ...enumerateAntiEvade(state, options)].sort((left, right) => (
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

function delegateHistoricalV3(stateInput, expectedAction, options) {
  const legacyCandidate = enumerateOfficialRangedAttackActionsV3(stateInput, {
    sideKey: expectedAction.sideKey,
    matchBinding: options.matchBinding,
  }).find((candidate) => (
    candidate.pieceId === expectedAction.pieceId
      && candidate.targetId === expectedAction.targetId
      && candidate.weaponName === expectedAction.weaponName
  ));
  if (!legacyCandidate) fail("RANGED_ATTACK_V4_ACTION_STALE");
  const applied = applyOfficialRangedAttackV3(
    stateInput,
    actionFromCandidate(legacyCandidate),
    options,
  );
  const state = applied.state;
  const lastLog = state.log?.at(-1);
  if (lastLog) lastLog.action = clone(expectedAction);
  return {
    ...applied,
    schemaVersion: "starcraft_tmg_official_ranged_attack_transition_v4",
    executorId: OFFICIAL_RANGED_ATTACK_V4_EXECUTOR_ID,
    executorVersion: OFFICIAL_RANGED_ATTACK_V4_EXECUTOR_VERSION,
    state,
    action: expectedAction,
    delegatedExecutor: {
      executorId: OFFICIAL_RANGED_ATTACK_V3_EXECUTOR_ID,
      executorVersion: OFFICIAL_RANGED_ATTACK_V3_EXECUTOR_VERSION,
    },
    rulesTruth: "official_current_profile_bound_atomic_ranged_attack_subset_v4",
    trainingTruth: false,
  };
}

export function applyOfficialRangedAttackV4(stateInput, actionInput, options = {}) {
  validateState(stateInput);
  if (!object(actionInput)
    || actionInput.actionType !== OFFICIAL_RANGED_ATTACK_V4_ACTION_TYPE
    || actionInput.executorId !== OFFICIAL_RANGED_ATTACK_V4_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_RANGED_ATTACK_V4_EXECUTOR_VERSION) {
    fail("RANGED_ATTACK_V4_ACTION_INVALID");
  }
  const candidates = enumerateOfficialRangedAttackActionsV4(stateInput, {
    sideKey: actionInput.sideKey,
    matchBinding: options.matchBinding,
  });
  const expectedCandidate = candidates.find((candidate) => (
    candidate.pieceId === actionInput.pieceId
      && candidate.targetId === actionInput.targetId
      && candidate.weaponName === actionInput.weaponName
  ));
  if (!expectedCandidate) fail("RANGED_ATTACK_V4_ACTION_STALE");
  const expectedAction = actionFromCandidate(expectedCandidate);
  if (!isDeepStrictEqual(actionInput, expectedAction)) fail("RANGED_ATTACK_V4_ACTION_MISMATCH");
  const pieceBefore = stateInput.pieces.find((piece) => piece.id === actionInput.pieceId);
  if (pieceBefore?.officialUnitRecordKey !== ADEPT_RECORD_KEY) {
    return delegateHistoricalV3(stateInput, expectedAction, options);
  }

  const bindings = verifyProfileBinding(stateInput, options.matchBinding);
  const graph = deriveOfficialEngagementGraphV2(stateInput);
  const targetBefore = stateInput.pieces.find((piece) => piece.id === actionInput.targetId);
  const context = antiEvadeContext(
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
    type: OFFICIAL_RANGED_ATTACK_V4_ACTION_TYPE,
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
        printedBaseDiameter: ATTACKER_SCOPE.printedBaseDiameter,
        sourceLocator: ATTACKER_SCOPE.sourceLocator,
      },
      target: {
        printedBaseDiameter: TARGET_SCOPE.printedBaseDiameter,
        sourceLocator: TARGET_SCOPE.sourceLocator,
      },
    },
    engagementGraphHash: graph.graphHash,
    engagedTargeting: {
      required: true,
      attackerEngaged: true,
      targetEngaged: true,
      engagementEdge: clone(context.engagementEdge),
      engagementEdgeHash: hashStarcraftTmgContract(context.engagementEdge),
    },
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
    antiEvade: {
      effectAtomId: "attack-effect:anti-evade-v1",
      applied: stages.effects.antiEvadeApplied,
      modifier: stages.effects.antiEvadeModifier,
      targetNumberDelta: stages.effects.antiEvadeTargetNumberDelta,
      baseThreshold: stages.evade.baseThreshold,
      effectiveThreshold: stages.evade.effectiveThreshold,
      modifierAppliedBeforeRoll: true,
      modifiesDieResult: false,
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
    stageOrder: ["declaration", "hit", "effects", "armour", "evade", "damage"],
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
    schemaVersion: "starcraft_tmg_official_ranged_attack_transition_v4",
    executorId: OFFICIAL_RANGED_ATTACK_V4_EXECUTOR_ID,
    executorVersion: OFFICIAL_RANGED_ATTACK_V4_EXECUTOR_VERSION,
    postRevision: Number(options.postRevision || 0),
    state,
    events,
    action: expectedAction,
    rulesTruth:
      "official_current_profile_bound_atomic_anti_evade_and_engaged_ranged_evade_subset",
    trainingTruth: false,
  };
}

export const OFFICIAL_RANGED_ATTACK_V4_HISTORICAL_ACTION_ATOM_IDS =
  OFFICIAL_RANGED_ATTACK_V3_ACTION_ATOM_IDS;
