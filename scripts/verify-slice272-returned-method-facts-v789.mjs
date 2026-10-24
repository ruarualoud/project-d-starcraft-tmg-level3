// Reproduce e5420's actual returned-summary losing a completed sibling and
// e5438's next method consequently repeating that already measured arm.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {projectRosterWorkflowRoleSourceInputsV1} from '../packages/roster-strategist/roster-workflow-evidence-lineage-v1.mjs';
const root=process.argv[2];
const state=JSON.parse(await fs.readFile(root+'/workflow.json','utf8'));
const readArtifact=async ref=>JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
const sourceRef='894486ef12c2595805aaf64adda196be52906e6c11f7c346290783c495930d91';
const success=state.work.find(w=>w.resultRef===sourceRef);
assert(success);
const cases=[
  ['returned summary','9d9e856ec7195f1ef3e38d435f962a351f2579f22f744f6d74a92c87d97223f3'],
  ['next method','30465a57e17e5a06ac7711e3393ef39943c74efea0e9cef0d3fe0fe97e28ad10'],
];
if(process.argv.includes('--summary-scope-only')){
  const work=state.work.find(w=>w.resultRef===cases[0][1]);
  const assignment=await readArtifact(work.inputRef);
  const inputs=await projectRosterWorkflowRoleSourceInputsV1({assignment,state,readArtifact});
  assert(inputs.returnedMethodFacts,'local completed sources remain available');
  for(const key of ['decisionEvidenceDirectory','currentArmyAuthority','currentArmyIdentity'])
    assert(!Object.hasOwn(inputs,key),'local fact summary must not acquire global strategy input: '+key);
  console.log(JSON.stringify({pass:true,localFactsOnly:true,providerCalls:0,nativeCalls:0,productionWrites:0}));
  process.exit(0);
}
const results=[];
for(const [name,ref] of cases){
  const work=state.work.find(w=>w.resultRef===ref);
  const assignment=await readArtifact(work.inputRef),before=structuredClone(assignment);
  try{
    const inputs=await projectRosterWorkflowRoleSourceInputsV1({assignment,state,readArtifact});
    const delivered=inputs.returnedMethodFacts?.value;
    assert(delivered,'completed sibling facts must cross the same role input seam');
    const measured=delivered.methods.flatMap(m=>m.steps).find(row=>row.actualResultRef===sourceRef);
    assert(measured,'actual corrected Goliath measurement must be delivered, not just its old unknown');
    assert.equal(measured.facts.receiptScalars.resultStatus,'ok');
    assert.equal(measured.operation,'probability');
    assert.equal(measured.sourceEvidenceId,'tool:'+success.id);
    assert.equal(delivered.acceptanceGranted,false);
    assert.equal(delivered.originalArtifactsUnchanged,true);
    assert(delivered.methods.some(m=>m.steps.some(row=>row.status==='returned_to_owner')),
      'the still-unmeasured sibling must remain unresolved');
    assert.deepEqual(assignment,before,'do not rewrite saved model input');
    results.push({name,pass:true,deliveredMethods:delivered.methods.length});
  }catch(error){results.push({name,pass:false,error:error.message});}
}
console.log(JSON.stringify({results,providerCalls:0,nativeCalls:0,productionWrites:0},null,2));
if(results.some(r=>!r.pass))process.exitCode=1;
