import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import {
  applyStarcraftTmgAction,
  enumerateStarcraftTmgLegalActions,
  normalizeStarcraftTmgState,
} from "../../../scripts/starcraft-tmg-rules-v0.mjs";
import {
  canonicalStarcraftTmgJson,
  createStarcraftTmgRefereeCrypto,
  hashStarcraftTmgContract,
} from "./referee-crypto-v1.mjs";
import {
  applyOfficialMovementHoldV1,
  enumerateOfficialMovementHoldActionsV1,
} from "../rule-atoms/official-movement-hold-executor-v1.mjs";
import {
  applyOfficialActivationPassV1,
  enumerateOfficialActivationPassActionsV1,
  officialActivationPassAtomIdsForPhaseV1,
  settleOfficialAlternatingPhaseAfterActivationV1,
} from "../rule-atoms/official-activation-pass-executor-v1.mjs";

export { canonicalStarcraftTmgJson, hashStarcraftTmgContract } from "./referee-crypto-v1.mjs";

export const STARCRAFT_TMG_AUTHORITY_VERSION = "starcraft_tmg_authority_v2";
export const STARCRAFT_TMG_RULES_VERSION = "starcraft_tmg_rules_v0";
export const STARCRAFT_TMG_PATH_UNIT = "milli-inch";
export const STARCRAFT_TMG_MAX_CANONICAL_PATH_POINTS = 1024;
export const STARCRAFT_TMG_MAX_RAW_PATH_POINTS = 4096;

const HASH_PATTERN = /^[a-f0-9]{64}$/;
const MOVEMENT_ACTION_TYPES = new Set(["move", "disengage"]);
const PHASE_ACTIVATION_ACTION_TYPES = new Set([
  "deploy", "move", "disengage", "hold", "shoot", "charge", "run", "fight", "use_ability",
  "declare_ability",
]);
const OFFICIAL_PASS_PHASES = new Set(["movement", "assault"]);
const READ_ONLY_ROLE_MODES = new Set(["tutor", "commentator", "companion"]);
const DEPENDENCY_KINDS = Object.freeze([
  "sourceSnapshot",
  "dataSnapshot",
  "rulesArtifact",
  "executorArtifact",
  "geometryArtifact",
  "actionSchema",
]);
const ACTION_FIELDS = Object.freeze([
  "actionType", "sideKey", "phase", "pieceId", "targetId", "weaponName",
    "replacedWeaponName", "selectedUpgradeNames", "combatWeaponLoadoutHash",
    "cardResourceId", "cardResourceIds", "cardId", "cardIndex", "amount",
    "abilityId", "abilityName", "reactionCardId", "to",
  "xInches", "yInches", "ruleAtomIds", "executorId", "executorVersion",
  "chosenFirstActorSideKey", "closeRanksMode", "combatPhaseStartEngagementSnapshotHash",
  "closeRanksPlan", "controlResolutionHash", "missionMarkerControlResolution", "chance",
  "scoringResolutionHash", "scoringResolution",
  "endGameResolutionHash", "endGameResolution",
  "effectQueueProofHash", "effectQueueProof",
  "cleanupResolutionHash", "cleanupResolution",
  "initiativeResolutionHash", "initiativeResolution",
    "startOfRoundResolutionHash", "startOfRoundResolution", "pendingAttackHash",
  "deployPlan", "movePlan", "disengagePlan", "domainId", "specialistLoadoutPlan",
  "attackProfileKey", "attackProfileHash", "attackProfileV2Hash",
  "contributingModelIds", "sequenceHash", "batchOrdinal", "sequenceFinalBatch",
  "batchPlanHash", "selectedBatchProfileKeys", "sidearmUseMode",
  "lineOfSightStatus", "indirectFireUsed", "lockedInAdditionalRateOfAttack",
  "effectiveRateOfAttack", "rangeBand", "evadeEligibilityReason",
  "blockingTerrainId",
  "targetCombatTags", "profileTargetTags", "surgeTagMatched",
  "printedHitPoints", "shieldValue", "effectiveFirstModelHitPoints",
  "shieldedBefore", "targetAuthorizationHash", "shieldStateHash",
  "abilityWindow", "resourceType", "resourceCost", "targetRangeMilliInches",
  "targetDistanceMilliInches", "abilityPlanHash", "pendingAbilityHash",
  "originalResourceCost", "modifiedResourceCost", "costReduction",
  "sourcePieceId", "pendingReactionHash", "triggerAbilityResolutionHash",
  "triggerStatusEffectHashes", "statusEffectHash", "effectMarkerId",
  "printedRangeInches", "printedLongRangeInches", "effectiveRangeInches",
  "effectiveMaximumRangeInches", "rangeDebuffResolutionHash", "longRangeAllowed",
  "triggerAttackResolutionHash", "totalDamageReactionPlanHash",
  "totalDamageBeforeReduction", "withinReceiptHash", "reductionSourceHash",
  "lifeSupportBaseReduction", "passiveBonus", "lifeSupportReduction",
  "resolutionMode", "attackPlanHash", "markerHash", "precisionGrantHash",
  "pendingHash", "hitRevealHash", "precisionSelectionHash",
  "convertedFailedDieIndices", "convertedCount",
  "casualtyDomainHash", "casualtySelectionHash", "casualtyModelIds",
  "coEngagerPieceId",
  "nonLethalDamage", "speedBuff", "precision",
  "moveMode", "abilityChoice", "underlyingAction",
  "chargePlan", "chargePlanHash",
]);

class AuthorityError extends Error {
  constructor(code, message = code, details = {}) {
    super(message);
    this.name = "AuthorityError";
    this.code = code;
    this.details = details;
  }
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function nonEmpty(value, field) {
  const normalized = String(value || "").trim();
  if (!normalized) throw new AuthorityError("PROPOSAL_INVALID", `${field} is required`, { field });
  return normalized;
}

function nonNegativeInteger(value, field) {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized) || normalized < 0) {
    throw new AuthorityError("PROPOSAL_INVALID", `${field} must be a non-negative safe integer`, { field });
  }
  return normalized;
}

function positiveInteger(value, field) {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized) || normalized <= 0) {
    throw new AuthorityError("PROPOSAL_INVALID", `${field} must be a positive safe integer`, { field });
  }
  return normalized;
}

function isoTime(value, field = "occurredAt") {
  const parsed = new Date(value);
  if (!value || Number.isNaN(parsed.getTime())) {
    throw new AuthorityError("PROPOSAL_INVALID", `${field} must be an ISO timestamp`, { field });
  }
  return parsed.toISOString();
}

function rejection(reason, details = {}) {
  return deepFreeze({
    ok: false,
    schemaVersion: `${STARCRAFT_TMG_AUTHORITY_VERSION}.rejection`,
    reason,
    ...clone(details),
  });
}

function rejectedFrom(error, fallback = "PROPOSAL_INVALID") {
  if (error instanceof AuthorityError) return rejection(error.code, { message: error.message, ...error.details });
  return rejection(fallback, { message: error instanceof Error ? error.message : String(error) });
}

function contractAction(candidate = {}) {
  return Object.fromEntries(ACTION_FIELDS
    .filter((field) => candidate[field] !== undefined)
    .map((field) => [field, clone(candidate[field])]));
}

function bindingCore(binding = {}) {
  const { bindingHash: _bindingHash, refereeSignature: _refereeSignature, ...core } = binding;
  return core;
}

function receiptCore(receipt = {}) {
  const { journalHash: _journalHash, refereeSignature: _refereeSignature, audit: _audit, ...core } = receipt;
  return core;
}

function previewSealedContent(preview = {}) {
  return { previewId: preview.previewId, core: clone(preview.core) };
}

function confirmationSealedContent(confirmation = {}) {
  const { confirmationSeal: _confirmationSeal, audit: _audit, ...content } = confirmation;
  return content;
}

function authoritySealedContent(authority = {}) {
  const { authoritySeal: _authoritySeal, bearerToken: _bearerToken, ...content } = authority;
  return content;
}

function leaseSealedContent(lease = {}) {
  const { leaseSeal: _leaseSeal, bearerToken: _bearerToken, ...content } = lease;
  return content;
}

function stableCapabilities(values = []) {
  return Array.from(new Set(values.map((value) => String(value || "").trim()).filter(Boolean))).sort();
}

function cleanLogEntry(entry, logicalSequence) {
  if (!object(entry)) return entry;
  const { createdAt: _createdAt, occurredAt: _occurredAt, wallClock: _wallClock, ...deterministic } = entry;
  return { ...deterministic, logicalSequence };
}

function normalizeAuthorityState(input, stateRevision = 0) {
  const state = normalizeStarcraftTmgState(input || {});
  // The legacy v0 normalizer knows only its historical `scoring` label and
  // otherwise rewrites unknown phases to Movement. Official Core 8.9 names
  // the post-Combat phase Cleanup, so the authority seam must preserve that
  // exact Rules-owned state instead of silently translating it.
  if (["army_building", "cleanup", "start_of_round"].includes(input?.phase)) {
    state.phase = input.phase;
    state.activeSideKey = input.activeSideKey === null ? null : state.activeSideKey;
  }
  state.log = (state.log || []).map((entry, index) => cleanLogEntry(entry, index + 1));
  state.gameClock = {
    schemaVersion: "starcraft_tmg_game_clock_v1",
    round: Number(state.round || 1),
    phase: String(state.phase || "movement"),
    transition: nonNegativeInteger(state.gameClock?.transition ?? stateRevision, "state.gameClock.transition"),
  };
  return state;
}

function appendDeterministicLogIdentity(state, previousLength, postRevision) {
  state.log = (state.log || []).map((entry, index) => cleanLogEntry(
    entry,
    index < previousLength ? Number(entry?.logicalSequence || index + 1) : `${postRevision}.${index - previousLength + 1}`,
  ));
  state.gameClock = {
    schemaVersion: "starcraft_tmg_game_clock_v1",
    round: Number(state.round || 1),
    phase: String(state.phase || "movement"),
    transition: postRevision,
  };
  return state;
}

function roundInchesFromMilli(value) {
  return Number((Number(value) / 1000).toFixed(3));
}

function milliFromInches(value) {
  return Math.round(Number(value || 0) * 1000);
}

function pointEquals(a, b) {
  return a.xMilliInches === b.xMilliInches && a.yMilliInches === b.yMilliInches;
}

function pointIsCollinear(a, b, c) {
  return (BigInt(b.xMilliInches - a.xMilliInches) * BigInt(c.yMilliInches - b.yMilliInches))
    === (BigInt(b.yMilliInches - a.yMilliInches) * BigInt(c.xMilliInches - b.xMilliInches));
}

function canonicalPathPoints(start, rawPath) {
  if (!Array.isArray(rawPath) || rawPath.length === 0) {
    throw new AuthorityError("PROPOSAL_INVALID", "movement path must contain at least one destination point");
  }
  if (rawPath.length > STARCRAFT_TMG_MAX_RAW_PATH_POINTS) {
    throw new AuthorityError("PATH_TOO_COMPLEX", "raw movement path exceeds the safety budget", {
      observedRawPoints: rawPath.length,
      maxRawPoints: STARCRAFT_TMG_MAX_RAW_PATH_POINTS,
    });
  }
  const normalized = [start];
  for (const [index, point] of rawPath.entries()) {
    if (!object(point)) throw new AuthorityError("PROPOSAL_INVALID", "path point must be an object", { index });
    const xMilliInches = Number(point.xMilliInches);
    const yMilliInches = Number(point.yMilliInches);
    if (!Number.isSafeInteger(xMilliInches) || !Number.isSafeInteger(yMilliInches)) {
      throw new AuthorityError("PROPOSAL_INVALID", "path coordinates must be safe integer milli-inches", { index });
    }
    const next = { xMilliInches, yMilliInches };
    if (!pointEquals(normalized.at(-1), next)) normalized.push(next);
  }
  if (normalized.length < 2) throw new AuthorityError("PROPOSAL_INVALID", "movement path must leave its rules-owned start point");
  const canonical = [];
  for (const point of normalized) {
    while (canonical.length >= 2 && pointIsCollinear(canonical.at(-2), canonical.at(-1), point)) canonical.pop();
    canonical.push(point);
  }
  if (canonical.length > STARCRAFT_TMG_MAX_CANONICAL_PATH_POINTS) {
    throw new AuthorityError("PATH_TOO_COMPLEX", "canonical movement path exceeds the safety budget", {
      observedCanonicalPoints: canonical.length,
      maxCanonicalPoints: STARCRAFT_TMG_MAX_CANONICAL_PATH_POINTS,
    });
  }
  return canonical;
}

function pointToSegmentDistance(point, a, b) {
  const dx = b.xMilliInches - a.xMilliInches;
  const dy = b.yMilliInches - a.yMilliInches;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return Math.hypot(point.xMilliInches - a.xMilliInches, point.yMilliInches - a.yMilliInches);
  const t = Math.max(0, Math.min(1, ((point.xMilliInches - a.xMilliInches) * dx + (point.yMilliInches - a.yMilliInches) * dy) / lengthSq));
  return Math.hypot(point.xMilliInches - (a.xMilliInches + t * dx), point.yMilliInches - (a.yMilliInches + t * dy));
}

function segmentIntersectsExpandedRect(a, b, terrain, expansion) {
  const minX = milliFromInches(terrain.xInches) - milliFromInches(Number(terrain.widthInches || 0) / 2) - expansion;
  const maxX = milliFromInches(terrain.xInches) + milliFromInches(Number(terrain.widthInches || 0) / 2) + expansion;
  const minY = milliFromInches(terrain.yInches) - milliFromInches(Number(terrain.heightInches || 0) / 2) - expansion;
  const maxY = milliFromInches(terrain.yInches) + milliFromInches(Number(terrain.heightInches || 0) / 2) + expansion;
  let t0 = 0;
  let t1 = 1;
  const dx = b.xMilliInches - a.xMilliInches;
  const dy = b.yMilliInches - a.yMilliInches;
  for (const [p, q] of [
    [-dx, a.xMilliInches - minX], [dx, maxX - a.xMilliInches],
    [-dy, a.yMilliInches - minY], [dy, maxY - a.yMilliInches],
  ]) {
    if (p === 0 && q < 0) return false;
    if (p !== 0) {
      const ratio = q / p;
      if (p < 0) t0 = Math.max(t0, ratio);
      else t1 = Math.min(t1, ratio);
      if (t0 > t1) return false;
    }
  }
  return true;
}

function movementBaseRadiusMilli(piece) {
  const shape = String(piece.baseShape || piece.baseFootprint?.shape || "round").toLowerCase();
  const width = milliFromInches(piece.baseWidthInches || (Number(piece.baseMm || 32) / 25.4));
  const depth = milliFromInches(piece.baseDepthInches || piece.baseWidthInches || (Number(piece.baseMm || 32) / 25.4));
  if (shape !== "round" || Math.abs(width - depth) > 1) {
    throw new AuthorityError("RULE_UNSUPPORTED", "M1 swept movement supports exact round bases only", {
      pieceId: piece.id,
      baseShape: shape,
      baseWidthMilliInches: width,
      baseDepthMilliInches: depth,
    });
  }
  return Math.round(width / 2);
}

function terrainIntersection(terrain, a, b, baseRadius) {
  const rotation = ((Number(terrain.rotationDegrees || 0) % 360) + 360) % 360;
  const footprint = String(terrain.footprint || "rect").toLowerCase();
  if (footprint === "circle") {
    const center = { xMilliInches: milliFromInches(terrain.xInches), yMilliInches: milliFromInches(terrain.yInches) };
    const radius = Math.round(Math.max(Number(terrain.widthInches || 0), Number(terrain.heightInches || 0)) * 500) + baseRadius;
    return pointToSegmentDistance(center, a, b) < radius;
  }
  if (footprint === "rect" && (rotation === 0 || rotation === 180)) return segmentIntersectsExpandedRect(a, b, terrain, baseRadius);
  throw new AuthorityError("RULE_UNSUPPORTED", "M1 movement cannot approximate this terrain geometry", {
    terrainId: terrain.id,
    footprint,
    rotationDegrees: rotation,
  });
}

function validateMovementPath(state, domain, parameters = {}) {
  const piece = state.pieces.find((entry) => entry.id === domain.pieceId && entry.isOnField && !entry.isDestroyed);
  if (!piece) throw new AuthorityError("LEGAL_SPACE_STALE", "movement piece is no longer active", { pieceId: domain.pieceId });
  const baseRadius = movementBaseRadiusMilli(piece);
  const start = { xMilliInches: milliFromInches(piece.xInches), yMilliInches: milliFromInches(piece.yInches) };
  const path = canonicalPathPoints(start, parameters.path || parameters.points);
  const maxX = milliFromInches(state.board.widthInches);
  const maxY = milliFromInches(state.board.heightInches);
  for (const [index, point] of path.entries()) {
    if (point.xMilliInches < baseRadius || point.xMilliInches > maxX - baseRadius
      || point.yMilliInches < baseRadius || point.yMilliInches > maxY - baseRadius) {
      throw new AuthorityError("PROPOSAL_INVALID", "movement base would leave the board", { index, point, baseRadiusMilliInches: baseRadius });
    }
  }
  const collisions = [];
  const terrainById = new Map();
  let distanceMilliInches = 0;
  for (let index = 1; index < path.length; index += 1) {
    const a = path[index - 1];
    const b = path[index];
    distanceMilliInches += Math.round(Math.hypot(b.xMilliInches - a.xMilliInches, b.yMilliInches - a.yMilliInches));
    for (const other of state.pieces.filter((entry) => entry.id !== piece.id && entry.isOnField && !entry.isDestroyed)) {
      const otherRadius = movementBaseRadiusMilli(other);
      const center = { xMilliInches: milliFromInches(other.xInches), yMilliInches: milliFromInches(other.yInches) };
      if (pointToSegmentDistance(center, a, b) < Math.max(0, baseRadius + otherRadius - 10)) collisions.push(other.id);
    }
    for (const terrain of (state.board.terrain || []).filter((entry) => !entry.isRemoved && !entry.isDestroyed)) {
      if (terrainIntersection(terrain, a, b, baseRadius)) terrainById.set(terrain.id, terrain);
    }
  }
  if (collisions.length) {
    throw new AuthorityError("PROPOSAL_INVALID", "movement swept base collides with an active piece", {
      collisionPieceIds: Array.from(new Set(collisions)).sort(),
    });
  }
  const terrainCrossings = Array.from(terrainById.values()).map((terrain) => ({
    terrainId: terrain.id,
    terrainType: terrain.terrainId || terrain.id,
    difficult: Boolean(terrain.difficult),
    impassable: Boolean(terrain.impassable),
    hazard: Boolean(terrain.hazard),
    extraCostMilliInches: terrain.difficult ? 2000 : 0,
    hazardDamage: terrain.hazard ? Number(terrain.hazardDamage || 1) : 0,
  }));
  const impassable = terrainCrossings.filter((entry) => entry.impassable);
  if (impassable.length) {
    throw new AuthorityError("PROPOSAL_INVALID", "movement swept base crosses impassable terrain", {
      terrainIds: impassable.map((entry) => entry.terrainId),
    });
  }
  const extraCostMilliInches = terrainCrossings.reduce((sum, entry) => sum + entry.extraCostMilliInches, 0);
  const totalCostMilliInches = distanceMilliInches + extraCostMilliInches;
  if (totalCostMilliInches > domain.constraints.maxCostMilliInches + 10) {
    throw new AuthorityError("PROPOSAL_INVALID", "movement path exceeds its rules-owned speed budget", {
      totalCostMilliInches,
      maxCostMilliInches: domain.constraints.maxCostMilliInches,
    });
  }
  return {
    schemaVersion: "starcraft_tmg_canonical_movement_path_v1",
    unit: STARCRAFT_TMG_PATH_UNIT,
    points: path,
    distanceMilliInches,
    extraCostMilliInches,
    totalCostMilliInches,
    terrainCrossings,
    hazardDamage: terrainCrossings.reduce((sum, entry) => sum + entry.hazardDamage, 0),
  };
}

function sidePassedPhase(state, sideKey, phase = state.phase) {
  return state?.players?.[sideKey]?.passedPhases?.[phase] === true;
}

function hasPhaseActivation(state, sideKey, phase = state.phase) {
  if (sidePassedPhase(state, sideKey, phase)) return false;
  const candidates = enumerateStarcraftTmgLegalActions(state, {
    sideKey,
    phase,
    includeDisabled: true,
  }).candidates;
  return candidates.some((candidate) => (
    candidate.isEnabled && PHASE_ACTIVATION_ACTION_TYPES.has(candidate.actionType)
  ));
}

function hasMovementActivation(state, sideKey) {
  return hasPhaseActivation(state, sideKey, "movement");
}

function authorityEligibleCandidate(candidate, state, sideKey) {
  if (!candidate.isEnabled) return candidate;
  if (sideKey !== state.activeSideKey) {
    return { ...candidate, isEnabled: false, disabledReason: "NOT_ACTIVE_SIDE" };
  }
  if (sidePassedPhase(state, sideKey, state.phase)
    && PHASE_ACTIVATION_ACTION_TYPES.has(candidate.actionType)) {
    return { ...candidate, isEnabled: false, disabledReason: "SIDE_PASSED" };
  }
  return candidate;
}

function withPassInteractionLineage(candidate, state) {
  if (!candidate.isEnabled || candidate.actionType !== "hold"
    || !OFFICIAL_PASS_PHASES.has(state.phase)) return candidate;
  const otherSideKey = candidate.sideKey === "player1" ? "player2" : "player1";
  if (!sidePassedPhase(state, otherSideKey, state.phase)) return candidate;
  return {
    ...candidate,
    ruleAtomIds: [...new Set([
      ...(candidate.ruleAtomIds || []),
      ...officialActivationPassAtomIdsForPhaseV1(state.phase),
    ])].sort((left, right) => left.localeCompare(right)),
    details: {
      ...(candidate.details || {}),
      passInteraction: "opponent_completes_remaining_activations",
    },
  };
}

function applyCanonicalMovement(stateInput, action, canonicalPath, domain, postRevision) {
  const state = normalizeAuthorityState(stateInput);
  const previousLogLength = state.log.length;
  const piece = state.pieces.find((entry) => entry.id === action.pieceId);
  if (!piece) throw new AuthorityError("LEGAL_SPACE_STALE", "movement piece is missing", { pieceId: action.pieceId });
  const endpoint = canonicalPath.points.at(-1);
  piece.xInches = roundInchesFromMilli(endpoint.xMilliInches);
  piece.yInches = roundInchesFromMilli(endpoint.yMilliInches);
  piece.activatedPhases = { movement: false, assault: false, combat: false, ...(piece.activatedPhases || {}), movement: true };
  if (action.actionType === "disengage") {
    piece.statuses = (piece.statuses || []).filter((status) => !["disengaged_limited", "tactical_mass_disengage"].includes(status));
    piece.statuses.push(domain.constraints.tacticalMass ? "tactical_mass_disengage" : "disengaged_limited");
  }
  const event = {
    type: action.actionType,
    pieceId: piece.id,
    name: piece.name,
    xInches: piece.xInches,
    yInches: piece.yInches,
    canonicalPath: clone(canonicalPath),
    ...(action.actionType === "disengage" ? {
      tacticalMass: Boolean(domain.constraints.tacticalMass),
      ownCurrentSupply: domain.constraints.ownCurrentSupply,
      engagingEnemyCurrentSupply: domain.constraints.engagingEnemyCurrentSupply,
    } : {}),
  };
  const actingSide = action.sideKey;
  const otherSide = actingSide === "player1" ? "player2" : "player1";
  if (hasMovementActivation(state, otherSide)) state.activeSideKey = otherSide;
  else if (hasMovementActivation(state, actingSide)) state.activeSideKey = actingSide;
  state.log.push({
    id: `log-${state.log.length + 1}`,
    round: state.round,
    phase: state.phase,
    action: { ...contractAction(action), canonicalPath: clone(canonicalPath) },
    events: [event],
  });
  appendDeterministicLogIdentity(state, previousLogLength, postRevision);
  return { ok: true, state, events: [event], action };
}

function confirmationClassFor(action) {
  if (String(action?.abilityId || "")
    || Number(action?.resourceCost || 0) > 0) return "explicit_human";
  if (["move", "disengage", "hold"].includes(action.actionType)) return "direct_gesture";
  return "explicit_human";
}

function finiteActionIdentity(matchBindingHash, stateHash, stateRevision, sideKey, action) {
  return `sc-finite-${hashStarcraftTmgContract({ matchBindingHash, stateHash, stateRevision, sideKey, action })}`;
}

function rulesRuntimeDescriptorCore(descriptor = {}) {
  const { runtimeHash: _runtimeHash, ...core } = descriptor;
  return core;
}

function validateOfficialRulesRuntime(runtime) {
  if (!object(runtime)
    || !object(runtime.descriptor)
    || typeof runtime.enumerate !== "function"
    || typeof runtime.apply !== "function") {
    throw new AuthorityError(
      "RULE_RUNTIME_INVALID",
      "RULE_RUNTIME_INVALID: rulesRuntime must expose descriptor, enumerate, and apply",
    );
  }
  const descriptor = runtime.descriptor;
  if (descriptor.schema !== "starcraft_tmg_official_executable_rule_runtime_v1"
    || descriptor.mode !== "official_executable_catalogue"
    || descriptor.gameId !== "starcraft-tmg"
    || !HASH_PATTERN.test(String(descriptor.runtimeHash || ""))
    || hashStarcraftTmgContract(rulesRuntimeDescriptorCore(descriptor)) !== descriptor.runtimeHash
    || !HASH_PATTERN.test(String(descriptor.catalogueHash || ""))
    || !Array.isArray(descriptor.executorManifest)
    || !Array.isArray(descriptor.executableRuleAtomIds)
    || !Number.isSafeInteger(descriptor.executableRuleAtomCount)
    || descriptor.executableRuleAtomCount < 1
    || !Number.isSafeInteger(descriptor.nonExecutableRuleAtomCount)
    || descriptor.nonExecutableRuleAtomCount < 0
    || descriptor.executableRuleAtomIds.length !== descriptor.executableRuleAtomCount
    || descriptor.legalSpaceComplete !== (descriptor.nonExecutableRuleAtomCount === 0)
    || (descriptor.productionRoomEligible === true && descriptor.legalSpaceComplete !== true)
    || descriptor.legacyCompatibilityUsed !== false
    || descriptor.ctx2skillPromotionEligible !== false
    || descriptor.trainingTruth !== false) {
    throw new AuthorityError(
      "RULE_RUNTIME_INVALID",
      "RULE_RUNTIME_INVALID: official runtime descriptor is invalid",
    );
  }
  return runtime;
}

export function createStarcraftTmgAuthoritativeEngine(options = {}) {
  const rulesRuntime = options.rulesRuntime
    ? validateOfficialRulesRuntime(options.rulesRuntime)
    : null;
  if (rulesRuntime && options.rulesVersion !== undefined
    && String(options.rulesVersion) !== rulesRuntime.descriptor.rulesVersion) {
    throw new AuthorityError(
      "RULE_RUNTIME_VERSION_MISMATCH",
      "RULE_RUNTIME_VERSION_MISMATCH: explicit rulesVersion differs from the official runtime",
      {
        requestedRulesVersion: String(options.rulesVersion),
        runtimeRulesVersion: rulesRuntime.descriptor.rulesVersion,
      },
    );
  }
  const rulesVersion = nonEmpty(
    rulesRuntime?.descriptor.rulesVersion || options.rulesVersion || STARCRAFT_TMG_RULES_VERSION,
    "rulesVersion",
  );
  const developmentSubsetEnabled = Boolean(
    rulesRuntime
      && rulesRuntime.descriptor.legalSpaceComplete !== true
      && options.allowIncompleteRuleRuntimeForDevelopment === true,
  );
  const runtimeDescriptor = rulesRuntime?.descriptor || deepFreeze((() => {
    const body = {
      schema: "starcraft_tmg_legacy_compatibility_rule_runtime_v1",
      mode: "legacy_compatibility_fixture",
      runtimeId: "legacy-transition-v1",
      runtimeVersion: "development-only",
      gameId: "starcraft-tmg",
      rulesVersion,
      catalogueHash: null,
      executorManifest: [],
      executableRuleAtomIds: [],
      executableRuleAtomCount: 0,
      nonExecutableRuleAtomCount: null,
      legalSpaceComplete: false,
      legacyCompatibilityUsed: true,
      productionRoomEligible: false,
      ctx2skillPromotionEligible: false,
      rulesTruth: "legacy_compatibility_fixture_only",
      trainingTruth: false,
    };
    return { ...body, runtimeHash: hashStarcraftTmgContract(body) };
  })());
  const rulesRuntimeBinding = deepFreeze({
    schemaVersion: "starcraft_tmg_rules_runtime_binding_v1",
    mode: runtimeDescriptor.mode,
    runtimeId: runtimeDescriptor.runtimeId,
    runtimeVersion: runtimeDescriptor.runtimeVersion,
    runtimeHash: runtimeDescriptor.runtimeHash,
    catalogueHash: runtimeDescriptor.catalogueHash,
    executableRuleAtomCount: runtimeDescriptor.executableRuleAtomCount,
    nonExecutableRuleAtomCount: runtimeDescriptor.nonExecutableRuleAtomCount,
    legalSpaceComplete: runtimeDescriptor.legalSpaceComplete === true,
    developmentSubset: developmentSubsetEnabled,
    legacyCompatibilityUsed: runtimeDescriptor.legacyCompatibilityUsed === true,
    productionRoomEligible: Boolean(
      rulesRuntime
        && runtimeDescriptor.legalSpaceComplete === true
        && runtimeDescriptor.productionRoomEligible === true
        && !developmentSubsetEnabled
    ),
    ctx2skillPromotionEligible: false,
    trainingTruth: false,
  });
  const runtimeExecutableAtomIds = new Set(runtimeDescriptor.executableRuleAtomIds || []);
  const runtimeExecutors = new Map((runtimeDescriptor.executorManifest || []).map((entry) => [
    entry.executorId,
    entry,
  ]));
  const actionSchemaVersion = runtimeExecutors.has("authority.standard-move-v2")
    ? "hybrid_legal_space_v21"
    : runtimeExecutors.has("authority.reserve-deploy-v2")
    ? "hybrid_legal_space_v20"
    : runtimeExecutors.has("authority.cleanup-refresh-v5")
      ? "hybrid_legal_space_v19"
      : runtimeExecutors.has("authority.end-of-round-effects-v5")
        ? "hybrid_legal_space_v18"
    : runtimeExecutors.has("authority.marine-charge-v1")
    ? "hybrid_legal_space_v18"
    : runtimeExecutors.has(
    "authority.marine-multi-enemy-stimpack-casualty-close-combat-v5",
  )
    ? "hybrid_legal_space_v17"
    : runtimeExecutors.has(
    "authority.marine-multi-enemy-casualty-close-combat-v4",
  )
    ? "hybrid_legal_space_v16"
    : runtimeExecutors.has(
    "authority.marine-multi-model-casualty-close-combat-v3",
  )
    ? "hybrid_legal_space_v15"
    : runtimeExecutors.has(
      "authority.marine-multi-model-stimpack-close-combat-v2",
    )
    ? "hybrid_legal_space_v14"
    : runtimeExecutors.has("authority.stimpack-close-combat-consumer-v1")
    ? "hybrid_legal_space_v13"
    : runtimeExecutors.has("authority.marine-optional-stimpack-move-v2")
    ? "hybrid_legal_space_v12"
    : runtimeExecutors.has("authority.stimpack-move-consumer-v1")
    ? "hybrid_legal_space_v11"
    : runtimeExecutors.has("authority.stimpack-ranged-consumer-v1")
    ? "hybrid_legal_space_v10"
    : runtimeExecutors.has("authority.medic-life-support-reaction-v1")
    ? "hybrid_legal_space_v9"
    : runtimeExecutors.has("authority.medic-restoration-reaction-v1")
    ? "hybrid_legal_space_v8"
    : runtimeExecutors.has("authority.academy-medic-ability-v1")
    ? "hybrid_legal_space_v7"
    : runtimeExecutors.has("authority.medic-medpack-active-v1")
    ? "hybrid_legal_space_v6"
    : runtimeExecutors.has("authority.combat-tag-shielded-ranged-v1")
      ? "hybrid_legal_space_v5"
    : runtimeExecutors.has("authority.goliath-scatter-ranged-batch-v1")
      ? "hybrid_legal_space_v4"
    : runtimeExecutors.has("authority.sidearm-pinpoint-ranged-batch-v1")
      ? "hybrid_legal_space_v3"
    : runtimeExecutors.has("authority.specialist-ranged-batch-v1")
      ? "hybrid_legal_space_v2"
      : "hybrid_legal_space_v1";
  const defaultDataVersion = String(options.dataVersion || "unbound");
  const now = typeof options.now === "function" ? options.now : () => new Date().toISOString();
  const crypto = options.refereeCrypto || createStarcraftTmgRefereeCrypto(options.cryptoOptions || {});
  const dependencyRegistry = new Map();
  const genesisJournalHash = hashStarcraftTmgContract({
    schemaVersion: `${STARCRAFT_TMG_AUTHORITY_VERSION}.journal-genesis`,
    rulesVersion,
    refereeKeyId: crypto.descriptor.keyId,
  });

  for (const artifact of options.dependencies || []) registerDependency(artifact);

  function registerDependency(input = {}) {
    const kind = nonEmpty(input.kind, "dependency.kind");
    const artifactId = nonEmpty(input.artifactId || `${kind}-${randomUUID()}`, "dependency.artifactId");
    if (input.content === undefined) throw new AuthorityError("DEPENDENCY_MISSING", "dependency content is required for registration", { kind, artifactId });
    const contentHash = hashStarcraftTmgContract(input.content);
    if (input.contentHash && input.contentHash !== contentHash) {
      throw new AuthorityError("DEPENDENCY_HASH_MISMATCH", "dependency content hash mismatch", { kind, artifactId });
    }
    const record = deepFreeze({
      schemaVersion: "starcraft_tmg_frozen_dependency_v1",
      kind,
      artifactId,
      contentHash,
      mediaType: String(input.mediaType || "application/json"),
      locale: String(input.locale || "und"),
      content: clone(input.content),
    });
    dependencyRegistry.set(contentHash, record);
    return record;
  }

  function dependencyBinding(kind, supplied, fallbackContent) {
    if (object(supplied) && supplied.content !== undefined) {
      const registered = registerDependency({ kind, ...supplied });
      return { artifactId: registered.artifactId, contentHash: registered.contentHash };
    }
    if (object(supplied) && HASH_PATTERN.test(String(supplied.contentHash || ""))) {
      return { artifactId: nonEmpty(supplied.artifactId, `${kind}.artifactId`), contentHash: supplied.contentHash };
    }
    const registered = registerDependency({
      kind,
      artifactId: `development-${kind}-${hashStarcraftTmgContract(fallbackContent).slice(0, 16)}`,
      content: fallbackContent,
    });
    return { artifactId: registered.artifactId, contentHash: registered.contentHash };
  }

  function createMatchBinding(input = {}) {
    const roomId = nonEmpty(input.roomId, "roomId");
    const gameId = nonEmpty(input.gameId || "starcraft-tmg", "gameId");
    const dataVersion = String(input.dataVersion ?? defaultDataVersion);
    const supplied = input.dependencies || {};
    const dependencies = {
      sourceSnapshot: dependencyBinding("sourceSnapshot", supplied.sourceSnapshot, { kind: "development-source-snapshot", gameId, dataVersion }),
      dataSnapshot: dependencyBinding("dataSnapshot", supplied.dataSnapshot, { kind: "development-data-snapshot", gameId, dataVersion }),
      rulesArtifact: dependencyBinding("rulesArtifact", supplied.rulesArtifact, {
        kind: "rules-artifact",
        rulesVersion,
        rulesRuntimeBinding,
      }),
      executorArtifact: dependencyBinding("executorArtifact", supplied.executorArtifact, {
        kind: "executor-artifact",
        authorityVersion: STARCRAFT_TMG_AUTHORITY_VERSION,
        rulesRuntimeHash: rulesRuntimeBinding.runtimeHash,
        catalogueHash: rulesRuntimeBinding.catalogueHash,
        executorManifest: clone(runtimeDescriptor.executorManifest),
      }),
      geometryArtifact: dependencyBinding("geometryArtifact", supplied.geometryArtifact, { kind: "geometry-artifact", geometryVersion: "fixed_point_round_base_v1" }),
      actionSchema: dependencyBinding("actionSchema", supplied.actionSchema, {
        kind: "action-schema",
        schemaVersion: actionSchemaVersion,
      }),
    };
    const displaySupplied = input.rulesDisplay || supplied.rulesDisplay;
    let displayRecord;
    if (object(displaySupplied) && displaySupplied.content !== undefined) {
      displayRecord = registerDependency({ kind: "rulesDisplay", mediaType: "text/markdown", locale: "en", ...displaySupplied });
    } else if (object(displaySupplied) && HASH_PATTERN.test(String(displaySupplied.contentHash || ""))) {
      displayRecord = dependencyRegistry.get(displaySupplied.contentHash) || {
        artifactId: nonEmpty(displaySupplied.artifactId, "rulesDisplay.artifactId"),
        contentHash: displaySupplied.contentHash,
        mediaType: String(displaySupplied.mediaType || "text/markdown"),
        locale: String(displaySupplied.locale || "und"),
      };
    } else {
      displayRecord = registerDependency({
        kind: "rulesDisplay",
        artifactId: `development-rules-display-${rulesVersion}`,
        mediaType: "text/markdown",
        locale: "en",
        content: `# Historical rules display\n\nFrozen rules version: ${rulesVersion}\n\nThis development artifact preserves the rules identity used by the match.`,
      });
    }
    const core = {
      schemaVersion: `${STARCRAFT_TMG_AUTHORITY_VERSION}.match-binding`,
      matchId: nonEmpty(input.matchId || `sc-match-${randomUUID()}`, "matchId"),
      gameId,
      roomId,
      rulesVersion,
      dataVersion,
      rngSchemeId: String(input.rngSchemeId || "hmac_sha256_counter_v1"),
      sourceSnapshotHash: dependencies.sourceSnapshot.contentHash,
      dataSnapshotHash: dependencies.dataSnapshot.contentHash,
      rulesArtifactHash: dependencies.rulesArtifact.contentHash,
      executorArtifactHash: dependencies.executorArtifact.contentHash,
      geometryArtifactHash: dependencies.geometryArtifact.contentHash,
      actionSchemaHash: dependencies.actionSchema.contentHash,
      dependencies,
      rulesRuntimeBinding: clone(rulesRuntimeBinding),
      refereeKeyId: crypto.descriptor.keyId,
      refereePublicKeyFingerprint: crypto.descriptor.publicKeyFingerprint,
      rulesDisplayBinding: {
        schemaVersion: "starcraft_tmg_rules_display_binding_v1",
        artifactId: displayRecord.artifactId,
        artifactHash: displayRecord.contentHash,
        mediaType: displayRecord.mediaType,
        locale: displayRecord.locale,
        rulesVersion,
        availability: "required",
      },
      productionReady: Boolean(
        crypto.descriptor.productionReady
          && rulesRuntimeBinding.productionRoomEligible
          && input.productionReady === true
      ),
      trainingTruth: false,
    };
    const refereeSignature = crypto.sign(core, "match_binding");
    return deepFreeze({ ...core, bindingHash: refereeSignature.contentHash, refereeSignature });
  }

  function validateMatchBinding(binding) {
    if (!object(binding) || binding.schemaVersion !== `${STARCRAFT_TMG_AUTHORITY_VERSION}.match-binding`) {
      throw new AuthorityError("DEPENDENCY_QUARANTINED", "MatchBinding schema is invalid");
    }
    const core = bindingCore(binding);
    if (binding.bindingHash !== hashStarcraftTmgContract(core)
      || !crypto.verify(core, binding.refereeSignature, "match_binding")
      || binding.refereeKeyId !== crypto.descriptor.keyId
      || binding.refereePublicKeyFingerprint !== crypto.descriptor.publicKeyFingerprint) {
      throw new AuthorityError("SIGNATURE_INVALID", "MatchBinding signature or referee lineage is invalid");
    }
    if (hashStarcraftTmgContract(binding.rulesRuntimeBinding)
      !== hashStarcraftTmgContract(rulesRuntimeBinding)) {
      throw new AuthorityError(
        "DEPENDENCY_QUARANTINED",
        "frozen rules runtime is unavailable or does not match the current engine",
        {
          expectedRuntimeHash: binding.rulesRuntimeBinding?.runtimeHash || "",
          observedRuntimeHash: rulesRuntimeBinding.runtimeHash,
          silentCompatibilityUsed: false,
        },
      );
    }
    return binding;
  }

  function verifyFrozenDependencies(binding) {
    try {
      validateMatchBinding(binding);
    } catch (error) {
      return rejectedFrom(error, "DEPENDENCY_QUARANTINED");
    }
    const failures = [];
    for (const kind of DEPENDENCY_KINDS) {
      const expected = binding.dependencies?.[kind];
      const observed = dependencyRegistry.get(expected?.contentHash);
      if (!expected || !observed) failures.push({ reason: "DEPENDENCY_MISSING", kind, contentHash: expected?.contentHash || "" });
      else if (observed.kind !== kind || observed.contentHash !== expected.contentHash) failures.push({ reason: "DEPENDENCY_HASH_MISMATCH", kind, contentHash: expected.contentHash });
    }
    const display = dependencyRegistry.get(binding.rulesDisplayBinding?.artifactHash);
    if (!display) failures.push({ reason: "HISTORICAL_RULES_DISPLAY_MISSING", kind: "rulesDisplay", contentHash: binding.rulesDisplayBinding?.artifactHash || "" });
    else if (display.contentHash !== binding.rulesDisplayBinding.artifactHash) failures.push({ reason: "DEPENDENCY_HASH_MISMATCH", kind: "rulesDisplay", contentHash: binding.rulesDisplayBinding.artifactHash });
    if (failures.length) {
      return rejection("DEPENDENCY_QUARANTINED", {
        quarantine: {
          schemaVersion: "starcraft_tmg_dependency_quarantine_v1",
          matchBindingHash: binding.bindingHash,
          failures,
          silentCompatibilityUsed: false,
          trainingTruth: false,
        },
      });
    }
    return deepFreeze({ ok: true, matchBindingHash: binding.bindingHash, dependencyCount: DEPENDENCY_KINDS.length + 1, silentCompatibilityUsed: false });
  }

  function readHistoricalRules(binding) {
    try {
      validateMatchBinding(binding);
      const record = dependencyRegistry.get(binding.rulesDisplayBinding.artifactHash);
      if (!record) return rejection("HISTORICAL_RULES_DISPLAY_MISSING", { artifactHash: binding.rulesDisplayBinding.artifactHash });
      if (hashStarcraftTmgContract(record.content) !== binding.rulesDisplayBinding.artifactHash) {
        return rejection("DEPENDENCY_HASH_MISMATCH", { artifactHash: binding.rulesDisplayBinding.artifactHash });
      }
      return deepFreeze({ ok: true, binding: clone(binding.rulesDisplayBinding), content: clone(record.content), trainingTruth: false });
    } catch (error) {
      return rejectedFrom(error, "DEPENDENCY_QUARANTINED");
    }
  }

  function validateEnvelope(envelope) {
    if (!object(envelope) || envelope.schemaVersion !== `${STARCRAFT_TMG_AUTHORITY_VERSION}.envelope`) {
      throw new AuthorityError("PROPOSAL_INVALID", "authority envelope schema is invalid");
    }
    nonEmpty(envelope.gameId, "envelope.gameId");
    nonEmpty(envelope.roomId, "envelope.roomId");
    const stateRevision = nonNegativeInteger(envelope.stateRevision, "envelope.stateRevision");
    validateMatchBinding(envelope.matchBinding);
    if (envelope.matchBindingHash !== envelope.matchBinding.bindingHash
      || envelope.matchBinding.roomId !== envelope.roomId
      || envelope.matchBinding.gameId !== envelope.gameId) {
      throw new AuthorityError("DEPENDENCY_QUARANTINED", "envelope MatchBinding does not match the room");
    }
    if (!HASH_PATTERN.test(String(envelope.stateHash || "")) || !HASH_PATTERN.test(String(envelope.journalHeadHash || ""))) {
      throw new AuthorityError("PROPOSAL_INVALID", "envelope hash is invalid");
    }
    const state = normalizeAuthorityState(envelope.state, stateRevision);
    if (hashStarcraftTmgContract(state) !== envelope.stateHash) throw new AuthorityError("SIGNATURE_INVALID", "envelope state hash does not match state");
    return state;
  }

  function createEnvelope(input = {}) {
    const stateRevision = nonNegativeInteger(input.stateRevision ?? input.revision ?? 0, "stateRevision");
    const roomId = nonEmpty(input.roomId, "roomId");
    const gameId = nonEmpty(input.gameId || "starcraft-tmg", "gameId");
    const matchBinding = input.matchBinding || createMatchBinding({
      roomId,
      gameId,
      matchId: input.matchId,
      dataVersion: input.dataVersion,
      dependencies: input.dependencies,
      rulesDisplay: input.rulesDisplay,
      rngSchemeId: input.rngSchemeId,
      productionReady: input.productionReady,
    });
    validateMatchBinding(matchBinding);
    const state = normalizeAuthorityState(input.state || {}, stateRevision);
    const envelope = {
      schemaVersion: `${STARCRAFT_TMG_AUTHORITY_VERSION}.envelope`,
      gameId,
      roomId,
      matchBindingHash: matchBinding.bindingHash,
      matchBinding,
      stateRevision,
      revision: stateRevision,
      privateJournalSequence: nonNegativeInteger(input.privateJournalSequence ?? stateRevision, "privateJournalSequence"),
      stateHash: hashStarcraftTmgContract(state),
      journalHeadHash: input.journalHeadHash || genesisJournalHash,
      state,
    };
    if (!HASH_PATTERN.test(envelope.journalHeadHash)) throw new AuthorityError("PROPOSAL_INVALID", "journalHeadHash must be a SHA-256 hash");
    return deepFreeze(envelope);
  }

  function issueSeatAuthority(input = {}) {
    const capabilities = stableCapabilities(input.capabilities || []);
    const content = {
      schemaVersion: "starcraft_tmg_seat_authority_v1",
      grantId: nonEmpty(input.grantId || `sc-grant-${randomUUID()}`, "grantId"),
      roomId: nonEmpty(input.roomId, "roomId"),
      matchBindingHash: nonEmpty(input.matchBindingHash, "matchBindingHash"),
      seatKey: nonEmpty(input.seatKey, "seatKey"),
      roleMode: nonEmpty(input.roleMode || "player", "roleMode"),
      principalType: String(input.principalType || "human"),
      visibilityScope: String(input.visibilityScope || "seat"),
      capabilities,
      recoveryRevision: nonNegativeInteger(input.recoveryRevision ?? 0, "recoveryRevision"),
      revoked: false,
    };
    return deepFreeze({ ...content, authoritySeal: crypto.seal(content, "seat_authority") });
  }

  function validateSeatAuthority(authority, envelope, capability) {
    if (!object(authority) || !crypto.verifySeal(authoritySealedContent(authority), authority.authoritySeal, "seat_authority")) {
      throw new AuthorityError("SEAT_GRANT_INVALID", "SeatGrant authority seal is invalid");
    }
    if (authority.revoked || authority.roomId !== envelope.roomId || authority.matchBindingHash !== envelope.matchBindingHash) {
      throw new AuthorityError("SEAT_GRANT_INVALID", "SeatGrant does not belong to the current room binding");
    }
    if (!authority.capabilities.includes(capability)) throw new AuthorityError("CAPABILITY_DENIED", `SeatGrant lacks ${capability}`, { capability });
    return authority;
  }

  function issueControlLease(input = {}) {
    const authority = input.seatAuthority;
    if (!object(authority) || !crypto.verifySeal(authoritySealedContent(authority), authority.authoritySeal, "seat_authority")) {
      throw new AuthorityError("SEAT_GRANT_INVALID", "SeatGrant authority seal is invalid");
    }
    if (!authority.capabilities.includes("apply")) throw new AuthorityError("CAPABILITY_DENIED", "SeatGrant cannot own a ControlLease");
    const content = {
      schemaVersion: "starcraft_tmg_control_lease_v1",
      leaseId: nonEmpty(input.leaseId || `sc-lease-${randomUUID()}`, "leaseId"),
      roomId: authority.roomId,
      matchBindingHash: authority.matchBindingHash,
      seatKey: authority.seatKey,
      grantId: authority.grantId,
      sessionId: nonEmpty(input.sessionId, "sessionId"),
      leaseFence: positiveInteger(input.leaseFence, "leaseFence"),
      issuedAtRoomRevision: nonNegativeInteger(input.issuedAtRoomRevision ?? 0, "issuedAtRoomRevision"),
    };
    return deepFreeze({ ...content, leaseSeal: crypto.seal(content, "control_lease") });
  }

  function validateControlLease(lease, envelope, authority) {
    if (!object(lease) || !crypto.verifySeal(leaseSealedContent(lease), lease.leaseSeal, "control_lease")) {
      throw new AuthorityError("CONTROL_LEASE_REQUIRED", "ControlLease seal is invalid");
    }
    if (lease.roomId !== envelope.roomId || lease.matchBindingHash !== envelope.matchBindingHash
      || lease.seatKey !== authority.seatKey || lease.grantId !== authority.grantId) {
      throw new AuthorityError("CONTROL_LEASE_FENCED", "ControlLease is not bound to this applying SeatGrant");
    }
    return lease;
  }

  function buildLegalSpace(envelope, sideKey) {
    const state = validateEnvelope(envelope);
    let enumerated;
    if (rulesRuntime) {
      if (!rulesRuntimeBinding.legalSpaceComplete && !developmentSubsetEnabled) {
        throw new AuthorityError(
          "RULE_RUNTIME_INCOMPLETE",
          "RULE_RUNTIME_INCOMPLETE: the official executable catalogue cannot define complete LegalSpace",
          {
            runtimeHash: rulesRuntimeBinding.runtimeHash,
            catalogueHash: rulesRuntimeBinding.catalogueHash,
            executableRuleAtomCount: rulesRuntimeBinding.executableRuleAtomCount,
            nonExecutableRuleAtomCount: rulesRuntimeBinding.nonExecutableRuleAtomCount,
          },
        );
      }
      enumerated = rulesRuntime.enumerate(state, {
        sideKey,
        includeDisabled: true,
        matchBinding: envelope.matchBinding,
      });
      if (!object(enumerated) || !Array.isArray(enumerated.candidates)) {
        throw new AuthorityError(
          "RULE_RUNTIME_INVALID",
          "RULE_RUNTIME_INVALID: enumerate did not return a candidate set",
        );
      }
      for (const candidate of enumerated.candidates) {
        const executor = runtimeExecutors.get(candidate.executorId);
        if (!Array.isArray(candidate.ruleAtomIds)
          || candidate.ruleAtomIds.length === 0
          || candidate.ruleAtomIds.some((atomId) => !runtimeExecutableAtomIds.has(atomId))
          || !executor
          || executor.executorVersion !== candidate.executorVersion
          || !executor.actionTypes.includes(candidate.actionType)) {
          throw new AuthorityError(
            "RULE_RUNTIME_INVALID",
            "RULE_RUNTIME_INVALID: candidate is not bound to the resolved executable catalogue",
            { actionType: candidate.actionType || "", executorId: candidate.executorId || "" },
          );
        }
      }
      for (const domain of (enumerated.parameterDomains || [])) {
        const executor = runtimeExecutors.get(domain.executorId);
        if (!object(domain)
          || !String(domain.domainId || "").startsWith("sc-domain-")
          || !String(domain.parameterKind || "").trim()
          || !Array.isArray(domain.ruleAtomIds)
          || domain.ruleAtomIds.length === 0
          || domain.ruleAtomIds.some((atomId) => !runtimeExecutableAtomIds.has(atomId))
          || !executor
          || executor.executorVersion !== domain.executorVersion
          || !executor.actionTypes.includes(domain.actionType)) {
          throw new AuthorityError(
            "RULE_RUNTIME_INVALID",
            "RULE_RUNTIME_INVALID: parameter domain is not bound to the resolved executable catalogue",
            { actionType: domain.actionType || "", executorId: domain.executorId || "" },
          );
        }
      }
    } else {
      const legacyEnumerated = enumerateStarcraftTmgLegalActions(state, { sideKey, includeDisabled: true });
      const officialPassPhase = OFFICIAL_PASS_PHASES.has(state.phase);
      const legacyCandidates = legacyEnumerated.candidates.filter((candidate) => {
        if (state.phase === "movement" && candidate.actionType === "hold") return false;
        if (officialPassPhase && ["pass", "advance_phase"].includes(candidate.actionType)) return false;
        return true;
      });
      const officialHoldCandidates = state.phase === "movement"
        ? enumerateOfficialMovementHoldActionsV1(state, { sideKey, includeDisabled: true })
          .map((candidate) => withPassInteractionLineage(candidate, state))
        : [];
      const officialPassCandidates = officialPassPhase
        ? enumerateOfficialActivationPassActionsV1(state, {
          sideKey,
          includeDisabled: true,
          sideHasAvailableActivation: (targetSideKey, targetState, targetPhase) => (
            hasPhaseActivation(targetState, targetSideKey, targetPhase)
          ),
        })
        : [];
      enumerated = {
        ...legacyEnumerated,
        candidates: [
          ...legacyCandidates,
          ...officialHoldCandidates,
          ...officialPassCandidates,
        ].map((candidate) => authorityEligibleCandidate(candidate, state, sideKey)),
      };
    }
    const finiteActions = [];
    const disabledDiagnostics = [];
    const searchSuggestions = [];
    for (const candidate of enumerated.candidates) {
      const action = contractAction(candidate);
      if (MOVEMENT_ACTION_TYPES.has(action.actionType)) continue;
      if (candidate.isEnabled) {
        const actionKey = finiteActionIdentity(envelope.matchBindingHash, envelope.stateHash, envelope.stateRevision, sideKey, action);
        finiteActions.push({ actionKey, action, confirmationClass: confirmationClassFor(action) });
      } else {
        disabledDiagnostics.push({ action, disabledReason: candidate.disabledReason || "disabled_by_rules" });
      }
    }
    const movementRows = rulesRuntime
      ? []
      : enumerated.candidates.filter((candidate) => MOVEMENT_ACTION_TYPES.has(candidate.actionType));
    const parameterDomains = rulesRuntime && Array.isArray(enumerated.parameterDomains)
      ? clone(enumerated.parameterDomains)
      : [];
    for (const candidate of movementRows) {
      const piece = state.pieces.find((entry) => entry.id === candidate.pieceId && entry.isOnField && !entry.isDestroyed);
      const holdEnabled = enumerated.candidates.some((entry) => entry.actionType === "hold" && entry.pieceId === candidate.pieceId && entry.isEnabled);
      if (!piece || !holdEnabled) {
        disabledDiagnostics.push({ action: contractAction(candidate), disabledReason: candidate.disabledReason || "movement_piece_unavailable" });
        continue;
      }
      try {
        movementBaseRadiusMilli(piece);
      } catch (error) {
        disabledDiagnostics.push({ action: contractAction(candidate), disabledReason: error.code || "RULE_UNSUPPORTED", details: error.details });
        continue;
      }
      const details = candidate.details || {};
      const actionType = candidate.actionType;
      const domainCore = {
        matchBindingHash: envelope.matchBindingHash,
        stateHash: envelope.stateHash,
        stateRevision: envelope.stateRevision,
        sideKey,
        actionType,
        pieceId: piece.id,
      };
      const domain = {
        domainId: `sc-domain-${hashStarcraftTmgContract(domainCore)}`,
        actionType,
        sideKey,
        pieceId: piece.id,
        parameterSchema: {
          type: "object",
          required: ["path"],
          pathUnit: STARCRAFT_TMG_PATH_UNIT,
          coordinateType: "safe_integer",
          maxCanonicalPoints: STARCRAFT_TMG_MAX_CANONICAL_PATH_POINTS,
        },
        constraints: {
          start: { xMilliInches: milliFromInches(piece.xInches), yMilliInches: milliFromInches(piece.yInches) },
          maxCostMilliInches: milliFromInches(details.speed || 0),
          geometryVersion: "fixed_point_round_base_sweep_v1",
          pathBudgetVersion: "path_budget_v1",
          ...(actionType === "disengage" ? {
            tacticalMass: Boolean(details.tacticalMass),
            ownCurrentSupply: Number(details.ownCurrentSupply || 0),
            engagingEnemyCurrentSupply: Number(details.engagingEnemyCurrentSupply || 0),
          } : {}),
        },
        confirmationClass: "direct_gesture",
      };
      parameterDomains.push(domain);
      if (candidate.isEnabled && candidate.to) {
        const suggestionProposal = {
          kind: "parameterized",
          domainId: domain.domainId,
          parameters: { path: [{ xMilliInches: milliFromInches(candidate.to.xInches), yMilliInches: milliFromInches(candidate.to.yInches) }] },
        };
        const suggestionId = `sc-suggestion-${hashStarcraftTmgContract({ domainId: domain.domainId, proposal: suggestionProposal })}`;
        searchSuggestions.push({
          suggestionId,
          candidateId: suggestionId,
          kind: "parameter_sample",
          authoritativeIdentity: false,
          proposal: suggestionProposal,
          action: contractAction(candidate),
          isEnabled: true,
          score: Number(candidate.score || 0),
          details: clone(candidate.details || {}),
        });
      }
    }
    const core = {
      schemaVersion: `${STARCRAFT_TMG_AUTHORITY_VERSION}.legal-space`,
      gameId: envelope.gameId,
      roomId: envelope.roomId,
      matchBindingHash: envelope.matchBindingHash,
      stateRevision: envelope.stateRevision,
      revision: envelope.stateRevision,
      stateHash: envelope.stateHash,
      sideKey,
      phase: enumerated.stateSummary?.phase || state.phase,
      terminal: clone(enumerated.terminal || null),
      rulesRuntimeBinding: clone(rulesRuntimeBinding),
      finiteActions,
      parameterDomains,
    };
    const legalSpaceHash = hashStarcraftTmgContract(core);
    const compatibilityCandidates = [
      ...finiteActions.map((entry) => ({ candidateId: entry.actionKey, action: clone(entry.action), isEnabled: true, score: 0, details: {}, authoritativeIdentity: true })),
      ...searchSuggestions,
    ];
    return deepFreeze({
      ...core,
      legalSpaceHash,
      searchSuggestions,
      disabledDiagnostics,
      candidates: compatibilityCandidates,
      disabledCount: disabledDiagnostics.length,
      searchAndStrategyExcludedFromAuthority: true,
    });
  }

  function legalSpace(envelope, input = {}) {
    try {
      const authority = validateSeatAuthority(input.seatAuthority, envelope, "read_legal_space");
      return buildLegalSpace(envelope, authority.seatKey);
    } catch (error) {
      if (input.internalServerAuthority === true) return buildLegalSpace(envelope, nonEmpty(input.sideKey || envelope.state?.activeSideKey, "sideKey"));
      throw error;
    }
  }

  function resolveProposal(envelope, sideKey, input = {}) {
    const space = buildLegalSpace(envelope, sideKey);
    let proposal = clone(input.proposal);
    if (!proposal && input.candidateId) {
      const finite = space.finiteActions.find((entry) => entry.actionKey === input.candidateId);
      if (finite) proposal = { kind: "finite", actionKey: finite.actionKey };
      const suggestion = space.searchSuggestions.find((entry) => entry.suggestionId === input.candidateId);
      if (suggestion) proposal = clone(suggestion.proposal);
    }
    if (!object(proposal)) throw new AuthorityError("PROPOSAL_INVALID", "proposal is required");
    if (proposal.kind === "finite") {
      const finite = space.finiteActions.find((entry) => entry.actionKey === proposal.actionKey);
      if (!finite) throw new AuthorityError("LEGAL_SPACE_STALE", "finite action is not in current LegalSpace", { actionKey: proposal.actionKey || "" });
      const canonicalProposal = { kind: "finite", actionKey: finite.actionKey };
      return { space, canonicalProposal, action: clone(finite.action), domain: null, canonicalPath: null };
    }
    if (proposal.kind === "parameterized") {
      const domain = space.parameterDomains.find((entry) => entry.domainId === proposal.domainId);
      if (!domain) throw new AuthorityError("LEGAL_SPACE_STALE", "parameter domain is not in current LegalSpace", { domainId: proposal.domainId || "" });
      if (rulesRuntime) {
        if (typeof rulesRuntime.instantiate !== "function") {
          throw new AuthorityError("RULE_RUNTIME_INVALID", "official Rules runtime cannot instantiate its parameter domain");
        }
        const instantiated = rulesRuntime.instantiate(
          envelope.state,
          domain,
          proposal.parameters || {},
          { matchBinding: envelope.matchBinding },
        );
        if (!object(instantiated)
          || !object(instantiated.action)
          || !object(instantiated.canonicalParameters)) {
          throw new AuthorityError("RULE_RUNTIME_INVALID", "official Rules runtime returned an invalid parameter instantiation");
        }
        const canonicalProposal = {
          kind: "parameterized",
          domainId: domain.domainId,
          parameters: clone(instantiated.canonicalParameters),
        };
        return {
          space,
          canonicalProposal,
          action: clone(instantiated.action),
          domain: clone(domain),
          canonicalPath: null,
        };
      }
      const canonicalPath = validateMovementPath(envelope.state, domain, proposal.parameters || {});
      const endpoint = canonicalPath.points.at(-1);
      const action = {
        actionType: domain.actionType,
        sideKey: domain.sideKey,
        pieceId: domain.pieceId,
        to: { xInches: roundInchesFromMilli(endpoint.xMilliInches), yInches: roundInchesFromMilli(endpoint.yMilliInches) },
      };
      const canonicalProposal = { kind: "parameterized", domainId: domain.domainId, parameters: { path: canonicalPath.points } };
      return { space, canonicalProposal, action, domain, canonicalPath };
    }
    if (proposal.kind === "manual_adjudication") {
      throw new AuthorityError("CAPABILITY_DENIED", "ManualAdjudicationAction is disabled in M1", { trainingEligible: false });
    }
    throw new AuthorityError("PROPOSAL_INVALID", "unsupported proposal kind", { kind: proposal.kind || "" });
  }

  function deterministicTransition(envelope, resolved) {
    const state = validateEnvelope(envelope);
    const previousLogLength = state.log.length;
    let applied;
    if (rulesRuntime) {
      applied = rulesRuntime.apply(state, resolved.action, {
        postRevision: envelope.stateRevision + 1,
        canonicalPath: clone(resolved.canonicalPath),
        parameterDomain: clone(resolved.domain),
        matchBinding: envelope.matchBinding,
        chanceReveals: clone(resolved.chanceReveals),
      });
      if (!object(applied) || applied.ok !== true || !object(applied.state)) {
        throw new AuthorityError(
          "RULE_RUNTIME_INVALID",
          "RULE_RUNTIME_INVALID: apply did not return an accepted state transition",
        );
      }
    } else if (resolved.canonicalPath) {
      applied = applyCanonicalMovement(state, resolved.action, resolved.canonicalPath, resolved.domain, envelope.stateRevision + 1);
    } else if (resolved.action.actionType === "pass" && OFFICIAL_PASS_PHASES.has(state.phase)) {
      applied = applyOfficialActivationPassV1(state, resolved.action, {
        postRevision: envelope.stateRevision + 1,
        sideHasAvailableActivation: (sideKey, nextState, phase) => (
          hasPhaseActivation(nextState, sideKey, phase)
        ),
      });
    } else if (resolved.action.actionType === "hold" && state.phase === "movement") {
      applied = applyOfficialMovementHoldV1(state, resolved.action, {
        postRevision: envelope.stateRevision + 1,
        sideHasAvailableActivation: (sideKey, nextState) => (
          hasMovementActivation(nextState, sideKey)
        ),
      });
      const settled = settleOfficialAlternatingPhaseAfterActivationV1(applied.state, {
        phase: "movement",
        actingSideKey: resolved.action.sideKey,
        sideHasAvailableActivation: (sideKey, nextState, phase) => (
          hasPhaseActivation(nextState, sideKey, phase)
        ),
      });
      applied.state = settled.state;
      applied.events = [...(applied.events || []), ...settled.events];
      const lastLog = applied.state.log?.at(-1);
      if (lastLog) {
        lastLog.action = clone(resolved.action);
        lastLog.events = clone(applied.events);
      }
    } else {
      applied = applyStarcraftTmgAction(state, resolved.action);
      if (!applied.ok) throw new AuthorityError("PROPOSAL_INVALID", "rules executor rejected the proposal", { rulesReason: applied.reason || "unknown_rules_rejection" });
      applied.state = normalizeAuthorityState(applied.state, envelope.stateRevision + 1);
      appendDeterministicLogIdentity(applied.state, previousLogLength, envelope.stateRevision + 1);
    }
    const nextState = normalizeAuthorityState(applied.state, envelope.stateRevision + 1);
    const events = clone(applied.events || []);
    return { nextState, events };
  }

  function createChanceTicket(input = {}) {
    const basis = {
      schemaVersion: "starcraft_tmg_chance_basis_v1",
      matchBindingHash: nonEmpty(input.matchBindingHash || input.envelope?.matchBindingHash, "matchBindingHash"),
      stateHash: nonEmpty(input.stateHash || input.envelope?.stateHash, "stateHash"),
      stateRevision: nonNegativeInteger(input.stateRevision ?? input.envelope?.stateRevision, "stateRevision"),
      proposalHash: nonEmpty(input.proposalHash, "proposalHash"),
      counter: nonNegativeInteger(input.counter ?? 0, "counter"),
      faces: positiveInteger(input.faces, "faces"),
      rngSchemeId: String(input.rngSchemeId || input.envelope?.matchBinding?.rngSchemeId || "hmac_sha256_counter_v1"),
    };
    const outcomeProof = crypto.seal(basis, "chance_outcome");
    const commitment = hashStarcraftTmgContract({ basis, outcomeProofHash: hashStarcraftTmgContract(outcomeProof) });
    return deepFreeze({ schemaVersion: "starcraft_tmg_chance_ticket_v1", basis, commitment, outcomeHidden: true });
  }

  function revealChanceTicket(ticket) {
    if (!object(ticket) || ticket.schemaVersion !== "starcraft_tmg_chance_ticket_v1") return rejection("CHANCE_TICKET_INVALID");
    const outcomeProof = crypto.seal(ticket.basis, "chance_outcome");
    const commitment = hashStarcraftTmgContract({ basis: ticket.basis, outcomeProofHash: hashStarcraftTmgContract(outcomeProof) });
    if (commitment !== ticket.commitment) return rejection("CHANCE_TICKET_INVALID");
    const bytes = Buffer.from(outcomeProof.mac, "base64url");
    const outcome = (bytes.readUInt32BE(0) % ticket.basis.faces) + 1;
    return deepFreeze({ ok: true, schemaVersion: "starcraft_tmg_chance_reveal_v1", commitment, outcome, faces: ticket.basis.faces, outcomeProof });
  }

  function fixedRollChanceSpec(action) {
    if (action?.chance === undefined || action?.chance === null) return null;
    const chance = action.chance;
    if (!object(chance)
      || chance.kind !== "fixed_roll_sequence"
      || chance.faces !== 6
      || !Number.isSafeInteger(chance.count)
      || chance.count <= 0
      || !object(chance.layout)) {
      throw new AuthorityError("CHANCE_SPEC_INVALID", "fixed roll chance specification is invalid");
    }
    const legacyKeys = ["hit", "armour", "evade", "surge"];
    const indirectFireKeys = [...legacyKeys, "indirectFireEvade"];
    const initiativeKeys = ["initiativePlayer1", "initiativePlayer2"];
    const chargeKeys = ["charge"];
    const observedKeys = Object.keys(chance.layout);
    const chargeLayout = observedKeys.length === chargeKeys.length
      && chargeKeys.every((key) => observedKeys.includes(key));
    const initiativeLayout = observedKeys.length === initiativeKeys.length
      && initiativeKeys.every((key) => observedKeys.includes(key));
    const indirectFireLayout = observedKeys.includes("indirectFireEvade")
      && observedKeys.every((key) => indirectFireKeys.includes(key));
    const legacyLayout = observedKeys.every((key) => legacyKeys.includes(key));
    if (!chargeLayout && !initiativeLayout && !indirectFireLayout && !legacyLayout) {
      throw new AuthorityError("CHANCE_SPEC_INVALID", "chance layout kind is invalid");
    }
    const layoutKeys = chargeLayout
      ? chargeKeys
      : initiativeLayout
        ? initiativeKeys
      : indirectFireLayout
        ? indirectFireKeys
        : legacyKeys;
    const layout = Object.fromEntries(layoutKeys.map((key) => [
      key,
      nonNegativeInteger(chance.layout[key] ?? 0, `chance.layout.${key}`),
    ]));
    if (Object.values(layout).reduce((sum, value) => sum + value, 0) !== chance.count) {
      throw new AuthorityError("CHANCE_SPEC_INVALID", "chance layout does not match roll count");
    }
    return { kind: "fixed_roll_sequence", faces: chance.faces, count: chance.count, layout };
  }

  function createChanceArtifacts(envelope, action, proposalHash) {
    const spec = fixedRollChanceSpec(action);
    if (!spec) return null;
    const tickets = Array.from({ length: spec.count }, (_unused, counter) => createChanceTicket({
      envelope,
      proposalHash,
      counter,
      faces: spec.faces,
    }));
    const ticketBody = {
      schemaVersion: "starcraft_tmg_chance_bundle_v1",
      matchBindingHash: envelope.matchBindingHash,
      stateHash: envelope.stateHash,
      stateRevision: envelope.stateRevision,
      proposalHash,
      spec,
      tickets,
      outcomesHidden: true,
    };
    const ticketBundle = deepFreeze({
      ...ticketBody,
      bundleHash: hashStarcraftTmgContract(ticketBody),
    });
    const reveals = tickets.map((ticket, counter) => {
      const revealed = revealChanceTicket(ticket);
      if (!revealed.ok) throw new AuthorityError("CHANCE_TICKET_INVALID");
      return {
        counter,
        basis: clone(ticket.basis),
        commitment: revealed.commitment,
        outcome: revealed.outcome,
        faces: revealed.faces,
        outcomeProof: clone(revealed.outcomeProof),
      };
    });
    const revealBundle = deepFreeze({
      schemaVersion: "starcraft_tmg_chance_reveal_bundle_v1",
      ticketBundleHash: ticketBundle.bundleHash,
      spec,
      reveals,
      longTermIntegrity: "accepted_receipt_ed25519_signature",
      shortTermSeal: "hmac_sha256_chance_outcome",
    });
    return { ticketBundle, revealBundle };
  }

  function signedChanceRevealsForReplay(envelope, action, proposalHash, bundle) {
    const spec = fixedRollChanceSpec(action);
    if (!spec) {
      if (bundle !== null) throw new AuthorityError("REPLAY_DIVERGED", "unexpected chance reveal");
      return undefined;
    }
    if (!object(bundle)
      || bundle.schemaVersion !== "starcraft_tmg_chance_reveal_bundle_v1"
      || !isDeepStrictEqual(bundle.spec, spec)
      || !Array.isArray(bundle.reveals)
      || bundle.reveals.length !== spec.count) {
      throw new AuthorityError("REPLAY_DIVERGED", "signed chance reveal bundle is invalid");
    }
    const publicTickets = bundle.reveals.map((reveal, counter) => {
      const expectedBasis = {
        schemaVersion: "starcraft_tmg_chance_basis_v1",
        matchBindingHash: envelope.matchBindingHash,
        stateHash: envelope.stateHash,
        stateRevision: envelope.stateRevision,
        proposalHash,
        counter,
        faces: spec.faces,
        rngSchemeId: envelope.matchBinding.rngSchemeId,
      };
      if (reveal.counter !== counter
        || !isDeepStrictEqual(reveal.basis, expectedBasis)
        || reveal.faces !== spec.faces
        || !object(reveal.outcomeProof)
        || reveal.outcomeProof.schemaVersion !== "starcraft_tmg_referee_seal_v1"
        || reveal.outcomeProof.purpose !== "chance_outcome"
        || reveal.outcomeProof.keyId !== envelope.matchBinding.refereeKeyId
        || reveal.outcomeProof.hashAlgorithm !== "sha256"
        || reveal.outcomeProof.sealAlgorithm !== "hmac-sha256"
        || reveal.outcomeProof.contentHash !== hashStarcraftTmgContract(expectedBasis)) {
        throw new AuthorityError("REPLAY_DIVERGED", "signed chance reveal basis is invalid", { counter });
      }
      const commitment = hashStarcraftTmgContract({
        basis: expectedBasis,
        outcomeProofHash: hashStarcraftTmgContract(reveal.outcomeProof),
      });
      const bytes = Buffer.from(String(reveal.outcomeProof.mac || ""), "base64url");
      if (bytes.length < 4
        || reveal.commitment !== commitment
        || reveal.outcome !== (bytes.readUInt32BE(0) % spec.faces) + 1) {
        throw new AuthorityError("REPLAY_DIVERGED", "signed chance reveal outcome is invalid", { counter });
      }
      return {
        schemaVersion: "starcraft_tmg_chance_ticket_v1",
        basis: expectedBasis,
        commitment,
        outcomeHidden: true,
      };
    });
    const ticketBody = {
      schemaVersion: "starcraft_tmg_chance_bundle_v1",
      matchBindingHash: envelope.matchBindingHash,
      stateHash: envelope.stateHash,
      stateRevision: envelope.stateRevision,
      proposalHash,
      spec,
      tickets: publicTickets,
      outcomesHidden: true,
    };
    // The receipt's Ed25519 signature binds these reveals for long-term replay;
    // replay intentionally does not depend on the short-lived HMAC secret.
    if (bundle.ticketBundleHash !== hashStarcraftTmgContract(ticketBody)) {
      throw new AuthorityError("REPLAY_DIVERGED", "signed chance ticket bundle hash is invalid");
    }
    return bundle.reveals;
  }

  function calculatePreviewCore(envelope, sideKey, proposalInput) {
    const resolved = resolveProposal(envelope, sideKey, proposalInput);
    const proposalHash = hashStarcraftTmgContract(resolved.canonicalProposal);
    const chanceArtifacts = createChanceArtifacts(envelope, resolved.action, proposalHash);
    const transition = deterministicTransition(envelope, {
      ...resolved,
      chanceReveals: chanceArtifacts?.revealBundle.reveals,
    });
    const baseConfirmationClass = confirmationClassFor(resolved.action);
    return {
      core: {
        schemaVersion: `${STARCRAFT_TMG_AUTHORITY_VERSION}.preview-core`,
        gameId: envelope.gameId,
        roomId: envelope.roomId,
        matchBindingHash: envelope.matchBindingHash,
        expectedStateRevision: envelope.stateRevision,
        expectedRevision: envelope.stateRevision,
        preStateHash: envelope.stateHash,
        legalSpaceHash: resolved.space.legalSpaceHash,
        seatKey: sideKey,
        proposal: resolved.canonicalProposal,
        proposalHash,
        action: { ...clone(resolved.action), ...(resolved.canonicalPath ? { canonicalPath: clone(resolved.canonicalPath) } : {}) },
        confirmationPolicy: { baseClass: baseConfirmationClass, requiresExplicitHuman: baseConfirmationClass === "explicit_human" },
        chanceTicket: chanceArtifacts?.ticketBundle || null,
        result: chanceArtifacts ? {
          chancePending: true,
          postStateHash: null,
          eventsHash: null,
          events: [],
          postGameClock: null,
        } : {
          postStateHash: hashStarcraftTmgContract(transition.nextState),
          eventsHash: hashStarcraftTmgContract(transition.events),
          events: transition.events,
          postGameClock: clone(transition.nextState.gameClock),
        },
        trainingTruth: false,
      },
      nextState: transition.nextState,
      events: transition.events,
      chanceRevealBundle: chanceArtifacts?.revealBundle || null,
    };
  }

  function preview(input = {}) {
    try {
      const envelope = input.envelope;
      validateEnvelope(envelope);
      const authority = validateSeatAuthority(input.seatAuthority, envelope, "preview");
      if (READ_ONLY_ROLE_MODES.has(authority.roleMode)) throw new AuthorityError("CAPABILITY_DENIED", `${authority.roleMode} is read-only`);
      const calculated = calculatePreviewCore(envelope, authority.seatKey, input);
      const core = clone(calculated.core);
      if (authority.roleMode === "opponent" || authority.principalType === "model") {
        core.confirmationPolicy = { baseClass: core.confirmationPolicy.baseClass, requiresExplicitHuman: true, reason: "opponent_requires_human_confirmation" };
      }
      const previewId = `sc-preview-${randomUUID()}`;
      const sealedContent = { previewId, core };
      const previewSeal = crypto.seal(sealedContent, "preview");
      const previewArtifact = deepFreeze({
        schemaVersion: `${STARCRAFT_TMG_AUTHORITY_VERSION}.preview`,
        previewId,
        previewToken: `${previewId}.${previewSeal.mac}`,
        core,
        previewSeal,
        audit: { occurredAt: isoTime(input.occurredAt || now()) },
      });
      return deepFreeze({ ok: true, preview: previewArtifact });
    } catch (error) {
      return rejectedFrom(error);
    }
  }

  function validatePreview(previewArtifact, envelope) {
    if (!object(previewArtifact) || previewArtifact.schemaVersion !== `${STARCRAFT_TMG_AUTHORITY_VERSION}.preview`
      || !crypto.verifySeal(previewSealedContent(previewArtifact), previewArtifact.previewSeal, "preview")) {
      throw new AuthorityError("CONFIRMATION_INVALID", "preview seal is invalid");
    }
    if (previewArtifact.core.roomId !== envelope.roomId || previewArtifact.core.matchBindingHash !== envelope.matchBindingHash) {
      throw new AuthorityError("LEGAL_SPACE_STALE", "preview belongs to another room binding");
    }
    if (previewArtifact.core.expectedStateRevision !== envelope.stateRevision || previewArtifact.core.preStateHash !== envelope.stateHash) {
      throw new AuthorityError("LEGAL_SPACE_STALE", "preview state is stale", {
        observedStateRevision: envelope.stateRevision,
        observedStateHash: envelope.stateHash,
      });
    }
    return previewArtifact;
  }

  function confirmPreview(input = {}) {
    try {
      const envelope = input.envelope;
      validateEnvelope(envelope);
      const previewArtifact = validatePreview(input.preview, envelope);
      const authority = validateSeatAuthority(input.seatAuthority, envelope, "confirm");
      if (authority.seatKey !== previewArtifact.core.seatKey || authority.roleMode === "opponent" || authority.principalType === "model") {
        throw new AuthorityError("CAPABILITY_DENIED", "confirmation must come from a human authority controlling the same seat");
      }
      const content = {
        schemaVersion: "starcraft_tmg_confirmation_receipt_v1",
        confirmationId: `sc-confirmation-${randomUUID()}`,
        roomId: envelope.roomId,
        matchBindingHash: envelope.matchBindingHash,
        previewContentHash: previewArtifact.previewSeal.contentHash,
        previewId: previewArtifact.previewId,
        seatKey: authority.seatKey,
        confirmingGrantId: authority.grantId,
        policy: "explicit_human_post_preview",
        expiresAtStateRevision: envelope.stateRevision,
      };
      return deepFreeze({
        ok: true,
        confirmation: { ...content, confirmationSeal: crypto.seal(content, "confirmation"), audit: { occurredAt: isoTime(input.occurredAt || now()) } },
      });
    } catch (error) {
      return rejectedFrom(error, "CONFIRMATION_INVALID");
    }
  }

  function validateConfirmation(confirmation, previewArtifact, envelope, authority) {
    if (!object(confirmation)
      || !crypto.verifySeal(confirmationSealedContent(confirmation), confirmation.confirmationSeal, "confirmation")
      || confirmation.previewContentHash !== previewArtifact.previewSeal.contentHash
      || confirmation.previewId !== previewArtifact.previewId
      || confirmation.matchBindingHash !== envelope.matchBindingHash
      || confirmation.expiresAtStateRevision !== envelope.stateRevision
      || confirmation.seatKey !== authority.seatKey) {
      throw new AuthorityError("CONFIRMATION_INVALID", "human confirmation does not bind this preview and state");
    }
    return confirmation;
  }

  function apply(input = {}) {
    try {
      const envelope = input.envelope;
      validateEnvelope(envelope);
      const expectedStateRevision = nonNegativeInteger(input.expectedStateRevision ?? input.expectedRevision, "expectedStateRevision");
      if (expectedStateRevision !== envelope.stateRevision) {
        throw new AuthorityError("REVISION_CONFLICT", "state revision compare-and-swap failed", {
          expectedStateRevision,
          observedStateRevision: envelope.stateRevision,
          observedStateHash: envelope.stateHash,
        });
      }
      const authority = validateSeatAuthority(input.seatAuthority, envelope, "apply");
      if (authority.roleMode === "opponent" || authority.principalType === "model") {
        throw new AuthorityError("CAPABILITY_DENIED", "model-facing authority cannot apply");
      }
      const lease = validateControlLease(input.controlLease, envelope, authority);
      const previewArtifact = validatePreview(input.preview, envelope);
      if (previewArtifact.core.seatKey !== authority.seatKey) throw new AuthorityError("CAPABILITY_DENIED", "applying authority controls another seat");
      const idempotencyKey = nonEmpty(input.idempotencyKey, "idempotencyKey");
      let confirmationProofHash = null;
      if (previewArtifact.core.confirmationPolicy.requiresExplicitHuman) {
        const confirmation = validateConfirmation(input.confirmation, previewArtifact, envelope, authority);
        confirmationProofHash = hashStarcraftTmgContract(confirmationSealedContent(confirmation));
      }
      const calculated = calculatePreviewCore(envelope, authority.seatKey, { proposal: previewArtifact.core.proposal });
      const recalculatedCore = clone(calculated.core);
      recalculatedCore.confirmationPolicy = clone(previewArtifact.core.confirmationPolicy);
      if (hashStarcraftTmgContract(recalculatedCore) !== hashStarcraftTmgContract(previewArtifact.core)) {
        throw new AuthorityError("LEGAL_SPACE_STALE", "preview no longer reproduces the same authoritative result");
      }
      const unsignedReceipt = {
        schemaVersion: `${STARCRAFT_TMG_AUTHORITY_VERSION}.receipt`,
        gameId: envelope.gameId,
        roomId: envelope.roomId,
        matchBindingHash: envelope.matchBindingHash,
        previousJournalHash: envelope.journalHeadHash,
        privateJournalSequence: envelope.privateJournalSequence + 1,
        preStateRevision: envelope.stateRevision,
        postStateRevision: envelope.stateRevision + 1,
        preRevision: envelope.stateRevision,
        postRevision: envelope.stateRevision + 1,
        preStateHash: envelope.stateHash,
        postStateHash: hashStarcraftTmgContract(calculated.nextState),
        legalSpaceHash: previewArtifact.core.legalSpaceHash,
        proposal: clone(previewArtifact.core.proposal),
        proposalHash: previewArtifact.core.proposalHash,
        action: clone(previewArtifact.core.action),
        previewContentHash: previewArtifact.previewSeal.contentHash,
        confirmationPolicy: clone(previewArtifact.core.confirmationPolicy),
        confirmationProofHash,
        applyingSeatKey: authority.seatKey,
        applyingGrantId: authority.grantId,
        controlLeaseId: lease.leaseId,
        leaseFence: lease.leaseFence,
        idempotencyKeyHash: hashStarcraftTmgContract({ roomId: envelope.roomId, idempotencyKey }),
        preGameClock: clone(envelope.state.gameClock),
        postGameClock: clone(calculated.nextState.gameClock),
        chanceReveal: clone(calculated.chanceRevealBundle),
        eventsHash: hashStarcraftTmgContract(calculated.events),
        events: clone(calculated.events),
        manualAdjudication: false,
        eligibleForTraining: false,
        trainingTruth: false,
      };
      const refereeSignature = crypto.sign(unsignedReceipt, "accepted_receipt");
      const journalHash = hashStarcraftTmgContract({ receipt: unsignedReceipt, refereeSignature });
      const receipt = deepFreeze({ ...unsignedReceipt, refereeSignature, journalHash, audit: { occurredAt: isoTime(input.occurredAt || now()) } });
      const nextEnvelope = createEnvelope({
        gameId: envelope.gameId,
        roomId: envelope.roomId,
        matchBinding: envelope.matchBinding,
        stateRevision: receipt.postStateRevision,
        privateJournalSequence: receipt.privateJournalSequence,
        journalHeadHash: receipt.journalHash,
        state: calculated.nextState,
      });
      return deepFreeze({ ok: true, envelope: nextEnvelope, receipt });
    } catch (error) {
      return rejectedFrom(error);
    }
  }

  function verifyReceipt(receipt, envelope) {
    if (!object(receipt) || receipt.schemaVersion !== `${STARCRAFT_TMG_AUTHORITY_VERSION}.receipt`) {
      throw new AuthorityError("JOURNAL_CHAIN_INVALID", "receipt schema is invalid");
    }
    const core = receiptCore(receipt);
    if (!crypto.verify(core, receipt.refereeSignature, "accepted_receipt")
      || receipt.journalHash !== hashStarcraftTmgContract({ receipt: core, refereeSignature: receipt.refereeSignature })) {
      throw new AuthorityError("SIGNATURE_INVALID", "accepted receipt signature is invalid");
    }
    if (receipt.previousJournalHash !== envelope.journalHeadHash
      || receipt.preStateRevision !== envelope.stateRevision
      || receipt.preStateHash !== envelope.stateHash
      || receipt.matchBindingHash !== envelope.matchBindingHash) {
      throw new AuthorityError("JOURNAL_CHAIN_INVALID", "receipt does not continue the current envelope");
    }
    return core;
  }

  function createCheckpoint(envelope) {
    try {
      const state = validateEnvelope(envelope);
      const core = {
        schemaVersion: `${STARCRAFT_TMG_AUTHORITY_VERSION}.checkpoint`,
        gameId: envelope.gameId,
        roomId: envelope.roomId,
        matchBindingHash: envelope.matchBindingHash,
        stateRevision: envelope.stateRevision,
        privateJournalSequence: envelope.privateJournalSequence,
        stateHash: envelope.stateHash,
        journalHeadHash: envelope.journalHeadHash,
        state: clone(state),
        trainingTruth: false,
      };
      const refereeSignature = crypto.sign(core, "checkpoint");
      return deepFreeze({
        ok: true,
        checkpoint: {
          ...core,
          refereeSignature,
          checkpointHash: hashStarcraftTmgContract({ checkpoint: core, refereeSignature }),
        },
      });
    } catch (error) {
      return rejectedFrom(error, "SIGNATURE_INVALID");
    }
  }

  function verifyCheckpoint(checkpoint, matchBinding) {
    try {
      validateMatchBinding(matchBinding);
      if (!object(checkpoint) || checkpoint.schemaVersion !== `${STARCRAFT_TMG_AUTHORITY_VERSION}.checkpoint`) {
        throw new AuthorityError("SIGNATURE_INVALID", "checkpoint schema is invalid");
      }
      const { checkpointHash, refereeSignature, ...core } = checkpoint;
      if (core.matchBindingHash !== matchBinding.bindingHash
        || !crypto.verify(core, refereeSignature, "checkpoint")
        || checkpointHash !== hashStarcraftTmgContract({ checkpoint: core, refereeSignature })
        || hashStarcraftTmgContract(normalizeAuthorityState(core.state, core.stateRevision)) !== core.stateHash) {
        throw new AuthorityError("SIGNATURE_INVALID", "checkpoint signature or state identity is invalid");
      }
      return deepFreeze({ ok: true, checkpointHash, stateRevision: core.stateRevision, privateJournalSequence: core.privateJournalSequence });
    } catch (error) {
      return rejectedFrom(error, "SIGNATURE_INVALID");
    }
  }

  function attestVerificationReport(report) {
    const core = {
      schemaVersion: `${STARCRAFT_TMG_AUTHORITY_VERSION}.verification-report`,
      report: clone(report),
      trainingTruth: false,
    };
    const refereeSignature = crypto.sign(core, "verification_report");
    return deepFreeze({
      ...core,
      refereeSignature,
      verificationHash: hashStarcraftTmgContract({ verification: core, refereeSignature }),
    });
  }

  function replay(input = {}) {
    try {
      const initialEnvelope = input.initialEnvelope;
      validateEnvelope(initialEnvelope);
      const dependencies = verifyFrozenDependencies(initialEnvelope.matchBinding);
      if (!dependencies.ok) return dependencies;
      let envelope = initialEnvelope;
      let checkpointStateRevision = 0;
      if (input.checkpoint) {
        const checkpointVerification = verifyCheckpoint(input.checkpoint, initialEnvelope.matchBinding);
        if (!checkpointVerification.ok) return checkpointVerification;
        checkpointStateRevision = input.checkpoint.stateRevision;
        envelope = createEnvelope({
          gameId: initialEnvelope.gameId,
          roomId: initialEnvelope.roomId,
          matchBinding: initialEnvelope.matchBinding,
          stateRevision: input.checkpoint.stateRevision,
          privateJournalSequence: input.checkpoint.privateJournalSequence,
          journalHeadHash: input.checkpoint.journalHeadHash,
          state: input.checkpoint.state,
        });
      }
      const journal = Array.isArray(input.journal) ? input.journal : [];
      for (const [index, receipt] of journal.entries()) {
        const core = verifyReceipt(receipt, envelope);
        const resolved = resolveProposal(envelope, core.applyingSeatKey, { proposal: core.proposal });
        const proposalHash = hashStarcraftTmgContract(resolved.canonicalProposal);
        const chanceReveals = signedChanceRevealsForReplay(
          envelope,
          resolved.action,
          proposalHash,
          core.chanceReveal,
        );
        const transition = deterministicTransition(envelope, { ...resolved, chanceReveals });
        if (resolved.space.legalSpaceHash !== core.legalSpaceHash
          || proposalHash !== core.proposalHash
          || hashStarcraftTmgContract(transition.nextState) !== core.postStateHash
          || hashStarcraftTmgContract(transition.events) !== core.eventsHash
          || canonicalStarcraftTmgJson(transition.events) !== canonicalStarcraftTmgJson(core.events)) {
          throw new AuthorityError("REPLAY_DIVERGED", "receipt did not replay to the same result", { index });
        }
        envelope = createEnvelope({
          gameId: envelope.gameId,
          roomId: envelope.roomId,
          matchBinding: envelope.matchBinding,
          stateRevision: core.postStateRevision,
          privateJournalSequence: core.privateJournalSequence,
          journalHeadHash: receipt.journalHash,
          state: transition.nextState,
        });
      }
      return deepFreeze({
        ok: true,
        schemaVersion: `${STARCRAFT_TMG_AUTHORITY_VERSION}.replay`,
        appliedCount: journal.length,
        checkpointStateRevision,
        dependencyVerification: dependencies,
        envelope,
        silentCompatibilityUsed: false,
        trainingTruth: false,
      });
    } catch (error) {
      return rejectedFrom(error, "REPLAY_DIVERGED");
    }
  }

  function health() {
    return deepFreeze({
      schemaVersion: `${STARCRAFT_TMG_AUTHORITY_VERSION}.health`,
      healthy: true,
      referee: clone(crypto.descriptor),
      registeredDependencyCount: dependencyRegistry.size,
      manualAdjudicationEnabled: false,
      rulesRuntimeMode: rulesRuntimeBinding.mode,
      rulesRuntime: clone(runtimeDescriptor),
      rulesRuntimeBinding: clone(rulesRuntimeBinding),
      legacyCompatibilityUsed: rulesRuntimeBinding.legacyCompatibilityUsed,
      developmentSubsetEnabled,
      productionReady: Boolean(
        crypto.descriptor.productionReady && rulesRuntimeBinding.productionRoomEligible
      ),
      trainingTruth: false,
    });
  }

  return Object.freeze({
    createMatchBinding,
    createEnvelope,
    registerDependency,
    verifyFrozenDependencies,
    readHistoricalRules,
    issueSeatAuthority,
    issueControlLease,
    legalSpace,
    preview,
    confirmPreview,
    apply,
    createChanceTicket,
    revealChanceTicket,
    createCheckpoint,
    verifyCheckpoint,
    attestVerificationReport,
    replay,
    health,
  });
}
