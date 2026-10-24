// Read-only role runner for the new workflow. Each quantum is one model turn,
// followed by its exact requested reads. It does not ask the model to narrate
// fabricated tool receipts or send the old inquiry history on every turn.
import {isDeepStrictEqual} from 'node:util';
import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {normalizeProviderJsonDocumentV1} from '../secure-provider-runtime/provider-response-outcome-v1.mjs';
import {projectRosterProviderOutputReferencesV1} from './roster-prompt-evidence-encoding-v1.mjs';
import {prepareRosterSourceReviewRequestV1} from './roster-source-review-presentation-v1.mjs';
import {prepareRosterInquiryPremiseRequestV1} from './roster-inquiry-premise-boundary-v1.mjs';
import {projectRosterReviewProofContextV1,rosterReviewProofCitationErrorsV1} from './roster-review-proof-context-v1.mjs';
import {publishRosterHostProjectionContextV1,rosterHostProjectionCitationGapV1} from './roster-host-projection-context-v1.mjs';
import {projectRosterReviewObligationsV1,finalizeRosterRoleRequestV1,
  rosterRoleReplyCommunicationErrorsV1,quarantineRosterCommunicationV1} from './roster-role-communication-v1.mjs';
import {ROSTER_WORKFLOW_EXPERIMENT_ORDER_SCHEMA_V1,compileRosterWorkflowExperimentV1,resolveRosterWorkflowNativeSelectionV1} from './roster-workflow-laboratory-v1.mjs';
import {ROSTER_WORKFLOW_DRAFT_MUTATION_SCHEMA_V1,projectRosterWorkflowDraftArgumentsV1} from './roster-workflow-draft-v1.mjs';
import {resolveRosterWorkflowBudgetSelectionV1} from './roster-workflow-budget-selection-v1.mjs';
import {findRepeatedFailedRosterSceneV1,projectRosterGeometryDecisionContextV1,
  projectCompletedRosterNativeTransitionsV1,projectRepeatedInspectionOnlyBatchV1} from './roster-experiment-progress-v1.mjs';
import {describeRosterWorkflowCatalogueV1,searchRosterWorkflowSourceCatalogueV1,projectRosterCatalogueEntryV1} from './roster-workflow-catalogue-v1.mjs';
import {projectRosterWorkflowRepairDependenciesV1,projectRosterWorkflowAssignedSourceReferencesV1} from './roster-workflow-repair-dependencies-v1.mjs';
import {projectRosterWorkflowDelegatedScenesV1} from './roster-workflow-state-reference-v1.mjs';
import {rosterWorkflowChoiceContractV1} from './roster-workflow-graph-v1.mjs';
import {rosterClosedMethodReturnsControlV1} from './roster-workflow-control-progress-v1.mjs';
import {rosterToolContractDirectoryV1,projectRosterDelegatedToolPresentationV1} from './roster-tool-proof-scope-v1.mjs';
import {ROSTER_WORKFLOW_INPUT_DELIVERY_VERSION_V1} from './roster-workflow-input-delivery-v1.mjs';
import {focusRosterWorkflowCorrectionRequestV1} from './roster-workflow-correction-context-v1.mjs';
import {prepareRosterStrategyRepairRequestV1,projectRosterStrategyRepairOutputV1,rosterStrategyRepairNodeV1,rosterInquiryCorrectionErrorsV1,rosterStrategyOriginalResponseFormatV1} from './roster-workflow-semantic-repair-v1.mjs';
import {prepareRosterNativeChoiceCommandV1} from './roster-native-choice-command-v1.mjs';
import {prepareRosterWorkOrderEditCommandV1,projectRosterSavedWorkOrderPreparationV1} from './roster-work-order-edit-command-v1.mjs';
import {rosterComparisonObservationCoverageErrorsV1} from './roster-comparison-observation-sources-v1.mjs';
import {projectRosterAuthorDecisionHandoffV1,enterRosterAuthorDecisionHandoffV1,
  ROSTER_DECIDED_HERE_INSTRUCTION_V1,rosterDecidedHereErrorsV1} from './roster-workflow-author-handoff-v1.mjs';
import {projectRosterWorkflowReadContextV1,recordRosterWorkflowReadDeliveryV1,
  projectRosterReadRequestProgressV1,projectRosterWorkflowRootContextReferenceV1} from './roster-workflow-read-context-v1.mjs';
import {ROSTER_NATIVE_FACT_CLAIM_SCHEMA_V1,verifyRosterNativeFactsV1,projectRosterNativeFactSourceNavigationV1} from './roster-native-fact-claims-v1.mjs';
import {projectSchemaOwnedSiblingFieldsV1,projectSchemaOwnedChildFieldsV1,projectSchemaDuplicateFieldsV1} from '../structured-generation/schema-owned-field-projection-v1.mjs';
import {projectPregameProbabilityRepairInputsV1} from './pregame-query-repair-contract-v1.mjs';
import {ROSTER_HYPOTHESIS_ASSESSMENT_SCHEMA_V1,rosterHypothesisOriginV1,rosterHypothesisLoopContractV1} from './roster-hypothesis-test-v1.mjs';
import {ROSTER_COMPARISON_PURPOSE_SCHEMA_V1,rosterComparisonValidityContractV1,isRosterComparisonDesignStageV1,
  rosterComparisonDesignStageContractV1} from './roster-comparison-purpose-v1.mjs';
import {rosterSourceReviewRepairStageV1,rosterSourceRepairInformationErrorV1,
  projectRosterSourceConditionProgressV1,createRosterSourceInterpretationReturnV1} from './roster-experiment-source-repair-v1.mjs';
import {rosterWorkflowPlanAuthoringContractV1} from './roster-workflow-readiness-v1.mjs';
import {projectRosterWorkflowQuestionRouteV1,createRosterWorkflowAuthorDecisionReturnV1} from './roster-workflow-question-routing-v1.mjs';
import {serializeRosterWorkOrderFailureV1,createRosterWorkOrderCapabilityReturnV1,rosterRepeatedWorkOrderFailureV1} from './roster-workflow-order-failure-v1.mjs';
import {projectRosterOriginalInvestigationInputsV1} from './roster-workflow-experiment-owner-v1.mjs';
import {projectRosterIncomingAuthorContextV1} from './roster-workflow-strategy-owner-context-v1.mjs';
import {ROSTER_NEXT_INVESTIGATION_SCHEMA_V1,rosterDecisionInvestigationErrorV1,
  projectRosterInvestigationContinuationV1} from './roster-workflow-fact-inquiry-v1.mjs';
import {rosterAuthorOriginalQuestionContractV1,rosterAuthorOriginalQuestionCoverageErrorV1} from './roster-author-question-contract-v1.mjs';
import {ROSTER_STRATEGY_WORKFLOW_BLOCKER_SCHEMA_V1,rosterStrategyProgressContractV1,rosterStrategyProgressErrorsV1} from './roster-strategy-progress-contract-v1.mjs';
import {ROSTER_COMPARISON_CLOSURE_REQUEST_SCHEMA_V1,rosterComparisonClosureContractV1,
  rosterComparisonClosureErrorsV1,projectRosterComparisonClosureHandoffV1,
  projectRosterComparisonAdjudicationAssignmentV1} from './roster-comparison-closure-v1.mjs';
import {ROSTER_COMPARISON_PREMISE_AUDIT_SCHEMA_V1,
  assessRosterComparisonPremisesV1} from './roster-comparison-premises-v1.mjs';
import {ROSTER_COMPARISON_DESIGN_REQUEST_SCHEMA_V1,rosterComparisonRedesignContractV1,
  rosterComparisonRedesignErrorsV1,projectRosterComparisonDesignHandoffV1} from './roster-comparison-redesign-v1.mjs';
import {projectRosterWorkflowTeachSubjectV1,rosterWorkflowUnreadTeachSubjectsV1} from './roster-workflow-plan-blocks-v1.mjs';
import {ROSTER_REVIEW_DATA_QUESTION_SCHEMA_V1,ROSTER_REVIEW_DATA_QUESTION_INSTRUCTION_V1,
  projectRosterReviewDataQuestionsV1,projectRosterQuestionSourceUnionV1,rosterWorkflowAcceptanceStageV1,rosterWorkflowDraftLifecycleV1,
  ROSTER_EXPERIMENT_FOLLOWUP_INSTRUCTION_V1,rosterExperimentUnresolvedFactsErrorV1,
  rosterReviewOriginalQuestionCoverageErrorV1,rosterAuthoredChoiceSourceErrorV1,
  rosterPendingAuthorChoiceErrorV1,rosterWorkflowAuthoredSubjectV1,rosterReviewDataQuestionInstructionV1,
  rosterAuthoredChoiceRequirementV1} from './roster-review-data-questions-v1.mjs';
import {createStarcraftTmgOutputContractV1,outputContractRefStarcraftTmgV1,
  validateStarcraftTmgProviderJsonSchemaValueV1 as validate}
  from '../structured-generation/output-contract-registry-v1.mjs';
const str={type:'string',minLength:0,maxLength:65536};
const arr=items=>({type:'array',minItems:0,items});
const obj=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const number={type:'integer',minimum:1,maximum:1000000};
const common={action:{...str,enum:['read','finish']},publicReason:str,reads:arr(obj({evidenceNumber:number,pointer:str}))};
const factSchema=obj({...common,findings:arr(obj({statement:str,status:{...str,enum:['observed','conditional','hypothesis','needs_evidence','unsupported']},
  evidenceNumbers:arr(number),conditions:arr(str)}))});
const teachSchema=obj({...common,proposals:arr(obj({claimPaths:arr(str),disposition:{...str,enum:['retain','challenge','investigate']},
  publicReason:str,alternatives:arr(str),disconfirmation:str,evidenceNumbers:arr(number),requiredData:arr(str)}))});
const reviewSchema=obj({...common,checks:arr(obj({checkId:str,
  verdict:{...str,enum:['supported','conditional','needs_evidence','requires_revision']},
  publicReason:str,evidenceNumbers:arr(number),conditions:arr(str),requiredData:arr(str)}))});
const classifiedReviewSchema=obj({...common,checks:arr(obj({checkId:str,
  verdict:{...str,enum:['supported','conditional','needs_evidence','requires_revision']},
  publicReason:str,evidenceNumbers:arr(number),conditions:arr(str),dataQuestions:arr(ROSTER_REVIEW_DATA_QUESTION_SCHEMA_V1)}))});
const catalogueQuery=obj({query:str,kind:str,validity:{...str,enum:['current','historical','all']},
  offset:{type:'integer',minimum:0,maximum:1000000},limit:{type:'integer',minimum:1,maximum:256}});
const withPlanningCatalogue=schema=>obj({...schema.properties,action:{...str,enum:['read','catalogue','finish']},
  catalogueQueries:arr(catalogueQuery)});
const experimentSchema=obj({...common,action:{...str,enum:['read','catalogue','finish','conclude'],
  description:'Choose ONE next operation. finish submits pending executable workOrders with conclusion=null; conclude ends/returns this question with workOrders=[]. Partial facts belong in publicReason, not a simultaneous final/control conclusion.'},
  catalogueQueries:arr(catalogueQuery),workOrders:{...arr(ROSTER_WORKFLOW_EXPERIMENT_ORDER_SCHEMA_V1),
    description:'Nonempty only for finish; then conclusion MUST be null. Each workOrder owns steps, stopAndReturnToModelWhen and completionStepId as siblings of experimentScope. experimentScope contains only the experiment design. To return strategy_required/blocked/answered choose conclude and leave workOrders empty.'},
  unresolvedQuestions:{...arr(str),description:ROSTER_EXPERIMENT_FOLLOWUP_INSTRUCTION_V1},
  conclusion:{anyOf:[obj({status:{...str,enum:['answered','blocked','strategy_required'],description:'Only action=conclude may contain this object. Set the whole conclusion to null for read, catalogue and finish. Preserve partial facts/questions in publicReason/unresolvedQuestions when submitting workOrders.'},answer:str,evidenceNumbers:arr(number),
    nativeFacts:{...arr(ROSTER_NATIVE_FACT_CLAIM_SCHEMA_V1),description:'Concrete computed/observed facts selected from current executed tool receipts. Required nonempty for answered preflight prerequisite facts. Empty is allowed for source-only interpretation outside that stage, not as a substitute for a missing calculation. Host validates exact values; prose/source review never creates a Native observation.'},
    conditions:{...arr(str),description:'Explicit applicability premises and future/optional uncertainties, retained with public reasons and never asserted as proven. Necessary current facts cannot be moved here merely to obtain answered.'},
    hypothesisAssessments:{...arr(ROSTER_HYPOTHESIS_ASSESSMENT_SCHEMA_V1),description:'Empty for ordinary fact probes. For declared strategic tests, cite the actual hypothesis-bearing tool receipt and observations. These are proposed scoped verdicts, not source approval or final strategic adoption.'}}),{type:'null'}]}});
const strategyQuestionSchema=structuredClone(ROSTER_REVIEW_DATA_QUESTION_SCHEMA_V1);
strategyQuestionSchema.properties.classification.enum.push('decided_here');
const decisionSchema=obj({...common,decisions:{...arr(obj({disposition:{...str,enum:['revise','record_facts','retain','investigate']},
  publicReason:str,evidenceNumbers:arr(number),alternatives:arr(str),
  nextInvestigation:ROSTER_NEXT_INVESTIGATION_SCHEMA_V1,
  workflowBlocker:ROSTER_STRATEGY_WORKFLOW_BLOCKER_SCHEMA_V1,
  comparisonDesignRequest:ROSTER_COMPARISON_DESIGN_REQUEST_SCHEMA_V1,
  comparisonClosureRequest:ROSTER_COMPARISON_CLOSURE_REQUEST_SCHEMA_V1,
  dataQuestions:{...arr(strategyQuestionSchema),description:'Classify original questions including their resolution. necessary_fact and author_decision are still UNRESOLVED. authored_choice is ALREADY declared in the current Plan with its current Plan source; answered_fact cites actually read evidence. Preserve future conditions and optional probes. '+ROSTER_DECIDED_HERE_INSTRUCTION_V1},
  strategicChanges:{...arr(obj({intentPath:str,beforeIntent:str,afterIntent:str,decisionConsequence:str})),
    description:'Nonempty ONLY for revise: actual army/strategic intent or adopted-premise changes and their decision consequence. New experiment receipts or snapshot notes alone belong in record_facts, not a Plan rewrite. Empty for every non-revision operation.'},
  mutation:{anyOf:[ROSTER_WORKFLOW_DRAFT_MUTATION_SCHEMA_V1,{type:'null'}]}})),maxItems:1}});
function makeContract(name,providerSchema,version='1.0.0'){return createStarcraftTmgOutputContractV1({
  id:`roster.workflow_${name}`,version,schemaName:`roster_workflow_${name}_v1`,providerSchema,
  modelOwnedFields:Object.keys(providerSchema.properties),hostOwnedFields:['artifactRef','receipt','acceptanceGranted'],
  mapperRef:{id:'roster.workflow_read_role_mapper',version:'1.0.0',hash:hash('roster.workflow_read_role_mapper.v1')},
  semanticValidatorRef:{id:'roster.workflow_read_role_semantics',version:'1.0.0',hash:hash('roster.workflow_read_role_semantics.v1')},
  description:'Scoped read-only evidence interpretation and local Teach; not army/Plan edits or final acceptance.',
});}
export const ROSTER_WORKFLOW_READ_ROLE_CONTRACT_V1=makeContract('read_role',factSchema);
export const ROSTER_WORKFLOW_LOCAL_TEACH_CONTRACT_V1=makeContract('local_teach',withPlanningCatalogue(teachSchema),'1.1.0');
export const ROSTER_WORKFLOW_COMPARISON_DESIGN_CONTRACT_V1=makeContract('local_comparison_design',withPlanningCatalogue(obj({
  ...teachSchema.properties,proposals:{...arr(obj({...teachSchema.properties.proposals.items.properties,
    comparisonPurpose:ROSTER_COMPARISON_PURPOSE_SCHEMA_V1})),maxItems:1}})),'1.0.0');
const comparisonDesignSynthesisContract=makeContract('comparison_design_synthesis',obj({
  ...ROSTER_WORKFLOW_COMPARISON_DESIGN_CONTRACT_V1.providerSchema.properties,action:{...str,enum:['finish']}}),'1.0.0');
export const ROSTER_WORKFLOW_FINAL_REVIEW_CONTRACT_V1=makeContract('final_review',reviewSchema);
export const ROSTER_WORKFLOW_CLASSIFIED_REVIEW_CONTRACT_V1=makeContract('classified_review',classifiedReviewSchema,'1.4.0');
const domainReviewCatalogueContract=makeContract('domain_review_catalogue',obj({...classifiedReviewSchema.properties,
  action:{...str,enum:['read','catalogue','finish']},catalogueQueries:arr(catalogueQuery)}),'1.4.0');
const comparisonPremiseReviewContract=makeContract('comparison_premise_review',obj({
  ...domainReviewCatalogueContract.providerSchema.properties,premiseAudit:ROSTER_COMPARISON_PREMISE_AUDIT_SCHEMA_V1}),'1.0.0');
export const ROSTER_WORKFLOW_EXPERIMENT_CONTRACT_V1=makeContract('experiment',experimentSchema,'2.7.0');
export const ROSTER_WORKFLOW_STRATEGY_DECISION_CONTRACT_V1=makeContract('strategy_decision',withPlanningCatalogue(decisionSchema),'1.15.0');
const decisionSynthesisContract=makeContract('strategy_decision_synthesis',obj({...ROSTER_WORKFLOW_STRATEGY_DECISION_CONTRACT_V1.providerSchema.properties,
  action:{...str,enum:['finish']}}),'1.15.0');
const teachSynthesisContract=makeContract('local_teach_synthesis',obj({...ROSTER_WORKFLOW_LOCAL_TEACH_CONTRACT_V1.providerSchema.properties,
  action:{...str,enum:['finish']}}),'1.1.0');
const experimentSynthesisContract=makeContract('experiment_evidence_synthesis',obj({...ROSTER_WORKFLOW_EXPERIMENT_CONTRACT_V1.providerSchema.properties,
  action:{...str,enum:['finish','conclude']}}),'2.6.0');
const roles=new Set(['roster_workflow_fact_summary','roster_workflow_local_teach','roster_workflow_experiment_planner','roster_workflow_strategy_decision','roster_workflow_final_review']);
// This executor journals pending BEFORE calling the Provider (including retry),
// and clears it only after saving the reply. Only this known read-only executor
// may supply this recovery proof; absence of pending in arbitrary tools is NOT
// proof that their external side effect did not occur.
export async function projectRosterUnissuedReadRoleRecoveryV1({state,work,readArtifact}){
  const typedPreparationFailure=work?.status==='needs_repair'
    &&work.failure?.code==="Cannot read properties of undefined (reading 'originalOutput')"
    &&work.failure?.dispatchOutcome==='unknown';
  if(work?.status!=='running'&&!typedPreparationFailure||!roles.has(work.role)||!work.inputRef||!work.dispatchKey
    ||work.operationState?.pending||work.operationState?.retryProviderDispatch||work.operationState?.revalidateReplyRef
    ||Object.entries(work.bindings??{}).some(([key,value])=>state.scope[key]!==value))return null;
  const dispatch=state.events.findLast(e=>e.type==='dispatch'&&e.workId===work.id);
  if(!dispatch||dispatch.dispatchKey!==work.dispatchKey||dispatch.inputRef!==work.inputRef)return null;
  try{
    const input=await readArtifact(work.inputRef);
    if(input.workId!==work.id||input.role!==work.role||!isDeepStrictEqual(input.bindings,work.bindings))return null;
    const op=work.operationState,prior=state.events.findLast(e=>e.type==='result_saved'&&e.workId===work.id);
    let reason,previousReplyRef=null;
    if(op==null||op.version===1&&op.turn===0&&Array.isArray(op.calls)&&op.calls.length===0){
      if(prior||work.resultRef)return null;
      reason='first_dispatch_before_provider';
    }else{
      if(op.version!==1||!Array.isArray(op.calls)||op.calls.length!==op.turn||!op.calls.length
        ||!prior||prior.sequence>=dispatch.sequence||prior.dispatchKey===dispatch.dispatchKey
        ||prior.resultRef!==work.resultRef)return null;
      const last=op.calls.at(-1),result=await readArtifact(prior.resultRef);
      if(result.continuation!==true||(prior.providerReplyRef??result.value?.originalReplyRef)!==last.replyRef)return null;
      const [request,reply]=await Promise.all([readArtifact(last.requestRef),readArtifact(last.replyRef)]);
      if(rosterRoleReplyCommunicationErrorsV1(request,reply).length)return null;
      if(typedPreparationFailure){
        // Exact saved v956 command + rejected reply proves this crash happened
        // while assembling the NEXT request, before pending/Provider dispatch.
        // Arbitrary unknown failures or an in-flight request are not retryable.
        if(work.operationState.correction?.originalReplyRef!==last.replyRef
          ||rosterStrategyRepairNodeV1(request)?.kind!=='work_order_edit_command'
          ||request.strategyRepairState?.originalOutput
          ||request.promptNodes.some(n=>n.kind==='local_contract_feedback')
          ||!projectRosterStrategyRepairOutputV1({request,output:reply.output}).errors.length)return null;
      }
      previousReplyRef=last.replyRef;reason='next_dispatch_after_saved_continuation';
    }
    if(typedPreparationFailure&&!previousReplyRef)return null;
    return {version:1,kind:'read_role_before_provider',workId:work.id,dispatchKey:work.dispatchKey,
      inputRef:work.inputRef,reason,previousReplyRef,providerReplayed:false,nativeReplayed:false,
      ...(typedPreparationFailure?{engineeringChangeId:'typed_command_feedback_v958'}:{}),
      countersReset:false,historyReset:false,factsApproved:false};
  }catch{return null;}
}
const assignedHypothesisDesigns=assignment=>new Set((assignment.inputs.activeHypothesisTests?.value?.entries??[])
  .filter(e=>e.hypothesisTest&&e.assessmentResponsibility!=='context_only').map(e=>hash(e.hypothesisTest)));
export function projectRosterWorkflowInertEnvelopeV1(output,schema,recordField){
  const value=structuredClone(output),projection=[];
  const inert=v=>v===null||Array.isArray(v)&&!v.length
    ||v&&typeof v==='object'&&!Array.isArray(v)&&!Object.keys(v).length;
  const envelope=(object,declared,path)=>{
    if(!object||typeof object!=='object'||Array.isArray(object)||!declared?.properties)return;
    for(const key of Object.keys(object))if(!Object.hasOwn(declared.properties,key)&&inert(object[key])){
      projection.push({from:path+'/'+key.replace(/~/gu,'~0').replace(/\//gu,'~1'),value:structuredClone(object[key]),
        rule:'inert_unmapped_envelope_field_v1',retainedAsNonExecutableAnnotation:true});
      delete object[key];
    }
  };
  envelope(value,schema,'');
  // Only role-result envelopes; NEVER recurse into executable workOrders,
  // mutations, Plan fields, tool arguments or typed question meaning.
  if(['decisions','checks','proposals','findings'].includes(recordField)&&Array.isArray(value?.[recordField]))
    value[recordField].forEach((row,i)=>envelope(row,schema.properties[recordField]?.items,`/${recordField}/${i}`));
  return {output:value,projection};
}
// A repaired schema or lossless explicit-citation projection can make a saved
// paid reply usable. One normal semantic revalidation, not fact/strategy approval
// or a fresh model attempt. Other semantic failures never qualify.
function projectCompletedSyntaxReply(reply){
  const failed=reply?.providerFailure;
  if(!failed)return {output:reply?.output,projection:[]};
  if(reply.failureCode!=='ROSTER_WORKSPACE_OUTPUT_UNPARSEABLE'||reply.receipt?.paidProviderCall!==true
    ||typeof failed.rawText!=='string'||failed.rawTextHash!==hash(failed.rawText)
    ||failed.contextHash!==reply.receipt.contextHash)return {output:null,projection:[]};
  const recovered=normalizeProviderJsonDocumentV1(failed.rawText);
  if(recovered.kind!=='single_missing_container_close_v1')return {output:null,projection:[]};
  return {output:JSON.parse(recovered.text),projection:[{rule:'completed_json_syntax_projection_v1',
    normalizationKind:recovered.kind,evidence:recovered.evidence,originalReplyUnchanged:true}]};
}
function isTypedPureFutureReview(check){
  return check?.verdict==='conditional'&&check.conditions?.length>0
    &&check.dataQuestions?.length>0
    &&check.dataQuestions.every(q=>q.classification==='future_condition');
}
function providerSyntaxDiagnostic(text){
  if(typeof text!=='string')return null;
  try{JSON.parse(text);return null;}catch(error){
    const rawOffset=Number(/position (\d+)/u.exec(error.message)?.[1]??-1);
    const offset=rawOffset<0?text.length:rawOffset,start=Math.max(0,offset-120);
    return {message:error.message,parseErrorUtf16Offset:offset,
      nearbyStartUtf16Offset:start,nearbyText:text.slice(start,Math.min(text.length,start+240)),
      rawContentUnchanged:true,
      instruction:'This is the actual JSON parser failure, not evidence that you returned a schema. Correct the local syntax/envelope while preserving the proposed choices and public content. Do not repeat the identical malformed text or invent replacement facts.'};
  }
}
const reviewObligationHandles=projectRosterReviewObligationsV1;
export {reviewObligationHandles as projectRosterWorkflowReviewObligationHandlesV1};
// One extra correction after this concrete feedback source fix, not a generic
// reset of exhausted work. A request already carrying v2 cannot renew it.
export function projectRosterWorkflowFeedbackRecoveryV1({work,reply,request,sourceRequest}){
  const owner=request?.promptNodes?.find(n=>n.kind==='strategy_owner_assignment');
  const ownerContext=request?.promptNodes?.find(n=>n.kind==='strategy_owner_context');
  const ownerInputs=request?.promptNodes?.find(n=>n.kind==='workflow_role_assignment')?.inputs;
  const scopeErrors=work?.operationState?.correction?.errors??[];
  const oldOwnerFeedback=request?.promptNodes?.find(n=>n.kind==='local_contract_feedback');
  // Concrete v980 wire fix only: the stopped request had valid owner data but
  // mixed citation diagnostics disabled its command. Never renew a typed
  // request, bypass an in-flight call or turn a no-progress stop into a retry.
  if(work?.role==='roster_workflow_strategy_decision'&&work.status==='needs_repair'
    &&work.failure?.code==='ROSTER_WORKFLOW_ROLE_NO_PROGRESS'
    &&work.failure.dispatchOutcome==='completed_no_progress'&&!work.operationState?.pending
    &&work.operationState?.correction?.originalReplyRef&&owner?.questions?.length
    &&scopeErrors.length&&scopeErrors.every(e=>e.code==='unchanged_investigation_authorization')
    &&!rosterStrategyRepairNodeV1(request)
    &&oldOwnerFeedback?.errors?.some(e=>e.code==='evidence_not_read')
    &&oldOwnerFeedback.errors.some(e=>e.code!=='evidence_not_read')
    &&rosterStrategyRepairNodeV1(prepareRosterStrategyRepairRequestV1(request))?.version===3)return {
      workId:work.id,originalReplyRef:work.operationState.correction.originalReplyRef,
      repairKind:'owner_handoff_command_continuity',feedbackVersion:980,
      recoveryKey:hash({workId:work.id,feedbackVersion:980}),additionalInvalidResultLimit:1,
      historyReset:false,originalPaidReplyPreserved:true,newCorrectiveProviderRequest:true,
      nativeReplayed:false,finalApprovalGranted:false};
  if(work?.status==='needs_repair'&&work.failure?.code==='ROSTER_WORKFLOW_ROLE_NO_PROGRESS'
    &&work.failure.dispatchOutcome==='completed_no_progress'&&!work.operationState?.pending
    &&work.operationState?.correction?.originalReplyRef&&owner?.questions?.length
    &&ownerContext&&!ownerContext.assignmentScope
    &&Array.isArray(ownerInputs?.requirements?.value?.strategyQuestions)
    &&ownerInputs?.strategicHypothesisChallenge?.value?.comparisonMemory?.comparisonResolved===true
    &&scopeErrors.some(e=>e.code==='unchanged_investigation_authorization')
    &&scopeErrors.every(e=>['unchanged_investigation_authorization',
      'comparison_closure_requires_explicit_scoped_choice','evidence_not_read'].includes(e.code)))return {
      workId:work.id,originalReplyRef:work.operationState.correction.originalReplyRef,
      repairKind:'scoped_semantic_correction_context',feedbackVersion:979,
      recoveryKey:hash({workId:work.id,feedbackVersion:979}),additionalInvalidResultLimit:1,
      historyReset:false,originalPaidReplyPreserved:true,newCorrectiveProviderRequest:true,
      nativeReplayed:false,finalApprovalGranted:false};
  // A persisted no-progress stop is not a normal retry. Only the exact old
  // capability handoff missing the shared OWNER projection gets this one
  // post-fix continuation; a request carrying that projection cannot renew it.
  const originalOwner=sourceRequest?.promptNodes?.find(n=>n.kind==='workflow_role_assignment');
  const ownerReturn=originalOwner?.workId===work?.id?projectRosterIncomingAuthorContextV1(originalOwner):null;
  if(work?.status==='needs_repair'&&work.failure?.code==='ROSTER_WORKFLOW_ROLE_NO_PROGRESS'
    &&work.failure.dispatchOutcome==='completed_no_progress'&&!work.operationState?.pending
    &&work.operationState?.correction?.originalReplyRef&&reply?.output?.action==='finish'
    &&work.operationState.correction.errors?.length
    &&work.operationState.correction.errors.every(e=>e.code==='unchanged_investigation_authorization')
    &&ownerReturn?.node.returnKind==='capability_delivery_reconsideration'
    &&!request?.promptNodes?.some(n=>n.kind==='strategy_owner_assignment'||n.kind==='strategy_author_handoff'))return {
      workId:work.id,originalReplyRef:work.operationState.correction.originalReplyRef,
      repairKind:'incoming_author_ownership',feedbackVersion:978,
      recoveryKey:hash({workId:work.id,feedbackVersion:978}),additionalInvalidResultLimit:1,
      historyReset:false,originalPaidReplyPreserved:true,newCorrectiveProviderRequest:true,
      nativeReplayed:false,finalApprovalGranted:false};
  if(work?.status!=='needs_repair'||work.failure?.dispatchOutcome!=='completed_invalid'
    ||work.operationState?.pending||!work.operationState?.correction?.originalReplyRef)return null;
  const errors=work.operationState.correction.errors??[];
  const oldCurrencyFeedback=request?.promptNodes?.find(n=>n.kind==='local_contract_feedback')?.errors??[];
  if(work.role==='roster_workflow_experiment_planner'&&reply?.output?.action==='conclude'&&errors.length
    &&errors.every(e=>e.code==='native_fact_requires_current_executed_receipt')
    &&oldCurrencyFeedback.length===errors.length&&oldCurrencyFeedback.every(e=>
      e.code==='native_fact_requires_current_executed_receipt'
      &&e.sourceNavigation?.kind==='native_receipt_view_source'&&e.sourceNavigation.sourceCurrent===false
      &&errors.some(old=>old.number===e.number&&old.pointer===e.pointer)))return {
        workId:work.id,originalReplyRef:work.operationState.correction.originalReplyRef,
        repairKind:'native_source_currency_feedback',feedbackVersion:971,
        recoveryKey:hash({workId:work.id,feedbackVersion:971}),additionalInvalidResultLimit:1,
        historyReset:false,originalPaidReplyPreserved:true,newCorrectiveProviderRequest:true,
        nativeReplayed:false,finalApprovalGranted:false};
  if(work.role==='roster_workflow_experiment_planner'&&!rosterStrategyRepairNodeV1(request)
    &&prepareRosterWorkOrderEditCommandV1(request)?.strategyRepairState?.repairOrigin==='local_selection_validation')return {
      workId:work.id,originalReplyRef:work.operationState.correction.originalReplyRef,
      repairKind:'inline_order_incremental_correction',feedbackVersion:961,
      recoveryKey:hash({workId:work.id,feedbackVersion:961}),additionalInvalidResultLimit:1,
      historyReset:false,originalPaidReplyPreserved:true,newCorrectiveProviderRequest:true,nativeReplayed:false,finalApprovalGranted:false};
  // Standing permission: one extra only after this concrete control-protocol
  // repair. The same command cannot renew its own allowance or reset history.
  if(work.role==='roster_workflow_experiment_planner'&&errors.length
    &&errors.every(e=>e.code==='experiment_answer_has_unresolved_necessary_facts')
    &&reply?.output?.conclusion?.status==='answered'&&reply.output.unresolvedQuestions?.length
    &&!rosterStrategyRepairNodeV1(request))return {
      workId:work.id,originalReplyRef:work.operationState.correction.originalReplyRef,
      repairKind:'experiment_control_command',feedbackVersion:948,
      recoveryKey:hash({workId:work.id,feedbackVersion:948}),additionalInvalidResultLimit:1,
      historyReset:false,originalPaidReplyPreserved:true,newCorrectiveProviderRequest:true,nativeReplayed:false,finalApprovalGranted:false};
  // A concrete new control protocol, not another attempt of the same prompt.
  // Preserve counters/history; the product records this grant once per work.
  if(work.role==='roster_workflow_strategy_decision'&&errors.length
    &&errors.every(e=>e.code==='comparison_revision_requires_resolution')
    &&request?.promptNodes?.some(n=>n.kind==='comparison_closure_contract'&&n.version===1)
    &&rosterStrategyRepairNodeV1(request)?.version!==4){
    return {workId:work.id,originalReplyRef:work.operationState.correction.originalReplyRef,
      repairKind:'comparison_control_command',feedbackVersion:22,
      recoveryKey:hash({workId:work.id,feedbackVersion:22}),additionalInvalidResultLimit:1,
      historyReset:false,originalPaidReplyPreserved:true,newCorrectiveProviderRequest:true,nativeReplayed:false,finalApprovalGranted:false};
  }
  if(work.role==='roster_workflow_strategy_decision'&&errors.length
    &&errors.every(e=>['unchanged_investigation_authorization','pending_questions_are_not_investigation_authorization'].includes(e.code))
    &&request?.promptNodes?.some(n=>n.kind==='investigation_dispatch_contract'&&n.version>=2))return null;
  const deliveredInputs=request?.promptNodes?.find(n=>n.kind==='workflow_role_assignment')?.inputs;
  const hostCitationGap=work.role==='roster_workflow_final_review'
    &&rosterHostProjectionCitationGapV1({inputs:deliveredInputs,errors,output:reply?.output});
  const hostFactChannelGap=work.role==='roster_workflow_experiment_planner'&&errors.length
    &&deliveredInputs?.hostProjectionSource?.value?.schema==='roster_host_projection_context_v1'
    &&deliveredInputs.hostProjectionSource.value.version<2
    &&errors.every(e=>e.code==='native_fact_requires_current_executed_receipt'
      &&e.number===deliveredInputs.hostProjectionSource.evidenceNumber
      &&e.pointer?.startsWith('/projections/'));
  const planNavigationGap=errors.length&&errors.every(e=>e.code==='authored_choice_requires_current_plan_source')
    &&!request?.promptNodes?.find(n=>n.kind==='local_contract_feedback')?.errors
      ?.some(e=>e.sourceNavigation?.version>=1);
  const inquiryDispatchGap=work.role==='roster_workflow_strategy_decision'&&errors.length
    &&errors.every(e=>['unchanged_investigation_authorization','pending_questions_are_not_investigation_authorization'].includes(e.code))
    &&!request?.promptNodes?.some(n=>n.kind==='investigation_dispatch_contract'&&n.version>=2);
  // Patch output must not fall into legacy authored-choice recovery. The new
  // source-publication defect is independent of the patch wire format.
  if(rosterStrategyRepairNodeV1(request)&&!hostCitationGap&&!planNavigationGap&&!inquiryDispatchGap)return null;
  const priorFeedbackVersion=Math.max(0,...(request?.promptNodes??[]).filter(n=>n.kind==='local_contract_feedback').map(n=>n.feedbackVersion??0));
  let repairKind,feedbackVersion=2;
  const originalAssignment=sourceRequest?.promptNodes?.find(n=>n.kind==='workflow_role_assignment');
  const incoming=originalAssignment?.workId===work.id?projectRosterIncomingAuthorContextV1(originalAssignment):null;
  const priorReviewFeedback=request?.promptNodes?.find(n=>n.kind==='local_contract_feedback');
  if(hostFactChannelGap){
    repairKind='host_projection_fact_channel';feedbackVersion=21;
  }
  else if(inquiryDispatchGap){
    repairKind='explicit_inquiry_dispatch';feedbackVersion=20;
  }
  else if(work.role==='roster_workflow_strategy_decision'&&errors.length
    &&errors.every(e=>e.code==='author_choice_requires_author_action')
    &&work.operationState.authorDecisionHandoff
    &&request?.promptNodes?.some(n=>n.kind==='strategy_author_handoff')
    &&reply?.output?.action==='finish'&&reply.output.decisions?.length===1){
    repairKind='owner_handoff_command_continuity';feedbackVersion=19;
  }
  else if(work.role==='roster_workflow_experiment_planner'&&errors.length
    &&errors.every(e=>e.code==='native_fact_receipt_path_invalid'&&e.sourceSchema==='roster_workflow_receipt_view_v1')
    &&!request?.promptNodes?.find(n=>n.kind==='local_contract_feedback')?.errors
      ?.some(e=>e.sourceNavigation?.kind==='native_receipt_view_source')){
    repairKind='native_receipt_view_source';feedbackVersion=18;
  }
  else if(planNavigationGap){
    repairKind='current_plan_source_navigation';feedbackVersion=17;
  }
  else if(hostCitationGap){
    repairKind='host_projection_source_citation';feedbackVersion=16;
  }
  else if(work.role==='roster_workflow_final_review'
    &&!request?.promptNodes?.some(n=>n.kind==='review_repair_continuity_contract'&&n.version>=1)
    &&priorReviewFeedback?.originalOutput?.action==='finish'
    &&priorReviewFeedback.originalOutput.checks?.length
    &&priorReviewFeedback.errors?.some(e=>e.code?.startsWith('review_patch_'))){
    // This actual request fell out of the per-check lane after a malformed wire
    // patch. One corrected request, not a replay/approval or a general retry grant.
    repairKind='review_patch_continuity';feedbackVersion=15;
  }
  else if(work.role==='roster_workflow_experiment_planner'
    &&!deliveredInputs?.activeHypothesisTests?.value?.sourceIdentityVersion
    &&errors.length&&errors.every(e=>['hypothesis_assessment_requires_declared_test',
      'declared_hypothesis_requires_scoped_assessment','hypothesis_sources_required_in_conclusion'].includes(e.code))
    &&errors.some(e=>e.code==='hypothesis_assessment_requires_declared_test'
      &&Object.entries(deliveredInputs??{}).some(([key,input])=>key.startsWith('hypothesisDesignSource')
        &&input.evidenceNumber===e.number&&input.status==='read'&&input.value))){
    // The old input itself falsely advertised this source as carrying a design.
    // Correct the input and ask the model once; do not remap its saved verdict.
    repairKind='hypothesis_source_identity';feedbackVersion=14;
  }
  else if(work.role==='roster_workflow_strategy_decision'&&errors.length
    &&errors.every(e=>e.code==='unchanged_investigation_authorization')
    &&request?.promptNodes?.some(n=>n.kind==='strategy_owner_assignment')
    &&reply?.output?.action==='finish'&&reply.output.decisions?.length===1){
    repairKind='author_decision_command';feedbackVersion=13;
  }
  else if(incoming&&errors.length&&errors.every(e=>e.code==='unchanged_investigation_authorization')
    &&!request?.promptNodes?.some(n=>n.kind==='strategy_owner_assignment')
    &&work.inputs?.investigationFrontier?.value?.ownerWorkId===incoming.node.source.originalAssignmentWorkId){
    repairKind='incoming_author_ownership';feedbackVersion=12;
  }
  else if(work.role==='roster_workflow_strategy_decision'&&rosterInquiryCorrectionErrorsV1(errors)
    &&request?.promptNodes?.some(n=>n.kind==='strategic_question_lanes'&&n.partialChoicesCanCoexistWithInvestigation===true)
    &&reply?.output?.action==='finish'&&reply.output.decisions?.length===1
    &&request?.promptNodes?.some(n=>n.kind==='local_contract_feedback')){
    repairKind='typed_inquiry_command';feedbackVersion=11;
  }
  else if(work.role==='roster_workflow_strategy_decision'&&errors.length
    &&errors.every(e=>['bounded_investigation_authorization_invalid','decided_here_requires_explicit_owner_decision'].includes(e.code))
    &&!request?.promptNodes?.some(n=>n.kind==='strategic_question_lanes'&&n.partialChoicesCanCoexistWithInvestigation===true)
    &&reply?.output?.decisions?.length===1
    &&reply.output.decisions[0].dataQuestions?.some(q=>q.classification==='decided_here')
    &&reply.output.decisions[0].nextInvestigation
    &&!rosterDecisionInvestigationErrorV1({...reply.output.decisions[0],disposition:'investigate'})){
    // Eligibility only. Never rewrite the actual chosen operation: the author
    // must issue it against the repaired joint-choice contract.
    repairKind='partial_choice_next_operation';feedbackVersion=10;
  }
  else if(work.role==='roster_workflow_strategy_decision'&&errors.length
    &&errors.every(e=>e.code==='author_choice_requires_author_action')
    &&request?.promptNodes?.some(n=>n.kind==='local_correction_context'&&n.version>=1)
    &&!rosterStrategyRepairNodeV1(request)){
    repairKind='typed_semantic_repair';feedbackVersion=9;
  }
  else if(work.role==='roster_workflow_strategy_decision'&&errors.length
    &&errors.every(e=>e.code==='author_choice_requires_author_action')
    &&!request?.promptNodes?.some(n=>n.kind==='local_correction_context'&&n.version>=1)){
    repairKind='scoped_semantic_correction_context';feedbackVersion=8;
  }
  else if(work.role==='roster_workflow_strategy_decision'&&errors.length
    &&errors.every(e=>e.code==='author_choice_requires_author_action')
    &&reply?.output?.decisions?.some(d=>d.dataQuestions?.some(q=>q.classification==='author_decision'))
    &&!request?.responseFormat?.schema?.properties?.decisions?.items?.properties?.dataQuestions?.items?.properties?.classification?.enum?.includes('authored_choice')){
    repairKind='authored_choice_resolution';feedbackVersion=6;
  }
  else if(work.role==='roster_workflow_experiment_planner'&&errors.length
    &&errors.every(e=>e.code==='evidence_not_read'&&e.requiredPointer==='/receipt/actionSpace')
    &&reply?.output?.workOrders?.some(o=>o.steps?.some(s=>s.operation==='native_action'))
    &&!request?.promptNodes?.some(n=>n.kind==='selected_native_menu_read_contract'&&n.version>=1)){
    repairKind='selected_native_menu';feedbackVersion=4;
  }
  else if(work.role==='roster_workflow_experiment_planner'&&errors.length
    &&errors.every(e=>e.code==='evidence_not_read'&&e.requiredPointer==='/receipt/actionSpace')
    &&reply?.output?.workOrders?.some(order=>order.steps?.some(step=>{
      if(step.operation!=='spatial')return false;
      try{const selection=JSON.parse(step.argumentsJson).selection;return selection?.kind==='domain'&&selection.sourceEvidenceNumber>0;}
      catch{return false;}
    }))
    &&!request?.promptNodes?.some(n=>n.kind==='selected_native_menu_read_contract'&&n.version>=2)){
    repairKind='spatial_selected_native_menu';feedbackVersion=5;
  }
  else if(work.role==='roster_workflow_final_review'&&errors.length&&errors.every(e=>e.code==='review_obligation_coverage')
    &&priorFeedbackVersion<3){repairKind='review_obligation_handles';feedbackVersion=3;}
  else if(priorFeedbackVersion>=2)return null;
  else if(reply?.providerFailure&&providerSyntaxDiagnostic(reply.providerFailure.rawText)
    &&errors.length&&errors.every(e=>['provider_output_invalid','schema'].includes(e.code)))repairKind='syntax_diagnostic';
  else if(work.role==='roster_workflow_final_review'&&errors.length
    &&errors.every(e=>e.code==='supported_review_requires_evidence'))repairKind='review_evidence_requirement';
  else return null;
  return {workId:work.id,originalReplyRef:work.operationState.correction.originalReplyRef,
    repairKind,feedbackVersion,recoveryKey:hash({workId:work.id,feedbackVersion}),
    additionalInvalidResultLimit:1,historyReset:false,originalPaidReplyPreserved:true,
    newCorrectiveProviderRequest:true,nativeReplayed:false,finalApprovalGranted:false};
}
function readRoleDecisionField(role){
  return role==='roster_workflow_final_review'?'checks':role==='roster_workflow_strategy_decision'?'decisions'
    :role==='roster_workflow_experiment_planner'?'workOrders':role==='roster_workflow_local_teach'?'proposals':'findings';
}
function explicitReadOnlyPayload(output,field){
  return ['read','catalogue','finish'].includes(output?.action)
    &&Array.isArray(output.reads)&&Array.isArray(output.catalogueQueries)
    &&Array.isArray(output[field])&&!output[field].length&&!output.conclusion
    &&['checks','decisions','workOrders','proposals','findings'].every(key=>
      !Object.hasOwn(output,key)||Array.isArray(output[key])&&!output[key].length)
    &&output.reads.length+output.catalogueQueries.length>0;
}
function explicitExperimentConclusionPayload(output){
  return output?.action==='finish'&&output.conclusion!==null&&typeof output.conclusion==='object'
    &&['answered','blocked','strategy_required'].includes(output.conclusion.status)
    &&['reads','catalogueQueries','workOrders'].every(key=>Array.isArray(output[key])&&!output[key].length);
}
export function projectRosterWorkflowSavedSchemaRevalidationV1({work,reply,request}){
  const syntax=projectCompletedSyntaxReply(reply);
  const priorErrors=work?.operationState?.correction?.errors??[];
  if(work?.role==='roster_workflow_experiment_planner'&&work.status==='needs_repair'
    &&work.failure?.dispatchOutcome==='completed_invalid'&&!work.operationState?.pending
    &&work.operationState?.correction?.originalReplyRef&&priorErrors.length
    &&priorErrors.every(e=>e.code==='work_order_edit_invalid_before'&&e.stepId===e.beforeStepId)
    &&request?.promptNodes?.some(n=>n.kind==='work_order_edit_command'&&(n.positionContractVersion??1)<2)){
    const projected=projectRosterStrategyRepairOutputV1({request,output:syntax.output});
    if(!projected.errors.length&&projected.projection.some(p=>p.rule==='existing_step_self_anchor_no_move_v1'))return {
      workId:work.id,originalReplyRef:work.operationState.correction.originalReplyRef,
      repairKind:'work_order_self_anchor',
      revalidationKey:hash({replyRef:work.operationState.correction.originalReplyRef,repairKind:'work_order_self_anchor',version:1}),
      providerReplayed:false,nativeReplayed:false,finalApprovalGranted:false};
  }
  if(work?.role==='roster_workflow_experiment_planner'&&work.status==='needs_repair'
    &&work.failure?.dispatchOutcome==='completed_invalid'&&!work.operationState?.pending
    &&work.operationState?.correction?.originalReplyRef&&priorErrors.length
    &&priorErrors.every(e=>e.code==='work_order_edit_requires_patch_only')
    &&projectRosterSavedWorkOrderPreparationV1({request,output:syntax.output}))return {
      workId:work.id,originalReplyRef:work.operationState.correction.originalReplyRef,
      repairKind:'work_order_read_preparation',
      revalidationKey:hash({replyRef:work.operationState.correction.originalReplyRef,repairKind:'work_order_read_preparation',version:1}),
      providerReplayed:false,nativeReplayed:false,finalApprovalGranted:false};
  if(work?.role==='roster_workflow_experiment_planner'&&work.status==='needs_repair'
    &&work.failure?.dispatchOutcome==='completed_invalid'&&!work.operationState?.pending
    &&work.operationState?.correction?.originalReplyRef&&priorErrors.length
    &&priorErrors.every(e=>e.code==='ROSTER_WORKFLOW_NATIVE_SELECTION_MATCH_NOT_UNIQUE'
      &&typeof e.detail?.match?.candidateId==='string'&&e.detail.availableIdentities?.length
      &&e.detail.availableIdentities.every(row=>!Object.hasOwn(row,'candidateId')))
    &&syntax.output?.workOrders?.length
    &&validate(ROSTER_WORKFLOW_EXPERIMENT_CONTRACT_V1.providerSchema,syntax.output).ok)
    return {workId:work.id,originalReplyRef:work.operationState.correction.originalReplyRef,
      repairKind:'native_menu_candidate_identity',
      revalidationKey:hash({replyRef:work.operationState.correction.originalReplyRef,
        repairKind:'native_menu_candidate_identity',version:1}),
      providerReplayed:false,nativeReplayed:false,finalApprovalGranted:false};
  if(work?.role==='roster_workflow_experiment_planner'&&work.status==='needs_repair'
    &&work.failure?.dispatchOutcome==='completed_invalid'&&!work.operationState?.pending
    &&work.operationState?.correction?.originalReplyRef&&priorErrors.length
    &&priorErrors.every(e=>['experiment_owner_choice_not_submitted','experiment_conclusion_requires_conclude_action'].includes(e.code))
    &&explicitExperimentConclusionPayload(syntax.output)
    &&validate(ROSTER_WORKFLOW_EXPERIMENT_CONTRACT_V1.providerSchema,{...syntax.output,action:'conclude'}).ok)
    return {workId:work.id,originalReplyRef:work.operationState.correction.originalReplyRef,
      repairKind:'explicit_experiment_conclusion_discriminator',
      revalidationKey:hash({replyRef:work.operationState.correction.originalReplyRef,
        repairKind:'explicit_experiment_conclusion_discriminator',version:1}),
      providerReplayed:false,nativeReplayed:false,finalApprovalGranted:false};
  if(work?.status==='needs_repair'&&work.failure?.dispatchOutcome==='completed_invalid'
    &&!work.operationState?.pending&&work.operationState?.correction?.originalReplyRef
    &&priorErrors.length&&priorErrors.every(e=>e.code==='finish_requires_role_decisions_only')
    &&syntax.output?.action==='finish'&&explicitReadOnlyPayload(syntax.output,readRoleDecisionField(work.role))
    &&request?.responseFormat?.schema&&validate(request.responseFormat.schema,syntax.output).ok)
    return {workId:work.id,originalReplyRef:work.operationState.correction.originalReplyRef,
      repairKind:'read_only_payload_discriminator',
      revalidationKey:hash({replyRef:work.operationState.correction.originalReplyRef,
        repairKind:'read_only_payload_discriminator',version:1}),
      providerReplayed:false,nativeReplayed:false,finalApprovalGranted:false};
  if(work?.role==='roster_workflow_experiment_planner'&&work.status==='needs_repair'
    &&work.failure?.dispatchOutcome==='completed_invalid'&&!work.operationState?.pending
    &&work.operationState?.correction?.originalReplyRef&&priorErrors.length
    &&priorErrors.every(e=>e.code==='native_fact_observation_missing_or_unknown')
    &&syntax.output?.action==='conclude'&&syntax.output.conclusion?.nativeFacts?.length
    &&validate(ROSTER_WORKFLOW_EXPERIMENT_CONTRACT_V1.providerSchema,syntax.output).ok)
    return {workId:work.id,originalReplyRef:work.operationState.correction.originalReplyRef,
      repairKind:'native_fact_json_value',
      revalidationKey:hash({replyRef:work.operationState.correction.originalReplyRef,
        repairKind:'native_fact_json_value',version:1}),
      providerReplayed:false,nativeReplayed:false,finalApprovalGranted:false};
  // The former verifier incorrectly required every actual tool result to use
  // the laboratory envelope. Re-read the immutable paid answer through ALL
  // current source/read/value checks; no paid regeneration or fact approval.
  // New failures have a different diagnostic, so they cannot renew this grant.
  if(work?.role==='roster_workflow_experiment_planner'&&work.status==='needs_repair'
    &&work.failure?.dispatchOutcome==='completed_invalid'&&!work.operationState?.pending
    &&work.operationState?.correction?.originalReplyRef&&priorErrors.length
    &&priorErrors.every(e=>e.code==='native_fact_requires_receipt_result_pointer')
    &&syntax.output?.action==='conclude'&&syntax.output.conclusion?.nativeFacts?.length
    &&validate(ROSTER_WORKFLOW_EXPERIMENT_CONTRACT_V1.providerSchema,syntax.output).ok)
    return {workId:work.id,originalReplyRef:work.operationState.correction.originalReplyRef,
      repairKind:'native_fact_receipt_envelope',
      revalidationKey:hash({replyRef:work.operationState.correction.originalReplyRef,
        repairKind:'native_fact_receipt_envelope',version:1}),
      providerReplayed:false,nativeReplayed:false,finalApprovalGranted:false};
  // Re-evaluate this exact paid selection so its canonical candidate read can
  // use the ordinary fetch -> author confirmation boundary. This is not a new
  // model retry or acceptance of an unread candidate.
  if(work?.role==='roster_workflow_strategy_decision'&&work.status==='needs_repair'
    &&work.failure?.dispatchOutcome==='completed_invalid'&&!work.operationState?.pending
    &&work.operationState?.correction?.originalReplyRef&&priorErrors.length
    &&priorErrors.every(e=>e.code==='ROSTER_WORKFLOW_BRANCH_CANDIDATE_NOT_DELIVERED')
    &&!request?.promptNodes?.some(n=>n.kind==='selected_candidate_read_contract')){
    const projected=projectRosterStrategyRepairOutputV1({request,output:syntax.output});
    const format=rosterStrategyOriginalResponseFormatV1(request);
    if(!projected.errors.length&&validate(format.schema,projected.output).ok
      &&projected.output.action==='finish'&&projected.output.decisions?.length===1
      &&(projected.output.decisions[0].mutation?.rosterCandidateSelection
        ||projected.output.decisions[0].mutation?.rosterBranchSelection))return {
      workId:work.id,originalReplyRef:work.operationState.correction.originalReplyRef,
      repairKind:'selected_candidate_read_handoff',contractRef:format.outputContractRef,
      oldSchemaHash:hash(request.responseFormat.schema),newSchemaHash:hash(format.schema),
      revalidationKey:hash({replyRef:work.operationState.correction.originalReplyRef,repairKind:'selected_candidate_read_handoff',version:1}),
      providerReplayed:false,nativeReplayed:false,finalApprovalGranted:false};
  }
  const mixedReadRepair=['finish','conclude'].includes(syntax.output?.action)
    &&priorErrors.some(e=>e.code==='evidence_not_read')
    &&priorErrors.some(e=>!['evidence_not_read','finish_requires_role_decisions_only'].includes(e.code))
    &&!priorErrors.some(e=>['schema','provider_output_invalid'].includes(e.code))
    &&!request?.promptNodes?.some(n=>n.kind==='citation_read_recovery_contract'&&n.version>=2);
  const futurePremiseRepair=work?.role==='roster_workflow_final_review'
    &&work.operationState?.correction?.errors?.length>0
    &&work.operationState.correction.errors.every(e=>e.code==='supported_review_requires_evidence'
      &&isTypedPureFutureReview(syntax.output?.checks?.find(c=>c.checkId===e.checkId)));
  const oldAssignment=request?.promptNodes?.find(n=>n.kind==='workflow_role_assignment');
  const hypothesisScopeRepair=work?.role==='roster_workflow_experiment_planner'&&oldAssignment
    &&assignedHypothesisDesigns(oldAssignment).size===0
    &&work.operationState?.correction?.errors?.length>0
    &&work.operationState.correction.errors.every(e=>e.code==='declared_hypothesis_requires_scoped_assessment');
  if(work?.status!=='needs_repair'||work.failure?.dispatchOutcome!=='completed_invalid'
    ||work.operationState?.pending||!syntax.output
    ||!work.operationState?.correction?.errors?.length
    ||!work.operationState.correction.errors.every(e=>['schema','question_sources_required_in_parent',
      ...(syntax.projection.length?['provider_output_invalid']:[]),
      ...(hypothesisScopeRepair?['declared_hypothesis_requires_scoped_assessment']:[]),
      ...(futurePremiseRepair?['supported_review_requires_evidence']:[]),
      ...(mixedReadRepair?priorErrors.map(e=>e.code):[])].includes(e.code)))return null;
  const domain=work.inputs.review?.value;
  const contract=work.role==='roster_workflow_final_review'
    ?(domain?.domainId==='comparison_closure'&&request?.responseFormat?.schema?.properties?.premiseAudit
      ?comparisonPremiseReviewContract:typeof domain?.domainId==='string'&&domain.requirementClassificationVersion===1
      ?domainReviewCatalogueContract:ROSTER_WORKFLOW_CLASSIFIED_REVIEW_CONTRACT_V1)
    :work.role==='roster_workflow_strategy_decision'?ROSTER_WORKFLOW_STRATEGY_DECISION_CONTRACT_V1
    :isRosterComparisonDesignStageV1(work)?ROSTER_WORKFLOW_COMPARISON_DESIGN_CONTRACT_V1
    :work.role==='roster_workflow_local_teach'?ROSTER_WORKFLOW_LOCAL_TEACH_CONTRACT_V1
    :work.role==='roster_workflow_experiment_planner'?ROSTER_WORKFLOW_EXPERIMENT_CONTRACT_V1
    :ROSTER_WORKFLOW_READ_ROLE_CONTRACT_V1;
  const oldSchema=request?.responseFormat?.schema;
  const field=work.role==='roster_workflow_strategy_decision'?'decisions':work.role==='roster_workflow_final_review'?'checks':'';
  const sources=projectRosterQuestionSourceUnionV1(syntax.output,field);
  const ownership=work.role==='roster_workflow_experiment_planner'
    ?projectSchemaOwnedSiblingFieldsV1(sources.output,contract.providerSchema,{recordField:'workOrders',nestedField:'experimentScope'})
    :contract===comparisonPremiseReviewContract?projectSchemaOwnedChildFieldsV1(sources.output,contract.providerSchema)
    :{output:sources.output,projection:[]};
  const redundant=projectSchemaDuplicateFieldsV1(ownership.output,contract.providerSchema);
  const envelope=projectRosterWorkflowInertEnvelopeV1(redundant.output,contract.providerSchema,field);
  if(field==='decisions')for(const row of envelope.output?.decisions??[])if(row.mutation)
    row.mutation=projectRosterWorkflowDraftArgumentsV1(row.mutation).mutation;
  const errors=work.operationState.correction.errors,oldRejected=oldSchema&&!validate(oldSchema,reply.output).ok;
  if(!oldSchema||!validate(contract.providerSchema,envelope.output).ok
    ||errors.some(e=>e.code==='schema')&&!oldRejected
    ||errors.some(e=>e.code==='question_sources_required_in_parent')&&!sources.projection.length)return null;
  const lostPremiseContract=contract===comparisonPremiseReviewContract
    &&work.operationState.revalidations?.some(r=>r.replyRef===work.operationState.correction.originalReplyRef&&r.contractHash!==contract.contractHash)
    &&errors.every(e=>e.code==='schema'&&e.issues?.every(i=>i.code==='additional_property_forbidden'&&['$.premiseAudit','$.tradeoff'].includes(i.path)));
  const repairKind=lostPremiseContract?'comparison_premise_saved_contract_selection':mixedReadRepair?'mixed_citation_read_handoff':hypothesisScopeRepair?'hypothesis_assessment_ownership_scope':ownership.projection.length?'schema_owned_sibling_field_relocation':redundant.projection.length?'schema_duplicate_field_projection':futurePremiseRepair?'typed_future_premise_review':syntax.projection.length?'completed_json_syntax_projection':envelope.projection.length?'inert_envelope_projection'
    :oldRejected?'schema_contract_upgrade':'explicit_question_citation_union';
  const originalReplyRef=work.operationState.correction.originalReplyRef;
  return {workId:work.id,originalReplyRef,repairKind,syntaxProjection:syntax.projection,
    explicitSourceProjection:sources.projection,fieldOwnershipProjection:ownership.projection,duplicateFieldProjection:redundant.projection,envelopeProjection:envelope.projection,
    oldSchemaHash:hash(oldSchema),newSchemaHash:hash(contract.providerSchema),
    contractRef:outputContractRefStarcraftTmgV1(contract),
    revalidationKey:hash({originalReplyRef,oldSchema,newSchema:contract.providerSchema,repairKind,
      projectionRules:[...new Set([...syntax.projection,...sources.projection,...ownership.projection,...redundant.projection,...envelope.projection].map(p=>p.rule))]}),
    providerReplayed:false,nativeReplayed:false,finalApprovalGranted:false};
}
function experimentOperationChoiceError(output){
  return {code:'experiment_conclusion_requires_conclude_action',field:'/conclusion',
    observedAction:output.action,observedConclusionStatus:output.conclusion?.status??null,
    alternatives:[{action:'finish',conclusion:null,workOrders:'Keep the necessary executable batch; preserve partial facts and strategy questions in publicReason/unresolvedQuestions.'},
      {action:'conclude',workOrders:[],conclusion:'Keep a justified answered/blocked/strategy_required disposition; do not simultaneously schedule an experiment.'}],
    instruction:'Choose ONE next operation, not both. For action=finish keep necessary workOrders but set conclusion=null; preserve its partial factual explanation in publicReason and pending questions in unresolvedQuestions. If you instead choose to return the question now, use action=conclude with workOrders=[], reads=[] and catalogueQueries=[]. Host has not chosen for you, deleted uncertainty or accepted either option.'};
}
function deliveredChoiceMenu(read,operation,kind,optionIndex=null,requiredPointer=null){
  if(read?.status!=='read')return false;
  const formation=operation==='formation_scene'||kind==='formation';
  const value=read.value,field=formation?'formationOptions':kind==='finite'?'finiteActions':'parameterDomains';
  const pointer=read.resolvedPointer??read.pointer??'';
  if(requiredPointer&&pointer===requiredPointer&&value&&typeof value==='object')return true;
  if(formation&&Number.isSafeInteger(optionIndex)&&optionIndex>=0
    &&pointer.endsWith('/formationOptions/'+optionIndex)&&value&&typeof value==='object'&&!Array.isArray(value))return true;
  if(Array.isArray(value)&&pointer.endsWith('/'+field))return true;
  const containers=formation
    ?[value,value?.result,value?.queryReceipt?.result,value?.receipt?.queryReceipt?.result]
    :[value,value?.actionSpace,value?.receipt?.actionSpace];
  return containers.some(container=>Array.isArray(container?.[field]));
}
// Missing delivery and a source that NEVER contained this menu require different
// repairs. Never auto-read a nonexistent actionSpace on a Native action receipt.
async function choiceMenuSourceError({selection,operation,directory,store,assignment}){
  const entry=directory.find(e=>e.number===selection.sourceEvidenceNumber);
  const formation=operation==='formation_scene'||selection.kind==='formation';
  let pointer=formation?'/receipt/queryReceipt/result/formationOptions'
    +(Number.isSafeInteger(selection.optionIndex)&&selection.optionIndex>=0?'/'+selection.optionIndex:''):'/receipt/actionSpace';
  const resolve=async e=>{
    let body=await store.get(e.artifactRef);body=body.value??body;
    const visited=new Set([e.id]);
    while(['roster_workflow_receipt_view_v1','roster_experiment_source_facts_v1'].includes(body.schema)){
      const id=body.evidenceId??body.sourceEvidenceId;
      if(visited.has(id))return null;visited.add(id);
      const original=directory.find(row=>row.id===id);if(!original)return null;
      body=await store.get(original.artifactRef);body=body.value??body;
    }
    return body;
  };
  const source=entry?await resolve(entry):null;
  // Read selection and execution share the EXACT primitive/index resolver.
  // Report a wrong/ambiguous identity before requesting any more menu bytes.
  if((operation==='native_action'||operation==='spatial'&&selection.kind==='domain')
    &&source&&(source.operation==='inspect'||formation&&source.operation==='spatial')){
    const selected=operation==='spatial'?{...selection,parameters:{}}:selection;
    try{pointer=resolveRosterWorkflowNativeSelectionV1({selection:selected},{workId:entry.id,value:source}).menuPointer;}
    catch(error){return {code:error.code??error.message,detail:error.detail??null,
      instruction:(error.detail?.matchCount===0
        ?'The requested identity is absent from this saved current menu. This is not an ambiguous match, missing parameter, or unread-source error. A capability-reference route (including executable_exact) does NOT make that action currently selectable. Choose another actually observed entry only if it serves the same authorized method; otherwise explicitly return strategy_required with the unresolved question. '
        :'Choose an exact observed identity from availableIdentities: finite candidateId/actionKey, domainId, or exact action fields. An actionType may have multiple candidates (for example different chosenFirstActorSideKey); select the intended unique entry, not its display label. ')
        +'Then read only the selected entry at its readPointer and confirm it. Host has not selected an action, changed parameters, executed Native or approved the experiment.'};}
  }
  const unread={code:'evidence_not_read',number:selection.sourceEvidenceNumber,requiredPointer:pointer,
    instruction:'The menu must actually reach the selecting model. Fetch this exact saved menu, then confirm or revise the pending choice; a directory or stateRef alone is insufficient.'};
  if(!source||deliveredChoiceMenu({status:'read',value:source,pointer:''},operation,selection.kind))return unread;
  const availableSavedMenus=[];
  // Follow explicit saved provenance, not title similarity or a guessed latest
  // state. These are READ HANDLES only; the model still chooses and confirms.
  const failure=assignment.inputs.task?.value?.failure;
  const originalWorkId=failure?.queryReuse?.originalWorkId??failure?.queryRepair?.originalWorkId;
  const original=originalWorkId?directory.find(e=>e.id==='tool:'+originalWorkId):null;
  if(original){
    const menu=await resolve(original);
    if(menu?.stateRef&&source.stateRef&&JSON.stringify(menu.stateRef)===JSON.stringify(source.stateRef)
      &&deliveredChoiceMenu({status:'read',value:menu,pointer:''},operation,selection.kind))
      availableSavedMenus.push({evidenceNumber:original.number,pointer,operation:menu.operation,
        stateRef:structuredClone(menu.stateRef),bodyRead:false,sourceRelation:'explicit_saved_original_inspection_same_state'});
  }
  const producer=operation==='formation_scene'
    ?{operation:'spatial',queryKinds:['space.solve_static_formation']}
    :formation?{operation:'spatial',queryKinds:['space.solve_formation','legal_formation_options']}
    :{operation:'inspect',queryKinds:[]};
  return {code:'choice_menu_source_has_no_menu',number:selection.sourceEvidenceNumber,
    observedOperation:source.operation??null,expectedOperation:operation,
    expectedSelectionKind:formation?'formation':selection.kind,producer,
    requiredPointer:null,missingMenuPointer:pointer,stateRef:structuredClone(source.stateRef??null),
    availableSavedMenus,menuBodiesDelivered:false,acceptanceGranted:false,
    instruction:'This registered source does NOT contain the requested menu; it is not merely unread. Do not keep reading its missing pointer or invent options from stateRef. Retrieve an existing result of the specified producer on the intended state, or propose that producer as a preparation-only workOrder with your explicit query arguments. An inspect actionSpace is NOT a static-formation or current-domain formationOptions result; a formation_scene is an applied scene, NOT a solver result. Read the actual returned options before confirming any selection. availableSavedMenus are provenance-checked addresses, not delivered bodies. Do not redo completed setup/actions; a precise scoped control return is also allowed. No action, fact or Plan is approved.'};
}
function savedChoiceForError(output,error){
  for(const order of output?.workOrders??[])for(const step of order.steps??[]){
    let args;try{args=JSON.parse(step.argumentsJson);}catch{continue;}
    const selections=step.operation==='formation_scene'?args.selections??[]:[args.selection];
    const selection=selections.find(s=>s?.sourceEvidenceNumber===error.number);
    if(selection)return {selection,operation:step.operation};
  }
  return null;
}
function matchingChoiceMenuDelivered(issue,reads,directory){
  return reads.some(read=>{
    if(!deliveredChoiceMenu(read,issue.expectedOperation??'native_action',issue.expectedSelectionKind))return false;
    const known=(issue.availableSavedMenus??[]).some(menu=>{
      const entry=directory.find(e=>e.number===menu.evidenceNumber);
      return entry&&entry.id.replace(/^tool-view:/,'tool:')===read.evidenceId?.replace(/^tool-view:/,'tool:');
    });
    if(known)return true;
    const value=read.value?.value??read.value;
    const formation=issue.expectedSelectionKind==='formation';
    if(formation&&issue.producer?.queryKinds?.length
      &&!issue.producer.queryKinds.includes(value?.receipt?.queryKind??value?.queryKind))return false;
    const stateHash=formation?value?.stateRef?.stateHash??value?.receipt?.baseStateHash??value?.baseStateHash
      :value?.authority?.stateHash??value?.actionSpace?.authority?.stateHash
        ??value?.receipt?.actionSpace?.authority?.stateHash;
    return Boolean(stateHash&&stateHash===issue.stateRef?.stateHash);
  });
}
function menuPreparationStepAllowed(step,issues){
  let args;try{args=JSON.parse(step.argumentsJson);}catch{return false;}
  return issues.some(issue=>step.operation===issue.producer?.operation
    &&(step.operation!=='spatial'||issue.producer.queryKinds.includes(args.queryKind))
    // Native formation may need its current domain inspected first; this does
    // not claim that inspect itself contains formationOptions.
    ||step.operation==='inspect'&&issue.expectedOperation==='native_action');
}
function handoffSavedMethodConfirmation(operation,replyRef,kind){
  const source=operation.sourceRevalidation;
  if(source?.policy!=='saved_method_contract_v873'||source.replyRef!==replyRef||source.authorConfirmation)return;
  // Revalidating a paid proposal can reveal unread sources. Reading is not
  // approval: return to its author through the ordinary bounded role cycle.
  // Keep the original calls, errors and limits; never replay the paid answer.
  source.authorConfirmation={phase:'awaiting_author_confirmation',originalReplyRef:replyRef,
    handoffKind:kind,openedAtTurn:operation.turn,
    readResultRefs:operation.reads.map(read=>read.resultRef),historyReset:false,conclusionAccepted:false};
}
export function createRosterWorkflowReadRoleExecutorV1({deliberation,store,sessionId,onRequest=async()=>{},onReply=async()=>{}}) {
  const catalogueSourceIndex=new Map(); // immutable artifact refs; no model/role read grants
  return async (assignment,control)=>{
    if(!roles.has(assignment.role))throw Error('ROSTER_WORKFLOW_READ_ROLE_UNKNOWN');
    const designStage=rosterComparisonDesignStageContractV1(assignment);
    const choiceContract=assignment.role==='roster_workflow_experiment_planner'
      ?rosterWorkflowChoiceContractV1({state:await store.load(),workId:assignment.workId}):null;
    const operation=structuredClone(control.operationState??{version:1,turn:0,reads:[],calls:[],correction:null,consecutiveCorrections:0});
    if(operation.noProgressStop)throw Object.assign(Error('ROSTER_WORKFLOW_ROLE_NO_PROGRESS'),{
      dispatchOutcome:'completed_no_progress',detail:structuredClone(operation.noProgressStop)});
    if(assignment.role==='roster_workflow_fact_summary'&&!operation.pending&&!operation.revalidateReplyRef){
      const repeated=await projectRepeatedInspectionOnlyBatchV1({state:await store.load(),workId:assignment.workId,store});
      if(repeated){
        operation.noProgressStop={version:1,...repeated,automaticRetry:false,acceptanceGranted:false,historyReset:false};
        await control.checkpointOperation(operation);
        throw Object.assign(Error('ROSTER_WORKFLOW_ROLE_NO_PROGRESS'),{
          dispatchOutcome:'completed_no_progress',detail:structuredClone(operation.noProgressStop)});
      }
    }
    if(operation.evidenceDelivery&&!operation.workOrderEditPreparation){
      const replyRef=operation.evidenceDelivery.originalReplyRef;
      const call=operation.calls?.find(c=>c.replyRef===replyRef);
      if(call){
        const saved=await store.get(call.requestRef);
        if(rosterStrategyRepairNodeV1(saved)?.kind==='work_order_edit_command'){
          const paid=await store.get(replyRef);
          const proposal=projectRosterStrategyRepairOutputV1({request:saved,output:paid.output});
          if(!proposal.errors.length&&proposal.preparationCandidate){
            if(proposal.preparationCandidate.scopeHash!==hash(assignment.scope))
              throw Object.assign(Error('ROSTER_WORKFLOW_ORDER_HANDOFF_SCOPE_MISMATCH'),{dispatchOutcome:'not_dispatched'});
            operation.workOrderEditPreparation={...structuredClone(proposal.preparationCandidate),
              sourceReplyRef:replyRef,previousProposalRefs:[],recoveredFrom:'saved_implicit_evidence_delivery'};
            await control.checkpointOperation(operation);
          }
        }
      }
    }
    const authorConfirmation=operation.sourceRevalidation?.authorConfirmation;
    const mayConfirmSavedMethod=operation.sourceRevalidation?.policy==='saved_method_contract_v873'
      &&authorConfirmation?.phase==='awaiting_author_confirmation'
      &&authorConfirmation.originalReplyRef===operation.sourceRevalidation.replyRef;
    if(operation.sourceRevalidation&&!operation.revalidateReplyRef&&!mayConfirmSavedMethod)
      throw Object.assign(Error('ROSTER_WORKFLOW_SAVED_REVALIDATION_REQUIRES_REVIEW'),{dispatchOutcome:'not_dispatched'});
    // Interrupted dispatches require reconciliation, not an implicit fresh call.
    const pendingRetry=operation.pending&&operation.retryProviderDispatch;
    if(operation.pending&&!pendingRetry)throw Error('ROSTER_WORKFLOW_ROLE_DISPATCH_UNRECONCILED');
    let savedPremiseRevalidation=false;
    if(operation.revalidateReplyRef&&assignment.role==='roster_workflow_final_review'){
      const call=operation.calls.find(c=>c.replyRef===operation.revalidateReplyRef);
      if(call){const saved=await store.get(call.requestRef),sent=saved.promptNodes?.find(n=>n.kind==='workflow_role_assignment');
        savedPremiseRevalidation=sent?.workId===assignment.workId&&sent.role===assignment.role
          &&sent.inputs?.comparisonPremises?.value?.version===1&&Boolean(saved.responseFormat?.schema?.properties?.premiseAudit);
      }
    }
    if(!pendingRetry&&!operation.revalidateReplyRef)
      assignment=await publishRosterHostProjectionContextV1({assignment,control});
    if(!pendingRetry&&!operation.revalidateReplyRef)
      assignment={...assignment,inputs:projectPregameProbabilityRepairInputsV1(assignment.inputs)};
    if(!pendingRetry&&(!operation.revalidateReplyRef||savedPremiseRevalidation))
      assignment=await projectRosterComparisonAdjudicationAssignmentV1({assignment,state:await store.load(),readArtifact:store.get});
    const directory=assignment.evidenceDirectory.map((entry,index)=>({number:index+1,...entry}));
    const descriptor=assignment.inputs.tools?.value;
    // Re-project also for queued/cold-resumed method jobs. The former goal-only
    // index omitted still-valid prior paths and advertised resolution aliases
    // as separate experiments. Never alter an already dispatched paid request.
    if(assignment.role==='roster_workflow_experiment_planner'&&!choiceContract
      &&!pendingRetry&&!operation.revalidateReplyRef&&descriptor?.laboratory)
      assignment={...assignment,inputs:{...assignment.inputs,completedNativeTransitions:{source:'literal',
        value:await projectCompletedRosterNativeTransitionsV1({state:await store.load(),store,descriptor:descriptor.laboratory})}}};
    // Only shrink a body when its EXACT immutable source is already published
    // and readable in this assignment. Old/pending requests remain replayable.
    const toolSource=descriptor?.schema==='roster_workflow_tools_v1'
      ?directory.find(entry=>entry.id===`tool-contract:${hash(descriptor)}`&&entry.validity==='current'):null;
    const toolContractScope=toolSource&&!pendingRetry&&!operation.revalidateReplyRef?{
      kind:'executable_tool_contract_scope',version:1,currentEvidenceId:toolSource.id,currentEvidenceNumber:toolSource.number,
      currentPointer:'',historicalContractEvidenceNumbers:directory
        .filter(entry=>entry.id.startsWith('tool-contract:')&&entry.id!==toolSource.id).map(entry=>entry.number),
      contractIsMeasurement:false,historicalReadsAllowed:true,
      instruction:'The tools directory points to the EXACT current executor contract above. Other tool-contract numbers are retained historical interfaces even when their saved source remains readable/current in the general evidence catalogue. Do not use those old interfaces to decide present capability availability or argument/output fields. Read current operation pointers from tools; keep old contracts only to interpret their original calls. A current interface describes how to obtain a result, not a completed measurement or permission to broaden the assigned question.'}:null;
    if(toolSource&&!pendingRetry&&!operation.revalidateReplyRef){
      assignment={...assignment,inputs:{...assignment.inputs,
        tools:{source:'literal',value:rosterToolContractDirectoryV1(descriptor,{
          evidenceId:toolSource.id,evidenceNumber:toolSource.number})},
        toolContractSource:{source:'evidence',evidenceId:toolSource.id,evidenceNumber:toolSource.number,
          pointer:'',status:'available_unread',bodyRead:false}}};
    }
    if(choiceContract&&!pendingRetry&&!operation.revalidateReplyRef&&assignment.inputs.tools?.value)
      assignment={...assignment,inputs:{...assignment.inputs,tools:{...assignment.inputs.tools,
        value:projectRosterDelegatedToolPresentationV1(assignment.inputs.tools.value,choiceContract)}}};
    const questionRoute=projectRosterWorkflowQuestionRouteV1(assignment.inputs);
    if(!operation.pending&&!operation.revalidateReplyRef){
      const returned=createRosterWorkOrderCapabilityReturnV1({assignment,directory})
        ??createRosterWorkflowAuthorDecisionReturnV1({assignment,directory,route:questionRoute});
      if(returned){
        operation.controlReturns=[...(operation.controlReturns??[]),structuredClone(returned.value.coordination)];
        await control.checkpointOperation(operation);
        return returned;
      }
    }
    let decisionWindow=null;
    if(['roster_workflow_strategy_decision','roster_workflow_local_teach','roster_workflow_experiment_planner'].includes(assignment.role)){
      const teachWindow=assignment.role==='roster_workflow_local_teach';
      const experimentWindow=assignment.role==='roster_workflow_experiment_planner';
      const maximumReadBatches=assignment.inputs.decisionEvidenceBudget?.value?.maximumReadBatches??3;
      if(!Number.isSafeInteger(maximumReadBatches)||maximumReadBatches<1)throw Error('ROSTER_DECISION_EVIDENCE_WINDOW_INVALID');
      let usedReadBatches=0;
      for(const call of operation.calls.slice(Math.max(operation.authorDecisionHandoff?.startedAtCallIndex??0,
        operation.nativeChoiceReadNavigationRecovery?.startedAtCallIndex??0))){
        const prior=await store.get(call.replyRef);if(['read','catalogue'].includes(prior.output?.action))usedReadBatches++;
      }
      decisionWindow={kind:experimentWindow?'experiment_evidence_window':teachWindow?'teach_evidence_window':'decision_evidence_window',version:1,maximumReadBatches,usedReadBatches,
        phase:operation.evidenceDecisionRequired||usedReadBatches>=maximumReadBatches?'synthesize':'read_evidence',
        reason:operation.evidenceDecisionRequired?'repeated_immutable_reads':'bounded_evidence_preparation',
        instruction:designStage
          ?'This is evidence preparation for one comparison DESIGN. After this window author the concrete design and address feedback choices, not a general Teach verdict or a claimed winner. Missing measurements are expected before execution. Read existing sources only; do not run a match or require measured improvement before specifying the test.'
          :experimentWindow
          ?'This is one finite factual-method preparation window, counting both catalogue and source reads, not a total experiment/question limit. Then choose a necessary executable workOrder or an honest cited conclusion/control return. A missing necessary fact is not approved: use blocked for a concrete unavailable capability or strategy_required when a new authorized evidence window/strategic objective is needed. Reuse actual saved successors. Do not restart setup, invent an answer or edit the army/Plan. A following authorized method may read new details; saved reads, calls and fees survive resume.'
          :teachWindow
          ?'This is one finite Teach preparation window, counting both catalogue and body reads, not a total quality/query cap. Then return scoped retain/challenge/investigate proposals with necessary questions and public reasons. Do not approve missing facts or force a Plan edit. A following authorized investigation may retrieve more evidence; successful reads and counters survive resume.'
          :'This is one decision window, not a limit on strategic quality or the entire task. Catalogue and body reads both count as preparation. Then synthesize ONE revise/record_facts/retain/investigate decision. Missing essential information remains an explicit next question, never a fabricated fact. Another investigation requires that decision; the fact role cannot renew itself. Read counters and successful evidence survive cold resume.'};
    }
    // Machine addresses/bindings stay with Host. The model gets navigable names
    // and availability, not dozens of repeated opaque hashes per source.
    const scopedCatalogue=assignment.role==='roster_workflow_experiment_planner';
    const planningCatalogue=assignment.role==='roster_workflow_strategy_decision'||assignment.role==='roster_workflow_local_teach';
    const domainCatalogue=assignment.role==='roster_workflow_final_review'
      &&typeof assignment.inputs.review?.value?.domainId==='string'
      &&assignment.inputs.review.value.requirementClassificationVersion===1;
    const catalogueEnabled=scopedCatalogue||domainCatalogue||planningCatalogue;
    // v2 introduced explicit source indexes; later criteria versions retain
    // that capability. Do not silently restore all-history input on upgrade.
    const sourceReviewVersion=assignment.inputs.review?.value?.experimentalSourceReviewVersion;
    const assignedSourceReview=assignment.role==='roster_workflow_final_review'
      &&Number.isSafeInteger(sourceReviewVersion)&&sourceReviewVersion>=2;
    if(assignedSourceReview&&!pendingRetry&&!operation.revalidateReplyRef){
      const proof=await projectRosterReviewProofContextV1({state:{evidence:assignment.evidenceDirectory,scope:assignment.scope},
        inputs:assignment.inputs,readArtifact:store.get});
      assignment={...assignment,inputs:{...assignment.inputs,reviewProofContext:{source:'literal',value:proof}}};
    }
    const scopedDirectory=catalogueEnabled||assignedSourceReview||assignment.role==='roster_workflow_fact_summary'
      ||assignment.role==='roster_workflow_strategy_decision'&&assignment.inputs.investigationFrontier?.value?.version===1;
    // A fact-method owner may compare source availability; a delegated Native
    // choice must stay on its assigned parent. Do not modify an in-flight or
    // saved request, and never replace the retained read ledger.
    if(scopedCatalogue&&!choiceContract&&!pendingRetry&&!operation.revalidateReplyRef){
      const rootContext=await projectRosterWorkflowRootContextReferenceV1({directory,scope:assignment.scope,store});
      if(rootContext){
        assignment={...assignment,inputs:{...assignment.inputs,currentSourceContext:{source:'literal',value:rootContext}}};
        let added=false;
        for(const selected of rootContext.reads){
          if(operation.reads.some(row=>row.evidenceId===rootContext.sourceEvidenceId&&row.pointer===selected.pointer))continue;
          const read=await control.readEvidence(rootContext.sourceEvidenceId,selected.pointer);
          operation.reads.push({evidenceId:rootContext.sourceEvidenceId,pointer:selected.pointer,
            resultRef:await store.put(read),currentRootContext:true});added=true;
        }
        if(added)await control.checkpointOperation(operation);
      }
    }
    const inheritedDependencies=scopedCatalogue&&!pendingRetry
      ?projectRosterWorkflowRepairDependenciesV1({state:await store.load(),workId:assignment.workId,directory}):[];
    for(const dependency of inheritedDependencies){
      if(operation.reads.some(row=>row.evidenceId===dependency.evidenceId&&row.pointer===dependency.resultPointer))continue;
      const read=await control.readEvidence(dependency.evidenceId,dependency.resultPointer);
      operation.reads.push({evidenceId:dependency.evidenceId,pointer:dependency.resultPointer,resultRef:await store.put(read),
        inheritedDependencyOf:dependency.ownerWorkId});
      await control.checkpointOperation(operation);
    }
    const fetched=[];
    for(const row of operation.reads){
      let result=await store.get(row.resultRef);
      // Reconcile only the known view-address defect from saved immutable
      // evidence. No tool/Provider replay, and the failed read stays auditable.
      if(result.status==='path_missing'&&(row.pointer.startsWith('/receipt/')||/^\/sections\/\d+\/value(?:\/|$)/u.test(row.pointer))){
        const entry=directory.find(e=>e.id===row.evidenceId);
        const body=entry?await store.get(entry.artifactRef):null;
        if(body?.schema==='roster_workflow_receipt_view_v1'){
          const resolved=await control.readEvidence(row.evidenceId,row.pointer);
          if(resolved.status==='read'){
            const previousResultRef=row.resultRef;
            row.resultRef=await store.put(resolved);result=resolved;
            operation.readReconciliations=[...(operation.readReconciliations||[]),
              {evidenceId:row.evidenceId,pointer:row.pointer,previousResultRef,resultRef:row.resultRef,
                reason:'receipt_view_source_address_v1'}];
            await control.checkpointOperation(operation);
          }
        }
      }
      fetched.push({...result,evidenceNumber:directory.find(e=>e.id===row.evidenceId)?.number});
    }
    const readContext=await projectRosterWorkflowReadContextV1({collected:fetched,operation,directory,store,
      assignmentInputs:assignment.inputs,assignmentScope:assignment.scope});
    // The old focused Native command dropped fetched-but-undelivered child
    // navigation. Its duplicate reads consumed the window without exposing any
    // candidate. Recover that exact delivery defect once, preserving paid
    // replies, raw reads and correction history; never grant a source read or
    // execute a query. Normal bounded preparation resumes with the fixed input.
    if(choiceContract?.operation==='native_action'&&decisionWindow&&operation.evidenceDecisionRequired
      &&!operation.nativeChoiceReadNavigationRecovery&&!pendingRetry&&!operation.revalidateReplyRef
      &&readContext.sourceReadNavigation.length&&operation.calls.length){
      const lastCall=operation.calls.at(-1),lastRequest=await store.get(lastCall.requestRef);
      const oldAssignment=lastRequest.promptNodes?.find(n=>n.kind==='workflow_role_assignment');
      if(lastRequest.promptNodes?.some(n=>n.kind==='native_choice_command')
        &&!lastRequest.promptNodes.some(n=>n.kind==='fetched_source_read_navigation')
        &&oldAssignment?.workId===assignment.workId&&hash(oldAssignment.scope)===hash(assignment.scope)){
        operation.nativeChoiceReadNavigationRecovery={version:1,startedAtCallIndex:operation.calls.length,
          originalRequestRef:lastCall.requestRef,originalReplyRef:lastCall.replyRef,
          previousEvidenceDecisionRequired:true,previousConsecutiveCorrections:operation.consecutiveCorrections,
          retainedReadResultRefs:operation.reads.map(row=>row.resultRef),historyReset:false,acceptanceGranted:false};
        operation.evidenceDecisionRequired=false;
        decisionWindow={...decisionWindow,usedReadBatches:0,phase:'read_evidence',reason:'source_navigation_delivery_repaired_once'};
        await control.checkpointOperation(operation);
      }
    }
    const collected=readContext.deliveredReads;
    const directlyRead=e=>Object.values(assignment.inputs).some(i=>i.source==='evidence'&&i.evidenceId===e.id&&i.status==='read')
      ||collected.some(r=>r.evidenceId===e.id&&r.status==='read');
    const catalogueResults=[];
    for(const search of operation.catalogueSearches||[])catalogueResults.push(await store.get(search.resultRef));
    const visibleNumbers=new Set(catalogueResults.flatMap(result=>result.entries.map(entry=>entry.number)));
    // References explicitly assigned by the workflow must remain navigable
    // after catalogue scoping. A source artifact hash is NOT a numeric ID.
    const assignedReferences=projectRosterWorkflowAssignedSourceReferencesV1({inputs:assignment.inputs,directory}).map(e=>({
      evidenceId:e.id,evidenceNumber:e.number,title:e.title,validity:e.validity,
      bodyRead:directlyRead(e)}));
    assignedReferences.forEach(e=>visibleNumbers.add(e.evidenceNumber));
    const publicDirectory=directory.filter(e=>e.validity==='current'
      &&(!scopedDirectory||directlyRead(e)||visibleNumbers.has(e.number))).map(projectRosterCatalogueEntryV1);
    const historicalDirectory=directory.filter(e=>e.validity!=='current'
      &&(!scopedDirectory||directlyRead(e)||visibleNumbers.has(e.number)))
      .map(({number,title,kind})=>({number,title,kind,validity:'historical'}));
    // A storage address is not a correction prompt. Rehydrate the actual paid
    // reply, and tell the role exactly which references it can currently cite.
    const handles=reviewObligationHandles(assignment);
    const authoringSubject=rosterWorkflowAuthoredSubjectV1(assignment);
    const adjudication=assignment.inputs.comparisonAdjudication?.value;
    const scopedClosure=adjudication?.kind==='comparison_adjudication_contract'&&adjudication.version===2;
    const questionInstruction=rosterReviewDataQuestionInstructionV1(authoringSubject,adjudication,assignment.inputs.localObligation?.value);
    const correctionReply=operation.correction?await store.get(operation.correction.originalReplyRef):null;
    // A wire patch is preserved as the paid reply. Rebuild only its execution
    // view against that exact saved request when another local repair is needed.
    let correctionOutput=correctionReply?.output,reviewRepairContinuation=null;
    if(correctionReply){
      const call=operation.calls?.find(c=>c.replyRef===operation.correction.originalReplyRef);
      if(call){
        const saved=await store.get(call.requestRef);
        if(rosterStrategyRepairNodeV1(saved)){
          const patched=projectRosterStrategyRepairOutputV1({request:saved,output:correctionOutput});
          // Standalone typed commands have no prior full-role feedback node.
          // A rejected wire command remains the correction source, not null and
          // not an invented full-role response. Legacy semantic patches retain
          // their actual baseline when present; the paid reply never changes.
          correctionOutput=patched.errors.length?(saved.strategyRepairState?.originalOutput
            ??saved.promptNodes.find(n=>n.kind==='local_contract_feedback')?.originalOutput
            ??correctionReply.output):patched.output;
          if(patched.errors.length&&rosterStrategyRepairNodeV1(saved)?.kind==='review_semantic_repair'){
            const baseline=saved.promptNodes.find(n=>n.kind==='local_contract_feedback');
            // A patch protocol error is NOT a replacement for the source issue
            // that the patch was supposed to fix. Keep both in separate lanes.
            // Nothing in the rejected patch is applied or silently corrected.
            reviewRepairContinuation={errors:structuredClone(baseline.errors),repairAttempt:{version:1,
              originalReplyRef:baseline.originalReplyRef,rejectedReplyRef:operation.correction.originalReplyRef,
              rejectedOutput:structuredClone(correctionReply.output),errors:structuredClone(operation.correction.errors),
              instruction:'The last patch was rejected before application. Repair the original reported check(s), not a new full review. If a source must be read, choose read with checkPatches=[] first; after reading, submit repair with reads=[] and catalogueQueries=[] when supported. The source errors remain unresolved. Do not copy the old invalid evidence set or treat a read as approval.'}};
          }
        }
      }
    }
    const correction=operation.correction?{...operation.correction,feedbackVersion:2,
      originalOutput:correctionOutput,
      ...(reviewRepairContinuation?{repairAttempt:reviewRepairContinuation.repairAttempt}:{}),
      errors:await Promise.all((reviewRepairContinuation?.errors??operation.correction.errors).map(async error=>{
        if(['native_fact_requires_current_executed_receipt','native_fact_source_not_current'].includes(error.code)
          ||error.code==='native_fact_receipt_path_invalid'&&error.sourceSchema==='roster_workflow_receipt_view_v1'){
          const sourceNavigation=await projectRosterNativeFactSourceNavigationV1({entry:directory.find(e=>e.number===error.number),
            pointer:error.pointer,lookupById:id=>directory.find(e=>e.id===id),readArtifact:store.get,currentScope:assignment.scope});
          if(sourceNavigation)return {...error,code:sourceNavigation.diagnosticCode??error.code,
            sourceNavigation,instruction:sourceNavigation.instruction};
        }
        if(error.code==='necessary_fact_has_no_new_material_evidence'){
          const current=await rosterSourceRepairInformationErrorV1({stage:rosterSourceReviewRepairStageV1(assignment.inputs),
            output:correctionOutput,inputs:assignment.inputs,directory,store});
          return current??{code:'additional_native_condition_material_available',priorErrorCode:error.code,
            instruction:'The saved identity-only diagnostic no longer applies: additional Native conditions are now actually delivered for the cited measurement pair. Reassess the original answer against those facts and the actual query settings. Do not keep the old diagnostic as a factual veto, copy the reviewer conclusion blindly or buy duplicate attacks. Nothing is semantically approved; the corrected answer still goes to independent source/coverage review.'};
        }
        if(error.code==='authored_choice_requires_current_plan_source'){
          const question=['decisions','checks','proposals','findings']
            .flatMap(field=>correctionOutput?.[field]??[]).flatMap(row=>row.dataQuestions??[])
            .find(row=>row.question===error.question);
          const current=await store.load();
          if(question)return rosterAuthoredChoiceSourceErrorV1({question,entries:directory,
            draftRevision:current.draftRevision,subject:authoringSubject})??error;
        }
        if(['authored_choice_requires_current_plan_source','authored_choice_requires_assigned_design_source'].includes(error.code))
          return {...error,...rosterAuthoredChoiceRequirementV1({question:error.question,subject:authoringSubject})};
        if(error.code==='author_choice_requires_author_action')
          return {...error,...rosterPendingAuthorChoiceErrorV1(error.questions)};
        if(error.code==='experiment_answer_has_unresolved_necessary_facts')
          return {...error,...rosterExperimentUnresolvedFactsErrorV1(correctionReply.output.unresolvedQuestions)};
        if(error.code==='experiment_conclusion_requires_conclude_action')
          return {...error,...experimentOperationChoiceError(correctionReply.output)};
        if(error.code==='evidence_not_read'&&error.requiredPointer||error.code==='choice_menu_source_has_no_menu'){
          const choice=savedChoiceForError(correctionReply.output,error);
          if(choice)return choiceMenuSourceError({...choice,directory,store,assignment});
        }
        if(error.code==='supported_review_requires_evidence')return {...error,
          allowedMissingEvidenceVerdict:'needs_evidence',
          instruction:'supported/conditional requires a real read source number. If a source exists, read it explicitly; do not invent citations. If the necessary source/result is not yet available, use needs_evidence with the concrete necessary_fact question and actual available citations (possibly none), so the fact owner can query it. A missing source is not supported merely because the claim describes uncertainty. This return does not approve the claim or Plan.'};
        return error;
      })),
      ...(correctionReply.providerFailure?{failedProviderText:correctionReply.providerFailure.rawText,
        parserDiagnostic:providerSyntaxDiagnostic(correctionReply.providerFailure.rawText),
        providerFailureInstruction:'The completed response contains an actual JSON syntax error; use parserDiagnostic, not a generic schema guess. Repair this local reply and preserve the selected operation/choices and public reasons. Return the actual role object, not the schema. Saved evidence remains available; do not invent facts.'}:{}),
      readableCitations:directory.filter(directlyRead).map(({number,title})=>({number,title})),
      instruction:[operation.correction.instruction,
        'Repair the supplied originalOutput, not the whole workflow. For evidence_not_read, issue an explicit read first, or cite the delivered Teach proposal as a proposal instead of claiming its underlying source was read. Do not silently delete necessary factual support. For one_joint_decision_per_revision, synthesize ONE next strategic operation, not a list of Teach proposals.'].filter(Boolean).join('\n')}:null;
    if(correction?.errors.some(error=>error.code==='author_choice_requires_author_action')){
      correction.feedbackVersion=7;
      correction.diagnosticProjection={version:1,source:'current_shared_author_resolution_contract',
        originalReplyPreserved:true,classificationChanged:false,retryBudgetChanged:false};
    }
    if(correction?.errors.some(error=>error.sourceNavigation?.version===1))correction.feedbackVersion=17;
    if(correction?.errors.some(error=>error.sourceNavigation?.kind==='native_receipt_view_source'))correction.feedbackVersion=18;
    if(correction?.errors.some(error=>error.sourceNavigation?.kind==='host_projection_scope_only'))correction.feedbackVersion=21;
    if(handles&&correction){
      correction.originalOutput=structuredClone(correction.originalOutput);
      if(Array.isArray(correction.originalOutput?.checks))for(const check of correction.originalOutput.checks)
        check.checkId=handles.byId.get(check.checkId)??check.checkId;
      correction.errors=correction.errors.map(error=>{
        if(error.checkId)error={...error,checkId:handles.byId.get(error.checkId)??error.checkId};
        if(error.code!=='review_obligation_coverage')return error;
        correction.feedbackVersion=3;
        const received=(error.received??[]).map(id=>handles.byId.get(id)??id),required=handles.entries.map(row=>row.handle);
        return {code:error.code,required,received,missing:required.filter(id=>!received.includes(id)),
          duplicates:[...new Set(received.filter((id,index)=>received.indexOf(id)!==index))],
          instruction:'Correct the identified missing/duplicate short choices against their full questions. Do not copy the long historical work IDs, silently drop obligations, reuse a verdict for a different question, or fabricate evidence. Each question needs its own honest check.'};
      });
    }
    const retainedMenuIssues=operation.choiceMenuReadRequirement?.issues
      ??correction?.errors.filter(error=>error.code==='choice_menu_source_has_no_menu')??[];
    // Re-derive navigation from the original selected operation on cold resume.
    // Persisted generic "inspect" advice must not override the source contract.
    const menuIssues=await Promise.all(retainedMenuIssues.map(async issue=>{
      const choice=savedChoiceForError(correctionOutput,issue);
      return choice?await choiceMenuSourceError({...choice,directory,store,assignment}):issue;
    }));
    const unmetMenus=assignment.role==='roster_workflow_experiment_planner'
      ?menuIssues.filter(issue=>issue?.code==='choice_menu_source_has_no_menu'
        &&!matchingChoiceMenuDelivered(issue,[...collected,
          ...Object.values(assignment.inputs).filter(input=>input.source==='evidence')],directory)):[];
    const menuPreparationRequirement=unmetMenus.filter(issue=>issue.producer&&!issue.availableSavedMenus?.length);
    const menuReadRequirement=unmetMenus.filter(issue=>!menuPreparationRequirement.includes(issue));
    if(unmetMenus.length){
      operation.choiceMenuReadRequirement={version:2,issues:structuredClone(unmetMenus)};
      if(menuReadRequirement.length&&decisionWindow&&decisionWindow.phase!=='synthesize'){
        decisionWindow.phase='required_source_read';decisionWindow.reason='known_menu_requires_actual_delivery';}
    }else delete operation.choiceMenuReadRequirement;
    const geometryDecision=assignment.role==='roster_workflow_experiment_planner'
      ? await projectRosterGeometryDecisionContextV1({assignment,store}):null;
    const acceptanceStage=rosterWorkflowAcceptanceStageV1(assignment);
    const comparisonValidity=rosterComparisonValidityContractV1(assignment);
    const planAuthoring=rosterWorkflowPlanAuthoringContractV1(assignment);
    const sourceRepairStage=assignment.role==='roster_workflow_experiment_planner'
      ?rosterSourceReviewRepairStageV1(assignment.inputs):null;
    const sourceConditionProgress=sourceRepairStage?await projectRosterSourceConditionProgressV1({
      stage:sourceRepairStage,inputs:assignment.inputs,directory,store}):null;
    const teachSubject=assignment.role==='roster_workflow_local_teach'&&!isRosterComparisonDesignStageV1(assignment)?projectRosterWorkflowTeachSubjectV1({
      draftEvidenceId:assignment.inputs.draft?.evidenceId??assignment.inputs.draft?.id,directory}):null;
    // Cold-resumed queued checkpoints predate the explicit original-input
    // handoff. Re-project their ROOT assignment without editing saved jobs or
    // pretending navigable source references have already been read.
    const legacyOriginal=assignment.role==='roster_workflow_strategy_decision'
      &&assignment.inputs.investigationFrontier?.value?.goalId&&!assignment.inputs.originalInvestigationScope
      ?projectRosterOriginalInvestigationInputsV1({state:await store.load(),goalId:assignment.inputs.investigationFrontier.value.goalId}):null;
    const legacyAssignments=legacyOriginal?Object.fromEntries(Object.entries(legacyOriginal)
      .filter(([key])=>key!=='originalInvestigationScope').map(([key,input])=>{
        if(input.source==='literal')return [key,{source:'literal',value:input.value}];
        const id=input.source==='evidence'?input.id:'role:'+input.id,entry=directory.find(e=>e.id===id);
        return [key,{source:input.source,evidenceId:id,evidenceNumber:entry?.number??null,
          pointer:input.pointer??'',status:entry?'available_unread':'not_in_current_directory',bodyRead:false}];
      })):null;
    const delegatedScenes=assignment.role==='roster_workflow_experiment_planner'
      ?await projectRosterWorkflowDelegatedScenesV1({state:await store.load(),workId:assignment.workId,
        readArtifact:ref=>store.get(ref)}):[];
    const investigationContinuation=assignment.role==='roster_workflow_strategy_decision'
      ?await projectRosterInvestigationContinuationV1({state:await store.load(),workId:assignment.workId,
        readArtifact:ref=>store.get(ref)}):null;
    const incomingAuthor=projectRosterIncomingAuthorContextV1(assignment);
    let sourceConfirmation=null;
    if(operation.evidenceDelivery){
      const originalReplyRef=operation.evidenceDelivery.originalReplyRef;
      const sourceCall=operation.calls.findLast(call=>call.replyRef===originalReplyRef);
      if(!sourceCall?.requestRef)throw Error('ROSTER_WORKFLOW_SOURCE_CONFIRMATION_CALL_MISSING');
      const [sourceRequest,sourceReply]=await Promise.all([store.get(sourceCall.requestRef),store.get(originalReplyRef)]);
      // Saved replies keep their real wire format. Reuse the ORIGINAL mapper
      // and ledger before presenting them as a pending domain proposal.
      const projected=projectRosterStrategyRepairOutputV1({request:sourceRequest,output:sourceReply.output});
      if(projected.errors.length)throw Object.assign(Error('ROSTER_WORKFLOW_SOURCE_CONFIRMATION_PROJECTION_INVALID'),
        {detail:{originalReplyRef,errors:projected.errors}});
      sourceConfirmation={originalReplyRef,sourceRequestRef:sourceCall.requestRef,
        proposalProjection:'original_request_mapper',pendingProposal:projected.output};
    }
    const promptNodes=[{kind:'workflow_role_assignment',workId:assignment.workId,role:assignment.role,
      scope:assignment.scope,inputs:incomingAuthor?.inputs??handles?.inputs??assignment.inputs,acceptanceGranted:false},
      ...(incomingAuthor?[incomingAuthor.node,{kind:'historical_assignment_context',version:1,
        assignments:incomingAuthor.history,currentRoleRestrictions:false,
        instruction:'Immutable prior-role tasks/proposals only. Their questions and comparison scope remain relevant; their role-specific prohibitions and old answers are NOT the current strategic author instructions. No old proposal or source classification is automatically approved.'}]:[]),
      {kind:'workflow_input_delivery',version:ROSTER_WORKFLOW_INPUT_DELIVERY_VERSION_V1,
        instruction:'Large original sources remain available by exact pointers. Directories are navigation and explicit Native result fields, not unread-body approval or new experiments.'},
      ...(toolContractScope?[toolContractScope]:[]),
      ...(investigationContinuation?[{kind:'investigation_continuation_contract',...investigationContinuation}]:[]),
      ...(choiceContract?[{kind:'pending_operation_choice_contract',...choiceContract}]:[]),
      ...(delegatedScenes.length?[{kind:'delegated_scene_identities',scenes:delegatedScenes,
        instruction:'These complete stateRef values identify the exact inputs of your pending caller, not successful geometry or strategy. Reuse the whole reference when repairing/querying that same scene. Host preserves its candidate qualifier if only that exact branch is retained; it does not choose a new scene, change assumptions, apply an option or widen your task. Explicit changes require an explicit whole stateRef. Return to the parent after completing the delegated operation; downstream measurements remain parent-owned.'}]:[]),
      ...(authoringSubject?[{kind:'authored_choice_subject',subject:authoringSubject}]:[]),
    ...(readContext.auditedCandidateApplicability.length?[{
      kind:'audited_candidate_applicability',entries:readContext.auditedCandidateApplicability,
      sourceIdentityOnly:true,modelDecisionRewritten:false,acceptanceGranted:false,
    }]:[]),
    ...(questionRoute?[{kind:'typed_question_route',route:questionRoute.kind,
      factualQuestions:questionRoute.facts,authorDecisions:questionRoute.authorDecisions,
      instruction:'These lanes reflect explicit classifications, not Host factual judgments. Resolve only factualQuestions in a fact role; authorDecisions remain pending for the strategic author and are not tool queries. A missing rule, payment, geometry or adopted numerical premise stays a necessary fact. No lane grants release.'}]:[]),
     ...(handles?[{kind:'review_obligation_handles',version:2,
      instruction:'Short checkId handles identify exactly the supplied questions, not evidence or verdicts. Host maps them back to the immutable original obligations; causal history is retained outside this choice payload.'}]:[]),
    rosterWorkflowDraftLifecycleV1(),
    {kind:'citation_read_recovery_contract',version:2,
      instruction:'Valid sources explicitly cited in a pending proposal may be read mechanically before correction, even when other semantic errors coexist. Reading does not approve the proposal or resolve the other errors. Confirm or revise against the returned source bodies; historical candidates are not the current submitted army. No tool experiment or match is replayed.'},
    ...(assignment.role==='roster_workflow_experiment_planner'?[{kind:'selected_native_menu_read_contract',version:3,
      instruction:'Native finite/domain/formation selectors and current-domain spatial queries use the SAME exact execution resolver (read-only spatial selection has empty execution parameters). Finite match accepts the observed outer candidateId or proposal.actionKey as actionKey, plus exact action fields; domain uses its actual domainId. Match exact IDs, not display-name aliases. Read the selected menu ENTRY at its exact JSON Pointer, then confirm; the entire actionSpace/list is not required. A directory identifies choices but is not their parameter body or legal outcome. Wrong selectors get actual matchable availableIdentities, never a guessed Host substitution.'}]:[]),
    ...(teachSubject?[teachSubject]:[]),
    ...(acceptanceStage?[acceptanceStage]:[]),
    ...(comparisonValidity?[comparisonValidity]:[]),
    ...(planAuthoring?[planAuthoring]:[]),
    ...(designStage?[designStage]:[]),
    ...(sourceRepairStage?[sourceRepairStage]:[]),
    ...(sourceConditionProgress?.additionalMaterial?[sourceConditionProgress]:[]),
    ...(Object.values(assignment.inputs).some(i=>i.scopeUsage==='historical_reference')?[{kind:'historical_reference_inputs',
      entries:Object.entries(assignment.inputs).filter(([,i])=>i.scopeUsage==='historical_reference')
        .map(([inputKey,i])=>({inputKey,evidenceId:i.evidenceId,validity:i.validity,originalBindings:i.originalBindings,
          currentApplicability:i.currentApplicability})),
      instruction:'These inputs were explicitly assigned for READ-ONLY historical comparison. Their original versions/bindings remain attached; being readable does not make an old Plan, interpretation or source a current fact or Native execution dependency. Compare against the current draft and current source scope; explain applicability rather than silently treating history as current truth.'}]:[]),
    ...(legacyOriginal?.originalInvestigationScope?[{kind:'original_investigation_assignment',
      scope:legacyOriginal.originalInvestigationScope.value,assignments:legacyAssignments,
      claimsAreRulesTruth:false,sourceReferencesCountAsReads:false,originalSavedInputsUnchanged:true}]:[]),
    ...(assignment.role==='roster_workflow_experiment_planner'?[{kind:'experiment_followup_contract',version:1,
      instruction:ROSTER_EXPERIMENT_FOLLOWUP_INSTRUCTION_V1,hostMayReclassify:false,acceptanceGranted:false}]:[]),
    ...(assignment.role==='roster_workflow_experiment_planner'?[{kind:'hypothesis_assessment_ownership_contract',version:2,
      assignedDesignCount:assignedHypothesisDesigns(assignment).size,
      taskScope:assignment.inputs.activeHypothesisTests?.value?.taskScope??null,
      instruction:'Assess only designs explicitly owned by this task. A context_only parent design explains purpose, not another question you must resolve. A fact_method may finish its local question with hypothesisAssessments=[] while the parent comparison remains pending. Design sources and observations have separate entries in assetCatalogue; an ordinary observation cannot be the declared design. Do not copy a parent hypothesis into supporting menu/geometry work: use hypothesisTest=null and return the local facts. Reading or repairing a child never approves its parent. Owned comparison results still require source fidelity and coverage review.'}]:[]),
    ...(['roster_workflow_experiment_planner','roster_workflow_strategy_decision','roster_workflow_local_teach'].includes(assignment.role)
      ?[rosterHypothesisLoopContractV1()]:[]),
    ...(operation.readPreparationReturnRequired&&!menuReadRequirement.length?[{kind:'read_preparation_return',
      reason:operation.readPreparationReturnRequired.reason,
      requestedReads:operation.readPreparationReturnRequired.requestedReads??[],
      requestedCatalogueQueries:operation.readPreparationReturnRequired.requestedCatalogueQueries??[],
      instruction:'The exact immutable responses are already delivered; repeating a read is not a failed game operation. This preparation phase must now produce a scoped decision, experiment or honest control return. Missing/error paths remain missing, not facts. A next method/strategy-authorized investigation can read new detail; this is not a permanent ban on queries or approval of any unknown.'}]:[]),
    ...(decisionWindow?[decisionWindow]:[]),
    ...(inheritedDependencies.length?[{kind:'inherited_experiment_dependencies',bindings:inheritedDependencies.map(dependency=>{
      const read=collected.find(row=>row.evidenceId===dependency.evidenceId&&row.pointer===dependency.resultPointer);
      return {...dependency,status:read?.status??'not_read',value:read?.value??null};}),
      provesSourceExistsOnly:true,selectedParentValidated:false,
      instruction:'These are the original inputs of the FAILED operation, not an endorsement of the selected parent or action. Their source reads succeeded; the action did not. Reuse a dependency only if the failure and intended question show it is the correct source. For a wrong-parent/domain failure, read the intended original inspect/menu rather than repeatedly binding the rejected parent. Changing the chosen scene remains the model decision, not a Host substitution. Use exact saved references; do not recreate a successful source or infer hashes from prose.'}]:[]),
    ...(geometryDecision?[{kind:'current_experiment_geometry_decision',...geometryDecision}]:[]),
    ...(assignment.role==='roster_workflow_strategy_decision'?[{kind:'draft_edit_contract',
      unitsToUpsert:'Keyed unit edits; other units remain unless explicitly removed.',
      rosterBranchSelection:'For an exact Builder branch choose {sourceEvidenceNumber,branchId}; read its candidatePointer first. unitsToUpsert=[], unitIdsToRemove=[], tacticalCardRecordKeys=null. Host uses that immutable candidate and rechecks it. Use null for deliberate explicit edits instead of claiming to adopt a different branch.',
      rosterCandidateSelection:'For an exact saved builder_audit/candidate_context choose {sourceEvidenceNumber} after reading its complete candidatePointer. Set rosterBranchSelection=null and unit/card edits empty/null. Host copies every selection and rechecks with current Builder; the old audit is only provenance. Do not claim exact adoption while retyping a different army.',
      planArrays:'Every non-null Plan array REPLACES the whole section. To edit one member, include unchanged members too; null preserves the whole section. This differs from unitsToUpsert.',
      referenceEdges:[
        {from:'opponentHypotheses[].ownCounterResponseIds[]',to:'counterResponses[].responseId',error:'ROSTER_PLAN_HYPOTHESIS_RESPONSE_LINK_UNKNOWN',
          meaning:'An existing hypothesis names a response omitted from the replacement response list; the suffix is the missing RESPONSE id, not a bad hypothesis id.'},
        {from:'counterResponses[].linkedHypothesisIds[]',to:'opponentHypotheses[].hypothesisId'},
        {from:'deploymentConcept.activationOrder[].unitInstanceId',to:'candidateInput.units[].unitInstanceId'},
      ],instruction:'Check both directions on the merged result. Do not fix a missing target by rewriting an unrelated edge. Retrieve the current array to preserve its other members.'}]:[]),
    ...(assignment.role==='roster_workflow_strategy_decision'?[{kind:'selected_candidate_read_contract',version:1,
      instruction:'Selecting a saved exact candidate requires its actual full candidate body, not just its budget verdict. If the chosen original body was not delivered, Host retrieves that exact source/pointer and returns for YOUR confirmation or revision before any mutation. This is a read prerequisite, not candidate adoption, strategic approval or a new Builder experiment. Native/Builder rechecks still apply after your confirmed edit.'}]:[]),
    ...(assignment.role==='roster_workflow_strategy_decision'?[{kind:'strategic_edit_or_evidence_record',version:1,
      instruction:'Choose revise only when selected army or actual strategic intent/adopted premise changes: name the before/after intentPath and decisionConsequence in strategicChanges. A new private Native snapshot, source handle or mechanical progress note alone is record_facts with mutation=null and strategicChanges=[]; it is saved in a queryable evidence record without bumping Plan revision or retiring other investigations. Private hypothetical actions are not live match history. Use retain for an unchanged strategy with reasons, investigate for a necessary specific next question; both have mutation=null and strategicChanges=[]. Preserve necessary requiredData in every lane. This distinguishes state bookkeeping from strategy; it does not force an army edit, weaken factual gates or certify a better strategy.'}]:[]),
    ...(assignment.role==='roster_workflow_strategy_decision'?[{kind:'strategic_question_lanes',version:4,
      partialChoicesCanCoexistWithInvestigation:true,
      instruction:questionInstruction+' '+ROSTER_DECIDED_HERE_INSTRUCTION_V1,
      output:'dataQuestions is the model-owned classification. Host derives requiredData from unresolved necessary_fact and requiredDecisions from pending author_decision. Use authored_choice for an ALREADY declared current Plan intent with its actual Plan source and conditions; this is not a measurement or automatic strategic approval. Preserve an original factual question already answered by read sources as answered_fact, giving its answer in publicReason and sources in that question evidenceNumbers. Host derives the parent review-source union; no duplicated citation-list maintenance. This does not approve the answer or skip independent review. Future_condition/optional_probe remain separate. A possible future quantitative claim does not demand an immediate experiment. Historical replies stay immutable; genuinely missing current facts remain necessary.'}]:[]),
    ...(operation.authorDecisionHandoff?[{kind:'strategy_author_handoff',version:1,
      questions:operation.authorDecisionHandoff.questions,
      priorRejectedDecision:operation.authorDecisionHandoff.previousDecision,
      sourceReplyRef:operation.authorDecisionHandoff.sourceReplyRef,
      instruction:'YOU are the strategic owner receiving these choices, not the correction formatter. Make one fresh retain/revise/investigate decision against currentArmyAuthority and the whole current Plan. The old decision is rejected, including its factual assertions; the old classifications are provisional. Preserve every original question exactly once, but explicitly re-evaluate it. Retain is a real decision and requires no no-op mutation. Use decided_here to state the choice you make NOW and its evidence/trade-off, not to approve an unresolved fact. If evidence truly prevents a choice, identify and authorize the precise necessary_fact. Do not delegate to an unnamed other owner or repeat the whole experiment. A current partial roster remains partial even if an unadopted candidate was audited at full budget. '+ROSTER_DECIDED_HERE_INSTRUCTION_V1}]:[]),
    {kind:'citation_access',directlyReadEvidenceNumbers:directory.filter(directlyRead).map(e=>e.number),
      instruction:'These evidence numbers have actually been delivered to THIS role. A Teach proposal may cite other sources, but its citation does not mean you read that original source. Cite the Teach as a proposal, or explicitly read the original before asserting its content.'},
    {kind:'available_evidence_directory',entries:publicDirectory,
      instruction:'The directory is not the evidence body. Available_unread means present and retrievable. Select read with exact evidenceNumber and JSON Pointer (empty string reads the complete artifact). Missing exact fields do not make the artifact missing. You may request several independent reads together.'},
    ...(assignedReferences.length?[{kind:'assigned_evidence_references',entries:assignedReferences,
      instruction:'These are exact current numeric handles for evidence IDs explicitly referenced by your assigned task. Use evidenceNumber for reads; never convert an artifact hash or work name into a number. This mapping is metadata, not an implicit body read. Other evidence remains searchable.'}]:[]),
    ...(catalogueEnabled?[{kind:'evidence_catalogue_search',...describeRosterWorkflowCatalogueV1(directory)},
      {kind:'catalogue_search_results',results:catalogueResults}]:[]),
    ...(historicalDirectory.length?[{kind:'historical_evidence_directory',entries:historicalDirectory,
      instruction:'Archived version comparison only. Exact reads remain available, but these artifacts are not current-scope facts. Active and archived numbers share the same stable directory.'}]:[]),
    {kind:'exact_read_results',results:readContext.exactReads,
      instruction:'Each result carries the same evidenceNumber you selected. status=read is the exact delivered body; do not request that same pointer again. A nextPage object is query arguments, not the next page result: request an investigation using those arguments to execute the next query. A repeated immutable read cannot execute a tool.'},
    ...(operation.lastReadProgress?[{kind:'immutable_read_progress',...structuredClone(operation.lastReadProgress),
      instruction:'Incremental source-preparation receipt, not a factual conclusion. alreadyDelivered entries were exact bodies in the request you answered; notDelivered entries were not covered then, and their current results/statuses are in exact_read_results. Earlier successful reads remain saved even when omitted from your next command. Request only a genuinely missing detail or choose the next authorized operation. A reply requesting only already delivered bodies stops this work; it does not buy another correction turn or approve the question.'}]:[]),
    ...(operation.workOrderEditPreparation?[{kind:'work_order_edit_preparation',...structuredClone(operation.workOrderEditPreparation),
      instruction:'UNCONFIRMED incremental proposal, not an executed method. Use the actual read statuses/results to confirm or patch it; omission preserves pending steps. Read failures are not facts, and source reads do not validate the proposed arguments. The same compiler and Native checks still apply. You may conclude strategy_required/blocked with evidence instead; that does not approve this proposal or the Plan.'}]:[]),
    ...(sourceConfirmation?[{kind:'evidence_delivery_handoff',version:2,...sourceConfirmation,
      conclusionAccepted:false,
      instruction:'Normal tool-to-author handoff, not an output error. The sources requested/cited by the pending proposal are now delivered in exact_read_results with their actual statuses. Decide using those results and the CURRENT responseFormat operation, not the saved wire envelope. If another specific source is necessary use read. Missing or contradictory evidence is not approval. Any separate local_contract_feedback still requires repair. No new experiment or broader question is authorized by this handoff.'}]:[]),
    ...(readContext.sourceReadNavigation.length?[{kind:'fetched_source_read_navigation',version:1,
      entries:readContext.sourceReadNavigation,wholeRequestedBodyDelivered:false,
      instruction:'Large requested JSON bodies are split into EXACT children in exact_read_results. The listed large sections remain saved/retrievable but are NOT delivered. Read only necessary child pointers. A partially delivered parent is not an entire source read; do not assume unshown misses/actions are absent. This delivery partition does not change the factual question, authorize a new experiment, spend a rules query, or approve a conclusion.'}]:[]),
    ...(readContext.previousSourceFacts.length?[{kind:'previously_delivered_source_facts',sources:readContext.previousSourceFacts,
      instruction:'These Native originals were actually delivered in a prior COMPLETED request of THIS role. This repeat context is the shared deterministic source-fact projection, NOT the complete original body or a new LLM summary. It preserves measured scalars, COMPLETE small sections in receiptStructures, per-attacker outcomes, precision, uncertainty, optional-effect exclusions and source detail pointers. New reads remain full in exact_read_results. For an omitted necessary detail, read the ORIGINAL evidenceNumber at its exact pointer; do not treat an omitted detail as absent or zero, and do not infer causal benefit from a sampled delta. Saved raw read results and prior requests are unchanged; citation access is not revoked.'}]:[]),
    ...(readContext.nativeMeasurements.length?[{kind:'registered_native_measurement_supplements',sources:readContext.nativeMeasurements,
      instruction:'Deterministic measurements from the REGISTERED originals behind assigned/read legacy indexes. receiptStructures preserves complete small sections that old indexes reduced to counts; other sections remain exact-readable by sourceEvidenceNumber and pointer. This is scoped query data, not a full-original read, an executed action, an approved claim or an LLM conclusion. Preserve original state/context/source ownership and conditions. Old views and paid requests are unchanged; do not treat omitted geometry as absent or transfer measurements between states.'}]:[]),
    ...(readContext.nativeSources.length?[{kind:'conditional_native_action_evidence',sources:readContext.nativeSources,
      instruction:'Deterministic supplement from registered originals of sources actually assigned/read here, including old immutable views/projections. It supplies the actual Native action, spatial checks and events omitted by older compact views, not an LLM conclusion or a full-original read. Conditional accepted transitions are distinct from static placement and complete legal match history. Do not demand that the laboratory flag provenArrivalHistory become true; do not infer other endpoints, units, route segments or future scores. Cite the delivered source/view scope and read omitted necessary details explicitly. No question or Plan is approved by this supplement.'}]:[]),
    ...(readContext.sourceRecords.length?[{kind:'registered_source_record_supplements',sources:readContext.sourceRecords,
      instruction:'These complete non-Native records come from the REGISTERED originals behind the assigned/read legacy views. The old views were Native-only indexes and did not display top-level source abilities/stats; that omission was not absence in the official record. Read projection.sourceRecord and its actual sourceKind, sourceArtifactRef and conditions. This is exact Host delivery, not an LLM summary, rewritten historical input, source approval or another game action. Model/Plan proposals remain proposals; official source fields remain frozen. Existing citation/read rules still apply. New views already carrying sourceRecord and direct original reads are not duplicated.'}]:[]),
    ...(menuReadRequirement.length?[{kind:'required_choice_menu_read',issues:menuReadRequirement,
      instruction:'A known existing menu must actually be delivered before selecting. Read the exact registered result of its specified producer, or conclude with an accurate scoped control return. workOrders=[] until matching content is delivered. The ordinary finite read window still applies; repeated path_missing/stateRef reads cannot reopen it. No setup/action replay or army/Plan edit is authorized.'}]:[]),
    ...(menuPreparationRequirement.length?[{kind:'required_choice_menu_preparation',version:1,issues:menuPreparationRequirement,
      instruction:'The selected source lacks the requested menu and no matching original has been located. This is NOT an endless read-only stage. Within the existing read window retrieve a saved result if known; otherwise finish with ONLY a preparation workOrder for the specified producer on the intended saved state, or conclude with a precise unresolved control return. Inspect does not produce static formationOptions. Supply your own authorised query parameters; Host chooses no placement or strategy. Leave completionStepId empty and wait for the result before any formation_scene/native_action/measurement. No already completed setup/action is replayed and no missing fact is approved.'}]:[]),
    ...(correction?[{kind:'local_contract_feedback',...correction}]:[])];
    const isTeach=assignment.role==='roster_workflow_local_teach';
    const isComparisonDesign=isRosterComparisonDesignStageV1(assignment);
    const isExperiment=assignment.role==='roster_workflow_experiment_planner';
    const closedMethodReturn=isExperiment&&assignment.inputs.scopedStrategyReturn?.value?.closedNoProgressMethod===true;
    const isDecision=assignment.role==='roster_workflow_strategy_decision';
    const isReview=assignment.role==='roster_workflow_final_review';
    // All NEW review requests use the same question lanes, including atomic
    // source/ability checks. Exact pending retries restore their saved schema
    // below; their old replies are neither rewritten nor silently classified.
    const classifiedReview=isReview;
    const decisionField=readRoleDecisionField(assignment.role);
    let contract=isReview?(domainCatalogue?domainReviewCatalogueContract:classifiedReview?ROSTER_WORKFLOW_CLASSIFIED_REVIEW_CONTRACT_V1:ROSTER_WORKFLOW_FINAL_REVIEW_CONTRACT_V1):isDecision?(decisionWindow?.phase==='synthesize'?decisionSynthesisContract:ROSTER_WORKFLOW_STRATEGY_DECISION_CONTRACT_V1):isExperiment?(decisionWindow?.phase==='synthesize'?experimentSynthesisContract:ROSTER_WORKFLOW_EXPERIMENT_CONTRACT_V1):isTeach?(decisionWindow?.phase==='synthesize'?teachSynthesisContract:ROSTER_WORKFLOW_LOCAL_TEACH_CONTRACT_V1):ROSTER_WORKFLOW_READ_ROLE_CONTRACT_V1;
    if(isReview&&assignment.inputs.comparisonPremises?.value)contract=comparisonPremiseReviewContract;
    if(isComparisonDesign)contract=decisionWindow?.phase==='synthesize'
      ?comparisonDesignSynthesisContract:ROSTER_WORKFLOW_COMPARISON_DESIGN_CONTRACT_V1;
    if(operation.readPreparationReturnRequired){
      const name=isComparisonDesign?'comparison_design_preparation_return':isExperiment?'experiment_preparation_return':isReview?'review_preparation_return':isDecision?'decision_preparation_return':isTeach?'teach_preparation_return':'fact_preparation_return';
      contract=makeContract(name,obj({...contract.providerSchema.properties,action:{...str,enum:isExperiment?['finish','conclude']:['finish']}}),
        isExperiment?ROSTER_WORKFLOW_EXPERIMENT_CONTRACT_V1.version:isDecision?ROSTER_WORKFLOW_STRATEGY_DECISION_CONTRACT_V1.version:isTeach?ROSTER_WORKFLOW_LOCAL_TEACH_CONTRACT_V1.version:'1.0.0');
    }
    if(menuReadRequirement.length)contract=makeContract('experiment_menu_source_read',obj({
      ...ROSTER_WORKFLOW_EXPERIMENT_CONTRACT_V1.providerSchema.properties,
      action:{...str,enum:decisionWindow?.phase==='synthesize'?['conclude']:['read','catalogue','conclude']}}),'2.2.0');
    let providerSchema=contract.providerSchema;
    let request={sessionId,roundKind:assignment.role,roundIndex:operation.turn+1,promptPack:'roster_scoped_workflow_v1',promptNodes,
      userMessage:`Complete only the assigned question. Choose read to retrieve necessary evidence (${decisionField} must be empty), or finish with scoped ${isDecision?'exactly one decision: revise actual strategic intent with structured mutation arguments and strategicChanges; record_facts without a Plan edit; retain with a strategic reason; or investigate a specific remaining question':isExperiment?'explicit executable experiment workOrders; describe any unaddressed question in unresolvedQuestions':isTeach?'Teach proposals: retain, challenge or investigate, with alternatives and disconfirmation conditions':'findings'} (reads must be empty). ${isDecision?'Null Plan fields preserve existing sections; arrays replace one section. No model-owned versions, legality, totals or receipts. Changes remain drafts until Teach and final checks. Consider the whole current strategic intent, but retrieve only relevant detailed blocks.':isExperiment?'Use the supplied laboratory argument shapes. ArgumentsJson is the actual tool input object, not a fabricated answer. Bind prior-step receipt fields with exact JSON Pointers; do not add dependencies without data. No queryId/branchId; Host owns those.':isTeach?'Do not repeat a fact-summary list instead of doing Teach. Criticism is not a compulsory edit; retaining a conditional strategy with reasons is valid.':''} A claim about receipt contents must cite an artifact you actually read or received inline. Evidence unavailable in your current prompt is not globally absent. Interpretations/proposals are not Rules facts. Give public reasons, not private reasoning.`,
      responseContract:{allowedChannels:['roster_strategy'],publicEvidenceOnly:true,rulesRemainSoleLegalityAuthority:true},
      responseFormat:{kind:'provider_strict_json_schema',schemaName:contract.schemaName,
        outputContractRef:outputContractRefStarcraftTmgV1(contract),schema:contract.providerSchema},
      contextHash:hash({workId:assignment.workId,role:assignment.role,promptNodes,contract:contract.contractHash})};
    if(isReview)request.userMessage='Review only the supplied obligations. Read exact necessary evidence first (checks empty), or finish with exactly one check per obligation checkId (reads empty). supported requires actual source evidence; conditional is for an explicitly justified future contingency, never an untested rules, map, payment or probability claim. Use needs_evidence or requires_revision for missing proof or a false claim. Preserve every necessary unresolved fact in requiredData regardless of the verdict label; the host routes these gaps to investigation and cannot release them. Never clear requiredData merely to satisfy a verdict label. Optional improvements are not necessary missing facts: explain that distinction. Preserve reasonable risks and reject unsupported allegations. Do not change the army or Plan. Public reasons only.';
    if(isComparisonDesign)request.userMessage='This is experiment PURPOSE/DESIGN before execution, not general Teach or a verdict about which choice wins. Read the assigned sources/capability catalogue as needed (proposals empty), then finish with EXACTLY ONE proposal containing comparisonPurpose (reads and catalogueQueries empty). '+designStage.instruction+' Select ONE meaningful comparison from the original Teach or justify a concrete re-scope. expectedBenefit states an unmeasured direction/metric; numbers require actually read evidence and explicit hypothetical conditions, never an invented measured gain. mechanismSteps must reach observationEndpoint AFTER the mechanism can create value. meaningfulDifference says what result would change the choice, not a Host score. Specify both decision consequences and invalidation conditions. Correct author_decision feedback by making the missing design choice; requesting the same author choice again is not a revision. Army/Plan remains unchanged by this role. Public reasons only.';
    if(authoringSubject)request.userMessage='Review only the assigned PRE-EXECUTION checks. Validate frozen premises and executable bounded conditions, not final strategy or post-observation adoption. Read exact necessary sources, then return one check per checkId. The exact proposedDesign, not the battle Plan, owns hypothetical declarations. Retain real missing measurement inputs or capabilities. A result is not required before running the test, and the eventual roster winner remains a future_condition. Do not invent results, edit the Plan or approve a full-match rehearsal. Public reasons only.';
    if(isReview&&scopedClosure)request.userMessage='Review only the supplied OPTIONAL-COMPARISON CLOSURE checks. Read exact necessary sources first (checks empty), or finish with one check per supplied checkId (reads empty). Judge the actual decisionBasis and whyNoFurtherEvidenceNeeded, not merely whether their quoted numbers exist. Use requires_revision for a false or contradictory relied-on reason; needs_evidence for a precise missing local prerequisite. supported requires evidence-backed local reasoning. A current draft is still a proposal and a previous reviewer is fallible. Do not edit the army or Plan, approve the whole Plan, or repeat all global unknowns in local checks. Public reasons only.';
    if(isReview&&assignment.inputs.comparisonPremises?.value)request.userMessage+=' '+assignment.inputs.comparisonPremises.value.instruction;
    if(classifiedReview)request.userMessage=request.userMessage.replaceAll('requiredData','dataQuestions')+' '+questionInstruction;
    if(domainCatalogue)request.userMessage+=' Use action=catalogue with catalogueQueries=[{query,kind,validity,offset,limit}], reads=[],checks=[] to find necessary existing sources by their stable numbers. Independent existing body reads and metadata searches may be combined with action=read; checks must stay empty. finish must not contain reads or catalogueQueries. Search is metadata only; then read exact evidence bodies. Current and historical scopes remain explicit. Do not request an entire historical directory when a domain-specific search suffices.';
    if(isExperiment&&decisionWindow?.phase==='synthesize')request.userMessage='本轮事实实验的资料准备窗口已结束。现在选择必要的可执行workOrder，或依据已读原件conclude；reads=[]、catalogueQueries=[]。answered仅用于原问题的必要事实已回答；缺能力用blocked，需要新授权调查／战略取舍用strategy_required，并保留具体unresolvedQuestions。窗口结束不是错误、事实通过或总查询上限。复用已保存的后继和真实工具参数；参数是查询输入，不是手写结果，不得重启成功setup或修改军表／Plan。保留原问题范围、证据适用条件及公开理由，不输出隐含思维链。';
    else if(decisionWindow?.phase==='synthesize')request.userMessage=(isComparisonDesign
      ?'本轮设计资料准备已结束。返回finish和一个已补齐作者选择的比较设计，reads=[]、catalogueQueries=[]；不输出一般Teach评论，不要求先证明收益才修实验。'
      :isTeach
      ?'本轮Teach证据准备窗口已结束。返回finish与局部Teach提案，reads=[]、catalogueQueries=[]。保留具体质疑／备选／反例和必要requiredData，不能把缺事实解释为通过或强迫改表。'
      :'本轮证据准备窗口已结束。只返回finish和一项总体决策，reads=[]、catalogueQueries=[]。利用已交付原件修订/保留军表与Plan或仅记录事实；若仍缺必要事实，在dataQuestions按necessary_fact明确分类并选择调查或保留待查的草案修订；未来条件和可选实验分别保留。不得把窗口结束解释为事实已通过，不得重复请求已读内容或在此阶段执行新实验。')+request.userMessage;
    if(planningCatalogue&&decisionWindow?.phase!=='synthesize')request.userMessage+=' The evidence directory is ON-DEMAND for ordinary planning and Teach too. Use catalogue with catalogueQueries=[{query,kind,validity,offset,limit}], reads=[] and '+decisionField+'=[] to find existing source numbers. Metadata is not a read or source approval; read selected bodies next. Independent body reads and metadata searches may combine with action=read; proposals stay empty. finish has reads=[] and catalogueQueries=[]. Unshown evidence is still retrievable, not globally missing.';
    if(isExperiment&&decisionWindow?.phase!=='synthesize'&&!operation.readPreparationReturnRequired)request.userMessage+=' The evidence catalogue is now on-demand: use action=catalogue, catalogueQueries=[{query,kind,validity,offset,limit}], reads=[],workOrders=[] to search/browse its unchanged stable numbers. Empty query/kind match all. Independent existing body reads and metadata searches may be combined with action=read and workOrders=[]; finish must not contain either query list. Metadata search does not establish a fact; then read selected bodies. Your assigned scenario choices remain yours; they do not need to be pre-proven to propose a query.';
    if(isExperiment)request.userMessage+=' finish submits a NONEMPTY query batch; its completionStepId ends only that batch, not the original QUESTION. Returned observations stay with this fact role for the next necessary Native/query choice; reuse saved successors rather than restarting setup. When the question is actually answered, use action=conclude, workOrders=[],reads=[],catalogueQueries=[] and conclusion={status:"answered",answer,evidenceNumbers,conditions}, unresolvedQuestions=[]. For a concrete unavailable fact/capability use status="blocked"; when strategic judgment/a new objective is required or further queries have no information value, use status="strategy_required". Both control returns require specific unresolvedQuestions and actual source citations, remain UNANSWERED, and do not approve facts or a Plan. Do not invent global-optimality requirements or expand the original question. conclusion must be null for every other action. A setup scene with no relevant attack domain is not a zero-damage comparison; test the relevant scene before claiming an answer. Public conclusions only.';
    if(operation.readPreparationReturnRequired)request.userMessage='The immutable read/search responses are already delivered. End this evidence-preparation phase: reads=[] and catalogueQueries=[] (where present). '+(isExperiment
      ?'Choose finish with a necessary executable workOrder, or conclude with cited actual evidence: answered only if no necessary fact remains; blocked for a concrete missing capability; strategy_required for a pending strategic choice or need for a newly authorized investigation. Preserve necessary unresolvedQuestions; do not call repeated reads new experiments.'
      :isReview?'Choose finish with one honest check per supplied obligation/checkId. Preserve necessary missing evidence, source conditions and distinctions; do not pass merely because reading stopped.'
        :isDecision?'Choose finish with exactly one revise/record_facts/retain/investigate decision; keep necessary requiredData and source limits. Do not fabricate facts to make a decision.'
          :isTeach?'Choose finish with scoped Teach proposals, alternatives and disconfirmation; criticism is not a compulsory edit.'
            :'Choose finish with observed/conditional/needs_evidence findings and actual citations; do not invent a result.')
      +' This is one preparation stage, not the end of the workflow: a following method can read genuinely new details. All saved raw responses remain intact. Public reasons only.';
    if(isDecision){
      const redesign=rosterComparisonRedesignContractV1(assignment);
      if(redesign)request.promptNodes.push(redesign);
      request.userMessage+=redesign?' '+redesign.instruction:' No comparison redesign is assigned; comparisonDesignRequest=null.';
      const closure=rosterComparisonClosureContractV1(assignment);
      if(closure)request.promptNodes.push(closure);
      request.userMessage+=closure?' '+closure.instruction:' No comparison closure is assigned; comparisonClosureRequest=null.';
    }
    if(isDecision)request.userMessage+=' For a new receipt/snapshot without changed strategic intent choose record_facts, mutation=null, strategicChanges=[]; do not revise a Plan just to log it. revise requires explicit nonempty strategicChanges with before/after intent and decision consequence. For LOCAL record changes use plan.componentPurposeEdits, opponentHypothesisEdits, counterResponseEdits or invalidationTriggerEdits={upsert:[complete changed records],remove:[explicit identities]}, with the corresponding full array=null. Identities are respectively {componentKind,recordKey,instanceId}, {hypothesisId}, {responseId}, {triggerId}. Untouched records remain exact. Full arrays replace the complete collection and cannot silently omit existing records; intentional deletion is allowed via remove. retain/investigate also use strategicChanges=[]. '+(scopedClosure?questionInstruction:ROSTER_REVIEW_DATA_QUESTION_INSTRUCTION_V1);
    if(isReview&&scopedClosure&&operation.readPreparationReturnRequired)request.userMessage+=' '+questionInstruction;
    if(isDecision&&contract.providerSchema.properties.decisions.items.properties.nextInvestigation){
      const instruction='Keep the complete pending-question ledger in dataQuestions. ONLY a non-null nextInvestigation authorizes a bounded inquiry: select its necessary_fact questionNumbers, decisionToEnable, whyExistingEvidenceInsufficient, expectedNewObservation and stopWhen. Other facts and author choices remain pending with YOU. With nextInvestigation=null, retain or a genuine revise returns the unresolved obligations without dispatching them; explain any concrete unavailable capability and what current claim remains unsupported. This is not a final Plan or permission to erase facts. Choose a different useful inquiry, revise unsupported claims based on evidence, or explicitly return a concrete blocker; never repeat the same failed authorization just because facts remain. No whole-match simulation, automatic query, forced edit or source approval.';
      request.promptNodes.push({kind:'investigation_dispatch_contract',version:2,
        unresolvedInventoryAuthorizesDispatch:false,unresolvedReturnApprovesPlan:false,instruction});
      request.userMessage+=' '+instruction;
    }
    if(isDecision&&(assignment.inputs.strategicHypothesisCycle?.value||assignment.inputs.investigationFrontier?.value))request.userMessage+=' This assigned strategic owner must choose revise, evidence-backed retain, or investigate a specific necessary question. The generic record_facts lane does NOT close this comparison or decision checkpoint. Preserve the actual observations and explain their decision consequence; do not force a roster change or rerun an already sufficient experiment.';
    const originalQuestionContract=rosterAuthorOriginalQuestionContractV1(assignment);
    if(originalQuestionContract){
      request.promptNodes.push(originalQuestionContract);
      request.userMessage+=' '+originalQuestionContract.instruction;
    }
    const progressContract=rosterStrategyProgressContractV1(assignment);
    if(progressContract){request.promptNodes.push(progressContract);request.userMessage+=' '+progressContract.instruction;}
    if(menuReadRequirement.length)request.userMessage=decisionWindow?.phase==='synthesize'
      ?'已有菜单的资料窗口已结束，所需内容仍未交付。本轮conclude，准确说明未取得的来源并交回方法负责人，不批准事实、不重开检索窗口、不执行动作。'
      :'当前读取已定位菜单：按required_choice_menu_read中的producer和真实地址读取正确类型的结果，不能用动作回执或stateRef代替。workOrders=[]。也可conclude并保留准确未解项。正常资料窗口仍有效，不重跑已成功操作。';
    else if(menuPreparationRequirement.length)request.userMessage+=' 当前菜单来源缺失按required_choice_menu_preparation处理：没有已定位结果时允许finish提交对应producer的准备查询，不能只反复查目录。只生成需要的候选结果，不选择/应用未来候选、不测量、不宣称原任务完成；completionStepId为空。准备窗口结束后reads和catalogueQueries均为空，仍可提交此准备查询或准确conclude。';
    if(isExperiment)request.userMessage+=' Every new workOrder requires experimentScope: kind, decisionQuestion, decisionImpact, participantUnitIds, scenarioDescription, stopPredicate, collectScenarioExperience, hypothesisTest and comparisonBinding. Use hypothesisTest=null for factual probes; a strategic test declares a falsifiable comparison and decision consequences. comparisonBinding links supporting work to the delivered purpose evidence, current/alternative/shared arm, prerequisite/baseline/effect_endpoint stage, 1-based measurementNumbers and observationStepIds in THIS order; use null when no comparison applies. A declared endpoint is not proof it was reached. Never copy the parent hypothesis merely to label a local observation. On conclusion use hypothesisAssessments only for actually declared tests, with their exact tool sources. Allowed kinds are firepower_comparison, route_feasibility, fixed_scenario_tactic, rules_resource_check and roster_comparison. This is not limited to changing an army: a fixed-army Plan may need real local evidence. Do NOT play out a whole match or a multi-round full-army arrival/VP rehearsal. Native transitions cannot advance the current round; use conditional route/schedule calculations for future targets. A fixed tactical scene may compare explicit local actions/counterplay, then must return at its declared question boundary. Scenario experience is a separate conditional candidate, never actual live-room memory or automatic Skill truth. An inherited demand for future realized VP/full played history is a fallible proposal: preserve it and explain its relevance/classification to the owner, not silently erase it or run a full match.';
    if(choiceContract)request.userMessage+='\nThis is a delegated choice, not the parent experiment planner. pending_operation_choice_contract defines your only completion target and allowed prerequisites; the broader question is context. '+choiceContract.instruction;
    if(isDecision)request.userMessage+=' '+ROSTER_DECIDED_HERE_INSTRUCTION_V1;
    request=prepareRosterSourceReviewRequestV1(request,{directory,reviewHandles:handles?.entries??[]});
    if(isReview)request.promptNodes.push({kind:'review_repair_continuity_contract',version:1,
      instruction:'A rejected check and a rejected repair attempt have separate responsibilities. local_contract_feedback.errors keeps the original check defects; repairAttempt, when present, reports only the last patch protocol failure. Use the scoped per-check repair operations; a read prepares but never completes the correction. All original source and semantic checks remain required.'});
    if(!pendingRetry&&!operation.revalidateReplyRef&&(operation.correction||operation.authorDecisionHandoff||incomingAuthor)){
      const focused=await focusRosterWorkflowCorrectionRequestV1({request,publishContext:control.publishContext,directory});
      request=focused.request;
      if(focused.source&&!directory.some(e=>e.id===focused.source.id))
        directory.push({...focused.source,number:focused.source.evidenceNumber});
      // Every typed owner return uses the same context projection at the
      // product entry. Repair preparation is a separate concern: without
      // feedback it does not turn the owner decision into a correction turn.
      try{request=prepareRosterStrategyRepairRequestV1(request);}
      catch(error){error.dispatchOutcome='not_dispatched';error.detail={stage:'role_repair_request_construction'};throw error;}
    }
    if(!pendingRetry&&!operation.revalidateReplyRef){
      // An observed choice or a work-order correction is also a normal role
      // call. It must not depend on local JSON/semantic correction state.
      if(!rosterStrategyRepairNodeV1(request))request=prepareRosterNativeChoiceCommandV1(request)
        ??prepareRosterWorkOrderEditCommandV1(request)??request;
      request=prepareRosterInquiryPremiseRequestV1(request);
      if(isExperiment){
        const focused=await focusRosterWorkflowCorrectionRequestV1({request,publishContext:control.publishContext,directory});
        request=focused.request;
        if(focused.source&&!directory.some(e=>e.id===focused.source.id))
          directory.push({...focused.source,number:focused.source.evidenceNumber});
      }
      if(closedMethodReturn){
        const closed=makeContract('experiment_closed_method_return',obj({...contract.providerSchema.properties,
          action:{...str,enum:decisionWindow?.phase==='synthesize'||operation.readPreparationReturnRequired
            ?['conclude']:['read','catalogue','conclude']},
          workOrders:{...contract.providerSchema.properties.workOrders,maxItems:0}}),'1.0.0');
        providerSchema=closed.providerSchema;
        request.responseFormat={kind:'provider_strict_json_schema',schemaName:closed.schemaName,
          outputContractRef:outputContractRefStarcraftTmgV1(closed),schema:closed.providerSchema};
        request.userMessage='This method was closed without reauthorization by its strategic owner. Reconcile the returned decision and ORIGINAL necessary question using saved sources only; workOrders=[] and no new experiment. Choose read/catalogue only while the existing preparation window permits, otherwise conclude with actual citations. An unknown arrival round is not an answered arrival fact; a declined method is not global impossibility or an unavailable capability. Preserve every necessary unresolved predicate and source limitation. A source-backed answer still needs independent review. Do not restart the stopped method, edit the army/Plan or simulate future turns. Public rationale only.';
      }
      request=finalizeRosterRoleRequestV1(request,{assignment,handles,directory});
    }
    if(pendingRetry){
      request=await store.get(operation.pending.requestRef);
      if(request.contextHash!==pendingRetry.contextHash||request.contextHash!==operation.pending.contextHash)
        throw Error('ROSTER_WORKFLOW_TRANSPORT_REQUEST_MISMATCH');
      providerSchema=request.responseFormat.schema;
    }
    if(operation.revalidateReplyRef&&operation.savedRevalidationRequestRef){
      // A saved reply never saw today's newly assembled prompt. Revalidate
      // against its actual input/schema and retained source-delivery history.
      request=await store.get(operation.savedRevalidationRequestRef);
      providerSchema=request.responseFormat.schema;
    }else if(operation.revalidateReplyRef){
      // A typed command/patch is relative to the ORIGINAL request's retained
      // ledger. Rebuilding a fresh full-reply request cannot decode paid wire
      // operations. Ordinary unprojected schema upgrades keep their new schema.
      const call=operation.calls.find(c=>c.replyRef===operation.revalidateReplyRef);
      if(call){
        const saved=await store.get(call.requestRef);
        if(rosterStrategyRepairNodeV1(saved)||isDecision
          &&!saved.promptNodes.some(n=>n.kind==='strategy_progress_contract')){
          request=saved;providerSchema=rosterStrategyOriginalResponseFormatV1(saved).schema;
        }
      }
    }
    if(rosterStrategyRepairNodeV1(request))providerSchema=rosterStrategyOriginalResponseFormatV1(request).schema;
    const replyCatalogueEnabled=catalogueEnabled&&Boolean(providerSchema.properties.catalogueQueries);
    let reply,replyRef,replyRequest=request;
    const revalidatingSavedReply=Boolean(operation.revalidateReplyRef);
    if(operation.revalidateReplyRef){
      replyRef=operation.revalidateReplyRef;reply=await store.get(replyRef);
      const originalCall=operation.calls.find(call=>call.replyRef===replyRef);
      if(originalCall)replyRequest=await store.get(originalCall.requestRef);
      operation.revalidations=[...(operation.revalidations||[]),{replyRef,contractHash:contract.contractHash}];
      delete operation.revalidateReplyRef;await control.checkpointOperation(operation);
    }else{
      const requestRef=await store.put(request);
      operation.pending={requestRef,contextHash:request.contextHash};
      await control.checkpointOperation(operation);await onRequest(request);
      reply=await (pendingRetry?deliberation.retry(request,pendingRetry):deliberation.deliberate(request));replyRef=await store.put(reply);
      await quarantineRosterCommunicationV1({errors:rosterRoleReplyCommunicationErrorsV1(request,reply),
        operation,replyRef,requestRef,store,control,lane:'provider'});
      operation.calls.push({turn:++operation.turn,requestRef,replyRef,receipt:reply.receipt});
      operation.pending=null;delete operation.retryProviderDispatch;
      await recordRosterWorkflowReadDeliveryV1({request,operation,store,previousDeliveredReads:readContext.previousDeliveredReads});
      await control.checkpointOperation(operation);await onReply(reply);
    }
    const syntax=projectCompletedSyntaxReply(reply);
    const references=projectRosterProviderOutputReferencesV1({request:replyRequest,output:syntax.output});
    const semanticRepair=(revalidatingSavedReply
      ?projectRosterSavedWorkOrderPreparationV1({request,output:references.output}):null)
      ??projectRosterStrategyRepairOutputV1({request,output:references.output});
    const sourceUnion=projectRosterQuestionSourceUnionV1(semanticRepair.output,decisionField);
    const ownership=isExperiment?projectSchemaOwnedSiblingFieldsV1(sourceUnion.output,providerSchema,
      {recordField:'workOrders',nestedField:'experimentScope'}):isReview&&providerSchema.properties?.premiseAudit
        ?projectSchemaOwnedChildFieldsV1(sourceUnion.output,providerSchema):{output:sourceUnion.output,projection:[]};
    const redundant=projectSchemaDuplicateFieldsV1(ownership.output,providerSchema);
    const envelope=projectRosterWorkflowInertEnvelopeV1(redundant.output,providerSchema,decisionField);
    const output=envelope.output,errors=[...references.errors,...semanticRepair.errors],argumentProjection=[],
      outputProjection=[...syntax.projection,...references.projection,...semanticRepair.projection,...sourceUnion.projection,...ownership.projection,...redundant.projection,...envelope.projection],failedWorkOrders=[];
    const replyHandles=replyRequest.roleCommunication?.reviewHandles
      ?new Map(replyRequest.roleCommunication.reviewHandles.map(row=>[row.handle,row.checkId])):handles?.byHandle;
    if(isReview&&replyHandles&&replyRequest.promptNodes.some(n=>n.kind==='review_obligation_handles'&&[1,2].includes(n.version))
      &&Array.isArray(output?.checks))for(const [index,check]of output.checks.entries()){
      const original=replyHandles.get(check.checkId);
      if(original){outputProjection.push({from:`/checks/${index}/checkId`,original:check.checkId,value:original,
        rule:'host_review_obligation_handle_v1'});check.checkId=original;}
    if(isReview&&output?.premiseAudit?.rows){
      const index=output.checks?.findIndex(c=>c.checkId==='adopted_claims_supported')??-1;
      const owner=output.checks?.[index];
      if(owner&&Array.isArray(owner.evidenceNumbers)){
        const declared=output.premiseAudit.rows.flatMap(r=>r.evidenceNumbers??[]);
        const added=[...new Set(declared)].filter(n=>Number.isSafeInteger(n)&&!owner.evidenceNumbers.includes(n));
        if(added.length){owner.evidenceNumbers.push(...added);outputProjection.push({
          rule:'comparison_premise_explicit_citation_union_v1',from:'/premiseAudit/rows/*/evidenceNumbers',
          to:`/checks/${index}/evidenceNumbers`,added,modelDeclared:true,semanticApprovalGranted:false});}
      }
    }
    }
    // A versioned discriminator alias is transport syntax, not a strategic
    // rewrite. Conflicting or unknown values remain strict schema failures.
    if(output&&['read','finish'].includes(output.type)
      &&(output.action===undefined||output.action===output.type)){
      outputProjection.push({from:'/type',to:'/action',value:output.type,rule:'read_role_discriminator_alias_v1'});
      output.action=output.type;delete output.type;
    }
    if(output?.action===decisionField&&Array.isArray(output[decisionField])&&output[decisionField].length
      &&Array.isArray(output.reads)&&!output.reads.length&&!(output.catalogueQueries?.length)){
      outputProjection.push({from:'/action',to:'/action',original:output.action,value:'finish',rule:'role_output_field_discriminator_alias_v1'});
      output.action='finish';
    }
    if(reply.providerFailure&&!syntax.projection.length)errors.push({code:'provider_output_invalid',providerCode:reply.failureCode,
      parserDiagnostic:providerSyntaxDiagnostic(reply.providerFailure.rawText),
      instruction:'The completed JSON is syntactically invalid; correct the exact parser location/envelope, preserving intended choices and public content. Do not return a schema or repeat the same malformed document. The failed response and known usage are saved.'});
    if(isExperiment&&Array.isArray(output?.workOrders))for(const [index,order] of output.workOrders.entries()){
      for(const [stepIndex,step] of (order?.steps??[]).entries())for(const lane of ['bindings','guards'])
        for(const [referenceIndex,reference] of (step?.[lane]??[]).entries()){
          if(reference&&typeof reference==='object'&&!Object.hasOwn(reference,'fromEvidenceNumber')){
            reference.fromEvidenceNumber=0;
            outputProjection.push({to:`/workOrders/${index}/steps/${stepIndex}/${lane}/${referenceIndex}/fromEvidenceNumber`,value:0,rule:'legacy_same_order_binding_v1'});
          }
        }
      if(order&&typeof order==='object'&&!Object.hasOwn(order,'completionStepId')){
        order.completionStepId='';
        outputProjection.push({to:`/workOrders/${index}/completionStepId`,value:'',rule:'legacy_order_no_completion_claim_v1'});
      }
      if(order?.experimentScope&&!Object.hasOwn(order.experimentScope,'comparisonBinding')){
        order.experimentScope.comparisonBinding=null;
        outputProjection.push({to:`/workOrders/${index}/experimentScope/comparisonBinding`,value:null,
          rule:'legacy_order_no_comparison_binding_v1'});
      }
    }
    if(replyCatalogueEnabled&&output&&typeof output==='object'&&!Object.hasOwn(output,'catalogueQueries')){
      output.catalogueQueries=[];
      outputProjection.push({to:'/catalogueQueries',value:[],rule:'legacy_experiment_no_catalogue_request_v1'});
    }
    if(isExperiment&&output&&typeof output==='object'&&!Object.hasOwn(output,'conclusion')){
      output.conclusion=null;
      outputProjection.push({to:'/conclusion',value:null,rule:'legacy_batch_not_question_completion_v1'});
    }
    if(isDecision&&Array.isArray(output?.decisions))for(const [index,decision] of output.decisions.entries()){
      if(!decision?.mutation)continue;
      const mutationSchema=providerSchema.properties.decisions?.items?.properties.mutation?.anyOf?.find(s=>s.type==='object');
      const projected=projectRosterWorkflowDraftArgumentsV1(decision.mutation,{planRecordEdits:
        Boolean(mutationSchema?.properties.plan?.properties.componentPurposeEdits),
        identityRecordEdits:Boolean(mutationSchema?.properties.plan?.properties.invalidationTriggerEdits),
        branchSelection:Boolean(mutationSchema?.properties.rosterBranchSelection),
        candidateSelection:Boolean(mutationSchema?.properties.rosterCandidateSelection)});
      decision.mutation=projected.mutation;
      argumentProjection.push(...projected.ignored.map(row=>({...row,decisionIndex:index})));
    }
    // A sole explicit conclusion already selects the operation. Preserve its
    // status, sources, unknowns and prose; ordinary semantic/source gates still
    // decide whether it is valid. Never infer this when executable work coexists.
    if(isExperiment&&explicitExperimentConclusionPayload(output)
      &&providerSchema.properties.action.enum.includes('conclude')){
      outputProjection.push({from:'/action',to:'/action',original:output.action,value:'conclude',
        rule:'explicit_experiment_conclusion_discriminator_v1'});
      output.action='conclude';
    }
    // Route unambiguous READ-ONLY intent from its actual typed payload, not a
    // possibly wrong discriminator. Never normalize a proposal/write/conclusion
    // this way, and never discard either independent query list.
    const readOnlyPayload=replyCatalogueEnabled&&explicitReadOnlyPayload(output,decisionField);
    // A closed preparation window cannot be reopened by relabelling finish.
    // Already-read requests can be returned once through the normal read handoff
    // without fetching anything or accepting the missing decision.
    const repeatedReadOnlyPayload=readOnlyPayload&&output.action==='finish'
      &&!providerSchema.properties.action.enum.includes('read')&&!operation.readPreparationReturnRequired
      &&output.reads.length>0&&!output.catalogueQueries.length
      &&output.reads.every(r=>operation.reads.some(old=>
        old.evidenceId===directory.find(e=>e.number===r.evidenceNumber)?.id&&old.pointer===r.pointer));
    const mixedReadOnly=Boolean(readOnlyPayload&&output.reads.length&&output.catalogueQueries.length);
    if(readOnlyPayload){
      const action=output.reads.length?'read':'catalogue';
      if(action!==output.action&&providerSchema.properties.action.enum.includes(action)){
        outputProjection.push({from:'/action',to:'/action',original:output.action,value:action,rule:'read_only_payload_discriminator_v1'});
        output.action=action;
      }
      if(repeatedReadOnlyPayload)outputProjection.push({rule:'completed_read_preparation_return_v1',
        originalAction:output.action,conclusionAccepted:false,newReads:0});
    }
    // A rejected command mapper deliberately produces no role output. Report
    // its actual wire error, not a second spurious "role must be an object".
    const checked=semanticRepair.errors.length&&output===null?{ok:false,issues:[]}:validate(providerSchema,output);
    if(!checked.ok&&checked.issues.length)errors.push({code:'schema',issues:checked.issues});
    const lookup=n=>directory.find(e=>e.number===n);
    const decisions=isDecision&&checked.ok?output[decisionField].map(d=>projectRosterReviewDataQuestionsV1(d,{allowDecidedHere:true})):output?.[decisionField];
    let sourceInterpretationDispute=null;
    if(checked.ok){
      if(isDecision){
        for(const decision of decisions)errors.push(...rosterDecidedHereErrorsV1(decision));
        if(output.action==='finish'&&operation.authorDecisionHandoff){
          const original=operation.authorDecisionHandoff.questions.map(q=>q.question),names=new Set(original);
          const coverage=rosterReviewOriginalQuestionCoverageErrorV1(original,decisions.map(d=>({
            dataQuestions:(d.dataQuestions??[]).filter(q=>names.has(q.question))})));
          if(coverage)errors.push(coverage);
        }
      }
      if(isExperiment){
        if(closedMethodReturn&&decisions.length)errors.push({code:'closed_method_does_not_authorize_experiment',
          instruction:'The strategic owner closed this method without authorizing more experiments. Read saved sources or conclude with the remaining necessary questions. Do not replay the method or approve unknown facts.'});
        sourceInterpretationDispute=await rosterSourceRepairInformationErrorV1({stage:sourceRepairStage,output,
          inputs:assignment.inputs,directory,store,conditionProgress:sourceConditionProgress});
      }
      for(const d of decisions)if(d.dataQuestions?.some(q=>q.classification==='answered_fact')&&!d.evidenceNumbers?.length)
        errors.push({code:'answered_fact_requires_actual_read_sources',
          instruction:'State the actual answer/source numbers in the question publicReason and cite those delivered sources in this decision/check evidenceNumbers. An answered_fact label alone cannot resolve a missing fact.'});
      const authoredQuestions=decisions.flatMap(d=>d.dataQuestions??[]).filter(q=>q.classification==='authored_choice');
      if(authoredQuestions.length){
        const current=await store.load();
        for(const question of authoredQuestions){
          const error=rosterAuthoredChoiceSourceErrorV1({question,entries:directory,draftRevision:current.draftRevision,subject:authoringSubject});
          if(error)errors.push(error);
        }
      }
      for(const d of decisions)for(const q of d.dataQuestions??[]){
        // Old exact pending contracts still lack this field. Their immutable
        // requests/replies keep their old validation, not a synthesized binding.
        if(Object.hasOwn(q,'evidenceNumbers')&&q.classification==='answered_fact'&&!q.evidenceNumbers.length)
          errors.push({code:'answered_fact_requires_question_sources',question:q.question,
            instruction:'Cite actually read sources answering THIS question in its evidenceNumbers and the parent evidenceNumbers. Do not remove the question or invent evidence.'});
      }
      if(output.action==='read'&&(!output.reads.length||decisions.length))errors.push({code:'read_requires_reads_only'});
      if(output.action==='finish'&&!repeatedReadOnlyPayload&&(output.reads.length||!decisions.length&&!(isExperiment&&output.publicReason.trim())))errors.push({code:'finish_requires_role_decisions_only'});
      if(replyCatalogueEnabled){
        if(output.action==='catalogue'&&(!output.catalogueQueries.length||output.reads.length||decisions.length))
          errors.push({code:'catalogue_requires_metadata_queries_only'});
        if(output.action!=='catalogue'&&output.catalogueQueries.length&&!mixedReadOnly)errors.push({code:'catalogue_queries_require_catalogue_action'});
      }
      if(isExperiment){
        if(output.action==='finish'&&!decisions.length&&!output.reads.length)
          errors.push({code:'experiment_owner_choice_not_submitted',
            instruction:'This assigned experiment still needs YOUR next choice. Submit one necessary preliminary workOrder (completionStepId=""), or read/search missing facts; you need not solve the entire layout in one reply. Choosing an explicit hypothesis to test is not fabricating a successful result. Do not hand the choice to an unnamed model or mark it finished. Genuine unsupported capability stays a diagnosed blocker, not successful completion.'});
        if(output.action==='conclude'){
          if(decisions.length||output.reads.length||!output.conclusion?.answer.trim()||!output.conclusion?.evidenceNumbers.length)
            errors.push({code:'experiment_conclusion_requires_answer_evidence_and_no_queries'});
          if(output.conclusion?.status==='answered'&&output.unresolvedQuestions.length)
            errors.push(rosterExperimentUnresolvedFactsErrorV1(output.unresolvedQuestions));
          if(output.conclusion?.status==='blocked'&&!output.unresolvedQuestions.length)
            errors.push({code:'experiment_blocker_requires_concrete_missing_facts'});
          if(output.conclusion?.status==='strategy_required'&&!output.unresolvedQuestions.length)
            errors.push({code:'experiment_strategy_return_requires_specific_pending_choice'});
        }else if(output.conclusion!==null)errors.push(experimentOperationChoiceError(output));
      }
      if(isDecision&&output.action==='finish'){
        if(decisions.length!==1)errors.push({code:'one_joint_decision_per_revision'});
        // A historical paid reply is accountable only to its actual delivered
        // question contract, not a freshly assembled recovery-time prompt.
        const questionContract=replyRequest.promptNodes.find(n=>n.kind==='author_original_question_contract');
        for(const decision of decisions){
          errors.push(...rosterComparisonRedesignErrorsV1({
            contract:replyRequest.promptNodes.find(n=>n.kind==='comparison_redesign_contract'),decision}));
          errors.push(...rosterComparisonClosureErrorsV1({
            contract:replyRequest.promptNodes.find(n=>n.kind==='comparison_closure_contract'),decision}));
          const error=rosterAuthorOriginalQuestionCoverageErrorV1({contract:questionContract,decision});
          if(error)errors.push(error);
          errors.push(...rosterStrategyProgressErrorsV1({
            contract:replyRequest.promptNodes.find(n=>n.kind==='strategy_progress_contract'),decision}));
        }
        if(providerSchema.properties.decisions.items.properties.nextInvestigation)for(const d of decisions){
          // Only a contract actually delivered in this request can reject a
          // repeated authorization. Pending paid legacy requests stay intact.
          const continuation=request.promptNodes.find(n=>n.kind==='investigation_continuation_contract'&&n.version===1);
          const error=rosterDecisionInvestigationErrorV1(d,{continuation});if(error)errors.push(error);
        }
        for(const d of decisions)if((d.disposition==='revise')!==(d.mutation!==null))errors.push({code:'revise_requires_mutation_otherwise_null'});
        for(const d of decisions)if(d.requiredDecisions?.length&&!d.requiredData?.length&&d.disposition!=='revise'&&!d.comparisonDesignRequest&&!d.comparisonClosureRequest)
          errors.push(rosterPendingAuthorChoiceErrorV1(d.requiredDecisions));
        if(assignment.inputs.strategicHypothesisCycle?.value||assignment.inputs.investigationFrontier?.value)for(const d of decisions){
          if(d.disposition==='record_facts')errors.push({code:'hypothesis_owner_requires_strategic_disposition',
            instruction:'The observations are preserved, but this assigned owner must answer the actual comparison: revise, retain with evidence-backed reasons, or investigate one necessary missing fact. Do not invent an edit or repeat a completed experiment. Fact bookkeeping alone does not close the strategy question.'});
          if(d.disposition==='retain'&&!d.evidenceNumbers.length)errors.push({code:'hypothesis_retention_requires_comparison_sources',
            instruction:'Cite and actually read the sources supporting this comparison and retention, including its conditions/limits. If a necessary measurement is missing, investigate it; do not manufacture evidence or change the roster just to satisfy the stage.'});
        }
        // Pending transport retries keep their EXACT original contract. Do not
        // invent an intent declaration for an already paid older request.
        if(providerSchema.properties.decisions.items.properties.strategicChanges)for(const d of decisions){
          if(d.disposition==='revise'&&!d.strategicChanges.length)errors.push({code:'strategy_revision_requires_intent_delta',pointer:'/decisions/0/strategicChanges',received:[],
            instruction:'Name the actual before/after strategic intent or adopted premise and its decision consequence. If only recording new evidence, choose record_facts with mutation=null; do not manufacture a strategy change.'});
          if(d.disposition!=='revise'&&d.strategicChanges.length)errors.push({code:'non_revision_requires_no_strategy_delta',
            instruction:'record_facts/retain/investigate do not edit strategic intent: strategicChanges=[] and mutation=null. If an actual strategic change is proposed, use revise and explain its before/after consequence.'});
          for(const delta of d.strategicChanges)if(!delta.intentPath.trim()||!delta.beforeIntent.trim()||!delta.afterIntent.trim()
            ||!delta.decisionConsequence.trim()||delta.beforeIntent===delta.afterIntent)
            errors.push({code:'strategy_delta_requires_distinct_intents_and_consequence',instruction:'Give a nonempty actual intentPath, distinct beforeIntent/afterIntent and their decisionConsequence; a private snapshot note is not a strategic change.'});
          if(d.disposition==='record_facts'&&!d.evidenceNumbers.length)errors.push({code:'record_facts_requires_actual_sources',
            instruction:'Cite the exact delivered source numbers for the observation you are recording, or use retain for an unchanged strategy without a new factual record. Available but unread sources must be read first.'});
        }
        if(decisionWindow)for(const d of decisions)if(d.disposition==='investigate'&&!d.requiredData.length)
          errors.push({code:'investigation_requires_specific_remaining_question'});
      }
      if(isReview&&output.action==='finish'){
        const premiseContract=assignment.inputs.comparisonPremises?.value;
        if(premiseContract){
          const premiseResult=assessRosterComparisonPremisesV1({contract:premiseContract,audit:output.premiseAudit,checks:decisions});
          errors.push(...premiseResult.errors);
        }
        errors.push(...await rosterReviewProofCitationErrorsV1({inputs:assignment.inputs,directory,checks:decisions,readArtifact:store.get}));
        if(assignment.inputs.review?.value?.domainId==='comparison_preflight')
          errors.push(...rosterComparisonObservationCoverageErrorsV1({inputs:assignment.inputs,checks:decisions}));
        const originalQuestionError=rosterReviewOriginalQuestionCoverageErrorV1(assignment.inputs.originalDataQuestions?.value,decisions);
        if(originalQuestionError)errors.push(originalQuestionError);
        const required=assignment.inputs.review.value.obligations.map(o=>o.checkId);
        const received=decisions.map(d=>d.checkId);
        if(received.length!==required.length||new Set(received).size!==received.length||required.some(id=>!received.includes(id)))
          errors.push({code:'review_obligation_coverage',required,received});
        for(const check of decisions){
          // Missing evidence is semantic work, not malformed JSON. Preserve it
          // even when the reviewer chooses an optimistic label; finalAssessment
          // blocks requiredData and hands it to the domain investigator. Asking
          // for an empty array here made actual36→41 delete the gap, not fix it.
          if(['supported','conditional'].includes(check.verdict)&&!isTypedPureFutureReview(check)&&!check.evidenceNumbers.length)
            errors.push({code:'supported_review_requires_evidence',checkId:check.checkId});
          if(check.verdict==='conditional'&&!check.conditions.length&&!check.dataQuestions?.some(q=>q.classification==='future_condition'))errors.push({code:'conditional_review_requires_premises',checkId:check.checkId});
        }
      }
      for(const read of output.reads)if(!lookup(read.evidenceNumber))errors.push({code:'evidence_number_invalid',number:read.evidenceNumber,
        assignedReferences,instruction:'This number does not exist. Choose the exact evidenceNumber in assigned_evidence_references/available_evidence_directory, or search the catalogue. Do not derive numbers from sourceResultRef or other hashes.'});
      if(isDecision)for(const decision of decisions)if(decision.mutation?.rosterBranchSelection||decision.mutation?.rosterCandidateSelection){
        const current=await store.load();
        try{await resolveRosterWorkflowBudgetSelectionV1({decision,draft:await store.get(current.draftRef),
          state:current,work:{operationState:operation},store,assignmentInputs:assignment.inputs});}
        catch(error){
          const selectedRead=error.code==='ROSTER_WORKFLOW_BRANCH_CANDIDATE_NOT_DELIVERED'?error.detail?.read:null;
          if(selectedRead&&lookup(selectedRead.evidenceNumber)&&typeof selectedRead.pointer==='string')
            errors.push({code:'evidence_not_read',number:selectedRead.evidenceNumber,requiredPointer:selectedRead.pointer,
              sourceError:error.code,instruction:error.detail.instruction});
          else errors.push({code:error.code??error.message,detail:error.detail??null});
        }
      }
      const hypothesisAssessments=isExperiment?output.conclusion?.hypothesisAssessments??[]:[];
      if(isExperiment&&output.conclusion){
        const verified=await verifyRosterNativeFactsV1({conclusion:output.conclusion,
          required:Boolean(assignment.inputs.preflightPrerequisites),lookup,lookupById:id=>directory.find(e=>e.id===id),readArtifact:store.get,
          currentScope:assignment.scope,
          isRead:(number,pointer)=>{
            const entry=lookup(number);
            return [...collected,...Object.values(assignment.inputs)].some(read=>read.status==='read'
              &&read.evidenceId===entry?.id&&(!read.pointer||pointer===read.pointer||pointer.startsWith(read.pointer+'/')));
          }});
        errors.push(...verified.errors);
        // Host-owned facts are attached only after equality/source/read checks,
        // never copied from a model-authored receipt or accepted reviewer prose.
        operation.verifiedNativeFacts=verified.facts;
      }
      if(isComparisonDesign&&output.action==='finish'&&decisions.length!==1)
        errors.push({code:'comparison_design_requires_one_decision_purpose',instruction:'Submit ONE concrete, decision-relevant comparison purpose with expected benefit, observable endpoint and both decision consequences. Do not replace the design with a fact-summary list.'});
      if(isTeach&&output.action==='finish')errors.push(...rosterWorkflowUnreadTeachSubjectsV1({
        subject:teachSubject,proposals:decisions,isRead:(number,pointer)=>{
          const entry=lookup(number);if(!entry)return false;
          const covers=read=>read.status==='read'&&read.evidenceId===entry.id
            &&(!read.pointer||read.pointer===pointer||pointer.startsWith(read.pointer+'/'));
          return collected.some(covers)||Object.values(assignment.inputs).some(covers);
        }}));
      for(const finding of [...decisions,...decisions.flatMap(d=>d.dataQuestions??[]),...(isExperiment&&output.conclusion?[output.conclusion]:[]),
        ...hypothesisAssessments.map(a=>({evidenceNumbers:[a.sourceEvidenceNumber,...a.evidenceNumbers]})),
        ...(isExperiment?decisions.map(order=>({evidenceNumbers:order.experimentScope?.hypothesisTest?.priorEvidenceNumbers??[]})):[])])for(const n of finding.evidenceNumbers||[]){
        const e=lookup(n);
        const inline=Object.values(assignment.inputs).some(i=>i.source==='evidence'&&i.evidenceId===e?.id&&i.status==='read');
        if(!e||!inline&&!collected.some(r=>r.evidenceId===e.id&&r.status==='read'))errors.push({code:'evidence_not_read',number:n});
      }
      if(isExperiment){
        if(menuPreparationRequirement.length&&output.action==='finish')for(const order of decisions){
          const unsupportedSteps=(order.steps??[]).filter(step=>!menuPreparationStepAllowed(step,menuPreparationRequirement));
          if(unsupportedSteps.length||order.completionStepId)errors.push({code:'menu_preparation_requires_producer_only',
            stepIds:unsupportedSteps.map(step=>step.stepId),completionStepId:order.completionStepId,
            producers:menuPreparationRequirement.map(issue=>issue.producer),
            instruction:'Prepare only the required menu producer on the intended saved state, then return with completionStepId empty. Do not select/apply options, rerun setup, measure combat or claim the parent task completed before the actual menu is read.'});
        }
        const assessedExperiments=new Set();
        for(const assessment of hypothesisAssessments){
          const e=lookup(assessment.sourceEvidenceNumber);
          const origin=e?rosterHypothesisOriginV1(await store.get(e.artifactRef)):null;
          if(!origin?.hypothesisTest)errors.push({code:'hypothesis_assessment_requires_declared_test',
            number:assessment.sourceEvidenceNumber,
            instruction:'This source has no predeclared hypothesisTest. Keep it as a factual finding with hypothesisAssessments=[]; do not retrofit a paid historical probe into a controlled strategic test. If a new comparison is needed, declare its design and reuse relevant original evidence without replaying completed actions.'});
          else assessedExperiments.add(origin.experimentId??origin.sourceWorkId);
          const missing=[assessment.sourceEvidenceNumber,...assessment.evidenceNumbers].filter(n=>!output.conclusion.evidenceNumbers.includes(n));
          if(missing.length)errors.push({code:'hypothesis_sources_required_in_conclusion',numbers:[...new Set(missing)],
            instruction:'Include the actual hypothesis source and observation sources in conclusion.evidenceNumbers so independent source review receives them. This is not source approval.'});
        }
        if(output.conclusion?.status==='answered')for(const n of output.conclusion.evidenceNumbers){
          const e=lookup(n),origin=e?rosterHypothesisOriginV1(await store.get(e.artifactRef)):null;
          if(origin?.hypothesisTest&&assignedHypothesisDesigns(assignment).has(hash(origin.hypothesisTest))
            &&!assessedExperiments.has(origin.experimentId??origin.sourceWorkId))
            errors.push({code:'declared_hypothesis_requires_scoped_assessment',number:n,
              instruction:'Classify the declared test using its actual observations: supported_under_conditions, refuted_under_conditions, or inconclusive with reasons. Completing a query does not resolve its strategic hypothesis. Do not force support or waive the assigned necessary facts.'});
        }
        const orderIds=new Set(),priorSteps=[];
        for(const order of decisions){
          if(orderIds.has(order.orderId))errors.push({code:'duplicate_order_id',orderId:order.orderId});
          orderIds.add(order.orderId);
          try{
            const jobs=compileRosterWorkflowExperimentV1({order,scope:assignment.scope,namespace:`${assignment.workId}:order${orderIds.size-1}`,evidenceDirectory:directory,priorSteps,
              comparisonPurpose:assignment.inputs.comparisonPurpose,choiceContract});
            for(const job of jobs){
              const proposed=job.inputs.request.value;
              const selections=['native_action','spatial'].includes(proposed.operation)&&proposed.args.selection?.sourceEvidenceNumber
                ?[proposed.args.selection]:proposed.operation==='formation_scene'?proposed.args.selections??[]:[];
              for(const selection of selections){
                if(!selection.sourceEvidenceNumber)continue;
                const e=lookup(selection.sourceEvidenceNumber);
                const sameSource=id=>id?.replace(/^tool-view:/,'tool:')===e?.id.replace(/^tool-view:/,'tool:');
                const issue=e?await choiceMenuSourceError({selection,operation:proposed.operation,directory,store,assignment}):null;
                const delivered=issue?.code==='evidence_not_read'
                  &&[...collected,...Object.values(assignment.inputs).filter(i=>i.source==='evidence')]
                    .some(read=>sameSource(read.evidenceId)&&deliveredChoiceMenu(read,proposed.operation,selection.kind,selection.optionIndex,issue.requiredPointer));
                if(issue&&!delivered)errors.push(issue);
              }
              // Bound inputs are checked after resolution by the same executor
              // predicate. Do not infer a future result during planning.
              if(proposed.operation!=='scenario'||proposed.bindings.length)continue;
              const repeated=await findRepeatedFailedRosterSceneV1({store,
                descriptor:{sourceStateHash:assignment.scope.source,rulesRuntimeHash:assignment.scope.rules,
                  builderBundleHash:descriptor?.laboratory?.builderBundleHash},
                args:proposed.args,excludeWorkId:job.id});
              if(repeated)throw Object.assign(Error('EXPERIMENT_REPEATS_FAILED_SCENE'),{
                code:'EXPERIMENT_REPEATS_FAILED_SCENE',detail:{stepId:job.id,...repeated.queryRepair}});
            }
            jobs.forEach((job,index)=>priorSteps.push({stepId:order.steps[index].stepId,workId:job.id}));
          }
          catch(error){failedWorkOrders.push({order:structuredClone(order),
            error:serializeRosterWorkOrderFailureV1(error)});}
        }
      }
    }
    // An unchanged authorization already compares this reply with the prior
    // author on the SAME explicit lineage. That IS the repeated iteration;
    // do not fetch citations/pay for another correction to discover it again.
    const authorizationLoop=errors.find(e=>e.code==='unchanged_investigation_authorization');
    const readProgress=!errors.length&&readOnlyPayload
      ?projectRosterReadRequestProgressV1({request:replyRequest,reads:output.reads,
        catalogueQueries:output.catalogueQueries??[],directory}):null;
    if(readProgress)operation.lastReadProgress={...readProgress,originalReplyRef:replyRef};
    const immutableReadLoop=readProgress?.noNewInformation===true;
    // Stop an evidenced no-progress correction now, not after spending the
    // remaining retry allowance. A normal source delivery/confirmation with
    // no remaining error, a changed proposal or a changed diagnostic is NOT
    // this case. Compare execution views (including typed-patch baselines),
    // and persist both paid replies before refusing another dispatch.
    const correctionLoop=errors.length&&correction&&['finish','conclude'].includes(output?.action)
      &&!(output.reads?.length||output.catalogueQueries?.length)
      &&isDeepStrictEqual(output,correctionOutput)&&isDeepStrictEqual(errors,correction.errors);
    const compilerLoop=isExperiment&&!(output.reads?.length||output.catalogueQueries?.length)
      ?rosterRepeatedWorkOrderFailureV1({task:assignment.inputs.task?.value,failures:failedWorkOrders}):null;
    const closedOwnerLoop=isExperiment&&checked.ok&&rosterClosedMethodReturnsControlV1({inputs:assignment.inputs,output});
    if(authorizationLoop||correctionLoop||immutableReadLoop||compilerLoop||closedOwnerLoop){
      if(compilerLoop)errors.push(compilerLoop);
      if(immutableReadLoop)errors.push({code:'already_delivered_immutable_reads',
        reads:structuredClone(readProgress.alreadyDelivered),deliveryContextHash:readProgress.deliveryContextHash});
      operation.noProgressStop={version:1,reason:closedOwnerLoop?'closed_method_returns_to_same_owner':authorizationLoop?'unchanged_investigation_authorization':
        immutableReadLoop?'already_delivered_immutable_reads':compilerLoop?'unchanged_compiler_rejection':'identical_invalid_reply_and_diagnostics',
        workId:assignment.workId,scopeHash:hash(assignment.scope),previousReplyRef:correction?.originalReplyRef??null,
        ...(authorizationLoop?{previousWorkId:authorizationLoop.previousWorkId,previousResultRef:authorizationLoop.previousResultRef}:{}),
        ...(immutableReadLoop?{readProgress:structuredClone(readProgress)}:{}),
        ...(closedOwnerLoop?{closedReturn:structuredClone(assignment.inputs.scopedStrategyReturn.value),
          unresolvedQuestions:structuredClone(output.unresolvedQuestions??[]),
          unreviewedConclusion:structuredClone(output.conclusion)}:{}),
        repeatedReplyRef:replyRef,errors:structuredClone(errors),stoppedAtTurn:operation.turn,
        acceptanceGranted:false,historyReset:false,automaticRetry:false};
      operation.correction={errors,originalReplyRef:replyRef,instruction:'Repeated invalid result stopped; repair the evidenced cause before explicit continuation.'};
      await control.checkpointOperation(operation);
      throw Object.assign(Error('ROSTER_WORKFLOW_ROLE_NO_PROGRESS'),{dispatchOutcome:'completed_no_progress',
        detail:structuredClone(operation.noProgressStop)});
    }
    // A valid citation is an explicit selection of an immutable source. Read
    // it through the same scoped reader, then ask the author to confirm/revise
    // the pending proposal. Never mark it accepted merely by fetching sources.
    // This also handles finish+reads as a pending proposal, not a format loop.
    const readErrors=errors.filter(e=>e.code==='evidence_not_read'&&lookup(e.number));
    const hasPendingReads=readErrors.length>0||output?.reads?.length>0
      &&errors.some(e=>e.code==='finish_requires_role_decisions_only');
    const evidenceReadRepair=checked.ok&&['finish','conclude'].includes(output.action)
      &&(decisions.length>0||isExperiment&&output.publicReason.trim())&&errors.length
      &&hasPendingReads;
    if(evidenceReadRepair){
      const selected=[...output.reads.filter(r=>lookup(r.evidenceNumber)),...readErrors
        .map(e=>({evidenceNumber:e.number,pointer:e.requiredPointer??''}))];
      const remainingErrors=errors.filter(e=>!readErrors.includes(e)
        &&!(e.code==='finish_requires_role_decisions_only'&&output.reads.length>0));
      const unique=new Map(selected.map(r=>[JSON.stringify([r.evidenceNumber,r.pointer]),r]));
      const fresh=[...unique.values()].filter(r=>!operation.reads.some(old=>
        old.evidenceId===lookup(r.evidenceNumber).id&&old.pointer===r.pointer));
      if(fresh.length){
        const fetched=await Promise.all(fresh.map(async r=>{
          const evidenceId=lookup(r.evidenceNumber).id,result=await control.readEvidence(evidenceId,r.pointer);
          return {evidenceId,pointer:r.pointer,resultRef:await store.put(result)};
        }));
        operation.reads.push(...fetched);
        // Retrieval is a normal state transition, not a syntactic/semantic
        // failure. Only a validated conclusion closes a correction cycle;
        // alternating invalid conclusions and fresh reads cannot reset it.
        operation.evidenceDelivery={version:1,originalReplyRef:replyRef,reads:fetched,conclusionAccepted:false};
        if(semanticRepair.preparationCandidate){
          const previous=operation.workOrderEditPreparation;
          operation.workOrderEditPreparation={...structuredClone(semanticRepair.preparationCandidate),sourceReplyRef:replyRef,
            previousProposalRefs:[...(previous?.previousProposalRefs??[]),...(previous?[previous.sourceReplyRef]:[])]};
        }
        operation.correction=remainingErrors.length?{errors:remainingErrors,originalReplyRef:replyRef,
          instruction:'Repair only these remaining semantic/contract errors. The separately delivered evidence is a normal tool handoff, not proof that the proposed conclusion is correct.'}:null;
        if(remainingErrors.length)operation.consecutiveCorrections++;
        operation.evidenceReadHandoffs=[...(operation.evidenceReadHandoffs||[]),
          {originalReplyRef:replyRef,reads:fetched,priorErrors:errors,remainingErrors,
            recoveryContractVersion:3,conclusionAccepted:false}];
        handoffSavedMethodConfirmation(operation,replyRef,'evidence_reads_pending_recheck');
        await control.checkpointOperation(operation);
        // A corrected saved proposal may now need an ordinary source delivery.
        // Preserve its prior error count, but only an ACTUAL remaining error
        // consumes/checks that budget. The next confirmation still validates
        // all semantics; another invalid answer cannot reset the old count.
        if(remainingErrors.length&&operation.consecutiveCorrections>=(operation.correctionLimit??3))throw Object.assign(Error('ROSTER_WORKFLOW_ROLE_CORRECTION_NOT_CONVERGED'),{dispatchOutcome:'completed_invalid'});
        return {kind:'interpretation',value:{status:'evidence_reads_pending_recheck',readCount:fetched.length,
          originalReplyRef:replyRef,conclusionAccepted:false},conditions:['new evidence requires author confirmation'],continuation:true};
      }
    }
    if(errors.length){
      operation.correction={errors,originalReplyRef:replyRef,instruction:'Correct only this local reply. Saved evidence and successful reads remain available.'};
      const handoff=await projectRosterAuthorDecisionHandoffV1({role:assignment.role,operation,store});
      if(handoff){
        enterRosterAuthorDecisionHandoffV1(operation,handoff);
        await control.checkpointOperation(operation);
        return {kind:'interpretation',value:{status:'strategy_author_handoff',sourceReplyRef:replyRef,
          questionCount:handoff.questions.length,acceptanceGranted:false},conditions:['owner decision required; facts not approved'],continuation:true};
      }
      operation.consecutiveCorrections++;
      await control.checkpointOperation(operation);
      if(operation.consecutiveCorrections>=(operation.correctionLimit??3))throw Object.assign(Error('ROSTER_WORKFLOW_ROLE_CORRECTION_NOT_CONVERGED'),{dispatchOutcome:'completed_invalid'});
      return {kind:'interpretation',value:{status:'needs_local_correction',errors},conditions:['not accepted'],continuation:true};
    }
    if(semanticRepair.preparation){
      const previous=operation.workOrderEditPreparation;
      operation.workOrderEditPreparation={...structuredClone(semanticRepair.preparation),sourceReplyRef:replyRef,
        previousProposalRefs:[...(previous?.previousProposalRefs??[]),...(previous?[previous.sourceReplyRef]:[])]};
      // These are distinct phases: the old mixed-envelope diagnostic is now
      // resolved as preparation, but compiler/semantic approval is still pending.
      operation.correction=null;
      await control.checkpointOperation(operation);
    }
    // Reading/searching can prepare a semantic repair, but is not the repaired
    // conclusion. Keep its original reply, errors and budget in the NEXT prompt.
    // This applies to every read role, not just a particular preflight error.
    if(readOnlyPayload&&operation.correction?.errors?.length
      &&operation.correction.errors.every(e=>e.code==='finish_requires_role_decisions_only'))operation.correction=null;
    const pendingConclusionRepair=Boolean(operation.correction||operation.evidenceDelivery||operation.workOrderEditPreparation)
      &&(output.action==='read'||output.action==='catalogue'||mixedReadOnly||repeatedReadOnlyPayload);
    if(!pendingConclusionRepair)operation.correction=null;
    if(operation.correctionRecovery&&!pendingConclusionRepair){
      operation.correctionLimit=operation.correctionRecovery.normalLimit;
      operation.completedCorrectionRecoveries=[...(operation.completedCorrectionRecoveries??[]),
        {...operation.correctionRecovery,validatedReplyRef:replyRef,completedAtTurn:operation.turn}];
      delete operation.correctionRecovery;
    }
    if(replyCatalogueEnabled&&(output.action==='catalogue'||mixedReadOnly)){
      operation.catalogueSearches??=[];
      const unique=new Map(output.catalogueQueries.map(query=>[JSON.stringify(query),query]));
      const fresh=[...unique.values()].filter(query=>!operation.catalogueSearches.some(old=>JSON.stringify(old.query)===JSON.stringify(query)));
      const freshReads=mixedReadOnly?output.reads.filter(r=>!operation.reads.some(old=>old.evidenceId===lookup(r.evidenceNumber).id&&old.pointer===r.pointer)):[];
      if(!fresh.length&&!freshReads.length){
        if(!pendingConclusionRepair)operation.consecutiveCorrections=0;
        operation.readPreparationReturnRequired={reason:'repeated_immutable_read_only_request',originalReplyRef:replyRef,
          requestedReads:structuredClone(output.reads),requestedCatalogueQueries:structuredClone(output.catalogueQueries)};
      }else{
        if(!pendingConclusionRepair)operation.consecutiveCorrections=0;
        for(const query of fresh)operation.catalogueSearches.push({query:structuredClone(query),
          resultRef:await store.put(await searchRosterWorkflowSourceCatalogueV1(directory,query,
            {store,indexCache:catalogueSourceIndex}))});
        const results=await Promise.all(freshReads.map(async read=>{
          const evidenceId=lookup(read.evidenceNumber).id,result=await control.readEvidence(evidenceId,read.pointer);
          return {evidenceId,pointer:read.pointer,resultRef:await store.put(result)};
        }));
        operation.reads.push(...results);
      }
      await control.checkpointOperation(operation);
      if(operation.consecutiveCorrections>=(operation.correctionLimit??3))throw Object.assign(Error('ROSTER_WORKFLOW_ROLE_CATALOGUE_NOT_CONVERGED'),{dispatchOutcome:'completed_no_progress'});
      handoffSavedMethodConfirmation(operation,replyRef,'catalogue_read_completed');
      await control.checkpointOperation(operation);
      return {kind:'interpretation',value:{status:mixedReadOnly?'read_and_catalogue_completed':'catalogue_search_completed',
        queryCount:fresh.length,evidenceBodiesRead:freshReads.length>0,...(mixedReadOnly?{readCount:freshReads.length}:{}),
        preparationReturned:Boolean(operation.readPreparationReturnRequired),
        publicReason:output.publicReason,outputProjection,originalReplyRef:replyRef},
        conditions:[mixedReadOnly?'Independent immutable reads and directory metadata retrieved; no proposal/write submitted'
          :'Only directory metadata retrieved; role has not completed the experiment'],continuation:true};
    }
    if(output.action==='read'||repeatedReadOnlyPayload){
      const fresh=output.reads.filter(r=>!operation.reads.some(old=>old.evidenceId===lookup(r.evidenceNumber).id&&old.pointer===r.pointer));
      if(!fresh.length){
        if(repeatedReadOnlyPayload)operation.readPreparationReturnRequired={
          reason:'completed_reads_in_closed_preparation_window',originalReplyRef:replyRef,
          requestedReads:structuredClone(output.reads),requestedCatalogueQueries:[]};
        if(decisionWindow){
          operation.evidenceDecisionRequired=true;
        }else{
          if(!pendingConclusionRepair)operation.consecutiveCorrections=0;
          operation.readPreparationReturnRequired={reason:'repeated_exact_reads',originalReplyRef:replyRef,
            requestedReads:structuredClone(output.reads),requestedCatalogueQueries:[]};
        }
      }else{
        if(!pendingConclusionRepair)operation.consecutiveCorrections=0;
        // Only immutable reads run in parallel. No private branch is mutated.
        const results=await Promise.all(fresh.map(async read=>{
          const evidenceId=lookup(read.evidenceNumber).id;
          const result=await control.readEvidence(evidenceId,read.pointer);
          return {evidenceId,pointer:read.pointer,resultRef:await store.put(result)};
        }));
        operation.reads.push(...results);
      }
      await control.checkpointOperation(operation);
      if(operation.consecutiveCorrections>=(operation.correctionLimit??3))throw Object.assign(Error('ROSTER_WORKFLOW_ROLE_READS_NOT_CONVERGED'),{dispatchOutcome:'completed_no_progress'});
      handoffSavedMethodConfirmation(operation,replyRef,'reads_completed');
      await control.checkpointOperation(operation);
      return {kind:'interpretation',value:{status:'reads_completed',publicReason:output.publicReason,readCount:operation.reads.length,
        newReadCount:fresh.length,preparationReturned:Boolean(operation.readPreparationReturnRequired),
        outputProjection,originalReplyRef:replyRef},
        conditions:['role has not submitted its conclusion'],continuation:true};
    }
    if(operation.authorDecisionHandoff)operation.authorDecisionHandoff={...operation.authorDecisionHandoff,
      phase:'submitted_for_review',decisionReplyRef:replyRef,submittedAtTurn:operation.turn};
    if(operation.sourceRevalidation?.authorConfirmation)
      operation.sourceRevalidation.authorConfirmation={...operation.sourceRevalidation.authorConfirmation,
        phase:'submitted_for_review',decisionReplyRef:replyRef,submittedAtTurn:operation.turn};
    if(operation.evidenceDelivery){
      operation.completedEvidenceDeliveries=[...(operation.completedEvidenceDeliveries??[]),
        {...operation.evidenceDelivery,consumerReplyRef:replyRef,consumedAtTurn:operation.turn}];
      delete operation.evidenceDelivery;
    }
    if(operation.workOrderEditPreparation){
      operation.completedWorkOrderEditPreparations=[...(operation.completedWorkOrderEditPreparations??[]),
        {...operation.workOrderEditPreparation,consumerReplyRef:replyRef,consumedAtTurn:operation.turn,
          outcome:output.action==='conclude'?'returned_without_submission':'submitted_to_compiler',
          compilerAccepted:failedWorkOrders.length===0&&output.action==='finish',nativeExecuted:false}];
      delete operation.workOrderEditPreparation;
    }
    operation.consecutiveCorrections=0;await control.checkpointOperation(operation);
    if(sourceInterpretationDispute){
      const returned=createRosterSourceInterpretationReturnV1({assignment,output,
        diagnostic:sourceInterpretationDispute,directory,replyRef});
      operation.controlReturns=[...(operation.controlReturns??[]),structuredClone(returned.value.coordination)];
      await control.checkpointOperation(operation);
      return returned;
    }
    const accepted=isExperiment?decisions.filter(order=>!failedWorkOrders.some(f=>f.order.orderId===order.orderId))
      :classifiedReview?decisions.map(projectRosterReviewDataQuestionsV1):decisions;
    return {kind:isTeach||isExperiment||isDecision||isReview?'proposal':'interpretation',value:{publicReason:output.publicReason,[decisionField]:accepted.map(f=>({...f,
      ...(!isExperiment?{evidenceRefs:f.evidenceNumbers.map(n=>({id:lookup(n).id,artifactRef:lookup(n).artifactRef}))}:{})})),
      ...(isExperiment?{unresolvedQuestions:output.unresolvedQuestions,failedWorkOrders,
        experimentConclusion:output.conclusion?{...output.conclusion,
          verifiedNativeFacts:structuredClone(operation.verifiedNativeFacts??[]),
          ...(output.conclusion.hypothesisAssessments?{hypothesisAssessments:output.conclusion.hypothesisAssessments.map(a=>({...a,
            sourceRef:{id:lookup(a.sourceEvidenceNumber).id,artifactRef:lookup(a.sourceEvidenceNumber).artifactRef},
            evidenceRefs:a.evidenceNumbers.map(n=>({id:lookup(n).id,artifactRef:lookup(n).artifactRef})),
            sourceApprovalGranted:false,strategicAdoptionGranted:false}))}:{}),
          evidenceRefs:output.conclusion.evidenceNumbers.map(n=>({id:lookup(n).id,artifactRef:lookup(n).artifactRef})),acceptanceGranted:false}:null,
        orderRepairLimit:operation.correctionLimit??3,
        partialWorkOnly:failedWorkOrders.length>0}:{}),
      ...(isDecision&&decisions[0]?.comparisonDesignRequest?{comparisonDesignHandoff:projectRosterComparisonDesignHandoffV1({
        contract:replyRequest.promptNodes.find(n=>n.kind==='comparison_redesign_contract'),decision:decisions[0],replyRef})}:{}),
      ...(isDecision&&decisions[0]?.comparisonClosureRequest?{comparisonClosureHandoff:projectRosterComparisonClosureHandoffV1({
        contract:replyRequest.promptNodes.find(n=>n.kind==='comparison_closure_contract'),decision:decisions[0],replyRef})}:{}),
      ...(isReview&&output.premiseAudit?{premiseAudit:structuredClone(output.premiseAudit)}:{}),
      argumentProjection,outputProjection,originalReplyRef:replyRef,
      modelInterpretationNotRulesTruth:true,acceptanceGranted:false},conditions:['scoped public model interpretation; not release approval']};
  };
}
