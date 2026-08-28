#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { OFFICIAL_PART_7_SEMANTIC_REVIEW_BINDING_V1 } from "../content/official-part-7-semantic-review-binding-v1.mjs";
import { createPartSemanticClauseLedger, verifyPartSemanticClauseLedger } from "../packages/rule-atoms/part-semantic-clause-ledger-v1.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const OUTPUT_DIR = path.join(ROOT, "build", "ticket-11-rule-atoms-v1");
const denominator = JSON.parse(await readFile(path.join(OUTPUT_DIR, "core-clause-candidate-denominator-report.json"), "utf8")).denominator;
const reviewPacket = JSON.parse(await readFile(path.join(OUTPUT_DIR, "part-7-semantic-review-packet.json"), "utf8"));

const acceptance = [];
function check(id, fn) {
  try { fn(); acceptance.push({ id, passed: true }); } catch (error) {
    acceptance.push({ id, passed: false, error: String(error?.stack || error) });
  }
}

const ledger = createPartSemanticClauseLedger({ denominator, reviewedBinding: OFFICIAL_PART_7_SEMANTIC_REVIEW_BINDING_V1 });
const audit = verifyPartSemanticClauseLedger({ denominator, ledger });

check("part_7_is_pinned_to_current_official_evidence", () => {
  assert.equal(ledger.sourcePart, "7");
  assert.equal(ledger.coreClauseCandidateDenominatorHash, denominator.denominatorHash);
  assert.equal(ledger.reviewPacketHash, reviewPacket.packetHash);
});
check("all_118_candidates_are_classified_once", () => {
  assert.equal(audit.counts.sourceCandidates, 118);
  assert.equal(audit.counts.classifiedCandidates, 118);
  assert.equal(audit.counts.unclassifiedCandidates, 0);
  assert.equal(audit.counts.duplicateCandidateAssignments, 0);
});
check("part_7_has_62_reviewed_semantic_boundaries", () => {
  assert.equal(ledger.partCanonicalClauseCount, 62);
  assert.equal(audit.counts.canonicalClauses, 62);
  assert.equal(ledger.globalCanonicalClauseCount, null);
});
check("part_7_dispositions_grant_no_execution", () => {
  assert.deepEqual(audit.counts.byDisposition, { executable: 0, display_only: 11, review_required: 51, quarantined: 0 });
});
check("los_cover_summary_and_marker_units_are_grouped", () => {
  const byId = new Map(ledger.canonicalClauses.map((clause) => [clause.clauseId, clause]));
  assert.deepEqual(byId.get("core:7.1:blocking-terrain-cover-check")?.candidateOrdinals, [8, 9, 10]);
  assert.deepEqual(byId.get("core:7.1.1:independent-terrain-cover")?.candidateOrdinals, [4, 5, 6]);
  assert.deepEqual(byId.get("core:7.1.4:los-method-summary")?.candidateOrdinals, Array.from({ length: 15 }, (_, index) => index + 6));
  assert.deepEqual(byId.get("core:7.3.2:first-player-marker")?.candidateOrdinals, [17, 18, 19]);
});
check("visual_examples_advice_and_summary_tables_are_display_only", () => {
  assert.deepEqual(ledger.canonicalClauses.filter((clause) => clause.disposition === "display_only").map((clause) => clause.clauseId).sort(), [
    "core:7.1.1:close-quarters-example",
    "core:7.1.1:elevation-dead-zone-example",
    "core:7.1.2:effective-size-example",
    "core:7.1.2:high-ground-tactical-advice",
    "core:7.1.2:stacked-elevation-example",
    "core:7.1.4:cover-summary-table",
    "core:7.1.4:engaged-units-heading",
    "core:7.1.4:high-ground-designer-note",
    "core:7.1.4:los-method-summary",
    "core:7.1:los-designer-note",
    "core:7.1:los-examples",
  ]);
});
check("structural_parent_is_accounted_without_fake_clause", () => {
  assert.deepEqual(ledger.structuralContainerAnchorIds, ["core:numbered:7.3"]);
  assert.equal(audit.counts.sourceAnchors, 11);
  assert.equal(audit.counts.clauseBearingAnchors, 10);
  assert.equal(audit.counts.structuralContainers, 1);
});
check("tracked_ledger_contains_no_rule_prose", () => {
  const serialized = JSON.stringify(ledger);
  assert.equal(serialized.includes('"text"'), false);
  assert.equal(serialized.includes('"excerpt"'), false);
});
check("coverage_and_promotion_gates_fail_closed", () => {
  const gap = structuredClone(OFFICIAL_PART_7_SEMANTIC_REVIEW_BINDING_V1);
  gap.clauses.splice(0, 1);
  assert.throws(() => createPartSemanticClauseLedger({ denominator, reviewedBinding: gap }), /part_semantic_candidate_coverage_invalid/);
  assert.equal(ledger.rulesEligible, false);
  assert.equal(ledger.ctx2skillPromotionEligible, false);
  assert.equal(ledger.trainingTruth, false);
});

const failures = acceptance.filter((item) => !item.passed);
const report = { schema: "starcraft_tmg_part_7_semantic_clause_ledger_verification_v1", generatedAt: new Date().toISOString(), acceptancePassed: acceptance.length - failures.length, acceptanceTotal: acceptance.length, acceptance, failures, ledger, audit, rulesTruth: false, trainingTruth: false };
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(path.join(OUTPUT_DIR, "part-7-semantic-clause-ledger-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ schema: report.schema, acceptancePassed: report.acceptancePassed, acceptanceTotal: report.acceptanceTotal, failures, ledgerHash: ledger.ledgerHash, counts: audit.counts, globalCanonicalClauseCount: null, rulesTruth: false, trainingTruth: false }, null, 2));
if (failures.length > 0) process.exitCode = 1;
