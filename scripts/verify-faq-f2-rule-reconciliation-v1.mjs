#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { OFFICIAL_FAQ_V1_RULE_RECONCILIATION_BINDING_V1 } from
  "../content/official-faq-v1-rule-reconciliation-binding-v1.mjs";
import {
  createOfficialFaqV1RuleReconciliationV1,
  OFFICIAL_FAQ_V1_BASE_CATALOGUE_HASH,
  OFFICIAL_FAQ_V1_BASE_GRAPH_HASH,
  OFFICIAL_FAQ_V1_BASE_RUNTIME_HASH,
  verifyOfficialFaqV1RuleReconciliationV1,
} from "../packages/rule-atoms/official-faq-v1-rule-reconciliation-v1.mjs";
import { createOfficialFaqV1SourceLockV1 } from
  "../packages/source-data/official-faq-v1-source-lock-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_DIR = path.join(ROOT, "build/source-intake/official-rules/faq-v1-2026-09-03");
const OUTPUT_DIR = path.join(ROOT, "build/faq-v1-rules-refresh");
const BASE_REPORT_PATH = path.join(ROOT,
  "build/ticket-11-rule-atoms-v1/official-dispute-resolution-rules-rule-slice-v1-report.json");
const [pdfBytes, rawText, downloadsHtml, baseReportBytes] = await Promise.all([
  readFile(path.join(SOURCE_DIR, "StarCraft-TMG-FAQ_EN.pdf")),
  readFile(path.join(SOURCE_DIR, "StarCraft-TMG-FAQ_EN.raw.txt")),
  readFile(path.join(SOURCE_DIR, "downloads.html")),
  readFile(BASE_REPORT_PATH),
]);
const sourceLock = createOfficialFaqV1SourceLockV1({ pdfBytes, rawText, downloadsHtml });
const baseReport = JSON.parse(baseReportBytes);
const input = {
  sourceLock,
  currentCatalogue: baseReport.slice.catalogue,
  currentGraph: baseReport.graph,
  currentRuntimeHash: baseReport.runtimeHash,
};
const reconciliation = createOfficialFaqV1RuleReconciliationV1(input);
const acceptance = [];
function accept(description, check) {
  check();
  acceptance.push(`${String(acceptance.length + 1).padStart(2, "0")}_${description}`);
}

accept("all_68_entries_are_classified_once_in_source_order", () => {
  assert.equal(reconciliation.entryCount, 68);
  assert.equal(reconciliation.unclassifiedEntryCount, 0);
  assert.deepEqual(reconciliation.entries.map((entry) => entry.entryId),
    Array.from({ length: 68 }, (_, index) => (
      `faq-v1:${String(index + 1).padStart(2, "0")}`
    )));
});
accept("source_question_and_answer_hashes_are_joined_without_source_prose", () => {
  for (const entry of reconciliation.entries) {
    const source = sourceLock.semanticIndex.entryIndex.find((row) => (
      row.entryId === entry.entryId
    ));
    assert.equal(entry.questionHash, source.questionHash);
    assert.equal(entry.answerHash, source.answerHash);
  }
  assert.equal(JSON.stringify(reconciliation.entries).includes("Q:"), false);
  assert.equal(reconciliation.review.sourceProseEmbedded, false);
});
accept("disposition_denominator_is_exact", () => {
  assert.deepEqual(reconciliation.byDisposition, {
    confirm: 23,
    refine: 26,
    supersede: 0,
    conflict: 0,
    new: 19,
  });
});
accept("implementation_slices_partition_the_denominator", () => {
  assert.deepEqual(reconciliation.byImplementationSlice, {
    F3: 23,
    F4: 27,
    F5: 18,
  });
  assert.equal(Object.values(reconciliation.byImplementationSlice)
    .reduce((sum, count) => sum + count, 0), 68);
});
accept("twelve_token_marker_entries_are_explicit_before_token_ui_work", () => {
  assert.deepEqual(reconciliation.tokenMarkerImpactEntryIds, [
    "faq-v1:16", "faq-v1:19", "faq-v1:21", "faq-v1:22",
    "faq-v1:23", "faq-v1:24", "faq-v1:27", "faq-v1:41",
    "faq-v1:47", "faq-v1:52", "faq-v1:54", "faq-v1:57",
  ]);
  assert.equal(reconciliation.tokenMarkerImpactEntryCount, 12);
});
accept("every_existing_atom_reference_is_executable_and_present_in_the_graph", () => {
  const atomById = new Map(baseReport.slice.catalogue.atoms.map((atom) => [
    atom.atomId, atom,
  ]));
  const graphNodeIds = new Set(baseReport.graph.nodes.map((node) => node.nodeId));
  for (const entry of reconciliation.entries) {
    for (const atomId of entry.atomIds) {
      assert.equal(atomById.get(atomId)?.disposition, "executable");
      assert(graphNodeIds.has(`rule_atom:${atomId}`));
    }
  }
});
accept("pre_faq_catalogue_runtime_and_graph_are_frozen", () => {
  assert.deepEqual(reconciliation.baseRules, {
    catalogueHash: OFFICIAL_FAQ_V1_BASE_CATALOGUE_HASH,
    runtimeHash: OFFICIAL_FAQ_V1_BASE_RUNTIME_HASH,
    graphHash: OFFICIAL_FAQ_V1_BASE_GRAPH_HASH,
    atomCount: 1026,
    executableAtomCount: 912,
    displayOnlyAtomCount: 114,
    executorCount: 80,
    immutable: true,
  });
  assert.equal(baseReport.slice.catalogue.catalogueHash, OFFICIAL_FAQ_V1_BASE_CATALOGUE_HASH);
});
accept("no_entry_silently_supersedes_the_pre_faq_runtime", () => {
  assert.deepEqual(reconciliation.supersededBaseBehaviorEntryIds, []);
  assert.deepEqual(reconciliation.conflictEntryIds, []);
  const entry = reconciliation.entries[55];
  assert.equal(entry.disposition, "refine");
  assert(entry.atomIds.includes(
    "rule-atom:singleton:core-11-indirect-fire-off-los-evade:8de63a970f7f"));
});
accept("confirmations_require_reverification_and_deltas_require_rules_work", () => {
  assert(reconciliation.entries.filter((entry) => entry.disposition === "confirm")
    .every((entry) => entry.implementationStatus === "reverification_required"));
  assert(reconciliation.entries.filter((entry) => entry.disposition !== "confirm")
    .every((entry) => entry.implementationStatus === "rules_change_required"));
});
accept("agent_prepared_ledger_does_not_claim_human_review", () => {
  assert.equal(reconciliation.review.preparedBy, "codex_rule_reconciliation");
  assert.equal(reconciliation.review.humanReviewed, false);
  assert.equal(reconciliation.review.exactEntryCoverage, true);
});
accept("classification_grants_no_rules_room_skill_or_training_authority", () => {
  assert.equal(reconciliation.rulesEligible, false);
  assert.equal(reconciliation.productionRoomEligible, false);
  assert.equal(reconciliation.ctx2skillPromotionEligible, false);
  assert.equal(reconciliation.trainingTruth, false);
  assert.equal(reconciliation.implementationStatus, "classified_pending_f3_f4_f5");
});
accept("content_addressed_reconciliation_recomputes_exactly", () => {
  assert.equal(verifyOfficialFaqV1RuleReconciliationV1(reconciliation, input), true);
  assert.match(reconciliation.reconciliationHash, /^[a-f0-9]{64}$/u);
});
accept("missing_duplicate_or_unknown_rows_fail_closed", () => {
  assert.throws(() => createOfficialFaqV1RuleReconciliationV1({
    ...input,
    binding: OFFICIAL_FAQ_V1_RULE_RECONCILIATION_BINDING_V1.slice(0, -1),
  }), /OFFICIAL_FAQ_V1_RECONCILIATION_DENOMINATOR_INVALID/u);
  const duplicate = structuredClone(OFFICIAL_FAQ_V1_RULE_RECONCILIATION_BINDING_V1);
  duplicate[1].entryId = duplicate[0].entryId;
  assert.throws(() => createOfficialFaqV1RuleReconciliationV1({
    ...input, binding: duplicate,
  }), /OFFICIAL_FAQ_V1_RECONCILIATION_ENTRY_ID_INVALID/u);
  const unknown = structuredClone(OFFICIAL_FAQ_V1_RULE_RECONCILIATION_BINDING_V1);
  unknown[0].atomIds = ["rule-atom:not-in-catalogue"];
  assert.throws(() => createOfficialFaqV1RuleReconciliationV1({
    ...input, binding: unknown,
  }), /OFFICIAL_FAQ_V1_RECONCILIATION_ATOM_REFERENCE_INVALID/u);
});
accept("tampered_source_catalogue_or_graph_identity_fails_closed", () => {
  const badLock = structuredClone(sourceLock);
  badLock.semanticIndex.entryCount = 67;
  assert.throws(() => createOfficialFaqV1RuleReconciliationV1({
    ...input, sourceLock: badLock,
  }), /OFFICIAL_FAQ_V1_RECONCILIATION_SOURCE_LOCK_INVALID/u);
  assert.throws(() => createOfficialFaqV1RuleReconciliationV1({
    ...input, currentRuntimeHash: "0".repeat(64),
  }), /OFFICIAL_FAQ_V1_RECONCILIATION_BASE_RULES_INVALID/u);
  const badGraph = structuredClone(baseReport.graph);
  badGraph.graphHash = "0".repeat(64);
  assert.throws(() => createOfficialFaqV1RuleReconciliationV1({
    ...input, currentGraph: badGraph,
  }), /rule_relationship_graph_hash_mismatch|OFFICIAL_FAQ_V1_RECONCILIATION_BASE_RULES_INVALID/u);
});

const report = {
  schema: "starcraft_tmg_faq_f2_rule_reconciliation_verification_v1",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  reconciliation,
  ctx2skillLoopUsed: true,
  targetGames: ["starcraft-tmg"],
  roleRoutes: ["rule_skill_builder"],
  skillsRead: ["research", "ctx2skill-rule-skill-loop"],
  skillsGenerated: [],
  judgeTestsRun: acceptance.length,
  crossTimeReplayResult: "not_run_rules_implementation_pending_f3_f5",
  promotions: [],
  blocks: reconciliation.blocks,
  remainingRuleGaps: 45,
  harnessLoopUsed: true,
  promptPackRoutes: ["rule_skill_builder_prompt"],
  harnessToolsCalled: ["rule_atom_catalogue_lookup", "rule_relationship_graph_lookup"],
  uiTraceEvidence: "not_run_reconciliation_only",
  agentDecisionEvidence: "all_68_faq_entries_classified_against_executable_atoms_and_graph",
  memoryTraceEvidence: { refs: [], promotionAttempted: false },
  trainingTraceCandidates: [],
  rollbackOrDemotionRules: [
    "source_catalogue_runtime_or_graph_identity_drift_invalidates_f2",
    "f3_f5_failure_keeps_pre_faq_runtime_current",
  ],
  userVisibleChecks: [
    "faq_disposition_and_implementation_slice_are_inspectable_per_entry",
    "token_marker_impacts_are_explicit_before_battlefield_write_ui_changes",
  ],
  sourceRefreshPerformed: false,
  repositoryFallbackUsed: false,
  rulesTruth: false,
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(path.join(OUTPUT_DIR, "faq-f2-rule-reconciliation-report.json"),
  `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  schema: report.schema,
  acceptancePassed: report.acceptancePassed,
  acceptanceTotal: report.acceptanceTotal,
  reconciliationHash: reconciliation.reconciliationHash,
  entries: reconciliation.entryCount,
  byDisposition: reconciliation.byDisposition,
  byImplementationSlice: reconciliation.byImplementationSlice,
  tokenMarkerImpactEntries: reconciliation.tokenMarkerImpactEntryCount,
  rulesTruth: false,
  trainingTruth: false,
}, null, 2));
