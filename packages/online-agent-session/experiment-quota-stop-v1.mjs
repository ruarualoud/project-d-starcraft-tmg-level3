// Optional, server-owned experiment stop. Ordinary product usage has no cap.
import fs from 'node:fs/promises';
import path from 'node:path';
export function isDeepseekPaymentExhaustedV1(value){
 if(!value||typeof value!=='object')return false;
 if(value.httpStatus===402||value.statusCode===402||value.rejection?.httpStatus===402)return true;
 if(['code','reason','failureCode'].some(k=>/PROVIDER_PAYMENT_REQUIRED|insufficient[_ -]?(balance|quota|credit)|balance.*(exhausted|insufficient)|余额不足/i.test(String(value[k]??''))))return true;
 return ['error','failure','providerFailure','providerEvidence','receipt','transportReceipt','turn'].some(k=>value[k]&&isDeepseekPaymentExhaustedV1(value[k]));
}
export function withExperimentQuotaStopV1(supervisor,{file,providerId}){
 if(!file)return supervisor;
 if(!path.isAbsolute(file))throw Error('EXPERIMENT_QUOTA_PATH_MUST_BE_ABSOLUTE');
 const mark=async()=>{await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,JSON.stringify({at:new Date().toISOString(),providerId,reason:'PROVIDER_PAYMENT_REQUIRED',stopAllModels:true}),{flag:'wx',mode:0o600}).catch(e=>{if(e.code!=='EEXIST')throw e})};
 return {...supervisor,async sendTurn(...args){
  if(await fs.access(file).then(()=>true,e=>{if(e.code==='ENOENT')return false;throw e}))return {ok:false,reason:'EXPERIMENT_DEEPSEEK_QUOTA_PAUSED',requestDefinitelyNotSent:true,turn:{chargedUnits:0}};
  try{const result=await supervisor.sendTurn(...args);if(providerId==='deepseek'&&isDeepseekPaymentExhaustedV1(result))await mark();return result}
  catch(e){if(providerId==='deepseek'&&isDeepseekPaymentExhaustedV1(e))await mark();throw e}
 }};
}
