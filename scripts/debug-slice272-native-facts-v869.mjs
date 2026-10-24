// Reproduce the paid A answer that inferred contest Supply=0 from a Pool-only
// ability. Actual frozen Native state, scripted Provider replies, no live writes.
import fs from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1} from '../packages/online-agent-session/room-backed-spatial-rules-query-adapter-v1.mjs';
import {projectOfficialContextualSupplyValueV1} from '../packages/rule-atoms/official-contextual-supply-projection-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
const [root,sourceFile,out,previous]=process.argv.slice(2),copy=structuredClone;
const get=async ref=>JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
const saved=JSON.parse(await fs.readFile(root+'/workflow.json','utf8'));
const request=await get('889be7159115775c562aa69d6313f386fd4ea1cba2beb8f093c3a28ecbee1a10');
const paid=await get('6236e95f33471ca014dbd2aa46217f65223f5b1a3f4f44adce9f77f7ec8efbcf');
const native=JSON.parse(gunzipSync(await fs.readFile(sourceFile))).authority.state;
const stateBytes=JSON.stringify(native),authority={roomId:'offline-v869',seatKey:'player1',
  stateRevision:0,stateHash:hash(native),matchBindingHash:hash('offline-native'),legalSpaceHash:hash('offline-menu')};
const aggregate={stateRevision:0,envelope:{state:native,stateHash:authority.stateHash,matchBindingHash:authority.matchBindingHash}};
const adapter=createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1({seatKey:'player1',
  roomStore:{loadRoom:async()=>aggregate},rulesRuntime:{instantiate:()=>{throw Error('No action is permitted');}}});
const query=()=>adapter.query({authority,queryKind:'contextual_supply_projection',arguments:{unitIds:['u_medic_1'],
  contexts:['supply_pool_calculation','mission_marker_control']}});
const prior=previous?JSON.parse(await fs.readFile(previous,'utf8')):null,checks=[],steps=[];
async function check(name,fn){const old=prior?.checks.find(x=>x.name===name&&x.pass);
  if(old){checks.push({...old,inheritedFrom:previous});return;}
  try{checks.push({name,pass:true,...await fn()});}catch(e){checks.push({name,pass:false,error:e.message,stack:e.stack?.split('\n').slice(0,4)});}
  console.log(JSON.stringify(checks.at(-1)));}
await check('same-native-supply-query-not-model-calculation',async()=>{
  const receipt=await query();steps.push({stage:'native_query',receipt});assert.equal(receipt.precision,'exact',JSON.stringify(receipt));
  const row=receipt.result.units[0];assert.equal(row.unitId,'u_medic_1');
  for(const context of ['supply_pool_calculation','mission_marker_control'])
    assert.deepEqual(row.contexts[context],projectOfficialContextualSupplyValueV1({state:native,pieceId:row.unitId,context}));
  assert.equal(row.contexts.supply_pool_calculation.effectiveSupply,0);
  assert.equal(row.contexts.mission_marker_control.effectiveSupply,1);
  assert.equal(receipt.result.markerControlProven,false);
  assert.equal(JSON.stringify(native),stateBytes);
  const stale=await adapter.query({authority:{...authority,stateRevision:1},queryKind:'contextual_supply_projection',arguments:{unitIds:['u_medic_1']}});
  assert.equal(stale.reason,'RULES_QUERY_AUTHORITY_STALE');
  const wrong=await adapter.query({authority,queryKind:'contextual_supply_projection',arguments:{unitIds:['u_medic_1'],currentSupply:0}});
  assert.equal(wrong.reason,'CONTEXTUAL_SUPPLY_QUERY_ARGUMENTS_INVALID');
  return {poolSupply:0,missionSupply:1,stateUnchanged:true};
});
await check('paid-source-only-answer-must-return-for-native-facts',async()=>{
  let state=copy(saved),memory=new Map(),captured;const id=request.promptNodes.find(n=>n.kind==='workflow_role_assignment').workId;
  const work=state.work.find(w=>w.id===id);
  work.operationState.calls=work.operationState.calls.slice(0,-1);work.operationState.turn=2;
  work.operationState.pending=null;work.operationState.correction=null;work.operationState.consecutiveCorrections=0;
  work.status='ready';work.failure=null;delete work.resultRef;
  const draftBefore=state.draftRef;
  const store={load:async()=>copy(state),save:async v=>{state=copy(v);},
    get:async ref=>memory.has(ref)?copy(memory.get(ref)):get(ref),put:async v=>{const ref=hash(v);memory.set(ref,copy(v));return ref;}};
  const executor=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'v869-injected-native-fact',
    deliberation:{deliberate:async q=>{captured=q;const wire=copy(paid.output);
      if(q.responseFormat.schema.properties.conclusion.anyOf[0].properties.nativeFacts)wire.conclusion.nativeFacts=[];
      return {output:wire,receipt:{fixture:true,contextHash:q.contextHash,roundKind:q.roundKind,
        sessionId:q.sessionId,roundIndex:q.roundIndex,outputHash:hash(wire)}};}}});
  const delivered=request.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs;
  const workflow=await createRosterDecisionWorkflowV1({store,execute:(assignment,control)=>executor({...assignment,inputs:copy(delivered)},control)});
  await workflow.dispatch({type:'run_ready',workIds:[id],concurrency:1});
  const after=state.work.find(w=>w.id===id),result=after.resultRef?await store.get(after.resultRef):null;
  steps.push({stage:'paid_wrong_answer',captured,result,status:after.status,correction:after.operationState.correction});
  assert.ok(after.operationState.correction?.errors.some(e=>e.code==='native_fact_observations_required'),
    JSON.stringify({status:after.status,result,correction:after.operationState.correction}));
  assert.notEqual(after.status,'evidence_ready');assert.equal(state.draftRef,draftBefore);assert.equal(state.acceptanceGranted,false);
  return {paidAnswerNotApproved:true,armyPlanUnchanged:true};
});
await check('native-value-mismatch-corrected-through-same-role',async()=>{
  const receipt=await query();assert.equal(receipt.precision,'exact');
  let state=copy(saved),memory=new Map(),calls=0;
  const id=request.promptNodes.find(n=>n.kind==='workflow_role_assignment').workId,work=state.work.find(w=>w.id===id);
  work.operationState.calls=work.operationState.calls.slice(0,-1);work.operationState.turn=2;
  work.operationState.pending=null;work.operationState.correction=null;work.operationState.consecutiveCorrections=0;
  work.status='ready';work.failure=null;delete work.resultRef;
  const body={operation:'spatial',receipt:{queryKind:'contextual_supply_projection',resultStatus:'ok',queryReceipt:receipt},
    stateRef:{sourceStateHash:authority.stateHash,stateHash:authority.stateHash}};
  const ref=hash(body);memory.set(ref,body);
  const entry={id:'tool:v869-native-supply',kind:'tool_receipt',title:'Actual Native supply query',
    artifactRef:ref,bindings:copy(work.bindings),conditions:['Frozen Native state, no room mutation'],availability:'available'};
  state.evidence.push(entry);
  const store={load:async()=>copy(state),save:async v=>{state=copy(v);},
    get:async ref=>memory.has(ref)?copy(memory.get(ref)):get(ref),put:async v=>{const ref=hash(v);memory.set(ref,copy(v));return ref;}};
  let number;
  const executor=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'v869-repair-native-value',
    deliberation:{deliberate:async q=>{
      calls++;const wire=copy(paid.output);wire.conclusion.evidenceNumbers.push(number);
      wire.conclusion.nativeFacts=[{evidenceNumber:number,
        pointer:'/receipt/queryReceipt/result/units/0/contexts/mission_marker_control/effectiveSupply',
        expectedValueJson:calls===1?'0':'1',purpose:'Current three-model Medic Supply in marker-control context'}];
      if(calls===2){wire.publicReason='Native value corrects the prior prose inference; no strategy/Plan is approved.';
        wire.conclusion.answer='当前原生快照中，三模型 Medic 的占点用途 Supply 为 1；不能把补给池归零推广到占点。此快照的单位仍在预备队，不证明它已占领任何任务点。';
        wire.conclusion.conditions=['Exact supplied state only; no future aura, casualty or marker-control claim.'];}
      steps.push({stage:'injected_'+calls,request:q,reply:wire});
      return {output:wire,receipt:{fixture:true,contextHash:q.contextHash,roundKind:q.roundKind,
        sessionId:q.sessionId,roundIndex:q.roundIndex,outputHash:hash(wire)}};}}});
  const delivered=request.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs;
  const workflow=await createRosterDecisionWorkflowV1({store,execute:(assignment,control)=>{
    number=assignment.evidenceDirectory.findIndex(e=>e.id===entry.id)+1;
    return executor({...assignment,inputs:{...copy(delivered),nativeObservation:{source:'evidence',evidenceId:entry.id,
      status:'read',pointer:'',value:copy(body)}}},control);
  }});
  await workflow.dispatch({type:'run_ready',workIds:[id],concurrency:1});
  let after=state.work.find(w=>w.id===id);
  assert.ok(after.operationState.correction?.errors.some(e=>e.code==='native_fact_value_mismatch'),JSON.stringify(after.operationState.correction));
  assert.equal(state.acceptanceGranted,false);
  await workflow.dispatch({type:'continue_work',workId:id});
  await workflow.dispatch({type:'run_ready',workIds:[id],concurrency:1});
  after=state.work.find(w=>w.id===id);assert.equal(after.status,'evidence_ready',JSON.stringify(after.operationState.correction));
  const result=await store.get(after.resultRef);steps.push({stage:'corrected_answer_pending_independent_review',result});
  assert.equal(result.value.experimentConclusion.verifiedNativeFacts[0].observedValue,1);
  assert.equal(result.value.experimentConclusion.verifiedNativeFacts[0].questionCoverageApproved,false);
  assert.equal(state.acceptanceGranted,false);assert.equal(state.draftRef,saved.draftRef);
  return {scriptedReplies:calls,valueCheckedByHost:true,independentReviewStillRequired:true,armyPlanUnchanged:true};
});
await check('same-product-laboratory-transports-native-supply',async()=>{
  const {createPregameSceneLaboratoryV1}=await import('../packages/roster-strategist/pregame-scene-laboratory-v1.mjs');
  const {createOfficialCurrentProductMatchRuntimeV1}=await import('../packages/product-composition/official-current-product-match-runtime-v1.mjs');
  const {createOfficialCurrentProductMatchRuntimeV6}=await import('../packages/product-composition/official-current-product-match-runtime-v6.mjs');
  const {createOfficialUnitCompositionUpgradeDataBundleV1}=await import('../packages/source-data/official-unit-composition-upgrade-data-bundle-v1.mjs');
  const {createOfficialArmyBuilderQueryPortV1}=await import('../packages/roster-strategist/army-builder-query-port-v1.mjs');
  const {loadOfficialDevelopmentTrancheSourceLockFixtureV1}=await import('./support/official-development-tranche-source-lock-fixture-v1.mjs');
  const config=JSON.parse(await fs.readFile('build/ticket-23-three-arm-performance-baseline-20261010-v1/common-v79-plan-recovery-config.private.json','utf8'));
  const fixture=await loadOfficialDevelopmentTrancheSourceLockFixtureV1({root:config.fixtureRoot});
  const builder=createOfficialArmyBuilderQueryPortV1({unitCompositionUpgradeDataBundle:createOfficialUnitCompositionUpgradeDataBundleV1({dataset:fixture.dataset})});
  const lab=createPregameSceneLaboratoryV1({laboratoryId:'v869-native-transport',sourceState:native,armyBuilderPort:builder,
    rulesRuntime:createOfficialCurrentProductMatchRuntimeV6({legacyRuntime:createOfficialCurrentProductMatchRuntimeV1({dataset:fixture.dataset,state:copy(native)})})});
  const context=lab.describeQueryContext({seatKey:'player1'});
  assert.equal(context.queryContracts.contextual_supply_projection.precision,'exact');
  const receipt=await lab.querySpatial({queryId:'medic-context',seatKey:'player1',
    queryKind:'contextual_supply_projection',argumentsJson:JSON.stringify({unitIds:['u_medic_1']})});
  assert.equal(receipt.resultStatus,'ok',JSON.stringify(receipt));
  const row=receipt.queryReceipt.result.units[0];
  assert.equal(row.contexts.supply_pool_calculation.effectiveSupply,0);
  assert.equal(row.contexts.mission_marker_control.effectiveSupply,1);
  assert.equal(lab.proveMutationZero().sourceStateMutationCount,0);
  steps.push({stage:'actual_product_lab',receipt});
  return {nativeCalls:1,productQuerySameAsLive:true,sourceMutations:0};
});
await fs.writeFile(out,JSON.stringify({pass:checks.every(x=>x.pass),checks,steps,actualProviderCalls:0,
  productionWrites:0,formalPlans:0,trainingTruth:false},null,2)+'\n');
process.exitCode=checks.every(x=>x.pass)?0:1;
