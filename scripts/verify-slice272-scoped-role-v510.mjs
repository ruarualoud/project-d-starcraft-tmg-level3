// Reproduce v509's generic Teach result and full-Plan read expansion, then check
// the new role contract and lossless semantic sections. Not a strategy test.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {splitRosterWorkflowPlanBlocksV1} from '../packages/roster-strategist/roster-workflow-plan-blocks-v1.mjs';
import {ROSTER_WORKFLOW_LOCAL_TEACH_CONTRACT_V1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {validateStarcraftTmgProviderJsonSchemaValueV1 as validate} from '../packages/structured-generation/output-contract-registry-v1.mjs';
const old=JSON.parse(await fs.readFile(process.argv[2]+'/5.reply.json','utf8')).output;
if(process.argv.includes('--baseline')){
  assert(Array.isArray(old.proposals),'Actual v509 Teach repeated fact findings instead of producing Teach proposals');
  process.exit(0);
}
assert.equal(validate(ROSTER_WORKFLOW_LOCAL_TEACH_CONTRACT_V1.providerSchema,old).ok,false);
const source=JSON.parse(await fs.readFile('build/slice272-role-workflow-prototype-v502-r5-20261019/decision.request.json','utf8'));
const plan=source.request.promptNodes.find(n=>n.kind==='current_full_plan_not_validated').plan;
const {structure,blocks}=splitRosterWorkflowPlanBlocksV1(plan);
const read=ref=>structuredClone(blocks.find(b=>b.id===ref.evidenceId).value);
const restored=Object.fromEntries(Object.entries(structure).map(([key,value])=>[key,
  Array.isArray(value)?value.map(read):Object.hasOwn(value,'literal')?value.literal:read(value)]));
assert.deepEqual(restored,plan);
assert.equal(new Set(blocks.map(b=>b.id)).size,blocks.length);
assert.equal(blocks.find(b=>b.id==='plan:scoreRoute').value.routeText,plan.scoreRoute.routeText);
assert.equal(validate(ROSTER_WORKFLOW_LOCAL_TEACH_CONTRACT_V1.providerSchema,{action:'finish',publicReason:'Contract fixture only',reads:[],
  proposals:[{claimPaths:['scoreRoute.routeText'],disposition:'investigate',publicReason:'Needs actual arrival evidence',
    alternatives:['Retain the conditional route while querying'],disconfirmation:'Native route result contradicts timing',evidenceNumbers:[1],requiredData:['Native route result']}]}).ok,true);
console.log(JSON.stringify({pass:true,exactPlanRoundTrip:true,blocks:blocks.length,oldGenericTeachRejected:true,
  scope:'Role contract and lossless block access only; no model-quality or complete-generation claim'}));
