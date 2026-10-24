// Actual A kept reporting missing attack arms after those Native results were
// saved in an explicitly preceding inquiry window. No live calls or state edits.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {projectRosterWorkflowRoleSourceInputsV1} from '../packages/roster-strategist/roster-workflow-evidence-lineage-v1.mjs';
const [root,out,only,priorResult]=process.argv.slice(2),clone=structuredClone;
const get=async ref=>JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
const state=JSON.parse(await fs.readFile(root+'/workflow.json','utf8'));
const request=await get('6a827d4f4a7a1c290336e76af8ca2a6ce78b03494cd662062f166ebfbeed801f');
const assignment=request.promptNodes.find(n=>n.kind==='workflow_role_assignment');
const original=clone(state),checks=[];
if(only&&priorResult)checks.push(...JSON.parse(await fs.readFile(priorResult,'utf8')).checks
  .filter(c=>c.pass&&c.name!==only).map(c=>({...c,inheritedFrom:priorResult})));
const sources=[371,373,375,377];
if(!only||only==='actual-source-discovery-across-explicit-investigation-windows'){
try{
  const inputs=await projectRosterWorkflowRoleSourceInputsV1({assignment,state,readArtifact:get});
  const directory=inputs.priorInvestigationEvidence?.value;
  assert.ok(directory,'Related successful sources are absent from the current role-specific discovery input');
  for(const n of sources){
    const row=directory.sources.find(s=>s.originalSourceEvidenceNumber===n);
    assert.ok(row,`Missing actual successful source ${n}`);
    assert.equal(row.sourceEvidenceNumber,n+1);assert.equal(row.workStatus,'evidence_ready');
    assert.equal(row.resultIsNotAutomaticallyAccepted,true);
    assert.equal(directory.directoryIsNotARead,true);assert.equal(directory.acceptanceGranted,false);
  }
  const {projectRosterPriorInvestigationEvidenceV1:project}=await import('../packages/roster-strategist/roster-workflow-investigation-evidence-v1.mjs');
  const owner=state.work.find(w=>w.id===assignment.workId);
  const factOwner=state.work.find(w=>w.id===owner.investigationOwnerId);
  assert.deepEqual(project({state,work:factOwner}).sources,directory.sources);
  const key=state.evidence[370].id.replace(/^tool:/,'');
  const actual=state.work.find(w=>w.id===key);
  const checkExcluded=(change)=>{const copy=clone(state);change(copy);
    assert.ok(!project({state:copy,work:copy.work.find(w=>w.id===owner.id)}).sources
      .some(s=>s.originalSourceEvidenceNumber===371));};
  checkExcluded(s=>{s.work.find(w=>w.id===key).bindings.source='different-source';});
  checkExcluded(s=>{s.evidence[370].bindings.army='different-army';});
  checkExcluded(s=>{s.work.find(w=>w.id===key).status='running';});
  // Same long ID prefix and same bindings do not establish ownership.
  checkExcluded(s=>{s.work.find(w=>w.id===key).experimentOwnerId='unrelated-owner';});
  const disconnected=clone(state),branch=disconnected.work.find(w=>w.id===owner.investigationFrontierOf);
  delete branch.investigationFor;
  assert.equal(project({state:disconnected,work:disconnected.work.find(w=>w.id===owner.id)}),null);
  assert.equal(project({state,work:{id:'unknown-work',experimentGoalId:actual.experimentGoalId}}),null);
  // A stale original view must not shadow a still-current raw source.
  const staleView=clone(state);staleView.evidence[371].bindings.source='different-source';
  assert.equal(project({state:staleView,work:staleView.work.find(w=>w.id===owner.id)}).sources
    .find(s=>s.originalSourceEvidenceNumber===371).sourceEvidenceNumber,371);
  assert.deepEqual(state,original);
  checks.push({name:'actual-source-discovery-across-explicit-investigation-windows',pass:true,
    restoredActualSources:sources,negativeCases:6,staleViewUsesOriginal:true,
    sameSourceForStrategicAndFactRoles:true,directoryCharacters:JSON.stringify(directory).length,
    sourceCount:directory.sources.length,originalArtifactsUnchanged:true});
}catch(error){checks.push({name:'actual-source-discovery-across-explicit-investigation-windows',pass:false,error:error.message});}
}
if(only==='local-choice-does-not-receive-parent-investigation-history'){
  try{
    const {projectRosterPriorInvestigationEvidenceV1:project}=await import('../packages/roster-strategist/roster-workflow-investigation-evidence-v1.mjs');
    const work=state.work.find(w=>w.choiceOf&&w.id.includes(':s4_marauder_vs_kerrigan:observed-choice'));
    assert.ok(work,'Saved local choice fixture required');
    assert.ok(project({state,work})===null,'Local single-operation choices must not receive parent investigation history');
    checks.push({name:only,pass:true,actualLocalWorkId:work.id,sourceStateUnchanged:true});
  }catch(error){checks.push({name:only,pass:false,error:error.message});}
}
await fs.writeFile(out,JSON.stringify({pass:checks.every(c=>c.pass),checks,actualProviderCalls:0,
  nativeExecutions:0,productionWrites:0,formalPlans:0},null,2));
console.log(JSON.stringify(checks));process.exitCode=checks.every(c=>c.pass)?0:1;
