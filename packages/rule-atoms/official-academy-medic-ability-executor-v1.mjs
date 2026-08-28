import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { getOfficialCombatProfileV1 } from
  "../source-data/official-combat-profile-bundle-v1.mjs";
import { verifyOfficialCleanupCardBundleV1 } from
  "../source-data/official-cleanup-card-bundle-v1.mjs";
import { verifyOfficialGameplayDataBundleV1 } from
  "../source-data/official-gameplay-data-bundle-v1.mjs";
import {
  createOfficialCharacteristicStatusKernelV1,
  OFFICIAL_CHARACTERISTIC_STATUS_NEW_ATOM_IDS,
  OFFICIAL_OPTICAL_FLARE_SOURCE_TEXT_HASH_V1,
  OFFICIAL_OPTICAL_FLARE_SOURCE_V1,
} from "./official-characteristic-status-kernel-v1.mjs";
import { OFFICIAL_CLOSE_COMBAT_ATTACK_V7_NEW_ATOM_IDS } from
  "./official-close-combat-attack-executor-v7.mjs";
import { createOfficialHealResolutionKernelV1 } from
  "./official-heal-resolution-kernel-v1.mjs";
import {
  OFFICIAL_MEDIC_MEDPACK_ACTIVE_ACTION_ATOM_IDS,
  OFFICIAL_MEDIC_MEDPACK_SOURCE_TEXT_HASH_V1,
  OFFICIAL_MEDIC_MEDPACK_SOURCE_V1,
} from "./official-medic-medpack-active-executor-v1.mjs";

export const OFFICIAL_ACADEMY_MEDIC_ABILITY_EXECUTOR_ID =
  "authority.academy-medic-ability-v1";
export const OFFICIAL_ACADEMY_MEDIC_ABILITY_EXECUTOR_VERSION = "1.0.0";
export const OFFICIAL_ACADEMY_MEDIC_ABILITY_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_DECLARE_ABILITY_ACTION_TYPE = "declare_ability";
export const OFFICIAL_USE_ABILITY_REACTION_ACTION_TYPE = "use_ability_reaction";
export const OFFICIAL_PASS_ABILITY_REACTION_ACTION_TYPE = "pass_ability_reaction";
export const OFFICIAL_RESOLVE_ABILITY_ACTION_TYPE = "resolve_ability";

export const OFFICIAL_ACADEMY_MEDIC_ABILITY_NEW_ATOM_IDS = Object.freeze([
  ...OFFICIAL_CHARACTERISTIC_STATUS_NEW_ATOM_IDS,
  "rule-atom:singleton:core-10-1-zero-cost-free:e0ae6a9abe7d",
  "rule-atom:singleton:core-10-5-1-generated-resource-not-retained:a6ddc937bf21",
  "rule-atom:tactical-card-resource-field",
].sort((left, right) => left.localeCompare(right)));

const REACTION_DEPENDENCY_IDS = Object.freeze([
  ...OFFICIAL_CLOSE_COMBAT_ATTACK_V7_NEW_ATOM_IDS.filter((atomId) => [
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
    "rule-atom:singleton:core-11-reaction-ability-trigger:cb3b01166414",
    "rule-atom:singleton:core-11-ready-card-capabilities:ddb3761699e5",
    "rule-atom:singleton:core-11-ready-card-definition:6fb6b2aa1ca8",
    "rule-atom:tactical-card-special-ability-field",
  ].includes(atomId)),
].sort((left, right) => left.localeCompare(right)));

export const OFFICIAL_ACADEMY_MEDIC_ABILITY_DEPENDENCY_ATOM_IDS = Object.freeze([
  ...new Set([
    ...OFFICIAL_MEDIC_MEDPACK_ACTIVE_ACTION_ATOM_IDS,
    ...REACTION_DEPENDENCY_IDS,
  ]),
].sort((left, right) => left.localeCompare(right)));

export const OFFICIAL_ACADEMY_MEDIC_ABILITY_ACTION_ATOM_IDS = Object.freeze([
  ...new Set([
    ...OFFICIAL_ACADEMY_MEDIC_ABILITY_DEPENDENCY_ATOM_IDS,
    ...OFFICIAL_ACADEMY_MEDIC_ABILITY_NEW_ATOM_IDS,
  ]),
].sort((left, right) => left.localeCompare(right)));
export const OFFICIAL_ACADEMY_MEDIC_ABILITY_EXECUTOR_ATOM_IDS =
  OFFICIAL_ACADEMY_MEDIC_ABILITY_ACTION_ATOM_IDS;

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
const ACADEMY_SOURCE_RECORD_HASH =
  "fa44c19baa21f3c6c9d983a11b61cd9e8e7ed5904e74fea2cbca7931109fc939";
const ACADEMY_PAYLOAD_HASH =
  "3bbb8f03e371a6d0052df5191ea877ef2e2e5fd3da4037fb99aafa8b9e0b6fa7";
const TERRAN_ARMED_FORCES_RECORD_KEY = "tactical_cards:terran_armed_forces";
const TERRAN_ARMED_FORCES_SOURCE_RECORD_HASH =
  "44aa8b4d52a065dbbc5e93a9bfc203957647393efe4c123e1a0b2b909dbf63c5";
const PENDING_SCHEMA = "starcraft_tmg_academy_medic_ability_window_v1";
const ACADEMY_LEDGER_SCHEMA = "starcraft_tmg_academy_reaction_usage_ledger_v1";
const BASE_DIAMETER_MILLI_INCHES = Math.round((32 / 25.4) * 1000);
const SIDE_KEYS = Object.freeze(["player1", "player2"]);
const ABILITY_WINDOWS = Object.freeze(["after_action", "before_action"]);
const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const STATUS_KERNEL = createOfficialCharacteristicStatusKernelV1();
const HEAL_KERNEL = createOfficialHealResolutionKernelV1();
const ACADEMY_SOURCE = Object.freeze({
  abilityId: "advanced_training",
  abilityName: "Advanced Training",
  abilityType: "reaction",
  phase: "Any Phase",
  description:
    "Advanced Training <Reaction> <Any Phase>: Once per Round, when a Friendly Support Unit activates a Special Ability that costs CP, resolve that ability with its CP cost reduced by 1 (to a minimum of 0). Do not Exhaust this card.",
  costReduction: 1,
  minimumCost: 0,
  frequency: "once_per_round",
  exhaustOnUse: false,
});
const ACADEMY_SOURCE_TEXT_HASH = hashStarcraftTmgContract(ACADEMY_SOURCE);

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
  fail("ACADEMY_MEDIC_SIDE_REQUIRED");
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

function milli(value, code, detail = "") {
  const number = Number(value);
  if (!Number.isFinite(number)) fail(code, detail);
  const result = Math.round(number * 1000);
  if (!Number.isSafeInteger(result)) fail(code, detail);
  return result;
}

function validateState(state) {
  if (!object(state) || !object(state.players) || !object(state.board)
    || !Array.isArray(state.pieces)) {
    fail("ACADEMY_MEDIC_STATE_INVALID");
  }
}

function profileByRecordKey(cleanupCardBundle, recordKey) {
  return cleanupCardBundle.profiles.find((profile) => profile.recordKey === recordKey);
}

function verifyBindings(state, matchBinding) {
  const gameplayBundle = state.officialGameplayDataBundle;
  verifyOfficialGameplayDataBundleV1(gameplayBundle);
  const cleanupCardBundle = gameplayBundle.cleanupCardBundle;
  verifyOfficialCleanupCardBundleV1(cleanupCardBundle);
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
    fail("ACADEMY_MEDIC_LATEST_OFFICIAL_DATA_REQUIRED");
  }
  const medic = getOfficialCombatProfileV1(gameplayBundle.combatProfileBundle, MEDIC_RECORD_KEY);
  const marine = getOfficialCombatProfileV1(gameplayBundle.combatProfileBundle, MARINE_RECORD_KEY);
  const academy = profileByRecordKey(cleanupCardBundle, ACADEMY_RECORD_KEY);
  const armedForces = profileByRecordKey(cleanupCardBundle, TERRAN_ARMED_FORCES_RECORD_KEY);
  if (medic.sourceRecordHash !== MEDIC_SOURCE_RECORD_HASH
    || medic.payloadHash !== MEDIC_PAYLOAD_HASH
    || medic.unitName !== "Medic"
    || !isDeepStrictEqual(medic.combatTags, ["biological", "ground", "light"])
    || marine.sourceRecordHash !== MARINE_SOURCE_RECORD_HASH
    || marine.payloadHash !== MARINE_PAYLOAD_HASH
    || marine.unitName !== "Marine"
    || !academy
    || academy.sourceRecordHash !== ACADEMY_SOURCE_RECORD_HASH
    || academy.payloadHash !== ACADEMY_PAYLOAD_HASH
    || academy.cardKind !== "tactical"
    || academy.resource !== 1
    || academy.abilitySourceTextHash !== hashStarcraftTmgContract([{
      name: "Advanced Training",
      description: ACADEMY_SOURCE.description,
    }])
    || !armedForces
    || armedForces.sourceRecordHash !== TERRAN_ARMED_FORCES_SOURCE_RECORD_HASH
    || armedForces.cardKind !== "faction"
    || armedForces.resource !== 1) {
    fail("ACADEMY_MEDIC_OFFICIAL_PROFILE_DRIFT");
  }
  return { gameplayBundle, medic, marine, academy, armedForces };
}

function exactModels(piece, recordKey, sourceHash, payloadHash, role) {
  const models = activeModels(piece);
  if (!activePiece(piece)
    || piece.officialUnitRecordKey !== recordKey
    || piece.sourceRecordHash !== sourceHash
    || piece.officialPayloadHash !== payloadHash
    || !Number.isSafeInteger(Number(piece.currentModels))
    || Number(piece.currentModels) !== models.length
    || !Array.isArray(piece.destroyedModelIds)
    || !isDeepStrictEqual(piece.combatTags, ["biological", "ground", "light"])
    || piece.combatTag !== "ground") {
    fail("ACADEMY_MEDIC_UNIT_SCOPE_UNSUPPORTED", role);
  }
  for (const model of models) {
    if (model.baseShape !== "round"
      || milli(model.baseWidthInches, "ACADEMY_MEDIC_BASE_SCOPE_UNSUPPORTED", model.id)
        !== BASE_DIAMETER_MILLI_INCHES
      || milli(model.baseDepthInches, "ACADEMY_MEDIC_BASE_SCOPE_UNSUPPORTED", model.id)
        !== BASE_DIAMETER_MILLI_INCHES
      || String(model.elevation || "ground") !== "ground"
      || !isDeepStrictEqual(model.supportTerrainIds || [], [])
      || !isDeepStrictEqual(model.adjacentAccessPointIds || [], [])) {
      fail("ACADEMY_MEDIC_BASE_SCOPE_UNSUPPORTED", model.id);
    }
  }
  return models;
}

function baseGapMilliInches(left, right) {
  return Math.max(0, Math.round(Math.hypot(
    milli(right.xInches, "ACADEMY_MEDIC_MODEL_GEOMETRY_INVALID", right.id)
      - milli(left.xInches, "ACADEMY_MEDIC_MODEL_GEOMETRY_INVALID", left.id),
    milli(right.yInches, "ACADEMY_MEDIC_MODEL_GEOMETRY_INVALID", right.id)
      - milli(left.yInches, "ACADEMY_MEDIC_MODEL_GEOMETRY_INVALID", left.id),
  ) - BASE_DIAMETER_MILLI_INCHES));
}

function withinReceipt(sourceModels, targetModels, rangeMilliInches) {
  const pairs = sourceModels.flatMap((source) => targetModels.map((target) => ({
    sourceModelId: source.id,
    targetModelId: target.id,
    baseGapMilliInches: baseGapMilliInches(source, target),
  }))).sort((left, right) => (
    left.sourceModelId.localeCompare(right.sourceModelId)
      || left.targetModelId.localeCompare(right.targetModelId)
  ));
  const nearestBaseGapMilliInches = Math.min(...pairs.map((pair) => pair.baseGapMilliInches));
  const contributingModelIds = sourceModels.filter((source) => pairs.some((pair) => (
    pair.sourceModelId === source.id && pair.baseGapMilliInches <= rangeMilliInches
  ))).map((model) => model.id).sort();
  const body = {
    schema: "starcraft_tmg_official_academy_medic_within_receipt_v1",
    rangeMilliInches,
    pairs,
    nearestBaseGapMilliInches,
    targetUnitWithin: nearestBaseGapMilliInches <= rangeMilliInches,
    contributingModelIds,
    trainingTruth: false,
  };
  return { ...body, withinReceiptHash: hashStarcraftTmgContract(body) };
}

function verifyCard(card, sideKey, bindings) {
  const profile = card?.officialCardRecordKey === ACADEMY_RECORD_KEY
    ? bindings.academy
    : card?.officialCardRecordKey === TERRAN_ARMED_FORCES_RECORD_KEY
      ? bindings.armedForces
      : null;
  if (!profile
    || !String(card?.id || "")
    || card.sideKey !== sideKey
    || card.cardKind !== profile.cardKind
    || card.sourceRecordHash !== profile.sourceRecordHash
    || Number(card.resource) !== profile.resource
    || card.resourceType !== "CP"
    || !["ready", "exhausted"].includes(card.readiness)
    || card.face !== (card.readiness === "ready" ? "up" : "down")
    || !isDeepStrictEqual(card.activeEffects || [], [])) {
    fail("ACADEMY_MEDIC_CARD_STATE_INVALID", String(card?.id || ""));
  }
  return card;
}

function cardsForSide(state, sideKey, bindings) {
  if (state.players?.[sideKey]?.faction !== "Terran"
    || !Array.isArray(state.cardResources?.[sideKey])) {
    fail("ACADEMY_MEDIC_CARD_STATE_INVALID", sideKey);
  }
  const cards = state.cardResources[sideKey].map((card) => verifyCard(card, sideKey, bindings));
  if (new Set(cards.map((card) => card.id)).size !== cards.length) {
    fail("ACADEMY_MEDIC_CARD_STATE_INVALID", "duplicate_card_id");
  }
  return cards;
}

function verifyAcademyLedger(state) {
  if (state.academyReactionUsage === undefined) return { entries: [] };
  const ledger = state.academyReactionUsage;
  if (!object(ledger)
    || ledger.schema !== ACADEMY_LEDGER_SCHEMA
    || ledger.round !== Number(state.round)
    || !Array.isArray(ledger.entries)
    || ledger.trainingTruth !== false
    || ledger.ledgerHash !== hashStarcraftTmgContract(without(ledger, ["ledgerHash"]))) {
    fail("ACADEMY_REACTION_LEDGER_INVALID");
  }
  for (const entry of ledger.entries) {
    if (entry.abilityName !== ACADEMY_SOURCE.abilityName
      || !String(entry.cardId || "")
      || !String(entry.sourcePieceId || "")
      || !HASH_PATTERN.test(String(entry.pendingAbilityHash || ""))) {
      fail("ACADEMY_REACTION_LEDGER_INVALID");
    }
  }
  return ledger;
}

function academyReactionCard(state, sideKey, bindings) {
  const card = cardsForSide(state, sideKey, bindings).find((row) => (
    row.officialCardRecordKey === ACADEMY_RECORD_KEY
  ));
  if (!card || card.readiness !== "ready") return null;
  const used = verifyAcademyLedger(state).entries.some((entry) => entry.cardId === card.id);
  return used ? null : card;
}

function recordAcademyReaction(state, pending) {
  const existing = verifyAcademyLedger(state);
  if (existing.entries.some((entry) => entry.cardId === pending.reactionCardId)) {
    fail("ACADEMY_REACTION_ALREADY_USED_THIS_ROUND");
  }
  const body = {
    schema: ACADEMY_LEDGER_SCHEMA,
    round: Number(state.round),
    entries: [...clone(existing.entries), {
      cardId: pending.reactionCardId,
      abilityName: ACADEMY_SOURCE.abilityName,
      sourcePieceId: pending.pieceId,
      pendingAbilityHash: pending.pendingAbilityHash,
    }],
    trainingTruth: false,
  };
  state.academyReactionUsage = { ...body, ledgerHash: hashStarcraftTmgContract(body) };
}

function abilitySource(abilityId) {
  if (abilityId === OFFICIAL_MEDIC_MEDPACK_SOURCE_V1.abilityId) {
    return { ...OFFICIAL_MEDIC_MEDPACK_SOURCE_V1, sourceTextHash: OFFICIAL_MEDIC_MEDPACK_SOURCE_TEXT_HASH_V1 };
  }
  if (abilityId === OFFICIAL_OPTICAL_FLARE_SOURCE_V1.abilityId) {
    return { ...OFFICIAL_OPTICAL_FLARE_SOURCE_V1, sourceTextHash: OFFICIAL_OPTICAL_FLARE_SOURCE_TEXT_HASH_V1 };
  }
  fail("ACADEMY_MEDIC_ABILITY_UNSUPPORTED", abilityId);
}

function abilityContext(state, sideKey, piece, target, abilityId, abilityWindow, bindings) {
  if (state.phase !== "movement") fail("ACADEMY_MEDIC_WRONG_PHASE");
  if (state.activeSideKey !== sideKey) fail("ACADEMY_MEDIC_NOT_ACTIVE_SIDE");
  if (state.players?.[sideKey]?.passedPhases?.movement === true) fail("ACADEMY_MEDIC_SIDE_PASSED");
  if (!ABILITY_WINDOWS.includes(abilityWindow)) fail("ACADEMY_MEDIC_ACTION_WINDOW_INVALID");
  if (piece?.sideKey !== sideKey || piece?.activatedPhases?.movement === true) {
    fail("ACADEMY_MEDIC_SOURCE_UNAVAILABLE");
  }
  if (piece.isInReserves === true || piece.isOnField !== true) {
    fail("ACADEMY_MEDIC_RESERVE_PROHIBITED");
  }
  if (state.pendingAction !== undefined && state.pendingAction !== null) {
    fail("ACADEMY_MEDIC_MID_ACTION_PROHIBITED");
  }
  if ((state.board.terrain || []).length !== 0
    || (state.board.accessPoints || []).length !== 0) {
    fail("ACADEMY_MEDIC_LINE_OF_SIGHT_SCOPE_UNSUPPORTED");
  }
  const sourceModels = exactModels(
    piece,
    MEDIC_RECORD_KEY,
    MEDIC_SOURCE_RECORD_HASH,
    MEDIC_PAYLOAD_HASH,
    "source",
  );
  if (!isDeepStrictEqual(piece.selectedUpgradeNames || [], ["Medpack", "Optical Flare"])) {
    fail("ACADEMY_MEDIC_LOADOUT_SCOPE_UNSUPPORTED");
  }
  const targetModels = exactModels(
    target,
    MARINE_RECORD_KEY,
    MARINE_SOURCE_RECORD_HASH,
    MARINE_PAYLOAD_HASH,
    "target",
  );
  const source = abilitySource(abilityId);
  const isMedpack = abilityId === OFFICIAL_MEDIC_MEDPACK_SOURCE_V1.abilityId;
  if (isMedpack
    ? target.sideKey !== sideKey || target.id === piece.id
    : target.sideKey !== otherSide(sideKey)) {
    fail("ACADEMY_MEDIC_TARGET_INVALID");
  }
  const rangeMilliInches = (isMedpack ? 4 : 12) * 1000;
  const within = withinReceipt(sourceModels, targetModels, rangeMilliInches);
  if (!within.targetUnitWithin) fail("ACADEMY_MEDIC_TARGET_OUT_OF_RANGE");
  if (isMedpack) {
    if (!isDeepStrictEqual(target.statuses || [], [])
      || Number(target.damageMarker || 0) < 0
      || Number(target.damageMarker || 0) >= bindings.marine.hitPoints) {
      fail("ACADEMY_MEDIC_TARGET_STATE_UNSUPPORTED");
    }
  } else if ((target.statuses || []).some((status) => (
    status?.sourceAbilityId === OFFICIAL_OPTICAL_FLARE_SOURCE_V1.abilityId
  ))) {
    fail("ACADEMY_MEDIC_DUPLICATE_OPTICAL_FLARE_UNSUPPORTED");
  }
  const reactionCard = academyReactionCard(state, sideKey, bindings);
  const body = {
    schema: "starcraft_tmg_official_academy_medic_ability_plan_v1",
    round: Number(state.round),
    phase: "movement",
    sideKey,
    pieceId: piece.id,
    targetId: target.id,
    abilityId: source.abilityId,
    abilityName: source.abilityName,
    abilityWindow,
    sourceTextHash: source.sourceTextHash,
    originalResourceCost: source.resourceCost,
    resourceType: "CP",
    reactionCardId: reactionCard?.id || null,
    reactionAvailable: Boolean(reactionCard),
    withinReceiptHash: within.withinReceiptHash,
    contributingModelIds: isMedpack ? [...within.contributingModelIds] : [],
    targetDistanceMilliInches: within.nearestBaseGapMilliInches,
    targetRangeMilliInches: rangeMilliInches,
    trainingTruth: false,
  };
  return {
    source,
    sourceModels,
    targetModels,
    within,
    reactionCard,
    plan: { ...body, abilityPlanHash: hashStarcraftTmgContract(body) },
  };
}

function declarationAction(sideKey, piece, target, context) {
  return {
    actionType: OFFICIAL_DECLARE_ABILITY_ACTION_TYPE,
    sideKey,
    phase: "movement",
    pieceId: piece.id,
    targetId: target.id,
    abilityId: context.source.abilityId,
    abilityName: context.source.abilityName,
    abilityWindow: context.plan.abilityWindow,
    resourceType: "CP",
    originalResourceCost: context.plan.originalResourceCost,
    modifiedResourceCost: context.plan.originalResourceCost,
    costReduction: 0,
    reactionCardId: context.plan.reactionCardId,
    targetRangeMilliInches: context.plan.targetRangeMilliInches,
    targetDistanceMilliInches: context.plan.targetDistanceMilliInches,
    abilityPlanHash: context.plan.abilityPlanHash,
    ruleAtomIds: [...OFFICIAL_ACADEMY_MEDIC_ABILITY_ACTION_ATOM_IDS],
    executorId: OFFICIAL_ACADEMY_MEDIC_ABILITY_EXECUTOR_ID,
    executorVersion: OFFICIAL_ACADEMY_MEDIC_ABILITY_EXECUTOR_VERSION,
  };
}

function pendingBody(input) {
  return {
    schema: PENDING_SCHEMA,
    stage: input.stage,
    round: input.round,
    phase: "movement",
    sideKey: input.sideKey,
    pieceId: input.pieceId,
    targetId: input.targetId,
    abilityId: input.abilityId,
    abilityName: input.abilityName,
    abilityWindow: input.abilityWindow,
    abilityPlanHash: input.abilityPlanHash,
    declarationActionHash: input.declarationActionHash,
    reactionCardId: input.reactionCardId,
    reactionDecision: input.reactionDecision,
    originalResourceCost: input.originalResourceCost,
    modifiedResourceCost: input.modifiedResourceCost,
    costReduction: input.costReduction,
    resourceType: "CP",
    targetRangeMilliInches: input.targetRangeMilliInches,
    targetDistanceMilliInches: input.targetDistanceMilliInches,
    previousPendingAbilityHash: input.previousPendingAbilityHash || null,
    trainingTruth: false,
  };
}

function createPending(input) {
  const body = pendingBody(input);
  return { ...body, pendingAbilityHash: hashStarcraftTmgContract(body) };
}

function verifyPending(state) {
  const pending = state.pendingAbility;
  if (!object(pending)
    || pending.schema !== PENDING_SCHEMA
    || pending.round !== Number(state.round)
    || pending.phase !== "movement"
    || pending.sideKey !== state.activeSideKey
    || !["reaction_open", "reaction_decided"].includes(pending.stage)
    || !["medpack", "optical_flare"].includes(pending.abilityId)
    || !ABILITY_WINDOWS.includes(pending.abilityWindow)
    || !Number.isSafeInteger(pending.originalResourceCost)
    || !Number.isSafeInteger(pending.modifiedResourceCost)
    || !Number.isSafeInteger(pending.costReduction)
    || pending.modifiedResourceCost < 0
    || pending.resourceType !== "CP"
    || !HASH_PATTERN.test(String(pending.abilityPlanHash || ""))
    || !HASH_PATTERN.test(String(pending.declarationActionHash || ""))
    || pending.pendingAbilityHash
      !== hashStarcraftTmgContract(without(pending, ["pendingAbilityHash"]))) {
    fail("ACADEMY_MEDIC_PENDING_ABILITY_INVALID");
  }
  if (pending.stage === "reaction_open"
    && (!String(pending.reactionCardId || "")
      || pending.reactionDecision !== null
      || pending.costReduction !== 0
      || pending.modifiedResourceCost !== pending.originalResourceCost)) {
    fail("ACADEMY_MEDIC_PENDING_ABILITY_INVALID");
  }
  if (pending.stage === "reaction_decided"
    && !["advanced_training", "pass"].includes(pending.reactionDecision)) {
    fail("ACADEMY_MEDIC_PENDING_ABILITY_INVALID");
  }
  return pending;
}

export function isOfficialAcademyMedicAbilityPendingV1(state) {
  try {
    verifyPending(state);
    return true;
  } catch {
    return false;
  }
}

function reactionActions(state, options, bindings) {
  const pending = verifyPending(state);
  const sideKey = String(options.sideKey || "").trim();
  if (sideKey !== pending.sideKey) return [];
  if (pending.stage !== "reaction_open") return resolveActions(state, options, bindings);
  const academy = cardsForSide(state, sideKey, bindings).find((card) => (
    card.id === pending.reactionCardId
  ));
  if (!academy || academy.readiness !== "ready") return [];
  const common = {
    sideKey,
    phase: "movement",
    pieceId: pending.pieceId,
    targetId: pending.targetId,
    abilityId: pending.abilityId,
    abilityName: pending.abilityName,
    abilityWindow: pending.abilityWindow,
    reactionCardId: academy.id,
    resourceType: "CP",
    originalResourceCost: pending.originalResourceCost,
    pendingAbilityHash: pending.pendingAbilityHash,
    ruleAtomIds: [...OFFICIAL_ACADEMY_MEDIC_ABILITY_ACTION_ATOM_IDS],
    executorId: OFFICIAL_ACADEMY_MEDIC_ABILITY_EXECUTOR_ID,
    executorVersion: OFFICIAL_ACADEMY_MEDIC_ABILITY_EXECUTOR_VERSION,
  };
  return [{
    ...common,
    actionType: OFFICIAL_USE_ABILITY_REACTION_ACTION_TYPE,
    modifiedResourceCost: Math.max(0, pending.originalResourceCost - 1),
    costReduction: 1,
    isEnabled: true,
    disabledReason: "",
    score: 180,
    details: {
      reactionName: ACADEMY_SOURCE.abilityName,
      doNotExhaustReactionCard: true,
      academySourceTextHash: ACADEMY_SOURCE_TEXT_HASH,
      trainingTruth: false,
    },
  }, {
    ...common,
    actionType: OFFICIAL_PASS_ABILITY_REACTION_ACTION_TYPE,
    modifiedResourceCost: pending.originalResourceCost,
    costReduction: 0,
    isEnabled: true,
    disabledReason: "",
    score: 10,
    details: {
      reactionName: ACADEMY_SOURCE.abilityName,
      reactionPassed: true,
      trainingTruth: false,
    },
  }];
}

function exactPaymentSets(state, pending, bindings) {
  const ready = cardsForSide(state, pending.sideKey, bindings).filter((card) => (
    card.readiness === "ready" && card.resourceType === pending.resourceType
  )).sort((left, right) => left.id.localeCompare(right.id));
  if (pending.modifiedResourceCost === 0) return [[]];
  const sets = [];
  for (let mask = 1; mask < (1 << ready.length); mask += 1) {
    const selected = ready.filter((_card, index) => (mask & (1 << index)) !== 0);
    const total = selected.reduce((sum, card) => sum + Number(card.resource), 0);
    if (total === pending.modifiedResourceCost) sets.push(selected.map((card) => card.id));
  }
  return sets.sort((left, right) => left.join(":").localeCompare(right.join(":")));
}

function resolveActions(state, options, bindings) {
  const pending = verifyPending(state);
  if (pending.stage !== "reaction_decided") return [];
  const sideKey = String(options.sideKey || "").trim();
  if (sideKey !== pending.sideKey) return [];
  return exactPaymentSets(state, pending, bindings).map((cardResourceIds) => ({
    actionType: OFFICIAL_RESOLVE_ABILITY_ACTION_TYPE,
    sideKey,
    phase: "movement",
    pieceId: pending.pieceId,
    targetId: pending.targetId,
    abilityId: pending.abilityId,
    abilityName: pending.abilityName,
    abilityWindow: pending.abilityWindow,
    reactionCardId: pending.reactionCardId,
    cardResourceIds,
    resourceType: "CP",
    originalResourceCost: pending.originalResourceCost,
    modifiedResourceCost: pending.modifiedResourceCost,
    costReduction: pending.costReduction,
    pendingAbilityHash: pending.pendingAbilityHash,
    targetRangeMilliInches: pending.targetRangeMilliInches,
    targetDistanceMilliInches: pending.targetDistanceMilliInches,
    ruleAtomIds: [...OFFICIAL_ACADEMY_MEDIC_ABILITY_ACTION_ATOM_IDS],
    executorId: OFFICIAL_ACADEMY_MEDIC_ABILITY_EXECUTOR_ID,
    executorVersion: OFFICIAL_ACADEMY_MEDIC_ABILITY_EXECUTOR_VERSION,
    isEnabled: true,
    disabledReason: "",
    score: pending.reactionDecision === "advanced_training" ? 200 : 150,
    details: {
      zeroCostRequiresNoResource: pending.modifiedResourceCost === 0,
      generatedResourceRetained: 0,
      paymentCardCount: cardResourceIds.length,
      academyMayBeExhaustedForItsSeparateResourceField:
        cardResourceIds.includes(pending.reactionCardId),
      trainingTruth: false,
    },
  }));
}

export function enumerateOfficialAcademyMedicAbilityV1(state, options = {}) {
  validateState(state);
  const sideKey = String(options.sideKey || state.activeSideKey || "").trim();
  if (!SIDE_KEYS.includes(sideKey)) fail("ACADEMY_MEDIC_SIDE_REQUIRED");
  let bindings;
  try {
    bindings = verifyBindings(state, options.matchBinding);
  } catch (error) {
    if (options.throwOnError === true) throw error;
    return [];
  }
  if (state.pendingAbility !== undefined) {
    try {
      return reactionActions(state, options, bindings);
    } catch {
      return [];
    }
  }
  const rows = [];
  const diagnostics = [];
  const sources = state.pieces.filter((piece) => (
    piece.sideKey === sideKey && piece.officialUnitRecordKey === MEDIC_RECORD_KEY
  ));
  for (const piece of sources) {
    for (const target of state.pieces.filter((row) => (
      row.officialUnitRecordKey === MARINE_RECORD_KEY && activePiece(row)
    ))) {
      for (const abilityId of ["medpack", "optical_flare"]) {
        for (const abilityWindow of ABILITY_WINDOWS) {
          let context;
          try {
            context = abilityContext(
              state,
              sideKey,
              piece,
              target,
              abilityId,
              abilityWindow,
              bindings,
            );
          } catch (error) {
            diagnostics.push(error);
            continue;
          }
          rows.push({
            ...declarationAction(sideKey, piece, target, context),
            isEnabled: true,
            disabledReason: "",
            score: abilityId === "optical_flare" ? 175 : 165,
            details: {
              sourceRule:
                "official_current_academy_advanced_training_medic_medpack_optical_flare_and_core_10_11",
              academyReactionAvailable: context.plan.reactionAvailable,
              academySourceTextHash: ACADEMY_SOURCE_TEXT_HASH,
              abilitySourceTextHash: context.source.sourceTextHash,
              characteristicStatusKernelHash: STATUS_KERNEL.descriptor.kernelHash,
              withinReceiptHash: context.within.withinReceiptHash,
              rulesTruth: "official_current_academy_medic_ability_exact_subset",
              trainingTruth: false,
            },
          });
        }
      }
    }
  }
  if (rows.length === 0 && options.throwOnError === true && diagnostics.length > 0) {
    throw diagnostics[0];
  }
  return rows.sort((left, right) => (
    `${left.abilityId}:${left.pieceId}:${left.targetId}:${left.abilityWindow}`.localeCompare(
      `${right.abilityId}:${right.pieceId}:${right.targetId}:${right.abilityWindow}`,
    )
  ));
}

function appendLog(state, action, events) {
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({
    id: `log-${state.log.length + 1}`,
    round: Number(state.round),
    phase: "movement",
    action: clone(action),
    events: clone(events),
  });
}

function expectedAction(state, actionInput, options) {
  return enumerateOfficialAcademyMedicAbilityV1(state, {
    sideKey: actionInput.sideKey,
    matchBinding: options.matchBinding,
  }).map(actionFromCandidate).find((action) => isDeepStrictEqual(action, actionInput));
}

function applyDeclaration(stateInput, actionInput, options) {
  const expected = expectedAction(stateInput, actionInput, options);
  if (!expected) fail("ACADEMY_MEDIC_ACTION_STALE");
  const state = clone(stateInput);
  const stage = actionInput.reactionCardId ? "reaction_open" : "reaction_decided";
  const body = {
    stage,
    round: Number(state.round),
    sideKey: actionInput.sideKey,
    pieceId: actionInput.pieceId,
    targetId: actionInput.targetId,
    abilityId: actionInput.abilityId,
    abilityName: actionInput.abilityName,
    abilityWindow: actionInput.abilityWindow,
    abilityPlanHash: actionInput.abilityPlanHash,
    declarationActionHash: hashStarcraftTmgContract(actionInput),
    reactionCardId: actionInput.reactionCardId,
    reactionDecision: stage === "reaction_open" ? null : "pass",
    originalResourceCost: actionInput.originalResourceCost,
    modifiedResourceCost: actionInput.originalResourceCost,
    costReduction: 0,
    targetRangeMilliInches: actionInput.targetRangeMilliInches,
    targetDistanceMilliInches: actionInput.targetDistanceMilliInches,
  };
  state.pendingAbility = createPending(body);
  const events = [{
    type: OFFICIAL_DECLARE_ABILITY_ACTION_TYPE,
    pieceId: actionInput.pieceId,
    targetId: actionInput.targetId,
    abilityId: actionInput.abilityId,
    abilityName: actionInput.abilityName,
    pendingAbilityHash: state.pendingAbility.pendingAbilityHash,
    reactionWindowOpened: stage === "reaction_open",
    trainingTruth: false,
  }];
  appendLog(state, expected, events);
  return { state, events, action: expected };
}

function applyReactionDecision(stateInput, actionInput, options) {
  const expected = expectedAction(stateInput, actionInput, options);
  if (!expected) fail("ACADEMY_MEDIC_ACTION_STALE");
  const state = clone(stateInput);
  const pending = verifyPending(state);
  if (actionInput.pendingAbilityHash !== pending.pendingAbilityHash) {
    fail("ACADEMY_MEDIC_PENDING_ABILITY_STALE");
  }
  const use = actionInput.actionType === OFFICIAL_USE_ABILITY_REACTION_ACTION_TYPE;
  if (use) {
    const bindings = verifyBindings(state, options.matchBinding);
    const academy = cardsForSide(state, actionInput.sideKey, bindings).find((card) => (
      card.id === pending.reactionCardId
    ));
    if (!academy || academy.readiness !== "ready") fail("ACADEMY_REACTION_CARD_NOT_READY");
    recordAcademyReaction(state, pending);
  }
  state.pendingAbility = createPending({
    ...pending,
    stage: "reaction_decided",
    reactionDecision: use ? "advanced_training" : "pass",
    modifiedResourceCost: use
      ? Math.max(0, pending.originalResourceCost - 1)
      : pending.originalResourceCost,
    costReduction: use ? 1 : 0,
    previousPendingAbilityHash: pending.pendingAbilityHash,
  });
  const events = [{
    type: actionInput.actionType,
    reactionName: ACADEMY_SOURCE.abilityName,
    reactionCardId: pending.reactionCardId,
    pendingAbilityHashBefore: pending.pendingAbilityHash,
    pendingAbilityHashAfter: state.pendingAbility.pendingAbilityHash,
    originalResourceCost: pending.originalResourceCost,
    modifiedResourceCost: state.pendingAbility.modifiedResourceCost,
    reactionCardExhausted: false,
    trainingTruth: false,
  }];
  appendLog(state, expected, events);
  return { state, events, action: expected };
}

function applyResolution(stateInput, actionInput, options) {
  const expected = expectedAction(stateInput, actionInput, options);
  if (!expected) fail("ACADEMY_MEDIC_ACTION_STALE");
  const bindings = verifyBindings(stateInput, options.matchBinding);
  const pending = verifyPending(stateInput);
  if (pending.stage !== "reaction_decided"
    || actionInput.pendingAbilityHash !== pending.pendingAbilityHash) {
    fail("ACADEMY_MEDIC_PENDING_ABILITY_STALE");
  }
  const state = clone(stateInput);
  const piece = state.pieces.find((row) => row.id === pending.pieceId);
  const target = state.pieces.find((row) => row.id === pending.targetId);
  const context = abilityContext(
    { ...state, pendingAbility: undefined },
    pending.sideKey,
    piece,
    target,
    pending.abilityId,
    pending.abilityWindow,
    bindings,
  );
  const selectedCards = actionInput.cardResourceIds.map((cardId) => (
    state.cardResources[pending.sideKey].find((card) => card.id === cardId)
  ));
  if (selectedCards.some((card) => !card)) fail("ACADEMY_MEDIC_PAYMENT_CARD_MISSING");
  const resourceGenerated = selectedCards.reduce((sum, card) => sum + Number(card.resource), 0);
  if (resourceGenerated !== pending.modifiedResourceCost) {
    fail("ACADEMY_MEDIC_FULL_COST_REQUIRED");
  }
  for (const card of selectedCards) {
    verifyCard(card, pending.sideKey, bindings);
    if (card.readiness !== "ready") fail("ACADEMY_MEDIC_PAYMENT_CARD_NOT_READY");
    card.readiness = "exhausted";
    card.face = "down";
  }
  const resolutionBody = {
    schema: "starcraft_tmg_official_academy_medic_ability_resolution_v1",
    pendingAbilityHash: pending.pendingAbilityHash,
    abilityId: pending.abilityId,
    pieceId: pending.pieceId,
    targetId: pending.targetId,
    originalResourceCost: pending.originalResourceCost,
    modifiedResourceCost: pending.modifiedResourceCost,
    costReduction: pending.costReduction,
    cardResourceIds: [...actionInput.cardResourceIds],
    resourceGenerated,
    generatedResourceRetained: 0,
    trainingTruth: false,
  };
  const abilityResolutionHash = hashStarcraftTmgContract(resolutionBody);
  let effect;
  if (pending.abilityId === "medpack") {
    effect = HEAL_KERNEL.resolveHeal({
      currentModels: target.currentModels,
      maxModels: target.maxModels,
      destroyedModelIds: target.destroyedModelIds,
      damageMarker: target.damageMarker || 0,
      healValue: context.within.contributingModelIds.length,
      statuses: target.statuses || [],
      shieldValue: bindings.marine.shield,
    });
    target.damageMarker = effect.damageMarkerAfter;
    target.statuses = [...effect.statusesAfter];
  } else {
    effect = STATUS_KERNEL.createOpticalFlareStatus({
      round: Number(state.round),
      sourceSideKey: pending.sideKey,
      sourcePieceId: pending.pieceId,
      targetPieceId: pending.targetId,
      abilityResolutionHash,
    });
    target.statuses = Array.isArray(target.statuses) ? target.statuses : [];
    target.statuses.push(clone(effect.status));
    state.board.effectMarkers = Array.isArray(state.board.effectMarkers)
      ? state.board.effectMarkers
      : [];
    state.board.effectMarkers.push(clone(effect.marker));
  }
  piece.activatedPhases = {
    movement: false,
    assault: false,
    combat: false,
    ...(piece.activatedPhases || {}),
    movement: true,
  };
  const historyBody = {
    schema: "starcraft_tmg_official_academy_medic_ability_history_entry_v1",
    round: Number(state.round),
    sideKey: pending.sideKey,
    pieceId: pending.pieceId,
    targetId: pending.targetId,
    abilityId: pending.abilityId,
    abilityName: pending.abilityName,
    reactionDecision: pending.reactionDecision,
    originalResourceCost: pending.originalResourceCost,
    modifiedResourceCost: pending.modifiedResourceCost,
    abilityResolutionHash,
    effectHash: effect.healResolutionHash || effect.status.statusEffectHash,
    trainingTruth: false,
  };
  state.activeAbilityUseHistory = Array.isArray(state.activeAbilityUseHistory)
    ? state.activeAbilityUseHistory
    : [];
  state.activeAbilityUseHistory.push({
    ...historyBody,
    abilityUseHash: hashStarcraftTmgContract(historyBody),
  });
  delete state.pendingAbility;
  const payment = {
    resourceType: "CP",
    originalCost: pending.originalResourceCost,
    modifiedCost: pending.modifiedResourceCost,
    costReduction: pending.costReduction,
    cardResourceIds: [...actionInput.cardResourceIds],
    resourceGenerated,
    excessResourceLost: 0,
    generatedResourceRetained: 0,
    zeroCostRequiresNoResource: pending.modifiedResourceCost === 0,
  };
  const abilityEvent = {
    type: OFFICIAL_RESOLVE_ABILITY_ACTION_TYPE,
    subtype: pending.abilityId,
    pieceId: pending.pieceId,
    targetId: pending.targetId,
    abilityName: pending.abilityName,
    abilityResolutionHash,
    resourcePayment: payment,
    effect: clone(effect),
    trainingTruth: false,
  };
  const holdEvent = { type: "hold", pieceId: pending.pieceId, phase: "movement" };
  const events = pending.abilityWindow === "before_action"
    ? [abilityEvent, holdEvent]
    : [holdEvent, abilityEvent];
  appendLog(state, expected, events);
  return { state, events, action: expected, effect, abilityResolutionHash };
}

export function applyOfficialAcademyMedicAbilityV1(stateInput, actionInput, options = {}) {
  validateState(stateInput);
  if (!object(actionInput)
    || actionInput.executorId !== OFFICIAL_ACADEMY_MEDIC_ABILITY_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_ACADEMY_MEDIC_ABILITY_EXECUTOR_VERSION
    || ![
      OFFICIAL_DECLARE_ABILITY_ACTION_TYPE,
      OFFICIAL_USE_ABILITY_REACTION_ACTION_TYPE,
      OFFICIAL_PASS_ABILITY_REACTION_ACTION_TYPE,
      OFFICIAL_RESOLVE_ABILITY_ACTION_TYPE,
    ].includes(actionInput.actionType)) {
    fail("ACADEMY_MEDIC_ACTION_INVALID");
  }
  let applied;
  if (actionInput.actionType === OFFICIAL_DECLARE_ABILITY_ACTION_TYPE) {
    applied = applyDeclaration(stateInput, actionInput, options);
  } else if ([
    OFFICIAL_USE_ABILITY_REACTION_ACTION_TYPE,
    OFFICIAL_PASS_ABILITY_REACTION_ACTION_TYPE,
  ].includes(actionInput.actionType)) {
    applied = applyReactionDecision(stateInput, actionInput, options);
  } else {
    applied = applyResolution(stateInput, actionInput, options);
  }
  return {
    ok: true,
    schemaVersion: "starcraft_tmg_official_academy_medic_ability_transition_v1",
    executorId: OFFICIAL_ACADEMY_MEDIC_ABILITY_EXECUTOR_ID,
    executorVersion: OFFICIAL_ACADEMY_MEDIC_ABILITY_EXECUTOR_VERSION,
    postRevision: Number(options.postRevision || 0),
    ...applied,
    rulesTruth: "official_current_academy_medic_ability_exact_subset",
    trainingTruth: false,
  };
}

export const OFFICIAL_ACADEMY_ADVANCED_TRAINING_SOURCE_V1 = ACADEMY_SOURCE;
export const OFFICIAL_ACADEMY_ADVANCED_TRAINING_SOURCE_TEXT_HASH_V1 =
  ACADEMY_SOURCE_TEXT_HASH;
