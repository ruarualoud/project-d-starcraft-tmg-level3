#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const checks = [];
const read = (path) => readFileSync(resolve(root, path), "utf8");
const check = (name, ok, detail) => checks.push({ name, ok, detail });

const requiredFiles = [
  ".github/ISSUE_TEMPLATE/config.yml",
  ".github/ISSUE_TEMPLATE/agent-slice.yml",
  ".github/PULL_REQUEST_TEMPLATE.md",
  "coordination/github/labels-v1.json",
  "coordination/github/remaining-work-v1.json",
  "scripts/publish-github-roadmap-v1.mjs",
];
for (const path of requiredFiles) {
  check(`required file ${path}`, existsSync(resolve(root, path)), existsSync(resolve(root, path)) ? "present" : "missing");
}

const labelsDocument = JSON.parse(read("coordination/github/labels-v1.json"));
const roadmap = JSON.parse(read("coordination/github/remaining-work-v1.json"));
const packageDocument = JSON.parse(read("package.json"));
const labelNames = new Set(labelsDocument.labels.map((label) => label.name));
const issueIds = new Set();
const orders = new Set();

check("labels version", labelsDocument.version === 1, `version ${labelsDocument.version}`);
check("label count", labelNames.size === labelsDocument.labels.length && labelNames.size >= 10, `${labelNames.size} unique labels`);
check("roadmap version", roadmap.version === 1, `version ${roadmap.version}`);
check("roadmap repository", roadmap.repository === "ruarualoud/project-d-starcraft-tmg-level3", roadmap.repository);
check("roadmap issue count", roadmap.issues.length >= 5, `${roadmap.issues.length} issues`);

for (const issue of roadmap.issues) {
  const problems = [];
  if (!issue.id || issueIds.has(issue.id)) problems.push("missing or duplicate id");
  if (!Number.isInteger(issue.order) || orders.has(issue.order)) problems.push("missing or duplicate order");
  if (!issue.title?.startsWith("[Ticket ")) problems.push("title lacks Ticket prefix");
  if (!Array.isArray(issue.body) || issue.body.length < 2) problems.push("body needs at least two paragraphs");
  if (!Array.isArray(issue.references) || issue.references.length === 0) problems.push("references missing");
  if (issue.references?.some((reference) => !existsSync(resolve(root, reference)))) problems.push("referenced file missing");
  if (!Array.isArray(issue.labels) || issue.labels.some((label) => !labelNames.has(label))) problems.push("unknown label");
  issueIds.add(issue.id);
  orders.add(issue.order);
  check(`roadmap issue ${issue.id}`, problems.length === 0, problems.length === 0 ? `${issue.labels.length} labels` : problems.join("; "));
}

const issueTemplate = read(".github/ISSUE_TEMPLATE/agent-slice.yml");
for (const field of ["Ticket / Slice", "Acceptance evidence", "Allowed paths", "Paid model call", "maximumReviewFixRounds"]) {
  const expected = field === "maximumReviewFixRounds" ? "three rounds" : field;
  check(`issue template ${field}`, issueTemplate.includes(expected), expected);
}

const pullRequestTemplate = read(".github/PULL_REQUEST_TEMPLATE.md");
for (const heading of ["## Focused verification", "## Model and cost ledger", "## Review", "## Safety and authority"]) {
  check(`PR template ${heading}`, pullRequestTemplate.includes(heading), heading);
}

const publisher = read("scripts/publish-github-roadmap-v1.mjs");
const publisherSyntax = spawnSync(process.execPath, ["--check", resolve(root, "scripts/publish-github-roadmap-v1.mjs")], { encoding: "utf8" });
check("publisher syntax", publisherSyntax.status === 0, publisherSyntax.status === 0 ? "valid" : publisherSyntax.stderr.trim());
check("publisher defaults to preview", publisher.includes('process.argv.includes("--apply")') && publisher.includes("No network request was made"), "explicit --apply required");
check("publisher deduplicates", publisher.includes("project-d-roadmap:") && publisher.includes("existing.find"), "stable marker lookup");
check("package preview script", packageDocument.scripts?.["github:roadmap:preview"] === "node scripts/publish-github-roadmap-v1.mjs", packageDocument.scripts?.["github:roadmap:preview"] ?? "missing");
check("package publish script", packageDocument.scripts?.["github:roadmap:publish"] === "node scripts/publish-github-roadmap-v1.mjs --apply", packageDocument.scripts?.["github:roadmap:publish"] ?? "missing");

for (const result of checks) console.log(`${result.ok ? "✓" : "✗"} ${result.name}: ${result.detail}`);
const failed = checks.filter((result) => !result.ok);
console.log(`GitHub collaboration package summary: ${checks.length - failed.length} passed, ${failed.length} failed`);
process.exitCode = failed.length > 0 ? 1 : 0;
