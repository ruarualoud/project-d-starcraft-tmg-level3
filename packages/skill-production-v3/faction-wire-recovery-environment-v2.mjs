import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fail, seal, hash, sha256, verifySeal } from '../skill-production/common.mjs';
import { createMacOsRawQuarantineKeyProviderV1 } from '../secure-provider-runtime/raw-quarantine-key-provider-v1.mjs';
import { createEncryptedRawQuarantineV1 } from '../structured-generation/encrypted-raw-quarantine-v1.mjs';
import { createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV2 } from '../structured-generation/adapters/deepseek-responses-json-schema-v2.mjs';
import { STRUCTURED_WIRE_RUNTIME_BINDING_V2 } from '../structured-generation/structured-generation-runtime-v2.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const helperDirectory = path.join(root, 'build/ticket-18-faction-production-v1/raw-quarantine-key-helper-v1');

export async function inspectFactionWireKeyHelperV2() {
  const manifest = verifySeal(JSON.parse(await readFile(path.join(helperDirectory, 'manifest.json'), 'utf8')));
  if (manifest.sourceHash !== sha256(await readFile(path.join(root, 'scripts/support/raw-quarantine-keychain-v1.swift')))
    || manifest.helperHash !== sha256(await readFile(path.join(helperDirectory, 'raw-quarantine-keychain-v1'))))
    fail('FACTION_WIRE_HELPER_MANIFEST_DRIFT');
  // Public evidence only. No Keychain read or key locator in the recipe.
  return seal({ version: 'faction_wire_key_helper_ref_v2', manifestHash: manifest.hash,
    sourceHash: manifest.sourceHash, helperHash: manifest.helperHash, trainingTruth: false });
}

export async function createFactionWireRecoveryEnvironmentV2({ filename, runId, helperRef, providers, now }) {
  if (!/^faction-v1-[a-f0-9]{20}$/u.test(runId || '') || !Array.isArray(providers) || !providers.length)
    fail('FACTION_WIRE_ENVIRONMENT_SCOPE_INVALID');
  if (verifySeal(helperRef).hash !== (await inspectFactionWireKeyHelperV2()).hash) fail('FACTION_WIRE_HELPER_REF_DRIFT');
  const relative = path.relative(root, path.resolve(filename));
  if (!relative.startsWith('build' + path.sep) || relative.split(path.sep).includes('..'))
    fail('FACTION_WIRE_JOURNAL_SCOPE_INVALID');
  const readAttempt = id => {
    if (!/^structured-[a-f0-9]{48}$/u.test(id)) fail('FACTION_WIRE_ATTEMPT_ID_INVALID');
    const db = new DatabaseSync(filename, { readOnly: true });
    try {
      if (db.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n)
        fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
      return db.prepare('SELECT * FROM attempts WHERE run=? AND id=?').get(runId, id);
    } finally { db.close(); }
  };
  const keyProvider = await createMacOsRawQuarantineKeyProviderV1({
    helperPath: path.join(helperDirectory, 'raw-quarantine-keychain-v1'), helperHash: helperRef.helperHash });
  const quarantine = await createEncryptedRawQuarantineV1({
    directory: path.join(root, 'build/ticket-18-faction-production-v1', runId, 'encrypted-wire-v2'), keyProvider });
  const adapters = new Map();
  for (const p of providers) {
    const identity = p.egressBinding?.providerProfileRef?.hash;
    if (!/^[a-f0-9]{64}$/u.test(identity || '') || typeof p.send !== 'function' || adapters.has(identity))
      fail('FACTION_WIRE_PROVIDER_BINDING_INVALID');
    adapters.set(identity, createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV2({ send: p.send, quarantine, ...(now ? { now } : {}) }));
  }
  return Object.freeze({ binding: STRUCTURED_WIRE_RUNTIME_BINDING_V2, runId, helperRef, quarantine, adapters, readAttempt,
    metadata: seal({ version: 'faction_wire_recovery_environment_v2', bindingHash: STRUCTURED_WIRE_RUNTIME_BINDING_V2.hash,
      helperRefHash: helperRef.hash, providerProfileHashes: [...adapters.keys()], journalScopeHash: hash({ runId, filename: relative }),
      plaintextPersisted: false, trainingTruth: false }) });
}
