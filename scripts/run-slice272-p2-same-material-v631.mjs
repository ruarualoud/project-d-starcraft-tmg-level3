// P2 controlled capability proof. Reuse1191/1192 baseline; freeze its exact
// assignment and directory. Same product role/reader/secure Provider; no live
// Run writes, no army/Plan/Native action, no baseline rebuy or network retry.
import fs from 'node:fs/promises';import path from 'node:path';
import {createRosterDecisionWorkflowStoreV1} from '../packages/roster-planning-workspace/roster-decision-workflow-store-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {createRosterPlanningSecureDeliberationFactoryV1,projectRosterProviderInstructionsV1} from '../packages/roster-planning-workspace/roster-planning-secure-deliberation-factory-v1.mjs';
import {encodeRosterProviderInputV1} from '../packages/roster-strategist/roster-prompt-evidence-encoding-v1.mjs';
import {priceStarcraftTmgDeepSeekCurrentUsageV2} from '../packages/secure-provider-runtime/provider-pricing-v2.mjs';
const root=process.cwd(),run=path.resolve(process.argv[2]);
if(!run.startsWith(path.join(root,'build/slice272-projection-owner-v565-')))throw Error('FROZEN_NEW_WORKFLOW_SOURCE_REQUIRED');
const base=path.join(run,'workspace/decision-workflows/projection-owner'),read=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const oldRequests=await Promise.all([1191,1192].map(n=>read(path.join(run,n+'.request.json'))));
const oldReplies=await Promise.all([1191,1192].map(n=>read(path.join(run,n+'.reply.json'))));
const first=oldRequests[0].request,assignment=first.promptNodes.find(n=>n.kind==='workflow_role_assignment');
const sourceStore=createRosterDecisionWorkflowStoreV1({directory:base}),live=await sourceStore.load();
const originalDispatch=live.events.find(e=>e.type==='dispatch'&&e.workId===assignment.workId&&e.dispatchKey===assignment.workId+':1');
if(!originalDispatch?.inputRef)throw Error('ORIGINAL_CORE_ASSIGNMENT_REQUIRED');
const originalCoreAssignment=await sourceStore.get(originalDispatch.inputRef);
const publicEntries=[...first.promptNodes.find(n=>n.kind==='available_evidence_directory').entries,
  ...first.promptNodes.find(n=>n.kind==='historical_evidence_directory').entries];
const originals=new Map(publicEntries.map(e=>[e.number,e])),maximum=Math.max(...originals.keys());
const directory=originalCoreAssignment.evidenceDirectory.slice(0,maximum).map((e,i)=>({...e,...originals.get(i+1),number:i+1}));
const output=await fs.mkdtemp(path.join(root,'build/slice272-p2-same-material-v631-'));
const isolated=createRosterDecisionWorkflowStoreV1({directory:path.join(output,'snapshot')});
const store={...isolated,get:async ref=>{try{return await isolated.get(ref);}catch(error){if(error.code!=='ENOENT')throw error;return sourceStore.get(ref);}}};
await store.save({schema:live.schema,scope:assignment.scope,evidence:directory,work:[],reads:[],events:[],acceptanceGranted:false});
await fs.writeFile(path.join(output,'frozen-assignment.json'),JSON.stringify({...assignment,evidenceDirectory:directory,
  originalCoreAssignmentRef:originalDispatch.inputRef},null,2),{flag:'wx'});
let adapter,operation=null,sequence=0,stop=false,result,last;
const requests=[],replies=[],events=[];const numbers=new Map();
const append=(file,value)=>fs.appendFile(path.join(output,file),JSON.stringify(value)+'\n');
const save=(file,value)=>fs.writeFile(path.join(output,file),JSON.stringify(value,null,2),{flag:'wx'});
const pause=()=>{stop=true;console.log(JSON.stringify({stage:'stop-requested',afterCurrentRoleTurn:true}));};
process.on('SIGTERM',pause);process.on('SIGINT',pause);
console.log(JSON.stringify({stage:'frozen-input-comparison-started',output,baselineReplayed:false,formalProduction:false}));
try{
  const reader=await createRosterDecisionWorkflowV1({store,execute:async()=>{throw Error('NO_NATIVE_OR_DRAFT_EXECUTION_ALLOWED');}});
  adapter=await createRosterPlanningSecureDeliberationFactoryV1();
  const port=await adapter.factory.createForRun({sessionId:path.basename(output),runKind:'teach-framework',planHash:assignment.scope.plan,
    onEvent:async event=>{events.push(event);await append('provider-events.jsonl',event);}});
  const execute=createRosterWorkflowReadRoleExecutorV1({store,sessionId:path.basename(output),deliberation:port,
    onRequest:async request=>{const number=++sequence;numbers.set(request.contextHash,number);requests.push(request);
      const encoding=encodeRosterProviderInputV1(request,'same_request_evidence_v1');
      await save(number+'.request.json',{request,providerInstructions:projectRosterProviderInstructionsV1({request,runKind:'teach-framework'}),
        encodedProviderInput:encoding.input,isExactPromptContent:true});
      console.log(JSON.stringify({stage:'dispatching',number,inputCharacters:encoding.afterCharacters}));},
    onReply:async reply=>{const number=numbers.get(reply.receipt.contextHash);replies.push(reply);await save(number+'.reply.json',reply);
      console.log(JSON.stringify({stage:'returned',number,usage:reply.receipt.usage,latencyMs:reply.receipt.latencyMs}));}});
  do{
    if(stop)throw Error('CONTROLLED_OBSERVATION_STOP');
    last=await execute({...assignment,evidenceDirectory:directory},{operationState:operation,
      checkpointOperation:async value=>{operation=structuredClone(value);await append('role-checkpoints.jsonl',{operationRef:await store.put(operation)});},
      readEvidence:(evidenceId,pointer)=>reader.dispatch({type:'read_evidence',consumer:assignment.workId,evidenceId,pointer})});
    await append('role-results.jsonl',last);
  }while(last.continuation===true);
  const decision=last.value.decisions[0],baseline=oldReplies.at(-1).output.decisions[0];
  const usage=rows=>rows.reduce((sum,row)=>({input:sum.input+(row.receipt.usage?.inputUnits??0),
    output:sum.output+(row.receipt.usage?.outputUnits??0),total:sum.total+(row.receipt.usage?.totalUnits??0),
    providerLatencyMs:sum.providerLatencyMs+(row.receipt.latencyMs??0)}),{input:0,output:0,total:0,providerLatencyMs:0});
  const price=rows=>rows.map(reply=>{
    const send=events.find(e=>e.type==='provider_dispatch'&&e.dispatch.status==='sending'&&e.dispatch.contextHash===reply.receipt.contextHash);
    try{return priceStarcraftTmgDeepSeekCurrentUsageV2({providerId:'deepseek-openai-compatible-direct',requestedModel:'deepseek-flash',
      reportedModel:reply.receipt.modelVersion,startedAt:send?.at,usage:reply.receipt.usage});}
    catch(error){return {unpriced:true,reason:error.message,usage:reply.receipt.usage};}});
  const newUsage=usage(replies),oldUsage=usage(oldReplies);
  result={status:'completed_role_comparison',scope:'One frozen bookkeeping decision, NOT whole-strategy or formal production acceptance',
    baseline:{requestNumbers:[1191,1192],calls:oldReplies.length,usage:oldUsage,decision:baseline,
      encodedCharacters:oldRequests.map(r=>typeof r.encodedProviderInput==='string'?r.encodedProviderInput.length:JSON.stringify(r.encodedProviderInput).length)},
    candidate:{calls:replies.length,usage:newUsage,decision,prices:price(replies),
      encodedCharacters:requests.map(r=>encodeRosterProviderInputV1(r,'same_request_evidence_v1').afterCharacters)},
    comparison:{sameDisposition:baseline.disposition===decision.disposition,
      bothNoMutation:baseline.mutation===null&&decision.mutation===null,bothNoStrategicDelta:!baseline.strategicChanges.length&&!decision.strategicChanges.length,
      originalAssignedBodiesUnchanged:requests.every(r=>JSON.stringify(r.promptNodes[0].inputs)===JSON.stringify(assignment.inputs)),
      frozenOutstandingQuestionCount:assignment.inputs.requirements?.value?.strategyQuestions?.length??0,
      inputTokenReduction:1-newUsage.input/oldUsage.input,totalTokenReduction:1-newUsage.total/oldUsage.total,
      providerLatencyReduction:1-newUsage.providerLatencyMs/oldUsage.providerLatencyMs,
      baselineCitations:baseline.evidenceNumbers,newCitations:decision.evidenceNumbers,
      broadStrategyEquivalenceProven:false,formalPlanAccepted:false},
    originalRunModified:false,newNativeCalls:0,notes:['Original baseline was NOT called again. New catalogue syntax adds retrieval capability.',
      'Provider latency is comparable as one observation; host wall time is not, because the source reader is isolated.',
      'Source IDs, public reasons and residual questions must be examined; matching operation alone is not strategic equivalence.']};
}catch(error){result={status:'incomplete',code:error.code||error.message,paidReplies:replies.map(r=>r.receipt),
  pendingRequestRetained:Boolean(operation?.pending),operationRef:operation?await store.put(operation):null,
  automaticRetry:false,formalPlanAccepted:false,originalRunModified:false,newNativeCalls:0};process.exitCode=1;}
finally{await adapter?.close();process.off('SIGTERM',pause);process.off('SIGINT',pause);}
await save('result.json',result);console.log(JSON.stringify({stage:'finished',output,status:result.status,comparison:result.comparison}));
