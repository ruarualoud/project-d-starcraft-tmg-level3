// Exact B legal ID-based candidate failed after Native audit when Plan required
// compositionKind. Replay only the captured Adapter result, not the Native call.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {applyRosterWorkflowDraftV1,ROSTER_WORKFLOW_DRAFT_MUTATION_SCHEMA_V1} from '../packages/roster-strategist/roster-workflow-draft-v1.mjs';
import {projectSchemaDuplicateFieldsV1} from '../packages/structured-generation/schema-owned-field-projection-v1.mjs';
const [root,out,previous]=process.argv.slice(2),copy=structuredClone;
const get=async ref=>JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
const draft=await get('d8f2306fd47b7d02c013c33d2ab28314f20541da3c93c40763682cb246a021e8');
const raw=await get('96b9b846ee9c30f5bb154283fe9038bfd26a3c3e06e32594842860db8af1445a');
const source=raw.value??raw,reply=await get('fb6831fce3515aae4528b02e4230e92c197c0c64ed62899c6a04631abaac1dc0');
const decision=reply.output.decisions[0];
const mutation=projectSchemaDuplicateFieldsV1(decision.mutation,ROSTER_WORKFLOW_DRAFT_MUTATION_SCHEMA_V1).output;
const candidate=source.request.candidateInput,verdict=source.receipt;
let adapterCalls=0;
const apply=(audit=verdict)=>applyRosterWorkflowDraftV1({draft,expectedRevision:0,mutation,
  publicReason:decision.publicReason,resolvedRosterBranch:{candidateInput:candidate,receipt:{sourceArtifactRef:'96b9b846ee9c30f5bb154283fe9038bfd26a3c3e06e32594842860db8af1445a'}},
  builderPort:{evaluateRosterCandidate(input){adapterCalls++;assert.deepEqual(input,candidate);return copy(audit);}}});
const prior=previous?JSON.parse(await fs.readFile(previous,'utf8')):null,checks=[];
async function check(name,fn){const passed=prior?.checks.find(c=>c.name===name&&c.pass);
  if(passed){checks.push({...passed,inheritedFrom:previous});return;}
  try{checks.push({name,pass:true,...await fn()});}catch(e){checks.push({name,pass:false,error:{message:e.message,stack:e.stack}});}
  await fs.writeFile(out,JSON.stringify({complete:false,checks},null,2)+'\n');
  console.log(JSON.stringify({...checks.at(-1),...(!checks.at(-1).pass?{error:checks.at(-1).error.message.slice(0,400)}:{})}));}
await check('actual-native-legal-id-candidate-jointly-commits-plan-with-same-selected-army',()=>{
  const before=JSON.stringify({draft,candidate,verdict,reply}),result=apply();
  assert.equal(result.applied,true);assert.equal(result.draft.revision,1);assert.equal(result.receipt.mineralSpent,1760);
  assert.deepEqual(result.draft.candidateInput,candidate);
  assert.equal(result.draft.plan.rosterCandidate.units.length,9);
  for(const unit of result.draft.plan.rosterCandidate.units){
    const native=verdict.audit.units.find(u=>u.unitInstanceId===unit.unitInstanceId);
    assert.equal(unit.recordKey,native.recordKey);
    assert.equal(unit.compositionKind,native.unitCompositionResult.compositionKind);
    assert.deepEqual(unit.upgradeSelections.map(u=>[u.purchasableUpgradeProfileId,u.upgradeName,u.nominatedModelId]),
      native.selectedUpgrades.map(u=>[u.purchasableUpgradeProfileId,u.upgradeName,u.nominatedModelId]));
  }
  assert.equal(result.draft.plan.publicSummaryText,mutation.plan.publicSummaryText);
  assert.equal(result.draft.accepted,false);assert.equal(JSON.stringify({draft,candidate,verdict,reply}),before);
  return {units:9,mineralSpent:1760,candidateInputUnchanged:true,modelPlanPreserved:true,nativeResultReplayedInMemory:true};
});
await check('missing-or-mismatched-native-unit-is-engineering-error-not-model-rewrite',()=>{
  for(const kind of ['missing','identity','duplicate']){
    const bad=copy(verdict);
    if(kind==='missing')bad.audit.units.pop();
    if(kind==='identity')bad.audit.units[0].recordKey='army_units:wrong';
    if(kind==='duplicate')bad.audit.units[1]=copy(bad.audit.units[0]);
    const result=apply(bad);assert.equal(result.applied,false);assert.equal(result.status,'adapter_contract_error');
    assert.equal(result.correctionOwner,'engineering');assert.equal(result.draftUnchanged,true);
  }
  return {negativeCases:3,notASelectionOrRulesOverride:true};
});
await fs.writeFile(out,JSON.stringify({pass:checks.every(c=>c.pass),complete:true,checks,adapterFixtureCalls:adapterCalls,
  actualProviderCalls:0,nativeCalls:0,productionWrites:0,trainingTruth:false},null,2)+'\n');
process.exitCode=checks.every(c=>c.pass)?0:1;
