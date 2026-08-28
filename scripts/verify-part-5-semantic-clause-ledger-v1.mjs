#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { OFFICIAL_PART_5_SEMANTIC_REVIEW_BINDING_V1 } from "../content/official-part-5-semantic-review-binding-v1.mjs";
import {
  createPartSemanticClauseLedger,
  verifyPartSemanticClauseLedger,
} from "../packages/rule-atoms/part-semantic-clause-ledger-v1.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const OUTPUT_DIR = path.join(ROOT, "build", "ticket-11-rule-atoms-v1");
const denominator = JSON.parse(await readFile(
  path.join(OUTPUT_DIR, "core-clause-candidate-denominator-report.json"),
  "utf8",
)).denominator;
const reviewPacket = JSON.parse(await readFile(
  path.join(OUTPUT_DIR, "part-5-semantic-review-packet.json"),
  "utf8",
));

const acceptance = [];
function check(id, fn) {
  try {
    fn();
    acceptance.push({ id, passed: true });
  } catch (error) {
    acceptance.push({ id, passed: false, error: String(error?.stack || error) });
  }
}

const ledger = createPartSemanticClauseLedger({
  denominator,
  reviewedBinding: OFFICIAL_PART_5_SEMANTIC_REVIEW_BINDING_V1,
});
const audit = verifyPartSemanticClauseLedger({ denominator, ledger });

check("part_5_is_pinned_to_current_official_evidence", () => {
  assert.equal(ledger.sourcePart, "5");
  assert.equal(ledger.coreClauseCandidateDenominatorHash, denominator.denominatorHash);
  assert.equal(ledger.reviewPacketHash, reviewPacket.packetHash);
  assert.equal(ledger.sourceContentHash, denominator.sourceSnapshot.contentHash);
});

check("all_137_candidates_are_classified_once", () => {
  assert.equal(audit.counts.sourceCandidates, 137);
  assert.equal(audit.counts.classifiedCandidates, 137);
  assert.equal(audit.counts.unclassifiedCandidates, 0);
  assert.equal(audit.counts.duplicateCandidateAssignments, 0);
  assert.equal(audit.counts.outOfPartCandidateAssignments, 0);
});

check("part_5_has_64_reviewed_semantic_boundaries", () => {
  assert.equal(ledger.partCanonicalClauseCount, 64);
  assert.equal(audit.counts.canonicalClauses, 64);
  assert.equal(ledger.globalCanonicalClauseCount, null);
});

check("part_5_dispositions_grant_no_execution", () => {
  assert.deepEqual(audit.counts.byDisposition, {
    executable: 0,
    display_only: 11,
    review_required: 53,
    quarantined: 0,
  });
  assert.ok(ledger.canonicalClauses.every((clause) => clause.executable === false));
});

check("split_card_fields_are_joined_into_reviewed_units", () => {
  const byId = new Map(ledger.canonicalClauses.map((clause) => [clause.clauseId, clause]));
  assert.deepEqual(byId.get("core:5.1:speed-split-value")?.candidateOrdinals, [5, 6]);
  assert.deepEqual(byId.get("core:5.1:shield-lifecycle")?.candidateOrdinals, [20, 21, 22]);
  assert.deepEqual(byId.get("core:5.6:zone-of-influence")?.candidateOrdinals, [15, 16, 17, 18]);
});

check("flavour_name_labels_and_cross_reference_are_display_only", () => {
  assert.deepEqual(
    ledger.canonicalClauses
      .filter((clause) => clause.disposition === "display_only")
      .map((clause) => clause.clauseId)
      .sort(),
    [
      "core:5.1:card-overview",
      "core:5.1:unit-name-field",
      "core:5.2:flavour-text-field",
      "core:5.3:tactical-card-name-field",
      "core:5.3:tactical-card-overview",
      "core:5.4:faction-card-overview",
      "core:5.5:mission-card-name-field",
      "core:5.5:mission-card-overview",
      "core:5.6:deployment-card-name-field",
      "core:5.6:deployment-card-overview",
      "core:5.6:setup-cross-reference",
    ],
  );
});

check("all_six_part_5_anchors_are_clause_bearing", () => {
  assert.equal(audit.counts.sourceAnchors, 6);
  assert.equal(audit.counts.clauseBearingAnchors, 6);
  assert.equal(audit.counts.structuralContainers, 0);
});

check("tracked_ledger_contains_no_rule_prose", () => {
  const serialized = JSON.stringify(ledger);
  assert.equal(serialized.includes('"text"'), false);
  assert.equal(serialized.includes('"excerpt"'), false);
  assert.equal(serialized.includes("Every Unit has a Unit Card"), false);
});

check("coverage_and_dependency_tamper_fail_closed", () => {
  const gap = structuredClone(OFFICIAL_PART_5_SEMANTIC_REVIEW_BINDING_V1);
  gap.clauses.splice(0, 1);
  assert.throws(() => createPartSemanticClauseLedger({ denominator, reviewedBinding: gap }),
    /part_semantic_candidate_coverage_invalid/);
  const drift = structuredClone(OFFICIAL_PART_5_SEMANTIC_REVIEW_BINDING_V1);
  drift.coreClauseCandidateDenominatorHash = "0".repeat(64);
  assert.throws(() => createPartSemanticClauseLedger({ denominator, reviewedBinding: drift }),
    /part_semantic_binding_dependency_mismatch/);
});

check("rule_skill_and_training_promotion_remain_blocked", () => {
  assert.equal(ledger.rulesEligible, false);
  assert.equal(ledger.canAffectRules, false);
  assert.equal(ledger.ctx2skillPromotionEligible, false);
  assert.equal(ledger.trainingTruth, false);
});

const failures = acceptance.filter((item) => !item.passed);
const report = {
  schema: "starcraft_tmg_part_5_semantic_clause_ledger_verification_v1",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length - failures.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  failures,
  ledger,
  audit,
  rulesTruth: false,
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(OUTPUT_DIR, "part-5-semantic-clause-ledger-report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);
console.log(JSON.stringify({
  schema: report.schema,
  acceptancePassed: report.acceptancePassed,
  acceptanceTotal: report.acceptanceTotal,
  failures,
  ledgerHash: ledger.ledgerHash,
  counts: audit.counts,
  globalCanonicalClauseCount: null,
  rulesTruth: false,
  trainingTruth: false,
}, null, 2));
if (failures.length > 0) process.exitCode = 1;
