// Actual product facade omitted capture/project/restore methods although the
// Native laboratory implemented them. Exercise the same candidate_context path.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRosterPlanningProductModuleV1} from '../packages/product-composition/roster-planning-product-module-v1.mjs';
import {compileRosterWorkflowExperimentV1,projectRosterWorkflowToolRepairV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
const root=process.cwd(),sourceRoot=process.argv[2],directory=await fs.mkdtemp(root+'/build/slice272-projection-facade-v816-');
console.log(JSON.stringify({stage:'started',directory}));
let product,cold;
try{
  const get=async ref=>JSON.parse(await fs.readFile(sourceRoot+'/artifacts/'+ref+'.json','utf8'));
  const state=JSON.parse(await fs.readFile(sourceRoot+'/workflow.json','utf8')),draft=await get(state.draftRef);
  const failure=(await get('11a2552047ab34735a6d1795819fe7df87d82e07af6eb29e24ae116b945c97ee')).value;
  assert.equal(failure.code,'reference.captureSceneLayout is not a function');
  const config=JSON.parse(await fs.readFile(root+'/build/ticket-23-three-arm-performance-baseline-20261010-v1/common-v79-plan-recovery-config.private.json','utf8'));
  const input={root,fixtureRoot:config.fixtureRoot,dataDirectory:directory+'/workspace',
    mapConfiguration:JSON.parse(await fs.readFile(config.mapConfigurationFile,'utf8'))};
  const open=p=>p.openDecisionWorkflow({runId:'projection-facade',candidateInput:draft.candidateInput,
    setup:{sideKey:draft.candidateInput.sideKey,missionBinding:draft.provenance.missionBinding}});
  product=await createRosterPlanningProductModuleV1(input);const run=await open(product);
  await run.initializeDraft({candidateInput:draft.candidateInput,plan:null,provenance:draft.provenance,mode:'editable',planId:'diagnostic-only'});
  const before=await run.currentDraft(),scope=(await run.inspect()).scope;
  const knownScene=(await get('2262dfbac5722c289d443d11318b637ba42112c54f3d86034c902af6db95c087')).value.receipt;
  const argumentsValue={...structuredClone(failure.submittedArguments),comparisonScene:{referenceStateRef:null,changedUnits:[],unlistedUnits:'off_table'}};
  // Empty setup is correctly rejected by projection. Use the exact two-unit
  // layout already produced by Native, not new handwritten formation choices.
  const sceneSpec={kind:'hypothetical_geometry',phase:'assault',activeSideKey:'player1',isolateToPlacedPieces:true,
    reassessAllOnField:true,placements:knownScene.hypotheticalPlacements.map(p=>({pieceId:p.pieceId,modelPositions:p.modelPositions}))};
  const order={orderId:'facade-regression',purpose:'Check product candidate scene projection and cold restore',
    scenarioAssumptions:['Isolated replay of saved exact geometry only; not a new combat measurement'],
    experimentScope:{...structuredClone(failure.request.executionScope),hypothesisTest:null,comparisonBinding:null},
    steps:[{stepId:'scene',operation:'scenario',argumentsJson:JSON.stringify({spec:sceneSpec}),bindings:[],guards:[],publicReason:'Exact saved model positions, no formation search'},
      {stepId:'candidate',operation:'candidate_context',argumentsJson:JSON.stringify(argumentsValue),
        bindings:[{argumentPointer:'/comparisonScene/referenceStateRef',fromStepId:'scene',fromEvidenceNumber:0,resultPointer:'/stateRef'}],
        guards:[],publicReason:'Actual selected upgrade delta; isolate the facade error'}],
    completionStepId:'candidate',stopAndReturnToModelWhen:'Any failure; no auto model invocation'};
  await run.enqueue(compileRosterWorkflowExperimentV1({order,scope,namespace:'projection-facade'}));
  await run.advance({concurrency:1});
  await run.advance({concurrency:1});
  const work=(await run.inspect()).work.find(w=>w.id==='projection-facade:candidate');
  const result=(await run.readArtifact(work.resultRef)).value;
  assert.equal(result.status,'completed',result.code??result.reason);
  assert.equal(result.receipt.audit.status,'legal');
  const projection=result.receipt.sceneProjectionReceipt;
  assert.equal(projection.resultStatus,'ok');assert.ok(projection.sceneProjection);
  assert.equal(projection.sceneProjection.exactUnits.length,knownScene.hypotheticalPlacements.length);
  assert.deepEqual(await run.currentDraft(),before);
  assert.equal(run.mutationProof().sourceStateMutationCount,0);
  // The public product cold opener restores this exact saved projected branch.
  await product.closeDecisionWorkflows();
  cold=await createRosterPlanningProductModuleV1(input);const restored=await open(cold);
  const existing=(await restored.inspect()).work.find(w=>w.id===work.id);
  assert.equal(existing.resultRef,work.resultRef);assert.deepEqual(await restored.currentDraft(),before);
  assert.equal(restored.mutationProof().sourceStateMutationCount,0);
  const recovery=projectRosterWorkflowToolRepairV1(failure);
  assert.equal(recovery?.correctable,true);assert.equal(recovery.preserveCandidateExactly,true);
  assert.equal(projectRosterWorkflowToolRepairV1({...failure,code:'unrelated TypeError'}),null);
  const report={pass:true,actualProductFacade:true,selectedDeltaUnchanged:true,projectionCompleted:true,
    coldProjectedBranchRestored:true,formalDraftUnchanged:true,sourceMutationCount:0,providerCalls:0,
    productionWrites:0,oldFailureRouted:true,combatOrStrategyProven:false};
  await fs.writeFile(directory+'/result.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}catch(error){const report={pass:false,error:error.message?.slice(0,2000),location:error.stack?.split('\n').filter(l=>l.trimStart().startsWith('at ')).slice(0,5)};
  await fs.writeFile(directory+'/result.json',JSON.stringify(report,null,2));console.error(JSON.stringify(report));process.exitCode=1;
}finally{await product?.closeDecisionWorkflows?.();await cold?.closeDecisionWorkflows?.();}
