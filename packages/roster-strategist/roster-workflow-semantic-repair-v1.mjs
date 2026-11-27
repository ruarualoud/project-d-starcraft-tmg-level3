import {projectRosterConstructionCommandV1} from './roster-workflow-construction-command-v1.mjs';
import {projectRosterAuthorQuestionStateV1,projectRosterSavedAuthorQuestionsV1} from './roster-author-question-state-v1.mjs';
import {projectRosterComparisonOwnerCriterionV1} from './roster-comparison-intent-v1.mjs';
import {projectRosterDecisionEnvelopeV1} from './roster-decision-envelope-v1.mjs';
import {projectRosterCatalogueEnvelopeV1} from './roster-workflow-role-envelope-v1.mjs';
import {projectRosterParticipantOptionalFieldsV1} from './roster-participant-wire-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {createStarcraftTmgOutputContractV1,outputContractRefStarcraftTmgV1,
  validateStarcraftTmgProviderJsonSchemaValueV1 as validate} from '../structured-generation/output-contract-registry-v1.mjs';
import {prepareRosterAuthorCommandV1,projectRosterAuthorCommandV1} from './roster-workflow-author-command-v1.mjs';
import {prepareRosterReviewRepairRequestV1,projectRosterReviewRepairOutputV1} from './roster-workflow-review-repair-v1.mjs';
import {prepareRosterComparisonControlCommandV1,projectRosterComparisonControlCommandV1} from './roster-comparison-control-command-v1.mjs';
import {prepareRosterExperimentControlRepairV1,projectRosterExperimentControlRepairV1} from './roster-experiment-control-repair-v1.mjs';
import {prepareRosterNativeChoiceCommandV1,projectRosterNativeChoiceCommandV1} from './roster-native-choice-command-v1.mjs';
import {prepareRosterWorkOrderEditCommandV1,projectRosterWorkOrderEditCommandV1} from './roster-work-order-edit-command-v1.mjs';
import {prepareRosterExperimentOperationCommandV1,projectRosterExperimentOperationCommandV1} from './roster-experiment-operation-command-v1.mjs';
import {projectRosterToolParameterCommandV1} from './roster-tool-parameter-command-v1.mjs';
import {prepareRosterComparisonQuoteRequestV1,projectRosterComparisonQuoteOutputV1} from './roster-comparison-quote-selection-v1.mjs';
const clone=structuredClone;
const obj=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const nullable=value=>({anyOf:[value,{type:'null'}]});
export const rosterStrategyRepairNodeV1=request=>request?.promptNodes?.find(n=>
  n.kind==='strategy_semantic_repair'&&[1,2,3,4,5].includes(n.version)||n.kind==='review_semantic_repair'&&n.version===1
    ||['experiment_control_repair','native_choice_command','experiment_operation_command','comparison_quote_selection','tool_parameter_command'].includes(n.kind)&&n.version===1
    ||n.kind==='work_order_edit_command'&&[1,2].includes(n.version));
export const rosterStrategyOriginalResponseFormatV1=request=>request.constructionCommandState?.version===1
  ?rosterStrategyOriginalResponseFormatV1({...request,constructionCommandState:null,responseFormat:request.constructionCommandState.originalResponseFormat})
  :request?.strategyRepairState?.originalResponseFormat
  ??rosterStrategyRepairNodeV1(request)?.originalResponseFormat??request.authorQuestionState?.originalResponseFormat??request.responseFormat;
export const rosterInquiryCorrectionErrorsV1=errors=>Boolean(errors?.length&&errors.every(e=>[
  'bounded_investigation_authorization_invalid','pending_questions_are_not_investigation_authorization',
  'decided_here_requires_explicit_owner_decision',
  'strategy_required_work_has_no_next_step',
].includes(e.code)));

// A rejected wire patch did not replace the original semantic problem. Carry
// both independently so the next request stays an author command, not a full
// rewrite whose diagnostics describe a different object. No rejected fields
// (including substantive extra dataQuestions) are silently applied.
export function projectRosterStrategyRepairContinuationV1({request,reply,correction,projection}){
  const node=rosterStrategyRepairNodeV1(request);
  const baseline=request.promptNodes.find(n=>n.kind==='local_contract_feedback');
  const stoppedSourceRead=node?.repairScope==='current_plan_source'&&projection?.output?.action==='read'
    &&correction?.errors?.length&&correction.errors.every(e=>e.code==='already_delivered_immutable_reads');
  if(node?.kind!=='strategy_semantic_repair'||![1,2,3].includes(node.version)
    ||!(projection?.errors?.length||stoppedSourceRead)||!baseline?.errors?.length)return null;
  const originalOutput=request.strategyRepairState?.originalOutput??baseline.originalOutput;
  const originalReplyRef=node.originalReplyRef??baseline.originalReplyRef;
  if(!originalOutput||!originalReplyRef)return null;
  return {originalReplyRef,originalOutput:clone(originalOutput),errors:clone(baseline.errors),
    repairAttempt:{version:1,originalReplyRef,rejectedReplyRef:correction.originalReplyRef,
      rejectedOutput:clone(reply.output),errors:clone(correction.errors),
      instruction:'The last author command was rejected before application. The original semantic questions remain unresolved; the rejected command is a separate wire-format failure, not the new decision template. Use the CURRENT command schema to choose the next operation and update only the affected numbered questions. Do not silently discard questions or treat the rejected operation as executed. No source, fact, army or Plan has been approved.'}};
}

// An explicit model-authored patch, not a Host inference from natural language.
// Keep the original role validator and immutable paid reply behind this wire form.
export function prepareRosterStrategyRepairRequestV1(request,{deferExperimentOperation=false,sourceStateIdentities=[]}={}){
  const choice=prepareRosterNativeChoiceCommandV1(request);if(choice)return choice;
  const order=prepareRosterWorkOrderEditCommandV1(request,{sourceStateIdentities});if(order)return order;
  const experiment=prepareRosterExperimentControlRepairV1(request);if(experiment)return experiment;
  if(!deferExperimentOperation){const operation=prepareRosterExperimentOperationCommandV1(request,{sourceStateIdentities});if(operation)return operation;}
  const quoteSelection=prepareRosterComparisonQuoteRequestV1(request);if(quoteSelection)return quoteSelection;
  const review=prepareRosterReviewRepairRequestV1(request);if(review)return review;
  const feedback=request.promptNodes.find(n=>n.kind==='local_contract_feedback');
  const sourceOnly=request.roundKind==='roster_workflow_strategy_decision'&&feedback?.errors?.length
    &&feedback.errors.every(e=>e.code==='authored_choice_requires_current_plan_source')
    &&feedback.originalOutput?.action==='finish'&&feedback.originalOutput.decisions?.length===1;
  if(!sourceOnly){const comparison=prepareRosterComparisonControlCommandV1(request);if(comparison)return comparison;}
  // All valid strategic author baselines use one next-operation command.
  // An unowned question is no exception: the old repair/replacement union
  // repeatedly invited mixed commands and hid the actual strategic choice.
  // Legacy readers below remain for immutable paid requests, not new dispatch.
  if(!sourceOnly){const command=prepareRosterAuthorCommandV1(request);if(command)return command;}
  const inquiryControl=rosterInquiryCorrectionErrorsV1(feedback?.errors);
  if(request.roundKind!=='roster_workflow_strategy_decision'||!feedback?.errors?.length
    ||!(sourceOnly||inquiryControl||feedback.errors.every(e=>e.code==='author_choice_requires_author_action'))
    ||feedback.originalOutput?.action!=='finish'||feedback.originalOutput.decisions?.length!==1)return request;
  const props=request.responseFormat.schema.properties,decision=props.decisions.items;
  const questions=feedback.originalOutput.decisions[0].dataQuestions;
  if(!questions?.length)return request;
  const selected=questions.flatMap((q,i)=>feedback.errors.some(e=>e.question===q.question||e.questions?.includes(q.question))?[i+1]:[]);
  if(sourceOnly&&!selected.length)return request; // Never infer a correction target from prose.
  const readReturn=request.promptNodes.find(n=>n.kind==='read_preparation_return');
  const readProgress=request.promptNodes.find(n=>n.kind==='immutable_read_progress');
  const sourcePreparationComplete=sourceOnly&&readReturn?.reason==='already_delivered_immutable_reads'
    &&readReturn.requestedReads?.length>0&&readProgress?.notDelivered?.length===0
    &&readReturn.requestedReads.every(r=>readProgress.alreadyDelivered?.some(d=>d.evidenceNumber===r.evidenceNumber&&d.pointer===r.pointer));
  const originalDecision=feedback.originalOutput.decisions[0];
  const revisionFollowup=inquiryControl&&originalDecision.disposition==='revise'
    &&originalDecision.mutation!==null&&originalDecision.strategicChanges?.length>0;
  const qprops=decision.properties.dataQuestions.items.properties;
  const providerSchema=obj({action:{...props.action,enum:['read','catalogue','repair','replace_decision',
    ...(inquiryControl?['authorize_inquiry']:[]),...(revisionFollowup?['authorize_revision_followup']:[])]},
    publicReason:props.publicReason,reads:props.reads,catalogueQueries:props.catalogueQueries,
    questionRepairs:nullable({type:'array',minItems:0,items:obj({questionNumber:{type:'integer',minimum:1,maximum:questions.length},
      classification:qprops.classification,publicReason:qprops.publicReason,evidenceNumbers:qprops.evidenceNumbers})}),
    decisionPublicReason:nullable(decision.properties.publicReason),alternatives:nullable(decision.properties.alternatives),
    replacementDecision:nullable(decision),
    ...(inquiryControl?{inquiryAuthorization:clone(decision.properties.nextInvestigation)}:{})});
  if(sourceOnly){
    providerSchema.properties.action.enum=sourcePreparationComplete?['repair']:props.action.enum?.includes('read')?['read','catalogue','repair']:['read','repair'];
    if(sourcePreparationComplete){providerSchema.properties.reads={...props.reads,maxItems:0};providerSchema.properties.catalogueQueries={...props.catalogueQueries,maxItems:0};}
    providerSchema.properties.questionRepairs.anyOf[0].items.properties.questionNumber.enum=selected;
    for(const key of ['decisionPublicReason','alternatives','replacementDecision'])delete providerSchema.properties[key];
    providerSchema.required=Object.keys(providerSchema.properties);
  }
  const version=inquiryControl?2:1;
  const contractVersion=sourceOnly?'1.3.2':inquiryControl?'1.2.0':'1.0.1';
  const contract=createStarcraftTmgOutputContractV1({id:'roster.workflow_strategy_semantic_repair',version:contractVersion,
    schemaName:sourceOnly?'roster_workflow_plan_source_repair_v1':'roster_workflow_strategy_semantic_repair_v1',providerSchema,
    modelOwnedFields:Object.keys(providerSchema.properties),hostOwnedFields:['artifactRef','acceptanceGranted'],
    mapperRef:{id:'roster.semantic_patch',version:contractVersion,hash:hash(`roster.semantic_patch.v${contractVersion}`)},
    semanticValidatorRef:{id:'roster.workflow_read_role_semantics',version:'1.0.0',hash:hash('roster.workflow_read_role_semantics.v1')},
    description:'Explicit local author corrections; projected decisions still undergo the unchanged original semantic and source checks.'});
  const node={kind:'strategy_semantic_repair',version,originalResponseFormat:clone(request.responseFormat),
    originalReplyRef:feedback.originalReplyRef,
    questions:questions.map((q,i)=>({questionNumber:i+1,question:q.question,classification:q.classification,
      flagged:feedback.errors.some(e=>e.questions?.includes(q.question))})),
    instruction:'Use repair for explicit question-number patches, corrected decisionPublicReason and/or alternatives; null preserves a field, unlisted questions remain unchanged. questionRepairs=null or [] both mean no question changes; a nonempty array is an explicit patch, never an inferred answer. Question wording cannot be rewritten or deleted. publicReason explains THIS correction. Changing the army/Plan mutation itself requires replace_decision with one complete replacementDecision and every original question preserved. This is not automatic approval: all normal semantic, source and final-release checks still apply. read/catalogue submit no patches. Never reproduce an invalid full reply as the patch. Current Builder facts override an alternative audit; correct dependent public reasons as well, but do not erase the remaining construction obligation.'};
  if(sourceOnly){
    node.repairScope='current_plan_source';
    node.questions=node.questions.filter(q=>selected.includes(q.questionNumber)).map(q=>({...q,flagged:true}));
    node.sourceReadPhaseVersion=1;node.sourceReadPhase=sourcePreparationComplete?'decision_required':'read_available';
    node.deliveredCurrentPlanReads=sourcePreparationComplete?clone(readProgress.alreadyDelivered):[];
    node.instruction='Repair ONLY the numbered source-binding defect. Read the exact current Plan declaration named by sourceNavigation before citing it; Teach/reviewer summaries are not the declaration. Supply questionRepairs for the selected question numbers only. You may correct their classification, explanation and evidence citations. All other questions, the original comparison design, decision and proposed army/Plan mutation remain unchanged. The command has no decisionPublicReason, alternatives or replacementDecision fields; Host preserves them without a new model choice. This is not a new strategy decision or permission to execute the proposal: the unchanged original source/semantic checks and subsequent review still apply. If a body is deferred, fetch its exact evidence/pointer with read. Read/catalogue must carry no patches. When general research is closed, read is limited to exact current Plan evidenceNumber/pointer pairs listed in sourceNavigation; it does not reopen catalogue or research.';
  }
  if(sourcePreparationComplete)node.instruction='Source preparation is COMPLETE. The exact requested current Plan bodies are delivered in exact_read_results in THIS request, listed in deliveredCurrentPlanReads. Do not request them again. Submit action=repair with questionRepairs for ONLY the selected numbered questions and reads=[]/catalogueQueries=[]. Judge from the actual text whether the declaration is already in the current Plan; otherwise correct the classification and reason honestly. Delivery does not prove support. A historical experiment-method decision is not automatically a current adopted Plan declaration. You may retain uncertainty or a pending author choice where appropriate; Host does not select the answer or approve the Plan. All unmentioned questions and the original proposal are preserved; existing source/semantic checks still apply.';
  if(inquiryControl)node.instruction+=' For the NEXT bounded fact investigation WITHOUT a pending army/Plan edit, choose action=authorize_inquiry and explicitly fill inquiryAuthorization with the selected necessary_fact questionNumbers, decisionToEnable, whyExistingEvidenceInsufficient, expectedNewObservation and stopWhen. Also provide decisionPublicReason explaining this next operation. This command maps to disposition=investigate; do not retype retain in a full envelope. You may preserve decided_here answers about OTHER questions. The command does not approve those answers or waive missing facts. Non-authorization actions have inquiryAuthorization=null. authorize_inquiry cannot discard an existing mutation or strategicChanges.';
  if(revisionFollowup)node.instruction+=' This rejected reply ALREADY contains a joint revise proposal. To keep that exact proposal and supply ONLY its missing follow-up inquiry, choose authorize_revision_followup with inquiryAuthorization. Host preserves disposition=revise, the original mutation and strategicChanges; it adds only your explicit bounded inquiry. Use questionRepairs=null/[] and decisionPublicReason=null to preserve those fields too, replacementDecision=null. The proposed edit still needs normal Builder/commit validation; only after successful commit can the inquiry use the resulting draft. It does not mark any necessary_fact answered, approve the Plan, or silently remove the proposed edit.';
  const next={...request,promptNodes:[...request.promptNodes.map(n=>sourcePreparationComplete&&n===feedback?{...n,sourcePreparationComplete:true,errors:n.errors.map(e=>({...e,sourceNavigation:e.sourceNavigation?{...e.sourceNavigation,availableCurrentPlanSources:e.sourceNavigation.availableCurrentPlanSources?.map(s=>({...s,bodyRead:readProgress.alreadyDelivered.some(d=>d.evidenceNumber===s.evidenceNumber&&d.pointer===s.pointer)||s.bodyRead,deliveredInCurrentRequest:readProgress.alreadyDelivered.some(d=>d.evidenceNumber===s.evidenceNumber&&d.pointer===s.pointer)}))}:e.sourceNavigation}))}:n),node],
    userMessage:'SEMANTIC REPAIR: use the structured correction operations in strategy_semantic_repair, not the original full response envelope. '+node.instruction,
    responseFormat:{kind:'provider_strict_json_schema',schemaName:contract.schemaName,
      outputContractRef:outputContractRefStarcraftTmgV1(contract),schema:providerSchema}};
  next.contextHash=hash({priorContextHash:request.contextHash,promptNodes:next.promptNodes,userMessage:next.userMessage,responseFormat:next.responseFormat});
  return next;
}

// Source-binding repair can request a named Plan block even after general research
// is closed. This is preparation only: the original finish contract is unchanged.
export function projectRosterPlanSourceReadContractV1({request,output,schema=rosterStrategyOriginalResponseFormatV1(request).schema}){
  const unchanged={validationSchema:schema,projection:[],errors:[]};
  const node=rosterStrategyRepairNodeV1(request);
  if(node?.kind!=='strategy_semantic_repair'||node.repairScope!=='current_plan_source'
    ||schema.properties.action.enum?.includes('read')||!['read','catalogue'].includes(output?.action))return unchanged;
  const errors=request.promptNodes.find(n=>n.kind==='local_contract_feedback')?.errors??[];
  const sources=errors.flatMap(e=>e.code==='authored_choice_requires_current_plan_source'
    ?[...(e.sourceNavigation?.availableCurrentPlanSources??[]),...(e.sourceNavigation?.currentPlanSources??[])]:[]);
  const reads=output.reads??[];
  if(output.action!=='read'||!reads.length||output.catalogueQueries?.length||output.decisions?.length
    ||reads.some(r=>!sources.some(s=>s.evidenceNumber===r.evidenceNumber&&s.pointer===r.pointer)))
    return {...unchanged,errors:[{code:'plan_source_repair_requires_listed_read',
      instruction:'Read only exact evidenceNumber/pointer pairs in current Plan sourceNavigation; submit no catalogue, decision or mutation with this preparation.'}]};
  const validationSchema=clone(schema);validationSchema.properties.action.enum=['read'];
  return {validationSchema,errors:[],projection:[{rule:'current_plan_source_read_preparation_v1',
    reads:clone(reads),conclusionAccepted:false,researchReopened:false}]};
}

function projectInactiveCommandFieldsV1({request,output}){
  const node=rosterStrategyRepairNodeV1(request);
  if(node?.kind!=='strategy_semantic_repair'||![1,2].includes(node.version))return {output,projection:[]};
  // Command-discriminated inactive fields have no model choice. A missing
  // inactive null is transport shorthand; a non-null conflicting command is
  // still rejected below. Required arguments and active patch fields are never
  // completed here, and the immutable Provider reply is never rewritten.
  const inactive={
    authorize_inquiry:['replacementDecision'],authorize_revision_followup:['replacementDecision'],
    repair:['replacementDecision','inquiryAuthorization'],
    replace_decision:['questionRepairs','decisionPublicReason','alternatives','inquiryAuthorization'],
    read:['questionRepairs','decisionPublicReason','alternatives','replacementDecision','inquiryAuthorization'],
    catalogue:['questionRepairs','decisionPublicReason','alternatives','replacementDecision','inquiryAuthorization'],
  }[output?.action]??[];
  const normalizations=[];
  for(const field of inactive)if(request.responseFormat.schema.properties[field]&&!Object.hasOwn(output,field)){
    output={...output,[field]:null};normalizations.push({rule:'inactive_command_field_null_v1',field,action:output.action});
  }
  return {output,projection:normalizations};
}

export function projectRosterStrategyRepairOutputV1({request,output}){
  if(request.constructionCommandState?.version===1){
    const compiled=projectRosterConstructionCommandV1({request,output});if(compiled.errors.length)return compiled;
    const mapped=projectRosterStrategyRepairOutputV1({request:compiled.request,output:compiled.output});
    return {...mapped,wireOutput:output,projection:[...compiled.projection,...mapped.projection]};
  }
  const participants=projectRosterParticipantOptionalFieldsV1({request,output});
  const envelope=projectRosterDecisionEnvelopeV1({request,output:participants.output});
  // Normalize the existing inert query default before ANY wrapped wire schema.
  // Live, saved-reply and compact commands share this path; explicit values stay intact.
  const catalogue=projectRosterCatalogueEnvelopeV1({output:envelope.output,
    enabled:Boolean(request.responseFormat?.schema?.properties?.catalogueQueries)});
  const prepared=projectInactiveCommandFieldsV1({request,output:catalogue.output});
  const mapped=projectRosterStrategyRepairCoreV1({request,output:prepared.output});
  return {...mapped,...(envelope.projection.length||participants.projection.length?{wireOutput:prepared.output}:{}),
    projection:[...participants.projection,...envelope.projection,...catalogue.projection,...prepared.projection,...mapped.projection]};
}

function projectRosterStrategyRepairCoreV1({request,output}){
  if(request.comparisonOwnerCriterionState?.version===1){
    const projected=projectRosterComparisonOwnerCriterionV1({request,output});if(projected.errors.length)return projected;
    const {comparisonOwnerCriterionState,...inner}=request;
    const mapped=projectRosterStrategyRepairOutputV1({request:{...inner,responseFormat:comparisonOwnerCriterionState.originalResponseFormat},output:projected.output});
    return {...mapped,...(projected.wireOutput?{wireOutput:projected.wireOutput}:{}),projection:[...projected.projection,...mapped.projection]};
  }
  if(request.authorQuestionState?.version===1){
    const state=projectRosterAuthorQuestionStateV1({request,output});
    if(state.errors.length)return state;
    const {authorQuestionState,...originalRequest}=request;
    const mapped=projectRosterStrategyRepairOutputV1({request:{...originalRequest,responseFormat:authorQuestionState.originalResponseFormat},output:state.output});
    return {...mapped,projection:[...state.projection,...mapped.projection]};
  }
  const node=rosterStrategyRepairNodeV1(request);
  if(!node)return {output,projection:[],errors:[]};
  if(node.kind==='tool_parameter_command')return projectRosterToolParameterCommandV1({request,output});
  if(node.kind==='comparison_quote_selection')return projectRosterComparisonQuoteOutputV1({request,output});
  if(node.kind==='native_choice_command')return projectRosterNativeChoiceCommandV1({request,output});
  if(node.kind==='work_order_edit_command')return projectRosterWorkOrderEditCommandV1({request,output});
  if(node.kind==='experiment_control_repair')return projectRosterExperimentControlRepairV1({request,output});
  if(node.kind==='experiment_operation_command')return projectRosterExperimentOperationCommandV1({request,output});
  if(node.kind==='review_semantic_repair')return projectRosterReviewRepairOutputV1({request,output});
  if([4,5].includes(node.version))return projectRosterComparisonControlCommandV1({request,output});
  if(node.version===3)return projectRosterAuthorCommandV1({request,output});
  const feedback=request.promptNodes.find(n=>n.kind==='local_contract_feedback');
  const reject=(code,details={})=>({output:null,projection:[],errors:[{code,...details}]});
  const normalizations=[];
  const checked=validate(request.responseFormat.schema,output);
  if(!checked.ok)return reject('semantic_patch_schema',{issues:checked.issues});
  if(node.repairScope==='current_plan_source')output={...output,decisionPublicReason:null,alternatives:null,replacementDecision:null};
  const patches=output.questionRepairs??[];
  const inquiryCommand=node.version===2&&output.action==='authorize_inquiry';
  const revisionFollowup=node.version===2&&output.action==='authorize_revision_followup';
  if(node.version===2&&!inquiryCommand&&!revisionFollowup&&output.inquiryAuthorization!==null)
    return reject('semantic_patch_inquiry_requires_explicit_command');
  if(inquiryCommand&&(!output.inquiryAuthorization||output.decisionPublicReason===null))
    return reject('semantic_patch_inquiry_requires_authorization_and_reason');
  if(revisionFollowup&&!output.inquiryAuthorization)
    return reject('semantic_patch_revision_followup_requires_authorization');
  if(['read','catalogue'].includes(output.action)){
    if(patches.length||output.replacementDecision||output.decisionPublicReason!==null||output.alternatives!==null)
      return reject('semantic_patch_read_and_write_mixed');
    return {output:{action:output.action,publicReason:output.publicReason,reads:clone(output.reads),
      catalogueQueries:clone(output.catalogueQueries),decisions:[]},projection:normalizations,errors:[]};
  }
  if(output.reads.length||output.catalogueQueries.length)return reject('semantic_patch_write_and_read_mixed');
  const baseline=projectRosterSavedAuthorQuestionsV1({schema:node.originalResponseFormat.schema,output:feedback.originalOutput});
  if(baseline.errors.length)return baseline;
  const original=baseline.output,projected=clone(original),projection=[...normalizations,...baseline.projection];
  const set=(target,key,value,path,rule='model_authored_semantic_patch_v1')=>{projection.push({to:path,original:clone(target[key]),value:clone(value),
    rule});target[key]=clone(value);};
  if(output.action==='replace_decision'){
    if(!output.replacementDecision||patches.length||output.decisionPublicReason!==null||output.alternatives!==null)
      return reject('semantic_patch_replacement_exclusive');
    const received=output.replacementDecision.dataQuestions.map(q=>q.question);
    if(original.decisions[0].dataQuestions.some(q=>received.filter(v=>v===q.question).length!==1))
      return reject('semantic_patch_original_questions_missing');
    set(projected,'decisions',[output.replacementDecision],'/decisions');
  }else{
    if(output.replacementDecision)return reject('semantic_patch_replacement_requires_explicit_action');
    const seen=new Set();
    for(const patch of patches){
      if(seen.has(patch.questionNumber))return reject('semantic_patch_duplicate_question',{questionNumber:patch.questionNumber});
      seen.add(patch.questionNumber);
      const index=patch.questionNumber-1,question=projected.decisions[0].dataQuestions[index];
      for(const key of ['classification','publicReason','evidenceNumbers'])set(question,key,patch[key],`/decisions/0/dataQuestions/${index}/${key}`);
    }
    if(output.decisionPublicReason!==null)set(projected.decisions[0],'publicReason',output.decisionPublicReason,'/decisions/0/publicReason');
    if(output.alternatives!==null)set(projected.decisions[0],'alternatives',output.alternatives,'/decisions/0/alternatives');
    if(inquiryCommand){
      const decision=projected.decisions[0];
      if(decision.mutation!==null||decision.strategicChanges?.length)
        return reject('semantic_patch_inquiry_cannot_discard_mutation');
      set(decision,'disposition','investigate','/decisions/0/disposition','model_authored_inquiry_command_v2');
      set(decision,'nextInvestigation',output.inquiryAuthorization,'/decisions/0/nextInvestigation','model_authored_inquiry_command_v2');
      if(Object.hasOwn(decision,'workflowBlocker'))set(decision,'workflowBlocker',null,'/decisions/0/workflowBlocker','model_authored_inquiry_command_v2');
    }
    if(revisionFollowup){
      const decision=projected.decisions[0];
      if(decision.disposition!=='revise'||decision.mutation===null||!decision.strategicChanges?.length)
        return reject('semantic_patch_revision_followup_requires_existing_revision');
      set(decision,'nextInvestigation',output.inquiryAuthorization,'/decisions/0/nextInvestigation','model_authored_revision_followup_v3');
    }
    if(projection.length===normalizations.length)return reject('semantic_patch_no_changes');
  }
  set(projected,'publicReason',output.publicReason,'/publicReason');
  projected.reads=[];projected.catalogueQueries=[];
  return {output:projected,projection,errors:[]};
}
