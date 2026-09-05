import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";

export const STARCRAFT_TMG_KEYCHAIN_CREDENTIAL_INGRESS_VERSION =
  "starcraft_tmg_keychain_credential_ingress_v1";
export const STARCRAFT_TMG_DEEPSEEK_DEV_KEYCHAIN_ITEM_V1 = Object.freeze({
  service: "com.project-d.starcraft-tmg.deepseek.dev",
  account: "project-d-starcraft-tmg-dev",
});

const SECURITY_PATH = "/usr/bin/security";
const ITEM = /^[A-Za-z0-9._:-]{4,200}$/u;

function safeItem(value, field) {
  const normalized = String(value || "");
  if (!ITEM.test(normalized)) throw new TypeError(`${field} is invalid`);
  return normalized;
}

function safeFailure(code, cause) {
  const error = new Error(code);
  error.code = code;
  if (cause) error.cause = cause;
  return error;
}

function defaultExecute(pathname, args, options) {
  return new Promise((resolve, reject) => {
    execFile(pathname, args, {
      encoding: "buffer",
      env: {},
      maxBuffer: options.maxOutputBytes,
      timeout: options.timeoutMs,
      windowsHide: true,
      shell: false,
    }, (error, stdout) => {
      if (error) {
        if (Buffer.isBuffer(stdout)) stdout.fill(0);
        reject(error);
        return;
      }
      resolve(Buffer.isBuffer(stdout) ? stdout : Buffer.from(stdout || ""));
    });
  });
}

async function attestSecurityBinary(options) {
  const pathname = options.securityPath || SECURITY_PATH;
  if (pathname !== SECURITY_PATH) {
    throw safeFailure("KEYCHAIN_SECURITY_BINARY_PATH_REJECTED");
  }
  const [metadata, bytes] = await Promise.all([
    options.statFile(pathname),
    options.readFileBytes(pathname),
  ]);
  try {
    if (!metadata.isFile() || metadata.uid !== 0
      || (metadata.mode & 0o022) !== 0) {
      throw safeFailure("KEYCHAIN_SECURITY_BINARY_ATTESTATION_FAILED");
    }
    return Object.freeze({
      pathname,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      ownerUid: metadata.uid,
      groupOrWorldWritable: false,
    });
  } finally {
    bytes.fill(0);
  }
}

export async function readStarcraftTmgDeepSeekCredentialFromKeychainV1(
  item = STARCRAFT_TMG_DEEPSEEK_DEV_KEYCHAIN_ITEM_V1,
  options = {},
) {
  const platform = options.platform || process.platform;
  if (platform !== "darwin") {
    throw safeFailure("KEYCHAIN_PLATFORM_NOT_SUPPORTED");
  }
  const service = safeItem(item?.service, "keychain service");
  const account = safeItem(item?.account, "keychain account");
  const dependencies = {
    securityPath: options.securityPath || SECURITY_PATH,
    statFile: options.statFile || stat,
    readFileBytes: options.readFileBytes || readFile,
  };
  const timeoutMs = Number(options.timeoutMs || 30_000);
  const maxOutputBytes = Number(options.maxOutputBytes || 8_194);
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1_000
    || timeoutMs > 120_000
    || !Number.isSafeInteger(maxOutputBytes) || maxOutputBytes < 10
    || maxOutputBytes > 65_536) {
    throw new TypeError("keychain read bounds are invalid");
  }
  const binary = await attestSecurityBinary(dependencies).catch((error) => {
    if (error?.code) throw error;
    throw safeFailure("KEYCHAIN_SECURITY_BINARY_ATTESTATION_FAILED", error);
  });
  const execute = options.execute || defaultExecute;
  let stdout = null;
  try {
    stdout = await execute(binary.pathname, [
      "find-generic-password",
      "-a", account,
      "-s", service,
      "-w",
    ], { timeoutMs, maxOutputBytes });
    if (!Buffer.isBuffer(stdout) || stdout.byteLength > maxOutputBytes) {
      throw safeFailure("KEYCHAIN_CREDENTIAL_OUTPUT_INVALID");
    }
    let end = stdout.byteLength;
    while (end > 0 && (stdout[end - 1] === 0x0a || stdout[end - 1] === 0x0d)) {
      end -= 1;
    }
    const credentialBytes = Buffer.from(stdout.subarray(0, end));
    if (credentialBytes.byteLength < 8 || credentialBytes.byteLength > 8_192
      || !credentialBytes.every((byte) => byte >= 0x21 && byte <= 0x7e)) {
      credentialBytes.fill(0);
      throw safeFailure("KEYCHAIN_CREDENTIAL_BYTES_INVALID");
    }
    const receiptBody = {
      schemaVersion: `${STARCRAFT_TMG_KEYCHAIN_CREDENTIAL_INGRESS_VERSION}.receipt`,
      ingressKind: "macos_login_keychain_generic_password",
      service,
      account,
      securityBinarySha256: binary.sha256,
      shellUsed: false,
      environmentInherited: false,
      secretInArguments: false,
      secretInEnvironment: false,
      secretPersistedByRunner: false,
      trainingTruth: false,
    };
    return Object.freeze({
      credentialBytes,
      receipt: Object.freeze({
        ...receiptBody,
        receiptHash: hashStarcraftTmgContract(receiptBody),
      }),
    });
  } catch (error) {
    if (error?.code?.startsWith?.("KEYCHAIN_")) throw error;
    throw safeFailure("KEYCHAIN_ITEM_READ_FAILED", error);
  } finally {
    stdout?.fill(0);
  }
}
