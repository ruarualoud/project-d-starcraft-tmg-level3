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
  OFFICIAL_OPTICAL_FLARE_MARKER_SCHEMA,
  OFFICIAL_OPTICAL_FLARE_STATUS_SCHEMA,
  verifyOfficialOpticalFlareMarkerV1,
  verifyOfficialOpticalFlareStatusV1,
} from "./official-characteristic-status-kernel-v1.mjs";
import { OFFICIAL_ACADEMY_MEDIC_ABILITY_ACTION_ATOM_IDS } from
  "./official-academy-medic-ability-executor-v1.mjs";

export const OFFICIAL_MEDIC_RESTORATION_EXECUTOR_ID =
  "authority.medic-restoration-reaction-v1";
export const OFFICIAL_MEDIC_RESTORATION_EXECUTOR_VERSION = "1.0.0";
export const OFFICIAL_MEDIC_RESTORATION_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_USE_RESTORATION_REACTION_ACTION_TYPE =
  "use_restoration_reaction";
export const OFFICIAL_PASS_RESTORATION_REACTION_ACTION_TYPE =
  "pass_restoration_reaction";

export const OFFICIAL_MEDIC_RESTORATION_NEW_ATOM_IDS = Object.freeze([
  "rule-atom:named-reaction-frequency-per-unit-round",
  "rule-atom:reaction-ability-use-limits-composite",
  "rule-atom:reaction-reserve-prohibition",
  "rule-atom:singleton:core-2-7-3-same-name-reaction-limit:7f4ba1e6653f",
].sort((left, right) => left.localeCompare(right)));

export const OFFICIAL_MEDIC_RESTORATION_DEPENDENCY_ATOM_IDS = Object.freeze([
  ...OFFICIAL_ACADEMY_MEDIC_ABILITY_ACTION_ATOM_IDS,
]);

export const OFFICIAL_MEDIC_RESTORATION_ACTION_ATOM_IDS = Object.freeze([
  ...new Set([
    ...OFFICIAL_MEDIC_RESTORATION_DEPENDENCY_ATOM_IDS,
    ...OFFICIAL_MEDIC_RESTORATION_NEW_ATOM_IDS,
  ]),
].sort((left, right) => left.localeCompare(right)));

export const OFFICIAL_MEDIC_RESTORATION_EXECUTOR_ATOM_IDS =
  OFFICIAL_MEDIC_RESTORATION_ACTION_ATOM_IDS;

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
const ACADEMY_RECORD_KEY = "tactical_cards:academy";
const PENDING_SCHEMA = "starcraft_tmg_medic_restoration_reaction_window_v1";
const LEDGER_SCHEMA = "starcraft_tmg_medic_restoration_reaction_ledger_v1";
const HISTORY_SCHEMA = "starcraft_tmg_medic_restoration_reaction_history_entry_v1";
const SIDE_KEYS = Object.freeze(["player1", "player2"]);
const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const MAX_PAYMENT_CARDS = 12;

const RESTORATION_SOURCE = Object.freeze({
  abilityId: "restoration",
  abilityName: "Restoration",
  activation: "<Reaction>\n(1 Command Point)",
  phase: "Any Phase",
  description:
    "Use when a Friendly Unit Within 4\" receives a DEBUFF. Remove all DEBUFFS from it.",
  resourceType: "CP",
  resourceCost: 1,
  trigger: "friendly_unit_within_4_receives_debuff",
  effect: "remove_all_debuffs_from_trigger_unit",
});
const RESTORATION_SOURCE_TEXT_HASH = hashStarcraftTmgContract(RESTORATION_SOURCE);

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
  fail("RESTORATION_SIDE_REQUIRED");
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

function milli(value, code) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) fail(code);
  const result = Math.round(parsed * 1000);
  if (!Number.isSafeInteger(result)) fail(code);
  return result;
}

function modelRadiusMilli(model) {
  if (model?.baseShape !== "round") fail("RESTORATION_BASE_SCOPE_UNSUPPORTED");
  const width = milli(model.baseWidthInches, "RESTORATION_BASE_SCOPE_UNSUPPORTED");
  const depth = milli(model.baseDepthInches, "RESTORATION_BASE_SCOPE_UNSUPPORTED");
  if (width !== depth || width <= 0) fail("RESTORATION_BASE_SCOPE_UNSUPPORTED");
  return width / 2;
}

function baseGapMilli(left, right) {
  const centerDistance = Math.round(Math.hypot(
    milli(right.xInches, "RESTORATION_MODEL_GEOMETRY_INVALID")
      - milli(left.xInches, "RESTORATION_MODEL_GEOMETRY_INVALID"),
    milli(right.yInches, "RESTORATION_MODEL_GEOMETRY_INVALID")
      - milli(left.yInches, "RESTORATION_MODEL_GEOMETRY_INVALID"),
  ));
  return Math.max(0, Math.round(
    centerDistance - modelRadiusMilli(left) - modelRadiusMilli(right),
  ));
}

function nearestWithinReceipt(source, target) {
  const rows = activeModels(source).flatMap((sourceModel) => (
    activeModels(target).map((targetModel) => ({
      sourceModelId: sourceModel.id,
      targetModelId: targetModel.id,
      baseGapMilliInches: baseGapMilli(sourceModel, targetModel),
    }))
  )).sort((left, right) => (
    left.baseGapMilliInches - right.baseGapMilliInches
      || left.sourceModelId.localeCompare(right.sourceModelId)
      || left.targetModelId.localeCompare(right.targetModelId)
  ));
  if (rows.length === 0) fail("RESTORATION_MODEL_REQUIRED");
  const nearest = rows[0];
  const body = {
    schema: "starcraft_tmg_official_restoration_within_receipt_v1",
    sourcePieceId: source.id,
    targetPieceId: target.id,
    sourceModelId: nearest.sourceModelId,
    targetModelId: nearest.targetModelId,
    nearestBaseGapMilliInches: nearest.baseGapMilliInches,
    rangeMilliInches: 4000,
    within: nearest.baseGapMilliInches <= 4000,
    trainingTruth: false,
  };
  return { ...body, withinReceiptHash: hashStarcraftTmgContract(body) };
}

function verifyBindings(state, matchBinding) {
  if (!object(state) || !object(state.players) || !object(state.board)
    || !Array.isArray(state.pieces)) {
    fail("RESTORATION_STATE_INVALID");
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
    fail("RESTORATION_LATEST_OFFICIAL_DATA_REQUIRED");
  }
  const medic = getOfficialCombatProfileV1(
    gameplayBundle.combatProfileBundle,
    MEDIC_RECORD_KEY,
  );
  if (medic.sourceRecordHash !== MEDIC_SOURCE_RECORD_HASH
    || medic.payloadHash !== MEDIC_PAYLOAD_HASH
    || medic.unitName !== "Medic"
    || !isDeepStrictEqual(medic.combatTags, ["biological", "ground", "light"])) {
    fail("RESTORATION_MEDIC_SOURCE_DRIFT");
  }
  return gameplayBundle;
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
    || card.face !== (card.readiness === "ready" ? "up" : "down")
    || !isDeepStrictEqual(card.activeEffects || [], [])) {
    fail("RESTORATION_CARD_STATE_INVALID", String(card?.id || ""));
  }
  return card;
}

function cardsForSide(state, sideKey, bundle) {
  if (state.players?.[sideKey]?.faction !== "Terran"
    || !Array.isArray(state.cardResources?.[sideKey])) {
    fail("RESTORATION_CARD_STATE_INVALID", sideKey);
  }
  const cards = state.cardResources[sideKey].map((card) => verifyCard(card, sideKey, bundle));
  if (cards.length > MAX_PAYMENT_CARDS
    || new Set(cards.map((card) => card.id)).size !== cards.length) {
    fail("RESTORATION_CARD_STATE_INVALID", "card_denominator");
  }
  return cards;
}

function verifyLedger(state) {
  const ledger = state.restorationReactionUsage;
  if (ledger === undefined) return { entries: [] };
  if (!object(ledger)
    || ledger.schema !== LEDGER_SCHEMA
    || !Number.isSafeInteger(ledger.round)
    || ledger.round < 1
    || !Array.isArray(ledger.entries)
    || ledger.trainingTruth !== false
    || ledger.ledgerHash !== hashStarcraftTmgContract(without(ledger, ["ledgerHash"]))) {
    fail("RESTORATION_REACTION_LEDGER_INVALID");
  }
  for (const entry of ledger.entries) {
    if (entry.abilityName !== RESTORATION_SOURCE.abilityName
      || !String(entry.sourcePieceId || "")
      || !String(entry.targetPieceId || "")
      || !HASH_PATTERN.test(String(entry.pendingReactionHash || ""))) {
      fail("RESTORATION_REACTION_LEDGER_INVALID");
    }
  }
  return ledger.round === Number(state.round) ? ledger : { entries: [] };
}

function alreadyUsed(state, pieceId) {
  return verifyLedger(state).entries.some((entry) => (
    entry.sourcePieceId === pieceId && entry.abilityName === RESTORATION_SOURCE.abilityName
  ));
}

function exactMedic(piece, sideKey) {
  if (!activePiece(piece)
    || piece.sideKey !== sideKey
    || piece.officialUnitRecordKey !== MEDIC_RECORD_KEY
    || piece.sourceRecordHash !== MEDIC_SOURCE_RECORD_HASH
    || piece.officialPayloadHash !== MEDIC_PAYLOAD_HASH
    || piece.isInReserves === true
    || !isDeepStrictEqual(piece.combatTags, ["biological", "ground", "light"])
    || !isDeepStrictEqual(piece.selectedUpgradeNames || [], ["Medpack", "Optical Flare"])) {
    fail("RESTORATION_MEDIC_SCOPE_UNSUPPORTED", String(piece?.id || ""));
  }
  return piece;
}

function paymentSets(cards, cost) {
  const ready = cards.filter((card) => (
    card.readiness === "ready" && card.resourceType === "CP"
  )).sort((left, right) => left.id.localeCompare(right.id));
  const sets = [];
  for (let mask = 1; mask < (1 << ready.length); mask += 1) {
    const selected = ready.filter((_card, index) => (mask & (1 << index)) !== 0);
    if (selected.reduce((sum, card) => sum + Number(card.resource), 0) === cost) {
      sets.push(selected.map((card) => card.id));
    }
  }
  return sets.sort((left, right) => left.join(":").localeCompare(right.join(":")));
}

function pendingBody(input) {
  return {
    schema: PENDING_SCHEMA,
    stage: "reaction_open",
    round: input.round,
    phase: input.phase,
    originalActionSideKey: input.originalActionSideKey,
    reactingSideKey: input.reactingSideKey,
    sourcePieceId: input.sourcePieceId,
    targetPieceId: input.targetPieceId,
    triggerAbilityId: "optical_flare",
    triggerAbilityResolutionHash: input.triggerAbilityResolutionHash,
    triggerStatusEffectHashes: [...input.triggerStatusEffectHashes],
    withinReceiptHash: input.withinReceiptHash,
    abilityId: RESTORATION_SOURCE.abilityId,
    abilityName: RESTORATION_SOURCE.abilityName,
    sourceTextHash: RESTORATION_SOURCE_TEXT_HASH,
    resourceType: RESTORATION_SOURCE.resourceType,
    resourceCost: RESTORATION_SOURCE.resourceCost,
    trainingTruth: false,
  };
}

function createPending(input) {
  const body = pendingBody(input);
  return { ...body, pendingReactionHash: hashStarcraftTmgContract(body) };
}

function verifyPending(state) {
  const pending = state.pendingRestorationReaction;
  if (!object(pending)
    || pending.schema !== PENDING_SCHEMA
    || pending.stage !== "reaction_open"
    || pending.round !== Number(state.round)
    || pending.phase !== state.phase
    || !SIDE_KEYS.includes(pending.originalActionSideKey)
    || pending.reactingSideKey !== otherSide(pending.originalActionSideKey)
    || !String(pending.sourcePieceId || "")
    || !String(pending.targetPieceId || "")
    || pending.triggerAbilityId !== "optical_flare"
    || !HASH_PATTERN.test(String(pending.triggerAbilityResolutionHash || ""))
    || !Array.isArray(pending.triggerStatusEffectHashes)
    || pending.triggerStatusEffectHashes.length !== 1
    || !pending.triggerStatusEffectHashes.every((hash) => HASH_PATTERN.test(String(hash)))
    || !HASH_PATTERN.test(String(pending.withinReceiptHash || ""))
    || pending.abilityId !== RESTORATION_SOURCE.abilityId
    || pending.abilityName !== RESTORATION_SOURCE.abilityName
    || pending.sourceTextHash !== RESTORATION_SOURCE_TEXT_HASH
    || pending.resourceType !== "CP"
    || pending.resourceCost !== 1
    || pending.trainingTruth !== false
    || pending.pendingReactionHash
      !== hashStarcraftTmgContract(without(pending, ["pendingReactionHash"]))) {
    fail("RESTORATION_PENDING_REACTION_INVALID");
  }
  return pending;
}

export function isOfficialMedicRestorationPendingV1(state) {
  try {
    verifyPending(state);
    return true;
  } catch {
    return false;
  }
}

function exactTriggerStatus(state, targetPieceId, statusEffectHash) {
  const target = state.pieces.find((piece) => piece.id === targetPieceId);
  if (!activePiece(target)) fail("RESTORATION_TRIGGER_TARGET_UNAVAILABLE");
  const statuses = (target.statuses || []).filter((status) => (
    status?.statusEffectHash === statusEffectHash
  ));
  if (statuses.length !== 1) fail("RESTORATION_TRIGGER_STATUS_MISSING");
  const status = statuses[0];
  verifyOfficialOpticalFlareStatusV1(status);
  if (status.targetPieceId !== target.id || status.statusKind !== "debuff") {
    fail("RESTORATION_TRIGGER_STATUS_INVALID");
  }
  const marker = (state.board.effectMarkers || []).find((entry) => (
    entry?.statusEffectHash === status.statusEffectHash
  ));
  verifyOfficialOpticalFlareMarkerV1(marker, status);
  return { target, status, marker };
}

export function openOfficialMedicRestorationWindowV1(stateInput, input = {}) {
  const bundle = verifyBindings(stateInput, input.matchBinding);
  if (stateInput.pendingRestorationReaction !== undefined) {
    fail("RESTORATION_PENDING_REACTION_ALREADY_OPEN");
  }
  if (input.action?.abilityId !== "optical_flare"
    || !HASH_PATTERN.test(String(input.abilityResolutionHash || ""))
    || input.effect?.status?.schema !== OFFICIAL_OPTICAL_FLARE_STATUS_SCHEMA) {
    return { state: clone(stateInput), opened: false, reason: "trigger_not_supported" };
  }
  const state = clone(stateInput);
  const statusEffectHash = input.effect.status.statusEffectHash;
  const { target } = exactTriggerStatus(state, input.action.targetId, statusEffectHash);
  const reactingSideKey = target.sideKey;
  if (reactingSideKey !== otherSide(input.action.sideKey)) {
    fail("RESTORATION_TRIGGER_SIDE_INVALID");
  }
  const cards = cardsForSide(state, reactingSideKey, bundle);
  if (cards.some((card) => (
    card.officialCardRecordKey === ACADEMY_RECORD_KEY && card.readiness === "ready"
  ))) {
    fail("RESTORATION_NESTED_ACADEMY_REACTION_UNSUPPORTED");
  }
  if (paymentSets(cards, RESTORATION_SOURCE.resourceCost).length === 0) {
    return { state, opened: false, reason: "restoration_cost_unpayable" };
  }
  const eligible = [];
  for (const piece of state.pieces.filter((row) => (
    row.sideKey === reactingSideKey && row.officialUnitRecordKey === MEDIC_RECORD_KEY
  ))) {
    if (!activePiece(piece) || piece.isInReserves === true || alreadyUsed(state, piece.id)) continue;
    exactMedic(piece, reactingSideKey);
    const within = nearestWithinReceipt(piece, target);
    if (within.within) eligible.push({ piece, within });
  }
  if (eligible.length === 0) return { state, opened: false, reason: "no_eligible_medic" };
  if (eligible.length > 1) fail("RESTORATION_SIMULTANEOUS_REACTION_UNSUPPORTED");
  const [{ piece, within }] = eligible;
  state.pendingRestorationReaction = createPending({
    round: Number(state.round),
    phase: state.phase,
    originalActionSideKey: input.action.sideKey,
    reactingSideKey,
    sourcePieceId: piece.id,
    targetPieceId: target.id,
    triggerAbilityResolutionHash: input.abilityResolutionHash,
    triggerStatusEffectHashes: [statusEffectHash],
    withinReceiptHash: within.withinReceiptHash,
  });
  return {
    state,
    opened: true,
    pendingReactionHash: state.pendingRestorationReaction.pendingReactionHash,
    sourcePieceId: piece.id,
    reactingSideKey,
  };
}

function actionFromCandidate(candidate) {
  return without(candidate, ["isEnabled", "disabledReason", "score", "details"]);
}

export function enumerateOfficialMedicRestorationV1(state, options = {}) {
  const sideKey = String(options.sideKey || "").trim();
  if (!SIDE_KEYS.includes(sideKey)) fail("RESTORATION_SIDE_REQUIRED");
  let pending;
  let bundle;
  try {
    pending = verifyPending(state);
    bundle = verifyBindings(state, options.matchBinding);
  } catch (error) {
    if (options.throwOnError === true) throw error;
    return [];
  }
  if (sideKey !== pending.reactingSideKey) return [];
  const source = state.pieces.find((piece) => piece.id === pending.sourcePieceId);
  const { target } = exactTriggerStatus(
    state,
    pending.targetPieceId,
    pending.triggerStatusEffectHashes[0],
  );
  exactMedic(source, sideKey);
  const within = nearestWithinReceipt(source, target);
  if (!within.within || within.withinReceiptHash !== pending.withinReceiptHash
    || alreadyUsed(state, source.id)) {
    return [];
  }
  const cards = cardsForSide(state, sideKey, bundle);
  if (cards.some((card) => (
    card.officialCardRecordKey === ACADEMY_RECORD_KEY && card.readiness === "ready"
  ))) return [];
  const common = {
    sideKey,
    phase: state.phase,
    sourcePieceId: source.id,
    targetId: target.id,
    abilityId: RESTORATION_SOURCE.abilityId,
    abilityName: RESTORATION_SOURCE.abilityName,
    resourceType: "CP",
    resourceCost: 1,
    pendingReactionHash: pending.pendingReactionHash,
    triggerAbilityResolutionHash: pending.triggerAbilityResolutionHash,
    triggerStatusEffectHashes: [...pending.triggerStatusEffectHashes],
    ruleAtomIds: [...OFFICIAL_MEDIC_RESTORATION_ACTION_ATOM_IDS],
    executorId: OFFICIAL_MEDIC_RESTORATION_EXECUTOR_ID,
    executorVersion: OFFICIAL_MEDIC_RESTORATION_EXECUTOR_VERSION,
  };
  const useActions = paymentSets(cards, 1).map((cardResourceIds) => ({
    ...common,
    actionType: OFFICIAL_USE_RESTORATION_REACTION_ACTION_TYPE,
    cardResourceIds,
    isEnabled: true,
    disabledReason: "",
    score: 210,
    details: {
      trigger: RESTORATION_SOURCE.trigger,
      effect: RESTORATION_SOURCE.effect,
      sourceTextHash: RESTORATION_SOURCE_TEXT_HASH,
      withinReceiptHash: pending.withinReceiptHash,
      trainingTruth: false,
    },
  }));
  return [...useActions, {
    ...common,
    actionType: OFFICIAL_PASS_RESTORATION_REACTION_ACTION_TYPE,
    cardResourceIds: [],
    isEnabled: true,
    disabledReason: "",
    score: 10,
    details: {
      trigger: RESTORATION_SOURCE.trigger,
      reactionPassed: true,
      sourceTextHash: RESTORATION_SOURCE_TEXT_HASH,
      withinReceiptHash: pending.withinReceiptHash,
      trainingTruth: false,
    },
  }].sort((left, right) => (
    left.actionType.localeCompare(right.actionType)
      || left.cardResourceIds.join(":").localeCompare(right.cardResourceIds.join(":"))
  ));
}

function recordReactionUse(state, pending) {
  const current = verifyLedger(state);
  if (current.entries.some((entry) => entry.sourcePieceId === pending.sourcePieceId)) {
    fail("RESTORATION_REACTION_ALREADY_USED_THIS_ROUND");
  }
  const entry = {
    sourcePieceId: pending.sourcePieceId,
    targetPieceId: pending.targetPieceId,
    abilityName: RESTORATION_SOURCE.abilityName,
    pendingReactionHash: pending.pendingReactionHash,
  };
  const body = {
    schema: LEDGER_SCHEMA,
    round: Number(state.round),
    entries: [...clone(current.entries), entry],
    trainingTruth: false,
  };
  state.restorationReactionUsage = {
    ...body,
    ledgerHash: hashStarcraftTmgContract(body),
  };
  return entry;
}

function removeAllExactDebuffs(state, pending) {
  const target = state.pieces.find((piece) => piece.id === pending.targetPieceId);
  const statuses = Array.isArray(target?.statuses) ? target.statuses : [];
  const debuffs = statuses.filter((status) => status?.statusKind === "debuff");
  if (debuffs.length === 0) fail("RESTORATION_TRIGGER_STATUS_MISSING");
  for (const status of debuffs) {
    if (status.schema !== OFFICIAL_OPTICAL_FLARE_STATUS_SCHEMA) {
      fail("RESTORATION_UNKNOWN_DEBUFF_FAIL_CLOSED");
    }
    verifyOfficialOpticalFlareStatusV1(status);
    const marker = (state.board.effectMarkers || []).find((entry) => (
      entry?.statusEffectHash === status.statusEffectHash
    ));
    verifyOfficialOpticalFlareMarkerV1(marker, status);
  }
  const hashes = debuffs.map((status) => status.statusEffectHash).sort();
  target.statuses = statuses.filter((status) => status?.statusKind !== "debuff");
  state.board.effectMarkers = (state.board.effectMarkers || []).filter((marker) => (
    !hashes.includes(marker?.statusEffectHash)
  ));
  return hashes;
}

export function applyOfficialMedicRestorationV1(stateInput, actionInput, options = {}) {
  if (!object(actionInput)
    || ![
      OFFICIAL_USE_RESTORATION_REACTION_ACTION_TYPE,
      OFFICIAL_PASS_RESTORATION_REACTION_ACTION_TYPE,
    ].includes(actionInput.actionType)
    || actionInput.executorId !== OFFICIAL_MEDIC_RESTORATION_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_MEDIC_RESTORATION_EXECUTOR_VERSION) {
    fail("RESTORATION_ACTION_INVALID");
  }
  const pending = verifyPending(stateInput);
  const expected = enumerateOfficialMedicRestorationV1(stateInput, {
    sideKey: actionInput.sideKey,
    matchBinding: options.matchBinding,
    throwOnError: true,
  }).map(actionFromCandidate).find((candidate) => isDeepStrictEqual(candidate, actionInput));
  if (!expected) fail("RESTORATION_ACTION_STALE");
  if (actionInput.pendingReactionHash !== pending.pendingReactionHash) {
    fail("RESTORATION_PENDING_REACTION_STALE");
  }
  const state = clone(stateInput);
  const use = actionInput.actionType === OFFICIAL_USE_RESTORATION_REACTION_ACTION_TYPE;
  let removedStatusEffectHashes = [];
  if (use) {
    const bundle = verifyBindings(state, options.matchBinding);
    const selectedCards = actionInput.cardResourceIds.map((cardId) => (
      state.cardResources[pending.reactingSideKey].find((card) => card.id === cardId)
    ));
    if (selectedCards.some((card) => !card)
      || selectedCards.reduce((sum, card) => sum + Number(card.resource), 0) !== 1) {
      fail("RESTORATION_FULL_COST_REQUIRED");
    }
    for (const card of selectedCards) {
      verifyCard(card, pending.reactingSideKey, bundle);
      if (card.readiness !== "ready") fail("RESTORATION_PAYMENT_CARD_NOT_READY");
      card.readiness = "exhausted";
      card.face = "down";
    }
    removedStatusEffectHashes = removeAllExactDebuffs(state, pending);
    recordReactionUse(state, pending);
  }
  const historyBody = {
    schema: HISTORY_SCHEMA,
    round: Number(state.round),
    originalActionSideKey: pending.originalActionSideKey,
    reactingSideKey: pending.reactingSideKey,
    sourcePieceId: pending.sourcePieceId,
    targetPieceId: pending.targetPieceId,
    abilityName: RESTORATION_SOURCE.abilityName,
    decision: use ? "use" : "pass",
    pendingReactionHash: pending.pendingReactionHash,
    cardResourceIds: [...actionInput.cardResourceIds],
    removedStatusEffectHashes,
    trainingTruth: false,
  };
  const historyEntry = {
    ...historyBody,
    reactionHistoryHash: hashStarcraftTmgContract(historyBody),
  };
  state.restorationReactionHistory = Array.isArray(state.restorationReactionHistory)
    ? state.restorationReactionHistory
    : [];
  state.restorationReactionHistory.push(historyEntry);
  delete state.pendingRestorationReaction;
  const events = [{
    type: actionInput.actionType,
    sourcePieceId: pending.sourcePieceId,
    targetPieceId: pending.targetPieceId,
    abilityName: RESTORATION_SOURCE.abilityName,
    reactionUsed: use,
    cardResourceIds: [...actionInput.cardResourceIds],
    removedStatusEffectHashes,
    pendingReactionHash: pending.pendingReactionHash,
    trainingTruth: false,
  }];
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
    schemaVersion: "starcraft_tmg_official_medic_restoration_transition_v1",
    executorId: OFFICIAL_MEDIC_RESTORATION_EXECUTOR_ID,
    executorVersion: OFFICIAL_MEDIC_RESTORATION_EXECUTOR_VERSION,
    postRevision: Number(options.postRevision || 0),
    state,
    events,
    action: expected,
    settlementSideKey: pending.originalActionSideKey,
    removedStatusEffectHashes,
    rulesTruth: "official_current_medic_restoration_exact_subset",
    trainingTruth: false,
  };
}

export const OFFICIAL_MEDIC_RESTORATION_SOURCE_V1 = RESTORATION_SOURCE;
export const OFFICIAL_MEDIC_RESTORATION_SOURCE_TEXT_HASH_V1 =
  RESTORATION_SOURCE_TEXT_HASH;
