// e9564: the real method could not settle its comparison because no tool
// exposed the remaining Native scene conditions. Do not rerun attack estimates.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {describePregameWorkflowInputContractsV1} from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import {createRosterPlanningProductModuleV1} from '../packages/product-composition/roster-planning-product-module-v1.mjs';
import {compileRosterWorkflowExperimentV1,createRosterWorkflowLaboratoryExecutorV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
assert.ok(describePregameWorkflowInputContractsV1().compare_scenes,
  'actual unresolved non-geometric conditions need a callable source-owned query');
const {comparePregameSceneConditionsV1:compare}=await import('../packages/roster-strategist/pregame-scene-conditions-v1.mjs');
const copy=structuredClone;
const snapshot=state=>({schema:'pregame_scene_comparison_snapshot_v1',sourceStateHash:hash(state),
  baseStateHash:hash(state),builderBundleHash:hash('builder'),rulesRuntimeHash:hash('runtime'),
  rulesDescriptor:{runtimeVersion:'fixture-v1'},state:copy(state)});
const original={phase:'assault',round:1,cardResources:{player1:{cp:2}},
  pieces:[{id:'unit1',upgrades:['a'],models:[{id:'m1',health:2,x:8}],status:[]}]};
const left=snapshot(original),equal=compare({reference:left,target:copy(left)});
assert.equal(equal.complete,true);assert.deepEqual(equal.differences,[]);
assert.equal(equal.stateEqual,true);assert.equal(equal.causalAttribution,'not_assessed');
for(const [name,change,path] of [
  ['resource',s=>s.cardResources.player1.cp--,'/state/cardResources/player1/cp'],
  ['health',s=>s.pieces[0].models[0].health--,'/state/pieces/0/models/0/health'],
  ['position',s=>s.pieces[0].models[0].x++,'/state/pieces/0/models/0/x'],
  ['upgrade',s=>s.pieces[0].upgrades.push('b'),'/state/pieces/0/upgrades/1'],
  ['status',s=>s.pieces[0].status.push('suppressed'),'/state/pieces/0/status/0'],
  ['new field',s=>s.newNativeField={future:17},'/state/newNativeField'],
  ['removed field',s=>delete s.round,'/state/round'],
]){
  const changed=copy(original);change(changed);
  const result=compare({reference:left,target:snapshot(changed)});
  assert.equal(result.stateEqual,false,name);assert.equal(result.complete,true);
  assert(result.differences.some(d=>d.pointer===path),name);
}
const wrong=copy(left);wrong.baseStateHash='f'.repeat(64);
assert.throws(()=>compare({reference:left,target:wrong}),/SNAPSHOT_IDENTITY/);
const rules=copy(left);rules.rulesDescriptor.runtimeVersion='fixture-v2';
assert(compare({reference:left,target:rules}).differences.some(d=>d.pointer==='/rulesDescriptor/runtimeVersion'));
assert.deepEqual(left,snapshot(original),'comparison must not mutate either input');

// Actual adapter input faults must return to the existing local repair owner.
let captures=0,comparisons=0;
const objects=new Map();let serial=0;
const lab={labDescriptor:()=>({sourceStateHash:left.sourceStateHash}),
  captureComparisonSnapshot:()=>{captures++;return left;},
  compareSceneConditions:()=>{comparisons++;return {sourceStateHash:left.sourceStateHash,
    baseStateHash:left.baseStateHash,resultStatus:'ok'};}};
const scope={source:left.sourceStateHash};
const store={load:async()=>({work:[],evidence:[],scope}),get:async id=>objects.get(id),
  put:async value=>{const id=String(++serial);objects.set(id,copy(value));return id;}};
const executor=createRosterWorkflowLaboratoryExecutorV1({laboratory:lab,store});
const referenceStateRef={schema:'roster_workflow_state_ref_v1',contextRef:null,
  sourceStateHash:left.sourceStateHash,stateHash:left.baseStateHash};
const execute=args=>executor.execute({workId:'conditions-v849',scope,
  inputs:{request:{value:{operation:'compare_scenes',args,bindings:[],guards:[],resultGuards:[]}}}},
  {operationState:{},checkpointOperation:async()=>{}});
for(const args of [{}, {referenceStateRef:null}, {referenceStateRef,ignoreFields:['cardResources']},
  {referenceStateRef:{...referenceStateRef,sourceStateHash:'f'.repeat(64)}}]){
  const out=await execute(args);assert.equal(out.continuation,true);
  assert.equal(executor.projectRepair(out.value)?.correctable,true);
  assert.equal(captures,0);assert.equal(comparisons,0);
}
const valid=await execute({stateRef:referenceStateRef,referenceStateRef});
assert.equal(valid.value.status,'completed');assert.equal(captures,1);assert.equal(comparisons,1);
console.log(JSON.stringify({stage:'complete-diff and input-fault checks passed',injections:13}));

// Real product facade + Native states, from the exact saved candidate/layout.
// No model, firepower remeasurement, live room, or production checkpoint writes.
const root=process.cwd(),sourceRoot=process.argv[2],directory=await fs.mkdtemp(root+'/build/slice272-conditions-v849-');
console.log(JSON.stringify({stage:'product-check',directory}));
let product,cold;
try{
  const get=async ref=>JSON.parse(await fs.readFile(sourceRoot+'/artifacts/'+ref+'.json','utf8'));
  const state=JSON.parse(await fs.readFile(sourceRoot+'/workflow.json','utf8')),draft=await get(state.draftRef);
  const absent=await get('cf178610786fe89fbdcd8dcbf3823c8b80d851be3a931ebcd512bfbb68f6b32c');
  const projected=await get('e55904068191aad5cb0ed806206fc2c81f2cdeea16f67b67bd13fc8e3ffbee15');
  const a=absent.value??absent,p=projected.value??projected;
  const config=JSON.parse(await fs.readFile(root+'/build/ticket-23-three-arm-performance-baseline-20261010-v1/common-v79-plan-recovery-config.private.json','utf8'));
  const input={root,fixtureRoot:config.fixtureRoot,dataDirectory:directory+'/workspace',
    mapConfiguration:JSON.parse(await fs.readFile(config.mapConfigurationFile,'utf8'))};
  const open=module=>module.openDecisionWorkflow({runId:'conditions-v849',candidateInput:draft.candidateInput,
    setup:{sideKey:draft.candidateInput.sideKey,missionBinding:draft.provenance.missionBinding}});
  product=await createRosterPlanningProductModuleV1(input);const run=await open(product);
  await run.initializeDraft({candidateInput:draft.candidateInput,plan:null,provenance:draft.provenance,mode:'editable',planId:'diagnostic-only'});
  const before=await run.currentDraft(),bindings=(await run.inspect()).scope;
  const bind=(argumentPointer,fromStepId,resultPointer)=>({argumentPointer,fromStepId,fromEvidenceNumber:0,resultPointer});
  const step=(stepId,operation,args,dependencies=[])=>({stepId,operation,argumentsJson:JSON.stringify(args),bindings:dependencies,guards:[],publicReason:'Bounded source-condition regression, not strategy production'});
  const order={orderId:'conditions',purpose:'Expose all Native state differences without another attack query',
    scenarioAssumptions:['Exact saved private conditional layout, not live deployment'],
    experimentScope:{...copy(p.request.executionScope),hypothesisTest:null,comparisonBinding:null},
    steps:[step('scene','scenario',{spec:p.receipt.sceneProjection.materializedSpec}),
      step('candidate','candidate_context',{candidateInput:a.receipt.candidateInput,
        comparisonScene:{referenceStateRef:null,changedUnits:[],unlistedUnits:'off_table'}},
        [bind('/comparisonScene/referenceStateRef','scene','/stateRef')]),
      step('comparison','compare_scenes',{},[bind('/stateRef','candidate','/stateRef'),bind('/referenceStateRef','scene','/stateRef')])],
    completionStepId:'comparison',stopAndReturnToModelWhen:'Any failure; no Provider allowed'};
  await run.enqueue(compileRosterWorkflowExperimentV1({order,scope:bindings,namespace:'conditions-v849'}));
  for(let i=0;i<3;i++)await run.advance({concurrency:1});
  const work=(await run.inspect()).work.find(w=>w.id==='conditions-v849:comparison');
  const result=(await run.readArtifact(work.resultRef)).value;
  assert.equal(result.status,'completed',JSON.stringify({code:result.code,reason:result.reason,detail:result.detail}));
  const comparison=result.receipt.comparison;
  assert.equal(comparison.complete,true);assert.equal(comparison.stateEqual,false);
  assert(comparison.differences.some(d=>JSON.stringify(d).includes('Ares-Class')));
  assert.equal(comparison.causalAttribution,'not_assessed');
  assert.equal(comparison.left.baseStateHash,p.submittedArguments.referenceStateRef.stateHash);
  assert.deepEqual(await run.currentDraft(),before);assert.equal(run.mutationProof().sourceStateMutationCount,0);
  await product.closeDecisionWorkflows();
  cold=await createRosterPlanningProductModuleV1(input);const restored=await open(cold);
  const retained=(await restored.inspect()).work.find(w=>w.id===work.id);
  assert.equal(retained.resultRef,work.resultRef);assert.deepEqual(await restored.currentDraft(),before);
  const report={pass:true,actualProductFacade:true,completeDifferenceCount:comparison.differences.length,
    differences:comparison.differences,coverage:comparison.coverage,coldRestore:true,
    formalDraftUnchanged:true,sourceMutationCount:0,providerCalls:0,attackReexecutions:0,productionWrites:0,
    causalOrStrategyApproval:false};
  await fs.writeFile(directory+'/result.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify({...report,differences:undefined,coverage:undefined}));
}catch(error){console.error(JSON.stringify({pass:false,error:error.message,stack:error.stack?.split('\n').slice(0,6)}));process.exitCode=1;}
finally{await product?.closeDecisionWorkflows?.();await cold?.closeDecisionWorkflows?.();}
