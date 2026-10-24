import fs from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import assert from 'node:assert/strict';

// Regression fixture is the actual request where a Medic's model-authored
// zero-Supply explanation was incorrectly carried under Rules authority.
const request = JSON.parse(gunzipSync(await fs.readFile(process.argv[2])));
const original = request.promptNodes.find(node =>
  node.nodeType === 'agent-selected-locked-arrival-schedule');
assert.ok(original.content.schedule.entries.some(entry =>
  entry.unitInstanceId === 'medic-1' && entry.poolSupply === 1
  && entry.publicReasonText.includes('Advanced Medic Facilities')));
const module = await import('../packages/roster-strategist/arrival-schedule-evidence-v1.mjs')
  .catch(error => { if (error.code === 'ERR_MODULE_NOT_FOUND') return null; throw error; });
const nodes = module ? module.buildArrivalScheduleEvidenceNodesV1(original.content.schedule)
  : [original];
const facts = nodes.find(node => node.nodeType === original.nodeType);
assert.equal(facts.content.schedule.entries.some(entry => 'publicReasonText' in entry),
  false, 'Model-authored prose must not be promoted to Rules evidence');
assert.deepEqual(facts.content.schedule.rounds, original.content.schedule.rounds);
assert.equal(facts.content.schedule.entries.find(entry =>
  entry.unitInstanceId === 'medic-1').poolSupply, 1);
const intent = nodes.find(node => node.nodeType === 'agent-selected-arrival-intent');
assert.equal(intent.authority, 'model_authored_intent_not_rules_evidence');
assert.deepEqual(intent.content.entries, original.content.schedule.entries.map(entry => ({
  ordinal: entry.ordinal, round: entry.round, unitInstanceId: entry.unitInstanceId,
  publicReasonText: entry.publicReasonText,
})));
assert.equal(intent.content.semanticTruthVerified, false);
assert.equal(facts.content.sourceScheduleHash, original.content.schedule.scheduleHash);
const runtime = await fs.readFile(new URL('../packages/roster-strategist/roster-strategist-runtime-v1.mjs', import.meta.url), 'utf8');
assert.equal(runtime.split('...buildArrivalScheduleEvidenceNodesV1(agentSelectedArrivalSchedule)').length - 1, 2,
  'Foundation and comparison must both consume the same typed projection');
assert.equal(JSON.stringify(original).includes('publicReasonText'), true);
console.log(JSON.stringify({status:'passed', fixture:'actual request 302', rulesNumbersUnchanged:true,
  originalIntentPreserved:true, consumers:2, providerCalls:0}));
