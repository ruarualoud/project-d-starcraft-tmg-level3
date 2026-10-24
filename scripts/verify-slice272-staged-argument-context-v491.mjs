import fs from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import * as edits from '../packages/roster-strategist/roster-plan-edit-tools-v1.mjs';
const request=JSON.parse(gunzipSync(await fs.readFile(process.argv[2])));
const reply=JSON.parse(gunzipSync(await fs.readFile(process.argv[3])));
const actual=request.promptNodes.find(n=>n.nodeType==='plan-edit-tool-results').content;
const snapshot={...actual,edits:reply.output.toolCalls.map(c=>({claimPath:c.arguments.claimPath,
 argument:Object.fromEntries(Object.entries(c.arguments).filter(([k])=>k!=='claimPath')),facts:[]}))};
const project=edits.projectStagedRosterPlanArgumentsV1 || (()=>actual);
const output=project(snapshot);
assert.ok(JSON.stringify(output.stagedArguments?.[0]?.argument)===JSON.stringify(snapshot.edits[0].argument),
 'Actual345 knows staged path but not the actual344 argument; second field loses revised strategy context');
assert.equal(output.applied,false);
assert.equal(output.strategyContentAuthority,'unreviewed_model_argument');
assert.deepEqual(output.results,actual.results);
assert.deepEqual(output.missingClaimPaths,actual.missingClaimPaths);
const retained=project({...snapshot,edits:[{claimPath:'other',retainedText:'exact retained argument',retentionReason:'unchanged',facts:[]}]});
assert.equal(retained.stagedArguments[0].retainedText,'exact retained argument');
console.log(JSON.stringify({pass:true,actual345:true,actual344StrategyPreserved:true,sourceAndReceiptAuthorityUnchanged:true,providerCalls:0}));
