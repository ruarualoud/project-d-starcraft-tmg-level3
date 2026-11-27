import { projectFormationMetricsForDecisionV1 } from "../online-agent-session/formation-decision-facts-v1.mjs";
// Recover query execution, not strategy. Persist a bounded focused correction
// dialogue; never restart the entire Teach investigation for argument repair.
import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { STARCRAFT_TMG_PHYSICAL_OBJECT_KINDS_V1 } from '../online-agent-session/spatial-action-query-runtime-v1.mjs';
import { STARCRAFT_TMG_SPATIAL_QUERY_KINDS_V1, STARCRAFT_TMG_SPATIAL_QUERY_CONTRACTS_V1 } from '../online-agent-session/spatial-query-contracts-v1.mjs';
import { supportsRosterTeachQueryDeltaV1, rosterTeachQueryDeltaBaseV1,
  applyRosterTeachQueryDeltaV1 } from './roster-teach-query-delta-v1.mjs';
import { normalizeProviderJsonDocumentV1 } from '../secure-provider-runtime/provider-response-outcome-v1.mjs';
import { prepareRosterTeachQueryDispatchV1 } from './roster-teach-query-dispatch-v1.mjs';
import { assessRosterTeachEvidenceReadinessV1 } from './roster-teach-evidence-readiness-v1.mjs';
import {STARCRAFT_TMG_FORMATION_ACTION_FAMILY_COVERAGE_V1 as formationCoverage} from '../online-agent-session/legal-formation-search-v1.mjs';
import { isRosterTeachStaleCapabilityDeferralV1, rosterTeachReplacementCapabilityV1,
  projectRosterTeachCapabilityGuideV1, validateRosterTeachInspectionRequestV1,
  projectRosterTeachDecisionScopeV1, rosterTeachInvestigationWindowV1 } from './roster-teach-capability-guide-v1.mjs';
export { applyRosterTeachQueryDeltaV1 } from './roster-teach-query-delta-v1.mjs';
const clone = value => structuredClone(value);
const CONTEXT_CHOICES = new Set(['inspect', 'retained_evidence', 'prerequisite_query']);

// A shape-valid no-op is a failed correction, not a fatal framework error.
// Let the existing unchanged-request lane retain it, skip execution and return
// typed feedback inside the original attempt bound. Other delta errors throw.
export function materializeRosterTeachRecoveryDeltaV1(input) {
  try { return applyRosterTeachQueryDeltaV1(input); }
  catch (error) {
    if (error.code !== 'ROSTER_TEACH_QUERY_DELTA_NO_CHANGE') throw error;
    return clone(input.request);
  }
}

export function normalizeRosterTeachRecoveryChoiceV1(reply) {
  const choice = clone(reply);
  if (choice.disposition !== 'retry' || choice.kind === 'patch')
    return { choice, normalization: null };
  // Action composition is a tool-use error, not JSON syntax. Preserve the paid
  // choice and return it to the local dialogue; never drop edits or perform
  // half of a mixed read/write request on the model's behalf.
  if (choice.edits?.length && choice.kind !== 'candidate_parameters') {
    return { choice, normalization: null, dispatchError: {
      code: CONTEXT_CHOICES.has(choice.kind)
        ? 'ROSTER_TEACH_QUERY_DELTA_INSPECT_HAS_EDITS'
        : 'ROSTER_TEACH_QUERY_DIRECT_ACTION_HAS_EDITS',
      correctionInstruction: 'This reply combines two different actions; nothing executed and no edit was discarded. To read a prerequisite or inspect context, submit that request with edits=[]. To change the failed original request, submit kind=patch with your edits and toolRequestJson="". A Native option selection may use kind=candidate_parameters with its permitted non-geometry edits. Choose ONE next action; previous receipts and the original failed query remain available.',
    } };
  }
  const document = normalizeProviderJsonDocumentV1(choice.toolRequestJson);
  let args;
  try { args = JSON.parse(document.text); }
  catch { throw Error('ROSTER_TEACH_RECOVERY_ARGUMENT_JSON_INVALID'); }
  if (!args || typeof args !== 'object' || Array.isArray(args))
    throw Error('ROSTER_TEACH_RECOVERY_ARGUMENT_JSON_INVALID');
  let redundantEnvelope = false;
  if (args.kind === choice.kind && args.toolRequest
    && typeof args.toolRequest === 'object' && !Array.isArray(args.toolRequest)) {
    // Only an exact repetition of the selected transport envelope is
    // redundant. Unknown sibling data or actual edits must never disappear.
    if (Object.keys(args).some(key => !['kind', 'toolRequest', 'edits'].includes(key))
      || (args.edits !== undefined && (!Array.isArray(args.edits) || args.edits.length)))
      throw Error('ROSTER_TEACH_RECOVERY_ENVELOPE_CONFLICT');
    args = args.toolRequest;
    redundantEnvelope = true;
  }
  const dispatched = prepareRosterTeachQueryDispatchV1({ kind: choice.kind, toolRequest: args });
  if (dispatched.error) return { choice, normalization: null, dispatchError: dispatched.error };
  if (document.text === choice.toolRequestJson && !redundantEnvelope && !dispatched.normalization)
    return { choice, normalization: null };
  choice.kind = dispatched.request.kind;
  choice.toolRequestJson = JSON.stringify(dispatched.request.toolRequest);
  return { choice, normalization: {
    version: 1, originalChoiceHash: hash(reply), normalizedChoiceHash: hash(choice),
    grammarKind: document.kind, grammarEvidence: clone(document.evidence || null),
    redundantEnvelopeRemoved: redundantEnvelope,
    ...(dispatched.normalization ? { dispatchNormalization: dispatched.normalization } : {}),
    semanticFieldsInvented: false, originalPaidReplyPreserved: true,
  } };
}
function contextChoicesUsed(operation) {
  const start = operation.contextReadChoiceStart ?? operation.choices?.length ?? 0;
  return (operation.choices || []).slice(start)
    .filter((choice, index) => CONTEXT_CHOICES.has(choice.kind)
      && !(operation.rejectedContextChoiceIndexes || []).includes(index + start)).length;
}
function correctionAttemptsUsed(operation) {
  return (operation.choices?.length || 0) - contextChoicesUsed(operation);
}

function reusablePrerequisiteReceipt(operation, request) {
  const failure = operation.currentFailure || operation.originalResult;
  return (operation.inspections || []).find(row => {
    const receipt = row.result?.queryReceipt;
    const source = receipt?.sourceReceipt;
    return row.request?.kind === 'prerequisite_query'
      && hash(row.request.toolRequest) === hash(request)
      && receipt?.status && receipt.status !== 'unknown'
      && typeof failure?.queryRepair?.sourceStateHash === 'string'
      && typeof failure?.queryRepair?.baseStateHash === 'string'
      && source?.sourceStateHash === failure.queryRepair.sourceStateHash
      && source?.baseStateHash === failure.queryRepair.baseStateHash;
  })?.result.queryReceipt;
}

function hasMisroutedDirectCorrection(operation, original, scopeOptions) {
  if (operation?.status !== 'context_read_budget_exhausted_query_unresolved'
    || !operation.completed || operation.choice?.disposition !== 'retry'
    || operation.queryPurposeRecovery) return false;
  return (operation.inspections || []).some(row => {
    const request = row.request?.toolRequest;
    return row.request?.kind === 'prerequisite_query' && request?.kind === original.kind
      && reusablePrerequisiteReceipt(operation, request)
      && assessRosterTeachQueryCorrectionScopeV1(original, request, scopeOptions).sameNamedScope
      && assessRosterTeachQueryRepairPredicatesV1(operation.currentFailure, request).sameFailedPredicates;
  });
}

export function normalizeRosterTeachSavedRecoveryRequestV1(request) {
  const normalized = normalizeRosterTeachRecoveryChoiceV1({ disposition: 'retry',
    kind: request.kind, toolRequestJson: JSON.stringify(request.toolRequest) });
  return { request: { kind: normalized.choice.kind, toolRequest: JSON.parse(normalized.choice.toolRequestJson) },
    normalization: normalized.normalization, dispatchError: normalized.dispatchError };
}

// A multi-unit correction may make strict Native-proven progress one unit at
// a time. Such progress is not another unsuccessful attempt. The extra steps
// are bounded by the initial failed unit count, with no history/counter reset.
export function continueRosterTeachNativeGeometryProgressV1(operation) {
  const before = operation.currentFailure, after = operation.result;
  if (!operation.candidateParameterSelections?.some(s => s.correctedRequestHash === hash(operation.request))
    || after?.status !== 'unknown' || after.queryRepair?.correctable !== true
    || !after.receiptHash || before?.receiptHash === after.receiptHash
    || after.requestHash !== hash(operation.request)
    || operation.nativeGeometryProgress?.receipts.includes(after.receiptHash)) return false;
  const oldIds = new Set((before?.queryRepair?.failureTargets || [])
    .filter(t => t.failureOrigin === 'scenario_geometry').map(t => t.pieceId));
  const units = after.sourceReceipt?.hypotheticalPlacementAssessment?.units || [];
  const failedIds = new Set(units.filter(u => u.resultStatus !== 'ok').map(u => u.pieceId));
  if (!oldIds.size || [...oldIds].some(id => !units.some(u => u.pieceId === id))
    || [...failedIds].some(id => !oldIds.has(id)) || failedIds.size >= oldIds.size) return false;
  const progress = operation.nativeGeometryProgress ||= { version: 1,
    initialFailedUnitCount: oldIds.size, receipts: [], historyReset: false };
  if (progress.receipts.length >= progress.initialFailedUnitCount) return false;
  progress.receipts.push(after.receiptHash);
  progress.lastResolvedUnitIds = [...oldIds].filter(id => !failedIds.has(id));
  progress.remainingFailedUnitIds = [...failedIds];
  operation.maximumAttempts += 1;
  operation.maximumContextReads = Math.max(operation.maximumContextReads || 0,
    contextChoicesUsed(operation) + failedIds.size + 1);
  operation.currentFailure = clone(after);
  operation.completed = false;
  operation.pendingChoice = false;
  return true;
}

// The model selects a retained option; the Host copies its exact parameters,
// never chooses a tactic or reimplements geometry. The original predicate is
// still executed through Native below. No new hash/signature gate is required.
export function applyRosterTeachCandidateParametersV1({ request, failure, selection, inspections, edits = [] }) {
  const reject = (code, detail = '') => { throw Object.assign(Error(detail ? `${code}:${detail}` : code), { code }); };
  // Only call after the single-reference validator has proved the exact target.
  // Compose all choices against the SAME original scene, then submit atomically.
  const copyValidatedTarget = (destination, source, pointer) => {
    const parts = pointer.slice(1).split('/');
    let to = destination, from = source;
    for (const key of parts.slice(0, -1)) {
      if (['__proto__', 'prototype', 'constructor'].includes(key)
        || !to || !from || !Object.hasOwn(to, key) || !Object.hasOwn(from, key))
        reject('ROSTER_TEACH_CANDIDATE_TARGET_INVALID');
      to = to[key]; from = from[key];
    }
    const key = parts.at(-1);
    if (!to || !from || !Object.hasOwn(to, key) || !Object.hasOwn(from, key)
      || ['__proto__', 'prototype', 'constructor'].includes(key)) reject('ROSTER_TEACH_CANDIDATE_TARGET_INVALID');
    to[key] = clone(from[key]);
  };
  if (edits.length) {
    const geometryTargets = failure.queryRepair.failureTargets.filter(t => t.failureOrigin === 'scenario_geometry');
    if (edits.some(edit => geometryTargets.some(t => edit.path === t.requestPointer
      || edit.path.startsWith(t.requestPointer + '/') || t.requestPointer.startsWith(edit.path + '/'))))
      reject('ROSTER_TEACH_GEOMETRY_EDIT_REQUIRES_CANDIDATE');
    // A subpatch may be idempotent while another selected placement changes.
    // Decide whole-request progress after composition, not per child edit.
    const correctedArguments = materializeRosterTeachRecoveryDeltaV1({ request, failure,
      reply: { disposition: 'retry', kind: 'patch', toolRequestJson: '', edits } });
    const correctedGeometry = applyRosterTeachCandidateParametersV1({ request, failure, selection, inspections });
    for (const item of selection.selections || [selection]) {
      copyValidatedTarget(correctedArguments, correctedGeometry, item.requestPointer);
    }
    return correctedArguments;
  }
  if (selection && Object.hasOwn(selection, 'selections')) {
    // An explicitly empty nested edits list is a harmless representation of the
    // documented no-edit choice. Nonempty nested edits must not be discarded.
    if (Object.keys(selection).some(key => !['selections', 'edits'].includes(key))
      || Object.hasOwn(selection, 'edits') && (!Array.isArray(selection.edits) || selection.edits.length)
      || !Array.isArray(selection.selections)
      || !selection.selections.length || new Set(selection.selections.map(s => s.requestPointer)).size !== selection.selections.length)
      reject('ROSTER_TEACH_CANDIDATE_REFERENCE_INVALID');
    const combined = clone(request);
    for (const item of selection.selections) {
      const corrected = applyRosterTeachCandidateParametersV1({ request, failure, selection: item, inspections });
      copyValidatedTarget(combined, corrected, item.requestPointer);
    }
    return combined;
  }
  if (!selection || Object.keys(selection).some(key => !['receiptHash', 'optionId', 'requestPointer'].includes(key))) {
    reject('ROSTER_TEACH_CANDIDATE_REFERENCE_INVALID');
  }
  const target = failure?.queryRepair?.failureTargets?.find(t => t.requestPointer === selection.requestPointer);
  const staticTarget = target?.failureOrigin === 'scenario_geometry'
    && /^\/toolRequest\/spec\/placements\/\d+$/u.test(target.requestPointer);
  const nativeActionTarget=target?.failureOrigin==='native_action_instantiation'
    && target.requestPointer==='/toolRequest/argumentsJson'
    && request.kind==='scenario' && request.toolRequest?.spec?.kind==='native_action';
  if (!target || !staticTarget && !nativeActionTarget && !['coherency_after_candidate_placement', 'legal_full_path_movement',
    'instantiate_parameterized_action', 'mission_marker_control', 'action_specific_threat'].includes(target.request?.queryKind)) {
    reject('ROSTER_TEACH_CANDIDATE_TARGET_INVALID');
  }
  const receipt = (inspections || []).map(row => row.result?.queryReceipt)
    .find(row => row?.receiptHash === selection.receiptHash);
  const source = receipt?.sourceReceipt, native = source?.queryReceipt;
  const staticReceipt = source?.queryKind === 'space.solve_static_formation'
    && native?.status === 'advisory_estimate';
  if (!receipt || source?.resultStatus !== 'ok' || !staticReceipt && (native?.status !== 'exact'
    || !['space.solve_formation', 'legal_formation_options', 'legal_asset_placement_options'].includes(source.queryKind))) {
    reject('ROSTER_TEACH_CANDIDATE_RECEIPT_INVALID');
  }
  const options = native.result?.formationOptions || native.result?.placementOptions || [];
  const candidate = options.find(option => (option.formationOptionId || option.placementOptionId) === selection.optionId);
  if (source.baseStateHash !== failure.queryRepair.baseStateHash
    || source.sourceStateHash !== failure.queryRepair.sourceStateHash
    || native.authority?.stateHash !== source.baseStateHash) reject('ROSTER_TEACH_CANDIDATE_SCENE_MISMATCH',
      `The selected ${candidate?.pieceId || 'unknown-unit'} option belongs to an earlier scene. The current failed placement is ${target.pieceId || selection.requestPointer}. Request a new prerequisite_query for that unit on branch ${failure.queryRepair.scenarioContinuation?.branchIdRef || '(source)'} using space.solve_static_formation, then select its returned option. Historical inspection results are not current candidates; do not reuse their IDs or change the target pointer.`);
  if (staticTarget && staticReceipt) {
    if (!candidate?.canonicalPlacement || candidate.staticGeometryProven !== true
      || candidate.pieceId !== target.pieceId || candidate.canonicalPlacement.pieceId !== target.pieceId
      || candidate.arrivalOrMovementLegalityProven !== false) reject('ROSTER_TEACH_CANDIDATE_OPTION_INVALID',
        `Expected a complete static option for ${target.pieceId}; selected ${candidate?.pieceId || 'missing option'}. Use prerequisite_query for the expected unit, not another unit's option or invented reference.`);
    return materializeRosterTeachRecoveryDeltaV1({ request, failure, reply: { disposition: 'retry', kind: 'patch',
      toolRequestJson: '', edits: [{ op: 'replace', path: selection.requestPointer,
        valueJson: JSON.stringify({ ...target.request, ...candidate.canonicalPlacement }) }] } });
  }
  if (staticTarget || staticReceipt || !candidate?.canonicalParameters || candidate.rulesAuthority !== true) reject('ROSTER_TEACH_CANDIDATE_OPTION_INVALID');
  if(nativeActionTarget){
    const args=JSON.parse(request.toolRequest.argumentsJson);
    if(args.domainId!==candidate.domainId || target.domainId!==candidate.domainId)
      reject('ROSTER_TEACH_CANDIDATE_DOMAIN_MISMATCH');
    // Transfer the model-selected Native option verbatim. Parent, domain,
    // explicit chance inputs and follow-ups remain the original request.
    const corrected=clone(request);
    corrected.toolRequest.argumentsJson=JSON.stringify({...args,parameters:clone(candidate.canonicalParameters)});
    return corrected;
  }
  const view = rosterTeachQueryDeltaBaseV1({ request, failure });
  // Path is an exact source-declared failed request, not a model arbitrary path.
  let current = view.semanticRequest;
  for (const key of selection.requestPointer.slice(1).split('/')) {
    if (['__proto__', 'prototype', 'constructor'].includes(key) || !current || !Object.hasOwn(current, key)) {
      reject('ROSTER_TEACH_CANDIDATE_TARGET_INVALID');
    }
    current = current[key];
  }
  if (current.queryKind !== target.request.queryKind || !current.argumentsJson
    || current.argumentsJson.domainId !== candidate.domainId) reject('ROSTER_TEACH_CANDIDATE_DOMAIN_MISMATCH');
  return materializeRosterTeachRecoveryDeltaV1({ request, failure, reply: { disposition: 'retry', kind: 'patch',
    toolRequestJson: '', edits: [{ op: Object.hasOwn(current.argumentsJson, 'parameters') ? 'replace' : 'add',
      path: selection.requestPointer + '/argumentsJson/parameters', valueJson: JSON.stringify(candidate.canonicalParameters) }] } });
}

function candidateParameterChoices(failure, inspections) {
  return (inspections || []).flatMap(row => {
    const receipt = row.result?.queryReceipt, source = receipt?.sourceReceipt;
    if (!source || source.baseStateHash !== failure.queryRepair?.baseStateHash
      || source.sourceStateHash !== failure.queryRepair?.sourceStateHash
      || !(source.queryReceipt?.status === 'exact'
        || source.queryKind === 'space.solve_static_formation' && source.queryReceipt?.status === 'advisory_estimate')) return [];
    const result = source.queryReceipt.result;
    return [{ receiptHash: receipt.receiptHash,
      options: (result?.formationOptions || result?.placementOptions || [])
        .filter(option => source.queryKind !== 'space.solve_static_formation'
          || failure.queryRepair.failureTargets.some(t => t.failureOrigin === 'scenario_geometry' && t.pieceId === option.pieceId))
        .map(option => ({
        optionId: option.formationOptionId || option.placementOptionId,
        domainId: option.domainId, pieceId: option.pieceId, actionType: option.actionType,
        anchor: option.anchor, canonicalParameters: option.canonicalParameters,
        ...(option.canonicalPlacement ? { canonicalPlacement: option.canonicalPlacement,
          staticGeometryProven: option.staticGeometryProven, arrivalOrMovementLegalityProven: false } : {}),
        tacticalMetrics: projectFormationMetricsForDecisionV1(option.tacticalMetrics),
      })), selectionNotMandatory: !geometryRepairWorkflow(failure), originalQueryStillRequiresExecution: true }];
  }).filter(row => row.options.length);
}

export function rosterTeachFailureBranchRefV1(failure) {
  const repair=failure?.queryRepair;
  if(typeof repair?.scenarioContinuation?.branchIdRef==='string')return repair.scenarioContinuation.branchIdRef;
  const refs=[...new Set((repair?.failureTargets||[]).filter(t=>t.request&&typeof t.request==='object')
    .map(t=>t.request.branchIdRef||''))];
  if(refs.length===1)return refs[0];
  if(!refs.length&&repair?.sourceStateHash===repair?.baseStateHash)return '';
  return null; // An ambiguous or missing non-source owner is never guessed.
}

export function geometryRepairWorkflow(failure) {
  const repair = failure?.queryRepair;
  const nativeTarget=repair?.failureTargets?.find(target=>target.failureOrigin==='native_action_instantiation');
  const nativeDomain=nativeTarget && repair.actionSpace?.parameterDomains?.find(domain=>
    domain.domainId===nativeTarget.domainId && domain.parameterKind==='official_selected_roster_spatial_path_v1');
  const spatialTarget=repair?.failureTargets?.find(target=>target.requestKind==='spatial'
    &&['legal_full_path_movement','coherency_after_candidate_placement','instantiate_parameterized_action'].includes(target.request?.queryKind));
  let spatialArgs;
  try{spatialArgs=JSON.parse(spatialTarget?.request?.argumentsJson);}catch{/* Not a decodable action query. */}
  const spatialDomain=spatialTarget&&repair.actionSpace?.parameterDomains?.find(domain=>
    domain.domainId===spatialArgs?.domainId&&(formationCoverage.standardSpatialActionTypes.includes(domain.actionType)
      ||domain.actionType==='resolve_relocation_ability'&&formationCoverage.relocationEffects.includes(domain.effectKind)));
  const actionDomain=nativeDomain||spatialDomain,actionTarget=nativeDomain?nativeTarget:spatialTarget;
  if(actionDomain)return {kind:'geometry_repair_workflow',version:spatialDomain?3:2,
    layoutOwner:'native_current_action_formation_tool',anchorAndIntentOwner:'model',
    branchIdRef:rosterTeachFailureBranchRefV1(failure),
    failedUnits:[{unitId:actionDomain.pieceId,domainId:actionDomain.domainId,requestPointer:actionTarget.requestPointer}],
    otherFailedRequests:repair.failureTargets.filter(target=>target!==actionTarget),
    steps:[
      'Choose anchors and formation intent, then use prerequisite_query with kind=spatial, the same branchIdRef, queryKind=space.solve_formation and its exact current domainId. Read the delivered query contract for arguments; this is a real action formation, not a static placement.',
      `Select or reject a complete returned Native option. Use kind=candidate_parameters, edits=[], toolRequestJson={receiptHash,optionId,requestPointer:${JSON.stringify(actionTarget.requestPointer)}}. The Host copies only its canonicalParameters; it does not choose the option.`,
      'The original query/action and follow-ups then execute on the unchanged parent. This proves only that conditional step, not earlier arrival or another scene.'
    ],handwrittenGeometryPatchAccepted:false,noHostStrategyChoice:true};
  const targets = repair?.failureTargets?.filter(t => t.failureOrigin === 'scenario_geometry'
    && /^\/toolRequest\/spec\/placements\/\d+$/u.test(t.requestPointer)) || [];
  if (!targets.length || repair?.queryContracts?.['space.solve_static_formation']?.domain !== false) return null;
  return { kind: 'geometry_repair_workflow', version: 1,
    layoutOwner: 'native_static_formation_tool', anchorAndIntentOwner: 'model',
    branchIdRef: repair.scenarioContinuation?.branchIdRef || '',
    failedUnits: targets.map(t => ({ unitId: t.pieceId, requestPointer: t.requestPointer })),
    otherFailedRequests: repair.failureTargets.filter(t => t.failureOrigin !== 'scenario_geometry'),
    steps: [
      'Choose one or more anchor alternatives and formation objectives for each failed unit, preserving the strategic question.',
      'Use prerequisite_query with kind=spatial, the exact branchIdRef, queryKind=space.solve_static_formation, and argumentsJson={unitId,anchors:[{xInches,yInches}],formationObjectives?}. No action domain is needed.',
      'Select or reject returned Native options. Submit kind=candidate_parameters, toolRequestJson={selections:[{receiptHash,optionId,requestPointer},...]}. Include all failed units in one correction. Do not retype modelPositions. Use edits=[] unless otherFailedRequests also reports argument errors; those may be corrected in the same reply using bounded field edits outside the geometry paths.',
      'The original scenario and follow-ups execute again. Candidate footprints are not proof of arrival or of validity of the combined scene.'
    ], handwrittenGeometryPatchAccepted: false, noHostStrategyChoice: true };
}

export function upgradeRosterTeachSpatialRecoveryProtocolV1(operation) {
  const workflow=geometryRepairWorkflow(operation.currentFailure);
  if(workflow?.version!==3||operation.geometryWorkflowVersion===3)return false;
  operation.geometryWorkflowVersion=3;
  if(!operation.choices?.length)return false;
  operation.spatialGeometryProtocolRecovery={version:1,
    concreteFix:'spatial_query_same_branch_native_candidate_recovery_v431',
    authorization:'standing_one_extra_after_confirmed_host_fix',
    previousMaximumAttempts:operation.maximumAttempts,additionalAttempts:1,historyReset:false};
  operation.maximumAttempts=(operation.maximumAttempts||3)+1;
  operation.maximumContextReads=Math.max(operation.maximumContextReads||0,contextChoicesUsed(operation)+1);
  operation.completed=false;
  return true;
}

function geometryToolFeedback(operation) {
  const { receiptHash: _oldHash, ...old } = operation.currentFailure;
  const body = { ...clone(old), status: 'unknown', originalQueryNotAnswered: true,
    queryNotExecuted: true, unknownReasonCode: 'ROSTER_TEACH_GEOMETRY_TOOL_REFERENCE_REQUIRED',
    queryRepair: { ...clone(old.queryRepair), correctable: true,
      reasonCode: 'ROSTER_TEACH_GEOMETRY_TOOL_REFERENCE_REQUIRED',
      correctionInstruction: geometryRecoveryInstruction(geometryRepairWorkflow(old)) } };
  return { ...body, receiptHash: hash(body) };
}

function geometryRecoveryInstruction(workflow) {
  const actualAction = workflow?.layoutOwner === 'native_current_action_formation_tool';
  return 'Repair this geometry through geometry_repair_workflow. '
    + (actualAction
      ? 'Use space.solve_formation with the delivered current domainId and same branchIdRef. Choose preferredAnchor in integer milli-inches and formationObjectives using the delivered query contract. This repairs an actual action; static placement options cannot substitute for its canonicalParameters. '
      : 'Choose anchors and formation intent, obtain Native static formation options through space.solve_static_formation, then select all needed options by reference. The static solver needs no action domain. ')
    + 'Select a complete Native option by reference; do not handwrite model positions, swap model IDs, or use center-only collision arithmetic. The original query still requires Native execution. ';
}

// Auxiliary reads use the failed query's frozen scene. They can supply repair
// material, never mutate a scenario, answer the original question, or Apply.
export function validateRosterTeachPrerequisiteQueryV1(failure, request) {
  const fail = code => { throw Object.assign(Error(code), { code }); };
  if (!request || !['spatial', 'probability', 'threat_exchange', 'math', 'map_route'].includes(request.kind)
    || !request.toolRequest || typeof request.toolRequest !== 'object' || Array.isArray(request.toolRequest)) {
    fail('ROSTER_TEACH_PREREQUISITE_KIND_INVALID');
  }
  const args = request.toolRequest;
  if (['base', 'branchId', 'queryId'].some(key => Object.hasOwn(args, key))) {
    fail('ROSTER_TEACH_PREREQUISITE_BASE_OVERRIDE_FORBIDDEN');
  }
  const branch = rosterTeachFailureBranchRefV1(failure);
  if(branch===null)fail('ROSTER_TEACH_PREREQUISITE_BRANCH_AMBIGUOUS');
  if ((args.branchIdRef || '') !== branch) fail('ROSTER_TEACH_PREREQUISITE_BRANCH_MISMATCH');
  if (args.spec?.kind || args.spec?.placements?.length || args.followUps?.length) {
    fail('ROSTER_TEACH_PREREQUISITE_KIND_SCENARIO_FORBIDDEN');
  }
  return request;
}

export function hasRosterTeachCorrectableContinuationV1(operation) {
  return operation?.completed === true
    && ['unknown', 'unchanged_failed_request_not_repeated'].includes(operation.status)
    && operation.choice?.disposition === 'retry'
    && operation.result?.queryRepair?.correctable === true
    && correctionAttemptsUsed(operation) < operation.maximumAttempts;
}

// A correction is not permission to discard the named objects of the question.
// Compare typed selector values, including native argumentsJson and scenario
// follow-ups; never find an ID in explanatory prose and call it a query binding.
export function assessRosterTeachQueryCorrectionScopeV1(original, corrected, { resolveQueryContext } = {}) {
  const selectorKeys = new Set(['unitIds', 'markerIds', 'subjectUnitIds', 'targetIds',
    'attackerUnitId', 'targetUnitId', 'unitId', 'markerId', 'pieceId']);
  const values = request => {
    const found = new Set();
    function visit(node) {
      if (!node || typeof node !== 'object') return;
      // The native distance contract encodes physical targets as {kind,id},
      // not targetIds. Use its shared discriminator set, never arbitrary IDs
      // or explanatory prose as evidence of retained query scope.
      if (STARCRAFT_TMG_PHYSICAL_OBJECT_KINDS_V1.includes(node.kind)
        && typeof node.id === 'string' && node.id) found.add(node.id);
      for (const [key, value] of Object.entries(node)) {
        if (selectorKeys.has(key)) for (const item of Array.isArray(value) ? value : [value]) {
          if (typeof item === 'string' && item) found.add(item);
        }
        if (key === 'argumentsJson' && typeof value === 'string' && value) {
          try { visit(JSON.parse(value)); } catch { /* JSON validation is separate. */ }
        } else if (value && typeof value === 'object') visit(value);
      }
    }
    visit(request.toolRequest);
    return found;
  };
  const required = values(original), actual = values(corrected);
  const directedPairs=request=>{
    const pairs=new Set();
    const ids=value=>(Array.isArray(value)?value:[value]).filter(id=>typeof id==='string'&&id);
    function visit(tool,kind,parentBranch=''){
      if(!tool||typeof tool!=='object')return;
      let args={};try{args=typeof tool.argumentsJson==='string'?JSON.parse(tool.argumentsJson):{};}catch{/* Native validates syntax. */}
      const family=tool.queryKind||kind;
      const branch=tool.branchIdRef||parentBranch;
      if(['probability','attack_probability','threat_exchange','fire_zone_exchange'].includes(family)){
        const actors=new Set([...ids(tool.attackerUnitId),...ids(tool.subjectUnitIds),...ids(args.attackerUnitId),...ids(args.subjectUnitIds)]);
        const targets=new Set([...ids(tool.targetUnitId),...ids(tool.targetIds),...ids(args.targetUnitId),...ids(args.targetIds),...ids(args.parameters?.targetUnitId)]);
        if(typeof args.domainId==='string'&&typeof resolveQueryContext==='function'){
          try{const domains=resolveQueryContext(branch)?.actionSpace?.parameterDomains?.filter(d=>d.domainId===args.domainId)||[];
            if(domains.length===1&&typeof domains[0].pieceId==='string')actors.add(domains[0].pieceId);
          }catch(error){if(error.code!=='ROSTER_TEACH_EVIDENCE_BRANCH_REF_UNKNOWN')throw error;}
        }
        for(const attackerUnitId of actors)for(const targetUnitId of targets)
          pairs.add(JSON.stringify({attackerUnitId,targetUnitId}));
      }
      for(const followUp of tool.followUps||[])visit(followUp,followUp.kind,branch);
    }
    visit(request?.toolRequest,request?.kind);return pairs;
  };
  const requiredPairs=directedPairs(original), suppliedPairs=directedPairs(corrected);
  const missingDirectionalPairs=[...requiredPairs].filter(pair=>!suppliedPairs.has(pair)).map(pair=>JSON.parse(pair));
  const directionScopeChanged=missingDirectionalPairs.length>0;
  const domainBindings = [];
  // Canonical Native action queries bind the actor through a domain, not a
  // redundant attackerUnitId that the query schema forbids. Resolve ONLY the
  // selected domain from the current immutable branch; never scan model prose,
  // accept a model-supplied domain object, or use an unrelated historical scene.
  const tool = corrected?.toolRequest;
  if (corrected?.kind === 'spatial' && typeof resolveQueryContext === 'function'
    && STARCRAFT_TMG_SPATIAL_QUERY_CONTRACTS_V1[tool?.queryKind]?.domain === true) {
    let args;
    try { args = JSON.parse(tool.argumentsJson); } catch { /* Execution owns malformed arguments. */ }
    if (typeof args?.domainId === 'string') {
      let nativeContext;
      try { nativeContext = resolveQueryContext(tool.branchIdRef || ''); }
      catch (error) { if (error.code !== 'ROSTER_TEACH_EVIDENCE_BRANCH_REF_UNKNOWN') throw error; }
      const matches = nativeContext?.actionSpace?.parameterDomains?.filter(d => d.domainId === args.domainId) || [];
      if (matches.length === 1 && typeof matches[0].pieceId === 'string') {
        actual.add(matches[0].pieceId);
        domainBindings.push({ domainId: args.domainId, pieceId: matches[0].pieceId,
          branchIdRef: tool.branchIdRef || '', sourceStateHash: nativeContext.sourceStateHash,
          baseStateHash: nativeContext.baseStateHash, authority: 'native_current_action_space' });
      }
    }
  }
  const missingScopeValues = [...required].filter(id => !actual.has(id));
  // Fixing a bad handle does not authorize replacing the intended scene with
  // the undeployed source. Keep this independent of whether that bad handle
  // can currently be resolved: that is exactly the input being corrected.
  const sceneScopeDropped = Boolean(original?.toolRequest?.branchIdRef)
    && !corrected?.toolRequest?.branchIdRef;
  let sceneIdentity = null;
  if (original?.toolRequest?.branchIdRef && corrected?.toolRequest?.branchIdRef
    && original.toolRequest.branchIdRef !== corrected.toolRequest.branchIdRef
    && typeof resolveQueryContext === 'function') {
    try {
      const before = resolveQueryContext(original.toolRequest.branchIdRef);
      const after = resolveQueryContext(corrected.toolRequest.branchIdRef);
      sceneIdentity = { originalStateHash: before.baseStateHash, correctedStateHash: after.baseStateHash,
        originalSourceHash: before.sourceStateHash, correctedSourceHash: after.sourceStateHash };
    } catch (error) {
      if ((error.code || error.message) !== 'ROSTER_TEACH_EVIDENCE_BRANCH_REF_UNKNOWN') throw error;
    }
  }
  const sceneScopeChanged = Boolean(sceneIdentity && (sceneIdentity.originalStateHash !== sceneIdentity.correctedStateHash
    || sceneIdentity.originalSourceHash !== sceneIdentity.correctedSourceHash));
  return { sameNamedScope: missingScopeValues.length === 0 && !sceneScopeDropped && !sceneScopeChanged && !directionScopeChanged,
    missingScopeValues, sceneScopeDropped, sceneScopeChanged, ...(sceneIdentity ? { sceneIdentity } : {}),
    directionScopeChanged,missingDirectionalPairs,
    ...(domainBindings.length ? { domainBindings } : {}),
    semanticRelevanceStillRequiresModelAssessment: true };
}

// Repairing a native query is not permission to replace its predicate with a
// different successful query about the same units. Use source-typed failures,
// not prose similarity. Argument corrections and direct/scene transport are
// allowed; a different question belongs to investigation, not repair success.
export function assessRosterTeachQueryRepairPredicatesV1(failure, corrected) {
  const nativeKind = request => STARCRAFT_TMG_SPATIAL_QUERY_KINDS_V1.includes(request?.queryKind)
    ? request.queryKind : STARCRAFT_TMG_SPATIAL_QUERY_KINDS_V1.includes(request?.kind) ? request.kind : null;
  const required = (failure?.queryRepair?.failureTargets || [])
    // A malformed transport (for example queryKind="scenario") is a field to
    // repair, not a predicate to preserve. Only source-declared native kinds.
    .filter(target => nativeKind(target.request))
    .map(target => ({ requestPointer: target.requestPointer,
      queryKind: nativeKind(target.request) }));
  const supplied = corrected?.kind === 'scenario'
    ? corrected.toolRequest?.followUps || [] : [corrected?.toolRequest];
  const available = supplied.map(nativeKind).filter(Boolean);
  const missingQueryPredicates = required.filter(predicate => {
    const index = available.indexOf(predicate.queryKind);
    if (index < 0) return true;
    available.splice(index, 1);
    return false;
  });
  return { sameFailedPredicates: missingQueryPredicates.length === 0,
    missingQueryPredicates, semanticRelevanceStillRequiresModelAssessment: true };
}

export function invalidateRosterTeachSynthesisV1(state) {
  if (state.synthesis) {
    state.synthesisHistory ||= [];
    state.synthesisHistory.push({ synthesis: state.synthesis, raw: state.synthesisRaw });
    delete state.synthesis; delete state.synthesisRaw;
  }
  if (state.synthesisReader) {
    state.synthesisReaderHistory ||= [];
    state.synthesisReaderHistory.push(clone(state.synthesisReader));
    delete state.synthesisReader;
  }
}
const invalidateSynthesis = invalidateRosterTeachSynthesisV1;

function scopeFailure(operation, assessment) {
  const prior = operation.currentFailure || operation.originalResult;
  const instruction = assessment.directionScopeChanged
    ? 'The correction reverses or drops an original attacker-to-target pair listed in missingDirectionalPairs. The same set of units in opposite roles is a DIFFERENT question. Preserve attack direction; another side or conditional activation experiment belongs to investigation, not a successful correction of this query. Existing valid estimates remain separate evidence. Do not present a reverse attack as the requested return-fire result.'
    : assessment.sceneScopeDropped
    ? 'The original query names a private scene. Clearing branchIdRef selects the undeployed source and does not repair that query. Use the retained-scene directory and inspect a matching saved scene; fix the handle without changing its intended positions. If no matching scene exists, explicitly defer to investigation rather than claiming the source answers the scene question.'
    : assessment.sceneScopeChanged
      ? 'The correction selects a different saved scene. The verified original query receipt binds the intended state in sceneIdentity.originalStateHash. Use that scene/canonical reference; matching unit names in different positions is not the same experiment. A different scenario belongs to investigation, not repair of this query.'
      : 'The original named target/subject is missing from the submitted request. Keep its exact identity. A delivered domain for a different unit is not a repair. Inspect prerequisites or explicitly defer; a different scenario or target belongs to a new investigation, not an answer to this query.';
  const body = { challengeId: operation.queryId, questionId: operation.questionId,
    queryRecoveryOf: operation.originalQueryId, status: 'unknown',
    unknownReasonCode: 'ROSTER_TEACH_RECOVERY_QUERY_SCOPE_CHANGED',
    missingScopeValues: assessment.missingScopeValues, sceneScopeDropped: assessment.sceneScopeDropped,
    directionScopeChanged:assessment.directionScopeChanged,missingDirectionalPairs:assessment.missingDirectionalPairs,
    sceneScopeChanged: assessment.sceneScopeChanged, sceneIdentity: assessment.sceneIdentity || null,
    originalQueryNotAnswered: true,
    queryNotExecuted: true,
    correctionInstruction: instruction,
    queryRepair: { ...clone(prior?.queryRepair || {}), correctable: true,
      reasonCode: 'ROSTER_TEACH_RECOVERY_QUERY_SCOPE_CHANGED',
      sceneIdentity: assessment.sceneIdentity || null,
      missingDirectionalPairs:assessment.missingDirectionalPairs,
      correctionInstruction: instruction },
    canAffectRules: false, trainingTruth: false };
  return { ...body, receiptHash: hash(body) };
}

// Upgrade a saved successful-but-wrong-scene result, not the paid model reply.
// Preserve its execution and fees; return to the same bounded correction lane.
export function reconcileRosterTeachRecoverySceneScopeV1(operation, original, scopeOptions = {}) {
  if (!operation || operation.scopeAuditVersion >= 4 || !operation.completed
    || operation.choice?.disposition !== 'retry' || !operation.request
    || operation.result?.status === 'unknown') return false;
  const assessment = assessRosterTeachQueryCorrectionScopeV1(original, operation.request, scopeOptions);
  if (!assessment.sceneScopeDropped && !assessment.sceneScopeChanged && !assessment.directionScopeChanged) return false;
  const saved = clone(operation.result);
  operation.previousResults ||= [];
  operation.previousResults.push(saved);
  const { receiptHash: _invalidated, ...body } = scopeFailure(operation, assessment);
  const result = { ...body, queryNotExecuted: false, reclassifiedSavedResultHash: saved.receiptHash };
  operation.result = { ...result, receiptHash: hash(result) };
  operation.currentFailure = clone(operation.result);
  operation.sceneScopeRecovery = { version: 4, concreteFix: 'verified_private_scene_and_directional_predicates_preserved',
    previousMaximumAttempts: operation.maximumAttempts, historyReset: false,
    additionalAttempts: correctionAttemptsUsed(operation) >= operation.maximumAttempts ? 1 : 0 };
  operation.maximumAttempts = Math.max(operation.maximumAttempts, correctionAttemptsUsed(operation) + 1);
  operation.scopeAuditVersion = 4;
  operation.completed = false;
  operation.pendingChoice = false;
  operation.status = 'saved_scene_scope_changed';
  return true;
}

function predicateFailure(operation, assessment, savedResult = null) {
  const prior = operation.currentFailure || operation.originalResult;
  const { receiptHash: _oldHash, ...priorBody } = prior;
  const body = { ...priorBody, challengeId: operation.queryId, questionId: operation.questionId,
    queryRecoveryOf: operation.originalQueryId, status: 'unknown',
    unknownReasonCode: 'ROSTER_TEACH_RECOVERY_QUERY_PREDICATE_DROPPED',
    originalQueryNotAnswered: true, queryNotExecuted: !savedResult,
    ...(savedResult ? { reclassifiedSavedResultHash: savedResult.receiptHash } : {}),
    queryRepair: { ...prior.queryRepair, correctable: true,
      reasonCode: 'ROSTER_TEACH_RECOVERY_QUERY_PREDICATE_DROPPED',
      missingQueryPredicates: clone(assessment.missingQueryPredicates),
      correctionInstruction: 'The correction omitted the native query named in missingQueryPredicates. Keep that query and correct its arguments on the retained scene. Another successful query about the same objects does not answer it. Read prerequisite context if needed; the model chooses a real domain and parameters from the delivered actionSpace. Do not drop the failed query or claim the Host selects its domain. If unavailable, defer explicitly.' },
    canAffectRules: false, trainingTruth: false };
  return { ...body, receiptHash: hash(body) };
}

export async function recoverRosterTeachQueriesV1({ state, plan, context, evidencePort,
  sourceHash, ask, checkpoint, completedBeforeRun, investigationProducedNewEvidence = false,
  readRetainedEvidence, retainEvidence }) {
  // A completed explicit selection is history, not the target list of every
  // later investigation. Fresh query failures use ordinary bounded recovery.
  const selected = state.queryRecovery?.selection?.completed ? null : state.queryRecovery?.selection;
  const scopeOptions = { resolveQueryContext: branch => evidencePort.describeQueryContext(branch) };
  if (completedBeforeRun && !selected && !investigationProducedNewEvidence) return [];
  const reviewedFeedbackHashes = new Set();
  async function refreshCurrentInputFeedback(operation, target) {
    const old = operation.currentFailure;
    if (operation.pendingChoice || old?.status !== 'unknown'
      || reviewedFeedbackHashes.has(old.receiptHash)
      || typeof evidencePort.reprojectSavedNativeQueryFailure !== 'function') return;
    // Match the exact rejected submission, not whichever query happens to be
    // most recent. No completed target is reopened and no allowance is added.
    const request = [operation.request, operation.originalRequest, target.request]
      .find(value => value && hash(value) === old.requestHash);
    if (!request) return;
    const projected = evidencePort.reprojectSavedNativeQueryFailure({ request, receipt: old });
    reviewedFeedbackHashes.add(old.receiptHash);
    reviewedFeedbackHashes.add(projected.receiptHash);
    if (projected.receiptHash === old.receiptHash) return;
    operation.previousResults ||= [];
    if (!operation.previousResults.some(row => row.receiptHash === old.receiptHash)) {
      operation.previousResults.push(clone(old));
    }
    operation.currentFailure = clone(projected);
    if (operation.result?.receiptHash === old.receiptHash) operation.result = clone(projected);
    await checkpoint();
  }
  const original = new Map(state.agenda.questions.filter(question => question.evidenceRequest).map(question => [question.questionId, {
    queryId: question.questionId, questionId: question.questionId, request: question.evidenceRequest,
    result: state.evidence.find(e => e.challengeId === question.questionId),
  }]));
  for (const op of state.investigation.operations) original.set(op.queryId, {
    ...op, result: state.investigation.evidence.find(e => e.challengeId === op.queryId),
  });
  const latestByQuestion = new Map();
  for (const op of original.values()) if (!['inspect', 'retained_evidence'].includes(op.request.kind)) {
    latestByQuestion.set(op.questionId, op);
  }
  // A saved Native denial may predate the shared submission contract. Reinspect
  // only the latest rejected request, with no Native execution or result edit.
  // Newly classified input failures belong to local repair even when another
  // question is currently in an investigation continuation.
  const newlyTypedInputs = new Set();
  for(const target of latestByQuestion.values()){
    if(target.request?.kind!=='scenario' || target.request.toolRequest?.spec?.kind!=='native_action'
      || target.result?.unknownReasonCode!=='PREGAME_LAB_NATIVE_ACTION_REJECTED'
      || target.result.queryRepair || typeof evidencePort.reprojectSavedNativeQueryFailure!=='function')continue;
    const projected=evidencePort.reprojectSavedNativeQueryFailure({request:target.request,receipt:target.result});
    if(projected.queryRepair?.correctable===true){
      target.result=projected;
      newlyTypedInputs.add(target.queryId);
    }
  }
  // The follow-up recovery belongs to the same investigation assignment. A new
  // Q2 result must not reopen unrelated historical Q4/Q7 failures simply because
  // an old explicit recovery selection is now completed. Preserve those records;
  // only an explicit selection or an unscoped initial run can revisit them.
  const continuation = state.investigation.recoveryReplanContinuation || state.investigation.factProbeContinuation || state.investigation.dependencyContinuation
    || state.investigation.capabilityContinuation || state.investigation.supplement;
  const focus = continuation ? new Set(rosterTeachInvestigationWindowV1(state).questionIds) : null;
  const targets = selected ? selected.queryIds.map(id => original.get(id))
    : [...latestByQuestion.values()].filter(op => op.result?.queryRepair?.correctable
      && (!focus || focus.has(op.questionId) || newlyTypedInputs.has(op.queryId)));
  // A newly repairable older failure must not preempt the operation whose
  // exact unsent/in-flight request is already durable. Finish that owner first;
  // then ordinary local repairs continue with the same history and allowances.
  const pendingOwner=state.pendingModelCall?.request?.promptNodes?.find(node=>
    node.kind==='failed_query_to_correct')?.originalQueryId;
  if(pendingOwner){
    const pendingIndex=targets.findIndex(target=>target?.queryId===pendingOwner);
    if(pendingIndex<0)throw Object.assign(Error('ROSTER_TEACH_PENDING_RECOVERY_OWNER_NOT_SCHEDULED'),
      {code:'ROSTER_TEACH_PENDING_RECOVERY_OWNER_NOT_SCHEDULED'});
    if(pendingIndex>0)targets.unshift(...targets.splice(pendingIndex,1));
  }
  state.queryRecovery ||= { version: 1, operations: [] };
  const recovery = state.queryRecovery;
  for (const target of targets) {
    if (!target) continue;
    const savedDispatch = prepareRosterTeachQueryDispatchV1(target.request);
    if (['inspect', 'retained_evidence'].includes(target.request.kind)
      && !(selected?.reexecuteSavedQuery && savedDispatch.normalization)) continue;
    const scope = { mutationAuthority: false, initialFoundationHash: hash(plan), sourceHashes: [sourceHash] };
    let operation = recovery.operations.find(op => op.originalQueryId === target.queryId);
    if (reconcileRosterTeachRecoverySceneScopeV1(operation, target.request, scopeOptions)) {
      invalidateSynthesis(state);
      await checkpoint();
    }
    // Recover unanswered predicates, not every historical failed request. The
    // investigator may answer from an existing original receipt/rules record,
    // or refute a premise without repairing an irrelevant earlier experiment.
    // Keep that as a MODEL handoff for synthesis, never a new Native verdict.
    const handoffRound = state.investigation.rounds?.findLast(round => round.completed
      && round.output?.questionProgress?.some(row => row.questionId === target.questionId));
    const handoff = handoffRound?.output.questionProgress.find(row => row.questionId === target.questionId);
    const explicitUnresolved = handoffRound?.output.unresolved?.some(row => row.questionId === target.questionId);
    // An investigator cannot close a failed predicate by citing that very
    // failure as "established". Other original source evidence may supersede
    // an irrelevant failed experiment, but an empty estimate is not its answer.
    const citedFailureAsSuccess = handoff?.disposition === 'evidence_established'
      && handoff.evidenceQueryIds?.includes(target.queryId)
      && !assessRosterTeachEvidenceReadinessV1(target.result).usableForClaim;
    if (!selected && !operation?.pendingChoice && !explicitUnresolved && handoff
      && !citedFailureAsSuccess
      && ['evidence_established', 'claim_refuted', 'plan_revision_required', 'unqueryable_assumption'].includes(handoff.disposition)) {
      recovery.investigationHandoffs ||= [];
      const handoffRecord = { questionId: target.questionId, originalQueryId: target.queryId,
        handoff: clone(handoff), originalFailureReceiptHash: target.result.receiptHash,
        originalFailurePreserved: true, authority: 'model_claim_for_synthesis_not_native_truth',
        planAccepted: false, queryReexecuted: false };
      if (!recovery.investigationHandoffs.some(row => hash(row) === hash(handoffRecord))) {
        recovery.investigationHandoffs.push(handoffRecord);
        if (operation && !operation.completed) {
          operation.completed = true;
          operation.status = 'superseded_by_investigation_handoff';
          operation.investigationHandoff = clone(handoffRecord);
        }
        await checkpoint();
      }
      continue;
    }
    // A demonstrated purpose-routing defect: an original-query correction was
    // repeatedly submitted as context. Offer one explicit submission, keeping
    // all reads/fees/bounds. A saved successful read is NOT auto-promoted.
    if (hasMisroutedDirectCorrection(operation, target.request, scopeOptions)) {
      operation.queryPurposeRecovery = { version: 1,
        concreteFix: 'explicit_direct_correction_and_duplicate_read_feedback_v255',
        authorization: 'standing_one_extra_after_confirmed_host_fix',
        previousMaximumAttempts: operation.maximumAttempts,
        previousAttempts: correctionAttemptsUsed(operation),
        additionalAttempts: correctionAttemptsUsed(operation) >= operation.maximumAttempts ? 1 : 0,
        historyReset: false, savedReadNotAutomaticallyPromoted: true };
      operation.maximumAttempts = Math.max(operation.maximumAttempts, correctionAttemptsUsed(operation) + 1);
      operation.completed = false;
      operation.pendingChoice = false;
      invalidateSynthesis(state);
      await checkpoint();
    }
    if (selected?.reexecuteSavedQuery && isRosterTeachStaleCapabilityDeferralV1(operation)) {
      const current = evidencePort.describeQueryContext();
      const replacement = rosterTeachReplacementCapabilityV1(target.request, current);
      if (replacement && context.selectedRosterReference?.candidateInput) {
        const refreshed = await evidencePort.query({ ...scope,
          challengeId: operation.queryId + '-capability-refresh', request: target.request });
        if (refreshed.queryRepair?.replacementCapability?.capabilityKey === replacement.capabilityKey) {
          operation.deferredCapabilityRecovery = { version: 1, capabilityKey: replacement.capabilityKey,
            previousFailure: clone(operation.currentFailure), previousChoice: clone(operation.choice),
            reason: 'previous_defer_predates_available_replacement_contract', historyReset: false };
          operation.currentFailure = clone(refreshed);
          operation.completed = false;
          operation.pendingChoice = false;
          // Reuse unspent attempts. The one concrete-fix grant applies only if
          // already exhausted; old choices, costs and counters remain intact.
          operation.maximumAttempts = Math.max(operation.maximumAttempts, correctionAttemptsUsed(operation) + 1);
          invalidateSynthesis(state);
          await checkpoint();
        }
      }
    }
    if (selected?.reexecuteSavedQuery && operation?.request) {
      const saved = normalizeRosterTeachSavedRecoveryRequestV1(operation.request);
      if (saved.normalization) {
        operation.savedRequestNormalizations ||= [];
        operation.savedRequestNormalizations.push({ ...saved.normalization,
          originalRequest: clone(operation.request), newModelCalls: 0 });
        operation.request = saved.request;
        const old = operation.result;
        const result = await evidencePort.query({ ...scope, challengeId: operation.queryId, request: saved.request });
        operation.previousResults ||= [];
        if (old) operation.previousResults.push(clone(old));
        operation.result = { ...result, questionId: target.questionId, queryRecoveryOf: target.queryId };
        operation.currentFailure = clone(operation.result);
        operation.pendingChoice = false;
        operation.completed = result.status !== 'unknown' || result.queryRepair?.correctable !== true;
        invalidateSynthesis(state);
        await checkpoint();
      }
      if (continueRosterTeachNativeGeometryProgressV1(operation)) {
        invalidateSynthesis(state);
        await checkpoint();
      }
    }
    if (selected?.reexecuteSavedQuery && operation && !operation.geometryWorkflowVersion
      && operation.choice?.disposition === 'retry') {
      const old = operation.result?.queryRepair?.correctable ? operation.result : operation.currentFailure;
      const oldGeometry = old?.queryRepair?.correctable && (
        old.queryRepair.failureTargets?.some(t => t.failureOrigin === 'scenario_geometry')
        || [old.unknownReasonCode, old.priorExecutionReasonCode].includes('PREGAME_LAB_HYPOTHETICAL_FORMATION_NOT_FOUND'));
      if (oldGeometry) {
        // Rebuild the identical saved readonly query once to expose retained
        // packing failures and the current tool protocol, never a new scenario.
        const request = operation.request || target.request;
        const refreshed = await evidencePort.query({ ...scope, challengeId: operation.queryId, request });
        const workflow = geometryRepairWorkflow(refreshed);
        operation.geometryWorkflowVersion = 1;
        operation.previousResults ||= [];
        operation.previousResults.push(clone(old));
        operation.result = { ...refreshed, questionId: target.questionId, queryRecoveryOf: target.queryId };
        operation.currentFailure = clone(operation.result);
        operation.request = clone(request);
        if (workflow) {
          const used = correctionAttemptsUsed(operation);
          operation.geometryWorkflowRecovery = { version: 1,
            concreteFix: 'native_static_layout_tool_protocol_and_retained_packing_branch_v168',
            authorization: 'standing_one_extra_after_confirmed_host_fix',
            previousMaximumAttempts: operation.maximumAttempts, previousAttempts: used,
            additionalAttempts: used >= operation.maximumAttempts ? 1 : 0,
            originalFailureReceiptHash: old.receiptHash, historyReset: false };
          operation.maximumAttempts = Math.max(operation.maximumAttempts, used + 1);
          operation.maximumContextReads = Math.max(operation.maximumContextReads || 0,
            contextChoicesUsed(operation) + workflow.failedUnits.length + 1);
          operation.staticFormationRecovery ||= { version: 3, coveredBy: 'geometryWorkflowRecovery' };
          operation.pendingChoice = false;
          operation.completed = false;
        } else operation.completed = refreshed.status !== 'unknown'
          || refreshed.queryRepair?.correctable !== true
          || correctionAttemptsUsed(operation) >= operation.maximumAttempts;
        invalidateSynthesis(state);
        await checkpoint();
      }
    }
    // The old delta lane excluded adapter-owned failures even with exact
    // causal paths. Under explicit recovery, grant one field-edit choice for
    // that demonstrated Host defect, retaining every paid reply and attempt.
    // Never reopen model-deferred strategy or a Native non-repairable verdict.
    if (selected?.reexecuteSavedQuery && operation?.completed
      && operation.choice?.disposition === 'retry' && !operation.adapterDeltaRecovery) {
      const failure = operation.currentFailure || operation.result || target.result;
      const correctedBase = [operation.request, target.request].find(request =>
        supportsRosterTeachQueryDeltaV1(request, failure)
        && failure.queryRepair.failureTargets.some(t => !t.nativeQueryRepair));
      if (correctedBase) {
        operation.adapterDeltaRecovery = { version: 1,
          concreteFix: 'adapter_owned_exact_failure_paths_use_causal_field_edits_v158',
          authorization: 'standing_one_extra_after_confirmed_host_fix',
          previousMaximumAttempts: operation.maximumAttempts,
          previousAttempts: correctionAttemptsUsed(operation), additionalAttempts: 1,
          oldFailureReceiptHash: failure.receiptHash,
          previousRequestHash: operation.request ? hash(operation.request) : null,
          deltaBaseRequestHash: hash(correctedBase), historyReset: false };
        operation.maximumAttempts = Math.max(operation.maximumAttempts || 3,
          correctionAttemptsUsed(operation) + 1);
        operation.request = clone(correctedBase);
        operation.currentFailure = clone(failure);
        operation.pendingChoice = false;
        operation.completed = false;
        await checkpoint();
      }
    }
    if (selected?.reexecuteSavedQuery && operation && !operation.staticFormationRecovery
      && operation.choice?.disposition === 'retry') {
      const failure = operation.result?.queryRepair?.correctable ? operation.result : operation.currentFailure;
      const geometryFailure = failure?.queryRepair?.correctable === true
        && (failure.queryRepair.failureTargets?.some(t => t.failureOrigin === 'scenario_geometry')
          || failure.unknownReasonCode === 'PREGAME_LAB_HYPOTHETICAL_FORMATION_NOT_FOUND'
          || failure.priorExecutionReasonCode === 'PREGAME_LAB_HYPOTHETICAL_FORMATION_NOT_FOUND');
      if (geometryFailure) {
        const branch = rosterTeachFailureBranchRefV1(failure);
        if (branch === null) fail('ROSTER_TEACH_RECOVERY_PARENT_UNRESOLVED');
        const current = await evidencePort.describeQueryContext(branch);
        if (current.queryContracts?.['space.solve_static_formation']?.domain === false
          && current.baseStateHash === failure.queryRepair.baseStateHash) {
          const additionalAttempts = correctionAttemptsUsed(operation) >= operation.maximumAttempts ? 1 : 0;
          operation.staticFormationRecovery = { version: 2,
            concreteFix: 'static_layout_query_without_live_action_domain_v165',
            authorization: 'standing_one_extra_after_confirmed_host_fix',
            previousMaximumAttempts: operation.maximumAttempts,
            previousAttempts: correctionAttemptsUsed(operation), additionalAttempts,
            oldFailureReceiptHash: failure.receiptHash, historyReset: false };
          operation.maximumAttempts = Math.max(operation.maximumAttempts, correctionAttemptsUsed(operation) + 1);
          // Additional reads belong to this newly supplied capability; old
          // paid reads/choices remain retained and their counters do not reset.
          operation.maximumContextReads = Math.max(operation.maximumContextReads, contextChoicesUsed(operation)) + 3;
          const { receiptHash: _previousHash, ...body } = clone(failure);
          const refreshed = { ...body, queryRepair: { ...clone(failure.queryRepair),
            ...clone(current), correctable: true }, contextCapabilityRefresh: {
              version: 2, originalFailureReceiptHash: failure.receiptHash,
              originalQueryNotAnswered: true, newModelCalls: 0 } };
          operation.currentFailure = { ...refreshed, receiptHash: hash(refreshed) };
          operation.completed = false;
          operation.pendingChoice = false;
          invalidateSynthesis(state);
          await checkpoint();
        }
      }
    }
    if (operation && !operation.prerequisiteQueryContractVersion) {
      // One demonstrated missing-tool-contract continuation, not a fresh
      // retry cycle. Old reads remain charged under the old attempt contract.
      operation.contextReadChoiceStart = operation.choices?.length || 0;
      operation.maximumContextReads = 3;
      if (selected?.reexecuteSavedQuery && operation.completed
        && operation.choice?.disposition === 'retry'
        && operation.result?.status === 'unknown'
        && supportsRosterTeachQueryDeltaV1(operation.request, operation.result)
        && correctionAttemptsUsed(operation) >= operation.maximumAttempts) {
        operation.prerequisiteQueryRecovery = { version: 1,
          concreteFix: 'read_native_prerequisite_then_repair_original_query',
          authorization: 'standing_one_extra_after_confirmed_host_fix',
          previousMaximumAttempts: operation.maximumAttempts,
          previousAttempts: correctionAttemptsUsed(operation), additionalAttempts: 1,
          oldFailureReceiptHash: operation.result.receiptHash, historyReset: false };
        operation.maximumAttempts = correctionAttemptsUsed(operation) + 1;
        operation.currentFailure = clone(operation.result);
        operation.completed = false;
      }
      operation.prerequisiteQueryContractVersion = 1;
      await checkpoint();
    }
    // A legacy whole-request response can describe a correction yet retain the
    // same invalid fields. Move that stopped operation to an explicit field-edit
    // contract once; never reset attempts or keep issuing full replacements.
    if (operation && !operation.deltaRecoveryContractVersion) {
      if (selected?.reexecuteSavedQuery && operation.completed
        && operation.choice?.disposition === 'retry'
        && supportsRosterTeachQueryDeltaV1(operation.request, operation.result)
        && operation.previousResults?.some(result => result.unknownReasonCode === operation.result.unknownReasonCode
          && result.queryRepair?.correctable === true)
        && operation.choices.length >= operation.maximumAttempts) {
        operation.causalDeltaFeedbackRecovery = { version: 1,
          concreteFix: 'model_owned_causal_field_edits_instead_of_whole_request_echo',
          authorization: 'standing_one_extra_after_confirmed_host_fix',
          previousMaximumAttempts: operation.maximumAttempts,
          previousAttempts: operation.choices.length, additionalAttempts: 1,
          oldFailureReceiptHash: operation.result.receiptHash, historyReset: false };
        operation.maximumAttempts = operation.choices.length + 1;
        operation.currentFailure = clone(operation.result);
        operation.completed = false;
      }
      operation.deltaRecoveryContractVersion = 1;
      await checkpoint();
    }
    // The saved Native error can already explain the repair. Recover that
    // feedback before considering query re-execution or a completed stop.
    if (operation?.completed && operation.choice?.disposition==='retry' && operation.request
      && operation.result?.status === 'unknown'
      && typeof evidencePort.reprojectSavedNativeQueryFailure === 'function') {
      const old = operation.result;
      const projected = evidencePort.reprojectSavedNativeQueryFailure({
        request: operation.request, receipt: old });
      if (projected.receiptHash !== old.receiptHash) {
        operation.previousResults ||= [];
        operation.previousResults.push(clone(old));
        operation.result = clone(projected);
        operation.currentFailure = clone(projected);
        operation.status = projected.status;
        if (projected.queryRepair?.correctable && operation.choice?.disposition === 'retry') {
          operation.automaticRetainedFeedbackRepair={originalReceiptHash:old.receiptHash,
            projectedReceiptHash:projected.receiptHash,historyReset:false,nativeExecutions:0};
          if (!operation.nativeRepairFeedbackRecovery
            && operation.choices.length >= operation.maximumAttempts) {
            operation.nativeRepairFeedbackRecovery = { version: 1,
              concreteFix: 'retained_native_repair_feedback_transport',
              authorization: 'standing_one_extra_after_confirmed_host_fix',
              previousMaximumAttempts: operation.maximumAttempts,
              previousAttempts: operation.choices.length, additionalAttempts: 1,
              oldFailureReceiptHash: old.receiptHash, historyReset: false };
            operation.maximumAttempts = operation.choices.length + 1;
          }
          operation.completed = operation.choices.length >= operation.maximumAttempts;
        }
        // Only feedback metadata changed; do not re-buy a synthesis of the
        // same facts. A genuinely changed query result invalidates it below.
        await checkpoint();
      }
    }
    // A legacy repair was given the empty source and populated branch as
    // competing executable contexts. Resume only a saved correctable failure
    // under explicit operator recovery; record one concrete-fix grant, not a
    // reset. New operations already use the single active-context packet.
    if (operation && !operation.activeContextProjectionVersion) {
      const activeBase = operation.currentFailure?.queryRepair?.baseStateHash;
      const originalBase = context.queryContext?.baseStateHash;
      if (selected?.reexecuteSavedQuery && operation.completed
        && operation.choice?.disposition === 'retry'
        && operation.result?.status === 'unknown' && operation.result.queryRepair?.correctable
        && activeBase && originalBase && activeBase !== originalBase
        && operation.choices.length >= operation.maximumAttempts) {
        operation.activeContextProjectionRecovery = { version: 1,
          concreteFix: 'single_active_query_context_with_retrievable_background',
          authorization: 'standing_one_extra_after_confirmed_host_fix',
          previousMaximumAttempts: operation.maximumAttempts, previousAttempts: operation.choices.length,
          additionalAttempts: 1, activeBaseStateHash: activeBase, originalBaseStateHash: originalBase,
          oldFailureReceiptHash: operation.result.receiptHash, historyReset: false };
        operation.maximumAttempts = operation.choices.length + 1;
        operation.completed = false;
        operation.currentFailure = clone(operation.result);
        invalidateSynthesis(state);
      }
      operation.activeContextProjectionVersion = 1;
      await checkpoint();
    }
    if (operation && !operation.predicateAuditVersion) {
      if (operation.completed && operation.choice?.disposition === 'retry'
        && operation.request && operation.result?.status !== 'unknown') {
        const assessment = assessRosterTeachQueryRepairPredicatesV1(operation.currentFailure, operation.request);
        if (!assessment.sameFailedPredicates) {
          const paidResult = clone(operation.result);
          operation.previousResults ||= [];
          operation.previousResults.push(paidResult);
          operation.result = predicateFailure(operation, assessment, paidResult);
          operation.currentFailure = clone(operation.result);
          operation.status = 'query_predicate_dropped';
          const previousMaximumAttempts = operation.maximumAttempts;
          const additionalAttempts = selected?.reexecuteSavedQuery
            && operation.choices.length >= previousMaximumAttempts ? 1 : 0;
          operation.maximumAttempts += additionalAttempts;
          operation.predicateAcceptanceRecovery = { version: 1,
            concreteFix: 'source_typed_failed_query_obligations',
            authorization: 'standing_one_extra_after_confirmed_host_fix',
            previousMaximumAttempts, previousAttempts: operation.choices.length,
            additionalAttempts, oldResultReceiptHash: paidResult.receiptHash, historyReset: false };
          operation.completed = operation.choices.length >= operation.maximumAttempts;
          invalidateSynthesis(state);
        }
      }
      operation.predicateAuditVersion = 1;
      await checkpoint();
    }
    // Standing operator authorization: one extra choice after a demonstrated
    // Host defect, not a fresh three-round cycle. Legacy domain failures were
    // told to inspect a branch while that role could not emit an inspect call.
    // New operations already have that capability and never receive this grant.
    if (selected?.reexecuteSavedQuery && operation?.completed
      && !operation.prerequisiteInspectionContractVersion
      && !operation.prerequisiteInspectionRecovery
      && operation.choice?.disposition === 'retry'
      && operation.result?.unknownReasonCode === 'CURRENT_ACTION_QUERY_DOMAIN_REFERENCE_REQUIRED'
      && operation.result.queryRepair?.correctable === true
      && operation.result.queryRepair.scenarioContinuation?.constructionReturnedReceipt === true
      && (operation.choices?.length || 0) >= operation.maximumAttempts) {
      operation.prerequisiteInspectionRecovery = { version: 1,
        concreteFix: 'recovery_read_contract_and_retained_scene_v123_v124',
        authorization: 'standing_one_extra_after_confirmed_host_fix',
        previousMaximumAttempts: operation.maximumAttempts,
        previousAttempts: operation.choices.length, additionalAttempts: 1,
        oldFailureReceiptHash: operation.result.receiptHash, historyReset: false };
      operation.prerequisiteInspectionContractVersion = 1;
      operation.maximumAttempts = operation.choices.length + 1;
      operation.completed = false;
      operation.currentFailure = clone(operation.result);
      invalidateSynthesis(state);
      await checkpoint();
    }
    // A concrete tool-contract fix may complete an omitted/failed execution
    // using the EXACT saved paid request. Never buy another model answer for
    // this, refresh successful complete queries, or reset model-attempt counts.
    if (operation?.completed && selected?.reexecuteSavedQuery && operation.request) {
      const old = operation.result;
      const descriptorHash = evidencePort.descriptor().descriptorHash;
      const missingFollowups = (operation.request.toolRequest.followUps?.length || 0)
        > (old?.followUpReceipts?.length || 0);
      if (old && old.evidencePortDescriptorHash !== descriptorHash
        && (old.status === 'unknown' || missingFollowups)
        && assessRosterTeachQueryCorrectionScopeV1(target.request, operation.request, scopeOptions).sameNamedScope
        && assessRosterTeachQueryRepairPredicatesV1(operation.currentFailure || old, operation.request).sameFailedPredicates) {
        const result = await evidencePort.query({ ...scope,
          challengeId: operation.queryId, request: operation.request });
        operation.previousResults ||= [];
        operation.previousResults.push(clone(old));
        operation.result = { ...result, questionId: target.questionId, queryRecoveryOf: target.queryId };
        operation.status = result.status;
        operation.executionRefresh = { fromDescriptorHash: old.evidencePortDescriptorHash || null,
          toDescriptorHash: descriptorHash, savedRequestHash: hash(operation.request),
          samePaidRequest: true, newModelCalls: 0 };
        // Standing operator policy permits ONE extra attempt after a concrete
        // Host fix. Apply only when actual refreshed evidence proves the old
        // feedback wrongly protected the failed scenario geometry. Keep all
        // attempts/receipts and record this migration once, not a new cycle.
        if (!operation.causalGeometryFeedbackRecovery
          && old.queryRepair?.scenarioContinuation?.constructionReturnedReceipt === true
          && old.queryRepair.scenarioContinuation.requiresScenarioRebuild !== true
          && result.queryRepair?.scenarioContinuation?.requiresScenarioRebuild === true
          && result.queryRepair.failureTargets?.some(t => t.failureOrigin === 'scenario_geometry')
          && (operation.choices?.length || 0) >= operation.maximumAttempts) {
          operation.causalGeometryFeedbackRecovery = { version: 1,
            concreteFix: 'scenario_geometry_misattributed_to_followup_v101',
            previousMaximumAttempts: operation.maximumAttempts,
            previousAttempts: operation.choices.length, additionalAttempts: 1,
            oldFailureReceiptHash: old.receiptHash, historyReset: false };
          operation.maximumAttempts = operation.choices.length + 1;
        }
        operation.completed = result.status !== 'unknown'
          || result.queryRepair?.correctable !== true
          || (operation.choices?.length || 0) >= operation.maximumAttempts;
        if (!operation.completed) operation.currentFailure = clone(operation.result);
        invalidateSynthesis(state);
        await checkpoint();
      }
      if (operation.completed) continue;
    }
    // Reclassify an already-paid v90 broadening without erasing its original
    // receipt. One extra attempt after this demonstrated fix, never a reset.
    if (operation?.completed && operation.choice?.disposition === 'retry' && !operation.scopeAuditVersion) {
      const assessment = assessRosterTeachQueryCorrectionScopeV1(target.request, operation.request, scopeOptions);
      operation.scopeAuditVersion = 1;
      if (!assessment.sameNamedScope) {
        operation.choices ||= [clone(operation.choice)];
        operation.previousResults ||= [];
        operation.previousResults.push(clone(operation.result));
        operation.result = scopeFailure(operation, assessment);
        operation.maximumAttempts = operation.choices.length + 1;
        operation.completed = false;
        operation.status = 'scope_changed_not_executed';
        invalidateSynthesis(state);
      }
      await checkpoint();
    }
    // Legacy recovery treated any executed query as a completed repair, even
    // when its receipt explicitly offered another correctable failure. Resume
    // only that proven premature close; retain choices and the original bound.
    if (hasRosterTeachCorrectableContinuationV1(operation)) {
      operation.completed = false;
      operation.currentFailure = clone(operation.result);
      await checkpoint();
    }
    if (operation?.status === 'scope_changed_not_executed' && operation.request
      && assessRosterTeachQueryCorrectionScopeV1(target.request, operation.request, scopeOptions).sameNamedScope) {
      // A transport-schema correction may show the saved paid request never
      // lost its selectors. Execute it once instead of asking the model again.
      operation.pendingChoice = true;
      operation.completed = false;
      operation.scopeTransportRecovery = { version: 3, samePaidRequest: true,
        requestHash: hash(operation.request), pendingFirstExecution: true,
        originalScopeFailureRetained: true, newModelCalls: 0 };
      await checkpoint();
    }
    if (operation?.completed) continue;
    const question = state.agenda.questions.find(q => q.questionId === target.questionId);
    if (!operation) {
      operation = { originalQueryId: target.queryId, questionId: target.questionId,
        geometryWorkflowVersion: 1,
        deltaRecoveryContractVersion: 1,
        prerequisiteQueryContractVersion: 1, contextReadChoiceStart: 0, maximumContextReads: 3,
        originalRequest: clone(target.request), originalResult: clone(target.result),
        queryId: `recovery-${hash({ sourceHash, queryId: target.queryId }).slice(0, 40)}`,
        choices: [], maximumAttempts: 3, scopeAuditVersion: 3,
        predicateAuditVersion: 1,
        activeContextProjectionVersion: 1,
        prerequisiteInspectionContractVersion: 1, completed: false };
      recovery.operations.push(operation);
      await checkpoint();
    }
    if (!operation.currentFailure) {
      // Explicit recovery of an old receipt rechecks the SAME readonly query
      // under the repaired contract. Old results/costs are never overwritten.
      operation.currentFailure = selected
        ? await evidencePort.query({ ...scope, challengeId: operation.queryId + '-original', request: target.request })
        : clone(target.result);
      if (selected?.reexecuteSavedQuery && savedDispatch.normalization) {
        operation.savedRequestNormalizations ||= [];
        operation.savedRequestNormalizations.push({ ...savedDispatch.normalization,
          originalRequest: clone(target.request), newModelCalls: 0 });
        operation.request = clone(savedDispatch.request);
        operation.result = { ...clone(operation.currentFailure), questionId: target.questionId,
          queryRecoveryOf: target.queryId };
        operation.status = operation.result.status;
        invalidateSynthesis(state);
        if (operation.result.status !== 'unknown') operation.completed = true;
      }
      await checkpoint();
    }
    if(upgradeRosterTeachSpatialRecoveryProtocolV1(operation))await checkpoint();
    if (operation.completed) continue;
    // Ordinary new/continued recovery needs the same source-owned feedback as
    // explicit legacy recovery, before the first paid repair choice is made.
    await refreshCurrentInputFeedback(operation, target);
    if (!operation.currentFailure.queryRepair?.correctable) {
      operation.status = 'not_correctable_by_this_lane'; operation.completed = true;
      await checkpoint(); continue;
    }
    operation.choices ||= operation.choice ? [clone(operation.choice)] : [];
    operation.maximumAttempts ||= 3;
    if (operation.choice && !operation.result && !operation.status) operation.pendingChoice = true;
    while (!operation.completed && (operation.pendingChoice || correctionAttemptsUsed(operation) < operation.maximumAttempts)) {
      if (!operation.pendingChoice) {
      await refreshCurrentInputFeedback(operation, target);
      if (operation.result && operation.choice
        && !CONTEXT_CHOICES.has(operation.choice.kind)) {
        operation.lastQueryChoice = clone(operation.choice);
      }
      const deltaBaseRequest = [operation.request, target.request].find(request =>
        supportsRosterTeachQueryDeltaV1(request, operation.currentFailure));
      const deltaMode = supportsRosterTeachQueryDeltaV1(deltaBaseRequest, operation.currentFailure);
      const deltaBase = deltaMode ? rosterTeachQueryDeltaBaseV1({ request: deltaBaseRequest,
        failure: operation.currentFailure }) : null;
      const geometryWorkflow = geometryRepairWorkflow(operation.currentFailure);
      // Native actions and spatial queries encode the parent in different
      // receipt fields. All recovery consumers must use the same resolver.
      const executionBranch = rosterTeachFailureBranchRefV1(operation.currentFailure);
      if (executionBranch === null) fail('ROSTER_TEACH_RECOVERY_PARENT_UNRESOLVED');
      const currentCandidates = candidateParameterChoices(operation.currentFailure, operation.inspections);
      const currentInspections = (operation.inspections || []).filter(row => {
        const source = row.result?.queryReceipt?.sourceReceipt || row.result?.queryContext;
        return source?.baseStateHash === operation.currentFailure.queryRepair.baseStateHash
          && source?.sourceStateHash === operation.currentFailure.queryRepair.sourceStateHash;
      });
      const paidChoice = await ask(deltaMode ? 'teach_framework_query_delta_recovery' : 'teach_framework_query_recovery', [
        projectRosterTeachDecisionScopeV1(context),
        projectRosterTeachCapabilityGuideV1(evidencePort.describeQueryContext(
          executionBranch), context),
        ...(geometryWorkflow ? [geometryWorkflow] : []),
        { kind: 'failed_query_to_correct', originalQueryId: target.queryId,
          request: deltaMode ? deltaBaseRequest : target.request, result: operation.currentFailure,
          executionContext: {
            authority: 'current_failure.queryRepair_only_not_original_empty_source',
            sourceStateHash: operation.currentFailure.queryRepair.sourceStateHash,
            baseStateHash: operation.currentFailure.queryRepair.baseStateHash,
            branchIdRef: executionBranch,
            domainSelectionOwner: 'model_chooses_delivered_domain_and_parameters_host_validates',
            successfulDifferentPredicateDoesNotRepairThisQuery: true,
          } },
        ...(deltaMode ? [{ kind: 'failed_request_delta_base', ...deltaBase }] : []),
        { kind: 'strategic_question', question },
        { kind: 'query_recovery_read_budget', contextReadsUsed: contextChoicesUsed(operation),
          maximumContextReads: operation.maximumContextReads,
          correctionAttemptsUsed: correctionAttemptsUsed(operation), maximumCorrectionAttempts: operation.maximumAttempts,
          readsDoNotResolveOriginalQuery: true },
        { kind: 'query_recovery_action_protocol', version: 1,
          directCorrection: geometryWorkflow ? {kind:'candidate_parameters',
            available:currentCandidates.some(c=>c.options.length>0),
            toolRequestJson:'Select receiptHash, optionId and requestPointer from a current Native candidate',
            edits:'Only separately reported non-geometry fields; never handwrite positions'}
            : deltaMode ? { kind: 'patch', edits: 'Causal field edits to failed_request_delta_base', toolRequestJson: '' }
            : geometryWorkflow ? { kind: 'candidate_parameters', toolRequestJson: 'Selected Native option references' }
              : { kind: target.request.kind, toolRequestJson: 'JSON of the corrected toolRequest ONLY, without a kind/toolRequest wrapper' },
          directCorrectionUse: 'To retry the ORIGINAL query after fixing its arguments, submit this direct correction with disposition=retry. Existing exact successful prerequisite evidence may be reused, but only after your explicit submission and the normal scope/predicate checks.',
          prerequisiteUse: 'Only for a DIFFERENT prerequisite needed to construct the correction. It never submits the corrected original query. Do not repeat a stored read; its receipt is already in query_inspection_results.',
          noStrategyAcceptanceImplied: true },
        ...(operation.result ? [{ kind: 'previous_correction_result', choice: operation.lastQueryChoice || operation.choice,
          result: operation.result, priorChoiceIsNotAnInstruction: true, attemptsUsed: correctionAttemptsUsed(operation),
          maximumAttempts: operation.maximumAttempts }] : []),
        // This role fixes one query, not the Plan. The original source scene
        // has different action domains and must not compete with the failed
        // branch as executable context. Keep ALL planning material retrievable
        // verbatim, rather than cutting it or injecting a replacement strategy.
        { kind: 'query_repair_background', sourceHash, planHash: hash(plan),
          contextOnlyNotExecutionAuthority: true,
          ...(typeof retainEvidence === 'function'
            ? { retained: retainEvidence({ plan, framework: state.framework, context }) }
            : { contextOnly: { plan, framework: state.framework, context } }) },
        ...(operation.inspections?.length ? [{ kind: 'query_inspection_results',
          inspections: currentInspections, contextOnlyNotStrategyProof: true,
          historicalInspectionCount: operation.inspections.length - currentInspections.length,
          historicalInspectionsNotCurrentCandidates: true,
          ...(typeof retainEvidence === 'function' ? { historicalArchive: retainEvidence(operation.inspections) } : {}) }] : []),
        ...(operation.inspections?.length ? [{ kind: 'native_candidate_parameter_choices',
          choices: currentCandidates,
          use: 'Select, reject or request other candidates. kind=candidate_parameters with toolRequestJson={selections:[{receiptHash,optionId,requestPointer},...]} copies exact Native options into their named repair targets. Actual-action options supply canonicalParameters; static options supply canonicalPlacement. They are not interchangeable. A single {receiptHash,optionId,requestPointer} also works. Use edits=[] unless other failed non-geometry requests need bounded argument edits in this same reply. Do not retype model lists. This is not an automatic strategy choice or a query answer.' }] : []),
      ], (geometryWorkflow ? geometryRecoveryInstruction(geometryWorkflow) : deltaMode ? 'Return kind=patch with explicit edits to failed_request_delta_base.semanticRequest, not a whole query. Each edit uses an RFC6901 path under allowedEditPrefixes, op add/replace/remove and a JSON-encoded replacement valueJson (empty for remove). argumentsJson is decoded in this view, so edit its nested fields directly. toolRequestJson must be empty for patch. The Host preserves the scenario and successful siblings. Your emitted values must implement your described change; prose is not an edit. You may instead inspect or retrieve evidence with edits=[] and toolRequestJson, or defer. Native still judges legality; do not choose an arbitrary movement merely to pretend a static placement proves arrival. ' : '')
      + 'Correct this ONE failed query, preserving its question, named units, targets and scenario assumptions. Use the current queryRepair contracts and exact branch handles. Read context with kind=inspect and toolRequestJson={branchIdRef}, or archived fields with kind=retained_evidence and toolRequestJson={receiptHash,path}. Compute repair material with kind=prerequisite_query and toolRequestJson={kind:"spatial",toolRequest:{branchIdRef,queryKind,argumentsJson}}; probability/threat_exchange and source-only math/map_route are also available. Auxiliary reads keep the exact failed branch. Static layout repair uses space.solve_static_formation; space.solve_formation instead requires a delivered current-action domain and cannot substitute for static repair. Reads have a separate bounded budget, return to your next choice, and do not answer the original question. In delta mode reads have edits=[]. Preserve original scene and followUps. The Host does not choose tactics or anchors. Do not broaden filtered queries to {}, query an empty source for a populated scene, invent domains/weapons/outcomes, or claim hypothetical placement proves legal arrival. If prerequisites cannot be supplied, defer with the concrete reason. This is a bounded query dialogue, not a new whole-Teach cycle.', value => {
        if (value.disposition !== 'retry') return;
        const prepared = normalizeRosterTeachRecoveryChoiceV1(value);
        if (prepared.dispatchError) return; // Retain paid reply; correct locally below.
        value = prepared.choice;
        if (value.kind === 'candidate_parameters') {
          applyRosterTeachCandidateParametersV1({ request: deltaBaseRequest || target.request,
            failure: operation.currentFailure, inspections: operation.inspections,
            selection: JSON.parse(value.toolRequestJson), edits: value.edits || [] });
          return;
        }
        if (deltaMode && value.kind === 'patch') {
          try {
            materializeRosterTeachRecoveryDeltaV1({ request: deltaBaseRequest, failure: operation.currentFailure, reply: value });
          } catch (error) {
            // Shape-valid bad tool arguments belong to the bounded tool dialogue,
            // not ask()'s format-repair loop (which otherwise aborts all Teach).
            // Execution below retains the paid choice and returns typed unknown.
            if (!String(error.code || '').startsWith('ROSTER_TEACH_QUERY_DELTA_')) throw error;
          }
          return;
        }
        let args;
        try { args = JSON.parse(value.toolRequestJson); } catch { throw Error('ROSTER_TEACH_RECOVERY_ARGUMENT_JSON_INVALID'); }
        if (!args || typeof args !== 'object' || Array.isArray(args)) throw Error('ROSTER_TEACH_RECOVERY_ARGUMENT_JSON_INVALID');
        if (value.kind === 'inspect') validateRosterTeachInspectionRequestV1(args);
        if (CONTEXT_CHOICES.has(value.kind)) {
          const repeated = (operation.inspections || []).some(row =>
            row.requestHash === hash({ kind: value.kind, toolRequest: args }));
          if (repeated) throw Error('ROSTER_TEACH_RECOVERY_CONTEXT_ALREADY_READ: Read the saved query_inspection_results. To submit the corrected ORIGINAL query, use query_recovery_action_protocol.directCorrection, not prerequisite_query. A different needed prerequisite or explicit defer is also allowed.');
          if (contextChoicesUsed(operation) >= operation.maximumContextReads)
            throw Error('ROSTER_TEACH_RECOVERY_CONTEXT_BUDGET_USED: Submit the original-query correction using query_recovery_action_protocol.directCorrection, or defer. Further context reads are unavailable; do not repeat a saved read.');
        }
      }, { maxAttempts: 3, ...(geometryWorkflow
        ? { candidateParametersAvailable: currentCandidates.some(c => c.options.length > 0) } : {}) });
      // Revalidation of a saved paid reply uses the same decoder as execution.
      // Keep the raw reply in the workspace; record only this lossless adapter
      // transformation here, not another model choice or retry allowance.
      const normalizedChoice = normalizeRosterTeachRecoveryChoiceV1(paidChoice);
      const rawChoice = normalizedChoice.choice;
      if (normalizedChoice.dispatchError) {
        // Invalid dispatch is a failed tool correction, not a whole-Teach crash
        // or another uncounted format-repair loop. Never choose competing IDs.
        operation.choice = clone(rawChoice);
        if (CONTEXT_CHOICES.has(rawChoice.kind)) {
          // Rejected reads consume the existing correction bound, rather than
          // being counted as successful context reads and retried forever.
          operation.rejectedContextChoiceIndexes ||= [];
          operation.rejectedContextChoiceIndexes.push(operation.choices.length);
        }
        operation.choices.push(clone(rawChoice));
        operation.pendingChoice = false;
        operation.previousResults ||= [];
        if (operation.result) operation.previousResults.push(clone(operation.result));
        const { receiptHash: _oldHash, ...prior } = operation.currentFailure;
        const body = { ...prior, challengeId: operation.queryId, questionId: operation.questionId,
          queryRecoveryOf: target.queryId, status: 'unknown',
          unknownReasonCode: normalizedChoice.dispatchError.code,
          queryNotExecuted: true, originalQueryNotAnswered: true,
          queryRepair: { ...prior.queryRepair, correctable: true,
            dispatchError: normalizedChoice.dispatchError,
            correctionInstruction: normalizedChoice.dispatchError.correctionInstruction
              || 'The selected query family and registered queryKind contain competing arguments. Submit one canonical query using the delivered tool contract, preserving the original named units and predicate. The Host will not pick one argument over another. No query executed; correct this local request or defer.' },
          canAffectRules: false, trainingTruth: false };
        operation.result = { ...body, receiptHash: hash(body) };
        operation.currentFailure = clone(operation.result);
        operation.status = 'dispatch_arguments_invalid_not_executed';
        operation.completed = correctionAttemptsUsed(operation) >= operation.maximumAttempts;
        invalidateSynthesis(state);
        await checkpoint(); continue;
      }
      operation.pendingGeometryChoiceKind = rawChoice.kind;
      if (normalizedChoice.normalization) {
        operation.replyTransportNormalizations ||= [];
        operation.replyTransportNormalizations.push(normalizedChoice.normalization);
      }
      if (rawChoice.disposition === 'retry' && rawChoice.kind === 'candidate_parameters') {
        const selection = JSON.parse(rawChoice.toolRequestJson);
        const corrected = applyRosterTeachCandidateParametersV1({ request: deltaBaseRequest || target.request,
          failure: operation.currentFailure, inspections: operation.inspections, selection, edits: rawChoice.edits || [] });
        operation.candidateParameterSelections ||= [];
        operation.candidateParameterSelections.push({ ...clone(selection), correctedRequestHash: hash(corrected),
          nonGeometryEdits: clone(rawChoice.edits || []),
          modelSelectedReference: true, hostChosenParameterValues: false, originalQueryNotYetExecuted: true });
        operation.choice = { disposition: 'retry', kind: corrected.kind,
          toolRequestJson: JSON.stringify(corrected.toolRequest), publicReason: rawChoice.publicReason };
      } else if (deltaMode) {
        let corrected = null, deltaError = null;
        const transportNormalizations = [];
        try {
          if (rawChoice.disposition === 'retry' && rawChoice.kind === 'patch')
            corrected = materializeRosterTeachRecoveryDeltaV1({ request: deltaBaseRequest,
              failure: operation.currentFailure, reply: rawChoice,
              onNormalization: row => transportNormalizations.push(row) });
        } catch (error) {
          if (!String(error.code || '').startsWith('ROSTER_TEACH_QUERY_DELTA_')) throw error;
          deltaError = { code: error.code, detail: String(error.message).slice(error.code.length + 1) };
        }
        operation.deltaRecoveryHistory ||= [];
        operation.deltaRecoveryHistory.push({ baseRequestHash: hash(deltaBaseRequest),
          failureReceiptHash: operation.currentFailure.receiptHash, reply: clone(rawChoice),
          correctedRequestHash: corrected ? hash(corrected) : null, transportNormalizations,
          ...(deltaError ? { deltaError } : {}), hostChosenParameterValues: false });
        if (deltaError) {
          operation.choice = clone(rawChoice);
          operation.choices.push(clone(rawChoice));
          operation.pendingChoice = false;
          operation.previousResults ||= [];
          if (operation.result) operation.previousResults.push(clone(operation.result));
          const { receiptHash: _oldHash, ...prior } = operation.currentFailure;
          const body = { ...prior, challengeId: operation.queryId, questionId: operation.questionId,
            queryRecoveryOf: target.queryId, status: 'unknown', unknownReasonCode: deltaError.code,
            queryNotExecuted: true, originalQueryNotAnswered: true, deltaError,
            queryRepair: { ...prior.queryRepair, correctable: true, deltaError,
              correctionInstruction: 'The field patch was not applied. Use existing parent paths from failed_request_delta_base; add missing object fields, replace existing fields, and remove only existing fields. Array indexes must be in bounds. Preserve original named targets and predicate. Correct this local tool argument or explicitly defer; no query was executed.' },
            canAffectRules: false, trainingTruth: false };
          operation.result = { ...body, receiptHash: hash(body) };
          operation.currentFailure = clone(operation.result);
          operation.status = 'delta_arguments_invalid_not_executed';
          operation.completed = correctionAttemptsUsed(operation) >= operation.maximumAttempts;
          invalidateSynthesis(state);
          await checkpoint(); continue;
        }
        operation.choice = corrected ? { disposition: 'retry', kind: corrected.kind,
          toolRequestJson: JSON.stringify(corrected.toolRequest), publicReason: rawChoice.publicReason }
          : { disposition: rawChoice.disposition, kind: rawChoice.kind,
            toolRequestJson: rawChoice.toolRequestJson, publicReason: rawChoice.publicReason };
      } else operation.choice = rawChoice;
      operation.choices.push(clone(operation.choice));
      operation.pendingChoice = true;
      if (!CONTEXT_CHOICES.has(operation.choice.kind)) delete operation.request;
      await checkpoint();
      }
      if (operation.choice.disposition === 'defer') {
        operation.pendingChoice = false;
        operation.status = 'model_deferred'; operation.completed = true;
        await checkpoint(); break;
      }
      if (geometryRepairWorkflow(operation.currentFailure)
        && !CONTEXT_CHOICES.has(operation.choice.kind)
        && operation.pendingGeometryChoiceKind !== 'candidate_parameters') {
        // A recoverable tool-use error, not a terminal schema exception or a
        // repeated Native collision query. Keep the paid choice and its bound.
        operation.pendingChoice = false;
        operation.previousResults ||= [];
        if (operation.result) operation.previousResults.push(clone(operation.result));
        operation.result = geometryToolFeedback(operation);
        operation.currentFailure = clone(operation.result);
        operation.status = 'geometry_tool_reference_required';
        operation.completed = correctionAttemptsUsed(operation) >= operation.maximumAttempts;
        invalidateSynthesis(state);
        await checkpoint(); continue;
      }
      if (CONTEXT_CHOICES.has(operation.choice.kind)) {
        if (contextChoicesUsed(operation) > operation.maximumContextReads) {
          operation.pendingChoice = false;
          operation.status = 'context_read_budget_exhausted_query_unresolved';
          operation.completed = true;
          await checkpoint(); break;
        }
        // Inspection has no query-answer semantics and therefore does not pass
        // or fail named-query scope. The eventual executable correction still
        // uses the existing exact scope audit below. Keep paid choices and the
        // original failed result separate from this durable read-only context.
        const request = { kind: operation.choice.kind,
          toolRequest: JSON.parse(operation.choice.toolRequestJson) };
        const requestHash = hash(request);
        operation.inspections ||= [];
        const previous = operation.inspections.find(row => row.requestHash === requestHash);
        let result;
        if (previous) result = clone(previous.result);
        else {
          try {
            if (request.kind === 'inspect') {
              validateRosterTeachInspectionRequestV1(request.toolRequest);
              result = { queryContext: await evidencePort.describeQueryContext(request.toolRequest.branchIdRef || '') };
            } else if (request.kind === 'prerequisite_query') {
              const prerequisite = validateRosterTeachPrerequisiteQueryV1(operation.currentFailure, request.toolRequest);
              const queryReceipt = await evidencePort.query({ ...scope,
                challengeId: `${operation.queryId}-context-${requestHash.slice(0, 12)}`, request: prerequisite });
              result = { queryReceipt, status: queryReceipt.status === 'unknown' ? 'unknown' : 'advisory' };
            } else if (typeof readRetainedEvidence === 'function') {
              result = { retrievedEvidence: await readRetainedEvidence(request.toolRequest) };
            } else {
              throw Object.assign(Error('ROSTER_TEACH_RECOVERY_EVIDENCE_READER_UNAVAILABLE'),
                { code: 'ROSTER_TEACH_RECOVERY_EVIDENCE_READER_UNAVAILABLE' });
            }
            result.status ||= 'advisory';
          } catch (error) {
            const code = String(error.code || error.message || '').split(':')[0];
            if (!/^(ROSTER_TEACH_|PREGAME_LAB_)/u.test(code)) throw error;
            result = { status: 'unknown', unknownReasonCode: code,
              ...(error.queryRepair?.sourceContract === 'roster_retained_evidence_path_v1'
                ? { queryRepair: clone(error.queryRepair) } : {}),
              instruction: 'This read did not resolve its reference. Do not use another source implicitly; correct the reference or defer.' };
          }
          Object.assign(result, { contextOnlyNotStrategyProof: true, originalQueryNotAnswered: true,
            canAffectRules: false, trainingTruth: false });
        }
        operation.inspections.push({ choiceIndex: operation.choices.length - 1,
          requestHash, request, result, ...(previous ? { reusedFromChoiceIndex: previous.choiceIndex } : {}) });
        operation.pendingChoice = false;
        operation.status = 'inspection_complete_query_unresolved';
        operation.completed = correctionAttemptsUsed(operation) >= operation.maximumAttempts;
        await checkpoint();
        continue;
      }
      operation.request = { kind: operation.choice.kind, toolRequest: JSON.parse(operation.choice.toolRequestJson) };
      operation.lastQueryChoice = clone(operation.choice);
      const assessment = assessRosterTeachQueryCorrectionScopeV1(target.request, operation.request, scopeOptions);
      operation.scopeAssessment = assessment;
      if (!assessment.sameNamedScope) {
        operation.pendingChoice = false;
        operation.result = scopeFailure(operation, assessment);
        operation.currentFailure = clone(operation.result);
        operation.status = 'scope_changed_not_executed';
        invalidateSynthesis(state);
        await checkpoint(); continue;
      }
      const predicateAssessment = assessRosterTeachQueryRepairPredicatesV1(operation.currentFailure, operation.request);
      if (!predicateAssessment.sameFailedPredicates) {
        operation.pendingChoice = false;
        if (operation.result) {
          operation.previousResults ||= [];
          operation.previousResults.push(clone(operation.result));
        }
        operation.result = predicateFailure(operation, predicateAssessment);
        operation.currentFailure = clone(operation.result);
        operation.status = 'query_predicate_dropped';
        operation.completed = correctionAttemptsUsed(operation) >= operation.maximumAttempts;
        invalidateSynthesis(state);
        await checkpoint(); continue;
      }
      const repeatedCorrection = operation.choices.slice(0, -1).some(choice => {
        if (choice.disposition !== 'retry') return false;
        try { return hash(operation.request) === hash({ kind: choice.kind,
          toolRequest: JSON.parse(choice.toolRequestJson) }); } catch { return false; }
      });
      const firstExecutionAfterScopeFix = operation.scopeTransportRecovery?.pendingFirstExecution === true
        && operation.scopeTransportRecovery.requestHash === hash(operation.request)
        && operation.result?.queryNotExecuted === true;
      if (!firstExecutionAfterScopeFix && (hash(operation.request) === hash(target.request) || repeatedCorrection)) {
        operation.pendingChoice = false;
        const prior = operation.currentFailure;
        const { receiptHash: _oldHash, ...priorBody } = prior;
        const body = { ...priorBody, challengeId: operation.queryId, questionId: target.questionId,
          queryRecoveryOf: target.queryId, status: 'unknown',
          unknownReasonCode: 'ROSTER_TEACH_RECOVERY_REQUEST_UNCHANGED', queryNotExecuted: true,
          priorExecutionReasonCode: prior.priorExecutionReasonCode || prior.unknownReasonCode,
          queryRepair: { ...prior.queryRepair, correctable: true,
            reasonCode: 'ROSTER_TEACH_RECOVERY_REQUEST_UNCHANGED', unchangedRequest: true,
            actualRequestHash: hash(operation.request),
            unchangedRequestInstruction: 'The submitted structured request is identical to an already failed request, regardless of publicReason. No query was repeated. Change the causal fields identified by failureTargets in the actual toolRequestJson, or explicitly defer; do not just claim a correction in prose.' } };
        operation.previousResults ||= [];
        if (operation.result) operation.previousResults.push(clone(operation.result));
        operation.result = { ...body, receiptHash: hash(body) };
        operation.currentFailure = clone(operation.result);
        operation.status = 'unchanged_failed_request_not_repeated';
        operation.completed = correctionAttemptsUsed(operation) >= operation.maximumAttempts;
        invalidateSynthesis(state);
        await checkpoint(); continue;
      }
      await checkpoint();
      if (operation.result) {
        operation.previousResults ||= [];
        operation.previousResults.push(clone(operation.result));
      }
      const retainedReceipt = reusablePrerequisiteReceipt(operation, operation.request);
      operation.result = { ...(retainedReceipt ? clone(retainedReceipt) : await evidencePort.query({ ...scope,
        challengeId: operation.queryId, request: operation.request })),
        ...(retainedReceipt ? { evidenceReuse: { version: 1,
          originalReceiptHash: retainedReceipt.receiptHash,
          exactRequestAndSource: true, explicitModelSubmission: true,
          strategyConclusionPromoted: false, newNativeExecutions: 0 } } : {}),
        questionId: target.questionId, queryRecoveryOf: target.queryId };
      operation.status = operation.result.status;
      if (firstExecutionAfterScopeFix) operation.scopeTransportRecovery.pendingFirstExecution = false;
      operation.pendingChoice = false;
      // Query-result completion and synthesis invalidation share a checkpoint;
      // a crash cannot retain a stale synthesis as the final new result.
      invalidateSynthesis(state);
      operation.completed = operation.result.status !== 'unknown'
        || operation.result.queryRepair?.correctable !== true
        || correctionAttemptsUsed(operation) >= operation.maximumAttempts;
      continueRosterTeachNativeGeometryProgressV1(operation);
      if (!operation.completed) operation.currentFailure = clone(operation.result);
      await checkpoint();
    }
    operation.completed = true;
    await checkpoint();
  }
  if (selected) selected.completed = true;
  await checkpoint();
  return recovery.operations.filter(op => op.result).map(op => op.result);
}
