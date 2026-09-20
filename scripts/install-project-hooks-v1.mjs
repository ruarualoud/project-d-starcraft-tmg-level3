#!/usr/bin/env node

// ENV-6 hook installer. Sets core.hooksPath to the tracked .githooks/
// directory so the focused pre-commit guardrail is active locally. Local and
// offline: it only touches this repository's Git configuration and file modes.

import { chmodSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const hookPath = resolve(repositoryRoot, ".githooks/pre-commit");

if (!existsSync(hookPath)) {
  console.error("✗ .githooks/pre-commit is missing; cannot install hooks");
  process.exitCode = 1;
} else {
  chmodSync(hookPath, 0o755);

  const configure = spawnSync(
    "git",
    ["config", "core.hooksPath", ".githooks"],
    { cwd: repositoryRoot, encoding: "utf8" },
  );
  if (configure.status !== 0) {
    console.error(
      `✗ git config core.hooksPath failed: ${configure.stderr?.trim() || configure.status}`,
    );
    process.exitCode = 1;
  } else {
    const confirm = spawnSync("git", ["config", "--get", "core.hooksPath"], {
      cwd: repositoryRoot,
      encoding: "utf8",
    });
    const value = confirm.stdout?.trim();
    if (confirm.status === 0 && value === ".githooks") {
      console.log("✓ core.hooksPath = .githooks");
      console.log("✓ pre-commit hook active: git diff --cached --check plus node --check on staged .js/.mjs files");
    } else {
      console.error(`✗ core.hooksPath reads back as ${value || "unset"}`);
      process.exitCode = 1;
    }
  }
}
