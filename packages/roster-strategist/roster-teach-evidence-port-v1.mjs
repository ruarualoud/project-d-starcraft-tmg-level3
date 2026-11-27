import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { STARCRAFT_TMG_TACTICAL_RELATIONSHIP_INTENTS_V1 } from
  "../online-agent-session/tactical-relationship-graph-v1.mjs";
import { verifyPregameSceneLaboratoryDescriptorV1, verifyPregameLabScenarioBranchReceiptV1,
  verifyPregameLabSpatialReceiptV1,
  parsePregameNativeActionInputV1, describePregameNativeInstantiationRepairV1 } from
  "./pregame-scene-laboratory-v1.mjs";
import { createRosterToolReceiptReferenceV1 } from
  "./roster-plan-contracts-v1.mjs";
import { STARCRAFT_TMG_SPATIAL_QUERY_CONTRACTS_V1 } from
  "../online-agent-session/spatial-query-contracts-v1.mjs";
import { rosterTeachReplacementCapabilityV1 } from './roster-teach-capability-guide-v1.mjs';
import { normalizeRosterTeachQueryDispatchV1 } from './roster-teach-query-dispatch-v1.mjs';
import { inspectStarcraftTmgActionParametersV1 } from
  '../online-agent-session/action-parameter-contract-v1.mjs';
import { describeOfficialSelectedRosterChargeParameterRepairV1 } from
  '../product-composition/official-selected-roster-charge-parameter-contract-v1.mjs';
export { normalizeRosterTeachQueryDispatchV1 } from './roster-teach-query-dispatch-v1.mjs';

export const ROSTER_TEACH_EVIDENCE_PORT_SCHEMA =
  "starcraft_tmg_roster_teach_evidence_port_v1";
export const ROSTER_TEACH_EVIDENCE_RECEIPT_SCHEMA =
  "starcraft_tmg_roster_teach_evidence_receipt_v1";

const KINDS = new Set([
  "probability", "spatial", "map_route", "math", "threat_exchange",
  "scenario",
]);
const REQUIRED_LAB_KINDS = [
  "probability", "spatial", "math", "threat_exchange", "scenario",
];
const HASH = /^[a-f0-9]{64}$/u;
const SPATIAL_INTENTS = new Set(
  STARCRAFT_TMG_TACTICAL_RELATIONSHIP_INTENTS_V1);

function fail(code) { throw new Error(code); }

export function resolveRosterTeachScenarioStateReferenceV1(ref, directory) {
  if (!HASH.test(String(ref || ''))) return null;
  const matches = directory.filter(row => row.branchStateHash === ref && row.scenarioReceiptHash);
  // Multiple aliases of ONE verified receipt are identical. Different causal
  // histories that happen to reach the same state remain explicit choices.
  if (!matches.length || new Set(matches.map(row => row.scenarioReceiptHash)).size !== 1) return null;
  return matches[0].branchIdRef;
}
function object(value) {
  return value !== null && typeof value === "object"
    && !Array.isArray(value);
}
function clone(value) { return structuredClone(value); }
function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}
function id(value) {
  if (typeof value !== "string" || !/^[a-zA-Z0-9_-]{1,120}$/u.test(value)) {
    fail("ROSTER_TEACH_EVIDENCE_CHALLENGE_ID_INVALID");
  }
  return value;
}

// The Rules query runtime already owns parameter-repair vs replan decisions.
// Preserve its typed verdict, rather than maintaining a growing error-name
// whitelist in Teach. A matching Native envelope is required; model prose or
// an arbitrary similarly named field is not a recovery authorization.
function nativeQueryRepair(receipt) {
  const native = receipt?.queryReceipt;
  if (native?.schemaVersion !== 'starcraft_tmg_spatial_action_query_runtime_v1.result'
    || native.status !== 'unknown' || native.reason !== receipt.unknownReason
    || typeof native.mayRepairSameChoice !== 'boolean'
    || !HASH.test(String(native.queryReceiptHash || ''))) return null;
  return { sourceContract: native.schemaVersion, queryReceiptHash: native.queryReceiptHash,
    reasonCode: native.reason, failureStage: native.failureStage || null,
    safeFailureClass: native.safeFailureClass || null,
    mayRepairSameChoice: native.mayRepairSameChoice,
    repairContext: clone(native.repairContext || null) };
}

// Repair transport metadata from the original Native reply, not a second
// execution. The failed query and successful siblings remain immutable facts.
function retainedNativeInputRepair(request, receipt, queryContext) {
  if (receipt?.status !== 'unknown' || receipt.nativeInputRepairProjection
    || request?.kind !== 'scenario' || request.toolRequest?.spec?.kind !== 'native_action') return null;
  if(receipt.queryRepair?.sourceContract==='pregame_native_action_input_v1'){
    if(!request.toolRequest.branchIdRef || receipt.queryRepair.scenarioContinuation || !queryContext)return null;
    if(queryContext.baseStateHash!==receipt.queryRepair.baseStateHash
      ||queryContext.sourceStateHash!==receipt.queryRepair.sourceStateHash)
      fail('ROSTER_TEACH_RETAINED_NATIVE_QUERY_CONTEXT_CHANGED');
    // The Native denial already has correct fields; only its parent transport
    // alias was omitted. Reproject the saved error, never rerun the action.
    return clone(receipt.queryRepair);
  }
  try {
    const args=parsePregameNativeActionInputV1(request.toolRequest);
    if(receipt.unknownReasonCode==='PREGAME_LAB_NATIVE_ACTION_REJECTED' && queryContext){
      const domain=queryContext.actionSpace?.parameterDomains?.find(row=>row.domainId===args.domainId
        && row.sideKey===(request.toolRequest.seatKey||queryContext.activeSideKey));
      if(!domain)return null;
      const inspected=inspectStarcraftTmgActionParametersV1(domain,args.parameters);
      if(!inspected.valid)return {
        sourceContract:'pregame_native_action_input_v1',correctable:!inspected.requiresReplan,
        reasonCode:receipt.unknownReasonCode,originalQueryNotAnswered:true,
        currentSubmissionContractReason:'PREGAME_LAB_NATIVE_ACTION_PARAMETER_CONTRACT_INVALID',
        parameterContract:inspected.parameterContract,fieldIssues:inspected.fieldIssues,
        currentInputInspectionOnly:true,hostSelectsDomain:false,
        failureTargets:[{requestPointer:'/toolRequest/argumentsJson',requestKind:'scenario',
          failureOrigin:'native_action_input_contract',receivedValue:request.toolRequest.argumentsJson,
          correctionInstruction:'Correct the actual selected domain parameters using fieldIssues/parameterContract. This rechecks only submission shape on the SAME parent; the original Native failure remains unchanged. No geometry result or alternate action was chosen. Use available geometry solvers rather than inventing base clearance.'}],
      };
      // Older lab replies lost instantiation-stage repair metadata. The saved
      // spatial/geometry code identifies that stage; never replay the action.
      const detail=String(receipt.queryErrorDetail||'').replace(/^PREGAME_LAB_NATIVE_ACTION_REJECTED:/u,'');
      if(/^(?:MODEL_BASE_GEOMETRY_|SELECTED_SPATIAL_)/u.test(detail)){
        return describePregameNativeInstantiationRepairV1(request.toolRequest,domain,new Error(detail));
      }
    }
  }
  catch (error) {
    if (error.queryRepair?.sourceContract === 'pregame_native_action_input_v1'
      && error.code === receipt.unknownReasonCode) return error.queryRepair;
  }
  return null;
}

function retainedParameterReview(failure, queryContext) {
  if (failure.requestKind !== 'spatial' || !failure.nativeQueryRepair) return null;
  let args;
  try { args = JSON.parse(failure.request.argumentsJson); } catch { return null; }
  const domain = queryContext?.actionSpace?.parameterDomains?.find(row => row.domainId === args.domainId);
  if (!domain) return null;
  const repairContext = describeOfficialSelectedRosterChargeParameterRepairV1(domain,
    failure.unknownReasonCode);
  if (!repairContext) return null;
  const inspected = inspectStarcraftTmgActionParametersV1(domain, args.parameters);
  if (inspected.valid) return null;
  return { ...clone(inspected), repairContext, currentInputInspectionOnly: true,
    originalQueryNotAnswered: true, nativeExecutions: 0 };
}

export function reprojectRosterTeachNativeQueryRepairV1({ request, receipt, queryContext }) {
  const inputRepair = retainedNativeInputRepair(request, receipt, queryContext);
  if (inputRepair) {
    const { receiptHash, questionId, queryRecoveryOf, ...originalBody } = receipt;
    if (hashStarcraftTmgContract(request) !== receipt.requestHash
      || hashStarcraftTmgContract(originalBody) !== receiptHash) {
      fail('ROSTER_TEACH_RETAINED_NATIVE_QUERY_RECEIPT_CHANGED');
    }
    const body = { ...originalBody, queryRepair: { ...clone(queryContext), ...inputRepair,
      modelMustChooseCorrection: true,
      ...(request.toolRequest.branchIdRef ? { scenarioContinuation: {
        branchIdRef: request.toolRequest.branchIdRef, reusesExistingParent: true,
        constructionReturnedReceipt: false } } : {}) },
      nativeInputRepairProjection: { version: 1, originalReceiptHash: receiptHash,
        nativeExecutions: 0, inputOnlyRevalidated: true,
        currentContextNotOriginalExecutionProof: true } };
    return freezeDeep({ ...body, receiptHash: hashStarcraftTmgContract(body),
      ...(questionId !== undefined ? { questionId } : {}),
      ...(queryRecoveryOf !== undefined ? { queryRecoveryOf } : {}) });
  }
  const failedChildren = (receipt?.followUpReceipts || []).filter(row => row.status === 'unknown');
  const failures = failedChildren.length ? failedChildren.map(row => ({
    requestPointer: `/toolRequest/followUps/${row.index}`, requestKind: row.kind,
    request: clone(request.toolRequest.followUps[row.index]),
    unknownReasonCode: row.unknownReasonCode,
    nativeQueryRepair: nativeQueryRepair(row.receipt),
  })) : [{ requestPointer: '/toolRequest', requestKind: request.kind,
    request: clone(request.toolRequest), unknownReasonCode: receipt?.unknownReasonCode,
    nativeQueryRepair: nativeQueryRepair(receipt?.sourceReceipt) }];
  if (receipt?.status !== 'unknown' || !failures.some(row => row.nativeQueryRepair)) return receipt;
  const { receiptHash, questionId, queryRecoveryOf, ...originalBody } = receipt;
  if (hashStarcraftTmgContract(request) !== receipt.requestHash
    || hashStarcraftTmgContract(originalBody) !== receiptHash) {
    fail('ROSTER_TEACH_RETAINED_NATIVE_QUERY_RECEIPT_CHANGED');
  }
  const source = receipt.sourceReceipt;
  const expectedBase = source?.branchStateHash || source?.baseStateHash;
  if (!HASH.test(String(expectedBase || ''))
    || queryContext?.baseStateHash !== expectedBase
    || queryContext?.sourceStateHash !== source?.sourceStateHash
    || failedChildren.some(row => row.receipt?.baseStateHash !== expectedBase
      || row.receipt?.sourceStateHash !== source.sourceStateHash)) {
    fail('ROSTER_TEACH_RETAINED_NATIVE_QUERY_CONTEXT_CHANGED');
  }
  for (const failure of failures) {
    const review = retainedParameterReview(failure, queryContext);
    if (review) failure.currentParameterContractReview = review;
  }
  const parameterReviews = failures.filter(row => row.currentParameterContractReview)
    .map(row => ({ requestPointer: row.requestPointer, review: row.currentParameterContractReview }));
  const contractReviewHash = parameterReviews.length ? hashStarcraftTmgContract(parameterReviews) : null;
  if (contractReviewHash && receipt.nativeParameterContractProjection?.contractReviewHash === contractReviewHash) return receipt;
  if (!contractReviewHash && (receipt.nativeRepairProjection
    || receipt.queryRepair?.failureTargets?.some(row => row.nativeQueryRepair))) return receipt;
  // A caller may hold an older queryRepair packet. Keep only the native
  // describeQueryContext fields, not stale errors or missing predicates.
  const context = Object.fromEntries([
    'sourceStateHash', 'baseStateHash', 'queryContracts', 'nativeSpatialQueryTool',
    'nativeSpatialQueryTransport', 'actionSpace', 'actionParameterContracts', 'phase', 'activeSideKey',
    'availableUnits', 'board', 'scenarioConstruction', 'frozenReferenceNotLiveHiddenEnemyTruth',
    'cardResources', 'resourceEvidenceScope', 'nativeAbilityReference',
    'capabilities', 'canAffectRules', 'trainingTruth',
  ].filter(key => Object.hasOwn(queryContext, key)).map(key => [key, clone(queryContext[key])]));
  const body = { ...originalBody, queryRepair: { ...context,
    correctable: failures.every(row => row.currentParameterContractReview
      ? row.currentParameterContractReview.requiresReplan === false
      : row.nativeQueryRepair?.mayRepairSameChoice === true),
    reasonCode: receipt.unknownReasonCode, failureTargets: failures,
    ...(failedChildren.length && source.branchStateHash ? {
      failedFollowUpIndices: failedChildren.map(row => row.index),
      scenarioContinuation: { branchIdRef: receipt.challengeId,
        constructionReturnedReceipt: true, constructionIsNotPlacementOrArrivalProof: true,
        instruction: 'The retained scenario is unchanged. Repair the indicated follow-up in this branch. Static geometry is not proof of an executable move or legal arrival.' },
    } : {}),
    modelMustChooseCorrection: true, originalQueryNotAnswered: true,
  }, nativeRepairProjection: { version: 1, originalReceiptHash: receiptHash,
    nativeExecutions: 0, sourceAndChildReceiptsUnchanged: true },
  ...(contractReviewHash ? { nativeParameterContractProjection: {
    version: 1, originalReceiptHash: receiptHash, contractReviewHash,
    nativeExecutions: 0, currentContextNotOriginalExecutionProof: true,
  } } : {}) };
  return freezeDeep({ ...body, receiptHash: hashStarcraftTmgContract(body),
    ...(questionId !== undefined ? { questionId } : {}),
    ...(queryRecoveryOf !== undefined ? { queryRecoveryOf } : {}) });
}

import {assessRosterTeachEvidenceReadinessV1} from './roster-teach-evidence-readiness-v1.mjs';
export {assessRosterTeachEvidenceReadinessV1} from './roster-teach-evidence-readiness-v1.mjs';

// Teach is a real tool consumer, just like Foundation. Carry its immutable
// laboratory evidence into the final plan rather than losing the citations
// when only Foundation information-needs are converted to tool references.
// "attached" proves receipt existence, NOT that an unknown query was answered.
export function projectRosterTeachEvidenceReferencesV1(evidenceReceipts,
  { toolId } = {}) {
  const references = [];
  const seen = new Set();
  const kind = value => value === "math" ? "math"
    : value === "probability" ? "probability"
    : ["spatial", "map_route"].includes(value) ? "spatial" : "simulation";
  for (const evidence of evidenceReceipts) {
    const sources = [
      { kind: evidence.requestKind, receipt: evidence.sourceReceipt },
      ...(evidence.followUpReceipts || []).map(entry => ({
        kind: entry.kind, receipt: entry.receipt,
      })),
    ];
    for (const source of sources) {
      const receipt = source.receipt;
      if (!receipt) continue;
      const { receiptHash, ...body } = receipt;
      if (receiptHash !== hashStarcraftTmgContract(body)) {
        fail("ROSTER_TEACH_EVIDENCE_RECEIPT_INVALID");
      }
      if (seen.has(receiptHash)) continue;
      seen.add(receiptHash);
      references.push(createRosterToolReceiptReferenceV1({
        referenceId: `teachref-${evidence.challengeId}-${references.length + 1}`,
        receiptKind: kind(source.kind), status: "attached", receiptHash,
        toolId, querySummaryText: receipt.queryReceipt?.status === 'rejected'
          ? `Teach ${evidence.challengeId}: supplied candidate ${receipt.queryReceipt.result.proposalHash} rejected (${receipt.queryReceipt.reason}); other candidates untested`
          : `Teach ${evidence.challengeId}: ${source.kind}; result ${receipt.resultStatus}; unknown remains unknown`,
      }));
    }
    if (!evidence.sourceReceipt) {
      references.push(createRosterToolReceiptReferenceV1({
        referenceId: `teachref-${evidence.challengeId}-${references.length + 1}`,
        receiptKind: kind(evidence.requestKind), status: "unknown", toolId,
        querySummaryText: `Teach ${evidence.challengeId}: `
          + String(evidence.unknownReasonCode || "unanswered query"),
      }));
    }
  }
  return freezeDeep(references);
}

export function createRosterTeachEvidencePortV1(laboratory, options = {}) {
  const labDescriptor = laboratory?.labDescriptor?.();
  verifyPregameSceneLaboratoryDescriptorV1(labDescriptor);
  if (typeof laboratory.proveMutationZero !== "function"
    || REQUIRED_LAB_KINDS.some((kind) => typeof laboratory[{
      probability: "queryProbability", spatial: "querySpatial",
      math: "queryMath", threat_exchange: "queryThreatExchange",
      scenario: "runScenarioBranch",
    }[kind]] !== "function")) {
    fail("ROSTER_TEACH_EVIDENCE_LABORATORY_INVALID");
  }
  // Only the Runtime may bind Foundation need IDs to this laboratory's
  // immutable scenarios. A model cannot supply an arbitrary branch hash.
  if (options.branchByNeedId !== undefined
    && !(options.branchByNeedId instanceof Map)) {
    fail("ROSTER_TEACH_EVIDENCE_BRANCH_REGISTRY_INVALID");
  }
  const branchByNeedId = new Map(options.branchByNeedId ?? []);
  for (const [needId, branchHash] of branchByNeedId) {
    if (typeof needId !== "string" || !needId
      || !HASH.test(String(branchHash))) {
      fail("ROSTER_TEACH_EVIDENCE_BRANCH_REGISTRY_INVALID");
    }
  }
  // A restart loses only the private registry, not successful positions or
  // explicitly partial failed layouts. Restore the exact saved state lazily;
  // never buy another answer,
  // re-solve a formation, or re-execute the scenario's follow-up queries.
  const retainedScenarios = new Map((options.retainedScenarios || []).filter(row =>
    row.request?.kind === "scenario" && row.receipt?.sourceReceipt?.branchStateHash)
    .map(row => [row.challengeId, row]));
  // A retained Native query already identifies the exact scene it observed.
  // Bind that receipt identity only through its verified source metadata, not
  // through unit-name similarity, model prose or an arbitrary caller hash.
  const queryReceiptScenes = new Map();
  for (const receipt of options.retainedQueryReceipts || []) {
    if (receipt?.schema !== 'starcraft_tmg_pregame_lab_spatial_receipt_v1'
      || receipt.sourceStateHash !== labDescriptor.sourceStateHash
      || receipt.builderBundleHash !== labDescriptor.builderBundleHash
      || receipt.rulesRuntimeHash !== labDescriptor.rulesRuntimeHash) continue;
    const scene = [...retainedScenarios].find(([, row]) =>
      row.receipt.sourceReceipt.branchStateHash === receipt.baseStateHash);
    if (!scene) continue;
    verifyPregameLabSpatialReceiptV1(receipt);
    if (queryReceiptScenes.has(receipt.receiptHash)
      && queryReceiptScenes.get(receipt.receiptHash) !== scene[0]) {
      fail('ROSTER_TEACH_QUERY_RECEIPT_SCENE_CONFLICT');
    }
    queryReceiptScenes.set(receipt.receiptHash, scene[0]);
  }
  // Discovery must describe the same references the resolver accepts, including
  // lazy restart state. Listing is not restoration, validation or query execution.
  // Receipt hashes identify evidence; branchIdRef identifies the exact scene.
  function describeScenarioDirectory() {
    const refs = [...new Set([...branchByNeedId.keys(), ...retainedScenarios.keys()])];
    return {
      availableFoundationBranchRefs: refs,
      availableScenarioBranches: refs.map(branchIdRef => {
        const saved = retainedScenarios.get(branchIdRef);
        const native = saved?.receipt?.sourceReceipt;
        return { branchIdRef,
          branchStateHash: branchByNeedId.get(branchIdRef) || native?.branchStateHash,
          scenarioReceiptHash: native?.receiptHash || null,
          queryReceiptRefs: [...queryReceiptScenes].filter(([, ref]) => ref === branchIdRef).map(([ref]) => ref),
          phase: saved?.request?.toolRequest?.spec?.phase || null,
          savedPlacements: (native?.hypotheticalPlacements || []).map(p => ({
            unitId: p.pieceId, xInches: p.xInches, yInches: p.yInches })),
          placementAssessment: native?.hypotheticalPlacementAssessment || null,
          restorationRequiresSourceValidation: !branchByNeedId.has(branchIdRef) };
      }),
      scenarioReferenceInstruction: 'Prefer canonical branchIdRef. Listed queryReceiptRef or branchStateHash resolves only to a unique retained scenario receipt; arbitrary or causally ambiguous hashes are not accepted. Compare saved positions and phase, not just unit names. Listing does not restore or validate the scene; restoration checks its source. Unit focus filters do not remove units from a scene.',
    };
  }
  const restoring = new Set();
  function resolveRetainedBranch(ref) {
    ref = queryReceiptScenes.get(ref) || ref;
    if (!branchByNeedId.has(ref) && !retainedScenarios.has(ref)) {
      ref = resolveRosterTeachScenarioStateReferenceV1(ref, describeScenarioDirectory().availableScenarioBranches) || ref;
    }
    if (branchByNeedId.has(ref)) return branchByNeedId.get(ref);
    const saved = retainedScenarios.get(ref);
    if (!saved) return null;
    if (restoring.has(ref)) fail("ROSTER_TEACH_RETAINED_BRANCH_CYCLE");
    restoring.add(ref);
    try {
      const native = saved.receipt.sourceReceipt;
      verifyPregameLabScenarioBranchReceiptV1(native);
      const originalSpec = saved.request.toolRequest.spec;
      const binding = {
        sourceStateHash: [native.sourceStateHash, labDescriptor.sourceStateHash],
        rulesRuntimeHash: [native.rulesRuntimeHash, labDescriptor.rulesRuntimeHash],
        builderBundleHash: [native.builderBundleHash, labDescriptor.builderBundleHash],
        specHash: [native.specHash, hashStarcraftTmgContract(originalSpec)],
      };
      const mismatches = Object.fromEntries(Object.entries(binding)
        .filter(([, [saved, current]]) => saved !== current)
        .map(([field, [saved, current]]) => [field, { saved, current }]));
      if (!["hypothetical_geometry", "native_action"].includes(native.branchKind)) {
        mismatches.branchKind = { saved: native.branchKind,
          allowed: ["hypothetical_geometry", "native_action"] };
      }
      if (Number(originalSpec.lifecycleSteps || 0) !== 0) {
        mismatches.lifecycleSteps = { saved: originalSpec.lifecycleSteps, allowed: 0 };
      }
      if (Object.keys(mismatches).length) {
        throw Object.assign(new Error("ROSTER_TEACH_RETAINED_BRANCH_SOURCE_CHANGED"), {
          code: "ROSTER_TEACH_RETAINED_BRANCH_SOURCE_CHANGED",
          detail: { branchRef: ref, mismatches, originalReceiptsPreserved: true },
        });
      }
      const parentRef = saved.request.toolRequest.branchIdRef;
      const parentHash = parentRef ? resolveRetainedBranch(parentRef) : labDescriptor.sourceStateHash;
      if (!parentHash || parentHash !== native.parentStateHash) {
        fail("ROSTER_TEACH_RETAINED_BRANCH_PARENT_CHANGED");
      }
      if (native.branchKind === 'native_action') {
        let args;
        try { args = JSON.parse(saved.request.toolRequest.argumentsJson); }
        catch { fail('ROSTER_TEACH_RETAINED_NATIVE_ACTION_ARGUMENTS_INVALID'); }
        if (hashStarcraftTmgContract(args) !== native.nativeActionInputHash
          || typeof laboratory.restoreNativeActionBranch !== 'function') {
          fail('ROSTER_TEACH_RETAINED_NATIVE_ACTION_SOURCE_CHANGED');
        }
        const restored = laboratory.restoreNativeActionBranch({ receipt: native,
          base: parentRef ? { kind: 'branch', branchStateHash: parentHash } : { kind: 'source' } });
        branchByNeedId.set(ref, restored.branchStateHash);
        return restored.branchStateHash;
      }
      if (typeof laboratory.restoreHypotheticalBranch === 'function') {
        const restored = laboratory.restoreHypotheticalBranch({ receipt: native, spec: originalSpec,
          base: parentRef ? { kind: 'branch', branchStateHash: parentHash } : { kind: 'source' } });
        if (restored.branchStateHash !== native.branchStateHash) fail('ROSTER_TEACH_RETAINED_BRANCH_STATE_CHANGED');
        branchByNeedId.set(ref, restored.branchStateHash);
        return restored.branchStateHash;
      }
      const spec = clone(originalSpec);
      spec.placements = (spec.placements || []).map(placement => {
        const exact = native.hypotheticalPlacements?.find(p => p.pieceId === placement.pieceId);
        if (!exact?.modelPositions?.length) fail("ROSTER_TEACH_RETAINED_BRANCH_POSITIONS_MISSING");
        return { ...placement, xInches: exact.xInches, yInches: exact.yInches,
          modelPositions: clone(exact.modelPositions) };
      });
      const restored = laboratory.runScenarioBranch({ branchId: native.branchId, spec,
        base: parentRef ? { kind: "branch", branchStateHash: parentHash } : { kind: "source" } });
      if (restored.branchStateHash !== native.branchStateHash) {
        fail("ROSTER_TEACH_RETAINED_BRANCH_STATE_CHANGED");
      }
      branchByNeedId.set(ref, restored.branchStateHash);
      return restored.branchStateHash;
    } finally { restoring.delete(ref); }
  }
  const descriptorBody = {
    schema: ROSTER_TEACH_EVIDENCE_PORT_SCHEMA,
    version: "1.0.12",
    laboratoryDescriptorHash: labDescriptor.descriptorHash,
    readOnly: true,
    canAffectRules: false,
    trainingTruth: false,
  };
  const descriptor = freezeDeep({ ...descriptorBody,
    descriptorHash: hashStarcraftTmgContract(descriptorBody) });
  // Top-level and scenario calls execute through the same read-only adapters.
  // A registered native queryKind is already a complete dispatch identity;
  // binding its redundant transport tag does not alter semantic arguments.
  const readOnlyQueries = {
    probability: request => laboratory.queryProbability(request),
    spatial: request => laboratory.querySpatial(request),
    threat_exchange: request => laboratory.queryThreatExchange(request),
  };
  return freezeDeep({
    descriptor: () => descriptor,
    restoreScenarioBranch(challengeId) {
      if (!resolveRetainedBranch(challengeId)) fail('ROSTER_TEACH_EVIDENCE_BRANCH_REF_UNKNOWN');
    },
    // A repeated immutable scenario is not a second live action. Reuse its
    // exact evidence and expose the new query label as an alias of the SAME
    // private branch, so later reads do not see an unregistered handle.
    reuseScenarioBranch({ request, receipt, sourceChallengeId }) {
      if (request?.kind !== 'scenario' || receipt?.requestHash !== hashStarcraftTmgContract(request)) {
        fail('ROSTER_TEACH_REUSED_SCENARIO_REQUEST_CHANGED');
      }
      const native = receipt.sourceReceipt;
      verifyPregameLabScenarioBranchReceiptV1(native);
      if (native.sourceStateHash !== labDescriptor.sourceStateHash
        || native.rulesRuntimeHash !== labDescriptor.rulesRuntimeHash
        || native.builderBundleHash !== labDescriptor.builderBundleHash
        || native.specHash !== hashStarcraftTmgContract(request.toolRequest.spec)) {
        fail('ROSTER_TEACH_REUSED_SCENARIO_SOURCE_CHANGED');
      }
      const branchHash = resolveRetainedBranch(sourceChallengeId);
      if (!branchHash || branchHash !== native.branchStateHash) {
        fail('ROSTER_TEACH_REUSED_SCENARIO_BRANCH_UNAVAILABLE');
      }
      const alias = id(receipt.challengeId);
      if (branchByNeedId.has(alias) && branchByNeedId.get(alias) !== branchHash) {
        fail('ROSTER_TEACH_REUSED_SCENARIO_ALIAS_CONFLICT');
      }
      branchByNeedId.set(alias, branchHash);
      retainedScenarios.set(alias, { challengeId: alias, request: clone(request), receipt: clone(receipt) });
    },
    reprojectSavedNativeQueryFailure({ request, receipt }) {
      if(receipt?.status==='unknown' && !receipt.nativeInputRepairProjection
        && receipt.queryRepair?.sourceContract==='pregame_native_action_input_v1'
        && !receipt.queryRepair.scenarioContinuation && request.toolRequest?.branchIdRef){
        const branchStateHash=resolveRetainedBranch(request.toolRequest.branchIdRef);
        if(!branchStateHash)fail('ROSTER_TEACH_EVIDENCE_BRANCH_REF_UNKNOWN');
        return reprojectRosterTeachNativeQueryRepairV1({request,receipt,
          queryContext:laboratory.describeQueryContext({base:{kind:'branch',branchStateHash}})});
      }
      if (receipt?.status !== 'unknown' || receipt.nativeInputRepairProjection
        || receipt.nativeParameterContractProjection?.version === 1) return receipt;
      if ((receipt.nativeRepairProjection || receipt.queryRepair?.failureTargets?.some(row => row.nativeQueryRepair))
        && !receipt.queryRepair?.failureTargets?.some(row => retainedParameterReview(row, receipt.queryRepair))) return receipt;
      if (!nativeQueryRepair(receipt.sourceReceipt)
        && !(receipt.followUpReceipts || []).some(row => nativeQueryRepair(row.receipt))
        && !retainedNativeInputRepair(request, receipt)
        && !(request?.kind==='scenario' && request.toolRequest?.spec?.kind==='native_action'
          && receipt.unknownReasonCode==='PREGAME_LAB_NATIVE_ACTION_REJECTED')) return receipt;
      const branchIdRef = request.kind === 'scenario' && receipt.sourceReceipt?.branchStateHash
        ? receipt.challengeId : request.toolRequest.branchIdRef;
      const branchStateHash = branchIdRef ? resolveRetainedBranch(branchIdRef) : null;
      if (branchIdRef && !branchStateHash) fail('ROSTER_TEACH_EVIDENCE_BRANCH_REF_UNKNOWN');
      return reprojectRosterTeachNativeQueryRepairV1({ request, receipt,
        queryContext: laboratory.describeQueryContext({ base: branchStateHash
          ? { kind: 'branch', branchStateHash } : { kind: 'source' } }) });
    },
    describeQueryContext(branchIdRef = "") {
      const branchStateHash = branchIdRef ? resolveRetainedBranch(branchIdRef) : null;
      if (branchIdRef && !branchStateHash) {
        fail("ROSTER_TEACH_EVIDENCE_BRANCH_REF_UNKNOWN");
      }
      return { ...laboratory.describeQueryContext({ base: branchIdRef
        ? { kind: "branch", branchStateHash }
        : { kind: "source" } }), ...describeScenarioDirectory() };
    },
    async query(query = {}) {
      if (query.mutationAuthority !== false
        || !HASH.test(String(query.initialFoundationHash || ""))
        || !Array.isArray(query.sourceHashes)
        || query.sourceHashes.length < 1
        || query.sourceHashes.some((value) => !HASH.test(String(value)))) {
        fail("ROSTER_TEACH_EVIDENCE_SCOPE_INVALID");
      }
      const challengeId = id(query.challengeId);
      let request = query.request, dispatchNormalization = null, dispatchFailure = null;
      try {
        ({ request, normalization: dispatchNormalization } = normalizeRosterTeachQueryDispatchV1(query.request));
      } catch (error) {
        // A model's contradictory tool envelope is correctable input, not an
        // uncertain Provider send or an engine crash. Execute neither choice.
        if (error.code !== 'ROSTER_TEACH_QUERY_DISPATCH_AMBIGUOUS') throw error;
        dispatchFailure = error;
      }
      if (!object(request) || !KINDS.has(request.kind)
        || !object(request.toolRequest)) {
        fail("ROSTER_TEACH_EVIDENCE_REQUEST_INVALID");
      }
      const toolRequest = clone(request.toolRequest);
      // Teach reads the frozen source or an explicitly referenced Foundation
      // scenario, never a mutable Room or an implicitly selected challenge.
      if (Object.hasOwn(toolRequest, "base")
        || Object.hasOwn(toolRequest, "queryId")
        || Object.hasOwn(toolRequest, "branchId")) {
        fail("ROSTER_TEACH_EVIDENCE_BASE_OVERRIDE_FORBIDDEN");
      }
      const queryId = `teach-${challengeId}`;
      let sourceReceipt = null;
      let unknownReasonCode = dispatchFailure?.code || null;
      let queryErrorDetail = dispatchFailure?.message || null;
      let sourceQueryRepair = dispatchFailure ? {
        sourceContract: ROSTER_TEACH_EVIDENCE_PORT_SCHEMA,
        correctable: true, reasonCode: dispatchFailure.code,
        requiredRequestKind: 'spatial', requestedNativeQueryKind: toolRequest.queryKind,
        correctionInstruction: 'Choose one query contract for the original question. To use the explicitly named Native query, use kind=spatial, keep its argumentsJson, and leave inactive family fields neutral. For construction plus a query, use kind=scenario with its spec, leave the outer queryKind empty and place an explicit kind=spatial/queryKind/argumentsJson operation in followUps. Creating static geometry alone does not answer movement or arrival legality. Otherwise remove the conflicting Native selector and use the intended family contract. No query was executed; the host did not choose either interpretation.',
        failureTargets: [{ requestPointer: '/toolRequest', requestKind: request.kind,
          request: clone(request.toolRequest), unknownReasonCode: dispatchFailure.code,
          queryErrorDetail: dispatchFailure.message }],
      } : null;
      const followUpReceipts = [];
      let base = { kind: "source" };
      const branchIdRef = toolRequest.branchIdRef;
      delete toolRequest.branchIdRef;
      if (!dispatchFailure && branchIdRef !== undefined && branchIdRef !== "") {
        const branchHash = resolveRetainedBranch(branchIdRef);
        if (!branchHash) {
          unknownReasonCode = "ROSTER_TEACH_EVIDENCE_BRANCH_REF_UNKNOWN";
        } else if (["math", "map_route"].includes(request.kind)) {
          unknownReasonCode = "ROSTER_TEACH_EVIDENCE_BRANCH_KIND_UNSUPPORTED";
        } else {
          base = { kind: "branch", branchStateHash: branchHash };
        }
      }
      const common = { ...toolRequest, base };
      let repairBase = base;
      // The lab's lifecycle-branch shorthand advances an arbitrary first
      // legal actor. It is not a forecast of a named opponent response.
      if (unknownReasonCode !== null) {
        // An unresolved reference must not silently fall back to source.
      } else if (!["spatial", "scenario"].includes(request.kind)
        && Object.hasOwn(STARCRAFT_TMG_SPATIAL_QUERY_CONTRACTS_V1, toolRequest.queryKind)) {
        // A named native query must not disappear inside another family's
        // adapter (map.inspect previously became route_to_objective). Ask for
        // the correct envelope; do not execute or guess a different query.
        unknownReasonCode = "ROSTER_TEACH_NATIVE_QUERY_FAMILY_MISMATCH";
        sourceQueryRepair = {
          sourceContract: ROSTER_TEACH_EVIDENCE_PORT_SCHEMA, correctable: true,
          reasonCode: unknownReasonCode, requiredRequestKind: "spatial",
          requestedNativeQueryKind: toolRequest.queryKind,
          correctionInstruction: "Keep the named native queryKind and its native argumentsJson, and set evidence request kind to spatial. The current family would execute a different tool. No query was executed, and no side/route parameters were inferred.",
          failureTargets: [{ requestPointer: "/toolRequest", requestKind: request.kind,
            request: clone(request.toolRequest), unknownReasonCode }],
        };
      } else if (request.kind !== "scenario"
        && (toolRequest.spec?.kind
          || toolRequest.spec?.placements?.length
          || Number(toolRequest.spec?.lifecycleSteps || 0) > 0
          || toolRequest.followUps?.length)) {
        // The shared wire schema includes empty scenario placeholders for
        // every query kind. Nonempty scenario data is different: it cannot
        // be ignored while claiming this question queried the source scene.
        // Ask the model to fix the family, never execute an inferred scenario.
        unknownReasonCode = "ROSTER_TEACH_QUERY_KIND_SCENARIO_REQUIRED";
      } else if (request.kind === "math"
        && toolRequest.mathKind === "budget_fit") {
        unknownReasonCode =
          "ROSTER_TEACH_BUDGET_FIT_REQUIRES_SELECTED_ROSTER_AUDIT";
        const replacement = rosterTeachReplacementCapabilityV1(request,
          laboratory.describeQueryContext({ base: { kind: 'source' } }));
        if (replacement) sourceQueryRepair = { replacementCapability: replacement,
          correctionInstruction: replacement.instruction };
      } else if (request.kind === "spatial"
        && !toolRequest.queryKind && !SPATIAL_INTENTS.has(toolRequest.intent)) {
        unknownReasonCode = "ROSTER_TEACH_SPATIAL_INTENT_UNTYPED";
      } else if (request.kind === "map_route"
        && typeof laboratory.routeToObjective !== "function") {
        unknownReasonCode = "ROSTER_TEACH_MAP_ROUTE_UNAVAILABLE";
      } else if (request.kind === "scenario"
        && Number(toolRequest.spec?.lifecycleSteps || 0) > 0) {
        unknownReasonCode =
          "ROSTER_TEACH_UNNAMED_LIFECYCLE_IS_NOT_OPPONENT_FORECAST";
      } else {
        try {
          switch (request.kind) {
            case "probability":
            case "spatial":
              sourceReceipt = await readOnlyQueries[request.kind]({ ...common, queryId });
              break;
            case "map_route":
              sourceReceipt = laboratory.routeToObjective({ queryId,
                sideId: toolRequest.sideId, baseId: toolRequest.baseId,
                targetId: toolRequest.targetId });
              if (sourceReceipt?.mapBinding?.sourceStateHash
                !== labDescriptor.sourceStateHash) {
                fail("ROSTER_TEACH_MAP_ROUTE_SOURCE_MISMATCH");
              }
              if (sourceReceipt.resultStatus
                  === "certified_reachability_audit"
                && (!HASH.test(String(
                  sourceReceipt.mapBinding.roomFreezeHash || ""))
                  || sourceReceipt.exactMoveOrDeploymentLegality !== false)) {
                fail("ROSTER_TEACH_MAP_ROUTE_RECEIPT_INVALID");
              }
              break;
            case "math":
              sourceReceipt = laboratory.queryMath({ ...common, queryId });
              break;
            case "threat_exchange":
              sourceReceipt = await readOnlyQueries.threat_exchange({
                ...common, queryId });
              break;
            case "scenario":
              sourceReceipt = laboratory.runScenarioBranch({
                ...common, branchId: queryId });
              branchByNeedId.set(challengeId, sourceReceipt.branchStateHash);
              repairBase = { kind: "branch",
                branchStateHash: sourceReceipt.branchStateHash };
              for (const [index, followUp] of (toolRequest.followUps || []).entries()) {
                const requestedKind = followUp.kind || null;
                const nativeKind = followUp.queryKind || null;
                const nativeNameAsKind = requestedKind
                  && Object.hasOwn(STARCRAFT_TMG_SPATIAL_QUERY_CONTRACTS_V1, requestedKind);
                const nativeBound = nativeNameAsKind || (!requestedKind && nativeKind
                  && Object.hasOwn(STARCRAFT_TMG_SPATIAL_QUERY_CONTRACTS_V1, nativeKind));
                const resolvedKind = nativeNameAsKind ? "spatial"
                  : requestedKind || (nativeBound ? "spatial" : null);
                let receipt = null;
                let reason = null;
                let detail = null;
                if (["base", "queryId", "branchId"].some(field =>
                  Object.hasOwn(followUp, field))) {
                  fail("ROSTER_TEACH_EVIDENCE_BASE_OVERRIDE_FORBIDDEN");
                }
                let followRequest = { ...clone(followUp), kind: resolvedKind, base: repairBase,
                  queryId: `${queryId}-follow-${index + 1}` };
                // A declared native tool name identifies one exact query, not
                // a guessed tactic. Preserve all its arguments in the native
                // container. Conflicting names/containers remain errors.
                if (nativeNameAsKind) {
                  const { kind: _kind, queryKind: _queryKind, seatKey, argumentsJson, ...nativeArgs } = followUp;
                  if ((nativeKind && nativeKind !== requestedKind)
                    || (argumentsJson !== undefined && Object.keys(nativeArgs).length)) {
                    reason = "ROSTER_TEACH_SCENARIO_FOLLOWUP_KIND_UNSUPPORTED";
                    detail = "Conflicting native query names or argument containers; no request was dispatched.";
                  } else {
                    followRequest = { kind: "spatial", queryKind: requestedKind,
                      ...(seatKey !== undefined ? { seatKey } : {}),
                      argumentsJson: argumentsJson ?? JSON.stringify(nativeArgs),
                      base: repairBase, queryId: `${queryId}-follow-${index + 1}` };
                  }
                }
                try {
                  if (reason) {
                    // Do not dispatch a conflicting tool identity.
                  } else if (!resolvedKind) {
                    reason = "ROSTER_TEACH_SCENARIO_FOLLOWUP_KIND_REQUIRED";
                  } else if (resolvedKind === "spatial") {
                    if (!followRequest.queryKind && !SPATIAL_INTENTS.has(followRequest.intent)) {
                      reason = "ROSTER_TEACH_SPATIAL_INTENT_UNTYPED";
                    } else receipt = await readOnlyQueries.spatial(followRequest);
                  } else if (resolvedKind === 'inspect') {
                    // Inspect the newly constructed child, not the source or
                    // its parent. This is the same read-only context used by
                    // the standalone inspector, not new strategy evidence.
                    const requestedInspectionHash = followUp.branchIdRef
                      ? resolveRetainedBranch(followUp.branchIdRef) : repairBase.branchStateHash;
                    if (Object.keys(followUp).some(key => !['kind', 'branchIdRef'].includes(key))
                      || requestedInspectionHash !== repairBase.branchStateHash) {
                      reason = 'PREGAME_LAB_INSPECTION_ARGUMENTS_INVALID';
                      detail = 'A scenario inspect follow-up observes its resulting branch. Omit branchIdRef, keep it empty, or reference a verified alias of that exact child state. Other branches require a standalone inspect.';
                    } else {
                      const queryContext = laboratory.describeQueryContext({ base: repairBase });
                      const body = { schema: 'starcraft_tmg_pregame_lab_inspection_receipt_v1',
                        queryId: followRequest.queryId, sourceStateHash: labDescriptor.sourceStateHash,
                        baseStateHash: queryContext.baseStateHash, resultStatus: 'ok',
                        queryContext: clone(queryContext), contextOnlyNotStrategyProof: true,
                        mutationAuthority: false, trainingTruth: false };
                      receipt = { ...body, receiptHash: hashStarcraftTmgContract(body) };
                    }
                  } else if (Object.hasOwn(readOnlyQueries, resolvedKind)) {
                    receipt = await readOnlyQueries[resolvedKind](followRequest);
                  } else {
                    reason = "ROSTER_TEACH_SCENARIO_FOLLOWUP_KIND_UNSUPPORTED";
                  }
                } catch (error) {
                  const code = String(error?.code || error?.message || "").split(":")[0];
                  if (!/^PREGAME_LAB_[A-Z0-9_]+$/u.test(code)) throw error;
                  reason = code;
                  detail = String(error?.message || code);
                }
                if (receipt && !HASH.test(String(receipt.receiptHash || ""))) {
                  fail("ROSTER_TEACH_EVIDENCE_RECEIPT_INVALID");
                }
                const status = receipt?.resultStatus === "ok" ? "advisory" : "unknown";
                followUpReceipts.push({ index, kind: resolvedKind,
                  ...(nativeBound ? { dispatchBinding: { requestedKind,
                    nativeQueryKind: nativeNameAsKind ? requestedKind : nativeKind, resolvedKind,
                    bindingSource: "shared_native_query_registry", semanticArgumentsChanged: false } } : {}),
                  status, receipt: clone(receipt),
                  ...(detail ? { queryErrorDetail: detail } : {}),
                  unknownReasonCode: reason ?? receipt?.unknownReason ?? null });
                if (status === "unknown" && unknownReasonCode === null) {
                  unknownReasonCode = reason ?? receipt?.unknownReason
                    ?? "ROSTER_TEACH_SCENARIO_FOLLOWUP_UNKNOWN";
                }
              }
              break;
            default: fail("ROSTER_TEACH_EVIDENCE_REQUEST_INVALID");
          }
        } catch (error) {
          const code = String(error?.code || error?.message || "").split(":")[0];
          if (!/^PREGAME_LAB_[A-Z0-9_]+$/u.test(code)) throw error;
          unknownReasonCode = code;
          queryErrorDetail = String(error?.message || code);
          // The local rejecting contract owns correction instructions. Do not
          // restrict this to one scenario contract and drop equally typed
          // arithmetic feedback when a new input error is introduced.
          if (typeof error.queryRepair?.sourceContract === "string"
            && error.queryRepair.sourceContract.length > 0
            && error.queryRepair.correctable === true
            && error.queryRepair.reasonCode === code
            && Array.isArray(error.queryRepair.failureTargets)
            && error.queryRepair.failureTargets.length > 0) {
            sourceQueryRepair = clone(error.queryRepair);
          }
        }
      }
      const mutationProof = laboratory.proveMutationZero();
      if (mutationProof.sourceStateMutationCount !== 0
        || mutationProof.sourceStateHashUnchanged !== true
        || mutationProof.builderBundleHashUnchanged !== true
        || mutationProof.rulesRuntimeHashUnchanged !== true) {
        fail("ROSTER_TEACH_EVIDENCE_MUTATION_DETECTED");
      }
      if (unknownReasonCode === null && (!object(sourceReceipt)
        || !HASH.test(String(sourceReceipt.receiptHash || "")))) {
        fail("ROSTER_TEACH_EVIDENCE_RECEIPT_INVALID");
      }
      const readiness = assessRosterTeachEvidenceReadinessV1({ sourceReceipt, followUpReceipts,
        status: unknownReasonCode ? "unknown" : "advisory", unknownReasonCode });
      unknownReasonCode ||= readiness.reasons[0] || null;
      const status = unknownReasonCode === null
        && ["ok", "certified_reachability_audit"].includes(
        sourceReceipt?.resultStatus)
        ? "advisory"
        : "unknown";
      // A child failure is not a failed scenario constructor. Keep each error
      // bound to its own request and receipt, including the native container
      // contract; reading these fields from the parent loses the actual fault.
      const failedChildren = followUpReceipts.filter(entry => entry.status === "unknown");
      // A branch handle only certifies construction, not valid geometry. Native
      // follow-ups propagate a failed placement assessment; locate that causal
      // failure at the spec rather than telling the model to preserve bad bases.
      const failedPlacements = request.kind === "scenario"
        ? (sourceReceipt?.hypotheticalPlacementAssessment?.units || [])
          .filter(unit => unit.resultStatus !== "ok") : [];
      const placementFailures = failedPlacements.map(unit => {
        const index = (toolRequest.spec?.placements || []).findIndex(p => p.pieceId === unit.pieceId);
        return { requestPointer: index < 0 ? "/toolRequest/spec" : `/toolRequest/spec/placements/${index}`,
          requestKind: "scenario", request: clone(index < 0 ? toolRequest.spec : toolRequest.spec.placements[index]),
          pieceId: unit.pieceId, unknownReasonCode: unit.unknownReason || "HYPOTHETICAL_PLACEMENT_INVALID",
          failureOrigin: "scenario_geometry", unboundArgumentFields: [],
          propagatedFollowUpIndices: failedChildren.filter(child => child.unknownReasonCode === unit.unknownReason).map(child => child.index),
          correctionInstruction: "Choose anchors and formation intent, then query space.solve_static_formation on this failed branch for each failed unit. Select its complete canonicalPlacement by candidate_parameters reference; do not handwrite modelPositions or swap model IDs to claim collision repair. Retain units, question and terrain. Rebuild and assess the combined scenario before querying it; a packing miss is not impossibility." };
      });
      const childFailures = failedChildren.map(entry => ({
        requestPointer: `/toolRequest/followUps/${entry.index}`,
        requestKind: entry.kind,
        request: clone(toolRequest.followUps[entry.index]),
        unknownReasonCode: entry.unknownReasonCode,
        unboundArgumentFields: clone(entry.receipt?.unboundArgumentFields || []),
        correctionInstruction: entry.receipt?.correctionInstruction || null,
        queryErrorDetail: entry.queryErrorDetail || null,
        ...(nativeQueryRepair(entry.receipt) ? { nativeQueryRepair: nativeQueryRepair(entry.receipt) } : {}),
      })).filter(entry => !placementFailures.some(parent => parent.unknownReasonCode === entry.unknownReasonCode));
      const failureTargets = sourceQueryRepair?.failureTargets || (placementFailures.length || childFailures.length
        ? [...placementFailures, ...childFailures] : [{ requestPointer: "/toolRequest", requestKind: request.kind,
        // Record the caller's complete request, before private branch routing.
        // Dropping branchIdRef here makes exact causal edits appear stale.
        request: clone(request.toolRequest), unknownReasonCode,
        unboundArgumentFields: clone(sourceReceipt?.unboundArgumentFields || []),
        correctionInstruction: sourceReceipt?.correctionInstruction || null,
        queryErrorDetail,
        ...(nativeQueryRepair(sourceReceipt) ? { nativeQueryRepair: nativeQueryRepair(sourceReceipt) } : {}) }]);
      const nativeRepairVerdicts = failureTargets.map(entry => entry.nativeQueryRepair).filter(Boolean);
      const primaryFailure = failureTargets.find(entry => entry.unknownReasonCode === unknownReasonCode)
        || failureTargets[0];
      const body = {
        schema: ROSTER_TEACH_EVIDENCE_RECEIPT_SCHEMA,
        challengeId,
        requestKind: request.kind,
        ...(dispatchNormalization ? { dispatchNormalization, requestedRequest: clone(query.request) } : {}),
        requestHash: hashStarcraftTmgContract(request),
        evidencePortDescriptorHash: descriptor.descriptorHash,
        initialFoundationHash: query.initialFoundationHash,
        sourceHashes: clone(query.sourceHashes),
        sourceReceipt: clone(sourceReceipt),
        ...(queryReceiptScenes.has(branchIdRef) ? { branchReferenceResolution: {
          requestedReference: branchIdRef, canonicalBranchIdRef: queryReceiptScenes.get(branchIdRef),
          authority: 'verified_retained_native_query_scope', guessed: false } } : {}),
        sourceReceiptHash: sourceReceipt?.receiptHash ?? null,
        ...(followUpReceipts.length ? { followUpReceipts } : {}),
        mutationProofHash: hashStarcraftTmgContract(mutationProof),
        status,
        evidenceReadiness: readiness,
        unknownReasonCode: unknownReasonCode
          ?? sourceReceipt?.unknownReason ?? null,
        ...(queryErrorDetail ? { queryErrorDetail } : {}),
        ...(sourceQueryRepair || nativeRepairVerdicts.length || /^(?:PREGAME_LAB_(?:PROBABILITY_(?:ATTACKER|TARGET)_(?:REQUIRED|UNKNOWN)|SEAT_INVALID|BRANCH_(?:UNKNOWN|SPEC_INVALID)|CONTROL_SCHEDULE_JSON_INVALID|MATH_INPUTS_INVALID|HYPOTHETICAL_FORMATION_NOT_FOUND)|ROSTER_TEACH_(?:EVIDENCE_BRANCH_(?:REF_UNKNOWN|KIND_UNSUPPORTED)|SPATIAL_INTENT_UNTYPED|QUERY_KIND_SCENARIO_REQUIRED|BUDGET_FIT_REQUIRES_SELECTED_ROSTER_AUDIT|SCENARIO_FOLLOWUP_(?:KIND_REQUIRED|KIND_UNSUPPORTED))|SCENE_QUERY_OUTER_ARGUMENTS_UNBOUND|CURRENT_ACTION_QUERY_DOMAIN_REFERENCE_REQUIRED|HYPOTHETICAL_SCENE_EMPTY|NO_ATTACK_ESTIMATES_IN_SELECTED_SCENE|MODEL_BASE_GEOMETRY_.*|control_windows_required|control_window_round_invalid_or_duplicate|both_actors_control_assignments_required|control_marker_not_in_frozen_mission|control_marker_duplicate_or_conflicting)$/u
          .test(String(unknownReasonCode || "")) ? {
          queryRepair: {
            ...(sourceQueryRepair || {}),
            correctable: nativeRepairVerdicts.every(verdict => verdict.mayRepairSameChoice),
            reasonCode: unknownReasonCode,
            failureTargets,
            ...(unknownReasonCode === "SCENE_QUERY_OUTER_ARGUMENTS_UNBOUND" ? {
              unboundArgumentFields: clone(primaryFailure.unboundArgumentFields),
              correctionInstruction: primaryFailure.correctionInstruction,
              requiredArgumentContainer: "argumentsJson",
              requiredArgumentContainerAppliesAt: primaryFailure.requestPointer,
            } : {}),
            ...(placementFailures.length ? {
              scenarioContinuation: { branchIdRef: challengeId,
                constructionReturnedReceipt: true, constructionIsNotPlacementOrArrivalProof: true,
                requiresScenarioRebuild: true, failedPieceIds: failedPlacements.map(unit => unit.pieceId),
                instruction: "This branch exists but its placement assessment failed. The listed geometry errors originate in toolRequest.spec.placements and propagate to later queries. Correct the actual coordinates/anchor and rebuild this hypothetical scenario; do not merely edit followUp arguments or reuse the invalid branch. Keep the original units, targets and terrain. Follow-up argument errors, if also listed, remain separate." },
              correctionInstruction: placementFailures[0].correctionInstruction,
            } : failedChildren.length && sourceReceipt?.branchStateHash ? {
              scenarioContinuation: { branchIdRef: challengeId,
                constructionReturnedReceipt: true, constructionIsNotPlacementOrArrivalProof: true,
                instruction: "The scenario constructor returned a branch. The reported errors belong to the indicated follow-up requests, not toolRequest.spec. Repair those requests in this branch or retain the original scenario spec with corrected followUps. Do not reinterpret the scenario spec as native argumentsJson." },
            } : {}),
            ...(unknownReasonCode === "PREGAME_LAB_BRANCH_SPEC_INVALID" ? {
              requiredRequestShape: { kind: "scenario", specPath: "/toolRequest/spec",
                specKind: "hypothetical_geometry", spatialQueriesPath: "/toolRequest/followUps" },
              correctionInstruction: "kind=scenario requires toolRequest.spec. A native queryKind/argumentsJson alone is a spatial request, not a scenario. Use an existing explicit branchIdRef for a spatial query or supply the original scenario with its followUps; preserve the question and named scope.",
            } : {}),
            ...(queryErrorDetail ? { queryErrorDetail } : {}),
            ...(unknownReasonCode === "PREGAME_LAB_HYPOTHETICAL_FORMATION_NOT_FOUND"
              ? { boundedSearchMissNotImpossibility: true,
                correctionInstruction: "The fixed-anchor packing failed. Choose alternative anchors and use space.solve_static_formation on the retained failed branch, then select complete Native candidates by reference. Preserve the scenario and terrain. Do not handwrite model coordinates or infer impossibility from a bounded miss." } : {}),
            ...(unknownReasonCode === "ROSTER_TEACH_QUERY_KIND_SCENARIO_REQUIRED"
              ? { requiredRequestKind: "scenario",
                scenarioNotExecuted: true,
                followUpsNotExecuted: true } : {}),
            ...(typeof laboratory.describeQueryContext === "function"
              ? laboratory.describeQueryContext({
                base: unknownReasonCode === "ROSTER_TEACH_EVIDENCE_BRANCH_REF_UNKNOWN"
                  ? { kind: "source" } : repairBase,
              }) : {}),
            ...(sourceQueryRepair?.sourceContract==='pregame_native_action_input_v1'
              && !sourceReceipt?.branchStateHash && branchIdRef ? {
                scenarioContinuation:{branchIdRef,reusesExistingParent:true,
                  constructionReturnedReceipt:false},
              } : {}),
            ...(followUpReceipts.length ? {
              failedFollowUpIndices: followUpReceipts.filter(entry =>
                entry.status === "unknown").map(entry => entry.index),
            } : {}),
            ...describeScenarioDirectory(),
            modelMustChooseCorrection: true,
            originalQueryNotAnswered: true,
          },
        } : {}),
        calculationPolicy: request.kind === "math"
          ? sourceReceipt?.calculationPolicy
            || "exact_arithmetic_over_model_supplied_inputs_not_rule_truth"
          : request.kind === "map_route"
            ? "frozen_half_inch_grid_route_not_exact_move_or_score_timing"
            : null,
        canAffectRules: false,
        trainingTruth: false,
      };
      return freezeDeep({ ...body,
        receiptHash: hashStarcraftTmgContract(body) });
    },
  });
}
