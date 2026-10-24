// Real v722 failure: one local fact method inherited six parent-comparison
// assessment obligations. Reproduce on immutable paid inputs, not a new game.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {projectRosterWorkflowHypothesisContextV1} from '../packages/roster-strategist/roster-workflow-hypothesis-context-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';

const root=path.resolve(process.argv[2]);
const state=JSON.parse(await fs.readFile(path.join(root,'workflow.json'),'utf8'));
const original=JSON.stringify(state);
const read=async ref=>JSON.parse(await fs.readFile(path.join(root,'artifacts',ref+'.json'),'utf8'));
const paid=await read('3809e516dca520f326d0bf620011a50f4b7a86c22ba94b2a93a1aef9f8f3ca9a');
const delivered=paid.promptNodes.find(node=>node.kind==='workflow_role_assignment');
assert.equal(delivered.inputs.activeHypothesisTests.value.entries.length,6);
const work=state.work.find(row=>row.id===delivered.workId);
const projection=await projectRosterWorkflowHypothesisContextV1({state,workId:work.id,readArtifact:read});
const required=projection.context.entries.filter(entry=>entry.assessmentResponsibility!=='context_only');
assert.equal(required.length,0,'local method inherits all ancestor tests as its own assessment obligations');
assert.equal(projection.context.taskScope.kind,'fact_method');
assert.equal(projection.context.entries.length,1,'one parent comparison design, not six repeated obligations');
assert.equal(projection.context.entries[0].assessmentSourceEvidenceNumber,175);
const assetSources=projection.context.assetCatalogue.declarations.flatMap(row=>row.sourceEvidenceNumbers);
for(const number of [175,182,190,272,285,290])assert.ok(assetSources.includes(number),'old declaration remains addressable: '+number);
assert.equal(projection.context.assetCatalogue.observationsAreApproved,false);
assert.equal(projection.context.acceptanceGranted,false);
assert.ok(projection.context.assetCatalogue.observations.some(row=>row.sourceEvidenceNumber===539),
  'real ordinary observation must be separate from the design declaration');
assert.ok(!assetSources.includes(539),'ordinary observation is not promoted to a design');

const ownerId=projection.context.taskScope.comparisonOwnerWorkId;
const parent=await projectRosterWorkflowHypothesisContextV1({state,workId:ownerId,readArtifact:read});
assert.equal(parent.context.taskScope.kind,'comparison');
assert.equal(parent.context.entries.filter(row=>row.assessmentResponsibility==='owned').length,1,
  'returning a local method does not waive the real parent comparison');
const scheduled=await read(work.inputRef);
const inputs={...structuredClone(delivered.inputs)};
for(const key of Object.keys(inputs))if(key.startsWith('hypothesisDesignSource'))delete inputs[key];
Object.assign(inputs,{activeHypothesisTests:{source:'literal',value:projection.context}},projection.sourceInputs);
const assignment={...scheduled,inputs};
const memory=new Map();let next=0,request;
const store={load:async()=>state,get:async ref=>memory.has(ref)?memory.get(ref):read(ref),
  put:async value=>{const ref='capture-v724-'+(++next);memory.set(ref,structuredClone(value));return ref;}};
const execute=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'experiment-responsibility-capture',deliberation:{},
  onRequest:async value=>{request=value;throw Error('CAPTURE_ONLY_NO_PROVIDER');}});
await assert.rejects(execute(assignment,{operationState:{version:1,turn:0,reads:[],calls:[],correction:null,consecutiveCorrections:0},
  checkpointOperation:async()=>{}}),/CAPTURE_ONLY_NO_PROVIDER/);
const contract=request.promptNodes.find(node=>node.kind==='hypothesis_assessment_ownership_contract');
assert.equal(contract.assignedDesignCount,0);
assert.equal(contract.taskScope.kind,'fact_method');
assert.ok(request.promptNodes.some(node=>node.kind==='current_comparison_validity_contract'),
  'scoping must not remove experimental validity checks');
assert.deepEqual(request.promptNodes.find(node=>node.kind==='workflow_role_assignment').inputs.originalNecessaryQuestions,
  delivered.inputs.originalNecessaryQuestions,'original unresolved questions remain, not silently answered');
assert.equal(JSON.stringify(state),original);
console.log(JSON.stringify({passed:true,localInheritedObligations:[6,0],parentOwnedComparisons:1,
  historicalDesignsAddressable:true,observationsNotDesigns:true,normalProductPrompt:true,
  providerCalls:0,nativeCalls:0,productionWrites:0,formalPlanAccepted:false}));
