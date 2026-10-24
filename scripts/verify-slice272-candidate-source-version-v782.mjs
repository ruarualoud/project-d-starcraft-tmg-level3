// Actual resume failure: an unchanged candidate source was rejected because
// the hypothesis laboratory implementation changed 1.4.12 -> 1.4.13.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createRosterWorkflowCandidateContextsV1 as contexts} from '../packages/roster-strategist/roster-workflow-candidate-context-v1.mjs';
const root=path.join(path.resolve(process.argv[2]),'workspace/decision-workflows/decision-fb3dd470-df44-4789-9fa7-d30ff4678c6c');
const original=JSON.parse(await fs.readFile(path.join(root,'artifacts/7f98ef04746bbe44851bca5170e43d126fb41ad2c9633dfddbe9226c7768f366.json'),'utf8')).value.receipt;
const before=hash(original);
const upgraded={...structuredClone(original.laboratory),version:'1.4.13'};
delete upgraded.descriptorHash;upgraded.descriptorHash=hash(upgraded);
const parent={...upgraded,sourceStateHash:original.parentSourceStateHash};
function make(changes={}){
  return contexts({laboratory:{labDescriptor:()=>parent},
    builderPort:{evaluateRosterCandidate:()=>structuredClone(original.audit)},
    getCandidateInput:()=>structuredClone(original.candidateInput),
    createCandidateLaboratory:async()=>({labDescriptor:()=>({...upgraded,...changes})})});
}
const manager=make();
await manager.restore(original); // RED before fix: CANDIDATE_CONTEXT_SOURCE_CHANGED.
assert.deepEqual(manager.get(original.contextRef).labDescriptor(),upgraded);
const again=await manager.create({candidateInput:original.candidateInput});
assert.equal(again.contextRef,original.contextRef,'preserve the existing handle, do not fork a duplicate candidate');
assert.equal(again.laboratory.version,'1.4.13');
for(const field of ['sourceStateHash','rulesRuntimeHash','builderBundleHash','portDescriptorHash']){
  await assert.rejects(()=>make({[field]:'f'.repeat(64)}).restore(original),
    /ROSTER_WORKFLOW_CANDIDATE_CONTEXT_SOURCE_CHANGED/,field+' remains source authority');
}
await assert.rejects(()=>make().restore({...original,candidateInputHash:'f'.repeat(64)}),
  /ROSTER_WORKFLOW_CANDIDATE_CONTEXT_SOURCE_CHANGED/);
await assert.rejects(()=>make().restore({...original,parentSourceStateHash:'f'.repeat(64)}),
  /ROSTER_WORKFLOW_CANDIDATE_CONTEXT_SOURCE_CHANGED/);
assert.equal(hash(original),before);
console.log(JSON.stringify({pass:true,sameSavedCandidateHandle:true,currentImplementation:'1.4.13',
  sourceAndRulesAndBuilderChangesRejected:true,originalReceiptUnchanged:true,
  scope:'actual candidate-context adapter with saved receipt and deterministic factory seam; product resume separately',
  providerCalls:0,actionsApplied:0,productionWrites:0}));
