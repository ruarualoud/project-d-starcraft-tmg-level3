#!/usr/bin/env node

// Compile a source-quoted local adjudication into immutable Room-admission
// evidence. Paid model review and all intermediate plan versions stay intact.
import path from "node:path";
import { readFile, rename, writeFile } from "node:fs/promises";

import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createRosterFinalPlanReviewAdjudicationV1,
  verifyRosterFinalPlanReviewAdjudicationV1 } from
  "../packages/roster-strategist/roster-final-plan-review-v1.mjs";
import { verifyAgentScheduledRosterPlanRevisionLineageV1 } from
  "../packages/roster-strategist/agent-scheduled-roster-plan-v1.mjs";

const root = path.resolve(import.meta.dirname, "..");
const sourceArg = process.argv.find((value) =>
  value.startsWith("--source-manifest="));
if (!sourceArg) throw new Error("REVIEWED_PLAN_SOURCE_MANIFEST_REQUIRED");
const sourceName = sourceArg.slice("--source-manifest=".length);
function contained(filename) {
  if (typeof filename !== "string" || !filename.trim()
    || path.isAbsolute(filename)) {
    throw new Error("REVIEWED_PLAN_PATH_OUTSIDE_WORKTREE");
  }
  const absolute = path.resolve(root, filename);
  const relative = path.relative(root, absolute);
  if (!relative || relative.startsWith(`..${path.sep}`)
    || relative === "..") {
    throw new Error("REVIEWED_PLAN_PATH_OUTSIDE_WORKTREE");
  }
  return absolute;
}
async function readJson(filename) {
  return JSON.parse(await readFile(contained(filename), "utf8"));
}
async function persistImmutable(filename, value) {
  const absolute = contained(filename);
  const serialized = `${JSON.stringify(value, null, 2)}\n`;
  let existing;
  try { existing = await readFile(absolute, "utf8"); }
  catch (error) { if (error?.code !== "ENOENT") throw error; }
  if (existing !== undefined) {
    if (existing !== serialized) {
      throw new Error("REVIEWED_PLAN_OUTPUT_ALREADY_DIFFERS");
    }
    return;
  }
  const temporary = `${absolute}.${process.pid}.tmp`;
  await writeFile(temporary, serialized, { mode: 0o600 });
  await rename(temporary, absolute);
}

const source = await readJson(sourceName);
if (source.schemaVersion
    !== "ticket27_slice272_admission_source_manifest_v1"
  || !Array.isArray(source.intermediatePlanArtifactPaths)
  || source.trainingTruth !== false) {
  throw new Error("REVIEWED_PLAN_SOURCE_MANIFEST_INVALID");
}
const plan = (await readJson(source.planArtifactPath)).plan;
const intermediatePlans = await Promise.all(
  source.intermediatePlanArtifactPaths.map(async (filename) =>
    (await readJson(filename)).plan));
const sourceReview = await readJson(source.sourceReviewArtifactPath);
const record = await readJson(source.decisionRecordPath);
if (record.schemaVersion !== "ticket27_slice272_v5_source_adjudication_v1"
  || record.planHash !== plan?.planHash
  || record.sourceReviewHash !== sourceReview.reviewHash
  || record.authority !== "local_source_bound_adjudication_not_rules_truth"
  || record.trainingTruth !== false
  || !Array.isArray(record.decisions)) {
  throw new Error("REVIEWED_PLAN_DECISION_RECORD_INVALID");
}
const highs = sourceReview.findings.map((finding, index) =>
  ({ finding, index })).filter(({ finding }) =>
    finding.severity === "high");
if (highs.length !== record.decisions.length) {
  throw new Error("REVIEWED_PLAN_HIGH_COVERAGE_INVALID");
}
const decisions = record.decisions.map((row) => {
  const matches = highs.filter(({ finding }) =>
    finding.claimPath === row.claimPath);
  if (matches.length !== 1) {
    throw new Error("REVIEWED_PLAN_HIGH_IDENTITY_AMBIGUOUS");
  }
  return { findingIndex: matches[0].index,
    findingHash: hashStarcraftTmgContract(matches[0].finding),
    effectiveSeverity: row.effectiveSeverity,
    publicReason: row.publicReason,
    counterEvidence: row.counterEvidence };
});
const finalReview = createRosterFinalPlanReviewAdjudicationV1({
  plan, review: sourceReview, decisions,
});
const resolution = verifyRosterFinalPlanReviewAdjudicationV1({
  plan, review: finalReview,
});
if (resolution.unresolvedHighCount > 0 || resolution.criticalCount > 0) {
  throw new Error("REVIEWED_PLAN_BLOCKING_FINDINGS_REMAIN");
}
const lineage = verifyAgentScheduledRosterPlanRevisionLineageV1({
  initialPlanHash: intermediatePlans[0]?.revisions?.[0]?.previousPlanHash,
  initialPlanVersion: plan.planVersion - plan.revisions.length,
  intermediatePlans, finalPlan: plan,
});
await persistImmutable(source.adjudicatedReviewOutputPath, finalReview);
const manifest = {
  schemaVersion: "ticket27_slice272_reviewed_plan_room_admission_v1",
  iterativeSessionId: source.iterativeSessionId,
  teachSessionId: source.teachSessionId,
  mapSeedId: source.mapSeedId,
  planArtifactPath: source.planArtifactPath,
  intermediatePlanArtifactPaths: source.intermediatePlanArtifactPaths,
  finalReviewArtifactPath: source.adjudicatedReviewOutputPath,
  planHash: plan.planHash,
  sourceReviewHash: sourceReview.reviewHash,
  finalReviewHash: finalReview.reviewHash,
  initialPlanHash: lineage.initialPlanHash,
  revisionCount: lineage.revisionCount,
  adjudicationRecordHash: hashStarcraftTmgContract(record),
  sourceManifestHash: hashStarcraftTmgContract(source),
  trainingTruth: false,
};
await persistImmutable(source.admissionManifestOutputPath, manifest);
process.stdout.write(`${JSON.stringify({
  event: "reviewed_plan_admission_materialized",
  manifestPath: source.admissionManifestOutputPath,
  planHash: plan.planHash,
  finalReviewHash: finalReview.reviewHash,
  originalHighCount: resolution.originalHighCount,
  reclassifiedMediumCount: resolution.reclassifiedMediumCount,
  unresolvedHighCount: resolution.unresolvedHighCount,
  revisionCount: lineage.revisionCount,
  providerCalls: 0, roomMutations: 0, trainingTruth: false,
})}\n`);
