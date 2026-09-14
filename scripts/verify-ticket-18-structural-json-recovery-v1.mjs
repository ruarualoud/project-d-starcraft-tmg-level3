import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { hash, seal, verifySeal, sha256 } from '../packages/skill-production/common.mjs';
import { createStarcraftTmgOutputContractV1, validateStarcraftTmgProviderJsonSchemaValueV1 as validate }
  from '../packages/structured-generation/output-contract-registry-v1.mjs';
import { decodeStructuralJsonV1 } from '../packages/structured-generation/adapters/structural-json-recovery-v1.mjs';
import { STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V6 as realContract } from '../content/skill-generation/ticket-18-faction-review-output-contract-v6.mjs';
import { createMacOsRawQuarantineKeyProviderV1 } from '../packages/secure-provider-runtime/raw-quarantine-key-provider-v1.mjs';
import { createEncryptedRawQuarantineV1 } from '../packages/structured-generation/encrypted-raw-quarantine-v1.mjs';
import { normalizeProviderJsonDocumentV1 } from '../packages/secure-provider-runtime/provider-response-outcome-v1.mjs';

const ref = id => ({ id, version: 'v1', hash: hash(id) });
const contract = createStarcraftTmgOutputContractV1({ id: 'fixture.structural-json', version: 'v1', schemaName: 'structural_json_test',
  providerSchema: { type: 'object', additionalProperties: false,
    properties: { reason: { type: 'string', minLength: 1, maxLength: 2000 },
      sourceSlots: { type: 'array', items: { type: 'integer', minimum: 0, maximum: 10 }, minItems: 0, maxItems: 10 },
      accepted: { type: 'boolean' } }, required: ['reason', 'sourceSlots', 'accepted'] },
  modelOwnedFields: ['reason', 'sourceSlots', 'accepted'], hostOwnedFields: ['receipt'],
  mapperRef: ref('fixture.mapper'), semanticValidatorRef: ref('fixture.validator'), description: 'Injected non-game parser test.' });
let checks = 0;
const exact = (text, value, count) => {
  const decoded = decodeStructuralJsonV1(text, contract);
  assert.deepEqual(decoded.value, value); assert.equal(decoded.receipt.edits.length, count);
  assert.equal(decoded.receipt.scalarEdits, 0); assert.equal(decoded.receipt.appendedCharacters, 0);
  assert.equal(decoded.receipt.originalTextHash, hash(text)); assert.equal(decoded.receipt.outputHash, hash(value));
  assert.equal(decoded.receipt.semanticAcceptanceInherited, false);
  let rebuilt = text;
  for (const edit of [...decoded.receipt.edits].reverse()) {
    assert.equal(rebuilt[edit.offsetUtf16], edit.removed);
    rebuilt = rebuilt.slice(0, edit.offsetUtf16) + rebuilt.slice(edit.offsetUtf16 + 1);
  }
  assert.deepEqual(JSON.parse(rebuilt), value); assert.equal(decoded.receipt.repairedTextHash, hash(rebuilt));
  assert.equal(validate(contract.providerSchema, decoded.value).ok, true); checks++;
};
const value = { reason: 'x', sourceSlots: [0, 1], accepted: false };
// Red-capable exact symptom: extra array closer after a scalar in an object.
exact('{"reason":"x"],"sourceSlots":[0,1],"accepted":false}', value, 1);
exact('{"reason":"x"],"sourceSlots":[0},1]],"accepted":false]}', value, 4);
for (let n = 0; n < 80; n++) {
  const original = { ...value, reason: '中文\\引号" 方括号 ] } 与转义\n' + n };
  const text = JSON.stringify(original).replace(',"sourceSlots":', '],"sourceSlots":');
  exact(text, original, 1);
}
const reject = (text, code) => { assert.throws(() => decodeStructuralJsonV1(text, contract), { code }); checks++; };
reject(JSON.stringify(value), 'STRUCTURAL_JSON_NOT_APPLICABLE');
for (const text of [
  '{"reason":"x","sourceSlots":[0,1],"accepted":false',
  '{"reason":"x],"sourceSlots":[0],"accepted":false}',
  '{"reason":"x","sourceSlots":[0,],"accepted":false}',
  '{"reason":"x","sourceSlots":[0,1],"accepted":}',
  '{"reason":"x","sourceSlots":[0 1],"accepted":false}',
  '{"reason":"x","sourceSlots":[0,1],"accepted":false} explanation',
  '```json\n{"reason":"x","sourceSlots":[0,1],"accepted":false}',
  '{"reason":"x"/*note*/,"sourceSlots":[0,1],"accepted":false}',
]) reject(text, 'STRUCTURAL_JSON_SYNTAX_UNSUPPORTED');
for (const text of [
  '{"reason":"x"],"sourceSlots":[0,1]}',
  '{"reason":1],"sourceSlots":[0,1],"accepted":false}',
  '{"reason":"x"],"sourceSlots":[0,1],"accepted":false,"extra":"note"}',
]) reject(text, 'STRUCTURAL_JSON_SCHEMA_INVALID');
reject('{"reason":"x"],"reason":"y","sourceSlots":[0,1],"accepted":false}', 'STRUCTURAL_JSON_DUPLICATE_KEY');
reject(String.raw`{"reason":"x"],"rea\u0073on":"y","sourceSlots":[0,1],"accepted":false}`, 'STRUCTURAL_JSON_DUPLICATE_KEY');
reject('{"reason":"x"]]]]],"sourceSlots":[0,1],"accepted":false}', 'STRUCTURAL_JSON_EDIT_LIMIT');
reject(' '.repeat(65537), 'STRUCTURAL_JSON_INPUT_LIMIT');
reject('{"reason":' + '['.repeat(65) + '0' + ']'.repeat(65) + '}', 'STRUCTURAL_JSON_DEPTH_LIMIT');
assert.throws(() => decodeStructuralJsonV1('{"":0]}', { ...contract, contractHash: '0'.repeat(64) })); checks++;

// Actual authenticated paid bytes; no Provider or plaintext exposure.
const base = 'build/ticket-18-faction-production-v1/', runId = 'faction-v1-0a2eb5fe91b8ae51677a';
const attemptId = 'structured-46a45df4d1115da71ccf8b23c5a3cb26727a227d32acef25';
const filename = 'build/ticket-17-production-redesign-v1/production.sqlite';
const db = new DatabaseSync(filename, { readOnly: true });
let issue, attemptHash;
try {
  assert.equal(db.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n, 0);
  attemptHash = hash(db.prepare('SELECT * FROM attempts WHERE run=? AND id=?').get(runId, attemptId));
  issue = verifySeal(verifySeal(JSON.parse(db.prepare('SELECT artifact FROM steps WHERE run=? AND id=?')
    .get(runId, attemptId + '.wire-issue-v2').artifact)).value);
} finally { db.close(); }
const helper = verifySeal(JSON.parse(await readFile(base + 'raw-quarantine-key-helper-v1/manifest.json', 'utf8')));
const keyProvider = await createMacOsRawQuarantineKeyProviderV1({
  helperPath: process.cwd() + '/' + base + 'raw-quarantine-key-helper-v1/raw-quarantine-keychain-v1', helperHash: helper.helperHash });
const quarantine = await createEncryptedRawQuarantineV1({ directory: base + runId + '/encrypted-wire-v2', keyProvider });
const actual = await quarantine.locate(issue.rawBinding, bytes => {
  const text = bytes.toString('utf8');
  assert.throws(() => JSON.parse(normalizeProviderJsonDocumentV1(text).text), SyntaxError); checks++;
  const decoded = decodeStructuralJsonV1(text, realContract);
  assert.equal(hash(decoded.value), '297967af986ddc06829cc8dea7f320a1afaa4efeff44b913f80dc02185cb1f73');
  assert.deepEqual(decoded.receipt.edits.map(e => e.offsetUtf16), [1159, 2492]);
  assert.equal(decoded.receipt.repairedTextHash, '699a46e088d73b5837a8cb7a96aee7ff533313fe61fde096112b2d1470786ba5');
  checks++; return decoded.receipt;
});
assert.equal(actual.receipt.hash, issue.quarantineReceiptRef.receiptHash); checks++;
const current = new DatabaseSync(filename, { readOnly: true });
try { assert.equal(hash(current.prepare('SELECT * FROM attempts WHERE run=? AND id=?').get(runId, attemptId)), attemptHash); checks++; }
finally { current.close(); }
const files = ['packages/structured-generation/adapters/structural-json-recovery-v1.mjs',
  'scripts/verify-ticket-18-structural-json-recovery-v1.mjs'];
const report = seal({ version: 'structural_json_recovery_component_v1', passed: true, checks,
  actualOriginRunId: runId, actualOriginAttemptId: attemptId, actualIssueHash: issue.hash,
  actualRecovery: actual.value, originalAttemptUnchanged: true, authenticatedRawRead: true,
  actualDshSessions: 0, providerCalls: 0, productionWired: false, semanticAcceptance: false, trainingTruth: false,
  codeHashes: await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) }))) });
await writeFile(base + 'structural-json-recovery-component-v1.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks, actualRawRecovered: true, providerCalls: 0, productionWired: false, hash: report.hash }));
