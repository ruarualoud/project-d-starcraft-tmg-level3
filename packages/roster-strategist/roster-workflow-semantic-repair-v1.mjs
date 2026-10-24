import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {createStarcraftTmgOutputContractV1,outputContractRefStarcraftTmgV1,
  validateStarcraftTmgProviderJsonSchemaValueV1 as validate} from '../structured-generation/output-contract-registry-v1.mjs';
import {prepareRosterAuthorCommandV1,projectRosterAuthorCommandV1} from './roster-workflow-author-command-v1.mjs';
import {prepareRosterReviewRepairRequestV1,projectRosterReviewRepairOutputV1} from './roster-workflow-review-repair-v1.mjs';
import {prepareRosterComparisonControlCommandV1,projectRosterComparisonControlCommandV1} from './roster-comparison-control-command-v1.mjs';
import {prepareRosterExperimentControlRepairV1,projectRosterExperimentControlRepairV1} from './roster-experiment-control-repair-v1.mjs';
import {prepareRosterNativeChoiceCommandV1,projectRosterNativeChoiceCommandV1} from './roster-native-choice-command-v1.mjs';
import {prepareRosterWorkOrderEditCommandV1,projectRosterWorkOrderEditCommandV1} from './roster-work-order-edit-command-v1.mjs';
const clone=structuredClone;
const obj=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const nullable=value=>({anyOf:[value,{type:'null'}]});
export const rosterStrategyRepairNodeV1=request=>request?.promptNodes?.find(n=>
  n.kind==='strategy_semantic_repair'&&[1,2,3,4].includes(n.version)||n.kind==='review_semantic_repair'&&n.version===1
    ||['experiment_control_repair','native_choice_command'].includes(n.kind)&&n.version===1
    ||n.kind==='work_order_edit_command'&&[1,2].includes(n.version));
export const rosterStrategyOriginalResponseFormatV1=request=>request?.strategyRepairState?.originalResponseFormat
  ??rosterStrategyRepairNodeV1(request)?.originalResponseFormat??request.responseFormat;
export const rosterInquiryCorrectionErrorsV1=errors=>Boolean(errors?.length&&errors.every(e=>[
  'bounded_investigation_authorization_invalid','pending_questions_are_not_investigation_authorization',
  'decided_here_requires_explicit_owner_decision',
  'strategy_required_work_has_no_next_step',
].includes(e.code)));

// An explicit model-authored patch, not a Host inference from natural language.
// Keep the original role validator and immutable paid reply behind this wire form.
export function prepareRosterStrategyRepairRequestV1(request){
  const choice=prepareRosterNativeChoiceCommandV1(request);if(choice)return choice;
  const order=prepareRosterWorkOrderEditCommandV1(request);if(order)return order;
  const experiment=prepareRosterExperimentControlRepairV1(request);if(experiment)return experiment;
  const review=prepareRosterReviewRepairRequestV1(request);if(review)return review;
  const comparison=prepareRosterComparisonControlCommandV1(request);if(comparison)return comparison;
  const command=prepareRosterAuthorCommandV1(request);if(command)return command;
  const feedback=request.promptNodes.find(n=>n.kind==='local_contract_feedback');
  const inquiryControl=rosterInquiryCorrectionErrorsV1(feedback?.errors);
  if(request.roundKind!=='roster_workflow_strategy_decision'||!feedback?.errors?.length
    ||!(inquiryControl||feedback.errors.every(e=>e.code==='author_choice_requires_author_action'))
    ||feedback.originalOutput?.action!=='finish'||feedback.originalOutput.decisions?.length!==1)return request;
  const props=request.responseFormat.schema.properties,decision=props.decisions.items;
  const questions=feedback.originalOutput.decisions[0].dataQuestions;
  if(!questions?.length)return request;
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
  const version=inquiryControl?2:1;
  const contractVersion=inquiryControl?'1.2.0':'1.0.1';
  const contract=createStarcraftTmgOutputContractV1({id:'roster.workflow_strategy_semantic_repair',version:contractVersion,
    schemaName:'roster_workflow_strategy_semantic_repair_v1',providerSchema,
    modelOwnedFields:Object.keys(providerSchema.properties),hostOwnedFields:['artifactRef','acceptanceGranted'],
    mapperRef:{id:'roster.semantic_patch',version:contractVersion,hash:hash(`roster.semantic_patch.v${contractVersion}`)},
    semanticValidatorRef:{id:'roster.workflow_read_role_semantics',version:'1.0.0',hash:hash('roster.workflow_read_role_semantics.v1')},
    description:'Explicit local author corrections; projected decisions still undergo the unchanged original semantic and source checks.'});
  const node={kind:'strategy_semantic_repair',version,originalResponseFormat:clone(request.responseFormat),
    originalReplyRef:feedback.originalReplyRef,
    questions:questions.map((q,i)=>({questionNumber:i+1,question:q.question,classification:q.classification,
      flagged:feedback.errors.some(e=>e.questions?.includes(q.question))})),
    instruction:'Use repair for explicit question-number patches, corrected decisionPublicReason and/or alternatives; null preserves a field, unlisted questions remain unchanged. questionRepairs=null or [] both mean no question changes; a nonempty array is an explicit patch, never an inferred answer. Question wording cannot be rewritten or deleted. publicReason explains THIS correction. Changing the army/Plan mutation itself requires replace_decision with one complete replacementDecision and every original question preserved. This is not automatic approval: all normal semantic, source and final-release checks still apply. read/catalogue submit no patches. Never reproduce an invalid full reply as the patch. Current Builder facts override an alternative audit; correct dependent public reasons as well, but do not erase the remaining construction obligation.'};
  if(inquiryControl)node.instruction+=' For the NEXT bounded fact investigation WITHOUT a pending army/Plan edit, choose action=authorize_inquiry and explicitly fill inquiryAuthorization with the selected necessary_fact questionNumbers, decisionToEnable, whyExistingEvidenceInsufficient, expectedNewObservation and stopWhen. Also provide decisionPublicReason explaining this next operation. This command maps to disposition=investigate; do not retype retain in a full envelope. You may preserve decided_here answers about OTHER questions. The command does not approve those answers or waive missing facts. Non-authorization actions have inquiryAuthorization=null. authorize_inquiry cannot discard an existing mutation or strategicChanges.';
  if(revisionFollowup)node.instruction+=' This rejected reply ALREADY contains a joint revise proposal. To keep that exact proposal and supply ONLY its missing follow-up inquiry, choose authorize_revision_followup with inquiryAuthorization. Host preserves disposition=revise, the original mutation and strategicChanges; it adds only your explicit bounded inquiry. Use questionRepairs=null/[] and decisionPublicReason=null to preserve those fields too, replacementDecision=null. The proposed edit still needs normal Builder/commit validation; only after successful commit can the inquiry use the resulting draft. It does not mark any necessary_fact answered, approve the Plan, or silently remove the proposed edit.';
  const next={...request,promptNodes:[...request.promptNodes,node],
    userMessage:'SEMANTIC REPAIR: use the structured correction operations in strategy_semantic_repair, not the original full response envelope. '+node.instruction,
    responseFormat:{kind:'provider_strict_json_schema',schemaName:contract.schemaName,
      outputContractRef:outputContractRefStarcraftTmgV1(contract),schema:providerSchema}};
  next.contextHash=hash({priorContextHash:request.contextHash,promptNodes:next.promptNodes,userMessage:next.userMessage,responseFormat:next.responseFormat});
  return next;
}

export function projectRosterStrategyRepairOutputV1({request,output}){
  const node=rosterStrategyRepairNodeV1(request);
  if(!node)return {output,projection:[],errors:[]};
  if(node.kind==='native_choice_command')return projectRosterNativeChoiceCommandV1({request,output});
  if(node.kind==='work_order_edit_command')return projectRosterWorkOrderEditCommandV1({request,output});
  if(node.kind==='experiment_control_repair')return projectRosterExperimentControlRepairV1({request,output});
  if(node.kind==='review_semantic_repair')return projectRosterReviewRepairOutputV1({request,output});
  if(node.version===4)return projectRosterComparisonControlCommandV1({request,output});
  if(node.version===3)return projectRosterAuthorCommandV1({request,output});
  const feedback=request.promptNodes.find(n=>n.kind==='local_contract_feedback');
  const reject=(code,details={})=>({output:null,projection:[],errors:[{code,...details}]});
  const checked=validate(request.responseFormat.schema,output);
  if(!checked.ok)return reject('semantic_patch_schema',{issues:checked.issues});
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
      catalogueQueries:clone(output.catalogueQueries),decisions:[]},projection:[],errors:[]};
  }
  if(output.reads.length||output.catalogueQueries.length)return reject('semantic_patch_write_and_read_mixed');
  const original=feedback.originalOutput,projected=clone(original),projection=[];
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
    if(!projection.length)return reject('semantic_patch_no_changes');
  }
  set(projected,'publicReason',output.publicReason,'/publicReason');
  projected.reads=[];projected.catalogueQueries=[];
  return {output:projected,projection,errors:[]};
}
