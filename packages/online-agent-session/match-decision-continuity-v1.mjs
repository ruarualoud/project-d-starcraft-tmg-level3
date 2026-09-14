import { hashStarcraftTmgContract } from
  "../authoritative-engine/transition-v1.mjs";

export const STARCRAFT_TMG_MATCH_DECISION_CONTINUITY_VERSION =
  "starcraft_tmg_match_decision_continuity_v1";

const HASH_PATTERN = /^[a-f0-9]{64}$/u;

const QUERYABLE_EVENT_KINDS = Object.freeze(new Set([
  "turn_plan",
  "plan_reflection",
  "plan_revision",
  "action_intent",
  "decision_purpose",
  "decision_outcome",
  "ability_used",
  "resource_spent",
  "unit_intent_result",
  "opponent_response_observed",
  "counter_response_used",
  "initiative_observation",
]));

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

function requiredString(value, field) {
  const normalized = String(value || "").trim();
  if (!normalized) throw new TypeError(`${field} is required`);
  return normalized;
}

function requiredHash(value, field) {
  const normalized = requiredString(value, field).toLowerCase();
  if (!HASH_PATTERN.test(normalized)) {
    throw new TypeError(`${field} must be a sha256 hash`);
  }
  return normalized;
}

function seal(value, hashField) {
  const unsigned = clone(value);
  return deepFreeze({ ...unsigned, [hashField]: hashStarcraftTmgContract(unsigned) });
}

function normalizeScope(input) {
  if (!object(input)) throw new TypeError("scope is required");
  const scope = {
    gameId: requiredString(input.gameId, "scope.gameId"),
    roomId: requiredString(input.roomId, "scope.roomId"),
    matchBindingHash: requiredHash(input.matchBindingHash,
      "scope.matchBindingHash"),
    seatKey: requiredString(input.seatKey, "scope.seatKey"),
  };
  if (scope.gameId !== "starcraft-tmg") {
    throw new TypeError("scope.gameId must be starcraft-tmg");
  }
  return deepFreeze({
    ...scope,
    scopeKey: hashStarcraftTmgContract(scope),
  });
}

function normalizeAuthority(scope, roomProjection, legalSpace) {
  if (!object(roomProjection)
    || roomProjection.room?.roomId !== scope.roomId
    || roomProjection.matchBinding?.bindingHash !== scope.matchBindingHash) {
    throw new TypeError("room projection does not match continuity scope");
  }
  const room = roomProjection.room;
  const state = object(roomProjection.state) ? roomProjection.state : {};
  const stateRevision = Number(room.stateRevision);
  if (!Number.isSafeInteger(stateRevision) || stateRevision < 0) {
    throw new TypeError("room projection stateRevision is invalid");
  }
  const stateHash = requiredHash(room.stateHash, "roomProjection.room.stateHash");
  if (legalSpace !== null && legalSpace !== undefined) {
    if (!object(legalSpace)
      || legalSpace.roomId !== scope.roomId
      || legalSpace.matchBindingHash !== scope.matchBindingHash
      || legalSpace.stateRevision !== stateRevision
      || legalSpace.stateHash !== stateHash) {
      throw new TypeError("LegalSpace does not match continuity authority");
    }
  }
  const round = Number(state.round || 1);
  const phase = String(state.phase || "unknown").trim() || "unknown";
  const phaseKey = `${round}:${phase}`;
  const firstPassSideByPhase = object(state.firstPassSideByPhase)
    ? clone(state.firstPassSideByPhase) : {};
  const passedBySide = Object.fromEntries(Object.entries(state.players || {})
    .map(([sideKey, player]) => [sideKey,
      player?.passedPhases?.[phase] === true]));
  const phaseChoice = object(state.phaseFirstActorByRound?.[phaseKey])
    ? clone(state.phaseFirstActorByRound[phaseKey]) : null;
  return deepFreeze({
    stateRevision,
    stateHash,
    round,
    phase,
    phaseKey,
    activeSideKey: String(state.activeSideKey || "") || null,
    firstPlayerSideKey: String(state.firstPlayerSideKey || "") || null,
    firstPassSideByPhase,
    passedBySide,
    currentPhaseFirstPassSideKey:
      String(firstPassSideByPhase[phase] || "") || null,
    ownPassedCurrentPhase: passedBySide[scope.seatKey] === true,
    ownsFirstPlayerMarker: state.firstPlayerSideKey === scope.seatKey,
    phaseFirstActorChoice: phaseChoice,
    trainingTruth: false,
  });
}

function createRecord(scope, sequence, kind, authority, payload, occurredAt) {
  return seal({
    schemaVersion: `${STARCRAFT_TMG_MATCH_DECISION_CONTINUITY_VERSION}.record`,
    recordId: `${scope.roomId}.${scope.seatKey}.${String(sequence).padStart(6, "0")}`,
    scopeKey: scope.scopeKey,
    sequence,
    kind,
    authority: authority ? {
      stateRevision: authority.stateRevision,
      stateHash: authority.stateHash,
      round: authority.round,
      phase: authority.phase,
    } : null,
    payload: clone(payload),
    occurredAt,
    eligibleForTraining: false,
    reviewStatus: "raw_same_match_memory",
    trainingTruth: false,
  }, "recordHash");
}

function normalizeJournalResult(result) {
  if (Array.isArray(result)) return result;
  if (result?.ok === true && Array.isArray(result.records)) return result.records;
  throw new TypeError("match decision journal read was rejected");
}

function latest(records, kind) {
  for (let index = records.length - 1; index >= 0; index -= 1) {
    if (records[index].kind === kind) return records[index];
  }
  return null;
}

function recent(records, kinds, target) {
  const accepted = new Set(kinds);
  return records.filter((entry) => accepted.has(entry.kind)).slice(-target);
}

function strings(value) {
  return Array.isArray(value)
    ? value.map((entry) => String(entry || "").trim()).filter(Boolean) : [];
}

function uniqueStrings(value, target) {
  return [...new Set(value.filter(Boolean))].slice(-target);
}

function activePlanRecord(records) {
  const planRecords = records.filter((entry) =>
    entry.kind === "turn_plan" || entry.kind === "plan_revision");
  const current = planRecords.at(-1) || null;
  return current && current.payload?.status !== "completed"
    && current.payload?.status !== "abandoned" ? current : null;
}

function workingMemoryProjection(records, scope, authority, target) {
  const activePlan = activePlanRecord(records);
  const reflection = latest(records, "plan_reflection");
  const structuredIntents = recent(records, ["action_intent"], target);
  const intents = structuredIntents.length ? structuredIntents
    : recent(records, ["decision_purpose"], target);
  const outcomes = recent(records, ["decision_outcome", "unit_intent_result"],
    target);
  const abilityUses = recent(records, ["ability_used"], target);
  const resourceUses = recent(records, ["resource_spent"], target);
  const opponentResponses = recent(records, ["opponent_response_observed"],
    target);
  const counterResponses = recent(records, ["counter_response_used"], target);
  const latestIntent = intents.at(-1) || null;
  const unresolvedRisks = uniqueStrings([
    ...strings(reflection?.payload?.unresolvedRisks),
    ...strings(latestIntent?.payload?.risks),
  ], target);
  const currentGoal = reflection?.payload?.currentGoal
    || latestIntent?.payload?.currentGoal
    || activePlan?.payload?.currentGoal
    || activePlan?.payload?.objective
    || null;
  return {
    overallPlan: activePlan ? clone(activePlan) : null,
    currentGoal,
    planAssessment: reflection ? clone(reflection) : null,
    commitments: clone(intents.slice(-Math.min(target, 8))),
    tacticalLedger: {
      abilitiesUsed: clone(abilityUses),
      resourcesSpent: clone(resourceUses),
      recentOutcomes: clone(outcomes.slice(-Math.min(target, 8))),
      sourceOfRemainingAvailability:
        "current_rules_projection_or_query_required",
    },
    opponentModel: {
      predictedResponses: clone(latestIntent?.payload?.predictedOpponentResponses
        || []),
      observedResponses: clone(opponentResponses.slice(-Math.min(target, 8))),
    },
    counterplay: clone([
      ...(latestIntent?.payload?.predictedOpponentResponses || []).map((entry) => ({
        predictedOpponentResponse: entry.opponentAction || entry.response || null,
        plannedCounterResponse: entry.counterResponse || null,
        replanIf: entry.replanIf || null,
        source: "current_action_intent",
      })),
      ...counterResponses.slice(-Math.min(target, 8)).map((entry) => ({
        ...clone(entry.payload),
        source: "observed_execution",
      })),
    ]),
    unresolvedRisks,
    nextDecisionFocus: reflection?.payload?.nextDecisionFocus
      || latestIntent?.payload?.nextDecisionFocus
      || currentGoal,
    initiative: {
      activeSideKey: authority.activeSideKey,
      ownsFirstPlayerMarker: authority.ownsFirstPlayerMarker,
      ownPassedCurrentPhase: authority.ownPassedCurrentPhase,
      currentPhaseFirstPassSideKey: authority.currentPhaseFirstPassSideKey,
      agentWasFirstPasserThisPhase:
        authority.currentPhaseFirstPassSideKey === scope.seatKey,
      phaseFirstActorChoice: clone(authority.phaseFirstActorChoice),
    },
    projectionPolicy: {
      kind: "bounded_live_projection_over_complete_queryable_log",
      perCategoryRecentTarget: target,
      sourceRecordsDeleted: 0,
      sourceRecordsRejectedForLength: 0,
    },
  };
}

function initiativePayload(scope, authority) {
  return {
    round: authority.round,
    phase: authority.phase,
    phaseKey: authority.phaseKey,
    activeSideKey: authority.activeSideKey,
    firstPlayerSideKey: authority.firstPlayerSideKey,
    currentPhaseFirstPassSideKey: authority.currentPhaseFirstPassSideKey,
    ownPassedCurrentPhase: authority.ownPassedCurrentPhase,
    ownsFirstPlayerMarker: authority.ownsFirstPlayerMarker,
    agentWasFirstPasser:
      authority.currentPhaseFirstPassSideKey === scope.seatKey,
    passedBySide: authority.passedBySide,
    phaseFirstActorChoice: authority.phaseFirstActorChoice,
    source: "rules_owned_room_projection",
  };
}

function projectedMemory(state, scope, authority, promptRecordTarget) {
  const decisionRecords = state.records.filter((entry) =>
    entry.kind === "action_intent" || entry.kind === "decision_purpose"
      || entry.kind === "decision_outcome");
  const initiativeRecords = state.records.filter((entry) =>
    entry.kind === "initiative_observation");
  const activePlan = activePlanRecord(state.records);
  const recentPurposes = decisionRecords.slice(-promptRecordTarget);
  const initiativeTimeline = initiativeRecords.slice(-promptRecordTarget);
  const lastAgentFirstPass = [...initiativeRecords].reverse().find((entry) =>
    entry.payload?.agentWasFirstPasser === true) || null;
  return {
    scope: clone(scope),
    authority: clone(authority),
    activePlan: activePlan ? clone(activePlan) : null,
    workingMemory: workingMemoryProjection(state.records, scope, authority,
      promptRecordTarget),
    recentPurposes: clone(recentPurposes),
    initiative: {
      ownsFirstPlayerMarker: authority.ownsFirstPlayerMarker,
      ownPassedCurrentPhase: authority.ownPassedCurrentPhase,
      currentPhaseFirstPassSideKey: authority.currentPhaseFirstPassSideKey,
      agentWasFirstPasserThisPhase:
        authority.currentPhaseFirstPassSideKey === scope.seatKey,
      phaseFirstActorChoice: clone(authority.phaseFirstActorChoice),
      lastAgentFirstPass: lastAgentFirstPass ? clone(lastAgentFirstPass) : null,
      timeline: clone(initiativeTimeline),
    },
    retainedRecordCount: state.records.length,
    eventLog: {
      kind: "append_only_same_match_event_log",
      queryable: true,
      retainedRecordCount: state.records.length,
      latestSequence: state.sequence,
      durableHistoryDeleted: 0,
    },
    projectedRecordCount: recentPurposes.length + initiativeTimeline.length
      + (activePlan ? 1 : 0),
    promptProjectionPolicy: {
      kind: "soft_recent_records_target",
      target: promptRecordTarget,
      recordsRejectedForLength: 0,
      durableHistoryDeleted: 0,
    },
    persistence: {
      status: state.persistenceStatus,
      issues: clone(state.issues),
    },
    sameMatchOnly: true,
    mayInfluenceOpponentDecision: true,
    mayOverrideRules: false,
    eligibleForTraining: false,
    trainingTruth: false,
  };
}

function searchProjection(job) {
  if (!job) return {
    status: "disabled",
    blockingPolicy: "never_wait_on_decision_critical_path",
    result: null,
  };
  return {
    searchKey: job.searchKey,
    status: job.status,
    stateRevision: job.stateRevision,
    stateHash: job.stateHash,
    legalSpaceHash: job.legalSpaceHash,
    startedAt: job.startedAt,
    completedAt: job.completedAt || null,
    staleReason: job.staleReason || null,
    failure: job.failure || null,
    result: job.status === "ready" ? clone(job.result) : null,
    blockingPolicy: "never_wait_on_decision_critical_path",
    requiresCurrentLegalSpaceAndPreviewBeforeUse: true,
    mayMutateRoom: false,
    trainingTruth: false,
  };
}

function normalizeEvent(event) {
  if (!object(event)) throw new TypeError("memory event must be an object");
  const kind = requiredString(event.kind, "memoryEvent.kind");
  if (!QUERYABLE_EVENT_KINDS.has(kind)
    || kind === "initiative_observation") {
    throw new TypeError(`unsupported memory event kind: ${kind}`);
  }
  const payload = object(event.payload) ? clone(event.payload) : {};
  return { kind, payload };
}

function scalarMatches(payload, key, expected) {
  if (expected === undefined || expected === null || expected === "") return true;
  const wanted = String(expected);
  function visit(value) {
    if (Array.isArray(value)) return value.some(visit);
    if (!object(value)) return false;
    for (const [entryKey, entryValue] of Object.entries(value)) {
      if (entryKey === key && String(entryValue || "") === wanted) return true;
      if (entryKey === `${key}s` && Array.isArray(entryValue)
        && entryValue.some((entry) => String(entry || "") === wanted)) return true;
      if (visit(entryValue)) return true;
    }
    return false;
  }
  return visit(payload);
}

function queryRecords(records, query = {}) {
  if (!object(query)) throw new TypeError("memory query must be an object");
  const kinds = strings(query.kinds);
  if (kinds.some((kind) => !QUERYABLE_EVENT_KINDS.has(kind))) {
    throw new TypeError("memory query contains an unsupported event kind");
  }
  const tags = strings(query.tags);
  const text = String(query.text || "").trim().toLowerCase();
  const round = query.round === undefined ? null : Number(query.round);
  const phase = String(query.phase || "").trim();
  const afterSequence = query.afterSequence === undefined
    ? null : Number(query.afterSequence);
  const beforeSequence = query.beforeSequence === undefined
    ? null : Number(query.beforeSequence);
  const filtered = records.filter((record) => {
    if (kinds.length && !kinds.includes(record.kind)) return false;
    if (round !== null && record.authority?.round !== round) return false;
    if (phase && record.authority?.phase !== phase) return false;
    if (afterSequence !== null && record.sequence <= afterSequence) return false;
    if (beforeSequence !== null && record.sequence >= beforeSequence) return false;
    if (!scalarMatches(record.payload, "planId", query.planId)
      || !scalarMatches(record.payload, "intentId", query.intentId)
      || !scalarMatches(record.payload, "unitId", query.unitId)
      || !scalarMatches(record.payload, "abilityId", query.abilityId)
      || !scalarMatches(record.payload, "resourceId", query.resourceId)) {
      return false;
    }
    if (tags.length) {
      const recordTags = strings(record.payload?.tags);
      if (!tags.every((tag) => recordTags.includes(tag))) return false;
    }
    return !text || JSON.stringify(record).toLowerCase().includes(text);
  });
  const order = query.order === "oldest_first" ? "oldest_first" : "newest_first";
  if (order === "newest_first") filtered.reverse();
  const requestedLimit = Number(query.limit || 50);
  if (!Number.isSafeInteger(requestedLimit) || requestedLimit <= 0) {
    throw new TypeError("memory query limit must be a positive integer");
  }
  return {
    records: filtered.slice(0, requestedLimit),
    matchedCount: filtered.length,
    hasMore: filtered.length > requestedLimit,
    order,
  };
}

export function createInMemoryStarcraftTmgMatchDecisionJournalV1() {
  const recordsByScope = new Map();
  return Object.freeze({
    durability: "process_memory",
    async read(scope) {
      return {
        ok: true,
        records: clone(recordsByScope.get(scope.scopeKey) || []),
      };
    },
    async append(scope, record) {
      const records = recordsByScope.get(scope.scopeKey) || [];
      records.push(clone(record));
      recordsByScope.set(scope.scopeKey, records);
      return { ok: true, recordHash: record.recordHash };
    },
  });
}

export function createStarcraftTmgMatchDecisionContinuityV1(options = {}) {
  const journal = options.journal
    || createInMemoryStarcraftTmgMatchDecisionJournalV1();
  if (typeof journal?.read !== "function" || typeof journal?.append !== "function") {
    throw new TypeError("journal.read and journal.append are required");
  }
  const preExecute = typeof options.preExecute === "function"
    ? options.preExecute : null;
  const now = typeof options.now === "function"
    ? options.now : () => new Date().toISOString();
  const configuredTarget = Number(options.promptRecordTarget || 24);
  const promptRecordTarget = Number.isSafeInteger(configuredTarget)
    && configuredTarget > 0 ? configuredTarget : 24;
  const states = new Map();

  function stateFor(scope) {
    let state = states.get(scope.scopeKey);
    if (!state) {
      state = {
        records: [],
        hydrated: false,
        hydration: null,
        sequence: 0,
        lastInitiativeFingerprint: null,
        persistenceStatus: journal.durability || "adapter_managed",
        issues: [],
        searchJob: null,
      };
      states.set(scope.scopeKey, state);
    }
    return state;
  }

  function noteIssue(state, code, details = {}) {
    state.issues.push({ code, ...clone(details), occurredAt: new Date(now()).toISOString() });
  }

  async function hydrate(scope, state) {
    if (state.hydrated) return;
    if (!state.hydration) {
      state.hydration = (async () => {
        try {
          const loaded = normalizeJournalResult(await journal.read(scope));
          state.records = loaded.filter((entry) =>
            object(entry) && entry.scopeKey === scope.scopeKey).map(clone);
          state.sequence = state.records.reduce((maximum, entry) =>
            Math.max(maximum, Number(entry.sequence || 0)), 0);
          const lastInitiative = latest(state.records, "initiative_observation");
          state.lastInitiativeFingerprint = lastInitiative?.payload
            ? hashStarcraftTmgContract(lastInitiative.payload) : null;
        } catch (error) {
          state.persistenceStatus = "degraded_process_memory";
          noteIssue(state, "journal_read_failed", {
            message: String(error?.message || error),
          });
        } finally {
          state.hydrated = true;
        }
      })();
    }
    await state.hydration;
  }

  async function append(scope, state, kind, authority, payload) {
    state.sequence += 1;
    const record = createRecord(scope, state.sequence, kind, authority, payload,
      new Date(now()).toISOString());
    state.records.push(record);
    try {
      const result = await journal.append(scope, record);
      if (result?.ok !== true) throw new Error("journal append returned not-ok");
    } catch (error) {
      state.persistenceStatus = "degraded_process_memory";
      noteIssue(state, "journal_append_failed", {
        recordHash: record.recordHash,
        message: String(error?.message || error),
      });
    }
    return record;
  }

  function cancelStaleSearch(state, nextSearchKey) {
    const previous = state.searchJob;
    if (!previous || previous.searchKey === nextSearchKey
      || !["queued", "running"].includes(previous.status)) return;
    previous.status = "stale";
    previous.staleReason = "authority_snapshot_changed";
    previous.controller.abort();
  }

  function scheduleSearch(scope, state, authority, legalSpace,
    strategySkillSetHash, spatialObservation, spatialActionSpace, memory) {
    if (!preExecute || !legalSpace) return;
    const searchKey = hashStarcraftTmgContract({
      scopeKey: scope.scopeKey,
      stateHash: authority.stateHash,
      legalSpaceHash: legalSpace.legalSpaceHash,
      strategySkillSetHash: strategySkillSetHash || null,
      spatialObservationHash: spatialObservation?.observationHash || null,
      spatialActionSpaceHash: spatialActionSpace?.actionSpaceHash || null,
      activePlanHash: memory.activePlan?.recordHash || null,
    });
    if (state.searchJob?.searchKey === searchKey) return;
    cancelStaleSearch(state, searchKey);
    const controller = new AbortController();
    const job = {
      searchKey,
      status: "queued",
      stateRevision: authority.stateRevision,
      stateHash: authority.stateHash,
      legalSpaceHash: legalSpace.legalSpaceHash,
      startedAt: new Date(now()).toISOString(),
      completedAt: null,
      staleReason: null,
      failure: null,
      result: null,
      controller,
    };
    state.searchJob = job;
    setImmediate(async () => {
      if (controller.signal.aborted || state.searchJob !== job) return;
      job.status = "running";
      try {
        const result = await preExecute(deepFreeze({
          schemaVersion:
            `${STARCRAFT_TMG_MATCH_DECISION_CONTINUITY_VERSION}.search-request`,
          scope: clone(scope),
          authority: clone(authority),
          legalSpace: clone(legalSpace),
          strategySkillSetHash: strategySkillSetHash || null,
          spatialObservation: clone(spatialObservation || null),
          spatialActionSpace: clone(spatialActionSpace || null),
          matchMemory: clone(memory),
          searchKey,
          roomMutationAuthority: false,
          confirmationAuthority: false,
          trainingTruth: false,
        }), { signal: controller.signal });
        if (controller.signal.aborted || state.searchJob !== job) return;
        if (result?.stateHash && result.stateHash !== authority.stateHash) {
          job.status = "stale";
          job.staleReason = "search_result_state_hash_mismatch";
        } else {
          job.status = "ready";
          job.result = clone(result);
        }
      } catch (error) {
        if (controller.signal.aborted || state.searchJob !== job) return;
        job.status = "failed";
        job.failure = {
          code: "preexecution_search_failed",
          message: String(error?.message || error),
        };
      } finally {
        job.completedAt = new Date(now()).toISOString();
      }
    });
  }

  async function observe(input = {}) {
    const scope = normalizeScope(input.scope);
    const authority = normalizeAuthority(scope, input.roomProjection,
      input.legalSpace || null);
    const state = stateFor(scope);
    await hydrate(scope, state);
    const initiative = initiativePayload(scope, authority);
    const initiativeFingerprint = hashStarcraftTmgContract(initiative);
    if (initiativeFingerprint !== state.lastInitiativeFingerprint) {
      await append(scope, state, "initiative_observation", authority, initiative);
      state.lastInitiativeFingerprint = initiativeFingerprint;
    }
    const memory = projectedMemory(state, scope, authority, promptRecordTarget);
    scheduleSearch(scope, state, authority, input.legalSpace || null,
      input.strategySkillSetHash || null, input.spatialObservation || null,
      input.spatialActionSpace || null, memory);
    return seal({
      schemaVersion: `${STARCRAFT_TMG_MATCH_DECISION_CONTINUITY_VERSION}.context`,
      matchMemory: memory,
      preexecutionSearch: searchProjection(state.searchJob),
      rulesAuthority: "external_rules_service",
      roomMutationAuthority: false,
      confirmationAuthority: false,
      memoryPromotion: "disabled_live_match",
      trainingTruth: false,
    }, "contextHash");
  }

  async function record(input = {}) {
    const scope = normalizeScope(input.scope);
    const state = stateFor(scope);
    await hydrate(scope, state);
    const authority = input.roomProjection
      ? normalizeAuthority(scope, input.roomProjection, input.legalSpace || null)
      : null;
    const records = [];
    if (object(input.turnPlan)) {
      records.push(await append(scope, state, "turn_plan", authority, {
        ...clone(input.turnPlan),
        status: String(input.turnPlan.status || "active"),
      }));
    }
    if (object(input.decision)) {
      records.push(await append(scope, state, "decision_purpose", authority, {
        candidateId: input.decision.candidateId || null,
        planId: input.decision.planId || null,
        intentId: input.decision.intentId || null,
        currentGoal: input.decision.currentGoal || null,
        selectedReason: input.decision.selectedReason || null,
        decisionSummary: input.decision.decisionSummary || null,
        planContinuity: input.decision.planContinuity || null,
        scoreOrPositionValue: input.decision.scoreOrPositionValue || null,
        expectedOwnOutcome: input.decision.expectedOwnOutcome || null,
        predictedOpponentResponses:
          clone(input.decision.predictedOpponentResponses || []),
        tradeoffs: clone(input.decision.tradeoffs || []),
        risk: input.decision.risk || null,
        risks: clone(input.decision.risks || []),
        fallbacks: clone(input.decision.fallbacks || []),
        unitIds: clone(input.decision.unitIds || []),
        abilitiesIntended: clone(input.decision.abilitiesIntended || []),
        resourcesIntended: clone(input.decision.resourcesIntended || []),
        nextDecisionFocus: input.decision.nextDecisionFocus || null,
        rejectedAlternatives: clone(input.decision.rejectedAlternatives || []),
        status: input.decisionStatus || "previewed_waiting_confirmation",
        decisionReceiptHash: input.decisionReceiptHash || null,
        previewProjectionHash: input.previewProjectionHash || null,
      }));
    }
    if (object(input.outcome)) {
      records.push(await append(scope, state, "decision_outcome", authority,
        clone(input.outcome)));
    }
    const events = [
      ...(object(input.event) ? [input.event] : []),
      ...(Array.isArray(input.events) ? input.events : []),
    ].map(normalizeEvent);
    for (const event of events) {
      records.push(await append(scope, state, event.kind, authority,
        event.payload));
    }
    if (!records.length) {
      return deepFreeze({ ok: true, recorded: 0,
        persistenceStatus: state.persistenceStatus });
    }
    return deepFreeze({
      ok: true,
      recorded: records.length,
      recordRefs: records.map((entry) => ({
        recordId: entry.recordId,
        recordHash: entry.recordHash,
      })),
      persistenceStatus: state.persistenceStatus,
    });
  }

  async function query(input = {}) {
    const scope = normalizeScope(input.scope);
    const state = stateFor(scope);
    await hydrate(scope, state);
    const result = queryRecords(state.records, input.query || {});
    return seal({
      schemaVersion:
        `${STARCRAFT_TMG_MATCH_DECISION_CONTINUITY_VERSION}.query-result`,
      scope: clone(scope),
      query: clone(input.query || {}),
      records: clone(result.records),
      matchedCount: result.matchedCount,
      returnedCount: result.records.length,
      hasMore: result.hasMore,
      order: result.order,
      nextCursor: result.hasMore && result.records.length
        ? result.order === "newest_first"
          ? { beforeSequence: result.records.at(-1).sequence }
          : { afterSequence: result.records.at(-1).sequence }
        : null,
      source: "complete_same_match_event_log",
      sourceRecordsDeleted: 0,
      eligibleForTraining: false,
      trainingTruth: false,
    }, "queryResultHash");
  }

  function close(input = {}) {
    const scope = normalizeScope(input.scope);
    const state = states.get(scope.scopeKey);
    if (state?.searchJob && ["queued", "running"].includes(state.searchJob.status)) {
      state.searchJob.status = "stale";
      state.searchJob.staleReason = "match_context_closed";
      state.searchJob.controller.abort();
    }
    states.delete(scope.scopeKey);
    return deepFreeze({ ok: true });
  }

  return Object.freeze({
    metadata: Object.freeze({
      schemaVersion:
        `${STARCRAFT_TMG_MATCH_DECISION_CONTINUITY_VERSION}.metadata`,
      interface: ["observe", "record", "query", "close"],
      perMatchScope: true,
      reconnectDurability: journal.durability || "adapter_managed",
      searchExecution: preExecute ? "asynchronous_preexecution" : "disabled",
      searchCriticalPathWaitMs: 0,
      rulesAuthority: "external_rules_service",
      mayOverrideRules: false,
      trainingTruth: false,
    }),
    observe,
    record,
    query,
    close,
  });
}
