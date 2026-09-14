import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { hash, seal, verifySeal, fail } from '../packages/skill-production/common.mjs';
import { createMacOsRawQuarantineKeyProviderV1 } from '../packages/secure-provider-runtime/raw-quarantine-key-provider-v1.mjs';
import { createEncryptedRawQuarantineV1 } from '../packages/structured-generation/encrypted-raw-quarantine-v1.mjs';
import { normalizeProviderJsonDocumentV1 } from '../packages/secure-provider-runtime/provider-response-outcome-v1.mjs';
import { STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V6 as contract } from '../content/skill-generation/ticket-18-faction-review-output-contract-v6.mjs';
import { validateStarcraftTmgProviderJsonSchemaValueV1 as validateSchema } from '../packages/structured-generation/output-contract-registry-v1.mjs';

// Exact saved failure, no Provider/DSH, no plaintext output or TTL extension.
// --require-parseable is the red-capable parser seam used by the real adapter.
const args = process.argv.slice(2);
assert(args.length === 0 || args.length === 1 && args[0] === '--require-parseable');
const runId = 'faction-v1-0a2eb5fe91b8ae51677a';
const attemptId = 'structured-46a45df4d1115da71ccf8b23c5a3cb26727a227d32acef25';
const base = 'build/ticket-18-faction-production-v1/';
const db = new DatabaseSync('build/ticket-17-production-redesign-v1/production.sqlite', { readOnly: true });
let issue, receipt, originalAttemptHash;
try {
  if (db.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n)
    fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
  const row = db.prepare('SELECT * FROM attempts WHERE run=? AND id=?').get(runId, attemptId);
  assert.equal(row.state, 'failed');
  assert.equal(row.code, 'STRUCTURED_PROVIDER_SCHEMA_INVALID');
  originalAttemptHash = hash(row);
  receipt = verifySeal(JSON.parse(row.response)).value;
  assert.deepEqual(receipt.schemaIssues, [{ path: '$', code: 'provider_json_not_parseable' }]);
  issue = verifySeal(verifySeal(JSON.parse(db.prepare('SELECT artifact FROM steps WHERE run=? AND id=?')
    .get(runId, attemptId + '.wire-issue-v2').artifact)).value);
  assert.equal(issue.rawPayloadPersisted, true);
  assert.equal(issue.originalProviderReceiptHash, receipt.receiptHash);
  assert.equal(issue.rawBinding.outputTextHash, receipt.outputTextHash);
  assert.equal(issue.invocationHash, hash(issue.invocation));
} finally { db.close(); }
const helper = verifySeal(JSON.parse(await readFile(base + 'raw-quarantine-key-helper-v1/manifest.json', 'utf8')));
const keyProvider = await createMacOsRawQuarantineKeyProviderV1({
  helperPath: process.cwd() + '/' + base + 'raw-quarantine-key-helper-v1/raw-quarantine-keychain-v1', helperHash: helper.helperHash });
const quarantine = await createEncryptedRawQuarantineV1({ directory: base + runId + '/encrypted-wire-v2', keyProvider });
const started = performance.now();
const observed = await quarantine.locate(issue.rawBinding, bytes => {
  const text = bytes.toString('utf8');
  assert.equal(hash(text), issue.rawBinding.outputTextHash);
  const normalized = normalizeProviderJsonDocumentV1(text);
  let parsed = false, errorOffset = null, errorName = null, errorClass = null;
  try { JSON.parse(normalized.text); parsed = true; }
  catch (error) {
    errorName = error.name;
    // Never return JSON.parse's message: it can embed plaintext.
    const match = /position (\d+)/u.exec(error.message);
    errorOffset = match ? Number(match[1]) : null;
    errorClass = error.message.startsWith("Expected ',' or '}'") ? 'object_property_terminator'
      : error.message.startsWith('Unexpected token') ? 'unexpected_token' : 'other';
  }
  const stack = []; let quoted = false, escaped = false;
  for (let n = 0; n < (errorOffset ?? 0); n++) {
    const c = normalized.text[n];
    if (quoted) { if (escaped) escaped = false; else if (c === '\\') escaped = true; else if (c === '"') quoted = false; }
    else if (c === '"') quoted = true;
    else if ('[{'.includes(c)) stack.push(c);
    else if (']}'.includes(c)) stack.pop();
  }
  const probes = [];
  if (errorOffset !== null) {
    let prior = errorOffset - 1;
    while (prior >= 0 && /\s/u.test(normalized.text[prior])) prior--;
    const changes = [
      { kind: 'remove_preceding_comma', offset: prior, remove: 1, insert: '', eligible: normalized.text[prior] === ',' },
      { kind: 'insert_object_closer', offset: errorOffset, remove: 0, insert: '}', eligible: !quoted },
      { kind: 'replace_with_object_closer', offset: errorOffset, remove: 1, insert: '}', eligible: !quoted },
      { kind: 'remove_unexpected_closer', offset: errorOffset, remove: 1, insert: '',
        eligible: !quoted && normalized.text[errorOffset] === ']' && stack.at(-1) === '{' },
    ];
    for (const change of changes) {
      if (!change.eligible) { probes.push({ kind: change.kind, eligible: false }); continue; }
      const candidate = normalized.text.slice(0, change.offset) + change.insert + normalized.text.slice(change.offset + change.remove);
      try {
        const value = JSON.parse(candidate), schema = validateSchema(contract.providerSchema, value);
        probes.push({ kind: change.kind, eligible: true, parsed: true, schemaPassed: schema.ok,
          schemaIssues: schema.issues, candidateTextHash: hash(candidate), valueHash: hash(value) });
      } catch (error) { probes.push({ kind: change.kind, eligible: true, parsed: false,
        nextErrorOffset: Number(/position (\d+)/u.exec(error.message)?.[1] ?? -1),
        nextErrorClass: error.message.startsWith("Expected ',' or '}'") ? 'object_property_terminator'
          : error.message.startsWith("Expected ',' or ']'") ? 'array_element_terminator' : 'other' }); }
    }
  }
  // Structure-only projection: no key, string, number or literal content leaves
  // the authenticated raw consumer. Offsets preserve the parser-error relation.
  const structuralTokens = []; let inString = false, escape = false;
  for (let n = 0; n < normalized.text.length; n++) {
    const c = normalized.text[n];
    if (inString) { if (escape) escape = false; else if (c === '\\') escape = true; else if (c === '"') inString = false; }
    else if (c === '"') { structuralTokens.push({ at: n, token: 'string_redacted' }); inString = true; }
    else if ('{}[],:'.includes(c)) structuralTokens.push({ at: n, token: c });
  }
  const nearby = structuralTokens.findIndex(t => t.at >= errorOffset);
  let diagnosticText = normalized.text, deletionProof = null;
  const deletions = [];
  for (let round = 0; round <= 4; round++) {
    try {
      const value = JSON.parse(diagnosticText), schema = validateSchema(contract.providerSchema, value);
      deletionProof = { parsed: true, schemaPassed: schema.ok, schemaIssues: schema.issues,
        deletions, candidateTextHash: hash(diagnosticText), valueHash: hash(value) };
      break;
    } catch (error) {
      const at = Number(/position (\d+)/u.exec(error.message)?.[1] ?? -1);
      if (round === 4 || at < 0 || !error.message.startsWith("Expected ',' or '}'") || diagnosticText[at] !== ']') break;
      const scope = []; let quote = false, slash = false;
      for (let n = 0; n < at; n++) {
        const c = diagnosticText[n];
        if (quote) { if (slash) slash = false; else if (c === '\\') slash = true; else if (c === '"') quote = false; }
        else if (c === '"') quote = true;
        else if ('[{'.includes(c)) scope.push(c);
        else if (']}'.includes(c)) scope.pop();
      }
      if (quote || scope.at(-1) !== '{') break;
      deletions.push({ offset: at, originalOffset: at + deletions.length, characterCode: 93 });
      diagnosticText = diagnosticText.slice(0, at) + diagnosticText.slice(at + 1);
    }
  }
  return { parsed, errorName, errorClass, errorOffset, syntaxStack: stack, insideStringAtFailure: quoted, probes,
    structuralWindow: structuralTokens.slice(Math.max(0, nearby - 8), nearby + 9),
    diagnosticOnlyRepeatedCloserDeletion: deletionProof,
    normalizedKind: normalized.kind,
    normalizedHash: hash(normalized.text), rawBytes: bytes.length,
    errorCharacterCode: errorOffset === null ? null : normalized.text.codePointAt(errorOffset),
    startsWithObject: normalized.text.trimStart().startsWith('{'),
    endsWithObject: normalized.text.trimEnd().endsWith('}'),
    containsFence: text.includes('```'), containsLineCommentMarker: text.includes('//'),
    containsBlockCommentMarker: text.includes('/*') };
});
assert.equal(observed.receipt.hash, issue.quarantineReceiptRef.receiptHash);
assert.equal(observed.receipt.recordHash, issue.quarantineReceiptRef.recordHash);
const reread = new DatabaseSync('build/ticket-17-production-redesign-v1/production.sqlite', { readOnly: true });
try { assert.equal(hash(reread.prepare('SELECT * FROM attempts WHERE run=? AND id=?').get(runId, attemptId)), originalAttemptHash); }
finally { reread.close(); }
const report = seal({ version: 'slot_wire_json_diagnosis_v1', runId, attemptId,
  originalIssueHash: issue.hash, originalAttemptHash, originalReceiptHash: receipt.receiptHash,
  outputTextHash: receipt.outputTextHash, quarantineRecordHash: observed.receipt.recordHash,
  expiresAt: observed.receipt.expiresAt, authenticatedRawRead: true, ...observed.value,
  originalAttemptUnchanged: true, newProviderCalls: 0, actualDshSessions: 0,
  plaintextLogged: false, plaintextPersisted: false, productionResumed: false, trainingTruth: false });
await writeFile(base + 'slot-wire-json-diagnosis-v1.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ...report, elapsedMs: Math.round(performance.now() - started) }));
if (args[0] === '--require-parseable') assert.equal(report.parsed, true, 'ACTUAL_NATIVE_REVIEW_JSON_NOT_PARSEABLE');
