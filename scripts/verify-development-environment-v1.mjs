#!/usr/bin/env node

// ENV-6 focused development environment guardrail.
// Deterministic and offline: reads only tracked repository text files plus the
// local `git check-ignore` index. It never reads credentials, never opens a
// network connection and never invokes a Provider. It must stay independent of
// the product-wide `verify:all` chain and of every historical product gate.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const checks = [];

function record(name, ok, detail) {
  checks.push({ name, ok, detail });
}

function read(relativePath) {
  return readFileSync(resolve(repositoryRoot, relativePath), "utf8");
}

// --- 1. Pinned Node/npm contract -------------------------------------------

const packageDocument = JSON.parse(read("package.json"));
const nodeVersionPin = read(".node-version").trim();
const runningNodeMajor = Number.parseInt(process.versions.node.split(".")[0], 10);

record(
  "node engines pin",
  packageDocument.engines?.node === ">=24.0.0 <25",
  `engines.node = ${packageDocument.engines?.node ?? "missing"}`,
);
record(
  "npm engines pin",
  packageDocument.engines?.npm === ">=11.0.0 <12",
  `engines.npm = ${packageDocument.engines?.npm ?? "missing"}`,
);
record(
  "packageManager pin",
  packageDocument.packageManager === "npm@11.9.0",
  `packageManager = ${packageDocument.packageManager ?? "missing"}`,
);
record(
  ".node-version pin",
  /^24\.\d+\.\d+$/.test(nodeVersionPin),
  `.node-version = ${nodeVersionPin}`,
);
record(
  "running node major",
  runningNodeMajor === 24,
  `node ${process.versions.node} (expected major 24)`,
);

// --- 2. Compact CURRENT_WORK / AGENTS navigation ----------------------------

const compactBudgets = [
  {
    path: "CURRENT_WORK.md",
    maxLines: 120,
    maxBytes: 16384,
    requiredSnippets: ["## Active phase", "## Navigation"],
  },
  {
    path: "AGENTS.md",
    maxLines: 120,
    maxBytes: 8192,
    requiredSnippets: ["CURRENT_WORK.md"],
  },
];

for (const budget of compactBudgets) {
  const absolute = resolve(repositoryRoot, budget.path);
  if (!existsSync(absolute)) {
    record(`compact navigation: ${budget.path}`, false, "missing");
    continue;
  }
  const text = read(budget.path);
  const lineCount = text.split("\n").length;
  const byteCount = Buffer.byteLength(text, "utf8");
  const missing = budget.requiredSnippets.filter(
    (snippet) => !text.includes(snippet),
  );
  record(
    `compact navigation: ${budget.path}`,
    lineCount <= budget.maxLines &&
      byteCount <= budget.maxBytes &&
      missing.length === 0,
    `${lineCount} line(s), ${byteCount} byte(s)` +
      (missing.length > 0 ? `, missing ${missing.join(", ")}` : ""),
  );
}

// --- 3. Ignored runtime/generated paths -------------------------------------

const ignoredProbes = [
  ".agent-runtime/probe.json",
  ".worktrees/probe/index.txt",
  ".kimi-code/local.toml",
  "build/probe.txt",
  "dist/probe.js",
  "node_modules/probe/index.js",
  "vendor/dsh-execution-projections-v1/probe.json",
  "imports/probe/README.md",
  "assets/client/battlefield/probe-map-v1.png",
];

for (const probe of ignoredProbes) {
  const result = spawnSync("git", ["check-ignore", "--quiet", "--", probe], {
    cwd: repositoryRoot,
    encoding: "utf8",
  });
  record(
    `ignored path: ${probe}`,
    result.status === 0,
    result.status === 0 ? "ignored" : "not covered by .gitignore",
  );
}

// --- 4. Scoped Kimi agent profiles ------------------------------------------

const agentProfiles = [
  "project-d-slice-implementer",
  "project-d-ui-implementer",
  "project-d-ui-lead",
];

for (const profile of agentProfiles) {
  const relativePath = `.kimi-code/agents/${profile}.md`;
  const absolute = resolve(repositoryRoot, relativePath);
  if (!existsSync(absolute)) {
    record(`agent profile: ${profile}`, false, "missing");
    continue;
  }
  const text = read(relativePath);
  const problems = [];
  if (!text.includes(`name: ${profile}`)) problems.push("name mismatch");
  if (!text.includes("override: false")) problems.push("override not false");
  if (!/subagents:\s*\[\s*\]/.test(text)) problems.push("subagents not empty");
  if (!text.includes("call paid Providers")) {
    problems.push("missing paid-Provider prohibition");
  }
  if (!text.includes("push Git")) problems.push("missing push prohibition");
  if (!text.includes("read credentials")) {
    problems.push("missing credential prohibition");
  }
  record(
    `agent profile: ${profile}`,
    problems.length === 0,
    problems.length === 0 ? "scoped and bounded" : problems.join("; "),
  );
}

// --- 5. Collaboration manifest shape -----------------------------------------

const slicesDirectory = resolve(repositoryRoot, "coordination/slices");
const manifestFiles = existsSync(slicesDirectory)
  ? readdirSync(slicesDirectory)
      .filter((entry) => entry.endsWith(".slice.json"))
      .sort()
  : [];

record(
  "collaboration manifests present",
  manifestFiles.length > 0,
  `${manifestFiles.length} manifest(s) below coordination/slices/`,
);

const forbiddenManifestKeys = new Set([
  "apiKey",
  "api_key",
  "token",
  "secret",
  "password",
  "credential",
]);

for (const manifestFile of manifestFiles) {
  const label = `manifest: ${manifestFile}`;
  let manifest;
  try {
    manifest = JSON.parse(read(`coordination/slices/${manifestFile}`));
  } catch (error) {
    record(label, false, `invalid JSON: ${error.message}`);
    continue;
  }
  const problems = [];
  const requireNonEmptyString = (key) => {
    if (typeof manifest[key] !== "string" || manifest[key].trim() === "") {
      problems.push(`${key} missing`);
    }
  };

  if (manifest.version !== 1) problems.push("version must be 1");
  for (const key of ["id", "title", "owner", "agentProfile", "model", "baseRef", "branch", "worktree", "taskBrief"]) {
    requireNonEmptyString(key);
  }
  if (typeof manifest.id === "string") {
    if (manifest.branch !== `agent/kimi/${manifest.id}`) {
      problems.push("branch must be agent/kimi/<id>");
    }
    if (manifest.worktree !== `.worktrees/${manifest.id}`) {
      problems.push("worktree must be .worktrees/<id>");
    }
  }
  if (!agentProfiles.includes(manifest.agentProfile)) {
    problems.push("agentProfile must be a scoped repository profile");
  }
  if (
    typeof manifest.model === "string" &&
    !manifest.model.startsWith("project-d-")
  ) {
    problems.push("model must be a project-d-* alias");
  }
  if (
    manifest.githubIssue !== null &&
    !Number.isInteger(manifest.githubIssue)
  ) {
    problems.push("githubIssue must be null or an integer");
  }
  if (
    !Array.isArray(manifest.allowedPaths) ||
    manifest.allowedPaths.length === 0 ||
    manifest.allowedPaths.some(
      (entry) => typeof entry !== "string" || entry.trim() === "",
    )
  ) {
    problems.push("allowedPaths must be a non-empty string array");
  }
  if (
    !Array.isArray(manifest.verification) ||
    manifest.verification.length === 0 ||
    manifest.verification.some(
      (gate) =>
        typeof gate?.name !== "string" ||
        gate.name.trim() === "" ||
        typeof gate?.command !== "string" ||
        gate.command.trim() === "",
    )
  ) {
    problems.push("verification must list named commands");
  }
  if (manifest.selfVerificationByImplementer !== undefined
    && typeof manifest.selfVerificationByImplementer !== "boolean") {
    problems.push("selfVerificationByImplementer must be boolean when present");
  }
  for (const key of Object.keys(manifest)) {
    if (forbiddenManifestKeys.has(key)) {
      problems.push(`forbidden secret-shaped key ${key}`);
    }
  }
  record(
    label,
    problems.length === 0,
    problems.length === 0
      ? `id ${manifest.id}, ${manifest.allowedPaths.length} allowed path(s), ${manifest.verification.length} gate(s)`
      : problems.join("; "),
  );
}

// --- Summary -----------------------------------------------------------------

for (const check of checks) {
  console.log(`${check.ok ? "✓" : "✗"} ${check.name}: ${check.detail}`);
}

const failed = checks.filter((check) => !check.ok);
console.log(
  `development environment guardrail summary: ${checks.length - failed.length} passed, ${failed.length} failed`,
);
process.exitCode = failed.length > 0 ? 1 : 0;
