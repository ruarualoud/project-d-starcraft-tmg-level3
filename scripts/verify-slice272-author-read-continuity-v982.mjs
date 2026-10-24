// Actual v980 read handoff: a typed decide command was sent raw to a legacy
// finish confirmation, losing the canonical ledger/operation boundary.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {projectRosterStrategyRepairOutputV1} from '../packages/roster-strategist/roster-workflow-semantic-repair-v1.mjs';
import {projectRosterAuthorCommandV1} from '../packages/roster-strategist/roster-workflow-author-command-v1.mjs';
const dir=process.argv[2],copy=structuredClone,memory=new Map(),cache=new Map();
const get=async ref=>{if(memory.has(ref))return copy(memory.get(ref));
  if(!cache.has(ref))cache.set(ref,JSON.parse(await fs.readFile(dir+'/artifacts/'+ref+'.json','utf8')));
  return copy(cache.get(ref));};
const put=async value=>{const ref=hash(value);memory.set(ref,copy(value));return ref;};
const state=JSON.parse(await fs.readFile(dir+'/workflow.json','utf8')),before=hash(state);
const work=state.work.find(w=>w.id.endsWith(':capability-delivery-reconsideration:v2'));
const replyRef='15eb2ba3d7d609e97c7b53f72cbb46853901b8abe64aae287fde289a2bcaf7ff';
const call=work.operationState.calls.find(c=>c.replyRef===replyRef);assert(call);
const source=await get(call.requestRef),reply=await get(replyRef);
const expected=projectRosterStrategyRepairOutputV1({request:source,output:reply.output});assert.deepEqual(expected.errors,[]);
let operation=copy(work.operationState);
operation.turn=call.turn;operation.calls=operation.calls.filter(c=>c.turn<=call.turn);
operation.pending=null;operation.correction=null;operation.consecutiveCorrections=0;
operation.evidenceDelivery=copy(operation.evidenceReadHandoffs.find(h=>h.originalReplyRef===replyRef));
const assignment=await get(work.inputRef);let captured;
const execute=createRosterWorkflowReadRoleExecutorV1({store:{get,put,load:async()=>copy(state)},sessionId:'offline-v982',
  deliberation:{deliberate:async q=>{captured=q;throw Error('CAPTURE_ONLY');}}});
const control={get operationState(){return copy(operation);},checkpointOperation:async v=>{operation=copy(v);},
  readEvidence:async()=>assert.fail('No new source fetch while constructing the confirmation'),
  publishContext:async(value,metadata={})=>{const ref=await put(value),id='offline-v982:'+ref;
    let i=assignment.evidenceDirectory.findIndex(e=>e.id===id);
    if(i<0){i=assignment.evidenceDirectory.length;assignment.evidenceDirectory.push({id,artifactRef:ref,
      title:metadata.title??'Saved context',kind:metadata.kind??'interpretation',validity:'current',bindings:copy(state.scope),conditions:metadata.conditions??[],availability:'available',readPaths:[]});}
    return {...assignment.evidenceDirectory[i],evidenceNumber:i+1,
      ...(metadata.includeDirectory?{evidenceDirectory:copy(assignment.evidenceDirectory)}:{})};}};
try{await execute(assignment,control);}catch(e){if(e.message!=='CAPTURE_ONLY')throw e;}
assert(captured);
assert.equal(captured.responseFormat.schemaName,'roster_workflow_author_command_v1','A normal source read must not switch the owner back to the full reply envelope');
assert.equal(captured.promptNodes.find(n=>n.kind==='strategy_semantic_repair').stage,'source_confirmation');
assert(!captured.promptNodes.some(n=>n.kind==='local_contract_feedback'),'A normal read confirmation is not fabricated error correction');
assert.deepEqual(captured.strategyRepairState.originalOutput,expected.output,'Reconstruct the saved command with its own original mapper/ledger, not by rewriting it');
const d=copy(expected.output.decisions[0]);delete d.dataQuestions;
const update={questionNumber:1,...copy(expected.output.decisions[0].dataQuestions[0])};delete update.question;
update.publicReason+=' [controlled local update]';
const next=projectRosterAuthorCommandV1({request:captured,output:{action:'decide',publicReason:'Controlled projection only',
  reads:[],catalogueQueries:[],questionUpdates:[update],newQuestions:[],decision:d}});
assert.deepEqual(next.errors,[]);
assert.deepEqual(next.output.decisions[0].dataQuestions.slice(1),expected.output.decisions[0].dataQuestions.slice(1));
assert.equal(next.output.decisions[0].dataQuestions[0].publicReason,update.publicReason);
assert.equal(hash(state),before);
console.log(JSON.stringify({ok:true,checks:['actual_executor_normal_read_keeps_owner_command','original_mapper_restores_complete_ledger',
  'explicit_update_only_unmentioned_questions_preserved','no_fake_feedback_or_source_mutation'],providerCalls:0,nativeCalls:0,productionWrites:0}));
