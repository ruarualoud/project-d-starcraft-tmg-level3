import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { STARCRAFT_TMG_SPATIAL_QUERY_CONTRACTS_V1 } from "../online-agent-session/spatial-query-contracts-v1.mjs";
import { projectRosterTeachPromptEvidenceV1, internRosterTeachPromptEvidenceV1 } from "./roster-teach-framework-v1.mjs";
import { isRestoredIterativeRosterTeachReadV1 } from './roster-teach-history-view-v1.mjs';
import { iterativeRosterPhaseAuthorityV1, describeIterativeRosterCapabilitiesV1, projectIterativeRosterDraftHandoffV1,
  inspectIterativeRosterQueryAdmissionV1, projectIterativeRosterCapabilityMonitorV1 } from
  './iterative-roster-capabilities-v1.mjs';
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
      "budget_branches", "map_summary", "map_route", "scene_context", "scene_query", "scenario_branch", "teach_evidence"] },
    factionRecordKey: string(), scaleId: string(),
    candidateHash: string(),
    startOffset: integer(), maximumEvaluations: integer(),
    maximumMutationDepth: integer(),
    queryKind: string(0, 200, "Canonical kind from sceneQueryContracts; only for scene_query."),
    argumentsJson: string(0, 65_536, "Canonical query arguments JSON; for scenario_branch an explicit hypothetical_geometry spec, never live mutation."),
    branchStateHash: string(0, 200, "Previously returned hypothetical branch identity; empty for selected roster's source scene."),
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

const feedbackSchema = { ...schema, properties: { ...schema.properties,
  kind: { ...schema.properties.kind,
    enum: ["query", "propose", "finish", "accept_teach"] },
  question: prose("For accept_teach: public reasons for accepting the taught candidate and plan, including risk tradeoffs; for query: public question."),
} };
const feedbackContract = createStarcraftTmgOutputContractV1({
  id: "ticket27.iterative_roster_teach_feedback.v1",
  version: "1.0.0", schemaName: "iterative_roster_teach_feedback_v1",
  providerSchema: feedbackSchema,
  modelOwnedFields: Object.keys(feedbackSchema.properties), hostOwnedFields: [],
  mapperRef: componentRef("teach_feedback_mapper"),
  semanticValidatorRef: componentRef("teach_snapshot_validation"),
  description: "Model-owned response to a snapshot Teach; may query, revise or accept, without a tactical veto.",
});

// Versioned separately: old paid decisions keep their original closed union.
const draftSchema = { ...schema, properties: { ...schema.properties,
  kind: { ...schema.properties.kind, enum: ['query', 'propose', 'revise_plan', 'finish'] },
} };
const draftFeedbackSchema = { ...draftSchema, properties: { ...draftSchema.properties,
  kind: { ...draftSchema.properties.kind, enum: [...draftSchema.properties.kind.enum, 'accept_teach'] },
} };
const draftContract = body => createStarcraftTmgOutputContractV1({
  id: 'ticket27.iterative_roster_draft_coevolution.v1', version: '1.0.0',
  schemaName: 'iterative_roster_draft_coevolution_v1', providerSchema: body,
  modelOwnedFields: Object.keys(body.properties), hostOwnedFields: [],
  mapperRef: componentRef('draft_plan_mapper'), semanticValidatorRef: componentRef('draft_plan_validation'),
  description: 'Edit a provisional Plan independently or co-revise army through the existing Builder; final publication remains separate.' });
const draftDecisionContract = draftContract(draftSchema);
const draftTeachFeedbackContract = draftContract(draftFeedbackSchema);
const draftHandoffSchema = { ...draftSchema, properties: { ...draftSchema.properties,
  kind: { ...draftSchema.properties.kind, enum: ['query', 'propose', 'finish'] } } };
const draftHandoffContract = createStarcraftTmgOutputContractV1({
  id: 'ticket27.iterative_roster_draft_handoff.v1', version: '1.0.0',
  schemaName: 'iterative_roster_draft_handoff_v1', providerSchema: draftHandoffSchema,
  modelOwnedFields: Object.keys(draftHandoffSchema.properties), hostOwnedFields: [],
  mapperRef: componentRef('draft_plan_mapper'), semanticValidatorRef: componentRef('draft_plan_validation'),
  description: 'After a Plan revision, query new evidence, change the army or submit to final review; no acceptance bypass.' });

// A Plan revision is a typed write, not a full-document copying exercise.
// Host-owned map/arrival proof fields are deliberately not editable here.
const planTextFields = ['victoryRoute', 'scoreRoute', 'rosterRationale', 'mapRationale'];
const planListFields = ['openingSequence', 'opponentHypotheses', 'counterPlans'];
const planEditsSchema = list(closed({
  field: { ...string(), enum: [...planTextFields, ...planListFields] },
  textValue: prose('Replacement text for a text field; empty for a list field.'),
  itemsValue: list(prose('Complete replacement list for a list field; empty for a text field.')),
}, 'One explicit replacement; omit unchanged fields. No evidence identity or legality writes.'), 7);
const typedEditSchema = body => ({ ...body,
  properties: { ...body.properties,
    question: prose('For revise_plan: public reasons for these exact field edits. For query/accept_teach: their public question/reasons.'),
    planEdits: planEditsSchema,
    plan: { ...body.properties.plan,
      description: 'Full Plan for propose. For revise_plan use empty placeholders: only planEdits writes. For finish, an entirely empty Plan submits the current saved Plan; a nonempty Plan must be complete, not a partial patch.' } },
  required: [...body.required, 'planEdits'] });
const typedDraftSchema = typedEditSchema(draftSchema);
const typedFeedbackSchema = typedEditSchema(draftFeedbackSchema);
const typedHandoffSchema = typedEditSchema(draftHandoffSchema);
const typedEditContract = (body, role) => createStarcraftTmgOutputContractV1({
  id: `ticket27.iterative_roster_typed_plan_edits.${role}.v1`, version: '1.0.0',
  schemaName: `iterative_roster_typed_plan_edits_${role}_v1`, providerSchema: body,
  modelOwnedFields: Object.keys(body.properties), hostOwnedFields: [],
  mapperRef: componentRef('typed_plan_edits_mapper'), semanticValidatorRef: componentRef('typed_plan_edits_validation'),
  description: 'Apply exact named Plan edits to the current request snapshot; unchanged strategy and original proofs are preserved. Normal final review remains required.' });
const typedDraftContract = typedEditContract(typedDraftSchema, 'draft');
const typedFeedbackContract = typedEditContract(typedFeedbackSchema, 'feedback');
const typedHandoffContract = typedEditContract(typedHandoffSchema, 'handoff');

function typedPlanRevision(output, state, activeSchema) {
  const fields = ['schemaVersion', 'kind', 'question', 'planEdits', 'assumptionDisposition'];
  const selected = closed(Object.fromEntries(fields.map(key => [key, activeSchema.properties[key]])));
  const verdict = validateStarcraftTmgProviderJsonSchemaValueV1(selected, projectKnownFields(output, selected));
  const issues = [...verdict.issues];
  if (!state.plan || state.plan.candidateHash !== state.currentCandidate?.candidateHash)
    issues.push({ path: '$.planEdits', message: 'A current same-army Plan is required. Use propose for the initial or changed army and Plan.' });
  if (!output.question?.trim()) issues.push({ path: '$.question', message: 'Explain the public reason for the actual edits.' });
  if (!output.planEdits?.length) issues.push({ path: '$.planEdits', message: 'Name the actual fields to replace. A description claiming changes is not a write; use query or finish when no field change is needed.' });
  const seen = new Set();
  for (const [index, edit] of (Array.isArray(output.planEdits) ? output.planEdits : []).entries()) {
    if (!edit || typeof edit !== 'object') continue;
    if (seen.has(edit.field)) issues.push({ path: `$.planEdits[${index}].field`, message: 'Duplicate field replacement; supply one final value.' });
    seen.add(edit.field);
    if (planTextFields.includes(edit.field) && (edit.itemsValue?.length || !edit.textValue?.trim())
      || planListFields.includes(edit.field) && edit.textValue !== '')
      issues.push({ path: `$.planEdits[${index}]`, message: 'Text fields use textValue plus empty itemsValue; list fields use itemsValue plus empty textValue.' });
  }
  if (issues.length) throw Object.assign(new Error('ITERATIVE_ROSTER_TYPED_PLAN_EDIT_INVALID'), {
    outputDiagnostics: { selectedKind: output.kind, validationIssues: issues, strategyFieldsInvented: false,
      instruction: 'Correct only the named edit operation. Do not put claimed edits only in question/revisionReason or resubmit the unchanged full Plan. Query and finish remain available under their normal requirements.' } });
  const plan = { victoryRoute: state.plan.victoryRoute,
    mapEvidenceHash: state.plan.mapEvidenceHash, arrivalScheduleStatus: state.plan.arrivalScheduleStatus,
    strategy: structuredClone(state.plan.strategy || {}) };
  for (const edit of output.planEdits) {
    const value = planListFields.includes(edit.field) ? structuredClone(edit.itemsValue) : edit.textValue;
    if (edit.field === 'victoryRoute') plan.victoryRoute = value;
    else plan.strategy[edit.field] = value;
  }
  plan.strategy.revisionReason = output.question;
  return { kind: 'revise_plan', plan, assumptionDisposition: output.assumptionDisposition,
    planEdits: structuredClone(output.planEdits) };
}

const pendingTeach = state => Number(state?.modelContextVersion || 0) >= 6
  && state.teachFeedback?.disposition === "pending";

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

function hasScopedMapRouteInput(query) {
  return Boolean(query?.queryKind?.trim() || query?.branchStateHash?.trim()
    || typeof query?.argumentsJson === 'string'
      && query.argumentsJson.trim() && query.argumentsJson.trim() !== '{}');
}

function validateQueryDecision(output, activeSchema) {
  // The wire schema includes placeholders for all union arms. They are not
  // inputs to a query and must not hide its actual semantic error. Validate
  // only the explicitly selected arm, without filling any omitted values.
  const properties = activeSchema.properties;
  const queryProperties = properties.queries.items.properties;
  const queryFields = {
    candidate_menu: ['kind', 'factionRecordKey', 'scaleId'],
    budget_branches: ['kind', 'candidateHash', 'startOffset', 'maximumEvaluations', 'maximumMutationDepth'],
    map_summary: ['kind'], map_route: ['kind', 'candidateHash'],
    scene_context: ['kind', 'candidateHash', 'branchStateHash'],
    scene_query: ['kind', 'candidateHash', 'queryKind', 'argumentsJson', 'branchStateHash'],
    scenario_branch: ['kind', 'candidateHash', 'argumentsJson', 'branchStateHash'],
    teach_evidence: ['kind', 'argumentsJson'],
  };
  const rootSchema = closed({ schemaVersion: properties.schemaVersion,
    kind: properties.kind, question: properties.question,
    queries: list(closed({ kind: queryProperties.kind }), 8) });
  const verdict = validateStarcraftTmgProviderJsonSchemaValueV1(rootSchema,
    projectKnownFields(output, rootSchema));
  const issues = [...verdict.issues];
  if (Array.isArray(output.queries)) for (const [index, query] of output.queries.entries()) {
    const fields = query?.kind === 'map_route' && hasScopedMapRouteInput(query)
      ? ['kind', 'candidateHash', 'argumentsJson', 'branchStateHash']
      : queryFields[query?.kind];
    if (!fields) continue; // The root item enum already reports this error.
    const selected = closed(Object.fromEntries(fields.map(key => [key, queryProperties[key]])));
    const result = validateStarcraftTmgProviderJsonSchemaValueV1(selected, projectKnownFields(query, selected));
    issues.push(...result.issues.map(issue => ({ ...issue,
      path: issue.path.replace(/^\$/, `$.queries[${index}]`) })));
    if (query.kind === 'map_route' && query.queryKind?.trim()
      && query.queryKind !== 'map.route_access') issues.push({
      path: `$.queries[${index}].queryKind`,
      message: 'map_route is either the whole-army audit without selectors, or map.route_access with exact native arguments. Use scene_query for a different explicit queryKind.',
    });
  }
  return { ok: issues.length === 0, issues };
}

function decisionFromOutput(raw, state) {
  const activeSchema = Number(state?.modelContextVersion || 0) >= 20
    ? pendingTeach(state) ? typedFeedbackSchema : typedDraftSchema
    : Number(state?.modelContextVersion || 0) >= 12
    ? pendingTeach(state) ? draftFeedbackSchema : draftSchema
    : pendingTeach(state) ? feedbackSchema : schema;
  // Recovery has already matched the retained reply to this exact request and
  // context. The schema name is an echoed transport label, not a model decision.
  // Bind it from that request; still validate the operation and every value.
  const normalized = normalizeDisposition(raw);
  const output = projectKnownFields(Number(state?.modelContextVersion || 0) >= 20
    && normalized && typeof normalized === 'object' && !Array.isArray(normalized)
    ? { ...normalized, schemaVersion: ITERATIVE_ROSTER_FLASH_MODEL_PORT_V1 } : normalized, activeSchema);
  if (Number(state?.modelContextVersion || 0) >= 20 && output?.kind === 'revise_plan')
    return typedPlanRevision(output, state, activeSchema);
  const verdict = output?.kind === 'query' ? validateQueryDecision(output, activeSchema)
    : validateStarcraftTmgProviderJsonSchemaValueV1(activeSchema, output);
  if (!verdict.ok || output.schemaVersion
    !== ITERATIVE_ROSTER_FLASH_MODEL_PORT_V1) {
    throw Object.assign(new Error('ITERATIVE_ROSTER_FLASH_OUTPUT_INVALID'), {
      code: 'ITERATIVE_ROSTER_FLASH_OUTPUT_INVALID', outputDiagnostics: {
        selectedKind: output?.kind || null, validationIssues: verdict.issues,
        strategyFieldsInvented: false,
        instruction: 'Correct the listed fields of the selected operation. Do not invent Plan, army, query parameters or a different strategy to satisfy unrelated placeholder fields.' } });
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
        if (query.kind === "map_route") return hasScopedMapRouteInput(query)
          ? { kind: 'scene_query', candidateHash: query.candidateHash,
            queryKind: 'map.route_access', argumentsJson: query.argumentsJson,
            branchStateHash: query.branchStateHash }
          : { kind: query.kind, candidateHash: query.candidateHash };
        if (["scene_context", "scene_query", "scenario_branch", "teach_evidence"].includes(query.kind)) return {
          kind: query.kind, candidateHash: query.candidateHash, queryKind: query.queryKind,
          argumentsJson: query.argumentsJson, branchStateHash: query.branchStateHash };
        return { kind: "map_summary" };
      }) };
  }
  if (output.kind === "accept_teach") return {
    kind: "accept_teach", publicReason: output.question.trim() };
  if (Number(state?.modelContextVersion || 0) >= 20 && output.kind === 'finish') {
    const emptyPlan = !output.plan.victoryRoute.trim() && !output.plan.mapEvidenceHash.trim()
      && Object.values(output.plan.strategy).every(value => Array.isArray(value)
        ? value.length === 0 : typeof value === 'string' && !value.trim());
    if (emptyPlan && state.plan && state.plan.candidateHash === state.currentCandidate?.candidateHash
      && output.planEdits.length === 0) return { kind: 'finish',
        plan: { victoryRoute: state.plan.victoryRoute, mapEvidenceHash: state.plan.mapEvidenceHash,
          arrivalScheduleStatus: state.plan.arrivalScheduleStatus, strategy: structuredClone(state.plan.strategy) },
        assumptionDisposition: output.assumptionDisposition,
        planSubmission: { kind: 'submit_current_saved_plan', sourceRevision: state.revision,
          sourcePlanHash: state.plan.planHash ?? null, sourceCandidateHash: state.currentCandidate.candidateHash,
          finalAcceptance: false } };
  }
  const plan = { ...output.plan,
    mapEvidenceHash: output.plan.mapEvidenceHash || null };
  if (output.kind === "propose") return { kind: "propose",
    candidateInput: output.candidateInput,
    plan, assumptionDisposition: output.assumptionDisposition };
  if (output.kind === 'revise_plan') return { kind: 'revise_plan', plan,
    assumptionDisposition: output.assumptionDisposition };
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
    ...(receipt.searchScope ? { searchScope: receipt.searchScope } : {}),
    ...(receipt.capabilityOutcome ? { capabilityOutcome: receipt.capabilityOutcome,
      sourceReceiptHash: receipt.sourceReceiptHash } : {}),
    strategyRankingPerformed: false,
  } };
}

function requiredDecisionReason(state) {
  // A Builder-legal candidate is a deliberation boundary, not a command to
  // spend immediately. New sessions may query its map/tactical implications
  // before revising it; the session still rejects finishing below budget.
  // Retain the paid response contract of existing v4 and earlier sessions.
  if (Number(state.modelContextVersion || 0) >= 5 && state.currentCandidate) {
    return null;
  }
  const latest = state.iterations.at(-1);
  if ([3, 4, 5].includes(state.modelContextVersion)
    && (!state.currentCandidate
      || state.currentCandidate.mineralSpent < state.mineralBudget)
    && state.observations.some((entry) =>
      entry.query?.kind === "builder_verdict"
        && entry.receipt?.status === "illegal")) {
    return "latest_builder_rejected_candidate_requires_revision";
  }
  if (!state.currentCandidate
    || state.currentCandidate.mineralSpent >= state.mineralBudget) {
    return null;
  }
  if (state.modelContextVersion === 2
    && latest?.decisionKind === "propose"
    && latest.rulesVerdictStatus === "illegal"
    && state.observations.some((entry) =>
      entry.requestKey === latest.requestKey
        && entry.query?.kind === "builder_verdict")) {
    return "latest_builder_rejected_candidate_requires_revision";
  }
  if (Number(state.modelContextVersion || 0) >= 2
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
  if (Number(state.modelContextVersion || 0) >= 2
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

function queryEvidenceIdentity(state, iteration) {
  const observations = state.observations.filter(row => row.requestKey === iteration.requestKey);
  const results = [];
  for (let index = 0; index < iteration.publicDecision.queries.length; index += 1) {
    const query = iteration.publicDecision.queries[index];
    const receiptHash = iteration.toolReceiptHashes[index];
    const observation = observations.find(row => row.receipt?.receiptHash === receiptHash
      && hashStarcraftTmgContract(row.query) === hashStarcraftTmgContract(query));
    if (!observation) return null;
    const receipt = observation.receipt;
    // Compare knowledge, not delivery identity. Only this known read-only
    // spatial wrapper reissues these three fields for an unchanged query.
    // Preserve every source/base/branch/seat/runtime binding and the full inner
    // result. This projection never replaces or re-signs the original receipt.
    if (receipt.schema === 'starcraft_tmg_pregame_lab_spatial_receipt_v1'
      && receipt.mutatesSourceState === false && receipt.queryReceipt) {
      const { queryId, sourceReceiptHash, receiptHash: deliveryHash, ...evidence } = receipt;
      results.push(evidence);
    } else results.push(receipt);
  }
  return hashStarcraftTmgContract(results);
}

// Current conclusions and the current Plan stay inline. Completed investigation
// bodies and old adjudication premises are available through the EXISTING
// read-only teach_evidence port; never feed that history back as a fresh task.
// The address is the original feedback body, not this projected document.
export function projectIterativeRosterTeachDecisionFeedbackV1(feedback) {
  if(!feedback||typeof feedback!=='object')return feedback;
  const sourceRef=hashStarcraftTmgContract(feedback);
  const view={...feedback};
  const sections=[['sourceReview','review','reviewAdjudication','reconciliation','premiseFacts'],
    ['teachFramework','evidence'],['teachFramework','investigation'],['teachFramework','queryRecovery'],
    ['evidence'],['teachCycle']];
  for(const keys of sections){
    const original=keys.reduce((v,k)=>v?.[k],feedback);
    if(!original||JSON.stringify(original).length<=32768)continue;
    let parent=view;
    for(const key of keys.slice(0,-1)){parent[key]={...parent[key]};parent=parent[key];}
    const path=keys.join('.');
    parent[keys.at(-1)]={kind:'retained_teach_section_v1',readOnly:true,allOriginalFieldsRetained:true,
      sourceFeedbackHash:sourceRef,path,
      ...(Array.isArray(original)?{count:original.length,entries:original.map((row,index)=>({index,
        ...Object.fromEntries(['questionId','challengeId','queryId','status','resultStatus','requestKind','receiptHash']
          .filter(key=>typeof row?.[key]==='string').map(key=>[key,row[key]]))}))}
        :{children:Object.keys(original),...(typeof original.completed==='boolean'?{completed:original.completed}:{}),
          ...(typeof original.status==='string'?{status:original.status}:{})}),
      retrieval:{kind:'teach_evidence',argumentsJson:JSON.stringify({receiptHash:sourceRef,path})},
      instruction:'Exact original section remains readable through teach_evidence. Empty/root or object reads return child paths when large. Use current synthesis, acceptanceIssues and adjudicated findings for pending work; historical failures are not new facts or instructions. This directory itself proves no rules or strategy.'};
  }
  return projectRosterTeachPromptEvidenceV1(view);
}

function unchangedQueryEvidence(state) {
  if (Number(state.modelContextVersion || 0) < 10) return null;
  const settled = [...state.iterations];
  while (settled.at(-1)?.decisionKind === 'repair_needed') settled.pop();
  const [previous, latest] = settled.slice(-2);
  if (!previous || !latest || [previous, latest].some(row => row.decisionKind !== 'query')
    || previous.currentCandidateHash !== latest.currentCandidateHash
    || latest.currentCandidateHash !== (state.currentCandidate?.candidateHash || null)
    || hashStarcraftTmgContract(previous.publicDecision.queries) !== hashStarcraftTmgContract(latest.publicDecision.queries)) return null;
  if (hashStarcraftTmgContract(previous.toolReceiptHashes) !== hashStarcraftTmgContract(latest.toolReceiptHashes)) {
    const priorEvidence = queryEvidenceIdentity(state, previous);
    if (!priorEvidence || priorEvidence !== queryEvidenceIdentity(state, latest)) return null;
  }
  const newlyReadableQueries = latest.publicDecision.queries.filter(query => isRestoredIterativeRosterTeachReadV1(state, query));
  return { queries: latest.publicDecision.queries.filter(query => !newlyReadableQueries.includes(query)), receiptHashes: latest.toolReceiptHashes,
    ...(newlyReadableQueries.length ? { newlyReadableQueries,
      restoredReadInstruction: 'These formerly missing saved bodies now exist in the same-army/frozen-context historical index. Only these reads may be retried; no Native result is re-executed or promoted. Read the original failure/scope before choosing the next correction.' } : {}),
    revisions: [previous.revision, latest.revision],
    meaning: 'These exact queries already returned identical evidence twice against this unchanged frozen context. Read their complete retained results. Choose different tool arguments, another query, or a changed roster/plan; repeating them cannot supply new information. No strategy or army choice is imposed.',
    strategyChosenByHost: false };
}

// The agent must receive a query→result turn, not only a large accumulated
// dictionary plus a repeated-query rejection. Promote the actual latest results
// BEFORE lossless interning so this turn owns their bodies and history refers
// back to them. No tactical ranking, source change or new Rules execution.
function withCurrentOperationFeedback(state, context) {
  if (Number(state.modelContextVersion || 0) < 18) return context;
  const latest = state.iterations.at(-1);
  if (latest?.decisionKind !== 'repair_needed') return context;
  const settled = new Set(latest.toolReceiptHashes || []);
  const original = state.observations.findLast(row => row.requestKey === latest.requestKey
    && row.query?.kind === 'model_output_repair'
    && settled.has(row.receipt?.receiptHash));
  const code = original?.receipt?.failureCode;
  const failureClass = !original ? 'missing_recovery_receipt'
    : original.receipt.status === 'known_provider_context_rejection' ? 'provider_input_rejection'
    : code === 'ITERATIVE_ROSTER_PLAN_REVISION_UNCHANGED' ? 'no_change'
    : code === 'ITERATIVE_ROSTER_UNCHANGED_QUERY_LOOP' ? 'already_returned_evidence'
    : 'output_validation';
  // One current failure is the task; earlier queries remain usable evidence,
  // not another simultaneous correction. No historical failure is promoted.
  return { latestOperation: { schema: 'roster_current_operation_feedback_v1',
    kind: original ? 'output_repair' : 'recovery_evidence_unavailable',
    revision: latest.revision, requestKey: latest.requestKey,
    candidateHash: state.currentCandidate?.candidateHash || null,
    failureClass, failure: original ? structuredClone(original.receipt) : null,
    strategyChosenByHost: false,
    instruction: original
      ? 'This is the latest settled operation failure. Address this exact failure and its inputAdjustments using the existing operation contracts. Prior completed tool results are evidence, not pending requests or additional failures to fix. Do not repeat the rejected unchanged write or invent a receipt. You still choose the next relevant query or substantive Plan/army revision; this feedback cannot accept strategy or alter Rules.'
      : 'The journal has no exact settled repair receipt for this request. Do not infer its cause from older errors or treat it as a successful operation.' },
    ...context,
    ...(context.latestToolTurn ? { latestToolTurn: { ...context.latestToolTurn,
      role: 'prior_completed_query_evidence' } } : {}) };
}

export function projectIterativeRosterLatestToolTurnV1(state, context) {
  if (Number(state.modelContextVersion || 0) < 17) return context;
  // Plan prose does not invalidate frozen-scene facts. Keep the last completed
  // query/result handoff visible across revisions; changing the army below
  // still prevents promoting an old army's result into the new working set.
  const latest = state.iterations.findLast(row => row.decisionKind === 'query');
  if (latest?.decisionKind !== 'query'
    || latest.currentCandidateHash !== (state.currentCandidate?.candidateHash || null)) {
    return withCurrentOperationFeedback(state, context);
  }
  const observations = state.observations.filter(row => row.requestKey === latest.requestKey);
  const settledReceipts = new Set(latest.toolReceiptHashes);
  const consumed = new Set();
  const results = latest.publicDecision.queries.map(query => {
    const queryHash = hashStarcraftTmgContract(query);
    // Ignored subqueries also produce journal receipts. Their array positions
    // are not positions in the admitted query list. Match the actual owning
    // request + exact query + settled receipt, consuming duplicate occurrences
    // in recorded order; never borrow another query's result.
    const original = observations.find(row => !consumed.has(row)
      && settledReceipts.has(row.receipt?.receiptHash)
      && hashStarcraftTmgContract(row.query) === queryHash);
    if (original) consumed.add(original);
    const receiptHash = original?.receipt?.receiptHash || null;
    return { query: structuredClone(query), receiptHash,
      deliveryStatus: original ? 'already_returned' : 'saved_result_unavailable',
      ...(original ? { receipt: structuredClone(compactObservation(original).receipt) }
        : { instruction: 'The exact request/query/receipt binding was not found. This is not an empty result or proof of impossibility.' }) };
  });
  return withCurrentOperationFeedback(state, { latestToolTurn: { version: 'explicit_latest_query_result_v1',
    role: state.iterations.at(-1)?.decisionKind === 'query'
      ? 'latest_completed_query_evidence' : 'prior_completed_query_evidence',
    revision: latest.revision, requestKey: latest.requestKey,
    candidateHash: latest.currentCandidateHash,
    question: latest.publicDecision.question, questionAuthority: 'model_hypothesis_not_tool_fact',
    results, strategyChosenByHost: false,
    instruction: 'These read-only calls have ALREADY returned the results below. Read this turn before deciding what is still missing. Preserve each result\'s actual source/branch, scope and unknowns: answering one predicate does not answer another. Do not request an identical call merely to obtain these same saved results. If your original question needs a different predicate, use the actual query contracts and arguments for that predicate; otherwise update or retain your Plan with public reasons. You choose the strategy; neither this turn nor a query result selects a roster or victory route.' }, ...context });
}

function decisionContext(state, skillGuidance, missionEvidence, queryCapabilities) {
  // Operational pause/recovery flags must not change a paid reply's context.
  // Candidate, map evidence and prior decisions must change it.
  const decisionState = {
    sessionId: state.sessionId, revision: state.revision,
    mineralBudget: state.mineralBudget,
    frozenContext: state.frozenContext,
    currentCandidate: state.currentCandidate,
    plan: state.plan,
    observations: Number(state.modelContextVersion || 0) >= 2
      ? state.observations.map(compactObservation)
      : state.observations,
    iterations: state.iterations,
  };
  if (Number(state.modelContextVersion || 0) >= 2) {
    decisionState.modelContextVersion = state.modelContextVersion;
  }
  if (Number(state.modelContextVersion || 0) >= 9) {
    // Prompt projection only: retain the ordered query/request history and
    // every distinct complete receipt, but transmit identical bodies once.
    // Index by full content, not a possibly reused external receipt ID.
    const observationReceipts = {};
    decisionState.observations = decisionState.observations.map(({ receipt, ...entry }) => {
      const receiptRef = hashStarcraftTmgContract(receipt);
      observationReceipts[receiptRef] = receipt;
      return { ...entry, receiptRef };
    });
    decisionState.observationReceipts = observationReceipts;
    decisionState.observationEncoding = 'Each observations entry references its complete result in observationReceipts[receiptRef]. Repeated references mean the query returned the same evidence, not missing evidence. All queries, results and decision history remain available.';
  }
  if (Number(state.modelContextVersion || 0) >= 6) {
    decisionState.teachFeedback = Number(state.modelContextVersion || 0) >= 8
      ? projectIterativeRosterTeachDecisionFeedbackV1(state.teachFeedback || null) : state.teachFeedback || null;
    if (Number(state.modelContextVersion || 0) >= 8) decisionState.teachEvidenceRetrieval = {
      kind: "teach_evidence", argumentsJson: "{\"receiptHash\":\"a delivered receiptHash or evidenceObjectHash\",\"path\":\"an exact field path (empty means root)\"}",
      allOriginalEvidenceRetained: true, projectedRetrievalKindAlias: "retained_evidence",
      invalidSceneResultsAreNotProof: true,
    };
    decisionState.teachFeedbackHistory = (state.teachFeedbackHistory || [])
      .map(entry => ({ teachSessionId: entry.teachSessionId,
        candidateHash: entry.candidateHash, disposition: entry.disposition,
        publicReason: entry.publicReason || null,
        taughtPlanHash: entry.taughtPlan.planHash }));
  }
  if (Number(state.modelContextVersion || 0) >= 7) {
    decisionState.selectionJustificationPolicyVersion = state.selectionJustificationPolicyVersion;
    decisionState.phaseScope = "Teach freezes one snapshot only; query, reopen "
      + "the complete army AND first-arrival schedule, or accept with a grounded "
      + "role/ability/alternative comparison. Rules legality does not require "
      + "retaining an already-legal army or already-legal schedule.";
  }
  if (Number(state.modelContextVersion || 0) >= 11) {
    decisionState.phaseAuthority = iterativeRosterPhaseAuthorityV1();
    decisionState.phaseScope = 'This is the selecting step: develop the army and Plan together. '
      + 'A legal partial army is a working hypothesis, not a locked selection. '
      + 'Review feedback may change both; only final publication requires the exact budget and completed evidence.';
    decisionState.queryCapabilities = queryCapabilities(state);
    // Execution diagnostics of the still-pending request must not alter that
    // paid request's recovery context. Expose them on the next settled step.
    decisionState.capabilityMonitor = projectIterativeRosterCapabilityMonitorV1([
      ...state.observations, ...(state.toolExecutionFailures || [])
        .filter(row => row.requestKey !== state.pendingDecision?.requestKey) ]);
  }
  if (Number(state.modelContextVersion || 0) >= 12) {
    if (state.planAlignment) decisionState.planAlignment = state.planAlignment;
    decisionState.draftTeachFeedback = projectRosterTeachPromptEvidenceV1(state.draftTeachFeedback || null);
    const handoff = projectIterativeRosterDraftHandoffV1(state);
    if (handoff) decisionState.draftHandoff = handoff;
    if (state.draftTeachReuse) decisionState.draftTeachReuse = structuredClone(state.draftTeachReuse);
    decisionState.draftTeachHistory = (state.draftTeachSnapshots || []).map(row => ({
      snapshotId: row.snapshotId, candidateHash: row.candidateHash, sourcePlanHash: row.sourcePlanHash,
      status: row.status, createdAtRevision: row.createdAtRevision }));
    decisionState.planEditing = { command: handoff ? 'finish' : 'revise_plan', writes: ['plan'],
      armyUnchanged: true, exactBudgetRequired: Boolean(handoff), finalAcceptance: false,
      instruction: handoff ? handoff.instruction : 'Use revise_plan when evidence changes your working hypothesis without requiring a purchase change; use propose to co-revise army and Plan. When the army changes, explain its actual current units, roles, alternatives and timing in rosterRationale/revisionReason, even if the strategic route is retained. Editing only victoryRoute does not update the army rationale. Draft Teach is advisory evidence, not publication approval.' };
    if (Number(state.modelContextVersion || 0) >= 20) decisionState.planEditing.typedEdits = {
      command: 'revise_plan', fieldNames: [...planTextFields, ...planListFields],
      instruction: 'For revise_plan, put each actual replacement in planEdits and public reasons in question. The Host applies these edits to this exact current Plan; unmentioned fields stay unchanged. Full plan is inactive/empty for this command. A reason saying a field changed cannot change it. Use propose for army+Plan changes, query for facts, and finish for the final full-Plan handoff. None of these skips final review.' };
  }
  if (Number(state.modelContextVersion || 0) >= 13) {
    decisionState.progress = state.progress || null;
    decisionState.sourceRepairRequired = state.teachFeedback?.acceptanceBlocked === true;
  }
  return { decisionState, skillGuidance, missionEvidence,
    ...(unchangedQueryEvidence(state) ? { unchangedQueryEvidence: unchangedQueryEvidence(state) } : {}),
    ...(requiredDecisionReason(state)
      ? { requiredDecisionKind: "propose",
        localSearchSaturation: {
          currentMineralSpent: state.currentCandidate?.mineralSpent ?? null,
          requiredMineralSpent: state.mineralBudget,
          mineralShortfall: state.currentCandidate
            ? state.mineralBudget - state.currentCandidate.mineralSpent : null,
          reason: requiredDecisionReason(state),
        } } : {}),
    exactMineralBudget: state.mineralBudget,
    rulesAuthority: "official_army_builder_only",
    mapAuthority: "frozen_read_only_room_evidence_only" };
}

function menuSlotProjection(candidateInput, observations,
  includeSlotRelief = false) {
  const menu = observations.find((entry) =>
    entry.query?.kind === "candidate_menu")?.receipt;
  if (!menu?.faction?.startingArmySlots) return null;
  const available = { ...menu.faction.startingArmySlots };
  const used = {};
  const cards = new Map((menu.tacticalCandidates || []).map((entry) =>
    [entry.recordKey, entry]));
  const units = new Map((menu.unitCandidates || []).map((entry) =>
    [entry.recordKey, entry]));
  const selectedUnits = [];
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
    selectedUnits.push({ selected, unit, option });
  }
  const overflow = Object.fromEntries(Object.entries(used)
    .filter(([kind, count]) => count > (available[kind] || 0))
    .map(([kind, count]) => [kind, count - (available[kind] || 0)]));
  const base = { source: "official_builder_menu_arithmetic_not_a_rules_verdict",
    available, used,
    overflow };
  if (!includeSlotRelief) return base;
  return { ...base,
    slotReliefOptions: selectedUnits.flatMap(({ selected, unit, option }) =>
      overflow[unit.armySlotType]
        ? unit.compositionOptions.filter((alternative) =>
          Number.isSafeInteger(alternative.occupiedArmySlots)
            && alternative.occupiedArmySlots < option.occupiedArmySlots)
          .map((alternative) => ({
            unitInstanceId: selected.unitInstanceId,
            recordKey: selected.recordKey,
            slotType: unit.armySlotType,
            fromCompositionKind: selected.compositionKind,
            toCompositionKind: alternative.compositionKind,
            releasedSlots: option.occupiedArmySlots
              - alternative.occupiedArmySlots,
            rulesLegalityClaimed: false,
          })) : []),
  };
}

function menuResourceProjection(candidateInput, observations) {
  const menu = observations.findLast(entry =>
    entry.query?.kind === "candidate_menu")?.receipt;
  const ratio = menu?.scale?.vespeneRatio;
  if (!menu || !Number.isSafeInteger(candidateInput.mineralBudget)
    || !Number.isSafeInteger(ratio?.numerator) || ratio.numerator < 0
    || !Number.isSafeInteger(ratio?.denominator) || ratio.denominator <= 0) {
    return null;
  }
  const cards = new Map((menu.tacticalCandidates || []).map(card =>
    [card.recordKey, card]));
  const selectedCards = [];
  for (const recordKey of candidateInput.tacticalCardRecordKeys || []) {
    const card = cards.get(recordKey);
    if (!Number.isSafeInteger(card?.vespeneGasCost)
      || card.vespeneGasCost < 0) return null;
    selectedCards.push({ recordKey, vespeneGasCost: card.vespeneGasCost,
      budgetProfileHash: card.budgetProfileHash });
  }
  const vespeneSpent = selectedCards.reduce((sum, card) =>
    sum + card.vespeneGasCost, 0);
  return { source: "official_builder_menu_arithmetic_not_a_rules_verdict",
    candidateHash: hashStarcraftTmgContract(candidateInput),
    menuReceiptHash: menu.receiptHash, selectedCards, vespeneSpent,
    vespeneLimit: { numerator: candidateInput.mineralBudget * ratio.numerator,
      denominator: ratio.denominator },
    vespeneExcess: { numerator: Math.max(0,
      vespeneSpent * ratio.denominator
        - candidateInput.mineralBudget * ratio.numerator),
      denominator: ratio.denominator },
    rulesLegalityClaimed: false, strategyRankingPerformed: false };
}

async function uninternedDecisionContextWithRejectedProposal(state, skillGuidance,
  missionEvidence, replyStore, queryCapabilities) {
  const context = decisionContext(state, skillGuidance, missionEvidence, queryCapabilities);
  if (![2, 3, 4].includes(state.modelContextVersion)
    && Number(state.modelContextVersion || 0) < 9) return context;
  const latest = state.iterations.at(-1);
  if (state.modelContextVersion === 2
    && (state.currentCandidate
      || latest?.decisionKind !== "propose"
      || latest.rulesVerdictStatus === "legal")) return context;
  const rejection = state.modelContextVersion === 2
    ? state.observations.findLast((entry) =>
      entry.requestKey === latest.requestKey
        && entry.query?.kind === "builder_verdict")
    : state.observations.findLast((entry) =>
      entry.query?.kind === "builder_verdict"
        && entry.receipt?.status === "illegal");
  if (!rejection || rejection.receipt?.status !== "illegal") return context;
  const retained = await replyStore.loadRetainedReply(rejection.requestKey);
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
    slotProjection: menuSlotProjection(candidateInput, state.observations,
      [3, 4].includes(state.modelContextVersion) || state.modelContextVersion >= 9),
    ...(state.modelContextVersion === 4 || state.modelContextVersion >= 9 ? {
      resourceProjection: menuResourceProjection(candidateInput,
        state.observations),
    } : {}),
    status: "rejected_not_current_roster",
  } };
}

async function decisionContextWithRejectedProposal(state, skillGuidance,
  missionEvidence, replyStore, queryCapabilities) {
  const context = projectIterativeRosterLatestToolTurnV1(state,
    await uninternedDecisionContextWithRejectedProposal(state,
      skillGuidance, missionEvidence, replyStore, queryCapabilities));
  // Old dispatched contexts retain their byte identity. New decisions share
  // repeated values inside the same prompt; strategy and every unique fact
  // survive exactly, without selecting which evidence the model should value.
  return Number(state.modelContextVersion || 0) >= 14
    ? internRosterTeachPromptEvidenceV1(context) : context;
}

function decisionFailure(decision, state) {
  const current = state.currentCandidate;
  if (decision.kind === "accept_teach") {
    if (state.teachFeedback?.acceptanceBlocked) return 'ITERATIVE_ROSTER_TEACH_SOURCE_REPAIR_REQUIRED';
    return pendingTeach(state) && decision.publicReason.trim()
      && state.teachFeedback.candidateHash === current?.candidateHash
      ? null : "ITERATIVE_ROSTER_TEACH_ACCEPTANCE_INVALID";
  }
  if (requiredDecisionReason(state)
    && decision.kind !== "propose") {
    return "ITERATIVE_ROSTER_FLASH_REBUILD_REQUIRED";
  }
  const routeObserved = (candidateHash, receiptHash) =>
    state.observations.some((entry) => entry.query?.kind === "map_route"
      && entry.query.candidateHash === candidateHash
      && entry.receipt?.candidateHash === candidateHash
      && entry.receipt?.mapBinding?.roomFreezeHash
        === state.frozenContext.mapHash
      && entry.receipt?.receiptHash === receiptHash
      && ["exact", "certified", "advisory"].includes(
        entry.receipt.status));
  if (decision.kind === "query") {
    // The query's typed parameters, not its optional prose label, determine
    // the tool call. A blank label must not discard an otherwise valid paid
    // decision (observed at revision 19).
    if (decision.queries.length === 0) {
      if (decision.ignoredQueries?.some(query => query.reason === 'QUERY_ALREADY_RETURNED_IDENTICAL_EVIDENCE')) {
        return 'ITERATIVE_ROSTER_UNCHANGED_QUERY_LOOP';
      }
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
  if (decision.kind === 'revise_plan') {
    if (!current || !decision.plan.victoryRoute.trim()) return 'ITERATIVE_ROSTER_PLAN_REVISION_INVALID';
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
    && decision.assumptionDisposition !== "revise"
    && !inspectIterativeRosterNarrativeAlignmentV1(decision, state).allowed) {
    return "ITERATIVE_ROSTER_FLASH_ROUTE_REVISION_UNDECLARED";
  }
  return null;
}

export function inspectIterativeRosterNarrativeAlignmentV1(decision, state) {
  const previous = state?.plan;
  const next = decision?.plan;
  const strategyUnchanged = Boolean(previous?.strategy && next?.strategy)
    && hashStarcraftTmgContract(previous.strategy)
      === hashStarcraftTmgContract(next.strategy);
  const routeNarrativeChanged = Boolean(previous && next)
    && previous.victoryRoute !== next.victoryRoute;
  const sameMapEvidence = Boolean(previous?.mapEvidenceHash)
    && (previous.mapEvidenceHash === next?.mapEvidenceHash
      || decision?.evidenceBindingKind
        === "certified_current_candidate_route"
        && decision.originalMapEvidenceHash === previous.mapEvidenceHash);
  const sameExactBudgetCandidate = Boolean(state?.currentCandidate?.candidateHash)
    && state.currentCandidate.candidateHash === previous?.candidateHash
    && state.currentCandidate.mineralSpent === state.mineralBudget;
  const allowed = decision?.kind === "finish"
    && decision.assumptionDisposition === "retain"
    && routeNarrativeChanged && strategyUnchanged && sameMapEvidence
    && sameExactBudgetCandidate;
  return { allowed, strategyUnchanged, routeNarrativeChanged,
    sameMapEvidence, sameExactBudgetCandidate,
    priorRouteHash: previous?.victoryRoute
      ? hashStarcraftTmgContract(previous.victoryRoute) : null,
    nextRouteHash: next?.victoryRoute
      ? hashStarcraftTmgContract(next.victoryRoute) : null,
    correctionKind: allowed
      ? "victory_route_narrative_aligned_without_strategy_change" : null,
    modelDispositionPreserved: true,
    rulesOrMapAuthorityChanged: false };
}

function admissibleQueries(decision, state, queryCapabilities) {
  // Map receipt identity is owned by the same product adapter for every Plan
  // write, not by the model or a command-specific conversion. The candidate
  // and map must both match; never bind a previous army's route to a proposal.
  if (['propose', 'revise_plan', 'finish'].includes(decision.kind)) {
    const currentHash = decision.kind === 'propose'
      ? hashStarcraftTmgContract(decision.candidateInput)
      : state.currentCandidate?.candidateHash;
    const route = state.observations.findLast((entry) =>
      currentHash && entry.query?.kind === "map_route"
        && entry.query.candidateHash === currentHash
        && entry.receipt?.candidateHash === currentHash
        && entry.receipt?.mapBinding?.roomFreezeHash
          === state.frozenContext.mapHash
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
    // Receipt identity is host-owned metadata, not a strategic choice.
    // Bind the actual current-roster/current-map tool result even if the
    // model copied an unknown pointer; never fabricate a missing route.
    // Preserve its raw citation as a diagnostic for the source review.
    if (route && supplied !== route.receipt.receiptHash) {
      return { ...decision, plan: { ...decision.plan,
        mapEvidenceHash: route.receipt.receiptHash },
      originalMapEvidenceHash: supplied || null,
      modelEvidenceReferenceStatus: summaryIsBound
        ? "known_summary_alias" : "unrecognized_model_reference",
      evidenceBindingKind: "certified_current_candidate_route",
      inputAdjustments: [{ field: 'plan.mapEvidenceHash',
        supplied: supplied || null, normalized: route.receipt.receiptHash,
        reason: 'bind_existing_current_candidate_map_route',
        source: { candidateHash: currentHash, mapHash: state.frozenContext.mapHash,
          receiptHash: route.receipt.receiptHash },
        strategyChanged: false, arrivalLegalityChanged: false }] };
    }
  }
  if (['propose', 'revise_plan'].includes(decision.kind)) {
    const supplied = decision.plan.mapEvidenceHash;
    const targetHash = decision.kind === 'revise_plan' ? state.currentCandidate?.candidateHash
      : hashStarcraftTmgContract(decision.candidateInput);
    if (supplied && !state.observations.some((entry) => (
      (entry.query?.kind === "map_summary"
        && entry.receipt?.status === "certified"
        && entry.receipt.mapBinding?.roomFreezeHash === supplied
        && supplied === state.frozenContext.mapHash)
      || (entry.query?.kind === "map_route"
        && entry.query.candidateHash
          === targetHash
        && ["exact", "certified", "advisory"].includes(entry.receipt.status)
        && entry.receipt.receiptHash === supplied)))) {
      return { ...decision,
        plan: { ...decision.plan, mapEvidenceHash: null },
        ignoredEvidenceHash: supplied,
        evidenceBindingKind: 'unbound_draft_map_reference',
        inputAdjustments: [{ field: 'plan.mapEvidenceHash', supplied,
          normalized: null, reason: 'no_matching_current_candidate_map_receipt',
          source: { candidateHash: targetHash, mapHash: state.frozenContext.mapHash },
          strategyChanged: false, arrivalLegalityChanged: false,
          requiredEvidence: { queryKind: 'map_route', candidateHash: targetHash } }] };
    }
    return decision;
  }
  if (decision.kind !== "query") return decision;
  const queries = [];
  const ignoredQueries = [];
  for (const query of decision.queries) {
    let reason = null;
    if (unchangedQueryEvidence(state)?.queries.some(previous =>
      hashStarcraftTmgContract(previous) === hashStarcraftTmgContract(query))) {
      reason = 'QUERY_ALREADY_RETURNED_IDENTICAL_EVIDENCE';
    }
    if (Number(state.modelContextVersion || 0) >= 11) {
      const admission = inspectIterativeRosterQueryAdmissionV1(query, state, queryCapabilities(state));
      if (admission) {
        ignoredQueries.push({ kind: query.kind, query: structuredClone(query), reason: admission.code,
          capabilityOutcome: { ...admission, questionAnswered: false } });
        continue;
      }
    } else {
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
    if (["scene_context", "scene_query", "scenario_branch"].includes(query.kind)
      && (!state.currentCandidate || query.candidateHash !== state.currentCandidate.candidateHash)) {
      reason = "SCENE_QUERY_REQUIRES_CURRENT_CANDIDATE";
    }
    }
    if (reason) ignoredQueries.push({ kind: query.kind, reason });
    else queries.push(query);
  }
  return { ...decision, queries, ignoredQueries };
}

export function createIterativeRosterFlashModelPortV1({
  deliberationFactory, replyStore, skillGuidance, missionEvidence,
  queryCapabilities = state => describeIterativeRosterCapabilitiesV1(state),
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
    const repair = (failureCode, diagnostics = null) => ({ outcome: "completed",
      receiptHash: reply.receiptHash,
      decision: { kind: "repair_needed", failureCode,
        diagnostics: diagnostics || (failureCode === "ITERATIVE_ROSTER_FLASH_FINISH_BUDGET_SHORTFALL"
          ? { currentMineralSpent: state.currentCandidate?.mineralSpent ?? null,
            requiredMineralSpent: state.mineralBudget,
            mineralShortfall: state.mineralBudget
              - Number(state.currentCandidate?.mineralSpent || 0),
            requiredNextAction: "revise_roster_or_query_budget_branches" }
          : failureCode === 'ITERATIVE_ROSTER_UNCHANGED_QUERY_LOOP'
            ? unchangedQueryEvidence(state) : null),
        providerReplyHash: reply.output
          ? hashStarcraftTmgContract(reply.output)
          : reply.failedOutputRecord?.rawTextHash || null },
      reconciledFromRequestKey: reply.reconciledFromRequestKey || null });
    const expectedContextHash = hashStarcraftTmgContract(
      await decisionContextWithRejectedProposal(state, skillGuidance,
        missionEvidence, replyStore, queryCapabilities));
    if (reply.contextHash !== expectedContextHash) {
      fail("ITERATIVE_ROSTER_RETAINED_CONTEXT_MISMATCH");
    }
    if (reply.outcome === "repair_needed") {
      return repair(reply.failureCode);
    }
    let decision;
    try { decision = admissibleQueries(decisionFromOutput(reply.output, state),
      state, queryCapabilities); }
    catch (error) { return repair("ITERATIVE_ROSTER_FLASH_OUTPUT_INVALID", error.outputDiagnostics || null); }
    if (Number(state.modelContextVersion || 0) >= 20
      && reply.output?.schemaVersion !== ITERATIVE_ROSTER_FLASH_MODEL_PORT_V1) {
      decision = { ...decision, wireMetadataAdjustments: [{ field: 'schemaVersion',
        supplied: reply.output?.schemaVersion ?? null, effective: ITERATIVE_ROSTER_FLASH_MODEL_PORT_V1,
        authority: 'bound_request_output_contract', originalReplyPreserved: true }] };
    }
    const narrativeAlignment = inspectIterativeRosterNarrativeAlignmentV1(
      decision, state);
    if (narrativeAlignment.allowed) {
      decision = { ...decision, routeNarrativeAlignment: narrativeAlignment };
    }
    const failureCode = decisionFailure(decision, state);
    if (failureCode) return repair(failureCode,
      Number(state.modelContextVersion || 0) >= 11 && decision.ignoredQueries?.length
        ? { ignoredQueries: decision.ignoredQueries,
          queryCapabilities: queryCapabilities(state),
          ...(failureCode === 'ITERATIVE_ROSTER_UNCHANGED_QUERY_LOOP'
            ? { unchangedQueryEvidence: unchangedQueryEvidence(state) } : {}) } : null);
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
    // Reconciliation is never another generation attempt. Inspect the
    // retained public answer against today's real typed evidence BEFORE
    // creating a new replay record; unchanged invalid answers cannot loop.
    let nowAdmissible = false;
    try {
      const candidate = admissibleQueries(decisionFromOutput(source.output, state),
        state, queryCapabilities);
      nowAdmissible = decisionFailure(candidate, state) === null;
    } catch {}
    if (!nowAdmissible) {
      fail("ITERATIVE_ROSTER_RECONCILIATION_LIMIT_REACHED");
    }
    const prior = await replyStore.loadRetainedReply(requestKey);
    if (!prior) {
      const contextHash = hashStarcraftTmgContract(
        await decisionContextWithRejectedProposal(state, skillGuidance,
          missionEvidence, replyStore, queryCapabilities));
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
  const retainRejectedRequest = async ({ requestKey, state, dispatch }) => {
    // A confirmed HTTP context rejection is terminal, unlike a timeout or
    // disconnected stream. Preserve its unknown fee and original context;
    // the session settles this attempt before upgrading its next projection.
    if (dispatch?.status !== "response_rejected"
      || dispatch.rejection?.httpStatus !== 400
      || dispatch.rejection?.contextLengthExceeded !== true
      || typeof dispatch.providerReceiptHash !== "string") {
      fail("ITERATIVE_ROSTER_REJECTION_NOT_CONFIRMED");
    }
    const contextHash = hashStarcraftTmgContract(
      await decisionContextWithRejectedProposal(state, skillGuidance,
        missionEvidence, replyStore, queryCapabilities));
    if (dispatch.contextHash !== contextHash
      || dispatch.sessionId !== state.sessionId
      || dispatch.roundIndex !== state.revision + 1
      || dispatch.roundKind !== "iterative_roster_decision"
      || state.pendingDecision && state.pendingDecision.requestKey !== requestKey) {
      fail("ITERATIVE_ROSTER_REJECTION_CONTEXT_MISMATCH");
    }
    await replyStore.retainReply(requestKey, {
      outcome: "repair_needed", requestKey, contextHash,
      receiptHash: dispatch.providerReceiptHash,
      failureCode: "ITERATIVE_ROSTER_PROVIDER_CONTEXT_REJECTED",
      providerDispatch: structuredClone(dispatch),
      usage: dispatch.usage || null, costStatus: dispatch.costStatus || "unknown",
      paidProviderCall: false,
    });
  };
  const modelPort = Object.freeze({
    reconcile,
    retainRejectedRequest,
    proveUnsentRequest: async ({requestKey,state}) => {
      if (state.pendingDecision?.sourceRequestKey
        || await replyStore.loadRetainedReply(requestKey)
        || typeof deliberationFactory.confirmUnsentRequest !== 'function') return null;
      const identity={requestKey,sessionId:state.sessionId,nextRevision:state.pendingDecision?.nextRevision};
      const proof=await deliberationFactory.confirmUnsentRequest(identity);
      return proof?.status==='not_dispatched' && identity.nextRevision===state.revision+1
        && ['requestKey','sessionId','nextRevision'].every(k=>proof[k]===identity[k]) ? proof : null;
    },
    recover: async ({ requestKey, sourceRequestKey, state }) => {
      if (sourceRequestKey) return reconcile({ requestKey, sourceRequestKey, state });
      // A reservation precedes the Provider call. Missing reply alone is never
      // proof that a request was unsent; only the owning transport may certify
      // this exact request/session/revision after its old owner has stopped.
      if (!await replyStore.loadRetainedReply(requestKey)
        && typeof deliberationFactory.confirmUnsentRequest === 'function') {
        const identity = { requestKey, sessionId: state.sessionId,
          nextRevision: state.pendingDecision?.nextRevision };
        const proof = await deliberationFactory.confirmUnsentRequest(identity);
        if (proof?.status === 'not_dispatched'
          && identity.nextRevision === state.revision + 1
          && ['requestKey', 'sessionId', 'nextRevision'].every(key => proof[key] === identity[key])) {
          return modelPort.decide({ requestKey, state: { ...state, pendingDecision: null } });
        }
      }
      return recovered(requestKey, state);
    },
    decide: async ({ requestKey, state }) => {
      const previous = await replyStore.loadRetainedReply(requestKey);
      if (previous) return recovered(requestKey, state);
      const context = await decisionContextWithRejectedProposal(state,
        skillGuidance, missionEvidence, replyStore, queryCapabilities);
      const contextHash = hashStarcraftTmgContract(context);
      const rebuildOnly = context.requiredDecisionKind === "propose";
      const rejectedOnly = rebuildOnly && !state.currentCandidate
        && Boolean(context.lastRejectedProposal);
       const activeContract = Number(state.modelContextVersion || 0) >= 20
         ? pendingTeach(state) ? typedFeedbackContract
           : context.decisionState.draftHandoff ? typedHandoffContract : typedDraftContract
         : Number(state.modelContextVersion || 0) >= 12
         ? pendingTeach(state) ? draftTeachFeedbackContract
           : context.decisionState.draftHandoff ? draftHandoffContract : draftDecisionContract
         : pendingTeach(state) ? feedbackContract
         : rebuildOnly ? proposalOnlyContract : contract;
      const deliberation = await deliberationFactory.createForRun({
        sessionId: state.sessionId,
        runKind: "iterative_roster_step",
        ...(Number(state.modelContextVersion || 0) >= 11
          ? { phaseAuthority: iterativeRosterPhaseAuthorityV1() } : {}),
        onEvent: async (event) => {
          if (event?.type === "provider_dispatch"
            && event.dispatch?.status === "response_rejected"
            && event.dispatch.rejection?.httpStatus === 400
            && event.dispatch.rejection?.contextLengthExceeded === true) {
            await retainRejectedRequest({ requestKey, state, dispatch: event.dispatch });
          } else if (event?.type === "round_completed") {
            await replyStore.retainReply(requestKey, {
              outcome: "completed", requestKey,
              contextHash, receiptHash: event.receiptHash,
              output: event.sanitizedOutputRecord?.sanitizedOutput,
               usage: event.usage, paidProviderCall: event.paidProviderCall !== false,
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
          userMessage: Number(state.modelContextVersion || 0) >= 11
            ? 'Develop the army and Plan together from the supplied Skills, opponent and frozen map. '
              + 'Use queryCapabilities: its availableQueryKinds are usable NOW; a legal partial candidate enables budget and scene queries before reaching the full budget. '
              + 'A no-match result answers only its reported searchScope, not whether the whole task is possible. '
              + 'Query missing relevant facts, propose a complete changed candidate with your provisional scoring/opening/opponent-response plan, '
              + 'or revise that plan as evidence changes. Explain the changed hypothesis and alternatives in public strategy fields. '
              + (context.decisionState.draftHandoff ? context.decisionState.draftHandoff.instruction + ' '
                : Number(state.modelContextVersion || 0) >= 12 ? 'Use revise_plan to change the provisional Plan without changing the army, including before full budget. Read draftTeachFeedback; answer its issues with actual queries, justified retention or revisions, not another identical menu read. ' : '')
              + 'The Builder judges roster legality; source tools judge rule facts. You choose strategic trade-offs, including justified risk. '
              + 'Finish only at exactMineralBudget with current map evidence and a substantive Plan. '
              + (pendingTeach(state) ? 'Teach is not a tactical veto: query, revise army and Plan, or accept_teach with evidence-based reasons for accepting or rejecting the criticism. ' : '')
              + 'Use the required empty placeholders for inactive union fields. Never invent a native receipt or hidden reasoning.'
              + (Number(state.modelContextVersion || 0) >= 20
                ? '\nPlan editing contract: revise_plan writes ONLY planEdits (named text/list replacements); question gives their public rationale. Do not copy the whole old Plan or merely claim its fields changed. Leave plan and candidateInput empty for revise_plan. finish with an entirely empty plan submits the exact current saved Plan to arrival/Teach/source review; it does not approve it. To supply a different Plan at finish, supply the complete Plan. For query/propose/finish/accept_teach use empty planEdits; their evidence requirements are unchanged.' : '')
              + (context.latestOperation?.kind === 'output_repair'
                ? '\nCURRENT OPERATION TO CORRECT (not a new army-generation task): '
                  + JSON.stringify({ requestKey: context.latestOperation.requestKey,
                    revision: context.latestOperation.revision,
                    failureCode: context.latestOperation.failure.failureCode,
                    diagnostics: context.latestOperation.failure.diagnostics,
                    instruction: context.latestOperation.instruction })
                  + '\nKeep the current valid army/Plan and completed evidence unless you choose an actual supported change. Return the next operation that addresses this feedback using the available contracts; do not repeat the rejected write. No strategy is selected by this repair task.'
                : '')
            : pendingTeach(state)
           ? "Evaluate the completed Teach against your original selection purpose, supplied Skills and tool evidence. Teach is a challenge, not a tactical veto. You may keep a risky strategy with explicit public reasons; you need not minimize risk or adopt every criticism. Query scene_context/scenario_branch/scene_query to check combat, marker qualification or map assumptions, propose a complete revised roster, or finish a revised route for another snapshot Teach. To accept this exact taught roster and plan, choose accept_teach and put your public tradeoff/rejection/acceptance reasons in question. Only Builder legality and verified rule facts are binding; unknown evidence is not proof. Acceptance does not skip source review. Empty placeholders remain required for unused fields. No hidden chain of thought."
           : rebuildOnly
          ? (rejectedOnly
            ? "The previous roster was rejected by the official Builder; "
              + "there is no legal current roster. Repair the exact Builder "
              + "rejection in lastRejectedProposal. For a slot overflow, "
              + "change the listed unit compositions or card/Unit mix so "
              + "the offending slot use decreases; changing only IDs, "
              + "upgrades or prose will repeat the failure. "
              + "slotReliefOptions are menu arithmetic, not legal verdicts. "
              + "Submit a changed complete candidate for Builder judgment. "
            : "This under-budget roster has bounded local budget evidence. "
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
            + "private chain of thought.")
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
          ...(Number(state.modelContextVersion || 0) >= 11
            ? { queryCapabilities: context.decisionState.queryCapabilities } : {}),
          queryKinds: Number(state.modelContextVersion || 0) >= 11
            ? context.decisionState.queryCapabilities.availableQueryKinds
            : rebuildOnly ? [] : ["candidate_menu",
            "budget_branches", "map_summary", "map_route", "scene_context", "scene_query", "scenario_branch"],
          sceneQueryContracts: STARCRAFT_TMG_SPATIAL_QUERY_CONTRACTS_V1,
          sceneQueryUsage: "After a Builder candidate exists use scene_context to read its exact IDs and actionSpace. scenario_branch creates an explicit hypothetical snapshot; then query that returned branch using the same scene_query kinds and arguments as live play. Native path/attack legality and marker qualification are distinct from advisory route witnesses, geometry and damage estimates. These queries never execute a live action.",
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
  return modelPort;
}
