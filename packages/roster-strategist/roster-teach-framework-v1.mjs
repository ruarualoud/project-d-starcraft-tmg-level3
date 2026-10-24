// Teach methodology is an advisory, versioned Skill, not a Rules validator.
// The same methodology deepens a preset Plan and an Agent-selected Plan.
// Only the roster edit authority differs. D/legacy Teach remains opt-in.
import { hashStarcraftTmgContract as hash } from "../authoritative-engine/referee-crypto-v1.mjs";
import { internRosterTeachPromptEvidenceV1 } from './roster-prompt-evidence-encoding-v1.mjs';
import {inspectStarcraftTmgActionParametersV1} from '../online-agent-session/action-parameter-contract-v1.mjs';
import { ROSTER_TEACH_QUESTION_DISPOSITIONS_V1, validateRosterTeachQuestionProgressV1,
  validateRosterTeachProgressRepairRetentionV1,deriveRosterTeachQuestionProgressV1 }
  from './roster-teach-question-progress-v1.mjs';
export { internRosterTeachPromptEvidenceV1 } from './roster-prompt-evidence-encoding-v1.mjs';
import { createStarcraftTmgOutputContractV1, outputContractRefStarcraftTmgV1,
  validateStarcraftTmgProviderJsonSchemaValueV1 as validate } from
  "../structured-generation/output-contract-registry-v1.mjs";
import { rosterTeachOutputContractV1 } from "./roster-teach-output-contracts-v1.mjs";
import { createRosterTeachEvidencePortV1, assessRosterTeachEvidenceReadinessV1 }
  from "./roster-teach-evidence-port-v1.mjs";
import { recoverRosterTeachQueriesV1, geometryRepairWorkflow } from "./roster-teach-query-recovery-v1.mjs";
import { reconcileRosterTeachSourceEvidenceV1 } from './roster-teach-source-reconciliation-v1.mjs';
import { normalizeRosterTeachQueryDispatchV1, prepareRosterTeachQueryDispatchV1 } from './roster-teach-query-dispatch-v1.mjs';
import { projectRosterTeachCapabilityGuideV1, ROSTER_TEACH_CAPABILITY_GUIDE_VERSION,
  projectRosterTeachActionAvailabilityScopeV1,
  validateRosterTeachInspectionRequestV1, projectRosterTeachDecisionScopeV1,
  rosterTeachInvestigationWindowV1, resumeRosterTeachUnstartedInvestigationV1,
  resumeRosterTeachRepairedQuestionInvestigationV1 } from './roster-teach-capability-guide-v1.mjs';
import {projectRosterTeachResultEvidenceV1} from './roster-teach-result-evidence-v1.mjs';
import { isolateRosterTeachFactProbeNodesV1, reconcileRosterTeachSynthesisNodesV1,
  projectRosterTeachInvestigationHistoryV1,
  isRosterTeachSynthesisReviewPendingV1, ROSTER_TEACH_FACT_PROBE_VERSION }
  from './roster-teach-fact-probe-v1.mjs';
import { createStructuredFieldCodecV1, STRUCTURED_FIELD_CODEC_BINDING_V3 }
  from '../structured-generation/field-codec-v1.mjs';
import { readRosterTeachTypedEvidenceV1, parseRosterTeachEvidencePathV1,
  formatRosterTeachEvidencePathV1 } from './roster-teach-typed-evidence-v1.mjs';
import { visitRosterTeachOriginalReceiptsV1, retainRosterTeachCitedHistoryV1 } from './roster-teach-history-view-v1.mjs';
import { recordRosterPlanningCheckpointV1, rosterTeachIssueLedgerV1 }
  from './roster-planning-workflow-v1.mjs';
import { pendingRosterTeachReviewHandoffV1, commitRosterTeachReviewHandoffV1,
  prepareRosterTeachPremiseAuditV1, validateRosterTeachPremiseAuditV1, applyRosterTeachPremiseAuditV1 }
  from './roster-teach-source-review-v1.mjs';
import { prepareRosterTeachModelCallV1, retireRosterTeachUnsentDownstreamCallV1 } from './roster-teach-call-checkpoint-v1.mjs';
import { collectRosterTeachSourceFactsV1 } from './roster-teach-source-facts-v1.mjs';
import { ROSTER_TEACH_REVISION_WORK_ORDER_SCHEMA_V1, prepareRosterTeachRevisionWorkOrderV1,
  buildRosterTeachRevisionWorkOrderV1, ROSTER_TEACH_REVISION_WORK_ORDER_CHOICE_SCHEMA_V2,
  projectRosterTeachRevisionChoicesV2, decodeRosterTeachRevisionChoicesV2 } from './roster-teach-revision-work-order-v1.mjs';
import { planRosterTeachSynthesisDeliveryV1, createRosterTeachSynthesisArchiveV1,
  projectRosterTeachSynthesisReaderV1, rosterTeachSynthesisStepKindV1,
  reconcileRosterTeachSynthesisReaderV1,
  validateRosterTeachSynthesisReaderCommandV1, applyRosterTeachSynthesisReaderCommandV1,
  assembleRosterTeachSynthesisReaderV1, prepareRosterTeachProposalConsolidationV1,
  validateRosterTeachProposalConsolidationV1, applyRosterTeachProposalConsolidationV1 } from './roster-teach-synthesis-reader-v1.mjs';
export { planRosterTeachSynthesisDeliveryV1 } from './roster-teach-synthesis-reader-v1.mjs';

export const ROSTER_TEACH_FRAMEWORK_VERSION = "strategy_inquiry_v2";
export const ROSTER_TEACH_EVIDENCE_BINDING_VERSION = 10;
export const ROSTER_TEACH_AXES_V1 = Object.freeze([
  "victory_route", "opponent_scenarios", "opportunity_cost", "capability_demand",
  "post_loss_capability", "terrain_and_formation", "timing_and_synergy", "robustness_and_replanning",
]);
export const ROSTER_TEACH_AUTHORITY_V1 = Object.freeze({
  canAffectRules: false, canAlterEvaluator: false, canAlterPromotionThresholds: false,
  hiddenChainOfThoughtStored: false, trainingTruth: false,
});
const clone = value => structuredClone(value);
const fail = (code, detail = "") => { throw Object.assign(new Error(`${code}:${detail}`), { code }); };
const str = (minLength = 1) => ({ type: "string", minLength, maxLength: 65_536 });
const list = items => ({ type: "array", minItems: 0, items });
const obj = properties => ({ type: "object", properties, required: Object.keys(properties), additionalProperties: false });
const choice = values => ({ type: "string", minLength: Math.min(...values.map(v => v.length)),
  maxLength: Math.max(...values.map(v => v.length)), enum: values });
const axis = choice(ROSTER_TEACH_AXES_V1);
const contentSchema = obj({
  principles: list(str()),
  axes: list(obj({ axisId: axis, questionMethod: str(), evidenceMethod: str(),
    disconfirmationMethod: str(), preserveJustifiedRisk: str() })),
});
const querySchema = rosterTeachOutputContractV1("teach_challenge").providerSchema
  .properties.challenges.items.properties.evidenceRequest;
const schemas = {
  teach_framework_revision_work_order: ROSTER_TEACH_REVISION_WORK_ORDER_SCHEMA_V1,
  teach_framework_revision_work_choices: ROSTER_TEACH_REVISION_WORK_ORDER_CHOICE_SCHEMA_V2,
  teach_framework_learn: contentSchema,
  teach_framework_premise_audit: obj({publicReason:str(),corrections:list(obj({
    questionId:str(),premiseQuote:str(),qualificationFindingIndices:list({type:'integer',minimum:0,maximum:1_000_000_000}),
    publicReason:str(),claim:str(),question:str(),alternatives:list(str()),scenarioAssumptions:list(str()),
    falsification:str(),evidencePlan:str(),
  }))}),
  teach_framework_current_plan_premise_audit: obj({publicReason:str(),corrections:list(obj({
    questionId:str(),premiseQuote:str(),qualificationFindingIndices:list({type:'integer',minimum:0,maximum:1_000_000_000}),
    currentPlanEvidence:list(obj({path:str(),quote:str()})),
    publicReason:str(),claim:str(),question:str(),alternatives:list(str()),scenarioAssumptions:list(str()),
    falsification:str(),evidencePlan:str(),
  }))}),
  // Questions are not query executions. The investigator can read already
  // delivered rules/evidence before choosing a tool with the right predicate.
  // Keep the legacy agenda contract intact for exact paid-reply replay.
  teach_framework_questions: obj({
    coverage: list(obj({ axisId: axis, status: choice(["questioned", "deferred", "not_applicable"]), reason: str() })),
    questions: list(obj({ questionId: str(), axisIds: list(axis), claim: str(),
      question: str(), alternatives: list(str()), scenarioAssumptions: list(str()),
      falsification: str(), evidencePlan: str() })),
  }),
  teach_framework_agenda: obj({
    coverage: list(obj({ axisId: axis, status: choice(["questioned", "deferred", "not_applicable"]), reason: str() })),
    questions: list(obj({ questionId: str(), axisIds: list(axis), claim: str(),
      question: str(), alternatives: list(str()), scenarioAssumptions: list(str()),
      falsification: str(), evidenceRequest: querySchema })),
  }),
  teach_framework_query_repair: obj({ evidenceRequest: querySchema }),
  teach_framework_query_recovery: obj({
    disposition: choice(["retry", "defer"]),
    kind: choice(["inspect", "retained_evidence", "prerequisite_query", "candidate_parameters", "probability", "spatial", "map_route", "math", "threat_exchange", "scenario"]),
    toolRequestJson: str(), publicReason: str(),
  }),
  teach_framework_query_delta_recovery: obj({
    disposition: choice(['retry', 'defer']),
    kind: choice(['patch', 'inspect', 'retained_evidence', 'prerequisite_query', 'candidate_parameters']),
    edits: list(obj({ op: choice(['add', 'replace', 'remove']), path: str(), valueJson: str(0) })),
    toolRequestJson: str(0), publicReason: str(),
  }),
  teach_framework_investigate: obj({
    publicReason: str(),
    queries: list(obj({ questionId: str(), queryId: str(),
      kind: choice(["inspect", "retained_evidence", "probability", "spatial", "map_route", "math", "threat_exchange", "scenario"]),
      toolRequestJson: str(), purpose: str() })),
    unresolved: list(obj({ questionId: str(), missingEvidence: str(), whyNotCurrentlyQueryable: str() })),
  }),
  teach_framework_synthesis: obj({
    answers: list(obj({ questionId: str(), disposition: choice(["retain", "revise", "unresolved"]),
      evidenceRefs: list(str()), publicReason: str(), tradeoff: str(), replanTrigger: str(),
      // Values come from delivered receipts, never model arithmetic/coercion.
      quantitativeEvidence: list(obj({ receiptRef: str(), path: str(), interpretation: str() })),
      qualitativeEvidence: list(obj({ receiptRef: str(), path: str(), interpretation: str() })) })),
    proposedPlanChanges: list(str()), proposedRosterChanges: list(str()),
    frameworkFeedback: list(obj({ axisId: axis,
      kind: choice(["useful_question", "missed_question", "wrong_query", "strategy_suppression_risk"]),
      observation: str(), evidenceRefs: list(str()) })),
  }),
};
schemas.teach_framework_synthesis_step = obj({ action: choice(['read', 'answer', 'finish']),
  reads: list(obj({ documentId: str(), path: str(0), offset: { type: 'integer', minimum: 0, maximum: 1_000_000_000 } })),
  ...schemas.teach_framework_synthesis.properties });
// A distinct operation contract keeps already-paid legacy replies valid while
// reference-only repairs can no longer replace strategic prose or proposals.
schemas.teach_framework_citation_patch = obj({
  ...schemas.teach_framework_synthesis_step.properties,
  action: choice(['read', 'repair_citations', 'answer']),
  publicReason: str(),
  citationPatches: list(obj({ questionId: str(),
    ...Object.fromEntries(['evidenceRefs', 'quantitativeEvidence', 'qualitativeEvidence'].map(key =>
      [key, schemas.teach_framework_synthesis.properties.answers.items.properties[key]])) })),
});
schemas.teach_framework_citation_delta = obj({
  ...schemas.teach_framework_synthesis_step.properties,
  action: choice(['read','repair_citations','answer']),
  publicReason: str(),
  citationEdits: list(obj({repairSlotId:str(),receiptRef:str(),path:str(0)})),
});
schemas.teach_framework_proposal_consolidation = obj({
  publicReason:str(),
  ...Object.fromEntries(['proposedPlanChanges','proposedRosterChanges','frameworkFeedback']
    .map(key=>[key,schemas.teach_framework_synthesis.properties[key]])),
  unresolvedQuestionIds:list(str()),
  questionActions:list(obj({questionId:str(),publicReason:str(),
    planChangeIndices:list({type:'integer',minimum:0,maximum:1_000_000_000}),
    rosterChangeIndices:list({type:'integer',minimum:0,maximum:1_000_000_000})})),
});
const contracts = Object.fromEntries(Object.entries(schemas).map(([kind, bodySchema]) => {
  const providerSchema = obj({ schemaVersion: choice(["starcraft_tmg_teach_framework_generation_v1"]),
    roundKind: choice([kind]), ...bodySchema.properties });
  const version = kind === 'teach_framework_synthesis' ? '1.2.0'
    : kind === "teach_framework_query_recovery" ? "1.3.0"
    : kind === "teach_framework_query_delta_recovery" ? "1.2.0" : "1.0.0";
  const component = part => ({ id: `roster.${kind}.${part}`, version,
    hash: hash(version === "1.0.0" ? `${kind}.${part}.v1` : `${kind}.${part}.inspection.v1`) });
  return [kind, createStarcraftTmgOutputContractV1({ id: `roster.${kind}`, version,
    schemaName: kind, providerSchema, modelOwnedFields: Object.keys(providerSchema.properties),
    hostOwnedFields: [], mapperRef: component("decode"), semanticValidatorRef: component("verify"),
    description: "Public Teach methodology/experience, advisory only; no Rules or evaluator authority." })];
}));

export function rosterTeachFrameworkContractV1(kind) {
  if (!contracts[kind]) fail("ROSTER_TEACH_FRAMEWORK_KIND_INVALID", kind);
  return contracts[kind];
}

export function rosterTeachRecoveryContractV1(kind, candidateParametersAvailable) {
  const base = rosterTeachFrameworkContractV1(kind);
  if (typeof candidateParametersAvailable !== 'boolean') return base;
  const providerSchema = clone(base.providerSchema);
  const allowed=['inspect','retained_evidence','prerequisite_query',
    ...(candidateParametersAvailable?['candidate_parameters']:[])];
  providerSchema.properties.kind.enum = providerSchema.properties.kind.enum.filter(k=>allowed.includes(k));
  const component = part => ({ id: `roster.${kind}.${part}`, version: '1.5.0',
    hash: hash({ policy: 'native_geometry_candidate_actions_v2', part, candidateParametersAvailable }) });
  return createStarcraftTmgOutputContractV1({ id: base.id, version: '1.5.0', schemaName: base.schemaName,
    providerSchema, modelOwnedFields: base.modelOwnedFields, hostOwnedFields: [],
    mapperRef: component('decode'), semanticValidatorRef: component('verify'),
    description:candidateParametersAvailable
      ?'Select a current Native candidate, query another prerequisite, or defer. Handwritten geometry patches are not this workflow.'
      :'No current Native option exists. Query prerequisites or defer; historical options and handwritten geometry patches are not selectable actions.' });
}

export function rosterTeachIncompleteQueryRecoveryV1({ kind, baseContextHash, records }) {
  if (!['teach_framework_query_recovery', 'teach_framework_query_delta_recovery'].includes(kind)) return null;
  const record = (records || []).findLast(r => r.roundKind === kind && r.contextHash === baseContextHash
    && r.providerStatus === 'incomplete' && r.providerIncompleteReason === 'max_output_tokens');
  if (!record) return null;
  return { version: 1, kind, baseContextHash, status: 'pending', maximumRetries: 1,
    originalRawTextHash: record.rawTextHash || null, partialArgumentsAccepted: false,
    historyOrUsageReset: false,
    instruction: 'The previous readonly query reply was truncated at max_output_tokens and was not executed. Return one compact complete query. Use a small finite batch of DISTINCT anchors; do not repeat identical coordinates or exhaustively enumerate the board. Inspect that result before proposing another batch. All original evidence remains available; choose anchors and intent yourself. Do not echo the truncated output or treat partial arguments as accepted.' };
}

// Use the existing schema-directed codec for undeclared public extensions.
// Keep the paid original and extension values; do not edit declared content,
// fill missing fields, truncate arrays or decode/strip native tool arguments.
export function inspectRosterTeachPublicOutputV1(contract, output) {
  const validation = validate(contract.providerSchema, output);
  if (validation.ok || !validation.issues.some(issue => issue.code === 'additional_property_forbidden')) {
    return { value: output, validation, normalization: null };
  }
  const inspected = createStructuredFieldCodecV1(contract,
    { binding: STRUCTURED_FIELD_CODEC_BINDING_V3 }).inspect(output);
  return { value: inspected.value, validation: inspected.validation,
    normalization: { version: 'teach_public_extensions_sidecar_v1',
      contractRef: inspected.contractRef, originalValueHash: inspected.originalValueHash,
      valueHash: inspected.valueHash, sidecar: inspected.sidecar, blocks: inspected.blocks,
      acceptedFieldEdits: 0, providerCalls: 0, semanticAcceptance: false, trainingTruth: false } };
}

// Re-check a paid reply under the current validator before buying a corrective
// reply. The caller binds this pending record to the EXACT current context.
export function revalidateRetainedRosterTeachReplyV1(pending, checkedOutput) {
  if (!pending?.correction?.previousOutput) return { accepted: false };
  try {
    const value = checkedOutput(pending.correction.previousOutput);
    pending.revalidation = { previousCode: pending.correction.code,
      newModelCalls: 0, reusedPaidOutput: true };
    pending.status = 'resolved_by_current_validator';
    return { accepted: true, value };
  } catch (error) { return { accepted: false, error }; }
}

function synthesisContractForAgenda(agenda) {
  const kind = "teach_framework_synthesis";
  const ids = agenda.questions.map(q => q.questionId);
  const providerSchema = clone(contracts[kind].providerSchema);
  const answers = providerSchema.properties.answers;
  answers.minItems = ids.length;
  answers.maxItems = ids.length;
  if (ids.length) answers.items.properties.questionId = choice(ids);
  const component = part => ({ id: `roster.${kind}.${part}`, version: '1.3.0',
    hash: hash({ policy: 'agenda_bound_typed_evidence_v1', part, ids }) });
  return createStarcraftTmgOutputContractV1({ id: `roster.${kind}`, version: '1.3.0',
    schemaName: kind, providerSchema, modelOwnedFields: Object.keys(providerSchema.properties),
    hostOwnedFields: [], mapperRef: component("decode"), semanticValidatorRef: component("verify"),
    description: "One public answer per actual agenda question; unknown remains explicit, not omitted." });
}

export function rosterTeachInvestigationContractV1(questionIds) {
  const kind = 'teach_framework_investigate';
  const ids = [...questionIds];
  if (!ids.length) return contracts[kind];
  const providerSchema = clone(contracts[kind].providerSchema);
  providerSchema.properties.queries.items.properties.questionId = choice(ids);
  providerSchema.properties.unresolved.items.properties.questionId = choice(ids);
  providerSchema.properties.questionProgress = {...list(obj({questionId:choice(ids),
    disposition:choice(ROSTER_TEACH_QUESTION_DISPOSITIONS_V1),evidenceQueryIds:list(str()),publicReason:str()})),
    minItems:ids.length,maxItems:ids.length};
  providerSchema.required.push('questionProgress');
  const component = part => ({ id: `roster.${kind}.${part}`, version: '1.2.0',
    hash: hash({ policy: 'question_handoff_progress_v2', part, ids }) });
  return createStarcraftTmgOutputContractV1({ id: `roster.${kind}`, version: '1.2.0',
    schemaName: kind, providerSchema, modelOwnedFields: Object.keys(providerSchema.properties),
    hostOwnedFields: [], mapperRef: component('decode'), semanticValidatorRef: component('verify'),
    description: 'Per-question factual handoff: new tool results or synthesis/Plan revision, never automatic Plan acceptance.' });
}

export function reuseRosterTeachReadOnlyEvidenceV1({ earlier, request, queryId, questionId, currentDescriptorHash }) {
  if (!earlier?.receiptHash || !currentDescriptorHash
    || earlier.evidencePortDescriptorHash !== currentDescriptorHash
    || earlier.requestHash !== hash(request)
    || !assessRosterTeachEvidenceReadinessV1(earlier).usableForClaim) return null;
  const { receiptHash: originalHash, ...body } = clone(earlier);
  const reused = { ...body, challengeId: queryId, questionId,
    cachedSourceReceiptHash: originalHash, queryNotExecuted: true,
    reuseScope: 'identical_readonly_request_and_immutable_source_under_same_tool_contract',
    instruction: 'This is the saved result of the same read. It is not new evidence for a different predicate. Use it to select the remaining dependent query; do not repeat it to manufacture progress.' };
  return { ...reused, receiptHash: hash(reused) };
}

export function reuseRosterTeachFailedQueryEvidenceV1({ earlier, previousRequest, request,
  queryId, questionId, currentDescriptorHash }) {
  if (earlier?.status !== 'unknown' || !earlier.receiptHash || !previousRequest
    || !currentDescriptorHash || earlier.evidencePortDescriptorHash !== currentDescriptorHash
    || hash(previousRequest) !== hash(request)) return null;
  const { receiptHash: originalHash, ...body } = clone(earlier);
  const reused = { ...body, challengeId: queryId, questionId,
    repeatedFailedRequest: true, queryNotExecuted: true,
    originalQueryId: earlier.challengeId, originalReceiptHash: originalHash,
    originalQueryNotAnswered: true,
    instruction: 'The identical request under the same source/tool contract already failed. This is its retained unknown result, not new evidence or a strategy veto. Correct the causal arguments/prerequisites or use a different relevant query; renaming it does not fix it.' };
  return { ...reused, receiptHash: hash(reused) };
}

// Failed generation queries are work items, not optional prose for another
// model to remember. Carry their exact failures into the existing investigation
// and query-recovery lane. This selects no tactic and executes no query.
export function attachRosterGenerationQueryIssuesV1(state, outcomes = []) {
  const latest = new Map(outcomes.map(row => [row.needId, row]));
  const priorAgendaHash = hash(state.agenda);
  const removedDuplicates = [];
  let addedQuestions = 0;
  let changed = false;
  for (const [needId, row] of latest) {
    if (row.status === 'answered' || row.evidenceReceipt?.status !== 'unknown'
      || !row.request?.kind || !row.request.toolRequest) continue;
    const request = { kind: row.request.kind, toolRequest: clone(row.request.toolRequest) };
    const questionId = `generation-${hash({needId, request}).slice(0,32)}`;
    const generatedQuestion = { questionId, axisIds: ['robustness_and_replanning'],
      claim: `Generation query remains unanswered: ${row.request.questionText}`,
      question: row.request.questionText,
      alternatives: [], scenarioAssumptions: [
        'Preserve the original request units, branch and predicates; no hidden opponent certainty is assumed.'
      ],
      falsification: 'Resolve the actual query through Native evidence, refute its premise with evidence, or explicitly revise the Plan so it no longer depends on this unsupported claim. Rewording unknown or repeating a failed request does not resolve it.',
      evidenceRequest: request };
    const matching = state.agenda.questions.filter(q => q.questionId === questionId);
    // An earlier agenda may already carry this stable issue ID. Preserve its
    // current model-owned wording; attach the original failure, not a second
    // question. Repair old checkpoints only when the extra is provably the
    // exact host-generated duplicate, never by choosing between model meanings.
    if (matching.length > 1) {
      const hostHash = hash(generatedQuestion);
      const authored = matching.filter(q => hash(q) !== hostHash);
      if (authored.length > 1) fail('ROSTER_TEACH_QUESTION_IDENTITY_CONFLICT', questionId);
      const canonical = authored[0] || matching[0];
      const copies = matching.filter(q => q !== canonical);
      removedDuplicates.push(...copies.map(q => ({questionId,needId,question:clone(q)})));
      state.agenda.questions = state.agenda.questions.filter(q => q.questionId !== questionId || q === canonical);
      changed = true;
    }
    if (state.generationQueryHandoffs?.some(h => h.questionId === questionId)) continue;
    const receipt = reuseRosterTeachFailedQueryEvidenceV1({ earlier: row.evidenceReceipt,
      previousRequest: request, request, queryId: questionId, questionId,
      currentDescriptorHash: row.evidenceReceipt.evidencePortDescriptorHash });
    if (!receipt) fail('ROSTER_TEACH_GENERATION_QUERY_HANDOFF_INVALID', needId);
    if (!matching.length) { state.agenda.questions.push(generatedQuestion); addedQuestions++; }
    state.evidence.push(receipt);
    state.generationQueryHandoffs ||= [];
    state.generationQueryHandoffs.push({ questionId, needId,
      originalFailureReceiptHash: row.evidenceReceipt.receiptHash,
      retainedFailureReceiptHash: receipt.receiptHash, queryReexecuted: false });
    changed = true;
  }
  if (changed) {
    if (addedQuestions) {
      const coverage = state.agenda.coverage.find(c => c.axisId === 'robustness_and_replanning');
      coverage.status = 'questioned';
      coverage.reason += ' Outstanding generation tool requests are carried into the same investigation and correction workflow.';
    }
    if (removedDuplicates.length) {
      const normalization = {fromAgendaHash:priorAgendaHash,toAgendaHash:hash(state.agenda),
        removedDuplicates,canonicalModelQuestionsUnchanged:true,originalEvidenceUnchanged:true};
      (state.generationQuestionMergeHistory ||= []).push(normalization);
      if (!addedQuestions && state.questionPremiseAudit?.status === 'completed'
        && state.questionPremiseAudit.resultAgendaHash === priorAgendaHash) {
        state.questionPremiseAudit.identityNormalization = clone(normalization);
      }
    }
  }
  return changed;
}

export function validateRosterTeachInvestigationProgressV1(output, state, questionIds, currentDescriptorHash = null, deliveredEvidence = []) {
  validateRosterTeachQuestionProgressV1(output, questionIds);
  const closing=(output.questionProgress||[]).filter(progress=>
    progress.disposition!=='needs_tool_result');
  const unconsumed=closing.flatMap(progress=>deliveredEvidence.filter(receipt=>
    receipt.questionId===progress.questionId
    && !progress.evidenceQueryIds.includes(receipt.challengeId)
    && !progress.evidenceQueryIds.includes(receipt.receiptHash)).map(receipt=>{
      const context=receipt.branchQueryContext||receipt.queryContext;
      return {questionId:progress.questionId,queryId:receipt.challengeId,
        receiptHash:receipt.receiptHash,status:receipt.status,
        unknownReasonCode:receipt.unknownReasonCode||null,
        phase:context?.phase,baseStateHash:context?.baseStateHash,
        finiteActions:context?.actionSpace?.finiteActions||[],
        resultLocation:'fact_probe_tool_executions.currentBatchEvidence',
        proposedHandoff:progress.publicReason};
    }));
  if(unconsumed.length)fail('ROSTER_TEACH_INVESTIGATION_RESULT_NOT_CONSUMED',JSON.stringify({
    unconsumed,
    instruction:'This handoff omits the actual results of your preceding queries. Read these NEW receipts and account for them before ending investigation. The original frozen source assessment is not an updated result of a later private branch. If your chosen experiment still has supported dependent Native steps, continue it using the returned state; not-yet-executed steps are work remaining, not a missing capability or a requirement for a committed Plan. Otherwise cite the actual stopping evidence and explain its scope. Do not merely add a reference to an unchanged stale conclusion. The Host does not choose the action, route or strategic answer, and a cited receipt never clears unknowns or accepts a Plan.'}));
  for (const progress of output.questionProgress || []) {
    if (progress.disposition !== 'capability_gap') continue;
    const invalidInput=deliveredEvidence.find(row=>row.questionId===progress.questionId
      &&row.queryRepair?.correctable===true
      &&row.unknownReasonCode!=='ROSTER_TEACH_EVIDENCE_BRANCH_REF_UNKNOWN'
      &&row.queryRepair.failureTargets?.some(t=>t.nativeQueryRepair?.mayRepairSameChoice===true));
    if(invalidInput)fail('ROSTER_TEACH_CAPABILITY_GAP_AFTER_CORRECTABLE_INPUT',JSON.stringify({
      questionId:progress.questionId,failedQueryId:invalidInput.challengeId,
      failureCode:invalidInput.unknownReasonCode,
      actionAvailabilityScope:projectRosterTeachActionAvailabilityScopeV1(invalidInput.queryRepair),
      instruction:'The current Native rejection is a correctable submitted-parameter error. It did not establish that the capability is absent. Use the current submission contract and complete operation catalog to investigate the intended predicate, including explicit native successor steps when relevant. A local activation menu is not a global capability inventory. If the original Plan claim instead exceeds the conditional experiment, hand that exact unsupported claim to plan_revision_required with reasons and evidence; that does not accept or silently resolve the Plan. Only report capability_gap with an actual unsupported capability after its prerequisites, not from this input rejection. The Host supplies no tactic, position, success guarantee or arrival schedule.'}));
    const failure = deliveredEvidence.find(row => row.questionId === progress.questionId
      && row.unknownReasonCode === 'ROSTER_TEACH_EVIDENCE_BRANCH_REF_UNKNOWN');
    if (!failure) continue;
    const operation = state.investigation.operations.find(row => row.queryId === failure.challengeId);
    const reference = operation?.request?.toolRequest?.branchIdRef;
    const savedMatches = collectRosterTeachScenarioRecordsV1(state)
      .filter(row => row.receipt.sourceReceipt.branchStateHash === reference)
      .map(row => ({branchIdRef:row.challengeId,branchStateHash:reference,
        scenarioReceiptHash:row.receipt.sourceReceipt.receiptHash}));
    fail('ROSTER_TEACH_CAPABILITY_GAP_AFTER_REFERENCE_ERROR', JSON.stringify({
      questionId:progress.questionId,failedQueryId:failure.challengeId,
      failureCode:failure.unknownReasonCode,receivedReference:reference,savedMatches,
      instruction:'The latest operation failed to resolve its scene reference; it did not test whether a Native capability exists. Correct the reference using the retained scenario directory (or these exact saved matches), then inspect the actual returned actions. A unique retained branchStateHash is now a supported alias and still undergoes source validation. Do not turn a caller reference error into missing capability or copy an earlier missing-domain claim over a later successful action menu. No arrival or tactical result is supplied by the Host.' }));
  }
  const allowed = new Set(questionIds);
  for (const row of [...output.queries, ...output.unresolved]) {
    if (!allowed.has(row.questionId)) fail('ROSTER_TEACH_INVESTIGATION_OUTSIDE_PENDING',
      JSON.stringify({ questionId: row.questionId, pendingQuestionIds: questionIds,
        instruction: 'This question is already answered. Use the latest synthesis and repaired receipts; investigate only the pending questions, not the old batch.' }));
  }
  for (const query of output.queries) {
    let args;
    try { args = JSON.parse(query.toolRequestJson); } catch { continue; }
    if (['inspect', 'retained_evidence'].includes(query.kind)) {
      const request = {kind:query.kind,toolRequest:args};
      const previous = state.investigation?.operations?.findLast(op => op.completed
        && op.questionId === query.questionId && hash(op.request) === hash(request));
      const delivered = previous && deliveredEvidence.find(row => row.challengeId === previous.queryId);
      if (delivered?.status === 'advisory'
        && (delivered.queryContext || Object.hasOwn(delivered,'retrievedEvidence'))) {
        fail('ROSTER_TEACH_INVESTIGATION_ALREADY_DELIVERED_READ', JSON.stringify({
          queryId:query.queryId, previousQueryId:previous.queryId, request,
          deliveredAt:'fact_probe_tool_executions.currentBatchEvidence',
          currentResultHash:hash(delivered),
          baseStateHash:delivered.queryContext?.baseStateHash || null,
          actionSpaceHash:delivered.queryContext?.actionSpace?.actionSpaceHash || null,
          instruction:'This exact immutable read and its successful result were delivered in the current batch. It cannot be a new prerequisite. Use that result to select the next dependent operation, ask a different missing predicate, or hand off the question with evidence. Preserve other valid queries. Do not reread this unchanged branch or relabel it as progress; the Host has not chosen any tactic or claimed arrival.' }));
      }
      continue;
    }
    const prepared = prepareRosterTeachQueryDispatchV1({ kind: query.kind, toolRequest: args });
    if (prepared.error) continue; // The per-query execution lane owns correction.
    const { request } = prepared;
    const previous = state.investigation?.operations?.findLast(op => op.completed
      && op.questionId === query.questionId && hash(op.request) === hash(request));
    const priorReceipt = previous && state.investigation.evidence.find(e => e.challengeId === previous.queryId);
    // A proven tool-contract repair may legitimately re-evaluate old arguments.
    if (currentDescriptorHash && priorReceipt?.evidencePortDescriptorHash !== currentDescriptorHash) continue;
    if (reuseRosterTeachReadOnlyEvidenceV1({ earlier: priorReceipt, request, queryId: query.queryId,
      questionId: query.questionId, currentDescriptorHash: currentDescriptorHash || priorReceipt?.evidencePortDescriptorHash })) continue;
    // Admission and execution share the same idempotent unknown-result policy.
    // A repeated failure must not discard other valid work in the paid batch.
    if (reuseRosterTeachFailedQueryEvidenceV1({ earlier: priorReceipt, previousRequest: previous?.request,
      request, queryId: query.queryId, questionId: query.questionId,
      currentDescriptorHash: currentDescriptorHash || priorReceipt?.evidencePortDescriptorHash })) continue;
    if (previous) fail('ROSTER_TEACH_INVESTIGATION_UNCHANGED_QUERY', JSON.stringify({
      queryId: query.queryId, previousQueryId: previous.queryId,
      instruction: 'This exact query already has a saved result. Reuse that result, inspect needed prerequisites, or propose a different query that answers the remaining predicate. Do not repeat the same call or restate the old error.' }));
  }
}

function verifySynthesisCoverage(output, agenda) {
  const expectedQuestionIds = agenda.questions.map(q => q.questionId);
  const supplied = Array.isArray(output?.answers) ? output.answers.map(a => a?.questionId) : [];
  const missingQuestionIds = expectedQuestionIds.filter(id => !supplied.includes(id));
  const unknownQuestionIds = [...new Set(supplied.filter(id => !expectedQuestionIds.includes(id)))];
  const duplicateQuestionIds = [...new Set(supplied.filter((id, i) => supplied.indexOf(id) !== i))];
  if (missingQuestionIds.length || unknownQuestionIds.length || duplicateQuestionIds.length
    || !Array.isArray(output?.answers)) {
    fail("ROSTER_TEACH_FRAMEWORK_ANSWERS_INCOMPLETE", JSON.stringify({ expectedQuestionIds,
      missingQuestionIds, unknownQuestionIds, duplicateQuestionIds,
      instruction: "Preserve valid answers. Supply each missing answer, explicitly unresolved if evidence is missing; remove unknown IDs and resolve duplicate IDs. Do not invent supporting evidence." }));
  }
}

// Model query labels are local handles, not a global uniqueness obligation.
// Bind cross-round collisions on the Host without rewriting the paid reply or
// any tactical arguments. Only earlier scenario labels in this batch can bind
// a later branch reference; never guess forward/self references.
export function bindInvestigationQueryIds(output, operations, roundIndex, sourceHash) {
  const bound = clone(output);
  const used = new Set(operations.map(o => o.queryId));
  const reserved = new Set(bound.queries.map(q => q.queryId));
  const earlierBranches = new Map();
  const queryIdBindings = [];
  for (const [index, query] of bound.queries.entries()) {
    const modelQueryId = query.queryId;
    if (used.has(query.queryId)) {
      const stem = `query-r${roundIndex + 1}-${hash({ sourceHash, roundIndex, index, modelQueryId }).slice(0, 24)}`;
      let id = stem, suffix = 0;
      while (used.has(id) || reserved.has(id)) id = `${stem}-${++suffix}`;
      query.queryId = id;
    }
    const decoded = decodeRosterTeachInvestigationQueryV1(query);
    const request = decoded.request.toolRequest;
    if (!decoded.error && earlierBranches.has(request.branchIdRef)) {
      request.branchIdRef = earlierBranches.get(request.branchIdRef);
      query.toolRequestJson = JSON.stringify(request);
    }
    used.add(query.queryId);
    if (query.kind === "scenario") earlierBranches.set(modelQueryId, query.queryId);
    queryIdBindings.push({ modelQueryId, queryId: query.queryId });
  }
  return { output: bound, queryIdBindings, originalOutputHash: hash(output), completed: false };
}

export function decodeRosterTeachInvestigationQueryV1(query) {
  try {
    const toolRequest = JSON.parse(query.toolRequestJson);
    if (!toolRequest || typeof toolRequest !== 'object' || Array.isArray(toolRequest))
      throw Error('Expected one JSON object of tool arguments');
    return { request: { kind: query.kind, toolRequest }, error: null };
  } catch (error) {
    // Retain the malformed text as diagnostic identity, NEVER executable args.
    // Independent siblings remain usable; the investigator receives the exact
    // tool error next round rather than regenerating the entire paid batch.
    return { request: { kind: query.kind, toolRequest: { unparsedToolRequestJson: query.toolRequestJson } },
      error: { code: 'ROSTER_TEACH_INVESTIGATION_QUERY_JSON_INVALID',
        detail: `${query.queryId}: ${error.message}` } };
  }
}

export function verifyRosterTeachFrameworkV1(skill) {
  if (skill?.skillType !== "teach_framework" || skill?.gameId !== "starcraft-tmg"
    || !skill.frameworkId || !Number.isSafeInteger(skill.version) || skill.version < 1
    || !validate(contentSchema, skill.content).ok
    || skill.content.axes.length !== ROSTER_TEACH_AXES_V1.length
    || new Set(skill.content.axes.map(x => x.axisId)).size !== ROSTER_TEACH_AXES_V1.length
    || Object.entries(ROSTER_TEACH_AUTHORITY_V1).some(([k, v]) => skill[k] !== v)) {
    fail("ROSTER_TEACH_FRAMEWORK_INVALID");
  }
  return true;
}

export function createRosterTeachFrameworkV1({ content, sourceRefs, parent = null }) {
  if (parent) verifyRosterTeachFrameworkV1(parent);
  const skill = { schema: "starcraft_tmg_teach_framework_skill_v1", gameId: "starcraft-tmg",
    skillType: "teach_framework", frameworkId: parent?.frameworkId || "tmg.pregame.strategy_inquiry",
    version: (parent?.version || 0) + 1, parentVersion: parent?.version || null,
    status: "quarantined_candidate", content: clone(content), sourceRefs: clone(sourceRefs),
    ...ROSTER_TEACH_AUTHORITY_V1 };
  verifyRosterTeachFrameworkV1(skill);
  return { ...skill, contentHash: hash(skill) };
}

export const ROSTER_TEACH_FRAMEWORK_LEARNING_BRIEF_V1 = [
  "Learn a questioning method from the delivered frozen game Rules, Skills, mission, map and opponent evidence. Do not learn rule truth from military/RTS analogies.",
  "The eight axes are coverage dimensions, not fixed tactical answers. Derive scenario-specific questions, measurable evidence and ways to falsify claims. No hardcoded unit rankings or bonuses.",
  "Victory route includes timing, contest and kill scoring. Demand is conditional on named opponent compositions/actions, not generic anti-light/anti-armour slogans.",
  "Compare alternatives under the same scenario, resources, terrain and response assumptions. Account for points, Supply, upgrades and timing; cheap models and resilient models have different loss profiles.",
  "Post-loss analysis needs the actual casualty list and resulting attacks, abilities, mobility/coherency, Supply and objective control. Missing tools are unknown, not zero losses or proven safety.",
  "Terrain/formation, range, path, full-base control and arrival legality are different predicates. Query their canonical tools; never substitute route length for weapon range.",
  "Ask about hero-specific jobs, actual supporting units, ability/card costs, activation order, opponent responses, switch conditions and recovery if the initial assumption fails.",
  "Teach challenges evidence, not strategic courage. A justified risky choice may be retained; uncertainty alone is not a veto. No fixed preferred tactic, minimum kill rate or risk score.",
  "A preset roster and an Agent-selected roster receive equal Plan scrutiny. Preset: improve uses, sequence, contingencies and Plan, while keeping the roster. Agent-selected: may reopen roster AND Plan after the evidence snapshot. Never use snapshot immutability as strategic justification.",
];

function verifyAgenda(agenda) {
  const coverage = agenda.coverage;
  if (coverage.length !== ROSTER_TEACH_AXES_V1.length
    || new Set(coverage.map(x => x.axisId)).size !== ROSTER_TEACH_AXES_V1.length) {
    fail("ROSTER_TEACH_FRAMEWORK_COVERAGE_INCOMPLETE");
  }
  const ids = new Set();
  for (const q of agenda.questions) {
    if (!/^[a-zA-Z0-9_-]{1,120}$/u.test(q.questionId) || ids.has(q.questionId) || !q.axisIds.length) {
      fail("ROSTER_TEACH_FRAMEWORK_QUESTION_ID_INVALID");
    }
    ids.add(q.questionId);
  }
  for (const c of coverage) {
    if ((c.status === "questioned") !== agenda.questions.some(q => q.axisIds.includes(c.axisId))) {
      fail("ROSTER_TEACH_FRAMEWORK_COVERAGE_MISMATCH", c.axisId);
    }
  }
}

export function projectRosterTeachRetainedEvidenceV1(receipts) {
  return receipts.map(receipt => JSON.stringify(receipt).length <= 32768 ? clone(receipt) : {
    schema: receipt.schema || receipt.schemaVersion, receiptHash: receipt.receiptHash,
    queryId: receipt.queryId, queryKind: receipt.queryReceipt?.queryKind || receipt.queryKind,
    resultStatus: receipt.resultStatus, unknownReason: receipt.unknownReason,
    fullBodyAvailable: true, retrieval: { kind: "retained_evidence",
      toolRequestJson: JSON.stringify({ receiptHash: receipt.receiptHash, path: "" }) },
    fields: Object.entries(receipt).map(([path, value]) => ({ path,
      type: Array.isArray(value) ? "array" : typeof value,
      ...(Array.isArray(value) ? { length: value.length } : {}),
      ...(value && typeof value === "object" && !Array.isArray(value)
        ? { keys: Object.keys(value) } : {}) })),
    projectionReason: "Large historical body is queryable, not injected repeatedly; current exact board is delivered separately.",
  });
}


export function projectRosterTeachPromptEvidenceV1(value, archive = new Map(), seen = new Set()) {
  if (!value || typeof value !== "object") return value;
  // The fact role has already registered every original and assigned exact read
  // paths. Re-projecting this directory as source evidence can replace its
  // addresses or mistake an index for a Native receipt. Preserve this delivery
  // contract; ordinary source/synthesis projection remains unchanged.
  if(value.kind==='fact_probe_source_material'
    &&value.delivery==='role_scoped_material_library_v1')return clone(value);
  // Durable pending requests already contain this lossless geometry view.
  // It is not raw terrain and must not be projected again (nor replace its
  // original archive entry with the abbreviated groups).
  if (value.allTerrainCellsPreserved === true && value.fullGeometryAvailable === true
    && typeof value.evidenceObjectHash === 'string'
    && value.retrieval?.kind === 'retained_evidence'
    && Array.isArray(value.terrainGroups)) return clone(value);
  // The reply being corrected is operational input, not historical evidence.
  // Preserve its exact schema/value shape: e.g. replacing coverage[] with an
  // archive link gives the agenda role no way to return a corrected full reply
  // because that role has no retained-evidence lookup operation.
  if (value.kind === 'repair_completed_public_reply') return clone(value);
  if (value.kind === 'fact_probe_tool_executions') {
    // The immediately preceding tool result is operational input. A generic
    // large-receipt index used to hide all legal candidates while old failures
    // stayed inline, making the next operation reason from obsolete menus.
    // Keep EVERY current result field; archive/history projection and lossless
    // same-prompt interning still apply to the historical material.
    const {kind,currentBatchEvidence = [],...historical} = value;
    for (const receipt of currentBatchEvidence) {
      projectRosterTeachPromptEvidenceV1(receipt, archive, new Set());
    }
    // Re-evaluate only transport shape against the SAVED selected domain. Old
    // receipts remain byte-for-byte evidence; this is a current diagnostic,
    // never a replayed native action or a new successful geometry result.
    const currentParameterChecks=currentBatchEvidence.flatMap(receipt=>
      (receipt.queryRepair?.failureTargets||[]).flatMap(target=>{
        let args;
        try{args=JSON.parse(target.request?.argumentsJson);}catch{return [];}
        const domain=receipt.queryRepair?.actionSpace?.parameterDomains?.find(d=>d.domainId===args?.domainId);
        const parameters=args?.proposal?.parameters??args?.parameters;
        if(!domain||!parameters)return [];
        return [{sourceReceiptHash:receipt.receiptHash,domainId:domain.domainId,
          parameterCheck:inspectStarcraftTmgActionParametersV1(domain,parameters),
          actionAvailabilityScope:projectRosterTeachActionAvailabilityScopeV1(receipt.queryRepair),
          scope:'Current transport diagnosis on the original selected domain. Use this current field contract if a saved historical repair hint disagrees. It does not prove geometry, arrival or strategy; no original receipt was changed.'}];
      }));
    return {kind,...projectRosterTeachPromptEvidenceV1(historical,archive,seen),
      currentBatchEvidence:clone(currentBatchEvidence),
      currentParameterChecks,
      currentResultDelivery:'complete_original_tool_results_not_historical_summary'};
  }
  // This role has no later inspection turn. Retain every historical claim in
  // the prompt; only the following same-prompt interner may deduplicate it.
  if (value.kind === 'historical_investigation_claims') return clone(value);
  // A current-result pointer links an experiment to a full receipt already
  // delivered elsewhere. It is not the receipt body, including on failure:
  // projecting/re-archiving it would lose queryId and overwrite that body.
  if (value.kind === 'fact_probe_result_reference') return clone(value);
  // A qualified citation carries the referenced receiptHash plus status/value,
  // but is not that original receipt. Re-archiving it under the source hash
  // corrupts lookup identity and strips its model interpretation/path.
  if (typeof value.receiptRef === 'string' && typeof value.path === 'string'
    && typeof value.interpretation === 'string') return clone(value);
  const size = JSON.stringify(value).length;
  const {computedOutcomes: outcomes = [], ...resultViews} = value.receiptHash || value.queryReceiptHash
    ? projectRosterTeachResultEvidenceV1(value, {includeComputedOutcomes:size>32768}) : {};
  const scoped = { ...resultViews,
    // The branch context is the next call's input, not optional historical
    // geometry. Large successful receipts used to hide it behind an archive
    // index, leaving the investigator only the undeployed source actionSpace.
    // Keep the Native phase/resources/domains intact and name the exact branch;
    // repeated values can still be interned inside this same prompt.
    ...(value.requestKind === 'scenario' && value.challengeId
      && value.sourceReceipt?.branchStateHash && value.branchQueryContext ? {
        scenarioContinuation: { branchIdRef: value.challengeId,
          baseStateHash: value.sourceReceipt.branchStateHash,
          scope: 'this retained conditional scene, not the undeployed source or a live room',
          instruction: 'Use this branchIdRef for subsequent inspect, spatial or native_action requests about these placements. Omitting it reads the source; it does not select the latest scene.' },
        // Do not turn a repeated continuation into an out-of-prompt archive
        // reference. The later same-prompt interner handles this duplication.
        branchQueryContext: projectRosterTeachPromptEvidenceV1(value.branchQueryContext, archive, new Set()),
      } : {}) };
  // A tool inspection is not a signed receipt, but can repeat the entire
  // board/action space. Content-address all repeated objects losslessly too.
  // The reference is deliberately NOT called receiptHash: an index is not proof.
  if (size > 4096) {
    const reference = hash(value);
    archive.set(reference, value);
    if (seen.has(reference)) return { ...scoped, evidenceObjectHash: reference,
      sameContentAsEarlierObject: true, fullBodyAvailable: true,
      retrieval: { kind: "retained_evidence", toolRequestJson: JSON.stringify({ receiptHash: reference, path: "" }) } };
    seen.add(reference);
  }
  if (Array.isArray(value)) return value.map(child => projectRosterTeachPromptEvidenceV1(child, archive, seen));
  if ((value.receiptHash || value.queryReceiptHash)
    && (value.status === "unknown" || value.resultStatus === "unknown")) {
    const reference = value.receiptHash || value.queryReceiptHash;
    archive.set(reference, value);
    return { ...scoped, receiptHash: reference, fullBodyAvailable: true,
      retrieval: { kind: "retained_evidence", toolRequestJson: JSON.stringify({ receiptHash: reference, path: "" }) },
      schema: value.schema, challengeId: value.challengeId, questionId: value.questionId,
      status: "unknown", requestKind: value.requestKind, queryKind: value.queryKind,
      unknownReasonCode: value.unknownReasonCode || value.unknownReason,
      queryErrorDetail: value.queryErrorDetail,
       ...(value.recoveryOwner ? { recoveryOwner: value.recoveryOwner,
         correctionInstruction: value.correctionInstruction, queryNotExecuted: value.queryNotExecuted } : {}),
      // A failure's correction contract is operational input, not optional
      // historical detail. Dropping it here defeated the port's repair feedback
      // before the model ever received it.
      ...(value.queryRepair ? { queryRepair:
        projectRosterTeachPromptEvidenceV1(value.queryRepair, archive, seen) } : {}),
      evidenceReadiness: value.evidenceReadiness,
      branchStateHash: value.sourceReceipt?.branchStateHash,
      sourceReceiptHash: value.sourceReceipt?.receiptHash,
      // A failed dependent query does not invalidate independent source or
      // sibling facts. Deliver their own receipts/boundaries to the consumer;
      // retaining only an archive link is insufficient for the synthesis role,
      // which cannot call inspection tools. The aggregate remains unknown.
      ...(value.sourceReceipt?.resultStatus === "ok" ? { sourceReceipt:
        projectRosterTeachPromptEvidenceV1(value.sourceReceipt, archive, seen) } : {}),
      ...(value.followUpReceipts?.some(entry => entry.receipt?.resultStatus === "ok")
        ? { followUpReceipts: value.followUpReceipts
          .filter(entry => entry.receipt?.resultStatus === "ok")
          .map(entry => projectRosterTeachPromptEvidenceV1(entry, archive, seen)) } : {}),
      failedFollowUps: value.followUpReceipts?.filter(e => e.status === "unknown").map(e => ({
        index: e.index, kind: e.kind, unknownReasonCode: e.unknownReasonCode,
        receiptHash: e.receipt?.receiptHash })),
      fields: Object.keys(value), originalQueryNotAnswered: true };
  }
  if (value.allTerrainCellsPreserved === true && Array.isArray(value.terrainGroups)) {
    const reference = hash(value);
    archive.set(reference, value);
    return { ...Object.fromEntries(Object.entries(value).filter(([key]) => key !== "terrainGroups")),
      evidenceObjectHash: reference, fullGeometryAvailable: true,
      retrieval: { kind: "retained_evidence", toolRequestJson: JSON.stringify({ receiptHash: reference, path: "terrainGroups" }) },
      terrainGroups: value.terrainGroups.map((group, index) => ({
        ...Object.fromEntries(Object.entries(group).filter(([key]) => !["rectangles", "otherFootprints"].includes(key))),
        rectangleCount: group.rectangles.length, otherFootprintCount: group.otherFootprints.length,
        exactGeometryPath: `terrainGroups.${index}`,
        boundsMilliInches: group.rectangles.length ? {
          minX: Math.min(...group.rectangles.map(r => r[1])), maxX: Math.max(...group.rectangles.map(r => r[2])),
          minY: Math.min(...group.rectangles.map(r => r[3])), maxY: Math.max(...group.rectangles.map(r => r[4])),
        } : null,
      })),
      boundsAreNotExactSilhouettes: true,
      exactGeometryMustBeQueriedBeforePlacementClaim: true };
  }
  if ((value.receiptHash || value.queryReceiptHash) && size > 32768) {
    const reference = value.receiptHash || value.queryReceiptHash;
    archive.set(reference, value);
    return { ...scoped, receiptHash: reference, fullBodyAvailable: true,
      retrieval: { kind: "retained_evidence", toolRequestJson: JSON.stringify({ receiptHash: reference, path: "" }) },
      fields: Object.entries(value).map(([path, child]) => ({ path,
        type: Array.isArray(child) ? "array" : typeof child,
        ...(child && typeof child === "object"
          ? Array.isArray(child) ? { length: child.length } : { keys: Object.keys(child) }
          : { value: child }) })),
      // Readiness, failure reasons and short numerical outputs are visible;
      // oversized geometry/audit bodies remain fully addressable by path.
      ...Object.fromEntries(Object.entries(value).filter(([key, child]) =>
        key !== "receiptHash" && JSON.stringify(child)?.length <= 4096)),
      ...(Array.isArray(value.followUpReceipts) ? { followUpReceipts:
        value.followUpReceipts.map(child => projectRosterTeachPromptEvidenceV1(child, archive, seen)) } : {}),
      computedOutcomes: outcomes,
      computedOutcomesScope: 'attack_probability_only; empty does not mean other queries returned no evidence. Read spatialRelationshipEvidence and the other typed result fields.',
    };
  }
  return { ...Object.fromEntries(Object.entries(value).map(([key, child]) => {
    if (key === "queryRepair" && child && JSON.stringify(child).length > 32768) {
      return [key, { correctable: child.correctable, reasonCode: child.reasonCode,
        failedFollowUpIndices: child.failedFollowUpIndices,
        availableFoundationBranchRefs: child.availableFoundationBranchRefs,
        originalQueryNotAnswered: child.originalQueryNotAnswered,
        queryContextAvailableThroughInspect: true }];
    }
    return [key, projectRosterTeachPromptEvidenceV1(child, archive, seen)];
  })), ...scoped };
}

// Inline synthesis removes ONLY byte-equivalent duplication. Oversized synthesis
// uses the resumable reader below, where every original value is retrievable.
export function projectRosterTeachSynthesisPromptV1(nodes, archive = new Map()) {
  const projected = projectRosterTeachPromptEvidenceV1(nodes, archive);
  return internRosterTeachPromptEvidenceV1(projected);
}

function priorInquiryAdvice(prior, archive) {
  if (!prior || typeof prior!=='object') return prior;
  if (prior.scope==='historical_advice_not_current_army_or_action_state' && prior.originalInquiry) return prior;
  const reference=hash(prior);
  archive.set(reference,prior);
  const retrieve=path=>({kind:'retained_evidence',
    toolRequestJson:JSON.stringify({receiptHash:reference,path})});
  return {
    scope:'historical_advice_not_current_army_or_action_state',
    ...(prior.snapshotId?{snapshotId:prior.snapshotId}:{}),
    ...(prior.candidateHash?{candidateHash:prior.candidateHash}:{}),
    sourcePlanHash:prior.sourcePlanHash||prior.planHash||null,
    // Both provisional-army and formal-Plan histories use this one lane. The
    // old verdict is available on demand, not beside current facts where the
    // investigator can mistake an already-applied repair for a current defect.
    questionDirectory:(prior.agenda?.questions || []).map((q,index)=>({questionId:q.questionId,
      original:{retrieval:retrieve(`agenda.questions.${index}`)}})),
    answerDirectory:(prior.synthesis?.answers || []).map((a,index)=>({questionId:a.questionId,
      historicalDisposition:a.disposition,notACurrentPlanVerdict:true,
      evidenceRefs:clone(a.evidenceRefs||[]),original:{retrieval:retrieve(`synthesis.answers.${index}`)}})),
    evidenceDirectory:(prior.evidence||[]).map((receipt,index)=>({index,
      questionId:receipt.questionId ?? receipt.challengeId ?? null,
      queryId:receipt.queryId ?? receipt.challengeId ?? null,
      sourceReceiptHash:receipt.receiptHash ?? null,
      status:receipt.status ?? receipt.resultStatus ?? null,
      unknownReasonCode:receipt.unknownReasonCode ?? receipt.unknownReason ?? null,
      original:{retrieval:retrieve(`evidence.${index}`)}})),
    originalInquiry:{evidenceObjectHash:reference,fullBodyAvailable:true,retrieval:retrieve('')},
    advisoryOnly:true,finalAcceptance:false,
    instruction:'This is an earlier inquiry, not the current selected army, Plan or action state. Its complete questions, strategic criticism, verdicts and evidence are available verbatim through the directory; they have NOT been applied as current findings. Current questions may explicitly state that the old issue has already been repaired: judge their current claim, not the archived verdict. Use current_plan_and_frozen_context.plan (or its strategicPlan read handle), selectedRosterReference and canonical current query contracts. Old unit placements, action domains, errors and query plans apply only to their original source/branch; do not copy them as current capabilities or proof. No historical result or strategic argument has been deleted, answered by the Host, or promoted to current truth.'
  };
}

export function projectRosterTeachRolePromptV1(kind, nodes, archive = new Map(), { factProbe = false } = {}) {
  // Persisted context remains exact. Role input separates previous inquiry
  // advice from the current tools before fact-probe isolation or interning.
  nodes=nodes.map(node=>node.context?.previousInquiry ? {...node,context:{...node.context,
    previousInquiry:priorInquiryAdvice(node.context.previousInquiry,archive)}}:node);
  if (kind === 'teach_framework_synthesis') {
    nodes = reconcileRosterTeachSynthesisNodesV1(nodes);
  }
  if (kind === 'teach_framework_investigate' && factProbe) {
    nodes = isolateRosterTeachFactProbeNodesV1(nodes, archive);
  }
  // Both roles see the accumulated investigation. Use the same lossless
  // interning rather than fixing capacity only at the final synthesis stage.
  return ['teach_framework_synthesis', 'teach_framework_investigate'].includes(kind)
    ? projectRosterTeachSynthesisPromptV1(nodes, archive)
    : projectRosterTeachPromptEvidenceV1(nodes, archive);
}

export function preserveRosterTeachPendingInvestigationPromptV1(state, scope) {
  const savedRoute = state.investigationPromptRoutes?.find(row => row.roundIndex === scope.roundIndex);
  if (savedRoute) return savedRoute.route === 'retained_pending_investigation';
  // An explicit fact trial was first sent on the fact-probe route even when
  // old investigator corrections remain pending. Restarts must keep that same
  // route (including any current fact-probe correction), never select legacy
  // prose merely because phase is no longer "completed" after interruption.
  const factStart = state.investigation?.factProbeContinuation?.startRound;
  if (Number.isInteger(factStart) && scope.roundIndex >= factStart) return false;
  // Legacy checkpoints wrote route only after receiving a batch. Once the
  // current lineage has moved to fact-probe, unrelated old pending corrections
  // cannot switch the next interrupted batch back to the legacy investigator.
  if (state.investigation?.rounds?.slice(0, scope.roundIndex).at(-1)?.promptRoute
    === ROSTER_TEACH_FACT_PROBE_VERSION) return false;
  // Old corrections remain in the ledger after another context completes. They
  // must not keep all future batches on an obsolete prompt. Exact context hashes
  // in ask() still decide whether an already-paid reply can actually be reused.
  return !scope.completedBeforeRun && scope.roundIndex === scope.initialRoundCount
    && Boolean(state.replyCorrections?.some(r => r.kind === 'teach_framework_investigate'
    && r.status === 'pending'));
}

export function readRosterTeachRetainedEvidenceV1(receipts, request, archive = new Map()) {
  let receipt = archive.get(request.receiptHash);
  if (!receipt) {
    // A large scenario is indexed as one body, but its actual outcomes cite
    // native child receipts. Resolve those exact delivered identities too.
    visitRosterTeachOriginalReceiptsV1([...receipts, ...archive.values()], value => {
      if (!receipt && (value.receiptHash === request.receiptHash || value.queryReceiptHash === request.receiptHash)) receipt = value;
    });
  }
  if (!receipt) fail("ROSTER_TEACH_RETAINED_EVIDENCE_UNKNOWN");
  // Empty path is the documented readonly root/index request. Citation binding
  // still uses its stricter parser; this does not make an entire receipt a fact.
  const path = String(request.path || ''), parsed = path === ''
    ? { keys: [], allowWildcard: false } : parseRosterTeachEvidencePathV1(path);
  if (!parsed || (parsed.allowWildcard && parsed.keys.includes('*'))) fail('ROSTER_TEACH_EVIDENCE_PATH_INVALID');
  const { keys } = parsed;
  const readPath = root => {
    let value = root;
    for (const key of keys) {
      if (!value || typeof value !== "object" || !Object.hasOwn(value, key)) return { found: false };
      value = value[key];
    }
    return { found: true, value };
  };
  let selected = readPath(receipt), bindingView;
  // The shared citation binder also accepts exact paths in the displayed
  // receipt projection (e.g. computedOutcomes). A model must be able to read
  // back that SAME path. Prefer raw fields, then the deterministic projection
  // of this exact receipt only; never search a similarly named field/receipt.
  if (!selected.found) {
    selected = readPath(projectRosterTeachPromptEvidenceV1(receipt));
    if (selected.found) bindingView = 'delivered_receipt_projection';
  }
  if (!selected.found) {
    // Keep identity exact. Offer navigation within this receipt, not a fuzzy
    // field substitution or a search across unrelated evidence.
    const navigation = [receipt, projectRosterTeachPromptEvidenceV1(receipt)].map((root, index) => {
      let value = root;
      const prefix = [];
      for (const key of keys) {
        if (!value || typeof value !== 'object' || !Object.hasOwn(value, key)) break;
        prefix.push(key); value = value[key];
      }
      return { bindingView: index ? 'delivered_receipt_projection' : 'raw_receipt',
        nearestExistingPath: formatRosterTeachEvidencePathV1(prefix),
        childPaths: value && typeof value === 'object' ? Object.keys(value)
          .map(key => formatRosterTeachEvidencePathV1([...prefix, key])) : [] };
    });
    throw Object.assign(new Error(`ROSTER_TEACH_EVIDENCE_PATH_UNKNOWN:${path}`), {
      code: 'ROSTER_TEACH_EVIDENCE_PATH_UNKNOWN',
      queryRepair: { sourceContract: 'roster_retained_evidence_path_v1', correctable: true,
        reasonCode: 'ROSTER_TEACH_EVIDENCE_PATH_UNKNOWN', originalQueryNotAnswered: true,
        sourceReceiptHash: request.receiptHash, navigation, recoveryOwner: 'investigation',
        failureTargets: [{ requestPointer: '/toolRequest/path', requestKind: 'retained_evidence',
          receivedValue: path, expectedSchema: { path: 'Exact dot/bracket path, JSON Pointer or relative slash path in this receipt or its delivered projection; empty string reads the root/index. No wildcard selection.' },
          correctionInstruction: 'Read a listed child path or the root index, then descend using returned field names. Keep receiptHash unchanged unless you explicitly choose another delivered receipt. No field was substituted and the failed path is not evidence.' }] },
    });
  }
  const value = selected.value;
  const provenance = bindingView ? { bindingView } : {};
  const serialized = JSON.stringify(value);
  return serialized.length <= 32768 ? { sourceReceiptHash: request.receiptHash, path, ...provenance, value: clone(value) }
    : { sourceReceiptHash: request.receiptHash, path, ...provenance, fullBodyAvailable: true,
      children: Object.entries(value).map(([key, child]) => ({ path: formatRosterTeachEvidencePathV1([...keys, key]),
        type: Array.isArray(child) ? "array" : typeof child,
        ...(child && typeof child === "object" ? {
          ...(Array.isArray(child) ? { length: child.length } : { keys: Object.keys(child) }),
        } : { value: child }) })),
      instruction: "Request the relevant child path; all original fields remain available." };
}

// Accept descriptive citation aliases only when their trailing hash resolves
// uniquely to an actually delivered receipt. JSON paths are read, never eval'd.
// Math over supplied assumptions remains math, not a placement/casualty proof.
export function qualifyRosterTeachFrameworkSynthesisV1({ synthesis, evidence, sourceEvidence = [] }) {
  const byRef = new Map();
  const aliases = new Map();
  const displayedReceipts = new Map();
  const sourceFacts = new Map();
  function alias(name, reference) {
    if (!name || !reference) return;
    if (!aliases.has(name)) aliases.set(name, new Set());
    aliases.get(name).add(reference);
  }
  function collect(value) {
    visitRosterTeachOriginalReceiptsV1(value, value => {
      if (!/^[a-f0-9]{64}$/u.test(String(value.receiptHash || ''))) return;
      byRef.set(value.receiptHash, value);
      for (const name of [value.challengeId, value.queryId, value.referenceId]) alias(name, value.receiptHash);
    });
  }
  collect(sourceEvidence);
  collect(evidence);
  for(const context of (Array.isArray(sourceEvidence)?sourceEvidence.flat(Infinity):[sourceEvidence])){
    if(!context||typeof context!=='object')continue;
    for(const fact of collectRosterTeachSourceFactsV1(context)){
      if(!byRef.has(fact.referenceId))byRef.set(fact.referenceId,fact.value);
      sourceFacts.set(fact.referenceId,fact);
      for(const name of [fact.citationRef,...fact.aliases])alias(name,fact.referenceId);
    }
  }
  function resolve(reference) {
    if (byRef.has(reference)) return reference;
    const suffix = /(?:^|:)([a-f0-9]{64})$/u.exec(String(reference || ""))?.[1];
    if (suffix && byRef.has(suffix)) return suffix;
    const matches = aliases.get(reference);
    return matches?.size === 1 ? [...matches][0] : null;
  }
  function pathStructure(root, path) {
    if (!root) return null;
    const parsed = parseRosterTeachEvidencePathV1(path);
    if (!parsed) return { resolvedPath: '', invalidPathEncoding: true };
    const { keys } = parsed;
    const resolved = [];
    let cursor = root;
    for (const key of keys) {
      if (!cursor || typeof cursor !== 'object' || (parsed.allowWildcard && key === '*')
        || !Object.hasOwn(cursor, key)) break;
      cursor = cursor[key]; resolved.push(key);
    }
    return { resolvedPath: formatRosterTeachEvidencePathV1(resolved), missingSegment: keys[resolved.length] ?? null,
      valueType: Array.isArray(cursor) ? 'array' : cursor === null ? 'null' : typeof cursor,
      ...(Array.isArray(cursor) ? { arrayLength: cursor.length } : {}),
      availableFields: cursor && typeof cursor === 'object' && !Array.isArray(cursor)
        ? Object.entries(cursor).map(([key, value]) => ({ key,
          type: Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value,
          ...(value && typeof value === 'object' && !Array.isArray(value)
            ? { childKeys: Object.keys(value) } : {}) })) : [] };
  }
  const qualified = clone(synthesis);
  for (const answer of qualified.answers) {
    const related = evidence.filter(e => (e.questionId || e.challengeId) === answer.questionId);
    // Independent successful facts do not close a repair that changed the
    // question. Only the latest result for that same failed query can close it.
    const latestRecovery = new Map(related.filter(e => e.queryRecoveryOf)
      .map(e => [e.queryRecoveryOf, e]));
    const unansweredQueries = [...latestRecovery.values()]
      .filter(e => e.queryRepair?.missingQueryPredicates?.length);
    answer.citationBindings = answer.evidenceRefs.map(reference => ({ reference, receiptHash: resolve(reference),
      ...(sourceFacts.has(resolve(reference))?{referenceKind:'frozen_source_fact'}:{}) }));
    answer.evidenceRefs = [...new Set(answer.citationBindings.map(x => x.receiptHash).filter(Boolean))];
    const suppliedCitations = ['quantitativeEvidence', 'qualitativeEvidence'].flatMap(category =>
      (answer[category] || []).map((item, index) => ({ item, category, index })));
    answer.quantitativeEvidence = [];
    answer.qualitativeEvidence = [];
    for (const { item, category, index } of suppliedCitations) {
      let receiptHash = resolve(item.receiptRef);
      let receipt = byRef.get(receiptHash);
      let binding = readRosterTeachTypedEvidenceV1(receipt, item.path);
      let bindingView = sourceFacts.has(receiptHash)?'frozen_source_fact':'native_receipt';
      // Only a missing path may fall back to the explicit native source child.
      // An existing unrecognized object must not be shadowed by another value.
      if (!binding.ok && binding.code === 'ROSTER_TEACH_EVIDENCE_PATH_NOT_FOUND') {
        // These declared transport envelopes identify this receipt's own
        // Native result. Do not search arbitrary descendants, suffixes or
        // alternative scenes, and never shadow a path that exists at the root.
        const seen = new Set();
        let source = receipt;
        while (source && typeof source === 'object' && !seen.has(source)) {
          seen.add(source);
          const child = source.sourceReceipt || source.queryReceipt;
          if (!child || typeof child !== 'object' || seen.has(child)) break;
          const childBinding = readRosterTeachTypedEvidenceV1(child, item.path);
          if (childBinding.ok || childBinding.code !== 'ROSTER_TEACH_EVIDENCE_PATH_NOT_FOUND') {
            receipt = child;
            receiptHash = child.receiptHash || child.queryReceiptHash || receiptHash;
            binding = childBinding;
            break;
          }
          source = child;
        }
      }
      // Typed evidence (Native events, geometry and computed outcomes) is part
      // of the actual model-visible view. Resolve an EXACT path in that same
      // deterministic view before calling it unknown. Never search by suffix,
      // switch receipts, infer a number, or rewrite the paid model's citation.
      if (!binding.ok && binding.code === 'ROSTER_TEACH_EVIDENCE_PATH_NOT_FOUND' && receipt) {
        if (!displayedReceipts.has(receiptHash)) {
          displayedReceipts.set(receiptHash, projectRosterTeachPromptEvidenceV1(receipt));
        }
        binding = readRosterTeachTypedEvidenceV1(displayedReceipts.get(receiptHash), item.path);
        if (binding.ok) bindingView = 'delivered_receipt_projection';
      }
      const usable = binding.ok && receipt?.status !== 'unknown' && receipt?.resultStatus !== 'unknown';
      const destination = binding.ok ? binding.category : category;
      const { ok: _ok, category: _category, code: _code, ...typed } = binding;
      answer[destination].push({ ...item, receiptHash,
        ...(sourceFacts.has(receiptHash)?{referenceKind:'frozen_source_fact',sourceFactScope:sourceFacts.get(receiptHash).scope,
          notNativeActionReceipt:true}:{}),
        ...(binding.ok ? { ...typed, bindingView } : { values: [], value: null }),
        // The original paid citation and prose are preserved; this only routes
        // an exact bound value to its type. It does NOT validate an inference.
        ...(destination !== category ? { citationPlacement: { from: category, originalIndex: index,
          to: destination, reason: 'exact_delivered_value_type', originalPath: item.path } } : {}),
        interpretationVerified: false,
        ...(!usable ? { pathRepair: {
          code: !receipt ? 'ROSTER_TEACH_EVIDENCE_RECEIPT_UNKNOWN'
            : binding.ok ? 'ROSTER_TEACH_EVIDENCE_RECEIPT_UNRESOLVED' : binding.code,
          originalReceiptRef: item.receiptRef, originalPath: item.path,
          rawStructure: pathStructure(receipt, item.path),
          displayedStructure: pathStructure(displayedReceipts.get(receiptHash), item.path),
          requiresNativeReexecution: false, automaticallySelectedReplacement: false,
          instruction: 'Use only this same delivered receipt. Numbers or canonical probability estimates belong in quantitativeEvidence; strings/booleans and exact non-numeric structure references belong in qualitativeEvidence. A structure reference supplies no aggregate or selected numeric value: cite its exact scalar leaf for quantitative claims. Do not guess an arbitrary object member, coerce text, substitute another scenario, or confuse a bound value with proof of its interpretation. A citation typo needs no new tool execution; absent or unresolved facts stay unknown.',
        } } : {}),
        status: usable ? 'receipt_bound' : 'unknown',
        calculationPolicy: receipt?.mathKind ? "arithmetic_over_supplied_assumptions_not_rule_truth" : null });
    }
    // A receipt belongs to its source/scene, not exclusively to the question
    // that originally requested it. Judge the explicit citations, not an old
    // failed query attached to this answer's label. This verifies availability,
    // never the model's interpretation or an untested original postcondition.
    const citedReference=answer.evidenceRefs.find(ref=>sourceFacts.has(ref)||
      (byRef.get(ref)&&!byRef.get(ref).contextOnlyNotStrategyProof&&assessRosterTeachEvidenceReadinessV1(byRef.get(ref)).usableForClaim));
    const citedEvidence=citedReference?byRef.get(citedReference):null;
    answer.hostEvidenceStatus = unansweredQueries.length || !citedEvidence ? "unknown"
      : citedEvidence.status || citedEvidence.resultStatus || "advisory";
    if (unansweredQueries.length) answer.unresolvedQueryIds = unansweredQueries.map(e => e.queryRecoveryOf);
    if (!answer.evidenceRefs.length || answer.hostEvidenceStatus === "unknown") {
      answer.disposition = "unresolved";
      answer.replanTrigger ||= "Re-query this assumption before depending on it in play.";
    }
  }
  for (const feedback of qualified.frameworkFeedback) {
    feedback.citationBindings = feedback.evidenceRefs.map(reference => ({ reference, receiptHash: resolve(reference) }));
    feedback.evidenceRefs = [...new Set(feedback.citationBindings.map(x => x.receiptHash).filter(Boolean))];
  }
  return qualified;
}

// Validate references while an answer is still editable in the same reader.
// This is source-owned transport feedback, not a new strategic judgement or a
// new Rules query. In particular, a genuinely unknown receipt stays unknown.
export function inspectRosterTeachReaderCitationsV1({ answers, evidence, sourceEvidence }) {
  const qualified = qualifyRosterTeachFrameworkSynthesisV1({
    synthesis: { answers, proposedPlanChanges: [], proposedRosterChanges: [], frameworkFeedback: [] },
    evidence, sourceEvidence,
  });
  const correctableFailures = [], unresolvedFacts = [];
  for(const answer of answers){
    if(answer.disposition!=='unresolved'&&!answer.evidenceRefs.length)correctableFailures.push({
      questionId:answer.questionId,field:'evidenceRefs',code:'ROSTER_TEACH_EVIDENCE_BINDING_MISSING',
      requiresNativeReexecution:false,automaticallySelectedReplacement:false,
      instruction:'This retain/revise conclusion has no source binding, so the existing qualifier cannot treat it as evidenced. Read the relevant original Rules, schedule, ability constraint or query receipt from sourceNavigation/evidenceDirectory and use repair_citations for this same answer. Do not invent a citation or re-run a tool merely to add a reference. If the claim truly lacks evidence, use a substantive answer with disposition=unresolved and explain the actual missing fact; that is not a citation repair.'});
  }
  for (const answer of qualified.answers) {
    for (const binding of answer.citationBindings || []) {
      if (!binding.receiptHash) correctableFailures.push({ questionId: answer.questionId,
        field: 'evidenceRefs', receiptRef: binding.reference,
        code: 'ROSTER_TEACH_EVIDENCE_RECEIPT_UNKNOWN', requiresNativeReexecution: false });
    }
    for (const field of ['quantitativeEvidence', 'qualitativeEvidence']) {
      for (const item of answer[field] || []) {
        if (!item.pathRepair) continue;
        const issue = { questionId: answer.questionId, field, receiptRef: item.receiptRef,
          path: item.path, ...item.pathRepair, requiresNativeReexecution: false };
        (issue.code === 'ROSTER_TEACH_EVIDENCE_RECEIPT_UNRESOLVED'
          ? unresolvedFacts : correctableFailures).push(issue);
      }
    }
  }
  return { version: 'saved_reader_citation_feedback_v1', correctableFailures, unresolvedFacts,
    instruction: 'Correct these citations with read and answer in this SAME workspace. Read the relevant question document and its original evidence:<receiptHash> bodies. Use an actual delivered receiptHash or its unique query/challenge alias, and an exact receipt-relative field path. Archive document IDs such as plan:/... or context:/... are not receipt IDs. Plan intentions may remain explanatory prose, but do not turn them into executed evidence. The host has not chosen a replacement or changed your argument. If no supporting fact exists, state the assumption/unresolved claim instead of inventing a citation. Existing unknown facts stay unknown; this feedback neither proves them nor requests re-execution. finish requires fixing or explicitly removing malformed references, not manufacturing certainty.' };
}

// One logical continuation after a demonstrated binding repair, not a counter
// reset. A network/observer interruption may resume that same not-yet-applied
// step; after any new command completes, this exception is spent.
export function allowRosterTeachResolvedCitationHandoffV1({ reader, previouslyCorrectableCount, questionIds }) {
  if (reader.noProgressSteps < 3 || reader.citationFeedback?.correctableFailures?.length
    || reader.queuedReads.length || questionIds.some(id => !reader.answers.some(a => a.questionId === id))) return false;
  const stepCount = reader.completedSteps.length;
  if (reader.resolvedCitationHandoff) return reader.resolvedCitationHandoff.bindingVersion === ROSTER_TEACH_EVIDENCE_BINDING_VERSION
    && reader.resolvedCitationHandoff.atStepCount === stepCount;
  if (!previouslyCorrectableCount) return false;
  reader.resolvedCitationHandoff = { bindingVersion: ROSTER_TEACH_EVIDENCE_BINDING_VERSION,
    atStepCount: stepCount, preservedNoProgressSteps: reader.noProgressSteps,
    previousCorrectableCount: previouslyCorrectableCount, reason: 'source_binding_repaired_without_rewriting_paid_answer' };
  return true;
}

// Refresh only a derived consumer view. The paid public answer, query receipts,
// Plan and ledger are not rewritten or re-generated. Read-only consumers use
// this same function as the workbench's persisted binding refresh.
export function deriveRosterTeachSavedEvidenceBindingV1(state, sourceEvidence = []) {
  const unchanged = { refreshed: false, synthesis: state?.synthesis,
    coverage: state?.coverage, evidenceBindingVersion: state?.evidenceBindingVersion };
  if (!state?.synthesisRaw || !state.synthesis || state.phase !== 'completed'
    || state.evidenceBindingVersion === ROSTER_TEACH_EVIDENCE_BINDING_VERSION) return unchanged;
  const evidence = [...(state.evidence || []), ...(state.investigation?.evidence || []),
    ...(state.queryRecovery?.operations || []).map(operation => operation.result).filter(Boolean),
    ...(state.retainedHistoricalEvidence || [])];
  const synthesis = qualifyRosterTeachFrameworkSynthesisV1({ synthesis: state.synthesisRaw,
    evidence, sourceEvidence });
  const coverage = state.agenda?.coverage?.map(c => ({ ...c,
    questionIds: state.agenda.questions.filter(q => q.axisIds.includes(c.axisId)).map(q => q.questionId),
    unresolvedQuestionIds: state.agenda.questions.filter(q => q.axisIds.includes(c.axisId)
      && synthesis.answers.some(a => a.questionId === q.questionId && a.disposition === 'unresolved'))
      .map(q => q.questionId) })) || state.coverage;
  return { refreshed: true, synthesis, coverage,
    evidenceBindingVersion: ROSTER_TEACH_EVIDENCE_BINDING_VERSION,
    derivation: { kind: 'saved_public_reply_current_typed_binding',
      previousBindingVersion: state.evidenceBindingVersion ?? null,
      currentBindingVersion: ROSTER_TEACH_EVIDENCE_BINDING_VERSION,
      rawSynthesisHash: hash(state.synthesisRaw), originalPublicReplyPreserved: true,
      providerCalls: 0, nativeCalls: 0, automaticallyAppliedToPlan: false } };
}

export function rosterTeachRecoveryBranchSelectionV1(state) {
  const selected = state.queryRecovery?.selection;
  // The phase advances during recovery. An interruption does not turn its
  // explicit pending query list into a new whole-investigation restoration.
  return selected?.completed === false ? selected : null;
}

// One-time consumer migration for the concrete mixed-result projection bug.
// Re-summarize saved evidence, never re-execute queries, reset correction
// attempts, change a Plan, or replace the old paid public answer.
export function refreshRosterTeachPartialEvidenceSynthesisV1(state) {
  if (state.partialEvidenceProjectionVersion === 1) return false;
  const evidence = [...(state.evidence || []), ...(state.investigation?.evidence || []),
    ...(state.queryRecovery?.operations || []).map(op => op.result).filter(Boolean)];
  const affectedReceiptHashes = evidence.filter(value => value.status === "unknown"
    && (value.sourceReceipt?.resultStatus === "ok"
      || value.followUpReceipts?.some(entry => entry.receipt?.resultStatus === "ok")))
    .map(value => value.receiptHash).filter(Boolean);
  state.partialEvidenceProjectionVersion = 1;
  if (!state.synthesis || !affectedReceiptHashes.length) return false;
  state.synthesisHistory ||= [];
  state.synthesisHistory.push({ synthesis: state.synthesis, raw: state.synthesisRaw,
    reason: "successful_partial_query_receipts_previously_omitted",
    affectedReceiptHashes: [...new Set(affectedReceiptHashes)] });
  delete state.synthesis; delete state.synthesisRaw;
  return true;
}

export function collectRosterTeachScenarioRecordsV1(state) {
  return [
    ...(state.agenda?.questions || []).map(q => ({ challengeId: q.questionId,
      request: q.evidenceRequest, receipt: state.evidence?.find(e => e.challengeId === q.questionId) })),
    ...(state.investigation?.operations || []).map(op => ({ challengeId: op.queryId,
      request: op.request, receipt: state.investigation.evidence?.find(e => e.challengeId === op.queryId) })),
    ...(state.queryRecovery?.operations || []).map(op => ({ challengeId: op.queryId,
      request: op.request, receipt: op.result })),
    ...(state.queryRecovery?.operations || []).flatMap(op => {
      // An explicit recovery can execute the original scenario before its first
      // correction choice. That receipt lives in currentFailure, not op.result.
      // Register only exact saved request/receipt pairs, never inferred recipes.
      const requests = [op.originalRequest, op.request].filter(Boolean);
      return [op.originalResult, ...(op.previousResults || []), op.currentFailure, op.result]
        .filter(receipt => receipt?.sourceReceipt?.branchStateHash)
        .flatMap(receipt => {
          const request = requests.find(row => hash(row) === receipt.requestHash);
          if (!request) return [];
          return [...new Set([receipt.challengeId, receipt.queryRepair?.scenarioContinuation?.branchIdRef])]
            .filter(Boolean).map(challengeId => ({ challengeId, request, receipt }));
        });
    }),
  ].filter(row => row.request?.kind === 'scenario' && row.receipt?.sourceReceipt?.branchStateHash);
}

// Shared scheduling decision; completing an investigation batch does not
// establish its claims or accept the Plan.
export function rosterTeachInvestigationBatchHandoffV1(round, evidence) {
  const selected=new Set(round.output.queries.map(query=>query.queryId));
  const geometryQueryIds=evidence.filter(result=>selected.has(result.challengeId)
    && result.status==='unknown' && result.queryRepair?.correctable===true
    && geometryRepairWorkflow(result)).map(result=>result.challengeId);
  return {yieldToRecovery:!round.output.queries.length||geometryQueryIds.length>0,geometryQueryIds};
}

export function projectRosterTeachRecoveredQueriesV1(operations, handoff, describeContext) {
  const current=new Set(handoff?.recoveryReceiptHashes||[]);
  return operations.map(operation=>{
    let result=operation.result||operation.currentFailure;
    if(current.has(result?.receiptHash)&&result.sourceReceipt?.branchStateHash){
      const branchQueryContext=describeContext(operation.queryId);
      if(branchQueryContext.baseStateHash!==result.sourceReceipt.branchStateHash
        ||branchQueryContext.sourceStateHash!==result.sourceReceipt.sourceStateHash)
        fail('ROSTER_TEACH_RECOVERY_SUCCESSOR_CONTEXT_CHANGED');
      // A derived prompt view, not a change to the stored/signed original.
      result={...result,branchQueryContext};
    }
    return {questionId:operation.questionId,originalQueryId:operation.originalQueryId,
      queryId:operation.queryId,status:operation.status,request:operation.request,result,
      publicReason:operation.choice?.publicReason||null};
  });
}

// Resumable stages persist full public replies, not chain-of-thought. The caller
// owns Provider dispatch reconciliation/accounting and the single-flight lock.
export function isRosterTeachReaderContinuationV1(state) {
  if (state?.investigation?.completed
    && (rosterTeachInvestigationWindowV1(state).unstartedContinuation
      || rosterTeachInvestigationWindowV1(state).unconsumedToolResult)) return false;
  // A cached synthesis view cannot outrun a newly required audit of a repair
  // that changed scene identity. Ordinary unchanged-scene reads stay fast.
  const unauditedSceneChange = (state?.queryRecovery?.operations || []).some(op =>
    op.choice?.disposition === 'retry' && op.result?.status === 'advisory'
    && (op.scopeAuditVersion || 0) < 3 && op.originalRequest?.toolRequest?.branchIdRef
    && op.originalRequest.toolRequest.branchIdRef !== op.request?.toolRequest?.branchIdRef);
  if (unauditedSceneChange) return false;
  return ['reading', 'completed'].includes(state?.synthesisReader?.status)
    && ['synthesize', 'read_only_queries'].includes(state.phase)
    && state.investigation?.completed === true
    && (state.investigation.operations || []).every(operation => operation.completed === true)
    && !(state.queryRecovery?.selection && state.queryRecovery.selection.completed !== true)
    && (state.queryRecovery?.operations || []).every(operation => operation.completed === true);
}

export function rosterTeachReplyAttemptLimitV1({state,kind,baseContextHash,maxAttempts,pending}) {
  if(maxAttempts)return pending?1:maxAttempts;
  // A phase kind is not a request identity. Old successful/failed investigations
  // must not strip a new inquiry of its ordinary self-correction opportunities.
  // Count distinct failed replies, not re-validations after process recovery.
  const failures=new Set((state.replyCorrections||[])
    .filter(r=>r.kind===kind&&r.baseContextHash===baseContextHash)
    .map(r=>hash({responseContextHash:r.responseContextHash,
      previousOutput:r.correction?.previousOutput})));
  // Preserve the existing workspace-owned single supplemental attempt when an
  // exhausted request is explicitly resumed; do not reset any retained history.
  return failures.size>=3?1:3-failures.size;
}

export async function runRosterTeachFrameworkSessionV1(input) {
  const { deliberation, laboratory, plan, sessionId } = input;
  const workOrderOnly = input.revisionWorkOrderOnly === true;
  // Recover old contexts without resending redundant per-cell audit material.
  // Frozen source identity remains unchanged; current query arguments/geometry
  // are projected from that same immutable laboratory, not a different map.
  const context = { ...input.context,
    existingEvidence: projectRosterTeachRetainedEvidenceV1(input.context.existingEvidence || []),
    ...(input.selectedCandidateInput ? { selectedRosterReference: {
      candidateInput: clone(input.selectedCandidateInput),
      candidateInputHash: hash(input.selectedCandidateInput),
      planHash: plan.planHash, mutationAuthority: false,
      purpose: 'Exact selected native Builder input for hypothetical comparisons. A comparison does not change the roster; rosterEditAuthority still controls any later revision.',
    } } : {}),
    queryContext: workOrderOnly ? clone(input.context.queryContext)
      : laboratory.describeQueryContext({ base: { kind: "source" } }) };
  const state = input.state;
  if (state.sourceReviewQualificationHandoff?.sourceReview?.planHash === plan.planHash) {
    context.sourceReview = clone(state.sourceReviewQualificationHandoff.sourceReview);
  }
  let explicitSynthesisReview = isRosterTeachSynthesisReviewPendingV1(state);
  let synthesisOnly = explicitSynthesisReview || isRosterTeachReaderContinuationV1(state);
  const completedBeforeRun = state.phase === "completed";
  const evidenceArchive = new Map();
  // A saved reader still follows retained_evidence links from its original
  // archive. Skipping Native scene preparation must NOT skip those originals:
  // the projected context alone no longer contains their complete bodies.
  // Keep the same index as the initial ordinary synthesis so a restart cannot
  // silently replace its archive identity or discard its partial conclusions.
  if (!workOrderOnly && (!synthesisOnly || isRosterTeachReaderContinuationV1(state))) {
    projectRosterTeachPromptEvidenceV1([input.context, state], evidenceArchive);
  }
  const checkpoint = async () => {
    state.issueLedger = rosterTeachIssueLedgerV1(state);
    const operations = [...(state.investigation?.operations || []), ...(state.queryRecovery?.operations || [])];
    const latest = operations.at(-1);
    recordRosterPlanningCheckpointV1(state, { stage: state.phase || 'starting',
      planHash: plan.planHash, selectedCandidateHash: input.selectedCandidateInput ? hash(input.selectedCandidateInput) : null,
      questionStatus: state.issueLedger.questions.map(q => ({ questionId: q.questionId, issueKey: q.issueKey, status: q.status })),
      completedCalls: (state.calls || []).length, latestQueryId: latest?.queryId || null,
      latestQueryStatus: latest?.result?.status || latest?.status || null,
      completedOperations: operations.filter(op => op.completed || op.result).length,
      paidRepliesRemainInOriginalStore: true });
    await input.onCheckpoint(clone(state));
  };
  const sourceHash = hash({ context: input.context, plan });
  if (state.sourceHash && state.sourceHash !== sourceHash) fail("ROSTER_TEACH_FRAMEWORK_SOURCE_CHANGED");
  // Only new inquiries receive the new instructions. Never change an old
  // paid pending prompt or silently enlarge an explicitly bounded recovery.
  if (!state.sourceHash) state.investigationPolicyVersion = 'evidence_led_issue_progress_v1';
  state.sourceHash = sourceHash;
  state.evidence ||= [];
  state.repairs ||= [];
  state.calls ||= [];
  if (!workOrderOnly && state.investigation?.completed && rosterTeachInvestigationWindowV1(state).unconsumedToolResult) {
    retireRosterTeachUnsentDownstreamCallV1({state,
      retainedPublicOutputs:input.retainedPublicOutputs,retainedDispatches:input.retainedDispatches});
  }
  if (!workOrderOnly && (resumeRosterTeachRepairedQuestionInvestigationV1({state,
    retainedPublicOutputs:input.retainedPublicOutputs,retainedDispatches:input.retainedDispatches})
    || resumeRosterTeachUnstartedInvestigationV1(state))) {
    explicitSynthesisReview = false;
    synthesisOnly = false;
    projectRosterTeachPromptEvidenceV1([input.context, state], evidenceArchive);
    await checkpoint();
  }
  const evidencePort = workOrderOnly ? null : createRosterTeachEvidencePortV1(laboratory, {
    retainedQueryReceipts: (input.context.selectionEvidence?.queries || []).map(row => row.receipt),
    retainedScenarios: [
      ...(input.retainedScenarios || []),
      ...collectRosterTeachScenarioRecordsV1(state),
    ].filter(row => row.receipt?.sourceReceipt?.sourceStateHash === context.queryContext.sourceStateHash),
  });
  if (!workOrderOnly && await reconcileRosterTeachSourceEvidenceV1({ state,
    sourceStateHash: context.queryContext.sourceStateHash, evidencePort,
    initialFoundationHash: hash(plan), sourceHash, checkpoint })) {
    // Recomputed facts need a fresh synthesis, not the saved answer to a
    // different source. Plan/questions/paid calls and query limits stay intact.
    explicitSynthesisReview = false;
    synthesisOnly = false;
  }
  if (!workOrderOnly && !synthesisOnly && refreshRosterTeachPartialEvidenceSynthesisV1(state)) await checkpoint();
  async function ask(kind, nodes, instruction, semantic = () => {}, options = {}) {
    if (kind === 'teach_framework_investigate'
      && nodes.some(node=>node.kind==='current_query_capability_guide'
        && node.conditionalActions?.firstRoundInitialization?.sourceEligible)) {
      instruction = instruction.replace('Phase is movement/assault/combat, NOT setup;',
        'For a complete conditional arrival sequence, firstRoundInitialization explicitly supports start_of_round on the pristine source, followed by its Native initialization, first-actor choice and actual deploy/move successors. For a static conditional scene use movement/assault/combat, NOT setup;');
    }
    if (kind === 'teach_framework_investigate' && rosterTeachInvestigationWindowV1(state).progress) {
      instruction = instruction.replace('Three normal batches, plus only one explicitly authorized supplement after a concrete fix; no blind repetition.',
        'Continue dependent queries while actual new evidence or prerequisites advance these questions; there is no task-wide three-batch cap. Reusing an identical result or renaming queries is not progress. Return no queries once evidence is sufficient or a real tool gap prevents progress; preserve unresolved claims for Plan/roster revision, not fabricated answers. Two batches without new evidence return control to synthesis.');
    }
    const contract = kind === "teach_framework_synthesis"
      ? synthesisContractForAgenda(state.agenda)
      : options.investigationQuestionIds ? rosterTeachInvestigationContractV1(options.investigationQuestionIds)
      : typeof options.candidateParametersAvailable==='boolean' ? rosterTeachRecoveryContractV1(kind, options.candidateParametersAvailable) : contracts[kind];
    const projectPrompt = (nodes, archive) => ['teach_framework_revision_work_order', 'teach_framework_revision_work_choices', 'teach_framework_synthesis_step', 'teach_framework_citation_patch', 'teach_framework_citation_delta'].includes(kind) ? clone(nodes)
      : projectRosterTeachRolePromptV1(kind, nodes, archive, { factProbe: options.factProbe === true });
    const contextFor = promptNodes => hash({ kind, sourceHash, promptNodes, instruction,
      ...(kind === "teach_framework_synthesis"
        ? { answerCoverageContract: outputContractRefStarcraftTmgV1(contract) } : {}),
      ...(typeof options.candidateParametersAvailable==='boolean'
        ? { currentRecoveryContract: outputContractRefStarcraftTmgV1(contract) } : {}),
      ...(options.investigationQuestionIds
        ? { currentInvestigationContract: outputContractRefStarcraftTmgV1(contract) } : {}) });
    const baseContextHash = contextFor(projectPrompt(nodes, evidenceArchive));
    const checkedOutput = output => {
      const inspected = inspectRosterTeachPublicOutputV1(contract, output);
      const check = inspected.validation;
      if (inspected.normalization) {
        state.replyNormalizations ||= [];
        const receipt = { kind, baseContextHash, ...inspected.normalization };
        if (!state.replyNormalizations.some(row => hash(row) === hash(receipt))) {
          state.replyNormalizations.push(receipt);
        }
      }
      output = inspected.value;
      // Name missing agenda answers before reporting generic schema failure.
      if (kind === "teach_framework_synthesis") verifySynthesisCoverage(output, state.agenda);
      if (!check.ok) fail("ROSTER_TEACH_FRAMEWORK_OUTPUT_INVALID", JSON.stringify(check));
      const { schemaVersion, roundKind, ...rawValue } = output;
      let value=rawValue;
      if(kind==='teach_framework_investigate') {
        validateRosterTeachProgressRepairRetentionV1(value,(state.replyCorrections||[])
          .filter(row=>row.kind===kind&&row.baseContextHash===baseContextHash)
          .map(row=>row.correction?.previousOutput).filter(Boolean));
        const derived=deriveRosterTeachQuestionProgressV1(value);
        value=derived.output;
        if(derived.corrections.length) {
          const sourceOutputHash=hash(rawValue);
          state.derivedQuestionProgress ||= [];
          if(!state.derivedQuestionProgress.some(row=>row.sourceOutputHash===sourceOutputHash)) {
            state.derivedQuestionProgress.push({baseContextHash,sourceOutputHash,
              corrections:derived.corrections,originalPaidOutputUnchanged:true,
              unresolvedPredicatesUnchanged:true,planAccepted:false});
          }
        }
      }
      semantic(value);
      return clone(value);
    };
    const correctionFor = (error, output) => {
      const code = error.code || String(error.message);
      return { code,
        detail: String(error.message || "").startsWith(`${code}:`)
          ? String(error.message).slice(code.length + 1) : String(error.message || code),
        previousOutput: clone(output),
        instruction: "Correct this concrete inconsistency only, preserving valid content. Missing evidence remains unknown." };
    };
    // A crash after the paid reply was saved must not require another call.
    // Match the exact new prompt, not an older synthesis of different evidence.
    if (options.synthesisReview) {
      const saved = input.retainedPublicOutputs?.findLast(record => record.roundKind === kind
        && record.contextHash === baseContextHash && record.sanitizedOutput);
      if (saved) {
        try { return checkedOutput(saved.sanitizedOutput); }
        catch { /* Existing bounded feedback below retains the actual error. */ }
      }
    }
    state.replyCorrections ||= [];
    let pending = state.replyCorrections.findLast(r => r.kind === kind
      && r.baseContextHash === baseContextHash && r.status === "pending");
    // Legacy checkpoints kept only an error code. Recover the precise feedback
    // from the already-paid reply for this EXACT context, without a model call.
    // Different evidence/queries must never inherit an old correction.
    if (!pending) {
      const retained = input.retainedPublicOutputs?.findLast(r => r.roundKind === kind
        && r.contextHash === baseContextHash && r.sanitizedOutput);
      if (retained) {
        try { checkedOutput(retained.sanitizedOutput); }
        catch (error) {
          pending = { kind, baseContextHash, responseContextHash: baseContextHash,
            correction: correctionFor(error, retained.sanitizedOutput), status: "pending",
            recoveredFromRetainedOutput: true };
          state.replyCorrections.push(pending);
          await checkpoint();
        }
      }
    }
    if (pending) {
      const retained = revalidateRetainedRosterTeachReplyV1(pending, checkedOutput);
      if (retained.accepted) { await checkpoint(); return retained.value; }
      if (retained.error) {
        pending.correction = correctionFor(retained.error, pending.correction.previousOutput);
        await checkpoint();
      }
    }
    if (kind === 'teach_framework_synthesis' && (planRosterTeachSynthesisDeliveryV1(projectPrompt(nodes, evidenceArchive)).kind === 'evidence_reader'
      || input.retainedDispatches?.some(record => record.contextHash === baseContextHash
        && record.status === 'response_rejected' && record.rejection?.contextLengthExceeded === true))) {
      // Reuse an already paid COMPLETE answer first. Do not reroute an uncertain
      // in-flight request or turn auth/network rejection into a new purchase.
      const retained = input.retainedPublicOutputs?.findLast(record => record.roundKind === kind
        && record.contextHash === baseContextHash && record.sanitizedOutput);
      if (retained) {
        try { return checkedOutput(retained.sanitizedOutput); } catch { /* Read/correct saved evidence below. */ }
      }
      const outstanding = input.retainedDispatches?.filter(record => record.contextHash === baseContextHash
        && !input.retainedPublicOutputs?.some(output => output.dispatchRequestId === record.requestId)) || [];
      if (outstanding.some(record => ['ambiguous', 'reserved', 'sent', 'sending'].includes(record.status))) {
        fail('ROSTER_TEACH_SYNTHESIS_DISPATCH_RECONCILIATION_REQUIRED');
      }
      if (outstanding.some(record => record.status === 'response_rejected' && record.rejection?.contextLengthExceeded !== true)) {
        fail('ROSTER_WORKSPACE_PROVIDER_RESPONSE_REJECTED');
      }
      fail('ROSTER_TEACH_SYNTHESIS_READER_REQUIRED');
    }
    let correction = pending?.correction || null;
    state.incompleteQueryRecoveries ||= [];
    let completionRecovery = state.incompleteQueryRecoveries.find(r => r.kind === kind && r.baseContextHash === baseContextHash);
    if (!completionRecovery) {
      completionRecovery = rosterTeachIncompleteQueryRecoveryV1({ kind, baseContextHash,
        records: input.retainedIncompleteQueryOutputs });
      if (completionRecovery) { state.incompleteQueryRecoveries.push(completionRecovery); await checkpoint(); }
    }
    if (completionRecovery?.status === 'exhausted') fail('ROSTER_TEACH_INCOMPLETE_QUERY_RECOVERY_EXHAUSTED');
    // An explicitly resumed exhausted phase gets one additional attempt,
    // not another hidden three-round cycle. The workspace owns authorization.
    let attemptLimit = rosterTeachReplyAttemptLimitV1({state,kind,baseContextHash,maxAttempts:options.maxAttempts,pending});
    // No retry of transport errors here. Only completed, parseable paid
    // responses with concrete contract errors enter this bounded repair lane.
    for (let attempt = 0; attempt < attemptLimit; attempt++) {
      const promptNodes = projectPrompt(
        [...nodes, ...(correction ? [{ kind: "repair_completed_public_reply", ...correction }] : []),
          ...(completionRecovery ? [{ kind: 'complete_truncated_readonly_query',
            originalContextHash: baseContextHash, instruction: completionRecovery.instruction,
            partialArgumentsAccepted: false }] : [])], evidenceArchive);
      const contextHash = contextFor(promptNodes);
      const request = { sessionId, roundKind: kind, roundIndex: 1 + attempt,
        promptPack: options.factProbe ? ROSTER_TEACH_FACT_PROBE_VERSION : ROSTER_TEACH_FRAMEWORK_VERSION,
        promptNodes, userMessage: instruction,
        responseContract: { allowedChannels: ["roster_strategy"], publicEvidenceOnly: true,
          rulesRemainSoleLegalityAuthority: true },
        responseFormat: { kind: "provider_strict_json_schema", schemaName: contract.schemaName,
          outputContractRef: outputContractRefStarcraftTmgV1(contract), schema: contract.providerSchema }, contextHash };
      if (completionRecovery?.status === 'pending') {
        completionRecovery.status = 'retrying';
        await checkpoint(); // Durable before the one controlled completion request.
      }
      let result;
      if (options.synthesisReview && state.calls.slice(options.synthesisReview.baselineCallCount)
        .filter(call => ['teach_framework_synthesis', 'teach_framework_synthesis_step', 'teach_framework_citation_patch', 'teach_framework_citation_delta'].includes(call.kind))
        .length >= (options.synthesisReview.maximumProviderCalls || 1)) {
        fail('ROSTER_TEACH_SYNTHESIS_REVIEW_CALL_LIMIT');
      }
      const preparedCall = prepareRosterTeachModelCallV1({state,request,sourceHash,
        planHash:plan.planHash,retainedPublicOutputs:input.retainedPublicOutputs,
        retainedDispatches:input.retainedDispatches});
      await checkpoint(); // Exact pending request or bound completed reply is durable BEFORE egress.
      const executionContextHash = preparedCall.retained?.contextHash || preparedCall.request.contextHash;
      try {
        result = preparedCall.retained ? {output:clone(preparedCall.retained.sanitizedOutput),receipt:{
          providerKind:'framework_retained_completed_reply',contextHash:executionContextHash,
          outputHash:preparedCall.retained.outputHash,
          originalDispatchRequestId:preparedCall.retained.dispatchRequestId,
          outputContractRef:clone(preparedCall.retained.outputContractRef),
          paidProviderCall:false,providerCalls:0,originalPaidRecordPreserved:true,
        }} : await deliberation.deliberate(preparedCall.request);
      }
      catch (error) {
        if (error.code !== 'ROSTER_WORKSPACE_PROVIDER_OUTPUT_INCOMPLETE'
          || error.providerIncompleteReason !== 'max_output_tokens') throw error;
        if (completionRecovery) {
          completionRecovery.status = 'exhausted';
          delete state.pendingModelCall;
          await checkpoint();
          throw error;
        }
        completionRecovery = rosterTeachIncompleteQueryRecoveryV1({ kind, baseContextHash,
          records: [{ roundKind: kind, contextHash: baseContextHash,
            providerStatus: 'incomplete', providerIncompleteReason: 'max_output_tokens' }] });
        if (!completionRecovery) throw error;
        state.incompleteQueryRecoveries.push(completionRecovery);
        delete state.pendingModelCall; // This exact dispatch definitively returned incomplete, not unknown.
        attemptLimit = Math.max(attemptLimit, attempt + 2);
        await checkpoint();
        continue;
      }
      if (completionRecovery) completionRecovery.status = 'completed';
      state.calls.push({ kind, contextHash:executionContextHash, receipt: clone(result.receipt || null) });
      delete state.pendingModelCall;
      // The caller checkpoints its applied agenda/round/choice together with
      // this consumption. A crash before that commit replays the saved reply;
      // it must not mark a response consumed before applying its next state.
      try {
        const output = checkedOutput(result.output);
        if (pending) pending.status = "resolved";
        return output;
      } catch (error) {
        correction = correctionFor(error, result.output);
        if (pending) pending.status = "superseded";
        pending = { kind, baseContextHash, responseContextHash: contextHash,
          correction, status: "pending", recoveredFromRetainedOutput: false };
        state.replyCorrections.push(pending);
        state.repairs.push({ kind, baseContextHash,responseContextHash:executionContextHash,
          attempt: attempt + 1, code: correction.code });
        await checkpoint();
        if (attempt === attemptLimit - 1) throw error;
      }
    }
  }
  async function reconcileQuestionPremises() {
    const audit=prepareRosterTeachPremiseAuditV1({state,sourceReview:context.sourceReview,plan,previousInquiry:context.previousInquiry});
    if(!audit)return false;
    state.questionPremiseAudit={status:'running',request:clone(audit)};
    await checkpoint();
    const output=await ask(audit.version===2?'teach_framework_current_plan_premise_audit':'teach_framework_premise_audit',[
      {kind:'question_premise_audit',...audit,authority:'question_reframing_only_not_plan_or_strategy_approval'},
    ],audit.version===2
      ? 'Reconcile these QUESTIONS against the exact CURRENT Plan, before any new experiment. Previous questions and answers describe the previous Plan, not current defects. Inspect every question: if it alleges text, chronology or a capability claim that the current Plan has already changed, reframe it around the actual current claim, rather than repeating the old allegation or requesting its correction again. Bind each correction to an exact currentPlanEvidence path/quote or an applicable source qualification; premiseQuote must quote the old question verbatim. Preserve question IDs and legitimate strategic concerns, alternatives and material unresolved evidence gaps. A narrowed or conditional claim needs evaluation at its own scope, not proof of a different event. evidencePlan should first use current frozen facts and retained receipts; a prior failed query is not proof that a later successful result is absent. Corrected questions go to the shared investigator, never to their obsolete compulsory query. Do not decide the answers, approve strategy, change a Plan/army, erase unknowns, prescribe tactics or fabricate Rules. Return corrections only for stale or misframed premises; source qualifications, if any, refute only the associated reviewer allegation. This audit is not a new Plan review.'
      : 'Audit the QUESTIONS, not the Plan. The source qualifications support the quoted PLAN CLAIM and refute its reviewer allegation. Detect any question, assumed chronology, falsification test or evidencePlan that reintroduces that rejected allegation or changes the qualified claim into a different predicate. Reframe those questions neutrally using corrections; quote the exact offending question text and bind the applicable qualification finding index. Preserve question IDs, useful strategic concerns and valid alternatives. Do not demand proving a different event from the one actually proposed. Preserve conditional forecasts as conditional; do not certify they will happen. Do not change the roster, Plan, source verdict, query results or strategy; do not give answers or fabricate rules. Return no correction for unrelated questions. This is a narrow premise reconciliation, not a fresh broad review.',
      value=>validateRosterTeachPremiseAuditV1({state,audit,output:value}));
    const changed=applyRosterTeachPremiseAuditV1({state,audit,output});
    await checkpoint();
    return changed;
  }
  async function synthesizeSavedEvidence(toolContext, review = null) {
    // Resume an in-flight audit before constructing its dependent reader view.
    // An older paid synthesis reply is consumed first below, never displaced.
    if(state.questionPremiseAudit?.status==='running')await reconcileQuestionPremises();
    const evidence = [...state.evidence, ...(state.investigation?.evidence || []),
      ...(state.queryRecovery?.operations.filter(operation => operation.result).map(operation => operation.result) || [])];
    // Sidecar availability changes no frozen source, paid archive or saved answer.
    // Historical bodies are readable before being cited; current originals win.
    const historicalEvidence = input.historicalEvidence;
    const bindingSource = historicalEvidence?.originals.size
      ? [[...historicalEvidence.originals.values()], input.context] : input.context;
    const priorRaw = state.synthesisRaw || state.synthesisHistory?.at(-1)?.raw;
    const citationIssues = priorRaw ? qualifyRosterTeachFrameworkSynthesisV1({
      synthesis: priorRaw, evidence, sourceEvidence: input.context,
    }).answers.flatMap(answer => [...answer.quantitativeEvidence, ...answer.qualitativeEvidence].filter(item => item.pathRepair)
      .map(item => ({ questionId: answer.questionId, receiptRef: item.receiptRef,
        path: item.path, interpretation: item.interpretation, pathRepair: item.pathRepair }))) : [];
    state.phase = 'synthesize';
    await checkpoint();
    const nodes = [
      projectRosterTeachDecisionScopeV1(context),
      projectRosterTeachCapabilityGuideV1(toolContext, context),
      { kind: 'evidence_precedence',
        instruction: 'Old failures remain evidence about their original request, not a veto on a later successful replacement. Use queryRecoveryOf and current receipts to distinguish repaired execution from remaining strategic coverage. Do not repeat an old tool-unavailable claim contradicted by current contracts or successful results. A comparison does not have to choose a winner: strategic ranking belongs to you, while unsupported factual claims stay unknown.' },
      { kind: 'current_plan_and_context', plan, context },
      { kind: 'framework_and_questions', framework: state.framework, agenda: state.agenda },
      { kind: 'actual_tool_results', evidence,
        investigation: projectRosterTeachInvestigationHistoryV1(state),
        // Recovery can change a query's phase, scene or predicate. Its result
        // is not interpretable from the original failed request alone.
        queryRecovery: { operations: state.queryRecovery?.operations || [] } },
      ...(citationIssues.length ? [{ kind: 'numeric_citation_repair_context', issues: citationIssues,
        instruction: 'These are reference errors in an older paid answer, not failed Rules executions. Correct only the relevant citations using the same delivered receipt structure. They do not require re-running the investigation or borrowing a value from another scene.' }] : []),
    ];
    const instruction = 'Each submitted answer uses retain/revise/unresolved and cites only its delivered Native receipts or explicitly indexed source facts, retaining their declared scope; source facts are not execution receipts. The completed synthesis must cover every question; a readonly reader step does not need to resubmit answers already saved. Explain conditional comparisons, tradeoffs, risk and switch conditions. For quantitativeEvidence reference a number or canonical probability estimate in that receipt rather than inventing an estimate. Put exact string/boolean observations in qualitativeEvidence, not the numeric lane. Binding the value does not establish your interpretation beyond the cited scenario and prior state. Unknown is not zero, proof or veto. A model-owned risky strategy may stand with explicit assumptions. Propose Plan improvements; propose roster changes only when rosterEditAuthority allows. Feedback should identify useful/missed questions, wrong queries or strategy-suppression risks for later Teach Skill evolution. A pregame answer does not prove match success.';
    const verify = value => {
      verifySynthesisCoverage(value, state.agenda);
      if (context.rosterEditAuthority === 'preset_immutable' && value.proposedRosterChanges.length) {
        fail('ROSTER_TEACH_FRAMEWORK_PRESET_ROSTER_IMMUTABLE');
      }
    };
    const readAndSynthesize = async () => {
      const previouslyCorrectableCount = state.synthesisReader?.citationFeedback?.correctableFailures?.length || 0;
      let archive = createRosterTeachSynthesisArchiveV1(projectRosterTeachRolePromptV1('teach_framework_synthesis', nodes, evidenceArchive),
        { retainedEvidence: evidenceArchive, historicalEvidence });
      reconcileRosterTeachSynthesisReaderV1(archive, state,
        { readOnlyContinuation: !review && isRosterTeachReaderContinuationV1(state) });
      const refreshCitationFeedback = () => {
        state.synthesisReader.citationFeedback = inspectRosterTeachReaderCitationsV1({
          answers: state.synthesisReader.answers, evidence, sourceEvidence: bindingSource });
      };
      refreshCitationFeedback();
      if (state.synthesisReader.status === 'completed'
        && state.synthesisReader.citationFeedback.correctableFailures.length) {
        // Keep the paid finish and every read/answer; reopen only editing of its
        // malformed citations, with no investigation/allowance/history reset.
        state.synthesisReader.status = 'reading';
        state.synthesisReader.citationRepairReopened = true;
      }
      // Persist the one-step grant with the refreshed feedback, so a disconnect
      // between this checkpoint and ask cannot lose proof of the repaired stop.
      allowRosterTeachResolvedCitationHandoffV1({ reader: state.synthesisReader,
        previouslyCorrectableCount, questionIds: archive.questions.map(q => q.questionId) });
      await checkpoint();
      while (state.synthesisReader.status !== 'completed') {
        const concreteFixHandoff = state.synthesisReader.noProgressSteps >= 3;
        if (concreteFixHandoff && !allowRosterTeachResolvedCitationHandoffV1({ reader: state.synthesisReader,
          previouslyCorrectableCount, questionIds: archive.questions.map(q => q.questionId) })) fail('ROSTER_TEACH_SYNTHESIS_READER_NO_PROGRESS');
        const workspace = projectRosterTeachSynthesisReaderV1(archive, state.synthesisReader);
        const command = await ask(rosterTeachSynthesisStepKindV1(workspace[0],state.pendingModelCall?.kind), workspace,
          `${instruction} Select ONE next operation using readonly_synthesis_workspace.workflow. Read or save only the pending work; when nextAction=finish, submit finish with all arrays empty unless you found a specific new defect requiring a targeted correction. finish hands off the saved ledger, including unresolved gaps, to downstream review/revision; it is not final acceptance. Do not repeat an answer batch solely because this request includes answer-writing criteria. Keep unused arrays empty.`, value => {
            validateRosterTeachSynthesisReaderCommandV1(archive, state.synthesisReader, value);
            if (context.rosterEditAuthority === 'preset_immutable' && value.proposedRosterChanges.length) {
              fail('ROSTER_TEACH_FRAMEWORK_PRESET_ROSTER_IMMUTABLE');
            }
          }, { ...(review ? { maxAttempts: 1, synthesisReview: review } : {}),
            ...(concreteFixHandoff ? { maxAttempts: 1 } : {}) });
        applyRosterTeachSynthesisReaderCommandV1(archive, state.synthesisReader, command);
        if(await reconcileQuestionPremises()){
          archive=createRosterTeachSynthesisArchiveV1(projectRosterTeachRolePromptV1('teach_framework_synthesis',nodes,evidenceArchive),
            {retainedEvidence:evidenceArchive,historicalEvidence});
          reconcileRosterTeachSynthesisReaderV1(archive,state,{readOnlyContinuation:true});
        }
        if (['answer', 'repair_citations'].includes(command.action)) refreshCitationFeedback();
        await checkpoint();
      }
      const proposalRequest=prepareRosterTeachProposalConsolidationV1(state.synthesisReader);
      if(proposalRequest){
        state.synthesisReader.proposalConsolidation={status:'running',inputHash:proposalRequest.inputHash,request:proposalRequest};
        await checkpoint();
        const proposals=await ask('teach_framework_proposal_consolidation',[
          projectRosterTeachDecisionScopeV1(context),
          {kind:'complete_saved_conclusion_handoff',...proposalRequest},
        ],proposalRequest.instruction,value=>{
          validateRosterTeachProposalConsolidationV1(state.synthesisReader,proposalRequest,value);
          if(context.rosterEditAuthority==='preset_immutable'&&value.proposedRosterChanges.length)
            fail('ROSTER_TEACH_FRAMEWORK_PRESET_ROSTER_IMMUTABLE');
        });
        applyRosterTeachProposalConsolidationV1(state.synthesisReader,proposalRequest,proposals);
        await checkpoint();
      }
      const assembled = assembleRosterTeachSynthesisReaderV1(state.synthesisReader);
      verify(assembled);
      return assembled;
    };
    let raw;
    if ((state.synthesisReader && state.synthesisReader.status !== 'superseded')
      || historicalEvidence?.originals.size) raw = await readAndSynthesize();
    else {
      try { raw = await ask('teach_framework_synthesis', nodes, instruction, verify,
        review ? { maxAttempts: 1, synthesisReview: review } : {}); }
      catch (error) {
        if (error.code !== 'ROSTER_TEACH_SYNTHESIS_READER_REQUIRED'
          && !(error.code === 'ROSTER_WORKSPACE_PROVIDER_RESPONSE_REJECTED' && error.providerRejection?.contextLengthExceeded === true)) throw error;
        raw = await readAndSynthesize();
      }
    }
    const synthesis = qualifyRosterTeachFrameworkSynthesisV1({ synthesis: raw,
      evidence, sourceEvidence: bindingSource });
    if (review) {
      state.synthesisHistory ||= [];
      state.synthesisHistory.push({ synthesis: state.synthesis, raw: state.synthesisRaw,
        reason: review.reason, preservedBeforeExplicitReview: true });
    }
    state.synthesisRaw = raw;
    state.synthesis = synthesis;
    retainRosterTeachCitedHistoryV1(state, historicalEvidence, raw);
    state.evidenceBindingVersion = ROSTER_TEACH_EVIDENCE_BINDING_VERSION;
    if (review) review.status = 'completed';
    await checkpoint();
  }
  async function prepareRevisionWork() {
    const assignment = prepareRosterTeachRevisionWorkOrderV1({plan,state,
      rosterEditAuthority:context.rosterEditAuthority});
    if (!assignment) return;
    state.phase = 'revision_work_order';
    await checkpoint();
    const output = await ask('teach_framework_revision_work_choices', [projectRosterTeachRevisionChoicesV2(assignment)],
      'Assign the smallest necessary work for each completed Teach question. Select questionNumber and claimNumbers from the supplied tables. '
      + 'This is routing, not another fact investigation or final strategic acceptance. Use the existing conclusions and '
      + 'proposals; preserve unresolved evidence explicitly. Army changes go to the selecting owner, never the text editor. '
      + 'Retain valid conditional arguments when criticism does not justify a change. No assumptions about omitted evidence.',
      value => buildRosterTeachRevisionWorkOrderV1(assignment,decodeRosterTeachRevisionChoicesV2(assignment,value)));
    state.revisionWorkOrder = buildRosterTeachRevisionWorkOrderV1(assignment,decodeRosterTeachRevisionChoicesV2(assignment,output));
    await checkpoint();
  }
  if (workOrderOnly) {
    if (!state.investigation?.completed || !state.synthesis?.answers)
      fail('ROSTER_TEACH_WORK_ORDER_SOURCE_INCOMPLETE');
    await prepareRevisionWork();
    state.phase='completed';
    await checkpoint();
    return clone(state); // Never re-execute queries or re-synthesise saved answers.
  }
  async function finishSession() {
    if (state.synthesis?.answers?.some(answer=>answer.disposition==='revise')) await prepareRevisionWork();
    state.phase = 'completed';
    state.coverage = state.agenda.coverage.map(c => ({ ...c,
      questionIds: state.agenda.questions.filter(q => q.axisIds.includes(c.axisId)).map(q => q.questionId),
      unresolvedQuestionIds: state.agenda.questions.filter(q => q.axisIds.includes(c.axisId)
        && state.synthesis.answers.some(a => a.questionId === q.questionId && a.disposition === 'unresolved'))
        .map(q => q.questionId) }));
    state.mutationZeroProof = laboratory.proveMutationZero();
    state.applicationStatus = 'proposed_not_applied';
    state.experienceType = 'pregame_teach';
    state.authority = clone(ROSTER_TEACH_AUTHORITY_V1);
    await checkpoint();
    return clone(state);
  }
  if (synthesisOnly) {
    verifyRosterTeachFrameworkV1(state.framework);
    const review = explicitSynthesisReview ? state.synthesisReview : null;
    if (review) {
      review.status = 'running';
      await checkpoint();
    }
    // Ordinary saved-reader continuation is not a new investigation/review.
    // Keep the original source check above, and the exact archive/ledger below.
    // Incomplete or explicitly reopened evidence work cannot enter this path.
    await synthesizeSavedEvidence(context.queryContext, review);
    return finishSession();
  }
  if (!state.framework) {
    state.phase = "learn_framework";
    await checkpoint();
    const content = await ask("teach_framework_learn", [
      projectRosterTeachDecisionScopeV1(context),
      { kind: "methodology_learning_brief", principles: ROSTER_TEACH_FRAMEWORK_LEARNING_BRIEF_V1 },
      { kind: "frozen_rules_skills_and_tool_context", context },
    ], "Compile a reusable game-scoped Teach questioning Skill. Return one method for each of the eight axes. Methods ask how to establish evidence, not which unit or tactic must win. No rule/evaluator changes.",
    value => createRosterTeachFrameworkV1({ content: value, sourceRefs: [sourceHash] }));
    state.framework = createRosterTeachFrameworkV1({ content, sourceRefs: [sourceHash] });
    await checkpoint();
  }
  verifyRosterTeachFrameworkV1(state.framework);
  if (!state.agenda) {
    state.phase = "question_agenda";
    await checkpoint();
    // A pre-upgrade paid agenda must finish against its original contract and
    // prompt. New production does not force every question to invent a query.
    const legacyAgendaPending = (state.pendingModelCall?.kind==='teach_framework_agenda'
        && state.pendingModelCall.planHash===plan.planHash)
      || input.retainedDispatches?.some(row => row.roundKind==='teach_framework_agenda' && row.planHash===plan.planHash);
    if (legacyAgendaPending) {
    state.agenda = await ask("teach_framework_agenda", [
      projectRosterTeachDecisionScopeV1(context),
      { kind: "teach_framework_skill", skill: state.framework },
      { kind: "current_plan_and_frozen_context", plan, context },
    ], "Instantiate this framework for the whole Plan. Cover every axis explicitly as questioned, deferred or not_applicable with reasons; never claim four questions cover all concerns by default. Ask evidence-bearing, falsifiable questions and use exactly the delivered tool IDs. Pair alternatives under the same scenario where meaningful. Query probability only for exact legal ranged attackers/targets/domains. Reserves need an explicit hypothetical scenario with legal placements, phase and follow-ups; it is NOT a proven arrival sequence. Use empty branchIdRef for the source; do not invent branches. Math inputs are assumptions, not Rules evidence. Keep every question's scenario assumptions and possible disconfirmation. It is acceptable to defer an unsupported calculation honestly.", verifyAgenda);
    } else {
      state.agenda = await ask('teach_framework_questions', [
        projectRosterTeachDecisionScopeV1(context),
        {kind:'teach_framework_skill',skill:state.framework},
        {kind:'current_plan_and_frozen_context',plan,context},
      ], 'Instantiate falsifiable questions for the whole Plan and cover every axis. Separate the question from tool selection: evidencePlan names the exact predicate to establish and whether delivered frozen rules, arithmetic, retained receipts or a new conditional experiment can answer it. Do not invent an initial query just to satisfy a question. The following investigator selects tools and binds their actual results. Reuse settled source qualifications and existing evidence; do not repeat rejected reviewer premises. Distinguish source facts, hypothetical assumptions and model strategic judgments. Preserve justified risky choices. A conditional opponent action need not be proved to occur; its legal and geometric feasibility still needs evidence.', verifyAgenda);
    }
    await checkpoint();
  }
  const reviewHandoff = pendingRosterTeachReviewHandoffV1({state,context,plan,
    sourceReview:input.currentSourceReview});
  if (reviewHandoff) {
    const correctedAgenda = reviewHandoff.agendaRevisionRequired
      ? await ask('teach_framework_questions', [
        projectRosterTeachDecisionScopeV1(context),
        {kind:'retained_agenda_before_source_qualification',agenda:state.agenda},
        {kind:'completed_source_review_qualification',sourceReview:reviewHandoff.sourceReview},
        {kind:'current_plan_and_frozen_context',plan,context:{...context,sourceReview:reviewHandoff.sourceReview}},
      ], 'Repair this saved agenda using the completed source qualifications that were previously omitted. Do not repeat a rejected reviewer rationale as a fact: conditional future events do not require proof they WILL happen. Preserve valid question IDs, coverage and strategic alternatives; revise or remove questions whose premise the qualification refutes. Replace mandatory initial tool requests with evidencePlan: describe the exact predicate and relevant frozen rules/retained evidence or conditional experiment. Do not select a marker-control tool to answer ability targeting, or a VP schedule to answer Supply arithmetic. The next investigator chooses actual tools only after reading sources; do not fabricate query results. Do not edit the Plan. Return the complete corrected questions; the original paid agenda and all calls remain saved.', verifyAgenda)
      : null;
    commitRosterTeachReviewHandoffV1(state,reviewHandoff,correctedAgenda);
    context.sourceReview = clone(reviewHandoff.sourceReview);
    await checkpoint();
  }
  if (attachRosterGenerationQueryIssuesV1(state, context.generationQueryOutcomes)) {
    await checkpoint();
  }
  await reconcileQuestionPremises();
  // Plan-only revisions may keep an identical question in the same frozen army
  // and source. Reuse that original receipt, never re-label it or claim a new
  // execution. A changed claim, assumption, request, source or question ID does
  // not enter this fast path. Other retained evidence remains contextual only.
  if (state.reusableQuestionEvidence) {
    const previous = state.reusableQuestionEvidence;
    const source = context.queryContext?.sourceStateHash;
    for (const question of state.agenda.questions) {
      if (state.evidence.some(e => e.challengeId === question.questionId)) continue;
      const old = previous.questions.find(q => q.questionId === question.questionId && hash(q) === hash(question));
      const receipt = old && previous.evidence.find(e => e.challengeId === question.questionId);
      if (!receipt || !source || receipt.sourceReceipt?.sourceStateHash !== source
        || !assessRosterTeachEvidenceReadinessV1(receipt).usableForClaim) continue;
      state.evidence.push(clone(receipt));
      state.evidenceReuse ||= [];
      state.evidenceReuse.push({ questionId: question.questionId, receiptHash: receipt.receiptHash,
        sourcePlanHash: previous.sourcePlanHash, originalScopePreserved: true, newExecutions: 0 });
    }
    delete state.reusableQuestionEvidence;
    await checkpoint();
  }
  // Dependencies are restored lazily by the evidence port, including partial
  // failed layouts. Completed queries and their follow-ups are never re-run.
  state.phase = "read_only_queries";
  await checkpoint();
  for (const question of state.agenda.questions) {
    if (!question.evidenceRequest) continue; // New questions are resolved by the shared investigator, not a compulsory guessed tool.
    // Rebuild hypothetical branches from their saved request when restarting;
    // completed evidence itself is immutable and needs no new model call.
    if (state.evidence.some(e => e.challengeId === question.questionId)) {
      // Saved successful AND partially failed branches are restored lazily on
      // use. Replaying every historical scenario here re-solves geometry and
      // re-executes follow-ups even though its paid evidence already exists.
      continue;
    }
    let request = question.evidenceRequest;
    let receipt;
    // Initial questions execute once. Semantic/scene repairs belong to the
    // following shared investigation, which sees ALL results and prerequisites.
    for (let attempt = 0; attempt < 1; attempt++) {
      receipt = await evidencePort.query({ mutationAuthority: false,
        initialFoundationHash: hash(plan), sourceHashes: [sourceHash],
        challengeId: question.questionId, request });
    }
    state.evidence.push(receipt);
    await checkpoint();
  }
  // A query can be syntactically correct yet answer the wrong question. Give
  // the investigator actual results and branch action spaces, not one-shot
  // agenda guesses. Persist each operation before moving to the next one.
  state.investigation ||= { version: 1, rounds: [], evidence: [], operations: [] };
  const investigation = state.investigation;
  const initialInvestigationRoundCount = investigation.rounds.length;
  const investigationEvidenceCountBeforeRun = investigation.evidence.length;
  const currentToolContext = () => evidencePort.describeQueryContext();
  async function beginRecoveryReplan() {
    const handoff = rosterTeachInvestigationWindowV1(state).recoveryReplan;
    if (!handoff) return false;
    investigation.recoveryReplanHistory ||= [];
    investigation.recoveryReplanHistory.push(clone(handoff));
    investigation.recoveryReplanContinuation = clone(handoff);
    investigation.completed = false;
    await checkpoint();
    return true;
  }
  async function investigateEvidence() {
  if (!investigation.completed) {
    state.phase = "investigate_evidence";
    await checkpoint();
    const window = rosterTeachInvestigationWindowV1(state);
    const dynamicProgress = Boolean(window.progress);
    for (let roundIndex = 0; roundIndex < rosterTeachInvestigationWindowV1(state).limit; roundIndex++) {
      let round = investigation.rounds[roundIndex];
      if (!round) {
        const focusIds = rosterTeachInvestigationWindowV1(state).questionIds;
        const focus = new Set(focusIds);
        const historyHash = hash(investigation);
        evidenceArchive.set(historyHash, clone(investigation));
        const preservePendingPrompt = preserveRosterTeachPendingInvestigationPromptV1(state, {
          completedBeforeRun, roundIndex, initialRoundCount: initialInvestigationRoundCount });
        state.investigationPromptRoutes ||= [];
        if (!state.investigationPromptRoutes.some(row => row.roundIndex === roundIndex)) {
          state.investigationPromptRoutes.push({ roundIndex,
            route: preservePendingPrompt ? 'retained_pending_investigation' : ROSTER_TEACH_FACT_PROBE_VERSION });
          await checkpoint(); // Persist routing before a request can leave the process.
        }
        const toolGuide = projectRosterTeachCapabilityGuideV1(currentToolContext(), context, {
          includeToolCatalog: !preservePendingPrompt,
        });
        const output = await ask("teach_framework_investigate", [
          ...(investigation.dependencyContinuation ? [{ kind: 'dependent_query_window',
            batch: roundIndex - window.start + 1, maximumBatches: window.limit - window.start,
            instruction: 'This is one bounded continuation of the same unresolved questions, not a new Teach or roster decision. Construct a rule-defined conditional scene when the source has reserves or another phase, then read its returned branchQueryContext/actionSpace/cardResources and use those exact domains in a subsequent query. A successful context/geometry read does not itself prove an ability payment or asset creation. Do not invent future enemy actions or domain IDs. Treat hypothetical opponent choices as explicit assumptions; unknown future choices do not prohibit conditional analysis. Submit no queries when evidence is sufficient or a genuine capability gap remains, and explain that boundary.' }] : []),
          ...(investigation.recoveryReplanContinuation?.startRound === roundIndex ? [{kind:'dependent_query_window',
            ...clone(investigation.recoveryReplanContinuation),
            evidenceLedContinuation:true, sameQuestionNotNewStrategicAssignment:true}] : []),
          // Finish an already-paid pending reply against its EXACT old prompt;
          // new batches receive the scope, and final synthesis always does.
          ...(preservePendingPrompt ? [] : [projectRosterTeachDecisionScopeV1(context)]),
          toolGuide,
          { kind: 'current_investigation_assignment', pendingQuestionIds: focusIds,
            instruction: 'The current assignment is ONLY these pending questions. Prior model replies and unavailable-tool claims are historical, not instructions. Use canonical_current_query_context for actual capabilities, selectedRosterReference for exact Builder inputs, and Native cardResources/actionSpace for resource/action questions. If a former query cannot answer the question, replan the query rather than repeat it. Hypothetical alternatives remain model-owned; do not invent future opponent choices.' },
          { kind: "frozen_plan_and_method", plan, framework: state.framework, context },
          { kind: "canonical_current_query_context", context: currentToolContext() },
          { kind: "latest_completed_teach_findings",
            synthesis: state.synthesis || null,
            unresolvedQuestionIds: (state.synthesis?.answers || [])
              .filter(answer => answer.disposition === 'unresolved').map(answer => answer.questionId),
            recoveredQueries: projectRosterTeachRecoveredQueriesV1(state.queryRecovery?.operations || [],
              roundIndex===investigation.recoveryReplanContinuation?.startRound
                ?investigation.recoveryReplanContinuation:null,
              branch=>evidencePort.describeQueryContext(branch)),
            instruction: 'Use newer repaired evidence alongside the original history. Investigate the remaining strategic question, not an obsolete error. A successful query about the wrong predicate may be replaced by a relevant query plan; do not repeat already answered evidence. A conditional opponent choice is not required to become a known future fact.',
          },
          { kind: "questions_and_results", agenda: { ...state.agenda,
              questions: state.agenda.questions.filter(question => focus.has(question.questionId)) },
            evidence: state.evidence.filter(e => focus.has(e.questionId || e.challengeId))
              .map(e => ({ ...e, readiness: assessRosterTeachEvidenceReadinessV1(e) })),
            investigation: { completedRoundCount: investigation.rounds.filter(r => r.completed).length,
              latestCompletedBatch: investigation.rounds.findLast(r=>r.completed)?.output || null,
              latestCompletedQueryIds: investigation.rounds.findLast(r => r.completed)?.output.queries.map(q => q.queryId) || [],
              evidence: investigation.evidence.filter(e => focus.has(e.questionId)),
              operations: investigation.operations.filter(op => focus.has(op.questionId)),
              supplement: investigation.supplement,
              fullHistory: { evidenceObjectHash: historyHash,
                retrieval: { kind: 'retained_evidence', toolRequestJson: JSON.stringify({ receiptHash: historyHash, path: '' }) },
                allPriorRepliesAndEvidencePreserved: true, priorModelRepliesAreNotCurrentInstructions: true } } },
        ], "Investigate unanswered evidence, preserving the strategic questions. This is conditional pregame analysis, not a prediction that the opponent WILL occupy a position; hypothetical future-round units may be placed even though currently in reserves. Use actual availableUnits[].unitId as placement pieceId, NEVER a modelId. Phase is movement/assault/combat, NOT setup; native ranged queries require an assault scene. Put BOTH attacker and defender in the SAME scenario. A pure weapon/casualty comparison MAY explicitly use clearTerrain:true to isolate the variable, but cannot establish map routes, LOS in terrain or marker control; keep terrain for those claims. State the equal-range/formation assumptions and compare alternatives without inventing results. scenario takes {spec:{kind:'hypothetical_geometry',phase,activeSideKey,isolateToPlacedPieces,clearTerrain,placements:[{pieceId,xInches,yInches,modelSpreadInches?}]},followUps:[{kind:'threat_exchange',seatKey,subjectUnitIds,targetIds,sampleBudget:36}]}; Default formation uses the shared terrain-aware solver around the exact selected first-model anchor, following queryContext.scenarioConstruction; modelSpreadInches is preferred spacing, not a rigid grid. Explicit per-model positions are preserved. A bounded placement failure is not proof the anchor is impossible. Threat exchange selects native available ranged domains without inventing domain IDs. probability instead needs exact attackerUnitId,targetUnitId and domainId if multiple weapons. Inspect {branchIdRef} only gives context, not strategic proof; later queries use a previous scenario queryId as branchIdRef. ToolRequestJson contains ONLY actual arguments. For roster cost, upgrade and slot comparisons use current_query_capability_guide.builderComparison with exact selectedRosterReference and model-chosen alternatives; budget_fit is not that tool. No repeated unchanged failed requests: they only return the original error. Query supported parts, identify genuine residual limitations, and do not make uncertainty a strategy veto. Three normal batches, plus only one explicitly authorized supplement after a concrete fix; no blind repetition.", value => {
          // Within-batch duplicates remain ambiguous. Cross-round labels are
          // bound below instead of asking the model to regenerate valid work.
          const ids = new Set();
          const deliveredIds = new Set(investigation.rounds.length > window.start
            ? investigation.rounds.findLast(r => r.completed)?.output.queries.map(q => q.queryId) || []
            : investigation.recoveryReplanContinuation?.startRound===roundIndex
              ? investigation.recoveryReplanContinuation.repairedQueries?.map(q=>q.queryId)||[] : []);
          validateRosterTeachInvestigationProgressV1(value, state, focusIds, evidencePort.descriptor().descriptorHash,
            [...investigation.evidence,...(state.queryRecovery?.operations||[]).map(op=>op.result).filter(Boolean)]
              .filter(row => deliveredIds.has(row.challengeId)));
          for (const q of value.queries) {
            if (!state.agenda.questions.some(question => question.questionId === q.questionId)
              || !/^[a-zA-Z0-9_-]{1,120}$/u.test(q.queryId) || ids.has(q.queryId)) {
              fail("ROSTER_TEACH_INVESTIGATION_QUERY_ID_INVALID", q.queryId);
            }
            ids.add(q.queryId);
            const decoded = decodeRosterTeachInvestigationQueryV1(q);
            if (decoded.error) continue; // Per-tool unknown below, not whole-batch format retry.
            const args = decoded.request.toolRequest;
            const prepared = prepareRosterTeachQueryDispatchV1({ kind: q.kind, toolRequest: args });
            if (prepared.error) continue;
            const dispatched = prepared.request;
            if (dispatched.kind === 'inspect') validateRosterTeachInspectionRequestV1(dispatched.toolRequest);
          }
        }, { investigationQuestionIds: focusIds, factProbe: !preservePendingPrompt });
        round = bindInvestigationQueryIds(output, investigation.operations, roundIndex, sourceHash);
        round.capabilityGuideVersion = ROSTER_TEACH_CAPABILITY_GUIDE_VERSION;
        round.toolCatalogVersion = toolGuide.toolSurfaceCatalog?.version || 0;
        round.promptRoute = preservePendingPrompt ? 'retained_pending_investigation'
          : ROSTER_TEACH_FACT_PROBE_VERSION;
        investigation.rounds.push(round);
        await checkpoint();
      }
      if (round.completed) continue;
      for (const query of round.output.queries) {
        if (investigation.operations.some(op => op.queryId === query.queryId && op.completed)) continue;
        const decoded = decodeRosterTeachInvestigationQueryV1(query);
        const requestedRequest = decoded.request;
        let request = requestedRequest, dispatchNormalization;
        let result;
        try {
          if (decoded.error) throw Object.assign(Error(decoded.error.detail), { code: decoded.error.code });
          const normalized = normalizeRosterTeachQueryDispatchV1(requestedRequest);
          request = normalized.request; dispatchNormalization = normalized.normalization;
          const equivalent = investigation.operations.findLast(op => hash(op.request) === hash(request));
          const earlier = equivalent && investigation.evidence.find(e => e.challengeId === equivalent.queryId);
          // A failed request under a different tool contract is not a cached
          // verdict on the repaired tool. Re-execute only when requested by
          // the investigator; retain all old evidence and already-paid output.
          const evidencePortDescriptorHash = evidencePort.descriptor().descriptorHash;
          const cached = reuseRosterTeachReadOnlyEvidenceV1({ earlier, request,
            queryId: query.queryId, questionId: query.questionId, currentDescriptorHash: evidencePortDescriptorHash })
            || reuseRosterTeachFailedQueryEvidenceV1({ earlier, previousRequest: equivalent?.request,
              request, queryId: query.queryId, questionId: query.questionId,
              currentDescriptorHash: evidencePortDescriptorHash });
          if (cached) {
            if (request.kind === 'scenario' && cached.sourceReceipt?.branchStateHash) {
              evidencePort.reuseScenarioBranch({ request, receipt: cached,
                sourceChallengeId: equivalent.queryId });
            }
            result = cached;
          } else if (request.kind === "inspect") {
            validateRosterTeachInspectionRequestV1(request.toolRequest);
            result = { challengeId: query.queryId, questionId: query.questionId, status: "advisory",
              queryContext: evidencePort.describeQueryContext(request.toolRequest.branchIdRef || ""),
              purpose: query.purpose, contextOnlyNotStrategyProof: true };
          } else if (request.kind === "retained_evidence") {
            result = { challengeId: query.queryId, questionId: query.questionId, status: "advisory",
              retrievedEvidence: readRosterTeachRetainedEvidenceV1(input.context.existingEvidence || [], request.toolRequest, evidenceArchive) };
          } else {
            result = { ...await evidencePort.query({ mutationAuthority: false,
              initialFoundationHash: hash(plan), sourceHashes: [sourceHash],
              challengeId: query.queryId, request: requestedRequest }), questionId: query.questionId };
            if (query.kind === "scenario" && result.sourceReceipt?.branchStateHash) result.branchQueryContext =
              evidencePort.describeQueryContext(query.queryId);
          }
        } catch (error) {
          const code = String(error.code || error.message || "");
          if (!/^(PREGAME_LAB_|ROSTER_TEACH_|MODEL_BASE_GEOMETRY_|CURRENT_ACTION_)/u.test(code)) throw error;
          result = { challengeId: query.queryId, questionId: query.questionId,
            status: "unknown", unknownReasonCode: code,
            evidencePortDescriptorHash: evidencePort.descriptor().descriptorHash,
            queryErrorDetail: String(error.message || code), originalQueryNotAnswered: true,
             ...(error.queryRepair?.sourceContract === 'roster_retained_evidence_path_v1'
               ? { queryRepair: clone(error.queryRepair), recoveryOwner: 'investigation' } : {}),
            ...(decoded.error ? { queryNotExecuted: true, recoveryOwner: 'investigation',
              correctionInstruction: 'Only this query has invalid JSON tool arguments. Read the exact parse error and saved unparsedToolRequestJson; submit a corrected object for the same question in the next investigation. Other sibling results are retained. Do not invent missing values or treat this unknown as proof.' } : {}) };
        }
        investigation.operations.push({ queryId: query.queryId, questionId: query.questionId,
          ...(dispatchNormalization ? { requestedRequest, dispatchNormalization } : {}),
          request, completed: true });
        investigation.evidence.push(result);
        await checkpoint();
      }
      round.completed = true;
      if (dynamicProgress) investigation.progress = rosterTeachInvestigationWindowV1(state).progress;
      await checkpoint();
      const handoff=rosterTeachInvestigationBatchHandoffV1(round,investigation.evidence);
      if(handoff.geometryQueryIds.length){
        round.geometryRecoveryHandoff={version:1,queryIds:handoff.geometryQueryIds,
          owner:'existing_native_candidate_recovery',claimsResolved:false};
        await checkpoint();
      }
      // Argument recovery owns solver -> candidate selection -> exact Native
      // execution. Do not ask the unrestricted investigator to retype geometry.
      if(handoff.yieldToRecovery) break;
    }
    investigation.completed = true;
    // Old paid synthesis stays in history; new evidence needs a new synthesis.
    if (state.synthesis) {
      state.synthesisHistory ||= [];
      state.synthesisHistory.push({ synthesis: state.synthesis, raw: state.synthesisRaw });
      delete state.synthesis; delete state.synthesisRaw;
    }
    await checkpoint();
  }
  }
  await beginRecoveryReplan();
  const recoveryResultsBefore = state.queryRecovery?.operations.filter(op => op.result).length || 0;
  const recoverQueries = () => recoverRosterTeachQueriesV1({ state, plan, context,
    evidencePort, sourceHash, ask, checkpoint, completedBeforeRun,
    investigationProducedNewEvidence: investigation.evidence.length > investigationEvidenceCountBeforeRun,
    retainEvidence: value => {
      const reference = hash(value);
      evidenceArchive.set(reference, value);
      return { evidenceObjectHash: reference, contextOnlyNotStrategyProof: true,
        retrieval: { kind: "retained_evidence", toolRequestJson: JSON.stringify({ receiptHash: reference, path: "" }) } };
    },
    readRetainedEvidence: request => readRosterTeachRetainedEvidenceV1(
      input.context.existingEvidence || [], request, evidenceArchive) });
  let recoveryEvidence;
  do {
    await investigateEvidence();
    recoveryEvidence = await recoverQueries();
    // Each handoff consumes a newly recorded repair receipt; the existing
    // recovery limits and no-progress rules remain unchanged. Multiple genuine
    // dependent repairs must not fall into synthesis after an arbitrary two.
  } while(await beginRecoveryReplan());
  if (state.synthesis && recoveryEvidence.length > recoveryResultsBefore) {
    state.synthesisHistory ||= [];
    state.synthesisHistory.push({ synthesis: state.synthesis, raw: state.synthesisRaw });
    delete state.synthesis; delete state.synthesisRaw;
    await checkpoint();
  }
  if (!state.synthesis) {
    await synthesizeSavedEvidence(currentToolContext());
  }
  return finishSession();
}
