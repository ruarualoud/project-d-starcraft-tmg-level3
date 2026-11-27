import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {mkdir,readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {createWave3OpenAICompanionProfileV1,estimateWave3OpenAICompanionUsageV1} from '../content/provider/wave3-openai-companion-profile-v1.mjs';
import {createStarcraftTmgProviderProfileRegistryV1} from '../packages/secure-provider-runtime/provider-profile-registry-v1.mjs';
import {createStarcraftTmgProviderEgressTransportV1} from '../packages/secure-provider-runtime/provider-egress-transport-v1.mjs';
import {createLiveCompanionProviderAdapter} from '../packages/secure-provider-runtime/companion-worker-adapter-v1.mjs';
import {createProductCompanionLiveProviderV1,claimProductCompanionDispatchV1,readProductCompanionDispatchUsageV1} from '../packages/secure-provider-runtime/companion-live-provider-v1.mjs';
import {createProductRoomCredentialsV1} from '../packages/secure-provider-runtime/product-room-credentials-v1.mjs';

const profile=createWave3OpenAICompanionProfileV1();
assert.throws(()=>createWave3OpenAICompanionProfileV1('unapproved-model'),/MODEL_NOT_APPROVED/);
assert.throws(()=>createProductCompanionLiveProviderV1({dataDirectory:'build/unused-openai-test',providerProfile:profile}),/EXPLICIT_CREDENTIAL_REQUIRED/);
const registry=createStarcraftTmgProviderProfileRegistryV1({entries:[{providerProfile:profile,completionPath:'/chat/completions'}],allowedProviders:[profile.provider]});
const resolved=await registry.resolveEgressBinding({profileRef:{id:profile.providerProfileId,version:profile.version,hash:profile.integrity.hash}});
assert.equal(resolved.ok,true);
assert.equal(resolved.egressBinding.endpoint.hostname,'api.openai.com');
assert.equal(resolved.egressBinding.endpoint.path,'/v1/chat/completions');
const captured=[];
const bytes=Buffer.from('synthetic-offline-provider-value');
let replyContent=JSON.stringify({channels:{companion_reply:{text:'测试回复：等待指挥官下一步。'}}});
const transport=createStarcraftTmgProviderEgressTransportV1({
  resolveAddresses:async()=>[{address:'93.184.216.34',family:4}],
  requestImplementation(options,callback){
    const req=new EventEmitter();req.destroy=()=>{};req.setTimeout=()=>{};
    req.end=body=>{
      assert.equal(options.hostname,'api.openai.com');assert.equal(options.path,'/v1/chat/completions');
      assert.equal(options.rejectUnauthorized,true);
      const parsed=JSON.parse(body);captured.push(parsed);
      assert(!body.includes(bytes.toString()),'credential cannot enter the prompt');
      req.emit('finish');
      queueMicrotask(()=>{
        const payload=JSON.stringify({model:'gpt-5.4-mini-2026-03-17',choices:[{finish_reason:'stop',message:{content:replyContent}}],
          usage:{prompt_tokens:120,completion_tokens:40,total_tokens:160}});
        const res=new EventEmitter();res.statusCode=200;res.headers={'content-type':'application/json','content-length':String(Buffer.byteLength(payload)),'x-request-id':'offline-openai-fixture'};
        res.destroy=()=>{};res.resume=()=>{};callback(res);
        queueMicrotask(()=>{res.emit('data',Buffer.from(payload));res.emit('end');});
      });
    };
    return req;
  },
});
const claims=[];
const adapter=createLiveCompanionProviderAdapter({maxDispatches:3,getAttachedWorkerRef:()=>({fixture:true}),
  workerPort:{complete:({providerRequest})=>transport.complete({egressBinding:resolved.egressBinding,credentialBytes:bytes,providerRequest})},
  claimDispatch:async i=>{claims.push(i);},containsCredentialMaterial:()=>false,priceUsage:estimateWave3OpenAICompanionUsageV1});
for(let i=0;i<3;i++) {
  const result=await adapter.complete({requestId:'offline-openai-'+i,messages:[{role:'user',content:'请确认你能读取公开的游戏信息。'}]});
  assert.equal(result.ok,true,JSON.stringify(adapter.observation.failure));
  assert.equal(result.response.content,'测试回复：等待指挥官下一步。');
  assert.equal(result.response.usage.reportedCostUnits,270000);
}
const stopped=await adapter.complete({requestId:'offline-openai-stop',messages:[{role:'user',content:'fourth'}]});
assert.equal(stopped.reason,'LIVE_CALL_DENOMINATOR_EXCEEDED');assert.equal(captured.length,3);assert.deepEqual(claims,[1,2,3]);
for(const body of captured) {
  assert.equal(body.model,'gpt-5.4-mini');assert.equal(body.response_format.type,'json_object');
  assert(Number.isSafeInteger(body.max_completion_tokens));
  for(const field of ['temperature','top_p','thinking','max_tokens'])assert.equal(field in body,false);
}
for(const content of ['not-json',JSON.stringify({channels:{companion_reply:{text:bytes.toString()}}})]) {
  replyContent=content;
  const guarded=createLiveCompanionProviderAdapter({maxDispatches:1,getAttachedWorkerRef:()=>({fixture:true}),
    workerPort:{complete:({providerRequest})=>transport.complete({egressBinding:resolved.egressBinding,credentialBytes:bytes,providerRequest})},
    claimDispatch:async()=>{},containsCredentialMaterial:()=>false,priceUsage:estimateWave3OpenAICompanionUsageV1});
  const count=captured.length;
  const result=await guarded.complete({requestId:'offline-openai-rejected',messages:[{role:'user',content:'public fixture'}]});
  assert.equal(result.ok,false);assert.equal(captured.length,count+1,'invalid response must never retry');
}
const store=createProductRoomCredentialsV1();
await store.replace('player2','synthetic-seat-only-value');
assert.equal(store.status('player1').configured,false);assert.equal(store.status('player2').configured,true);
assert.equal(store.status('player2').persisted,false);await store.close();
const dataDirectory='build/playtest-web/openai-budget-regression/'+randomUUID();await mkdir(dataDirectory,{recursive:true});
for(let index=1;index<=3;index++)await claimProductCompanionDispatchV1({dataDirectory,instance:'first',index,providerProfile:profile,maxDispatches:3});
await assert.rejects(claimProductCompanionDispatchV1({dataDirectory,instance:'after-restart-or-key-change',index:1,providerProfile:profile,maxDispatches:3}),/TRIAL_LIMIT_REACHED/);
assert.equal((await readFile(dataDirectory+'/dispatch.jsonl','utf8')).trim().split('\n').length,3);
assert.deepEqual(await readProductCompanionDispatchUsageV1({dataDirectory,providerProfile:profile,maxDispatches:6}),
  {maxDispatches:6,usedDispatches:3,remainingDispatches:3});
for(let index=4;index<=6;index++)await claimProductCompanionDispatchV1({dataDirectory,instance:'explicit-new-trial',index,providerProfile:profile,maxDispatches:6});
assert.deepEqual(await readProductCompanionDispatchUsageV1({dataDirectory,providerProfile:profile,maxDispatches:6}),
  {maxDispatches:6,usedDispatches:6,remainingDispatches:0});
await assert.rejects(claimProductCompanionDispatchV1({dataDirectory,instance:'restart-again',index:1,providerProfile:profile,maxDispatches:6}),/TRIAL_LIMIT_REACHED/);
let blockedClaims=0,blockedEgress=0;
const oversized=createLiveCompanionProviderAdapter({maxDispatches:1,maxPromptBytes:96*1024,
  getAttachedWorkerRef:()=>({fixture:true}),containsCredentialMaterial:()=>false,
  claimDispatch:async()=>{blockedClaims++;},workerPort:{complete:async()=>{blockedEgress++;}}});
const tooLarge=await oversized.complete({requestId:'oversized-local-only',messages:[{role:'user',content:'x'.repeat(100*1024)}]});
assert.equal(tooLarge.reason,'LIVE_PROVIDER_REQUEST_TOO_LARGE');assert.equal(blockedClaims,0);assert.equal(blockedEgress,0);
const exhausted=createLiveCompanionProviderAdapter({maxDispatches:1,getAttachedWorkerRef:()=>({fixture:true}),
  containsCredentialMaterial:()=>false,claimDispatch:()=>claimProductCompanionDispatchV1({dataDirectory,instance:'limit-ui',index:1,providerProfile:profile,maxDispatches:6}),
  workerPort:{complete:async()=>{blockedEgress++;}}});
assert.equal((await exhausted.complete({requestId:'used-up',messages:[{role:'user',content:'test'}]})).reason,'PRODUCT_COMPANION_TRIAL_LIMIT_REACHED');
assert.equal(blockedEgress,0);
replyContent=JSON.stringify({channels:{companion_reply:{text:'离线大小限制恢复验证'}}});
const recoveryClaims=[];
const recoverable=createLiveCompanionProviderAdapter({maxDispatches:1,maxPromptBytes:96*1024,
  getAttachedWorkerRef:()=>({fixture:true}),containsCredentialMaterial:()=>false,
  claimDispatch:async index=>{recoveryClaims.push(index);},priceUsage:estimateWave3OpenAICompanionUsageV1,
  workerPort:{complete:({providerRequest})=>transport.complete({egressBinding:resolved.egressBinding,credentialBytes:bytes,providerRequest})}});
assert.equal((await recoverable.complete({requestId:'too-large',messages:[{role:'user',content:'x'.repeat(100*1024)}]})).reason,'LIVE_PROVIDER_REQUEST_TOO_LARGE');
assert.equal((await recoverable.complete({requestId:'smaller',messages:[{role:'user',content:'short message'}]})).ok,true);
assert.deepEqual(recoveryClaims,[1],'local validation failure must not consume the in-memory allowance');
bytes.fill(0);
console.log(JSON.stringify({passed:true,realProviderCalls:0,checks:['OpenAI-only endpoint','no machine credential fallback','JSON reply contract','model-compatible output field','three attempts then stop across key changes and server restart','explicit new cumulative allowance preserves previous usage','oversized prompt rejected before quota claim or network','limit reason reaches UI without retry','invalid JSON and credential echoes rejected without retry','usage estimate is not invoice','per-seat ephemeral credential']}));
