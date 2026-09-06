import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectFactionPhaseSourceDebtV1, assertNoFactionPhaseSourceDebtV1 } from '../packages/skill-evaluation/faction-phase-source-debt-v1.mjs';
import { seal, verifySeal, hash, sha256 } from '../packages/skill-production/common.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), base = path.join(root, 'build/ticket-18-faction-production-v1');
const json = async name => verifySeal(JSON.parse(await readFile(path.join(base, name + '.json'), 'utf8')));
const [input, captured] = await Promise.all([json('terran_armed_forces-input'), json('faction-v1-228b8989edaaba791753/failed-review-role-input')]);
const draft = captured.request.workspace.draft, audit = inspectFactionPhaseSourceDebtV1({ input, draft });
let checks = 0; const check = (name, run) => { run(); checks++; };
check('actual reconstructed third-section denominator', () => {
  assert.equal(audit.findings.length, 11);
  assert.deepEqual(audit.findings.map(row => row.index + '.' + row.path), [
    '0.procedure.0', '0.alternatives.1', '0.risk', '1.risk', '3.risk', '4.procedure.0', '4.procedure.3', '4.risk', '5.procedure.4', '5.risk', '6.alternatives.2']);
});
check('all findings address exact existing fields', () => {
  for (const finding of audit.findings) {
    const text = finding.path.split('.').reduce((value, key) => value[key], draft.recommendations[finding.index]);
    assert.equal(text, finding.text); assert.equal(hash(text), finding.textHash);
    assert.equal(hash(draft.recommendations[finding.index]), finding.recommendationHash);
  }
});
check('all registered sources remain whole official passages', () => {
  assert(audit.sourceEvidence.length >= 10);
  for (const row of audit.sourceEvidence) assert.equal(hash(row.source), row.sourceHash);
});
check('known errors block even a model-supported candidate', () => assert.throws(() => assertNoFactionPhaseSourceDebtV1({ input,
  candidate: { semanticReviewPassed: true, sections: [{ draft }] } }), { code: 'FACTION_CANDIDATE_PHASE_SOURCE_DEBT' }));
check('correct explicit later-standard-damage risk is not falsely flagged', () => {
  assert(!audit.findings.some(row => row.index === 7 && row.path === 'risk'));
});
check('card exhaustion and keyword-highest rules are not rejected as reviewer alleged', () => {
  assert(!audit.findings.some(row => row.id.includes('card-once') || row.id.includes('buff-highest')));
  assert(audit.findings.find(row => row.index === 1 && row.path === 'risk').reason.includes('本身是正确通用规则'));
});
const changed = structuredClone(draft);
for (const finding of audit.findings) {
  const parts = finding.path.split('.'), row = changed.recommendations[finding.index];
  if (parts.length === 1) row[parts[0]] = 'Unknown replacement; this test makes no semantic acceptance claim.';
  else row[parts[0]][Number(parts[1])] = 'Unknown replacement; this test makes no semantic acceptance claim.';
}
check('absence of exact known text is explicitly not correctness proof', () => {
  const empty = inspectFactionPhaseSourceDebtV1({ input, draft: changed });
  assert.equal(empty.findings.length, 0); assert.equal(empty.absenceProvesGeneralCorrectness, false);
});
check('Orders target finding is scoped to the Goliath advice', () => {
  const other = structuredClone(draft); other.recommendations[6].title = 'Another friendly Biological unit';
  assert(!inspectFactionPhaseSourceDebtV1({ input, draft: other }).findings.some(row => row.id === 'orders-cannot-target-the-goliath'));
});
const { hash: ignored, ...body } = input;
const altered = structuredClone(body);
altered.frozenSources.prompt.sources.find(row => row.ref === 'source:army_units:goliath').passages[0].text =
  altered.frozenSources.prompt.sources.find(row => row.ref === 'source:army_units:goliath').passages[0].text.replace('Armoured, Mechanical, Ground', 'Biological, Ground');
check('changed official target tags require recalibration', () => assert.throws(() => inspectFactionPhaseSourceDebtV1({ input: seal(altered), draft }), { code: 'FACTION_PHASE_SOURCE_CALIBRATION_DRIFT' }));
check('raw actual draft is unchanged', () => assert.equal(hash(draft), audit.draftHash));
const files = ['packages/skill-evaluation/faction-phase-source-debt-v1.mjs', 'scripts/verify-ticket-18-faction-phase-source-debt-v1.mjs'];
const report = seal({ passed: true, checks, inputHash: input.hash, actualCaptureHash: captured.hash, audit,
  codeHashes: await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(root, file))) }))),
  actualCandidateRepaired: false, consumerPerformanceEvaluated: false, providerCalls: 0, trainingTruth: false });
await writeFile(path.join(base, 'phase-source-debt-readiness.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks, knownFields: audit.findings.length, providerCalls: 0, hash: report.hash }));
