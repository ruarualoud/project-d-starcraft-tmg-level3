// Concrete fresh-product failures: B refuses an intermediate legal edit until
// one bounded budget branch reaches the final target; A infers no in-game
// reinforcements from preset_immutable. Capture the SAME role input seam.
// This proves delivery only; real model correction still needs production.
import fs from 'node:fs/promises';import path from 'node:path';
import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const cases=[
  {name:'editable',dir:'slice272-product-generation-v645-M86Cg9',id:'decision-58c2b2f9-e4cf-4b5d-9ac3-4c8c36bbb0e1',
    reply:'2a64103e-2a3c-4cf2-9f40-6f85bfccc93a'},
  {name:'fixed',dir:'slice272-product-generation-v645-I7zekC',id:'decision-959c1d9c-d6e0-43b4-8196-faef5b42fc34',
    requestRef:'6576af46b273cdc66c2018ffe6db2a7bb1acce6365b653fd7df8a65107fcabd9',
    draftRef:'5d828a03424caacdba6897c516df43d4af46d6af36b79788c0c3771712bfbe5e'},
];
const results=[];
for(const fixture of cases){
  const base=path.join(root,'build',fixture.dir,'workspace/decision-workflows',fixture.id);
  const stateFile=path.join(base,'workflow.json'),stateBytes=await fs.readFile(stateFile),state=JSON.parse(stateBytes);
  const artifact=ref=>path.join(base,'artifacts',ref+'.json');
  let request,immutableFile;
  if(fixture.reply){
    immutableFile=path.join(root,'build',fixture.dir,'workspace/decision-product-journeys',fixture.id,fixture.reply+'.json');
    const paid=await read(immutableFile);
    assert.match(paid.output.publicReason,/changing it now would be an unjustified strategic revision before the budget question is resolved/);
    const call=state.work.flatMap(w=>w.operationState?.calls??[]).find(c=>c.receipt?.contextHash===paid.receipt.contextHash);
    assert(call,'actual B request must remain recoverable');request=await read(artifact(call.requestRef));
  }else{
    immutableFile=artifact(fixture.draftRef);
    const draft=await read(immutableFile);
    assert.equal(draft.mode,'fixed');
    assert.match(draft.plan.deploymentConcept.reinforcementPolicyText,/无增援.*preset_immutable/);
    request=await read(artifact(fixture.requestRef));
  }
  const immutableBytes=await fs.readFile(immutableFile);
  const assignment=request.promptNodes.find(n=>n.kind==='workflow_role_assignment');assert(assignment);
  const memory=new Map(),store={load:async()=>structuredClone(state),
    get:async ref=>memory.has(ref)?structuredClone(memory.get(ref)):read(artifact(ref)),
    put:async value=>{const key=createHash('sha256').update(JSON.stringify(value)).digest('hex');memory.set(key,structuredClone(value));return key;}};
  const marker=Error('CAPTURE_ONLY');let captured;
  const execute=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'isolated-v648-'+fixture.name,
    deliberation:{deliberate:async()=>{throw Error('PROVIDER_FORBIDDEN');}},
    onRequest:async value=>{captured=value;throw marker;}});
  await assert.rejects(()=>execute({workId:assignment.workId,role:assignment.role,scope:assignment.scope,
    evidenceDirectory:state.evidence,inputs:assignment.inputs},
    {operationState:{version:1,turn:0,reads:[],calls:[],correction:null,consecutiveCorrections:0},
      checkpointOperation:async()=>{},readEvidence:async()=>{throw Error('UNEXPECTED_READ');}}),e=>e===marker);
  const lifecycle=captured.promptNodes.find(n=>n.kind==='draft_lifecycle_contract');
  assert(lifecycle,'the real input seam must distinguish construction, final release and in-game rules');
  assert.equal(lifecycle.construction.legalPartialDraftMayBeCommitted,true);
  assert.equal(lifecycle.finalRelease.requestedTargetStillRequired,true);
  assert.equal(lifecycle.rosterEditingPermission.scope,'pre_game_roster_selection_edits');
  assert.equal(lifecycle.rosterEditingPermission.determinesInGameReinforcement,false);
  assert.equal(lifecycle.budgetPage.provesGlobalImpossibility,false);
  assert.equal(lifecycle.strategyOwnerChoosesMutation,true);
  assert(!JSON.stringify(lifecycle).includes('2000'),'lifecycle must not hard-code this scenario target');
  assert((await fs.readFile(immutableFile)).equals(immutableBytes));
  assert((await fs.readFile(stateFile)).equals(stateBytes));
  results.push({mode:fixture.name,actualInputCaptured:true,immutableEvidenceUnchanged:true});
}
console.log(JSON.stringify({status:'passed',cases:results,providerCalls:0,nativeCalls:0,productionWrites:0,
  historicalPlanRewritten:false,modelCorrectionProven:false}));
