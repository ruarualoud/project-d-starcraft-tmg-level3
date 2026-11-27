import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {PREGAME_MAP_EVIDENCE_PORT_V1} from './pregame-map-evidence-port-v1.mjs';
import {rosterImportedExperienceHasFrozenOpponentV1} from "./roster-opponent-knowledge-v1.mjs";
import {projectRosterIncompleteOutputRecoveryV1} from './roster-incomplete-output-recovery-v1.mjs';
import {projectRosterHostStepKindRecoveryV1,projectRosterSavedProposalRecoveryV1} from './roster-host-step-recovery-v1.mjs';
import {projectRosterCommandEnvelopeRecoveryV1} from './roster-decision-envelope-v1.mjs';
import {projectRosterEmptyCandidateRecoveryV1} from './roster-work-order-edit-command-v1.mjs';
import {projectRosterObservedUnissuedRequestV1} from './roster-workflow-dispatch-control-v1.mjs';
import {projectRosterDeliveredCitationRecoveryV1} from './roster-source-citation-delivery-v1.mjs';
import {rosterSourceScopeRefreshMatchesV1} from './roster-source-scope-extension-v1.mjs';
import {projectCompletedTemporalInvariantRecoveryV1} from './roster-temporal-invariant-recovery-v1.mjs';
import {projectRosterUnissuedAuthorCoverageV1} from './roster-comparison-value-review-v1.mjs';
import {projectRosterFrozenDesignReferenceRepairsV1} from './roster-comparison-participant-preflight-v1.mjs';
import {projectRosterUnissuedReviewOwnerMergeV1} from './roster-review-owner-v1.mjs';
// Shared P1/P2 state and dependency scheduler. The workspace owns one instance
// per Run. Tool/model adapters own execution; this module neither invents Rules
// facts nor ranks strategies, edits armies or grants final acceptance.
import {rosterReviewUnissuedV1} from './roster-review-reuse-v1.mjs';
import {parseRosterTeachEvidencePathV1} from './roster-teach-typed-evidence-v1.mjs';
import {rosterBuilderFactRecheckMatchesV1} from './roster-builder-fact-review-recheck-v1.mjs';
import {projectRosterCompletedComparisonNavigationV1} from './roster-comparison-navigation-settlement-v1.mjs';
import {isDeepStrictEqual} from 'node:util';
import {isExplicitlyRecoverableProviderDispatchV1,isExplicitlyRecoverableProviderFailureV1,isExplicitLatestProviderRetryV1,matchesReturnedRosterProviderReplyV1} from '../secure-provider-runtime/provider-dispatch-recovery-v1.mjs';
import {isRosterReadOnlyObservationV1} from './roster-read-only-query-recovery-v1.mjs';
import {ROSTER_INVENTORY_COMPARISON_VERSION,projectRosterInventoryClaimRecoveryV1} from './roster-inventory-claims-v1.mjs';
import {projectRosterWorkflowStateReferenceV1,projectRosterWorkflowDelegatedScenesV1,
  bindRosterWorkflowDelegatedSceneV1,projectRosterWorkflowStateBindingFailureV1} from './roster-workflow-state-reference-v1.mjs';
import {projectRosterWorkflowExecutionPrerequisitesV1} from './roster-workflow-execution-prerequisites-v1.mjs';
import {createRosterWorkflowOwnershipIndexV1} from './roster-workflow-ownership-v1.mjs';
import {createRosterWorkflowGraphV1,rosterWorkflowChoiceScopeReturnV1,rosterWorkflowChoiceContractV1,
  rosterWorkflowWorkDependenciesV1 as dependencies,rosterWorkflowFrontierResponseV1,currentRosterComparisonPurposeV1} from './roster-workflow-graph-v1.mjs';
import {projectRosterWorkflowReceiptReadNavigationV1,projectRosterCurrentReceiptReadViewV1,resolveRosterReceiptViewPointerV1} from './roster-workflow-receipt-view-v1.mjs';
import {rosterPendingQuestionWorkV1} from './roster-review-data-questions-v1.mjs';
import {projectRosterWorkflowToolChoiceV1,projectRosterEmptyFormationChoiceV1} from './roster-workflow-tool-choice-v1.mjs';
import {rosterWorkflowCanReflowInputV1} from './roster-workflow-input-delivery-v1.mjs';
import {recoverRosterWorkflowBatchSummaryOwnersV1} from './roster-workflow-batch-summary-v1.mjs';
import {projectRosterSavedNativeSourceRepairsV1} from './roster-saved-native-source-v1.mjs';
import {rosterSourceReviewRepairMembersV1,rosterSourceReviewRevisionBlocksRepairV1,
  projectRosterSourceReviewLineageRestorationV1} from './roster-source-review-repair-handoff-v1.mjs';
import {rosterReviewRequestShapeRecoveryV1} from './roster-workflow-review-repair-v1.mjs';
import {rosterRoleReplyCommunicationErrorsV1} from './roster-role-communication-v1.mjs';
import {recordRosterWorkflowReadDeliveryV1} from './roster-workflow-read-context-v1.mjs';
import {projectRosterLocalMethodScopeRepairsV1} from './roster-workflow-local-method-scope-v1.mjs';
import {projectRosterCompetingMethodRecoveriesV1} from './roster-workflow-method-recovery-owner-v1.mjs';
import {projectRosterReturnedMethodSettlementsV1} from './roster-workflow-returned-method-settlement-v1.mjs';
import {resolveRosterWorkflowFrontierSettlementV1} from './roster-workflow-frontier-settlement-v1.mjs';
import {rosterQueuedClosedMethodReturnV1,projectRosterStoppedOwnerDeliveryRepairV1,
  rosterVerifiedOwnerDeliveryRepairV1} from './roster-workflow-control-progress-v1.mjs';
import {projectRosterConfigurationReconsiderationV1} from './roster-configuration-reconsideration-v1.mjs';
import {projectRosterPlanRevisionReturnsV1} from './roster-plan-revision-return-v1.mjs';
import {projectRosterComparisonClosureV1} from './roster-comparison-closure-v1.mjs';
import {rosterUnissuedStaleComparisonDesignsV1,projectRosterCitationOnlyComparisonRecoveryV1,projectRosterDecisionUseRecoveryV1} from './roster-comparison-redesign-v1.mjs';
import {projectRosterDeferredHypothesisV1} from './roster-deferred-hypothesis-v1.mjs';
import {projectRosterCalculationRecoveryV1} from './roster-calculation-recovery-v1.mjs';
import {verifyArmyBuilderRosterVerdictV1} from './army-builder-query-port-v1.mjs';
import {projectRosterEvidencePathNavigationV1} from './roster-evidence-path-navigation-v1.mjs';
import {projectRepeatedInspectionOnlyBatchV1,projectResolvedBatchProgressRecoveryV1} from './roster-experiment-progress-v1.mjs';
import {createRosterExperimentOwnerContinuationV1} from './roster-workflow-experiment-owner-v1.mjs';
const clone=v=>structuredClone(v);
// File checkpoints use JSON. Compare their full persisted representation, not
// object prototypes or optional own-undefined fields omitted by that transport.
const persistedEqual=(a,b)=>isDeepStrictEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)));
function freezeObservation(value,seen=new WeakSet()){
  if(value===null||typeof value!=='object'||seen.has(value))return value;
  seen.add(value);
  for(const child of Object.values(value))freezeObservation(child,seen);
  return Object.freeze(value);
}
const factBindings=bindings=>Object.fromEntries(Object.entries(bindings??{}).filter(([key])=>key!=='plan'));
function builderFactScope(entry,value){
  if(entry.kind!=='tool_receipt'||!/^draft:r\d+:builder$/u.test(entry.id)
    ||!Object.hasOwn(entry.bindings??{},'plan')||value?.candidateHash!==entry.bindings.army
    ||value?.portId!=='official-army-builder-query-port-v1')return null;
  try{verifyArmyBuilderRosterVerdictV1(value);}catch{return null;}
  return factBindings(entry.bindings);
}
const historyReadRoles=new Set(['roster_workflow_strategy_decision','roster_workflow_local_teach',
  'roster_workflow_final_review','roster_workflow_fact_summary','roster_workflow_experiment_planner']);
const isHistoricalReferenceInput=(work,input)=>input.source==='evidence'
  &&input.scopeUsage==='historical_reference'&&historyReadRoles.has(work.role);
const schema='roster_decision_workflow_v1';
import {projectRosterAuthorDecisionHandoffV1,enterRosterAuthorDecisionHandoffV1} from './roster-workflow-author-handoff-v1.mjs';
import {RosterWorkflowDispatchPause,assertRosterWorkflowDispatchAllowedV1} from './roster-workflow-dispatch-control-v1.mjs';
const fail=(code,detail)=>{throw Object.assign(Error(`${code}:${JSON.stringify(detail??null)}`),{code,detail});};
// Host-derived dependency paths grow with explicit continuations. They are map
// keys, not filesystem paths or strategy prose; an arbitrary length threshold
// must not reject our own saved successful operation or truncate its identity.
const idOK=v=>typeof v==='string'&&v.trim().length>0;
export function rosterWorkflowReceiptPointerV1(pointer){
  if(pointer==='/request'||pointer.startsWith('/request/'))return `/value${pointer}`;
  if(pointer==='/value/request'||pointer.startsWith('/value/request/'))return pointer;
  if(pointer==='/value/receipt/stateRef'||pointer.startsWith('/value/receipt/stateRef/'))return pointer.replace('/value/receipt/stateRef','/value/stateRef');
  if(pointer==='/receipt/stateRef'||pointer.startsWith('/receipt/stateRef/'))return pointer.replace('/receipt/stateRef','/value/stateRef');
  if(pointer==='/value/stateRef'||pointer.startsWith('/value/stateRef/'))return pointer;
  if(pointer==='/stateRef'||pointer.startsWith('/stateRef/'))return `/value${pointer}`;
  if(pointer==='/value/receipt'||pointer.startsWith('/value/receipt/'))return pointer;
  if(pointer==='/receipt'||pointer.startsWith('/receipt/'))return `/value${pointer}`;
  return `/value/receipt${pointer}`;
}
// Measurement identities are not repairable formatting. A domain/state may
// change to make the requested query executable; changing its explicit target
// makes it another observation, not a successful replacement of this one.
// Compare only declared identities, never prose, strategic value, or hashes.
const measurementSelectorGroups=[
  ['unitId','unitIds'],
  ['targetUnitId','targetUnitIds'],['attackerUnitId','attackerUnitIds'],
  ['subjectUnitId','subjectUnitIds'],['markerId','markerIds'],
  ['pieceId'],['targetPieceId'],['attackerPieceId'],['weaponName'],['abilityName']
];
function declaredMeasurementSelectors(request){
  if(!['spatial','probability','threat_exchange'].includes(request?.operation))return [];
  const args=request.args??{};
  let query=args.queryArguments??args.arguments??args;
  if(!args.queryArguments&&!args.arguments&&typeof args.argumentsJson==='string'){
    try{query=JSON.parse(args.argumentsJson);}catch{return null;}
  }
  if(!query||typeof query!=='object'||Array.isArray(query))return null;
  const layers=[args,query,query.parameters,query.proposal?.parameters,args.selection?.match]
    .filter(v=>v&&typeof v==='object');
  return measurementSelectorGroups.map(keys=>{
    const values=layers.flatMap(layer=>keys.flatMap(key=>{
      const value=layer[key];return typeof value==='string'?[value]
        :Array.isArray(value)&&value.every(v=>typeof v==='string')?value:[];
    }));
    return [...new Set(values)].sort();
  });
}
export function rosterWorkflowRepairRequestMatchesV1(original,replacement,{explicitCompletion=false}={}){
  if(typeof original?.operation!=='string'||original.operation!==replacement?.operation)return false;
  const priorSelectors=declaredMeasurementSelectors(original),nextSelectors=declaredMeasurementSelectors(replacement);
  if(!priorSelectors||!nextSelectors)return false;
  if(priorSelectors.some((values,i)=>values.length
    &&!isDeepStrictEqual(values,nextSelectors[i])))return false;
  const field=original.operation==='spatial'?'queryKind':original.operation==='math'?'mathKind':null;
  if(!field)return true;
  const before=original.args?.[field],after=replacement.args?.[field];
  // Missing subtype is a model choice, never permission to use any successful
  // query from the same broad tool. Preliminary geometry is not combat proof.
  if(typeof after!=='string'||!after.trim())return false;
  return typeof before==='string'&&before.trim()?before===after:explicitCompletion;
}
export function rosterWorkflowOperationReplacementsV1({original,jobs,completionWorkId}){
  const matches=jobs.filter(job=>rosterWorkflowRepairRequestMatchesV1(original,job.inputs.request.value,
    {explicitCompletion:job.id===completionWorkId}));
  // The order can continue with another operation after the repaired one.
  // A unique type/subtype with no conflicting declared measurement identity
  // is a candidate replacement, not a Host strategy choice or source approval.
  // Multiple matches still require an explicit matching completion.
  const selected=matches.find(job=>job.id===completionWorkId);
  return selected?[selected]:matches;
}
const kinds=new Set(['tool_receipt','official_source','strategy_skill','hypothesis','interpretation','proposal','accepted_decision','capability_result']);
function select(root,pointer) {
  if(pointer==='')return {ok:true,value:root};
  // A declared Host projection is readable/bindable for old immutable tool
  // receipts too. Do not modify their stored body or Native receipt hash.
  const refPrefix=['/value/receipt/stateRef','/value/stateRef','/receipt/stateRef','/stateRef']
    .find(prefix=>pointer===prefix||pointer.startsWith(prefix+'/'));
  if(refPrefix){
    const reference=projectRosterWorkflowStateReferenceV1(refPrefix.startsWith('/value/')?root?.value:root);
    if(reference)return select(reference,pointer.slice(refPrefix.length));
  }
  // New contracts use JSON Pointer only; no fuzzy aliases or implicit wildcards.
  if(typeof pointer!=='string'||!pointer.startsWith('/'))return {ok:false};
  const parsed=parseRosterTeachEvidencePathV1(pointer);
  if(!parsed)return {ok:false};
  let value=root;
  for(const key of parsed.keys){
    if(value===null||typeof value!=='object'||!Object.hasOwn(value,key))return {ok:false};
    value=value[key];
  }
  return {ok:true,value};
}
function bindingsMatch(bindings,scope) {
  return Object.entries(bindings||{}).every(([key,value])=>Object.hasOwn(scope,key)&&scope[key]===value);
}
export const rosterWorkflowBindingsMatchV1=bindingsMatch;

function validateCurrentMapReceipt(scope, value) {
  if (!scope.releaseManifest || value?.schemaVersion !== PREGAME_MAP_EVIDENCE_PORT_V1) return;
  if (value.releaseBinding?.manifestHash !== scope.releaseManifest) fail('ROSTER_MAP_EVIDENCE_RELEASE_MISMATCH');
  const {receiptHash, ...body} = value;
  if (receiptHash !== hash(body)) fail('ROSTER_MAP_EVIDENCE_HASH_MISMATCH');
}
function validateBindings(bindings,scope) {
  if(!bindings||Array.isArray(bindings)||typeof bindings!=='object'||!bindingsMatch(bindings,scope))
    fail('ROSTER_WORKFLOW_BINDINGS_INVALID',bindings);
}
export async function createRosterDecisionWorkflowV1({store,execute,
  projectReconsideration=projectRosterConfigurationReconsiderationV1,reconcileReadOnlyInterruption=null,
  validateToolBindings=null,recoverSharedRoundOnePreparation=null,loadRetainedOfflineReply=null,shouldStop,blindOpponent=false}) {
  let state=await store.load();
  // Older evidence rows identify the native map envelope through their saved outline.
  // Check only those current facts on reopen, without scanning unrelated artifact bodies.
  if (state?.scope?.releaseManifest) {
    for (const entry of state.evidence) {
      if (entry.outline?.some(field => field.pointer === '/mapBinding')
          && entry.outline.some(field => field.pointer === '/receiptHash')) {
        validateCurrentMapReceipt(state.scope, await store.get(entry.artifactRef));
      }
    }
  }
  const withheldImports=new Set();
  if(blindOpponent)for(const entry of state?.evidence??[]){
    if(!entry.id.startsWith('imported-experience:'))continue;
    const stored=await store.get(entry.artifactRef).catch(()=>null);
    if(!stored||rosterImportedExperienceHasFrozenOpponentV1(stored))withheldImports.add(entry.id);
  }
  let writes=Promise.resolve(),commands=Promise.resolve();
  let pendingDraftCommit=null;
  // Scheduler readers share only an immutable detached observation, never the
  // live state. Checkpoints invalidate it, including operation-only updates
  // with no new event. Ordinary inspect() keeps its independent mutable copy.
  const observations=new Map();
  const checkpoint=()=>{
    observations.clear();
    let persist;
    if(typeof store.prepareCheckpoint==='function')persist=store.prepareCheckpoint(state);
    else {
      const snapshot=clone(state);
      persist=()=>store.save(snapshot);
    }
    if(typeof persist!=='function')fail('ROSTER_WORKFLOW_CHECKPOINT_PREPARATION_INVALID');
    writes=writes.then(persist);
    return writes;
  };
  function event(type,detail){state.events.push({sequence:state.events.length+1,type,...clone(detail)});}
  async function reconcileDraftCommit(){
    const pending=pendingDraftCommit;
    let durable;
    try{durable=await store.load();}catch(error){
      fail('ROSTER_WORKFLOW_DRAFT_COMMIT_OUTCOME_UNKNOWN',{reason:'checkpoint_unreadable',
        storageError:error.code??error.message,retrySameCommit:true});
    }
    const committed=persistedEqual(durable,pending.intended);
    if(!committed&&!persistedEqual(durable,pending.before))
      fail('ROSTER_WORKFLOW_DRAFT_COMMIT_OUTCOME_UNKNOWN',{reason:'checkpoint_changed',retrySameCommit:true});
    // Only this serialized commit's failed write queue is discharged, after
    // reading back either complete checkpoint. Other save failures stay closed.
    state=durable;writes=Promise.resolve();pendingDraftCommit=null;observations.clear();
    return committed;
  }
  async function committedDraftRetry(command){
    const revision=state.draftRevision;
    if(command.draft?.revision!==revision||command.expectedRevision!==(revision===0?null:revision-1))return null;
    const prior=state.events.findLast(e=>e.type==='draft_committed');
    if(!prior||prior.revision!==revision||prior.draftRef!==state.draftRef
      ||prior.workId!==(command.workId??null)||!persistedEqual(prior.scope,command.scope??null)
      ||!persistedEqual(state.scope,command.scope??null))return null;
    const savedDraft=await store.get(prior.draftRef);
    const savedReceipt=prior.receiptRef?await store.get(prior.receiptRef):null;
    if(!persistedEqual(savedDraft,command.draft)||!persistedEqual(savedReceipt,command.receipt??null))return null;
    return {draftRef:prior.draftRef,revision,receiptRef:prior.receiptRef,alreadyCommitted:true};
  }
  if(state&&state.schema!==schema)fail('ROSTER_WORKFLOW_SCHEMA_INVALID');
  // Never infer that an interrupted paid/tool dispatch did not happen. P5
  // reconciles its dispatch key or saved reply, rather than silently re-buying.
  const interrupted=w=>w.status==='running'||w.status==='ready'&&w.operationState?.pending?.phase==='prepared'||w.status==='needs_repair'
    // The supplied reconciler owns the precise saved-input/reply proof. Do not
    // duplicate its exception allowlist here and silently suppress valid proof.
    // No proof leaves a failed work item exactly stopped (below).
    &&(w.operationState?.pending?.phase==='prepared'||w.failure?.dispatchOutcome==='unknown'||w.failure?.code==='DISPATCH_OUTCOME_UNKNOWN'
      &&w.failure.dispatchKey===w.dispatchKey);
  if(state?.work.some(interrupted)){
    let changed=false;
    for(const w of state.work.filter(interrupted)){
      const recovery=reconcileReadOnlyInterruption?await reconcileReadOnlyInterruption({state:clone(state),work:clone(w),readArtifact:store.get}):null;
      if(recovery?.version===1&&recovery.kind==='read_role_prepared_request'
        &&recovery.workId===w.id&&recovery.dispatchKey===w.dispatchKey&&recovery.inputRef===w.inputRef
        &&w.operationState?.pending?.phase==='prepared'&&w.operationState.pending.requestRef===recovery.requestRef){
        w.failureHistory=[...(w.failureHistory??[]),{failure:clone(w.failure),originalPending:clone(w.operationState.pending),
          recovery:clone(recovery),reason:recovery.reason}];
        w.interruptionRecoveries=[...(w.interruptionRecoveries??[]),clone(recovery)];
        w.operationState.pending=null;w.status='ready';w.failure=null;changed=true;
        event('prepared_read_request_resumed',{workId:w.id,...clone(recovery)});continue;
      }
      if(recovery?.version===1&&recovery.kind==='read_role_saved_reply'
        &&recovery.workId===w.id&&recovery.dispatchKey===w.dispatchKey&&recovery.inputRef===w.inputRef
        &&!w.operationState?.pending&&w.operationState?.calls?.at(-1)?.replyRef===recovery.replyRef
        &&w.operationState.calls.at(-1).requestRef===recovery.requestRef){
        w.failureHistory=[...(w.failureHistory??[]),{failure:clone(w.failure),operationState:clone(w.operationState),
          reason:recovery.engineeringChangeId}];
        w.interruptionRecoveries=[...(w.interruptionRecoveries??[]),clone(recovery)];
        w.operationState.revalidateReplyRef=recovery.replyRef;
        w.operationState.savedRevalidationRequestRef=recovery.requestRef;
        w.status='ready';w.failure=null;changed=true;
        event('saved_read_role_reply_resumed',{workId:w.id,...clone(recovery)});continue;
      }
      if(recovery?.version===1&&recovery.kind==='read_role_before_provider'
        &&recovery.workId===w.id&&recovery.dispatchKey===w.dispatchKey&&recovery.inputRef===w.inputRef){
        if(w.failure)w.failureHistory=[...(w.failureHistory??[]),{failure:clone(w.failure),inputRef:w.inputRef,
          reason:recovery.engineeringChangeId??recovery.reason}];
        w.interruptionRecoveries=[...(w.interruptionRecoveries??[]),clone(recovery)];
        w.status='ready';w.failure=null;changed=true;
        event('unissued_read_role_resumed',{workId:w.id,...clone(recovery)});continue;
      }
      if(w.status!=='running')continue; // Unproved failures retain their original stop.
      w.status='needs_repair';w.failure={code:'DISPATCH_OUTCOME_UNKNOWN',dispatchKey:w.dispatchKey};
      changed=true;
      event('interrupted_dispatch',{workId:w.id,dispatchKey:w.dispatchKey});
    }
    if(changed)await checkpoint();
  }
  // Old generated summaries omitted the same owner carried by their tool jobs.
  // Recover only exact saved batch construction; never infer ownership merely
  // from a reader citing another experiment. No paid output is rewritten.
  if(state){
    const links=await recoverRosterWorkflowBatchSummaryOwnersV1({state,readArtifact:store.get});
    for(const link of links){
      const summary=state.work.find(work=>work.id===link.workId);
      summary.experimentOwnerId=link.ownerWorkId;summary.experimentOrderIndex=link.orderIndex;
      event('experiment_summary_owner_reconciled',{...link,sourceBodyRewritten:false});
    }
    let retired=0;const graph=createRosterWorkflowGraphV1(state);
    for(const summary of state.work.filter(work=>work.role==='roster_workflow_fact_summary'
      &&work.experimentOwnerId&&work.status!=='superseded'&&work.status!=='running'&&!work.operationState?.pending)){
      const goal=graph.get(graph.owner(summary.id)?.goalId);
      if(!goal?.supersededByGoalId||!goal.experimentSupersessionRef)continue;
      // Inherit an already explicit, persisted goal replacement, not a new
      // model choice. Preserve the old summary result/inputs/counters and fees.
      summary.supersededByGoalId=goal.supersededByGoalId;
      summary.experimentSupersessionRef=goal.experimentSupersessionRef;summary.status='superseded';
      event('experiment_summary_supersession_inherited',{workId:summary.id,goalId:goal.id,
        replacementGoalId:goal.supersededByGoalId,reportRef:goal.experimentSupersessionRef,
        evidenceRetained:true,historyReset:false});retired++;
    }
    if(links.length||retired)await checkpoint();
  }
  if(state&&!state.work.some(w=>w.status==='running'||w.operationState?.pending)){
    let recovered=0;
    for(const work of state.work.filter(w=>w.status==='needs_repair')){
      const proof=await projectResolvedBatchProgressRecoveryV1({state,workId:work.id,store});
      if(!proof)continue;
      work.failureHistory=[...(work.failureHistory??[]),{failure:clone(work.failure),
        operationState:clone(work.operationState),reason:proof.reason,proof:clone(proof)}];
      work.operationState.noProgressRecoveryHistory=[...(work.operationState.noProgressRecoveryHistory??[]),
        {stop:clone(work.operationState.noProgressStop),reason:proof.reason,proof:clone(proof),historyReset:false}];
      delete work.operationState.noProgressStop;
      work.status='ready';work.failure=null;recovered++;
      event('resolved_batch_progress_reconciled',proof);
    }
    if(recovered)await checkpoint();
  }
  // A Plan sentence is not a dependency of an already executed Native query.
  // Keep the original planning scope for audit; revive only completed factual
  // receipts whose army/rules/map/source still match. Failures and proposals
  // remain Plan-bound. No old query or Provider request is executed here.
  function bindCompletedFact(work){
    if(Object.hasOwn(work.bindings,'plan')){
      work.planningBindings??=clone(work.bindings);
      work.bindings=factBindings(work.bindings);
    }
  }
  if(state){
    const retainedFacts=new Set();let normalized=false;
    for(const work of state.work.filter(w=>w.role==='roster_workflow_tool'&&w.resultRef&&!w.supersededByGoalId
      &&['evidence_ready','superseded'].includes(w.status))){
      if(!bindingsMatch(factBindings(work.bindings),state.scope))continue;
      const result=await store.get(work.resultRef);
      if(result.kind!=='tool_receipt'||result.continuation===true||result.value?.status!=='completed')continue;
      const priorStatus=work.status,hasPlan=Object.hasOwn(work.bindings,'plan');
      bindCompletedFact(work);work.status='evidence_ready';retainedFacts.add(work.id);
      if(hasPlan||priorStatus==='superseded'){
        event('completed_fact_scope_retained',{workId:work.id,priorStatus,planningBindings:work.planningBindings,
          factBindings:work.bindings,queryReexecuted:false});normalized=true;
      }
    }
    for(const evidence of state.evidence){
      if(evidence.kind!=='tool_receipt'||!/^tool(?:-view)?:/.test(evidence.id)
        ||!retainedFacts.has(evidence.id.replace(/^tool(?:-view)?:/,''))||!Object.hasOwn(evidence.bindings,'plan'))continue;
      evidence.planningBindings??=clone(evidence.bindings);evidence.bindings=factBindings(evidence.bindings);normalized=true;
    }
    // Builder legality depends on the exact army/frozen sources, not on prose
    // in the Plan. Preserve original publication provenance and source bytes.
    // A differently bound army/rules/map/source still becomes historical.
    for(const evidence of state.evidence.filter(e=>e.kind==='tool_receipt'&&/^draft:r\d+:builder$/u.test(e.id)
      &&Object.hasOwn(e.bindings??{},'plan'))){
      const bindings=builderFactScope(evidence,await store.get(evidence.artifactRef));
      if(!bindings)continue;
      evidence.planningBindings??=clone(evidence.bindings);evidence.bindings=bindings;normalized=true;
      event('builder_fact_scope_retained',{evidenceId:evidence.id,artifactRef:evidence.artifactRef,
        factBindings:bindings,queryReexecuted:false,sourceBodyRewritten:false});
    }
    if(normalized)await checkpoint();
  }
  if(state&&!state.work.some(w=>w.status==='running'||w.operationState?.pending)){
    const designRepairs=await projectRosterFrozenDesignReferenceRepairsV1({state,readArtifact:store.get});
    for(const repair of designRepairs){
      const work=state.work.find(w=>w.id===repair.workId);
      work.inputs[repair.inputName]=clone(repair.after);
      work.status='evidence_ready';
      work.frozenDesignReferenceRecovery=clone(repair);
      event('frozen_design_reference_retained',repair);
    }
    if(designRepairs.length)await checkpoint();
    const repairs=await projectRosterSavedNativeSourceRepairsV1({state,readArtifact:store.get});
    for(const repair of repairs){
      const work=state.work.find(w=>w.id===repair.workId);
      for(const change of repair.changes)work.inputs[change.name]=clone(change.after);
      work.savedNativeSourceRecovery=clone(repair);work.status='waiting_dependency';
      if(repair.originalFailure)work.failure=null; // Original rejection remains in the recovery record and event history.
      event('saved_native_source_rebound',repair);
    }
    if(repairs.length)await checkpoint();
  }
  function fresh(work,seen=new Set()) {
    return createRosterWorkflowGraphV1(state).isFresh(work.id,{visited:seen,throwOnCycle:true});
  }
  function refresh() {
    const graph=createRosterWorkflowGraphV1(state);
    for(const w of state.work){
      if(!graph.isFresh(w.id,{throwOnCycle:true})){w.status='superseded';continue;}
      if(!['ready','waiting_dependency'].includes(w.status))continue;
      w.status=graph.dependenciesReady(w.id)?'ready':'waiting_dependency';
    }
  }
  function retainCalculationControlOwners(){
    let count=0;
    for(const author of state.work.filter(work=>work.calculationRecoveryOf)){
      const goal=state.work.find(work=>work.id===author.investigationFrontierOf);
      if(!goal?.resultRef||goal.role!=='roster_workflow_experiment_planner'
        ||goal.investigationHandoff?.decisionId!==author.id||!bindingsMatch(goal.bindings,state.scope))continue;
      const changed=[];
      for(const [name,input]of Object.entries(goal.inputs)){
        if(input.source!=='evidence'||input.scopeUsage==='historical_reference')continue;
        const evidence=state.evidence.find(row=>row.id===input.id);
        if(!evidence?.calculationInvalidation)continue;
        changed.push({inputName:name,originalInput:clone(input),invalidation:evidence.calculationInvalidation});
        input.scopeUsage='historical_reference';
      }
      if(!changed.length)continue;
      goal.calculationControlHistory=[...(goal.calculationControlHistory??[]),...changed];
      // This completed goal only routes responsibility to its new author; its
      // original method/result is retained history, never corrected evidence.
      if(goal.status==='superseded')goal.status='evidence_ready';
      event('calculation_control_owner_retained',{goalId:goal.id,authorWorkId:author.id,
        inputNames:changed.map(row=>row.inputName),factApprovalGranted:false,nativeReplayed:false});count++;
    }
    return count;
  }
  async function restoreCalculationAuthorScope(){
    if(state.work.some(work=>work.status==='running'||work.operationState?.pending))return 0;
    let count=0;
    for(const prior of [...state.work]){
      if(!prior.calculationRecoveryOf||prior.calculationScopeRecovery||prior.inputs.investigationFrontier
        ||prior.draftOutcomeRef||prior.status==='superseded'||!bindingsMatch(prior.bindings,state.scope))continue;
      const source=state.work.find(work=>work.id===prior.calculationRecoveryOf);
      const frontier=source?.inputs.investigationFrontier;
      const goal=state.work.find(work=>work.id===prior.investigationFrontierOf);
      if(!frontier?.value?.unresolvedQuestions?.length||goal?.investigationHandoff?.decisionId!==prior.id)continue;
      const id=prior.id+':scope-v1';
      if(state.work.some(work=>work.id===id))fail('ROSTER_WORKFLOW_CALCULATION_SCOPE_RECOVERY_CONFLICT');
      const proof={version:1,reason:'Numeric source correction omitted the original delegated question scope.',
        previousWorkId:prior.id,sourceWorkId:source.id,sourceResultRef:source.resultRef,
        previousReplyRef:prior.operationState?.correction?.originalReplyRef??null,
        assignedQuestions:clone(frontier.value.unresolvedQuestions),historyReset:false,
        unrelatedGlobalQuestionsApproved:false,nativeReplayed:false,planApproved:false};
      const reportRef=await store.put(proof),before=clone(state);
      const next={id,role:prior.role,bindings:clone(prior.bindings),draftRevision:prior.draftRevision,
        calculationRecoveryOf:prior.calculationRecoveryOf,calculationScopeRecoveryOf:prior.id,
        investigationFrontierOf:prior.investigationFrontierOf,investigationOwnerId:prior.investigationOwnerId,
        inputs:{...clone(prior.inputs),investigationFrontier:clone(frontier),
          calculationScopeCorrection:{source:'literal',value:proof}},status:'waiting_dependency',resultRef:null,failure:null};
      // New correctly scoped work, not a counter reset or a rewrite of any paid
      // request. One source-owned migration only; normal correction limits apply.
      prior.calculationScopeRecovery={reportRef,replacementWorkId:id};prior.status='superseded';
      goal.investigationHandoff={...goal.investigationHandoff,decisionId:id,
        previousDecisionIds:[...(goal.investigationHandoff.previousDecisionIds??[]),prior.id]};
      state.work.push(next);refresh();
      event('calculation_author_scope_restored',{reportRef,previousWorkId:prior.id,workId:id,
        historyReset:false,nativeReplayed:false,planApproved:false});
      try{await checkpoint();}catch(error){state=before;writes=Promise.resolve();observations.clear();throw error;}
      count++;
    }
    return count;
  }
  // A deterministic index of ONE immutable source inherits that source's
  // dependencies, not the Plan of whichever reviewer first requested it.
  // Repair only registry metadata; the paid answers and source bodies stay
  // byte-for-byte addressable. This is not a stale-source approval override.
  if(state){
    const correctedSources=new Set(),restoredReviews=new Set();
    for(const evidence of state.evidence){
      if(!evidence.id.startsWith('experiment-source-facts:'))continue;
      const body=await store.get(evidence.artifactRef);
      if(body?.schema!=='roster_experiment_source_facts_v1')continue;
      const source=state.evidence.find(e=>e.id===body.sourceEvidenceId);
      if(!source||source.artifactRef!==body.sourceArtifactRef
        ||evidence.id!==`experiment-source-facts:${source.id}:v${body.projectionVersion}`
        ||isDeepStrictEqual(evidence.bindings,source.bindings))continue;
      const priorBindings=clone(evidence.bindings);
      evidence.projectionPlanningBindings??=priorBindings;
      evidence.bindings=clone(source.bindings);evidence.projectionScopeVersion=1;
      correctedSources.add(evidence.id);
      event('source_projection_scope_normalized',{evidenceId:evidence.id,sourceEvidenceId:source.id,
        priorBindings,bindings:evidence.bindings,sourceArtifactRef:source.artifactRef,sourceBodyRewritten:false});
    }
    if(correctedSources.size){
      let changed=true;
      while(changed){
        changed=false;
        for(const work of state.work){
          if(work.role!=='roster_workflow_final_review'||work.status!=='superseded'
            ||work.resultRef||work.inputRef||work.dispatchKey||work.operationState
            ||work.supersededByWorkId||work.supersededByGoalId
            ||!bindingsMatch(work.bindings,state.scope))continue;
          const inputs=Object.values(work.inputs),affected=inputs.filter(i=>
            i.source==='evidence'&&correctedSources.has(i.id)||i.source==='work'&&restoredReviews.has(i.id));
          if(!affected.length||!inputs.every(i=>{
            if(i.source==='evidence'){
              const e=state.evidence.find(e=>e.id===i.id);
              return e&&(isHistoricalReferenceInput(work,i)||bindingsMatch(e.bindings,state.scope));
            }
            if(i.source==='work'){
              const parent=state.work.find(w=>w.id===i.id);return parent&&fresh(parent);
            }
            return true;
          }))continue;
          work.status='waiting_dependency';
          work.projectionScopeRecovery={version:1,originalStatus:'superseded',
            correctedDependencies:affected.map(i=>i.id),providerReplayed:false};
          restoredReviews.add(work.id);changed=true;
          event('source_projection_review_restored',{workId:work.id,...work.projectionScopeRecovery});
        }
      }
      refresh();await checkpoint();
    }
  }
  if(state){
    const repairs=await projectRosterLocalMethodScopeRepairsV1({state,readArtifact:store.get});
    for(const repair of repairs){
      const work=state.work.find(w=>w.id===repair.workId);
      work.localMethodScopeHistory=[...(work.localMethodScopeHistory??[]),clone(repair)];
      work.inputs.draft=clone(repair.input);work.status=repair.status;
      event('local_method_draft_scope_retained',repair);
    }
    if(repairs.length)await checkpoint();
  }
  async function reconcileMethodRecoveryOwners(){
    const plans=await projectRosterCompetingMethodRecoveriesV1({state,readArtifact:store.get});
    for(const plan of plans){
      const reportRef=await store.put({kind:'duplicate_method_recovery_yield',...plan,
        members:plan.memberIds.map(id=>{const w=state.work.find(row=>row.id===id);return {
          id,status:w.status,resultRef:w.resultRef??null,inputRef:w.inputRef??null};})});
      for(const id of plan.memberIds){
        const member=state.work.find(w=>w.id===id);member.branchReturnRef=reportRef;member.status='returned_to_owner';
      }
      state.work.find(w=>w.id===plan.workId).methodRecoveryYield={replacementOwnerId:plan.replacementOwnerId,reportRef};
      event('duplicate_method_recovery_returned',{...plan,reportRef});
    }
    if(plans.length)await checkpoint();
    return {returned:plans.length};
  }
  if(state)await reconcileMethodRecoveryOwners();
  async function reconcileReturnedMethods({save=true}={}){
    const plans=await projectRosterReturnedMethodSettlementsV1({state,readArtifact:store.get});
    for(const plan of plans){
      const members=plan.memberIds.map(id=>state.work.find(w=>w.id===id));
      const reportRef=await store.put({kind:'delegated_method_control_return',...plan,
        originalWork:members.map(w=>({id:w.id,status:w.status,resultRef:w.resultRef??null,
          inputRef:w.inputRef??null,failure:w.failure??null,attempt:w.attempt??0})),
        instruction:'This old delegated method has returned to the recorded question owner. Keep its failure and actual sources; no successful query receipt or factual/Plan approval is created.'});
      for(const member of members){member.branchReturnRef=reportRef;member.status='returned_to_owner';}
      state.work.find(w=>w.id===plan.stoppedWorkId).methodControlReturn={reportRef,
        replacementOwnerId:plan.replacementOwnerId,responseWorkId:plan.responseWorkId};
      event('delegated_method_return_settled',{...plan,reportRef});
    }
    if(plans.length&&save){refresh();await checkpoint();}
    return {returned:plans.length};
  }
  if(state)await reconcileReturnedMethods();
  function directory(consumer) {
    // One read-history pass per observation, not one per evidence. Rebuild for
    // the requested consumer so newly read paths and scope changes stay exact.
    const pathsByEvidence=new Map();
    for(const read of state.reads){
      if(read.consumer!==consumer)continue;
      if(!pathsByEvidence.has(read.evidenceId))pathsByEvidence.set(read.evidenceId,[]);
      pathsByEvidence.get(read.evidenceId).push(read.pointer);
    }
    return state.evidence.map(e=>{
      if(withheldImports.has(e.id))return {id:e.id,kind:e.kind,title:'Historical experience withheld for opponent visibility',
        bindings:clone(e.bindings),validity:'historical',availability:'missing',access:'missing',outline:[],readPaths:[],
        conditions:['Source is unavailable under the current opponent information boundary.'],artifactRef:null};
      const readPaths=[...(pathsByEvidence.get(e.id)??[])];
      return {...clone(e),validity:bindingsMatch(e.bindings,state.scope)?'current':'historical',readPaths,
        access:e.availability==='missing'?'missing':e.availability==='unsupported'?'unsupported'
          :readPaths.includes('')?'read':readPaths.length?'partially_read':'available_unread'};
    });
  }
  async function read(consumer,evidenceId,pointer,visited=new Set()) {
    if(visited.has(evidenceId))return {status:'path_missing',evidenceId,pointer,reason:'receipt_view_reference_cycle'};
    const evidence=state.evidence.find(e=>e.id===evidenceId);
    if(!evidence)return {status:'missing',evidenceId,pointer,reason:'not_registered'};
    if(withheldImports.has(evidenceId))return {status:'missing',evidenceId,pointer,reason:'opponent_visibility_boundary'};
    let body;
    try{body=await store.get(evidence.artifactRef);}
    catch(error){
      evidence.availability='missing';
      event('artifact_read_failed',{consumer,evidenceId,pointer,code:error.code||error.message});
      await checkpoint();
      return {status:'missing',evidenceId,pointer,reason:'artifact_unreadable'};
    }
    // Root and nested navigation reads share the current derived interface.
    // Never rewrite the retained view or change its source/section identities.
    if(body?.schema==='roster_workflow_receipt_view_v1'){
      const sourceEvidence=state.evidence.find(e=>e.id===body.evidenceId);
      if(sourceEvidence)body=projectRosterCurrentReceiptReadViewV1({view:body,
        source:await store.get(sourceEvidence.artifactRef),sourceArtifactRef:sourceEvidence.artifactRef});
    }
    // Whole reads must expose the same derived state-reference capability that
    // exact path reads/bindings expose. Leave the original artifact and nested
    // Native receipt intact; this additional field is Host routing metadata.
    if(pointer===''&&evidence.kind==='tool_receipt'){
      let sourceBody=body;
      if(body?.schema==='roster_workflow_receipt_view_v1'){
        const sourceEvidence=state.evidence.find(e=>e.id===body.evidenceId);
        if(sourceEvidence)sourceBody=await store.get(sourceEvidence.artifactRef);
      }
      const stateRef=projectRosterWorkflowStateReferenceV1(sourceBody);
      const executionPrerequisites=projectRosterWorkflowExecutionPrerequisitesV1(sourceBody);
      if(executionPrerequisites)body={...body,executionPrerequisites};
      if(stateRef)body={...body,stateRef,stateRefProjection:{kind:'host_state_reference_metadata',originalArtifactUnchanged:true,
        instruction:'Bind the complete /stateRef, not individual context/hash fields. This metadata adds no game facts; the original nested receipt is unchanged.'}};
      const navigation=projectRosterWorkflowReceiptReadNavigationV1({view:body,
        evidenceNumber:state.evidence.findIndex(e=>e.id===evidenceId)+1});
      if(navigation)body={...body,receiptReadNavigation:navigation};
    }
    // Receipt views advertise exact paths in their immutable source. A view is
    // a navigational handle, not a second receipt with a different data shape.
    const sourcePointer=resolveRosterReceiptViewPointerV1(body,pointer);
    if(body?.schema==='roster_workflow_receipt_view_v1'&&typeof sourcePointer==='string'&&(sourcePointer.startsWith('/receipt')||sourcePointer.startsWith('/stateRef'))){
      const resolved=await read(consumer,body.evidenceId,sourcePointer,new Set([...visited,evidenceId]));
      if(resolved.status==='read'){
        if(!state.reads.some(r=>r.consumer===consumer&&r.evidenceId===evidenceId&&r.pointer===pointer))
          state.reads.push({consumer,evidenceId,pointer});
        event('receipt_view_resolved',{consumer,evidenceId,pointer,resolvedEvidenceId:resolved.evidenceId});
        await checkpoint();
      }
      return {...resolved,evidenceId,pointer,resolvedPointer:sourcePointer,resolvedEvidenceId:resolved.resolvedEvidenceId??resolved.evidenceId,
        viewArtifactRef:evidence.artifactRef,
        receiptReadNavigation:projectRosterWorkflowReceiptReadNavigationV1({view:body,
          evidenceNumber:state.evidence.findIndex(e=>e.id===evidenceId)+1,selectedPointer:sourcePointer,selectedValue:resolved.value})};
    }
    if(body?.schema?.literal==='starcraft_tmg_roster_plan_v1'&&pointer!==''){
      const keys=parseRosterTeachEvidencePathV1(pointer)?.keys;
      if(!keys?.length||!Object.hasOwn(body,keys[0]))
        return {status:'path_missing',evidenceId,pointer,reason:'exact_path_not_found'};
      const resolvedEvidenceIds=[];
      const dereference=async node=>{
        if(Array.isArray(node))return Promise.all(node.map(dereference));
        if(node&&Object.hasOwn(node,'literal'))return clone(node.literal);
        if(node&&Object.keys(node).length===1&&typeof node.evidenceId==='string'){
          const result=await read(consumer,node.evidenceId,'',new Set([...visited,evidenceId]));
          if(result.status!=='read')throw Object.assign(Error('PLAN_BLOCK_UNAVAILABLE'),{readResult:result});
          resolvedEvidenceIds.push(node.evidenceId);return result.value;
        }
        throw Error('PLAN_INDEX_REFERENCE_INVALID');
      };
      let section;
      try{section=await dereference(body[keys[0]]);}
      catch(error){return {status:'missing',evidenceId,pointer,reason:error.message,sourceResult:error.readResult??null};}
      const tail=keys.slice(1).map(k=>'/'+String(k).replaceAll('~','~0').replaceAll('/','~1')).join('');
      const selectedSection=select(section,tail);
      if(!selectedSection.ok)return {status:'path_missing',evidenceId,pointer,reason:'exact_path_not_found'};
      if(!state.reads.some(r=>r.consumer===consumer&&r.evidenceId===evidenceId&&r.pointer===pointer))
        state.reads.push({consumer,evidenceId,pointer});
      event('plan_section_resolved',{consumer,evidenceId,pointer,resolvedEvidenceIds});await checkpoint();
      return {status:'read',evidenceId,pointer,kind:evidence.kind,conditions:clone(evidence.conditions),
        validity:bindingsMatch(evidence.bindings,state.scope)?'current':'historical',
        resolvedEvidenceIds,value:clone(selectedSection.value)};
    }
    const selected=select(body,pointer);
    if(!selected.ok)return {status:'path_missing',evidenceId,pointer,reason:'exact_path_not_found',
      navigation:projectRosterEvidencePathNavigationV1(body,pointer)};
    evidence.availability=evidence.availability==='unsupported'?'unsupported':'available';
    if(!state.reads.some(r=>r.consumer===consumer&&r.evidenceId===evidenceId&&r.pointer===pointer))
      state.reads.push({consumer,evidenceId,pointer});
    event('evidence_read',{consumer,evidenceId,pointer,artifactRef:evidence.artifactRef});
    await checkpoint();
    const conditions=clone(evidence.conditions);
    if(body?.schema==='roster_imported_conditional_experience_v1')conditions.push(
      'Source reference scope: '+body.origin.workflowId+'. All nested evidenceNumbers belong only to that source workflow, not this workflow. Read copied original proof through /sourceArtifacts on THIS evidence handle; do not use those source-local numbers as local reader handles. This read does not approve applicability or a strategy.');
    return {status:'read',evidenceId,pointer,kind:evidence.kind,conditions,
      validity:bindingsMatch(evidence.bindings,state.scope)?'current':'historical',value:clone(selected.value)};
  }
  async function routeMissingInput(work,name){
    const input=work.inputs[name],parent=state.work.find(w=>w.id===input?.id);
    if(work.role!=='roster_workflow_tool'||input?.source!=='work'||parent?.status!=='evidence_ready')return false;
    const actualSource=await store.get(parent.resultRef);
    if(select(actualSource,input.pointer).ok)return false;
    const failure={operation:work.inputs.request.value.operation,status:'returned_to_model',
      reason:'dependency_pointer_absent',executed:false,nativeSuccess:false,
      request:clone(work.inputs.request.value.args),queryRepair:{correctable:true,owner:'experiment_planner',
        sourceWorkId:parent.id,sourceResultRef:parent.resultRef,requestedPointer:input.pointer,
        actualSource:clone(actualSource),
        instruction:'The model-selected source path does not exist. No tool was dispatched. A contract description is not a selected scene/action. Read the actual source, choose explicit model-owned values or a necessary further query; do not invent a source path or bind a schema/template as selected parameters.'}};
    work.failureHistory=[...(work.failureHistory||[]),...(work.failure?[{failure:clone(work.failure)}]:[])];
    work.resultRef=await store.put({kind:'interpretation',value:failure,continuation:true,
      conditions:['No tool execution occurred; missing model-selected input is not a Rules result']});
    work.status='needs_model_choice';work.failure=null;
    event('unissued_input_returned_to_model',{workId:work.id,input:name,resultRef:work.resultRef,sourceResultRef:parent.resultRef});
    await checkpoint();return true;
  }
  async function run(work) {
    if(work.role!=='roster_workflow_tool'&&withheldImports.size&&state.reads.some(read=>withheldImports.has(read.evidenceId)))
      fail('ROSTER_WORKFLOW_BLIND_EXPERIENCE_PREVIOUSLY_READ');
    assertRosterWorkflowDispatchAllowedV1(shouldStop,'work_preparation');
    const closedCycle=await rosterQueuedClosedMethodReturnV1({state,work,readArtifact:ref=>store.get(ref)});
    if(closedCycle&&!await rosterVerifiedOwnerDeliveryRepairV1({state,work,readArtifact:ref=>store.get(ref)})){
      work.operationState={version:1,turn:0,reads:[],calls:[],correction:null,consecutiveCorrections:0,
        ...(work.operationState??{}),noProgressStop:closedCycle};
      await checkpoint();
      throw Object.assign(Error('ROSTER_WORKFLOW_ROLE_NO_PROGRESS'),{
        dispatchOutcome:'completed_no_progress',detail:clone(closedCycle)});
    }
    const inputs={};
    for(const [name,input] of Object.entries(work.inputs)){
      if(input.source==='assumption'||input.source==='literal')inputs[name]=clone(input);
      else if(input.source==='work'){
        const parent=state.work.find(w=>w.id===input.id);
        const result=select(await store.get(parent.resultRef),input.pointer);
        if(!result.ok){
          if(await routeMissingInput(work,name))return;
          fail('ROSTER_WORKFLOW_INPUT_PATH_MISSING',{workId:work.id,input:name});
        }
        inputs[name]={source:'work',workId:parent.id,resultRef:parent.resultRef,value:result.value};
      }else{
        const result=await read(work.id,input.id,input.pointer);
        const historical=isHistoricalReferenceInput(work,input);
        if(result.status!=='read'||!historical&&result.validity!=='current')
          fail('ROSTER_WORKFLOW_EVIDENCE_NOT_READY',{workId:work.id,input:name,result});
        inputs[name]={source:'evidence',...result,...(historical?{scopeUsage:'historical_reference',
          originalBindings:clone(state.evidence.find(e=>e.id===input.id).bindings),currentApplicability:'not_assessed'}:{})};
      }
    }
    const choiceScope=work.role==='roster_workflow_tool'&&work.experimentOwnerId
      ?rosterWorkflowChoiceContractV1({state,workId:work.experimentOwnerId}):null;
    const requiredSceneProjection=choiceScope?.preparationScope?.kind==='selected_candidate_scene_projection'
      &&inputs.request?.value?.operation===choiceScope.operation?choiceScope.preparationScope:null;
    const assignment={schema,workId:work.id,role:work.role,scope:clone(state.scope),bindings:clone(work.bindings),
      inputs,evidenceDirectory:directory(work.id),acceptanceGranted:false,
      ...(requiredSceneProjection?{requiredSceneProjection:clone(requiredSceneProjection)}:{})};
    work.inputRef=await store.put(assignment);
    assertRosterWorkflowDispatchAllowedV1(shouldStop,'assignment_prepared',{inputRef:work.inputRef});
    work.attempt=(work.attempt||0)+1;
    work.dispatchKey=`${work.id}:${work.attempt}`;
    work.status='running';event('dispatch',{workId:work.id,dispatchKey:work.dispatchKey,inputRef:work.inputRef});
    await checkpoint();
    const result=await execute(clone({...assignment,dispatchKey:work.dispatchKey}),{
      operationState:clone(work.operationState??null),
      readEvidence:(evidenceId,pointer)=>read(work.id,evidenceId,pointer),
      publishContext:async (value,metadata={})=>{
        const ref=await store.put(value),id=`role-context:${work.id}:${ref}`;
        const entry=await dispatch({type:'publish_evidence',id,
          title:metadata.title??'Exact deferred context of this local correction; not new facts',kind:metadata.kind??'interpretation',
          conditions:metadata.conditions??['Immutable input snapshot, not a Rules result or strategy approval'],
          bindings:clone(work.bindings),value});
        return {...entry,evidenceNumber:state.evidence.findIndex(e=>e.id===id)+1,validity:'current',
          ...(metadata.includeDirectory?{evidenceDirectory:directory(work.id)}:{})};
      },
      checkpointOperation:async operationState=>{
        work.operationState=clone(operationState);await checkpoint();
      },
    });
    if(!result||!kinds.has(result.kind)||!Object.hasOwn(result,'value')||!Array.isArray(result.conditions))
      fail('ROSTER_WORKFLOW_RESULT_CONTRACT_INVALID',work.id);
    work.resultRef=await store.put(result);
    work.status=result.continuation===true?'needs_model_choice':'evidence_ready';work.failure=null;
    if(work.role==='roster_workflow_tool'&&result.kind==='tool_receipt'&&result.continuation!==true
      &&result.value?.status==='completed')bindCompletedFact(work);
    event('result_saved',{workId:work.id,dispatchKey:work.dispatchKey,resultRef:work.resultRef,kind:result.kind,
      providerReplyRef:work.role==='roster_workflow_tool'?null:work.operationState?.calls?.at(-1)?.replyRef??null});
    await checkpoint();
  }
  async function prepareEvidenceEntry({id,title,kind,conditions,bindings,value}){
    if(!idOK(id)||!idOK(title)||!kinds.has(kind)||!Array.isArray(conditions))fail('ROSTER_WORKFLOW_EVIDENCE_INVALID');
    if(blindOpponent&&rosterImportedExperienceHasFrozenOpponentV1(value))fail('ROSTER_CONDITIONAL_EXPERIENCE_OPPONENT_DISCLOSURE');
    // Imported conditional records describe an earlier context. Do not bind
    // them to today's army just to satisfy the current-fact publisher. This
    // exception is typed, hypothesis-only and preserves the original scope.
    const historicalExperience=id.startsWith('imported-experience:')&&kind==='hypothesis'
      &&value?.schema==='roster_imported_conditional_experience_v1'
      &&value.advisorySkillEligible===false&&value.usableAsEstablishedFact===false
      &&value.canAffectRules===false&&value.trainingTruth===false
      &&idOK(value.origin?.workflowId)&&idOK(value.origin?.evidenceId)
      &&bindings&&Object.keys(bindings).length>0
      &&Object.entries(bindings).every(([key,v])=>['army','rules','map','source'].includes(key)&&idOK(v))
      &&persistedEqual(bindings,factBindings(value.sourceBindings));
    if(!historicalExperience){
      validateBindings(bindings,state.scope);
      validateCurrentMapReceipt(state.scope,value);
    }
    const artifactRef=await store.put(value);
    const outline=value&&typeof value==='object'?Object.entries(value).map(([key,child])=>({
      pointer:'/'+key.replaceAll('~','~0').replaceAll('/','~1'),
      type:child===null?'null':Array.isArray(child)?'array':typeof child,
    })):[];
    const builderBindings=builderFactScope({id,kind,bindings},value);
    return {id,title,kind,conditions:clone(conditions),bindings:clone(builderBindings??bindings),artifactRef,
      ...(builderBindings?{planningBindings:clone(bindings)}:{}),outline,
      availability:kind==='capability_result'&&value?.supported===false?'unsupported':'available'};
  }
  function verifyRetainedEvidence(existing,entry){
    const {availability,planningBindings:priorPlanningBindings,...prior}=existing;
    const {availability:nextAvailability,planningBindings:nextPlanningBindings,...next}=entry;
    if(JSON.stringify(prior)!==JSON.stringify(next))fail('ROSTER_WORKFLOW_EVIDENCE_ID_CONFLICT',entry.id);
  }
  async function dispatch(command) {
    if(command.type==='reconcile_review_dependency_reuse'){
      if(!state)fail('ROSTER_WORKFLOW_NOT_INITIALIZED');
      const selected=new Map(command.reused.map(row=>[row.appliesToWorkId,row])),changed=[],before=clone(state);
      const considered=command.consideredWorkIds?new Set(command.consideredWorkIds):null;
      for(const work of state.work.filter(w=>w.draftRevision===state.draftRevision&&w.role==='roster_workflow_final_review')){
        // Absence from a NEW round's selection is not a negative result for an older round.
        if(considered&&!considered.has(work.id)||!rosterReviewUnissuedV1(work))continue;
        const row=selected.get(work.id),proof=row?.reuseProof;
        if(proof){
          const prior=state.work.find(w=>w.id===proof.originWorkId);
          if(proof.kind!=='unchanged_review_dependencies'||proof.appliesToDraftRef!==state.draftRef
            ||proof.appliesToRevision!==state.draftRevision||proof.originResultRef!==prior?.resultRef
            ||row.resultRef!==prior?.resultRef||proof.originRevision!==prior?.draftRevision
            ||prior.draftRevision>=state.draftRevision||proof.newModelReview!==false
            ||proof.originalResultRewritten!==false)fail('ROSTER_REVIEW_REUSE_PROOF_MISMATCH',{workId:work.id});
          if(!persistedEqual(work.reviewDependencyReuse??null,proof)){
            work.reviewDependencyReuse=clone(proof);work.resultRef=prior.resultRef;work.status='evidence_ready';changed.push(work.id);
            event('unissued_review_dependency_reused',{workId:work.id,originWorkId:prior.id,
              originResultRef:prior.resultRef,newModelReview:false,acceptanceGranted:false});
          }
        }else if(work.reviewDependencyReuse){
          const old=work.reviewDependencyReuse;delete work.reviewDependencyReuse;
          work.resultRef=null;work.status='waiting_dependency';changed.push(work.id);
          event('review_dependency_reuse_invalidated',{workId:work.id,originResultRef:old.originResultRef,
            reason:'dependencies_no_longer_equal',historyReset:false});
        }
      }
      // A zero-model fan-in may contain a withdrawn derived child. Preserve its
      // old artifact, invalidate only that deterministic aggregate and requeue it.
      for(const parent of state.work.filter(w=>w.draftRevision===state.draftRevision
        &&w.inputs.atomicReviewAggregate&&w.status==='evidence_ready'&&w.resultRef&&!w.operationState?.pending
        &&!(w.operationState?.calls?.length))){
        const body=await store.get(parent.resultRef),members=body.value?.atomicReviewAggregation?.members;
        if(!members?.some(m=>m.reuseProof))continue;
        const stale=members.some(m=>{const child=state.work.find(w=>w.id===m.workId);
          return child?.status!=='evidence_ready'||child.resultRef!==m.resultRef
            ||!persistedEqual(child.reviewDependencyReuse??null,m.reuseProof??null);});
        if(stale){const old=parent.resultRef;
          parent.reviewAggregationHistory=[...(parent.reviewAggregationHistory??[]),{resultRef:old,inputRef:parent.inputRef??null,dispatchKey:parent.dispatchKey??null,attempt:parent.attempt??null,reason:'child_reuse_invalidated'}];
          parent.resultRef=null;parent.status='waiting_dependency';parent.inputRef=null;parent.dispatchKey=null;
          changed.push(parent.id);event('review_aggregate_dependency_invalidated',{workId:parent.id,resultRef:old,historyReset:false});
        }
      }
      if(changed.length){refresh();try{await checkpoint();}catch(error){state=before;writes=Promise.resolve();observations.clear();throw error;}}
      return {changed};
    }
    if(command.type==='reconcile_method_recovery_owners'){

      if(!state)fail('ROSTER_WORKFLOW_NOT_INITIALIZED');
      const competing=await reconcileMethodRecoveryOwners(),delegated=await reconcileReturnedMethods();
      return {returned:competing.returned+delegated.returned};
    }
    if(command.type==='initialize'){
      if(state)fail('ROSTER_WORKFLOW_ALREADY_INITIALIZED');
      if(!command.scope||Object.values(command.scope).some(v=>!idOK(v)))fail('ROSTER_WORKFLOW_SCOPE_INVALID');
      state={schema,scope:clone(command.scope),evidence:[],work:[],reads:[],events:[],acceptanceGranted:false};
      event('initialized',{scope:state.scope});await checkpoint();return clone(state);
    }
    if(!state)fail('ROSTER_WORKFLOW_NOT_INITIALIZED');
    if(command.type==='settle_completed_comparison_navigation'){
      const rows=await projectRosterCompletedComparisonNavigationV1({state,readArtifact:store.get});
      if(!rows.length)return {retired:[]};
      const before=clone(state);
      for(const row of rows){
        const work=state.work.find(w=>w.id===row.workId);
        work.comparisonNavigationSettlement=clone(row);
        work.supersededByWorkId=row.authorWorkId;work.status='superseded';
        event('comparison_navigation_settled',{...row,originalArtifactsPreserved:true});
      }
      try{await checkpoint();}catch(error){state=before;writes=Promise.resolve();observations.clear();throw error;}
      return {retired:rows.map(row=>row.workId)};
    }
    if(command.type==='reconcile_comparison_authorizations'){
      const stale=await rosterUnissuedStaleComparisonDesignsV1({state,readArtifact:store.get});
      if(!stale.length)return {retired:[]};
      const before=clone(state);
      for(const row of stale){
        const work=state.work.find(w=>w.id===row.workId);
        work.comparisonAuthorizationSuperseded=clone(row);work.status='superseded';
        event('unissued_comparison_authorization_superseded',{...row,
          originalArtifactsPreserved:true,providerReplay:false,experimentApproved:false});
      }
      try{await checkpoint();}catch(error){state=before;writes=Promise.resolve();observations.clear();throw error;}
      return {retired:stale.map(row=>row.workId)};
    }
    if(command.type==='reconcile_calculation_results'){
      const restoredAuthorScopes=await restoreCalculationAuthorScope();
      const controlBefore=clone(state),controls=retainCalculationControlOwners();
      if(controls){
        refresh();
        try{await checkpoint();}catch(error){state=controlBefore;writes=Promise.resolve();observations.clear();throw error;}
      }
      const recovery=await projectRosterCalculationRecoveryV1({state,readArtifact:store.get});
      if(!recovery)return {scheduled:[],invalidated:[],retainedControlOwners:controls,restoredAuthorScopes};
      const {report,queries,author}=recovery;
      const jobs=[...queries,...(author?[author]:[])];
      for(const job of jobs){
        if(state.work.some(work=>work.id===job.id))fail('ROSTER_WORKFLOW_CALCULATION_RECOVERY_CONFLICT',job.id);
        validateBindings(job.bindings,state.scope);job.status='waiting_dependency';job.resultRef=null;job.failure=null;
      }
      const heldGoal=author?.investigationFrontierOf?state.work.find(work=>work.id===author.investigationFrontierOf):null;
      if(author?.investigationFrontierOf&&heldGoal?.investigationHandoff?.decisionId!==author.calculationRecoveryOf)
        fail('ROSTER_WORKFLOW_CALCULATION_OWNER_CHANGED');
      const before=clone(state),reportRef=await store.put(report);
      const invalidEvidence=new Set(report.invalidEvidenceIds),obsolete=new Set(report.obsolete.map(row=>row.workId));
      for(const evidence of state.evidence)if(invalidEvidence.has(evidence.id)){
        evidence.preInvalidationBindings??=clone(evidence.bindings);
        evidence.bindings={...evidence.bindings,invalidatedCalculation:reportRef};
        evidence.calculationInvalidation={reportRef,reason:report.reason};
      }
      for(const work of state.work)if(obsolete.has(work.id)||report.affectedInterpretationIds.includes(work.id)){
        work.calculationInvalidation={reportRef,reason:report.reason};
        // A method's control ownership is not a factual approval. Keep its
        // history/held-goal link; retire only numeric producers and interpreters.
        if(work.role==='roster_workflow_experiment_planner')continue;
        work.preInvalidationBindings??=clone(work.bindings);
        work.bindings={...work.bindings,invalidatedCalculation:reportRef};work.status='superseded';
      }
      if(author?.investigationFrontierOf){
        const goal=heldGoal;
        goal.investigationHandoff={...goal.investigationHandoff,decisionId:author.id,
          previousDecisionIds:[...(goal.investigationHandoff.previousDecisionIds??[]),author.calculationRecoveryOf]};
      }
      state.work.push(...jobs);retainCalculationControlOwners();refresh();
      event('obsolete_calculations_retracted',{reportRef,workIds:report.obsolete.map(row=>row.workId),
        replacementQueryIds:queries.map(work=>work.id),authorWorkId:author?.id??null,
        originalArtifactsPreserved:true,planApproved:false});
      try{await checkpoint();}catch(error){state=before;writes=Promise.resolve();observations.clear();throw error;}
      return {scheduled:jobs.map(work=>work.id),invalidated:report.invalidEvidenceIds,reportRef};
    }
    if(command.type==='reconcile_plan_revision_handoffs'){
      const returns=await projectRosterPlanRevisionReturnsV1({state,readArtifact:store.get});
      // Owner and held-goal release are one checkpoint. There is no caller-
      // supplied replacement envelope, counter reset, paid retry or approval.
      for(const {goalId,frontierId,writerId,receiptRef,job}of returns){
        const goal=state.work.find(w=>w.id===goalId);
        state.work.push(job);
        goal.investigationHandoffHistory=[...(goal.investigationHandoffHistory??[]),
          {...clone(goal.investigationHandoff),returnedByWorkId:job.id,
            completedStrategicDecisionId:writerId,planRevisionReceiptRef:receiptRef}];
        delete goal.investigationHandoff;
        event('plan_revision_returned_to_experiment',{goalId,frontierId,workId:job.id,
          completedStrategicDecisionId:writerId,receiptRef,draftRevision:state.draftRevision,
          historyReset:false,providerReplayed:false,nativeReplayed:false,planApproved:false});
      }
      if(returns.length){refresh();await checkpoint();}
      return returns.map(({goalId,job})=>({goalId,workId:job.id}));
    }
    if(command.type==='reconcile_delegated_scene_identity'){
      const resumed=[],graph=createRosterWorkflowGraphV1(state),change='delegated_scene_identity_v1';
      for(const work of state.work.filter(w=>w.role==='roster_workflow_tool'&&w.status==='needs_model_choice'
        &&fresh(w)&&!w.branchReturnRef&&!w.operationState?.pending&&!w.operationState?.completedRef
        &&w.resultRef&&!w.failureHistory?.some(item=>item.change===change))){
        const request=work.inputs?.request?.value;
        // Only failed read-only queries. No action replay, unknown dispatch,
        // parameter rewrite or competing repair is recovered by this command.
        if(!['spatial','probability','threat_exchange','inspect'].includes(request?.operation)
          ||state.work.some(child=>child.repairOf===work.id||child.choiceOf===work.id))continue;
        const prior=(await store.get(work.resultRef)).value;
        if(prior?.nativeSuccess!==false||prior.code!=='PREGAME_LAB_BRANCH_UNKNOWN'
          ||prior.operation!==request.operation||!isDeepStrictEqual(prior.submittedArguments,request.args))continue;
        const scenes=await projectRosterWorkflowDelegatedScenesV1({state,workId:work.id,readArtifact:store.get});
        let binding;
        try{binding=bindRosterWorkflowDelegatedSceneV1({args:request.args,scenes}).binding;}
        catch{continue;} // Ambiguous identity remains a model choice, not a retry.
        if(!binding||graph.ancestors(work.id).some(parent=>parent.completedMethodHandoff))continue;
        work.failureHistory=[...(work.failureHistory??[]),{change,originalResultRef:work.resultRef,
          originalInputRef:work.inputRef,originalOperationState:clone(work.operationState),binding:clone(binding),
          originalRepairGeneration:work.repairGeneration,historyReset:false}];
        work.status='ready';work.failure=null;resumed.push(work.id);
        event('delegated_scene_identity_reconciled',{workId:work.id,originalResultRef:work.resultRef,
          binding,modelCalled:false,toolExecuted:false,historyReset:false});
      }
      if(resumed.length){refresh();await checkpoint();}
      return {resumed,toolExecutions:0,providerCalls:0};
    }
    if(command.type==='reconcile_source_review_lineage'){
      const restored=[];
      for(const review of state.work.filter(w=>w.sourceReviewRepairHandoff&&w.status!=='superseded')){
        const recovery=await projectRosterSourceReviewLineageRestorationV1({state,review,readArtifact:store.get});
        if(!recovery)continue;
        for(const saved of recovery.originals){
          const work=state.work.find(w=>w.id===saved.id);
          work.reviewRepairHistory=[...(work.reviewRepairHistory??[]),{...clone(work.reviewRepairSupersession),
            disposition:'restored_completed_revision_lineage'}];
          delete work.reviewRepairSupersession;work.status=saved.status;
        }
        for(const id of recovery.retiredIds){const work=state.work.find(w=>w.id===id);
          work.status='superseded';work.supersededByWorkId=recovery.completedRevisionId;}
        event('source_review_completed_lineage_restored',{...recovery,providerReplayed:false,
          nativeReplay:false,historyReset:false,planApproved:false});
        restored.push({reviewId:review.id,completedRevisionId:recovery.completedRevisionId});
      }
      if(restored.length){refresh();await checkpoint();}
      return {restored,providerCalls:0,toolExecutions:0};
    }
    if(command.type==='reconcile_review_request_shapes'){
      const recovered=[];
      for(const work of state.work.filter(w=>fresh(w))){
        const coverage=await projectRosterUnissuedAuthorCoverageV1({work,readArtifact:store.get});
        if(coverage){
          work.inputHistory=[...(work.inputHistory??[]),{inputs:clone(work.inputs),reason:'author_public_fact_coverage_v1',authorResultRef:coverage.authorResultRef}];
          work.inputs=coverage.inputs;recovered.push(work.id);
          event('comparison_author_public_coverage_bound',{workId:work.id,authorResultRef:coverage.authorResultRef,providerReplayed:false,historyReset:false});
        }
        const recovery=await rosterReviewRequestShapeRecoveryV1({work,readArtifact:store.get});
        if(!recovery)continue;
        work.requestShapeRecoveries=[...(work.requestShapeRecoveries??[]),recovery];
        work.failure=null;work.status='ready';recovered.push(work.id);
        event('review_request_shape_reconciled',{workId:work.id,...recovery});
      }
      if(recovered.length){refresh();await checkpoint();}
      return {recovered,providerCalls:0,toolExecutions:0};
    }
    if(command.type==='reconcile_unissued_bound_inputs'){
      const resumed=[];
      // The old binder threw before its first operation checkpoint and lost
      // the source-owned repair lane. Revalidate its EXACT saved assignment;
      // do not infer safety merely from an error name or replay a Native call.
      if(validateToolBindings)for(const work of state.work.filter(w=>w.role==='roster_workflow_tool'
        &&w.status==='needs_repair'&&fresh(w)&&!w.operationState&&!w.resultRef&&w.inputRef
        &&['ROSTER_WORKFLOW_STATE_REF_INVALID','ROSTER_WORKFLOW_STATE_REF_CONFLICT'].includes(w.failure?.code))){
        const saved=await store.get(work.inputRef),selected=work.inputs.request?.value;
        if(saved.workId!==work.id||saved.role!==work.role||!persistedEqual(saved.scope,state.scope)
          ||!persistedEqual(saved.inputs?.request?.value,selected))continue;
        let rejection;
        try{validateToolBindings(selected,saved.inputs);}catch(error){
          if(error.code===work.failure.code)rejection=projectRosterWorkflowStateBindingFailureV1({selected,error});
        }
        if(!rejection)continue;
        work.failureHistory=[...(work.failureHistory??[]),{failure:clone(work.failure),inputRef:work.inputRef,
          reason:'state_binding_input_return_v1',nativeExecuted:false}];
        work.resultRef=await store.put(rejection);work.status='needs_model_choice';work.failure=null;
        resumed.push(work.id);
        event('unissued_state_binding_returned',{workId:work.id,resultRef:work.resultRef,
          toolReplayed:false,countersReset:false,originalFailureRetained:true});
      }
      // A source-fixed transport failure is recoverable only if the real
      // executor binder accepts every retained dependency. No model copying,
      // Native replay, uncertain outcome, or counter reset is involved.
      if(validateToolBindings)for(const work of state.work.filter(w=>w.role==='roster_workflow_tool'
        &&w.status==='needs_repair'&&fresh(w)&&w.failure?.code==='ROSTER_WORKFLOW_TOOL_POINTER_MISSING'
        &&w.failure.dispatchOutcome==='not_dispatched'&&!w.operationState?.pending&&!w.operationState?.completedRef)){
        const request=work.inputs.request?.value,change='executor_bound_arguments_v1';
        if(!request?.bindings?.some(b=>b.pointer===work.failure.detail)
          ||work.failureHistory?.some(h=>h.reason===change))continue;
        const inputs={};let complete=true;
        for(const binding of request.bindings){
          const source=work.inputs[binding.name],parent=source?.source==='work'&&state.work.find(w=>w.id===source.id);
          if(parent?.status!=='evidence_ready'||!fresh(parent)||!parent.resultRef){complete=false;break;}
          const result=select(await store.get(parent.resultRef),source.pointer);
          if(!result.ok){complete=false;break;}
          inputs[binding.name]={value:result.value,workId:parent.id,resultRef:parent.resultRef};
        }
        if(!complete)continue;
        try{validateToolBindings(request,inputs);}catch{continue;}
        work.failureHistory=[...(work.failureHistory??[]),{failure:clone(work.failure),inputRef:work.inputRef,
          reason:change,sourceResultRefs:Object.values(inputs).map(i=>i.resultRef)}];
        work.status='ready';work.failure=null;resumed.push(work.id);
        event('unissued_bound_input_reconciled',{workId:work.id,reason:change,toolReplayed:false});
      }
      for(const work of state.work.filter(w=>w.role==='roster_workflow_tool'&&w.status==='needs_repair'&&fresh(w)
        &&w.failure?.code==='ROSTER_WORKFLOW_TOOL_BINDING_CONFLICT'&&w.failure.dispatchOutcome==='not_dispatched'
        &&!w.operationState?.pending&&!w.operationState?.completedRef)){
        const request=work.inputs.request?.value;
        const binding=request?.bindings?.find(b=>b.pointer===work.failure.detail);
        const source=binding&&work.inputs[binding.name];
        const parent=source?.source==='work'&&state.work.find(w=>w.id===source.id);
        if(parent?.status!=='evidence_ready'||!fresh(parent)||!select(request.args,binding.pointer).ok)continue;
        if(!select(await store.get(parent.resultRef),source.pointer).ok)continue;
        work.failureHistory=[...(work.failureHistory||[]),{failure:clone(work.failure),inputRef:work.inputRef,
          reason:'bound_arguments_v2_explicit_dependency',sourceResultRef:parent.resultRef}];
        work.status='ready';work.failure=null;resumed.push(work.id);
        event('unissued_bound_input_reconciled',{workId:work.id,sourceWorkId:parent.id,toolReplayed:false});
      }
      if(resumed.length){refresh();await checkpoint();}
      return {resumed,toolExecutions:0};
    }
    if(command.type==='reconcile_receipt_pointer_roots'){
      const rebound=[];
      for(const work of state.work.filter(w=>w.role==='roster_workflow_tool'&&w.status==='needs_model_choice'
        &&fresh(w)&&!w.operationState?.pending&&!state.work.some(child=>child.repairOf===w.id))){
        const prior=await store.get(work.resultRef);
        if(prior.value?.reason!=='dependency_pointer_absent'||prior.value.executed!==false)continue;
        const changes=[];
        for(const [name,input] of Object.entries(work.inputs)){
          if(input.source!=='work'||!input.pointer.startsWith('/value/receipt/receipt/'))continue;
          const parent=state.work.find(w=>w.id===input.id);
          if(parent?.status!=='evidence_ready')continue;
          const source=await store.get(parent.resultRef),pointer=rosterWorkflowReceiptPointerV1(input.pointer.slice('/value/receipt'.length));
          if(select(source,input.pointer).ok||!select(source,pointer).ok)continue;
          changes.push({input:name,from:input.pointer,to:pointer,sourceResultRef:parent.resultRef});
        }
        if(!changes.length)continue;
        work.inputHistory=[...(work.inputHistory||[]),{inputs:clone(work.inputs),resultRef:work.resultRef,
          reason:'receipt_root_alias_compiler_v2',changes:clone(changes)}];
        changes.forEach(c=>{work.inputs[c.input].pointer=c.to;});
        work.status='ready';work.failure=null;rebound.push(work.id);
        event('receipt_pointer_root_rebound',{workId:work.id,changes,priorResultRef:work.resultRef,toolReplayed:false});
      }
      if(rebound.length){refresh();await checkpoint();}
      return {rebound,toolExecutions:0};
    }
    if(command.type==='reconcile_unissued_input_failures'){
      const routed=[];
      for(const work of state.work.filter(w=>w.status==='needs_repair'&&fresh(w)
        &&w.failure?.dispatchOutcome==='not_dispatched'&&!w.operationState?.pending)){
        if(work.failure.code==='ROSTER_WORKFLOW_INPUT_PATH_MISSING'){
          if(await routeMissingInput(work,work.failure.detail?.input))routed.push(work.id);
        }else if(work.failure.code==='ROSTER_WORKFLOW_NATIVE_ACTION_INPUT_INVALID'
          &&work.role==='roster_workflow_tool'&&work.inputs.request?.value?.operation==='native_action'){
          // Re-enter only the unissued validator, which now returns its precise
          // input contract to the model. Unknown/issued outcomes never qualify.
          work.failureHistory=[...(work.failureHistory??[]),{failure:clone(work.failure),inputRef:work.inputRef,
            reason:'native_action_input_return_v1'}];
          work.status='ready';work.failure=null;routed.push(work.id);
          event('unissued_action_input_reconciled',{workId:work.id,toolReplayed:false,modelChoiceRequired:true});
          refresh();await checkpoint();
        }
      }
      return {routed,toolExecutions:0};
    }
    if(command.type==='publish_evidence'){
      const entry=await prepareEvidenceEntry(command),{id,artifactRef,kind}=entry;
      const existing=state.evidence.find(e=>e.id===id);
      if(existing){
        verifyRetainedEvidence(existing,entry);
        return clone(existing);
      }
      state.evidence.push(entry);event('evidence_published',{evidenceId:id,artifactRef,kind});
      refresh();await checkpoint();return clone(entry);
    }
    if(command.type==='publish_evidence_batch'){
      if(!Array.isArray(command.entries)||!command.entries.length)fail('ROSTER_WORKFLOW_EVIDENCE_BATCH_INVALID');
      // Immutable payloads may be written first. No registry, event or work
      // status changes until EVERY entry passed the same single-entry contract.
      // An orphan payload after failure is harmless and reused on cold resume.
      const byId=new Map(state.evidence.map(entry=>[entry.id,entry])),added=[],returned=[];
      for(const input of command.entries){
        const entry=await prepareEvidenceEntry(input),existing=byId.get(entry.id);
        if(existing){verifyRetainedEvidence(existing,entry);returned.push(existing);continue;}
        byId.set(entry.id,entry);added.push(entry);returned.push(entry);
      }
      if(!added.length)return clone(returned);
      const evidenceLength=state.evidence.length,eventLength=state.events.length;
      const statuses=state.work.map(work=>work.status);
      try{
        for(const entry of added){state.evidence.push(entry);
          event('evidence_published',{evidenceId:entry.id,artifactRef:entry.artifactRef,kind:entry.kind});}
        refresh();await checkpoint();
      }catch(error){
        // A failed atomic store save keeps the old disk checkpoint. Do not
        // expose half a Plan in memory either; the normal caller stops and
        // resumes from disk, not from an assumed successful write.
        state.evidence.length=evidenceLength;state.events.length=eventLength;
        state.work.forEach((work,index)=>{work.status=statuses[index];});
        throw error;
      }
      return clone(returned);
    }
    if(command.type==='read_evidence')return read(command.consumer,command.evidenceId,command.pointer??'');
    if(command.type==='handoff_repeated_inspection'){
      // Explicit post-repair control return, not automatic recovery. The exact
      // repeated observation needs no LLM summary and does not answer a fact.
      const work=state.work.find(w=>w.id===command.workId),graph=createRosterWorkflowGraphV1(state);
      if(work?.role==='roster_workflow_strategy_decision'){
        const invalid=()=>fail('ROSTER_WORKFLOW_OWNER_DELIVERY_REPAIR_INVALID');
        if(!idOK(command.reason)||!idOK(command.engineeringChangeId)||!fresh(work))invalid();
        if(work.ownerDeliveryRepairRef){
          const record=await store.get(work.ownerDeliveryRepairRef);
          if(record.engineeringChangeId!==command.engineeringChangeId
            ||record.proof.stop.returnedResultRef!==command.expectedOwnerResultRef)invalid();
          return {decisionId:work.id,reportRef:work.ownerDeliveryRepairRef,alreadyHeld:true,planApproved:false};
        }
        if(work.status!=='ready'||work.inputRef||work.resultRef||work.operationState
          ||state.work.some(w=>w.status==='running'||w.operationState?.pending))invalid();
        const proof=await projectRosterStoppedOwnerDeliveryRepairV1({state,work,readArtifact:ref=>store.get(ref)});
        if(!proof||proof.stop.returnedResultRef!==command.expectedOwnerResultRef)invalid();
        const inputs={...clone(work.inputs),ownerDeliveryRepair:{source:'literal',value:proof}};
        const reportRef=await store.put({kind:'owner_delivery_repair',workId:work.id,proof,
          reason:command.reason,engineeringChangeId:command.engineeringChangeId,
          originalInputs:clone(work.inputs),inputs:clone(inputs),providerReplayed:false,planApproved:false});
        // Re-envelope the UNISSUED successor, not the paid author. Keep its
        // original input and cycle stop in an immutable record; no new lane,
        // original result rewrite, reset or experiment authorization.
        work.inputs=inputs;work.ownerDeliveryRepairRef=reportRef;
        event('stopped_owner_delivery_repaired',{workId:work.id,reportRef,sourceWorkId:proof.sourceWorkId,
          engineeringChangeId:command.engineeringChangeId,historyReset:false,planApproved:false});
        await checkpoint();return {decisionId:work.id,reportRef,planApproved:false};
      }
      const owner=state.work.find(w=>w.id===work?.experimentOwnerId);
      const ownerRelation=owner&&graph.owner(owner.id);
      const goal=state.work.find(w=>w.id===ownerRelation?.goalId);
      const invalid=()=>fail('ROSTER_WORKFLOW_NO_PROGRESS_HANDOFF_INVALID');
      if(!idOK(command.reason)||!idOK(command.engineeringChangeId)||!work||!fresh(work)
        ||!owner||owner.status!=='evidence_ready'||!fresh(owner)||!goal
        ||owner.resultRef!==command.expectedOwnerResultRef)invalid();
      if(work.noProgressHandoffRef){
        if(goal.investigationHandoff?.reportRef!==work.noProgressHandoffRef)invalid();
        const report=await store.get(work.noProgressHandoffRef);
        if(report.engineeringChangeId!==command.engineeringChangeId||report.ownerResultRef!==owner.resultRef)invalid();
        return {...clone(goal.investigationHandoff),alreadyHeld:true,planApproved:false};
      }
      if(!['ready','needs_repair'].includes(work.status)||work.resultRef||goal.investigationHandoff
        ||work.operationState?.calls?.length||state.work.some(w=>w.status==='running'||w.operationState?.pending)
        ||work.status==='needs_repair'&&work.operationState?.noProgressStop?.reason!=='repeated_inspection_only_batch'
        ||graph.latestExperimentOwners().find(w=>w.experimentGoalId===goal.id)?.id!==ownerRelation.ownerWorkId)invalid();
      const repeated=await projectRepeatedInspectionOnlyBatchV1({state,workId:work.id,store});
      if(!repeated)invalid();
      const result=await store.get(owner.resultRef),draft=await store.get(state.draftRef);
      const job=createRosterExperimentOwnerContinuationV1({state,owner,result,summaryIds:[],draft,
        requirements:command.requirements,returnReason:repeated.reason});
      if(job?.role!=='roster_workflow_strategy_decision'||state.work.some(w=>w.id===job.id))invalid();
      job.inputs.noProgressBoundary={source:'literal',value:{version:1,
        engineeringChangeId:command.engineeringChangeId,reason:command.reason,retainedObservation:clone(repeated),
        summaryNotRequested:true,factsApproved:false,planApproved:false,historyReset:false,
        instruction:'This method stopped because its only inspection exactly repeated a saved current observation. No new factual summary was generated. Read originalObservation and the preserved question ledger, then make the strategic owner decision. Do not ask the fact role to reconfirm this same state or re-authorize the same experiment. A different necessary inquiry must identify its missing predicate, changed measurement and decision consequence. This is not proof of arrival, global impossibility, a capability blocker or a successful Plan.'}};
      for(const [name,id]of [['originalObservation',repeated.originalWorkId],['repeatedObservation',repeated.repeatedWorkId]]){
        const source=state.evidence.find(e=>e.id===`tool:${id}`);
        if(!source||source.availability!=='available'||!rosterWorkflowBindingsMatchV1(source.bindings,state.scope))invalid();
        job.inputs[name]={source:'evidence',id:source.id,pointer:''};
      }
      const members=state.work.filter(w=>graph.owner(w.id)?.goalId===goal.id);
      const reportRef=await store.put({kind:'investigation_returned_to_strategy',goalId:goal.id,decisionId:job.id,
        reason:command.reason,engineeringChangeId:command.engineeringChangeId,ownerResultRef:owner.resultRef,
        noProgress:clone(repeated),originalWork:members.map(w=>({id:w.id,status:w.status,resultRef:w.resultRef??null})),
        evidenceRetained:true,historyReset:false,providerReplayed:false,planApproved:false,nativeQueryAutomaticallyResolved:false});
      // One checkpoint owns the queued author, held old goal and retained stop.
      // No paid reply, original observation, unknown or retry count is replaced.
      work.operationState??={};
      work.operationState.noProgressStop??={version:1,...clone(repeated),automaticRetry:false,acceptanceGranted:false,historyReset:false};
      work.status='needs_repair';
      work.failure??={code:'ROSTER_WORKFLOW_ROLE_NO_PROGRESS',dispatchOutcome:'completed_no_progress',detail:clone(repeated)};
      work.noProgressHandoffRef=reportRef;
      state.work.push({...job,status:'waiting_dependency',resultRef:null});
      goal.investigationHandoff={decisionId:job.id,reportRef};
      event('repeated_inspection_returned_to_strategy',{workId:work.id,goalId:goal.id,decisionId:job.id,reportRef,
        engineeringChangeId:command.engineeringChangeId,summaryDispatched:false,planApproved:false,historyReset:false});
      refresh();await checkpoint();return {...clone(goal.investigationHandoff),planApproved:false};
    }
    if(command.type==='hold_experiment_for_strategy'){
      const goal=state.work.find(w=>w.id===command.goalId&&w.experimentGoalId===command.goalId);
      const decision=state.work.find(w=>w.id===command.decisionId);
      // Facts deliberately omit Plan identity; their strategic successor must
      // additionally own the CURRENT Plan. Preserve exact fact bindings and
      // verify the actual delivered draft, rather than requiring equal scopes.
      const draftInput=decision?.inputs?.wholeDraft;
      const promotedOwner=goal&&decision&&!Object.hasOwn(goal.bindings,'plan')
        &&isDeepStrictEqual(factBindings(goal.bindings),factBindings(decision.bindings))
        &&decision.bindings.plan===state.scope.plan&&draftInput?.source==='literal'
        &&draftInput.value?.revision===state.draftRevision
        &&draftInput.value?.plan?.planHash===state.scope.plan;
      const reviewGroupOwner=decision?.reviewResolutionOwnerVersion===1
        &&decision.reviewResolutionGroupId===goal?.resolutionGroupId
        &&decision.reviewResolutionGoalIds?.includes(goal?.id);
      if(!goal||goal.role!=='roster_workflow_experiment_planner'||!fresh(goal)||!command.reason
        ||decision?.role!=='roster_workflow_strategy_decision'||decision.investigationFrontierOf!==goal.id&&!reviewGroupOwner
        ||!fresh(decision)||!isDeepStrictEqual(goal.bindings,decision.bindings)&&!promotedOwner
        ||goal.investigationHandoff&&goal.investigationHandoff.decisionId!==decision.id)
        fail('ROSTER_WORKFLOW_INVESTIGATION_HANDOFF_INVALID');
      if(goal.investigationHandoff)return {...clone(goal.investigationHandoff),alreadyHeld:true,planApproved:false};
      const ownership=createRosterWorkflowOwnershipIndexV1(state);
      const members=state.work.filter(w=>ownership(w.id)?.goalId===goal.id);
      // Explicitly park only physically terminated, identity-bound transport
      // failures. Their unknown costs and saved pending request remain history;
      // this does not complete, cancel at Provider, or replay the request.
      const park=command.parkFailedProviderRequests??[];
      const pending=members.filter(w=>w.operationState?.pending);
      if(!Array.isArray(park)||park.length!==pending.length||new Set(park.map(p=>p.workId)).size!==park.length
        ||members.some(w=>w.status==='running')||pending.some(w=>{
          const expected=park.find(p=>p.workId===w.id),op=w.operationState,d=w.failure?.providerDispatch;
          return !expected||w.status!=='needs_repair'||op.retryProviderDispatch
            ||!isExplicitlyRecoverableProviderFailureV1(w.failure)||!isExplicitlyRecoverableProviderDispatchV1(d)
            ||d.contextHash!==op.pending.contextHash||expected.requestRef!==op.pending.requestRef
            ||expected.requestId!==d.requestId||expected.contextHash!==d.contextHash;
        }))fail('ROSTER_WORKFLOW_GOAL_HAS_UNRECONCILED_DISPATCH');
      const originalWork=members.map(w=>({id:w.id,status:w.status,resultRef:w.resultRef??null,
        ...(w.operationState?.pending?{pending:clone(w.operationState.pending),failure:clone(w.failure)}:{})}));
      const reportRef=await store.put({kind:'investigation_returned_to_strategy',goalId:goal.id,decisionId:decision.id,
        reason:command.reason,originalWork,
        evidenceRetained:true,historyReset:false,providerReplayed:false,planApproved:false,nativeQueryAutomaticallyResolved:false});
      const before=clone(state);
      try{
        for(const work of pending){const op=work.operationState;
          op.parkedProviderRequests=[...(op.parkedProviderRequests??[]),{reportRef,decisionId:decision.id,
            originalPending:clone(op.pending),failure:clone(work.failure),providerOutcomeUnknown:true,automaticRetryAllowed:false}];
          op.pending=null;
        }
        goal.investigationHandoff={decisionId:decision.id,reportRef};
        event('investigation_returned_to_strategy',{goalId:goal.id,decisionId:decision.id,reportRef,
          parkedRequestCount:pending.length,planApproved:false,evidenceRetained:true,historyReset:false});
        await checkpoint();
      }catch(error){state=before;throw error;}
      return {...clone(goal.investigationHandoff),planApproved:false};
    }
    if(command.type==='close_optional_comparison'){
      const purpose=currentRosterComparisonPurposeV1(state,command.cycleId);
      const cycle={id:command.cycleId,comparisonPurposeWorkId:purpose?.id,comparisonPurposeResultRef:purpose?.resultRef,
        comparisonExperimentId:purpose?.id+':study'};
      const proof=await projectRosterComparisonClosureV1({state,cycle,readArtifact:store.get});
      if(!proof||proof.authorWorkId!==command.authorWorkId||proof.reviewId!==command.reviewId)
        fail('ROSTER_COMPARISON_CLOSURE_NOT_REVIEWED');
      const goal=state.work.find(w=>w.id===proof.goalId);
      if(goal.comparisonClosure?.reviewResultRef===proof.reviewResultRef)return {
        closed:true,alreadyClosed:true,reportRef:goal.comparisonClosure.reportRef,nativeQueryAutomaticallyResolved:false};
      const members=proof.memberIds.map(id=>state.work.find(w=>w.id===id));
      const reportRef=await store.put({kind:'reviewed_optional_comparison_closure',...proof,
        originalWork:members.map(w=>({id:w.id,status:w.status,resultRef:w.resultRef??null,attempt:w.attempt??0})),
        evidenceRetained:true,providerReplayed:false});
      // Persist the unanswered asset and scheduling closure in one checkpoint.
      const hypothesis=projectRosterDeferredHypothesisV1({proof,scope:state.scope});
      const entry=hypothesis?await prepareEvidenceEntry(hypothesis):null;
      const existing=entry&&state.evidence.find(e=>e.id===entry.id);
      if(existing)verifyRetainedEvidence(existing,entry);
      const before=clone(state);
      try{
        if(entry&&!existing){state.evidence.push(entry);event('evidence_published',{id:entry.id,artifactRef:entry.artifactRef,kind:entry.kind});}
        for(const member of members){member.comparisonClosureRef=reportRef;member.status='superseded';}
        goal.comparisonClosure={authorWorkId:proof.authorWorkId,reviewId:proof.reviewId,reviewResultRef:proof.reviewResultRef,reportRef,
          ...(proof.reviewKind?{reviewKind:proof.reviewKind}:{}),
          ...(entry?{deferredHypothesisRef:entry.artifactRef,deferredHypothesisId:entry.id}:{})};
        event('optional_comparison_closed',{goalId:goal.id,reportRef,reviewId:proof.reviewId,
          comparisonResolutionKind:proof.comparisonResolutionKind,nativeQueryAutomaticallyResolved:false,planApproved:false});
        refresh();await checkpoint();
      }catch(error){state=before;throw error;}
      return {closed:true,reportRef,nativeQueryAutomaticallyResolved:false,
        ...(entry?{deferredHypothesisRef:entry.artifactRef,knowledgeStatus:'unresolved'}:{})};
    }
    if(command.type==='supersede_experiment_goal'){
      const previous=state.work.find(w=>w.id===command.goalId&&w.experimentGoalId===command.goalId);
      const replacement=state.work.find(w=>w.id===command.replacementGoalId&&w.experimentGoalId===command.replacementGoalId);
      if(!previous||!replacement||previous===replacement||!command.reason
        ||previous.role!=='roster_workflow_experiment_planner'||replacement.role!==previous.role
        ||!fresh(replacement)||!bindingsMatch(previous.bindings,replacement.bindings)
        ||previous.supersededByGoalId&&previous.supersededByGoalId!==replacement.id)
        fail('ROSTER_WORKFLOW_GOAL_SUPERSESSION_INVALID');
      if(previous.supersededByGoalId===replacement.id)return {goalId:previous.id,replacementGoalId:replacement.id,
        reportRef:previous.experimentSupersessionRef,alreadySuperseded:true};
      const ownership=createRosterWorkflowOwnershipIndexV1(state);
      const members=state.work.filter(w=>ownership(w.id)?.goalId===previous.id);
      if(members.some(w=>w.status==='running'||w.operationState?.pending))
        fail('ROSTER_WORKFLOW_GOAL_HAS_UNRECONCILED_DISPATCH');
      const reportRef=await store.put({kind:'explicit_experiment_goal_supersession',goalId:previous.id,
        replacementGoalId:replacement.id,reason:command.reason,planApproved:false,nativeQueryAutomaticallyResolved:false,
        originalWork:members.map(w=>({id:w.id,status:w.status,resultRef:w.resultRef??null,attempt:w.attempt??0})),
        evidenceRetained:true,historyReset:false,providerReplayed:false});
      for(const member of members){member.supersededByGoalId=replacement.id;
        member.experimentSupersessionRef=reportRef;member.status='superseded';}
      event('experiment_goal_superseded',{goalId:previous.id,replacementGoalId:replacement.id,reportRef,
        affectedCount:members.length,evidenceRetained:true,historyReset:false});
      refresh();await checkpoint();return {goalId:previous.id,replacementGoalId:replacement.id,reportRef,affectedCount:members.length};
    }
    if(command.type==='yield_competing_method_handoff'){
      const work=state.work.find(row=>row.id===command.workId);
      const replacement=state.work.find(row=>row.id===command.replacementOwnerId);
      const graph=createRosterWorkflowGraphV1(state);
      if(work?.methodHandoffYield?.replacementOwnerId===command.replacementOwnerId)
        return {workId:work.id,...clone(work.methodHandoffYield),alreadyReturned:true};
      const target=state.work.find(row=>row.id===work?.repairOf);
      if(!command.reason||!work?.completedMethodHandoff||work.branchReturnRef
        ||work.role!=='roster_workflow_experiment_planner'||!fresh(work)
        ||!['ready','waiting_dependency','needs_model_choice'].includes(work.status)||work.operationState?.pending
        ||target?.status!=='needs_model_choice'||!fresh(target)
        ||replacement?.role!=='roster_workflow_experiment_planner'||replacement.completedMethodHandoff
        ||replacement.branchReturnRef||!fresh(replacement)||!graph.pendingChain(replacement.id).some(pending=>pending.id===target.id)
        ||!['ready','running','needs_model_choice','waiting_dependency'].includes(replacement.status)
        ||graph.children(work.id,{kinds:['execution','repair','choice']}).length)
        fail('ROSTER_WORKFLOW_METHOD_OWNER_YIELD_INVALID');
      const reportRef=await store.put({kind:'retained_method_handoff_yield',workId:work.id,
        originalResultRef:work.resultRef??null,replacementOwnerId:replacement.id,pendingWorkId:target.id,
        reason:command.reason,priorStatus:work.status,originalRepliesRetained:true,historyReset:false,
        nativeQueryAutomaticallyResolved:false,providerReplayed:false,planApproved:false});
      work.branchReturnRef=reportRef;work.status='returned_to_owner';
      work.methodHandoffYield={replacementOwnerId:replacement.id,reportRef};
      event('competing_method_handoff_returned',{workId:work.id,replacementOwnerId:replacement.id,
        pendingWorkId:target.id,reportRef,nativeQueryAutomaticallyResolved:false,historyReset:false});
      await checkpoint();return {workId:work.id,...clone(work.methodHandoffYield)};
    }
    if(command.type==='return_out_of_scope_choice_branch'){
      const work=state.work.find(row=>row.id===command.workId);
      if(work?.choiceScopeReturn)return {...clone(work.choiceScopeReturn),returned:true,alreadyReturned:true};
      const plan=rosterWorkflowChoiceScopeReturnV1({state,workId:command.workId});
      if(!plan)fail('ROSTER_WORKFLOW_CHOICE_RETURN_UNSAFE',command.workId);
      const members=plan.memberIds.map(id=>state.work.find(row=>row.id===id));
      const reportRef=await store.put({kind:'choice_scope_control_return',...plan,
        reason:'The delegated choice completed. This extra query was outside its responsibility; the original parent retains its own downstream query and necessary unknowns.',
        originalWork:members.map(row=>({id:row.id,status:row.status,resultRef:row.resultRef??null,
          inputRef:row.inputRef??null,attempt:row.attempt??0})),
        evidenceRetained:true,historyReset:false,providerReplayed:false,
        nativeQueryAutomaticallyResolved:false,planApproved:false});
      work.choiceScopeReturn={reportRef,targetWorkId:plan.targetWorkId,returnOwnerId:plan.returnOwnerId};
      for(const member of members){
        member.branchReturnRef=reportRef;
        if(!['evidence_ready','superseded'].includes(member.status))member.status='returned_to_owner';
      }
      event('out_of_scope_choice_branch_returned',{workId:work.id,reportRef,
        targetWorkId:plan.targetWorkId,affectedCount:members.length,
        nativeQueryAutomaticallyResolved:false,historyReset:false});
      refresh();await checkpoint();return {returned:true,...clone(work.choiceScopeReturn)};
    }
    if(['return_experiment_branch','return_empty_formation_branch'].includes(command.type)){
      const work=state.work.find(w=>w.id===command.workId);
      if(work?.branchReturnRef){
        const report=await store.get(work.branchReturnRef);
        return {...report.control,reportRef:work.branchReturnRef,alreadyReturned:true};
      }
      const toolReturn=command.type==='return_empty_formation_branch';
      const controlSource=toolReturn?await projectRosterEmptyFormationChoiceV1({state,workId:command.workId,readArtifact:store.get}):null;
      if(toolReturn?!controlSource:work?.role!=='roster_workflow_experiment_planner'||work.status!=='evidence_ready'||!fresh(work))
        fail('ROSTER_WORKFLOW_BRANCH_RETURN_INVALID');
      const result=await store.get(work.resultRef),conclusion=toolReturn?{
        status:'blocked',answer:controlSource.instruction,
        evidenceRefs:[{id:controlSource.sourceEvidenceId,pointer:controlSource.sourcePointer}],
        conditions:['Tool-owned empty selection control return, not a model conclusion, Native action success, impossibility proof or strategic verdict.'],
        unansweredQuestion:controlSource.originalQuestion
      }:result.value.experimentConclusion;
      if(!conclusion)return {returned:false};
      const graph=createRosterWorkflowGraphV1(state);
      const pendingOwner=owner=>graph.pendingTarget(owner?.id)?.id??null;
      let targetId=toolReturn?work.id:pendingOwner(work),rootTool,owner;const ancestors=new Set();
      if(!targetId)return {returned:false}; // A whole-goal answer follows its existing source review.
      if(state.work.find(w=>w.id===targetId)?.status!=='needs_model_choice')return {returned:false,alreadyResolved:true};
      while(targetId){
        if(ancestors.has(targetId))fail('ROSTER_WORKFLOW_BRANCH_RETURN_CYCLE');
        ancestors.add(targetId);rootTool=state.work.find(w=>w.id===targetId);
        owner=state.work.find(w=>w.id===rootTool?.experimentOwnerId);
        if(!owner||owner.status!=='evidence_ready'||!fresh(owner))fail('ROSTER_WORKFLOW_BRANCH_OWNER_MISSING');
        targetId=pendingOwner(owner);
      }
      const ownerResult=await store.get(owner.resultRef),orders=ownerResult.value.workOrders??[];
      const orderIndex=orders.findIndex((order,index)=>order.steps.some(step=>rootTool.id===`${owner.id}:order${index}:${step.stepId}`));
      if(orderIndex<0)fail('ROSTER_WORKFLOW_BRANCH_ORDER_MISSING');
      const namespace=`${owner.id}:order${orderIndex}`,prior=owner.returnedOrders?.[orderIndex];
      if(prior)return {...prior,ownerWorkId:owner.id,orderIndex,alreadyReturned:true};
      const members=state.work.filter(w=>w.id.startsWith(namespace+':'));
      if(members.some(w=>w.status==='running'||w.operationState?.pending))fail('ROSTER_WORKFLOW_BRANCH_HAS_UNRECONCILED_DISPATCH');
      const existingSummary=state.work.find(w=>w.id===`${namespace}:summary`&&w.status==='evidence_ready');
      const summaryId=existingSummary?.id??`${namespace}:returned-summary`,control={returned:true,ownerWorkId:owner.id,orderIndex,summaryId};
      const stopped=members.filter(w=>['ready','waiting_dependency','needs_model_choice','needs_repair'].includes(w.status));
      const report={kind:toolReturn?'tool_branch_return_not_native_success':'model_branch_return_not_native_success',control,
        originalModelWorkId:toolReturn?null:work.id,originalModelResultRef:toolReturn?null:work.resultRef,
        ...(toolReturn?{originalToolWorkId:work.id,originalToolResultRef:work.resultRef,controlSource}:{}),
        originalBatchResultRef:owner.resultRef,originalOrder:orders[orderIndex],
        conclusion:clone(conclusion),nativeActionSucceeded:false,sourceReviewStillRequired:true,planApproved:false,
        stoppedWork:stopped.map(w=>({id:w.id,status:w.status,resultRef:w.resultRef??null,failure:w.failure??null})),
        completedToolSources:members.filter(w=>w.role==='roster_workflow_tool'&&w.status==='evidence_ready')
          .map(w=>({evidenceId:`tool-view:${w.id}`,resultRef:w.resultRef})),
        instruction:toolReturn?controlSource.instruction:'This is the model ending one experimental method, NOT a successful Native action or a whole-goal answer. Preserve negative/blocked findings and exact original facts. The parent question owner must decide the next method or a source-reviewed conclusion; it may not approve a Plan from this control report.'};
      const reportRef=await store.put(report);
      owner.returnedOrders={...owner.returnedOrders,[orderIndex]:{reportRef,summaryId}};
      for(const member of members){member.branchReturnRef=reportRef;if(stopped.includes(member))member.status='returned_to_owner';}
      event('experiment_branch_returned',{...control,reportRef,modelWorkId:toolReturn?null:work.id,
        ...(toolReturn?{toolWorkId:work.id,controlSourceKind:controlSource.kind}:{}),stoppedCount:stopped.length,
        originalRepliesRetained:true,toolReexecuted:false,nativeActionSucceeded:false});
      refresh();await checkpoint();return {...control,reportRef};
    }
    if(command.type==='commit_draft'){
      if (command.scope?.releaseManifest !== state.scope.releaseManifest) fail('ROSTER_WORKFLOW_RELEASE_CHANGED');
      const currentRevision=state.draftRevision??null;
      const retry=await committedDraftRetry(command);
      if(retry)return retry;
      if(currentRevision!==command.expectedRevision)fail('ROSTER_WORKFLOW_DRAFT_COMMIT_CONFLICT',{currentRevision,expectedRevision:command.expectedRevision});
      if(state.work.some(w=>w.status==='running'))fail('ROSTER_WORKFLOW_DRAFT_COMMIT_WHILE_RUNNING');
      if(command.draft?.schema!=='roster_workflow_draft_v1'||command.draft.revision!==(currentRevision===null?0:currentRevision+1)
        ||command.draft.accepted!==false)fail('ROSTER_WORKFLOW_DRAFT_COMMIT_INVALID');
      if(!command.scope||Object.values(command.scope).some(v=>!idOK(v)))fail('ROSTER_WORKFLOW_SCOPE_INVALID');
      const work=command.workId?state.work.find(w=>w.id===command.workId):null;
      if(command.workId&&(!work||work.status!=='evidence_ready'||work.draftOutcomeRef))fail('ROSTER_WORKFLOW_DRAFT_OWNER_INVALID');
      const draftRef=await store.put(command.draft),receiptRef=command.receipt?await store.put(command.receipt):null;
      const before=clone(state),result={draftRef,revision:command.draft.revision,receiptRef};
      try{
        state.draftRef=draftRef;state.draftRevision=command.draft.revision;state.scope=clone(command.scope);
        if(work)work.draftOutcomeRef=receiptRef;
        event('draft_committed',{workId:command.workId??null,draftRef,revision:state.draftRevision,receiptRef,scope:state.scope});
        refresh();
      }catch(error){state=before;observations.clear();throw error;}
      const intended=clone(state);
      try{await checkpoint();}catch(error){
        pendingDraftCommit={before,intended,command:clone(command)};
        state=before;observations.clear();
        if(await reconcileDraftCommit())return {...result,reconciledAfterSaveError:true};
        fail('ROSTER_WORKFLOW_DRAFT_COMMIT_NOT_PERSISTED',{storageError:error.code??error.message,
          draftRevision:state.draftRevision,retrySameCommit:true});
      }
      return result;
    }
    if(command.type==='record_draft_outcome'){
      const work=state.work.find(w=>w.id===command.workId);
      if(work?.status!=='evidence_ready')fail('ROSTER_WORKFLOW_DRAFT_OWNER_INVALID');
      if(!work.draftOutcomeRef){work.draftOutcomeRef=await store.put(command.outcome);
        event('draft_outcome',{workId:work.id,receiptRef:work.draftOutcomeRef});await checkpoint();}
      return {receiptRef:work.draftOutcomeRef};
    }
    if(command.type==='retry_draft_commit'){
      const work=state.work.find(w=>w.id===command.workId);
      if(work?.status!=='evidence_ready'||!work.draftOutcomeRef||work.draftRevision!==state.draftRevision||!fresh(work)
        ||!command.reason)fail('ROSTER_WORKFLOW_DRAFT_RETRY_INVALID');
      const prior=await store.get(work.draftOutcomeRef);
      if(prior.applied||!['builder_rejected','draft_input_rejected'].includes(prior.status))fail('ROSTER_WORKFLOW_DRAFT_RETRY_INVALID');
      work.draftOutcomeHistory=[...(work.draftOutcomeHistory||[]),{receiptRef:work.draftOutcomeRef,reason:command.reason}];
      work.draftOutcomeRef=null;
      event('draft_commit_retry_requested',{workId:work.id,reason:command.reason,unchangedModelResultRef:work.resultRef});
      await checkpoint();return {workId:work.id,resultRef:work.resultRef};
    }
    if(command.type==='refresh_choice_observation'){
      const work=state.work.find(w=>w.id===command.workId),prior=state.work.find(w=>w.id===work?.choiceOf);
      const oldTask=work?.inputs.task?.value,newTask=command.inputs?.task?.value;
      const knownStop=work?.failure?.code==='ROSTER_WORKFLOW_ROLE_READS_NOT_CONVERGED'
        &&work.failure.dispatchOutcome==='completed_no_progress'
        ||work?.failure?.code==='ROSTER_WORKFLOW_EVIDENCE_NOT_READY'&&work.failure.dispatchOutcome==='not_dispatched';
      if(work?.role!=='roster_workflow_experiment_planner'||prior?.status!=='needs_model_choice'
        ||!['ready','waiting_dependency','needs_model_choice','needs_repair'].includes(work.status)
        ||work.status==='needs_repair'&&!knownStop||work.operationState?.pending||!fresh(work)||!command.reason
        ||command.observationContractVersion!==3||(work.observationContractVersion??0)>=3
        ||!isDeepStrictEqual(oldTask?.question,newTask?.question)
        ||!isDeepStrictEqual(oldTask?.unconfirmedProposal,newTask?.unconfirmedProposal)
        ||!Array.isArray(newTask?.sourceReadContract))fail('ROSTER_WORKFLOW_CHOICE_OBSERVATION_REFRESH_INVALID');
      for(const [name,input]of Object.entries(command.inputs))if(name!=='task'&&(!/^observedSource\d+$/.test(name)
        ||input.source!=='evidence'||typeof input.pointer!=='string'))fail('ROSTER_WORKFLOW_CHOICE_OBSERVATION_INPUT_INVALID');
      work.observationHistory=[...(work.observationHistory??[]),{inputs:clone(work.inputs),failure:clone(work.failure??null),
        operationState:clone(work.operationState??null),priorInputRef:work.inputRef??null,reason:command.reason}];
      for(const name of Object.keys(work.inputs))if(/^observedSource\d+$/.test(name))delete work.inputs[name];
      Object.assign(work.inputs,clone(command.inputs));work.observationContractVersion=3;
      if(work.failure&&work.operationState){
        // Explicit source-contract fix grants one extra result. Paid calls and
        // successful reads survive; this is not another three-round reset.
        work.operationState.correction=null;work.operationState.consecutiveCorrections=0;
        work.operationState.correctionLimit=1;
      }
      work.status='waiting_dependency';work.failure=null;
      event('choice_observation_refreshed',{workId:work.id,version:3,reason:command.reason,providerReplayed:false});
      refresh();await checkpoint();return {id:work.id,status:work.status};
    }
    if(command.type==='rebind_unissued_evidence_input'){
      const work=state.work.find(w=>w.id===command.workId),input=work?.inputs?.[command.inputName];
      if(work?.status!=='needs_repair'||work.failure?.dispatchOutcome!=='not_dispatched'
        ||work.failure?.code!=='ROSTER_WORKFLOW_EVIDENCE_NOT_READY'
        ||work.failure?.detail?.input!==command.inputName||work.failure?.detail?.result?.status!=='path_missing'
        ||work.operationState?.pending||!fresh(work)||input?.source!=='evidence'
        ||input.id!==command.sourceEvidenceId||input.pointer===command.pointer||!command.reason)
        fail('ROSTER_WORKFLOW_UNISSUED_INPUT_REBIND_INVALID');
      const checked=await read(work.id,input.id,command.pointer??'');
      if(checked.status!=='read')fail('ROSTER_WORKFLOW_UNISSUED_INPUT_TARGET_UNREADABLE',checked);
      work.inputBindingHistory=[...(work.inputBindingHistory??[]),{inputName:command.inputName,input:clone(input),
        failure:clone(work.failure),priorInputRef:work.inputRef??null,reason:command.reason}];
      input.pointer=command.pointer??'';work.failure=null;work.status='ready';
      event('unissued_evidence_input_rebound',{workId:work.id,inputName:command.inputName,evidenceId:input.id,
        pointer:input.pointer,reason:command.reason,providerReplayed:false});
      refresh();await checkpoint();return {id:work.id,status:work.status};
    }
    if(command.type==='reinterpret_inventory_claims'){
      const work=state.work.find(w=>w.id===command.workId),parent=state.work.find(w=>w.id===work?.atomicReviewParentId);
      if(work?.status!=='evidence_ready'||!fresh(work)||work.operationState?.pending||!command.reason?.trim()
        ||work.resultRef!==command.expectedResultRef||work.operationState?.calls?.at(-1)?.replyRef!==command.expectedReplyRef
        ||work.inputs?.atomicReviewItem?.value?.inventoryExtractionVersion!==1
        ||!parent||!fresh(parent)||!['ready','waiting_dependency'].includes(parent.status)||parent.resultRef
        ||parent.operationState?.pending||parent.operationState?.calls?.length)
        fail('ROSTER_INVENTORY_REINTERPRETATION_TARGET_INVALID');
      const prior=await store.get(work.resultRef),call=work.operationState.calls.at(-1),request=await store.get(call.requestRef);
      if(prior.value?.inventoryVerification?.version!==1||(prior.value.inventoryVerification.comparisonVersion??1)>=ROSTER_INVENTORY_COMPARISON_VERSION
        ||request.inventoryVerificationState?.version!==1||request.roleCommunication?.workId!==work.id)
        fail('ROSTER_INVENTORY_REINTERPRETATION_PROTOCOL_INVALID');
      work.inventoryInterpretationHistory=[...(work.inventoryInterpretationHistory??[]),{resultRef:work.resultRef,
        requestRef:call.requestRef,replyRef:call.replyRef,reason:command.reason,targetComparisonVersion:ROSTER_INVENTORY_COMPARISON_VERSION}];
      work.operationState.revalidateReplyRef=call.replyRef;
      work.resultRef=null;work.failure=null;work.status='ready';
      event('inventory_comparison_reinterpretation',{workId:work.id,originalResultRef:command.expectedResultRef,
        originalReplyRef:call.replyRef,reason:command.reason,targetComparisonVersion:ROSTER_INVENTORY_COMPARISON_VERSION,providerReplay:false,historyReset:false});
      refresh();await checkpoint();return {workId:work.id,providerReplay:false};
    }
    if(command.type==='recheck_inventory_claims'){
      const old=state.work.find(w=>w.id===command.workId),parent=state.work.find(w=>w.id===old?.atomicReviewParentId);
      const request={workId:command.workId,expectedResultRef:command.expectedResultRef,expectedRequestRef:command.expectedRequestRef,
        authorizationId:command.authorizationId,reason:command.reason};
      const nextId=old?.id+':inventory-extraction:v1',existing=state.work.find(w=>w.id===nextId);
      if(existing){
        if(!isDeepStrictEqual(existing.inventoryContractRecheck?.request,request))fail('ROSTER_INVENTORY_RECHECK_ALREADY_REQUESTED');
        return {workId:existing.id,alreadyScheduled:true};
      }
      const item=old?.inputs?.atomicReviewItem?.value;
      if(!idOK(command.authorizationId)||!command.reason?.trim()
        ||old?.status!=='evidence_ready'||old.role!=='roster_workflow_final_review'||!fresh(old)
        ||old.operationState?.pending||old.resultRef!==command.expectedResultRef
        ||old.operationState?.calls?.at(-1)?.requestRef!==command.expectedRequestRef
        ||item?.checkId!=='component_facts:selected_inventory'||item.inventoryExtractionVersion
        ||!parent||!fresh(parent)||!['ready','waiting_dependency'].includes(parent.status)
        ||parent.resultRef||parent.operationState?.pending||parent.operationState?.calls?.length
        ||parent.draftRevision!==state.draftRevision||parent.reviewRound!==old.reviewRound)
        fail('ROSTER_INVENTORY_RECHECK_TARGET_INVALID');
      const spec=parent.inputs.atomicReviewAggregate?.value,index=spec?.members?.findIndex(m=>m.workId===old.id);
      if(!(index>=0)||spec.members[index].checkId!==item.checkId||parent.inputs['atomicResult'+index]?.id!==old.id)
        fail('ROSTER_INVENTORY_RECHECK_PARENT_INVALID');
      const previousRequest=await store.get(command.expectedRequestRef),previousResult=await store.get(command.expectedResultRef);
      if(previousRequest.inventoryVerificationState||previousRequest.roleCommunication?.workId!==old.id
        ||previousResult.value?.inventoryVerification||previousResult.value?.checks?.length!==1
        ||previousResult.value.checks[0].checkId!==item.checkId)
        fail('ROSTER_INVENTORY_RECHECK_PROTOCOL_INVALID');
      const inputs=clone(old.inputs);inputs.atomicReviewItem.value.inventoryExtractionVersion=1;
      const successor={id:nextId,role:old.role,bindings:clone(old.bindings),draftRevision:old.draftRevision,
        reviewRound:old.reviewRound,atomicReviewParentId:parent.id,inputs,status:'ready',resultRef:null,
        inputRef:null,attempt:0,dispatchKey:null,failure:null,
        operationState:{version:1,turn:0,reads:[],calls:[],correction:null,consecutiveCorrections:0,correctionLimit:1},
        inventoryContractRecheck:{version:1,request,sourceWorkId:old.id,historyReset:false,acceptanceGranted:false}};
      parent.inventoryContractHistory=[...(parent.inventoryContractHistory??[]),{request:clone(request),
        originalInputs:clone(parent.inputs),successorWorkId:nextId}];
      spec.members[index].workId=nextId;parent.inputs['atomicResult'+index].id=nextId;
      state.work.push(successor);
      event('inventory_claim_recheck_authorized',{...clone(request),successorWorkId:nextId,
        parentWorkId:parent.id,reviewRound:old.reviewRound,historyReset:false,additionalInvalidResultsGranted:1});
      refresh();await checkpoint();return {workId:nextId,alreadyScheduled:false};
    }
    if(command.type==='enqueue'){
      if(!Array.isArray(command.work))fail('ROSTER_WORKFLOW_WORK_INVALID');
      const jobs=clone(command.work);
      const reviewOwnerMerges=jobs.filter(w=>w.supersedesUnissuedReviewOwners);
      if(reviewOwnerMerges.length){
        const expected=projectRosterUnissuedReviewOwnerMergeV1({state});
        if(jobs.length!==1||!expected||!persistedEqual(jobs[0],expected))
          fail('ROSTER_REVIEW_OWNER_MERGE_INVALID');
      }
      const reconsiderations=jobs.filter(w=>w.reconsidersFrontierOf||w.reconsidersDecisionOf);
      if(reconsiderations.length){
        const expected=await projectReconsideration({state,readArtifact:store.get});
        const next=reconsiderations[0];
        if(jobs.length!==1||!expected||next.id!==expected.id||next.role!==expected.role
          ||next.reconsidersFrontierOf!==expected.reconsidersFrontierOf
          ||next.reconsidersDecisionOf!==expected.reconsidersDecisionOf
          ||next.investigationFrontierOf!==expected.investigationFrontierOf
          ||next.investigationOwnerId!==expected.investigationOwnerId
          ||next.draftRevision!==expected.draftRevision||!isDeepStrictEqual(next.bindings,expected.bindings)
          // The entire source-derived handoff is the contract. Checking a
          // growing whitelist misses each newly added notification field and
          // also lets the question itself drift from its authorized owner.
          ||!isDeepStrictEqual(next.inputs,expected.inputs))
          fail('ROSTER_WORKFLOW_CONFIGURATION_RECONSIDERATION_INVALID');
      }
      for(const w of jobs){
        if(!idOK(w.id)||!idOK(w.role)||!w.inputs||Array.isArray(w.inputs)||typeof w.inputs!=='object'
          ||Object.hasOwn(w,'dependsOn'))fail('ROSTER_WORKFLOW_WORK_INVALID',w.id);
        validateBindings(w.bindings,state.scope);
        if([...state.work,...jobs].filter(v=>v.id===w.id).length!==1)fail('ROSTER_WORKFLOW_WORK_ID_CONFLICT',w.id);
        for(const input of Object.values(w.inputs)){
          if(!['evidence','work','assumption','literal'].includes(input.source))fail('ROSTER_WORKFLOW_INPUT_INVALID',w.id);
          if(['evidence','work'].includes(input.source)&&(!idOK(input.id)||typeof input.pointer!=='string'))fail('ROSTER_WORKFLOW_INPUT_INVALID',w.id);
          if(input.source==='work'&&![...state.work,...jobs].some(v=>v.id===input.id))fail('ROSTER_WORKFLOW_DEPENDENCY_MISSING',input.id);
          if(input.source==='assumption'&&(!input.publicReason||!Object.hasOwn(input,'value')))fail('ROSTER_WORKFLOW_ASSUMPTION_INVALID',w.id);
          if(input.source==='literal'&&!Object.hasOwn(input,'value'))fail('ROSTER_WORKFLOW_INPUT_INVALID',w.id);
          if(input.scopeUsage!==undefined&&!['current_dependency','historical_reference'].includes(input.scopeUsage))
            fail('ROSTER_WORKFLOW_INPUT_SCOPE_USAGE_INVALID',w.id);
          if(input.scopeUsage==='historical_reference'&&!isHistoricalReferenceInput(w,input))
            fail('ROSTER_WORKFLOW_HISTORY_REFERENCE_READ_ROLE_REQUIRED',w.id);
        }
        w.status='waiting_dependency';w.resultRef=null;
      }
      // Check cycles before mutating the live graph.
      const graph=new Map([...state.work,...jobs].map(w=>[w.id,w]));
      const visit=(id,ancestors=new Set())=>{
        if(ancestors.has(id))fail('ROSTER_WORKFLOW_DEPENDENCY_CYCLE',id);
        for(const parent of dependencies(graph.get(id)))visit(parent,new Set([...ancestors,id]));
      };
      jobs.forEach(w=>visit(w.id));
      const strategyReturns=[];
      for(const next of jobs.filter(w=>w.resumesStrategyFrontierOf)){
        const goal=state.work.find(w=>w.id===next.experimentGoalId);
        const frontier=state.work.find(w=>w.id===next.resumesStrategyFrontierOf);
        const response=state.work.find(w=>w.id===next.completedStrategicDecisionId);
        const route=rosterWorkflowFrontierResponseV1({state,frontier,response});
        const outcome=response?.draftOutcomeRef?await store.get(response.draftOutcomeRef):null;
        const result=response?.resultRef?await store.get(response.resultRef):null;
        const settlement=frontier&&response?await resolveRosterWorkflowFrontierSettlementV1({
          state,frontier,response,outcome,result,readArtifact:store.get}):null;
        if(next.role!=='roster_workflow_experiment_planner'||!goal||!fresh(goal)
          ||goal.investigationHandoff?.decisionId!==frontier?.id||frontier.investigationFrontierOf!==goal.id
          ||next.methodContinuationOf!==frontier.investigationOwnerId
          ||response?.status!=='evidence_ready'||!fresh(response)||response.operationState?.pending
          ||!route||!route.facts.length
          ||!isDeepStrictEqual(next.bindings,goal.bindings)
          ||!settlement||!isDeepStrictEqual(next.inputs?.sameSourceReviewRequest?.value??null,
            settlement.sameSourceReviewRequest)
          ||!isDeepStrictEqual(next.inputs?.scopedStrategyReturn?.value??null,
            settlement.scopedStrategyReturn??null)
          ||(settlement.sameSourceReviewRequest&&next.experimentReviewRound!==settlement.sameSourceReviewRequest.sourceReviewRound))
          fail('ROSTER_WORKFLOW_STRATEGY_RETURN_INVALID');
        const ownership=createRosterWorkflowOwnershipIndexV1(state);
        if(state.work.some(w=>ownership(w.id)?.goalId===goal.id&&(w.status==='running'||w.operationState?.pending)))
          fail('ROSTER_WORKFLOW_GOAL_HAS_UNRECONCILED_DISPATCH');
        strategyReturns.push({goal,next,response,settlement});
      }
      const supersessions=await Promise.all(jobs.filter(w=>w.supersedeUnissuedReview===true).map(async next=>{
        const previous=state.work.find(w=>w.id===next.sourceReviewRecheckOf);
        const scopeDependencyUpgrade=Boolean(next.sourceClaimReuseRefresh&&!previous?.sourceScopeExtension
          &&await rosterSourceScopeRefreshMatchesV1({state,next,jobs,readArtifact:store.get}));
        const numericFactDeliveryUpgrade=Boolean(next.builderNumericFactDeliveryVersion===1
          &&!previous?.builderNumericFactDeliveryVersion
          &&await rosterBuilderFactRecheckMatchesV1({state,next,readArtifact:store.get}));
        const inquiryStageUpgrade=Boolean(next.sourceReviewRepairHandoff
          &&next.sourceInquiryStageVersion>(previous?.sourceInquiryStageVersion??0)
          &&next.sourceReviewRepairHandoff.currentInquiryStageVersion===next.sourceInquiryStageVersion
          &&next.sourceReviewRepairHandoff.staleRequests?.some(r=>r.missingInquiryStage&&r.requestRef));
        const presentationUpgrade=Boolean(next.sourceReviewRepairHandoff
          &&next.sourceReviewPresentationVersion>(previous?.sourceReviewPresentationVersion??0)
          &&next.sourceReviewRepairHandoff.currentSourcePresentationVersion===next.sourceReviewPresentationVersion
          &&next.sourceReviewRepairHandoff.staleRequests?.some(r=>r.missingSourcePresentation));
        const obligationDeliveryUpgrade=Boolean(next.sourceReviewRepairHandoff
          &&next.reviewObligationDeliveryVersion>(previous?.reviewObligationDeliveryVersion??0)
          &&next.sourceReviewRepairHandoff.currentObligationDeliveryVersion===next.reviewObligationDeliveryVersion
          &&next.sourceReviewRepairHandoff.staleRequests?.some(r=>r.missingObligationDelivery&&r.missingObligationFields?.length));
        const proofCitationUpgrade=Boolean(next.sourceReviewRepairHandoff
          &&next.sourceProofCitationVersion>(previous?.sourceProofCitationVersion??0)
          &&next.sourceReviewRepairHandoff.currentProofCitationVersion===next.sourceProofCitationVersion
          &&next.sourceReviewRepairHandoff.staleRequests?.some(r=>r.invalidProofCitations&&r.proofErrors?.length));
        const sceneDeliveryUpgrade=Boolean(next.sourceReviewRepairHandoff
          &&next.measurementSceneDeliveryVersion>(previous?.measurementSceneDeliveryVersion??0)
          &&next.sourceReviewRepairHandoff.currentMeasurementSceneDeliveryVersion===next.measurementSceneDeliveryVersion
          &&next.sourceReviewRepairHandoff.staleRequests?.some(r=>r.requestRef
            &&(r.missingMeasurementSceneDelivery&&r.missingSceneRelations?.length
              ||r.missingNativeConditionDelivery&&r.missingNativeConditions?.length&&r.conditionSourceRequestRef
              ||r.ambiguousMeasurementScope&&r.measurementScopeMarkers?.length)));
        if(previous?.role!=='roster_workflow_final_review'||next.role!==previous.role
          ||previous.experimentSourceReviewOf!==next.experimentSourceReviewOf
          ||previous.sourceFidelityMode!=='atomic_claims_v1'||next.sourceFidelityMode!==previous.sourceFidelityMode
          ||!(next.materialClaimContractVersion>previous.materialClaimContractVersion
             ||(presentationUpgrade||obligationDeliveryUpgrade||proofCitationUpgrade||inquiryStageUpgrade||sceneDeliveryUpgrade||numericFactDeliveryUpgrade||scopeDependencyUpgrade)&&next.materialClaimContractVersion===previous.materialClaimContractVersion)
          ||!bindingsMatch(previous.bindings,next.bindings))fail('ROSTER_SOURCE_REVIEW_SUPERSESSION_INVALID');
        if(previous.status==='running'||previous.operationState?.pending)fail('ROSTER_SOURCE_REVIEW_PENDING_DISPATCH');
        if(!['ready','waiting_dependency','needs_model_choice','evidence_ready','superseded'].includes(previous.status))
          fail('ROSTER_SOURCE_REVIEW_SUPERSESSION_STATE_INVALID');
        let repairMembers=[];
        if(next.sourceReviewRepairHandoff){
          const handoff=next.sourceReviewRepairHandoff;
          if(await rosterSourceReviewRevisionBlocksRepairV1({state,review:previous,
            inquiryMismatch:handoff.staleRequests?.find(r=>r.unassignedPredicateErrors?.length),readArtifact:store.get}))
            fail('ROSTER_SOURCE_REPAIR_HAS_COMPLETED_REVISION');
          const found=rosterSourceReviewRepairMembersV1({state,review:previous,includeCoverageConsumers:inquiryStageUpgrade});
          if(handoff.reviewId!==previous.id||handoff.ownerId!==previous.experimentSourceReviewOf
            ||handoff.nativeReplay!==false||handoff.factsApproved!==false||handoff.historyReset!==false
            ||!isDeepStrictEqual(handoff.retiredRootIds,found.roots.map(w=>w.id))
            ||!(next.comparisonValidityContractVersion>(previous.comparisonValidityContractVersion??0)||presentationUpgrade||obligationDeliveryUpgrade||proofCitationUpgrade||inquiryStageUpgrade||sceneDeliveryUpgrade||numericFactDeliveryUpgrade))
            fail('ROSTER_SOURCE_REPAIR_HANDOFF_INVALID');
          if(inquiryStageUpgrade&&found.roots.some(w=>w.role==='roster_workflow_strategy_decision'&&w.status==='evidence_ready'))
            fail('ROSTER_SOURCE_REPAIR_HAS_COMMITTED_CONSUMER');
          if(found.members.some(w=>w.status==='running'||w.operationState?.pending))
            fail('ROSTER_SOURCE_REPAIR_HANDOFF_PENDING_DISPATCH');
          repairMembers=found.members;
        }
        let cacheRetireMembers=[];
        if(next.sourceClaimReuseRefresh){
          const refresh=next.sourceClaimReuseRefresh,owner=state.work.find(w=>w.id===next.experimentSourceReviewOf);
          const oldIds=[...new Set([...(previous.materialClaimReviewIds??[]),...(previous.materialRuleFields??[]).map(c=>c.reviewId)])];
          const oldMembers=oldIds.map(id=>state.work.find(w=>w.id===id));
          const untouched=w=>w&&['ready','waiting_dependency'].includes(w.status)&&!w.resultRef
            &&!w.operationState?.pending&&!w.operationState?.calls?.length;
          const gained=next.materialClaims.filter(c=>c.reusedResultRef&&!previous.materialClaims.some(p=>
            p.text===c.text&&p.reusedResultRef===c.reusedResultRef&&p.reviewId===c.reviewId));
          if(refresh.version!==1||refresh.previousReviewId!==previous.id||refresh.ownerResultRef!==owner?.resultRef
            ||refresh.historyReset!==false||refresh.providerReplayed!==false||refresh.planApproved!==false
            ||!untouched(previous)||oldMembers.some(w=>!w||(w.status!=='evidence_ready'&&!untouched(w)))
            ||!gained.length||refresh.reusedClaimCount!==gained.length)fail('ROSTER_SOURCE_CACHE_REFRESH_NOT_UNISSUED');
          const retained=new Set([...(next.materialClaimReviewIds??[]),...(next.materialRuleFields??[]).map(c=>c.reviewId)]);
          cacheRetireMembers=oldMembers.filter(w=>untouched(w)&&!retained.has(w.id)
            &&!state.work.some(parent=>parent.id!==previous.id&&parent.status!=='superseded'
              &&(parent.materialClaimReviewIds?.includes(w.id)||parent.materialRuleFields?.some(c=>c.reviewId===w.id))));
        }
        return {previous,next,repairMembers,cacheRetireMembers};
      }));
      for(const {previous,next,repairMembers}of supersessions)if(repairMembers.length){
        const reportRef=await store.put({kind:'source_review_repair_handoff',...next.sourceReviewRepairHandoff,
          replacementReviewId:next.id,originalWork:repairMembers.map(w=>({id:w.id,status:w.status,
            resultRef:w.resultRef??null,attempt:w.attempt??0})),evidenceRetained:true,planApproved:false});
        for(const member of repairMembers){member.reviewRepairSupersession={replacementReviewId:next.id,reportRef};member.status='superseded';}
        event('source_review_repair_returned',{reviewId:previous.id,replacementReviewId:next.id,reportRef,
          affectedCount:repairMembers.length,evidenceRetained:true,historyReset:false,nativeReplay:false});
      }
      for(const {next,cacheRetireMembers}of supersessions)for(const member of cacheRetireMembers){
        const previousStatus=member.status;member.status='superseded';member.supersededByWorkId=next.id;
        event('unissued_source_check_reused',{workId:member.id,replacementWorkId:next.id,
          previousStatus,providerReplayed:false,historyReset:false});
      }
      for(const {previous,next}of supersessions)if(!['evidence_ready','superseded'].includes(previous.status)){
        const previousStatus=previous.status;previous.status='superseded';previous.supersededByWorkId=next.id;
        event('unissued_source_review_superseded',{workId:previous.id,replacementWorkId:next.id,
          previousStatus,originalResultRef:previous.resultRef,providerReplayed:false});
      }
      for(const {goal,next,response,settlement}of strategyReturns){
        const returned=settlement.scopedStrategyReturn;
        if(returned?.closedNoProgressMethod){
          const stopped=state.work.find(w=>w.id===returned.stoppedWorkId);
          // The validated actual author response consumes this control edge,
          // not its unknown facts. Never reopen the stopped summary/method.
          stopped.status='returned_to_owner';stopped.noProgressResolutionWorkId=next.id;
        }
        goal.investigationHandoffHistory=[...(goal.investigationHandoffHistory??[]),
          {...clone(goal.investigationHandoff),returnedByWorkId:next.id,completedStrategicDecisionId:response.id}];
        delete goal.investigationHandoff;
        event('strategy_returned_to_experiment',{goalId:goal.id,workId:next.id,
          completedStrategicDecisionId:response.id,historyReset:false,providerReplayed:false,planApproved:false});
      }
      // The replacement writer and held-goal pointer change in ONE checkpoint.
      // A crash cannot leave a new author orphaned from the original question.
      for(const next of reconsiderations){
        if(!next.investigationFrontierOf){
          event('strategy_contract_returned_to_author',{previousDecisionId:next.reconsidersDecisionOf,
            decisionId:next.id,historyReset:false,nativeReplayed:false,planApproved:false});
          continue;
        }
        const goal=state.work.find(w=>w.id===next.investigationFrontierOf),previous=goal.investigationHandoff.decisionId;
        goal.investigationHandoff={...goal.investigationHandoff,decisionId:next.id,
          previousDecisionIds:[...(goal.investigationHandoff.previousDecisionIds??[]),previous]};
        event('configuration_contract_returned_to_author',{goalId:goal.id,previousDecisionId:previous,
          decisionId:next.id,historyReset:false,nativeReplayed:false,planApproved:false});
      }
      for(const next of reviewOwnerMerges){
        for(const id of next.supersedesUnissuedReviewOwners){
          const old=state.work.find(w=>w.id===id);old.status='superseded';old.supersededBy=next.id;
        }
        event('unissued_review_owners_merged',{workId:next.id,sourceWorkIds:next.supersedesUnissuedReviewOwners,
          reviewCountersReset:false,originalRecordsPreserved:true});
      }
      state.work.push(...jobs);
      await reconcileReturnedMethods({save:false});refresh();
      event('work_enqueued',{workIds:jobs.map(w=>w.id)});await checkpoint();return clone(jobs);
    }
    if(command.type==='revise_scope'){
      if (command.scope?.releaseManifest !== state.scope.releaseManifest) fail('ROSTER_WORKFLOW_RELEASE_CHANGED');
      if(!command.scope||Object.values(command.scope).some(v=>!idOK(v)))fail('ROSTER_WORKFLOW_SCOPE_INVALID');
      state.scope=clone(command.scope);refresh();event('scope_revised',{scope:state.scope});await checkpoint();return clone(state.scope);
    }
    if(command.type==='continue_work'){
      const work=state.work.find(w=>w.id===command.workId);
      if(!createRosterWorkflowGraphV1(state).canContinue(command.workId))fail('ROSTER_WORKFLOW_NOT_CONTINUABLE',command.workId);
      work.status='ready';event('continued',{workId:work.id});await checkpoint();return {id:work.id,status:work.status};
    }
    if(command.type==='reconcile_shared_round_one_preparations'){
      if(!recoverSharedRoundOnePreparation||state.work.some(work=>work.status==='running'||work.operationState?.pending))return 0;
      const graph=createRosterWorkflowGraphV1(state);
      const recovered=[];
      for(const work of state.work){
        const selected=work.inputs.request?.value,sourceResultRef=work.resultRef;
        if(work.role!=='roster_workflow_tool'||work.status!=='needs_model_choice'
          ||selected?.operation!=='scenario'||selected.comparisonBinding?.arm!=='shared'
          ||selected.comparisonBinding.stage!=='prerequisite'
          ||!sourceResultRef||work.operationState?.completedRef!==sourceResultRef||!graph.isCurrent(work.id))continue;
        const written=state.events.findLast(e=>e.type==='result_saved'&&e.workId===work.id);
        if(written?.resultRef!==sourceResultRef||written.dispatchKey!==work.dispatchKey)continue;
        if(state.work.some(other=>other.attempt&&(other.repairOf===work.id||dependencies(other).includes(work.id))))continue;
        const result=await recoverSharedRoundOnePreparation({selected,result:await store.get(sourceResultRef),sourceResultRef});
        if(result)recovered.push({work,sourceResultRef,resultRef:await store.put(result)});
      }
      if(!recovered.length)return 0;
      const before=clone(state);
      for(const {work,sourceResultRef,resultRef} of recovered){
        work.resultHistory=[...(work.resultHistory??[]),{resultRef:sourceResultRef,status:work.status}];
        work.resultRef=resultRef;work.status='evidence_ready';work.failure=null;
        bindCompletedFact(work);
        event('result_saved',{workId:work.id,dispatchKey:work.dispatchKey,resultRef,
          kind:'tool_receipt',providerReplyRef:null,sourceResultRef,toolReexecuted:false});
      }
      refresh();
      try{await checkpoint();}catch(error){state=before;writes=Promise.resolve();observations.clear();throw error;}
      return recovered.length;
    }
    if(command.type==='recover_completed_temporal_invariant'){
      const projected=await projectCompletedTemporalInvariantRecoveryV1({state,readArtifact:store.get,...command});
      if(projected.alreadyScheduled)return projected;
      const before=clone(state),reportRef=await store.put(projected.recovery);
      const retired=state.work.find(w=>w.id===projected.retiredRepairId);
      retired.status='superseded';retired.supersededByWorkId=projected.replacementWorkId;
      retired.nativeTemporalRecoveryRef=reportRef;
      const job={...projected.job,status:'waiting_dependency',resultRef:null,failure:null};
      validateBindings(job.bindings,state.scope);state.work.push(job);refresh();
      event('completed_temporal_invariant_recovery_queued',{...projected.recovery,reportRef,replacementWorkId:job.id,providerCalled:false,toolExecuted:false});
      try{await checkpoint();}catch(error){state=before;writes=Promise.resolve();observations.clear();throw error;}
      return {replacementWorkId:job.id,reportRef,alreadyScheduled:false};
    }
    if(command.type==='return_interrupted_read_to_method'){
      const work=state.work.find(w=>w.id===command.workId),op=work?.operationState;
      const invalid=()=>fail('ROSTER_WORKFLOW_INTERRUPTED_READ_RETURN_INVALID',command.workId);
      if(command.ownership?.kind!=='product_single_writer_lease'||command.ownership.held!==true
        ||work?.role!=='roster_workflow_tool'||!fresh(work)||!command.reason?.trim()
        ||!['bounded_unit_temporal','bounded_joint_temporal'].includes(work.inputs.request?.value?.operation))invalid();
      if(work.interruptedReadReturn){
        if(work.interruptedReadReturn.originalPending.requestRef!==command.requestRef)invalid();
        return {resultRef:work.interruptedReadReturn.resultRef,alreadyReturned:true,queryReplayed:false};
      }
      const pending=op?.pending;
      if(work.status!=='needs_repair'||work.failure?.code!=='DISPATCH_OUTCOME_UNKNOWN'
        ||!pending||command.requestRef!==pending.requestRef||op.completedRef||op.retryInterruptedQuery)invalid();
      const [request,input]=await Promise.all([store.get(pending.requestRef),store.get(work.inputRef)]);
      const dispatch=state.events.findLast(e=>e.type==='dispatch'&&e.workId===work.id);
      if(request.operation!==work.inputs.request.value.operation||input.workId!==work.id
        ||input.role!==work.role||!isDeepStrictEqual(input.bindings,work.bindings)
        ||dispatch?.dispatchKey!==work.dispatchKey||dispatch.inputRef!==work.inputRef)invalid();
      const value={operation:request.operation,status:'returned_to_model',
        code:'ROSTER_READ_QUERY_RETURNED_UNFINISHED',executionStatus:'interrupted_without_final_receipt',
        nativeSuccess:false,originalResultUnknown:true,request:clone(work.inputs.request.value.args),
        originalRequestRef:pending.requestRef,sourceStateHash:pending.sourceStateHash,reason:command.reason,
        queryRepair:{correctable:false,controlReturn:true,resolutionRequired:'method_or_scope_decision',
          sourceContract:'roster_interrupted_read_method_v1',failureClass:'administrative_pause',
          originalQueryNotAnswered:true,factAnswered:false,nativeRetryAuthorized:false,resumeSavedFrontierSupported:false,
          instruction:'The prior read was explicitly ended without a final Native receipt. This is an administrative return, not an invalid parameter, failed Rules action, search exhaustion, negative reachability or zero benefit. Preserve the original question, selected army, unit/target scope and existing evidence. Read the current source-owned tool contract and original method intent before choosing a meaningful revised method or returning the unresolved obligation to its author. Do not increase bounds merely because the read was stopped, repeat old coordinates by default, invent a partial result or claim internal frontier recovery. Only your explicit next work order may dispatch another query; no factual answer or Plan approval has been granted.'}};
      const result={kind:'interpretation',continuation:true,value,conditions:[
        'Administrative interruption of an isolated read-only search; no final Native result was obtained.',
        'Original pending request, dispatch, failures and counts retained; no arrival, control or negative reachability fact.']};
      const resultRef=await store.put(result),before=clone(state);
      work.failureHistory=[...(work.failureHistory??[]),{failure:clone(work.failure),originalOperationState:clone(op),
        originalInputRef:work.inputRef,reason:command.reason,controlResultRef:resultRef}];
      work.interruptedReadReturn={version:1,resultRef,originalPending:clone(pending),originalDispatchKey:work.dispatchKey,
        originalInputRef:work.inputRef,reason:command.reason};
      op.pending=null;work.resultRef=resultRef;work.status='needs_model_choice';work.failure=null;
      event('interrupted_read_returned_to_method',{workId:work.id,resultRef,requestRef:pending.requestRef,
        originalDispatchKey:work.dispatchKey,queryReplayed:false,nativeResultFabricated:false,historyReset:false,planApproved:false});
      try{refresh();await checkpoint();}catch(error){state=before;writes=Promise.resolve();observations.clear();throw error;}
      return {resultRef,alreadyReturned:false,queryReplayed:false};
    }
    if(command.type==='recover_read_only_query'){
      const work=state.work.find(w=>w.id===command.workId),op=work?.operationState,pending=op?.pending;
      const invalid=()=>fail('ROSTER_WORKFLOW_READ_ONLY_QUERY_RECOVERY_INVALID',command.workId);
      if(command.ownership?.kind!=='product_single_writer_lease'||command.ownership.held!==true
        ||work?.role!=='roster_workflow_tool'||work.status!=='needs_repair'||!fresh(work)
        ||work.failure?.code!=='DISPATCH_OUTCOME_UNKNOWN'||!pending||!command.reason
        ||command.requestRef!==pending.requestRef||op.retryInterruptedQuery||op.completedRef
        ||op.interruptedQueryAttempts?.some(row=>row.originalPending.requestRef===pending.requestRef)
        ||!isRosterReadOnlyObservationV1(work.inputs.request?.value?.operation))invalid();
      const [request,input]=await Promise.all([store.get(pending.requestRef),store.get(work.inputRef)]);
      const dispatch=state.events.findLast(e=>e.type==='dispatch'&&e.workId===work.id);
      if(request.operation!==work.inputs.request.value.operation||input.workId!==work.id
        ||input.role!==work.role||!isDeepStrictEqual(input.bindings,work.bindings)
        ||dispatch?.dispatchKey!==work.dispatchKey||dispatch.inputRef!==work.inputRef)invalid();
      work.failureHistory=[...(work.failureHistory??[]),{failure:clone(work.failure),
        originalPending:clone(pending),reason:command.reason}];
      op.retryInterruptedQuery={version:1,requestRef:pending.requestRef,sourceStateHash:pending.sourceStateHash,
        reason:command.reason};
      // Keep pending until the actual executor compares its fully bound args
      // and selected Native source. No query/Provider call occurs here.
      work.status='ready';work.failure=null;
      event('interrupted_read_only_query_queued',{workId:work.id,requestRef:pending.requestRef,
        originalDispatchKey:work.dispatchKey,completedResultRef:op.completedRef??null,
        providerReplayed:false,countersReset:false,historyReset:false});
      await checkpoint();return {id:work.id,status:work.status};
    }
    if(command.type==='reprepare_incomplete_output'){
      const work=state.work.find(w=>w.id===command.workId),op=work?.operationState;
      if(!work||!fresh(work)||!op?.pending||!command.reason)fail('ROSTER_INCOMPLETE_OUTPUT_RECOVERY_INVALID');
      const request=await store.get(op.pending.requestRef),recovery=projectRosterIncompleteOutputRecoveryV1({work,request,
        event:command.event,engineeringChangeId:command.engineeringChangeId,targetContract:command.targetContract});
      if(!recovery)fail('ROSTER_INCOMPLETE_OUTPUT_RECOVERY_INVALID');
      const incompleteEventRef=await store.put(command.event);
      work.failureHistory=[...(work.failureHistory??[]),{failure:clone(work.failure),originalPending:clone(op.pending),
        incompleteEventRef,recovery:clone(recovery),reason:command.reason}];
      op.incompleteOutputRecoveries=[...(op.incompleteOutputRecoveries??[]),{...recovery,incompleteEventRef}];
      // Count the received request, preserve its separate usage record, and
      // require the changed contract before another dispatch. Never parse it.
      op.turn=request.roundIndex;op.pending=null;op.requiredOutputContract=clone(command.targetContract);
      work.failure=null;work.status='ready';
      event('incomplete_output_reprepared',{workId:work.id,incompleteEventRef,...recovery});
      await checkpoint();return {id:work.id,status:work.status,incompleteEventRef,paidResponseAccepted:false};
    }
    if(command.type==='reflow_provider_context'){

      const work=state.work.find(w=>w.id===command.workId),dispatch=command.dispatch;
      const op=work?.operationState,pending=op?.pending;
      if(work?.status!=='needs_repair'||!fresh(work)||!pending||op.retryProviderDispatch
        ||work.failure?.code!=='ROSTER_WORKSPACE_PROVIDER_RESPONSE_REJECTED'
        ||!command.reason
        ||dispatch?.status!=='response_rejected'||dispatch.rejection?.httpStatus!==400
        ||dispatch.rejection.contextLengthExceeded!==true||!dispatch.requestId||!dispatch.requestBodyHash
        ||dispatch.contextHash!==pending.contextHash||dispatch.roundKind!==work.role||dispatch.roundIndex!==op.turn+1
        ||op.contextReflows?.some(r=>r.inputDeliveryVersion===command.inputDeliveryVersion))
        fail('ROSTER_WORKFLOW_CONTEXT_REFLOW_INVALID',command.workId);
      const request=await store.get(pending.requestRef);
      if(request.contextHash!==dispatch.contextHash||request.sessionId!==dispatch.sessionId
        ||!rosterWorkflowCanReflowInputV1({operationState:op,request,inputDeliveryVersion:command.inputDeliveryVersion}))
        fail('ROSTER_WORKFLOW_CONTEXT_REFLOW_INVALID',command.workId);
      const recovery={inputDeliveryVersion:command.inputDeliveryVersion,originalPending:clone(pending),
        dispatch:clone(dispatch),originalFailure:clone(work.failure),reason:command.reason,
        semanticCountersReset:false,nativeActionsReplayed:false,unknownFeesPreserved:true};
      op.contextReflows=[...(op.contextReflows??[]),recovery];
      work.failureHistory=[...(work.failureHistory??[]),{failure:clone(work.failure),originalPending:clone(pending),
        dispatch:clone(dispatch),reason:command.reason}];
      op.pending=null;work.failure=null;work.status='ready';
      event('provider_input_context_reflowed',{workId:work.id,requestId:dispatch.requestId,
        originalContextHash:dispatch.contextHash,inputDeliveryVersion:command.inputDeliveryVersion,
        originalCostStatus:dispatch.costStatus,semanticCountersReset:false});
      await checkpoint();return {id:work.id,status:work.status};
    }
    if(command.type==='reconcile_observed_unissued_request'){
      const work=state.work.find(w=>w.id===command.workId),pending=work?.operationState?.pending;
      const retired=work?.status==='superseded';
      if(!work||(!retired&&!fresh(work))||!pending||!command.reason
        ||pending.requestRef!==command.expectedRequestRef||pending.contextHash!==command.expectedContextHash)
        fail('ROSTER_WORKFLOW_UNISSUED_OBSERVATION_INVALID');
      const request=await store.get(pending.requestRef);
      const recovery=projectRosterObservedUnissuedRequestV1({work,request,observation:command.observation});
      if(!recovery)fail('ROSTER_WORKFLOW_UNISSUED_OBSERVATION_INVALID');
      const observationRef=await store.put(command.observation);
      work.failureHistory=[...(work.failureHistory??[]),{failure:clone(work.failure),originalPending:clone(pending),
        recovery:clone(recovery),observationRef,reason:command.reason}];
      work.interruptionRecoveries=[...(work.interruptionRecoveries??[]),{...recovery,observationRef}];
      work.operationState.pending=null;
      if(!retired){work.status='ready';work.failure=null;}
      event('observed_unissued_request_reconciled',{...recovery,observationRef});
      await checkpoint();return {id:work.id,status:work.status,observationRef};
    }
    if(command.type==='retry_unrecorded_rejected_request'){
      const work=state.work.find(w=>w.id===command.workId),op=work?.operationState,pending=op?.pending;
      if(work?.status!=='needs_repair'||!fresh(work)||!pending
        ||work.failure?.code!=='ROSTER_WORKSPACE_PROVIDER_RESPONSE_REJECTED'
        ||work.failure.providerDispatch||work.failure.providerRejection
        ||op.retryProviderDispatch||op.unrecordedRejectionRecoveries?.length
        ||command.allowUnknownCharge!==true||!command.authorizationId||!command.reason
        ||command.expectedRequestRef!==pending.requestRef||command.expectedContextHash!==pending.contextHash)
        fail('ROSTER_WORKFLOW_UNRECORDED_REJECTION_RECOVERY_INVALID');
      const request=await store.get(pending.requestRef);
      if(request.contextHash!==pending.contextHash||request.roundKind!==work.role||request.roundIndex!==op.turn+1)
        fail('ROSTER_WORKFLOW_UNRECORDED_REJECTION_RECOVERY_INVALID');
      const recovery={kind:'legacy_unrecorded_rejection_v1',sourceRequestRef:pending.requestRef,
        contextHash:request.contextHash,sessionId:request.sessionId,roundKind:request.roundKind,roundIndex:request.roundIndex,
        authorizationId:command.authorizationId,allowUnknownCharge:true,originalCostStatus:'unknown',originalWireIdentityKnown:false,
        semanticCountersReset:false,nativeActionsReplayed:false};
      work.failureHistory=[...(work.failureHistory??[]),{failure:clone(work.failure),originalPending:clone(pending),
        recovery:clone(recovery),reason:command.reason}];
      op.unrecordedRejectionRecoveries=[clone(recovery)];op.retryProviderDispatch=clone(recovery);
      work.status='ready';work.failure=null;
      event('unrecorded_provider_rejection_reissue_authorized',{workId:work.id,...recovery});
      await checkpoint();return {id:work.id,status:work.status};
    }
    if(command.type==='retry_provider_dispatch'){
      const work=state.work.find(w=>w.id===command.workId),dispatch=command.dispatch;
      const op=work?.operationState,pending=op?.pending;
      const providerHandoff=command.providerHandoff;
      if(providerHandoff!==undefined&&(!providerHandoff||Array.isArray(providerHandoff)
        ||Object.keys(providerHandoff).some(k=>!['providerKind','modelVersion'].includes(k))
        ||!['providerKind','modelVersion'].every(k=>typeof providerHandoff[k]==='string'
          &&/^[A-Za-z0-9_.:/-]{1,120}$/u.test(providerHandoff[k]))))
        fail('ROSTER_WORKFLOW_PROVIDER_HANDOFF_INVALID');
      const failedTransport=isExplicitlyRecoverableProviderFailureV1(work?.failure);
      const additionalLeaf=isExplicitLatestProviderRetryV1({dispatch,currentDispatch:work?.failure?.providerDispatch,
        retainedRetry:op?.retryProviderDispatch,authorizationId:command.authorizationId,
        expectedRequestId:command.expectedRequestId,
        authorizeOneAdditionalDispatchRetry:command.authorizeOneAdditionalDispatchRetry,history:work?.failureHistory??[]});
      const preEgressRetryResumed=work?.failure?.code==='ROSTER_WORKSPACE_RETRY_REQUEST_CHANGED'
        &&op?.retryProviderDispatch?.requestId===dispatch?.requestId
        &&op.retryProviderDispatch.retryAuthorizationId===command.authorizationId
        &&dispatch?.status==='definitely_not_sent'&&dispatch.transportFailure?.requestDefinitelyNotSent===true;
      if(work?.status!=='needs_repair'||!fresh(work)||(!failedTransport&&!preEgressRetryResumed)||!pending
        ||op.retryProviderDispatch&&!preEgressRetryResumed&&!additionalLeaf
        ||!command.reason||!command.authorizationId||!dispatch?.requestId
        ||dispatch.contextHash!==pending.contextHash||dispatch.roundKind!==work.role
        ||dispatch.roundIndex!==op.turn+1||(dispatch.retryOfRequestId||dispatch.retryOfNotSentRequestId)&&!additionalLeaf
        ||!isExplicitlyRecoverableProviderDispatchV1(dispatch)
        ||work.failure?.code==='ROSTER_WORKSPACE_PROVIDER_RESPONSE_REJECTED'
          &&!isDeepStrictEqual(work.failure.providerDispatch,dispatch)
        ||dispatch.status!=='definitely_not_sent'&&command.allowUnknownCharge!==true)
        fail('ROSTER_WORKFLOW_TRANSPORT_RESUME_INVALID',command.workId);
      const request=await store.get(pending.requestRef);
      if(request.contextHash!==dispatch.contextHash||request.sessionId!==dispatch.sessionId
        ||!dispatch.requestBodyHash)fail('ROSTER_WORKFLOW_TRANSPORT_REQUEST_MISMATCH');
      work.failureHistory=[...(work.failureHistory||[]),{failure:clone(work.failure),
        originalPending:clone(pending),dispatch:clone(dispatch),reason:command.reason,
        authorizationId:command.authorizationId,preEgressRetryResumed,additionalLeaf,
        ...(providerHandoff?{providerHandoff:clone(providerHandoff)}:{})}];
      op.retryProviderDispatch={...clone(dispatch),explicitSingleRetry:true,
        retryAuthorizationId:command.authorizationId,
        ...(providerHandoff?{providerHandoff:clone(providerHandoff)}:{})};
      work.status='ready';work.failure=null;
      event('provider_transport_retry_authorized',{workId:work.id,requestId:dispatch.requestId,
        ...(providerHandoff?{providerHandoff:clone(providerHandoff)}:{}),
        originalContextHash:dispatch.contextHash,originalCostStatus:dispatch.costStatus,
        semanticCountersReset:false});
      await checkpoint();return {id:work.id,status:work.status};
    }
    if(['reattach_returned_provider_reply','reattach_offline_role_reply'].includes(command.type)){
      const offline=command.type==='reattach_offline_role_reply';
      const work=state.work.find(w=>w.id===command.workId),op=work?.operationState;
      const {dispatchRecord}=command,pending=op?.pending;
      const reject=()=>fail('ROSTER_WORKFLOW_RETURNED_REPLY_RECONCILIATION_INVALID');
      if(!work||work.role==='roster_workflow_tool'||!fresh(work)||work.status!=='needs_repair'
        ||!pending||op.noProgressStop||op.revalidateReplyRef||!command.reason
        ||pending.requestRef!==command.expectedRequestRef
        ||(!offline&&pending.contextHash!==dispatchRecord?.contextHash)
        ||!Number.isSafeInteger(op.turn)||!Array.isArray(op.calls)||op.calls.length!==op.turn
        ||op.calls.some(call=>call.requestRef===pending.requestRef))reject();
      const request=await store.get(pending.requestRef);
      const sent=request.promptNodes?.find(node=>node.kind==='workflow_role_assignment');
      if(sent?.workId!==work.id||sent.role!==work.role||!isDeepStrictEqual(sent.scope,state.scope)
        ||request.roundIndex!==op.turn+1||request.contextHash!==pending.contextHash)reject();
      let reply=command.reply,offlineSourceRef;
      if(offline){
        if(typeof loadRetainedOfflineReply!=='function'||command.ownership?.kind!=='product_single_writer_lease'
          ||command.ownership.held!==true||pending.phase!=='provider_entered'
          ||work.failure?.code!=='DISPATCH_OUTCOME_UNKNOWN'||op.retryProviderDispatch||dispatchRecord||reply
          ||work.failure.providerDispatch||work.failure.providerRejection)reject();
        const source=await loadRetainedOfflineReply({workId:work.id,requestRef:pending.requestRef,contextHash:pending.contextHash,
          dispatchKey:work.dispatchKey,request:clone(request)});
        if(source?.kind!=='prepared_offline_role_reply_v1'||source.workId!==work.id
          ||source.requestRef!==pending.requestRef||source.contextHash!==pending.contextHash
          ||source.externalDispatch!==false||source.productConsumed!==false||!source.output)reject();
        reply={output:clone(source.output),receipt:{contextHash:request.contextHash,roundKind:request.roundKind,
          sessionId:request.sessionId,roundIndex:request.roundIndex,outputHash:hash(source.output),paidProviderCall:false}};
        offlineSourceRef=await store.put(source);
      }else if(!matchesReturnedRosterProviderReplyV1({request,reply,dispatch:dispatchRecord}))reject();
      if(rosterRoleReplyCommunicationErrorsV1(request,reply).length)reject();
      const replyRef=await store.put(reply),operation=clone(op);
      await recordRosterWorkflowReadDeliveryV1({request,operation,store});
      operation.calls.push({turn:++operation.turn,requestRef:pending.requestRef,replyRef,
        receipt:reply.receipt,reconciled:true,...(offline?{offlineSourceRef}:{dispatchRequestId:dispatchRecord.requestId})});
      operation.revalidateReplyRef=replyRef;
      operation.savedRevalidationRequestRef=pending.requestRef;
      operation.pending=null;
      delete operation.retryProviderDispatch;
      delete operation.requiredOutputContract;
      work.failureHistory=[...(work.failureHistory??[]),{failure:clone(work.failure),reason:command.reason,
        originalPending:clone(pending),...(offline?{offlineSourceRef}:{providerDispatch:clone(dispatchRecord)})}];
      work.operationState=operation;work.status='ready';work.failure=null;
      event(offline?'offline_role_reply_reattached':'returned_provider_reply_reattached',
        {workId:work.id,requestRef:pending.requestRef,replyRef,
          ...(offline?{offlineSourceRef}:{dispatchRequestId:dispatchRecord.requestId,traceId:command.traceId}),
          paidCallReplayed:false,historyReset:false});
      await checkpoint();
      return {id:work.id,status:work.status,requestRef:pending.requestRef,replyRef,providerReplay:false};
    }
    if(command.type==='reconcile_provider_reply'){
      const work=state.work.find(w=>w.id===command.workId),reply=command.reply;
      const savedCall=work?.operationState?.calls?.at(-1);
      // Earlier reconciliations saved correction/cost but omitted the normal
      // continuation result, so graph.canContinue could never resume them.
      // Resume the exact installed reply idempotently; do not clear counters,
      // manufacture a valid model result, or weaken the scheduler predicate.
      const alreadyReconciled=['needs_model_choice','ready'].includes(work?.status)
        &&!work.operationState?.pending&&savedCall?.reconciled===true
        &&work.operationState.correction?.originalReplyRef===savedCall.replyRef
        &&reply?.dispatchOutcome==='completed_invalid'
        &&isDeepStrictEqual(reply,await store.get(savedCall.replyRef));
      const continuationResult=()=>({kind:'interpretation',continuation:true,
        value:{status:'needs_local_correction',errors:clone(work.operationState.correction.errors)},
        conditions:['Completed Provider response is invalid; no role decision, fact or strategy approved']});
      if(alreadyReconciled){
        if(!fresh(work)||!command.reason)fail('ROSTER_WORKFLOW_PROVIDER_RECONCILIATION_INVALID');
        if(!work.resultRef){
          work.resultRef=await store.put(continuationResult());
          event('provider_correction_continuation_restored',{workId:work.id,replyRef:savedCall.replyRef,
            resultRef:work.resultRef,paidCallReplayed:false,countersReset:false});
          await checkpoint();
        }
        return {id:work.id,status:work.status,alreadyReconciled:true};
      }
      if(work?.status!=='needs_repair'||!fresh(work)||!command.reason
        ||!work.operationState?.pending||reply?.dispatchOutcome!=='completed_invalid'
        ||reply.receipt?.contextHash!==work.operationState.pending.contextHash
        ||!reply.providerFailure||reply.receipt?.paidProviderCall!==true)fail('ROSTER_WORKFLOW_PROVIDER_RECONCILIATION_INVALID');
      const op=work.operationState,request=await store.get(op.pending.requestRef);
      if(rosterRoleReplyCommunicationErrorsV1(request,reply).length)fail('ROSTER_WORKFLOW_PROVIDER_RECONCILIATION_IDENTITY_INVALID');
      const replyRef=await store.put(reply);
      work.failureHistory=[...(work.failureHistory||[]),{failure:clone(work.failure),reason:command.reason,originalPending:clone(op.pending),
        ...(work.resultRef?{originalResultRef:work.resultRef}:{})}];
      op.calls.push({turn:++op.turn,requestRef:op.pending.requestRef,replyRef,receipt:reply.receipt,reconciled:true});
      op.pending=null;op.consecutiveCorrections=(op.consecutiveCorrections||0)+1;
      op.correction={errors:[{code:'provider_output_invalid',providerCode:reply.failureCode}],originalReplyRef:replyRef,
        instruction:'The completed malformed output and cost are now known; correct only this role reply.'};
      work.resultRef=await store.put(continuationResult());
      work.status='needs_model_choice';work.failure=null;
      event('provider_reply_reconciled',{workId:work.id,replyRef,resultRef:work.resultRef,paidCallReplayed:false});
      await checkpoint();return {id:work.id,status:work.status};
    }
    if(command.type==='correct_decision_assignment'){
      const work=state.work.find(w=>w.id===command.workId),op=work?.operationState;
      const last=op?.calls?.at(-1),oldQuestion=work?.inputs?.question;
      if(work?.role!=='roster_workflow_strategy_decision'||work.status!=='needs_model_choice'
        ||!fresh(work)||op?.pending||op?.noProgressStop||!op?.correction?.errors?.length
        ||oldQuestion?.source!=='literal'||typeof oldQuestion.value!=='string'
        ||last?.requestRef!==command.expectedRequestRef||last?.replyRef!==command.expectedReplyRef
        ||!last?.requestRef||!last?.replyRef||work.resultRef!==command.expectedResultRef
        ||op.correction.originalReplyRef!==last.replyRef
        ||oldQuestion.value!==command.expectedQuestion
        ||typeof command.question!=='string'||!command.question.trim()||command.question===oldQuestion.value
        ||typeof command.reason!=='string'||!command.reason.trim()
        ||work.assignmentCorrectionHistory?.some(h=>h.sourceReplyRef===last.replyRef))
        fail('ROSTER_WORKFLOW_ASSIGNMENT_CORRECTION_INVALID');
      // Repair a dispatcher-authored instruction at its source, not the paid
      // answer. Calls, counters, reads, unresolved questions and feedback stay.
      const record={version:1,sourceRequestRef:last.requestRef,sourceReplyRef:last.replyRef,
        sourceResultRef:work.resultRef,previousQuestion:clone(oldQuestion),
        previousCorrection:clone(op.correction),previousStatus:work.status,
        correctedQuestion:command.question,reason:command.reason,
        historyReset:false,factApprovalGranted:false,planApprovalGranted:false,
        nativeExecutionAuthorized:false,additionalInvalidResultsGranted:0};
      work.assignmentCorrectionHistory=[...(work.assignmentCorrectionHistory??[]),record];
      work.inputs.question={source:'literal',value:command.question};
      work.inputs.assignmentCorrection={source:'literal',value:{...clone(record),
        instruction:'The dispatcher corrected the task description. Use correctedQuestion as the current assignment; previousQuestion and paid replies remain historical provenance. Existing semantic errors, required questions, tool limits, source checks and correction counts still apply. Select the next permitted operation yourself. This record supplies no factual answer, tactical preference, query authorization or release approval.'}};
      work.status='ready';
      event('decision_assignment_corrected',{workId:work.id,sourceRequestRef:last.requestRef,
        sourceReplyRef:last.replyRef,reason:command.reason,historyReset:false,
        nativeExecutionAuthorized:false,additionalInvalidResultsGranted:0});
      await checkpoint();return {id:work.id,status:work.status,historyReset:false,providerReplay:false};
    }
    if(command.type==='handoff_strategy_author'){
      const work=state.work.find(w=>w.id===command.workId);
      if(work?.status!=='needs_repair'||!fresh(work)||work.failure?.dispatchOutcome!=='completed_invalid')
        fail('ROSTER_WORKFLOW_AUTHOR_HANDOFF_INVALID');
      const handoff=await projectRosterAuthorDecisionHandoffV1({role:work.role,operation:work.operationState,store});
      if(!handoff)fail('ROSTER_WORKFLOW_AUTHOR_HANDOFF_INVALID');
      work.failureHistory=[...(work.failureHistory??[]),{failure:clone(work.failure),
        operationState:clone(work.operationState),reason:'typed strategy ownership handoff; no verdict granted'}];
      enterRosterAuthorDecisionHandoffV1(work.operationState,handoff);
      work.status='ready';work.failure=null;
      event('strategy_author_handoff',{workId:work.id,sourceReplyRef:handoff.sourceReplyRef,
        questionCount:handoff.questions.length,historyReset:false,acceptanceGranted:false});
      await checkpoint();return {id:work.id,status:work.status};
    }
    if(['resume_role_correction','revalidate_role_reply'].includes(command.type)){
      const work=state.work.find(w=>w.id===command.workId);
      if(command.type==='revalidate_role_reply'&&work&&command.reason?.trim()&&fresh(work)){
        const recovery=await projectRosterCommandEnvelopeRecoveryV1({state,work,readArtifact:store.get})
          ??await projectRosterInventoryClaimRecoveryV1({state,work,readArtifact:store.get});
        if(recovery){
          const recoveryHistory=recovery.kind?.startsWith('inventory_')?'inventoryClaimRecoveryHistory':'decisionEnvelopeRecoveryHistory';
          work[recoveryHistory]=[...(work[recoveryHistory]??[]),
            {...clone(recovery),failure:clone(work.failure),correction:clone(work.operationState.correction),reason:command.reason}];
          work.operationState.revalidateReplyRef=recovery.replyRef;
          work.operationState.savedRevalidationRequestRef=recovery.requestRef;
          work.status='ready';work.failure=null;
          event(recovery.kind?.startsWith('inventory_')?'inventory_original_extraction_revalidation':'decision_envelope_revalidation',{...recovery,historyReset:false,additionalInvalidResultsGranted:0});
          await checkpoint();return {id:work.id,status:work.status,providerReplay:false};
        }
      }
      if(command.type==='revalidate_role_reply'&&work?.status==='evidence_ready'){
        if(!fresh(work)||!command.reason?.trim())fail('ROSTER_COMPARISON_PROGRESS_RECHECK_INVALID');
        const recovery=await projectRosterCitationOnlyComparisonRecoveryV1({state,work,readArtifact:store.get})
          ??await projectRosterDecisionUseRecoveryV1({state,work,readArtifact:store.get});
        if(!recovery)fail('ROSTER_COMPARISON_PROGRESS_RECHECK_INVALID');
        for(const id of recovery.unissuedConsumerIds??[]){
          const consumer=state.work.find(w=>w.id===id);consumer.status='superseded';
          consumer.supersededReason={kind:recovery.kind,authorWorkId:work.id,originalAuthorResultRef:recovery.resultRef};
          event('comparison_unissued_review_retired',{workId:id,...consumer.supersededReason});
        }
        work.comparisonProgressHistory=[{...clone(recovery),reason:command.reason}];
        work.draftOutcomeHistory=[...(work.draftOutcomeHistory??[]),{receiptRef:work.draftOutcomeRef,reason:command.reason}];
        work.operationState.revalidateReplyRef=recovery.replyRef;
        work.operationState.savedRevalidationRequestRef=recovery.requestRef;
        work.resultRef=null;work.draftOutcomeRef=null;work.failure=null;work.status='ready';
        event('comparison_progress_recheck',{workId:work.id,...recovery,reason:command.reason});
        refresh();await checkpoint();return {id:work.id,status:work.status,providerReplay:false};
      }
      if(command.type==='revalidate_role_reply'&&work?.status==='needs_model_choice'&&fresh(work)&&command.reason?.trim()){
        const recovery=await projectRosterDeliveredCitationRecoveryV1({state,work,readArtifact:store.get});
        if(recovery){
          work.citationDeliveryRecoveryHistory=[...(work.citationDeliveryRecoveryHistory??[]),{...clone(recovery),reason:command.reason}];
          work.operationState.revalidateReplyRef=recovery.replyRef;
          work.operationState.savedRevalidationRequestRef=recovery.requestRef;
          work.status='ready';work.failure=null;
          event('source_projection_citation_revalidation',{workId:work.id,replyRef:recovery.replyRef,requestRef:recovery.requestRef,
            originalResultRef:recovery.originalResultRef,deliveredFieldCount:recovery.deliveredFields.length,providerReplay:false,historyReset:false});
          await checkpoint();return {id:work.id,status:work.status,providerReplay:false};
        }
      }
      // A paid local reply can be revalidated after an engineering fix before
      // exhausting its normal correction cycle. This is NOT a retry grant:
      // reuse the exact last reply through the normal role, retain all counts,
      // and never release an unknown dispatch or a persisted no-progress stop.
      if(command.type==='revalidate_role_reply'&&work?.status==='needs_repair'&&fresh(work)&&command.reason?.trim()){
        const recovery=await projectRosterSavedProposalRecoveryV1({state,work,readArtifact:store.get})
          ??await projectRosterHostStepKindRecoveryV1({state,work,readArtifact:store.get})
          ??await projectRosterEmptyCandidateRecoveryV1({state,work,readArtifact:store.get});
        if(recovery){
          const recoveryHistory=recovery.kind==='host_saved_proposal_v1'?'hostProposalRecoveryHistory':recovery.kind==='host_step_kind_v1'?'hostStepKindRecoveryHistory':recovery.kind==='candidate_host_empty_fields_v1'?'candidateEmptyFieldRecoveryHistory':'inventoryAccountingRecoveryHistory';
          work[recoveryHistory]=[...(work[recoveryHistory]??[]),
            {...clone(recovery),failure:clone(work.failure),correction:clone(work.operationState.correction),reason:command.reason}];
          work.operationState.revalidateReplyRef=recovery.replyRef;
          work.operationState.savedRevalidationRequestRef=recovery.requestRef;
          work.status='ready';work.failure=null;
          event(recovery.kind==='host_saved_proposal_v1'?'host_saved_proposal_revalidation':recovery.kind==='host_step_kind_v1'?'host_step_kind_revalidation':recovery.kind==='candidate_host_empty_fields_v1'?'candidate_empty_field_revalidation':'inventory_original_extraction_revalidation',{...recovery,historyReset:false,providerReplay:false});
          await checkpoint();return {id:work.id,status:work.status,providerReplay:false};
        }
      }
      const waiting=work?.operationState;
      if(command.type==='revalidate_role_reply'&&work?.status==='needs_model_choice'
        &&fresh(work)&&command.reason&&!waiting?.pending&&!waiting?.noProgressStop
        &&waiting?.correction?.originalReplyRef
        &&waiting.calls?.at(-1)?.replyRef===waiting.correction.originalReplyRef){
        work.failureHistory=[...(work.failureHistory??[]),{failure:clone(work.failure),
          operationState:clone(waiting),reason:command.reason}];
        waiting.revalidateReplyRef=waiting.correction.originalReplyRef;
        work.status='ready';work.failure=null;
        event(command.type,{workId:work.id,reason:command.reason,retainedReads:waiting.reads.length,
          historyReset:false,additionalInvalidResultsGranted:0,providerReplay:false});
        await checkpoint();return {id:work.id,status:work.status};
      }
      const completedLocalFailure=work?.failure?.dispatchOutcome==='completed_invalid'
        ||work?.failure?.dispatchOutcome==='completed_no_progress'
          &&['ROSTER_WORKFLOW_ROLE_READS_NOT_CONVERGED','ROSTER_WORKFLOW_ROLE_CATALOGUE_NOT_CONVERGED',
            'ROSTER_WORKFLOW_ROLE_NO_PROGRESS'].includes(work.failure.code);
      if(work?.status!=='needs_repair'||!fresh(work)||!command.reason
        ||!completedLocalFailure||work.operationState?.pending
        ||!work.operationState?.correction?.originalReplyRef)fail('ROSTER_WORKFLOW_CORRECTION_RESUME_INVALID');
      work.failureHistory=[...(work.failureHistory||[]),{failure:clone(work.failure),operationState:clone(work.operationState),reason:command.reason}];
      // Explicit engineering correction grants one additional invalid result,
      // never a new automatic three-attempt cycle. Reads and paid replies stay.
      const op=work.operationState;
      // Only this explicit, reasoned post-repair command releases a persisted
      // no-progress stop. Cold process restart never does. The full marker and
      // original calls/errors are already retained in failureHistory above.
      if(op.noProgressStop){
        op.noProgressRecoveryHistory=[...(op.noProgressRecoveryHistory??[]),
          {stop:clone(op.noProgressStop),reason:command.reason,historyReset:false}];
        delete op.noProgressStop;
      }
      op.normalCorrectionLimit??=op.correctionLimit>1?op.correctionLimit:3;
      op.correctionRecovery={normalLimit:op.normalCorrectionLimit,sourceFailureCode:work.failure.code,
        originalReplyRef:op.correction.originalReplyRef,reason:command.reason,historyReset:false};
      op.consecutiveCorrections=0;op.correctionLimit=1;
      if(command.type==='revalidate_role_reply')work.operationState.revalidateReplyRef=work.operationState.correction.originalReplyRef;
      work.status='ready';work.failure=null;
      event(command.type,{workId:work.id,reason:command.reason,retainedReads:work.operationState.reads.length});
      await checkpoint();return {id:work.id,status:work.status};
    }
    if(command.type==='resolve_with_work'||command.type==='resolve_choice_with_work'){
      const choiceResolution=command.type==='resolve_choice_with_work';
      const prior=state.work.find(w=>w.id===command.workId),replacement=state.work.find(w=>w.id===command.replacementWorkId);
      if(prior?.status==='evidence_ready'&&prior.resolvedByWorkId===replacement?.id
        &&replacement.status==='evidence_ready'&&fresh(prior)&&fresh(replacement)){
        const retained=await store.get(prior.resultRef);
        if(retained.resolution?.replacementResultRef===replacement.resultRef)
          return {id:prior.id,status:prior.status,resolvedByWorkId:replacement.id,alreadyResolved:true};
      }
      // synchronize can hold an earlier snapshot while two explicit repairs
      // finish in one tick. The first resolution already owns the logical
      // query. Retain the later successful source without overwriting/aliasing
      // it or turning that stale resolution attempt into a product-wide stop.
      if(prior?.status==='evidence_ready'&&prior.resolvedByWorkId
        &&replacement?.status==='evidence_ready'&&fresh(prior)&&fresh(replacement)
        &&(choiceResolution?replacement.choiceFor:replacement.repairFor)===prior.id
        &&isDeepStrictEqual(factBindings(prior.bindings),factBindings(replacement.bindings))){
        const first=state.work.find(work=>work.id===prior.resolvedByWorkId),retained=await store.get(prior.resultRef);
        if(first?.status==='evidence_ready'&&fresh(first)
          &&retained.resolution?.originalWorkId===prior.id
          &&retained.resolution.replacementWorkId===first.id
          &&retained.resolution.replacementResultRef===first.resultRef)
          return {id:prior.id,status:prior.status,resolvedByWorkId:first.id,alreadyResolved:true,
            lateReplacementWorkId:replacement.id,resolutionChanged:false};
      }
      if(prior?.status!=='needs_model_choice'||replacement?.status!=='evidence_ready'||!fresh(prior)||!fresh(replacement)
        ||!isDeepStrictEqual(factBindings(prior.bindings),factBindings(replacement.bindings)))fail('ROSTER_WORKFLOW_REPAIR_RESOLUTION_INVALID');
      const result=await store.get(replacement.resultRef);
      if(command.replacementOwnerId&&!(choiceResolution?replacement.choiceFor:replacement.repairFor)){
        const owner=state.work.find(w=>w.id===command.replacementOwnerId),seen=new Set();let lineage=owner;
        while(lineage&&!lineage.choiceOf&&!lineage.repairOf&&lineage.orderRepairOf&&!seen.has(lineage.id)){
          seen.add(lineage.id);lineage=state.work.find(w=>w.id===lineage.orderRepairOf);
        }
        if(owner?.status!=='evidence_ready'||!fresh(owner)||replacement.experimentOwnerId!==owner.id
          ||(choiceResolution?lineage?.choiceOf:lineage?.repairOf)!==prior.id)
          fail('ROSTER_WORKFLOW_REPLACEMENT_OWNER_INVALID');
        const ownerResult=await store.get(owner.resultRef),orders=ownerResult.value.workOrders??[];
        const orderIndex=orders.findIndex(order=>order.orderId===replacement.inputs.request.value.orderId);
        if(orderIndex<0)fail('ROSTER_WORKFLOW_REPLACEMENT_ORDER_MISSING');
        const order=orders[orderIndex],namespace=`${owner.id}:order${orderIndex}`;
        const siblings=state.work.filter(w=>w.experimentOwnerId===owner.id
          &&order.steps.some(step=>w.id===`${namespace}:${step.stepId}`));
        const completionWorkId=order.completionStepId?`${namespace}:${order.completionStepId}`:null;
        const matches=rosterWorkflowOperationReplacementsV1({original:prior.inputs.request.value,jobs:siblings,completionWorkId});
        if(matches.length!==1||matches[0].id!==replacement.id)fail('ROSTER_WORKFLOW_REPLACEMENT_AMBIGUOUS');
        replacement[choiceResolution?'choiceFor':'repairFor']=prior.id;
        replacement[choiceResolution?'choiceCompletionExplicit':'repairCompletionExplicit']=replacement.id===completionWorkId;
        event('completed_operation_replacement_linked',{workId:prior.id,replacementWorkId:replacement.id,
          ownerWorkId:owner.id,originalModelResultRef:owner.resultRef,toolReexecuted:false});
      }
      if(choiceResolution){
        const pending=await store.get(prior.resultRef);
        if(!projectRosterWorkflowToolChoiceV1(pending.value)||replacement.choiceFor!==prior.id)
          fail('ROSTER_WORKFLOW_CHOICE_RESOLUTION_INVALID');
      }
      if(result.kind!=='tool_receipt'||result.continuation===true)fail('ROSTER_WORKFLOW_REPAIR_RESULT_NOT_FACT');
      if(result.value.operation!==prior.inputs.request.value.operation)
        fail('ROSTER_WORKFLOW_REPAIR_OPERATION_MISMATCH');
      if(!rosterWorkflowRepairRequestMatchesV1(prior.inputs.request.value,replacement.inputs.request.value,
        {explicitCompletion:replacement.repairCompletionExplicit===true||replacement.choiceCompletionExplicit===true}))
        fail('ROSTER_WORKFLOW_REPAIR_QUERY_MISMATCH');
      prior.resultHistory=[...(prior.resultHistory||[]),{resultRef:prior.resultRef,status:prior.status}];
      prior.resultRef=await store.put({...result,resolution:{originalWorkId:prior.id,replacementWorkId:replacement.id,
        replacementResultRef:replacement.resultRef,...(choiceResolution?{choicePointPreserved:true}:{originalFailurePreserved:true})}});
      prior.status='evidence_ready';prior.resolvedByWorkId=replacement.id;
      bindCompletedFact(prior);
      event(choiceResolution?'resolved_choice_with_work':'resolved_with_work',{workId:prior.id,replacementWorkId:replacement.id,resultRef:prior.resultRef});
      refresh();await checkpoint();return {id:prior.id,status:prior.status,resolvedByWorkId:replacement.id};
    }
    if(command.type==='run_ready'){
      await dispatch({type:'reconcile_comparison_authorizations'});
      const limit=command.concurrency??1;
      if(!Number.isSafeInteger(limit)||limit<1)fail('ROSTER_WORKFLOW_CONCURRENCY_INVALID');
      if(command.workIds!==undefined&&(!Array.isArray(command.workIds)||!command.workIds.length
        ||new Set(command.workIds).size!==command.workIds.length
        ||command.workIds.some(id=>!state.work.some(w=>w.id===id))))fail('ROSTER_WORKFLOW_WORK_SELECTION_INVALID');
      const selected=command.workIds?new Set(command.workIds):null;
      refresh();const graph=createRosterWorkflowGraphV1(state),exclusive=new Set();
      const stopped=state.work.filter(w=>w.operationState?.noProgressStop
        &&graph.isFresh(w.id)&&graph.isBlockingFailure(w.id));
      if(stopped.length)fail('ROSTER_WORKFLOW_NO_PROGRESS_STOP',stopped.map(w=>({workId:w.id,
        reason:w.operationState.noProgressStop.reason,automaticRetry:false})));
      const ready=state.work.filter(w=>{
        if(!graph.canRun(w.id)||selected&&!selected.has(w.id))return false;
        if(w.exclusiveKey&&exclusive.has(w.exclusiveKey))return false;
        if(w.exclusiveKey)exclusive.add(w.exclusiveKey);return true;
      });
      let cursor=0,stopUnissued=false;
      await Promise.all(Array.from({length:Math.min(limit,ready.length)},async()=>{
        while(cursor<ready.length&&!stopUnissued&&shouldStop?.()!==true){const work=ready[cursor++];
          try{await run(work);}catch(error){
            if(error instanceof RosterWorkflowDispatchPause){
              // The role has not issued its external call. Retain prepared
              // input/operation and attempt history; resume the SAME work later.
              // Do not fabricate a result, count a model error or reset a retry.
              work.status='ready';stopUnissued=true;
              event('work_paused_before_external_dispatch',{workId:work.id,detail:clone(error.detail),
                providerDispatched:false,historyReset:false});
              await checkpoint();continue;
            }
            const dispatched=work.status==='running';
            work.status='needs_repair';work.failure={code:error.code||error.message,detail:clone(error.detail??null),
              ...(error.code==='ROSTER_WORKSPACE_PROVIDER_RESPONSE_REJECTED'&&error.providerRejection
                ?{providerRejection:clone(error.providerRejection)}:{}),
              ...(error.providerDispatch&&error.providerDispatch.contextHash===work.operationState?.pending?.contextHash
                ?{providerDispatch:clone(error.providerDispatch)}:{}),
              dispatchOutcome:error.dispatchOutcome||(dispatched?'unknown':'not_dispatched')};
            // Drain already-dispatched operations, but do not issue any next
            // job after an evidenced loop. The same marker blocks cold runs.
            if(work.operationState?.noProgressStop)stopUnissued=true;
            event('work_failed',{workId:work.id,failure:work.failure});await checkpoint();
          }
        }
      }));
      refresh();await checkpoint();return ready.map(w=>({id:w.id,status:w.status,resultRef:w.resultRef,failure:w.failure??null}));
    }
    fail('ROSTER_WORKFLOW_COMMAND_UNKNOWN',command.type);
  }
  function observation(consumer){
    if(!state)return null;
    return {schema,scope:clone(state.scope),draftRef:state.draftRef??null,draftRevision:state.draftRevision??null,work:clone(state.work),evidence:directory(consumer),
      events:clone(state.events),acceptanceGranted:false,...(pendingDraftCommit?{draftCommitRecovery:{status:'outcome_unknown',
        visibleState:'last_known_before_commit',attemptedRevision:pendingDraftCommit.intended.draftRevision,
        requiredAction:'retry_same_commit_or_reload_durable_workspace'}}:{})};
  }
  return {
    dispatch(command){
      const next=commands.then(async()=>{
        if(pendingDraftCommit){
          // Do not run another tool/model against a possibly obsolete draft.
          // Only the exact command may reconcile this uncertain local commit.
          if(!persistedEqual(command,pendingDraftCommit.command))
            fail('ROSTER_WORKFLOW_DRAFT_COMMIT_OUTCOME_UNKNOWN',{reason:'same_commit_required',retrySameCommit:true});
          await reconcileDraftCommit();
        }
        return dispatch(command);
      });
      // A rejected command must not leave a cached view of any partial local
      // mutation. Successful mutations already invalidate at their checkpoint.
      commands=next.catch(()=>{observations.clear();});return next;
    },
    async inspect(consumer='observer'){await commands;return observation(consumer);},
    // Host dependency consumers need the named work's actual reads, not the
    // observer's catalogue access or a full-history copy added to every prompt.
    async readDependencies(workId){await commands;
      return clone((state?.reads??[]).filter(row=>row.consumer===workId));},
    async inspectReadOnly(consumer='observer'){
      await commands;
      if(!observations.has(consumer))observations.set(consumer,freezeObservation(observation(consumer)));
      return observations.get(consumer);
    },
  };
}
