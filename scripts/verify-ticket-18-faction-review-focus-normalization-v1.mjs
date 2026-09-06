#!/usr/bin/env node

import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFile, writeFile } from "node:fs/promises";

import { hash, seal, sha256, verifySeal } from
  "../packages/skill-production/common.mjs";
import {
  applyFactionStrategyPatchV1,
  createFactionWritingPlanV1,
  normalizeFactionStrategyPatchEnvelopeV1,
  validateFactionReviewV1,
} from "../packages/skill-production-v3/faction-strategy-workflow-v1.mjs";
import {
  createFactionReviewTargetsV1,
  validateTargetedFactionReviewV1,
} from "../packages/skill-production-v3/faction-review-targets-v1.mjs";

const RUN = "faction-v1-d9636a4e06768300481f";
const EPOCH = ".source-evidence-v1.3f8eeb087607ebe8f490";
const REVIEW = "faction.terran_armed_forces.faction.terran_armed_forces.objectives.1.review-target-batch-v1.supportive.1.4";
const input = verifySeal(JSON.parse(await readFile(
  "build/ticket-18-faction-production-v1/terran_armed_forces-input.json",
  "utf8",
)));
const db = new DatabaseSync(
  "build/ticket-17-production-redesign-v1/production.sqlite",
  { readOnly: true },
);
const artifact = (id) => verifySeal(JSON.parse(db.prepare(
  "SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'",
).get(RUN, id).artifact)).value;

try {
  const correction = artifact(
    "faction.terran_armed_forces.objectives.1.known-rule-correction",
  );
  const journal = artifact(
    "faction.terran_armed_forces.objectives.1.issue-journal.0",
  );
  const baseDraft = correction.draft;
  const patches = [];
  for (const ordinal of [0, 1, 2]) {
    const issue = journal.issues.issues[ordinal];
    const localIssues = seal({
      ...Object.fromEntries(Object.entries(journal.issues)
        .filter(([key]) => !["hash", "issues", "openIssues"].includes(key))),
      issues: [issue],
      openIssues: 1,
    });
    const role = `faction.terran_armed_forces.faction.terran_armed_forces.objectives.1.editor.0.${ordinal}${EPOCH}`;
    const normalized = normalizeFactionStrategyPatchEnvelopeV1(
      artifact(role).output,
      { input, draft: baseDraft, issues: localIssues },
    ).output;
    patches.push(normalized);
  }
  const draft = applyFactionStrategyPatchV1({
    parentHash: hash(baseDraft),
    replacements: patches.flatMap((row) => row.replacements),
    additions: patches.flatMap((row) => row.additions),
  }, { input, draft: baseDraft, issues: journal.issues });
  const section = createFactionWritingPlanV1(input).sections.find((row) =>
    row.id === "faction.terran_armed_forces.objectives.1");
  const targets = createFactionReviewTargetsV1({
    input, section, draft, indices: [4, 5],
  });
  const original = artifact(REVIEW + EPOCH).output;
  const attemptedRepair = artifact(REVIEW + ".schema" + EPOCH).output;
  assert.equal(hash(original), hash(attemptedRepair));
  assert.deepEqual(original.verdicts.flatMap((verdict) => verdict.focus
    .filter((focus) => focus.quote.length > 240)
    .map((focus) => focus.quote.length)), [333, 254]);

  const bound = validateTargetedFactionReviewV1(original, targets);
  validateFactionReviewV1(bound.review, {
    input, section, draft, reviewIndices: [4, 5], requiredSourceRefs: [],
  });
  assert.equal(bound.focusMetadataRepairs.length, 2);
  assert(bound.focusMetadataRepairs.every((row) =>
    row.normalizedLength === 240
    && row.rawProviderOutputOverwritten === false
    && row.judgmentChanged === false
    && row.exactOriginalBindingVerified === true));
  assert.equal(bound.review.verdicts[0].verdict, "unsupported");
  assert.equal(bound.review.verdicts[1].verdict, "supported");
  const report = seal({ version: "ticket_18_faction_review_focus_normalization_readiness_v1",
    ticket: 18, slice: 174, passed: true, checks: 7,
    parentRunId: RUN, parentFailureCode: "FACTION_SCHEMA_REPAIR_NO_PROGRESS",
    originalReviewHash: hash(original),
    redundantSchemaRepairHash: hash(attemptedRepair),
    focusRepairs: bound.focusMetadataRepairs.length,
    originalLengths: [333, 254], normalizedLengths: [240, 240],
    exactOriginalBindingsVerified: true, judgmentsUnchanged: true,
    rawProviderOutputOverwritten: false, providerCalls: 0,
    codeHashes: await Promise.all([
      "packages/skill-production-v3/faction-review-targets-v1.mjs",
      "scripts/verify-ticket-18-faction-review-focus-normalization-v1.mjs",
    ].map(async (file) => ({ file, hash: sha256(await readFile(file)) }))),
    sourceRefreshPerformed: false, semanticCorrectnessProven: false,
    trainingTruth: false });
  await writeFile("build/ticket-18-faction-production-v1/review-focus-normalization-readiness.json",
    `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ passed: report.passed, checks: report.checks,
    parentRunId: report.parentRunId, originalReviewHash: report.originalReviewHash,
    redundantSchemaRepairHash: report.redundantSchemaRepairHash,
    focusRepairs: report.focusRepairs, providerCalls: report.providerCalls,
    hash: report.hash }));
} finally {
  db.close();
}
