// Actual124 copied a 16-entry alternative into a zero-entry baseline while
// receiving a 266k-token whole-source audit. Expose exact source facts first.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRosterExperimentSourceReviewV1} from '../packages/roster-strategist/roster-workflow-experiment-owner-v1.mjs';
const root=path.resolve(process.argv[2]),base=path.join(root,'workspace/decision-workflows/candidate-capability');
const state=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const get=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const paid=JSON.parse(await fs.readFile(path.join(root,'123.reply.json'),'utf8'));
const owner=state.work.find(w=>w.operationState?.calls?.some(c=>c.receipt.contextHash===paid.receipt.contextHash));
state.work=state.work.filter(w=>!w.experimentSourceReviewOf);
const review=await createRosterExperimentSourceReviewV1({state,owner,result:await get(owner.resultRef),store:{get}});
assert.ok(review.sourceProjections?.length,'source review must not inline whole Native transcripts as its default evidence');
const combat=review.sourceProjections.filter(p=>p.value.exchange);
assert.equal(combat.length,2);
assert.equal(combat.find(p=>p.value.contextRef===null).value.exchange.attackEstimateCount,0);
assert.equal(combat.find(p=>p.value.contextRef!==null).value.exchange.attackEstimateCount,16);
assert.ok(combat.every(p=>p.value.sourceEvidenceId&&p.value.sourceArtifactRef&&p.value.exchange.pointer==='/receipt/exchange'));
const original=JSON.parse(await fs.readFile(path.join(root,'124.request.json'),'utf8'));
const oldSources=Object.entries(original.request.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs)
  .filter(([k])=>k.startsWith('citedSource')).map(([,v])=>v.value);
const oldCharacters=JSON.stringify(oldSources).length,newCharacters=JSON.stringify(review.sourceProjections).length;
assert.ok(newCharacters<oldCharacters/5,'exact fact index should avoid unrelated full traces, not just rename them');
console.log(JSON.stringify({pass:true,actual124FactsSeparated:true,baselineCount:0,alternativeCount:16,
  oldCharacters,newCharacters,originalSourcesStillReadable:true,providerCalls:0,productionWrites:0}));
