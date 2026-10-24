import { hashStarcraftTmgContract } from
  "../authoritative-engine/transition-v1.mjs";
import { evaluateOfficialPhysicalFootprintRelationV1 } from
  "../rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs";
import {
  assertStarcraftTmgProviderTransportProgressV1,
  STARCRAFT_TMG_PROVIDER_INPUT_HEADROOM_UNITS,
  STARCRAFT_TMG_PROVIDER_INPUT_RESERVATION_LIMIT_UNITS,
} from
  "../secure-provider-runtime/provider-egress-contract-v1.mjs";
import { priceStarcraftTmgDeepSeekV4FlashUsageV1 } from
  "../secure-provider-runtime/provider-pricing-v1.mjs";
import { priceStarcraftTmgDeepSeekCurrentUsageV2 } from
  "../secure-provider-runtime/provider-pricing-v2.mjs";
import { normalizeProviderJsonDocumentV1 } from
  "../secure-provider-runtime/provider-response-outcome-v1.mjs";
import { STARCRAFT_TMG_LIVE_OUTPUT_CAPACITY_POLICY_VERSION,
  planStarcraftTmgOutputCapacityRecoveryV1,
  effectiveStarcraftTmgSemanticCorrectionsV1 } from
  "./live-output-capacity-policy-v1.mjs";
import {
  STARCRAFT_TMG_FORMATION_OBJECTIVE_KINDS,
  STARCRAFT_TMG_FORMATION_SOLVER_TOOL_NAME,
  STARCRAFT_TMG_LEGAL_FORMATION_SEARCH_VERSION,
  projectStarcraftTmgFormationPaymentsV1,
} from "./legal-formation-search-v1.mjs";
import { isStarcraftTmgAssetPlacementDomainV1 as isAssetPlacementDomain } from
  "./legal-asset-placement-search-v1.mjs";
import { STARCRAFT_TMG_PARENT_CONTACT_SEARCH_RECOVERY_VERSION,
  planStarcraftTmgParentContactSearchRecoveryV1,
  applyStarcraftTmgParentContactSearchRecoveryV1 } from
  "./parent-contact-search-source-recovery-v1.mjs";
import { createStarcraftTmgNativeSpatialQueryToolV1 } from
  "./spatial-action-query-runtime-v1.mjs";
import { STARCRAFT_TMG_INDEPENDENT_READONLY_QUERY_KINDS_V1 } from
  "./readonly-query-kinds-v1.mjs";
import { STARCRAFT_TMG_SPATIAL_QUERY_KINDS_V1 } from "./spatial-query-contracts-v1.mjs";
import { OFFICIAL_SELECTED_ROSTER_RANGED_PARAMETER_KIND } from
  "../product-composition/official-selected-roster-ranged-action-runtime-v1.mjs";
import { spatialQueryReceiptRejectionV1 } from
  "./spatial-query-receipt-contract-v1.mjs";
import { deduplicateStarcraftTmgSpatialPromptReceiptsV1,
  encodeStarcraftTmgGeometryTableV1,
  projectStarcraftTmgIncomingFireEstimateForPromptV1,
  shareStarcraftTmgFormationFireFactsForPromptV1,
  EXACT_EVIDENCE_RECORD_ROWS_MEANING,
  projectStarcraftTmgTerrainFactsForPromptV1 } from
  "./spatial-query-prompt-projection-v1.mjs";
import { encodeStarcraftTmgGeometryColumnReuseV2 } from
  "./exact-geometry-column-reuse-v2.mjs";
import { planStarcraftTmgPromptRepairRecoveryV1,
  applyStarcraftTmgPromptRepairRecoveryV1 } from
  "./live-prompt-repair-recovery-v1.mjs";
import {
  compileStarcraftTmgActionParameterContractV1,
  materializeStarcraftTmgActionParameterOptionV1,
  planStarcraftTmgParameterFailureRecoveryV1,
  applyStarcraftTmgParameterFailureRecoveryV1,
  planStarcraftTmgLegacyParameterReplanV1,
  applyStarcraftTmgLegacyParameterReplanV1,
} from "./action-parameter-contract-v1.mjs";

export const STARCRAFT_TMG_LIVE_FLASH_DECISION_PORT_VERSION =
  "starcraft_tmg_live_flash_decision_port_v1";

const HASH = /^[a-f0-9]{64}$/u;
const MODEL = /^[A-Za-z0-9._:/-]{1,240}$/u;
const SENSITIVE_VALUE =
  /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}|\b(?:sk|jsk)-[A-Za-z0-9_-]{12,}|(?:api[_-]?key|authorization)\s*[:=]\s*[^\s,;}]{6,}/iu;
const QUERY_CHANNEL_NAMES = ["query_requests", "queryRequests", "queries"];
const NATIVE_QUERY_TOOL_NAME = "query_spatial_rules";
const NATIVE_SKILL_TOOL_NAME = "retrieve_strategy_skill";
const NATIVE_MEMORY_TOOL_NAME = "retrieve_match_memory";
const INDEPENDENT_READONLY_QUERY_KINDS = new Set(
  STARCRAFT_TMG_INDEPENDENT_READONLY_QUERY_KINDS_V1,
);
const NATIVE_PLANNING_SUBMIT_TOOL_NAME = "submit_planning";
const NATIVE_DECISION_SUBMIT_TOOL_NAME = "submit_decision";
const PROMPT_POLICY_VERSION =
  "starcraft_tmg_planner_action_spatial_intent_solver_v55_resource_correction_facts";
const JSON_CHANNEL_PROMPT_POLICY_VERSION =
  "starcraft_tmg_planner_action_spatial_intent_solver_v56_json_resource_correction_facts";
const PROVIDER_INTERACTION_MODES = new Set([
  "native_tools", "json_channels_v1",
]);
const ACTION_SHAPE_NORMALIZATION_VERSION =
  "starcraft_tmg_live_action_shape_normalization_v67";
const PLANNER_SHAPE_NORMALIZATION_VERSION =
  "starcraft_tmg_live_planner_shape_normalization_v40";
export const STARCRAFT_TMG_MAX_SEMANTIC_CORRECTION_ROUNDS_PER_CHOICE = 3;
const NATIVE_QUERY_KINDS = STARCRAFT_TMG_SPATIAL_QUERY_KINDS_V1;
const HOST_DEFERRED_QUERY_KINDS = new Set([
  STARCRAFT_TMG_FORMATION_SOLVER_TOOL_NAME,
  "legal_formation_options",
  "legal_asset_placement_options",
  "instantiate_parameterized_action",
]);
const PLANNING_POST_SELECTION_QUERY_KINDS = new Set([
  "legal_full_path_movement",
  "coherency_after_candidate_placement",
]);
const PHASE_CONTROL_ACTIONS = new Set(["pass", "choose_first_actor"]);
const FORMATION_ACTION_TYPES = new Set([
  "deploy", "move", "run", "disengage", "resolve_charge",
]);
const FORMATION_QUERY_KINDS = new Set([
  STARCRAFT_TMG_FORMATION_SOLVER_TOOL_NAME,
  "legal_formation_options",
]);
const FINAL_STATUSES = new Set(["completed", "closed"]);
const SELECTED_ACTION_EFFECT_CONTRACTS = Object.freeze({
  creep_token_place: Object.freeze({
    schema: "starcraft_tmg_selected_action_effect_contract_v1",
    effectKind: "creep_token_place",
    placedAssetKind: "creep_tumor",
    immediateEffect: "place a Creep Tumor token from a legal Creep source",
    delayedEffect: null,
  }),
  detection_indicator: Object.freeze({
    schema: "starcraft_tmg_selected_action_effect_contract_v1",
    effectKind: "detection_indicator",
    placedAssetKind: "faction_indicator",
    immediateEffect:
      "place a Faction Indicator whose detection aura removes HIDDEN within range",
    delayedEffect: null,
  }),
  force_field_place: Object.freeze({
    schema: "starcraft_tmg_selected_action_effect_contract_v1",
    effectKind: "force_field_place",
    placedAssetKind: "force_field",
    immediateEffect: "place a Force Field token in legal unoccupied space",
    delayedEffect: null,
  }),
  reserve_deploy_indicator: Object.freeze({
    schema: "starcraft_tmg_selected_action_effect_contract_v1",
    effectKind: "reserve_deploy_indicator",
    placedAssetKind: "faction_indicator",
    immediateEffect:
      "place a Faction Indicator more than 10 inches from every Enemy model",
    delayedEffect:
      "at End of Round, may Deploy one Ground Unit from Reserves base-to-base with the indicator",
  }),
  shade_token_place: Object.freeze({
    schema: "starcraft_tmg_selected_action_effect_contract_v1",
    effectKind: "shade_token_place",
    placedAssetKind: "shade",
    immediateEffect: "place a Shade token wholly within the Rules-owned range",
    delayedEffect: "resolve the Shade displacement at End of Round",
  }),
});
const SELECTED_ACTION_EFFECT_CLAIM_PATTERNS = Object.freeze({
  creep_token_place:
    /\bcreep\s+(?:tumou?r|token)\b|菌毯(?:肿瘤|标记)/iu,
  detection_indicator:
    /\bdetection\s+(?:indicator|aura)\b|\bremove\s+hidden\b|\blose\s+hidden\b|侦测(?:指示物|光环)|失去隐藏/iu,
  force_field_place:
    /\bforce\s+field\s+(?:token|barrier)\b|力场(?:标记|屏障)/iu,
  reserve_deploy_indicator:
    /\breserve[- ]deploy\s+(?:beacon|indicator)\b|\bfaction\s+indicator\b|预备队部署(?:信标|指示物)|势力指示物/iu,
  shade_token_place:
    /\bshade\s+token\b|\bshade\s+displacement\b|暗影(?:标记|位移)/iu,
  omega_network:
    // Entry edges and Ground-reserve deployment are shared with Ventral
    // Sacs. Only distinctive assets/effects identify an Omega Network claim.
    /\bomega\s+worm\b|\bsource\s+of\s+creep\b|欧米伽虫道|虫道(?:底盘|入口边缘)/iu,
});

function effectClaimIsNegated(text, matchIndex) {
  const prefix = String(text || "").slice(Math.max(0, matchIndex - 96),
    matchIndex);
  const clause = prefix.slice(Math.max(
    prefix.lastIndexOf("."), prefix.lastIndexOf("!"), prefix.lastIndexOf("?"),
    prefix.lastIndexOf(";"), prefix.lastIndexOf(":"), prefix.lastIndexOf("。"),
    prefix.lastIndexOf("！"), prefix.lastIndexOf("？"), prefix.lastIndexOf("；"),
    prefix.lastIndexOf("：")) + 1);
  if (/\bnot\s+only\b/iu.test(clause)) return false;
  return /(?:\b(?:not|never|without)\b|\bno\s+(?:longer\s+)?|\brather\s+than\b|\binstead\s+of\b)[^,，]{0,72}$/iu.test(clause)
    || /(?:不是|并非|不要|不应|没有|无|而非)[^，]{0,36}$/u.test(clause);
}

function effectReferenceIsSelectedResult(text, match, selectedIdentity) {
  // A noun in a risk/position comparison is not a declaration of the chosen
  // action's effect. Bind a result-producing predicate to its first named
  // effect instead of treating every asset mentioned in the paragraph as new.
  const before = text.slice(0, match.index);
  const prefix = before.split(/[.!?;:\n。！？；：]/u).at(-1);
  const predicates = [...prefix.matchAll(
    /\b(?:plac(?:e[sd]?|ing)|creat(?:e[sd]?|ing)|set(?:s|ting)?|summon(?:s|ed|ing)?|deploy(?:s|ed|ing)?|generat(?:e[sd]?|ing)|produc(?:e[sd]?|ing)|establish(?:es|ed|ing)?|provid(?:e[sd]?|ing)|us(?:e[sd]?|ing)|activat(?:e[sd]?|ing))\b|(?:放置|生成|召唤|部署|创建|产生|提供|使用|发动|激活)/giu)];
  const predicate = predicates.at(-1);
  if (predicate) {
    const bridge = prefix.slice(predicate.index + predicate[0].length);
    const alreadyNamedEffect = Object.values(SELECTED_ACTION_EFFECT_CLAIM_PATTERNS)
      .some((candidate) => candidate.test(bridge));
    const positionalReference = /\b(?:beside|near|behind|against|toward|towards|between|around|from|next\s+to|in\s+front\s+of)\b|(?:旁边|附近|后方|前方|朝向|针对|来自)/iu.test(bridge);
    // B r6: "establish ... while keeping Kerrigan and the Omega Worm safe"
    // preserves an existing asset rather than producing another one. A later
    // production predicate still binds its object ("keep ... and place ...").
    // Passive production below remains checked independently; never discard
    // the entire field merely because it also mentions protection.
    const preservationReference = /\b(?:keep(?:s|ing)?|protect(?:s|ed|ing)?|preserv(?:e[sd]?|ing)|defend(?:s|ed|ing)?|safeguard(?:s|ed|ing)?)\b|(?:保护|保留|保全|守护|维持)/iu.test(bridge);
    if (!alreadyNamedEffect && !positionalReference && !preservationReference) return true;
  }
  // B r6's calculation said "The Faction Indicator becomes ... Source of
  // Creep" without a placement verb. Bind an attributed property to the actual
  // selected asset, not every foreign asset mentioned in a position/risk fact.
  const asset = selectedIdentity?.effectContract?.placedAssetKind
    || selectedIdentity?.effectContract?.resultAssetKind;
  if (asset) {
    const words = String(asset).split("_").map(word =>
      word.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")).join("\\s+");
    const attribution = new RegExp(`\\b${words}\\b[^.!?;\\n。！？；]{0,320}?`
      + "\\b(?:is|are|becomes?|becoming|will\\s+be|would\\s+be)\\b(.*)$", "iu")
      .exec(prefix);
    if (attribution && !/\b(?:near|beside|behind|against|from|next\s+to|keep(?:s|ing)?|protect(?:s|ed|ing)?)\b/iu
      .test(attribution[1])) return true;
  }
  const after = text.slice(match.index + match[0].length);
  return /^\s+(?:(?:is|are|will\s+be|would\s+be|gets?)\s+(?:newly\s+)?(?:placed|created|summoned|deployed|generated|produced)\b)/iu.test(after)
    || /^\s*(?:被|将被)(?:放置|生成|召唤|部署|创建)/u.test(after);
}

function assertedEffectClaim(text, pattern, selectedIdentity) {
  const flags = pattern.flags.includes("g") ? pattern.flags
    : `${pattern.flags}g`;
  const matcher = new RegExp(pattern.source, flags);
  const value = String(text || "");
  for (const match of value.matchAll(matcher)) {
    if (!effectClaimIsNegated(value, match.index)
      && effectReferenceIsSelectedResult(value, match, selectedIdentity)) return true;
  }
  return false;
}
const DEFINITELY_NOT_SENT_FAILURES = new Set([
  "provider_dns_resolution_failed",
  "provider_request_contract_rejected",
  "provider_credential_invalid",
]);
const EXPLICIT_RETRY_CHOICE_STATUSES = new Set([
  "provider_failed_requires_explicit_retry",
  "provider_output_invalid",
  "provider_response_lost_requires_explicit_retry",
]);
const DECISION_STATE_FIELDS = Object.freeze([
  "round", "phase", "stage", "activeSideKey", "firstPlayerSideKey",
  "firstPassSideByPhase", "phaseFirstActorByRound", "players", "scores",
  "scoringResolvedThisPhase", "scoringCleanupProgress",
  "supplyDestroyedThisRound", "supplyLossLedger", "selectedMission",
  "mission", "officialMissionRuntimeState", "officialRoundSupplyState",
  "cardResources", "publicRosterDisclosureBySide",
  "armyResourceBudgetsBySide", "pendingAction",
  "pendingAbility", "pendingAttack", "pendingRangedAttackSequence",
  "activeAbilityUseHistory", "reactionUsage", "gameClock", "terminal",
  "terminalReason", "gameOver", "winner",
]);

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

function required(value, field, maximum = 500) {
  const normalized = String(value || "").trim();
  if (!normalized || normalized.length > maximum) {
    throw new TypeError(`${field} is invalid`);
  }
  return normalized;
}

function hash(value, field) {
  const normalized = required(value, field, 64).toLowerCase();
  if (!HASH.test(normalized)) throw new TypeError(`${field} is invalid`);
  return normalized;
}

function integer(value, field, minimum = 0, maximum = Number.MAX_SAFE_INTEGER) {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized)
    || normalized < minimum || normalized > maximum) {
    throw new TypeError(`${field} is invalid`);
  }
  return normalized;
}

function instant(value, field) {
  const normalized = new Date(value).toISOString();
  if (!Number.isFinite(Date.parse(normalized))) {
    throw new TypeError(`${field} is invalid`);
  }
  return normalized;
}

function seal(value, hashField) {
  const body = clone(value);
  return freeze({ ...body, [hashField]: hashStarcraftTmgContract(body) });
}

function verifySeal(value, hashField) {
  if (!object(value) || !HASH.test(String(value[hashField] || ""))) return false;
  const body = clone(value);
  const observed = body[hashField];
  delete body[hashField];
  return observed === hashStarcraftTmgContract(body);
}

function containsApiCredential(value, seen = new Set()) {
  if (typeof value === "string") return SENSITIVE_VALUE.test(value);
  if (!value || typeof value !== "object" || seen.has(value)) return false;
  seen.add(value);
  if (Array.isArray(value)) {
    return value.some((entry) => containsApiCredential(entry, seen));
  }
  return Object.entries(value).some(([key, child]) =>
    (/^(?:api.?key|authorization)$/iu.test(key)
      && child !== false && child !== null && child !== undefined && child !== "")
    || containsApiCredential(child, seen));
}

function scope(input = {}) {
  const body = {
    gameId: required(input.gameId || "starcraft-tmg", "scope.gameId", 80),
    roomId: required(input.roomId, "scope.roomId", 240),
    matchBindingHash: hash(input.matchBindingHash, "scope.matchBindingHash"),
    seatKey: required(input.seatKey, "scope.seatKey", 120),
  };
  if (body.gameId !== "starcraft-tmg") {
    throw new TypeError("scope.gameId must be starcraft-tmg");
  }
  return freeze({ ...body, scopeKey: hashStarcraftTmgContract(body) });
}

function ref(value, field) {
  if (!object(value)) throw new TypeError(`${field} is required`);
  return freeze({
    id: required(value.id, `${field}.id`, 200),
    version: required(value.version, `${field}.version`, 120),
    hash: hash(value.hash, `${field}.hash`),
  });
}

function profile(value, index) {
  if (!object(value)) throw new TypeError(`profileCandidates[${index}] is invalid`);
  const model = required(value.model, `profileCandidates[${index}].model`, 240);
  if (!MODEL.test(model)) {
    throw new TypeError(`profileCandidates[${index}].model is invalid`);
  }
  return freeze({
    preference: index === 0 ? "preferred" : "pre_game_fallback",
    providerId: required(value.providerId,
      `profileCandidates[${index}].providerId`, 160),
    model,
    profileRef: ref(value.profileRef, `profileCandidates[${index}].profileRef`),
    maxOutputUnits: integer(value.maxOutputUnits || 8_192,
      `profileCandidates[${index}].maxOutputUnits`, 256, 1_000_000),
  });
}

function strings(value, maximum = 32) {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => String(entry || "").trim())
    .filter(Boolean).slice(0, maximum);
}

function text(value, fallback, maximum = 8_000) {
  const normalized = String(value || "").trim() || fallback;
  return normalized.slice(0, maximum);
}

function currentAuthority(input, expectedScope) {
  const projection = input.roomProjection;
  const legal = input.legalSpace;
  const actionSpace = input.spatialActionSpace;
  if (!object(projection?.room) || !object(projection?.matchBinding)
    || projection.room.roomId !== expectedScope.roomId
    || projection.matchBinding.bindingHash !== expectedScope.matchBindingHash
    || projection.viewer?.seatKey !== expectedScope.seatKey
    || !object(legal) || legal.roomId !== expectedScope.roomId
    || legal.matchBindingHash !== expectedScope.matchBindingHash
    || legal.stateRevision !== projection.room.stateRevision
    || legal.stateHash !== projection.room.stateHash
    || !object(actionSpace)
    || actionSpace.authority?.stateRevision !== projection.room.stateRevision
    || actionSpace.authority?.stateHash !== projection.room.stateHash
    || actionSpace.authority?.legalSpaceHash !== legal.legalSpaceHash) {
    throw Object.assign(new TypeError(
      "decision inputs do not share one current player authority"), {
      code: "DECISION_AUTHORITY_BINDING_MISMATCH",
      severity: "High",
    });
  }
  return freeze({
    roomId: expectedScope.roomId,
    matchBindingHash: expectedScope.matchBindingHash,
    seatKey: expectedScope.seatKey,
    stateRevision: projection.room.stateRevision,
    stateHash: required(projection.room.stateHash, "room stateHash", 160),
    legalSpaceHash: required(legal.legalSpaceHash, "legalSpaceHash", 160),
    spatialObservationHash: input.spatialObservation?.observationHash || null,
    spatialActionSpaceHash: required(actionSpace.actionSpaceHash,
      "spatialActionSpaceHash", 160),
  });
}

function actionIndex(actionSpace) {
  const finite = (actionSpace.finiteActions || []).map((entry) => ({
    kind: "finite",
    id: String(entry.candidateId),
    proposal: { kind: "finite", actionKey: String(entry.candidateId) },
    action: clone(entry.action || null),
  }));
  const domains = (actionSpace.parameterDomains || []).map((entry) => ({
    kind: "parameterized",
    id: String(entry.domainId),
    proposal: null,
    action: clone(entry),
  }));
  return freeze([...finite, ...domains]);
}

export function inspectStarcraftTmgCertainFailedChargeCandidatesV1(input = {}) {
  return freeze(actionIndex(input.spatialActionSpace || {})
    .filter((entry) => sourceActionDomain(entry.action)?.actionType === "charge")
    .map((entry) => inspectStarcraftTmgChargeReachabilityV1({
      spatialActionSpace: input.spatialActionSpace,
      candidateId: entry.id,
      queryReceipts: input.queryReceipts || [],
      spatialObservation: input.spatialObservation,
    }))
    .filter((entry) => entry.status === "exact"
      && entry.certainDistanceShortfall === true));
}

function decisionInputForChoice(input, choice) {
  const certainFailedCharges = inspectStarcraftTmgCertainFailedChargeCandidatesV1({
    spatialActionSpace: input.spatialActionSpace,
    spatialObservation: input.spatialObservation,
    queryReceipts: choice?.queryReceipts || [],
  });
  const unavailable = new Set([
    ...(choice?.unavailableCandidateIds || []).map(String),
    ...certainFailedCharges.map((entry) => entry.candidateId),
  ]);
  if (unavailable.size === 0) return input;
  const spatialActionSpace = {
    ...clone(input.spatialActionSpace),
    finiteActions: (input.spatialActionSpace?.finiteActions || []).filter((entry) =>
      !unavailable.has(String(entry.candidateId))),
    parameterDomains: (input.spatialActionSpace?.parameterDomains || []).filter(
      (entry) => !unavailable.has(String(entry.domainId))),
  };
  const legalSpace = {
    ...clone(input.legalSpace),
    finiteActions: (input.legalSpace?.finiteActions || []).filter((entry) =>
      !unavailable.has(String(entry.candidateId))),
    parameterDomains: (input.legalSpace?.parameterDomains || []).filter((entry) =>
      !unavailable.has(String(entry.domainId))),
  };
  return { ...input, spatialActionSpace, legalSpace,
    hostCandidateExclusions: certainFailedCharges.map((entry) => ({
      candidateId: entry.candidateId,
      pieceId: entry.pieceId,
      reason: "CERTAIN_CHARGE_DISTANCE_SHORTFALL_FOR_EVERY_TARGET",
      maximumDistanceMilliInches: entry.maximumDistanceMilliInches,
      targetDistances: clone(entry.targetDistances),
      source: entry.evidenceKind,
      rulesLegalSpaceUnchanged: true,
      trainingTruth: false,
    })) };
}

export function planStarcraftTmgUnavailableFormationRecoveryV1(choice,
  options = {}) {
  const stoppedDraftApproved = choice?.status === "provider_output_invalid"
    && options.retryApproved === true;
  if ((!stoppedDraftApproved && choice?.status !== "generating")
    || choice.stage !== "planning"
    || choice.plannerResult || choice.actionIndex?.length !== 1
    || choice.unavailableCandidateIds?.length !== 1) return null;
  const authority = options.authority || choice.authority;
  if (["roomId", "matchBindingHash", "seatKey", "stateRevision",
    "stateHash", "legalSpaceHash"].some(key =>
    !Object.hasOwn(choice.authority || {}, key)
      || authority?.[key] !== choice.authority[key])) return null;
  const selected = choice.actionIndex[0];
  const candidateId = String(selected?.id || "");
  if (selected?.kind !== "parameterized"
    || !isFormationPlacementDomain(selected.action)
    || choice.unavailableCandidateIds[0] !== candidateId) return null;
  // Local paid-draft replay is protocol independent and bounded per recovery
  // implementation. An old unknown search is not a permanent Rules verdict.
  const warning = `LOCAL_FORMATION_SEARCH_RECOVERY:v2-json-stopped-draft:${
    STARCRAFT_TMG_LEGAL_FORMATION_SEARCH_VERSION}:${candidateId}`;
  if (choice.warnings?.includes(warning)) return null;
  const attemptKey = [...(choice.attemptKeys || [])].reverse().find(key => {
    const attempt = choice.attempts?.[key];
    if (attempt?.stage !== "planning" || attempt.status !== "completed"
      || !choice.processedAttemptKeys?.includes(key)) return false;
    const planning = responseParts(attempt.safeOutput).planning;
    if (planning?.recommendedCandidateId !== candidateId) return false;
    const intent = object(planning.formationSearchRequest)
      ? planning.formationSearchRequest
      : planning.formationSearchRequested === true ? {
        tacticalPurpose: planning.formationTacticalPurpose,
        formationObjectives: planning.formationObjectives,
      } : null;
    return isStarcraftTmgFormationIntentReadyV1(selected, {
      formationSearchRequest: intent,
    });
  });
  if (!attemptKey) return null;
  const failed = [...(choice.queryReceipts || [])].reverse().find((entry) =>
    FORMATION_QUERY_KINDS.has(entry.queryKind)
      && entry.status === "unknown"
      && entry.reason === "RULES_QUERY_NO_LEGAL_FORMATION_OPTION"
      && entry.authority?.roomId === choice.authority?.roomId
      && entry.authority?.matchBindingHash
        === choice.authority?.matchBindingHash
      && entry.authority?.stateRevision
        === choice.authority?.stateRevision
      && entry.authority?.stateHash === choice.authority?.stateHash
      && entry.authority?.legalSpaceHash
        === choice.authority?.legalSpaceHash);
  if (!failed) return null;
  return freeze({ candidateId, attemptKey,
    solverVersion: STARCRAFT_TMG_LEGAL_FORMATION_SEARCH_VERSION,
    oldReceiptReason: failed.reason, warning,
    providerRetryAllowed: false, roomMutationAllowed: false });
}

function selectedActionIdentity(actionSpace, candidateId) {
  const selected = actionIndex(actionSpace).find((entry) =>
    entry.id === String(candidateId || ""));
  if (!selected) return null;
  const action = sourceActionDomain(selected.action);
  return freeze({
    candidateId: selected.id,
    kind: selected.kind,
    actionType: String(action?.actionType || "unknown"),
    pieceId: action?.pieceId || null,
    abilityName: action?.abilityName || null,
    effectKind: action?.effectKind || null,
    effectContract: clone(action?.effectContract
      || SELECTED_ACTION_EFFECT_CONTRACTS[action?.effectKind] || null),
    sourceInstanceId: action?.sourceInstanceId || null,
    rulesAuthority: true,
    trainingTruth: false,
  });
}

function claimedActionEffects(fragments, selectedIdentity) {
  if (!selectedIdentity?.effectContract) return [];
  const expectedEffectKind = selectedIdentity.effectKind;
  return fragments.flatMap((entry) => Object.entries(
    SELECTED_ACTION_EFFECT_CLAIM_PATTERNS).flatMap(([claimedEffectKind, pattern]) => (
    claimedEffectKind !== expectedEffectKind
      && assertedEffectClaim(entry.text, pattern, selectedIdentity) ? [{
      field: entry.field,
      text: entry.text,
      claimedEffectKind,
      expectedEffectKind,
    }] : []
  )));
}

function parsedPublicPlanSummary(value) {
  if (object(value)) return value;
  if (typeof value !== "string" || !value.trim()) return {};
  try {
    const parsed = JSON.parse(value);
    return object(parsed) ? parsed : { summary: value };
  } catch {
    return { summary: value };
  }
}

function selectedActionIdentityClaimFragments(value, stage, candidateId) {
  const input = object(value) ? value : {};
  const intent = object(input.intent) ? input.intent : {};
  const assessment = object(input.assessment) ? input.assessment : {};
  const plan = object(input.planRevision) ? input.planRevision
    : object(input.plan) ? input.plan : {};
  const summary = stage === "planning"
    ? parsedPublicPlanSummary(input.publicPlanSummary)
    : object(input.publicDecisionSummary) ? input.publicDecisionSummary : {};
  const selection = object(input.assetPlacementSelection)
    ? input.assetPlacementSelection : {};
  const fields = stage === "planning" ? [
    ["assessment.currentGoal", assessment.currentGoal],
    ["plan.currentGoal", plan.currentGoal],
    ["publicPlanSummary.plan", summary.plan],
    ["publicPlanSummary.currentGoal", summary.currentGoal],
    ["publicPlanSummary.purpose", summary.purpose],
    ["publicPlanSummary.summary", summary.summary],
    ...(Array.isArray(summary.calculations) ? summary.calculations.map((text, index) =>
      [`publicPlanSummary.calculations.${index}`, text]) : []),
    ["assetPlacementSearchRequest.tacticalPurpose",
      input.assetPlacementSearchRequest?.tacticalPurpose],
    // A current, explicitly selected comparison is part of the public
    // rationale too. Do not require the same ability name in a second prose
    // field, and never bind it from another candidate's comparison.
    ...(Array.isArray(input.candidateComparisons)
      ? input.candidateComparisons.flatMap((comparison, index) => (
        String(comparison?.candidateId || "") === candidateId
          ? [[`candidateComparisons.${index}.evaluation`,
            comparison.evaluation || comparison.reason]] : [])) : []),
  ] : [
    ["selectedReason", input.selectedReason],
    ["intent.currentGoal", intent.currentGoal],
    ["intent.purpose", intent.purpose],
    ["intent.expectedOwnOutcome", intent.expectedOwnOutcome],
    ...(Array.isArray(intent.expectedEffects) ? intent.expectedEffects.map((text, index) =>
      [`intent.expectedEffects.${index}`, text]) : []),
    ["publicDecisionSummary.plan", summary.plan],
    ["publicDecisionSummary.purpose", summary.purpose],
    ["assetPlacementSelection.publicReason", selection.publicReason],
  ];
  return fields.map(([field, fieldValue]) => ({
    field,
    text: String(fieldValue || "").trim(),
  })).filter((entry) => entry.text);
}

function abilityNameMentions(fragment, abilityNames) {
  const normalized = String(fragment || "").normalize("NFC").toLowerCase();
  return abilityNames.flatMap((abilityName) => {
    const name = abilityName.normalize("NFC").toLowerCase();
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
    // Whole Latin words, not substrings: Leap is not Leaping Strike.
    // Chinese surrounding prose need not insert whitespace around a name.
    const pattern = new RegExp(
      `(?<![\\p{Script=Latin}\\p{N}_])${escaped}(?![\\p{Script=Latin}\\p{N}_])`,
      "gu");
    return [...normalized.matchAll(pattern)].map((match) => ({
      abilityName, index: match.index, length: match[0].length,
    }));
  }).sort((left, right) => left.index - right.index
    || right.length - left.length
    || left.abilityName.localeCompare(right.abilityName));
}

function claimedAbilityAfterActionVerb(fragment, abilityNames) {
  const normalized = String(fragment || "").normalize("NFC").toLowerCase();
  const actionVerb = /\b(?:use|activate|select|perform|resolve|trigger|execute|choose|place)\b|(?:使用|选择|发动|激活|执行|施放|放置)/giu;
  for (const match of normalized.matchAll(actionVerb)) {
    const prefix = normalized.slice(Math.max(0, match.index - 28), match.index);
    if (/(?:do\s+not|don't|never|avoid|reject|instead\s+of)\s*$/iu.test(prefix)
      || /(?:不(?:要|再)?|勿|避免|拒绝|而非|不是)\s*$/u.test(prefix)) {
      continue;
    }
    const suffix = normalized.slice(match.index + match[0].length,
      match.index + match[0].length + 180);
    const matches = abilityNameMentions(suffix, abilityNames);
    if (matches.length > 0) return matches[0].abilityName;
  }
  return null;
}

export function inspectStarcraftTmgSelectedActionIdentityClaimsV1(input = {}) {
  const candidateId = String(input.candidateId || "");
  const selectedIdentity = selectedActionIdentity(
    input.spatialActionSpace || {}, candidateId);
  if (!selectedIdentity) {
    return freeze({ status: "missing_candidate", selectedIdentity: null,
      selectedIdentityMentioned: false, checkedClaims: [], contradictions: [] });
  }
  const fragments = selectedActionIdentityClaimFragments(input.value,
    input.stage === "planning" ? "planning" : "action", candidateId);
  const abilityNames = [...new Set((input.spatialActionSpace?.parameterDomains || [])
    .filter((entry) => entry.actionType === selectedIdentity.actionType
      && String(entry.abilityName || "").trim())
    .map((entry) => String(entry.abilityName).trim()))];
  if (!selectedIdentity.abilityName || abilityNames.length < 1) {
    return freeze({ status: "not_applicable", selectedIdentity,
      selectedIdentityMentioned: true, checkedClaims: fragments,
      contradictions: [] });
  }
  const selectedIdentityMentioned = fragments.some((entry) => {
    const mentions = abilityNameMentions(entry.text, abilityNames);
    return mentions.some((mention, index) => (
      mention.abilityName === selectedIdentity.abilityName
        && (index === 0 || mentions[index - 1].index !== mention.index)));
  });
  const contradictions = fragments.flatMap((entry) => {
    const claimedAbilityName = claimedAbilityAfterActionVerb(
      entry.text, abilityNames);
    return claimedAbilityName
      && claimedAbilityName !== selectedIdentity.abilityName ? [{
        field: entry.field,
        text: entry.text,
        claimedAbilityName,
        expectedAbilityName: selectedIdentity.abilityName,
      }] : [];
  });
  contradictions.push(...claimedActionEffects(fragments, selectedIdentity));
  return freeze({
    // The selected current Rules candidate already binds action identity.
    // Literal title repetition in a particular prose field is observability,
    // not legality: A r12 said "deploy ... through the Omega Worm" and selected
    // the exact Omega Network candidate, but this wording gate rejected all
    // three paid drafts. Explicit contradictory names/effects still reject.
    status: contradictions.length > 0 ? "contradicted" : "consistent",
    identityBinding: "rules_candidate_id",
    selectedIdentity,
    selectedIdentityMentioned,
    checkedClaims: fragments,
    contradictions,
    correctionIssues: contradictions.map(contradiction => ({
      code: input.stage === "planning"
        ? "PLANNER_SELECTED_ACTION_IDENTITY_CONTRADICTED"
        : "ACTION_SELECTED_ACTION_IDENTITY_CONTRADICTED",
      field: contradiction.field,
      claimText: contradiction.text,
      ...(contradiction.claimedEffectKind ? {
        claimedEffectKind: contradiction.claimedEffectKind,
        expectedEffectKind: contradiction.expectedEffectKind,
      } : {
        claimedAbilityName: contradiction.claimedAbilityName,
        expectedAbilityName: contradiction.expectedAbilityName,
      }),
      selectedActionIdentity: clone(selectedIdentity),
      correctionScope: "selected_action_factual_claims",
      repairInstruction: "Replace the contradictory claim using this selected candidate's effectContract. Reconcile every occurrence of the selected effect across the full submitted object; a corrected expectedEffects array does not repair a conflicting outcome or calculation. Keep unrelated supported facts and strategic choices model-owned.",
    })),
  });
}

function selectedActionIdentityContradictionDetail(contradiction) {
  if (contradiction.claimedEffectKind) {
    return `${contradiction.field}:${contradiction.claimedEffectKind}->${
      contradiction.expectedEffectKind}`;
  }
  return `${contradiction.field}:${contradiction.claimedAbilityName}->${
    contradiction.expectedAbilityName}`;
}

// A stale accepted Planner can seed the same false effect through repeated
// Actions. Return to that upstream seam only for an explicitly approved,
// changed-contract recovery at the SAME authority, once. Never edit paid prose.
export function planStarcraftTmgSelectedEffectPlannerRecoveryV1(choice, input,
  { retryApproved, promptPolicyVersion } = {}) {
  const last = choice?.attempts?.[choice.attemptKeys?.at(-1)];
  if (retryApproved !== true || choice?.status !== "provider_output_invalid"
    || choice.completedDecision || !choice.plannerResult
    || last?.status !== "completed" || last.stage !== "action"
    || !promptPolicyVersion || promptPolicyVersion === last.promptPolicyVersion
    || choice.selectedEffectPlannerRecoveries?.length) return null;
  const authority = choice.authority || {};
  if (input.roomProjection?.room?.stateRevision !== authority.stateRevision
    || input.roomProjection?.room?.stateHash !== authority.stateHash
    || input.spatialActionSpace?.actionSpaceHash !== authority.spatialActionSpaceHash) return null;
  const inspected = inspectStarcraftTmgSelectedActionIdentityClaimsV1({
    spatialActionSpace: input.spatialActionSpace,
    candidateId: choice.plannerResult.recommendedCandidateId,
    stage: "planning", value: choice.plannerResult,
  });
  if (inspected.status !== "contradicted") return null;
  return freeze({ version: "selected_effect_planner_recovery_v1",
    promptPolicyVersion, authority: clone(authority),
    issues: clone(inspected.correctionIssues),
    previousStage: choice.stage,
    previousPlannerResult: clone(choice.plannerResult),
    previousStageCorrectionRounds: choice.stageCorrectionRounds,
    maximumNewSemanticCorrections: 1,
    paidHistoryRewritten: false, roomMutationAllowed: false });
}

export function applyStarcraftTmgSelectedEffectPlannerRecoveryV1(choice, recovery,
  recordedAt) {
  if (!recovery || choice.status !== "provider_output_invalid"
    || choice.selectedEffectPlannerRecoveries?.length
    || JSON.stringify(choice.authority) !== JSON.stringify(recovery.authority)) {
    throw new Error("LIVE_DECISION_SELECTED_EFFECT_RECOVERY_NOT_ADMITTED");
  }
  choice.selectedEffectPlannerRecoveries = [{ ...clone(recovery), recordedAt }];
  choice.stage = "planning";
  choice.plannerResult = null;
  // Keep the exhausted counter and context. The existing explicit prompt-repair
  // contract below owns the one new window and stores all previous history.
  choice.warnings.push("SELECTED_EFFECT_UPSTREAM_PLANNER_REPAIR_REQUIRED");
}

function semanticCorrectionExhausted(choice, maximumRounds) {
  const repairLimit = choice.actionCorrectionContextRepairs?.at(-1)
    ?.maximumNewSemanticCorrections
    ?? choice.promptRepairHistory?.at(-1)?.maximumNewSemanticCorrections;
  return repairLimit !== undefined
    ? Number(choice.semanticCorrectionRounds || 0) >= repairLimit
    : effectiveStarcraftTmgSemanticCorrectionsV1(choice) >= maximumRounds;
}

function currentPlannerAttemptKey(choice) {
  if (choice.plannerResultAttemptKey) return choice.plannerResultAttemptKey;
  // Legacy accepted Planner records predate the explicit attempt binding.
  return [...(choice.attemptKeys || [])].reverse().find(key => {
    const attempt = choice.attempts?.[key];
    return attempt?.stage === "planning" && attempt.status === "completed"
      && choice.processedAttemptKeys?.includes(key)
      && responseParts(attempt.safeOutput).planning?.recommendedCandidateId
        === choice.plannerResult?.recommendedCandidateId;
  }) || null;
}

export function isStarcraftTmgActionReplayForCurrentPlannerV1(choice, attemptKey) {
  const plannerKey = currentPlannerAttemptKey(choice);
  return !plannerKey || (choice.attemptKeys || []).indexOf(attemptKey)
    > choice.attemptKeys.indexOf(plannerKey);
}

// v36 locally revalidated an already-rejected old Action after the repaired
// Planner returned. No new Action was requested; do not charge that old local
// error against the new model's single correction window. Narrow, once-only
// admission leaves a genuinely new failed Action and all historical data alone.
export function planStarcraftTmgSupersededActionReplayRepairV1(choice, input,
  { retryApproved } = {}) {
  const plannerKey = currentPlannerAttemptKey(choice);
  const revalidation = choice?.localOutputRevalidationHistory?.at(-1);
  if (retryApproved !== true || choice?.status !== "provider_output_invalid"
    || !choice.plannerResult || !choice.selectedEffectPlannerRecoveries?.length
    || choice.supersededActionReplayRepairs?.length
    || choice.promptRepairHistory?.at(-1)?.maximumNewSemanticCorrections !== 1
    || choice.semanticCorrectionRounds !== 1 || choice.stageCorrectionRounds !== 1
    || !revalidation || isStarcraftTmgActionReplayForCurrentPlannerV1(
      choice, revalidation.attemptKey)
    || choice.attemptKeys.at(-1) !== plannerKey) return null;
  const authority = choice.authority;
  if (input.roomProjection?.room?.stateRevision !== authority.stateRevision
    || input.roomProjection?.room?.stateHash !== authority.stateHash
    || input.spatialActionSpace?.actionSpaceHash !== authority.spatialActionSpaceHash) return null;
  return freeze({ version: "superseded_action_replay_repair_v1",
    authority: clone(authority), currentPlannerAttemptKey: plannerKey,
    supersededActionAttemptKey: revalidation.attemptKey,
    priorSemanticCorrectionRounds: choice.semanticCorrectionRounds,
    priorStageCorrectionRounds: choice.stageCorrectionRounds,
    newProviderResponseFailed: false, paidHistoryRewritten: false });
}

export function applyStarcraftTmgSupersededActionReplayRepairV1(choice, repair,
  recordedAt) {
  if (!repair || choice.status !== "provider_output_invalid"
    || choice.supersededActionReplayRepairs?.length
    || JSON.stringify(choice.authority) !== JSON.stringify(repair.authority)) {
    throw new Error("LIVE_DECISION_SUPERSEDED_ACTION_REPLAY_REPAIR_NOT_ADMITTED");
  }
  choice.supersededActionReplayRepairs = [{ ...clone(repair), recordedAt }];
  choice.plannerResultAttemptKey = repair.currentPlannerAttemptKey;
  choice.status = "generating";
  choice.semanticCorrectionRounds = 0;
  choice.stageCorrectionRounds = 0;
  choice.lastSemanticFailureSignature = null;
  choice.repeatedSemanticFailureCount = 0;
  choice.warnings.push("SUPERSEDED_ACTION_LOCAL_ERROR_EXCLUDED_FROM_NEW_WINDOW");
}

// Rebuild legacy enum-only feedback from the actual rejected paid Action at the
// same authority. This is not an exemption for a model given complete evidence,
// nor a version-triggered unlimited retry. Any source-bound semantic validator
// can use this seam; one repaired context permits at most one new response error.
export function planStarcraftTmgActionCorrectionContextRepairV1(choice, input,
  { retryApproved, providerInteractionMode = "native_tools" } = {}) {
  if (retryApproved !== true || choice?.status !== "provider_output_invalid"
    || !choice.plannerResult || choice.stage !== "action"
    || choice.actionCorrectionContextRepairs?.length) return null;
  const authority = choice.authority;
  if (input.roomProjection?.room?.stateRevision !== authority.stateRevision
    || input.roomProjection?.room?.stateHash !== authority.stateHash
    || input.spatialActionSpace?.actionSpaceHash !== authority.spatialActionSpaceHash
    || input.spatialObservation?.observationHash !== authority.spatialObservationHash) return null;
  const key = choice.attemptKeys?.at(-1);
  const attempt = choice.attempts?.[key];
  const previous = choice.semanticCorrectionFeedbackHistory?.at(-1);
  if (attempt?.status !== "completed" || attempt.stage !== "action"
    || !isStarcraftTmgActionReplayForCurrentPlannerV1(choice, key)
    || !object(responseParts(attempt.safeOutput).decision)
    || previous?.stage !== "action"
    || previous.issues?.some(issue => issue.field || issue.facts
      || issue.selectedActionIdentity)) return null;
  try {
    normalizeSubmittedAction(attempt, decisionInputForChoice(input, choice), choice);
    return null;
  } catch (error) {
    if (error.severity !== "High" || !error.correctionIssues?.length
      || error.code !== String(previous.correction || "").split(":", 1)[0]
      || !error.correctionIssues.some(issue => issue.field
        && (issue.facts || issue.selectedActionIdentity))) return null;
    const feedback = buildStarcraftTmgSemanticCorrectionFeedbackV1({
      stage: "action", correction: error.correction || error.code,
      issues: error.correctionIssues,
      history: choice.semanticCorrectionFeedbackHistory || [],
      providerInteractionMode,
    });
    return freeze({ version: "source_bound_action_correction_context_repair_v1",
      authority: clone(authority), sourceAttemptKey: key, feedback,
      priorSemanticCorrectionRounds: choice.semanticCorrectionRounds || 0,
      priorStageCorrectionRounds: choice.stageCorrectionRounds || 0,
      previousContinuationMessages: clone(choice.providerContinuationMessages || []),
      normalizationVersion: ACTION_SHAPE_NORMALIZATION_VERSION,
      maximumNewSemanticCorrections: 1, paidHistoryRewritten: false,
      strategyRecommendationProvided: false, trainingTruth: false });
  }
}

export function applyStarcraftTmgActionCorrectionContextRepairV1(choice, repair,
  recordedAt) {
  if (!repair || choice.status !== "provider_output_invalid"
    || choice.actionCorrectionContextRepairs?.length
    || choice.attemptKeys?.at(-1) !== repair.sourceAttemptKey
    || JSON.stringify(choice.authority) !== JSON.stringify(repair.authority)) {
    throw new Error("LIVE_DECISION_ACTION_CORRECTION_CONTEXT_REPAIR_NOT_ADMITTED");
  }
  const attempt = choice.attempts[repair.sourceAttemptKey];
  choice.actionCorrectionContextRepairs = [{ ...clone(repair), recordedAt }];
  choice.providerContinuationMessages.push({ role: "assistant",
    content: JSON.stringify(attempt.safeOutput) }, { role: "user",
    content: JSON.stringify(repair.feedback) });
  choice.semanticCorrectionFeedbackHistory.push({ stage: "action",
    sourceAttemptKey: repair.sourceAttemptKey,
    correction: repair.feedback.current.detail,
    issues: clone(repair.feedback.current.issues) });
  // The original response was just rechecked. Do not replay/charge its same
  // local error again before requesting the one source-grounded correction.
  attempt.localSemanticReplayVersion = repair.normalizationVersion;
  choice.status = "generating";
  choice.semanticCorrectionRounds = 0;
  choice.stageCorrectionRounds = 0;
  choice.lastSemanticFailureSignature = null;
  choice.repeatedSemanticFailureCount = 0;
  choice.warnings.push("SOURCE_BOUND_ACTION_CORRECTION_CONTEXT_REBUILT_ONCE");
}

function normalizedResourceCostsByChoice(action) {
  const constraints = sourceActionDomain(action)?.constraints || {};
  const explicit = object(constraints.resourceCostsByChoice)
    ? clone(constraints.resourceCostsByChoice) : {};
  if (Object.keys(explicit).length > 0) return explicit;
  const resourceType = String(constraints.resourceType || "").toUpperCase() || null;
  const hasLegacyCost = resourceType !== null
    || constraints.printedResourceCost !== undefined
    || constraints.effectiveResourceCost !== undefined
    || constraints.resourceCost !== undefined;
  if (!hasLegacyCost) return {};
  const printedResourceCost = Number(
    constraints.printedResourceCost ?? constraints.resourceCost ?? 0);
  const effectiveResourceCost = Number(
    constraints.effectiveResourceCost ?? constraints.resourceCost
      ?? printedResourceCost);
  return { default: {
    resourceType,
    printedResourceCost,
    resourceCostReduction: Number(constraints.resourceCostReduction
      ?? Math.max(0, printedResourceCost - effectiveResourceCost)),
    effectiveResourceCost,
    discountSourcePieceId: constraints.discountSourcePieceId
      || constraints.sourcePieceId || null,
  } };
}

function selectedActionResourceContract(actionSpace, candidateId) {
  const selected = actionIndex(actionSpace).find((entry) =>
    entry.id === String(candidateId || ""));
  if (!selected) return null;
  const action = sourceActionDomain(selected.action);
  const sourceInstanceId = action?.sourceInstanceId
    || action?.constraints?.sourceCardInstanceId || null;
  const sourceCardExhaustedOnCommit = action?.sourceKind === "card_feature"
    || Boolean(action?.constraints?.sourceCardInstanceId);
  const costs = Object.entries(normalizedResourceCostsByChoice(action))
    .map(([choice, cost]) => ({
      choice,
      resourceType: String(cost?.resourceType || "").toUpperCase() || null,
      printedResourceCost: Number(cost?.printedResourceCost || 0),
      resourceCostReduction: Number(cost?.resourceCostReduction || 0),
      effectiveResourceCost: Number(cost?.effectiveResourceCost || 0),
      discountSourcePieceId: cost?.discountSourcePieceId
        || cost?.sourcePieceId || null,
    })).sort((left, right) => left.choice.localeCompare(right.choice));
  return freeze({
    candidateId: selected.id,
    actionType: action?.actionType || null,
    abilityName: action?.abilityName || null,
    costs,
    sourceCardExhaustedOnCommit,
    sourceInstanceId,
    rulesAuthority: true,
    trainingTruth: false,
  });
}

function selectedActionResourceClaimFragments(value, stage) {
  const input = object(value) ? value : {};
  const intent = object(input.intent) ? input.intent : {};
  const assessment = object(input.assessment) ? input.assessment : {};
  const plan = object(input.planRevision) ? input.planRevision
    : object(input.plan) ? input.plan : {};
  const summary = stage === "planning"
    ? parsedPublicPlanSummary(input.publicPlanSummary)
    : object(input.publicDecisionSummary) ? input.publicDecisionSummary : {};
  const fields = stage === "planning" ? [
    ["assessment.currentGoal", assessment.currentGoal],
    ["assessment.evidenceFor", assessment.evidenceFor],
    ["plan.currentGoal", plan.currentGoal],
    ["plan.resourcePolicy", plan.resourcePolicy],
    ["publicPlanSummary.plan", summary.plan],
    ["publicPlanSummary.purpose", summary.purpose],
    ["publicPlanSummary.visibleFacts", summary.visibleFacts],
    ["publicPlanSummary.calculations", summary.calculations],
  ] : [
    ["selectedReason", input.selectedReason],
    ["scoreOrPositionValue", input.scoreOrPositionValue],
    ["intent.currentGoal", intent.currentGoal],
    ["intent.purpose", intent.purpose],
    ["intent.expectedOwnOutcome", intent.expectedOwnOutcome],
    ["intent.expectedEffects", intent.expectedEffects],
    ["intent.resourcesIntended", intent.resourcesIntended],
    ["publicDecisionSummary.plan", summary.plan],
    ["publicDecisionSummary.purpose", summary.purpose],
    ["publicDecisionSummary.visibleFacts", summary.visibleFacts],
    ["publicDecisionSummary.calculations", summary.calculations],
  ];
  return fields.flatMap(([field, fieldValue]) => {
    const values = Array.isArray(fieldValue) ? fieldValue : [fieldValue];
    return values.map((entry) => ({ field,
      text: String(entry || "").trim() })).filter((entry) => entry.text);
  });
}

function resourceClaimSubjects(actionSpace, candidateId) {
  const entries = actionIndex(actionSpace).map((entry) => ({
    id: entry.id, action: sourceActionDomain(entry.action),
  }));
  const selected = entries.find((entry) => entry.id === candidateId)?.action;
  const subjects = new Map();
  const add = (name, selectedSubject) => {
    if (!name) return;
    const key = String(name).normalize("NFC").toLowerCase();
    // Shared action-type labels are not enough to distinguish two abilities.
    subjects.set(key, subjects.has(key)
      ? subjects.get(key) && selectedSubject : selectedSubject);
  };
  for (const type of [...FORMATION_ACTION_TYPES, ...PHASE_CONTROL_ACTIONS,
    "finish_activation"]) add(type, type === selected?.actionType);
  for (const entry of entries) {
    add(entry.action?.abilityName, entry.id === candidateId);
    add(entry.id, entry.id === candidateId);
    add(entry.action?.actionType, entry.action?.actionType === selected?.actionType);
  }
  add("结束激活", selected?.actionType === "finish_activation");
  add("部署", selected?.actionType === "deploy");
  add("进场", selected?.actionType === "deploy");
  return [...subjects].map(([name, isSelected]) => ({
    isSelected,
    pattern: new RegExp(`(?<![\\p{L}\\p{N}_])${name
      .replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")
      .replace(/[_ ]+/gu, "[_\\s-]+")}(?![\\p{L}\\p{N}_])`, "giu"),
  }));
}

function resourceClaimTargetsSelected(fragment, offset, subjects) {
  // Bind each cost occurrence, not its whole paragraph: comparisons can name
  // several actions with different costs. An explicit "this action" rebinds
  // the subject; otherwise retain the existing selected-field default.
  const prefix = fragment.slice(0, offset).split(/[.;!?。；！？\n]/u).at(-1);
  let last = { index: -1, isSelected: true };
  for (const subject of subjects) {
    for (const match of prefix.matchAll(subject.pattern)) {
      if (match.index > last.index) last = {
        index: match.index, isSelected: subject.isSelected,
      };
    }
  }
  const explicitSelected = /\b(?:this|the)\s+(?:(?:selected|chosen|current)\s+)?(?:action|ability|candidate|choice)\b|(?:本次|所选)(?:动作|能力|选择)/giu;
  for (const match of prefix.matchAll(explicitSelected)) {
    if (match.index > last.index) last = { index: match.index, isSelected: true };
  }
  return last.isSelected;
}

function falseFreeResourceClaim(fragment, resourceType, subjects) {
  const aliases = {
    BM: ["biomass", "bm", "生物质"],
    CP: ["command points?", "cp", "指挥点"],
    PE: ["psionic energy", "pe", "灵能"],
  }[resourceType] || [];
  return aliases.some((alias) => {
    const boundaryAlias = `(?:${alias})`;
    const pattern = /[\u3400-\u9fff]/u.test(alias)
      ? new RegExp(`(?:零|0)\\s*${alias}|(?:不消耗|无需支付|无需消耗)\\s*${alias}`, "gu")
      : new RegExp(
      `(?:\\b(?:zero|0)\\s*[- ]*${boundaryAlias}\\b|`
      + `\\b(?:costs?|spends?|pays?|requires?)\\s+(?:zero|no|0)\\s+${boundaryAlias}\\b|`
      + `\\bwithout\\s+(?:spending|paying|using)\\s+${boundaryAlias}\\b|`
      + `\\bno\\s+${boundaryAlias}\\s+(?:is\\s+)?(?:spent|required|paid|cost)\\b|`
      + `\\bat\\s+(?:zero|no|0)\\s+${boundaryAlias}\\s+cost\\b)`, "giu");
    return [...fragment.matchAll(pattern)].some((match) => {
      const prefix = fragment.slice(0, match.index);
      if (/\b(?:not|never|isn't|doesn't)(?:\s+(?:a|an))?\s*$/iu.test(prefix)
        || /(?:不是|并非|并不是)\s*$/u.test(prefix)) return false;
      return resourceClaimTargetsSelected(fragment, match.index, subjects);
    });
  });
}

function falseNoSourceCardExhaustionClaim(fragment, resourceContract, subjects) {
  const value = String(fragment || "");
  // A negative verb alone cannot certify a false claim about the source card.
  // Bind the action, the card object and any explicit exception in that clause.
  // In particular, "no OTHER cards beyond the faction card" preserves its cost.
  const sourceCard = /\b(?:source[- ]card|(?:its|the)\s+source\s+card)\b|来源卡/iu;
  const factionSource = /^faction[:_-]/iu.test(
    String(resourceContract.sourceInstanceId || ""));
  const excludedSource = text => sourceCard.test(text)
    || (factionSource && /\bfaction\s+card\b|势力卡/iu.test(text))
    || (resourceContract.sourceInstanceId && text.includes(
      resourceContract.sourceInstanceId));
  const pattern = /\b(?:no|without)\s+(?:source[- ]card\s+)?exhaust(?:ion|ing)?\b|\b(?:does|do|will)\s+not\s+exhaust\b|\bsource\s+card\s+(?:(?:is|remains)\s+(?:ready|unexhausted)|is\s+not\s+exhausted)\b|(?:不|无需|不会)\s*(?:横置|耗竭|消耗)/giu;
  return [...value.matchAll(pattern)].some(match => {
    if (!resourceClaimTargetsSelected(value, match.index, subjects)) return false;
    const tail = value.slice(match.index).split(/[.;!?。；！？\n]/u)[0];
    const exception = tail.match(
      /\b(?:beyond|except(?:\s+for)?|other\s+than|apart\s+from)\s+(.+)|除(.+?)(?:以外|之外|外)/iu);
    if (exception && excludedSource(exception[1] || exception[2] || "")) {
      return false;
    }
    // "other" excludes the selected source, unless the same object explicitly
    // includes/denies that source too. Later clauses are inspected independently.
    if (/\b(?:other|additional)\s+(?:resource\s+)?cards?\b|其他(?:资源)?卡/iu
      .test(tail) && !sourceCard.test(tail)
      && !/\binclud(?:e|es|ing)\b|包括/iu.test(tail)) return false;
    if (sourceCard.test(tail) || /\bcards?\b|卡/iu.test(tail)) return true;
    // Preserve unqualified "no exhaustion" denials, but do not interpret a
    // denial about a different resource (Supply, Biomass, etc.) as card exhaustion.
    return /\b(?:no|without)\s+exhaustion\b/iu.test(tail);
  });
}

function resourceContradictionDetail(entry) {
  if (entry.claimKind === "source_card_exhaustion") {
    return `${entry.field}:source_card:not_exhausted->exhausted`;
  }
  return `${entry.field}:${entry.resourceType}:0->${entry.effectiveResourceCost}`;
}

export function inspectStarcraftTmgSelectedActionResourceClaimsV1(input = {}) {
  const resourceContract = selectedActionResourceContract(
    input.spatialActionSpace || {}, input.candidateId);
  if (!resourceContract) {
    return freeze({ status: "missing_candidate", resourceContract: null,
      checkedClaims: [], contradictions: [] });
  }
  const minimumNonzeroCosts = new Map();
  for (const cost of resourceContract.costs) {
    if (!cost.resourceType || cost.effectiveResourceCost <= 0) continue;
    const prior = minimumNonzeroCosts.get(cost.resourceType);
    minimumNonzeroCosts.set(cost.resourceType,
      prior === undefined ? cost.effectiveResourceCost
        : Math.min(prior, cost.effectiveResourceCost));
  }
  const fragments = selectedActionResourceClaimFragments(input.value,
    input.stage === "planning" ? "planning" : "action");
  const subjects = resourceClaimSubjects(input.spatialActionSpace || {},
    String(input.candidateId || ""));
  const contradictions = fragments.flatMap((entry) => (
    [...minimumNonzeroCosts.entries()].flatMap(([resourceType,
      effectiveResourceCost]) => falseFreeResourceClaim(entry.text, resourceType, subjects)
      ? [{ field: entry.field, text: entry.text, resourceType,
        claimedEffectiveResourceCost: 0, effectiveResourceCost }] : [])
  ));
  if (resourceContract.sourceCardExhaustedOnCommit) {
    contradictions.push(...fragments.filter((entry) =>
      falseNoSourceCardExhaustionClaim(entry.text, resourceContract, subjects))
      .map((entry) => ({
      field: entry.field,
      text: entry.text,
      resourceType: "SOURCE_CARD",
      claimKind: "source_card_exhaustion",
      claimedSourceCardExhaustedOnCommit: false,
      expectedSourceCardExhaustedOnCommit: true,
    })));
  }
  // The selected current domain supplies the facts; this is not a tactical
  // recommendation or a claim that the source card is already exhausted.
  // Keep point payment and the on-commit readiness transition separate.
  const code = input.stage === "planning"
    ? "PLANNER_SELECTED_ACTION_RESOURCE_CONTRADICTED"
    : "ACTION_SELECTED_ACTION_RESOURCE_CONTRADICTED";
  const correctionIssues = contradictions.map(entry => ({
    code,
    field: entry.field,
    claimText: entry.text,
    claimKind: entry.claimKind || "resource_point_cost",
    source: "selected_current_rules_action_domain",
    facts: { ...clone(resourceContract), stateScope: "on_commit" },
    correction: entry.claimKind === "source_card_exhaustion"
      ? `Zero resource-point cost does not mean no source-card exhaustion. On committing this selected action, source card ${resourceContract.sourceInstanceId} becomes exhausted. This describes the result of payment/use, not its current readiness. Correct the claim and reassess the opportunity cost; retain or change the action by your own strategy.`
      : `This selected action requires ${entry.effectiveResourceCost} ${entry.resourceType} at minimum under the supplied choices, not zero. Use the current choice-specific payment facts; retain or change the action by your own strategy.`,
  }));
  return freeze({
    status: contradictions.length > 0 ? "contradicted" : "consistent",
    resourceContract,
    checkedClaims: fragments,
    contradictions,
    correctionIssues,
  });
}

function unitSupplyClaimFragments(value) {
  const raw = object(value) ? value : {};
  const assessment = object(raw.assessment) ? raw.assessment : {};
  const plan = object(raw.planRevision) ? raw.planRevision
    : object(raw.plan) ? raw.plan : {};
  const intent = object(raw.intent) ? raw.intent : {};
  const planSummary = parsedPublicPlanSummary(raw.publicPlanSummary);
  const decisionSummary = object(raw.publicDecisionSummary)
    ? raw.publicDecisionSummary : {};
  const fragments = [];
  const add = (field, fieldValue, contextUnitIds = []) => {
    const values = Array.isArray(fieldValue) ? fieldValue : [fieldValue];
    for (const entry of values) {
      for (const textValue of String(entry || "").split(/[.;!?。；！？\n]+/u)) {
        const text = textValue.trim();
        if (text) fragments.push({ field, text,
          contextUnitIds: [...new Set(contextUnitIds.map(String))] });
      }
    }
  };
  for (const [field, fieldValue] of [
    ["assessment.currentGoal", assessment.currentGoal],
    ["assessment.evidenceFor", assessment.evidenceFor],
    ["assessment.evidenceAgainst", assessment.evidenceAgainst],
    ["assessment.opponentModelUpdates", assessment.opponentModelUpdates],
    ["assessment.unresolvedRisks", assessment.unresolvedRisks],
    ["plan.currentGoal", plan.currentGoal],
    ["plan.strategicApproach", plan.strategicApproach],
    ["plan.assumptions", plan.assumptions],
    ["plan.opponentModel", plan.opponentModel],
    ["selectedReason", raw.selectedReason],
    ["scoreOrPositionValue", raw.scoreOrPositionValue],
    ["risk", raw.risk],
    ["intent.currentGoal", intent.currentGoal],
    ["intent.purpose", intent.purpose],
    ["intent.expectedOwnOutcome", intent.expectedOwnOutcome],
    ["intent.expectedEffects", intent.expectedEffects],
    ["intent.tradeoffs", (intent.tradeoffs || []).flatMap((entry) => [
      entry?.benefit, entry?.cost, entry?.acceptanceReason])],
    ["intent.risks", intent.risks],
    ["publicPlanSummary.plan", planSummary.plan],
    ["publicPlanSummary.purpose", planSummary.purpose],
    ["publicPlanSummary.visibleFacts", planSummary.visibleFacts],
    ["publicPlanSummary.calculations", planSummary.calculations],
    ["publicPlanSummary.risk", planSummary.risk],
    ["publicDecisionSummary.plan", decisionSummary.plan],
    ["publicDecisionSummary.purpose", decisionSummary.purpose],
    ["publicDecisionSummary.visibleFacts", decisionSummary.visibleFacts],
    ["publicDecisionSummary.calculations", decisionSummary.calculations],
    ["publicDecisionSummary.risk", decisionSummary.risk],
  ]) add(field, fieldValue);
  for (const [index, comparison] of (raw.candidateComparisons || []).entries()) {
    add(`candidateComparisons[${index}].evaluation`,
      comparison?.evaluation || comparison?.reason);
  }
  for (const [index, alternative] of (raw.rejectedAlternatives || []).entries()) {
    add(`rejectedAlternatives[${index}].reason`, alternative?.reason);
  }
  const responses = [
    ...(Array.isArray(intent.predictedOpponentResponses)
      ? intent.predictedOpponentResponses : []),
    ...(Array.isArray(plan.predictedOpponentResponses)
      ? plan.predictedOpponentResponses : []),
  ];
  for (const [index, response] of responses.entries()) {
    const contextUnitIds = [response?.likelyActorUnitId,
      response?.likelyTargetUnitId].filter(Boolean);
    add(`predictedOpponentResponses[${index}].opponentAction`,
      response?.opponentAction, contextUnitIds);
    add(`predictedOpponentResponses[${index}].basis`, response?.basis,
      contextUnitIds);
    add(`predictedOpponentResponses[${index}].counterResponse`,
      response?.counterResponse, contextUnitIds);
    add(`predictedOpponentResponses[${index}].counterPurpose`,
      response?.counterPurpose, contextUnitIds);
  }
  return fragments;
}

function unitSupplyAliases(unit) {
  const name = String(unit?.unitName || unit?.name || "").trim();
  const id = String(unit?.unitId || unit?.id || "").trim();
  const aliases = [name, name.split("(")[0].trim(), id];
  const idTail = id.replace(/^player\d+[-_]/iu, "").replaceAll(/[-_]+/gu, " ");
  if (idTail) aliases.push(idTail);
  return [...new Set(aliases.map((entry) => entry.toLowerCase())
    .filter((entry) => entry.length >= 4))];
}

function fragmentMentionsSupplyUnit(fragment, unit) {
  if ((fragment.contextUnitIds || []).includes(String(unit.unitId || unit.id))) {
    return true;
  }
  const normalized = String(fragment.text || "").toLowerCase();
  return unitSupplyAliases(unit).some((alias) => normalized.includes(alias));
}

function modelCountInflatedToLargeSupply(fragment) {
  const value = String(fragment || "");
  const explicitCorrection = /\b(?:do|does|did)\s+not\b[^.;!?]{0,80}\b(?:give|grant|provide|create|mean|yield)s?\b|\bnot\s+(?:a\s+)?(?:large|high|huge|massive|substantial|superior|deep)\b[^.;!?]{0,50}\bsupply\b|(?:并不|不能)[^。；！？]{0,80}(?:补给|占点)/iu;
  if (explicitCorrection.test(value)) return false;
  const english = /\b\d+\s+models?\b[^.;!?]{0,100}\b(?:give|grant|provide|create|mean|yield)s?\b[^.;!?]{0,100}\b(?:large|high|huge|massive|substantial|superior|deep)\b[^.;!?]{0,60}\b(?:marker[- ]contest(?:ing)?\s+)?supply(?:\s+pool)?\b/iu;
  const chinese = /\d+\s*个?(?:模型|单位)[^。；！？]{0,100}(?:带来|提供|意味着|形成)[^。；！？]{0,100}(?:大量|很高|庞大|巨大|优势)[^。；！？]{0,50}(?:补给|占点)/u;
  return english.test(value) || chinese.test(value);
}

export function inspectStarcraftTmgUnitSupplyClaimsV1(input = {}) {
  const observation = object(input.spatialObservation)
    ? input.spatialObservation : {};
  const units = [...(observation.units || []),
    ...(observation.offTableUnits || [])].filter((entry) =>
    Number.isFinite(Number(entry?.currentSupply)));
  const fragments = unitSupplyClaimFragments(input.value);
  const contradictions = [];
  for (const fragment of fragments) {
    for (const unit of units) {
      const currentSupply = Number(unit.currentSupply);
      if (currentSupply > 1 || !fragmentMentionsSupplyUnit(fragment, unit)
        || !modelCountInflatedToLargeSupply(fragment.text)) continue;
      contradictions.push({
        field: fragment.field,
        text: fragment.text,
        unitId: String(unit.unitId || unit.id),
        unitName: String(unit.unitName || unit.name || ""),
        currentModels: Number(unit.currentModels ?? 0),
        currentSupply,
        reason: "model_count_inferred_as_large_supply",
      });
    }
  }
  return freeze({
    status: contradictions.length > 0 ? "contradicted" : "consistent",
    checkedClaims: fragments,
    contradictions,
    rulesAuthority: false,
    trainingTruth: false,
  });
}

function unitSupplyContradictionDetail(entry = {}) {
  return `${entry.field || "unknown_field"}:${entry.unitId
    || "unknown_unit"}:models=${entry.currentModels ?? "unknown"}:currentSupply=${
    entry.currentSupply ?? "unknown"}:${entry.reason || "supply_contradiction"}`;
}

function sourceActionDomain(value) {
  return object(value?.sourceDomain) ? value.sourceDomain : value;
}

function isExactForcedChargeFailureDomain(value) {
  const domain = sourceActionDomain(value);
  const schema = domain?.parameterSchema;
  const proofKind = String(schema?.failureProofKind || "");
  const certificateFlag = new Map([
    ["continuous_leading_endpoint_excluded",
      "exactContinuousLeadingEndpointExclusion"],
    ["mandatory_elevation_access_shortfall",
      "exactMandatoryAccessShortfall"],
    ["occupied_cross_section_distance_shortfall",
      "allActiveTargetModelsCovered"],
    ["integer_round_leading_path_excluded",
      "allIntegerEndpointsExcluded"],
  ]).get(proofKind);
  const exactProof = Boolean(certificateFlag)
    && domain?.constraints?.[certificateFlag] === true;
  return domain?.actionType === "resolve_charge"
    && Array.isArray(schema?.required)
    && schema.required.length === 2
    && schema.required.includes("outcome")
    && schema.required.includes("failureProof")
    && Array.isArray(schema.outcome)
    && schema.outcome.length === 1
    && schema.outcome[0] === "failure"
    && exactProof
    && /^[a-f0-9]{64}$/u.test(String(domain.constraints.certificateHash || ""));
}

function maximumChargeRoll(constraints) {
  const roll = constraints?.chargeDistanceRoll || {};
  const diceCount = Math.max(1, Number(roll.diceCount || 1));
  const keepHighest = Number(roll.keepHighest || 0);
  return keepHighest > 0
    ? Math.min(diceCount, keepHighest) * 6
    : diceCount * 6;
}

function exactUnitDistance(receipts, fromUnitId, toUnitId) {
  const matches = receipts.flatMap((receipt) => (
    receipt?.queryKind === "space.inspect_relationships"
      ? receipt?.result?.relationships || [] : []
  )).filter((entry) => entry?.edgeKind === "unit_spatial_relationship"
    && entry.fromUnitId === fromUnitId && entry.toUnitId === toUnitId
    && entry.nearestPhysicalEdges?.precision === "exact_physical_footprints"
    && Number.isFinite(Number(
      entry.nearestPhysicalEdges?.distanceMilliInches)));
  if (matches.length === 0) return null;
  return Math.min(...matches.map((entry) => Number(
    entry.nearestPhysicalEdges.distanceMilliInches)));
}

function exactUnitDistanceFromObservation(observation, authority,
  fromUnitId, toUnitId) {
  if (!object(observation) || !object(authority)
    || !["roomId", "matchBindingHash", "stateRevision", "stateHash"]
      .every((key) => observation[key] != null
        && observation[key] === authority[key])
    || observation.viewer?.seatKey !== authority.seatKey
    || (authority.spatialObservationHash
      && observation.observationHash !== authority.spatialObservationHash)) {
    return null;
  }
  const modelsFor = (unitId) => {
    const unit = (observation.units || []).find((entry) =>
      entry.unitId === unitId);
    const rows = (observation.models || []).filter((entry) =>
      entry.unitId === unitId);
    return unit && Number.isSafeInteger(Number(unit.currentModels))
      && Number(unit.currentModels) > 0
      && rows.length === Number(unit.currentModels)
      && rows.every((entry) => entry.geometryStatus === "exact_rules_profile"
        && object(entry.footprint)) ? rows : null;
  };
  const from = modelsFor(fromUnitId);
  const to = modelsFor(toUnitId);
  if (!from || !to) return null;
  try {
    return Math.min(...from.flatMap((left) => to.map((right) =>
      evaluateOfficialPhysicalFootprintRelationV1({
        left: left.footprint, right: right.footprint,
      }).minimumSeparationMilliInches)));
  } catch {
    return null;
  }
}

function currentExactUnitDistance(input, fromUnitId, toUnitId) {
  const observed = exactUnitDistanceFromObservation(
    input.spatialObservation,
    input.spatialActionSpace?.authority,
    fromUnitId, toUnitId);
  return observed === null
    ? exactUnitDistance(input.queryReceipts || [], fromUnitId, toUnitId)
    : observed;
}

function currentSelectedChargePathEvidence(input, selected, targetUnitId) {
  const authority = input.spatialActionSpace?.authority;
  const leadingModelId = String(input.leadingModelId || "");
  if (!object(authority) || !leadingModelId) return null;
  const receipt = [...(input.queryReceipts || [])].reverse().find(entry => {
    const evidence = entry?.result?.chargePathEvidence;
    return entry?.queryKind === "instantiate_parameterized_action"
      && (entry.status === "exact" || entry.precision === "exact")
      && entry.result?.proposalAccepted === true
      && entry.result.domainId === selected.id
      && ["roomId", "matchBindingHash", "stateRevision", "stateHash",
        "legalSpaceHash", "seatKey"].every(key => entry.authority?.[key] === authority[key])
      && evidence?.pieceId === sourceActionDomain(selected.action)?.pieceId
      && evidence.leadingModelId === leadingModelId
      && entry.result.canonicalParameters?.leadingModelId === leadingModelId
      && evidence.declaredTargets?.some(reference => reference.unitId === targetUnitId)
      && hashStarcraftTmgContract(evidence.declaredTargets)
        === hashStarcraftTmgContract(entry.result.canonicalParameters.targets);
  });
  return receipt ? clone(receipt.result.chargePathEvidence) : null;
}

// A final Host-only validation can discover a fact the model never saw.
// Give that fact back before completing the decision; do not invent an
// illegal Charge declaration or silently select a different action/leader.
export function planStarcraftTmgChargePathEvidenceReviewV1(input = {}) {
  const proposal = input.proposal;
  if (proposal?.kind !== "parameterized" || !proposal.parameters?.targets?.length) return null;
  const selected = actionIndex(input.spatialActionSpace || {}).find(entry => entry.id === proposal.domainId);
  if (sourceActionDomain(selected?.action)?.actionType !== "charge") return null;
  const queryInput = { ...input, leadingModelId: proposal.parameters.leadingModelId };
  const targetUnitId = proposal.parameters.targets[0].unitId;
  const evidence = currentSelectedChargePathEvidence(queryInput, selected, targetUnitId);
  if (evidence?.pathStatus !== "certain_failure") return null;
  if (hashStarcraftTmgContract(evidence.declaredTargets)
    !== hashStarcraftTmgContract(proposal.parameters.targets)) return null;
  const previous = currentSelectedChargePathEvidence({ ...queryInput,
    queryReceipts: input.previousQueryReceipts || [] }, selected, targetUnitId);
  if (previous && hashStarcraftTmgContract(previous) === hashStarcraftTmgContract(evidence)) return null;
  const signature = hashStarcraftTmgContract({ authority: input.spatialActionSpace.authority,
    proposal, evidence });
  const history = input.history || [];
  if (history.some(entry => entry.signature === signature)) return null;
  const maximumRounds = Math.min(3, Math.max(1, Number(input.maximumRounds || 3)));
  return freeze({ kind: "charge_path_evidence_review", signature,
    action: history.length >= maximumRounds ? "needs_attention" : "replan",
    evidence, candidateId: selected.id, proposal: clone(proposal),
    legalDeclarationUnchanged: true, entireChargeDomainExcluded: false,
    feedback: { kind: "same_execution_charge_path_evidence", evidence,
      declarationIsLegalButSuccessfulEngagementIsProvenImpossible: true,
      evidenceAppliesOnlyToThisLeaderAndDeclaredTargets: true,
      otherLeadersAndTargetsRemainUnproved: true },
    maximumRounds, mayApply: false, trainingTruth: false });
}

export function applyStarcraftTmgChargePathEvidenceReviewV1(choice, review,
  { attemptKey, recordedAt } = {}) {
  choice.chargePathReviewHistory = [...(choice.chargePathReviewHistory || []),
    { ...clone(review), attemptKey, recordedAt }];
  if (attemptKey && !choice.processedAttemptKeys.includes(attemptKey)) {
    choice.processedAttemptKeys.push(attemptKey);
  }
  if (review.action === "replan") {
    if (choice.plannerResult) {
      choice.failedPlannerResults = [...(choice.failedPlannerResults || []), {
        plannerResult: clone(choice.plannerResult), reason: review.kind,
        failureSignature: review.signature, recordedAt,
      }];
    }
    choice.stage = "planning";
    choice.plannerResult = null;
    choice.stageQueryRounds = 0;
    choice.stageCorrectionRounds = 0;
  }
  choice.providerContinuationMessages.push({ role: "user",
    content: JSON.stringify(review.feedback) });
  choice.warnings.push("CHARGE_PATH_EXECUTION_EVIDENCE_READY");
  choice.status = review.action === "needs_attention" ? "provider_output_invalid" : "generating";
}

export function inspectStarcraftTmgSelectedChargeReachabilityV1(input = {}) {
  const selected = actionIndex(input.spatialActionSpace || {}).find((entry) =>
    entry.id === input.candidateId);
  const domain = sourceActionDomain(selected?.action);
  if (!selected || domain?.actionType !== "charge"
    || domain?.parameterKind
      !== "official_selected_roster_charge_declaration_v1") {
    return freeze({ status: "not_applicable", candidateId: input.candidateId || null,
      certainDistanceShortfall: false, trainingTruth: false });
  }
  const targetUnitId = String(input.targetUnitId || "").trim();
  if (!Object.hasOwn(domain.constraints?.eligibleTargetModelIdsByUnitId || {},
    targetUnitId)) {
    return freeze({ status: "invalid_target", candidateId: selected.id,
      targetUnitId, certainDistanceShortfall: false, trainingTruth: false });
  }
  const baseEdgeDistanceMilliInches = currentExactUnitDistance(
    input, domain.pieceId, targetUnitId);
  const maximumDistanceMilliInches = Math.round(1_000 * (
    Number(domain.constraints?.speedInches || 0)
      + Number(domain.constraints?.chargeDistanceModifier || 0)
      + maximumChargeRoll(domain.constraints)));
  const minimumMoveToEngageMilliInches = baseEdgeDistanceMilliInches === null
    ? null : Math.max(0, baseEdgeDistanceMilliInches - 1_000);
  const path = currentSelectedChargePathEvidence(input, selected, targetUnitId);
  return freeze({ status: baseEdgeDistanceMilliInches === null
    ? "unknown" : "exact", candidateId: selected.id,
  pieceId: domain.pieceId, targetUnitId, baseEdgeDistanceMilliInches,
  minimumMoveToEngageMilliInches, maximumDistanceMilliInches,
  certainDistanceShortfall: minimumMoveToEngageMilliInches !== null
    && minimumMoveToEngageMilliInches > maximumDistanceMilliInches + 1,
  evidenceKind: baseEdgeDistanceMilliInches === null
    ? "selected_target_exact_base_edge_missing"
    : "selected_target_exact_physical_base_edges_and_charge_domain",
  precisionScope: "distance_only_not_path_or_charge_success",
  distanceDoesNotProvePath: true,
  distanceScope: "unit_minimum_physical_base_edges",
  leadingModelId: input.leadingModelId || null,
  pathStatus: path?.pathStatus || "unknown",
  pathLowerBoundMilliInches: path?.pathLowerBoundMilliInches ?? null,
  certainPathShortfall: path?.pathStatus === "certain_failure",
  selectedLeaderPathEvidence: path,
  rulesAuthority: false, trainingTruth: false });
}

export async function completeStarcraftTmgSelectedChargeEvidenceV1(input = {}) {
  const initial = inspectStarcraftTmgSelectedChargeReachabilityV1(input);
  if (initial.status !== "unknown") {
    return freeze({ reachability: initial, receipts: [], queryAttempted: false });
  }
  const receipt = await input.spatialQueryPort.query({
    roomProjection: input.roomProjection,
    legalSpace: input.legalSpace,
    spatialObservation: input.spatialObservation,
    request: { requestId: `host-charge-target-${initial.candidateId}`,
      queryKind: "space.inspect_relationships",
      arguments: { subjectUnitIds: [initial.pieceId],
        targetIds: [initial.targetUnitId],
        intent: "selected_charge_target_exact_base_edge" } },
  });
  const receipts = object(receipt)
    && HASH.test(String(receipt.queryReceiptHash || "")) ? [clone(receipt)] : [];
  return freeze({ reachability: inspectStarcraftTmgSelectedChargeReachabilityV1({
    ...input, queryReceipts: [...(input.queryReceipts || []), ...receipts],
  }), receipts, queryAttempted: true });
}

export function inspectStarcraftTmgChargeReachabilityV1(input = {}) {
  const actions = actionIndex(input.spatialActionSpace || {});
  const selected = actions.find((entry) => entry.id === input.candidateId);
  const domain = sourceActionDomain(selected?.action);
  if (!selected || domain?.actionType !== "charge"
    || domain?.parameterKind
      !== "official_selected_roster_charge_declaration_v1") {
    return freeze({ status: "not_applicable", candidateId: input.candidateId || null,
      certainDistanceShortfall: false, trainingTruth: false });
  }
  const targetUnitIds = Object.keys(
    domain.constraints?.eligibleTargetModelIdsByUnitId || {}).sort();
  const maximumDistanceMilliInches = Math.round(1_000 * (
    Number(domain.constraints?.speedInches || 0)
      + Number(domain.constraints?.chargeDistanceModifier || 0)
      + maximumChargeRoll(domain.constraints)
  ));
  const targetDistances = targetUnitIds.map((targetUnitId) => {
    const baseEdgeDistanceMilliInches = currentExactUnitDistance(
      input, domain.pieceId, targetUnitId);
    return {
      targetUnitId,
      baseEdgeDistanceMilliInches,
      minimumMoveToEngageMilliInches:
        baseEdgeDistanceMilliInches === null ? null
          : Math.max(0, baseEdgeDistanceMilliInches - 1_000),
    };
  });
  const exact = targetDistances.length > 0 && targetDistances.every((entry) =>
    entry.baseEdgeDistanceMilliInches !== null);
  const certainDistanceShortfall = exact && targetDistances.every((entry) =>
    entry.minimumMoveToEngageMilliInches > maximumDistanceMilliInches + 1);
  return freeze({
    status: exact ? "exact" : "unknown",
    candidateId: selected.id,
    pieceId: domain.pieceId,
    targetUnitIds,
    maximumDistanceMilliInches,
    nearestTargetBaseEdgeDistanceMilliInches: exact
      ? Math.min(...targetDistances.map((entry) =>
        entry.baseEdgeDistanceMilliInches)) : null,
    targetDistances,
    certainDistanceShortfall,
    precisionScope: "distance_only_not_path_or_charge_success",
    distanceDoesNotProvePath: true,
    distanceScope: "unit_minimum_physical_base_edges",
    pathStatus: "unknown",
    successCertified: false,
    evidenceKind: exact
      ? "exact_physical_base_edges_and_current_charge_domain"
      : "missing_exact_relationship_for_one_or_more_eligible_targets",
    rulesAuthority: false,
    trainingTruth: false,
  });
}

function isFormationPlacementDomain(value) {
  const domain = sourceActionDomain(value);
  if (isExactForcedChargeFailureDomain(domain)) return false;
  if (domain?.actionType === "use_active_ability"
    && domain?.effectContract?.targetKind === "self_place"
    && Array.isArray(domain?.parameterSchema?.placements?.modelIds)) {
    return true;
  }
  return FORMATION_ACTION_TYPES.has(String(domain?.actionType || ""))
    || domain?.parameterSchema?.placementPlan?.type
      === "complete_model_placement_plan"
    || Array.isArray(domain?.parameterSchema?.placements?.exactModelIds)
      && domain.parameterSchema.required?.includes("leadingModelId")
      && domain.parameterSchema.required?.includes("placements");
}

export function isStarcraftTmgFormationIntentReadyV1(selected,
  plannerResult) {
  if (selected?.kind !== "parameterized"
    || !isFormationPlacementDomain(selected.action)) return true;
  const intent = plannerResult?.formationSearchRequest;
  return object(intent)
    && String(intent.tacticalPurpose || "").trim().length > 0
    && Array.isArray(intent.formationObjectives)
    && intent.formationObjectives.length > 0;
}

function candidateEvidenceRequirements(input) {
  const preexecution = new Map((input.preexecutionSearch?.result?.hypotheses
    || []).map((entry) => [entry.candidateId, entry.successor || null]));
  return actionIndex(input.spatialActionSpace).map((entry) => {
    const actionType = String(entry.action?.actionType || "unknown");
    const exactBeforeApply = entry.kind === "parameterized"
      ? [isFormationPlacementDomain(entry.action)
        ? STARCRAFT_TMG_FORMATION_SOLVER_TOOL_NAME
        : isAssetPlacementDomain(entry.action)
          ? "legal_asset_placement_options" : null,
      "instantiate_parameterized_action"].filter(Boolean)
      : ["current_legalspace_membership"];
    const usefulQueries = [];
    if (/move|run|deploy|charge|disengage/u.test(actionType)) {
      usefulQueries.push("space.inspect_relationships", "fire_zone_exchange");
    }
    if (/attack|fight|charge|impact/u.test(actionType)) {
      usefulQueries.push("action_specific_threat", "fire_zone_exchange");
      if (entry.action?.parameterKind === OFFICIAL_SELECTED_ROSTER_RANGED_PARAMETER_KIND) {
        usefulQueries.push("attack_probability");
      }
    }
    if (/move|run|deploy|charge|attack|fight/u.test(actionType)) {
      usefulQueries.push("mission_marker_control");
    }
    const successor = preexecution.get(entry.id);
    return {
      candidateId: entry.id,
      kind: entry.kind,
      actionType,
      selectedActionIdentity: selectedActionIdentity(
        input.spatialActionSpace, entry.id),
      selectedActionResourceContract: selectedActionResourceContract(
        input.spatialActionSpace, entry.id),
      exactBeforeApply,
      usefulPlanningQueries: [...new Set(usefulQueries)],
      phaseControlSuccessor: PHASE_CONTROL_ACTIONS.has(actionType)
        ? {
          status: successor?.status || "unknown",
          successorHash: successor?.successorHash || null,
          nextPhase: successor?.nextPhase || null,
          nextFiniteActionTypes:
            clone(successor?.controlledSeatNextFiniteActionTypes || []),
          nextParameterizedActionTypes:
            clone(successor?.controlledSeatNextParameterizedActionTypes || []),
        } : null,
    };
  });
}

function phaseLifecycleContract(input) {
  const state = input?.roomProjection?.state || {};
  const source = state.officialRoundPhaseActivationDataBundle || {};
  const phaseSequence = (source.phaseSequence || []).map((entry) => ({
    ordinal: Number(entry.ordinal),
    phase: String(entry.phase || ""),
    printedName: String(entry.printedName || entry.phase || ""),
    alternatingActivation: entry.alternatingActivation === true,
    phaseActionTypes: strings(entry.phaseActionTypes),
    orderedOperations: strings(entry.orderedOperations),
  })).filter((entry) => entry.phase);
  const currentPhase = String(state.phase || "unknown");
  const rows = actionIndex(input.spatialActionSpace || {});
  const currentActions = rows.map((entry) => ({
    candidateId: entry.id,
    kind: entry.kind,
    actionType: String(entry.action?.actionType || "unknown"),
    pieceId: entry.action?.pieceId || null,
    phase: entry.action?.phase || currentPhase,
  }));
  const currentNonPassActionTypes = [...new Set(currentActions
    .filter((entry) => entry.actionType !== "pass")
    .map((entry) => entry.actionType))].sort();
  const currentPhaseDefinition = phaseSequence.find((entry) =>
    entry.phase === currentPhase) || null;
  const currentDeployDomains = (input.spatialActionSpace?.parameterDomains || [])
    .filter((entry) => entry.actionType === "deploy");
  return freeze({
    schemaVersion:
      `${STARCRAFT_TMG_LIVE_FLASH_DECISION_PORT_VERSION}.phase-lifecycle`,
    sourceBundleHash: source.bundleHash || null,
    phaseSequenceHash: source.phaseSequenceHash || null,
    currentRound: Number(state.round || 0),
    currentPhase,
    phaseSequence,
    currentPhaseDefinition,
    currentActions,
    currentNonPassActionTypes,
    currentDeployableReserveUnitIds: currentDeployDomains
      .map((entry) => entry.pieceId).filter(Boolean),
    currentAvailableSupply: currentDeployDomains.find((entry) =>
      Number.isFinite(Number(entry.constraints?.supply?.available)))
      ?.constraints?.supply?.available ?? null,
    passAvailable: currentActions.some((entry) => entry.actionType === "pass"),
    passCanForfeitCurrentActions: currentActions.some((entry) =>
      entry.actionType === "pass") && currentNonPassActionTypes.length > 0,
    ordinaryActionsArePhaseScoped: true,
    ordinaryActionMayNotBeDeferredToAnotherPhaseUnlessThatPhaseListsIt: true,
    currentLegalSpaceDoesNotProveFutureLegalSpace: true,
    futureActionRequiresSuccessorRulesEvidence: true,
    rulesAuthority: true,
    trainingTruth: false,
  });
}

function currentRangedContributionOverview(actionSpace, spatialObservation) {
  const liveModelsByUnit = new Map((spatialObservation?.units || []).map((unit) => [
    unit.unitId,
    [...new Set(unit.modelIds || [])].sort(),
  ]));
  const grouped = new Map();
  for (const domain of actionSpace?.parameterDomains || []) {
    if (domain.actionType !== "ranged_attack"
      || domain.parameterKind !== "official_selected_roster_ranged_target_v1") {
      continue;
    }
    for (const targetPlan of domain.constraints?.targetPlans || []) {
      const key = `${domain.pieceId || ""}:${targetPlan.targetUnitId || ""}`;
      if (!grouped.has(key)) grouped.set(key, {
        pieceId: domain.pieceId || null,
        targetUnitId: targetPlan.targetUnitId || null,
        weaponBatches: [],
      });
      const layout = targetPlan.chance?.layout || {};
      const eligibleAttackerModelIds = [...new Set(
        targetPlan.eligibleAttackerModelIds || [])].sort();
      grouped.get(key).weaponBatches.push({
        domainId: domain.domainId,
        profileKey: domain.profileKey || null,
        weaponName: domain.weaponName || null,
        eligibleAttackerModelIds,
        eligibleAttackerModelCount: eligibleAttackerModelIds.length,
        visibleTargetModelCount:
          new Set(targetPlan.visibleTargetModelIds || []).size,
        currentHitDice: Number(layout.hit || 0),
        currentSurgeDice: Number(layout.surge || 0),
        preallocatedArmourDice: Number(layout.armour || 0),
        preallocatedEvadeDice: Number(layout.evade || 0),
        exactAttackPlanHash: targetPlan.attackPlanHash || null,
      });
    }
  }
  return [...grouped.values()].map((entry) => {
    const currentLiveModelIds = liveModelsByUnit.get(entry.pieceId) || [];
    const contributingModelIds = [...new Set(entry.weaponBatches.flatMap((batch) =>
      batch.eligibleAttackerModelIds))].sort();
    const contributing = new Set(contributingModelIds);
    const nonContributingModelIds = currentLiveModelIds.filter((modelId) =>
      !contributing.has(modelId));
    entry.weaponBatches.sort((left, right) =>
      String(left.weaponName || "").localeCompare(String(right.weaponName || ""))
        || left.domainId.localeCompare(right.domainId));
    return {
      pieceId: entry.pieceId,
      targetUnitId: entry.targetUnitId,
      currentLiveModelCount: currentLiveModelIds.length,
      contributingModelIds,
      contributingModelCount: contributingModelIds.length,
      nonContributingModelIds,
      nonContributingModelCount: nonContributingModelIds.length,
      totalCurrentHitDice: entry.weaponBatches.reduce((sum, batch) =>
        sum + batch.currentHitDice, 0),
      weaponBatches: entry.weaponBatches,
      currentRulesDomainExact: true,
      futureMovementOutcomeNotImplied: true,
      activeSkillModifierUtilizationRequiresActionSpecificThreat: true,
    };
  }).sort((left, right) => left.pieceId.localeCompare(right.pieceId)
    || left.targetUnitId.localeCompare(right.targetUnitId));
}

export function projectStarcraftTmgPlanningActionSpaceForPromptV1(
  actionSpace, spatialObservation = null,
) {
  return freeze({
    schemaVersion:
      `${STARCRAFT_TMG_LIVE_FLASH_DECISION_PORT_VERSION}.planning-action-index`,
    authority: clone(actionSpace?.authority || null),
    finiteActions: (actionSpace?.finiteActions || []).map((entry) => ({
      candidateId: entry.candidateId,
      actionType: entry.action?.actionType || null,
      sideKey: entry.action?.sideKey || null,
      phase: entry.action?.phase || null,
      pieceId: entry.action?.pieceId || null,
      chosenFirstActorSideKey:
        entry.action?.chosenFirstActorSideKey || null,
    })),
    parameterDomains: (actionSpace?.parameterDomains || []).map((entry) => ({
      domainId: entry.domainId,
      parameterKind: entry.parameterKind || null,
      actionType: entry.actionType || null,
      authorityActionType: entry.authorityActionType || null,
      abilityName: entry.abilityName || null,
      effectKind: entry.effectKind || null,
      effectContract: clone(entry.effectContract || null),
      sourceKind: entry.sourceKind || null,
      sourceInstanceId: entry.sourceInstanceId || null,
      createdUnitRecordKey: entry.createdUnitRecordKey || null,
      sideKey: entry.sideKey || null,
      phase: entry.phase || null,
      pieceId: entry.pieceId || null,
      profileKey: entry.profileKey || null,
      weaponName: entry.weaponName || null,
      maxDistanceMilliInches:
        entry.constraints?.maxDistanceMilliInches ?? null,
      supply: clone(entry.constraints?.supply || null),
      resourceCostsByChoice:
        normalizedResourceCostsByChoice(entry),
      parameterContract: (() => {
        const contract = compileStarcraftTmgActionParameterContractV1(entry);
        return { selectableChoices: contract.selectableChoices,
          unavailableChoices: contract.unavailableChoices,
          targetUnitIds: clone(contract.fieldContracts.targetUnitId?.enum || null),
          paymentCombinationsByChoice: contract.paymentCombinationsByChoice,
          noPaymentCombinationMeansUnavailable: true,
          rulesInstantiationRequired: true };
      })(),
      strategicImmediateValue:
        clone(entry.constraints?.strategicImmediateValue || null),
      modelCount: entry.constraints?.modelProfiles?.length || 0,
      exactRulesInstantiationRequired: true,
    })),
    rangedContributionOverview:
      currentRangedContributionOverview(actionSpace, spatialObservation),
    fullSelectedDomainIsProvidedOnlyToTheActionStage: true,
    spatialObservationBoundForContributionSummary:
      object(spatialObservation),
    trainingTruth: false,
  });
}

function casualtyDomainForPrompt(domain) {
  const projected = clone(domain);
  if (!["official_selected_roster_ranged_casualty_selection_v1",
    "official_selected_roster_melee_casualty_selection_v1"].includes(
      domain?.parameterKind)) return projected;
  // Presentation only: share identical JSON columns, never truncate legal
  // selections or pick casualties for the player. The full domain remains in
  // Rules, the durable choice and the Host's parameter materializer.
  for (const field of ["strategicLossOptions", "legalSelections"]) {
    const rows = domain.constraints?.[field];
    if (Array.isArray(rows)) projected.constraints[field] =
      encodeStarcraftTmgGeometryColumnReuseV2(rows);
  }
  return projected;
}

function selectedActionSpace(actionSpace, candidateId) {
  return freeze({
    schemaVersion:
      `${STARCRAFT_TMG_LIVE_FLASH_DECISION_PORT_VERSION}.selected-action-space`,
    authority: clone(actionSpace?.authority || null),
    finiteActions: (actionSpace?.finiteActions || []).filter((entry) =>
      entry.candidateId === candidateId).map(clone),
    parameterDomains: (actionSpace?.parameterDomains || []).filter((entry) =>
      entry.domainId === candidateId).map(entry => ({ ...casualtyDomainForPrompt(entry),
        parameterContract: compileStarcraftTmgActionParameterContractV1(entry) })),
    selectedActionIdentity: selectedActionIdentity(actionSpace, candidateId),
    selectedActionResourceContract:
      selectedActionResourceContract(actionSpace, candidateId),
    selectedByPlanner: true,
    exactRulesInstantiationRequired: true,
    trainingTruth: false,
  });
}

function correctionError(code, detail = "", issues = []) {
  return Object.assign(new TypeError(detail || code), {
    code,
    correction: detail ? `${code}:${detail}` : code,
    correctionIssues: clone(issues),
    severity: "High",
  });
}

function threatCorrectionIssues(threatClaims, code) {
  return (threatClaims.contradictions || []).map(entry => ({
    code, field: entry.field, claimText: entry.text,
    source: entry.source, threatKind: entry.threatKind,
    facts: clone(entry.threatFacts || []),
  }));
}

// Consumed by the real persistence path. Historical findings are regression
// guards, not new verdicts, strategy recommendations, or Rules authority.
export function buildStarcraftTmgSemanticCorrectionFeedbackV1({
  stage, correction, issues = [], history = [],
  providerInteractionMode = "native_tools",
} = {}) {
  const code = String(correction || "DECISION_SEMANTIC_CORRECTION_REQUIRED")
    .split(":", 1)[0];
  const currentIssues = issues.length ? clone(issues)
    : [{ code, detail: String(correction || code) }];
  const regressionGuards = [];
  const seen = new Set();
  for (const previous of history.filter(entry => entry.stage === stage)) {
    const priorIssues = previous.issues?.length ? previous.issues : [{
      code: String(previous.correction || "").split(":", 1)[0],
      detail: previous.correction,
    }];
    for (const issue of priorIssues) {
      const key = JSON.stringify(issue);
      if (!seen.has(key)) {
        seen.add(key);
        regressionGuards.push(clone(issue));
      }
    }
  }
  const planning = stage === "planning";
  return freeze({
    schemaVersion: "starcraft_tmg_semantic_correction_feedback_v1",
    stage,
    current: { code, detail: String(correction || code), issues: currentIssues },
    regressionGuards,
    historicalConstraintsAreNotCurrentVerdicts: true,
    instructions: [
      "Correct all current issues together, not just the first reported issue.",
      "Preserve supported facts and recheck previous constraints against current evidence; do not reintroduce earlier defects.",
      "Current-position facts are not post-placement safety proofs. Keep unverified future geometry separate from current facts.",
      "Do not copy prior rejected text or invent evidence. The action and strategic tradeoff remain your decision.",
      "Submit the required current stage using its declared protocol; this feedback does not authorize extra retries.",
    ],
    submissionProtocol: providerInteractionMode === "json_channels_v1"
      ? { mode: providerInteractionMode,
        requiredChannel: planning ? "planning" : "decision",
        outputFormat: "one_json_object_using_declared_channel" }
      : { mode: providerInteractionMode,
        requiredTool: planning ? NATIVE_PLANNING_SUBMIT_TOOL_NAME
          : NATIVE_DECISION_SUBMIT_TOOL_NAME },
    strategyRecommendationProvided: false,
    rulesAuthority: false, mayOverrideRules: false, trainingTruth: false,
  });
}

export function describeStarcraftTmgFormationIntentCorrectionV1({
  selected, recommendedCandidateId,
} = {}) {
  const candidateId = String(recommendedCandidateId || selected?.id || "");
  const actionType = String(selected?.action?.actionType || "unknown");
  const pieceId = String(selected?.action?.pieceId || "unknown Unit");
  return `Selected current candidate ${candidateId} is a parameterized ${
    actionType} for ${pieceId}. If retaining this candidate, set `
    + "formationSearchRequested=true and supply a nonempty "
    + "formationTacticalPurpose and weighted formationObjectives with "
    + "visible targetIds. If the intended immediate action differs, select "
    + "its actual candidate from the current action index and align the "
    + "plan, assessment, and public summary with that choice; do not name "
    + "an action absent from the current index.";
}

function validateLifecycleAssessment(value, input, candidateId) {
  if (!object(value)) {
    throw correctionError("DECISION_LIFECYCLE_ASSESSMENT_REQUIRED");
  }
  const lifecycle = phaseLifecycleContract(input);
  const currentPhase = String(value.currentPhase || "");
  if (currentPhase !== lifecycle.currentPhase) {
    throw correctionError("DECISION_CURRENT_PHASE_MISMATCH",
      `${currentPhase || "missing"}->${lifecycle.currentPhase}`);
  }
  const selected = lifecycle.currentActions.find((entry) =>
    entry.candidateId === candidateId);
  if (!selected) {
    throw correctionError("DECISION_LIFECYCLE_CANDIDATE_MISSING", candidateId);
  }
  const forfeited = [...new Set(strings(value.forfeitedCurrentActionTypes))]
    .sort();
  if (selected.actionType === "pass"
    && lifecycle.passCanForfeitCurrentActions) {
    if (value.acknowledgesForfeitedCurrentActions !== true) {
      throw correctionError("DECISION_PASS_FORFEITURE_NOT_ACKNOWLEDGED",
        lifecycle.currentNonPassActionTypes.join(","));
    }
    const missing = lifecycle.currentNonPassActionTypes.filter((entry) =>
      !forfeited.includes(entry));
    if (missing.length) {
      throw correctionError("DECISION_PASS_FORFEITURE_INCOMPLETE",
        missing.join(","));
    }
  }
  const followUps = Array.isArray(value.plannedFollowUpActions)
    ? value.plannedFollowUpActions : [];
  const phaseByOrdinaryAction = new Map();
  for (const phase of lifecycle.phaseSequence) {
    for (const actionType of phase.phaseActionTypes) {
      const phases = phaseByOrdinaryAction.get(actionType) || [];
      phases.push(phase.phase);
      phaseByOrdinaryAction.set(actionType, phases);
    }
  }
  for (const [index, followUp] of followUps.entries()) {
    if (!object(followUp)) {
      throw correctionError("DECISION_FOLLOW_UP_INVALID", String(index));
    }
    const phase = String(followUp.phase || "");
    const actionType = String(followUp.actionType || "");
    if (!phase || !actionType) {
      throw correctionError("DECISION_FOLLOW_UP_INCOMPLETE", String(index));
    }
    if (!String(followUp.evidence || "").trim()) {
      throw correctionError("DECISION_FOLLOW_UP_EVIDENCE_REQUIRED",
        String(index));
    }
    const allowed = phaseByOrdinaryAction.get(actionType);
    if (allowed && !allowed.includes(phase)) {
      throw correctionError("DECISION_FUTURE_ACTION_PHASE_INVALID",
        `${actionType}:${phase}:allowed=${allowed.join("|")}`);
    }
  }
  const successor = input.preexecutionSearch?.result?.hypotheses?.find((entry) =>
    entry.candidateId === candidateId)?.successor || null;
  if (PHASE_CONTROL_ACTIONS.has(selected.actionType)
    && successor?.status === "exact") {
    if (value.successorEvidenceRef !== successor.successorHash) {
      throw correctionError("DECISION_SUCCESSOR_EVIDENCE_NOT_USED",
        successor.successorHash);
    }
    const immediateTypes = new Set([
      ...(successor.controlledSeatNextFiniteActionTypes || []),
      ...(successor.controlledSeatNextParameterizedActionTypes || []),
    ]);
    for (const followUp of followUps.filter((entry) =>
      entry?.phase === successor.nextPhase)) {
      if (!immediateTypes.has(followUp.actionType)) {
        throw correctionError("DECISION_SUCCESSOR_ACTION_NOT_EXPOSED",
          `${successor.nextPhase}:${followUp.actionType}`);
      }
    }
  }
  return freeze({
    currentPhase,
    selectedActionType: selected.actionType,
    acknowledgesForfeitedCurrentActions:
      value.acknowledgesForfeitedCurrentActions === true,
    forfeitedCurrentActionTypes: forfeited,
    plannedFollowUpActions: clone(followUps),
    successorEvidenceRef: value.successorEvidenceRef || null,
    opportunityCostSummary: text(value.opportunityCostSummary,
      "No unverified future action is used as the basis of this decision."),
    rulesAuthority: false,
    trainingTruth: false,
  });
}

function normalizePlannerOutput(raw, input, queryReceipts = []) {
  if (!object(raw)) {
    throw correctionError("PLANNER_OUTPUT_REQUIRED");
  }
  const actions = actionIndex(input.spatialActionSpace);
  const recommendedCandidateId = String(raw.recommendedCandidateId || "");
  const existingPlan = input.planState?.plan || null;
  const publicPlanSummary = object(raw.publicPlanSummary)
    ? JSON.stringify(raw.publicPlanSummary)
    : text(raw.publicPlanSummary, "");
  const normalizedPlan = !existingPlan && object(raw.plan) ? {
    ...clone(raw.plan),
    objective: String(raw.plan.objective || raw.plan.goal || "").trim(),
    currentGoal: String(raw.plan.currentGoal || raw.plan.goal
      || raw.plan.objective || "").trim(),
  } : null;
  if (!actions.some((entry) => entry.id === recommendedCandidateId)) {
    throw correctionError("PLANNER_CANDIDATE_NOT_CURRENT",
      recommendedCandidateId || "missing");
  }
  if (!existingPlan && !object(raw.plan)) {
    throw correctionError("PLANNER_INITIAL_PLAN_OBJECT_REQUIRED");
  }
  if (!existingPlan
    && (!String(normalizedPlan?.objective || "").trim()
      || !String(normalizedPlan?.currentGoal || "").trim())) {
    throw correctionError("PLANNER_INITIAL_PLAN_CONTENT_REQUIRED",
      "objective,currentGoal");
  }
  if (!existingPlan && raw.plan !== undefined && raw.plan !== null
    && !object(raw.plan)) {
    throw correctionError("PLANNER_PLAN_TYPE_INVALID");
  }
  if (!object(raw.assessment)) {
    throw correctionError("PLANNER_ASSESSMENT_OBJECT_REQUIRED");
  }
  if (!["continue", "revise", "complete", "abandon"]
    .includes(raw.assessment.verdict)) {
    throw correctionError("PLANNER_ASSESSMENT_VERDICT_INVALID");
  }
  if (!["sound", "at_risk", "invalid", "achieved"]
    .includes(raw.assessment.health)) {
    throw correctionError("PLANNER_ASSESSMENT_HEALTH_INVALID");
  }
  for (const field of ["continuitySummary", "currentGoal",
    "nextDecisionFocus"]) {
    if (!String(raw.assessment[field] || "").trim()) {
      throw correctionError("PLANNER_ASSESSMENT_CONTENT_REQUIRED", field);
    }
  }
  for (const field of ["evidenceFor", "evidenceAgainst",
    "changedAssumptions", "opponentModelUpdates", "unresolvedRisks"]) {
    if (!Array.isArray(raw.assessment[field])) {
      throw correctionError("PLANNER_ASSESSMENT_EVIDENCE_ARRAY_REQUIRED",
        field);
    }
  }
  let normalizedPlanRevision = object(raw.planRevision)
    ? clone(raw.planRevision) : null;
  let reconstructedPlanRevision = false;
  if (existingPlan && raw.assessment.verdict === "revise"
    && !normalizedPlanRevision) {
    const suppliedRevision = object(raw.plan) ? raw.plan : {};
    normalizedPlanRevision = {
      ...clone(existingPlan),
      ...clone(suppliedRevision),
      objective: String(suppliedRevision.objective
        || existingPlan.objective || raw.assessment.currentGoal).trim(),
      currentGoal: String(suppliedRevision.currentGoal
        || suppliedRevision.goal || raw.assessment.currentGoal).trim(),
      revisionReason: String(suppliedRevision.revisionReason
        || raw.assessment.continuitySummary).trim(),
    };
    reconstructedPlanRevision = true;
  }
  if (!existingPlan && raw.assessment.verdict === "revise"
    && !normalizedPlanRevision && normalizedPlan) {
    normalizedPlanRevision = {
      ...clone(normalizedPlan),
      revisionReason: String(normalizedPlan.revisionReason
        || raw.assessment.continuitySummary).trim(),
    };
    reconstructedPlanRevision = true;
  }
  if (raw.assessment.verdict === "revise" && !normalizedPlanRevision) {
    throw correctionError("PLANNER_REVISION_OBJECT_REQUIRED");
  }
  if (!Array.isArray(raw.informationNeeds)) {
    throw correctionError("PLANNER_INFORMATION_NEEDS_ARRAY_REQUIRED");
  }
  for (const [index, need] of raw.informationNeeds.entries()) {
    const queryKind = String(need?.queryKind || "");
    if (!object(need) || !NATIVE_QUERY_KINDS.includes(queryKind)
      || !["needed", "satisfied", "unknown", "not_applicable"]
        .includes(need.status)
      || !String(need.reason || "").trim()) {
      throw correctionError("PLANNER_INFORMATION_NEED_INVALID", String(index));
    }
  }
  if (!Array.isArray(raw.candidateComparisons)
    || actions.length > 1 && raw.candidateComparisons.length < 1) {
    throw correctionError("PLANNER_CANDIDATE_COMPARISONS_REQUIRED");
  }
  const compared = new Set();
  const validComparisons = [];
  let ignoredStaleComparisonCount = 0;
  for (const [index, comparison] of raw.candidateComparisons.entries()) {
    const candidateId = String(comparison?.candidateId || "");
    const current = actions.some((entry) => entry.id === candidateId);
    if (!current) {
      ignoredStaleComparisonCount += 1;
      continue;
    }
    const hasEvaluation = String(comparison?.evaluation
      || comparison?.reason || "").trim();
    if (!object(comparison) || !hasEvaluation) {
      throw correctionError("PLANNER_CANDIDATE_COMPARISON_INVALID",
        String(index));
    }
    if (compared.has(candidateId)) continue;
    compared.add(candidateId);
    validComparisons.push(clone(comparison));
  }
  if (actions.length > 1 && !compared.has(recommendedCandidateId)) {
    throw correctionError("PLANNER_SELECTED_CANDIDATE_NOT_COMPARED",
      recommendedCandidateId);
  }
  const pass = actions.find((entry) => entry.action?.actionType === "pass");
  const selected = actions.find((entry) => entry.id === recommendedCandidateId);
  const threatClaims = inspectStarcraftTmgFormationThreatClaimsV1({
    raw, queryReceipts,
    spatialObservation: input.spatialObservation,
    plannerSelectedAction: sourceActionDomain(selected?.action),
    roomProjection: input.roomProjection,
    matchMemory: input.matchMemory,
    currentPlan: input.planState?.plan,
  });
  if (pass && actions.length > 1 && !compared.has(pass.id)) {
    throw correctionError("PLANNER_PASS_OPPORTUNITY_COST_NOT_COMPARED",
      pass.id, [{ code: "PLANNER_PASS_OPPORTUNITY_COST_NOT_COMPARED",
        field: "candidateComparisons", missingCandidateId: pass.id,
        actionType: "pass" }, ...threatCorrectionIssues(threatClaims,
        "PLANNER_SELECTION_THREAT_CLAIM_CONTRADICTS_PROJECTION")]);
  }
  const immediateValue = sourceActionDomain(selected?.action)
    ?.constraints?.strategicImmediateValue || null;
  if (immediateValue?.zeroBenefit === true && actions.length > 1) {
    throw correctionError("PLANNER_SELECTED_ZERO_CURRENT_BENEFIT_ACTION",
      `${recommendedCandidateId}:${immediateValue.kind || "unknown"}`);
  }
  const identityClaims = inspectStarcraftTmgSelectedActionIdentityClaimsV1({
    spatialActionSpace: input.spatialActionSpace,
    candidateId: recommendedCandidateId,
    stage: "planning",
    value: raw,
  });
  if (identityClaims.status === "contradicted") {
    const first = identityClaims.contradictions[0];
    throw correctionError("PLANNER_SELECTED_ACTION_IDENTITY_CONTRADICTED",
      selectedActionIdentityContradictionDetail(first), identityClaims.correctionIssues);
  }
  const futurePlanRequirement = identityClaims.selectedIdentity
    ?.effectContract?.futurePlanRequirement;
  if (futurePlanRequirement?.required === true) {
    const resultingPlan = object(normalizedPlanRevision)
      ? normalizedPlanRevision : object(normalizedPlan)
        ? normalizedPlan : raw.futureActionPlanAmendment ? {
          ...existingPlan,
          futureActionPlans: raw.futureActionPlanAmendment.futureActionPlans,
        } : existingPlan;
    const matchingFuturePlan = (Array.isArray(resultingPlan?.futureActionPlans)
      ? resultingPlan.futureActionPlans : []).find((entry) =>
      object(entry)
        && String(entry.enablingCandidateId || "") === recommendedCandidateId);
    if (!matchingFuturePlan) {
      throw correctionError("PLANNER_REQUIRED_FUTURE_ACTION_PLAN_MISSING",
        `${recommendedCandidateId}:${futurePlanRequirement.capabilityKind
          || identityClaims.selectedIdentity.effectKind}`);
    }
    if (existingPlan && raw.assessment.verdict !== "revise"
      && !raw.futureActionPlanAmendment) {
      throw correctionError("PLANNER_REQUIRED_FUTURE_ACTION_PLAN_NOT_REVISED",
        recommendedCandidateId);
    }
    const missingFields = ["planItemId", "intendedUnitId", "actionType",
      "earliestTiming", "targetOrRoute", "purpose", "fallback"]
      .filter((field) => !String(matchingFuturePlan[field] || "").trim());
    const missingLists = ["benefitEvidenceRefs", "riskEvidenceRefs",
      "prerequisites", "cancelIf"].filter((field) =>
      !Array.isArray(matchingFuturePlan[field])
        || matchingFuturePlan[field].length < 1);
    if (missingFields.length || missingLists.length) {
      throw correctionError("PLANNER_REQUIRED_FUTURE_ACTION_PLAN_INCOMPLETE",
        [...missingFields, ...missingLists].join(","));
    }
  }
  const resourceClaims = inspectStarcraftTmgSelectedActionResourceClaimsV1({
    spatialActionSpace: input.spatialActionSpace,
    candidateId: recommendedCandidateId,
    stage: "planning",
    value: raw,
  });
  if (resourceClaims.status === "contradicted") {
    const first = resourceClaims.contradictions[0];
    throw correctionError("PLANNER_SELECTED_ACTION_RESOURCE_CONTRADICTED",
      resourceContradictionDetail(first), resourceClaims.correctionIssues);
  }
  if (threatClaims.contradicted) {
    const first = threatClaims.contradictions[0];
    throw correctionError(
      "PLANNER_SELECTION_THREAT_CLAIM_CONTRADICTS_PROJECTION",
      threatContradictionDetail(first),
      threatCorrectionIssues(threatClaims,
        "PLANNER_SELECTION_THREAT_CLAIM_CONTRADICTS_PROJECTION"),
    );
  }
  const supplyClaims = inspectStarcraftTmgUnitSupplyClaimsV1({
    spatialObservation: input.spatialObservation,
    value: raw,
  });
  if (supplyClaims.status === "contradicted") {
    throw correctionError("PLANNER_UNIT_SUPPLY_CLAIM_CONTRADICTED",
      unitSupplyContradictionDetail(supplyClaims.contradictions[0]));
  }
  const selectedChargeTargetUnitId = String(
    raw.selectedChargeTargetUnitId || "").trim();
  const selectedCharge = inspectStarcraftTmgSelectedChargeReachabilityV1({
    spatialActionSpace: input.spatialActionSpace,
    candidateId: recommendedCandidateId,
    targetUnitId: selectedChargeTargetUnitId,
    queryReceipts,
    spatialObservation: input.spatialObservation,
  });
  if (selected?.action?.actionType === "charge"
    && !selectedChargeTargetUnitId) {
    throw correctionError("PLANNER_CHARGE_TARGET_REQUIRED",
      "Name one eligible intended target Unit in selectedChargeTargetUnitId before selecting Charge.");
  }
  if (selected?.action?.actionType === "charge"
    && selectedCharge.status === "invalid_target") {
    throw correctionError("PLANNER_CHARGE_TARGET_NOT_ELIGIBLE",
      selectedChargeTargetUnitId);
  }
  if (selected?.action?.actionType === "charge"
    && selectedCharge.status !== "exact") {
    throw correctionError("PLANNER_CHARGE_REACHABILITY_EVIDENCE_REQUIRED",
      `Exact physical base-edge distance from ${selectedCharge.pieceId
        || selected?.action?.pieceId || "selected Unit"} to intended target ${
        selectedChargeTargetUnitId} is unavailable; do not assert reachability.`);
  }
  if (selected?.action?.actionType === "charge"
    && selectedCharge.certainDistanceShortfall === true) {
    throw correctionError("PLANNER_CERTAIN_CHARGE_DISTANCE_SHORTFALL",
      `Intended target ${selectedChargeTargetUnitId} base edge ${
        selectedCharge.baseEdgeDistanceMilliInches} milli-inches requires ${
        selectedCharge.minimumMoveToEngageMilliInches} milli-inches to engage; maximum Charge move ${
        selectedCharge.maximumDistanceMilliInches} milli-inches. Select another current candidate or a genuinely reachable target; do not declare this certainly failed Charge.`);
  }
  const formationAlternatives = actions.filter((entry) =>
    entry.id !== pass?.id && entry.kind === "parameterized"
      && isFormationPlacementDomain(entry.action));
  if (selected?.action?.actionType === "pass"
    && formationAlternatives.length > 0) {
    const rawText = JSON.stringify(raw);
    const citedPreselectionParameterFailure = queryReceipts.some((entry) =>
      PLANNING_POST_SELECTION_QUERY_KINDS.has(String(entry?.queryKind || ""))
        && entry?.status !== "exact"
        && String(entry?.reason || "").trim()
        && rawText.includes(String(entry.reason)));
    if (citedPreselectionParameterFailure) {
      throw correctionError(
        "PLANNER_PASS_USED_PRESELECTION_PARAMETER_FAILURE",
        "Select from current candidates using current relationships; the Host solves complete formation parameters only after candidate selection.",
      );
    }
  }
  const formationSearchRequest = object(raw.formationSearchRequest)
    ? clone(raw.formationSearchRequest) : null;
  if (selected?.kind === "parameterized"
    && isFormationPlacementDomain(selected.action)) {
    if (!formationSearchRequest
      || !String(formationSearchRequest.tacticalPurpose || "").trim()
      || !Array.isArray(formationSearchRequest.formationObjectives)
      || formationSearchRequest.formationObjectives.length < 1) {
      throw correctionError("PLANNER_FORMATION_INTENT_REQUIRED",
        describeStarcraftTmgFormationIntentCorrectionV1({
          selected, recommendedCandidateId,
        }));
    }
  }
  if (!publicPlanSummary.trim()) {
    throw correctionError("PLANNER_PUBLIC_SUMMARY_REQUIRED");
  }
  const lifecycleAssessment = validateLifecycleAssessment(
    raw.lifecycleAssessment, input, recommendedCandidateId);
  return freeze({
    recommendedCandidateId,
    selectedChargeTargetUnitId: selected?.action?.actionType === "charge"
      ? selectedChargeTargetUnitId : null,
    plan: object(normalizedPlan) ? clone(normalizedPlan) : null,
    ...(plannerOpponentModelSnapshot(raw, input) ? {
      opponentModelSnapshot: plannerOpponentModelSnapshot(raw, input),
    } : {}),
    assessment: clone(raw.assessment),
    ...(object(raw.plannerGoalContract) ? {
      plannerGoalContract: clone(raw.plannerGoalContract),
    } : {}),
    planRevision: normalizedPlanRevision,
    ...(raw.futureActionPlanAmendment ? {
      futureActionPlanAmendment: clone(raw.futureActionPlanAmendment),
    } : {}),
    reconstructedPlanRevision,
    informationNeeds: Array.isArray(raw.informationNeeds)
      ? clone(raw.informationNeeds) : [],
    candidateComparisons: validComparisons,
    ignoredStaleComparisonCount,
    formationSearchRequest,
    assetPlacementSearchRequest: object(raw.assetPlacementSearchRequest)
      ? clone(raw.assetPlacementSearchRequest) : null,
    requiredEvidence: candidateEvidenceRequirements(input).find((entry) =>
      entry.candidateId === recommendedCandidateId) || null,
    selectedActionIdentity: identityClaims.selectedIdentity,
    selectedActionResourceContract: resourceClaims.resourceContract,
    advisoryFindings: clone(threatClaims.advisoryFindings),
    lifecycleAssessment,
    publicPlanSummary,
    hiddenChainOfThoughtStored: false,
    trainingTruth: false,
  });
}

function validateActionOutput(raw, input, planner, queryReceipts = []) {
  if (!object(raw)) throw correctionError("ACTION_OUTPUT_REQUIRED");
  const actions = actionIndex(input.spatialActionSpace);
  const { selected } = selectedProposal(raw, actions);
  if (selected.id !== planner.recommendedCandidateId) {
    throw correctionError("ACTION_DEPARTED_FROM_PLANNER",
      `${selected.id}->${planner.recommendedCandidateId}`);
  }
  const identityClaims = inspectStarcraftTmgSelectedActionIdentityClaimsV1({
    spatialActionSpace: input.spatialActionSpace,
    candidateId: selected.id,
    stage: "action",
    value: raw,
  });
  if (identityClaims.status === "contradicted") {
    const first = identityClaims.contradictions[0];
    throw correctionError("ACTION_SELECTED_ACTION_IDENTITY_CONTRADICTED",
      selectedActionIdentityContradictionDetail(first), identityClaims.correctionIssues);
  }
  const resourceClaims = inspectStarcraftTmgSelectedActionResourceClaimsV1({
    spatialActionSpace: input.spatialActionSpace,
    candidateId: selected.id,
    stage: "action",
    value: raw,
  });
  if (resourceClaims.status === "contradicted") {
    const first = resourceClaims.contradictions[0];
    throw correctionError("ACTION_SELECTED_ACTION_RESOURCE_CONTRADICTED",
      resourceContradictionDetail(first), resourceClaims.correctionIssues);
  }
  const threatClaims = inspectStarcraftTmgFormationThreatClaimsV1({
    raw,
    queryReceipts,
    spatialObservation: input.spatialObservation,
    plannerSelectedAction: selected.action,
  });
  if (threatClaims.contradicted) {
    const first = threatClaims.contradictions[0];
    throw correctionError(
      "ACTION_SELECTION_THREAT_CLAIM_CONTRADICTS_PROJECTION",
      threatContradictionDetail(first),
    );
  }
  const supplyClaims = inspectStarcraftTmgUnitSupplyClaimsV1({
    spatialObservation: input.spatialObservation,
    value: raw,
  });
  if (supplyClaims.status === "contradicted") {
    throw correctionError("ACTION_UNIT_SUPPLY_CLAIM_CONTRADICTED",
      unitSupplyContradictionDetail(supplyClaims.contradictions[0]));
  }
  const issues = [];
  const intent = object(raw.intent) ? raw.intent : {};
  const summary = object(raw.publicDecisionSummary)
    ? raw.publicDecisionSummary : {};
  if (!object(raw.intent)) issues.push("ACTION_INTENT_OBJECT_REQUIRED");
  if (!object(raw.publicDecisionSummary)) {
    issues.push("ACTION_PUBLIC_SUMMARY_OBJECT_REQUIRED");
  }
  for (const field of ["selectedReason", "scoreOrPositionValue", "risk"]) {
    if (!String(raw[field] || "").trim()) {
      issues.push(`ACTION_PUBLIC_REASON_FIELD_REQUIRED:${field}`);
    }
  }
  if (!Array.isArray(raw.rejectedAlternatives)) {
    issues.push("ACTION_REJECTED_ALTERNATIVES_ARRAY_REQUIRED");
  }
  for (const field of ["currentGoal", "purpose", "expectedOwnOutcome",
    "nextDecisionFocus"]) {
    if (!String(intent[field] || "").trim()) {
      issues.push(`ACTION_INTENT_FIELD_REQUIRED:${field}`);
    }
  }
  for (const field of ["expectedEffects", "predictedOpponentResponses",
    "tradeoffs", "risks", "fallbacks", "stopOrReplanTriggers", "unitIds",
    "skillsUsed", "abilitiesIntended", "resourcesIntended"]) {
    if (!Array.isArray(intent[field])) {
      issues.push(`ACTION_INTENT_ARRAY_REQUIRED:${field}`);
    }
  }
  for (const [index, response] of
    (Array.isArray(intent.predictedOpponentResponses)
      ? intent.predictedOpponentResponses : []).entries()) {
    if (!object(response) || !String(response.actionClass || "").trim()
      || !String(response.opponentAction || "").trim()
      || !object(response.horizon)
      || !new Set(["next_opponent_action", "current_phase", "current_round",
        "bounded_public_transitions"]).has(response.horizon.kind)
      || !Number.isFinite(Number(response.confidence))
      || Number(response.confidence) < 0 || Number(response.confidence) > 1
      || !Array.isArray(response.basis)
      || !Array.isArray(response.evidenceRefs)
      || !Array.isArray(response.invalidationCriteria)
      || !String(response.counterResponse || "").trim()
      || !String(response.counterPurpose || "").trim()) {
      issues.push(`ACTION_OPPONENT_RESPONSE_INVALID:${index}`);
    }
  }
  const predictionFeasibility =
    inspectStarcraftTmgOpponentPredictionFeasibilityV1({
      responses: intent.predictedOpponentResponses || [],
      spatialObservation: input.spatialObservation,
      currentPhase: input.roomProjection?.state?.phase,
      queryReceipts,
      ownAction: raw,
    });
  if (predictionFeasibility.status === "contradicted") {
    const first = predictionFeasibility.contradictions[0];
    throw correctionError(
      "ACTION_OPPONENT_PREDICTION_LIFECYCLE_CONTRADICTED",
      `${first.responseId || first.index}:${first.actorId}:${
        first.actionClass || "unknown"}:${first.reason}:${
        first.repairHint || "replace_with_lifecycle_consistent_prediction"}`,
      predictionFeasibility.correctionIssues,
    );
  }
  for (const [index, tradeoff] of
    (Array.isArray(intent.tradeoffs) ? intent.tradeoffs : []).entries()) {
    if (!object(tradeoff) || !String(tradeoff.benefit || "").trim()
      || !String(tradeoff.cost || "").trim()
      || !String(tradeoff.acceptanceReason || "").trim()) {
      issues.push(`ACTION_TRADEOFF_INVALID:${index}`);
    }
  }
  if (!Array.isArray(summary.visibleFacts)
    || summary.visibleFacts.length < 1
    || !String(summary.plan || "").trim()) {
    issues.push("ACTION_PUBLIC_SUMMARY_CONTENT_REQUIRED");
  }
  let lifecycleAssessment = null;
  try {
    lifecycleAssessment = validateLifecycleAssessment(
      raw.lifecycleAssessment, input, selected.id);
  } catch (error) {
    issues.push(String(error?.correction || error?.code
      || "DECISION_LIFECYCLE_ASSESSMENT_INVALID"));
  }
  if (issues.length) {
    throw correctionError("ACTION_OUTPUT_CONTRACT_VIOLATIONS",
      [...new Set(issues)].join("|"));
  }
  return lifecycleAssessment;
}

function exactFormationReceipt(queryReceipts, domainId) {
  return [...(queryReceipts || [])].reverse().find((entry) =>
    FORMATION_QUERY_KINDS.has(entry?.queryKind)
      && entry?.status === "exact"
      && entry?.result?.domainId === domainId
      && Array.isArray(entry?.result?.formationOptions)
      && entry.result.formationOptions.length > 0) || null;
}

function exactAssetPlacementReceipt(queryReceipts, domainId) {
  return [...(queryReceipts || [])].reverse().find((entry) =>
    entry?.queryKind === "legal_asset_placement_options"
      && entry?.status === "exact"
      && entry?.result?.domainId === domainId
      && Array.isArray(entry?.result?.placementOptions)
      && entry.result.placementOptions.length > 0) || null;
}

function exactInstantiationReceipt(queryReceipts, domainId) {
  return [...(queryReceipts || [])].reverse().find((entry) =>
    entry?.queryKind === "instantiate_parameterized_action"
      && entry?.status === "exact"
      && entry?.result?.domainId === domainId
      && entry?.result?.proposalAccepted === true
      && object(entry?.result?.canonicalParameters)) || null;
}

function singletonDomainParameters(domain) {
  if (isExactForcedChargeFailureDomain(domain)) {
    return {
      outcome: "failure",
      failureProof: { kind: domain.parameterSchema.failureProofKind },
    };
  }
  const source = sourceActionDomain(domain);
  const schema = source?.parameterSchema;
  if (source?.actionType === "resolve_impact"
    && schema?.singleTargetForcedAllocation === true
    && Array.isArray(schema.required) && schema.required.length === 1
    && schema.required[0] === "allocations"
    && Array.isArray(schema.targetUnitIds)
    && schema.targetUnitIds.length === 1
    && Array.isArray(schema.eligibleModels)
    && schema.eligibleModels.length > 0) {
    const targetUnitId = schema.targetUnitIds[0];
    const seen = new Set();
    const allocations = [];
    for (const model of schema.eligibleModels) {
      const modelId = String(model?.modelId || "");
      const dice = Number(model?.impactDice);
      if (!modelId || seen.has(modelId)
        || !Number.isSafeInteger(dice) || dice <= 0
        || !Array.isArray(model?.eligibleTargetUnitIds)
        || model.eligibleTargetUnitIds.length !== 1
        || model.eligibleTargetUnitIds[0] !== targetUnitId) return null;
      seen.add(modelId);
      allocations.push({ modelId, targetUnitId, dice });
    }
    if (allocations.reduce((sum, entry) => sum + entry.dice, 0)
      !== Number(schema.exactTotal)) return null;
    return { allocations: allocations.sort((left, right) => (
      left.modelId.localeCompare(right.modelId))) };
  }
  if (!object(schema) || !Array.isArray(schema.required)) return null;
  const parameters = {};
  for (const field of schema.required) {
    const fieldSchema = schema[field];
    if (!object(fieldSchema)) return null;
    if (Object.hasOwn(fieldSchema, "const")) {
      parameters[field] = clone(fieldSchema.const);
    } else if (Array.isArray(fieldSchema.enum)
      && fieldSchema.enum.length === 1) {
      parameters[field] = clone(fieldSchema.enum[0]);
    } else {
      return null;
    }
  }
  return parameters;
}

export function resolveStarcraftTmgDeterministicSingletonActionV1(
  actions = [],
) {
  if (!Array.isArray(actions) || actions.length !== 1) return null;
  const selected = actions[0];
  if (selected?.kind === "finite" && object(selected.proposal)) {
    return freeze({ selected: clone(selected), proposal: clone(selected.proposal),
      parameterBinding: "finite", trainingTruth: false });
  }
  if (selected?.kind !== "parameterized") return null;
  const parameters = singletonDomainParameters(selected.action);
  if (!object(parameters)) return null;
  return freeze({ selected: clone(selected), proposal: {
    kind: "parameterized", domainId: selected.id, parameters,
  }, parameterBinding: sourceActionDomain(selected.action)?.actionType === "resolve_impact"
    && sourceActionDomain(selected.action)?.parameterSchema
      ?.singleTargetForcedAllocation === true
    ? "single_target_forced_impact" : "singleton_domain",
  trainingTruth: false });
}

function bindPlannerSelectedProposal(raw, input, planner) {
  if (!object(raw)) return raw;
  const selected = actionIndex(input.spatialActionSpace).find((entry) =>
    entry.id === planner?.recommendedCandidateId);
  if (!selected) return raw;
  const submitted = object(raw.proposal) ? raw.proposal : null;
  if (selected.kind === "finite"
    && submitted?.kind === "finite"
    && submitted.actionKey === selected.id) return raw;
  if (selected.kind === "parameterized"
    && submitted?.kind === "parameterized"
    && submitted.domainId === selected.id
    && object(submitted.parameters)) return raw;
  const explicitCandidateRefs = [submitted?.actionKey, submitted?.domainId,
    submitted?.candidateId, raw.candidateId].filter(Boolean).map(String);
  if (explicitCandidateRefs.some((entry) => entry !== selected.id)) return raw;
  const normalized = clone(raw);
  if (typeof raw.proposal === "string" && raw.proposal.trim()) {
    normalized.providerProposalNarrative = raw.proposal.trim();
  } else if (submitted) {
    normalized.providerProposalEnvelope = clone(submitted);
  }
  if (selected.kind === "finite") {
    normalized.proposal = clone(selected.proposal);
    return normalized;
  }
  if (selected.kind === "parameterized"
    && (object(normalized.formationSelection)
      || object(normalized.assetPlacementSelection)
      || object(submitted?.formationSelection)
      || object(submitted?.assetPlacementSelection))) {
    normalized.proposal = {
      kind: "parameterized",
      domainId: selected.id,
      parameters: {},
    };
  } else if (selected.kind === "parameterized") {
    const singletonParameters = singletonDomainParameters(selected.action);
    if (singletonParameters) {
      normalized.proposal = {
        kind: "parameterized",
        domainId: selected.id,
        parameters: singletonParameters,
      };
      normalized.singletonDomainBoundByHost = true;
    }
  }
  return normalized;
}

function formationThreatClaimFragments(raw, selection) {
  const intent = object(raw?.intent) ? raw.intent : {};
  const summary = object(raw?.publicDecisionSummary)
    ? raw.publicDecisionSummary : {};
  const fields = [
    ["selectedReason", raw?.selectedReason],
    ["scoreOrPositionValue", raw?.scoreOrPositionValue],
    ["risk", raw?.risk],
    ["intent.expectedOwnOutcome", intent.expectedOwnOutcome],
    ["intent.expectedEffects", intent.expectedEffects],
    ["intent.risks", intent.risks],
    ["publicDecisionSummary.expectedOutcome", summary.expectedOutcome],
    ["publicDecisionSummary.scoreOrPositionValue",
      summary.scoreOrPositionValue],
    ["publicDecisionSummary.risk", summary.risk],
    ["publicDecisionSummary.calculations", summary.calculations],
    ["formationSelection.publicReason", selection?.publicReason],
    ["speech", raw?.speech],
  ];
  return fields.flatMap(([field, value]) => {
    const values = Array.isArray(value) ? value : [value];
    return values.flatMap((entry) => String(entry || "")
      // Match Planner claim boundaries: an accepted threat in a contrasted
      // clause does not widen the enemy scope of the preceding denial.
      .split(/[.;!?。；！？\n]+|,\s*(?:but|whereas|while|however)\b/iu)
      .map((textValue) => textValue.trim())
      .filter(Boolean)
      .map((textValue) => ({ field, text: textValue })));
  });
}

function selectionThreatClaimFragments(raw) {
  const assessment = object(raw?.assessment) ? raw.assessment : {};
  const plan = object(raw?.planRevision) ? raw.planRevision
    : object(raw?.plan) ? raw.plan : {};
  const publicPlanSummary = parsedPublicPlanSummary(raw?.publicPlanSummary);
  const publicDecisionSummary = object(raw?.publicDecisionSummary)
    ? raw.publicDecisionSummary : {};
  const fields = [
    ["assessment.evidenceFor", assessment.evidenceFor],
    ["assessment.evidenceAgainst", assessment.evidenceAgainst],
    ["assessment.opponentModelUpdates", assessment.opponentModelUpdates],
    ["assessment.unresolvedRisks", assessment.unresolvedRisks],
    ["plan.strategicApproach", plan.strategicApproach],
    ["plan.assumptions", plan.assumptions],
    ["plan.opponentModel", plan.opponentModel],
    ["publicPlanSummary.visibleFacts", publicPlanSummary.visibleFacts],
    ["publicPlanSummary.calculations", publicPlanSummary.calculations],
    ["publicPlanSummary.risk", publicPlanSummary.risk],
    ["publicDecisionSummary.visibleFacts", publicDecisionSummary.visibleFacts],
    ["publicDecisionSummary.calculations",
      publicDecisionSummary.calculations],
    ["publicDecisionSummary.risk", publicDecisionSummary.risk],
  ];
  const fragments = fields.flatMap(([field, value]) => {
    const values = Array.isArray(value) ? value : [value];
    return values.flatMap((entry) => {
      const scopeText = String(entry || "");
      return scopeText
        .split(/[.;!?。；！？\n]+|,\s*(?:but|whereas|while|however)\b/iu)
        .map((textValue) => textValue.trim())
        .filter(Boolean)
        .map((textValue) => ({ field, text: textValue, scopeText }));
    });
  });
  for (const [index, comparison] of
    (Array.isArray(raw?.candidateComparisons)
      ? raw.candidateComparisons : []).entries()) {
    const textValue = String(comparison?.evaluation
      || comparison?.reason || "").trim();
    if (textValue) fragments.push(...textValue
      .split(/[.;!?。；！？\n]+|,\s*(?:but|whereas|while|however)\b/iu)
      .map(text => text.trim()).filter(Boolean).map(text => ({
        field: `candidateComparisons[${index}].evaluation`,
        text, scopeText: textValue, candidateId: comparison.candidateId,
      })));
  }
  for (const [index, alternative] of
    (Array.isArray(raw?.rejectedAlternatives)
      ? raw.rejectedAlternatives : []).entries()) {
    const textValue = String(alternative?.reason || "").trim();
    if (textValue) fragments.push({
      field: `rejectedAlternatives[${index}].reason`,
      text: textValue,
    });
  }
  return fragments;
}

function threatFactsForNamedTargets(fragment, facts, units, scopeText = "") {
  const normalized = String(fragment || "").toLowerCase();
  // Current graph facts and solved-formation rows describe the same directed
  // threat. Resolve the hostile attacker with the shared observed-identity
  // matcher before resolving friendly targets. Another enemy's fire cannot
  // disprove a denial explicitly limited to Marine (or any other named Unit).
  const attackerScopedFacts = formationThreatRowsForClaim(fragment,
    facts.map(fact => ({ ...fact, enemyUnitId: fact.attackerId })), units)
    .map(({ enemyUnitId, ...fact }) => fact);
  // Whole-side statements retain whole-side scope; otherwise bind only
  // authoritative IDs/names. Shared names retain all matching instances.
  if (/\b(?:all|every|entire|whole)\s+(?:(?:own|friendly|our|the)\s+)?(?:units?|army|force|lane|footprint)\b/iu
    .test(normalized)) return { facts: attackerScopedFacts,
      resolvedTargetUnitIds: [], targetScope: "whole_side" };
  const names = (value) => {
    const full = String(value || "").trim();
    const plain = full.replace(/\s*\([^)]*\)/gu, "").trim();
    // Natural shorthand uses the final name token (e.g. "Raptor"). Resolve
    // it against this seat's observed identities, never a game-specific name
    // table. Shared suffixes retain all matching instances, just like names.
    const suffix = plain.split(/\s+/u).at(-1);
    return [...new Set([full, plain, suffix])].filter(Boolean);
  };
  const mentions = (textValue, value) => {
    const escaped = value.toLowerCase().replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
    return new RegExp(`(?:^|[^\\p{L}\\p{N}_-])${escaped}(?=$|[^\\p{L}\\p{N}_-])`, "u")
      .test(textValue);
  };
  const namedTargets = textValue => {
    const result = new Set();
    for (const unit of units) {
      if (!["own", "allied"].includes(unit.sideRelation)) continue;
      if ([unit.unitId, ...names(unit.unitName)].filter(Boolean)
        .some(value => mentions(textValue, value))) result.add(unit.unitId);
    }
    return result;
  };
  let namesMentioned = namedTargets(normalized);
  // Only a pronoun with one unambiguous same-item antecedent may inherit
  // identity. Explicit names win; ambiguous/whole-army claims stay strict.
  if (!namesMentioned.size && /^(?:it|they|its|their)\b|^(?:它|它们|该单位)/iu
    .test(normalized)) {
    const antecedents = namedTargets(String(scopeText || "").toLowerCase());
    if (antecedents.size === 1) namesMentioned = antecedents;
  }
  return {
    facts: namesMentioned.size
      ? attackerScopedFacts.filter((fact) => namesMentioned.has(fact.targetId))
      : attackerScopedFacts,
    resolvedTargetUnitIds: [...namesMentioned],
    targetScope: namesMentioned.size ? "named_units" : "unresolved",
  };
}

function unspecifiedPossessedThreatProfiles(fragment) {
  const text = String(fragment || "");
  // A Unit's own profiles and profiles received from an enemy are distinct
  // graph directions. This possessive wording alone proves neither safety
  // nor an incoming-fire contradiction. Keep it for review, not authority.
  return /\b(?:has|have|possesses?)\s+(?:no|zero)\s+(?:current\s+)?(?:stationary\s+)?(?:weapon|fire|threat)\s+profiles?\b/iu
    .test(text)
    && !/\b(?:incoming|enemy|opponent|hostile|against|by|received|covering|targeting)\b/iu
      .test(text);
}

function claimsNoIncomingStationaryThreat(fragment) {
  const normalized = String(fragment || "").replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">").toLowerCase();
  if (!normalized) return false;
  const explicitDenial =
    /\b(?:not|never|no longer)\s+(?:fully\s+)?(?:outside|beyond|out of)\b|\b(?:isn't|aren't|wasn't|weren't)\s+(?:fully\s+)?(?:outside|beyond|out of)\b|\b(?:does|do|did)\s+not\s+(?:place|leave|put|move|keep)[^.;!?]{0,60}\b(?:outside|beyond|out of)\b|\binside\b[^.;!?]{0,120}\brather than\s+(?:fully\s+)?(?:outside|beyond|out of)\b|(?:并非|不是|不再|不能声称)[^。；！？]{0,60}(?:火力|射程|威胁)[^。；！？]{0,20}外/iu;
  if (explicitDenial.test(normalized)) return false;

  const withoutMovementOnlyBands = normalized
    .replace(/[^.;!?]{0,80}\b(?:move[- ]then[- ]fire|advance[- ]and[- ]fire|post[- ]move\s+fire)\b[^.;!?]{0,80}/giu, " ");
  const stationaryThreatTerm =
    /\b(?:fire\s+(?:envelope|zone|band|range)|threat\s+(?:envelope|zone|band|range)|(?:weapon|firing|attack)\s+range|stationary\s+(?:fire|weapon|threat)(?:\s+(?:profile|range|band|envelope|coverage))?)s?\b/iu;
  const escapeTerm = /\b(?:outside|beyond|out of)\b/iu;
  const positiveEscape = escapeTerm.test(withoutMovementOnlyBands)
    && stationaryThreatTerm.test(withoutMovementOnlyBands);
  // Do not join an own outgoing-fire statement to an unrelated objective
  // sentence ("has no fire band and cannot reach a marker").
  const positiveDenial = withoutMovementOnlyBands
    .split(/\b(?:and|but|so)\b|[.;!?]/iu).some((clause) =>
      !unspecifiedPossessedThreatProfiles(clause) &&
      /\b(?:no|zero)\b[^.;!?]{0,50}\b(?:stationary\s+)?(?:weapon|fire|threat)\b[^.;!?]{0,50}\b(?:cover|target|reach|profile)/iu
        .test(clause))
    || /\b(?:cannot|can't|unable to)\b[^.;!?]{0,50}\b(?:target|shoot|fire at)\b/iu
      .test(withoutMovementOnlyBands);
  const chineseEscape =
    /(?:火力(?:圈|范围|区|带)|射程|威胁(?:圈|范围))外|无法(?:成为目标|被射击)/u
      .test(withoutMovementOnlyBands);
  const incomingDenial =
    /\b(?:is|are)\s+not\s+(?:currently\s+)?(?:threatened|targeted|covered)\s+by\b[^.;!?]*\b(?:current[- ]round\s+)?stationary\s+(?:fire|weapon|attack|threat)/iu
      .test(withoutMovementOnlyBands);
  return positiveEscape || positiveDenial || chineseEscape || incomingDenial;
}

function claimsClearedEnemyStationaryFire(fragment) {
  return /\b(?:clears?|removes?|eliminates?)\b[^.;!?]{0,80}\b(?:enemy|opponent|hostile)\b[^.;!?]{0,45}\bstationary\s+(?:fire|weapon|threat)\s+(?:bands?|zones?|ranges?|envelopes?)\b/iu
    .test(String(fragment || ""));
}

function deniesOnlyCurrentRoundStationaryThreat(fragment) {
  const normalized = String(fragment || "").toLowerCase();
  return /\b(?:no|zero|0|outside|beyond|out of)\b[^.;!?]{0,45}\b(?:current[- ]round|this round|immediate)\b/iu
    .test(normalized)
    && !/\b(?:no|zero|0)\s+(?:future[- ]round|next[- ]round|any[- ]round|all[- ]round|stationary)\b/iu
      .test(normalized);
}

function claimsNoIncomingMoveThenFireThreat(fragment) {
  let normalized = String(fragment || "").replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">").toLowerCase();
  if (!normalized) return false;
  // A conditional downside ("if no fire band opens this round") does not
  // assert that the currently projected enemy band is absent. Strip only
  // that antecedent; any separate, unconditional safety claim in the same
  // fragment still reaches the contradiction checks below.
  normalized = normalized.replace(
    /\bif\s+no\s+(?:(?:enemy|current[- ]round)\s+)?(?:fire|threat|weapon)\s+bands?\s+(?:opens?|appears?|emerges?|develops?)\b/giu,
    " ",
  );
  const moveThenFire = String.raw`move[- ]then[- ](?:fire|attack)`;
  const explicitZero = new RegExp(
    String.raw`\b(?:no|zero|0)\s+(?:current\s+)?(?:in[- ]band\s+)?${moveThenFire}(?:\s+(?:weapon|threat|profile)s?)?\b`,
    "iu",
  ).test(normalized);
  const explicitOutOfBand = new RegExp(
    String.raw`\b${moveThenFire}[^.;!?]{0,100}\b(?:outside|beyond|out of)\s+(?:the\s+)?(?:current\s+)?(?:fire\s+)?(?:range|band|envelope|zone)\b`,
    "iu",
  ).test(normalized);
  const allEnemyFireBandsAbsent =
    /\b(?:outside|beyond|out of)\s+all\s+(?:enemy\s+)?(?:fire|threat|weapon)[ -]?(?:bands?|ranges?|envelopes?|zones?)\b/iu
      .test(normalized)
    || /\b(?:no|zero)\s+(?:enemy\s+)?(?:fire|threat|weapon)[ -]?(?:bands?|ranges?|envelopes?|zones?)\b/iu
      .test(normalized);
  const chineseAbsent =
    /(?:移动后|移动并)(?:射击|攻击)[^。；！？]{0,30}(?:不在范围|超出范围|为零|没有|不存在)|(?:所有|全部)敌方(?:移动后)?(?:火力|射击|攻击)(?:圈|范围|区|带)外/u
      .test(normalized);
  return explicitZero || explicitOutOfBand || allEnemyFireBandsAbsent
    || chineseAbsent;
}

function currentIncomingThreatTargets(queryReceipts, friendlyUnitIds = new Set()) {
  const stationary = new Set();
  const stationaryUnknown = new Set();
  const moveThenFire = new Set();
  const stationaryFacts = [];
  const stationaryUnknownFacts = [];
  const moveThenFireFacts = [];
  for (const receipt of queryReceipts || []) {
    if (receipt?.queryKind !== "space.inspect_relationships"
      || !new Set(["exact", "advisory_estimate"]).has(receipt?.status)) {
      continue;
    }
    for (const relationship of receipt?.result?.relationships || []) {
      if (!new Set(["unit_spatial_relationship", "unit_relationship"])
        .has(relationship?.edgeKind)) continue;
      const targetId = String(relationship.fromUnitId || "");
      const attackerId = String(relationship.toUnitId || "");
      // `toFrom` is fire received by the graph's `from` unit. An opponent
      // `from` unit is the target of our *outgoing* fire, not an own unit
      // under enemy threat. Never infer an incoming band without an explicit
      // own/allied target in the seat-scoped observation.
      if (!targetId || !friendlyUnitIds.has(targetId)) continue;
      if (relationship.relation === "friendly"
        || relationship.relation === "allied"
        || (friendlyUnitIds.has(targetId) && friendlyUnitIds.has(attackerId))) continue;
      const incoming = relationship.threats?.toFrom || {};
      const hasLifecycleStationary = Object.hasOwn(incoming,
        "currentRoundStationaryProfileKeys");
      const currentStationaryProfileKeys = hasLifecycleStationary
        ? incoming.currentRoundStationaryProfileKeys || []
        : incoming.stationaryProfileKeys || [];
      const currentStationaryCount = hasLifecycleStationary
        ? Number(relationship.fireZoneExchange
          ?.toCurrentRoundStationaryProfileCount
          ?? currentStationaryProfileKeys.length)
        : Number(relationship.fireZoneExchange
          ?.toStationaryProfileCount || 0);
      if (currentStationaryProfileKeys.length > 0
        || currentStationaryCount > 0) {
        stationary.add(targetId);
        stationaryFacts.push({ targetId, attackerId,
          profileKeys: clone(currentStationaryProfileKeys),
          minimumBaseEdgeDistanceMilliInches: Number(relationship
            .nearestPhysicalEdges?.distanceMilliInches) || null,
          earliestStationaryAttackHorizon:
            incoming.actionWindow?.earliestStationaryAttackHorizon ?? null,
          actionWindow: clone(incoming.actionWindow || null),
          relationshipEdgeId: relationship.edgeId || null,
          queryReceiptHash: receipt.queryReceiptHash || null });
      }
      const currentStationaryUnknownProfileKeys = Object.hasOwn(incoming,
        "currentRoundStationaryUnknownProfileKeys")
        ? incoming.currentRoundStationaryUnknownProfileKeys || []
        : incoming.stationaryUnknownProfileKeys || [];
      if (currentStationaryUnknownProfileKeys.length > 0) {
        stationaryUnknown.add(targetId);
        stationaryUnknownFacts.push({ targetId, attackerId,
          profileKeys: clone(currentStationaryUnknownProfileKeys),
          minimumBaseEdgeDistanceMilliInches: Number(relationship
            .nearestPhysicalEdges?.distanceMilliInches) || null,
          earliestStationaryAttackHorizon:
            incoming.actionWindow?.earliestStationaryAttackHorizon ?? null,
          actionWindow: clone(incoming.actionWindow || null),
          relationshipEdgeId: relationship.edgeId || null,
          queryReceiptHash: receipt.queryReceiptHash || null });
      }
      const hasLifecycleMoveThenFire = Object.hasOwn(incoming,
        "currentRoundMoveThenAttackProfileKeys");
      const currentMoveThenFireProfileKeys = hasLifecycleMoveThenFire
        ? incoming.currentRoundMoveThenAttackProfileKeys || []
        : incoming.moveThenAttackProfileKeys || [];
      const currentMoveThenFireCount = hasLifecycleMoveThenFire
        ? Number(relationship.fireZoneExchange
          ?.toCurrentRoundMoveThenFireProfileCount
          ?? currentMoveThenFireProfileKeys.length)
        : Number(relationship.fireZoneExchange
          ?.toMoveThenFireProfileCount || 0);
      if (currentMoveThenFireProfileKeys.length > 0
        || currentMoveThenFireCount > 0) {
        moveThenFire.add(targetId);
        moveThenFireFacts.push({ targetId, attackerId,
          profileKeys: clone(currentMoveThenFireProfileKeys),
          minimumBaseEdgeDistanceMilliInches: Number(relationship
            .nearestPhysicalEdges?.distanceMilliInches) || null,
          earliestMoveThenAttackHorizon:
            incoming.actionWindow?.earliestMoveThenAttackHorizon ?? null,
          actionWindow: clone(incoming.actionWindow || null),
          relationshipEdgeId: relationship.edgeId || null,
          queryReceiptHash: receipt.queryReceiptHash || null });
      }
    }
  }
  return { stationary: [...stationary],
    stationaryUnknown: [...stationaryUnknown],
    moveThenFire: [...moveThenFire], stationaryFacts,
    stationaryUnknownFacts, moveThenFireFacts };
}

function threatContradictionDetail(contradiction = {}) {
  const facts = (contradiction.threatFacts || []).slice(0, 4).map((entry) => {
    const profiles = (entry.profileKeys || []).map((value) => String(value)
      .split("::").at(-1)).join(",");
    return `${entry.targetId || "unknown_target"}<-${entry.attackerId
      || "unknown_attacker"}[${profiles || "profile_count_nonzero"}]@${
      entry.minimumBaseEdgeDistanceMilliInches ?? "unknown"}#${
      (contradiction.threatKind === "move_then_fire"
        ? entry.earliestMoveThenAttackHorizon
        : entry.earliestStationaryAttackHorizon) || "horizon_unknown"}`;
  }).join(";");
  return `${contradiction.field || "unknown_field"}:${
    contradiction.threatKind || "unknown_threat"}:${facts || contradiction.source
      || "projection"}`;
}

function prospectiveThreatMitigationInstruction(fragment, field) {
  if (field !== "plan.strategicApproach") return false;
  const text = String(fragment || "").trim();
  // This structured field contains instructions for an unexecuted plan, not
  // certified current positions. Keep current facts/calculations and selected
  // formation outcomes on their existing strict checks.
  const instruction = /^(?:(?:keep|move|reposition|seek|aim|try|attempt|plan|avoid|maintain)\b|保持|移动|重新部署|尝试|争取|计划|避开)/iu;
  const separatePresentSafetyClaim =
    /\b(?:currently|already|now|is|are|has|have)\b[^,;!?()]*\b(?:outside|beyond|out of|no\s+(?:current[- ]round\s+)?(?:stationary\s+)?(?:fire|threat|weapon)|cannot\s+(?:target|shoot))\b|(?:当前|现在|已经)[^，；！？（）]*(?:射程外|火力圈外|没有威胁)/iu;
  return instruction.test(text) && !separatePresentSafetyClaim.test(text);
}

function unverifiedProspectivePositionClaim(entry, selectedAction, raw) {
  if (!["deploy", "redeploy", "move", "run", "charge",
    "resolve_relocation_ability"].includes(selectedAction?.actionType)) return false;
  // A query of current positions cannot disprove safety at a not-yet-solved
  // intended zone. Preserve the assertion as uncertainty, never certify it.
  // Separate actual-position sentences still reach ordinary strict checks.
  const text = String(entry.text || "");
  const explicitZone = /\b(?:intended|planned|proposed)\s+(?:[\p{L}\p{N}_-]+\s+){0,5}(?:deployment|placement|destination)\s+(?:zone|area|position|location)\b|(?:拟定|计划|预定)的?(?:部署|摆放|移动)(?:区域|位置|地点)/iu
    .test(text);
  const selectedFutureComparison = entry.candidateId
    && entry.candidateId === raw?.recommendedCandidateId
    && /^(?:adds?|deploys?|moves?|runs?|charges?|repositions?|would|will)\b/iu.test(text)
    && !/\b(?:currently|already|now)\b/iu.test(text);
  return explicitZone || Boolean(selectedFutureComparison);
}

function inheritedPlanStatementOrigin(input, finding) {
  // Only the Host's same-match memory can date unchanged canonical plan text.
  // A Provider-authored date, changed sentence, assessment, alternative or
  // post-placement safety assertion cannot acquire this historical scope.
  if (finding.field !== "plan.strategicApproach"
    || finding.source !== "current_relationship_graph"
    || !finding.resolvedTargetUnitIds?.length) return null;
  const memory = input.matchMemory;
  const room = input.roomProjection;
  const lineage = memory?.workingMemory?.planStatementLineage;
  const currentPlan = input.currentPlan;
  const currentRound = Number(room?.state?.round);
  if (lineage?.source !== "same_match_plan_journal"
    || lineage.field !== finding.field
    || !currentPlan?.planId || lineage.planId !== currentPlan.planId
    || !currentPlan.strategicApproach?.includes(finding.scopeText)
    || memory.scope?.roomId !== room?.room?.roomId
    || memory.scope?.seatKey !== room?.viewer?.seatKey
    || memory.scope?.matchBindingHash !== room?.matchBinding?.bindingHash
    || memory.authority?.stateRevision !== room?.room?.stateRevision
    || memory.authority?.stateHash !== room?.room?.stateHash
    || memory.authority?.round !== currentRound
    || memory.authority?.phase !== room?.state?.phase
    || !Number.isSafeInteger(currentRound) || currentRound < 1) return null;
  const statement = lineage.statements?.find(entry =>
    entry.text === finding.scopeText);
  const origin = statement?.originAuthority;
  if (!Number.isSafeInteger(origin?.round) || origin.round < 1
    || origin.round >= currentRound
    || !Number.isSafeInteger(origin.stateRevision)
    || origin.stateRevision >= room.room.stateRevision) return null;
  return origin;
}

function mentionsThreatIdentity(text, identity) {
  if (!identity) return false;
  // Natural numbered names use spaces, hyphens or underscores interchangeably.
  // Preserve token boundaries: Goliath-1 must never bind Goliath-10 or an
  // unnumbered card name followed by a different instance suffix.
  const escaped = String(identity).split(/[\s_-]+/u).map(token =>
    token.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")).join("[\\s_-]+");
  return new RegExp(`(?:^|[^\\p{L}\\p{N}_-])${escaped}(?=$|[^\\p{L}\\p{N}_-])`, "iu")
    .test(text);
}

function coordinatedEnemyClaimFragments(entry, units) {
  // A complete new subject clause has its own predicate: "Goliath threatens,
  // and Marine has no fire" does not deny Goliath. Split only at a comma-and
  // followed by an observed enemy subject + finite verb. Never split a shared
  // noun list such as "Goliath and Marine have no fire", nor guess pronouns.
  const names = units.filter(unit => unit.sideRelation === "opponent")
    .flatMap(unit => [unit.unitId, unit.unitName]).filter(Boolean);
  const startsEnemyClause = text => names.some(name => {
    const escaped = String(name).replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
    return new RegExp(`^(?:the\\s+)?${escaped}\\s+(?:has|have|is|are|can|cannot|does|do|will|would)\\b`, "iu").test(text);
  });
  const text = String(entry.text || ""), parts = [];
  let start = 0;
  for (const match of text.matchAll(/,\s*and\s+/giu)) {
    const next = match.index + match[0].length;
    if (!startsEnemyClause(text.slice(next))) continue;
    parts.push(text.slice(start, match.index).trim());
    start = next;
  }
  if (!parts.length) return [entry];
  parts.push(text.slice(start).trim());
  return parts.filter(Boolean).map(part => ({ ...entry, text: part,
    scopeText: entry.scopeText || text }));
}

function formationThreatRowsForClaim(text, rows, units) {
  // A projected row goes from the selected Unit to the enemy. Resolve the
  // attacker independently of friendly-target scope in the current graph.
  const enemies = units.filter(unit => unit.sideRelation === "opponent");
  const exception = /\b(?:except(?:\s+for)?|excluding|other than)\b/iu.exec(text);
  const head = exception ? text.slice(0, exception.index) : text;
  const exceptionText = exception ? text.slice(exception.index
    + exception[0].length) : "";
  // The seat already supplies the authoritative sideKey and unique unitId.
  // Bind a numbered side-local shorthand only when its side-prefixed identity
  // is exact and the shorthand identifies one observed enemy. Do not invent
  // instance numbers from the shared card name or guess a side from a prefix.
  const aliases = enemies.map(unit => {
    const prefix = unit.sideKey ? `${unit.sideKey}-` : "";
    const id = String(unit.unitId || "");
    return prefix && id.startsWith(prefix)
      ? { id, value: id.slice(prefix.length) } : null;
  }).filter(Boolean);
  const aliasKey = value => value.toLowerCase().replace(/[\s_-]+/gu, " ");
  const aliasesByKey = new Map();
  for (const alias of aliases) {
    const key = aliasKey(alias.value);
    if (!aliasesByKey.has(key)) aliasesByKey.set(key, new Set());
    aliasesByKey.get(key).add(alias.id);
  }
  const namesFor = id => [id, ...enemies.filter(unit => unit.unitId === id)
    .map(unit => unit.unitName).filter(Boolean), ...aliases.filter(alias =>
      alias.id === id && aliasesByKey.get(aliasKey(alias.value)).size === 1)
      .map(alias => alias.value)];
  // Quantify the threat noun phrase, not arbitrary text between "every model"
  // and "fire". Generic modifiers may describe whole-enemy fire; an observed
  // Unit identity (e.g. "all current-round Marine fire") instead narrows it.
  // A separate explicit "all enemy fire, including Marine" remains universal.
  const wholeEnemyScope = /\b(?:all|every|entire|whole)(?:[\s-]+(?:the|of|current|this|round|enemy|opponent|hostile|stationary|ranged|confirmed|available|remaining|reachable|known))*[\s-]+(?:fire(?:[\s-]+bands?)?|threats?|weapons?|enemies|opponents|hostiles)\b/iu
    .test(head) || /\b(?:no|zero)(?:[\s-]+(?:current|this|round|stationary|ranged))*[\s-]+(?:enemy|opponent|hostile)(?:[\s-]+(?:stationary|ranged|fire|threat|weapon|bands?))*\b/iu.test(head);
  // "Marine has no fire band" has an explicit subject. The negative
  // determiner alone is not a universal quantifier over other attackers.
  const namedEnemyIds = new Set(enemies.filter(unit =>
    namesFor(unit.unitId).some(name => mentionsThreatIdentity(head, name)))
    .map(unit => unit.unitId));
  const scopedRows = !wholeEnemyScope && namedEnemyIds.size
    ? rows.filter(row => namedEnemyIds.has(row.enemyUnitId || row.targetId))
    : rows;
  if (!exceptionText) return scopedRows;
  return scopedRows.map(row => {
    const attackerNames = namesFor(row.enemyUnitId || row.targetId);
    if (!attackerNames.some(name => mentionsThreatIdentity(exceptionText, name))) {
      return row;
    }
    const profileFields = [
      "enemyStationaryThreatProfileKeys",
      "enemyCurrentRoundStationaryThreatProfileKeys",
      "enemyStationaryThreatUnknownProfileKeys",
      "enemyCurrentRoundStationaryThreatUnknownProfileKeys",
    ];
    const keys = [...new Set(profileFields.flatMap(field => row[field] || []))];
    const exceptedKeys = new Set(keys.filter(key =>
      mentionsThreatIdentity(exceptionText, String(key).split("::").at(-1))));
    // Only explicit weapon exceptions are removed. An unknown/ambiguous
    // exception must not conceal another weapon or an unresolved LOS band.
    if (!exceptedKeys.size) return row;
    const scoped = { ...row };
    for (const field of profileFields) {
      if (!Array.isArray(row[field])) continue;
      scoped[field] = row[field].filter(key => !exceptedKeys.has(key));
      const countField = field.replace(/Keys$/u, "Count");
      if (Object.hasOwn(row, countField)) {
        scoped[countField] = Math.max(scoped[field].length,
          Number(row[countField] || 0) - (row[field].length - scoped[field].length));
      }
    }
    return scoped;
  });
}

function sourceBoundFormationOptionForThreatClaims(input) {
  const selection = input.raw?.formationSelection;
  const domainId = input.raw?.proposal?.domainId;
  if (!object(selection) || !domainId) return null;
  const receipt = exactFormationReceipt(input.queryReceipts, domainId);
  if (!receipt || receipt.queryReceiptHash !== selection.formationReceiptHash) {
    return null;
  }
  return receipt.result.formationOptions.find(option =>
    option.formationOptionId === selection.formationOptionId
      && option.domainId === domainId
      && (!input.plannerSelectedAction?.pieceId
        || option.pieceId === input.plannerSelectedAction.pieceId)) || null;
}

function refersToChosenFormationGeometry(entry, option, units) {
  if (!option.pieceId || !option.completeFormationPlacementChecked) return false;
  const text = String(entry.text || "");
  // An explicit solved-placement result is not a claim about the old board.
  // Keep other-Unit, whole-army and separate current-position statements on
  // the current graph. A mere future action or loose safety intention cannot
  // acquire post-placement evidence through this boundary.
  if (!/\bformation(?:\s+option)?\b[^.;!?]{0,120}\b(?:places?|positions?|keeps?|leaves?|is|are)\b|(?:选定|所选|该)队形[^。；！？]{0,80}(?:摆放|位置|处于)/iu.test(text)
    || /\b(?:all|every|entire|whole)\s+(?:(?:own|friendly|our|the)\s+)?(?:units?|army|force|lane|footprint)\b/iu.test(text)) return false;
  const targets = threatFactsForNamedTargets(text, [], units,
    entry.scopeText).resolvedTargetUnitIds;
  return targets.length > 0 && targets.every(id => id === option.pieceId);
}

export function inspectStarcraftTmgFormationThreatClaimsV1(input = {}) {
  const option = object(input.option) ? input.option
    : sourceBoundFormationOptionForThreatClaims(input) || {};
  // Reserves still have authoritative identities even though no current
  // position/threat edge exists for them. Missing them from identity binding
  // widened a Swarmling claim to current Kerrigan/Worm edges.
  const units = [...(input.spatialObservation?.units || []),
    ...(input.spatialObservation?.offTableUnits || [])];
  const friendlyUnitIds = new Set(units
    .filter((unit) => unit.sideRelation === "own" || unit.sideRelation === "allied")
    .map((unit) => unit.unitId));
  // Old saved formation rows lost the graph's relation field and mislabeled
  // friendly weapon coverage as enemy threat. Use current authoritative side
  // identity for local revalidation; never guess allegiance from an ID prefix.
  const hostileRows = (option.relationshipComparison?.relationships || [])
    .filter((row) => row.relation !== "friendly" && row.relation !== "allied"
      && !friendlyUnitIds.has(row.targetId));
  const hasStationaryThreat = (entry, currentRoundOnly) => {
    if (currentRoundOnly && (Object.hasOwn(entry,
      "enemyCurrentRoundStationaryThreatProfileCount")
      || Object.hasOwn(entry,
        "enemyCurrentRoundStationaryThreatProfileKeys"))) {
      return Number(entry.enemyCurrentRoundStationaryThreatProfileCount || 0)
        > 0 || (entry.enemyCurrentRoundStationaryThreatProfileKeys || [])
          .length > 0;
    }
    return Number(entry.enemyStationaryThreatProfileCount || 0) > 0
      || (entry.enemyStationaryThreatProfileKeys || []).length > 0;
  };
  const optionIncomingTargetIds = hostileRows
    .filter((entry) => hasStationaryThreat(entry, false))
    .map((entry) => String(entry.targetId || ""))
    .filter(Boolean);
  const optionIncomingUnknownTargetIds = hostileRows
    .filter((entry) => (entry
      .enemyCurrentRoundStationaryThreatUnknownProfileKeys
      || entry.enemyStationaryThreatUnknownProfileKeys || []).length > 0)
    .map((entry) => String(entry.targetId || ""))
    .filter(Boolean);
  const optionClaims = formationThreatClaimFragments(input.raw,
    input.selection).flatMap(entry => coordinatedEnemyClaimFragments(entry, units)).filter(entry => {
      const targets = threatFactsForNamedTargets(entry.text, [], units)
        .resolvedTargetUnitIds;
      return !option.pieceId || !targets.length || targets.includes(option.pieceId);
    });
  const selectionClaims = selectionThreatClaimFragments(input.raw)
    .flatMap(entry => coordinatedEnemyClaimFragments(entry, units));
  const chosenGeometryClaims = new Set(selectionClaims.filter(entry =>
    refersToChosenFormationGeometry(entry, option, units)));
  const currentThreatTargets = currentIncomingThreatTargets(
    input.queryReceipts || [], friendlyUnitIds);
  const prospectiveClaims = new Set(
    !(option.relationshipComparison?.relationships || []).length
      ? selectionClaims.filter(entry =>
        (claimsNoIncomingStationaryThreat(entry.text)
          || claimsNoIncomingMoveThenFireThreat(entry.text))
        && unverifiedProspectivePositionClaim(entry,
          input.plannerSelectedAction, input.raw)) : []);
  const unresolvedTargetClaims = new Map();
  const currentClaimContradictions = (facts, predicate, threatKind) =>
    selectionClaims.filter((entry) => !prospectiveClaims.has(entry)
      && !chosenGeometryClaims.has(entry)
      && predicate(entry.text, entry.field)).flatMap((entry) => {
      const scoped = threatFactsForNamedTargets(entry.text, facts,
        units, entry.scopeText);
      // A missing subject is not a universal quantifier. Current graph edges
      // cannot contradict a sentence until its friendly target scope binds.
      // Keep ambiguous narration visible as unknown, never certify safety or
      // silently turn another Unit's danger into a blocking contradiction.
      // Solved-formation claims retain their explicit option target above.
      if (scoped.targetScope === "unresolved") {
        unresolvedTargetClaims.set(`${entry.field}:${entry.text}`, {
          ...entry, severity: "Medium", blocksApply: false,
          reasonCode: "threat_claim_target_scope_unresolved",
          source: "model_statement_without_bound_friendly_target",
          reason: "No named friendly Unit or explicit whole-side scope. The statement is unverified, not evidence of safety and not contradicted by an unrelated Unit's threat edge.",
        });
        return [];
      }
      return scoped.facts.length ? [{ ...entry, threatKind,
        source: "current_relationship_graph",
        resolvedTargetUnitIds: scoped.resolvedTargetUnitIds,
        threatFacts: clone(scoped.facts) }] : [];
    });
  const deniesCurrentStationaryPosition = (fragment, field) =>
    !prospectiveThreatMitigationInstruction(fragment, field)
    && !/\b(?:a|the|this)\s+move\s+that\s+(?:keeps?|would\s+keep|could\s+keep)\b[^.;!?]{0,120}\b(?:outside|beyond|out of)\b/iu
      .test(String(fragment || ""))
    && claimsNoIncomingStationaryThreat(fragment);
  const contradictions = [
    ...optionClaims.filter((entry) => claimsNoIncomingStationaryThreat(
      entry.text) || claimsClearedEnemyStationaryFire(entry.text))
      .flatMap((entry) => {
      const currentRoundOnly = deniesOnlyCurrentRoundStationaryThreat(
        entry.text);
       const threatened = formationThreatRowsForClaim(entry.text, hostileRows,
         units).filter((fact) =>
        hasStationaryThreat(fact, currentRoundOnly));
      return threatened.length ? [{ ...entry,
        threatKind: currentRoundOnly ? "current_round_stationary"
          : "stationary",
        source: "formation_projection",
         threatFacts: threatened.map((fact) => ({ targetId: fact.fromUnitId || null,
           attackerId: fact.enemyUnitId || fact.targetId,
          profileKeys: clone(currentRoundOnly
            ? fact.enemyCurrentRoundStationaryThreatProfileKeys || []
            : fact.enemyStationaryThreatProfileKeys || []),
          minimumBaseEdgeDistanceMilliInches:
            fact.minimumBaseEdgeDistanceMilliInches ?? null,
          earliestStationaryAttackHorizon:
            fact.enemyThreatActionWindow?.earliestStationaryAttackHorizon
              ?? null })) }] : [];
    }),
    ...(optionIncomingUnknownTargetIds.length > 0
      ? optionClaims.filter((entry) => claimsNoIncomingStationaryThreat(
        entry.text) || claimsClearedEnemyStationaryFire(entry.text))
         .flatMap((entry) => {
           const scopedUnknownRows = formationThreatRowsForClaim(entry.text,
             hostileRows, units)
             .filter((fact) => (fact
               .enemyCurrentRoundStationaryThreatUnknownProfileKeys
               || fact.enemyStationaryThreatUnknownProfileKeys || []).length > 0);
           return scopedUnknownRows.length ? [{ ...entry,
         threatKind: "stationary_unknown_line_of_sight",
         source: "formation_projection",
         threatFacts: scopedUnknownRows
           .map((fact) => ({ targetId: fact.fromUnitId || null,
             attackerId: fact.enemyUnitId || fact.targetId,
            profileKeys: clone(fact
              .enemyCurrentRoundStationaryThreatUnknownProfileKeys
              || fact.enemyStationaryThreatUnknownProfileKeys || []),
            minimumBaseEdgeDistanceMilliInches:
               fact.minimumBaseEdgeDistanceMilliInches ?? null })) }] : [];
         }) : []),
    ...optionClaims.filter(entry => claimsNoIncomingMoveThenFireThreat(entry.text))
      .flatMap(entry => {
        const currentRoundOnly = deniesOnlyCurrentRoundStationaryThreat(entry.text);
        const threatened = formationThreatRowsForClaim(entry.text, hostileRows, units)
          .filter(row => (currentRoundOnly
            ? row.enemyCurrentRoundMoveThenAttackProfileKeys || []
            : row.enemyMoveThenAttackProfileKeys || []).length > 0);
        return threatened.length ? [{ ...entry, threatKind: "move_then_fire",
          source: "formation_projection", threatFacts: threatened.map(row => ({
            targetId: row.fromUnitId || option.pieceId,
            attackerId: row.enemyUnitId || row.targetId,
            profileKeys: clone(currentRoundOnly
              ? row.enemyCurrentRoundMoveThenAttackProfileKeys || []
              : row.enemyMoveThenAttackProfileKeys || []),
            minimumBaseEdgeDistanceMilliInches:
              row.minimumBaseEdgeDistanceMilliInches ?? null,
            earliestMoveThenAttackHorizon:
              row.enemyThreatActionWindow?.earliestMoveThenAttackHorizon ?? null,
          })) }] : [];
      }),
    ...currentClaimContradictions(currentThreatTargets.stationaryFacts,
      deniesCurrentStationaryPosition, "stationary"),
    ...currentClaimContradictions(currentThreatTargets.stationaryUnknownFacts,
      deniesCurrentStationaryPosition, "stationary_unknown_line_of_sight"),
    ...currentClaimContradictions(currentThreatTargets.moveThenFireFacts,
      claimsNoIncomingMoveThenFireThreat, "move_then_fire"),
  ];
  const selectedAction = input.plannerSelectedAction;
  const selectedUnitId = String(selectedAction?.pieceId || "");
  // The scope boundary is the selected Unit, not the action verb. A Queen
  // ability must not be blocked by a Kerrigan plan claim any more than a Move
  // would be. Keep selected/whole-side/ambiguous claims and option projections
  // blocking; preserve unambiguously other-Unit plan claims as review evidence.
  const canRetainOtherUnitPlanAsAdvisory = friendlyUnitIds.has(selectedUnitId);
  const advisoryFindings = [...prospectiveClaims].map(entry => ({
    ...entry, severity: "Medium", blocksApply: false,
    reasonCode: "unverified_prospective_position_claim",
    source: "model_prediction_without_post_placement_evidence",
    reason: "Current-position relationship queries neither establish nor contradict the intended position. Recheck the solved placement; this is not certified safety or Rules authority.",
  }));
  advisoryFindings.push(...unresolvedTargetClaims.values());
  advisoryFindings.push(...[...optionClaims, ...selectionClaims]
    .filter(entry => unspecifiedPossessedThreatProfiles(entry.text))
    .map(entry => ({ ...entry, severity: "Medium", blocksApply: false,
      reasonCode: "threat_profile_direction_unspecified",
      source: "model_statement_without_explicit_fire_direction",
      reason: "Possessing no threat profiles is not an assertion that no enemy profiles cover this Unit. Retained for review; not certified outgoing coverage, safety or Rules authority.",
    })));
  const blockingContradictions = contradictions.filter(entry => {
    const historicalOrigin = canRetainOtherUnitPlanAsAdvisory
      ? inheritedPlanStatementOrigin(input, entry) : null;
    if (historicalOrigin) {
      advisoryFindings.push({ ...entry, severity: "Medium", blocksApply: false,
        reasonCode: "inherited_prior_round_plan_statement",
        originAuthority: clone(historicalOrigin),
        reason: "Unchanged prior-round plan narration; retained as stale historical strategy, not a current safety fact or Rules authority." });
      return false;
    }
    const nonselectedPlan = canRetainOtherUnitPlanAsAdvisory
      && entry.field === "plan.strategicApproach"
      && entry.source === "current_relationship_graph"
      && entry.resolvedTargetUnitIds?.length > 0
      && entry.resolvedTargetUnitIds.every(id => id !== selectedUnitId);
    if (!nonselectedPlan) return true;
    advisoryFindings.push({ ...entry, severity: "Medium", blocksApply: false,
      reason: "Nonselected Unit plan claim; retained for review, not current selected-Unit action authority." });
    return false;
  });
  return freeze({
    incomingTargetIds: [...new Set([
      ...optionIncomingTargetIds, ...optionIncomingUnknownTargetIds,
      ...currentThreatTargets.stationary,
      ...currentThreatTargets.stationaryUnknown,
    ])],
    incomingMoveThenFireTargetIds: currentThreatTargets.moveThenFire,
    checkedClaimCount: optionClaims.length + selectionClaims.length,
    contradictions: blockingContradictions,
    advisoryFindings,
    contradicted: blockingContradictions.length > 0,
  });
}

const PREDICTED_ORDINARY_ACTION_PHASES = Object.freeze({
  move: "movement",
  movement: "movement",
  advance: "movement",
  reposition: "movement",
  deploy: "movement",
  redeploy: "movement",
  run: "assault",
  charge: "assault",
  ranged_attack: "assault",
  shoot: "assault",
  shooting: "assault",
  hold_position: "assault",
  fight: "combat",
  melee: "combat",
  melee_attack: "combat",
  combat: "combat",
});
const PREDICTED_ACTION_CLASS_ALIASES = Object.freeze({
  hold: "hold_position",
  "hold position": "hold_position",
  ranged: "ranged_attack",
  attack: "ranged_attack",
  fire: "ranged_attack",
  firing: "ranged_attack",
  close_combat: "fight",
  close_combat_attack: "fight",
  reserve_deploy: "deploy",
  choose_first: "choose_first_actor",
});
const SIDE_LEVEL_PREDICTED_ACTION_CLASSES = new Set([
  "pass", "choose_first_actor", "phase_control",
]);

function canonicalPredictedActionClass(value) {
  const normalized = String(value || "").trim().toLowerCase()
    .replaceAll(/[-\s]+/gu, "_");
  return PREDICTED_ACTION_CLASS_ALIASES[normalized]
    || PREDICTED_ACTION_CLASS_ALIASES[String(value || "").trim().toLowerCase()]
    || normalized;
}

function claimsMovementActivationLocksOtherPhases(response, activatedPhases) {
  if (activatedPhases?.movement !== true
    || activatedPhases?.assault === true && activatedPhases?.combat === true) {
    return false;
  }
  const fragments = [response?.opponentAction, ...(response?.basis || [])]
    .flatMap((entry) => String(entry || "").split(/[.;!?。；！？\n]+/u))
    .map((entry) => entry.trim().toLowerCase()).filter(Boolean);
  return fragments.some((fragment) =>
    /\balready\s+(?:has\s+)?activated[^]{0,80}\bmovement\b/iu.test(fragment)
      && /\b(?:cannot|can't|unable\s+to)\b[^]{0,180}\b(?:run|charge|ranged(?:\s+attack)?|shoot|fire|fight|melee|hold)\b/iu
        .test(fragment)
      && /\b(?:round|other\s+phase|assault|combat)\b/iu.test(fragment));
}

function observedUnitActivation(spatialObservation, unit) {
  if (object(unit?.activationStatus?.activatedPhases)) {
    return unit.activationStatus.activatedPhases;
  }
  return (spatialObservation?.models || []).find((entry) =>
    entry?.unitId === unit?.unitId)?.status?.activatedPhases || {};
}

// One lifecycle projection is consumed by generation, diagnostics and the
// narrowly evidenced metadata repair below. It does not predict strategy or
// certify a future action's range/path/LOS.
export function projectStarcraftTmgOpponentPredictionTimingFactsV1(input = {}) {
  const observation = input.spatialObservation || {};
  return {
    schemaVersion: "starcraft_tmg_opponent_prediction_timing_facts_v1",
    currentPhase: String(input.currentPhase || "").toLowerCase(),
    phaseOrder: ["movement", "assault", "combat"],
    actionPhaseByClass: clone(PREDICTED_ORDINARY_ACTION_PHASES),
    opponents: (observation.units || []).filter(unit =>
      unit.sideRelation === "opponent").map(unit => {
      const activated = observedUnitActivation(observation, unit);
      return { unitId: unit.unitId, activatedPhases: Object.fromEntries(
        ["movement", "assault", "combat"].map(phase => [phase,
          typeof activated[phase] === "boolean" ? activated[phase] : null])),
      };
    }),
    horizonMeaning: {
      current_phase: "The predicted action occurs in the phase currently open.",
      current_round: "The predicted action can occur in this round, including a later phase.",
      bounded_public_transitions: "Conditional later public transitions; prerequisites remain explicit.",
    },
    phaseAvailabilityDoesNotProveRangePathOrLineOfSight: true,
    rulesAuthority: false, trainingTruth: false,
  };
}

function postFormationOpponentThreatProjections(queryReceipts, ownAction,
  actorId, targetId) {
  const selection = ownAction?.formationSelection;
  const domainId = String(ownAction?.proposal?.domainId || "");
  if (!object(selection) || !domainId) return null;
  const receipt = exactFormationReceipt(queryReceipts, domainId);
  if (!receipt || receipt.queryReceiptHash !== selection.formationReceiptHash) {
    return null;
  }
  const option = receipt.result.formationOptions.find(entry =>
    entry.formationOptionId === selection.formationOptionId);
  if (!option || option.pieceId !== targetId) return null;
  // The target changes position before the predicted response. Read the
  // selected, source-bound result, never a Provider-authored comparison or
  // another option. Missing/unknown projected facts cannot prove absence.
  return (option.relationshipComparison?.relationships || [])
    .filter(row => row.fromUnitId === targetId && row.targetId === actorId
      && row.relation === "opposed"
      && Array.isArray(row.enemyCurrentRoundStationaryThreatProfileKeys)
      && Array.isArray(row.enemyCurrentRoundMoveThenAttackProfileKeys))
    .map(row => ({
      currentRoundStationaryProfileKeys:
        row.enemyCurrentRoundStationaryThreatProfileKeys,
      currentRoundMoveThenAttackProfileKeys:
        row.enemyCurrentRoundMoveThenAttackProfileKeys,
      currentRoundStationaryUnknownProfileKeys:
        row.enemyCurrentRoundStationaryThreatUnknownProfileKeys || [],
    }));
}

function opponentTargetThreatProjections(queryReceipts, actorId, targetId,
  ownAction = null) {
  const projected = postFormationOpponentThreatProjections(queryReceipts,
    ownAction, actorId, targetId);
  if (projected !== null) return projected;
  const projections = [];
  for (const receipt of queryReceipts || []) {
    if (receipt?.queryKind !== "space.inspect_relationships"
      || !new Set(["exact", "advisory_estimate"]).has(receipt?.status)) {
      continue;
    }
    for (const relationship of receipt?.result?.relationships || []) {
      if (!new Set(["unit_spatial_relationship", "unit_relationship"])
        .has(relationship?.edgeKind)) continue;
      if (relationship.fromUnitId === targetId
        && relationship.toUnitId === actorId
        && object(relationship.threats?.toFrom)) {
        projections.push(relationship.threats.toFrom);
      } else if (relationship.fromUnitId === actorId
        && relationship.toUnitId === targetId
        && object(relationship.threats?.fromTo)) {
        projections.push(relationship.threats.fromTo);
      }
    }
  }
  return projections;
}

function hasCurrentRoundRangedBand(projection) {
  return (projection.currentRoundStationaryProfileKeys || []).length > 0
    || (projection.currentRoundMoveThenAttackProfileKeys || []).length > 0
    || (projection.currentRoundStationaryUnknownProfileKeys || []).length > 0;
}

function hasLifecycleRangedBandContract(projection) {
  return Object.hasOwn(projection, "currentRoundStationaryProfileKeys")
    && Object.hasOwn(projection, "currentRoundMoveThenAttackProfileKeys");
}

function predictionCorrectionIssues(input, contradictions, units, offTableUnits) {
  const observation = input.spatialObservation || {};
  return contradictions.map(entry => {
    const response = input.responses[entry.index];
    const actor = units.get(entry.actorId) || offTableUnits.get(entry.actorId);
    const targetId = String(response?.likelyTargetUnitId || "");
    const target = units.get(targetId) || offTableUnits.get(targetId);
    const unitFacts = unit => unit ? { unitId: unit.unitId,
      sideRelation: unit.sideRelation,
      isInReserves: unit.isInReserves === true,
      isDestroyed: unit.isDestroyed === true,
      activatedPhases: clone(observedUnitActivation(observation, unit)),
    } : null;
    const sourceReceipts = (input.queryReceipts || []).filter(receipt =>
      receipt.queryKind === "space.inspect_relationships"
        && (receipt.result?.relationships || []).some(row =>
          new Set(["unit_spatial_relationship", "unit_relationship"]).has(row.edgeKind)
            && (row.fromUnitId === entry.actorId && row.toUnitId === targetId
              || row.fromUnitId === targetId && row.toUnitId === entry.actorId)))
      .map(receipt => ({ queryKind: receipt.queryKind,
        queryReceiptHash: receipt.queryReceiptHash, status: receipt.status,
        authority: clone(receipt.result.authority),
        hypotheticalProjection: receipt.result.hypotheticalProjection === true,
      }));
    const formation = input.ownAction?.formationSelection;
    if (formation) {
      const receipt = exactFormationReceipt(input.queryReceipts,
        String(input.ownAction.proposal?.domainId || ""));
      if (receipt?.queryReceiptHash === formation.formationReceiptHash) {
        sourceReceipts.push({ queryKind: receipt.queryKind,
          queryReceiptHash: receipt.queryReceiptHash, status: receipt.status,
          formationOptionId: formation.formationOptionId,
          postSelectedFormationProjection: true });
      }
    }
    return { code: "ACTION_OPPONENT_PREDICTION_LIFECYCLE_CONTRADICTED",
      field: `intent.predictedOpponentResponses.${entry.index}`,
      claim: clone(response), reason: entry.reason,
      source: "current_player_observation_and_bound_query_receipts",
      observationAuthority: { roomId: observation.roomId,
        stateRevision: observation.stateRevision, stateHash: observation.stateHash,
        observationHash: observation.observationHash },
      facts: { currentPhase: String(input.currentPhase || "").toLowerCase(),
        predictedPhase: entry.predictedPhase || null,
        actor: unitFacts(actor), target: unitFacts(target),
        rangedTargetProjections: clone(opponentTargetThreatProjections(
          input.queryReceipts, entry.actorId, targetId, input.ownAction) || []),
        currentPositionDoesNotCertifyFutureTransitions: true },
      sourceReceipts,
      correctionScope: "reconcile_response_actor_target_action_horizon_and_basis",
      repairInstruction: "Reconcile the submitted prediction with the actor/target activation and source-bound range facts. Preserve supported risks and counterplay. If retaining a conditional future hypothesis, state its public prerequisites and bounded transition horizon; do not invent current range or LOS. The selected action and strategy remain your choice within the existing Planner contract.",
      strategyRecommendationProvided: false, rulesAuthority: false,
      trainingTruth: false };
  });
}

export function inspectStarcraftTmgOpponentPredictionFeasibilityV1(
  input = {}) {
  const observation = input.spatialObservation || {};
  const units = new Map((observation.units || []).map((entry) =>
    [String(entry?.unitId || ""), entry]));
  const offTableUnits = new Map((observation.offTableUnits || []).map((entry) =>
    [String(entry?.unitId || ""), entry]));
  const currentPhase = String(input.currentPhase || "").toLowerCase();
  const contradictions = [];
  for (const [index, response] of (input.responses || []).entries()) {
    const actorId = String(response?.likelyActorUnitId || "").trim();
    if (!actorId) continue;
    const submittedActionClass = String(response.actionClass || "").trim();
    const actionClass = canonicalPredictedActionClass(submittedActionClass);
    if (SIDE_LEVEL_PREDICTED_ACTION_CLASSES.has(actionClass)) {
      contradictions.push({ index, responseId: response.responseId || null,
        actorId, actionClass, submittedActionClass,
        reason: "side_level_action_must_not_name_unit_actor" });
      continue;
    }
    const onTable = units.get(actorId);
    const offTable = offTableUnits.get(actorId);
    const actor = onTable || offTable;
    if (!actor) continue;
    if (actor.sideRelation !== "opponent") {
      contradictions.push({ index, responseId: response.responseId || null,
        actorId, actionClass, submittedActionClass,
        reason: "predicted_actor_is_not_opponent" });
      continue;
    }
    if (offTable?.isDestroyed === true) {
      contradictions.push({ index, responseId: response.responseId || null,
        actorId, actionClass, submittedActionClass,
        reason: "destroyed_actor_cannot_take_predicted_action" });
      continue;
    }
    const horizonKind = String(response?.horizon?.kind || "");
    const horizonCount = Number(response?.horizon?.count || 0);
    const reserveFuturePrerequisiteWindow =
      horizonKind === "bounded_public_transitions" && horizonCount >= 2;
    if (offTable?.isInReserves === true && actionClass !== "deploy"
      && !reserveFuturePrerequisiteWindow) {
      contradictions.push({ index, responseId: response.responseId || null,
        actorId, actionClass, submittedActionClass,
        reason: "reserve_actor_requires_deploy_action_class" });
      continue;
    }
    if (onTable && actionClass === "deploy") {
      contradictions.push({ index, responseId: response.responseId || null,
        actorId, actionClass, submittedActionClass,
        reason: "on_table_actor_cannot_use_reserve_deploy_action_class" });
      continue;
    }
    const activatedPhases = observedUnitActivation(observation, actor);
    if (claimsMovementActivationLocksOtherPhases(response, activatedPhases)) {
      contradictions.push({ index, responseId: response.responseId || null,
        actorId, actionClass, submittedActionClass,
        activatedPhases: clone(activatedPhases),
        reason: "movement_activation_does_not_lock_other_phases" });
      continue;
    }
    const predictedPhase = PREDICTED_ORDINARY_ACTION_PHASES[actionClass] || null;
    if (!predictedPhase) continue;
    if (horizonKind === "current_phase" && currentPhase
      && predictedPhase !== currentPhase) {
      contradictions.push({ index, responseId: response.responseId || null,
        actorId, actionClass, submittedActionClass, predictedPhase,
        currentPhase, reason: "action_class_not_available_in_current_phase",
        repairHint: `current_phase_is_${currentPhase}_but_${actionClass}_occurs_in_${predictedPhase};`
          + "use_current_round_only_with_same_round_actor_target_evidence;"
          + "otherwise_keep_future_prerequisites_conditional;preserve_actor_target_risk_and_counterplay" });
      continue;
    }
    const targetId = String(response?.likelyTargetUnitId || "").trim();
    if (actionClass === "ranged_attack" && targetId
      && horizonKind === "current_round") {
      const projections = opponentTargetThreatProjections(
        input.queryReceipts, actorId, targetId, input.ownAction,
      ).filter(hasLifecycleRangedBandContract);
      if (projections.length > 0
        && projections.every((entry) => !hasCurrentRoundRangedBand(entry))) {
        contradictions.push({ index,
          responseId: response.responseId || null,
          actorId, targetId, actionClass, submittedActionClass,
          predictedPhase, currentPhase,
          reason: "ranged_target_not_in_current_round_fire_band",
          repairHint:
            "use_bounded_public_transitions_for_future_fire_or_choose_actor_target_with_current_round_fire_band" });
        continue;
      }
    }
    if (activatedPhases?.[predictedPhase] === true
      && new Set(["next_opponent_action", "current_phase", "current_round"])
        .has(horizonKind)) {
      contradictions.push({ index, responseId: response.responseId || null,
        actorId, actionClass, submittedActionClass, predictedPhase,
        currentPhase, reason: "actor_already_activated_for_predicted_phase",
        repairHint:
          "use_bounded_public_transitions_for_later_round_or_choose_actor_unactivated_in_predicted_phase" });
    }
  }
  return freeze({
    status: contradictions.length ? "contradicted" : "consistent",
    currentPhase,
    contradictions,
    correctionIssues: predictionCorrectionIssues(input, contradictions, units, offTableUnits),
    rulesAuthority: false,
    trainingTruth: false,
  });
}

export function normalizeStarcraftTmgOpponentPredictionsV1(input = {}) {
  const action = clone(input.action);
  const responses = action?.intent?.predictedOpponentResponses;
  if (!Array.isArray(responses) || responses.length < 1) return action;
  const inspection = inspectStarcraftTmgOpponentPredictionFeasibilityV1({
    responses,
    spatialObservation: input.spatialObservation,
    currentPhase: input.currentPhase,
    queryReceipts: input.queryReceipts,
    ownAction: action,
  });
  if (inspection.status !== "contradicted") return action;
  const observation = input.spatialObservation || {};
  const timing = projectStarcraftTmgOpponentPredictionTimingFactsV1(input);
  const currentPhaseIndex = timing.phaseOrder.indexOf(timing.currentPhase);
  const sameRoundPhaseRepairs = inspection.contradictions.filter(entry => {
    const response = responses[entry.index];
    if (entry.reason !== "action_class_not_available_in_current_phase"
      || entry.actionClass !== "ranged_attack"
      || response.horizon?.kind !== "current_phase"
      || Number(response.horizon.count) !== 1
      || currentPhaseIndex < 0
      || timing.phaseOrder.indexOf(entry.predictedPhase) <= currentPhaseIndex) return false;
    const actor = timing.opponents.find(unit => unit.unitId === entry.actorId);
    if (actor?.activatedPhases?.[entry.predictedPhase] !== false) return false;
    const basis = [response.opponentAction, ...(response.basis || [])].join("\n");
    if (!/\bassault\s+phase\b|\bphase\s+assault\b|突击阶段/iu.test(basis)
      || /\b(?:next|later|future|following)\s+round\b|下(?:一)?回合|未来回合/iu.test(basis)) return false;
    // Never fall back to pre-placement positions for an unbound formation.
    if (action.formationSelection && postFormationOpponentThreatProjections(
      input.queryReceipts, action, entry.actorId,
      String(response.likelyTargetUnitId || "")) === null) return false;
    const projections = opponentTargetThreatProjections(input.queryReceipts,
      entry.actorId, String(response.likelyTargetUnitId || ""), action);
    return projections.length > 0 && projections.every(projection =>
      hasLifecycleRangedBandContract(projection)
        && ((projection.currentRoundStationaryProfileKeys || []).length > 0
          || (projection.currentRoundMoveThenAttackProfileKeys || []).length > 0));
  });
  if (sameRoundPhaseRepairs.length === inspection.contradictions.length) {
    const repaired = clone(action);
    for (const entry of sameRoundPhaseRepairs) {
      repaired.intent.predictedOpponentResponses[entry.index].horizon = {
        kind: "current_round", count: 1,
      };
    }
    if (inspectStarcraftTmgOpponentPredictionFeasibilityV1({
      ...input, responses: repaired.intent.predictedOpponentResponses,
      ownAction: repaired,
    }).status === "consistent") {
      repaired.opponentPredictionNormalization = {
        schema: "starcraft_tmg_opponent_prediction_normalization_v1",
        normalizationVersion: ACTION_SHAPE_NORMALIZATION_VERSION,
        operation: "bind_explicit_same_round_future_phase_horizon",
        inputCount: responses.length, retainedCount: responses.length,
        repaired: sameRoundPhaseRepairs.map(entry => ({
          responseId: entry.responseId || null, actorId: entry.actorId,
          predictedPhase: entry.predictedPhase, currentPhase: entry.currentPhase,
          from: "current_phase", to: "current_round",
        })),
        selectedFormationOptionId: action.formationSelection?.formationOptionId || null,
        formationReceiptHash: action.formationSelection?.formationReceiptHash || null,
        originalActionChanged: false, rulesAuthority: false, trainingTruth: false,
      };
      return repaired;
    }
  }
  const opponentReserves = (observation.offTableUnits || []).filter((unit) =>
    unit.sideRelation === "opponent" && unit.isInReserves === true
      && unit.isDestroyed !== true);
  const canUnbindGenericReserveActor = opponentReserves.length > 0
    && inspection.contradictions.every((entry) => {
      if (entry.reason !== "on_table_actor_cannot_use_reserve_deploy_action_class") {
        return false;
      }
      const response = responses[entry.index];
      const actionText = String(response?.opponentAction || "");
      const actorId = String(response?.likelyActorUnitId || "");
      return actorId && !actionText.includes(actorId)
        && (response?.basis || []).some((line) =>
          String(line).includes(actorId)
            && /\b(?:on the table|on-table|already deployed|already on field)\b/iu
              .test(String(line)));
    });
  if (canUnbindGenericReserveActor) {
    const repaired = clone(action);
    for (const entry of inspection.contradictions) {
      repaired.intent.predictedOpponentResponses[entry.index]
        .likelyActorUnitId = "";
    }
    const reinspection = inspectStarcraftTmgOpponentPredictionFeasibilityV1({
      responses: repaired.intent.predictedOpponentResponses,
      spatialObservation: observation,
      currentPhase: input.currentPhase,
      queryReceipts: input.queryReceipts,
      ownAction: repaired,
    });
    if (reinspection.status === "consistent") {
      repaired.opponentPredictionNormalization = {
        schema: "starcraft_tmg_opponent_prediction_normalization_v1",
        normalizationVersion: ACTION_SHAPE_NORMALIZATION_VERSION,
        operation: "unbind_impossible_actor_from_generic_reserve_prediction",
        inputCount: responses.length,
        retainedCount: responses.length,
        unbound: inspection.contradictions.map((entry) => ({
          responseId: entry.responseId || null,
          actorId: entry.actorId,
          reason: entry.reason,
        })),
        rulesAuthority: false,
        trainingTruth: false,
      };
      return repaired;
    }
  }
  if (responses.length < 2) return action;
  const contradictedIndexes = new Set(inspection.contradictions.map((entry) =>
    entry.index));
  const retained = responses.filter((_, index) =>
    !contradictedIndexes.has(index));
  if (retained.length < 1) return action;
  action.intent.predictedOpponentResponses = retained;
  action.opponentPredictionNormalization = {
    schema: "starcraft_tmg_opponent_prediction_normalization_v1",
    normalizationVersion: ACTION_SHAPE_NORMALIZATION_VERSION,
    operation: "drop_lifecycle_impossible_auxiliary_predictions",
    inputCount: responses.length,
    retainedCount: retained.length,
    removed: inspection.contradictions.map((entry) => ({
      responseId: entry.responseId || null,
      actorId: entry.actorId,
      actionClass: entry.actionClass || null,
      reason: entry.reason,
    })),
    rulesAuthority: false,
    trainingTruth: false,
  };
  return action;
}

export function bindStarcraftTmgFormationSelectionV1(raw, queryReceipts,
  spatialObservation) {
  if (!object(raw) || !object(raw.proposal)
    || raw.proposal.kind !== "parameterized") return raw;
  const normalized = clone(raw);
  const domainId = String(normalized.proposal.domainId || "");
  const receipt = exactFormationReceipt(queryReceipts, domainId);
  if (!receipt) return normalized;
  const selection = object(normalized.formationSelection)
    ? normalized.formationSelection
    : object(normalized.proposal.formationSelection)
      ? normalized.proposal.formationSelection : normalized.proposal;
  const formationOptionId = String(selection.formationOptionId || "");
  const option = receipt.result.formationOptions.find((entry) =>
    entry.formationOptionId === formationOptionId);
  if (!option) {
    throw correctionError("ACTION_FORMATION_OPTION_SELECTION_REQUIRED",
      domainId);
  }
  const declaredPayments = receipt.result.legalPaymentChoices || [];
  const recoveredPayments = declaredPayments.length ? null
    : projectStarcraftTmgFormationPaymentsV1(undefined,
      receipt.result.formationOptions);
  const legalPaymentChoices = declaredPayments.length ? declaredPayments
    : recoveredPayments.legalPaymentChoices;
  if (!declaredPayments.length && legalPaymentChoices.length) {
    normalized.formationPaymentEvidenceReconciliation = {
      source: "rules_instantiated_canonical_formation_options",
      formationReceiptHash: receipt.queryReceiptHash,
      formationOptionId,
      normalizationVersion: ACTION_SHAPE_NORMALIZATION_VERSION,
      retainedReceiptUnchanged: true,
      finalRulesInstantiationStillRequired: true,
      trainingTruth: false,
    };
  }
  const submittedPayment = selection.paymentCardInstanceIds;
  let chosenPayment = null;
  if (legalPaymentChoices.length > 0) {
    if (!Array.isArray(submittedPayment)
      && legalPaymentChoices.length !== 1) {
      throw correctionError("ACTION_FORMATION_PAYMENT_SELECTION_REQUIRED",
        domainId);
    }
    const requested = Array.isArray(submittedPayment)
      ? submittedPayment : legalPaymentChoices[0];
    chosenPayment = legalPaymentChoices.find((choice) =>
      choice.length === requested.length
        && new Set(requested).size === requested.length
        && choice.every((cardId) => requested.includes(cardId)));
    if (!chosenPayment) {
      throw correctionError("ACTION_FORMATION_PAYMENT_SELECTION_INVALID",
        domainId);
    }
  } else if (Array.isArray(submittedPayment)
    && submittedPayment.length > 0) {
    throw correctionError("ACTION_FORMATION_PAYMENT_NOT_APPLICABLE", domainId);
  }
  let threatClaimInspection = inspectStarcraftTmgFormationThreatClaimsV1({
    raw: normalized,
    selection,
    option,
    spatialObservation,
  });
  // A corrected strict submission can contain both a stale top-level reason
  // and a correct, model-authored reason for the *same exact option*. Reuse
   // that second statement only when it is the sole contradiction and a full
  // reinspection clears every claim. Never invent a safer interpretation or
  // turn an actually exposed formation into a no-threat assertion.
  const authoredReason = String(selection.publicReason || "").trim();
   const replacementField = threatClaimInspection.contradictions.length === 1
     ? threatClaimInspection.contradictions[0].field : null;
   if (["selectedReason", "scoreOrPositionValue"].includes(replacementField)
     && authoredReason && authoredReason !== normalized[replacementField]) {
     const staleReason = normalized[replacementField];
     normalized[replacementField] = authoredReason;
    const reinspection = inspectStarcraftTmgFormationThreatClaimsV1({
      raw: normalized, selection, option, spatialObservation,
    });
    if (reinspection.contradicted) {
       normalized[replacementField] = staleReason;
    } else {
      normalized.formationReasonReconciliation = {
        schemaVersion: "starcraft_tmg_same_submission_formation_reason_reconciliation_v1",
        normalizationVersion: ACTION_SHAPE_NORMALIZATION_VERSION,
        formationOptionId,
        sourceField: "formationSelection.publicReason",
         replacedField: replacementField,
        originalReasonHash: hashStarcraftTmgContract(staleReason),
        replacementReasonHash: hashStarcraftTmgContract(authoredReason),
        allThreatClaimsReinspected: true,
        rulesAuthority: false,
        trainingTruth: false,
      };
      threatClaimInspection = reinspection;
    }
  }
  if (threatClaimInspection.contradicted) {
    const first = threatClaimInspection.contradictions[0];
    throw correctionError(
      "ACTION_FORMATION_THREAT_CLAIM_CONTRADICTS_PROJECTION",
      threatContradictionDetail(first),
    );
  }
  const submittedAssignments = Array.isArray(selection.slotAssignments)
    ? selection.slotAssignments : [];
  const hostDefaultAssignmentUsed = submittedAssignments.length === 0;
  const overallReason = String(selection.publicReason || "").trim();
  const assignments = hostDefaultAssignmentUsed ? option.slots.map((slot) => ({
    slotId: slot.slotId,
    modelId: slot.defaultModelId,
    publicReason: slot.solverPublicReason || overallReason
      || "Selected as part of the complete Host-solved formation.",
  })) : submittedAssignments;
  if (assignments.length !== option.slots.length) {
    throw correctionError("ACTION_FORMATION_SLOT_DENOMINATOR_INVALID",
      `${assignments.length}->${option.slots.length}`);
  }
  const assignmentBySlot = new Map();
  const assignedModels = new Set();
  const rationales = [];
  for (const [index, assignment] of assignments.entries()) {
    const slotId = String(assignment?.slotId || "");
    const modelId = String(assignment?.modelId || "");
    const publicReason = String(assignment?.publicReason
      || assignment?.reason || "").trim();
    const slot = option.slots.find((entry) => entry.slotId === slotId);
    if (!object(assignment) || !slot || assignmentBySlot.has(slotId)
      || assignedModels.has(modelId)
      || !slot.compatibleModelIds.includes(modelId)
      || !publicReason) {
      throw correctionError("ACTION_FORMATION_SLOT_ASSIGNMENT_INVALID",
        String(index));
    }
    assignmentBySlot.set(slotId, { slot, modelId, publicReason });
    assignedModels.add(modelId);
    rationales.push({ slotId, modelId, isLeading: slot.isLeading,
      position: clone(slot.position), publicReason: publicReason.slice(0, 1_000) });
  }
  const parameters = clone(option.canonicalParameters);
  if (chosenPayment) parameters.paymentCardInstanceIds = clone(chosenPayment);
  const leading = rationales.find((entry) => entry.isLeading);
  if (parameters.outcome === "failure" && option.slots.length === 0) {
    normalized.proposal = {
      kind: "parameterized",
      domainId,
      parameters,
    };
    normalized.formationSelection = {
      formationOptionId,
      paymentCardInstanceIds: clone(chosenPayment || []),
      formationReceiptHash: receipt.queryReceiptHash,
      patternId: option.patternId,
      solverPolicyId: option.solverPolicyId || null,
      formationObjectives: clone(option.formationObjectives || []),
      tacticalMetrics: clone(option.tacticalMetrics || null),
      relationshipComparison: clone(option.relationshipComparison || null),
      anchor: clone(option.anchor),
      publicReason: overallReason,
      hostDefaultAssignmentUsed,
      slotAssignments: [],
    };
    normalized.placementRationales = [];
    return normalized;
  }
  if (!leading) {
    throw correctionError("ACTION_FORMATION_LEADING_SLOT_REQUIRED");
  }
  if (hostDefaultAssignmentUsed) {
    // Preserve the exact Host-instantiated parameter shape. Some actions bind
    // their fixed leader in the domain rather than in the parameter object.
  } else if (object(parameters.placementPlan)) {
    parameters.placementPlan.leadingModelId = leading.modelId;
    parameters.placementPlan.placements = rationales.map((entry) => ({
      modelId: entry.modelId,
      ...clone(entry.position),
    }));
  } else if (Array.isArray(parameters.placement)) {
    // Self-place Rules returns the complete layout under this native key.
    // Do not leave an old placement array while writing ignored placements.
    parameters.placement = rationales.map((entry) => ({
      modelId: entry.modelId, ...clone(entry.position),
    }));
  } else if (option.actionType === "resolve_charge") {
    if (leading.modelId !== option.fixedLeadingModelId) {
      throw correctionError("ACTION_FORMATION_FIXED_LEADER_REASSIGNED",
        `${leading.modelId}->${option.fixedLeadingModelId}`);
    }
    parameters.placements = rationales.filter((entry) => !entry.isLeading)
      .map((entry) => ({ modelId: entry.modelId, ...clone(entry.position) }));
  } else {
    parameters.leadingModelId = leading.modelId;
    const placementsIncludeLeading = Array.isArray(parameters.placements)
      && parameters.placements.some((entry) =>
        entry.modelId === parameters.leadingModelId);
    parameters.placements = rationales.filter((entry) =>
      placementsIncludeLeading || !entry.isLeading)
      .map((entry) => ({ modelId: entry.modelId, ...clone(entry.position) }));
  }
  normalized.proposal = {
    kind: "parameterized",
    domainId,
    parameters,
  };
  normalized.formationSelection = {
    formationOptionId,
    paymentCardInstanceIds: clone(chosenPayment || []),
    formationReceiptHash: receipt.queryReceiptHash,
    patternId: option.patternId,
    solverPolicyId: option.solverPolicyId || null,
    formationObjectives: clone(option.formationObjectives || []),
    tacticalMetrics: clone(option.tacticalMetrics || null),
    relationshipComparison: clone(option.relationshipComparison || null),
    anchor: clone(option.anchor),
    publicReason: overallReason,
    hostDefaultAssignmentUsed,
    slotAssignments: rationales.map((entry) => ({
      slotId: entry.slotId,
      modelId: entry.modelId,
      publicReason: entry.publicReason,
    })),
  };
  normalized.placementRationales = rationales;
  return normalized;
}

function bindAssetPlacementSelection(raw, queryReceipts) {
  if (!object(raw) || !object(raw.proposal)
    || raw.proposal.kind !== "parameterized") return raw;
  const normalized = clone(raw);
  const domainId = String(normalized.proposal.domainId || "");
  const receipt = exactAssetPlacementReceipt(queryReceipts, domainId);
  if (!receipt) return normalized;
  const selection = object(normalized.assetPlacementSelection)
    ? normalized.assetPlacementSelection
    : object(normalized.proposal.assetPlacementSelection)
      ? normalized.proposal.assetPlacementSelection : normalized.proposal;
  const placementOptionId = String(selection.placementOptionId || "");
  const submittedParametersHash = object(normalized.proposal.parameters)
    ? hashStarcraftTmgContract(normalized.proposal.parameters) : null;
  const option = receipt.result.placementOptions.find((entry) =>
    entry.placementOptionId === placementOptionId)
    || (submittedParametersHash ? receipt.result.placementOptions.find((entry) =>
      hashStarcraftTmgContract(entry.canonicalParameters)
        === submittedParametersHash) : null);
  const publicReason = String(selection.publicReason || selection.reason
    || normalized.selectedReason
    || normalized.publicDecisionSummary?.purpose || "").trim();
  if (!option || !publicReason) {
    throw correctionError("ACTION_ASSET_PLACEMENT_SELECTION_REQUIRED",
      domainId);
  }
  const threatClaimInspection = inspectStarcraftTmgFormationThreatClaimsV1({
    raw: normalized,
    selection: { ...clone(selection), publicReason },
    option,
  });
  if (threatClaimInspection.contradicted) {
    const first = threatClaimInspection.contradictions[0];
    throw correctionError(
      "ACTION_ASSET_PLACEMENT_THREAT_CLAIM_CONTRADICTS_PROJECTION",
      threatContradictionDetail(first),
    );
  }
  normalized.proposal = {
    kind: "parameterized",
    domainId,
    parameters: clone(option.canonicalParameters),
  };
  normalized.assetPlacementSelection = {
    placementOptionId: option.placementOptionId,
    placementReceiptHash: receipt.queryReceiptHash,
    coordinate: clone(option.coordinate),
    sourceCandidateKind: option.sourceCandidateKind,
    selectionFacet: option.selectionFacet || null,
    tacticalMetrics: clone(option.tacticalMetrics || null),
    relationshipComparison: clone(option.relationshipComparison || null),
    publicReason: publicReason.slice(0, 1_000),
  };
  normalized.placementRationales = [
    ...(Array.isArray(normalized.placementRationales)
      ? normalized.placementRationales : []),
    { kind: "battlefield_asset", pieceId: option.pieceId,
      effectKind: option.effectKind, coordinate: clone(option.coordinate),
      publicReason: publicReason.slice(0, 1_000) },
  ];
  return normalized;
}

function bindExactInstantiatedProposal(raw, queryReceipts, planner) {
  if (!object(raw)) return raw;
  const domainId = String(planner?.recommendedCandidateId || "");
  const receipt = exactInstantiationReceipt(queryReceipts, domainId);
  if (!receipt) return raw;
  const submitted = object(raw.proposal) ? raw.proposal : null;
  if (submitted?.kind === "finite") return raw;
  const explicitCandidateRefs = [
    submitted?.domainId,
    submitted?.candidateId,
    raw.candidateId,
  ].filter(Boolean).map(String);
  if (explicitCandidateRefs.some((entry) => entry !== domainId)) return raw;
  const normalized = clone(raw);
  if (typeof normalized.proposal === "string"
    && normalized.proposal.trim()
    && !normalized.providerProposalNarrative) {
    normalized.providerProposalNarrative = normalized.proposal.trim();
  }
  if (submitted && submitted.kind !== "parameterized") {
    normalized.providerProposalEnvelope = clone(submitted);
  }
  normalized.proposal = {
    kind: "parameterized",
    domainId,
    parameters: clone(receipt.result.canonicalParameters),
  };
  normalized.exactInstantiationBinding = {
    queryReceiptHash: receipt.queryReceiptHash,
    actionHash: receipt.result.actionHash || null,
    domainId,
  };
  return normalized;
}

function normalizeActionOutputShape(raw, planner = null, selected = null) {
  if (!object(raw)) return raw;
  const normalized = clone(raw);
  const intent = object(normalized.intent) ? normalized.intent : null;
  if (!intent) return normalized;
  const rawSummary = normalized.publicDecisionSummary;
  const summary = object(rawSummary) ? rawSummary
    : typeof rawSummary === "string" ? { summary: rawSummary } : {};
  const visibleFacts = strings(summary.visibleFacts);
  if (!visibleFacts.length) {
    summary.visibleFacts = [summary.summary, summary.expectedOutcome,
      summary.opportunityCost].map((entry) => String(entry || "").trim())
      .filter(Boolean).slice(0, 8);
  }
  if (!String(summary.plan || "").trim()) {
    summary.plan = text(summary.summary || summary.action
      || intent.currentGoal || intent.purpose, "");
  }
  normalized.publicDecisionSummary = summary;
  intent.currentGoal = text(intent.currentGoal,
    summary.plan || normalized.selectedReason || "");
  intent.purpose = text(intent.purpose,
    summary.purpose || normalized.selectedReason || intent.currentGoal);
  intent.expectedOwnOutcome = text(intent.expectedOwnOutcome,
    summary.expectedOutcome || normalized.scoreOrPositionValue
      || intent.purpose);
  intent.nextDecisionFocus = text(intent.nextDecisionFocus,
    summary.nextDecisionFocus || summary.replanTrigger || intent.currentGoal);
  const publicRisk = text(normalized.risk || summary.risk,
    "The expected exchange may change before the plan completes.");
  const publicBenefit = text(normalized.scoreOrPositionValue
    || intent.expectedOwnOutcome,
  "Advances the selected current plan.");
  const publicAcceptance = text(normalized.selectedReason || intent.purpose,
    "The bounded benefit currently exceeds the cost.");
  const planFallbacks = strings(planner?.plan?.contingencies);
  const planReplanTriggers = strings(summary.reviseIf).length
    ? strings(summary.reviseIf) : strings(planner?.plan?.reviseIf);
  const selectedPieceId = String(selected?.action?.pieceId || "").trim();
  const selectedAbilityName = String(
    selected?.action?.abilityName || "").trim();
  const selectedResourceKinds = Object.entries(
    selected?.action?.resourceContract?.costs || {})
    .filter(([, amount]) => Number(amount) > 0)
    .map(([kind]) => String(kind));
  if (!Array.isArray(intent.tradeoffs)) {
    intent.tradeoffs = [{
      benefit: publicBenefit,
      cost: publicRisk,
      acceptanceReason: publicAcceptance,
    }];
  }
  if (!Array.isArray(intent.risks)) intent.risks = [publicRisk];
  if (!Array.isArray(intent.fallbacks)) {
    intent.fallbacks = planFallbacks.length
      ? planFallbacks : ["Reassess and choose a current legal alternative."];
  }
  if (!Array.isArray(intent.stopOrReplanTriggers)) {
    intent.stopOrReplanTriggers = planReplanTriggers.length
      ? planReplanTriggers
      : ["the current authority or expected exchange materially changes"];
  }
  if (!Array.isArray(intent.unitIds)) {
    intent.unitIds = selectedPieceId ? [selectedPieceId] : [];
  }
  if (!Array.isArray(intent.skillsUsed)) intent.skillsUsed = [];
  if (!Array.isArray(intent.abilitiesIntended)) {
    intent.abilitiesIntended = selectedAbilityName ? [selectedAbilityName] : [];
  }
  if (!Array.isArray(intent.resourcesIntended)) {
    intent.resourcesIntended = selectedResourceKinds;
  }
  for (const field of ["expectedEffects", "predictedOpponentResponses",
    "tradeoffs", "risks", "fallbacks", "stopOrReplanTriggers", "unitIds",
    "skillsUsed", "abilitiesIntended", "resourcesIntended"]) {
    if (typeof intent[field] === "string" && intent[field].trim()) {
      intent[field] = [intent[field].trim()];
    }
  }
  const fallbacks = strings(intent.fallbacks);
  const triggers = strings(intent.stopOrReplanTriggers);
  const responseBasis = strings(summary.visibleFacts).slice(0, 4);
  if (Array.isArray(intent.predictedOpponentResponses)) {
    intent.predictedOpponentResponses = intent.predictedOpponentResponses
      .map((entry, index) => {
        const source = object(entry) ? entry : {
          opponentAction: String(entry || "").trim(),
        };
        return {
          ...clone(source),
          responseId: String(source.responseId || `response-${index + 1}`),
          actionClass: canonicalPredictedActionClass(text(
            source.actionClass || source.actionType, "unknown_action", 160)),
          opponentAction: text(source.opponentAction,
            "Opponent may choose the strongest visible counter-action."),
          likelyActorUnitId: text(source.likelyActorUnitId
            || source.actorUnitId, "", 200) || null,
          likelyTargetUnitId: text(source.likelyTargetUnitId
            || source.targetUnitId, "", 200) || null,
          horizon: object(source.horizon) ? {
            kind: new Set(["next_opponent_action", "current_phase",
              "current_round", "bounded_public_transitions"])
              .has(source.horizon.kind)
              ? source.horizon.kind : "next_opponent_action",
            count: Math.max(1, Math.min(64,
              Number(source.horizon.count || 1))),
          } : { kind: "next_opponent_action", count: 1 },
          confidence: Number.isFinite(Number(source.confidence))
            ? Math.max(0, Math.min(1, Number(source.confidence))) : 0.5,
          basis: strings(source.basis).length
            ? strings(source.basis) : clone(responseBasis),
          evidenceRefs: strings(source.evidenceRefs).length
            ? strings(source.evidenceRefs) : clone(responseBasis),
          invalidationCriteria: strings(source.invalidationCriteria).length
            ? strings(source.invalidationCriteria)
            : [source.replanIf || triggers[index] || triggers[0]
              || "the observed opponent action differs materially"],
          counterResponse: text(source.counterResponse,
            fallbacks[index] || fallbacks[0]
              || "Reassess against the observed response."),
          counterPurpose: text(source.counterPurpose,
            intent.purpose || intent.currentGoal
              || "Preserve the current objective."),
          replanIf: source.replanIf || triggers[index] || triggers[0] || null,
          probabilityEvidenceRef: source.probabilityEvidenceRef || null,
        };
      });
  }
  if (Array.isArray(intent.tradeoffs)) {
    intent.tradeoffs = intent.tradeoffs.map((entry) => object(entry) ? {
      ...clone(entry),
      benefit: text(entry.benefit, normalized.scoreOrPositionValue
        || "Advances the selected current plan."),
      cost: text(entry.cost, normalized.risk
        || "Consumes position, tempo, or resources."),
      acceptanceReason: text(entry.acceptanceReason,
        normalized.selectedReason || intent.purpose
          || "The bounded benefit currently exceeds the cost."),
    } : {
      benefit: text(normalized.scoreOrPositionValue,
        "Advances the selected current plan."),
      cost: text(entry, normalized.risk
        || "Consumes position, tempo, or resources."),
      acceptanceReason: text(normalized.selectedReason || intent.purpose,
        "The bounded benefit currently exceeds the cost."),
    });
  }
  return normalized;
}

function selectedProposal(raw, actions) {
  const candidate = object(raw?.proposal)
    ? clone(raw.proposal)
    : raw?.candidateId
      ? { kind: "finite", actionKey: String(raw.candidateId) }
      : null;
  let selected = null;
  if (candidate?.kind === "finite") {
    selected = actions.find((entry) => entry.kind === "finite"
      && entry.id === candidate.actionKey);
  } else if (candidate?.kind === "parameterized" && object(candidate.parameters)) {
    selected = actions.find((entry) => entry.kind === "parameterized"
      && entry.id === candidate.domainId);
  }
  if (!selected) {
    throw Object.assign(new TypeError(
      "model proposal is absent from the current spatial ActionSpace"), {
      code: "DECISION_PROPOSAL_ILLEGAL",
      severity: "High",
    });
  }
  return { proposal: candidate, selected };
}

function skillRefs(snapshot) {
  const candidates = Array.isArray(snapshot?.skillRefs)
    ? snapshot.skillRefs : Array.isArray(snapshot?.entries) ? snapshot.entries : [];
  return candidates.map((entry) => {
    if (typeof entry === "string") return entry;
    return entry?.skillId || entry?.id || entry?.refId || null;
  }).filter(Boolean).map(String).slice(0, 64);
}

function normalizeRejected(raw, actions, selectedId) {
  const known = new Set(actions.map((entry) => entry.id));
  const seen = new Set();
  const result = [];
  for (const entry of Array.isArray(raw) ? raw : []) {
    const id = String(entry?.candidateId || entry?.actionKey
      || entry?.domainId || "");
    if (!id || id === selectedId || !known.has(id) || seen.has(id)) continue;
    seen.add(id);
    result.push({ candidateId: id,
      reason: text(entry?.reason, "Lower current positional or resource value.", 2_000) });
  }
  if (!result.length) {
    const fallback = actions.find((entry) => entry.id !== selectedId);
    if (fallback) result.push({ candidateId: fallback.id,
      reason: "Rejected after current plan, position, risk and resource comparison." });
  }
  return result.slice(0, 16);
}

function normalizeOpponentResponses(value) {
  const result = (Array.isArray(value) ? value : []).filter(object)
    .map((entry, index) => ({
      responseId: String(entry.responseId || `response-${index + 1}`),
      actionClass: canonicalPredictedActionClass(text(
        entry.actionClass || entry.actionType, "unknown_action", 160)),
      opponentAction: text(entry.opponentAction,
        "Opponent may choose the strongest current counter-action."),
      likelyActorUnitId: text(entry.likelyActorUnitId
        || entry.actorUnitId, "", 200) || null,
      likelyTargetUnitId: text(entry.likelyTargetUnitId
        || entry.targetUnitId, "", 200) || null,
      horizon: object(entry.horizon) ? {
        kind: new Set(["next_opponent_action", "current_phase", "current_round",
          "bounded_public_transitions"]).has(entry.horizon.kind)
          ? entry.horizon.kind : "next_opponent_action",
        count: Math.max(1, Math.min(64, Number(entry.horizon.count || 1))),
      } : { kind: "next_opponent_action", count: 1 },
      confidence: Number.isFinite(Number(entry.confidence))
        ? Math.max(0, Math.min(1, Number(entry.confidence))) : 0.5,
      basis: strings(entry.basis),
      evidenceRefs: strings(entry.evidenceRefs),
      invalidationCriteria: strings(entry.invalidationCriteria).length
        ? strings(entry.invalidationCriteria)
        : [entry.replanIf || "the observed response differs materially"],
      counterResponse: text(entry.counterResponse,
        "Re-evaluate the plan against the observed response."),
      counterPurpose: text(entry.counterPurpose,
        "Preserve the current objective while limiting the counterplay."),
      replanIf: entry.replanIf ? String(entry.replanIf) : null,
      probabilityEvidenceRef: entry.probabilityEvidenceRef || null,
    }));
  return result.length ? result.slice(0, 8) : [{
    responseId: "response-1",
    actionClass: "unknown_action",
    opponentAction: "Opponent may choose the strongest current counter-action.",
    likelyActorUnitId: null,
    likelyTargetUnitId: null,
    horizon: { kind: "next_opponent_action", count: 1 },
    confidence: 0.5,
    basis: ["current visible position and LegalSpace"],
    evidenceRefs: [],
    invalidationCriteria: ["the observed response differs materially"],
    counterResponse: "Re-evaluate against the observed response at the next choice point.",
    counterPurpose: "Keep the plan coherent without assuming hidden information.",
    replanIf: "the observed response invalidates the expected exchange",
    probabilityEvidenceRef: null,
  }];
}

function normalizeTradeoffs(value) {
  const result = (Array.isArray(value) ? value : []).filter(object)
    .map((entry) => ({
      benefit: text(entry.benefit, "Improves current plan progress."),
      cost: text(entry.cost, "Consumes tempo, position, or resources."),
      acceptanceReason: text(entry.acceptanceReason,
        "Expected benefit currently exceeds the bounded cost."),
    }));
  return result.length ? result.slice(0, 8) : [{
    benefit: "Advances the current objective from the visible board state.",
    cost: "Accepts the stated positional, tempo, and resource risk.",
    acceptanceReason: "The selected action has the best current bounded value.",
  }];
}

export function projectStarcraftTmgPredictionCalibrationEvidenceV1(
  matchMemory, assessment = {},
) {
  const records = matchMemory?.workingMemory?.opponentModel?.predictionCalibrations;
  const available = (Array.isArray(records) ? records : [])
    // Continuity supplies provenance-bearing compactRecord envelopes, not
    // bare payloads. Preserve legacy direct payloads without changing memory.
    .map((entry) => object(entry?.payload) ? entry.payload : entry)
    .filter((entry) => object(entry) && entry.calibrationHash)
    .map((entry) => ({
      calibrationHash: String(entry.calibrationHash),
      classification: entry.classification ? String(entry.classification) : null,
      responseId: entry.responseId ? String(entry.responseId) : null,
    }));
  const evidenceText = [
    ...strings(assessment.evidenceFor),
    ...strings(assessment.evidenceAgainst),
    ...strings(assessment.changedAssumptions),
    ...strings(assessment.opponentModelUpdates),
    assessment.revisionReason,
  ].filter(Boolean).join("\n");
  return {
    predictionCalibrationsAvailable: available,
    predictionCalibrationsCited: available.filter((entry) =>
      evidenceText.includes(entry.calibrationHash)),
  };
}

function normalizeDecision(raw, input, match, queryReceipts, providerTrace) {
  if (!object(raw)) {
    throw Object.assign(new TypeError("model returned no decision object"), {
      code: "DECISION_OUTPUT_MISSING",
      severity: "Medium",
    });
  }
  const actions = actionIndex(input.spatialActionSpace);
  const { proposal, selected } = selectedProposal(raw, actions);
  const lifecycleAssessment = object(raw.lifecycleAssessment)
    ? validateLifecycleAssessment(raw.lifecycleAssessment, input, selected.id)
    : freeze({
      currentPhase: String(input.roomProjection?.state?.phase || "unknown"),
      selectedActionType: String(selected.action?.actionType || "unknown"),
      acknowledgesForfeitedCurrentActions: false,
      forfeitedCurrentActionTypes: [],
      plannedFollowUpActions: [],
      successorEvidenceRef: null,
      opportunityCostSummary:
        "Deterministic Host continuation; no strategic future-action claim.",
      rulesAuthority: false,
      trainingTruth: false,
    });
  const selectedReason = text(raw.selectedReason
    || raw.publicDecisionSummary?.purpose,
  "Selected from the current Rules-owned ActionSpace after comparing visible options.");
  const scoreOrPositionValue = text(raw.scoreOrPositionValue
    || raw.publicDecisionSummary?.scoreOrPositionValue,
  "Best current bounded position, objective, and resource value.");
  const risk = text(raw.risk || raw.publicDecisionSummary?.risk,
    "The opponent may alter the exchange before the plan completes.");
  const rejectedAlternatives = normalizeRejected(raw.rejectedAlternatives,
    actions, selected.id);
  const existingPlan = input.planState?.plan || null;
  const rawPlan = object(raw.plan) ? raw.plan : {};
  const plan = existingPlan ? null : {
    objective: text(rawPlan.objective, selectedReason),
    currentGoal: text(rawPlan.currentGoal, selectedReason),
    strategicApproach: strings(rawPlan.strategicApproach).length
      ? strings(rawPlan.strategicApproach) : [selectedReason],
    successSignals: strings(rawPlan.successSignals).length
      ? strings(rawPlan.successSignals) : [scoreOrPositionValue],
    activationPriorities: strings(rawPlan.activationPriorities),
    resourcePolicy: strings(rawPlan.resourcePolicy),
    initiativePolicy: strings(rawPlan.initiativePolicy),
    reservePolicy: strings(rawPlan.reservePolicy),
    futureActionPlans: Array.isArray(rawPlan.futureActionPlans)
      ? clone(rawPlan.futureActionPlans) : [],
    reviseIf: strings(rawPlan.reviseIf).length ? strings(rawPlan.reviseIf)
      : ["the expected response or positional value materially changes"],
    assumptions: strings(rawPlan.assumptions),
    opponentModel: strings(rawPlan.opponentModel),
    contingencies: strings(rawPlan.contingencies),
  };
  const activePlan = existingPlan || plan;
  const rawAssessment = object(raw.assessment) ? raw.assessment : {};
  const verdict = ["continue", "revise", "complete", "abandon"]
    .includes(rawAssessment.verdict) ? rawAssessment.verdict : "continue";
  const health = ["sound", "at_risk", "invalid", "achieved"]
    .includes(rawAssessment.health) ? rawAssessment.health : "sound";
  const assessment = {
    verdict,
    health,
    continuitySummary: text(rawAssessment.continuitySummary,
      existingPlan ? "Reassessed the active plan against the current authority snapshot."
        : "Opened and assessed the initial plan against the current authority snapshot."),
    currentGoal: text(rawAssessment.currentGoal, activePlan.currentGoal),
    evidenceFor: strings(rawAssessment.evidenceFor).length
      ? strings(rawAssessment.evidenceFor) : [scoreOrPositionValue],
    evidenceAgainst: strings(rawAssessment.evidenceAgainst),
    changedAssumptions: strings(rawAssessment.changedAssumptions),
    opponentModelUpdates: strings(rawAssessment.opponentModelUpdates),
    unresolvedRisks: strings(rawAssessment.unresolvedRisks).length
      ? strings(rawAssessment.unresolvedRisks) : [risk],
    nextDecisionFocus: text(rawAssessment.nextDecisionFocus,
      activePlan.currentGoal),
    revisionReason: rawAssessment.revisionReason
      ? String(rawAssessment.revisionReason) : null,
  };
  const rawRevision = object(raw.planRevision) ? raw.planRevision : {};
  const planRevision = verdict === "revise" ? {
    ...clone(activePlan),
    ...clone(rawRevision),
    objective: text(rawRevision.objective, activePlan.objective),
    currentGoal: text(rawRevision.currentGoal, assessment.currentGoal),
  } : null;
  const rawIntent = object(raw.intent) ? raw.intent : {};
  const predictedOpponentResponses = normalizeOpponentResponses(
    rawIntent.predictedOpponentResponses
      || raw.publicDecisionSummary?.predictedOpponentResponses);
  const tradeoffs = normalizeTradeoffs(rawIntent.tradeoffs
    || raw.publicDecisionSummary?.tradeoffs);
  const queryRefs = queryReceipts.filter((entry) => object(entry)
    && entry.authority?.stateHash === input.roomProjection.room.stateHash
    && entry.authority?.legalSpaceHash === input.legalSpace.legalSpaceHash);
  const {
    predictionCalibrationsAvailable: availablePredictionCalibrations,
    predictionCalibrationsCited: citedPredictionCalibrations,
  } = projectStarcraftTmgPredictionCalibrationEvidenceV1(
    input.matchMemory, assessment);
  const intent = {
    currentGoal: text(rawIntent.currentGoal, assessment.currentGoal),
    purpose: text(rawIntent.purpose, selectedReason),
    decisionSummary: text(rawIntent.decisionSummary, selectedReason),
    planContinuity: text(rawIntent.planContinuity,
      existingPlan ? "Continues or explicitly revises the active plan."
        : "Starts the initial plan for this match."),
    expectedOwnOutcome: text(rawIntent.expectedOwnOutcome,
      scoreOrPositionValue),
    expectedEffects: strings(rawIntent.expectedEffects).length
      ? strings(rawIntent.expectedEffects) : [scoreOrPositionValue],
    predictedOpponentResponses,
    tradeoffs,
    risks: strings(rawIntent.risks).length ? strings(rawIntent.risks) : [risk],
    fallbacks: strings(rawIntent.fallbacks).length ? strings(rawIntent.fallbacks)
      : ["Reassess and choose a current legal alternative."],
    stopOrReplanTriggers: strings(rawIntent.stopOrReplanTriggers).length
      ? strings(rawIntent.stopOrReplanTriggers)
      : ["the current authority or expected exchange materially changes"],
    nextDecisionFocus: text(rawIntent.nextDecisionFocus,
      assessment.nextDecisionFocus),
    unitIds: strings(rawIntent.unitIds),
    skillsUsed: strings(rawIntent.skillsUsed).length
      ? strings(rawIntent.skillsUsed) : skillRefs(match.strategySkillSnapshot),
    abilitiesIntended: strings(rawIntent.abilitiesIntended),
    resourcesIntended: strings(rawIntent.resourcesIntended),
    rejectedAlternatives: clone(rejectedAlternatives),
    queryReceipts: clone(queryRefs),
  };
  const publicDecisionSummary = freeze({
    visibleFacts: strings(raw.publicDecisionSummary?.visibleFacts).length
      ? strings(raw.publicDecisionSummary.visibleFacts)
      : ["Used the current player-view board, LegalSpace and spatial ActionSpace."],
    plan: text(raw.publicDecisionSummary?.plan,
      activePlan.currentGoal),
    purpose: selectedReason,
    alternatives: clone(rejectedAlternatives),
    calculations: strings(raw.publicDecisionSummary?.calculations).length
      ? strings(raw.publicDecisionSummary.calculations)
      : [scoreOrPositionValue, ...queryRefs.map((entry) =>
        `${entry.queryKind}:${entry.status}`)],
    predictedOpponentResponses: clone(predictedOpponentResponses),
    counterResponses: predictedOpponentResponses.map((entry) => ({
      responseId: entry.responseId,
      counterResponse: entry.counterResponse,
      counterPurpose: entry.counterPurpose,
    })),
    risk,
    reviseIf: clone(intent.stopOrReplanTriggers),
    skillRefs: skillRefs(match.strategySkillSnapshot),
    queryReceiptRefs: queryRefs.map((entry) => ({
      queryKind: entry.queryKind,
      status: entry.status,
      queryReceiptHash: entry.queryReceiptHash,
    })),
    placementRationales: Array.isArray(raw.placementRationales)
      ? clone(raw.placementRationales) : [],
    lifecycleAssessment: clone(lifecycleAssessment),
    reasoningPolicy:
      "public_summary_and_evidence_only_no_hidden_chain_of_thought",
  });
  return freeze({
    proposal,
    candidateId: selected.id,
    selectedActionIdentity: selectedActionIdentity(
      input.spatialActionSpace, selected.id),
    selectedActionResourceContract: selectedActionResourceContract(
      input.spatialActionSpace, selected.id),
    selectedReason,
    scoreOrPositionValue,
    risk,
    rejectedAlternatives,
    plan,
    assessment,
    planRevision,
    intent,
    lifecycleAssessment,
    plannerResult: object(raw.plannerResult)
      ? clone(raw.plannerResult) : null,
    publicDecisionSummary,
    decisionMaterialEvidence: freeze({
      queryReceipts: queryRefs.map((entry) => ({
        queryKind: entry.queryKind,
        status: entry.status,
        precision: entry.precision || null,
        queryReceiptHash: entry.queryReceiptHash,
      })),
      predictionCalibrationsAvailable: availablePredictionCalibrations,
      predictionCalibrationsCited: citedPredictionCalibrations,
      planDisposition: assessment.verdict,
      planRevised: Boolean(planRevision),
      predictedOpponentResponseCount: predictedOpponentResponses.length,
      hiddenChainOfThoughtStored: false,
    }),
    formationSelection: object(raw.formationSelection)
      ? clone(raw.formationSelection) : null,
    assetPlacementSelection: object(raw.assetPlacementSelection)
      ? clone(raw.assetPlacementSelection) : null,
    placementRationales: Array.isArray(raw.placementRationales)
      ? clone(raw.placementRationales) : [],
    speech: raw.speech ? String(raw.speech).slice(0, 4_000) : null,
    providerTrace,
    rulesAuthority: false,
    confirmationAuthority: false,
    applyAuthority: false,
    trainingTruth: false,
  });
}

function responseParts(output) {
  const nativeCalls = output?.providerTurn?.kind === "tool_calls"
    && Array.isArray(output.providerTurn.toolCalls)
    ? output.providerTurn.toolCalls : [];
  const terminalCalls = nativeCalls.filter((call) => new Set([
    NATIVE_PLANNING_SUBMIT_TOOL_NAME,
    NATIVE_DECISION_SUBMIT_TOOL_NAME,
  ]).has(String(call?.name || "")));
  const terminal = terminalCalls.length === 1 && nativeCalls.length === 1
    ? {
      name: String(terminalCalls[0].name),
      arguments: clone(terminalCalls[0].arguments || {}),
      issue: terminalCalls[0].argumentIssue
        ? String(terminalCalls[0].argumentIssue) : null,
    }
    : terminalCalls.length > 0 ? {
      name: null,
      arguments: null,
      issue: terminalCalls.length > 1
        ? "multiple_terminal_submissions"
        : "terminal_submission_mixed_with_query_tools",
    } : null;
  const channels = object(output?.channels) ? output.channels : {};
  const planningPayload = terminal?.name === NATIVE_PLANNING_SUBMIT_TOOL_NAME
    && object(terminal.arguments) ? terminal.arguments
    : object(channels.planning) ? channels.planning
    : object(output?.planning) ? output.planning
      : typeof output?.recommendedCandidateId === "string"
        && object(output?.plan) ? output : null;
  const planningEnvelope = object(channels.planning) ? channels : output;
  const planning = planningPayload ? {
    ...clone(planningPayload),
    publicPlanSummary: planningPayload.publicPlanSummary
      ?? planningEnvelope?.publicPlanSummary,
    lifecycleAssessment: planningPayload.lifecycleAssessment
      ?? planningEnvelope?.lifecycleAssessment,
  } : null;
  const decisionPayload = terminal?.name === NATIVE_DECISION_SUBMIT_TOOL_NAME
    && object(terminal.arguments) ? terminal.arguments
    : object(channels.decision) ? channels.decision
    : object(output?.decision) ? output.decision
      : object(output?.proposal) || output?.candidateId ? output : null;
  const decisionEnvelope = object(channels.decision) ? channels : output;
  const decision = decisionPayload ? {
    ...clone(decisionPayload),
    selectedReason: decisionPayload.selectedReason
      ?? decisionEnvelope?.selectedReason,
    scoreOrPositionValue: decisionPayload.scoreOrPositionValue
      ?? decisionEnvelope?.scoreOrPositionValue,
    risk: decisionPayload.risk ?? decisionEnvelope?.risk,
    rejectedAlternatives: decisionPayload.rejectedAlternatives
      ?? decisionEnvelope?.rejectedAlternatives,
    intent: decisionPayload.intent ?? decisionEnvelope?.intent,
    formationSelection: decisionPayload.formationSelection
      ?? decisionEnvelope?.formationSelection
      ?? decisionPayload.proposal?.formationSelection
      ?? decisionPayload.proposal?.parameters?.formationSelection,
    assetPlacementSelection: decisionPayload.assetPlacementSelection
      ?? decisionEnvelope?.assetPlacementSelection
      ?? decisionPayload.proposal?.assetPlacementSelection
      ?? decisionPayload.proposal?.parameters?.assetPlacementSelection,
    placementRationales: decisionPayload.placementRationales
      ?? decisionEnvelope?.placementRationales,
    lifecycleAssessment: decisionPayload.lifecycleAssessment
      ?? decisionEnvelope?.lifecycleAssessment,
    publicDecisionSummary: decisionPayload.publicDecisionSummary
      ?? decisionEnvelope?.publicDecisionSummary,
    speech: decisionPayload.speech ?? decisionEnvelope?.speech,
  } : null;
  let queryContainer = null;
  for (const name of QUERY_CHANNEL_NAMES) {
    if (channels[name] !== undefined) queryContainer = channels[name];
    else if (output?.[name] !== undefined) queryContainer = output[name];
    if (queryContainer !== null) break;
  }
  const source = Array.isArray(queryContainer) ? queryContainer
    : Array.isArray(queryContainer?.requests) ? queryContainer.requests : [];
  const queries = [];
  const seen = new Set();
  for (const [index, entry] of source.entries()) {
    if (!object(entry)) continue;
    const queryKind = String(entry.queryKind || entry.kind || "").trim();
    if (!queryKind) continue;
    const request = {
      requestId: String(entry.requestId || `query-${index + 1}`),
      queryKind,
      arguments: object(entry.arguments) ? clone(entry.arguments) : {},
    };
    if (containsApiCredential(request)) continue;
    const identity = hashStarcraftTmgContract(request);
    if (!seen.has(identity)) {
      seen.add(identity);
      queries.push(request);
    }
  }
  return { planning, decision, queries, terminal };
}

function bindLifecycleEvidence(value, input, candidateId) {
  const result = clone(value || {});
  result.currentPhase = String(input.roomProjection?.state?.phase || "unknown");
  const successor = input.preexecutionSearch?.result?.hypotheses?.find((entry) =>
    entry.candidateId === candidateId)?.successor || null;
  if (successor?.status === "exact") {
    result.successorEvidenceRef = successor.successorHash;
  } else if (!String(result.successorEvidenceRef || "").trim()) {
    result.successorEvidenceRef = null;
  }
  return result;
}

function plannerOpponentModelSnapshot(raw, input) {
  if (raw?.currentGoalSource !== "plan.currentGoal"
    || !Array.isArray(raw.plan?.opponentModel)) return null;
  return {
    schemaVersion: "starcraft_tmg_opponent_model_snapshot_v1",
    source: "declared_planner_plan_opponent_model",
    authority: {
      roomId: input.roomProjection?.room?.roomId,
      matchBindingHash: input.roomProjection?.matchBinding?.bindingHash,
      stateRevision: input.roomProjection?.room?.stateRevision,
      stateHash: input.roomProjection?.room?.stateHash,
      legalSpaceHash: input.legalSpace?.legalSpaceHash,
    },
    statements: strings(raw.plan.opponentModel),
    strategicPlanReplacementAllowed: false,
    rulesAuthority: false,
  };
}

function mapPlanningSubmission(raw, input) {
  if (!object(raw)) return raw;
  const result = clone(raw);
  const delta = result.planUpdateMode === "field_delta_v1";
  if (result.planUpdateMode !== undefined && !delta) {
    throw correctionError("PLANNER_PLAN_UPDATE_MODE_UNSUPPORTED");
  }
  if (delta) {
    if (!object(input.planState?.plan)) {
      throw correctionError("PLANNER_DELTA_BASE_REQUIRED");
    }
    if (!object(result.plan)) throw correctionError("PLANNER_PLAN_TYPE_INVALID");
    // Null/omitted means retain; [] is an explicit replacement. Do not expand
    // inherited opponent beliefs before snapshot binding: that would forge
    // freshness for unchanged historical beliefs.
    result.plan = Object.fromEntries(Object.entries(result.plan)
      .filter(([, value]) => value !== null && value !== undefined));
    if (result.assessment?.verdict === "revise") {
      result.planRevision = { ...clone(input.planState.plan), ...clone(result.plan),
        revisionReason: result.plan.revisionReason
          || result.assessment.continuitySummary };
    }
  }
  // The Host derives this advisory observation from the declared full plan;
  // a model cannot supply its own source/authority wrapper.
  delete result.opponentModelSnapshot;
  const opponentSnapshot = plannerOpponentModelSnapshot(result, input);
  if (opponentSnapshot) result.opponentModelSnapshot = opponentSnapshot;
  // A new submission explicitly declares ONE goal source. A deprecated extra
  // assessment.currentGoal is not a second vote. Legacy paid replies without
  // this declaration retain their old semantics; never silently choose between
  // their competing model-authored fields or rewrite an accepted history.
  if (result.currentGoalSource !== undefined) {
    if (result.currentGoalSource !== "plan.currentGoal") {
      throw correctionError("PLANNER_CURRENT_GOAL_SOURCE_UNSUPPORTED");
    }
    const goal = String(result.plan?.currentGoal || "").trim();
    if (!goal) throw correctionError("PLANNER_CURRENT_GOAL_REQUIRED");
    if (!object(result.assessment)) {
      throw correctionError("PLANNER_ASSESSMENT_OBJECT_REQUIRED");
    }
    const deprecatedGoal = result.assessment.currentGoal;
    result.assessment.currentGoal = goal;
    result.plannerGoalContract = {
      version: "single_current_goal_v1",
      goalSource: "plan.currentGoal",
      candidateId: result.recommendedCandidateId,
      authority: {
        roomId: input.roomProjection?.room?.roomId || null,
        stateRevision: input.roomProjection?.room?.stateRevision ?? null,
        stateHash: input.roomProjection?.room?.stateHash || null,
      },
      ...(typeof deprecatedGoal === "string" && deprecatedGoal !== goal ? {
        ignoredDeprecatedGoal: deprecatedGoal,
        advisory: "deprecated_assessment_goal_not_a_second_source",
      } : {}),
      strategicRevisionRequested: result.assessment.verdict === "revise",
      hiddenChainOfThoughtStored: false,
      trainingTruth: false,
    };
  }
  result.lifecycleAssessment = bindLifecycleEvidence(
    result.lifecycleAssessment, input, result.recommendedCandidateId);
  if (result.assessment?.verdict !== "revise") delete result.planRevision;
  // Continuing a strategy is compatible with adding a concrete future use of
  // the selected capability. Do not silently replace the whole strategy, or
  // call the model's explicitly submitted item missing because verdict is
  // continue. Only this declared protocol and current Rules capability may
  // produce the bounded amendment; historical ambiguous replies stay unchanged.
  delete result.futureActionPlanAmendment;
  const identity = selectedActionIdentity(input.spatialActionSpace,
    result.recommendedCandidateId);
  if (result.currentGoalSource === "plan.currentGoal"
    && result.assessment?.verdict === "continue" && input.planState?.plan
    && identity?.effectContract?.futurePlanRequirement?.required === true) {
    const items = (Array.isArray(result.plan?.futureActionPlans)
      ? result.plan.futureActionPlans : []).filter(entry => object(entry)
        && entry.enablingCandidateId === result.recommendedCandidateId);
    if (items.length) result.futureActionPlanAmendment = {
      schemaVersion: "starcraft_tmg_bounded_future_action_plan_amendment_v1",
      candidateId: result.recommendedCandidateId,
      basePlanHash: input.planState.plan.planHash,
      authority: {
        roomId: input.roomProjection?.room?.roomId,
        matchBindingHash: input.roomProjection?.matchBinding?.bindingHash,
        stateRevision: input.roomProjection?.room?.stateRevision,
        stateHash: input.roomProjection?.room?.stateHash,
        legalSpaceHash: input.legalSpace?.legalSpaceHash,
      },
      futureActionPlans: clone(items),
      modelVerdict: "continue",
      strategicPlanReplacementAllowed: false,
      trainingTruth: false,
    };
  }
  if (result.formationSearchRequested === true) {
    result.formationSearchRequest = {
      preferredAnchor: {
        xMilliInches: Number(result.formationPreferredX),
        yMilliInches: Number(result.formationPreferredY),
      },
      maximumOptions: Number(result.formationMaximumOptions),
      tacticalPurpose: String(result.formationTacticalPurpose || ""),
      formationObjectives: clone(result.formationObjectives || []),
    };
  }
  if (result.assetPlacementSearchRequested === true) {
    result.assetPlacementSearchRequest = {
      preferredAnchor: {
        xMilliInches: Number(result.assetPreferredX),
        yMilliInches: Number(result.assetPreferredY),
      },
      maximumOptions: Number(result.assetMaximumOptions),
      tacticalPurpose: String(result.assetTacticalPurpose || ""),
    };
  }
  for (const field of [
    "formationSearchRequested", "formationPreferredX", "formationPreferredY",
    "formationMaximumOptions", "formationTacticalPurpose", "formationObjectives",
    "assetPlacementSearchRequested", "assetPreferredX", "assetPreferredY",
    "assetMaximumOptions", "assetTacticalPurpose",
  ]) delete result[field];
  return result;
}

export function projectStarcraftTmgSubmittedPlanningV1(raw, input,
  { terminal = false } = {}) {
  const structuredSubmission = object(raw)
    && (Object.hasOwn(raw, "formationSearchRequested")
      || Object.hasOwn(raw, "assetPlacementSearchRequested")
      || Object.hasOwn(raw, "currentGoalSource"));
  return terminal || structuredSubmission
    ? mapPlanningSubmission(raw, input) : raw;
}

// Same-view facts, not a strategy score or an enforced opening queue. Keep the
// original arrival forecast separate from accepted deployment events and the
// CURRENT Rules supply; a zero planned pool cost is not zero marker strength.
export function projectStarcraftTmgPlanProgressFactsV1(input = {}) {
  const projection = input.roomProjection || {};
  const state = projection.state || {};
  const seatKey = projection.viewer?.seatKey || null;
  const plan = input.planState?.plan || null;
  const pieces = (Array.isArray(state.pieces) ? state.pieces : [])
    .filter(piece => seatKey && piece.sideKey === seatKey);
  const own = new Map(pieces.map(piece => [piece.id || piece.unitInstanceId, piece]));
  const logs = (Array.isArray(state.log) ? state.log : []).filter(row =>
    row.action?.sideKey === seatKey && own.has(row.action?.pieceId));
  const deployments = new Map();
  const latestActions = new Map();
  for (const row of logs) {
    const unitId = row.action.pieceId;
    latestActions.set(unitId, {
      sourceLogId: row.id || null,
      round: row.round ?? null,
      phase: row.phase || null,
      actionType: row.action.actionType || null,
    });
    if (row.action.actionType === "deploy"
      && row.events?.some(event => event.type === "unit_deploy_resolved")
      && !deployments.has(unitId)) {
      deployments.set(unitId, {
        round: row.round ?? null, sourceLogId: row.id || null,
      });
    }
  }
  const origin = plan?.pregamePlanOrigin;
  const schedule = plan?.pregameRosterArrivalSchedule;
  const scheduleInScope = !origin || origin.seatKey === seatKey;
  const entries = scheduleInScope && Array.isArray(schedule?.entries)
    ? schedule.entries : [];
  const numeric = value => typeof value === "number" && Number.isFinite(value)
    ? value : null;
  const presentState = piece => !piece ? "unknown"
    : piece.isDestroyed === true ? "destroyed"
      : piece.isOnField === true ? "on_field"
        : piece.isInReserves === true ? "reserves" : "unknown";
  return freeze({
    schemaVersion: "starcraft_tmg_plan_progress_facts_v1",
    authority: {
      roomId: projection.room?.roomId || null,
      stateRevision: projection.room?.stateRevision ?? null,
      stateHash: projection.room?.stateHash || null,
      seatKey,
      round: numeric(state.round),
      phase: state.phase || null,
    },
    strategicPlanRef: plan ? {
      planId: plan.planId || null,
      version: plan.version ?? null,
      planHash: plan.planHash || null,
    } : null,
    arrivalForecastSource: schedule ? {
      scheduleHash: schedule.scheduleHash || null,
      fromOriginalPregamePlan: true,
      currentLegalityAuthority: false,
    } : null,
    arrivalRows: entries.map(entry => {
      const unitId = entry.unitInstanceId;
      const piece = own.get(unitId);
      const deployed = deployments.get(unitId);
      return {
        unitId,
        sideKey: seatKey,
        plannedFirstArrivalRound: numeric(entry.round),
        plannedStartingSupply: numeric(entry.startingSupply),
        plannedPoolSupply: numeric(entry.poolSupply),
        observedFirstDeploymentRound: deployed?.round ?? null,
        deploymentSourceLogId: deployed?.sourceLogId || null,
        presentState: presentState(piece),
        currentSupply: numeric(piece?.currentSupply),
        currentModels: numeric(piece?.currentModels),
        latestAcceptedAction: latestActions.get(unitId) || null,
      };
    }),
    ownUnits: pieces.map(piece => ({
      unitId: piece.id || piece.unitInstanceId,
      presentState: presentState(piece),
      currentSupply: numeric(piece.currentSupply),
      currentModels: numeric(piece.currentModels),
      latestAcceptedAction: latestActions.get(piece.id || piece.unitInstanceId)
        || null,
    })),
    unknownDeploymentRoundIsNotNeverDeployed: true,
    originalArrivalRoundsAreAdvisory: true,
    noStrategyPreferenceWeights: true,
    mayOverrideRules: false,
    trainingTruth: false,
  });
}

export function selectStarcraftTmgPlannerLocalReplayAttemptV1(choice, input, {
  eligibleAlreadyRevalidatedAttemptKeys = null, onlyValid = false,
} = {}) {
  const scopedKeys = Array.isArray(eligibleAlreadyRevalidatedAttemptKeys)
    ? new Set(eligibleAlreadyRevalidatedAttemptKeys) : null;
  const candidates = [...(choice.attemptKeys || [])].reverse().filter((key) => {
    const attempt = choice.attempts?.[key];
    return attempt?.status === "completed"
      && object(responseParts(attempt.safeOutput).planning)
      && (scopedKeys ? scopedKeys.has(key)
        : attempt.localPlannerSemanticReplayVersion
          !== PLANNER_SHAPE_NORMALIZATION_VERSION);
  });
  const currentInput = decisionInputForChoice(input, choice);
  const valid = candidates.find((key) => {
    try {
      const parts = responseParts(choice.attempts[key].safeOutput);
      normalizePlannerOutput(projectStarcraftTmgSubmittedPlanningV1(
        parts.planning, currentInput, { terminal: Boolean(parts.terminal) }),
      currentInput, choice.queryReceipts || []);
      return true;
    } catch {
      return false;
    }
  });
  // Exactly as for Action recovery: preserve all original paid returns and
  // use the latest fully valid one at the SAME current authority. If none is
  // valid, retain the existing rejection/three-correction boundary.
  return valid || (!onlyValid ? candidates[0] : null) || null;
}

// Explicit contract recovery must not erase the corrective context. Recheck
// original paid planning replies against the SAME current authority and rebuild
// feedback using the current normalizer, not obsolete error-only protocol text.
export function applyStarcraftTmgPlanningPromptRepairRecoveryV1(
  choice, repairPlan, input, recordedAt, providerInteractionMode) {
  if (input.roomProjection?.room?.stateRevision !== choice.authority.stateRevision
    || input.roomProjection?.room?.stateHash !== choice.authority.stateHash
    || input.spatialActionSpace?.actionSpaceHash
      !== choice.authority.spatialActionSpaceHash) {
    throw new Error("LIVE_DECISION_PROMPT_REPAIR_AUTHORITY_CHANGED");
  }
  const currentInput = decisionInputForChoice(input, choice);
  const history = [];
  let lastRejected = null;
  for (const key of choice.attemptKeys || []) {
    const attempt = choice.attempts?.[key];
    if (attempt?.status !== "completed" || attempt.stage !== "planning") continue;
    const parts = responseParts(attempt.safeOutput);
    if (!object(parts.planning)) continue;
    try {
      normalizePlannerOutput(projectStarcraftTmgSubmittedPlanningV1(
        parts.planning, currentInput, { terminal: Boolean(parts.terminal) }),
      currentInput, choice.queryReceipts || []);
    } catch (error) {
      if (!String(error.code || "").startsWith("PLANNER_")) throw error;
      const correction = error.correction || error.code;
      const feedback = buildStarcraftTmgSemanticCorrectionFeedbackV1({
        stage: "planning", correction,
        issues: error.correctionIssues || [], history, providerInteractionMode,
      });
      history.push({ stage: "planning", sourceAttemptKey: key, correction,
        issues: clone(feedback.current.issues) });
      lastRejected = { attemptKey: key, output: attempt.safeOutput, feedback };
    }
  }
  if (!lastRejected && repairPlan.reason
    === "typed_truncation_after_output_contract_change") {
    const previousMessages = clone(choice.providerContinuationMessages || []);
    applyStarcraftTmgPromptRepairRecoveryV1(choice, repairPlan, recordedAt);
    choice.providerContinuationMessages = [...previousMessages, { role: "user",
      content: JSON.stringify({ issue: "output_truncated",
        sourceAttemptKey: repairPlan.lastAttemptKey,
        correction: "Use the current output contract. The complete existing plan remains available; return the current intention and changed fields instead of copying unchanged source prose. Do not infer a finished decision from the truncated reply. Strategy selection, reflection and queries remain yours." }) }];
    Object.assign(choice.promptRepairHistory.at(-1), {
      authorityRevision: choice.authority.stateRevision,
      authorityStateHash: choice.authority.stateHash,
      correctiveContextRebuilt: true, strategyRecommendationProvided: false });
    return;
  }
  if (!lastRejected) {
    throw new Error("LIVE_DECISION_PROMPT_REPAIR_NO_CURRENT_CORRECTION");
  }
  const oldMessages = clone(choice.providerContinuationMessages || []);
  const oldFeedbackHistory = clone(choice.semanticCorrectionFeedbackHistory || []);
  applyStarcraftTmgPromptRepairRecoveryV1(choice, repairPlan, recordedAt);
  const outputText = JSON.stringify(lastRejected.output);
  choice.providerContinuationMessages = [{ role: "assistant",
    content: outputText.length <= 64_000 ? outputText : JSON.stringify({
      previousOutputHash: hashStarcraftTmgContract(lastRejected.output),
      omittedOversizeOutput: true,
    }) }, { role: "user", content: JSON.stringify(lastRejected.feedback) }];
  choice.semanticCorrectionFeedbackHistory = [...oldFeedbackHistory, ...history];
  Object.assign(choice.promptRepairHistory.at(-1), {
    previousContinuationMessages: oldMessages,
    previousSemanticCorrectionFeedbackHistory: oldFeedbackHistory,
    correctiveContextRebuilt: true,
    correctionSourceAttemptKeys: history.map(entry => entry.sourceAttemptKey),
    lastRejectedAttemptKey: lastRejected.attemptKey,
    authorityRevision: choice.authority.stateRevision,
    authorityStateHash: choice.authority.stateHash,
    strategyRecommendationProvided: false,
    ...(choice.selectedEffectPlannerRecoveries?.at(-1)?.promptPolicyVersion
      === repairPlan.nextPromptPolicyVersion ? { maximumNewSemanticCorrections: 1 } : {}),
  });
}

function parseSubmittedParametersJson(value) {
  const normalized = normalizeProviderJsonDocumentV1(String(value || ""));
  try {
    const parsed = JSON.parse(normalized.text);
    if (!object(parsed) || containsApiCredential(parsed)) throw new Error();
    return parsed;
  } catch {
    throw correctionError("ACTION_PARAMETER_JSON_INVALID");
  }
}

export function canonicalizeStarcraftTmgSubmittedParameterAliasesV1(
  candidate, parameters) {
  const domain = sourceActionDomain(candidate);
  if (domain?.actionType !== "charge"
    || domain?.parameterKind
      !== "official_selected_roster_charge_declaration_v1"
    || !object(parameters) || !Array.isArray(parameters.targets)
    || Object.keys(parameters).some((key) =>
      !["leadingModelId", "targets"].includes(key))) return parameters;
  const eligible = domain.constraints?.eligibleTargetModelIdsByUnitId || {};
  const targets = parameters.targets.map((entry) => {
    if (!object(entry)
      || Object.keys(entry).sort().join(",")
        !== "targetModelId,targetUnitId") return null;
    const unitId = String(entry.targetUnitId || "");
    const modelId = String(entry.targetModelId || "");
    return eligible[unitId]?.includes(modelId)
      ? { unitId, modelId } : null;
  });
  // Ambiguous or unknown values go unchanged to the authoritative Rules gate.
  return targets.length > 0 && targets.every(Boolean)
    ? { ...parameters, targets } : parameters;
}

const CORRECTION_LIFTED_INTENT_FIELDS = Object.freeze([
  "lifecycleAssessment", "publicDecisionSummary", "selection", "speech",
]);
const SELECTION_SENSITIVE_INTENT_FIELDS = new Set([
  "tradeoffs", "risks", "fallbacks", "stopOrReplanTriggers",
  "nextDecisionFocus",
]);
const CORRECTION_STABLE_INTENT_ARRAY_FIELDS = Object.freeze([
  "unitIds", "skillsUsed", "abilitiesIntended", "resourcesIntended",
]);

function correctionSelectionIdentity(selection) {
  if (!object(selection)) return null;
  return hashStarcraftTmgContract({
    kind: selection.kind || null,
    optionId: selection.optionId || null,
    parametersJson: selection.parametersJson || null,
    slotAssignments: clone(selection.slotAssignments || []),
    paymentCardInstanceIds: clone(selection.paymentCardInstanceIds || []),
  });
}

function liftCorrectionIntentFields(raw) {
  const submission = clone(raw);
  const intent = object(submission?.intent) ? clone(submission.intent) : {};
  const liftedFields = [];
  for (const field of CORRECTION_LIFTED_INTENT_FIELDS) {
    if (submission[field] === undefined && intent[field] !== undefined) {
      submission[field] = clone(intent[field]);
      delete intent[field];
      liftedFields.push(field);
    }
  }
  if (object(submission?.intent)) submission.intent = intent;
  return { submission, liftedFields };
}

export function recoverStarcraftTmgCorrectionSubmissionV1(
  raw, choice, options = {}) {
  if (!object(raw)) return { submission: clone(raw), recovered: false,
    sourceAttemptKey: null, inheritedFields: [], liftedFields: [] };
  const liftedCurrent = liftCorrectionIntentFields(raw);
  const current = liftedCurrent.submission;
  const currentIntent = object(current.intent) ? clone(current.intent) : {};
  const liftedFields = liftedCurrent.liftedFields;
  const candidateId = String(current.candidateId || "");
  if (!candidateId || Number(choice?.semanticCorrectionRounds || 0) < 1) {
    return { submission: current, recovered: liftedFields.length > 0,
      sourceAttemptKey: null, inheritedFields: [], liftedFields };
  }
  const attempts = [...(choice?.attemptKeys || [])].reverse()
    .map((attemptKey) => ({ attemptKey,
      attempt: choice?.attempts?.[attemptKey] }))
    .filter(({ attemptKey, attempt }) =>
      attemptKey !== options.currentAttemptKey
      && attempt?.stage === "action"
      && attempt?.status === "completed");
  for (const { attemptKey, attempt } of attempts) {
    const rawPrior = responseParts(attempt.safeOutput).decision;
    const prior = object(rawPrior)
      ? liftCorrectionIntentFields(rawPrior).submission : rawPrior;
    if (!object(prior) || String(prior.candidateId || "") !== candidateId
      || !object(prior.selection)) continue;
    const selectionChanged = Boolean(correctionSelectionIdentity(current.selection)
      && correctionSelectionIdentity(prior.selection)
      && correctionSelectionIdentity(current.selection)
        !== correctionSelectionIdentity(prior.selection));
    const inheritedFields = Object.keys(prior).filter((field) =>
      current[field] === undefined);
    const priorIntent = clone(prior.intent || {});
    for (const field of CORRECTION_STABLE_INTENT_ARRAY_FIELDS) {
      if (currentIntent[field] !== undefined
        || Array.isArray(priorIntent[field])) continue;
      for (const historical of attempts) {
        const historicalRaw = responseParts(
          historical.attempt.safeOutput).decision;
        const historicalSubmission = object(historicalRaw)
          ? liftCorrectionIntentFields(historicalRaw).submission : null;
        if (String(historicalSubmission?.candidateId || "") !== candidateId
          || !Array.isArray(historicalSubmission?.intent?.[field])) continue;
        priorIntent[field] = clone(historicalSubmission.intent[field]);
        break;
      }
    }
    if (selectionChanged) {
      for (const field of SELECTION_SENSITIVE_INTENT_FIELDS) {
        if (currentIntent[field] === undefined) delete priorIntent[field];
      }
    }
    const merged = { ...clone(prior), ...current,
      intent: { ...priorIntent, ...clone(current.intent || {}) } };
    return { submission: merged, recovered: true,
      sourceAttemptKey: attemptKey, inheritedFields, liftedFields,
      selectionChanged };
  }
  return { submission: current, recovered: liftedFields.length > 0,
    sourceAttemptKey: null, inheritedFields: [], liftedFields };
}

export function recoverStarcraftTmgCorrectionSelectionV1(raw, choice) {
  return recoverStarcraftTmgCorrectionSubmissionV1(raw, choice);
}

export function materializeStarcraftTmgCorrectionIntentArraysV1(
  raw, recovery = {}) {
  const submission = clone(raw);
  if (recovery.selectionChanged !== true || !object(submission?.intent)) {
    return submission;
  }
  for (const field of [
    "tradeoffs", "risks", "fallbacks", "stopOrReplanTriggers",
  ]) {
    if (submission.intent[field] === undefined) submission.intent[field] = [];
  }
  return submission;
}

function mapDecisionSubmission(raw, input, choice, currentAttemptKey = null) {
  if (!object(raw)) return raw;
  const correctionRecovery = recoverStarcraftTmgCorrectionSubmissionV1(
    raw, choice, { currentAttemptKey });
  const result = materializeStarcraftTmgCorrectionIntentArraysV1(
    correctionRecovery.submission, correctionRecovery);
  const candidateId = String(result.candidateId || "");
  const selected = actionIndex(input.spatialActionSpace).find((entry) =>
    entry.id === candidateId);
  if (!selected || candidateId !== choice.plannerResult?.recommendedCandidateId) {
    throw correctionError("ACTION_DEPARTED_FROM_PLANNER", candidateId);
  }
  result.lifecycleAssessment = bindLifecycleEvidence(
    result.lifecycleAssessment, input, candidateId);
  const selection = object(result.selection) ? result.selection : {};
  if (selection.kind === "formation") {
    result.formationSelection = {
      formationOptionId: String(selection.optionId || ""),
      slotAssignments: clone(selection.slotAssignments || []),
      paymentCardInstanceIds: clone(selection.paymentCardInstanceIds || []),
      publicReason: String(selection.publicReason || ""),
    };
  } else if (selection.kind === "asset") {
    result.assetPlacementSelection = {
      placementOptionId: String(selection.optionId || ""),
      publicReason: String(selection.publicReason || ""),
    };
  } else if (selection.kind === "parameters") {
    const parameters = canonicalizeStarcraftTmgSubmittedParameterAliasesV1(
      selected.action, parseSubmittedParametersJson(selection.parametersJson));
    const payment = selection.paymentCardInstanceIds;
    if (Array.isArray(payment)) {
      const nested = parameters.paymentCardInstanceIds;
      // Payment is model-owned in the shared selection schema. Preserve old
      // JSON-only submissions whose wrapper was necessarily empty, but never
      // decide between contradictory explicit payments on the model's behalf.
      if (payment.length > 0 && nested !== undefined
        && (!Array.isArray(nested) || JSON.stringify([...payment].sort())
          !== JSON.stringify([...nested].sort()))) {
        throw correctionError("ACTION_PARAMETER_PAYMENT_CONFLICT");
      }
      if (nested === undefined && (payment.length > 0
        || sourceActionDomain(selected.action)?.parameterSchema?.required
          ?.includes("paymentCardInstanceIds"))) {
        parameters.paymentCardInstanceIds = clone(payment);
      }
    }
    result.proposal = {
      kind: "parameterized",
      domainId: candidateId,
      parameters,
    };
  } else if (selection.kind === "parameter_option") {
    result.proposal = { kind: "parameterized", domainId: candidateId,
      parameters: materializeStarcraftTmgActionParameterOptionV1(selected.action,
        String(selection.optionId || "")) };
  }
  if (correctionRecovery.recovered) {
    result.correctionFieldRecovery = {
      schema: "starcraft_tmg_action_correction_delta_recovery_v1",
      sourceAttemptKey: correctionRecovery.sourceAttemptKey,
      candidateId,
      inheritedFields: clone(correctionRecovery.inheritedFields),
      liftedFields: clone(correctionRecovery.liftedFields),
      selectionChanged: correctionRecovery.selectionChanged === true,
      rulesRevalidationRequired: true,
    };
  }
  delete result.selection;
  return result;
}

export function projectStarcraftTmgSubmittedActionV1(raw, input, choice,
  { terminal = false, currentAttemptKey = null } = {}) {
  return terminal || object(raw?.selection)
    ? mapDecisionSubmission(raw, input, choice, currentAttemptKey) : raw;
}

function normalizeSubmittedAction(attempt, input, choice) {
  const parts = responseParts(attempt?.safeOutput);
  if (!object(parts.decision)) {
    throw correctionError("ACTION_FINAL_OUTPUT_MISSING");
  }
  const submittedAction = projectStarcraftTmgSubmittedActionV1(
    parts.decision, input, choice, {
      terminal: Boolean(parts.terminal),
      currentAttemptKey: attempt.attemptKey,
    });
  const plannerBoundAction = bindPlannerSelectedProposal(submittedAction,
    input, choice.plannerResult);
  const formationBoundAction = bindStarcraftTmgFormationSelectionV1(
    plannerBoundAction, choice.queryReceipts, input.spatialObservation);
  const assetBoundAction = bindAssetPlacementSelection(formationBoundAction,
    choice.queryReceipts);
  const boundAction = bindExactInstantiatedProposal(assetBoundAction,
    choice.queryReceipts, choice.plannerResult);
  const selected = actionIndex(input.spatialActionSpace).find((entry) =>
    entry.id === choice.plannerResult?.recommendedCandidateId) || null;
  const shapedAction = normalizeActionOutputShape(boundAction,
    choice.plannerResult, selected);
  const normalizedAction = normalizeStarcraftTmgOpponentPredictionsV1({
    action: shapedAction,
    spatialObservation: input.spatialObservation,
    currentPhase: input.roomProjection?.state?.phase,
    queryReceipts: choice.queryReceipts,
  });
  validateActionOutput(normalizedAction, input, choice.plannerResult,
    choice.queryReceipts);
  return normalizedAction;
}

function strictObject(properties, description = undefined) {
  return {
    type: "object",
    properties,
    required: Object.keys(properties),
    additionalProperties: false,
    ...(description ? { description } : {}),
  };
}

function strictString(minLength = 1, maxLength = 4_000, extra = {}) {
  return { type: "string", minLength, maxLength, ...extra };
}

function strictStringArray(minItems = 0, maxItems = 32) {
  return {
    type: "array",
    items: strictString(1, 2_000),
    minItems,
    maxItems,
  };
}

function deepSeekStrictSchema(value) {
  if (Array.isArray(value)) return value.map(deepSeekStrictSchema);
  if (!object(value)) return value;
  const unsupported = new Set([
    "minLength", "maxLength", "minItems", "maxItems", "uniqueItems",
  ]);
  const result = Object.fromEntries(Object.entries(value)
    .filter(([key]) => !unsupported.has(key))
    .map(([key, child]) => [key, deepSeekStrictSchema(child)]));
  if (result.type === "object") {
    result.properties = object(result.properties) ? result.properties : {};
    result.required = Object.keys(result.properties);
    result.additionalProperties = false;
  }
  return result;
}

function deepSeekStrictTool(tool) {
  const result = clone(tool);
  result.function.strict = true;
  result.function.parameters = deepSeekStrictSchema(
    result.function.parameters);
  return result;
}

function lifecycleSubmissionSchema(input) {
  const lifecycle = phaseLifecycleContract(input);
  const actionTypes = [...new Set(lifecycle.currentActions
    .map((entry) => entry.actionType).filter(Boolean))];
  const phases = lifecycle.phaseSequence.map((entry) => entry.phase)
    .filter(Boolean);
  return strictObject({
    currentPhase: strictString(1, 120, { enum: [lifecycle.currentPhase] }),
    acknowledgesForfeitedCurrentActions: { type: "boolean" },
    forfeitedCurrentActionTypes: {
      type: "array",
      items: actionTypes.length
        ? strictString(1, 160, { enum: actionTypes }) : strictString(1, 160),
      minItems: 0,
      maxItems: Math.max(1, actionTypes.length),
      uniqueItems: true,
    },
    plannedFollowUpActions: {
      type: "array",
      items: strictObject({
        phase: phases.length
          ? strictString(1, 120, { enum: phases }) : strictString(1, 120),
        actionType: strictString(1, 160),
        evidence: strictString(1, 2_000),
      }),
      minItems: 0,
      maxItems: 8,
    },
    successorEvidenceRef: strictString(0, 160),
    opportunityCostSummary: strictString(1, 2_000),
  });
}

function planSubmissionSchema(input) {
  const schema = strictObject({
    objective: strictString(1, 2_000),
    currentGoal: strictString(1, 2_000),
    strategicApproach: strictStringArray(0, 12),
    successSignals: strictStringArray(0, 12),
    activationPriorities: strictStringArray(0, 12),
    resourcePolicy: strictStringArray(0, 12),
    initiativePolicy: strictStringArray(0, 12),
    reservePolicy: strictStringArray(0, 12),
    futureActionPlans: {
      type: "array",
      items: strictObject({
        planItemId: strictString(1, 200),
        status: strictString(1, 32, {
          enum: ["committed", "conditional", "needs_information"],
        }),
        enablingCandidateId: strictString(1, 200),
        intendedUnitId: strictString(1, 200),
        actionType: strictString(1, 160),
        earliestTiming: strictString(1, 500),
        targetOrRoute: strictString(1, 2_000),
        purpose: strictString(1, 2_000),
        benefitEvidenceRefs: strictStringArray(1, 16),
        riskEvidenceRefs: strictStringArray(1, 16),
        prerequisites: strictStringArray(1, 16),
        cancelIf: strictStringArray(1, 16),
        fallback: strictString(1, 2_000),
      }),
      minItems: 0,
      maxItems: 16,
    },
    reviseIf: strictStringArray(1, 12),
    assumptions: strictStringArray(0, 12),
    opponentModel: strictStringArray(0, 12),
    contingencies: strictStringArray(0, 12),
    revisionReason: strictString(0, 2_000),
  });
  if (object(input?.planState?.plan)) {
    for (const [field, definition] of Object.entries(schema.properties)) {
      if (field === "currentGoal") continue;
      schema.properties[field] = { anyOf: [definition, { type: "null" }],
        description: "null retains this existing plan field without copying it. A supplied value replaces it on revise; [] explicitly clears an array. opponentModel, if supplied, is a fresh declared snapshot; null preserves its original observation date." };
    }
  }
  return schema;
}

function assessmentSubmissionSchema() {
  return strictObject({
    verdict: strictString(1, 16, {
      enum: ["continue", "revise", "complete", "abandon"],
    }),
    health: strictString(1, 16, {
      enum: ["sound", "at_risk", "invalid", "achieved"],
    }),
    continuitySummary: strictString(1, 2_000),
    evidenceFor: strictStringArray(0, 16),
    evidenceAgainst: strictStringArray(0, 16),
    changedAssumptions: strictStringArray(0, 16),
    opponentModelUpdates: strictStringArray(0, 16),
    unresolvedRisks: strictStringArray(0, 16),
    nextDecisionFocus: strictString(1, 2_000),
  });
}

function planningSubmissionTool(input) {
  const ids = actionIndex(input.spatialActionSpace).map((entry) => entry.id);
  const chargeTargetIds = [...new Set(actionIndex(input.spatialActionSpace)
    .filter((entry) => sourceActionDomain(entry.action)?.actionType === "charge")
    .flatMap((entry) => Object.keys(sourceActionDomain(entry.action)
      ?.constraints?.eligibleTargetModelIdsByUnitId || {})))].sort();
  const comparisonMinimum = ids.length > 1 ? 1 : 0;
  return {
    type: "function",
    function: {
      name: NATIVE_PLANNING_SUBMIT_TOOL_NAME,
      description:
        "Finish the Planner stage. Select one current candidate and submit plan changes, reflection, comparison, lifecycle and evidence summaries. With an existing plan use field_delta_v1: keep unchanged fields null, write the current intention in currentGoal, and change strategic fields only with verdict revise. Continue retains strategy and can append required current-candidate futureActionPlans. Do not copy the source plan. This does not execute an action.",
      strict: true,
      parameters: strictObject({
        recommendedCandidateId: strictString(1, 200, { enum: ids }),
        currentGoalSource: strictString(1, 32, {
          enum: ["plan.currentGoal"],
          description: "plan.currentGoal is the single model-authored current intention; assessment has no separate currentGoal.",
        }),
        selectedChargeTargetUnitId: strictString(0, 200, {
          enum: ["", ...chargeTargetIds],
          description: "For Charge, choose exactly one eligible intended target Unit; for every other action use an empty string.",
        }),
        ...(object(input.planState?.plan) ? { planUpdateMode:
          strictString(1, 32, { enum: ["field_delta_v1"] }) } : {}),
        plan: planSubmissionSchema(input),
        assessment: assessmentSubmissionSchema(),
        informationNeeds: {
          type: "array",
          items: strictObject({
            queryKind: strictString(1, 160, { enum: [...NATIVE_QUERY_KINDS] }),
            status: strictString(1, 32, {
              enum: ["needed", "satisfied", "unknown", "not_applicable"],
            }),
            reason: strictString(1, 2_000),
          }),
          minItems: 0,
          maxItems: 16,
        },
        candidateComparisons: {
          type: "array",
          items: strictObject({
            candidateId: strictString(1, 200, { enum: ids }),
            evaluation: strictString(1, 2_000),
          }),
          minItems: comparisonMinimum,
          maxItems: Math.max(1, Math.min(64, ids.length)),
        },
        formationSearchRequested: { type: "boolean" },
        formationPreferredX: { type: "integer" },
        formationPreferredY: { type: "integer" },
        formationMaximumOptions: { type: "integer", minimum: 1, maximum: 8 },
        formationTacticalPurpose: strictString(0, 2_000),
        formationObjectives: {
          type: "array",
          items: strictObject({
            kind: strictString(1, 80, {
              enum: [...STARCRAFT_TMG_FORMATION_OBJECTIVE_KINDS],
            }),
            weight: { type: "integer", minimum: 1, maximum: 5 },
            targetIds: strictStringArray(0, 24),
          }),
          minItems: 0,
          maxItems: 8,
        },
        assetPlacementSearchRequested: { type: "boolean" },
        assetPreferredX: { type: "integer" },
        assetPreferredY: { type: "integer" },
        assetMaximumOptions: { type: "integer", minimum: 1, maximum: 8 },
        assetTacticalPurpose: strictString(0, 2_000),
        lifecycleAssessment: lifecycleSubmissionSchema(input),
        publicPlanSummary: strictObject({
          plan: strictString(1, 2_000),
          visibleFacts: strictStringArray(1, 16),
          purpose: strictString(1, 2_000),
          calculations: strictStringArray(0, 16),
          risk: strictString(1, 2_000),
          reviseIf: strictStringArray(1, 16),
        }),
      }),
    },
  };
}

function actionSelectionContract(input, choice, queryReceipts) {
  const selected = actionIndex(input.spatialActionSpace).find((entry) =>
    entry.id === choice.plannerResult?.recommendedCandidateId);
  if (!selected) return { kind: "finite", optionIds: [""] };
  const formation = exactFormationReceipt(queryReceipts, selected.id);
  if (formation) return {
    kind: "formation",
    optionIds: formation.result.formationOptions
      .map((entry) => entry.formationOptionId),
    slotIds: [...new Set(formation.result.formationOptions.flatMap((entry) =>
      (entry.slots || []).map((slot) => slot.slotId)))],
    modelIds: [...new Set(formation.result.formationOptions.flatMap((entry) =>
      (entry.slots || []).flatMap((slot) => slot.compatibleModelIds || [])))],
    paymentChoices: clone(formation.result.paymentChoicesForDecision || []),
    paymentCardInstanceIds: [...new Set(
      (formation.result.paymentChoicesForDecision || []).flat())],
  };
  const asset = exactAssetPlacementReceipt(queryReceipts, selected.id);
  if (asset) return {
    kind: "asset",
    optionIds: asset.result.placementOptions
      .map((entry) => entry.placementOptionId),
  };
  if (selected.kind === "finite") return { kind: "finite", optionIds: [""] };
  if (exactInstantiationReceipt(queryReceipts, selected.id)) {
    return { kind: "host_exact", optionIds: [""] };
  }
  const contract = compileStarcraftTmgActionParameterContractV1(selected.action);
  if (contract.fullyEnumerated && contract.finiteOptions.length > 0) {
    return { kind: "parameter_option", optionIds: contract.finiteOptions.map(
      entry => entry.parameterOptionId) };
  }
  const payments = contract.paymentCombinationsByChoice
    ? Object.values(contract.paymentCombinationsByChoice).flat()
    : contract.fieldContracts.paymentCardInstanceIds?.enum || [];
  const paymentChoices = payments.filter(row => Array.isArray(row));
  return { kind: "parameters", optionIds: [""],
    paymentChoices,
    paymentCardInstanceIds: [...new Set(paymentChoices.flat())],
    maximumPaymentCards: paymentChoices.reduce((n, row) => Math.max(n, row.length), 0) };
}

function actionSubmissionTool(input, choice, queryReceipts) {
  const selectedId = choice.plannerResult.recommendedCandidateId;
  const ids = actionIndex(input.spatialActionSpace).map((entry) => entry.id);
  const selection = actionSelectionContract(input, choice, queryReceipts);
  const optionSchema = strictString(0, 200, {
    enum: selection.optionIds.length ? selection.optionIds : [""],
  });
  const slotIdSchema = selection.slotIds?.length
    ? strictString(1, 200, { enum: selection.slotIds }) : strictString(0, 200);
  const modelIdSchema = selection.modelIds?.length
    ? strictString(1, 200, { enum: selection.modelIds }) : strictString(0, 200);
  return {
    type: "function",
    function: {
      name: NATIVE_DECISION_SUBMIT_TOOL_NAME,
      description:
        "Finish the Action stage for the Planner-selected candidate. Submit only model-owned choices and public tactical evidence; the Host constructs and Rules-validates the canonical action.",
      strict: true,
      parameters: strictObject({
        candidateId: strictString(1, 200, { enum: [selectedId] }),
        selectedReason: strictString(1, 4_000),
        scoreOrPositionValue: strictString(1, 4_000),
        risk: strictString(1, 4_000),
        rejectedAlternatives: {
          type: "array",
          items: strictObject({
            candidateId: strictString(1, 200, { enum: ids }),
            reason: strictString(1, 2_000),
          }),
          minItems: 0,
          maxItems: Math.max(1, Math.min(32, ids.length)),
        },
        intent: strictObject({
          currentGoal: strictString(1, 2_000),
          purpose: strictString(1, 2_000),
          decisionSummary: strictString(1, 2_000),
          planContinuity: strictString(1, 2_000),
          expectedOwnOutcome: strictString(1, 2_000),
          expectedEffects: strictStringArray(1, 16),
          predictedOpponentResponses: {
            type: "array",
            items: strictObject({
              responseId: strictString(1, 200),
              actionClass: strictString(1, 160),
              opponentAction: strictString(1, 2_000),
              likelyActorUnitId: strictString(0, 200),
              likelyTargetUnitId: strictString(0, 200),
              horizon: strictObject({
                kind: strictString(1, 64, {
                  enum: ["next_opponent_action", "current_phase",
                    "current_round", "bounded_public_transitions"],
                }),
                count: { type: "integer", minimum: 1, maximum: 64 },
              }),
              confidence: { type: "number", minimum: 0, maximum: 1 },
              basis: strictStringArray(1, 12),
              evidenceRefs: strictStringArray(0, 12),
              invalidationCriteria: strictStringArray(1, 12),
              counterResponse: strictString(1, 2_000),
              counterPurpose: strictString(1, 2_000),
              replanIf: strictString(1, 2_000),
              probabilityEvidenceRef: strictString(0, 200),
            }),
            minItems: 1,
            maxItems: 8,
          },
          tradeoffs: {
            type: "array",
            items: strictObject({
              benefit: strictString(1, 2_000),
              cost: strictString(1, 2_000),
              acceptanceReason: strictString(1, 2_000),
            }),
            minItems: 1,
            maxItems: 8,
          },
          risks: strictStringArray(1, 16),
          fallbacks: strictStringArray(1, 16),
          stopOrReplanTriggers: strictStringArray(1, 16),
          nextDecisionFocus: strictString(1, 2_000),
          unitIds: strictStringArray(0, 32),
          skillsUsed: strictStringArray(1, 16),
          abilitiesIntended: strictStringArray(0, 16),
          resourcesIntended: strictStringArray(0, 16),
        }),
        lifecycleAssessment: lifecycleSubmissionSchema(input),
        publicDecisionSummary: strictObject({
          visibleFacts: strictStringArray(1, 16),
          plan: strictString(1, 2_000),
          purpose: strictString(1, 2_000),
          calculations: strictStringArray(0, 16),
          risk: strictString(1, 2_000),
          reviseIf: strictStringArray(1, 16),
        }),
        selection: strictObject({
          kind: strictString(1, 32, { enum: [selection.kind] }),
          optionId: optionSchema,
          slotAssignments: {
            type: "array",
            items: strictObject({
              slotId: slotIdSchema,
              modelId: modelIdSchema,
              publicReason: strictString(1, 2_000),
            }),
            minItems: 0,
            maxItems: 128,
          },
          paymentCardInstanceIds: {
            type: "array",
            items: selection.paymentCardInstanceIds?.length
              ? strictString(1, 200, {
                  enum: selection.paymentCardInstanceIds,
                }) : strictString(1, 200),
            minItems: selection.paymentChoices?.some(row => row.length === 0)
              ? 0 : selection.paymentCardInstanceIds?.length ? 1 : 0,
            maxItems: selection.maximumPaymentCards
              ?? (selection.paymentCardInstanceIds?.length
                ? Math.min(32, selection.paymentCardInstanceIds.length) : 0),
          },
          parametersJson: selection.kind === "parameters"
            ? strictString(2, 64 * 1024) : strictString(2, 2, { enum: ["{}"] }),
          publicReason: strictString(1, 2_000),
        }),
        speech: strictString(0, 4_000),
      }),
    },
  };
}

function nativeAgentLoop(choice, input, queryReceipts, stage,
  memoryQueryAvailable = false, forceTerminal = false) {
  const terminalTool = stage === "planning"
    ? planningSubmissionTool(input)
    : actionSubmissionTool(input, choice, queryReceipts);
  const exposedQueryKinds = NATIVE_QUERY_KINDS.filter((kind) =>
    !HOST_DEFERRED_QUERY_KINDS.has(kind)
      && !(stage === "planning"
        && PLANNING_POST_SELECTION_QUERY_KINDS.has(kind)));
  const interactiveTools = [createStarcraftTmgNativeSpatialQueryToolV1({
    name: NATIVE_QUERY_TOOL_NAME, queryKinds: exposedQueryKinds,
  }), {
    type: "function",
    function: {
      name: NATIVE_SKILL_TOOL_NAME,
      description:
        "Retrieve a few additional strategy excerpts from the three frozen match Skills when the compact default excerpts do not answer the current planning question. Strategy is advisory and never Rules authority.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          skillId: { type: "string" },
          maximumEntries: { type: "integer", minimum: 1, maximum: 6 },
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
  }, ...(memoryQueryAvailable ? [{
    type: "function",
    function: {
      name: NATIVE_MEMORY_TOOL_NAME,
      description:
        "Retrieve a bounded slice of the complete same-match event ledger when the fixed working summary is insufficient. In a versioned Room fork, historyLane=frozen_source_room reads same-seat pre-fork history without treating old actions as new Room receipts. This memory is advisory and never Rules authority.",
      parameters: {
        type: "object",
        properties: {
          kinds: { type: "array", items: { type: "string" } },
          historyLane: { type: "string", enum: ["combined",
            "current_versioned_room", "frozen_source_room"] },
          round: { type: "integer" },
          phase: { type: "string" },
          unitId: { type: "string" },
          abilityId: { type: "string" },
          resourceId: { type: "string" },
          text: { type: "string" },
          limit: { type: "integer", minimum: 1, maximum: 12 },
          order: { type: "string", enum: ["newest_first", "oldest_first"] },
        },
        additionalProperties: false,
      },
    },
  }] : [])];
  return {
    mode: "native_tools",
    toolChoice: "required",
    tools: [...(forceTerminal ? [] : interactiveTools), terminalTool]
      .map(deepSeekStrictTool),
    continuationMessages: compactProviderContinuationMessages(choice, stage),
  };
}

function interactionMode(value) {
  const mode = value === undefined || value === null
    ? "native_tools" : String(value);
  if (!PROVIDER_INTERACTION_MODES.has(mode)) {
    throw new TypeError("providerInteractionMode is invalid");
  }
  return mode;
}

function promptPolicyVersion(mode) {
  return mode === "json_channels_v1"
    ? JSON_CHANNEL_PROMPT_POLICY_VERSION : PROMPT_POLICY_VERSION;
}

export function shouldPreferStarcraftTmgPromptRepairOverPlannerReplayV1(
  choice, options = {}) {
  return Boolean(planStarcraftTmgPromptRepairRecoveryV1(choice, options));
}

function jsonAgentQueryInterface(nativeLoop, stage) {
  const tools = nativeLoop.tools;
  const byName = (name) => tools.find((entry) =>
    entry.function.name === name)?.function || null;
  const terminalName = stage === "planning"
    ? NATIVE_PLANNING_SUBMIT_TOOL_NAME : NATIVE_DECISION_SUBMIT_TOOL_NAME;
  return {
    schemaVersion:
      `${STARCRAFT_TMG_LIVE_FLASH_DECISION_PORT_VERSION}.json-query-interface-v1`,
    oneChannelPerTurn: true,
    queryChannel: "query_requests",
    queryShape: { requests: [{ requestId: "string", queryKind: "string",
      arguments: "object" }] },
    spatialQueryKinds: byName(NATIVE_QUERY_TOOL_NAME)
      ?.parameters?.properties?.queryKind?.enum || [],
    spatialArgumentsContract: byName(NATIVE_QUERY_TOOL_NAME)
      ?.parameters?.properties?.argumentsJson?.description || null,
    skillQueryKind: byName(NATIVE_SKILL_TOOL_NAME)
      ? NATIVE_SKILL_TOOL_NAME : null,
    skillArgumentsSchema: byName(NATIVE_SKILL_TOOL_NAME)?.parameters || null,
    memoryQueryKind: byName(NATIVE_MEMORY_TOOL_NAME)
      ? NATIVE_MEMORY_TOOL_NAME : null,
    memoryArgumentsSchema: byName(NATIVE_MEMORY_TOOL_NAME)?.parameters || null,
    terminalChannel: stage,
    terminalShape: byName(terminalName)?.parameters || null,
    queryResultsReturnInNextPromptAsHostOwnedReceipts: true,
    rulesAuthority: false,
    mutationAuthority: false,
    trainingTruth: false,
  };
}

function compactProviderContinuationMessages(choice, stage) {
  return clone(choice.providerContinuationMessages || []).map((message) => {
    if (stage !== "planning" || message?.role !== "tool"
      || typeof message.content !== "string") return message;
    try {
      const receipt = JSON.parse(message.content);
      if (!HOST_DEFERRED_QUERY_KINDS.has(String(receipt?.queryKind || ""))
        && !PLANNING_POST_SELECTION_QUERY_KINDS.has(
          String(receipt?.queryKind || ""))) {
        return {
          ...message,
          content: JSON.stringify(compactQueryReceiptForPrompt(receipt)),
        };
      }
      return {
        ...message,
        content: JSON.stringify({
          queryReceiptHash: receipt.queryReceiptHash || null,
          queryKind: receipt.queryKind,
          status: "superseded_by_host_deferred_search",
          reason: "planner_selects_candidate_and_intent_before_exact_host_search",
          exactResultPreservedInDurableDecisionRecord: true,
          rulesAuthority: false,
          mutationAuthority: false,
          trainingTruth: false,
        }),
      };
    } catch {
      return message;
    }
  });
}

function compactArmyResourceBudgetsForDecisionPrompt(budgets) {
  if (!object(budgets)) return clone(budgets);
  const retainedFields = [
    "schema", "sideKey", "scale", "mineralBudget", "mineralSpent",
    "mineralUnspent", "mineralUnspentDisposition", "mineralRetained",
    "vespeneLimit", "vespeneSpent", "vespeneUnspent",
    "vespeneUnspentDisposition", "vespeneRetained",
    "resourceConversionAllowed", "resourceConversionApplied",
    "fullResourceArithmeticValidated",
    "fullCompositionUpgradeAndFieldingLegalityValidated",
    "armySlotAuditResultHash", "resultHash",
  ];
  return Object.fromEntries(Object.entries(budgets).map(([sideKey, budget]) =>
    [sideKey, !object(budget) ? clone(budget) : Object.fromEntries(
      retainedFields.filter((field) => budget[field] !== undefined)
        .map((field) => [field, clone(budget[field])]))]));
}

export function projectStarcraftTmgLiveDecisionRoomProjectionV1(projection) {
  const state = object(projection?.state) ? projection.state : {};
  return {
    schemaVersion: `${STARCRAFT_TMG_LIVE_FLASH_DECISION_PORT_VERSION}.room-projection`,
    room: clone(projection?.room || null),
    viewer: clone(projection?.viewer || null),
    control: clone(projection?.control || null),
    matchBinding: clone(projection?.matchBinding || null),
    state: Object.fromEntries(DECISION_STATE_FIELDS
      .filter((field) => state[field] !== undefined)
      .map((field) => [field, field === "armyResourceBudgetsBySide"
        ? compactArmyResourceBudgetsForDecisionPrompt(state[field])
        : clone(state[field])])),
    omittedFromPrompt: [
      "duplicate_piece_geometry_projected_by_spatial_observation",
      "frozen_rules_and_gameplay_data_bundles",
      "historical_resolution_ledgers_not_needed_for_current_choice",
      "duplicate_army_cost_audit_rows_public_roster_preserved",
    ],
    currentAuthorityPreserved: true,
    trainingTruth: false,
  };
}

function compactLegalSpace(legalSpace) {
  return {
    schemaVersion: `${STARCRAFT_TMG_LIVE_FLASH_DECISION_PORT_VERSION}.legal-space-ref`,
    roomId: legalSpace?.roomId || null,
    matchBindingHash: legalSpace?.matchBindingHash || null,
    stateRevision: legalSpace?.stateRevision ?? null,
    stateHash: legalSpace?.stateHash || null,
    legalSpaceHash: legalSpace?.legalSpaceHash || null,
    finiteActionCount: legalSpace?.finiteActions?.length || 0,
    parameterDomainCount: legalSpace?.parameterDomains?.length || 0,
    actionBodiesProjectedBySpatialActionSpace: true,
    exactRulesInstantiationRequiredForParameterizedAction: true,
    trainingTruth: false,
  };
}

function currentRangedCasualtyResolutionEvidence(input) {
  const casualtyDomain = (input?.legalSpace?.parameterDomains || []).find(
    (domain) => ["official_selected_roster_ranged_casualty_selection_v1",
      "official_selected_roster_melee_casualty_selection_v1"].includes(domain?.parameterKind),
  );
  if (!casualtyDomain) return null;
  const pendingHash = casualtyDomain.constraints?.pendingHash || null;
  const event = [...(input?.roomProjection?.state?.log || [])]
    .reverse().flatMap((entry) => [...(entry?.events || [])].reverse())
    .find((entry) => ["ranged_attack_roll_resolved_pending_defender_casualty",
      "melee_attack_roll_resolved_pending_defender_casualty"].includes(entry?.type)
      && (!pendingHash || entry.pendingHash === pendingHash));
  const stages = event?.stages;
  if (!stages) return null;
  if (casualtyDomain.parameterKind === "official_selected_roster_melee_casualty_selection_v1") {
    return {
      schemaVersion: `${STARCRAFT_TMG_LIVE_FLASH_DECISION_PORT_VERSION}.melee-casualty-resolution-evidence`,
      attackKind: "melee", candidateId: casualtyDomain.domainId,
      attackerSideKey: event.attackerSideKey, defenderSideKey: event.defenderSideKey,
      attackerPieceId: event.attackerPieceId, targetPieceId: event.targetPieceId,
      stages: clone(stages), totalDamage: Number(stages.totalDamage || 0),
      casualtyCount: Number(event.casualtyCount || 0),
      strategicLossOptions: encodeStarcraftTmgGeometryColumnReuseV2(
        casualtyDomain.constraints?.strategicLossOptions || []),
      explicitSelectionStrategicContract: clone(
        casualtyDomain.constraints?.explicitSelectionStrategicContract || null),
      defenderActivationConsumed: false, defenderActivationClosed: false,
      diceRerolledBySelection: false, source: "current_authoritative_resolution_log",
      includedInStateOrLegalSpaceHash: false, rulesAuthority: true, trainingTruth: false,
    };
  }
  return {
    schemaVersion:
      `${STARCRAFT_TMG_LIVE_FLASH_DECISION_PORT_VERSION}.ranged-casualty-resolution-evidence`,
    candidateId: casualtyDomain.domainId,
    attackerSideKey: event.attackerSideKey,
    defenderSideKey: event.defenderSideKey,
    attackerPieceId: event.attackerPieceId,
    targetPieceId: event.targetPieceId,
    profileKey: stages.declaration?.profileKey || null,
    distanceInches: stages.declaration?.distanceInches ?? null,
    rangeBand: stages.declaration?.rangeBand || null,
    hit: {
      dice: Number(stages.hit?.dice || 0),
      rolls: clone(stages.hit?.rolls || []),
      hits: Number(stages.hit?.hits || 0),
    },
    surge: {
      rolls: clone(stages.effects?.surgeRolls || []),
      results: clone(stages.effects?.surgeResults || []),
      targetTypeMatched: stages.effects?.surgeMatched === true,
      matchedCapacity: Number(stages.effects?.surgeCapacity || 0),
      appliedBypassedArmourHits:
        Number(stages.effects?.bypassedArmourHits || 0),
    },
    armour: {
      dice: Number(stages.armour?.dice || 0),
      rolls: clone(stages.armour?.rolls || []),
      saves: Number(stages.armour?.saves || 0),
    },
    evade: {
      eligible: stages.evade?.eligible === true,
      dice: Number(stages.evade?.dice || 0),
      rolls: clone(stages.evade?.rolls || []),
      saves: Number(stages.evade?.saves || 0),
    },
    totalDamage: Number(stages.damage?.totalDamage || 0),
    casualtyCount: Number(event.casualtyCount || 0),
    strategicLossOptions:
      encodeStarcraftTmgGeometryColumnReuseV2(
        casualtyDomain.constraints?.strategicLossOptions || []),
    explicitSelectionStrategicContract: clone(
      casualtyDomain.constraints?.explicitSelectionStrategicContract || null),
    defenderActivationConsumed: false,
    defenderActivationClosed: false,
    attackerRangedSequenceRemainsPending: true,
    source: "current_authoritative_resolution_log",
    includedInStateOrLegalSpaceHash: false,
    rulesAuthority: true,
    trainingTruth: false,
  };
}

export function deriveStarcraftTmgLiveStrategySearchTermsV1(input) {
  const state = input?.roomProjection?.state || {};
  const publicCards = Object.values(state.publicRosterDisclosureBySide || {})
    .flatMap((entry) => entry?.publicCards || []);
  const boardObjects = [
    ...(input?.spatialObservation?.tokens || []),
    ...(input?.spatialObservation?.markers || []),
  ];
  const values = [
    state.phase,
    ...publicCards.flatMap((entry) => [
      entry?.recordKey, entry?.cardName, entry?.factionName, entry?.cardKind,
    ]),
    ...(input?.spatialObservation?.units || []).flatMap((entry) => [
      entry?.unitName, entry?.officialUnitRecordKey,
    ]),
    ...(input?.spatialObservation?.offTableUnits || []).flatMap((entry) => [
      entry?.unitName, entry?.officialUnitRecordKey,
    ]),
    ...(input?.spatialActionSpace?.finiteActions || []).map((entry) =>
      entry?.action?.actionType),
    ...(input?.spatialActionSpace?.parameterDomains || []).flatMap((entry) => [
      entry?.actionType,
      entry?.pieceId,
    ]),
    ...boardObjects.flatMap((entry) => [
      entry?.objectId, entry?.kind, entry?.label, entry?.source?.tokenKind,
    ]),
  ];
  return [...new Set(values.flatMap((value) => String(value || "")
    .toLowerCase().split(/[^a-z0-9_]+/gu))
    .filter((value) => value.length >= 4))];
}

function strategyEntryScore(entry, terms) {
  const searchable = JSON.stringify(entry).toLowerCase();
  return terms.reduce((score, term) => score
    + (searchable.includes(term) ? 1 : 0), 0);
}

function compactStrategyEntry(entry) {
  const fields = [
    "axis", "title", "when", "objective", "steps", "procedure",
    "alternatives", "opponentBranches", "risk", "reviseIf",
    "requiredQueries",
  ];
  return Object.fromEntries(fields.filter((field) => entry?.[field] !== undefined)
    .map((field) => [field, clone(entry[field])]));
}

function selectStrategyEntries(entries, terms, maximum) {
  return entries.map((entry, index) => ({
    entry,
    index,
    score: strategyEntryScore(entry, terms),
  })).sort((left, right) => right.score - left.score
    || left.index - right.index).slice(0, maximum)
    .sort((left, right) => left.index - right.index)
    .map(({ entry }) => compactStrategyEntry(entry));
}

function selectStrategyKnowledge(knowledge, terms, maximum) {
  return (knowledge || []).map((chapter, index) => {
    const recommendations = chapter?.draft?.recommendations || [];
    return {
      chapter,
      index,
      score: recommendations.reduce((best, entry) =>
        Math.max(best, strategyEntryScore(entry, terms)), 0),
    };
  }).sort((left, right) => right.score - left.score
    || left.index - right.index).slice(0, maximum)
    .sort((left, right) => left.index - right.index)
    .map(({ chapter }) => ({
      section: clone(chapter?.section || null),
      recommendations: selectStrategyEntries(
        chapter?.draft?.recommendations || [], terms, 1),
    }));
}

function compactStrategySkillSnapshot(snapshot, input) {
  const terms = deriveStarcraftTmgLiveStrategySearchTermsV1(input);
  const skills = (snapshot?.skills || []).map((skill) => {
    const identityFields = [
      "skillId", "version", "hash", "skillType", "factionRecordKey",
      "direction", "rulesVersion", "preconditions", "legalityChecks",
      "illegalPatterns", "canAffectRules", "canAffectStrategy",
    ];
    const result = Object.fromEntries(identityFields
      .filter((field) => skill?.[field] !== undefined)
      .map((field) => [field, clone(skill[field])]));
    if (Array.isArray(skill?.procedure)) {
      result.retrievedProcedure = selectStrategyEntries(
        skill.procedure, terms, 1);
    }
    if (Array.isArray(skill?.knowledge)) {
      result.retrievedKnowledge = selectStrategyKnowledge(
        skill.knowledge, terms, 1);
    }
    result.retrieval = {
      toolName: NATIVE_SKILL_TOOL_NAME,
      completeSkillFrozenByHash: skill?.hash || null,
      totalProcedureEntries: skill?.procedure?.length || 0,
      totalKnowledgeSections: skill?.knowledge?.length || 0,
    };
    return result;
  });
  return {
    schemaVersion:
      `${STARCRAFT_TMG_LIVE_FLASH_DECISION_PORT_VERSION}.strategy-retrieval`,
    gameId: snapshot?.gameId || null,
    ownFaction: snapshot?.ownFaction || null,
    opponentFaction: snapshot?.opponentFaction || null,
    skillRefs: clone(snapshot?.skillRefs || []),
    skillSetHash: snapshot?.skillSetHash || null,
    skills,
    retrievalTerms: terms,
    completeSkillsRemainFrozenBySkillSetHash: true,
    auditAndJudgeMetadataOmittedFromPerTurnPrompt: true,
    skillsMayOverrideRules: false,
    trainingTruth: false,
  };
}

function retrieveStrategySkill(snapshot, rawArguments = {}) {
  const query = String(rawArguments.query || "").trim();
  const terms = query.toLowerCase().split(/[^a-z0-9_]+/gu)
    .filter((entry) => entry.length >= 3);
  const requestedSkillId = String(rawArguments.skillId || "").trim();
  const requestedMaximum = Number(rawArguments.maximumEntries || 4);
  const maximumEntries = Number.isSafeInteger(requestedMaximum)
    ? Math.max(1, Math.min(6, requestedMaximum)) : 4;
  const candidates = [];
  for (const skill of snapshot?.skills || []) {
    if (requestedSkillId && skill.skillId !== requestedSkillId) continue;
    for (const [index, entry] of (skill.procedure || []).entries()) {
      candidates.push({
        skillId: skill.skillId,
        skillHash: skill.hash,
        location: `procedure:${index}`,
        entry,
        score: strategyEntryScore(entry, terms),
      });
    }
    for (const [chapterIndex, chapter] of (skill.knowledge || []).entries()) {
      for (const [index, entry] of
        (chapter?.draft?.recommendations || []).entries()) {
        candidates.push({
          skillId: skill.skillId,
          skillHash: skill.hash,
          location: `knowledge:${chapterIndex}:${index}`,
          section: clone(chapter?.section || null),
          entry,
          score: strategyEntryScore(entry, terms),
        });
      }
    }
  }
  const excerpts = candidates.sort((left, right) => right.score - left.score
    || left.skillId.localeCompare(right.skillId)
    || left.location.localeCompare(right.location)).slice(0, maximumEntries)
    .map((entry) => ({
      skillId: entry.skillId,
      skillHash: entry.skillHash,
      location: entry.location,
      section: entry.section || null,
      strategy: compactStrategyEntry(entry.entry),
      relevanceScore: entry.score,
    }));
  return seal({
    schemaVersion:
      `${STARCRAFT_TMG_LIVE_FLASH_DECISION_PORT_VERSION}.strategy-skill-query`,
    query,
    requestedSkillId: requestedSkillId || null,
    skillSetHash: snapshot?.skillSetHash || null,
    excerpts,
    totalCandidateEntries: candidates.length,
    additionalEntriesAvailable: candidates.length > excerpts.length,
    source: "frozen_match_strategy_skill_snapshot",
    rulesAuthority: false,
    skillsMayOverrideRules: false,
    mutationAuthority: false,
    trainingTruth: false,
  }, "queryReceiptHash");
}

function compactSpatialObservation(observation) {
  if (!object(observation)) return null;
  const compactFootprint = (footprint) => !object(footprint) ? null : {
    footprintHash: footprint.footprintHash || null,
    shape: footprint.shape || null,
    center: clone(footprint.center || null),
    widthMilliInches: footprint.widthMilliInches ?? null,
    depthMilliInches: footprint.depthMilliInches ?? null,
    rotationDegrees: footprint.rotationDegrees ?? 0,
    radiusMilliInches: footprint.radiusMilliInches ?? null,
  };
  const compactBoardObject = (entry) => ({
    objectId: entry?.objectId || null,
    kind: entry?.kind || null,
    label: entry?.label || null,
    footprint: clone(entry?.footprint || null),
    fullyInsideBattlefield: entry?.fullyInsideBattlefield ?? null,
    geometryStatus: entry?.geometryStatus || null,
    elevation: entry?.elevation ?? null,
    blocksLineOfSight: entry?.blocksLineOfSight ?? null,
    blocksPlacement: entry?.blocksPlacement ?? null,
    impassable: entry?.impassable ?? null,
    controlSideKey: entry?.controlSideKey || null,
  });
  const modelsByUnit = new Map();
  for (const model of observation.models || []) {
    if (!modelsByUnit.has(model.unitId)) modelsByUnit.set(model.unitId, model);
  }
  const units = (observation.units || []).map((entry) => {
    const representative = modelsByUnit.get(entry.unitId);
    return {
      unitId: entry.unitId,
      unitName: entry.unitName || null,
      officialUnitRecordKey: entry.officialUnitRecordKey || null,
      sideKey: entry.sideKey || null,
      sideRelation: entry.sideRelation || null,
      currentModels: entry.currentModels,
      currentSupply: entry.currentSupply ?? null,
      supplyControl: clone(entry.supplyControl || null),
      modelIds: clone(entry.modelIds || []),
      leadingModelId: entry.leadingModelId || null,
      formationEnvelope: clone(entry.formationEnvelope || null),
      formationGeometryStatus: entry.formationGeometryStatus || null,
      printedCoherencyState: clone(entry.printedCoherencyState || null),
      activationStatus: {
        activatedPhases:
          clone(representative?.status?.activatedPhases || {}),
        combatEngaged: representative?.status?.combatEngaged === true,
      },
    };
  });
  const models = (observation.models || []).map((entry) => ({
    unitId: entry.unitId,
    modelId: entry.modelId,
    position: clone(entry.position || null),
    footprint: compactFootprint(entry.footprint),
    fullyInsideBattlefield: entry.fullyInsideBattlefield ?? null,
    elevation: entry.elevation ?? null,
    statuses: clone(entry.status?.statuses || []),
    geometryStatus: entry.geometryStatus || null,
  }));
  return {
    schemaVersion:
      `${STARCRAFT_TMG_LIVE_FLASH_DECISION_PORT_VERSION}.compact-spatial-observation`,
    authority: {
      roomId: observation.roomId,
      matchBindingHash: observation.matchBindingHash,
      stateRevision: observation.stateRevision,
      stateHash: observation.stateHash,
      legalSpaceHash: observation.legalSpaceHash,
      observationHash: observation.observationHash,
    },
    board: clone(observation.board || null),
    units,
    models,
    offTableUnits: clone(observation.offTableUnits || []),
    terrain: encodeStarcraftTmgGeometryColumnReuseV2(
      (observation.terrain || []).map(compactBoardObject)),
    tokens: (observation.tokens || []).map(compactBoardObject),
    markers: (observation.markers || []).map(compactBoardObject),
    objectiveState: clone(observation.objectiveState || null),
    coverage: clone(observation.coverage || null),
    queryCapabilities: clone(observation.queryCapabilities || null),
    unitRepositionSemantics:
      clone(observation.unitRepositionSemantics || null),
    originalObservationFrozenByHash: observation.observationHash,
    omittedRawBoardObjectSources: true,
    rulesAuthority: "external_rules_service",
    trainingTruth: false,
  };
}

export function compactQueryReceiptForPrompt(receipt) {
  if (object(receipt)
    && receipt.queryKind === "space.inspect_relationships"
    && object(receipt.result)) {
    const result = receipt.result;
    const overviewScope = (result.scope?.subjectUnitIds?.length || 0) > 1;
    // These are small scoped facts, not a heavyweight geometry tree. Keep
    // unknown-profile lists and future/current horizon qualifiers intact;
    // dropping them makes "unresolved" look like an empty threat set.
    const compactThreat = value => !object(value) ? null : clone(value);
    const relationships = (result.relationships || []).map((entry) => {
      if (entry.edgeKind === "objective_relationship") return {
        edgeId: entry.edgeId,
        edgeKind: entry.edgeKind,
        fromUnitId: entry.fromUnitId,
        toObjectiveId: entry.toObjectiveId,
        minimumBaseEdgeDistanceMilliInches:
          entry.minimumBaseEdgeDistanceMilliInches,
        nearestModelId: entry.nearestModelId || null,
        modelIdsWithinThreeInchesSameElevation:
          clone(entry.modelIdsWithinThreeInchesSameElevation || []),
        canGeometricallyContestNow:
          entry.canGeometricallyContestNow === true,
        markerQualification: clone(entry.markerQualification || null),
        currentControlSideKey: entry.currentControlSideKey || null,
        unitCoherencyStatus: clone(entry.unitCoherencyStatus || null),
        exactControlStillRequiresCurrentMissionEligibilityAndLos:
          entry.exactControlStillRequiresCurrentMissionEligibilityAndLos
            === true,
        precision: entry.precision || null,
      };
      const projected = {
        edgeId: entry.edgeId,
        edgeKind: entry.edgeKind,
        fromUnitId: entry.fromUnitId,
        toUnitId: entry.toUnitId,
        relation: entry.relation || null,
        nearestPhysicalEdges: clone(entry.nearestPhysicalEdges || null),
        contactArc: clone(entry.contactArc || null),
        engagement: clone(entry.engagement || null),
        lineOfSight: object(entry.lineOfSight) ? {
          assessedModelPairCount: entry.lineOfSight.assessedModelPairCount,
          visibleModelPairCount: entry.lineOfSight.visibleModelPairCount,
          blockedModelPairCount: entry.lineOfSight.blockedModelPairCount,
          unknownModelPairCount: entry.lineOfSight.unknownModelPairCount,
          blockingTerrainIds:
            clone(entry.lineOfSight.blockingTerrainIds || []),
          precision: entry.lineOfSight.precision || null,
        } : null,
        threats: {
          fromTo: compactThreat(entry.threats?.fromTo),
          toFrom: compactThreat(entry.threats?.toFrom),
        },
        fireZoneExchange: clone(entry.fireZoneExchange || null),
        precision: entry.precision || null,
      };
      // Overview queries answer "which unit/pair should I inspect next?".
      // Their per-model threat/LoS arrays are also available through the
      // agent's focused query; do not repeat those bulky details for every
      // pair in a many-subject overview. Preserve exact base-edge distance,
      // threat keys with time horizon, and scoped exchange evidence here.
      if (!overviewScope) return projected;
      const summaryThreat = (threat) => !threat ? null : {
        stationaryProfileKeys: threat.stationaryProfileKeys,
        moveThenAttackProfileKeys: threat.moveThenAttackProfileKeys,
        currentRoundStationaryProfileKeys:
          threat.currentRoundStationaryProfileKeys,
        currentRoundMoveThenAttackProfileKeys:
          threat.currentRoundMoveThenAttackProfileKeys,
        futureRoundMoveThenAttackProfileKeys:
          threat.futureRoundMoveThenAttackProfileKeys,
        chargeBand: threat.chargeBand,
        spatialThreatPrecision: threat.spatialThreatPrecision,
      };
      return {
        edgeId: projected.edgeId,
        edgeKind: projected.edgeKind,
        fromUnitId: projected.fromUnitId,
        toUnitId: projected.toUnitId,
        relation: projected.relation,
        nearestPhysicalEdges: {
          distanceMilliInches:
            projected.nearestPhysicalEdges?.distanceMilliInches ?? null,
          precision: projected.nearestPhysicalEdges?.precision ?? null,
        },
        engagement: projected.engagement,
        lineOfSight: projected.lineOfSight,
        threats: { fromTo: summaryThreat(projected.threats.fromTo),
          toFrom: summaryThreat(projected.threats.toFrom) },
        fireZoneExchange: projected.fireZoneExchange ? {
          class: projected.fireZoneExchange.class,
          currentRoundClass:
            projected.fireZoneExchange.currentRoundClass,
          precision: projected.fireZoneExchange.precision,
          damageOutcomeRequiresProbabilityQuery:
            projected.fireZoneExchange
              .damageOutcomeRequiresProbabilityQuery,
        } : null,
        precision: projected.precision,
        overviewOnly: true,
        focusedQueryAvailable: true,
      };
    });
    return {
      schemaVersion: receipt.schemaVersion,
      requestId: receipt.requestId || null,
      queryKind: receipt.queryKind,
      status: receipt.status,
      reason: receipt.reason || null,
      result: {
        schemaVersion: result.schemaVersion,
        relationshipGraphHash: result.relationshipGraphHash,
        authority: clone(result.authority || null),
        hypotheticalProjection: result.hypotheticalProjection === true,
        intent: result.intent,
        seatKey: result.seatKey,
        scope: clone(result.scope || null),
        nodes: {
          units: (result.nodes?.units || []).map((entry) => ({
            nodeId: entry.nodeId,
            unitName: entry.unitName || null,
            sideKey: entry.sideKey,
            sideRelation: entry.sideRelation,
            currentModels: entry.currentModels,
            currentSupply: entry.currentSupply,
            movement: clone(entry.movement || null),
            // Full per-model envelopes and coherency are already in the
            // current spatial observation and durable tool receipt. Here
            // the unit node is only an identity/supply cross-reference.
          })),
          objectives: clone(result.nodes?.objectives || []),
          terrain: encodeStarcraftTmgGeometryColumnReuseV2(
            projectStarcraftTmgTerrainFactsForPromptV1(
              clone(result.nodes?.terrain || []))),
        },
        relationships,
        unitEnvelopeAndCoherencyInSpatialObservation: true,
        relationshipDetailLevel: overviewScope
          ? "many_subject_overview" : "focused_relationships",
        aggregates: clone(result.aggregates || null),
        mapReachabilityCertificate:
          clone(result.mapReachabilityCertificate || null),
        overlay: clone(result.overlay || null),
        precisionPolicy: clone(result.precisionPolicy || null),
        sourceReceipts: clone(result.sourceReceipts || null),
        fullRelationshipGraphStoredDurably: true,
        terrainProofMetadataRetainedByHost: true,
        exactFieldsDerivedFromRulesKernels:
          result.exactFieldsDerivedFromRulesKernels === true,
        rulesAuthority: result.rulesAuthority === true,
        currentRoomFact: result.currentRoomFact === true,
        mayMutateRoom: false,
        eligibleForTraining: false,
        trainingTruth: false,
      },
      queryReceiptHash: receipt.queryReceiptHash,
      rulesAuthority: receipt.rulesAuthority ?? false,
      mutationAuthority: false,
      trainingTruth: false,
    };
  }
  if (!object(receipt)
    || !FORMATION_QUERY_KINDS.has(receipt.queryKind)
    || !Array.isArray(receipt.result?.formationOptions)) {
    return clone(receipt);
  }
  const formationOptions = receipt.result.formationOptions.map((option) => {
    const groupByMembers = new Map();
    const compatibilityGroups = [];
    const slots = (option.slots || []).map((slot) => {
      const members = [...new Set(slot.compatibleModelIds || [])].sort();
      const identity = JSON.stringify(members);
      let groupId = groupByMembers.get(identity);
      if (!groupId) {
        groupId = `compatible-${compatibilityGroups.length + 1}`;
        groupByMembers.set(identity, groupId);
        compatibilityGroups.push({ groupId, modelIds: members });
      }
      return {
        slotId: slot.slotId,
        isLeading: slot.isLeading === true,
        defaultModelId: slot.defaultModelId || null,
        compatibilityGroupId: groupId,
        position: clone(slot.position || null),
        baseSignature: slot.baseSignature || null,
        solverPublicReason: slot.solverPublicReason || null,
      };
    });
    return {
      formationOptionId: option.formationOptionId,
      patternId: option.patternId || null,
      solverPolicyId: option.solverPolicyId || null,
      formationObjectives: clone(option.formationObjectives || []),
      tacticalMetrics: clone(option.tacticalMetrics || null),
      relationshipComparison: object(option.relationshipComparison) ? {
        status: option.relationshipComparison.status || null,
        hypotheticalProjection:
          option.relationshipComparison.hypotheticalProjection === true,
        intent: option.relationshipComparison.intent || null,
        relationships: clone((
          option.relationshipComparison.relationships || []
        ).slice(0, 24)),
        clearances: clone(option.relationshipComparison.clearances || []),
        incomingStationaryFireEstimate: projectStarcraftTmgIncomingFireEstimateForPromptV1(
          option.relationshipComparison.incomingStationaryFireEstimate || null),
        incomingMoveThenFireEstimate: projectStarcraftTmgIncomingFireEstimateForPromptV1(
          option.relationshipComparison.incomingMoveThenFireEstimate || null),
        precisionPolicy:
          clone(option.relationshipComparison.precisionPolicy || null),
        rulesInstantiationStillFinalAuthority:
          option.relationshipComparison.rulesInstantiationStillFinalAuthority
            === true,
      } : null,
      anchor: clone(option.anchor || null),
      abilityName: option.abilityName || null,
      effectKind: option.effectKind || null,
      paymentCardInstanceIds: clone(option.paymentCardInstanceIds || []),
      parentContactModelId: option.parentContactModelId || null,
      slots,
      compatibilityGroups,
      completeFormationPlacementChecked:
        option.completeFormationPlacementChecked === true,
      canonicalSpatialParametersHeldByHost: true,
      representativePaymentMayBeOverriddenByAgent:
        (receipt.result.legalPaymentChoices || []).length > 0,
      actionHashHeldByHost: Boolean(option.actionHash)
        && !(receipt.result.legalPaymentChoices || []).length,
    };
  });
  const sharedFire = shareStarcraftTmgFormationFireFactsForPromptV1(formationOptions);
  return {
    schemaVersion: receipt.schemaVersion,
    requestId: receipt.requestId || null,
    queryKind: receipt.queryKind,
    status: receipt.status,
    reason: receipt.reason || null,
    result: {
      schemaVersion: receipt.result.schemaVersion,
      domainId: receipt.result.domainId,
      actionType: receipt.result.actionType,
      pieceId: receipt.result.pieceId,
      toolName: receipt.result.toolName || STARCRAFT_TMG_FORMATION_SOLVER_TOOL_NAME,
      preferredAnchor: clone(receipt.result.preferredAnchor || null),
      paymentChoicesForDecision: clone(
        receipt.result.paymentChoicesForDecision || []),
      legalPaymentChoiceCount:
        (receipt.result.legalPaymentChoices || []).length,
      formationOptions: sharedFire.formationOptions,
      incomingFireEvidenceEncoding: EXACT_EVIDENCE_RECORD_ROWS_MEANING,
      ...(sharedFire.sharedIncomingFireFacts
        ? { sharedIncomingFireFacts: sharedFire.sharedIncomingFireFacts } : {}),
      optionCount: receipt.result.optionCount,
      attemptedCandidateCount: receipt.result.attemptedCandidateCount,
      duplicateIntentCandidateCount:
        receipt.result.duplicateIntentCandidateCount || 0,
      searchCoverage: clone(receipt.result.searchCoverage || null),
      paretoDiversity: clone(receipt.result.paretoDiversity || null),
      failureCounts: clone(receipt.result.failureCounts || {}),
      assignmentContract: clone(receipt.result.assignmentContract || null),
      formationIntent: clone(receipt.result.formationIntent || null),
      exactCanonicalParametersRemainBoundToFormationOptionId:
        !(receipt.result.legalPaymentChoices || []).length,
      rulesAuthority: true,
      mutationAuthority: false,
      trainingTruth: false,
    },
    queryReceiptHash: receipt.queryReceiptHash,
    rulesAuthority: receipt.rulesAuthority ?? true,
    mutationAuthority: false,
    trainingTruth: false,
  };
}

function continuationReceiptHashes(choice) {
  const hashes = new Set();
  for (const message of choice?.providerContinuationMessages || []) {
    if (message?.role !== "tool" || typeof message.content !== "string") {
      continue;
    }
    try {
      const receipt = JSON.parse(message.content);
      if (HASH.test(String(receipt?.queryReceiptHash || ""))) {
        hashes.add(receipt.queryReceiptHash);
      }
    } catch {}
  }
  return hashes;
}

function postPlacementPredictionFacts(input, choice, queryReceipts) {
  const candidateId = choice.plannerResult?.recommendedCandidateId || null;
  const receipt = exactFormationReceipt(queryReceipts, candidateId);
  if (!receipt) return null;
  const authority = {
    roomId: input.roomProjection?.room?.roomId,
    matchBindingHash: input.roomProjection?.matchBinding?.bindingHash,
    stateRevision: input.roomProjection?.room?.stateRevision,
    stateHash: input.roomProjection?.room?.stateHash,
    legalSpaceHash: input.legalSpace?.legalSpaceHash,
  };
  const current = Object.entries(authority).every(([key, value]) =>
    value !== undefined && receipt.authority?.[key] === value);
  return {
    schemaVersion: "starcraft_tmg_post_placement_prediction_facts_v1",
    status: current ? "available" : "unknown",
    ...(current ? {} : { reason: "formation_receipt_not_current_authority" }),
    authority,
    candidateId,
    formationReceiptHash: receipt.queryReceiptHash,
    evidenceScope: "hypothetical_after_selected_own_formation",
    prePlacementFactsMayProvePostPlacementThreat: false,
    selectionStillOwnedByModel: true,
    strategyPreferenceApplied: false,
    formationOptions: current ? receipt.result.formationOptions.map(option => ({
      formationOptionId: option.formationOptionId,
      ownUnitId: option.pieceId,
      comparisonStatus: option.relationshipComparison?.status || "unknown",
      opponentTargets: (option.relationshipComparison?.relationships || [])
        .filter(row => row.relation === "opposed"
          && row.fromUnitId === option.pieceId)
        .map(row => ({
          actorUnitId: row.targetId,
          targetUnitId: row.fromUnitId,
          minimumBaseEdgeDistanceMilliInches:
            row.minimumBaseEdgeDistanceMilliInches ?? null,
          visibleModelPairCount: row.visibleModelPairCount ?? null,
          unknownLineOfSightPairCount: row.unknownLineOfSightPairCount ?? null,
          currentRoundStationaryProfileKeys:
            clone(row.enemyCurrentRoundStationaryThreatProfileKeys ?? null),
          currentRoundMoveThenAttackProfileKeys:
            clone(row.enemyCurrentRoundMoveThenAttackProfileKeys ?? null),
          currentRoundStationaryUnknownProfileKeys:
            clone(row.enemyCurrentRoundStationaryThreatUnknownProfileKeys ?? null),
          futureRoundMoveThenAttackProfileKeys:
            clone(row.enemyFutureRoundMoveThenAttackProfileKeys ?? null),
        })),
    })) : [],
    missingOrNullFieldMeansUnknown: true,
    fullReceiptsStillRetained: true,
    rulesAuthority: false,
    trainingTruth: false,
  };
}

function currentIncomingFireFacts(input, queryReceipts) {
  const authority = {
    roomId: input.roomProjection?.room?.roomId,
    matchBindingHash: input.roomProjection?.matchBinding?.bindingHash,
    stateRevision: input.roomProjection?.room?.stateRevision,
    stateHash: input.roomProjection?.room?.stateHash,
    legalSpaceHash: input.legalSpace?.legalSpaceHash,
  };
  const friendlyIds = new Set((input.spatialObservation?.units || [])
    .filter(unit => ["own", "allied"].includes(unit.sideRelation))
    .map(unit => unit.unitId));
  const receipts = (queryReceipts || []).filter(receipt =>
    receipt.queryKind === "space.inspect_relationships"
    && ["exact", "advisory_estimate"].includes(receipt.status)
    && Object.entries(authority).every(([key, value]) =>
      value !== undefined && receipt.authority?.[key] === value));
  if (!receipts.length) return null;
  return {
    schemaVersion: "starcraft_tmg_current_incoming_fire_facts_v1",
    authority,
    evidenceScope: "queried_current_positions_before_selected_action",
    relationships: receipts.flatMap(receipt =>
      (receipt.result?.relationships || [])
        .filter(row => ["unit_spatial_relationship", "unit_relationship"]
          .includes(row.edgeKind) && row.relation === "opposed"
          && friendlyIds.has(row.fromUnitId)
          && !friendlyIds.has(row.toUnitId))
        .map(row => {
          const incoming = row.threats?.toFrom;
          return {
            actorUnitId: row.toUnitId,
            targetUnitId: row.fromUnitId,
            queryReceiptHash: receipt.queryReceiptHash,
            relationshipGraphHash: receipt.result?.relationshipGraphHash,
            minimumBaseEdgeDistanceMilliInches:
              row.nearestPhysicalEdges?.distanceMilliInches ?? null,
            currentRoundStationaryProfileKeys:
              clone(incoming?.currentRoundStationaryProfileKeys ?? null),
            currentRoundMoveThenAttackProfileKeys:
              clone(incoming?.currentRoundMoveThenAttackProfileKeys ?? null),
            currentRoundStationaryUnknownProfileKeys:
              clone(incoming?.currentRoundStationaryUnknownProfileKeys ?? null),
            futureRoundMoveThenAttackProfileKeys:
              clone(incoming?.futureRoundMoveThenAttackProfileKeys ?? null),
            earliestStationaryAttackHorizon:
              incoming?.actionWindow?.earliestStationaryAttackHorizon ?? null,
          };
        })),
    eachRowIsOnePairNotWholeSideSafety: true,
    outgoingFireIsNotIncomingFire: true,
    missingOrNullFieldMeansUnknown: true,
    fullReceiptsStillRetained: true,
    strategyPreferenceApplied: false,
    rulesAuthority: false, trainingTruth: false,
  };
}

function makeNode(nodeId, nodeType, authority, content) {
  const body = { nodeId, nodeType, authority, content: clone(content) };
  return freeze({ ...body, nodeHash: hashStarcraftTmgContract(body) });
}

function makePromptArtifact(match, input, choice, round, queryReceipts, stage,
  memoryQueryAvailable = false, forceTerminal = false,
  terminalForceReason = null) {
  const planning = stage === "planning";
  const providerInteractionMode = interactionMode(match.providerInteractionMode);
  const nativeTools = providerInteractionMode === "native_tools";
  const policyVersion = promptPolicyVersion(providerInteractionMode);
  const nativeLoop = nativeAgentLoop(choice, input, queryReceipts, stage,
    memoryQueryAvailable && planning, forceTerminal);
  const selectedId = choice.plannerResult?.recommendedCandidateId || null;
  // Only native Tools deliver receipt-bearing tool messages separately. JSON
  // channels must retain their receipts in the artifact; agentLoop is null.
  const continuedReceiptHashes = nativeTools
    ? continuationReceiptHashes(choice) : new Set();
  const promptQueryReceipts = queryReceipts.filter((entry) =>
    !continuedReceiptHashes.has(entry.queryReceiptHash));
  const projectedQueryReceipts =
    deduplicateStarcraftTmgSpatialPromptReceiptsV1(
      promptQueryReceipts.map(compactQueryReceiptForPrompt));
  const postPlacementFacts = planning ? null
    : postPlacementPredictionFacts(input, choice, queryReceipts);
  const incomingFireFacts = currentIncomingFireFacts(input, queryReceipts);
  const exactChargeReachability = planning
    ? actionIndex(input.spatialActionSpace).filter((entry) =>
      sourceActionDomain(entry.action)?.actionType === "charge")
      .map((entry) =>
      inspectStarcraftTmgChargeReachabilityV1({
        spatialActionSpace: input.spatialActionSpace,
        candidateId: entry.id, queryReceipts,
        spatialObservation: input.spatialObservation,
      })).filter((entry) => entry.status === "exact") : [];
  const contract = seal({
    schemaVersion:
      `${STARCRAFT_TMG_LIVE_FLASH_DECISION_PORT_VERSION}.response-contract`,
    stage,
    allowedChannels: planning
      ? ["planning", "query_requests"] : ["decision", "query_requests"],
    decisionCandidateSource: "current_spatial_action_space_only",
    plannerOwnsCandidateSelection: true,
    ...(planning ? {
      currentGoalSource: "plan.currentGoal",
      currentGoalProtocolVersion: "single_current_goal_v1",
      assessmentGoalOwnedByHostProjection: true,
    } : {}),
    actionMustConsumePlannerCandidate: !planning,
    stageOutputRequiredAfterQueries: true,
    terminalSubmissionTool: nativeTools ? planning
      ? NATIVE_PLANNING_SUBMIT_TOOL_NAME : NATIVE_DECISION_SUBMIT_TOOL_NAME
      : null,
    terminalSubmissionChannel: nativeTools ? null : stage,
    providerInteractionMode,
    queryMode: forceTerminal
      ? terminalForceReason === "terminal_tool_argument_format_repair"
        ? "format_repair_terminal_submission_only"
        : terminalForceReason === "repeated_query_no_new_evidence"
          ? "known_evidence_terminal_submission_only"
        : "safety_ceiling_terminal_submission_only"
      : nativeTools ? "evidence_queries_or_terminal_submission"
        : "json_query_or_terminal_channel",
    promptPolicyVersion: policyVersion,
    hiddenChainOfThoughtForbidden: true,
    extraProviderFieldsIgnored: true,
    rulesAuthority: "external_rules_service",
    trainingTruth: false,
  }, "contractHash");
  const instructions = {
    task: planning
      ? "Assess or establish the match plan, identify information needs, compare current candidates, and recommend exactly one current candidate. Do not instantiate or execute it yet."
      : "Consume the planner's selected current candidate, instantiate it when parameterized, and produce one auditable ActionIntent.",
    output: {
      protocol: !nativeTools
        ? forceTerminal
          ? `Return exactly one JSON object with only the ${stage} object. Repair syntax if needed, retain uncertainty, and do not request further evidence.`
          : `Return exactly one JSON object with either query_requests.requests (read-only evidence queries) or a ${stage} object (terminal submission), never both. No markdown or hidden reasoning.`
        : forceTerminal
        ? terminalForceReason === "terminal_tool_argument_format_repair"
          ? "The previous terminal tool arguments were malformed JSON. Preserve the selected plan and supported facts, regenerate only one concise valid argument object, JSON-escape quotes, backslashes and newlines, and call only the declared stage-specific strict submit tool."
          : "The query safety ceiling is reached. Call only the declared stage-specific strict submit tool, preserve uncertainty explicitly, and do not invent missing evidence."
        : "Every turn must call exactly one declared tool. Use query tools while material evidence is missing; finish by calling only the stage-specific strict submit tool.",
      queryRound: !nativeTools
        ? forceTerminal
          ? terminalForceReason === "repeated_query_no_new_evidence"
            ? "The previous query returned no new evidence. Submit the stage object using the existing receipts and state any remaining uncertainty."
            : "The query safety ceiling is reached; submit the stage object with unresolved uncertainty."
          : `Use query_requests.requests with each query's declared scope and precision: geometry/native qualification are exact, probability/fire exchange are advisory, Skill is advice and memory is recorded history. Unknown is not zero. Each request needs requestId, queryKind and an arguments object. Retrieve Strategy Skill only if frozen excerpts are insufficient${memoryQueryAvailable && planning ? "; retrieve same-match memory only if the working summary is insufficient" : ""}. The Host returns typed receipts in the next prompt.`
        : forceTerminal
        ? terminalForceReason === "terminal_tool_argument_format_repair"
          ? "No query tool is exposed during format repair. Reuse the existing plan and receipts; change only JSON syntax and concision."
          : "No query tool is available after the safety ceiling; preserve every unresolved item as uncertainty in the terminal submission."
        : `Use ${NATIVE_QUERY_TOOL_NAME} according to each kind's scope: geometry and native qualification are exact; probability/fire exchange are advisory; unknown is not zero. None awards VP or guarantees a future outcome. Use ${NATIVE_SKILL_TOOL_NAME} only when the default frozen Skill excerpts do not answer the strategy question.${memoryQueryAvailable && planning ? ` Use ${NATIVE_MEMORY_TOOL_NAME} only when the fixed same-match working summary does not answer a history question.` : ""}`,
      terminalTool: nativeTools ? planning
        ? NATIVE_PLANNING_SUBMIT_TOOL_NAME : NATIVE_DECISION_SUBMIT_TOOL_NAME
        : null,
      terminalChannel: nativeTools ? null : stage,
      canonicalActionOwnedByHost: true,
      toolSchemaIsTheOutputShape: nativeTools,
    },
    requirements: [
      ...(planning ? ["Declare currentGoalSource as plan.currentGoal and write the current intention only in plan.currentGoal, not assessment. With verdict continue, this intention advances while the established strategic plan remains unchanged; use revise for a strategic change. Reconcile the current intention with the selected candidate and the current authority. plan-progress-facts separates the original arrival forecast from accepted actions and current Supply; it is factual evidence, never an enforced schedule or a strategy preference."] : []),
      ...(planning && object(input.planState?.plan) ? ["Use planUpdateMode field_delta_v1. The Host retains the complete existing strategic plan; do not reproduce it or its audit hashes. Submit this decision's currentGoal and current reflection/comparisons. Null or omitted plan fields retain their exact prior values; [] explicitly clears an array on revise. Supply changed strategic fields with verdict revise. Supply opponentModel only when publishing a fresh complete belief snapshot; null keeps old beliefs dated. No strategic branch is forbidden or preferred by this transport protocol."] : []),
      planning
        ? "The Planner, not the Action stage, selects one candidateId from the current compact action index."
        : "Use exactly the Planner's recommended candidate. Submit only model-owned choices; the Host constructs the finite or parameterized proposal.",
      "For a Unit reposition, give a physical path only for the nominated Leading Model; the remaining models do not travel paths under the rules and must each receive an explicit final placement through the domain's placements field.",
      planning
        ? `Do not request ${STARCRAFT_TMG_FORMATION_SOLVER_TOOL_NAME}, legal asset-placement options, final parameter instantiation, legal_full_path_movement or coherency_after_candidate_placement during Planning. Those require a selected candidate and complete Host-owned parameters. mission_marker_control with no candidate checks current native qualification/control, not future VP. Select the best current candidate from current relationships first. For a formation action, set formationSearchRequested and provide a tacticalPurpose plus weighted formationObjectives with visible targetIds; the Host runs the spatial solver once.`
        : "Use the exact Host-supplied formation or asset-placement options for the selected candidate; do not restart a broad placement search in the Action stage.",
      `When an exact ${STARCRAFT_TMG_FORMATION_SOLVER_TOOL_NAME} receipt is present, compare its weighted objectives, tacticalMetrics and relationshipComparison, then choose exactly one formationOptionId. relationshipComparison is the Host's hypothetical post-placement view and includes every visible enemy Unit as well as requested objectives. Any enemyStationaryThreatProfileCount above zero means that enemy has at least one spatially covering stationary weapon profile; use its current-round lifecycle fields before describing immediate exposure. Any enemyStationaryThreatUnknownProfileKeys or enemyCurrentRoundStationaryThreatUnknownProfileKeys means range/target eligibility is present but line of sight is unresolved; never describe that option as outside the fire band, no current threat, zero exposure or safe. Read incomingStationaryFireEstimate when present: compare expected casualties, every exact legal removed-model list, lost occupied positions/formation reach, lost ranged contributors, exact current Fighting/Supporting losses, marker-by-marker control changes, probability of Supply reduction/zero, Supply freed for later deployment, VP awarded, and every exact reaction choice/cost against objective or scoring gain. Read incomingMoveThenFireEstimate too: a reachable current-round row is a live threat even while legal path and post-move line of sight remain conditional; a reachable next-round row is future planning pressure, not an immediate legal action. Unknown path or line of sight is never safety or zero risk. A Ranged Attack itself never includes movement. Current Supply—not raw model count—controls marker strength. Do not default to the safest position: choose the highest expected net mission value after risk, and state why the accepted exposure is worth it. Preserve unknown probability as uncertainty and give one concise publicReason. Leave slotAssignments empty to accept the Host's complete canonical identity assignment and per-slot public reasons; only submit assignments when a specific model identity must occupy a specific compatible slot, in which case cover every slot and model exactly once. Do not mix slots across options or hand-write replacement coordinates; the Host binds and revalidates the chosen formation.`,
      "For any formation action, paymentChoicesForDecision lists exact minimal-card legal payments separately from spatial options when payment applies. Choose one paymentCardInstanceIds set from that list in the Action selection; choose [] only when no payment is required. The Host validates the chosen set against the full Rules domain and reinstantiates the final position-plus-payment action.",
      "When an exact legal_asset_placement_options receipt is present, compare every returned option's tacticalMetrics and relationshipComparison before choosing exactly one placementOptionId. incomingCurrentRoundStationaryProfileCount and incomingCurrentRoundMoveThenFireProfileCount are current-round exposure after phase/activation/pass gates. incomingStationaryProfileCount and incomingMoveThenFireProfileCount are broader geometric planning bands and may be next-round pressure. Unknown hypothetical line of sight remains uncertainty, never safety. Compare the low-fire, objective, route and preferred-anchor facets instead of assuming the preferred anchor is best. Return assetPlacementSelection with that ID and one concise publicReason naming accepted current and future exposure, objective/route effect and plan continuity. Never call an option permanently safe or unthreatened when its selected relationshipComparison reports future profiles. Do not hand-write a replacement coordinate; the Host binds and revalidates the selected option.",
      "Treat selectedActionIdentity as Rules-owned. The central currentGoal, selectedReason, plan and purpose must name its abilityName when one exists and preserve every applicable effectContract fact, including sourceText, targetKind, resultKind/resultAssetKind, immediateEffect, ongoingEffect and delayedEffect. forbiddenSubstitution states what this action is not. You may compare or reject another ability, but never describe that other ability or another effect family as the action being selected, activated, used or placed.",
      "When selectedActionIdentity.effectContract.futurePlanRequirement.required is true, submit a futureActionPlans item bound to the selected candidate. Continue keeps the existing strategy and persists only these bound items; revise replaces the plan. Name the intended consumer Unit, earliest timing, action, route/target, purpose, benefit and risk evidence, prerequisites, cancellation conditions and fallback. A vague reservePolicy sentence is not an executable future plan. This is a structure requirement, not a Host preference for using the capability.",
      "Treat selectedActionResourceContract and resourceCostsByChoice as Rules-owned. State every nonzero effective resource cost accurately. Never call a positive BM, CP or PE cost zero, free, or unspent; Supply is a separate contract.",
      "Treat strategicImmediateValue as Rules-derived current value. A zero-benefit heal is not productive merely because its printed resource cost is zero: source-card exhaustion and forfeited alternatives remain real costs.",
      "Position publicReason fields are auditable summaries, not hidden chain-of-thought. State the useful board fact and tactical purpose without private scratch work.",
      "For Deploy, the Host prepends the Leading Model base-centre start just outside the selected battlefield edge. The complete Speed allowance includes that ingress distance. Do not add an artificial path point on the edge and do not measure only from the edge; choose an endpoint whose complete Host path remains within maxDistanceMilliInches.",
      "Never treat the remaining models as a unit centre: compare and choose a complete Host-solved final formation using every model's physical base, coherency, board edge, terrain, objective, line-of-sight, blocking, threat and fire-zone consequences.",
      "When candidate value depends materially on position, use space.inspect_relationships with a tactical intent and scoped subjectUnitIds/targetIds before choosing. Read field-level exact/advisory/unknown precision; use the returned one-to-many, many-to-one, fire-zone, objective and clearance relationships to justify the chosen intent. Do not infer geometry from the rendered pixels.",
      "Candidate comparisons and rejected-alternative reasons influence selection and must obey the same relationship facts as the selected reason. In a unit_spatial_relationship from an own Unit to an enemy Unit, threats.toFrom describes incoming enemy weapons. stationaryProfileKeys and moveThenAttackProfileKeys are geometric bands across planning horizons; currentRoundStationaryProfileKeys and currentRoundMoveThenAttackProfileKeys are the only immediate current-round subsets. If Movement is already activated, passed, or closed, a geometric move-then-attack band is next-round pressure rather than a current action. A Ranged Attack never moves the attacker. Unresolved path or post-move line of sight remains uncertainty for the applicable horizon and must not be converted into safety or zero future risk.",
      "Resolve threat availability through three independent gates: can Move; can Attack, split into Ranged Attack and melee Fight with their own phases and ranges; and can use a typed damage ability. Movement plus Ranged Attack is a two-phase plan, never one action. If Movement is unavailable, evaluate attacks only from the current bases. A damage ability that places a Token now and resolves damage later is neither a weapon attack nor zero threat: preserve its typed immediate placement, delayed timing, target area and removal/counterplay contract. If no typed damage-ability projection exists, keep that channel unknown rather than inferring safety.",
      "For a ranged candidate, read current-action-index.rangedContributionOverview before comparing firepower. contributingModelCount and totalCurrentHitDice are the exact current Rules-domain contribution; currentLiveModelCount, visible target count, Unit size, or weapon-profile count are never substitutes for the attack pool. Never call an attack high-volume when most live models are nonContributing unless another exact batch proves that volume.",
      "Before recommending Charge, name one eligible intended target Unit in selectedChargeTargetUnitId (use an empty string for non-Charge). The Host checks that exact Unit-to-target physical base-edge distance before accepting the plan; never claim a target is reachable when its minimum move to 1-inch engagement exceeds Speed plus the maximum current Charge roll and modifiers. If the intended target is too far, revise to a genuinely reachable target or another current action. A roll-advantage ability such as Metabolic Boost changes probability but does not raise a D6's maximum face.",
      "When comparing a current ranged attack with Run or another reposition, state the immediate attack dice forfeited and the possible future weapon profiles gained. Future movement, path, line of sight and next-round availability remain advisory until queried; do not call reposition 'no positional gain' merely because a smaller current long-range batch exists.",
      "Claim an active ability or status improves the selected attack only when an exact action_specific_threat or instantiated-action receipt shows the modifier on that weapon batch. A status that applies to another weapon, or a Speed bonus used after movement is complete, is not realized attack value for the current batch.",
      "A typed query for a parameterized candidate must put domainId and the complete parameters object in the query tool arguments; the Host automatically Rules-checks every final parameterized proposal.",
      "Read the selected domain's parameterContract. If selection.kind is parameter_option, choose its current finiteOptions parameterOptionId in optionId and leave parametersJson as {}: the Host materializes exactly that option and Rules-checks it. An empty payment-combinations list [] means unavailable; only an explicit empty combination [[]] permits no payment. Unavailable choices are not executable. Field-feedback may require the Planner to re-evaluate an impossible intent; the Host never silently changes its target or effect.",
      "For selection.kind parameters, put the chosen payment cards in selection.paymentCardInstanceIds; the Host transports that exact selection into the Rules parameters. Legacy payment inside parametersJson is accepted too, but two explicit payment sets must agree. The available cards come from the current domain; the final exact Rules check still decides legality.",
      "A resolve_ranged_casualties candidate with parameterKind official_selected_roster_ranged_casualty_selection_v1 is a defender-owned choice of casualties from the controlled side, not a new attack. Follow its current parameterSchema: submit one casualtySelectionHash for an enumerated_hashes domain, or exactly casualtyCount ordered casualtyModelIds from the compact explicit_model_ids contract. Compare model position, role, coherency, threat and objective value. Public reasons must say which own models are removed and preserved and why; never claim an attack target or weapon for this resolution stage. authorityActionType is only the frozen Rules transport identity and does not change this meaning.",
      "For resolve_ranged_casualties, read current-ranged-casualty-resolution as exact Rules evidence for the completed enemy weapon batch. surge.targetTypeMatched and surge.matchedCapacity describe eligibility/capacity; only surge.appliedBypassedArmourHits affected actual hits. Resolving casualties does not activate, close, move or spend the defending Unit and does not end the attacker's pending ranged sequence. Never describe it as closing the defender's activation or as the defender making an attack.",
      "A resolve_melee_casualties candidate is the defender-owned removal choice after a fight or impact has already rolled, not a new fight, Close Ranks, movement or defending activation. Submit only its current casualtySelectionHash or ordered casualtyModelIds contract. The current-melee-casualty-resolution evidence retains the actual hit, Surge, armour, evade and damage results; removals never re-roll them. The current loss options use the same casualty and strategic-loss Rules as ranged removals.",
      "For casualty choice, compare the exact removed-model list, loss of occupied positions and formation reach, lost specialist/upgrades, remaining ranged contributors, exact current Fighting/Supporting contributors, future melee potential, marker-by-marker controller/contact changes, Tactical Mass before/after, Current Supply/control strength, Supply freed for later deployment, VP awarded to the attacker by Supply loss, objective interaction, and follow-up activation value. Speed does not automatically decrease merely because models died, but crossing to one surviving model may select the card's single-model Speed. Current marker and engagement geometry in missionMarkerControlConsequences/tacticalMassConsequences is exact; future movement modifiers, future attack dice and future control geometry still require a fresh LegalSpace over the chosen survivors.",
      "Before every strategic recommendation, check the current mission and score clock, phase and initiative/pass opportunity cost, Current and Available Supply plus reserves, terrain/LOS/elevation/base geometry, outgoing and incoming exchanges including reactions and attack-batch order, card/resource timing, and the most consequential opponent response. Read each Unit's exact supplyControl: currentSupply is its marker-control value now, nextSupplyReduction gives the casualties required for the next drop, and supplyZeroThreshold gives the casualties and remaining models at Supply 0. The Host already resolved army-composition labels; do not infer Supply from currentModels. Model count may affect footprint, coherency and casualty buffer; keep those effects separate from Supply. Explicitly mark irrelevant or unresolved dimensions instead of inventing them.",
      "Use exact query receipts as facts, advisory estimates as preferences, and unknown as uncertainty.",
      "An unknown query receipt may include Rules-derived repairContext. Use fieldIssues and allowedValues to repair the submitted fields; if requiresReplan is true, re-evaluate the intent through the Planner. Geometry feedback alone applies only to the same candidate. None of this proves proposal legality until a later exact receipt accepts it.",
      "A pre-selection parameter-shape failure is Harness uncertainty, not tactical evidence against a formation candidate and never a reason to prefer Pass. The Planner chooses the candidate and spatial intent; the Host supplies every model's path and placement parameters afterward.",
      "The phase lifecycle node is Rules-owned. Ordinary actions exist only in their listed phase. Never defer Deploy, Move, Charge, Ranged Attack, Run, Hold, or Fight into another phase unless exact successor Rules evidence explicitly exposes it.",
      "Before recommending Pass, enumerate every current non-Pass actionType that will be forfeited and compare that opportunity cost with initiative value.",
      "When an exact successor is attached to Pass or choose_first_actor, cite its successorHash and use its actual next phase and action types. Do not invent a future LegalSpace.",
      planning
        ? "Assess the existing same-match plan before selecting a candidate. A changed or contradicted assumption must produce at_risk/invalid and revise/abandon, never silent continue/sound."
        : "Produce the ActionIntent for the already selected Planner candidate; do not replace the plan or candidate inside the Action stage.",
      "Predict a plausible opponent response as a typed hypothesis: actionClass, likely actor/target when visible, bounded horizon, confidence, evidence and invalidation criteria. State a counter-response and replan trigger.",
      ...(!planning ? ["For a formation selection, post-placement-prediction-facts explicitly names enemy actor, own target and current/future fire bands for EACH option at the SAME current authority. Use the row for the option you actually select when predicting an opponent response after your reposition. A pre-move space.inspect_relationships receipt describes the old target position and cannot establish a post-move fire band. Null/missing remains unknown; an empty known band differs from unknown. Keep the selected option, actor, target, horizon and cited evidence consistent. An invalidation condition already true in the chosen projection is not a live prediction; revise that hypothesis using the available facts, without changing the Planner candidate or inventing future legality."] : []),
      "A prediction horizon names when the predicted action itself can legally occur, not merely when its phase will eventually open. current_phase and current_round require current-lifecycle evidence for that exact actor, target and action. If a named ranged actor/target has zero currentRoundStationaryProfileKeys and zero currentRoundMoveThenAttackProfileKeys, do not predict that ranged attack in current_phase or current_round; use bounded_public_transitions for a conditional future-round attack, or choose a different actor/target with a current-round fire band. Never pair a current-round horizon with basis text that says the action starts next round or is outside the current fire band.",
      "Opponent predictions obey the current lifecycle. Read every visible Unit's activationStatus and offTableUnits. Activation is tracked independently per phase: activatedPhases.movement blocks another Move or Deploy in Movement only; it does not block that Unit from a later Run, Charge, Ranged Attack or Hold in Assault, or Fight in Combat, unless the corresponding phase is also activated. A Unit with activatedPhases[predicted action phase] = true cannot take another ordinary action in that same phase. A Reserve actor must use actionClass deploy; an on-table actor must not use reserve Deploy. Pass, choose_first_actor and phase_control are side-level actions and must leave likelyActorUnitId empty. Keep actionClass, named actor and horizon internally consistent; choose an actor unactivated in the predicted action's phase or an explicitly conditional later-round response instead.",
      "When match memory contains predictionCalibrations, cite their calibrationHash in assessment evidence, update changedAssumptions/opponentModelUpdates, and use assessment.verdict to explicitly retain or revise the plan. A hit does not force continuation and a miss does not force abandonment; calibrate against position and objective value.",
      forceTerminal
        ? "If strategy context remains insufficient, record it as uncertainty and a replan trigger; never invent a missing Skill passage."
        : nativeTools
          ? `If strategy context is insufficient, call ${NATIVE_SKILL_TOOL_NAME}; never invent a missing Skill passage.`
          : `If strategy context is insufficient, request ${NATIVE_SKILL_TOOL_NAME} through query_requests; never invent a missing Skill passage.`,
      "Do not return hidden chain-of-thought; return only concise public reasons and evidence.",
      "The model cannot confirm, apply, mutate, or override Rules-owned truth.",
    ],
  };
  const nodes = [
    makeNode("live-decision-policy", "platform", "host", instructions),
    ...(planning ? [makeNode("strategy-skill-snapshot", "strategy-advisory", "frozen_match", {
      snapshot: compactStrategySkillSnapshot(match.strategySkillSnapshot, input),
      skillsMayOverrideRules: false,
    })] : []),
    makeNode("agent-stage", "platform", "host", {
      stage,
      plannerControlsAction: true,
      terminalSubmissionForced: forceTerminal,
      terminalForceReason: forceTerminal ? terminalForceReason : null,
      currentCorrections: clone((choice.warnings || []).slice(
        Number(choice.activeWarningStartIndex || 0))),
    }),
    ...((choice.parameterRecoveryHistory || []).length ? [makeNode(
      "current-decision-recovery", "typed-current-failure", "host", {
        failures: clone(choice.parameterRecoveryHistory.slice(-3)),
        priorPlannerGoals: (choice.failedPlannerResults || []).slice(-3).map(entry => ({
          reason: entry.reason,
          plan: clone(entry.plannerResult.plan),
          publicPlanSummary: clone(entry.plannerResult.publicPlanSummary),
        })),
        failureCountersPersistAcrossReplanning: true,
        ruleTruthUnchanged: true,
        noFallbackActionSelectedByHost: true,
      })] : []),
    ...(!nativeTools ? [makeNode("json-agent-query-interface", "platform",
      "host", jsonAgentQueryInterface(nativeLoop, stage))] : []),
    ...(!nativeTools && nativeLoop.continuationMessages.some(message =>
      ["assistant", "user"].includes(message.role)
        && typeof message.content === "string") ? [makeNode(
      "json-agent-continuation", "typed-current-failure", "host", {
        messages: nativeLoop.continuationMessages.filter(message =>
          ["assistant", "user"].includes(message.role)
            && typeof message.content === "string"),
        priorRejectedOutputsAreNotFacts: true,
        historicalMessagesAreNotRulesAuthority: true,
        mayOverrideRules: false,
      })] : []),
    makeNode("player-room-projection", "player-view", "room_service",
      projectStarcraftTmgLiveDecisionRoomProjectionV1(input.roomProjection)),
    makeNode("current-legal-space", "rules", "rules_service",
      compactLegalSpace(input.legalSpace)),
    ...(currentRangedCasualtyResolutionEvidence(input)
      ? [makeNode(currentRangedCasualtyResolutionEvidence(input).attackKind === "melee"
        ? "current-melee-casualty-resolution" : "current-ranged-casualty-resolution", "rules-observation",
        "rules_service", currentRangedCasualtyResolutionEvidence(input))]
      : []),
    makeNode("round-phase-lifecycle", "rules", "rules_service",
      phaseLifecycleContract(input)),
    makeNode("opponent-prediction-timing", "derived-lifecycle-facts", "host",
      projectStarcraftTmgOpponentPredictionTimingFactsV1({
        spatialObservation: input.spatialObservation,
        currentPhase: input.roomProjection?.state?.phase,
      })),
    makeNode("current-spatial-observation", "rules-observation", "rules_service",
      compactSpatialObservation(input.spatialObservation)),
    makeNode("required-evidence-by-candidate", "host-evidence-policy", "host", {
      candidates: candidateEvidenceRequirements(input).filter((entry) =>
        planning || entry.candidateId === selectedId),
      exactBeforeApplyIsHostEnforced: true,
      advisoryUnknownMustRemainUncertainty: true,
      noQueryReceiptMayBeInvented: true,
      mutationAuthority: false,
    }),
    makeNode(planning ? "current-action-index" : "planner-selected-action",
      "rules", "rules_service", planning
        ? projectStarcraftTmgPlanningActionSpaceForPromptV1(
          input.spatialActionSpace, input.spatialObservation)
        : selectedActionSpace(input.spatialActionSpace, selectedId)),
    ...(planning ? [
      makeNode("same-match-memory", "same-match-advisory", "match_journal",
        input.matchMemory || null),
      makeNode("turn-plan-state", "same-match-advisory", "turn_plan_runtime",
        input.planState || null),
      makeNode("plan-progress-facts", "derived-same-view-facts", "host",
        projectStarcraftTmgPlanProgressFactsV1(input)),
      makeNode("asynchronous-preexecution", "hypothetical-advisory",
        "preexecution_runtime", input.preexecutionSearch || null),
    ] : []),
    ...(!planning ? [makeNode("planner-output", "plan-authority", "planner",
      choice.plannerResult)] : []),
    makeNode("current-query-receipts", "typed-query-results", "rules_or_math",
      projectedQueryReceipts),
    ...(incomingFireFacts ? [makeNode("current-incoming-fire-facts",
      "derived-current-position-facts", "host", incomingFireFacts)] : []),
    ...(postPlacementFacts ? [makeNode("post-placement-prediction-facts",
      "hypothetical-post-placement-facts", "host", postPlacementFacts)] : []),
    ...(exactChargeReachability.length ? [makeNode(
      "current-charge-distance-facts", "derived-current-facts", "host",
      { entries: exactChargeReachability,
        derivedFrom: "exact_base_edges_and_current_charge_domains",
        precisionScope: "distance_only_not_path_or_charge_success",
        distanceDoesNotProvePath: true,
        notReportedMeansUnknown: true,
        legalSpaceUnchanged: true,
        fullQueryReceiptsRetainedByHost: true })] : []),
    ...(input.hostCandidateExclusions?.length ? [makeNode(
      "host-certain-failure-exclusions", "derived-current-facts", "host",
      { entries: clone(input.hostCandidateExclusions),
        physicalLowerBoundOnly: true,
        rulesLegalSpaceUnchanged: true,
        excludedFromAgentSelectionOnly: true })] : []),
    makeNode("user-message", "user-message", "host", {
      text: `Decision ${choice.choiceKey}, ${stage} stage. `
        + (!nativeTools
          ? forceTerminal
            ? `Submit only a concise ${stage} JSON object now; preserve uncertainty and existing evidence.`
            : `Return query_requests.requests for missing read-only evidence or submit the final ${stage} JSON object. Never combine the two channels.`
          : forceTerminal
          ? terminalForceReason === "terminal_tool_argument_format_repair"
            ? `Repair only the previous malformed JSON arguments. Preserve the selected plan and evidence, use concise JSON-escaped strings, and call only the strict ${planning
              ? NATIVE_PLANNING_SUBMIT_TOOL_NAME
              : NATIVE_DECISION_SUBMIT_TOOL_NAME} tool now.`
            : `The query safety ceiling is reached; preserve unresolved uncertainty and call only the strict ${planning
              ? NATIVE_PLANNING_SUBMIT_TOOL_NAME
              : NATIVE_DECISION_SUBMIT_TOOL_NAME} tool now.`
          : `Use ${NATIVE_QUERY_TOOL_NAME} for exact game evidence and ${NATIVE_SKILL_TOOL_NAME} for additional frozen strategy excerpts. After all material evidence is available, call only the strict ${planning
            ? NATIVE_PLANNING_SUBMIT_TOOL_NAME
            : NATIVE_DECISION_SUBMIT_TOOL_NAME} tool.`),
    }),
  ];
  const receipt = seal({
    schemaVersion:
      `${STARCRAFT_TMG_LIVE_FLASH_DECISION_PORT_VERSION}.prompt-receipt`,
    choiceKey: choice.choiceKey,
    round,
    stage,
    stateHash: choice.authority.stateHash,
    legalSpaceHash: choice.authority.legalSpaceHash,
    actionSpaceHash: choice.authority.spatialActionSpaceHash,
    strategySkillSetHash: match.strategySkillSnapshot.skillSetHash,
    promptPolicyVersion: policyVersion,
    queryReceiptHashes: queryReceipts.map((entry) => entry.queryReceiptHash),
    nodeHashes: nodes.map((entry) => entry.nodeHash),
    trainingTruth: false,
  }, "receiptHash");
  const body = {
    schemaVersion:
      `${STARCRAFT_TMG_LIVE_FLASH_DECISION_PORT_VERSION}.prompt-artifact`,
    sessionId: match.providerSession.sessionId,
    sessionBindingHash: match.providerSession.sessionBindingHash,
    promptPack: input.promptPack || match.promptPack,
    nodes,
    agentLoop: nativeTools ? nativeLoop : null,
    responseContract: contract,
    receipt,
    retentionPolicy: "release_after_durable_decision_attempt",
    eligibleForTraining: false,
    trainingTruth: false,
  };
  const artifact = seal(body, "promptArtifactHash");
  return { artifact, contract, responseRef: {
    id: "starcraft-tmg.live-flash-decision.v1",
    version: nativeTools ? "1.0.0" : "1.1.0",
    hash: contract.contractHash,
  } };
}

function usage(value = {}) {
  return {
    inputUnits: integer(value.inputUnits || 0, "usage.inputUnits"),
    outputUnits: integer(value.outputUnits || 0, "usage.outputUnits"),
    totalUnits: integer(value.totalUnits || 0, "usage.totalUnits"),
  };
}

// Read-only construction seam for captured protocol regressions. This is the
// same builder used by production, not a second prompt implementation.
export { makePromptArtifact as buildStarcraftTmgLivePromptArtifactV1 };

function estimateCnyMicros(inputUnits, outputUnits, at, model) {
  const pricingInput = {
    providerId: "deepseek-openai-compatible-direct",
    requestedModel: model,
    reportedModel: model,
    startedAt: at,
    usage: {
      inputUnits,
      outputUnits,
      totalUnits: inputUnits + outputUnits,
      inputCacheHitUnits: 0,
      inputCacheMissUnits: inputUnits,
      reasoningOutputUnits: 0,
    },
  };
  const priced = model === "deepseek-v4-flash"
    ? priceStarcraftTmgDeepSeekV4FlashUsageV1(pricingInput)
    : priceStarcraftTmgDeepSeekCurrentUsageV2(pricingInput);
  return Math.ceil(priced.calculatedCostNanoUsd * 8 / 1_000);
}

function publicProjection(record) {
  if (!record) return null;
  return freeze({
    schemaVersion:
      `${STARCRAFT_TMG_LIVE_FLASH_DECISION_PORT_VERSION}.projection`,
    revision: record.revision,
    scope: clone(record.scope),
    lifecycle: record.lifecycle,
    selectedProfile: clone(record.selectedProfile),
    providerInteractionMode: interactionMode(record.providerInteractionMode),
    strategySkillSetHash: record.strategySkillSnapshot.skillSetHash,
    promptPack: record.promptPack,
    budget: clone(record.budget),
    usage: clone(record.usage),
    decisionCount: Object.values(record.decisions)
      .filter((entry) => entry.status === "completed").length,
    unresolvedCommitUnknownCount: Object.values(record.decisions)
      .filter((entry) => entry.status === "provider_call_may_have_started").length,
    issues: clone(record.issues),
    hiddenChainOfThoughtStored: false,
    productionStoreRequired: record.storeDurability === "process_memory",
    trainingTruth: false,
  });
}

function rejection(reason, severity = "Medium", details = {}) {
  return freeze({
    ok: false,
    schemaVersion:
      `${STARCRAFT_TMG_LIVE_FLASH_DECISION_PORT_VERSION}.rejection`,
    reason,
    findingSeverity: severity,
    ...clone(details),
    trainingTruth: false,
  });
}

export function createInMemoryStarcraftTmgLiveDecisionStoreV1() {
  const records = new Map();
  return Object.freeze({
    durability: "process_memory",
    async load(scopeKey) {
      return clone(records.get(scopeKey) || null);
    },
    async commit(scopeKey, expectedRevision, next) {
      const current = records.get(scopeKey) || null;
      if ((current?.revision ?? null) !== expectedRevision) {
        return { ok: false, reason: "LIVE_DECISION_STORE_REVISION_CONFLICT" };
      }
      records.set(scopeKey, clone(next));
      return { ok: true, revision: next.revision };
    },
  });
}

export function createStarcraftTmgLiveFlashDecisionPortV1(options = {}) {
  const providerSupervisor = options.providerSupervisor;
  const providerAttemptObserver = options.providerAttemptObserver || null;
  const promptArtifactStore = options.promptArtifactStore;
  const availabilityPort = options.profileAvailabilityPort;
  const strategySkillPort = options.strategySkillPort;
  const spatialQueryPort = options.spatialQueryPort;
  const memoryQueryPort = options.memoryQueryPort || null;
  const store = options.store || createInMemoryStarcraftTmgLiveDecisionStoreV1();
  const profiles = (options.profileCandidates || []).map(profile);
  const allowUnstartedProfileReselection =
    options.allowUnstartedProfileReselection === true;
  const providerInteractionMode = interactionMode(options.providerInteractionMode);
  const allowFailedInteractionModeMigration =
    options.allowFailedInteractionModeMigration === true;
  const requestOutputLimit = options.requestOutputLimit === undefined ? null
    : integer(options.requestOutputLimit, "requestOutputLimit", 256, 1_000_000);
  const now = typeof options.now === "function"
    ? options.now : () => new Date().toISOString();
  const maxToolRounds = integer(options.maxToolRounds || 3,
    "maxToolRounds", 1, 16);
  const maxSemanticCorrectionRounds = Math.min(maxToolRounds,
    STARCRAFT_TMG_MAX_SEMANTIC_CORRECTION_ROUNDS_PER_CHOICE);
  const maxPlanningQueryRounds = integer(
    options.maxPlanningQueryRounds || 8,
    "maxPlanningQueryRounds", 1, 32);
  const maxActionQueryRounds = integer(
    options.maxActionQueryRounds || 6,
    "maxActionQueryRounds", 1, 32);
  const maxQueriesPerRound = integer(options.maxQueriesPerRound || 16,
    "maxQueriesPerRound", 1, 128);
  if (typeof providerSupervisor?.sendTurn !== "function"
    || typeof providerSupervisor?.readState !== "function") {
    throw new TypeError("providerSupervisor readState/sendTurn are required");
  }
  if (providerAttemptObserver
    && typeof providerAttemptObserver.observe !== "function") {
    throw new TypeError("providerAttemptObserver.observe must be a function");
  }
  if (typeof promptArtifactStore?.put !== "function"
    || typeof promptArtifactStore?.release !== "function") {
    throw new TypeError("promptArtifactStore put/release are required");
  }
  if (typeof availabilityPort?.check !== "function") {
    throw new TypeError("profileAvailabilityPort.check is required");
  }
  if (typeof strategySkillPort?.resolve !== "function") {
    throw new TypeError("strategySkillPort.resolve is required");
  }
  if (typeof spatialQueryPort?.query !== "function") {
    throw new TypeError("spatialQueryPort.query is required");
  }
  if (memoryQueryPort && typeof memoryQueryPort.query !== "function") {
    throw new TypeError("memoryQueryPort.query must be a function");
  }
  if (typeof store?.load !== "function" || typeof store?.commit !== "function") {
    throw new TypeError("LiveDecisionStore load/commit are required");
  }
  if (!profiles.length) throw new TypeError("profileCandidates are required");
  const inFlight = new Map();
  const hotRecords = new Map();

  async function loadRecord(scopeKey) {
    if (hotRecords.has(scopeKey)) return hotRecords.get(scopeKey);
    const record = await store.load(scopeKey);
    if (record) hotRecords.set(scopeKey, record);
    return record;
  }

  async function commit(record, change, mutableChoiceKey = null) {
    // SQLite decoding gives this port a private graph. Only one choice (or
    // match metadata) changes per update; never copy the entire match history.
    // Cold choices are shared read-only, while the selected choice and root
    // metadata remain private drafts. CAS failure cannot change cached values.
    const next = structuredClone({ ...record, decisions: {} });
    for (const [key, decision] of Object.entries(record.decisions)) {
      next.decisions[key] = key === mutableChoiceKey
        ? structuredClone(decision) : freeze(decision);
      if (key !== mutableChoiceKey) {
        Object.defineProperty(next.decisions, key, {
          writable: false, configurable: false,
        });
      }
    }
    if (mutableChoiceKey !== null
      && !Object.hasOwn(next.decisions, mutableChoiceKey)) {
      Object.defineProperty(next.decisions, mutableChoiceKey, {
        value: undefined, enumerable: true, writable: true, configurable: false,
      });
    }
    Object.preventExtensions(next.decisions);
    change(next);
    next.revision = record.revision + 1;
    next.updatedAt = instant(now(), "now");
    const result = await store.commit(record.scope.scopeKey, record.revision, next);
    if (result?.ok !== true) {
      throw Object.assign(new Error(result?.reason
        || "LIVE_DECISION_STORE_COMMIT_FAILED"), {
        code: result?.reason || "LIVE_DECISION_STORE_COMMIT_FAILED",
        severity: "High",
      });
    }
    hotRecords.set(record.scope.scopeKey, next);
    return next;
  }

  function commitChoice(record, choiceKey, change) {
    return commit(record, change, choiceKey);
  }

  async function preflight(input = {}) {
    try {
      const scopeValue = scope(input.scope || input);
      const matchMode = required(input.matchMode || "user_vs_agent",
        "matchMode", 80);
      const checks = [];
      let selected = null;
      const existing = await loadRecord(scopeValue.scopeKey);
      if (existing) {
        selected = profiles.find((candidate) => candidate.profileRef.hash
          === existing.selectedProfile.profileRef.hash) || null;
        if (!selected && (!allowUnstartedProfileReselection
          || Number(existing.usage?.providerCalls || 0) !== 0
          || Object.keys(existing.decisions || {}).length !== 0)) {
          return rejection("OPEN_MATCH_FROZEN_BINDING_MISMATCH", "High");
        }
      }
      const selectionSource = selected ? "persisted_match" : "model_discovery";
      // A resume reuses the already accepted model. Repeating optional model
      // discovery here used to replace a frozen profile after transient failure.
      for (const candidate of selected ? [] : profiles) {
        let result;
        try {
          result = await availabilityPort.check(freeze({
            scope: clone(scopeValue),
            matchMode,
            providerId: candidate.providerId,
            model: candidate.model,
            profileRef: clone(candidate.profileRef),
            paidGenerationAllowed: false,
            trainingTruth: false,
          }));
        } catch (error) {
          result = { ok: false, reason: String(error?.code || error?.message
            || "profile_preflight_failed") };
        }
        const available = result?.ok === true && result?.available !== false;
        checks.push({ profileRef: clone(candidate.profileRef),
          model: candidate.model, available,
          reason: available ? null : String(result?.reason || "unavailable") });
        if (available) { selected = candidate; break; }
      }
      if (!selected) return rejection("NO_FLASH_PROFILE_AVAILABLE", "High", {
        checks, paidProviderCalls: 0,
      });
      const resolvedSkills = await strategySkillPort.resolve(freeze({
        scope: clone(scopeValue),
        matchMode,
        requestedAt: instant(now(), "now"),
        trainingTruth: false,
      }));
      const skillSnapshot = resolvedSkills?.snapshot;
      if (resolvedSkills?.ok !== true || !object(skillSnapshot)
        || !HASH.test(String(skillSnapshot.skillSetHash || ""))) {
        return rejection("STRATEGY_SKILL_SNAPSHOT_UNAVAILABLE", "High", {
          paidProviderCalls: 0,
        });
      }
      return seal({
        ok: true,
        schemaVersion:
          `${STARCRAFT_TMG_LIVE_FLASH_DECISION_PORT_VERSION}.preflight`,
        scope: clone(scopeValue),
        matchMode,
        checks,
        selectionSource,
        selectedProfile: clone(selected),
        fallbackSelected: selected.preference === "pre_game_fallback",
        modelSwitchAllowedAfterOpen: false,
        strategySkillSnapshot: clone(skillSnapshot),
        paidProviderCalls: 0,
        occurredAt: instant(now(), "now"),
        trainingTruth: false,
      }, "preflightHash");
    } catch (error) {
      return rejection(error?.code || "LIVE_DECISION_PREFLIGHT_INVALID",
        error?.severity || "Medium");
    }
  }

  async function openMatch(input = {}) {
    try {
      const scopeValue = scope(input.scope || input);
      const receipt = input.preflightReceipt;
      if (!verifySeal(receipt, "preflightHash") || receipt.ok !== true
        || receipt.scope.scopeKey !== scopeValue.scopeKey) {
        return rejection("LIVE_DECISION_PREFLIGHT_REQUIRED", "High");
      }
      const providerSession = {
        sessionId: required(input.providerSession?.sessionId,
          "providerSession.sessionId", 200),
        connectionEpoch: integer(input.providerSession?.connectionEpoch,
          "providerSession.connectionEpoch", 1, 10_000_000),
        sessionBindingHash: hash(input.providerSession?.sessionBindingHash,
          "providerSession.sessionBindingHash"),
      };
      const existing = await loadRecord(scopeValue.scopeKey);
      if (existing) {
        // Only an explicit operator-owned configuration may change this
        // limit. Reopening a match must neither ignore that configuration
        // nor reset cumulative usage, choices or the paid-attempt ledger.
        const requestedLimit = input.budget?.limitCnyMicros === undefined
          ? existing.budget.limitCnyMicros
          : input.budget.limitCnyMicros === null ? null : integer(input.budget.limitCnyMicros,
            "budget.limitCnyMicros", 1, 10_000_000_000);
        const budgetLimitChanged = requestedLimit !== existing.budget.limitCnyMicros;
        if (budgetLimitChanged
          && requestedLimit !== null
          && requestedLimit < existing.usage.estimatedCostCnyMicros) {
          return rejection("LIVE_DECISION_BUDGET_BELOW_ACCRUED_COST", "High");
        }
        const budgetLimitTightened = budgetLimitChanged && requestedLimit !== null
          && (existing.budget.limitCnyMicros === null
            || requestedLimit < existing.budget.limitCnyMicros);
        if (budgetLimitTightened && (inFlight.size
          || Object.values(existing.decisions).some(choice =>
            choice.status === "provider_call_may_have_started"))) {
          return rejection("LIVE_DECISION_BUDGET_UPDATE_REQUIRES_IDLE", "High");
        }
        const previousInteractionMode = interactionMode(
          existing.providerInteractionMode);
        const interactionModeChanged = previousInteractionMode
          !== providerInteractionMode;
        const failedOnlyInteractionMigration = interactionModeChanged
          && allowFailedInteractionModeMigration
          && previousInteractionMode === "native_tools"
          && providerInteractionMode === "json_channels_v1"
          && Object.values(existing.decisions || {}).every((decision) =>
            (!decision.completedDecision
              || decision.completedDecision.providerTrace
                ?.deterministicHostStep === true)
            && (decision.providerContinuationMessages || []).length === 0
            && Object.values(decision.attempts || {}).every((attempt) =>
              ["provider_failed_not_sent",
                "provider_failed_after_possible_egress"].includes(
                attempt.status)));
        if (interactionModeChanged && !failedOnlyInteractionMigration) {
          return rejection("OPEN_MATCH_INTERACTION_MODE_MISMATCH", "High");
        }
        const profileChanged = existing.selectedProfile.profileRef.hash
          !== receipt.selectedProfile.profileRef.hash;
        const unstartedProfileReselection = profileChanged
          && allowUnstartedProfileReselection
          && Number(existing.usage?.providerCalls || 0) === 0
          && Object.keys(existing.decisions || {}).length === 0;
        if (existing.scope.matchBindingHash !== scopeValue.matchBindingHash
          || (profileChanged && !unstartedProfileReselection)
          || existing.strategySkillSnapshot.skillSetHash
            !== receipt.strategySkillSnapshot.skillSetHash) {
          return rejection("OPEN_MATCH_FROZEN_BINDING_MISMATCH", "High");
        }
        if (existing.lifecycle === "closed"
          && input.resumeClosedMatch !== true) {
          return rejection("OPEN_MATCH_ALREADY_CLOSED", "High", {
            projection: publicProjection(existing),
          });
        }
        const sessionChanged = existing.providerSession.sessionId
            !== providerSession.sessionId
          || existing.providerSession.sessionBindingHash
            !== providerSession.sessionBindingHash
          || existing.providerSession.connectionEpoch
            !== providerSession.connectionEpoch;
        const reopenLegacyShutdown = existing.lifecycle === "closed";
        const existingAttempts = Object.values(existing.decisions || {})
          .flatMap((decision) => Object.values(decision.attempts || {}));
        const definitelyNotSentUsageRepair = existingAttempts.length > 0
          && existingAttempts.every((attempt) =>
            DEFINITELY_NOT_SENT_FAILURES.has(String(attempt.failure || "")))
          && Number(existing.usage?.totalUnits || 0) > 0;
        let resumed = existing;
        if (sessionChanged || reopenLegacyShutdown
          || definitelyNotSentUsageRepair || unstartedProfileReselection
          || failedOnlyInteractionMigration || budgetLimitChanged) {
          resumed = await commit(existing, (draft) => {
            draft.providerSession = clone(providerSession);
            if (budgetLimitChanged) {
              const change = {
                scopeKey: scopeValue.scopeKey,
                previousLimitCnyMicros: existing.budget.limitCnyMicros,
                limitCnyMicros: requestedLimit,
                spentAtUpdateCnyMicros: existing.usage.estimatedCostCnyMicros,
                occurredAt: instant(now(), "now"),
                source: "explicit_operator_configuration",
                cumulativeUsageAndPaidHistoryPreserved: true,
              };
              draft.budget.limitCnyMicros = requestedLimit;
              draft.budget.authorizedLimitChanges ||= [];
              draft.budget.authorizedLimitChanges.push(change);
            }
            if (failedOnlyInteractionMigration) {
              draft.providerInteractionMode = providerInteractionMode;
              draft.issues.push({
                code: "LIVE_DECISION_FAILED_INTERACTION_MODE_MIGRATED",
                severity: "Medium",
                previousMode: previousInteractionMode,
                nextMode: providerInteractionMode,
                priorProviderCalls: existing.usage.providerCalls,
                occurredAt: instant(now(), "now"),
                historicalAttemptsAndUsagePreserved: true,
              });
            }
            if (unstartedProfileReselection) {
              draft.selectedProfile = clone(receipt.selectedProfile);
              draft.issues.push({
                code: "LIVE_DECISION_UNSTARTED_PROFILE_RESELECTED",
                severity: "Medium",
                previousModel: existing.selectedProfile.model,
                requestedModel: receipt.selectedProfile.model,
                occurredAt: instant(now(), "now"),
                providerCallsBeforeChange: 0,
              });
            }
            if (reopenLegacyShutdown) {
              draft.lifecycle = "open";
              draft.closedAt = null;
            }
            draft.budget.epoch = Number(draft.budget.epoch || 1) + 1;
            if (definitelyNotSentUsageRepair) {
              draft.usage.inputUnits = 0;
              draft.usage.outputUnits = 0;
              draft.usage.totalUnits = 0;
              draft.usage.estimatedCostCnyMicros = 0;
            }
            draft.issues.push({
              code: reopenLegacyShutdown
                ? "LIVE_DECISION_LEGACY_SHUTDOWN_REOPENED"
                : "LIVE_DECISION_PROVIDER_SESSION_REBOUND",
              severity: "Medium",
              occurredAt: instant(now(), "now"),
              matchUsagePreserved: true,
              unresolvedProviderAttemptsPreserved: true,
            });
            if (definitelyNotSentUsageRepair) {
              draft.issues.push({
                code: "LIVE_DECISION_DEFINITELY_NOT_SENT_USAGE_RECONCILED",
                severity: "Medium",
                occurredAt: instant(now(), "now"),
                providerCallAuditPreserved: true,
                chargedUsageResetToZero: true,
              });
            }
          });
        }
        return freeze({ ok: true, resumed: true,
          providerSessionRebound: sessionChanged,
          legacyShutdownReopened: reopenLegacyShutdown,
          projection: publicProjection(resumed), trainingTruth: false });
      }
      // null means no currency cap; it is not a fresh zero-cost allowance.
      const budgetLimitCnyMicros = input.budget?.limitCnyMicros == null ? null : integer(
        input.budget.limitCnyMicros,
        "budget.limitCnyMicros", 1, 10_000_000_000);
      const maxProviderCalls = integer(input.budget?.maxProviderCalls || 1_024,
        "budget.maxProviderCalls", 1, 100_000);
      const createdAt = instant(now(), "now");
      const record = {
        schemaVersion:
          `${STARCRAFT_TMG_LIVE_FLASH_DECISION_PORT_VERSION}.record`,
        revision: 0,
        scope: clone(scopeValue),
        lifecycle: "open",
        matchMode: receipt.matchMode,
        promptPack: input.promptPack || (receipt.matchMode === "agent_vs_agent"
          ? "selfplay_agent_prompt" : "opponent_prompt"),
        providerSession,
        selectedProfile: clone(receipt.selectedProfile),
        providerInteractionMode,
        strategySkillSnapshot: clone(receipt.strategySkillSnapshot),
        budget: {
          epoch: 1,
          limitCnyMicros: budgetLimitCnyMicros,
          maxProviderCalls,
          resetAtMatchOpen: true,
          historicalProviderLedgerPreservedByGateway: true,
          notificationStepCnyMicros: 100_000_000,
        },
        usage: {
          providerCalls: 0,
          inputUnits: 0,
          outputUnits: 0,
          totalUnits: 0,
          estimatedCostCnyMicros: 0,
          nextNotificationCnyMicros: 100_000_000,
          notificationThresholdsCrossed: [],
        },
        decisions: {},
        issues: [],
        storeDurability: store.durability || "adapter_managed",
        createdAt,
        updatedAt: createdAt,
        closedAt: null,
        hiddenChainOfThoughtStored: false,
        trainingTruth: false,
      };
      const created = await store.commit(scopeValue.scopeKey, null, record);
      if (created?.ok !== true) {
        return rejection(created?.reason || "LIVE_DECISION_STORE_CREATE_FAILED",
          "High");
      }
      return freeze({ ok: true, resumed: false,
        projection: publicProjection(record), trainingTruth: false });
    } catch (error) {
      return rejection(error?.code || "OPEN_LIVE_DECISION_MATCH_INVALID",
        error?.severity || "Medium");
    }
  }

  function choiceFrom(input, match, authorityValue) {
    const choiceKey = `choice-${hashStarcraftTmgContract({
      scopeKey: match.scope.scopeKey,
      stateHash: authorityValue.stateHash,
      legalSpaceHash: authorityValue.legalSpaceHash,
      actionSpaceHash: authorityValue.spatialActionSpaceHash,
    })}`;
    return {
      choiceKey,
      status: "generating",
      authority: clone(authorityValue),
      actionIndex: clone(actionIndex(input.spatialActionSpace)),
      currentPlan: clone(input.planState?.plan || null),
      stage: "planning",
      plannerResult: null,
      attemptKeys: [],
      processedAttemptKeys: [],
      providerContinuationMessages: [],
      queryReceipts: [],
      queryRounds: 0,
      stageQueryRounds: 0,
      proposalValidationRounds: 0,
      semanticCorrectionRounds: 0,
      stageCorrectionRounds: 0,
      terminalFormatRepairPending: false,
      lastSemanticFailureSignature: null,
      repeatedSemanticFailureCount: 0,
      unavailableCandidateIds: [],
      warnings: [],
      completedDecision: null,
      createdAt: instant(now(), "now"),
      completedAt: null,
    };
  }

  async function stageChoice(match, input, authorityValue) {
    const candidate = choiceFrom(input, match, authorityValue);
    if (match.decisions[candidate.choiceKey]) {
      return { match, choice: match.decisions[candidate.choiceKey] };
    }
    const next = await commitChoice(match, candidate.choiceKey, (draft) => {
      draft.decisions[candidate.choiceKey] = candidate;
    });
    return { match: next, choice: next.decisions[candidate.choiceKey] };
  }

  async function providerCall(match, input, choice, stage) {
    const round = choice.attemptKeys.length + 1;
    const queryRoundLimit = stage === "planning"
      ? maxPlanningQueryRounds : maxActionQueryRounds;
    const terminalForceReason = choice.terminalFormatRepairPending === true
      ? "terminal_tool_argument_format_repair"
      : choice.warnings.includes(
        `QUERY_RETURNED_ONLY_KNOWN_RECEIPTS_TERMINAL_FORCED:${stage}`)
        ? "repeated_query_no_new_evidence"
      : choice.stageQueryRounds >= queryRoundLimit
        ? "query_safety_ceiling_reached" : null;
    const forceTerminal = terminalForceReason !== null;
    const activeInput = decisionInputForChoice(input, choice);
    const prompt = makePromptArtifact(match, activeInput, choice, round,
      choice.queryReceipts, stage, Boolean(memoryQueryPort), forceTerminal,
      terminalForceReason);
    if (containsApiCredential(prompt.artifact)) {
      throw Object.assign(new Error("API credential found in decision prompt"), {
        code: "LIVE_DECISION_API_CREDENTIAL_FORBIDDEN",
        severity: "Critical",
      });
    }
    const stored = promptArtifactStore.put({
      sessionId: match.providerSession.sessionId,
      sessionBindingHash: match.providerSession.sessionBindingHash,
      artifact: prompt.artifact,
    });
    if (stored?.ok !== true) {
      throw Object.assign(new Error(stored?.reason
        || "LIVE_DECISION_PROMPT_STORE_FAILED"), {
        code: stored?.reason || "LIVE_DECISION_PROMPT_STORE_FAILED",
        severity: "High",
      });
    }
    // UTF-8 bytes are a conservative token upper bound for the serialized
    // artifact. Keep additional headroom for the transport's system/user
    // message wrapper instead of treating bytes/4 as a reservation guarantee.
    const inputUnits = Math.max(1, stored.bytes + STARCRAFT_TMG_PROVIDER_INPUT_HEADROOM_UNITS);
    // A deterministic local capacity failure is not a retryable Provider outage.
    // Check the shared supervisor contract before journaling/counting dispatch.
    if (inputUnits > STARCRAFT_TMG_PROVIDER_INPUT_RESERVATION_LIMIT_UNITS) {
      promptArtifactStore.release(stored.ref);
      throw Object.assign(new Error("LIVE_DECISION_PROVIDER_INPUT_CAPACITY_EXCEEDED"), {
        code: "LIVE_DECISION_PROVIDER_INPUT_CAPACITY_EXCEEDED", severity: "High",
        requestDefinitelyNotSent: true, automaticRetryAllowed: false,
        promptByteLength: stored.bytes,
        inputReservationLimit: STARCRAFT_TMG_PROVIDER_INPUT_RESERVATION_LIMIT_UNITS,
      });
    }
    const maxOutputUnits = requestOutputLimit ?? match.selectedProfile.maxOutputUnits;
    const startedAt = instant(now(), "now");
    const projectedMicros = estimateCnyMicros(inputUnits,
      maxOutputUnits, startedAt, match.selectedProfile.model);
    if (match.usage.providerCalls >= match.budget.maxProviderCalls) {
      promptArtifactStore.release(stored.ref);
      throw Object.assign(new Error("Per-match Provider call budget exhausted"), {
        code: "LIVE_DECISION_MAX_CALLS_EXHAUSTED",
        severity: "High",
      });
    }
    if (match.budget.limitCnyMicros !== null
      && match.usage.estimatedCostCnyMicros + projectedMicros
      > match.budget.limitCnyMicros) {
      promptArtifactStore.release(stored.ref);
      throw Object.assign(new Error("Per-match CNY budget would be exceeded"), {
        code: "LIVE_DECISION_CNY_BUDGET_EXHAUSTED",
        severity: "High",
      });
    }
    const boundedBody = {
      schemaVersion: "starcraft_tmg_bounded_provider_request_v1",
      intent: "take_turn",
      requestPayloadHash: prompt.artifact.promptArtifactHash,
      inputUnits,
      maxOutputUnits,
    };
    const boundedRequest = {
      ...boundedBody,
      requestHash: hashStarcraftTmgContract(boundedBody),
    };
    const attemptKey = `provider-attempt-${hashStarcraftTmgContract({
      choiceKey: choice.choiceKey,
      round,
      stage,
      requestHash: boundedRequest.requestHash,
    })}`;
    match = await commitChoice(match, choice.choiceKey, (draft) => {
      const current = draft.decisions[choice.choiceKey];
      current.status = "provider_call_may_have_started";
      current.attemptKeys.push(attemptKey);
      current.attempts ||= {};
      current.attempts[attemptKey] = {
        attemptKey,
        round,
        stage,
        status: "provider_call_may_have_started",
        promptPolicyVersion: promptPolicyVersion(interactionMode(
          match.providerInteractionMode)),
        terminalSubmissionProtocol: interactionMode(match.providerInteractionMode)
          === "native_tools" ? "strict_function_tool_required"
          : "json_channel_terminal_required",
        requestedMaxOutputUnits: maxOutputUnits,
        outputCapacityPolicyVersion: STARCRAFT_TMG_LIVE_OUTPUT_CAPACITY_POLICY_VERSION,
        requestHash: boundedRequest.requestHash,
        promptArtifactHash: prompt.artifact.promptArtifactHash,
        promptByteLength: stored.bytes,
        promptNodeByteLengths: prompt.artifact.nodes.map((node) => ({
          nodeId: node.nodeId,
          byteLength: Buffer.byteLength(JSON.stringify(node), "utf8"),
        })),
        projectedCostCnyMicros: projectedMicros,
        startedAt,
        completedAt: null,
        usage: null,
        safeOutput: null,
        outputHash: null,
        failure: null,
        providerTransportProgress: null,
      };
      draft.usage.providerCalls += 1;
    });
    let result;
    try {
      result = await providerSupervisor.sendTurn({
        sessionId: match.providerSession.sessionId,
        roomId: match.scope.roomId,
        expectedConnectionEpoch: match.providerSession.connectionEpoch,
        providerProfileRef: clone(match.selectedProfile.profileRef),
        promptAssemblyRef: stored.ref,
        boundedRequest,
        responseContract: prompt.responseRef,
      });
    } finally {
      promptArtifactStore.release(stored.ref);
    }
    const completedAt = instant(now(), "now");
    if (result?.ok !== true) {
      const chargedUnits = Number(result?.turn?.chargedUnits
        ?? result?.receipt?.chargedUnits);
      const providerMayHaveBeenCalled = Number.isFinite(chargedUnits)
        ? chargedUnits > 0 : Boolean(result?.turn || result?.receipt);
      let providerTransportProgress = null;
      if (["provider_transport_timeout", "provider_transport_failed"]
        .includes(result?.reason)) {
        try {
          providerTransportProgress =
            assertStarcraftTmgProviderTransportProgressV1(
              result?.turn?.failure?.transportProgress);
        } catch {
          // The decision journal accepts only the typed numeric safe receipt.
        }
      }
      match = await commitChoice(match, choice.choiceKey, (draft) => {
        const current = draft.decisions[choice.choiceKey];
        const attempt = current.attempts[attemptKey];
        attempt.status = providerMayHaveBeenCalled
          ? "provider_failed_after_possible_egress" : "provider_failed_not_sent";
        attempt.completedAt = completedAt;
        attempt.failure = String(result?.reason || "provider_turn_failed");
        attempt.providerTransportProgress = providerTransportProgress;
        const httpStatus = result?.turn?.failure?.httpStatus;
        if (Number.isSafeInteger(httpStatus) && httpStatus >= 100 && httpStatus <= 599) {
          attempt.providerHttpStatus = httpStatus;
        }
        const failureReceiptHash = result?.turn?.failure?.safeProviderReceiptHash;
        if (HASH.test(String(failureReceiptHash || ""))) {
          attempt.safeProviderReceiptHash = failureReceiptHash;
        }
        current.status = providerMayHaveBeenCalled
          ? "provider_failed_requires_explicit_retry" : "retry_ready";
        if (providerMayHaveBeenCalled) {
          draft.usage.inputUnits += inputUnits;
          draft.usage.outputUnits += maxOutputUnits;
          draft.usage.totalUnits += inputUnits + maxOutputUnits;
          draft.usage.estimatedCostCnyMicros += projectedMicros;
        }
      });
      throw Object.assign(new Error(result?.reason || "provider_turn_failed"), {
        code: result?.reason || "LIVE_DECISION_PROVIDER_FAILED",
        severity: providerMayHaveBeenCalled ? "High" : "Medium",
        match,
      });
    }
    if (!object(result.output) || containsApiCredential(result.output)) {
      throw Object.assign(new Error("Provider output is unsafe"), {
        code: "LIVE_DECISION_PROVIDER_OUTPUT_UNSAFE",
        severity: "Critical",
        match,
      });
    }
    const used = usage(result.usageReceipt || {});
    const estimatedMicros = estimateCnyMicros(used.inputUnits,
      used.outputUnits, startedAt, match.selectedProfile.model);
    const reportedModel = result.providerEvidence?.reportedModel || null;
    const modelDrift = reportedModel !== null
      && reportedModel !== match.selectedProfile.model;
    let thresholds = [];
    match = await commitChoice(match, choice.choiceKey, (draft) => {
      const current = draft.decisions[choice.choiceKey];
      const attempt = current.attempts[attemptKey];
      attempt.status = "completed";
      attempt.completedAt = completedAt;
      attempt.usage = used;
      attempt.safeOutput = clone(result.output);
      attempt.outputHash = hashStarcraftTmgContract(result.output);
      attempt.reportedModel = reportedModel;
      attempt.queryRoundLimit = queryRoundLimit;
      attempt.terminalSubmissionForced = forceTerminal;
      current.status = "generating";
      draft.usage.inputUnits += used.inputUnits;
      draft.usage.outputUnits += used.outputUnits;
      draft.usage.totalUnits += used.totalUnits;
      draft.usage.estimatedCostCnyMicros += estimatedMicros;
      while (draft.usage.estimatedCostCnyMicros
        >= draft.usage.nextNotificationCnyMicros) {
        thresholds.push(draft.usage.nextNotificationCnyMicros);
        draft.usage.notificationThresholdsCrossed.push(
          draft.usage.nextNotificationCnyMicros);
        draft.usage.nextNotificationCnyMicros +=
          draft.budget.notificationStepCnyMicros;
      }
      if (modelDrift) {
        const issue = {
          code: "LIVE_DECISION_REPORTED_MODEL_ALIAS_DRIFT",
          severity: "Medium",
          requestedModel: draft.selectedProfile.model,
          reportedModel,
          occurredAt: completedAt,
        };
        draft.issues.push(issue);
        current.warnings.push(issue.code);
      }
    });
    return { match, attemptKey,
      attempt: match.decisions[choice.choiceKey].attempts[attemptKey],
      thresholds };
  }

  async function reconcileProviderCommitUnknown(match, choice, attempt) {
    if (!providerAttemptObserver) {
      return { match, choice, attempt, reconciled: false, thresholds: [] };
    }
    let observed;
    try {
      observed = await providerAttemptObserver.observe({
        requestHash: attempt.requestHash,
        promptAssemblyHash: attempt.promptArtifactHash,
      });
    } catch {
      return { match, choice, attempt, reconciled: false, thresholds: [] };
    }
    const durable = observed?.attempt;
    if (observed?.ok !== true || !object(durable)
      || durable.requestHash !== attempt.requestHash
      || durable.promptAssemblyHash !== attempt.promptArtifactHash) {
      return { match, choice, attempt, reconciled: false, thresholds: [] };
    }
    const definitelyNotSent = durable.status === "abandoned_before_egress"
      || durable.providerMayHaveBeenCalled === false
        && Number(durable.chargedUnits || 0) === 0
        && new Set(["failed", "cancelled", "timed_out"])
          .has(String(durable.status || ""));
    const responseLost = durable.status === "completed";
    const settledFailure = new Set([
      "failed", "cancelled", "timed_out", "ambiguous",
    ]).has(String(durable.status || ""));
    if (!definitelyNotSent && !responseLost && !settledFailure) {
      return { match, choice, attempt, reconciled: false, thresholds: [] };
    }
    const exactUsage = durable.usageKnown === true;
    const used = {
      inputUnits: exactUsage ? Number(durable.reportedInputUnits || 0) : 0,
      outputUnits: exactUsage ? Number(durable.reportedOutputUnits || 0) : 0,
      totalUnits: definitelyNotSent ? 0
        : exactUsage ? Number(durable.reportedTotalUnits || 0)
          : Number(durable.chargedUnits || 0),
    };
    const estimatedMicros = definitelyNotSent ? 0
      : exactUsage ? estimateCnyMicros(used.inputUnits, used.outputUnits,
        attempt.startedAt, match.selectedProfile.model)
        : Number(attempt.projectedCostCnyMicros || 0);
    const thresholds = [];
    match = await commitChoice(match, choice.choiceKey, (draft) => {
      const current = draft.decisions[choice.choiceKey];
      const storedAttempt = current.attempts[attempt.attemptKey];
      storedAttempt.status = definitelyNotSent
        ? "provider_failed_not_sent"
        : responseLost ? "provider_completed_response_lost"
          : "provider_failed_after_possible_egress";
      storedAttempt.completedAt = durable.settledAt || instant(now(), "now");
      storedAttempt.usage = used;
      storedAttempt.failure = definitelyNotSent
        ? "provider_durable_attempt_abandoned_before_egress"
        : responseLost
          ? "provider_response_lost_after_durable_settlement"
          : `provider_${durable.status}_after_possible_egress`;
      storedAttempt.durableProviderAttemptId = durable.attemptId || null;
      storedAttempt.durableProviderAttemptHash = durable.attemptHash || null;
      storedAttempt.safeProviderReceiptHash =
        durable.safeProviderReceiptHash || null;
      storedAttempt.rawProviderOutputRetained = false;
      current.status = definitelyNotSent ? "retry_ready"
        : "provider_response_lost_requires_explicit_retry";
      current.warnings.push(definitelyNotSent
        ? "DURABLE_PROVIDER_ATTEMPT_ABANDONED_BEFORE_EGRESS"
        : responseLost
          ? "DURABLE_PROVIDER_SETTLED_RESPONSE_LOST"
          : `DURABLE_PROVIDER_${String(durable.status).toUpperCase()}_RECONCILED`);
      draft.usage.inputUnits += used.inputUnits;
      draft.usage.outputUnits += used.outputUnits;
      draft.usage.totalUnits += used.totalUnits;
      draft.usage.estimatedCostCnyMicros += estimatedMicros;
      while (draft.usage.estimatedCostCnyMicros
        >= draft.usage.nextNotificationCnyMicros) {
        thresholds.push(draft.usage.nextNotificationCnyMicros);
        draft.usage.notificationThresholdsCrossed.push(
          draft.usage.nextNotificationCnyMicros);
        draft.usage.nextNotificationCnyMicros +=
          draft.budget.notificationStepCnyMicros;
      }
      draft.issues.push({
        code: responseLost
          ? "LIVE_DECISION_PROVIDER_RESPONSE_LOST_AFTER_SETTLEMENT"
          : "LIVE_DECISION_PROVIDER_TERMINAL_ATTEMPT_RECONCILED",
        severity: "Medium",
        choiceKey: current.choiceKey,
        attemptKey: storedAttempt.attemptKey,
        durableProviderAttemptId: storedAttempt.durableProviderAttemptId,
        occurredAt: instant(now(), "now"),
        roomMutationObserved: false,
      });
    });
    choice = match.decisions[choice.choiceKey];
    attempt = choice.attempts[attempt.attemptKey];
    return { match, choice, attempt, reconciled: true, thresholds };
  }

  async function runQueries(input, requests) {
    const receipts = [];
    const warnings = [];
    const outcomes = [];
    const bounded = requests.slice(0, maxQueriesPerRound);
    if (requests.length > bounded.length) {
      warnings.push("QUERY_REQUEST_COUNT_SOFT_TRUNCATED");
    }
    let batchReplies = null;
    let batchError = null;
    if (bounded.length > 1 && typeof spatialQueryPort.queryBatch === "function") {
      try {
        batchReplies = await spatialQueryPort.queryBatch({
          roomProjection: input.roomProjection,
          legalSpace: input.legalSpace,
          spatialObservation: input.spatialObservation,
          requests: bounded,
        });
        if (!Array.isArray(batchReplies) || batchReplies.length !== bounded.length) {
          throw new TypeError("spatial query batch reply count mismatch");
        }
      } catch (error) { batchError = error; }
    }
    for (const [index, request] of bounded.entries()) {
      const outcome = { receipts: [], warnings: [] };
      try {
        if (batchError) throw batchError;
        const receipt = batchReplies ? batchReplies[index] : await spatialQueryPort.query({
          roomProjection: input.roomProjection,
          legalSpace: input.legalSpace,
          spatialObservation: input.spatialObservation,
          request,
        });
        const rejection = spatialQueryReceiptRejectionV1({ input, request, receipt });
        if (!rejection) {
          outcome.receipts.push(clone(receipt));
        } else {
          outcome.warnings.push(`QUERY_RESULT_REJECTED:${request.queryKind}:${rejection}`);
        }
      } catch {
        outcome.warnings.push(`QUERY_FAILED:${request.queryKind}`);
      }
      receipts.push(...outcome.receipts);
      warnings.push(...outcome.warnings);
      outcomes.push(outcome);
    }
    return { receipts, warnings, outcomes };
  }

  async function runNativeToolCalls(match, input, providerTurn) {
    const calls = Array.isArray(providerTurn?.toolCalls)
      ? providerTurn.toolCalls.slice(0, maxQueriesPerRound) : [];
    const warnings = [];
    if (providerTurn?.toolCalls?.length > calls.length) {
      warnings.push("NATIVE_TOOL_CALL_COUNT_SOFT_TRUNCATED");
    }
    const receipts = [];
    const normalizedCalls = [];
    const toolMessages = [];
    const preparedCalls = calls.map((call, index) => {
      const callId = String(call?.callId || `native-tool-${index + 1}`);
      const toolName = String(call?.name || "");
      const args = object(call?.arguments) ? clone(call.arguments) : {};
      let argumentIssue = call?.argumentIssue
        ? String(call.argumentIssue) : null;
      let queryArguments = {};
      if (!argumentIssue && toolName === NATIVE_QUERY_TOOL_NAME) {
        try {
          const normalized = normalizeProviderJsonDocumentV1(
            String(args.argumentsJson || ""));
          const parsed = JSON.parse(normalized.text);
          if (!object(parsed) || containsApiCredential(parsed)) throw new Error();
          queryArguments = parsed;
        } catch {
          argumentIssue = "arguments_json_invalid";
        }
      }
      return { callId, toolName, args, argumentIssue, queryArguments };
    });
    const batchedQueries = new Map();
    const independentCall = call => !call.argumentIssue
      && call.toolName === NATIVE_QUERY_TOOL_NAME
      && INDEPENDENT_READONLY_QUERY_KINDS.has(String(call.args.queryKind || ""));
    for (const [index, prepared] of preparedCalls.entries()) {
      const { callId, toolName, args, argumentIssue, queryArguments } = prepared;
      if (independentCall(prepared) && !batchedQueries.has(index)) {
        const requests = [];
        for (let next = index; next < preparedCalls.length
          && independentCall(preparedCalls[next]); next += 1) {
          const entry = preparedCalls[next];
          requests.push({ requestId: String(entry.args.requestId || entry.callId),
            queryKind: String(entry.args.queryKind), arguments: entry.queryArguments });
        }
        const grouped = await runQueries(input, requests);
        for (const [offset, outcome] of grouped.outcomes.entries()) {
          batchedQueries.set(index + offset, outcome);
        }
      }
      normalizedCalls.push({
        id: callId,
        type: "function",
        function: { name: toolName, arguments: JSON.stringify(args) },
      });
      let receipt = null;
      if (argumentIssue) {
        warnings.push(`NATIVE_TOOL_ARGUMENTS_SOFT_REJECTED:${argumentIssue}`);
      } else if (toolName === NATIVE_SKILL_TOOL_NAME) {
        receipt = retrieveStrategySkill(match.strategySkillSnapshot, args);
        receipts.push(receipt);
      } else if (toolName === NATIVE_MEMORY_TOOL_NAME && memoryQueryPort) {
        try {
          const memoryQuery = {
            ...(Array.isArray(args.kinds) && args.kinds.length
              ? { kinds: clone(args.kinds) } : {}),
            ...(["combined", "current_versioned_room",
              "frozen_source_room"].includes(args.historyLane)
              ? { historyLane: args.historyLane } : {}),
            ...(Number(args.round) > 0 ? { round: Number(args.round) } : {}),
            ...Object.fromEntries(["phase", "unitId", "abilityId",
              "resourceId", "text"].filter((field) =>
              String(args[field] || "").trim()).map((field) =>
              [field, String(args[field]).trim()])),
            limit: Math.max(1, Math.min(12, Number(args.limit || 6))),
            order: args.order === "oldest_first"
              ? "oldest_first" : "newest_first",
          };
          const queried = await memoryQueryPort.query({
            scope: clone(match.scope),
            query: memoryQuery,
          });
          if (!object(queried)
            || !HASH.test(String(queried.queryResultHash || ""))
            || queried.scope?.roomId !== match.scope.roomId
            || queried.scope?.matchBindingHash !== match.scope.matchBindingHash
            || queried.scope?.seatKey !== match.scope.seatKey) {
            warnings.push("NATIVE_MEMORY_QUERY_RESULT_REJECTED");
          } else {
            receipt = seal({
              schemaVersion:
                `${STARCRAFT_TMG_LIVE_FLASH_DECISION_PORT_VERSION}.memory-query-receipt`,
              queryKind: "match_memory",
              status: "exact",
              result: clone(queried),
              source: String(queried.source
                || "complete_same_match_event_log"),
              rulesAuthority: false,
              mutationAuthority: false,
              trainingTruth: false,
            }, "queryReceiptHash");
            receipts.push(receipt);
          }
        } catch {
          warnings.push("NATIVE_MEMORY_QUERY_FAILED");
        }
      } else if (toolName === NATIVE_QUERY_TOOL_NAME
        && HOST_DEFERRED_QUERY_KINDS.has(String(args.queryKind || ""))) {
        warnings.push(`HOST_DEFERRED_QUERY_SKIPPED:${args.queryKind}`);
        receipt = seal({
          schemaVersion:
            `${STARCRAFT_TMG_LIVE_FLASH_DECISION_PORT_VERSION}.query-receipt`,
          requestId: String(args.requestId || callId),
          queryKind: String(args.queryKind),
          status: "deferred",
          reason: "host_executes_once_after_planner_candidate_selection",
          result: null,
          rulesAuthority: false,
          mutationAuthority: false,
          trainingTruth: false,
        }, "queryReceiptHash");
        receipts.push(receipt);
      } else if (toolName !== NATIVE_QUERY_TOOL_NAME
        || !NATIVE_QUERY_KINDS.includes(String(args.queryKind || ""))) {
        warnings.push(`NATIVE_TOOL_UNSUPPORTED:${toolName || "missing"}`);
      } else {
        const query = batchedQueries.get(index) || await runQueries(input, [{
          requestId: String(args.requestId || callId),
          queryKind: String(args.queryKind),
          arguments: queryArguments,
        }]);
        receipt = query.receipts[0] || null;
        warnings.push(...query.warnings);
        if (receipt) receipts.push(receipt);
      }
      toolMessages.push({
        role: "tool",
        tool_call_id: callId,
        name: toolName,
        content: JSON.stringify(receipt
          ? compactQueryReceiptForPrompt(receipt) : {
          status: "unknown",
          reason: argumentIssue || (new Set([
            NATIVE_QUERY_TOOL_NAME, NATIVE_SKILL_TOOL_NAME,
            NATIVE_MEMORY_TOOL_NAME,
          ]).has(toolName) ? "query_result_unavailable"
            : "unsupported_tool_name"),
          rulesAuthority: false,
          mutationAuthority: false,
        }),
      });
    }
    return {
      receipts,
      warnings,
      continuationMessages: [{
        role: "assistant",
        content: null,
        tool_calls: normalizedCalls,
      }, ...toolMessages],
    };
  }

  async function runJsonQueryRequests(match, input, requests, stage) {
    const allowed = new Set([
      ...NATIVE_QUERY_KINDS.filter((kind) =>
        // Both protocols use runNativeTools below. Known host-deferred
        // requests receive its typed deferred receipt, not an invented
        // unsupported-tool error; the solver still does not execute here.
        !(stage === "planning"
          && PLANNING_POST_SELECTION_QUERY_KINDS.has(kind))),
      NATIVE_SKILL_TOOL_NAME,
      ...(stage === "planning" && memoryQueryPort
        ? [NATIVE_MEMORY_TOOL_NAME] : []),
    ]);
    const bounded = requests.slice(0, maxQueriesPerRound);
    const warnings = requests.length > bounded.length
      ? ["JSON_QUERY_REQUEST_COUNT_SOFT_TRUNCATED"] : [];
    const permitted = bounded.filter((request) => {
      if (allowed.has(String(request.queryKind || ""))) return true;
      warnings.push(`JSON_QUERY_KIND_UNSUPPORTED:${request.queryKind}`);
      return false;
    });
    const syntheticTurn = { toolCalls: permitted.map((request, index) => {
      const queryKind = String(request.queryKind || "");
      const retrieval = [NATIVE_SKILL_TOOL_NAME,
        NATIVE_MEMORY_TOOL_NAME].includes(queryKind);
      return {
        callId: `json-query-${index + 1}`,
        name: retrieval ? queryKind : NATIVE_QUERY_TOOL_NAME,
        arguments: retrieval ? clone(request.arguments) : {
          requestId: request.requestId,
          queryKind,
          argumentsJson: JSON.stringify(request.arguments),
        },
      };
    }) };
    const result = await runNativeToolCalls(match, input, syntheticTurn);
    return { receipts: result.receipts,
      warnings: [...warnings, ...result.warnings] };
  }

  function providerTrace(match, choice, notificationThresholds = []) {
    const attempts = choice.attemptKeys.map((key) => choice.attempts[key]);
    const used = attempts.reduce((sum, entry) => ({
      inputUnits: sum.inputUnits + Number(entry.usage?.inputUnits || 0),
      outputUnits: sum.outputUnits + Number(entry.usage?.outputUnits || 0),
      totalUnits: sum.totalUnits + Number(entry.usage?.totalUnits || 0),
    }), { inputUnits: 0, outputUnits: 0, totalUnits: 0 });
    return freeze({
      agentVersion: STARCRAFT_TMG_LIVE_FLASH_DECISION_PORT_VERSION,
      promptPolicyVersion: promptPolicyVersion(interactionMode(
        match.providerInteractionMode)),
      providerInteractionMode: interactionMode(match.providerInteractionMode),
      terminalSubmissionProtocol: interactionMode(match.providerInteractionMode)
        === "native_tools" ? "strict_function_tool_required"
        : "json_channel_terminal_required",
      providerCalls: choice.attemptKeys.length,
      paidProviderUsed: used.totalUnits > 0,
      providerId: match.selectedProfile.providerId,
      requestedModel: match.selectedProfile.model,
      reportedModels: [...new Set(attempts.map((entry) => entry.reportedModel)
        .filter(Boolean))],
      profileRef: clone(match.selectedProfile.profileRef),
      inputUnits: used.inputUnits,
      outputUnits: used.outputUnits,
      totalUnits: used.totalUnits,
      matchEstimatedCostCnyMicros: match.usage.estimatedCostCnyMicros,
      notificationThresholdsCrossed: clone(notificationThresholds),
      queryRoundCount: choice.queryRounds,
      querySafetyCeilings: {
        planning: maxPlanningQueryRounds,
        action: maxActionQueryRounds,
      },
      querySafetyCeilingReached: choice.warnings.includes(
        "QUERY_SAFETY_CEILING_REACHED_TERMINAL_FORCED"),
      proposalValidationRoundCount: choice.proposalValidationRounds || 0,
      semanticCorrectionRoundCount: choice.semanticCorrectionRounds || 0,
      toolArgumentGrammarRecoveryCount: attempts.reduce((count, entry) =>
        count + (entry.safeOutput?.providerTurn?.toolCalls || [])
          .filter((call) => object(call?.argumentRecovery)).length, 0),
      terminalFormatRepairRoundCount: (choice.warnings || []).filter((warning) =>
        String(warning).startsWith(
          "SEMANTIC_CORRECTION_REQUIRED:TERMINAL_TOOL_SUBMISSION_INVALID:"))
        .length,
      planningProviderCalls: attempts.filter((entry) =>
        entry.stage === "planning").length,
      actionProviderCalls: attempts.filter((entry) =>
        entry.stage === "action").length,
      plannerLedDecision: Boolean(choice.plannerResult),
      queryReceiptCount: choice.queryReceipts.length,
      nativeToolContinuationUsed:
        (choice.providerContinuationMessages || []).length > 0,
      warnings: clone(choice.warnings),
      modelFrozenAtMatchOpen: true,
      fallbackAllowedAfterMatchOpen: false,
      hiddenChainOfThoughtStored: false,
      trainingTruth: false,
    });
  }

  function promptPolicyObservation(match, choice, decision, input) {
    const prior = Object.values(match.decisions || {}).filter((entry) =>
      entry.choiceKey !== choice.choiceKey
        && entry.status === "completed"
        && entry.completedDecision?.providerTrace?.paidProviderUsed === true)
      .sort((left, right) => String(left.completedAt || "")
        .localeCompare(String(right.completedAt || ""))).slice(-5);
    const priorTraces = prior.map((entry) => entry.completedDecision.providerTrace);
    const average = (values) => values.length
      ? Math.round(values.reduce((sum, value) => sum + Number(value || 0), 0)
        / values.length) : null;
    const comparisons = decision.plannerResult?.candidateComparisons || [];
    const comparisonIds = new Set(comparisons.map((entry) => entry.candidateId));
    const pass = choice.actionIndex.find((entry) =>
      entry.action?.actionType === "pass");
    const opponentResponses = decision.intent?.predictedOpponentResponses || [];
    const placementRequired = Boolean(decision.formationSelection
      || decision.assetPlacementSelection);
    const unresolvedNeededEvidence = (decision.plannerResult?.informationNeeds
      || []).filter((entry) => entry.status === "needed");
    const terminalForced = choice.warnings.includes(
      "QUERY_SAFETY_CEILING_REACHED_TERMINAL_FORCED");
    const signals = [];
    if (!String(decision.assessment?.currentGoal || "").trim()
      || !String(decision.intent?.planContinuity || "").trim()) {
      signals.push("plan_continuity_missing");
    }
    if (choice.actionIndex.length > 1
      && !comparisonIds.has(decision.candidateId)) {
      signals.push("selected_candidate_not_compared");
    }
    if (pass && choice.actionIndex.length > 1
      && !comparisonIds.has(pass.id)) {
      signals.push("pass_opportunity_cost_not_compared");
    }
    if (!(decision.publicDecisionSummary?.skillRefs || []).length) {
      signals.push("strategy_skill_grounding_missing");
    }
    if (!opponentResponses.length || opponentResponses.some((entry) =>
      !String(entry.counterResponse || "").trim()
        || !String(entry.counterPurpose || "").trim())) {
      signals.push("opponent_counterplan_missing");
    }
    if (decision.lifecycleAssessment?.currentPhase
      !== String(input.roomProjection?.state?.phase || "")) {
      signals.push("lifecycle_phase_drift");
    }
    if (placementRequired && !(decision.placementRationales || []).length) {
      signals.push("placement_strategy_reason_missing");
    }
    if (terminalForced && unresolvedNeededEvidence.length) {
      signals.push("terminal_forced_with_unresolved_needed_evidence");
    }
    const currentTrace = decision.providerTrace || {};
    const previousPolicyVersion = prior.at(-1)?.completedDecision
      ?.providerTrace?.promptPolicyVersion || (prior.length
        ? "legacy_chat_json_object" : null);
    return freeze({
      schemaVersion:
        `${STARCRAFT_TMG_LIVE_FLASH_DECISION_PORT_VERSION}.prompt-policy-observation`,
      promptPolicyVersion: promptPolicyVersion(interactionMode(
        match.providerInteractionMode)),
      previousPolicyVersion,
      policyChanged: previousPolicyVersion !== null
        && previousPolicyVersion !== promptPolicyVersion(interactionMode(
          match.providerInteractionMode)),
      strategyStatus: signals.length
        ? "review_required" : "no_observed_negative_strategy_effect",
      strategyRegressionSignals: signals,
      strategyEvidence: {
        planContinuityPresent: !signals.includes("plan_continuity_missing"),
        selectedCandidateCompared:
          comparisonIds.has(decision.candidateId),
        passComparedWhenApplicable: !pass || choice.actionIndex.length < 2
          || comparisonIds.has(pass.id),
        strategySkillReferenceCount:
          decision.publicDecisionSummary?.skillRefs?.length || 0,
        opponentCounterplanCount: opponentResponses.length,
        placementReasonCount: decision.placementRationales?.length || 0,
        exactQueryEvidenceCount: (decision.publicDecisionSummary
          ?.queryReceiptRefs || []).filter((entry) => entry.status === "exact").length,
        terminalSubmissionForced: terminalForced,
        unresolvedNeededEvidenceCount: unresolvedNeededEvidence.length,
      },
      performance: {
        baselineDecisionCount: priorTraces.length,
        currentProviderCalls: Number(currentTrace.providerCalls || 0),
        baselineAverageProviderCalls: average(priorTraces.map((entry) =>
          entry.providerCalls)),
        currentTotalUnits: Number(currentTrace.totalUnits || 0),
        baselineAverageTotalUnits: average(priorTraces.map((entry) =>
          entry.totalUnits)),
        currentSemanticCorrections:
          Number(currentTrace.semanticCorrectionRoundCount || 0),
        baselineAverageSemanticCorrections: average(priorTraces.map((entry) =>
          entry.semanticCorrectionRoundCount)),
        currentQueryRounds: Number(currentTrace.queryRoundCount || 0),
        baselineAverageQueryRounds: average(priorTraces.map((entry) =>
          entry.queryRoundCount)),
      },
      blocksApply: false,
      reviewSeverity: signals.length ? "Medium" : null,
      hiddenChainOfThoughtStored: false,
      trainingTruth: false,
    });
  }

  async function recordSemanticCorrection(match, choice, attempt, error) {
    const correction = String(error?.correction || error?.code
      || "DECISION_SEMANTIC_CORRECTION_REQUIRED").slice(0, 1_000);
    const failureSignature = hashStarcraftTmgContract({
      stage: attempt.stage,
      outputHash: attempt.outputHash
        || hashStarcraftTmgContract(attempt.safeOutput),
      correction,
    });
    match = await commitChoice(match, choice.choiceKey, (draft) => {
      const current = draft.decisions[choice.choiceKey];
      const storedAttempt = current.attempts[attempt.attemptKey];
      if (attempt.stage === "planning") {
        storedAttempt.localPlannerSemanticReplayVersion =
          PLANNER_SHAPE_NORMALIZATION_VERSION;
      } else {
        storedAttempt.localSemanticReplayVersion =
          ACTION_SHAPE_NORMALIZATION_VERSION;
      }
      current.semanticCorrectionRounds =
        Number(current.semanticCorrectionRounds || 0) + 1;
      current.stageCorrectionRounds =
        Number(current.stageCorrectionRounds || 0) + 1;
      current.repeatedSemanticFailureCount =
        current.lastSemanticFailureSignature === failureSignature
          ? Number(current.repeatedSemanticFailureCount || 0) + 1 : 1;
      current.lastSemanticFailureSignature = failureSignature;
      current.terminalFormatRepairPending =
        correction.startsWith("TERMINAL_TOOL_SUBMISSION_INVALID:");
      if (!current.processedAttemptKeys.includes(attempt.attemptKey)) {
        current.processedAttemptKeys.push(attempt.attemptKey);
      }
      current.warnings.push(`SEMANTIC_CORRECTION_REQUIRED:${correction}`);
      const invalidJsonTurn = attempt.safeOutput?.providerTurn?.kind
        === "invalid_json" ? attempt.safeOutput.providerTurn : null;
      const terminalSubmission = responseParts(attempt.safeOutput).terminal;
      if (!terminalSubmission) {
        const priorOutput = invalidJsonTurn
          ? String(invalidJsonTurn.content || "")
          : JSON.stringify(attempt.safeOutput);
        current.providerContinuationMessages.push({
          role: "assistant",
          content: priorOutput.length <= 16 * 1024 ? priorOutput : JSON.stringify({
            previousOutputHash: hashStarcraftTmgContract(attempt.safeOutput),
            omittedOversizeOutput: true,
          }),
        });
      }
      const feedbackHistory = current.semanticCorrectionFeedbackHistory || [];
      const feedback = buildStarcraftTmgSemanticCorrectionFeedbackV1({
        stage: attempt.stage, correction,
        issues: error?.correctionIssues || [], history: feedbackHistory,
        providerInteractionMode,
      });
      current.providerContinuationMessages.push({ role: "user",
        content: JSON.stringify(feedback) });
      current.semanticCorrectionFeedbackHistory = [...feedbackHistory, {
        stage: attempt.stage, correction,
        issues: clone(feedback.current.issues),
      }];
      current.status = semanticCorrectionExhausted(current, maxSemanticCorrectionRounds)
        || current.stageCorrectionRounds >= maxToolRounds
        || current.repeatedSemanticFailureCount >= 2
        ? "provider_output_invalid" : "generating";
    });
    const current = match.decisions[choice.choiceKey];
    return {
      match,
      exhausted: semanticCorrectionExhausted(current, maxSemanticCorrectionRounds)
        || current.stageCorrectionRounds >= maxToolRounds
        || current.repeatedSemanticFailureCount >= 2,
      correction,
    };
  }

  async function completeCurrentSingleton(match, input, choice,
    notificationThresholds = []) {
    const currentInput = decisionInputForChoice(input, choice);
    const forcedSingleton = resolveStarcraftTmgDeterministicSingletonActionV1(
      actionIndex(currentInput.spatialActionSpace));
    if (!forcedSingleton) return null;
    const actionType = forcedSingleton.selected.action?.actionType
      || "rules continuation";
    const excludedCount = Number(choice.unavailableCandidateIds?.length || 0);
    const trace = providerTrace(match, choice, notificationThresholds);
    const decision = normalizeDecision({
      proposal: clone(forcedSingleton.proposal),
      selectedReason: excludedCount > 0
        ? `Host verified ${excludedCount} current candidate(s) unavailable; ${
          actionType} is the only remaining fully bound Rules continuation.`
        : `Rules exposes exactly one fully bound continuation (${actionType}); no strategic model choice exists.`,
      scoreOrPositionValue:
        "Preserves the authoritative lifecycle and reaches the next real decision point.",
      risk: "No alternative current legal action exists.",
      publicDecisionSummary: {
        visibleFacts: [excludedCount > 0
          ? "The Host ruled out the other current candidates using exact Rules query receipts; one fully bound candidate remains."
          : "Current ActionSpace contains one action and every required parameter has exactly one Rules-owned value."],
        plan: "Advance the Rules-owned lifecycle without a further model call.",
      },
    }, currentInput, match, choice.queryReceipts, freeze({
      ...clone(trace), deterministicHostStep: true,
      deterministicParameterBinding: forcedSingleton.parameterBinding,
    }));
    const updated = await commitChoice(match, choice.choiceKey, (draft) => {
      const current = draft.decisions[choice.choiceKey];
      current.status = "completed";
      current.completedDecision = clone(decision);
      current.completedAt = instant(now(), "now");
    });
    return freeze({ match: updated, decision: freeze({ ...clone(decision),
      ok: true, idempotentReplay: false, choiceKey: choice.choiceKey }) });
  }

  async function generate(match, input, choice) {
    const crossed = [];
    while (true) {
      choice = match.decisions[choice.choiceKey];
      const selectedEffectRecovery = planStarcraftTmgSelectedEffectPlannerRecoveryV1(
        choice, input, { retryApproved: input.retryApproved,
          promptPolicyVersion: promptPolicyVersion(interactionMode(match.providerInteractionMode)) });
      if (selectedEffectRecovery) {
        match = await commitChoice(match, choice.choiceKey, draft => {
          applyStarcraftTmgSelectedEffectPlannerRecoveryV1(
            draft.decisions[choice.choiceKey], selectedEffectRecovery, instant(now(), "now"));
        });
        choice = match.decisions[choice.choiceKey];
      }
      const supersededActionRepair = planStarcraftTmgSupersededActionReplayRepairV1(
        choice, input, { retryApproved: input.retryApproved });
      if (supersededActionRepair) {
        match = await commitChoice(match, choice.choiceKey, draft => {
          applyStarcraftTmgSupersededActionReplayRepairV1(
            draft.decisions[choice.choiceKey], supersededActionRepair, instant(now(), "now"));
        });
        choice = match.decisions[choice.choiceKey];
      }
      const correctionContextRepair = planStarcraftTmgActionCorrectionContextRepairV1(
        choice, input, { retryApproved: input.retryApproved,
          providerInteractionMode: interactionMode(match.providerInteractionMode) });
      if (correctionContextRepair) {
        match = await commitChoice(match, choice.choiceKey, draft => {
          applyStarcraftTmgActionCorrectionContextRepairV1(
            draft.decisions[choice.choiceKey], correctionContextRepair, instant(now(), "now"));
        });
        choice = match.decisions[choice.choiceKey];
      }
      const legacyParameterReplan = planStarcraftTmgLegacyParameterReplanV1(choice, {
        retryApproved: input.retryApproved,
        authority: currentAuthority(input, match.scope),
        promptPolicyVersion: promptPolicyVersion(interactionMode(match.providerInteractionMode)),
        maximumRounds: maxToolRounds,
        submissions: choice.status === "provider_output_invalid"
          ? choice.attemptKeys.flatMap(attemptKey => {
            const stored = choice.attempts?.[attemptKey];
            if (stored?.status !== "completed" || stored.stage !== "action"
              || !choice.processedAttemptKeys.includes(attemptKey)) return [];
            const decision = responseParts(stored.safeOutput).decision;
            if (decision?.selection?.kind !== "parameters"
              || typeof decision.selection.parametersJson !== "string") return [];
            try {
              return [{ attemptKey, outputHash: stored.outputHash,
                promptPolicyVersion: stored.promptPolicyVersion,
                candidateId: decision.candidateId,
                parameters: JSON.parse(decision.selection.parametersJson) }];
            } catch { return []; }
          }) : [],
      });
      if (legacyParameterReplan) {
        match = await commitChoice(match, choice.choiceKey, draft => {
          applyStarcraftTmgLegacyParameterReplanV1(draft.decisions[choice.choiceKey],
            legacyParameterReplan, instant(now(), "now"));
        });
        continue;
      }
      const capacityRecovery = planStarcraftTmgOutputCapacityRecoveryV1(choice, {
        baselineOutputUnits: match.selectedProfile.maxOutputUnits,
        requestOutputLimit: requestOutputLimit ?? match.selectedProfile.maxOutputUnits,
        retryApproved: input.retryApproved,
      });
      if (capacityRecovery) {
        match = await commitChoice(match, choice.choiceKey, (draft) => {
          const current = draft.decisions[choice.choiceKey];
          current.outputCapacityRecoveries ||= [];
          current.outputCapacityRecoveries.push({ ...capacityRecovery,
            recordedAt: instant(now(), "now") });
          current.warnings.push(`EXPLICIT_OUTPUT_CAPACITY_RECOVERY:${
            capacityRecovery.evidenceKind}:${capacityRecovery.requestOutputLimit}`);
        });
        choice = match.decisions[choice.choiceKey];
      }
      const parentContactRecovery = planStarcraftTmgParentContactSearchRecoveryV1(choice, {
        retryApproved: input.retryApproved,
        authority: currentAuthority(input, match.scope),
        submittedPlanningByAttemptKey: Object.fromEntries(choice.attemptKeys.map(key =>
          [key, responseParts(choice.attempts[key]?.safeOutput).planning])),
      });
      if (parentContactRecovery) {
        const queried = await runQueries(input, [parentContactRecovery.request]);
        const receipt = queried.receipts.find(entry =>
          entry.queryKind === "legal_asset_placement_options") || null;
        const eligible = clone(choice);
        eligible.unavailableCandidateIds = eligible.unavailableCandidateIds
          .filter(id => id !== parentContactRecovery.candidateId);
        if (receipt) eligible.queryReceipts.push(receipt);
        const replayAttemptKey = receipt?.status === "exact"
          && receipt.result?.domainId === parentContactRecovery.candidateId
          && receipt.result.placementOptions?.length > 0
          ? selectStarcraftTmgPlannerLocalReplayAttemptV1(eligible, input, {
            eligibleAlreadyRevalidatedAttemptKeys: parentContactRecovery.candidateAttemptKeys,
            onlyValid: true,
          }) : null;
        match = await commitChoice(match, choice.choiceKey, draft => {
          const current = draft.decisions[choice.choiceKey];
          applyStarcraftTmgParentContactSearchRecoveryV1(current, parentContactRecovery,
            { receipt, replayAttemptKey, recordedAt: instant(now(), "now") });
          current.warnings.push(...queried.warnings);
        });
        choice = match.decisions[choice.choiceKey];
      }
      const failedContactRecovery = choice.parentContactSearchRecoveries?.find(entry =>
        entry.version === STARCRAFT_TMG_PARENT_CONTACT_SEARCH_RECOVERY_VERSION
          && entry.recovered === false);
      if (failedContactRecovery) {
        return rejection("LIVE_DECISION_PARENT_CONTACT_SEARCH_RECOVERY_FAILED", "High", {
          choiceKey: choice.choiceKey, reason: failedContactRecovery.reason,
          automaticProviderRetryPerformed: false, projection: publicProjection(match),
        });
      }
      const lastKey = choice.attemptKeys.at(-1);
      let attempt = lastKey ? choice.attempts?.[lastKey] : null;
      const formationRecovery =
        planStarcraftTmgUnavailableFormationRecoveryV1(choice, {
          retryApproved: input.retryApproved,
          authority: currentAuthority(input, match.scope),
        });
      if (formationRecovery) {
        match = await commitChoice(match, choice.choiceKey, (draft) => {
          const current = draft.decisions[choice.choiceKey];
          current.unavailableCandidateIds = current.unavailableCandidateIds
            .filter((id) => id !== formationRecovery.candidateId);
          current.processedAttemptKeys = current.processedAttemptKeys
            .filter((key) => key !== formationRecovery.attemptKey);
          // Later empty/error drafts cannot replace the paid intention that
          // requested this failed search. The existing same-authority Planner
          // normalizer revalidates this exact draft before any new query/action.
          current.pendingSearchRecoveryPlannerAttemptKey =
            formationRecovery.attemptKey;
          current.status = "generating";
          current.stageQueryRounds = 0;
          current.stageCorrectionRounds = 0;
          current.lastSemanticFailureSignature = null;
          current.repeatedSemanticFailureCount = 0;
          current.warnings.push(formationRecovery.warning);
        });
        continue;
      }
      const stoppedForCapacity = attempt?.safeOutput?.providerTurn;
      const truncatedPromptRepair = planStarcraftTmgPromptRepairRecoveryV1(choice, {
        retryApproved: input.retryApproved,
        promptPolicyVersion: promptPolicyVersion(interactionMode(
          match.providerInteractionMode)),
        effectiveSemanticCorrectionRounds:
          effectiveStarcraftTmgSemanticCorrectionsV1(choice),
        maxSemanticCorrectionRounds,
      });
      if (choice.status === "provider_output_invalid"
        && (stoppedForCapacity?.finishReason === "length"
          || stoppedForCapacity?.issue === "output_truncated")
        && !truncatedPromptRepair
        && (requestOutputLimit ?? match.selectedProfile.maxOutputUnits)
          <= Number(attempt.requestedMaxOutputUnits
            ?? match.selectedProfile.maxOutputUnits)) {
        return rejection("LIVE_DECISION_PROVIDER_OUTPUT_TRUNCATED", "High", {
          choiceKey: choice.choiceKey, requiresLargerOutputCapacity: true,
          automaticProviderRetryPerformed: false, projection: publicProjection(match),
        });
      }
      const interruptedLocalReplay = choice.status === "generating"
        && attempt?.status !== "completed"
        && choice.warnings.includes(`LOCAL_COMPLETED_OUTPUT_REVALIDATION:${
          ACTION_SHAPE_NORMALIZATION_VERSION}`);
      const interruptedPlannerReplay = choice.status === "generating"
        && !choice.plannerResult
        && attempt?.status !== "completed"
        && choice.warnings.includes(`LOCAL_PLANNER_OUTPUT_REVALIDATION:${
          PLANNER_SHAPE_NORMALIZATION_VERSION}`);
      const normalizationUpgradePending = choice.status === "generating"
        && choice.plannerResult
        && attempt?.status === "completed"
        && choice.processedAttemptKeys.includes(attempt.attemptKey)
        && attempt.localSemanticReplayVersion
          !== ACTION_SHAPE_NORMALIZATION_VERSION;
      const pendingSearchReplayKey = choice.pendingSearchRecoveryPlannerAttemptKey
        ? selectStarcraftTmgPlannerLocalReplayAttemptV1(choice, input, {
          eligibleAlreadyRevalidatedAttemptKeys: [choice.pendingSearchRecoveryPlannerAttemptKey],
          onlyValid: true,
        }) : null;
      if (choice.pendingSearchRecoveryPlannerAttemptKey && !pendingSearchReplayKey) {
        return rejection("LIVE_DECISION_PARENT_CONTACT_PAID_DRAFT_INVALID", "High", {
          choiceKey: choice.choiceKey, automaticProviderRetryPerformed: false,
          projection: publicProjection(match),
        });
      }
      const replayablePlannerKey = pendingSearchReplayKey || (!choice.plannerResult
        && !shouldPreferStarcraftTmgPromptRepairOverPlannerReplayV1(choice, {
          retryApproved: input.retryApproved,
          promptPolicyVersion: promptPolicyVersion(interactionMode(
            match.providerInteractionMode)),
          effectiveSemanticCorrectionRounds:
            effectiveStarcraftTmgSemanticCorrectionsV1(choice),
          maxSemanticCorrectionRounds,
        })
        && (["provider_failed_requires_explicit_retry", "provider_output_invalid",
          "provider_call_may_have_started"]
          .includes(choice.status)
          || attempt?.status === "provider_call_may_have_started"
          || interruptedPlannerReplay)
        ? selectStarcraftTmgPlannerLocalReplayAttemptV1(choice, input) : null);
      if (replayablePlannerKey) {
        match = await commitChoice(match, choice.choiceKey, (draft) => {
          const current = draft.decisions[choice.choiceKey];
          const storedAttempt = current.attempts[replayablePlannerKey];
          if (current.pendingSearchRecoveryPlannerAttemptKey === replayablePlannerKey) {
            delete current.pendingSearchRecoveryPlannerAttemptKey;
          }
          storedAttempt.localPlannerSemanticReplayVersion =
            PLANNER_SHAPE_NORMALIZATION_VERSION;
          current.processedAttemptKeys = current.processedAttemptKeys
            .filter((key) => key !== replayablePlannerKey);
          current.providerContinuationMessages =
            current.providerContinuationMessages.filter((message) =>
              message?.role === "tool" || Array.isArray(message?.tool_calls));
          current.status = "generating";
          current.stageQueryRounds = 0;
          current.stageCorrectionRounds = 0;
          current.warnings.push(`LOCAL_PLANNER_OUTPUT_REVALIDATION:${
            PLANNER_SHAPE_NORMALIZATION_VERSION}`);
        });
        choice = match.decisions[choice.choiceKey];
        attempt = choice.attempts[replayablePlannerKey];
      }
      const replayableCompletedCandidates = choice.plannerResult
        && (["provider_failed_requires_explicit_retry", "provider_output_invalid",
          "provider_call_may_have_started"]
          .includes(choice.status)
          || attempt?.status === "provider_call_may_have_started"
          || interruptedLocalReplay || normalizationUpgradePending)
        ? [...choice.attemptKeys].reverse().flatMap((attemptKey) => {
          const candidate = choice.attempts?.[attemptKey];
          return candidate?.status === "completed"
            && object(responseParts(candidate.safeOutput).decision)
            && isStarcraftTmgActionReplayForCurrentPlannerV1(choice, attemptKey)
            && candidate.localSemanticReplayVersion
              !== ACTION_SHAPE_NORMALIZATION_VERSION
            ? [{ attemptKey, candidate }] : [];
        }) : [];
      const locallyValidReplay = replayableCompletedCandidates.find((entry) => {
        try {
          normalizeSubmittedAction(entry.candidate, input, choice);
          return true;
        } catch {
          return false;
        }
      });
      const replayableCompletedKey = locallyValidReplay?.attemptKey
        || replayableCompletedCandidates[0]?.attemptKey || null;
      if (replayableCompletedKey) {
        match = await commitChoice(match, choice.choiceKey, (draft) => {
          const current = draft.decisions[choice.choiceKey];
          const storedAttempt = current.attempts[replayableCompletedKey];
          current.localOutputRevalidationHistory ||= [];
          current.localOutputRevalidationHistory.push({
            attemptKey: replayableCompletedKey,
            previousVersion: storedAttempt.localSemanticReplayVersion || null,
            nextVersion: ACTION_SHAPE_NORMALIZATION_VERSION,
            priorProposalValidationRounds: current.proposalValidationRounds || 0,
            priorParameterRecoveryCount: current.parameterRecoveryHistory?.length || 0,
            recordedAt: instant(now(), "now"),
            paidBytesAndCostLedgerUnchanged: true,
          });
          storedAttempt.localSemanticReplayVersion =
            ACTION_SHAPE_NORMALIZATION_VERSION;
          current.processedAttemptKeys = current.processedAttemptKeys
            .filter((key) => key !== replayableCompletedKey);
          current.providerContinuationMessages =
            current.providerContinuationMessages.filter((message) =>
              message?.role === "tool" || Array.isArray(message?.tool_calls));
          current.status = "generating";
          current.stageQueryRounds = 0;
          current.stageCorrectionRounds = 0;
          current.terminalFormatRepairPending = false;
          current.lastSemanticFailureSignature = null;
          current.repeatedSemanticFailureCount = 0;
          current.warnings.push(
            `LOCAL_COMPLETED_OUTPUT_REVALIDATION:${
              ACTION_SHAPE_NORMALIZATION_VERSION}`);
        });
        choice = match.decisions[choice.choiceKey];
        attempt = choice.attempts[replayableCompletedKey];
      }
      if (attempt?.status === "completed"
        && attempt.safeOutput?.providerTurn?.kind === "invalid_json") {
        const normalized = normalizeProviderJsonDocumentV1(
          attempt.safeOutput.providerTurn.content);
        let recovered = null;
        try {
          const candidate = JSON.parse(normalized.text);
          if (object(candidate)) recovered = candidate;
        } catch {}
        if (recovered) {
          match = await commitChoice(match, choice.choiceKey, (draft) => {
            const current = draft.decisions[choice.choiceKey];
            const storedAttempt = current.attempts[attempt.attemptKey];
            storedAttempt.safeOutput = clone(recovered);
            storedAttempt.outputHash = hashStarcraftTmgContract(recovered);
            storedAttempt.localGrammarRecovery = {
              normalizationKind: normalized.kind,
              evidence: clone(normalized.evidence || null),
            };
            current.processedAttemptKeys = current.processedAttemptKeys
              .filter((key) => key !== attempt.attemptKey);
            current.providerContinuationMessages =
              current.providerContinuationMessages.filter((message) =>
                message?.role === "tool"
                || Array.isArray(message?.tool_calls));
            current.status = "generating";
            current.warnings.push(
              `LOCAL_PROVIDER_JSON_RECOVERY:${normalized.kind}`);
          });
          choice = match.decisions[choice.choiceKey];
          attempt = choice.attempts[attempt.attemptKey];
        }
      }
      if (attempt?.status === "completed"
        && choice.status === "provider_output_invalid"
        && choice.plannerResult
        && object(responseParts(attempt.safeOutput).decision)
        && isStarcraftTmgActionReplayForCurrentPlannerV1(choice, attempt.attemptKey)
        && attempt.localSemanticReplayVersion
          !== ACTION_SHAPE_NORMALIZATION_VERSION) {
        match = await commitChoice(match, choice.choiceKey, (draft) => {
          const current = draft.decisions[choice.choiceKey];
          const storedAttempt = current.attempts[attempt.attemptKey];
          storedAttempt.localSemanticReplayVersion =
            ACTION_SHAPE_NORMALIZATION_VERSION;
          current.processedAttemptKeys = current.processedAttemptKeys
            .filter((key) => key !== attempt.attemptKey);
          current.providerContinuationMessages =
            current.providerContinuationMessages.filter((message) =>
              message?.role === "tool" || Array.isArray(message?.tool_calls));
          current.status = "generating";
          current.stageQueryRounds = 0;
          current.stageCorrectionRounds = 0;
          current.lastSemanticFailureSignature = null;
          current.repeatedSemanticFailureCount = 0;
          current.proposalValidationRounds = 0;
          current.warnings.push(
            `LOCAL_PROVIDER_OUTPUT_REVALIDATION:${
              ACTION_SHAPE_NORMALIZATION_VERSION}`);
        });
        choice = match.decisions[choice.choiceKey];
        attempt = choice.attempts[attempt.attemptKey];
      }
      const stage = choice.plannerResult ? "action" : "planning";
      const queryRoundLimit = stage === "planning"
        ? maxPlanningQueryRounds : maxActionQueryRounds;
      if (attempt?.status === "provider_call_may_have_started"
        && attempt.stage && attempt.stage !== stage) {
        const supersededAttemptKey = attempt.attemptKey;
        match = await commitChoice(match, choice.choiceKey, (draft) => {
          const current = draft.decisions[choice.choiceKey];
          const storedAttempt = current.attempts[supersededAttemptKey];
          storedAttempt.status = "superseded_after_stage_recovery";
          storedAttempt.completedAt = instant(now(), "now");
          current.warnings.push(
            `PRIOR_STAGE_AMBIGUOUS_ATTEMPT_SUPERSEDED:${
              storedAttempt.stage}->${stage}:${supersededAttemptKey}`);
        });
        choice = match.decisions[choice.choiceKey];
        attempt = null;
      }
      if (attempt?.status === "provider_call_may_have_started") {
        const reconciled = await reconcileProviderCommitUnknown(
          match, choice, attempt);
        match = reconciled.match;
        choice = reconciled.choice;
        attempt = reconciled.attempt;
        crossed.push(...reconciled.thresholds);
      }
      if (attempt?.status === "provider_call_may_have_started") {
        return rejection("LIVE_DECISION_PROVIDER_COMMIT_UNKNOWN", "High", {
          choiceKey: choice.choiceKey,
          attemptKey: attempt.attemptKey,
          automaticRetryPerformed: false,
          projection: publicProjection(match),
        });
      }
      if (EXPLICIT_RETRY_CHOICE_STATUSES.has(choice.status)
        && input.retryApproved !== true) {
        return rejection("LIVE_DECISION_EXPLICIT_RETRY_REQUIRED", "High", {
          choiceKey: choice.choiceKey,
          automaticRetryPerformed: false,
          projection: publicProjection(match),
        });
      }
      const promptRepair = planStarcraftTmgPromptRepairRecoveryV1(choice, {
        retryApproved: input.retryApproved,
        promptPolicyVersion: promptPolicyVersion(interactionMode(
          match.providerInteractionMode)),
        effectiveSemanticCorrectionRounds:
          effectiveStarcraftTmgSemanticCorrectionsV1(choice),
        maxSemanticCorrectionRounds,
      });
      if (promptRepair) {
        match = await commitChoice(match, choice.choiceKey, (draft) => {
          const current = draft.decisions[choice.choiceKey];
          if (current.stage === "planning") {
            applyStarcraftTmgPlanningPromptRepairRecoveryV1(current,
              promptRepair, input, instant(now(), "now"),
              interactionMode(match.providerInteractionMode));
          } else {
            applyStarcraftTmgPromptRepairRecoveryV1(current,
              promptRepair, instant(now(), "now"));
          }
        });
        choice = match.decisions[choice.choiceKey];
        attempt = null;
      }
      if (EXPLICIT_RETRY_CHOICE_STATUSES.has(choice.status)
        && semanticCorrectionExhausted(choice, maxSemanticCorrectionRounds)) {
        return rejection("LIVE_DECISION_SEMANTIC_CORRECTION_LIMIT_REACHED",
          "High", {
            choiceKey: choice.choiceKey,
            semanticCorrectionRounds: choice.semanticCorrectionRounds,
            semanticCorrectionLimit: maxSemanticCorrectionRounds,
            automaticRetryPerformed: false,
            projection: publicProjection(match),
          });
      }
      if (choice.status === "retry_ready"
        || input.retryApproved === true
          && EXPLICIT_RETRY_CHOICE_STATUSES.has(choice.status)) {
        match = await commitChoice(match, choice.choiceKey, (draft) => {
          const current = draft.decisions[choice.choiceKey];
          current.status = "generating";
          current.stageQueryRounds = 0;
          current.stageCorrectionRounds = 0;
          current.lastSemanticFailureSignature = null;
          current.repeatedSemanticFailureCount = 0;
          current.proposalValidationRounds = 0;
          current.retryCycle = Number(current.retryCycle || 0) + 1;
          current.warnings.push(`EXPLICIT_RETRY_CYCLE:${current.retryCycle}`);
        });
        choice = match.decisions[choice.choiceKey];
        attempt = null;
      }
      if ((choice.unavailableCandidateIds || []).length > 0
        && attempt?.status !== "provider_call_may_have_started") {
        const singleton = await completeCurrentSingleton(match, input,
          choice, crossed);
        if (singleton) return singleton.decision;
      }
      if (stage === "action") {
        const selected = actionIndex(input.spatialActionSpace).find((entry) =>
          entry.id === choice.plannerResult.recommendedCandidateId);
        const actionType = String(selected?.action?.actionType || "");
        if (!isStarcraftTmgFormationIntentReadyV1(selected,
          choice.plannerResult)) {
          // A persisted Planner result may predate a new spatial action
          // family. Never turn that absent intention into a balanced fallback.
          match = await commitChoice(match, choice.choiceKey, (draft) => {
            const current = draft.decisions[choice.choiceKey];
            current.queryReceipts = current.queryReceipts.filter((entry) =>
              !(FORMATION_QUERY_KINDS.has(entry.queryKind)
                && entry.result?.domainId === selected.id));
            if (attempt?.status === "completed"
              && !current.processedAttemptKeys.includes(attempt.attemptKey)) {
              current.processedAttemptKeys.push(attempt.attemptKey);
            }
            current.stage = "planning";
            current.plannerResult = null;
            current.providerContinuationMessages = [];
            current.stageQueryRounds = 0;
            current.stageCorrectionRounds = 0;
            current.lastSemanticFailureSignature = null;
            current.repeatedSemanticFailureCount = 0;
            current.proposalValidationRounds = 0;
            current.warnings.push(
              `HOST_PERSISTED_FORMATION_INTENT_MISSING_REPLAN:${selected.id}`);
            current.status = "generating";
          });
          choice = match.decisions[choice.choiceKey];
          continue;
        }
        if (selected?.kind === "parameterized"
          && isFormationPlacementDomain(selected.action)
          && !exactFormationReceipt(choice.queryReceipts, selected.id)) {
          const searchRequest = choice.plannerResult.formationSearchRequest || {};
          const formationQuery = await runQueries(input, [{
            requestId: `host-required-formation-${choice.choiceKey}`,
            queryKind: STARCRAFT_TMG_FORMATION_SOLVER_TOOL_NAME,
            arguments: {
              domainId: selected.id,
              maximumOptions: Number(searchRequest.maximumOptions || 4),
              ...(object(searchRequest.preferredAnchor) ? {
                preferredAnchor: clone(searchRequest.preferredAnchor),
              } : {}),
              tacticalPurpose: String(searchRequest.tacticalPurpose || ""),
              formationObjectives: clone(searchRequest.formationObjectives || []),
            },
          }]);
          const receipt = formationQuery.receipts.find((entry) =>
            FORMATION_QUERY_KINDS.has(entry.queryKind)) || null;
          if (receipt?.status !== "exact"
            || !Array.isArray(receipt?.result?.formationOptions)
            || receipt.result.formationOptions.length < 1) {
            match = await commitChoice(match, choice.choiceKey, (draft) => {
              const current = draft.decisions[choice.choiceKey];
              current.unavailableCandidateIds = [...new Set([
                ...(current.unavailableCandidateIds || []), selected.id,
              ])];
              const known = new Set(current.queryReceipts.map((entry) =>
                entry.queryReceiptHash));
              for (const entry of formationQuery.receipts) {
                if (!known.has(entry.queryReceiptHash)) {
                  known.add(entry.queryReceiptHash);
                  current.queryReceipts.push(entry);
                }
              }
              if (attempt?.status === "completed"
                && !current.processedAttemptKeys.includes(attempt.attemptKey)) {
                current.processedAttemptKeys.push(attempt.attemptKey);
              }
              current.queryRounds += 1;
              current.stage = "planning";
              current.plannerResult = null;
              current.providerContinuationMessages = [];
              current.stageQueryRounds = 0;
              current.stageCorrectionRounds = 0;
              current.lastSemanticFailureSignature = null;
              current.repeatedSemanticFailureCount = 0;
              current.proposalValidationRounds = 0;
              current.warnings.push(...formationQuery.warnings,
                `HOST_CANDIDATE_UNAVAILABLE:${selected.id}:${
                  receipt?.reason || "formation_receipt_missing"}`);
              current.status = "generating";
            });
            choice = match.decisions[choice.choiceKey];
            if (actionIndex(decisionInputForChoice(input, choice)
              .spatialActionSpace).length < 1) {
              return rejection(
                "LIVE_DECISION_ALL_CURRENT_CANDIDATES_UNAVAILABLE", "High", {
                  choiceKey: choice.choiceKey,
                  unavailableCandidateIds: choice.unavailableCandidateIds,
                  automaticProviderRetryPerformed: false,
                  projection: publicProjection(match),
                });
            }
            continue;
          }
          match = await commitChoice(match, choice.choiceKey, (draft) => {
            const current = draft.decisions[choice.choiceKey];
            const known = new Set(current.queryReceipts.map((entry) =>
              entry.queryReceiptHash));
            for (const entry of formationQuery.receipts) {
              if (!known.has(entry.queryReceiptHash)) {
                known.add(entry.queryReceiptHash);
                current.queryReceipts.push(entry);
              }
            }
            if (attempt?.status === "completed"
              && !current.processedAttemptKeys.includes(attempt.attemptKey)) {
              current.processedAttemptKeys.push(attempt.attemptKey);
            }
            current.queryRounds += 1;
            current.warnings.push(...formationQuery.warnings,
              `HOST_REQUIRED_FORMATION_OPTIONS_READY:${
                receipt.result.formationOptions.length}`);
            current.status = "generating";
          });
          continue;
        }
        if (selected?.kind === "parameterized"
          && isAssetPlacementDomain(selected.action)
          && !exactAssetPlacementReceipt(choice.queryReceipts, selected.id)) {
          const searchRequest = choice.plannerResult
            .assetPlacementSearchRequest || {};
          const placementQuery = await runQueries(input, [{
            requestId: `host-required-asset-placement-${choice.choiceKey}`,
            queryKind: "legal_asset_placement_options",
            arguments: {
              domainId: selected.id,
              maximumOptions: Number(searchRequest.maximumOptions || 4),
              ...(object(searchRequest.preferredAnchor) ? {
                preferredAnchor: clone(searchRequest.preferredAnchor),
              } : {}),
              tacticalPurpose: String(searchRequest.tacticalPurpose || ""),
            },
          }]);
          const receipt = placementQuery.receipts.find((entry) =>
            entry.queryKind === "legal_asset_placement_options") || null;
          if (receipt?.status !== "exact"
            || !Array.isArray(receipt?.result?.placementOptions)
            || receipt.result.placementOptions.length < 1) {
            match = await commitChoice(match, choice.choiceKey, (draft) => {
              const current = draft.decisions[choice.choiceKey];
              current.unavailableCandidateIds = [...new Set([
                ...(current.unavailableCandidateIds || []), selected.id,
              ])];
              const known = new Set(current.queryReceipts.map((entry) =>
                entry.queryReceiptHash));
              for (const entry of placementQuery.receipts) {
                if (!known.has(entry.queryReceiptHash)) {
                  known.add(entry.queryReceiptHash);
                  current.queryReceipts.push(entry);
                }
              }
              if (attempt?.status === "completed"
                && !current.processedAttemptKeys.includes(attempt.attemptKey)) {
                current.processedAttemptKeys.push(attempt.attemptKey);
              }
              current.queryRounds += 1;
              current.stage = "planning";
              current.plannerResult = null;
              current.providerContinuationMessages = [];
              current.stageQueryRounds = 0;
              current.stageCorrectionRounds = 0;
              current.lastSemanticFailureSignature = null;
              current.repeatedSemanticFailureCount = 0;
              current.proposalValidationRounds = 0;
              current.warnings.push(...placementQuery.warnings,
                `HOST_CANDIDATE_UNAVAILABLE:${selected.id}:${
                  receipt?.reason || "asset_placement_receipt_missing"}`);
              current.status = "generating";
            });
            choice = match.decisions[choice.choiceKey];
            if (actionIndex(decisionInputForChoice(input, choice)
              .spatialActionSpace).length < 1) {
              return rejection(
                "LIVE_DECISION_ALL_CURRENT_CANDIDATES_UNAVAILABLE", "High", {
                  choiceKey: choice.choiceKey,
                  unavailableCandidateIds: choice.unavailableCandidateIds,
                  automaticProviderRetryPerformed: false,
                  projection: publicProjection(match),
                });
            }
            continue;
          }
          match = await commitChoice(match, choice.choiceKey, (draft) => {
            const current = draft.decisions[choice.choiceKey];
            const known = new Set(current.queryReceipts.map((entry) =>
              entry.queryReceiptHash));
            for (const entry of placementQuery.receipts) {
              if (!known.has(entry.queryReceiptHash)) {
                known.add(entry.queryReceiptHash);
                current.queryReceipts.push(entry);
              }
            }
            if (attempt?.status === "completed"
              && !current.processedAttemptKeys.includes(attempt.attemptKey)) {
              current.processedAttemptKeys.push(attempt.attemptKey);
            }
            current.queryRounds += 1;
            current.warnings.push(...placementQuery.warnings,
              `HOST_REQUIRED_ASSET_PLACEMENT_OPTIONS_READY:${
                receipt.result.placementOptions.length}`);
            current.status = "generating";
          });
          continue;
        }
      }
      const needsCall = !attempt || attempt.status !== "completed"
        || choice.processedAttemptKeys.includes(attempt.attemptKey);
      if (needsCall) {
        try {
          const result = await providerCall(match, input, choice, stage);
          match = result.match;
          crossed.push(...result.thresholds);
          choice = match.decisions[choice.choiceKey];
          attempt = result.attempt;
        } catch (error) {
          const current = error?.match || match;
          return rejection(error?.code || "LIVE_DECISION_PROVIDER_FAILED",
            error?.severity || "Medium", {
              choiceKey: choice.choiceKey,
              automaticRetryPerformed: false,
              projection: publicProjection(current),
            });
        }
      }
      const nativeTurn = attempt.safeOutput?.providerTurn;
      const parts = responseParts(attempt.safeOutput);
      if (nativeTurn?.finishReason === "length"
        || nativeTurn?.issue === "output_truncated"
        || parts.terminal?.issue === "output_truncated") {
        match = await commitChoice(match, choice.choiceKey, (draft) => {
          const current = draft.decisions[choice.choiceKey];
          current.status = "provider_output_invalid";
          current.terminalFormatRepairPending = true;
          if (!current.processedAttemptKeys.includes(attempt.attemptKey)) {
            current.processedAttemptKeys.push(attempt.attemptKey);
          }
          current.warnings.push(`PROVIDER_OUTPUT_TRUNCATED:${attempt.attemptKey}`);
        });
        return rejection("LIVE_DECISION_PROVIDER_OUTPUT_TRUNCATED", "High", {
          choiceKey: choice.choiceKey,
          requestedMaxOutputUnits: attempt.requestedMaxOutputUnits,
          automaticProviderRetryPerformed: false,
          projection: publicProjection(match),
        });
      }
      if (parts.terminal?.issue) {
        const correction = await recordSemanticCorrection(match, choice,
          attempt, correctionError("TERMINAL_TOOL_SUBMISSION_INVALID",
            parts.terminal.issue));
        match = correction.match;
        if (correction.exhausted) {
          return rejection("LIVE_DECISION_TERMINAL_TOOL_INVALID", "High", {
            choiceKey: choice.choiceKey,
            automaticProviderRetryPerformed: false,
            projection: publicProjection(match),
          });
        }
        continue;
      }
      const expectedTerminalName = stage === "planning"
        ? NATIVE_PLANNING_SUBMIT_TOOL_NAME : NATIVE_DECISION_SUBMIT_TOOL_NAME;
      if (parts.terminal && parts.terminal.name !== expectedTerminalName) {
        const correction = await recordSemanticCorrection(match, choice,
          attempt, correctionError("TERMINAL_TOOL_STAGE_MISMATCH",
            `${parts.terminal.name}->${expectedTerminalName}`));
        match = correction.match;
        if (!correction.exhausted) continue;
        return rejection("LIVE_DECISION_TERMINAL_TOOL_INVALID", "High", {
          choiceKey: choice.choiceKey,
          automaticProviderRetryPerformed: false,
          projection: publicProjection(match),
        });
      }
      if (nativeTurn?.kind === "tool_calls" && !parts.terminal) {
        if (choice.stageQueryRounds >= queryRoundLimit) {
          if (attempt.terminalSubmissionForced === true) {
            const correction = await recordSemanticCorrection(match, choice,
              attempt, correctionError(
                "QUERY_AFTER_SAFETY_CEILING_TERMINAL_REQUIRED"));
            match = correction.match;
            if (correction.exhausted) {
              return rejection(
                "LIVE_DECISION_NATIVE_TOOL_LOOP_DID_NOT_CONVERGE", "High", {
                  choiceKey: choice.choiceKey,
                  queryRounds: choice.stageQueryRounds,
                  automaticProviderRetryPerformed: true,
                  projection: publicProjection(match),
                });
            }
            continue;
          }
          match = await commitChoice(match, choice.choiceKey, (draft) => {
            const current = draft.decisions[choice.choiceKey];
            if (!current.processedAttemptKeys.includes(attempt.attemptKey)) {
              current.processedAttemptKeys.push(attempt.attemptKey);
            }
            current.warnings.push(
              "QUERY_SAFETY_CEILING_REACHED_TERMINAL_FORCED");
            current.status = "generating";
          });
          continue;
        }
        const toolResult = await runNativeToolCalls(match, input, nativeTurn);
        match = await commitChoice(match, choice.choiceKey, (draft) => {
          const current = draft.decisions[choice.choiceKey];
          if (!current.processedAttemptKeys.includes(attempt.attemptKey)) {
            current.processedAttemptKeys.push(attempt.attemptKey);
          }
          current.queryRounds += 1;
          current.stageQueryRounds += 1;
          current.providerContinuationMessages.push(
            ...clone(toolResult.continuationMessages));
          const known = new Set(current.queryReceipts.map((entry) =>
            entry.queryReceiptHash));
          for (const receipt of toolResult.receipts) {
            if (!known.has(receipt.queryReceiptHash)) {
              known.add(receipt.queryReceiptHash);
              current.queryReceipts.push(receipt);
            }
          }
          current.warnings.push(...toolResult.warnings);
          current.status = "generating";
        });
        continue;
      }
      if (nativeTurn?.kind === "invalid_json") {
        const correction = await recordSemanticCorrection(match, choice,
          attempt, correctionError("PROVIDER_JSON_FORMAT_CORRECTION_REQUIRED",
            String(nativeTurn.issue || "response_json_invalid")));
        match = correction.match;
        if (correction.exhausted) {
          return rejection("LIVE_DECISION_PROVIDER_OUTPUT_INVALID", "High", {
            choiceKey: choice.choiceKey,
            automaticProviderRetryPerformed: false,
            projection: publicProjection(match),
          });
        }
        continue;
      }
      if (parts.queries.length && choice.stageQueryRounds < queryRoundLimit) {
        if (attempt.terminalSubmissionForced === true) {
          const correction = await recordSemanticCorrection(match, choice,
            attempt, correctionError(
              "QUERY_AFTER_NO_NEW_EVIDENCE_TERMINAL_REQUIRED"));
          match = correction.match;
          if (correction.exhausted) {
            return rejection("LIVE_DECISION_JSON_QUERY_LOOP_DID_NOT_CONVERGE",
              "High", { choiceKey: choice.choiceKey,
                queryRounds: choice.stageQueryRounds,
                automaticProviderRetryPerformed: true,
                projection: publicProjection(match) });
          }
          continue;
        }
        const query = interactionMode(match.providerInteractionMode)
          === "json_channels_v1"
          ? await runJsonQueryRequests(match, input, parts.queries, stage)
          : await runQueries(input, parts.queries);
        match = await commitChoice(match, choice.choiceKey, (draft) => {
          const current = draft.decisions[choice.choiceKey];
          current.processedAttemptKeys.push(attempt.attemptKey);
          current.queryRounds += 1;
          current.stageQueryRounds += 1;
          const known = new Set(current.queryReceipts.map((entry) =>
            entry.queryReceiptHash));
          let newReceiptCount = 0;
          for (const receipt of query.receipts) {
            if (!known.has(receipt.queryReceiptHash)) {
              known.add(receipt.queryReceiptHash);
              current.queryReceipts.push(receipt);
              newReceiptCount += 1;
            }
          }
          if (query.receipts.length > 0 && newReceiptCount === 0
            && query.warnings.length === 0) {
            current.warnings.push(
              `QUERY_RETURNED_ONLY_KNOWN_RECEIPTS_TERMINAL_FORCED:${stage}`);
          }
          current.warnings.push(...query.warnings);
          current.status = "generating";
        });
        continue;
      }
      if (parts.queries.length && choice.stageQueryRounds >= queryRoundLimit) {
        match = await commitChoice(match, choice.choiceKey, (draft) => {
          const current = draft.decisions[choice.choiceKey];
          if (!current.processedAttemptKeys.includes(attempt.attemptKey)) {
            current.processedAttemptKeys.push(attempt.attemptKey);
          }
          current.warnings.push(
            "QUERY_SAFETY_CEILING_REACHED_TERMINAL_FORCED");
          current.status = "generating";
        });
        continue;
      }
      if (stage === "planning") {
        if (!parts.planning) {
          const correction = await recordSemanticCorrection(match, choice,
            attempt, correctionError("PLANNER_FINAL_OUTPUT_MISSING"));
          match = correction.match;
          if (correction.exhausted) {
            return rejection("LIVE_DECISION_PLANNER_DID_NOT_CONVERGE", "High", {
              choiceKey: choice.choiceKey,
              correctionRounds:
                match.decisions[choice.choiceKey].semanticCorrectionRounds,
              lastCorrection: correction.correction,
              automaticProviderRetryPerformed: true,
              projection: publicProjection(match),
            });
          }
          continue;
        }
        const activeInput = decisionInputForChoice(input, choice);
        const submittedCandidateId = String(
          parts.planning.recommendedCandidateId || "");
        const submittedTargetUnitId = String(
          parts.planning.selectedChargeTargetUnitId || "").trim();
        const submittedCandidate = actionIndex(activeInput.spatialActionSpace)
          .find((entry) => entry.id === submittedCandidateId);
        if (sourceActionDomain(submittedCandidate?.action)?.actionType === "charge"
          && submittedTargetUnitId) {
          let completedEvidence;
          try {
            completedEvidence =
              await completeStarcraftTmgSelectedChargeEvidenceV1({
                spatialActionSpace: activeInput.spatialActionSpace,
                candidateId: submittedCandidateId,
                targetUnitId: submittedTargetUnitId,
                queryReceipts: choice.queryReceipts,
                spatialQueryPort,
                roomProjection: activeInput.roomProjection,
                legalSpace: activeInput.legalSpace,
                spatialObservation: activeInput.spatialObservation,
              });
          } catch (error) {
            return rejection("LIVE_DECISION_CHARGE_GEOMETRY_QUERY_FAILED",
              "High", { choiceKey: choice.choiceKey,
                reason: String(error?.message || error),
                automaticProviderRetryPerformed: false,
                projection: publicProjection(match) });
          }
          if (completedEvidence.queryAttempted) {
            if (completedEvidence.reachability.status !== "exact") {
              return rejection("LIVE_DECISION_CHARGE_GEOMETRY_UNAVAILABLE",
                "High", { choiceKey: choice.choiceKey,
                  targetUnitId: submittedTargetUnitId,
                  automaticProviderRetryPerformed: false,
                  projection: publicProjection(match) });
            }
            match = await commitChoice(match, choice.choiceKey, (draft) => {
              const current = draft.decisions[choice.choiceKey];
              const known = new Set(current.queryReceipts.map((entry) =>
                entry.queryReceiptHash));
              for (const receipt of completedEvidence.receipts) {
                if (!known.has(receipt.queryReceiptHash)) {
                  known.add(receipt.queryReceiptHash);
                  current.queryReceipts.push(receipt);
                }
              }
              if (!current.processedAttemptKeys.includes(attempt.attemptKey)) {
                current.processedAttemptKeys.push(attempt.attemptKey);
              }
              current.providerContinuationMessages.push({ role: "user",
                content: `The Host has measured intended Charge target ${
                  submittedTargetUnitId}: exact base-edge ${
                  completedEvidence.reachability.baseEdgeDistanceMilliInches} milli-inches; minimum move to engagement ${
                  completedEvidence.reachability.minimumMoveToEngageMilliInches} milli-inches; maximum Charge move ${
                  completedEvidence.reachability.maximumDistanceMilliInches} milli-inches. Reassess the current candidates with this exact fact and submit a new planning decision.`,
              });
              current.warnings.push(
                `HOST_SELECTED_CHARGE_TARGET_DISTANCE_READY:${
                  submittedTargetUnitId}`);
              current.status = "generating";
            });
            continue;
          }
        }
        let plannerResult;
        try {
          plannerResult = normalizePlannerOutput(
            projectStarcraftTmgSubmittedPlanningV1(
              parts.planning, activeInput, {
                terminal: Boolean(parts.terminal),
              }),
            activeInput,
            choice.queryReceipts);
        } catch (error) {
          const correction = await recordSemanticCorrection(match, choice,
            attempt, error);
          match = correction.match;
          if (correction.exhausted) {
            return rejection("LIVE_DECISION_PLANNER_DID_NOT_CONVERGE", "High", {
              choiceKey: choice.choiceKey,
              correctionRounds:
                match.decisions[choice.choiceKey].semanticCorrectionRounds,
              lastCorrection: correction.correction,
              automaticProviderRetryPerformed: true,
              projection: publicProjection(match),
            });
          }
          continue;
        }
        match = await commitChoice(match, choice.choiceKey, (draft) => {
          const current = draft.decisions[choice.choiceKey];
          current.stage = "action";
          current.plannerResult = clone(plannerResult);
          current.plannerResultAttemptKey = attempt.attemptKey;
          current.providerContinuationMessages = [];
          current.stageQueryRounds = 0;
          current.stageCorrectionRounds = 0;
          current.lastSemanticFailureSignature = null;
          current.repeatedSemanticFailureCount = 0;
          if (!current.processedAttemptKeys.includes(attempt.attemptKey)) {
            current.processedAttemptKeys.push(attempt.attemptKey);
          }
          current.status = "generating";
        });
        continue;
      }
      if (!parts.decision) {
        const correction = await recordSemanticCorrection(match, choice,
          attempt, correctionError("ACTION_FINAL_OUTPUT_MISSING"));
        match = correction.match;
        if (!correction.exhausted) continue;
        return rejection("LIVE_DECISION_ACTION_DID_NOT_CONVERGE", "High", {
          choiceKey: choice.choiceKey,
          correctionRounds:
            match.decisions[choice.choiceKey].semanticCorrectionRounds,
          lastCorrection: correction.correction,
          automaticProviderRetryPerformed: true,
          projection: publicProjection(match),
        });
      }
      let decision;
      let normalizedAction;
      try {
        // Planner and the model prompt have already removed parameter domains
        // that the Host proved uninstantiable. Action validation must see the
        // same current candidates; otherwise a legal Pass is repeatedly
        // rejected for not forfeiting an unavailable ability.
        const activeInput = decisionInputForChoice(input, choice);
        normalizedAction = normalizeSubmittedAction(attempt, activeInput,
          choice);
        const composed = {
          ...clone(normalizedAction),
          plannerResult: clone(choice.plannerResult),
          plan: clone(choice.plannerResult.plan),
          assessment: clone(choice.plannerResult.assessment),
          planRevision: clone(choice.plannerResult.planRevision),
        };
        decision = normalizeDecision(composed, activeInput, match,
          choice.queryReceipts, providerTrace(match, choice, crossed));
      } catch (error) {
        const correction = await recordSemanticCorrection(match, choice,
          attempt, error);
        match = correction.match;
        if (!correction.exhausted) continue;
        return rejection("LIVE_DECISION_ACTION_DID_NOT_CONVERGE", "High", {
            choiceKey: choice.choiceKey,
            correctionRounds:
              match.decisions[choice.choiceKey].semanticCorrectionRounds,
            lastCorrection: correction.correction,
            automaticProviderRetryPerformed: true,
            projection: publicProjection(match),
          });
        }
      if (decision.proposal.kind === "parameterized") {
        const previousChargeQueryReceipts = choice.queryReceipts;
        const validation = await runQueries(input, [{
          requestId: `validate-final-proposal-${
            Number(choice.proposalValidationRounds || 0) + 1}`,
          queryKind: "instantiate_parameterized_action",
          arguments: {
            domainId: decision.proposal.domainId,
            parameters: clone(decision.proposal.parameters),
          },
        }]);
        const receipt = validation.receipts[0] || null;
        const exact = receipt?.status === "exact";
        match = await commitChoice(match, choice.choiceKey, (draft) => {
          const current = draft.decisions[choice.choiceKey];
          const storedAttempt = current.attempts[attempt.attemptKey];
          storedAttempt.localSemanticReplayVersion =
            ACTION_SHAPE_NORMALIZATION_VERSION;
          if (exact) current.proposalValidationRounds =
            Number(current.proposalValidationRounds || 0) + 1;
          const known = new Set(current.queryReceipts.map((entry) =>
            entry.queryReceiptHash));
          for (const entry of validation.receipts) {
            if (!known.has(entry.queryReceiptHash)) {
              known.add(entry.queryReceiptHash);
              current.queryReceipts.push(entry);
            }
          }
          current.warnings.push(...validation.warnings);
          if (!exact) {
            const selected = actionIndex(input.spatialActionSpace).find(entry =>
              entry.id === decision.candidateId);
            const recovery = planStarcraftTmgParameterFailureRecoveryV1({
              domain: selected?.action, parameters: decision.proposal.parameters,
              receipt, history: current.parameterRecoveryHistory || [],
              maximumRounds: Math.min(3, maxToolRounds),
            });
            applyStarcraftTmgParameterFailureRecoveryV1(current, recovery, {
              attemptKey: attempt.attemptKey, recordedAt: instant(now(), "now"),
            });
            current.warnings.push(`PARAMETERIZED_PROPOSAL_REJECTED:${
              receipt?.reason || "validation_receipt_missing"}`);
          }
        });
        choice = match.decisions[choice.choiceKey];
        if (!exact) {
          if (choice.status === "provider_output_invalid") {
            return rejection("LIVE_DECISION_PARAMETERIZED_PROPOSAL_DID_NOT_CONVERGE",
              "High", {
                choiceKey: choice.choiceKey,
                proposalValidationRounds: choice.proposalValidationRounds,
                lastRulesReason: receipt?.reason || "validation_receipt_missing",
                recovery: clone(choice.parameterRecoveryHistory?.at(-1) || null),
                automaticProviderRetryPerformed: true,
                projection: publicProjection(match),
              });
          }
          continue;
        }
        const pathReview = planStarcraftTmgChargePathEvidenceReviewV1({
          spatialActionSpace: input.spatialActionSpace, proposal: decision.proposal,
          queryReceipts: choice.queryReceipts, previousQueryReceipts: previousChargeQueryReceipts,
          history: choice.chargePathReviewHistory || [], maximumRounds: 3,
        });
        if (pathReview) {
          match = await commitChoice(match, choice.choiceKey, draft => {
            applyStarcraftTmgChargePathEvidenceReviewV1(draft.decisions[choice.choiceKey],
              pathReview, { attemptKey: attempt.attemptKey, recordedAt: instant(now(), "now") });
          });
          if (pathReview.action === "needs_attention") {
            return rejection("LIVE_DECISION_CHARGE_PATH_REVIEW_DID_NOT_CONVERGE", "High", {
              choiceKey: choice.choiceKey, review: pathReview,
              automaticProviderRetryPerformed: false, projection: publicProjection(match),
            });
          }
          continue;
        }
        const composed = {
          ...clone(normalizedAction),
          plannerResult: clone(choice.plannerResult),
          plan: clone(choice.plannerResult.plan),
          assessment: clone(choice.plannerResult.assessment),
          planRevision: clone(choice.plannerResult.planRevision),
        };
        decision = normalizeDecision(composed,
          decisionInputForChoice(input, choice), match,
          choice.queryReceipts, providerTrace(match, choice, crossed));
      }
      decision = freeze({
        ...clone(decision),
        promptPolicyObservation:
          promptPolicyObservation(match, choice, decision, input),
      });
      try {
        match = await commitChoice(match, choice.choiceKey, (draft) => {
          const current = draft.decisions[choice.choiceKey];
          current.status = "completed";
          // Keep every failed submission and abandoned plan, closing only this
          // decision's recovery records with the actually validated successor.
          for (const recovery of current.parameterRecoveryHistory || []) {
            recovery.resolved = true;
            recovery.resolvedByCandidateId = decision.candidateId;
            recovery.resolvedByDecisionHash = decision.decisionHash || null;
            recovery.resolutionKind = "rules_instantiated_decision_only";
            recovery.applyAndReplayStillRequired = true;
          }
          current.processedAttemptKeys.push(attempt.attemptKey);
          current.completedDecision = clone(decision);
          current.completedAt = instant(now(), "now");
        });
      } catch (error) {
        return rejection("LIVE_DECISION_RESULT_COMMIT_UNKNOWN", "High", {
          choiceKey: choice.choiceKey,
          automaticRetryPerformed: false,
          message: String(error?.message || error),
        });
      }
      return freeze({ ...clone(decision), ok: true,
        idempotentReplay: false, choiceKey: choice.choiceKey });
    }
  }

  async function decide(input = {}) {
    let scopeValue;
    try {
      if (containsApiCredential(input)) {
        return rejection("LIVE_DECISION_API_CREDENTIAL_FORBIDDEN", "Critical");
      }
      scopeValue = scope(input.scope || input);
      let match = await loadRecord(scopeValue.scopeKey);
      if (!match || match.lifecycle !== "open") {
        return rejection("LIVE_DECISION_MATCH_NOT_OPEN", "High");
      }
      const authorityValue = currentAuthority(input, scopeValue);
      const staged = await stageChoice(match, input, authorityValue);
      match = staged.match;
      const choice = staged.choice;
      if (choice.status === "completed") {
        return freeze({ ...clone(choice.completedDecision), ok: true,
          idempotentReplay: true, choiceKey: choice.choiceKey });
      }
      const singleton = await completeCurrentSingleton(match, input, choice);
      if (singleton) return singleton.decision;
      if (!inFlight.has(choice.choiceKey)) {
        inFlight.set(choice.choiceKey, generate(match, clone(input), choice)
          .finally(() => inFlight.delete(choice.choiceKey)));
      }
      return await inFlight.get(choice.choiceKey);
    } catch (error) {
      return rejection(error?.code || "LIVE_DECISION_REQUEST_INVALID",
        error?.severity || "Medium", {
          ...(scopeValue ? { scopeKey: scopeValue.scopeKey } : {}),
        });
    }
  }

  async function resolveCommitUnknown(input = {}) {
    try {
      const scopeValue = scope(input.scope || input);
      let match = await loadRecord(scopeValue.scopeKey);
      const choice = match?.decisions?.[input.choiceKey];
      const attempt = choice?.attempts?.[input.attemptKey];
      if (!match || !choice || !attempt
        || attempt.status !== "provider_call_may_have_started") {
        return rejection("LIVE_DECISION_UNKNOWN_ATTEMPT_NOT_FOUND", "Medium");
      }
      if (input.resolution !== "definitely_not_sent") {
        return rejection("LIVE_DECISION_MANUAL_OUTCOME_IMPORT_REQUIRED", "High", {
          acceptedResolution: "definitely_not_sent",
        });
      }
      match = await commitChoice(match, input.choiceKey, (draft) => {
        const current = draft.decisions[input.choiceKey];
        current.attempts[input.attemptKey].status = "manually_resolved_not_sent";
        current.attempts[input.attemptKey].completedAt = instant(now(), "now");
        current.status = "retry_ready";
        current.warnings.push("COMMIT_UNKNOWN_MANUALLY_RESOLVED_NOT_SENT");
      });
      return freeze({ ok: true, outcome: "retry_ready",
        automaticRetryPerformed: false, projection: publicProjection(match),
        trainingTruth: false });
    } catch (error) {
      return rejection(error?.code || "LIVE_DECISION_RECOVERY_INVALID",
        error?.severity || "Medium");
    }
  }

  async function read(input = {}) {
    try {
      const scopeValue = scope(input.scope || input);
      const record = await loadRecord(scopeValue.scopeKey);
      return freeze({ ok: Boolean(record),
        reason: record ? null : "LIVE_DECISION_MATCH_NOT_FOUND",
        projection: publicProjection(record), trainingTruth: false });
    } catch (error) {
      return rejection(error?.code || "LIVE_DECISION_READ_INVALID", "Medium");
    }
  }

  async function closeMatch(input = {}) {
    try {
      const scopeValue = scope(input.scope || input);
      let record = await loadRecord(scopeValue.scopeKey);
      if (!record) return rejection("LIVE_DECISION_MATCH_NOT_FOUND", "Medium");
      if (FINAL_STATUSES.has(record.lifecycle)) {
        return freeze({ ok: true, idempotentReplay: true,
          projection: publicProjection(record), trainingTruth: false });
      }
      if (Object.values(record.decisions).some((entry) =>
        entry.status === "provider_call_may_have_started")) {
        return rejection("LIVE_DECISION_COMMIT_UNKNOWN_MUST_RESOLVE", "High", {
          projection: publicProjection(record),
        });
      }
      record = await commit(record, (draft) => {
        draft.lifecycle = "closed";
        draft.closedAt = instant(now(), "now");
      });
      return freeze({ ok: true, idempotentReplay: false,
        projection: publicProjection(record), trainingTruth: false });
    } catch (error) {
      return rejection(error?.code || "LIVE_DECISION_CLOSE_INVALID",
        error?.severity || "Medium");
    }
  }

  return Object.freeze({
    metadata: Object.freeze({
      schemaVersion:
        `${STARCRAFT_TMG_LIVE_FLASH_DECISION_PORT_VERSION}.metadata`,
      interface: ["preflight", "openMatch", "decide",
        "resolveCommitUnknown", "read", "closeMatch"],
      providerCalls: "one_or_more_per_agent_owned_choice_with_typed_query_rounds",
      deterministicHostOrRulesStepsCallProvider: false,
      modelLifecycle:
        "preferred_then_pre_game_fallback_then_frozen_for_match",
      strategySkillLifecycle: "resolved_and_frozen_at_preflight",
      decisionRecovery:
        "durable_stage_and_tool_continuation_before_egress_reconcile_terminal_attempt_by_request_binding_explicit_retry_after_paid_response_loss",
      maxCallLifecycle: "reset_at_new_match_epoch_only",
      toolQueryKinds: spatialQueryPort.metadata?.directExactQueries
        ? [...spatialQueryPort.metadata.directExactQueries,
          ...(spatialQueryPort.metadata.delegatedQueries || [])] : "adapter_owned",
      publicReasoningPolicy:
        "public_summary_and_evidence_only_no_hidden_chain_of_thought",
      promptPolicyVersion: promptPolicyVersion(providerInteractionMode),
      providerInteractionMode,
      terminalSubmissionProtocol: providerInteractionMode === "native_tools"
        ? "deepseek_beta_strict_function_tools_required"
        : "deepseek_standard_json_channels_v1",
      promptPolicyRegressionObservation:
        "every_policy_change_compares_strategy_invariants_and_cost_against_up_to_five_prior_paid_decisions",
      extraProviderFields: "ignored_not_blocking",
      onlyCredentialMaterialHardRejected: true,
      productionStoreRequired: store.durability === "process_memory",
      liveProviderClaim: false,
      trainingTruth: false,
    }),
    preflight,
    openMatch,
    decide,
    resolveCommitUnknown,
    read,
    closeMatch,
  });
}
