import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { getOfficialCombatProfileV1 } from
  "../source-data/official-combat-profile-bundle-v1.mjs";
import { verifyOfficialCleanupCardBundleV1 } from
  "../source-data/official-cleanup-card-bundle-v1.mjs";
import { verifyOfficialGameplayDataBundleV1 } from
  "../source-data/official-gameplay-data-bundle-v1.mjs";
import { OFFICIAL_MEDIC_RESTORATION_ACTION_ATOM_IDS } from
  "./official-medic-restoration-reaction-executor-v1.mjs";
import { OFFICIAL_OPTICAL_FLARE_RANGED_ACTION_ATOM_IDS } from
  "./official-optical-flare-ranged-consumer-executor-v1.mjs";
import {
  createOfficialTotalDamageReactionKernelV1,
  OFFICIAL_TOTAL_DAMAGE_REACTION_NEW_ATOM_IDS,
} from "./official-total-damage-reaction-kernel-v1.mjs";

export const OFFICIAL_MEDIC_LIFE_SUPPORT_EXECUTOR_ID =
  "authority.medic-life-support-reaction-v1";
export const OFFICIAL_MEDIC_LIFE_SUPPORT_EXECUTOR_VERSION = "1.0.0";
export const OFFICIAL_MEDIC_LIFE_SUPPORT_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_USE_LIFE_SUPPORT_REACTION_ACTION_TYPE =
  "use_life_support_reaction";
export const OFFICIAL_PASS_LIFE_SUPPORT_REACTION_ACTION_TYPE =
  "pass_life_support_reaction";

export const OFFICIAL_MEDIC_LIFE_SUPPORT_NEW_ATOM_IDS = Object.freeze([
  "rule-atom:all-ability-types-reserve-inactivity",
  "rule-atom:passive-ability-behavior-and-battlefield-condition",
  "rule-atom:passive-ability-reserve-inactivity",
  "rule-atom:passive-ability-trait-definition",
  "rule-atom:singleton:core-10-3-passive-battlefield-activity:198602368c7a",
  "rule-atom:singleton:core-11-passive-ability-battlefield-duration:1ea9b8807aa0",
  ...OFFICIAL_TOTAL_DAMAGE_REACTION_NEW_ATOM_IDS,
].sort((left, right) => left.localeCompare(right)));

export const OFFICIAL_MEDIC_LIFE_SUPPORT_ACTION_ATOM_IDS = Object.freeze([
  ...new Set([
    ...OFFICIAL_MEDIC_RESTORATION_ACTION_ATOM_IDS,
    ...OFFICIAL_OPTICAL_FLARE_RANGED_ACTION_ATOM_IDS,
    ...OFFICIAL_MEDIC_LIFE_SUPPORT_NEW_ATOM_IDS,
  ]),
].sort((left, right) => left.localeCompare(right)));
export const OFFICIAL_MEDIC_LIFE_SUPPORT_EXECUTOR_ATOM_IDS =
  OFFICIAL_MEDIC_LIFE_SUPPORT_ACTION_ATOM_IDS;

const CURRENT_SOURCE_SNAPSHOT_HASH =
  "2407d2536278776692c9116cb74c4147e15f2aa6ff9af9204141e5620220bd78";
const CURRENT_DATASET_HASH =
  "40ba72534a2165131288ec77ccf67984baf5f740e58c4f94283b46137a54757a";
const CURRENT_GAMEPLAY_BUNDLE_HASH =
  "35cd2e1a7a7cb7575f0525dbf6ff08fa0a5285b5fcf89e6b901976f532f1463b";
const MEDIC_RECORD_KEY = "army_units:medic";
const MEDIC_SOURCE_RECORD_HASH =
  "1a673c3081628d422bf7d38ad3db7c92a7e43f0e305e1f8eb610ec9c748dc203";
const MEDIC_PAYLOAD_HASH =
  "5ef39b4365da4f36cb5b939aea1290f645f368f730a149693ad3afa4e4b678ba";
const MARINE_RECORD_KEY = "army_units:marine";
const MARINE_SOURCE_RECORD_HASH =
  "682a2ea237c32dc25cc7c389c3b949705326bba6c416085c39dda2388dd3f215";
const MARINE_PAYLOAD_HASH =
  "33cbc0b9e9e17ca95f1cd639f78d81e8ec7606f035642e32fdf7064bcc49d1e6";
const ACADEMY_RECORD_KEY = "tactical_cards:academy";
const BASE_DIAMETER_MILLI_INCHES = 1260;
const RANGE_MILLI_INCHES = 4000;
const SIDE_KEYS = Object.freeze(["player1", "player2"]);
const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const MAX_PAYMENT_CARDS = 12;
const PENDING_SCHEMA = "starcraft_tmg_medic_life_support_reaction_window_v1";
const NAMED_LEDGER_SCHEMA = "starcraft_tmg_medic_life_support_round_ledger_v1";
const ACTIVATION_LEDGER_SCHEMA = "starcraft_tmg_reaction_activation_ledger_v1";
const HISTORY_SCHEMA = "starcraft_tmg_medic_life_support_history_entry_v1";
const TOTAL_DAMAGE_KERNEL = createOfficialTotalDamageReactionKernelV1();

const LIFE_SUPPORT_SOURCE = Object.freeze({
  abilityId: "life_support",
  abilityName: "Life Support",
  activation: "<Reaction>\n(1 Command Point)",
  description:
    "Use when another Friendly Biological Unit suffers Damage Within 4\". Reduce the Total Damage before allocation by 1 for each model in this Unit that is Within 4\" of the damaged Unit.",
  resourceType: "CP",
  resourceCost: 1,
  trigger: "another_friendly_biological_unit_suffers_damage_within_4",
});
const STABILIZER_SOURCE = Object.freeze({
  abilityId: "stabilizer_medpacks",
  abilityName: "Stabilizer Medpacks",
  activation: "<Passive>",
  description:
    "When this Unit resolves a Life Support or Medpack ability, treat it as having 1 additional model Within Range for calculating that ability's effects.",
});
const LIFE_SUPPORT_SOURCE_TEXT_HASH = hashStarcraftTmgContract(LIFE_SUPPORT_SOURCE);
const STABILIZER_SOURCE_TEXT_HASH = hashStarcraftTmgContract(STABILIZER_SOURCE);

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
  fail("LIFE_SUPPORT_SIDE_REQUIRED");
}

function milli(value, code) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) fail(code);
  const result = Math.round(parsed * 1000);
  if (!Number.isSafeInteger(result)) fail(code);
  return result;
}

function verifyBindings(state, matchBinding) {
  if (!object(state) || !object(state.players) || !object(state.board)
    || !Array.isArray(state.pieces)) {
    fail("LIFE_SUPPORT_STATE_INVALID");
  }
  const gameplayBundle = state.officialGameplayDataBundle;
  verifyOfficialGameplayDataBundleV1(gameplayBundle);
  verifyOfficialCleanupCardBundleV1(gameplayBundle.cleanupCardBundle);
  if (!object(matchBinding)
    || hashStarcraftTmgContract(gameplayBundle) !== matchBinding.dataSnapshotHash
    || gameplayBundle.gameplayDataBundleHash !== CURRENT_GAMEPLAY_BUNDLE_HASH
    || gameplayBundle.sourceSnapshotHash !== CURRENT_SOURCE_SNAPSHOT_HASH
    || gameplayBundle.normalizedDatasetHash !== CURRENT_DATASET_HASH
    || gameplayBundle.repositoryFallbackAllowed !== false
    || !isDeepStrictEqual(gameplayBundle.dataVersions, {
      cardsVersion: "69",
      rulesVersion: "48",
      unitsVersion: "71",
    })) {
    fail("LIFE_SUPPORT_LATEST_OFFICIAL_DATA_REQUIRED");
  }
  const medic = getOfficialCombatProfileV1(
    gameplayBundle.combatProfileBundle,
    MEDIC_RECORD_KEY,
  );
  const marine = getOfficialCombatProfileV1(
    gameplayBundle.combatProfileBundle,
    MARINE_RECORD_KEY,
  );
  if (medic.sourceRecordHash !== MEDIC_SOURCE_RECORD_HASH
    || medic.payloadHash !== MEDIC_PAYLOAD_HASH
    || medic.unitName !== "Medic"
    || medic.hitPoints !== 2
    || medic.shield !== 0
    || !isDeepStrictEqual(medic.combatTags, ["biological", "ground", "light"])
    || marine.sourceRecordHash !== MARINE_SOURCE_RECORD_HASH
    || marine.payloadHash !== MARINE_PAYLOAD_HASH
    || marine.unitName !== "Marine"
    || marine.hitPoints !== 2
    || marine.shield !== 0
    || !isDeepStrictEqual(marine.combatTags, ["biological", "ground", "light"])) {
    fail("LIFE_SUPPORT_OFFICIAL_PROFILE_DRIFT");
  }
  return { gameplayBundle, medic, marine };
}

function exactModels(piece, role) {
  const models = activeModels(piece);
  const currentModels = Number(piece.currentModels);
  const maxModels = Number(piece.maxModels);
  if (!Number.isSafeInteger(currentModels)
    || currentModels < 1
    || !Number.isSafeInteger(maxModels)
    || maxModels < currentModels
    || models.length !== currentModels
    || !Array.isArray(piece.destroyedModelIds)
    || piece.destroyedModelIds.length !== maxModels - currentModels) {
    fail("LIFE_SUPPORT_UNIT_SCOPE_UNSUPPORTED", role);
  }
  for (const model of models) {
    if (model.baseShape !== "round"
      || milli(model.baseWidthInches, "LIFE_SUPPORT_BASE_SCOPE_UNSUPPORTED")
        !== BASE_DIAMETER_MILLI_INCHES
      || milli(model.baseDepthInches, "LIFE_SUPPORT_BASE_SCOPE_UNSUPPORTED")
        !== BASE_DIAMETER_MILLI_INCHES
      || String(model.elevation || "ground") !== "ground"
      || !isDeepStrictEqual(model.supportTerrainIds || [], [])
      || !isDeepStrictEqual(model.adjacentAccessPointIds || [], [])) {
      fail("LIFE_SUPPORT_BASE_SCOPE_UNSUPPORTED", String(model.id || role));
    }
    milli(model.xInches, "LIFE_SUPPORT_MODEL_GEOMETRY_INVALID");
    milli(model.yInches, "LIFE_SUPPORT_MODEL_GEOMETRY_INVALID");
  }
  return models;
}

function exactMedic(piece, sideKey) {
  if (!activePiece(piece)
    || piece.sideKey !== sideKey
    || piece.officialUnitRecordKey !== MEDIC_RECORD_KEY
    || piece.sourceRecordHash !== MEDIC_SOURCE_RECORD_HASH
    || piece.officialPayloadHash !== MEDIC_PAYLOAD_HASH
    || piece.isInReserves === true
    || piece.combatTag !== "ground"
    || !isDeepStrictEqual(piece.combatTags, ["biological", "ground", "light"])
    || !isDeepStrictEqual(piece.statuses || [], [])) {
    fail("LIFE_SUPPORT_MEDIC_SCOPE_UNSUPPORTED", String(piece?.id || ""));
  }
  const selected = [...(piece.selectedUpgradeNames || [])].sort();
  const supported = [
    ["Life Support"],
    ["Life Support", "Stabilizer Medpacks"],
  ].some((row) => isDeepStrictEqual(selected, [...row].sort()));
  if (!supported) {
    fail("LIFE_SUPPORT_MEDIC_LOADOUT_UNSUPPORTED", String(piece?.id || ""));
  }
  return {
    piece,
    models: exactModels(piece, "medic"),
    stabilizerActive: selected.includes("Stabilizer Medpacks"),
  };
}

function declaresLifeSupport(piece) {
  return Array.isArray(piece?.selectedUpgradeNames)
    && piece.selectedUpgradeNames.includes(LIFE_SUPPORT_SOURCE.abilityName);
}

function exactTarget(piece, sideKey, plan, marine) {
  if (!activePiece(piece)
    || piece.sideKey !== sideKey
    || piece.officialUnitRecordKey !== MARINE_RECORD_KEY
    || piece.sourceRecordHash !== MARINE_SOURCE_RECORD_HASH
    || piece.officialPayloadHash !== MARINE_PAYLOAD_HASH
    || piece.combatTag !== "ground"
    || !isDeepStrictEqual(piece.combatTags, ["biological", "ground", "light"])
    || !isDeepStrictEqual(piece.selectedUpgradeNames || [], [])
    || !isDeepStrictEqual(piece.statuses || [], [])
    || Number(piece.currentModels) !== 1
    || Number(piece.damageMarker || 0) !== plan.priorDamageMarker) {
    fail("LIFE_SUPPORT_TARGET_SCOPE_UNSUPPORTED");
  }
  const models = exactModels(piece, "target");
  if (models.length !== 1
    || models[0].id !== plan.targetModelId
    || marine.hitPoints !== plan.targetHitPoints) {
    fail("LIFE_SUPPORT_TARGET_BINDING_INVALID");
  }
  return { piece, model: models[0] };
}

function baseGapMilliInches(left, right) {
  return Math.max(0, Math.round(Math.hypot(
    milli(right.xInches, "LIFE_SUPPORT_MODEL_GEOMETRY_INVALID")
      - milli(left.xInches, "LIFE_SUPPORT_MODEL_GEOMETRY_INVALID"),
    milli(right.yInches, "LIFE_SUPPORT_MODEL_GEOMETRY_INVALID")
      - milli(left.yInches, "LIFE_SUPPORT_MODEL_GEOMETRY_INVALID"),
  ) - BASE_DIAMETER_MILLI_INCHES));
}

function withinReceipt(source, target) {
  const pairs = source.models.map((model) => ({
    sourceModelId: model.id,
    targetModelId: target.model.id,
    baseGapMilliInches: baseGapMilliInches(model, target.model),
  })).sort((left, right) => left.sourceModelId.localeCompare(right.sourceModelId));
  const contributingModelIds = pairs.filter((pair) => (
    pair.baseGapMilliInches <= RANGE_MILLI_INCHES
  )).map((pair) => pair.sourceModelId);
  const baseReduction = contributingModelIds.length;
  const passiveBonus = source.stabilizerActive ? 1 : 0;
  const body = {
    schema: "starcraft_tmg_official_life_support_within_receipt_v1",
    sourcePieceId: source.piece.id,
    targetPieceId: target.piece.id,
    rangeMilliInches: RANGE_MILLI_INCHES,
    pairs,
    contributingModelIds,
    baseReduction,
    stabilizerActive: source.stabilizerActive,
    passiveBonus,
    requestedReduction: baseReduction + passiveBonus,
    partialBaseOverlapCountsAsWithin: true,
    trainingTruth: false,
  };
  return { ...body, withinReceiptHash: hashStarcraftTmgContract(body) };
}

function profileByRecordKey(bundle, recordKey) {
  return bundle.cleanupCardBundle.profiles.find((profile) => profile.recordKey === recordKey);
}

function verifyCard(card, sideKey, bundle) {
  const profile = profileByRecordKey(bundle, card?.officialCardRecordKey);
  if (!profile
    || card.sideKey !== sideKey
    || card.cardKind !== profile.cardKind
    || card.sourceRecordHash !== profile.sourceRecordHash
    || Number(card.resource) !== profile.resource
    || card.resourceType !== "CP"
    || !["ready", "exhausted"].includes(card.readiness)
    || card.face !== (card.readiness === "ready" ? "up" : "down")) {
    fail("LIFE_SUPPORT_CARD_STATE_INVALID", String(card?.id || ""));
  }
  return card;
}

function cardsForSide(state, sideKey, bundle) {
  if (state.players?.[sideKey]?.faction !== "Terran"
    || !Array.isArray(state.cardResources?.[sideKey])) {
    fail("LIFE_SUPPORT_CARD_STATE_INVALID", sideKey);
  }
  const cards = state.cardResources[sideKey].map((card) => verifyCard(card, sideKey, bundle));
  if (cards.length > MAX_PAYMENT_CARDS
    || new Set(cards.map((card) => card.id)).size !== cards.length) {
    fail("LIFE_SUPPORT_CARD_STATE_INVALID", "card_denominator");
  }
  return cards;
}

function paymentSets(cards) {
  const ready = cards.filter((card) => (
    card.readiness === "ready" && card.resourceType === "CP"
  )).sort((left, right) => left.id.localeCompare(right.id));
  const sets = [];
  for (let mask = 1; mask < (1 << ready.length); mask += 1) {
    const selected = ready.filter((_card, index) => (mask & (1 << index)) !== 0);
    if (selected.reduce((sum, card) => sum + Number(card.resource), 0) === 1) {
      sets.push(selected.map((card) => card.id));
    }
  }
  return sets.sort((left, right) => left.join(":").localeCompare(right.join(":")));
}

function verifyNamedLedger(state) {
  const ledger = state.lifeSupportReactionUsage;
  if (ledger === undefined) return { entries: [] };
  if (!object(ledger)
    || ledger.schema !== NAMED_LEDGER_SCHEMA
    || !Number.isSafeInteger(ledger.round)
    || !Array.isArray(ledger.entries)
    || ledger.trainingTruth !== false
    || ledger.ledgerHash !== hashStarcraftTmgContract(without(ledger, ["ledgerHash"]))) {
    fail("LIFE_SUPPORT_NAMED_LEDGER_INVALID");
  }
  return ledger.round === Number(state.round) ? ledger : { entries: [] };
}

function namedUsed(state, sourcePieceId) {
  return verifyNamedLedger(state).entries.some((entry) => (
    entry.sourcePieceId === sourcePieceId
      && entry.abilityName === LIFE_SUPPORT_SOURCE.abilityName
  ));
}

function verifyActivationLedger(state) {
  const ledger = state.reactionActivationUsage;
  if (ledger === undefined) return { entries: [] };
  if (!object(ledger)
    || ledger.schema !== ACTIVATION_LEDGER_SCHEMA
    || !Array.isArray(ledger.entries)
    || ledger.trainingTruth !== false
    || ledger.ledgerHash !== hashStarcraftTmgContract(without(ledger, ["ledgerHash"]))) {
    fail("LIFE_SUPPORT_ACTIVATION_LEDGER_INVALID");
  }
  return ledger;
}

function activationAlreadyUsed(state, activationKey, sideKey) {
  return verifyActivationLedger(state).entries.some((entry) => (
    entry.activationKey === activationKey && entry.reactingSideKey === sideKey
  ));
}

function eligibleSourceRow(source, target, activationKey) {
  const within = withinReceipt(source, target);
  if (within.baseReduction < 1) return null;
  const sourceBody = {
    schema: "starcraft_tmg_official_life_support_reduction_source_v1",
    sourcePieceId: source.piece.id,
    targetPieceId: target.piece.id,
    activationKey,
    lifeSupportSourceTextHash: LIFE_SUPPORT_SOURCE_TEXT_HASH,
    stabilizerSourceTextHash: source.stabilizerActive
      ? STABILIZER_SOURCE_TEXT_HASH
      : null,
    withinReceiptHash: within.withinReceiptHash,
    contributingModelIds: [...within.contributingModelIds],
    baseReduction: within.baseReduction,
    passiveBonus: within.passiveBonus,
    requestedReduction: within.requestedReduction,
    trainingTruth: false,
  };
  return {
    ...sourceBody,
    reductionSourceHash: hashStarcraftTmgContract(sourceBody),
  };
}

function createActivationKey(state, attackAction, plan) {
  return hashStarcraftTmgContract({
    schema: "starcraft_tmg_official_reaction_activation_key_v1",
    round: Number(state.round),
    phase: state.phase,
    activeSideKey: attackAction.sideKey,
    activePieceId: attackAction.pieceId,
    attackActionHash: hashStarcraftTmgContract(attackAction),
    attackResolutionHash: plan.attackResolutionHash,
  });
}

function pendingBody(input) {
  return {
    schema: PENDING_SCHEMA,
    stage: "reaction_open",
    round: input.round,
    phase: input.phase,
    originalActionSideKey: input.originalActionSideKey,
    reactingSideKey: input.reactingSideKey,
    attackerPieceId: input.attackerPieceId,
    targetPieceId: input.targetPieceId,
    attackActionHash: input.attackActionHash,
    attackResolutionHash: input.attackResolutionHash,
    totalDamageReactionPlan: clone(input.totalDamageReactionPlan),
    totalDamageReactionPlanHash: input.totalDamageReactionPlan.planHash,
    activationKey: input.activationKey,
    eligibleSources: clone(input.eligibleSources),
    abilityId: LIFE_SUPPORT_SOURCE.abilityId,
    abilityName: LIFE_SUPPORT_SOURCE.abilityName,
    sourceTextHash: LIFE_SUPPORT_SOURCE_TEXT_HASH,
    resourceType: LIFE_SUPPORT_SOURCE.resourceType,
    resourceCost: LIFE_SUPPORT_SOURCE.resourceCost,
    trainingTruth: false,
  };
}

function createPending(input) {
  const body = pendingBody(input);
  return { ...body, pendingReactionHash: hashStarcraftTmgContract(body) };
}

function verifyPending(state) {
  const pending = state.pendingLifeSupportReaction;
  if (!object(pending)
    || pending.schema !== PENDING_SCHEMA
    || pending.stage !== "reaction_open"
    || pending.round !== Number(state.round)
    || pending.phase !== state.phase
    || !SIDE_KEYS.includes(pending.originalActionSideKey)
    || pending.reactingSideKey !== otherSide(pending.originalActionSideKey)
    || !String(pending.attackerPieceId || "")
    || !String(pending.targetPieceId || "")
    || !HASH_PATTERN.test(String(pending.attackActionHash || ""))
    || !HASH_PATTERN.test(String(pending.attackResolutionHash || ""))
    || !HASH_PATTERN.test(String(pending.totalDamageReactionPlanHash || ""))
    || !HASH_PATTERN.test(String(pending.activationKey || ""))
    || !Array.isArray(pending.eligibleSources)
    || pending.eligibleSources.length < 1
    || new Set(pending.eligibleSources.map((row) => row.sourcePieceId)).size
      !== pending.eligibleSources.length
    || pending.abilityId !== LIFE_SUPPORT_SOURCE.abilityId
    || pending.abilityName !== LIFE_SUPPORT_SOURCE.abilityName
    || pending.sourceTextHash !== LIFE_SUPPORT_SOURCE_TEXT_HASH
    || pending.resourceType !== "CP"
    || pending.resourceCost !== 1
    || pending.trainingTruth !== false
    || pending.pendingReactionHash
      !== hashStarcraftTmgContract(without(pending, ["pendingReactionHash"]))) {
    fail("LIFE_SUPPORT_PENDING_REACTION_INVALID");
  }
  TOTAL_DAMAGE_KERNEL.verifyPlan(pending.totalDamageReactionPlan);
  if (pending.totalDamageReactionPlan.planHash !== pending.totalDamageReactionPlanHash
    || pending.totalDamageReactionPlan.attackResolutionHash !== pending.attackResolutionHash
    || pending.totalDamageReactionPlan.targetPieceId !== pending.targetPieceId) {
    fail("LIFE_SUPPORT_PENDING_DAMAGE_BINDING_INVALID");
  }
  for (const row of pending.eligibleSources) {
    if (!String(row.sourcePieceId || "")
      || row.targetPieceId !== pending.targetPieceId
      || row.activationKey !== pending.activationKey
      || !HASH_PATTERN.test(String(row.withinReceiptHash || ""))
      || !HASH_PATTERN.test(String(row.reductionSourceHash || ""))
      || !Array.isArray(row.contributingModelIds)
      || !Number.isSafeInteger(row.baseReduction)
      || row.baseReduction < 1
      || ![0, 1].includes(row.passiveBonus)
      || row.requestedReduction !== row.baseReduction + row.passiveBonus
      || row.trainingTruth !== false
      || row.reductionSourceHash
        !== hashStarcraftTmgContract(without(row, ["reductionSourceHash"]))) {
      fail("LIFE_SUPPORT_PENDING_SOURCE_INVALID");
    }
  }
  return pending;
}

export function isOfficialMedicLifeSupportPendingV1(state) {
  try {
    verifyPending(state);
    return true;
  } catch {
    return false;
  }
}

function applyDamageResolution(state, plan, resolution) {
  const target = state.pieces.find((piece) => piece.id === plan.targetPieceId);
  const targetModel = activeModels(target).find((model) => model.id === plan.targetModelId);
  if (!targetModel || Number(target.damageMarker || 0) !== plan.priorDamageMarker) {
    fail("LIFE_SUPPORT_DAMAGE_TARGET_STALE");
  }
  if (resolution.targetDestroyed) {
    targetModel.isDestroyed = true;
    targetModel.isOnField = false;
    target.currentModels = 0;
    target.currentSupply = 0;
    target.damageMarker = 0;
    target.isDestroyed = true;
    target.isOnField = false;
  } else {
    target.damageMarker = resolution.postDamageMarker;
  }
  return {
    type: "total_damage_allocated_after_reaction_window",
    targetPieceId: target.id,
    targetModelId: plan.targetModelId,
    totalDamageReactionPlanHash: plan.planHash,
    totalDamageResolutionHash: resolution.resolutionHash,
    priorDamageMarker: resolution.priorDamageMarker,
    incomingDamage: resolution.incomingDamage,
    totalDamageBeforeReduction: resolution.totalDamageBeforeReduction,
    requestedReduction: resolution.requestedReduction,
    appliedReduction: resolution.appliedReduction,
    totalDamageAfterReduction: resolution.totalDamageAfterReduction,
    casualtyModelIds: [...resolution.casualtyModelIds],
    postDamageMarker: resolution.postDamageMarker,
    targetDestroyed: resolution.targetDestroyed,
    discardedOverflowDamage: resolution.discardedOverflowDamage,
    trainingTruth: false,
  };
}

export function openOfficialMedicLifeSupportWindowV1(stateInput, input = {}) {
  const bindings = verifyBindings(stateInput, input.matchBinding);
  if (stateInput.pendingLifeSupportReaction !== undefined) {
    fail("LIFE_SUPPORT_PENDING_REACTION_ALREADY_OPEN");
  }
  const plan = TOTAL_DAMAGE_KERNEL.verifyPlan(input.totalDamageReactionPlan);
  if (!object(input.attackAction)
    || input.attackAction.sideKey !== stateInput.activeSideKey
    || input.attackAction.targetId !== plan.targetPieceId) {
    fail("LIFE_SUPPORT_ATTACK_TRIGGER_INVALID");
  }
  const state = clone(stateInput);
  const targetPiece = state.pieces.find((piece) => piece.id === plan.targetPieceId);
  const reactingSideKey = targetPiece?.sideKey;
  if (reactingSideKey !== otherSide(input.attackAction.sideKey)) {
    fail("LIFE_SUPPORT_REACTING_SIDE_INVALID");
  }
  const target = exactTarget(targetPiece, reactingSideKey, plan, bindings.marine);
  const attackActionHash = hashStarcraftTmgContract(input.attackAction);
  const activationKey = createActivationKey(state, input.attackAction, plan);
  const settleWithoutWindow = (reason) => {
    const resolution = TOTAL_DAMAGE_KERNEL.resolve(plan, {
      requestedReduction: 0,
      reductionSourceHash: null,
    });
    const allocationEvent = applyDamageResolution(state, plan, resolution);
    return {
      state,
      opened: false,
      reason,
      events: [allocationEvent],
      totalDamageResolutionHash: resolution.resolutionHash,
    };
  };
  if (plan.incomingDamage < 1) return settleWithoutWindow("no_damage_suffered");
  const cards = cardsForSide(state, reactingSideKey, bindings.gameplayBundle);
  if (cards.some((card) => (
    card.officialCardRecordKey === ACADEMY_RECORD_KEY && card.readiness === "ready"
  ))) {
    fail("LIFE_SUPPORT_NESTED_ACADEMY_REACTION_UNSUPPORTED");
  }
  if (activationAlreadyUsed(state, activationKey, reactingSideKey)) {
    return settleWithoutWindow("reaction_already_used_this_activation");
  }
  if (paymentSets(cards).length === 0) {
    return settleWithoutWindow("life_support_cost_unpayable");
  }
  const eligibleSources = [];
  for (const piece of state.pieces.filter((row) => (
    row.sideKey === reactingSideKey && row.officialUnitRecordKey === MEDIC_RECORD_KEY
  ))) {
    if (!activePiece(piece)
      || piece.isInReserves === true
      || namedUsed(state, piece.id)
      || !declaresLifeSupport(piece)) continue;
    const source = exactMedic(piece, reactingSideKey);
    if (source.piece.id === target.piece.id) continue;
    const row = eligibleSourceRow(source, target, activationKey);
    if (row) eligibleSources.push(row);
  }
  eligibleSources.sort((left, right) => left.sourcePieceId.localeCompare(right.sourcePieceId));
  if (eligibleSources.length === 0) return settleWithoutWindow("no_eligible_medic");
  state.pendingLifeSupportReaction = createPending({
    round: Number(state.round),
    phase: state.phase,
    originalActionSideKey: input.attackAction.sideKey,
    reactingSideKey,
    attackerPieceId: input.attackAction.pieceId,
    targetPieceId: target.piece.id,
    attackActionHash,
    attackResolutionHash: plan.attackResolutionHash,
    totalDamageReactionPlan: plan,
    activationKey,
    eligibleSources,
  });
  return {
    state,
    opened: true,
    pendingReactionHash: state.pendingLifeSupportReaction.pendingReactionHash,
    reactingSideKey,
    eligibleSourcePieceIds: eligibleSources.map((row) => row.sourcePieceId),
    events: [{
      type: "life_support_reaction_window_opened",
      reactingSideKey,
      attackerPieceId: input.attackAction.pieceId,
      targetPieceId: target.piece.id,
      pendingReactionHash: state.pendingLifeSupportReaction.pendingReactionHash,
      totalDamageReactionPlanHash: plan.planHash,
      eligibleSourcePieceIds: eligibleSources.map((row) => row.sourcePieceId),
      trainingTruth: false,
    }],
  };
}

function currentEligibleSource(state, pending, row) {
  const sourcePiece = state.pieces.find((piece) => piece.id === row.sourcePieceId);
  const targetPiece = state.pieces.find((piece) => piece.id === pending.targetPieceId);
  const source = exactMedic(sourcePiece, pending.reactingSideKey);
  const target = {
    piece: targetPiece,
    model: activeModels(targetPiece).find((model) => (
      model.id === pending.totalDamageReactionPlan.targetModelId
    )),
  };
  if (!target.model || namedUsed(state, source.piece.id)) return null;
  const observed = eligibleSourceRow(source, target, pending.activationKey);
  return observed && isDeepStrictEqual(observed, row) ? observed : null;
}

export function enumerateOfficialMedicLifeSupportV1(state, options = {}) {
  const sideKey = String(options.sideKey || "").trim();
  if (!SIDE_KEYS.includes(sideKey)) fail("LIFE_SUPPORT_SIDE_REQUIRED");
  let pending;
  let bindings;
  try {
    pending = verifyPending(state);
    bindings = verifyBindings(state, options.matchBinding);
  } catch (error) {
    if (options.throwOnError === true) throw error;
    return [];
  }
  if (sideKey !== pending.reactingSideKey
    || activationAlreadyUsed(state, pending.activationKey, sideKey)) return [];
  exactTarget(
    state.pieces.find((piece) => piece.id === pending.targetPieceId),
    sideKey,
    pending.totalDamageReactionPlan,
    bindings.marine,
  );
  const cards = cardsForSide(state, sideKey, bindings.gameplayBundle);
  if (cards.some((card) => (
    card.officialCardRecordKey === ACADEMY_RECORD_KEY && card.readiness === "ready"
  ))) return [];
  const payments = paymentSets(cards);
  const common = {
    sideKey,
    phase: state.phase,
    targetId: pending.targetPieceId,
    abilityId: LIFE_SUPPORT_SOURCE.abilityId,
    abilityName: LIFE_SUPPORT_SOURCE.abilityName,
    resourceType: "CP",
    resourceCost: 1,
    pendingReactionHash: pending.pendingReactionHash,
    triggerAttackResolutionHash: pending.attackResolutionHash,
    totalDamageReactionPlanHash: pending.totalDamageReactionPlanHash,
    totalDamageBeforeReduction:
      pending.totalDamageReactionPlan.totalDamageBeforeReduction,
    ruleAtomIds: [...OFFICIAL_MEDIC_LIFE_SUPPORT_ACTION_ATOM_IDS],
    executorId: OFFICIAL_MEDIC_LIFE_SUPPORT_EXECUTOR_ID,
    executorVersion: OFFICIAL_MEDIC_LIFE_SUPPORT_EXECUTOR_VERSION,
  };
  const useActions = [];
  for (const row of pending.eligibleSources) {
    const observed = currentEligibleSource(state, pending, row);
    if (!observed) continue;
    for (const cardResourceIds of payments) {
      useActions.push({
        ...common,
        actionType: OFFICIAL_USE_LIFE_SUPPORT_REACTION_ACTION_TYPE,
        sourcePieceId: row.sourcePieceId,
        cardResourceIds,
        contributingModelIds: [...row.contributingModelIds],
        lifeSupportBaseReduction: row.baseReduction,
        passiveBonus: row.passiveBonus,
        lifeSupportReduction: row.requestedReduction,
        withinReceiptHash: row.withinReceiptHash,
        reductionSourceHash: row.reductionSourceHash,
        isEnabled: true,
        disabledReason: "",
        score: 220 + row.requestedReduction,
        details: {
          trigger: LIFE_SUPPORT_SOURCE.trigger,
          lifeSupportSourceTextHash: LIFE_SUPPORT_SOURCE_TEXT_HASH,
          stabilizerSourceTextHash: row.passiveBonus === 1
            ? STABILIZER_SOURCE_TEXT_HASH
            : null,
          passiveActiveOnBattlefield: row.passiveBonus === 1,
          trainingTruth: false,
        },
      });
    }
  }
  return [...useActions, {
    ...common,
    actionType: OFFICIAL_PASS_LIFE_SUPPORT_REACTION_ACTION_TYPE,
    cardResourceIds: [],
    isEnabled: true,
    disabledReason: "",
    score: 10,
    details: {
      trigger: LIFE_SUPPORT_SOURCE.trigger,
      reactionPassed: true,
      trainingTruth: false,
    },
  }].sort((left, right) => (
    left.actionType.localeCompare(right.actionType)
      || String(left.sourcePieceId || "").localeCompare(String(right.sourcePieceId || ""))
      || left.cardResourceIds.join(":").localeCompare(right.cardResourceIds.join(":"))
  ));
}

function recordNamedUse(state, pending, sourcePieceId) {
  const current = verifyNamedLedger(state);
  if (current.entries.some((entry) => entry.sourcePieceId === sourcePieceId)) {
    fail("LIFE_SUPPORT_NAMED_REACTION_ALREADY_USED_THIS_ROUND");
  }
  const body = {
    schema: NAMED_LEDGER_SCHEMA,
    round: Number(state.round),
    entries: [...clone(current.entries), {
      sourcePieceId,
      targetPieceId: pending.targetPieceId,
      abilityName: LIFE_SUPPORT_SOURCE.abilityName,
      pendingReactionHash: pending.pendingReactionHash,
    }],
    trainingTruth: false,
  };
  state.lifeSupportReactionUsage = {
    ...body,
    ledgerHash: hashStarcraftTmgContract(body),
  };
}

function recordActivationUse(state, pending, sourcePieceId) {
  const current = verifyActivationLedger(state);
  if (activationAlreadyUsed(state, pending.activationKey, pending.reactingSideKey)) {
    fail("LIFE_SUPPORT_REACTION_ALREADY_USED_THIS_ACTIVATION");
  }
  const body = {
    schema: ACTIVATION_LEDGER_SCHEMA,
    entries: [...clone(current.entries), {
      round: Number(state.round),
      phase: state.phase,
      activationKey: pending.activationKey,
      reactingSideKey: pending.reactingSideKey,
      sourcePieceId,
      abilityName: LIFE_SUPPORT_SOURCE.abilityName,
      pendingReactionHash: pending.pendingReactionHash,
    }],
    trainingTruth: false,
  };
  state.reactionActivationUsage = {
    ...body,
    ledgerHash: hashStarcraftTmgContract(body),
  };
}

export function applyOfficialMedicLifeSupportV1(stateInput, actionInput, options = {}) {
  if (!object(actionInput)
    || ![
      OFFICIAL_USE_LIFE_SUPPORT_REACTION_ACTION_TYPE,
      OFFICIAL_PASS_LIFE_SUPPORT_REACTION_ACTION_TYPE,
    ].includes(actionInput.actionType)
    || actionInput.executorId !== OFFICIAL_MEDIC_LIFE_SUPPORT_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_MEDIC_LIFE_SUPPORT_EXECUTOR_VERSION) {
    fail("LIFE_SUPPORT_ACTION_INVALID");
  }
  const pending = verifyPending(stateInput);
  const expected = enumerateOfficialMedicLifeSupportV1(stateInput, {
    sideKey: actionInput.sideKey,
    matchBinding: options.matchBinding,
    throwOnError: true,
  }).map(actionFromCandidate).find((candidate) => isDeepStrictEqual(candidate, actionInput));
  if (!expected) fail("LIFE_SUPPORT_ACTION_STALE");
  if (actionInput.pendingReactionHash !== pending.pendingReactionHash) {
    fail("LIFE_SUPPORT_PENDING_REACTION_STALE");
  }
  const state = clone(stateInput);
  const use = actionInput.actionType === OFFICIAL_USE_LIFE_SUPPORT_REACTION_ACTION_TYPE;
  let source = null;
  if (use) {
    source = pending.eligibleSources.find((row) => (
      row.sourcePieceId === actionInput.sourcePieceId
        && row.reductionSourceHash === actionInput.reductionSourceHash
    ));
    if (!source) fail("LIFE_SUPPORT_SOURCE_STALE");
    const bindings = verifyBindings(state, options.matchBinding);
    const selectedCards = actionInput.cardResourceIds.map((cardId) => (
      state.cardResources[pending.reactingSideKey].find((card) => card.id === cardId)
    ));
    if (selectedCards.some((card) => !card)
      || selectedCards.reduce((sum, card) => sum + Number(card.resource), 0) !== 1) {
      fail("LIFE_SUPPORT_FULL_COST_REQUIRED");
    }
    for (const card of selectedCards) {
      verifyCard(card, pending.reactingSideKey, bindings.gameplayBundle);
      if (card.readiness !== "ready") fail("LIFE_SUPPORT_PAYMENT_CARD_NOT_READY");
      card.readiness = "exhausted";
      card.face = "down";
    }
    recordNamedUse(state, pending, source.sourcePieceId);
    recordActivationUse(state, pending, source.sourcePieceId);
  }
  const resolution = TOTAL_DAMAGE_KERNEL.resolve(pending.totalDamageReactionPlan, {
    requestedReduction: use ? source.requestedReduction : 0,
    reductionSourceHash: use ? source.reductionSourceHash : null,
  });
  const reactionEvent = {
    type: actionInput.actionType,
    reactingSideKey: pending.reactingSideKey,
    sourcePieceId: use ? source.sourcePieceId : null,
    targetPieceId: pending.targetPieceId,
    abilityName: LIFE_SUPPORT_SOURCE.abilityName,
    reactionUsed: use,
    cardResourceIds: [...actionInput.cardResourceIds],
    contributingModelIds: use ? [...source.contributingModelIds] : [],
    baseReduction: use ? source.baseReduction : 0,
    passiveBonus: use ? source.passiveBonus : 0,
    requestedReduction: use ? source.requestedReduction : 0,
    pendingReactionHash: pending.pendingReactionHash,
    totalDamageReactionPlanHash: pending.totalDamageReactionPlanHash,
    trainingTruth: false,
  };
  const allocationEvent = applyDamageResolution(
    state,
    pending.totalDamageReactionPlan,
    resolution,
  );
  const historyBody = {
    schema: HISTORY_SCHEMA,
    round: Number(state.round),
    phase: state.phase,
    originalActionSideKey: pending.originalActionSideKey,
    reactingSideKey: pending.reactingSideKey,
    sourcePieceId: use ? source.sourcePieceId : null,
    targetPieceId: pending.targetPieceId,
    abilityName: LIFE_SUPPORT_SOURCE.abilityName,
    decision: use ? "use" : "pass",
    pendingReactionHash: pending.pendingReactionHash,
    cardResourceIds: [...actionInput.cardResourceIds],
    totalDamageResolutionHash: resolution.resolutionHash,
    trainingTruth: false,
  };
  const historyEntry = {
    ...historyBody,
    reactionHistoryHash: hashStarcraftTmgContract(historyBody),
  };
  state.lifeSupportReactionHistory = Array.isArray(state.lifeSupportReactionHistory)
    ? state.lifeSupportReactionHistory
    : [];
  state.lifeSupportReactionHistory.push(historyEntry);
  delete state.pendingLifeSupportReaction;
  const events = [reactionEvent, allocationEvent];
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({
    id: `log-${state.log.length + 1}`,
    round: Number(state.round),
    phase: state.phase,
    action: clone(expected),
    events: clone(events),
  });
  return {
    ok: true,
    schemaVersion: "starcraft_tmg_official_medic_life_support_transition_v1",
    executorId: OFFICIAL_MEDIC_LIFE_SUPPORT_EXECUTOR_ID,
    executorVersion: OFFICIAL_MEDIC_LIFE_SUPPORT_EXECUTOR_VERSION,
    postRevision: Number(options.postRevision || 0),
    state,
    events,
    action: expected,
    settlementSideKey: pending.originalActionSideKey,
    totalDamageResolution: resolution,
    rulesTruth: "official_current_medic_life_support_exact_subset",
    trainingTruth: false,
  };
}

export const OFFICIAL_MEDIC_LIFE_SUPPORT_SOURCE_V1 = LIFE_SUPPORT_SOURCE;
export const OFFICIAL_MEDIC_LIFE_SUPPORT_SOURCE_TEXT_HASH_V1 =
  LIFE_SUPPORT_SOURCE_TEXT_HASH;
export const OFFICIAL_MEDIC_STABILIZER_SOURCE_V1 = STABILIZER_SOURCE;
export const OFFICIAL_MEDIC_STABILIZER_SOURCE_TEXT_HASH_V1 =
  STABILIZER_SOURCE_TEXT_HASH;
