import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {createStarcraftTmgOutputContractV1,outputContractRefStarcraftTmgV1,
  validateStarcraftTmgProviderJsonSchemaValueV1 as validate} from '../structured-generation/output-contract-registry-v1.mjs';
const clone=structuredClone;
const obj=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});

// The model chooses the next operation and updates only the relevant ledger
// entries. Host merges explicit operations; it never chooses a roster or fact.
export function prepareRosterAuthorCommandV1(request){
  const feedback=request.promptNodes.find(n=>n.kind==='local_contract_feedback');
  const delivery=request.promptNodes.find(n=>n.kind==='evidence_delivery_handoff');
  const correcting=Boolean(feedback?.errors?.length);
  const original=correcting?feedback.originalOutput:delivery?.pendingProposal;
  const originalReplyRef=correcting?feedback.originalReplyRef:delivery?.originalReplyRef;
  if(request.roundKind!=='roster_workflow_strategy_decision'
    ||!request.promptNodes.some(n=>n.kind==='strategy_owner_assignment'||n.kind==='strategy_author_handoff'
      ||n.kind==='comparison_closure_contract'&&n.version===1)
    ||!originalReplyRef
    ||original?.action!=='finish'||original.decisions?.length!==1)return null;
  // Role/assignment grants authority; diagnostic names must not change the
  // command protocol. Only structurally valid saved decisions can supply the
  // retained ledger. Semantic and source checks still run after projection.
  if(!validate(request.responseFormat.schema,original).ok)return null;
  const prior=original.decisions[0];
  if(!prior.dataQuestions?.length)return null;
  const props=request.responseFormat.schema.properties,dprops=props.decisions.items.properties;
  const qschema=dprops.dataQuestions.items;
  const questions=clone(prior.dataQuestions),restored=[];
  const assigned=request.promptNodes.find(n=>n.kind==='author_original_question_contract');
  // A saved child proposal cannot erase its author's selected inquiry from the
  // next command ledger. Append exact current-source records without renumbering
  // existing entries or rewriting the immutable paid proposal. No Host answer,
  // classification guess, evidence promotion or Plan operation is introduced.
  if(assigned?.version===2&&assigned.questionSource&&Array.isArray(assigned.questionRecords)){
    for(const question of assigned.questions){
      if(questions.some(q=>q.question===question))continue;
      const matches=assigned.questionRecords.filter(q=>q.question===question);
      if(matches.length!==1||!validate(qschema,matches[0]).ok)
        throw Error('ROSTER_AUTHOR_ASSIGNED_QUESTION_LEDGER_INVALID');
      const value=clone(matches[0]);questions.push(value);
      restored.push({questionNumber:questions.length,value:clone(value),source:clone(assigned.questionSource)});
    }
  }
  const decisionProps=Object.fromEntries(Object.entries(dprops).filter(([key])=>key!=='dataQuestions'));
  const schema=obj({action:{...clone(props.action),enum:['read','catalogue','decide']},publicReason:clone(props.publicReason),
    reads:clone(props.reads),catalogueQueries:clone(props.catalogueQueries),
    questionUpdates:{type:'array',minItems:0,items:obj({questionNumber:{type:'integer',minimum:1,maximum:questions.length},
      classification:clone(qschema.properties.classification),publicReason:clone(qschema.properties.publicReason),
      evidenceNumbers:clone(qschema.properties.evidenceNumbers)})},
    newQuestions:{type:'array',minItems:0,items:clone(qschema)},
    decision:{anyOf:[obj(clone(decisionProps)),{type:'null'}]}});
  const version=restored.length?'1.2.0':'1.1.0';
  const contract=createStarcraftTmgOutputContractV1({id:'roster.workflow_author_command',version,
    schemaName:'roster_workflow_author_command_v1',providerSchema:schema,
    modelOwnedFields:Object.keys(schema.properties),hostOwnedFields:['artifactRef','acceptanceGranted'],
    mapperRef:{id:'roster.author_command',version,hash:hash(restored.length?'roster.author_command.v1.2':'roster.author_command.v1.1')},
    semanticValidatorRef:{id:'roster.workflow_read_role_semantics',version:'1.0.0',hash:hash('roster.workflow_read_role_semantics.v1')},
    description:'Explicit model-owned next operation plus numbered ledger updates; same downstream semantic, Builder and source gates.'});
  const node={kind:'strategy_semantic_repair',version:3,originalReplyRef,
    stage:restored.length?'scope_reconciliation':correcting?'correction':'source_confirmation',
    questions:questions.map((q,i)=>({questionNumber:i+1,...clone(q)})),
    priorOperation:{disposition:prior.disposition,nextInvestigation:clone(prior.nextInvestigation)},
    instruction:'AUTHOR DECISION COMMAND: use decide with one explicit decision (operation, public reason, sources, alternatives, mutation, strategicChanges and nextInvestigation). Patch only changed ledger entries using questionUpdates; unlisted entries remain EXACTLY unchanged, and newQuestions append after the existing numbered entries. Never delete a necessary unknown. This is not an old full decisions envelope to copy. Returned author choices need your concrete choice or a genuinely missing prerequisite, not the same factual existence inquiry. Current army authority remains current; an available candidate can be read and selected/rejected, but is not yet adopted. An army/Plan change must use the actual structured mutation; no silent Host edits or approval. Read/catalogue use decision=null, questionUpdates=[],newQuestions=[]; they do not authorize a new experiment. Actual new evidence may change your mind. The original rejected reply remains stored in the exact context source; it is not the current answer template. Final budget/strategy checks remain mandatory. You own the pending strategic questions in this ledger after the fact investigation returns. The completed child investigation bounds its evidence, not your authority to make the next army/Plan choice. Retaining a supported current choice is valid, but repeating that a required choice belongs to a future author does not make that choice. Current fixed/editable roster authority still applies; this command grants no additional editing permission.'};
  const promptNodes=request.promptNodes.map(n=>{
    if(n.kind==='strategy_author_handoff'){
      const {priorRejectedDecision,...remaining}=n;
      return {...remaining,priorRejectedDecisionBodyOmitted:true};
    }
    if(n.kind==='evidence_delivery_handoff'){
      const {pendingProposal,...remaining}=n;
      return {...remaining,pendingProposalBodyOmitted:true};
    }
    if(n!==feedback)return n;
    const {originalOutput,...remaining}=n;
    return {...remaining,originalOutputIsHostProjectionState:true};
  });
  if(restored.length){
    node.restoredOriginalQuestions=clone(restored);
    node.instruction+=' This is ORIGINAL QUESTION RECONCILIATION, not approval or confirmation of the prior choice. The prior proposal omitted an actually assigned factual predicate. It is restored as an unresolved source-authored ledger entry, with its exact prior classification/reason, NOT as a new fact or a Host decision. Existing entries and indices are unchanged. Explicitly address the restored question; accepting uncertainty in a different choice entry does not answer it. Use the questionNumber shown in THIS command ledger for updates and nextInvestigation, not an older source\'s numbering. Original missing predicates: '+JSON.stringify(restored.map(r=>({questionNumber:r.questionNumber,question:r.value.question})))+'. '+assigned.instruction;
  }else if(!correcting)node.instruction+=' This is NORMAL SOURCE CONFIRMATION, not an error-repair turn. The ledger is reconstructed with the original saved command mapper; the pending proposal is not accepted. Use the newly delivered sources to confirm or change your operation and only the affected question entries. The same source, semantic and Builder checks remain; no source-read or proposal is automatically a fact.';
  const next={...request,promptNodes:[...promptNodes,node],
    strategyRepairState:{originalOutput:clone(original),originalResponseFormat:clone(request.responseFormat),
      ...(restored.length?{retainedQuestionLedger:clone(questions),originalQuestionRestorations:clone(restored)}:{})},
    userMessage:node.instruction,
    responseFormat:{kind:'provider_strict_json_schema',schemaName:contract.schemaName,
      outputContractRef:outputContractRefStarcraftTmgV1(contract),schema}};
  next.contextHash=hash({priorContextHash:request.contextHash,promptNodes:next.promptNodes,userMessage:next.userMessage,
    responseFormat:next.responseFormat,projectionSourceHash:hash(next.strategyRepairState)});
  return next;
}

export function projectRosterAuthorCommandV1({request,output}){
  const reject=(code,details={})=>({output:null,projection:[],errors:[{code,...details}]});
  const checked=validate(request.responseFormat.schema,output);
  if(!checked.ok)return reject('author_command_schema',{issues:checked.issues});
  const state=request.strategyRepairState;
  if(!state?.originalOutput||!state.originalResponseFormat)return reject('author_command_projection_state_missing');
  if(['read','catalogue'].includes(output.action)){
    if(output.decision||output.questionUpdates.length||output.newQuestions.length)return reject('author_command_read_and_write_mixed');
    return {output:{action:output.action,publicReason:output.publicReason,reads:clone(output.reads),
      catalogueQueries:clone(output.catalogueQueries),decisions:[]},projection:[],errors:[]};
  }
  if(!output.decision||output.reads.length||output.catalogueQueries.length)return reject('author_command_decision_required');
  const original=state.originalOutput,questions=clone(state.retainedQuestionLedger??original.decisions[0].dataQuestions),seen=new Set();
  const projection=(state.originalQuestionRestorations??[]).map(r=>({to:`/decisions/0/dataQuestions/${r.questionNumber-1}`,
    original:null,value:clone(r.value),source:clone(r.source),rule:'retained_original_assignment_question_v1'}));
  for(const patch of output.questionUpdates){
    if(seen.has(patch.questionNumber))return reject('author_command_duplicate_question_update');
    seen.add(patch.questionNumber);
    const index=patch.questionNumber-1,{questionNumber,...update}=patch;
    projection.push({to:`/decisions/0/dataQuestions/${index}`,original:clone(questions[index]),
      value:{...questions[index],...clone(update)},rule:'model_authored_question_update_v1'});
    questions[index]={...questions[index],...clone(update)};
  }
  const names=new Set(questions.map(q=>q.question));
  for(const question of output.newQuestions){
    if(names.has(question.question))return reject('author_command_duplicate_question_append');
    names.add(question.question);questions.push(clone(question));
    projection.push({to:`/decisions/0/dataQuestions/${questions.length-1}`,original:null,value:clone(question),rule:'model_authored_question_append_v1'});
  }
  const decision={...clone(output.decision),dataQuestions:questions};
  for(const [key,value]of Object.entries(output.decision))projection.push({to:`/decisions/0/${key}`,
    original:clone(original.decisions[0][key]),value:clone(value),rule:'model_authored_next_operation_v1'});
  return {output:{action:'finish',publicReason:output.publicReason,reads:[],catalogueQueries:[],decisions:[decision]},projection,errors:[]};
}
