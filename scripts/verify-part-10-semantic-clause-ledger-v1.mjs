#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { OFFICIAL_PART_10_SEMANTIC_REVIEW_BINDING_V1 } from "../content/official-part-10-semantic-review-binding-v1.mjs";
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
  path.join(OUTPUT_DIR, "part-10-semantic-review-packet.json"),
  "utf8",
));

const acceptance = [];
function check(id, fn) {
  try { fn(); acceptance.push({ id, passed: true }); } catch (error) {
    acceptance.push({ id, passed: false, error: String(error?.stack || error) });
  }
}

const ledger = createPartSemanticClauseLedger({
  denominator,
  reviewedBinding: OFFICIAL_PART_10_SEMANTIC_REVIEW_BINDING_V1,
});
const audit = verifyPartSemanticClauseLedger({ denominator, ledger });

check("part_10_is_pinned_to_current_official_evidence", () => {
  assert.equal(ledger.sourcePart, "10");
  assert.equal(ledger.coreClauseCandidateDenominatorHash, denominator.denominatorHash);
  assert.equal(ledger.reviewPacketHash, reviewPacket.packetHash);
});

check("all_69_candidates_are_classified_once", () => {
  assert.equal(audit.counts.sourceCandidates, 69);
  assert.equal(audit.counts.classifiedCandidates, 69);
  assert.equal(audit.counts.unclassifiedCandidates, 0);
  assert.equal(audit.counts.duplicateCandidateAssignments, 0);
});

check("part_10_has_54_reviewed_semantic_boundaries", () => {
  assert.equal(ledger.partCanonicalClauseCount, 54);
  assert.equal(audit.counts.canonicalClauses, 54);
  assert.equal(ledger.globalCanonicalClauseCount, null);
});

check("part_10_dispositions_grant_no_execution", () => {
  assert.deepEqual(audit.counts.byDisposition, {
    executable: 0,
    display_only: 2,
    review_required: 52,
    quarantined: 0,
  });
});

check("ability_timing_frequency_and_resource_boundaries_are_grouped", () => {
  const byId = new Map(ledger.canonicalClauses.map((clause) => [clause.clauseId, clause]));
  assert.deepEqual(byId.get("core:10.1:same-name-nonstacking")?.candidateOrdinals, [13, 14]);
  assert.deepEqual(byId.get("core:10.1:end-round-effect-removal")?.candidateOrdinals, [15, 16]);
  assert.deepEqual(byId.get("core:10.2:named-active-frequency")?.candidateOrdinals,
    [7, 8, 9, 10]);
  assert.deepEqual(byId.get("core:10.4:named-reaction-frequency")?.candidateOrdinals, [7, 8]);
  assert.deepEqual(byId.get("core:10.5.2:card-exhaustion-uses")?.candidateOrdinals, [2]);
});

check("normative_summary_tables_are_retained_for_rule_atom_mapping", () => {
  const byId = new Map(ledger.canonicalClauses.map((clause) => [clause.clauseId, clause]));
  assert.equal(byId.get("core:10.2:ability-type-summary-table")?.disposition, "review_required");
  assert.deepEqual(byId.get("core:10.2:ability-type-summary-table")?.candidateOrdinals,
    [11, 12, 13]);
  assert.equal(byId.get("core:10.4:ability-type-comparison-table")?.disposition,
    "review_required");
  assert.deepEqual(byId.get("core:10.4:ability-type-comparison-table")?.candidateOrdinals,
    [13, 14, 15, 16]);
});

check("all_seven_part_anchors_are_clause_bearing", () => {
  assert.deepEqual(ledger.structuralContainerAnchorIds, []);
  assert.equal(audit.counts.sourceAnchors, 7);
  assert.equal(audit.counts.clauseBearingAnchors, 7);
  assert.equal(audit.counts.structuralContainers, 0);
});

check("tracked_ledger_contains_no_rule_prose", () => {
  const serialized = JSON.stringify(ledger);
  assert.equal(serialized.includes('"text"'), false);
  assert.equal(serialized.includes('"excerpt"'), false);
});

check("coverage_and_promotion_gates_fail_closed", () => {
  const gap = structuredClone(OFFICIAL_PART_10_SEMANTIC_REVIEW_BINDING_V1);
  gap.clauses.splice(0, 1);
  assert.throws(() => createPartSemanticClauseLedger({
    denominator,
    reviewedBinding: gap,
  }), /part_semantic_candidate_coverage_invalid/);
  const drift = structuredClone(OFFICIAL_PART_10_SEMANTIC_REVIEW_BINDING_V1);
  drift.reviewPacketHash = "invalid-review-packet-hash";
  assert.throws(() => createPartSemanticClauseLedger({
    denominator,
    reviewedBinding: drift,
  }), /part_semantic_review_packet_hash_invalid/);
  assert.equal(ledger.rulesEligible, false);
  assert.equal(ledger.ctx2skillPromotionEligible, false);
  assert.equal(ledger.trainingTruth, false);
});

const failures = acceptance.filter((item) => !item.passed);
const report = {
  schema: "starcraft_tmg_part_10_semantic_clause_ledger_verification_v1",
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
  path.join(OUTPUT_DIR, "part-10-semantic-clause-ledger-report.json"),
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
