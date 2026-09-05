import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFrozenSkillEvidence, createEvidenceReader } from '../packages/skill-production/evidence.mjs';
import { createFirstFivePlan } from '../packages/skill-production/coverage-plan.mjs';
import { sourceSpans } from '../packages/skill-production/spans.mjs';
import { inspectPacket, validatePacketReview, combinePacketReviews } from '../packages/skill-production/packet-contract.mjs';
import { createGlobalProductionContext } from '../packages/skill-production-v3/context.mjs';
import { inspectDraft, validateReview, reconcileReviews } from '../packages/skill-production-v3/contracts.mjs';
import { advanceIssueJournal } from '../packages/skill-production-v3/issues.mjs';
import { createProductionDrills } from '../packages/skill-evaluation/production-drills-v1.mjs';
import { createMechanicsVerifier } from '../packages/skill-production/mechanics.mjs';
import { createSemanticDrills } from '../packages/skill-evaluation/semantic-drills.mjs';
import * as v2Package from '../packages/skill-evaluation/overall-rules-package-v2.mjs';
import * as v3Package from '../packages/skill-evaluation/overall-rules-package-v3.mjs';
import { evaluateOverallRulesCandidate } from '../packages/skill-evaluation/evaluate-overall-rules-v2.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { hash, seal, sha256 } from '../packages/skill-production/common.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const useV3 = process.argv.includes('--v3');
const OUT = path.join(ROOT, useV3 ? 'build/ticket-18-production-v3' : 'build/ticket-18-first-five-v1');
const assembleOverallRulesCandidate = useV3 ? v3Package.assembleOverallRulesCandidateV3 : v2Package.assembleOverallRulesCandidate;
const renderOverallRulesCandidate = useV3 ? v3Package.renderOverallRulesCandidateV3 : v2Package.renderOverallRulesCandidate;
await mkdir(OUT, { recursive: true });
const catalogue = await loadFrozenSkillEvidence(ROOT), reader = createEvidenceReader(catalogue), plan = createFirstFivePlan(catalogue);
const context = createGlobalProductionContext(catalogue);
// Literal source copies and injected judgements are structural fixtures ONLY.
// They are not model-generated Skills, authentic judges or a promotion basis.
const packets = plan.packets.map(packet => {
  const draft = { claims: packet.passages.map(p => ({ kind: 'rule',
    text: sourceSpans(catalogue.rows.find(r => r.id === p.ref)).find(s => s.spanId === p.spanId).text,
    evidence: [{ ref: p.ref, spanId: p.spanId }] })) };
  if (useV3) {
    const inventory = inspectDraft(draft, { packet, context, reader });
    const reviews = ['supportive_reviewer', 'adversarial_reviewer'].map(role => validateReview({
      verdicts: draft.claims.map((c, i) => ({ claimId: 'claims.' + i, verdict: 'supported',
        reason: 'Injected literal source fixture, not authentic semantic acceptance.', evidence: c.evidence })),
      passageCoverage: packet.passages.map((p, i) => ({ ref: p.ref, spanId: p.spanId, verdict: 'covered',
        reason: 'Injected full-span fixture.', claimIds: ['claims.' + i] })) }, inventory,
    { packet, context, reader, reviewId: packet.id + '.' + role, role }));
    const combined = reconcileReviews(inventory, packet, reviews);
    const journal = advanceIssueJournal(null, combined, { packetHash: packet.hash, revision: 0, transition: { kind: 'injected' } });
    return seal({ schema: 'starcraft_production_packet_candidate_v3', packetHash: packet.hash, packetId: packet.id,
      contextHash: context.hash, sourceBinding: catalogue.sourceBinding, draft, issueJournal: journal,
      rounds: [{ inventory, reviews, combined, journalHash: journal.hash }], semanticPassed: true, candidateOnly: true,
      repairStops: [], runtimeAccepted: false, heldoutPassed: false, trainingTruth: false });
  }
  const inventory = inspectPacket(draft, { packet, reader, readRefs: packet.passages.map(p => p.ref) });
  const reviews = ['supportive_reviewer', 'adversarial_reviewer'].map(role => validatePacketReview({
    verdicts: draft.claims.map((c, i) => ({ claimId: 'claims.' + i, verdict: 'supported', reason: 'Injected literal-copy fixture, not production evidence.', evidence: c.evidence })),
    passageCoverage: packet.passages.map(p => ({ ref: p.ref, spanId: p.spanId, verdict: 'covered', reason: 'Injected full-span quotation fixture.' })) },
  inventory, { packet, reader, reviewId: packet.id + '.' + role, role }));
  return seal({ packetHash: packet.hash, packetId: packet.id, sourceBinding: plan.sourceBinding, draft,
    rounds: [{ inventory, reviews, combined: combinePacketReviews(inventory, packet, reviews) }],
    semanticPassed: true, candidateOnly: true, repairStops: [], runtimeAccepted: false, heldoutPassed: false, trainingTruth: false });
});
const fixture = { catalogue, plan, packets }, candidate = assembleOverallRulesCandidate(fixture);
assert.equal(candidate.sections.length, 37); assert.equal(candidate.coverage.claims, 364);
assert.equal(candidate.sourceRefs.length, 288); assert.equal(assembleOverallRulesCandidate(fixture).hash, candidate.hash);
assert.throws(() => assembleOverallRulesCandidate({ ...fixture, packets: packets.slice(1) }));
assert.throws(() => assembleOverallRulesCandidate({ ...fixture, packets: [...packets].reverse() }));
const { hash: oldHash, ...packetBody } = packets[0];
assert.throws(() => assembleOverallRulesCandidate({ ...fixture, packets: [seal({ ...packetBody, semanticPassed: false }), ...packets.slice(1)] }));
const edited = structuredClone(packetBody); edited.draft.claims[0].text += ' fabrication';
assert.throws(() => assembleOverallRulesCandidate({ ...fixture, packets: [seal(edited), ...packets.slice(1)] }));
if (useV3) {
  const full = v3Package.readCompleteOverallRulesContextV3(candidate);
  assert.equal(full.sections.flatMap(s => s.claims).length, 364); assert.equal(full.omittedClaims, 0);
  assert.throws(() => v3Package.readCompleteOverallRulesContextV3(candidate, { maxBytes: 100 }));
} else {
  const excerpt = v2Package.readOverallRulesContext(candidate, { sourceRefs: ['faq-v1:06'], topics: ['movement'] });
  assert(excerpt.claims.some(c => c.evidence.some(e => e.ref === 'faq-v1:06')));
  assert.throws(() => v2Package.readOverallRulesContext(candidate, { sourceRefs: ['missing'] }));
  assert.throws(() => v2Package.readOverallRulesContext(candidate, { topics: ['movement'], maxChars: 100 }));
}
const markdown = renderOverallRulesCandidate(candidate);
for (const c of candidate.sections.flatMap(s => s.claims)) assert(markdown.includes(c.text));
const drills = await createProductionDrills(catalogue), verifier = await createMechanicsVerifier(catalogue), legacyDrills = createSemanticDrills(verifier);
const expected = new Map(drills.proof().map(r => [r.id, r.expected]));
function predictions(kind, group) {
  if (kind === 'fresh') return drills.list(group).map(c => ({ id: c.id, answer: expected.get(c.id) }));
  return legacyDrills.list(group).map(c => {
    const observed = verifier.run(c.id, { allowHeldout: true }).observed;
    return { id: c.id, values: Object.fromEntries(legacyDrills.manifest.questions[group].map(q => {
      const raw = q.field.split('.').reduce((v, k) => v[k], observed);
      return [q.key, q.invert ? !raw : raw];
    })) };
  });
}
const temp = await mkdtemp(path.join(OUT, 'overall-evaluation-tests-'));
let calls = 0;
const model = async request => {
  calls++;
  assert(!JSON.stringify(request.observed).includes('"expected":'));
  assert(!JSON.stringify(request.observed).includes('"kernelReceipt":'));
  assert(JSON.stringify(request.observed).includes('entire_skill_all_sections'));
  assert(JSON.stringify(request.observed).includes('rules-reading-037'));
  const [, kind, group] = request.stageId.split('.');
  return { command: { action: 'finish', content: { predictions: predictions(kind, group) } }, receiptHash: hash(request.stageId) };
};
let store = openProductionStore(path.join(temp, 'test.sqlite'), { runId: 'overall-good', recipeHash: hash('good') });
const report = await evaluateOverallRulesCandidate({ candidate, drills, legacyDrills, store, model });
assert(report.passed); assert.deepEqual(report.summary, [{ kind: 'fresh', cases: 69, correct: 69 }, { kind: 'legacy_regression', cases: 36, correct: 36 }]);
assert.equal(calls, 15); assert.equal(report.runtimeAccepted, false); assert.equal(report.trainingTruth, false); store.close();
store = openProductionStore(path.join(temp, 'test.sqlite'), { runId: 'overall-good', recipeHash: hash('good') });
const resumed = await evaluateOverallRulesCandidate({ candidate, drills, legacyDrills, store, model: () => assert.fail('duplicate model work') });
assert.equal(resumed.hash, report.hash); store.close();
store = openProductionStore(path.join(temp, 'wrong.sqlite'), { runId: 'overall-wrong', recipeHash: hash('wrong') });
let wrongCalls = 0;
const wrong = await evaluateOverallRulesCandidate({ candidate, drills, legacyDrills, store, model: async request => {
  wrongCalls++; const response = await model(request);
  if (request.stageId.includes('.fresh.clearance.')) response.command.content.predictions[0].answer = !response.command.content.predictions[0].answer;
  return response;
} });
assert.equal(wrongCalls, 15); assert.equal(wrong.passed, false); assert.equal(wrong.summary[0].correct, 68); store.close();
store = openProductionStore(path.join(temp, 'repair.sqlite'), { runId: 'overall-repair', recipeHash: hash('repair') });
let repairCalls = 0;
const repaired = await evaluateOverallRulesCandidate({ candidate, drills, legacyDrills, store, model: async request => {
  repairCalls++;
  if (request.stageId.endsWith('.fresh.clearance.answer-0')) return { command: { action: 'finish', content: { predictions: [] } }, receiptHash: hash('malformed') };
  return model(request);
} });
assert(repaired.passed); assert.equal(repairCalls, 16); assert.equal(repaired.results[0].schemaRepairs, 1); store.close();
const files = ['overall-rules-package-v2', 'overall-rules-package-v3', 'evaluate-overall-rules-v2', 'production-drills-v1', 'semantic-drills']
  .map(n => 'packages/skill-evaluation/' + n + '.mjs');
files.push('scripts/verify-ticket-18-overall-evaluation-v2.mjs');
const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(ROOT, file))) })));
const gate = seal({ passed: true, checkGroups: 6, catalogueHash: catalogue.hash, planHash: plan.hash, codeHashes,
  packageVersion: useV3 ? 3 : 2, injectedModel: true, injectedLiteralCopyPackets: true, providerCalls: 0, formalSkillsAccepted: 0, trainingTruth: false });
await writeFile(path.join(OUT, 'evaluation-readiness.json'), JSON.stringify(gate, null, 2));
console.log(JSON.stringify({ passed: true, checkGroups: 6, cases: 105, injectedModel: true, providerCalls: 0, hash: gate.hash }));
