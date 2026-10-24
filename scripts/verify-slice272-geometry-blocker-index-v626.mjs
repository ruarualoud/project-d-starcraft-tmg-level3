// Actual 1130 injected 1.39M characters of old static misses automatically.
// Index repeated terrain cells without dropping any anchor/result or source.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {projectRosterGeometryDecisionContextV1} from '../packages/roster-strategist/roster-experiment-progress-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
const run=path.resolve(process.argv[2]),base=path.join(run,'workspace/decision-workflows/projection-owner');
const requestBytes=await fs.readFile(path.join(run,'1130.request.json'),'utf8');
const request=JSON.parse(requestBytes).request,original=request.promptNodes.find(n=>n.kind==='current_experiment_geometry_decision');
const assignment=request.promptNodes.find(n=>n.kind==='workflow_role_assignment');
const state=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8')),memory=new Map();
let saved={schema:state.schema,scope:state.scope,work:[],evidence:state.evidence,reads:[],events:[],acceptanceGranted:false};
const store={load:async()=>state,get:async ref=>memory.has(ref)?structuredClone(memory.get(ref)):JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8')),
  put:async value=>{const ref=createHash('sha256').update(JSON.stringify(value)).digest('hex');memory.set(ref,structuredClone(value));return ref;},
  save:async value=>{saved=structuredClone(value);}};
const current=await projectRosterGeometryDecisionContextV1({assignment,store});
const sourceId=original.previousStaticAttempts[0].sourceWorkId,attempt=current.previousStaticAttempts.find(a=>a.sourceWorkId===sourceId);
assert.equal(attempt.projectionKind,'static_attempt_blocker_index_v1','BUG: automatic geometry context injects all historical raw terrain cells instead of a readable index');
let oldChars=0,newChars=0,totalAnchors=0,rawCellRows=0,exactReads=0;
// Product evidence reader in an isolated in-memory state; no production writes.
const readStore={...store,load:async()=>saved};
const workflow=await createRosterDecisionWorkflowV1({store:readStore,execute:async()=>{throw Error('UNEXPECTED_EXECUTION');}});
for(const old of original.previousStaticAttempts){
  const row=current.previousStaticAttempts.find(a=>a.sourceWorkId===old.sourceWorkId);assert(row);
  assert.deepEqual(row.argumentInput,old.argumentInput);assert.equal(row.resultStatus,old.resultStatus);assert.equal(row.misses.length,old.misses.length);
  oldChars+=JSON.stringify(old).length;newChars+=JSON.stringify(row).length;
  for(const [i,miss]of old.misses.entries()){
    const projected=row.misses[i],rawBlockers=miss.diagnostic?.anchorRejection?.blockers;
    assert.deepEqual(projected.anchor,miss.anchor);assert.equal(projected.reason,miss.reason);
    assert.equal(projected.impossibilityProven,miss.impossibilityProven);totalAnchors++;
    if(!Array.isArray(rawBlockers)){assert.deepEqual(projected,miss);continue;}
    rawCellRows+=rawBlockers.length;
    assert.equal(projected.diagnostic.anchorRejection.blockerSummary.totalBlockerCount,rawBlockers.length);
    assert.equal(projected.diagnostic.anchorRejection.blockerSummary.groups.reduce((n,g)=>n+g.count,0),rawBlockers.length);
    const expected=structuredClone(miss);delete expected.diagnostic.anchorRejection.blockers;
    const actual=structuredClone(projected);delete actual.diagnostic.anchorRejection.blockerSummary;
    assert.deepEqual(actual,expected,'non-cell geometry/diagnostics may not be discarded');
    if(exactReads<2){const read=await workflow.dispatch({type:'read_evidence',consumer:'isolated-v626',
      evidenceId:row.sourceEvidenceId,pointer:projected.diagnostic.anchorRejection.blockerSummary.exactRead.pointer});
      assert.equal(read.status,'read');assert.deepEqual(read.value,rawBlockers);exactReads++;}
  }
}
for(const key of ['stateRef','currentSceneSpec','remainingGeometry','originalFailureStateHash'])assert.deepEqual(current[key],original[key]);
assert(newChars<oldChars*0.3,'actual old attempt payload should shrink without dropping anchors');
assert.equal(await fs.readFile(path.join(run,'1130.request.json'),'utf8'),requestBytes);
assert.equal(exactReads,2);
console.log(JSON.stringify({passed:true,oldAttemptCharacters:oldChars,newAttemptCharacters:newChars,
  retainedAnchorCount:totalAnchors,rawCellRowsAvailable:rawCellRows,exactProductReads:exactReads,
  currentStateAndRemainingGeometryPreserved:true,automaticGeometryOrStrategyChange:false,
  productionWrites:0,newProviderCalls:0,newNativeCalls:0,strategicEquivalenceNotYetProven:true}));
