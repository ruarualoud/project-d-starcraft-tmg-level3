import { hashStarcraftTmgContract } from
  "../authoritative-engine/transition-v1.mjs";
import { resolveStarcraftTmgEffectiveActingSideV1 } from
  "./effective-acting-side-v1.mjs";

export const STARCRAFT_TMG_TURN_PLAN_RUNTIME_VERSION =
  "starcraft_tmg_turn_plan_runtime_v1";

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

function seal(value, hashField) {
  const unsigned = clone(value);
  return deepFreeze({ ...unsigned, [hashField]: hashStarcraftTmgContract(unsigned) });
}

function required(value, field) {
  const normalized = String(value || "").trim();
  if (!normalized) throw new TypeError(`${field} is required`);
  return normalized;
}

function scope(input) {
  if (!object(input)) throw new TypeError("scope is required");
  const value = {
    gameId: required(input.gameId, "scope.gameId"),
    roomId: required(input.roomId, "scope.roomId"),
    matchBindingHash: required(input.matchBindingHash, "scope.matchBindingHash"),
    seatKey: required(input.seatKey, "scope.seatKey"),
  };
  if (value.gameId !== "starcraft-tmg") {
    throw new TypeError("scope.gameId must be starcraft-tmg");
  }
  return deepFreeze({ ...value, scopeKey: hashStarcraftTmgContract(value) });
}

function authority(input, expectedScope) {
  const projection = input.roomProjection;
  const legalSpace = input.legalSpace;
  const actionSpace = input.spatialActionSpace;
  if (!object(projection?.room) || !object(projection?.matchBinding)
    || projection.room.roomId !== expectedScope.roomId
    || projection.matchBinding.bindingHash !== expectedScope.matchBindingHash
    || !object(legalSpace)
    || legalSpace.roomId !== expectedScope.roomId
    || legalSpace.matchBindingHash !== expectedScope.matchBindingHash
    || legalSpace.stateRevision !== projection.room.stateRevision
    || legalSpace.stateHash !== projection.room.stateHash
    || !object(actionSpace)
    || actionSpace.authority?.stateRevision !== projection.room.stateRevision
    || actionSpace.authority?.stateHash !== projection.room.stateHash
    || actionSpace.authority?.legalSpaceHash !== legalSpace.legalSpaceHash) {
    throw new TypeError("TurnPlan inputs do not share one current authority");
  }
  const state = projection.state || {};
  const actingSide = resolveStarcraftTmgEffectiveActingSideV1(state);
  const round = Number(state.round || 1);
  const phase = String(state.phase || "unknown");
  const publicLog = Array.isArray(state.log) ? state.log : [];
  return deepFreeze({
    roomId: expectedScope.roomId,
    matchBindingHash: expectedScope.matchBindingHash,
    seatKey: expectedScope.seatKey,
    stateRevision: projection.room.stateRevision,
    stateHash: projection.room.stateHash,
    legalSpaceHash: legalSpace.legalSpaceHash,
    spatialObservationHash: input.spatialObservation?.observationHash || null,
    spatialActionSpaceHash: actionSpace.actionSpaceHash,
    publicLogCursor: publicLog.length,
    publicLogHash: hashStarcraftTmgContract(publicLog),
    round,
    phase,
    activeSideKey: actingSide.activeSideKey,
    firstPlayerSideKey: actingSide.firstPlayerSideKey,
    effectiveActingSideKey: actingSide.sideKey,
    effectiveActingSideSource: actingSide.source,
    ownPassedCurrentPhase:
      state.players?.[expectedScope.seatKey]?.passedPhases?.[phase] === true,
    phaseFirstActorChoice:
      clone(state.phaseFirstActorByRound?.[`${round}:${phase}`] || null),
  });
}

function strings(value) {
  return Array.isArray(value)
    ? value.map((entry) => String(entry || "").trim()).filter(Boolean) : [];
}

function objects(value, field) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.some((entry) => !object(entry))) {
    throw new TypeError(`${field} must be an array of objects`);
  }
  return clone(value);
}

function normalizeTradeoffs(value) {
  if (!Array.isArray(value) || !value.length) {
    throw new TypeError("intent.tradeoffs requires at least one tradeoff");
  }
  return value.map((entry, index) => {
    if (!object(entry)) throw new TypeError(`intent.tradeoffs[${index}] is invalid`);
    return {
      benefit: required(entry.benefit, `intent.tradeoffs[${index}].benefit`),
      cost: required(entry.cost, `intent.tradeoffs[${index}].cost`),
      acceptanceReason: required(entry.acceptanceReason,
        `intent.tradeoffs[${index}].acceptanceReason`),
    };
  });
}

function normalizeOpponentResponses(value) {
  if (!Array.isArray(value) || !value.length) {
    throw new TypeError(
      "intent.predictedOpponentResponses requires at least one response");
  }
  return value.map((entry, index) => {
    if (!object(entry)) {
      throw new TypeError(`intent.predictedOpponentResponses[${index}] is invalid`);
    }
    const actionClass = String(entry.actionClass || entry.actionType
      || "unknown_action");
    const confidence = entry.confidence === undefined
      ? 0.5 : Number(entry.confidence);
    if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
      throw new TypeError(
        `intent.predictedOpponentResponses[${index}].confidence is invalid`);
    }
    const horizonSource = object(entry.horizon) ? entry.horizon : {};
    const horizonKind = String(horizonSource.kind
      || "next_opponent_action");
    if (!new Set(["next_opponent_action", "current_phase", "current_round",
      "bounded_public_transitions"]).has(horizonKind)) {
      throw new TypeError(
        `intent.predictedOpponentResponses[${index}].horizon is invalid`);
    }
    const horizonCount = Number(horizonSource.count || 1);
    if (!Number.isSafeInteger(horizonCount) || horizonCount < 1
      || horizonCount > 64) {
      throw new TypeError(
        `intent.predictedOpponentResponses[${index}].horizon.count is invalid`);
    }
    return {
      responseId: String(entry.responseId || `response-${index + 1}`),
      actionClass,
      opponentAction: required(entry.opponentAction,
        `intent.predictedOpponentResponses[${index}].opponentAction`),
      likelyActorUnitId: String(entry.likelyActorUnitId
        || entry.actorUnitId || "") || null,
      likelyTargetUnitId: String(entry.likelyTargetUnitId
        || entry.targetUnitId || "") || null,
      horizon: { kind: horizonKind, count: horizonCount },
      confidence,
      basis: strings(entry.basis),
      evidenceRefs: strings(entry.evidenceRefs).length
        ? strings(entry.evidenceRefs) : strings(entry.basis),
      invalidationCriteria: strings(entry.invalidationCriteria).length
        ? strings(entry.invalidationCriteria)
        : [String(entry.replanIf
          || "the observed opponent action differs materially")],
      counterResponse: required(entry.counterResponse,
        `intent.predictedOpponentResponses[${index}].counterResponse`),
      counterPurpose: required(entry.counterPurpose,
        `intent.predictedOpponentResponses[${index}].counterPurpose`),
      replanIf: entry.replanIf ? String(entry.replanIf) : null,
      probabilityEvidenceRef: entry.probabilityEvidenceRef || null,
      assessmentAuthority: entry.probabilityEvidenceRef
        ? "referenced_query_receipt" : "strategic_hypothesis",
    };
  });
}

function normalizePlanAssessment(value, authorityValue, plan) {
  if (!object(value)) throw new TypeError("assessment is required");
  const verdict = required(value.verdict, "assessment.verdict");
  if (!["continue", "revise", "complete", "abandon"].includes(verdict)) {
    throw new TypeError("assessment.verdict is unsupported");
  }
  const health = required(value.health, "assessment.health");
  if (!["sound", "at_risk", "invalid", "achieved"].includes(health)) {
    throw new TypeError("assessment.health is unsupported");
  }
  return {
    planRef: {
      planId: plan.planId,
      version: plan.version,
      planHash: plan.planHash,
    },
    authority: clone(authorityValue),
    verdict,
    health,
    continuitySummary: required(value.continuitySummary,
      "assessment.continuitySummary"),
    currentGoal: required(value.currentGoal || plan.currentGoal || plan.objective,
      "assessment.currentGoal"),
    evidenceFor: strings(value.evidenceFor),
    evidenceAgainst: strings(value.evidenceAgainst),
    changedAssumptions: strings(value.changedAssumptions),
    opponentModelUpdates: strings(value.opponentModelUpdates),
    unresolvedRisks: strings(value.unresolvedRisks),
    nextDecisionFocus: required(value.nextDecisionFocus,
      "assessment.nextDecisionFocus"),
    revisionReason: value.revisionReason ? String(value.revisionReason) : null,
    publicReasoningPolicy:
      "auditable_summary_and_evidence_only_no_hidden_chain_of_thought",
  };
}

function planSpec(input) {
  const objective = required(input.objective, "plan.objective");
  return {
    objective,
    currentGoal: required(input.currentGoal || objective, "plan.currentGoal"),
    strategicApproach: strings(input.strategicApproach),
    successSignals: strings(input.successSignals),
    activationPriorities: strings(input.activationPriorities),
    resourcePolicy: strings(input.resourcePolicy),
    initiativePolicy: strings(input.initiativePolicy),
    reservePolicy: strings(input.reservePolicy),
    reviseIf: strings(input.reviseIf),
    assumptions: strings(input.assumptions),
    opponentModel: strings(input.opponentModel),
    contingencies: strings(input.contingencies),
  };
}

function planProjection(state) {
  return state.plan ? clone(state.plan) : null;
}

function resealPlan(plan, updates) {
  const current = clone(plan);
  delete current.planHash;
  return seal({ ...current, ...clone(updates) }, "planHash");
}

function planRecord(plan) {
  return {
    planId: plan.planId,
    version: plan.version,
    objective: plan.objective,
    currentGoal: plan.currentGoal,
    strategicApproach: plan.strategicApproach,
    successSignals: plan.successSignals,
    activationPriorities: plan.activationPriorities,
    resourcePolicy: plan.resourcePolicy,
    initiativePolicy: plan.initiativePolicy,
    reservePolicy: plan.reservePolicy,
    reviseIf: plan.reviseIf,
    assumptions: plan.assumptions,
    opponentModel: plan.opponentModel,
    contingencies: plan.contingencies,
    status: plan.status,
    revisionReason: plan.revisionReason,
    lastAssessmentRef: plan.lastAssessmentRef,
    lastValidatedAuthority: plan.lastValidatedAuthority,
  };
}

function planState(scopeValue) {
  return {
    scope: scopeValue,
    plan: null,
    lastAssessment: null,
    reflectionRequired: true,
    nextIntent: null,
    intents: [],
    outcomes: [],
    predictionCalibrations: [],
    calibratedPredictionKeys: new Set(),
    searchJob: null,
    sequence: 0,
    issues: [],
    hydratedFromContinuity: false,
  };
}

function proposalInActionSpace(proposal, actionSpace) {
  if (proposal?.kind === "finite") {
    return actionSpace.finiteActions?.some((entry) =>
      entry.candidateId === proposal.actionKey);
  }
  if (proposal?.kind === "parameterized") {
    return actionSpace.parameterDomains?.some((entry) =>
      entry.domainId === proposal.domainId) && object(proposal.parameters);
  }
  return false;
}

function queryRefs(receipts, authorityValue) {
  return (Array.isArray(receipts) ? receipts : []).map((receipt) => {
    if (!object(receipt)
      || receipt.authority?.roomId !== authorityValue.roomId
      || receipt.authority?.stateHash !== authorityValue.stateHash
      || receipt.authority?.legalSpaceHash !== authorityValue.legalSpaceHash
      || !["exact", "advisory_estimate", "unknown"].includes(receipt.status)) {
      throw new TypeError("ActionIntent query receipt is stale or invalid");
    }
    return {
      queryKind: receipt.queryKind,
      status: receipt.status,
      queryReceiptHash: receipt.queryReceiptHash,
      rulesAuthority: receipt.status === "exact",
    };
  });
}

function searchProjection(job) {
  if (!job) return null;
  return {
    searchId: job.searchId,
    status: job.status,
    checkpoint: clone(job.checkpoint),
    branchCount: job.branchCount,
    startedAt: job.startedAt,
    completedAt: job.completedAt || null,
    failure: clone(job.failure || null),
    result: job.status === "ready" ? clone(job.result) : null,
    hypotheticalOnly: true,
    liveRoomMutationCalls: 0,
    eligibleForTraining: false,
    trainingTruth: false,
  };
}

export function createStarcraftTmgTurnPlanRuntimeV1(options = {}) {
  const continuity = options.decisionContinuity || null;
  if (continuity && typeof continuity.record !== "function") {
    throw new TypeError("decisionContinuity.record is required when configured");
  }
  const counterfactualExecutor = typeof options.counterfactualExecutor === "function"
    ? options.counterfactualExecutor : null;
  const now = typeof options.now === "function"
    ? options.now : () => new Date().toISOString();
  const states = new Map();

  function getState(scopeValue) {
    let state = states.get(scopeValue.scopeKey);
    if (!state) {
      state = planState(scopeValue);
      states.set(scopeValue.scopeKey, state);
    }
    return state;
  }

  async function hydrate(input = {}) {
    const scopeValue = scope(input.scope);
    const state = getState(scopeValue);
    if (state.hydratedFromContinuity || !continuity
      || typeof continuity.query !== "function") {
      state.hydratedFromContinuity = true;
      return { ok: true, restored: Boolean(state.plan),
        plan: planProjection(state) };
    }
    const result = await continuity.query({
      scope: scopeValue,
      query: {
        kinds: ["turn_plan", "plan_revision", "action_intent",
          "decision_outcome", "prediction_calibration"],
        order: "oldest_first",
        limit: 100_000,
      },
    });
    const records = Array.isArray(result?.records) ? result.records : [];
    const planSource = records.filter((entry) =>
      entry.kind === "turn_plan" || entry.kind === "plan_revision").at(-1);
    if (object(planSource?.payload)) {
      const payload = planSource.payload;
      const at = new Date(now()).toISOString();
      state.plan = seal({
        schemaVersion: `${STARCRAFT_TMG_TURN_PLAN_RUNTIME_VERSION}.plan`,
        planId: required(payload.planId, "restoredPlan.planId"),
        version: Number.isSafeInteger(Number(payload.version))
          ? Number(payload.version) : 1,
        parentVersion: payload.parentVersion ?? null,
        ...planSpec(payload),
        status: String(payload.status || "reflection_required"),
        revisionReason: "restored_from_same_match_journal",
        nextIntentRef: null,
        lastAssessmentRef: clone(payload.lastAssessmentRef || null),
        lastValidatedAuthority: clone(payload.lastValidatedAuthority || null),
        createdAt: String(payload.createdAt || at),
        updatedAt: at,
        rulesAuthority: "external_rules_service",
        mayOverrideRules: false,
        eligibleForTraining: false,
        trainingTruth: false,
      }, "planHash");
      state.reflectionRequired = true;
    }
    state.intents = records.filter((entry) => entry.kind === "action_intent"
      && object(entry.payload)).map((entry) => clone(entry.payload));
    state.outcomes = records.filter((entry) => entry.kind === "decision_outcome"
      && object(entry.payload)).map((entry) => clone(entry.payload));
    state.predictionCalibrations = records.filter((entry) =>
      entry.kind === "prediction_calibration" && object(entry.payload))
      .map((entry) => clone(entry.payload));
    state.calibratedPredictionKeys = new Set(state.predictionCalibrations
      .map((entry) => `${entry.intentId}:${entry.responseId}`));
    state.sequence = records.reduce((maximum, entry) =>
      Math.max(maximum, Number(entry.sequence || 0)), state.sequence);
    state.hydratedFromContinuity = true;
    return {
      ok: true,
      restored: Boolean(state.plan),
      recordCount: records.length,
      plan: planProjection(state),
    };
  }

  async function persistPlan(state, input) {
    if (!continuity || !state.plan) return null;
    return continuity.record({
      scope: state.scope,
      roomProjection: input.roomProjection,
      legalSpace: input.legalSpace,
      turnPlan: planRecord(state.plan),
    });
  }

  function makePlan(state, spec, authorityValue, reason, parentVersion = null) {
    state.sequence += 1;
    const createdAt = new Date(now()).toISOString();
    const planId = state.plan?.planId || `turn-plan-${hashStarcraftTmgContract({
      scopeKey: state.scope.scopeKey,
      objective: spec.objective,
      createdAt,
      sequence: state.sequence,
    })}`;
    const version = state.plan ? state.plan.version + 1 : 1;
    return seal({
      schemaVersion: `${STARCRAFT_TMG_TURN_PLAN_RUNTIME_VERSION}.plan`,
      planId,
      version,
      parentVersion,
      ...clone(spec),
      status: "reflection_required",
      revisionReason: reason,
      nextIntentRef: null,
      lastAssessmentRef: null,
      lastValidatedAuthority: clone(authorityValue),
      createdAt,
      updatedAt: createdAt,
      rulesAuthority: "external_rules_service",
      mayOverrideRules: false,
      eligibleForTraining: false,
      trainingTruth: false,
    }, "planHash");
  }

  async function openPlan(state, input, authorityValue) {
    const spec = planSpec(input.plan || {});
    state.plan = makePlan(state, spec, authorityValue,
      state.plan ? "explicit_plan_replacement" : "initial_plan");
    state.lastAssessment = null;
    state.reflectionRequired = true;
    state.nextIntent = null;
    const persistence = await persistPlan(state, input);
    return { event: "plan_opened", plan: planProjection(state), persistence };
  }

  function cancelStaleSearch(state, authorityValue) {
    const job = state.searchJob;
    if (!job || !["queued", "running"].includes(job.status)
      || job.checkpoint.stateHash === authorityValue.stateHash) return;
    job.status = "stale";
    job.failure = { code: "counterfactual_checkpoint_stale" };
    job.completedAt = new Date(now()).toISOString();
    job.controller.abort();
  }

  function publicAction(entry) {
    const action = object(entry?.action?.sourceAction)
      ? entry.action.sourceAction : entry?.action;
    if (!object(action)) return null;
    return {
      logId: String(entry.id || "") || null,
      round: Number(entry.round || 0) || null,
      phase: String(entry.phase || "") || null,
      sideKey: String(action.sideKey || "") || null,
      actionClass: String(action.actionType || action.resolutionStage || "")
        || null,
      actorUnitId: String(action.pieceId || action.actorUnitId || "") || null,
      targetUnitId: String(action.targetId || action.targetUnitId || "") || null,
    };
  }

  function horizonExpired(prediction, intent, authorityValue,
    observedTransitionCount) {
    const horizon = prediction.horizon || { kind: "next_opponent_action", count: 1 };
    if (horizon.kind === "current_phase") {
      return intent.authority.round !== authorityValue.round
        || intent.authority.phase !== authorityValue.phase;
    }
    if (horizon.kind === "current_round") {
      return intent.authority.round !== authorityValue.round;
    }
    if (horizon.kind === "bounded_public_transitions") {
      return observedTransitionCount >= Number(horizon.count || 1);
    }
    return false;
  }

  function classifyPrediction(prediction, actual) {
    if (!actual?.actionClass) return "unobservable";
    const checks = [
      actual.actionClass === prediction.actionClass,
      prediction.likelyActorUnitId
        ? actual.actorUnitId === prediction.likelyActorUnitId : true,
      prediction.likelyTargetUnitId
        ? actual.targetUnitId === prediction.likelyTargetUnitId : true,
    ];
    if (checks.every(Boolean)) return "hit";
    if (checks.some(Boolean)) return "partial";
    return "miss";
  }

  async function calibratePredictions(state, input, authorityValue) {
    const publicLog = Array.isArray(input.roomProjection?.state?.log)
      ? input.roomProjection.state.log : [];
    const calibrations = [];
    for (const intent of state.intents) {
      const cursor = Number(intent.authority?.publicLogCursor || 0);
      const newEntries = publicLog.slice(cursor);
      const opponentActions = newEntries.map(publicAction).filter((entry) =>
        entry && entry.sideKey && entry.sideKey !== state.scope.seatKey);
      for (const prediction of intent.predictedOpponentResponses || []) {
        const key = `${intent.intentId}:${prediction.responseId}`;
        if (state.calibratedPredictionKeys.has(key)) continue;
        const actual = opponentActions[0] || null;
        let classification = null;
        if (actual) classification = classifyPrediction(prediction, actual);
        else if (horizonExpired(prediction, intent, authorityValue,
          newEntries.length)) classification = "expired";
        if (!classification) continue;
        const payloadBody = {
          schemaVersion:
            `${STARCRAFT_TMG_TURN_PLAN_RUNTIME_VERSION}.prediction-calibration`,
          intentId: intent.intentId,
          planId: intent.planRef.planId,
          responseId: prediction.responseId,
          classification,
          prediction: clone(prediction),
          actual,
          authorityObserved: clone(authorityValue),
          delta: {
            actionClassMatched: actual
              ? actual.actionClass === prediction.actionClass : null,
            actorMatched: actual && prediction.likelyActorUnitId
              ? actual.actorUnitId === prediction.likelyActorUnitId : null,
            targetMatched: actual && prediction.likelyTargetUnitId
              ? actual.targetUnitId === prediction.likelyTargetUnitId : null,
          },
          nextPlannerObligation:
            "cite_this_calibration_and_explicitly_retain_or_revise_the_plan",
          advisoryMemoryOnly: true,
          eligibleForTraining: false,
          trainingTruth: false,
        };
        const payload = seal(payloadBody, "calibrationHash");
        calibrations.push(payload);
        state.predictionCalibrations.push(payload);
        state.calibratedPredictionKeys.add(key);
      }
    }
    if (calibrations.length && continuity) {
      await continuity.record({
        scope: state.scope,
        roomProjection: input.roomProjection,
        legalSpace: input.legalSpace,
        events: calibrations.map((payload) => ({
          kind: "prediction_calibration",
          payload,
        })),
      });
    }
    return calibrations;
  }

  async function observeState(state, input, authorityValue) {
    cancelStaleSearch(state, authorityValue);
    if (!state.plan) return { event: "state_observed", status: "no_active_plan" };
    const predictionCalibrations = await calibratePredictions(
      state, input, authorityValue);
    const previous = state.plan.lastValidatedAuthority;
    const changed = previous.stateHash !== authorityValue.stateHash;
    const signals = strings(input.observedSignals);
    const triggered = state.plan.reviseIf.filter((entry) => signals.includes(entry));
    const nextIntentStillLegal = state.nextIntent
      ? proposalInActionSpace(state.nextIntent.proposal, input.spatialActionSpace)
      : null;
    const initiativeChanged = previous.firstPlayerSideKey
      !== authorityValue.firstPlayerSideKey;
    const revisionReasons = [
      ...triggered.map((entry) => `revise_if:${entry}`),
      ...(state.nextIntent && !nextIntentStillLegal
        ? ["planned_intent_absent_from_current_action_space"] : []),
      ...(initiativeChanged ? ["first_player_marker_changed"] : []),
    ];
    const status = revisionReasons.length
      ? "revision_required" : "reflection_required";
    state.reflectionRequired = true;
    state.plan = resealPlan(state.plan, {
      status,
      revisionReason: revisionReasons.join(";") || (changed
        ? "authority_changed_plan_still_applicable" : "authority_unchanged"),
      nextIntentRef: nextIntentStillLegal ? {
        intentId: state.nextIntent.intentId,
        intentHash: state.nextIntent.intentHash,
      } : null,
      lastValidatedAuthority: clone(authorityValue),
      updatedAt: new Date(now()).toISOString(),
    });
    if (state.nextIntent) state.nextIntent = null;
    const persistence = changed ? await persistPlan(state, input) : null;
    return {
      event: "state_observed",
      status,
      reflectionRequired: true,
      authorityChanged: changed,
      revisionReasons,
      nextIntentStillLegal,
      predictionCalibrations: clone(predictionCalibrations),
      predictionCalibrationRequiresExplicitPlanDisposition:
        predictionCalibrations.length > 0,
      persistence,
    };
  }

  async function reflectPlan(state, input, authorityValue) {
    if (!state.plan) throw new TypeError("an active TurnPlan is required");
    const sourcePlan = state.plan;
    const normalized = normalizePlanAssessment(input.assessment, authorityValue,
      sourcePlan);
    const createdAt = new Date(now()).toISOString();
    const assessment = seal({
      schemaVersion:
        `${STARCRAFT_TMG_TURN_PLAN_RUNTIME_VERSION}.plan-assessment`,
      assessmentId: `plan-assessment-${hashStarcraftTmgContract({
        scopeKey: state.scope.scopeKey,
        planHash: sourcePlan.planHash,
        stateHash: authorityValue.stateHash,
        sequence: state.sequence + 1,
      })}`,
      ...normalized,
      createdAt,
      eligibleForTraining: false,
      trainingTruth: false,
    }, "assessmentHash");
    state.sequence += 1;

    if (assessment.verdict === "revise") {
      if (!object(input.planRevision)) {
        throw new TypeError("planRevision is required when verdict is revise");
      }
      const existing = planSpec(sourcePlan);
      const revised = planSpec({ ...existing, ...input.planRevision,
        currentGoal: input.planRevision.currentGoal || assessment.currentGoal });
      state.plan = makePlan(state, revised, authorityValue,
        assessment.revisionReason || "reflection_requested_revision",
        sourcePlan.version);
    } else {
      const terminalStatus = assessment.verdict === "complete"
        ? "completed" : assessment.verdict === "abandon" ? "abandoned" : null;
      state.plan = resealPlan(sourcePlan, {
        currentGoal: assessment.currentGoal,
        opponentModel: [...new Set([
          ...strings(sourcePlan.opponentModel),
          ...assessment.opponentModelUpdates,
        ])],
        status: terminalStatus || (authorityValue.effectiveActingSideKey
          === state.scope.seatKey
          ? "active" : "waiting_for_activation"),
        revisionReason: assessment.revisionReason ||
          `reflection_${assessment.verdict}_${assessment.health}`,
        lastValidatedAuthority: clone(authorityValue),
        updatedAt: createdAt,
      });
    }
    state.lastAssessment = assessment;
    state.reflectionRequired = false;
    state.nextIntent = null;
    state.plan = resealPlan(state.plan, {
      lastAssessmentRef: {
        assessmentId: assessment.assessmentId,
        assessmentHash: assessment.assessmentHash,
      },
      status: ["completed", "abandoned"].includes(state.plan.status)
        ? state.plan.status
        : authorityValue.effectiveActingSideKey === state.scope.seatKey
          ? "active" : "waiting_for_activation",
      updatedAt: createdAt,
    });
    const persistence = continuity ? await continuity.record({
      scope: state.scope,
      roomProjection: input.roomProjection,
      legalSpace: input.legalSpace,
      turnPlan: planRecord(state.plan),
      events: [
        { kind: "plan_reflection", payload: {
          ...clone(assessment),
          planId: sourcePlan.planId,
        } },
        ...(assessment.verdict === "revise" ? [{
          kind: "plan_revision",
          payload: planRecord(state.plan),
        }] : []),
      ],
    }) : null;
    return {
      event: "plan_reflected",
      assessment,
      plan: planProjection(state),
      reflectionRequired: false,
      persistence,
    };
  }

  async function createIntent(state, input, authorityValue) {
    if (!state.plan || state.reflectionRequired
      || state.lastAssessment?.authority?.stateHash !== authorityValue.stateHash) {
      throw new TypeError("a current PlanAssessment is required before a decision");
    }
    if (state.plan.status !== "active") {
      throw new TypeError("the agent seat is not active for an ActionIntent");
    }
    const proposal = clone(input.intent?.proposal);
    if (!proposalInActionSpace(proposal, input.spatialActionSpace)) {
      throw new TypeError("ActionIntent proposal is absent from current ActionSpace");
    }
    const refs = queryRefs(input.intent?.queryReceipts, authorityValue);
    const predictedOpponentResponses = normalizeOpponentResponses(
      input.intent?.predictedOpponentResponses);
    const tradeoffs = normalizeTradeoffs(input.intent?.tradeoffs);
    state.sequence += 1;
    const createdAt = new Date(now()).toISOString();
    const body = {
      schemaVersion: `${STARCRAFT_TMG_TURN_PLAN_RUNTIME_VERSION}.action-intent`,
      intentId: `action-intent-${hashStarcraftTmgContract({
        planHash: state.plan.planHash,
        proposal,
        stateHash: authorityValue.stateHash,
        sequence: state.sequence,
      })}`,
      planRef: {
        planId: state.plan.planId,
        version: state.plan.version,
        planHash: state.plan.planHash,
      },
      authority: clone(authorityValue),
      proposal,
      currentGoal: required(input.intent?.currentGoal || state.plan.currentGoal,
        "intent.currentGoal"),
      purpose: required(input.intent?.purpose, "intent.purpose"),
      decisionSummary: required(input.intent?.decisionSummary,
        "intent.decisionSummary"),
      planContinuity: required(input.intent?.planContinuity,
        "intent.planContinuity"),
      expectedOwnOutcome: required(input.intent?.expectedOwnOutcome,
        "intent.expectedOwnOutcome"),
      expectedEffects: strings(input.intent?.expectedEffects),
      predictedOpponentResponses,
      tradeoffs,
      risks: strings(input.intent?.risks),
      fallbacks: strings(input.intent?.fallbacks),
      stopOrReplanTriggers: strings(input.intent?.stopOrReplanTriggers),
      nextDecisionFocus: input.intent?.nextDecisionFocus
        || state.lastAssessment?.nextDecisionFocus || state.plan.currentGoal,
      unitIds: strings(input.intent?.unitIds),
      skillsUsed: strings(input.intent?.skillsUsed),
      abilitiesIntended: strings(input.intent?.abilitiesIntended),
      resourcesIntended: strings(input.intent?.resourcesIntended),
      rejectedAlternatives: clone(input.intent?.rejectedAlternatives || []),
      queryRefs: refs,
      unresolvedQueryKinds: refs.filter((entry) => entry.status === "unknown")
        .map((entry) => entry.queryKind),
      status: "planned_requires_current_preview",
      currentRulesInstantiationRequired: proposal.kind === "parameterized",
      currentPreviewRequired: true,
      confirmationAuthority: false,
      applyAuthority: false,
      createdAt,
      eligibleForTraining: false,
      trainingTruth: false,
    };
    const intent = seal(body, "intentHash");
    state.intents.push(intent);
    state.nextIntent = intent;
    const persistence = continuity ? await continuity.record({
      scope: state.scope,
      roomProjection: input.roomProjection,
      legalSpace: input.legalSpace,
      decision: {
        planId: state.plan.planId,
        intentId: intent.intentId,
        candidateId: proposal.kind === "finite"
          ? proposal.actionKey : proposal.domainId,
        currentGoal: intent.currentGoal,
        selectedReason: intent.purpose,
        decisionSummary: intent.decisionSummary,
        planContinuity: intent.planContinuity,
        scoreOrPositionValue: intent.expectedEffects.join("; ") || null,
        expectedOwnOutcome: intent.expectedOwnOutcome,
        predictedOpponentResponses: intent.predictedOpponentResponses,
        tradeoffs: intent.tradeoffs,
        risk: intent.risks.join("; ") || null,
        risks: intent.risks,
        fallbacks: intent.fallbacks,
        unitIds: intent.unitIds,
        abilitiesIntended: intent.abilitiesIntended,
        resourcesIntended: intent.resourcesIntended,
        nextDecisionFocus: intent.nextDecisionFocus,
        rejectedAlternatives: intent.rejectedAlternatives,
      },
      event: {
        kind: "action_intent",
        payload: clone(intent),
      },
      decisionStatus: "planned_requires_current_preview",
    }) : null;
    return { event: "intent_created", intent, persistence };
  }

  function startCounterfactual(state, input, authorityValue) {
    if (!state.plan || state.reflectionRequired
      || state.lastAssessment?.authority?.stateHash !== authorityValue.stateHash) {
      throw new TypeError(
        "a current PlanAssessment is required before counterfactual search");
    }
    const sourceBranches = Array.isArray(input.branches) ? input.branches : [];
    if (!sourceBranches.length) {
      throw new TypeError("counterfactual branches are required");
    }
    const branches = sourceBranches.map((entry, index) => {
      if (!object(entry) || !entry.branchId
        || !proposalInActionSpace(entry.proposal, input.spatialActionSpace)) {
        throw new TypeError(
          "counterfactual branches must be current ActionSpace proposals");
      }
      return {
        branchId: String(entry.branchId),
        proposal: clone(entry.proposal),
        currentGoal: required(entry.currentGoal || state.plan.currentGoal,
          `branches[${index}].currentGoal`),
        purpose: required(entry.purpose, `branches[${index}].purpose`),
        expectedOwnOutcome: required(entry.expectedOwnOutcome,
          `branches[${index}].expectedOwnOutcome`),
        predictedOpponentResponses:
          normalizeOpponentResponses(entry.predictedOpponentResponses),
        tradeoffs: normalizeTradeoffs(entry.tradeoffs),
        queryRefs: queryRefs(entry.queryReceipts, authorityValue),
      };
    });
    if (state.searchJob && ["queued", "running"].includes(state.searchJob.status)) {
      state.searchJob.status = "stale";
      state.searchJob.failure = { code: "superseded_by_new_counterfactual" };
      state.searchJob.controller.abort();
    }
    const checkpoint = {
      roomId: authorityValue.roomId,
      matchBindingHash: authorityValue.matchBindingHash,
      stateRevision: authorityValue.stateRevision,
      stateHash: authorityValue.stateHash,
      legalSpaceHash: authorityValue.legalSpaceHash,
      planHash: state.plan?.planHash || null,
    };
    const searchId = `counterfactual-${hashStarcraftTmgContract({
      checkpoint,
      branches,
      objectiveMetrics: input.objectiveMetrics || [],
    })}`;
    const controller = new AbortController();
    const job = {
      searchId,
      status: counterfactualExecutor ? "queued" : "unavailable",
      checkpoint,
      branchCount: branches.length,
      startedAt: new Date(now()).toISOString(),
      completedAt: counterfactualExecutor ? null : new Date(now()).toISOString(),
      failure: counterfactualExecutor ? null
        : { code: "counterfactual_executor_unavailable" },
      result: null,
      activePlan: planRecord(state.plan),
      planAssessment: clone(state.lastAssessment),
      controller,
    };
    state.searchJob = job;
    if (!counterfactualExecutor) return job;
    setImmediate(async () => {
      if (controller.signal.aborted || state.searchJob !== job) return;
      job.status = "running";
      try {
        const result = await counterfactualExecutor(deepFreeze({
          schemaVersion:
            `${STARCRAFT_TMG_TURN_PLAN_RUNTIME_VERSION}.counterfactual-request`,
          searchId,
          checkpoint: clone(checkpoint),
          playerViewRoomProjection: clone(input.roomProjection),
          spatialObservation: clone(input.spatialObservation || null),
          spatialActionSpace: clone(input.spatialActionSpace),
          activePlan: clone(job.activePlan),
          planAssessment: clone(job.planAssessment),
          branches,
          objectiveMetrics: clone(input.objectiveMetrics || []),
          horizon: clone(input.horizon || { kind: "bounded_activations", count: 1 }),
          liveRoomMutationAuthority: false,
          hypotheticalOnly: true,
          eligibleForTraining: false,
          trainingTruth: false,
        }), { signal: controller.signal });
        if (controller.signal.aborted || state.searchJob !== job) return;
        if (result?.checkpoint?.stateHash !== checkpoint.stateHash
          || result?.searchId !== searchId || !Array.isArray(result?.branches)) {
          job.status = "failed";
          job.failure = { code: "counterfactual_result_binding_mismatch" };
        } else {
          job.status = "ready";
          job.result = clone(result);
        }
      } catch (error) {
        if (controller.signal.aborted || state.searchJob !== job) return;
        job.status = "failed";
        job.failure = {
          code: "counterfactual_executor_failed",
          message: String(error?.message || error),
        };
      } finally {
        job.completedAt = new Date(now()).toISOString();
      }
    });
    return job;
  }

  async function adoptCounterfactual(state, input, authorityValue) {
    const job = state.searchJob;
    if (!state.plan || !job || job.status !== "ready"
      || job.checkpoint.stateHash !== authorityValue.stateHash
      || job.checkpoint.planHash !== state.plan.planHash) {
      throw new TypeError("a ready current counterfactual result is required");
    }
    const branchId = required(input.branchId, "branchId");
    const branch = job.result.branches.find((entry) => entry.branchId === branchId);
    if (!branch) throw new TypeError("counterfactual branch is unavailable");
    const existing = planSpec(state.plan);
    const updates = object(input.planRevision) ? input.planRevision : {};
    const revised = planSpec({ ...existing, ...updates });
    const previousVersion = state.plan.version;
    state.plan = makePlan(state, revised, authorityValue,
      `counterfactual_adopted:${job.searchId}:${branchId}`, previousVersion);
    state.lastAssessment = null;
    state.reflectionRequired = true;
    state.nextIntent = null;
    const persistence = continuity ? await continuity.record({
      scope: state.scope,
      roomProjection: input.roomProjection,
      legalSpace: input.legalSpace,
      turnPlan: planRecord(state.plan),
      event: {
        kind: "plan_revision",
        payload: {
          ...planRecord(state.plan),
          adoptionReason: required(input.adoptionReason, "adoptionReason"),
          adoptedCounterfactual: {
            searchId: job.searchId,
            branchId,
          },
        },
      },
    }) : null;
    return {
      event: "counterfactual_adopted",
      branch: clone(branch),
      plan: planProjection(state),
      reflectionRequired: true,
      persistence,
    };
  }

  async function recordOutcome(state, input, authorityValue) {
    const intentId = required(input.outcome?.intentId, "outcome.intentId");
    const intent = state.intents.find((entry) => entry.intentId === intentId);
    if (!intent) throw new TypeError("outcome intent is unavailable");
    const abilitiesUsed = objects(input.outcome.abilitiesUsed,
      "outcome.abilitiesUsed");
    const resourcesSpent = objects(input.outcome.resourcesSpent,
      "outcome.resourcesSpent");
    const unitIntentResults = objects(input.outcome.unitIntentResults,
      "outcome.unitIntentResults");
    const opponentResponsesObserved = objects(
      input.outcome.opponentResponsesObserved,
      "outcome.opponentResponsesObserved");
    const counterResponsesUsed = objects(input.outcome.counterResponsesUsed,
      "outcome.counterResponsesUsed");
    const outcome = seal({
      schemaVersion: `${STARCRAFT_TMG_TURN_PLAN_RUNTIME_VERSION}.outcome`,
      intentId,
      planId: intent.planRef.planId,
      preActionAuthority: clone(intent.authority),
      observedAuthority: clone(authorityValue),
      status: required(input.outcome.status, "outcome.status"),
      receiptHash: input.outcome.receiptHash || null,
      resultSummary: input.outcome.resultSummary || null,
      observedSignals: strings(input.outcome.observedSignals),
      planImpact: input.outcome.planImpact || null,
      abilitiesUsed,
      resourcesSpent,
      unitIntentResults,
      opponentResponsesObserved,
      counterResponsesUsed,
      hypothetical: false,
      eligibleForTraining: false,
      trainingTruth: false,
    }, "outcomeHash");
    state.outcomes.push(outcome);
    if (state.nextIntent?.intentId === intentId) state.nextIntent = null;
    state.reflectionRequired = true;
    const events = [
      ...abilitiesUsed.map((payload) => ({ kind: "ability_used", payload: {
        ...payload, intentId, planId: intent.planRef.planId,
      } })),
      ...resourcesSpent.map((payload) => ({ kind: "resource_spent", payload: {
        ...payload, intentId, planId: intent.planRef.planId,
      } })),
      ...unitIntentResults.map((payload) => ({
        kind: "unit_intent_result", payload: {
          ...payload, intentId, planId: intent.planRef.planId,
        },
      })),
      ...opponentResponsesObserved.map((payload) => ({
        kind: "opponent_response_observed", payload: {
          ...payload, intentId, planId: intent.planRef.planId,
        },
      })),
      ...counterResponsesUsed.map((payload) => ({
        kind: "counter_response_used", payload: {
          ...payload, intentId, planId: intent.planRef.planId,
        },
      })),
    ];
    const persistence = continuity ? await continuity.record({
      scope: state.scope,
      roomProjection: input.roomProjection,
      legalSpace: input.legalSpace,
      outcome,
      events,
    }) : null;
    return { event: "outcome_recorded", outcome, persistence };
  }

  async function recallHistory(state, input) {
    if (!continuity || typeof continuity.query !== "function") {
      return {
        event: "history_recall",
        status: "unavailable",
        reason: "decision_continuity_query_unavailable",
        records: [],
      };
    }
    const result = await continuity.query({
      scope: state.scope,
      query: clone(input.memoryQuery || {}),
    });
    return {
      event: "history_recall",
      status: "ready",
      result,
      source: "complete_same_match_event_log",
    };
  }

  async function dispatch(input = {}) {
    const scopeValue = scope(input.scope);
    const state = getState(scopeValue);
    if (!state.hydratedFromContinuity) await hydrate({ scope: scopeValue });
    const authorityValue = authority(input, scopeValue);
    const command = required(input.command, "command");
    let result;
    if (command === "open_plan") {
      result = await openPlan(state, input, authorityValue);
    } else if (command === "observe_state") {
      result = await observeState(state, input, authorityValue);
    } else if (command === "reflect_plan") {
      result = await reflectPlan(state, input, authorityValue);
    } else if (command === "create_intent") {
      result = await createIntent(state, input, authorityValue);
    } else if (command === "pause_counterfactual") {
      result = { event: "counterfactual_started",
        search: searchProjection(startCounterfactual(state, input, authorityValue)) };
    } else if (command === "adopt_counterfactual") {
      result = await adoptCounterfactual(state, input, authorityValue);
    } else if (command === "record_outcome") {
      result = await recordOutcome(state, input, authorityValue);
    } else if (command === "recall_history") {
      result = await recallHistory(state, input);
    } else {
      throw new TypeError(`unsupported TurnPlan command: ${command}`);
    }
    return seal({
      schemaVersion: `${STARCRAFT_TMG_TURN_PLAN_RUNTIME_VERSION}.transition`,
      command,
      scope: clone(scopeValue),
      authority: clone(authorityValue),
      result,
      plan: planProjection(state),
      lastAssessment: clone(state.lastAssessment),
      reflectionRequired: state.reflectionRequired,
      nextIntent: clone(state.nextIntent),
      counterfactual: searchProjection(state.searchJob),
      liveRoomMutationCalls: 0,
      confirmationCalls: 0,
      applyCalls: 0,
      trainingTruth: false,
    }, "transitionHash");
  }

  function read(input = {}) {
    const scopeValue = scope(input.scope);
    const state = states.get(scopeValue.scopeKey);
    return seal({
      schemaVersion: `${STARCRAFT_TMG_TURN_PLAN_RUNTIME_VERSION}.projection`,
      scope: clone(scopeValue),
      plan: state ? planProjection(state) : null,
      lastAssessment: state ? clone(state.lastAssessment) : null,
      reflectionRequired: state ? state.reflectionRequired : true,
      nextIntent: state ? clone(state.nextIntent) : null,
      intentCount: state?.intents.length || 0,
      outcomeCount: state?.outcomes.length || 0,
      counterfactual: state ? searchProjection(state.searchJob) : null,
      liveRoomMutationCalls: 0,
      eligibleForTraining: false,
      trainingTruth: false,
    }, "projectionHash");
  }

  return Object.freeze({
    metadata: Object.freeze({
      schemaVersion: `${STARCRAFT_TMG_TURN_PLAN_RUNTIME_VERSION}.metadata`,
      interface: ["hydrate", "dispatch", "read"],
      commands: ["open_plan", "observe_state", "reflect_plan", "create_intent",
        "pause_counterfactual", "adopt_counterfactual", "record_outcome",
        "recall_history"],
      decisionCycle:
        "plan_observe_reflect_hypothesize_compare_decide_preview_apply_outcome",
      decisionRecordPolicy:
        "plan_goal_purpose_opponent_response_counter_response_tradeoff",
      memoryAccess: continuity && typeof continuity.query === "function"
        ? "live_projection_plus_on_demand_event_query" : "live_projection_only",
      planScope: "same_match_same_seat",
      counterfactualExecution: counterfactualExecutor
        ? "asynchronous_checkpoint_fork" : "unavailable_returns_soft_status",
      counterfactualCriticalPathWaitMs: 0,
      rulesAuthority: "external_rules_service",
      mutationAuthority: false,
      trainingTruth: false,
    }),
    hydrate,
    dispatch,
    read,
  });
}
