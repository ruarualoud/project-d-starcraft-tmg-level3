#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/transition-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EXPO_ROOT = path.join(ROOT, "apps/starcraft-tmg-expo");
const BUILD_ROOT = path.join(ROOT, "build/ticket-14-slice-136-web-static-v1");
const PRODUCTION_ORIGIN = "https://starcraft-tmg.project-d.example";
const LOCK_HASH = "6a60cdbb9639a8ba9de3f0660e7151e1fc1c7cd4cf7eb5a0768c69071b919458";
const MODE = process.argv.includes("--acceptance") ? "acceptance" : "production";
const OUTPUT_ROOT = path.join(BUILD_ROOT, MODE === "production"
  ? "export-production"
  : "export-acceptance");
const REPORT_PATH = path.join(BUILD_ROOT, `${MODE}-build-receipt.json`);
const STATIC_WEB_CSS_PATH = path.join(BUILD_ROOT, "generated/static-web.css");

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function filesBelow(root, prefix = "") {
  const output = [];
  for (const name of (await readdir(path.join(root, prefix))).sort()) {
    const relative = path.posix.join(prefix.split(path.sep).join(path.posix.sep), name);
    const absolute = path.join(root, relative);
    const descriptor = await stat(absolute);
    if (descriptor.isDirectory()) output.push(...await filesBelow(root, relative));
    else if (descriptor.isFile()) output.push(relative);
  }
  return output;
}

async function manifest(root) {
  const rows = [];
  for (const relativePath of await filesBelow(root)) {
    const body = await readFile(path.join(root, relativePath));
    rows.push({
      path: relativePath,
      byteLength: body.byteLength,
      sha256: sha256(body),
    });
  }
  return rows;
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", ...options });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(
        `WEB_STATIC_BUILD_FAILED:${command}:${code ?? signal ?? "unknown"}`,
      ));
    });
  });
}

async function packageVersion(name) {
  return JSON.parse(await readFile(
    path.join(EXPO_ROOT, "node_modules", name, "package.json"),
    "utf8",
  )).version;
}

async function main() {
  const observedLockHash = sha256(await readFile(path.join(EXPO_ROOT, "pnpm-lock.yaml")));
  if (observedLockHash !== LOCK_HASH) {
    throw new Error(`WEB_STATIC_LOCK_DRIFT:${observedLockHash}`);
  }

  await rm(OUTPUT_ROOT, { recursive: true, force: true });
  await mkdir(path.dirname(STATIC_WEB_CSS_PATH), { recursive: true });
  const commonEnv = {
    ...process.env,
    CI: "1",
    LANG: "C",
    SOURCE_DATE_EPOCH: "1788422400",
    TZ: "UTC",
  };
  await run("corepack", [
    "pnpm@9.12.0",
    "--dir",
    EXPO_ROOT,
    "exec",
    "tailwindcss",
    "-i",
    "global.css",
    "-o",
    STATIC_WEB_CSS_PATH,
    "--minify",
  ], {
    cwd: ROOT,
    env: {
      ...commonEnv,
      BROWSERSLIST: "last 1 version",
      BROWSERSLIST_ENV: "native",
    },
  });
  const staticWebCssHash = sha256(await readFile(STATIC_WEB_CSS_PATH));
  const exportArgs = [
    "pnpm@9.12.0",
    "--dir",
    EXPO_ROOT,
    "exec",
    "expo",
    "export",
    "--platform",
    "web",
    "--output-dir",
    OUTPUT_ROOT,
    "--clear",
    "--max-workers",
    "2",
  ];
  if (MODE === "acceptance") exportArgs.push("--dev");
  await run("corepack", exportArgs, {
    cwd: ROOT,
    env: {
      ...commonEnv,
      EXPO_OFFLINE: "1",
      NODE_ENV: MODE === "production" ? "production" : "development",
      PROJECT_D_STATIC_WEB_CSS_INPUT: STATIC_WEB_CSS_PATH,
      EXPO_PUBLIC_STARCRAFT_TMG_WEB_ORIGIN: MODE === "production"
        ? PRODUCTION_ORIGIN
        : "",
      EXPO_PUBLIC_STARCRAFT_TMG_MEDIA_RELEASE_CHANNEL: MODE === "acceptance"
        ? "development_internal"
        : "public",
    },
  });

  const outputFiles = await manifest(OUTPUT_ROOT);
  const routes = outputFiles
    .filter((entry) => entry.path.endsWith(".html"))
    .map((entry) => entry.path);
  const requiredRoutes = [
    "index.html",
    "army.html",
    "match.html",
    "settings.html",
    "tools.html",
    "room/[roomId].html",
  ];
  if (!requiredRoutes.every((route) => routes.includes(route))) {
    throw new Error("WEB_STATIC_REQUIRED_ROUTE_MISSING");
  }
  const totalBytes = outputFiles.reduce((sum, entry) => sum + entry.byteLength, 0);
  const receiptCore = {
    schemaVersion: "starcraft_tmg_ticket_14_slice_136_web_build_receipt_v1",
    mode: MODE,
    ticket: 14,
    slice: 136,
    generatedAt: "2026-09-03T16:00:00.000Z",
    packageManager: "pnpm@9.12.0",
    nodeMajor: Number(process.versions.node.split(".")[0]),
    dependencies: {
      expo: await packageVersion("expo"),
      nativewind: await packageVersion("nativewind"),
      reactNativeCssInterop: await packageVersion("react-native-css-interop"),
      expoAudio: await packageVersion("expo-audio"),
      expoDocumentPicker: await packageVersion("expo-document-picker"),
    },
    lockHash: observedLockHash,
    productionOrigin: MODE === "production" ? PRODUCTION_ORIGIN : null,
    offlineDependencyResolution: true,
    staticWebCssPrecompiledBeforeMetro: true,
    staticWebCssHash,
    deterministicMetroWorkerCount: 2,
    outputFileCount: outputFiles.length,
    outputByteLength: totalBytes,
    outputFiles,
    outputTreeHash: hashStarcraftTmgContract(outputFiles),
    requiredRoutes,
    sourceRefreshPerformed: false,
    providerCalled: false,
    skillGenerated: false,
    dshRun: false,
    muzeroDataGenerated: false,
    selfPlayRun: false,
    trainingTruth: false,
  };
  const receipt = {
    ...receiptCore,
    receiptHash: hashStarcraftTmgContract(receiptCore),
  };
  await writeFile(REPORT_PATH, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
  process.stdout.write(`${MODE} Web export ${outputFiles.length} files / ${totalBytes} bytes\n`);
  process.stdout.write(`Output tree ${receipt.outputTreeHash}\n`);
  process.stdout.write(`Receipt ${receipt.receiptHash}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
