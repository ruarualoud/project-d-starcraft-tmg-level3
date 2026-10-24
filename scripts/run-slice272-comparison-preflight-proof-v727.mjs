// One real preflight using the product's actual assignment factory and role
// executor. Immutable v726 failure is evidence, not a resumed production run.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRosterDecisionWorkflowStoreV1} from '../packages/roster-planning-workspace/roster-decision-workflow-store-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {createRosterComparisonPreflightWorkV1} from '../packages/roster-planning-workspace/roster-decision-workspace-run-v1.mjs';
import {createRosterPlanningSecureDeliberationFactoryV1,projectRosterProviderInstructionsV1} from '../packages/roster-planning-workspace/roster-planning-secure-deliberation-factory-v1.mjs';
import {encodeRosterProviderInputV1} from '../packages/roster-strategist/roster-prompt-evidence-encoding-v1.mjs';
import {priceStarcraftTmgDeepSeekCurrentUsageV2} from '../packages/secure-provider-runtime/provider-pricing-v2.mjs';
const cwd=process.cwd(),root=path.resolve(process.argv[2]);
if(root!==path.join(cwd,'build/slice272-product-generation-v645-W0oGsS/workspace/decision-workflows/decision-cce220e0-ad4a-412b-8cb7-b60743ffbe60'))
  throw Error('EXACT_V726_FAILURE_REQUIRED');
const source=createRosterDecisionWorkflowStoreV1({directory:root}),saved=await source.load();
const purpose=saved.work.findLast(work=>work.strategyComparisonDesignCycleId);
const study=saved.work.find(work=>work.id===purpose.id+':study');
const paid=await source.get(study.operationState.calls[0].requestRef);
const toolDescriptor=paid.promptNodes.find(node=>node.kind==='workflow_role_assignment').inputs.tools.value;
const resumeIndex=process.argv.indexOf('--resume');
const output=resumeIndex<0?await fs.mkdtemp(path.join(cwd,'build/slice272-comparison-preflight-proof-v727-'))
  :path.resolve(process.argv[resumeIndex+1]);
if(!output.startsWith(path.join(cwd,'build/slice272-comparison-preflight-proof-v727-')))
  throw Error('PREFLIGHT_PROOF_DIRECTORY_REQUIRED');
const isolated=createRosterDecisionWorkflowStoreV1({directory:path.join(output,'snapshot')});
const store={...isolated,get:async ref=>{try{return await isolated.get(ref);}
  catch(error){if(error.code!=='ENOENT')throw error;return source.get(ref);}}};
if(resumeIndex<0)await store.save({schema:saved.schema,scope:saved.scope,evidence:saved.evidence,work:[],reads:[],events:[]});
const reader=await createRosterDecisionWorkflowV1({store,execute:async()=>{throw Error('NO_NATIVE_OR_DRAFT_EXECUTION');}});
const job=createRosterComparisonPreflightWorkV1({current:saved,id:purpose.id+':preflight:isolated-v727',
  cycleId:purpose.strategyComparisonDesignCycleId,purposeWorkId:purpose.id,purposeResultRef:purpose.resultRef,
  designReviewRound:1,toolDescriptor});
const inputs={};
for(const [name,input]of Object.entries(job.inputs)){
  if(input.source!=='evidence'){inputs[name]=input;continue;}
  const entry=saved.evidence.find(row=>row.id===input.id);
  const read=await reader.dispatch({type:'read_evidence',consumer:job.id,evidenceId:input.id,
    pointer:input.pointer,scopeUsage:input.scopeUsage});
  if(read.status!=='read')throw Error('PREFLIGHT_SOURCE_NOT_READ:'+name);
  inputs[name]={...input,evidenceId:input.id,evidenceNumber:saved.evidence.indexOf(entry)+1,status:'read',value:read.value};
}
const assignment={workId:job.id,role:job.role,scope:saved.scope,evidenceDirectory:saved.evidence,inputs};
let previousOperation=null;
if(resumeIndex>=0){
  const lines=(await fs.readFile(path.join(output,'role-checkpoints.jsonl'),'utf8')).trim().split('\n');
  previousOperation=await store.get(JSON.parse(lines.at(-1)).operationRef);
  if(previousOperation.pending)throw Error('PENDING_PREFLIGHT_REQUIRES_RECONCILIATION_NOT_REPLAY');
  const prior=JSON.parse(await fs.readFile(path.join(output,previousOperation.turn<=1?'result.json':`result-turn${previousOperation.turn}.json`),'utf8'));
  if(prior.status!=='role_requested_continuation')throw Error('PREFLIGHT_ALREADY_TERMINAL');
}
const quantum=(previousOperation?.turn??0)+1;
const save=(name,value)=>fs.writeFile(path.join(output,quantum===1?name:name.replace(/\.json$/u,`-turn${quantum}.json`)),JSON.stringify(value,null,2),{flag:'wx'});
await save('scope.json',{originalRun:root,purposeRef:purpose.resultRef,oneProviderQuantum:true,quantum,
  productAssignmentFactory:true,originalRunModified:false,nativeCalls:0});
console.log(JSON.stringify({stage:'started',output}));
let adapter,reply,operation=previousOperation,result,requestCount=0;const events=[];
try{
  adapter=await createRosterPlanningSecureDeliberationFactoryV1();
  const port=await adapter.factory.createForRun({sessionId:path.basename(output),runKind:'teach-framework',
    planHash:saved.scope.plan,onEvent:async event=>{
      events.push(event);await fs.appendFile(path.join(output,'provider-events.jsonl'),JSON.stringify(event)+'\n');
    }});
  const execute=createRosterWorkflowReadRoleExecutorV1({store,sessionId:path.basename(output),deliberation:port,
    onRequest:async request=>{
      if(requestCount++)throw Error('ONE_PROVIDER_QUANTUM_ONLY');
      const encoding=encodeRosterProviderInputV1(request,'same_request_evidence_v1');
      await save('request.json',{request,providerInstructions:projectRosterProviderInstructionsV1({request,runKind:'teach-framework'}),
        encodedProviderInput:encoding.input,isExactPromptContent:true});
      console.log(JSON.stringify({stage:'dispatching',inputCharacters:encoding.afterCharacters}));
    },onReply:async value=>{reply=value;await save('reply.json',value);
      console.log(JSON.stringify({stage:'returned',usage:value.receipt.usage,latencyMs:value.receipt.latencyMs}));}});
  const outcome=await execute(assignment,{operationState:previousOperation,
    checkpointOperation:async value=>{operation=structuredClone(value);
      await fs.appendFile(path.join(output,'role-checkpoints.jsonl'),JSON.stringify({operationRef:await store.put(value)})+'\n');},
    readEvidence:(evidenceId,pointer)=>reader.dispatch({type:'read_evidence',consumer:job.id,evidenceId,pointer})});
  await save('outcome.json',outcome);
  const checks=outcome.value?.checks??[],context=checks.find(check=>check.checkId==='frozen_context');
  let price;
  try{price=reply?priceStarcraftTmgDeepSeekCurrentUsageV2({providerId:'deepseek-openai-compatible-direct',
    requestedModel:'deepseek-flash',reportedModel:reply.receipt.modelVersion,
    startedAt:events.find(event=>event.type==='provider_dispatch'&&event.dispatch?.status==='sending')?.at,
    usage:reply.receipt.usage}):null;}catch(error){price={unpriced:true,reason:error.message};}
  result={status:outcome.continuation?'role_requested_continuation':'role_completed',
    wrongMissionRejected:context?.verdict==='requires_revision',checks,
    usage:reply?.receipt?.usage??null,latencyMs:reply?.receipt?.latencyMs??null,price,
    originalRunModified:false,nativeCalls:0,formalPlanAccepted:false,automaticRetry:false};
}catch(error){result={status:'incomplete',code:error.code??error.message,
  pendingRequestRetained:Boolean(operation?.pending),operationRef:operation?await store.put(operation):null,
  originalRunModified:false,nativeCalls:0,formalPlanAccepted:false};process.exitCode=1;}
finally{await adapter?.close();}
await save('result.json',result);
console.log(JSON.stringify({stage:'finished',output,status:result.status,wrongMissionRejected:result.wrongMissionRejected}));
