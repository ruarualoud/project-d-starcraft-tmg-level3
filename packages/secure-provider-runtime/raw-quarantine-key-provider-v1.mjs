import { execFile } from 'node:child_process';
import { readFile, lstat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { seal, verifySeal, sha256, fail } from '../skill-production/common.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const RAW_QUARANTINE_KEY_REF_V1 = seal({ version: 'os_raw_quarantine_key_ref_v1',
  facility: 'macos_keychain_generic_password', service: 'com.project-d.starcraft-tmg.raw-quarantine',
  account: 'raw-quarantine-key-v1', algorithm: 'aes-256-gcm', bytes: 32,
  independentOfProviderCredentials: true });

function execute(helperPath, mode) {
  return new Promise((resolve, reject) => {
    execFile(helperPath, [mode], { encoding: 'buffer', env: {}, shell: false,
      timeout: 30_000, maxBuffer: 256, windowsHide: true }, (error, stdout, stderr) => {
      stderr?.fill(0);
      if (error || !Buffer.isBuffer(stdout) || stdout.length !== 33 || stdout[0] > 1) {
        stdout?.fill(0); reject(Object.assign(new Error('RAW_KEY_HELPER_FAILED'), { code: 'RAW_KEY_HELPER_FAILED' })); return;
      }
      resolve(stdout);
    });
  });
}

export async function createMacOsRawQuarantineKeyProviderV1({ helperPath, helperHash }) {
  if (process.platform !== 'darwin' || !/^[a-f0-9]{64}$/u.test(helperHash || '')) fail('RAW_KEY_PROVIDER_PLATFORM_OR_HASH');
  helperPath = path.resolve(helperPath);
  const relative = path.relative(projectRoot, helperPath);
  if (!relative.startsWith('build' + path.sep) || relative.split(path.sep).includes('..')) fail('RAW_KEY_HELPER_SCOPE');
  async function attest() {
    let current = projectRoot;
    for (const part of relative.split(path.sep)) {
      current = path.join(current, part);
      const info = await lstat(current);
      if (info.isSymbolicLink()) fail('RAW_KEY_HELPER_UNSAFE');
    }
    const info = await lstat(helperPath);
    if (!info.isFile() || info.uid !== process.getuid() || info.nlink !== 1 || (info.mode & 0o022) !== 0
      || sha256(await readFile(helperPath)) !== helperHash) fail('RAW_KEY_HELPER_ATTESTATION_FAILED');
  }
  await attest();
  async function invoke(mode, consumer) {
    await attest();
    const bytes = await execute(helperPath, mode);
    try { return await consumer(bytes.subarray(1)); }
    finally { bytes.fill(0); }
  }
  return Object.freeze({
    metadata: () => seal({ version: 'macos_raw_quarantine_key_provider_v1', keyRef: RAW_QUARANTINE_KEY_REF_V1,
      helperHash, keyStorage: 'os_credential_facility', keyIndependentOfByok: true,
      secretInArguments: false, secretInEnvironment: false, keyPersistedInRepository: false,
      secretLogged: false, trainingTruth: false }),
    async ensureKey() { await invoke('ensure', () => undefined); return RAW_QUARANTINE_KEY_REF_V1; },
    async withKey(ref, consumer) {
      if (verifySeal(ref).hash !== RAW_QUARANTINE_KEY_REF_V1.hash || typeof consumer !== 'function')
        fail('RAW_KEY_REFERENCE_INVALID');
      return invoke('read', consumer);
    },
  });
}
