#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { OFFICIAL_PART_12_SEMANTIC_REVIEW_BINDING_V1 } from "../content/official-part-12-semantic-review-binding-v1.mjs";
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
  path.join(OUTPUT_DIR, "part-12-semantic-review-packet.json"),
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
  reviewedBinding: OFFICIAL_PART_12_SEMANTIC_REVIEW_BINDING_V1,
});
const audit = verifyPartSemanticClauseLedger({ denominator, ledger });

check("part_12_is_pinned_to_current_official_evidence", () => {
  assert.equal(ledger.sourcePart, "12");
  assert.equal(ledger.coreClauseCandidateDenominatorHash, denominator.denominatorHash);
  assert.equal(ledger.reviewPacketHash, reviewPacket.packetHash);
});

check("all_99_candidates_are_classified_once", () => {
  assert.equal(audit.counts.sourceCandidates, 99);
  assert.equal(audit.counts.classifiedCandidates, 99);
  assert.equal(audit.counts.unclassifiedCandidates, 0);
  assert.equal(audit.counts.duplicateCandidateAssignments, 0);
});

check("part_12_has_67_reviewed_semantic_boundaries", () => {
  assert.equal(ledger.partCanonicalClauseCount, 67);
  assert.equal(audit.counts.canonicalClauses, 67);
  assert.equal(ledger.globalCanonicalClauseCount, null);
});

check("part_12_dispositions_grant_no_execution", () => {
  assert.deepEqual(audit.counts.byDisposition, {
    executable: 0,
    display_only: 5,
    review_required: 62,
    quarantined: 0,
  });
});

check("quick_reference_sequences_preserve_atomic_step_boundaries", () => {
  const byId = new Map(ledger.canonicalClauses.map((clause) => [clause.clauseId, clause]));
  assert.deepEqual(byId.get("core:12.3:disengage-summary")?.candidateOrdinals, [3, 4]);
  assert.deepEqual(byId.get("core:12.4:ranged-damage-casualties-step")?.candidateOrdinals,
    [22, 23, 24]);
  assert.deepEqual(byId.get("core:12.4:charge-success-step")?.candidateOrdinals,
    [29, 30, 31]);
  assert.deepEqual(byId.get("core:12.6:initiative-step")?.candidateOrdinals, [14, 15, 16]);
  assert.deepEqual(byId.get("core:12.7:declare-ranks-step")?.candidateOrdinals,
    [12, 13, 14]);
});

check("normative_quick_reference_tables_remain_review_required", () => {
  const byId = new Map(ledger.canonicalClauses.map((clause) => [clause.clauseId, clause]));
  assert.equal(byId.get("core:12.2:round-phase-summary")?.disposition, "review_required");
  assert.equal(byId.get("core:12.7:template-weapon-summary-table")?.disposition,
    "review_required");
  assert.deepEqual(byId.get("core:12.7:template-weapon-summary-table")?.candidateOrdinals,
    [19, 20, 21]);
});

check("historical_product_tables_cannot_override_command_center", () => {
  const byId = new Map(ledger.canonicalClauses.map((clause) => [clause.clauseId, clause]));
  for (const clauseId of [
    "core:12.8:historical-composition-table",
    "core:12.11:historical-card-cost-table",
    "core:12.12:historical-starter-inventory",
  ]) {
    const clause = byId.get(clauseId);
    assert.equal(clause?.disposition, "display_only");
    assert.equal(clause?.eligibleForRuleAtomMapping, false);
    assert.equal(clause?.reasonCode, "historical_product_data_command_center_current_only");
  }
});

check("all_twelve_quick_reference_anchors_are_clause_bearing", () => {
  assert.deepEqual(ledger.structuralContainerAnchorIds, []);
  assert.equal(audit.counts.sourceAnchors, 12);
  assert.equal(audit.counts.clauseBearingAnchors, 12);
  assert.equal(audit.counts.structuralContainers, 0);
});

check("tracked_ledger_contains_no_rule_or_product_prose", () => {
  const serialized = JSON.stringify(ledger);
  assert.equal(serialized.includes('"text"'), false);
  assert.equal(serialized.includes('"excerpt"'), false);
  assert.equal(serialized.includes("START OF THE ROUND EFFECTS"), false);
  assert.equal(serialized.includes("TERRAN STARTER"), false);
});

check("coverage_and_promotion_gates_fail_closed", () => {
  const gap = structuredClone(OFFICIAL_PART_12_SEMANTIC_REVIEW_BINDING_V1);
  gap.clauses.splice(0, 1);
  assert.throws(() => createPartSemanticClauseLedger({
    denominator,
    reviewedBinding: gap,
  }), /part_semantic_candidate_coverage_invalid/);
  const drift = structuredClone(OFFICIAL_PART_12_SEMANTIC_REVIEW_BINDING_V1);
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
  schema: "starcraft_tmg_part_12_semantic_clause_ledger_verification_v1",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length - failures.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  failures,
  ledger,
  audit,
  ctx2skill: {
    ctx2skillLoopUsed: true,
    targetGames: ["starcraft-tmg"],
    roleRoutes: ["rule_skill_builder", "referee"],
    skillsRead: [],
    skillsGenerated: [],
    judgeTestsRun: acceptance.length,
    crossTimeReplayResult: "pending_rule_atom_and_executor_mapping",
    promotions: [],
    blocks: [
      "faq_exact_candidate_clause_reconciliation_pending",
      "rule_atom_mapping_pending",
      "judge_and_replay_evidence_pending",
    ],
    remainingRuleGaps: 99,
  },
  rulesTruth: false,
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(OUTPUT_DIR, "part-12-semantic-clause-ledger-report.json"),
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
