import { hashStarcraftTmgContract } from
  "../authoritative-engine/transition-v1.mjs";
import { priceStarcraftTmgDeepSeekV4FlashUsageV1 } from
  "../secure-provider-runtime/provider-pricing-v1.mjs";
import { priceStarcraftTmgDeepSeekCurrentUsageV2 } from
  "../secure-provider-runtime/provider-pricing-v2.mjs";
import { normalizeProviderJsonDocumentV1 } from
  "../secure-provider-runtime/provider-response-outcome-v1.mjs";
import {
  STARCRAFT_TMG_FORMATION_OBJECTIVE_KINDS,
  STARCRAFT_TMG_FORMATION_SOLVER_TOOL_NAME,
} from "./legal-formation-search-v1.mjs";

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
const NATIVE_PLANNING_SUBMIT_TOOL_NAME = "submit_planning";
const NATIVE_DECISION_SUBMIT_TOOL_NAME = "submit_decision";
const PROMPT_POLICY_VERSION =
  "starcraft_tmg_planner_action_spatial_intent_solver_v5";
const ACTION_SHAPE_NORMALIZATION_VERSION =
  "starcraft_tmg_live_action_shape_normalization_v12";
const PLANNER_SHAPE_NORMALIZATION_VERSION =
  "starcraft_tmg_live_planner_shape_normalization_v5";
const NATIVE_QUERY_KINDS = Object.freeze([
  "space.inspect_relationships",
  STARCRAFT_TMG_FORMATION_SOLVER_TOOL_NAME,
  "legal_formation_options",
  "legal_asset_placement_options",
  "base_edge_distance",
  "within_and_wholly_within",
  "instantiate_parameterized_action",
  "legal_full_path_movement",
  "coherency_after_candidate_placement",
  "intervening_model_or_terrain_blocking",
  "line_of_sight_cover_and_elevation",
  "action_specific_threat",
  "attack_probability",
  "fire_zone_exchange",
  "objective_score_after_candidate_action",
]);
const HOST_DEFERRED_QUERY_KINDS = new Set([
  STARCRAFT_TMG_FORMATION_SOLVER_TOOL_NAME,
  "legal_formation_options",
  "legal_asset_placement_options",
  "instantiate_parameterized_action",
]);
const PLANNING_POST_SELECTION_QUERY_KINDS = new Set([
  "legal_full_path_movement",
  "coherency_after_candidate_placement",
  "objective_score_after_candidate_action",
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
  "cardResources", "armyResourceBudgetsBySide", "pendingAction",
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

function sourceActionDomain(value) {
  return object(value?.sourceDomain) ? value.sourceDomain : value;
}

function isAssetPlacementDomain(value) {
  const domain = sourceActionDomain(value);
  return domain?.actionType === "resolve_battlefield_asset_ability"
      && domain?.parameterSchema?.coordinate?.type
        === "world_point_milli_inches"
    || domain?.actionType === "use_active_ability"
      && domain?.effectKind === "omega_network"
      && object(domain?.parameterSchema?.groundPoint)
      && domain.parameterSchema.required?.includes("xMilliInches")
      && domain.parameterSchema.required?.includes("yMilliInches");
}

function isFormationPlacementDomain(value) {
  const domain = sourceActionDomain(value);
  return FORMATION_ACTION_TYPES.has(String(domain?.actionType || ""))
    || domain?.parameterSchema?.placementPlan?.type
      === "complete_model_placement_plan"
    || Array.isArray(domain?.parameterSchema?.placements?.exactModelIds)
      && domain.parameterSchema.required?.includes("leadingModelId")
      && domain.parameterSchema.required?.includes("placements");
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
      usefulQueries.push("action_specific_threat", "attack_probability",
        "fire_zone_exchange");
    }
    if (entry.kind !== "parameterized"
      && /move|run|deploy|charge|attack|fight/u.test(actionType)) {
      usefulQueries.push("objective_score_after_candidate_action");
    }
    const successor = preexecution.get(entry.id);
    return {
      candidateId: entry.id,
      kind: entry.kind,
      actionType,
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

function compactPlanningActionSpace(actionSpace) {
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
      abilityName: entry.abilityName || null,
      effectKind: entry.effectKind || null,
      createdUnitRecordKey: entry.createdUnitRecordKey || null,
      sideKey: entry.sideKey || null,
      phase: entry.phase || null,
      pieceId: entry.pieceId || null,
      maxDistanceMilliInches:
        entry.constraints?.maxDistanceMilliInches ?? null,
      supply: clone(entry.constraints?.supply || null),
      modelCount: entry.constraints?.modelProfiles?.length || 0,
      exactRulesInstantiationRequired: true,
    })),
    fullSelectedDomainIsProvidedOnlyToTheActionStage: true,
    trainingTruth: false,
  });
}

function selectedActionSpace(actionSpace, candidateId) {
  return freeze({
    schemaVersion:
      `${STARCRAFT_TMG_LIVE_FLASH_DECISION_PORT_VERSION}.selected-action-space`,
    authority: clone(actionSpace?.authority || null),
    finiteActions: (actionSpace?.finiteActions || []).filter((entry) =>
      entry.candidateId === candidateId).map(clone),
    parameterDomains: (actionSpace?.parameterDomains || []).filter((entry) =>
      entry.domainId === candidateId).map(clone),
    selectedByPlanner: true,
    exactRulesInstantiationRequired: true,
    trainingTruth: false,
  });
}

function correctionError(code, detail = "") {
  return Object.assign(new TypeError(detail || code), {
    code,
    correction: detail ? `${code}:${detail}` : code,
    severity: "High",
  });
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
  if (pass && actions.length > 1 && !compared.has(pass.id)) {
    throw correctionError("PLANNER_PASS_OPPORTUNITY_COST_NOT_COMPARED",
      pass.id);
  }
  const selected = actions.find((entry) => entry.id === recommendedCandidateId);
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
        "tacticalPurpose,formationObjectives");
    }
  }
  if (!publicPlanSummary.trim()) {
    throw correctionError("PLANNER_PUBLIC_SUMMARY_REQUIRED");
  }
  const lifecycleAssessment = validateLifecycleAssessment(
    raw.lifecycleAssessment, input, recommendedCandidateId);
  return freeze({
    recommendedCandidateId,
    plan: object(normalizedPlan) ? clone(normalizedPlan) : null,
    assessment: clone(raw.assessment),
    planRevision: normalizedPlanRevision,
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
    lifecycleAssessment,
    publicPlanSummary,
    hiddenChainOfThoughtStored: false,
    trainingTruth: false,
  });
}

function validateActionOutput(raw, input, planner) {
  if (!object(raw)) throw correctionError("ACTION_OUTPUT_REQUIRED");
  const actions = actionIndex(input.spatialActionSpace);
  const { selected } = selectedProposal(raw, actions);
  if (selected.id !== planner.recommendedCandidateId) {
    throw correctionError("ACTION_DEPARTED_FROM_PLANNER",
      `${selected.id}->${planner.recommendedCandidateId}`);
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
    if (!object(response) || !String(response.opponentAction || "").trim()
      || !Array.isArray(response.basis)
      || !String(response.counterResponse || "").trim()
      || !String(response.counterPurpose || "").trim()) {
      issues.push(`ACTION_OPPONENT_RESPONSE_INVALID:${index}`);
    }
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
  const schema = domain?.parameterSchema;
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

function bindFormationSelection(raw, queryReceipts) {
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
  const leading = rationales.find((entry) => entry.isLeading);
  if (parameters.outcome === "failure" && option.slots.length === 0) {
    normalized.proposal = {
      kind: "parameterized",
      domainId,
      parameters,
    };
    normalized.formationSelection = {
      formationOptionId,
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
    formationReceiptHash: receipt.queryReceiptHash,
    patternId: option.patternId,
    solverPolicyId: option.solverPolicyId || null,
    formationObjectives: clone(option.formationObjectives || []),
    tacticalMetrics: clone(option.tacticalMetrics || null),
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

function normalizeActionOutputShape(raw) {
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
          opponentAction: text(source.opponentAction,
            "Opponent may choose the strongest visible counter-action."),
          basis: strings(source.basis).length
            ? strings(source.basis) : clone(responseBasis),
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
      opponentAction: text(entry.opponentAction,
        "Opponent may choose the strongest current counter-action."),
      basis: strings(entry.basis),
      counterResponse: text(entry.counterResponse,
        "Re-evaluate the plan against the observed response."),
      counterPurpose: text(entry.counterPurpose,
        "Preserve the current objective while limiting the counterplay."),
      replanIf: entry.replanIf ? String(entry.replanIf) : null,
      probabilityEvidenceRef: entry.probabilityEvidenceRef || null,
    }));
  return result.length ? result.slice(0, 8) : [{
    responseId: "response-1",
    opponentAction: "Opponent may choose the strongest current counter-action.",
    basis: ["current visible position and LegalSpace"],
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
    : object(output?.planning) ? output.planning : null;
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

function mapPlanningSubmission(raw, input) {
  if (!object(raw)) return raw;
  const result = clone(raw);
  result.lifecycleAssessment = bindLifecycleEvidence(
    result.lifecycleAssessment, input, result.recommendedCandidateId);
  if (result.assessment?.verdict !== "revise") delete result.planRevision;
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

function mapDecisionSubmission(raw, input, choice) {
  if (!object(raw)) return raw;
  const result = clone(raw);
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
      publicReason: String(selection.publicReason || ""),
    };
  } else if (selection.kind === "asset") {
    result.assetPlacementSelection = {
      placementOptionId: String(selection.optionId || ""),
      publicReason: String(selection.publicReason || ""),
    };
  } else if (selection.kind === "parameters") {
    result.proposal = {
      kind: "parameterized",
      domainId: candidateId,
      parameters: parseSubmittedParametersJson(selection.parametersJson),
    };
  }
  delete result.selection;
  return result;
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

function planSubmissionSchema() {
  return strictObject({
    objective: strictString(1, 2_000),
    currentGoal: strictString(1, 2_000),
    strategicApproach: strictStringArray(0, 12),
    successSignals: strictStringArray(0, 12),
    activationPriorities: strictStringArray(0, 12),
    resourcePolicy: strictStringArray(0, 12),
    initiativePolicy: strictStringArray(0, 12),
    reservePolicy: strictStringArray(0, 12),
    reviseIf: strictStringArray(1, 12),
    assumptions: strictStringArray(0, 12),
    opponentModel: strictStringArray(0, 12),
    contingencies: strictStringArray(0, 12),
    revisionReason: strictString(0, 2_000),
  });
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
    currentGoal: strictString(1, 2_000),
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
  const comparisonMinimum = ids.length > 1 ? 1 : 0;
  return {
    type: "function",
    function: {
      name: NATIVE_PLANNING_SUBMIT_TOOL_NAME,
      description:
        "Finish the Planner stage. Select exactly one current candidate and submit concise public plan, comparison, lifecycle and evidence summaries. This does not execute an action.",
      strict: true,
      parameters: strictObject({
        recommendedCandidateId: strictString(1, 200, { enum: ids }),
        plan: planSubmissionSchema(),
        planRevision: planSubmissionSchema(),
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
  return { kind: "parameters", optionIds: [""] };
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
              opponentAction: strictString(1, 2_000),
              basis: strictStringArray(1, 12),
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
  const interactiveTools = [{
    type: "function",
    function: {
      name: NATIVE_QUERY_TOOL_NAME,
      description:
        "Ask the Host for one read-only Rules, geometry, probability, fire-zone, path, coherency, line-of-sight, threat or score query. Encode query-specific arguments as one JSON object string. Intent-driven formation solving, asset placement and final instantiation are deferred to the Host after candidate selection.",
      parameters: {
        type: "object",
        properties: {
          requestId: { type: "string" },
          queryKind: { type: "string", enum: exposedQueryKinds },
          argumentsJson: { type: "string" },
        },
        required: ["requestId", "queryKind", "argumentsJson"],
        additionalProperties: false,
      },
    },
  }, {
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
        "Retrieve a bounded slice of the complete same-match event ledger when the fixed working summary is insufficient. This memory is advisory and never Rules authority.",
      parameters: {
        type: "object",
        properties: {
          kinds: { type: "array", items: { type: "string" } },
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

function compactRoomProjection(projection) {
  const state = object(projection?.state) ? projection.state : {};
  return {
    schemaVersion: `${STARCRAFT_TMG_LIVE_FLASH_DECISION_PORT_VERSION}.room-projection`,
    room: clone(projection?.room || null),
    viewer: clone(projection?.viewer || null),
    control: clone(projection?.control || null),
    matchBinding: clone(projection?.matchBinding || null),
    state: Object.fromEntries(DECISION_STATE_FIELDS
      .filter((field) => state[field] !== undefined)
      .map((field) => [field, clone(state[field])])),
    omittedFromPrompt: [
      "duplicate_piece_geometry_projected_by_spatial_observation",
      "frozen_rules_and_gameplay_data_bundles",
      "historical_resolution_ledgers_not_needed_for_current_choice",
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

function strategySearchTerms(input) {
  const state = input?.roomProjection?.state || {};
  const values = [
    state.phase,
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
  const terms = strategySearchTerms(input);
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
    terrain: (observation.terrain || []).map(compactBoardObject),
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

function compactQueryReceiptForPrompt(receipt) {
  if (object(receipt)
    && receipt.queryKind === "space.inspect_relationships"
    && object(receipt.result)) {
    const result = receipt.result;
    const compactThreat = (value) => !object(value) ? null : {
      stationaryProfileKeys: clone(value.stationaryProfileKeys || []),
      moveThenAttackProfileKeys:
        clone(value.moveThenAttackProfileKeys || []),
      chargeBand: clone(value.chargeBand || null),
      spatialThreatPrecision: value.spatialThreatPrecision || null,
      currentLegalActionNotImplied:
        value.currentLegalActionNotImplied === true,
    };
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
        currentControlSideKey: entry.currentControlSideKey || null,
        unitCoherencyStatus: clone(entry.unitCoherencyStatus || null),
        exactControlStillRequiresCurrentMissionEligibilityAndLos:
          entry.exactControlStillRequiresCurrentMissionEligibilityAndLos
            === true,
        precision: entry.precision || null,
      };
      return {
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
            coherency: clone(entry.coherency || null),
            envelope: clone(entry.envelope || null),
          })),
          objectives: clone(result.nodes?.objectives || []),
          terrain: clone(result.nodes?.terrain || []),
        },
        relationships,
        aggregates: clone(result.aggregates || null),
        overlay: clone(result.overlay || null),
        precisionPolicy: clone(result.precisionPolicy || null),
        sourceReceipts: clone(result.sourceReceipts || null),
        fullRelationshipGraphStoredDurably: true,
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
      anchor: clone(option.anchor || null),
      abilityName: option.abilityName || null,
      effectKind: option.effectKind || null,
      paymentCardInstanceIds: clone(option.paymentCardInstanceIds || []),
      parentContactModelId: option.parentContactModelId || null,
      slots,
      compatibilityGroups,
      completeFormationPlacementChecked:
        option.completeFormationPlacementChecked === true,
      canonicalParametersHeldByHost: true,
      actionHashHeldByHost: Boolean(option.actionHash),
    };
  });
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
      formationOptions,
      optionCount: receipt.result.optionCount,
      attemptedCandidateCount: receipt.result.attemptedCandidateCount,
      duplicateIntentCandidateCount:
        receipt.result.duplicateIntentCandidateCount || 0,
      searchCoverage: clone(receipt.result.searchCoverage || null),
      paretoDiversity: clone(receipt.result.paretoDiversity || null),
      failureCounts: clone(receipt.result.failureCounts || {}),
      assignmentContract: clone(receipt.result.assignmentContract || null),
      formationIntent: clone(receipt.result.formationIntent || null),
      exactCanonicalParametersRemainBoundToFormationOptionId: true,
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

function makeNode(nodeId, nodeType, authority, content) {
  const body = { nodeId, nodeType, authority, content: clone(content) };
  return freeze({ ...body, nodeHash: hashStarcraftTmgContract(body) });
}

function makePromptArtifact(match, input, choice, round, queryReceipts, stage,
  memoryQueryAvailable = false, forceTerminal = false) {
  const planning = stage === "planning";
  const selectedId = choice.plannerResult?.recommendedCandidateId || null;
  const continuedReceiptHashes = continuationReceiptHashes(choice);
  const promptQueryReceipts = queryReceipts.filter((entry) =>
    !continuedReceiptHashes.has(entry.queryReceiptHash));
  const contract = seal({
    schemaVersion:
      `${STARCRAFT_TMG_LIVE_FLASH_DECISION_PORT_VERSION}.response-contract`,
    stage,
    allowedChannels: planning
      ? ["planning", "query_requests"] : ["decision", "query_requests"],
    decisionCandidateSource: "current_spatial_action_space_only",
    plannerOwnsCandidateSelection: true,
    actionMustConsumePlannerCandidate: !planning,
    stageOutputRequiredAfterQueries: true,
    terminalSubmissionTool: planning
      ? NATIVE_PLANNING_SUBMIT_TOOL_NAME : NATIVE_DECISION_SUBMIT_TOOL_NAME,
    queryMode: forceTerminal
      ? "safety_ceiling_terminal_submission_only"
      : "evidence_queries_or_terminal_submission",
    promptPolicyVersion: PROMPT_POLICY_VERSION,
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
      protocol: forceTerminal
        ? "The query safety ceiling is reached. Call only the declared stage-specific strict submit tool, preserve uncertainty explicitly, and do not invent missing evidence."
        : "Every turn must call exactly one declared tool. Use query tools while material evidence is missing; finish by calling only the stage-specific strict submit tool.",
      queryRound: forceTerminal
        ? "No query tool is available after the safety ceiling; preserve every unresolved item as uncertainty in the terminal submission."
        : `Use ${NATIVE_QUERY_TOOL_NAME} for exact spatial, probability, fire-zone, path, LOS, coherency or score evidence. Use ${NATIVE_SKILL_TOOL_NAME} only when the default frozen Skill excerpts do not answer the strategy question.${memoryQueryAvailable && planning ? ` Use ${NATIVE_MEMORY_TOOL_NAME} only when the fixed same-match working summary does not answer a history question.` : ""}`,
      terminalTool: planning
        ? NATIVE_PLANNING_SUBMIT_TOOL_NAME : NATIVE_DECISION_SUBMIT_TOOL_NAME,
      canonicalActionOwnedByHost: true,
      toolSchemaIsTheOutputShape: true,
    },
    requirements: [
      planning
        ? "The Planner, not the Action stage, selects one candidateId from the current compact action index."
        : "Use exactly the Planner's recommended candidate. Submit only model-owned choices; the Host constructs the finite or parameterized proposal.",
      "For a Unit reposition, give a physical path only for the nominated Leading Model; the remaining models do not travel paths under the rules and must each receive an explicit final placement through the domain's placements field.",
      planning
        ? `Do not request ${STARCRAFT_TMG_FORMATION_SOLVER_TOOL_NAME}, legal asset-placement options, final parameter instantiation, legal_full_path_movement, coherency_after_candidate_placement, or objective_score_after_candidate_action during Planning. Those require a selected candidate and complete Host-owned parameters. Select the best current candidate from current relationships first. For a formation action, set formationSearchRequested and provide a tacticalPurpose plus weighted formationObjectives with visible targetIds; the Host runs the spatial solver once.`
        : "Use the exact Host-supplied formation or asset-placement options for the selected candidate; do not restart a broad placement search in the Action stage.",
      `When an exact ${STARCRAFT_TMG_FORMATION_SOLVER_TOOL_NAME} receipt is present, compare its weighted objectives and tacticalMetrics and choose exactly one formationOptionId. Give one concise publicReason for the formation. Leave slotAssignments empty to accept the Host's complete canonical identity assignment and per-slot public reasons; only submit assignments when a specific model identity must occupy a specific compatible slot, in which case cover every slot and model exactly once. Do not mix slots across options or hand-write replacement coordinates; the Host binds and revalidates the chosen formation.`,
      "When an exact legal_asset_placement_options receipt is present, choose exactly one placementOptionId and return assetPlacementSelection with that ID and one concise publicReason about the visible position, intended threat/objective/route effect, and plan continuity. Do not hand-write a replacement coordinate; the Host binds and revalidates the selected option.",
      "Position publicReason fields are auditable summaries, not hidden chain-of-thought. State the useful board fact and tactical purpose without private scratch work.",
      "For Deploy, the Host prepends the Leading Model base-centre start just outside the selected battlefield edge. The complete Speed allowance includes that ingress distance. Do not add an artificial path point on the edge and do not measure only from the edge; choose an endpoint whose complete Host path remains within maxDistanceMilliInches.",
      "Never treat the remaining models as a unit centre: compare and choose a complete Host-solved final formation using every model's physical base, coherency, board edge, terrain, objective, line-of-sight, blocking, threat and fire-zone consequences.",
      "When candidate value depends materially on position, use space.inspect_relationships with a tactical intent and scoped subjectUnitIds/targetIds before choosing. Read field-level exact/advisory/unknown precision; use the returned one-to-many, many-to-one, fire-zone, objective and clearance relationships to justify the chosen intent. Do not infer geometry from the rendered pixels.",
      "A typed query for a parameterized candidate must put domainId and the complete parameters object in the query tool arguments; the Host automatically Rules-checks every final parameterized proposal.",
      "Use exact query receipts as facts, advisory estimates as preferences, and unknown as uncertainty.",
      "An unknown query receipt may include Rules-derived repairContext. Use it only to repair and re-submit the same candidate; it never proves that the repaired proposal is legal until a later exact receipt accepts it.",
      "A pre-selection parameter-shape failure is Harness uncertainty, not tactical evidence against a formation candidate and never a reason to prefer Pass. The Planner chooses the candidate and spatial intent; the Host supplies every model's path and placement parameters afterward.",
      "The phase lifecycle node is Rules-owned. Ordinary actions exist only in their listed phase. Never defer Deploy, Move, Charge, Ranged Attack, Run, Hold, or Fight into another phase unless exact successor Rules evidence explicitly exposes it.",
      "Before recommending Pass, enumerate every current non-Pass actionType that will be forfeited and compare that opportunity cost with initiative value.",
      "When an exact successor is attached to Pass or choose_first_actor, cite its successorHash and use its actual next phase and action types. Do not invent a future LegalSpace.",
      planning
        ? "Assess the existing same-match plan before selecting a candidate. A changed or contradicted assumption must produce at_risk/invalid and revise/abandon, never silent continue/sound."
        : "Produce the ActionIntent for the already selected Planner candidate; do not replace the plan or candidate inside the Action stage.",
      "Predict a plausible opponent response and state a counter-response and replan trigger.",
      forceTerminal
        ? "If strategy context remains insufficient, record it as uncertainty and a replan trigger; never invent a missing Skill passage."
        : `If strategy context is insufficient, call ${NATIVE_SKILL_TOOL_NAME}; never invent a missing Skill passage.`,
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
      terminalForceReason: forceTerminal
        ? "query_safety_ceiling_reached" : null,
      currentCorrections: clone(choice.warnings || []),
    }),
    makeNode("player-room-projection", "player-view", "room_service",
      compactRoomProjection(input.roomProjection)),
    makeNode("current-legal-space", "rules", "rules_service",
      compactLegalSpace(input.legalSpace)),
    makeNode("round-phase-lifecycle", "rules", "rules_service",
      phaseLifecycleContract(input)),
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
        ? compactPlanningActionSpace(input.spatialActionSpace)
        : selectedActionSpace(input.spatialActionSpace, selectedId)),
    ...(planning ? [
      makeNode("same-match-memory", "same-match-advisory", "match_journal",
        input.matchMemory || null),
      makeNode("turn-plan-state", "same-match-advisory", "turn_plan_runtime",
        input.planState || null),
      makeNode("asynchronous-preexecution", "hypothetical-advisory",
        "preexecution_runtime", input.preexecutionSearch || null),
    ] : []),
    ...(!planning ? [makeNode("planner-output", "plan-authority", "planner",
      choice.plannerResult)] : []),
    makeNode("current-query-receipts", "typed-query-results", "rules_or_math",
      promptQueryReceipts.map(compactQueryReceiptForPrompt)),
    makeNode("user-message", "user-message", "host", {
      text: `Decision ${choice.choiceKey}, ${stage} stage. `
        + (forceTerminal
          ? `The query safety ceiling is reached; preserve unresolved uncertainty and call only the strict ${planning
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
    promptPolicyVersion: PROMPT_POLICY_VERSION,
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
    agentLoop: nativeAgentLoop(choice, input, queryReceipts, stage,
      memoryQueryAvailable && planning, forceTerminal),
    responseContract: contract,
    receipt,
    retentionPolicy: "release_after_durable_decision_attempt",
    eligibleForTraining: false,
    trainingTruth: false,
  };
  const artifact = seal(body, "promptArtifactHash");
  return { artifact, contract, responseRef: {
    id: "starcraft-tmg.live-flash-decision.v1",
    version: "1.0.0",
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
  const now = typeof options.now === "function"
    ? options.now : () => new Date().toISOString();
  const maxToolRounds = integer(options.maxToolRounds || 3,
    "maxToolRounds", 1, 16);
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

  async function commit(record, change) {
    const next = clone(record);
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

  async function preflight(input = {}) {
    try {
      const scopeValue = scope(input.scope || input);
      const matchMode = required(input.matchMode || "user_vs_agent",
        "matchMode", 80);
      const checks = [];
      let selected = null;
      for (const candidate of profiles) {
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
        if (existing.scope.matchBindingHash !== scopeValue.matchBindingHash
          || existing.selectedProfile.profileRef.hash
            !== receipt.selectedProfile.profileRef.hash
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
          || definitelyNotSentUsageRepair) {
          resumed = await commit(existing, (draft) => {
            draft.providerSession = clone(providerSession);
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
      const budgetLimitCnyMicros = integer(
        input.budget?.limitCnyMicros || 80_000_000,
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
      lastSemanticFailureSignature: null,
      repeatedSemanticFailureCount: 0,
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
    const next = await commit(match, (draft) => {
      draft.decisions[candidate.choiceKey] = candidate;
    });
    return { match: next, choice: next.decisions[candidate.choiceKey] };
  }

  async function providerCall(match, input, choice, stage) {
    const round = choice.attemptKeys.length + 1;
    const queryRoundLimit = stage === "planning"
      ? maxPlanningQueryRounds : maxActionQueryRounds;
    const forceTerminal = choice.stageQueryRounds >= queryRoundLimit;
    const prompt = makePromptArtifact(match, input, choice, round,
      choice.queryReceipts, stage, Boolean(memoryQueryPort), forceTerminal);
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
    const inputUnits = Math.max(1, stored.bytes + 4_096);
    const maxOutputUnits = match.selectedProfile.maxOutputUnits;
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
    if (match.usage.estimatedCostCnyMicros + projectedMicros
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
    match = await commit(match, (draft) => {
      const current = draft.decisions[choice.choiceKey];
      current.status = "provider_call_may_have_started";
      current.attemptKeys.push(attemptKey);
      current.attempts ||= {};
      current.attempts[attemptKey] = {
        attemptKey,
        round,
        stage,
        status: "provider_call_may_have_started",
        promptPolicyVersion: PROMPT_POLICY_VERSION,
        terminalSubmissionProtocol: "strict_function_tool_required",
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
      match = await commit(match, (draft) => {
        const current = draft.decisions[choice.choiceKey];
        const attempt = current.attempts[attemptKey];
        attempt.status = providerMayHaveBeenCalled
          ? "provider_failed_after_possible_egress" : "provider_failed_not_sent";
        attempt.completedAt = completedAt;
        attempt.failure = String(result?.reason || "provider_turn_failed");
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
    match = await commit(match, (draft) => {
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
    match = await commit(match, (draft) => {
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
    const bounded = requests.slice(0, maxQueriesPerRound);
    if (requests.length > bounded.length) {
      warnings.push("QUERY_REQUEST_COUNT_SOFT_TRUNCATED");
    }
    for (const request of bounded) {
      try {
        const receipt = await spatialQueryPort.query({
          roomProjection: input.roomProjection,
          legalSpace: input.legalSpace,
          spatialObservation: input.spatialObservation,
          request,
        });
        if (object(receipt) && HASH.test(String(receipt.queryReceiptHash || ""))) {
          receipts.push(clone(receipt));
        } else {
          warnings.push(`QUERY_RESULT_REJECTED:${request.queryKind}`);
        }
      } catch {
        warnings.push(`QUERY_FAILED:${request.queryKind}`);
      }
    }
    return { receipts, warnings };
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
    for (const [index, call] of calls.entries()) {
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
            || !HASH.test(String(queried.queryResultHash || ""))) {
            warnings.push("NATIVE_MEMORY_QUERY_RESULT_REJECTED");
          } else {
            receipt = seal({
              schemaVersion:
                `${STARCRAFT_TMG_LIVE_FLASH_DECISION_PORT_VERSION}.memory-query-receipt`,
              queryKind: "match_memory",
              status: "exact",
              result: clone(queried),
              source: "complete_same_match_event_log",
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
        const query = await runQueries(input, [{
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

  function providerTrace(match, choice, notificationThresholds = []) {
    const attempts = choice.attemptKeys.map((key) => choice.attempts[key]);
    const used = attempts.reduce((sum, entry) => ({
      inputUnits: sum.inputUnits + Number(entry.usage?.inputUnits || 0),
      outputUnits: sum.outputUnits + Number(entry.usage?.outputUnits || 0),
      totalUnits: sum.totalUnits + Number(entry.usage?.totalUnits || 0),
    }), { inputUnits: 0, outputUnits: 0, totalUnits: 0 });
    return freeze({
      agentVersion: STARCRAFT_TMG_LIVE_FLASH_DECISION_PORT_VERSION,
      promptPolicyVersion: PROMPT_POLICY_VERSION,
      terminalSubmissionProtocol: "strict_function_tool_required",
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
      promptPolicyVersion: PROMPT_POLICY_VERSION,
      previousPolicyVersion,
      policyChanged: previousPolicyVersion !== null
        && previousPolicyVersion !== PROMPT_POLICY_VERSION,
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
    match = await commit(match, (draft) => {
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
      current.providerContinuationMessages.push({
        role: "user",
        content: `The previous ${attempt.stage} submission failed typed validation: ${correction}. Correct only that defect, preserve supported facts, and call the required strict submit tool once.`,
      });
      current.status = current.stageCorrectionRounds >= maxToolRounds
        || current.repeatedSemanticFailureCount >= 2
        ? "provider_output_invalid" : "generating";
    });
    const current = match.decisions[choice.choiceKey];
    return {
      match,
      exhausted: current.stageCorrectionRounds >= maxToolRounds
        || current.repeatedSemanticFailureCount >= 2,
      correction,
    };
  }

  async function generate(match, input, choice) {
    const crossed = [];
    while (true) {
      choice = match.decisions[choice.choiceKey];
      const lastKey = choice.attemptKeys.at(-1);
      let attempt = lastKey ? choice.attempts?.[lastKey] : null;
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
      const replayablePlannerKey = !choice.plannerResult
        && (["provider_failed_requires_explicit_retry", "provider_output_invalid",
          "provider_call_may_have_started"]
          .includes(choice.status)
          || attempt?.status === "provider_call_may_have_started"
          || interruptedPlannerReplay)
        ? [...choice.attemptKeys].reverse().find((attemptKey) => {
          const candidate = choice.attempts?.[attemptKey];
          return candidate?.status === "completed"
            && object(responseParts(candidate.safeOutput).planning)
            && candidate.localPlannerSemanticReplayVersion
              !== PLANNER_SHAPE_NORMALIZATION_VERSION;
        }) : null;
      if (replayablePlannerKey) {
        match = await commit(match, (draft) => {
          const current = draft.decisions[choice.choiceKey];
          const storedAttempt = current.attempts[replayablePlannerKey];
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
      const replayableCompletedKey = choice.plannerResult
        && (["provider_failed_requires_explicit_retry", "provider_output_invalid",
          "provider_call_may_have_started"]
          .includes(choice.status)
          || attempt?.status === "provider_call_may_have_started"
          || interruptedLocalReplay || normalizationUpgradePending)
        ? [...choice.attemptKeys].reverse().find((attemptKey) => {
          const candidate = choice.attempts?.[attemptKey];
          return candidate?.status === "completed"
            && object(responseParts(candidate.safeOutput).decision)
            && candidate.localSemanticReplayVersion
              !== ACTION_SHAPE_NORMALIZATION_VERSION;
        }) : null;
      if (replayableCompletedKey) {
        match = await commit(match, (draft) => {
          const current = draft.decisions[choice.choiceKey];
          const storedAttempt = current.attempts[replayableCompletedKey];
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
          current.lastSemanticFailureSignature = null;
          current.repeatedSemanticFailureCount = 0;
          current.proposalValidationRounds = 0;
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
          match = await commit(match, (draft) => {
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
        && attempt.localSemanticReplayVersion
          !== ACTION_SHAPE_NORMALIZATION_VERSION) {
        match = await commit(match, (draft) => {
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
        match = await commit(match, (draft) => {
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
      if (choice.status === "retry_ready"
        || input.retryApproved === true
          && EXPLICIT_RETRY_CHOICE_STATUSES.has(choice.status)) {
        match = await commit(match, (draft) => {
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
      if (stage === "action") {
        const selected = actionIndex(input.spatialActionSpace).find((entry) =>
          entry.id === choice.plannerResult.recommendedCandidateId);
        const actionType = String(selected?.action?.actionType || "");
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
            return rejection("LIVE_DECISION_LEGAL_FORMATION_OPTIONS_UNAVAILABLE",
              "High", {
                choiceKey: choice.choiceKey,
                candidateId: selected.id,
                reason: receipt?.reason || "formation_receipt_missing",
                automaticProviderRetryPerformed: false,
                projection: publicProjection(match),
              });
          }
          match = await commit(match, (draft) => {
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
            return rejection(
              "LIVE_DECISION_LEGAL_ASSET_PLACEMENT_OPTIONS_UNAVAILABLE",
              "High", {
                choiceKey: choice.choiceKey,
                candidateId: selected.id,
                reason: receipt?.reason || "asset_placement_receipt_missing",
                automaticProviderRetryPerformed: false,
                projection: publicProjection(match),
              });
          }
          match = await commit(match, (draft) => {
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
          match = await commit(match, (draft) => {
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
        match = await commit(match, (draft) => {
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
        const query = await runQueries(input, parts.queries);
        match = await commit(match, (draft) => {
          const current = draft.decisions[choice.choiceKey];
          current.processedAttemptKeys.push(attempt.attemptKey);
          current.queryRounds += 1;
          current.stageQueryRounds += 1;
          const known = new Set(current.queryReceipts.map((entry) =>
            entry.queryReceiptHash));
          for (const receipt of query.receipts) {
            if (!known.has(receipt.queryReceiptHash)) {
              known.add(receipt.queryReceiptHash);
              current.queryReceipts.push(receipt);
            }
          }
          current.warnings.push(...query.warnings);
          current.status = "generating";
        });
        continue;
      }
      if (parts.queries.length && choice.stageQueryRounds >= queryRoundLimit) {
        match = await commit(match, (draft) => {
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
        let plannerResult;
        try {
          plannerResult = normalizePlannerOutput(
            parts.terminal ? mapPlanningSubmission(parts.planning, input)
              : parts.planning,
            input,
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
        match = await commit(match, (draft) => {
          const current = draft.decisions[choice.choiceKey];
          current.stage = "action";
          current.plannerResult = clone(plannerResult);
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
        const submittedAction = parts.terminal
          ? mapDecisionSubmission(parts.decision, input, choice)
          : parts.decision;
        const plannerBoundAction = bindPlannerSelectedProposal(submittedAction,
          input, choice.plannerResult);
        const formationBoundAction = bindFormationSelection(
          plannerBoundAction, choice.queryReceipts);
        const assetBoundAction = bindAssetPlacementSelection(formationBoundAction,
          choice.queryReceipts);
        const boundAction = bindExactInstantiatedProposal(assetBoundAction,
          choice.queryReceipts, choice.plannerResult);
        normalizedAction = normalizeActionOutputShape(boundAction);
        validateActionOutput(normalizedAction, input, choice.plannerResult);
        const composed = {
          ...clone(normalizedAction),
          plannerResult: clone(choice.plannerResult),
          plan: clone(choice.plannerResult.plan),
          assessment: clone(choice.plannerResult.assessment),
          planRevision: clone(choice.plannerResult.planRevision),
        };
        decision = normalizeDecision(composed, input, match,
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
        match = await commit(match, (draft) => {
          const current = draft.decisions[choice.choiceKey];
          const storedAttempt = current.attempts[attempt.attemptKey];
          storedAttempt.localSemanticReplayVersion =
            ACTION_SHAPE_NORMALIZATION_VERSION;
          current.proposalValidationRounds =
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
            if (!current.processedAttemptKeys.includes(attempt.attemptKey)) {
              current.processedAttemptKeys.push(attempt.attemptKey);
            }
            const failureSignature = hashStarcraftTmgContract({
              candidateId: decision.candidateId,
              parameters: decision.proposal.parameters,
              reason: receipt?.reason || "validation_receipt_missing",
            });
            current.repeatedProposalValidationFailureCount =
              current.lastProposalValidationFailureSignature === failureSignature
                ? Number(current.repeatedProposalValidationFailureCount || 0) + 1
                : 1;
            current.lastProposalValidationFailureSignature = failureSignature;
            current.warnings.push(`PARAMETERIZED_PROPOSAL_REJECTED:${
              receipt?.reason || "validation_receipt_missing"}`);
            current.status = Number(current.proposalValidationRounds)
              >= maxToolRounds
              || current.repeatedProposalValidationFailureCount >= 2
              ? "provider_output_invalid" : "generating";
          }
        });
        choice = match.decisions[choice.choiceKey];
        if (!exact) {
          if (choice.proposalValidationRounds >= maxToolRounds
            || choice.repeatedProposalValidationFailureCount >= 2) {
            return rejection("LIVE_DECISION_PARAMETERIZED_PROPOSAL_DID_NOT_CONVERGE",
              "High", {
                choiceKey: choice.choiceKey,
                proposalValidationRounds: choice.proposalValidationRounds,
                lastRulesReason: receipt?.reason || "validation_receipt_missing",
                automaticProviderRetryPerformed: true,
                projection: publicProjection(match),
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
        decision = normalizeDecision(composed, input, match,
          choice.queryReceipts, providerTrace(match, choice, crossed));
      }
      decision = freeze({
        ...clone(decision),
        promptPolicyObservation:
          promptPolicyObservation(match, choice, decision, input),
      });
      try {
        match = await commit(match, (draft) => {
          const current = draft.decisions[choice.choiceKey];
          current.status = "completed";
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
      const forcedFinite = choice.actionIndex.length === 1
        && choice.actionIndex[0].kind === "finite"
        ? choice.actionIndex[0] : null;
      if (forcedFinite) {
        const actionType = forcedFinite.action?.actionType || "rules continuation";
        const decision = normalizeDecision({
          proposal: clone(forcedFinite.proposal),
          selectedReason:
            `Rules exposes exactly one finite continuation (${actionType}); no strategic model choice exists.`,
          scoreOrPositionValue:
            "Preserves the authoritative lifecycle and reaches the next real decision point.",
          risk: "No alternative current legal action exists.",
          publicDecisionSummary: {
            visibleFacts: ["Current ActionSpace contains one finite action and no parameter domain."],
            plan: "Advance the Rules-owned lifecycle without spending a model call.",
          },
        }, input, match, [], freeze({
          ...clone(providerTrace(match, choice, [])),
          deterministicHostStep: true,
          providerCalls: 0,
          paidProviderUsed: false,
        }));
        match = await commit(match, (draft) => {
          const current = draft.decisions[choice.choiceKey];
          current.status = "completed";
          current.completedDecision = clone(decision);
          current.completedAt = instant(now(), "now");
        });
        return freeze({ ...clone(decision), ok: true,
          idempotentReplay: false, choiceKey: choice.choiceKey });
      }
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
      match = await commit(match, (draft) => {
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
      promptPolicyVersion: PROMPT_POLICY_VERSION,
      terminalSubmissionProtocol:
        "deepseek_beta_strict_function_tools_required",
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
