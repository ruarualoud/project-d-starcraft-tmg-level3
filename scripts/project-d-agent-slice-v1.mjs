#!/usr/bin/env node

import { createHash } from "node:crypto";
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { homedir, userInfo } from "node:os";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "node:child_process";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, "..");
const worktreeRoot = resolve(repositoryRoot, ".worktrees");
const [command, manifestArgument] = process.argv.slice(2);

function fail(message) {
  console.error(`agent:slice: ${message}`);
  process.exit(1);
}

function run(executable, args, { cwd = repositoryRoot, inherit = false, env } = {}) {
  const result = spawnSync(executable, args, {
    cwd,
    encoding: "utf8",
    stdio: inherit ? "inherit" : ["ignore", "pipe", "pipe"],
    env: env ?? process.env,
  });
  if (result.status !== 0) {
    const detail = inherit
      ? "command failed"
      : (result.stderr || result.stdout || "command failed").trim();
    fail(`${executable} ${args.join(" ")}: ${detail}`);
  }
  return result.stdout?.trim() ?? "";
}

function assertInside(parent, candidate, label) {
  const pathFromParent = relative(parent, candidate);
  if (
    pathFromParent === "" ||
    pathFromParent === ".." ||
    pathFromParent.startsWith(`..${sep}`) ||
    isAbsolute(pathFromParent)
  ) {
    fail(`${label} must be below ${parent}`);
  }
}

function loadManifest() {
  if (!manifestArgument) {
    fail("expected <manifest.json>");
  }
  const manifestPath = resolve(repositoryRoot, manifestArgument);
  assertInside(repositoryRoot, manifestPath, "manifest");
  if (!existsSync(manifestPath)) {
    fail(`manifest not found: ${manifestArgument}`);
  }
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const requiredStrings = [
    "id",
    "title",
    "owner",
    "agentProfile",
    "model",
    "baseRef",
    "branch",
    "worktree",
    "taskBrief",
  ];
  for (const field of requiredStrings) {
    if (typeof manifest[field] !== "string" || !manifest[field].trim()) {
      fail(`manifest.${field} must be a non-empty string`);
    }
  }
  if (manifest.version !== 1) {
    fail("manifest.version must be 1");
  }
  if (!Array.isArray(manifest.allowedPaths) || manifest.allowedPaths.length === 0) {
    fail("manifest.allowedPaths must be non-empty");
  }
  if (!Array.isArray(manifest.verification) || manifest.verification.length === 0) {
    fail("manifest.verification must be non-empty");
  }
  if (!['project-d-k3', 'project-d-k3-256k'].includes(manifest.model)) {
    fail("manifest.model must be project-d-k3 or project-d-k3-256k");
  }
  const worktreePath = resolve(repositoryRoot, manifest.worktree);
  assertInside(worktreeRoot, worktreePath, "manifest.worktree");
  return { manifest, manifestPath, worktreePath };
}

function cleanStatus(cwd) {
  return run("git", ["status", "--porcelain"], { cwd });
}

function runtimeManifestPath(worktreePath) {
  return resolve(worktreePath, ".agent-runtime/slice.json");
}

function loadRuntimeManifest(manifest, worktreePath) {
  const runtimePath = runtimeManifestPath(worktreePath);
  if (!existsSync(runtimePath)) {
    fail("slice has not been prepared");
  }
  const runtime = JSON.parse(readFileSync(runtimePath, "utf8"));
  if (runtime.id !== manifest.id) {
    fail("runtime manifest belongs to another slice");
  }
  return runtime;
}

function changedPaths(worktreePath, baseCommit) {
  const output = run(
    "git",
    ["diff", "--name-only", `${baseCommit}...HEAD`],
    { cwd: worktreePath },
  );
  return output.split("\n").filter(Boolean);
}

function pathAllowed(path, allowedPaths) {
  return allowedPaths.some((allowed) =>
    allowed.endsWith("/") ? path.startsWith(allowed) : path === allowed,
  );
}

async function runStreaming(executable, args, options, logPath) {
  await new Promise((resolvePromise, rejectPromise) => {
    const log = createWriteStream(logPath, { mode: 0o600 });
    const child = spawn(executable, args, {
      ...options,
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout.on("data", (chunk) => {
      process.stdout.write(chunk);
      log.write(chunk);
    });
    child.stderr.on("data", (chunk) => {
      process.stderr.write(chunk);
      log.write(chunk);
    });
    child.on("error", rejectPromise);
    child.on("close", (code) => {
      log.end();
      if (code === 0) resolvePromise();
      else rejectPromise(new Error(`Kimi exited with ${code}`));
    });
  });
}

const { manifest, manifestPath, worktreePath } = loadManifest();

if (command === "prepare") {
  const pending = cleanStatus(repositoryRoot);
  if (pending) {
    fail("integration worktree must be clean before preparing a slice");
  }
  if (existsSync(worktreePath)) {
    fail(`worktree already exists: ${worktreePath}`);
  }
  const baseCommit = run("git", ["rev-parse", "--verify", manifest.baseRef]);
  mkdirSync(worktreeRoot, { recursive: true });
  run(
    "git",
    ["worktree", "add", "-b", manifest.branch, worktreePath, baseCommit],
    { inherit: true },
  );
  const runtimeDirectory = resolve(worktreePath, ".agent-runtime");
  mkdirSync(runtimeDirectory, { recursive: true });
  writeFileSync(
    runtimeManifestPath(worktreePath),
    `${JSON.stringify({ ...manifest, baseCommit, manifestPath }, null, 2)}\n`,
    { mode: 0o600 },
  );
  console.log(JSON.stringify({ status: "prepared", worktreePath, branch: manifest.branch, baseCommit }));
} else if (command === "status") {
  const runtime = loadRuntimeManifest(manifest, worktreePath);
  console.log(JSON.stringify({
    id: runtime.id,
    branch: run("git", ["branch", "--show-current"], { cwd: worktreePath }),
    head: run("git", ["rev-parse", "HEAD"], { cwd: worktreePath }),
    baseCommit: runtime.baseCommit,
    clean: !cleanStatus(worktreePath),
    changedPaths: changedPaths(worktreePath, runtime.baseCommit),
  }, null, 2));
} else if (command === "run-kimi") {
  const runtime = loadRuntimeManifest(manifest, worktreePath);
  if (cleanStatus(worktreePath)) {
    fail("Kimi starts only from a clean prepared worktree");
  }
  const key = run(
    "/usr/bin/security",
    [
      "find-generic-password",
      "-a",
      userInfo().username,
      "-s",
      "project-d-kimi-code-api-key",
      "-w",
    ],
  );
  const kimiPath = resolve(homedir(), ".kimi-code/bin/kimi");
  const agentPath = resolve(
    worktreePath,
    `.kimi-code/agents/${runtime.agentProfile}.md`,
  );
  if (!existsSync(agentPath)) {
    fail(`agent profile not found: ${agentPath}`);
  }
  const runDirectory = resolve(worktreePath, ".agent-runtime/runs");
  mkdirSync(runDirectory, { recursive: true });
  const runId = new Date().toISOString().replaceAll(":", "-");
  const logPath = resolve(runDirectory, `${runId}.jsonl`);
  const prompt = [
    `Implement slice ${runtime.id}: ${runtime.title}`,
    runtime.taskBrief,
    `Allowed paths: ${runtime.allowedPaths.join(", ")}`,
    runtime.selfVerificationByImplementer === true
      ? `Run each of these focused verification commands at most once after its relevant final code change and record the receipt: ${runtime.verification.map((entry) => `${entry.name}: ${entry.command}`).join(" | ")}`
      : "Do not run verification; the integrating Codex runs it exactly once.",
    runtime.selfVerificationByImplementer === true
      ? "Inspect each sub-slice diff, create one scoped local commit per completed sub-slice, and do not push."
      : "Inspect the diff and create one scoped local commit. Do not push.",
  ].join("\n\n");
  try {
    await runStreaming(
      kimiPath,
      [
        "--model",
        runtime.model,
        "--agent-file",
        agentPath,
        "--output-format",
        "stream-json",
        "--prompt",
        prompt,
      ],
      {
        cwd: worktreePath,
        env: {
          ...process.env,
          PROJECT_D_KIMI_API_KEY: key,
          KIMI_LOG_LEVEL: "warn",
        },
      },
      logPath,
    );
  } catch (error) {
    fail(error.message);
  }
  console.log(JSON.stringify({ status: "kimi-complete", logPath }));
} else if (command === "verify") {
  const runtime = loadRuntimeManifest(manifest, worktreePath);
  const pending = cleanStatus(worktreePath);
  if (pending) {
    fail("verification requires Kimi's implementation to be committed first");
  }
  const paths = changedPaths(worktreePath, runtime.baseCommit);
  const rejected = paths.filter((path) => !pathAllowed(path, runtime.allowedPaths));
  if (rejected.length > 0) {
    fail(`out-of-scope changed paths: ${rejected.join(", ")}`);
  }
  const head = run("git", ["rev-parse", "HEAD"], { cwd: worktreePath });
  const verificationHash = createHash("sha256")
    .update(JSON.stringify(runtime.verification))
    .digest("hex")
    .slice(0, 16);
  const receiptDirectory = resolve(worktreePath, ".agent-runtime/verification");
  mkdirSync(receiptDirectory, { recursive: true });
  const receiptPath = resolve(receiptDirectory, `${head}-${verificationHash}.json`);
  if (existsSync(receiptPath)) {
    const receipt = JSON.parse(readFileSync(receiptPath, "utf8"));
    if (receipt.status === "passed") {
      console.log(JSON.stringify({ status: "reused", receiptPath }));
      process.exit(0);
    }
  }
  const results = [];
  for (const verification of runtime.verification) {
    const startedAt = new Date().toISOString();
    const result = spawnSync(verification.command, {
      cwd: worktreePath,
      encoding: "utf8",
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    process.stdout.write(result.stdout ?? "");
    process.stderr.write(result.stderr ?? "");
    results.push({
      name: verification.name,
      command: verification.command,
      startedAt,
      finishedAt: new Date().toISOString(),
      exitCode: result.status,
    });
    if (result.status !== 0) break;
  }
  const passed = results.length === runtime.verification.length &&
    results.every((result) => result.exitCode === 0);
  writeFileSync(receiptPath, `${JSON.stringify({
    version: 1,
    sliceId: runtime.id,
    head,
    baseCommit: runtime.baseCommit,
    changedPaths: paths,
    status: passed ? "passed" : "failed",
    results,
  }, null, 2)}\n`);
  console.log(JSON.stringify({ status: passed ? "passed" : "failed", receiptPath }));
  if (!passed) process.exit(1);
} else if (command === "handoff") {
  const runtime = loadRuntimeManifest(manifest, worktreePath);
  if (cleanStatus(worktreePath)) {
    fail("handoff requires a clean committed worktree");
  }
  const head = run("git", ["rev-parse", "HEAD"], { cwd: worktreePath });
  const verificationDirectory = resolve(worktreePath, ".agent-runtime/verification");
  const verificationHash = createHash("sha256")
    .update(JSON.stringify(runtime.verification))
    .digest("hex")
    .slice(0, 16);
  const receiptPath = resolve(verificationDirectory, `${head}-${verificationHash}.json`);
  if (!existsSync(receiptPath)) {
    fail("no verification receipt exists for the current commit");
  }
  const receipt = JSON.parse(readFileSync(receiptPath, "utf8"));
  if (receipt.status !== "passed") {
    fail("current verification receipt did not pass");
  }
  console.log(JSON.stringify({
    status: "ready-for-codex-review",
    sliceId: runtime.id,
    githubIssue: runtime.githubIssue,
    baseCommit: runtime.baseCommit,
    head,
    changedPaths: receipt.changedPaths,
    verificationReceipt: receiptPath,
  }, null, 2));
} else {
  fail("command must be prepare, status, run-kimi, verify or handoff");
}
