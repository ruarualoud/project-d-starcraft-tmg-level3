// Actual repair re-applied old-parent options on a newer branch. It was told
// to fix internal option IDs instead of the conflicting parent relationship.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {projectRosterWorkflowToolRepairV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
import * as native from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
const root=process.argv[2],get=async ref=>JSON.parse(await readFile(`${root}/artifacts/${ref}.json`,'utf8'));
const failure=(await get('cbfc03d7e36a95551663d5765b63e7de17509d6385e4094225190b97ca3a455c')).value;
assert.equal(failure.code,'PREGAME_LAB_FORMATION_SELECTION_SOURCE_MISMATCH');
const repair=projectRosterWorkflowToolRepairV1(failure);
assert.equal(repair.selectionParentContract?.allSelectionsMustMatchExactParent,true,
  'actual source-parent conflict is currently routed as generic option-ID repair');
assert.deepEqual(repair.requestedBase,failure.request.base);
const state=JSON.parse(await readFile(`${root}/workflow.json`,'utf8'));
const readSource=async number=>{
  const entry=state.evidence[number-1],data=await get(entry.artifactRef);
  if(entry.id.startsWith('tool-view:')){
    const work=state.work.find(w=>w.id===entry.id.slice('tool-view:'.length));
    return (await get(work.resultRef)).value.receipt;
  }
  return data.receipt??data.value?.receipt;
};
const old=await readSource(665),current=await readSource(699);
assert.notEqual(old.baseStateHash,current.baseStateHash);
const expected=Object.fromEntries(['sourceStateHash','baseStateHash','rulesRuntimeHash','builderBundleHash'].map(k=>[k,current[k]]));
const option=old.queryReceipt.result.formationOptions[0];
assert.throws(()=>native.assertPregameFormationSelectionSourceV1({receipt:old,formationOptionId:option.formationOptionId,expected}),
  error=>error.code===failure.code&&error.detail.mismatches.includes('baseStateHash')
    &&error.queryRepair.actual.baseStateHash===old.baseStateHash
    &&error.queryRepair.expected.baseStateHash===current.baseStateHash);
native.assertPregameFormationSelectionSourceV1({receipt:current,
  formationOptionId:current.queryReceipt.result.formationOptions[0].formationOptionId,expected});
assert.equal(repair.hostSelectedOption,false);
console.log(JSON.stringify({pass:true,actualFailure:failure.code,exactParentConflictExplained:true,
  oldParentRejected:true,matchingParentAccepted:true,selectionNotChangedByHost:true,
  providerCalls:0,nativeActions:0,productionWrites:0}));
