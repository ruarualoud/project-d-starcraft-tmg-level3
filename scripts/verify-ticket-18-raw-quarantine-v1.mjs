import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, mkdtemp, readFile, writeFile, readdir, stat, chmod, symlink } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { hash, seal, verifySeal, sha256 } from '../packages/skill-production/common.mjs';
import { createEncryptedRawQuarantineV1 } from '../packages/structured-generation/encrypted-raw-quarantine-v1.mjs';
import { createMacOsRawQuarantineKeyProviderV1, RAW_QUARANTINE_KEY_REF_V1 } from '../packages/secure-provider-runtime/raw-quarantine-key-provider-v1.mjs';

const exec = promisify(execFile), base = 'build/ticket-18-faction-production-v1/';
const db = new DatabaseSync('build/ticket-17-production-redesign-v1/production.sqlite', { readOnly: true });
try { assert.equal(db.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n, 0); }
finally { db.close(); }
const helperDirectory = path.resolve(base, 'raw-quarantine-key-helper-v1');
await mkdir(helperDirectory, { recursive: true, mode: 0o700 });
const source = 'scripts/support/raw-quarantine-keychain-v1.swift', sourceHash = sha256(await readFile(source));
const helperPath = path.join(helperDirectory, 'raw-quarantine-keychain-v1');
let manifest;
try { manifest = verifySeal(JSON.parse(await readFile(path.join(helperDirectory, 'manifest.json'), 'utf8'))); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
if (!manifest || manifest.sourceHash !== sourceHash || sha256(await readFile(helperPath)) !== manifest.helperHash) {
  const cache = path.join(helperDirectory, 'module-cache'); await mkdir(cache, { recursive: true, mode: 0o700 });
  await exec('/usr/bin/xcrun', ['swiftc', '-module-cache-path', cache, source, '-o', helperPath],
    { env: { PATH: '/usr/bin:/bin' }, timeout: 120_000, maxBuffer: 1024 * 1024 });
  manifest = seal({ version: 'raw_quarantine_helper_build_v1', sourceHash, helperHash: sha256(await readFile(helperPath)) });
  await writeFile(path.join(helperDirectory, 'manifest.json'), JSON.stringify(manifest, null, 2));
}
const keyProvider = await createMacOsRawQuarantineKeyProviderV1({ helperPath, helperHash: manifest.helperHash });
const directory = await mkdtemp(path.join(base, 'raw-quarantine-test-'));
let now = Date.parse('2026-09-08T08:00:00.000Z'), checks = 0;
const check = async (label, fn) => { await fn(); checks++; };
const make = async (dir = directory, clock = () => now, provider = keyProvider) =>
  createEncryptedRawQuarantineV1({ directory: dir, keyProvider: provider, now: clock });
const store = await make();
const text = '{"private_test":"' + randomUUID() + '","bad":"unescaped "quote"\n中文"}';
const invocationHash = hash('injected-wire-invocation');
const binding = { runId: 'quarantine-fixture-v1', attemptId: 'structured-' + invocationHash.slice(0, 48), invocationHash,
  contextHash: hash('full-context'), outputContractHash: hash('contract'), providerProfileHash: hash('provider'),
  failureReceiptHash: hash('injected-failure-receipt'), outputTextHash: hash(text) };
let receipt, exposedBuffer, access;
await check('real OS keychain key is separate from BYOK', async () => {
  const ref = await keyProvider.ensureKey(); assert.equal(ref.hash, RAW_QUARANTINE_KEY_REF_V1.hash);
  assert(keyProvider.metadata().keyIndependentOfByok);
});
await check('persist authenticated ciphertext, never plaintext', async () => {
  receipt = await store.persist({ text, binding, retentionMs: 60_000 });
  const encoded = await readFile(path.join(directory, receipt.recordId + '.json'), 'utf8');
  assert(!encoded.includes(text)); assert(!encoded.includes('private_test'));
  assert.equal((await stat(path.join(directory, receipt.recordId + '.json'))).mode & 0o777, 0o600);
});
await check('real keychain decrypt plus access receipt preserves malformed text exactly', async () => {
  await store.consume({ receipt, binding, purpose: 'quarantine_regression', consumer: (bytes, logged) => {
    assert.equal(bytes.toString('utf8'), text); exposedBuffer = bytes; access = logged;
  } });
  assert(exposedBuffer.every(n => n === 0));
  const logged = verifySeal(JSON.parse(await readFile(path.join(directory, 'access-' + access.accessId + '.json'), 'utf8')));
  assert.equal(logged.hash, access.hash);
});
await check('fresh provider and store recover after restart without plaintext cache', async () => {
  const secondKey = await createMacOsRawQuarantineKeyProviderV1({ helperPath, helperHash: manifest.helperHash });
  const restarted = await make(directory, () => now, secondKey);
  await restarted.consume({ receipt, binding, purpose: 'payload_recovery', consumer: bytes => assert.equal(hash(bytes.toString('utf8')), binding.outputTextHash) });
});
await check('duplicate persistence retains original ciphertext and expiry', async () => {
  now += 10_000;
  assert.equal((await store.persist({ text, binding, retentionMs: 100_000 })).hash, receipt.hash);
});
for (const field of ['runId', 'invocationHash', 'contextHash', 'outputContractHash', 'providerProfileHash', 'failureReceiptHash', 'outputTextHash'])
  await check('wrong binding refuses: ' + field, async () => {
    const changed = { ...binding, [field]: field === 'runId' ? 'other-run-v1' : hash('other') };
    await assert.rejects(store.consume({ receipt, binding: changed, purpose: 'payload_recovery', consumer: () => assert.fail('exposed') }));
  });
await check('arbitrary read purposes refuse', () => assert.rejects(store.consume({ receipt, binding, purpose: 'print_raw', consumer: () => assert.fail('exposed') })));
await check('bad input hash refuses before encryption', () => assert.rejects(store.persist({ text: text + 'changed', binding })));
await check('expired records cannot be read or renewed', async () => {
  const expired = await make(directory, () => now + 60_000);
  await assert.rejects(expired.consume({ receipt, binding, purpose: 'payload_recovery', consumer: () => assert.fail('exposed') }), { code: 'RAW_QUARANTINE_EXPIRED' });
  await assert.rejects(expired.persist({ text, binding }), { code: 'RAW_QUARANTINE_EXPIRED' });
});
await check('clock regression refuses', async () => {
  const early = await make(directory, () => now - 20_000);
  await assert.rejects(early.consume({ receipt, binding, purpose: 'payload_recovery', consumer: () => assert.fail('exposed') }), { code: 'RAW_QUARANTINE_CLOCK_REGRESSION' });
});
await check('ciphertext edits fail authentication even when outer hashes are recomputed', async () => {
  const cloneDir = await mkdtemp(path.join(base, 'raw-quarantine-tamper-'));
  const { hash: ignored, ...record } = verifySeal(JSON.parse(await readFile(path.join(directory, receipt.recordId + '.json'), 'utf8')));
  const bytes = Buffer.from(record.ciphertext, 'base64'); bytes[0] ^= 1; record.ciphertext = bytes.toString('base64');
  const changed = seal(record); await writeFile(path.join(cloneDir, receipt.recordId + '.json'), JSON.stringify(changed), { mode: 0o600 });
  const { hash: unused, ...r } = receipt; const alteredReceipt = seal({ ...r, recordHash: changed.hash });
  await assert.rejects((await make(cloneDir)).consume({ receipt: alteredReceipt, binding, purpose: 'payload_recovery', consumer: () => assert.fail('exposed') }),
    { code: 'RAW_QUARANTINE_DECRYPT_FAILED' });
  await assert.rejects((await make(cloneDir)).persist({ text, binding }), { code: 'RAW_QUARANTINE_DECRYPT_FAILED' });
});
await check('domain failures are not relabeled as decryption errors and plaintext is wiped', async () => {
  let exposed;
  await assert.rejects(store.consume({ receipt, binding, purpose: 'payload_recovery', consumer: bytes => {
    exposed = bytes; throw Object.assign(new Error('INJECTED_DOMAIN_REJECTION'), { code: 'INJECTED_DOMAIN_REJECTION' });
  } }), { code: 'INJECTED_DOMAIN_REJECTION' });
  assert(exposed.every(n => n === 0));
});
await check('unsafe file permissions refuse', async () => {
  const cloneDir = await mkdtemp(path.join(base, 'raw-quarantine-mode-'));
  const filename = path.join(cloneDir, receipt.recordId + '.json');
  await writeFile(filename, await readFile(path.join(directory, receipt.recordId + '.json')), { mode: 0o600 });
  await chmod(filename, 0o644);
  await assert.rejects((await make(cloneDir)).consume({ receipt, binding, purpose: 'payload_recovery', consumer: () => assert.fail('exposed') }),
    { code: 'RAW_QUARANTINE_FILE_UNSAFE' });
});
await check('symlinked ciphertext refuses', async () => {
  const cloneDir = await mkdtemp(path.join(base, 'raw-quarantine-link-'));
  await symlink(path.resolve(directory, receipt.recordId + '.json'), path.join(cloneDir, receipt.recordId + '.json'));
  await assert.rejects((await make(cloneDir)).consume({ receipt, binding, purpose: 'payload_recovery', consumer: () => assert.fail('exposed') }));
});
await check('helper binary hash drift refuses before key read', () => assert.rejects(createMacOsRawQuarantineKeyProviderV1({ helperPath, helperHash: hash('wrong') })));
const files = ['packages/structured-generation/encrypted-raw-quarantine-v1.mjs',
  'packages/secure-provider-runtime/raw-quarantine-key-provider-v1.mjs',
  'scripts/support/raw-quarantine-keychain-v1.swift', 'scripts/verify-ticket-18-raw-quarantine-v1.mjs'];
const report = seal({ version: 'encrypted_raw_quarantine_component_readiness_v1', passed: true, checks,
  actualOsKeychainUsed: true, keyProvider: keyProvider.metadata(), helperBuild: manifest,
  fixtureDirectory: directory, quarantineReceiptHash: receipt.hash,
  accessReceipts: (await readdir(directory)).filter(name => name.startsWith('access-')).length,
  allPayloadsInjected: true, actualLostProviderPayloadRecovered: false, providerCalls: 0,
  formalProductionWired: false, plaintextLogged: false, trainingTruth: false,
  codeHashes: await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) }))) });
await writeFile(base + 'raw-quarantine-component-readiness-v1.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks, actualOsKeychainUsed: true, providerCalls: 0,
  formalProductionWired: false, hash: report.hash }));
