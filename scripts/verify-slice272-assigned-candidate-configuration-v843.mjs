// Reproduce e8900: exact candidate is assigned beside the measurement, but is
// not a descendant of it because project_scene used an explicit stateRef.
// Read-only saved inputs; no Provider, Native, production writes or old gates.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {projectRosterWorkflowRoleSourceInputsV1} from '../packages/roster-strategist/roster-workflow-evidence-lineage-v1.mjs';

const [root]=process.argv.slice(2),copy=structuredClone;
const state=JSON.parse(await fs.readFile(root+'/workflow.json','utf8'));
const owner=state.work.find(w=>w.id.endsWith('presentation-v2:inquiry-v2:order0:summary'));
assert(owner,'actual summary missing');
const candidateEntry=state.evidence.find(e=>e.id===owner.inputs.receipt2.id.replace('tool-view:','tool:'));
const measurementEntry=state.evidence.find(e=>e.id===owner.inputs.receipt3.id.replace('tool-view:','tool:'));
assert(candidateEntry&&measurementEntry,'actual assigned sources missing');
const cache=new Map(),read=async ref=>{
  if(!cache.has(ref))cache.set(ref,JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8')));
  return copy(cache.get(ref));
};
const candidate=await read(candidateEntry.artifactRef);
const project=async(assignment=owner,sourceState=state,get=read)=>
  projectRosterWorkflowRoleSourceInputsV1({assignment,state:sourceState,readArtifact:get});
const rowOf=inputs=>inputs.measurementConfigurations.value.measurements.find(r=>r.sourceEvidenceId===measurementEntry.id);
const start=performance.now(),inputs=await project(),row=rowOf(inputs);
assert.equal(row.configurationStatus,'resolved','actual assigned candidate was lost after scene projection');
assert.equal(row.configurationSource.artifactRef,candidateEntry.artifactRef);
assert.deepEqual(row.units,candidate.receipt.candidateInput.units.filter(u=>u.unitInstanceId==='goliath-1'));
assert.deepEqual(row.units[0].upgrades.map(u=>u.upgradeName).sort(),['Haywire Missiles','Scatter Missiles']);
assert(Object.values(inputs).some(i=>i.source==='evidence'&&i.artifactRef===candidateEntry.artifactRef
  &&i.pointer==='/receipt/candidateInput'&&i.status==='read'));
const pair=inputs.measurementConfigurations.value.comparisons.find(p=>[p.left,p.right].includes(row.evidenceNumber));
assert(pair,'actual present/absent comparison not delivered');
assert.equal(pair.causalBenefitProven,false);
console.log(JSON.stringify({case:'actual assigned candidate and original config delivered',pass:true,elapsedMs:performance.now()-start}));

for(const fault of ['wrong_context','wrong_source','failed_candidate','missing_participant']){
  const bad=copy(candidate);
  if(fault==='wrong_context')bad.receipt.contextRef='candidate:unrelated';
  if(fault==='wrong_source')bad.receipt.laboratory.sourceStateHash='unrelated-source';
  if(fault==='failed_candidate')bad.receipt.resultStatus='unknown';
  if(fault==='missing_participant')bad.receipt.candidateInput.units=bad.receipt.candidateInput.units.filter(u=>u.unitInstanceId!=='goliath-1');
  const result=rowOf(await project(owner,state,async ref=>ref===candidateEntry.artifactRef?bad:read(ref)));
  assert.equal(result.configurationStatus,fault==='missing_participant'?'missing_participant':'unknown');
  assert.deepEqual(result.units,[]);
}
console.log(JSON.stringify({case:'wrong identity, failure and missing participant do not become config facts',pass:true}));

// Removing the assigned candidate must not search unrelated global evidence
// or manufacture a link from the candidate's descriptive name.
const unassigned=copy(owner);delete unassigned.inputs.receipt2;delete unassigned.operationState;
assert.equal(rowOf(await project(unassigned,{...state,work:state.work.filter(w=>w.id!==owner.id)})).configurationStatus,'unknown');
console.log(JSON.stringify({case:'unassigned global candidate remains unavailable',pass:true}));

const conflict=copy(candidate);conflict.receipt.candidateInput.units.find(u=>u.unitInstanceId==='goliath-1').upgrades=[];
const extra={...candidateEntry,id:'tool:v843-conflicting-assigned-candidate',artifactRef:'v843-conflicting-candidate'};
const conflicted={...owner,inputs:{...owner.inputs,extraCandidate:{source:'evidence',id:extra.id,pointer:''}}};
const conflictResult=rowOf(await project(conflicted,{...state,evidence:[...state.evidence,extra]},
  async ref=>ref===extra.artifactRef?copy(conflict):read(ref)));
assert.equal(conflictResult.configurationStatus,'conflicting_sources');assert.deepEqual(conflictResult.units,[]);
console.log(JSON.stringify({case:'same identity conflicting assigned configurations fail closed',pass:true}));

// Repeated aliases of the exact same original are not a conflict.
const duplicate=rowOf(await project(conflicted,{...state,evidence:[...state.evidence,extra]},
  async ref=>ref===extra.artifactRef?copy(candidate):read(ref)));
assert.equal(duplicate.configurationStatus,'resolved');
assert.equal(inputs.measurementConfigurations.value.strategyImprovementProven,false);
assert.deepEqual(await read(candidateEntry.artifactRef),candidate);
console.log(JSON.stringify({case:'same config aliases deduplicate; immutable originals and no strategy approval',pass:true}));
console.log(JSON.stringify({pass:true,providerCalls:0,nativeCalls:0,productionWrites:0}));
