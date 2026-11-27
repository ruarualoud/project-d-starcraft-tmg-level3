import {createHash} from 'node:crypto';
import {normalizeProviderVisualInputsV1} from '../secure-provider-runtime/provider-visual-input-v1.mjs';
import {clone,hash} from '../skill-production/common.mjs';
import {normalizeProviderJsonDocumentV1} from '../secure-provider-runtime/provider-response-outcome-v1.mjs';
import {createActiveSandboxProviderSessionV1} from './active-sandbox-provider-session-v1.mjs';
import {projectPostgameObservedDecisionV1} from './postgame-observed-decision-v1.mjs';
import {STARCRAFT_TMG_PROVIDER_PROMPT_ARTIFACT_MAX_BYTES} from '../secure-provider-runtime/provider-egress-contract-v1.mjs';
const ARTIFACT_SCHEMA='postgame_learning_provider_artifact_v2';
// A recorded local contract rejection consumed no Provider tokens. Only migrate
// the old oversized user-message encoding once; transport/unknown failures stay
// unresolved and are never silently purchased again.
function canRecoverLocalEncoding(op){
 // send() stores the prompt before entering the gateway. A saved artifact
 // exceeding this exact limit cannot have dispatched a Provider request.
 const oversized=op?.role==='vista_meta'&&['sending','failed'].includes(op.status)
  &&!op.providerResult&&op.artifact
  &&Buffer.byteLength(JSON.stringify(op.artifact))>STARCRAFT_TMG_PROVIDER_PROMPT_ARTIFACT_MAX_BYTES;
 if(oversized||op?.localFailure?.beforeDispatch===true)return true;
 return op?.status==='failed'&&op.artifact?.schemaVersion==='postgame_learning_provider_artifact_v1'
  &&op.providerResult?.reason==='provider_request_contract_rejected'
  &&op.providerResult?.turn?.chargedUnits===0
  &&op.artifact.nodes?.some(n=>n.nodeType==='user-message'&&typeof n.content?.text==='string'&&n.content.text.length>64*1024);
}
const need=(v,c)=>{if(!v)throw Object.assign(new Error(c),{code:c});};
function publicOnly(v) {
  if(Array.isArray(v))return v.map(publicOnly);
  if(!v||typeof v!=='object')return v;
  return Object.fromEntries(Object.entries(v).filter(([key])=>
    !/^(api.?key|authorization|cookie|reasoning_content|chain.?of.?thought|hidden.?reasoning|thinking)$/i.test(key))
    .map(([key,value])=>[key,publicOnly(value)]));
}
// History frames belong in the Provider's multimodal channel, not as base64
// inside JSON prose. Only saved Host PNGs from delivered evidence are lifted;
// no model-supplied URLs or paths are fetched. The input identity stays raw.
function projectMetaVisualPayload(payload) {
 const content=clone(payload),visualInputs=[],seen=new Map();
 function visit(value){
  if(!value||typeof value!=='object')return;
  if(value.image?.mimeType==='image/png'&&typeof value.image.data==='string'){
   const input=value.image;
   const digest=createHash('sha256').update(Buffer.from(input.data,'base64')).digest('hex');
   const [image]=normalizeProviderVisualInputsV1([{mimeType:input.mimeType,data:input.data,
    sha256:input.sha256||digest,detail:input.detail||'high'}]);
   let index=seen.get(digest);
   if(index===undefined){index=visualInputs.length;seen.set(digest,index);visualInputs.push(image);}
   value.image={mimeType:image.mimeType,sha256:digest,visualInputIndex:index,
    presentation:'Attached visual input at this zero-based index; original PNG bytes are preserved in the artifact.'};
  }
  for(const child of Object.values(value))if(child&&typeof child==='object')visit(child);
 }
 visit(content.delivered);
 for(const delivered of content.delivered||[]){
  const record=delivered.result?.record,episode=record?.episode;
  if(!Array.isArray(episode?.decisions))continue;
  // Keep every observed action, route/placement, chance outcome and public
  // explanation. Repeated LegalSpace catalogues and Skill snapshots are not
  // another observation and remain in the immutable original read artifact.
  const {decisions,...episodeMetadata}=episode;
  delivered.result.record={...record,episode:{...episodeMetadata,
   projection:{schemaVersion:'vista_full_episode_observations_v1',originalRecordHash:hash(record),actionCount:decisions.length,
    omittedRepeatedInputs:['actionEncoding.actionSet','skillSnapshotsBySeat','modelSnapshotsBySeat','promptPackSnapshotsBySeat'],originalPreservedIn:'saved development read operation'},
   decisions:decisions.map(d=>{
    let semantic=d.actualAction?.appliedAction||{};while(semantic.sourceAction&&typeof semantic.sourceAction==='object')semantic=semantic.sourceAction;
    return {decisionId:d.decisionId,sequence:d.sequence,checkpoint:clone(d.checkpoint),
     observedFacts:projectPostgameObservedDecisionV1(d),executedSemanticAction:clone(semantic),
     interpretation:{authority:'historical_model_explanation_not_native_fact',publicDecisionSummary:clone(d.publicDecisionSummary||null)}};
   })}};
 }
 return {content,visualInputs};
}

function learningResult(reply){
 const direct=reply.output?.channels?.learning??reply.output?.learning;
 if(direct&&typeof direct==='object'&&!Array.isArray(direct))return {result:direct};
 const invalid=reply.output?.providerTurn;
 if(reply.ok&&invalid?.kind==='invalid_json'&&invalid.issue!=='output_truncated'&&typeof invalid.content==='string'){
  const normalized=normalizeProviderJsonDocumentV1(invalid.content,{allowOuterContainerSuffix:true});
  try{const value=JSON.parse(normalized.text);const result=value.channels?.learning??value.learning;
   if(result&&typeof result==='object'&&!Array.isArray(result))return {result,normalization:{kind:normalized.kind,evidence:normalized.evidence}};
  }catch{}
 }
 return {result:null};
}
export function createPostgameLearningProviderV1({store,id,sessionOptions}) {
  let opened;
  const session=()=>opened??=createActiveSandboxProviderSessionV1(sessionOptions);
  const key=(role,callId)=>id+':provider:'+hash({role,callId});
  async function recoverSavedReply(op){
    if(op?.status!=='failed'||!op.providerResult?.ok)return op;
    const decoded=learningResult(op.providerResult);if(!decoded.result)return op;
    const next={...op,revision:op.revision+1,status:'completed',result:publicOnly(decoded.result),
      normalization:decoded.normalization,history:[...(op.history||[]),clone(op)],
      recovery:{kind:'saved_reply_json_normalization',newProviderRequest:false},updatedAt:new Date().toISOString()};
    need((await store.commit(op.reviewId,op.revision,next)).ok,'LEARNING_PROVIDER_RESULT_CAS');return next;
  }
  async function invoke(role,payload) {
    const callId=payload.callId||hash(payload),rid=key(role,callId),requestHash=hash(payload);
    let op=await recoverSavedReply(await store.load(rid));
    if(op){need(op.requestHash===requestHash,'LEARNING_PROVIDER_REQUEST_CHANGED');
      if(op.status==='completed')return clone(op.result);
      need(canRecoverLocalEncoding(op),'LEARNING_PROVIDER_OUTCOME_UNRESOLVED');}
    const s=await session();
    const responseContract={allowedChannels:['learning'],decisionCandidateSource:'declared_learning_role_object'};
    responseContract.contractHash=hash(responseContract);
    const visual=role==='vista_meta'?projectMetaVisualPayload(payload):{content:clone(payload),visualInputs:[]};
    const body={schemaVersion:ARTIFACT_SCHEMA,sessionId:s.session.sessionId,
      sessionBindingHash:s.session.binding.sessionBindingHash,promptPack:'postgame_'+role+'_reflection_v1',
      nodes:[{nodeType:'learning-role-boundary',authority:'platform',content:{
        role,instruction:'执行下方角色合同，只返回其中规定的语义选择及公开理由。把要求的完整JSON放在learning字段内。Host负责来源、身份、版本和工具回执；不得修改规则或评价范围，不输出隐藏思维链。'}},
      {nodeType:'learning-role-input',authority:'user',content:visual.content},
      {nodeType:'user-message',authority:'user',content:{text:'执行 learning-role-input 中的角色合同；材料已完整给出。只返回规定的 learning JSON。'}}],responseContract,...(visual.visualInputs.length?{visualInputs:visual.visualInputs}:{}),trainingTruth:false};
    const artifact={...body,promptArtifactHash:hash(body)};
    const previous=op;
    op={reviewId:rid,revision:previous?previous.revision+1:0,schemaVersion:'postgame_learning_provider_call_v1',role,callId,
      requestHash,artifact,status:'sending',providerProfile:s.profile,updatedAt:new Date().toISOString(),
      ...(previous?{history:[...(previous.history||[]),clone(previous)],recovery:{kind:'local_encoding_v1_to_v2',originalRequestHash:previous.requestHash}}:{})};
    need((await store.commit(rid,previous?.revision??null,op)).ok,'LEARNING_PROVIDER_CALL_CAS');
    let reply;
    try{reply=await s.send(artifact)}catch(error){
      if(error.message==='prompt_artifact_too_large'){
        const failed={...op,revision:op.revision+1,status:'failed',localFailure:{code:error.message,beforeDispatch:true,chargedUnits:0},updatedAt:new Date().toISOString()};
        need((await store.commit(op.reviewId,op.revision,failed)).ok,'LEARNING_PROVIDER_LOCAL_FAILURE_CAS');
      }
      throw error;
    }
    const decoded=learningResult(reply),result=decoded.result;
    const next={...op,revision:op.revision+1,status:reply.ok&&result&&typeof result==='object'?'completed':'failed',
      providerResult:publicOnly(reply),result:publicOnly(result??null),...(decoded.normalization?{normalization:decoded.normalization}:{}),updatedAt:new Date().toISOString()};
    need((await store.commit(rid,op.revision,next)).ok,'LEARNING_PROVIDER_RESULT_CAS');
    need(next.status==='completed','LEARNING_PROVIDER_FAILED:'+String(reply.reason||'missing_learning_object'));
    return clone(next.result);
  }
  return {wiki:payload=>invoke('wiki',payload),propose:payload=>invoke('propose',payload),
    send:payload=>invoke('vista_meta',payload),
    async readCall({callId,kind}) {
      const r=await recoverSavedReply(await store.load(key(kind,callId)));
      if(!r)return {status:'definitely_not_started'};
      if(r.status==='failed'&&r.providerResult?.ok&&r.providerResult.output?.providerTurn?.issue==='output_truncated') {
        return {status:'completed_output_truncated',callId:r.callId,providerArtifactId:r.reviewId,requestHash:r.requestHash};
      }
      if(r.status==='failed'&&r.providerResult?.turn?.failure?.httpStatus===400)return {status:'completed_http_rejected',callId:r.callId,providerArtifactId:r.reviewId,httpStatus:400,requestHash:r.requestHash,usageKnown:false,recordedChargedUnits:r.providerResult.turn.chargedUnits};
      return r.status==='completed'?{status:'completed',result:clone(r.result)}
        :canRecoverLocalEncoding(r)?{status:'retryable_local_rejection',reason:'local_user_message_encoding_v1',previousRequestHash:r.requestHash}:{status:'unresolved'};
    },async close(){if(opened)await(await opened).close();}};
}
