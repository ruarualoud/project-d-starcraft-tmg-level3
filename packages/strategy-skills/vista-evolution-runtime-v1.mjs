import {buildVistaReadWindowV1,VISTA_READING_TRANSPORT_V1} from './vista-read-window-v1.mjs';
import {normalizePostgameLearningContextV1,projectPostgameLearningModelContextV1} from './postgame-development-feedback-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {compileVistaPolicyProgramV1,assertVistaPolicyProgramV1} from './vista-planner-policy-v1.mjs';
import {projectPostgameEvaluationFeedbackV1} from './postgame-learning-impact-v1.mjs';
const copy=v=>structuredClone(v),need=(v,c)=>{if(!v)throw Object.assign(new Error(c),{code:c})};
const operationNames=['read','explore','submit','retain'];
// Formatting is Host-owned. Never infer a missing choice or merge two choices.
export function normalizeVistaOperationReplyV1(raw){
 need(raw&&typeof raw==='object'&&!Array.isArray(raw),'VISTA_ONE_OPERATION_REQUIRED');
 const direct=operationNames.filter(k=>Object.hasOwn(raw,k));
 const wrapped=raw.operation;
 need(!(direct.length&&wrapped),'VISTA_ONE_OPERATION_REQUIRED');
 let kind,value;
 if(wrapped){need(operationNames.includes(wrapped.kind),'VISTA_ONE_OPERATION_REQUIRED');kind=wrapped.kind;const {kind:ignored,...body}=wrapped;value=body;}
 else{need(direct.length===1,'VISTA_ONE_OPERATION_REQUIRED');kind=direct[0];value=copy(raw[kind]);}
 need(value&&typeof value==='object'&&!Array.isArray(value),'VISTA_ONE_OPERATION_REQUIRED');
 value=copy(value);
 if(value.program?.schemaVersion==='starcraft_vista_policy_program_v1')delete value.program.schemaVersion;
 return {[kind]:value};
}
// The Meta agent can develop a candidate but cannot choose evaluation cases,
// seeds, opponent, objective, Rules or outcomes. All progress is durable CAS.
export function createVistaEvolutionRuntimeV1({store,metaPort,developmentPort,evaluationMatrix}){
 async function save(r,fields){const n={...r,...copy(fields),revision:r.revision+1,updatedAt:new Date().toISOString()};need((await store.commit(r.reviewId,r.revision,n)).ok,'VISTA_COMMIT_CONFLICT');return n}
 async function read(id){const r=await store.load(id);need(r?.schemaVersion==='starcraft_vista_evolution_v1','VISTA_RUN_MISSING');return r}
 async function create(record){const old=await store.load(record.reviewId);if(old){need(old.inputHash===record.inputHash,'VISTA_IMMUTABLE_INPUT_CHANGED');return old}need((await store.commit(record.reviewId,null,record)).ok,'VISTA_CREATE_CONFLICT');return record}
 async function start({id,ownerSeat,baselineBundle,baselineProgram,development,evaluation,roundLimit,learningContext}){
  need(['player1','player2'].includes(ownerSeat)&&Number.isSafeInteger(roundLimit)&&roundLimit>0,'VISTA_CAMPAIGN_SCOPE_REQUIRED');
  assertVistaPolicyProgramV1(baselineProgram);
  need(development?.length&&new Set(development.map(d=>d.handle)).size===development.length&&development.every(d=>d.handle&&d.ancestryGroup),'VISTA_DEVELOPMENT_CATALOGUE_REQUIRED');
  need(evaluation?.subjectSeat===ownerSeat&&evaluation.cases?.every(c=>!development.some(d=>d.ancestryGroup===c.source.ancestryGroup)),'VISTA_EVALUATION_ISOLATION_REQUIRED');
  need(!Object.hasOwn(evaluation,'bundles')&&!Object.hasOwn(evaluation,'id')&&evaluation.opponentBundle,'VISTA_HOST_EVALUATION_SPEC_REQUIRED');
  const context=normalizePostgameLearningContextV1(learningContext);
  const input=copy({ownerSeat,baselineBundle,baselineProgram,development,evaluation,roundLimit,...(context?{learningContext:context}:{})});
  const first={id:id+':version:baseline',parents:[],program:baselineProgram,bundle:baselineBundle,decision:'incumbent',reason:'initial frozen policy'};
  return create({reviewId:id,revision:0,schemaVersion:'starcraft_vista_evolution_v1',input,inputHash:hash(input),status:'developing',round:0,versions:[first],incumbentId:first.id,pending:null,delivered:[],events:[],updatedAt:new Date().toISOString(),trainingTruth:false});
 }
 function observation(r){
  const incumbent=r.versions.find(v=>v.id===r.incumbentId);
  const workspace=buildVistaReadWindowV1(r,workspacePages(r));
  return {schemaVersion:'vista_meta_request_v4',readingTransport:VISTA_READING_TRANSPORT_V1,reading:workspace.reading,ownerSeat:r.input.ownerSeat,round:r.round,
   ...(workspace.context?{learningContext:workspace.context}:{}),
   workspaceCatalogue:workspace.roots,
   memoryLearning:{mode:'fixed_model_numerical_retrieval',available:Boolean(incumbent.bundle.memento2Policy),feedbackSteps:incumbent.bundle.memento2Policy?.feedbackSteps??0,
    interpretation:'A retrieved state/action/outcome case and its learned value are memory; an absent prose lesson does not mean training failed. Measure the frozen policy in decisions. Do not fabricate experience or rewrite the numerical training record.'},
   task:'检查开发轨迹及图像，提出可证伪的操作假设，必要时主动探索；把所得改动写入可继承的策略程序。测试无改善可以保留。不得改Rules、评价范围或把诊断当自主胜利。只给公开理由。',
   programmeContract:{type:'object',required:['instructions','memory','skillOrder','beforePlanning'],additionalProperties:false,
    properties:{instructions:{type:'string',description:'Your conditional strategy'},memory:{type:'string',description:'Conditions, observed experience and limits'},
     skillOrder:{type:'array',items:{type:'string'},description:'Only existing skill IDs; empty is allowed'},
     beforePlanning:{type:'array',maxItems:8,items:{oneOf:[
      {type:'object',required:['operation'],additionalProperties:false,properties:{operation:{const:'observe_board'}}},
      {type:'object',required:['operation','subject','target','intent'],additionalProperties:false,properties:{operation:{const:'read_relationships'},subject:{const:'own_on_field'},target:{enum:['enemy_on_field','mission_markers']},intent:{type:'string',description:'Your query purpose'},whenActionTypes:{type:'array',items:{type:'string'},description:'Optional filter using actual action types. Omit to always query. Use two operations to query both target categories.'}}},
      {type:'object',required:['operation','text','limit'],additionalProperties:false,properties:{operation:{const:'recall'},text:{type:'string'},limit:{type:'integer',minimum:1,maximum:12}}}
     ]}}}},
   operations:{read:{handle:'development or workspace catalogue handle'},explore:{handle:'development scene handle',hypothesis:'condition, intended choice and measurable consequence',parentVersion:'visible parent version; omit for incumbent baseline diagnosis',program:'optional programmeContract; when present Host compares parent and this intervention with identical conditions'},submit:{parentVersion:'one visible version ID',program:'programmeContract',reason:'intended effect and observed support/limits'},retain:{reason:'why stop this comparison'}},
   catalogue:r.input.development.map(({handle,label,ancestryGroup,canExplore})=>({handle,label,ancestryGroup,canExplore})),
   correction:copy(r.lastSemanticCorrection||null),
   versions:r.versions.map(({id,parents,program,decision,reason,evaluationId,evaluationFeedback})=>({id,parents,program,decision,reason,evaluationId,...(evaluationFeedback?{evaluationFeedback}:{})})),incumbentId:r.incumbentId,delivered:workspace.active,readingHistory:workspace.history,
   evaluationContract:{hiddenCaseCount:r.input.evaluation.cases.length,seeds:r.input.evaluation.seeds.length,repetitions:r.input.evaluation.repetitions||1,horizon:r.input.evaluation.horizon,criterion:r.input.evaluation.criterion},
   responseFormat:{learning:'Return exactly one key: read, explore, submit, or retain; its value follows operations above.',example:{read:{handle:'one catalogue handle'}}},
   instruction:'自行发现值得调查的行为与结果，不要求某种主题或战术答案。可先读当前技能和记忆能力，再根据实际开发轨迹及图像形成干预；结合探索反馈比较新旧选择，保留反例与被拒方案，必要时修订后再试。只有收到执行结果才表示已做实验，读取历史不是探索。一次只选一个操作，learning 内使用操作名作为唯一键。资料目录不是正文；可读取其子句柄，旧资料不在当前窗口时可以回读。已在当前窗口的同一页不要连续重复读取；同一假设无新证据不重复试。explore所选场景未读取时，Host先保存该场景的事实再执行同一假设，不代替你作策略结论。submit时只写语义程序，Host绑定版本/来源和执行。独立评价不接受你填写分数。'};
 }
 function workspacePages(r){
  const v=r.versions.find(v=>v.id===r.incumbentId);
  return v.bundle.entries.map(({skill})=>({handle:'skill:'+v.id+':'+skill.skillId,kind:'skill',title:skill.skillId,
   body:{skillId:skill.skillId,version:skill.version,procedure:copy(skill.procedure||[]),knowledge:copy(skill.knowledge||[]),skillOptAdvisories:copy(skill.skillOptAdvisories||[]),authority:'existing_advisory_not_rules'}})).concat(v.bundle.memento2Policy?[{
    handle:'memory:'+v.id,kind:'memory',title:'Frozen learned retrieval policy',body:copy(v.bundle.memento2Policy),
   }]:[]);
 }
 async function advanceOne(id){
  let r=await read(id);if(['complete','budget_boundary','needs_attention'].includes(r.status))return r;
  if(r.status==='evaluating'){
   const version=r.versions.find(v=>v.id===r.pendingVersionId);
   const matrixId=id+':evaluation:'+r.round;
   const {opponentBundle,...spec}=r.input.evaluation;
   const incumbent=r.versions.find(v=>v.id===r.incumbentId);
   const existingMatrix=await store.load(matrixId);
   // Register before any evaluation rollout. Preserve older persisted matrices
   // exactly: absent historical coverage remains inconclusive, never a loss.
   const opportunity=spec.opportunity||existingMatrix?.input?.opportunity||(!existingMatrix?{
    schemaVersion:'postgame_strategy_opportunity_v1',decisionScope:'all_planner_choices_v1',minimumDecisions:1,
    requiredCandidateEvidence:{kind:'vista_program'}
   }:undefined);
   await evaluationMatrix.create({...copy(spec),...(opportunity?{opportunity}:{}),id:matrixId,discoveryGroups:[...new Set(r.input.development.map(d=>d.ancestryGroup))],bundles:{baseline:incumbent.bundle,candidate:version.bundle,opponent:opponentBundle}});
   let matrix=await evaluationMatrix.step(matrixId);
   if(matrix.status!=='complete')return r;
   const result=await store.load(matrix.evaluationId);need(result?.candidateHash===hash(version.bundle),'VISTA_EVALUATION_CANDIDATE_CHANGED');
   const accepted=result.decision==='supported_in_tested_matrix';
   const versions=r.versions.map(v=>v.id===version.id?{...v,decision:accepted?'selected':'rejected_retained',evaluationId:matrix.evaluationId,reason:result.decision,evaluationFeedback:projectPostgameEvaluationFeedbackV1(result)}:v);
   return save(r,{versions,incumbentId:accepted?version.id:r.incumbentId,pendingVersionId:null,round:r.round+1,status:r.round+1>=r.input.roundLimit?'budget_boundary':'developing',events:[...r.events,{kind:'formal_evaluation',versionId:version.id,evaluationId:matrix.evaluationId,decision:result.decision}]});
  }
  let op=r.pending?await store.load(r.pending):null;
  if(!op){const request=observation(r);const oid=id+':meta:'+hash({round:r.round,events:r.events,delivered:r.delivered.map(d=>d.operationId)});op=await create({reviewId:oid,revision:0,inputHash:hash(request),request,status:'prepared',updatedAt:new Date().toISOString()});r=await save(r,{pending:oid})}
  if((op.status==='sending'||op.status==='failed_http_rejected'&&op.readWindowRecovery?.transport===VISTA_READING_TRANSPORT_V1)&&metaPort.readCall){
   const prior=await metaPort.readCall({callId:op.request.callId||hash(op.request),kind:'vista_meta'});
   if(prior.status==='completed')op=await save(op,{status:'replied',reply:copy(prior.result),recovery:{kind:'saved_provider_reply',newProviderRequest:false}});
   else if(prior.status==='completed_http_rejected'&&prior.httpStatus===400&&op.request.readingTransport!==VISTA_READING_TRANSPORT_V1&&(!op.readWindowRecovery||op.readWindowRecovery.transport===VISTA_READING_TRANSPORT_V1)){
    // Preserve the rejected request and unknown billing. Only a versioned,
    // changed transport can make this one controlled recovery request.
    const previous=op;if(!op.readWindowRecovery)await save(op,{status:'failed_http_rejected',readWindowRecovery:{transport:VISTA_READING_TRANSPORT_V1,provider:copy(prior)}});
    const request=observation(r),oid=previous.reviewId+':read-window-v1';
    op=await create({reviewId:oid,revision:0,inputHash:hash(request),request,status:'prepared',updatedAt:new Date().toISOString(),recovery:{fromOperation:previous.reviewId,kind:'lossless_read_window',oldBillingPreserved:true}});
    r=await save(r,{pending:oid,events:[...r.events,{kind:'read_window_transport_recovery',fromOperation:previous.reviewId,operationId:oid}]});
   }
   else if(prior.status==='retryable_local_rejection')op=await save(op,{status:'prepared',recovery:{kind:'known_local_pre_dispatch_rejection',priorReason:prior.reason}});
  }
  need(op.status!=='sending','VISTA_PROVIDER_OUTCOME_UNKNOWN');
  if(op.status==='prepared'){
   op=await save(op,{status:'sending'});
   const reply=await metaPort.send(copy(op.request));
   op=await save(op,{status:'replied',reply:copy(reply)});
  }
  need(op.status==='replied','VISTA_REPLY_UNAVAILABLE');
  const reply=normalizeVistaOperationReplyV1(op.reply);
  if(!op.compiledReply)op=await save(op,{compiledReply:copy(reply),normalization:{kind:'host_single_semantic_operation_v1',newProviderRequest:false}});
  if(reply.read||reply.explore){
   const kind=reply.read?'read':'explore',value=reply[kind];
   need(Object.keys(value).every(k=>kind==='read'?k==='handle':['handle','hypothesis','parentVersion','program'].includes(k)),'VISTA_DEVELOPMENT_BINDING_FORBIDDEN');
   const window=op.request.readingTransport===VISTA_READING_TRANSPORT_V1?buildVistaReadWindowV1(r,workspacePages(r)):null;
   // Development handles remain stable aliases for their saved original page.
   // Rereading an old scene must not execute it again or become a correction.
   const savedSource=window?.history.find(h=>h.kind==='read'&&h.semantic?.handle===value.handle);
   const workspace=kind==='read'&&(window?(window.pages.get(value.handle)||window.pages.get(savedSource?.handle)):op.request.workspaceCatalogue?.some(p=>p.handle===value.handle)&&workspacePages(r).find(p=>p.handle===value.handle));
   if(workspace){
    const last=r.delivered.at(-1),lastHandle=last?.result?.handle||last?.semantic?.handle;
    need(window?!(lastHandle===workspace.handle&&op.request.reading.attachedHandles.includes(workspace.handle)):!r.delivered.some(d=>d.kind==='read'&&d.semantic.handle===value.handle),'VISTA_REPEATED_NO_PROGRESS');
    const result=op.operationResult||(window?{status:'complete',kind:'vista_workspace_page',handle:workspace.handle,page:copy(workspace),ownerSeat:r.input.ownerSeat}:{status:'complete',kind:'strategy_workspace',handle:workspace.handle,body:copy(workspace.body),ownerSeat:r.input.ownerSeat});
    if(!op.operationResult)op=await save(op,{operationResult:result});
    return save(r,{pending:null,lastSemanticCorrection:null,delivered:[...r.delivered,{kind,operationId:op.reviewId,semantic:value,result}],events:[...r.events,{kind:'workspace_read',operationId:op.reviewId}]});
   }
   const source=r.input.development.find(d=>d.handle===value.handle);need(source,'VISTA_HIDDEN_SOURCE_FORBIDDEN');
   need(!r.delivered.some(d=>d.kind===kind&&hash(d.semantic)===hash(value)),'VISTA_REPEATED_NO_PROGRESS');
   if(kind==='explore')need(source.canExplore===true&&typeof value.hypothesis==='string'&&value.hypothesis.trim(),'VISTA_EXPLORATION_HYPOTHESIS_REQUIRED');
   let probe = null;
   if(kind==='explore' && ['vista_meta_request_v2','vista_meta_request_v3','vista_meta_request_v4'].includes(op.request.schemaVersion)){
    const parent=r.versions.find(v=>v.id===(value.parentVersion||r.incumbentId));
    need(parent,'VISTA_PARENT_NOT_VISIBLE');
    if(value.program){
     if(!r.delivered.some(d=>d.result?.sourceHandle===source.handle)){
      // Read the chosen scene as an execution dependency. The hypothesis and
      // programme remain exactly the model's; this is not a new Meta decision.
      const observed=op.prerequisiteRead||await developmentPort.read({source:copy(source),ownerSeat:r.input.ownerSeat,operationId:op.reviewId+':source'});
      need(observed.status==='complete'&&observed.sourceHandle===source.handle&&observed.ownerSeat===r.input.ownerSeat,'VISTA_DEVELOPMENT_RESULT_SCOPE');
      if(!op.prerequisiteRead)op=await save(op,{prerequisiteRead:copy(observed)});
      return save(r,{delivered:[...r.delivered,{kind:'read',operationId:op.reviewId+':source',semantic:{handle:source.handle},hostPrerequisite:true,result:copy(observed)}],events:[...r.events,{kind:'source_dependency_read',operationId:op.reviewId+':source'}]});
     }
     const program=compileVistaPolicyProgramV1(value.program);
     const skills=new Set(parent.bundle.entries.map(e=>e.skill.skillId));
     need(program.skillOrder.every(s=>skills.has(s)),'VISTA_SKILL_NOT_AVAILABLE');
     need(program.programHash!==parent.program.programHash,'VISTA_UNCHANGED_CANDIDATE');
     const {hash:oldHash,...body}=copy(parent.bundle),changed={...body,vistaProgram:program};
     const candidateBundle=oldHash?{...changed,hash:hash(changed)}:changed;
     probe={comparison:{baselineBundle:parent.bundle,candidateBundle}};
    }else probe={baselineBundle:parent.bundle};
    const experimentIdentity=hash({source:source.handle,...probe});
    need(!r.delivered.some(d=>d.experimentIdentity===experimentIdentity),'VISTA_REPEATED_NO_PROGRESS');
    probe={...probe,experimentIdentity,...(['vista_meta_request_v3','vista_meta_request_v4'].includes(op.request.schemaVersion)?{evidencePolicy:'boundary_pair_v1'}:{})};
   }
   // Saved v1 requests retain their original diagnostic contract. Completed
   // operations are never regenerated under a new interpretation.
   const result=op.operationResult|| (kind==='read'?await developmentPort.read({source:copy(source),ownerSeat:r.input.ownerSeat,operationId:op.reviewId}):await developmentPort.explore({source:copy(source),ownerSeat:r.input.ownerSeat,hypothesis:value.hypothesis,operationId:op.reviewId,...copy(probe||{})}));
   if(result.status==='running')return r;
   need(result.sourceHandle===source.handle&&result.ownerSeat===r.input.ownerSeat,'VISTA_DEVELOPMENT_RESULT_SCOPE');
   if(!op.operationResult)op=await save(op,{operationResult:copy(result)});
   return save(r,{pending:null,delivered:[...r.delivered,{kind,operationId:op.reviewId,semantic:value,...(probe?{experimentIdentity:probe.experimentIdentity}:{}),result:copy(result)}],events:[...r.events,{kind,operationId:op.reviewId}]});
  }
  if(reply.retain){need(Object.keys(reply.retain).every(k=>k==='reason'),'VISTA_HOST_BINDING_NOT_MODEL_FIELD');need(typeof reply.retain.reason==='string'&&reply.retain.reason.trim(),'VISTA_RETAIN_REASON_REQUIRED');return save(r,{status:'complete',pending:null,events:[...r.events,{kind:'retain',reason:reply.retain.reason}]})}
  const s=reply.submit;need(s&&Object.keys(s).every(k=>['parentVersion','program','reason'].includes(k))&&typeof s.reason==='string'&&s.reason.trim(),'VISTA_SUBMIT_REQUIRED');
  const parent=r.versions.find(v=>v.id===s.parentVersion);need(parent,'VISTA_PARENT_NOT_VISIBLE');
  need(r.delivered.some(d=>d.result?.sourceHandle||d.result?.probeKind),'VISTA_OBSERVE_BEFORE_INTERVENE');
  const program=compileVistaPolicyProgramV1(s.program);const skillIds=new Set(parent.bundle.entries.map(e=>e.skill.skillId));need(program.skillOrder.every(x=>skillIds.has(x)),'VISTA_SKILL_NOT_AVAILABLE');
  need(program.programHash!==parent.program.programHash,'VISTA_UNCHANGED_CANDIDATE');
  const {hash:oldBundleHash,...bundleBody}=copy(parent.bundle);const nextBundle={...bundleBody,vistaProgram:program};
  const bundle=oldBundleHash?{...nextBundle,hash:hash(nextBundle)}:nextBundle;
  const body={parents:[parent.id],program,bundle,reason:s.reason,developmentOperationIds:r.delivered.map(d=>d.operationId)};
  const version={...body,id:id+':version:'+hash(body),decision:'frozen_pending_evaluation'};
  return save(r,{pending:null,pendingVersionId:version.id,status:'evaluating',versions:[...r.versions,version],events:[...r.events,{kind:'freeze_candidate',versionId:version.id}]});
 }

 const semanticErrors=new Set(['VISTA_ONE_OPERATION_REQUIRED','VISTA_DEVELOPMENT_BINDING_FORBIDDEN','VISTA_HIDDEN_SOURCE_FORBIDDEN','VISTA_REPEATED_NO_PROGRESS','VISTA_EXPLORATION_HYPOTHESIS_REQUIRED','VISTA_RETAIN_REASON_REQUIRED','VISTA_SUBMIT_REQUIRED','VISTA_PARENT_NOT_VISIBLE','VISTA_OBSERVE_BEFORE_INTERVENE','VISTA_SKILL_NOT_AVAILABLE','VISTA_UNCHANGED_CANDIDATE','VISTA_POLICY_FIELDS_INVALID','VISTA_POLICY_TEXT_REQUIRED','VISTA_POLICY_SKILLS_INVALID','VISTA_BOUNDED_PROGRAM_REQUIRED','VISTA_POLICY_CAPABILITY_FORBIDDEN','VISTA_HOST_BINDING_NOT_MODEL_FIELD','VISTA_RELATIONSHIP_PROGRAM_INVALID','VISTA_ACTION_CONDITION_INVALID','VISTA_RECALL_PROGRAM_INVALID']);
 async function advance(id){
  try{
   const stopped=await read(id);
   if(stopped.status==='needs_attention'&&stopped.lastStop?.code==='VISTA_ONE_OPERATION_REQUIRED'){
    const prior=await store.load(stopped.lastSemanticCorrection.operationId);
    // A paid, unconsumed answer can be recovered after a Host format fix.
    // Original failures/counters stay intact; no general retry/reset path.
    if(prior?.status==='replied'){
     normalizeVistaOperationReplyV1(prior.reply);
     await save(stopped,{status:'developing',pending:prior.reviewId,lastStop:null,
      events:[...stopped.events,{kind:'saved_operation_format_recovery',operationId:prior.reviewId,newProviderRequest:false}]});
    }
   }
   return await advanceOne(id)
  }catch(error){
   if(!semanticErrors.has(error.code))throw error;
   const r=await read(id),op=r.pending?await store.load(r.pending):null;
   if(op?.status!=='replied')throw error;
   let consecutive=1;for(const event of [...r.events].reverse()){if(event.kind!=='semantic_rejection')break;consecutive++}
   const feedback={code:error.code,operationId:op.reviewId,reply:copy(op.reply),expectedFormat:'learning: {read: {handle}} OR {explore: {handle,hypothesis,parentVersion,program}} OR {submit: {parentVersion,program,reason}} OR {retain: {reason}}',instruction:'仅修正本操作的语义选择；已读证据、策略版本和评价范围保持。不要重做已完成探索。'};
   return save(r,{pending:null,lastSemanticCorrection:feedback,status:consecutive>=3?'needs_attention':r.status,
    events:[...r.events,{kind:'semantic_rejection',operationId:op.reviewId,code:error.code}],lastStop:consecutive>=3?{reason:'three_consecutive_invalid_operations',code:error.code}:null});
  }
 }
 return Object.freeze({start,advance,read,observation:async id=>observation(await read(id))});
}
