import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
// Execute the actual product's model adapter, not a reconstructed direct port.
const source=await fs.readFile(new URL('../packages/roster-strategist/iterative-roster-product-port-v1.mjs',import.meta.url),'utf8');
const start=source.indexOf('    model: {',source.indexOf('const session ='));
const end=source.indexOf('\n    builder, tools,',start);
assert(start>=0&&end>start);
const literal=source.slice(start+'    model: '.length,end).trim().replace(/,$/u,'');
const calls=[];
const proof={status:'not_dispatched',requestKey:'exact-reservation',sessionId:'same-session',nextRevision:20};
const state={sessionId:'same-session',pendingDecision:{requestKey:proof.requestKey,nextRevision:20}};
const adapter=Function('modelFor',`return (${literal});`)(actual=>{
 assert.equal(actual,state);return {proveUnsentRequest:async request=>{calls.push(request);return proof;}};
});
assert.equal(typeof adapter.proveUnsentRequest,'function','Actual105: production adapter dropped the new proof method although direct-port test passed');
assert.equal(await adapter.proveUnsentRequest({requestKey:proof.requestKey,state}),proof);
assert.equal(calls.length,1);assert.equal(calls[0].state,state);
console.log(JSON.stringify({pass:true,actualProductAdapter:true,exactProofForwarded:true,providerCalls:0}));
