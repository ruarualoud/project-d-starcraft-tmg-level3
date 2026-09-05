#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import {
  createStarcraftTmgHowToPlaySkillStagedInputV1,
  verifyStarcraftTmgHowToPlaySkillStagedInputV1,
} from "../packages/skill-generation-runtime/how-to-play-skill-input-v1.mjs";
import { createStarcraftTmgProductionSkillCatalogueV1 } from
  "../packages/skill-generation-runtime/production-skill-catalogue-v1.mjs";
import { loadCurrentOfficialSkillFixtureV1 } from
  "./support/current-official-skill-fixture-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_PATH = path.join(
  ROOT,
  "build/ticket-17-skill-generation-v1/slice-170-how-to-play-input-report.json",
);
const fixture = await loadCurrentOfficialSkillFixtureV1({ root: ROOT });
const productionCatalogue = createStarcraftTmgProductionSkillCatalogueV1(fixture);
const input = { ...fixture, productionCatalogue };
const staged = createStarcraftTmgHowToPlaySkillStagedInputV1(input);
const checks = [];

async function check(id, operation) {
  try {
    await operation();
    checks.push({ id, passed: true });
  } catch (error) {
    checks.push({ id, passed: false,
      error: error instanceof Error ? error.stack || error.message : String(error) });
  }
}

await check("one_how_to_play_input_is_bound_to_the_53_skill_catalogue", () => {
  assert.equal(verifyStarcraftTmgHowToPlaySkillStagedInputV1(staged, input), true);
  assert.equal(staged.task.subjectId, "skill.starcraft-tmg.how-to-play");
  assert.equal(staged.bindings.productionCatalogueHash,
    productionCatalogue.catalogueHash);
});

await check("ten_nonempty_chapters_cover_all_atoms_once", () => {
  const chapters = staged.evidence[0].content.chapters;
  const entries = chapters.flatMap((chapter) => chapter.entries);
  assert.equal(chapters.length, 10);
  assert(chapters.every((chapter) => chapter.entries.length > 0));
  assert.equal(entries.length, 1163);
  assert.equal(new Set(entries.map((entry) => entry.evidenceId)).size, 1163);
});

await check("executable_and_display_only_denominators_remain_separate", () => {
  const counts = staged.evidence[0].content.counts;
  assert.equal(counts.executableRuleAtoms, 1049);
  assert.equal(counts.displayOnlyRuleAtoms, 114);
  assert.equal(staged.evidence[0].content.retrievalContract
    .displayOnlyAtomsMayExplainHistoryButCannotSeedCurrentClaims, true);
});

await check("every_index_entry_retains_content_locator_and_current_rules_hashes", () => {
  for (const entry of staged.evidence[0].content.chapters
    .flatMap((chapter) => chapter.entries)) {
    assert.match(entry.contentHash, /^[a-f0-9]{64}$/u);
    assert.match(entry.locatorHash, /^[a-f0-9]{64}$/u);
    assert.equal(entry.rulesReceiptHash, staged.bindings.rules.receiptHash);
  }
});

await check("index_is_compact_and_requires_lazy_full_atom_retrieval", () => {
  const bytes = Buffer.byteLength(JSON.stringify(staged), "utf8");
  assert(bytes < 1_000_000);
  assert.equal(staged.evidence[0].content.retrievalContract
    .retrieveFullCurrentAtomByEvidenceId, true);
  assert.equal(staged.evidence[0].content.retrievalContract
    .callAuthoritativeRulesForLegalSpaceAndTransitions, true);
});

await check("worker_authority_remains_offline_candidate_only", () => {
  assert.equal(staged.capabilities.network, false);
  assert.equal(staged.capabilities.mutableRulesRuntime, false);
  assert.equal(staged.capabilities.skillPublish, false);
  assert.equal(staged.capabilities.trainingWrite, false);
  assert.equal(staged.candidateAuthority, "unreviewed_only");
  assert.equal(staged.trainingTruth, false);
});

const failures = checks.filter((row) => !row.passed);
const reportBody = {
  schemaVersion: "starcraft_tmg_ticket_17_slice_170_how_to_play_input_report_v1",
  ticket: 17,
  slice: 170,
  generatedAt: "2026-09-04T20:40:00.000Z",
  status: failures.length === 0 ? "passed" : "failed",
  assertionsPassed: checks.length - failures.length,
  assertionsTotal: checks.length,
  checks,
  productionCatalogueHash: productionCatalogue.catalogueHash,
  taskHash: staged.task.taskHash,
  stagedInputHash: staged.stagedInputHash,
  evidenceContentHash: staged.evidence[0].contentHash,
  serializedBytes: Buffer.byteLength(JSON.stringify(staged), "utf8"),
  counts: staged.evidence[0].content.counts,
  externalProviderCalls: 0,
  externalBillableTokens: 0,
  candidatesGenerated: 0,
  candidatesPromoted: 0,
  sourceRefreshPerformed: false,
  trainingTruth: false,
};
const report = { ...reportBody, reportHash: hashStarcraftTmgContract(reportBody) };
await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
await writeFile(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
if (failures.length > 0) process.exitCode = 1;
