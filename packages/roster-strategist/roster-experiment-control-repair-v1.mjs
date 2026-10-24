// Control repair is a model-owned command, not another experiment or a Host
// guess about which unknown is factual. Retain the exact proposed facts and
// let the unchanged source/coverage and release gates judge them afterwards.
import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {createStarcraftTmgOutputContractV1,outputContractRefStarcraftTmgV1,
  validateStarcraftTmgProviderJsonSchemaValueV1 as validate} from '../structured-generation/output-contract-registry-v1.mjs';
const clone=structuredClone;
const obj=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const text={type:'string',minLength:1,maxLength:65536};
export function prepareRosterExperimentControlRepairV1(request){
  const feedback=request.promptNodes.find(n=>n.kind==='local_contract_feedback'),original=feedback?.originalOutput;
  if(request.roundKind!=='roster_workflow_experiment_planner'||!feedback?.errors?.length
    ||!feedback.errors.every(e=>e.code==='experiment_answer_has_unresolved_necessary_facts')
    ||original?.action!=='conclude'||original.conclusion?.status!=='answered'||!original.unresolvedQuestions?.length)return null;
  const questionCount=original.unresolvedQuestions.length;
  const providerSchema=obj({operation:{...text,enum:['return_to_strategy','return_blocked','submit_scoped_answer']},publicReason:text,
    questionDispositions:{type:'array',minItems:questionCount,maxItems:questionCount,items:obj({
      questionNumber:{type:'integer',minimum:1,maximum:questionCount},
      classification:{...text,enum:['missing_local_fact','pending_strategy','outside_local_obligation','future_condition','optional_probe']},
      publicReason:text,evidenceNumbers:{type:'array',minItems:0,items:{type:'integer',minimum:1,maximum:1000000}}})}});
  const contract=createStarcraftTmgOutputContractV1({id:'roster.workflow_experiment_control_repair',version:'1.0.0',
    schemaName:'roster_experiment_control_repair_v1',providerSchema,modelOwnedFields:Object.keys(providerSchema.properties),
    hostOwnedFields:['artifactRef','acceptanceGranted'],
    mapperRef:{id:'roster.experiment_control_patch',version:'1.0.0',hash:hash('roster.experiment_control_patch.v1')},
    semanticValidatorRef:{id:'roster.workflow_read_role_semantics',version:'1.0.0',hash:hash('roster.workflow_read_role_semantics.v1')},
    description:'Explicit local conclusion/control choice; unchanged original facts and source/release validation.'});
  const assignment=request.promptNodes.find(n=>n.kind==='workflow_role_assignment');
  const inputs=Object.fromEntries(Object.entries(assignment?.inputs??{}).filter(([key])=>
    ['question','task','reviewIssues','localObligation','sourceReview','rejectedConclusion','comparisonPurpose'].includes(key)));
  const node={kind:'experiment_control_repair',version:1,originalReplyRef:feedback.originalReplyRef,
    originalConclusion:clone(original.conclusion),originalPublicReason:original.publicReason,
    questions:original.unresolvedQuestions.map((question,i)=>({questionNumber:i+1,question})),
    allowedEvidenceNumbers:clone(original.conclusion.evidenceNumbers),
    instruction:'Repair the CONTROL choice only. Choose return_to_strategy to hand off a scope dispute, pending strategic choice or unmet local fact, preserving the exact unresolved questions. Choose return_blocked only for a cited genuinely unavailable necessary local fact/capability. Choose submit_scoped_answer only if EVERY listed question is outside this exact local obligation, a future contingency or an optional probe; classify every original question with its exact number and public justification. Do not classify a promised local observation as outside merely because the proposed answer is narrower. A genuinely missing local fact stays missing. Questions outside this job remain unresolved with their original owners, not optional or answered globally. The old answer, numerical claims, citations and conditions are not rewritten by this command; if those need substantive changes, return_to_strategy. Cite only the originally delivered evidence numbers listed here. This command introduces no new facts, experiments, Plan edits or source approval. Normal validation, independent source review and global release gates still apply. Return the small command, never reproduce the old full conclude envelope.'};
  const next={...request,strategyRepairState:{originalResponseFormat:clone(request.responseFormat),originalOutput:clone(original)},
    promptNodes:[{kind:'workflow_role_assignment',workId:assignment?.workId,role:assignment?.role,inputs},node],
    userMessage:node.instruction,responseFormat:{kind:'provider_strict_json_schema',schemaName:contract.schemaName,
      outputContractRef:outputContractRefStarcraftTmgV1(contract),schema:providerSchema}};
  next.contextHash=hash({priorContextHash:request.contextHash,promptNodes:next.promptNodes,userMessage:next.userMessage,responseFormat:next.responseFormat});
  return next;
}
export function projectRosterExperimentControlRepairV1({request,output}){
  const reject=(code,detail={})=>({output:null,projection:[],errors:[{code,...detail}]});
  const original=request.strategyRepairState?.originalOutput;
  const checked=validate(request.responseFormat.schema,output);
  if(!checked.ok)return reject('experiment_control_command_schema',{issues:checked.issues});
  if(!original?.conclusion||!original.unresolvedQuestions?.length)return reject('experiment_control_original_missing');
  const rows=output.questionDispositions,seen=new Set(),allowed=new Set(original.conclusion.evidenceNumbers);
  for(const row of rows){
    if(seen.has(row.questionNumber))return reject('experiment_control_duplicate_question');
    seen.add(row.questionNumber);
    if(row.evidenceNumbers.some(n=>!allowed.has(n)))return reject('experiment_control_undelivered_source');
  }
  if(seen.size!==original.unresolvedQuestions.length)return reject('experiment_control_question_missing');
  if(output.operation==='submit_scoped_answer'&&rows.some(r=>['missing_local_fact','pending_strategy'].includes(r.classification)))
    return reject('experiment_control_answer_has_local_obligation');
  if(output.operation==='return_blocked'&&!rows.some(r=>r.classification==='missing_local_fact'))
    return reject('experiment_control_blocker_requires_missing_fact');
  const projected=clone(original),projection=[];
  const set=(target,key,value,path)=>{projection.push({to:path,original:clone(target[key]),value:clone(value),rule:'model_authored_experiment_control_v1'});target[key]=clone(value);};
  set(projected.conclusion,'status',{return_to_strategy:'strategy_required',return_blocked:'blocked',submit_scoped_answer:'answered'}[output.operation],'/conclusion/status');
  set(projected,'publicReason',output.publicReason,'/publicReason');
  const retained=rows.map(row=>`Question ${row.questionNumber} (${row.classification}): ${original.unresolvedQuestions[row.questionNumber-1]} — ${row.publicReason}`);
  set(projected.conclusion,'conditions',[...projected.conclusion.conditions,...retained],'/conclusion/conditions');
  if(output.operation==='submit_scoped_answer')set(projected,'unresolvedQuestions',[],'/unresolvedQuestions');
  return {output:projected,projection,errors:[]};
}
