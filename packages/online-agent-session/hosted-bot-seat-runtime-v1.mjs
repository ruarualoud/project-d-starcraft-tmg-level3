import { hashStarcraftTmgContract } from
  "../authoritative-engine/transition-v1.mjs";
import { resolveStarcraftTmgEffectiveActingSideV1 } from
  "./effective-acting-side-v1.mjs";

export const STARCRAFT_TMG_HOSTED_BOT_SEAT_RUNTIME_VERSION =
  "starcraft_tmg_hosted_bot_seat_runtime_v1";

const ACTIVE_LIFECYCLES = new Set(["active", "waiting_human", "paused"]);
const MATCH_MODES = Object.freeze({
  user_vs_agent: "opponent_prompt",
  agent_vs_agent: "selfplay_agent_prompt",
});

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

function required(value, field) {
  const normalized = String(value || "").trim();
  if (!normalized) throw new TypeError(`${field} is required`);
  return normalized;
}

function matchMode(value) {
  const normalized = required(value || "user_vs_agent", "matchMode");
  if (!Object.hasOwn(MATCH_MODES, normalized)) {
    throw new TypeError(`unsupported Hosted Bot Seat matchMode: ${normalized}`);
  }
  return normalized;
}

function iso(value, field) {
  const normalized = new Date(value).toISOString();
  if (!Number.isFinite(Date.parse(normalized))) {
    throw new TypeError(`${field} must be an ISO-8601 instant`);
  }
  return normalized;
}

function seal(value, hashField) {
  const unsigned = clone(value);
  return deepFreeze({
    ...unsigned,
    [hashField]: hashStarcraftTmgContract(unsigned),
  });
}

function scope(input = {}) {
  const value = {
    gameId: required(input.gameId || "starcraft-tmg", "scope.gameId"),
    roomId: required(input.roomId, "scope.roomId"),
    matchBindingHash: required(input.matchBindingHash,
      "scope.matchBindingHash"),
    seatKey: required(input.seatKey, "scope.seatKey"),
  };
  if (value.gameId !== "starcraft-tmg") {
    throw new TypeError("scope.gameId must be starcraft-tmg");
  }
  return deepFreeze({
    ...value,
    scopeKey: hashStarcraftTmgContract(value),
  });
}

function normalizeConsent(value = {}, scopeValue) {
  if (!object(value)
    || value.approved !== true
    || value.approvedBy !== "human"
    || value.scope !== "current_match_bot_seat") {
    throw new TypeError(
      "a human current-match Bot Seat automation consent is required");
  }
  return seal({
    schemaVersion:
      `${STARCRAFT_TMG_HOSTED_BOT_SEAT_RUNTIME_VERSION}.automation-consent`,
    approved: true,
    approvedBy: "human",
    scope: "current_match_bot_seat",
    roomId: scopeValue.roomId,
    matchBindingHash: scopeValue.matchBindingHash,
    seatKey: scopeValue.seatKey,
    approvedAt: iso(value.approvedAt, "automationConsent.approvedAt"),
    revocable: true,
    modelReceivesCredential: false,
    modelMayConfirm: false,
    modelMayApply: false,
    trainingTruth: false,
  }, "consentHash");
}

function normalizeDecision(value, input) {
  if (!object(value) || value.ok === false) {
    throw Object.assign(new Error("Bot decision port returned no decision"), {
      code: value?.reason || "bot_decision_unavailable",
    });
  }
  const proposal = object(value.proposal)
    ? clone(value.proposal)
    : value.candidateId
      ? { kind: "finite", actionKey: String(value.candidateId) }
      : null;
  if (!proposal || !new Set(["finite", "parameterized"]).has(proposal.kind)) {
    throw new TypeError("Bot decision requires a finite or parameterized proposal");
  }
  let selected;
  if (proposal.kind === "finite") {
    selected = input.spatialActionSpace.finiteActions?.find((entry) =>
      entry.candidateId === proposal.actionKey);
  } else {
    selected = input.spatialActionSpace.parameterDomains?.find((entry) =>
      entry.domainId === proposal.domainId);
    if (!object(proposal.parameters)) selected = null;
  }
  if (!selected) {
    throw Object.assign(new Error(
      "Bot decision proposal is absent from the current ActionSpace"), {
      code: "bot_decision_not_in_current_action_space",
    });
  }
  const candidateId = proposal.kind === "finite"
    ? proposal.actionKey : proposal.domainId;
  return deepFreeze({
    schemaVersion:
      `${STARCRAFT_TMG_HOSTED_BOT_SEAT_RUNTIME_VERSION}.decision`,
    candidateId,
    proposal,
    selectedReason: required(value.selectedReason, "decision.selectedReason"),
    scoreOrPositionValue: required(value.scoreOrPositionValue,
      "decision.scoreOrPositionValue"),
    risk: required(value.risk, "decision.risk"),
    rejectedAlternatives: Array.isArray(value.rejectedAlternatives)
      ? clone(value.rejectedAlternatives) : [],
    plan: object(value.plan) ? clone(value.plan) : null,
    assessment: object(value.assessment) ? clone(value.assessment) : null,
    planRevision: object(value.planRevision) ? clone(value.planRevision) : null,
    intent: object(value.intent) ? clone(value.intent) : null,
    publicDecisionSummary: object(value.publicDecisionSummary)
      ? clone(value.publicDecisionSummary) : null,
    speech: value.speech ? String(value.speech) : null,
    providerTrace: object(value.providerTrace)
      ? clone(value.providerTrace) : null,
    action: clone(selected.action || null),
    decisionSource: "injected_bot_decision_port",
    rulesAuthority: false,
    confirmationAuthority: false,
    applyAuthority: false,
    trainingTruth: false,
  });
}

function safeIssue(error, fallbackSeverity = "Medium") {
  return {
    code: String(error?.code || error?.message || "hosted_bot_seat_failure")
      .split(":")[0].slice(0, 160),
    severity: String(error?.severity || fallbackSeverity),
    message: String(error?.message || error).slice(0, 500),
  };
}

function highSeverity(reason) {
  return new Set([
    "AUTHENTICATION_REQUIRED",
    "SEAT_GRANT_INVALID",
    "CAPABILITY_DENIED",
    "CONTROL_LEASE_FENCED",
    "IDEMPOTENCY_CONFLICT",
    "PREVIEW_BINDING_MISMATCH",
    "REPLAY_MISMATCH",
    "BOT_ROOM_BINDING_MISMATCH",
  ]).has(String(reason || ""));
}

function newRecord(scopeValue, consent, at, mode) {
  return {
    schemaVersion:
      `${STARCRAFT_TMG_HOSTED_BOT_SEAT_RUNTIME_VERSION}.record`,
    revision: 0,
    scope: clone(scopeValue),
    consent: clone(consent),
    matchMode: mode,
    promptPack: MATCH_MODES[mode],
    lifecycle: "active",
    driveStatus: "attached",
    connectionEpoch: 1,
    actionCount: 0,
    replayVerifiedCount: 0,
    lastObservedStateRevision: null,
    lastObservedStateHash: null,
    lastAttemptedStateHash: null,
    lastAppliedStateRevision: null,
    lastDecision: null,
    lastReceiptHash: null,
    lastReplayMatchesCurrent: null,
    inflight: null,
    issues: [],
    traces: [],
    attachedAt: at,
    updatedAt: at,
    closedAt: null,
    trainingTruth: false,
  };
}

function project(record, connected) {
  if (!record) return null;
  const trace = record.traces.at(-1) || null;
  return seal({
    schemaVersion:
      `${STARCRAFT_TMG_HOSTED_BOT_SEAT_RUNTIME_VERSION}.projection`,
    scope: clone(record.scope),
    mode: record.matchMode || "user_vs_agent",
    promptPack: record.promptPack || "opponent_prompt",
    lifecycle: record.lifecycle,
    driveStatus: record.driveStatus,
    connected,
    connectionEpoch: record.connectionEpoch,
    authorization: {
      policy: "human_pre_authorized_current_match_bot_seat_v1",
      consentHash: record.consent.consentHash,
      revocable: true,
      modelReceivesCredential: false,
      modelConfirmCalls: 0,
      modelApplyCalls: 0,
    },
    actionCount: record.actionCount,
    replayVerifiedCount: record.replayVerifiedCount,
    lastObservedStateRevision: record.lastObservedStateRevision,
    lastObservedStateHash: record.lastObservedStateHash,
    lastAppliedStateRevision: record.lastAppliedStateRevision,
    lastDecision: record.lastDecision ? {
      candidateId: record.lastDecision.candidateId,
      selectedReason: record.lastDecision.selectedReason,
      scoreOrPositionValue: record.lastDecision.scoreOrPositionValue,
      risk: record.lastDecision.risk,
      speech: record.lastDecision.speech,
    } : null,
    lastReceiptHash: record.lastReceiptHash,
    lastReplayMatchesCurrent: record.lastReplayMatchesCurrent,
    recovery: {
      inflight: Boolean(record.inflight),
      stage: record.inflight?.stage || null,
      idempotencyKeyHash: record.inflight?.idempotencyKey
        ? hashStarcraftTmgContract(record.inflight.idempotencyKey) : null,
      secretMaterialProjected: false,
    },
    memory: trace ? {
      continuityContextHash: trace.continuityContextHash || null,
      turnPlanHash: trace.turnPlanHash || null,
      actionIntentHash: trace.actionIntentHash || null,
      eventLogPersistence: trace.eventLogPersistence || null,
    } : null,
    latestTrace: trace ? clone(trace) : null,
    issues: clone(record.issues.slice(-16)),
    eligibleForTraining: false,
    trainingTruth: false,
  }, "projectionHash");
}

export function createInMemoryStarcraftTmgHostedBotSeatStoreV1() {
  const records = new Map();
  return Object.freeze({
    durability: "process_memory_restart_simulatable",
    async load(scopeKey) {
      return clone(records.get(scopeKey) || null);
    },
    async commit(scopeKey, expectedRevision, nextRecord) {
      const current = records.get(scopeKey) || null;
      const observed = current ? current.revision : null;
      if (observed !== expectedRevision) {
        return { ok: false, reason: "BOT_SEAT_STORE_REVISION_CONFLICT",
          observedRevision: observed };
      }
      records.set(scopeKey, clone(nextRecord));
      return { ok: true, revision: nextRecord.revision };
    },
  });
}

export function createStarcraftTmgHostedBotSeatRuntimeV1(options = {}) {
  const room = options.roomPort;
  const decisionPort = options.decisionPort;
  const store = options.store
    || createInMemoryStarcraftTmgHostedBotSeatStoreV1();
  const continuity = options.decisionContinuity || null;
  const spatialObservationProjector = options.spatialObservationProjector || null;
  const spatialRuntime = options.spatialActionQueryRuntime || null;
  const turnPlanRuntime = options.turnPlanRuntime || null;
  const now = typeof options.now === "function"
    ? options.now : () => new Date().toISOString();
  const configuredMatchMode = matchMode(options.matchMode);
  const configuredPromptPack = MATCH_MODES[configuredMatchMode];
  const autoDriveIntervalMs = Math.max(100,
    Number(options.autoDriveIntervalMs || 750));
  for (const method of ["readRoom", "legalSpace", "previewAction",
    "confirmPreview", "claimControl", "applyAction", "replayRoom"]) {
    if (typeof room?.[method] !== "function") {
      throw new TypeError(`roomPort.${method} is required`);
    }
  }
  if (typeof decisionPort?.decide !== "function") {
    throw new TypeError("decisionPort.decide is required");
  }
  if (typeof store?.load !== "function" || typeof store?.commit !== "function") {
    throw new TypeError("BotSeatStore load/commit are required");
  }
  if (continuity && (typeof continuity.observe !== "function"
    || typeof continuity.record !== "function")) {
    throw new TypeError("decisionContinuity observe/record are required");
  }
  if (spatialObservationProjector
    && typeof spatialObservationProjector !== "function") {
    throw new TypeError("spatialObservationProjector must be a function");
  }
  if (spatialRuntime && typeof spatialRuntime.actionSpace !== "function") {
    throw new TypeError("spatialActionQueryRuntime.actionSpace is required");
  }
  if (turnPlanRuntime && (typeof turnPlanRuntime.dispatch !== "function"
    || typeof turnPlanRuntime.read !== "function")) {
    throw new TypeError("turnPlanRuntime dispatch/read are required");
  }

  const records = new Map();
  const credentials = new Map();
  const drives = new Map();
  const timers = new Map();
  let runtimeClosed = false;

  async function persist(record, update = {}) {
    const next = {
      ...clone(record),
      ...clone(update),
      revision: record.revision + 1,
      updatedAt: iso(now(), "now"),
    };
    const result = await store.commit(record.scope.scopeKey, record.revision,
      next);
    if (result?.ok !== true) {
      throw Object.assign(new Error("Bot Seat store commit failed"), {
        code: result?.reason || "BOT_SEAT_STORE_COMMIT_FAILED",
        severity: "High",
      });
    }
    records.set(record.scope.scopeKey, next);
    return next;
  }

  function schedule(scopeValue) {
    if (runtimeClosed || timers.has(scopeValue.scopeKey)) return;
    const timer = setTimeout(async () => {
      timers.delete(scopeValue.scopeKey);
      const record = records.get(scopeValue.scopeKey);
      if (!record || !ACTIVE_LIFECYCLES.has(record.lifecycle)
        || !credentials.has(scopeValue.scopeKey)) return;
      try { await drive({ scope: scopeValue }); } catch {}
      const current = records.get(scopeValue.scopeKey);
      if (current && ACTIVE_LIFECYCLES.has(current.lifecycle)) schedule(scopeValue);
    }, autoDriveIntervalMs);
    timer.unref?.();
    timers.set(scopeValue.scopeKey, timer);
  }

  function authorityInput(scopeValue, projection, legalSpace,
    spatialObservation, spatialActionSpace) {
    return {
      scope: scopeValue,
      roomProjection: projection,
      legalSpace,
      spatialObservation,
      spatialActionSpace,
    };
  }

  async function readAuthority(record, seatToken) {
    const read = await room.readRoom({ roomId: record.scope.roomId, seatToken });
    if (read?.ok !== true) {
      throw Object.assign(new Error(read?.reason || "BOT_ROOM_READ_FAILED"), {
        code: read?.reason || "BOT_ROOM_READ_FAILED",
        severity: highSeverity(read?.reason) ? "High" : "Medium",
      });
    }
    const projection = read.projection;
    if (projection.room?.roomId !== record.scope.roomId
      || projection.matchBinding?.bindingHash !== record.scope.matchBindingHash
      || projection.viewer?.seatKey !== record.scope.seatKey) {
      throw Object.assign(new Error("Bot room binding mismatch"), {
        code: "BOT_ROOM_BINDING_MISMATCH",
        severity: "High",
      });
    }
    const legal = await room.legalSpace({
      roomId: record.scope.roomId,
      seatToken,
    });
    if (legal?.ok !== true) {
      throw Object.assign(new Error(legal?.reason || "BOT_LEGAL_SPACE_FAILED"), {
        code: legal?.reason || "BOT_LEGAL_SPACE_FAILED",
        severity: highSeverity(legal?.reason) ? "High" : "Medium",
      });
    }
    const legalSpace = legal.legalSpace;
    const spatialObservation = spatialObservationProjector
      ? await spatialObservationProjector({ roomProjection: projection,
        legalSpace }) : null;
    const spatialActionSpace = spatialRuntime
      ? await spatialRuntime.actionSpace({ roomProjection: projection,
        legalSpace, spatialObservation })
      : seal({
        schemaVersion:
          `${STARCRAFT_TMG_HOSTED_BOT_SEAT_RUNTIME_VERSION}.fallback-action-space`,
        authority: {
          roomId: record.scope.roomId,
          stateRevision: projection.room.stateRevision,
          stateHash: projection.room.stateHash,
          legalSpaceHash: legalSpace.legalSpaceHash,
        },
        finiteActions: (legalSpace.finiteActions || []).map((entry) => ({
          candidateId: entry.actionKey,
          proposal: { kind: "finite", actionKey: entry.actionKey },
          action: clone(entry.action),
        })),
        parameterDomains: clone(legalSpace.parameterDomains || []),
        trainingTruth: false,
      }, "actionSpaceHash");
    return { projection, legalSpace, spatialObservation, spatialActionSpace };
  }

  async function preparePlan(record, authorityValue, decision) {
    if (!turnPlanRuntime) return { actionIntent: null, turnPlanHash: null };
    const base = authorityInput(record.scope, authorityValue.projection,
      authorityValue.legalSpace, authorityValue.spatialObservation,
      authorityValue.spatialActionSpace);
    let current = turnPlanRuntime.read({ scope: record.scope });
    if (!current.plan) {
      if (!decision.plan) {
        throw new TypeError("initial Bot decision requires a TurnPlan");
      }
      await turnPlanRuntime.dispatch({ ...base, command: "open_plan",
        plan: decision.plan });
    }
    if (!decision.assessment) {
      throw new TypeError("Bot decision requires a current PlanAssessment");
    }
    const reflected = await turnPlanRuntime.dispatch({
      ...base,
      command: "reflect_plan",
      assessment: decision.assessment,
      ...(decision.assessment.verdict === "revise"
        ? { planRevision: decision.planRevision || decision.plan } : {}),
    });
    if (!decision.intent) {
      throw new TypeError("Bot decision requires an ActionIntent");
    }
    const intent = await turnPlanRuntime.dispatch({
      ...base,
      command: "create_intent",
      intent: { ...clone(decision.intent), proposal: clone(decision.proposal) },
    });
    return {
      actionIntent: clone(intent.result.intent),
      turnPlanHash: reflected.plan?.planHash || reflected.transitionHash,
    };
  }

  async function recordOutcome(record, preAuthority, applied, actionIntent) {
    let outcomePersistence = null;
    let eventLogPersistence = null;
    try {
      const nextAuthority = await readAuthority(record,
        credentials.get(record.scope.scopeKey).seatToken);
      const outcome = {
        intentId: actionIntent?.intentId,
        status: "applied_and_replay_verified",
        receiptHash: applied.receipt?.journalHash || null,
        resultSummary: `Applied ${record.inflight.decision.candidateId}`,
        observedSignals: ["authoritative_state_changed"],
        planImpact: "reflect_again_at_next_decision_boundary",
        abilitiesUsed: [],
        resourcesSpent: [],
        unitIntentResults: [],
        opponentResponsesObserved: [],
        counterResponsesUsed: [],
      };
      if (turnPlanRuntime && actionIntent?.intentId) {
        outcomePersistence = await turnPlanRuntime.dispatch({
          ...authorityInput(record.scope, nextAuthority.projection,
            nextAuthority.legalSpace, nextAuthority.spatialObservation,
            nextAuthority.spatialActionSpace),
          command: "record_outcome",
          outcome,
        });
      } else if (continuity) {
        eventLogPersistence = await continuity.record({
          scope: record.scope,
          roomProjection: nextAuthority.projection,
          legalSpace: nextAuthority.legalSpace,
          outcome,
        });
      }
    } catch (error) {
      record.issues.push({ ...safeIssue(error, "Medium"),
        occurredAt: iso(now(), "now"),
        phase: "post_apply_memory_record" });
    }
    return { outcomePersistence, eventLogPersistence };
  }

  async function executeApply(record, seatToken) {
    const request = record.inflight?.applyRequest;
    if (!request) throw new Error("BOT_APPLY_REQUEST_MISSING");
    const applied = await room.applyAction({
      roomId: record.scope.roomId,
      seatToken,
      ...clone(request),
    });
    if (applied?.ok !== true) {
      throw Object.assign(new Error(applied?.reason || "BOT_APPLY_FAILED"), {
        code: applied?.reason || "BOT_APPLY_FAILED",
        severity: highSeverity(applied?.reason) ? "High" : "Medium",
      });
    }
    const replay = await room.replayRoom({
      roomId: record.scope.roomId,
      seatToken,
    });
    if (replay?.ok !== true || replay.matchesCurrent !== true) {
      throw Object.assign(new Error("Room replay does not match current state"), {
        code: "REPLAY_MISMATCH",
        severity: "High",
      });
    }
    const memory = await recordOutcome(record, record.inflight.authority,
      applied, record.inflight.actionIntent);
    const trace = seal({
      schemaVersion:
        `${STARCRAFT_TMG_HOSTED_BOT_SEAT_RUNTIME_VERSION}.trace`,
      traceId: `${record.scope.roomId}.${record.scope.seatKey}.${String(
        record.actionCount + 1).padStart(4, "0")}`,
      gameId: "starcraft-tmg",
      roomId: record.scope.roomId,
      seatKey: record.scope.seatKey,
      mode: record.matchMode || configuredMatchMode,
      promptPack: record.promptPack || configuredPromptPack,
      harnessVersion: STARCRAFT_TMG_HOSTED_BOT_SEAT_RUNTIME_VERSION,
      agentVersion: record.inflight.decision.providerTrace?.agentVersion
        || "injected_bot_decision_port",
      stateRevision: record.inflight.authority.stateRevision,
      stateHash: record.inflight.authority.stateHash,
      legalSpaceHash: record.inflight.authority.legalSpaceHash,
      spatialObservationHash:
        record.inflight.authority.spatialObservationHash,
      spatialActionSpaceHash:
        record.inflight.authority.spatialActionSpaceHash,
      continuityContextHash:
        record.inflight.continuityContextHash || null,
      turnPlanHash: record.inflight.turnPlanHash || null,
      actionIntentHash: record.inflight.actionIntent?.intentHash || null,
      candidateId: record.inflight.decision.candidateId,
      selectedReason: record.inflight.decision.selectedReason,
      scoreOrPositionValue: record.inflight.decision.scoreOrPositionValue,
      risk: record.inflight.decision.risk,
      publicDecisionSummary:
        clone(record.inflight.decision.publicDecisionSummary || null),
      rejectedAlternatives:
        clone(record.inflight.decision.rejectedAlternatives),
      strategySkillRefs:
        clone(record.inflight.decision.intent?.skillsUsed || []),
      applyReceiptHash: applied.receipt?.journalHash || null,
      postStateRevision: applied.envelope?.stateRevision ?? null,
      postStateHash: applied.envelope?.stateHash || null,
      replayMatchesCurrent: true,
      harnessToolsCalled: [
        "read_board_state",
        "list_legal_actions",
        "read_player_spatial_observation",
        "read_spatial_action_space",
        "read_same_match_memory",
        record.promptPack || configuredPromptPack,
        "preview_action",
        "confirm_preview_after_match_bot_authorization",
        "claim_control",
        "apply_action",
        "replay_room",
        "write_episode_trace",
      ],
      modelConfirmCalls: 0,
      modelApplyCalls: 0,
      providerCalls: Number(
        record.inflight.decision.providerTrace?.providerCalls || 0),
      paidProviderUsed:
        record.inflight.decision.providerTrace?.paidProviderUsed === true,
      hostConfirmCalls: record.inflight.applyRequest.confirmationId ? 1 : 0,
      hostApplyCalls: 1,
      eventLogPersistence:
        memory.outcomePersistence?.result?.persistence?.persistenceStatus
        || memory.eventLogPersistence?.persistenceStatus
        || (continuity ? "adapter_managed" : "not_configured"),
      eligibleForTraining: false,
      reviewStatus: "raw",
      trainingTruth: false,
    }, "traceHash");
    return { applied, replay, trace };
  }

  async function runDrive(scopeValue, input) {
    let record = records.get(scopeValue.scopeKey)
      || await store.load(scopeValue.scopeKey);
    if (!record) return deepFreeze({ ok: false,
      reason: "BOT_SEAT_NOT_ATTACHED", projection: null });
    records.set(scopeValue.scopeKey, record);
    const credential = credentials.get(scopeValue.scopeKey);
    if (!credential) {
      record = await persist(record, { lifecycle: "paused",
        driveStatus: "disconnected_requires_reattach" });
      return deepFreeze({ ok: false, reason: "BOT_SEAT_DISCONNECTED",
        projection: project(record, false) });
    }
    if (record.lifecycle === "closed") {
      return deepFreeze({ ok: false, reason: "BOT_SEAT_CLOSED",
        projection: project(record, true) });
    }
    let authorityValue;
    try {
      authorityValue = await readAuthority(record, credential.seatToken);
      const state = authorityValue.projection.state || {};
      record = await persist(record, {
        lastObservedStateRevision: authorityValue.projection.room.stateRevision,
        lastObservedStateHash: authorityValue.projection.room.stateHash,
      });
      if (record.inflight?.applyRequest) {
        const result = await executeApply(record, credential.seatToken);
        record = await persist(record, {
          lifecycle: state.terminal || state.gameOver ? "completed" : "active",
          driveStatus: "applied_recovered_idempotently",
          actionCount: record.actionCount + 1,
          replayVerifiedCount: record.replayVerifiedCount + 1,
          lastAppliedStateRevision: result.applied.envelope?.stateRevision ?? null,
          lastDecision: clone(record.inflight.decision),
          lastReceiptHash: result.applied.receipt?.journalHash || null,
          lastReplayMatchesCurrent: true,
          traces: [...record.traces, result.trace],
          inflight: null,
        });
        return deepFreeze({ ok: true, outcome: "bot_action_applied",
          projection: project(record, true), trace: result.trace });
      }
      if (state.terminal === true || state.gameOver === true) {
        record = await persist(record, { lifecycle: "completed",
          driveStatus: "match_terminal", inflight: null });
        return deepFreeze({ ok: true, outcome: "match_terminal",
          projection: project(record, true) });
      }
      const actingSide = resolveStarcraftTmgEffectiveActingSideV1(state);
      if (actingSide.sideKey !== scopeValue.seatKey) {
        record = await persist(record, { lifecycle: "waiting_human",
          driveStatus: "waiting_for_other_seat" });
        return deepFreeze({ ok: true, outcome: "waiting_for_other_seat",
          projection: project(record, true) });
      }
      if (record.lastAttemptedStateHash === authorityValue.projection.room.stateHash
        && record.driveStatus === "paused_after_failure" && input.retry !== true) {
        return deepFreeze({ ok: false, reason: "BOT_RETRY_REQUIRES_EXPLICIT_DRIVE",
          projection: project(record, true) });
      }
      let continuityContext = null;
      if (continuity) {
        continuityContext = await continuity.observe({
          scope: scopeValue,
          roomProjection: authorityValue.projection,
          legalSpace: authorityValue.legalSpace,
          spatialObservation: authorityValue.spatialObservation,
          spatialActionSpace: authorityValue.spatialActionSpace,
          strategySkillSetHash: input.strategySkillSetHash || null,
        });
      }
      let planState = null;
      if (turnPlanRuntime) {
        const current = turnPlanRuntime.read({ scope: scopeValue });
        if (current.plan) {
          await turnPlanRuntime.dispatch({
            ...authorityInput(scopeValue, authorityValue.projection,
              authorityValue.legalSpace, authorityValue.spatialObservation,
              authorityValue.spatialActionSpace),
            command: "observe_state",
          });
        }
        planState = turnPlanRuntime.read({ scope: scopeValue });
      }
      record = await persist(record, {
        lifecycle: "active",
        driveStatus: "waiting_provider",
        lastAttemptedStateHash: authorityValue.projection.room.stateHash,
      });
      const rawDecision = await decisionPort.decide(deepFreeze({
        schemaVersion:
          `${STARCRAFT_TMG_HOSTED_BOT_SEAT_RUNTIME_VERSION}.decision-request`,
        scope: clone(scopeValue),
        roomProjection: clone(authorityValue.projection),
        legalSpace: clone(authorityValue.legalSpace),
        spatialObservation: clone(authorityValue.spatialObservation),
        spatialActionSpace: clone(authorityValue.spatialActionSpace),
        matchMemory: clone(continuityContext?.matchMemory || null),
        preexecutionSearch:
          clone(continuityContext?.preexecutionSearch || null),
        planState: clone(planState),
        matchMode: record.matchMode || configuredMatchMode,
        promptPack: record.promptPack || configuredPromptPack,
        retryApproved: input.retry === true,
        rulesAuthority: "external_rules_service",
        credentialMaterialIncluded: false,
        confirmationAuthority: false,
        applyAuthority: false,
        trainingTruth: false,
      }));
      const decision = normalizeDecision(rawDecision, authorityValue);
      const planned = await preparePlan(record, authorityValue, decision);
      const authority = {
        stateRevision: authorityValue.projection.room.stateRevision,
        stateHash: authorityValue.projection.room.stateHash,
        legalSpaceHash: authorityValue.legalSpace.legalSpaceHash,
        spatialObservationHash:
          authorityValue.spatialObservation?.observationHash || null,
        spatialActionSpaceHash:
          authorityValue.spatialActionSpace.actionSpaceHash,
      };
      const inflight = {
        stage: "decision_selected",
        attemptId: `bot-attempt-${hashStarcraftTmgContract({
          scopeKey: scopeValue.scopeKey,
          stateHash: authority.stateHash,
          candidateId: decision.candidateId,
          actionCount: record.actionCount,
        })}`,
        authority,
        decision: clone(decision),
        continuityContextHash: continuityContext?.contextHash || null,
        turnPlanHash: planned.turnPlanHash,
        actionIntent: clone(planned.actionIntent),
        idempotencyKey: `hosted-bot-${hashStarcraftTmgContract({
          scopeKey: scopeValue.scopeKey,
          stateHash: authority.stateHash,
          candidateId: decision.candidateId,
        })}`,
        applyRequest: null,
      };
      record = await persist(record, { driveStatus: "previewing", inflight });
      const preview = await room.previewAction({
        roomId: scopeValue.roomId,
        seatToken: credential.seatToken,
        ...(decision.proposal.kind === "finite"
          ? { candidateId: decision.proposal.actionKey }
          : { proposal: decision.proposal }),
        expectedMatchBindingHash: scopeValue.matchBindingHash,
        expectedLegalSpaceHash: authority.legalSpaceHash,
        expectedStateRevision: authority.stateRevision,
        expectedStateHash: authority.stateHash,
        occurredAt: iso(now(), "now"),
      });
      if (preview?.ok !== true) {
        throw Object.assign(new Error(preview?.reason || "BOT_PREVIEW_FAILED"), {
          code: preview?.reason || "BOT_PREVIEW_FAILED",
          severity: highSeverity(preview?.reason) ? "High" : "Medium",
        });
      }
      let confirmationId = null;
      if (preview.confirmationRequired) {
        const confirmed = await room.confirmPreview({
          roomId: scopeValue.roomId,
          seatToken: credential.seatToken,
          previewId: preview.preview.previewId,
          previewToken: preview.preview.previewToken,
          previewContentHash: preview.preview.previewSeal.contentHash,
          occurredAt: iso(now(), "now"),
        });
        if (confirmed?.ok !== true) {
          throw Object.assign(new Error(
            confirmed?.reason || "BOT_CONFIRM_FAILED"), {
            code: confirmed?.reason || "BOT_CONFIRM_FAILED",
            severity: highSeverity(confirmed?.reason) ? "High" : "Medium",
          });
        }
        confirmationId = confirmed.confirmation.confirmationId;
      }
      const control = await room.claimControl({
        roomId: scopeValue.roomId,
        seatToken: credential.seatToken,
        sessionId: `hosted-bot-seat:${scopeValue.scopeKey}`,
      });
      if (control?.ok !== true) {
        throw Object.assign(new Error(control?.reason || "BOT_CONTROL_FAILED"), {
          code: control?.reason || "BOT_CONTROL_FAILED",
          severity: highSeverity(control?.reason) ? "High" : "Medium",
        });
      }
      record.inflight.stage = "ready_to_apply";
      record.inflight.applyRequest = {
        previewId: preview.preview.previewId,
        confirmationId,
        leaseId: control.controlLease.leaseId,
        leaseFence: control.controlLease.leaseFence,
        expectedStateRevision: authority.stateRevision,
        idempotencyKey: record.inflight.idempotencyKey,
        occurredAt: iso(now(), "now"),
      };
      record = await persist(record, { driveStatus: "applying",
        inflight: record.inflight });
      const result = await executeApply(record, credential.seatToken);
      record = await persist(record, {
        lifecycle: result.applied.envelope?.state?.terminal
          || result.applied.envelope?.state?.gameOver ? "completed" : "active",
        driveStatus: "action_applied_replay_verified",
        actionCount: record.actionCount + 1,
        replayVerifiedCount: record.replayVerifiedCount + 1,
        lastAppliedStateRevision: result.applied.envelope?.stateRevision ?? null,
        lastDecision: clone(record.inflight.decision),
        lastReceiptHash: result.applied.receipt?.journalHash || null,
        lastReplayMatchesCurrent: true,
        traces: [...record.traces, result.trace],
        inflight: null,
      });
      return deepFreeze({ ok: true, outcome: "bot_action_applied",
        projection: project(record, true), trace: result.trace });
    } catch (error) {
      const issue = { ...safeIssue(error,
        highSeverity(error?.code) ? "High" : "Medium"),
      occurredAt: iso(now(), "now") };
      const current = records.get(scopeValue.scopeKey) || record;
      const blocking = new Set(["Critical", "High"]).has(issue.severity);
      record = await persist(current, {
        lifecycle: blocking ? "blocked" : "paused",
        driveStatus: blocking ? "blocked_high_finding" : "paused_after_failure",
        issues: [...current.issues, issue],
      });
      return deepFreeze({ ok: false, reason: issue.code,
        findingSeverity: issue.severity, projection: project(record, true) });
    }
  }

  async function attach(input = {}) {
    if (runtimeClosed) throw new Error("Hosted Bot Seat runtime is closed");
    const requestedScope = scope(input.scope || input);
    const seatToken = required(input.seatToken, "seatToken");
    const consent = normalizeConsent(input.automationConsent, requestedScope);
    let record = await store.load(requestedScope.scopeKey);
    const at = iso(now(), "now");
    if (!record) {
      record = newRecord(requestedScope, consent, at, configuredMatchMode);
      const created = await store.commit(requestedScope.scopeKey, null, record);
      if (created?.ok !== true) {
        throw new Error(created?.reason || "BOT_SEAT_STORE_CREATE_FAILED");
      }
    } else {
      if (record.scope.matchBindingHash !== requestedScope.matchBindingHash
        || record.scope.seatKey !== requestedScope.seatKey) {
        throw new TypeError("persisted Bot Seat scope mismatch");
      }
      if (record.matchMode && record.matchMode !== configuredMatchMode) {
        throw new TypeError("persisted Bot Seat match mode mismatch");
      }
      records.set(requestedScope.scopeKey, record);
      record = await persist(record, {
        consent: clone(consent),
        matchMode: configuredMatchMode,
        promptPack: configuredPromptPack,
        lifecycle: "active",
        driveStatus: "reattached",
        connectionEpoch: record.connectionEpoch + 1,
        closedAt: null,
      });
    }
    records.set(requestedScope.scopeKey, record);
    credentials.set(requestedScope.scopeKey, { seatToken });
    const authorityValue = await readAuthority(record, seatToken);
    record = await persist(record, {
      lastObservedStateRevision: authorityValue.projection.room.stateRevision,
      lastObservedStateHash: authorityValue.projection.room.stateHash,
      driveStatus: "attached_authority_verified",
    });
    if (input.autoDrive !== false) schedule(requestedScope);
    return deepFreeze({ ok: true, outcome: "bot_seat_attached",
      projection: project(record, true) });
  }

  async function drive(input = {}) {
    const requestedScope = scope(input.scope || input);
    if (!drives.has(requestedScope.scopeKey)) {
      drives.set(requestedScope.scopeKey,
        runDrive(requestedScope, input).finally(() => {
          drives.delete(requestedScope.scopeKey);
        }));
    }
    return drives.get(requestedScope.scopeKey);
  }

  async function read(input = {}) {
    const requestedScope = scope(input.scope || input);
    const record = records.get(requestedScope.scopeKey)
      || await store.load(requestedScope.scopeKey);
    if (record) records.set(requestedScope.scopeKey, record);
    return deepFreeze({
      ok: Boolean(record),
      reason: record ? null : "BOT_SEAT_NOT_ATTACHED",
      projection: project(record,
        credentials.has(requestedScope.scopeKey)),
    });
  }

  async function close(input = {}) {
    const requested = input.scope || input.roomId ? scope(input.scope || input) : null;
    const targets = requested
      ? [requested.scopeKey]
      : [...new Set([...records.keys(), ...credentials.keys()])];
    for (const scopeKey of targets) {
      const timer = timers.get(scopeKey);
      if (timer) clearTimeout(timer);
      timers.delete(scopeKey);
      credentials.delete(scopeKey);
      const record = records.get(scopeKey) || await store.load(scopeKey);
      if (record && record.lifecycle !== "closed") {
        const closed = await persist(record, { lifecycle: "closed",
          driveStatus: "closed_by_host", closedAt: iso(now(), "now") });
        records.set(scopeKey, closed);
      }
    }
    if (!requested) runtimeClosed = true;
    return deepFreeze({ ok: true, closedScopeCount: targets.length,
      credentialsRetained: 0, trainingTruth: false });
  }

  return Object.freeze({ attach, drive, read, close });
}
