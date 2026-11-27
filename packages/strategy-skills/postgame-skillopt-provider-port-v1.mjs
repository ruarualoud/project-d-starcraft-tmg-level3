import fs from 'node:fs/promises';
import path from 'node:path';
import {normalizeProviderJsonDocumentV1} from '../secure-provider-runtime/provider-response-outcome-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {createProviderProfile} from '../character-agent/contracts-v1.mjs';
import {STARCRAFT_TMG_TICKET_23_LIVE_FLASH_PROVIDER_PROFILE_V1 as baseProfile} from '../../content/provider/ticket-23-live-provider-profiles-v1.mjs';
import {createActiveSandboxProviderSessionV1} from './active-sandbox-provider-session-v1.mjs';
const need=(v,code)=>{if(!v)throw Object.assign(new Error(code),{code})};
const read=async file=>{try{return JSON.parse(await fs.readFile(file,'utf8'))}catch(e){if(e.code==='ENOENT')return null;throw e}};
const save=async(file,value)=>{await fs.writeFile(file+'.next',JSON.stringify(value,null,2));await fs.rename(file+'.next',file)};
// Only the old encoding's proven local, zero-charge rejection is recoverable.
// A network/unknown outcome or a failure of v2 remains stopped, not repurchased.
function canRecoverLocalEncoding(record){
 return record?.status==='replied'
  &&record.artifact?.schemaVersion==='starcraft_skillopt_provider_artifact_v1'
  &&record.providerResult?.ok===false
  &&record.providerResult?.reason==='provider_request_contract_rejected'
  &&record.providerResult?.turn?.chargedUnits===0
  &&record.artifact.nodes?.some(n=>n.nodeType==='user-message'
    &&typeof n.content?.text==='string'&&n.content.text.length>64*1024);
}
export function createSkillOptProviderProfileV1({profile=baseProfile,outputBudget=16384}={}){
 const {providerProfileId,version,provider,baseUrl,model,thinkingMode,reasoningEffort,temperature,topP,contextBudget,toolSupport,timeoutMs,retryPolicy,fallbackPolicy,extensions}=profile;
 return createProviderProfile({providerProfileId:providerProfileId+'.skillopt',version:version+'.skillopt.1',provider,baseUrl,model,thinkingMode,reasoningEffort,temperature,topP,contextBudget,outputBudget,toolSupport,timeoutMs,retryPolicy,fallbackPolicy,extensions:{...extensions,scope:'offline_original_skillopt',sourceCommit:'ccfdcdf7ab50456e2556200499f2bccf1e1b43b2'}});
}
export function compileSkillOptProviderArtifactV1(request,session){
 need(typeof request.system==='string'&&typeof request.user==='string'&&request.user.length&&typeof request.stage==='string','SKILLOPT_ORIGINAL_PROMPT_REQUIRED');
 const responseContract={allowedChannels:['skillopt'],decisionCandidateSource:'original_skillopt_stage_object'};responseContract.contractHash=hash(responseContract);
 const longInput=request.user.length>64*1024;
 const body={schemaVersion:longInput?'starcraft_skillopt_provider_artifact_v2':'starcraft_skillopt_provider_artifact_v1',sessionId:session.sessionId,sessionBindingHash:session.binding.sessionBindingHash,
 promptPack:'skillopt_original_'+request.stage+'_reflection_v1',nodes:[
 {nodeType:'skillopt-transport-contract',authority:'platform',content:{instruction:'Execute the original SkillOpt stage below. Preserve its requested JSON structure inside the skillopt channel. Do not add gameplay decisions, new criteria or private chain-of-thought. Return {"skillopt": ORIGINAL_JSON_OBJECT}. The wrapper is transport only; original public explanations remain in their original fields.',sourceCommit:request.manifest.sourceCommit}},
 {nodeType:'skillopt-original-system',authority:'optimizer_method',content:{text:request.system}},
 ...(longInput?[
 {nodeType:'skillopt-original-user',authority:'user',content:{text:request.user}},
 {nodeType:'user-message',authority:'user',content:{text:'Execute the original SkillOpt system and user material in skillopt-original-system and skillopt-original-user. Return the original requested JSON object in the skillopt channel.'}}
 ]:[{nodeType:'user-message',authority:'user',content:{text:request.user}}])],responseContract,trainingTruth:false};
 return {...body,promptArtifactHash:hash(body)};
}
function normalize(result){
 need(result?.ok,'SKILLOPT_PROVIDER_FAILED:'+String(result?.reason||'unknown'));
 const output=result.output;let original=output?.skillopt??output?.channels?.skillopt;
 let text,normalization;
 if(original&&typeof original==='object'&&!Array.isArray(original))text=JSON.stringify(original);
 else if(output?.providerTurn?.kind==='invalid_json'&&output.providerTurn.issue==='response_json_invalid'){
  const raw=output.providerTurn.content;
  const decoded=normalizeProviderJsonDocumentV1(raw,{allowOuterContainerSuffix:true});
  try{
   const envelope=JSON.parse(decoded.text),body=envelope.skillopt??envelope.channels?.skillopt;
   if(body&&typeof body==='object'&&!Array.isArray(body)){
    text=JSON.stringify(body);normalization={kind:decoded.kind,transportUnwrapped:true,source:'saved_provider_reply'};
   }else text=raw;
  }catch{text=raw;}
 }
 else need(false,'SKILLOPT_PROVIDER_ORIGINAL_OBJECT_MISSING');
 const usage=result.usageReceipt;need(Number.isSafeInteger(usage?.inputUnits)&&Number.isSafeInteger(usage?.outputUnits),'SKILLOPT_PROVIDER_USAGE_MISSING');
 return {text,usage:{input_tokens:usage.inputUnits,output_tokens:usage.outputUnits},usageReceipt:usage,...(normalization?{normalization}:{})};
}
export function createSkillOptOptimizerProviderPortV1({directory,roomId,seatKey,matchBinding,credentialIngress,experimentQuotaStopFile,providerProfile=createSkillOptProviderProfileV1(),spawnProcess,hooks={}}){
 need(directory&&roomId&&['player1','player2'].includes(seatKey)&&matchBinding?.bindingHash,'SKILLOPT_PROVIDER_BINDING_REQUIRED');
 let sessionPromise;
 const session=()=>sessionPromise??=createActiveSandboxProviderSessionV1({roomId,seatKey,matchBinding,dataDirectory:path.join(directory,'session'),credentialIngress,experimentQuotaStopFile,providerProfile,spawnProcess});
 function identity(request){need(/^[a-f0-9]{64}$/.test(request.requestKey),'SKILLOPT_REQUEST_KEY_INVALID');const semantic={system:request.system,user:request.user,stage:request.stage,maxOutputUnits:request.max_completion_tokens,retries:request.retries,manifestHash:request.manifest.inputHash,providerProfileHash:providerProfile.integrity.hash,roomId,seatKey,bindingHash:matchBinding.bindingHash};return {file:path.join(directory,request.requestKey+'.json'),semantic,identityHash:hash(semantic)}}
 async function existing(request){const id=identity(request),record=await read(id.file);if(record)need(record.identityHash===id.identityHash,'SKILLOPT_PROVIDER_REQUEST_CHANGED');return {...id,record}}
 async function invoke(request){
  await fs.mkdir(directory,{recursive:true,mode:0o700});let {file,semantic,identityHash,record}=await existing(request);
  const recoveringLocalEncoding=canRecoverLocalEncoding(record);
  if(record?.status==='replied'&&!recoveringLocalEncoding)return normalize(record.providerResult);
  need(!record||recoveringLocalEncoding,'SKILLOPT_PROVIDER_OUTCOME_UNRESOLVED_NO_AUTO_RETRY');
  need(Number.isSafeInteger(request.max_completion_tokens)&&request.max_completion_tokens>0&&request.max_completion_tokens<=providerProfile.outputBudget,'SKILLOPT_PROVIDER_CAPACITY_MISMATCH');
  const s=await session(),artifact=compileSkillOptProviderArtifactV1(request,s.session);
  const previous=record;
  record={schemaVersion:'skillopt_optimizer_provider_operation_v1',status:'sending',identityHash,semantic,artifact,providerProfile,startedAt:new Date().toISOString(),
   ...(previous?{history:[...(previous.history||[]),previous],recovery:{kind:'local_encoding_v1_to_v2',newProviderRequest:true,previousKnownChargedUnits:0,originalIdentityHash:previous.identityHash}}:{})};await save(file,record);
  let result;
  try{result=await s.send(artifact,{maxOutputUnits:request.max_completion_tokens})}catch(e){await save(file,{...record,status:'failed',failure:e.code||e.message,outcomeMayBeUnknown:true});throw e}
  record={...record,status:'replied',providerResult:result,completedAt:new Date().toISOString()};await save(file,record);
  await hooks.afterResponseSaved?.(record);
  return normalize(result);
 }
 invoke.recover=async request=>{const {record}=await existing(request);if(canRecoverLocalEncoding(record))return {status:'completed',result:await invoke(request)};if(record?.status==='replied')return {status:'completed',result:normalize(record.providerResult)};return {status:'unresolved',reason:record?.failure||'no_complete_provider_reply',automaticRetry:false}};
 invoke.readSaved=async request=>{const {record}=await existing(request);return record?.status==='replied'&&record.providerResult?.ok?{status:'completed',result:normalize(record.providerResult)}:{status:'unresolved'};};
 invoke.close=async()=>{if(sessionPromise)await(await sessionPromise).close()};
 return invoke;
}
