#!/usr/bin/env node

import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/transition-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BUILD_ROOT = path.join(ROOT, "build/ticket-14-slice-136-web-static-v1");
const RECEIPT_PATH = path.join(BUILD_ROOT, "production-build-receipt.json");
const REPORT_PATH = path.join(BUILD_ROOT, "production-reproducibility-report.json");
const baselineIndex = process.argv.indexOf("--baseline-receipt");
const suppliedBaseline = baselineIndex >= 0 ? process.argv[baselineIndex + 1] : null;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: ROOT, stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`REPRODUCIBILITY_BUILD_FAILED:${code ?? signal ?? "unknown"}`));
    });
  });
}

async function readReceipt(filename) {
  const receipt = JSON.parse(await readFile(filename, "utf8"));
  assert(receipt.mode === "production", "REPRODUCIBILITY_RECEIPT_MODE_INVALID");
  assert(receipt.schemaVersion === "starcraft_tmg_ticket_14_slice_136_web_build_receipt_v1",
    "REPRODUCIBILITY_RECEIPT_SCHEMA_INVALID");
  return receipt;
}

async function main() {
  let first;
  if (suppliedBaseline) {
    first = await readReceipt(path.resolve(suppliedBaseline));
  } else {
    await run("node", ["scripts/build-ticket-14-web-static-v1.mjs"]);
    first = await readReceipt(RECEIPT_PATH);
    await run("node", ["scripts/build-ticket-14-web-static-v1.mjs"]);
  }
  const second = await readReceipt(RECEIPT_PATH);
  const checks = {
    receiptHashEqual: first.receiptHash === second.receiptHash,
    outputTreeHashEqual: first.outputTreeHash === second.outputTreeHash,
    outputFileCountEqual: first.outputFileCount === second.outputFileCount,
    outputByteLengthEqual: first.outputByteLength === second.outputByteLength,
    fullManifestEqual: JSON.stringify(first.outputFiles) === JSON.stringify(second.outputFiles),
    lockHashEqual: first.lockHash === second.lockHash,
  };
  assert(Object.values(checks).every(Boolean), "WEB_STATIC_BUILD_NOT_REPRODUCIBLE");
  const reportCore = {
    schemaVersion: "starcraft_tmg_ticket_14_slice_136_web_build_reproducibility_v1",
    generatedAt: "2026-09-03T16:00:00.000Z",
    ticket: 14,
    slice: 136,
    buildsCompared: 2,
    cleanMetroCachePerBuild: true,
    checks,
    outputFileCount: second.outputFileCount,
    outputByteLength: second.outputByteLength,
    outputTreeHash: second.outputTreeHash,
    buildReceiptHash: second.receiptHash,
    sourceRefreshPerformed: false,
    providerCalled: false,
    skillGenerated: false,
    dshRun: false,
    muzeroDataGenerated: false,
    selfPlayRun: false,
    trainingTruth: false,
  };
  const report = {
    ...reportCore,
    reportHash: hashStarcraftTmgContract(reportCore),
  };
  await mkdir(BUILD_ROOT, { recursive: true });
  await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  process.stdout.write(
    `Ticket 14 Slice 136 reproducibility: 2/2 builds; ${second.outputFileCount} files; ${report.outputTreeHash}\n`,
  );
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
