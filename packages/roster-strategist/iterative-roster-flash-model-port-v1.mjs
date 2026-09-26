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
const proposalOnlySchema = {
  ...schema, properties: { ...schema.properties,
    kind: { ...schema.properties.kind, enum: ["propose"] } },
};
const proposalOnlyContract = createStarcraftTmgOutputContractV1({
  id: "ticket27.iterative_roster_rebuild_decision.v1",
  version: "1.0.0", schemaName: "iterative_roster_rebuild_v1",
  providerSchema: proposalOnlySchema,
  modelOwnedFields: Object.keys(proposalOnlySchema.properties),
  hostOwnedFields: [],
  mapperRef: componentRef("public_rebuild_mapper"),
  semanticValidatorRef: componentRef("builder_rebuild_validation"),
  description: "After bounded local search saturates, submit a changed roster "
    + "for complete Builder judgment; no new Rules authority is implied.",
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

function compactObservation(entry) {
  if (entry.query?.kind !== "budget_branches") return entry;
  const receipt = entry.receipt || {};
  return { ...entry, receipt: {
    status: receipt.status,
    receiptHash: receipt.receiptHash,
    sourceCandidateHash: receipt.sourceCandidateHash,
    sourceMineralShortfall: receipt.sourceMineralShortfall,
    branches: (receipt.branches || []).map((branch) => ({
      branchId: branch.branchId,
      steps: branch.steps,
      candidateHash: branch.candidateHash,
      mineralSpent: branch.mineralSpent,
      mineralShortfall: branch.mineralShortfall,
      exactBudget: branch.exactBudget,
      menuSlotOverflowAdvisory: branch.menuSlotOverflowAdvisory,
    })),
    capacityDirections: receipt.capacityDirections || [],
    capacityDirectionsAreMenuOnly:
      receipt.capacityDirectionsAreMenuOnly === true,
    nextPage: receipt.nextPage,
    truncated: receipt.truncated,
    strategyRankingPerformed: false,
  } };
}

function requiredDecisionReason(state) {
  if (!state.currentCandidate
    || state.currentCandidate.mineralSpent >= state.mineralBudget) {
    return null;
  }
  const latest = state.iterations.at(-1);
  if (state.modelContextVersion === 2
    && latest?.decisionKind === "propose"
    && latest.rulesVerdictStatus === "illegal"
    && state.observations.some((entry) =>
      entry.requestKey === latest.requestKey
        && entry.query?.kind === "builder_verdict")) {
    return "latest_builder_rejected_candidate_requires_revision";
  }
  if (state.modelContextVersion === 2
    && state.observations.some((entry) =>
      entry.query?.kind === "exact_budget_repairs"
        && entry.query.candidateHash
          === state.currentCandidate.candidateHash
        && entry.receipt?.matches?.length > 0)) {
    return "builder_certified_exact_budget_options_available";
  }
  let sameCandidatePages = 0;
  for (const iteration of [...state.iterations].reverse()) {
    if (iteration.decisionKind !== "query") break;
    if (!state.observations.some((entry) =>
      entry.requestKey === iteration.requestKey
        && entry.query?.kind === "budget_branches"
        && entry.query.candidateHash
          === state.currentCandidate.candidateHash)) break;
    sameCandidatePages += 1;
  }
  if (sameCandidatePages >= 3) {
    return "three_consecutive_budget_pages_without_roster_change";
  }
  if (state.modelContextVersion === 2
    && latest?.decisionKind === "propose"
    && state.observations.some((entry) =>
      entry.requestKey === latest.requestKey
        && entry.query?.kind === "budget_branches"
        && entry.query.candidateHash
          === state.currentCandidate.candidateHash)) {
    return "new_draft_under_budget_with_bounded_branch_evidence";
  }
  return null;
}

function decisionContext(state, skillGuidance, missionEvidence) {
  // Operational pause/recovery flags must not change a paid reply's context.
  // Candidate, map evidence and prior decisions must change it.
  const decisionState = {
    sessionId: state.sessionId, revision: state.revision,
    mineralBudget: state.mineralBudget,
    frozenContext: state.frozenContext,
    currentCandidate: state.currentCandidate,
    plan: state.plan,
    observations: state.modelContextVersion === 2
      ? state.observations.map(compactObservation)
      : state.observations,
    iterations: state.iterations,
  };
  if (state.modelContextVersion === 2) {
    decisionState.modelContextVersion = 2;
  }
  return { decisionState, skillGuidance, missionEvidence,
    ...(requiredDecisionReason(state)
      ? { requiredDecisionKind: "propose",
        localSearchSaturation: {
          currentMineralSpent: state.currentCandidate.mineralSpent,
          requiredMineralSpent: state.mineralBudget,
          mineralShortfall: state.mineralBudget
            - state.currentCandidate.mineralSpent,
          reason: requiredDecisionReason(state),
        } } : {}),
    exactMineralBudget: state.mineralBudget,
    rulesAuthority: "official_army_builder_only",
    mapAuthority: "frozen_read_only_room_evidence_only" };
}

function menuSlotProjection(candidateInput, observations) {
  const menu = observations.find((entry) =>
    entry.query?.kind === "candidate_menu")?.receipt;
  if (!menu?.faction?.startingArmySlots) return null;
  const available = { ...menu.faction.startingArmySlots };
  const used = {};
  const cards = new Map((menu.tacticalCandidates || []).map((entry) =>
    [entry.recordKey, entry]));
  const units = new Map((menu.unitCandidates || []).map((entry) =>
    [entry.recordKey, entry]));
  for (const key of candidateInput.tacticalCardRecordKeys || []) {
    const grants = cards.get(key)?.armySlotsAdded;
    if (!grants) return null;
    for (const [kind, count] of Object.entries(grants)) {
      available[kind] = (available[kind] || 0) + count;
    }
  }
  for (const selected of candidateInput.units || []) {
    const unit = units.get(selected.recordKey);
    const option = unit?.compositionOptions.find((entry) =>
      entry.compositionKind === selected.compositionKind);
    if (!unit?.armySlotType || !Number.isSafeInteger(
      option?.occupiedArmySlots)) return null;
    used[unit.armySlotType] = (used[unit.armySlotType] || 0)
      + option.occupiedArmySlots;
  }
  return { source: "official_builder_menu_arithmetic_not_a_rules_verdict",
    available, used,
    overflow: Object.fromEntries(Object.entries(used)
      .filter(([kind, count]) => count > (available[kind] || 0))
      .map(([kind, count]) => [kind, count - (available[kind] || 0)])) };
}

async function decisionContextWithRejectedProposal(state, skillGuidance,
  missionEvidence, replyStore) {
  const context = decisionContext(state, skillGuidance, missionEvidence);
  if (state.modelContextVersion !== 2) return context;
  const latest = state.iterations.at(-1);
  if (latest?.decisionKind !== "propose"
    || latest.rulesVerdictStatus === "legal") return context;
  const rejection = state.observations.findLast((entry) =>
    entry.requestKey === latest.requestKey
      && entry.query?.kind === "builder_verdict");
  if (!rejection || rejection.receipt?.status !== "illegal") return context;
  const retained = await replyStore.loadRetainedReply(latest.requestKey);
  const candidateInput = retained?.output?.candidateInput;
  if (retained?.outcome !== "completed"
    || retained.output?.kind !== "propose"
    || !candidateInput
    || hashStarcraftTmgContract(candidateInput)
      !== rejection.query.candidateHash) return context;
  return { ...context, lastRejectedProposal: {
    candidateInput,
    rejectedCandidateHash: rejection.query.candidateHash,
    officialBuilderRejection: {
      rejectionKind: rejection.receipt.rejectionKind,
      rulesErrorCode: rejection.receipt.rulesErrorCode,
      rulesErrorDetail: rejection.receipt.rulesErrorDetail,
    },
    slotProjection: menuSlotProjection(candidateInput, state.observations),
    status: "rejected_not_current_roster",
  } };
}

function decisionFailure(decision, state) {
  const current = state.currentCandidate;
  if (requiredDecisionReason(state)
    && decision.kind !== "propose") {
    return "ITERATIVE_ROSTER_FLASH_REBUILD_REQUIRED";
  }
  const routeObserved = (candidateHash, receiptHash) =>
    state.observations.some((entry) => entry.query?.kind === "map_route"
      && entry.query.candidateHash === candidateHash
      && entry.receipt?.receiptHash === receiptHash
      && ["exact", "certified", "advisory"].includes(
        entry.receipt.status));
  if (decision.kind === "query") {
    // The query's typed parameters, not its optional prose label, determine
    // the tool call. A blank label must not discard an otherwise valid paid
    // decision (observed at revision 19).
    if (decision.queries.length === 0) {
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
    if (current && current.mineralSpent < state.mineralBudget
      && hashStarcraftTmgContract(decision.candidateInput)
        === current.candidateHash) {
      return "ITERATIVE_ROSTER_FLASH_UNCHANGED_UNDER_BUDGET";
    }
  }
  if (decision.kind === "finish") {
    if (!current) return "ITERATIVE_ROSTER_FLASH_FINISH_NO_CANDIDATE";
    if (current.mineralSpent !== state.mineralBudget) {
      return "ITERATIVE_ROSTER_FLASH_FINISH_BUDGET_SHORTFALL";
    }
    if (!decision.plan.victoryRoute.trim()
      || !decision.plan.mapEvidenceHash
      || !routeObserved(current.candidateHash,
        decision.plan.mapEvidenceHash)) {
      return "ITERATIVE_ROSTER_FLASH_FINISH_MAP_ROUTE_UNBOUND";
    }
  }
  if (state.plan && decision.kind === "finish"
    && decision.plan.victoryRoute !== state.plan.victoryRoute
    && decision.assumptionDisposition !== "revise") {
    return "ITERATIVE_ROSTER_FLASH_ROUTE_REVISION_UNDECLARED";
  }
  return null;
}

function admissibleQueries(decision, state) {
  if (decision.kind === "finish" && state.currentCandidate) {
    const currentHash = state.currentCandidate.candidateHash;
    const route = state.observations.findLast((entry) =>
      entry.query?.kind === "map_route"
        && entry.query.candidateHash === currentHash
        && entry.receipt?.status === "certified");
    const supplied = decision.plan.mapEvidenceHash;
    const summaryIsBound = !supplied
      || supplied === state.frozenContext.mapHash
      || state.observations.some((entry) =>
      entry.query?.kind === "map_summary"
        && entry.receipt?.status === "certified"
        && entry.receipt.receiptHash === supplied
        && entry.receipt.mapBinding?.roomFreezeHash
          === state.frozenContext.mapHash);
    // The model may cite the map-summary receipt after a current-candidate
    // route audit was fetched. Rebind only this known summary alias to the
    // certified route; keep the original pointer visible for final review.
    if (route && summaryIsBound && supplied !== route.receipt.receiptHash) {
      return { ...decision, plan: { ...decision.plan,
        mapEvidenceHash: route.receipt.receiptHash },
      originalMapEvidenceHash: supplied || null,
      evidenceBindingKind: "certified_current_candidate_route" };
    }
  }
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
        diagnostics: failureCode === "ITERATIVE_ROSTER_FLASH_FINISH_BUDGET_SHORTFALL"
          ? { currentMineralSpent: state.currentCandidate?.mineralSpent ?? null,
            requiredMineralSpent: state.mineralBudget,
            mineralShortfall: state.mineralBudget
              - Number(state.currentCandidate?.mineralSpent || 0),
            requiredNextAction: "revise_roster_or_query_budget_branches" }
          : null,
        providerReplyHash: reply.output
          ? hashStarcraftTmgContract(reply.output)
          : reply.failedOutputRecord?.rawTextHash || null },
      reconciledFromRequestKey: reply.reconciledFromRequestKey || null });
    const expectedContextHash = hashStarcraftTmgContract(
      await decisionContextWithRejectedProposal(state, skillGuidance,
        missionEvidence, replyStore));
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
        await decisionContextWithRejectedProposal(state, skillGuidance,
          missionEvidence, replyStore));
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
      const context = await decisionContextWithRejectedProposal(state,
        skillGuidance, missionEvidence, replyStore);
      const contextHash = hashStarcraftTmgContract(context);
      const rebuildOnly = context.requiredDecisionKind === "propose";
      const activeContract = rebuildOnly ? proposalOnlyContract : contract;
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
        userMessage: rebuildOnly
          ? "This under-budget roster has bounded local budget evidence. "
            + "If lastRejectedProposal is present, repair that exact "
            + "candidate against the official Builder rejection and its "
            + "menu-derived slot ledger; rejected proposals are not current "
            + "rosters. "
            + "If exact_budget_repairs contains Builder-certified 2000-point "
            + "options, select or strategically revise one of those complete "
            + "candidates rather than recomputing its costs yourself. "
            + "Submit a NEW, "
            + "complete candidateInput now; querying another page or "
            + "finishing cannot advance this step. You may add or replace "
            + "tactical cards, add units, change compositions and upgrades "
            + "using the official menu. Capacity directions are menu-only, "
            + "not legal verdicts; the complete Builder will judge your "
            + "proposal. Explain its scoring route, opening, map use and "
            + "opponent contingencies in public plan fields. Aim for the "
            + "exact mineralBudget, but do not invent Rules results or "
            + "private chain of thought."
          : "Choose one public decision. Query the official Builder "
          + "menu or frozen map when needed; propose a complete candidate, "
          + "inspect exact budget branches only after a Rules-legal current "
          + "candidate exists, and ask map_route only for that candidate's "
          + "hash. Before a candidate exists, use candidate_menu and/or "
          + "map_summary; do not mix budget_branches into that first query. "
          + "Revise your route as evidence "
          + "changes. This task requires exactly 2000 minerals spent; "
          + "the Builder's legal maximum-budget verdict alone is not enough. "
          + "If the current legal roster is under 2000, enlarge or redesign "
          + "the roster and inspect budget branches as advisory choices. "
          + "Do not repeat the unchanged candidate or choose finish while "
          + "mineralSpent is below mineralBudget. Finish only with an "
          + "exact-budget legal candidate, "
          + "current-candidate map evidence and a substantive scoring/opening/"
          + "opponent-response plan. Use empty placeholders for fields that "
          + "the chosen kind does not consume. Do not invent Rules outcomes "
          + "or private chain of thought.",
        responseContract: {
          schemaVersion: ITERATIVE_ROSTER_FLASH_MODEL_PORT_V1,
          finalAuthority: "Builder plus map route plus host final review",
          queryKinds: rebuildOnly ? [] : ["candidate_menu",
            "budget_branches", "map_summary", "map_route"],
        },
        contextHash,
        responseFormat: { kind: "provider_strict_json_schema",
          schemaName: activeContract.schemaName,
          schema: activeContract.providerSchema,
          outputContractRef:
            outputContractRefStarcraftTmgV1(activeContract) },
      }); } catch (error) {
        if (!await replyStore.loadRetainedReply(requestKey)) throw error;
      }
      return recovered(requestKey, state);
    },
  });
}
