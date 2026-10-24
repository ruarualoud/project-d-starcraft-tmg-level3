import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { gunzipSync } from 'node:zlib';
import { prepareRosterTeachContextV1 } from '../packages/roster-strategist/roster-planning-workflow-v1.mjs';
const [directory, formalFile] = process.argv.slice(2);
const saved = JSON.parse(await fs.readFile(formalFile, 'utf8'));
const plan = JSON.parse(saved.planSerialized);
const actual = JSON.parse(gunzipSync(await fs.readFile(`${directory}/call-161.reply.json.gz`))).output;
const numericMismatch = actual.findings.find(f => f.claimPath === 'componentPurposes.player1-exact-repair-5'
  && f.severity === 'low' && f.claimQuote.includes('exactly 12'));
assert(numericMismatch, 'The saved reviewer graded the actual 10-versus-12 contradiction low');
const review = {status:'completed', planHash:plan.planHash,
  review:{reviewHash:'actual-161-observation', findings:actual.findings}};
const context = prepareRosterTeachContextV1({framework:{state:{}}, plan, freshContext:{}, review});
assert(context.sourceReview.findings.some(f => f.claimQuote === numericMismatch.claimQuote),
  'Actual161 factual contradiction is silently dropped before Teach because the model assigned low severity');
assert.deepEqual(context.sourceReview.findings, actual.findings, 'Keep original findings; do not relabel them as facts');
assert.equal(context.sourceReview.allegationsAreFacts,false);
assert.equal(context.sourceReview.strategicVeto,false);
const retained = {sent:true};
assert.equal(prepareRosterTeachContextV1({framework:{context:retained,state:{calls:[{}]}},
  plan,freshContext:{},review}),retained,'Already-dispatched context is not silently rewritten');
console.log(JSON.stringify({passed:true,actualReply:161,findingsRetained:actual.findings.length,
  severityDoesNotEraseEvidence:true,providerCalls:0}));
