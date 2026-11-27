// Fixed obligation identity belongs to Host; judgments and sources stay model-owned.
import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {createStarcraftTmgOutputContractV1,outputContractRefStarcraftTmgV1,
  validateStarcraftTmgProviderJsonSchemaValueV1 as validate} from '../structured-generation/output-contract-registry-v1.mjs';
const clone=structuredClone;

export function prepareRosterAssignedQuestionRequestV1(request,{assignment,handles}={}){
  if(request?.roundKind!=='roster_workflow_final_review'||assignment?.role!=='roster_workflow_final_review'
    ||request.assignedQuestionReviewState?.version===1)return request;
  const obligations=assignment.inputs?.review?.value?.obligations;
  if(!Array.isArray(obligations)||!handles?.entries?.length)return request;
  const byId=new Map(handles.entries.map(row=>[row.checkId,row.handle]));
  const bindings=obligations.filter(row=>row.originQuestionIds?.length&&typeof row.question==='string'&&row.question.length)
    .map(row=>({checkId:row.checkId,handle:byId.get(row.checkId),question:row.question}));
  if(!bindings.length)return request;
  if(bindings.some(row=>!row.handle)||new Set(bindings.map(row=>row.handle)).size!==bindings.length)
    throw Error('ROSTER_ASSIGNED_QUESTION_IDENTITY_INVALID');
  const schema=clone(request.responseFormat.schema),props=schema.properties;
  const check=props.checks?.items??props.checkPatches?.items?.properties?.replacement;
  const question=check?.properties?.dataQuestions?.items?.properties?.question;
  if(!question)return request;
  check.properties.dataQuestions.items.properties.question={anyOf:[question,{type:'null'}]};
  const repair=request.promptNodes.find(node=>node.kind==='review_semantic_repair'&&node.version===1);
  const state={version:1,workId:assignment.workId??assignment.id,bindings,
    identities:handles.entries.map(({checkId,handle})=>({checkId,handle})),
    originalResponseFormat:clone(repair?.originalResponseFormat??request.responseFormat)};
  const contract=createStarcraftTmgOutputContractV1({id:'roster.workflow_assigned_question_review',version:'1.0.0',
    schemaName:'roster_workflow_assigned_question_review_v1',providerSchema:schema,
    modelOwnedFields:Object.keys(props),hostOwnedFields:['artifactRef','acceptanceGranted','assignedQuestionText'],
    mapperRef:{id:'roster.assigned_question_identity',version:'1.0.0',hash:hash('roster.assigned_question_identity.v1')},
    semanticValidatorRef:{id:'roster.workflow_read_role_semantics',version:'1.0.0',hash:hash('roster.workflow_read_role_semantics.v1')},
    description:'Host binds a selected carried question only; all model verdicts, classifications, reasons and sources retain original validation.'});
  const instruction='For the assigned-question checks listed here, select the checkId and return exactly ONE dataQuestions row with question:null. Host restores the exact original question of that check; do not copy, paraphrase or invent its identity. You still supply classification, publicReason and evidenceNumbers. This null is identity selection, not an answer, missing fact or approval. Checks not listed here use ordinary explicit question text, never null. In checkPatches this applies only to the explicitly replaced checks; all unpatched saved checks remain unchanged. No verdict, classification, fact or source is supplied by Host.';
  return {...request,assignedQuestionReviewState:state,
    promptNodes:[...request.promptNodes,{kind:'assigned_question_identity',version:1,
      checks:bindings.map(({handle,question})=>({checkId:handle,question})),instruction}],
    responseFormat:{kind:'provider_strict_json_schema',schemaName:contract.schemaName,
      outputContractRef:outputContractRefStarcraftTmgV1(contract),schema}};
}

export function projectRosterAssignedQuestionOutputV1({request,wireOutput,output}){
  const state=request?.assignedQuestionReviewState;
  const unchanged=()=>({output,projection:[],errors:[]});
  if(state?.version!==1||output==null)return unchanged();
  const reject=(code,detail={})=>({output:null,projection:[],errors:[{code,...detail}]});
  const checked=validate(request.responseFormat.schema,wireOutput);
  if(!checked.ok)return reject('assigned_question_wire_schema',{issues:checked.issues});
  if(['read','catalogue'].includes(wireOutput.action))return unchanged();
  const patches=wireOutput.action==='repair';
  const rows=patches?wireOutput.checkPatches?.map(p=>({id:p.checkId,check:p.replacement}))
    :wireOutput.action==='finish'?wireOutput.checks?.map(check=>({id:check.checkId,check})):null;
  if(!Array.isArray(rows))return reject('assigned_question_operation_invalid');
  const identities=new Map(state.identities.flatMap(row=>[[row.handle,row.checkId],[row.checkId,row.checkId]]));
  const bindings=new Map(state.bindings.map(row=>[row.checkId,row]));
  const next=clone(output),projection=[],seen=new Set();
  for(const {id,check} of rows){
    const identity=identities.get(id);
    if(!identity||seen.has(identity))return reject('assigned_question_check_identity',{checkId:id});
    seen.add(identity);
    if(identities.get(check.checkId)!==identity)return reject('assigned_question_replacement_identity',{checkId:id});
    const binding=bindings.get(identity),questions=check.dataQuestions;
    if(!binding){
      if(questions?.some(q=>q.question===null))return reject('assigned_question_null_without_binding',{checkId:id});
      continue;
    }
    if(questions?.length!==1||questions[0].question!==null)
      return reject('assigned_question_requires_single_selection',{checkId:id});
    const indices=(next.checks??[]).flatMap((row,index)=>identities.get(row.checkId)===identity?[index]:[]);
    if(indices.length!==1)return reject('assigned_question_projected_check_missing',{checkId:id});
    const index=indices[0],target=next.checks[index];
    if(target.dataQuestions?.length!==1||target.dataQuestions[0].question!==null)
      return reject('assigned_question_projection_mismatch',{checkId:id});
    target.dataQuestions[0].question=binding.question;
    projection.push({to:'/checks/'+index+'/dataQuestions/0/question',original:null,value:binding.question,
      checkId:identity,rule:'host_assigned_question_identity_v1',semanticApprovalGranted:false});
  }
  // Patch merging retains the saved WIRE baseline, including Host-owned null
  // question handles. Restore those identities too, without changing any
  // unpatched judgment/reason/source. Only exact saved baseline rows qualify.
  if(patches){
    const baseline=request.promptNodes.find(n=>n.kind==='local_contract_feedback')?.originalOutput?.checks??[];
    for(const [index,target] of (next.checks??[]).entries()){
      const identity=identities.get(target.checkId);
      if(seen.has(identity)||!target.dataQuestions?.some(q=>q.question===null))continue;
      const binding=bindings.get(identity);
      const saved=baseline.filter(c=>identities.get(c.checkId)===identity);
      if(!binding||saved.length!==1||target.dataQuestions.length!==1
        ||saved[0].dataQuestions?.length!==1||saved[0].dataQuestions[0].question!==null)
        return reject('assigned_question_baseline_identity_missing',{checkId:target.checkId});
      target.dataQuestions[0].question=binding.question;
      projection.push({to:'/checks/'+index+'/dataQuestions/0/question',original:null,value:binding.question,
        checkId:identity,rule:'host_saved_baseline_question_identity_v1',semanticApprovalGranted:false});
    }
  }
  return {output:next,projection,errors:[]};
}
