import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { getOfficialCombatProfileV1 } from
  "../source-data/official-combat-profile-bundle-v1.mjs";
import { verifyOfficialGameplayDataBundleV1 } from
  "../source-data/official-gameplay-data-bundle-v1.mjs";
import {
  createOfficialCloseCombatPrecisionKernelV1,
} from "./official-close-combat-precision-kernel-v1.mjs";
import { OFFICIAL_CLOSE_COMBAT_ATTACK_ACTION_ATOM_IDS } from
  "./official-close-combat-attack-executor-v1.mjs";
import { deriveOfficialEngagementGraphV2 } from
  "./official-engagement-graph-v2.mjs";
import {
  OFFICIAL_MARINE_STIMPACK_KERNEL_NEW_ATOM_IDS,
  OFFICIAL_STIMPACK_MARKER_SCHEMA,
  OFFICIAL_STIMPACK_STATUS_SCHEMA,
  verifyOfficialStimpackMarkerV1,
  verifyOfficialStimpackStatusV1,
} from "./official-marine-stimpack-kernel-v1.mjs";
import { OFFICIAL_REPLACEMENT_WEAPON_LOADOUT_ATOM_IDS } from
  "./official-weapon-replacement-loadout-v1.mjs";

export const OFFICIAL_STIMPACK_CLOSE_COMBAT_EXECUTOR_ID =
  "authority.stimpack-close-combat-consumer-v1";
export const OFFICIAL_STIMPACK_CLOSE_COMBAT_EXECUTOR_VERSION = "1.0.0";
export const OFFICIAL_STIMPACK_CLOSE_COMBAT_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_STIMPACK_CLOSE_COMBAT_ATTACK_ACTION_TYPE = "fight";
export const OFFICIAL_RESOLVE_STIMPACK_CLOSE_COMBAT_PRECISION_ACTION_TYPE =
  "resolve_close_combat_precision";
export const OFFICIAL_STIMPACK_CLOSE_COMBAT_PENDING_SCHEMA =
  "starcraft_tmg_official_stimpack_close_combat_precision_pending_v1";
export const OFFICIAL_STIMPACK_CLOSE_COMBAT_NEW_ATOM_IDS = Object.freeze([]);
export const OFFICIAL_STIMPACK_CLOSE_COMBAT_ACTION_ATOM_IDS = Object.freeze([
  ...new Set([
    ...OFFICIAL_CLOSE_COMBAT_ATTACK_ACTION_ATOM_IDS,
    ...OFFICIAL_MARINE_STIMPACK_KERNEL_NEW_ATOM_IDS,
    ...OFFICIAL_REPLACEMENT_WEAPON_LOADOUT_ATOM_IDS,
  ]),
].sort((left, right) => left.localeCompare(right)));
export const OFFICIAL_STIMPACK_CLOSE_COMBAT_EXECUTOR_ATOM_IDS =
  OFFICIAL_STIMPACK_CLOSE_COMBAT_ACTION_ATOM_IDS;

const CURRENT_SOURCE_SNAPSHOT_HASH =
  "2407d2536278776692c9116cb74c4147e15f2aa6ff9af9204141e5620220bd78";
const CURRENT_DATASET_HASH =
  "40ba72534a2165131288ec77ccf67984baf5f740e58c4f94283b46137a54757a";
const CURRENT_GAMEPLAY_BUNDLE_HASH =
  "35cd2e1a7a7cb7575f0525dbf6ff08fa0a5285b5fcf89e6b901976f532f1463b";
const MARINE_RECORD_KEY = "army_units:marine";
const MARINE_SOURCE_RECORD_HASH =
  "682a2ea237c32dc25cc7c389c3b949705326bba6c416085c39dda2388dd3f215";
const MARINE_PAYLOAD_HASH =
  "33cbc0b9e9e17ca95f1cd639f78d81e8ec7606f035642e32fdf7064bcc49d1e6";
const BAYONET_SOURCE_TEXT_HASH =
  "9b0f85969b11da20c6d837f23a06335f8572bfd798460de3083ed124cef9205a";
const STRIKE_SOURCE_TEXT_HASH =
  "b0156a37c3e3890968e8fe1f14932d8ebcc9dd9920d00c1cc7a6e27dc50a039a";
const MARINE_BASE_MILLI_INCHES = 1260;
const SIDE_KEYS = Object.freeze(["player1", "player2"]);
const KERNEL = createOfficialCloseCombatPrecisionKernelV1();

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
    model?.isOnField !== false && model?.isDestroyed !== true
  ));
}

function otherSide(sideKey) {
  if (sideKey === "player1") return "player2";
  if (sideKey === "player2") return "player1";
  fail("STIMPACK_CLOSE_COMBAT_SIDE_REQUIRED");
}

function milli(value, code) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) fail(code);
  const result = Math.round(parsed * 1000);
  if (!Number.isSafeInteger(result)) fail(code);
  return result;
}

function verifyBindings(state, matchBinding) {
  if (!object(state)
    || !object(state.players)
    || !object(state.board)
    || !Array.isArray(state.pieces)) {
    fail("STIMPACK_CLOSE_COMBAT_STATE_INVALID");
  }
  const gameplay = state.officialGameplayDataBundle;
  verifyOfficialGameplayDataBundleV1(gameplay);
  if (!object(matchBinding)
    || hashStarcraftTmgContract(gameplay) !== matchBinding.dataSnapshotHash
    || gameplay.gameplayDataBundleHash !== CURRENT_GAMEPLAY_BUNDLE_HASH
    || gameplay.sourceSnapshotHash !== CURRENT_SOURCE_SNAPSHOT_HASH
    || gameplay.normalizedDatasetHash !== CURRENT_DATASET_HASH
    || gameplay.repositoryFallbackAllowed !== false
    || !isDeepStrictEqual(gameplay.dataVersions, {
      cardsVersion: "69",
      rulesVersion: "48",
      unitsVersion: "71",
    })) {
    fail("STIMPACK_CLOSE_COMBAT_LATEST_OFFICIAL_DATA_REQUIRED");
  }
  const marine = getOfficialCombatProfileV1(
    gameplay.combatProfileBundle,
    MARINE_RECORD_KEY,
  );
  if (marine.sourceRecordHash !== MARINE_SOURCE_RECORD_HASH
    || marine.payloadHash !== MARINE_PAYLOAD_HASH
    || marine.unitName !== "Marine"
    || marine.hitPoints !== 2
    || marine.armourThreshold !== 5
    || marine.evadeThreshold !== 5
    || marine.shield !== 0
    || !isDeepStrictEqual(marine.combatTags, ["biological", "ground", "light"])
    || marine.combatWeapons.length !== 2) {
    fail("STIMPACK_CLOSE_COMBAT_MARINE_PROFILE_DRIFT");
  }
  const strike = marine.combatWeapons.find((weapon) => weapon.weaponName === "Strike");
  const bayonet = marine.combatWeapons.find((weapon) => weapon.weaponName === "Bayonet");
  if (strike?.linkedTo !== "-"
    || strike?.costSmall !== 0
    || strike?.costLarge !== 0
    || strike?.range !== "engagement"
    || !isDeepStrictEqual(strike?.targetTags, ["ground"])
    || strike?.rateOfAttack !== 1
    || strike?.hitThreshold !== 5
    || strike?.damage !== 1
    || strike?.surge !== null
    || strike?.behaviorText !== ""
    || strike?.sourceTextHash !== STRIKE_SOURCE_TEXT_HASH
    || bayonet?.linkedTo !== "Strike"
    || bayonet?.costSmall !== 20
    || bayonet?.costLarge !== 30
    || bayonet?.range !== "engagement"
    || !isDeepStrictEqual(bayonet?.targetTags, ["ground"])
    || bayonet?.rateOfAttack !== 2
    || bayonet?.hitThreshold !== 5
    || bayonet?.damage !== 1
    || bayonet?.surge !== null
    || bayonet?.behaviorText !== ""
    || bayonet?.sourceTextHash !== BAYONET_SOURCE_TEXT_HASH) {
    fail("STIMPACK_CLOSE_COMBAT_WEAPON_PROFILE_DRIFT");
  }
  return { gameplay, marine, strike, bayonet };
}

function exactMarine(piece, sideKey, role, stimpacked, selectedUpgrades = []) {
  const models = activeModels(piece);
  if (!activePiece(piece)
    || piece.sideKey !== sideKey
    || piece.officialUnitRecordKey !== MARINE_RECORD_KEY
    || piece.sourceRecordHash !== MARINE_SOURCE_RECORD_HASH
    || piece.officialPayloadHash !== MARINE_PAYLOAD_HASH
    || Number(piece.currentModels) !== 1
    || Number(piece.maxModels) !== 1
    || Number(piece.currentSupply) !== 0
    || models.length !== 1
    || !isDeepStrictEqual(piece.destroyedModelIds || [], [])
    || piece.combatTag !== "ground"
    || !isDeepStrictEqual(piece.combatTags, ["biological", "ground", "light"])
    || !isDeepStrictEqual(piece.combatEffects || [], [])
    || !isDeepStrictEqual(piece.assaultEffects || [], [])
    || models[0].baseShape !== "round"
    || milli(models[0].baseWidthInches, "STIMPACK_CLOSE_COMBAT_BASE_UNSUPPORTED")
      !== MARINE_BASE_MILLI_INCHES
    || milli(models[0].baseDepthInches, "STIMPACK_CLOSE_COMBAT_BASE_UNSUPPORTED")
      !== MARINE_BASE_MILLI_INCHES
    || models[0].elevation !== "ground"
    || !isDeepStrictEqual(models[0].supportTerrainIds || [], [])
    || !isDeepStrictEqual(models[0].adjacentAccessPointIds || [], [])) {
    fail("STIMPACK_CLOSE_COMBAT_MARINE_SCOPE_UNSUPPORTED", role);
  }
  milli(models[0].xInches, "STIMPACK_CLOSE_COMBAT_GEOMETRY_INVALID");
  milli(models[0].yInches, "STIMPACK_CLOSE_COMBAT_GEOMETRY_INVALID");
  const statuses = Array.isArray(piece.statuses) ? piece.statuses : [];
  if (stimpacked) {
    if (!isDeepStrictEqual(piece.selectedUpgradeNames || [], selectedUpgrades)
      || Number(piece.damageMarker || 0) !== 2
      || statuses.length !== 1
      || statuses[0]?.schema !== OFFICIAL_STIMPACK_STATUS_SCHEMA) {
      fail("STIMPACK_CLOSE_COMBAT_EXACT_STATUS_REQUIRED", role);
    }
    verifyOfficialStimpackStatusV1(statuses[0]);
    if (statuses[0].targetPieceId !== piece.id) {
      fail("STIMPACK_CLOSE_COMBAT_STATUS_BINDING_INVALID", role);
    }
    return { model: models[0], status: statuses[0] };
  }
  if (!isDeepStrictEqual(piece.selectedUpgradeNames || [], selectedUpgrades)
    || Number(piece.damageMarker || 0) !== 0
    || statuses.length !== 0) {
    fail("STIMPACK_CLOSE_COMBAT_TARGET_SCOPE_UNSUPPORTED", role);
  }
  return { model: models[0], status: null };
}

function exactMarker(state, status) {
  if (!Array.isArray(state.board.effectMarkers)
    || state.board.effectMarkers.length !== 1
    || state.board.effectMarkers[0]?.schema !== OFFICIAL_STIMPACK_MARKER_SCHEMA) {
    fail("STIMPACK_CLOSE_COMBAT_EXACT_MARKER_REQUIRED");
  }
  verifyOfficialStimpackMarkerV1(state.board.effectMarkers[0], status);
  return state.board.effectMarkers[0];
}

function ranksFor(graph, attackerId, targetId) {
  const fightingModelIds = [...new Set(graph.modelEdges.flatMap((edge) => {
    if (edge.leftUnitId === attackerId && edge.rightUnitId === targetId) {
      return [edge.leftModelId];
    }
    if (edge.rightUnitId === attackerId && edge.leftUnitId === targetId) {
      return [edge.rightModelId];
    }
    return [];
  }))].sort((left, right) => left.localeCompare(right));
  return { fightingModelIds, supportingModelIds: [] };
}

function contextFor(state, sideKey, piece, target, bindings, graph) {
  if (state.phase !== "combat") fail("STIMPACK_CLOSE_COMBAT_WRONG_PHASE");
  if (state.activeSideKey !== sideKey) fail("STIMPACK_CLOSE_COMBAT_NOT_ACTIVE_SIDE");
  if (state.players?.[sideKey]?.passedPhases?.combat === true) {
    fail("STIMPACK_CLOSE_COMBAT_SIDE_PASSED");
  }
  if (piece?.activatedPhases?.combat === true) {
    fail("STIMPACK_CLOSE_COMBAT_ALREADY_ACTIVATED");
  }
  if (state.pieces.length !== 2
    || state.pieces.some((entry) => entry.officialUnitRecordKey !== MARINE_RECORD_KEY)
    || (state.board.terrain || []).length !== 0
    || (state.board.accessPoints || []).length !== 0) {
    fail("STIMPACK_CLOSE_COMBAT_EXACT_PAIR_SCOPE_REQUIRED");
  }
  const selectedUpgrades = piece?.selectedUpgradeNames || [];
  const stimpacked = ["Stimpack", "Bayonet:Stimpack"].includes(
    selectedUpgrades.join(":"),
  );
  const ordinary = ["", "Bayonet"].includes(selectedUpgrades.join(":"));
  if (!stimpacked && !ordinary) {
    fail("STIMPACK_CLOSE_COMBAT_SELECTED_LOADOUT_UNSUPPORTED");
  }
  const attacker = exactMarine(
    piece,
    sideKey,
    "attacker",
    stimpacked,
    selectedUpgrades,
  );
  const defender = exactMarine(target, otherSide(sideKey), "target", false, []);
  const marker = stimpacked ? exactMarker(state, attacker.status) : null;
  if (!stimpacked && (state.board.effectMarkers || []).length !== 0) {
    fail("STIMPACK_CLOSE_COMBAT_ORDINARY_MARKER_UNEXPECTED");
  }
  const relevantEdges = graph.modelEdges.filter((edge) => (
    [edge.leftUnitId, edge.rightUnitId].includes(piece.id)
      && [edge.leftUnitId, edge.rightUnitId].includes(target.id)
  ));
  if (graph.modelEdges.length !== 1
    || relevantEdges.length !== 1
    || !graph.engagedUnitIds.includes(piece.id)
    || !graph.engagedUnitIds.includes(target.id)) {
    fail("STIMPACK_CLOSE_COMBAT_EXACT_ENGAGEMENT_REQUIRED");
  }
  const ranks = ranksFor(graph, piece.id, target.id);
  if (!isDeepStrictEqual(ranks.fightingModelIds, [attacker.model.id])) {
    fail("STIMPACK_CLOSE_COMBAT_FIGHTING_RANK_INVALID");
  }
  const bayonetSelected = selectedUpgrades.includes("Bayonet");
  const weapon = bayonetSelected ? bindings.bayonet : bindings.strike;
  const replacedWeaponName = bayonetSelected ? "Strike" : null;
  const attackDice = weapon.rateOfAttack;
  const targetProfile = {
    recordKey: MARINE_RECORD_KEY,
    armourThreshold: bindings.marine.armourThreshold,
    hitPoints: bindings.marine.hitPoints,
    shield: bindings.marine.shield,
    combatTags: bindings.marine.combatTags,
  };
  let plan;
  let grant = null;
  if (stimpacked) {
    plan = KERNEL.plan({
      attackerPieceId: piece.id,
      targetPieceId: target.id,
      weapon,
      target: targetProfile,
      eligibleModelCount: 1,
      attackDice,
      fightingModelIds: ranks.fightingModelIds,
      supportingModelIds: [],
      engagementGraphHash: graph.graphHash,
      statusEffectHash: attacker.status.statusEffectHash,
      precisionValue: attacker.status.precision,
    });
    grant = KERNEL.createGrant({ status: attacker.status, plan });
  } else {
    const planBody = {
      schema: "starcraft_tmg_official_ordinary_close_combat_plan_v1",
      attackerPieceId: piece.id,
      targetPieceId: target.id,
      weapon: clone(weapon),
      target: targetProfile,
      eligibleModelCount: 1,
      attackDice,
      fightingModelIds: [...ranks.fightingModelIds],
      supportingModelIds: [],
      engagementGraphHash: graph.graphHash,
      precisionAvailable: false,
      chance: {
        kind: "fixed_roll_sequence",
        faces: 6,
        count: attackDice * 2,
        layout: { hit: attackDice, armour: attackDice, evade: 0, surge: 0 },
      },
      trainingTruth: false,
    };
    plan = { ...planBody, planHash: hashStarcraftTmgContract(planBody) };
  }
  return {
    attacker,
    defender,
    marker,
    ranks,
    weapon,
    replacedWeaponName,
    stimpacked,
    plan,
    grant,
  };
}

function attackAction(sideKey, piece, target, context) {
  return {
    actionType: OFFICIAL_STIMPACK_CLOSE_COMBAT_ATTACK_ACTION_TYPE,
    sideKey,
    phase: "combat",
    pieceId: piece.id,
    targetId: target.id,
    weaponName: context.weapon.weaponName,
    replacedWeaponName: context.replacedWeaponName,
    closeRanksMode: "decline",
    resolutionMode: context.stimpacked
      ? "precision_pending_choice"
      : "ordinary_no_precision",
    attackPlanHash: context.plan.planHash,
    statusEffectHash: context.attacker.status?.statusEffectHash || null,
    markerHash: context.marker?.markerHash || null,
    precisionGrantHash: context.grant?.precisionGrantHash || null,
    chance: clone(context.plan.chance),
    ruleAtomIds: [...OFFICIAL_STIMPACK_CLOSE_COMBAT_ACTION_ATOM_IDS],
    executorId: OFFICIAL_STIMPACK_CLOSE_COMBAT_EXECUTOR_ID,
    executorVersion: OFFICIAL_STIMPACK_CLOSE_COMBAT_EXECUTOR_VERSION,
  };
}

function verifyPending(pending) {
  if (!object(pending)
    || pending.schema !== OFFICIAL_STIMPACK_CLOSE_COMBAT_PENDING_SCHEMA
    || !SIDE_KEYS.includes(pending.ownerSideKey)
    || pending.phase !== "combat"
    || !object(pending.attackPlan)
    || !object(pending.precisionGrant)
    || !object(pending.hitReveal)
    || !Array.isArray(pending.chanceReveals)
    || !Array.isArray(pending.precisionSelections)
    || pending.precisionSelections.length < 1
    || pending.trainingTruth !== false
    || pending.pendingHash !== hashStarcraftTmgContract(without(pending, ["pendingHash"]))) {
    fail("STIMPACK_CLOSE_COMBAT_PENDING_INVALID");
  }
  KERNEL.verifyPlan(pending.attackPlan);
  KERNEL.verifyGrant(pending.attackPlan, pending.precisionGrant);
  return pending;
}

function choiceAction(pending, selection) {
  return {
    actionType: OFFICIAL_RESOLVE_STIMPACK_CLOSE_COMBAT_PRECISION_ACTION_TYPE,
    sideKey: pending.ownerSideKey,
    phase: "combat",
    pieceId: pending.attackerPieceId,
    targetId: pending.targetPieceId,
    weaponName: pending.weaponName,
    pendingHash: pending.pendingHash,
    attackPlanHash: pending.attackPlan.planHash,
    hitRevealHash: pending.hitReveal.hitRevealHash,
    precisionGrantHash: pending.precisionGrant.precisionGrantHash,
    precisionSelectionHash: selection.precisionSelectionHash,
    convertedFailedDieIndices: [...selection.convertedFailedDieIndices],
    convertedCount: selection.convertedCount,
    ruleAtomIds: [...OFFICIAL_STIMPACK_CLOSE_COMBAT_ACTION_ATOM_IDS],
    executorId: OFFICIAL_STIMPACK_CLOSE_COMBAT_EXECUTOR_ID,
    executorVersion: OFFICIAL_STIMPACK_CLOSE_COMBAT_EXECUTOR_VERSION,
  };
}

function currentPendingContext(state, pending, options) {
  const bindings = verifyBindings(state, options.matchBinding);
  const graph = deriveOfficialEngagementGraphV2(state);
  const piece = state.pieces.find((entry) => entry.id === pending.attackerPieceId);
  const target = state.pieces.find((entry) => entry.id === pending.targetPieceId);
  const context = contextFor(
    state,
    pending.ownerSideKey,
    piece,
    target,
    bindings,
    graph,
  );
  if (context.weapon.weaponName !== pending.weaponName
    || !isDeepStrictEqual(context.plan, pending.attackPlan)
    || !isDeepStrictEqual(context.grant, pending.precisionGrant)
    || context.marker.markerHash !== pending.markerHash
    || context.attacker.status.statusEffectHash !== pending.statusEffectHash) {
    fail("STIMPACK_CLOSE_COMBAT_PENDING_STATE_DRIFT");
  }
  return { bindings, graph, piece, target, context };
}

export function isOfficialStimpackCloseCombatPendingV1(state) {
  return state?.pendingAction?.schema === OFFICIAL_STIMPACK_CLOSE_COMBAT_PENDING_SCHEMA;
}

export function enumerateOfficialStimpackCloseCombatConsumerV1(state, options = {}) {
  const sideKey = String(options.sideKey || state?.activeSideKey || "").trim();
  if (!SIDE_KEYS.includes(sideKey)) fail("STIMPACK_CLOSE_COMBAT_SIDE_REQUIRED");
  if (isOfficialStimpackCloseCombatPendingV1(state)) {
    try {
      const pending = verifyPending(state.pendingAction);
      if (sideKey !== pending.ownerSideKey
        || state.activeSideKey !== pending.ownerSideKey
        || state.phase !== "combat") {
        fail("STIMPACK_CLOSE_COMBAT_PENDING_WRONG_SEAT");
      }
      currentPendingContext(state, pending, options);
      return pending.precisionSelections.map((selection) => ({
        ...choiceAction(pending, selection),
        isEnabled: true,
        disabledReason: "",
        score: 310 + selection.convertedCount,
        details: {
          choiceTiming: "after_hit_roll_before_armour_pool",
          failedHitDieIndices: [...pending.hitReveal.failedHitDieIndices],
          maximumConvertedDice: pending.hitReveal.maximumConvertedDice,
          convertedFailedDieIndices: [...selection.convertedFailedDieIndices],
          convertedDiceAreHitsForAllPurposes: true,
          rulesTruth: "official_stimpack_close_combat_precision_exact_choice_domain",
          trainingTruth: false,
        },
      }));
    } catch (error) {
      if (options.throwOnError === true) throw error;
      return [];
    }
  }
  if (state?.pendingAction !== undefined && state?.pendingAction !== null) return [];
  let bindings;
  let graph;
  try {
    bindings = verifyBindings(state, options.matchBinding);
    graph = deriveOfficialEngagementGraphV2(state);
  } catch (error) {
    if (options.throwOnError === true) throw error;
    return [];
  }
  const rows = [];
  const diagnostics = [];
  for (const piece of state.pieces.filter((entry) => entry.sideKey === sideKey)) {
    for (const target of state.pieces.filter((entry) => entry.sideKey === otherSide(sideKey))) {
      try {
        const context = contextFor(state, sideKey, piece, target, bindings, graph);
        rows.push({
          ...attackAction(sideKey, piece, target, context),
          isEnabled: true,
          disabledReason: "",
          score: context.stimpacked
            ? context.weapon.weaponName === "Bayonet" ? 305 : 300
            : context.weapon.weaponName === "Bayonet" ? 285 : 280,
          details: {
            closeCombatPrecisionKernelHash: context.stimpacked
              ? KERNEL.descriptor.kernelHash
              : null,
            engagementGraphHash: graph.graphHash,
            selectedWeaponName: context.weapon.weaponName,
            replacedWeaponName: context.replacedWeaponName,
            attackDice: context.plan.attackDice,
            precisionAvailable: context.stimpacked,
            choiceTiming: context.stimpacked
              ? "after_hit_roll_before_armour_pool"
              : null,
            rulesTruth: context.stimpacked
              ? "official_current_stimpack_all_close_combat_weapons_precision_consumer_exact_subset"
              : "official_current_ordinary_close_combat_without_precision_exact_subset",
            trainingTruth: false,
          },
        });
      } catch (error) {
        diagnostics.push(error);
      }
    }
  }
  if (rows.length === 0 && options.throwOnError === true && diagnostics.length > 0) {
    throw diagnostics[0];
  }
  return rows.sort((left, right) => (
    `${left.pieceId}:${left.targetId}:${left.weaponName}`.localeCompare(
      `${right.pieceId}:${right.targetId}:${right.weaponName}`,
    )
  ));
}

function openChoice(stateInput, action, expected, options) {
  const bindings = verifyBindings(stateInput, options.matchBinding);
  const graph = deriveOfficialEngagementGraphV2(stateInput);
  const piece = stateInput.pieces.find((entry) => entry.id === action.pieceId);
  const target = stateInput.pieces.find((entry) => entry.id === action.targetId);
  const context = contextFor(stateInput, action.sideKey, piece, target, bindings, graph);
  const enumerated = KERNEL.enumerateSelections(
    context.plan,
    options.chanceReveals,
    context.grant,
  );
  const pendingBody = {
    schema: OFFICIAL_STIMPACK_CLOSE_COMBAT_PENDING_SCHEMA,
    round: Number(stateInput.round),
    phase: "combat",
    ownerSideKey: action.sideKey,
    attackerPieceId: piece.id,
    targetPieceId: target.id,
    weaponName: context.weapon.weaponName,
    triggerActionHash: hashStarcraftTmgContract(expected),
    attackPlan: clone(context.plan),
    precisionGrant: clone(context.grant),
    hitReveal: clone(enumerated.hitReveal),
    chanceReveals: clone(enumerated.reveals),
    precisionSelections: clone(enumerated.selections),
    statusEffectHash: context.attacker.status.statusEffectHash,
    markerHash: context.marker.markerHash,
    trainingTruth: false,
  };
  const pending = {
    ...pendingBody,
    pendingHash: hashStarcraftTmgContract(pendingBody),
  };
  const state = clone(stateInput);
  state.pendingAction = pending;
  const events = [{
    type: "stimpack_close_combat_precision_choice_opened",
    sideKey: action.sideKey,
    pieceId: piece.id,
    targetId: target.id,
    weaponName: context.weapon.weaponName,
    pendingHash: pending.pendingHash,
    failedHitDieIndices: [...pending.hitReveal.failedHitDieIndices],
    maximumConvertedDice: pending.hitReveal.maximumConvertedDice,
    legalSelectionCount: pending.precisionSelections.length,
    choiceTiming: "after_hit_roll_before_armour_pool",
    trainingTruth: false,
  }];
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({
    id: `log-${state.log.length + 1}`,
    round: Number(state.round || 1),
    phase: "combat",
    action: clone(expected),
    events: clone(events),
  });
  return {
    ok: true,
    schemaVersion:
      "starcraft_tmg_official_stimpack_close_combat_precision_pending_transition_v1",
    executorId: OFFICIAL_STIMPACK_CLOSE_COMBAT_EXECUTOR_ID,
    executorVersion: OFFICIAL_STIMPACK_CLOSE_COMBAT_EXECUTOR_VERSION,
    postRevision: Number(options.postRevision || 0),
    state,
    events,
    action: expected,
    pendingAction: pending,
    rulesTruth: "official_stimpack_close_combat_precision_choice_opened",
    trainingTruth: false,
  };
}

function destroyOneModelPiece(piece, model) {
  model.isDestroyed = true;
  model.isOnField = false;
  piece.currentModels = 0;
  piece.currentSupply = 0;
  piece.damageMarker = 0;
  piece.isDestroyed = true;
  piece.isOnField = false;
  piece.destroyedModelIds = [...new Set([...(piece.destroyedModelIds || []), model.id])];
}

function rollSucceeds(roll, threshold) {
  if (roll === 1) return false;
  if (roll === 6) return true;
  return roll >= threshold;
}

function ordinaryRevealOutcomes(reveals, chance) {
  if (!Array.isArray(reveals) || reveals.length !== chance.count) {
    fail("STIMPACK_CLOSE_COMBAT_ORDINARY_CHANCE_REVEALS_REQUIRED");
  }
  return reveals.map((reveal) => {
    const faces = object(reveal) ? Number(reveal.faces) : chance.faces;
    const outcome = object(reveal) ? Number(reveal.outcome) : Number(reveal);
    if (faces !== chance.faces
      || !Number.isSafeInteger(outcome)
      || outcome < 1
      || outcome > chance.faces) {
      fail("STIMPACK_CLOSE_COMBAT_ORDINARY_CHANCE_REVEAL_INVALID");
    }
    return outcome;
  });
}

function resolveOrdinary(stateInput, action, expected, options) {
  const bindings = verifyBindings(stateInput, options.matchBinding);
  const graph = deriveOfficialEngagementGraphV2(stateInput);
  const pieceBefore = stateInput.pieces.find((entry) => entry.id === action.pieceId);
  const targetBefore = stateInput.pieces.find((entry) => entry.id === action.targetId);
  const context = contextFor(
    stateInput,
    action.sideKey,
    pieceBefore,
    targetBefore,
    bindings,
    graph,
  );
  if (context.stimpacked
    || action.statusEffectHash !== null
    || action.markerHash !== null
    || action.precisionGrantHash !== null
    || context.plan.precisionAvailable !== false) {
    fail("STIMPACK_CLOSE_COMBAT_ORDINARY_PRECISION_FORBIDDEN");
  }
  const rolls = ordinaryRevealOutcomes(options.chanceReveals, context.plan.chance);
  const hitRolls = rolls.slice(0, context.plan.attackDice);
  const preallocatedArmourRolls = rolls.slice(context.plan.attackDice);
  const hits = hitRolls.filter((roll) => (
    rollSucceeds(roll, context.weapon.hitThreshold)
  )).length;
  const armourRolls = preallocatedArmourRolls.slice(0, hits);
  const saves = armourRolls.filter((roll) => (
    rollSucceeds(roll, bindings.marine.armourThreshold)
  )).length;
  const damagePoolDice = hits - saves;
  const state = clone(stateInput);
  const piece = state.pieces.find((entry) => entry.id === action.pieceId);
  const target = state.pieces.find((entry) => entry.id === action.targetId);
  const targetModel = activeModels(target)[0];
  const priorDamageMarker = Number(target.damageMarker || 0);
  const totalDamage = priorDamageMarker + (damagePoolDice * context.weapon.damage);
  const targetDestroyed = totalDamage >= bindings.marine.hitPoints;
  if (targetDestroyed) destroyOneModelPiece(target, targetModel);
  else target.damageMarker = totalDamage;
  piece.activatedPhases = {
    movement: false,
    assault: false,
    combat: false,
    ...(piece.activatedPhases || {}),
    combat: true,
  };
  state.activeSideKey = otherSide(action.sideKey);
  const postGraph = deriveOfficialEngagementGraphV2(state);
  const event = {
    type: "close_combat_attack",
    subtype: "ordinary_close_combat_without_precision",
    sideKey: action.sideKey,
    pieceId: piece.id,
    targetId: target.id,
    attackerModelId: context.attacker.model.id,
    targetModelId: context.defender.model.id,
    weaponName: context.weapon.weaponName,
    replacedWeaponName: context.replacedWeaponName,
    closeRanksMode: "decline",
    attackPlanHash: context.plan.planHash,
    preEngagementGraphHash: graph.graphHash,
    postEngagementGraphHash: postGraph.graphHash,
    fightingModelIds: [...context.ranks.fightingModelIds],
    supportingModelIds: [],
    attackPool: {
      dice: context.plan.attackDice,
      rolls: hitRolls,
      hitThreshold: context.weapon.hitThreshold,
      naturalOneAlwaysFails: true,
      naturalSixAlwaysSucceeds: true,
      hits,
    },
    precision: {
      available: false,
      statusEffectHash: null,
      precisionGrantHash: null,
      precisionSelectionHash: null,
    },
    surgePool: { dice: 0, rolls: [], matches: 0 },
    armourPool: {
      dice: hits,
      rolls: armourRolls,
      unusedPreallocatedRolls: preallocatedArmourRolls.slice(hits),
      armourThreshold: bindings.marine.armourThreshold,
      saves,
    },
    evadePool: { dice: 0, rolls: [], reason: "no_close_combat_evade_grant" },
    damagePool: {
      dice: damagePoolDice,
      damagePerDie: context.weapon.damage,
      priorDamageMarker,
      totalDamage,
    },
    casualtyModelIds: targetDestroyed ? [targetModel.id] : [],
    postDamageMarker: Number(target.damageMarker || 0),
    targetDestroyed,
    trainingTruth: false,
  };
  const events = [event];
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({
    id: `log-${state.log.length + 1}`,
    round: Number(state.round || 1),
    phase: "combat",
    action: clone(expected),
    events: clone(events),
  });
  return {
    ok: true,
    schemaVersion: "starcraft_tmg_official_ordinary_close_combat_transition_v1",
    executorId: OFFICIAL_STIMPACK_CLOSE_COMBAT_EXECUTOR_ID,
    executorVersion: OFFICIAL_STIMPACK_CLOSE_COMBAT_EXECUTOR_VERSION,
    postRevision: Number(options.postRevision || 0),
    state,
    events,
    action: expected,
    engagementGraph: postGraph,
    rulesTruth: "official_current_ordinary_close_combat_without_precision_exact_subset",
    trainingTruth: false,
  };
}

function resolveChoice(stateInput, action, expected, options) {
  const pending = verifyPending(stateInput.pendingAction);
  const current = currentPendingContext(stateInput, pending, options);
  const selection = pending.precisionSelections.find((entry) => (
    entry.precisionSelectionHash === action.precisionSelectionHash
  ));
  if (!selection) fail("STIMPACK_CLOSE_COMBAT_SELECTION_STALE");
  const resolution = KERNEL.resolve(
    pending.attackPlan,
    pending.chanceReveals,
    { precisionGrant: pending.precisionGrant, precisionSelection: selection },
  );
  const state = clone(stateInput);
  const piece = state.pieces.find((entry) => entry.id === current.piece.id);
  const target = state.pieces.find((entry) => entry.id === current.target.id);
  const targetModel = activeModels(target)[0];
  const priorDamageMarker = Number(target.damageMarker || 0);
  const totalDamage = priorDamageMarker + resolution.stages.damage.totalDamage;
  const targetDestroyed = totalDamage >= current.bindings.marine.hitPoints;
  if (targetDestroyed) destroyOneModelPiece(target, targetModel);
  else target.damageMarker = totalDamage;
  piece.activatedPhases = {
    movement: false,
    assault: false,
    combat: false,
    ...(piece.activatedPhases || {}),
    combat: true,
  };
  state.activeSideKey = otherSide(pending.ownerSideKey);
  delete state.pendingAction;
  const postGraph = deriveOfficialEngagementGraphV2(state);
  const event = {
    type: "close_combat_attack",
    subtype: "stimpack_close_combat_precision_consumer",
    sideKey: pending.ownerSideKey,
    pieceId: piece.id,
    targetId: target.id,
    attackerModelId: current.context.attacker.model.id,
    targetModelId: current.context.defender.model.id,
    weaponName: pending.weaponName,
    replacedWeaponName: current.context.replacedWeaponName,
    closeRanksMode: "decline",
    closeCombatPrecisionKernelHash: KERNEL.descriptor.kernelHash,
    attackPlanHash: pending.attackPlan.planHash,
    attackResolutionHash: resolution.resolutionHash,
    precisionGrantHash: pending.precisionGrant.precisionGrantHash,
    precisionSelectionHash: selection.precisionSelectionHash,
    preEngagementGraphHash: current.graph.graphHash,
    postEngagementGraphHash: postGraph.graphHash,
    fightingModelIds: [...current.context.ranks.fightingModelIds],
    supportingModelIds: [],
    attackPool: clone(resolution.stages.hit),
    precision: clone(resolution.stages.effects),
    surgePool: { dice: 0, rolls: [], matches: 0 },
    armourPool: clone(resolution.stages.armour),
    evadePool: clone(resolution.stages.evade),
    damagePool: {
      ...clone(resolution.stages.damage),
      priorDamageMarker,
      totalDamage,
    },
    casualtyModelIds: targetDestroyed ? [targetModel.id] : [],
    postDamageMarker: Number(target.damageMarker || 0),
    targetDestroyed,
    trainingTruth: false,
  };
  const events = [event];
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({
    id: `log-${state.log.length + 1}`,
    round: Number(state.round || 1),
    phase: "combat",
    action: clone(expected),
    events: clone(events),
  });
  return {
    ok: true,
    schemaVersion:
      "starcraft_tmg_official_stimpack_close_combat_precision_resolution_transition_v1",
    executorId: OFFICIAL_STIMPACK_CLOSE_COMBAT_EXECUTOR_ID,
    executorVersion: OFFICIAL_STIMPACK_CLOSE_COMBAT_EXECUTOR_VERSION,
    postRevision: Number(options.postRevision || 0),
    state,
    events,
    action: expected,
    attackResolution: resolution,
    engagementGraph: postGraph,
    rulesTruth:
      "official_current_stimpack_all_close_combat_weapons_precision_consumer_exact_subset",
    trainingTruth: false,
  };
}

export function applyOfficialStimpackCloseCombatConsumerV1(
  stateInput,
  actionInput,
  options = {},
) {
  if (!object(actionInput)
    || ![
      OFFICIAL_STIMPACK_CLOSE_COMBAT_ATTACK_ACTION_TYPE,
      OFFICIAL_RESOLVE_STIMPACK_CLOSE_COMBAT_PRECISION_ACTION_TYPE,
    ].includes(actionInput.actionType)
    || actionInput.executorId !== OFFICIAL_STIMPACK_CLOSE_COMBAT_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_STIMPACK_CLOSE_COMBAT_EXECUTOR_VERSION) {
    fail("STIMPACK_CLOSE_COMBAT_ACTION_INVALID");
  }
  const expected = enumerateOfficialStimpackCloseCombatConsumerV1(stateInput, {
    sideKey: actionInput.sideKey,
    matchBinding: options.matchBinding,
    throwOnError: true,
  }).map(actionFromCandidate).find((candidate) => isDeepStrictEqual(candidate, actionInput));
  if (!expected) fail("STIMPACK_CLOSE_COMBAT_ACTION_STALE");
  if (actionInput.actionType
    === OFFICIAL_RESOLVE_STIMPACK_CLOSE_COMBAT_PRECISION_ACTION_TYPE) {
    return resolveChoice(stateInput, actionInput, expected, options);
  }
  if (actionInput.resolutionMode === "ordinary_no_precision") {
    return resolveOrdinary(stateInput, actionInput, expected, options);
  }
  return openChoice(stateInput, actionInput, expected, options);
}
