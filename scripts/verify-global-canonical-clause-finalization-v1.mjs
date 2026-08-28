#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { GLOBAL_CANONICAL_CLAUSE_SINGLETON_FINALIZATION_POLICY_V1 } from "../content/global-canonical-clause-singleton-finalization-policy-v1.mjs";
import {
  createGlobalCanonicalClauseFinalizationV1,
  verifyGlobalCanonicalClauseFinalizationV1,
} from "../packages/rule-atoms/global-canonical-clause-finalization-v1.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const OUTPUT_DIR = path.join(ROOT, "build", "ticket-11-rule-atoms-v1");

async function report(name) {
  return JSON.parse(await readFile(path.join(OUTPUT_DIR, name), "utf8"));
}

const plan = (await report("global-canonical-clause-merge-plan-v1-report.json")).plan;
const previousBatches = await Promise.all([1, 2, 3].map(async (ordinal) => (
  (await report(`global-canonical-clause-merge-batch-${ordinal}-v1-report.json`)).batch
)));
const residualMergeBatch = (await report(
  "global-canonical-clause-residual-merge-batch-4-v1-report.json",
)).batch;
const input = {
  plan,
  previousBatches,
  residualMergeBatch,
  finalizationPolicy: GLOBAL_CANONICAL_CLAUSE_SINGLETON_FINALIZATION_POLICY_V1,
};
const finalization = createGlobalCanonicalClauseFinalizationV1(input);
const audit = verifyGlobalCanonicalClauseFinalizationV1({ ...input, finalization });

const acceptance = [];
function check(id, fn) {
  try {
    fn();
    acceptance.push({ id, passed: true });
  } catch (error) {
    acceptance.push({ id, passed: false, error: String(error?.stack || error) });
  }
}

check("finalization_binds_the_frozen_plan_three_batches_and_residual_merge", () => {
  assert.equal(finalization.globalMergePlanHash, plan.planHash);
  assert.deepEqual(finalization.previousBatchHashes, previousBatches.map((batch) => batch.batchHash));
  assert.equal(finalization.residualMergeBatchHash, residualMergeBatch.batchHash);
  assert.match(finalization.finalizationPolicyHash, /^[a-f0-9]{64}$/u);
});

check("all_one_thousand_ninety_three_local_clauses_map_exactly_once", () => {
  assert.equal(audit.counts.localClauses, 1093);
  assert.equal(audit.counts.mappedLocalClauses, 1093);
  assert.equal(audit.counts.unmappedLocalClauses, 0);
  assert.equal(audit.counts.duplicateLocalClauseMappings, 0);
  assert.equal(audit.counts.unknownLocalClauseMappings, 0);
  assert.equal(audit.counts.canonicalClauses, 1026);
  assert.equal(audit.counts.duplicateCanonicalClauseIds, 0);
  assert.equal(audit.counts.singletonCanonicalClauses, 831);
  assert.equal(audit.counts.localToCanonicalReduction, 67);
});

check("source_dispositions_and_rule_atom_eligibility_preserve_the_complete_denominator", () => {
  assert.deepEqual(audit.counts.localClausesByDisposition, {
    review_required: 978,
    display_only: 115,
  });
  assert.equal(audit.counts.ruleAtomEligibleLocalClauses, 978);
  assert.equal(audit.counts.displayOnlyLocalClauses, 115);
  assert.equal(audit.counts.canonicalSourceRows, 1093);
});

check("alias_extensions_replace_the_prior_view_without_rewriting_old_rows", () => {
  const supply = finalization.canonicalClauses.find((clause) => (
    clause.canonicalClauseId === "canonical:available-supply-formula"
  ));
  assert.deepEqual(supply.sourceLocalClauseIds, [
    "core:11:available-supply-formula",
    "core:8.3.2:available-supply-formula",
    "core:12.4:available-supply-formula",
  ]);
  assert.equal(supply.formation, "reviewed_alias_extension");

  const activeTiming = finalization.canonicalClauses.find((clause) => (
    clause.canonicalClauseId === "canonical:active-ability-activation-and-window"
  ));
  assert.deepEqual(activeTiming.sourceLocalClauseIds, [
    "core:2.7.1:active-ability-timing",
    "core:11:active-ability-timing",
  ]);
  assert.equal(audit.counts.changedPreExtensionSourceRows, 0);
});

check("singleton_ids_are_human_navigable_hash_stable_and_source_bound", () => {
  const faq = finalization.localToCanonicalIndex.find((row) => (
    row.localClauseId === "faq:9.43:skirmish-battlefield-dimensions"
  ));
  assert.match(
    faq.canonicalClauseId,
    /^canonical:singleton:faq-9-43-skirmish-battlefield-dimensions:[a-f0-9]{12}$/u,
  );
  const clause = finalization.canonicalClauses.find((row) => (
    row.canonicalClauseId === faq.canonicalClauseId
  ));
  assert.deepEqual(clause.sourceLocalClauseIds, [faq.localClauseId]);
  assert.equal(clause.formation, "residual_singleton");
  assert.match(clause.sourceBindingHash, /^[a-f0-9]{64}$/u);
  assert.equal(createGlobalCanonicalClauseFinalizationV1(input).finalizationHash,
    finalization.finalizationHash);
});

check("catalogue_and_local_index_are_hash_bound_without_rule_prose", () => {
  assert.match(finalization.canonicalCatalogueHash, /^[a-f0-9]{64}$/u);
  assert.match(finalization.localToCanonicalIndexHash, /^[a-f0-9]{64}$/u);
  for (const clause of finalization.canonicalClauses) {
    assert.equal(clause.sourceLocalClauseIds.length, clause.sourceRows.length);
    assert.match(clause.sourceBindingHash, /^[a-f0-9]{64}$/u);
  }
  const serialized = JSON.stringify(finalization);
  for (const forbidden of ["\"title\"", "\"text\"", "\"excerpt\"", "\"answer\"", "\"question\""]) {
    assert.equal(serialized.includes(forbidden), false);
  }
});

check("dependency_policy_or_catalogue_drift_fails_closed", () => {
  const dependencyDrift = structuredClone(residualMergeBatch);
  dependencyDrift.remainingLocalClauseCount += 1;
  assert.throws(() => createGlobalCanonicalClauseFinalizationV1({
    ...input,
    residualMergeBatch: dependencyDrift,
  }), /global_canonical_finalization_residual_batch_dependency_mismatch/);

  const policyDrift = structuredClone(GLOBAL_CANONICAL_CLAUSE_SINGLETON_FINALIZATION_POLICY_V1);
  policyDrift.canonicalIdHashPrefixLength = 8;
  assert.throws(() => createGlobalCanonicalClauseFinalizationV1({
    ...input,
    finalizationPolicy: policyDrift,
  }), /global_canonical_finalization_policy_invalid/);

  const catalogueDrift = structuredClone(finalization);
  catalogueDrift.canonicalClauses[0].sourceLocalClauseIds[0] = "core:unknown";
  assert.throws(() => verifyGlobalCanonicalClauseFinalizationV1({
    ...input,
    finalization: catalogueDrift,
  }), /global_canonical_finalization_hash_mismatch/);
});

check("canonical_mapping_completion_grants_no_rule_skill_replay_or_training_authority", () => {
  assert.equal(finalization.canonicalMappingComplete, true);
  assert.equal(finalization.globalCanonicalClauseCount, 1026);
  assert.equal(finalization.ruleAtomMappingComplete, false);
  assert.equal(finalization.rulesEligible, false);
  assert.equal(finalization.canAffectRules, false);
  assert.equal(finalization.ctx2skillPromotionEligible, false);
  assert.equal(finalization.replayEligible, false);
  assert.equal(finalization.trainingTruth, false);
});

const failures = acceptance.filter((item) => !item.passed);
const reportBody = {
  schema: "starcraft_tmg_global_canonical_clause_finalization_verification_v1",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length - failures.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  failures,
  finalization,
  audit,
  ctx2skill: {
    ctx2skillLoopUsed: true,
    targetGames: ["starcraft-tmg"],
    roleRoutes: ["rule_skill_builder", "referee"],
    skillsRead: [],
    skillsGenerated: [],
    judgeTestsRun: acceptance.length,
    crossTimeReplayResult: "pending_rule_atom_executor_judge_and_replay",
    promotions: [],
    blocks: finalization.blocks,
    remainingRuleGaps: 1026,
  },
  rulesTruth: false,
  trainingTruth: false,
};

await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(OUTPUT_DIR, "global-canonical-clause-finalization-v1-report.json"),
  `${JSON.stringify(reportBody, null, 2)}\n`,
  "utf8",
);
console.log(JSON.stringify({
  schema: reportBody.schema,
  acceptancePassed: reportBody.acceptancePassed,
  acceptanceTotal: reportBody.acceptanceTotal,
  failures,
  finalizationHash: finalization.finalizationHash,
  canonicalCatalogueHash: finalization.canonicalCatalogueHash,
  counts: audit.counts,
  globalCanonicalClauseCount: finalization.globalCanonicalClauseCount,
  rulesTruth: false,
  trainingTruth: false,
}, null, 2));
if (failures.length > 0) process.exitCode = 1;
