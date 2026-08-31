import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  auditOfficialRemainingRuleAtomRouteV2,
  createOfficialRemainingRuleAtomRouteV2,
  OFFICIAL_REMAINING_RULE_ATOM_ROUTE_V2_BASE_CATALOGUE_HASH,
  OFFICIAL_REMAINING_RULE_ATOM_ROUTE_V2_HASH,
  OFFICIAL_REMAINING_RULE_ATOM_ROUTE_V2_RECOVERED_DEBT_ATOM_IDS,
} from "../packages/rule-atoms/official-remaining-rule-atom-route-v2.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const OUTPUT_DIR = path.join(ROOT, "build", "ticket-11-rule-atoms-v1");
const CURRENT_REPORT = path.join(
  OUTPUT_DIR,
  "official-elevation-effective-size-rules-rule-slice-v1-report.json",
);
const OUTPUT = path.join(OUTPUT_DIR, "official-remaining-rule-atom-route-v2-report.json");

const current = JSON.parse(await readFile(CURRENT_REPORT, "utf8"));
const catalogue = current.slice.catalogue;
const route = createOfficialRemainingRuleAtomRouteV2(catalogue);
const acceptance = [];
const failures = [];

async function check(id, fn) {
  try {
    await fn();
    acceptance.push({ id, passed: true });
  } catch (error) {
    failures.push({ id, error: String(error?.stack || error) });
    acceptance.push({ id, passed: false });
  }
}

await check("route_binds_exact_slice_85_catalogue_and_source_lock", () => {
  assert.equal(route.baseCatalogueHash,
    OFFICIAL_REMAINING_RULE_ATOM_ROUTE_V2_BASE_CATALOGUE_HASH);
  assert.equal(route.baseCatalogueHash, current.catalogueHash);
  assert.equal(route.baseSliceHash, current.slice.sliceHash);
  assert.equal(route.sourceLockHash, current.sourceLockAudit.lockHash);
  assert.equal(route.sourceRefreshPerformed, false);
  assert.equal(route.repositoryFallbackUsed, false);
});

await check("all_334_review_atoms_are_assigned_once", () => {
  assert.equal(route.partition.assignedReviewRequiredAtoms, 334);
  assert.equal(route.partition.totalReviewRequiredAtoms, 334);
  assert.deepEqual(route.partition.duplicateAtomIds, []);
  assert.deepEqual(route.partition.missingAtomIds, []);
  assert.deepEqual(route.partition.unknownAtomIds, []);
  const ids = route.assignments.flatMap((assignment) => assignment.atomIds);
  assert.equal(ids.length, 334);
  assert.equal(new Set(ids).size, 334);
});

await check("all_26_remaining_slices_are_contiguous_and_exact", () => {
  assert.deepEqual(route.assignments.map((assignment) => assignment.slice),
    Array.from({ length: 26 }, (_, index) => index + 86));
  assert.deepEqual(route.assignments.map((assignment) => assignment.atomCount),
    [13, 21, 15, 18, 13, 6, 7, 12, 7, 5, 17, 5, 12, 18, 13, 9,
      24, 11, 16, 13, 21, 12, 17, 11, 14, 4]);
  assert.equal(route.partition.finalExecutableAtoms, 912);
  assert.equal(route.partition.finalReviewRequiredAtoms, 0);
});

await check("five_previously_unassigned_atoms_are_named_and_routed", () => {
  assert.deepEqual(route.recoveredDebtAtomIds,
    OFFICIAL_REMAINING_RULE_ATOM_ROUTE_V2_RECOVERED_DEBT_ATOM_IDS);
  assert.equal(route.recoveredDebtAtomIds.length, 5);
  const byId = new Map(route.assignments.flatMap((assignment) => (
    assignment.atomIds.map((atomId) => [atomId, assignment.slice])
  )));
  assert.deepEqual(route.recoveredDebtAtomIds.map((atomId) => byId.get(atomId)),
    [86, 87, 86, 86, 86]);
});

await check("slice_86_has_exact_thirteen_atom_denominator", () => {
  const slice86 = route.assignments.find((assignment) => assignment.slice === 86);
  assert.equal(slice86.atomCount, 13);
  assert.equal(slice86.executableAfter, 591);
  assert.equal(slice86.reviewRequiredAfter, 321);
  assert.match(slice86.cluster, /special terrain/u);
});

await check("route_hash_is_frozen_and_auditable", () => {
  assert.match(route.routeHash, /^[a-f0-9]{64}$/u);
  assert.equal(route.routeHash, OFFICIAL_REMAINING_RULE_ATOM_ROUTE_V2_HASH);
  const audit = auditOfficialRemainingRuleAtomRouteV2(route, catalogue);
  assert.equal(audit.valid, true);
  assert.equal(audit.assignedAtomCount, 334);
});

await check("catalogue_identity_drift_fails_closed", () => {
  const changed = structuredClone(catalogue);
  changed.catalogueHash = "0".repeat(64);
  assert.throws(() => createOfficialRemainingRuleAtomRouteV2(changed),
    /catalogue_hash_mismatch|REMAINING_ROUTE_BASE_CATALOGUE_INVALID/u);
});

await check("route_content_tamper_fails_closed", () => {
  const changed = structuredClone(route);
  changed.assignments[0].atomIds[0] = changed.assignments[1].atomIds[0];
  assert.throws(() => auditOfficialRemainingRuleAtomRouteV2(changed, catalogue),
    /REMAINING_ROUTE_HASH_INVALID/u);
});

await check("route_does_not_grant_rules_or_training_authority", () => {
  assert.equal(route.rulesTruth, false);
  assert.equal(route.trainingTruth, false);
  assert.deepEqual(route.ctx2skill.skillsGenerated, []);
  assert.deepEqual(route.ctx2skill.promotions, []);
  assert.deepEqual(route.harness.trainingTraceCandidates, []);
});

await check("historical_slice_85_runtime_and_catalogue_remain_frozen", () => {
  assert.equal(current.slice.sliceHash,
    "dc981da46cbae384449dbc9bf3213775a5fbd18a2b016ec4f9fa6a05994eae81");
  assert.equal(current.catalogueHash,
    "216398a685146230140a56481dd031dff9f7c9f3f3a650b94165701a9e966e1f");
  assert.equal(current.runtimeHash,
    "52229d04183d64ce4fe34e79cf51e4275cc6c905ab4603b057c5c29b08c348e3");
  assert.equal(current.trainingTruth, false);
});

const report = {
  schema: "starcraft_tmg_official_remaining_rule_atom_route_v2_verification_v1",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.filter((entry) => entry.passed).length,
  acceptanceTotal: acceptance.length,
  acceptance,
  failures,
  route,
  routeAudit: failures.length === 0
    ? auditOfficialRemainingRuleAtomRouteV2(route, catalogue)
    : null,
  ctx2skill: route.ctx2skill,
  harness: route.harness,
  rulesTruth: false,
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(OUTPUT, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  schema: report.schema,
  acceptancePassed: report.acceptancePassed,
  acceptanceTotal: report.acceptanceTotal,
  failures,
  routeHash: route.routeHash,
  assignmentCount: route.assignments.length,
  assignedAtomCount: route.partition.assignedReviewRequiredAtoms,
  recoveredDebtAtomCount: route.recoveredDebtAtomIds.length,
  slice86AtomCount: route.assignments[0].atomCount,
  finalExecutableAtoms: route.partition.finalExecutableAtoms,
  finalReviewRequiredAtoms: route.partition.finalReviewRequiredAtoms,
  trainingTruth: false,
}, null, 2));
if (failures.length > 0) process.exitCode = 1;
