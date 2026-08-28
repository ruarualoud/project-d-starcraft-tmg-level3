#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { RULE_MATRIX } from "../../scripts/starcraft-tmg-rules-v0.mjs";
import { auditLegacyRuleMatrix } from "../packages/rule-atoms/legacy-rule-matrix-audit-v1.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const OUTPUT_DIR = path.join(ROOT, "build", "ticket-11-rule-atoms-v1");

const acceptance = [];
function check(id, fn) {
  try {
    fn();
    acceptance.push({ id, passed: true });
  } catch (error) {
    acceptance.push({ id, passed: false, error: String(error?.stack || error) });
  }
}

const audit = auditLegacyRuleMatrix(RULE_MATRIX);

check("all_legacy_rows_are_inventoried", () => {
  assert.equal(audit.counts.rows, 69);
  assert.equal(audit.rows.length, 69);
  assert.equal(audit.counts.unclassifiedRows, 0);
});

check("legacy_executable_labels_grant_no_new_authority", () => {
  assert.equal(audit.counts.legacyExecutableLabels, 67);
  assert.equal(audit.counts.authoritativeExecutableRows, 0);
  assert.ok(audit.rows.every((row) => row.canEnterLegalSpace === false));
});

check("gameplay_candidates_require_official_clause_mapping", () => {
  assert.equal(audit.counts.byDisposition.requires_official_clause_mapping, 56);
  assert.ok(audit.rows
    .filter((row) => row.disposition === "requires_official_clause_mapping")
    .every((row) => row.promotionBlockers.includes("official_source_clause_missing")));
});

check("non_rule_rows_are_kept_out_of_rule_denominator", () => {
  assert.equal(audit.counts.byDisposition.product_data_reference, 2);
  assert.equal(audit.counts.byDisposition.derived_analysis_reference, 5);
  assert.equal(audit.counts.byDisposition.platform_reference, 6);
});

check("legacy_fixtures_are_reference_evidence_only", () => {
  assert.equal(audit.counts.fixtureReferences, 68);
  assert.equal(audit.counts.rowsWithoutFixtures, 2);
  assert.deepEqual(audit.rowsWithoutFixtureIds, ["deploy_readiness", "terrain_geometry_gap"]);
  assert.ok(audit.rows.every((row) => row.fixtureAuthority === "reference_only"));
});

check("unknown_family_fails_closed", () => {
  const tampered = structuredClone(RULE_MATRIX);
  tampered[0].family = "mystery";
  assert.throws(() => auditLegacyRuleMatrix(tampered), /unclassified_legacy_rule_family/);
});

check("duplicate_row_or_fixture_identity_fails_closed", () => {
  assert.throws(() => auditLegacyRuleMatrix([...RULE_MATRIX, structuredClone(RULE_MATRIX[0])]), /duplicate_legacy_rule_row/);
  const duplicateFixture = structuredClone(RULE_MATRIX);
  duplicateFixture[1].checkItems = structuredClone(duplicateFixture[0].checkItems);
  assert.throws(() => auditLegacyRuleMatrix(duplicateFixture), /duplicate_legacy_fixture_reference/);
});

check("audit_is_content_hash_bound_and_order_independent", () => {
  assert.match(audit.auditHash, /^[a-f0-9]{64}$/);
  assert.equal(auditLegacyRuleMatrix([...RULE_MATRIX].reverse()).auditHash, audit.auditHash);
});

check("audit_cannot_be_training_or_rules_truth", () => {
  assert.equal(audit.rulesTruth, false);
  assert.equal(audit.trainingTruth, false);
  assert.equal(audit.promotionEligible, false);
});

const failures = acceptance.filter((item) => !item.passed);
const report = {
  schema: "starcraft_tmg_legacy_rule_matrix_audit_verification_v1",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length - failures.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  failures,
  audit,
};

await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(path.join(OUTPUT_DIR, "legacy-rule-matrix-audit-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  schema: report.schema,
  acceptancePassed: report.acceptancePassed,
  acceptanceTotal: report.acceptanceTotal,
  failures,
  auditHash: audit.auditHash,
  counts: audit.counts,
  rulesTruth: false,
  trainingTruth: false,
}, null, 2));
if (failures.length > 0) process.exitCode = 1;
