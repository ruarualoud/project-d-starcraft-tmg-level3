import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {createStarcraftTmgOutputContractV1,outputContractRefStarcraftTmgV1,validateStarcraftTmgProviderJsonSchemaValueV1 as validate} from '../structured-generation/output-contract-registry-v1.mjs';
const clone=structuredClone;
const obj=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
// Knowledge and the author's dependency decision are separate. These exact
// pairs map to the existing ledger; no public-reason parsing, fact approval,
// release waiver or automatic strategic choice is performed here.
export const questionStates=[
  ['unresolved_fact','required_for_current_decision','necessary_fact',
    'A still-missing factual prerequisite required by an adopted current claim or explicit obligation. Unknown alone does not make it required; identify the actual dependency.'],
  ['unresolved_fact','conditional_future','future_condition',
    'Unproven future realization of an explicitly conditional intent. It remains unknown, not answered or refuted. Cannot waive a currently required rule, legality, payment or adopted measured claim.'],
  ['unresolved_fact','optional_investigation','optional_probe',
    'An unresolved additional experiment that is not a prerequisite to the current decision. State uncertainty and reopening conditions; no evidence of superiority is invented.'],
  ['answered_from_sources','answer_available','answered_fact',
    'An answer supported by the actually delivered sources under their exact scope. Still requires independent source and coverage review.'],
  ['author_choice','choice_still_required','author_decision',
    'The responsible author still needs to choose; a tool cannot choose the strategy for the author.'],
  ['author_choice','already_declared_in_plan','authored_choice',
    'The exact choice already exists in the current saved Plan. Cite its current Plan source; its existence is not proof of future results.'],
  ['author_choice','chosen_now','decided_here',
    'An explicit author choice in this reply with reasons and conditions. Changing saved Plan intent still requires a structured mutation.'],
];
export function authorQuestionStateSchema(){
  const choices=index=>({type:'string',minLength:1,maxLength:65536,
    enum:[...new Set(questionStates.map(row=>row[index]))]});
  return {...obj({knowledge:choices(0),decisionRole:choices(1)}),
    description:'Choose knowledge status AND its role in the current decision. Use one exact pair listed in questionStates; the mapper rejects all other combinations. An unresolved fact is not automatically a release-blocking prerequisite. The prior ledger label is not an instruction to preserve that dependency.'};
}


export function selectRosterAuthorQuestionStateV1(value){
 return questionStates.find(([knowledge,decisionRole])=>value?.knowledge===knowledge&&value?.decisionRole===decisionRole)??null;
}
const isQuestion=s=>s?.type==='object'&&s.properties?.publicReason&&s.properties?.evidenceNumbers
 &&s.properties.classification?.enum?.length===questionStates.length
 &&questionStates.every(row=>s.properties.classification.enum.includes(row[2]));
// Only the exact existing question-state enum is transformed; arbitrary model
// classifications, fact slots, check verdicts and legacy stored replies are not.
export function prepareRosterAuthorQuestionStateV1(request){
 if(request.roundKind!=='roster_workflow_strategy_decision'||request.authorQuestionState?.version===1)return request;
 const assigned=request.promptNodes.find(n=>n.kind==='workflow_role_assignment')?.role;
 if(assigned!=='roster_workflow_strategy_decision')return request;
 const schema=clone(request.responseFormat.schema),paths=[];
 const walk=(s,path)=>{if(!s||typeof s!=='object')return;
  if(isQuestion(s)){delete s.properties.classification;s.properties.questionState=authorQuestionStateSchema();
   s.required=s.required.map(k=>k==='classification'?'questionState':k);paths.push(path);}
  for(const [k,v]of Object.entries(s.properties??{}))walk(v,path+'/properties/'+k);
  if(s.items)walk(s.items,path+'/items');for(const [i,v]of (s.anyOf??[]).entries())walk(v,path+'/anyOf/'+i);
 };walk(schema,'');if(!paths.length)return request;
 const version='1.0.0',contract=createStarcraftTmgOutputContractV1({id:'roster.workflow_author_question_state',version,
  schemaName:'roster_workflow_author_question_state_v1',providerSchema:schema,
  modelOwnedFields:Object.keys(schema.properties),hostOwnedFields:['artifactRef','acceptanceGranted'],
  mapperRef:{id:'roster.author_question_state',version,hash:hash('roster.author_question_state.v1')},
  semanticValidatorRef:{id:'roster.workflow_read_role_semantics',version:'1.0.0',hash:hash('roster.workflow_read_role_semantics.v1')},
  description:'Explicit author knowledge and current decision dependency; exact legacy ledger mapping with unchanged source/semantic/release checks.'});
 const instruction='For every question emitted in THIS response schema, provide questionState={knowledge,decisionRole}, not classification. Select one exact listed pair. Existing ledger labels in context are history/semantic names, not instructions to preserve them. Decide separately whether the evidence answers the fact and whether the CURRENT adopted decision depends on that answer. An unknown future condition is not automatically a current prerequisite; a genuinely required legality/payment/adopted factual premise cannot be waived. Keep each question, rationale, citations and uncertainty. Host only maps your explicit pair, never answers or approves it. Required unresolved work still needs its authorized next step. All original evidence, permissions and release checks remain.';
 return {...request,authorQuestionState:{version:1,originalResponseFormat:clone(request.responseFormat),questionSchemaPaths:paths},
  promptNodes:[...request.promptNodes,{kind:'author_question_state_contract',version:1,
   questionStates:questionStates.map(([knowledge,decisionRole,classification,meaning])=>({knowledge,decisionRole,ledgerClassification:classification,meaning})),instruction}],
  userMessage:request.userMessage+'\n'+instruction,
  responseFormat:{kind:'provider_strict_json_schema',schemaName:contract.schemaName,outputContractRef:outputContractRefStarcraftTmgV1(contract),schema}};
}
export function projectRosterAuthorQuestionStateV1({request,output}){
 if(request.authorQuestionState?.version!==1)return {output,projection:[],errors:[]};
 const checked=validate(request.responseFormat.schema,output);
 if(!checked.ok)return {output:null,projection:[],errors:[{code:'author_question_state_schema',issues:checked.issues}]};
 const projection=[],errors=[];
 const walk=(s,v,path)=>{
  if(s.anyOf){
   // The complete wire was already validated by the registry. Its supported
   // unions are exactly nullable values or unique kind-tagged objects;
   // validating a bare null branch as a new root violates that registry API.
   if(s.anyOf.some(b=>b.type==='null'))return v===null?v:walk(s.anyOf.find(b=>b.type!=='null'),v,path);
   return walk(s.anyOf.find(b=>b.properties.kind.enum[0]===v.kind),v,path);
  }
  if(s.type==='array')return v.map((item,i)=>walk(s.items,item,path+'/'+i));
  if(s.type!=='object'||v===null)return v;
  const next={...v};
  if(s.properties?.questionState&&s.properties?.publicReason&&s.properties?.evidenceNumbers){
   const selected=selectRosterAuthorQuestionStateV1(v.questionState);
   if(!selected){errors.push({code:'author_question_state_invalid',path});return next;}
   delete next.questionState;next.classification=selected[2];
   projection.push({from:path+'/questionState',original:clone(v.questionState),value:selected[2],rule:'model_authored_question_state_v1',factApprovalGranted:false,planApprovalGranted:false});
  }
  for(const [k,b]of Object.entries(s.properties??{}))if(k!=='questionState'&&Object.hasOwn(v,k))next[k]=walk(b,v[k],path+'/'+k);
  return next;
 };
 const projected=walk(request.responseFormat.schema,output,'');
 return {output:errors.length?null:projected,projection,errors};
}

// Reconstruct only an explicit saved question-state pair at a canonical question
// schema path. This is transport normalization, not a new author classification.
export function projectRosterSavedAuthorQuestionsV1({schema,output}){
 const projection=[],errors=[];
 const walk=(s,v,path)=>{
  if(v===null||v===undefined)return v;
  if(s?.anyOf){const branches=s.anyOf.filter(b=>b.type!=='null');
   const branch=branches.length===1?branches[0]:branches.find(b=>b.properties?.kind?.enum?.includes(v.kind));
   return branch?walk(branch,v,path):v;}
  if(s?.type==='array'&&Array.isArray(v))return v.map((x,i)=>walk(s.items,x,path+'/'+i));
  if(s?.type!=='object'||typeof v!=='object'||Array.isArray(v))return v;
  const next={...v};
  if(isQuestion(s)&&Object.hasOwn(v,'questionState')){
   const selected=selectRosterAuthorQuestionStateV1(v.questionState);
   if(!selected||Object.keys(v.questionState??{}).some(k=>!['knowledge','decisionRole'].includes(k))
     ||Object.hasOwn(v,'classification')&&v.classification!==selected[2]){
    errors.push({code:'saved_author_question_state_conflict',path});return next;}
   delete next.questionState;next.classification=selected[2];
   projection.push({from:path+'/questionState',original:clone(v.questionState),value:selected[2],
    rule:'saved_explicit_author_question_state_v1',factApprovalGranted:false,planApprovalGranted:false});
  }
  for(const [k,b]of Object.entries(s.properties??{}))if(Object.hasOwn(next,k))next[k]=walk(b,next[k],path+'/'+k);
  return next;
 };
 const projected=walk(schema,output,'');return {output:errors.length?null:projected,projection,errors};
}
