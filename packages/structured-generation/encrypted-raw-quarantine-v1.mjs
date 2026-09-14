import { createCipheriv, createDecipheriv, randomBytes, randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import { mkdir, lstat, open } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hash, seal, verifySeal, fail } from '../skill-production/common.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const HASH = /^[a-f0-9]{64}$/u;
const BINDING_KEYS = ['runId', 'attemptId', 'invocationHash', 'contextHash', 'outputContractHash',
  'providerProfileHash', 'failureReceiptHash', 'outputTextHash'];
const DAY = 86_400_000;
export const RAW_QUARANTINE_POLICY_V1 = seal({ version: 'encrypted_raw_quarantine_v1',
  algorithm: 'aes-256-gcm', rawEncoding: 'utf8_exact_roundtrip', maximumRawBytes: 2 * 1024 * 1024,
  maximumRetentionMs: 7 * DAY, keyStorage: 'os_credential_facility', keyIndependentOfByok: true,
  plaintextInLogs: false, plaintextInGit: false, originalProviderFailureImmutable: true,
  expiredReadAllowed: false, accessReceiptRequiredBeforeConsumer: true,
  semanticAcceptanceInherited: false, trainingTruth: false });

function validateBinding(binding) {
  if (!binding || Object.keys(binding).length !== BINDING_KEYS.length
    || BINDING_KEYS.some(key => !Object.hasOwn(binding, key))
    || !/^[a-z0-9][a-z0-9._:-]{5,150}$/u.test(binding.runId)
    || !/^structured-[a-f0-9]{48}$/u.test(binding.attemptId)
    || BINDING_KEYS.slice(2).some(key => !HASH.test(binding[key]))
    || binding.attemptId !== 'structured-' + binding.invocationHash.slice(0, 48))
    fail('RAW_QUARANTINE_BINDING_INVALID');
}
function time(value) {
  const n = typeof value === 'number' ? value : Date.parse(value);
  if (!Number.isSafeInteger(n) || n < 0) fail('RAW_QUARANTINE_TIME_INVALID');
  return n;
}
async function secureDirectory(directory) {
  const relative = path.relative(projectRoot, directory);
  if (!relative.startsWith('build' + path.sep) || relative.split(path.sep).includes('..'))
    fail('RAW_QUARANTINE_DIRECTORY_SCOPE');
  let current = projectRoot;
  for (const segment of relative.split(path.sep)) {
    current = path.join(current, segment);
    try { await mkdir(current, { mode: 0o700 }); }
    catch (error) { if (error.code !== 'EEXIST') throw error; }
    const info = await lstat(current);
    if (!info.isDirectory() || info.isSymbolicLink()) fail('RAW_QUARANTINE_DIRECTORY_UNSAFE');
  }
  const info = await lstat(directory);
  if ((info.mode & 0o077) !== 0 || info.uid !== process.getuid()) fail('RAW_QUARANTINE_DIRECTORY_UNSAFE');
}
async function readPrivate(file) {
  const handle = await open(file, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const info = await handle.stat();
    if (!info.isFile() || info.nlink !== 1 || info.uid !== process.getuid()
      || (info.mode & 0o077) !== 0 || info.size > 4 * 1024 * 1024) fail('RAW_QUARANTINE_FILE_UNSAFE');
    return verifySeal(JSON.parse(await handle.readFile('utf8')));
  } finally { await handle.close(); }
}
async function writePrivate(file, value) {
  const handle = await open(file, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
  try { await handle.writeFile(JSON.stringify(value)); await handle.sync(); }
  finally { await handle.close(); }
}
function receiptFor(record) {
  return seal({ version: 'encrypted_raw_quarantine_receipt_v1', recordId: record.recordId,
    recordHash: record.hash, bindingHash: hash(record.header.binding), payloadHash: record.header.payloadHash,
    keyRef: record.header.keyRef, createdAt: record.header.createdAt, expiresAt: record.header.expiresAt,
    rawBytes: record.header.rawBytes, ciphertextBytes: Buffer.from(record.ciphertext, 'base64').length,
    policyHash: RAW_QUARANTINE_POLICY_V1.hash, plaintextPersisted: false, trainingTruth: false });
}

export async function createEncryptedRawQuarantineV1({ directory, keyProvider, now = Date.now }) {
  if (!directory || typeof keyProvider?.ensureKey !== 'function' || typeof keyProvider?.withKey !== 'function'
    || typeof keyProvider?.metadata !== 'function') fail('RAW_QUARANTINE_DEPENDENCIES_INVALID');
  directory = path.resolve(directory); await secureDirectory(directory);
  const keyMetadata = keyProvider.metadata(); verifySeal(keyMetadata);
  if (keyMetadata.keyStorage !== 'os_credential_facility' || keyMetadata.keyIndependentOfByok !== true)
    fail('RAW_QUARANTINE_KEY_POLICY_INVALID');
  const fileFor = id => {
    if (!HASH.test(id)) fail('RAW_QUARANTINE_RECORD_ID_INVALID');
    return path.join(directory, id + '.json');
  };
  async function load(receipt, binding) {
    validateBinding(binding); verifySeal(receipt);
    await secureDirectory(directory);
    if (receipt.version !== 'encrypted_raw_quarantine_receipt_v1'
      || receipt.policyHash !== RAW_QUARANTINE_POLICY_V1.hash || receipt.bindingHash !== hash(binding))
      fail('RAW_QUARANTINE_RECEIPT_BINDING_INVALID');
    const record = await readPrivate(fileFor(receipt.recordId));
    if (record.version !== 'encrypted_raw_quarantine_record_v1' || record.hash !== receipt.recordHash
      || hash(receiptFor(record)) !== hash(receipt) || hash(record.header.binding) !== hash(binding)
      || record.header.payloadHash !== binding.outputTextHash || record.header.algorithm !== 'aes-256-gcm'
      || record.header.policyHash !== RAW_QUARANTINE_POLICY_V1.hash)
      fail('RAW_QUARANTINE_RECORD_BINDING_INVALID');
    if (time(now()) >= time(record.header.expiresAt)) fail('RAW_QUARANTINE_EXPIRED');
    if (time(now()) < time(record.header.createdAt)) fail('RAW_QUARANTINE_CLOCK_REGRESSION');
    return record;
  }
  async function persist({ text, binding, retentionMs = DAY }) {
    validateBinding(binding);
    if (typeof text !== 'string' || !text.length || hash(text) !== binding.outputTextHash
      || !Number.isSafeInteger(retentionMs) || retentionMs < 1 || retentionMs > RAW_QUARANTINE_POLICY_V1.maximumRetentionMs)
      fail('RAW_QUARANTINE_PAYLOAD_INVALID');
    const raw = Buffer.from(text, 'utf8');
    try {
      if (raw.length > RAW_QUARANTINE_POLICY_V1.maximumRawBytes || raw.toString('utf8') !== text)
        fail('RAW_QUARANTINE_PAYLOAD_INVALID');
      const recordId = hash({ bindingHash: hash(binding), payloadHash: binding.outputTextHash });
      try {
        const existing = await readPrivate(fileFor(recordId)), receipt = receiptFor(existing);
        await consume({ receipt, binding, purpose: 'idempotent_write_validation', consumer: () => undefined });
        return receipt; // Never renew retention on restart.
      } catch (error) { if (error.code !== 'ENOENT') throw error; }
      const keyRef = await keyProvider.ensureKey(); verifySeal(keyRef);
      const created = time(now());
      const header = { algorithm: 'aes-256-gcm', policyHash: RAW_QUARANTINE_POLICY_V1.hash,
        binding: structuredClone(binding), keyRef, payloadHash: binding.outputTextHash, rawBytes: raw.length,
        createdAt: new Date(created).toISOString(), expiresAt: new Date(created + retentionMs).toISOString() };
      const nonce = randomBytes(12);
      const encrypted = await keyProvider.withKey(keyRef, key => {
        if (!Buffer.isBuffer(key) || key.length !== 32) fail('RAW_QUARANTINE_KEY_INVALID');
        const cipher = createCipheriv('aes-256-gcm', key, nonce); cipher.setAAD(Buffer.from(hash(header), 'hex'));
        return { ciphertext: Buffer.concat([cipher.update(raw), cipher.final()]).toString('base64'),
          authenticationTag: cipher.getAuthTag().toString('base64') };
      });
      const record = seal({ version: 'encrypted_raw_quarantine_record_v1', recordId, header,
        nonce: nonce.toString('base64'), ...encrypted, trainingTruth: false });
      try { await writePrivate(fileFor(recordId), record); }
      catch (error) {
        if (error.code !== 'EEXIST') throw error;
        const existing = await readPrivate(fileFor(recordId)), receipt = receiptFor(existing);
        await consume({ receipt, binding, purpose: 'idempotent_write_validation', consumer: () => undefined });
        return receipt;
      }
      return receiptFor(record);
    } finally { raw.fill(0); }
  }
  async function consume({ receipt, binding, purpose, consumer }) {
    if (!['payload_recovery', 'quarantine_regression', 'idempotent_write_validation'].includes(purpose) || typeof consumer !== 'function')
      fail('RAW_QUARANTINE_ACCESS_PURPOSE_INVALID');
    const record = await load(receipt, binding);
    return keyProvider.withKey(record.header.keyRef, async key => {
      if (!Buffer.isBuffer(key) || key.length !== 32) fail('RAW_QUARANTINE_KEY_INVALID');
      let plaintext, first, last;
      try {
        const nonce = Buffer.from(record.nonce, 'base64'), tag = Buffer.from(record.authenticationTag, 'base64');
        if (nonce.length !== 12 || tag.length !== 16) fail('RAW_QUARANTINE_CIPHERTEXT_INVALID');
        const decipher = createDecipheriv('aes-256-gcm', key, nonce);
        decipher.setAAD(Buffer.from(hash(record.header), 'hex')); decipher.setAuthTag(tag);
        first = decipher.update(Buffer.from(record.ciphertext, 'base64')); last = decipher.final();
        plaintext = Buffer.concat([first, last]);
      } catch (error) {
        if (error.code?.startsWith('RAW_QUARANTINE_')) throw error;
        fail('RAW_QUARANTINE_DECRYPT_FAILED');
      } finally { first?.fill(0); last?.fill(0); }
      try {
        if (plaintext.length !== record.header.rawBytes || hash(plaintext.toString('utf8')) !== binding.outputTextHash)
          fail('RAW_QUARANTINE_PLAINTEXT_HASH_INVALID');
        const accessReceipt = seal({ version: 'encrypted_raw_quarantine_access_v1', accessId: randomUUID(),
          quarantineReceiptHash: receipt.hash, recordHash: record.hash, bindingHash: hash(binding),
          purpose, accessedAt: new Date(time(now())).toISOString(), plaintextLogged: false, trainingTruth: false });
        try { await writePrivate(path.join(directory, 'access-' + accessReceipt.accessId + '.json'), accessReceipt); }
        catch { fail('RAW_QUARANTINE_ACCESS_LOG_WRITE_FAILED'); }
        return await consumer(plaintext, accessReceipt);
      } finally { plaintext?.fill(0); }
    });
  }
  // Recover the receipt after a crash between ciphertext persistence and the
  // caller's journal write. A filename or outer hash alone is not proof: the
  // record is decrypted/authenticated and access logged before returning it.
  async function locate(binding, consumer = null) {
    validateBinding(binding); await secureDirectory(directory);
    const recordId = hash({ bindingHash: hash(binding), payloadHash: binding.outputTextHash });
    const record = await readPrivate(fileFor(recordId)), receipt = receiptFor(record);
    let accessReceipt;
    const value = await consume({ receipt, binding, purpose: 'payload_recovery', consumer: (raw, access) => {
      accessReceipt = access;
      return consumer ? consumer(raw, access, receipt) : undefined;
    } });
    return { receipt, accessReceipt, ...(consumer ? { value } : {}) };
  }
  return Object.freeze({ persist, consume, locate, policy: RAW_QUARANTINE_POLICY_V1 });
}
