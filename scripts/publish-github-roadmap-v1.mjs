#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const labels = JSON.parse(readFileSync(resolve(root, "coordination/github/labels-v1.json"), "utf8"));
const roadmap = JSON.parse(readFileSync(resolve(root, "coordination/github/remaining-work-v1.json"), "utf8"));
const apply = process.argv.includes("--apply");

function gh(args, options = {}) {
  const result = spawnSync("gh", args, {
    cwd: root,
    encoding: "utf8",
    stdio: options.capture ? "pipe" : "inherit",
  });
  if (result.status !== 0) {
    const detail = options.capture ? result.stderr?.trim() : "";
    throw new Error(`gh ${args[0]} failed${detail ? `: ${detail}` : ""}`);
  }
  return result.stdout?.trim() ?? "";
}

function bodyFor(issue) {
  const marker = `<!-- project-d-roadmap:${issue.id} -->`;
  const references = issue.references.map((reference) => `- \`${reference}\``).join("\n");
  const paragraphs = issue.body.flatMap((paragraph) => [paragraph, ""]);
  return [marker, "", ...paragraphs, "## References", "", references].join("\n");
}

if (!apply) {
  console.log(`preview: ${roadmap.repository}`);
  console.log(`labels: ${labels.labels.length}`);
  for (const issue of roadmap.issues) {
    console.log(`${issue.order}. ${issue.title} [${issue.labels.join(", ")}]`);
  }
  console.log("No network request was made. Re-run with --apply after gh authentication to publish missing labels and issues.");
  process.exit(0);
}

gh(["auth", "status"]);

for (const label of labels.labels) {
  gh([
    "label",
    "create",
    label.name,
    "--repo",
    roadmap.repository,
    "--color",
    label.color,
    "--description",
    label.description,
    "--force",
  ]);
}

const existing = JSON.parse(
  gh(
    ["issue", "list", "--repo", roadmap.repository, "--state", "all", "--limit", "500", "--json", "number,title,body"],
    { capture: true },
  ),
);

for (const issue of roadmap.issues) {
  const marker = `<!-- project-d-roadmap:${issue.id} -->`;
  const found = existing.find((candidate) => candidate.body?.includes(marker));
  if (found) {
    console.log(`existing #${found.number}: ${issue.id}`);
    continue;
  }
  gh([
    "issue",
    "create",
    "--repo",
    roadmap.repository,
    "--title",
    issue.title,
    "--body",
    bodyFor(issue),
    "--label",
    issue.labels.join(","),
  ]);
}
