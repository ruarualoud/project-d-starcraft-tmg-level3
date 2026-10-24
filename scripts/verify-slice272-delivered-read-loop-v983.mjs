// Reproduce the v982 repeated five pointers through the actual read-role runner.
// All artifact changes below are in memory; the production stop remains intact.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
const dir=process.argv[2],copy=structuredClone,memory=new Map(),cache=new Map();
const get=async ref=>{if(memory.has(ref))return copy(memory.get(ref));
  if(!cache.has(ref))cache.set(ref,JSON.parse(await fs.readFile(dir+'/artifacts/'+ref+'.json','utf8')));
  return copy(cache.get(ref));};
const put=async value=>{const ref=hash(value);memory.set(ref,copy(value));return ref;};
const state=JSON.parse(await fs.readFile(dir+'/workflow.json','utf8')),before=hash(state);
const work=state.work.find(w=>w.id.endsWith(':capability-delivery-reconsideration:v2:investigation'));
const call=work.operationState.calls.find(c=>c.turn===3),request=await get(call.requestRef);
const paid=await get(call.replyRef),original=hash(paid);
const pointers=['/operations/7','/operations/8','/operations/0',
  '/receipt/actionSpace/actionCapabilityReference/routes/16','/receipt/actionSpace/actionCapabilityReference/routes/17'];
const injected=copy(paid);injected.output.reads=injected.output.reads.filter(r=>pointers.includes(r.pointer));
assert.equal(injected.output.reads.length,5);
const injectedRef=await put(injected);
let operation=copy(work.operationState),fetches=0,providerCalls=0;
operation.turn=3;operation.calls=operation.calls.filter(c=>c.turn<=3);
operation.calls.at(-1).replyRef=injectedRef;
operation.pending=null;operation.correction=null;operation.consecutiveCorrections=0;
for(const key of ['evidenceDelivery','readPreparationReturnRequired','evidenceDecisionRequired','noProgressStop'])delete operation[key];
operation.revalidateReplyRef=injectedRef;operation.savedRevalidationRequestRef=call.requestRef;
const assignment=await get(work.inputRef);
const execute=createRosterWorkflowReadRoleExecutorV1({store:{get,put,load:async()=>copy(state)},sessionId:'offline-v983',
  deliberation:{deliberate:async()=>{providerCalls++;assert.fail('No Provider dispatch during saved-reply reproduction');}}});
const control={get operationState(){return copy(operation);},checkpointOperation:async value=>{operation=copy(value);},
  readEvidence:async()=>{fetches++;assert.fail('An already delivered pointer must not be fetched');},
  publishContext:async(value,metadata={})=>{const ref=await put(value),id='offline-v983:'+ref;
    let index=assignment.evidenceDirectory.findIndex(e=>e.id===id);
    if(index<0){index=assignment.evidenceDirectory.length;assignment.evidenceDirectory.push({id,artifactRef:ref,
      title:metadata.title??'Saved context',kind:metadata.kind??'interpretation',validity:'current',bindings:copy(state.scope),conditions:metadata.conditions??[],availability:'available',readPaths:[]});}
    return {...assignment.evidenceDirectory[index],evidenceNumber:index+1,
      ...(metadata.includeDirectory?{evidenceDirectory:copy(assignment.evidenceDirectory)}:{})};}};
if(!process.argv.includes('--remaining')){
await assert.rejects(()=>execute(assignment,control),error=>error.message==='ROSTER_WORKFLOW_ROLE_NO_PROGRESS',
  'A fully delivered read-only repeat must persist a stop, not grant another model turn');
assert.equal(operation.noProgressStop.reason,'already_delivered_immutable_reads');
assert.equal(operation.noProgressStop.repeatedReplyRef,injectedRef);
assert.equal(operation.noProgressStop.automaticRetry,false);
assert.equal(operation.noProgressStop.readProgress.alreadyDelivered.length,5);
await assert.rejects(()=>execute(assignment,control),/ROSTER_WORKFLOW_ROLE_NO_PROGRESS/,'Cold resume must retain the stop');
assert.equal(fetches,0);assert.equal(providerCalls,0);
}
const {projectRosterReadRequestProgressV1:progress}=await import('../packages/roster-strategist/roster-workflow-read-context-v1.mjs');
const directory=assignment.evidenceDirectory.map((e,i)=>({...e,number:i+1}));
const actual=progress({request,reads:paid.output.reads,directory});
assert.equal(actual.alreadyDelivered.length,7);assert.equal(actual.notDelivered.length,0);
assert.equal(actual.noNewInformation,true,'All seven real requested values were delivered, including a complete parent child');
const mixedRequest=copy(request);
for(const node of mixedRequest.promptNodes)if(node.kind==='exact_read_results')
  node.results=node.results.filter(r=>!['/operations/7','/operations/8'].includes(r.pointer));
const mixed=progress({request:mixedRequest,reads:paid.output.reads,directory});
assert.equal(mixed.alreadyDelivered.length,5);assert.equal(mixed.notDelivered.length,2);
assert.equal(mixed.noNewInformation,false,'Two genuinely undelivered bodies must keep the mixed batch open');
const partial=copy(request);partial.promptNodes=partial.promptNodes.filter(n=>n.kind!=='exact_read_results');
assert.equal(progress({request:partial,reads:injected.output.reads,directory}).noNewInformation,false,
  'Fetch history, directory metadata and compact projections are not proof of exact delivery');
const nested=progress({request,reads:[{evidenceNumber:2202,pointer:'/operations/7/specContract'}],directory});
assert.equal(nested.noNewInformation,true,'A complete delivered parent includes its exact child');
const absent=progress({request,reads:[{evidenceNumber:2202,pointer:'/operations/7/notARealField'}],directory});
assert.equal(absent.noNewInformation,false,'Do not infer a nonexistent child from a pointer prefix');
assert.equal(progress({request,reads:injected.output.reads,catalogueQueries:[{query:'new'}],directory}).noNewInformation,false);
assert.equal(hash(state),before);assert.equal(hash(await get(call.replyRef)),original);
console.log(JSON.stringify({ok:true,mode:process.argv.includes('--remaining')?'remaining_only':'all',
  checks:[...(!process.argv.includes('--remaining')?['actual_role_persists_repeat_stop','cold_resume_stays_stopped']:[]),
  'actual_third_reply_seven_repeats','mixed_keeps_two_genuinely_new_reads','fetched_not_delivered_is_not_loop','complete_parent_child_coverage',
  'missing_child_not_inferred','catalogue_query_not_silently_discarded','raw_artifacts_preserved'],
  providerCalls,nativeCalls:0,productionWrites:0}));
