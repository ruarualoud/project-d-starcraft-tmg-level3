#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { OFFICIAL_PART_6_SEMANTIC_REVIEW_BINDING_V1 } from "../content/official-part-6-semantic-review-binding-v1.mjs";
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
  path.join(OUTPUT_DIR, "part-6-semantic-review-packet.json"),
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
  reviewedBinding: OFFICIAL_PART_6_SEMANTIC_REVIEW_BINDING_V1,
});
const audit = verifyPartSemanticClauseLedger({ denominator, ledger });

check("part_6_is_pinned_to_current_official_evidence", () => {
  assert.equal(ledger.sourcePart, "6");
  assert.equal(ledger.coreClauseCandidateDenominatorHash, denominator.denominatorHash);
  assert.equal(ledger.reviewPacketHash, reviewPacket.packetHash);
});

check("all_30_candidates_are_classified_once", () => {
  assert.equal(audit.counts.sourceCandidates, 30);
  assert.equal(audit.counts.classifiedCandidates, 30);
  assert.equal(audit.counts.unclassifiedCandidates, 0);
  assert.equal(audit.counts.duplicateCandidateAssignments, 0);
});

check("part_6_has_19_reviewed_semantic_boundaries", () => {
  assert.equal(ledger.partCanonicalClauseCount, 19);
  assert.equal(audit.counts.canonicalClauses, 19);
  assert.equal(ledger.globalCanonicalClauseCount, null);
});

check("part_6_dispositions_grant_no_execution", () => {
  assert.deepEqual(audit.counts.byDisposition, {
    executable: 0,
    display_only: 6,
    review_required: 13,
    quarantined: 0,
  });
});

check("supply_examples_windows_and_control_are_grouped", () => {
  const byId = new Map(ledger.canonicalClauses.map((clause) => [clause.clauseId, clause]));
  assert.deepEqual(byId.get("core:6.1:supply-example")?.candidateOrdinals, [3, 4, 5]);
  assert.deepEqual(byId.get("core:6.2:final-round-unlimited-supply")?.candidateOrdinals, [5, 6]);
  assert.deepEqual(byId.get("core:6.2:marker-control")?.candidateOrdinals, [7, 8, 9]);
});

check("rationale_designer_note_and_los_diagram_are_display_only", () => {
  assert.deepEqual(
    ledger.canonicalClauses
      .filter((clause) => clause.disposition === "display_only")
      .map((clause) => clause.clauseId)
      .sort(),
    [
      "core:6.1:supply-example",
      "core:6.2:disengage-rationale",
      "core:6.2:los-diagram",
      "core:6.2:supply-designer-note",
      "core:6.2:tactical-mass-intro",
      "core:6.2:tactical-mass-rationale",
    ],
  );
});

check("both_part_6_anchors_are_clause_bearing", () => {
  assert.equal(audit.counts.sourceAnchors, 2);
  assert.equal(audit.counts.clauseBearingAnchors, 2);
  assert.equal(audit.counts.structuralContainers, 0);
});

check("tracked_ledger_contains_no_rule_prose", () => {
  const serialized = JSON.stringify(ledger);
  assert.equal(serialized.includes('"text"'), false);
  assert.equal(serialized.includes('"excerpt"'), false);
});

check("coverage_dependency_rule_skill_and_training_gates_fail_closed", () => {
  const gap = structuredClone(OFFICIAL_PART_6_SEMANTIC_REVIEW_BINDING_V1);
  gap.clauses.splice(0, 1);
  assert.throws(() => createPartSemanticClauseLedger({ denominator, reviewedBinding: gap }),
    /part_semantic_candidate_coverage_invalid/);
  assert.equal(ledger.rulesEligible, false);
  assert.equal(ledger.ctx2skillPromotionEligible, false);
  assert.equal(ledger.trainingTruth, false);
});

const failures = acceptance.filter((item) => !item.passed);
const report = {
  schema: "starcraft_tmg_part_6_semantic_clause_ledger_verification_v1",
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
  path.join(OUTPUT_DIR, "part-6-semantic-clause-ledger-report.json"),
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
