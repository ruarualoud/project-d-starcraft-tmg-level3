import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";

export const ITERATIVE_ROSTER_PLAN_SESSION_V1 =
  "starcraft_tmg_iterative_roster_plan_session_v1";

const ID = /^[A-Za-z0-9._:-]{8,200}$/u;

function fail(code) {
  throw Object.assign(new Error(code), { code });
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function copy(value) {
  return structuredClone(value);
}

function requiredId(value, label) {
  if (typeof value !== "string" || !ID.test(value)) fail(label);
  return value;
}

function requiredHash(value, label) {
  if (typeof value !== "string" || value.length < 8 || value.length > 200) {
    fail(label);
  }
  return value;
}

function requirePorts(ports) {
  for (const [port, method] of [
    ["store", "load"], ["store", "save"], ["model", "decide"],
    ["builder", "evaluate"], ["tools", "query"], ["review", "final"],
  ]) {
    if (typeof ports[port]?.[method] !== "function") {
      fail("ITERATIVE_ROSTER_PORT_MISSING");
    }
  }
}

function publicPlan(value, candidateHash, priorPlan, observations) {
  if (!object(value) || typeof value.victoryRoute !== "string"
    || !value.victoryRoute.trim()
    || !["unknown", "legal"].includes(value.arrivalScheduleStatus)
    || !(value.mapEvidenceHash === null
      || typeof value.mapEvidenceHash === "string")) {
    fail("ITERATIVE_ROSTER_PLAN_INVALID");
  }
  if (value.mapEvidenceHash !== null
    && !observations.some((entry) => (
      entry.query.kind === "map_route"
      && ["exact", "certified", "advisory"].includes(entry.receipt.status)
      &&
      entry.receipt.receiptHash === value.mapEvidenceHash))) {
    fail("ITERATIVE_ROSTER_MAP_EVIDENCE_UNBOUND");
  }
  if (priorPlan && priorPlan.victoryRoute !== value.victoryRoute
    && value.assumptionDisposition !== "revise") {
    fail("ITERATIVE_ROSTER_ROUTE_REVISION_UNDECLARED");
  }
  return { victoryRoute: value.victoryRoute.trim(),
    mapEvidenceHash: value.mapEvidenceHash,
    arrivalScheduleStatus: value.arrivalScheduleStatus,
    candidateHash, assumptionDisposition: value.assumptionDisposition };
}

export function createIterativeRosterPlanSessionV1(ports = {}) {
  requirePorts(ports);
  const busy = new Set();

  async function read(sessionId) {
    requiredId(sessionId, "ITERATIVE_ROSTER_SESSION_ID_INVALID");
    const state = await ports.store.load(sessionId);
    if (!state || state.schema !== ITERATIVE_ROSTER_PLAN_SESSION_V1
      || state.sessionId !== sessionId) {
      fail("ITERATIVE_ROSTER_SESSION_NOT_FOUND");
    }
    return copy(state);
  }

  async function start(input = {}) {
    const sessionId = requiredId(input.sessionId,
      "ITERATIVE_ROSTER_SESSION_ID_INVALID");
    if (await ports.store.load(sessionId)) fail("ITERATIVE_ROSTER_SESSION_EXISTS");
    const mineralBudget = Number(input.mineralBudget);
    const frozenContext = input.frozenContext;
    if (!Number.isSafeInteger(mineralBudget) || mineralBudget < 1
      || !object(frozenContext)) fail("ITERATIVE_ROSTER_CONTEXT_INVALID");
    for (const field of ["mapHash", "taskHash", "sourceHash"]) {
      requiredHash(frozenContext[field], "ITERATIVE_ROSTER_CONTEXT_INVALID");
    }
    const state = {
      schema: ITERATIVE_ROSTER_PLAN_SESSION_V1,
      sessionId, status: "active", revision: 0, mineralBudget,
      frozenContext: copy(frozenContext),
      contextHash: hashStarcraftTmgContract({ mineralBudget, frozenContext }),
      currentCandidate: null, plan: null, observations: [], iterations: [],
      pendingDecision: null, pauseRequested: false, finalReview: null,
      modelDecisionReceiptCount: 0,
      trainingTruth: false,
    };
    await ports.store.save(sessionId, copy(state));
    return copy(state);
  }

  async function pause(sessionId) {
    const state = await read(sessionId);
    if (state.status === "ready_for_match") return state;
    if (!["active", "paused"].includes(state.status)) {
      fail("ITERATIVE_ROSTER_RECONCILIATION_REQUIRED");
    }
    state.pauseRequested = true;
    if (!busy.has(sessionId)) state.status = "paused";
    await ports.store.save(sessionId, copy(state));
    return copy(state);
  }

  async function resume(sessionId) {
    let state = await read(sessionId);
    if (state.status === "ready_for_match") return state;
    if (busy.has(sessionId)) fail("ITERATIVE_ROSTER_SESSION_BUSY");
    const retainedRecovery = state.status === "requires_reconciliation"
      && Boolean(state.pendingDecision)
      && typeof ports.model.recover === "function";
    if (!["active", "paused"].includes(state.status) && !retainedRecovery) {
      fail("ITERATIVE_ROSTER_RECONCILIATION_REQUIRED");
    }
    const recovering = Boolean(state.pendingDecision);
    if (recovering) {
      // The external model adapter must recover this exact request key from
      // its retained reply. An ambiguous dispatched attempt is never sent
      // again by this module.
      if (typeof ports.model.recover !== "function") {
        fail("ITERATIVE_ROSTER_PENDING_DECISION_RECONCILIATION_REQUIRED");
      }
    }
    busy.add(sessionId);
    try {
      state.status = "active";
      state.pauseRequested = false;
      const requestKey = state.pendingDecision?.requestKey
        || hashStarcraftTmgContract({ sessionId,
          contextHash: state.contextHash, nextRevision: state.revision + 1,
          precedingReceiptHash: state.iterations.at(-1)?.receiptHash || null });
      state.pendingDecision = { requestKey,
        nextRevision: state.revision + 1 };
      await ports.store.save(sessionId, copy(state));
      let reply;
      try {
        reply = recovering
          ? await ports.model.recover({ requestKey })
          : await ports.model.decide({ requestKey,
            state: copy({ ...state, pendingDecision: null }) });
      } catch (error) {
        state = await read(sessionId);
        state.status = "requires_reconciliation";
        state.pendingDecision.recoveryRequired = true;
        await ports.store.save(sessionId, copy(state));
        throw error;
      }
      if (reply?.outcome !== "completed"
        || typeof reply.receiptHash !== "string"
        || !object(reply.decision)) {
        state = await read(sessionId);
        state.status = "requires_reconciliation";
        state.pendingDecision.recoveryRequired = true;
        await ports.store.save(sessionId, copy(state));
        fail("ITERATIVE_ROSTER_MODEL_OUTCOME_UNKNOWN");
      }
      state = await read(sessionId);
      const decision = copy(reply.decision);
      const toolReceipts = [];
      let verdict = null;
      if (decision.kind === "query") {
        if (!Array.isArray(decision.queries) || decision.queries.length < 1
          || decision.queries.length > 8
          || typeof decision.question !== "string"
          || !decision.question.trim()) {
          fail("ITERATIVE_ROSTER_QUERY_INVALID");
        }
        const receipts = await Promise.all(decision.queries.map((query) => (
          ports.tools.query(copy(query), copy(state)))));
        for (let index = 0; index < receipts.length; index += 1) {
          const receipt = receipts[index];
          requiredHash(receipt?.receiptHash,
            "ITERATIVE_ROSTER_TOOL_RECEIPT_INVALID");
          const observation = { query: copy(decision.queries[index]),
            receipt: copy(receipt), requestKey };
          state.observations.push(observation);
          toolReceipts.push(observation);
        }
      } else if (decision.kind === "propose") {
        if (!object(decision.candidateInput)
          || !["retain", "revise"].includes(
            decision.assumptionDisposition)) {
          fail("ITERATIVE_ROSTER_PROPOSAL_INVALID");
        }
        verdict = await ports.builder.evaluate(
          copy(decision.candidateInput), copy(state));
        const candidateHash = hashStarcraftTmgContract(decision.candidateInput);
        if (!object(verdict) || typeof verdict.legal !== "boolean"
          || verdict.candidateHash !== candidateHash
          || verdict.mineralBudget !== state.mineralBudget
          || !["legal", "illegal", "invalid_candidate", "unknown"]
            .includes(verdict.status)
          || (verdict.legal && (verdict.status !== "legal"
            || !Number.isSafeInteger(verdict.mineralSpent)
            || verdict.mineralSpent > state.mineralBudget
            || verdict.mineralSpent < 0
            || typeof verdict.verdictHash !== "string"))
          || (!verdict.legal && (verdict.status === "legal"
            || verdict.mineralSpent !== null
            || typeof verdict.receiptHash !== "string"))) {
          fail("ITERATIVE_ROSTER_RULES_VERDICT_INVALID");
        }
        if (verdict.legal) {
          const previousPlan = state.plan;
          state.currentCandidate = { input: copy(decision.candidateInput),
            candidateHash, mineralSpent: verdict.mineralSpent,
            verdictHash: requiredHash(verdict.verdictHash,
              "ITERATIVE_ROSTER_RULES_VERDICT_INVALID") };
          state.plan = publicPlan({ ...decision.plan,
            assumptionDisposition: decision.assumptionDisposition },
          candidateHash, previousPlan, state.observations);
          if (verdict.mineralSpent < state.mineralBudget) {
            const query = { kind: "budget_branches", candidateHash,
              mineralShortfall: state.mineralBudget - verdict.mineralSpent };
            const receipt = await ports.tools.query(query, copy(state));
            requiredHash(receipt?.receiptHash,
              "ITERATIVE_ROSTER_TOOL_RECEIPT_INVALID");
            if (receipt.exactBudgetImpossibilityClaimed !== false) {
              fail("ITERATIVE_ROSTER_FALSE_IMPOSSIBILITY_CLAIM");
            }
            const observation = { query, receipt: copy(receipt), requestKey };
            state.observations.push(observation);
            toolReceipts.push(observation);
          }
        } else {
          state.observations.push({ query: { kind: "builder_verdict",
            candidateHash }, receipt: { status: verdict.status,
            receiptHash: verdict.receiptHash,
            rejectionKind: verdict.rejectionKind ?? null,
            rulesErrorCode: verdict.rulesErrorCode ?? null,
            portErrorCode: verdict.portErrorCode ?? null }, requestKey });
        }
      } else if (decision.kind === "finish") {
        if (!state.currentCandidate || !state.plan
          || state.currentCandidate.mineralSpent !== state.mineralBudget
          || state.plan.candidateHash !== state.currentCandidate.candidateHash
          || state.plan.arrivalScheduleStatus !== "legal"
          || !state.plan.mapEvidenceHash
          || !state.observations.some((entry) => (
            entry.query.kind === "map_route"
            && ["exact", "certified", "advisory"].includes(
              entry.receipt.status)
            &&
            entry.receipt.receiptHash === state.plan.mapEvidenceHash))) {
          fail("ITERATIVE_ROSTER_NOT_READY_FOR_MATCH");
        }
        const review = await ports.review.final(copy(state));
        if (!Array.isArray(review?.blockingFindings)
          || review.blockingFindings.length > 0) {
          fail("ITERATIVE_ROSTER_FINAL_REVIEW_BLOCKED");
        }
        state.finalReview = { reviewHash: requiredHash(review.reviewHash,
          "ITERATIVE_ROSTER_FINAL_REVIEW_INVALID"), blockingFindings: [] };
        state.status = "ready_for_match";
      } else {
        fail("ITERATIVE_ROSTER_DECISION_KIND_INVALID");
      }
      const receiptBody = { revision: state.revision + 1, requestKey,
        modelReceiptHash: reply.receiptHash,
        decisionHash: hashStarcraftTmgContract(decision),
        decisionKind: decision.kind,
        rulesVerdictHash: verdict?.verdictHash || verdict?.receiptHash || null,
        rulesVerdictStatus: verdict?.status || null,
        toolReceiptHashes: toolReceipts.map((entry) => (
          entry.receipt.receiptHash)),
        currentCandidateHash: state.currentCandidate?.candidateHash || null,
        planHash: state.plan ? hashStarcraftTmgContract(state.plan) : null,
        status: state.status, trainingTruth: false };
      state.iterations.push({ ...receiptBody,
        receiptHash: hashStarcraftTmgContract(receiptBody) });
      state.revision += 1;
      state.pendingDecision = null;
      state.modelDecisionReceiptCount += 1;
      const latest = await read(sessionId);
      if (latest.pauseRequested && state.status === "active") {
        state.status = "paused";
      }
      state.pauseRequested = false;
      await ports.store.save(sessionId, copy(state));
      return copy(state);
    } finally {
      busy.delete(sessionId);
    }
  }

  return Object.freeze({ start, resume, pause, read });
}
