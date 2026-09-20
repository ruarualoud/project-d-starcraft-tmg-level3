#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, "..");
const strict = process.argv.includes("--strict");
const checks = [];

function record(name, status, detail) {
  checks.push({ name, status, detail });
}

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: repositoryRoot,
    encoding: "utf8",
    stdio: options.quiet ? "ignore" : ["ignore", "pipe", "pipe"],
    env: process.env,
  });
}

const packageDocument = JSON.parse(
  readFileSync(resolve(repositoryRoot, "package.json"), "utf8"),
);
const nodeMajor = Number.parseInt(process.versions.node.split(".")[0], 10);
record(
  "node",
  nodeMajor === 24 ? "pass" : "fail",
  `expected major 24, found ${process.versions.node}`,
);
record(
  "package manager pin",
  packageDocument.packageManager === "npm@11.9.0" ? "pass" : "fail",
  packageDocument.packageManager ?? "missing packageManager",
);

const gitRoot = run("git", ["rev-parse", "--show-toplevel"]);
record(
  "repository root",
  gitRoot.status === 0 && resolve(gitRoot.stdout.trim()) === repositoryRoot
    ? "pass"
    : "fail",
  gitRoot.status === 0 ? gitRoot.stdout.trim() : "not a Git worktree",
);

const branch = run("git", ["branch", "--show-current"]);
record(
  "branch",
  branch.status === 0 && branch.stdout.trim() ? "pass" : "fail",
  branch.stdout?.trim() || "detached HEAD",
);

const origin = run("git", ["remote", "get-url", "origin"]);
record(
  "origin",
  origin.status === 0 && /project-d-starcraft-tmg-level3/.test(origin.stdout)
    ? "pass"
    : "fail",
  origin.stdout?.trim() || "missing origin",
);

const status = run("git", ["status", "--porcelain"]);
const dirtyCount = status.status === 0
  ? status.stdout.split("\n").filter(Boolean).length
  : -1;
record(
  "worktree",
  dirtyCount === 0 ? "pass" : strict ? "fail" : "warn",
  dirtyCount === 0 ? "clean" : `${dirtyCount} pending path(s)`,
);

const kimiPath = resolve(homedir(), ".kimi-code/bin/kimi");
const kimiVersion = existsSync(kimiPath) ? run(kimiPath, ["-V"]) : null;
record(
  "Kimi Code CLI",
  kimiVersion?.status === 0 ? "pass" : "fail",
  kimiVersion?.stdout?.trim() || "missing",
);

const ghPath = resolve(homedir(), ".local/bin/gh");
const ghVersion = existsSync(ghPath) ? run(ghPath, ["--version"]) : null;
record(
  "GitHub CLI",
  ghVersion?.status === 0 ? "pass" : "fail",
  ghVersion?.stdout?.split("\n")[0]?.trim() || "missing",
);

const kimiConfigPath = resolve(homedir(), ".kimi-code/config.toml");
const kimiConfig = existsSync(kimiConfigPath)
  ? readFileSync(kimiConfigPath, "utf8")
  : "";
record(
  "K3 configuration",
  kimiConfig.includes('model = "k3"') &&
    kimiConfig.includes('api_key_env = "PROJECT_D_KIMI_API_KEY"') &&
    !/^\s*api_key\s*=/m.test(kimiConfig)
    ? "pass"
    : "fail",
  existsSync(kimiConfigPath)
    ? "K3 uses a process environment reference; no plaintext api_key field"
    : "missing config.toml",
);

const keychain = run(
  "/usr/bin/security",
  [
    "find-generic-password",
    "-a",
    "rualoud",
    "-s",
    "project-d-kimi-code-api-key",
  ],
  { quiet: true },
);
record(
  "K3 Keychain credential",
  keychain.status === 0 ? "pass" : "fail",
  keychain.status === 0 ? "present (value not read)" : "missing",
);

for (const check of checks) {
  const marker = check.status === "pass" ? "✓" : check.status === "warn" ? "!" : "✗";
  console.log(`${marker} ${check.name}: ${check.detail}`);
}

const failed = checks.filter((check) => check.status === "fail");
const warned = checks.filter((check) => check.status === "warn");
console.log(
  `doctor summary: ${checks.length - failed.length - warned.length} passed, ${warned.length} warning(s), ${failed.length} failed`,
);
process.exitCode = failed.length > 0 ? 1 : 0;
