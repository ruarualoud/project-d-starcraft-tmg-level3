import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeProviderJsonDocumentV1 as normalize, assertProviderResponseOutcomeV1 } from '../packages/secure-provider-runtime/provider-response-outcome-v1.mjs';
import { hash, seal, sha256, verifySeal } from '../packages/skill-production/common.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const db = new DatabaseSync(path.join(root, 'build/ticket-17-production-redesign-v1/production.sqlite'), { readOnly: true });
const evidenceHashes = [];
try {
  const rows = db.prepare('SELECT response FROM attempts WHERE run=? AND code=?').all('faction-v1-3825f0d84367c95c6d13', 'PROVIDER_RESPONSE_JSON_INVALID');
  assert.equal(rows.length, 2);
  for (const row of rows) {
    const outcome = verifySeal(JSON.parse(row.response)).value.responseOutcome;
    assertProviderResponseOutcomeV1(outcome); assert.equal(outcome.finishReason, 'stop');
    evidenceHashes.push(outcome.hash);
    // Original prose was deliberately not stored. Instantiate only its actual
    // delimiter shape with unique fixture keys; this is NOT recovered content.
    let key = 0;
    const shape = outcome.structure.replaceAll('_', '0').replace(/""(?=:)/g, () => JSON.stringify('fixtureKey' + key++));
    const result = normalize(shape);
    assert.equal(result.kind, 'redundant_array_object_closers_v1');
    assert.equal(result.evidence.removedUtf16Offsets.length, 2);
    assert.equal(result.evidence.appendedOuterObjectClose, true);
    assert.doesNotThrow(() => JSON.parse(result.text));
  }
  const separatorRows = db.prepare('SELECT response FROM attempts WHERE run=? AND code=? ORDER BY id').all(
    'faction-v1-3ff195438798f5218836', 'PROVIDER_RESPONSE_JSON_INVALID');
  assert.equal(separatorRows.length, 2);
  const outcomes = separatorRows.map(row => verifySeal(JSON.parse(row.response)).value.responseOutcome);
  outcomes.forEach(outcome => { assertProviderResponseOutcomeV1(outcome); evidenceHashes.push(outcome.hash);
    assert.equal(outcome.finishReason, 'stop'); assert.equal(outcome.syntaxIssue, 'separator'); });
  assert.equal(new Set(outcomes.map(outcome => outcome.parseErrorOffset)).size, 1);
} finally { db.close(); }
const values = [{ index: 2, value: { title: '保留 Unicode 😀 和 literal } , ]', when: ['escaped " and \\'], number: -1.25e4 } }, { index: 3, value: { sourceRefs: ['core:001'], risk: 'never change this text' } }];
const valid = JSON.stringify({ channels: { skill: { action: 'finish', content: { items: values } } } });
const broken = valid.replace(JSON.stringify(values), '[' + values.map(v => JSON.stringify(v) + '}').join(',') + ']');
for (const input of [broken, broken.slice(0, -1)]) {
  const result = normalize(input); assert.equal(result.text, valid);
  assert.deepEqual(JSON.parse(result.text).channels.skill.content.items, values);
  assert.equal(result.evidence.originalTextHash, hash(input));
  assert.equal(result.evidence.normalizedTextHash, hash(valid));
  const restored = result.text.slice(0, result.evidence.appendedOuterObjectClose ? -1 : undefined).split('');
  for (const offset of result.evidence.removedUtf16Offsets) restored.splice(offset, 0, '}');
  assert.equal(restored.join(''), input);
}
assert.equal(normalize(valid).text, valid); assert.equal(normalize(valid).kind, 'none');
for (const unsafe of ['{"a":[{}},]}', '{"a":[{}},0,]}', '{"a":[{}}}', '{"a":[{}}],"b":}', '{"a":[{}}],"b":"unfinished', '{"a":[{}}],"b":1 "c":2}', '{"a":[{}}]}trailing', '{"a":[{}}}}]}', '{"a":[{}}]]}', '{"a":[{}}],"b":[1,2}', '{"a":[' + Array(9).fill('{}}').join(',') + ']}']) {
  assert.equal(normalize(unsafe).text, unsafe, unsafe);
}
const quotedValue = { channels: { skill: { action: 'finish', content: { parentHash: 'fixture', replacements: [{ claimId: 'claims.1',
  value: { procedure: ['Move 6" toward the marker without changing any other field.'] } }], additions: [] } } } };
const quotedValid = JSON.stringify(quotedValue), quotedBroken = quotedValid.replace('6\\" toward', '6" toward');
const quoteRecovery = normalize(quotedBroken);
assert.equal(quoteRecovery.kind, 'single_unescaped_quote_v1'); assert.equal(quoteRecovery.text, quotedValid);
assert.deepEqual(JSON.parse(quoteRecovery.text), quotedValue);
assert.equal(quoteRecovery.evidence.originalTextHash, hash(quotedBroken));
assert.equal(quoteRecovery.evidence.normalizedTextHash, hash(quotedValid));
const quoteUnsafe = [quotedBroken.replace('marker', '12" marker'), '{"a":"x" "b":1}', '{"a":"x" trailing}',
  '{"a":"x"}', '{"a":"' + 'x'.repeat(65536) + '" nope}'];
for (const unsafe of quoteUnsafe) assert.equal(normalize(unsafe).text, unsafe);
const files = ['packages/secure-provider-runtime/provider-response-outcome-v1.mjs', 'packages/secure-provider-runtime/provider-egress-transport-v1.mjs', 'packages/secure-provider-runtime/provider-worker-success-classifier-v1.mjs', 'scripts/verify-ticket-18-json-delimiter-recovery-v1.mjs'];
const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(root, file))) })));
const report = seal({ passed: true, policy: 'bounded_grammar_recovery_v2', codeHashes, actualFailureOutcomeHashes: evidenceHashes,
  originalFailedProseRecoverable: false, grammarShapeReplays: 2, scalarPreservationCases: 3, rejectionCases: 16,
  singleEscapeRequiresUniqueWholeObjectParse: true, actualSeparatorFailureCaptured: true,
  actualSeparatorOutputRecovered: false, actualProviderCalls: 0, strategyQualityProven: false, trainingTruth: false });
await writeFile(path.join(root, 'build/ticket-18-faction-production-v1/json-recovery-readiness.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
