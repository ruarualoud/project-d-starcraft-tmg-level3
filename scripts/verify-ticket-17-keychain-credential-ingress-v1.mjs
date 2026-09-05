#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import {
  readStarcraftTmgDeepSeekCredentialFromKeychainV1,
  STARCRAFT_TMG_DEEPSEEK_DEV_KEYCHAIN_ITEM_V1 as item,
} from "../packages/secure-provider-runtime/keychain-credential-ingress-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPORT_PATH = path.join(
  ROOT,
  "build/ticket-17-skill-generation-v1/slice-170-keychain-report.json",
);
const checks = [];
const failures = [];

function fakeOptions(overrides = {}) {
  return {
    platform: "darwin",
    statFile: async () => ({
      isFile: () => true,
      uid: 0,
      mode: 0o100755,
    }),
    readFileBytes: async () => Buffer.from("fixed-security-binary", "utf8"),
    execute: async () => Buffer.from("fixture-development-key\n", "utf8"),
    ...overrides,
  };
}

async function check(id, operation) {
  try {
    await operation();
    checks.push({ id, passed: true });
  } catch (error) {
    const message = error instanceof Error
      ? error.stack || error.message : String(error);
    checks.push({ id, passed: false, error: message });
    failures.push(`${id}: ${message}`);
  }
}

await check("keychain_read_uses_fixed_binary_and_metadata_only_arguments", async () => {
  let observed = null;
  const result = await readStarcraftTmgDeepSeekCredentialFromKeychainV1(
    item,
    fakeOptions({
      async execute(pathname, args, bounds) {
        observed = { pathname, args, bounds };
        return Buffer.from("fixture-development-key\n", "utf8");
      },
    }),
  );
  try {
    assert.equal(result.credentialBytes.toString("utf8"),
      "fixture-development-key");
    assert.deepEqual(observed.args, [
      "find-generic-password",
      "-a", item.account,
      "-s", item.service,
      "-w",
    ]);
    assert.equal(observed.pathname, "/usr/bin/security");
    assert.equal(JSON.stringify(observed).includes("fixture-development-key"),
      false);
    assert.equal(result.receipt.secretInArguments, false);
    assert.equal(result.receipt.secretInEnvironment, false);
    assert.equal(result.receipt.secretPersistedByRunner, false);
    const receipt = { ...result.receipt };
    const hash = receipt.receiptHash;
    delete receipt.receiptHash;
    assert.equal(hash, hashStarcraftTmgContract(receipt));
    assert.doesNotMatch(JSON.stringify(result.receipt),
      /fixture-development-key|\b(?:sk|jsk)-[A-Za-z0-9_-]{8,}/iu);
  } finally {
    result.credentialBytes.fill(0);
  }
});

await check("unsupported_platform_fails_before_keychain_execution", async () => {
  let calls = 0;
  await assert.rejects(readStarcraftTmgDeepSeekCredentialFromKeychainV1(
    item,
    fakeOptions({
      platform: "linux",
      async execute() { calls += 1; return Buffer.alloc(0); },
    }),
  ), (error) => error?.code === "KEYCHAIN_PLATFORM_NOT_SUPPORTED");
  assert.equal(calls, 0);
});

await check("untrusted_security_binary_fails_before_keychain_execution", async () => {
  let calls = 0;
  await assert.rejects(readStarcraftTmgDeepSeekCredentialFromKeychainV1(
    item,
    fakeOptions({
      statFile: async () => ({
        isFile: () => true,
        uid: 501,
        mode: 0o100777,
      }),
      async execute() { calls += 1; return Buffer.alloc(0); },
    }),
  ), (error) => (
    error?.code === "KEYCHAIN_SECURITY_BINARY_ATTESTATION_FAILED"
  ));
  assert.equal(calls, 0);
});

await check("missing_keychain_item_returns_only_a_safe_error_code", async () => {
  await assert.rejects(readStarcraftTmgDeepSeekCredentialFromKeychainV1(
    item,
    fakeOptions({
      async execute() {
        const error = new Error("security: SecKeychainSearchCopyNext: item not found");
        error.stderr = "provider-key-would-be-unsafe-here";
        throw error;
      },
    }),
  ), (error) => (
    error?.code === "KEYCHAIN_ITEM_READ_FAILED"
      && error.message === "KEYCHAIN_ITEM_READ_FAILED"
  ));
});

await check("invalid_or_oversized_secret_bytes_are_zeroed_and_rejected", async () => {
  const invalid = Buffer.from("contains space", "utf8");
  await assert.rejects(readStarcraftTmgDeepSeekCredentialFromKeychainV1(
    item,
    fakeOptions({ execute: async () => invalid }),
  ), (error) => error?.code === "KEYCHAIN_CREDENTIAL_BYTES_INVALID");
  assert(invalid.every((byte) => byte === 0));

  const oversized = Buffer.alloc(8_195, 0x61);
  await assert.rejects(readStarcraftTmgDeepSeekCredentialFromKeychainV1(
    item,
    fakeOptions({ execute: async () => oversized }),
  ), (error) => error?.code === "KEYCHAIN_CREDENTIAL_OUTPUT_INVALID");
  assert(oversized.every((byte) => byte === 0));
});

await check("one_time_wizard_delegates_hidden_input_to_macos_keychain", async () => {
  const source = await readFile(path.join(
    ROOT,
    "scripts/setup-ticket-17-deepseek-keychain-v1.sh",
  ), "utf8");
  const stages = source.slice(source.indexOf("# STAGES:"));
  assert(stages.includes("TOTAL_STAGES=3"));
  assert(stages.includes("https://platform.deepseek.com/api_keys"));
  assert(stages.includes("/usr/bin/security add-generic-password"));
  assert(stages.includes("-T /usr/bin/security -w"));
  assert(!stages.includes("ask_secret "));
  assert(!stages.includes("write_env "));
  assert(!stages.includes("process.env"));
  assert(!stages.includes("sk-"));
  assert(!stages.includes("jsk-"));
});

const reportBody = {
  schemaVersion: "starcraft_tmg_ticket_17_slice_170_keychain_report_v1",
  ticket: 17,
  slice: 170,
  status: failures.length === 0 ? "passed" : "failed",
  generatedAt: "2026-09-04T20:00:00.000Z",
  assertionsPassed: checks.filter((row) => row.passed).length,
  assertionsTotal: checks.length,
  checks,
  ingressKind: "macos_login_keychain_generic_password",
  environmentCredentialAllowed: false,
  argumentCredentialAllowed: false,
  repositoryCredentialAllowed: false,
  chatCredentialAllowed: false,
  externalProviderCalls: 0,
  externalBillableTokens: 0,
  trainingTruth: false,
};
const report = {
  ...reportBody,
  reportHash: hashStarcraftTmgContract(reportBody),
};
await mkdir(path.dirname(REPORT_PATH), { recursive: true });
await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
if (failures.length > 0) process.exitCode = 1;
