#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createOfficialCanonicalRuleAtomDenominatorV1,
  verifyOfficialCanonicalRuleAtomDenominatorV1,
} from "../packages/rule-atoms/official-canonical-rule-atom-denominator-v1.mjs";
import { resolveExecutableRuleAtoms } from "../packages/rule-atoms/rule-atom-catalogue-v1.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const OUTPUT_DIR = path.join(ROOT, "build", "ticket-11-rule-atoms-v1");
const LEDGER_REPORTS = Object.freeze([
  "part-2-semantic-clause-ledger-report.json",
  "part-3-semantic-clause-ledger-report.json",
  "part-4-semantic-clause-ledger-report.json",
  "part-5-semantic-clause-ledger-report.json",
  "part-6-semantic-clause-ledger-report.json",
  "part-7-semantic-clause-ledger-report.json",
  "part-8a-semantic-clause-batch-ledger-report.json",
  "part-8b-semantic-clause-batch-ledger-report.json",
  "part-8c-semantic-clause-batch-ledger-report.json",
  "part-8d-semantic-clause-batch-ledger-report.json",
  "part-8e-semantic-clause-batch-ledger-report.json",
  "part-8f-semantic-clause-batch-ledger-report.json",
  "part-9a-semantic-clause-batch-ledger-report.json",
  "part-9b-semantic-clause-batch-ledger-report.json",
  "part-9c-semantic-clause-batch-ledger-report.json",
  "part-10-semantic-clause-ledger-report.json",
  "part-11a-semantic-clause-batch-ledger-report.json",
  "part-11b-semantic-clause-batch-ledger-report.json",
  "part-11c-semantic-clause-batch-ledger-report.json",
  "part-11d-semantic-clause-batch-ledger-report.json",
  "part-11e-semantic-clause-batch-ledger-report.json",
  "part-11f-semantic-clause-batch-ledger-report.json",
  "part-12-semantic-clause-ledger-report.json",
]);

async function report(name) {
  return JSON.parse(await readFile(path.join(OUTPUT_DIR, name), "utf8"));
}

async function dependencies() {
  return {
    sourceManifest: (await report("official-rule-source-manifest-report.json")).manifest,
    faqReceipt: (await report("official-gameplay-faq-report.json")).receipt,
    faqSupplemental: (await report("official-faq-supplemental-clause-v3-report.json")).reconciliation,
    coreCoverageIndex: (await report("core-semantic-clause-coverage-index-report.json")).index,
    finalization: (await report("global-canonical-clause-finalization-v1-report.json")).finalization,
    partLedgers: await Promise.all(LEDGER_REPORTS.map(async (name) => (await report(name)).ledger)),
  };
}

function clone(value) {
  return structuredClone(value);
}

const input = await dependencies();
const denominator = createOfficialCanonicalRuleAtomDenominatorV1(input);
const audit = verifyOfficialCanonicalRuleAtomDenominatorV1({ ...input, denominator });
const acceptance = [];

function check(id, fn) {
  try {
    fn();
    acceptance.push({ id, passed: true });
  } catch (error) {
    acceptance.push({ id, passed: false, error: String(error?.stack || error) });
  }
}

check("frozen_official_source_and_canonical_dependencies_are_bound", () => {
  assert.equal(denominator.sourceManifestHash, input.sourceManifest.manifestHash);
  assert.equal(denominator.canonicalFinalizationHash, input.finalization.finalizationHash);
  assert.equal(denominator.canonicalCatalogueHash, input.finalization.canonicalCatalogueHash);
  assert.equal(denominator.faqReceiptHash, input.faqReceipt.receiptHash);
  assert.match(denominator.denominatorHash, /^[a-f0-9]{64}$/u);
});

check("all_official_local_clauses_enter_the_rule_atom_catalogue_once", () => {
  assert.equal(audit.counts.sourceSnapshots, 2);
  assert.equal(audit.counts.sourceClauses, 1093);
  assert.equal(audit.counts.corePdfSourceClauses, 1090);
  assert.equal(audit.counts.faqSourceClauses, 3);
  assert.equal(audit.counts.unclassifiedSourceClauses, 0);
  assert.equal(audit.counts.duplicateSourceClauseMappings, 0);
});

check("one_non_executable_rule_atom_exists_for_every_canonical_clause", () => {
  assert.equal(audit.counts.canonicalClauses, 1026);
  assert.equal(audit.counts.ruleAtoms, 1026);
  assert.equal(audit.counts.duplicateCanonicalMappings, 0);
  assert.equal(audit.counts.missingCanonicalMappings, 0);
  assert.deepEqual(audit.counts.byDisposition, {
    executable: 0,
    display_only: 114,
    review_required: 912,
    quarantined: 0,
  });
});

check("pdf_and_faq_source_locators_remain_typed_and_hash_bound", () => {
  const core = denominator.catalogue.sourceClauses.find((clause) => clause.clauseId.startsWith("core:"));
  const faq = denominator.catalogue.sourceClauses.find((clause) => clause.clauseId.startsWith("faq:"));
  assert.equal(core.locator.kind, "pdf_page");
  assert(Number.isInteger(core.locator.page));
  assert.match(core.textHash, /^[a-f0-9]{64}$/u);
  assert.equal(faq.locator.kind, "faq_entry");
  assert.match(faq.locator.entryId, /^faq_9_/u);
  assert(Number.isInteger(faq.locator.entryOrdinal));
  assert.match(faq.textHash, /^[a-f0-9]{64}$/u);
});

check("non_executable_denominator_exposes_no_rules_authority", () => {
  for (const atom of denominator.catalogue.atoms) {
    assert.equal(atom.disposition === "executable", false);
    assert.equal(atom.owner, undefined);
    assert.equal(atom.legalSpace, undefined);
    assert.equal(atom.effect, undefined);
  }
  assert.equal(denominator.canAffectRules, false);
  assert.equal(denominator.rulesEligible, false);
  assert.equal(denominator.replayEligible, false);
  assert.equal(denominator.trainingTruth, false);
});

check("empty_executable_ruleset_cannot_masquerade_as_a_runtime", () => {
  const sourceSnapshotHashes = Object.fromEntries(denominator.catalogue.sourceSnapshots.map((row) => (
    [row.sourceSnapshotId, row.contentHash]
  )));
  assert.throws(() => resolveExecutableRuleAtoms(denominator.catalogue, {
    rulesVersion: denominator.catalogue.rulesVersion,
    sourceSnapshotHashes,
    executorVersions: {},
  }), /no_executable_rule_atoms/u);
});

check("source_canonical_and_ledger_drift_fail_closed", () => {
  const sourceTamper = clone(input);
  sourceTamper.sourceManifest.pdfSources[0].contentHash = "f".repeat(64);
  assert.throws(
    () => createOfficialCanonicalRuleAtomDenominatorV1(sourceTamper),
    /official_rule_atom_source_manifest_hash_mismatch/u,
  );
  const canonicalTamper = clone(input);
  canonicalTamper.finalization.canonicalClauses[0].disposition = "display_only";
  assert.throws(
    () => createOfficialCanonicalRuleAtomDenominatorV1(canonicalTamper),
    /official_rule_atom_canonical_finalization_hash_mismatch/u,
  );
  const ledgerTamper = clone(input);
  ledgerTamper.partLedgers[0].canonicalClauses[0].title = "tampered";
  assert.throws(
    () => createOfficialCanonicalRuleAtomDenominatorV1(ledgerTamper),
    /official_rule_atom_part_ledger_hash_mismatch/u,
  );
});

check("catalogue_identity_is_input_order_independent", () => {
  const reordered = clone(input);
  reordered.partLedgers.reverse();
  assert.equal(
    createOfficialCanonicalRuleAtomDenominatorV1(reordered).denominatorHash,
    denominator.denominatorHash,
  );
});

check("ctx2skill_and_harness_receipts_block_promotion_until_execution_evidence", () => {
  assert.deepEqual(denominator.ctx2skill.promotions, []);
  assert.deepEqual(denominator.ctx2skill.skillsGenerated, []);
  assert(denominator.ctx2skill.blocks.includes("executor_legal_space_judge_and_replay_evidence_pending"));
  assert.equal(denominator.harness.harnessLoopUsed, true);
  assert.deepEqual(denominator.harness.targetGames, ["starcraft-tmg"]);
  assert.deepEqual(denominator.harness.trainingTraceCandidates, []);
  assert.equal(denominator.harness.agentDecisionEvidence, "not_run_no_executable_atoms");
});

const failures = acceptance.filter((item) => !item.passed);
const output = {
  schema: "starcraft_tmg_official_canonical_rule_atom_denominator_verification_v1",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length - failures.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  failures,
  denominator,
  audit,
  rulesTruth: false,
  trainingTruth: false,
};

await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(OUTPUT_DIR, "official-canonical-rule-atom-denominator-v1-report.json"),
  `${JSON.stringify(output, null, 2)}\n`,
  "utf8",
);
console.log(JSON.stringify({
  schema: output.schema,
  acceptancePassed: output.acceptancePassed,
  acceptanceTotal: output.acceptanceTotal,
  failures: output.failures,
  denominatorHash: denominator.denominatorHash,
  catalogueHash: denominator.catalogueHash,
  counts: audit.counts,
  rulesTruth: false,
  trainingTruth: false,
}, null, 2));

if (failures.length > 0) process.exitCode = 1;
