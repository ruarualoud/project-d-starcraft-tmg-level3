// Reproduce P3's real missing capability: compare_armies audits costs only;
// a model-selected alternative must also be queryable by the SAME Native lab.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {compileRosterWorkflowExperimentV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
const root=process.cwd(),originalPath=path.resolve(process.argv[2]);
const base=path.join(originalPath,'workspace/decision-workflows/p4-from-empty');
const originalBytes=await fs.readFile(path.join(base,'workflow.json'),'utf8');
const original=JSON.parse(originalBytes);
const draft=JSON.parse(await fs.readFile(path.join(base,'artifacts',original.draftRef+'.json'),'utf8'));
const candidate=structuredClone(draft.candidateInput);
candidate.units=candidate.units.filter(u=>u.unitInstanceId!=='u_medic_3');
assert.equal(candidate.units.length,draft.candidateInput.units.length-1);
const step=(stepId,operation,args,bindings=[])=>({stepId,operation,argumentsJson:JSON.stringify(args),bindings,guards:[],publicReason:'Engineering fixture: verify selected candidate identity, not a strategic choice'});
const order=steps=>({orderId:'candidate-context-proof',purpose:'Alternative candidate source is executable without publishing it',scenarioAssumptions:['The removed Medic is a diagnostic fixture, not a model recommendation'],steps,completionStepId:'',stopAndReturnToModelWhen:'Any input or Native error; never infer a combat result from a context receipt'});
const binding=(argumentPointer,fromStepId,resultPointer)=>({argumentPointer,fromStepId,fromEvidenceNumber:0,resultPointer});
// First RED before loading the product: current operation cannot compile.
compileRosterWorkflowExperimentV1({order:order([step('candidate','candidate_context',{candidateInput:candidate})]),scope:original.scope,namespace:'missing-capability'});
const {createRosterPlanningProductModuleV1}=await import('../packages/product-composition/roster-planning-product-module-v1.mjs');
const config=JSON.parse(await fs.readFile(path.join(root,'build/ticket-23-three-arm-performance-baseline-20261010-v1/common-v79-plan-recovery-config.private.json'),'utf8'));
const directory=await fs.mkdtemp(path.join(root,'build/slice272-candidate-context-v547-'));
console.log(JSON.stringify({stage:'product',directory}));
const productInput={root,fixtureRoot:config.fixtureRoot,dataDirectory:path.join(directory,'workspace'),mapConfiguration:JSON.parse(await fs.readFile(config.mapConfigurationFile,'utf8'))};
const open=async product=>product.openDecisionWorkflow({runId:'candidate-context-proof',candidateInput:draft.candidateInput,setup:{sideKey:candidate.sideKey,missionBinding:draft.provenance.missionBinding}});
const product=await createRosterPlanningProductModuleV1(productInput),run=await open(product);
await run.initializeDraft({candidateInput:draft.candidateInput,plan:null,provenance:draft.provenance,mode:'editable',planId:'diagnostic-not-production'});
const before=await run.currentDraft();
async function execute(target,namespace,steps){
  const scope=(await target.inspect()).scope;
  await target.enqueue(compileRosterWorkflowExperimentV1({order:order(steps),scope,namespace}));
  for(let n=0;n<steps.length;n++){
    const state=await target.inspect();
    if(steps.every(s=>state.work.find(w=>w.id===namespace+':'+s.stepId)?.status==='evidence_ready'))break;
    await target.advance({concurrency:2});
  }
  const state=await target.inspect(),results={};
  for(const s of steps){const w=state.work.find(w=>w.id===namespace+':'+s.stepId);assert.equal(w.status,'evidence_ready',JSON.stringify(w));results[s.stepId]=(await target.readArtifact(w.resultRef)).value;assert.equal(results[s.stepId].status,'completed',JSON.stringify(results[s.stepId]));}
  return results;
}
const results=await execute(run,'contexts',[
  step('baseline','inspect',{}),step('candidate','candidate_context',{candidateInput:candidate}),
  step('alternative','inspect',{contextRef:null},[binding('/contextRef','candidate','/contextRef')]),
]);
const receipt=results.candidate.receipt,contextRef=receipt.contextRef;
assert.equal(receipt.resultStatus,'ok');
assert.equal(receipt.audit.schema,'starcraft_tmg_army_builder_roster_verdict_v1');
assert.notEqual(receipt.laboratory.sourceStateHash,results.baseline.receipt.sourceStateHash);
assert.equal(receipt.parentSourceStateHash,results.baseline.receipt.sourceStateHash);
assert.ok(results.baseline.receipt.availableUnits.some(u=>u.unitId==='u_medic_3'));
assert.ok(!results.alternative.receipt.availableUnits.some(u=>u.unitId==='u_medic_3'));
assert.equal(results.alternative.receipt.sourceStateHash,receipt.laboratory.sourceStateHash);
assert.equal(results.alternative.contextRef,contextRef);
const refs=await execute(run,'refs',[step('baseline','reference_rosters',{}),step('alternative','reference_rosters',{contextRef})]);
const enemy=refs.baseline.receipt.opponentSide;
assert.deepEqual(refs.alternative.receipt.armies.find(x=>x.sideKey===enemy),refs.baseline.receipt.armies.find(x=>x.sideKey===enemy));
const target=results.alternative.receipt.availableUnits.find(u=>u.sideKey===enemy&&/hydralisk/i.test(JSON.stringify(u)));
assert.ok(target,'frozen opponent Hydralisk');
const scene=await execute(run,'native',[
  step('scene','scenario',{contextRef,spec:{kind:'hypothetical_geometry',phase:'assault',activeSideKey:'player1',clearTerrain:true,isolateToPlacedPieces:true,placements:[{pieceId:'u_marine_1',xInches:8,yInches:8},{pieceId:target.unitId,xInches:14,yInches:8}]}}),
  step('inspect','inspect',{contextRef,base:{kind:'branch',branchStateHash:null}},[binding('/base/branchStateHash','scene','/branchStateHash')]),
]);
assert.equal(scene.scene.receipt.sourceStateHash,receipt.laboratory.sourceStateHash);
assert.equal(scene.inspect.receipt.baseStateHash,scene.scene.receipt.branchStateHash);
assert.deepEqual(await run.currentDraft(),before,'private source must not publish alternative');
assert.equal(run.mutationProof().sourceStateMutationCount,0);
// Cold product restores candidate source BEFORE restoring its saved branches.
const cold=await open(await createRosterPlanningProductModuleV1(productInput));
const restored=await execute(cold,'cold',[step('inspect','inspect',{contextRef,base:{kind:'branch',branchStateHash:scene.scene.receipt.branchStateHash}})]);
assert.deepEqual(restored.inspect.receipt,scene.inspect.receipt);
assert.deepEqual(await cold.currentDraft(),before);
assert.equal(await fs.readFile(path.join(base,'workflow.json'),'utf8'),originalBytes);
const summary={pass:true,selectedContext:contextRef,baselineUnits:results.baseline.receipt.availableUnits.length,alternativeUnits:results.alternative.receipt.availableUnits.length,nativeBranch:scene.scene.receipt.branchStateHash,coldRestore:true,formalDraftUnchanged:true,providerCalls:0,productionWrites:0,combatComparisonProven:false,strategicSuperiorityProven:false};
await fs.writeFile(path.join(directory,'result.json'),JSON.stringify(summary,null,2),{flag:'wx'});
console.log(JSON.stringify(summary));
