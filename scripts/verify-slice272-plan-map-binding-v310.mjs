// B r21-r23: a model map citation was silently nulled, then called an unchanged Plan.
// Replay the saved paid reply through the real model port and session, in memory only.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { gunzipSync } from 'node:zlib';
import { createIterativeRosterFlashModelPortV1 } from '../packages/roster-strategist/iterative-roster-flash-model-port-v1.mjs';
import { createIterativeRosterPlanSessionV1 } from '../packages/roster-strategist/iterative-roster-plan-session-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';

const directory = `${process.argv[2]}/B/fresh-generation-v264`;
const sessionDirectory = `${directory}/workspace/iterative-draft/sessions`;
const file = (await fs.readdir(sessionDirectory)).find(name => name.endsWith('.json'));
const originalBytes = await fs.readFile(`${sessionDirectory}/${file}`);
const original = JSON.parse(originalBytes).value;
assert.equal(original.revision, 23, 'Use the named stopped B revision, never a moving fixture');
assert.equal(original.blockingFinding, 'ITERATIVE_ROSTER_OUTPUT_DID_NOT_CONVERGE');
const request = JSON.parse(gunzipSync(await fs.readFile(`${directory}/request-165.private.json.gz`)));
const context = request.promptNodes[0].content;
const sourceRequestKey = original.iterations.at(-1).requestKey;
const replies = new Map();
for (const name of (await fs.readdir(`${directory}/workspace/iterative-draft/replies`)).filter(name => name.endsWith('.json'))) {
  const raw = JSON.parse(await fs.readFile(`${directory}/workspace/iterative-draft/replies/${name}`, 'utf8'));
  if (raw.id === sourceRequestKey) replies.set(raw.id, raw.value);
}
const paid = replies.get(sourceRequestKey);
assert(paid?.paidProviderCall && paid.output?.kind === 'revise_plan');
assert.equal(original.plan.mapEvidenceHash, null);
assert(paid.output.plan.mapEvidenceHash);
const originalReplyHash = hash(paid);
const route = original.observations.findLast(entry => entry.query?.kind === 'map_route'
  && entry.query.candidateHash === original.currentCandidate.candidateHash
  && entry.receipt?.candidateHash === original.currentCandidate.candidateHash
  && entry.receipt?.mapBinding?.roomFreezeHash === original.frozenContext.mapHash
  && entry.receipt.status === 'certified');
assert(route, 'An actual current-army/current-map route already exists');
// The real file includes 145MB of unrelated Teach history. Keep only the
// failed decision's dependencies; never change the original production file.
let saved = { ...original, observations: [route, ...original.observations.filter(
  entry => entry.query?.kind === 'model_output_repair').slice(-3)],
  iterations: original.iterations.slice(-3), draftTeachSnapshots: [],
  draftTeachFeedback: null, journeyCheckpoint: null, workflow: null,
  frozenContext: original.frozenContext };
let providerCalls = 0;
const model = createIterativeRosterFlashModelPortV1({
  deliberationFactory: { createForRun() { providerCalls++; throw Error('NO_PROVIDER_IN_REPLAY'); } },
  replyStore: { async loadRetainedReply(key) { return replies.get(key); },
    async retainReply(key, reply) { replies.set(key, reply); } },
  skillGuidance: context.skillGuidance, missionEvidence: context.missionEvidence,
});
const session = createIterativeRosterPlanSessionV1({
  store: { async load() { return saved; }, async save(_, state) { saved = state; } }, model,
  builder: { async evaluate() { throw Error('NO_BUILDER_IN_BINDING_REPLAY'); } },
  tools: { async query() { throw Error('NO_RULE_REPLAY'); } },
  review: { async draft(state) { return state; }, async final() { throw Error('NO_FINAL_ADMISSION'); } },
});
const result = await session.resume(original.sessionId);
assert.equal(result.plan.mapEvidenceHash, route.receipt.receiptHash,
  'B paid revise_plan must bind the existing current map route, not silently null it and report no change');
assert.equal(result.iterations.at(-1).decisionKind, 'revise_plan');
assert.equal(result.status, 'active');
assert.deepEqual(result.currentCandidate, original.currentCandidate);
assert.deepEqual(result.plan.strategy, paid.output.plan.strategy, 'Do not author or weaken strategy');
assert.equal(result.plan.victoryRoute, paid.output.plan.victoryRoute);
assert.equal(result.plan.arrivalScheduleStatus, paid.output.plan.arrivalScheduleStatus,
  'Map binding must never promote an arrival to legal');
assert.equal(result.iterations.at(-1).publicDecision.originalMapEvidenceHash, paid.output.plan.mapEvidenceHash);
assert.equal(result.iterations.at(-1).publicDecision.modelEvidenceReferenceStatus, 'unrecognized_model_reference');
assert.deepEqual(result.iterations.at(-1).publicDecision.inputAdjustments, [{
  field: 'plan.mapEvidenceHash', supplied: paid.output.plan.mapEvidenceHash,
  normalized: route.receipt.receiptHash, reason: 'bind_existing_current_candidate_map_route',
  source: { candidateHash: original.currentCandidate.candidateHash,
    mapHash: original.frozenContext.mapHash, receiptHash: route.receipt.receiptHash },
  strategyChanged: false, arrivalLegalityChanged: false,
}]);
assert.equal(hash(replies.get(sourceRequestKey)), originalReplyHash);
assert.deepEqual(await fs.readFile(`${sessionDirectory}/${file}`), originalBytes);
assert.equal(providerCalls, 0);
console.log(JSON.stringify({ pass: true, case: 'B-r23-paid-revise-plan', outcome: 'retained_reply_reconciled',
  providerCalls, nativeQueries: 0, originalSessionUnchanged: true, strategyUnchanged: true,
  originalReferencePreserved: true, finalAdmission: false }));
