import { randomUUID } from 'node:crypto';
import { mkdir, appendFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { createLiveCompanionProviderAdapter } from './companion-worker-adapter-v1.mjs';
import { createStarcraftTmgProviderEgressWorkerPortV1 } from './provider-egress-worker-port-v1.mjs';
import { createStarcraftTmgProviderProfileRegistryV1 } from './provider-profile-registry-v1.mjs';
import { readStarcraftTmgDeepSeekCredentialFromKeychainV1 } from './keychain-credential-ingress-v1.mjs';
import { containsStarcraftTmgOnlineCredentialMaterialV1 } from '../online-agent-session/portable-credential-material-v1.mjs';
import { STARCRAFT_TMG_TICKET_23_LIVE_ADJUTANT_FLASH_PROVIDER_PROFILE_V1 as profile } from '../../content/provider/ticket-23-live-provider-profiles-v1.mjs';
import { priceStarcraftTmgDeepSeekV4FlashUsageV1 } from './provider-pricing-v1.mjs';

// Lazy attachment: opening the product makes no model call. A submitted
// conversation turn uses the existing secure worker and companion adapter.
export async function claimProductCompanionDispatchV1({dataDirectory,instance,index,providerProfile,maxDispatches}) {
  const file=path.join(dataDirectory,'dispatch.jsonl');
  if(Number.isFinite(maxDispatches)) {
    const prior=await readFile(file,'utf8').catch(error=>{if(error.code==='ENOENT')return '';throw error;});
    const used=prior.split('\n').filter(Boolean).map(line=>JSON.parse(line))
      .filter(row=>row.providerProfileHash===providerProfile.integrity.hash).length;
    if(used>=maxDispatches)throw Error('PRODUCT_COMPANION_TRIAL_LIMIT_REACHED');
  }
  await appendFile(file,JSON.stringify({instance,index,at:new Date().toISOString(),model:providerProfile.model,
    providerProfileHash:providerProfile.integrity.hash})+'\n',{mode:0o600});
}
export function createProductCompanionLiveProviderV1({dataDirectory,
  credentialIngress=readStarcraftTmgDeepSeekCredentialFromKeychainV1,
  providerProfile=profile,maxDispatches=Infinity,usagePricer=null}) {
  if(providerProfile.provider==='openai-api-direct'&&credentialIngress===readStarcraftTmgDeepSeekCredentialFromKeychainV1)
    throw Error('PRODUCT_OPENAI_EXPLICIT_CREDENTIAL_REQUIRED');
  let workerPort, workerRef, attaching;
  let turnQueue=Promise.resolve();
  const instance=randomUUID();
  async function attach() {
    if(workerRef)return;
    if(attaching)return attaching;
    attaching=(async()=>{
      await mkdir(dataDirectory,{recursive:true,mode:0o700});
      const registry=createStarcraftTmgProviderProfileRegistryV1({
        entries:[{providerProfile,completionPath:'/chat/completions'}],
        allowedProviders:[providerProfile.provider]});
      workerPort=createStarcraftTmgProviderEgressWorkerPortV1({providerProfileRegistry:registry,
        maxWorkers:1,maxOutputBytes:1024*1024,handshakeTimeoutMs:5000,shutdownGraceMs:1000});
      const ingress=await credentialIngress();
      try {
        const result=await workerPort.attachCredential({attachmentId:'companion-'+instance,
          providerProfile,credentialBytes:ingress.credentialBytes});
        if(!result.ok)throw Error(result.reason||'COMPANION_CREDENTIAL_ATTACHMENT_FAILED');
        workerRef=result.workerRef;
      } finally {ingress.credentialBytes.fill(0);}
    })();
    try {await attaching;}finally{attaching=null;}
  }
  const adapter=createLiveCompanionProviderAdapter({workerPort:{
    complete:request=>workerPort.complete(request)},getAttachedWorkerRef:()=>workerRef,
    maxDispatches,containsCredentialMaterial:containsStarcraftTmgOnlineCredentialMaterialV1,
    async claimDispatch(index){
      await claimProductCompanionDispatchV1({dataDirectory,instance,index,providerProfile,maxDispatches});
    },priceUsage(receipt){
      if(usagePricer)return usagePricer(receipt);
      try{return {pricing:priceStarcraftTmgDeepSeekV4FlashUsageV1({providerId:receipt.providerId,
        requestedModel:receipt.requestedModel,reportedModel:receipt.reportedModel,
        startedAt:receipt.startedAt,usage:receipt.usage}),authoritative:true};}
      catch{return {pricing:null,authoritative:false};}
    }});
  async function completeTurn(request){
    await attach();
    const result=await adapter.complete(request);
    await appendFile(path.join(dataDirectory,'usage.jsonl'),JSON.stringify({
      requestId:request.requestId,at:new Date().toISOString(),ok:result.ok,
      receipt:adapter.observation.success?.receipt||adapter.observation.failure?.receipt||null,
      reason:result.reason||null})+'\n',{mode:0o600});
    return result;
  }
  return {...adapter,complete(request){
    const turn=turnQueue.then(()=>completeTurn(request));
    turnQueue=turn.catch(()=>{});
    return turn;
  },async close(){await turnQueue;await workerPort?.close();}};
}
