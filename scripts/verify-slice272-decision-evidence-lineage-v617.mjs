// Actual886 applied Plan r3 but left toolReceiptReferences empty. Its verified
// decision citations still reach Native1152/1169; reviewers must receive them.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {createRosterWorkflowReviewAssignmentsV1,assessRosterWorkflowReadinessV1} from '../packages/roster-strategist/roster-workflow-readiness-v1.mjs';
const base=path.resolve(process.argv[2],'workspace/decision-workflows/projection-owner');
const source=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8')),original=JSON.stringify(source);
const get=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const draft=await get(source.draftRef),verdict=await get(draft.builderVerdictRef);assert.equal(draft.revision,3);
const state={...source,evidence:source.evidence.map(e=>({...e,validity:Object.entries(e.bindings).every(([k,v])=>source.scope[k]===v)?'current':'historical'}))};
const readiness=assessRosterWorkflowReadinessV1({draft,verdict,work:[]});
const probe={schema:'roster_workflow_decision_evidence_lineage_v1',entries:[{sourceEvidenceId:source.evidence[1151].id}]};
const job=createRosterWorkflowReviewAssignmentsV1({state:{...state,work:[]},readiness,evidenceLineage:probe}).find(w=>w.reviewDomain==='combat_and_losses');
assert.deepEqual(job.inputs.decisionEvidenceDirectory?.value,probe,'BUG: review assignment discards the applied decision source directory');
const {projectRosterWorkflowDecisionEvidenceLineageV1}=await import('../packages/roster-strategist/roster-workflow-evidence-lineage-v1.mjs');
const lineage=await projectRosterWorkflowDecisionEvidenceLineageV1({state,readArtifact:get});
for(const n of [1152,1169])assert(lineage.entries.some(e=>e.evidenceNumber===n),'actual cited Native view must be discoverable');
assert(lineage.entries.some(e=>e.operation==='threat_exchange'&&e.queryKind==='fire_zone_exchange'),'actual Native query subtype must be indexed without inventing numbers');
assert(lineage.edges.some(e=>e.kind==='receipt_view_original'),'view must lead to its unchanged original source');
assert(lineage.entries.length<state.evidence.length/4,'not an all-history directory');
assert.deepEqual(lineage,await projectRosterWorkflowDecisionEvidenceLineageV1({state,readArtifact:get}),'deterministic projection');
assert.equal(lineage.directoryIsNotARead,true);assert.equal(lineage.acceptanceGranted,false);
assert.deepEqual(draft.plan.toolReceiptReferences,[],'never edit the saved Plan to manufacture lineage');
assert.equal(JSON.stringify(source),original);
assert.equal((await fs.readFile(path.join(base,'workflow.json'),'utf8')).trim(),original);
console.log(JSON.stringify({passed:true,entries:lineage.entries.length,edges:lineage.edges.length,roots:lineage.roots.length,
  unresolvedReferences:lineage.unresolvedReferences.length,newProviderCalls:0,newNativeCalls:0,productionWrites:0}));
