// Actual r6 read requested a full section from the Plan index and received only
// block handles. Exercise that same interface without touching the real Run.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
const directory=path.join(path.resolve(process.argv[2]),'workspace/decision-workflows/p4-from-empty');
let state=JSON.parse(await fs.readFile(path.join(directory,'workflow.json'),'utf8'));
const get=async ref=>JSON.parse(await fs.readFile(path.join(directory,'artifacts',ref+'.json'),'utf8'));
const draftEntry=state.evidence.find(e=>e.id==='draft:r6:plan:structure');
const index=await get(draftEntry.artifactRef);
const expected=await Promise.all(index.componentPurposes.map(row=>get(state.evidence.find(e=>e.id===row.evidenceId).artifactRef)));
const workflow=await createRosterDecisionWorkflowV1({store:{load:async()=>structuredClone(state),save:async v=>state=structuredClone(v),get},
  execute:()=>{throw Error('NO_EXECUTION');}});
const read=pointer=>workflow.dispatch({type:'read_evidence',consumer:'v518',evidenceId:draftEntry.id,pointer});
assert.deepEqual((await read('/componentPurposes')).value,expected,'section read must return exact section content, not handles');
assert.deepEqual((await read('/componentPurposes/0/publicPurposeText')).value,expected[0].publicPurposeText);
assert.equal((await read('/componentPurposes/99')).status,'path_missing');
assert.deepEqual((await read('')).value,index,'empty index read stays a navigational directory');
console.log(JSON.stringify({pass:true,checks:4,providerCalls:0,toolExecutions:0,productionWrites:0}));
