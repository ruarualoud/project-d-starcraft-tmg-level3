// Reproduce the v2 contract skipped at the REAL role executor, using the
// stopped v996 source-confirmation operation and its original reply as input.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
import {rosterAuthorOriginalQuestionCoverageErrorV1} from '../packages/roster-strategist/roster-author-question-contract-v1.mjs';
const dir=process.argv[2],copy=structuredClone,memory=new Map(),cache=new Map();
const get=async ref=>{if(memory.has(ref))return copy(memory.get(ref));
  if(!cache.has(ref))cache.set(ref,JSON.parse(await fs.readFile(dir+'/artifacts/'+ref+'.json','utf8')));
  return copy(cache.get(ref));};
const put=async value=>{const ref=hash(value);memory.set(ref,copy(value));return ref;};
const state=JSON.parse(await fs.readFile(dir+'/workflow.json','utf8'));
const work=state.work.find(w=>w.id.endsWith(':frontier-return:2b83f4b15da270fc:strategy-frontier'));
const assignment=await get(work.inputRef),originalOperation=copy(work.operationState);
assert.equal(work.status,'needs_model_choice');assert(originalOperation.evidenceDelivery);
let operation=copy(originalOperation),captured,injectedCalls=0;
const old=await get(originalOperation.evidenceDelivery.originalReplyRef);
const reader=await createRosterDecisionWorkflowV1({store:{get,put,load:async()=>copy(state),save:async()=>{}},
  execute:async()=>assert.fail('The offline evidence reader must not execute roles')});
const execute=createRosterWorkflowReadRoleExecutorV1({store:{get,put,load:async()=>state},sessionId:'offline-v998',
  deliberation:{deliberate:async request=>{
    injectedCalls++;captured=request;
    const decision=copy(old.output.decisions[0]);delete decision.dataQuestions;
    const output=request.responseFormat.schemaName==='roster_workflow_author_command_v1'
      ?{action:'decide',publicReason:old.output.publicReason,reads:[],catalogueQueries:[],
        questionUpdates:[],newQuestions:[],decision}:copy(old.output);
    return {output,receipt:{providerKind:'offline_injected_actual_reply',paidProviderCall:false,
      contextHash:request.contextHash,roundKind:request.roundKind,sessionId:request.sessionId,
      roundIndex:request.roundIndex,outputHash:hash(output)}};
  }}});
const control={get operationState(){return copy(operation);},checkpointOperation:async value=>{operation=copy(value);},
  readEvidence:(evidenceId,pointer)=>reader.dispatch({type:'read_evidence',consumer:work.id,evidenceId,pointer}),
  publishContext:async(value,metadata={})=>{const ref=await put(value),id='offline-v998:'+ref;
    let i=assignment.evidenceDirectory.findIndex(e=>e.id===id);
    if(i<0){i=assignment.evidenceDirectory.length;assignment.evidenceDirectory.push({id,artifactRef:ref,
      title:metadata.title??'Saved context',kind:metadata.kind??'interpretation',validity:'current',
      bindings:copy(state.scope),conditions:metadata.conditions??[],availability:'available',readPaths:[]});}
    return {...assignment.evidenceDirectory[i],evidenceNumber:i+1,
      ...(metadata.includeDirectory?{evidenceDirectory:copy(assignment.evidenceDirectory)}:{})};}};
const result=await execute(assignment,control);
const contract=captured.promptNodes.find(n=>n.kind==='author_original_question_contract');
assert.equal(contract.version,2);assert.equal(injectedCalls,1);
const errors=operation.correction?.errors??[];
console.log(JSON.stringify({contractVersion:contract.version,status:result.value?.status,
  errorCodes:errors.map(e=>e.code),injectedCalls,providerCalls:0,nativeCalls:0,productionWrites:0}));
assert(errors.some(e=>e.code==='author_original_question_coverage'),
  'Actual role execution skipped the delivered v2 question contract');
assert.equal(result.continuation,true);
assert.deepEqual(work.operationState,originalOperation);
const unsupported=rosterAuthorOriginalQuestionCoverageErrorV1({contract:{...contract,version:99},decision:old.output.decisions[0]});
assert.equal(unsupported.code,'author_question_contract_version_unsupported');
console.log(JSON.stringify({passed:true,actualExecutorRejectsWrongQuestion:true,
  unsupportedVersionNotSilentlyIgnored:true,oldOperationAndReplyPreserved:true,
  providerCalls:0,nativeCalls:0,productionWrites:0}));
