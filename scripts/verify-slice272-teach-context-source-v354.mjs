import fs from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {createRosterTeachRolePortsV1} from '../packages/roster-strategist/roster-teach-role-ports-v1.mjs';
const [directory]=process.argv.slice(2);
const read=async n=>JSON.parse(gunzipSync(await fs.readFile(`${directory}/call-${n}.product-request.json.gz`)));
const requests=[await read('059'),await read('060')];
async function capture(request){let sent;const stop=Error('captured_without_provider');
  const ports=createRosterTeachRolePortsV1({sessionId:request.sessionId,
    deliberation:{deliberate(r){sent=r;throw stop;}}});
  const boundary=request.promptNodes.find(n=>n.kind==='frozen-source-and-skill-boundary');
  const initial=request.promptNodes.find(n=>n.kind==='initial-small-plan');
  await assert.rejects(ports.challengerPort.challenge({sourceHashes:boundary.sourceHashes,
    sourceContext:boundary.sourceContext,initialFoundation:initial.foundation,
    initialFoundationHash:initial.foundationHash}),e=>e===stop);
  return sent;
}
const before=await capture(requests[0]),after=await capture(requests[1]);
assert.notDeepEqual(before.promptNodes,after.promptNodes);
assert.notEqual(before.contextHash,after.contextHash,
  'Actual source-query repair changed inputs but the paid-reply reuse key stayed identical');
assert.equal((await capture(requests[1])).contextHash,after.contextHash,'Identical input remains reusable');
console.log(JSON.stringify({pass:true,checks:2,changedEvidenceCannotReuseOldAnswer:true,
  identicalRequestReusable:true,providerCalls:0,roomWrites:0}));
