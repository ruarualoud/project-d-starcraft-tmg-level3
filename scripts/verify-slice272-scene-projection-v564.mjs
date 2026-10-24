// Actual baseline0 / alternative16: a same-scene comparison must carry enemy
// positions too, without asking the model to retype an eleven-unit layout.
import fs from 'node:fs/promises';
import path from 'node:path';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createPregameSceneLaboratoryV1} from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import {createRosterWorkflowLaboratoryExecutorV1,compileRosterWorkflowExperimentV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
import {createOfficialCurrentProductMatchRuntimeV1} from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';
import {createOfficialCurrentProductMatchRuntimeV6} from '../packages/product-composition/official-current-product-match-runtime-v6.mjs';
import {createOfficialUnitCompositionUpgradeDataBundleV1} from '../packages/source-data/official-unit-composition-upgrade-data-bundle-v1.mjs';
import {createOfficialArmyBuilderQueryPortV1} from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import {loadOfficialDevelopmentTrancheSourceLockFixtureV1} from './support/official-development-tranche-source-lock-fixture-v1.mjs';
const root=process.cwd(),run=path.resolve(process.argv[2]),base=path.join(run,'workspace/decision-workflows/candidate-capability');
const original=await fs.readFile(path.join(base,'workflow.json'),'utf8'),state=JSON.parse(original);
const temporary=new Map(),get=async ref=>temporary.has(ref)?temporary.get(ref):JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const targetHash='cd63408a284fc14467951453645d0fa736e1d0ff1d90f48c4ed0de8434c12bbd';
const referenceHash='2c58805eda75abe0623e54ccf1353f45a9042922a6b83a309e83f8e1cc3a42f8';
const saved=[];for(const e of state.events.filter(e=>e.type==='result_saved')){
  const w=state.work.find(w=>w.id===e.workId);if(w?.role==='roster_workflow_tool')saved.push((await get(e.resultRef)).value);
}
const reference=saved.find(v=>v.receipt?.branchStateHash===referenceHash),alternative=saved.find(v=>v.operation==='candidate_context'&&v.receipt?.contextRef===reference.contextRef);
const sources=new Map();for(const file of await fs.readdir(path.join(run,'workspace/laboratory-sources'))){
  if(!file.endsWith('.json.gz'))continue;const s=JSON.parse(gunzipSync(await fs.readFile(path.join(run,'workspace/laboratory-sources',file))));sources.set(hash(s.authority.state),s.authority);
}
const config=JSON.parse(await fs.readFile(path.join(root,'build/ticket-23-three-arm-performance-baseline-20261010-v1/common-v79-plan-recovery-config.private.json'),'utf8'));
const fixture=await loadOfficialDevelopmentTrancheSourceLockFixtureV1({root:config.fixtureRoot});
const builder=createOfficialArmyBuilderQueryPortV1({unitCompositionUpgradeDataBundle:createOfficialUnitCompositionUpgradeDataBundleV1({dataset:fixture.dataset})});
const makeLab=descriptor=>{const authority=sources.get(descriptor.sourceStateHash);assert.ok(authority);return createPregameSceneLaboratoryV1({laboratoryId:descriptor.laboratoryId,sourceRoomRef:descriptor.sourceRoomRef,
  sourceState:authority.state,matchBinding:authority.matchBinding,armyBuilderPort:builder,
  rulesRuntime:createOfficialCurrentProductMatchRuntimeV6({legacyRuntime:createOfficialCurrentProductMatchRuntimeV1({dataset:fixture.dataset,state:structuredClone(authority.state)})})});};
const targetDescriptor=saved.find(v=>v.receipt?.sourceStateHash===targetHash).receipt;
const target=makeLab(targetDescriptor),referenceLab=makeLab(alternative.receipt.laboratory);
for(const v of saved){if(v.contextRef!==reference.contextRef||!v.receipt?.branchStateHash)continue;
  if(v.operation==='formation_scene')referenceLab.restoreFormationSelectionBranch({receipt:v.receipt,base:v.request.base});
  else if(v.operation==='scenario')referenceLab.restoreHypotheticalBranch({receipt:v.receipt,spec:v.request.spec,base:v.request.base});
}
const store={get,load:async()=>state,put:async value=>{const ref=hash(value);temporary.set(ref,structuredClone(value));return ref;}};
const executor=createRosterWorkflowLaboratoryExecutorV1({laboratory:target,store,builderPort:builder,
  getCandidateInput:async()=>alternative.receipt.candidateInput,createCandidateLaboratory:async()=>referenceLab});
assert.ok(executor.descriptor().operations.some(o=>o.operation==='project_scene'),'same-product scene projection capability is missing');
const execute=async(id,operation,args)=>{
  const [job]=compileRosterWorkflowExperimentV1({scope:state.scope,namespace:id,evidenceDirectory:state.evidence,
    order:{orderId:id,purpose:'Actual baseline comparison missing opponent positions',scenarioAssumptions:['Same selected geometry; changed composition explicitly repacked'],stopAndReturnToModelWhen:'unhandled difference',
      steps:[{stepId:'tool',operation,argumentsJson:JSON.stringify(args),bindings:[],guards:[],publicReason:'source-bound scene projection'}]}});
  return executor.execute({workId:job.id,inputs:{request:{value:job.inputs.request.value}}},{checkpointOperation:async()=>{}});
};
const created=await execute('candidate','candidate_context',{candidateInput:alternative.receipt.candidateInput});
assert.equal(created.value.status,'completed');
const stateRef={schema:'roster_workflow_state_ref_v1',contextRef:null,sourceStateHash:targetHash,stateHash:targetHash};
const referenceStateRef={schema:'roster_workflow_state_ref_v1',contextRef:created.value.receipt.contextRef,sourceStateHash:alternative.receipt.laboratory.sourceStateHash,stateHash:referenceHash};
const args={stateRef,referenceStateRef,unlistedUnits:'off_table',changedUnits:[]};
const needsChoice=await execute('no-assumption','project_scene',args);
assert.equal(needsChoice.value.code,'PREGAME_LAB_SCENE_PROJECTION_DIFFERENCES');
assert.deepEqual(needsChoice.value.detail.differences.map(d=>d.unitId),['u_marauder_1']);
const projected=await execute('chosen-policy','project_scene',{...args,changedUnits:[{unitId:'u_marauder_1',mode:'repack_at_reference_anchor'}]});
assert.equal(projected.value.status,'completed',JSON.stringify(projected.value.detail));
const receipt=projected.value.receipt;
assert.equal(receipt.hypotheticalPlacementAssessment.units.length,11);
assert.ok(receipt.hypotheticalPlacementAssessment.units.every(u=>u.resultStatus==='ok'));
const after=target.captureSceneLayout({base:{kind:'branch',branchStateHash:receipt.branchStateHash}});
const before=referenceLab.captureSceneLayout({base:{kind:'branch',branchStateHash:referenceHash}});
for(const unit of before.units.filter(u=>u.onTable&&u.unitId!=='u_marauder_1'))
  assert.deepEqual(after.units.find(u=>u.unitId===unit.unitId).modelPositions,unit.modelPositions);
assert.equal(after.units.filter(u=>u.onTable&&u.sideKey==='player2').length,4);
assert.equal(receipt.sceneProjection.globalRosterSuperiorityProven,false);
const exchange=await execute('fire-comparison','threat_exchange',{stateRef:projected.value.stateRef,subjectUnitIds:['u_marauder_1','u_marine_1','u_marine_2','u_goliath_1'],targetIds:['player2-queen','player2-kerrigan','player2-hydralisk','player2-corpser']});
const exchangeValue=exchange.value;
assert.equal(exchangeValue.status,'completed',JSON.stringify(exchangeValue.detail));
const restored=makeLab(targetDescriptor);
restored.restoreProjectedScenarioBranch({receipt,base:{kind:'source'}});
assert.deepEqual(restored.captureSceneLayout({base:{kind:'branch',branchStateHash:receipt.branchStateHash}}),after);
assert.equal(target.proveMutationZero().sourceStateMutationCount,0);
assert.equal(referenceLab.proveMutationZero().sourceStateMutationCount,0);
assert.equal(await fs.readFile(path.join(base,'workflow.json'),'utf8'),original);
if(process.argv[3])await fs.writeFile(path.resolve(process.argv[3]),JSON.stringify({projection:projected,exchange,referenceStateRef},null,2));
console.log(JSON.stringify({pass:true,participants:11,unchangedParticipants:10,enemyParticipants:4,changedUnits:receipt.sceneProjection.adaptedUnits,
  exchangeKeys:Object.keys(exchangeValue.receipt),sameProductAndNative:true,coldRestore:true,providerCalls:0,productionWrites:0}));
