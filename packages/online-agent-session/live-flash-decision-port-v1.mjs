import { hashStarcraftTmgContract } from
  "../authoritative-engine/transition-v1.mjs";
import { priceStarcraftTmgDeepSeekV4FlashUsageV1 } from
  "../secure-provider-runtime/provider-pricing-v1.mjs";
import { priceStarcraftTmgDeepSeekCurrentUsageV2 } from
  "../secure-provider-runtime/provider-pricing-v2.mjs";

export const STARCRAFT_TMG_LIVE_FLASH_DECISION_PORT_VERSION =
  "starcraft_tmg_live_flash_decision_port_v1";

const HASH = /^[a-f0-9]{64}$/u;
const MODEL = /^[A-Za-z0-9._:/-]{1,240}$/u;
const SENSITIVE_VALUE =
  /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}|\b(?:sk|jsk)-[A-Za-z0-9_-]{12,}|(?:api[_-]?key|authorization)\s*[:=]\s*[^\s,;}]{6,}/iu;
const QUERY_CHANNEL_NAMES = ["query_requests", "queryRequests", "queries"];
const FINAL_STATUSES = new Set(["completed", "closed"]);

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
    publicDecisionSummary,
    speech: raw.speech ? String(raw.speech).slice(0, 4_000) : null,
    providerTrace,
    rulesAuthority: false,
    confirmationAuthority: false,
    applyAuthority: false,
    trainingTruth: false,
  });
}

function responseParts(output) {
  const channels = object(output?.channels) ? output.channels : {};
  const decision = object(channels.decision) ? channels.decision
    : object(output?.decision) ? output.decision
      : object(output?.proposal) || output?.candidateId ? output : null;
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
  return { decision, queries };
}

function makeNode(nodeId, nodeType, authority, content) {
  const body = { nodeId, nodeType, authority, content: clone(content) };
  return freeze({ ...body, nodeHash: hashStarcraftTmgContract(body) });
}

function makePromptArtifact(match, input, choice, round, queryReceipts) {
  const contract = seal({
    schemaVersion:
      `${STARCRAFT_TMG_LIVE_FLASH_DECISION_PORT_VERSION}.response-contract`,
    allowedChannels: ["decision", "query_requests"],
    decisionCandidateSource: "current_spatial_action_space_only",
    decisionRequiredAfterQueries: true,
    hiddenChainOfThoughtForbidden: true,
    extraProviderFieldsIgnored: true,
    rulesAuthority: "external_rules_service",
    trainingTruth: false,
  }, "contractHash");
  const instructions = {
    task: "Choose one current action for the controlled seat.",
    output: {
      queryRound: "Return channels.query_requests.requests only when an exact spatial, probability, fire-zone, path, LOS, coherency or score query is needed.",
      decisionRound: "Return channels.decision with proposal, selectedReason, scoreOrPositionValue, risk, rejectedAlternatives, plan/assessment/intent and publicDecisionSummary.",
    },
    requirements: [
      "Select only a finite action or instantiate one current parameter domain.",
      "Use exact query receipts as facts, advisory estimates as preferences, and unknown as uncertainty.",
      "Continue or explicitly revise the same-match plan and account for prior intent/outcome memory.",
      "Predict a plausible opponent response and state a counter-response and replan trigger.",
      "Do not return hidden chain-of-thought; return only concise public reasons and evidence.",
      "The model cannot confirm, apply, mutate, or override Rules-owned truth.",
    ],
  };
  const nodes = [
    makeNode("live-decision-policy", "platform", "host", instructions),
    makeNode("strategy-skill-snapshot", "strategy-advisory", "frozen_match", {
      snapshot: match.strategySkillSnapshot,
      skillsMayOverrideRules: false,
    }),
    makeNode("player-room-projection", "player-view", "room_service",
      input.roomProjection),
    makeNode("current-legal-space", "rules", "rules_service", input.legalSpace),
    makeNode("current-spatial-observation", "rules-observation", "rules_service",
      input.spatialObservation || null),
    makeNode("current-spatial-action-space", "rules", "rules_service",
      input.spatialActionSpace),
    makeNode("same-match-memory", "same-match-advisory", "match_journal",
      input.matchMemory || null),
    makeNode("turn-plan-state", "same-match-advisory", "turn_plan_runtime",
      input.planState || null),
    makeNode("asynchronous-preexecution", "hypothetical-advisory",
      "preexecution_runtime", input.preexecutionSearch || null),
    makeNode("current-query-receipts", "typed-query-results", "rules_or_math",
      queryReceipts),
    makeNode("user-message", "user-message", "host", {
      text: `Decision ${choice.choiceKey}, provider round ${round}. `
        + (queryReceipts.length
          ? "Use the supplied query receipts and now return a final current decision."
          : "Request typed queries only if the current observation is insufficient; otherwise return the final decision."),
    }),
  ];
  const receipt = seal({
    schemaVersion:
      `${STARCRAFT_TMG_LIVE_FLASH_DECISION_PORT_VERSION}.prompt-receipt`,
    choiceKey: choice.choiceKey,
    round,
    stateHash: choice.authority.stateHash,
    legalSpaceHash: choice.authority.legalSpaceHash,
    actionSpaceHash: choice.authority.spatialActionSpaceHash,
    strategySkillSetHash: match.strategySkillSnapshot.skillSetHash,
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
  const promptArtifactStore = options.promptArtifactStore;
  const availabilityPort = options.profileAvailabilityPort;
  const strategySkillPort = options.strategySkillPort;
  const spatialQueryPort = options.spatialQueryPort;
  const store = options.store || createInMemoryStarcraftTmgLiveDecisionStoreV1();
  const profiles = (options.profileCandidates || []).map(profile);
  const now = typeof options.now === "function"
    ? options.now : () => new Date().toISOString();
  const maxToolRounds = integer(options.maxToolRounds || 3,
    "maxToolRounds", 1, 16);
  const maxQueriesPerRound = integer(options.maxQueriesPerRound || 16,
    "maxQueriesPerRound", 1, 128);
  if (typeof providerSupervisor?.sendTurn !== "function"
    || typeof providerSupervisor?.readState !== "function") {
    throw new TypeError("providerSupervisor readState/sendTurn are required");
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
  if (typeof store?.load !== "function" || typeof store?.commit !== "function") {
    throw new TypeError("LiveDecisionStore load/commit are required");
  }
  if (!profiles.length) throw new TypeError("profileCandidates are required");
  const inFlight = new Map();

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
      const existing = await store.load(scopeValue.scopeKey);
      if (existing) {
        if (existing.scope.matchBindingHash !== scopeValue.matchBindingHash
          || existing.selectedProfile.profileRef.hash
            !== receipt.selectedProfile.profileRef.hash
          || existing.strategySkillSnapshot.skillSetHash
            !== receipt.strategySkillSnapshot.skillSetHash) {
          return rejection("OPEN_MATCH_FROZEN_BINDING_MISMATCH", "High");
        }
        return freeze({ ok: true, resumed: true,
          projection: publicProjection(existing), trainingTruth: false });
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
      attemptKeys: [],
      processedAttemptKeys: [],
      queryReceipts: [],
      queryRounds: 0,
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

  async function providerCall(match, input, choice) {
    const round = choice.attemptKeys.length + 1;
    const prompt = makePromptArtifact(match, input, choice, round,
      choice.queryReceipts);
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
    const inputUnits = Math.max(1, Math.ceil(stored.bytes / 4));
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
        status: "provider_call_may_have_started",
        requestHash: boundedRequest.requestHash,
        promptArtifactHash: prompt.artifact.promptArtifactHash,
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
      const providerMayHaveBeenCalled = Boolean(result?.turn || result?.receipt);
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

  function providerTrace(match, choice, notificationThresholds = []) {
    const attempts = choice.attemptKeys.map((key) => choice.attempts[key]);
    const used = attempts.reduce((sum, entry) => ({
      inputUnits: sum.inputUnits + Number(entry.usage?.inputUnits || 0),
      outputUnits: sum.outputUnits + Number(entry.usage?.outputUnits || 0),
      totalUnits: sum.totalUnits + Number(entry.usage?.totalUnits || 0),
    }), { inputUnits: 0, outputUnits: 0, totalUnits: 0 });
    return freeze({
      agentVersion: STARCRAFT_TMG_LIVE_FLASH_DECISION_PORT_VERSION,
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
      queryReceiptCount: choice.queryReceipts.length,
      warnings: clone(choice.warnings),
      modelFrozenAtMatchOpen: true,
      fallbackAllowedAfterMatchOpen: false,
      hiddenChainOfThoughtStored: false,
      trainingTruth: false,
    });
  }

  async function generate(match, input, choice) {
    const crossed = [];
    while (true) {
      choice = match.decisions[choice.choiceKey];
      const lastKey = choice.attemptKeys.at(-1);
      let attempt = lastKey ? choice.attempts?.[lastKey] : null;
      if (attempt?.status === "provider_call_may_have_started") {
        return rejection("LIVE_DECISION_PROVIDER_COMMIT_UNKNOWN", "High", {
          choiceKey: choice.choiceKey,
          attemptKey: attempt.attemptKey,
          automaticRetryPerformed: false,
          projection: publicProjection(match),
        });
      }
      if (["provider_failed_requires_explicit_retry", "provider_output_invalid"]
        .includes(choice.status) && input.retryApproved !== true) {
        return rejection("LIVE_DECISION_EXPLICIT_RETRY_REQUIRED", "High", {
          choiceKey: choice.choiceKey,
          automaticRetryPerformed: false,
          projection: publicProjection(match),
        });
      }
      if (choice.status === "retry_ready"
        || input.retryApproved === true
          && ["provider_failed_requires_explicit_retry", "provider_output_invalid"]
            .includes(choice.status)) {
        match = await commit(match, (draft) => {
          draft.decisions[choice.choiceKey].status = "generating";
        });
        choice = match.decisions[choice.choiceKey];
        attempt = null;
      }
      const needsCall = !attempt || attempt.status !== "completed"
        || choice.processedAttemptKeys.includes(attempt.attemptKey);
      if (needsCall) {
        try {
          const result = await providerCall(match, input, choice);
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
      const parts = responseParts(attempt.safeOutput);
      if (parts.queries.length && choice.queryRounds < maxToolRounds) {
        const query = await runQueries(input, parts.queries);
        match = await commit(match, (draft) => {
          const current = draft.decisions[choice.choiceKey];
          current.processedAttemptKeys.push(attempt.attemptKey);
          current.queryRounds += 1;
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
      if (parts.queries.length && choice.queryRounds >= maxToolRounds) {
        choice.warnings.push("QUERY_ROUND_LIMIT_REACHED_DECISION_REQUIRED");
      }
      if (!parts.decision) {
        match = await commit(match, (draft) => {
          const current = draft.decisions[choice.choiceKey];
          current.status = "provider_output_invalid";
          current.processedAttemptKeys.push(attempt.attemptKey);
          current.warnings.push("FINAL_DECISION_MISSING");
        });
        return rejection("LIVE_DECISION_FINAL_OUTPUT_MISSING", "Medium", {
          choiceKey: choice.choiceKey,
          automaticRetryPerformed: false,
          projection: publicProjection(match),
        });
      }
      let decision;
      try {
        decision = normalizeDecision(parts.decision, input, match,
          choice.queryReceipts, providerTrace(match, choice, crossed));
      } catch (error) {
        match = await commit(match, (draft) => {
          const current = draft.decisions[choice.choiceKey];
          current.status = "provider_output_invalid";
          current.processedAttemptKeys.push(attempt.attemptKey);
          current.warnings.push(String(error?.code || "DECISION_OUTPUT_INVALID"));
        });
        return rejection(error?.code || "LIVE_DECISION_OUTPUT_INVALID",
          error?.severity || "Medium", {
            choiceKey: choice.choiceKey,
            automaticRetryPerformed: false,
            projection: publicProjection(match),
          });
      }
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
      let match = await store.load(scopeValue.scopeKey);
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
      let match = await store.load(scopeValue.scopeKey);
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
      const record = await store.load(scopeValue.scopeKey);
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
      let record = await store.load(scopeValue.scopeKey);
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
        "durable_stage_before_egress_no_automatic_retry_after_unknown",
      maxCallLifecycle: "reset_at_new_match_epoch_only",
      toolQueryKinds: spatialQueryPort.metadata?.directExactQueries
        ? [...spatialQueryPort.metadata.directExactQueries,
          ...(spatialQueryPort.metadata.delegatedQueries || [])] : "adapter_owned",
      publicReasoningPolicy:
        "public_summary_and_evidence_only_no_hidden_chain_of_thought",
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
