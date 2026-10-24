import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {gunzipSync} from 'node:zlib';
const directory=process.argv[2];
const request=JSON.parse(gunzipSync(await fs.readFile(path.join(directory,'call-165.product-request.json.gz'))));
const reply=JSON.parse(gunzipSync(await fs.readFile(path.join(directory,'call-165.reply.json.gz'))));
const session=JSON.parse(await fs.readFile(path.join(path.dirname(directory),'workspace/drafts',request.sessionId+'.json'),'utf8'));
const source=await fs.readFile(new URL('./continue-slice272-walkthrough-v320.mjs',import.meta.url),'utf8');
assert.ok(source.includes('verifyRetainedFormalDebugReplyV1'),'formal paid replies cannot use the iterative-decision-only resume guard');
const {verifyRetainedFormalDebugReplyV1}=await import('./retained-formal-debug-reply-v1.mjs');
const input={request,reply,session,expectedSessionId:request.sessionId,expectedReceiptHash:reply.receipt.receiptHash};
assert.equal(verifyRetainedFormalDebugReplyV1(input),true);
for(const changed of [{expectedSessionId:'other'},{expectedReceiptHash:'0'.repeat(64)},
  {session:{...session,publicOutputs:[]}}, {reply:{...reply,output:{}}}]) {
  assert.equal(verifyRetainedFormalDebugReplyV1({...input,...changed}),false);
}
console.log(JSON.stringify({passed:true,actualReply:165,paidReplyPreserved:true,wrongIdentityOrOutputRejected:true}));
