import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { hash, verifySeal } from '../packages/skill-production/common.mjs';
import { createMacOsRawQuarantineKeyProviderV1 } from '../packages/secure-provider-runtime/raw-quarantine-key-provider-v1.mjs';
import { createEncryptedRawQuarantineV1 } from '../packages/structured-generation/encrypted-raw-quarantine-v1.mjs';
import { decodeStructuralJsonV1 } from '../packages/structured-generation/adapters/structural-json-recovery-v1.mjs';
import { decodeStructuralJsonV2 } from '../packages/structured-generation/adapters/structural-json-recovery-v2.mjs';
import { validateStarcraftTmgProviderJsonSchemaValueV1 as validate } from '../packages/structured-generation/output-contract-registry-v1.mjs';
import { STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V6 as contract } from '../content/skill-generation/ticket-18-faction-review-output-contract-v6.mjs';

// Original encrypted paid output, read-only and zero Provider calls. No strings,
// keys, numbers, literals, credentials or parser messages are printed.
const args = process.argv.slice(2);
assert(new Set(args).size === args.length && args.every(arg => ['--require-recoverable', '--v2'].includes(arg)));
const runId = 'faction-v1-961f12e8417c1f17beb9';
const attemptId = 'structured-ce87d54764cb17e20fe85662a936b6cfc3c56ca5aaaa0871';
const base = 'build/ticket-18-faction-production-v1/';
const db = new DatabaseSync('build/ticket-17-production-redesign-v1/production.sqlite', { readOnly: true });
const decode = raw => verifySeal(JSON.parse(raw)).value;
const ledgerHash = () => hash(db.prepare('SELECT * FROM attempts ORDER BY run,id').all());
try {
  assert.equal(db.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n, 0);
  const before = ledgerHash();
  const attempt = db.prepare('SELECT * FROM attempts WHERE run=? AND id=?').get(runId, attemptId);
  const issue = verifySeal(decode(db.prepare('SELECT artifact FROM steps WHERE run=? AND id=?')
    .get(runId, attemptId + '.wire-issue-v2').artifact));
  const receipt = decode(attempt.response);
  assert.equal(issue.originalProviderReceiptHash, receipt.receiptHash);
  assert.equal(issue.rawBinding.outputTextHash, receipt.outputTextHash);
  const helper = verifySeal(JSON.parse(await readFile(base + 'raw-quarantine-key-helper-v1/manifest.json', 'utf8')));
  const keyProvider = await createMacOsRawQuarantineKeyProviderV1({
    helperPath: process.cwd() + '/' + base + 'raw-quarantine-key-helper-v1/raw-quarantine-keychain-v1', helperHash: helper.helperHash });
  const quarantine = await createEncryptedRawQuarantineV1({ directory: base + runId + '/encrypted-wire-v2', keyProvider });
  const result = await quarantine.locate(issue.rawBinding, bytes => {
    const text = bytes.toString('utf8');
    assert.equal(hash(text), issue.rawBinding.outputTextHash);
    let offset = null, nativeParsed = false, recovered = false, recoveryCode = null, recovery = null;
    try { JSON.parse(text); nativeParsed = true; }
    catch (error) { offset = Number(/position (\d+)/u.exec(error.message)?.[1] ?? -1); }
    try { const value = (args.includes('--v2') ? decodeStructuralJsonV2 : decodeStructuralJsonV1)(text, contract);
      recovered = true; recovery = value.receipt; }
    catch (error) { recoveryCode = error.code; }
    const tokens = []; let quoted = false, escaped = false;
    for (let at = 0; at < text.length; at++) {
      const c = text[at];
      if (quoted) { if (escaped) escaped = false; else if (c === '\\') escaped = true; else if (c === '"') quoted = false; }
      else if (c === '"') { tokens.push({ at, token: 'string_redacted' }); quoted = true; }
      else if ('{}[],:'.includes(c)) tokens.push({ at, token: c });
    }
    const index = tokens.findIndex(t => t.at >= offset);
    const candidates = [], seen = new Set(), parseableRejected = [];
    const probe = selected => {
      const signature = selected.map(t => t.at).sort((a, b) => a - b).join(',');
      if (seen.has(signature) || seen.size >= 512) return;
      seen.add(signature);
      const ordered = [...selected].sort((a, b) => a.at - b.at);
      let candidate = text, nextOffset = null;
      for (const token of [...ordered].reverse()) candidate = candidate.slice(0, token.at) + candidate.slice(token.at + 1);
      try {
        const value = JSON.parse(candidate), schema = validate(contract.providerSchema, value);
        const row = { deletions: ordered, textHash: hash(candidate), valueHash: hash(value) };
        if (schema.ok) candidates.push(row); else parseableRejected.push({ ...row, issues: schema.issues });
        return;
      } catch (error) { nextOffset = Number(/position (\d+)/u.exec(error.message)?.[1] ?? -1); }
      if (selected.length === 4 || nextOffset < 0) return;
      for (const token of tokens) {
        if (!']}'.includes(token.token) || selected.some(t => t.at === token.at)) continue;
        const adjusted = token.at - selected.filter(t => t.at < token.at).length;
        if (adjusted >= nextOffset - 12 && adjusted <= nextOffset + 2) probe([...selected, token]);
      }
    };
    probe([]);
    return { nativeParsed, offset, recovered, recoveryCode, recovery,
      diagnosticOnlyCloserDeletionCandidates: candidates,
      diagnosticStates: seen.size, diagnosticParseableRejected: parseableRejected,
      rawBytes: bytes.length, structuralWindow: tokens.slice(Math.max(0, index - 10), index + 11),
      startsWithObject: text.trimStart().startsWith('{'), endsWithObject: text.trimEnd().endsWith('}') };
  });
  assert.equal(result.receipt.hash, issue.quarantineReceiptRef.receiptHash);
  assert.equal(result.receipt.recordHash, issue.quarantineReceiptRef.recordHash);
  assert.equal(ledgerHash(), before);
  console.log(JSON.stringify({ runId, attemptId, roleRef: issue.invocation.roleRef,
    contextHash: issue.invocation.contextManifestRef.hash, issueHash: issue.hash,
    outputTextHash: receipt.outputTextHash, expiresAt: result.receipt.expiresAt,
    ...result.value, originalLedgerUnchanged: true, providerCalls: 0, trainingTruth: false }));
  if (args.includes('--require-recoverable')) assert.equal(result.value.recovered, true, 'ACTUAL_PAID_JSON_STRUCTURAL_RECOVERY_FAILED');
} finally { db.close(); }
