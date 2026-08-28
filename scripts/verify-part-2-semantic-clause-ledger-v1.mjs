#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { OFFICIAL_PART_2_SEMANTIC_REVIEW_BINDING_V1 } from "../content/official-part-2-semantic-review-binding-v1.mjs";
import {
  createPartSemanticClauseLedger,
  verifyPartSemanticClauseLedger,
} from "../packages/rule-atoms/part-semantic-clause-ledger-v1.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const OUTPUT_DIR = path.join(ROOT, "build", "ticket-11-rule-atoms-v1");
const denominatorReport = JSON.parse(await readFile(
  path.join(OUTPUT_DIR, "core-clause-candidate-denominator-report.json"),
  "utf8",
));
const denominator = denominatorReport.denominator;
const reviewPacket = JSON.parse(await readFile(
  path.join(OUTPUT_DIR, "part-2-semantic-review-packet.json"),
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
  reviewedBinding: OFFICIAL_PART_2_SEMANTIC_REVIEW_BINDING_V1,
});
const audit = verifyPartSemanticClauseLedger({ denominator, ledger });

check("part_2_dependency_is_exactly_source_pinned", () => {
  assert.equal(ledger.sourcePart, "2");
  assert.equal(ledger.coreClauseCandidateDenominatorHash, denominator.denominatorHash);
  assert.equal(ledger.reviewPacketHash, reviewPacket.packetHash);
  assert.equal(ledger.sourceContentHash, denominator.sourceSnapshot.contentHash);
  assert.match(ledger.ledgerHash, /^[a-f0-9]{64}$/u);
});

check("all_81_part_2_candidates_are_classified_once", () => {
  assert.equal(audit.counts.sourceCandidates, 81);
  assert.equal(audit.counts.classifiedCandidates, 81);
  assert.equal(audit.counts.unclassifiedCandidates, 0);
  assert.equal(audit.counts.duplicateCandidateAssignments, 0);
  assert.equal(audit.counts.outOfPartCandidateAssignments, 0);
});

check("reviewed_boundary_denominator_is_56_without_global_claim", () => {
  assert.equal(ledger.partCanonicalClauseCount, 56);
  assert.equal(audit.counts.canonicalClauses, 56);
  assert.equal(ledger.globalCanonicalClauseCount, null);
  assert.equal(ledger.globalDenominatorStatus, "incomplete_other_parts_pending");
});

check("part_2_dispositions_are_conservative", () => {
  assert.deepEqual(audit.counts.byDisposition, {
    executable: 0,
    display_only: 6,
    review_required: 50,
    quarantined: 0,
  });
  assert.ok(ledger.canonicalClauses.every((clause) => clause.executable === false));
  assert.ok(ledger.canonicalClauses.every((clause) => clause.trainingTruth === false));
});

check("mechanically_split_or_related_sentences_are_bound_as_reviewed_units", () => {
  const byId = new Map(ledger.canonicalClauses.map((clause) => [clause.clauseId, clause]));
  assert.deepEqual(byId.get("core:2.6.1:keyword-format")?.candidateOrdinals, [1, 2]);
  assert.deepEqual(byId.get("core:2.7.3:same-name-reaction-limit")?.candidateOrdinals, [6, 7, 8, 9]);
  assert.deepEqual(byId.get("core:2.3:base-rules-interface")?.candidateOrdinals, [1, 2, 3]);
});

check("display_only_examples_rationale_and_cross_references_are_explicit", () => {
  assert.deepEqual(
    ledger.canonicalClauses
      .filter((clause) => clause.disposition === "display_only")
      .map((clause) => clause.clauseId)
      .sort(),
    [
      "core:2.2:composition-example",
      "core:2.3:base-size-rationale",
      "core:2.3:scenic-examples",
      "core:2.6.1:glossary-cross-reference",
      "core:2.7.3:reaction-examples",
      "core:2.7:part-10-cross-reference",
    ],
  );
});

check("structural_parent_is_accounted_without_fake_clause", () => {
  assert.deepEqual(ledger.structuralContainerAnchorIds, ["core:numbered:2.6"]);
  assert.equal(audit.counts.structuralContainers, 1);
  assert.equal(audit.counts.sourceAnchors, 14);
  assert.equal(audit.counts.clauseBearingAnchors, 13);
});

check("tracked_ledger_contains_no_copyright_rule_text", () => {
  const serialized = JSON.stringify(ledger);
  assert.equal(serialized.includes('"text"'), false);
  assert.equal(serialized.includes('"excerpt"'), false);
  assert.equal(serialized.includes("Every Archon Studio miniature"), false);
});

check("binding_dependency_drift_fails_closed", () => {
  const drifted = structuredClone(OFFICIAL_PART_2_SEMANTIC_REVIEW_BINDING_V1);
  drifted.coreClauseCandidateDenominatorHash = "0".repeat(64);
  assert.throws(() => createPartSemanticClauseLedger({
    denominator,
    reviewedBinding: drifted,
  }), /part_semantic_binding_dependency_mismatch/);
});

check("overlap_or_gap_in_reviewed_boundaries_fails_closed", () => {
  const overlap = structuredClone(OFFICIAL_PART_2_SEMANTIC_REVIEW_BINDING_V1);
  overlap.clauses[1].candidateOrdinalStart = 1;
  assert.throws(() => createPartSemanticClauseLedger({
    denominator,
    reviewedBinding: overlap,
  }), /part_semantic_candidate_coverage_invalid/);
  const gap = structuredClone(OFFICIAL_PART_2_SEMANTIC_REVIEW_BINDING_V1);
  gap.clauses.splice(1, 1);
  assert.throws(() => createPartSemanticClauseLedger({
    denominator,
    reviewedBinding: gap,
  }), /part_semantic_candidate_coverage_invalid/);
});

check("ledger_hash_and_non_authority_flags_detect_tamper", () => {
  const hashTamper = structuredClone(ledger);
  hashTamper.canonicalClauses[0].candidateOrdinals.push(99);
  assert.throws(() => verifyPartSemanticClauseLedger({
    denominator,
    ledger: hashTamper,
  }), /part_semantic_ledger_hash_mismatch/);
  assert.equal(ledger.rulesEligible, false);
  assert.equal(ledger.canAffectRules, false);
  assert.equal(ledger.trainingTruth, false);
});

check("ctx2skill_and_training_promotion_remain_blocked", () => {
  assert.ok(ledger.blocks.includes("rule_atom_mapping_pending"));
  assert.ok(ledger.blocks.includes("judge_and_replay_evidence_pending"));
  assert.ok(ledger.blocks.includes("other_core_parts_semantic_review_pending"));
  assert.equal(ledger.ctx2skillPromotionEligible, false);
  assert.equal(ledger.trainingTruth, false);
});

const failures = acceptance.filter((item) => !item.passed);
const report = {
  schema: "starcraft_tmg_part_2_semantic_clause_ledger_verification_v1",
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
  path.join(OUTPUT_DIR, "part-2-semantic-clause-ledger-report.json"),
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
