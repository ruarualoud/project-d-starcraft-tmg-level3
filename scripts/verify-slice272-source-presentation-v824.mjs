// Actual v4 reviewer treated transport interning as missing candidate execution,
// and Host non-approval flags as failed controlled predicates.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
import {encodeRosterProviderInputV1,projectRosterProviderOutputReferencesV1} from '../packages/roster-strategist/roster-prompt-evidence-encoding-v1.mjs';
const root=process.argv[2],resultFile=process.cwd()+'/build/slice272-v824-gate-'+Date.now()+'.json';
const get=async ref=>JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
process.on('uncaughtException',async error=>{const out={pass:false,message:error.message,stack:error.stack?.split('\n').slice(0,6)};
  await fs.writeFile(resultFile,JSON.stringify(out,null,2));console.error(JSON.stringify(out));process.exitCode=1;});
console.log(JSON.stringify({stage:'started',resultFile}));
const old=await get('d70efa849866a91ca185ca080b237c74535cd91c6bb3a7b97a859f9dd5d8cb48');
const originalHash=hash(old),originalEncoding=encodeRosterProviderInputV1(old);
const delivered=old.promptNodes.find(n=>n.kind==='workflow_role_assignment');
let state=JSON.parse(await fs.readFile(root+'/workflow.json','utf8'));
const sourceHash=hash(state),work=state.work.find(w=>w.id===delivered.workId),memory=new Map();
work.status='ready';work.failure=null;work.operationState.pending=null;
let captured;
const store={load:async()=>structuredClone(state),save:async value=>{state=structuredClone(value);},
  get:async ref=>memory.has(ref)?structuredClone(memory.get(ref)):get(ref),
  put:async value=>{const ref=hash(value);memory.set(ref,structuredClone(value));return ref;}};
const executor=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'source-presentation-v824',
  onRequest:async request=>{captured=request;throw Error('V824_INPUT_CAPTURE_ONLY');},
  deliberation:{deliberate:async()=>{throw Error('NO_PROVIDER_ALLOWED');}}});
const workflow=await createRosterDecisionWorkflowV1({store,execute:(assignment,control)=>executor({
  ...assignment,inputs:structuredClone(delivered.inputs),scope:structuredClone(delivered.scope)},control)});
await workflow.dispatch({type:'run_ready',workIds:[work.id],concurrency:1});
assert.ok(captured,'capture a real newly assembled role request at the product callback');
const encoded=encodeRosterProviderInputV1(captured);
const references=value=>{let found=[];const walk=(v,p)=>{if(!v||typeof v!=='object')return;
  if(v.kind==='same_request_evidence_reference_v1')found.push({path:p,value:v});
  for(const [k,x]of Object.entries(v))walk(x,p+'/'+k);};walk(value,'');return found;};
assert.equal(references(JSON.parse(encoded.input)).length,0,'source reviewer must see independent full values, not cross-source transport aliases');
assert.equal(encoded.version,'verbatim_v1');
const input=JSON.parse(encoded.input).promptNodes.find(n=>n.kind==='workflow_role_assignment');
const scenes=input.inputs.activeHypothesisTests.value.assetCatalogue.controlledSceneComparisons;
for(const row of scenes){
  assert.equal(Object.hasOwn(row,'allControlledConditionsApproved'),false);
  assert.equal(Object.hasOwn(row,'wholeStateIdentityEqual'),false);
  assert.equal(Object.hasOwn(row,'runtimeCompositionIdentityEqual'),false);
  assert.ok(row.proofScope.notMeasured.includes('combined_attack_losses'));
  const original=delivered.inputs.activeHypothesisTests.value.assetCatalogue.controlledSceneComparisons
    .find(x=>x.targetScene.artifactRef===row.targetScene.artifactRef);
  assert.deepEqual(row.projectionCompatibility,original.projectionCompatibility);
  assert.equal(row.exactModelPositionsEqual,original.exactModelPositionsEqual);
  assert.deepEqual(row.targetScene,original.targetScene,'original source locations remain exact and readable');
}
assert.deepEqual(JSON.parse(encoded.input).promptNodes.find(n=>n.kind==='exact_read_results'),
  captured.promptNodes.find(n=>n.kind==='exact_read_results'),'no rewriting, dropping, or invented raw source value');
// Historical requests retain their original encoding, including issued output handles.
assert.equal(encodeRosterProviderInputV1(old).input,originalEncoding.input);
const legacyHandle=references(JSON.parse(originalEncoding.input))[0]?.value;assert.ok(legacyHandle);
assert.equal(projectRosterProviderOutputReferencesV1({request:captured,output:{value:legacyHandle}}).errors.length,1);
assert.equal(hash(old),originalHash);
assert.equal(hash(JSON.parse(await fs.readFile(root+'/workflow.json','utf8'))),sourceHash);
const out={pass:true,actualRoleRequestCaptured:true,fullIndependentSourceValues:true,
  hostBookkeepingNotShownAsPredicate:false,originalLocationsAndFactValuesKept:true,oldEncodingPreserved:true,
  oldReferenceNotIssuedToNewRequest:true,beforeCharacters:encoded.beforeCharacters,afterCharacters:encoded.afterCharacters,
  providerCalls:0,nativeCalls:0,productionWrites:0,sourceOrStrategyApproved:false};
out.hostBookkeepingNotShownAsPredicate=true;
await fs.writeFile(resultFile,JSON.stringify(out,null,2));console.log(JSON.stringify(out));
