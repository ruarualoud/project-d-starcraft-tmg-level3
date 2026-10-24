// Two actual product jobs stopped with NO_READY_WORK despite deterministic
// unfinished draft obligations. Exercise product start, not an isolated helper.
import fs from 'node:fs/promises';import path from 'node:path';
import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
import {createRosterDecisionProductJourneyV1} from '../packages/roster-planning-workspace/roster-decision-product-journey-v1.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const results=[];
for(const [suffix,id]of [['M86Cg9','decision-58c2b2f9-e4cf-4b5d-9ac3-4c8c36bbb0e1'],['I7zekC','decision-959c1d9c-d6e0-43b4-8196-faef5b42fc34']]){
  const source=path.join(root,'build/slice272-product-generation-v645-'+suffix,'workspace');
  const metadataBytes=await fs.readFile(path.join(source,'decision-product-journeys',id,'journey.json'));
  const metadata=JSON.parse(metadataBytes),assessment=metadata.progress.assessment;
  assert.equal(metadata.failure.code,'ROSTER_DECISION_NO_READY_WORK');
  assert(assessment.mechanicalBlockers.length);assert.equal(assessment.activeWork.length,0);
  const base=path.join(source,'decision-workflows',id),stateBytes=await fs.readFile(path.join(base,'workflow.json'));
  const state=JSON.parse(stateBytes),read=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
  const draft=await read(state.draftRef),temporary=await fs.mkdtemp(path.join(root,'build/slice272-completion-owner-v659-'));
  await fs.mkdir(path.join(temporary,id));await fs.writeFile(path.join(temporary,id,'journey.json'),metadataBytes);
  const readiness={mechanicalReady:false,mechanicalBlockers:assessment.mechanicalBlockers,
    mechanicalFacts:{owner:'deterministic_host_and_builder',strategyApproved:false},activeWork:[],strategyQuestions:[]};
  const decisions=[];let journey,boundaryReached;
  let boundary=new Promise(resolve=>{boundaryReached=resolve;});
  const run={inspect:async()=>structuredClone(state),currentDraft:async()=>structuredClone(draft),readArtifact:read,
    initializeDraft:async()=>{},prepareStrategyResources:async()=>{},prepareContext:async()=>{},
    readiness:async()=>structuredClone(readiness),requestTeach:async()=>{throw Error('CURRENT_TEACH_ALREADY_COMPLETED');},
    requestDecision:async input=>{decisions.push(input);state.work.push({id:input.id,role:'roster_workflow_strategy_decision',status:'evidence_ready'});},
    requestFinalReviews:async()=>{throw Error('INCOMPLETE_DRAFT_CANNOT_ENTER_FINAL_REVIEWS');},
    advance:async()=>{boundaryReached();return {state:structuredClone(state),ran:[]};},
    finalAssessment:async()=>structuredClone(assessment)};
  journey=await createRosterDecisionProductJourneyV1({directory:temporary,openWorkflow:async()=>run,
    prepareSeed:async()=>{throw Error('NO_NEW_WORKFLOW');},liveAvailable:()=>true});
  await journey.start(id);await boundary;await journey.close();
  assert.equal(decisions.length,1,'current deterministic blockers must reach exactly one model-owned completion decision');
  assert.deepEqual(decisions[0].inputs.completionObligations.value.mechanicalBlockers,assessment.mechanicalBlockers);
  assert.equal(decisions[0].inputs.draft.id,`draft:r${draft.revision}:summary`);
  assert.equal(decisions[0].inputs.completionObligations.value.mode,draft.mode);
  // The same unchanged boundary must not buy another identical decision.
  boundary=new Promise(resolve=>{boundaryReached=resolve;});
  await journey.start(id);await boundary;await journey.close();assert.equal(decisions.length,1);
  assert((await fs.readFile(path.join(source,'decision-product-journeys',id,'journey.json'))).equals(metadataBytes));
  assert((await fs.readFile(path.join(base,'workflow.json'))).equals(stateBytes));
  results.push({mode:draft.mode,draftRevision:draft.revision,blockerCodes:assessment.mechanicalBlockers.map(b=>b.code),
    completionDecisions:decisions.length,duplicateSuppressed:true,temporary});
}
console.log(JSON.stringify({status:'passed',results,providerCalls:0,nativeCalls:0,productionWrites:0,
  productJobPortsStubbed:true,realModelCompletionStillPending:true}));
