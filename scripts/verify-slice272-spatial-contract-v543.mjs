// Actual91 submits two units inside anchors but omits Native's required unitId.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {compileRosterWorkflowExperimentV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
import {describePregameWorkflowInputContractsV1} from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import {STARCRAFT_TMG_SPATIAL_QUERY_CONTRACTS_V1} from '../packages/online-agent-session/spatial-query-contracts-v1.mjs';
const run=path.resolve(process.argv[2]);
const original=JSON.parse(await fs.readFile(path.join(run,'91.reply.json'),'utf8'));
const order=original.output.workOrders[0];
assert.throws(()=>compileRosterWorkflowExperimentV1({order,scope:{},namespace:'actual91'}),e=>{
  assert.equal(e.code,'ROSTER_WORKFLOW_SPATIAL_ARGUMENT_CONTRACT');
  assert.deepEqual(e.detail.missingFields,['unitId']);
  assert.deepEqual(e.detail.contract,STARCRAFT_TMG_SPATIAL_QUERY_CONTRACTS_V1['space.solve_static_formation']);return true;
},'missing required arguments must return the source contract before Native dispatch');
const descriptor=describePregameWorkflowInputContractsV1();
assert.deepEqual(descriptor.spatial.queryContracts,STARCRAFT_TMG_SPATIAL_QUERY_CONTRACTS_V1);
assert.ok(descriptor.inspect.resultSections.baseStateHash);
const corrected=structuredClone(order),args=JSON.parse(corrected.steps[0].argumentsJson);
args.argumentsJson=JSON.stringify({unitId:'u_goliath_1',anchors:[{xInches:30,yInches:10}]});
corrected.steps[0].argumentsJson=JSON.stringify(args);
assert.equal(compileRosterWorkflowExperimentV1({order:corrected,scope:{},namespace:'source-shape'}).length,1);
assert.deepEqual(JSON.parse(await fs.readFile(path.join(run,'91.reply.json'),'utf8')),original);
console.log(JSON.stringify({pass:true,actualMissingUnitCaughtBeforeDispatch:true,allQueryContractsSourceOwned:true,sourceShapeAccepted:true,providerCalls:0,productionWrites:0}));
