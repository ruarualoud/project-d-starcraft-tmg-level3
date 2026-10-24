// Reproduce the exact advertised-object/parser-array disagreement in the
// real P5 static-formation query, plus dropped Native mayRepairSameChoice.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {STARCRAFT_TMG_SPATIAL_QUERY_CONTRACTS_V1 as contracts} from '../packages/online-agent-session/spatial-query-contracts-v1.mjs';
import {normalizeExplicitStaticFormationObjectivesV1 as normalize} from '../packages/online-agent-session/formation-intent-contract-v1.mjs';
import * as laboratory from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
const base=path.join(path.resolve(process.argv[2]),'workspace/decision-workflows/p4-from-empty');
const state=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const work=state.work.find(w=>w.id.endsWith('repair-goliath-formation'));
const failure=JSON.parse(await fs.readFile(path.join(base,'artifacts',work.resultRef+'.json'),'utf8')).value;
const declared=contracts['space.solve_static_formation'].arguments.formationObjectives;
assert.ok(Array.isArray(declared),'the advertised top-level value must match the actual array-only parser');
assert.deepEqual(normalize([{kind:declared[0].kind.find(k=>k==='compact'),weight:3,targetIds:[]}]),[{kind:'compact',weight:3,targetIds:[]}]);
const repair=laboratory.projectRosterWorkflowToolRepairV1(failure);
assert.equal(repair.correctable,true);
assert.ok(Array.isArray(repair.currentInputContract.arguments.formationObjectives));
const notRepairable=structuredClone(failure);notRepairable.receipt.queryReceipt.mayRepairSameChoice=false;
assert.equal(laboratory.projectRosterWorkflowToolRepairV1(notRepairable),null,'unknown is not blanket permission to retry');
assert.equal(failure.receipt.queryReceipt.repairContext.expectedArguments.formationObjectives.kind.includes('compact'),true,'old receipt unchanged');
console.log(JSON.stringify({pass:true,checks:5,providerCalls:0,nativeExecutions:0,productionWrites:0}));
