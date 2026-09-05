#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import {
  createStarcraftTmgProductionSkillCatalogueV1,
  verifyStarcraftTmgProductionSkillCatalogueV1,
} from "../packages/skill-generation-runtime/production-skill-catalogue-v1.mjs";
import { loadCurrentOfficialSkillFixtureV1 } from
  "./support/current-official-skill-fixture-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_PATH = path.join(
  ROOT,
  "build/ticket-17-skill-generation-v1/slice-170-production-catalogue-report.json",
);
const fixture = await loadCurrentOfficialSkillFixtureV1({ root: ROOT });
const catalogue = createStarcraftTmgProductionSkillCatalogueV1(fixture);
const checks = [];

async function check(id, operation) {
  try {
    await operation();
    checks.push({ id, passed: true });
  } catch (error) {
    checks.push({
      id,
      passed: false,
      error: error instanceof Error ? error.stack || error.message : String(error),
    });
  }
}

await check("production_catalogue_is_hash_bound_to_current_curriculum", () => {
  assert.equal(verifyStarcraftTmgProductionSkillCatalogueV1(catalogue, fixture), true);
  assert.equal(catalogue.curriculumHash, fixture.curriculum.curriculumHash);
  assert.equal(catalogue.sourceRefreshPerformed, false);
});

await check("final_denominator_is_53_skills_not_1101", () => {
  assert.equal(catalogue.counts.productionSkills, 53);
  assert.deepEqual(catalogue.counts.byFamily, {
    how_to_play: 1,
    mission: 10,
    faction: 6,
    matchup: 36,
  });
  assert.equal(catalogue.distinction.curriculumTasksAreProductionSkills, false);
});

await check("one_how_to_play_skill_indexes_every_current_rule_atom", () => {
  const rows = catalogue.skills.filter((skill) => skill.family === "how_to_play");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].sourceTaskIds.length, 1163);
  assert.equal(rows[0].generationUnitTaskIds.length, 1049);
  assert.equal(rows[0].blockedReferenceTaskIds.length, 114);
  assert.equal(rows[0].materialization.lazyRuleAtomRetrievalRequired, true);
  assert.equal(rows[0].materialization.directOnePromptDumpAllowed, false);
});

await check("mission_faction_and_directed_matchup_groups_are_exact", () => {
  assert.equal(catalogue.skills.filter((row) => row.family === "mission").length, 10);
  assert.equal(catalogue.skills.filter((row) => row.family === "faction").length, 6);
  assert.equal(catalogue.skills.filter((row) => row.family === "matchup").length, 36);
  assert(catalogue.skills.some((row) => (
    row.skillId === "skill.starcraft-tmg.faction.tactical-cards-kerrigan-s-swarm"
  )));
});

await check("all_1101_generation_work_units_are_assigned_once", () => {
  const ids = catalogue.skills.flatMap((skill) => skill.generationUnitTaskIds);
  assert.equal(ids.length, 1101);
  assert.equal(new Set(ids).size, 1101);
});

await check("matchup_skills_depend_on_rules_and_both_faction_skills", () => {
  for (const skill of catalogue.skills.filter((row) => row.family === "matchup")) {
    assert(skill.dependencies.includes("skill.starcraft-tmg.how-to-play"));
    assert(skill.dependencies.length >= 2 && skill.dependencies.length <= 3);
  }
});

await check("accepted_total_rules_skill_gates_every_downstream_generation_wave", () => {
  assert.deepEqual(catalogue.generationWaves, [
    ["how_to_play"],
    ["mission", "faction"],
    ["matchup"],
  ]);
  assert.equal(catalogue.dependencyGate
    .howToPlayMustBeAcceptedBeforeDownstreamGeneration, true);
  assert.deepEqual(catalogue.dependencyGate.acceptedDependencyStatuses,
    ["replay_passed", "human_reviewed"]);
  assert.equal(catalogue.dependencyGate
    .staleOrMissingDependencyFailsClosed, true);
});

await check("catalogue_has_zero_runtime_or_training_authority", () => {
  assert.equal(catalogue.productionReady, false);
  assert.equal(catalogue.candidatesGenerated, 0);
  assert.equal(catalogue.candidatesPromoted, 0);
  assert.equal(catalogue.trainingTruth, false);
  assert(catalogue.skills.every((skill) => (
    skill.publicationAuthority === false && skill.humanReviewRequired === true
  )));
});

const failures = checks.filter((row) => !row.passed);
const reportBody = {
  schemaVersion: "starcraft_tmg_ticket_17_slice_170_production_skill_catalogue_report_v1",
  ticket: 17,
  slice: 170,
  generatedAt: "2026-09-04T20:30:00.000Z",
  status: failures.length === 0 ? "passed" : "failed",
  assertionsPassed: checks.length - failures.length,
  assertionsTotal: checks.length,
  checks,
  catalogueHash: catalogue.catalogueHash,
  counts: catalogue.counts,
  externalProviderCalls: 0,
  externalBillableTokens: 0,
  sourceRefreshPerformed: false,
  candidatesGenerated: 0,
  candidatesPromoted: 0,
  trainingTruth: false,
};
const report = {
  ...reportBody,
  reportHash: hashStarcraftTmgContract(reportBody),
};
await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
await writeFile(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
if (failures.length > 0) process.exitCode = 1;
