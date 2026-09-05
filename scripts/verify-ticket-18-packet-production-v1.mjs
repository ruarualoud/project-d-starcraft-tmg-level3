import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFrozenSkillEvidence, createEvidenceReader } from '../packages/skill-production/evidence.mjs';
import { createFirstFivePlan, verifyFirstFivePlan } from '../packages/skill-production/coverage-plan.mjs';
import { inspectPacket, applyPacketPatch, validatePacketReview, combinePacketReviews } from '../packages/skill-production/packet-contract.mjs';
import { createPacketRuntime, createPacketTools } from '../packages/skill-production/packet-runtime.mjs';
import { sourceSpans } from '../packages/skill-production/spans.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { hash, seal, sha256 } from '../packages/skill-production/common.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'build/ticket-18-first-five-v1');
await mkdir(OUT, { recursive: true });
const c = await loadFrozenSkillEvidence(ROOT), reader = createEvidenceReader(c), plan = createFirstFivePlan(c);
const checks = [];
function check(id, fn) { fn(); checks.push({ id, passed: true }); }
check('complete_frozen_denominator_not_39_ref_pilot', () => {
  assert.equal(plan.counts.eligibleSourceRows, 288); assert.equal(plan.counts.quarantinedSourceRows, 2);
  assert.equal(plan.skills.length, 5); assert.equal(plan.atomIndex.length, 1163);
  assert.equal(plan.atomIndex.filter(a => a.executable).length, 1049);
  assert.equal(verifyFirstFivePlan(plan, c).hash, plan.hash);
  const spans = plan.packets.flatMap(p => p.passages.map(s => s.ref + '/' + s.spanId));
  const expected = c.rows.filter(r => !r.quarantined && /^(core\.|faq-v1:)/.test(r.id))
    .flatMap(r => sourceSpans(r).map(s => r.id + '/' + s.spanId));
  assert.equal(new Set(spans).size, spans.length); assert.deepEqual(spans, expected);
  assert(plan.packets.every(p => p.passages.length <= 10 && p.chars <= 8000));
});
check('missing_reordered_and_duplicate_packets_rejected_even_if_resealed', () => {
  const { hash: ignored, ...body } = plan;
  for (const packets of [plan.packets.slice(1), [...plan.packets].reverse(), [...plan.packets, plan.packets[0]]]) {
    assert.throws(() => verifyFirstFivePlan(seal({ ...body, packets }), c));
  }
});
const packet = plan.packets[0], refs = [...new Set(packet.passages.map(p => p.ref))];
const claims = packet.passages.map(p => ({ kind: 'rule', text: sourceSpans(c.rows.find(r => r.id === p.ref))
  .find(s => s.spanId === p.spanId).text, evidence: [{ ref: p.ref, spanId: p.spanId }] }));
const draft = { claims }, params = { packet, reader, readRefs: refs };
const coverage = packet.passages.map(p => ({ ref: p.ref, spanId: p.spanId, verdict: 'covered', reason: 'Injected full quotation fixture only.' }));
check('every_rendered_claim_and_passage_inventoried_no_forced_cautions', () => {
  assert(inspectPacket(draft, params).structuralAndProvenancePassed);
  assert.throws(() => inspectPacket({ ...draft, summary: 'unreviewed claim' }, params));
  assert.throws(() => inspectPacket({ claims: [] }, params));
  assert.throws(() => inspectPacket(draft, { ...params, readRefs: [] }));
  assert.throws(() => inspectPacket({ claims: [{ ...claims[0], evidence: [{ ref: refs[0], spanId: 'fiction' }] }] }, params));
});
check('true_claims_do_not_hide_missing_rules_from_source', () => {
  const inventory = inspectPacket(draft, params);
  const output = { verdicts: claims.map((c, i) => ({ claimId: 'claims.' + i, verdict: 'supported', reason: 'Fixture', evidence: c.evidence })),
    passageCoverage: coverage };
  const a = validatePacketReview(output, inventory, { packet, reader, reviewId: 'A', role: 'supportive_reviewer' });
  const b = validatePacketReview({ ...output, passageCoverage: coverage.map((c, i) => i === 0 ? { ...c, verdict: 'omission' } : c) },
    inventory, { packet, reader, reviewId: 'B', role: 'adversarial_reviewer' });
  assert(!combinePacketReviews(inventory, packet, [a, b]).passed);
  assert.throws(() => validatePacketReview({ ...output, passageCoverage: [] }, inventory,
    { packet, reader, reviewId: 'C', role: 'adversarial_reviewer' }));
});
const short = { claims: claims.slice(1) }, findings = inspectPacket(short, params).findings;
check('omission_is_a_local_addition_not_full_regeneration', () => {
  assert(findings.length > 0);
  const patch = { parentHash: hash(short), replacements: [], additions: [claims[0]] };
  const repaired = applyPacketPatch(short, patch, findings);
  assert(inspectPacket(repaired, params).structuralAndProvenancePassed);
  assert.deepEqual(repaired.claims.slice(0, -1), short.claims);
  assert.throws(() => applyPacketPatch(short, { ...patch, parentHash: hash('stale') }, findings));
  assert.throws(() => applyPacketPatch(short, { ...patch, additions: [] }, findings));
  assert.throws(() => applyPacketPatch(short, patch, []));
  assert.throws(() => applyPacketPatch(draft, { parentHash: hash(draft), additions: [],
    replacements: [{ claimId: 'claims.0', value: claims[0] }] }, [{ claimId: 'claims.0' }]));
});
const port = createPacketTools({ reader, packet, verifier: { run: () => assert.fail('heldout invoked') } });
assert((await port.execute('probe', { id: 'heldout.movement.3' })).error);
assert((await port.execute('read', { refs: ['source:army_units:marine'] })).error);
assert((await port.execute('apply', { action: 'move' })).error);
checks.push({ id: 'packet_tools_deny_unassigned_source_heldout_and_room_writes', passed: true });

const temp = await mkdtemp(path.join(OUT, 'packet-tests-'));
let store = openProductionStore(path.join(temp, 'state.sqlite'), { runId: 'packet-test', recipeHash: hash('fixture') });
let calls = 0, maximumObservedBytes = 0;
const model = async ({ stageId, call, observed }) => {
  calls += 1;
  maximumObservedBytes = Math.max(maximumObservedBytes, Buffer.byteLength(JSON.stringify(observed)));
  const needsRead = stageId.endsWith('.tutor') || stageId.endsWith('.generator');
  let command;
  if (needsRead && call === 1) command = { action: 'read', args: { refs } };
  else if (stageId.endsWith('.tutor')) command = { action: 'finish', content: { lesson: ['Injected fixture only'], uncertainties: [] } };
  else if (stageId.endsWith('.generator')) command = { action: 'finish', content: short };
  else if (stageId.includes('semantic-editor')) command = { action: 'finish', content: {
    parentHash: hash(short), replacements: [], additions: [claims[0]] } };
  else {
    const current = stageId.endsWith('.0') ? short : { claims: [...short.claims, claims[0]] };
    command = { action: 'finish', content: { verdicts: current.claims.map((cl, i) => ({ claimId: 'claims.' + i,
      verdict: 'supported', reason: 'Exact copied source in injected contract test, not live quality evidence.', evidence: cl.evidence })), passageCoverage: coverage } };
  }
  return { command, receiptHash: hash({ stageId, call }), usage: { inputUnits: 0, outputUnits: 0 } };
};
// The runtime role DAG is real; the DSH/Provider port is explicitly injected.
const { runDirectLoop } = await import('../packages/skill-production/loops.mjs');
const runtime = createPacketRuntime({ store, reader, model, dsh: { run: runDirectLoop } });
const result = await runtime.produce(packet);
assert(result.semanticPassed); assert.equal(result.revisions.length, 1); assert.equal(result.rounds.length, 2);
assert.equal(result.runtimeAccepted, false); assert.equal(result.heldoutPassed, false);
assert.equal(result.trainingTruth, false);
assert(maximumObservedBytes < 170000, 'packet prompt should fit broker input ceiling with envelope allowance');
const before = calls; store.close();
store = openProductionStore(path.join(temp, 'state.sqlite'), { runId: 'packet-test', recipeHash: hash('fixture') });
const resumed = await createPacketRuntime({ store, reader, model: () => assert.fail('duplicate paid work'),
  dsh: { run: runDirectLoop } }).produce(packet);
assert.equal(resumed.hash, result.hash); assert.equal(before, calls); store.close();
checks.push({ id: 'teach_generate_review_local_repair_re_review_and_durable_resume', passed: true });
const files = ['coverage-plan', 'packet-contract', 'packet-runtime', 'deadline', 'runtime-projection', 'loops', 'dsh-worker', 'model', 'store', 'validation', 'evidence', 'spans', 'common']
  .map(n => 'packages/skill-production/' + n + '.mjs');
files.push('scripts/verify-ticket-18-packet-production-v1.mjs');
const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(ROOT, file))) })));
const report = seal({ ticket: 18, slice: 172, passed: true, checks, planHash: plan.hash, counts: plan.counts,
  codeHashes, maximumObservedBytes, injectedModel: true, providerCalls: 0, dshExecuted: false, skillsGenerated: 0,
  runtimeAccepted: 0, sourceRefreshPerformed: false, trainingTruth: false });
await writeFile(path.join(OUT, 'plan.json'), JSON.stringify(plan, null, 2));
await writeFile(path.join(OUT, 'readiness.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checkGroups: checks.length, counts: plan.counts, hash: report.hash }));
