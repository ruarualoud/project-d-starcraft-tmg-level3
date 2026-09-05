import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFrozenSkillEvidence, createEvidenceReader } from '../packages/skill-production/evidence.mjs';
import { createFirstFivePlan } from '../packages/skill-production/coverage-plan.mjs';
import { verifySeal, seal, hash, sha256 } from '../packages/skill-production/common.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'build/ticket-18-production-v3');
await mkdir(OUT, { recursive: true });
try {
  const previous = verifySeal(JSON.parse(await readFile(path.join(OUT, 'contract-readiness.json'), 'utf8')));
  await writeFile(path.join(OUT, 'contract-readiness-' + previous.hash + '.json'), JSON.stringify(previous, null, 2), { flag: 'wx' });
} catch (error) { if (!['ENOENT', 'EEXIST'].includes(error.code)) throw error; }
const catalogue = await loadFrozenSkillEvidence(ROOT), reader = createEvidenceReader(catalogue), plan = createFirstFivePlan(catalogue);
const db = new DatabaseSync(path.join(ROOT, 'build/ticket-17-production-redesign-v1/production.sqlite'), { readOnly: true });
const priorRun = 'rules-v2-441e39a97d937df7327c';
const prior = id => {
  const row = db.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'").get(priorRun, id);
  return row ? verifySeal(JSON.parse(row.artifact)).value : null;
};
const actual = prior('rules-reading-001.candidate');
assert(actual && !actual.semanticPassed);
const note = { ref: 'core.cB7X7UfOMHh3Wxn79ASF.items.1', spanId: 'p3' };
if (process.argv.includes('--baseline')) {
  const { validatePacketReview } = await import('../packages/skill-production/packet-contract.mjs');
  const r = actual.rounds.at(-1).reviews[0];
  const output = { verdicts: r.verdicts.map(v => ({ ...v, evidence: v.evidence.map(e => ({ ref: e.ref, spanId: e.spanId })) })),
    passageCoverage: r.passageCoverage.map(p => p.ref === note.ref && p.spanId === note.spanId ? { ...p, verdict: 'non_normative' } : p) };
  // RED at the actual frozen-output validation seam, not a missing import.
  validatePacketReview(output, actual.rounds.at(-1).inventory, { packet: plan.packets[0], reader, reviewId: 'explicit-note', role: 'supportive_reviewer' });
  db.close(); process.exit(0);
}
const { createGlobalProductionContext, validateGlobalProductionContext } = await import('../packages/skill-production-v3/context.mjs');
const { inspectDraft, validateReview, reconcileReviews, applyIssuePatch } = await import('../packages/skill-production-v3/contracts.mjs');
const { validateDiagnosis, advanceIssueJournal, persistIssueJournal } = await import('../packages/skill-production-v3/issues.mjs');
const { readLegacyPacketSeeds } = await import('../packages/skill-production-v3/seeds.mjs');
const { createProductionRuntimeV3 } = await import('../packages/skill-production-v3/runtime.mjs');
const { openProductionStore } = await import('../packages/skill-production/store.mjs');
const { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V1: profile } = await import('../content/skill-generation/offline-provider-profile-v1.mjs');
const context = createGlobalProductionContext(catalogue);
assert.equal(context.manifest.coreRows, 220); assert.equal(context.manifest.faqRows, 68);
assert.equal(context.manifest.productRows, 83); assert.equal(context.manifest.rawRulesChars, 185006);
assert.equal(context.prompt.sources.length, 371);
assert.equal(validateGlobalProductionContext(context, catalogue).hash, context.hash);
const { hash: cHash, ...contextBody } = context;
assert.throws(() => validateGlobalProductionContext(seal({ ...contextBody,
  prompt: { ...context.prompt, sources: context.prompt.sources.slice(1) } }), catalogue));
const packet = plan.packets[0], inventory = inspectDraft(actual.draft, { packet, context, reader });
function makeReview(role, overrides = {}) {
  const legacy = actual.rounds.at(-1).reviews.find(r => r.role === role);
  return validateReview({ verdicts: legacy.verdicts.map(v => ({ ...v,
    evidence: v.evidence.map(e => ({ ref: e.ref, spanId: e.spanId })), ...(overrides.claim === v.claimId ? { verdict: 'unsupported' } : {}) })),
  passageCoverage: legacy.passageCoverage.map(p => ({ ...p,
    verdict: p.ref === note.ref && p.spanId === note.spanId ? (overrides.note || 'non_normative') : p.verdict,
  })) }, inventory, { packet, context, reader, role, reviewId: 'fixture.' + role });
}
const a = makeReview('supportive_reviewer'), b = makeReview('adversarial_reviewer');
const reconciled = reconcileReviews(inventory, packet, [a, b]);
assert(reconciled.passed); assert(reconciled.dispositions.some(d => d.kind === 'non_normative' && d.ref === note.ref && d.spanId === note.spanId));
assert(!reconcileReviews(inventory, packet, [a, makeReview('adversarial_reviewer', { note: 'unknown' })]).passed);
assert(!reconcileReviews(inventory, packet, [a, makeReview('adversarial_reviewer', { claim: 'claims.0' })]).passed);
const missing = { ...note, kind: 'citation_missing', claimId: 'claims.0', reason: 'Injected citation repair fixture only.' };
const patch = { parentHash: hash(actual.draft), replacements: [], additions: [],
  citationAdditions: [{ claimId: 'claims.0', evidence: [note] }] };
const amended = applyIssuePatch(actual.draft, patch, [missing]);
assert(amended.changed); assert.equal(amended.draft.claims[0].text, actual.draft.claims[0].text);
assert.deepEqual(amended.draft.claims.slice(1), actual.draft.claims.slice(1));
assert.throws(() => applyIssuePatch(actual.draft, patch, []));
assert.throws(() => applyIssuePatch(actual.draft, { ...patch, parentHash: hash('wrong') }, [missing]));
const empty = applyIssuePatch(actual.draft, { parentHash: hash(actual.draft), replacements: [], additions: [], citationAdditions: [] }, [missing]);
assert.equal(empty.changed, false); assert.equal(empty.disposition, 'diagnosis_required_no_progress');
assert.throws(() => applyIssuePatch(actual.draft, { ...patch, citationAdditions: null }, [missing]));
const reviewOutput = r => ({ verdicts: r.verdicts.map(v => ({ ...v, evidence: v.evidence.map(e => ({ ref: e.ref, spanId: e.spanId })) })),
  passageCoverage: r.passageCoverage.map(({ sourceEvidence, ...p }) => p) });
for (const [field, value] of [['claimIds', null], ['evidence', null], ['claimIds', ['claims.9999']]]) {
  const invalid = structuredClone(reviewOutput(a)); invalid.passageCoverage[0][field] = value;
  assert.throws(() => validateReview(invalid, inventory, { packet, context, reader, reviewId: 'bad', role: 'supportive_reviewer' }));
}
const disagreement = reconcileReviews(inventory, packet, [a, makeReview('adversarial_reviewer', { claim: 'claims.0' })]);
const dOutput = { issues: disagreement.issues.map(i => ({ fingerprint: i.fingerprint, kind: 'content_error', reason: 'Injected diagnosis only.',
  repairPlan: 'Replace the flagged claim in this engineering fixture.', evidence: [{ ref: packet.passages[0].ref, spanId: packet.passages[0].spanId }] })) };
const diagnosis = validateDiagnosis(dOutput, disagreement, { reader, context });
assert.equal(diagnosis.canResolveIssues, false);
assert.throws(() => validateDiagnosis({ issues: [] }, disagreement, { reader, context }));
assert.throws(() => validateDiagnosis({ issues: [{ ...dOutput.issues[0], kind: 'approve_anyway' }] }, disagreement, { reader, context }));
const j0 = advanceIssueJournal(null, disagreement, { packetHash: packet.hash, revision: 0, transition: { kind: 'fixture' } });
const j1 = advanceIssueJournal(j0, reconciled, { packetHash: packet.hash, revision: 1, transition: { kind: 'fixture_patch' } });
assert.equal(j0.openIssues, 1); assert.equal(j1.openIssues, 0); assert.equal(j1.records[0].history.length, 2);
assert.throws(() => advanceIssueJournal(j0, reconciled, { packetHash: packet.hash, revision: 3, transition: {} }));
const parentRecipe = JSON.parse(await readFile(path.join(ROOT, 'build/ticket-18-first-five-v1', priorRun, 'recipe.json'), 'utf8'));
const seedArgs = { filename: path.join(ROOT, 'build/ticket-17-production-redesign-v1/production.sqlite'), parentRunId: priorRun,
  parentRecipe, plan, catalogue, modelHash: profile.integrity.hash };
const seeds = readLegacyPacketSeeds(seedArgs);
assert.equal(seeds.length, 5); assert(seeds.every(s => !s.semanticAcceptanceInherited && s.priorCallsRemainInGlobalLedger));
assert.deepEqual(seeds[0].draft, actual.draft); assert(seeds[2].parentStep.endsWith('.schema-editor'));
assert.throws(() => readLegacyPacketSeeds({ ...seedArgs, modelHash: hash('other-model') }));

// Actual SQLite restart and real frozen drafts, but injected DSH/model outputs:
// these tests establish correction control flow, not semantic quality.
const temp = await mkdtemp(path.join(OUT, 'workflow-'));
const filename = path.join(temp, 'test.sqlite'), storeOptions = { runId: 'fixture-v3-repair', recipeHash: hash('v3-runtime-fixture') };
let store = openProductionStore(filename, storeOptions), supportiveCalls = 0, interrupted = false;
const fixedDraft = structuredClone(actual.draft);
fixedDraft.claims[0].text += '（注入测试修正，不是正式规则）';
const injectedDsh = { async run({ task }) {
  assert(task.startsWith('FROZEN GLOBAL SOURCE CONTEXT\n'));
  const ws = JSON.parse(task.slice(task.lastIndexOf('\nLOCAL WORKSPACE\n') + '\nLOCAL WORKSPACE\n'.length));
  const instruction = task.slice(task.indexOf('\nROLE TASK\n'), task.lastIndexOf('\nLOCAL WORKSPACE\n'));
  let output;
  if (instruction.includes('Role: supportive_reviewer') || instruction.includes('Role: adversarial_reviewer')) {
    const supportive = instruction.includes('Role: supportive_reviewer');
    if (supportive) supportiveCalls++;
    if (!supportive && !interrupted) { interrupted = true; throw Object.assign(new Error('injected process interruption'), { code: 'TEST_INTERRUPTION' }); }
    output = reviewOutput(supportive ? a : b);
    if (ws.claims[0].text === actual.draft.claims[0].text) output.verdicts[0].verdict = 'unsupported';
  } else if (instruction.includes('Diagnose every recorded issue')) output = { issues: ws.issues.map(i => ({
    ...dOutput.issues[0], fingerprint: i.fingerprint })) };
  else if (instruction.includes('Repair only the recorded issues')) output = { parentHash: ws.parentHash,
    replacements: [{ claimId: 'claims.0', value: fixedDraft.claims[0] }], additions: [], citationAdditions: [] };
  else throw new Error('Unexpected fixture task');
  return { final: output, actualProvider: false, injected: true };
} };
const runtime = () => createProductionRuntimeV3({ store, context, reader, verifier: {}, model: () => { throw new Error('NO_PROVIDER'); }, dsh: injectedDsh });
await assert.rejects(runtime().produce(packet, seeds[0]), { code: 'TEST_INTERRUPTION' });
assert.equal(supportiveCalls, 1); store.close();
store = openProductionStore(filename, storeOptions);
const produced = await runtime().produce(packet, seeds[0]);
assert(produced.semanticPassed); assert.equal(produced.revisions.length, 1); assert.equal(produced.issueJournal.openIssues, 0);
assert.equal(produced.issueJournal.records[0].history.length, 2);
assert.deepEqual(produced.draft.claims.slice(1), actual.draft.claims.slice(1));
assert.equal(supportiveCalls, 2); // completed first-round review was reused after restart
const callCount = supportiveCalls;
assert.equal((await runtime().produce(packet, seeds[0])).hash, produced.hash); assert.equal(supportiveCalls, callCount);
assert.equal(store.summary().calls, 0);
const persistedJournal = store.artifact(packet.id + '.issues.1'); assert.equal(persistedJournal.hash, produced.issueJournal.hash);
assert.throws(() => persistIssueJournal(store, packet.id, j1));
store.close();

for (const mode of ['no_progress', 'source_uncertain', 'verifier_recheck']) {
  store = openProductionStore(path.join(temp, mode + '.sqlite'), { ...storeOptions, runId: 'fixture-' + mode });
  const simulated = { async run({ task }) {
    const ws = JSON.parse(task.slice(task.lastIndexOf('\nLOCAL WORKSPACE\n') + '\nLOCAL WORKSPACE\n'.length));
    const instruction = task.slice(task.indexOf('\nROLE TASK\n'), task.lastIndexOf('\nLOCAL WORKSPACE\n'));
    let output;
    if (instruction.includes('Role: ')) {
      output = reviewOutput(instruction.includes('supportive_reviewer') ? a : b);
      if (!ws.evidenceRecheckRequest) output.verdicts[0].verdict = 'unsupported';
    } else if (instruction.includes('Diagnose every recorded issue')) output = { issues: ws.issues.map(i => ({ ...dOutput.issues[0],
      fingerprint: i.fingerprint, kind: mode === 'source_uncertain' ? 'source_uncertain' : mode === 'verifier_recheck' ? 'verifier_error' : 'content_error' })) };
    else output = { parentHash: ws.parentHash, replacements: [], additions: [], citationAdditions: [] };
    return { final: output, actualProvider: false, injected: true };
  } };
  const result = await createProductionRuntimeV3({ store, context, reader, verifier: {}, dsh: simulated }).produce(packet, seeds[0]);
  assert.equal(result.semanticPassed, mode === 'verifier_recheck');
  assert.equal(result.rounds.length, mode === 'verifier_recheck' ? 2 : 1);
  assert.equal(result.draft.claims[0].text, actual.draft.claims[0].text);
  if (mode === 'verifier_recheck') assert.equal(result.issueJournal.transition.kind, 'bounded_evidence_recheck');
  else assert(result.repairStops.length === 1 && result.issueJournal.openIssues > 0);
  store.close();
}
const files = ['packages/skill-production-v3/context.mjs', 'packages/skill-production-v3/contracts.mjs',
  'packages/skill-production-v3/issues.mjs', 'packages/skill-production-v3/seeds.mjs', 'packages/skill-production-v3/runtime.mjs',
  'packages/skill-production-v3/citation-repair.mjs', 'packages/skill-production-v3/continuation.mjs',
  'packages/skill-production-v3/structure-repair.mjs', 'scripts/verify-ticket-18-claim-packing-v3.mjs',
  'packages/skill-production/model.mjs', 'scripts/verify-ticket-18-production-v3.mjs'];
const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(ROOT, file))) })));
const report = seal({ passed: true, checkGroups: 10, codeHashes, catalogueHash: catalogue.hash, planHash: plan.hash,
  globalContextHash: context.hash, rawRulesChars: context.manifest.rawRulesChars,
  promptBytes: Buffer.byteLength(JSON.stringify(context.prompt)), priorArtifactHash: actual.hash,
  injectedNormativeDisposition: true, actualModelJudgementPerformed: false, providerCalls: 0, trainingTruth: false });
await writeFile(path.join(OUT, 'contract-readiness.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checkGroups: report.checkGroups, promptBytes: report.promptBytes, hash: report.hash, providerCalls: 0 }));
db.close();
