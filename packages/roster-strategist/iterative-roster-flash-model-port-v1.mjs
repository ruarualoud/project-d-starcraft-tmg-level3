import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { createStarcraftTmgOutputContractV1,
  outputContractRefStarcraftTmgV1,
  validateStarcraftTmgProviderJsonSchemaValueV1 } from
  "../structured-generation/output-contract-registry-v1.mjs";

export const ITERATIVE_ROSTER_FLASH_MODEL_PORT_V1 =
  "starcraft_tmg_iterative_roster_flash_model_port_v1";

function fail(code) {
  throw Object.assign(new Error(code), { code });
}

const string = (minLength = 0, maxLength = 200, description = "") => ({
  type: "string", minLength, maxLength, description });
const prose = (description) => string(0, 65_536, description);
const integer = (minimum = 0, maximum = 1_000_000_000) => ({
  type: "integer", minimum, maximum });
const closed = (properties, description = "") => ({
  type: "object", properties, required: Object.keys(properties),
  additionalProperties: false, description });
const list = (items, maxItems = 128) => ({
  type: "array", items, minItems: 0, maxItems });

const schema = closed({
  schemaVersion: { ...string(1, 100),
    enum: [ITERATIVE_ROSTER_FLASH_MODEL_PORT_V1] },
  kind: { ...string(1, 20), enum: ["query", "propose", "finish"] },
  question: prose("Public question for a query; empty otherwise."),
  queries: list(closed({
    kind: { ...string(1, 32), enum: ["candidate_menu",
      "budget_branches", "map_summary", "map_route"] },
    factionRecordKey: string(), scaleId: string(),
    candidateHash: string(),
    startOffset: integer(), maximumEvaluations: integer(),
    maximumMutationDepth: integer(),
  }), 8),
  candidateInput: closed({
    candidateId: string(), sideKey: string(), scaleId: string(),
    mineralBudget: integer(), factionRecordKey: string(),
    tacticalCardRecordKeys: list(string()),
    units: list(closed({
      unitInstanceId: string(), recordKey: string(),
      compositionKind: string(),
      upgrades: list(closed({ upgradeName: string() })),
    })),
  }, "For propose: full Builder input. For other kinds: empty placeholders."),
  plan: closed({
    victoryRoute: prose("How this roster wins on the current task."),
    arrivalScheduleStatus: { ...string(1, 20),
      enum: ["unknown", "legal"] },
    mapEvidenceHash: string(),
    strategy: closed({
      scoreRoute: prose("Scoring windows and objective sequence."),
      rosterRationale: prose("Why this combination fits the victory route."),
      mapRationale: prose("Grounded terrain and access implications."),
      openingSequence: list(prose("Public order and intended purpose.")),
      opponentHypotheses: list(prose("Conditional, falsifiable response.")),
      counterPlans: list(prose("Response and replan trigger.")),
      revisionReason: prose("Why the prior route was retained or changed."),
    }),
  }),
  assumptionDisposition: { ...string(1, 10),
    enum: ["retain", "revise"] },
}, "One public, explicit iterative roster decision; no hidden reasoning.");

const componentRef = (role) => ({
  id: `${ITERATIVE_ROSTER_FLASH_MODEL_PORT_V1}.${role}`,
  version: "1.0.0",
  hash: hashStarcraftTmgContract(
    `${ITERATIVE_ROSTER_FLASH_MODEL_PORT_V1}:${role}:1.0.0`),
});
const contract = createStarcraftTmgOutputContractV1({
  id: "ticket27.iterative_roster_flash_decision.v1",
  version: "1.0.0", schemaName: "iterative_roster_decision_v1",
  providerSchema: schema,
  modelOwnedFields: Object.keys(schema.properties),
  hostOwnedFields: [],
  mapperRef: componentRef("public_decision_mapper"),
  semanticValidatorRef: componentRef("builder_and_map_validation"),
  description: "Strict shape for one iterative public roster decision. "
    + "Builder, map and final review remain separate authorities.",
});

// Provider extras are harmless, but absent or wrong fields are never filled
// with invented plan content. The strict schema is rechecked after pruning.
function projectKnownFields(value, node) {
  if (node.type === "object" && value && typeof value === "object"
    && !Array.isArray(value)) {
    return Object.fromEntries(Object.entries(node.properties)
      .filter(([key]) => Object.hasOwn(value, key))
      .map(([key, child]) => [key,
        projectKnownFields(value[key], child)]));
  }
  if (node.type === "array" && Array.isArray(value)) {
    return value.map((entry) => projectKnownFields(entry, node.items));
  }
  return value;
}

export function inspectIterativeRosterOutputV1(raw) {
  return validateStarcraftTmgProviderJsonSchemaValueV1(schema,
    projectKnownFields(normalizeDisposition(raw), schema));
}

function normalizeDisposition(raw) {
  // Older prompt examples led the provider to place this one decision-level
  // field inside plan. Preserve the explicit value; never infer it.
  if (raw && typeof raw === "object"
    && !Object.hasOwn(raw, "assumptionDisposition")
    && Object.hasOwn(raw.plan || {}, "assumptionDisposition")) {
    return { ...raw,
      assumptionDisposition: raw.plan.assumptionDisposition };
  }
  return raw;
}

function decisionFromOutput(raw) {
  const output = projectKnownFields(normalizeDisposition(raw), schema);
  const verdict = validateStarcraftTmgProviderJsonSchemaValueV1(schema,
    output);
  if (!verdict.ok || output.schemaVersion
    !== ITERATIVE_ROSTER_FLASH_MODEL_PORT_V1) {
    fail("ITERATIVE_ROSTER_FLASH_OUTPUT_INVALID");
  }
  if (output.kind === "query") {
    return { kind: "query", question: output.question,
      queries: output.queries.map((query) => {
        if (query.kind === "candidate_menu") return {
          kind: query.kind, factionRecordKey: query.factionRecordKey,
          scaleId: query.scaleId };
        if (query.kind === "budget_branches") return {
          kind: query.kind, candidateHash: query.candidateHash,
          startOffset: query.startOffset,
          maximumEvaluations: query.maximumEvaluations,
          maximumMutationDepth: query.maximumMutationDepth };
        if (query.kind === "map_route") return {
          kind: query.kind, candidateHash: query.candidateHash };
        return { kind: "map_summary" };
      }) };
  }
  const plan = { ...output.plan,
    mapEvidenceHash: output.plan.mapEvidenceHash || null };
  if (output.kind === "propose") return { kind: "propose",
    candidateInput: output.candidateInput,
    plan, assumptionDisposition: output.assumptionDisposition };
  return { kind: "finish", plan,
    assumptionDisposition: output.assumptionDisposition };
}

function decisionContext(state, skillGuidance, missionEvidence) {
  // Operational pause/recovery flags must not change a paid reply's context.
  // Candidate, map evidence and prior decisions must change it.
  const decisionState = {
    sessionId: state.sessionId, revision: state.revision,
    mineralBudget: state.mineralBudget,
    frozenContext: state.frozenContext,
    currentCandidate: state.currentCandidate,
    plan: state.plan, observations: state.observations,
    iterations: state.iterations,
  };
  return { decisionState, skillGuidance, missionEvidence,
    exactMineralBudget: state.mineralBudget,
    rulesAuthority: "official_army_builder_only",
    mapAuthority: "frozen_read_only_room_evidence_only" };
}

function decisionFailure(decision, state) {
  const current = state.currentCandidate;
  const routeObserved = (candidateHash, receiptHash) =>
    state.observations.some((entry) => entry.query?.kind === "map_route"
      && entry.query.candidateHash === candidateHash
      && entry.receipt?.receiptHash === receiptHash
      && ["exact", "certified", "advisory"].includes(
        entry.receipt.status));
  if (decision.kind === "query") {
    if (!decision.question.trim() || decision.queries.length === 0) {
      return "ITERATIVE_ROSTER_FLASH_QUERY_INVALID";
    }
  }
  if (decision.kind === "propose") {
    if (decision.candidateInput.units.length === 0
      || decision.candidateInput.mineralBudget !== state.mineralBudget
      || decision.candidateInput.sideKey !== state.frozenContext.sideKey
      || decision.candidateInput.factionRecordKey
        !== state.frozenContext.factionRecordKey
      || decision.candidateInput.scaleId !== state.frozenContext.scaleId
      || !decision.plan.victoryRoute.trim()) {
      return "ITERATIVE_ROSTER_FLASH_PROPOSAL_INVALID";
    }
  }
  if (decision.kind === "finish") {
    if (!current || current.mineralSpent !== state.mineralBudget
      || !decision.plan.victoryRoute.trim()
      || !decision.plan.mapEvidenceHash
      || !routeObserved(current.candidateHash,
        decision.plan.mapEvidenceHash)) {
      return "ITERATIVE_ROSTER_FLASH_FINISH_INVALID";
    }
  }
  if (state.plan && decision.kind !== "query"
    && decision.plan.victoryRoute !== state.plan.victoryRoute
    && decision.assumptionDisposition !== "revise") {
    return "ITERATIVE_ROSTER_FLASH_ROUTE_REVISION_UNDECLARED";
  }
  return null;
}

function admissibleQueries(decision, state) {
  if (decision.kind === "propose") {
    const supplied = decision.plan.mapEvidenceHash;
    if (supplied && !state.observations.some((entry) => (
      (entry.query?.kind === "map_summary"
        && entry.receipt?.status === "certified"
        && entry.receipt.mapBinding?.roomFreezeHash === supplied
        && supplied === state.frozenContext.mapHash)
      || (entry.query?.kind === "map_route"
        && entry.query.candidateHash
          === hashStarcraftTmgContract(decision.candidateInput)
        && ["exact", "certified", "advisory"].includes(entry.receipt.status)
        && entry.receipt.receiptHash === supplied)))) {
      return { ...decision,
        plan: { ...decision.plan, mapEvidenceHash: null },
        ignoredEvidenceHash: supplied };
    }
    return decision;
  }
  if (decision.kind !== "query") return decision;
  const queries = [];
  const ignoredQueries = [];
  for (const query of decision.queries) {
    let reason = null;
    if (query.kind === "candidate_menu"
      && (query.factionRecordKey
          !== state.frozenContext.factionRecordKey
        || query.scaleId !== state.frozenContext.scaleId)) {
      reason = "MENU_CONTEXT_MISMATCH";
    }
    if (query.kind === "budget_branches"
      && (!state.currentCandidate
        || query.candidateHash !== state.currentCandidate.candidateHash)) {
      reason = "BUDGET_BRANCHES_REQUIRE_CURRENT_CANDIDATE";
    }
    if (query.kind === "map_route"
      && (!state.currentCandidate
        || query.candidateHash !== state.currentCandidate.candidateHash)) {
      reason = "MAP_ROUTE_REQUIRES_CURRENT_CANDIDATE";
    }
    if (reason) ignoredQueries.push({ kind: query.kind, reason });
    else queries.push(query);
  }
  return { ...decision, queries, ignoredQueries };
}

export function createIterativeRosterFlashModelPortV1({
  deliberationFactory, replyStore, skillGuidance, missionEvidence,
} = {}) {
  if (typeof deliberationFactory?.createForRun !== "function"
    || typeof replyStore?.loadRetainedReply !== "function"
    || typeof replyStore?.retainReply !== "function"
    || !skillGuidance || !missionEvidence) {
    fail("ITERATIVE_ROSTER_FLASH_PORT_MISSING");
  }
  const recovered = async (requestKey, state) => {
    const reply = await replyStore.loadRetainedReply(requestKey);
    if (!reply || !["completed", "repair_needed"].includes(reply.outcome)
      || reply.requestKey !== requestKey
      || typeof reply.receiptHash !== "string") {
      fail("ITERATIVE_ROSTER_RETAINED_REPLY_UNAVAILABLE");
    }
    const repair = (failureCode) => ({ outcome: "completed",
      receiptHash: reply.receiptHash,
      decision: { kind: "repair_needed", failureCode,
        providerReplyHash: reply.output
          ? hashStarcraftTmgContract(reply.output)
          : reply.failedOutputRecord?.rawTextHash || null },
      reconciledFromRequestKey: reply.reconciledFromRequestKey || null });
    const expectedContextHash = hashStarcraftTmgContract(
      decisionContext(state, skillGuidance, missionEvidence));
    if (reply.contextHash !== expectedContextHash) {
      fail("ITERATIVE_ROSTER_RETAINED_CONTEXT_MISMATCH");
    }
    if (reply.outcome === "repair_needed") {
      return repair(reply.failureCode);
    }
    let decision;
    try { decision = admissibleQueries(decisionFromOutput(reply.output),
      state); }
    catch { return repair("ITERATIVE_ROSTER_FLASH_OUTPUT_INVALID"); }
    const failureCode = decisionFailure(decision, state);
    if (failureCode) return repair(failureCode);
    return { outcome: "completed", receiptHash: reply.receiptHash,
      decision, reconciledFromRequestKey:
        reply.reconciledFromRequestKey || null };
  };
  const reconcile = async ({ requestKey, sourceRequestKey, state }) => {
    if (!state.iterations.some((entry) => (
      entry.requestKey === sourceRequestKey
        && entry.decisionKind === "repair_needed"))) {
      fail("ITERATIVE_ROSTER_RECONCILIATION_SOURCE_INVALID");
    }
    let source = await replyStore.loadRetainedReply(sourceRequestKey);
    if (source?.reconciledFromRequestKey) {
      sourceRequestKey = source.reconciledFromRequestKey;
      if (!state.iterations.some((entry) => (
        entry.requestKey === sourceRequestKey
          && entry.decisionKind === "repair_needed"))) {
        fail("ITERATIVE_ROSTER_RECONCILIATION_SOURCE_INVALID");
      }
      source = await replyStore.loadRetainedReply(sourceRequestKey);
    }
    if (source?.paidProviderCall !== true || source.outcome !== "completed"
      || !source.output) {
      fail("ITERATIVE_ROSTER_RECONCILIATION_SOURCE_INVALID");
    }
    if (state.iterations.filter((entry) => (
      entry.reconciledFromRequestKey === sourceRequestKey)).length >= 3) {
      fail("ITERATIVE_ROSTER_RECONCILIATION_LIMIT_REACHED");
    }
    const prior = await replyStore.loadRetainedReply(requestKey);
    if (!prior) {
      const contextHash = hashStarcraftTmgContract(
        decisionContext(state, skillGuidance, missionEvidence));
      await replyStore.retainReply(requestKey, {
        outcome: "completed", requestKey, contextHash,
        receiptHash: hashStarcraftTmgContract({ requestKey,
          sourceRequestKey, sourceReceiptHash: source.receiptHash,
          contextHash, reuseKind: "retained_paid_output_revalidation" }),
        output: source.output,
        usage: { inputUnits: 0, outputUnits: 0, totalUnits: 0 },
        paidProviderCall: false, reconciledFromRequestKey: sourceRequestKey,
      });
    }
    return recovered(requestKey, state);
  };
  return Object.freeze({
    reconcile,
    recover: async ({ requestKey, sourceRequestKey, state }) => (
      sourceRequestKey
        ? reconcile({ requestKey, sourceRequestKey, state })
        : recovered(requestKey, state)),
    decide: async ({ requestKey, state }) => {
      const previous = await replyStore.loadRetainedReply(requestKey);
      if (previous) return recovered(requestKey, state);
      const context = decisionContext(state, skillGuidance,
        missionEvidence);
      const contextHash = hashStarcraftTmgContract(context);
      const deliberation = await deliberationFactory.createForRun({
        sessionId: state.sessionId,
        runKind: "iterative_roster_step",
        onEvent: async (event) => {
          if (event?.type === "round_completed") {
            await replyStore.retainReply(requestKey, {
              outcome: "completed", requestKey,
              contextHash, receiptHash: event.receiptHash,
              output: event.sanitizedOutputRecord?.sanitizedOutput,
              usage: event.usage, paidProviderCall: true,
            });
          } else if (event?.type === "round_failed"
            && event.paidProviderCall === true) {
            const failureCode = String(event.code
              || "ITERATIVE_ROSTER_PAID_OUTPUT_REJECTED");
            await replyStore.retainReply(requestKey, {
              outcome: "repair_needed", requestKey, contextHash,
              receiptHash: event.receiptHash || hashStarcraftTmgContract({
                requestKey, failureCode, usage: event.usage || null }),
              failureCode,
              failedOutputRecord: event.failedOutputRecord || null,
              usage: event.usage, paidProviderCall: true,
            });
          }
        },
      });
      try { await deliberation.deliberate({
        roundKind: "iterative_roster_decision",
        roundIndex: state.revision + 1,
        promptPack: ITERATIVE_ROSTER_FLASH_MODEL_PORT_V1,
        promptNodes: [{ role: "frozen_context", content: context }],
        userMessage: "Choose one public decision. Query the official Builder "
          + "menu or frozen map when needed; propose a complete candidate, "
          + "inspect exact budget branches only after a Rules-legal current "
          + "candidate exists, and ask map_route only for that candidate's "
          + "hash. Before a candidate exists, use candidate_menu and/or "
          + "map_summary; do not mix budget_branches into that first query. "
          + "Revise your route as evidence "
          + "changes. Finish only with an exact-budget legal candidate, "
          + "current-candidate map evidence and a substantive scoring/opening/"
          + "opponent-response plan. Use empty placeholders for fields that "
          + "the chosen kind does not consume. Do not invent Rules outcomes "
          + "or private chain of thought.",
        responseContract: {
          schemaVersion: ITERATIVE_ROSTER_FLASH_MODEL_PORT_V1,
          finalAuthority: "Builder plus map route plus host final review",
          queryKinds: ["candidate_menu", "budget_branches",
            "map_summary", "map_route"],
        },
        contextHash,
        responseFormat: { kind: "provider_strict_json_schema",
          schemaName: contract.schemaName,
          schema: contract.providerSchema,
          outputContractRef: outputContractRefStarcraftTmgV1(contract) },
      }); } catch (error) {
        if (!await replyStore.loadRetainedReply(requestKey)) throw error;
      }
      return recovered(requestKey, state);
    },
  });
}
