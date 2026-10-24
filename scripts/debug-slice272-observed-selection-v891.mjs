// Reproduce the actual completed-solver -> new-choice handoff, entirely in memory.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {rosterWorkflowChoiceContractV1} from '../packages/roster-strategist/roster-workflow-graph-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
const [root,out]=process.argv.slice(2),clone=structuredClone;
let state=JSON.parse(await fs.readFile(root+'/workflow.json','utf8'));
const original=clone(state),memory=new Map(),get=async ref=>memory.has(ref)?clone(memory.get(ref)):
  JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
const store={load:async()=>clone(state),save:async s=>{state=clone(s);},get,
  put:async value=>{const ref=hash(value);memory.set(ref,clone(value));return ref;}};
const work=state.work.find(w=>w.operationState?.calls?.some(c=>c.replyRef==='4313881873142605fc78b6e09113ed7dbecba0abde009c8e2be5c3347cff7186'));
assert(work,'captured repeated choice required');
const savedRequest=await get(work.operationState.calls.find(c=>c.replyRef==='4313881873142605fc78b6e09113ed7dbecba0abde009c8e2be5c3347cff7186').requestRef);
const result={pass:false,checks:[],actualProviderCalls:0,nativeExecutions:0,productionWrites:0};
try{
  const contract=rosterWorkflowChoiceContractV1({state,workId:work.id});
  assert.equal(contract.observedSources?.length,2,'completed sources need selectors in the new response scope');
  for(const source of contract.observedSources){
    const evidence=state.evidence[source.sourceEvidenceNumber-1];
    assert.equal(evidence.id,`tool-view:${source.sourceWorkId}`);
    assert.equal(source.selectionReference.sourceEvidenceNumber,source.sourceEvidenceNumber);
    assert.equal(source.optionSelected,false);
    assert.equal(source.bodyReadGranted,false);
    assert(!Object.hasOwn(source.selectionReference,'optionIndex'));
  }
  assert.equal(contract.priorProposalIsCurrentArgumentContract,false);
  // Old/error child roles must receive the same completed references, without
  // matching namespace prefixes or resetting any production recovery counter.
  const child={id:'fixture-cold-order-repair',orderRepairOf:work.id,role:work.role,bindings:work.bindings};
  assert.deepEqual(rosterWorkflowChoiceContractV1({state:{...state,work:[...state.work,child]},workId:child.id}).observedSources,contract.observedSources);
  const absent=clone(state);absent.work.find(w=>w.id===contract.observedSources[0].sourceWorkId).status='running';
  assert.equal(rosterWorkflowChoiceContractV1({state:absent,workId:work.id}).observedSources.length,1);
  const stale=clone(state);stale.evidence[contract.observedSources[0].sourceEvidenceNumber-1].bindings.source='wrong-source';
  assert.equal(rosterWorkflowChoiceContractV1({state:stale,workId:work.id}).observedSources.length,1);
  const replaced=clone(state);replaced.work.find(w=>w.id===contract.observedSources[0].sourceWorkId).resultRef='different-result';
  assert.equal(rosterWorkflowChoiceContractV1({state:replaced,workId:work.id}).observedSources.length,1);
  const unrelated={id:'unrelated',role:work.role,bindings:work.bindings,inputs:{}};
  assert.equal(rosterWorkflowChoiceContractV1({state:{...state,work:[...state.work,unrelated]},workId:unrelated.id}),null);
  assert.deepEqual(state,original);
  let captured=null;
  const executor=createRosterWorkflowReadRoleExecutorV1({store,sessionId:savedRequest.sessionId,
    onRequest:async request=>{captured=request;throw new Error('FIXTURE_REQUEST_CAPTURE_ONLY');},
    deliberation:{deliberate:async()=>{throw new Error('PROVIDER_MUST_NOT_BE_CALLED');}}});
  const inputs=savedRequest.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs;
  state.work.find(w=>w.id===work.id).status='ready';
  const workflow=await createRosterDecisionWorkflowV1({store,execute:(assignment,control)=>
    executor({...assignment,inputs:clone(inputs)},control)});
  await workflow.dispatch({type:'run_ready',workIds:[work.id],concurrency:1}).catch(error=>{
    if(!String(error.message).includes('FIXTURE_REQUEST_CAPTURE_ONLY'))throw error;});
  assert(captured,'actual role request must have reached capture boundary');
  const delivered=captured.promptNodes.find(n=>n.kind==='pending_operation_choice_contract');
  assert.deepEqual(delivered.observedSources,contract.observedSources);
  assert.equal(state.draftRef,original.draftRef);assert.equal(state.acceptanceGranted,false);
  result.checks.push({name:'completed-solver-selectors-reach-actual-cold-choice-request',pass:true,
    sourceNumbers:contract.observedSources.map(s=>s.sourceEvidenceNumber),negativeCases:4,
    choiceNotAutoApplied:true,originalProposalPreserved:true});
  result.pass=true;
}catch(error){result.error={name:error.name,message:error.message};process.exitCode=1;}
await fs.writeFile(out,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
