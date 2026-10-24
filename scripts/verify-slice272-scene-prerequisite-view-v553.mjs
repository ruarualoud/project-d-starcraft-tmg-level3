// Actual40/41 saw constructor success but not the oversized scene assessment.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
import {projectRosterWorkflowReceiptViewV1} from '../packages/roster-strategist/roster-workflow-receipt-view-v1.mjs';
const base=path.join(path.resolve(process.argv[2]),'workspace/decision-workflows/candidate-capability');
const original=await fs.readFile(path.join(base,'workflow.json'),'utf8'),state=JSON.parse(original);
const get=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const source=await get(state.evidence[161].artifactRef),oldView=await get(state.evidence[162].artifactRef);
assert.equal(source.receipt.resultStatus,'ok');
assert.ok(oldView.sections.find(section=>section.pointer==='/receipt/hypotheticalPlacementAssessment').availableByExactRead);
const expected=source.receipt.hypotheticalPlacementAssessment.units.filter(unit=>unit.resultStatus!=='ok');
assert.equal(expected.length,5);
const check=value=>{
  assert.equal(value.executionPrerequisites?.staticGeometryStatus,'requires_repair','constructor success cannot hide unmet geometry');
  assert.deepEqual(value.executionPrerequisites.unresolvedUnits.map(unit=>unit.pieceId),expected.map(unit=>unit.pieceId));
  assert.ok(value.executionPrerequisites.unresolvedUnits.some(unit=>unit.unknownReason.includes('PLACEMENT_OVERLAP')));
  assert.equal(value.executionPrerequisites.arrivalOrMovementLegalityProven,false);
};
check(projectRosterWorkflowReceiptViewV1({evidenceId:state.evidence[161].id,value:source}));
const reader=await createRosterDecisionWorkflowV1({store:{load:async()=>structuredClone(state),save:async()=>{},get},execute:async()=>{throw Error('READ_ONLY');}});
for(const index of [161,162])check((await reader.dispatch({type:'read_evidence',consumer:'proof',evidenceId:state.evidence[index].id,pointer:''})).value);
assert.equal(await fs.readFile(path.join(base,'workflow.json'),'utf8'),original);
console.log(JSON.stringify({pass:true,remainingUnits:5,overlappingSelectionsPreserved:true,oldViewsAndNewViewsAgree:true,providerCalls:0,productionWrites:0}));
